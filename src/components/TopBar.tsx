import React from 'react';
import { Sparkles, Layers, Activity, Download, Maximize2, Zap, Sun, Eye, EyeOff } from 'lucide-react';
import { ASTROPHYSICAL_PRESETS, BackgroundThemeId, BACKGROUND_THEMES } from '../physics/gravitationalPhysics';

interface TopBarProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  onOpenTheoryModal: () => void;
  onOpenArchetypeModal: () => void;
  onOpenCosmicScaleModal: () => void;
  onOpenBackgroundModal: () => void;
  activeBackgroundTheme: BackgroundThemeId;
  isAnatomyVisible: boolean;
  onToggleAnatomyVisible: () => void;
  onExportSnapshot: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  onOpenTheoryModal,
  onOpenArchetypeModal,
  onOpenCosmicScaleModal,
  onOpenBackgroundModal,
  activeBackgroundTheme,
  isAnatomyVisible,
  onToggleAnatomyVisible,
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
          <span>Black Hole & Stellar Visualizer</span>
        </a>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              activePreset.category === 'star' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-200 font-semibold">{activePreset.name}</span>
          <span className="text-slate-500">·</span>
          <span className={activePreset.category === 'star' ? 'text-emerald-300' : 'text-slate-400'}>
            {activePreset.classification}
          </span>
        </div>
      </div>

      {/* Zone 2: Smart Quick Presets Nav */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-400 py-0.5 px-1 bg-[#090d1a] border border-slate-800/80 rounded-lg">
        {ASTROPHYSICAL_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          const isTon618 = preset.id === 'ton618';
          const isStar = preset.category === 'star';

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`px-2.5 py-1 rounded text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                isActive
                  ? isTon618
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : isStar
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800 text-amber-300 font-semibold'
                  : isTon618
                  ? 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40'
                  : isStar
                  ? 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={preset.solarEquivalence}
            >
              {isTon618 && <Sparkles className="w-3 h-3 text-amber-400" />}
              {isStar && <Zap className="w-3 h-3 text-emerald-400" />}
              <span>{preset.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Anatomy Infographic Lines Toggle */}
        <button
          type="button"
          onClick={onToggleAnatomyVisible}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
            isAnatomyVisible
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
          title="Toggle Black Hole Anatomy Guide & Leader Lines"
        >
          {isAnatomyVisible ? (
            <Eye className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>Anatomy Guide</span>
        </button>

        {/* Soothing Background Environments Picker */}
        <button
          type="button"
          onClick={onOpenBackgroundModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 rounded-md hover:bg-cyan-900/60 hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title={`Active Background: ${BACKGROUND_THEMES[activeBackgroundTheme]?.name || 'Galactic Center'}`}
        >
          <Sun className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Backgrounds</span>
        </button>

        <button
          type="button"
          onClick={onOpenCosmicScaleModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-md hover:bg-amber-900/60 hover:text-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open True Cosmic Scale Explorer (Why TON 618 is 66 Billion Suns)"
        >
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Real Scale</span>
        </button>

        <button
          type="button"
          onClick={onOpenArchetypeModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-950/40 border border-purple-500/40 rounded-md hover:bg-purple-900/60 hover:text-purple-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open Black Hole & Star Archetypes Guide"
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Archetypes</span>
        </button>

        <button
          type="button"
          onClick={onOpenTheoryModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-md hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="View Kerr Spacetime Metrics & Relativistic Potential"
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
