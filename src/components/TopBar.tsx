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
  isCleanMode?: boolean;
  onToggleCleanMode?: () => void;
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
  isCleanMode = false,
  onToggleCleanMode,
}) => {
  const activePreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-2.5 bg-black/95 backdrop-blur-md border-b border-neutral-800">
      {/* Zone 1: Smart Brand & Active Target Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectPreset('ton618');
          }}
          className="font-display text-base font-bold tracking-tight text-neutral-200 whitespace-nowrap hover:text-amber-300 transition-colors flex items-center gap-2"
        >
          <span>Black Hole & Stellar Visualizer</span>
        </a>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              activePreset.category === 'star' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="text-neutral-200 font-semibold">{activePreset.name}</span>
          <span className="text-neutral-600">·</span>
          <span className={activePreset.category === 'star' ? 'text-emerald-400' : 'text-neutral-400'}>
            {activePreset.classification}
          </span>
        </div>
      </div>

      {/* Zone 2: Smart Quick Presets Nav */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-neutral-400 py-0.5 px-1 bg-neutral-950 border border-neutral-800/90 rounded-lg">
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
                  ? 'bg-neutral-800 text-amber-300 font-medium border border-neutral-700/80'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
              title={preset.solarEquivalence}
            >
              {isTon618 && <Sparkles className="w-3 h-3 text-amber-400/80" />}
              {isStar && <Zap className="w-3 h-3 text-emerald-400/80" />}
              <span>{preset.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Clean View Toggle */}
        <button
          type="button"
          onClick={onToggleCleanMode}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white hover:bg-neutral-800 hover:border-neutral-700"
          title="Clean View: Hide all UI elements for an unobstructed cinematic view (Shortcut: C / ESC)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Clean View</span>
        </button>

        {/* Anatomy Infographic Lines Toggle */}
        <button
          type="button"
          onClick={onToggleAnatomyVisible}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
            isAnatomyVisible
              ? 'bg-neutral-800 text-amber-300 border-neutral-700 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-850'
          }`}
          title="Toggle Black Hole Anatomy Guide & Leader Lines"
        >
          {isAnatomyVisible ? (
            <Eye className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
          )}
          <span>Anatomy Guide</span>
        </button>

        {/* Soothing Background Environments Picker */}
        <button
          type="button"
          onClick={onOpenBackgroundModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title={`Active Background: ${BACKGROUND_THEMES[activeBackgroundTheme]?.name || 'Galactic Center'}`}
        >
          <Sun className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Backgrounds</span>
        </button>

        <button
          type="button"
          onClick={onOpenCosmicScaleModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open True Cosmic Scale Explorer (Why TON 618 is 66 Billion Suns)"
        >
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Real Scale</span>
        </button>

        <button
          type="button"
          onClick={onOpenArchetypeModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open Black Hole & Star Archetypes Guide"
        >
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Archetypes</span>
        </button>

        <button
          type="button"
          onClick={onOpenTheoryModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="View Kerr Spacetime Metrics & Relativistic Potential"
        >
          <Activity className="w-3.5 h-3.5 text-neutral-400" />
          <span>Metrics</span>
        </button>

        <button
          type="button"
          onClick={onExportSnapshot}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-neutral-200 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Export high-resolution PNG snapshot"
        >
          <Download className="w-3 h-3 text-amber-400/90" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
