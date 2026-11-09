import React, { useState } from 'react';
import { X, Sparkles, Scale, Maximize2, Compass, AlertCircle, ArrowRight } from 'lucide-react';
import { ASTROPHYSICAL_PRESETS } from '../physics/gravitationalPhysics';

interface CosmicScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  activePresetId: string;
}

interface CosmicBenchmark {
  id: string;
  name: string;
  category: 'star' | 'planet' | 'stellar_bh' | 'solar_system' | 'smbh' | 'umbh';
  massSolarDisplay: string;
  diameterDisplay: string;
  diameterKm: number;
  auEquivalent?: string;
  humanAnalogy: string;
  color: string;
  badge: string;
}

const COSMIC_BENCHMARKS: CosmicBenchmark[] = [
  {
    id: 'neutron_star',
    name: 'PSR B1919+21 (Neutron Star)',
    category: 'star',
    massSolarDisplay: '1.40 M☉ (1.4 Suns)',
    diameterDisplay: '20 km across',
    diameterKm: 20,
    humanAnalogy: 'Size of Manhattan or Paris. Contains more mass than our entire Sun crushed into a single city.',
    color: '#34d399',
    badge: 'Compact Star',
  },
  {
    id: 'earth',
    name: 'Planet Earth',
    category: 'planet',
    massSolarDisplay: '0.000003 M☉ (1/333,000 Sun)',
    diameterDisplay: '12,742 km across',
    diameterKm: 12742,
    humanAnalogy: 'Our home world. A primordial black hole of Earth\'s mass would be just 1.8 cm across!',
    color: '#60a5fa',
    badge: 'Planet',
  },
  {
    id: 'cygx1',
    name: 'Cygnus X-1 (Stellar Black Hole)',
    category: 'stellar_bh',
    massSolarDisplay: '21.2 M☉ (21 Suns)',
    diameterDisplay: '125 km across',
    diameterKm: 125,
    humanAnalogy: 'Size of Long Island or a small state. 21 Suns crushed down to zero volume at the singularity.',
    color: '#38bdf8',
    badge: 'Stellar Black Hole',
  },
  {
    id: 'sun',
    name: 'Our Sun (Sol)',
    category: 'star',
    massSolarDisplay: '1.00 M☉ (The Standard Benchmark)',
    diameterDisplay: '1,392,700 km (1.39 Million km)',
    diameterKm: 1392700,
    humanAnalogy: 'Holds 99.86% of all mass in our Solar System; 1.3 million Earths could fit inside.',
    color: '#fbbf24',
    badge: 'Main Sequence Star',
  },
  {
    id: 'sgra',
    name: 'Sagittarius A* (Milky Way Center)',
    category: 'smbh',
    massSolarDisplay: '4.30 × 10⁶ M☉ (4.3 Million Suns)',
    diameterDisplay: '25.6 Million km (0.17 AU)',
    diameterKm: 25600000,
    auEquivalent: '0.17 AU (Half the orbit of Mercury)',
    humanAnalogy: 'Anchors our entire Milky Way galaxy. Easily fits inside Mercury\'s orbit around the Sun.',
    color: '#c084fc',
    badge: 'Supermassive Black Hole',
  },
  {
    id: 'solar_system',
    name: 'Our Entire Solar System (to Pluto)',
    category: 'solar_system',
    massSolarDisplay: '~1.0014 M☉ (Sun + all planets)',
    diameterDisplay: '~11.8 Billion km (~79 AU)',
    diameterKm: 11800000000,
    auEquivalent: '79 AU',
    humanAnalogy: 'Voyager 1 took 35+ years traveling at 38,000 mph just to reach the edge of this span.',
    color: '#94a3b8',
    badge: 'Planetary System',
  },
  {
    id: 'm87',
    name: 'M87* (Powehi)',
    category: 'smbh',
    massSolarDisplay: '6.50 × 10⁹ M☉ (6.5 Billion Suns)',
    diameterDisplay: '38.4 Billion km (256 AU)',
    diameterKm: 38400000000,
    auEquivalent: '256 AU (3.2× wider than Pluto\'s orbit)',
    humanAnalogy: 'Our entire Solar System out to Pluto would be swallowed three times over inside its event horizon.',
    color: '#f97316',
    badge: 'Supermassive Black Hole',
  },
  {
    id: 'ton618',
    name: 'TON 618 (The Cosmic Titan)',
    category: 'umbh',
    massSolarDisplay: '66.0 × 10⁹ M☉ (66 BILLION Suns)',
    diameterDisplay: '390 Billion km (2,600 AU)',
    diameterKm: 390000000000,
    auEquivalent: '2,600 AU (32× wider than Pluto\'s orbit)',
    humanAnalogy: 'The largest known black hole in the universe. More than 40 complete Solar Systems could sit side-by-side inside its event horizon alone!',
    color: '#eab308',
    badge: 'Ultramassive Black Hole',
  },
];

export const CosmicScaleModal: React.FC<CosmicScaleModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  activePresetId,
}) => {
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('ton618');

  if (!isOpen) return null;

  const currentBenchmark =
    COSMIC_BENCHMARKS.find((b) => b.id === selectedBenchmarkId) || COSMIC_BENCHMARKS[7];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-4xl bg-black border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Astronomical Scale Explorer
              </span>
              <span className="text-xs font-mono text-neutral-400">Order-of-Magnitude Visualizer</span>
            </div>
            <h2 className="font-display text-xl font-bold text-neutral-100 mt-1 flex items-center gap-2">
              <span>Why TON 618 Scaled to 100 Suns & Real Cosmic Scale</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 bg-neutral-900 rounded-lg border border-neutral-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto bg-black">
          {/* Direct Plain-English Answer Banner */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Why did TON 618 previously scale to 100 Suns in the 3D scene?
                </h3>
                <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                  In reality, <strong>TON 618 has 66 BILLION Solar Masses (66,000,000,000 M☉)</strong> and an event horizon spanning <strong>390 Billion km (2,600 AU)</strong>.
                  If drawn on a true 1:1 linear screen scale where a 20 km Neutron Star is 1 millimeter wide, TON 618 would be <strong>19.5 kilometers (12 miles) wide</strong>—it would shatter your screen!
                </p>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Standard 3D visualizers map masses to a normalized scale (1 to 100) so that your camera can render orbiting stars, accretion disks, and spacetime manifolds simultaneously. Below, explore the true cosmic scale comparisons from 20 km up to 390 billion km!
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Benchmark Comparison Strip */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
                True Physical Dimensions (Logarithmic Step Scale)
              </span>
              <span className="text-xs text-neutral-400">Click any object to inspect scale</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COSMIC_BENCHMARKS.map((bm) => {
                const isSelected = bm.id === selectedBenchmarkId;
                return (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => setSelectedBenchmarkId(bm.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 border-amber-400/90 shadow-md ring-1 ring-amber-400/30'
                        : 'bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded text-neutral-400 bg-neutral-900 border border-neutral-800 truncate">
                        {bm.badge}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: bm.color }}
                      />
                    </div>
                    <div className="font-semibold text-xs text-neutral-200 mt-1.5 truncate">
                      {bm.name}
                    </div>
                    <div className="font-mono text-[11px] text-amber-300 font-bold mt-0.5 truncate">
                      {bm.diameterDisplay}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Benchmark Deep-Dive Card */}
          <div className="p-5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-900 text-amber-300 border border-neutral-800">
                    {currentBenchmark.badge}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    Mass: <strong className="text-neutral-200">{currentBenchmark.massSolarDisplay}</strong>
                  </span>
                </div>
                <h4 className="font-display text-lg font-bold text-slate-100 mt-1">
                  {currentBenchmark.name}
                </h4>
              </div>

              {/* Action to switch to corresponding preset in 3D scene if available */}
              {ASTROPHYSICAL_PRESETS.some((p) => p.id === currentBenchmark.id) && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectPreset(currentBenchmark.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Load {currentBenchmark.name.split(' ')[0]} in 3D</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scale Comparison Graphic Bars */}
            <div className="space-y-2 pt-2 border-t border-neutral-800/80">
              <div className="text-xs text-neutral-300 leading-relaxed">
                <strong>Human Analogy:</strong> {currentBenchmark.humanAnalogy}
              </div>

              {currentBenchmark.auEquivalent && (
                <div className="text-xs font-mono text-amber-300 bg-neutral-900 px-3 py-1.5 rounded border border-neutral-800">
                  Astronomical Units: {currentBenchmark.auEquivalent} (1 AU = Earth-Sun distance = 150 Million km)
                </div>
              )}

              {/* Logarithmic Scale Ratio Bar relative to TON 618 */}
              <div className="mt-3 pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>Relative Diameter vs TON 618 (390 Billion km)</span>
                  <span className="text-amber-300 font-bold">
                    {currentBenchmark.id === 'ton618'
                      ? '100% (The Titan Horizon)'
                      : `${((currentBenchmark.diameterKm / 390000000000) * 100).toExponential(3)}%`}
                  </span>
                </div>
                <div className="w-full h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width:
                        currentBenchmark.id === 'ton618'
                          ? '100%'
                          : currentBenchmark.id === 'm87'
                          ? '10%'
                          : currentBenchmark.id === 'solar_system'
                          ? '3.0%'
                          : currentBenchmark.id === 'sgra'
                          ? '0.007%'
                          : '0.2%',
                      backgroundColor: currentBenchmark.color,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mt-1">
                  <span>20 km (Neutron Star)</span>
                  <span>12 Billion km (Pluto)</span>
                  <span>390 Billion km (TON 618)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800/80 bg-neutral-950 text-xs text-neutral-400">
          <span>1 Solar Mass (M☉) = 1.989 × 10³⁰ kg = 333,000 Earths</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-neutral-200 rounded-md hover:bg-white transition-colors cursor-pointer"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
