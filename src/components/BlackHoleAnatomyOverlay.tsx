import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Layers,
  Minimize2,
  Maximize2,
  X,
} from 'lucide-react';
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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'anatomy' | 'types'>('anatomy');
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardRect, setCardRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 210 : 300,
    y: 56,
    width: 420,
    height: 180,
  });

  const rafRef = useRef<number>(0);

  // Poll 3D projected screen coordinates from Three.js scene camera
  useEffect(() => {
    if (!isVisible || !sceneController) {
      setAnchors([]);
      return;
    }

    let lastUpdate = 0;
    const updateAnchors = (now: number) => {
      // Throttle coordinate projection to ~30-40fps for smooth responsiveness with low CPU overhead
      if (now - lastUpdate > 25) {
        lastUpdate = now;
        try {
          const projected = sceneController.getAnatomyCalloutAnchors();
          setAnchors(projected);

          // Update card bounding box for accurate leader line anchor point
          if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            setCardRect({
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            });
          }
        } catch {
          // Ignore transient resize errors
        }
      }
      rafRef.current = requestAnimationFrame(updateAnchors);
    };

    rafRef.current = requestAnimationFrame(updateAnchors);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isVisible, sceneController]);

  // Keep selected index within bounds when anchors change (e.g. black hole vs star)
  useEffect(() => {
    if (anchors.length > 0 && selectedIndex >= anchors.length) {
      setSelectedIndex(0);
    }
  }, [anchors.length, selectedIndex]);

  const activeAnchor =
    hoveredIndex !== null && anchors[hoveredIndex]
      ? anchors[hoveredIndex]
      : anchors[selectedIndex] || anchors[0];

  const activeIdx = hoveredIndex !== null ? hoveredIndex : selectedIndex;

  const handlePrev = () => {
    if (anchors.length === 0) return;
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : anchors.length - 1));
    setHoveredIndex(null);
  };

  const handleNext = () => {
    if (anchors.length === 0) return;
    setSelectedIndex((prev) => (prev < anchors.length - 1 ? prev + 1 : 0));
    setHoveredIndex(null);
  };

  // Calculate dynamic leader line connection point from card to 3D target
  // Always called unconditionally to satisfy React's Rules of Hooks
  const lineCoords = useMemo(() => {
    if (!isVisible || !activeAnchor || !activeAnchor.isVisible) return null;

    const targetX = activeAnchor.screenX;
    const targetY = activeAnchor.screenY;

    // Default start from bottom center of the card
    let startX = cardRect.x + cardRect.width / 2;
    let startY = cardRect.y + cardRect.height;

    // If target is above the card
    if (targetY < cardRect.y) {
      startY = cardRect.y;
    } else if (targetX < cardRect.x - 20) {
      // Target is far to the left
      startX = cardRect.x;
      startY = cardRect.y + cardRect.height / 2;
    } else if (targetX > cardRect.x + cardRect.width + 20) {
      // Target is far to the right
      startX = cardRect.x + cardRect.width;
      startY = cardRect.y + cardRect.height / 2;
    }

    // Midpoint elbow bend for blueprint infographic aesthetic
    let midX = startX;
    let midY = (startY + targetY) * 0.5;

    if (Math.abs(startX - targetX) > Math.abs(startY - targetY)) {
      midX = (startX + targetX) * 0.5;
      midY = startY;
    }

    return {
      startX,
      startY,
      midX,
      midY,
      targetX,
      targetY,
    };
  }, [isVisible, activeAnchor, cardRect]);

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#050811]/92 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:bg-amber-950/60 transition-all text-xs font-medium shadow-lg backdrop-blur-md cursor-pointer pointer-events-auto"
        title="Show Black Hole Anatomy & Discovery Guide"
      >
        <Eye className="w-3.5 h-3.5 text-amber-400" />
        <span>Show Anatomy Guide</span>
      </button>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
      {/* SVG Canvas for High-Precision Leader Lines & Glowing Targeting Reticles */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="anatomyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="activeLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Primary Dynamic Leader Line pointing to what is currently described */}
        {lineCoords && !isPanelCollapsed && (
          <g filter="url(#anatomyGlow)">
            {/* Background shadow stroke */}
            <polyline
              points={`${lineCoords.startX},${lineCoords.startY} ${lineCoords.midX},${lineCoords.midY} ${lineCoords.targetX},${lineCoords.targetY}`}
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              opacity="0.6"
            />

            {/* Glowing active line with dash pattern */}
            <polyline
              points={`${lineCoords.startX},${lineCoords.startY} ${lineCoords.midX},${lineCoords.midY} ${lineCoords.targetX},${lineCoords.targetY}`}
              fill="none"
              stroke="url(#activeLineGrad)"
              strokeWidth="2"
              strokeDasharray="6,3"
              opacity="0.95"
            />

            {/* Card connection dot */}
            <circle
              cx={lineCoords.startX}
              cy={lineCoords.startY}
              r="3.5"
              fill="#f59e0b"
            />

            {/* Target reticle on the black hole */}
            <circle
              cx={lineCoords.targetX}
              cy={lineCoords.targetY}
              r="12"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4,3"
              opacity="0.9"
            />
            <circle
              cx={lineCoords.targetX}
              cy={lineCoords.targetY}
              r="5"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              opacity="0.95"
            />
            <circle
              cx={lineCoords.targetX}
              cy={lineCoords.targetY}
              r="2.5"
              fill="#fef08a"
            />

            {/* Crosshair ticks */}
            <line
              x1={lineCoords.targetX - 16}
              y1={lineCoords.targetY}
              x2={lineCoords.targetX - 7}
              y2={lineCoords.targetY}
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <line
              x1={lineCoords.targetX + 7}
              y1={lineCoords.targetY}
              x2={lineCoords.targetX + 16}
              y2={lineCoords.targetY}
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <line
              x1={lineCoords.targetX}
              y1={lineCoords.targetY - 16}
              x2={lineCoords.targetX}
              y2={lineCoords.targetY - 7}
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <line
              x1={lineCoords.targetX}
              y1={lineCoords.targetY + 7}
              x2={lineCoords.targetX}
              y2={lineCoords.targetY + 16}
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>

      {/* 3D Pin Target Markers on the Black Hole Model */}
      {anchors.map((anchor, idx) => {
        if (!anchor.isVisible) return null;
        const isSelected = activeIdx === idx;

        return (
          <div
            key={`pin-container-${anchor.id}`}
            style={{
              left: `${anchor.screenX}px`,
              top: `${anchor.screenY}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute pointer-events-auto z-20 flex items-center justify-center"
          >
            <button
              type="button"
              onClick={() => {
                setSelectedIndex(idx);
                setHoveredIndex(null);
                setIsPanelCollapsed(false);
                setActiveTab('anatomy');
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer shadow-lg ${
                isSelected
                  ? 'w-7 h-7 bg-amber-500 text-slate-950 font-bold border-2 border-amber-200 ring-4 ring-amber-500/35 scale-110 z-30'
                  : 'w-6 h-6 bg-[#070b16]/90 text-amber-300 font-semibold border border-amber-500/60 hover:bg-amber-950 hover:scale-105 z-20'
              }`}
              title={`Click to inspect #${idx + 1}: ${anchor.name}`}
            >
              <span className="text-[11px] font-mono leading-none">{idx + 1}</span>
            </button>

            {/* Attached name label when selected */}
            {isSelected && (
              <div className="absolute left-1/2 -top-6 -translate-x-1/2 pointer-events-none bg-[#070b16]/95 border border-amber-500/60 text-amber-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-35 animate-fade-in">
                #{idx + 1} {anchor.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Central Non-Overlapping Anatomy Callout Card (Centered Below TopBar) */}
      <div
        ref={cardRef}
        className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-auto z-25 w-[min(460px,calc(100vw-2rem))] transition-all duration-200"
      >
        <div className="bg-[#050811]/95 border border-amber-500/50 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#090e1e] border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
                Anatomy & Discovery Guide
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Tab Selector */}
              <div className="flex items-center p-0.5 bg-slate-900 rounded border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('anatomy')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activeTab === 'anatomy'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Feature #{anchors.length > 0 ? activeIdx + 1 : 0}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('types')}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activeTab === 'types'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3 Types
                </button>
              </div>

              {/* Minimize / Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsPanelCollapsed((prev) => !prev)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title={isPanelCollapsed ? 'Expand Details' : 'Minimize Card'}
              >
                {isPanelCollapsed ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Hide Guide Button */}
              <button
                type="button"
                onClick={onToggleVisible}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Hide Anatomy Guide"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {!isPanelCollapsed && (
            <div className="p-3.5 space-y-2.5">
              {activeTab === 'anatomy' && activeAnchor && (
                <>
                  {/* Step Navigation Bar */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded hover:border-amber-400 transition-colors cursor-pointer"
                      title="Previous anatomical feature"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Prev</span>
                    </button>

                    <div className="text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Pin {activeIdx + 1} of {anchors.length}
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        {activeAnchor.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded hover:border-amber-400 transition-colors cursor-pointer"
                      title="Next anatomical feature"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>

                  {/* Badge & Headline */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${activeAnchor.badgeColor}`}
                      >
                        {activeAnchor.badge}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        Target Connected ↵
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-100 leading-snug pt-0.5">
                      {activeAnchor.headline}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                      {activeAnchor.description}
                    </p>
                  </div>

                  {/* Quick Feature Jump Pills */}
                  <div className="pt-2 border-t border-slate-800/70">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Jump to Pin:</span>
                      <span className="text-amber-400">Lines track in 3D</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {anchors.map((a, i) => (
                        <button
                          key={`quick-${a.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedIndex(i);
                            setHoveredIndex(null);
                          }}
                          onMouseEnter={() => setHoveredIndex(i)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                            activeIdx === i
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          {i + 1}. {a.name.split(' (')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Three Types of Black Holes Guide Tab */}
              {activeTab === 'types' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-300 font-bold pb-1 border-b border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Three Types of Black Holes</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                      Click to load preset
                    </span>
                  </div>

                  {/* 1. Stellar */}
                  <div
                    onClick={() => onSelectPreset?.('cygnus_x1')}
                    className="p-2 rounded-lg bg-[#080d1a] border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                        1. Stellar (3–30 M☉)
                      </span>
                      <span className="text-[9px] font-mono text-amber-300 underline">
                        Cygnus X-1 ↵
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug">
                      Formed when massive stars exhaust nuclear fuel and undergo gravitational core collapse.
                    </p>
                  </div>

                  {/* 2. Supermassive */}
                  <div
                    onClick={() => onSelectPreset?.('ton618')}
                    className="p-2 rounded-lg bg-[#080d1a] border border-purple-500/30 hover:border-purple-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">
                        2. Supermassive (10⁶–10¹¹ M☉)
                      </span>
                      <span className="text-[9px] font-mono text-purple-300 underline">
                        TON 618 ↵
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug">
                      Lurk at galactic nuclei, formed through ancient mergers and gas accumulation.
                    </p>
                  </div>

                  {/* 3. Intermediate */}
                  <div
                    onClick={() => onSelectPreset?.('gw190521')}
                    className="p-2 rounded-lg bg-[#080d1a] border border-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
                        3. Intermediate (100–10⁵ M☉)
                      </span>
                      <span className="text-[9px] font-mono text-cyan-300 underline">
                        GW190521 ↵
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug">
                      Formed in dense stellar clusters through runaway collision chain reactions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
