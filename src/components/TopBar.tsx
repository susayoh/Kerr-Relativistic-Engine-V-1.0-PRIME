import React from 'react';
import { Sparkles, Layers, Activity, Download, Maximize2, Zap, Sun, Eye, EyeOff, Settings, Orbit, ChevronDown, BookOpen, Video, Square, Columns2 } from 'lucide-react';
import { ASTROPHYSICAL_PRESETS, BackgroundThemeId, BACKGROUND_THEMES, SystemCategory } from '../physics/gravitationalPhysics';
import { UiThemeId } from '../scene/BlackHoleScene';
import { useHaptics } from '../hooks/useHaptics';
import { AppLanguage, TRANSLATIONS } from '../i18n/translations';

interface TopBarProps {
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  systemCategory?: SystemCategory;
  onChangeSystemCategory?: (category: SystemCategory) => void;
  onOpenTheoryModal: () => void;
  onOpenQuickGuideModal?: () => void;
  onOpenArchetypeModal: () => void;
  onOpenCosmicScaleModal: () => void;
  onOpenBackgroundModal: () => void;
  onOpenSettingsModal?: () => void;
  activeBackgroundTheme: BackgroundThemeId;
  isAnatomyVisible: boolean;
  onToggleAnatomyVisible: () => void;
  onExportSnapshot: () => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecording?: () => void;
  isCleanMode?: boolean;
  onToggleCleanMode?: () => void;
  isCompareMode?: boolean;
  onToggleCompareMode?: () => void;
  isPerfMonitorVisible?: boolean;
  onTogglePerfMonitor?: () => void;
  isPhoneMode?: boolean;
  hapticsEnabled?: boolean;
  language?: AppLanguage;
  uiTheme?: UiThemeId;
  onOpenChangelogModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activePresetId,
  onSelectPreset,
  systemCategory = 'isolated',
  onChangeSystemCategory,
  onOpenTheoryModal,
  onOpenQuickGuideModal,
  onOpenArchetypeModal,
  onOpenCosmicScaleModal,
  onOpenBackgroundModal,
  onOpenSettingsModal,
  activeBackgroundTheme,
  isAnatomyVisible,
  onToggleAnatomyVisible,
  onExportSnapshot,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecording,
  isCleanMode = false,
  onToggleCleanMode,
  isCompareMode = false,
  onToggleCompareMode,
  isPerfMonitorVisible = false,
  onTogglePerfMonitor,
  isPhoneMode = false,
  hapticsEnabled = true,
  language = 'en',
  uiTheme = 'kerr_claude',
  onOpenChangelogModal,
}) => {
  const haptics = useHaptics({ enabled: hapticsEnabled });
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const activePreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  const isClaude = uiTheme === 'kerr_claude';
  const isCryo = uiTheme === 'cryo_quantum';

  return (
    <header
      className={`hud-panel relative z-20 flex items-center justify-between gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 border-b shadow-[0_4px_24px_rgba(0,0,0,0.75)] overflow-x-auto no-scrollbar transition-colors ${
        isClaude
          ? 'bg-[#110e0c]/95 border-[#382c26]'
          : isCryo
          ? 'bg-[#050b14]/95 border-sky-500/35'
          : 'bg-[#050811]/95 border-amber-500/35'
      }`}
    >
      {/* Zone 1: Theme-Responsive Brand Selector, Active Target Badge & System Category Dropdown */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className={`group flex items-center gap-2.5 px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all ${
            isClaude
              ? 'bg-[#181411] hover:bg-[#211b17] border-[#3d3029] hover:border-[#D97757]/70 shadow-[0_2px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,248,240,0.06)]'
              : isCryo
              ? 'bg-[#0a1322] hover:bg-[#0f1c30] border-sky-500/40 hover:border-sky-400 shadow-[0_2px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(125,211,252,0.1)]'
              : 'bg-[#090e1c] hover:bg-[#10182d] border-amber-500/40 hover:border-amber-400 shadow-[0_2px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(251,191,36,0.08)]'
          }`}
        >
          {/* Theme-Responsive Starburst / Singularity Emblem */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onSelectPreset('ton618');
            }}
            title="Kerr Engine — Reset to TON 618"
            className={`relative flex items-center justify-center w-7 h-7 rounded-md border transition-all shrink-0 cursor-pointer ${
              isClaude
                ? 'bg-[#221b17] border-[#D97757]/55 shadow-[0_0_14px_rgba(217,119,87,0.28)] group-hover:border-[#E89578]'
                : isCryo
                ? 'bg-[#0d1b30] border-sky-400/55 shadow-[0_0_14px_rgba(56,189,248,0.28)] group-hover:border-sky-300'
                : 'bg-[#131b2e] border-amber-400/55 shadow-[0_0_14px_rgba(245,158,11,0.28)] group-hover:border-amber-300'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 group-hover:scale-105 transition-transform ${
                isClaude
                  ? 'text-[#E08263] drop-shadow-[0_0_6px_rgba(217,119,87,0.55)]'
                  : isCryo
                  ? 'text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.55)]'
                  : 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.55)]'
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3L5.3 18.7" />
              <path d="M8.4 3.2l7.2 17.6M15.6 3.2L8.4 20.8M3.2 8.4l17.6 7.2M3.2 15.6l17.6-7.2" strokeWidth="1.4" opacity="0.8" />
              <circle
                cx="12"
                cy="12"
                r="2.6"
                className={
                  isClaude
                    ? 'fill-[#1F1B18] stroke-[#F4B097]'
                    : isCryo
                    ? 'fill-[#091526] stroke-sky-200'
                    : 'fill-[#0f172a] stroke-amber-200'
                }
                strokeWidth="1.75"
              />
            </svg>
          </button>

          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onSelectPreset('ton618');
                }}
                title="Kerr Engine — Reset to TON 618"
                className={`font-display text-sm sm:text-[15px] font-bold tracking-[0.06em] transition-colors cursor-pointer ${
                  isClaude
                    ? 'text-[#F7F4EE] drop-shadow-[0_0_10px_rgba(244,241,234,0.28)]'
                    : isCryo
                    ? 'text-sky-50 drop-shadow-[0_0_10px_rgba(56,189,248,0.28)]'
                    : 'text-amber-50 drop-shadow-[0_0_10px_rgba(245,158,11,0.28)]'
                }`}
              >
                Kerr Engine
              </button>
              <button
                type="button"
                data-testid="topbar-changelog-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  onOpenChangelogModal?.();
                }}
                title="View Kerr Engine [v1.4] Release Changelog"
                className={`inline-flex items-center justify-center px-1.5 py-[2px] rounded-[4px] border font-mono text-[9.5px] font-bold tracking-[0.08em] leading-none transition-all cursor-pointer ${
                  isClaude
                    ? 'bg-[#241C18] hover:bg-[#332620] border-[#D97757]/75 hover:border-[#F4A688] text-[#F4A688] shadow-[0_0_10px_rgba(217,119,87,0.28)]'
                    : isCryo
                    ? 'bg-sky-950/80 hover:bg-sky-900/80 border-sky-400/75 hover:border-sky-300 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                    : 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-400/75 hover:border-amber-300 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                }`}
              >
                v1.4
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isClaude
                    ? 'bg-[#D97757] shadow-[0_0_7px_rgba(217,119,87,0.9)]'
                    : isCryo
                    ? 'bg-sky-400 shadow-[0_0_7px_rgba(56,189,248,0.9)]'
                    : 'bg-amber-400 shadow-[0_0_7px_rgba(245,158,11,0.9)]'
                }`}
              />
              <span
                className={`font-mono text-[9.5px] font-bold tracking-[0.08em] transition-colors ${
                  isClaude
                    ? 'text-[#E89578]'
                    : isCryo
                    ? 'text-sky-300'
                    : 'text-amber-300'
                }`}
              >
                {isClaude
                  ? 'Apex Metric Core'
                  : isCryo
                  ? 'Cryo-Optic Quantum'
                  : 'EHT Observatory'}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono tracking-wider shadow-inner ${
            isClaude
              ? 'bg-[#161310] border-[#332924]'
              : isCryo
              ? 'bg-[#091220] border-sky-500/30'
              : 'bg-[#090e1c] border-amber-500/30'
          }`}
        >
          <span className="text-[#F4F1EA] font-bold">{activePreset.name}</span>
          <span className="text-neutral-600">·</span>
          <span
            className={
              activePreset.category === 'star'
                ? 'text-emerald-400 font-semibold'
                : activePreset.category === 'luminous_star'
                ? 'text-indigo-400 font-semibold'
                : isClaude
                ? 'text-[#E89578] font-medium'
                : isCryo
                ? 'text-sky-300 font-medium'
                : 'text-amber-300 font-medium'
            }
          >
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
                {isPhoneMode ? t.isolatedShort : t.isolatedSingularity}
              </option>
              <option value="binary" className="bg-neutral-950 text-amber-200">
                {isPhoneMode ? t.binaryShort : t.binaryAccretion}
              </option>
            </select>
            <ChevronDown className="w-3 h-3 text-amber-400/80 absolute right-1.5 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Zone 2: Smart Quick Presets Nav */}
      <nav className="hidden 2xl:flex items-center gap-1 text-xs font-medium text-neutral-400 py-0.5 px-1 bg-neutral-950 border border-neutral-800/90 rounded-lg overflow-x-auto no-scrollbar max-w-xl">
        {ASTROPHYSICAL_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          const isTon618 = preset.id === 'ton618';
          const isCompactStar = preset.category === 'star';
          const isLuminousStar = preset.category === 'luminous_star';

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                haptics.medium();
                onSelectPreset(preset.id);
              }}
              className={`px-2 py-1 rounded text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                isActive
                  ? 'bg-neutral-800 text-amber-300 font-medium border border-neutral-700/80'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
              title={preset.solarEquivalence}
            >
              {isTon618 && <Sparkles className="w-3 h-3 text-amber-400/80" />}
              {isCompactStar && <Zap className="w-3 h-3 text-emerald-400/80" />}
              {isLuminousStar && <Sun className="w-3 h-3 text-indigo-400/80" />}
              <span>{preset.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Side-by-Side Compare Mode Toggle */}
        {onToggleCompareMode && (
          <button
            type="button"
            data-testid="topbar-compare-btn"
            onClick={() => {
              haptics.medium();
              onToggleCompareMode();
            }}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              isCompareMode
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)] font-bold'
                : 'bg-neutral-900 text-cyan-300 border-cyan-500/40 hover:text-white hover:bg-neutral-800 hover:border-cyan-400'
            }`}
            title="Toggle Side-by-Side Compare Mode to contrast two black hole presets with synchronized physics parameters"
          >
            <Columns2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Compare</span>
          </button>
        )}

        {/* Clean View / Hide UI Toggle */}
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onToggleCleanMode?.();
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border bg-amber-500/15 text-amber-200 border-amber-500/40 hover:text-white hover:bg-amber-500/25 hover:border-amber-400 shadow-sm"
          title="Hide all UI elements for an unobstructed clean view (Shortcut: C / ESC)"
        >
          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">{t.hideUi}</span>
        </button>

        {/* Anatomy Infographic Lines Toggle */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onToggleAnatomyVisible();
          }}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
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
          <span className="hidden sm:inline">{t.anatomyGuide}</span>
        </button>

        {/* Soothing Background Environments Picker */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenBackgroundModal();
          }}
          className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title={`Active Background: ${BACKGROUND_THEMES[activeBackgroundTheme]?.name || 'Galactic Center'}`}
        >
          <Sun className="w-3.5 h-3.5 text-neutral-400" />
          <span>{t.backgrounds}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenCosmicScaleModal();
          }}
          className="hidden md:flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open True Cosmic Scale Explorer (Why TON 618 is 66 Billion Suns)"
        >
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>{t.realScale}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenArchetypeModal();
          }}
          className="hidden lg:flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:bg-neutral-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open Black Hole & Star Archetypes Guide"
        >
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>{t.archetypes}</span>
        </button>

        {onOpenQuickGuideModal && (
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onOpenQuickGuideModal();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-200 bg-neutral-900 border border-amber-500/40 rounded-md hover:bg-neutral-800 hover:text-amber-100 hover:border-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Open Plain-English Physics Quick-Guide (Simple Analogies for Spin, Accretion Rate & Well Depth)"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.quickGuide}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenTheoryModal();
          }}
          className="hidden xl:flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-md hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="View Kerr Spacetime Metrics & Relativistic Potential"
        >
          <Activity className="w-3.5 h-3.5 text-neutral-400" />
          <span>{t.metrics}</span>
        </button>

        {/* Three.js Performance Monitor Toggle */}
        {onTogglePerfMonitor && (
          <button
            type="button"
            data-testid="topbar-perf-monitor-btn"
            onClick={() => {
              haptics.light();
              onTogglePerfMonitor();
            }}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              isPerfMonitorVisible
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 font-semibold'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white hover:bg-neutral-800'
            }`}
            title="Toggle Three.js Performance Monitor (Frame Time, Draw Calls, GPU Memory & Shader Bottleneck Diagnostics)"
          >
            <Activity
              className={`w-3.5 h-3.5 ${
                isPerfMonitorVisible ? 'text-emerald-400' : 'text-neutral-400'
              }`}
            />
            <span className="hidden sm:inline">Perf</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenSettingsModal?.();
          }}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
            isPhoneMode
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-amber-300 hover:border-neutral-700'
          }`}
          title="Open Visualizer Settings & Preferences (Phone Mode)"
        >
          <Settings className={`w-3.5 h-3.5 ${isPhoneMode ? 'text-emerald-400' : 'text-amber-400/90'}`} />
          <span className="hidden sm:inline">{t.settings}</span>
          {isPhoneMode && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 font-bold" title="Phone Mode Active">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">PHONE</span>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.success();
            onExportSnapshot();
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-neutral-200 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Export high-resolution PNG snapshot"
        >
          <Download className="w-3 h-3 text-amber-400/90" />
          <span className="hidden 2xl:inline">{t.exportSnapshot}</span>
        </button>

        {onToggleRecording && (
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onToggleRecording();
            }}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              isRecording
                ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.4)]'
                : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700 hover:text-white'
            }`}
            title={
              isRecording
                ? 'Stop recording and download video file'
                : 'Record high-bitrate video of the simulation'
            }
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                <span className="font-mono text-[11px]">
                  {t.stopRecording} {Math.floor(recordingSeconds / 60)}:
                  {(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden 2xl:inline">{t.recordVideo}</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
