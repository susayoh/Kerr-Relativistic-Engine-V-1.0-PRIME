import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ShieldAlert,
  KeyRound,
  Lock,
  Terminal,
  X,
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
  isDevMode?: boolean;
  onUnlockDevMode?: () => void;
}

const HOLD_DURATION_MS = 4000;

export const TopBar: React.FC<TopBarProps> = ({
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
  isDevMode = false,
  onUnlockDevMode,
}) => {
  const haptics = useHaptics({ enabled: hapticsEnabled });
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const isObsidian = uiTheme === 'kerr_claude';
  const isPlanck = uiTheme === 'cryo_quantum';

  // Stealth 4-Second Hold State for Developer Mode Gateway
  const [isHoldingBrand, setIsHoldingBrand] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState<boolean>(false);
  const [gatewayInput, setGatewayInput] = useState<string>('');
  const [gatewayAccessDenied, setGatewayAccessDenied] = useState<boolean>(false);

  const holdTimeoutRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdStartMsRef = useRef<number>(0);
  const didTriggerHoldRef = useRef<boolean>(false);
  const gatewayInputRef = useRef<HTMLInputElement | null>(null);
  const deniedFlashTimerRef = useRef<number | null>(null);

  const cancelBrandHold = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    setIsHoldingBrand(false);
    setHoldProgress(0);
  }, []);

  const handleBrandPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      // Ignore if clicking the v1.4 changelog badge specifically
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('[data-testid="topbar-changelog-badge"]')) {
        return;
      }
      // If hold timer is already active (e.g., pointerdown followed by mousedown), do not reset it
      if (holdTimeoutRef.current !== null) {
        return;
      }

      didTriggerHoldRef.current = false;
      setIsHoldingBrand(true);
      setHoldProgress(0);
      holdStartMsRef.current = performance.now();

      const updateCharge = (now: number) => {
        const elapsed = Math.max(0, now - holdStartMsRef.current);
        const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
        setHoldProgress(pct);
        if (elapsed < HOLD_DURATION_MS) {
          holdRafRef.current = window.requestAnimationFrame(updateCharge);
        }
      };
      holdRafRef.current = window.requestAnimationFrame(updateCharge);

      holdTimeoutRef.current = window.setTimeout(() => {
        didTriggerHoldRef.current = true;
        cancelBrandHold();
        try {
          navigator.vibrate?.([40, 60, 40]);
        } catch {
          // Ignore if vibration API blocked
        }
        haptics.heavy();
        setGatewayInput('');
        setGatewayAccessDenied(false);
        setIsGatewayModalOpen(true);
      }, HOLD_DURATION_MS);
    },
    [cancelBrandHold, haptics]
  );

  const handleBrandPointerEnd = useCallback(() => {
    cancelBrandHold();
  }, [cancelBrandHold]);

  useEffect(() => {
    return () => {
      cancelBrandHold();
      if (deniedFlashTimerRef.current !== null) {
        window.clearTimeout(deniedFlashTimerRef.current);
      }
    };
  }, [cancelBrandHold]);

  useEffect(() => {
    if (isGatewayModalOpen) {
      const focusTimer = window.setTimeout(() => {
        gatewayInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(focusTimer);
    }
  }, [isGatewayModalOpen]);

  const handleVerifyGatewayCode = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (gatewayInput === 'Nate') {
        try {
          window.localStorage.setItem('kerr_dev_auth', 'true');
        } catch {
          // Ignore storage quota / privacy mode errors
        }
        haptics.success();
        setGatewayAccessDenied(false);
        setGatewayInput('');
        setIsGatewayModalOpen(false);
        onUnlockDevMode?.();
      } else {
        try {
          navigator.vibrate?.([60, 40, 60]);
        } catch {
          // Ignore
        }
        haptics.heavy();
        setGatewayAccessDenied(true);
        setGatewayInput('');
        if (deniedFlashTimerRef.current !== null) {
          window.clearTimeout(deniedFlashTimerRef.current);
        }
        deniedFlashTimerRef.current = window.setTimeout(() => {
          setGatewayAccessDenied(false);
        }, 1600);
      }
    },
    [gatewayInput, haptics, onUnlockDevMode]
  );

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
    <>
      <header
        className={`hud-panel relative z-20 flex items-center justify-between gap-1 sm:gap-2 px-1.5 sm:px-3.5 py-1 sm:py-1.5 border-b shadow-[0_4px_24px_rgba(0,0,0,0.9)] transition-colors ${
          isObsidian
            ? 'bg-[#080605]/96 border-[#D97757]/25'
            : isPlanck
            ? 'bg-[#030504]/96 border-emerald-500/25'
            : 'bg-[#050506]/96 border-zinc-800/80'
        }`}
      >
        {/* Zone 1: Compact Brand Selector (with Stealth 4s Hold Trigger) & System Category Dropdown */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
          <div
            data-testid="topbar-kerr-engine-brand"
            onPointerDown={handleBrandPointerDown}
            onMouseDown={handleBrandPointerDown}
            onTouchStart={handleBrandPointerDown}
            onPointerUp={handleBrandPointerEnd}
            onPointerLeave={handleBrandPointerEnd}
            onPointerCancel={handleBrandPointerEnd}
            onMouseUp={handleBrandPointerEnd}
            onMouseLeave={handleBrandPointerEnd}
            onTouchEnd={handleBrandPointerEnd}
            onTouchCancel={handleBrandPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
            className={`group relative overflow-hidden flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-md border whitespace-nowrap transition-all select-none touch-none ${
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
                if (didTriggerHoldRef.current) return;
                haptics.light();
                onSelectPreset('ton618');
              }}
              title="Kerr Engine — Reset to TON 618"
              className={`relative flex items-center justify-center w-4.5 h-4.5 sm:w-5 sm:h-5 rounded border transition-all shrink-0 cursor-pointer ${
                isObsidian
                  ? 'bg-[#1a1412] border-[#D97757]/50 group-hover:border-[#E89578]'
                  : isPlanck
                  ? 'bg-[#0c1410] border-emerald-400/50 group-hover:border-emerald-300'
                  : 'bg-[#121216] border-zinc-500/55 group-hover:border-[#D4AF37]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:scale-105 transition-transform ${
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

            <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
              <button
                type="button"
                onClick={() => {
                  if (didTriggerHoldRef.current) return;
                  haptics.light();
                  onSelectPreset('ton618');
                }}
                title="Kerr Engine — Reset to TON 618"
                className={`font-display text-[11px] sm:text-xs font-bold tracking-[0.04em] sm:tracking-[0.05em] transition-colors cursor-pointer ${
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
                className={`inline-flex items-center justify-center px-1 sm:px-1.5 py-[1.5px] rounded-[3px] border font-mono text-[8.5px] sm:text-[9px] font-bold tracking-[0.05em] leading-none transition-all cursor-pointer ${
                  isObsidian
                    ? 'bg-[#201815] hover:bg-[#2c201c] border-[#D97757]/60 text-[#F4A688]'
                    : isPlanck
                    ? 'bg-emerald-950/70 hover:bg-emerald-900/70 border-emerald-400/60 text-emerald-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-[#D4AF37]/55 text-[#D4AF37]'
                }`}
              >
                v1.4
              </button>
              {isDevMode && (
                <span
                  data-testid="topbar-dev-unlocked-dot"
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.85)] shrink-0"
                  title="Apex Developer Session Active"
                />
              )}
            </div>

            {/* Subtle 4-Second Stealth Hold Progress Bar */}
            {isHoldingBrand && holdProgress > 0 && (
              <div
                data-testid="topbar-hold-charge-bar"
                className="pointer-events-none absolute left-0 bottom-0 h-[2px] bg-cyan-400/75 shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-none"
                style={{ width: `${holdProgress}%` }}
              />
            )}
          </div>

          {/* Main System Category Dropdown: Isolated Singularity vs Binary Accretion */}
          {onChangeSystemCategory && (
            <div className="relative flex items-center shrink-0">
              <Orbit
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${iconAccentClass} absolute left-1.5 sm:left-2 pointer-events-none`}
              />
              <select
                aria-label="System Category"
                value={systemCategory}
                onChange={(e) => {
                  haptics.medium();
                  onChangeSystemCategory(e.target.value as SystemCategory);
                }}
                className={`h-6.5 sm:h-7 pl-5 sm:pl-6 pr-4 sm:pr-5 text-[10px] sm:text-[11px] font-mono font-medium rounded-md border transition-colors cursor-pointer appearance-none outline-none ${btnInactiveClass}`}
                title="Switch System Category between an Isolated Singularity and a Binary Accretion System (Roche Lobe Overflow)"
              >
                <option value="isolated" className="bg-[#050506] text-zinc-200">
                  {isPhoneMode ? t.isolatedShort : t.isolatedSingularity}
                </option>
                <option value="binary" className="bg-[#050506] text-zinc-200">
                  {isPhoneMode ? t.binaryShort : t.binaryAccretion}
                </option>
              </select>
              <ChevronDown
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${iconMutedClass} absolute right-1 sm:right-1.5 pointer-events-none`}
              />
            </div>
          )}
        </div>

        {/* Zone 2 & 3: Well-Spaced Navigation & Always-Accessible Right Utility Controls */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 min-w-0 flex-1 font-mono">
          {/* Scrollable / Responsive Exploration & Guides Toolbar */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            {/* Side-by-Side Compare Mode Toggle */}
            {onToggleCompareMode && (
              <button
                type="button"
                data-testid="topbar-compare-btn"
                onClick={() => {
                  haptics.medium();
                  onToggleCompareMode();
                }}
                className={`h-6.5 sm:h-7 flex items-center gap-1 px-1.5 sm:px-2 text-[10.5px] sm:text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                  isCompareMode ? btnActiveClass : btnInactiveClass
                }`}
                title="Toggle Side-by-Side Compare Mode to contrast two black hole presets with synchronized physics parameters"
              >
                <Columns2 className={`w-3.5 h-3.5 ${iconAccentClass}`} />
                <span className="hidden md:inline">Compare</span>
              </button>
            )}

            {/* Anatomy Infographic Lines Toggle (Hidden on compact phone screens to prevent top bar crowding; available in Layers tab) */}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onToggleAnatomyVisible();
              }}
              className={`${
                isPhoneMode ? 'hidden sm:flex' : 'hidden sm:flex'
              } h-7 items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
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
                className={`h-6.5 sm:h-7 flex items-center gap-1 px-1.5 sm:px-2 text-[10.5px] sm:text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
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
                className={`hidden sm:flex h-7 items-center gap-1 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
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
              className={`h-6.5 sm:h-7 flex items-center gap-1.5 px-1.5 sm:px-2 text-[10.5px] sm:text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
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
              className={`hidden sm:flex h-7 items-center gap-1.5 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${btnInactiveClass}`}
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
                className={`hidden sm:flex h-7 items-center gap-1.5 px-2 text-[11px] rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
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
              className={`h-6.5 sm:h-7 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-[10.5px] sm:text-[11px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                isPhoneMode ? btnActiveClass : btnInactiveClass
              }`}
              title="Open Visualizer Settings & Preferences"
            >
              <Settings className={`w-3.5 h-3.5 ${iconAccentClass}`} />
              <span className="hidden xs:inline sm:inline">{t.settings}</span>
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

      {/* [APEX SECURE GATEWAY] ENTER ACCESS CODE Modal */}
      {isGatewayModalOpen && (
        <div
          data-testid="apex-secure-gateway-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto"
          onClick={() => setIsGatewayModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-2xl border p-5 font-mono shadow-[0_24px_70px_rgba(0,0,0,0.96)] transition-all ${
              gatewayAccessDenied
                ? 'bg-[#090406] border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                : 'bg-[#05070d]/98 border-cyan-500/45 shadow-[0_0_35px_rgba(34,211,238,0.16)]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/90">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>[APEX SECURE GATEWAY]</span>
              </div>
              <button
                type="button"
                onClick={() => setIsGatewayModalOpen(false)}
                className="p-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close Apex Secure Gateway"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleVerifyGatewayCode} className="mt-4 space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="apex-gateway-code-input"
                  className="block text-[11px] font-bold tracking-widest uppercase text-slate-200"
                >
                  [APEX SECURE GATEWAY] ENTER ACCESS CODE:
                </label>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Restricted Kerr Engine Developer Sandbox clearance required to unlock experimental modules.
                </p>
              </div>

              <div className="relative">
                <KeyRound
                  className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    gatewayAccessDenied ? 'text-rose-400' : 'text-cyan-400'
                  }`}
                />
                <input
                  id="apex-gateway-code-input"
                  ref={gatewayInputRef}
                  data-testid="apex-gateway-input"
                  type="password"
                  value={gatewayInput}
                  onChange={(e) => {
                    setGatewayInput(e.target.value);
                    if (gatewayAccessDenied) setGatewayAccessDenied(false);
                  }}
                  placeholder="ENTER ACCESS CODE..."
                  autoComplete="off"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/90 border text-xs tracking-widest outline-none transition-all ${
                    gatewayAccessDenied
                      ? 'border-rose-500 text-rose-200 placeholder-rose-400/60 ring-2 ring-rose-500/30'
                      : 'border-cyan-500/40 focus:border-cyan-400 text-cyan-100 placeholder-slate-600 focus:ring-1 focus:ring-cyan-400/40'
                  }`}
                />
              </div>

              {gatewayAccessDenied && (
                <div
                  data-testid="apex-gateway-access-denied"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/70 border border-rose-500/60 text-rose-200 text-[11px] font-bold tracking-wider uppercase animate-pulse"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>ACCESS DENIED · INVALID CLEARANCE CREDENTIALS</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsGatewayModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[11px] cursor-pointer transition-colors"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  data-testid="apex-gateway-submit-btn"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 text-[11px] font-bold tracking-wider uppercase cursor-pointer transition-all shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-300" />
                  <span>AUTHENTICATE</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
