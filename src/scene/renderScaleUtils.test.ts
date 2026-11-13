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
  DYNAMIC_RES_MIN_DPR,
  DYNAMIC_RES_WARMUP_FRAMES,
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
  THERMAL_DESKTOP_MAX_STEPS,
  THERMAL_DESKTOP_MIN_STEPS,
  THERMAL_MOBILE_MAX_STEPS,
  THERMAL_MOBILE_MIN_STEPS,
} from './renderScaleUtils';

test('computeBaseDesktopPixelRatio preserves Math.min(devicePixelRatio, 2.0) on Retina/mobile and >= 0.85-1.0 floor', () => {
  // Standard Retina desktop (1440px, DPR 2.0) -> 2.0
  assert.equal(computeBaseDesktopPixelRatio(1440, 2.0), 2.0);
  // 3x Super-Retina mobile/desktop (DPR 3.0) -> 2.0
  assert.equal(computeBaseDesktopPixelRatio(390, 3.0), 2.0);
  // Desktop with DPR 1.0 -> 1.0
  assert.equal(computeBaseDesktopPixelRatio(1440, 1.0), 1.0);
  // Ultrawide / 4K desktop (> 1920px, DPR 2.0) -> 2.0 (Retina preserved)
  assert.equal(computeBaseDesktopPixelRatio(2560, 2.0), 2.0);
  assert.equal(computeBaseDesktopPixelRatio(1921, 1.5), 1.5);
  // Mobile/tablet (<= 1024px, DPR 2.0) -> 2.0
  assert.equal(computeBaseDesktopPixelRatio(768, 2.0), 2.0);
  // Software GL still preserves >= 1.0 floor
  assert.equal(computeBaseDesktopPixelRatio(1440, 1.0, { isSoftwareGl: true }), 1.0);
  // Low-res mode uses 0.85 floor instead of 0.5
  assert.equal(
    computeBaseDesktopPixelRatio(1440, 2.0, { lowResolutionRender: true }),
    DYNAMIC_RES_MIN_DPR
  );
});

test('stepDynamicResolutionScale ignores first 60 warmup frames, steps down by 0.15 below 48 FPS (min 0.85), and recovers above 55 FPS', () => {
  assert.equal(DYNAMIC_RES_MIN_DPR, 0.85);
  assert.equal(DYNAMIC_RES_WARMUP_FRAMES, 60);

  // During initial 60 warmup frames (e.g. frame 0..59), does NOT downscale even if FPS is 30
  assert.equal(stepDynamicResolutionScale(2.0, 30, 2.0, DYNAMIC_RES_MIN_DPR, 0.15, 15), 2.0);
  assert.equal(stepDynamicResolutionScale(1.25, 28, 1.25, DYNAMIC_RES_MIN_DPR, 0.15, 59), 1.25);

  // After 60 warmup frames (frameCount >= 60 or omitted), steps down by 0.15 below 48 FPS
  assert.equal(stepDynamicResolutionScale(1.25, 42, 1.25, DYNAMIC_RES_MIN_DPR, 0.15, 65), 1.1);
  assert.equal(stepDynamicResolutionScale(1.1, 44, 1.25), 0.95);
  // Clamps to 0.85 floor (never dropping to 0.5-0.65)
  assert.equal(stepDynamicResolutionScale(0.95, 40, 1.25), 0.85);
  assert.equal(stepDynamicResolutionScale(0.85, 30, 1.25), 0.85);

  // On Retina (baseMax = 2.0), enforces >= 1.0 floor
  assert.equal(stepDynamicResolutionScale(1.1, 35, 2.0), 1.0);

  // Deadband (48..55 FPS) holds current scale steady without oscillation
  assert.equal(stepDynamicResolutionScale(0.95, 50, 1.25), 0.95);
  assert.equal(stepDynamicResolutionScale(0.95, 55, 1.25), 0.95);

  // Recovers above 55 FPS -> steps back up by 0.15 up to baseMax
  assert.equal(stepDynamicResolutionScale(0.85, 58, 1.25), 1.0);
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

test('evaluateDynamicShaderQualityTier preserves Full Geodesic tier unless FPS < 24 for >= 5s', () => {
  assert.equal(GEODESIC_SHADER_SNIPPETS['Full Geodesic'].includes('VOL_RAYMARCH_STEPS 5'), true);
  assert.equal(
    GEODESIC_SHADER_SNIPPETS['Approximated Null-Geodesic'].includes('VOL_RAYMARCH_STEPS 2'),
    true
  );

  // At 35 FPS (28.5ms/frame, > 24 FPS), stays in Full Geodesic even after 6 seconds
  const moderateTelemetry = classifyFrameBottleneck({
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
  const preservedAbove24Fps = evaluateDynamicShaderQualityTier(
    'Full Geodesic',
    moderateTelemetry,
    6000,
    'auto'
  );
  assert.equal(preservedAbove24Fps.swapped, false);
  assert.equal(preservedAbove24Fps.nextTier, 'Full Geodesic');

  // Below 24 FPS (48ms/frame): blocked by 5s hysteresis when elapsed < 5000ms
  const below24FpsTelemetry = classifyFrameBottleneck({
    interFrameMs: 48.0,
    rafTotalMs: 22.0,
    cpuSimPhysicsMs: 0.5,
    cpuCameraUniformsMs: 0.4,
    gpuScenePassMs: 16.5,
    gpuPostPassMs: 0.0,
    gpuTimerQueryMs: 20.0,
    renderPasses: 1,
    isOrbiting: false,
    pixelRatio: 1.0,
  });
  const blockedByHysteresis = evaluateDynamicShaderQualityTier(
    'Full Geodesic',
    below24FpsTelemetry,
    3500,
    'auto'
  );
  assert.equal(blockedByHysteresis.swapped, false);
  assert.equal(blockedByHysteresis.nextTier, 'Full Geodesic');

  // Swaps to 'Approximated Null-Geodesic' when < 24 FPS sustained for >= 5000ms
  const downgraded = evaluateDynamicShaderQualityTier(
    'Full Geodesic',
    below24FpsTelemetry,
    5200,
    'auto'
  );
  assert.equal(downgraded.swapped, true);
  assert.equal(downgraded.nextTier, 'Approximated Null-Geodesic');

  // Upgrades back to 'Full Geodesic' once telemetry recovers
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
    5200,
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

test('stepThermalThrottlingState preserves u_stepCount (160 desktop / 128 mobile, min 96-128) unless FPS < 24 for >= 5 continuous seconds', () => {
  let state = createInitialThermalState(1000, THERMAL_DESKTOP_MAX_STEPS);
  assert.equal(state.uStepCount, 160);
  assert.equal(state.level, 'NOMINAL');
  assert.equal(state.throttled, false);

  // 1) 30 FPS (33ms/frame, > 24 FPS) for 10 seconds -> NEVER reduces u_stepCount
  let nowMs = 1000;
  for (let i = 0; i < 100; i++) {
    nowMs += 100;
    state = stepThermalThrottlingState(state, {
      nowMs,
      interFrameMs: 33.0,
      gpuScenePassMs: 14.5,
      gpuTimerQueryMs: 19.0,
      rafTotalMs: 15.5,
      maxStepCount: THERMAL_DESKTOP_MAX_STEPS,
    });
  }
  assert.equal(state.throttled, false);
  assert.equal(state.uStepCount, 160);
  assert.equal(state.level, 'NOMINAL');

  // 2) 20 FPS (50ms/frame, < 24 FPS) for 4.5 seconds (< 5s threshold) -> still does NOT reduce u_stepCount
  for (let i = 0; i < 45; i++) {
    nowMs += 100;
    state = stepThermalThrottlingState(state, {
      nowMs,
      interFrameMs: 50.0,
      gpuScenePassMs: 22.0,
      gpuTimerQueryMs: 28.0,
      rafTotalMs: 24.0,
      maxStepCount: THERMAL_DESKTOP_MAX_STEPS,
    });
  }
  assert.equal(state.throttled, false);
  assert.equal(state.uStepCount, 160);

  // 3) Continue < 24 FPS past 5.0 continuous seconds (up to 8.0s total) -> throttles down to desktop floor (128)
  for (let i = 0; i < 35; i++) {
    nowMs += 100;
    state = stepThermalThrottlingState(state, {
      nowMs,
      interFrameMs: 50.0,
      gpuScenePassMs: 22.0,
      gpuTimerQueryMs: 28.0,
      rafTotalMs: 24.0,
      maxStepCount: THERMAL_DESKTOP_MAX_STEPS,
    });
  }
  assert.equal(state.throttled, true);
  assert.equal(state.uStepCount >= THERMAL_DESKTOP_MIN_STEPS, true);
  assert.equal(state.uStepCount < THERMAL_DESKTOP_MAX_STEPS, true);
  assert.equal(state.sustainedBottleneckMs >= 5000, true);
  assert.equal(state.level, 'CRITICAL');

  // 4) Mobile tier (maxStepCount = 128) never drops below 96 steps even under severe sustained < 24 FPS load
  let mobileState = createInitialThermalState(1000, THERMAL_MOBILE_MAX_STEPS);
  let mobileNow = 1000;
  for (let i = 0; i < 90; i++) {
    mobileNow += 100;
    mobileState = stepThermalThrottlingState(mobileState, {
      nowMs: mobileNow,
      interFrameMs: 55.0,
      gpuScenePassMs: 25.0,
      gpuTimerQueryMs: 30.0,
      rafTotalMs: 28.0,
      maxStepCount: THERMAL_MOBILE_MAX_STEPS,
    });
  }
  assert.equal(mobileState.throttled, true);
  assert.equal(mobileState.uStepCount >= THERMAL_MOBILE_MIN_STEPS, true);

  // 5) Simulate passive cooling over 60 FPS frames -> recovers back to 160 steps
  for (let i = 0; i < 100; i++) {
    nowMs += 200;
    state = stepThermalThrottlingState(state, {
      nowMs,
      interFrameMs: 16.5,
      gpuScenePassMs: 2.0,
      gpuTimerQueryMs: 3.2,
      rafTotalMs: 2.8,
      maxStepCount: THERMAL_DESKTOP_MAX_STEPS,
    });
  }

  assert.equal(state.uStepCount, 160);
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

import {
  computePresetTargetScale,
  createInitialAccretionDiskUniforms,
  createInitialKerrUniforms,
  mapParamsToKerrUniformValues,
  mapPresetStarAppearance,
  mapSpectralModeToIndex,
} from './kerrUniforms';
import {
  boyerLindquistToCartesian,
  cartesianToBoyerLindquist,
  cartesianToObserverSpherical,
  clientPointerToNdc,
  computeCameraPresetPose,
  intersectEquatorialPlanePolar,
  ndcToScreenCoords,
  sphericalToCartesian,
} from './cameraMath';
import {
  buildKerrEngineLogsJsonPayload,
  generateKerrEngineCalculationRun,
} from '../components/KerrRelativityEngineModal';
import { ASTROPHYSICAL_PRESETS, BlackHoleParams } from '../physics/gravitationalPhysics';

const TEST_BLACK_HOLE_PARAMS: BlackHoleParams = {
  objectCategory: 'black_hole',
  systemCategory: 'isolated',
  backgroundTheme: 'galactic_core',
  presetId: 'ton618',
  trueMassSolar: 6.6e10,
  massSolar: 100,
  spin: 0.98,
  accretionRate: 1.95,
  inclinationDeg: 78,
  dopplerStrength: 0.65,
  probeRadiusRs: 3.6,
  explodedSeparation: 0.0,
  timeScale: 1.0,
  wellDepthMultiplier: 2.2,
  gravitationalLensing: true,
  trueCosmicScale: false,
  spectralMode: 'xray',
  accretionState: 'active',
  layers: {
    accretionDisk: true,
    ergosphereCage: false,
    spacetimeGrid: true,
    orbitalStars: false,
    geodesicRays: false,
    pulsarBeams: true,
    magneticField: true,
    anatomyLines: false,
    microlensingStar: false,
  },
};

test('createInitialKerrUniforms and mapParamsToKerrUniformValues initialize and map Kerr uniforms accurately', () => {
  const uniforms = createInitialKerrUniforms({
    params: TEST_BLACK_HOLE_PARAMS,
    settings: { accretionDiskStyle: 'raymarched', bloomIntensity: 1.35, webglDepthPeeling: true },
    currentScale: 4.85,
    expansionProgress: 1.0,
    initialStepCount: 5.0,
  });

  assert.equal(uniforms.uScale.value, 4.85);
  assert.equal(uniforms.uSpin.value, 0.98);
  assert.equal(uniforms.uAccretionRate.value, 1.95);
  assert.equal(uniforms.uSpectralMode.value, mapSpectralModeToIndex('xray'));
  assert.equal(uniforms.uDiskStyle.value, 1.0);
  assert.equal(uniforms.uAccretionState.value, 1.0);
  assert.equal(uniforms.uDepthPeeling.value, 1.0);
  assert.equal(uniforms.u_stepCount.value, 5.0);

  const diskUniforms = createInitialAccretionDiskUniforms({
    params: TEST_BLACK_HOLE_PARAMS,
    settings: { accretionDiskStyle: 'classic', bloomIntensity: 1.0 },
  });
  assert.equal(diskUniforms.uDiskStyle.value, 0.0);
  assert.equal(diskUniforms.uDopplerCoeffs.value.x, 0.65);

  const targetScale = computePresetTargetScale(TEST_BLACK_HOLE_PARAMS);
  assert.ok(targetScale > 4.5 && targetScale <= 6.5);

  const starAppearance = mapPresetStarAppearance({
    ...TEST_BLACK_HOLE_PARAMS,
    objectCategory: 'luminous_star',
    presetId: 'crab_pulsar',
  });
  assert.ok(starAppearance.surfaceHexColor > 0);
  assert.ok(starAppearance.compactnessRatio > 0.1 && starAppearance.compactnessRatio < 0.7);
});

test('cameraMath round-trips Boyer-Lindquist/Cartesian coordinates and projects screen coordinates', () => {
  const cart = sphericalToCartesian(35.0, 60, 120);
  const obs = cartesianToObserverSpherical(cart, { x: 0, y: 0, z: 0 }, 1.75);
  assert.ok(Math.abs(obs.rRs - 20.0) < 1e-6);
  assert.ok(Math.abs(obs.thetaDeg - 60.0) < 1e-6);
  assert.ok(Math.abs(obs.phiDeg - 120.0) < 1e-6);

  const blCart = boyerLindquistToCartesian(4.5, Math.PI / 3, Math.PI / 4, 0.92);
  const blBack = cartesianToBoyerLindquist(blCart.x, blCart.y, blCart.z, 0.92);
  assert.ok(Math.abs(blBack.rRg - 4.5) < 1e-5);
  assert.ok(Math.abs(blBack.thetaRad - Math.PI / 3) < 1e-5);
  assert.ok(Math.abs(blBack.phiRad - Math.PI / 4) < 1e-5);

  const ndc = clientPointerToNdc(640, 360, { left: 0, top: 0, width: 1280, height: 720 });
  assert.ok(Math.abs(ndc.x) < 1e-6);
  assert.ok(Math.abs(ndc.y) < 1e-6);

  const screenPt = ndcToScreenCoords(0.0, 0.0, 0.5, 1280, 720, 15);
  assert.equal(screenPt.screenX, 640);
  assert.equal(screenPt.screenY, 360);
  assert.equal(screenPt.isVisible, true);

  const eqHit = intersectEquatorialPlanePolar(
    { x: 0, y: 10, z: 0 },
    { x: 0.35, y: -1, z: 0 },
    1.0,
    1.75
  );
  assert.ok(eqHit !== null);
  assert.ok(Math.abs(eqHit.rRs - 2.0) < 1e-6);

  const eqPose = computeCameraPresetPose('equatorial', 1.0, 78, false);
  assert.ok(eqPose !== null);
  assert.equal(eqPose.position.x, 0);
});

test('buildKerrEngineLogsJsonPayload formats the entire calculation history as valid JSON', () => {
  const preset1 = ASTROPHYSICAL_PRESETS[0];
  const preset2 = ASTROPHYSICAL_PRESETS[1] || ASTROPHYSICAL_PRESETS[0];
  const run1 = generateKerrEngineCalculationRun(preset1, TEST_BLACK_HOLE_PARAMS, 'ultra');
  const run2 = generateKerrEngineCalculationRun(
    preset2,
    { ...TEST_BLACK_HOLE_PARAMS, presetId: 'sgra', spin: 0.9 },
    'advanced'
  );
  const jsonStr = buildKerrEngineLogsJsonPayload([run2, run1], {
    activeTierId: 'ultra',
    codebaseLinesLabel: '35,120 lines',
    codebaseTotalLines: 35120,
    codebaseTotalChars: 1420000,
  });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.totalCalculations, 2);
  assert.equal(parsed.activeTierId, 'ultra');
  assert.equal(parsed.codebaseTelemetry.linesLabel, '35,120 lines');
  assert.equal(parsed.calculationHistory.length, 2);
  assert.equal(parsed.calculationHistory[0].id, run2.id);
  assert.equal(parsed.calculationHistory[1].id, run1.id);
});





