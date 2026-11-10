import React from 'react';
import {
  Columns2,
  ArrowLeftRight,
  Lock,
  Unlock,
  Sparkles,
  X,
  Activity,
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
  const presetA =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === presetAId) || ASTROPHYSICAL_PRESETS[0];
  const presetB =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === presetBId) || ASTROPHYSICAL_PRESETS[1];

  const rPlusARs = metricsA.eventHorizonRg * 0.5;
  const rPlusBRs = metricsB.eventHorizonRg * 0.5;
  const iscoARs = metricsA.iscoProgradeRg * 0.5;
  const iscoBRs = metricsB.iscoProgradeRg * 0.5;

  const deltaHorizonPct = Math.abs(((rPlusBRs - rPlusARs) / Math.max(0.1, rPlusARs)) * 100);
  const deltaIscoRs = Math.abs(iscoARs - iscoBRs);
  const deltaOmega = Math.abs(metricsA.frameDraggingOmega - metricsB.frameDraggingOmega);

  return (
    <div
      data-testid="compare-mode-overlay"
      className="absolute top-2 left-2 right-2 z-20 pointer-events-none flex flex-col gap-2 select-none"
    >
      {/* Top Dual-Target Synchronized Comparison Control Bar */}
      <div className="pointer-events-auto mx-auto w-full max-w-6xl bg-[#050812]/95 border border-amber-500/40 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.85)] backdrop-blur-md px-3 py-2">
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

          {/* CENTER: Synchronized Physics Bridge & Kerr Spin Contrast Presets (3 cols) */}
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

            {/* Quick Spin Contrast Action Buttons */}
            <div className="flex items-center justify-center gap-1 w-full flex-wrap">
              <button
                type="button"
                onClick={() => onApplySpinContrastPreset(0.0, 0.998)}
                className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[9px] font-bold cursor-pointer transition-colors"
                title="Set Viewport A to Schwarzschild (a*=0.000) and Viewport B to Max Kerr (a*=0.998)"
              >
                a*=0.00 vs 0.998
              </button>

              <button
                type="button"
                onClick={onToggleSyncSpin}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-semibold cursor-pointer transition-colors ${
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
    </div>
  );
};
