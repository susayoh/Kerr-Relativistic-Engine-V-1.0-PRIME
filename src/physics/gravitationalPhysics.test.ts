import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  buildGeodesicTrajectoryCsv,
  computeDetailedTimeDilation,
  computeNullGeodesic,
  computeRelativisticMetrics,
  isStellarCategory,
} from './gravitationalPhysics';

const SAMPLE_PARAMS: BlackHoleParams = {
  objectCategory: 'black_hole',
  systemCategory: 'isolated',
  backgroundTheme: 'galactic_core',
  presetId: 'ton618',
  trueMassSolar: 66000000000,
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
  spectralMode: 'blackbody',
  accretionState: 'quiescent',
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

test('isStellarCategory identifies compact remnants and luminous stars', () => {
  assert.equal(isStellarCategory('black_hole'), false);
  assert.equal(isStellarCategory('star'), true);
  assert.equal(isStellarCategory('luminous_star'), true);
  assert.equal(isStellarCategory(undefined), false);
});

test('computeRelativisticMetrics returns valid Kerr and Schwarzschild radii', () => {
  const kerrMetrics = computeRelativisticMetrics(SAMPLE_PARAMS);
  assert.ok(kerrMetrics.eventHorizonRg > 1.0 && kerrMetrics.eventHorizonRg < 2.0);
  assert.ok(kerrMetrics.iscoProgradeRg < 6.0);
  assert.ok(kerrMetrics.schwarzschildRadiusKm > 0);
  assert.equal(kerrMetrics.hasPhysicalSurface, false);

  const schwarzschildMetrics = computeRelativisticMetrics({
    ...SAMPLE_PARAMS,
    spin: 0,
  });
  assert.ok(Math.abs(schwarzschildMetrics.eventHorizonRg - 2.0) < 1e-6);
  assert.ok(Math.abs(schwarzschildMetrics.iscoProgradeRg - 6.0) < 1e-4);
});

test('computeDetailedTimeDilation increases near the event horizon', () => {
  const near = computeDetailedTimeDilation(1.5, 0.9);
  const far = computeDetailedTimeDilation(8.0, 0.9);
  assert.ok(near.dt_dtau > far.dt_dtau);
  assert.ok(near.redshiftZ > far.redshiftZ);
  assert.ok(near.dtau_dt > 0 && near.dtau_dt <= 1);
});

test('computeNullGeodesic classifies captured vs scattered rays', () => {
  const captured = computeNullGeodesic(0.4, 1.75, 0.9);
  assert.equal(captured.outcome, 'captured');
  assert.ok(captured.points.length > 5);

  const scattered = computeNullGeodesic(8.5, 1.75, 0.9);
  assert.equal(scattered.outcome, 'scattered');
  assert.ok(scattered.points.length > 10);
});

test('buildGeodesicTrajectoryCsv formats header and rows with valid columns', () => {
  const ray = computeNullGeodesic(3.2, 1.75, SAMPLE_PARAMS.spin);
  const csv = buildGeodesicTrajectoryCsv([ray], SAMPLE_PARAMS, 1.75);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, ray.points.length + 1);
  assert.ok(lines[0].startsWith('ray_id,step_index,is_live_pulse_head,outcome'));
  assert.ok(ASTROPHYSICAL_PRESETS.length >= 5);
});
