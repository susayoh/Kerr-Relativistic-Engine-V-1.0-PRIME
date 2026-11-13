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
const lyricsCache = new Map<string, Array<{ timeSec: number; text: string }>>();
const officialDurationCache = new Map<string, number>();

// Direct verified 320kbps / FLAC-derived studio masters for tracks whose official SoundCloud uploads are SNIP-restricted
const VERIFIED_STUDIO_MASTER_URLS: Record<
  string,
  { url?: string; soundcloudId?: number; durationSec: number }
> = {
  love_the_way_you_lie_23: {
    url: 'https://archive.org/download/eminem-recovery_320/2010%20-%20Recovery%2F15%20Love%20the%20Way%20You%20Lie.mp3',
    durationSec: 263,
  },
  the_monster_44: {
    url: 'https://archive.org/download/flac-eminem-the-marshall-mathers-lp2-expanded-edition-0faea025/12.%20The%20Monster.mp3',
    durationSec: 250,
  },
  love_the_way_you_lie_part_ii_98: {
    soundcloudId: 6909912,
    durationSec: 296,
  },
  wicked_ways_99: {
    url: 'https://archive.org/download/flac-eminem-the-marshall-mathers-lp2-expanded-edition-0faea025/21.%20Wicked%20Ways.mp3',
    durationSec: 391,
  },
  legacy_100: {
    url: 'https://archive.org/download/flac-eminem-the-marshall-mathers-lp2-expanded-edition-0faea025/06.%20Legacy.mp3',
    durationSec: 296,
  },
  homicide_101: {
    url: 'https://archive.org/download/logic-homicide-feat.-eminem-official-audio-mp-3-70-k/Logic%20-%20Homicide%20(feat.%20Eminem)%20(Official%20Audio)(MP3_70K).mp3',
    durationSec: 245,
  },
  the_ringer_102: {
    url: 'https://archive.org/download/flac-eminem-kamikaze-7b2a8914/01.%20The%20Ringer.mp3',
    durationSec: 338,
  },
  fall_103: {
    url: 'https://archive.org/download/flac-eminem-kamikaze-7b2a8914/10.%20Fall.mp3',
    durationSec: 262,
  },
  zeus_feat_white_gold_106: {
    url: 'https://archive.org/download/eminem-music-to-be-murdered-by-side-b/%5B2020%5D%20Eminem%20-%20Music_To_Be_Murdered_By-Side_B-24BIT-WEBFLAC-2020-MenInFlac%2F114-eminem-zeus-1caafd.mp3',
    durationSec: 230,
  },
  lucky_you_feat_joyner_lucas_107: {
    url: 'https://archive.org/download/flac-eminem-kamikaze-7b2a8914/03.%20Lucky%20You.mp3',
    durationSec: 245,
  },
  normal_125: {
    url: 'https://archive.org/download/flac-eminem-kamikaze-7b2a8914/05.%20Normal.mp3',
    durationSec: 222,
  },
  last_one_standing_feat_polo__128: {
    url: 'https://archive.org/download/flac-skylar-grey-last-one-standing-from-venom-let-there-cd3fa495/Skylar%20Grey%20-%20Last%20One%20Standing%20(From%20Venom%E2%88%B6%20Let%20There%20Be%20Carnage).mp3',
    durationSec: 257,
  },
};

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
  policy?: string;
  user?: {
    username?: string;
  };
  media?: {
    transcodings?: SoundCloudTranscoding[];
  };
}

const NON_ORIGINAL_UPLOADER_NAMES = new Set([
  'nightcore',
  'sped up',
  'speed up',
  'slowed',
  'female version',
  'frisk version',
  'saltynuggets',
  'fam0uz',
  'bbygirl',
  'lonelyeve',
  'tara chen',
  'life illustrated',
  'aa records',
  'independent lemon',
  'sped up + slowed',
  'speed up songs',
  'nightcore reality',
  'syrex',
]);

export function extractMeaningfulArtists(targetTitle: string, targetArtist: string): string[] {
  const rawList: string[] = [];

  const featMatches = [
    ...targetTitle.matchAll(/\((?:with|feat\.?|ft\.?)\s+([^)]+)\)/gi),
  ];
  for (const m of featMatches) {
    if (m[1]) {
      rawList.push(...m[1].split(/[,&/•×]/));
    }
  }

  rawList.push(...targetArtist.split(/[,&•×/]/));

  const cleaned: string[] = [];
  for (const item of rawList) {
    const norm = item
      .replace(/\$/g, 's')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (norm.length >= 2 && !cleaned.some((x) => x.toLowerCase() === norm.toLowerCase())) {
      cleaned.push(norm);
    }
  }
  return cleaned;
}

/**
 * Looks up the authoritative studio master duration (in seconds) from Apple Music / iTunes catalog
 * so SoundCloud & Archive.org candidates can be verified against the true Spotify/Apple Music length.
 */
async function fetchOfficialStudioDurationSec(
  baseTitle: string,
  primaryArtist: string
): Promise<number | undefined> {
  const key = `${baseTitle.toLowerCase()}::${primaryArtist.toLowerCase()}`;
  const cached = officialDurationCache.get(key);
  if (cached) return cached;

  try {
    const term = `${baseTitle} ${primaryArtist}`.trim();
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      results?: Array<{
        trackName?: string;
        artistName?: string;
        trackTimeMillis?: number;
      }>;
    };
    const results = data.results || [];
    const normBase = baseTitle
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const normArtist = primaryArtist
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    for (const r of results) {
      if (!r.trackTimeMillis || r.trackTimeMillis < 60_000) continue;
      const rTitle = (r.trackName || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const rArtist = (r.artistName || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (
        (rTitle === normBase || rTitle.includes(normBase) || normBase.includes(rTitle)) &&
        (!normArtist || rArtist.includes(normArtist) || normArtist.includes(rArtist))
      ) {
        const durSec = Math.round(r.trackTimeMillis / 1000);
        officialDurationCache.set(key, durSec);
        return durSec;
      }
    }
  } catch {
    // Ignore lookup timeout
  }
  return undefined;
}

export function scoreTrackCandidate(
  cand: SoundCloudTrackCandidate,
  targetTitle: string,
  targetArtist: string,
  officialDurationSec?: number
): number {
  const cTitle = (cand.title || '').toLowerCase();
  const cUser = (cand.user?.username || '').toLowerCase();
  const cCombined = `${cTitle} ${cUser}`;
  const cTitleClean = cTitle
    .replace(/\$/g, 's')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cCombinedClean = cCombined
    .replace(/\$/g, 's')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tTitle = targetTitle.toLowerCase();
  const coreTitle = tTitle
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(
      /\s*[-–]\s*(sped up|speed up|slowed|nightcore|remix|tiktok.*|female version|frisk version|from .*).*$/i,
      ''
    )
    .replace(/\$/g, 's')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const coreWords = coreTitle.split(/\s+/).filter((w) => w.length >= 2);

  let score = 0;

  // 1. Candidate TRACK TITLE itself must match the song's core title
  if (coreTitle && cTitleClean === coreTitle) {
    score += 95;
  } else if (coreTitle && cTitleClean.includes(coreTitle)) {
    score += 75;
  } else if (coreTitle && cCombinedClean.includes(coreTitle)) {
    score += 20;
  } else {
    score -= 50;
  }

  let matchedCoreWordsInTitle = 0;
  for (const w of coreWords) {
    const wordRegex = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordRegex.test(cTitleClean) || cTitleClean.includes(w)) {
      score += 22;
      matchedCoreWordsInTitle++;
    } else {
      score -= 28;
    }
  }
  if (coreWords.length > 0 && matchedCoreWordsInTitle === 0) {
    score -= 90;
  }

  // 2. Artist matching across all artists (both primary & featured)
  const artists = extractMeaningfulArtists(targetTitle, targetArtist);
  let matchedArtistCount = 0;
  for (const a of artists) {
    const aLower = a.toLowerCase();
    if (cCombinedClean.includes(aLower)) {
      score += 40;
      matchedArtistCount++;
    } else {
      const artistTokens = aLower.split(/\s+/).filter((tok) => tok.length >= 3);
      if (artistTokens.length > 0 && artistTokens.every((tok) => cCombinedClean.includes(tok))) {
        score += 28;
        matchedArtistCount++;
      }
    }
  }
  if (artists.length > 0 && matchedArtistCount === 0) {
    score -= 45;
  }

  // 3. Strict Version & Modifier Enforcement (Sped Up / Nightcore / Slowed / Unsolicited Remixes & Freestyles)
  const wantsSlowed = /slowed/i.test(tTitle);
  const wantsSpedUp =
    /sped\s*up|speed\s*up|nightcore/i.test(tTitle) || /nightcore/i.test(targetArtist);
  const wantsRemix = /\b(remix|flip|bootleg|mashup|edit|vip)\b/i.test(tTitle);
  const wantsCoverOrInst = /\b(cover|instrumental|karaoke|8d|live|acoustic)\b/i.test(tTitle);

  const isCandSlowed = /\b(slowed|slow)\b/i.test(cTitle);
  const isCandSpedUp = /\b(sped\s*up|speed\s*up|nightcore|spedup|speedup)\b/i.test(cTitle);
  const isCandRemix =
    /\b(remix|flip|bootleg|mashup|rework|refix|circuit|club mix|dj\s|tik\s*tok|freestyle|type\s*beat|remake)\b/i.test(
      cTitle
    );
  const isCandCoverOrInst =
    /\b(cover|instrumental|inst\b|ver\b|karaoke|8d|bass\s*boosted|live\s*at|acoustic|1\s*hour|loop|parody|reaction)\b/i.test(
      cTitle
    );

  if (wantsSlowed) {
    score += isCandSlowed ? 60 : -60;
  } else if (isCandSlowed) {
    score -= 110;
  }

  if (wantsSpedUp) {
    score += isCandSpedUp ? 65 : -50;
  } else if (isCandSpedUp) {
    score -= 110;
  }

  if (!wantsRemix && isCandRemix) {
    score -= 120;
  } else if (wantsRemix && isCandRemix) {
    score += 35;
  }

  if (!wantsCoverOrInst && isCandCoverOrInst) {
    score -= 120;
  }

  // 4. Duration proximity against the official Spotify/Apple Music/Label duration
  const candDurSec = Math.round((cand.duration || 0) / 1000);
  if (
    !wantsSpedUp &&
    !wantsSlowed &&
    officialDurationSec &&
    officialDurationSec >= 65 &&
    candDurSec >= 65
  ) {
    const diff = Math.abs(candDurSec - officialDurationSec);
    if (diff <= 4) {
      score += 80;
    } else if (diff <= 10) {
      score += 50;
    } else if (diff <= 18) {
      score += 15;
    } else if (diff > 30) {
      score -= 95;
    } else {
      score -= 40;
    }
  }

  return score;
}

function isValidCompleteAudioHeader(buf: Buffer): boolean {
  if (!buf || buf.length < 16) return false;
  if (buf[0] === 0x3c && (buf[1] === 0x21 || buf[1] === 0x68 || buf[1] === 0x48)) {
    return false;
  }
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return true;
  }
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    return true;
  }
  const boxType = buf.subarray(4, 8).toString('ascii');
  if (boxType === 'ftyp' || boxType === 'styp' || boxType === 'moov' || boxType === 'moof') {
    return true;
  }
  return false;
}

async function downloadAndCacheSoundCloudTrack(
  cand: SoundCloudTrackCandidate,
  clientId: string,
  safeId: string
): Promise<CachedAudioEntry | null> {
  const transcodings = cand.media?.transcodings || [];
  const chosenTranscoding =
    transcodings.find((tr) => tr.format?.protocol === 'progressive') ||
    transcodings.find((tr) => tr.format?.protocol === 'hls' && tr.preset === 'aac_160k') ||
    transcodings.find((tr) => tr.format?.protocol === 'hls' && tr.preset === 'aac_96k') ||
    transcodings.find((tr) => tr.format?.protocol === 'hls' && tr.preset !== 'abr_sq');

  if (!chosenTranscoding) return null;

  const streamMetaRes = await fetch(`${chosenTranscoding.url}?client_id=${clientId}`, {
    signal: AbortSignal.timeout(6000),
  });
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
    if (m3u8Text.includes('SAMPLE-AES') || m3u8Text.includes('skd://')) {
      return null;
    }
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

  if (fullBuffer.length < 500_000 || !isValidCompleteAudioHeader(fullBuffer)) {
    return null;
  }

  const targetFile = path.join(CACHE_DIR, `${safeId}.${ext}`);
  fs.writeFileSync(targetFile, fullBuffer);

  const entry: CachedAudioEntry = {
    filePath: targetFile,
    mimeType,
    byteLength: fullBuffer.length,
    durationSec: Math.round((cand.duration || 180_000) / 1000),
  };
  memoryMetaCache.set(safeId, entry);
  return entry;
}

async function downloadAndCacheDirectUrl(
  url: string,
  durationSec: number,
  safeId: string
): Promise<CachedAudioEntry | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(18000) });
  if (!res.ok) return null;
  const fullBuffer = Buffer.from(await res.arrayBuffer());
  if (fullBuffer.length < 500_000 || !isValidCompleteAudioHeader(fullBuffer)) {
    return null;
  }
  const targetFile = path.join(CACHE_DIR, `${safeId}.mp3`);
  fs.writeFileSync(targetFile, fullBuffer);
  const entry: CachedAudioEntry = {
    filePath: targetFile,
    mimeType: 'audio/mpeg',
    byteLength: fullBuffer.length,
    durationSec,
  };
  memoryMetaCache.set(safeId, entry);
  return entry;
}

function parseLengthSec(lenStr?: string): number | null {
  if (!lenStr) return null;
  if (/^\d+(\.\d+)?$/.test(lenStr)) {
    return Math.round( parseFloat(lenStr) );
  }
  const parts = lenStr.split(':').map(Number);
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

/**
 * Fallback studio master resolver using Archive.org FLAC-derived & 320kbps studio items
 * when a label track is SNIP-restricted on SoundCloud.
 */
async function resolveFromArchiveOrgStudioMaster(
  baseTitle: string,
  primaryArtist: string,
  officialDurationSec: number | undefined,
  safeId: string
): Promise<CachedAudioEntry | null> {
  try {
    const q = `(${baseTitle}) AND (${primaryArtist}) AND mediatype:(audio)`;
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      q
    )}&fl[]=identifier,title,creator&rows=12&output=json`;
    const r = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const d = (await r.json()) as {
      response?: { docs?: Array<{ identifier?: string; title?: string }> };
    };
    const docs = d.response?.docs || [];
    docs.sort((a, b) => {
      const aFlac = String(a.identifier || '').startsWith('flac-') ? 1 : 0;
      const bFlac = String(b.identifier || '').startsWith('flac-') ? 1 : 0;
      return bFlac - aFlac;
    });

    const normTitle = baseTitle.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

    for (const doc of docs.slice(0, 5)) {
      if (!doc.identifier) continue;
      const metaRes = await fetch(`https://archive.org/metadata/${doc.identifier}`, {
        signal: AbortSignal.timeout(4500),
      });
      if (!metaRes.ok) continue;
      const meta = (await metaRes.json()) as {
        files?: Array<{ name?: string; title?: string; length?: string }>;
      };
      for (const f of meta.files || []) {
        if (!f.name || !f.name.toLowerCase().endsWith('.mp3')) continue;
        const label = `${f.name} ${f.title || ''}`.toLowerCase();
        if (
          /\b(instrumental|karaoke|remix|slowed|sped up|nightcore|live|cover|freestyle|parody)\b/i.test(
            label
          )
        ) {
          continue;
        }
        const fNorm = label.replace(/[^\p{L}\p{N}]+/gu, '');
        if (!fNorm.includes(normTitle)) continue;

        const fileDur = parseLengthSec(f.length);
        if (
          officialDurationSec &&
          fileDur &&
          Math.abs(fileDur - officialDurationSec) > 15
        ) {
          continue;
        }

        const directUrl = `https://archive.org/download/${
          doc.identifier
        }/${encodeURIComponent(f.name).replace(/%2F/g, '/')}`;
        const downloaded = await downloadAndCacheDirectUrl(
          directUrl,
          fileDur || officialDurationSec || 210,
          safeId
        );
        if (downloaded) return downloaded;
      }
    }
  } catch {
    // Ignore fallback error
  }
  return null;
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
      // 1. Check pre-verified 320kbps / FLAC studio master table first (e.g. Eminem catalog)
      const verifiedMaster = VERIFIED_STUDIO_MASTER_URLS[trackId];
      if (verifiedMaster) {
        if (verifiedMaster.url) {
          const directEntry = await downloadAndCacheDirectUrl(
            verifiedMaster.url,
            verifiedMaster.durationSec,
            safeId
          );
          if (directEntry) return directEntry;
        }
        if (verifiedMaster.soundcloudId) {
          const clientId = await getSoundCloudClientId(false);
          const scRes = await fetch(
            `https://api-v2.soundcloud.com/tracks/${verifiedMaster.soundcloudId}?client_id=${clientId}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (scRes.ok) {
            const scTrack = (await scRes.json()) as SoundCloudTrackCandidate;
            const scEntry = await downloadAndCacheSoundCloudTrack(scTrack, clientId, safeId);
            if (scEntry) return scEntry;
          }
        }
      }

      const cleanTitle = title
        .replace(/\s*\((with|feat\.)[^)]+\)/gi, '')
        .replace(/\s*-\s*From.*$/i, '')
        .trim();
      const baseSongTitle = cleanTitle
        .replace(
          /\s*[-–]\s*(sped up|speed up|slowed|nightcore|remix|tiktok.*|female version|frisk version).*$/i,
          ''
        )
        .replace(
          /\s*\((sped up|speed up|slowed|nightcore|remix|tiktok.*|female version|frisk version)[^)]*\)/gi,
          ''
        )
        .trim();

      const meaningfulArtists = extractMeaningfulArtists(title, artist);
      const realArtists = meaningfulArtists.filter(
        (a) => !NON_ORIGINAL_UPLOADER_NAMES.has(a.toLowerCase())
      );
      const topTwoArtists = (realArtists.length > 0 ? realArtists : meaningfulArtists)
        .slice(0, 2)
        .join(' ');
      const primaryArtist =
        realArtists[0] || meaningfulArtists[0] || artist.split(',')[0].trim();

      const wantsSpedUp =
        /sped\s*up|speed\s*up|nightcore/i.test(title) || /nightcore/i.test(artist);
      const wantsSlowed = /slowed/i.test(title);
      const modifierSuffix = wantsSpedUp ? 'sped up' : wantsSlowed ? 'slowed' : '';

      const queries = Array.from(
        new Set(
          [
            topTwoArtists ? `${cleanTitle} ${topTwoArtists}`.trim() : '',
            primaryArtist ? `${cleanTitle} ${primaryArtist}`.trim() : '',
            modifierSuffix && primaryArtist
              ? `${baseSongTitle} ${primaryArtist} ${modifierSuffix}`.trim()
              : '',
            cleanTitle,
            primaryArtist ? `${baseSongTitle} ${primaryArtist}`.trim() : '',
          ].filter(Boolean)
        )
      );

      // Fetch client_id and authoritative Apple Music / iTunes studio duration in parallel
      const [initialClientId, itunesDurationSec] = await Promise.all([
        getSoundCloudClientId(false),
        !wantsSpedUp && !wantsSlowed
          ? fetchOfficialStudioDurationSec(baseSongTitle, primaryArtist)
          : Promise.resolve(undefined),
      ]);
      let clientId = initialClientId;
      let officialDurationSec = itunesDurationSec;

      let bestCandidate: SoundCloudTrackCandidate | null = null;
      let bestScore = -999;

      for (const q of queries) {
        if (!q) continue;
        let searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
          q
        )}&client_id=${clientId}&limit=25`;
        let res = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
        if (res.status === 401 || res.status === 403) {
          clientId = await getSoundCloudClientId(true);
          searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
            q
          )}&client_id=${clientId}&limit=25`;
          res = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
        }
        if (!res.ok) continue;

        const data = (await res.json()) as { collection?: SoundCloudTrackCandidate[] };
        const collection = data.collection || [];

        // Extract official label full_duration from any SNIP track if not already known
        if (!officialDurationSec && !wantsSpedUp && !wantsSlowed) {
          const snipMatch = collection.find(
            (c) =>
              c.policy === 'SNIP' &&
              c.full_duration &&
              c.full_duration >= 65_000 &&
              (c.title || '').toLowerCase().includes(baseSongTitle.toLowerCase())
          );
          if (snipMatch?.full_duration) {
            officialDurationSec = Math.round(snipMatch.full_duration / 1000);
          }
        }

        for (const item of collection) {
          const dur = item.duration || 0;
          const fullDur = item.full_duration || dur;
          if (dur < 65_000 || dur > 540_000) continue;
          if (fullDur > dur + 5_000) continue;

          const transcodings = item.media?.transcodings || [];
          const hasPlayableStream = transcodings.some(
            (tr) =>
              tr.format?.protocol === 'progressive' ||
              (tr.format?.protocol === 'hls' && tr.preset !== 'abr_sq')
          );
          if (!hasPlayableStream) continue;

          const sc = scoreTrackCandidate(item, title, artist, officialDurationSec);
          if (sc > bestScore) {
            bestScore = sc;
            bestCandidate = item;
          }
        }

        if (bestScore >= 135 && bestCandidate) break;
      }

      // If SoundCloud has a strong studio match, download and cache it
      if (bestCandidate && bestScore >= 75) {
        const scEntry = await downloadAndCacheSoundCloudTrack(
          bestCandidate,
          clientId,
          safeId
        );
        if (scEntry) return scEntry;
      }

      // If SoundCloud was SNIP-locked or lacked an accurate studio match, resolve from Archive.org FLAC/320k masters
      if (!wantsSpedUp && !wantsSlowed) {
        const archiveEntry = await resolveFromArchiveOrgStudioMaster(
          baseSongTitle,
          primaryArtist,
          officialDurationSec,
          safeId
        );
        if (archiveEntry) return archiveEntry;
      }

      // Final fallback to best available playable SoundCloud candidate
      if (bestCandidate) {
        return await downloadAndCacheSoundCloudTrack(bestCandidate, clientId, safeId);
      }

      return null;
    } catch {
      return null;
    } finally {
      inFlightResolutions.delete(safeId);
    }
  })();

  inFlightResolutions.set(safeId, task);
  return task;
}

function parseLrcToLines(
  lrc: string,
  scale = 1.0,
  maxDurSec = 9999
): Array<{ timeSec: number; text: string }> {
  const lines: Array<{ timeSec: number; text: string }> = [];
  const rawLines = lrc.split(/\r?\n/);
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const raw of rawLines) {
    const matches = [...raw.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = raw.replace(timeRegex, '').trim();
    if (!text) continue;

    for (const m of matches) {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) / 1000 : 0;
      const rawSec = mins * 60 + secs + frac;
      const scaled = Math.min(
        Math.max(0, maxDurSec - 0.5),
        Math.round(rawSec * scale * 100) / 100
      );
      lines.push({ timeSec: scaled, text });
    }
  }

  lines.sort((a, b) => a.timeSec - b.timeSec);
  return lines;
}

interface LrcLibSearchItem {
  trackName?: string;
  artistName?: string;
  duration?: number;
  syncedLyrics?: string;
  plainLyrics?: string;
}

async function resolveAccurateLyrics(
  trackId: string,
  title: string,
  artist: string,
  actualAudioDurationSec?: number
): Promise<Array<{ timeSec: number; text: string }> | null> {
  const isSpeedModified = /sped\s*up|speed\s*up|nightcore|slowed/i.test(`${title} ${artist}`);
  const cacheKey = isSpeedModified
    ? `${trackId}:${Math.round(actualAudioDurationSec || 0)}`
    : `${trackId}:studio`;
  const cached = lyricsCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const baseTitle = title
    .replace(/\s*\((with|feat\.?|ft\.?)[^)]+\)/gi, '')
    .replace(
      /\s*[-–]\s*(sped up|speed up|slowed|nightcore|remix|tiktok.*|female version|frisk version|from .*).*$/i,
      ''
    )
    .replace(
      /\s*\((sped up|speed up|slowed|nightcore|remix|tiktok.*|female version|frisk version)[^)]*\)/gi,
      ''
    )
    .trim();

  const allArtists = extractMeaningfulArtists(title, artist);
  const realArtists = allArtists.filter(
    (a) => !NON_ORIGINAL_UPLOADER_NAMES.has(a.toLowerCase())
  );
  const primaryArtist = realArtists[0] || allArtists[0] || '';

  const verifiedDuration =
    VERIFIED_STUDIO_MASTER_URLS[trackId]?.durationSec ||
    actualAudioDurationSec ||
    (await fetchOfficialStudioDurationSec(baseTitle, primaryArtist));

  const searchUrls = [
    primaryArtist
      ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(
          baseTitle
        )}&artist_name=${encodeURIComponent(primaryArtist)}`
      : '',
    primaryArtist
      ? `https://lrclib.net/api/search?q=${encodeURIComponent(`${baseTitle} ${primaryArtist}`)}`
      : '',
    `https://lrclib.net/api/search?track_name=${encodeURIComponent(baseTitle)}`,
  ].filter(Boolean);

  const baseTitleNorm = baseTitle
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let bestItem: LrcLibSearchItem | null = null;
  let bestScore = -999;

  for (const url of searchUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (!res.ok) continue;
      const items = (await res.json()) as LrcLibSearchItem[];
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const item of items) {
        if (!item.syncedLyrics && !item.plainLyrics) continue;
        const itTitle = (item.trackName || '')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const itArtist = (item.artistName || '')
          .toLowerCase()
          .replace(/\$/g, 's')
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        let sc = 0;
        if (item.syncedLyrics && item.syncedLyrics.includes('[')) sc += 75;
        if (itTitle === baseTitleNorm) sc += 55;
        else if (itTitle.includes(baseTitleNorm) || baseTitleNorm.includes(itTitle)) sc += 30;
        else sc -= 40;

        for (const a of realArtists) {
          const aNorm = a.toLowerCase();
          if (itArtist.includes(aNorm) || aNorm.includes(itArtist)) {
            sc += 50;
          }
        }

        if (verifiedDuration && verifiedDuration > 60 && item.duration && item.duration > 60) {
          const diff = Math.abs(item.duration - verifiedDuration);
          if (diff <= 3) sc += 60;
          else if (diff <= 8) sc += 35;
          else if (diff <= 20) sc += 10;
          else if (!isSpeedModified && diff > 35) sc -= 40;
        }

        if (sc > bestScore) {
          bestScore = sc;
          bestItem = item;
        }
      }

      if (bestItem && bestScore >= 140) break;
    } catch {
      // Continue to next fallback search URL
    }
  }

  if (!bestItem) return null;

  if (bestItem.syncedLyrics && bestItem.syncedLyrics.includes('[')) {
    const lrcDur = bestItem.duration || verifiedDuration || 210;
    // CRITICAL: For normal-speed studio songs, NEVER distort LRC timestamps (scale = 1.0 exact studio sync).
    // Only scale when the track is explicitly Sped Up / Nightcore / Slowed and we have the actual audio duration.
    let scale = 1.0;
    if (
      isSpeedModified &&
      actualAudioDurationSec &&
      actualAudioDurationSec >= 65 &&
      lrcDur >= 65
    ) {
      const ratio = actualAudioDurationSec / lrcDur;
      if (Math.abs(1 - ratio) > 0.05 && ratio >= 0.55 && ratio <= 1.65) {
        scale = ratio;
      }
    }

    const parsed = parseLrcToLines(
      bestItem.syncedLyrics,
      scale,
      (actualAudioDurationSec || verifiedDuration || 600) + 15
    );
    if (parsed.length >= 4) {
      lyricsCache.set(cacheKey, parsed);
      return parsed;
    }
  }

  if (bestItem.plainLyrics && bestItem.plainLyrics.trim().length > 20) {
    const rawLines = bestItem.plainLyrics
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length >= 4) {
      const dur = Math.max(90, verifiedDuration || bestItem.duration || 180);
      const interval = Math.max(2.5, (dur - 10) / rawLines.length);
      const timed = rawLines.map((text, idx) => ({
        timeSec: Math.round((4 + idx * interval) * 10) / 10,
        text,
      }));
      lyricsCache.set(cacheKey, timed);
      return timed;
    }
  }

  return null;
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

  // Accurate time-synced lyrics resolver & time-scaler endpoint
  app.get('/api/audio/lyrics', async (req: Request, res: Response) => {
    const trackId = String(req.query.trackId || 'track');
    const title = String(req.query.title || '');
    const artist = String(req.query.artist || '');
    const actualDurationSec = Number(req.query.duration) || undefined;

    if (!title) {
      res.status(400).json({ lines: [] });
      return;
    }

    const lines = await resolveAccurateLyrics(
      trackId,
      title,
      artist,
      actualDurationSec
    );
    res.json({ lines: lines || [] });
  });

  // Live filesystem codebase metrics endpoint so the Code tab updates automatically after every update
  app.get('/api/codebase/telemetry', (_req: Request, res: Response) => {
    try {
      const rootDir = process.cwd();
      const fileMetrics: Record<string, { lines: number; bytes: number; preview: string }> = {};

      const inspectFile = (relPath: string) => {
        const fullPath = path.resolve(rootDir, relPath);
        if (!fs.existsSync(fullPath)) return;
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return;
        const raw = fs.readFileSync(fullPath, 'utf8');
        const splitLines = raw.split(/\r?\n/);
        const lineCount = raw.endsWith('\n')
          ? Math.max(1, splitLines.length - 1)
          : splitLines.length;
        fileMetrics[`/${relPath.replace(/^\/+/, '')}`] = {
          lines: lineCount,
          bytes: Buffer.byteLength(raw, 'utf8'),
          preview: splitLines.slice(0, 28).join('\n'),
        };
      };

      const walkDir = (dirRel: string) => {
        const absDir = path.resolve(rootDir, dirRel);
        if (!fs.existsSync(absDir)) return;
        const entries = fs.readdirSync(absDir, { withFileTypes: true });
        for (const entry of entries) {
          const childRel = path.posix.join(dirRel, entry.name);
          if (entry.isDirectory()) {
            walkDir(childRel);
          } else if (/\.(ts|tsx|css|json)$/i.test(entry.name)) {
            inspectFile(childRel);
          }
        }
      };

      walkDir('src');
      for (const rootFile of [
        'server.ts',
        'index.html',
        'package.json',
        'vite.config.ts',
        'tsconfig.json',
        'metadata.json',
      ]) {
        inspectFile(rootFile);
      }

      res.json({
        files: fileMetrics,
        updatedAt: Date.now(),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
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

if (process.env.NODE_ENV !== 'test') {
  void startServer();
}
