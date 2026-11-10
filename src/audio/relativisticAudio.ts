import { BlackHoleParams, isStellarCategory } from '../physics/gravitationalPhysics';

export interface PulsarSweepAudioState {
  /** True when viewing a star with active pulsar/outflow beams and non-zero timeScale */
  active: boolean;
  /** 3D directional alignment |dot(normalize(cameraPos), normalize(uMagneticAxis))| in [0, 1] */
  hotspotAlignment: number;
  /** Azimuthal meridian sweep alignment in [0, 1] tracking each beam pass across the camera azimuth */
  azimuthalSweep: number;
  /** Rate of change d(hotspotAlignment)/dt (> 0 when hotspot is approaching the camera view) */
  approachDerivative: number;
  /** Rotational sweep angular velocity (rad/s) of the pulsar beam */
  sweepOmega: number;
  /** True for compact remnants (Neutron Star / Pulsar / Magnetar), false for luminous stars */
  isCompactStar: boolean;
}

class RelativisticAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = true;
  private masterGain: GainNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private harmonicOsc: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  // Warm, soothing Pulsar Lighthouse Sweep Pad & Soft Pulse nodes (no harsh high frequencies)
  private pulsarSweepOsc: OscillatorNode | null = null;
  private pulsarFifthOsc: OscillatorNode | null = null;
  private pulsarLowpassFilter: BiquadFilterNode | null = null;
  private pulsarSweepGain: GainNode | null = null;
  private lastCrestPulseTime = 0;
  private wasApproachingPeak = false;

  public toggleAudio(params: BlackHoleParams): boolean {
    if (!this.ctx) {
      this.initContext(params);
    }
    this.isMuted = !this.isMuted;

    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.16, now, 0.25);
      if (this.isMuted && this.pulsarSweepGain) {
        this.pulsarSweepGain.gain.cancelScheduledValues(now);
        this.pulsarSweepGain.gain.setTargetAtTime(0.0, now, 0.08);
      }
    }
    return !this.isMuted;
  }

  private initContext(params: BlackHoleParams) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

    // -------------------------------------------------------------------------
    // Soothing, Warm Pulsar Lighthouse Sweep Sub-Graph (110 Hz – 320 Hz range)
    // Uses soft sine + warm fifth interval through a smooth low-pass filter
    // -------------------------------------------------------------------------
    this.pulsarSweepGain = this.ctx.createGain();
    this.pulsarSweepGain.gain.value = 0.0;

    this.pulsarLowpassFilter = this.ctx.createBiquadFilter();
    this.pulsarLowpassFilter.type = 'lowpass';
    this.pulsarLowpassFilter.frequency.value = 220;
    this.pulsarLowpassFilter.Q.value = 0.75; // Smooth butterworth-like rolloff, zero piercing resonance

    // Warm fundamental sine wave (A2 - D4 range)
    this.pulsarSweepOsc = this.ctx.createOscillator();
    this.pulsarSweepOsc.type = 'sine';
    this.pulsarSweepOsc.frequency.value = 110;

    // Gentle musical fifth harmonic (triangle wave rolled off by the lowpass filter)
    this.pulsarFifthOsc = this.ctx.createOscillator();
    this.pulsarFifthOsc.type = 'sine';
    this.pulsarFifthOsc.frequency.value = 165;

    const fifthMix = this.ctx.createGain();
    fifthMix.gain.value = 0.22;

    this.pulsarSweepOsc.connect(this.pulsarLowpassFilter);
    this.pulsarFifthOsc.connect(fifthMix);
    fifthMix.connect(this.pulsarLowpassFilter);

    this.pulsarLowpassFilter.connect(this.pulsarSweepGain);
    this.pulsarSweepGain.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);

    this.subOsc.start();
    this.harmonicOsc.start();
    this.lfoOsc.start();
    this.pulsarSweepOsc.start();
    this.pulsarFifthOsc.start();

    this.updateParameters(params);
  }

  private currentParams: BlackHoleParams | null = null;
  private currentDistanceRs = 18.0;

  public updateParameters(params: BlackHoleParams) {
    this.currentParams = params;
    if (!isStellarCategory(params.objectCategory) && this.ctx && this.pulsarSweepGain) {
      this.pulsarSweepGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.08);
    }
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

  /**
   * Synchronizes a warm, soothing harmonic swell with the pulsar beam's rotational sweep.
   * Gently rises in pitch (110 Hz -> 310 Hz) and warmth as the magnetic hotspot approaches
   * the camera view, avoiding any harsh or ear-fatiguing high frequencies.
   */
  public updatePulsarBeamSweep(state: PulsarSweepAudioState) {
    if (
      !this.ctx ||
      this.isMuted ||
      !this.pulsarSweepOsc ||
      !this.pulsarFifthOsc ||
      !this.pulsarLowpassFilter ||
      !this.pulsarSweepGain
    ) {
      return;
    }

    const now = this.ctx.currentTime;

    if (!state.active) {
      this.pulsarSweepGain.gain.setTargetAtTime(0.0, now, 0.08);
      this.wasApproachingPeak = false;
      return;
    }

    // 1. Smooth beam alignment envelope
    const polarFocus = Math.pow(Math.max(0.0, Math.min(1.0, state.hotspotAlignment)), 2.0);
    const sweepPass = Math.pow(Math.max(0.0, Math.min(1.0, state.azimuthalSweep)), 4.0);

    const combinedAlignment = Math.min(
      1.0,
      polarFocus * 0.6 + sweepPass * (0.4 + 0.6 * state.hotspotAlignment)
    );

    // 2. Gentle relativistic Doppler approach warmth
    const dopplerApproach = Math.max(-0.25, Math.min(0.6, state.approachDerivative * 0.25));
    const dopplerFactor = 1.0 + Math.max(0.0, dopplerApproach) * 0.18;

    // 3. Warm Low-Mid Pitch Modulation (110 Hz -> 290 Hz, pleasant musical register)
    const baseHz = state.isCompactStar ? 115 : 98;
    const peakHz = state.isCompactStar ? 265 : 210;
    const spinLift = Math.min(35, state.sweepOmega * 2.5);

    const targetFundamentalFreq =
      (baseHz + (peakHz - baseHz) * Math.pow(combinedAlignment, 1.25) + spinLift) *
      dopplerFactor;

    // Musical perfect fifth (1.5x) overtone for a rich, soothing ambient chord swell
    const targetFifthFreq = targetFundamentalFreq * 1.498;

    // Soft low-pass filter opens gently from 160 Hz to 520 Hz as the beam sweeps past
    const targetCutoff = 160 + combinedAlignment * 360;

    // 4. Gentle Intensity (Gain) Swell
    const proximityAttenuation = Math.min(
      1.1,
      Math.max(0.35, 11.0 / Math.max(4.5, this.currentDistanceRs))
    );
    const maxSwellGain = state.isCompactStar ? 0.16 : 0.11;
    const targetGain =
      Math.pow(combinedAlignment, 1.5) *
      maxSwellGain *
      proximityAttenuation *
      (1.0 + Math.max(0.0, dopplerApproach) * 0.15);

    this.pulsarSweepOsc.frequency.setTargetAtTime(targetFundamentalFreq, now, 0.05);
    this.pulsarFifthOsc.frequency.setTargetAtTime(targetFifthFreq, now, 0.05);
    this.pulsarLowpassFilter.frequency.setTargetAtTime(targetCutoff, now, 0.06);
    this.pulsarSweepGain.gain.setTargetAtTime(targetGain, now, 0.05);

    // 5. Soft, Deep Lighthouse Heartbeat Whoosh when the beam crosses the camera meridian
    const isAtSweepCrest = sweepPass > 0.84 && state.hotspotAlignment > 0.35;
    const minPulseInterval = Math.max(0.18, (Math.PI / Math.max(1.0, state.sweepOmega)) * 0.7);
    if (
      isAtSweepCrest &&
      !this.wasApproachingPeak &&
      now - this.lastCrestPulseTime >= minPulseInterval
    ) {
      this.lastCrestPulseTime = now;
      this.wasApproachingPeak = true;
      this.triggerSoftLighthousePulse(state.hotspotAlignment, state.sweepOmega);
    } else if (sweepPass < 0.55) {
      this.wasApproachingPeak = false;
    }
  }

  /**
   * Produces a soft, warm low-mid thrum (130 Hz -> 220 Hz -> 140 Hz) when the pulsar beam
   * sweeps across the camera, feeling like a deep cosmic lighthouse pulse without sharp highs.
   */
  private triggerSoftLighthousePulse(hotspotAlignment: number, sweepOmega: number) {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    const align = Math.max(0.0, Math.min(1.0, hotspotAlignment));
    const startFreq = 125 + align * 45;
    const peakFreq = startFreq + 55 + align * 65;
    const duration = Math.max(0.12, Math.min(0.28, 0.65 / Math.max(1.8, sweepOmega)));

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.45);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.92, now + duration);

    const peakAmp = 0.045 * Math.pow(align, 1.3);
    gain.gain.setValueAtTime(0.0005, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, peakAmp), now + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
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

    // 1. Deep N-Wave Sub-Bass Sonic Boom Thump
    const osc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    osc.type = isStar ? 'triangle' : 'sine';
    const startFreq = isStar ? 135 : 88;
    const endFreq = isStar ? 28 : 22;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.65);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.34, now + 0.018);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(subGain);
    subGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.78);

    // 2. Supersonic Pressure-Front Broadband Shock Crack (Low-passed Noise Burst)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // N-wave double-shock envelope
      const nWave = Math.exp(-t * 14.0) + 0.45 * Math.exp(-Math.pow((t - 0.16) / 0.06, 2.0));
      data[i] = (Math.random() * 2.0 - 1.0) * nWave;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const shockFilter = this.ctx.createBiquadFilter();
    shockFilter.type = 'lowpass';
    shockFilter.frequency.setValueAtTime(isStar ? 420 : 280, now);
    shockFilter.frequency.exponentialRampToValueAtTime(45, now + 0.4);
    shockFilter.Q.value = 1.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    noiseSource.connect(shockFilter);
    shockFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSource.start(now);
  }

  public dispose() {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const relativisticAudio = new RelativisticAudioEngine();
