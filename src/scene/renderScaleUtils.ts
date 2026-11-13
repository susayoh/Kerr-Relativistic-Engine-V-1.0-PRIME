export interface PixelRatioCapOptions {
  lowResolutionRender?: boolean;
  highPerformanceMode?: boolean;
  isSoftwareGl?: boolean;
}

export const DYNAMIC_RES_MIN_DPR = 0.85;
export const DYNAMIC_RES_STEP_DPR = 0.15;
export const DYNAMIC_RES_LOW_FPS_THRESHOLD = 48;
export const DYNAMIC_RES_RECOVER_FPS_THRESHOLD = 55;
export const DYNAMIC_RES_ROLLING_WINDOW = 30;
export const DYNAMIC_RES_WARMUP_FRAMES = 60;
export const ORBIT_RELAXED_STEP_MULTIPLIER = 1.45;
export const TELEMETRY_MAX_HZ_INTERVAL_MS = 100;

/**
 * Computes the baseline capped devicePixelRatio:
 * - On mobile/Retina viewports (devicePixelRatio >= 2), preserves Math.min(devicePixelRatio, 2.0)
 *   so the wireframe curvature grid and photon ring stay crisp and anti-aliased.
 * - Standard viewports: maintains a crisp 1.0 - 2.0 pixel ratio floor (minimum 0.85 in low-res mode).
 */
export function computeBaseDesktopPixelRatio(
  viewportWidth: number,
  devicePixelRatio: number,
  options: PixelRatioCapOptions = {}
): number {
  const safeDpr =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1.0;

  if (options.lowResolutionRender) {
    return DYNAMIC_RES_MIN_DPR;
  }

  if (safeDpr >= 2.0) {
    return Math.min(safeDpr, 2.0);
  }

  if (options.isSoftwareGl) {
    return Math.max(1.0, Math.min(safeDpr, 2.0));
  }

  const maxDpr = viewportWidth > 1920 ? 1.5 : 2.0;
  return Math.max(DYNAMIC_RES_MIN_DPR, Math.min(safeDpr, maxDpr));
}

/**
 * Computes rolling average FPS from a buffer of inter-frame durations in milliseconds.
 */
export function computeRollingAverageFps(frameTimesMs: readonly number[]): number {
  if (frameTimesMs.length === 0) return 60;
  let totalMs = 0;
  let validCount = 0;
  for (let i = 0; i < frameTimesMs.length; i++) {
    const ms = frameTimesMs[i];
    if (Number.isFinite(ms) && ms > 0) {
      totalMs += ms;
      validCount++;
    }
  }
  if (validCount === 0 || totalMs <= 0) return 60;
  const avgMs = totalMs / validCount;
  return Math.min(240, 1000 / Math.max(1.0, avgMs));
}

/**
 * Steps the dynamic internal pixel ratio down by 0.15 (to a minimum of 0.85, or >= 1.0 on Retina)
 * when rolling 30-frame average FPS drops below 48 after the initial 60 warmup frames,
 * and steps back up toward baseMaxPixelRatio when FPS > 55.
 */
export function stepDynamicResolutionScale(
  currentPixelRatio: number,
  rollingAvgFps: number,
  baseMaxPixelRatio: number,
  minPixelRatio = DYNAMIC_RES_MIN_DPR,
  step = DYNAMIC_RES_STEP_DPR,
  frameCount?: number
): number {
  const safeMinFloor = Math.max(
    DYNAMIC_RES_MIN_DPR,
    baseMaxPixelRatio >= 2.0 ? Math.max(minPixelRatio, 1.0) : minPixelRatio
  );
  const effectiveMin = Math.min(safeMinFloor, baseMaxPixelRatio);
  const clampedCurrent = Math.max(effectiveMin, Math.min(baseMaxPixelRatio, currentPixelRatio));

  if (baseMaxPixelRatio <= effectiveMin) {
    return baseMaxPixelRatio;
  }

  // Ignore the first 60 frames after mount (initial boot / shader pre-warming grace period)
  // before evaluating FPS drops so resolution is never prematurely downscaled on startup.
  if (frameCount !== undefined && frameCount < DYNAMIC_RES_WARMUP_FRAMES) {
    if (rollingAvgFps > DYNAMIC_RES_RECOVER_FPS_THRESHOLD) {
      return Math.min(baseMaxPixelRatio, Number((clampedCurrent + step).toFixed(2)));
    }
    return clampedCurrent;
  }

  if (rollingAvgFps < DYNAMIC_RES_LOW_FPS_THRESHOLD) {
    return Math.max(effectiveMin, Number((clampedCurrent - step).toFixed(2)));
  }

  if (rollingAvgFps > DYNAMIC_RES_RECOVER_FPS_THRESHOLD) {
    return Math.min(baseMaxPixelRatio, Number((clampedCurrent + step).toFixed(2)));
  }

  return clampedCurrent;
}

/**
 * Returns the raymarch step-size multiplier matching shader mix(1.0, 1.45, u_isOrbiting).
 */
export function computeOrbitStepMultiplier(isOrbiting: boolean | number): number {
  const factor = typeof isOrbiting === 'boolean' ? (isOrbiting ? 1.0 : 0.0) : Math.max(0, Math.min(1, isOrbiting));
  return 1.0 + (ORBIT_RELAXED_STEP_MULTIPLIER - 1.0) * factor;
}

/**
 * Enforces <= 10Hz (>= 100ms) React telemetry state update throttling.
 */
export function shouldEmitThrottledTelemetry(
  nowMs: number,
  lastEmitMs: number,
  minIntervalMs = TELEMETRY_MAX_HZ_INTERVAL_MS
): boolean {
  const enforcedMin = Math.max(TELEMETRY_MAX_HZ_INTERVAL_MS, minIntervalMs);
  return nowMs - lastEmitMs >= enforcedMin;
}

/**
 * User Timing API (performance.mark / performance.measure) names for BlackHoleScene.ts
 * shader pass & requestAnimationFrame CPU/GPU bottleneck instrumentation.
 */
export const KERR_PERF_MARKS = {
  rafStart: 'kerr:raf-start',
  cpuSimStart: 'kerr:cpu-sim-start',
  cpuSimEnd: 'kerr:cpu-sim-end',
  cpuCameraUniformsStart: 'kerr:cpu-camera-uniforms-start',
  cpuCameraUniformsEnd: 'kerr:cpu-camera-uniforms-end',
  gpuScenePassStart: 'kerr:gpu-scene-pass-start',
  gpuScenePassEnd: 'kerr:gpu-scene-pass-end',
  gpuPostPassStart: 'kerr:gpu-post-pass-start',
  gpuPostPassEnd: 'kerr:gpu-post-pass-end',
  rafEnd: 'kerr:raf-end',
} as const;

export const KERR_PERF_MEASURES = {
  cpuSimPhysics: 'kerr:cpu-sim-physics',
  cpuCameraUniforms: 'kerr:cpu-camera-uniforms',
  gpuScenePass: 'kerr:gpu-scene-pass',
  gpuPostPass: 'kerr:gpu-post-pass',
  rafTotal: 'kerr:raf-total',
} as const;

export type LagBottleneckClassification =
  | 'OPTIMAL_60FPS'
  | 'GPU_FRAGMENT_BOUND'
  | 'CPU_RAF_BOUND'
  | 'IFRAME_COMPOSITOR_OR_VSYNC_WAIT';

export type GeodesicShaderQualityTier = 'Full Geodesic' | 'Approximated Null-Geodesic';

export type GeodesicShaderQualityMode = 'auto' | GeodesicShaderQualityTier;

export const SHADER_QUALITY_HYSTERESIS_MS = 5000;

export interface ShaderPassTimingInput {
  interFrameMs: number;
  rafTotalMs: number;
  cpuSimPhysicsMs: number;
  cpuCameraUniformsMs: number;
  gpuScenePassMs: number;
  gpuPostPassMs: number;
  gpuTimerQueryMs: number | null;
  renderPasses: number;
  isOrbiting: boolean;
  pixelRatio: number;
  shaderQualityTier?: GeodesicShaderQualityTier;
}

export interface ShaderPassTimingSnapshot extends ShaderPassTimingInput {
  shaderQualityTier: GeodesicShaderQualityTier;
  unaccountedFrameGapMs: number;
  classification: LagBottleneckClassification;
  diagnosisSummary: string;
}

/**
 * GLSL snippet definitions for the 'Full Geodesic' (high detail) vs.
 * 'Approximated Null-Geodesic' (lower fidelity, high FPS) fragment shader variants.
 */
export const GEODESIC_SHADER_SNIPPETS: Record<GeodesicShaderQualityTier, string> = {
  'Full Geodesic': `
  #define KERR_APPROX_NULL_GEODESIC 0
  #define VOL_RAYMARCH_STEPS 5
  `,
  'Approximated Null-Geodesic': `
  #define KERR_APPROX_NULL_GEODESIC 1
  #define VOL_RAYMARCH_STEPS 2
  `,
};

/**
 * Evaluates whether the engine should swap between 'Full Geodesic' (high detail)
 * and 'Approximated Null-Geodesic' (lower fidelity) fragment shaders based on
 * sustained performance telemetry (< 24 FPS for >= 5 continuous seconds).
 */
export function evaluateDynamicShaderQualityTier(
  currentTier: GeodesicShaderQualityTier,
  averagedTelemetry: ShaderPassTimingSnapshot,
  elapsedSinceLastSwapMs: number,
  mode: GeodesicShaderQualityMode = 'auto',
  hysteresisMs = SHADER_QUALITY_HYSTERESIS_MS
): {
  nextTier: GeodesicShaderQualityTier;
  swapped: boolean;
  reason: string;
} {
  if (mode === 'Full Geodesic' || mode === 'Approximated Null-Geodesic') {
    const swapped = currentTier !== mode;
    return {
      nextTier: mode,
      swapped,
      reason: swapped ? `Manual override locked to '${mode}'.` : `Locked to '${mode}'.`,
    };
  }

  // Enforce 5s sustained window between automatic tier swaps to preserve Full Geodesic quality
  if (elapsedSinceLastSwapMs < hysteresisMs) {
    return {
      nextTier: currentTier,
      swapped: false,
      reason: 'Within hysteresis stabilization window.',
    };
  }

  if (currentTier === 'Full Geodesic') {
    // Only downgrade from Full Geodesic when FPS remains sustained below 24 FPS (interFrameMs > 41.67ms)
    const isSustainedBelow24Fps =
      averagedTelemetry.interFrameMs > 1000 / 24 &&
      (averagedTelemetry.classification === 'GPU_FRAGMENT_BOUND' ||
        averagedTelemetry.gpuScenePassMs >= 8.5);

    if (isSustainedBelow24Fps) {
      return {
        nextTier: 'Approximated Null-Geodesic',
        swapped: true,
        reason: `Telemetry avg ${averagedTelemetry.interFrameMs.toFixed(
          2
        )}ms/frame (< 24 FPS sustained for >= 5s, GPU Scene Pass ${averagedTelemetry.gpuScenePassMs.toFixed(
          2
        )}ms) -> swapping to 'Approximated Null-Geodesic'.`,
      };
    }
  } else {
    // Upgrade back to 'Full Geodesic' once frame times recover above 24 FPS
    const canUpgradeToFull =
      averagedTelemetry.interFrameMs <= 33.3 && averagedTelemetry.gpuScenePassMs <= 8.0;

    if (canUpgradeToFull) {
      return {
        nextTier: 'Full Geodesic',
        swapped: true,
        reason: `Telemetry avg recovered to ${averagedTelemetry.interFrameMs.toFixed(
          2
        )}ms/frame (GPU Scene Pass ${averagedTelemetry.gpuScenePassMs.toFixed(
          2
        )}ms) -> restoring 'Full Geodesic' shader.`,
      };
    }
  }

  return {
    nextTier: currentTier,
    swapped: false,
    reason: `Maintaining '${currentTier}' tier.`,
  };
}

/**
 * Emits a User Timing API performance.mark safely without throwing in restricted environments.
 */
export function safePerfMark(markName: string): void {
  try {
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
      performance.mark(markName);
    }
  } catch {
    // Ignore User Timing errors in unsupported environments
  }
}

/**
 * Emits a User Timing API performance.measure between startMark and endMark and returns its duration in ms.
 */
export function safePerfMeasureMs(
  measureName: string,
  startMark: string,
  endMark: string
): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
      const entry = performance.measure(measureName, startMark, endMark) as PerformanceMeasure | undefined;
      if (entry && Number.isFinite(entry.duration)) {
        return Math.max(0, Number(entry.duration.toFixed(3)));
      }
      if (typeof performance.getEntriesByName === 'function') {
        const entries = performance.getEntriesByName(measureName, 'measure');
        const last = entries[entries.length - 1];
        if (last && Number.isFinite(last.duration)) {
          return Math.max(0, Number(last.duration.toFixed(3)));
        }
      }
    }
  } catch {
    // Ignore missing mark or unsupported User Timing API errors
  }
  return 0;
}

/**
 * Clears Kerr profiler marks & measures after sampling so the browser's PerformanceEntry buffer never bloats.
 */
export function clearKerrPerfMarksAndMeasures(): void {
  try {
    if (typeof performance === 'undefined') return;
    if (typeof performance.clearMarks === 'function') {
      for (const mark of Object.values(KERR_PERF_MARKS)) {
        performance.clearMarks(mark);
      }
    }
    if (typeof performance.clearMeasures === 'function') {
      for (const measure of Object.values(KERR_PERF_MEASURES)) {
        performance.clearMeasures(measure);
      }
    }
  } catch {
    // Ignore
  }
}

export type ThermalThrottleLevel = 'NOMINAL' | 'WARM' | 'THROTTLED' | 'CRITICAL';

export interface ThermalThrottleState {
  /** Current raymarching step count fed into the shader uniform u_stepCount (96..128 mobile, 128..160+ desktop) */
  uStepCount: number;
  /** Maximum unthrottled step count for the current quality tier */
  maxStepCount: number;
  /** Estimated passive-cooling thermal load percentage (0..100%) */
  thermalLoadPct: number;
  /** Estimated GPU die temperature in Celsius for passive/fanless chassis model (38..92°C) */
  estimatedTempC: number;
  /** Continuous duration in ms that FPS has remained below 24 FPS */
  sustainedBottleneckMs: number;
  /** Timestamp (performance.now() ms) of the last thermal state integration step */
  lastSampleTimeMs: number;
  /** Discrete thermal throttling state classification */
  level: ThermalThrottleLevel;
  /** True when uStepCount has been reduced below maxStepCount due to sustained < 24 FPS thermal load */
  throttled: boolean;
}

export interface ThermalSampleInput {
  nowMs: number;
  interFrameMs: number;
  gpuScenePassMs: number;
  gpuTimerQueryMs: number | null;
  rafTotalMs: number;
  maxStepCount?: number;
}

export const THERMAL_DEFAULT_MAX_STEPS = 160;
export const THERMAL_DESKTOP_MAX_STEPS = 160;
export const THERMAL_MOBILE_MAX_STEPS = 128;
export const THERMAL_DESKTOP_MIN_STEPS = 128;
export const THERMAL_MOBILE_MIN_STEPS = 96;
export const THERMAL_MIN_STEPS = 96;
export const THERMAL_SUSTAINED_LOW_FPS_THRESHOLD = 24;
export const THERMAL_SUSTAINED_FRAME_MS_THRESHOLD = 1000 / THERMAL_SUSTAINED_LOW_FPS_THRESHOLD;
export const THERMAL_SUSTAINED_DURATION_MS = 5000;
export const THERMAL_AMBIENT_TEMP_C = 38.0;
export const THERMAL_MAX_TEMP_C = 92.0;

/**
 * Creates the initial nominal thermal throttling state.
 */
export function createInitialThermalState(
  nowMs = 0,
  maxStepCount = THERMAL_DEFAULT_MAX_STEPS
): ThermalThrottleState {
  return {
    uStepCount: maxStepCount,
    maxStepCount,
    thermalLoadPct: 0,
    estimatedTempC: THERMAL_AMBIENT_TEMP_C,
    sustainedBottleneckMs: 0,
    lastSampleTimeMs: nowMs,
    level: 'NOMINAL',
    throttled: false,
  };
}

/**
 * Integrates GPU frame time metrics over wall-clock time via performance.now() using an asymmetric
 * passive-cooling RC thermal model. Prevents thermal throttling from reducing u_stepCount unless
 * FPS remains sustained below 24 FPS (interFrameMs > 41.67ms) for at least 5 continuous seconds (5000ms),
 * and preserves high-fidelity raymarch step counts (minimum 96-128 on mobile, 128-160+ on desktop).
 */
export function stepThermalThrottlingState(
  prevState: ThermalThrottleState,
  sample: ThermalSampleInput
): ThermalThrottleState {
  const maxSteps = Math.max(
    1,
    Math.round(sample.maxStepCount ?? prevState.maxStepCount ?? THERMAL_DEFAULT_MAX_STEPS)
  );
  const minStepsForTier =
    maxSteps >= THERMAL_DESKTOP_MAX_STEPS
      ? THERMAL_DESKTOP_MIN_STEPS
      : maxSteps >= THERMAL_MOBILE_MIN_STEPS
      ? THERMAL_MOBILE_MIN_STEPS
      : 1;

  const rawDtMs =
    prevState.lastSampleTimeMs > 0 ? sample.nowMs - prevState.lastSampleTimeMs : sample.interFrameMs;
  const dtMs = Number.isFinite(rawDtMs) ? Math.max(1.0, Math.min(500.0, rawDtMs)) : 16.67;

  // Guard against cumulative/disjoint timer query spikes when interFrameMs is within normal bounds
  const plausibleTimerQueryMs =
    sample.gpuTimerQueryMs !== null &&
    sample.gpuTimerQueryMs > 0 &&
    sample.gpuTimerQueryMs <= sample.interFrameMs * 1.5
      ? sample.gpuTimerQueryMs
      : 0;
  const effectiveGpuMs = Math.max(
    sample.gpuScenePassMs,
    plausibleTimerQueryMs,
    sample.rafTotalMs * 0.72
  );

  // Only count a frame toward sustained thermal throttling when FPS is strictly below 24 FPS (interFrameMs > 41.67ms)
  const isBelow24Fps = sample.interFrameMs > THERMAL_SUSTAINED_FRAME_MS_THRESHOLD;
  const sustainedBottleneckMs = isBelow24Fps
    ? Math.min(30000, prevState.sustainedBottleneckMs + dtMs)
    : prevState.sustainedBottleneckMs >= THERMAL_SUSTAINED_DURATION_MS
    ? Math.max(0, prevState.sustainedBottleneckMs - dtMs * 2.0)
    : 0;

  const frameLoadRatio = Math.max(0, (sample.interFrameMs - 16.67) / 35.0);
  const gpuLoadRatio = Math.max(0, (effectiveGpuMs - 5.0) / 18.0);
  const instantLoadPct = Math.max(0, Math.min(100, Math.max(frameLoadRatio, gpuLoadRatio) * 100));

  const tauMs = instantLoadPct > prevState.thermalLoadPct ? 3200.0 : 4800.0;
  const alpha = 1.0 - Math.exp(-dtMs / tauMs);
  const sustainedBoostPct =
    sustainedBottleneckMs >= THERMAL_SUSTAINED_DURATION_MS
      ? Math.min(30.0, (sustainedBottleneckMs / 6000.0) * 24.0)
      : 0;
  const targetThermalLoadPct = Math.min(100, instantLoadPct * 0.75 + sustainedBoostPct);

  const nextThermalLoadPct = Number(
    Math.max(
      0,
      Math.min(100, prevState.thermalLoadPct + (targetThermalLoadPct - prevState.thermalLoadPct) * alpha)
    ).toFixed(1)
  );

  const estimatedTempC = Number(
    (
      THERMAL_AMBIENT_TEMP_C +
      (THERMAL_MAX_TEMP_C - THERMAL_AMBIENT_TEMP_C) * (nextThermalLoadPct / 100)
    ).toFixed(1)
  );

  let level: ThermalThrottleLevel = 'NOMINAL';
  let uStepCount = maxSteps;

  // Prevent thermal throttling from reducing u_stepCount unless FPS remains sustained below 24 FPS
  // for at least 5 continuous seconds (5000ms).
  if (sustainedBottleneckMs >= THERMAL_SUSTAINED_DURATION_MS) {
    const stepSpan = Math.max(1, maxSteps - minStepsForTier);
    if (sustainedBottleneckMs >= 7500 || nextThermalLoadPct >= 75) {
      level = 'CRITICAL';
      uStepCount = minStepsForTier;
    } else if (sustainedBottleneckMs >= 6000 || nextThermalLoadPct >= 55) {
      level = 'THROTTLED';
      uStepCount = Math.max(minStepsForTier, Math.round(maxSteps - stepSpan * 0.65));
    } else {
      level = 'WARM';
      uStepCount = Math.max(minStepsForTier, Math.round(maxSteps - stepSpan * 0.35));
    }
  }

  return {
    uStepCount,
    maxStepCount: maxSteps,
    thermalLoadPct: nextThermalLoadPct,
    estimatedTempC,
    sustainedBottleneckMs: Math.round(sustainedBottleneckMs),
    lastSampleTimeMs: sample.nowMs,
    level,
    throttled: uStepCount < maxSteps,
  };
}

/**
 * Classifies whether frame lag stems from GPU fragment complexity, CPU-bound requestAnimationFrame
 * work, or iframe compositor / GPU command buffer synchronization wait between rAF callbacks.
 */
export function classifyFrameBottleneck(
  input: ShaderPassTimingInput & {
    uStepCount?: number;
    thermalLevel?: ThermalThrottleLevel;
    estimatedTempC?: number;
  }
): ShaderPassTimingSnapshot & {
  uStepCount?: number;
  thermalLevel?: ThermalThrottleLevel;
  estimatedTempC?: number;
} {
  const cpuTotalMs = input.cpuSimPhysicsMs + input.cpuCameraUniformsMs;
  const gpuSubmitTotalMs = input.gpuScenePassMs + input.gpuPostPassMs;
  const plausibleTimerQueryMs =
    input.gpuTimerQueryMs !== null &&
    input.gpuTimerQueryMs > 0 &&
    input.gpuTimerQueryMs <= input.interFrameMs * 1.5
      ? input.gpuTimerQueryMs
      : 0;
  const effectiveGpuMs = Math.max(gpuSubmitTotalMs, plausibleTimerQueryMs);
  const unaccountedFrameGapMs = Math.max(
    0,
    Number((input.interFrameMs - input.rafTotalMs).toFixed(2))
  );
  const shaderQualityTier: GeodesicShaderQualityTier =
    input.shaderQualityTier ?? 'Full Geodesic';

  let classification: LagBottleneckClassification = 'OPTIMAL_60FPS';
  let diagnosisSummary =
    'Frame pacing locked near 60 FPS; both CPU rAF work and GPU shader passes are within budget.';

  // Check if frame time exceeds the 60 FPS threshold (~18.8ms) or individual passes are elevated
  if (input.interFrameMs > 18.8 || input.rafTotalMs > 14.0 || effectiveGpuMs > 11.0) {
    if (
      effectiveGpuMs >= 8.5 ||
      (effectiveGpuMs > cpuTotalMs * 1.35 && effectiveGpuMs >= 5.0)
    ) {
      classification = 'GPU_FRAGMENT_BOUND';
      diagnosisSummary = `GPU fragment shader pass dominates (${effectiveGpuMs.toFixed(
        2
      )}ms across ${input.renderPasses} pass${
        input.renderPasses === 1 ? '' : 'es'
      } @ ${input.pixelRatio.toFixed(2)}x DPR [${shaderQualityTier}${
        input.uStepCount !== undefined ? ` · u_stepCount=${input.uStepCount}` : ''
      }]; CPU rAF pre-render took ${cpuTotalMs.toFixed(2)}ms).`;
    } else if (cpuTotalMs >= 7.0 || cpuTotalMs >= input.rafTotalMs * 0.55) {
      classification = 'CPU_RAF_BOUND';
      diagnosisSummary = `CPU requestAnimationFrame JS work dominates (${cpuTotalMs.toFixed(
        2
      )}ms: sim/physics ${input.cpuSimPhysicsMs.toFixed(
        2
      )}ms + camera/uniforms ${input.cpuCameraUniformsMs.toFixed(2)}ms).`;
    } else {
      classification = 'IFRAME_COMPOSITOR_OR_VSYNC_WAIT';
      diagnosisSummary = `JS rAF completed in ${input.rafTotalMs.toFixed(
        2
      )}ms, but ${unaccountedFrameGapMs.toFixed(
        2
      )}ms elapsed between rAF ticks (AI Studio iframe compositor / async GPU fragment flush).`;
    }
  }

  return {
    ...input,
    shaderQualityTier,
    unaccountedFrameGapMs,
    classification,
    diagnosisSummary,
  };
}

export type ShaderPrewarmVariantId =
  | 'geodesic_full'
  | 'geodesic_approx'
  | 'accretion_disk_classic'
  | 'accretion_disk_volumetric'
  | 'ergosphere_static_limit'
  | 'event_horizon_supersonic_boom'
  | 'spacetime_post_dispersion'
  | 'starfield_and_compact_remnants';

export interface ShaderPrewarmVariantEntry {
  id: ShaderPrewarmVariantId;
  programKey: string;
  subsystem: 'geodesic' | 'accretion_disk' | 'ergosphere' | 'shockwave' | 'post_pass' | 'stellar';
  label: string;
}

export const SHADER_PREWARM_MANIFEST: readonly ShaderPrewarmVariantEntry[] = [
  {
    id: 'geodesic_full',
    programKey: 'lensing_kerr_raymarcher_full_geodesic_v1',
    subsystem: 'geodesic',
    label: 'Full Geodesic 5-Step Boyer-Lindquist Raymarcher',
  },
  {
    id: 'geodesic_approx',
    programKey: 'lensing_kerr_raymarcher_approx_null_geodesic_v1',
    subsystem: 'geodesic',
    label: 'Approximated Null-Geodesic 2-Step Midpoint Raymarcher',
  },
  {
    id: 'accretion_disk_classic',
    programKey: 'accretion_disk_classic_v1',
    subsystem: 'accretion_disk',
    label: 'Novikov-Thorne Equatorial Accretion Disk (Classic)',
  },
  {
    id: 'accretion_disk_volumetric',
    programKey: 'accretion_disk_volumetric_fbm_v1',
    subsystem: 'accretion_disk',
    label: 'Volumetric Raymarched Plasma Torus & Strata',
  },
  {
    id: 'ergosphere_static_limit',
    programKey: 'ergosphere_lense_thirring_cage_v1',
    subsystem: 'ergosphere',
    label: 'Lense-Thirring Oblate Ergosphere Static-Limit Cage',
  },
  {
    id: 'event_horizon_supersonic_boom',
    programKey: 'event_horizon_sonic_boom_v1',
    subsystem: 'shockwave',
    label: 'Supersonic N-Wave Mach Shell & Equatorial Shock Rings',
  },
  {
    id: 'spacetime_post_dispersion',
    programKey: 'relativistic_motion_blur_post_v1',
    subsystem: 'post_pass',
    label: 'Relativistic Chromatic Dispersion & Time-Lapse Post-Pass',
  },
  {
    id: 'starfield_and_compact_remnants',
    programKey: 'compact_star_crust_beloborodov_v1',
    subsystem: 'stellar',
    label: 'Instanced Deep Starfield & Compact Remnant Photosphere',
  },
] as const;

export interface ShaderPrewarmCacheReport {
  isPrewarmed: boolean;
  isComplete: boolean;
  compiledVariants: ShaderPrewarmVariantId[];
  compiledProgramKeys: string[];
  totalRequiredVariants: number;
  prewarmDurationMs: number;
  webglProgramsCount: number;
}

/**
 * Evaluates and formats a boot-in shader pre-warming cache report verifying that
 * geodesic, accretion disk, ergosphere, shockwave, and post-processing shader variants
 * were compiled ahead of first-frame dispatch.
 */
export function buildShaderPrewarmCacheReport(
  compiledVariants: readonly ShaderPrewarmVariantId[],
  prewarmDurationMs: number,
  webglProgramsCount = 0
): ShaderPrewarmCacheReport {
  const uniqueSet = new Set<ShaderPrewarmVariantId>(compiledVariants);
  const orderedVariants: ShaderPrewarmVariantId[] = [];
  const programKeys: string[] = [];

  for (const entry of SHADER_PREWARM_MANIFEST) {
    if (uniqueSet.has(entry.id)) {
      orderedVariants.push(entry.id);
      programKeys.push(entry.programKey);
    }
  }

  const requiredCoreIds: ShaderPrewarmVariantId[] = [
    'geodesic_full',
    'geodesic_approx',
    'accretion_disk_classic',
    'accretion_disk_volumetric',
    'ergosphere_static_limit',
  ];
  const isComplete = requiredCoreIds.every((id) => uniqueSet.has(id));

  return {
    isPrewarmed: orderedVariants.length > 0,
    isComplete,
    compiledVariants: orderedVariants,
    compiledProgramKeys: programKeys,
    totalRequiredVariants: SHADER_PREWARM_MANIFEST.length,
    prewarmDurationMs: Number(Math.max(0, prewarmDurationMs).toFixed(2)),
    webglProgramsCount: Math.max(orderedVariants.length, webglProgramsCount),
  };
}



