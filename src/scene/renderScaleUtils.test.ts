import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShaderPrewarmCacheReport,
  classifyFrameBottleneck,
  clearKerrPerfMarksAndMeasures,
  computeBaseDesktopPixelRatio,
  computeOrbitStepMultiplier,
  computeRollingAverageFps,
  createInitialThermalState,
  evaluateDynamicShaderQualityTier,
  GEODESIC_SHADER_SNIPPETS,
  KERR_PERF_MARKS,
  KERR_PERF_MEASURES,
  safePerfMark,
  safePerfMeasureMs,
  SHADER_PREWARM_MANIFEST,
  shouldEmitThrottledTelemetry,
  stepDynamicResolutionScale,
  stepThermalThrottlingState,
} from './renderScaleUtils';

test('computeBaseDesktopPixelRatio clamps >1024px to 1.25 and >1920px to 1.0', () => {
  // Standard Retina desktop (1440px, DPR 2.0) -> 1.25
  assert.equal(computeBaseDesktopPixelRatio(1440, 2.0), 1.25);
  // Desktop with DPR 1.0 -> 1.0
  assert.equal(computeBaseDesktopPixelRatio(1440, 1.0), 1.0);
  // Ultrawide / 4K desktop (> 1920px, DPR 2.0) -> 1.0
  assert.equal(computeBaseDesktopPixelRatio(2560, 2.0), 1.0);
  assert.equal(computeBaseDesktopPixelRatio(1921, 1.5), 1.0);
  // Exactly 1920px still uses 1.25 cap
  assert.equal(computeBaseDesktopPixelRatio(1920, 2.0), 1.25);
  // Mobile/tablet (<= 1024px) caps at 1.35
  assert.equal(computeBaseDesktopPixelRatio(768, 2.0), 1.35);
  // Low-res mode always 0.5
  assert.equal(computeBaseDesktopPixelRatio(1440, 2.0, { lowResolutionRender: true }), 0.5);
});

test('stepDynamicResolutionScale steps down by 0.15 below 48 FPS (min 0.75) and recovers above 55 FPS', () => {
  // Starts at 1.25, FPS drops to 42 -> steps down to 1.10
  assert.equal(stepDynamicResolutionScale(1.25, 42, 1.25), 1.1);
  // Still 44 FPS -> steps down to 0.95
  assert.equal(stepDynamicResolutionScale(1.1, 44, 1.25), 0.95);
  // Still 40 FPS -> steps down to 0.80 -> then clamped to 0.75
  assert.equal(stepDynamicResolutionScale(0.95, 40, 1.25), 0.8);
  assert.equal(stepDynamicResolutionScale(0.8, 40, 1.25), 0.75);
  assert.equal(stepDynamicResolutionScale(0.75, 30, 1.25), 0.75);

  // Deadband (48..55 FPS) holds current scale steady without oscillation
  assert.equal(stepDynamicResolutionScale(0.95, 50, 1.25), 0.95);
  assert.equal(stepDynamicResolutionScale(0.95, 55, 1.25), 0.95);

  // Recovers above 55 FPS -> steps back up by 0.15 up to baseMax
  assert.equal(stepDynamicResolutionScale(0.75, 58, 1.25), 0.9);
  assert.equal(stepDynamicResolutionScale(1.15, 60, 1.25), 1.25);
});

test('computeRollingAverageFps calculates accurate FPS across a 30-frame window', () => {
  const frames60 = Array.from({ length: 30 }, () => 16.6667);
  assert.equal(Math.round(computeRollingAverageFps(frames60)), 60);

  const frames40 = Array.from({ length: 30 }, () => 25.0);
  assert.equal(Math.round(computeRollingAverageFps(frames40)), 40);
});

test('computeOrbitStepMultiplier scales dt by 1.45 while orbiting and 1.0 when idle', () => {
  assert.equal(computeOrbitStepMultiplier(false), 1.0);
  assert.equal(computeOrbitStepMultiplier(true), 1.45);
  assert.equal(computeOrbitStepMultiplier(0), 1.0);
  assert.equal(computeOrbitStepMultiplier(1), 1.45);
});

test('shouldEmitThrottledTelemetry enforces >= 100ms (max 10Hz) interval', () => {
  assert.equal(shouldEmitThrottledTelemetry(150, 100, 100), false);
  assert.equal(shouldEmitThrottledTelemetry(199, 100, 50), false); // Enforces 100ms floor even if caller passes 50ms
  assert.equal(shouldEmitThrottledTelemetry(200, 100, 100), true);
  assert.equal(shouldEmitThrottledTelemetry(260, 100, 160), true);
});

test('safePerfMark and safePerfMeasureMs record User Timing durations and clear cleanly', () => {
  safePerfMark(KERR_PERF_MARKS.gpuScenePassStart);
  safePerfMark(KERR_PERF_MARKS.gpuScenePassEnd);
  const measuredMs = safePerfMeasureMs(
    KERR_PERF_MEASURES.gpuScenePass,
    KERR_PERF_MARKS.gpuScenePassStart,
    KERR_PERF_MARKS.gpuScenePassEnd
  );
  assert.equal(typeof measuredMs, 'number');
  assert.equal(measuredMs >= 0, true);
  clearKerrPerfMarksAndMeasures();
});

test('classifyFrameBottleneck distinguishes GPU fragment, CPU rAF, and iframe compositor bottlenecks', () => {
  const optimal = classifyFrameBottleneck({
    interFrameMs: 16.6,
    rafTotalMs: 3.2,
    cpuSimPhysicsMs: 0.6,
    cpuCameraUniformsMs: 0.5,
    gpuScenePassMs: 2.1,
    gpuPostPassMs: 0.0,
    gpuTimerQueryMs: 4.5,
    renderPasses: 1,
    isOrbiting: false,
    pixelRatio: 1.25,
  });
  assert.equal(optimal.classification, 'OPTIMAL_60FPS');

  const gpuBound = classifyFrameBottleneck({
    interFrameMs: 26.4,
    rafTotalMs: 15.2,
    cpuSimPhysicsMs: 0.8,
    cpuCameraUniformsMs: 0.7,
    gpuScenePassMs: 11.4,
    gpuPostPassMs: 2.3,
    gpuTimerQueryMs: 14.8,
    renderPasses: 2,
    isOrbiting: true,
    pixelRatio: 1.25,
  });
  assert.equal(gpuBound.classification, 'GPU_FRAGMENT_BOUND');

  const cpuBound = classifyFrameBottleneck({
    interFrameMs: 24.5,
    rafTotalMs: 12.6,
    cpuSimPhysicsMs: 8.4,
    cpuCameraUniformsMs: 2.1,
    gpuScenePassMs: 2.1,
    gpuPostPassMs: 0.0,
    gpuTimerQueryMs: null,
    renderPasses: 1,
    isOrbiting: false,
    pixelRatio: 1.0,
  });
  assert.equal(cpuBound.classification, 'CPU_RAF_BOUND');

  const compositorWait = classifyFrameBottleneck({
    interFrameMs: 28.0,
    rafTotalMs: 2.8,
    cpuSimPhysicsMs: 0.5,
    cpuCameraUniformsMs: 0.4,
    gpuScenePassMs: 1.9,
    gpuPostPassMs: 0.0,
    gpuTimerQueryMs: 3.1,
    renderPasses: 1,
    isOrbiting: true,
    pixelRatio: 1.0,
  });
  assert.equal(compositorWait.classification, 'IFRAME_COMPOSITOR_OR_VSYNC_WAIT');
  assert.equal(compositorWait.unaccountedFrameGapMs, 25.2);
});

test('evaluateDynamicShaderQualityTier swaps between Full Geodesic and Approximated Null-Geodesic based on telemetry', () => {
  assert.equal(GEODESIC_SHADER_SNIPPETS['Full Geodesic'].includes('VOL_RAYMARCH_STEPS 5'), true);
  assert.equal(
    GEODESIC_SHADER_SNIPPETS['Approximated Null-Geodesic'].includes('VOL_RAYMARCH_STEPS 2'),
    true
  );

  const gpuBoundTelemetry = classifyFrameBottleneck({
    interFrameMs: 28.5,
    rafTotalMs: 12.0,
    cpuSimPhysicsMs: 0.5,
    cpuCameraUniformsMs: 0.4,
    gpuScenePassMs: 11.1,
    gpuPostPassMs: 0.0,
    gpuTimerQueryMs: 16.2,
    renderPasses: 1,
    isOrbiting: false,
    pixelRatio: 1.0,
  });

  // Respects hysteresis cooldown when elapsedSinceLastSwapMs < 2500ms
  const blockedByHysteresis = evaluateDynamicShaderQualityTier(
    'Full Geodesic',
    gpuBoundTelemetry,
    800,
    'auto'
  );
  assert.equal(blockedByHysteresis.swapped, false);
  assert.equal(blockedByHysteresis.nextTier, 'Full Geodesic');

  // Swaps to 'Approximated Null-Geodesic' when GPU_FRAGMENT_BOUND after cooldown
  const downgraded = evaluateDynamicShaderQualityTier(
    'Full Geodesic',
    gpuBoundTelemetry,
    3000,
    'auto'
  );
  assert.equal(downgraded.swapped, true);
  assert.equal(downgraded.nextTier, 'Approximated Null-Geodesic');

  // Upgrades back to 'Full Geodesic' once telemetry recovers to OPTIMAL_60FPS with low GPU pass time
  const recoveredTelemetry = classifyFrameBottleneck({
    interFrameMs: 16.5,
    rafTotalMs: 3.2,
    cpuSimPhysicsMs: 0.5,
    cpuCameraUniformsMs: 0.3,
    gpuScenePassMs: 2.4,
    gpuPostPassMs: 0.0,
    gpuTimerQueryMs: 4.8,
    renderPasses: 1,
    isOrbiting: false,
    pixelRatio: 1.0,
    shaderQualityTier: 'Approximated Null-Geodesic',
  });
  const upgraded = evaluateDynamicShaderQualityTier(
    'Approximated Null-Geodesic',
    recoveredTelemetry,
    3200,
    'auto'
  );
  assert.equal(upgraded.swapped, true);
  assert.equal(upgraded.nextTier, 'Full Geodesic');

  // Supports explicit manual override
  const manualApprox = evaluateDynamicShaderQualityTier(
    'Full Geodesic',
    recoveredTelemetry,
    100,
    'Approximated Null-Geodesic'
  );
  assert.equal(manualApprox.swapped, true);
  assert.equal(manualApprox.nextTier, 'Approximated Null-Geodesic');
});

test('stepThermalThrottlingState reduces u_stepCount under sustained GPU bottlenecks via performance.now() and recovers on cooling', () => {
  let state = createInitialThermalState(1000, 5);
  assert.equal(state.uStepCount, 5);
  assert.equal(state.level, 'NOMINAL');
  assert.equal(state.throttled, false);

  // Simulate 5.5 seconds of sustained GPU bottlenecks (36ms interFrame, 18ms GPU pass)
  let nowMs = 1000;
  for (let i = 0; i < 55; i++) {
    nowMs += 100;
    state = stepThermalThrottlingState(state, {
      nowMs,
      interFrameMs: 36.0,
      gpuScenePassMs: 14.5,
      gpuTimerQueryMs: 19.0,
      rafTotalMs: 15.5,
      maxStepCount: 5,
    });
  }

  assert.equal(state.throttled, true);
  assert.equal(state.uStepCount <= 3, true);
  assert.equal(state.estimatedTempC > 55, true);
  assert.equal(state.sustainedBottleneckMs >= 4800, true);
  assert.equal(state.level, 'CRITICAL');

  // Simulate passive cooling over 20 seconds of light 60 FPS frames (16.6ms interFrame, 2.0ms GPU pass)
  for (let i = 0; i < 100; i++) {
    nowMs += 200;
    state = stepThermalThrottlingState(state, {
      nowMs,
      interFrameMs: 16.5,
      gpuScenePassMs: 2.0,
      gpuTimerQueryMs: 3.2,
      rafTotalMs: 2.8,
      maxStepCount: 5,
    });
  }

  assert.equal(state.uStepCount, 5);
  assert.equal(state.level, 'NOMINAL');
  assert.equal(state.throttled, false);
});

test('buildShaderPrewarmCacheReport verifies geodesic, accretion disk, and ergosphere variants are pre-warmed', () => {
  const allIds = SHADER_PREWARM_MANIFEST.map((m) => m.id);
  const fullReport = buildShaderPrewarmCacheReport(allIds, 6.45, 19);

  assert.equal(fullReport.isPrewarmed, true);
  assert.equal(fullReport.isComplete, true);
  assert.equal(fullReport.compiledVariants.includes('geodesic_full'), true);
  assert.equal(fullReport.compiledVariants.includes('geodesic_approx'), true);
  assert.equal(fullReport.compiledVariants.includes('accretion_disk_classic'), true);
  assert.equal(fullReport.compiledVariants.includes('accretion_disk_volumetric'), true);
  assert.equal(fullReport.compiledVariants.includes('ergosphere_static_limit'), true);
  assert.equal(fullReport.prewarmDurationMs, 6.45);
  assert.equal(fullReport.webglProgramsCount, 19);

  // Incomplete if ergosphere is missing
  const partialReport = buildShaderPrewarmCacheReport(['geodesic_full', 'accretion_disk_classic'], 2.1, 4);
  assert.equal(partialReport.isPrewarmed, true);
  assert.equal(partialReport.isComplete, false);
});




