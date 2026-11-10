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
    const TARGET_FPS = 30;
    const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
    let lastFrameTime = 0;
    let lastRenderUpdate = 0;

    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      if (now - lastFrameTime < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime = now;
      const deltaMs = Math.min(100, now - lastAnimTimeRef.current);
      lastAnimTimeRef.current = now;

      const deltaSec = (deltaMs / 1000) * timeScale;
      tSecRef.current += deltaSec;
      tauSecRef.current += deltaSec * dilation.dtau_dt;

      if (now - lastRenderUpdate >= 150) {
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
        className="hud-panel flex items-center gap-2 px-3 py-1.5 bg-black/95 border border-neutral-800 rounded-lg shadow-lg hover:border-neutral-700 hover:bg-neutral-900 transition-all text-xs font-mono cursor-pointer group"
        title="Click to view time dilation details"
      >
        <Clock className="w-3.5 h-3.5 text-amber-400/90 group-hover:rotate-12 transition-transform" />
        <span className="text-neutral-400">1 hr here =</span>
        <span className="text-amber-300 font-bold">{dilation.dt_dtau.toFixed(1)} hrs on Earth</span>
        <span className="text-neutral-500 text-[10px] flex items-center gap-0.5">
          [Expand <ChevronDown className="w-3 h-3 inline" />]
        </span>
      </button>
    );
  }

  // Expanded: Compact, friendly card in plain English
  return (
    <div className="hud-panel w-64 sm:w-72 bg-black/95 border border-neutral-800 rounded-xl shadow-xl overflow-hidden pointer-events-auto select-none transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-950 border-b border-neutral-800/80">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400/90" />
          <h3 className="font-display text-xs font-semibold text-neutral-200">
            Time Dilation
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-800 transition-colors cursor-pointer"
          title="Minimize time dilation"
        >
          <span>Hide</span>
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Core plain English explanation */}
        <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-semibold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Gravity Slows Down Time
          </div>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-amber-300 tabular-nums">
              {dilation.dt_dtau.toFixed(1)}×
            </span>
            <span className="text-xs text-neutral-400">slower than Earth</span>
          </div>

          <p className="mt-1 text-[11px] text-neutral-300 leading-snug">
            For every <strong>1 hour</strong> spent at this distance, <strong>{dilation.dt_dtau.toFixed(1)} hours</strong> pass for observers far away.
          </p>
        </div>

        {/* Real-Time Simple Clock Comparison */}
        <div className="p-2 bg-neutral-950 border border-neutral-800/80 rounded-lg space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between py-0.5 border-b border-neutral-800/60">
            <span className="text-neutral-400 text-[11px]">Distant Earth:</span>
            <span className="font-bold text-neutral-100">{formatClock(clockState.tSeconds)}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-amber-400/90 text-[11px]">Orbiting Star S2:</span>
            <span className="font-bold text-amber-300">{formatClock(clockState.tauSeconds)}</span>
          </div>
        </div>

        {/* Simple Distance Scrubber */}
        {onSetProbeRadius && (
          <div className="pt-0.5">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400 mb-1">
              <span>Distance from center:</span>
              <span className="text-amber-300/90 font-bold">{probeRadiusRs.toFixed(1)}× horizon</span>
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
            <div className="flex justify-between text-[9px] font-mono text-neutral-500 mt-0.5">
              <span>Closer (Time crawls)</span>
              <span>Farther (Normal)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
