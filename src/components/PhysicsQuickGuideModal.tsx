import React from 'react';
import {
  X,
  BookOpen,
  Orbit,
  Flame,
  ArrowDownToLine,
  Radio,
  Eye,
  Scale,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { BlackHoleParams } from '../physics/gravitationalPhysics';

interface PhysicsQuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: BlackHoleParams;
  onChangeParams: (updater: (prev: BlackHoleParams) => BlackHoleParams) => void;
}

export const PhysicsQuickGuideModal: React.FC<PhysicsQuickGuideModalProps> = ({
  isOpen,
  onClose,
  params,
  onChangeParams,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-4xl bg-black border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-neutral-800 bg-neutral-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider rounded bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-amber-400" />
                Plain-English Guide
              </span>
              <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
                Zero Jargon · Everyday Analogies
              </span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-neutral-100 mt-1">
              Physics Quick-Guide: How Black Hole Controls Work
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Simple, non-academic analogies explaining what each slider does to space, time, and light
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded-lg border border-neutral-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close Physics Quick-Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* 30-Second Big Picture Intro */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-neutral-950 to-cyan-950/30 border border-neutral-800">
            <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>The 30-Second Secret: Why Can We See a Black Hole at All?</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
              A black hole itself is completely invisible—like a black bowling ball in a pitch-dark room. What you are actually seeing is the{' '}
              <strong className="text-amber-200">glowing whirlpool of superheated gas</strong> swirling around it, plus the way its extreme gravity{' '}
              <strong className="text-cyan-200">bends starlight like a giant glass lens</strong>. Here is what each control knob changes:
            </p>
          </div>

          {/* Main Parameter Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. SPIN (a*) */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-cyan-500/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                      <Orbit className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">1. Spin (Kerr Rotation)</h3>
                      <span className="text-[11px] font-mono text-cyan-300">
                        Current: a* = {params.spin.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    The Blender
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-200">
                  <strong className="text-cyan-300 block text-[11px] uppercase tracking-wider font-mono mb-0.5">
                    Everyday Analogy: Spoon in Thick Honey
                  </strong>
                  Imagine spinning a spoon inside a jar of thick honey. A still spoon just sits there, but a fast-spinning spoon drags the honey around with it into a swirling vortex.
                </div>

                <p className="mt-2.5 text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-neutral-100">What it does in 3D:</strong> A spinning black hole literally twists the fabric of space around itself. At high spin, glowing gas can orbit much closer to the dark center without falling in, and the grid lines beneath twist into a tight whirlpool.
                </p>
              </div>

              <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-neutral-400">Try it live:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeParams((prev) => ({ ...prev, spin: 0.0 }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      params.spin < 0.05
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Still (0.00)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeParams((prev) => ({ ...prev, spin: 0.998 }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      params.spin > 0.95
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Max Whirlpool (0.998)
                  </button>
                </div>
              </div>
            </div>

            {/* 2. ACCRETION RATE */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">2. Accretion Rate</h3>
                      <span className="text-[11px] font-mono text-amber-300">
                        Current: ṁ = {params.accretionRate.toFixed(2)} Edd
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Fuel Throttle
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-200">
                  <strong className="text-amber-300 block text-[11px] uppercase tracking-wider font-mono mb-0.5">
                    Everyday Analogy: Logs on a Campfire
                  </strong>
                  Think of turning up the gas valve on a blowtorch. A tiny trickle of fuel makes a dim, calm ember; pouring on fuel creates a roaring, white-hot blaze.
                </div>

                <p className="mt-2.5 text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-neutral-100">What it does in 3D:</strong> Controls how much gas is falling into the black hole per second. More gas means more friction, heating the swirling disk to millions of degrees and triggering outward shockwaves when surged rapidly.
                </p>
              </div>

              <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-neutral-400">Try it live:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        accretionRate: 0.25,
                        accretionState: 'quiescent',
                      }))
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      params.accretionRate < 0.4
                        ? 'bg-amber-500/25 text-amber-200 border-amber-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Dim Ember (0.25)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        accretionRate: 1.9,
                        accretionState: 'active',
                      }))
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      params.accretionRate > 1.6
                        ? 'bg-amber-500/25 text-amber-200 border-amber-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Roaring Quasar (1.90)
                  </button>
                </div>
              </div>
            </div>

            {/* 3. WELL DEPTH */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-purple-500/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300">
                      <ArrowDownToLine className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">3. Gravity Well Depth</h3>
                      <span className="text-[11px] font-mono text-purple-300">
                        Current: {(params.wellDepthMultiplier || 2.2).toFixed(1)}× Stretch
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    The Trampoline
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-200">
                  <strong className="text-purple-300 block text-[11px] uppercase tracking-wider font-mono mb-0.5">
                    Everyday Analogy: Bowling Ball on a Trampoline
                  </strong>
                  Place a heavy bowling ball on a stretched trampoline and the fabric sags into a deep funnel. Marbles rolling nearby curve inward along the slope.
                </div>

                <p className="mt-2.5 text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-neutral-100">What it does in 3D:</strong> Stretches the 3D wireframe grid underneath the black hole so you can visualize how deeply gravity dents space. Notice how a Black Hole plunges into a deep throat, while a Star bottoms out at a solid floor!
                </p>
              </div>

              <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-neutral-400">Try it live:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        wellDepthMultiplier: 0.8,
                        layers: { ...prev.layers, spacetimeGrid: true },
                      }))
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      (params.wellDepthMultiplier || 2.2) < 1.1
                        ? 'bg-purple-500/25 text-purple-200 border-purple-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Shallow Dip (0.8×)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        wellDepthMultiplier: 3.3,
                        layers: { ...prev.layers, spacetimeGrid: true },
                      }))
                    }
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      (params.wellDepthMultiplier || 2.2) > 3.0
                        ? 'bg-purple-500/25 text-purple-200 border-purple-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Deep Funnel (3.3×)
                  </button>
                </div>
              </div>
            </div>

            {/* 4. DOPPLER BEAMING */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">4. Doppler Beaming</h3>
                      <span className="text-[11px] font-mono text-emerald-300">
                        Current: {(params.dopplerStrength * 100).toFixed(0)}% Asymmetry
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Siren Effect
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-200">
                  <strong className="text-emerald-300 block text-[11px] uppercase tracking-wider font-mono mb-0.5">
                    Everyday Analogy: Racing Ambulance Siren
                  </strong>
                  When an ambulance speeds toward you, its siren sounds louder and higher-pitched; after it passes and speeds away, it sounds dimmer and lower.
                </div>

                <p className="mt-2.5 text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-neutral-100">What it does in 3D:</strong> Because the disk spins at nearly half the speed of light, the side racing <em>toward</em> your camera piles up light waves and looks <strong className="text-white">blindingly bright</strong>, while the side spinning <em>away</em> looks dimmer and deeper red.
                </p>
              </div>

              <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-neutral-400">Try it live:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeParams((prev) => ({ ...prev, dopplerStrength: 0.0 }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      params.dopplerStrength < 0.1
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Even Glow (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeParams((prev) => ({ ...prev, dopplerStrength: 0.95 }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      params.dopplerStrength > 0.85
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 font-bold'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
                    }`}
                  >
                    Strong Boost (95%)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bonus Row: Viewing Angle (Inclination) & Mass / Event Horizon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 shrink-0 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-100">
                  5. Inclination Angle ({params.inclinationDeg.toFixed(0)}°) — The Funhouse Mirror
                </h4>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  Looking straight down from above (10°) shows a flat bullseye ring. Crouching edge-on (~80°) lets gravity bend light from the <em>back</em> of the disk over the top and bottom, creating the iconic double-arch halo!
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 shrink-0 mt-0.5">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-neutral-100">
                  6. Mass & Event Horizon — The Waterfall Edge
                </h4>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  Think of a canoe approaching a giant waterfall. Once you pass the brink where water flows faster than you can paddle, there is no return. That boundary is the <strong className="text-neutral-100">Event Horizon</strong>, and heavier black holes have wider horizons.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Tip: Click any preset button above and watch the 3D scene update in real time!</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold rounded-lg border border-amber-500/40 transition-colors cursor-pointer shrink-0"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
