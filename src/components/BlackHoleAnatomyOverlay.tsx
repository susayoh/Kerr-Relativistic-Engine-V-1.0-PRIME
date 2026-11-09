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
  isDockCollapsed?: boolean;
}

export const BlackHoleAnatomyOverlay: React.FC<BlackHoleAnatomyOverlayProps> = ({
  sceneController,
  isVisible,
  onToggleVisible,
  onSelectPreset,
  isDockCollapsed = false,
}) => {
  const [anchors, setAnchors] = useState<AnatomyCalloutAnchor[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'anatomy' | 'types'>('anatomy');
  const [dockMode, setDockMode] = useState<'left-telemetry' | 'top-center' | 'custom'>('left-telemetry');
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardRect, setCardRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({
    x: 16,
    y: 255,
    width: 330,
    height: 220,
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

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };
    const onMouseMove = (moveEv: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEv.clientX - dragStartRef.current.mouseX;
      const dy = moveEv.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(8, Math.min(window.innerWidth - 320, dragStartRef.current.startX + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - 180, dragStartRef.current.startY + dy));
      setCustomPos({ x: newX, y: newY });
      setDockMode('custom');
    };
    const onMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleToggleDock = () => {
    if (dockMode === 'left-telemetry') {
      setDockMode('top-center');
      setCustomPos(null);
    } else {
      setDockMode('left-telemetry');
      setCustomPos(null);
    }
  };

  // Calculate dynamic leader line connection point from card perimeter to 3D target
  const lineCoords = useMemo(() => {
    if (!isVisible || !activeAnchor || !activeAnchor.isVisible) return null;

    const targetX = activeAnchor.screenX;
    const targetY = activeAnchor.screenY;

    const cardLeft = cardRect.x;
    const cardRight = cardRect.x + cardRect.width;
    const cardTop = cardRect.y;
    const cardBottom = cardRect.y + cardRect.height;
    const cardCenterX = cardRect.x + cardRect.width * 0.5;

    let startX = cardCenterX;
    let startY = cardBottom;

    if (targetY > cardBottom) {
      startX = Math.max(cardLeft + 24, Math.min(cardRight - 24, targetX));
      startY = cardBottom;
    } else if (targetY < cardTop) {
      startX = Math.max(cardLeft + 24, Math.min(cardRight - 24, targetX));
      startY = cardTop;
    } else if (targetX < cardLeft) {
      startX = cardLeft;
      startY = Math.max(cardTop + 16, Math.min(cardBottom - 16, targetY));
    } else {
      startX = cardRight;
      startY = Math.max(cardTop + 16, Math.min(cardBottom - 16, targetY));
    }

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
        className="absolute top-[252px] left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/95 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all text-xs font-mono shadow-lg backdrop-blur-md cursor-pointer pointer-events-auto ring-1 ring-neutral-800/60"
        title="Show Black Hole Anatomy & Discovery Guide"
      >
        <Eye className="w-3.5 h-3.5 text-amber-400/90" />
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
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#78716c" stopOpacity="0.8" />
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
              opacity="0.7"
            />

            {/* Glowing active line with dash pattern */}
            <polyline
              points={`${lineCoords.startX},${lineCoords.startY} ${lineCoords.midX},${lineCoords.midY} ${lineCoords.targetX},${lineCoords.targetY}`}
              fill="none"
              stroke="url(#activeLineGrad)"
              strokeWidth="1.8"
              strokeDasharray="6,3"
              opacity="0.9"
            />

            {/* Card connection dot */}
            <circle
              cx={lineCoords.startX}
              cy={lineCoords.startY}
              r="3"
              fill="#d97706"
            />

            {/* Target reticle on the black hole */}
            <circle
              cx={lineCoords.targetX}
              cy={lineCoords.targetY}
              r="12"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.2"
              strokeDasharray="4,3"
              opacity="0.85"
            />
            <circle
              cx={lineCoords.targetX}
              cy={lineCoords.targetY}
              r="5"
              fill="none"
              stroke="#a8a29e"
              strokeWidth="1.2"
              opacity="0.9"
            />
            <circle
              cx={lineCoords.targetX}
              cy={lineCoords.targetY}
              r="2.5"
              fill="#f59e0b"
            />

            {/* Crosshair ticks */}
            <line
              x1={lineCoords.targetX - 16}
              y1={lineCoords.targetY}
              x2={lineCoords.targetX - 7}
              y2={lineCoords.targetY}
              stroke="#d97706"
              strokeWidth="1.2"
            />
            <line
              x1={lineCoords.targetX + 7}
              y1={lineCoords.targetY}
              x2={lineCoords.targetX + 16}
              y2={lineCoords.targetY}
              stroke="#d97706"
              strokeWidth="1.2"
            />
            <line
              x1={lineCoords.targetX}
              y1={lineCoords.targetY - 16}
              x2={lineCoords.targetX}
              y2={lineCoords.targetY - 7}
              stroke="#d97706"
              strokeWidth="1.2"
            />
            <line
              x1={lineCoords.targetX}
              y1={lineCoords.targetY + 7}
              x2={lineCoords.targetX}
              y2={lineCoords.targetY + 16}
              stroke="#d97706"
              strokeWidth="1.2"
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
                  ? 'w-7 h-7 bg-neutral-900 text-amber-300 font-bold border-2 border-amber-400 ring-2 ring-amber-400/20 scale-110 z-30'
                  : 'w-6 h-6 bg-black/95 text-neutral-300 font-semibold border border-neutral-700 hover:bg-neutral-900 hover:text-white hover:scale-105 z-20'
              }`}
              title={`Click to inspect #${idx + 1}: ${anchor.name}`}
            >
              <span className="text-[11px] font-mono leading-none">{idx + 1}</span>
            </button>

            {/* Attached name label when selected */}
            {isSelected && (
              <div className="absolute left-1/2 -top-6 -translate-x-1/2 pointer-events-none bg-black/95 border border-neutral-800 text-amber-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-35 animate-fade-in">
                #{idx + 1} {anchor.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Compact Minimized HUD Pill Mode */}
      {isPanelCollapsed ? (
        <div
          ref={cardRef}
          style={customPos ? { left: `${customPos.x}px`, top: `${customPos.y}px` } : undefined}
          className={`absolute pointer-events-auto z-25 transition-all duration-150 ${
            customPos
              ? ''
              : dockMode === 'top-center'
              ? 'top-3 left-1/2 -translate-x-1/2'
              : 'top-[245px] left-4'
          }`}
        >
          <div
            onMouseDown={handleMouseDownHeader}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/95 border border-neutral-800 rounded-full shadow-2xl backdrop-blur-md ring-1 ring-neutral-800/60 cursor-move select-none"
            title="Drag to reposition anywhere"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="font-display text-xs font-bold text-amber-300 whitespace-nowrap">
              #{activeIdx + 1}: {activeAnchor ? activeAnchor.name.split(' (')[0] : 'Anatomy'}
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 cursor-pointer"
                title="Previous feature"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 cursor-pointer"
                title="Next feature"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(false)}
                className="flex items-center gap-1 px-2 py-0.5 ml-1 text-[11px] font-mono text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded hover:border-neutral-700 cursor-pointer"
                title="Expand full guide"
              >
                <Maximize2 className="w-3 h-3 text-amber-400" />
                <span>Expand</span>
              </button>
              <button
                type="button"
                onClick={onToggleVisible}
                className="p-1 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-900 cursor-pointer ml-0.5"
                title="Hide guide"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Full Expanded Anatomy HUD Card (Left-docked where Time Dilation used to be, or Top-Docked) */
        <div
          ref={cardRef}
          style={customPos ? { left: `${customPos.x}px`, top: `${customPos.y}px` } : undefined}
          className={`absolute pointer-events-auto z-25 w-[min(360px,calc(100vw-1.5rem))] transition-all duration-150 ${
            customPos
              ? ''
              : dockMode === 'top-center'
              ? 'top-3 left-1/2 -translate-x-1/2'
              : 'top-[245px] left-4'
          }`}
        >
          <div className="bg-black/95 border border-neutral-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden ring-1 ring-neutral-800/60 max-h-[min(340px,calc(100vh-270px))] flex flex-col">
            {/* Header Bar with Drag Handle and Dock Switcher */}
            <div
              onMouseDown={handleMouseDownHeader}
              className="flex items-center justify-between px-3 py-2 bg-neutral-950 border-b border-neutral-800/80 shrink-0 cursor-move select-none"
              title="Click and drag to move card anywhere"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>Anatomy Guide</span>
                  <span className="text-[9px] font-mono font-normal text-neutral-400 px-1 py-0.2 bg-neutral-900 rounded border border-neutral-800">
                    {customPos ? 'Floating' : dockMode === 'top-center' ? 'Top-Center' : 'Left Dock'}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Dock Position Switcher */}
                <button
                  type="button"
                  onClick={handleToggleDock}
                  className="p-1 text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 rounded transition-colors cursor-pointer"
                  title={dockMode === 'top-center' ? 'Switch to Top-Right Dock' : 'Switch to Top-Center Dock'}
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>

                {/* Tab Selector */}
                <div className="flex items-center p-0.5 bg-neutral-900 rounded border border-neutral-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('anatomy')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      activeTab === 'anatomy'
                        ? 'bg-neutral-800 text-amber-300 font-medium'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Pin #{anchors.length > 0 ? activeIdx + 1 : 0}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('types')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      activeTab === 'types'
                        ? 'bg-neutral-800 text-amber-300 font-medium'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    3 Types
                  </button>
                </div>

                {/* Minimize / Expand Toggle */}
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded transition-colors cursor-pointer"
                  title="Minimize into compact pill"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {/* Hide Guide Button */}
                <button
                  type="button"
                  onClick={onToggleVisible}
                  className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded transition-colors cursor-pointer"
                  title="Hide Anatomy Guide"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          {/* Body Content */}
          {!isPanelCollapsed && (
            <div className="p-3.5 space-y-2.5 overflow-y-auto">
              {activeTab === 'anatomy' && activeAnchor && (
                <>
                  {/* Step Navigation Bar */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-800/80">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded hover:border-neutral-700 transition-colors cursor-pointer"
                      title="Previous anatomical feature"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-amber-400/90" />
                      <span>Prev</span>
                    </button>

                    <div className="text-center">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                        Pin {activeIdx + 1} of {anchors.length}
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        {activeAnchor.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded hover:border-neutral-700 transition-colors cursor-pointer"
                      title="Next anatomical feature"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400/90" />
                    </button>
                  </div>

                  {/* Badge & Headline */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${activeAnchor.badgeColor}`}
                      >
                        {activeAnchor.badge}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        Target Connected ↵
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-neutral-100 leading-snug pt-0.5">
                      {activeAnchor.headline}
                    </h4>

                    <p className="text-xs text-neutral-300 leading-relaxed pt-0.5">
                      {activeAnchor.description}
                    </p>
                  </div>

                  {/* Quick Feature Jump Pills */}
                  <div className="pt-2 border-t border-neutral-800/80">
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                      <span>Jump to Pin:</span>
                      <span className="text-amber-300/80">Lines track in 3D</span>
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
                              ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
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
                  <div className="flex items-center justify-between text-xs text-amber-300 font-bold pb-1 border-b border-neutral-800/80">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400/90" />
                      <span>Three Types of Black Holes</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 font-normal">
                      Click to load preset
                    </span>
                  </div>

                  {/* 1. Stellar */}
                  <div
                    onClick={() => onSelectPreset?.('cygnus_x1')}
                    className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono font-medium text-amber-300/90 uppercase">
                        1. Stellar (3–30 M☉)
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 hover:underline">
                        Cygnus X-1 ↵
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-snug">
                      Formed when massive stars exhaust nuclear fuel and undergo gravitational core collapse.
                    </p>
                  </div>

                  {/* 2. Supermassive */}
                  <div
                    onClick={() => onSelectPreset?.('ton618')}
                    className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono font-medium text-amber-300/90 uppercase">
                        2. Supermassive (10⁶–10¹¹ M☉)
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 hover:underline">
                        TON 618 ↵
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-snug">
                      Lurk at galactic nuclei, formed through ancient mergers and gas accumulation.
                    </p>
                  </div>

                  {/* 3. Intermediate */}
                  <div
                    onClick={() => onSelectPreset?.('gw190521')}
                    className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono font-medium text-amber-300/90 uppercase">
                        3. Intermediate (100–10⁵ M☉)
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 hover:underline">
                        GW190521 ↵
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-snug">
                      Formed in dense stellar clusters through runaway collision chain reactions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
