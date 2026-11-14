import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Play,
  RotateCcw,
  Award,
  ChevronRight,
  ChevronLeft,
  Clock,
  Grid,
  Flag,
  Shuffle,
  Sparkles,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Activity,
  Copy,
  Check,
  Download,
  BarChart3,
  Layers,
  Gauge,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { UiThemeId } from '../scene/BlackHoleScene';
import {
  GARDNER_INTELLIGENCES,
  GARDNER_INTELLIGENCE_MAP,
  IQ_BATTERY_MODES,
  EXTRA_VISUAL_MATRIX_QUESTIONS,
  GARDNER_DOMAIN_QUESTIONS,
  sampleRandomizedIQQuestions,
  computeMultipleIntelligencesProfile,
  getPreviouslySeenQuestionIds,
  savePreviouslySeenQuestionIds,
  type GardnerIntelligenceId,
  type IQBatteryModeId,
} from './iqQuestionBank';
import {
  buildPostTestTelemetryReport,
  buildCalibrationPreviewTelemetryReport,
  loadGrowthHistory,
  saveGrowthHistory,
  appendReportToGrowthHistory,
  SEED_GROWTH_HISTORY,
  type GrowthSessionSnapshot,
} from './iqTelemetryEngine';
import {
  GrowthAnalyticsDashboard,
  PostTestTelemetryReportView,
} from './GrowthAnalyticsDashboard';

/**
 * Declarative geometric descriptor for rendering an authentic Raven's Progressive Matrices (APM)
 * or Mensa Non-Verbal Matrix Reasoning tile inside a 100x100 SVG coordinate space.
 */
export type MatrixCellDescriptor =
  | {
      kind: 'quant_dots';
      frame: 'circle' | 'square' | 'diamond' | 'hexagon';
      dots: number;
    }
  | {
      kind: 'vector_dial';
      angleDeg: number;
      hubFill: 'hollow' | 'ring' | 'solid';
      tailTick?: boolean;
    }
  | {
      kind: 'latin_perm';
      shape: 'triangle' | 'circle' | 'hexagon';
      fill: 'hollow' | 'striped' | 'solid';
      axis: 'horiz' | 'vert' | 'plus' | 'none';
    }
  | {
      kind: 'bar_stack';
      horizBars: number;
      vertBars: number;
      centerNode: 'none' | 'hollow' | 'solid';
    }
  | {
      kind: 'line_boolean';
      /** Segments: T, B, L, R, D1 (\), D2 (/), VM (vertical mid), HM (horizontal mid) */
      segments: Array<'T' | 'B' | 'L' | 'R' | 'D1' | 'D2' | 'VM' | 'HM'>;
    }
  | {
      kind: 'quadrant_xor';
      /** Shaded quadrants: 0=TL, 1=TR, 2=BR, 3=BL */
      quadrants: number[];
      /** Corner dots: 0=TL, 1=TR, 2=BR, 3=BL */
      corners: number[];
    }
  | {
      kind: 'grid_bitmask';
      /** Active cells in a 3x3 bitmask grid (indices 0..8) */
      cells: number[];
      mode: 'cyan' | 'amber';
    }
  | {
      kind: 'concentric_cycle';
      /** From outer to inner: 'square' | 'circle' | 'diamond' */
      layers: [
        'square' | 'circle' | 'diamond',
        'square' | 'circle' | 'diamond',
        'square' | 'circle' | 'diamond',
      ];
      centerSolid: boolean;
    }
  | {
      kind: 'mirror_rotate';
      /** Orientation in degrees (0, 90, 180, 270) */
      rotDeg: number;
      /** Horizontal flip applied before rotation */
      flipX: boolean;
      dotPos: 'top' | 'bottom';
    }
  | {
      kind: 'vector_balance';
      /** Net horizontal spikes: -2, -1, 0, +1, +2 */
      dx: number;
      /** Net vertical spikes: -2, -1, 0, +1, +2 */
      dy: number;
      coreShape: 'circle' | 'square';
    }
  | {
      kind: 'orbital_phase';
      /** Outer satellite angle in deg */
      outerDeg: number;
      /** Inner satellite angle in deg */
      innerDeg: number;
      /** Central polygon sides (3, 4, 6) */
      coreSides: 3 | 4 | 6;
    }
  | {
      kind: 'subgrid_automaton';
      /** 0..8 index in 3x3 subgrid for solid circle */
      dotIdx: number;
      /** 0..8 index in 3x3 subgrid for open diamond */
      diamondIdx: number;
      /** 0..8 index in 3x3 subgrid for cross marker */
      crossIdx: number;
    }
  | {
      kind: 'vertex_dot_conservation';
      sides: 3 | 4 | 5 | 6 | 7;
      dots: number;
      invertedRing: boolean;
    }
  | {
      kind: 'phase_aperture';
      outerShape: 'circle' | 'square' | 'hexagon';
      baseAngleDeg: number;
      spreadAngleDeg: number;
      cornerArcs: Array<'TL' | 'TR' | 'BR' | 'BL'>;
    };

export interface IQQuestion {
  id: string;
  moduleCode: 'MOD-01' | 'MOD-02' | 'MOD-03' | 'MOD-04';
  moduleTitle: string;
  batteryOrigin: 'Raven’s SPM/APM' | 'Mensa Norway' | 'Mensa Denmark' | 'Raven’s Set II Apex';
  domain: string;
  difficulty: 'Standard' | 'Advanced' | 'Apex';
  points: number;
  gardnerDomain?: GardnerIntelligenceId;
  smartLabel?: string;
  questionFormat?: 'matrix_3x3' | 'cognitive_domain';
  stimulusLines?: string[];
  question: string;
  formulaHint: string;
  /** 8 given matrix cells in row-major order: [R1C1, R1C2, R1C3, R2C1, R2C2, R2C3, R3C1, R3C2] */
  matrixCells: [
    MatrixCellDescriptor,
    MatrixCellDescriptor,
    MatrixCellDescriptor,
    MatrixCellDescriptor,
    MatrixCellDescriptor,
    MatrixCellDescriptor,
    MatrixCellDescriptor,
    MatrixCellDescriptor,
  ];
  /** Visual descriptors for the 6 answer options (A-F) */
  optionCells: MatrixCellDescriptor[];
  /** Accessible concise text labels for the answer options */
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * 16 Comprehensive Non-Verbal Progressive Matrix Items (4 per sub-scale) modeled after
 * Raven's Standard/Advanced Progressive Matrices (SPM / APM Set II) and Mensa IQ Assessments.
 */
export const RELATIVITY_IQ_QUESTIONS: IQQuestion[] = [
  // ============================================================================
  // MOD-01 · RAVEN'S SET C/D — PROGRESSIVE QUANTITATIVE & PERMUTATION SERIES (4 ITEMS)
  // ============================================================================
  {
    id: 'rpm_c01_quant_progression',
    moduleCode: 'MOD-01',
    moduleTitle: 'Raven’s Progressive Series & Permutations',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Quantitative & Frame Progression',
    difficulty: 'Standard',
    points: 10,
    question:
      'Matrix Set C-04: Identify the missing tile (R3, C3) that completes both the horizontal quantitative progression and the vertical boundary transformation.',
    formulaHint: 'Row Rule: Interior Nodes +1 per column  |  Col Rule: Circle → Square → Diamond',
    matrixCells: [
      { kind: 'quant_dots', frame: 'circle', dots: 1 },
      { kind: 'quant_dots', frame: 'square', dots: 2 },
      { kind: 'quant_dots', frame: 'diamond', dots: 3 },
      { kind: 'quant_dots', frame: 'circle', dots: 2 },
      { kind: 'quant_dots', frame: 'square', dots: 3 },
      { kind: 'quant_dots', frame: 'diamond', dots: 4 },
      { kind: 'quant_dots', frame: 'circle', dots: 3 },
      { kind: 'quant_dots', frame: 'square', dots: 4 },
    ],
    optionCells: [
      { kind: 'quant_dots', frame: 'diamond', dots: 5 },
      { kind: 'quant_dots', frame: 'square', dots: 5 },
      { kind: 'quant_dots', frame: 'diamond', dots: 4 },
      { kind: 'quant_dots', frame: 'circle', dots: 5 },
      { kind: 'quant_dots', frame: 'diamond', dots: 6 },
      { kind: 'quant_dots', frame: 'hexagon', dots: 5 },
    ],
    options: [
      'Diamond frame with 5 symmetric quincunx nodes',
      'Square frame with 5 symmetric quincunx nodes',
      'Diamond frame with 4 corner nodes',
      'Circle frame with 5 symmetric quincunx nodes',
      'Diamond frame with 6 parallel nodes',
      'Hexagon frame with 5 symmetric quincunx nodes',
    ],
    correctIndex: 0,
    explanation:
      'Across each row and down each column, the node count increments by +1 (Row 3: 3 → 4 → 5). Each column preserves its outer geometric boundary (Col 1 = Circle, Col 2 = Square, Col 3 = Diamond), yielding a Diamond containing 5 nodes.',
  },
  {
    id: 'mensa_r02_vector_phase',
    moduleCode: 'MOD-01',
    moduleTitle: 'Raven’s Progressive Series & Permutations',
    batteryOrigin: 'Mensa Norway',
    domain: 'Angular Phase & Core Density',
    difficulty: 'Standard',
    points: 10,
    question:
      'Mensa Matrix R-08: Deduce the missing orientation and central core state at (R3, C3) from the 2D angular phase progression.',
    formulaHint: 'Row/Col Angle: Δθ = +45° clockwise per step  |  Row Core: Hollow → Ring → Solid',
    matrixCells: [
      { kind: 'vector_dial', angleDeg: 0, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 45, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 90, hubFill: 'hollow', tailTick: true },
      { kind: 'vector_dial', angleDeg: 45, hubFill: 'ring', tailTick: true },
      { kind: 'vector_dial', angleDeg: 90, hubFill: 'ring', tailTick: true },
      { kind: 'vector_dial', angleDeg: 135, hubFill: 'ring', tailTick: true },
      { kind: 'vector_dial', angleDeg: 90, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 135, hubFill: 'solid', tailTick: true },
    ],
    optionCells: [
      { kind: 'vector_dial', angleDeg: 225, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 180, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 180, hubFill: 'ring', tailTick: true },
      { kind: 'vector_dial', angleDeg: 270, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 135, hubFill: 'solid', tailTick: true },
      { kind: 'vector_dial', angleDeg: 180, hubFill: 'hollow', tailTick: true },
    ],
    options: [
      'Solid hub · Vector at 225° (South-West)',
      'Solid hub · Vector at 180° (South)',
      'Ring hub · Vector at 180° (South)',
      'Solid hub · Vector at 270° (West)',
      'Solid hub · Vector at 135° (South-East)',
      'Hollow hub · Vector at 180° (South)',
    ],
    correctIndex: 1,
    explanation:
      'The vector rotates +45° clockwise across every column and +45° clockwise down every row: θ(r, c) = (r + c) × 45°. At (r=2, c=2), θ = 4 × 45° = 180° (pointing straight down). Row 3 features a solid central hub.',
  },
  {
    id: 'rpm_c03_orthogonal_grid_bars',
    moduleCode: 'MOD-01',
    moduleTitle: 'Raven’s Progressive Series & Permutations',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Orthogonal Lattice Accumulation',
    difficulty: 'Standard',
    points: 12,
    question:
      'Matrix Set C-11: Horizontal and vertical chords accumulate independently along orthogonal axes. Identify the completing lattice at (R3, C3).',
    formulaHint: 'Row Rule: Vertical Bars +1 per column (1→2→3)  |  Col Rule: Horizontal Bars +1 per row (1→2→3)',
    matrixCells: [
      { kind: 'bar_stack', horizBars: 1, vertBars: 1, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 2, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 3, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 1, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 2, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 3, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 1, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 2, centerNode: 'solid' },
    ],
    optionCells: [
      { kind: 'bar_stack', horizBars: 3, vertBars: 3, centerNode: 'solid' },
      { kind: 'bar_stack', horizBars: 2, vertBars: 3, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 2, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 3, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 3, vertBars: 1, centerNode: 'hollow' },
      { kind: 'bar_stack', horizBars: 1, vertBars: 3, centerNode: 'hollow' },
    ],
    options: [
      '3 Horizontal × 3 Vertical bars · Solid center node',
      '2 Horizontal × 3 Vertical bars · Hollow center node',
      '3 Horizontal × 2 Vertical bars · Hollow center node',
      '3 Horizontal × 3 Vertical bars · Hollow center node',
      '3 Horizontal × 1 Vertical bar · Hollow center node',
      '1 Horizontal × 3 Vertical bars · Hollow center node',
    ],
    correctIndex: 3,
    explanation:
      'Horizontal bars count the row index (Row 3 = 3 horizontal bars), while vertical bars count the column index (Col 3 = 3 vertical bars). The central node alternates Hollow/Solid in a checkerboard pattern, making (R3, C3) a 3×3 lattice with a Hollow center node.',
  },
  {
    id: 'rpm_d04_latin_square',
    moduleCode: 'MOD-01',
    moduleTitle: 'Raven’s Progressive Series & Permutations',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Latin-Square Group Permutation',
    difficulty: 'Standard',
    points: 15,
    question:
      'Matrix Set D-09: Each row and column forms a complete permutation of outer polygon, shading texture, and internal bisecting axis. Select the missing tile.',
    formulaHint: '∀ Row, Col: {Triangle, Circle, Hexagon} × {Hollow, Striped, Solid} × {Horiz, Vert, Plus}',
    matrixCells: [
      { kind: 'latin_perm', shape: 'triangle', fill: 'hollow', axis: 'horiz' },
      { kind: 'latin_perm', shape: 'circle', fill: 'striped', axis: 'vert' },
      { kind: 'latin_perm', shape: 'hexagon', fill: 'solid', axis: 'plus' },
      { kind: 'latin_perm', shape: 'circle', fill: 'solid', axis: 'plus' },
      { kind: 'latin_perm', shape: 'hexagon', fill: 'hollow', axis: 'horiz' },
      { kind: 'latin_perm', shape: 'triangle', fill: 'striped', axis: 'vert' },
      { kind: 'latin_perm', shape: 'hexagon', fill: 'striped', axis: 'vert' },
      { kind: 'latin_perm', shape: 'triangle', fill: 'solid', axis: 'plus' },
    ],
    optionCells: [
      { kind: 'latin_perm', shape: 'circle', fill: 'striped', axis: 'horiz' },
      { kind: 'latin_perm', shape: 'hexagon', fill: 'hollow', axis: 'horiz' },
      { kind: 'latin_perm', shape: 'circle', fill: 'hollow', axis: 'horiz' },
      { kind: 'latin_perm', shape: 'circle', fill: 'hollow', axis: 'plus' },
      { kind: 'latin_perm', shape: 'triangle', fill: 'hollow', axis: 'horiz' },
      { kind: 'latin_perm', shape: 'circle', fill: 'solid', axis: 'horiz' },
    ],
    options: [
      'Striped Circle with Horizontal axis',
      'Hollow Hexagon with Horizontal axis',
      'Hollow Circle with Horizontal axis',
      'Hollow Circle with Plus (+) crosshair',
      'Hollow Triangle with Horizontal axis',
      'Solid Circle with Horizontal axis',
    ],
    correctIndex: 2,
    explanation:
      'In Row 3, Hexagon and Triangle are present, leaving Circle; Striped and Solid are present, leaving Hollow; Vertical and Plus axes are present, leaving Horizontal. Thus (R3, C3) must be a Hollow Circle with a Horizontal axis.',
  },

  // ============================================================================
  // MOD-02 · RAVEN'S SET E — BOOLEAN SPATIAL SUPERPOSITION (OR / XOR / AND) (4 ITEMS)
  // ============================================================================
  {
    id: 'rpm_e05_boolean_union',
    moduleCode: 'MOD-02',
    moduleTitle: 'Boolean Spatial Superposition (OR / XOR / AND)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Additive Line Superposition (A ∪ B)',
    difficulty: 'Standard',
    points: 15,
    question:
      'Matrix Set E-03: In each row and column, the third figure is formed by a spatial Boolean operation on the first two figures. Identify (R3, C3).',
    formulaHint: 'Superposition Rule: Cell(r, 3) = Cell(r, 1) ∪ Cell(r, 2)  (Additive Union)',
    matrixCells: [
      { kind: 'line_boolean', segments: ['L', 'R'] },
      { kind: 'line_boolean', segments: ['T', 'B'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'L', 'R'] },
      { kind: 'line_boolean', segments: ['D1', 'VM'] },
      { kind: 'line_boolean', segments: ['D2', 'HM'] },
      { kind: 'line_boolean', segments: ['D1', 'D2', 'VM', 'HM'] },
      { kind: 'line_boolean', segments: ['L', 'R', 'D1', 'VM'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'D2', 'HM'] },
    ],
    optionCells: [
      { kind: 'line_boolean', segments: ['T', 'B', 'L', 'R', 'D1', 'D2', 'VM', 'HM'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'L', 'R', 'D1', 'D2'] },
      { kind: 'line_boolean', segments: ['D1', 'D2', 'VM', 'HM'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'L', 'R', 'VM', 'HM'] },
      { kind: 'line_boolean', segments: ['L', 'R', 'D1', 'D2'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'D1', 'VM'] },
    ],
    options: [
      'Complete 8-segment lattice (Outer Square + Diagonals + Central Cross)',
      'Outer Square + X-Diagonals only (missing Central Cross)',
      'Internal 8-point Star only (missing Outer Square)',
      'Outer Square + Central Cross only (missing Diagonals)',
      'Left/Right verticals + X-Diagonals',
      'Top/Bottom horizontals + single diagonal',
    ],
    correctIndex: 0,
    explanation:
      'Both rows and columns obey the Boolean Union rule C = A ∪ B. Superimposing Row 3 Cell 1 (Left/Right verticals, \\-diagonal, vertical center) with Cell 2 (Top/Bottom horizontals, /-diagonal, horizontal center) produces the complete 8-segment geometric lattice.',
  },
  {
    id: 'mensa_x06_symmetric_xor',
    moduleCode: 'MOD-02',
    moduleTitle: 'Boolean Spatial Superposition (OR / XOR / AND)',
    batteryOrigin: 'Mensa Norway',
    domain: 'Exclusive-OR Cancellation (A ⊕ B)',
    difficulty: 'Advanced',
    points: 20,
    question:
      'Mensa Matrix X-14: Overlapping line segments between the first two cells in any row or column cancel out, while unique segments are retained. Solve for (R3, C3).',
    formulaHint: 'Symmetric Difference (XOR): Cell(r, 3) = (A ∪ B) \\ (A ∩ B) = A ⊕ B',
    matrixCells: [
      { kind: 'line_boolean', segments: ['T', 'B', 'L', 'R', 'D1'] },
      { kind: 'line_boolean', segments: ['L', 'R', 'D2'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'D1', 'D2'] },
      { kind: 'line_boolean', segments: ['T', 'L', 'D1', 'VM'] },
      { kind: 'line_boolean', segments: ['B', 'L', 'D2', 'HM'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'D1', 'D2', 'VM', 'HM'] },
      { kind: 'line_boolean', segments: ['B', 'R', 'VM'] },
      { kind: 'line_boolean', segments: ['B', 'R', 'HM'] },
    ],
    optionCells: [
      { kind: 'line_boolean', segments: ['B', 'R', 'VM', 'HM'] },
      { kind: 'line_boolean', segments: ['T', 'L', 'VM', 'HM'] },
      { kind: 'line_boolean', segments: ['D1', 'D2'] },
      { kind: 'line_boolean', segments: ['VM', 'HM'] },
      { kind: 'line_boolean', segments: ['B', 'R'] },
      { kind: 'line_boolean', segments: ['T', 'B', 'L', 'R'] },
    ],
    options: [
      'Bottom + Right edges + Central Plus (+)',
      'Top + Left edges + Central Plus (+)',
      'Diagonal X-Cross only',
      'Central Plus (+) crosshair only (VM + HM)',
      'Bottom + Right L-border only',
      'Outer Square frame only',
    ],
    correctIndex: 3,
    explanation:
      'Every row and column satisfies Exclusive-OR (A ⊕ B): common segments cancel and unique segments survive. In Row 3, Cell 1 has [Bottom, Right, Vertical-Mid] and Cell 2 has [Bottom, Right, Horizontal-Mid]. The shared Bottom and Right edges cancel, leaving only [Vertical-Mid, Horizontal-Mid] — the central Plus (+) crosshair.',
  },
  {
    id: 'mensa_x07_bitmask_intersection',
    moduleCode: 'MOD-02',
    moduleTitle: 'Boolean Spatial Superposition (OR / XOR / AND)',
    batteryOrigin: 'Mensa Denmark',
    domain: '3×3 Bitmask Complement & XOR',
    difficulty: 'Advanced',
    points: 20,
    question:
      'Mensa Matrix D-19: Each 3×3 tile acts as a binary spatial mask. Deduce the row-wise logic gate connecting Column 1 and Column 2 to Column 3.',
    formulaHint: 'Row Gate: Cell(r, 3) = Cell(r, 1) ⊕ Cell(r, 2)  (Active squares in both C1 and C2 annihilate)',
    matrixCells: [
      // Row 1: {0,1,2,4} XOR {1,4,7} = {0,2,7}
      { kind: 'grid_bitmask', cells: [0, 1, 2, 4], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [1, 4, 7], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [0, 2, 7], mode: 'cyan' },
      // Row 2: {0,3,6,4} XOR {3,4,5} = {0,5,6}
      { kind: 'grid_bitmask', cells: [0, 3, 4, 6], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [3, 4, 5], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [0, 5, 6], mode: 'cyan' },
      // Row 3: {0,2,4,6,8} (X-pattern) XOR {1,3,4,5,7} (Plus-pattern) = {0,1,2,3,5,6,7,8} (Outer Ring, hollow center 4!)
      { kind: 'grid_bitmask', cells: [0, 2, 4, 6, 8], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [1, 3, 4, 5, 7], mode: 'cyan' },
    ],
    optionCells: [
      { kind: 'grid_bitmask', cells: [4], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [0, 1, 2, 3, 5, 6, 7, 8], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [0, 2, 6, 8], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [1, 3, 5, 7], mode: 'cyan' },
      { kind: 'grid_bitmask', cells: [0, 4, 8], mode: 'cyan' },
    ],
    options: [
      'Center square only (Intersection A ∩ B)',
      'All 9 squares illuminated (Union A ∪ B)',
      '8-square perimeter ring with hollow center (A ⊕ B)',
      '4 corner squares only',
      '4 orthogonal edge squares only',
      'Main diagonal only',
    ],
    correctIndex: 2,
    explanation:
      'Across every row, active sub-squares combine via Exclusive-OR (A ⊕ B). In Row 3, Cell 1 is the 5-square X-diagonal {0,2,4,6,8} and Cell 2 is the 5-square Plus-cross {1,3,4,5,7}. Only the center square (4) overlaps and cancels out, leaving all 8 outer perimeter squares illuminated.',
  },
  {
    id: 'rpm_e08_dual_boolean',
    moduleCode: 'MOD-02',
    moduleTitle: 'Boolean Spatial Superposition (OR / XOR / AND)',
    batteryOrigin: 'Raven’s SPM/APM',
    domain: 'Dual-Operator Sector XOR & Corner AND',
    difficulty: 'Advanced',
    points: 20,
    question:
      'Matrix Set E-11: Inner circular quadrants and outer corner nodes follow two different Boolean logic operators across each row. Determine (R3, C3).',
    formulaHint: 'Inner Wedges: C = A ⊕ B (XOR)  |  Outer Corner Nodes: C = A ∩ B (Intersection / AND)',
    matrixCells: [
      { kind: 'quadrant_xor', quadrants: [0, 1], corners: [0, 1, 3] },
      { kind: 'quadrant_xor', quadrants: [1, 2], corners: [0, 2, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 2], corners: [0, 3] },
      { kind: 'quadrant_xor', quadrants: [1, 3], corners: [1, 2] },
      { kind: 'quadrant_xor', quadrants: [0, 1, 3], corners: [1, 2, 3] },
      { kind: 'quadrant_xor', quadrants: [0], corners: [1, 2] },
      { kind: 'quadrant_xor', quadrants: [0, 2, 3], corners: [0, 2, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 1], corners: [1, 2, 3] },
    ],
    optionCells: [
      { kind: 'quadrant_xor', quadrants: [1, 2, 3], corners: [2, 3] },
      { kind: 'quadrant_xor', quadrants: [1, 2, 3], corners: [0, 1, 2, 3] },
      { kind: 'quadrant_xor', quadrants: [0], corners: [2, 3] },
      { kind: 'quadrant_xor', quadrants: [0, 1, 2, 3], corners: [2, 3] },
      { kind: 'quadrant_xor', quadrants: [1, 2, 3], corners: [0, 1] },
      { kind: 'quadrant_xor', quadrants: [2, 3], corners: [2, 3] },
    ],
    options: [
      '3 Wedges (TR, BR, BL) + 2 Bottom Corner Dots (BR, BL)',
      '3 Wedges (TR, BR, BL) + All 4 Corner Dots',
      '1 Wedge (TL) + 2 Bottom Corner Dots (BR, BL)',
      'All 4 Wedges + 2 Bottom Corner Dots (BR, BL)',
      '3 Wedges (TR, BR, BL) + 2 Top Corner Dots (TL, TR)',
      '2 Bottom Wedges (BR, BL) + 2 Bottom Corner Dots (BR, BL)',
    ],
    correctIndex: 0,
    explanation:
      'Two independent rules operate simultaneously across each row: (1) Inner circle sectors combine via XOR ({TL, BR, BL} ⊕ {TL, TR} = {TR, BR, BL}), cancelling TL; (2) Outer corner dots combine via intersection/AND ({TL, BR, BL} ∩ {TR, BR, BL} = {BR, BL}).',
  },

  // ============================================================================
  // MOD-03 · MENSA NORWAY & DENMARK — TOPOLOGICAL SCALING & REFLECTION MATRICES (4 ITEMS)
  // ============================================================================
  {
    id: 'mensa_s09_concentric_cycle',
    moduleCode: 'MOD-03',
    moduleTitle: 'Mensa Spatial Topology & Dihedral Transformations',
    batteryOrigin: 'Mensa Norway',
    domain: 'Concentric Nesting Permutation',
    difficulty: 'Advanced',
    points: 20,
    question:
      'Mensa Matrix N-19: Three nested geometric boundaries permute radially across each step while the core parity alternates. Select the missing figure.',
    formulaHint: 'Radial Shift: [Outer, Mid, Inner] → [Mid, Inner, Outer]  |  Center Parity: Alternating ● / ○',
    matrixCells: [
      { kind: 'concentric_cycle', layers: ['square', 'circle', 'diamond'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['circle', 'diamond', 'square'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['diamond', 'square', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['circle', 'diamond', 'square'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['diamond', 'square', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['square', 'circle', 'diamond'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['diamond', 'square', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['square', 'circle', 'diamond'], centerSolid: false },
    ],
    optionCells: [
      { kind: 'concentric_cycle', layers: ['diamond', 'circle', 'square'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['circle', 'diamond', 'square'], centerSolid: false },
      { kind: 'concentric_cycle', layers: ['circle', 'diamond', 'square'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['square', 'diamond', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['diamond', 'square', 'circle'], centerSolid: true },
      { kind: 'concentric_cycle', layers: ['circle', 'square', 'diamond'], centerSolid: true },
    ],
    options: [
      'Outer Diamond · Middle Circle · Inner Square · Solid Center',
      'Outer Circle · Middle Diamond · Inner Square · Hollow Center',
      'Outer Circle · Middle Diamond · Inner Square · Solid Center',
      'Outer Square · Middle Diamond · Inner Circle · Solid Center',
      'Outer Diamond · Middle Square · Inner Circle · Solid Center',
      'Outer Circle · Middle Square · Inner Diamond · Solid Center',
    ],
    correctIndex: 2,
    explanation:
      'Moving right or down, the middle shape expands to the outside, the inner shape moves to the middle, and the outer shape wraps to the inside: [Square, Circle, Diamond] → [Circle, Diamond, Square]. The central dot alternates ● / ○ in a checkerboard parity pattern, making (R3, C3) Solid (●).',
  },
  {
    id: 'mensa_s10_dihedral_group',
    moduleCode: 'MOD-03',
    moduleTitle: 'Mensa Spatial Topology & Dihedral Transformations',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Dihedral Reflection & Rotation Group D₄',
    difficulty: 'Advanced',
    points: 20,
    question:
      'Mensa Matrix D-24: Across each row, a non-commutative sequence of reflection and rotation is applied to an asymmetric L-pennant. Identify (R3, C3).',
    formulaHint: 'Step 1 (C1 → C2): Horizontal Mirror Flip (σ_x)  |  Step 2 (C2 → C3): +90° Clockwise Rotation + Dot Parity Flip',
    matrixCells: [
      { kind: 'mirror_rotate', rotDeg: 0, flipX: false, dotPos: 'top' },
      { kind: 'mirror_rotate', rotDeg: 0, flipX: true, dotPos: 'top' },
      { kind: 'mirror_rotate', rotDeg: 90, flipX: true, dotPos: 'bottom' },
      { kind: 'mirror_rotate', rotDeg: 90, flipX: false, dotPos: 'bottom' },
      { kind: 'mirror_rotate', rotDeg: 90, flipX: true, dotPos: 'bottom' },
      { kind: 'mirror_rotate', rotDeg: 180, flipX: true, dotPos: 'top' },
      { kind: 'mirror_rotate', rotDeg: 180, flipX: false, dotPos: 'top' },
      { kind: 'mirror_rotate', rotDeg: 180, flipX: true, dotPos: 'top' },
    ],
    optionCells: [
      { kind: 'mirror_rotate', rotDeg: 270, flipX: false, dotPos: 'bottom' },
      { kind: 'mirror_rotate', rotDeg: 270, flipX: true, dotPos: 'bottom' },
      { kind: 'mirror_rotate', rotDeg: 270, flipX: true, dotPos: 'top' },
      { kind: 'mirror_rotate', rotDeg: 90, flipX: true, dotPos: 'bottom' },
      { kind: 'mirror_rotate', rotDeg: 0, flipX: true, dotPos: 'bottom' },
      { kind: 'mirror_rotate', rotDeg: 180, flipX: false, dotPos: 'bottom' },
    ],
    options: [
      'Unmirrored L-pennant rotated 270° · Satellite dot at opposite end',
      'Mirrored L-pennant rotated 270° · Satellite dot shifted to base',
      'Mirrored L-pennant rotated 270° · Satellite dot unshifted',
      'Mirrored L-pennant rotated 90° · Satellite dot shifted to base',
      'Mirrored L-pennant at 0° · Satellite dot shifted to base',
      'Unmirrored L-pennant at 180° · Satellite dot shifted to base',
    ],
    correctIndex: 1,
    explanation:
      'From Column 1 to Column 2, the glyph undergoes a horizontal mirror reflection (flipX = true). From Column 2 to Column 3, the mirrored glyph rotates +90° clockwise (from 180° to 270°) and its satellite dot toggles position from top to bottom.',
  },
  {
    id: 'mensa_s11_counter_rotating_orbits',
    moduleCode: 'MOD-03',
    moduleTitle: 'Mensa Spatial Topology & Dihedral Transformations',
    batteryOrigin: 'Mensa Norway',
    domain: 'Counter-Rotating Dual-Ring Kinematics',
    difficulty: 'Advanced',
    points: 22,
    question:
      'Mensa Matrix N-27: An outer satellite and an inner satellite orbit a central polygon at different angular velocities and directions. Solve for (R3, C3).',
    formulaHint: 'Outer Satellite: +90° CW per col, +45° CW per row  |  Inner Satellite: -90° CCW per col, +90° CW per row',
    matrixCells: [
      // Row 1 (coreSides=3): Outer=(0, 90, 180), Inner=(0, 270, 180)
      { kind: 'orbital_phase', outerDeg: 0, innerDeg: 0, coreSides: 3 },
      { kind: 'orbital_phase', outerDeg: 90, innerDeg: 270, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 180, innerDeg: 180, coreSides: 6 },
      // Row 2: Outer=(45, 135, 225), Inner=(90, 0, 270)
      { kind: 'orbital_phase', outerDeg: 45, innerDeg: 90, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 135, innerDeg: 0, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 225, innerDeg: 270, coreSides: 3 },
      // Row 3: Outer=(90, 180, ? -> 270), Inner=(180, 90, ? -> 0), coreSides=(6, 3, ? -> 4)
      { kind: 'orbital_phase', outerDeg: 90, innerDeg: 180, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 180, innerDeg: 90, coreSides: 3 },
    ],
    optionCells: [
      { kind: 'orbital_phase', outerDeg: 270, innerDeg: 0, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 270, innerDeg: 180, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 90, innerDeg: 0, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 270, innerDeg: 0, coreSides: 6 },
      { kind: 'orbital_phase', outerDeg: 0, innerDeg: 270, coreSides: 4 },
      { kind: 'orbital_phase', outerDeg: 270, innerDeg: 90, coreSides: 3 },
    ],
    options: [
      'Outer at 270° (W) · Inner at 0° (N) · Square core (4 sides)',
      'Outer at 270° (W) · Inner at 180° (S) · Square core (4 sides)',
      'Outer at 90° (E) · Inner at 0° (N) · Square core (4 sides)',
      'Outer at 270° (W) · Inner at 0° (N) · Hexagon core (6 sides)',
      'Outer at 0° (N) · Inner at 270° (W) · Square core (4 sides)',
      'Outer at 270° (W) · Inner at 90° (E) · Triangle core (3 sides)',
    ],
    correctIndex: 0,
    explanation:
      'Across Row 3: (1) The outer cyan satellite steps +90° clockwise per column (90° → 180° → 270° West); (2) The inner gold satellite steps -90° counter-clockwise per column (180° → 90° → 0° North); (3) The central polygon completes the Latin-square permutation {Hexagon, Triangle, Square} → Square.',
  },
  {
    id: 'rpm_ii12_vector_cancellation',
    moduleCode: 'MOD-03',
    moduleTitle: 'Mensa Spatial Topology & Dihedral Transformations',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Signed Vector Addition & Opposing Cancellation',
    difficulty: 'Advanced',
    points: 22,
    question:
      'Raven’s APM Set II-18: Radial spikes pointing in opposite directions along the same axis cancel one-for-one, while spikes in the same direction add. Find (R3, C3).',
    formulaHint: 'Vector Sum: (Δx₃, Δy₃) = (Δx₁ + Δx₂,  Δy₁ + Δy₂)  |  Core Shape: Square if |Δx|+|Δy| is even, Circle if odd',
    matrixCells: [
      { kind: 'vector_balance', dx: 1, dy: 0, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 1, dy: 1, coreShape: 'square' },
      { kind: 'vector_balance', dx: 2, dy: 1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: -1, dy: 2, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 2, dy: -1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: 1, dy: 1, coreShape: 'square' },
      { kind: 'vector_balance', dx: 2, dy: -2, coreShape: 'square' },
      { kind: 'vector_balance', dx: -1, dy: 1, coreShape: 'square' },
    ],
    optionCells: [
      { kind: 'vector_balance', dx: 1, dy: -1, coreShape: 'square' },
      { kind: 'vector_balance', dx: 1, dy: -1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: -1, dy: 1, coreShape: 'square' },
      { kind: 'vector_balance', dx: 1, dy: 1, coreShape: 'square' },
      { kind: 'vector_balance', dx: 2, dy: -1, coreShape: 'circle' },
      { kind: 'vector_balance', dx: -1, dy: -1, coreShape: 'square' },
    ],
    options: [
      '1 East spike + 1 South spike (+1, -1) · Square core (even total = 2)',
      '1 East spike + 1 South spike (+1, -1) · Circle core',
      '1 West spike + 1 North spike (-1, +1) · Square core',
      '1 East spike + 1 North spike (+1, +1) · Square core',
      '2 East spikes + 1 South spike (+2, -1) · Circle core',
      '1 West spike + 1 South spike (-1, -1) · Square core',
    ],
    correctIndex: 0,
    explanation:
      'In Row 3, Cell 1 has 2 East (+2) and 2 South (-2) spikes; Cell 2 has 1 West (-1) and 1 North (+1) spike. Adding vector components yields (+2 - 1, -2 + 1) = (+1 East, -1 South). Since the total remaining spike count is 2 (even), the central core is a Square.',
  },

  // ============================================================================
  // MOD-04 · RAVEN'S ADVANCED SET II / MENSA APEX — MULTI-INVARIANT CEILING ITEMS (4 ITEMS)
  // ============================================================================
  {
    id: 'rpm_ii13_subgrid_kinematics',
    moduleCode: 'MOD-04',
    moduleTitle: 'Raven’s Set II High-Ceiling Multi-Variable Synthesis',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: '3×3 Sub-Grid Multi-Particle Kinematics',
    difficulty: 'Apex',
    points: 25,
    question:
      'Raven’s APM Set II-26: Three independent tokens (● Solid Node, ◇ Open Diamond, × Cross) traverse the 3×3 sub-lattice at constant velocity vectors. Predict (R3, C3).',
    formulaHint: '● moves +1 right per col (+1 down per row)  |  ◇ moves diagonally  |  × steps -1 left per col',
    matrixCells: [
      { kind: 'subgrid_automaton', dotIdx: 0, diamondIdx: 0, crossIdx: 2 },
      { kind: 'subgrid_automaton', dotIdx: 1, diamondIdx: 4, crossIdx: 1 },
      { kind: 'subgrid_automaton', dotIdx: 2, diamondIdx: 8, crossIdx: 0 },
      { kind: 'subgrid_automaton', dotIdx: 3, diamondIdx: 3, crossIdx: 5 },
      { kind: 'subgrid_automaton', dotIdx: 4, diamondIdx: 7, crossIdx: 4 },
      { kind: 'subgrid_automaton', dotIdx: 5, diamondIdx: 2, crossIdx: 3 },
      { kind: 'subgrid_automaton', dotIdx: 6, diamondIdx: 6, crossIdx: 8 },
      { kind: 'subgrid_automaton', dotIdx: 7, diamondIdx: 1, crossIdx: 7 },
    ],
    optionCells: [
      { kind: 'subgrid_automaton', dotIdx: 8, diamondIdx: 5, crossIdx: 6 },
      { kind: 'subgrid_automaton', dotIdx: 8, diamondIdx: 4, crossIdx: 6 },
      { kind: 'subgrid_automaton', dotIdx: 6, diamondIdx: 5, crossIdx: 8 },
      { kind: 'subgrid_automaton', dotIdx: 8, diamondIdx: 5, crossIdx: 0 },
      { kind: 'subgrid_automaton', dotIdx: 7, diamondIdx: 5, crossIdx: 6 },
      { kind: 'subgrid_automaton', dotIdx: 8, diamondIdx: 2, crossIdx: 6 },
    ],
    options: [
      '● at Bottom-Right (8) · ◇ at Mid-Right (5) · × at Bottom-Left (6)',
      '● at Bottom-Right (8) · ◇ at Center (4) · × at Bottom-Left (6)',
      '● at Bottom-Left (6) · ◇ at Mid-Right (5) · × at Bottom-Right (8)',
      '● at Bottom-Right (8) · ◇ at Mid-Right (5) · × at Top-Left (0)',
      '● at Bottom-Center (7) · ◇ at Mid-Right (5) · × at Bottom-Left (6)',
      '● at Bottom-Right (8) · ◇ at Top-Right (2) · × at Bottom-Left (6)',
    ],
    correctIndex: 0,
    explanation:
      'In Row 3: (1) The solid circle ● moves left-to-right across the bottom row (6 → 7 → 8, Bottom-Right); (2) The cross × moves right-to-left across the bottom row (8 → 7 → 6, Bottom-Left); (3) The diamond ◇ steps (+1 col, +1 row mod 3) each column: (R3,C1)=6 → (R1,C2)=1 → (R2,C3)=5 (Mid-Right).',
  },
  {
    id: 'mensa_a14_invariant_conservation',
    moduleCode: 'MOD-04',
    moduleTitle: 'Raven’s Set II High-Ceiling Multi-Variable Synthesis',
    batteryOrigin: 'Mensa Norway',
    domain: 'Topological Vertex-Node Conservation Law',
    difficulty: 'Apex',
    points: 25,
    question:
      'Mensa High-Range Item N-33: Across each row, polygon vertices convert into interior nodes under a strict conservation invariant (V + N = const). Solve for (R3, C3).',
    formulaHint: 'Row Invariant: Vertices(V) + Interior Dots(N) = Constant K_row  (ΔV = +1, ΔN = -1 per col)',
    matrixCells: [
      { kind: 'vertex_dot_conservation', sides: 3, dots: 4, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 4, dots: 3, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 2, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 4, dots: 4, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 3, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 6, dots: 2, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 4, dots: 5, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 4, invertedRing: true },
    ],
    optionCells: [
      { kind: 'vertex_dot_conservation', sides: 6, dots: 2, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 6, dots: 3, invertedRing: true },
      { kind: 'vertex_dot_conservation', sides: 5, dots: 3, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 6, dots: 3, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 7, dots: 2, invertedRing: false },
      { kind: 'vertex_dot_conservation', sides: 6, dots: 4, invertedRing: false },
    ],
    options: [
      'Hexagon (6 sides) + 2 interior dots · Standard single frame',
      'Hexagon (6 sides) + 3 interior dots · Dashed outer halo',
      'Pentagon (5 sides) + 3 interior dots · Standard single frame',
      'Hexagon (6 sides) + 3 interior dots · Standard single frame',
      'Heptagon (7 sides) + 2 interior dots · Standard single frame',
      'Hexagon (6 sides) + 4 interior dots · Standard single frame',
    ],
    correctIndex: 3,
    explanation:
      'In Row 3, the sum of polygon vertices V and interior dots N is conserved at V + N = 9: (4 + 5 = 9) → (5 + 4 = 9) → (6 + 3 = 9). Each step right increments polygon sides by +1 (4 → 5 → 6, Hexagon) and decrements interior dots by -1 (5 → 4 → 3). The dashed outer halo alternates checkerboard-style, so (R3, C3) has a standard single frame.',
  },
  {
    id: 'mensa_a15_cyclic_bitmask_shift',
    moduleCode: 'MOD-04',
    moduleTitle: 'Raven’s Set II High-Ceiling Multi-Variable Synthesis',
    batteryOrigin: 'Mensa Denmark',
    domain: 'Modulo-9 Affine Bitmask Permutation',
    difficulty: 'Apex',
    points: 28,
    question:
      'Mensa High-Range Item D-34: Each 3×3 bitmask undergoes a 90° clockwise rotation of the entire 3×3 matrix per column and a bitwise inversion of corners per row. Find (R3, C3).',
    formulaHint: 'Col Step: 90° Clockwise 3×3 Grid Rotation  |  Row 3: Corner L-Triad Rotated Twice (180°)',
    matrixCells: [
      // Row 1: L-triad rotated 90° CW each column: {0,1,3} -> {1,2,5} -> {5,7,8}
      { kind: 'grid_bitmask', cells: [0, 1, 3], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [1, 2, 5], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [5, 7, 8], mode: 'amber' },
      // Row 2: T-tetrad rotated 90° CW each column: {0,1,2,4} -> {2,4,5,8} -> {4,6,7,8}
      { kind: 'grid_bitmask', cells: [0, 1, 2, 4], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [2, 4, 5, 8], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [4, 6, 7, 8], mode: 'amber' },
      // Row 3: Arrowhead {0,1,3,4,8} rotated 90° CW each column:
      // Col 1: {0,1,3,4,8}
      // Col 2 (90° CW): 0->2, 1->5, 3->1, 4->4, 8->6 => {1,2,4,5,6}
      // Col 3 (90° CW again): 1->5, 2->8, 4->4, 5->7, 6->0 => {0,4,5,7,8}
      { kind: 'grid_bitmask', cells: [0, 1, 3, 4, 8], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [1, 2, 4, 5, 6], mode: 'amber' },
    ],
    optionCells: [
      { kind: 'grid_bitmask', cells: [0, 3, 4, 6, 7], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [0, 4, 5, 7, 8], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [2, 4, 5, 7, 8], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [0, 1, 4, 7, 8], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [0, 4, 6, 7, 8], mode: 'amber' },
      { kind: 'grid_bitmask', cells: [1, 3, 4, 5, 7], mode: 'amber' },
    ],
    options: [
      'Bottom-Left arrowhead {0,3,4,6,7}',
      'Bottom-Right arrowhead + Top-Left tail {0,4,5,7,8} (180° rotation of R3C1)',
      'Right-heavy pentomino {2,4,5,7,8}',
      'Vertical hourglass {0,1,4,7,8}',
      'L-frame + center {0,4,6,7,8}',
      'Symmetric central plus {1,3,4,5,7}',
    ],
    correctIndex: 1,
    explanation:
      'Across every row, the entire 3×3 bitmask rotates 90° clockwise per column. Rotating Row 3 Column 1 ({0,1,3,4,8}, top-left arrowhead with bottom-right tail) by 90° CW gives Column 2 ({1,2,4,5,6}, top-right arrowhead with bottom-left tail), and rotating 90° CW once more yields {0,4,5,7,8} (bottom-right arrowhead with top-left tail).',
  },
  {
    id: 'rpm_ii16_triple_synthesis',
    moduleCode: 'MOD-04',
    moduleTitle: 'Raven’s Set II High-Ceiling Multi-Variable Synthesis',
    batteryOrigin: 'Raven’s Set II Apex',
    domain: 'Triple-Invariant Angular Aperture & XOR Synthesis',
    difficulty: 'Apex',
    points: 30,
    question:
      'Raven’s APM Set II-36 (Ceiling Item): Synthesize three simultaneous rules — Latin-square outer manifold, angular sector spread, and corner arc XOR — to determine (R3, C3).',
    formulaHint: '1. Outer Latin Square  |  2. Base Angle +90°/row, Spread +45°/col  |  3. Corner Arcs: C3 = C1 ⊕ C2',
    matrixCells: [
      { kind: 'phase_aperture', outerShape: 'circle', baseAngleDeg: 0, spreadAngleDeg: 45, cornerArcs: ['TL', 'BR'] },
      { kind: 'phase_aperture', outerShape: 'square', baseAngleDeg: 0, spreadAngleDeg: 90, cornerArcs: ['TR', 'BR'] },
      { kind: 'phase_aperture', outerShape: 'hexagon', baseAngleDeg: 0, spreadAngleDeg: 135, cornerArcs: ['TL', 'TR'] },
      { kind: 'phase_aperture', outerShape: 'square', baseAngleDeg: 90, spreadAngleDeg: 45, cornerArcs: ['TL', 'BL'] },
      { kind: 'phase_aperture', outerShape: 'hexagon', baseAngleDeg: 90, spreadAngleDeg: 90, cornerArcs: ['TL', 'TR', 'BL'] },
      { kind: 'phase_aperture', outerShape: 'circle', baseAngleDeg: 90, spreadAngleDeg: 135, cornerArcs: ['TR'] },
      { kind: 'phase_aperture', outerShape: 'hexagon', baseAngleDeg: 180, spreadAngleDeg: 45, cornerArcs: ['TR', 'BR', 'BL'] },
      { kind: 'phase_aperture', outerShape: 'circle', baseAngleDeg: 180, spreadAngleDeg: 90, cornerArcs: ['TR', 'BL'] },
    ],
    optionCells: [
      { kind: 'phase_aperture', outerShape: 'square', baseAngleDeg: 180, spreadAngleDeg: 135, cornerArcs: ['BR'] },
      { kind: 'phase_aperture', outerShape: 'square', baseAngleDeg: 180, spreadAngleDeg: 90, cornerArcs: ['BR'] },
      { kind: 'phase_aperture', outerShape: 'hexagon', baseAngleDeg: 180, spreadAngleDeg: 135, cornerArcs: ['BR'] },
      { kind: 'phase_aperture', outerShape: 'square', baseAngleDeg: 180, spreadAngleDeg: 135, cornerArcs: ['TR', 'BL'] },
      { kind: 'phase_aperture', outerShape: 'square', baseAngleDeg: 90, spreadAngleDeg: 135, cornerArcs: ['BR'] },
      { kind: 'phase_aperture', outerShape: 'circle', baseAngleDeg: 180, spreadAngleDeg: 135, cornerArcs: ['BR'] },
    ],
    options: [
      'Square manifold · 180° base with 135° obtuse aperture · Single BR corner marker',
      'Square manifold · 180° base with 90° right-angle aperture · Single BR corner marker',
      'Hexagon manifold · 180° base with 135° obtuse aperture · Single BR corner marker',
      'Square manifold · 180° base with 135° obtuse aperture · Dual TR + BL corner markers',
      'Square manifold · 90° base with 135° obtuse aperture · Single BR corner marker',
      'Circle manifold · 180° base with 135° obtuse aperture · Single BR corner marker',
    ],
    correctIndex: 0,
    explanation:
      'Three orthogonal rules converge at (R3, C3): (1) Outer shape completes the Latin square {Hexagon, Circle, Square} → Square; (2) Dual clock hands start at 180° (Row 3) with an angular spread of 135° (Col 3: 45° → 90° → 135°); (3) Corner markers follow XOR across Row 3: {TR, BR, BL} ⊕ {TR, BL} = {BR}.',
  },
];

/**
 * Tag the 16 classic Raven's/Mensa matrices with their primary Howard Gardner domain
 * (Spatial / Picture Smart vs. Logical-Mathematical / Number-Reasoning Smart) and combine
 * with the 8 extra visual matrices + 61 multi-domain items to form an 85-question Master Database.
 */
const TAGGED_BASE_MATRIX_QUESTIONS: IQQuestion[] = RELATIVITY_IQ_QUESTIONS.map((q, idx) => {
  const isSpatialMatrix =
    q.moduleCode === 'MOD-03' ||
    idx % 2 === 1 ||
    q.id.includes('vector') ||
    q.id.includes('rotate') ||
    q.id.includes('orbital') ||
    q.id.includes('concentric');
  const gardnerDomain: GardnerIntelligenceId = isSpatialMatrix
    ? 'spatial'
    : 'logical_mathematical';
  return {
    ...q,
    gardnerDomain,
    smartLabel: isSpatialMatrix ? 'Picture Smart' : 'Number/Reasoning Smart',
    questionFormat: 'matrix_3x3',
  };
});

export const MASTER_IQ_QUESTION_DATABASE: readonly IQQuestion[] = [
  ...TAGGED_BASE_MATRIX_QUESTIONS,
  ...EXTRA_VISUAL_MATRIX_QUESTIONS,
  ...GARDNER_DOMAIN_QUESTIONS,
];

/**
 * Helper to generate regular polygon SVG points centered at (cx, cy).
 */
function getPolygonPoints(cx: number, cy: number, r: number, sides: number, rotOffsetDeg = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const rad = ((rotOffsetDeg + (i * 360) / sides) * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * Renders any Raven's / Mensa MatrixCellDescriptor as a high-precision geometric SVG diagram.
 */
export const MatrixCellSvg: React.FC<{
  cell: MatrixCellDescriptor;
  sizeClass?: string;
}> = ({ cell, sizeClass = 'w-full h-full' }) => {
  const strokeMain = '#f4f4f5';
  const strokeAccent = '#22d3ee';
  const strokeGold = '#fbbf24';
  const strokeMuted = '#52525b';

  const renderShapeFrame = (
    shape: 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon',
    radius: number,
    fillUrl = 'none',
    strokeColor = strokeMain,
    strokeW = 2.6
  ) => {
    if (shape === 'circle') {
      return (
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill={fillUrl}
          stroke={strokeColor}
          strokeWidth={strokeW}
        />
      );
    }
    if (shape === 'square') {
      const half = radius * 0.88;
      return (
        <rect
          x={50 - half}
          y={50 - half}
          width={half * 2}
          height={half * 2}
          rx={2}
          fill={fillUrl}
          stroke={strokeColor}
          strokeWidth={strokeW}
        />
      );
    }
    if (shape === 'diamond') {
      return (
        <polygon
          points={getPolygonPoints(50, 50, radius * 1.04, 4, -90)}
          fill={fillUrl}
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeLinejoin="round"
        />
      );
    }
    if (shape === 'triangle') {
      return (
        <polygon
          points={getPolygonPoints(50, 54, radius * 1.08, 3, -90)}
          fill={fillUrl}
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeLinejoin="round"
        />
      );
    }
    return (
      <polygon
        points={getPolygonPoints(50, 50, radius, 6, -90)}
        fill={fillUrl}
        stroke={strokeColor}
        strokeWidth={strokeW}
        strokeLinejoin="round"
      />
    );
  };

  const renderDots = (count: number, radiusSpread = 14) => {
    const coords: Array<[number, number]> = [];
    if (count === 1) {
      coords.push([50, 50]);
    } else if (count === 2) {
      coords.push([50 - radiusSpread * 0.8, 50], [50 + radiusSpread * 0.8, 50]);
    } else if (count === 3) {
      coords.push(
        [50, 50 - radiusSpread * 0.85],
        [50 - radiusSpread * 0.85, 50 + radiusSpread * 0.65],
        [50 + radiusSpread * 0.85, 50 + radiusSpread * 0.65]
      );
    } else if (count === 4) {
      const d = radiusSpread * 0.78;
      coords.push([50 - d, 50 - d], [50 + d, 50 - d], [50 - d, 50 + d], [50 + d, 50 + d]);
    } else if (count === 5) {
      const d = radiusSpread * 0.82;
      coords.push(
        [50, 50],
        [50 - d, 50 - d],
        [50 + d, 50 - d],
        [50 - d, 50 + d],
        [50 + d, 50 + d]
      );
    } else if (count >= 6) {
      const d = radiusSpread * 0.82;
      coords.push(
        [50 - d, 50 - d],
        [50 + d, 50 - d],
        [50 - d, 50],
        [50 + d, 50],
        [50 - d, 50 + d],
        [50 + d, 50 + d]
      );
    }
    return coords.map(([x, y], i) => (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={4.2}
        fill={strokeAccent}
        stroke="#090d16"
        strokeWidth={1.2}
      />
    ));
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeClass} select-none`}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="mensa-diagonal-hatch"
          width="7"
          height="7"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke="#38bdf8" strokeWidth="2.2" strokeOpacity="0.65" />
        </pattern>
      </defs>

      {/* Subtle registration crosshairs in background */}
      <line x1="50" y1="6" x2="50" y2="94" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="2 3" />
      <line x1="6" y1="50" x2="94" y2="50" stroke="#1e293b" strokeWidth="0.75" strokeDasharray="2 3" />

      {cell.kind === 'quant_dots' && (
        <g>
          {renderShapeFrame(cell.frame, 34, 'rgba(15, 23, 42, 0.55)', strokeMain, 2.8)}
          {renderDots(cell.dots, 14)}
        </g>
      )}

      {cell.kind === 'vector_dial' && (() => {
        const rad = ((cell.angleDeg - 90) * Math.PI) / 180;
        const tipX = 50 + 34 * Math.cos(rad);
        const tipY = 50 + 34 * Math.sin(rad);
        const tailX = 50 - 14 * Math.cos(rad);
        const tailY = 50 - 14 * Math.sin(rad);
        const perpX = -Math.sin(rad) * 5.5;
        const perpY = Math.cos(rad) * 5.5;

        return (
          <g>
            <circle cx={50} cy={50} r={37} fill="none" stroke={strokeMuted} strokeWidth={1.5} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rTick = ((deg - 90) * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={50 + 33 * Math.cos(rTick)}
                  y1={50 + 33 * Math.sin(rTick)}
                  x2={50 + 37 * Math.cos(rTick)}
                  y2={50 + 37 * Math.sin(rTick)}
                  stroke="#64748b"
                  strokeWidth={1.4}
                />
              );
            })}
            <line
              x1={tailX}
              y1={tailY}
              x2={tipX}
              y2={tipY}
              stroke={strokeAccent}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            {cell.tailTick && (
              <line
                x1={tailX - perpX}
                y1={tailY - perpY}
                x2={tailX + perpX}
                y2={tailY + perpY}
                stroke={strokeGold}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            )}
            <circle cx={tipX} cy={tipY} r={4.2} fill={strokeAccent} />
            {cell.hubFill === 'hollow' && (
              <circle cx={50} cy={50} r={9.5} fill="#090d16" stroke={strokeMain} strokeWidth={2.6} />
            )}
            {cell.hubFill === 'ring' && (
              <g>
                <circle cx={50} cy={50} r={10} fill="#090d16" stroke={strokeMain} strokeWidth={2.4} />
                <circle cx={50} cy={50} r={4.2} fill={strokeGold} />
              </g>
            )}
            {cell.hubFill === 'solid' && (
              <circle cx={50} cy={50} r={10} fill={strokeGold} stroke={strokeMain} strokeWidth={2} />
            )}
          </g>
        );
      })()}

      {cell.kind === 'bar_stack' && (() => {
        const getCoords = (n: number): number[] => {
          if (n === 1) return [50];
          if (n === 2) return [36, 64];
          return [26, 50, 74];
        };
        const hCoords = getCoords(cell.horizBars);
        const vCoords = getCoords(cell.vertBars);

        return (
          <g>
            <rect x={16} y={16} width={68} height={68} rx={4} fill="rgba(15, 23, 42, 0.45)" stroke="#334155" strokeWidth={1.5} />
            {hCoords.map((y, i) => (
              <line key={`h-${i}`} x1={18} y1={y} x2={82} y2={y} stroke={strokeAccent} strokeWidth={3.2} strokeLinecap="round" />
            ))}
            {vCoords.map((x, i) => (
              <line key={`v-${i}`} x1={x} y1={18} x2={x} y2={82} stroke={strokeMain} strokeWidth={3.2} strokeLinecap="round" />
            ))}
            {cell.centerNode !== 'none' && (
              <circle
                cx={50}
                cy={50}
                r={6.5}
                fill={cell.centerNode === 'solid' ? strokeGold : '#090d16'}
                stroke={strokeGold}
                strokeWidth={2.4}
              />
            )}
          </g>
        );
      })()}

      {cell.kind === 'latin_perm' && (() => {
        const fillStyle =
          cell.fill === 'solid'
            ? 'rgba(245, 158, 11, 0.36)'
            : cell.fill === 'striped'
            ? 'url(#mensa-diagonal-hatch)'
            : 'rgba(9, 13, 22, 0.75)';

        return (
          <g>
            {renderShapeFrame(cell.shape, 34, fillStyle, strokeMain, 2.8)}
            {(cell.axis === 'horiz' || cell.axis === 'plus') && (
              <line x1={18} y1={50} x2={82} y2={50} stroke={strokeGold} strokeWidth={3.2} strokeLinecap="round" />
            )}
            {(cell.axis === 'vert' || cell.axis === 'plus') && (
              <line x1={50} y1={18} x2={50} y2={82} stroke={strokeGold} strokeWidth={3.2} strokeLinecap="round" />
            )}
          </g>
        );
      })()}

      {cell.kind === 'line_boolean' && (() => {
        const cMin = 20;
        const cMax = 80;
        const has = (s: 'T' | 'B' | 'L' | 'R' | 'D1' | 'D2' | 'VM' | 'HM') =>
          cell.segments.includes(s);

        return (
          <g>
            <rect
              x={cMin}
              y={cMin}
              width={60}
              height={60}
              fill="none"
              stroke="#1e293b"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {has('T') && <line x1={cMin} y1={cMin} x2={cMax} y2={cMin} stroke={strokeMain} strokeWidth={3.6} strokeLinecap="round" />}
            {has('B') && <line x1={cMin} y1={cMax} x2={cMax} y2={cMax} stroke={strokeMain} strokeWidth={3.6} strokeLinecap="round" />}
            {has('L') && <line x1={cMin} y1={cMin} x2={cMin} y2={cMax} stroke={strokeMain} strokeWidth={3.6} strokeLinecap="round" />}
            {has('R') && <line x1={cMax} y1={cMin} x2={cMax} y2={cMax} stroke={strokeMain} strokeWidth={3.6} strokeLinecap="round" />}
            {has('D1') && <line x1={cMin} y1={cMin} x2={cMax} y2={cMax} stroke={strokeAccent} strokeWidth={3.2} strokeLinecap="round" />}
            {has('D2') && <line x1={cMax} y1={cMin} x2={cMin} y2={cMax} stroke={strokeAccent} strokeWidth={3.2} strokeLinecap="round" />}
            {has('VM') && <line x1={50} y1={cMin} x2={50} y2={cMax} stroke={strokeGold} strokeWidth={3.2} strokeLinecap="round" />}
            {has('HM') && <line x1={cMin} y1={50} x2={cMax} y2={50} stroke={strokeGold} strokeWidth={3.2} strokeLinecap="round" />}
            {[
              [cMin, cMin],
              [cMax, cMin],
              [cMin, cMax],
              [cMax, cMax],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2.4} fill="#94a3b8" />
            ))}
          </g>
        );
      })()}

      {cell.kind === 'grid_bitmask' && (() => {
        const coords = [20, 42, 64];
        const fillCol =
          cell.mode === 'amber'
            ? 'rgba(251, 191, 36, 0.85)'
            : 'rgba(34, 211, 238, 0.82)';
        const borderCol = cell.mode === 'amber' ? '#fde68a' : '#a5f3fc';

        return (
          <g>
            <rect x={16} y={16} width={68} height={68} rx={4} fill="#090d16" stroke="#475569" strokeWidth={1.8} />
            {Array.from({ length: 9 }).map((_, idx) => {
              const r = Math.floor(idx / 3);
              const c = idx % 3;
              const active = cell.cells.includes(idx);
              return (
                <rect
                  key={idx}
                  x={coords[c]}
                  y={coords[r]}
                  width={16}
                  height={16}
                  rx={2.5}
                  fill={active ? fillCol : 'rgba(30, 41, 59, 0.35)'}
                  stroke={active ? borderCol : '#334155'}
                  strokeWidth={active ? 1.5 : 1}
                />
              );
            })}
          </g>
        );
      })()}

      {cell.kind === 'quadrant_xor' && (() => {
        const r = 30;
        const wedgePaths = [
          `M 50 50 L ${50 - r} 50 A ${r} ${r} 0 0 1 50 ${50 - r} Z`,
          `M 50 50 L 50 ${50 - r} A ${r} ${r} 0 0 1 ${50 + r} 50 Z`,
          `M 50 50 L ${50 + r} 50 A ${r} ${r} 0 0 1 50 ${50 + r} Z`,
          `M 50 50 L 50 ${50 + r} A ${r} ${r} 0 0 1 ${50 - r} 50 Z`,
        ];
        const cornerCoords: Array<[number, number]> = [
          [16, 16],
          [84, 16],
          [84, 84],
          [16, 84],
        ];

        return (
          <g>
            {wedgePaths.map((d, idx) => (
              <path
                key={idx}
                d={d}
                fill={cell.quadrants.includes(idx) ? 'rgba(34, 211, 238, 0.75)' : 'rgba(15, 23, 42, 0.5)'}
                stroke={strokeMain}
                strokeWidth={2}
              />
            ))}
            {cornerCoords.map(([cx, cy], idx) =>
              cell.corners.includes(idx) ? (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={5.2}
                  fill={strokeGold}
                  stroke="#090d16"
                  strokeWidth={1.2}
                />
              ) : (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill="none"
                  stroke="#334155"
                  strokeWidth={1.2}
                />
              )
            )}
          </g>
        );
      })()}

      {cell.kind === 'concentric_cycle' && (
        <g>
          {renderShapeFrame(cell.layers[0], 38, 'none', strokeMain, 2.6)}
          {renderShapeFrame(cell.layers[1], 25, 'none', strokeAccent, 2.4)}
          {renderShapeFrame(cell.layers[2], 13, 'none', strokeGold, 2.2)}
          <circle
            cx={50}
            cy={50}
            r={4.5}
            fill={cell.centerSolid ? strokeGold : '#090d16'}
            stroke={strokeMain}
            strokeWidth={1.8}
          />
        </g>
      )}

      {cell.kind === 'mirror_rotate' && (() => {
        const transform = `translate(50, 50) rotate(${cell.rotDeg}) scale(${cell.flipX ? -1 : 1}, 1) translate(-50, -50)`;
        return (
          <g transform={transform}>
            <path
              d="M 32 22 L 32 76 L 70 76"
              fill="none"
              stroke={strokeMain}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="32,22 64,34 32,46"
              fill="rgba(34, 211, 238, 0.65)"
              stroke={strokeAccent}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <circle
              cx={68}
              cy={cell.dotPos === 'top' ? 24 : 62}
              r={5.2}
              fill={strokeGold}
              stroke="#090d16"
              strokeWidth={1.4}
            />
          </g>
        );
      })()}

      {cell.kind === 'orbital_phase' && (() => {
        const rOuter = 38;
        const rInner = 24;
        const oRad = ((cell.outerDeg - 90) * Math.PI) / 180;
        const iRad = ((cell.innerDeg - 90) * Math.PI) / 180;
        const ox = 50 + rOuter * Math.cos(oRad);
        const oy = 50 + rOuter * Math.sin(oRad);
        const ix = 50 + rInner * Math.cos(iRad);
        const iy = 50 + rInner * Math.sin(iRad);

        return (
          <g>
            <circle cx={50} cy={50} r={rOuter} fill="none" stroke="#334155" strokeWidth={1.5} strokeDasharray="3 3" />
            <circle cx={50} cy={50} r={rInner} fill="none" stroke="#475569" strokeWidth={1.5} />
            <polygon
              points={getPolygonPoints(50, 50, 12, cell.coreSides, -90)}
              fill="rgba(15, 23, 42, 0.9)"
              stroke={strokeMain}
              strokeWidth={2.4}
              strokeLinejoin="round"
            />
            {/* Outer Cyan Satellite */}
            <circle cx={ox} cy={oy} r={5.5} fill={strokeAccent} stroke="#090d16" strokeWidth={1.5} />
            {/* Inner Gold Diamond Satellite */}
            <polygon
              points={`${ix},${iy - 5.5} ${ix + 5.5},${iy} ${ix},${iy + 5.5} ${ix - 5.5},${iy}`}
              fill={strokeGold}
              stroke="#090d16"
              strokeWidth={1.2}
            />
          </g>
        );
      })()}

      {cell.kind === 'vector_balance' && (() => {
        const renderSpikes = (count: number, dir: 'E' | 'W' | 'N' | 'S') => {
          const items: React.ReactNode[] = [];
          const abs = Math.abs(count);
          for (let i = 0; i < abs; i++) {
            const offset = abs === 2 ? (i === 0 ? -6.5 : 6.5) : 0;
            if (dir === 'E') {
              items.push(
                <g key={`E-${i}`}>
                  <line x1={62} y1={50 + offset} x2={86} y2={50 + offset} stroke={strokeAccent} strokeWidth={3} strokeLinecap="round" />
                  <circle cx={86} cy={50 + offset} r={3.2} fill={strokeAccent} />
                </g>
              );
            } else if (dir === 'W') {
              items.push(
                <g key={`W-${i}`}>
                  <line x1={38} y1={50 + offset} x2={14} y2={50 + offset} stroke={strokeAccent} strokeWidth={3} strokeLinecap="round" />
                  <circle cx={14} cy={50 + offset} r={3.2} fill={strokeAccent} />
                </g>
              );
            } else if (dir === 'N') {
              items.push(
                <g key={`N-${i}`}>
                  <line x1={50 + offset} y1={38} x2={50 + offset} y2={14} stroke={strokeGold} strokeWidth={3} strokeLinecap="round" />
                  <circle cx={50 + offset} cy={14} r={3.2} fill={strokeGold} />
                </g>
              );
            } else {
              items.push(
                <g key={`S-${i}`}>
                  <line x1={50 + offset} y1={62} x2={50 + offset} y2={86} stroke={strokeGold} strokeWidth={3} strokeLinecap="round" />
                  <circle cx={50 + offset} cy={86} r={3.2} fill={strokeGold} />
                </g>
              );
            }
          }
          return items;
        };

        return (
          <g>
            {cell.dx > 0 && renderSpikes(cell.dx, 'E')}
            {cell.dx < 0 && renderSpikes(cell.dx, 'W')}
            {cell.dy > 0 && renderSpikes(cell.dy, 'N')}
            {cell.dy < 0 && renderSpikes(cell.dy, 'S')}
            {cell.coreShape === 'square' ? (
              <rect
                x={38}
                y={38}
                width={24}
                height={24}
                rx={3}
                fill="rgba(15, 23, 42, 0.9)"
                stroke={strokeMain}
                strokeWidth={2.8}
              />
            ) : (
              <circle
                cx={50}
                cy={50}
                r={12.5}
                fill="rgba(15, 23, 42, 0.9)"
                stroke={strokeMain}
                strokeWidth={2.8}
              />
            )}
          </g>
        );
      })()}

      {cell.kind === 'subgrid_automaton' && (() => {
        const centers = [25, 50, 75];
        const getXY = (idx: number): [number, number] => [
          centers[idx % 3],
          centers[Math.floor(idx / 3)],
        ];
        const [dotX, dotY] = getXY(cell.dotIdx);
        const [diaX, diaY] = getXY(cell.diamondIdx);
        const [crsX, crsY] = getXY(cell.crossIdx);

        return (
          <g>
            <rect x={13} y={13} width={74} height={74} rx={4} fill="rgba(9, 13, 22, 0.75)" stroke="#475569" strokeWidth={1.8} />
            <line x1={37.6} y1={13} x2={37.6} y2={87} stroke="#334155" strokeWidth={1.4} />
            <line x1={62.3} y1={13} x2={62.3} y2={87} stroke="#334155" strokeWidth={1.4} />
            <line x1={13} y1={37.6} x2={87} y2={37.6} stroke="#334155" strokeWidth={1.4} />
            <line x1={13} y1={62.3} x2={87} y2={62.3} stroke="#334155" strokeWidth={1.4} />

            <circle cx={dotX} cy={dotY} r={7.2} fill={strokeAccent} stroke="#090d16" strokeWidth={1.4} />

            <polygon
              points={`${diaX},${diaY - 8.5} ${diaX + 8.5},${diaY} ${diaX},${diaY + 8.5} ${diaX - 8.5},${diaY}`}
              fill="none"
              stroke={strokeGold}
              strokeWidth={2.6}
            />

            <g stroke={strokeMain} strokeWidth={2.6} strokeLinecap="round">
              <line x1={crsX - 6} y1={crsY - 6} x2={crsX + 6} y2={crsY + 6} />
              <line x1={crsX + 6} y1={crsY - 6} x2={crsX - 6} y2={crsY + 6} />
            </g>
          </g>
        );
      })()}

      {cell.kind === 'vertex_dot_conservation' && (
        <g>
          {cell.invertedRing && (
            <circle
              cx={50}
              cy={50}
              r={42}
              fill="none"
              stroke={strokeGold}
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
          )}
          <polygon
            points={getPolygonPoints(50, 50, 34, cell.sides, -90)}
            fill="rgba(15, 23, 42, 0.72)"
            stroke={strokeMain}
            strokeWidth={2.8}
            strokeLinejoin="round"
          />
          {renderDots(cell.dots, 12.5)}
        </g>
      )}

      {cell.kind === 'phase_aperture' && (() => {
        const rad1 = ((cell.baseAngleDeg - 90) * Math.PI) / 180;
        const rad2 = ((cell.baseAngleDeg + cell.spreadAngleDeg - 90) * Math.PI) / 180;
        const rHand = 26;
        const x1 = 50 + rHand * Math.cos(rad1);
        const y1 = 50 + rHand * Math.sin(rad1);
        const x2 = 50 + rHand * Math.cos(rad2);
        const y2 = 50 + rHand * Math.sin(rad2);
        const rArc = 14;
        const ax1 = 50 + rArc * Math.cos(rad1);
        const ay1 = 50 + rArc * Math.sin(rad1);
        const ax2 = 50 + rArc * Math.cos(rad2);
        const ay2 = 50 + rArc * Math.sin(rad2);

        const cornerMap: Record<'TL' | 'TR' | 'BR' | 'BL', [number, number]> = {
          TL: [14, 14],
          TR: [86, 14],
          BR: [86, 86],
          BL: [14, 86],
        };

        return (
          <g>
            {renderShapeFrame(cell.outerShape, 36, 'rgba(9, 13, 22, 0.7)', strokeMain, 2.6)}
            <path
              d={`M 50 50 L ${ax1.toFixed(1)} ${ay1.toFixed(1)} A ${rArc} ${rArc} 0 0 1 ${ax2.toFixed(1)} ${ay2.toFixed(1)} Z`}
              fill="rgba(251, 191, 36, 0.35)"
              stroke={strokeGold}
              strokeWidth={1.6}
            />
            <line x1={50} y1={50} x2={x1} y2={y1} stroke={strokeAccent} strokeWidth={3} strokeLinecap="round" />
            <line x1={50} y1={50} x2={x2} y2={y2} stroke={strokeGold} strokeWidth={3} strokeLinecap="round" />
            <circle cx={50} cy={50} r={3.8} fill={strokeMain} />
            {cell.cornerArcs.map((cornerKey) => {
              const [cx, cy] = cornerMap[cornerKey];
              return (
                <rect
                  key={cornerKey}
                  x={cx - 4.5}
                  y={cy - 4.5}
                  width={9}
                  height={9}
                  rx={2}
                  fill={strokeAccent}
                  stroke="#090d16"
                  strokeWidth={1.2}
                />
              );
            })}
          </g>
        );
      })()}
    </svg>
  );
};

/**
 * Renders a normative Wechsler / Mensa Gaussian Bell Curve (Mean = 100, SD = 15)
 * with an optional score marker pin.
 */
const NormativeBellCurveSvg: React.FC<{ userIq?: number }> = ({ userIq }) => {
  // IQ range 55 to 160 mapped to x in [20, 380]
  const iqToX = (iq: number) => 20 + ((Math.max(55, Math.min(160, iq)) - 55) / 105) * 360;
  const iqToY = (iq: number) => {
    const z = (iq - 100) / 15;
    return 88 - 70 * Math.exp(-0.5 * z * z);
  };

  const pts: string[] = [];
  for (let iq = 55; iq <= 160; iq += 1.5) {
    pts.push(`${iqToX(iq).toFixed(1)},${iqToY(iq).toFixed(1)}`);
  }
  const areaPath = `M 20,88 L ${pts.join(' L ')} L 380,88 Z`;
  const curvePath = `M ${pts.join(' L ')}`;

  // Mensa 130+ shaded tail
  const mensaPts: string[] = [];
  for (let iq = 130; iq <= 160; iq += 1.5) {
    mensaPts.push(`${iqToX(iq).toFixed(1)},${iqToY(iq).toFixed(1)}`);
  }
  const mensaAreaPath = `M ${iqToX(130).toFixed(1)},88 L ${mensaPts.join(' L ')} L 380,88 Z`;

  return (
    <svg viewBox="0 0 400 110" className="w-full h-24 select-none">
      <defs>
        <linearGradient id="bell-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="mensa-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#bell-grad)" />
      <path d={mensaAreaPath} fill="url(#mensa-grad)" />
      <path d={curvePath} fill="none" stroke="#22d3ee" strokeWidth="2" />

      {/* Baseline */}
      <line x1="15" y1="88" x2="385" y2="88" stroke="#334155" strokeWidth="1.2" />

      {/* Standard Deviation Ticks */}
      {[70, 85, 100, 115, 130, 145, 160].map((iqTick) => {
        const x = iqToX(iqTick);
        const y = iqToY(iqTick);
        const isMensa = iqTick === 130;
        return (
          <g key={iqTick}>
            <line
              x1={x}
              y1={y}
              x2={x}
              y2={88}
              stroke={isMensa ? '#fbbf24' : '#475569'}
              strokeWidth={isMensa ? 1.5 : 1}
              strokeDasharray={isMensa ? '2 2' : '2 3'}
            />
            <text
              x={x}
              y={101}
              textAnchor="middle"
              fill={isMensa ? '#fbbf24' : '#94a3b8'}
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight={isMensa || iqTick === 100 ? 'bold' : 'normal'}
            >
              {iqTick}
            </text>
          </g>
        );
      })}

      {/* Mensa 98th Percentile Label */}
      <text
        x={iqToX(138)}
        y={42}
        fill="#fbbf24"
        fontSize="8"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="bold"
      >
        Mensa ≥130 (Top 2%)
      </text>

      {/* Active User Score Marker */}
      {typeof userIq === 'number' && (
        <g>
          <line
            x1={iqToX(userIq)}
            y1={12}
            x2={iqToX(userIq)}
            y2={88}
            stroke="#10b981"
            strokeWidth="2.2"
          />
          <circle
            cx={iqToX(userIq)}
            cy={iqToY(userIq)}
            r="4.5"
            fill="#10b981"
            stroke="#05070d"
            strokeWidth="1.5"
          />
          <rect
            x={Math.min(340, Math.max(18, iqToX(userIq) - 26))}
            y={3}
            width={52}
            height={14}
            rx={3}
            fill="#064e3b"
            stroke="#10b981"
            strokeWidth="1"
          />
          <text
            x={Math.min(366, Math.max(44, iqToX(userIq)))}
            y={12.5}
            textAnchor="middle"
            fill="#ecfdf5"
            fontSize="8.5"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            IQ {userIq}
          </text>
        </g>
      )}
    </svg>
  );
};

export interface IQTestModuleProps {
  uiTheme?: UiThemeId;
  isActiveTab?: boolean;
  onHapticLight?: () => void;
  onHapticMedium?: () => void;
  onHapticSuccess?: () => void;
}

export type IQSubViewId = 'assessment' | 'growth_analytics' | 'telemetry_report';

interface PersistedIQSessionState {
  isTestStarted: boolean;
  currentQuestionIdx: number;
  selectedAnswers: Record<string, number>;
  flaggedQuestions: Record<string, boolean>;
  questionTimingsMs: Record<string, number>;
  isCompleted: boolean;
  elapsedSeconds: number;
  batteryMode: IQBatteryModeId;
  activeQuestions: IQQuestion[];
  testDrawNumber: number;
}

const IQ_SESSION_STORAGE_KEY = 'kerr_iq_test_session_v1';

function createInitialSampledQuestions(mode: IQBatteryModeId = 'observatory_24'): IQQuestion[] {
  const seen = getPreviouslySeenQuestionIds();
  const drawn = sampleRandomizedIQQuestions(MASTER_IQ_QUESTION_DATABASE, mode, seen);
  savePreviouslySeenQuestionIds([...seen, ...drawn.map((q) => q.id)]);
  return drawn;
}

let memoryIqSessionState: PersistedIQSessionState = (() => {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.sessionStorage.getItem(IQ_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedIQSessionState>;
        const rawMode = parsed.batteryMode;
        const mode: IQBatteryModeId =
          rawMode === 'observatory_24' ||
          rawMode === 'comprehensive_18' ||
          rawMode === 'gardner_9_quick' ||
          rawMode === 'matrices_16' ||
          rawMode === 'full_deep_27' ||
          (typeof rawMode === 'string' && rawMode.startsWith('domain_'))
            ? (rawMode as IQBatteryModeId)
            : 'observatory_24';
        const validQuestions =
          Array.isArray(parsed.activeQuestions) && parsed.activeQuestions.length > 0
            ? parsed.activeQuestions
            : createInitialSampledQuestions(mode);
        return {
          isTestStarted: Boolean(parsed.isTestStarted),
          currentQuestionIdx:
            typeof parsed.currentQuestionIdx === 'number' ? parsed.currentQuestionIdx : 0,
          selectedAnswers:
            parsed.selectedAnswers && typeof parsed.selectedAnswers === 'object'
              ? parsed.selectedAnswers
              : {},
          flaggedQuestions:
            parsed.flaggedQuestions && typeof parsed.flaggedQuestions === 'object'
              ? parsed.flaggedQuestions
              : {},
          questionTimingsMs:
            parsed.questionTimingsMs && typeof parsed.questionTimingsMs === 'object'
              ? parsed.questionTimingsMs
              : {},
          isCompleted: Boolean(parsed.isCompleted),
          elapsedSeconds:
            typeof parsed.elapsedSeconds === 'number' ? parsed.elapsedSeconds : 0,
          batteryMode: mode,
          activeQuestions: validQuestions,
          testDrawNumber:
            typeof parsed.testDrawNumber === 'number' && parsed.testDrawNumber >= 1
              ? parsed.testDrawNumber
              : 1,
        };
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }
  return {
    isTestStarted: false,
    currentQuestionIdx: 0,
    selectedAnswers: {},
    flaggedQuestions: {},
    questionTimingsMs: {},
    isCompleted: false,
    elapsedSeconds: 0,
    batteryMode: 'observatory_24',
    activeQuestions: createInitialSampledQuestions('observatory_24'),
    testDrawNumber: 1,
  };
})();

function savePersistedIqSessionState(next: PersistedIQSessionState): void {
  memoryIqSessionState = next;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(IQ_SESSION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore sessionStorage quota or privacy errors
    }
  }
}

export const IQTestModule: React.FC<IQTestModuleProps> = ({
  uiTheme = 'observatory_gold',
  isActiveTab = true,
  onHapticLight,
  onHapticMedium,
  onHapticSuccess,
}) => {
  const [isTestStarted, setIsTestStarted] = useState<boolean>(
    () => memoryIqSessionState.isTestStarted
  );
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(
    () => memoryIqSessionState.currentQuestionIdx
  );
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>(
    () => memoryIqSessionState.selectedAnswers
  );
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>(
    () => memoryIqSessionState.flaggedQuestions
  );
  const [questionTimingsMs, setQuestionTimingsMs] = useState<Record<string, number>>(
    () => memoryIqSessionState.questionTimingsMs || {}
  );
  const [isCompleted, setIsCompleted] = useState<boolean>(
    () => memoryIqSessionState.isCompleted
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    () => memoryIqSessionState.elapsedSeconds
  );
  const [batteryMode, setBatteryMode] = useState<IQBatteryModeId>(
    () => memoryIqSessionState.batteryMode
  );
  const [activeQuestions, setActiveQuestions] = useState<IQQuestion[]>(
    () => memoryIqSessionState.activeQuestions
  );
  const [testDrawNumber, setTestDrawNumber] = useState<number>(
    () => memoryIqSessionState.testDrawNumber
  );
  const [showExplanationInReview, setShowExplanationInReview] = useState<boolean>(false);
  const [activeSubView, setActiveSubView] = useState<IQSubViewId>('assessment');
  const [growthHistory, setGrowthHistory] = useState<GrowthSessionSnapshot[]>(() =>
    loadGrowthHistory()
  );
  const [hasCopiedSummary, setHasCopiedSummary] = useState<boolean>(false);

  // Synchronize all IQ test progress to module memory & sessionStorage so tab changes never reset the test
  useEffect(() => {
    savePersistedIqSessionState({
      isTestStarted,
      currentQuestionIdx,
      selectedAnswers,
      flaggedQuestions,
      questionTimingsMs,
      isCompleted,
      elapsedSeconds,
      batteryMode,
      activeQuestions,
      testDrawNumber,
    });
  }, [
    isTestStarted,
    currentQuestionIdx,
    selectedAnswers,
    flaggedQuestions,
    questionTimingsMs,
    isCompleted,
    elapsedSeconds,
    batteryMode,
    activeQuestions,
    testDrawNumber,
  ]);

  const activePool = activeQuestions.length > 0 ? activeQuestions : RELATIVITY_IQ_QUESTIONS;
  const safeQuestionIdx = Math.min(
    currentQuestionIdx,
    Math.max(0, activePool.length - 1)
  );
  const currentQuestion = activePool[safeQuestionIdx] || activePool[0];
  const currentGardnerMeta =
    GARDNER_INTELLIGENCE_MAP[currentQuestion.gardnerDomain || 'spatial'] ||
    GARDNER_INTELLIGENCES[2];

  // Track total elapsed seconds and per-question latency (in ms) while active
  useEffect(() => {
    if (!isTestStarted || isCompleted || !isActiveTab || activeSubView !== 'assessment') return;
    const secTimer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    const msTimer = window.setInterval(() => {
      const qId = currentQuestion?.id;
      if (!qId) return;
      setQuestionTimingsMs((prev) => ({
        ...prev,
        [qId]: (prev[qId] || 0) + 250,
      }));
    }, 250);
    return () => {
      window.clearInterval(secTimer);
      window.clearInterval(msTimer);
    };
  }, [isTestStarted, isCompleted, isActiveTab, activeSubView, currentQuestion?.id]);

  const profileSummary = useMemo(
    () => computeMultipleIntelligencesProfile(activePool, selectedAnswers, elapsedSeconds),
    [activePool, selectedAnswers, elapsedSeconds]
  );

  const {
    answeredCount,
    correctCount,
    estimatedIq,
    topStrengths: topGardnerStrengths,
  } = profileSummary;

  const [expandedDomainCardId, setExpandedDomainCardId] = useState<GardnerIntelligenceId | null>('logical_mathematical');
  const [domainLayoutMode, setDomainLayoutMode] = useState<'grid' | 'detailed'>('grid');
  const [showTopStatsCards, setShowTopStatsCards] = useState<boolean>(false);
  const [autoAdvanceOnSelect, setAutoAdvanceOnSelect] = useState<boolean>(true);
  const [questionNavFilter, setQuestionNavFilter] = useState<'all' | 'unanswered' | 'flagged'>('all');

  const telemetryReport = useMemo(
    () =>
      buildPostTestTelemetryReport(
        activePool,
        selectedAnswers,
        elapsedSeconds,
        questionTimingsMs
      ),
    [activePool, selectedAnswers, elapsedSeconds, questionTimingsMs]
  );

  const displayedTelemetryReport = useMemo(
    () =>
      answeredCount > 0 || isCompleted
        ? telemetryReport
        : buildCalibrationPreviewTelemetryReport(activePool),
    [answeredCount, isCompleted, telemetryReport, activePool]
  );

  /**
   * Draws a brand-new randomized set of questions from the 85-question database,
   * excluding recently seen question IDs so every test run has unique questions.
   */
  const drawFreshQuestionSet = (modeToUse: IQBatteryModeId, startImmediately: boolean) => {
    const previousIds = [
      ...getPreviouslySeenQuestionIds(),
      ...activePool.map((q) => q.id),
    ];
    const freshQuestions = sampleRandomizedIQQuestions(
      MASTER_IQ_QUESTION_DATABASE,
      modeToUse,
      previousIds
    );
    savePreviouslySeenQuestionIds([...previousIds, ...freshQuestions.map((q) => q.id)]);
    const nextDrawNum = testDrawNumber + 1;
    const freshState: PersistedIQSessionState = {
      isTestStarted: startImmediately,
      isCompleted: false,
      selectedAnswers: {},
      flaggedQuestions: {},
      questionTimingsMs: {},
      currentQuestionIdx: 0,
      elapsedSeconds: 0,
      batteryMode: modeToUse,
      activeQuestions: freshQuestions,
      testDrawNumber: nextDrawNum,
    };
    savePersistedIqSessionState(freshState);
    setBatteryMode(modeToUse);
    setActiveQuestions(freshQuestions);
    setTestDrawNumber(nextDrawNum);
    setIsTestStarted(startImmediately);
    setIsCompleted(false);
    setSelectedAnswers({});
    setFlaggedQuestions({});
    setQuestionTimingsMs({});
    setCurrentQuestionIdx(0);
    setElapsedSeconds(0);
    setShowExplanationInReview(false);
    setQuestionNavFilter('all');
    setActiveSubView('assessment');
  };

  const handleStartTest = () => {
    onHapticMedium?.();
    drawFreshQuestionSet(batteryMode, true);
  };

  const handleResetTest = () => {
    onHapticLight?.();
    drawFreshQuestionSet(batteryMode, false);
  };

  const handleChangeBatteryMode = (nextMode: IQBatteryModeId) => {
    onHapticLight?.();
    drawFreshQuestionSet(nextMode, false);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (!isTestStarted) return;
    const isCorrect = optionIdx === currentQuestion.correctIndex;
    if (isCorrect) {
      onHapticSuccess?.();
    } else {
      onHapticLight?.();
    }
    setSelectedAnswers((prev) => {
      const next = {
        ...prev,
        [currentQuestion.id]: optionIdx,
      };
      if (autoAdvanceOnSelect && safeQuestionIdx < activePool.length - 1) {
        window.setTimeout(() => {
          setCurrentQuestionIdx((currIdx) =>
            Math.min(activePool.length - 1, currIdx + 1)
          );
        }, 220);
      }
      return next;
    });
  };

  const handleJumpToNextUnanswered = () => {
    onHapticLight?.();
    for (let offset = 1; offset <= activePool.length; offset++) {
      const candidateIdx = (safeQuestionIdx + offset) % activePool.length;
      const q = activePool[candidateIdx];
      if (q && typeof selectedAnswers[q.id] !== 'number') {
        setCurrentQuestionIdx(candidateIdx);
        return;
      }
    }
  };

  // Keyboard navigation for active assessment (Left/Right arrows, 1-6 or A-F option keys)
  useEffect(() => {
    if (!isActiveTab || !isTestStarted || isCompleted || activeSubView !== 'assessment') {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentQuestionIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentQuestionIdx((i) => Math.min(activePool.length - 1, i + 1));
      } else if (/^[1-6]$/.test(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        if (optIdx >= 0 && optIdx < currentQuestion.options.length) {
          e.preventDefault();
          handleSelectOption(optIdx);
        }
      } else if (/^[a-fA-F]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const optIdx = e.key.toUpperCase().charCodeAt(0) - 65;
        if (optIdx >= 0 && optIdx < currentQuestion.options.length) {
          e.preventDefault();
          handleSelectOption(optIdx);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isActiveTab,
    isTestStarted,
    isCompleted,
    activeSubView,
    activePool.length,
    currentQuestion,
    autoAdvanceOnSelect,
    safeQuestionIdx,
  ]);

  const handleToggleFlag = (questionId: string) => {
    onHapticLight?.();
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleCompleteAssessment = () => {
    onHapticSuccess?.();
    setIsCompleted(true);
    setActiveSubView('telemetry_report');
    const updatedHistory = appendReportToGrowthHistory(
      growthHistory,
      telemetryReport,
      batteryMode
    );
    setGrowthHistory(updatedHistory);
    saveGrowthHistory(updatedHistory);
  };

  const handleRecordGrowthRun = () => {
    if (answeredCount > 0) {
      const updated = appendReportToGrowthHistory(growthHistory, telemetryReport, batteryMode);
      setGrowthHistory(updated);
      saveGrowthHistory(updated);
      return;
    }
    const simulatedAnswers: Record<string, number> = {};
    const simulatedTimings: Record<string, number> = {};
    activePool.forEach((q, idx) => {
      const pass = (idx + growthHistory.length) % 5 !== 0;
      simulatedAnswers[q.id] = pass ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
      simulatedTimings[q.id] = 3200 + ((idx * 530) % 2800);
    });
    const simReport = buildPostTestTelemetryReport(
      activePool,
      simulatedAnswers,
      Math.round(activePool.length * 4.2),
      simulatedTimings
    );
    const updated = appendReportToGrowthHistory(growthHistory, simReport, batteryMode);
    setGrowthHistory(updated);
    saveGrowthHistory(updated);
  };

  const handleResetGrowthHistory = () => {
    const reset = [...SEED_GROWTH_HISTORY];
    setGrowthHistory(reset);
    saveGrowthHistory(reset);
  };

  const handleCopyTelemetrySummary = () => {
    onHapticSuccess?.();
    const rpt = displayedTelemetryReport;
    const lines = [
      '=== KERR RELATIVITY ENGINE — PSYCHOMETRIC & MULTIPLE INTELLIGENCES TELEMETRY ===',
      `Assessment Set: #${testDrawNumber} (${batteryMode})`,
      `Full-Scale IQ Estimate: ${rpt.confidenceIntervalLabel} (SD = ${rpt.standardDeviation}, z = ${rpt.zScore})`,
      `Percentile Rank: ${rpt.percentileRank}th Percentile (${rpt.percentileLabel}) — ${rpt.classificationTitle}`,
      `Accuracy: ${rpt.correctCount}/${rpt.totalQuestions} (${Math.round(
        (rpt.correctCount / Math.max(1, rpt.totalQuestions)) * 100
      )}%)`,
      `Session Timing: ${rpt.totalElapsedSeconds}s total | ${rpt.avgLatencyMs} ms/item avg`,
      `Speed-Accuracy Verdict: ${rpt.speedAccuracyVerdict}`,
      '',
      '--- COGNITIVE SUB-DOMAIN BREAKDOWN ---',
      ...rpt.cognitiveSubDomains.map(
        (sub) =>
          `• ${sub.title}: ${sub.correctCount}/${sub.itemCount} (${sub.accuracyPercent}%) | Avg ${Math.round(
            sub.avgLatencyMs
          )} ms`
      ),
      '',
      '--- DIFFICULTY TIER CALIBRATION ---',
      ...rpt.difficultyBrackets.map(
        (b) =>
          `• ${b.title} (${b.iqCeilingLabel}): ${b.correctCount}/${b.itemCount} (${b.passRatePercent}% Pass)`
      ),
      `Calibration Diagnostic: ${rpt.calibrationDiagnostic}`,
    ];
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    }
    setHasCopiedSummary(true);
    window.setTimeout(() => setHasCopiedSummary(false), 2200);
  };

  const handleExportTelemetryJson = () => {
    onHapticMedium?.();
    const rpt = displayedTelemetryReport;
    const payload = {
      exportedAt: new Date().toISOString(),
      engine: 'Kerr-Newman Psychometric & Multiple Intelligences Telemetry Core v2.5',
      testDrawNumber,
      batteryMode,
      headlineReadout: {
        estimatedIq: rpt.estimatedIq,
        confidenceInterval: rpt.confidenceIntervalLabel,
        standardDeviation: rpt.standardDeviation,
        zScore: rpt.zScore,
        percentileRank: rpt.percentileRank,
        classification: rpt.classificationTitle,
      },
      sessionMetrics: {
        totalQuestions: rpt.totalQuestions,
        answeredCount: rpt.answeredCount,
        correctCount: rpt.correctCount,
        totalElapsedSeconds: rpt.totalElapsedSeconds,
        avgLatencyMs: rpt.avgLatencyMs,
        speedAccuracyVerdict: rpt.speedAccuracyVerdict,
        calibrationDiagnostic: rpt.calibrationDiagnostic,
      },
      cognitiveSubDomains: rpt.cognitiveSubDomains,
      difficultyBrackets: rpt.difficultyBrackets,
      gardnerDomains: rpt.gardnerDomains,
      latencyCurve: rpt.latencyCurve,
      growthHistorySnapshots: growthHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kerr-iq-telemetry-set-${testDrawNumber}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  void uiTheme;
  const currentSelectedOption = selectedAnswers[currentQuestion.id];
  const hasAnsweredCurrent = typeof currentSelectedOption === 'number';
  const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60)
    .toString()
    .padStart(2, '0')}`;
  const isVisualMatrixQuestion =
    currentQuestion.questionFormat === 'matrix_3x3' &&
    currentQuestion.optionCells &&
    currentQuestion.optionCells.length > 0;

  const latestGrowthSnap = growthHistory[growthHistory.length - 1];
  const baselineGrowthSnap = growthHistory[0];
  const growthIqDelta =
    latestGrowthSnap && baselineGrowthSnap
      ? latestGrowthSnap.compositeIq - baselineGrowthSnap.compositeIq
      : 0;

  const unansweredCount = activePool.filter(
    (q) => typeof selectedAnswers[q.id] !== 'number'
  ).length;
  const flaggedCount = activePool.filter((q) => Boolean(flaggedQuestions[q.id])).length;
  const shouldCompactStats =
    isTestStarted && activeSubView === 'assessment' && !showTopStatsCards;

  return (
    <div
      data-testid="settings-tab-panel-iq-test"
      className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-3.5 text-sm text-zinc-200"
    >
      {/* Top Navigation & Action Bar — Instant Sub-View & Session Control */}
      <div className="p-3 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-lg space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide font-display flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Psychometric Intelligence Suite</span>
            </h3>
            <span
              data-testid="iq-test-score-readout"
              className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-mono text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap"
            >
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>
                {isCompleted
                  ? `FSIQ ${telemetryReport.confidenceIntervalLabel} · ${telemetryReport.percentileRank}TH %ILE`
                  : `SET #${testDrawNumber} · Q1–Q${activePool.length}`}
              </span>
            </span>

            {isTestStarted && activeSubView === 'assessment' && (
              <button
                type="button"
                data-testid="iq-toggle-stats-cards-btn"
                onClick={() => {
                  onHapticLight?.();
                  setShowTopStatsCards((prev) => !prev);
                }}
                className="px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px] cursor-pointer transition-colors"
              >
                {showTopStatsCards ? 'Compact Stats' : 'Expand 4 Stats Cards'}
              </button>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              data-testid="iq-test-start-btn"
              onClick={handleStartTest}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 transition-colors text-xs font-semibold cursor-pointer shadow-sm whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isTestStarted ? 'Restart Suite' : 'Begin Suite'}</span>
            </button>

            <button
              type="button"
              data-testid="iq-shuffle-pool-btn"
              onClick={() => {
                onHapticLight?.();
                drawFreshQuestionSet(batteryMode, isTestStarted);
              }}
              title="Draw a brand-new non-repeating set of questions from the 85-question database"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span>New Set</span>
            </button>

            {isTestStarted && (
              <button
                type="button"
                data-testid="iq-test-reset-btn"
                onClick={handleResetTest}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Batteries</span>
              </button>
            )}

            <button
              type="button"
              data-testid="iq-header-copy-summary-btn"
              onClick={handleCopyTelemetrySummary}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              {hasCopiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="iq-header-export-json-btn"
              onClick={handleExportTelemetryJson}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Sub-View Navigation Tabs + Progress Bar Integrated in Top Sticky Header */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              data-testid="iq-subview-assessment"
              onClick={() => {
                onHapticLight?.();
                setActiveSubView('assessment');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap ${
                activeSubView === 'assessment'
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                1. Assessment (
                {isTestStarted
                  ? `Q${safeQuestionIdx + 1}/Q${activePool.length}`
                  : `Q1–Q${activePool.length}`}
                )
              </span>
            </button>

            <button
              type="button"
              data-testid="iq-subview-growth-analytics"
              onClick={() => {
                onHapticLight?.();
                setActiveSubView('growth_analytics');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap ${
                activeSubView === 'growth_analytics'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Growth Analytics (D3.js)</span>
            </button>

            <button
              type="button"
              data-testid="iq-subview-telemetry-report"
              onClick={() => {
                onHapticLight?.();
                setActiveSubView('telemetry_report');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap ${
                activeSubView === 'telemetry_report'
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Post-Test Telemetry</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {shouldCompactStats && (
              <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                <span>
                  IQ: <strong className="text-white">{displayedTelemetryReport.confidenceIntervalLabel}</strong>
                </span>
                <span>·</span>
                <span>
                  Time: <strong className="text-cyan-300">{formattedTime}</strong>
                </span>
              </div>
            )}
            <div className="w-full md:w-40 shrink-0 space-y-0.5">
              <div className="flex items-center justify-between text-[10.5px] whitespace-nowrap">
                <span className="font-semibold text-zinc-300">Progress</span>
                <span className="font-mono text-zinc-400 tabular-nums">
                  {answeredCount}/{activePool.length} (
                  {Math.round((answeredCount / Math.max(1, activePool.length)) * 100)}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all duration-300"
                  style={{
                    width: `${Math.max(
                      4,
                      Math.round((answeredCount / Math.max(1, activePool.length)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards (Automatically compacted during active question view unless expanded) */}
      {!shouldCompactStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Full-Scale IQ (95% CI)</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-0.5 text-xl font-bold font-mono text-white tracking-tight tabular-nums">
              {displayedTelemetryReport.confidenceIntervalLabel}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-mono truncate">
              {displayedTelemetryReport.percentileRank}th %ile · σ = 15 ({displayedTelemetryReport.zScore})
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Items Verified</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-0.5 text-xl font-bold font-mono text-emerald-300 tracking-tight tabular-nums">
              {answeredCount > 0 ? `${correctCount} / ${activePool.length}` : `0 / ${activePool.length}`}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {answeredCount} answered · {MASTER_IQ_QUESTION_DATABASE.length}-item master bank
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>Response Latency</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-0.5 text-xl font-bold font-mono text-white tracking-tight tabular-nums">
              {(displayedTelemetryReport.avgLatencyMs / 1000).toFixed(1)}s{' '}
              <span className="text-xs font-normal text-zinc-400">/ item</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 font-mono truncate">
              Elapsed {formattedTime} · {displayedTelemetryReport.avgLatencyMs.toLocaleString()} ms avg
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
              <span>9-Domain Growth</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-0.5 text-xl font-bold font-mono text-amber-300 tracking-tight tabular-nums">
              {growthIqDelta >= 0 ? `+${growthIqDelta}` : growthIqDelta} IQ
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {growthHistory.length} Sessions · Top: {topGardnerStrengths[0]?.meta.shortCode || 'LOG'}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Region */}
      <div
        data-testid="iq-test-logic-modules-container"
        role="region"
        aria-label="Howard Gardner Multiple Intelligences, Growth Analytics, and Post-Test Telemetry Container"
        className="space-y-3.5"
      >
        {activeSubView === 'growth_analytics' ? (
          <GrowthAnalyticsDashboard
            history={growthHistory}
            onRecordSimulatedOrLiveRun={handleRecordGrowthRun}
            onResetGrowthHistory={handleResetGrowthHistory}
            onHapticLight={onHapticLight}
            onHapticSuccess={onHapticSuccess}
          />
        ) : activeSubView === 'telemetry_report' || isCompleted ? (
          <PostTestTelemetryReportView
            report={displayedTelemetryReport}
            testDrawNumber={testDrawNumber}
            bellCurveSlot={
              <NormativeBellCurveSvg userIq={displayedTelemetryReport.estimatedIq} />
            }
            onReviewQuestions={() => {
              onHapticLight?.();
              setIsCompleted(false);
              setShowExplanationInReview(true);
              setActiveSubView('assessment');
            }}
            onStartNewTest={handleStartTest}
            onOpenGrowthAnalytics={() => {
              onHapticLight?.();
              setActiveSubView('growth_analytics');
            }}
            onCopySummary={handleCopyTelemetrySummary}
            onExportJson={handleExportTelemetryJson}
            hasCopied={hasCopiedSummary}
          />
        ) : !isTestStarted ? (
          /* Streamlined Scannable Pre-Test Overview */
          <div
            data-testid="iq-pretest-briefing"
            className="space-y-3.5"
          >
            {/* Battery Mode Distribution & Selector Card with Immediate Launch Button */}
            <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-zinc-200 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-cyan-400" />
                  <span>Step 1: Choose Assessment Battery (or click any Domain below)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">
                    Active: Q1–Q{activePool.length}
                  </span>
                  <button
                    type="button"
                    data-testid="iq-battery-card-start-btn"
                    onClick={handleStartTest}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch Q1–Q{activePool.length} Now</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {IQ_BATTERY_MODES.map((modeMeta) => {
                  const isSelectedMode = batteryMode === modeMeta.id;
                  return (
                    <button
                      key={modeMeta.id}
                      type="button"
                      data-testid={`iq-battery-mode-${modeMeta.id}`}
                      onClick={() => handleChangeBatteryMode(modeMeta.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelectedMode
                          ? 'bg-zinc-900 border-emerald-500/60 text-white shadow-md shadow-emerald-950/20'
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[10px] font-bold text-cyan-300">
                            {modeMeta.questionCount} ITEMS
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              isSelectedMode ? 'text-emerald-400' : 'text-zinc-500'
                            }`}
                          >
                            {isSelectedMode ? 'ACTIVE' : 'SELECT'}
                          </span>
                        </div>
                        <div className="font-bold text-white text-xs pt-0.5 leading-snug">
                          {modeMeta.title}
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                          {modeMeta.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 9 Intelligence Domains — With 3x3 Compact Grid vs Detailed List Switcher */}
            <div
              data-testid="gardner-9-intelligences-framework"
              className="space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 px-1">
                <span className="font-semibold text-zinc-200">
                  Nine Intelligence Domains (Howard Gardner Framework)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="iq-domain-layout-grid-btn"
                    onClick={() => {
                      onHapticLight?.();
                      setDomainLayoutMode('grid');
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-mono text-[10.5px] cursor-pointer transition-colors ${
                      domainLayoutMode === 'grid'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Compact 3×3 Grid
                  </button>
                  <button
                    type="button"
                    data-testid="iq-domain-layout-detailed-btn"
                    onClick={() => {
                      onHapticLight?.();
                      setDomainLayoutMode('detailed');
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-mono text-[10.5px] cursor-pointer transition-colors ${
                      domainLayoutMode === 'detailed'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Detailed List
                  </button>
                </div>
              </div>

              <div
                className={
                  domainLayoutMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5'
                    : 'space-y-2.5'
                }
              >
                {GARDNER_INTELLIGENCES.map((intel) => {
                  const domainQuestions = MASTER_IQ_QUESTION_DATABASE.filter(
                    (q) => q.gardnerDomain === intel.id
                  );
                  const totalInBank = domainQuestions.length;
                  const domainModeId: IQBatteryModeId = `domain_${intel.id}`;
                  const isDomainSelected = batteryMode === domainModeId;
                  const isExpanded = expandedDomainCardId === intel.id;
                  const latestScore = latestGrowthSnap?.domainScores[intel.id] ?? 80;
                  const baselineScore = baselineGrowthSnap?.domainScores[intel.id] ?? 62;
                  const delta = latestScore - baselineScore;

                  if (domainLayoutMode === 'grid') {
                    return (
                      <div
                        key={intel.id}
                        data-testid={`gardner-domain-card-${intel.id}`}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          isDomainSelected
                            ? 'bg-zinc-950 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                            : 'bg-zinc-950/85 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 font-mono text-[10px] font-bold text-cyan-300">
                              MOD-{intel.indexNumber} · {intel.shortCode}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] font-bold text-emerald-300 tabular-nums">
                              {latestScore}% ({delta >= 0 ? `+${delta}%` : `${delta}%`})
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <h4 className="font-bold text-white text-xs">{intel.name}</h4>
                            <span
                              className={`px-1.5 py-0.5 rounded border font-mono text-[9.5px] ${intel.badgeClass}`}
                            >
                              {intel.smartTitle}
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-snug">
                            {intel.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-800/70">
                          <button
                            type="button"
                            data-testid={`select-domain-mode-${intel.id}`}
                            onClick={() => handleChangeBatteryMode(domainModeId)}
                            className={`px-2 py-1 rounded-lg border text-[10.5px] font-mono transition-all cursor-pointer ${
                              isDomainSelected
                                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold'
                                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {isDomainSelected ? 'Queued (7 Qs)' : 'Queue 7 Qs'}
                          </button>

                          <button
                            type="button"
                            data-testid={`launch-domain-test-${intel.id}`}
                            onClick={() => {
                              onHapticMedium?.();
                              drawFreshQuestionSet(domainModeId, true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 hover:text-white text-[10.5px] font-mono font-semibold transition-all cursor-pointer"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Start {intel.shortCode}</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={intel.id}
                      data-testid={`gardner-domain-card-${intel.id}`}
                      className={`rounded-xl border transition-all ${
                        isExpanded || isDomainSelected
                          ? 'bg-zinc-950 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className="p-3.5 cursor-pointer select-none"
                        onClick={() => {
                          onHapticLight?.();
                          setExpandedDomainCardId(isExpanded ? null : intel.id);
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-750 font-mono text-xs font-bold text-cyan-300">
                              MOD-{intel.indexNumber} · {intel.shortCode}
                            </span>
                            <h4 className="font-bold text-white text-sm hover:text-amber-300 transition-colors">
                              {intel.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-md border font-mono text-xs ${intel.badgeClass}`}
                            >
                              {intel.smartTitle}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              data-testid={`select-domain-mode-${intel.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChangeBatteryMode(domainModeId);
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                                isDomainSelected
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold'
                                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {isDomainSelected ? 'Queued (7 Qs)' : 'Queue Mode'}
                            </button>

                            <button
                              type="button"
                              data-testid={`launch-domain-test-${intel.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onHapticMedium?.();
                                drawFreshQuestionSet(domainModeId, true);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-mono font-semibold transition-all cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Start {intel.shortCode}</span>
                            </button>

                            <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold text-emerald-300 tabular-nums">
                              {latestScore}% ({delta >= 0 ? `+${delta}%` : `${delta}%`})
                            </span>

                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-amber-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                          {intel.description}
                        </p>

                        <div className="mt-2 text-xs font-mono text-zinc-400 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-semibold uppercase text-[11px]">
                              Psychometric Battery:
                            </span>
                            <span className="text-zinc-300 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                              {intel.psychometricTestTitle}
                            </span>
                          </div>
                          <span className="text-zinc-400">{totalInBank} calibrated items in bank</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-3.5 pt-2 border-t border-zinc-800/80 bg-zinc-900/30 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block uppercase">
                              Domain Pool Capacity
                            </span>
                            <span className="text-white font-bold">
                              {totalInBank} Verified Questions
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block uppercase">
                              Longitudinal Mastery
                            </span>
                            <span className="text-emerald-300 font-bold">
                              Baseline {baselineScore}% → Current {latestScore}%
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                            <span className="text-[10px] text-zinc-400 block uppercase">
                              Sample Analytical Focus
                            </span>
                            <span className="text-cyan-300 truncate block">
                              {domainQuestions[0]?.domain || intel.psychometricTestTitle}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engineering & Psychometric Specifications Footer */}
            <div className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-80 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <NormativeBellCurveSvg userIq={displayedTelemetryReport.estimatedIq} />
              </div>

              <div className="flex-1 space-y-1.5 text-center md:text-left">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-bold">
                  Ready for Calibration · Set #{testDrawNumber} (Q1–Q{activePool.length})
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Completing an assessment automatically compiles the Post-Test Telemetry Report (Headline CI, 4-Category Sub-Domains, Per-Question Latency Curve, Difficulty Tier Calibration) and records your 9-domain vector into D3.js Growth Analytics.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartTest}
                className="w-full md:w-auto py-2.5 px-5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-100 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Begin Assessment (Q1–Q{activePool.length})</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Question View — With Top Quick-Jump Navigator, Filter Pills & Auto-Advance */
          <div
            data-testid="iq-test-active-question-card"
            className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 space-y-3.5"
          >
            {/* Top Question Navigator Strip — Jump to Any Question Without Scrolling */}
            <div
              data-testid="iq-top-question-navigator"
              className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={safeQuestionIdx === 0}
                    onClick={() => {
                      onHapticLight?.();
                      setCurrentQuestionIdx((i) => Math.max(0, i - 1));
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-colors ${
                      safeQuestionIdx === 0
                        ? 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                        : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-700 text-zinc-200 cursor-pointer'
                    }`}
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onHapticLight?.();
                      if (safeQuestionIdx < activePool.length - 1) {
                        setCurrentQuestionIdx((i) => Math.min(activePool.length - 1, i + 1));
                      } else {
                        handleCompleteAssessment();
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-100 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    <span>
                      {safeQuestionIdx < activePool.length - 1 ? 'Next' : 'Finish'}
                    </span>
                    <ChevronRight className="w-3 h-3" />
                  </button>

                  {unansweredCount > 0 && (
                    <button
                      type="button"
                      data-testid="iq-jump-next-unanswered-btn"
                      onClick={handleJumpToNextUnanswered}
                      className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-amber-200 font-mono text-[10.5px] cursor-pointer transition-colors"
                      title="Jump directly to the next unanswered question"
                    >
                      Next Unanswered ({unansweredCount})
                    </button>
                  )}
                </div>

                {/* Filter Pills: All / Unanswered / Flagged + Auto-Advance Toggle */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'all', label: `All (${activePool.length})` },
                      { id: 'unanswered', label: `Unanswered (${unansweredCount})` },
                      { id: 'flagged', label: `Flagged (${flaggedCount})` },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      data-testid={`iq-nav-filter-${f.id}`}
                      onClick={() => {
                        onHapticLight?.();
                        setQuestionNavFilter(f.id);
                      }}
                      className={`px-2 py-0.5 rounded-md border font-mono text-[10px] cursor-pointer transition-colors ${
                        questionNavFilter === f.id
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    data-testid="iq-auto-advance-toggle-btn"
                    aria-pressed={autoAdvanceOnSelect}
                    onClick={() => {
                      onHapticLight?.();
                      setAutoAdvanceOnSelect((prev) => !prev);
                    }}
                    className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold cursor-pointer transition-colors ${
                      autoAdvanceOnSelect
                        ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Automatically advance to the next question when you select an answer"
                  >
                    Auto-Next: {autoAdvanceOnSelect ? 'ON' : 'OFF'}
                  </button>

                  {answeredCount > 0 && (
                    <button
                      type="button"
                      onClick={handleCompleteAssessment}
                      className="px-2.5 py-0.5 rounded-md bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/70 text-emerald-200 font-mono text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Submit ({answeredCount}/{activePool.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Question Number Strip (Filtered) */}
              <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-zinc-800/80">
                {activePool.map((q, idx) => {
                  const isAnswered = typeof selectedAnswers[q.id] === 'number';
                  const isCurrent = idx === safeQuestionIdx;
                  const isFlagged = Boolean(flaggedQuestions[q.id]);

                  if (questionNavFilter === 'unanswered' && isAnswered && !isCurrent) {
                    return null;
                  }
                  if (questionNavFilter === 'flagged' && !isFlagged && !isCurrent) {
                    return null;
                  }

                  return (
                    <button
                      key={`top-nav-${q.id}`}
                      type="button"
                      onClick={() => {
                        onHapticLight?.();
                        setCurrentQuestionIdx(idx);
                      }}
                      title={`Jump to Question ${idx + 1}: ${q.moduleTitle}`}
                      className={`relative w-6 h-6 rounded-md font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500/35 border-cyan-300 text-white ring-1 ring-cyan-400/50'
                          : isAnswered
                          ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
                <span className="ml-auto font-mono text-[10px] text-zinc-500 hidden sm:inline">
                  Keys: ←/→ Nav · A–F Select
                </span>
              </div>
            </div>

            {/* Question Header Bar with Howard Gardner Domain Badge & Per-Question Latency */}
            <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-xs pb-2.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-bold">
                  Item {safeQuestionIdx + 1} of {activePool.length}
                </span>
                <span
                  data-testid="iq-active-gardner-badge"
                  className={`px-2.5 py-1 rounded-lg border font-semibold ${currentGardnerMeta.badgeClass}`}
                >
                  {currentGardnerMeta.name} ({currentGardnerMeta.smartTitle})
                </span>
                <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                  {currentQuestion.domain} · {currentQuestion.difficulty} ({currentQuestion.points} pts)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-300 text-[11px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {((questionTimingsMs[currentQuestion.id] || 0) / 1000).toFixed(1)}s on item
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowExplanationInReview((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] cursor-pointer transition-colors"
                >
                  {showExplanationInReview ? 'Hide Hint/Logic' : 'Show Hint'}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentQuestion.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] cursor-pointer transition-colors ${
                    flaggedQuestions[currentQuestion.id]
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Flag className="w-3 h-3" />
                  <span>{flaggedQuestions[currentQuestion.id] ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>
            </div>

            {/* Question Prompt Banner */}
            <div
              data-testid="iq-question-prompt"
              className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5"
            >
              <div className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                {currentQuestion.question}
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                <strong className="text-cyan-300">{currentGardnerMeta.smartTitle}:</strong>{' '}
                {currentGardnerMeta.description}
              </div>
              {showExplanationInReview && (
                <div className="pt-2 mt-2 border-t border-zinc-800 text-xs font-mono text-amber-200/90 space-y-1">
                  <div>
                    <strong>Structural Hint:</strong> {currentQuestion.formulaHint}
                  </div>
                  {hasAnsweredCurrent && (
                    <div className="text-emerald-300">
                      <strong>Solution Rationale:</strong> {currentQuestion.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isVisualMatrixQuestion ? (
              /* 3x3 Visual Matrix + 6 Option Tiles (Spatial / Logical-Mathematical Matrices) */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* LEFT: 3x3 Matrix Grid */}
                <div className="md:col-span-6 flex justify-center">
                  <div className="w-full max-w-[300px] p-3 rounded-xl bg-[#070a12] border border-zinc-800">
                    <div className="grid grid-cols-3 gap-2 aspect-square">
                      {currentQuestion.matrixCells.map((cellDesc, cellIdx) => (
                        <div
                          key={cellIdx}
                          className="relative aspect-square rounded-lg bg-[#0c1220] border border-slate-800 p-1.5 flex items-center justify-center overflow-hidden"
                        >
                          <MatrixCellSvg cell={cellDesc} />
                        </div>
                      ))}

                      {/* Missing Cell (3,3) */}
                      <div
                        className={`relative aspect-square rounded-lg border-2 border-dashed p-1.5 flex items-center justify-center transition-all ${
                          hasAnsweredCurrent
                            ? 'bg-cyan-950/30 border-cyan-400'
                            : 'bg-cyan-950/15 border-cyan-500/70'
                        }`}
                      >
                        {hasAnsweredCurrent &&
                        currentQuestion.optionCells[currentSelectedOption] ? (
                          <MatrixCellSvg
                            cell={currentQuestion.optionCells[currentSelectedOption]}
                          />
                        ) : (
                          <span className="font-display text-2xl font-bold text-cyan-400">
                            ?
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: 6 Visual Choice Tiles (A–F) */}
                <div className="md:col-span-6">
                  <div
                    className="grid grid-cols-3 gap-2.5"
                    role="radiogroup"
                    aria-label={currentQuestion.question}
                  >
                    {currentQuestion.options.map((optionText, idx) => {
                      const isSelected = currentSelectedOption === idx;
                      const optionCell = currentQuestion.optionCells[idx];

                      return (
                        <button
                          key={idx}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`Option ${String.fromCharCode(65 + idx)}: ${optionText}`}
                          data-testid={`iq-option-${idx}`}
                          onClick={() => handleSelectOption(idx)}
                          className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                              : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-cyan-400/60 hover:bg-zinc-900'
                          }`}
                        >
                          <span
                            className={`self-start px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                              isSelected
                                ? 'bg-cyan-400 text-zinc-950'
                                : 'bg-zinc-950 text-zinc-400'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>

                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                            {optionCell && <MatrixCellSvg cell={optionCell} />}
                          </div>

                          <span className="sr-only">{optionText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Multi-Domain Howard Gardner Stimulus & Analytical Choice View */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* LEFT: Domain Stimulus Briefing Card */}
                <div className="md:col-span-5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold ${currentGardnerMeta.badgeClass}`}
                      >
                        {currentGardnerMeta.shortCode} · {currentGardnerMeta.smartTitle}
                      </span>
                      <BookOpen className="w-4 h-4 text-zinc-500" />
                    </div>

                    <div className="text-xs font-display font-bold text-white uppercase tracking-wider">
                      {currentQuestion.domain}
                    </div>

                    {currentQuestion.stimulusLines && currentQuestion.stimulusLines.length > 0 && (
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-cyan-100/90 space-y-1.5 leading-relaxed">
                        {currentQuestion.stimulusLines.map((line, lIdx) => (
                          <div key={lIdx} className="break-words">
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-zinc-400">
                    <span className="text-cyan-300 font-semibold">Analytical Principle:</span>{' '}
                    {currentQuestion.formulaHint}
                  </div>
                </div>

                {/* RIGHT: Analytical Options (A–D) */}
                <div
                  className="md:col-span-7 flex flex-col justify-center gap-2.5"
                  role="radiogroup"
                  aria-label={currentQuestion.question}
                >
                  {currentQuestion.options.map((optionText, idx) => {
                    const isSelected = currentSelectedOption === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Option ${String.fromCharCode(65 + idx)}: ${optionText}`}
                        data-testid={`iq-option-${idx}`}
                        onClick={() => handleSelectOption(idx)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-400/50'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:border-cyan-400/60 hover:bg-zinc-900'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-cyan-400 text-zinc-950'
                              : 'bg-zinc-950 border border-zinc-700 text-zinc-300'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-xs leading-relaxed flex-1">{optionText}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                data-testid="iq-prev-question-btn"
                disabled={safeQuestionIdx === 0}
                onClick={() => {
                  onHapticLight?.();
                  setCurrentQuestionIdx((i) => Math.max(0, i - 1));
                }}
                className={`flex items-center gap-1 px-3.5 py-2 rounded-xl border font-mono text-xs transition-colors ${
                  safeQuestionIdx === 0
                    ? 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 flex-wrap justify-center">
                {activePool.map((q, idx) => {
                  const isAnswered = typeof selectedAnswers[q.id] === 'number';
                  const isCurrent = idx === safeQuestionIdx;
                  const isFlagged = Boolean(flaggedQuestions[q.id]);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      data-testid={`iq-jump-q-${idx}`}
                      onClick={() => {
                        onHapticLight?.();
                        setCurrentQuestionIdx(idx);
                      }}
                      title={`${idx + 1}. ${q.moduleTitle}`}
                      className={`relative w-6 h-6 rounded-md font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500/30 border-cyan-300 text-white'
                          : isAnswered
                          ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {safeQuestionIdx < activePool.length - 1 ? (
                <button
                  type="button"
                  data-testid="iq-next-question-btn"
                  onClick={() => {
                    onHapticLight?.();
                    setCurrentQuestionIdx((i) =>
                      Math.min(activePool.length - 1, i + 1)
                    );
                  }}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-100 font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="iq-finish-btn"
                  onClick={handleCompleteAssessment}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400 text-emerald-100 font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Finish &amp; View Telemetry</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
