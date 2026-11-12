import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Crosshair,
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

interface CalloutLayoutSpec {
  side: 'left' | 'right';
  slotIndex: number; // 0 = top, 1 = upper-mid, 2 = lower-mid, 3 = bottom
  offsetX: number;
  offsetY: number;
  width: number;
  accentHex: string;
}

const CALLOUT_LAYOUTS: Record<string, CalloutLayoutSpec> = {
  far_side: {
    side: 'left',
    slotIndex: 0,
    offsetX: -310,
    offsetY: -175,
    width: 248,
    accentHex: '#fbbf24',
  },
  accretion_disk: {
    side: 'left',
    slotIndex: 1,
    offsetX: -280,
    offsetY: -25,
    width: 248,
    accentHex: '#f59e0b',
  },
  underside: {
    side: 'left',
    slotIndex: 2,
    offsetX: -305,
    offsetY: 85,
    width: 248,
    accentHex: '#c084fc',
  },
  singularity: {
    side: 'left',
    slotIndex: 3,
    offsetX: -295,
    offsetY: 185,
    width: 248,
    accentHex: '#38bdf8',
  },
  photon_ring: {
    side: 'right',
    slotIndex: 0,
    offsetX: 95,
    offsetY: -195,
    width: 248,
    accentHex: '#fcd34d',
  },
  black_hole_shadow: {
    side: 'right',
    slotIndex: 1,
    offsetX: 135,
    offsetY: -75,
    width: 248,
    accentHex: '#22d3ee',
  },
  doppler_beaming: {
    side: 'right',
    slotIndex: 2,
    offsetX: 90,
    offsetY: 35,
    width: 248,
    accentHex: '#34d399',
  },
  spacetime_distortion: {
    side: 'right',
    slotIndex: 3,
    offsetX: 95,
    offsetY: 135,
    width: 248,
    accentHex: '#fb7185',
  },
  // Stellar / Neutron star callouts
  luminous_photosphere: {
    side: 'left',
    slotIndex: 0,
    offsetX: -290,
    offsetY: -120,
    width: 248,
    accentHex: '#fbbf24',
  },
  luminous_wind_jet: {
    side: 'right',
    slotIndex: 0,
    offsetX: 95,
    offsetY: -130,
    width: 248,
    accentHex: '#38bdf8',
  },
  luminous_hydrostatic: {
    side: 'left',
    slotIndex: 2,
    offsetX: -280,
    offsetY: 75,
    width: 248,
    accentHex: '#818cf8',
  },
  ns_crust: {
    side: 'left',
    slotIndex: 0,
    offsetX: -290,
    offsetY: -120,
    width: 248,
    accentHex: '#22d3ee',
  },
  ns_pulsar_beam: {
    side: 'right',
    slotIndex: 0,
    offsetX: 95,
    offsetY: -130,
    width: 248,
    accentHex: '#34d399',
  },
  ns_tov_limit: {
    side: 'left',
    slotIndex: 2,
    offsetX: -280,
    offsetY: 75,
    width: 248,
    accentHex: '#c084fc',
  },
};

interface ComputedCalloutItem {
  anchor: AnatomyCalloutAnchor;
  spec: CalloutLayoutSpec;
  boxX: number;
  boxY: number;
  cardHeight: number;
  lineStartX: number;
  lineStartY: number;
  elbowX: number;
  elbowY: number;
  targetX: number;
  targetY: number;
}

export const BlackHoleAnatomyOverlay: React.FC<BlackHoleAnatomyOverlayProps> = React.memo(({
  sceneController,
  isVisible,
  onToggleVisible,
  onSelectPreset,
}) => {
  const [anchors, setAnchors] = useState<AnatomyCalloutAnchor[]>([]);
  const [showSingularityLabel, setShowSingularityLabel] = useState<boolean>(false);
  const [showTypesDrawer, setShowTypesDrawer] = useState<boolean>(false);
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1440,
    h: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onResize = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keep 3D singularity visibility synced with the Anatomy Guide Singularity toggle
  useEffect(() => {
    sceneController?.setShowSingularityInAnatomy(showSingularityLabel);
  }, [sceneController, showSingularityLabel]);

  // Poll 3D projected screen coordinates from Three.js scene camera at ~30fps for smooth leader lines
  useEffect(() => {
    if (!isVisible || !sceneController) {
      setAnchors([]);
      return;
    }

    let lastUpdate = 0;
    const updateAnchors = (now: number) => {
      if (now - lastUpdate >= 32) {
        lastUpdate = now;
        try {
          const projected = sceneController.getAnatomyCalloutAnchors();
          setAnchors((prev) => {
            if (
              prev.length === projected.length &&
              prev.every((p, idx) => {
                const n = projected[idx];
                return (
                  p.id === n.id &&
                  p.isVisible === n.isVisible &&
                  Math.abs(p.screenX - n.screenX) < 0.4 &&
                  Math.abs(p.screenY - n.screenY) < 0.4
                );
              })
            ) {
              return prev;
            }
            return projected;
          });
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
    return null;
  }

  // Scale callout offsets gracefully on smaller viewports
  const scaleFactor = Math.min(1.0, Math.max(0.68, viewportSize.w / 1400));
  const cardWidth = Math.round(Math.min(252, Math.max(196, 248 * scaleFactor)));
  const cardHeight = 98;
  const minGapY = 12;

  const rawItems = anchors
    .filter((a) => a.isVisible && (showSingularityLabel || a.id !== 'singularity'))
    .map((anchor) => {
      const spec = CALLOUT_LAYOUTS[anchor.id] || {
        side: anchor.screenX < viewportSize.w * 0.5 ? 'left' : 'right',
        slotIndex: 1,
        offsetX: anchor.screenX < viewportSize.w * 0.5 ? -270 : 110,
        offsetY: -60,
        width: 240,
        accentHex: '#fbbf24',
      };

      const rawBoxX = anchor.screenX + spec.offsetX * scaleFactor;
      const rawBoxY = anchor.screenY + spec.offsetY * scaleFactor;

      const boxX = Math.max(18, Math.min(viewportSize.w - cardWidth - 18, rawBoxX));
      const boxY = Math.max(58, Math.min(viewportSize.h - cardHeight - 96, rawBoxY));

      return {
        anchor,
        spec: { ...spec, width: cardWidth },
        boxX,
        boxY,
        cardHeight,
      };
    });

  // Resolve vertical overlaps independently on left and right sides so callout cards never collide
  const resolveSideOverlaps = (items: typeof rawItems) => {
    const sorted = [...items].sort((a, b) => a.spec.slotIndex - b.spec.slotIndex || a.boxY - b.boxY);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.boxY < prev.boxY + prev.cardHeight + minGapY) {
        curr.boxY = prev.boxY + prev.cardHeight + minGapY;
      }
    }
    // Clamp bottom-most card and push up if needed
    const maxBottomY = Math.max(180, viewportSize.h - cardHeight - 88);
    if (sorted.length > 0 && sorted[sorted.length - 1].boxY > maxBottomY) {
      sorted[sorted.length - 1].boxY = maxBottomY;
      for (let i = sorted.length - 2; i >= 0; i--) {
        const next = sorted[i + 1];
        const curr = sorted[i];
        if (curr.boxY + curr.cardHeight + minGapY > next.boxY) {
          curr.boxY = Math.max(54, next.boxY - curr.cardHeight - minGapY);
        }
      }
    }
    return sorted;
  };

  const leftResolved = resolveSideOverlaps(rawItems.filter((it) => it.spec.side === 'left'));
  const rightResolved = resolveSideOverlaps(rawItems.filter((it) => it.spec.side === 'right'));

  const visibleCallouts: ComputedCalloutItem[] = [...leftResolved, ...rightResolved].map((item) => {
    const { anchor, spec, boxX, boxY } = item;
    const boxCenterX = boxX + spec.width * 0.5;
    const isCardLeftOfTarget = boxCenterX <= anchor.screenX;

    // Start the leader line from the inner edge of the callout card facing the black hole
    const lineStartX = isCardLeftOfTarget ? boxX + spec.width : boxX;
    const lineStartY = boxY + 28;

    const targetX = anchor.screenX;
    const targetY = anchor.screenY;

    // Clean CAD / astronomical diagram horizontal-then-angled elbow connector
    const dx = targetX - lineStartX;
    const elbowSpan = Math.min(Math.abs(dx) * 0.38, 42);
    const elbowX = lineStartX + (dx >= 0 ? elbowSpan : -elbowSpan);
    const elbowY = lineStartY;

    return {
      anchor,
      spec,
      boxX,
      boxY,
      cardHeight,
      lineStartX,
      lineStartY,
      elbowX,
      elbowY,
      targetX,
      targetY,
    };
  });

  return (
    <div
      data-testid="black-hole-anatomy-overlay"
      className="absolute inset-0 pointer-events-none z-15 overflow-hidden select-none"
    >
      {/* Full-Viewport SVG Leader Lines & Target Reticles pointing directly to each described feature */}
      <svg
        data-testid="anatomy-leader-lines-svg"
        className="absolute inset-0 w-full h-full pointer-events-none z-15"
        viewBox={`0 0 ${viewportSize.w} ${viewportSize.h}`}
      >
        <defs>
          <filter id="anatomy-line-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {visibleCallouts.map(({ anchor, spec, lineStartX, lineStartY, elbowX, elbowY, targetX, targetY }) => {
          const isHighlighted = activeAnchorId === anchor.id;
          const isDimmed = activeAnchorId !== null && !isHighlighted;
          const pointsStr = `${lineStartX.toFixed(1)},${lineStartY.toFixed(1)} ${elbowX.toFixed(1)},${elbowY.toFixed(1)} ${targetX.toFixed(1)},${targetY.toFixed(1)}`;

          // Compute unit direction of final segment (elbow -> target) for arrowhead tip
          const segDx = targetX - elbowX;
          const segDy = targetY - elbowY;
          const segLen = Math.hypot(segDx, segDy) || 1;
          const ux = segDx / segLen;
          const uy = segDy / segLen;
          const px = -uy;
          const py = ux;
          const arrowLen = isHighlighted ? 8.5 : 6.8;
          const arrowHalfW = isHighlighted ? 4.0 : 3.1;
          const tipOffset = 5.5;
          const tipX = targetX - ux * tipOffset;
          const tipY = targetY - uy * tipOffset;
          const base1X = tipX - ux * arrowLen + px * arrowHalfW;
          const base1Y = tipY - uy * arrowLen + py * arrowHalfW;
          const base2X = tipX - ux * arrowLen - px * arrowHalfW;
          const base2Y = tipY - uy * arrowLen - py * arrowHalfW;

          return (
            <g
              key={`leader-line-${anchor.id}`}
              data-testid={`anatomy-leader-line-${anchor.id}`}
              style={{
                opacity: isDimmed ? 0.32 : 1,
                transition: 'opacity 180ms ease',
              }}
            >
              {/* Dark contrast under-stroke so line stays crisp over incandescent plasma */}
              <polyline
                points={pointsStr}
                fill="none"
                stroke="rgba(3, 7, 18, 0.88)"
                strokeWidth={isHighlighted ? 4.2 : 3.0}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Primary luminous leader line */}
              <polyline
                points={pointsStr}
                fill="none"
                stroke={spec.accentHex}
                strokeWidth={isHighlighted ? 2.1 : 1.35}
                strokeOpacity={isHighlighted ? 1.0 : 0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isHighlighted ? 'url(#anatomy-line-glow)' : undefined}
              />

              {/* Card edge origin connector dot */}
              <circle
                cx={lineStartX}
                cy={lineStartY}
                r={isHighlighted ? 3.6 : 2.6}
                fill={spec.accentHex}
                stroke="#030712"
                strokeWidth="1.2"
              />

              {/* Elbow joint micro-node */}
              <circle
                cx={elbowX}
                cy={elbowY}
                r={1.7}
                fill={spec.accentHex}
                fillOpacity={0.9}
              />

              {/* Directional pointer arrowhead aimed at the 3D feature */}
              <polygon
                points={`${tipX.toFixed(1)},${tipY.toFixed(1)} ${base1X.toFixed(1)},${base1Y.toFixed(1)} ${base2X.toFixed(1)},${base2Y.toFixed(1)}`}
                fill={spec.accentHex}
                stroke="#030712"
                strokeWidth="0.7"
              />

              {/* Target reticle on the 3D astrophysical feature */}
              <circle
                cx={targetX}
                cy={targetY}
                r={isHighlighted ? 8.5 : 5.5}
                fill="rgba(3, 7, 18, 0.45)"
                stroke={spec.accentHex}
                strokeWidth={isHighlighted ? 1.8 : 1.25}
                strokeDasharray={isHighlighted ? undefined : '2.5 2'}
              />
              <circle
                cx={targetX}
                cy={targetY}
                r={isHighlighted ? 3.0 : 2.2}
                fill="#ffffff"
                stroke={spec.accentHex}
                strokeWidth="1.2"
              />
            </g>
          );
        })}
      </svg>

      {/* Interactive Scientific Anatomy Callout Cards */}
      {visibleCallouts.map(({ anchor, spec, boxX, boxY }) => {
        const isHighlighted = activeAnchorId === anchor.id;
        const isDimmed = activeAnchorId !== null && !isHighlighted;
        return (
          <div
            key={`callout-label-${anchor.id}`}
            data-testid={`anatomy-callout-${anchor.id}`}
            onMouseEnter={() => setActiveAnchorId(anchor.id)}
            onMouseLeave={() => setActiveAnchorId((prev) => (prev === anchor.id ? null : prev))}
            onClick={() => setActiveAnchorId((prev) => (prev === anchor.id ? null : anchor.id))}
            style={{
              left: `${boxX}px`,
              top: `${boxY}px`,
              width: `${spec.width}px`,
              borderColor: isHighlighted ? spec.accentHex : 'rgba(255, 255, 255, 0.13)',
              opacity: isDimmed ? 0.55 : 1,
            }}
            className="hud-panel absolute pointer-events-auto z-20 rounded-lg bg-[#050811]/82 backdrop-blur-md border px-3 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.75)] transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1.5 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: spec.accentHex,
                    boxShadow: isHighlighted ? `0 0 8px ${spec.accentHex}` : undefined,
                  }}
                />
                <h3 className="text-white font-display font-bold text-[12px] sm:text-[12.5px] uppercase tracking-wider truncate">
                  {anchor.name}
                </h3>
              </div>
              <span
                className="font-mono text-[9.5px] font-semibold shrink-0 tabular-nums"
                style={{ color: spec.accentHex }}
              >
                {anchor.badge}
              </span>
            </div>

            <p className="text-slate-200/95 font-sans text-[11px] leading-[1.35] line-clamp-3">
              {anchor.description}
            </p>
          </div>
        );
      })}

      {/* Sleek Right-Docked Control Bar */}
      <div className="hud-panel absolute top-3 right-6 z-25 pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/90 border border-neutral-800 rounded-lg shadow-2xl ring-1 ring-neutral-800/60">
          <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-neutral-100 mr-1">
            Anatomy Guide
          </span>

          <button
            type="button"
            onClick={() => setShowSingularityLabel((prev) => !prev)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
              showSingularityLabel
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle Singularity callout label"
          >
            Singularity
          </button>

          <button
            type="button"
            onClick={() => setShowTypesDrawer((prev) => !prev)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
              showTypesDrawer
                ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Compare the 3 Astrophysical Types of Black Holes"
          >
            3 Types
          </button>

          <button
            type="button"
            onClick={onToggleVisible}
            className="p-1 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-900 cursor-pointer ml-0.5"
            title="Hide Anatomy Guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Optional Collapsible "Three Types of Black Holes" Reference Drawer */}
        {showTypesDrawer && (
          <div className="w-76 bg-black/95 border border-neutral-800 rounded-xl p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold pb-1.5 border-b border-neutral-800/80">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400/90" />
                <span>Three Types of Black Holes</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTypesDrawer(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              onClick={() => onSelectPreset?.('cygnus_x1')}
              className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-mono font-medium text-amber-300/90 uppercase">
                  1. Stellar (3–30 M☉)
                </span>
                <span className="text-[9px] font-mono text-neutral-400">Cygnus X-1 ↵</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Formed when massive stars exhaust nuclear fuel and undergo gravitational core collapse.
              </p>
            </div>

            <div
              onClick={() => onSelectPreset?.('ton618')}
              className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-mono font-medium text-amber-300/90 uppercase">
                  2. Supermassive (10⁶–10¹¹ M☉)
                </span>
                <span className="text-[9px] font-mono text-neutral-400">TON 618 ↵</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Lurk at galactic nuclei, formed through ancient mergers and gas accumulation.
              </p>
            </div>

            <div
              onClick={() => onSelectPreset?.('gw190521')}
              className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-mono font-medium text-amber-300/90 uppercase">
                  3. Intermediate (100–10⁵ M☉)
                </span>
                <span className="text-[9px] font-mono text-neutral-400">GW190521 ↵</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">
                Formed in dense stellar clusters through runaway collision chain reactions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

