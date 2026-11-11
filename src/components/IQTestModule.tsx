import React, { useState, useEffect } from 'react';
import {
  Brain,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Award,
  ChevronRight,
  ChevronLeft,
  Layers,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { UiThemeId } from '../scene/BlackHoleScene';

export interface IQQuestion {
  id: string;
  moduleCode: 'MOD-01' | 'MOD-02' | 'MOD-03' | 'MOD-04';
  moduleTitle: string;
  domain: string;
  difficulty: 'Standard' | 'Advanced' | 'Apex';
  points: number;
  question: string;
  formulaHint: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const RELATIVITY_IQ_QUESTIONS: IQQuestion[] = [
  {
    id: 'q_isco_spin',
    moduleCode: 'MOD-01',
    moduleTitle: 'Non-Euclidean Geodesic Spatial Folding',
    domain: 'Spatial Geodesics',
    difficulty: 'Standard',
    points: 15,
    question:
      'As a black hole’s dimensionless Kerr spin parameter a* increases from 0 (Schwarzschild) toward 1 (extremal prograde Kerr), how does the prograde Innermost Stable Circular Orbit (R_ISCO) shift?',
    formulaHint: 'R_ISCO(a*) = R_g [3 + Z₂ - √((3 - Z₁)(3 + Z₁ + 2Z₂))]',
    options: [
      'Contracts inward from 6 R_g (3 R_s) down to 1 R_g (0.5 R_s) at the horizon',
      'Expands outward from 6 R_g to 9 R_g due to centrifugal repulsion',
      'Remains fixed at 6 R_g (3 R_s) regardless of angular momentum',
      'Collapses directly to r = 0 once spin exceeds a* = 0.50',
    ],
    correctIndex: 0,
    explanation:
      'Frame-dragging stabilizes prograde orbits closer to the horizon, shrinking R_ISCO from 6 R_g (3 R_s) for a static Schwarzschild black hole down to 1 R_g (0.5 R_s) for an extremal prograde Kerr black hole (while retrograde ISCO expands to 9 R_g).',
  },
  {
    id: 'q_ergosphere_dragging',
    moduleCode: 'MOD-01',
    moduleTitle: 'Non-Euclidean Geodesic Spatial Folding',
    domain: 'Spacetime Topology',
    difficulty: 'Standard',
    points: 15,
    question:
      'Inside the ergosphere of a rotating Kerr black hole (r₊ < r < r_ergo(θ)), why can no physical observer remain static relative to distant stars?',
    formulaHint: 'g_tt = -(1 - 2Mr / Σ) > 0  ⇒  dφ/dt > 0',
    options: [
      'Spacetime itself is dragged in the direction of rotation so strongly that static worldlines would be spacelike (superluminal)',
      'All radial null geodesics are reflected outward by magnetic pressure',
      'The Kretschmann curvature scalar vanishes identically inside the static limit',
      'Proper time reverses sign for all timelike trajectories outside the event horizon',
    ],
    correctIndex: 0,
    explanation:
      'At the static limit surface r_ergo(θ), the metric component g_tt changes sign. Inside the ergosphere, a constant-φ worldline is spacelike, forcing all timelike and null trajectories to co-rotate with the black hole (Lense-Thirring frame-dragging).',
  },
  {
    id: 'q_schwarzschild_density',
    moduleCode: 'MOD-02',
    moduleTitle: 'Boyer-Lindquist Tensor Pattern Matrix',
    domain: 'Scaling & Invariants',
    difficulty: 'Advanced',
    points: 20,
    question:
      'If Black Hole A has mass M and Schwarzschild radius R_s, and Ultramassive Black Hole B has mass 1,000 M, how do B’s event horizon radius and effective horizon density (ρ ∝ M / R_s³) compare to A?',
    formulaHint: 'R_s = 2GM / c² ∝ M   ⇒   ρ_horizon ∝ M / M³ = M⁻²',
    options: [
      'Horizon radius is 1,000× larger; effective density is 1,000,000× (10⁻⁶) lower',
      'Horizon radius is 10× larger; effective density is 1,000× higher',
      'Horizon radius is 1,000× larger; effective density remains constant',
      'Horizon radius scales as √1,000; effective density scales linearly with M',
    ],
    correctIndex: 0,
    explanation:
      'Because R_s scales linearly with mass M, enclosing volume scales as R_s³ ∝ M³. Thus average density inside the horizon scales as M⁻² — which is why supermassive black holes like TON 618 have average densities lower than atmospheric air.',
  },
  {
    id: 'q_doppler_beaming',
    moduleCode: 'MOD-02',
    moduleTitle: 'Boyer-Lindquist Tensor Pattern Matrix',
    domain: 'Radiative Transfer',
    difficulty: 'Standard',
    points: 15,
    question:
      'Why does the approaching limb of a relativistic accretion disk appear dramatically brighter and bluer than the receding limb when viewed near edge-on?',
    formulaHint: 'I_obs = D⁴ I_emit,   D = 1 / [γ (1 - β cos θ)]',
    options: [
      'Special-relativistic Doppler beaming (D⁴ bolometric intensity boost) and photon arrival-time compression from plasma orbiting at v ~ 0.5c',
      'Gravitational lensing completely blocks all photons emitted from the receding half of the disk',
      'Hawking radiation selectively heats only the approaching hemisphere of the accretion torus',
      'Tidal shear destroys dust grains exclusively on the receding side of the orbit',
    ],
    correctIndex: 0,
    explanation:
      'Relativistic aberration, frequency blueshift, and time-arrival compression combine via Liouville’s theorem (I_ν / ν³ = invariant) to amplify bolometric intensity by D⁴ on the approaching side while dimming and redshifting the receding side.',
  },
  {
    id: 'q_time_dilation',
    moduleCode: 'MOD-03',
    moduleTitle: 'Frame-Dragging Chrono-Sequence Deduction',
    domain: 'Chrono-Sequence Logic',
    difficulty: 'Advanced',
    points: 20,
    question:
      'A telemetry probe hovers at r = 1.0417 R_s outside a Schwarzschild black hole where √(1 - R_s / r) = 0.20. If 10 minutes elapse on the probe’s onboard clock, how much coordinate time elapses for an observer at infinity?',
    formulaHint: 'dτ = dt √(1 - R_s / r)   ⇒   dt = dτ / 0.20',
    options: [
      '50 minutes (distant clock runs 5.0× faster than the deep-well probe)',
      '2 minutes (distant clock runs 5.0× slower than the deep-well probe)',
      '250 minutes (scales with the inverse square of the metric factor)',
      '10 minutes (proper time and coordinate time are invariant)',
    ],
    correctIndex: 0,
    explanation:
      'Gravitational time dilation relates proper time dτ of a stationary clock at radius r to coordinate time dt at infinity by dt = dτ / √(1 - R_s/r). With √(1 - R_s/r) = 0.20, 10 minutes of proper time corresponds to 10 / 0.20 = 50 minutes at infinity.',
  },
  {
    id: 'q_accretion_efficiency',
    moduleCode: 'MOD-03',
    moduleTitle: 'Frame-Dragging Chrono-Sequence Deduction',
    domain: 'Energetics & Thermodynamics',
    difficulty: 'Advanced',
    points: 20,
    question:
      'What is the maximum theoretical mass-to-energy radiative efficiency (η = 1 - E_ISCO) of thin-disk accretion onto a maximally spinning Kerr black hole (a* → 1) compared to stellar hydrogen fusion (η ≈ 0.7%)?',
    formulaHint: 'E_ISCO(a* → 1) = 1 / √3 ≈ 0.577   ⇒   η = 1 - 1/√3',
    options: [
      '≈ 42.3% of rest-mass energy — roughly 60× more efficient than nuclear fusion',
      '≈ 5.72% of rest-mass energy — identical to a non-rotating Schwarzschild black hole',
      '100% of rest-mass energy is radiated before crossing the event horizon',
      '≈ 0.07% of rest-mass energy due to photon capture inside the ergosphere',
    ],
    correctIndex: 0,
    explanation:
      'At R_ISCO = 1 R_g for an extremal Kerr black hole, specific binding energy reaches 1 - 1/√3 ≈ 42.26% of rest mass energy, powering the extraordinary luminosity of quasars like TON 618.',
  },
  {
    id: 'q_photon_sphere',
    moduleCode: 'MOD-04',
    moduleTitle: 'Photon Ring Symmetry & Invariant Synthesis',
    domain: 'Null Geodesic Caustics',
    difficulty: 'Advanced',
    points: 20,
    question:
      'For a light ray approaching a Schwarzschild black hole from infinity with impact parameter b, what happens at the critical impact parameter b_crit = (3√3 / 2) R_s ≈ 2.60 R_s?',
    formulaHint: 'V_eff(r_ph) = (1 - R_s/r) / r²   maximized at   r_ph = 1.5 R_s',
    options: [
      'The photon asymptotically spirals into an unstable circular orbit at the photon sphere (r = 1.5 R_s), forming the bright photon ring',
      'The photon passes through the spacetime manifold with zero net deflection angle',
      'The photon enters a stable bound elliptical orbit between 3 R_s and 6 R_s',
      'The photon is immediately reflected 180° at the outer ergosphere boundary',
    ],
    correctIndex: 0,
    explanation:
      'At b = b_crit = (3√3/2) R_s, the photon’s energy matches the peak of the null effective potential at r_ph = 1.5 R_s (3 R_g), causing it to orbit the black hole multiple times and produce the lensed relativistic photon ring.',
  },
  {
    id: 'q_penrose_process',
    moduleCode: 'MOD-04',
    moduleTitle: 'Photon Ring Symmetry & Invariant Synthesis',
    domain: 'Apex Black Hole Mechanics',
    difficulty: 'Apex',
    points: 25,
    question:
      'In the Penrose process and Blandford-Znajek jet mechanism, what energy reservoir is tapped, and which geometric property is guaranteed never to decrease by Hawking’s Area Theorem?',
    formulaHint: 'M² = M_irred² + J² / (4 M_irred²),   dA_horizon = 32π d(M_irred²) ≥ 0',
    options: [
      'Rotational kinetic energy of the spinning black hole (reducing spin J), while the event horizon surface area A_horizon (and irreducible mass M_irred) never decreases',
      'Irreducible rest mass of the singularity, causing the event horizon area to shrink toward zero',
      'Thermal Hawking radiation from inside the inner Cauchy horizon r₋',
      'Gravitational wave energy from distant background stars without altering black hole angular momentum',
    ],
    correctIndex: 0,
    explanation:
      'Up to 29% of a maximally spinning Kerr black hole’s total mass-energy is rotational energy stored in the ergosphere. Extracting it spins down the black hole (reducing J and total mass M) while Hawking’s second law of black hole mechanics ensures dA_horizon ≥ 0.',
  },
];

export interface IQTestModuleProps {
  uiTheme?: UiThemeId;
  onHapticLight?: () => void;
  onHapticMedium?: () => void;
  onHapticSuccess?: () => void;
}

export const IQTestModule: React.FC<IQTestModuleProps> = ({
  uiTheme = 'observatory_gold',
  onHapticLight,
  onHapticMedium,
  onHapticSuccess,
}) => {
  const [isTestStarted, setIsTestStarted] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeModuleFilter, setActiveModuleFilter] = useState<
    'ALL' | 'MOD-01' | 'MOD-02' | 'MOD-03' | 'MOD-04'
  >('ALL');

  const filteredQuestions =
    activeModuleFilter === 'ALL'
      ? RELATIVITY_IQ_QUESTIONS
      : RELATIVITY_IQ_QUESTIONS.filter((q) => q.moduleCode === activeModuleFilter);

  const safeQuestionIdx = Math.min(
    currentQuestionIdx,
    Math.max(0, filteredQuestions.length - 1)
  );
  const currentQuestion = filteredQuestions[safeQuestionIdx] || RELATIVITY_IQ_QUESTIONS[0];

  useEffect(() => {
    if (!isTestStarted || isCompleted) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isTestStarted, isCompleted]);

  // Calculate score & estimated Relativistic IQ
  const totalPossiblePoints = RELATIVITY_IQ_QUESTIONS.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = RELATIVITY_IQ_QUESTIONS.reduce((sum, q) => {
    const chosen = selectedAnswers[q.id];
    return chosen === q.correctIndex ? sum + q.points : sum;
  }, 0);
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = RELATIVITY_IQ_QUESTIONS.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex
  ).length;

  // Calibrated IQ scale: 85 base + up to 80 points from weighted accuracy & speed bonus
  const accuracyRatio = totalPossiblePoints > 0 ? earnedPoints / totalPossiblePoints : 0;
  const speedBonus =
    answeredCount >= RELATIVITY_IQ_QUESTIONS.length && elapsedSeconds < 120
      ? Math.round(Math.max(0, (120 - elapsedSeconds) / 15) * accuracyRatio)
      : 0;
  const estimatedIq =
    answeredCount === 0 ? 100 : Math.min(168, Math.round(88 + accuracyRatio * 74 + speedBonus));

  const getCognitiveClassification = (iq: number): { title: string; badgeColor: string } => {
    if (iq >= 152) {
      return {
        title: 'Kerr-Penrose Singularity Fellow (Top 0.1%)',
        badgeColor: 'text-amber-300 border-amber-400/60 bg-amber-500/20',
      };
    }
    if (iq >= 135) {
      return {
        title: 'Relativistic Tensor Architect (Top 1%)',
        badgeColor: 'text-cyan-300 border-cyan-400/60 bg-cyan-500/20',
      };
    }
    if (iq >= 118) {
      return {
        title: 'Astrophysical Geodesic Analyst',
        badgeColor: 'text-emerald-300 border-emerald-400/60 bg-emerald-500/20',
      };
    }
    return {
      title: 'Orbital Cadet Observer',
      badgeColor: 'text-neutral-300 border-neutral-600 bg-neutral-800',
    };
  };

  const handleStartTest = () => {
    onHapticMedium?.();
    setIsTestStarted(true);
    setIsCompleted(false);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setElapsedSeconds(0);
    setSessionCount((c) => c + 1);
  };

  const handleResetTest = () => {
    onHapticLight?.();
    setIsTestStarted(false);
    setIsCompleted(false);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setElapsedSeconds(0);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (!isTestStarted) {
      setIsTestStarted(true);
      setSessionCount((c) => (c === 0 ? 1 : c));
    }
    const isCorrect = optionIdx === currentQuestion.correctIndex;
    if (isCorrect) {
      onHapticSuccess?.();
    } else {
      onHapticLight?.();
    }
    const nextAnswers = {
      ...selectedAnswers,
      [currentQuestion.id]: optionIdx,
    };
    setSelectedAnswers(nextAnswers);
  };

  const isObsidian = uiTheme === 'kerr_claude';
  const isPlanck = uiTheme === 'cryo_quantum';
  const currentSelectedOption = selectedAnswers[currentQuestion.id];
  const hasAnsweredCurrent = typeof currentSelectedOption === 'number';
  const classification = getCognitiveClassification(estimatedIq);

  return (
    <div
      data-testid="settings-tab-panel-iq-test"
      className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs"
    >
      {/* Top Control Header Card with 'Start Test' Button & Live IQ Telemetry */}
      <div
        className={`p-4 rounded-xl border space-y-3 transition-colors ${
          isObsidian
            ? 'bg-gradient-to-br from-[#16110e] via-[#0d0a09] to-black border-[#D97757]/50 shadow-[0_0_24px_rgba(217,119,87,0.1)]'
            : isPlanck
            ? 'bg-gradient-to-br from-[#07110d] via-[#040605] to-black border-emerald-500/45 shadow-[0_0_24px_rgba(16,185,129,0.1)]'
            : 'bg-gradient-to-br from-[#0e0e11] via-[#050506] to-black border-zinc-500/40 shadow-[0_0_24px_rgba(244,244,245,0.08)]'
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Brain className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                General Relativity &amp; Astrophysics IQ Assessment
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                  isTestStarted
                    ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                    : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                }`}
              >
                {isTestStarted
                  ? isCompleted
                    ? `COMPLETED · IQ ${estimatedIq}`
                    : `SESSION #${sessionCount} ACTIVE`
                  : 'READY · 8 QUESTIONS'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed max-w-md">
              Evaluates quantitative reasoning across Kerr metric geodesics, relativistic Doppler radiative transfer, gravitational time dilation, and black hole thermodynamics.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(isTestStarted || answeredCount > 0) && (
              <button
                type="button"
                data-testid="iq-test-reset-btn"
                onClick={handleResetTest}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-xs cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              data-testid="iq-test-start-btn"
              onClick={handleStartTest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-100 font-mono text-xs font-bold shadow-[0_0_16px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current text-cyan-300" />
              <span>Start Test</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry Strip: Answered Progress, Score, Timer & Estimated Relativistic IQ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 font-mono text-[10px]">
          <div className="p-2 rounded-lg bg-neutral-950/90 border border-neutral-800">
            <span className="text-neutral-400 block text-[9px]">PROGRESS</span>
            <strong className="text-white text-xs">
              {answeredCount} / {RELATIVITY_IQ_QUESTIONS.length} Answered
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-neutral-950/90 border border-neutral-800">
            <span className="text-neutral-400 block text-[9px]">ACCURACY</span>
            <strong className="text-emerald-300 text-xs">
              {correctCount} Correct ({earnedPoints}/{totalPossiblePoints} pts)
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-neutral-950/90 border border-neutral-800">
            <span className="text-neutral-400 block text-[9px]">ELAPSED TIME</span>
            <strong className="text-amber-300 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor(elapsedSeconds / 60)}:
              {(elapsedSeconds % 60).toString().padStart(2, '0')}
            </strong>
          </div>
          <div className="p-2 rounded-lg bg-neutral-950/90 border border-neutral-800">
            <span className="text-neutral-400 block text-[9px]">RELATIVISTIC IQ</span>
            <strong data-testid="iq-test-score-readout" className="text-cyan-300 text-xs">
              {answeredCount > 0 ? `${estimatedIq} IQ` : '100 (Baseline)'}
            </strong>
          </div>
        </div>
      </div>

      {/* Logic Modules & Interactive Assessment Container */}
      <div
        data-testid="iq-test-logic-modules-container"
        role="region"
        aria-label="Relativistic Logic Modules and Assessment Container"
        className="p-4 rounded-xl bg-neutral-950/95 border border-cyan-500/40 space-y-3.5"
      >
        {/* Module Domain Filter Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-neutral-800/90 pb-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-cyan-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Astrophysics &amp; General Relativity Logic Modules</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap font-mono text-[9.5px]">
            {(
              [
                { id: 'ALL', label: `All (${RELATIVITY_IQ_QUESTIONS.length})` },
                { id: 'MOD-01', label: 'MOD-01 · Geodesics' },
                { id: 'MOD-02', label: 'MOD-02 · Tensors' },
                { id: 'MOD-03', label: 'MOD-03 · Chrono' },
                { id: 'MOD-04', label: 'MOD-04 · Horizon' },
              ] as const
            ).map((modTab) => (
              <button
                key={modTab.id}
                type="button"
                data-testid={`iq-module-filter-${modTab.id}`}
                onClick={() => {
                  onHapticLight?.();
                  setActiveModuleFilter(modTab.id);
                  setCurrentQuestionIdx(0);
                }}
                className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  activeModuleFilter === modTab.id
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 font-bold'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {modTab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Final Diagnostic Results Summary Banner (when all questions answered or View Results clicked) */}
        {isCompleted ? (
          <div
            data-testid="iq-test-results-summary"
            className="p-4 rounded-xl bg-gradient-to-br from-[#071926] via-neutral-950 to-neutral-950 border border-cyan-400/60 space-y-3 shadow-[0_0_24px_rgba(6,182,212,0.18)]"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
                    Assessment Complete · Cognitive Telemetry Profile
                  </div>
                  <div className="text-sm sm:text-base font-display font-bold text-white">
                    Estimated Relativistic IQ: <span className="text-amber-300">{estimatedIq}</span>
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg border font-mono text-[10px] font-bold ${classification.badgeColor}`}
              >
                {classification.title}
              </span>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              You answered <strong className="text-emerald-300">{correctCount}</strong> of{' '}
              <strong>{RELATIVITY_IQ_QUESTIONS.length}</strong> relativistic physics questions correctly (
              <strong className="text-amber-300">
                {Math.round((earnedPoints / totalPossiblePoints) * 100)}%
              </strong>{' '}
              weighted score) in{' '}
              <span className="font-mono text-cyan-300">
                {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
              </span>
              .
            </p>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  onHapticLight?.();
                  setIsCompleted(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-xs cursor-pointer"
              >
                Review Questions
              </button>

              <button
                type="button"
                onClick={handleStartTest}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400 text-cyan-100 font-mono text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Assessment</span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Question Stage */
          <div
            data-testid="iq-test-active-question-card"
            className="p-4 rounded-xl bg-neutral-900/75 border border-neutral-800 space-y-3"
          >
            {/* Question Header: Index, Module Badge, Difficulty & Formula Hint */}
            <div className="flex items-center justify-between gap-2 flex-wrap font-mono text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-bold">
                  Question {safeQuestionIdx + 1} of {filteredQuestions.length}
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-amber-300">
                  {currentQuestion.moduleCode} · {currentQuestion.domain}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-emerald-300 font-semibold">
                {currentQuestion.difficulty} · {currentQuestion.points} pts
              </span>
            </div>

            {/* Question Text */}
            <div
              data-testid="iq-question-prompt"
              className="text-xs sm:text-sm font-bold text-white leading-snug"
            >
              {currentQuestion.question}
            </div>

            {/* Relativistic Formula Reference Strip */}
            <div className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800/90 font-mono text-[10.5px] text-cyan-300 flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{currentQuestion.formulaHint}</span>
            </div>

            {/* Multiple Choice Options */}
            <div
              className="space-y-2 pt-1"
              role="radiogroup"
              aria-label={currentQuestion.question}
            >
              {currentQuestion.options.map((optionText, idx) => {
                const isSelected = currentSelectedOption === idx;
                const isCorrectOption = idx === currentQuestion.correctIndex;

                let optionStyle =
                  'bg-neutral-950/90 border-neutral-800 text-neutral-200 hover:border-neutral-700 hover:text-white';
                if (hasAnsweredCurrent) {
                  if (isCorrectOption) {
                    optionStyle =
                      'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.2)]';
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle =
                      'bg-rose-500/20 border-rose-400 text-rose-100';
                  } else {
                    optionStyle = 'bg-neutral-950/50 border-neutral-800/60 text-neutral-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-testid={`iq-option-${idx}`}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${optionStyle}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-neutral-900 border border-neutral-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 text-amber-300">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs leading-relaxed">{optionText}</span>
                    </div>

                    {hasAnsweredCurrent && isCorrectOption && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {hasAnsweredCurrent && isSelected && !isCorrectOption && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Relativistic Physics Explanation Box (Revealed upon selecting an option) */}
            {hasAnsweredCurrent && (
              <div
                data-testid="iq-answer-explanation"
                className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                  currentSelectedOption === currentQuestion.correctIndex
                    ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-100'
                    : 'bg-amber-950/35 border-amber-500/40 text-amber-100'
                }`}
              >
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {currentSelectedOption === currentQuestion.correctIndex
                      ? `Correct (+${currentQuestion.points} pts) — Relativistic Derivation`
                      : 'Incorrect — Relativistic Derivation'}
                  </span>
                </div>
                <p className="text-neutral-200">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Question Navigation Footer: Prev | Question Dots | Next / Finish */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                data-testid="iq-prev-question-btn"
                disabled={safeQuestionIdx === 0}
                onClick={() => {
                  onHapticLight?.();
                  setCurrentQuestionIdx((i) => Math.max(0, i - 1));
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors ${
                  safeQuestionIdx === 0
                    ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {/* Question Number Jump Pills */}
              <div className="flex items-center gap-1 flex-wrap justify-center">
                {filteredQuestions.map((q, idx) => {
                  const isAnswered = typeof selectedAnswers[q.id] === 'number';
                  const isCorrect = selectedAnswers[q.id] === q.correctIndex;
                  const isCurrent = idx === safeQuestionIdx;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      data-testid={`iq-jump-q-${idx}`}
                      onClick={() => {
                        onHapticLight?.();
                        setCurrentQuestionIdx(idx);
                      }}
                      className={`w-6 h-6 rounded-md font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500/30 border-cyan-300 text-white scale-105'
                          : isAnswered
                          ? isCorrect
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title={`Question ${idx + 1}: ${q.domain}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {safeQuestionIdx < filteredQuestions.length - 1 ? (
                <button
                  type="button"
                  data-testid="iq-next-question-btn"
                  onClick={() => {
                    onHapticLight?.();
                    setCurrentQuestionIdx((i) =>
                      Math.min(filteredQuestions.length - 1, i + 1)
                    );
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-100 font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="iq-finish-btn"
                  onClick={() => {
                    onHapticSuccess?.();
                    setIsCompleted(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400 text-amber-100 font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Complete Test</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
