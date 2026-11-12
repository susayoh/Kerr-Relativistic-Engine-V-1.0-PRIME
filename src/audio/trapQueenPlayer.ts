// Singleton audio controller for the SettingsModal 'Songs' tab Hi-Fi Studio Deck:
// Supports 9 full-length songs (48 kHz / High-Bitrate Remastered) with real-time Web Audio API
// 3-band parametric mastering EQ, studio dynamics compressor, live 16-band spectrum analyzer,
// and continuous playback speed control (0.50x to 2.00x).

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
    id: 'hires_studio',
    label: 'Hi-Res Studio Master',
    shortTag: '24-Bit / 48kHz DSP',
    description: 'Balanced sub-bass warmth (+3.5 dB), vocal presence (+1.5 dB), and 10 kHz harmonic air (+4.0 dB).',
    bassDb: 3.5,
    midDb: 1.5,
    trebleDb: 4.0,
    bitrateDisplay: '320 kbps · 48.0 kHz · 24-Bit DSP',
  },
  {
    id: 'bass_boost',
    label: '808 Sub-Harmonic Boost',
    shortTag: '808 Overdrive',
    description: 'Deep 85 Hz low-shelf punch (+7.0 dB) with soft-knee studio limiting for hip-hop & bass tracks.',
    bassDb: 7.0,
    midDb: 0.5,
    trebleDb: 2.5,
    bitrateDisplay: '320 kbps · 48.0 kHz · 808 Sub',
  },
  {
    id: 'nightcore_crystal',
    label: 'Crystal Air & Transients',
    shortTag: 'High-Definition Air',
    description: 'Enhanced upper-mid definition (+2.5 dB) and crisp 10 kHz sparkle (+5.5 dB) for Nightcore & vocals.',
    bassDb: 2.0,
    midDb: 2.5,
    trebleDb: 5.5,
    bitrateDisplay: '320 kbps · 48.0 kHz · Crystal EQ',
  },
  {
    id: 'flat_reference',
    label: 'Flat Reference Monitor',
    shortTag: '0.0 dB Direct',
    description: 'Uncolored studio reference response with transparent peak protection.',
    bassDb: 0.0,
    midDb: 0.0,
    trebleDb: 0.0,
    bitrateDisplay: '192 kbps · 48.0 kHz · Direct',
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
    durationSec: 167,
    durationLabel: '2:47',
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
    artistName: 'Female Version • CADMIUM ft. Rosendale',
    badge: 'Female Version',
    durationSec: 226,
    durationLabel: '3:46',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/36ea7a8f01b1af0000f04348bc71b102/500x500-000000-80-0-0.jpg',
    accentColor: 'cyan',
    sources: [
      '/audio/no-friends-female.mp3',
      'https://archive.org/download/cadmium-no-friendsfeat.-rosendale/CADMIUM%2B-%2BNo%2BFriends%2B%28feat.%2BRosendale%29.mp3',
    ],
    bpm: 145,
    audioQualityBadge: '48kHz Hi-Res',
    genreTag: 'Electronic / Alt',
  },
  {
    id: 'duvet_x_linger',
    title: 'Duvet x Linger',
    subtitle: 'Bôa × The Cranberries',
    artistName: 'Bôa × The Cranberries',
    badge: 'Mashup',
    durationSec: 202,
    durationLabel: '3:22',
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
    artistName: 'Frisk version • Undertale',
    badge: 'Frisk version',
    durationSec: 237,
    durationLabel: '3:57',
    artworkUrl:
      'https://cdn-images.dzcdn.net/images/cover/4c059a18bb7fd25748f77a8eaecb0948/500x500-000000-80-0-0.jpg',
    accentColor: 'emerald',
    sources: ['/audio/stronger-than-you-frisk.mp3'],
    bpm: 130,
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
    durationSec: 144,
    durationLabel: '2:24',
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
}

type Listener = (state: TrapQueenPlayerState) => void;

class SongPlayerController {
  private audio: HTMLAudioElement | null = null;
  private sourceIndex = 0;
  private catalog: SongTrackDefinition[] = SONG_TRACKS;

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
    preservesPitch: false,
    currentTime: 0,
    duration: SONG_TRACKS[0].durationSec,
    volume: 0.9,
    trackTitle: SONG_TRACKS[0].title,
    artistName: SONG_TRACKS[0].artistName,
    badge: SONG_TRACKS[0].badge,
    artworkUrl: SONG_TRACKS[0].artworkUrl,
    qualityPreset: 'hires_studio',
    loopTrack: true,
    bassDb: AUDIO_QUALITY_PRESETS[0].bassDb,
    midDb: AUDIO_QUALITY_PRESETS[0].midDb,
    trebleDb: AUDIO_QUALITY_PRESETS[0].trebleDb,
    bitrateDisplay: AUDIO_QUALITY_PRESETS[0].bitrateDisplay,
    error: null,
  };

  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  public setCatalog(tracks: SongTrackDefinition[]): void {
    if (Array.isArray(tracks) && tracks.length > 0) {
      this.catalog = tracks;
    }
  }

  private getActiveTrackDef(): SongTrackDefinition {
    return this.catalog.find((t) => t.id === this.state.trackId) || this.catalog[0];
  }

  private ensureWebAudioMasteringGraph(): void {
    if (typeof window === 'undefined' || !this.audio || this.audioCtx) return;
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

      // 4. Studio Mastering Dynamics Compressor / Limiter
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 3.2;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;

      // 5. Real-Time Spectrum Analyser (64-point FFT -> 16 visible bands)
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.78;

      source.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(comp);
      comp.connect(analyser);
      analyser.connect(ctx.destination);

      this.audioCtx = ctx;
      this.mediaSource = source;
      this.bassFilter = bass;
      this.midFilter = mid;
      this.trebleFilter = treble;
      this.compressor = comp;
      this.analyser = analyser;
      this.freqBuffer = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Fallback gracefully to direct HTMLAudioElement output if Web Audio is unavailable
    }
  }

  private syncEqFilters(): void {
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

  private initAudioElement() {
    if (this.audio) return;
    const trackDef = this.getActiveTrackDef();
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.src = trackDef.sources[this.sourceIndex];
    el.loop = this.state.loopTrack;
    el.volume = this.state.volume;
    el.preload = 'auto';
    this.applyRateToAudio(el);

    el.addEventListener('timeupdate', () => {
      const def = this.getActiveTrackDef();
      this.updateState({
        currentTime: el.currentTime,
        duration:
          Number.isFinite(el.duration) && el.duration > 0 ? el.duration : def.durationSec,
      });
    });

    el.addEventListener('loadedmetadata', () => {
      this.applyRateToAudio(el);
      if (Number.isFinite(el.duration) && el.duration > 0) {
        this.updateState({ duration: el.duration });
      }
    });

    el.addEventListener('ended', () => {
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
      const def = this.getActiveTrackDef();
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
      }
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
    const nextDef = this.catalog.find((t) => t.id === trackId);
    if (!nextDef) return;

    if (trackId === this.state.trackId) {
      if (autoPlay && !this.state.isPlaying) {
        void this.play();
      }
      return;
    }

    this.pause();
    this.sourceIndex = 0;

    if (this.audio) {
      const firstSrc = nextDef.sources && nextDef.sources.length > 0 ? nextDef.sources[0] : '';
      if (firstSrc) {
        this.audio.src = firstSrc;
        this.audio.currentTime = 0;
        this.audio.load();
        this.applyRateToAudio(this.audio);
      }
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
    });

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
