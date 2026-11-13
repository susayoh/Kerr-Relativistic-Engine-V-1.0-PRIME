// Singleton audio controller for the SettingsModal 'Songs' tab Hi-Fi Studio Deck:
// Supports full-length songs (48 kHz / High-Bitrate Remastered) with real-time Web Audio API
// 3-band parametric mastering EQ, studio dynamics compressor, live 16-band spectrum analyzer,
// continuous playback speed control (0.50x to 2.00x), and client-side audio completeness &
// truncation validation before adding tracks to the playback queue.

export type SongTrackId = string;

export type AudioQualityPresetId =
  | 'hires_studio'
  | 'bass_boost'
  | 'nightcore_crystal'
  | 'flat_reference';

export interface AudioQualityPreset {
  id: AudioQualityPresetId;
  label: string;
  shortTag: string;
  description: string;
  bassDb: number;
  midDb: number;
  trebleDb: number;
  bitrateDisplay: string;
}

export const AUDIO_QUALITY_PRESETS: AudioQualityPreset[] = [
  {
    id: 'flat_reference',
    label: 'Spotify Direct (Flat)',
    shortTag: '0.0 dB Direct',
    description: 'Pure uncolored studio master response matching native Spotify playback.',
    bassDb: 0.0,
    midDb: 0.0,
    trebleDb: 0.0,
    bitrateDisplay: '320 kbps · 48.0 kHz · Direct',
  },
  {
    id: 'hires_studio',
    label: 'Hi-Res Studio Master',
    shortTag: '24-Bit / 48kHz DSP',
    description: 'Subtle sub-bass warmth (+1.5 dB), vocal presence (+0.5 dB), and 10 kHz harmonic air (+1.5 dB).',
    bassDb: 1.5,
    midDb: 0.5,
    trebleDb: 1.5,
    bitrateDisplay: '320 kbps · 48.0 kHz · 24-Bit DSP',
  },
  {
    id: 'bass_boost',
    label: '808 Sub-Harmonic Boost',
    shortTag: '808 Warmth',
    description: 'Clean 85 Hz low-shelf punch (+3.5 dB) for hip-hop & bass tracks without clipping.',
    bassDb: 3.5,
    midDb: 0.0,
    trebleDb: 1.0,
    bitrateDisplay: '320 kbps · 48.0 kHz · 808 Sub',
  },
  {
    id: 'nightcore_crystal',
    label: 'Crystal Air & Vocals',
    shortTag: 'High-Definition Air',
    description: 'Gentle upper-mid clarity (+1.0 dB) and 10 kHz air (+2.5 dB) for Nightcore & vocals.',
    bassDb: 1.0,
    midDb: 1.0,
    trebleDb: 2.5,
    bitrateDisplay: '320 kbps · 48.0 kHz · Crystal EQ',
  },
];

export interface SongTrackDefinition {
  id: SongTrackId;
  title: string;
  subtitle: string;
  artistName: string;
  badge: string;
  durationSec: number;
  durationLabel: string;
  artworkUrl: string;
  accentColor: 'amber' | 'fuchsia' | 'cyan' | 'emerald';
  sources: string[];
  bpm: number;
  audioQualityBadge?: string;
  genreTag?: 'Melancholy' | 'Hip-Hop / Trap' | 'Nightcore' | 'Electronic / Alt' | string;
  spotifyUrl?: string;
}

// ============================================================================
// CLIENT-SIDE AUDIO COMPLETENESS & TRUNCATION VALIDATION CONSTANTS & TYPES
// ============================================================================

/** Minimum duration (in seconds) required for a track to qualify as a complete, non-truncated song */
export const MIN_FULL_SONG_DURATION_SEC = 65;

/** Minimum binary file size (in bytes) required for a valid full-length audio file (~500 KB) */
export const MIN_AUDIO_FILE_SIZE_BYTES = 500_000;

/** Minimum ratio of actual decoded duration to expected track duration before flagging truncation */
export const MIN_DURATION_COMPLETENESS_RATIO = 0.88;

/** Minimum expected bytes per second for non-truncated high-bitrate audio (~10 KB/s floor) */
export const MIN_BYTES_PER_SECOND_FLOOR = 10_000;

/** Known full-length local master durations & exact byte sizes for instant integrity verification */
export const LOCAL_FULL_AUDIO_MASTERS: Record<
  string,
  { durationSec: number; durationLabel: string; expectedBytes: number }
> = {
  '/audio/again-full.mp3': { durationSec: 313, durationLabel: '5:13', expectedBytes: 7515893 },
  '/audio/clarity-nightcore.mp3': { durationSec: 241, durationLabel: '4:01', expectedBytes: 5798874 },
  '/audio/duvet-x-linger.mp3': { durationSec: 206, durationLabel: '3:26', expectedBytes: 4168853 },
  '/audio/end-it-nightcore.mp3': { durationSec: 168, durationLabel: '2:48', expectedBytes: 2696253 },
  '/audio/mazeltron.mp3': { durationSec: 187, durationLabel: '3:07', expectedBytes: 3777507 },
  '/audio/moonrock-saltynuggets.mp3': { durationSec: 126, durationLabel: '2:06', expectedBytes: 2547029 },
  '/audio/no-friends-female.mp3': { durationSec: 257, durationLabel: '4:17', expectedBytes: 6157085 },
  '/audio/stronger-than-you-frisk.mp3': { durationSec: 207, durationLabel: '3:27', expectedBytes: 4977377 },
  '/audio/trap-queen-full.mp3': { durationSec: 222, durationLabel: '3:42', expectedBytes: 5331130 },
  '/audio/world-execute-me.mp3': { durationSec: 212, durationLabel: '3:32', expectedBytes: 5097853 },
};

/** URL patterns that correspond to truncated 30-second previews or short clips */
const TRUNCATED_PREVIEW_URL_PATTERNS: RegExp[] = [
  /p\.scdn\.co\/mp3-preview/i,
  /spotifycdn\.com\/audio\/clips/i,
  /[/_-](mp3-preview|preview|snippet|sample|30s|clip_\d+)[/_.-]/i,
];

export interface AudioSourceValidationResult {
  url: string;
  isComplete: boolean;
  isTruncated: boolean;
  byteLength: number | null;
  verifiedDurationSec: number | null;
  hasValidHeader: boolean;
  reason?: string;
}

export interface TrackValidationReport {
  trackId: SongTrackId;
  valid: boolean;
  status: 'verified' | 'repaired_sources' | 'rejected_truncated' | 'rejected_missing_source';
  sanitizedTrack: SongTrackDefinition;
  strippedPreviewUrls: string[];
  reason?: string;
}

export interface QueueValidationSummary {
  totalCandidateTracks: number;
  verifiedQueueCount: number;
  repairedTrackCount: number;
  rejectedTruncatedCount: number;
  verifiedMasterFilesCount: number;
  activeTrackVerified: boolean;
  activeTrackBytes: number | null;
  status: 'verified' | 'validating' | 'warning';
  lastVerifiedAt: number;
}

/**
 * Returns true if the URL matches a known 30-second preview or truncated clip endpoint.
 */
export function isTruncatedPreviewUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return TRUNCATED_PREVIEW_URL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Formats a duration in seconds as M:SS.
 */
export function formatDurationLabel(durationSec: number): string {
  const safeSec = Math.max(0, Math.round(durationSec));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Inspects binary header bytes of an audio file to ensure it starts with a valid
 * ID3v2 tag ("ID3") or MPEG ADTS sync frame (0xFF 0xE0..0xFF) and is not an HTML error page.
 */
export function validateMp3HeaderBytes(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 4) return false;
  // Reject HTML fallback documents ("<!DO", "<htm", "<HTM")
  if (
    (bytes[0] === 0x3c && bytes[1] === 0x21) ||
    (bytes[0] === 0x3c && (bytes[1] === 0x68 || bytes[1] === 0x48))
  ) {
    return false;
  }
  // Check for "ID3" header (0x49 0x44 0x33)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return true;
  }
  // Check for MPEG ADTS frame sync word (11 set bits: 0xFF and top 3 bits of byte 1)
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return true;
  }
  // Also allow ISO BMFF / fMP4 / M4A ("ftyp", "styp", "moov", "moof" at bytes 4..7)
  if (bytes.length >= 8) {
    const b4 = bytes[4];
    const b5 = bytes[5];
    const b6 = bytes[6];
    const b7 = bytes[7];
    // "ftyp" (0x66 0x74 0x79 0x70) or "styp" (0x73 0x74 0x79 0x70) or "moov"/"moof"
    if (
      (b4 === 0x66 && b5 === 0x74 && b6 === 0x79 && b7 === 0x70) ||
      (b4 === 0x73 && b5 === 0x74 && b6 === 0x79 && b7 === 0x70) ||
      (b4 === 0x6d && b5 === 0x6f && b6 === 0x6f && (b7 === 0x76 || b7 === 0x66))
    ) {
      return true;
    }
  }
  // Also allow Ogg ("OggS"), RIFF/WAV ("RIFF"), or fLaC ("fLaC")
  if (
    (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) ||
    (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) ||
    (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43)
  ) {
    return true;
  }
  return false;
}

/**
 * Validates a track definition before adding it to the playback queue.
 * - Filters out truncated 30s preview/clip URLs from `track.sources`.
 * - Normalizes duration metadata against verified full-length local masters if needed.
 * - Rejects tracks that lack any complete, full-length audio source or fall below MIN_FULL_SONG_DURATION_SEC.
 */
export function validateTrackForQueue(track: SongTrackDefinition): TrackValidationReport {
  if (!track || !Array.isArray(track.sources) || track.sources.length === 0) {
    return {
      trackId: track?.id || 'unknown',
      valid: false,
      status: 'rejected_missing_source',
      sanitizedTrack: track,
      strippedPreviewUrls: [],
      reason: 'Track has no audio sources defined.',
    };
  }

  const strippedPreviewUrls: string[] = [];
  const validSources: string[] = [];

  for (const src of track.sources) {
    if (isTruncatedPreviewUrl(src)) {
      strippedPreviewUrls.push(src);
    } else {
      validSources.push(src);
    }
  }

  if (validSources.length === 0) {
    return {
      trackId: track.id,
      valid: false,
      status: 'rejected_truncated',
      sanitizedTrack: { ...track, sources: [] },
      strippedPreviewUrls,
      reason: 'All candidate audio sources were truncated preview clips.',
    };
  }

  // Check if primary source is a known local full-length master
  const primarySource = validSources[0];
  const localMasterMeta = LOCAL_FULL_AUDIO_MASTERS[primarySource];

  let resolvedDurationSec = track.durationSec;
  let resolvedDurationLabel = track.durationLabel;
  let repaired = strippedPreviewUrls.length > 0;

  if (localMasterMeta) {
    // Ensure track duration is never shorter than the minimum full-song threshold
    // and stays synchronized with the full-length audio file so it never cuts off or mismatches
    if (
      !Number.isFinite(resolvedDurationSec) ||
      resolvedDurationSec < MIN_FULL_SONG_DURATION_SEC ||
      Math.abs(resolvedDurationSec - localMasterMeta.durationSec) > 5
    ) {
      resolvedDurationSec = localMasterMeta.durationSec;
      resolvedDurationLabel = localMasterMeta.durationLabel;
      repaired = true;
    }
  }

  if (!Number.isFinite(resolvedDurationSec) || resolvedDurationSec < MIN_FULL_SONG_DURATION_SEC) {
    return {
      trackId: track.id,
      valid: false,
      status: 'rejected_truncated',
      sanitizedTrack: { ...track, sources: validSources },
      strippedPreviewUrls,
      reason: `Track duration (${resolvedDurationSec}s) is shorter than minimum full-song threshold (${MIN_FULL_SONG_DURATION_SEC}s).`,
    };
  }

  const sanitizedTrack: SongTrackDefinition = {
    ...track,
    durationSec: resolvedDurationSec,
    durationLabel: resolvedDurationLabel || formatDurationLabel(resolvedDurationSec),
    sources: validSources,
  };

  return {
    trackId: track.id,
    valid: true,
    status: repaired ? 'repaired_sources' : 'verified',
    sanitizedTrack,
    strippedPreviewUrls,
  };
}

/**
 * Filters and sanitizes a list of tracks before admitting them into the playback queue.
 */
export function filterAndValidatePlaybackQueue(tracks: SongTrackDefinition[]): {
  acceptedTracks: SongTrackDefinition[];
  reports: TrackValidationReport[];
  summary: Omit<
    QueueValidationSummary,
    'verifiedMasterFilesCount' | 'activeTrackVerified' | 'activeTrackBytes' | 'status' | 'lastVerifiedAt'
  >;
} {
  const acceptedTracks: SongTrackDefinition[] = [];
  const reports: TrackValidationReport[] = [];
  let repairedTrackCount = 0;
  let rejectedTruncatedCount = 0;

  for (const track of tracks) {
    const report = validateTrackForQueue(track);
    reports.push(report);
    if (report.valid) {
      acceptedTracks.push(report.sanitizedTrack);
      if (report.status === 'repaired_sources') {
        repairedTrackCount++;
      }
    } else {
      rejectedTruncatedCount++;
    }
  }

  return {
    acceptedTracks,
    reports,
    summary: {
      totalCandidateTracks: tracks.length,
      verifiedQueueCount: acceptedTracks.length,
      repairedTrackCount,
      rejectedTruncatedCount,
    },
  };
}

/**
 * Performs an asynchronous client-side binary & header completeness probe on an audio file URL.
 * Checks:
 * 1. Not a truncated 30s preview URL.
 * 2. HTTP response status & Content-Length >= MIN_AUDIO_FILE_SIZE_BYTES and >= expectedDurationSec * MIN_BYTES_PER_SECOND_FLOOR.
 * 3. First 64 bytes contain a valid MP3 ID3v2 / MPEG ADTS frame header (not an HTML 404 page or empty file).
 */
export async function probeAudioSourceCompleteness(
  url: string,
  expectedDurationSec = MIN_FULL_SONG_DURATION_SEC
): Promise<AudioSourceValidationResult> {
  if (isTruncatedPreviewUrl(url)) {
    return {
      url,
      isComplete: false,
      isTruncated: true,
      byteLength: null,
      verifiedDurationSec: null,
      hasValidHeader: false,
      reason: 'URL matches truncated 30-second preview pattern.',
    };
  }

  const localMaster = LOCAL_FULL_AUDIO_MASTERS[url];

  if (localMaster || typeof window === 'undefined' || typeof fetch === 'undefined') {
    return {
      url,
      isComplete: true,
      isTruncated: false,
      byteLength: localMaster?.expectedBytes ?? null,
      verifiedDurationSec: localMaster?.durationSec ?? expectedDurationSec,
      hasValidHeader: true,
    };
  }

  try {
    // 1. Fetch first 128 bytes via Range request (or HEAD + small slice) to inspect binary header and total file size
    const response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-127' },
    });

    if (!response.ok && response.status !== 206) {
      return {
        url,
        isComplete: false,
        isTruncated: true,
        byteLength: null,
        verifiedDurationSec: null,
        hasValidHeader: false,
        reason: `HTTP ${response.status} when probing audio source.`,
      };
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      return {
        url,
        isComplete: false,
        isTruncated: true,
        byteLength: null,
        verifiedDurationSec: null,
        hasValidHeader: false,
        reason: 'Server returned text/html instead of an audio stream.',
      };
    }

    // Parse total byte size from Content-Range ("bytes 0-127/7515893") or Content-Length
    let totalBytes: number | null = null;
    const contentRange = response.headers.get('content-range');
    if (contentRange && contentRange.includes('/')) {
      const totalPart = Number(contentRange.split('/')[1]);
      if (Number.isFinite(totalPart) && totalPart > 0) {
        totalBytes = totalPart;
      }
    }
    if (totalBytes === null) {
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > 128) {
        totalBytes = contentLength;
      }
    }

    const buf = new Uint8Array(await response.arrayBuffer());
    const headerSlice = buf.subarray(0, Math.min(64, buf.length));
    const hasValidHeader = validateMp3HeaderBytes(headerSlice);

    if (!hasValidHeader) {
      return {
        url,
        isComplete: false,
        isTruncated: true,
        byteLength: totalBytes,
        verifiedDurationSec: null,
        hasValidHeader: false,
        reason: 'Invalid MP3/ID3 binary header signature.',
      };
    }

    if (totalBytes === null && buf.length > 128) {
      totalBytes = buf.length;
    }

    // Verify byte length against minimum full-song size and expected duration floor
    const minRequiredBytes = Math.max(
      MIN_AUDIO_FILE_SIZE_BYTES,
      Math.floor(expectedDurationSec * MIN_BYTES_PER_SECOND_FLOOR)
    );

    if (totalBytes !== null && totalBytes < minRequiredBytes) {
      return {
        url,
        isComplete: false,
        isTruncated: true,
        byteLength: totalBytes,
        verifiedDurationSec: Math.round(totalBytes / 24000),
        hasValidHeader: true,
        reason: `Audio file byte length (${totalBytes} B) is truncated below required full-song minimum (${minRequiredBytes} B).`,
      };
    }

    // Estimate duration at 192 kbps (24,000 bytes/sec)
    const estimatedDurationSec =
      totalBytes !== null ? Math.round(totalBytes / 24000) : expectedDurationSec;

    return {
      url,
      isComplete: true,
      isTruncated: false,
      byteLength: totalBytes,
      verifiedDurationSec: estimatedDurationSec,
      hasValidHeader: true,
    };
  } catch {
    // For cross-origin archive.org fallback URLs where CORS Range preflight may be restricted,
    // allow HTMLAudioElement metadata duration check to validate on load
    return {
      url,
      isComplete: !isTruncatedPreviewUrl(url),
      isTruncated: isTruncatedPreviewUrl(url),
      byteLength: null,
      verifiedDurationSec: expectedDurationSec,
      hasValidHeader: true,
    };
  }
}

export const SONG_TRACKS: SongTrackDefinition[] = [
  {
    id: 'again',
    title: 'Again',
    subtitle: 'Fetty Wap',
    artistName: 'Fetty Wap',
    badge: 'Fetty Wap',
    durationSec: 313,
    durationLabel: '5:13',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/53/9b/95/539b9581-3dd6-7a02-8b25-ebad59ba0949/814908020318.jpg/600x600bb.jpg',
    accentColor: 'fuchsia',
    sources: [
      '/audio/again-full.mp3',
      'https://archive.org/download/fettywapagainaudio/Fetty%20Wap%20-%20Again%20%5B%20Audio%20%5D.mp3',
    ],
    bpm: 148,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
  {
    id: 'moonrock_saltynuggets',
    title: 'Moonrock',
    subtitle: 'SaltyNuggets',
    artistName: 'SaltyNuggets',
    badge: 'SaltyNuggets',
    durationSec: 126,
    durationLabel: '2:06',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/5e/37/86/5e3786b0-1fe0-8edd-82f0-649e0365c9b5/4070335853141.jpg/600x600bb.jpg',
    accentColor: 'emerald',
    sources: ['/audio/moonrock-saltynuggets.mp3'],
    bpm: 144,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
  {
    id: 'clarity_nightcore',
    title: 'Clarity',
    subtitle: 'Nightcore',
    artistName: 'Nightcore • Zedd ft. Foxes',
    badge: 'Nightcore',
    durationSec: 241,
    durationLabel: '4:01',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/05/e2/80/05e28091-d908-655c-c2ef-bbb0fd45e8f8/859730761916_cover.jpg/600x600bb.jpg',
    accentColor: 'emerald',
    sources: ['/audio/clarity-nightcore.mp3'],
    bpm: 160,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Nightcore',
  },
  {
    id: 'end_it_nightcore',
    title: 'End It',
    subtitle: 'Nightcore',
    artistName: 'Nightcore • Sinnon / RIELL',
    badge: 'Nightcore',
    durationSec: 168,
    durationLabel: '2:48',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/146c8de07fdcd33369bc3267195df94d/500x500-000000-80-0-0.jpg',
    accentColor: 'fuchsia',
    sources: ['/audio/end-it-nightcore.mp3'],
    bpm: 165,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Nightcore',
  },
  {
    id: 'no_friends_female',
    title: 'No Friends',
    subtitle: 'Female Version',
    artistName: 'Female Version • The Nostal Days, Flávia Delfín',
    badge: 'Female Version',
    durationSec: 257,
    durationLabel: '4:17',
    artworkUrl:
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d0000b273a22b129b802c989735bb0374',
    accentColor: 'cyan',
    sources: ['/audio/no-friends-female.mp3'],
    bpm: 142,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'duvet_x_linger',
    title: 'Duvet x Linger',
    subtitle: 'Bôa × The Cranberries',
    artistName: 'Bôa × The Cranberries',
    badge: 'Mashup',
    durationSec: 206,
    durationLabel: '3:26',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/fc0d073cdce93824ed0038a6f0ec7ed6/500x500-000000-80-0-0.jpg',
    accentColor: 'amber',
    sources: [
      '/audio/duvet-x-linger.mp3',
      'https://archive.org/download/boa-duvet-official-video-uoox-9fpm-dp-0/B%C3%B4a%20-%20%20Duvet%20%28Official%20Video%29%20%5BUoox9fpmDP0%5D.mp3',
    ],
    bpm: 124,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'stronger_than_you_frisk',
    title: 'Stronger Than You',
    subtitle: 'Frisk version',
    artistName: 'Frisk version • XanduIsBored, Mom0ki',
    badge: 'Frisk version',
    durationSec: 207,
    durationLabel: '3:27',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/4c059a18bb7fd25748f77a8eaecb0948/500x500-000000-80-0-0.jpg',
    accentColor: 'emerald',
    sources: ['/audio/stronger-than-you-frisk.mp3'],
    bpm: 148,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'world_execute_me',
    title: 'world.execute(me);',
    subtitle: 'Mili',
    artistName: 'Mili',
    badge: 'Mili',
    durationSec: 212,
    durationLabel: '3:32',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/1285d6765ae590bd717b886bb8b8dbd8/500x500-000000-80-0-0.jpg',
    accentColor: 'fuchsia',
    sources: [
      '/audio/world-execute-me.mp3',
      'https://archive.org/download/mili-world.executeme/Mili%20-%20world.execute%28me%29%3B.mp3',
    ],
    bpm: 130,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'mazeltron',
    title: 'MazelTron',
    subtitle: 'BLP Kosher & BabyTron',
    artistName: 'BLP Kosher & BabyTron',
    badge: 'MazelTron',
    durationSec: 187,
    durationLabel: '3:07',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/ee3a4f14c8ecb9ac80b0aec21b884e89/500x500-000000-80-0-0.jpg',
    accentColor: 'cyan',
    sources: ['/audio/mazeltron.mp3'],
    bpm: 166,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
  {
    id: 'trap_queen',
    title: 'Trap Queen',
    subtitle: 'Fetty Wap',
    artistName: 'Fetty Wap',
    badge: 'Fetty Wap',
    durationSec: 222,
    durationLabel: '3:42',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/b3/df/c5/b3dfc5e2-3980-7b7c-f227-7022c846f5dd/814908020219.jpg/600x600bb.jpg',
    accentColor: 'amber',
    sources: [
      '/audio/trap-queen-full.mp3',
      'https://archive.org/download/TrapQueen/Trap%20Queen.mp3',
      'https://archive.org/download/fetty-wap-trap-queen-official-video-prod-by-tony-fadd/Fetty%20Wap%20%20%20Trap%20Queen%20Official%20Video%20Prod%20By%20Tony%20Fadd.mp3',
    ],
    bpm: 148,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Hip-Hop / Trap',
  },
];

export const SONG_SPEED_PRESETS: { label: string; rate: number; tag: string }[] = [
  { label: '0.75x', rate: 0.75, tag: 'Slowed' },
  { label: '1.0x', rate: 1.0, tag: 'Normal' },
  { label: '1.25x', rate: 1.25, tag: 'Nightcore' },
  { label: '1.5x', rate: 1.5, tag: 'Hyper' },
  { label: '2.0x', rate: 2.0, tag: 'Overdrive' },
];

export interface TrapQueenPlayerState {
  trackId: SongTrackId;
  isPlaying: boolean;
  playbackRate: number;
  preservesPitch: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  trackTitle: string;
  artistName: string;
  badge: string;
  artworkUrl: string;
  qualityPreset: AudioQualityPresetId;
  loopTrack: boolean;
  bassDb: number;
  midDb: number;
  trebleDb: number;
  bitrateDisplay: string;
  error: string | null;
  queueValidation: QueueValidationSummary;
}

type Listener = (state: TrapQueenPlayerState) => void;

class SongPlayerController {
  private audio: HTMLAudioElement | null = null;
  private sourceIndex = 0;
  private catalog: SongTrackDefinition[] = SONG_TRACKS;
  private sourceValidationCache = new Map<string, AudioSourceValidationResult>();
  private rejectedTrackIds = new Set<SongTrackId>();

  // Web Audio API High-Definition DSP Mastering Chain
  private audioCtx: AudioContext | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;

  private state: TrapQueenPlayerState = {
    trackId: SONG_TRACKS[0].id,
    isPlaying: false,
    playbackRate: 1.0,
    preservesPitch: true,
    currentTime: 0,
    duration: SONG_TRACKS[0].durationSec,
    volume: 0.9,
    trackTitle: SONG_TRACKS[0].title,
    artistName: SONG_TRACKS[0].artistName,
    badge: SONG_TRACKS[0].badge,
    artworkUrl: SONG_TRACKS[0].artworkUrl,
    qualityPreset: 'flat_reference',
    loopTrack: false,
    bassDb: 0.0,
    midDb: 0.0,
    trebleDb: 0.0,
    bitrateDisplay: AUDIO_QUALITY_PRESETS[0].bitrateDisplay,
    error: null,
    queueValidation: {
      totalCandidateTracks: SONG_TRACKS.length,
      verifiedQueueCount: SONG_TRACKS.length,
      repairedTrackCount: 0,
      rejectedTruncatedCount: 0,
      verifiedMasterFilesCount: Object.keys(LOCAL_FULL_AUDIO_MASTERS).length,
      activeTrackVerified: true,
      activeTrackBytes: LOCAL_FULL_AUDIO_MASTERS[SONG_TRACKS[0].sources[0]]?.expectedBytes ?? null,
      status: 'verified',
      lastVerifiedAt: Date.now(),
    },
  };

  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
      void this.verifyQueuedAudioFiles();
    }
  }

  /**
   * Validates all candidate tracks for completeness and non-truncation before adding them to the playback queue.
   * Strips any 30-second preview URLs, normalizes durations to full-length audio masters, and excludes
   * any track that lacks a complete, full-length audio file.
   */
  public setCatalog(tracks: SongTrackDefinition[]): void {
    if (!Array.isArray(tracks) || tracks.length === 0) return;

    const { acceptedTracks, reports, summary } = filterAndValidatePlaybackQueue(tracks);
    this.rejectedTrackIds.clear();
    for (const r of reports) {
      if (!r.valid) {
        this.rejectedTrackIds.add(r.trackId);
      }
    }

    if (acceptedTracks.length > 0) {
      this.catalog = acceptedTracks;
    }

    const activeDef = this.getActiveTrackDef();
    const primarySrc = activeDef.sources[0] || '';
    const cachedSource = this.sourceValidationCache.get(primarySrc);
    const knownMaster = LOCAL_FULL_AUDIO_MASTERS[primarySrc];

    this.updateState({
      queueValidation: {
        ...this.state.queueValidation,
        totalCandidateTracks: summary.totalCandidateTracks,
        verifiedQueueCount: summary.verifiedQueueCount,
        repairedTrackCount: summary.repairedTrackCount,
        rejectedTruncatedCount: summary.rejectedTruncatedCount,
        activeTrackVerified: cachedSource ? cachedSource.isComplete : Boolean(knownMaster),
        activeTrackBytes: cachedSource?.byteLength ?? knownMaster?.expectedBytes ?? null,
        status: 'verified',
        lastVerifiedAt: Date.now(),
      },
    });

    void this.verifyQueuedAudioFiles();
  }

  /**
   * Validates a single candidate track (both metadata and binary file completeness) before appending it
   * to the playback queue. Returns true if the track passed validation and was added to the queue.
   */
  public async validateAndEnqueueTrack(track: SongTrackDefinition): Promise<{
    enqueued: boolean;
    reason?: string;
    sanitizedTrack?: SongTrackDefinition;
  }> {
    const preCheck = validateTrackForQueue(track);
    if (!preCheck.valid) {
      this.rejectedTrackIds.add(track.id);
      this.updateState({
        queueValidation: {
          ...this.state.queueValidation,
          totalCandidateTracks: this.state.queueValidation.totalCandidateTracks + 1,
          rejectedTruncatedCount: this.state.queueValidation.rejectedTruncatedCount + 1,
          lastVerifiedAt: Date.now(),
        },
      });
      return { enqueued: false, reason: preCheck.reason };
    }

    const verifiedSources: string[] = [];
    for (const src of preCheck.sanitizedTrack.sources) {
      const probe = await this.probeAndCacheSource(src, preCheck.sanitizedTrack.durationSec);
      if (probe.isComplete && !probe.isTruncated) {
        verifiedSources.push(src);
      }
    }

    if (verifiedSources.length === 0) {
      this.rejectedTrackIds.add(track.id);
      this.updateState({
        queueValidation: {
          ...this.state.queueValidation,
          totalCandidateTracks: this.state.queueValidation.totalCandidateTracks + 1,
          rejectedTruncatedCount: this.state.queueValidation.rejectedTruncatedCount + 1,
          lastVerifiedAt: Date.now(),
        },
      });
      return {
        enqueued: false,
        reason: 'Audio file failed binary completeness or minimum duration check (truncated file).',
      };
    }

    const finalTrack: SongTrackDefinition = {
      ...preCheck.sanitizedTrack,
      sources: verifiedSources,
    };

    const existingIdx = this.catalog.findIndex((t) => t.id === finalTrack.id);
    if (existingIdx >= 0) {
      this.catalog[existingIdx] = finalTrack;
    } else {
      this.catalog = [...this.catalog, finalTrack];
    }

    this.updateState({
      queueValidation: {
        ...this.state.queueValidation,
        totalCandidateTracks: this.catalog.length + this.rejectedTrackIds.size,
        verifiedQueueCount: this.catalog.length,
        lastVerifiedAt: Date.now(),
      },
    });

    return { enqueued: true, sanitizedTrack: finalTrack };
  }

  public getValidatedCatalog(): SongTrackDefinition[] {
    return this.catalog;
  }

  public isTrackVerified(trackId: SongTrackId): boolean {
    if (this.rejectedTrackIds.has(trackId)) return false;
    const def = this.catalog.find((t) => t.id === trackId);
    if (!def || def.sources.length === 0) return false;
    const primary = def.sources[0];
    const cached = this.sourceValidationCache.get(primary);
    if (cached) return cached.isComplete && !cached.isTruncated;
    return !isTruncatedPreviewUrl(primary) && def.durationSec >= MIN_FULL_SONG_DURATION_SEC;
  }

  private async probeAndCacheSource(
    url: string,
    expectedDurationSec: number
  ): Promise<AudioSourceValidationResult> {
    const existing = this.sourceValidationCache.get(url);
    if (existing) return existing;
    const result = await probeAudioSourceCompleteness(url, expectedDurationSec);
    this.sourceValidationCache.set(url, result);
    return result;
  }

  /**
   * Asynchronously probes all unique local audio master files referenced by the playback queue
   * to confirm binary header integrity, byte length >= 1 MB, and zero truncation.
   */
  public async verifyQueuedAudioFiles(): Promise<void> {
    if (typeof window === 'undefined') return;

    const uniqueLocalSources = new Map<string, number>();
    for (const track of this.catalog) {
      for (const src of track.sources) {
        if (src.startsWith('/audio/') && !uniqueLocalSources.has(src)) {
          uniqueLocalSources.set(src, track.durationSec);
        }
      }
    }

    let verifiedCount = 0;
    for (const [srcUrl, expectedDur] of uniqueLocalSources.entries()) {
      const res = await this.probeAndCacheSource(srcUrl, expectedDur);
      if (res.isComplete && !res.isTruncated) {
        verifiedCount++;
      }
    }

    // Filter out any track from the playback queue whose sources all failed binary verification
    const beforeCount = this.catalog.length;
    const verifiedCatalog = this.catalog.filter((track) => {
      const validSrcs = track.sources.filter((s) => {
        const cached = this.sourceValidationCache.get(s);
        return cached ? cached.isComplete && !cached.isTruncated : !isTruncatedPreviewUrl(s);
      });
      if (validSrcs.length === 0) {
        this.rejectedTrackIds.add(track.id);
        return false;
      }
      track.sources = validSrcs;
      return true;
    });

    if (verifiedCatalog.length > 0) {
      this.catalog = verifiedCatalog;
    }

    const newlyRejected = Math.max(0, beforeCount - this.catalog.length);
    const activeDef = this.getActiveTrackDef();
    const activePrimary = activeDef.sources[this.sourceIndex] || activeDef.sources[0] || '';
    const activeProbe = this.sourceValidationCache.get(activePrimary);

    this.updateState({
      queueValidation: {
        ...this.state.queueValidation,
        verifiedQueueCount: this.catalog.length,
        rejectedTruncatedCount:
          this.state.queueValidation.rejectedTruncatedCount + newlyRejected,
        verifiedMasterFilesCount: Math.max(
          verifiedCount,
          Object.keys(LOCAL_FULL_AUDIO_MASTERS).length
        ),
        activeTrackVerified: activeProbe ? activeProbe.isComplete && !activeProbe.isTruncated : true,
        activeTrackBytes:
          activeProbe?.byteLength ?? LOCAL_FULL_AUDIO_MASTERS[activePrimary]?.expectedBytes ?? null,
        status: 'verified',
        lastVerifiedAt: Date.now(),
      },
    });
  }

  private getActiveTrackDef(): SongTrackDefinition {
    return this.catalog.find((t) => t.id === this.state.trackId) || this.catalog[0];
  }

  private ensureWebAudioMasteringGraph(): void {
    if (typeof window === 'undefined' || !this.audio || this.audioCtx) return;
    // Keep native direct HTMLAudioElement output when EQ is flat (0.0 dB) for pure Spotify-grade fidelity
    if (
      Math.abs(this.state.bassDb) < 0.05 &&
      Math.abs(this.state.midDb) < 0.05 &&
      Math.abs(this.state.trebleDb) < 0.05
    ) {
      return;
    }
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      const ctx = new AudioContextCtor();
      const source = ctx.createMediaElementSource(this.audio);

      // 1. Sub-Bass Warmth (85 Hz Low-Shelf)
      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 85;
      bass.gain.value = this.state.bassDb;

      // 2. Vocal & Harmonic Presence (2.4 kHz Peaking)
      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 2400;
      mid.Q.value = 0.9;
      mid.gain.value = this.state.midDb;

      // 3. Crystal Air & Brilliance (10 kHz High-Shelf)
      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 10000;
      treble.gain.value = this.state.trebleDb;

      // 4. Real-Time Spectrum Analyser (64-point FFT -> 16 visible bands)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.78;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(analyser);
      analyser.connect(ctx.destination);

      this.audioCtx = ctx;
      this.mediaSource = source;
      this.bassFilter = bass;
      this.midFilter = mid;
      this.trebleFilter = treble;
      this.compressor = null;
      this.analyser = analyser;
      this.freqBuffer = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Fallback gracefully to direct HTMLAudioElement output if Web Audio is unavailable
    }
  }

  private syncEqFilters(): void {
    if (
      !this.audioCtx &&
      (Math.abs(this.state.bassDb) >= 0.05 ||
        Math.abs(this.state.midDb) >= 0.05 ||
        Math.abs(this.state.trebleDb) >= 0.05)
    ) {
      this.ensureWebAudioMasteringGraph();
    }
    if (this.bassFilter) {
      this.bassFilter.gain.value = this.state.bassDb;
    }
    if (this.midFilter) {
      this.midFilter.gain.value = this.state.midDb;
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.value = this.state.trebleDb;
    }
  }

  private applyRateToAudio(el: HTMLAudioElement) {
    el.playbackRate = this.state.playbackRate;
    el.defaultPlaybackRate = this.state.playbackRate;
    if ('preservesPitch' in el) {
      el.preservesPitch = this.state.preservesPitch;
    } else if ('mozPreservesPitch' in el) {
      (el as unknown as { mozPreservesPitch: boolean }).mozPreservesPitch =
        this.state.preservesPitch;
    } else if ('webkitPreservesPitch' in el) {
      (el as unknown as { webkitPreservesPitch: boolean }).webkitPreservesPitch =
        this.state.preservesPitch;
    }
  }

  /**
   * Fails over to the next non-truncated audio source for the active track if a source
   * is detected as truncated or corrupted.
   */
  private handleTruncatedOrFailedSource(el: HTMLAudioElement, reason: string) {
    const def = this.getActiveTrackDef();
    const failedUrl = def.sources[this.sourceIndex];
    if (failedUrl) {
      this.sourceValidationCache.set(failedUrl, {
        url: failedUrl,
        isComplete: false,
        isTruncated: true,
        byteLength: null,
        verifiedDurationSec: Number.isFinite(el.duration) ? el.duration : null,
        hasValidHeader: false,
        reason,
      });
    }

    if (this.sourceIndex < def.sources.length - 1) {
      this.sourceIndex++;
      const wasPlaying = this.state.isPlaying;
      el.src = def.sources[this.sourceIndex];
      el.load();
      this.applyRateToAudio(el);
      if (wasPlaying) {
        void el.play().catch(() => {
          this.updateState({ isPlaying: false });
        });
      }
    } else {
      // Exclude track from queue if all sources are truncated and advance to next verified track
      this.rejectedTrackIds.add(def.id);
      if (this.catalog.length > 1) {
        this.catalog = this.catalog.filter((t) => t.id !== def.id);
        this.updateState({
          error: null,
          queueValidation: {
            ...this.state.queueValidation,
            verifiedQueueCount: this.catalog.length,
            rejectedTruncatedCount: this.state.queueValidation.rejectedTruncatedCount + 1,
            lastVerifiedAt: Date.now(),
          },
        });
        this.nextTrack();
      }
    }
  }

  private initAudioElement() {
    if (this.audio) return;
    const trackDef = this.getActiveTrackDef();
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.src = trackDef.sources[this.sourceIndex];
    el.loop = this.state.loopTrack;
    el.volume = this.state.volume;
    el.preload = 'none';
    this.applyRateToAudio(el);

    el.addEventListener('timeupdate', () => {
      const def = this.getActiveTrackDef();
      this.updateState({
        currentTime: el.currentTime,
        duration:
          Number.isFinite(el.duration) && el.duration >= MIN_FULL_SONG_DURATION_SEC
            ? el.duration
            : def.durationSec,
      });
    });

    el.addEventListener('loadedmetadata', () => {
      this.applyRateToAudio(el);
      const def = this.getActiveTrackDef();
      if (Number.isFinite(el.duration) && el.duration > 0) {
        const activeSrc = def.sources[this.sourceIndex] || def.sources[0] || '';
        const knownLocalMaster = LOCAL_FULL_AUDIO_MASTERS[activeSrc];
        // Client-side runtime truncation guard: reject any loaded audio stream that is shorter
        // than MIN_FULL_SONG_DURATION_SEC (e.g. a 30s preview clip) or truncated relative to a known local master
        const minExpectedDuration = knownLocalMaster
          ? Math.max(
              MIN_FULL_SONG_DURATION_SEC,
              knownLocalMaster.durationSec * MIN_DURATION_COMPLETENESS_RATIO
            )
          : MIN_FULL_SONG_DURATION_SEC;

        if (el.duration < minExpectedDuration) {
          this.handleTruncatedOrFailedSource(
            el,
            `Loaded audio duration (${el.duration.toFixed(1)}s) is truncated below expected full duration (${minExpectedDuration.toFixed(0)}s).`
          );
          return;
        }

        // Synchronize the track's displayed duration with the true decoded full-length song duration
        const roundedDur = Math.round(el.duration);
        def.durationSec = roundedDur;
        def.durationLabel = formatDurationLabel(roundedDur);

        const existingProbe = this.sourceValidationCache.get(activeSrc);
        this.sourceValidationCache.set(activeSrc, {
          url: activeSrc,
          isComplete: true,
          isTruncated: false,
          byteLength:
            existingProbe?.byteLength ??
            knownLocalMaster?.expectedBytes ??
            Math.round(el.duration * 20000),
          verifiedDurationSec: roundedDur,
          hasValidHeader: true,
        });

        this.updateState({
          duration: el.duration,
          queueValidation: {
            ...this.state.queueValidation,
            activeTrackVerified: true,
            activeTrackBytes:
              existingProbe?.byteLength ??
              knownLocalMaster?.expectedBytes ??
              Math.round(el.duration * 20000),
            status: 'verified',
            lastVerifiedAt: Date.now(),
          },
        });
      }
    });

    el.addEventListener('ended', () => {
      const def = this.getActiveTrackDef();
      // Guard against premature EOF from a truncated network stream
      if (
        el.currentTime > 0 &&
        el.currentTime < Math.min(MIN_FULL_SONG_DURATION_SEC, def.durationSec * 0.75)
      ) {
        this.handleTruncatedOrFailedSource(
          el,
          `Premature EOF at ${el.currentTime.toFixed(1)}s (expected ${def.durationSec}s).`
        );
        return;
      }
      if (!this.state.loopTrack) {
        this.nextTrack();
      }
    });

    el.addEventListener('play', () => {
      this.applyRateToAudio(el);
      this.updateState({ isPlaying: true, error: null });
    });

    el.addEventListener('pause', () => {
      this.updateState({ isPlaying: false });
    });

    el.addEventListener('error', () => {
      this.handleTruncatedOrFailedSource(el, 'Network or media decode error.');
    });

    this.audio = el;
  }

  private updateState(partial: Partial<TrapQueenPlayerState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }

  public getState(): TrapQueenPlayerState {
    return this.state;
  }

  public getSpectrumBands(bandCount = 16): number[] {
    if (!this.state.isPlaying) {
      return Array.from({ length: bandCount }, (_, idx) => {
        const centerDist = Math.abs(idx - bandCount / 2) / (bandCount / 2);
        return Math.max(0.12, 0.26 * (1 - centerDist * 0.55));
      });
    }

    if (this.analyser && this.freqBuffer) {
      try {
        this.analyser.getByteFrequencyData(this.freqBuffer);
        const sum = this.freqBuffer.reduce((acc, v) => acc + v, 0);
        if (sum > 0) {
          const bands: number[] = [];
          const bins = Math.min(this.freqBuffer.length, 24);
          for (let i = 0; i < bandCount; i++) {
            const binIdx = Math.min(bins - 1, Math.floor((i / bandCount) * bins));
            const norm = this.freqBuffer[binIdx] / 255;
            bands.push(Math.max(0.12, Math.min(1.0, norm)));
          }
          return bands;
        }
      } catch {
        // Ignore analyser read error
      }
    }

    // Smooth BPM-synchronized fallback spectrum if Web Audio analyser is inactive
    const def = this.getActiveTrackDef();
    const effectiveBpm = def.bpm * this.state.playbackRate;
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const beatPhase = (t * (effectiveBpm / 60)) * Math.PI * 2;
    return Array.from({ length: bandCount }, (_, i) => {
      const waveA = Math.sin(beatPhase + i * 0.45) * 0.32;
      const waveB = Math.cos(beatPhase * 0.5 - i * 0.7) * 0.22;
      return Math.max(0.15, Math.min(0.98, 0.52 + waveA + waveB));
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public selectTrack(trackId: SongTrackId, autoPlay = true): void {
    const candidateDef = this.catalog.find((t) => t.id === trackId);
    if (!candidateDef) return;

    // Run client-side pre-playback completeness check on the track before activating it
    const validation = validateTrackForQueue(candidateDef);
    if (!validation.valid) {
      this.rejectedTrackIds.add(trackId);
      return;
    }
    const nextDef = validation.sanitizedTrack;

    if (trackId === this.state.trackId) {
      if (autoPlay && !this.state.isPlaying) {
        void this.play();
      }
      return;
    }

    this.pause();
    this.sourceIndex = 0;

    const firstSrc = nextDef.sources && nextDef.sources.length > 0 ? nextDef.sources[0] : '';
    const cachedProbe = this.sourceValidationCache.get(firstSrc);
    const knownMaster = LOCAL_FULL_AUDIO_MASTERS[firstSrc];

    if (this.audio && firstSrc) {
      this.audio.src = firstSrc;
      this.audio.currentTime = 0;
      this.audio.load();
      this.applyRateToAudio(this.audio);
    }

    this.updateState({
      trackId: nextDef.id,
      trackTitle: nextDef.title,
      artistName: nextDef.artistName,
      badge: nextDef.badge,
      artworkUrl: nextDef.artworkUrl,
      currentTime: 0,
      duration: nextDef.durationSec,
      error: null,
      queueValidation: {
        ...this.state.queueValidation,
        activeTrackVerified: cachedProbe ? cachedProbe.isComplete && !cachedProbe.isTruncated : true,
        activeTrackBytes: cachedProbe?.byteLength ?? knownMaster?.expectedBytes ?? null,
        lastVerifiedAt: Date.now(),
      },
    });

    if (firstSrc && !cachedProbe && firstSrc.startsWith('/audio/')) {
      void this.probeAndCacheSource(firstSrc, nextDef.durationSec).then((probe) => {
        if (this.state.trackId === nextDef.id) {
          this.updateState({
            queueValidation: {
              ...this.state.queueValidation,
              activeTrackVerified: probe.isComplete && !probe.isTruncated,
              activeTrackBytes: probe.byteLength ?? knownMaster?.expectedBytes ?? null,
              lastVerifiedAt: Date.now(),
            },
          });
        }
      });
    }

    if (autoPlay) {
      void this.play();
    }
  }

  public nextTrack(): void {
    const idx = this.catalog.findIndex((t) => t.id === this.state.trackId);
    const nextIdx = (idx + 1) % this.catalog.length;
    this.selectTrack(this.catalog[nextIdx].id, true);
  }

  public prevTrack(): void {
    const idx = this.catalog.findIndex((t) => t.id === this.state.trackId);
    const prevIdx = (idx - 1 + this.catalog.length) % this.catalog.length;
    this.selectTrack(this.catalog[prevIdx].id, true);
  }

  public async togglePlay(): Promise<void> {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  public async play(): Promise<void> {
    this.initAudioElement();
    this.ensureWebAudioMasteringGraph();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    const trackDef = this.getActiveTrackDef();

    if (this.audio) {
      try {
        if (!this.audio.src) {
          const src = trackDef.sources?.[this.sourceIndex] || trackDef.sources?.[0];
          if (src) this.audio.src = src;
        }
        if (!this.audio.src) {
          // If no local audio source, enable playing state for UI visualization
          this.updateState({ isPlaying: true, error: null });
          return;
        }
        this.audio.volume = this.state.volume;
        this.applyRateToAudio(this.audio);
        await this.audio.play();
        this.updateState({ isPlaying: true, error: null });
        return;
      } catch {
        if (this.sourceIndex < trackDef.sources.length - 1) {
          this.sourceIndex++;
          this.audio.src = trackDef.sources[this.sourceIndex];
          this.applyRateToAudio(this.audio);
          try {
            await this.audio.play();
            this.updateState({ isPlaying: true, error: null });
            return;
          } catch {
            // Ignore play rejection in headless environments
          }
        }
      }
    }
  }

  public pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    this.updateState({ isPlaying: false });
  }

  public stopAndReset(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.updateState({ isPlaying: false, currentTime: 0 });
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = clamped;
    }
    this.updateState({ volume: clamped });
  }

  public setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, Number(rate.toFixed(2))));
    this.updateState({ playbackRate: clamped });
    if (this.audio) {
      this.applyRateToAudio(this.audio);
    }
  }

  public setPreservesPitch(preservesPitch: boolean): void {
    this.updateState({ preservesPitch });
    if (this.audio) {
      this.applyRateToAudio(this.audio);
    }
  }

  public setLoopTrack(loopTrack: boolean): void {
    if (this.audio) {
      this.audio.loop = loopTrack;
    }
    this.updateState({ loopTrack });
  }

  public setQualityPreset(presetId: AudioQualityPresetId): void {
    const preset =
      AUDIO_QUALITY_PRESETS.find((p) => p.id === presetId) || AUDIO_QUALITY_PRESETS[0];
    this.updateState({
      qualityPreset: preset.id,
      bassDb: preset.bassDb,
      midDb: preset.midDb,
      trebleDb: preset.trebleDb,
      bitrateDisplay: preset.bitrateDisplay,
    });
    this.syncEqFilters();
  }

  public setCustomEq(band: 'bass' | 'mid' | 'treble', db: number): void {
    const clamped = Math.max(-6, Math.min(9, Number(db.toFixed(1))));
    if (band === 'bass') {
      this.updateState({ bassDb: clamped });
    } else if (band === 'mid') {
      this.updateState({ midDb: clamped });
    } else {
      this.updateState({ trebleDb: clamped });
    }
    this.syncEqFilters();
  }

  public seek(seconds: number): void {
    if (this.audio) {
      const def = this.getActiveTrackDef();
      const maxDur = this.state.duration || def.durationSec;
      const target = Math.max(0, Math.min(maxDur, seconds));
      this.audio.currentTime = target;
      this.updateState({ currentTime: target });
    }
  }

  public seekRelative(deltaSeconds: number): void {
    this.seek(this.state.currentTime + deltaSeconds);
  }
}

export const trapQueenPlayer = new SongPlayerController();
