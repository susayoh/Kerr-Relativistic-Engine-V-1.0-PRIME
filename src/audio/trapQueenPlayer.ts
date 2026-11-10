// Singleton audio controller for the Super Secret Vault ("1987") song player:
// Plays the FULL 3:42 "Trap Queen" song by Fetty Wap from local static bundle (/audio/trap-queen-full.mp3)
// with multi-CDN fallback streams and an optional Web Audio API 148 BPM "1738 Synth-Trap" remix engine.

export type TrapQueenAudioMode = 'official' | 'synth1738';

export interface TrapQueenPlayerState {
  isPlaying: boolean;
  mode: TrapQueenAudioMode;
  currentTime: number;
  duration: number;
  volume: number;
  trackTitle: string;
  artistName: string;
  artworkUrl: string;
  error: string | null;
}

type Listener = (state: TrapQueenPlayerState) => void;

const FULL_SONG_SOURCES = [
  '/audio/trap-queen-full.mp3',
  'https://archive.org/download/TrapQueen/Trap%20Queen.mp3',
  'https://archive.org/download/fetty-wap-trap-queen-official-video-prod-by-tony-fadd/Fetty%20Wap%20%20%20Trap%20Queen%20Official%20Video%20Prod%20By%20Tony%20Fadd.mp3',
];

const DEFAULT_ARTWORK_URL =
  'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/b3/df/c5/b3dfc5e2-3980-7b7c-f227-7022c846f5dd/814908020219.jpg/100x100bb.jpg';

class TrapQueenPlayerController {
  private audio: HTMLAudioElement | null = null;
  private sourceIndex = 0;

  // Web Audio 1738 Synth fallback / remix engine
  private audioCtx: AudioContext | null = null;
  private synthIntervalId: number | null = null;
  private synthStep = 0;
  private synthStartTime = 0;

  private state: TrapQueenPlayerState = {
    isPlaying: false,
    mode: 'official',
    currentTime: 0,
    duration: 222, // Full song duration: 3m 42s (222s)
    volume: 0.85,
    trackTitle: 'Trap Queen (Full Song)',
    artistName: 'Fetty Wap',
    artworkUrl: DEFAULT_ARTWORK_URL,
    error: null,
  };

  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.audio) return;
    const el = new Audio(FULL_SONG_SOURCES[this.sourceIndex]);
    el.loop = true;
    el.volume = this.state.volume;
    el.preload = 'auto';

    el.addEventListener('timeupdate', () => {
      if (this.state.mode === 'official') {
        this.updateState({
          currentTime: el.currentTime,
          duration: Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 222,
        });
      }
    });

    el.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        this.updateState({ duration: el.duration });
      }
    });

    el.addEventListener('play', () => {
      if (this.state.mode === 'official') {
        this.updateState({ isPlaying: true, error: null });
      }
    });

    el.addEventListener('pause', () => {
      if (this.state.mode === 'official') {
        this.updateState({ isPlaying: false });
      }
    });

    el.addEventListener('error', () => {
      // Try next full-song source before falling back to synth
      if (this.sourceIndex < FULL_SONG_SOURCES.length - 1) {
        this.sourceIndex++;
        const wasPlaying = this.state.isPlaying;
        el.src = FULL_SONG_SOURCES[this.sourceIndex];
        el.load();
        if (wasPlaying) {
          void el.play().catch(() => {
            this.setMode('synth1738', true);
          });
        }
      } else if (this.state.mode === 'official' && this.state.isPlaying) {
        this.setMode('synth1738', true);
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

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
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

    if (this.state.mode === 'official' && this.audio) {
      try {
        if (!this.audio.src) {
          this.audio.src = FULL_SONG_SOURCES[this.sourceIndex];
        }
        this.audio.volume = this.state.volume;
        await this.audio.play();
        this.updateState({ isPlaying: true, error: null });
        return;
      } catch {
        // Try fallback full-song stream if initial source fails
        if (this.sourceIndex < FULL_SONG_SOURCES.length - 1) {
          this.sourceIndex++;
          this.audio.src = FULL_SONG_SOURCES[this.sourceIndex];
          try {
            await this.audio.play();
            this.updateState({ isPlaying: true, error: null });
            return;
          } catch {
            // Fall through to synth
          }
        }
        this.startSynth1738();
        this.updateState({
          mode: 'synth1738',
          isPlaying: true,
          error: null,
        });
        return;
      }
    }

    this.startSynth1738();
    this.updateState({ isPlaying: true, error: null });
  }

  public pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    this.stopSynth1738();
    this.updateState({ isPlaying: false });
  }

  public stopAndReset(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.stopSynth1738();
    this.updateState({ isPlaying: false, currentTime: 0 });
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = clamped;
    }
    this.updateState({ volume: clamped });
  }

  public seek(seconds: number): void {
    if (this.state.mode === 'official' && this.audio) {
      const maxDur = this.state.duration || 222;
      const target = Math.max(0, Math.min(maxDur, seconds));
      this.audio.currentTime = target;
      this.updateState({ currentTime: target });
    }
  }

  public setMode(mode: TrapQueenAudioMode, autoPlay = this.state.isPlaying): void {
    if (mode === this.state.mode && !autoPlay) return;
    const wasPlaying = autoPlay;
    this.pause();
    this.updateState({
      mode,
      currentTime: 0,
      duration:
        mode === 'official'
          ? Number.isFinite(this.audio?.duration) && (this.audio?.duration ?? 0) > 0
            ? this.audio!.duration
            : 222
          : 16,
    });
    if (wasPlaying) {
      void this.play();
    }
  }

  // ---------------------------------------------------------------------------
  // Web Audio API "Trap Queen (1738 Synth-Trap)" 148 BPM Lead + 808 Engine
  // ---------------------------------------------------------------------------
  private startSynth1738(): void {
    this.stopSynth1738();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    this.synthStep = 0;
    this.synthStartTime = performance.now();

    // 148 BPM -> 16th note = ~101.35ms
    const stepMs = (60 / 148 / 4) * 1000;

    // Iconic Trap Queen brass/synth lead motif in C# minor / E major (frequencies in Hz)
    const leadPattern: (number | null)[] = [
      659.25, null, 739.99, null, 830.61, null, 739.99, null,
      659.25, null, 554.37, null, 554.37, null, null, null,
      659.25, null, 739.99, null, 830.61, null, 987.77, null,
      830.61, null, 739.99, null, 659.25, null, 554.37, null,
    ];

    // 808 Sub-bass root notes (A1, B1, C#2, C#2)
    const bassPattern: (number | null)[] = [
      110.0, null, null, 110.0, null, null, 110.0, null,
      123.47, null, null, 123.47, null, null, 123.47, null,
      138.59, null, null, 138.59, null, null, 138.59, null,
      138.59, null, null, 138.59, null, 164.81, null, null,
    ];

    const triggerStep = () => {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      const step = this.synthStep % 32;
      const gainScale = this.state.volume;

      const leadFreq = leadPattern[step];
      if (leadFreq) {
        const osc = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(leadFreq, now);
        osc2.frequency.setValueAtTime(leadFreq * 0.5, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.16 * gainScale), now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.24);
        osc2.stop(now + 0.24);
      }

      const bassFreq = bassPattern[step];
      if (bassFreq) {
        const sub = this.audioCtx.createOscillator();
        const subGain = this.audioCtx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(bassFreq * 1.8, now);
        sub.frequency.exponentialRampToValueAtTime(bassFreq, now + 0.045);

        subGain.gain.setValueAtTime(Math.max(0.001, 0.32 * gainScale), now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

        sub.connect(subGain);
        subGain.connect(this.audioCtx.destination);
        sub.start(now);
        sub.stop(now + 0.36);
      }

      const isClap = step % 16 === 8;
      const isHat = step % 2 === 0 || step % 8 === 7;
      if (isHat || isClap) {
        const bufferSize = this.audioCtx.sampleRate * (isClap ? 0.12 : 0.035);
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = isClap ? 'bandpass' : 'highpass';
        filter.frequency.setValueAtTime(isClap ? 1400 : 7500, now);

        const nGain = this.audioCtx.createGain();
        nGain.gain.setValueAtTime(
          Math.max(0.001, (isClap ? 0.18 : 0.06) * gainScale),
          now
        );
        nGain.gain.exponentialRampToValueAtTime(0.001, now + (isClap ? 0.11 : 0.03));

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.audioCtx.destination);
        noise.start(now);
      }

      this.synthStep++;
      const elapsed = ((performance.now() - this.synthStartTime) / 1000) % 16;
      this.updateState({ currentTime: elapsed, duration: 16 });
    };

    triggerStep();
    this.synthIntervalId = window.setInterval(triggerStep, stepMs);
  }

  private stopSynth1738(): void {
    if (this.synthIntervalId !== null) {
      window.clearInterval(this.synthIntervalId);
      this.synthIntervalId = null;
    }
  }
}

export const trapQueenPlayer = new TrapQueenPlayerController();
