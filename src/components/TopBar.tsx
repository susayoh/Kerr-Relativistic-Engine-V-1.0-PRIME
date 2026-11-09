import React from 'react';
import { Sparkles, Layers, Activity, Download } from 'lucide-react';
import { ASTROPHYSICAL_PRESETS } from '../physics/gravitationalPhysics';

interface TopBarProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onOpenTheoryModal: () => void;
  onOpenArchetypeModal: () => void;
  onExportSnapshot: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  onOpenTheoryModal,
  onOpenArchetypeModal,
  onExportSnapshot,
}) => {
  const activePreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-2.5 bg-[#050811]/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Smart Brand & Active Target Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectPreset('ton618');
          }}
          className="font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap hover:text-amber-400 transition-colors flex items-center gap-2"
        >
          <span>Black Hole Visualizer</span>
        </a>

        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-slate-300 font-semibold">{activePreset.name}</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{activePreset.classification}</span>
        </div>
      </div>

      {/* Zone 2: Smart Quick Presets Nav */}
      <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-400 py-0.5 px-1 bg-[#090d1a] border border-slate-800/80 rounded-lg">
        {ASTROPHYSICAL_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          const isTon618 = preset.id === 'ton618';
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`px-2.5 py-1 rounded text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                isActive
                  ? isTon618
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800 text-amber-300 font-semibold'
                  : isTon618
                  ? 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={preset.solarEquivalence}
            >
              {isTon618 && <Sparkles className="w-3 h-3 text-amber-400" />}
              <span>{preset.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Smart Minimal Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenArchetypeModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-950/40 border border-purple-500/40 rounded-md hover:bg-purple-900/60 hover:text-purple-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open Black Hole Archetypes & Solar Mass Guide"
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Archetypes</span>
        </button>

        <button
          type="button"
          onClick={onOpenTheoryModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-md hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="View Kerr Spacetime Metrics & Effective Potential"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Metrics</span>
        </button>

        <button
          type="button"
          onClick={onExportSnapshot}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-500 rounded-md hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Export high-resolution PNG snapshot"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
