import React from 'react';
import { X, Sparkles, Orbit, Scale, Clock, Globe } from 'lucide-react';
import {
  ARCHETYPE_DEFINITIONS,
  ASTROPHYSICAL_PRESETS,
  BlackHoleArchetype,
} from '../physics/gravitationalPhysics';

interface ArchetypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  activePresetId: string;
}

export const ArchetypeModal: React.FC<ArchetypeModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  activePresetId,
}) => {
  if (!isOpen) return null;

  const archetypesList: BlackHoleArchetype[] = [
    'ultramassive',
    'supermassive',
    'intermediate',
    'stellar',
    'primordial',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-4xl bg-[#090d18] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800/90 bg-[#060911]/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Cosmic Taxonomy
              </span>
              <span className="text-xs font-mono text-slate-400">Astrophysical Classification</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-100 mt-1">
              Black Hole Archetypes & The Solar Mass Scale
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              From microscopic Big Bang relics to universe-ruling behemoths like TON 618
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Plain English "What is Solar Mass?" Callout Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-950/40 via-[#0d1424] to-cyan-950/40 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>What is a "Solar Mass" (M☉)? Explained in Simple Terms</span>
            </div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-2.5 bg-[#080d19]/80 rounded border border-slate-800/80">
                <div className="font-mono text-amber-400 font-semibold">1 Solar Mass (1 M☉)</div>
                <div className="text-slate-200 font-medium mt-0.5">= The Mass of Our Sun</div>
                <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
                  Our Sun weighs about 2 nonillion kilograms (2 × 10³⁰ kg). That is equivalent to{' '}
                  <strong className="text-slate-200">333,000 Earths</strong> packed together!
                </p>
              </div>

              <div className="p-2.5 bg-[#080d19]/80 rounded border border-slate-800/80">
                <div className="font-mono text-cyan-400 font-semibold">The Universal Measuring Tape</div>
                <div className="text-slate-200 font-medium mt-0.5">Why Astronomers Use It</div>
                <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
                  Writing numbers like 130,000,000,000,000,000,000,000,000,000,000,000,000 kg is impossible to read.
                  Instead, astronomers simply say: <strong className="text-slate-200">"This black hole weighs X Suns"</strong>.
                </p>
              </div>

              <div className="p-2.5 bg-[#080d19]/80 rounded border border-slate-800/80">
                <div className="font-mono text-purple-400 font-semibold">The Scale from Earth to TON 618</div>
                <div className="text-slate-200 font-medium mt-0.5">Mind-Boggling Extremes</div>
                <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
                  Cygnus X-1 is <strong className="text-slate-200">21 Suns</strong>. Sagittarius A* is{' '}
                  <strong className="text-slate-200">4.3 Million Suns</strong>. And TON 618 is an astonishing{' '}
                  <strong className="text-amber-300">66 Billion Suns</strong>!
                </p>
              </div>
            </div>
          </div>

          {/* Archetypes Catalog */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                The 5 Black Hole Archetypes
              </h3>
              <span className="text-xs text-slate-400">Click any preset to load into 3D visualizer</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {archetypesList.map((archetypeKey) => {
                const def = ARCHETYPE_DEFINITIONS[archetypeKey];
                const matchingPresets = ASTROPHYSICAL_PRESETS.filter(
                  (p) => p.archetype === archetypeKey
                );

                const isTon618 = archetypeKey === 'ultramassive';

                return (
                  <div
                    key={def.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isTon618
                        ? 'bg-gradient-to-br from-[#120d04] via-[#0b0e1b] to-[#070b16] border-amber-500/50 shadow-lg shadow-amber-950/20'
                        : 'bg-[#0a0f1d] border-slate-800/90'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded border ${def.badgeBg}`}
                          >
                            {def.name}
                          </span>
                          {isTon618 && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold text-amber-300 bg-amber-500/20 border border-amber-400/40 rounded flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              User Favorite · Maximum Known Size
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 font-medium">{def.tagline}</p>
                      </div>

                      {/* Presets in this Archetype */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {matchingPresets.map((preset) => {
                          const isCurrent = activePresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                onSelectPreset(preset.id);
                                onClose();
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isCurrent
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                                  : 'bg-[#111827] text-slate-200 border-slate-700 hover:border-amber-400 hover:text-white'
                              }`}
                            >
                              <Orbit className="w-3.5 h-3.5" />
                              <span>{preset.name}</span>
                              <span className="text-[10px] opacity-75 font-mono">
                                ({preset.realMassSolarDisplay})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Spec Grid */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 bg-[#070b16] rounded-lg border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block font-mono">Mass Range</span>
                        <span className="text-slate-100 font-semibold mt-0.5 block">
                          {def.massRangeDisplay}
                        </span>
                      </div>

                      <div className="p-2.5 bg-[#070b16] rounded-lg border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block font-mono">Event Horizon Scale</span>
                        <span className="text-slate-100 font-semibold mt-0.5 block truncate" title={def.typicalDiameter}>
                          {def.typicalDiameter}
                        </span>
                      </div>

                      <div className="p-2.5 bg-[#070b16] rounded-lg border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block font-mono">Formation Origin</span>
                        <span className="text-slate-200 text-[11px] mt-0.5 block leading-snug">
                          {def.formationMechanism}
                        </span>
                      </div>

                      <div className="p-2.5 bg-[#070b16] rounded-lg border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 block font-mono">Hawking Lifespan</span>
                        <span className="text-amber-300 font-mono text-[11px] mt-0.5 block">
                          {def.hawkingEvaporationTime}
                        </span>
                      </div>
                    </div>

                    {/* Solar Equivalence Explanation */}
                    <div className="mt-2.5 text-xs text-slate-300/90 bg-[#080d1a]/60 px-3 py-1.5 rounded border border-slate-800/60 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>
                        <strong className="text-slate-100">In terms of our Sun:</strong> {def.sunsComparison}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-[#060911]/90 text-xs text-slate-400">
          <span>Active Target: {ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId)?.name || 'Custom'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-900 bg-slate-200 rounded-md hover:bg-white transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
