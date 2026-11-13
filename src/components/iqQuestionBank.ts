import type { MatrixCellDescriptor, IQQuestion } from './IQTestModule';

export type GardnerIntelligenceId =
  | 'linguistic'
  | 'logical_mathematical'
  | 'spatial'
  | 'musical'
  | 'bodily_kinesthetic'
  | 'interpersonal'
  | 'intrapersonal'
  | 'naturalist'
  | 'existential';

export type IQBatteryModeId =
  | 'observatory_24'
  | 'comprehensive_18'
  | 'gardner_9_quick'
  | 'matrices_16'
  | 'full_deep_27'
  | `domain_${GardnerIntelligenceId}`;

export interface GardnerIntelligenceMeta {
  id: GardnerIntelligenceId;
  indexNumber: string;
  name: string;
  smartTitle: string;
  psychometricTestTitle: string;
  description: string;
  accentColor: string;
  badgeClass: string;
  barColorClass: string;
  shortCode: string;
}

/**
 * Howard Gardner’s Theory of Multiple Intelligences — Nine Primary Domains & Psychometric Tests
 */
export const GARDNER_INTELLIGENCES: readonly GardnerIntelligenceMeta[] = [
  {
    id: 'linguistic',
    indexNumber: '01',
    name: 'Linguistic Intelligence',
    smartTitle: 'Word Smart',
    psychometricTestTitle: 'Lexical, Syntactic & Pragmatic Fluency Test',
    description: 'Fluency with language, reading, writing, and verbal expression.',
    accentColor: '#38bdf8',
    badgeClass: 'text-sky-300 border-sky-400/50 bg-sky-500/15',
    barColorClass: 'bg-sky-400',
    shortCode: 'LIN',
  },
  {
    id: 'logical_mathematical',
    indexNumber: '02',
    name: 'Logical-Mathematical Intelligence',
    smartTitle: 'Number/Reasoning Smart',
    psychometricTestTitle: 'Quantitative, Bayesian & Matrix Logic Test',
    description: 'Skill with numbers, logic, patterns, and complex problem-solving.',
    accentColor: '#22d3ee',
    badgeClass: 'text-cyan-300 border-cyan-400/50 bg-cyan-500/15',
    barColorClass: 'bg-cyan-400',
    shortCode: 'LOG',
  },
  {
    id: 'spatial',
    indexNumber: '03',
    name: 'Spatial Intelligence',
    smartTitle: 'Picture Smart',
    psychometricTestTitle: '3D Topological, Chirality & Matrix Rotation Test',
    description: 'Strong visual reasoning, mental manipulation of objects, and navigational ability.',
    accentColor: '#818cf8',
    badgeClass: 'text-indigo-300 border-indigo-400/50 bg-indigo-500/15',
    barColorClass: 'bg-indigo-400',
    shortCode: 'SPA',
  },
  {
    id: 'musical',
    indexNumber: '04',
    name: 'Musical Intelligence',
    smartTitle: 'Music Smart',
    psychometricTestTitle: 'Harmonic Ratio, Polyrhythm & Counterpoint Test',
    description: 'Sensitivity to rhythm, pitch, melody, and audio-pattern creation.',
    accentColor: '#f472b6',
    badgeClass: 'text-pink-300 border-pink-400/50 bg-pink-500/15',
    barColorClass: 'bg-pink-400',
    shortCode: 'MUS',
  },
  {
    id: 'bodily_kinesthetic',
    indexNumber: '05',
    name: 'Bodily-Kinesthetic Intelligence',
    smartTitle: 'Body Smart',
    psychometricTestTitle: 'Biomechanical Torque, Motor Control & Kinetic Test',
    description: 'Physical coordination, motor control, athleticism, and tactile dexterity.',
    accentColor: '#fb923c',
    badgeClass: 'text-orange-300 border-orange-400/50 bg-orange-500/15',
    barColorClass: 'bg-orange-400',
    shortCode: 'KIN',
  },
  {
    id: 'interpersonal',
    indexNumber: '06',
    name: 'Interpersonal Intelligence',
    smartTitle: 'People Smart',
    psychometricTestTitle: 'Theory of Mind, Empathy & Negotiation Test',
    description: 'Ability to understand, empathize with, and navigate social relationships.',
    accentColor: '#34d399',
    badgeClass: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/15',
    barColorClass: 'bg-emerald-400',
    shortCode: 'SOC',
  },
  {
    id: 'intrapersonal',
    indexNumber: '07',
    name: 'Intrapersonal Intelligence',
    smartTitle: 'Self Smart',
    psychometricTestTitle: 'Metacognitive Calibration & Affect Regulation Test',
    description: 'Deep self-awareness, emotional regulation, and reflective inner insight.',
    accentColor: '#c084fc',
    badgeClass: 'text-purple-300 border-purple-400/50 bg-purple-500/15',
    barColorClass: 'bg-purple-400',
    shortCode: 'SLF',
  },
  {
    id: 'naturalist',
    indexNumber: '08',
    name: 'Naturalist Intelligence',
    smartTitle: 'Nature Smart',
    psychometricTestTitle: 'Ecological Cascades, Taxonomy & Phyllotaxis Test',
    description: 'Affinity for living systems, ecology, and recognizing patterns in nature.',
    accentColor: '#a3e635',
    badgeClass: 'text-lime-300 border-lime-400/50 bg-lime-500/15',
    barColorClass: 'bg-lime-400',
    shortCode: 'NAT',
  },
  {
    id: 'existential',
    indexNumber: '09',
    name: 'Existential Intelligence',
    smartTitle: 'Philosophy Smart',
    psychometricTestTitle: 'Ontological Identity, Ethics & Finitude Test',
    description: 'A capacity to ponder deep questions about human existence, life, and death.',
    accentColor: '#fbbf24',
    badgeClass: 'text-amber-300 border-amber-400/50 bg-amber-500/15',
    barColorClass: 'bg-amber-400',
    shortCode: 'EXI',
  },
] as const;

export const GARDNER_INTELLIGENCE_MAP: Record<GardnerIntelligenceId, GardnerIntelligenceMeta> =
  GARDNER_INTELLIGENCES.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<GardnerIntelligenceId, GardnerIntelligenceMeta>
  );

export interface IQBatteryModeMeta {
  id: IQBatteryModeId;
  title: string;
  shortLabel: string;
  questionCount: number;
  description: string;
}

export const IQ_BATTERY_MODES: readonly IQBatteryModeMeta[] = [
  {
    id: 'observatory_24',
    title: 'Observatory 24-Item Psychometric Standard (Q1–Q24)',
    shortLabel: '24 Items · Q1–Q24 Standard',
    questionCount: 24,
    description:
      'Stratified 24-item battery (Q1–Q24) calibrated across all 9 Gardner Intelligences, 4 Reasoning Sub-Domains, and 4 Difficulty Tiers (Baseline → Mensa-Tier).',
  },
  {
    id: 'comprehensive_18',
    title: 'Comprehensive 9-Intelligence & Matrix Battery (18 Items)',
    shortLabel: '18 Items · All 9 Intelligences',
    questionCount: 18,
    description:
      'Draws 2 randomized questions from each of Howard Gardner’s 9 Multiple Intelligences (including 3×3 visual matrices and domain reasoning) from an 85-item database.',
  },
  {
    id: 'gardner_9_quick',
    title: 'Gardner 9-Domain Rapid Profile (9 Items)',
    shortLabel: '9 Items · 1 Per Domain',
    questionCount: 9,
    description:
      'Samples 1 randomized question from each of the 9 primary types of intelligence for a fast multi-dimensional cognitive profile.',
  },
  {
    id: 'matrices_16',
    title: 'Raven’s & Mensa 3×3 Spatial/Logical Matrices (16 Items)',
    shortLabel: '16 Items · 3×3 Matrices',
    questionCount: 16,
    description:
      'Samples 16 non-verbal 3×3 visual matrices from an expanded 24-matrix pool so every run features a unique matrix sequence.',
  },
  {
    id: 'full_deep_27',
    title: 'Full Deep 9-Intelligence Assessment (27 Items)',
    shortLabel: '27 Items · Deep Profile',
    questionCount: 27,
    description:
      'Draws 3 randomized questions per intelligence across all 9 Gardner domains for maximum psychometric resolution.',
  },
] as const;

/**
 * Helper to create a deterministic placeholder 3x3 matrix descriptor tuple for non-matrix domain questions
 * so backward-compatible code expecting `matrixCells` or `optionCells` never fails.
 */
const DEFAULT_PLACEHOLDER_CELL: MatrixCellDescriptor = {
  kind: 'quant_dots',
  frame: 'circle',
  dots: 1,
};

const EMPTY_MATRIX_CELLS: [
  MatrixCellDescriptor,
  MatrixCellDescriptor,
  MatrixCellDescriptor,
  MatrixCellDescriptor,
  MatrixCellDescriptor,
  MatrixCellDescriptor,
  MatrixCellDescriptor,
  MatrixCellDescriptor,
] = [
  DEFAULT_PLACEHOLDER_CELL,
  DEFAULT_PLACEHOLDER_CELL,
  DEFAULT_PLACEHOLDER_CELL,
  DEFAULT_PLACEHOLDER_CELL,
  DEFAULT_PLACEHOLDER_CELL,
  DEFAULT_PLACEHOLDER_CELL,
  DEFAULT_PLACEHOLDER_CELL,
  DEFAULT_PLACEHOLDER_CELL,
];

/**
 * Additional 8 Visual 3x3 Matrices to expand the Raven's / Mensa visual pool to 24 matrices
 */
export const EXTRA_VISUAL_MATRIX_QUESTIONS: IQQuestion[] = [
  {
    id: 'rpm_extra_01_hexagon_dots',
    moduleCode: 'MOD-01',
    moduleTitle: 'Raven’s Progressive Series & Permutations',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Symmetric Node & Boundary Progression',
    difficulty: 'Standard',
    points: 10,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'matrix_3x3',
    question:
      'Matrix Set C-14: Across each row, the interior node count increases by +2 while the frame cycles Square → Diamond → Hexagon. Identify cell (3,3).',
    formulaHint: 'Row Rule: Dots +2 per step  |  Col Rule: Square → Diamond → Hexagon',
    matrixCells: [
      { kind: 'quant_dots', frame: 'square', dots: 1 },
      { kind: 'quant_dots', frame: 'diamond', dots: 3 },
      { kind: 'quant_dots', frame: 'hexagon', dots: 5 },
      { kind: 'quant_dots', frame: 'square', dots: 2 },
      { kind: 'quant_dots', frame: 'diamond', dots: 4 },
      { kind: 'quant_dots', frame: 'hexagon', dots: 6 },
      { kind: 'quant_dots', frame: 'square', dots: 3 },
      { kind: 'quant_dots', frame: 'diamond', dots: 5 },
    ],
    optionCells: [
      { kind: 'quant_dots', frame: 'hexagon', dots: 7 },
      { kind: 'quant_dots', frame: 'diamond', dots: 7 },
      { kind: 'quant_dots', frame: 'hexagon', dots: 6 },
      { kind: 'quant_dots', frame: 'circle', dots: 7 },
      { kind: 'quant_dots', frame: 'square', dots: 7 },
      { kind: 'quant_dots', frame: 'hexagon', dots: 5 },
    ],
    options: [
      'Hexagon frame with 7 symmetric interior nodes',
      'Diamond frame with 7 interior nodes',
      'Hexagon frame with 6 interior nodes',
      'Circle frame with 7 interior nodes',
      'Square frame with 7 interior nodes',
      'Hexagon frame with 5 interior nodes',
    ],
    correctIndex: 0,
    explanation:
      'Row 3 progresses 3 → 5 → 7 interior nodes, and Column 3 uses a Hexagon outer frame, producing a Hexagon with 7 nodes.',
  },
  {
    id: 'mensa_extra_02_counter_dial',
    moduleCode: 'MOD-01',
    moduleTitle: 'Raven’s Progressive Series & Permutations',
    batteryOrigin: 'Mensa Norway',
    domain: 'Counter-Rotation Angular Phase',
    difficulty: 'Advanced',
    points: 12,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'matrix_3x3',
    question:
      'Mensa Matrix R-19: The vector rotates +90° clockwise across columns and +45° clockwise down rows. Identify the state at (R3, C3).',
    formulaHint: 'Col Step: +90° CW  |  Row Step: +45° CW  |  Hub: Solid → Ring → Hollow',
    matrixCells: [
      { kind: 'vector_dial', angleDeg: 0, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 90, hubFill: 'ring', tailTick: true },
      { kind: 'vector_dial', angleDeg: 180, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 45, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 135, hubFill: 'ring', tailTick: true },
      { kind: 'vector_dial', angleDeg: 225, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 90, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 180, hubFill: 'ring', tailTick: true },
    ],
    optionCells: [
      { kind: 'vector_dial', angleDeg: 270, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 270, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 225, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 0, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 270, hubFill: 'ring', tailTick: true },
      { kind: 'vector_dial', angleDeg: 315, hubFill: 'hollow', tailTick: true },
    ],
    options: [
      'Hollow hub · Vector at 270° (West)',
      'Solid hub · Vector at 270° (West)',
      'Hollow hub · Vector at 225° (South-West)',
      'Hollow hub · Vector at 0° (North)',
      'Ring hub · Vector at 270° (West)',
      'Hollow hub · Vector at 315° (North-West)',
    ],
    correctIndex: 0,
    explanation:
      'In Row 3, the angle steps 90° → 180° → 270° across the columns, and Column 3 always has a hollow central hub.',
  },
  {
    id: 'rpm_extra_03_bar_subtraction',
    moduleCode: 'MOD-02',
    moduleTitle: 'Superposition & Boolean Set Logic',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Orthogonal Chord Subtraction',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'matrix_3x3',
    question:
      'Matrix Set D-15: Across each row, horizontal bars decrease (3→2→1) while vertical bars increase (1→2→3). Identify cell (3,3).',
    formulaHint: 'Horiz Bars: 3 → 2 → 1 across row  |  Vert Bars: 1 → 2 → 3 across row',
    matrixCells: [
      { kind: 'bar_stack', horizBars: 3, vertBars: 1, centerNode: 'none' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 2, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 3, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 1, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 2, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 3, centerNode: 'none' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 1, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 2, centerNode: 'none' },
    ],
    optionCells: [
      { kind: 'bar_stack', horizBars: 1, vertBars: 3, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 3, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 3, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 3, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 2, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 3, centerNode: 'none' },
    ],
    options: [
      '1 horizontal bar · 3 vertical bars · Hollow center node',
      '3 horizontal bars · 3 vertical bars · Hollow center node',
      '1 horizontal bar · 3 vertical bars · Solid center node',
      '2 horizontal bars · 3 vertical bars · Hollow center node',
      '1 horizontal bar · 2 vertical bars · Hollow center node',
      '1 horizontal bar · 3 vertical bars · No center node',
    ],
    correctIndex: 0,
    explanation:
      'Column 3 always contains 1 horizontal bar and 3 vertical bars. The center node follows a Latin square permutation (none, hollow, solid), leaving hollow for (R3, C3).',
  },
  {
    id: 'mensa_extra_04_concentric_inversion',
    moduleCode: 'MOD-03',
    moduleTitle: 'Spatial Group Transformations & Dihedral Symmetry',
    batteryOrigin: 'Mensa Norway',
    domain: 'Inside-Out Topological Shift',
    difficulty: 'Advanced',
    points: 15,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'matrix_3x3',
    question:
      'Mensa Matrix S-12: Each step to the right shifts the innermost shape to the outermost layer. Identify the missing concentric hierarchy at (R3, C3).',
    formulaHint: 'Layer Shift: [Outer, Mid, Inner] → [Inner, Outer, Mid]  |  Center alternates',
    matrixCells: [
      { kind: 'concentric_cycle', layers: ['circle', 'square', 'diamond'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['diamond', 'circle', 'square'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['square', 'diamond', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['diamond', 'circle', 'square'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['square', 'diamond', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['circle', 'square', 'diamond'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['square', 'diamond', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['circle', 'square', 'diamond'], centerSolid: false },
    ],
    optionCells: [
      { kind: 'concentric_cycle', layers: ['diamond', 'circle', 'square'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['diamond', 'circle', 'square'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['circle', 'diamond', 'square'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['square', 'circle', 'diamond'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['diamond', 'square', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['circle', 'square', 'diamond'], centerSolid: true },
    ],
    options: [
      'Outer Diamond · Middle Circle · Inner Square · Solid core',
      'Outer Diamond · Middle Circle · Inner Square · Hollow core',
      'Outer Circle · Middle Diamond · Inner Square · Solid core',
      'Outer Square · Middle Circle · Inner Diamond · Solid core',
      'Outer Diamond · Middle Square · Inner Circle · Solid core',
      'Outer Circle · Middle Square · Inner Diamond · Solid core',
    ],
    correctIndex: 0,
    explanation:
      'Shifting the inner Diamond of (R3, C2) [circle, square, diamond] to the outside yields [diamond, circle, square], and the center core alternates True → False → True.',
  },
  {
    id: 'rpm_extra_05_vector_sum_zero',
    moduleCode: 'MOD-03',
    moduleTitle: 'Spatial Group Transformations & Dihedral Symmetry',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Signed Vector Algebraic Addition',
    difficulty: 'Advanced',
    points: 16,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'matrix_3x3',
    question:
      'APM Set II-19: For each row, the signed horizontal and vertical spikes satisfy C3 = C1 + C2. Identify the resultant vector hub at (R3, C3).',
    formulaHint: 'dx(C3) = dx(C1) + dx(C2)  |  dy(C3) = dy(C1) + dy(C2)',
    matrixCells: [
      { kind: 'vector_balance', dx: 1, dy: -1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 1, dy: 2, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 2, dy: 1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: -2, dy: 1, coreShape: 'square' },
      { kind: 'vector_balance', dx: 1, dy: -2, coreShape: 'square' },
      { kind: 'vector_balance', dx: -1, dy: -1, coreShape: 'square' },
      { kind: 'vector_balance', dx: 2, dy: -2, coreShape: 'circle' },
      { kind: 'vector_balance', dx: -1, dy: 2, coreShape: 'circle' },
    ],
    optionCells: [
      { kind: 'vector_balance', dx: 1, dy: 0, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 1, dy: 0, coreShape: 'square' },
      { kind: 'vector_balance', dx: -1, dy: 0, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 1, dy: 1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 0, dy: 1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 2, dy: 0, coreShape: 'circle' },
    ],
    options: [
      'Circle core · dx = +1 (East), dy = 0',
      'Square core · dx = +1 (East), dy = 0',
      'Circle core · dx = -1 (West), dy = 0',
      'Circle core · dx = +1 (East), dy = +1 (North)',
      'Circle core · dx = 0, dy = +1 (North)',
      'Circle core · dx = +2 (East), dy = 0',
    ],
    correctIndex: 0,
    explanation:
      'In Row 3: dx = (+2) + (-1) = +1, and dy = (-2) + (+2) = 0, with a Circle core.',
  },
  {
    id: 'mensa_extra_06_vertex_invariant',
    moduleCode: 'MOD-04',
    moduleTitle: 'Raven’s Set II — Multi-Rule Invariants & Phase Logic',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Polygon-Dot Invariant Sum',
    difficulty: 'Apex',
    points: 18,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'matrix_3x3',
    question:
      'APM Set II-28: In each row, the sum of polygon sides V plus interior dots D equals a constant invariant (Row 1 = 8, Row 2 = 9, Row 3 = 10). Find cell (3,3).',
    formulaHint: 'Row 3 Invariant: Sides + Dots = 10  |  Sides across Row 3: 4 → 5 → 6',
    matrixCells: [
      { kind: 'vertex_dot_conservation', sides: 3, dots: 5, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 4, dots: 4, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 3, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 3, dots: 6, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 4, dots: 5, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 4, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 4, dots: 6, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 5, invertedRing: true },
    ],
    optionCells: [
      { kind: 'vertex_dot_conservation', sides: 6, dots: 4, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 6, dots: 4, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 6, dots: 5, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 7, dots: 3, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 5, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 6, dots: 3, invertedRing: false },
    ],
    options: [
      'Hexagon (6 sides) · 4 interior dots · Standard ring',
      'Hexagon (6 sides) · 4 interior dots · Dashed ring',
      'Hexagon (6 sides) · 5 interior dots · Standard ring',
      'Heptagon (7 sides) · 3 interior dots · Standard ring',
      'Pentagon (5 sides) · 5 interior dots · Standard ring',
      'Hexagon (6 sides) · 3 interior dots · Standard ring',
    ],
    correctIndex: 0,
    explanation:
      'In Row 3, V progresses 4 → 5 → 6 and V + D = 10, so D = 10 - 6 = 4 dots. The outer ring alternates Standard → Dashed → Standard.',
  },
  {
    id: 'mensa_extra_07_orbital_resonance',
    moduleCode: 'MOD-04',
    moduleTitle: 'Raven’s Set II — Multi-Rule Invariants & Phase Logic',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Dual-Satellite Phase Resonance',
    difficulty: 'Apex',
    points: 18,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'matrix_3x3',
    question:
      'Mensa Matrix M-31: Across each row, the outer satellite advances +90° CW while the inner satellite advances +180°. Identify (R3, C3).',
    formulaHint: 'Outer: +90° CW per col  |  Inner: +180° per col  |  Core: 3 → 4 → 6 sides',
    matrixCells: [
      { kind: 'orbital_phase', outerDeg: 0, innerDeg: 0, coreSides: 3 },
      { kind: 'orbital_phase', outerDeg: 90, innerDeg: 180, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 180, innerDeg: 0, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 90, innerDeg: 90, coreSides: 3 },
      { kind: 'orbital_phase', outerDeg: 180, innerDeg: 270, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 270, innerDeg: 90, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 180, innerDeg: 180, coreSides: 3 },
      { kind: 'orbital_phase', outerDeg: 270, innerDeg: 0, coreSides: 4 },
    ],
    optionCells: [
      { kind: 'orbital_phase', outerDeg: 0, innerDeg: 180, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 0, innerDeg: 0, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 90, innerDeg: 180, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 0, innerDeg: 180, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 270, innerDeg: 180, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 0, innerDeg: 90, coreSides: 6 },
    ],
    options: [
      'Hexagon core · Outer at 0° (N) · Inner at 180° (S)',
      'Hexagon core · Outer at 0° (N) · Inner at 0° (N)',
      'Hexagon core · Outer at 90° (E) · Inner at 180° (S)',
      'Square core · Outer at 0° (N) · Inner at 180° (S)',
      'Hexagon core · Outer at 270° (W) · Inner at 180° (S)',
      'Hexagon core · Outer at 0° (N) · Inner at 90° (E)',
    ],
    correctIndex: 0,
    explanation:
      'In Row 3, outer angle advances 180° → 270° → 0°, inner angle flips 180° → 0° → 180°, and Column 3 always has a 6-sided Hexagon core.',
  },
  {
    id: 'rpm_extra_08_quadrant_xor_corners',
    moduleCode: 'MOD-02',
    moduleTitle: 'Superposition & Boolean Set Logic',
    batteryOrigin: 'Mensa Norway',
    domain: 'Quadrant XOR & Corner Union',
    difficulty: 'Advanced',
    points: 15,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'matrix_3x3',
    question:
      'Mensa Matrix X-22: Shaded sectors in C3 follow symmetric difference (C1 XOR C2), while corner nodes follow set intersection (C1 AND C2). Identify (R3, C3).',
    formulaHint: 'Shaded Quadrants: C1 ⊕ C2  |  Corner Dots: C1 ∩ C2',
    matrixCells: [
      { kind: 'quadrant_xor', quadrants: [0, 1], corners: [0, 1, 2] },
      { kind: 'quadrant_xor', quadrants: [1, 2], corners: [1, 2, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 2], corners: [1, 2] },
      { kind: 'quadrant_xor', quadrants: [2, 3], corners: [0, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 3], corners: [0, 1, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 2], corners: [0, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 1, 3], corners: [0, 2, 3] },
      { kind: 'quadrant_xor', quadrants: [1, 2, 3], corners: [2, 3] },
    ],
    optionCells: [
      { kind: 'quadrant_xor', quadrants: [0, 2], corners: [2, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 1, 2], corners: [2, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 2], corners: [0, 2, 3] },
      { kind: 'quadrant_xor', quadrants: [1, 3], corners: [2, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 2], corners: [0, 3] },
      { kind: 'quadrant_xor', quadrants: [2], corners: [2, 3] },
    ],
    options: [
      'Quadrants [TL, BR] shaded · Corners [BR, BL] dotted',
      'Quadrants [TL, TR, BR] shaded · Corners [BR, BL] dotted',
      'Quadrants [TL, BR] shaded · Corners [TL, BR, BL] dotted',
      'Quadrants [TR, BL] shaded · Corners [BR, BL] dotted',
      'Quadrants [TL, BR] shaded · Corners [TL, BL] dotted',
      'Quadrant [BR] shaded · Corners [BR, BL] dotted',
    ],
    correctIndex: 0,
    explanation:
      'In Row 3: Quadrants {0,1,3} XOR {1,2,3} = {0,2} (TL and BR). Corners {0,2,3} AND {2,3} = {2,3} (BR and BL).',
  },
];

/**
 * 56 Multi-Domain Questions spanning all 9 of Howard Gardner’s Multiple Intelligences
 * (Linguistic, Logical-Mathematical, Spatial, Musical, Bodily-Kinesthetic,
 * Interpersonal, Intrapersonal, Naturalist, Existential)
 */
export const GARDNER_DOMAIN_QUESTIONS: IQQuestion[] = [
  // ============================================================================
  // 1. LINGUISTIC INTELLIGENCE (WORD SMART) — 7 QUESTIONS
  // ============================================================================
  {
    id: 'gardner_lin_01_semantic_analogy',
    moduleCode: 'MOD-01',
    moduleTitle: 'Linguistic Intelligence (Word Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Lexical & Semantic Proportion',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'linguistic',
    smartLabel: 'Word Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ANALOGY MATRIX:  [ EPHEMERAL : PERMANENCE ]  ::  [ CACOPHONOUS : ? ]',
      'Relation Type: Antonymous privation of a defining noun quality',
      'Lexical Axis: Temporal transience → Acoustic dissonance',
    ],
    question:
      'Complete the second-order verbal analogy by selecting the abstract noun that stands in the exact same privative relationship to "CACOPHONOUS" as "PERMANENCE" stands to "EPHEMERAL".',
    formulaHint: 'Adjective of Absence/Conflict → Abstract Noun of the Opposite State',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Euphony (harmonious acoustic agreement)',
      'Stridency (harsh acoustic intensity)',
      'Cadence (rhythmic modulation of tempo)',
      'Loquacity (excessive verbal fluency)',
    ],
    correctIndex: 0,
    explanation:
      '"Ephemeral" means lacking permanence; likewise, "Cacophonous" (harsh, discordant sound) means lacking "Euphony" (harmonious, pleasing sound).',
  },
  {
    id: 'gardner_lin_02_syntactic_ambiguity',
    moduleCode: 'MOD-01',
    moduleTitle: 'Linguistic Intelligence (Word Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Syntactic Parsing & Pragmatics',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'linguistic',
    smartLabel: 'Word Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'STATEMENT A: "Only the chief cryptographer decoded the palimpsest at dusk."',
      'STATEMENT B: "The chief cryptographer decoded only the palimpsest at dusk."',
      'TASK: Identify the precise logical divergence between Statement A and Statement B.',
    ],
    question:
      'How does shifting the focus modifier "only" change the truth conditions between Statement A and Statement B?',
    formulaHint: 'Scope of Restrictive Quantifier "Only" over Subject vs. Direct Object',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'A excludes other people from decoding it; B excludes other texts from being decoded by the cryptographer',
      'A implies the decoding failed at dawn; B implies multiple cryptographers collaborated',
      'A and B are logically equivalent under formal predicate calculus',
      'A restricts the time of day to dusk; B restricts the location of the archive',
    ],
    correctIndex: 0,
    explanation:
      'In Statement A, "only" modifies the subject ("the chief cryptographer"), meaning nobody else decoded it. In Statement B, "only" modifies the object ("the palimpsest"), meaning the cryptographer decoded nothing else.',
  },
  {
    id: 'gardner_lin_03_etymological_morphism',
    moduleCode: 'MOD-01',
    moduleTitle: 'Linguistic Intelligence (Word Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Morphological Root Deduction',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'linguistic',
    smartLabel: 'Word Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'MORPHEME SET:  • Circumlocution (circum + loqui)   • Soliloquy (solus + loqui)',
      '               • Somnambulist (somnus + ambulare) • Perambulate (per + ambulare)',
      'TARGET NEOLOGISM:  "SOMNILOQUY"',
    ],
    question:
      'Using structural morpheme decomposition from the given Latinate root pairs, deduce the precise meaning of "SOMNILOQUY".',
    formulaHint: 'somnus (sleep) + loqui (to speak)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'The act or habit of talking while asleep',
      'Walking in circles while in a meditative trance',
      'Speaking in evasive, indirect riddles to conceal truth',
      'The inability to fall asleep due to ambient noise',
    ],
    correctIndex: 0,
    explanation:
      'Combining "somnus" (sleep, as in somnambulist) with "loqui" (to speak, as in soliloquy and circumlocution) yields "somniloquy": talking in one’s sleep.',
  },
  {
    id: 'gardner_lin_04_rhetorical_chiasmus',
    moduleCode: 'MOD-01',
    moduleTitle: 'Linguistic Intelligence (Word Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Rhetorical Inversion Structure',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'linguistic',
    smartLabel: 'Word Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PATTERN:  [ Clause 1: A → B ]   followed by   [ Clause 2: B′ → A′ ]',
      'EXAMPLE:  "We shape our buildings; thereafter they shape us."',
      'FORMAL NAME: Syntactic & semantic mirror inversion (AB : BA)',
    ],
    question:
      'Which classical rhetorical figure describes this mirror-image reversal of grammatical structures across two parallel clauses (AB : BA)?',
    formulaHint: 'Crossed arrangement (Greek χίασμα, from the letter Chi Χ)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Chiasmus / Antimetabole',
      'Synecdoche',
      'Zeugma',
      'Anaphora',
    ],
    correctIndex: 0,
    explanation:
      'Chiasmus (and its lexical subtype antimetabole) reverses the order of terms or grammatical structures in parallel clauses in an A-B-B-A mirror pattern.',
  },
  {
    id: 'gardner_lin_05_cipher_isomorphism',
    moduleCode: 'MOD-01',
    moduleTitle: 'Linguistic Intelligence (Word Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Orthographic Pattern Isomorphism',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'linguistic',
    smartLabel: 'Word Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'STRUCTURAL TEMPLATE:  1 - 2 - 3 - 2 - 4 - 2  (6 letters; positions 2, 4, 6 identical)',
      'EXAMPLES:  B - A - N - A - N - A  (1-2-3-2-3-2)  vs.  R - E - V - E - R - E  (1-2-3-2-1-2)',
      'TARGET PATTERN:  1 - 2 - 3 - 2 - 4 - 2  (where letters 1, 3, 4 are all distinct)',
    ],
    question:
      'Which 6-letter English word strictly satisfies the letter-repetition isomorphism 1-2-3-2-4-2?',
    formulaHint: 'Check positions 2, 4, 6 for the same vowel and positions 1, 3, 5 for distinct consonants',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'SERENE (S-E-R-E-N-E)',
      'ROCOCO (R-O-C-O-C-O)',
      'DIVIDE (D-I-V-I-D-E)',
      'SYSTEM (S-Y-S-T-E-M)',
    ],
    correctIndex: 0,
    explanation:
      'In S-E-R-E-N-E, E occupies positions 2, 4, and 6, while S (pos 1), R (pos 3), and N (pos 5) are three distinct consonants, matching 1-2-3-2-4-2.',
  },
  {
    id: 'gardner_lin_06_syllogistic_contrapositive',
    moduleCode: 'MOD-01',
    moduleTitle: 'Linguistic Intelligence (Word Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Verbal Deductive Entailment',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'linguistic',
    smartLabel: 'Word Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PREMISE 1: Every untranslatable idiom relies on cultural metaphor.',
      'PREMISE 2: No purely literal technical manual relies on cultural metaphor.',
      'DEDUCTION: Evaluate what must necessarily follow from Premises 1 and 2.',
    ],
    question:
      'Which conclusion is strictly entailed by the two linguistic premises above?',
    formulaHint: 'All U are M  |  No L are M  ⇒  No L are U',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'No purely literal technical manual contains an untranslatable idiom',
      'Every text that relies on cultural metaphor is an untranslatable idiom',
      'Some purely literal technical manuals are untranslatable idioms',
      'All cultural metaphors are found in technical manuals',
    ],
    correctIndex: 0,
    explanation:
      'Since all untranslatable idioms require cultural metaphor (U ⊆ M) and no literal manual uses cultural metaphor (L ∩ M = ∅), L and U are completely disjoint.',
  },
  {
    id: 'gardner_lin_07_pragmatic_implicature',
    moduleCode: 'MOD-01',
    moduleTitle: 'Linguistic Intelligence (Word Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Gricean Conversational Implicature',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'linguistic',
    smartLabel: 'Word Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'CONTEXT: A tenure committee asks for an evaluation of a candidate’s breakthrough research.',
      'LETTER: "Dr. Vance arrives punctually to every meeting and formats citations impeccably."',
      'LINGUISTIC PHENOMENON: Conveying a negative assessment by omitting expected praise.',
    ],
    question:
      'In pragmatics and linguistic analysis, how does the letter writer communicate a critique without stating a single negative word?',
    formulaHint: 'Flouting Grice’s Maxim of Quantity / Damning with faint praise',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Conversational implicature via deliberate under-informativeness on the central question',
      'Semantic contradiction through oxymoronic predication',
      'Syntactic recursion embedding a double negative',
      'Phonological assimilation of stressed syllables',
    ],
    correctIndex: 0,
    explanation:
      'By praising only trivial formatting and punctuality when asked about research breakthroughs, the writer flouts Grice’s Maxim of Quantity/Relevance, generating a conversational implicature that the research itself is unremarkable.',
  },

  // ============================================================================
  // 2. LOGICAL-MATHEMATICAL INTELLIGENCE (NUMBER/REASONING SMART) — 6 QUESTIONS
  // (Plus 12 Logical-Mathematical 3x3 Matrices in the visual pool)
  // ============================================================================
  {
    id: 'gardner_log_01_recursive_difference',
    moduleCode: 'MOD-02',
    moduleTitle: 'Logical-Mathematical Intelligence (Number/Reasoning Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Second-Order Recursive Sequence',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'SEQUENCE:   3   →   7   →   16   →   35   →   74   →   [ ? ]',
      'FIRST DIFFERENCES:  +4,  +9,  +19,  +39, ...',
      'RECURRENCE RELATION:  a(n) = 2 · a(n-1) + (n - 1)',
    ],
    question:
      'Determine the exact next integer in the recursive sequence: 3, 7, 16, 35, 74, [ ? ].',
    formulaHint: 'Each term doubles the previous term and adds an incrementing offset (+1, +2, +3, +4, +5)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '153',
      '148',
      '151',
      '155',
    ],
    correctIndex: 0,
    explanation:
      'The rule is a(n) = 2·a(n-1) + k where k = 1, 2, 3, 4, 5: 3×2+1=7; 7×2+2=16; 16×2+3=35; 35×2+4=74; 74×2+5 = 153.',
  },
  {
    id: 'gardner_log_02_bayesian_base_rate',
    moduleCode: 'MOD-02',
    moduleTitle: 'Logical-Mathematical Intelligence (Number/Reasoning Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Conditional Probability & Base-Rate Logic',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'POPULATION: 1,000 orbital sensors.  • 10 sensors (1%) have a quantum drift fault.',
      'DIAGNOSTIC ACCURACY:  • True Positive Rate = 100% (detects all 10 faulty sensors).',
      '                      • False Positive Rate = 10% (flags 99 of the 990 healthy sensors).',
    ],
    question:
      'If a randomly chosen sensor triggers a positive fault alarm, what is the exact probability that it actually has the quantum drift fault?',
    formulaHint: 'P(Fault | Alarm) = True Positives / (True Positives + False Positives)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '10 / 109 (approx. 9.17%)',
      '90 / 100 (90.0%)',
      '10 / 99 (approx. 10.10%)',
      '1 / 10 (10.0%)',
    ],
    correctIndex: 0,
    explanation:
      'Out of 1,000 sensors, all 10 faulty sensors trigger an alarm (10 true positives) and 10% of the 990 healthy sensors trigger a false alarm (99 false positives). Total alarms = 10 + 99 = 109, so P = 10/109 ≈ 9.17%.',
  },
  {
    id: 'gardner_log_03_modular_clock_invariant',
    moduleCode: 'MOD-02',
    moduleTitle: 'Logical-Mathematical Intelligence (Number/Reasoning Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Modular Arithmetic & Number Theory',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'SYSTEM: A 12-node toroidal pulsar clock labeled 0 through 11.',
      'OPERATION: Starting at Node 0, a particle jumps +7 nodes per tick (mod 12).',
      'QUERY: After how many minimum ticks (> 0) does the particle first return to Node 0?',
    ],
    question:
      'Because 7 and 12 are coprime (gcd(7, 12) = 1), how many +7 jumps on a 12-node cycle are required to return to Node 0 for the first time?',
    formulaHint: 'Smallest positive integer k such that 7k ≡ 0 (mod 12)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '12 ticks (visiting every node exactly once before returning)',
      '7 ticks',
      '6 ticks',
      '84 ticks',
    ],
    correctIndex: 0,
    explanation:
      'Since gcd(7, 12) = 1, 7 is a generator of the cyclic group Z/12Z. Therefore 7k is a multiple of 12 first when k = 12.',
  },
  {
    id: 'gardner_log_04_knights_and_knaves',
    moduleCode: 'MOD-02',
    moduleTitle: 'Logical-Mathematical Intelligence (Number/Reasoning Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Boolean Truth-Table Deduction',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'AXIOM: Truth-tellers always state true propositions; Liars always state false propositions.',
      'SPEAKER ALPHA says: "Both of us are Liars."',
      'SPEAKER BETA says nothing.',
    ],
    question:
      'Deduce the exact identities of Speaker Alpha and Speaker Beta from Alpha’s self-referential conjunction.',
    formulaHint: 'If Alpha told the truth, "Both are Liars" would be true — contradiction!',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Alpha is a Liar, and Beta is a Truth-teller',
      'Both Alpha and Beta are Liars',
      'Alpha is a Truth-teller, and Beta is a Liar',
      'The statement is a paradoxical stalemate with no solution',
    ],
    correctIndex: 0,
    explanation:
      'Alpha cannot be a Truth-teller because then "Both of us are Liars" would be true, contradicting Alpha being a Truth-teller. Thus Alpha is a Liar, and the statement "Both of us are Liars" is false, which forces Beta to be a Truth-teller.',
  },
  {
    id: 'gardner_log_05_diophantine_weighing',
    moduleCode: 'MOD-02',
    moduleTitle: 'Logical-Mathematical Intelligence (Number/Reasoning Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Information-Theoretic Ternary Search',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PROBLEM: You have 27 identical-looking titanium spheres; exactly 1 sphere is heavier.',
      'INSTRUMENT: A two-pan mechanical balance scale (outcomes: Left heavy, Right heavy, Balanced).',
      'GOAL: Guarantee identifying the single heavy sphere in the minimum number of weighings.',
    ],
    question:
      'What is the minimum number of two-pan balance weighings required to guarantee isolating the 1 heavier sphere among 27 spheres?',
    formulaHint: 'Each weighing yields 3 outcomes (3^k ≥ 27)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '3 weighings (dividing into groups of 9 → 3 → 1)',
      '4 weighings',
      '5 weighings',
      '2 weighings',
    ],
    correctIndex: 0,
    explanation:
      'A two-pan balance partitions the candidate pool into 3 equal subsets (left pan, right pan, off-scale). Since 3³ = 27, 3 weighings (9 vs 9, then 3 vs 3, then 1 vs 1) always isolate the heavy sphere.',
  },
  {
    id: 'gardner_log_06_matrix_determinant_pattern',
    moduleCode: 'MOD-02',
    moduleTitle: 'Logical-Mathematical Intelligence (Number/Reasoning Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Algebraic Grid Invariant',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'logical_mathematical',
    smartLabel: 'Number/Reasoning Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ROW 1:   [  4  |  6  |  20  ]',
      'ROW 2:   [  5  |  8  |  34  ]',
      'ROW 3:   [  7  |  9  |   ?  ]',
    ],
    question:
      'In the numerical grid above, Column 3 is computed from Column 1 and Column 2 via a consistent algebraic rule. Find the missing value in Row 3.',
    formulaHint: 'Rule: (Col 1 × Col 2) - (Col 1 - Col 2)? Check: 4×6 - 4 = 20, 5×8 - 6 = 34 → (C1 × C2) - (C2 - 2) or C1² + C2 - 2? Let’s check: (C1 - 1) × C2 + 2 → 3×6+2=20, 4×8+2=34, 6×9+2=56',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '56  (via rule: (Col 1 − 1) × Col 2 + 2)',
      '63  (via rule: Col 1 × Col 2)',
      '52  (via rule: Col 1 × Col 2 − 11)',
      '48  (via rule: (Col 1 + Col 2) × 3)',
    ],
    correctIndex: 0,
    explanation:
      'Across every row, C3 = (C1 − 1) × C2 + 2 (equivalently C1×C2 − C2 + 2): Row 1 = 3×6 + 2 = 20; Row 2 = 4×8 + 2 = 34; Row 3 = 6×9 + 2 = 56.',
  },

  // ============================================================================
  // 3. SPATIAL INTELLIGENCE (PICTURE SMART) — 6 COGNITIVE ITEMS
  // (Plus 12 Spatial 3x3 Matrices in the visual pool)
  // ============================================================================
  {
    id: 'gardner_spa_01_cube_net_folding',
    moduleCode: 'MOD-03',
    moduleTitle: 'Spatial Intelligence (Picture Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: '3D Polyhedral Net Folding',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'UNFOLDED CROSS NET OF A CUBE:',
      '          [ N ]',
      '    [ W ] [ C ] [ E ]',
      '          [ S ]',
      '          [ B ]',
      'Action: Fold the 6 square faces up by 90° around center face [C] (Top).',
    ],
    question:
      'When the planar cross net above is folded into a closed 3D cube with [C] as the Top face, which two pairs of faces lie on directly opposite sides of the cube?',
    formulaHint: 'Faces separated by 1 intermediate square along an orthogonal strip fold to opposite parallel planes',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '[C] is opposite [B], [N] is opposite [S], and [W] is opposite [E]',
      '[C] is opposite [S], [N] is opposite [B], and [W] is opposite [E]',
      '[C] is opposite [N], [S] is opposite [B], and [W] is opposite [E]',
      '[W] is opposite [S], [E] is opposite [N], and [C] is opposite [B]',
    ],
    correctIndex: 0,
    explanation:
      'Folding around [C] places [N], [S], [E], [W] as the four vertical walls ([N] opposite [S], [W] opposite [E]), while [B] folds another 90° from [S] to become the Bottom face directly opposite [C].',
  },
  {
    id: 'gardner_spa_02_mental_chirality',
    moduleCode: 'MOD-03',
    moduleTitle: 'Spatial Intelligence (Picture Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: '3D Enantiomorphic Handedness (Chirality)',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'OBJECT: A right-handed 3D coordinate triad (X = Thumb East, Y = Index North, Z = Middle Up).',
      'TRANSFORMATION 1: Rotate +180° around the Z-axis, then +90° around the X-axis.',
      'TRANSFORMATION 2: Reflect across the YZ-mirror plane (X → −X).',
    ],
    question:
      'Which statement accurately describes the 3D spatial superimposability of the triad after Transformation 1 vs. Transformation 2?',
    formulaHint: 'Proper 3D rotations (SO(3), det = +1) preserve handedness; mirror reflections (det = -1) invert chirality',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Transformation 1 preserves the right-handed triad; Transformation 2 creates a non-superimposable left-handed enantiomorph',
      'Both transformations produce left-handed enantiomorphs',
      'Transformation 1 inverts chirality because it combines two orthogonal axes',
      'A single mirror reflection in 3D can always be undone by a 180° rigid rotation',
    ],
    correctIndex: 0,
    explanation:
      'Any composition of rigid 3D rotations belongs to SO(3) (determinant +1) and preserves right-handed chirality, whereas a single planar reflection (determinant -1) flips the object into its left-handed mirror image.',
  },
  {
    id: 'gardner_spa_03_toroidal_navigation',
    moduleCode: 'MOD-03',
    moduleTitle: 'Spatial Intelligence (Picture Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Spherical Geodesic Bearings',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'SPHERICAL GEOMETRY: An explorer starts at the North Pole (90° N) of a sphere.',
      'LEG 1: Travels 2,500 km due South along meridian 0°.',
      'LEG 2: Travels 2,500 km due East along the parallel of latitude, then 2,500 km due North.',
    ],
    question:
      'Where is the explorer located at the end of Leg 2 relative to the starting point, and Why?',
    formulaHint: 'Meridians of longitude converge to a single point at the North Pole',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Exactly back at the North Pole, because all meridians converge at the pole regardless of eastward travel along a latitude circle',
      '2,500 km East of the North Pole on an orthographic tangent plane',
      'At the Equator, 90° East of the prime meridian',
      '1,250 km North-West of the starting point due to Coriolis deflection',
    ],
    correctIndex: 0,
    explanation:
      'Walking South 2,500 km reaches a circle of constant latitude centered on the North Pole. Walking East stays at that exact distance (2,500 km) from the North Pole, so walking 2,500 km due North along the new meridian returns directly to the North Pole.',
  },
  {
    id: 'gardner_spa_04_cross_section_octahedron',
    moduleCode: 'MOD-03',
    moduleTitle: 'Spatial Intelligence (Picture Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Planar Cross-Section of 3D Solids',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'spatial',
    smartLabel: 'Picture Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'SOLID: A solid regular cube in 3D space (6 square faces, 12 edges, 8 vertices).',
      'CUTTING PLANE: A flat plane passes precisely through the midpoints of 6 non-parallel edges',
      '               perpendicular to the main body diagonal connecting vertex (0,0,0) to (1,1,1).',
    ],
    question:
      'What 2D polygon is formed by the cross-section when a plane slices a cube perpendicular to its main body diagonal directly through its center?',
    formulaHint: 'The plane intersects all 6 faces of the cube symmetrically at 6 edge midpoints',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'A regular hexagon',
      'An equilateral triangle',
      'A regular octagon',
      'A rhombus',
    ],
    correctIndex: 0,
    explanation:
      'A plane perpendicular to the body diagonal through the center of a cube intersects 6 of the cube’s 12 edges at their exact midpoints, forming a regular hexagon.',
  },

  // ============================================================================
  // 4. MUSICAL INTELLIGENCE (MUSIC SMART) — 7 QUESTIONS
  // ============================================================================
  {
    id: 'gardner_mus_01_polyrhythm_lcm',
    moduleCode: 'MOD-01',
    moduleTitle: 'Musical Intelligence (Music Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Polyrhythmic Phase Alignment (4:3 Hemiola)',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'musical',
    smartLabel: 'Music Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PULSE GRID (12 Sub-pulses per measure: 1  2  3  4  5  6  7  8  9  10 11 12):',
      'VOICE A (4-Beat Pulse):  [X] .  .  [X] .  .  [X] .  .  [X] .  .   (Hits on 1, 4, 7, 10)',
      'VOICE B (3-Beat Pulse):  [X] .  .  .  [X] .  .  .  [X] .  .  .   (Hits on 1, 5, 9)',
    ],
    question:
      'In a 4-against-3 polyrhythm mapped across a 12-subdivision cycle, on which exact sub-pulses do Voice A and Voice B strike the composite rhythm (either or both voices)?',
    formulaHint: 'Union of {1, 4, 7, 10} and {1, 5, 9}',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Sub-pulses 1, 4, 5, 7, 9, 10 ("Pass the god-damn but-ter" cadence)',
      'Sub-pulses 1, 3, 5, 7, 9, 11 (whole-tone even pulse)',
      'Sub-pulses 1, 4, 6, 8, 10, 12',
      'Sub-pulses 1, 2, 5, 7, 8, 11',
    ],
    correctIndex: 0,
    explanation:
      'Voice A divides 12 by 4 (every 3 subdivisions: 1, 4, 7, 10) and Voice B divides 12 by 3 (every 4 subdivisions: 1, 5, 9). Their union is {1, 4, 5, 7, 9, 10}.',
  },
  {
    id: 'gardner_mus_02_harmonic_overtone_ratio',
    moduleCode: 'MOD-02',
    moduleTitle: 'Musical Intelligence (Music Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Acoustic Frequency & Pitch Interval Ratios',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'musical',
    smartLabel: 'Music Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'FUNDAMENTAL PITCH (f₁):  220 Hz (A3)',
      'HARMONIC SERIES:  f₂ = 440 Hz (Octave, 2:1)   |   f₃ = 660 Hz (Octave + Perfect Fifth, 3:1)',
      'TARGET INTERVAL:  Just-Intonation Perfect Fifth above A4 (440 Hz) → Ratio 3:2',
    ],
    question:
      'If A4 resonates at 440 Hz, what is the exact acoustic frequency of the note E5 tuned a pure Pythagorean / Just Perfect Fifth (3:2 ratio) above A4?',
    formulaHint: 'f = 440 Hz × (3 / 2)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '660 Hz',
      '550 Hz',
      '586.67 Hz',
      '880 Hz',
    ],
    correctIndex: 0,
    explanation:
      'A pure Perfect Fifth has a frequency ratio of 3:2. Multiplying 440 Hz by 3/2 yields 660 Hz (which is also the 3rd harmonic of A3 = 220 Hz).',
  },
  {
    id: 'gardner_mus_03_retrograde_inversion',
    moduleCode: 'MOD-03',
    moduleTitle: 'Musical Intelligence (Music Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Melodic Contour Transformation (Retrograde Inversion)',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'musical',
    smartLabel: 'Music Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ORIGINAL 4-NOTE MOTIF (Semitone Intervals):   +2 (Up Whole),  +3 (Up m3),  −1 (Down m2)',
      'OPERATION 1 — RETROGRADE (Reverse time order of intervals):  [ −1,  +3,  +2 ]',
      'OPERATION 2 — INVERSION (Flip pitch direction + ↔ −):        Apply to Retrograde',
    ],
    question:
      'In contrapuntal and 12-tone composition (J.S. Bach / Schoenberg), what is the resulting interval sequence when you apply a Retrograde Inversion to the motif [+2, +3, −1]?',
    formulaHint: 'Reverse the interval order AND negate each interval’s sign',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '[ +1,  −3,  −2 ]  (Up m2, Down m3, Down Whole)',
      '[ −2,  −3,  +1 ]  (Pure Inversion without Retrograde)',
      '[ −1,  +3,  +2 ]  (Pure Retrograde without Inversion)',
      '[ +3,  −2,  +1 ]',
    ],
    correctIndex: 0,
    explanation:
      'Reversing the interval order of [+2, +3, −1] gives [−1, +3, +2], and inverting the pitch direction (multiplying by −1) yields [+1, −3, −2].',
  },
  {
    id: 'gardner_mus_04_modal_scale_rotation',
    moduleCode: 'MOD-01',
    moduleTitle: 'Musical Intelligence (Music Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Diatonic Modal Interval Cyclic Shift',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'musical',
    smartLabel: 'Music Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'IONIAN (MAJOR) STEP PATTERN:   W - W - H - W - W - W - H   (where W = 2 semitones, H = 1)',
      'CYCLIC ROTATION (+1 degree):   W - H - W - W - W - H - W   (Starts on 2nd scale degree)',
      'CHARACTERISTIC ALTERATION:     Minor 3rd + Raised (Major) 6th + Minor 7th',
    ],
    question:
      'Which diatonic musical mode is generated by rotating the Major (Ionian) interval pattern to begin on its second degree (W - H - W - W - W - H - W)?',
    formulaHint: 'White keys from D to D (minor triad with a bright major 6th)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Dorian Mode',
      'Phrygian Mode',
      'Lydian Mode',
      'Mixolydian Mode',
    ],
    correctIndex: 0,
    explanation:
      'Starting the diatonic cycle on the 2nd degree yields the Dorian mode (W-H-W-W-W-H-W), heard in Miles Davis’s "So What" and Santana’s "Oye Como Va".',
  },
  {
    id: 'gardner_mus_05_tempo_metric_modulation',
    moduleCode: 'MOD-02',
    moduleTitle: 'Musical Intelligence (Music Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Metric Modulation (Elliott Carter Tempo Ratio)',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'musical',
    smartLabel: 'Music Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'INITIAL TEMPO:  120 BPM (Quarter note = 120 beats per minute).',
      'SUBDIVISION:    Each quarter note is divided into 3 eighth-note triplets (360 triplets/min).',
      'MODULATION:     Pivot so that 1 new quarter note equals 2 of the old eighth-note triplets.',
    ],
    question:
      'After executing this metric modulation (new quarter note = dotted-triplet / 2 old triplets), what is the exact new tempo in BPM?',
    formulaHint: '360 triplet pulses per minute ÷ 2 triplets per new beat',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      '180 BPM',
      '160 BPM',
      '90 BPM',
      '144 BPM',
    ],
    correctIndex: 0,
    explanation:
      'At 120 BPM, eighth-note triplets occur at 120 × 3 = 360 pulses/min. Grouping them in pairs (2 triplets = 1 new beat) produces 360 / 2 = 180 BPM.',
  },
  {
    id: 'gardner_mus_06_tritone_symmetry',
    moduleCode: 'MOD-03',
    moduleTitle: 'Musical Intelligence (Music Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: '12-Tone Pitch-Class Inversion Symmetry',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'musical',
    smartLabel: 'Music Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      '12-TONE CLOCK (0 = C, 1 = C#, 2 = D, ..., 6 = F#, ..., 11 = B):',
      'CHORD STRUCTURE:  Nodes [ 0,  3,  6,  9 ]  (Spaced equally by +3 semitones)',
      'ROTATIONAL SYMMETRY: Transposing by +3, +6, or +9 semitones maps the chord onto itself.',
    ],
    question:
      'Which four-note musical chord divides the 12-semitone octave into four identical minor-third (3-semitone) intervals [0, 3, 6, 9]?',
    formulaHint: 'Symmetric four-note stack of minor thirds (e.g., C – Eb – Gb – A)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Fully Diminished Seventh Chord (dim7)',
      'Dominant Seventh Chord (dom7)',
      'Major Seventh Chord (maj7)',
      'Augmented Triad plus Perfect Fourth',
    ],
    correctIndex: 0,
    explanation:
      'The fully diminished seventh chord stacks minor thirds (3 semitones each: 0, 3, 6, 9), creating a 4-fold symmetric structure on the 12-tone pitch circle.',
  },
  {
    id: 'gardner_mus_07_acoustic_phase_cancellation',
    moduleCode: 'MOD-04',
    moduleTitle: 'Musical Intelligence (Music Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Waveform Phase Interference',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'musical',
    smartLabel: 'Music Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'SIGNAL 1:  Pure sine wave at 440 Hz, amplitude A = +1.0, phase φ₁ = 0°.',
      'SIGNAL 2:  Pure sine wave at 440 Hz, amplitude A = +1.0, delayed by exactly 1/880th of a second.',
      'ANALYSIS:  1/880 s equals exactly half a period (T/2) of a 440 Hz wave (φ₂ = 180°).',
    ],
    question:
      'What is the resulting acoustic output when Signal 1 and Signal 2 are summed into a single mono channel?',
    formulaHint: 'sin(ωt) + sin(ωt + π) = 0',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Complete destructive phase cancellation (silence, amplitude = 0)',
      'A +6 dB doubling of perceived volume at 440 Hz',
      'An octave-doubled tone at 880 Hz',
      'A rhythmic 2 Hz binaural beat',
    ],
    correctIndex: 0,
    explanation:
      'A delay of half a wavelength (1/880 s for a 440 Hz tone) shifts the phase by 180° (π radians), causing complete destructive interference when summed.',
  },

  // ============================================================================
  // 5. BODILY-KINESTHETIC INTELLIGENCE (BODY SMART) — 7 QUESTIONS
  // ============================================================================
  {
    id: 'gardner_kin_01_angular_momentum_tuck',
    moduleCode: 'MOD-03',
    moduleTitle: 'Bodily-Kinesthetic Intelligence (Body Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Rotational Biomechanics & Proprioception',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'bodily_kinesthetic',
    smartLabel: 'Body Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'BIOMECHANICAL SCENARIO: A gymnast is mid-air with zero external torque (L = I · ω = constant).',
      'INITIAL STATE: Extended layout posture (Moment of Inertia I₁ = 12 kg·m², spin rate ω₁ = 1.5 rev/s).',
      'KINETIC ACTION: Pulls limbs tightly into the core, reducing Moment of Inertia to I₂ = 4 kg·m².',
    ],
    question:
      'How does pulling the limbs inward to reduce the body’s moment of inertia to one-third affect the gymnast’s mid-air rotational spin rate ω₂?',
    formulaHint: 'Conservation of Angular Momentum: I₁ · ω₁ = I₂ · ω₂',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Spin rate triples to 4.5 revolutions per second',
      'Spin rate decreases to 0.5 revolutions per second',
      'Spin rate remains constant at 1.5 rev/s until ground contact',
      'The center of mass parabolic trajectory rises by 3×',
    ],
    correctIndex: 0,
    explanation:
      'Because angular momentum L = I·ω is conserved in mid-air, reducing moment of inertia I from 12 to 4 (a 3× reduction) triples angular velocity ω from 1.5 to 4.5 rev/s.',
  },
  {
    id: 'gardner_kin_02_bimanual_mirror_coordination',
    moduleCode: 'MOD-01',
    moduleTitle: 'Bodily-Kinesthetic Intelligence (Body Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Bimanual Motor Phase Decoupling',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'bodily_kinesthetic',
    smartLabel: 'Body Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'MOTOR TASK: Right hand traces a clockwise circle in the frontal plane at 2 Hz.',
      '            Left hand simultaneously taps a 3-stroke vertical triangle at 2 Hz.',
      'NEUROMOTOR CHALLENGE: Overcoming homologous muscle coupling across the corpus callosum.',
    ],
    question:
      'In motor-control neuroscience, why is performing asymmetric spatial trajectories with the left and right hands simultaneously more demanding than symmetric mirror movements?',
    formulaHint: 'Interhemispheric cross-talk between supplementary motor areas (SMA)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'The motor cortex naturally defaults to homologous muscle co-activation, requiring active inhibitory decoupling across the corpus callosum',
      'Peripheral nerve conduction velocity in the left arm is 40% slower than in the right arm',
      'The cerebellum can only process one joint angle at a time',
      'Proprioceptive Golgi tendon organs deactivate during circular motion',
    ],
    correctIndex: 0,
    explanation:
      'Bimanual coordination naturally favors in-phase activation of homologous muscle groups; independent asymmetric trajectories require interhemispheric inhibition via the corpus callosum and supplementary motor area.',
  },
  {
    id: 'gardner_kin_03_center_of_mass_support_polygon',
    moduleCode: 'MOD-02',
    moduleTitle: 'Bodily-Kinesthetic Intelligence (Body Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Postural Equilibrium & Support Polygon',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'bodily_kinesthetic',
    smartLabel: 'Body Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'EXPERIMENT: Stand with your heels, calves, glutes, and shoulder blades pressed flat against a wall.',
      'INSTRUCTION: Bend forward at the waist to touch your toes without bending your knees or falling.',
      'OBSERVATION: Even elite athletes tip forward unless their feet step away from the wall.',
    ],
    question:
      'What biomechanical constraint makes it physically impossible to bend forward and touch your toes while your heels and hips are blocked from moving backward by a wall?',
    formulaHint: 'Vertical projection of the Center of Mass (CoM) must stay within the base of support (feet)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'The wall prevents the pelvis from shifting backward to counter-balance the forward-moving torso, pushing the center of mass outside the base of support',
      'Hamstring flexibility decreases by 50% when the heels touch a vertical surface',
      'The inner ear vestibular system loses gravity calibration near vertical walls',
      'Spinal flexion locks when the scapulae touch a flat surface',
    ],
    correctIndex: 0,
    explanation:
      'Normally, bending forward shifts the pelvis backward so the combined center of mass stays directly over the feet. The wall blocks this posterior counterweight shift, forcing the CoM ahead of the toes.',
  },
  {
    id: 'gardner_kin_04_kinetic_chain_sequencing',
    moduleCode: 'MOD-03',
    moduleTitle: 'Bodily-Kinesthetic Intelligence (Body Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Proximal-to-Distal Kinetic Chain',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'bodily_kinesthetic',
    smartLabel: 'Body Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'HIGH-VELOCITY MOTOR SKILL: Overhand pitch, tennis serve, or martial arts strike.',
      'SEGMENTS:  (1) Ground-force leg drive  (2) Pelvic rotation  (3) Torso whip',
      '           (4) Shoulder external/internal rotation  (5) Elbow extension  (6) Wrist snap.',
    ],
    question:
      'How does the "proximal-to-distal kinematic sequence" maximize terminal velocity at the fingertips or implement?',
    formulaHint: 'Each heavier proximal segment decelerates to transfer momentum into the lighter adjacent distal segment',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Each proximal segment reaches peak angular velocity and then decelerates just as the next lighter distal segment accelerates, compounding whip-like momentum',
      'All six body segments contract at the exact same millisecond to lock the joints into a rigid lever',
      'The wrist snaps first while the legs remain stationary until follow-through',
      'Distal segments generate all kinetic energy while the core remains relaxed',
    ],
    correctIndex: 0,
    explanation:
      'In an optimal kinetic chain, energy flows from the ground through large proximal muscles (legs/hips/trunk) to smaller distal segments; as each proximal segment decelerates, conservation of momentum accelerates the lighter distal segment.',
  },
  {
    id: 'gardner_kin_05_vestibular_vor_reflex',
    moduleCode: 'MOD-04',
    moduleTitle: 'Bodily-Kinesthetic Intelligence (Body Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Vestibulo-Ocular & Spotting Reflex',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'bodily_kinesthetic',
    smartLabel: 'Body Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'RAPID PIROUETTE: A dancer executes 6 continuous 360° turns on a single forefoot pivot.',
      'TECHNIQUE ("SPOTTING"): Fixating the eyes on a single stationary landmark and snapping the head',
      '                        around faster than the torso once per revolution.',
    ],
    question:
      'Why does biomechanical "spotting" prevent post-rotational vertigo during high-speed turns?',
    formulaHint: 'Minimizes continuous endolymph fluid acceleration in the semicircular canals and stabilizes retinal flow',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Intermittent head fixation breaks continuous fluid inertia in the inner ear’s semicircular canals and suppresses nystagmus via visual anchoring',
      'Snapping the neck increases blood pressure to the visual cortex',
      'Closing the eyes during the turn disables the semicircular canals',
      'Spotting transfers rotational friction from the ankle to the cervical spine',
    ],
    correctIndex: 0,
    explanation:
      'Continuous head rotation sets endolymph fluid spinning in the semicircular canals; spotting holds the head stationary for most of each turn and gives the brain a fixed visual anchor, preventing post-rotational dizziness.',
  },
  {
    id: 'gardner_kin_06_tactile_haptic_lever',
    moduleCode: 'MOD-02',
    moduleTitle: 'Bodily-Kinesthetic Intelligence (Body Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Micro-Surgical Tactile Leverage',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'bodily_kinesthetic',
    smartLabel: 'Body Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PRECISION TASK: Threading a 0.05 mm micro-suture under 20× magnification.',
      'BIOMECHANICAL SETUP: Forearms and ulnar edges of the wrists are anchored firmly on rests;',
      '                     motion is restricted to intrinsic finger muscles (lumbricals/interossei).',
    ],
    question:
      'Why does anchoring the ulnar wrist and isolating the intrinsic muscles of the fingers dramatically reduce physiological tremor during micro-dexterity tasks?',
    formulaHint: 'Eliminating multi-joint degrees of freedom (shoulder/elbow) shortens the kinematic lever arm',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Locking proximal joints eliminates long-lever angular oscillations from the shoulder and elbow, isolating short-lever high-density motor units in the fingertips',
      'Pressing the wrist compresses the median nerve to numb the hand',
      'Shoulder muscles have finer motor-unit innervation ratios than finger muscles',
      'Resting the forearms increases heart-rate variability in the fingertips',
    ],
    correctIndex: 0,
    explanation:
      'Small angular tremors at the shoulder or elbow are magnified over the 60 cm length of the arm. Anchoring the wrist eliminates those long-lever degrees of freedom and relies on the small motor units of the intrinsic hand muscles.',
  },
  {
    id: 'gardner_kin_07_countersteering_dynamics',
    moduleCode: 'MOD-03',
    moduleTitle: 'Bodily-Kinesthetic Intelligence (Body Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Dynamic Balance & Counter-Steering',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'bodily_kinesthetic',
    smartLabel: 'Body Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'VEHICLE / BODY DYNAMICS: Riding a two-wheeled bicycle or motorcycle at 40 km/h.',
      'TARGET MANEUVER: Initiate a rapid lean and turn to the LEFT.',
      'INITIAL HANDLEBAR INPUT: Momentarily push the left handlebar forward (steering slightly RIGHT).',
    ],
    question:
      'Why must a rider momentarily steer slightly RIGHT ("counter-steer") to initiate a fast lean and turn to the LEFT on a two-wheeled vehicle?',
    formulaHint: 'Tracking the contact patch rightward pulls the wheels out from under the center of mass toward the right, inducing a leftward roll',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Steering momentarily right tracks the tire contact patches to the right of the center of mass, creating a gravitational roll torque that leans the rider into the left turn',
      'Gyroscopic precession reverses left and right only above 100 km/h',
      'Steering right locks the rear differential to slide the rear tire left',
      'It shifts aerodynamic drag onto the right shoulder',
    ],
    correctIndex: 0,
    explanation:
      'To turn left without tipping outward, the center of mass must first lean inside (left) of the tire contact line. Momentarily steering right moves the tires rightward under the rider, causing the body and bike to lean cleanly to the left.',
  },

  // ============================================================================
  // 6. INTERPERSONAL INTELLIGENCE (PEOPLE SMART) — 7 QUESTIONS
  // ============================================================================
  {
    id: 'gardner_soc_01_affective_vs_cognitive_empathy',
    moduleCode: 'MOD-01',
    moduleTitle: 'Interpersonal Intelligence (People Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Theory of Mind & Non-Defensive De-escalation',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'interpersonal',
    smartLabel: 'People Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'SCENARIO: During a high-stakes launch review, a colleague snaps: "Nobody ever reads my specs!"',
      'HIDDEN STATE: The colleague worked through the weekend after a late requirement change broke their module.',
      'GOAL: Restore psychological safety and collaborative alignment.',
    ],
    question:
      'Which interpersonal response demonstrates the highest emotional and social intelligence in this moment?',
    formulaHint: 'Validate the underlying effort and frustration before addressing factual specifics',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Acknowledge the frustration behind the statement ("You put huge effort into those specs and the late change disrupted your work — let’s walk through your constraints first")',
      'Immediately prove them wrong by listing three emails where you quoted their spec',
      'Tell them to calm down and keep emotion out of engineering meetings',
      'Change the subject to avoid awkwardness and ignore their module',
    ],
    correctIndex: 0,
    explanation:
      'High interpersonal intelligence reads the subtext beneath hyperbole ("nobody ever..."), validates the unseen effort and stress, and invites collaborative problem-solving rather than triggering a defensive debate.',
  },
  {
    id: 'gardner_soc_02_double_bind_mediation',
    moduleCode: 'MOD-02',
    moduleTitle: 'Interpersonal Intelligence (People Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Interest-Based Negotiation (Positions vs. Interests)',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'interpersonal',
    smartLabel: 'People Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'CONFLICT: Lead Designer demands a 3-week freeze; Lead Engineer demands daily deployment.',
      'SURFACE POSITIONS:Mutually exclusive ("Freeze all code" vs. "Ship every day").',
      'UNDERLYING INTERESTS: Designer fears unreviewed UI regressions; Engineer fears massive merge conflicts.',
    ],
    question:
      'Using integrative negotiation (Harvard Principled Negotiation), how should a mediator resolve this deadlock?',
    formulaHint: 'Separate rigid surface positions from compatible underlying interests',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Reframe around shared interests: allow daily backend merges behind feature flags while gating user-visible UI releases on a joint design sign-off',
      'Split the difference with a 10-day freeze that leaves both sides partially blocked',
      'Escalate to an executive vote so one side wins and the other complies',
      'Have both teams work in separate repositories without talking',
    ],
    correctIndex: 0,
    explanation:
      'By separating stated positions from underlying psychological/operational needs, feature flags satisfy the engineer’s need for small continuous merges and the designer’s need for curated visual quality.',
  },
  {
    id: 'gardner_soc_03_second_order_theory_of_mind',
    moduleCode: 'MOD-03',
    moduleTitle: 'Interpersonal Intelligence (People Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Second-Order Recursive Theory of Mind',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'interpersonal',
    smartLabel: 'People Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'EVENT 1: Elena places the prototype key in Drawer A while Marcus watches.',
      'EVENT 2: Marcus leaves. Elena moves the key to Vault B, unaware that Marcus is peeking through the glass.',
      'EVENT 3: Later, Elena asks herself: "Where will Marcus look for the key?"',
    ],
    question:
      'According to second-order Theory of Mind (what Elena believes about Marcus’s belief), where does Elena expect Marcus to look, vs. where will Marcus actually look?',
    formulaHint: 'Elena does not know Marcus saw the transfer to Vault B',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Elena expects Marcus to look in Drawer A (false second-order belief), whereas Marcus will actually look in Vault B',
      'Elena expects Marcus to look in Vault B, and Marcus will look in Drawer A',
      'Both Elena and Marcus expect the key to be in Drawer A',
      'Elena expects Marcus to ask a third person because she knows he peeked',
    ],
    correctIndex: 0,
    explanation:
      'Marcus saw the move so he knows the key is in Vault B (true first-order belief). However, Elena did not see Marcus peeking, so Elena holds a false second-order belief that Marcus still thinks the key is in Drawer A.',
  },
  {
    id: 'gardner_soc_04_pluralistic_ignorance',
    moduleCode: 'MOD-02',
    moduleTitle: 'Interpersonal Intelligence (People Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Group Dynamics & Pluralistic Ignorance',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'interpersonal',
    smartLabel: 'People Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'GROUP DYNAMICS: In a 12-person strategy meeting, a flawed proposal is presented.',
      'PRIVATE STATE: 10 of the 12 members privately recognize a critical flaw, but each stays silent',
      '               because they interpret everyone else’s silence as unanimous agreement.',
    ],
    question:
      'What social-psychological phenomenon describes a group where the majority privately rejects a norm or plan, yet goes along with it because each person mistakenly assumes everyone else supports it?',
    formulaHint: 'Shared false perception of the group’s private attitudes (also linked to the Abilene Paradox)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Pluralistic Ignorance (and the Abilene Paradox)',
      'The Dunning-Kruger Effect',
      'Fundamental Attribution Error',
      'Social Facilitation',
    ],
    correctIndex: 0,
    explanation:
      'Pluralistic ignorance occurs when group members privately harbor doubts or dissent but conform publicly because they misread others’ outward silence as genuine endorsement.',
  },
  {
    id: 'gardner_soc_05_nonverbal_microexpression',
    moduleCode: 'MOD-01',
    moduleTitle: 'Interpersonal Intelligence (People Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Congruence of Verbal & Paralinguistic Channels',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'interpersonal',
    smartLabel: 'People Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'OBSERVATION: A team member says "Sure, I can take on the extra weekend migration."',
      'NON-VERBAL CUES: 1.5-second hesitation pause, downward gaze shift, flat vocal prosody,',
      '                 and an asymmetric unilateral lip-corner tightening.',
    ],
    question:
      'When verbal compliance ("Sure") conflicts with paralinguistic hesitation and micro-expressive strain, how should a socially perceptive leader respond?',
    formulaHint: 'Check in gently on capacity and create an explicit off-ramp without putting them on the spot',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Notice the incongruence and offer a low-pressure check-in: "I hear a little hesitation — let’s look at your current load and see if we should split this across two people"',
      'Take the literal "Sure" at face value and assign the entire task immediately',
      'Publicly accuse them of being dishonest about their enthusiasm',
      'Cancel the project without speaking to them',
    ],
    correctIndex: 0,
    explanation:
      'Interpersonal intelligence integrates verbal and non-verbal channels. Naming the bandwidth concern supportively gives the colleague psychological permission to share their true constraints.',
  },
  {
    id: 'gardner_soc_06_psychological_safety_framing',
    moduleCode: 'MOD-03',
    moduleTitle: 'Interpersonal Intelligence (People Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'High-Reliability Team Framing (Amy Edmondson)',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'interpersonal',
    smartLabel: 'People Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'INCIDENT: A junior analyst catches and reports a subtle calibration bug 20 minutes before release.',
      'TEAM OUTCOME: The release is delayed by 2 hours, preventing a major production outage.',
      'LEADERSHIP MOMENT: The team is watching how the lead responds to the bearer of bad news.',
    ],
    question:
      'Which leadership response most strongly reinforces a culture of high psychological safety and error-reporting?',
    formulaHint: 'Reward the candor and systemic vigilance rather than punishing the delay',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Publicly thank the analyst for surfacing the risk early and run a blameless post-mortem on how automated checks can catch it sooner',
      'Fix the bug quietly but scold the analyst for waiting until 20 minutes before launch',
      'Blame the person who wrote the calibration module in the group chat',
      'Ship on time anyway to protect the schedule metric',
    ],
    correctIndex: 0,
    explanation:
      'Psychological safety depends on how leaders react when someone speaks up about a risk. Celebrating early candor and focusing on systemic improvements ensures future bugs are surfaced rather than hidden.',
  },
  {
    id: 'gardner_soc_07_fundamental_attribution_correction',
    moduleCode: 'MOD-04',
    moduleTitle: 'Interpersonal Intelligence (People Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Perspective-Taking & Attribution Symmetry',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'interpersonal',
    smartLabel: 'People Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ASYMMETRY: When we ourselves miss a deadline, we blame situational factors (server outage, unclear brief).',
      '           When a peer misses a deadline, we instinctively blame their character (carelessness, laziness).',
    ],
    question:
      'What cognitive-social bias is overcome when we intentionally evaluate a colleague’s mistake by looking for situational constraints first, just as we do for ourselves?',
    formulaHint: 'Lee Ross’s classic social attribution asymmetry',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'The Fundamental Attribution Error (Actor-Observer Asymmetry)',
      'The Gambler’s Fallacy',
      'Survivorship Bias',
      'The Anchoring Heuristic',
    ],
    correctIndex: 0,
    explanation:
      'The Fundamental Attribution Error (and Actor-Observer bias) is the tendency to over-attribute others’ behaviors to dispositional personality traits while attributing our own behaviors to situational context.',
  },

  // ============================================================================
  // 7. INTRAPERSONAL INTELLIGENCE (SELF SMART) — 7 QUESTIONS
  // ============================================================================
  {
    id: 'gardner_slf_01_metacognitive_calibration',
    moduleCode: 'MOD-01',
    moduleTitle: 'Intrapersonal Intelligence (Self Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Metacognitive Confidence Calibration',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'intrapersonal',
    smartLabel: 'Self Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'METACOGNITIVE AUDIT: Across 20 decisions where you felt "95% certain",',
      '                     an objective review shows only 11 out of 20 (55%) were actually correct.',
      'SELF-REGULATION GOAL: Align subjective confidence with empirical accuracy.',
    ],
    question:
      'Which intrapersonal practice most effectively corrects systematic overconfidence and improves metacognitive calibration?',
    formulaHint: 'Explicitly generate falsifying reasons ("Pre-Mortem" / "Consider the Opposite") before locking in confidence',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Conducting a "Pre-Mortem" before deciding: assuming the judgment is wrong and listing the top 3 concrete ways it could fail, while tracking a calibration log',
      'Making decisions faster so self-doubt cannot interfere',
      'Avoiding all quantitative probability estimates',
      'Consulting only sources that agree with your initial intuition',
    ],
    correctIndex: 0,
    explanation:
      'Intrapersonal metacognition requires monitoring the gap between feeling right and being right. Pre-mortems and tracking Brier-score calibration logs systematically counter confirmation bias.',
  },
  {
    id: 'gardner_slf_02_cognitive_reappraisal',
    moduleCode: 'MOD-02',
    moduleTitle: 'Intrapersonal Intelligence (Self Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Affective Granularity & Cognitive Reappraisal',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'intrapersonal',
    smartLabel: 'Self Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PHYSIOLOGICAL AROUSAL: Elevated heart rate (118 BPM), palmar sweat, heightened catecholamines',
      '                       3 minutes before delivering a keynote presentation.',
      'PATHWAY A (Suppression): "I must force myself to stop feeling nervous." (Increases sympathetic load)',
      'PATHWAY B (Reappraisal): Reframing the exact same physiological signal constructively.',
    ],
    question:
      'According to emotion-regulation research (James Gross / Alison Wood Brooks), how does high Intrapersonal Intelligence regulate pre-performance sympathetic arousal?',
    formulaHint: 'Cognitive reappraisal of high-arousal threat into high-arousal readiness/challenge',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Reappraising the physiological arousal as adaptive mobilization ("My body is delivering oxygen and focus for a high-stakes challenge") rather than trying to suppress it',
      'Suppressing all facial expressions while repeating "Nothing matters"',
      'Interpreting a fast heartbeat as proof that you are unprepared',
      'Ruminating on every possible mistake that could happen on stage',
    ],
    correctIndex: 0,
    explanation:
      'Trying to suppress high autonomic arousal backfires (ironic process theory), whereas cognitive reappraisal converts threat physiology (vasoconstriction) into challenge physiology (increased cardiac output and focus).',
  },
  {
    id: 'gardner_slf_03_sunk_cost_detachment',
    moduleCode: 'MOD-03',
    moduleTitle: 'Intrapersonal Intelligence (Self Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Ego Detachment & Sunk-Cost Immunity',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'intrapersonal',
    smartLabel: 'Self Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'INTERNAL DILEMMA: You personally championed Architecture X and invested 4 months building it.',
      'NEW EVIDENCE: A newly benchmarked Architecture Y is 5× faster and will take only 2 weeks to adopt,',
      '              whereas finishing Architecture X will take 6 more weeks and yield inferior results.',
    ],
    question:
      'What internal psychological mechanism causes people to stay committed to Architecture X, and how does Self-Smart reflection overcome it?',
    formulaHint: 'Decouple personal identity/worth from past unrecoverable time ("What would I choose if I joined the project today?")',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Overcoming Ego-Defensive Escalation of Commitment (Sunk Cost Fallacy) by asking: "If a new lead took over my role today with zero ego attached to the past 4 months, which path would they pick?"',
      'Doubling down on Architecture X to prove your original instinct was right',
      'Hiding the benchmark results of Architecture Y so no one questions the past 4 months',
      'Blaming the hardware for Architecture X’s slow performance',
    ],
    correctIndex: 0,
    explanation:
      'Self-awareness recognizes when ego-protection ("I don’t want my past 4 months to look wasted") is masquerading as persistence. Adopting an outside-view zero-base reset frees decision-making from unrecoverable sunk costs.',
  },
  {
    id: 'gardner_slf_04_emotional_granularity',
    moduleCode: 'MOD-01',
    moduleTitle: 'Intrapersonal Intelligence (Self Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Lisa Feldman Barrett’s Emotional Granularity',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'intrapersonal',
    smartLabel: 'Self Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'COARSE LABELING: "I feel bad / stressed." (Vague, undifferentiated global distress)',
      'GRANULAR LABELING: Distinguishing precisely between "overwhelmed by ambiguous scope",',
      '                   "disappointed by an unmet expectation", or "under-recovered from sleep debt".',
    ],
    question:
      'Why does high "emotional granularity" (precisely differentiating internal affective states) lead to superior self-regulation?',
    formulaHint: 'Specific affective labels map directly to targeted behavioral remedies ("Name it to tame it")',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Precise emotional differentiation down-regulates amygdala reactivity and reveals the specific actionable cause (e.g., clarifying scope vs. resting)',
      'Using longer words distracts the prefrontal cortex from solving the problem',
      'Coarse labels like "bad" are always more accurate than specific emotions',
      'Granular labeling prevents the brain from forming long-term memories',
    ],
    correctIndex: 0,
    explanation:
      'Neuroimaging (Lieberman; Barrett) shows that precise affect labeling recruits the right ventrolateral prefrontal cortex to dampen amygdala reactivity and gives the executive system an actionable diagnosis.',
  },
  {
    id: 'gardner_slf_05_intrinsic_vs_extrinsic_locus',
    moduleCode: 'MOD-02',
    moduleTitle: 'Intrapersonal Intelligence (Self Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Self-Determination & Values Alignment',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'intrapersonal',
    smartLabel: 'Self Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'REFLECTIVE OBSERVATION: An individual achieves rapid external promotions and prestige,',
      '                        yet experiences growing apathy, cynicism, and creative depletion.',
      'PSYCHOLOGICAL DIAGNOSTIC: Deci & Ryan’s Self-Determination Theory (Autonomy, Mastery, Purpose).',
    ],
    question:
      'In intrapersonal psychology, what explains burnout occurring even during periods of high external reward and praise?',
    formulaHint: 'Misalignment between extrinsic validation and intrinsic core values / autonomy',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Chronic discordance between extrinsic achievement goals and one’s intrinsic core values (autonomy, authentic mastery, and inner purpose)',
      'Having too much free time outside of work',
      'Completing tasks too accurately on the first attempt',
      'A lack of competitive pressure from peers',
    ],
    correctIndex: 0,
    explanation:
      'Intrapersonal intelligence distinguishes between socially prescribed goals (extrinsic validation) and self-concordant goals rooted in authentic autonomy and intrinsic meaning.',
  },
  {
    id: 'gardner_slf_06_psychological_projection',
    moduleCode: 'MOD-03',
    moduleTitle: 'Intrapersonal Intelligence (Self Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Shadow Integration & Projection Recognition',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'intrapersonal',
    smartLabel: 'Self Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'SELF-OBSERVATION: You notice an intense, disproportionate irritation toward a peer who',
      '                  occasionally promotes their own work, even though others barely notice it.',
      'INTROSPECTIVE PROBE: Exploring why this specific trait triggers a 10/10 emotional reaction in you.',
    ],
    question:
      'When reflective self-inquiry reveals that an intense, disproportionate irritation at a trait in someone else stems from disowned or suppressed desires/fears within oneself, what mechanism has been uncovered?',
    formulaHint: 'Classical & depth-psychological defense mechanism of attributing unacknowledged inner traits outward',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Psychological Projection (recognizing a disowned or conflicted aspect of oneself mirrored externally)',
      'Retroactive Interference',
      'Procedural Priming',
      'Sensory Habituation',
    ],
    correctIndex: 0,
    explanation:
      'High intrapersonal intelligence treats disproportionate emotional triggers as diagnostic mirrors, recognizing when an unacknowledged inner conflict or suppressed ambition is being projected outward.',
  },
  {
    id: 'gardner_slf_07_solitude_default_mode',
    moduleCode: 'MOD-04',
    moduleTitle: 'Intrapersonal Intelligence (Self Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Constructive Internal Reflection vs. Rumination',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'intrapersonal',
    smartLabel: 'Self Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'MODE 1 (Brooding Rumination): Immersed first-person replay ("Why did this happen to me?").',
      'MODE 2 (Self-Distanced Reflection): Observing the experience from a wise third-person perspective',
      '                                    ("What can [Own Name] learn from this situation?").',
    ],
    question:
      'According to Ethan Kross’s research on inner voice and self-reflection, how does "self-distancing" transform counterproductive rumination into adaptive insight?',
    formulaHint: 'Psychological distance shifts activation from emotional threat loops to executive meaning-making',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Adopting a self-distanced observer perspective prevents emotional re-immersion and enables objective pattern recognition and constructive closure',
      'Repeating the stressful memory 50 times in first-person erases the memory trace',
      'Self-distancing means pretending the event happened to a fictional character and ignoring the lesson',
      'Internal monologue has no measurable effect on stress hormones',
    ],
    correctIndex: 0,
    explanation:
      'Stepping back to observe oneself from a self-distanced perspective (or using one’s own name in inner dialogue) prevents reliving acute distress while preserving deep autobiographical insight.',
  },

  // ============================================================================
  // 8. NATURALIST INTELLIGENCE (NATURE SMART) — 7 QUESTIONS
  // ============================================================================
  {
    id: 'gardner_nat_01_trophic_cascade',
    moduleCode: 'MOD-01',
    moduleTitle: 'Naturalist Intelligence (Nature Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Trophic Cascades & Keystone Species Ecology',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'naturalist',
    smartLabel: 'Nature Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ECOSYSTEM CHAIN:  Apex Predator (Grey Wolf)  ──►  Herbivore (Elk)  ──►  Riparian Willow & Aspen',
      '                                                                        ──►  Riverbank Stabilization & Beavers',
      'PERTURBATION: Reintroducing the apex predator into a river valley after a 70-year absence.',
    ],
    question:
      'How can reintroducing an apex terrestrial predator (such as wolves in Yellowstone) physically narrow and stabilize meandering river channels?',
    formulaHint: 'Top-down trophic cascade + "Ecology of Fear" altering herbivore grazing behavior along riverbanks',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Predators reduce herbivore overgrazing in vulnerable river valleys, allowing deep-rooted willow and aspen stands to regenerate and lock riverbank soil in place',
      'Predators dig drainage trenches along the floodplains',
      'Apex predators consume aquatic algae directly from the riverbeds',
      'Reduced herbivore populations cause annual rainfall to drop by 40%',
    ],
    correctIndex: 0,
    explanation:
      'Through a top-down trophic cascade, predators keep elk moving out of open riparian corridors, enabling bankside trees and shrubs to recover, which stabilizes soil erosion and restores beaver dam habitats.',
  },
  {
    id: 'gardner_nat_02_convergent_evolution',
    moduleCode: 'MOD-02',
    moduleTitle: 'Naturalist Intelligence (Nature Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Phylogenetic Systematics & Convergent Evolution',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'naturalist',
    smartLabel: 'Nature Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'TAXON A:  Cactaceae (Americas) — Spines, succulent water-storing stems, CAM photosynthesis.',
      'TAXON B:  Euphorbiaceae (African desert species) — Spines, succulent stems, milky latex sap.',
      'GENOMIC DATA: Distantly related angiosperm orders whose common ancestor was a non-succulent leafy plant.',
    ],
    question:
      'In evolutionary biology and taxonomy, what principle explains why American cacti and African desert euphorbias share nearly identical body plans despite belonging to distant plant families?',
    formulaHint: 'Independent evolution of analogous traits under identical arid selective pressures',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Convergent evolution producing analogous structures in response to similar arid ecological niches',
      'Homologous inheritance from a single desert-dwelling Jurassic cactus ancestor',
      'Horizontal gene transfer carried by migratory desert locusts',
      'Mullerian mimicry between two insectivorous plants',
    ],
    correctIndex: 0,
    explanation:
      'Naturalist intelligence distinguishes homologous traits (shared ancestry) from analogous traits formed by convergent evolution when unrelated lineages adapt to identical environmental pressures.',
  },
  {
    id: 'gardner_nat_03_phyllotaxis_fibonacci',
    moduleCode: 'MOD-03',
    moduleTitle: 'Naturalist Intelligence (Nature Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Botanical Phyllotaxis & Golden Angle Packing',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'naturalist',
    smartLabel: 'Nature Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'BOTANICAL PATTERN: Sunflower seed heads, pine cones, and succulent rosettes.',
      'SPIRAL COUNTS: Clockwise and counter-clockwise parastichy spirals consistently appear as',
      '               consecutive Fibonacci pairs: (21, 34), (34, 55), or (55, 89).',
      'DIVERGENCE ANGLE: Each new primordium emerges at θ ≈ 137.5077° (360° / φ²).',
    ],
    question:
      'What adaptive physical advantage causes botanical meristems to space new leaves and seeds at the Golden Angle (≈ 137.5°)?',
    formulaHint: 'The most irrational ratio prevents periodic radial stacking, maximizing light capture and seed packing density',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Because the Golden Ratio is maximally irrational, new leaves never align directly above older ones, maximizing sunlight interception and uniform seed packing without gaps',
      'It aligns the plant’s vascular bundles with Earth’s magnetic declination',
      'A 137.5° angle causes rainwater to evaporate before reaching the roots',
      'Pollinating bees can only see angles divisible by 137.5°',
    ],
    correctIndex: 0,
    explanation:
      'Any rational fraction of 360° eventually stacks leaves in radial spokes that shade lower leaves; the Golden Angle (360° × (1 − 1/φ) ≈ 137.5°) distributes primordia with optimal non-overlapping uniformity.',
  },
  {
    id: 'gardner_nat_04_mycorrhizal_network',
    moduleCode: 'MOD-02',
    moduleTitle: 'Naturalist Intelligence (Nature Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Symbiotic Mycorrhizal Nutrient Exchange',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'naturalist',
    smartLabel: 'Nature Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ORGANISM 1: Forest Canopy Tree (photosynthesizes hexose sugars from atmospheric CO₂ + sunlight).',
      'ORGANISM 2: Mycorrhizal Fungi (microscopic hyphal threads with 100× the absorptive surface area of roots,',
      '            capable of solubilizing mineral phosphorus and nitrogen from rock/soil).',
    ],
    question:
      'What bidirectional resource trade defines the mutualistic symbiosis between vascular forest trees and mycorrhizal fungi?',
    formulaHint: 'Autotrophic carbon sugars traded for soil-locked mineral phosphorus/nitrogen and water',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Trees supply photosynthetically fixed carbon sugars to the fungi, while fungal hyphae deliver soil phosphorus, nitrogen, and water to the tree roots',
      'Fungi perform photosynthesis underground and send oxygen to the tree leaves',
      'Trees parasitize the fungi without returning any metabolic energy',
      'Fungi consume tree bark to raise soil acidity',
    ],
    correctIndex: 0,
    explanation:
      'Fungi cannot photosynthesize, so they rely on trees for carbohydrates (up to 30% of the tree’s fixed carbon) in exchange for mining scarce soil phosphorus, nitrogen, and water.',
  },
  {
    id: 'gardner_nat_05_cloud_thermodynamics_lenticular',
    moduleCode: 'MOD-03',
    moduleTitle: 'Naturalist Intelligence (Nature Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Meteorological Pattern Recognition',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'naturalist',
    smartLabel: 'Nature Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'FIELD OBSERVATION: Stationary, smooth, lens-shaped (altocumulus lenticularis) clouds hovering',
      '                   directly over and downwind of a high mountain ridge despite 80 km/h winds.',
      'ATMOSPHERIC PHYSICS: Stable moist air forced upward over a topographic barrier.',
    ],
    question:
      'What atmospheric condition does a stationary lens-shaped (lenticular) cloud over a mountain peak reveal to a naturalist or mountaineer?',
    formulaHint: 'Standing gravity waves where moist air cools to the dew point at the wave crest and evaporates in the trough',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'High-velocity winds blowing across the ridge are forming standing atmospheric lee waves (condensing continuously at the cold wave crest and evaporating on the descent), warning of severe mountain-wave turbulence',
      'Calm, windless high-pressure conditions ideal for ballooning',
      'An imminent tropical hurricane eye directly overhead',
      'Volcanic ash venting from the mountain summit',
    ],
    correctIndex: 0,
    explanation:
      'Lenticular clouds appear stationary because moist air continuously condenses as it rises into the cold crest of a standing mountain wave and evaporates as it descends into the warmer trough, signaling strong high-altitude winds and rotor turbulence.',
  },
  {
    id: 'gardner_nat_06_island_biogeography',
    moduleCode: 'MOD-04',
    moduleTitle: 'Naturalist Intelligence (Nature Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'MacArthur-Wilson Island Biogeography Equilibrium',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'naturalist',
    smartLabel: 'Nature Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ISLAND A: Large area (5,000 km²), located 20 km from the continental mainland.',
      'ISLAND B: Small area (50 km²), located 1,200 km from the continental mainland.',
      'PARAMETERS: Species Immigration Rate (I) vs. Local Extinction Rate (E).',
    ],
    question:
      'According to MacArthur and Wilson’s Theory of Island Biogeography, why does Island A sustain a much higher equilibrium number of species than Island B?',
    formulaHint: 'Near proximity maximizes immigration rate I; large area minimizes local extinction rate E',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Nearness to the mainland maximizes species immigration rates, while larger habitat area supports larger populations and diverse micro-niches that lower extinction rates',
      'Small remote islands receive more solar radiation, which prevents speciation',
      'Ocean currents only carry seeds toward large landmasses',
      'Extinction rates are always zero on islands closer than 50 km to a continent',
    ],
    correctIndex: 0,
    explanation:
      'Equilibrium species richness occurs where immigration equals extinction: proximity to the mainland boosts colonization rate I, and larger island area reduces demographic stochasticity and extinction rate E.',
  },
  {
    id: 'gardner_nat_07_batesian_vs_mullerian_mimicry',
    moduleCode: 'MOD-01',
    moduleTitle: 'Naturalist Intelligence (Nature Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Evolutionary Aposematism & Mimicry Systems',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'naturalist',
    smartLabel: 'Nature Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'CASE 1: The harmless Hoverfly (Syrphidae) evolves the black-and-yellow warning stripes of a stinging Wasp.',
      'CASE 2: Two genuinely toxic Heliconius butterfly species evolve the exact same bright red-and-black wing pattern.',
    ],
    question:
      'In natural history and evolutionary ecology, how are Case 1 and Case 2 formally classified?',
    formulaHint: 'Harmless bluffing a toxic model (Batesian) vs. two toxic species sharing predator education costs (Müllerian)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Case 1 is Batesian mimicry (harmless mimic of a defended model); Case 2 is Müllerian mimicry (mutual warning signal shared by two defended species)',
      'Case 1 is Müllerian mimicry; Case 2 is Batesian mimicry',
      'Both cases are examples of cryptic camouflage against tree bark',
      'Case 1 is aggressive mimicry; Case 2 is genetic drift',
    ],
    correctIndex: 0,
    explanation:
      'In Batesian mimicry, a palatable species parasitizes the warning signal of a noxious model. In Müllerian mimicry, two unpalatable species converge on a shared aposematic pattern so predators learn to avoid both twice as fast.',
  },

  // ============================================================================
  // 9. EXISTENTIAL INTELLIGENCE (PHILOSOPHY SMART) — 7 QUESTIONS
  // ============================================================================
  {
    id: 'gardner_exi_01_ship_of_theseus_identity',
    moduleCode: 'MOD-04',
    moduleTitle: 'Existential Intelligence (Philosophy Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Ontology of Persistence & Personal Identity',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'existential',
    smartLabel: 'Philosophy Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PARADOX: Over 30 years, every wooden plank of Theseus’s ship is replaced one by one (Ship A).',
      '         Meanwhile, all the discarded original planks are reassembled in a shipyard (Ship B).',
      'BIOLOGICAL ANALOGUE: The human body replaces nearly all of its cellular atoms over a lifetime.',
    ],
    question:
      'What fundamental ontological conflict does the Ship of Theseus expose regarding what makes an entity or conscious self "the same" across time?',
    formulaHint: 'Material substratum continuity vs. spatiotemporal/functional pattern continuity',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'The tension between defining identity by its original material constituents (Ship B) versus defining identity by continuous functional form and causal history (Ship A)',
      'Proof that physical objects cannot move through three-dimensional space',
      'A demonstration that wooden ships have higher entropy than steel ships',
      'Proof that time flows backward in closed thermodynamic systems',
    ],
    correctIndex: 0,
    explanation:
      'The paradox forces us to distinguish between material composition (exact same atoms) and teleological/spatiotemporal continuity (unbroken pattern of organization and memory over time).',
  },
  {
    id: 'gardner_exi_02_frankl_tragic_optimism',
    moduleCode: 'MOD-04',
    moduleTitle: 'Existential Intelligence (Philosophy Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Viktor Frankl’s Logotherapy & Existential Meaning',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'existential',
    smartLabel: 'Philosophy Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'EXISTENTIAL AXIOM (Viktor Frankl): "Between stimulus and response there is a space.',
      '                                    In that space is our power to choose our response."',
      'CONTEXT: Confronting unavoidable finitude, loss, or unchangeable external adversity.',
    ],
    question:
      'In existential philosophy and logotherapy, how is meaning sustained when an external situation itself cannot be physically altered?',
    formulaHint: 'Attitudinal values: transforming unavoidable suffering through the stance one chooses toward it',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'By exercising the irreducible human freedom to choose one’s inward attitude, dignity, and ethical responsibility toward the unchangeable circumstance',
      'By denying that suffering or mortality exists',
      'By waiting passively until external pleasure returns on its own',
      'By assuming all human choices are predetermined reflexes',
    ],
    correctIndex: 0,
    explanation:
      'Frankl’s existential framework holds that when we are no longer able to change a situation, we are challenged to change ourselves through the dignity and meaning-oriented attitude we choose.',
  },
  {
    id: 'gardner_exi_03_chinese_room_qualia',
    moduleCode: 'MOD-04',
    moduleTitle: 'Existential Intelligence (Philosophy Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Philosophy of Mind: Syntax vs. Conscious Semantics',
    difficulty: 'Apex',
    points: 16,
    gardnerDomain: 'existential',
    smartLabel: 'Philosophy Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'THOUGHT EXPERIMENT (John Searle & Mary’s Room / Thomas Nagel):',
      '• A rulebook processor manipulates symbols perfectly without knowing what any symbol means.',
      '• A neuroscientist knows every physical wavelength of red (700 nm) but has lived only in black-and-white.',
    ],
    question:
      'What core philosophical distinction do the Chinese Room and "Hard Problem of Consciousness" (David Chalmers) highlight?',
    formulaHint: 'Formal symbol manipulation (syntax/function) vs. subjective first-person conscious experience (semantics/qualia)',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'The irreducibility of first-person subjective conscious experience ("qualia" and intrinsic meaning) to purely formal rule-following syntax',
      'The claim that silicon transistors cannot perform binary addition',
      'The proof that human languages have no grammatical rules',
      'The idea that color vision only operates in low light',
    ],
    correctIndex: 0,
    explanation:
      'These arguments distinguish objective functional processing (syntax) from subjective phenomenal consciousness ("what it is like" to experience meaning or red — qualia and intentionality).',
  },
  {
    id: 'gardner_exi_04_rawls_veil_of_ignorance',
    moduleCode: 'MOD-04',
    moduleTitle: 'Existential Intelligence (Philosophy Smart)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Moral Philosophy & Impartial Justice',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'existential',
    smartLabel: 'Philosophy Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'THOUGHT EXPERIMENT: Design the foundational laws and resource rules of a civilization',
      '                    BEFORE knowing what position, wealth, health, or talent you will be born into.',
      'PHILOSOPHER: John Rawls ("Original Position" & "Veil of Ignorance").',
    ],
    question:
      'Why does the "Veil of Ignorance" serve as a rigorous philosophical test for universal justice?',
    formulaHint: 'Stripping away knowledge of one’s personal station forces rational self-interest to protect the most vulnerable position',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Because you could emerge as the least advantaged member of society, it neutralizes self-serving bias and compels you to design fair rules that uplift the floor for everyone',
      'It requires citizens to forget how to read and write after birth',
      'It guarantees that every person will have identical artistic tastes',
      'It eliminates the need for courts or scientific research',
    ],
    correctIndex: 0,
    explanation:
      'By concealing one’s eventual lottery of birth, the Veil of Ignorance aligns rational prudence with impartial fairness (the maximin principle: maximizing the wellbeing of the worst-off position).',
  },
  {
    id: 'gardner_exi_05_cosmic_overview_finitude',
    moduleCode: 'MOD-04',
    moduleTitle: 'Existential Intelligence (Philosophy Smart)',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Existential Finitude & Temporal Value',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'existential',
    smartLabel: 'Philosophy Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'PARADOX OF FINITUDE: If human life were infinitely long with unlimited tomorrows,',
      '                     no single choice, sacrifice, or afternoon would carry scarcity cost.',
      'PHILOSOPHICAL THESIS (Heidegger / Nussbaum / Borgesian Immortals): Mortality as the ground of urgency.',
    ],
    question:
      'In existential philosophy, how does awareness of human mortality and temporal finitude ("Being-toward-death") paradoxically heighten — rather than erase — the value of our choices?',
    formulaHint: 'Scarcity of time gives irreversible weight and authenticity to how we spend each finite moment',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Because our time is finite and non-renewable, choosing to devote hours to a person or craft represents a genuine, irreplaceable commitment that infinite time could never have',
      'Mortality proves that all ethical actions are identical to inaction',
      'Awareness of finitude makes long-term scientific projects impossible',
      'Only things that last forever can have aesthetic beauty',
    ],
    correctIndex: 0,
    explanation:
      'Existential thinkers note that in an infinite lifespan, every act can be postponed indefinitely without cost; finitude is precisely what makes courage, love, and prioritization meaningful.',
  },
  {
    id: 'gardner_exi_06_kant_categorical_universalizability',
    moduleCode: 'MOD-04',
    moduleTitle: 'Existential Intelligence (Philosophy Smart)',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Deontological Ethics & Universalizability',
    difficulty: 'Advanced',
    points: 14,
    gardnerDomain: 'existential',
    smartLabel: 'Philosophy Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'MAXIM UNDER TEST: "Whenever I am in financial trouble, I will make a false promise to repay a loan."',
      'UNIVERSALIZATION TEST: Imagine a world where EVERY person makes false promises whenever convenient.',
      'LOGICAL OUTCOME: The very institution of promising collapses, making the maxim self-defeating.',
    ],
    question:
      'In Kantian moral philosophy, why does a false promise fail the Categorical Imperative even before considering emotional consequences?',
    formulaHint: 'Performative contradiction: the maxim free-rides on an institution (trust) that its universal adoption would destroy',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Universalizing the maxim produces a logical contradiction: if everyone lied when promising, no one would believe promises, rendering the act of deceiving via a promise impossible',
      'Because banks charge compound interest on loans',
      'Because Kantian ethics evaluates actions solely by whether they feel pleasant in the moment',
      'Because promises can only be written in formal legal contracts',
    ],
    correctIndex: 0,
    explanation:
      'A false promise relies parasitically on the general expectation of truth-telling; universalizing the rule destroys the very condition (trust in promises) required for the lie to work.',
  },
  {
    id: 'gardner_exi_07_sartre_existence_precedes_essence',
    moduleCode: 'MOD-04',
    moduleTitle: 'Existential Intelligence (Philosophy Smart)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Existential Authenticity vs. Bad Faith',
    difficulty: 'Standard',
    points: 12,
    gardnerDomain: 'existential',
    smartLabel: 'Philosophy Smart',
    questionFormat: 'cognitive_domain',
    stimulusLines: [
      'ARTIFACT (Paper-knife): Designed in a blueprint FIRST ("essence") before it is manufactured ("existence").',
      'HUMAN CONSCIOUSNESS: Arrives in the world FIRST ("existence") and defines itself through lived choices.',
      'CONCEPT: "Bad Faith" (Mauvaise foi) — pretending we have zero choice over who we become.',
    ],
    question:
      'What does the foundational existentialist proposition "Existence precedes essence" mean for human agency?',
    formulaHint: 'Unlike a pre-designed tool, humans are not locked into a fixed blueprint; we author our character through responsible action',
    matrixCells: EMPTY_MATRIX_CELLS,
    optionCells: [],
    options: [
      'Humans are not manufactured with a fixed, predetermined script; we first exist as conscious agents and continuously author our character through the choices we take responsibility for',
      'Physical matter existed billions of years after abstract Platonic ideas',
      'Human beings cannot learn skills that were not present at birth',
      'Social roles completely eliminate individual moral responsibility',
    ],
    correctIndex: 0,
    explanation:
      '"Existence precedes essence" means that unlike an engineered tool created for a fixed purpose, human beings define their own values and identity through authentic, responsible choices.',
  },
];

const SEEN_QUESTIONS_STORAGE_KEY = 'kerr_iq_seen_question_ids_v1';

export function getPreviouslySeenQuestionIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SEEN_QUESTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function savePreviouslySeenQuestionIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep up to the last 45 seen question IDs so consecutive tests always rotate fresh items
    const trimmed = ids.slice(-45);
    window.sessionStorage.setItem(SEEN_QUESTIONS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Given a question, returns a copy with shuffled answer options (for cognitive domain items)
 * or preserves A-F matrix order if desired, ensuring fresh option layouts on every draw.
 */
function shuffleCognitiveOptions(question: IQQuestion): IQQuestion {
  if (question.questionFormat === 'matrix_3x3' || question.optionCells.length > 0) {
    // Also shuffle matrix option tiles so memorizing letter A-F doesn't work across retakes!
    const indices = question.options.map((_, idx) => idx);
    const shuffledIndices = shuffleArray(indices);
    const newOptions = shuffledIndices.map((idx) => question.options[idx]);
    const newOptionCells = shuffledIndices.map((idx) => question.optionCells[idx]);
    const newCorrectIndex = shuffledIndices.indexOf(question.correctIndex);
    return {
      ...question,
      options: newOptions,
      optionCells: newOptionCells,
      correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
    };
  }

  const indices = question.options.map((_, idx) => idx);
  const shuffledIndices = shuffleArray(indices);
  const newOptions = shuffledIndices.map((idx) => question.options[idx]);
  const newCorrectIndex = shuffledIndices.indexOf(question.correctIndex);
  return {
    ...question,
    options: newOptions,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
  };
}

/**
 * Draws a stratified, non-repeating set of IQ questions from the master database
 * so each test session has a fresh set of questions covering Howard Gardner's 9 Multiple Intelligences.
 */
export function sampleRandomizedIQQuestions(
  masterDatabase: readonly IQQuestion[],
  mode: IQBatteryModeId = 'comprehensive_18',
  excludeIds: string[] = []
): IQQuestion[] {
  const excludeSet = new Set(excludeIds);

  const pickFromPool = (pool: readonly IQQuestion[], count: number): IQQuestion[] => {
    const unseen = shuffleArray(pool.filter((q) => !excludeSet.has(q.id)));
    const seen = shuffleArray(pool.filter((q) => excludeSet.has(q.id)));
    const combined = [...unseen, ...seen];
    return combined.slice(0, count).map(shuffleCognitiveOptions);
  };

  if (mode === 'matrices_16') {
    const matrixPool = masterDatabase.filter((q) => q.questionFormat === 'matrix_3x3');
    return pickFromPool(matrixPool, 16);
  }

  if (mode.startsWith('domain_')) {
    const targetDomain = mode.replace('domain_', '') as GardnerIntelligenceId;
    const domainPool = masterDatabase.filter((q) => q.gardnerDomain === targetDomain);
    if (domainPool.length > 0) {
      return pickFromPool(domainPool, Math.min(7, domainPool.length));
    }
  }

  if (mode === 'observatory_24') {
    const base18: IQQuestion[] = [];
    const usedIds = new Set<string>();
    for (const domainMeta of GARDNER_INTELLIGENCES) {
      const domainPool = masterDatabase.filter((q) => q.gardnerDomain === domainMeta.id);
      const picked = pickFromPool(domainPool, 2);
      picked.forEach((q) => usedIds.add(q.id));
      base18.push(...picked);
    }
    const remainingMatrices = masterDatabase.filter(
      (q) => q.questionFormat === 'matrix_3x3' && !usedIds.has(q.id)
    );
    const extra6 = pickFromPool(remainingMatrices, 6);
    const combined24 = [...base18, ...extra6].slice(0, 24);
    const diffRank: Record<IQQuestion['difficulty'], number> = {
      Standard: 0,
      Advanced: 1,
      Apex: 2,
    };
    return combined24.sort(
      (a, b) => diffRank[a.difficulty] - diffRank[b.difficulty] || a.points - b.points
    );
  }

  const perDomainCount = mode === 'gardner_9_quick' ? 1 : mode === 'full_deep_27' ? 3 : 2;
  const selected: IQQuestion[] = [];

  for (const domainMeta of GARDNER_INTELLIGENCES) {
    const domainPool = masterDatabase.filter((q) => q.gardnerDomain === domainMeta.id);
    if (domainMeta.id === 'spatial' || domainMeta.id === 'logical_mathematical') {
      // Ensure a balanced mix of 3x3 visual matrices and analytical domain items when perDomainCount >= 2
      const matricesInDomain = domainPool.filter((q) => q.questionFormat === 'matrix_3x3');
      const cognitiveInDomain = domainPool.filter((q) => q.questionFormat !== 'matrix_3x3');
      if (perDomainCount >= 2 && matricesInDomain.length > 0 && cognitiveInDomain.length > 0) {
        selected.push(...pickFromPool(matricesInDomain, 1));
        selected.push(...pickFromPool(cognitiveInDomain, perDomainCount - 1));
        continue;
      }
    }
    selected.push(...pickFromPool(domainPool, perDomainCount));
  }

  return selected;
}

export interface GardnerDomainScoreSummary {
  meta: GardnerIntelligenceMeta;
  itemCount: number;
  correctCount: number;
  earnedPoints: number;
  totalPoints: number;
  percent: number;
}

export interface MultipleIntelligencesAssessmentSummary {
  totalPossiblePoints: number;
  earnedPoints: number;
  answeredCount: number;
  correctCount: number;
  accuracyRatio: number;
  estimatedIq: number;
  domainScores: GardnerDomainScoreSummary[];
  topStrengths: GardnerDomainScoreSummary[];
}

/**
 * Pure deterministic scoring & profile engine for Howard Gardner's 9 Multiple Intelligences
 * and Composite Fluid/Multi-Domain IQ.
 */
export function computeMultipleIntelligencesProfile(
  activePool: readonly IQQuestion[],
  selectedAnswers: Readonly<Record<string, number>>,
  elapsedSeconds: number
): MultipleIntelligencesAssessmentSummary {
  const totalPossiblePoints = activePool.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = activePool.reduce((sum, q) => {
    const chosen = selectedAnswers[q.id];
    return chosen === q.correctIndex ? sum + q.points : sum;
  }, 0);
  const answeredCount = activePool.filter(
    (q) => typeof selectedAnswers[q.id] === 'number'
  ).length;
  const correctCount = activePool.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex
  ).length;

  const accuracyRatio = totalPossiblePoints > 0 ? earnedPoints / totalPossiblePoints : 0;
  const targetSpeedSeconds = activePool.length * 22;
  const speedBonus =
    answeredCount >= activePool.length && activePool.length > 0 && elapsedSeconds < targetSpeedSeconds
      ? Math.round(Math.max(0, (targetSpeedSeconds - elapsedSeconds) / 45) * accuracyRatio)
      : 0;
  const estimatedIq =
    answeredCount === 0
      ? 100
      : Math.min(162, Math.round(84 + accuracyRatio * 72 + speedBonus));

  const domainScores: GardnerDomainScoreSummary[] = GARDNER_INTELLIGENCES.map((meta) => {
    const domainItems = activePool.filter((q) => q.gardnerDomain === meta.id);
    const totalPts = domainItems.reduce((s, q) => s + q.points, 0);
    const earnedPts = domainItems.reduce(
      (s, q) => (selectedAnswers[q.id] === q.correctIndex ? s + q.points : s),
      0
    );
    const correctInDomain = domainItems.filter(
      (q) => selectedAnswers[q.id] === q.correctIndex
    ).length;
    const percent = totalPts > 0 ? Math.round((earnedPts / totalPts) * 100) : 0;
    return {
      meta,
      itemCount: domainItems.length,
      correctCount: correctInDomain,
      earnedPoints: earnedPts,
      totalPoints: totalPts,
      percent,
    };
  });

  const topStrengths = [...domainScores]
    .filter((d) => d.itemCount > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3);

  return {
    totalPossiblePoints,
    earnedPoints,
    answeredCount,
    correctCount,
    accuracyRatio,
    estimatedIq,
    domainScores,
    topStrengths,
  };
}

