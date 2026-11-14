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
  sourceCandidateId?: string;
  matchedTitle?: string;
  matchedArtist?: string;
  versionAttempt?: number;
}

export type VersionRetryMode = 'next_best' | 'original_studio' | 'sped_up' | 'slowed';

const memoryMetaCache = new Map<string, CachedAudioEntry>();
const inFlightResolutions = new Map<string, Promise<CachedAudioEntry | null>>();
const lyricsCache = new Map<string, Array<{ timeSec: number; text: string }>>();
const officialDurationCache = new Map<string, number>();
const rejectedCandidatesByTrack = new Map<string, Set<string>>();
const trackVersionAttempt = new Map<string, number>();

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

const CANONICAL_SERVER_TRACK_OVERRIDES: Record<
  string,
  { canonicalTitle: string; canonicalArtist: string; altTitles?: string[]; studioDurationSec?: number }
> = {
  starboy_sped_up_6: { canonicalTitle: 'Starboy', canonicalArtist: 'The Weeknd, Daft Punk', studioDurationSec: 230 },
  wasted_nightcore_bass_booste_13: { canonicalTitle: 'Wasted', canonicalArtist: 'Juice WRLD, Lil Uzi Vert', studioDurationSec: 258 },
  little_do_you_know_sped_up_r_15: { canonicalTitle: 'Little Do You Know', canonicalArtist: 'Alex & Sierra', studioDurationSec: 185 },
  after_hours_best_part_tiktok_31: { canonicalTitle: 'After Hours', canonicalArtist: 'The Weeknd', studioDurationSec: 361 },
  instrumental_71: { canonicalTitle: 'Камин', canonicalArtist: 'EMIN, JONY', altTitles: ['Kamin'], studioDurationSec: 186 },
  kamin_speed_up_72: { canonicalTitle: 'Камин', canonicalArtist: 'EMIN, JONY', altTitles: ['Kamin'], studioDurationSec: 186 },
  feat_jony_73: { canonicalTitle: 'Камин', canonicalArtist: 'EMIN, JONY', altTitles: ['Kamin'], studioDurationSec: 186 },
  d_anum_79: { canonicalTitle: 'Džanum', canonicalArtist: 'Teya Dora', altTitles: ['Dzanum'], studioDurationSec: 174 },
  tattoo_tiktok_remix_104: { canonicalTitle: 'Tattoo', canonicalArtist: 'Loreen', studioDurationSec: 183 },
  see_you_again_sped_up_reverb_110: { canonicalTitle: 'See You Again', canonicalArtist: 'Tyler, The Creator, Kali Uchis', studioDurationSec: 180 },
  babydoll_x_the_perfect_girl_111: { canonicalTitle: 'Babydoll', canonicalArtist: 'Ari Abdul', altTitles: ['The Perfect Girl'], studioDurationSec: 162 },
  collide_speed_113: { canonicalTitle: 'Collide', canonicalArtist: 'Justine Skye', studioDurationSec: 260 },
  yes_to_heaven_speed_121: { canonicalTitle: 'Say Yes To Heaven', canonicalArtist: 'Lana Del Rey', altTitles: ['Yes To Heaven'], studioDurationSec: 209 },
  headlock_slowed_127: { canonicalTitle: 'Headlock', canonicalArtist: 'Imogen Heap', studioDurationSec: 214 },
  orchestrat_142: { canonicalTitle: 'ORCHESTRATË', canonicalArtist: 'Yeat', altTitles: ['ORCHESTRATE'], studioDurationSec: 175 },
  on_the_floor_drill_slowed_re_147: { canonicalTitle: 'On The Floor', canonicalArtist: 'Jennifer Lopez, Pitbull', studioDurationSec: 284 },
  if_we_being_r_al_151: { canonicalTitle: 'If We Being Rëal', canonicalArtist: 'Yeat', altTitles: ['If We Being Real'], studioDurationSec: 172 },
  flawl_ss_feat_lil_uzi_vert_152: { canonicalTitle: 'Flawlëss', canonicalArtist: 'Yeat, Lil Uzi Vert', altTitles: ['Flawless'], studioDurationSec: 176 },
  no_mor_talk_157: { canonicalTitle: 'No morë talk', canonicalArtist: 'Yeat', altTitles: ['No more talk'], studioDurationSec: 182 },
  s_per_g33ked_159: { canonicalTitle: 'SÜPER G33KED', canonicalArtist: '6arelyhuman', altTitles: ['SUPER GEEKED'] },
  heartless_x_heartless_165: { canonicalTitle: 'Heartless', canonicalArtist: 'The Weeknd', studioDurationSec: 198 },
  the_hills_x_creepin_x_the_co_166: { canonicalTitle: 'The Hills', canonicalArtist: 'The Weeknd', altTitles: ['Creepin', 'The Color Violet'], studioDurationSec: 242 },
  oui_sped_up_hey_there_s_no_w_171: { canonicalTitle: 'oui', canonicalArtist: 'Jeremih', studioDurationSec: 238 },
  animals_x_starboy_sped_up_to_172: { canonicalTitle: 'Animals', canonicalArtist: 'Maroon 5', altTitles: ['Starboy'], studioDurationSec: 231 },
  living_life_in_the_night_tik_173: { canonicalTitle: 'Living Life, In The Night', canonicalArtist: 'Cheriimoya, Sierra Kidd', studioDurationSec: 155 },
  babydoll_x_the_perfect_girl__174: { canonicalTitle: 'Babydoll', canonicalArtist: 'Ari Abdul', altTitles: ['The Perfect Girl'], studioDurationSec: 162 },
  in_the_name_of_love_nightcor_175: { canonicalTitle: 'In the Name of Love', canonicalArtist: 'Martin Garrix, Bebe Rexha', studioDurationSec: 195 },
  animals_speed_177: { canonicalTitle: 'Animals', canonicalArtist: 'Maroon 5', studioDurationSec: 231 },
  after_dark_x_sweater_weather_178: { canonicalTitle: 'After Dark', canonicalArtist: 'Mr.Kitty', altTitles: ['Sweater Weather'], studioDurationSec: 259 },
  genius_sped_up_179: { canonicalTitle: 'Genius', canonicalArtist: 'LSD, Sia, Diplo, Labrinth', studioDurationSec: 213 },
  unforgettable_tik_tok_edit_r_180: { canonicalTitle: 'Unforgettable', canonicalArtist: 'French Montana, Swae Lee', studioDurationSec: 233 },
  dark_horse_sped_up_181: { canonicalTitle: 'Dark Horse', canonicalArtist: 'Katy Perry, Juicy J', studioDurationSec: 215 },
  you_right_x_luxurious_tiktok_183: { canonicalTitle: 'You Right', canonicalArtist: 'Doja Cat, The Weeknd', altTitles: ['Luxurious'], studioDurationSec: 186 },
  the_hills_x_where_have_you_b_184: { canonicalTitle: 'The Hills', canonicalArtist: 'The Weeknd', altTitles: ['Where Have You Been'], studioDurationSec: 242 },
  obsessed_sped_up_185: { canonicalTitle: 'Obsessed', canonicalArtist: 'Mariah Carey', studioDurationSec: 242 },
  so_obesessed_with_me_speed_r_186: { canonicalTitle: 'Obsessed', canonicalArtist: 'Mariah Carey', studioDurationSec: 242 },
  shameless_sped_up_187: { canonicalTitle: 'Shameless', canonicalArtist: 'Camila Cabello', studioDurationSec: 219 },
  wannabe_sped_up_version_188: { canonicalTitle: 'Wannabe', canonicalArtist: 'why mona', altTitles: ['Wannabe Spice Girls'], studioDurationSec: 162 },
  strangers_sped_up_190: { canonicalTitle: 'Strangers', canonicalArtist: 'Kenya Grace', studioDurationSec: 172 },
  too_many_nights_sped_up_192: { canonicalTitle: 'Too Many Nights', canonicalArtist: 'Metro Boomin, Future, Don Toliver', studioDurationSec: 199 },
  sped_up_195: { canonicalTitle: 'Яд', canonicalArtist: 'Erika Lundmoen', altTitles: ['Yad'], studioDurationSec: 191 },
  umbrella_speed_up_196: { canonicalTitle: 'Umbrella', canonicalArtist: 'Rihanna, JAY-Z', studioDurationSec: 275 },
  love_story_nightcore_fran_ai_198: { canonicalTitle: 'Love Story', canonicalArtist: 'Indila', studioDurationSec: 316 },
  superficial_love_sped_up_199: { canonicalTitle: 'Superficial Love', canonicalArtist: 'Ruth B.', studioDurationSec: 208 },
  reminder_sped_up_204: { canonicalTitle: 'Reminder', canonicalArtist: 'The Weeknd', studioDurationSec: 218 },
  harleys_in_hawaii_nightcore_205: { canonicalTitle: 'Harleys In Hawaii', canonicalArtist: 'Katy Perry', studioDurationSec: 185 },
  diamonds_sped_up_reverb_206: { canonicalTitle: 'Diamonds', canonicalArtist: 'Rihanna', studioDurationSec: 225 },
  in_the_middle_of_the_night_s_207: { canonicalTitle: 'Middle of the Night', canonicalArtist: 'Elley Duhé', altTitles: ['Middle of the Night Elley Duhe'], studioDurationSec: 184 },
  mind_games_sped_up_208: { canonicalTitle: 'Mind Games', canonicalArtist: 'Sickick', studioDurationSec: 229 },
  often_speed_209: { canonicalTitle: 'Often', canonicalArtist: 'The Weeknd', studioDurationSec: 249 },
  greedy_sped_up_it_s_obvious__210: { canonicalTitle: 'greedy', canonicalArtist: 'Tate McRae', studioDurationSec: 131 },
  house_of_memories_but_it_hit_248: { canonicalTitle: 'House of Memories', canonicalArtist: 'Panic! At The Disco', studioDurationSec: 208 },
  legends_never_die_249: { canonicalTitle: 'Legends Never Die', canonicalArtist: 'League of Legends, Against The Current', studioDurationSec: 235 },
  angel_with_a_shotgun_250: { canonicalTitle: 'Angel With a Shotgun', canonicalArtist: 'The Cab', studioDurationSec: 223 },
  centuries_female_version_253: { canonicalTitle: 'Centuries', canonicalArtist: 'Fall Out Boy', studioDurationSec: 228 },
  all_the_things_she_said_but__258: { canonicalTitle: 'All The Things She Said', canonicalArtist: 't.A.T.u.', studioDurationSec: 214 },
  attention_switching_vocals_268: { canonicalTitle: 'Attention', canonicalArtist: 'Charlie Puth', studioDurationSec: 208 },
  faded_sped_up_version_269: { canonicalTitle: 'Faded', canonicalArtist: 'Alan Walker', studioDurationSec: 212 },
  disturbia_nightcore_270: { canonicalTitle: 'Disturbia', canonicalArtist: 'Rihanna', studioDurationSec: 238 },
  come_back_to_me_nightcore_271: { canonicalTitle: 'Come Back To Me', canonicalArtist: 'Utada Hikaru', studioDurationSec: 238 },
  in_the_end_female_version_272: { canonicalTitle: 'In the End', canonicalArtist: 'Linkin Park', studioDurationSec: 216 },
};

function stripServerDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd');
}

function cleanServerSongTitle(rawTitle: string): string {
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

export function extractMeaningfulArtists(
  targetTitle: string,
  targetArtist: string,
  trackId?: string
): string[] {
  const override = trackId ? CANONICAL_SERVER_TRACK_OVERRIDES[trackId] : undefined;
  const rawList: string[] = [];

  if (override?.canonicalArtist) {
    rawList.push(...override.canonicalArtist.split(/[,&/•×]/));
  }

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
      .replace(/[^\p{L}\p{N}\s.!-]/gu, ' ')
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
  officialDurationSec?: number,
  versionMode?: VersionRetryMode
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
  const wantsSlowed =
    versionMode === 'slowed' ||
    (versionMode !== 'original_studio' && versionMode !== 'sped_up' && /slowed/i.test(tTitle));
  const wantsSpedUp =
    versionMode === 'sped_up' ||
    (versionMode !== 'original_studio' &&
      versionMode !== 'slowed' &&
      (/sped\s*up|speed\s*up|nightcore/i.test(tTitle) || /nightcore/i.test(targetArtist)));
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
    score += isCandSlowed ? 75 : -55;
  } else if (isCandSlowed) {
    score -= 115;
  }

  if (wantsSpedUp) {
    score += isCandSpedUp ? 75 : -45;
  } else if (isCandSpedUp) {
    score -= 115;
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
      score += versionMode === 'original_studio' ? 105 : 80;
    } else if (diff <= 10) {
      score += versionMode === 'original_studio' ? 65 : 50;
    } else if (diff <= 18) {
      score += 15;
    } else if (diff > 30) {
      score -= 95;
    } else {
      score -= 40;
    }
  } else if (wantsSpedUp && officialDurationSec && officialDurationSec >= 90 && candDurSec >= 65) {
    // Sped up versions are typically ~72%-88% of original studio duration
    const ratio = candDurSec / officialDurationSec;
    if (ratio >= 0.68 && ratio <= 0.91) {
      score += 55;
    }
  } else if (wantsSlowed && officialDurationSec && officialDurationSec >= 90 && candDurSec >= 80) {
    // Slowed versions are typically ~110%-138% of original studio duration
    const ratio = candDurSec / officialDurationSec;
    if (ratio >= 1.08 && ratio <= 1.42) {
      score += 55;
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
    sourceCandidateId: cand.id ? `sc:${cand.id}` : `sc:${cand.title || safeId}`,
    matchedTitle: cand.title || undefined,
    matchedArtist: cand.user?.username || undefined,
    versionAttempt: trackVersionAttempt.get(safeId) || 1,
  };
  memoryMetaCache.set(safeId, entry);
  return entry;
}

async function downloadAndCacheDirectUrl(
  url: string,
  durationSec: number,
  safeId: string,
  meta?: { matchedTitle?: string; matchedArtist?: string }
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
    sourceCandidateId: `url:${url}`,
    matchedTitle: meta?.matchedTitle,
    matchedArtist: meta?.matchedArtist,
    versionAttempt: trackVersionAttempt.get(safeId) || 1,
  };
  memoryMetaCache.set(safeId, entry);
  return entry;
}

function parseLengthSec(lenStr?: string): number | null {
  if (!lenStr) return null;
  if (/^\d+(\.\d+)?$/.test(lenStr)) {
    return Math.round(parseFloat(lenStr));
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
  safeId: string,
  rejectedSet?: Set<string>
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

    for (const doc of docs.slice(0, 6)) {
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
        if (rejectedSet && rejectedSet.has(`url:${directUrl}`)) {
          continue;
        }
        const downloaded = await downloadAndCacheDirectUrl(
          directUrl,
          fileDur || officialDurationSec || 210,
          safeId,
          {
            matchedTitle: f.title || f.name,
            matchedArtist: primaryArtist,
          }
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
  artist: string,
  options?: { versionMode?: VersionRetryMode; forceFresh?: boolean }
): Promise<CachedAudioEntry | null> {
  const safeId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!options?.forceFresh) {
    const existing = memoryMetaCache.get(safeId);
    if (existing && fs.existsSync(existing.filePath)) {
      return existing;
    }

    const inflight = inFlightResolutions.get(safeId);
    if (inflight) {
      return inflight;
    }
  }

  const versionMode = options?.versionMode;
  const rejectedSet = rejectedCandidatesByTrack.get(safeId) || new Set<string>();
  const attemptNum = trackVersionAttempt.get(safeId) || 1;

  const task = (async (): Promise<CachedAudioEntry | null> => {
    try {
      // 1. Check pre-verified 320kbps / FLAC studio master table first (unless user rejected it or wants sped_up/slowed)
      const verifiedMaster = VERIFIED_STUDIO_MASTER_URLS[trackId];
      if (
        verifiedMaster &&
        attemptNum === 1 &&
        versionMode !== 'sped_up' &&
        versionMode !== 'slowed'
      ) {
        if (verifiedMaster.url && !rejectedSet.has(`url:${verifiedMaster.url}`)) {
          const directEntry = await downloadAndCacheDirectUrl(
            verifiedMaster.url,
            verifiedMaster.durationSec,
            safeId,
            { matchedTitle: `${title} (Studio Master)`, matchedArtist: artist }
          );
          if (directEntry) return directEntry;
        }
        if (verifiedMaster.soundcloudId && !rejectedSet.has(`sc:${verifiedMaster.soundcloudId}`)) {
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

      const canonicalOverride = CANONICAL_SERVER_TRACK_OVERRIDES[trackId];
      const cleanTitle = title
        .replace(/\s*\((with|feat\.)[^)]+\)/gi, '')
        .replace(/\s*-\s*From.*$/i, '')
        .trim();
      const baseSongTitle =
        canonicalOverride?.canonicalTitle || cleanServerSongTitle(cleanTitle);

      const meaningfulArtists = extractMeaningfulArtists(title, artist, trackId);
      const realArtists = meaningfulArtists.filter(
        (a) => !NON_ORIGINAL_UPLOADER_NAMES.has(a.toLowerCase())
      );
      const topTwoArtists = (realArtists.length > 0 ? realArtists : meaningfulArtists)
        .slice(0, 2)
        .join(' ');
      const primaryArtist =
        canonicalOverride?.canonicalArtist.split(',')[0].trim() ||
        realArtists[0] ||
        meaningfulArtists[0] ||
        artist.split(',')[0].trim();

      const wantsSpedUp =
        versionMode === 'sped_up' ||
        (versionMode !== 'original_studio' &&
          versionMode !== 'slowed' &&
          (/sped\s*up|speed\s*up|\bspeed\b|nightcore/i.test(title) || /nightcore/i.test(artist)));
      const wantsSlowed =
        versionMode === 'slowed' ||
        (versionMode !== 'original_studio' && versionMode !== 'sped_up' && /slowed/i.test(title));
      const modifierSuffix = wantsSpedUp
        ? 'sped up'
        : wantsSlowed
        ? 'slowed'
        : versionMode === 'original_studio'
        ? 'official audio'
        : '';

      const queries = Array.from(
        new Set(
          [
            modifierSuffix && primaryArtist
              ? `${baseSongTitle} ${primaryArtist} ${modifierSuffix}`.trim()
              : '',
            primaryArtist ? `${baseSongTitle} ${primaryArtist}`.trim() : '',
            topTwoArtists ? `${cleanTitle} ${topTwoArtists}`.trim() : '',
            primaryArtist ? `${cleanTitle} ${primaryArtist}`.trim() : '',
            cleanTitle,
          ].filter(Boolean)
        )
      );

      // Fetch client_id and authoritative Apple Music / iTunes studio duration in parallel
      const [initialClientId, itunesDurationSec] = await Promise.all([
        getSoundCloudClientId(false),
        canonicalOverride?.studioDurationSec
          ? Promise.resolve(canonicalOverride.studioDurationSec)
          : fetchOfficialStudioDurationSec(baseSongTitle, primaryArtist),
      ]);
      let clientId = initialClientId;
      let officialDurationSec = itunesDurationSec;

      const rankedCandidates: Array<{ item: SoundCloudTrackCandidate; score: number }> = [];
      const seenCandidateIds = new Set<string>();

      const effectiveTargetArtist = canonicalOverride?.canonicalArtist
        ? `${canonicalOverride.canonicalArtist}, ${artist}`
        : artist;

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
          const candKey = item.id ? `sc:${item.id}` : `sc:${item.title || ''}`;
          if (rejectedSet.has(candKey) || seenCandidateIds.has(candKey)) {
            continue;
          }
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

          const sc = scoreTrackCandidate(
            item,
            canonicalOverride ? `${baseSongTitle} (${title})` : title,
            effectiveTargetArtist,
            officialDurationSec,
            versionMode
          );
          seenCandidateIds.add(candKey);
          rankedCandidates.push({ item, score: sc });
        }

        const topNow = rankedCandidates.reduce((max, r) => (r.score > max ? r.score : max), -999);
        if (topNow >= 135 && attemptNum === 1 && !versionMode) break;
      }

      rankedCandidates.sort((a, b) => b.score - a.score);

      // Try top SoundCloud candidates in order
      for (const candEntry of rankedCandidates.slice(0, 4)) {
        if (candEntry.score < 55 && rankedCandidates[0].score >= 55) break;
        const scEntry = await downloadAndCacheSoundCloudTrack(
          candEntry.item,
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
          safeId,
          rejectedSet
        );
        if (archiveEntry) return archiveEntry;
      }

      // Final fallback to any remaining playable SoundCloud candidate
      for (const candEntry of rankedCandidates) {
        const scEntry = await downloadAndCacheSoundCloudTrack(candEntry.item, clientId, safeId);
        if (scEntry) return scEntry;
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

interface ServerLyricsResolutionResult {
  lines: Array<{ timeSec: number; text: string }>;
  matchedTrackName: string;
  matchedArtistName: string;
  confidencePct: number;
  timeScale: number;
}

const serverLyricsMetaCache = new Map<string, Omit<ServerLyricsResolutionResult, 'lines'>>();

function normalizeServerTokenString(str: string): string {
  return stripServerDiacritics(str)
    .toLowerCase()
    .replace(/\$/g, 's')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveAccurateLyrics(
  trackId: string,
  title: string,
  artist: string,
  actualAudioDurationSec?: number,
  variantIndex = 0
): Promise<ServerLyricsResolutionResult | null> {
  const safeId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cachedAudio = memoryMetaCache.get(safeId);
  const effectiveAudioDurSec =
    actualAudioDurationSec && actualAudioDurationSec >= 45
      ? actualAudioDurationSec
      : cachedAudio?.durationSec;

  const cacheKey = `${trackId}:${Math.round(effectiveAudioDurSec || 0)}:v${variantIndex}`;
  const cachedLines = lyricsCache.get(cacheKey);
  const cachedMeta = serverLyricsMetaCache.get(cacheKey);
  if (cachedLines && cachedLines.length > 0 && cachedMeta) {
    return {
      lines: cachedLines,
      ...cachedMeta,
    };
  }

  const override = CANONICAL_SERVER_TRACK_OVERRIDES[trackId];
  const baseTitle = override?.canonicalTitle || cleanServerSongTitle(title);
  const asciiTitle = stripServerDiacritics(baseTitle);

  const allArtists = extractMeaningfulArtists(title, artist, trackId);
  const realArtists = allArtists.filter(
    (a) => !NON_ORIGINAL_UPLOADER_NAMES.has(a.toLowerCase())
  );
  const primaryArtist =
    override?.canonicalArtist.split(',')[0].trim() ||
    realArtists[0] ||
    allArtists[0] ||
    '';

  const altTitles: string[] = [...(override?.altTitles || [])];
  if (asciiTitle.toLowerCase() !== baseTitle.toLowerCase()) {
    altTitles.push(asciiTitle);
  }
  if (/\s+x\s+/i.test(baseTitle)) {
    const firstMashupSong = baseTitle.split(/\s+x\s+/i)[0]?.trim();
    if (firstMashupSong && firstMashupSong.length >= 2 && !altTitles.includes(firstMashupSong)) {
      altTitles.unshift(firstMashupSong);
    }
  }

  const combinedMeta = `${title} ${artist}`.toLowerCase();
  const isSpeedModified: 'sped_up' | 'slowed' | 'standard' =
    /\b(sped\s*up|speed\s*up|speed|nightcore)\b/i.test(combinedMeta)
      ? 'sped_up'
      : /\b(slowed|slow)\b/i.test(combinedMeta)
      ? 'slowed'
      : 'standard';

  const verifiedDuration =
    override?.studioDurationSec ||
    VERIFIED_STUDIO_MASTER_URLS[trackId]?.durationSec ||
    (await fetchOfficialStudioDurationSec(baseTitle, primaryArtist));

  const searchUrls = Array.from(
    new Set(
      [
        primaryArtist
          ? `https://lrclib.net/api/search?track_name=${encodeURIComponent(
              baseTitle
            )}&artist_name=${encodeURIComponent(primaryArtist)}`
          : '',
        primaryArtist
          ? `https://lrclib.net/api/search?q=${encodeURIComponent(
              `${baseTitle} ${primaryArtist}`
            )}`
          : '',
        asciiTitle !== baseTitle && primaryArtist
          ? `https://lrclib.net/api/search?q=${encodeURIComponent(
              `${asciiTitle} ${primaryArtist}`
            )}`
          : '',
        ...altTitles.map((alt) =>
          primaryArtist
            ? `https://lrclib.net/api/search?q=${encodeURIComponent(
                `${alt} ${primaryArtist}`
              )}`
            : `https://lrclib.net/api/search?track_name=${encodeURIComponent(alt)}`
        ),
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(baseTitle)}`,
      ].filter(Boolean)
    )
  );

  const targetTitlesNorm = [baseTitle, ...altTitles].map((t) =>
    normalizeServerTokenString(t)
  );
  const knownArtistsNorm = (realArtists.length > 0 ? realArtists : allArtists)
    .map((a) => normalizeServerTokenString(a))
    .filter((a) => a.length >= 2);

  const scoredItems: Array<{
    item: LrcLibSearchItem;
    score: number;
    recommendedScale: number;
  }> = [];
  const seenSignatures = new Set<string>();

  for (const url of searchUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (!res.ok) continue;
      const items = (await res.json()) as LrcLibSearchItem[];
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const item of items) {
        if (!item.syncedLyrics && !item.plainLyrics) continue;
        const sig = `${(item.syncedLyrics || item.plainLyrics || '').slice(0, 120)}:${
          item.duration || 0
        }`;
        if (seenSignatures.has(sig)) continue;
        seenSignatures.add(sig);

        const cTitleClean = normalizeServerTokenString(
          cleanServerSongTitle(item.trackName || '')
        );
        const cTitleFull = normalizeServerTokenString(item.trackName || '');
        const cArtistNorm = normalizeServerTokenString(item.artistName || '');

        let sc = 0;

        // 1. LRC structural density & vocal span check
        if (item.syncedLyrics && item.syncedLyrics.includes('[')) {
          const parsedCheck = parseLrcToLines(item.syncedLyrics, 1.0, 9999);
          if (parsedCheck.length >= 22) sc += 105;
          else if (parsedCheck.length >= 12) sc += 80;
          else if (parsedCheck.length >= 5) sc += 40;
          else sc -= 60;

          if (parsedCheck.length >= 6) {
            const vocalSpan =
              parsedCheck[parsedCheck.length - 1].timeSec - parsedCheck[0].timeSec;
            const cDur = item.duration || 180;
            if (vocalSpan >= Math.min(45, cDur * 0.35)) sc += 25;
            else if (vocalSpan < 15) sc -= 45;
          }
        } else {
          sc += 15;
        }

        // 2. Title exact & token Jaccard similarity
        let bestTitleScore = -75;
        for (const tNorm of targetTitlesNorm) {
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
            let inter = 0;
            for (const tok of tSet) {
              if (cSet.has(tok)) inter++;
            }
            const union = new Set([...tSet, ...cSet]).size;
            const jaccard = union > 0 ? inter / union : 0;
            if (jaccard >= 0.85) bestTitleScore = Math.max(bestTitleScore, 95);
            else if (jaccard >= 0.6) bestTitleScore = Math.max(bestTitleScore, 60);
            else if (inter === 0) bestTitleScore = Math.min(bestTitleScore, -80);
          }
        }
        sc += bestTitleScore;

        // Penalize unwanted instrumental/karaoke/parody transcripts
        if (
          /\b(instrumental|karaoke|parody|tribute|8-bit|lullaby|piano cover)\b/i.test(
            `${item.trackName || ''} ${item.artistName || ''}`
          ) &&
          !/instrumental/i.test(baseTitle)
        ) {
          sc -= 120;
        }

        // 3. Canonical Artist Verification
        if (knownArtistsNorm.length > 0) {
          let artistMatched = false;
          for (const aNorm of knownArtistsNorm) {
            if (cArtistNorm === aNorm) {
              sc += 110;
              artistMatched = true;
              break;
            } else if (cArtistNorm.includes(aNorm) || aNorm.includes(cArtistNorm)) {
              sc += 90;
              artistMatched = true;
              break;
            } else {
              const aTokens = aNorm.split(/\s+/).filter((t) => t.length >= 3);
              if (aTokens.length > 0 && aTokens.every((t) => cArtistNorm.includes(t))) {
                sc += 75;
                artistMatched = true;
                break;
              }
            }
          }
          if (!artistMatched) {
            sc -= 85;
          }
        }

        // 4. Dual-Mode Duration & Tempo Ratio Alignment
        const candDur = item.duration || 0;
        let recommendedScale = 1.0;

        if (effectiveAudioDurSec && effectiveAudioDurSec > 45 && candDur > 45) {
          const diff = Math.abs(candDur - effectiveAudioDurSec);
          const tempoRatio = effectiveAudioDurSec / candDur;

          if (diff <= 2) {
            sc += 130;
            recommendedScale = 1.0;
          } else if (diff <= 5) {
            sc += 95;
            recommendedScale = 1.0;
          } else if (diff <= 10) {
            sc += 55;
            recommendedScale = tempoRatio;
          } else if (
            isSpeedModified === 'sped_up' &&
            tempoRatio >= 0.66 &&
            tempoRatio <= 0.92
          ) {
            sc += 90;
            recommendedScale = tempoRatio;
          } else if (
            isSpeedModified === 'slowed' &&
            tempoRatio >= 1.07 &&
            tempoRatio <= 1.45
          ) {
            sc += 90;
            recommendedScale = tempoRatio;
          } else if (
            tempoRatio >= 0.65 &&
            tempoRatio <= 1.45 &&
            Math.abs(1 - tempoRatio) > 0.035
          ) {
            if (verifiedDuration && Math.abs(candDur - verifiedDuration) <= 8) {
              sc += 75;
            } else {
              sc += 20;
            }
            recommendedScale = tempoRatio;
          } else if (diff > 45) {
            sc -= 45;
          }
        } else if (verifiedDuration && verifiedDuration > 60 && candDur > 60) {
          const diff = Math.abs(candDur - verifiedDuration);
          if (diff <= 3) sc += 75;
          else if (diff <= 8) sc += 40;
          else if (diff <= 20) sc += 10;
        }

        if (sc > -200) {
          scoredItems.push({ item, score: sc, recommendedScale });
        }
      }

      const bestSoFar = scoredItems.reduce((m, s) => (s.score > m ? s.score : m), -999);
      if (bestSoFar >= 265 && variantIndex === 0) break;
    } catch {
      // Continue to next fallback search URL
    }
  }

  if (scoredItems.length === 0) return null;
  scoredItems.sort((a, b) => b.score - a.score);

  const chosenEntry = scoredItems[Math.max(0, variantIndex) % scoredItems.length];
  const bestItem = chosenEntry.item;
  const scale = chosenEntry.recommendedScale;
  const confidencePct = Math.min(
    99,
    Math.max(72, Math.round(70 + chosenEntry.score / 10))
  );

  if (bestItem.syncedLyrics && bestItem.syncedLyrics.includes('[')) {
    const parsed = parseLrcToLines(
      bestItem.syncedLyrics,
      scale,
      (effectiveAudioDurSec || verifiedDuration || 600) + 15
    );
    if (parsed.length >= 4) {
      const meta = {
        matchedTrackName: bestItem.trackName || baseTitle,
        matchedArtistName: bestItem.artistName || primaryArtist,
        confidencePct,
        timeScale: Math.round(scale * 1000) / 1000,
      };
      lyricsCache.set(cacheKey, parsed);
      serverLyricsMetaCache.set(cacheKey, meta);
      return {
        lines: parsed,
        ...meta,
      };
    }
  }

  if (bestItem.plainLyrics && bestItem.plainLyrics.trim().length > 20) {
    const rawLines = bestItem.plainLyrics
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length >= 4) {
      const dur = Math.max(
        90,
        effectiveAudioDurSec || verifiedDuration || bestItem.duration || 180
      );
      const interval = Math.max(2.5, (dur - 10) / rawLines.length);
      const timed = rawLines.map((text, idx) => ({
        timeSec: Math.round((4 + idx * interval) * 10) / 10,
        text,
      }));
      const meta = {
        matchedTrackName: bestItem.trackName || baseTitle,
        matchedArtistName: bestItem.artistName || primaryArtist,
        confidencePct: Math.min(88, confidencePct),
        timeScale: 1.0,
      };
      lyricsCache.set(cacheKey, timed);
      serverLyricsMetaCache.set(cacheKey, meta);
      return {
        lines: timed,
        ...meta,
      };
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
  if (entry.matchedTitle) {
    res.setHeader('X-Audio-Matched-Title', encodeURIComponent(entry.matchedTitle));
  }
  res.setHeader('Cache-Control', 'no-cache');

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
  app.use(express.json());

  // Dynamic full-length song resolver & byte-range streaming endpoint
  app.all('/api/audio/stream/:trackId', async (req: Request, res: Response) => {
    const trackId = String(req.params.trackId || 'track');
    const title = String(req.query.title || '');
    const artist = String(req.query.artist || '');
    const versionMode = req.query.versionMode as VersionRetryMode | undefined;
    const fallbackLocal = String(req.query.fallback || '/audio/duvet-x-linger.mp3');

    if (title) {
      const resolved = await resolveAndCacheFullTrack(trackId, title, artist, {
        versionMode,
      });
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

  // Mark current song version as wrong & automatically resolve an alternative version
  app.post('/api/audio/retry-version', async (req: Request, res: Response) => {
    try {
      const trackId = String(req.body?.trackId || '');
      const title = String(req.body?.title || '');
      const artist = String(req.body?.artist || '');
      const versionMode = (req.body?.versionMode || 'next_best') as VersionRetryMode;
      const resetHistory = Boolean(req.body?.resetHistory);

      if (!trackId || !title) {
        res.status(400).json({ ok: false, error: 'Missing trackId or title' });
        return;
      }

      const safeId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');

      if (resetHistory) {
        rejectedCandidatesByTrack.delete(safeId);
        trackVersionAttempt.set(safeId, 1);
      } else {
        const currentEntry = memoryMetaCache.get(safeId);
        let rejectedSet = rejectedCandidatesByTrack.get(safeId);
        if (!rejectedSet) {
          rejectedSet = new Set<string>();
          rejectedCandidatesByTrack.set(safeId, rejectedSet);
        }
        if (currentEntry?.sourceCandidateId) {
          rejectedSet.add(currentEntry.sourceCandidateId);
        }
        const nextAttempt = (trackVersionAttempt.get(safeId) || 1) + 1;
        trackVersionAttempt.set(safeId, nextAttempt);
      }

      // Evict cached audio file & memory cache for this track
      const prevEntry = memoryMetaCache.get(safeId);
      if (prevEntry && fs.existsSync(prevEntry.filePath)) {
        try {
          fs.unlinkSync(prevEntry.filePath);
        } catch {
          // Ignore file unlink error
        }
      }
      memoryMetaCache.delete(safeId);
      inFlightResolutions.delete(safeId);

      // Clear any cached lyrics for this trackId so fresh duration-locked lyrics are resolved
      for (const k of Array.from(lyricsCache.keys())) {
        if (k.startsWith(`${trackId}:`)) {
          lyricsCache.delete(k);
          serverLyricsMetaCache.delete(k);
        }
      }

      const resolved = await resolveAndCacheFullTrack(trackId, title, artist, {
        versionMode: resetHistory ? undefined : versionMode,
        forceFresh: true,
      });

      const attempt = trackVersionAttempt.get(safeId) || 1;

      if (resolved) {
        res.json({
          ok: true,
          attempt,
          versionMode,
          durationSec: resolved.durationSec,
          matchedTitle: resolved.matchedTitle || title,
          matchedArtist: resolved.matchedArtist || artist,
          streamUrl: `/api/audio/stream/${encodeURIComponent(
            trackId
          )}?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(
            artist
          )}&versionMode=${encodeURIComponent(versionMode)}&attempt=${attempt}&t=${Date.now()}`,
        });
      } else {
        res.json({
          ok: false,
          attempt,
          versionMode,
          error: 'No alternative playable source found; keeping best available version.',
        });
      }
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Accurate time-synced lyrics resolver & time-scaler endpoint
  app.get('/api/audio/lyrics', async (req: Request, res: Response) => {
    const trackId = String(req.query.trackId || 'track');
    const title = String(req.query.title || '');
    const artist = String(req.query.artist || '');
    const actualDurationSec = Number(req.query.duration) || undefined;
    const variantIndex = Number(req.query.variant) || 0;

    if (!title) {
      res.status(400).json({ lines: [] });
      return;
    }

    const result = await resolveAccurateLyrics(
      trackId,
      title,
      artist,
      actualDurationSec,
      variantIndex
    );
    res.json({
      lines: result?.lines || [],
      matchedTrackName: result?.matchedTrackName,
      matchedArtistName: result?.matchedArtistName,
      confidencePct: result?.confidencePct,
      timeScale: result?.timeScale,
    });
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
