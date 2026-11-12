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

test('DEFAULT_VISUALIZER_SETTINGS defaults to classic 3D disk, ULTRA Kerr engine, and initializes High-Performance Mode & WebGL Depth-Peeling flags', async () => {
  const { DEFAULT_VISUALIZER_SETTINGS } = await import('../scene/BlackHoleScene');
  assert.equal(DEFAULT_VISUALIZER_SETTINGS.accretionDiskStyle, 'classic');
  assert.equal(DEFAULT_VISUALIZER_SETTINGS.kerrEngineTier, 'ultra');
  assert.equal(DEFAULT_VISUALIZER_SETTINGS.dynamicResolutionScaling, false);
  assert.equal(DEFAULT_VISUALIZER_SETTINGS.highPerformanceMode, false);
  assert.equal(DEFAULT_VISUALIZER_SETTINGS.webglDepthPeeling, false);
});

test('client-side audio completeness validation rejects truncated previews and verifies full songs', async () => {
  const {
    MIN_FULL_SONG_DURATION_SEC,
    isTruncatedPreviewUrl,
    validateMp3HeaderBytes,
    validateTrackForQueue,
    filterAndValidatePlaybackQueue,
    SONG_TRACKS,
  } = await import('../audio/trapQueenPlayer');
  const { IMPORTED_PLAYLIST_TRACKS } = await import('../audio/importedTracks');

  // 1. Verify preview URL detection
  assert.equal(
    isTruncatedPreviewUrl('https://p.scdn.co/mp3-preview/5489d8c3ef917017b7ecef79f95cde20d092f752'),
    true
  );
  assert.equal(
    isTruncatedPreviewUrl('https://podz-content.spotifycdn.com/audio/clips/0kqO3p/clip_288_60288.mp3'),
    true
  );
  assert.equal(isTruncatedPreviewUrl('/audio/again-full.mp3'), false);

  // 2. Verify MP3 binary header check (ID3v2 vs HTML 404 fallback)
  assert.equal(validateMp3HeaderBytes(new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00])), true);
  assert.equal(validateMp3HeaderBytes(new Uint8Array([0xff, 0xfb, 0x90, 0x64])), true);
  assert.equal(validateMp3HeaderBytes(new Uint8Array([0x3c, 0x21, 0x44, 0x4f])), false);

  // 3. Reject track that only has a 30s preview or truncated duration
  const truncatedTrackReport = validateTrackForQueue({
    id: 'truncated_test',
    title: 'Truncated Clip',
    subtitle: '30s Preview',
    artistName: 'Test Artist',
    badge: 'Test',
    durationSec: 29,
    durationLabel: '0:29',
    artworkUrl: '',
    accentColor: 'cyan',
    sources: ['https://p.scdn.co/mp3-preview/deadbeef'],
    bpm: 120,
  });
  assert.equal(truncatedTrackReport.valid, false);
  assert.equal(truncatedTrackReport.status, 'rejected_truncated');

  // 4. Repair track that has a 30s preview + a full-length local master
  const mixedTrackReport = validateTrackForQueue({
    id: 'mixed_test',
    title: 'Repaired Song',
    subtitle: 'Full Master',
    artistName: 'Test Artist',
    badge: 'Test',
    durationSec: 30,
    durationLabel: '0:30',
    artworkUrl: '',
    accentColor: 'amber',
    sources: ['https://p.scdn.co/mp3-preview/deadbeef', '/audio/again-full.mp3'],
    bpm: 148,
  });
  assert.equal(mixedTrackReport.valid, true);
  assert.equal(mixedTrackReport.status, 'repaired_sources');
  assert.deepEqual(mixedTrackReport.sanitizedTrack.sources, ['/audio/again-full.mp3']);
  assert.equal(mixedTrackReport.sanitizedTrack.durationSec, 313);

  // 5. Verify every track in SONG_TRACKS and IMPORTED_PLAYLIST_TRACKS is a complete full song
  const allTracks = [...SONG_TRACKS, ...IMPORTED_PLAYLIST_TRACKS];
  const queueResult = filterAndValidatePlaybackQueue(allTracks);
  assert.equal(queueResult.acceptedTracks.length, allTracks.length);
  assert.equal(queueResult.summary.rejectedTruncatedCount, 0);
  for (const track of queueResult.acceptedTracks) {
    assert.ok(
      track.durationSec >= MIN_FULL_SONG_DURATION_SEC,
      `Track ${track.id} duration (${track.durationSec}s) must be >= ${MIN_FULL_SONG_DURATION_SEC}s`
    );
    assert.ok(track.sources.length >= 1, `Track ${track.id} must have at least 1 valid source`);
    for (const src of track.sources) {
      assert.equal(
        isTruncatedPreviewUrl(src),
        false,
        `Track ${track.id} contains truncated preview source ${src}`
      );
    }
  }
});

test('DEFAULT_VISUALIZER_SETTINGS includes lowResolutionRender disabled by default', async () => {
  const { DEFAULT_VISUALIZER_SETTINGS } = await import('../scene/BlackHoleScene');
  assert.equal(DEFAULT_VISUALIZER_SETTINGS.lowResolutionRender, false);
  assert.equal(DEFAULT_VISUALIZER_SETTINGS.highPerformanceMode, false);
});



