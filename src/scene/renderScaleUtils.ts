export interface PixelRatioCapOptions {
  lowResolutionRender?: boolean;
  highPerformanceMode?: boolean;
  isSoftwareGl?: boolean;
}

export const DYNAMIC_RES_MIN_DPR = 0.75;
export const DYNAMIC_RES_STEP_DPR = 0.15;
export const DYNAMIC_RES_LOW_FPS_THRESHOLD = 48;
export const DYNAMIC_RES_RECOVER_FPS_THRESHOLD = 55;
export const DYNAMIC_RES_ROLLING_WINDOW = 30;
export const ORBIT_RELAXED_STEP_MULTIPLIER = 1.45;
export const TELEMETRY_MAX_HZ_INTERVAL_MS = 100;

/**
 * Computes the baseline capped devicePixelRatio:
 * - Desktop viewports (> 1024px): capped at 1.25 by default, or 1.0 when > 1920px wide (or high-performance mode).
 * - Mobile/tablet (<= 1024px): capped at 1.35.
 * - Low-resolution debug mode: 0.50.
 * - Software GL (e.g. headless SwiftShader): 0.65 desktop / 0.85 compact.
 */
export function computeBaseDesktopPixelRatio(
  viewportWidth: number,
  devicePixelRatio: number,
  options: PixelRatioCapOptions = {}
): number {
  if (options.lowResolutionRender) {
    return 0.5;
  }

  const isDesktop = viewportWidth > 1024;
  if (options.isSoftwareGl) {
    return isDesktop ? 0.65 : 0.85;
  }

  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1.0;

  let maxDpr: number;
  if (viewportWidth > 1920) {
    maxDpr = 1.0;
  } else if (isDesktop) {
    maxDpr = options.highPerformanceMode ? 1.0 : 1.25;
  } else {
    maxDpr = 1.35;
  }

  return Math.min(safeDpr, maxDpr);
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
 * Steps the dynamic internal pixel ratio down by 0.15 (to a minimum of 0.75) when rolling
 * 30-frame average FPS drops below 48, and steps back up toward baseMaxPixelRatio when FPS > 55.
 */
export function stepDynamicResolutionScale(
  currentPixelRatio: number,
  rollingAvgFps: number,
  baseMaxPixelRatio: number,
  minPixelRatio = DYNAMIC_RES_MIN_DPR,
  step = DYNAMIC_RES_STEP_DPR
): number {
  const effectiveMin = Math.min(minPixelRatio, baseMaxPixelRatio);
  const clampedCurrent = Math.max(effectiveMin, Math.min(baseMaxPixelRatio, currentPixelRatio));

  if (baseMaxPixelRatio <= effectiveMin) {
    return baseMaxPixelRatio;
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

export const SHADER_QUALITY_HYSTERESIS_MS = 2500;

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
 * the instrumented performance telemetry averages and a hysteresis cooldown.
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

  // Enforce cooldown between automatic tier swaps to prevent visual oscillation
  if (elapsedSinceLastSwapMs < hysteresisMs) {
    return {
      nextTier: currentTier,
      swapped: false,
      reason: 'Within hysteresis stabilization window.',
    };
  }

  const effectiveGpuMs =
    averagedTelemetry.gpuTimerQueryMs !== null && averagedTelemetry.gpuTimerQueryMs > 0
      ? Math.max(averagedTelemetry.gpuScenePassMs, averagedTelemetry.gpuTimerQueryMs)
      : averagedTelemetry.gpuScenePassMs;

  if (currentTier === 'Full Geodesic') {
    const isGpuBottlenecked =
      averagedTelemetry.classification === 'GPU_FRAGMENT_BOUND' ||
      (averagedTelemetry.interFrameMs > 20.8 && effectiveGpuMs >= 4.5) ||
      effectiveGpuMs >= 9.5;

    if (isGpuBottlenecked) {
      return {
        nextTier: 'Approximated Null-Geodesic',
        swapped: true,
        reason: `Telemetry avg ${averagedTelemetry.interFrameMs.toFixed(
          2
        )}ms/frame (GPU Scene Pass ${averagedTelemetry.gpuScenePassMs.toFixed(2)}ms${
          averagedTelemetry.gpuTimerQueryMs !== null
            ? `, HW GPU ${averagedTelemetry.gpuTimerQueryMs.toFixed(2)}ms`
            : ''
        }) exceeded Full Geodesic budget -> swapping to 'Approximated Null-Geodesic'.`,
      };
    }
  } else {
    // Currently in 'Approximated Null-Geodesic': upgrade back to 'Full Geodesic' once frame times and GPU pass have comfortable headroom
    const canUpgradeToFull =
      averagedTelemetry.classification === 'OPTIMAL_60FPS' &&
      averagedTelemetry.interFrameMs <= 17.6 &&
      averagedTelemetry.gpuScenePassMs <= 3.8 &&
      (averagedTelemetry.gpuTimerQueryMs === null || averagedTelemetry.gpuTimerQueryMs <= 7.5);

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
  /** Current raymarching step count fed into the shader uniform u_stepCount (1..5) */
  uStepCount: number;
  /** Maximum unthrottled step count for the current quality tier */
  maxStepCount: number;
  /** Estimated passive-cooling thermal load percentage (0..100%) */
  thermalLoadPct: number;
  /** Estimated GPU die temperature in Celsius for passive/fanless chassis model (38..92°C) */
  estimatedTempC: number;
  /** Continuous duration in ms that GPU/frame times have remained above the sustained bottleneck threshold */
  sustainedBottleneckMs: number;
  /** Timestamp (performance.now() ms) of the last thermal state integration step */
  lastSampleTimeMs: number;
  /** Discrete thermal throttling state classification */
  level: ThermalThrottleLevel;
  /** True when uStepCount has been reduced below maxStepCount due to thermal load */
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

export const THERMAL_DEFAULT_MAX_STEPS = 5;
export const THERMAL_MIN_STEPS = 1;
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
 * passive-cooling RC thermal model (faster heating under sustained GPU load, slower passive dissipation)
 * and computes the reduced raymarching ray count (u_stepCount) to prevent thermal runaway on fanless devices.
 */
export function stepThermalThrottlingState(
  prevState: ThermalThrottleState,
  sample: ThermalSampleInput
): ThermalThrottleState {
  const maxSteps = Math.max(
    THERMAL_MIN_STEPS,
    Math.round(sample.maxStepCount ?? prevState.maxStepCount ?? THERMAL_DEFAULT_MAX_STEPS)
  );
  const rawDtMs =
    prevState.lastSampleTimeMs > 0 ? sample.nowMs - prevState.lastSampleTimeMs : sample.interFrameMs;
  const dtMs = Number.isFinite(rawDtMs) ? Math.max(1.0, Math.min(500.0, rawDtMs)) : 16.67;

  const effectiveGpuMs =
    sample.gpuTimerQueryMs !== null && sample.gpuTimerQueryMs > 0
      ? Math.max(sample.gpuScenePassMs, sample.gpuTimerQueryMs)
      : Math.max(sample.gpuScenePassMs, sample.rafTotalMs * 0.72);

  // Instantaneous GPU/frame load ratio relative to a 16.67ms (60 FPS) / 8.0ms GPU pass envelope
  const frameLoadRatio = Math.max(0, (sample.interFrameMs - 15.5) / 26.0);
  const gpuLoadRatio = Math.max(0, (effectiveGpuMs - 4.2) / 14.0);
  const instantLoadPct = Math.max(0, Math.min(100, Math.max(frameLoadRatio, gpuLoadRatio) * 100));

  const isBottleneckedFrame = sample.interFrameMs > 20.5 || effectiveGpuMs > 8.5;
  const sustainedBottleneckMs = isBottleneckedFrame
    ? Math.min(30000, prevState.sustainedBottleneckMs + dtMs)
    : Math.max(0, prevState.sustainedBottleneckMs - dtMs * 1.5);

  // Asymmetric RC thermal time constants: passive chassis heats up in ~2.6s under sustained bottleneck,
  // and cools down more gradually (~5.2s) once GPU load drops.
  const tauMs = instantLoadPct > prevState.thermalLoadPct ? 2600.0 : 5200.0;
  const alpha = 1.0 - Math.exp(-dtMs / tauMs);
  const sustainedBoostPct = Math.min(28.0, (sustainedBottleneckMs / 4000.0) * 22.0);
  const targetThermalLoadPct = Math.min(100, instantLoadPct * 0.82 + sustainedBoostPct);

  const nextThermalLoadPct = Number(
    Math.max(0, Math.min(100, prevState.thermalLoadPct + (targetThermalLoadPct - prevState.thermalLoadPct) * alpha)).toFixed(1)
  );

  const estimatedTempC = Number(
    (
      THERMAL_AMBIENT_TEMP_C +
      (THERMAL_MAX_TEMP_C - THERMAL_AMBIENT_TEMP_C) * (nextThermalLoadPct / 100)
    ).toFixed(1)
  );

  let level: ThermalThrottleLevel = 'NOMINAL';
  let stepReduction = 0;

  if (nextThermalLoadPct >= 78 || sustainedBottleneckMs >= 4800) {
    level = 'CRITICAL';
    stepReduction = 3;
  } else if (nextThermalLoadPct >= 54 || sustainedBottleneckMs >= 2600) {
    level = 'THROTTLED';
    stepReduction = 2;
  } else if (nextThermalLoadPct >= 32 || sustainedBottleneckMs >= 1200) {
    level = 'WARM';
    stepReduction = 1;
  }

  const uStepCount = Math.max(THERMAL_MIN_STEPS, Math.min(maxSteps, maxSteps - stepReduction));

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
  const effectiveGpuMs =
    input.gpuTimerQueryMs !== null && input.gpuTimerQueryMs > 0
      ? Math.max(gpuSubmitTotalMs, input.gpuTimerQueryMs)
      : gpuSubmitTotalMs;
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



