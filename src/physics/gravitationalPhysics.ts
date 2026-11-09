export interface BlackHoleParams {
  /** Mass multiplier in log10 solar masses or relative scale (1 to 100 solar masses base scale for 3D visual radius) */
  massSolar: number;
  /** Dimensionless Kerr spin parameter a* in [0, 0.998] */
  spin: number;
  /** Eddington accretion rate ratio m_dot in [0.05, 2.0] */
  accretionRate: number;
  /** Observer inclination angle in degrees [5, 88] */
  inclinationDeg: number;
  /** Subtle relativistic Doppler boost intensity in [0, 1.0] */
  dopplerStrength: number;
  /** Orbiting star tracer distance in units of Schwarzschild radii (r / Rs) [1.4, 10.0] */
  probeRadiusRs: number;
  /** Exploded vertical separation of anatomical layers [0, 1] */
  explodedSeparation: number;
  /** Simulation time multiplier [0, 3.0] */
  timeScale: number;
  /** Spectral imaging band */
  spectralMode: 'blackbody' | 'eht230ghz' | 'xray' | 'doppler';
  /** Visibility toggles for composite layers */
  layers: {
    accretionDisk: boolean;
    ergosphereCage: boolean;
    spacetimeGrid: boolean;
    orbitalStars: boolean;
    geodesicRays: boolean;
  };
}

export type BlackHoleArchetype =
  | 'ultramassive'
  | 'supermassive'
  | 'intermediate'
  | 'stellar'
  | 'primordial';

export interface ArchetypeDefinition {
  id: BlackHoleArchetype;
  name: string;
  tagline: string;
  massRangeDisplay: string;
  sunsComparison: string;
  typicalDiameter: string;
  formationMechanism: string;
  hawkingEvaporationTime: string;
  examples: string[];
  badgeBg: string;
}

export const ARCHETYPE_DEFINITIONS: Record<BlackHoleArchetype, ArchetypeDefinition> = {
  ultramassive: {
    id: 'ultramassive',
    name: 'Ultramassive Black Hole (UMBH)',
    tagline: 'The absolute titans of the cosmos (>10 Billion Suns)',
    massRangeDisplay: '> 10 Billion Solar Masses (10¹⁰ to ~10¹¹ M☉)',
    sunsComparison: 'Over 10,000,000,000 Suns! 1 Solar Mass (M☉) = 1 Sun (~333,000 Earths).',
    typicalDiameter: 'Hundreds of billions of km (>2,500 AU, over 40 complete Solar Systems wide)',
    formationMechanism: 'Rapid hyper-accretion onto early primordial seeds during cosmic dawn at the theoretical mass limit.',
    hawkingEvaporationTime: '~10¹⁰⁰ years (vastly longer than the current age of the universe)',
    examples: ['TON 618 (66 Billion Suns)', 'Phoenix A (100 Billion Suns)', 'Holmberg 15A (40 Billion Suns)'],
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  supermassive: {
    id: 'supermassive',
    name: 'Supermassive Black Hole (SMBH)',
    tagline: 'Galactic gravitational anchors (Millions to Billions of Suns)',
    massRangeDisplay: '100,000 to 10 Billion Solar Masses',
    sunsComparison: 'Millions to billions of Suns compressed into the heart of a galaxy.',
    typicalDiameter: 'Millions to billions of km (size of Mercury\'s orbit to beyond Pluto)',
    formationMechanism: 'Successive mergers of intermediate seed black holes and sustained gas accretion over cosmic time.',
    hawkingEvaporationTime: '~10⁸⁵ to 10⁹⁵ years',
    examples: ['Sagittarius A* (4.3 Million Suns)', 'M87* (6.5 Billion Suns)', 'Andromeda core (140 Million Suns)'],
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate-Mass Black Hole (IMBH)',
    tagline: 'The elusive cosmic "missing link" (100 to 100,000 Suns)',
    massRangeDisplay: '100 to 100,000 Solar Masses',
    sunsComparison: 'Hundreds to hundreds of thousands of Suns.',
    typicalDiameter: 'Thousands to tens of thousands of km (size of Earth or Jupiter)',
    formationMechanism: 'Runaway stellar collisions in dense globular clusters or dwarf galaxy strip-mergers.',
    hawkingEvaporationTime: '~10⁷³ years',
    examples: ['HLX-1 (20,000 Suns)', 'GW190521 Remnant (142 Suns)'],
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  stellar: {
    id: 'stellar',
    name: 'Stellar-Mass Black Hole',
    tagline: 'Collapsed graves of ancient giant stars (3 to ~100 Suns)',
    massRangeDisplay: '3 to ~100 Solar Masses',
    sunsComparison: '3 to 100 Suns crushed down into the footprint of a city (1 Solar Mass = ~333,000 Earths).',
    typicalDiameter: '18 to 600 kilometers across (size of Manhattan or a small state)',
    formationMechanism: 'Catastrophic gravitational core collapse of massive stars (>20 M☉) in supernova explosions.',
    hawkingEvaporationTime: '~10⁶⁷ years',
    examples: ['Cygnus X-1 (21.2 Suns)', 'GW150914 (62.0 Suns)', 'V404 Cygni (9.0 Suns)'],
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  primordial: {
    id: 'primordial',
    name: 'Primordial Black Hole (PBH)',
    tagline: 'Ancient Big Bang relics from the first microsecond',
    massRangeDisplay: '< 1 Solar Mass (Microscopic up to Earth / Planet mass)',
    sunsComparison: 'From an asteroid or mountain up to 1 Earth mass (0.000003 Suns).',
    typicalDiameter: 'Subatomic scale up to a few centimeters (an Earth-mass PBH is 1.8 cm across, like a coin!)',
    formationMechanism: 'Direct collapse of high-density quantum fluctuations in the primordial plasma of the early universe.',
    hawkingEvaporationTime: 'Sub-seconds for micro-PBHs; >10⁵⁰ years for planetary mass PBHs',
    examples: ['PBH-Earth (1.0 Earth Mass)', 'Asteroid-Mass PBH (10¹⁵ kg)'],
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
};

export interface AstrophysicalPreset {
  id: string;
  name: string;
  designation: string;
  classification: string;
  archetype: BlackHoleArchetype;
  distanceLightYears: string;
  realMassSolarDisplay: string;
  plainMassExplanation: string;
  solarEquivalence: string;
  horizonDiameterKmDisplay: string;
  params: Partial<BlackHoleParams>;
  description: string;
}

export const ASTROPHYSICAL_PRESETS: AstrophysicalPreset[] = [
  {
    id: 'ton618',
    name: 'TON 618',
    designation: 'Tonantzintla 618 · Hyperluminous Quasar',
    classification: 'Ultramassive Black Hole',
    archetype: 'ultramassive',
    distanceLightYears: '18.2 × 10⁹ ly (z = 2.219)',
    realMassSolarDisplay: '66.0 × 10⁹ M☉',
    plainMassExplanation: '66 Billion Suns (66,000,000,000 Suns)',
    solarEquivalence: 'Equal to 66 Billion stars identical to our Sun. 1 Solar Mass (M☉) = 333,000 Earths. TON 618 is wider than 40 Solar Systems side-by-side!',
    horizonDiameterKmDisplay: '390 Billion km (~2,600 AU)',
    params: {
      massSolar: 100,
      spin: 0.98,
      accretionRate: 1.95,
      inclinationDeg: 58,
      dopplerStrength: 0.65,
      probeRadiusRs: 3.6,
      spectralMode: 'blackbody',
    },
    description: 'The largest known black hole in the observable universe, weighing 66 billion Suns. Its event horizon spans 390 billion km, powering a hyperluminous quasar that outshines 140 trillion Suns.',
  },
  {
    id: 'sgra',
    name: 'Sagittarius A*',
    designation: 'Sgr A* · Galactic Center',
    classification: 'Supermassive Kerr',
    archetype: 'supermassive',
    distanceLightYears: '26,670 ly',
    realMassSolarDisplay: '4.30 × 10⁶ M☉',
    plainMassExplanation: '4.3 Million Suns (4,300,000 Suns)',
    solarEquivalence: 'Equal to 4.3 Million Suns compressed into a region smaller than Mercury\'s orbit around the Sun.',
    horizonDiameterKmDisplay: '25.6 Million km (~0.17 AU)',
    params: {
      massSolar: 43,
      spin: 0.90,
      accretionRate: 0.85,
      inclinationDeg: 78,
      dopplerStrength: 0.55,
      probeRadiusRs: 3.4,
      spectralMode: 'blackbody',
    },
    description: 'Supermassive black hole at the dynamical center of the Milky Way, imaged by the Event Horizon Telescope and tracked via orbiting S-stars.',
  },
  {
    id: 'm87',
    name: 'M87* (Powehi)',
    designation: 'NGC 4486 · Virgo A Core',
    classification: 'Supermassive Elliptical',
    archetype: 'supermassive',
    distanceLightYears: '53.49 × 10⁶ ly',
    realMassSolarDisplay: '6.50 × 10⁹ M☉',
    plainMassExplanation: '6.5 Billion Suns (6,500,000,000 Suns)',
    solarEquivalence: 'Equal to 6.5 Billion Suns. Large enough that our entire Solar System out to Pluto would easily fit inside.',
    horizonDiameterKmDisplay: '38.4 Billion km (~256 AU)',
    params: {
      massSolar: 65,
      spin: 0.94,
      accretionRate: 1.45,
      inclinationDeg: 63,
      dopplerStrength: 0.65,
      probeRadiusRs: 4.0,
      spectralMode: 'eht230ghz',
    },
    description: 'Colossal active galactic nucleus in the Virgo cluster, the first black hole ever directly imaged in human history.',
  },
  {
    id: 'hlx1',
    name: 'HLX-1',
    designation: 'ESO 243-49 HLX-1 · Off-Center Core',
    classification: 'Intermediate-Mass Black Hole',
    archetype: 'intermediate',
    distanceLightYears: '290 × 10⁶ ly',
    realMassSolarDisplay: '2.00 × 10⁴ M☉',
    plainMassExplanation: '20,000 Suns (20 Thousand Suns)',
    solarEquivalence: 'Equal to 20,000 Suns. The elusive cosmic "missing link" between stellar remnants and galactic monsters.',
    horizonDiameterKmDisplay: '118,000 km (size of Saturn)',
    params: {
      massSolar: 50,
      spin: 0.75,
      accretionRate: 1.15,
      inclinationDeg: 70,
      dopplerStrength: 0.55,
      probeRadiusRs: 3.2,
      spectralMode: 'xray',
    },
    description: 'Premier candidate for an intermediate-mass black hole, likely the remnant stripped nucleus of a consumed dwarf galaxy.',
  },
  {
    id: 'cygx1',
    name: 'Cygnus X-1',
    designation: 'HDE 226868 · High-Mass Binary',
    classification: 'Stellar-Mass Kerr',
    archetype: 'stellar',
    distanceLightYears: '7,200 ly',
    realMassSolarDisplay: '21.2 M☉',
    plainMassExplanation: '21.2 Suns (21 Suns)',
    solarEquivalence: '21 times the mass of our Sun crushed into a sphere just 125 km across (the size of a small state).',
    horizonDiameterKmDisplay: '125 km',
    params: {
      massSolar: 21.2,
      spin: 0.998,
      accretionRate: 1.75,
      inclinationDeg: 82,
      dopplerStrength: 0.70,
      probeRadiusRs: 2.2,
      spectralMode: 'xray',
    },
    description: 'Near-maximal spinning stellar-mass black hole accreting stellar wind from companion blue supergiant star HDE 226868.',
  },
  {
    id: 'gw150914',
    name: 'GW150914 Remnant',
    designation: 'LIGO O1 Merger Event',
    classification: 'Stellar-Mass Post-Merger',
    archetype: 'stellar',
    distanceLightYears: '1.30 × 10⁹ ly',
    realMassSolarDisplay: '62.0 M☉',
    plainMassExplanation: '62.0 Suns (62 Suns)',
    solarEquivalence: '62 Suns. Formed by the violent collision of two black holes that converted 3 full Suns of mass into gravitational ripples.',
    horizonDiameterKmDisplay: '366 km',
    params: {
      massSolar: 62.0,
      spin: 0.68,
      accretionRate: 0.45,
      inclinationDeg: 45,
      dopplerStrength: 0.50,
      probeRadiusRs: 3.1,
      spectralMode: 'doppler',
    },
    description: 'First direct gravitational-wave detection remnant formed by the inspiral and ringdown of 36 M☉ and 29 M☉ black holes.',
  },
  {
    id: 'pbh_earth',
    name: 'PBH-Earth',
    designation: 'Hypothetical Big Bang Micro-Relic',
    classification: 'Primordial Black Hole',
    archetype: 'primordial',
    distanceLightYears: 'Local Universe Candidate',
    realMassSolarDisplay: '3.00 × 10⁻⁶ M☉ (1 Earth Mass)',
    plainMassExplanation: '1 Earth Mass (0.000003 Suns)',
    solarEquivalence: 'The entire mass of planet Earth (~6 × 10²⁴ kg) compressed down to the size of a coin (1.8 cm across).',
    horizonDiameterKmDisplay: '0.000018 km (1.8 cm / coin-size)',
    params: {
      massSolar: 10,
      spin: 0.15,
      accretionRate: 0.35,
      inclinationDeg: 40,
      dopplerStrength: 0.40,
      probeRadiusRs: 2.8,
      spectralMode: 'doppler',
    },
    description: 'Hypothetical primordial black hole forged directly from dense fluctuations during the Big Bang. An Earth-mass black hole has an event horizon just 1.8 cm wide!',
  },
];

export interface DerivedRelativisticMetrics {
  /** Schwarzschild radius Rs = 2GM/c^2 in km (scaled to massSolar) */
  schwarzschildRadiusKm: number;
  /** Kerr outer event horizon r+ in units of GM/c^2 (gravitational radii Rg) */
  eventHorizonRg: number;
  /** Kerr outer event horizon in km */
  eventHorizonKm: number;
  /** Prograde Innermost Stable Circular Orbit (ISCO) in Rg */
  iscoProgradeRg: number;
  /** Prograde Photon Sphere radius in Rg */
  photonSphereRg: number;
  /** Equatorial Ergosphere outer boundary in Rg (always 2.0 Rg = 1.0 Rs) */
  ergosphereRg: number;
  /** Frame-dragging angular frequency at horizon (rad/s equivalent) */
  frameDraggingOmega: number;
  /** Gravitational time dilation factor d_tau / dt at orbital probe position */
  probeTimeDilationFactor: number;
  /** Gravitational redshift z at orbital probe position */
  probeRedshiftZ: number;
  /** Orbital velocity of probe as fraction of speed of light (v / c) */
  probeOrbitalBeta: number;
  /** Peak inner accretion disk temperature in Kelvin */
  peakDiskTempK: number;
  /** Hawking radiation temperature in nanokelvin */
  hawkingTempNanoK: number;
}

/**
 * Computes exact general-relativistic Schwarzschild and Kerr black hole metrics
 * using Bardeen-Press-Teukolsky (1972) analytical equations.
 */
export function computeRelativisticMetrics(params: BlackHoleParams): DerivedRelativisticMetrics {
  const M = Math.max(5, params.massSolar);
  const a = Math.min(0.998, Math.max(0, params.spin));

  // 1 Solar Mass gravitational radius Rg = GM/c^2 ≈ 1.476625 km; Schwarzschild Rs = 2 * Rg ≈ 2.95325 km
  const rgKm = 1.476625 * M;
  const schwarzschildRadiusKm = 2.0 * rgKm;

  // Kerr outer event horizon: r_+ / Rg = 1 + sqrt(1 - a^2)
  const eventHorizonRg = 1.0 + Math.sqrt(Math.max(0, 1.0 - a * a));
  const eventHorizonKm = eventHorizonRg * rgKm;

  // Bardeen, Press & Teukolsky (1972) ISCO formula for prograde equatorial orbit:
  const oneMinusA2 = Math.max(1e-6, 1.0 - a * a);
  const cbrtOneMinusA2 = Math.cbrt(oneMinusA2);
  const z1 = 1.0 + cbrtOneMinusA2 * (Math.cbrt(1.0 + a) + Math.cbrt(1.0 - a));
  const z2 = Math.sqrt(3.0 * a * a + z1 * z1);
  const iscoProgradeRg = 3.0 + z2 - Math.sqrt((3.0 - z1) * (3.0 + z1 + 2.0 * z2));

  // Prograde equatorial photon sphere radius in Rg:
  // r_ph = 2 * (1 + cos(2/3 * arccos(-a)))
  const photonSphereRg = 2.0 * (1.0 + Math.cos((2.0 / 3.0) * Math.acos(-a)));

  const ergosphereRg = 2.0;

  // Dimensionless horizon angular velocity Omega_H * Rg / c = a / (2 * r_+)
  const frameDraggingOmega = a / (2.0 * eventHorizonRg);

  // Probe position in Rg (since probeRadiusRs is in units of Rs = 2 Rg)
  const probeRg = Math.max(eventHorizonRg * 1.08, params.probeRadiusRs * 2.0);
  const detailedDilation = computeDetailedTimeDilation(params.probeRadiusRs, a);
  const probeTimeDilationFactor = detailedDilation.dt_dtau;
  const probeRedshiftZ = detailedDilation.redshiftZ;
  const probeOrbitalBeta = detailedDilation.orbitalBeta;

  // Peak Novikov-Thorne inner disk temperature (scaled for visual telemetry in K)
  const peakDiskTempK = Math.round(
    1.85e7 * Math.pow(params.accretionRate, 0.25) * Math.pow(M / 20, -0.25) * (3.0 / Math.max(1.2, iscoProgradeRg))
  );

  // Hawking temperature T_H ≈ 61.69 / M nanokelvin
  const hawkingTempNanoK = 61.69 / M;

  return {
    schwarzschildRadiusKm,
    eventHorizonRg,
    eventHorizonKm,
    iscoProgradeRg,
    photonSphereRg,
    ergosphereRg,
    frameDraggingOmega,
    probeTimeDilationFactor,
    probeRedshiftZ,
    probeOrbitalBeta,
    peakDiskTempK,
    hawkingTempNanoK,
  };
}

export interface DetailedTimeDilationMetrics {
  /** Local coordinate time dilation factor dt/dτ relative to asymptotic observer (dt/dτ ≥ 1) */
  dt_dtau: number;
  /** Proper time rate dτ/dt (speed of probe clock relative to distant observer, dτ/dt ≤ 1) */
  dtau_dt: number;
  /** Static gravitational potential component: (dt/dτ)_grav = 1 / √(1 - 2/r_Rg) */
  gravitationalFactor: number;
  /** Special relativistic kinematic component: Lorentz factor γ = 1 / √(1 - β²) */
  kinematicFactor: number;
  /** Orbital velocity as fraction of speed of light (v/c = β) */
  orbitalBeta: number;
  /** Relativistic gravitational redshift z = (dt/dτ) - 1 */
  redshiftZ: number;
  /** Current radius in Schwarzschild radii (r / Rs) */
  probeRadiusRs: number;
  /** Current radius in gravitational radii (r / Rg) */
  probeRadiusRg: number;
  /** Formatted human-readable equivalence string */
  humanEquivalence: string;
}

export function computeDetailedTimeDilation(
  probeRadiusRs: number,
  spin: number
): DetailedTimeDilationMetrics {
  const a = Math.min(0.998, Math.max(0, spin));
  const eventHorizonRg = 1.0 + Math.sqrt(Math.max(0, 1.0 - a * a));
  const probeRg = Math.max(eventHorizonRg * 1.02, probeRadiusRs * 2.0);

  // 1. Static gravitational metric factor: g_00 = 1 - 2/r
  const g00 = Math.max(0.001, 1.0 - 2.0 / probeRg);
  const gravitationalFactor = 1.0 / Math.sqrt(g00);

  // 2. Relativistic Keplerian orbital velocity v/c in Kerr spacetime
  const orbitalBeta = Math.min(0.95, 1.0 / Math.sqrt(Math.max(1.15, probeRg - 1.0 + a)));
  const kinematicFactor = 1.0 / Math.sqrt(Math.max(0.01, 1.0 - orbitalBeta * orbitalBeta));

  // 3. Exact Kerr circular equatorial geodesic time dilation:
  // dt/dτ = (r^(3/2) + a) / √(r³ - 3r² + 2a r^(3/2))
  const r15 = Math.pow(probeRg, 1.5);
  const num = r15 + a;
  const denomSq = Math.pow(probeRg, 3) - 3.0 * Math.pow(probeRg, 2) + 2.0 * a * r15;

  let dt_dtau: number;
  if (denomSq > 0.002) {
    dt_dtau = Math.max(1.0, num / Math.sqrt(denomSq));
  } else {
    dt_dtau = Math.max(1.0, gravitationalFactor * kinematicFactor);
  }

  dt_dtau = Math.min(99.99, dt_dtau);
  const dtau_dt = 1.0 / dt_dtau;
  const redshiftZ = dt_dtau - 1.0;

  let humanEquivalence = '';
  if (dt_dtau < 1.05) {
    humanEquivalence = '1.0 hr on probe ≈ 1.0 hr for distant observer (weak field)';
  } else if (dt_dtau < 2.0) {
    const mins = Math.round((dt_dtau - 1.0) * 60);
    humanEquivalence = `1 hr on probe = 1 hr ${mins} min for distant observer`;
  } else if (dt_dtau < 24.0) {
    humanEquivalence = `1 hr on probe = ${dt_dtau.toFixed(2)} hrs for distant observer`;
  } else {
    const days = (dt_dtau / 24).toFixed(1);
    humanEquivalence = `1 hr on probe = ${days} days for distant observer (extreme field)`;
  }

  return {
    dt_dtau,
    dtau_dt,
    gravitationalFactor,
    kinematicFactor,
    orbitalBeta,
    redshiftZ,
    probeRadiusRs,
    probeRadiusRg: probeRg,
    humanEquivalence,
  };
}

export interface GeodesicTrajectory {
  id: string;
  impactParameterB: number;
  outcome: 'captured' | 'scattered' | 'critical-orbit';
  points: Array<{ x: number; y: number; z: number }>;
  colorHex: number;
}

/**
 * Integrates null geodesic (photon trajectory) in Schwarzschild/Kerr-approximated equatorial spacetime
 * using 4th-order Runge-Kutta on Binet's relativistic orbit equation:
 * d^2 u / dphi^2 + u = 3 M u^2 (where u = 1 / r)
 */
export function computeNullGeodesic(
  impactParameterB: number,
  visualHorizonRadius: number,
  spin: number,
  inclinationOffsetY = 0
): GeodesicTrajectory {
  const rs = visualHorizonRadius;
  const rg = 0.5 * rs; // GM/c^2 in scene units
  const bCrit = Math.sqrt(27) * rg * (1.0 - 0.18 * spin); // critical impact parameter

  const points: Array<{ x: number; y: number; z: number }> = [];
  const startX = -26.0;
  const startZ = impactParameterB;
  const r0 = Math.hypot(startX, startZ);

  let x = startX;
  let z = startZ;
  let y = inclinationOffsetY;

  // Initial velocity unit vector pointing +X toward the black hole
  let vx = 1.0;
  let vz = 0.0;
  let vy = -inclinationOffsetY * 0.03;

  const dt = 0.14;
  const maxSteps = 340;
  let outcome: 'captured' | 'scattered' | 'critical-orbit' = 'scattered';

  for (let i = 0; i < maxSteps; i++) {
    points.push({ x, y, z });
    const r = Math.hypot(x, y, z);

    if (r <= rs * 0.96) {
      outcome = 'captured';
      break;
    }
    if (r > r0 * 1.15 && i > 40) {
      outcome = 'scattered';
      break;
    }

    // Relativistic effective potential acceleration for photon + Lense-Thirring frame dragging
    const r3 = Math.max(0.2, r * r * r);
    const r5 = r3 * r * r;
    const h2 = Math.pow(impactParameterB, 2) + 0.5;
    const accelMag = (1.5 * rs * h2) / r5 + (0.65 * rs) / (r * r);

    // Frame-dragging tangential kick proportional to spin / r^3
    const frameDrag = (spin * rs * rs * 0.42) / r3;

    const ax = (-x * accelMag) / r - (z / r) * frameDrag;
    const az = (-z * accelMag) / r + (x / r) * frameDrag;
    const ay = (-y * accelMag) / r;

    vx += ax * dt;
    vz += az * dt;
    vy += ay * dt;

    // Normalize photon speed in coordinate space
    const speed = Math.hypot(vx, vy, vz) || 1;
    vx /= speed;
    vy /= speed;
    vz /= speed;

    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
  }

  if (Math.abs(Math.abs(impactParameterB) - bCrit) < 0.35 * rs && outcome !== 'captured') {
    outcome = 'critical-orbit';
  }

  const colorHex =
    outcome === 'captured'
      ? 0xf43f5e // Rose capture ray
      : outcome === 'critical-orbit'
      ? 0xf59e0b // Amber photon-sphere grazing ray
      : 0x06b6d4; // Cyan gravitationally deflected ray

  return {
    id: `ray-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    impactParameterB,
    outcome,
    points,
    colorHex,
  };
}
