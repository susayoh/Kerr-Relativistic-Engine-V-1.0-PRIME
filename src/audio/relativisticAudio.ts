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

  public updateParameters(params: BlackHoleParams) {
    if (!this.ctx || this.isMuted || !this.subOsc || !this.harmonicOsc || !this.filterNode || !this.lfoOsc) {
      return;
    }
    const now = this.ctx.currentTime;
    // Higher mass -> deeper gravitational fundamental frequency
    const baseFreq = Math.max(32, 78 - params.massSolar * 0.42);
    const spinDetune = 1 + params.spin * 0.5;
    this.subOsc.frequency.setTargetAtTime(baseFreq, now, 0.15);
    this.harmonicOsc.frequency.setTargetAtTime(baseFreq * 1.5 * spinDetune, now, 0.15);

    const cutoff = 110 + params.accretionRate * 140 + params.dopplerStrength * 85;
    this.filterNode.frequency.setTargetAtTime(cutoff, now, 0.15);
    this.lfoOsc.frequency.setTargetAtTime(0.6 + params.spin * 4.5 * Math.max(0.2, params.timeScale), now, 0.15);
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
