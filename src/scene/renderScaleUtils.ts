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
}

export interface ShaderPassTimingSnapshot extends ShaderPassTimingInput {
  unaccountedFrameGapMs: number;
  classification: LagBottleneckClassification;
  diagnosisSummary: string;
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

/**
 * Classifies whether frame lag stems from GPU fragment complexity, CPU-bound requestAnimationFrame
 * work, or iframe compositor / GPU command buffer synchronization wait between rAF callbacks.
 */
export function classifyFrameBottleneck(
  input: ShaderPassTimingInput
): ShaderPassTimingSnapshot {
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
      } @ ${input.pixelRatio.toFixed(2)}x DPR; CPU rAF pre-render took ${cpuTotalMs.toFixed(2)}ms).`;
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
    unaccountedFrameGapMs,
    classification,
    diagnosisSummary,
  };
}

