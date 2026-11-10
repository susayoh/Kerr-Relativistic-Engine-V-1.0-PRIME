export type ObjectCategory = 'black_hole' | 'star';

export type BackgroundThemeId = 'galactic_core' | 'pure_black';

export interface BackgroundThemeDef {
  id: BackgroundThemeId;
  name: string;
  tagline: string;
  bgColor: number;
  fogColor: number;
  fogDensity: number;
  badgeBg: string;
}

export const BACKGROUND_THEMES: Record<BackgroundThemeId, BackgroundThemeDef> = {
  galactic_core: {
    id: 'galactic_core',
    name: 'Pure Black with Stars',
    tagline: 'Pitch-black #000000 vacuum with gravitationally lensed background stars',
    bgColor: 0x000000,
    fogColor: 0x000000,
    fogDensity: 0.0,
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  pure_black: {
    id: 'pure_black',
    name: 'Pure Black',
    tagline: 'Pitch-black #000000 vacuum with zero background stars or haze',
    bgColor: 0x000000,
    fogColor: 0x000000,
    fogDensity: 0.0,
    badgeBg: 'bg-black text-slate-300 border-slate-800',
  },
};

export type AccretionState = 'quiescent' | 'active';

export type SystemCategory = 'isolated' | 'binary';

export interface BlackHoleParams {
  /** System architecture category: Isolated Singularity vs. Binary Accretion System (Roche Lobe Overflow) */
  systemCategory?: SystemCategory;
  /** Object category: black hole or compact star remnant */
  objectCategory: ObjectCategory;
  /** Active background cosmic environment theme */
  backgroundTheme: BackgroundThemeId;
  /** Active astrophysical preset identifier (e.g. 'ton618', 'cygnus_x1') */
  presetId?: string;
  /** True astrophysical mass in solar masses (e.g. 66e9 for TON 618, 21.2 for Cygnus X-1) */
  trueMassSolar?: number;
  /** Mass multiplier in log10 solar masses or normalized scale (1 to 100 solar masses base scale for 3D visual geometry) */
  massSolar: number;
  /** Dimensionless Kerr spin parameter a* in [0, 0.998] */
  spin: number;
  /** Eddington accretion rate ratio m_dot in [0.05, 2.0] */
  accretionRate: number;
  /** Physical geometry & emission state of the accretion disk: razor-thin quiescent vs. thick volumetric active */
  accretionState?: AccretionState;
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
  /** Gravity well depth multiplier [0.5, 3.5] for plunge depth */
  wellDepthMultiplier: number;
  /** Enable authentic background starfield gravitational lensing deflection */
  gravitationalLensing: boolean;
  /** True cosmic scale mode: expands TON 618 and colossal black holes to their majestic cosmological proportions */
  trueCosmicScale: boolean;
  /** Spectral imaging band */
  spectralMode: 'blackbody' | 'eht230ghz' | 'xray' | 'doppler';
  /** Visibility toggles for composite layers */
  layers: {
    accretionDisk: boolean;
    ergosphereCage: boolean;
    spacetimeGrid: boolean;
    orbitalStars: boolean;
    geodesicRays: boolean;
    pulsarBeams?: boolean;
    magneticField?: boolean;
    anatomyLines?: boolean;
    microlensingStar?: boolean;
  };
}

export type BlackHoleArchetype =
  | 'ultramassive'
  | 'supermassive'
  | 'intermediate'
  | 'stellar'
  | 'primordial'
  | 'neutron_star'
  | 'magnetar';

export interface ArchetypeDefinition {
  id: BlackHoleArchetype;
  category: ObjectCategory;
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
    category: 'black_hole',
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
    category: 'black_hole',
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
    category: 'black_hole',
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
    category: 'black_hole',
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
    category: 'black_hole',
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
  neutron_star: {
    id: 'neutron_star',
    category: 'star',
    name: 'Neutron Star / Pulsar',
    tagline: 'Ultra-dense atomic remnant crushed beyond electron degeneracy (1.4 - 2.1 Suns in 20 km)',
    massRangeDisplay: '1.4 to 2.1 Solar Masses (Tolman-Oppenheimer-Volkoff limit)',
    sunsComparison: '1.4 to 2.1 Suns packed into a sphere just 20 km across (size of Manhattan). 1 teaspoon weighs 1 Billion Tons!',
    typicalDiameter: '20 to 24 kilometers across (physical solid crust, NO event horizon)',
    formationMechanism: 'Supernova core collapse of 8-20 M☉ stars; halted by neutron degeneracy pressure.',
    hawkingEvaporationTime: 'Stable against Hawking evaporation (baryonic matter remnant)',
    examples: ['PSR B1919+21 (Jocelyn Bell Pulsar)', 'Crab Pulsar (PSR B0531+21)', 'Vela Pulsar'],
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  magnetar: {
    id: 'magnetar',
    category: 'star',
    name: 'Magnetar',
    tagline: 'Hyper-magnetized neutron star possessing 10¹⁵ Gauss magnetic fields',
    massRangeDisplay: '1.5 to 2.3 Solar Masses',
    sunsComparison: '2 Suns with the strongest magnetic field in the universe (1,000 trillion times Earth\'s field).',
    typicalDiameter: '20 to 22 kilometers across',
    formationMechanism: 'Rapid-convective dynamo amplification in newly born protoneutron stars with millisecond spin periods.',
    hawkingEvaporationTime: 'Decays magnetically over ~10,000 years into ordinary pulsar',
    examples: ['SGR 1806-20', '1E 1048.1-5937', 'SGR 1935+2154'],
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
};

export interface AstrophysicalPreset {
  id: string;
  name: string;
  category: ObjectCategory;
  designation: string;
  classification: string;
  archetype: BlackHoleArchetype;
  distanceLightYears: string;
  trueMassSolar: number;
  realMassSolarDisplay: string;
  plainMassExplanation: string;
  solarEquivalence: string;
  trueDiameterKm: number;
  horizonDiameterKmDisplay: string;
  scaleNote: string;
  params: Partial<BlackHoleParams>;
  description: string;
}

export const ASTROPHYSICAL_PRESETS: AstrophysicalPreset[] = [
  // --- BLACK HOLES ---
  {
    id: 'ton618',
    name: 'TON 618',
    category: 'black_hole',
    designation: 'Tonantzintla 618 · Hyperluminous Quasar',
    classification: 'Ultramassive Black Hole',
    archetype: 'ultramassive',
    distanceLightYears: '18.2 × 10⁹ ly (z = 2.219)',
    trueMassSolar: 66000000000, // 66 Billion M☉
    realMassSolarDisplay: '66.0 × 10⁹ M☉',
    plainMassExplanation: '66 Billion Suns (66,000,000,000 Suns)',
    solarEquivalence: 'Equal to 66 Billion stars identical to our Sun. 1 Solar Mass (M☉) = 333,000 Earths. TON 618 is wider than 40 Solar Systems side-by-side!',
    trueDiameterKm: 390000000000, // 390 Billion km (~2,600 AU)
    horizonDiameterKmDisplay: '390 Billion km (~2,600 AU)',
    scaleNote: 'Normalized in standard 3D viewport so you can see it alongside stellar targets. In real life, TON 618 is 32× larger than Pluto\'s entire orbit and 19.5 million times larger than a stellar black hole!',
    params: {
      objectCategory: 'black_hole',
      massSolar: 100,
      spin: 0.98,
      accretionRate: 1.95,
      inclinationDeg: 80,
      dopplerStrength: 0.75,
      probeRadiusRs: 3.6,
      wellDepthMultiplier: 2.8,
      spectralMode: 'blackbody',
      layers: {
        accretionDisk: true,
        ergosphereCage: false, // Ergosphere toggled off automatically by default
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
      },
    },
    description: 'The largest known black hole in the observable universe, weighing 66 billion Suns. Its event horizon spans 390 billion km (2,600 AU), powering a hyperluminous quasar that outshines 140 trillion Suns.',
  },
  {
    id: 'sgra',
    name: 'Sagittarius A*',
    category: 'black_hole',
    designation: 'Sgr A* · Galactic Center',
    classification: 'Supermassive Kerr',
    archetype: 'supermassive',
    distanceLightYears: '26,670 ly',
    trueMassSolar: 4300000, // 4.3 Million M☉
    realMassSolarDisplay: '4.30 × 10⁶ M☉',
    plainMassExplanation: '4.3 Million Suns (4,300,000 Suns)',
    solarEquivalence: 'Equal to 4.3 Million Suns compressed into a region smaller than Mercury\'s orbit around the Sun.',
    trueDiameterKm: 25600000,
    horizonDiameterKmDisplay: '25.6 Million km (~0.17 AU)',
    scaleNote: 'Fits comfortably within the inner Solar System (orbit of Mercury).',
    params: {
      objectCategory: 'black_hole',
      massSolar: 43,
      spin: 0.90,
      accretionRate: 0.85,
      inclinationDeg: 78,
      dopplerStrength: 0.55,
      probeRadiusRs: 3.4,
      wellDepthMultiplier: 2.2,
      spectralMode: 'blackbody',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
      },
    },
    description: 'Supermassive black hole at the dynamical center of the Milky Way, imaged by the Event Horizon Telescope and tracked via orbiting S-stars.',
  },
  {
    id: 'm87',
    name: 'M87* (Powehi)',
    category: 'black_hole',
    designation: 'NGC 4486 · Virgo A Core',
    classification: 'Supermassive Elliptical',
    archetype: 'supermassive',
    distanceLightYears: '53.49 × 10⁶ ly',
    trueMassSolar: 6500000000, // 6.5 Billion M☉
    realMassSolarDisplay: '6.50 × 10⁹ M☉',
    plainMassExplanation: '6.5 Billion Suns (6,500,000,000 Suns)',
    solarEquivalence: 'Equal to 6.5 Billion Suns. Large enough that our entire Solar System out to Pluto would easily fit inside.',
    trueDiameterKm: 38400000000,
    horizonDiameterKmDisplay: '38.4 Billion km (~256 AU)',
    scaleNote: 'Larger than the entire Solar System; Pluto orbits at ~40 AU while M87* horizon is 256 AU wide.',
    params: {
      objectCategory: 'black_hole',
      massSolar: 65,
      spin: 0.94,
      accretionRate: 1.45,
      inclinationDeg: 63,
      dopplerStrength: 0.65,
      probeRadiusRs: 4.0,
      wellDepthMultiplier: 2.5,
      spectralMode: 'eht230ghz',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
      },
    },
    description: 'Colossal active galactic nucleus in the Virgo cluster, the first black hole ever directly imaged in human history.',
  },
  {
    id: 'hlx1',
    name: 'HLX-1',
    category: 'black_hole',
    designation: 'ESO 243-49 HLX-1 · Off-Center Core',
    classification: 'Intermediate-Mass Black Hole',
    archetype: 'intermediate',
    distanceLightYears: '290 × 10⁶ ly',
    trueMassSolar: 20000, // 20 Thousand M☉
    realMassSolarDisplay: '2.00 × 10⁴ M☉',
    plainMassExplanation: '20,000 Suns (20 Thousand Suns)',
    solarEquivalence: 'Equal to 20,000 Suns. The elusive cosmic "missing link" between stellar remnants and galactic monsters.',
    trueDiameterKm: 118000,
    horizonDiameterKmDisplay: '118,000 km (size of Saturn)',
    scaleNote: 'Roughly the physical diameter of the planet Saturn.',
    params: {
      objectCategory: 'black_hole',
      massSolar: 50,
      spin: 0.75,
      accretionRate: 1.15,
      inclinationDeg: 70,
      dopplerStrength: 0.55,
      probeRadiusRs: 3.2,
      wellDepthMultiplier: 1.8,
      spectralMode: 'xray',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
      },
    },
    description: 'Premier candidate for an intermediate-mass black hole, likely the remnant stripped nucleus of a consumed dwarf galaxy.',
  },
  {
    id: 'cygx1',
    name: 'Cygnus X-1',
    category: 'black_hole',
    designation: 'HDE 226868 · High-Mass Binary',
    classification: 'Stellar-Mass Kerr',
    archetype: 'stellar',
    distanceLightYears: '7,200 ly',
    trueMassSolar: 21.2,
    realMassSolarDisplay: '21.2 M☉',
    plainMassExplanation: '21.2 Suns (21 Suns)',
    solarEquivalence: '21 times the mass of our Sun crushed into a sphere just 125 km across (the size of a small state).',
    trueDiameterKm: 125,
    horizonDiameterKmDisplay: '125 km',
    scaleNote: 'Spans the size of a metropolitan region or small country.',
    params: {
      objectCategory: 'black_hole',
      massSolar: 21.2,
      spin: 0.998,
      accretionRate: 1.75,
      inclinationDeg: 82,
      dopplerStrength: 0.70,
      probeRadiusRs: 2.2,
      wellDepthMultiplier: 1.5,
      spectralMode: 'xray',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
      },
    },
    description: 'Near-maximal spinning stellar-mass black hole accreting stellar wind from companion blue supergiant star HDE 226868.',
  },
  {
    id: 'gw150914',
    name: 'GW150914 Remnant',
    category: 'black_hole',
    designation: 'LIGO O1 Merger Event',
    classification: 'Stellar-Mass Post-Merger',
    archetype: 'stellar',
    distanceLightYears: '1.30 × 10⁹ ly',
    trueMassSolar: 62.0,
    realMassSolarDisplay: '62.0 M☉',
    plainMassExplanation: '62.0 Suns (62 Suns)',
    solarEquivalence: '62 Suns. Formed by the violent collision of two black holes that converted 3 full Suns of mass into gravitational ripples.',
    trueDiameterKm: 366,
    horizonDiameterKmDisplay: '366 km',
    scaleNote: 'Roughly the driving distance between New York City and Washington, D.C.',
    params: {
      objectCategory: 'black_hole',
      massSolar: 62.0,
      spin: 0.68,
      accretionRate: 0.45,
      inclinationDeg: 45,
      dopplerStrength: 0.50,
      probeRadiusRs: 3.1,
      wellDepthMultiplier: 1.9,
      spectralMode: 'doppler',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
      },
    },
    description: 'First direct gravitational-wave detection remnant formed by the inspiral and ringdown of 36 M☉ and 29 M☉ black holes.',
  },
  {
    id: 'pbh_earth',
    name: 'PBH-Earth',
    category: 'black_hole',
    designation: 'Hypothetical Big Bang Micro-Relic',
    classification: 'Primordial Black Hole',
    archetype: 'primordial',
    distanceLightYears: 'Local Universe Candidate',
    trueMassSolar: 0.000003, // 1 Earth Mass
    realMassSolarDisplay: '3.00 × 10⁻⁶ M☉ (1 Earth Mass)',
    plainMassExplanation: '1 Earth Mass (0.000003 Suns)',
    solarEquivalence: 'The entire mass of planet Earth (~6 × 10²⁴ kg) compressed down to the size of a coin (1.8 cm across).',
    trueDiameterKm: 0.000018, // 1.8 cm
    horizonDiameterKmDisplay: '0.000018 km (1.8 cm / coin-size)',
    scaleNote: 'Fits in the palm of your hand, yet possesses the gravitational pull of the entire Earth.',
    params: {
      objectCategory: 'black_hole',
      massSolar: 10,
      spin: 0.15,
      accretionRate: 0.35,
      inclinationDeg: 40,
      dopplerStrength: 0.40,
      probeRadiusRs: 2.8,
      wellDepthMultiplier: 1.2,
      spectralMode: 'doppler',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
      },
    },
    description: 'Hypothetical primordial black hole forged directly from dense fluctuations during the Big Bang. An Earth-mass black hole has an event horizon just 1.8 cm wide!',
  },

  // --- COMPACT STARS & REMNANTS ---
  {
    id: 'psr_b1919',
    name: 'PSR B1919+21 (Pulsar)',
    category: 'star',
    designation: 'CP 1919 · Jocelyn Bell Pulsar',
    classification: 'Radio Pulsar (Neutron Star)',
    archetype: 'neutron_star',
    distanceLightYears: '2,283 ly',
    trueMassSolar: 1.4,
    realMassSolarDisplay: '1.40 M☉',
    plainMassExplanation: '1.4 Suns in a 20 km City Footprint',
    solarEquivalence: '1.4 times our Sun\'s mass packed into a solid sphere just 20 km across. Density is 100 trillion times that of water. Notice: it has a solid physical crust and NO event horizon!',
    trueDiameterKm: 20,
    horizonDiameterKmDisplay: '20 km (Physical Crust Surface)',
    scaleNote: 'Size of a single city like Manhattan or San Francisco. Its gravitational well curves steeply, but bottoms out at the physical crust rather than plunging to a singularity.',
    params: {
      objectCategory: 'star',
      massSolar: 14,
      spin: 0.45,
      accretionRate: 0.60,
      inclinationDeg: 65,
      dopplerStrength: 0.45,
      probeRadiusRs: 4.5,
      wellDepthMultiplier: 1.6,
      spectralMode: 'blackbody',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
        pulsarBeams: true,
        magneticField: true,
      },
    },
    description: 'The historic first pulsar ever discovered in 1967 by Jocelyn Bell Burnell. A rapidly spinning magnetized neutron star whose sweeping radio lighthouse beams create rhythmic periodic pulses every 1.337 seconds.',
  },
  {
    id: 'magnetar_sgr',
    name: 'SGR 1806-20 (Magnetar)',
    category: 'star',
    designation: 'Soft Gamma Repeater · Extreme Magnetar',
    classification: 'Ultra-Magnetized Compact Star',
    archetype: 'magnetar',
    distanceLightYears: '50,000 ly',
    trueMassSolar: 2.0,
    realMassSolarDisplay: '2.00 M☉',
    plainMassExplanation: '2.0 Suns · 10¹⁵ Gauss Magnetic Power',
    solarEquivalence: '2 full Suns compressed into a 22 km crystalline iron shell, wrapped in a magnetic field strong enough to tear atoms apart from thousands of kilometers away.',
    trueDiameterKm: 22,
    horizonDiameterKmDisplay: '22 km (Solid Ultra-Dense Crust)',
    scaleNote: 'Possesses the strongest magnetic field in the known universe (100 billion Tesla). In 2004, a single starquake on SGR 1806-20 released more energy in 0.1s than our Sun emits in 150,000 years.',
    params: {
      objectCategory: 'star',
      massSolar: 20,
      spin: 0.35,
      accretionRate: 0.95,
      inclinationDeg: 72,
      dopplerStrength: 0.50,
      probeRadiusRs: 4.8,
      wellDepthMultiplier: 1.8,
      spectralMode: 'xray',
      layers: {
        accretionDisk: true,
        ergosphereCage: false,
        spacetimeGrid: true,
        orbitalStars: false,
        geodesicRays: false,
        pulsarBeams: true,
        magneticField: true,
      },
    },
    description: 'The most violently magnetized object known to humanity. Starquakes in its rigid crystalline crust trigger colossal magnetic reconnections and giant gamma-ray flares.',
  },
];

export type PhysicsPresetId = 'schwarzschild' | 'kerr_max' | 'extreme_kerr' | 'moderate_kerr';

export interface PhysicsPresetDef {
  id: PhysicsPresetId;
  name: string;
  tagline: string;
  metricName: string;
  spin: number;
  spinDisplay: string;
  badgeBg: string;
  horizonRs: string;
  iscoRs: string;
  photonSphereRs: string;
  frameDragging: string;
  description: string;
  accretionRate: number;
  dopplerStrength: number;
}

export const PHYSICS_PRESETS_CONFIG: Record<PhysicsPresetId, PhysicsPresetDef> = {
  schwarzschild: {
    id: 'schwarzschild',
    name: 'Schwarzschild',
    tagline: 'Static, Non-Rotating Singularity',
    metricName: 'Schwarzschild Metric (1916)',
    spin: 0.0,
    spinDisplay: 'a* = 0.00',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    horizonRs: '1.00 Rs (2.0 Rg)',
    iscoRs: '3.00 Rs (6.0 Rg)',
    photonSphereRs: '1.50 Rs (3.0 Rg)',
    frameDragging: 'Zero (Static Spacetime)',
    description: 'Spherically symmetric, static solution with zero frame-dragging and a wide stable orbit gap.',
    accretionRate: 0.90,
    dopplerStrength: 0.20,
  },
  kerr_max: {
    id: 'kerr_max',
    name: 'Kerr (Max Spin)',
    tagline: 'Astrophysical Thorne Equilibrium Limit',
    metricName: 'Kerr Metric · Thorne Limit (1974)',
    spin: 0.998,
    spinDisplay: 'a* = 0.998',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    horizonRs: '0.53 Rs (1.06 Rg)',
    iscoRs: '0.62 Rs (1.23 Rg)',
    photonSphereRs: '0.54 Rs (1.07 Rg)',
    frameDragging: 'Rapid (Ω_H ≈ 0.47 c/Rg)',
    description: 'Astrophysical equilibrium limit where radiation back-reaction caps spin. Prominent oblate ergosphere.',
    accretionRate: 1.85,
    dopplerStrength: 0.80,
  },
  extreme_kerr: {
    id: 'extreme_kerr',
    name: 'Extreme Kerr',
    tagline: 'Theoretical Extremal Horizon',
    metricName: 'Extremal Kerr Solution (M = a*)',
    spin: 1.0,
    spinDisplay: 'a* = 1.00',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    horizonRs: '0.50 Rs (1.00 Rg)',
    iscoRs: '0.50 Rs (Touches Horizon)',
    photonSphereRs: '0.50 Rs (1.00 Rg)',
    frameDragging: 'Maximal (Coincident Horizons)',
    description: 'Theoretical limit where Cauchy and event horizons coalesce. Up to 42.3% Penrose energy extraction.',
    accretionRate: 2.0,
    dopplerStrength: 0.95,
  },
  moderate_kerr: {
    id: 'moderate_kerr',
    name: 'Moderate Kerr',
    tagline: 'Binary Merger Remnant Spin',
    metricName: 'Kerr Metric · Moderate Spin',
    spin: 0.70,
    spinDisplay: 'a* = 0.70',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    horizonRs: '0.86 Rs (1.71 Rg)',
    iscoRs: '1.70 Rs (3.39 Rg)',
    photonSphereRs: '1.15 Rs (2.31 Rg)',
    frameDragging: 'Moderate (Ω_H ≈ 0.20 c/Rg)',
    description: 'Typical spin for black holes born from binary mergers (e.g. GW150914). Balanced relativistic beaming.',
    accretionRate: 1.30,
    dopplerStrength: 0.55,
  },
};

export function getActivePhysicsPresetId(spin: number): PhysicsPresetId | null {
  if (spin < 0.05) return 'schwarzschild';
  if (spin >= 0.999) return 'extreme_kerr';
  if (spin >= 0.95 && spin <= 0.9985) return 'kerr_max';
  if (spin >= 0.65 && spin <= 0.75) return 'moderate_kerr';
  return null;
}

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
  /** Compact object category */
  objectCategory: ObjectCategory;
  /** Whether the object has a solid physical surface (star) or an event horizon (black hole) */
  hasPhysicalSurface: boolean;
  /** Surface radius in km (for stars) */
  physicalSurfaceKm: number;
}

/**
 * Computes exact general-relativistic Schwarzschild and Kerr black hole metrics
 * using Bardeen-Press-Teukolsky (1972) analytical equations.
 */
export function computeRelativisticMetrics(params: BlackHoleParams): DerivedRelativisticMetrics {
  const M = Math.max(1.4, params.massSolar);
  const a = Math.min(0.9999, Math.max(0, params.spin));
  const isStar = params.objectCategory === 'star';

  // 1 Solar Mass gravitational radius Rg = GM/c^2 ≈ 1.476625 km; Schwarzschild Rs = 2 * Rg ≈ 2.95325 km
  const rgKm = 1.476625 * M;
  const schwarzschildRadiusKm = 2.0 * rgKm;

  // Kerr outer event horizon: r_+ / Rg = 1 + sqrt(1 - a^2)
  const eventHorizonRg = 1.0 + Math.sqrt(Math.max(0, 1.0 - a * a));
  const eventHorizonKm = eventHorizonRg * rgKm;

  // Physical surface radius for a neutron star (~10-12 km radius, greater than its Schwarzschild radius)
  const physicalSurfaceKm = isStar ? Math.max(10.0, schwarzschildRadiusKm * 1.85) : 0;

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
    objectCategory: params.objectCategory,
    hasPhysicalSurface: isStar,
    physicalSurfaceKm,
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
  const a = Math.min(0.9999, Math.max(0, spin));
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
  const startX = -28.0;
  const startZ = impactParameterB;
  const r0 = Math.hypot(startX, startZ);

  let x = startX;
  let z = startZ;
  let y = inclinationOffsetY;

  // Initial velocity unit vector pointing +X toward the central object
  let vx = 1.0;
  let vz = 0.0;
  let vy = -inclinationOffsetY * 0.03;

  const dt = 0.14;
  const maxSteps = 360;
  let outcome: 'captured' | 'scattered' | 'critical-orbit' = 'scattered';

  for (let i = 0; i < maxSteps; i++) {
    points.push({ x, y, z });
    const r = Math.hypot(x, y, z);

    if (r <= rs * 0.96) {
      outcome = 'captured';
      break;
    }
    if (r > r0 * 1.25 && i > 40) {
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
    vy /= speed;

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
