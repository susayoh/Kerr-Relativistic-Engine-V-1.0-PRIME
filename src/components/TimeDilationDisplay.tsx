import React, { useEffect, useState, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp, Activity, Sparkles } from 'lucide-react';
import {
  DetailedTimeDilationMetrics,
  computeDetailedTimeDilation,
} from '../physics/gravitationalPhysics';

interface TimeDilationDisplayProps {
  probeRadiusRs: number;
  spin: number;
  timeScale: number;
  onSetProbeRadius?: (radiusRs: number) => void;
}

export const TimeDilationDisplay: React.FC<TimeDilationDisplayProps> = ({
  probeRadiusRs,
  spin,
  timeScale,
  onSetProbeRadius,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Live calculated metrics
  const dilation: DetailedTimeDilationMetrics = computeDetailedTimeDilation(probeRadiusRs, spin);

  // Real-time animated clocks state
  // Coordinate time (t) in seconds, proper time (tau) in seconds
  const [clockState, setClockState] = useState<{
    tSeconds: number;
    tauSeconds: number;
  }>({
    tSeconds: 0,
    tauSeconds: 0,
  });

  const lastAnimTimeRef = useRef<number>(performance.now());
  const tSecRef = useRef<number>(0);
  const tauSecRef = useRef<number>(0);

  // Synchronized animation loop: Coordinate clock (t) ticks at 1.0, Probe clock (tau) ticks at dtau/dt
  useEffect(() => {
    let animId = 0;
    let lastRenderUpdate = 0;

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const deltaMs = Math.min(100, now - lastAnimTimeRef.current);
      lastAnimTimeRef.current = now;

      const deltaSec = (deltaMs / 1000) * timeScale;
      tSecRef.current += deltaSec;
      // Proper time accumulates at rate dtau/dt
      tauSecRef.current += deltaSec * dilation.dtau_dt;

      // Throttle React state update to ~20fps for smooth digital counters
      if (now - lastRenderUpdate > 50) {
        lastRenderUpdate = now;
        setClockState({
          tSeconds: tSecRef.current,
          tauSeconds: tauSecRef.current,
        });
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [timeScale, dilation.dtau_dt]);

  // Format seconds to HH:MM:SS.s
  const formatClock = (totalSec: number) => {
    const s = Math.floor(totalSec);
    const ms = Math.floor((totalSec % 1) * 10);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Severity color based on dilation magnitude
  const severityColor =
    dilation.dt_dtau < 1.25
      ? 'text-emerald-400'
      : dilation.dt_dtau < 2.5
      ? 'text-amber-400'
      : 'text-rose-400';

  const severityBg =
    dilation.dt_dtau < 1.25
      ? 'border-emerald-500/30 bg-emerald-950/20'
      : dilation.dt_dtau < 2.5
      ? 'border-amber-500/30 bg-amber-950/20'
      : 'border-rose-500/30 bg-rose-950/20';

  return (
    <div className="w-80 bg-[#080c16]/95 border border-slate-800 rounded-lg shadow-xl overflow-hidden pointer-events-auto select-none transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0b101e] border-b border-slate-800/90">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <div>
            <h3 className="font-display text-xs font-semibold text-slate-100 uppercase tracking-wide">
              Time Dilation (Star S2)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500">dt/dτ</span>
          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            className="p-1 text-slate-400 hover:text-slate-100 bg-[#111827] rounded border border-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Time Dilation Display' : 'Collapse Display'}
            aria-label={isCollapsed ? 'Expand Time Dilation Display' : 'Collapse Display'}
          >
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3">
          {/* Primary Factor Hero */}
          <div className={`p-3 rounded-md border ${severityBg} transition-colors`}>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Coordinate Dilation Factor (dt / dτ)
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                r = {dilation.probeRadiusRs.toFixed(2)} Rₛ
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-3xl font-mono font-bold tabular-nums ${severityColor}`}>
                {dilation.dt_dtau.toFixed(3)}
              </span>
              <span className="text-xs uppercase font-mono text-slate-400">
                × slower
              </span>
            </div>

            {/* Unboxed sub-metrics */}
            <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono text-slate-400 tabular-nums">
              <span>dτ/dt = <strong className="text-slate-200">{dilation.dtau_dt.toFixed(3)}</strong></span>
              <span aria-hidden="true">·</span>
              <span>z = <strong className="text-cyan-400">+{dilation.redshiftZ.toFixed(3)}</strong></span>
              <span aria-hidden="true">·</span>
              <span>v/c = <strong className="text-amber-400">{(dilation.orbitalBeta * 100).toFixed(1)}%</strong></span>
            </div>

            {/* Human Equivalency Prose */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-amber-300/90 leading-tight">
              {dilation.humanEquivalence}
            </div>
          </div>

          {/* Synchronized Real-Time Comparative Clocks */}
          <div className="p-2.5 bg-[#0a0f1d] border border-slate-800/80 rounded-md space-y-2 font-mono tabular-nums">
            <div className="text-[10px] uppercase text-slate-400 flex items-center justify-between">
              <span>Synchronized Clock Rates</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live Feed
              </span>
            </div>

            {/* Distant Observer Clock */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
              <div className="flex flex-col">
                <span className="text-slate-400 font-medium">Distant Observer (t)</span>
                <span className="text-[9px] text-slate-500">Asymptotic Infinity (1.000 s/s)</span>
              </div>
              <span className="font-semibold text-slate-100 text-sm">
                {formatClock(clockState.tSeconds)}
              </span>
            </div>

            {/* Star S2 Chronometer */}
            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex flex-col">
                <span className="text-amber-400 font-medium">Star S2 Worldline (τ)</span>
                <span className="text-[9px] text-slate-500">
                  Proper Time ({dilation.dtau_dt.toFixed(3)} s/s)
                </span>
              </div>
              <span className="font-semibold text-amber-300 text-sm">
                {formatClock(clockState.tauSeconds)}
              </span>
            </div>

            {/* Relative Clock Pulse Visualizer Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Clock Progress Ratio (dτ / dt)</span>
                <span>{(dilation.dtau_dt * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-amber-500 to-cyan-400 h-full transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.max(2, dilation.dtau_dt * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Relativistic Physics Component Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 bg-[#090e1c] border border-slate-800/70 rounded">
              <span className="text-slate-500 block text-[9px] uppercase">
                Gravitational (g₀₀)
              </span>
              <span className="text-slate-200 font-semibold">
                {dilation.gravitationalFactor.toFixed(3)}×
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Spacetime Curvature
              </span>
            </div>

            <div className="p-2 bg-[#090e1c] border border-slate-800/70 rounded">
              <span className="text-slate-500 block text-[9px] uppercase">
                Kinematic (γ_Lorentz)
              </span>
              <span className="text-cyan-400 font-semibold">
                {dilation.kinematicFactor.toFixed(3)}×
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Orbital Speed
              </span>
            </div>
          </div>

          {/* Quick Orbital Distance Quick-Scrubber */}
          {onSetProbeRadius && (
            <div className="pt-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Adjust Star S2 Radius</span>
                <span className="text-amber-400 font-semibold">
                  {probeRadiusRs.toFixed(2)} Rₛ
                </span>
              </div>
              <input
                type="range"
                min={1.25}
                max={6.5}
                step={0.05}
                value={probeRadiusRs}
                onChange={(e) => onSetProbeRadius(parseFloat(e.target.value))}
                className="sci-slider w-full"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                <span>Near ISCO (High Dilation)</span>
                <span>Asymptotic (Weak Dilation)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
