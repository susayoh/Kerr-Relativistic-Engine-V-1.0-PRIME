import React from 'react';
import { X, Sparkles, Orbit, Scale, Globe, Zap, Shield } from 'lucide-react';
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

  const blackHoleArchetypes: BlackHoleArchetype[] = [
    'ultramassive',
    'supermassive',
    'intermediate',
    'stellar',
    'primordial',
  ];

  const starArchetypes: BlackHoleArchetype[] = ['neutron_star', 'magnetar'];

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
              Cosmic Archetypes: Black Holes vs Compact Stars
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              From microscopic Big Bang relics and city-sized neutron stars to titans like TON 618
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
          {/* Key Physics Comparison Banner: Horizon vs Solid Crust */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-[#0d1424] to-amber-950/40 border border-emerald-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Core Distinction: Why Neutron Stars Have a Solid Crust, But Black Holes Have an Event Horizon</span>
            </div>
            <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="p-3 bg-[#080d19]/80 rounded border border-emerald-500/30">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Compact Stars (Neutron Stars & Magnetars)</span>
                </div>
                <p className="text-slate-300 mt-1.5 text-[11px] leading-relaxed">
                  When a massive star runs out of nuclear fuel, gravity crushes its core down to atomic densities. In a neutron star (1.4–2.1 M☉), quantum <strong>neutron degeneracy pressure</strong> halts the collapse, creating an incandescent <strong>solid crystalline crust</strong> 20 km wide. Because its physical radius is larger than its Schwarzschild radius (R &gt; Rs), <em>no event horizon forms</em>, and the spacetime well bottoms out at the crust!
                </p>
              </div>

              <div className="p-3 bg-[#080d19]/80 rounded border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold font-mono">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Black Holes (Beyond the TOV Limit)</span>
                </div>
                <p className="text-slate-300 mt-1.5 text-[11px] leading-relaxed">
                  If the collapsing core exceeds the <strong>Tolman-Oppenheimer-Volkoff (TOV) limit (~2.17 M☉)</strong>, no known physical force in nature can stop gravity. The matter collapses down through its own Schwarzschild radius, forming a causal <strong>event horizon</strong> from which even light cannot escape, and a bottomless spacetime throat plunging toward a singularity.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: COMPACT STARS & REMNANTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Compact Stars & Superdense Remnants</span>
              </h3>
              <span className="text-xs text-slate-400">Physical Crust · 20 km footprint</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {starArchetypes.map((archetypeKey) => {
                const def = ARCHETYPE_DEFINITIONS[archetypeKey];
                const matchingPresets = ASTROPHYSICAL_PRESETS.filter(
                  (p) => p.archetype === archetypeKey
                );

                return (
                  <div
                    key={def.id}
                    className="p-4 rounded-xl border bg-gradient-to-br from-[#061214] via-[#09131a] to-[#070b16] border-emerald-500/40 shadow-lg shadow-emerald-950/20"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded border ${def.badgeBg}`}
                          >
                            {def.name}
                          </span>
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
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow'
                                  : 'bg-[#111827] text-slate-200 border-slate-700 hover:border-emerald-400 hover:text-white'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5 text-emerald-400" />
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
                        <span className="text-[11px] text-slate-400 block font-mono">Surface Scale</span>
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
                        <span className="text-[11px] text-slate-400 block font-mono">Magnetic / Pulsar Power</span>
                        <span className="text-emerald-300 font-mono text-[11px] mt-0.5 block">
                          10¹² to 10¹⁵ Gauss
                        </span>
                      </div>
                    </div>

                    {/* Solar Equivalence Explanation */}
                    <div className="mt-2.5 text-xs text-slate-300/90 bg-[#080d1a]/60 px-3 py-1.5 rounded border border-slate-800/60 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-slate-100">In terms of our Sun:</strong> {def.sunsComparison}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: THE 5 BLACK HOLE ARCHETYPES */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>The 5 Black Hole Archetypes</span>
              </h3>
              <span className="text-xs text-slate-400">Event Horizon Boundaries</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {blackHoleArchetypes.map((archetypeKey) => {
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
                              User Favorite · 66 Billion Suns
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
