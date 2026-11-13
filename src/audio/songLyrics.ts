// Native Time-Aligned LRC Lyric Sync Engine for the Songs Studio Deck
import { SongTrackDefinition } from './trapQueenPlayer';
import coreLyricsJson from './coreLyricsData.json';

export interface SyncedLyricLine {
  timeSec: number;
  text: string;
}

const dynamicLyricsCache = new Map<string, SyncedLyricLine[]>();
const inflightLyricsRequests = new Map<string, Promise<SyncedLyricLine[] | null>>();

export const CORE_SONG_LYRICS: Record<string, SyncedLyricLine[]> =
  coreLyricsJson as Record<string, SyncedLyricLine[]>;

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

/**
 * Extracts meaningful artist tokens from both the track title `(feat. ...)` / `(with ...)`
 * and the `artistName` string, filtering out generic speed-up/nightcore uploader tags.
 */
export function extractCleanArtistsForLyrics(
  title: string,
  artistName: string
): { realArtists: string[]; allArtists: string[] } {
  const raw: string[] = [];
  const featMatches = [...title.matchAll(/\((?:with|feat\.?|ft\.?)\s+([^)]+)\)/gi)];
  for (const m of featMatches) {
    if (m[1]) {
      raw.push(...m[1].split(/[,&/•×]/));
    }
  }
  raw.push(...artistName.split(/[,&•×/]/));

  const allArtists: string[] = [];
  for (const item of raw) {
    const cleaned = item
      .replace(/\$/g, 's')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (
      cleaned.length >= 2 &&
      !allArtists.some((a) => a.toLowerCase() === cleaned.toLowerCase())
    ) {
      allArtists.push(cleaned);
    }
  }

  const realArtists = allArtists.filter(
    (a) => !NON_ORIGINAL_UPLOADER_NAMES.has(a.toLowerCase())
  );

  return { realArtists, allArtists };
}

/**
 * Parses standard LRC timestamped lyrics (`[mm:ss.xx] line`) into sorted SyncedLyricLine[],
 * preserving 0.01s studio timecode precision.
 */
export function parseLrcString(
  lrc: string,
  timeScale = 1.0,
  maxDurationSec = 9999
): SyncedLyricLine[] {
  const lines: SyncedLyricLine[] = [];
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
      const scaledSec = Math.min(
        Math.max(0, maxDurationSec - 0.5),
        Math.round(rawSec * timeScale * 100) / 100
      );
      lines.push({ timeSec: scaledSec, text });
    }
  }

  lines.sort((a, b) => a.timeSec - b.timeSec);
  return lines;
}

/**
 * Generates clean song-section subtitle cues when external LRC lyrics are still loading.
 */
export function buildTrackSubtitleFallback(track: SongTrackDefinition): SyncedLyricLine[] {
  const coreLines = CORE_SONG_LYRICS[track.id];
  if (coreLines && coreLines.length > 0) {
    return coreLines;
  }

  const cached = dynamicLyricsCache.get(track.id);
  if (cached && cached.length > 0) {
    return cached;
  }

  const cleanTitle = track.title.replace(/\s*\([^)]*\)/g, '').trim();
  return [
    { timeSec: 0, text: `♪ ${track.title} — ${track.artistName} ♪` },
    { timeSec: 2, text: `Loading studio time-synced lyrics for "${cleanTitle}"...` },
  ];
}

/**
 * Asynchronously resolves accurate time-synced LRC lyrics for any track.
 * - For normal studio tracks: preserves exact 1:1 studio `[mm:ss.xx]` LRC timestamps without distortion.
 * - For Sped Up / Nightcore / Slowed tracks: scales timestamps only when decoded audio duration differs from original LRC duration.
 */
export async function fetchSyncedLyricsForTrack(
  track: SongTrackDefinition,
  decodedAudioDurationSec?: number
): Promise<SyncedLyricLine[]> {
  const coreLines = CORE_SONG_LYRICS[track.id];
  if (coreLines && coreLines.length > 0) {
    return coreLines;
  }

  const isSpeedModified = /sped\s*up|speed\s*up|nightcore|slowed/i.test(
    `${track.title} ${track.artistName}`
  );
  const cacheKey =
    isSpeedModified && decodedAudioDurationSec && decodedAudioDurationSec >= 65
      ? `${track.id}:${Math.round(decodedAudioDurationSec)}`
      : `${track.id}:studio`;

  const existing = dynamicLyricsCache.get(cacheKey);
  if (existing && existing.length > 0) {
    return existing;
  }

  const inflight = inflightLyricsRequests.get(cacheKey);
  if (inflight) {
    const res = await inflight;
    return res || buildTrackSubtitleFallback(track);
  }

  const requestPromise = (async (): Promise<SyncedLyricLine[] | null> => {
    try {
      const durParam =
        decodedAudioDurationSec && decodedAudioDurationSec >= 65
          ? `&duration=${Math.round(decodedAudioDurationSec)}`
          : '';

      // 1. Try server-side accurate lyrics endpoint first
      try {
        const apiRes = await fetch(
          `/api/audio/lyrics?trackId=${encodeURIComponent(
            track.id
          )}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
            track.artistName
          )}${durParam}`,
          { signal: AbortSignal.timeout(5500) }
        );
        if (apiRes.ok) {
          const data = (await apiRes.json()) as { lines?: SyncedLyricLine[] };
          if (Array.isArray(data.lines) && data.lines.length >= 4) {
            dynamicLyricsCache.set(cacheKey, data.lines);
            dynamicLyricsCache.set(track.id, data.lines);
            return data.lines;
          }
        }
      } catch {
        // Fall through to direct client-side lrclib resolution
      }

      // 2. Direct client-side lrclib fallback with exact 1:1 studio timestamp preservation
      const baseTitle = track.title
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

      const { realArtists, allArtists } = extractCleanArtistsForLyrics(
        track.title,
        track.artistName
      );
      const primaryArtist = realArtists[0] || allArtists[0] || '';

      const urls = [
        primaryArtist
          ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(
              baseTitle
            )}&artist_name=${encodeURIComponent(primaryArtist)}`
          : '',
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(baseTitle)}`,
      ].filter(Boolean);

      for (const url of urls) {
        const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
        if (!res.ok) continue;
        const items = (await res.json()) as Array<{
          trackName?: string;
          artistName?: string;
          duration?: number;
          syncedLyrics?: string;
          plainLyrics?: string;
        }>;
        if (!Array.isArray(items) || items.length === 0) continue;

        const withSynced = items.find(
          (it) => it.syncedLyrics && it.syncedLyrics.includes('[')
        );
        if (withSynced?.syncedLyrics) {
          const lrcDur = withSynced.duration || 210;
          let scale = 1.0;
          if (
            isSpeedModified &&
            decodedAudioDurationSec &&
            decodedAudioDurationSec >= 65 &&
            lrcDur >= 65
          ) {
            const ratio = decodedAudioDurationSec / lrcDur;
            if (Math.abs(1 - ratio) > 0.05 && ratio >= 0.55 && ratio <= 1.65) {
              scale = ratio;
            }
          }

          const parsed = parseLrcString(withSynced.syncedLyrics, scale, 9999);
          if (parsed.length >= 4) {
            dynamicLyricsCache.set(cacheKey, parsed);
            dynamicLyricsCache.set(track.id, parsed);
            return parsed;
          }
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      inflightLyricsRequests.delete(cacheKey);
    }
  })();

  inflightLyricsRequests.set(cacheKey, requestPromise);
  const resolved = await requestPromise;
  return resolved || buildTrackSubtitleFallback(track);
}

/**
 * Returns the index of the active lyric line for a given playback timestamp,
 * aligning natively with the audio element's currentTime and optional fine-tune offset.
 */
export function getActiveLyricIndex(
  lines: SyncedLyricLine[],
  currentTimeSec: number,
  syncOffsetSec = 0
): number {
  if (!lines || lines.length === 0) return -1;
  const effectiveTime = Math.max(0, currentTimeSec + syncOffsetSec + 0.12);
  let activeIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (effectiveTime >= lines[i].timeSec) {
      activeIdx = i;
    } else {
      break;
    }
  }
  return activeIdx;
}

/**
 * Computes fractional 0..1 progress through the currently active lyric line
 * for real-time word-by-word native lyric synchronization.
 */
export function getActiveLineProgress(
  lines: SyncedLyricLine[],
  activeIdx: number,
  currentTimeSec: number,
  syncOffsetSec = 0
): number {
  if (!lines || activeIdx < 0 || activeIdx >= lines.length) return 0;
  const effectiveTime = Math.max(0, currentTimeSec + syncOffsetSec + 0.12);
  const startSec = lines[activeIdx].timeSec;
  const endSec =
    activeIdx + 1 < lines.length
      ? lines[activeIdx + 1].timeSec
      : startSec + 5.0;
  const span = Math.max(0.6, Math.min(8.5, endSec - startSec));
  return Math.max(0, Math.min(1, (effectiveTime - startSec) / span));
}
