// Native Time-Aligned LRC Lyric Sync & Canonical Multi-Factor Lyrics Finder Engine
import { SongTrackDefinition } from './trapQueenPlayer';
import coreLyricsJson from './coreLyricsData.json';

export interface SyncedLyricLine {
  timeSec: number;
  text: string;
}

export interface LyricsMatchMetadata {
  trackId: string;
  matchedTrackName: string;
  matchedArtistName: string;
  confidencePct: number;
  timeScale: number;
  source: 'server_lrclib' | 'client_lrclib' | 'core_embedded' | 'subtitle_fallback';
  lineCount: number;
  variantIndex: number;
}

const dynamicLyricsCache = new Map<string, SyncedLyricLine[]>();
const dynamicLyricsMetaCache = new Map<string, LyricsMatchMetadata>();
const inflightLyricsRequests = new Map<string, Promise<SyncedLyricLine[] | null>>();

export const CORE_SONG_LYRICS: Record<string, SyncedLyricLine[]> =
  coreLyricsJson as Record<string, SyncedLyricLine[]>;

/**
 * Authoritative canonical song & recording-artist lookup table for tracks in the 274-song catalog
 * whose metadata uses Nightcore/Sped-Up pseudonymous uploaders, viral TikTok lyric subtitles,
 * mashup titles, or stylized diacritics.
 */
export const CANONICAL_TRACK_METADATA: Record<
  string,
  {
    canonicalTitle: string;
    canonicalArtist: string;
    altTitles?: string[];
    studioDurationSec?: number;
  }
> = {
  // Core 10 tracks
  again: { canonicalTitle: 'Again', canonicalArtist: 'Fetty Wap', studioDurationSec: 313 },
  trap_queen: { canonicalTitle: 'Trap Queen', canonicalArtist: 'Fetty Wap', studioDurationSec: 222 },
  duvet_x_linger: { canonicalTitle: 'Duvet', canonicalArtist: 'bôa', altTitles: ['Linger'], studioDurationSec: 204 },
  clarity_nightcore: { canonicalTitle: 'Clarity', canonicalArtist: 'Zedd, Foxes', studioDurationSec: 271 },
  stronger_than_you_frisk: {
    canonicalTitle: 'Stronger Than You',
    canonicalArtist: 'Estelle',
    altTitles: ['Stronger Than You Undertale'],
  },
  world_execute_me: {
    canonicalTitle: 'world.execute(me);',
    canonicalArtist: 'Mili',
    altTitles: ['world execute me'],
    studioDurationSec: 212,
  },
  no_friends_female: {
    canonicalTitle: 'No Friends',
    canonicalArtist: 'Cadmium, Rosendale',
    studioDurationSec: 225,
  },
  end_it_nightcore: {
    canonicalTitle: 'End It',
    canonicalArtist: 'Riell, Besomorph',
    studioDurationSec: 170,
  },
  moonrock_saltynuggets: {
    canonicalTitle: 'Moonrock',
    canonicalArtist: 'SaltyNuggets',
    altTitles: ['Drowning'],
  },
  mazeltron: {
    canonicalTitle: 'MazelTron',
    canonicalArtist: 'BLP KOSHER, BabyTron',
    studioDurationSec: 172,
  },

  // Pseudonymous Uploader / Viral Subtitle / Speed-Modified Catalog Tracks
  starboy_sped_up_6: {
    canonicalTitle: 'Starboy',
    canonicalArtist: 'The Weeknd, Daft Punk',
    studioDurationSec: 230,
  },
  wasted_nightcore_bass_booste_13: {
    canonicalTitle: 'Wasted',
    canonicalArtist: 'Juice WRLD, Lil Uzi Vert',
    studioDurationSec: 258,
  },
  little_do_you_know_sped_up_r_15: {
    canonicalTitle: 'Little Do You Know',
    canonicalArtist: 'Alex & Sierra',
    studioDurationSec: 185,
  },
  after_hours_best_part_tiktok_31: {
    canonicalTitle: 'After Hours',
    canonicalArtist: 'The Weeknd',
    studioDurationSec: 361,
  },
  instrumental_71: {
    canonicalTitle: 'Камин',
    canonicalArtist: 'EMIN, JONY',
    altTitles: ['Kamin'],
    studioDurationSec: 186,
  },
  kamin_speed_up_72: {
    canonicalTitle: 'Камин',
    canonicalArtist: 'EMIN, JONY',
    altTitles: ['Kamin'],
    studioDurationSec: 186,
  },
  feat_jony_73: {
    canonicalTitle: 'Камин',
    canonicalArtist: 'EMIN, JONY',
    altTitles: ['Kamin'],
    studioDurationSec: 186,
  },
  d_anum_79: {
    canonicalTitle: 'Džanum',
    canonicalArtist: 'Teya Dora',
    altTitles: ['Dzanum'],
    studioDurationSec: 174,
  },
  kese_kese_105: {
    canonicalTitle: 'Kese',
    canonicalArtist: 'Dhurata Dora',
  },
  tattoo_tiktok_remix_104: {
    canonicalTitle: 'Tattoo',
    canonicalArtist: 'Loreen',
    studioDurationSec: 183,
  },
  see_you_again_sped_up_reverb_110: {
    canonicalTitle: 'See You Again',
    canonicalArtist: 'Tyler, The Creator, Kali Uchis',
    studioDurationSec: 180,
  },
  babydoll_x_the_perfect_girl_111: {
    canonicalTitle: 'Babydoll',
    canonicalArtist: 'Ari Abdul',
    altTitles: ['The Perfect Girl'],
    studioDurationSec: 162,
  },
  collide_speed_113: {
    canonicalTitle: 'Collide',
    canonicalArtist: 'Justine Skye',
    studioDurationSec: 260,
  },
  yes_to_heaven_speed_121: {
    canonicalTitle: 'Say Yes To Heaven',
    canonicalArtist: 'Lana Del Rey',
    altTitles: ['Yes To Heaven'],
    studioDurationSec: 209,
  },
  headlock_slowed_127: {
    canonicalTitle: 'Headlock',
    canonicalArtist: 'Imogen Heap',
    studioDurationSec: 214,
  },
  orchestrat_142: {
    canonicalTitle: 'ORCHESTRATË',
    canonicalArtist: 'Yeat',
    altTitles: ['ORCHESTRATE'],
    studioDurationSec: 175,
  },
  on_the_floor_drill_slowed_re_147: {
    canonicalTitle: 'On The Floor',
    canonicalArtist: 'Jennifer Lopez, Pitbull',
    studioDurationSec: 284,
  },
  if_we_being_r_al_151: {
    canonicalTitle: 'If We Being Rëal',
    canonicalArtist: 'Yeat',
    altTitles: ['If We Being Real'],
    studioDurationSec: 172,
  },
  flawl_ss_feat_lil_uzi_vert_152: {
    canonicalTitle: 'Flawlëss',
    canonicalArtist: 'Yeat, Lil Uzi Vert',
    altTitles: ['Flawless'],
    studioDurationSec: 176,
  },
  no_mor_talk_157: {
    canonicalTitle: 'No morë talk',
    canonicalArtist: 'Yeat',
    altTitles: ['No more talk'],
    studioDurationSec: 182,
  },
  s_per_g33ked_159: {
    canonicalTitle: 'SÜPER G33KED',
    canonicalArtist: '6arelyhuman',
    altTitles: ['SUPER GEEKED'],
  },
  heartless_x_heartless_165: {
    canonicalTitle: 'Heartless',
    canonicalArtist: 'The Weeknd',
    altTitles: ['Heartless Kanye West'],
    studioDurationSec: 198,
  },
  the_hills_x_creepin_x_the_co_166: {
    canonicalTitle: 'The Hills',
    canonicalArtist: 'The Weeknd',
    altTitles: ['Creepin', 'The Color Violet'],
    studioDurationSec: 242,
  },
  oui_sped_up_hey_there_s_no_w_171: {
    canonicalTitle: 'oui',
    canonicalArtist: 'Jeremih',
    studioDurationSec: 238,
  },
  animals_x_starboy_sped_up_to_172: {
    canonicalTitle: 'Animals',
    canonicalArtist: 'Maroon 5',
    altTitles: ['Starboy'],
    studioDurationSec: 231,
  },
  living_life_in_the_night_tik_173: {
    canonicalTitle: 'Living Life, In The Night',
    canonicalArtist: 'Cheriimoya, Sierra Kidd',
    studioDurationSec: 155,
  },
  babydoll_x_the_perfect_girl__174: {
    canonicalTitle: 'Babydoll',
    canonicalArtist: 'Ari Abdul',
    altTitles: ['The Perfect Girl'],
    studioDurationSec: 162,
  },
  in_the_name_of_love_nightcor_175: {
    canonicalTitle: 'In the Name of Love',
    canonicalArtist: 'Martin Garrix, Bebe Rexha',
    studioDurationSec: 195,
  },
  animals_speed_177: {
    canonicalTitle: 'Animals',
    canonicalArtist: 'Maroon 5',
    studioDurationSec: 231,
  },
  after_dark_x_sweater_weather_178: {
    canonicalTitle: 'After Dark',
    canonicalArtist: 'Mr.Kitty',
    altTitles: ['Sweater Weather'],
    studioDurationSec: 259,
  },
  genius_sped_up_179: {
    canonicalTitle: 'Genius',
    canonicalArtist: 'LSD, Sia, Diplo, Labrinth',
    studioDurationSec: 213,
  },
  unforgettable_tik_tok_edit_r_180: {
    canonicalTitle: 'Unforgettable',
    canonicalArtist: 'French Montana, Swae Lee',
    studioDurationSec: 233,
  },
  dark_horse_sped_up_181: {
    canonicalTitle: 'Dark Horse',
    canonicalArtist: 'Katy Perry, Juicy J',
    studioDurationSec: 215,
  },
  you_right_x_luxurious_tiktok_183: {
    canonicalTitle: 'You Right',
    canonicalArtist: 'Doja Cat, The Weeknd',
    altTitles: ['Luxurious'],
    studioDurationSec: 186,
  },
  the_hills_x_where_have_you_b_184: {
    canonicalTitle: 'The Hills',
    canonicalArtist: 'The Weeknd',
    altTitles: ['Where Have You Been'],
    studioDurationSec: 242,
  },
  obsessed_sped_up_185: {
    canonicalTitle: 'Obsessed',
    canonicalArtist: 'Mariah Carey',
    studioDurationSec: 242,
  },
  so_obesessed_with_me_speed_r_186: {
    canonicalTitle: 'Obsessed',
    canonicalArtist: 'Mariah Carey',
    studioDurationSec: 242,
  },
  shameless_sped_up_187: {
    canonicalTitle: 'Shameless',
    canonicalArtist: 'Camila Cabello',
    studioDurationSec: 219,
  },
  wannabe_sped_up_version_188: {
    canonicalTitle: 'Wannabe',
    canonicalArtist: 'why mona',
    altTitles: ['Wannabe Spice Girls'],
    studioDurationSec: 162,
  },
  strangers_sped_up_190: {
    canonicalTitle: 'Strangers',
    canonicalArtist: 'Kenya Grace',
    studioDurationSec: 172,
  },
  too_many_nights_sped_up_192: {
    canonicalTitle: 'Too Many Nights',
    canonicalArtist: 'Metro Boomin, Future, Don Toliver',
    studioDurationSec: 199,
  },
  sped_up_195: {
    canonicalTitle: 'Яд',
    canonicalArtist: 'Erika Lundmoen',
    altTitles: ['Yad'],
    studioDurationSec: 191,
  },
  umbrella_speed_up_196: {
    canonicalTitle: 'Umbrella',
    canonicalArtist: 'Rihanna, JAY-Z',
    studioDurationSec: 275,
  },
  love_story_nightcore_fran_ai_198: {
    canonicalTitle: 'Love Story',
    canonicalArtist: 'Indila',
    studioDurationSec: 316,
  },
  superficial_love_sped_up_199: {
    canonicalTitle: 'Superficial Love',
    canonicalArtist: 'Ruth B.',
    studioDurationSec: 208,
  },
  reminder_sped_up_204: {
    canonicalTitle: 'Reminder',
    canonicalArtist: 'The Weeknd',
    studioDurationSec: 218,
  },
  harleys_in_hawaii_nightcore_205: {
    canonicalTitle: 'Harleys In Hawaii',
    canonicalArtist: 'Katy Perry',
    studioDurationSec: 185,
  },
  diamonds_sped_up_reverb_206: {
    canonicalTitle: 'Diamonds',
    canonicalArtist: 'Rihanna',
    studioDurationSec: 225,
  },
  in_the_middle_of_the_night_s_207: {
    canonicalTitle: 'Middle of the Night',
    canonicalArtist: 'Elley Duhé',
    altTitles: ['Middle of the Night Elley Duhe'],
    studioDurationSec: 184,
  },
  mind_games_sped_up_208: {
    canonicalTitle: 'Mind Games',
    canonicalArtist: 'Sickick',
    studioDurationSec: 229,
  },
  often_speed_209: {
    canonicalTitle: 'Often',
    canonicalArtist: 'The Weeknd',
    studioDurationSec: 249,
  },
  greedy_sped_up_it_s_obvious__210: {
    canonicalTitle: 'greedy',
    canonicalArtist: 'Tate McRae',
    studioDurationSec: 131,
  },
  house_of_memories_but_it_hit_248: {
    canonicalTitle: 'House of Memories',
    canonicalArtist: 'Panic! At The Disco',
    studioDurationSec: 208,
  },
  legends_never_die_249: {
    canonicalTitle: 'Legends Never Die',
    canonicalArtist: 'League of Legends, Against The Current',
    studioDurationSec: 235,
  },
  angel_with_a_shotgun_250: {
    canonicalTitle: 'Angel With a Shotgun',
    canonicalArtist: 'The Cab',
    studioDurationSec: 223,
  },
  centuries_female_version_253: {
    canonicalTitle: 'Centuries',
    canonicalArtist: 'Fall Out Boy',
    studioDurationSec: 228,
  },
  all_the_things_she_said_but__258: {
    canonicalTitle: 'All The Things She Said',
    canonicalArtist: 't.A.T.u.',
    studioDurationSec: 214,
  },
  attention_switching_vocals_268: {
    canonicalTitle: 'Attention',
    canonicalArtist: 'Charlie Puth',
    studioDurationSec: 208,
  },
  faded_sped_up_version_269: {
    canonicalTitle: 'Faded',
    canonicalArtist: 'Alan Walker',
    studioDurationSec: 212,
  },
  disturbia_nightcore_270: {
    canonicalTitle: 'Disturbia',
    canonicalArtist: 'Rihanna',
    studioDurationSec: 238,
  },
  come_back_to_me_nightcore_271: {
    canonicalTitle: 'Come Back To Me',
    canonicalArtist: 'Utada Hikaru',
    studioDurationSec: 238,
  },
  in_the_end_female_version_272: {
    canonicalTitle: 'In the End',
    canonicalArtist: 'Linkin Park',
    studioDurationSec: 216,
  },
};

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
  'ren',
  'hiko',
  'sinnon nightcore',
  'rshcxn',
  'scuitsgt',
  'sanny',
  'sphere',
  'elliot sutton',
  'nenadid',
  'drill gates',
  'dj michael double',
  'tommymuzzic',
  'zeddmusique',
  'dj kridung',
  'editkings',
  'verdun remix',
  'exe rohit',
  'lewis hanton',
  'roeinon',
  'bvng',
  'six dior',
  'nightcore fr',
  'cheeky',
  'neko',
  'shiko nightcore',
  'tazzy',
  'pearl',
  'fast forward',
  'the nostal days',
  'nightcore cene',
  'nightcore by halocene',
  'nightcore collectives',
  'kenke',
  'fly by nightcore',
  'mae bloom',
  'seraphina rossi',
  'cherry 葵 nightcore',
  'kawaii nightcore',
  'angelwing',
]);

/**
 * Strips diacritics/accents (`ORCHESTRATË` -> `ORCHESTRATE`, `Džanum` -> `Dzanum`)
 * for resilient fallback matching when LRCLIB indexes ASCII-only titles.
 */
export function stripDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd');
}

/**
 * Cleans any raw track title by removing viral TikTok lyric subtitles, speed/nightcore tags,
 * parenthetical remix/switching-vocals suffixes, and soundtrack tags.
 */
export function cleanSongTitleForLyrics(rawTitle: string): string {
  return rawTitle
    .replace(/\s*\((?:with|feat\.?|ft\.?)[^)]+\)/gi, '')
    .replace(/\s*\[(?:with|feat\.?|ft\.?)[^\]]+\]/gi, '')
    .replace(
      /\s*[-–]\s*(?:sped\s*up|speed\s*up|speed|slowed|nightcore|remix|tiktok.*|female\s*version|frisk\s*version|from\s+.*|but\s+it\s+hits\s+different|hey\s+there.*|just\s+call\s+my\s+name.*|it's\s+obvious.*|drill\s+slowed.*).*$/i,
      ''
    )
    .replace(
      /\s*\((?:sped\s*up|speed\s*up|speed|slowed|nightcore|remix|tik\s*tok.*|female\s*version|frisk\s*version|switching\s*vocals|best\s*part|bass\s*boosted)[^)]*\)/gi,
      ''
    )
    .replace(/\s*\[(?:bass\s*boosted|sped\s*up|nightcore|slowed)[^\]]*\]/gi, '')
    .replace(/\s+drill\s+slowed\s*\+?\s*reverb.*$/i, '')
    .trim();
}

/**
 * Extracts meaningful artist tokens from both the track title `(feat. ...)` / `(with ...)`
 * and the `artistName` string, filtering out generic speed-up/nightcore uploader tags.
 */
export function extractCleanArtistsForLyrics(
  title: string,
  artistName: string,
  trackId?: string
): { realArtists: string[]; allArtists: string[]; canonicalTitle: string } {
  const override = trackId ? CANONICAL_TRACK_METADATA[trackId] : undefined;
  const effectiveTitle = override?.canonicalTitle || cleanSongTitleForLyrics(title);
  const effectiveArtistSource = override?.canonicalArtist
    ? `${override.canonicalArtist}, ${artistName}`
    : artistName;

  const raw: string[] = [];
  if (override?.canonicalArtist) {
    raw.push(...override.canonicalArtist.split(/[,&/•×]/));
  }
  const featMatches = [...title.matchAll(/\((?:with|feat\.?|ft\.?)\s+([^)]+)\)/gi)];
  for (const m of featMatches) {
    if (m[1]) {
      raw.push(...m[1].split(/[,&/•×]/));
    }
  }
  raw.push(...effectiveArtistSource.split(/[,&•×/]/));

  const allArtists: string[] = [];
  for (const item of raw) {
    const cleaned = item
      .replace(/\$/g, 's')
      .replace(/[^\p{L}\p{N}\s.!-]/gu, ' ')
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

  return {
    realArtists: realArtists.length > 0 ? realArtists : allArtists,
    allArtists,
    canonicalTitle: effectiveTitle,
  };
}

/**
 * Resolves the authoritative canonical song identity for display & search.
 */
export function resolveCanonicalSongIdentity(
  trackId: string,
  rawTitle: string,
  rawArtist: string
): {
  canonicalTitle: string;
  asciiTitle: string;
  primaryArtist: string;
  realArtists: string[];
  altTitles: string[];
  studioDurationSec?: number;
  isSpeedModified: 'sped_up' | 'slowed' | 'standard';
} {
  const override = CANONICAL_TRACK_METADATA[trackId];
  const { realArtists, canonicalTitle } = extractCleanArtistsForLyrics(
    rawTitle,
    rawArtist,
    trackId
  );
  const asciiTitle = stripDiacritics(canonicalTitle);
  const primaryArtist =
    override?.canonicalArtist.split(',')[0].trim() || realArtists[0] || rawArtist.split(',')[0].trim();

  const combinedText = `${rawTitle} ${rawArtist}`.toLowerCase();
  const isSpeedModified: 'sped_up' | 'slowed' | 'standard' =
    /\b(sped\s*up|speed\s*up|speed|nightcore)\b/i.test(combinedText)
      ? 'sped_up'
      : /\b(slowed|slow)\b/i.test(combinedText)
      ? 'slowed'
      : 'standard';

  const altTitles: string[] = [...(override?.altTitles || [])];
  if (asciiTitle.toLowerCase() !== canonicalTitle.toLowerCase()) {
    altTitles.push(asciiTitle);
  }
  // If title is a mashup `Song A x Song B`, include `Song A` as an alt title
  if (/\s+x\s+/i.test(canonicalTitle)) {
    const firstPart = canonicalTitle.split(/\s+x\s+/i)[0]?.trim();
    if (firstPart && firstPart.length >= 2 && !altTitles.includes(firstPart)) {
      altTitles.unshift(firstPart);
    }
  }

  return {
    canonicalTitle,
    asciiTitle,
    primaryArtist,
    realArtists,
    altTitles,
    studioDurationSec: override?.studioDurationSec,
    isSpeedModified,
  };
}

function normalizeTokenString(str: string): string {
  return stripDiacritics(str)
    .toLowerCase()
    .replace(/\$/g, 's')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Multi-factor scoring algorithm for LRCLIB candidates:
 * 1. Canonical Title Token Jaccard & Normalized Exact/Prefix Similarity
 * 2. Canonical Recording Artist Verification (prevents wrong-song matches)
 * 3. Synced LRC Timestamp Structural Quality & Vocal Span Density
 * 4. Dual-Mode Direct Duration vs. Tempo-Ratio (Sped-Up / Slowed) Calibration
 */
export function scoreLrcLibCandidate(
  cand: {
    trackName?: string;
    artistName?: string;
    duration?: number;
    syncedLyrics?: string;
    plainLyrics?: string;
  },
  identity: ReturnType<typeof resolveCanonicalSongIdentity>,
  effectiveAudioDurSec?: number
): { score: number; recommendedScale: number } {
  const cTitleRaw = cand.trackName || '';
  const cArtistRaw = cand.artistName || '';
  const cTitleClean = normalizeTokenString(cleanSongTitleForLyrics(cTitleRaw));
  const cTitleFull = normalizeTokenString(cTitleRaw);
  const cArtistNorm = normalizeTokenString(cArtistRaw);

  const targetTitles = [identity.canonicalTitle, ...identity.altTitles].map((t) =>
    normalizeTokenString(t)
  );
  const primaryTargetTitle = targetTitles[0] || '';

  let score = 0;

  // 1. Synced LRC structural density check
  if (cand.syncedLyrics && cand.syncedLyrics.includes('[')) {
    const parsed = parseLrcString(cand.syncedLyrics, 1.0, 9999);
    if (parsed.length >= 22) {
      score += 105;
    } else if (parsed.length >= 12) {
      score += 80;
    } else if (parsed.length >= 5) {
      score += 40;
    } else {
      score -= 60;
    }

    if (parsed.length >= 6) {
      const vocalSpan = parsed[parsed.length - 1].timeSec - parsed[0].timeSec;
      const candDur = cand.duration || 180;
      if (vocalSpan >= Math.min(45, candDur * 0.35)) {
        score += 25;
      } else if (vocalSpan < 15) {
        score -= 45;
      }
    }
  } else if (cand.plainLyrics && cand.plainLyrics.trim().length > 40) {
    score += 15;
  } else {
    return { score: -999, recommendedScale: 1.0 };
  }

  // 2. Title exact / token Jaccard similarity across canonicalTitle + altTitles
  let bestTitleScore = -75;
  for (const tNorm of targetTitles) {
    if (!tNorm) continue;
    if (cTitleClean === tNorm || cTitleFull === tNorm) {
      bestTitleScore = Math.max(bestTitleScore, 110);
    } else if (cTitleClean.startsWith(tNorm) || tNorm.startsWith(cTitleClean)) {
      bestTitleScore = Math.max(bestTitleScore, 80);
    } else if (cTitleFull.includes(tNorm) || tNorm.includes(cTitleClean)) {
      bestTitleScore = Math.max(bestTitleScore, 55);
    }

    const tTokens = tNorm.split(/\s+/).filter((w) => w.length >= 2);
    const cTokens = cTitleClean.split(/\s+/).filter((w) => w.length >= 2);
    if (tTokens.length > 0 && cTokens.length > 0) {
      const tSet = new Set(tTokens);
      const cSet = new Set(cTokens);
      let intersection = 0;
      for (const tok of tSet) {
        if (cSet.has(tok)) intersection++;
      }
      const union = new Set([...tSet, ...cSet]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      if (jaccard >= 0.85) {
        bestTitleScore = Math.max(bestTitleScore, 95);
      } else if (jaccard >= 0.6) {
        bestTitleScore = Math.max(bestTitleScore, 60);
      } else if (intersection === 0) {
        bestTitleScore = Math.min(bestTitleScore, -80);
      }
    }
  }
  score += bestTitleScore;

  // Penalize unwanted instrumental/karaoke/parody/tribute transcripts
  if (
    /\b(instrumental|karaoke|parody|tribute|8-bit|lullaby|piano cover)\b/i.test(
      `${cTitleRaw} ${cArtistRaw}`
    ) &&
    !/instrumental/i.test(primaryTargetTitle)
  ) {
    score -= 120;
  }

  // 3. Canonical Artist Verification
  const knownArtists = identity.realArtists
    .map((a) => normalizeTokenString(a))
    .filter((a) => a.length >= 2);

  if (knownArtists.length > 0) {
    let artistMatched = false;
    for (const aNorm of knownArtists) {
      if (cArtistNorm === aNorm) {
        score += 110;
        artistMatched = true;
        break;
      } else if (cArtistNorm.includes(aNorm) || aNorm.includes(cArtistNorm)) {
        score += 90;
        artistMatched = true;
        break;
      } else {
        const aTokens = aNorm.split(/\s+/).filter((t) => t.length >= 3);
        if (aTokens.length > 0 && aTokens.every((t) => cArtistNorm.includes(t))) {
          score += 75;
          artistMatched = true;
          break;
        }
      }
    }
    if (!artistMatched) {
      // Strong penalty when candidate artist doesn't match the known recording artist
      score -= 85;
    }
  }

  // 4. Dual-Mode Duration & Tempo-Ratio Alignment
  const candDur = cand.duration || 0;
  let recommendedScale = 1.0;

  if (effectiveAudioDurSec && effectiveAudioDurSec >= 45 && candDur >= 45) {
    const directDiff = Math.abs(candDur - effectiveAudioDurSec);
    const tempoRatio = effectiveAudioDurSec / candDur;

    if (directDiff <= 2) {
      score += 130;
      recommendedScale = 1.0;
    } else if (directDiff <= 5) {
      score += 95;
      recommendedScale = 1.0;
    } else if (directDiff <= 10) {
      score += 55;
      recommendedScale = tempoRatio;
    } else if (
      identity.isSpeedModified === 'sped_up' &&
      tempoRatio >= 0.66 &&
      tempoRatio <= 0.92
    ) {
      // Studio LRC matched against a sped-up / nightcore audio track!
      score += 90;
      recommendedScale = tempoRatio;
    } else if (
      identity.isSpeedModified === 'slowed' &&
      tempoRatio >= 1.07 &&
      tempoRatio <= 1.45
    ) {
      // Studio LRC matched against a slowed + reverb audio track!
      score += 90;
      recommendedScale = tempoRatio;
    } else if (tempoRatio >= 0.65 && tempoRatio <= 1.45 && Math.abs(1 - tempoRatio) > 0.035) {
      // Even if title didn't explicitly say sped up, if the playing audio is a tempo edit of the studio track
      if (
        identity.studioDurationSec &&
        Math.abs(candDur - identity.studioDurationSec) <= 8
      ) {
        score += 75;
      } else {
        score += 20;
      }
      recommendedScale = tempoRatio;
    } else if (directDiff > 45) {
      score -= 45;
    }
  } else if (
    identity.studioDurationSec &&
    identity.studioDurationSec >= 60 &&
    candDur >= 60
  ) {
    const diff = Math.abs(candDur - identity.studioDurationSec);
    if (diff <= 4) score += 80;
    else if (diff <= 10) score += 45;
  }

  return { score, recommendedScale };
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

export function clearLyricsCacheForTrack(trackId: string): void {
  for (const key of Array.from(dynamicLyricsCache.keys())) {
    if (key === trackId || key.startsWith(`${trackId}:`)) {
      dynamicLyricsCache.delete(key);
    }
  }
  dynamicLyricsMetaCache.delete(trackId);
}

export function getLastLyricsMatchMeta(trackId: string): LyricsMatchMetadata | undefined {
  return dynamicLyricsMetaCache.get(trackId);
}

function scaleLyricLinesToDuration(
  lines: SyncedLyricLine[],
  targetDurationSec?: number
): { lines: SyncedLyricLine[]; scale: number } {
  if (!lines || lines.length < 2 || !targetDurationSec || targetDurationSec < 45) {
    return { lines, scale: 1.0 };
  }
  const lastLineSec = lines[lines.length - 1].timeSec;
  if (lastLineSec < 30) return { lines, scale: 1.0 };
  const estimatedSourceDur = lastLineSec + 8;
  const ratio = targetDurationSec / estimatedSourceDur;
  if (Math.abs(1 - ratio) > 0.05 && ratio >= 0.55 && ratio <= 1.65) {
    return {
      scale: Math.round(ratio * 1000) / 1000,
      lines: lines.map((l) => ({
        timeSec: Math.min(
          Math.max(0, targetDurationSec - 0.5),
          Math.round(l.timeSec * ratio * 100) / 100
        ),
        text: l.text,
      })),
    };
  }
  return { lines, scale: 1.0 };
}

/**
 * Generates clean song-section subtitle cues when external LRC lyrics are still loading.
 */
export function buildTrackSubtitleFallback(
  track: SongTrackDefinition,
  decodedAudioDurationSec?: number
): SyncedLyricLine[] {
  const cached = dynamicLyricsCache.get(track.id);
  if (cached && cached.length > 0) {
    return cached;
  }

  const coreLines = CORE_SONG_LYRICS[track.id];
  if (coreLines && coreLines.length > 0) {
    return scaleLyricLinesToDuration(
      coreLines,
      decodedAudioDurationSec || track.durationSec
    ).lines;
  }

  const identity = resolveCanonicalSongIdentity(track.id, track.title, track.artistName);
  return [
    {
      timeSec: 0,
      text: `♪ ${identity.canonicalTitle} — ${identity.primaryArtist} ♪`,
    },
    {
      timeSec: 2,
      text: `Resolving studio time-coded LRC lyrics for "${identity.canonicalTitle}"...`,
    },
  ];
}

/**
 * Asynchronously resolves accurate time-synced LRC lyrics for any track using the
 * Multi-Factor Canonical Lyrics Finder Algorithm:
 * - Resolves true canonical recording artist & song title for Nightcore/Sped-Up/Viral tracks.
 * - Scores candidates across title token Jaccard similarity, artist verification, LRC density,
 *   and dual-mode duration/tempo-ratio calibration.
 * - Supports cycling alternate LRC variants (`variantIndex`) when the user wants a different transcript.
 */
export async function fetchSyncedLyricsForTrack(
  track: SongTrackDefinition,
  decodedAudioDurationSec?: number,
  options?: { variantIndex?: number; forceRefresh?: boolean }
): Promise<SyncedLyricLine[]> {
  const variantIndex = options?.variantIndex || 0;
  if (options?.forceRefresh) {
    clearLyricsCacheForTrack(track.id);
  }

  const identity = resolveCanonicalSongIdentity(track.id, track.title, track.artistName);

  // Custom mashup track has bespoke dual-song lyrics on default variant 0
  if (track.id === 'duvet_x_linger' && variantIndex === 0 && CORE_SONG_LYRICS[track.id]) {
    const scaled = scaleLyricLinesToDuration(
      CORE_SONG_LYRICS[track.id],
      decodedAudioDurationSec || track.durationSec
    );
    dynamicLyricsMetaCache.set(track.id, {
      trackId: track.id,
      matchedTrackName: 'Duvet × Linger (Mashup)',
      matchedArtistName: 'bôa × The Cranberries',
      confidencePct: 100,
      timeScale: scaled.scale,
      source: 'core_embedded',
      lineCount: scaled.lines.length,
      variantIndex: 0,
    });
    return scaled.lines;
  }

  const effectiveDurSec =
    decodedAudioDurationSec && decodedAudioDurationSec >= 45
      ? Math.round(decodedAudioDurationSec)
      : track.durationSec && track.durationSec >= 45
      ? Math.round(track.durationSec)
      : undefined;

  const cacheKey = `${track.id}:${effectiveDurSec || 'studio'}:v${variantIndex}`;

  const existing = dynamicLyricsCache.get(cacheKey);
  if (existing && existing.length > 0 && !options?.forceRefresh) {
    return existing;
  }

  const inflight = inflightLyricsRequests.get(cacheKey);
  if (inflight && !options?.forceRefresh) {
    const res = await inflight;
    return res || buildTrackSubtitleFallback(track, effectiveDurSec);
  }

  const requestPromise = (async (): Promise<SyncedLyricLine[] | null> => {
    try {
      const durParam = effectiveDurSec ? `&duration=${effectiveDurSec}` : '';
      const varParam = variantIndex > 0 ? `&variant=${variantIndex}` : '';

      // 1. Try server-side multi-factor accurate lyrics endpoint first
      try {
        const apiRes = await fetch(
          `/api/audio/lyrics?trackId=${encodeURIComponent(
            track.id
          )}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
            track.artistName
          )}${durParam}${varParam}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (apiRes.ok) {
          const data = (await apiRes.json()) as {
            lines?: SyncedLyricLine[];
            matchedTrackName?: string;
            matchedArtistName?: string;
            confidencePct?: number;
            timeScale?: number;
          };
          if (Array.isArray(data.lines) && data.lines.length >= 4) {
            dynamicLyricsCache.set(cacheKey, data.lines);
            dynamicLyricsCache.set(track.id, data.lines);
            dynamicLyricsMetaCache.set(track.id, {
              trackId: track.id,
              matchedTrackName: data.matchedTrackName || identity.canonicalTitle,
              matchedArtistName: data.matchedArtistName || identity.primaryArtist,
              confidencePct: data.confidencePct || 98,
              timeScale: data.timeScale || 1.0,
              source: 'server_lrclib',
              lineCount: data.lines.length,
              variantIndex,
            });
            return data.lines;
          }
        }
      } catch {
        // Fall through to direct client-side multi-factor lrclib resolution
      }

      // 2. Direct client-side multi-query LRCLIB search with canonical scoring
      const searchUrls = Array.from(
        new Set(
          [
            identity.primaryArtist
              ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(
                  identity.canonicalTitle
                )}&artist_name=${encodeURIComponent(identity.primaryArtist)}`
              : '',
            identity.primaryArtist
              ? `https://lrclib.net/api/search?q=${encodeURIComponent(
                  `${identity.canonicalTitle} ${identity.primaryArtist}`
                )}`
              : '',
            identity.asciiTitle !== identity.canonicalTitle && identity.primaryArtist
              ? `https://lrclib.net/api/search?q=${encodeURIComponent(
                  `${identity.asciiTitle} ${identity.primaryArtist}`
                )}`
              : '',
            ...identity.altTitles.map((alt) =>
              identity.primaryArtist
                ? `https://lrclib.net/api/search?q=${encodeURIComponent(
                    `${alt} ${identity.primaryArtist}`
                  )}`
                : `https://lrclib.net/api/search?track_name=${encodeURIComponent(alt)}`
            ),
            `https://lrclib.net/api/search?track_name=${encodeURIComponent(
              identity.canonicalTitle
            )}`,
          ].filter(Boolean)
        )
      );

      type LrcCandidate = {
        trackName?: string;
        artistName?: string;
        duration?: number;
        syncedLyrics?: string;
        plainLyrics?: string;
      };

      const ranked: Array<{
        item: LrcCandidate;
        score: number;
        recommendedScale: number;
      }> = [];
      const seenSigs = new Set<string>();

      for (const url of searchUrls) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
          if (!res.ok) continue;
          const items = (await res.json()) as LrcCandidate[];
          if (!Array.isArray(items) || items.length === 0) continue;

          for (const item of items) {
            if (!item.syncedLyrics && !item.plainLyrics) continue;
            const sig = `${(item.syncedLyrics || item.plainLyrics || '').slice(0, 120)}:${
              item.duration || 0
            }`;
            if (seenSigs.has(sig)) continue;
            seenSigs.add(sig);

            const { score, recommendedScale } = scoreLrcLibCandidate(
              item,
              identity,
              effectiveDurSec
            );
            if (score > -200) {
              ranked.push({ item, score, recommendedScale });
            }
          }

          const topScore = ranked.reduce((m, r) => (r.score > m ? r.score : m), -999);
          if (topScore >= 260 && variantIndex === 0) {
            break;
          }
        } catch {
          // Try next search query
        }
      }

      if (ranked.length > 0) {
        ranked.sort((a, b) => b.score - a.score);
        const chosenEntry = ranked[Math.max(0, variantIndex) % ranked.length];
        const chosen = chosenEntry.item;
        const scale = chosenEntry.recommendedScale;

        if (chosen.syncedLyrics && chosen.syncedLyrics.includes('[')) {
          const parsed = parseLrcString(
            chosen.syncedLyrics,
            scale,
            (effectiveDurSec || 600) + 15
          );
          if (parsed.length >= 4) {
            const conf = Math.min(99, Math.max(72, Math.round(70 + chosenEntry.score / 10)));
            dynamicLyricsCache.set(cacheKey, parsed);
            dynamicLyricsCache.set(track.id, parsed);
            dynamicLyricsMetaCache.set(track.id, {
              trackId: track.id,
              matchedTrackName: chosen.trackName || identity.canonicalTitle,
              matchedArtistName: chosen.artistName || identity.primaryArtist,
              confidencePct: conf,
              timeScale: Math.round(scale * 1000) / 1000,
              source: 'client_lrclib',
              lineCount: parsed.length,
              variantIndex,
            });
            return parsed;
          }
        }
      }

      // 3. Offline fallback to embedded core lyrics (calibrated to effective audio duration)
      const coreFallback = CORE_SONG_LYRICS[track.id];
      if (coreFallback && coreFallback.length > 0) {
        const scaled = scaleLyricLinesToDuration(coreFallback, effectiveDurSec);
        dynamicLyricsCache.set(cacheKey, scaled.lines);
        dynamicLyricsCache.set(track.id, scaled.lines);
        dynamicLyricsMetaCache.set(track.id, {
          trackId: track.id,
          matchedTrackName: identity.canonicalTitle,
          matchedArtistName: identity.primaryArtist,
          confidencePct: 95,
          timeScale: scaled.scale,
          source: 'core_embedded',
          lineCount: scaled.lines.length,
          variantIndex,
        });
        return scaled.lines;
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
  return resolved || buildTrackSubtitleFallback(track, effectiveDurSec);
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
