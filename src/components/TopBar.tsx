import React from 'react';
import { Sparkles, Layers, Activity, Download, Maximize2, Zap, Sun, Eye, EyeOff, Settings, Orbit, ChevronDown } from 'lucide-react';
import { ASTROPHYSICAL_PRESETS, BackgroundThemeId, BACKGROUND_THEMES, SystemCategory } from '../physics/gravitationalPhysics';
import { useHaptics } from '../hooks/useHaptics';

interface TopBarProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  systemCategory?: SystemCategory;
  onChangeSystemCategory?: (category: SystemCategory) => void;
  onOpenTheoryModal: () => void;
  onOpenArchetypeModal: () => void;
  onOpenCosmicScaleModal: () => void;
  onOpenBackgroundModal: () => void;
  onOpenSettingsModal?: () => void;
  activeBackgroundTheme: BackgroundThemeId;
  isAnatomyVisible: boolean;
  onToggleAnatomyVisible: () => void;
  onExportSnapshot: () => void;
  isCleanMode?: boolean;
  onToggleCleanMode?: () => void;
  isPhoneMode?: boolean;
  hapticsEnabled?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  systemCategory = 'isolated',
  onChangeSystemCategory,
  onOpenTheoryModal,
  onOpenArchetypeModal,
  onOpenCosmicScaleModal,
  onOpenBackgroundModal,
  onOpenSettingsModal,
  activeBackgroundTheme,
  isAnatomyVisible,
  onToggleAnatomyVisible,
  onExportSnapshot,
  isCleanMode = false,
  onToggleCleanMode,
  isPhoneMode = false,
  hapticsEnabled = true,
}) => {
  const haptics = useHaptics({ enabled: hapticsEnabled });
  const activePreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  return (
    <header className="relative z-20 flex items-center justify-between gap-1.5 sm:gap-4 px-2 sm:px-5 py-1.5 sm:py-2.5 bg-[#05070d]/95 border-b border-neutral-800 overflow-x-auto no-scrollbar">
      {/* Zone 1: Smart Brand, Active Target Badge & System Category Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectPreset('ton618');
          }}
          className="font-display text-sm sm:text-base font-bold tracking-tight text-neutral-200 whitespace-nowrap hover:text-amber-300 transition-colors flex items-center gap-1.5"
        >
          <span>Kerr</span>
          <span className={isPhoneMode ? 'hidden sm:inline' : 'inline'}>Visualizer</span>
        </a>

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] font-mono">
          <span className="text-neutral-200 font-semibold">{activePreset.name}</span>
          <span className="text-neutral-600">·</span>
          <span className={activePreset.category === 'star' ? 'text-emerald-400' : 'text-neutral-400'}>
            {activePreset.classification}
          </span>
        </div>

        {/* Main System Category Dropdown: Isolated Singularity vs Binary Accretion (Roche Lobe Overflow) */}
        {onChangeSystemCategory && (
          <div className="relative flex items-center">
            <Orbit className="w-3.5 h-3.5 text-amber-400 absolute left-2 pointer-events-none" />
            <select
              aria-label="System Category"
              value={systemCategory}
              onChange={(e) => {
                haptics.medium();
                onChangeSystemCategory(e.target.value as SystemCategory);
              }}
              className="pl-6 pr-5 sm:pl-7 sm:pr-6 py-1 text-[11px] sm:text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-amber-200 border border-amber-500/40 hover:border-amber-400 rounded-md transition-colors cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-amber-400/50"
              title="Switch System Category between an Isolated Singularity and a Binary Accretion System (Roche Lobe Overflow)"
            >
              <option value="isolated" className="bg-neutral-950 text-neutral-200">
                {isPhoneMode ? 'Isolated' : 'Isolated Singularity'}
              </option>
              <option value="binary" className="bg-neutral-950 text-amber-200">
                {isPhoneMode ? 'Binary' : 'Binary Accretion'}
              </option>
            </select>
            <ChevronDown className="w-3 h-3 text-amber-400/80 absolute right-1.5 pointer-events-none" />
          </div>
        )}
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
              onClick={() => {
                haptics.medium();
                onSelectPreset(preset.id);
              }}
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
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Clean View / Hide UI Toggle */}
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onToggleCleanMode?.();
          }}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border bg-amber-500/15 text-amber-200 border-amber-500/40 hover:text-white hover:bg-amber-500/25 hover:border-amber-400 shadow-sm"
          title="Hide all UI elements for an unobstructed clean view (Shortcut: C / ESC)"
        >
          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Hide UI</span>
        </button>

        {/* Anatomy Infographic Lines Toggle */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onToggleAnatomyVisible();
          }}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
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
          <span className="hidden sm:inline">Anatomy Guide</span>
        </button>

        {/* Soothing Background Environments Picker */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenBackgroundModal();
          }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title={`Active Background: ${BACKGROUND_THEMES[activeBackgroundTheme]?.name || 'Galactic Center'}`}
        >
          <Sun className="w-3.5 h-3.5 text-neutral-400" />
          <span>Backgrounds</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenCosmicScaleModal();
          }}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open True Cosmic Scale Explorer (Why TON 618 is 66 Billion Suns)"
        >
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>Real Scale</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenArchetypeModal();
          }}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open Black Hole & Star Archetypes Guide"
        >
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>Archetypes</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenTheoryModal();
          }}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="View Kerr Spacetime Metrics & Relativistic Potential"
        >
          <Activity className="w-3.5 h-3.5 text-neutral-400" />
          <span>Metrics</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenSettingsModal?.();
          }}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
            isPhoneMode
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-amber-300 hover:border-neutral-700'
          }`}
          title="Open Visualizer Settings & Preferences (Phone Mode)"
        >
          <Settings className={`w-3.5 h-3.5 ${isPhoneMode ? 'text-emerald-400' : 'text-amber-400/90'}`} />
          <span className="hidden sm:inline">Settings</span>
          {isPhoneMode && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PHONE</span>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.success();
            onExportSnapshot();
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold text-neutral-200 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Export high-resolution PNG snapshot"
        >
          <Download className="w-3 h-3 text-amber-400/90" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
