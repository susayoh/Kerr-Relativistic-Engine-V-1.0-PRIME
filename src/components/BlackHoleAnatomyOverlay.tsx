import React, { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  Eye,
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

interface CalloutLayoutSpec {
  offsetX: number;
  offsetY: number;
  width: number;
  lineStartRelX: number;
  lineStartRelY: number;
}

const CALLOUT_LAYOUTS: Record<string, CalloutLayoutSpec> = {
  far_side: {
    offsetX: -240,
    offsetY: -135,
    width: 235,
    lineStartRelX: 185,
    lineStartRelY: 76,
  },
  photon_ring: {
    offsetX: 46,
    offsetY: -225,
    width: 245,
    lineStartRelX: 2,
    lineStartRelY: 112,
  },
  black_hole_shadow: {
    offsetX: 185,
    offsetY: -145,
    width: 235,
    lineStartRelX: -6,
    lineStartRelY: 76,
  },
  doppler_beaming: {
    offsetX: -270,
    offsetY: -148,
    width: 245,
    lineStartRelX: 175,
    lineStartRelY: 86,
  },
  accretion_disk: {
    offsetX: -195,
    offsetY: 52,
    width: 225,
    lineStartRelX: 122,
    lineStartRelY: 10,
  },
  underside: {
    offsetX: -255,
    offsetY: 36,
    width: 240,
    lineStartRelX: 245,
    lineStartRelY: 22,
  },
  singularity: {
    offsetX: 230,
    offsetY: 78,
    width: 225,
    lineStartRelX: -8,
    lineStartRelY: 14,
  },
  // Fallback layouts for neutron star / pulsar mode
  star_crust: {
    offsetX: -250,
    offsetY: -120,
    width: 230,
    lineStartRelX: 220,
    lineStartRelY: 60,
  },
  star_jets: {
    offsetX: 90,
    offsetY: -175,
    width: 235,
    lineStartRelX: 0,
    lineStartRelY: 75,
  },
  star_magnetosphere: {
    offsetX: 180,
    offsetY: -60,
    width: 235,
    lineStartRelX: -6,
    lineStartRelY: 35,
  },
  star_gravity_well: {
    offsetX: -230,
    offsetY: 65,
    width: 235,
    lineStartRelX: 220,
    lineStartRelY: 15,
  },
};

export const BlackHoleAnatomyOverlay: React.FC<BlackHoleAnatomyOverlayProps> = ({
  sceneController,
  isVisible,
  onToggleVisible,
  onSelectPreset,
}) => {
  const [anchors, setAnchors] = useState<AnatomyCalloutAnchor[]>([]);
  const [showSingularityLabel, setShowSingularityLabel] = useState<boolean>(true);
  const [showTypesDrawer, setShowTypesDrawer] = useState<boolean>(false);
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

  // Poll 3D projected screen coordinates from Three.js scene camera
  useEffect(() => {
    if (!isVisible || !sceneController) {
      setAnchors([]);
      return;
    }

    let lastUpdate = 0;
    const updateAnchors = (now: number) => {
      if (now - lastUpdate > 24) {
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
        className="absolute top-3 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/95 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all text-xs font-mono shadow-lg cursor-pointer pointer-events-auto ring-1 ring-neutral-800/60"
        title="Show Black Hole Anatomy Diagram"
      >
        <Eye className="w-3.5 h-3.5 text-amber-400/90" />
        <span>Show Anatomy Guide</span>
      </button>
    );
  }

  // Scale callout offsets gracefully on smaller viewports
  const scaleFactor = Math.min(1.0, Math.max(0.68, viewportSize.w / 1400));

  const visibleCallouts = anchors
    .filter((a) => a.isVisible && (showSingularityLabel || a.id !== 'singularity'))
    .map((anchor) => {
      const spec = CALLOUT_LAYOUTS[anchor.id] || {
        offsetX: 160,
        offsetY: -100,
        width: 220,
        lineStartRelX: 0,
        lineStartRelY: 40,
      };

      const rawBoxX = anchor.screenX + spec.offsetX * scaleFactor;
      const rawBoxY = anchor.screenY + spec.offsetY * scaleFactor;

      // Clamp callout boxes safely inside the viewport stage
      const boxX = Math.max(20, Math.min(viewportSize.w - spec.width - 20, rawBoxX));
      const boxY = Math.max(54, Math.min(viewportSize.h - 145, rawBoxY));

      const lineStartX = boxX + spec.lineStartRelX;
      const lineStartY = boxY + spec.lineStartRelY;

      return {
        anchor,
        spec,
        boxX,
        boxY,
        lineStartX,
        lineStartY,
      };
    });

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden select-none">
      {/* Crisp NASA-style Straight White Leader Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {visibleCallouts.map(({ anchor, lineStartX, lineStartY }) => (
          <g key={`leader-line-${anchor.id}`}>
            {/* Subtle dark backing stroke so white line remains legible over bright plasma */}
            <line
              x1={lineStartX}
              y1={lineStartY}
              x2={anchor.screenX}
              y2={anchor.screenY}
              stroke="rgba(0,0,0,0.65)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Crisp white straight scientific leader line */}
            <line
              x1={lineStartX}
              y1={lineStartY}
              x2={anchor.screenX}
              y2={anchor.screenY}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* Floating NASA Scientific Callout Text Blocks */}
      {visibleCallouts.map(({ anchor, spec, boxX, boxY }) => (
        <div
          key={`callout-label-${anchor.id}`}
          style={{
            left: `${boxX}px`,
            top: `${boxY}px`,
            width: `${spec.width}px`,
          }}
          className="absolute pointer-events-none z-20"
        >
          <h3
            className="text-white font-sans font-normal text-[17px] sm:text-[18px] leading-snug tracking-tight"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.9)' }}
          >
            {anchor.name}
          </h3>
          <p
            className="text-white/95 font-sans font-normal text-[11.5px] leading-[1.35] mt-1"
            style={{ textShadow: '0 1px 5px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9)' }}
          >
            {anchor.description}
          </p>
        </div>
      ))}

      {/* Sleek Right-Docked Control Pill (Positioned in the Right HUD slot) */}
      <div className="absolute top-3 right-6 z-25 pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/90 border border-neutral-800 rounded-lg shadow-2xl ring-1 ring-neutral-800/60">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
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
};
