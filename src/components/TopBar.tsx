import React from 'react';
import {
  Layers,
  Activity,
  Download,
  Maximize2,
  Sun,
  Eye,
  EyeOff,
  Settings,
  Orbit,
  ChevronDown,
  BookOpen,
  Video,
  Square,
  Columns2,
} from 'lucide-react';
import {
  BackgroundThemeId,
  BACKGROUND_THEMES,
  SystemCategory,
} from '../physics/gravitationalPhysics';
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
  isCompareMode = false,
  onToggleCompareMode,
  isPerfMonitorVisible = false,
  onTogglePerfMonitor,
  isPhoneMode = false,
  hapticsEnabled = true,
  language = 'en',
  uiTheme = 'observatory_gold',
  onOpenChangelogModal,
  onToggleCleanMode,
}) => {
  const haptics = useHaptics({ enabled: hapticsEnabled });
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const isObsidian = uiTheme === 'kerr_claude';
  const isPlanck = uiTheme === 'cryo_quantum';

  // Uniform theme-bound button & control classes
  const btnInactiveClass = isObsidian
    ? 'bg-[#120e0c] hover:bg-[#1a1412] text-[#e6d5b8] hover:text-[#f7f4ee] border-[#D97757]/25 hover:border-[#D97757]/55'
    : isPlanck
    ? 'bg-[#080d0b] hover:bg-[#0e1713] text-emerald-100/85 hover:text-emerald-50 border-emerald-500/25 hover:border-emerald-400/55'
    : 'bg-[#0b0b0e] hover:bg-[#141418] text-zinc-300 hover:text-zinc-100 border-zinc-700/60 hover:border-zinc-500';

  const btnActiveClass = isObsidian
    ? 'bg-[#D97757]/20 text-[#f7f4ee] border-[#D97757]/70 shadow-[0_0_12px_rgba(217,119,87,0.2)] font-semibold'
    : isPlanck
    ? 'bg-emerald-500/18 text-emerald-50 border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-semibold'
    : 'bg-zinc-200/12 text-zinc-50 border-[#D4AF37]/65 shadow-[0_0_12px_rgba(212,175,55,0.16)] font-semibold';

  const iconAccentClass = isObsidian
    ? 'text-[#D97757]'
    : isPlanck
    ? 'text-emerald-400'
    : 'text-[#D4AF37]';

  const iconMutedClass = isObsidian
    ? 'text-[#c9bfb5]/80'
    : isPlanck
    ? 'text-emerald-300/70'
    : 'text-zinc-400';

  return (
    <header
      className={`hud-panel relative z-20 flex items-center justify-between gap-2 px-2.5 sm:px-3.5 py-1.5 border-b shadow-[0_4px_24px_rgba(0,0,0,0.9)] transition-colors ${
        isObsidian
          ? 'bg-[#080605]/96 border-[#D97757]/25'
          : isPlanck
          ? 'bg-[#030504]/96 border-emerald-500/25'
          : 'bg-[#050506]/96 border-zinc-800/80'
      }`}
    >
      {/* Zone 1: Compact Brand Selector & System Category Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div
          className={`group flex items-center gap-1.5 px-2 py-1 rounded-md border whitespace-nowrap transition-all ${
            isObsidian
              ? 'bg-[#120e0c] hover:bg-[#1a1412] border-[#D97757]/30 hover:border-[#D97757]/60'
              : isPlanck
              ? 'bg-[#080d0b] hover:bg-[#0e1713] border-emerald-500/30 hover:border-emerald-400/60'
              : 'bg-[#0a0a0c] hover:bg-[#121216] border-zinc-700/65 hover:border-zinc-500'
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
            className={`relative flex items-center justify-center w-5 h-5 rounded border transition-all shrink-0 cursor-pointer ${
              isObsidian
                ? 'bg-[#1a1412] border-[#D97757]/50 group-hover:border-[#E89578]'
                : isPlanck
                ? 'bg-[#0c1410] border-emerald-400/50 group-hover:border-emerald-300'
                : 'bg-[#121216] border-zinc-500/55 group-hover:border-[#D4AF37]'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`w-3.5 h-3.5 group-hover:scale-105 transition-transform ${
                isObsidian
                  ? 'text-[#E08263]'
                  : isPlanck
                  ? 'text-emerald-400'
                  : 'text-[#D4AF37]'
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3L5.3 18.7" />
              <path
                d="M8.4 3.2l7.2 17.6M15.6 3.2L8.4 20.8M3.2 8.4l17.6 7.2M3.2 15.6l17.6-7.2"
                strokeWidth="1.4"
                opacity="0.8"
              />
              <circle
                cx="12"
                cy="12"
                r="2.6"
                className={
                  isObsidian
                    ? 'fill-[#171210] stroke-[#F4B097]'
                    : isPlanck
                    ? 'fill-[#060b09] stroke-emerald-200'
                    : 'fill-[#09090b] stroke-zinc-100'
                }
                strokeWidth="1.75"
              />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 leading-none">
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onSelectPreset('ton618');
              }}
              title="Kerr Engine — Reset to TON 618"
              className={`font-display text-xs font-bold tracking-[0.05em] transition-colors cursor-pointer ${
                isObsidian
                  ? 'text-[#F7F4EE]'
                  : isPlanck
                  ? 'text-emerald-50'
                  : 'text-zinc-50'
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
              className={`inline-flex items-center justify-center px-1.5 py-[1.5px] rounded-[3px] border font-mono text-[9px] font-bold tracking-[0.06em] leading-none transition-all cursor-pointer ${
                isObsidian
                  ? 'bg-[#201815] hover:bg-[#2c201c] border-[#D97757]/60 text-[#F4A688]'
                  : isPlanck
                  ? 'bg-emerald-950/70 hover:bg-emerald-900/70 border-emerald-400/60 text-emerald-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-[#D4AF37]/55 text-[#D4AF37]'
              }`}
            >
              v1.4
            </button>
          </div>
        </div>

        {/* Main System Category Dropdown: Isolated Singularity vs Binary Accretion */}
        {onChangeSystemCategory && (
          <div className="relative flex items-center">
            <Orbit className={`w-3.5 h-3.5 ${iconAccentClass} absolute left-2 pointer-events-none`} />
            <select
              aria-label="System Category"
              value={systemCategory}
              onChange={(e) => {
                haptics.medium();
                onChangeSystemCategory(e.target.value as SystemCategory);
              }}
              className={`h-7 pl-6 pr-5 text-[11px] font-mono font-medium rounded-md border transition-colors cursor-pointer appearance-none outline-none ${btnInactiveClass}`}
              title="Switch System Category between an Isolated Singularity and a Binary Accretion System (Roche Lobe Overflow)"
            >
              <option value="isolated" className="bg-[#050506] text-zinc-200">
                {isPhoneMode ? t.isolatedShort : t.isolatedSingularity}
              </option>
              <option value="binary" className="bg-[#050506] text-zinc-200">
                {isPhoneMode ? t.binaryShort : t.binaryAccretion}
              </option>
            </select>
            <ChevronDown className={`w-3 h-3 ${iconMutedClass} absolute right-1.5 pointer-events-none`} />
          </div>
        )}
      </div>

      {/* Zone 2 & 3: Well-Spaced Navigation & Always-Accessible Right Utility Controls */}
      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 font-mono">
        {/* Scrollable / Responsive Exploration & Guides Toolbar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Side-by-Side Compare Mode Toggle */}
          {onToggleCompareMode && (
            <button
              type="button"
              data-testid="topbar-compare-btn"
              onClick={() => {
                haptics.medium();
                onToggleCompareMode();
              }}
              className={`h-7 flex items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                isCompareMode ? btnActiveClass : btnInactiveClass
              }`}
              title="Toggle Side-by-Side Compare Mode to contrast two black hole presets with synchronized physics parameters"
            >
              <Columns2 className={`w-3.5 h-3.5 ${iconAccentClass}`} />
              <span className="hidden md:inline">Compare</span>
            </button>
          )}

          {/* Anatomy Infographic Lines Toggle */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onToggleAnatomyVisible();
            }}
            className={`h-7 flex items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              isAnatomyVisible ? btnActiveClass : btnInactiveClass
            }`}
            title="Toggle Black Hole Anatomy Guide & Leader Lines"
          >
            {isAnatomyVisible ? (
              <Eye className={`w-3.5 h-3.5 ${iconAccentClass}`} />
            ) : (
              <EyeOff className={`w-3.5 h-3.5 ${iconMutedClass}`} />
            )}
            <span className="hidden lg:inline 2xl:hidden">Anatomy</span>
            <span className="hidden 2xl:inline">{t.anatomyGuide}</span>
          </button>

          {/* Background Environments Picker */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onOpenBackgroundModal();
            }}
            className={`hidden sm:flex h-7 items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
            title={`Active Background: ${
              BACKGROUND_THEMES[activeBackgroundTheme]?.name || 'Pure Black with Stars'
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${iconMutedClass}`} />
            <span className="hidden lg:inline">{t.backgrounds}</span>
          </button>

          {/* Real Scale Explorer */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onOpenCosmicScaleModal();
            }}
            className={`hidden md:flex h-7 items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
            title="Open True Cosmic Scale Explorer (Why TON 618 is 66 Billion Suns)"
          >
            <Maximize2 className={`w-3.5 h-3.5 ${iconMutedClass}`} />
            <span className="hidden xl:inline 2xl:hidden">Scale</span>
            <span className="hidden 2xl:inline">{t.realScale}</span>
          </button>

          {/* Archetypes Guide */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onOpenArchetypeModal();
            }}
            className={`hidden lg:flex h-7 items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
            title="Open Black Hole & Star Archetypes Guide"
          >
            <Layers className={`w-3.5 h-3.5 ${iconMutedClass}`} />
            <span className="hidden xl:inline">{t.archetypes}</span>
          </button>

          {/* Physics Quick-Guide */}
          {onOpenQuickGuideModal && (
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onOpenQuickGuideModal();
              }}
              className={`h-7 flex items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
              title="Open Plain-English Physics Quick-Guide (Simple Analogies for Spin, Accretion Rate & Well Depth)"
            >
              <BookOpen className={`w-3.5 h-3.5 ${iconAccentClass}`} />
              <span className="hidden xl:inline 2xl:hidden">Guide</span>
              <span className="hidden 2xl:inline">{t.quickGuide}</span>
            </button>
          )}

          {/* Spacetime Metrics Modal */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onOpenTheoryModal();
            }}
            className={`hidden lg:flex h-7 items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
            title="View Kerr Spacetime Metrics & Relativistic Potential"
          >
            <Activity className={`w-3.5 h-3.5 ${iconMutedClass}`} />
            <span className="hidden xl:inline">{t.metrics}</span>
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
              className={`h-7 flex items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                isPerfMonitorVisible ? btnActiveClass : btnInactiveClass
              }`}
              title="Toggle Three.js Performance Monitor (Frame Time, Draw Calls, GPU Memory & Shader Bottleneck Diagnostics)"
            >
              <Activity
                className={`w-3.5 h-3.5 ${
                  isPerfMonitorVisible ? iconAccentClass : iconMutedClass
                }`}
              />
              <span className="hidden md:inline">Perf</span>
            </button>
          )}
        </div>

        {/* Subtle Vertical Divider before Pinned Right Controls */}
        <div
          className={`h-4 w-px shrink-0 ${
            isObsidian
              ? 'bg-[#D97757]/25'
              : isPlanck
              ? 'bg-emerald-500/25'
              : 'bg-zinc-800'
          }`}
        />

        {/* Pinned Right Controls: Hide UI, Snapshot, Record, and Always-Visible Settings */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Clean View / Hide UI Toggle */}
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onToggleCleanMode?.();
            }}
            className={`h-7 flex items-center gap-1.5 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
            title="Hide all UI elements for an unobstructed clean view (Shortcut: C / ESC)"
          >
            <EyeOff className={`w-3.5 h-3.5 ${iconAccentClass}`} />
            <span className="hidden md:inline">{t.hideUi}</span>
          </button>

          {/* Export Snapshot */}
          <button
            type="button"
            onClick={() => {
              haptics.success();
              onExportSnapshot();
            }}
            className={`h-7 flex items-center gap-1.5 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
            title="Export high-resolution PNG snapshot"
          >
            <Download className={`w-3.5 h-3.5 ${iconAccentClass}`} />
            <span className="hidden 2xl:inline">{t.exportSnapshot}</span>
          </button>

          {/* Record Video */}
          {onToggleRecording && (
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                onToggleRecording();
              }}
              className={`h-7 flex items-center gap-1.5 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                isRecording ? btnActiveClass : btnInactiveClass
              }`}
              title={
                isRecording
                  ? 'Stop recording and download video file'
                  : 'Record high-bitrate video of the simulation'
              }
            >
              {isRecording ? (
                <>
                  <Square className={`w-3 h-3 fill-current ${iconAccentClass}`} />
                  <span className="font-mono text-[10.5px]">
                    {t.stopRecording} {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </>
              ) : (
                <>
                  <Video className={`w-3.5 h-3.5 ${iconMutedClass}`} />
                  <span className="hidden 2xl:inline">{t.recordVideo}</span>
                </>
              )}
            </button>
          )}

          {/* Pinned Settings Button (Always visible on the far right) */}
          <button
            type="button"
            data-testid="topbar-settings-btn"
            onClick={() => {
              haptics.light();
              onOpenSettingsModal?.();
            }}
            className={`h-7 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              isPhoneMode ? btnActiveClass : btnInactiveClass
            }`}
            title="Open Visualizer Settings & Preferences"
          >
            <Settings className={`w-3.5 h-3.5 ${iconAccentClass}`} />
            <span>{t.settings}</span>
            {isPhoneMode && (
              <span className="flex items-center gap-1 text-[9.5px] font-bold" title="Phone Mode Active">
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    isObsidian
                      ? 'bg-[#D97757]'
                      : isPlanck
                      ? 'bg-emerald-400'
                      : 'bg-[#D4AF37]'
                  }`}
                />
                <span className="hidden sm:inline">PHONE</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
