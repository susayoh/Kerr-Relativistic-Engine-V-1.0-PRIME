import React, { useEffect, useState, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  DetailedTimeDilationMetrics,
  computeDetailedTimeDilation,
} from '../physics/gravitationalPhysics';

interface TimeDilationDisplayProps {
  probeRadiusRs: number;
  spin: number;
  timeScale: number;
  onSetProbeRadius?: (radiusRs: number) => void;
  initialCollapsed?: boolean;
}

export const TimeDilationDisplay: React.FC<TimeDilationDisplayProps> = ({
  probeRadiusRs,
  spin,
  timeScale,
  onSetProbeRadius,
  initialCollapsed = true,
}) => {
  // Collapsed initially by default as requested to prevent annoyance and visual clutter
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initialCollapsed);

  // Live calculated metrics
  const dilation: DetailedTimeDilationMetrics = computeDetailedTimeDilation(probeRadiusRs, spin);

  // Synchronized animated clocks
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

  useEffect(() => {
    let animId = 0;
    let lastRenderUpdate = 0;

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const deltaMs = Math.min(100, now - lastAnimTimeRef.current);
      lastAnimTimeRef.current = now;

      const deltaSec = (deltaMs / 1000) * timeScale;
      tSecRef.current += deltaSec;
      tauSecRef.current += deltaSec * dilation.dtau_dt;

      if (now - lastRenderUpdate > 65) {
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

  // Format seconds to simple MM:SS
  const formatClock = (totalSec: number) => {
    const s = Math.floor(totalSec);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If collapsed, show a tiny non-intrusive pill
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#050811]/90 backdrop-blur-md border border-slate-800/80 rounded-lg shadow-lg hover:border-amber-500/40 hover:bg-slate-900/90 transition-all text-xs font-mono cursor-pointer group"
        title="Click to view time dilation details"
      >
        <Clock className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span className="text-slate-300">1 hr here =</span>
        <span className="text-amber-400 font-bold">{dilation.dt_dtau.toFixed(1)} hrs on Earth</span>
        <span className="text-slate-500 text-[10px] flex items-center gap-0.5">
          [Expand <ChevronDown className="w-3 h-3 inline" />]
        </span>
      </button>
    );
  }

  // Expanded: Compact, friendly card in plain English
  return (
    <div className="w-64 sm:w-72 bg-[#050811]/92 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-xl overflow-hidden pointer-events-auto select-none transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#080d19]/90 border-b border-slate-800/70">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="font-display text-xs font-semibold text-slate-200">
            Time Dilation
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-slate-100 bg-slate-900/80 rounded border border-slate-800 transition-colors cursor-pointer"
          title="Minimize time dilation"
        >
          <span>Hide</span>
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Core plain English explanation */}
        <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-semibold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Gravity Slows Down Time
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-amber-300 tabular-nums">
              {dilation.dt_dtau.toFixed(1)}×
            </span>
            <span className="text-xs text-slate-300">slower than Earth</span>
          </div>

          <p className="mt-1 text-[11px] text-slate-300 leading-snug">
            For every <strong>1 hour</strong> spent at this distance, <strong>{dilation.dt_dtau.toFixed(1)} hours</strong> pass for observers far away.
          </p>
        </div>

        {/* Real-Time Simple Clock Comparison */}
        <div className="p-2 bg-[#0a0f1d] border border-slate-800/80 rounded-lg space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between py-0.5 border-b border-slate-800/60">
            <span className="text-slate-400 text-[11px]">Distant Earth:</span>
            <span className="font-bold text-slate-100">{formatClock(clockState.tSeconds)}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-amber-400 text-[11px]">Orbiting Star S2:</span>
            <span className="font-bold text-amber-300">{formatClock(clockState.tauSeconds)}</span>
          </div>
        </div>

        {/* Simple Distance Scrubber */}
        {onSetProbeRadius && (
          <div className="pt-0.5">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>Distance from center:</span>
              <span className="text-amber-400 font-bold">{probeRadiusRs.toFixed(1)}× horizon</span>
            </div>
            <input
              type="range"
              min={1.25}
              max={6.5}
              step={0.1}
              value={probeRadiusRs}
              onChange={(e) => onSetProbeRadius(parseFloat(e.target.value))}
              className="sci-slider w-full"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
              <span>Closer (Time crawls)</span>
              <span>Farther (Normal)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
