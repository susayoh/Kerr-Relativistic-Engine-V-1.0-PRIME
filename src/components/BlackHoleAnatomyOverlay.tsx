import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Eye, EyeOff, Info, HelpCircle } from 'lucide-react';
import {
  BlackHoleSceneController,
  AnatomyCalloutAnchor,
} from '../scene/BlackHoleScene';

interface BlackHoleAnatomyOverlayProps {
  sceneController: BlackHoleSceneController | null;
  isVisible: boolean;
  onToggleVisible: () => void;
  onSelectPreset?: (presetId: string) => void;
}

export const BlackHoleAnatomyOverlay: React.FC<BlackHoleAnatomyOverlayProps> = ({
  sceneController,
  isVisible,
  onToggleVisible,
  onSelectPreset,
}) => {
  const [anchors, setAnchors] = useState<AnatomyCalloutAnchor[]>([]);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [showBottomTypes, setShowBottomTypes] = useState<boolean>(true);
  const rafRef = useRef<number>(0);

  // Poll 3D projected screen coordinates from Three.js scene camera
  useEffect(() => {
    if (!isVisible || !sceneController) {
      setAnchors([]);
      return;
    }

    let lastUpdate = 0;
    const updateAnchors = (now: number) => {
      // Throttle coordinate projection to ~30-40fps for high responsiveness with low CPU overhead
      if (now - lastUpdate > 25) {
        lastUpdate = now;
        try {
          const projected = sceneController.getAnatomyCalloutAnchors();
          setAnchors(projected);
        } catch {
          // Ignore transient resize errors
        }
      }
      rafRef.current = requestAnimationFrame(updateAnchors);
    };

    rafRef.current = requestAnimationFrame(updateAnchors);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isVisible, sceneController]);

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#050811]/90 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:bg-amber-950/60 transition-all text-xs font-medium shadow-lg backdrop-blur-md cursor-pointer pointer-events-auto"
        title="Show Black Hole Anatomy Guide & Infographic Lines (Matching Reference Diagram)"
      >
        <Eye className="w-3.5 h-3.5 text-amber-400" />
        <span>Show Anatomy Guide & Infographic Lines</span>
      </button>
    );
  }

  // Map dock positions to screen card offsets
  const getCardOffset = (anchor: AnatomyCalloutAnchor) => {
    const isLeft = anchor.dockPosition.includes('left');
    const isTop = anchor.dockPosition.includes('top');
    const isMid = anchor.dockPosition.includes('mid');

    const cardWidth = 230;
    const cardHeight = 78;

    let targetX = anchor.screenX + (isLeft ? -cardWidth - 50 : 50);
    let targetY = anchor.screenY + (isTop ? -cardHeight - 20 : isMid ? -cardHeight / 2 : 25);

    // Keep card on screen bounds
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

    targetX = Math.max(16, Math.min(screenW - cardWidth - 16, targetX));
    targetY = Math.max(70, Math.min(screenH - cardHeight - 120, targetY));

    const cardCenterX = isLeft ? targetX + cardWidth : targetX;
    const cardCenterY = targetY + cardHeight / 2;

    return {
      cardX: targetX,
      cardY: targetY,
      cardWidth,
      cardHeight,
      cardCenterX,
      cardCenterY,
    };
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
      {/* Top Banner Header: Authentic Infographic Styling matching PMF IAS Poster */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#050811]/92 border border-amber-500/50 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <h2 className="font-display text-xs sm:text-sm font-black tracking-widest uppercase text-amber-300">
            Black Hole Anatomy & Discovery Guide
          </h2>
        </div>

        <span className="text-slate-600">|</span>

        <span className="hidden sm:inline text-[11px] text-slate-300">
          Relativistic Lensed Disks & Hypersurfaces
        </span>

        <button
          type="button"
          onClick={onToggleVisible}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-700 hover:border-amber-400 transition-colors cursor-pointer"
          title="Hide Anatomy Guide Overlay"
        >
          <EyeOff className="w-3 h-3 text-amber-400" />
          <span>Hide Lines</span>
        </button>
      </div>

      {/* SVG Canvas for Dynamic Curved Leader Lines & Glowing Rings */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="lineAmberGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {anchors.map((anchor) => {
          if (!anchor.isVisible) return null;
          const { cardCenterX, cardCenterY } = getCardOffset(anchor);
          const isSelected = selectedAnchorId === anchor.id;

          // Midpoint dog-leg bend for aesthetic blueprint-style diagonal leader lines
          const midX = (anchor.screenX + cardCenterX) * 0.5;
          const midY = anchor.screenY;

          return (
            <g key={`svg-anchor-${anchor.id}`}>
              {/* Leader Line with subtle glow */}
              <polyline
                points={`${anchor.screenX},${anchor.screenY} ${midX},${midY} ${cardCenterX},${cardCenterY}`}
                fill="none"
                stroke={isSelected ? '#38bdf8' : '#fbbf24'}
                strokeWidth={isSelected ? '2' : '1.25'}
                strokeDasharray={isSelected ? 'none' : '4,2'}
                filter="url(#glowFilter)"
                opacity={isSelected ? 1.0 : 0.72}
              />

              {/* Pin Ring Target on 3D Object */}
              <circle
                cx={anchor.screenX}
                cy={anchor.screenY}
                r="3.5"
                fill={isSelected ? '#38bdf8' : '#f59e0b'}
              />
              <circle
                cx={anchor.screenX}
                cy={anchor.screenY}
                r="7.5"
                fill="none"
                stroke={isSelected ? '#38bdf8' : '#f59e0b'}
                strokeWidth="1.2"
                opacity="0.8"
              />
            </g>
          );
        })}
      </svg>

      {/* Interactive Floating HTML Callout Badges */}
      {anchors.map((anchor) => {
        if (!anchor.isVisible) return null;
        const { cardX, cardY, cardWidth } = getCardOffset(anchor);
        const isSelected = selectedAnchorId === anchor.id;

        return (
          <div
            key={`card-anchor-${anchor.id}`}
            style={{
              transform: `translate3d(${cardX}px, ${cardY}px, 0)`,
              width: `${cardWidth}px`,
            }}
            onMouseEnter={() => setSelectedAnchorId(anchor.id)}
            onMouseLeave={() => setSelectedAnchorId(null)}
            className={`absolute top-0 left-0 pointer-events-auto p-2.5 rounded-lg border transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md ${
              isSelected
                ? 'bg-[#081224]/95 border-cyan-400 ring-1 ring-cyan-400/50 scale-105 z-30'
                : 'bg-[#050812]/88 border-slate-700/80 hover:border-amber-400/60 hover:bg-[#070c1b]/95 z-20'
            }`}
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${anchor.badgeColor}`}
              >
                {anchor.badge}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {anchor.name}
              </span>
            </div>

            {/* Headline matching infographic text */}
            <h4 className="text-[11px] font-bold text-slate-100 leading-tight">
              {anchor.headline}
            </h4>

            {/* Description matching infographic */}
            <p className="mt-1 text-[10px] text-slate-300 leading-snug line-clamp-3">
              {anchor.description}
            </p>
          </div>
        );
      })}

      {/* Bottom Infographic Section: "THREE TYPES OF BLACK HOLES" directly matching the poster */}
      {showBottomTypes && (
        <div className="hidden md:flex absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto z-20 flex-col items-center max-w-4xl w-[92%] px-4 py-2.5 rounded-xl bg-[#050811]/92 border border-amber-500/40 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between w-full pb-1.5 border-b border-slate-800/80 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="font-display text-xs font-bold uppercase tracking-widest text-amber-300">
                Three Types of Black Holes (From Reference Diagram)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowBottomTypes(false)}
              className="text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              [Dismiss]
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            {/* 1. Stellar Black Holes */}
            <div
              onClick={() => onSelectPreset?.('cygnus_x1')}
              className="p-2 rounded-lg bg-[#080d1a] border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer"
            >
              <div className="text-[10px] font-mono uppercase font-bold text-amber-400 mb-0.5">
                Stellar Black Holes
              </div>
              <p className="text-[11px] text-slate-200 leading-snug">
                Massive stars collapse after exhausting fuel, compressing into black holes instead of neutron stars or white dwarfs.
              </p>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                Examples: Cygnus X-1, The Unicorn (3–30 M☉)
              </span>
            </div>

            {/* 2. Supermassive Black Holes */}
            <div
              onClick={() => onSelectPreset?.('sagittarius_a')}
              className="p-2 rounded-lg bg-[#080d1a] border border-purple-500/30 hover:border-purple-400 transition-colors cursor-pointer"
            >
              <div className="text-[10px] font-mono uppercase font-bold text-purple-400 mb-0.5">
                Supermassive Black Holes
              </div>
              <p className="text-[11px] text-slate-200 leading-snug">
                Form by merging black holes, collapsing gas clouds, or accumulating dark matter at galactic centers.
              </p>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                Examples: Sagittarius A*, M87*, TON 618
              </span>
            </div>

            {/* 3. Intermediate Black Holes */}
            <div
              onClick={() => onSelectPreset?.('gw190521')}
              className="p-2 rounded-lg bg-[#080d1a] border border-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer"
            >
              <div className="text-[10px] font-mono uppercase font-bold text-cyan-400 mb-0.5">
                Intermediate Black Holes
              </div>
              <p className="text-[11px] text-slate-200 leading-snug">
                Form when stars in a dense cluster collide in a chain reaction. Dark matter is invisible and emits no light.
              </p>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                Examples: GW190521 (142 M☉)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
