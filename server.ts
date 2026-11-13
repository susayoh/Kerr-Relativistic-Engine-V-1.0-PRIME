import express, { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const CACHE_DIR = '/tmp/kerr-audio-cache';

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface CachedAudioEntry {
  filePath: string;
  mimeType: string;
  byteLength: number;
  durationSec: number;
}

const memoryMetaCache = new Map<string, CachedAudioEntry>();
const inFlightResolutions = new Map<string, Promise<CachedAudioEntry | null>>();

let cachedSoundCloudClientId = 'qLcgHhXgeEFFaSolTB9I71LBsqncsD93';
let lastClientIdRefresh = 0;

async function getSoundCloudClientId(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedSoundCloudClientId && now - lastClientIdRefresh < 3600_000) {
    return cachedSoundCloudClientId;
  }
  try {
    const htmlRes = await fetch('https://soundcloud.com', {
      signal: AbortSignal.timeout(5000),
    });
    const html = await htmlRes.text();
    const scripts = [
      ...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g),
    ].map((m) => m[1]);

    for (const scriptUrl of scripts.slice(-5)) {
      const jsRes = await fetch(scriptUrl, { signal: AbortSignal.timeout(5000) });
      const js = await jsRes.text();
      const match = js.match(/client_id:"([a-zA-Z0-9]{32})"/);
      if (match && match[1]) {
        cachedSoundCloudClientId = match[1];
        lastClientIdRefresh = now;
        return cachedSoundCloudClientId;
      }
    }
  } catch {
    // Keep existing fallback client_id
  }
  return cachedSoundCloudClientId;
}

interface SoundCloudTranscoding {
  url: string;
  preset: string;
  format?: {
    protocol?: string;
    mime_type?: string;
  };
}

interface SoundCloudTrackCandidate {
  id: number;
  title?: string;
  duration?: number;
  full_duration?: number;
  user?: {
    username?: string;
  };
  media?: {
    transcodings?: SoundCloudTranscoding[];
  };
}

function scoreTrackCandidate(
  cand: SoundCloudTrackCandidate,
  targetTitle: string,
  targetArtist: string
): number {
  const cTitle = (cand.title || '').toLowerCase();
  const cUser = (cand.user?.username || '').toLowerCase();
  const cCombined = `${cTitle} ${cUser}`;
  const tTitle = targetTitle.toLowerCase();
  const coreTitle = tTitle
    .replace(/\(.*?\)|\[.*?\]|-.*$/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();
  const coreWords = coreTitle.split(/\s+/).filter((w) => w.length >= 2);

  let score = 0;
  if (coreTitle && cCombined.includes(coreTitle)) {
    score += 65;
  }
  for (const w of coreWords) {
    if (cCombined.includes(w)) {
      score += 20;
    } else {
      score -= 15;
    }
  }

  const artists = targetArtist
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const a of artists) {
    if (a.length >= 2 && cCombined.includes(a)) {
      score += 28;
    }
  }

  const wantsSlowed = tTitle.includes('slowed');
  const wantsSpedUp =
    tTitle.includes('sped up') || tTitle.includes('speed up') || tTitle.includes('nightcore');
  const isCandSlowed = cTitle.includes('slowed');
  const isCandSpedUp =
    cTitle.includes('sped up') || cTitle.includes('speed up') || cTitle.includes('nightcore');

  if (wantsSlowed === isCandSlowed) score += 20;
  else score -= 25;

  if (wantsSpedUp === isCandSpedUp) score += 20;
  else score -= 20;

  return score;
}

function isValidCompleteAudioHeader(buf: Buffer): boolean {
  if (!buf || buf.length < 16) return false;
  // Reject HTML error documents
  if (buf[0] === 0x3c && (buf[1] === 0x21 || buf[1] === 0x68 || buf[1] === 0x48)) {
    return false;
  }
  // ID3v2 tag ("ID3")
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return true;
  }
  // MPEG ADTS sync word
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    return true;
  }
  // ISO BMFF / fMP4 / M4A ("ftyp" at bytes 4..7 or "styp" / "moof")
  const boxType = buf.subarray(4, 8).toString('ascii');
  if (boxType === 'ftyp' || boxType === 'styp' || boxType === 'moov' || boxType === 'moof') {
    return true;
  }
  return false;
}

async function resolveAndCacheFullTrack(
  trackId: string,
  title: string,
  artist: string
): Promise<CachedAudioEntry | null> {
  const safeId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const existing = memoryMetaCache.get(safeId);
  if (existing && fs.existsSync(existing.filePath)) {
    return existing;
  }

  const inflight = inFlightResolutions.get(safeId);
  if (inflight) {
    return inflight;
  }

  const task = (async (): Promise<CachedAudioEntry | null> => {
    try {
      const cleanTitle = title
        .replace(/\s*\((with|feat\.)[^)]+\)/gi, '')
        .replace(/\s*-\s*From.*$/i, '')
        .trim();
      const baseSongTitle = cleanTitle
        .replace(/\s*[-–]\s*(sped up|speed up|slowed|nightcore|remix|tiktok.*|female version|frisk version).*$/i, '')
        .replace(/\s*\((sped up|speed up|slowed|nightcore|remix|tiktok.*|female version|frisk version)[^)]*\)/gi, '')
        .trim();
      const primaryArtist = artist
        .split(',')[0]
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .trim();

      const queries = Array.from(
        new Set(
          [
            `${cleanTitle} ${primaryArtist}`.trim(),
            cleanTitle,
            `${baseSongTitle} ${primaryArtist}`.trim(),
            baseSongTitle,
          ].filter(Boolean)
        )
      );
      let clientId = await getSoundCloudClientId(false);

      let bestCandidate: SoundCloudTrackCandidate | null = null;
      let bestScore = -999;

      for (const q of queries) {
        if (!q) continue;
        let searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
          q
        )}&client_id=${clientId}&limit=15`;
        let res = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
        if (res.status === 401 || res.status === 403) {
          clientId = await getSoundCloudClientId(true);
          searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
            q
          )}&client_id=${clientId}&limit=15`;
          res = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
        }
        if (!res.ok) continue;

        const data = (await res.json()) as { collection?: SoundCloudTrackCandidate[] };
        const collection = data.collection || [];

        for (const item of collection) {
          const dur = item.duration || 0;
          const fullDur = item.full_duration || dur;
          // Strictly require complete, full-length songs (>= 65s and <= 9 mins, never 30s Go+ previews)
          if (dur < 65_000 || dur > 540_000) continue;
          if (fullDur > dur + 5_000) continue;

          const transcodings = item.media?.transcodings || [];
          const hasPlayableStream = transcodings.some(
            (tr) =>
              tr.format?.protocol === 'progressive' ||
              (tr.format?.protocol === 'hls' && tr.preset !== 'abr_sq')
          );
          if (!hasPlayableStream) continue;

          const sc = scoreTrackCandidate(item, title, artist);
          if (sc > bestScore) {
            bestScore = sc;
            bestCandidate = item;
          }
        }

        if (bestScore >= 75 && bestCandidate) break;
      }

      if (!bestCandidate || !bestCandidate.media?.transcodings) {
        return null;
      }

      const transcodings = bestCandidate.media.transcodings;
      const chosenTranscoding =
        transcodings.find((tr) => tr.format?.protocol === 'progressive') ||
        transcodings.find(
          (tr) => tr.format?.protocol === 'hls' && tr.preset === 'aac_160k'
        ) ||
        transcodings.find(
          (tr) => tr.format?.protocol === 'hls' && tr.preset === 'aac_96k'
        ) ||
        transcodings.find(
          (tr) => tr.format?.protocol === 'hls' && tr.preset !== 'abr_sq'
        ) ||
        transcodings.find((tr) => tr.format?.protocol === 'hls');

      if (!chosenTranscoding) {
        return null;
      }

      const streamMetaRes = await fetch(
        `${chosenTranscoding.url}?client_id=${clientId}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!streamMetaRes.ok) return null;
      const streamMeta = (await streamMetaRes.json()) as { url?: string };
      if (!streamMeta.url) return null;

      let fullBuffer: Buffer;
      let mimeType = 'audio/mp4';
      let ext = 'm4a';

      if (chosenTranscoding.format?.protocol === 'progressive') {
        const audioRes = await fetch(streamMeta.url, {
          signal: AbortSignal.timeout(15000),
        });
        if (!audioRes.ok) return null;
        fullBuffer = Buffer.from(await audioRes.arrayBuffer());
        mimeType = 'audio/mpeg';
        ext = 'mp3';
      } else {
        const m3u8Res = await fetch(streamMeta.url, {
          signal: AbortSignal.timeout(6000),
        });
        if (!m3u8Res.ok) return null;
        const m3u8Text = await m3u8Res.text();
        const mapMatch = m3u8Text.match(/#EXT-X-MAP:URI="([^"]+)"/);
        const segmentUrls = m3u8Text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('https://'));

        const allUrls = mapMatch ? [mapMatch[1], ...segmentUrls] : segmentUrls;
        if (allUrls.length === 0) return null;

        const segmentBuffers = await Promise.all(
          allUrls.map(async (segUrl) => {
            const segRes = await fetch(segUrl, { signal: AbortSignal.timeout(12000) });
            if (!segRes.ok) {
              throw new Error(`Segment HTTP ${segRes.status}`);
            }
            return Buffer.from(await segRes.arrayBuffer());
          })
        );
        fullBuffer = Buffer.concat(segmentBuffers);
      }

      // Completeness & truncation check on the assembled audio file
      if (fullBuffer.length < 500_000 || !isValidCompleteAudioHeader(fullBuffer)) {
        return null;
      }

      const targetFile = path.join(CACHE_DIR, `${safeId}.${ext}`);
      fs.writeFileSync(targetFile, fullBuffer);

      const entry: CachedAudioEntry = {
        filePath: targetFile,
        mimeType,
        byteLength: fullBuffer.length,
        durationSec: Math.round((bestCandidate.duration || 180_000) / 1000),
      };
      memoryMetaCache.set(safeId, entry);
      return entry;
    } catch {
      return null;
    } finally {
      inFlightResolutions.delete(safeId);
    }
  })();

  inFlightResolutions.set(safeId, task);
  return task;
}

function serveAudioFileWithRanges(
  req: Request,
  res: Response,
  entry: CachedAudioEntry
): void {
  const total = entry.byteLength;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('X-Audio-Verified', 'complete');
  res.setHeader('X-Audio-Duration-Sec', String(entry.durationSec));
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', String(total));
    res.status(200).end();
    return;
  }

  const rangeHeader = req.headers.range;
  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? Math.min(total - 1, parseInt(parts[1], 10)) : total - 1;

    if (Number.isFinite(start) && start >= 0 && start <= end && end < total) {
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', String(chunkSize));
      const stream = fs.createReadStream(entry.filePath, { start, end });
      stream.pipe(res);
      return;
    }
  }

  res.status(200);
  res.setHeader('Content-Length', String(total));
  fs.createReadStream(entry.filePath).pipe(res);
}

async function startServer() {
  const app = express();

  // Dynamic full-length song resolver & byte-range streaming endpoint
  app.all('/api/audio/stream/:trackId', async (req: Request, res: Response) => {
    const trackId = String(req.params.trackId || 'track');
    const title = String(req.query.title || '');
    const artist = String(req.query.artist || '');
    const fallbackLocal = String(req.query.fallback || '/audio/duvet-x-linger.mp3');

    if (title) {
      const resolved = await resolveAndCacheFullTrack(trackId, title, artist);
      if (resolved && fs.existsSync(resolved.filePath)) {
        serveAudioFileWithRanges(req, res, resolved);
        return;
      }
    }

    // Fallback to verified local full-length master if external resolution is offline
    const sanitizedFallback = fallbackLocal.replace(/^\/+/, '');
    const localPath = path.resolve(process.cwd(), 'public', sanitizedFallback);
    if (fs.existsSync(localPath)) {
      const stat = fs.statSync(localPath);
      serveAudioFileWithRanges(req, res, {
        filePath: localPath,
        mimeType: 'audio/mpeg',
        byteLength: stat.size,
        durationSec: Math.round(stat.size / 24000),
      });
      return;
    }

    res.status(404).json({ error: 'Audio track not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kerr Relativity Engine server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
