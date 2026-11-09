import { BlackHoleParams } from '../physics/gravitationalPhysics';

class RelativisticAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = true;
  private masterGain: GainNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private harmonicOsc: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  public toggleAudio(params: BlackHoleParams): boolean {
    if (!this.ctx) {
      this.initContext(params);
    }
    this.isMuted = !this.isMuted;

    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.16, now, 0.25);
    }
    return !this.isMuted;
  }

  private initContext(params: BlackHoleParams) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 180;
    this.filterNode.Q.value = 4.2;

    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = 48;

    this.harmonicOsc = this.ctx.createOscillator();
    this.harmonicOsc.type = 'sawtooth';
    this.harmonicOsc.frequency.value = 96;

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.value = 0.22;

    // Frame-dragging LFO modulation
    this.lfoOsc = this.ctx.createOscillator();
    this.lfoOsc.type = 'sine';
    this.lfoOsc.frequency.value = 1.8;

    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = 32;

    this.lfoOsc.connect(this.lfoGain);
    this.lfoGain.connect(this.filterNode.frequency);

    this.subOsc.connect(this.filterNode);
    this.harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(this.filterNode);

    this.filterNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.subOsc.start();
    this.harmonicOsc.start();
    this.lfoOsc.start();

    this.updateParameters(params);
  }

  private currentParams: BlackHoleParams | null = null;
  private currentDistanceRs = 18.0;

  public updateParameters(params: BlackHoleParams) {
    this.currentParams = params;
    this.applyAudioModulation();
  }

  /**
   * Modulates ambient relativistic drone based on camera proximity to the event horizon.
   * As camera orbits closer to the horizon (r -> 1.5 - 3.0 Rs), extreme gravitational redshift
   * and time dilation lowers the fundamental frequency into a deep, visceral bass rumble.
   * Pulling back into deep space shifts frequencies higher into an ethereal celestial hum.
   */
  public updateCameraProximity(distanceRs: number, timeDilationFactor: number) {
    this.currentDistanceRs = Math.max(1.05, distanceRs);
    this.applyAudioModulation(timeDilationFactor);
  }

  private applyAudioModulation(timeDilation?: number) {
    if (!this.ctx || this.isMuted || !this.subOsc || !this.harmonicOsc || !this.filterNode || !this.lfoOsc) {
      return;
    }
    const params = this.currentParams;
    const now = this.ctx.currentTime;

    // Camera proximity factor: 0.0 near horizon (~1.5 Rs), 1.0 in deep space (>= 22 Rs)
    const distT = Math.min(1.0, Math.max(0.0, (this.currentDistanceRs - 1.8) / 20.0));
    const tdFactor = timeDilation ?? Math.sqrt(Math.max(0.01, 1.0 - 1.0 / this.currentDistanceRs));

    const massSolar = params?.massSolar ?? 100;
    const spin = params?.spin ?? 0.98;
    const accretionRate = params?.accretionRate ?? 1.95;
    const dopplerStrength = params?.dopplerStrength ?? 0.65;
    const timeScale = params?.timeScale ?? 1.0;

    // Deep bass-heavy gravitational time-dilation drone:
    // Near horizon (distT -> 0): drops down to 26 - 32 Hz sub-bass rumble
    // Pulling back (distT -> 1): shifts higher to 64 - 82 Hz celestial hum
    const massOffset = (massSolar / 100) * 12.0;
    const closeFreq = Math.max(26.0, 32.0 - massOffset * 0.4);
    const farFreq = Math.max(52.0, 78.0 - massOffset);
    const targetSubFreq = closeFreq + (farFreq - closeFreq) * Math.pow(distT, 0.75);

    const spinDetune = 1.0 + spin * 0.35;
    const targetHarmonicFreq = targetSubFreq * 1.5 * spinDetune;

    // Lowpass filter cutoff: near horizon, gravitational redshifting muffles high frequencies
    // Far away, the filter opens up allowing sparkling harmonics
    const baseCutoff = 80 + accretionRate * 90 + dopplerStrength * 60;
    const closeCutoff = Math.max(55, baseCutoff * 0.45);
    const targetCutoff = closeCutoff + (baseCutoff - closeCutoff) * distT;

    // LFO time-dilation slowdown: frame-dragging oscillations slow down near horizon
    const baseLfo = (0.5 + spin * 3.5) * Math.max(0.2, timeScale);
    const targetLfo = Math.max(0.2, baseLfo * (0.25 + 0.75 * tdFactor));

    this.subOsc.frequency.setTargetAtTime(targetSubFreq, now, 0.12);
    this.harmonicOsc.frequency.setTargetAtTime(targetHarmonicFreq, now, 0.12);
    this.filterNode.frequency.setTargetAtTime(targetCutoff, now, 0.12);
    this.lfoOsc.frequency.setTargetAtTime(targetLfo, now, 0.15);
  }

  public triggerGeodesicPing(outcome: 'captured' | 'scattered' | 'critical-orbit') {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = outcome === 'captured' ? 320 : outcome === 'critical-orbit' ? 520 : 640;
    const endFreq = outcome === 'captured' ? 68 : outcome === 'critical-orbit' ? 540 : 880;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.35);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public triggerAccretionShockPulse(isStar = false) {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isStar ? 'triangle' : 'sine';
    const startFreq = isStar ? 180 : 95;
    const endFreq = isStar ? 42 : 32;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.55);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  public dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const relativisticAudio = new RelativisticAudioEngine();
