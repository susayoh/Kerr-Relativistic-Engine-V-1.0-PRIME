import React, { useState } from 'react';
import {
  Columns2,
  ArrowLeftRight,
  Lock,
  Unlock,
  X,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  DerivedRelativisticMetrics,
} from '../physics/gravitationalPhysics';

interface CompareModeOverlayProps {
  presetAId: string;
  presetBId: string;
  paramsA: BlackHoleParams;
  paramsB: BlackHoleParams;
  metricsA: DerivedRelativisticMetrics;
  metricsB: DerivedRelativisticMetrics;
  syncSpinInCompare: boolean;
  onToggleSyncSpin: () => void;
  onSelectPresetA: (presetId: string) => void;
  onSelectPresetB: (presetId: string) => void;
  onChangeSpinA: (spin: number) => void;
  onChangeSpinB: (spin: number) => void;
  onApplySpinContrastPreset: (spinA: number, spinB: number) => void;
  onSwapPresets: () => void;
  onCloseCompare: () => void;
  isPhoneMode?: boolean;
}

type DeltaChartViewMode = 'bars' | 'diverging';

interface RelativisticMetricDeltaItem {
  id: string;
  label: string;
  symbol: string;
  unit: string;
  valA: number;
  valB: number;
  maxScale: number;
  decimals: number;
  description: string;
}

/**
 * Computes the exact Bardeen-Press-Teukolsky radiative accretion efficiency
 * eta = 1 - E_ISCO at the prograde ISCO for dimensionless spin a* in [0, 0.9999].
 */
function computeRadiativeEfficiencyPct(iscoRg: number, spin: number): number {
  const r = Math.max(1.0001, iscoRg);
  const a = Math.min(0.9999, Math.max(0, spin));
  const rSqrt = Math.sqrt(r);
  const r32 = r * rSqrt;
  const num = 1.0 - 2.0 / r + a / r32;
  const denSqrtArg = Math.max(1e-6, 1.0 - 3.0 / r + (2.0 * a) / r32);
  const eIsco = num / Math.sqrt(denSqrtArg);
  const eta = Math.max(0.057, Math.min(0.423, 1.0 - eIsco));
  return eta * 100;
}

export const CompareModeOverlay: React.FC<CompareModeOverlayProps> = ({
  presetAId,
  presetBId,
  paramsA,
  paramsB,
  metricsA,
  metricsB,
  syncSpinInCompare,
  onToggleSyncSpin,
  onSelectPresetA,
  onSelectPresetB,
  onChangeSpinA,
  onChangeSpinB,
  onApplySpinContrastPreset,
  onSwapPresets,
  onCloseCompare,
  isPhoneMode = false,
}) => {
  const [showDeltaChart, setShowDeltaChart] = useState<boolean>(false);
  const [chartViewMode, setChartViewMode] = useState<DeltaChartViewMode>('bars');

  const presetA =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === presetAId) || ASTROPHYSICAL_PRESETS[0];
  const presetB =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === presetBId) || ASTROPHYSICAL_PRESETS[1];

  const rPlusARs = metricsA.eventHorizonRg * 0.5;
  const rPlusBRs = metricsB.eventHorizonRg * 0.5;
  const iscoARs = metricsA.iscoProgradeRg * 0.5;
  const iscoBRs = metricsB.iscoProgradeRg * 0.5;
  const photonARs = metricsA.photonSphereRg * 0.5;
  const photonBRs = metricsB.photonSphereRg * 0.5;

  const effAPct = computeRadiativeEfficiencyPct(metricsA.iscoProgradeRg, paramsA.spin);
  const effBPct = computeRadiativeEfficiencyPct(metricsB.iscoProgradeRg, paramsB.spin);

  const timeDilAPct = metricsA.probeTimeDilationFactor * 100;
  const timeDilBPct = metricsB.probeTimeDilationFactor * 100;

  const deltaHorizonPct = Math.abs(((rPlusBRs - rPlusARs) / Math.max(0.1, rPlusARs)) * 100);
  const deltaIscoRs = Math.abs(iscoARs - iscoBRs);
  const deltaOmega = Math.abs(metricsA.frameDraggingOmega - metricsB.frameDraggingOmega);

  const deltaItems: RelativisticMetricDeltaItem[] = [
    {
      id: 'horizon',
      label: 'Event Horizon Radius',
      symbol: 'r₊',
      unit: 'Rₛ',
      valA: rPlusARs,
      valB: rPlusBRs,
      maxScale: 1.0,
      decimals: 3,
      description: 'Outer Kerr horizon r₊ = ½[1 + √(1 − a*²)] Rₛ',
    },
    {
      id: 'isco',
      label: 'Prograde ISCO Radius',
      symbol: 'r_ISCO',
      unit: 'Rₛ',
      valA: iscoARs,
      valB: iscoBRs,
      maxScale: 3.0,
      decimals: 3,
      description: 'Innermost stable circular orbit (3.00 Rₛ → 0.50 Rₛ)',
    },
    {
      id: 'photon',
      label: 'Photon Sphere Orbit',
      symbol: 'r_ph',
      unit: 'Rₛ',
      valA: photonARs,
      valB: photonBRs,
      maxScale: 1.5,
      decimals: 3,
      description: 'Prograde unstable circular light ring radius',
    },
    {
      id: 'omega',
      label: 'Frame-Dragging Rate',
      symbol: 'Ω_H',
      unit: 'c/R_g',
      valA: metricsA.frameDraggingOmega,
      valB: metricsB.frameDraggingOmega,
      maxScale: 0.5,
      decimals: 3,
      description: 'Spacetime angular velocity at the event horizon',
    },
    {
      id: 'efficiency',
      label: 'Accretion Efficiency',
      symbol: 'η_rad',
      unit: '%',
      valA: effAPct,
      valB: effBPct,
      maxScale: 35.0,
      decimals: 2,
      description: 'Mass-to-energy conversion efficiency at ISCO (1 − E_ISCO)',
    },
    {
      id: 'timedilation',
      label: 'Probe Clock Rate',
      symbol: 'dτ/dt',
      unit: '%',
      valA: timeDilAPct,
      valB: timeDilBPct,
      maxScale: 100.0,
      decimals: 1,
      description: `Proper time rate at r = ${paramsA.probeRadiusRs.toFixed(1)} Rₛ relative to infinity`,
    },
  ];

  // Physical mass ratio telemetry
  const massA = Math.max(1e-9, presetA.trueMassSolar || paramsA.massSolar);
  const massB = Math.max(1e-9, presetB.trueMassSolar || paramsB.massSolar);
  const logMassDelta = Math.log10(massB) - Math.log10(massA);
  const massRatio = massA >= massB ? massA / massB : massB / massA;
  const heavierLabel = massA >= massB ? `A (${presetA.name})` : `B (${presetB.name})`;

  // SVG Radial Diagram scale: map 0..3.2 Rs -> 0..76 px radius
  const svgCenterX = 120;
  const svgCenterY = 98;
  const rsToPx = (rs: number) => Math.max(6, Math.min(78, (rs / 3.15) * 76));

  const semiArcPath = (radiusPx: number, side: 'left' | 'right') => {
    const r = Math.max(2, radiusPx);
    // From top (cx, cy - r) to bottom (cx, cy + r)
    // In SVG: sweep-flag=0 draws counter-clockwise (left semicircle), sweep-flag=1 draws clockwise (right semicircle)
    const sweep = side === 'left' ? 0 : 1;
    return `M ${svgCenterX} ${svgCenterY - r} A ${r} ${r} 0 0 ${sweep} ${svgCenterX} ${svgCenterY + r}`;
  };

  const semiDiscPath = (radiusPx: number, side: 'left' | 'right') => {
    const r = Math.max(2, radiusPx);
    const sweep = side === 'left' ? 0 : 1;
    return `M ${svgCenterX} ${svgCenterY - r} A ${r} ${r} 0 0 ${sweep} ${svgCenterX} ${svgCenterY + r} Z`;
  };

  return (
    <div
      data-testid="compare-mode-overlay"
      className="hud-panel absolute top-2 left-2 right-2 z-20 pointer-events-none flex flex-col gap-2 select-none"
    >
      {/* Top Dual-Target Synchronized Comparison Control Bar */}
      <div className="hud-panel pointer-events-auto mx-auto w-full max-w-6xl bg-[#050812]/95 border border-amber-500/40 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.85)] px-3 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-2.5 items-center">
          {/* LEFT: Viewport A Preset & Kerr Spin Controls (4 cols) */}
          <div className="lg:col-span-4 bg-neutral-950/90 border border-amber-500/35 rounded-lg p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  VIEWPORT A
                </span>
                <select
                  aria-label="Compare Viewport A Preset"
                  data-testid="compare-select-preset-a"
                  value={presetAId}
                  onChange={(e) => onSelectPresetA(e.target.value)}
                  className="bg-neutral-900 border border-slate-700 text-white text-xs font-display font-bold rounded px-2 py-0.5 cursor-pointer outline-none focus:border-amber-400 truncate"
                >
                  {ASTROPHYSICAL_PRESETS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-neutral-950 text-white">
                      {p.name} ({p.plainMassExplanation})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[10px] font-mono text-amber-300 font-bold shrink-0">
                {presetA.realMassSolarDisplay}
              </span>
            </div>

            {/* Viewport A Spin Scrubber */}
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-slate-400 shrink-0">Spin a* (A):</span>
              <input
                type="range"
                aria-label="Viewport A Kerr Spin"
                min={0.0}
                max={0.998}
                step={0.002}
                value={paramsA.spin}
                onChange={(e) => onChangeSpinA(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-amber-400"
              />
              <span className="text-amber-300 font-bold w-11 text-right tabular-nums">
                {paramsA.spin.toFixed(3)}
              </span>
            </div>

            {/* Viewport A Live Metric Strip */}
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80 font-mono text-[9.5px] tabular-nums">
              <div>
                <span className="text-slate-500 block text-[8px]">HORIZON r₊</span>
                <strong className="text-amber-200">{rPlusARs.toFixed(3)} Rₛ</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px]">PROGRADE ISCO</span>
                <strong className="text-cyan-300">{iscoARs.toFixed(3)} Rₛ</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px]">FRAME-DRAG Ω_H</span>
                <strong className="text-purple-300">
                  {metricsA.frameDraggingOmega.toFixed(3)} c/R_g
                </strong>
              </div>
            </div>
          </div>

          {/* CENTER: Synchronized Physics Bridge, Spin Contrast & Delta Chart Toggle (3 cols) */}
          <div className="lg:col-span-3 flex flex-col items-center justify-between gap-1.5 bg-neutral-950/80 border border-slate-800 rounded-lg p-2 font-mono text-[10px]">
            <div className="flex items-center justify-between w-full gap-1">
              <span className="inline-flex items-center gap-1 text-emerald-300 font-bold text-[9.5px]">
                <Columns2 className="w-3 h-3 text-emerald-400" />
                COMPARE MODE
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onSwapPresets}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Swap Viewport A and Viewport B"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={onCloseCompare}
                  className="p-1 rounded bg-neutral-900 hover:bg-rose-950 border border-slate-700 text-slate-400 hover:text-rose-300 cursor-pointer"
                  title="Exit Side-by-Side Compare Mode"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick Spin Contrast & Delta Chart Toggle Buttons */}
            <div className="flex items-center justify-center gap-1 w-full flex-wrap">
              <button
                type="button"
                onClick={() => onApplySpinContrastPreset(0.0, 0.998)}
                className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[9px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                title="Set Viewport A to Schwarzschild (a*=0.000) and Viewport B to Max Kerr (a*=0.998)"
              >
                a*=0.00 vs 0.998
              </button>

              <button
                type="button"
                onClick={onToggleSyncSpin}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  syncSpinInCompare
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-neutral-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle whether Kerr Spin a* is locked 1:1 or independent for contrasting spin effects"
              >
                {syncSpinInCompare ? (
                  <>
                    <Lock className="w-2.5 h-2.5" />
                    <span>Spin Synced</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-2.5 h-2.5 text-amber-400" />
                    <span>Independent Spin</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="toggle-compare-delta-chart"
                aria-pressed={showDeltaChart}
                aria-label="Toggle Relativistic Metrics Delta Chart"
                onClick={() => setShowDeltaChart((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded border text-[9px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  showDeltaChart
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-emerald-500/40 text-emerald-300 hover:text-emerald-200'
                }`}
                title="Toggle Relativistic Metrics Delta Chart comparing Event Horizon, ISCO, Photon Sphere, Frame-Dragging, and Efficiency"
              >
                <BarChart3 className="w-2.5 h-2.5 text-emerald-400" />
                <span>Delta Chart</span>
                {showDeltaChart ? (
                  <ChevronUp className="w-2.5 h-2.5" />
                ) : (
                  <ChevronDown className="w-2.5 h-2.5" />
                )}
              </button>
            </div>

            {/* Live Kerr Spin Differential Telemetry */}
            {!isPhoneMode && (
              <div className="w-full pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-300 tabular-nums">
                <span>
                  Δr₊: <strong className="text-amber-300">{deltaHorizonPct.toFixed(1)}%</strong>
                </span>
                <span>
                  ΔISCO: <strong className="text-cyan-300">{deltaIscoRs.toFixed(2)} Rₛ</strong>
                </span>
                <span>
                  ΔΩ_H: <strong className="text-purple-300">{deltaOmega.toFixed(3)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: Viewport B Preset & Kerr Spin Controls (4 cols) */}
          <div className="lg:col-span-4 bg-neutral-950/90 border border-cyan-500/35 rounded-lg p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                  VIEWPORT B
                </span>
                <select
                  aria-label="Compare Viewport B Preset"
                  data-testid="compare-select-preset-b"
                  value={presetBId}
                  onChange={(e) => onSelectPresetB(e.target.value)}
                  className="bg-neutral-900 border border-slate-700 text-white text-xs font-display font-bold rounded px-2 py-0.5 cursor-pointer outline-none focus:border-cyan-400 truncate"
                >
                  {ASTROPHYSICAL_PRESETS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-neutral-950 text-white">
                      {p.name} ({p.plainMassExplanation})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 font-bold shrink-0">
                {presetB.realMassSolarDisplay}
              </span>
            </div>

            {/* Viewport B Spin Scrubber */}
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-slate-400 shrink-0">Spin a* (B):</span>
              <input
                type="range"
                aria-label="Viewport B Kerr Spin"
                min={0.0}
                max={0.998}
                step={0.002}
                value={paramsB.spin}
                onChange={(e) => onChangeSpinB(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-cyan-300 font-bold w-11 text-right tabular-nums">
                {paramsB.spin.toFixed(3)}
              </span>
            </div>

            {/* Viewport B Live Metric Strip */}
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80 font-mono text-[9.5px] tabular-nums">
              <div>
                <span className="text-slate-500 block text-[8px]">HORIZON r₊</span>
                <strong className="text-amber-200">{rPlusBRs.toFixed(3)} Rₛ</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px]">PROGRADE ISCO</span>
                <strong className="text-cyan-300">{iscoBRs.toFixed(3)} Rₛ</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[8px]">FRAME-DRAG Ω_H</span>
                <strong className="text-purple-300">
                  {metricsB.frameDraggingOmega.toFixed(3)} c/R_g
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Relativistic Metrics Delta Chart Panel */}
      {showDeltaChart && (
        <div
          data-testid="compare-delta-chart-panel"
          className="hud-panel pointer-events-auto mx-auto w-full max-w-6xl bg-[#050812]/95 border border-emerald-500/40 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.9)] p-3 font-mono text-xs max-h-[66vh] overflow-y-auto custom-scrollbar"
        >
          {/* Chart Header & Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Relativistic Metrics Delta Chart</span>
              </div>
              <span className="hidden sm:inline text-slate-600">·</span>
              <div className="hidden sm:flex items-center gap-3 text-[10px] tabular-nums">
                <span className="text-amber-300">
                  A: {presetA.name} (a*={paramsA.spin.toFixed(3)})
                </span>
                <span className="text-slate-500">vs</span>
                <span className="text-cyan-300">
                  B: {presetB.name} (a*={paramsB.spin.toFixed(3)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 p-0.5 bg-neutral-950 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setChartViewMode('bars')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    chartViewMode === 'bars'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dual Scale Bars
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('diverging')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    chartViewMode === 'diverging'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Diverging Δ% (B − A)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDeltaChart(false)}
                aria-label="Close Relativistic Metrics Delta Chart"
                className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                title="Hide Delta Chart"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Chart Grid: Left 7 cols = 6-Metric Bar & Delta Matrix, Right 5 cols = Radial Geometry SVG + Mass Ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2.5 items-stretch">
            {/* LEFT: 6-Metric Quantitative Comparison & Delta Bars */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {deltaItems.map((item) => {
                const rawDelta = item.valB - item.valA;
                const baseline = Math.max(1e-4, Math.abs(item.valA));
                const rawPctDelta =
                  Math.abs(item.valA) < 1e-4 && Math.abs(item.valB) < 1e-4
                    ? 0
                    : ((item.valB - item.valA) / Math.max(0.05, baseline)) * 100;
                const clampedPctBar = Math.max(-100, Math.min(100, rawPctDelta));

                const pctWidthA = Math.max(3, Math.min(100, (item.valA / item.maxScale) * 100));
                const pctWidthB = Math.max(3, Math.min(100, (item.valB / item.maxScale) * 100));
                const isZeroDelta = Math.abs(rawDelta) < 1e-4;

                return (
                  <div
                    key={item.id}
                    data-testid={`delta-metric-${item.id}`}
                    className="bg-neutral-950/90 border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10.5px] font-bold text-slate-100">
                          {item.label}
                        </span>
                        <span className="text-[9.5px] text-slate-400 ml-1.5">
                          ({item.symbol})
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold tabular-nums shrink-0 ${
                          isZeroDelta
                            ? 'text-slate-400'
                            : rawDelta > 0
                            ? 'text-cyan-300'
                            : 'text-amber-300'
                        }`}
                      >
                        Δ {rawDelta >= 0 ? '+' : ''}
                        {rawDelta.toFixed(item.decimals)} {item.unit} (
                        {rawPctDelta >= 0 ? '+' : ''}
                        {rawPctDelta.toFixed(1)}%)
                      </span>
                    </div>

                    {chartViewMode === 'bars' ? (
                      <div className="space-y-1">
                        {/* Viewport A Bar */}
                        <div className="flex items-center gap-2 text-[9.5px] tabular-nums">
                          <span className="w-4 text-amber-300 font-bold shrink-0">A</span>
                          <div className="flex-1 h-2 bg-neutral-900 rounded-sm overflow-hidden border border-slate-800/80">
                            <div
                              className="h-full bg-amber-400/90 transition-all duration-150"
                              style={{ width: `${pctWidthA}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-amber-200 font-semibold shrink-0">
                            {item.valA.toFixed(item.decimals)} {item.unit}
                          </span>
                        </div>

                        {/* Viewport B Bar */}
                        <div className="flex items-center gap-2 text-[9.5px] tabular-nums">
                          <span className="w-4 text-cyan-300 font-bold shrink-0">B</span>
                          <div className="flex-1 h-2 bg-neutral-900 rounded-sm overflow-hidden border border-slate-800/80">
                            <div
                              className="h-full bg-cyan-400/90 transition-all duration-150"
                              style={{ width: `${pctWidthB}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-cyan-200 font-semibold shrink-0">
                            {item.valB.toFixed(item.decimals)} {item.unit}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Diverging Zero-Axis Percentage Delta Bar (B relative to A) */
                      <div className="space-y-1 py-0.5">
                        <div className="relative h-3.5 bg-neutral-900 rounded-sm border border-slate-800 overflow-hidden flex items-center">
                          {/* Center 0% Meridian */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500 z-10" />
                          {clampedPctBar < 0 && (
                            <div
                              className="absolute right-1/2 top-0.5 bottom-0.5 bg-amber-400/85 rounded-l-sm transition-all duration-150"
                              style={{ width: `${Math.abs(clampedPctBar) * 0.5}%` }}
                            />
                          )}
                          {clampedPctBar > 0 && (
                            <div
                              className="absolute left-1/2 top-0.5 bottom-0.5 bg-cyan-400/85 rounded-r-sm transition-all duration-150"
                              style={{ width: `${Math.abs(clampedPctBar) * 0.5}%` }}
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 tabular-nums">
                          <span className="text-amber-300/90">
                            A: {item.valA.toFixed(item.decimals)} {item.unit}
                          </span>
                          <span>0% Δ</span>
                          <span className="text-cyan-300/90">
                            B: {item.valB.toFixed(item.decimals)} {item.unit}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-[8.5px] text-slate-500 truncate">{item.description}</div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT: Split-Horizon Concentric Radial Geometry SVG + Physical Scale Comparison */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-2 bg-neutral-950/90 border border-slate-800/90 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-200">
                  Split-Meridian Kerr Radii Cross-Section (Rₛ)
                </span>
                <span className="text-[9px] text-slate-400">
                  Left: A (Amber) · Right: B (Cyan)
                </span>
              </div>

              {/* SVG Concentric Split Comparison of Event Horizon, Photon Sphere, Ergosphere & ISCO */}
              <div className="flex items-center justify-center bg-[#03050a] border border-slate-800/80 rounded-lg py-1">
                <svg
                  viewBox="0 0 240 196"
                  className="w-full max-w-[270px] h-[168px]"
                  role="img"
                  aria-label="Split-meridian radial geometry comparison of Event Horizon, Photon Sphere, Ergosphere, and ISCO between Viewport A and Viewport B"
                >
                  {/* Reference 1 Rs, 2 Rs, 3 Rs faint guide circles */}
                  {[1.0, 2.0, 3.0].map((guideRs) => (
                    <circle
                      key={guideRs}
                      cx={svgCenterX}
                      cy={svgCenterY}
                      r={rsToPx(guideRs)}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="0.75"
                      strokeDasharray="2 2"
                    />
                  ))}

                  {/* Left Semicircle (Viewport A): ISCO, Ergosphere (1.0 Rs), Photon Sphere, Event Horizon */}
                  <path
                    d={semiArcPath(rsToPx(iscoARs), 'left')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                  />
                  <path
                    d={semiArcPath(rsToPx(1.0), 'left')}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  <path
                    d={semiArcPath(rsToPx(photonARs), 'left')}
                    fill="none"
                    stroke="#fde047"
                    strokeWidth="1.4"
                    strokeDasharray="1.5 1.5"
                  />
                  <path
                    d={semiDiscPath(rsToPx(rPlusARs), 'left')}
                    fill="rgba(245, 158, 11, 0.28)"
                    stroke="#fbbf24"
                    strokeWidth="1.8"
                  />

                  {/* Right Semicircle (Viewport B): ISCO, Ergosphere (1.0 Rs), Photon Sphere, Event Horizon */}
                  <path
                    d={semiArcPath(rsToPx(iscoBRs), 'right')}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                  />
                  <path
                    d={semiArcPath(rsToPx(1.0), 'right')}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                  />
                  <path
                    d={semiArcPath(rsToPx(photonBRs), 'right')}
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="1.4"
                    strokeDasharray="1.5 1.5"
                  />
                  <path
                    d={semiDiscPath(rsToPx(rPlusBRs), 'right')}
                    fill="rgba(6, 182, 212, 0.28)"
                    stroke="#22d3ee"
                    strokeWidth="1.8"
                  />

                  {/* Central Singularity & Split Meridian Divider */}
                  <line
                    x1={svgCenterX}
                    y1={12}
                    x2={svgCenterX}
                    y2={184}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <circle cx={svgCenterX} cy={svgCenterY} r={2.5} fill="#ffffff" />

                  {/* Corner Annotations */}
                  <text x={10} y={18} fill="#fcd34d" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                    A: a*={paramsA.spin.toFixed(3)}
                  </text>
                  <text x={10} y={30} fill="#fde68a" fontSize="8" fontFamily="monospace">
                    ISCO: {iscoARs.toFixed(2)} Rₛ
                  </text>
                  <text x={10} y={41} fill="#fde68a" fontSize="8" fontFamily="monospace">
                    r₊: {rPlusARs.toFixed(2)} Rₛ
                  </text>

                  <text
                    x={230}
                    y={18}
                    textAnchor="end"
                    fill="#67e8f9"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    B: a*={paramsB.spin.toFixed(3)}
                  </text>
                  <text x={230} y={30} textAnchor="end" fill="#a5f3fc" fontSize="8" fontFamily="monospace">
                    ISCO: {iscoBRs.toFixed(2)} Rₛ
                  </text>
                  <text x={230} y={41} textAnchor="end" fill="#a5f3fc" fontSize="8" fontFamily="monospace">
                    r₊: {rPlusBRs.toFixed(2)} Rₛ
                  </text>

                  {/* Legend at bottom of SVG */}
                  <text x={120} y={191} textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">
                    Solid Outer: ISCO · Dotted: Photon Ring · Purple: Ergosphere · Filled Core: r₊
                  </text>
                </svg>
              </div>

              {/* Physical Scale & Mass Ratio Summary */}
              <div className="pt-1.5 border-t border-slate-800/80 space-y-1 text-[9.5px] tabular-nums">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Physical Horizon Scale:</span>
                  <span className="text-slate-200">
                    <strong className="text-amber-300">{presetA.horizonDiameterKmDisplay}</strong>
                    {' vs '}
                    <strong className="text-cyan-300">{presetB.horizonDiameterKmDisplay}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Astrophysical Mass Delta:</span>
                  <span>
                    Δlog₁₀(M☉) ={' '}
                    <strong className="text-emerald-300">
                      {logMassDelta >= 0 ? '+' : ''}
                      {logMassDelta.toFixed(2)} dex
                    </strong>{' '}
                    ({massRatio < 1000 ? `${massRatio.toFixed(1)}×` : `${massRatio.toExponential(2)}×`} ·{' '}
                    {heavierLabel})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
