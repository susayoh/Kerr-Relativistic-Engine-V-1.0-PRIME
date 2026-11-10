import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sliders,
  Camera,
  Eye,
  Sparkles,
  RotateCcw,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  Compass,
  Smartphone,
  Check,
  Vibrate,
  Download,
  Atom,
  Music,
  Play,
  Pause,
  Volume2,
  Video,
  Square,
  Globe,
  Terminal,
  Cpu,
  Zap,
  DollarSign,
} from 'lucide-react';
import {
  VisualizerSettings,
  DEFAULT_VISUALIZER_SETTINGS,
} from '../scene/BlackHoleScene';
import {
  AccretionState,
  PhysicsPresetId,
  PHYSICS_PRESETS_CONFIG,
  getActivePhysicsPresetId,
} from '../physics/gravitationalPhysics';
import { useHaptics } from '../hooks/useHaptics';
import { trapQueenPlayer, TrapQueenPlayerState } from '../audio/trapQueenPlayer';
import { AppLanguage, LANGUAGE_OPTIONS, TRANSLATIONS } from '../i18n/translations';
import {
  KerrEngineTierId,
  KERR_ENGINE_TIERS,
  KerrEngineRunLog,
} from './KerrRelativityEngineModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VisualizerSettings;
  onUpdateSettings: (updater: (prev: VisualizerSettings) => VisualizerSettings) => void;
  accretionState?: AccretionState;
  onChangeAccretionState?: (state: AccretionState) => void;
  onResetPhysics?: () => void;
  currentSpin?: number;
  onSelectPhysicsPreset?: (presetId: PhysicsPresetId) => void;
  isRecording?: boolean;
  recordingSeconds?: number;
  onToggleRecording?: () => void;
  kerrEngineLogs?: KerrEngineRunLog[];
  onOpenKerrLogModal?: () => void;
  onTriggerKerrCalculation?: (tierOverride?: KerrEngineTierId) => void;
  onExportGeodesicCsv?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  accretionState = 'quiescent',
  onChangeAccretionState,
  onResetPhysics,
  currentSpin,
  onSelectPhysicsPreset,
  isRecording = false,
  recordingSeconds = 0,
  onToggleRecording,
  kerrEngineLogs = [],
  onOpenKerrLogModal,
  onTriggerKerrCalculation,
  onExportGeodesicCsv,
}) => {
  const haptics = useHaptics({
    enabled: settings.hapticsEnabled !== false,
    intensity: settings.hapticsIntensity ?? 1.0,
  });
  const [secretPasswordInput, setSecretPasswordInput] = useState<string>('');
  const [secretAuthError, setSecretAuthError] = useState<boolean>(false);
  const [isInlineKerrLogOpen, setIsInlineKerrLogOpen] = useState<boolean>(false);
  const [selectedInlineLogIdx, setSelectedInlineLogIdx] = useState<number>(0);
  const [playerState, setPlayerState] = useState<TrapQueenPlayerState>(() =>
    trapQueenPlayer.getState()
  );

  useEffect(() => {
    return trapQueenPlayer.subscribe(setPlayerState);
  }, []);

  const currentLang: AppLanguage = settings.language || 'en';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  const activePhysicsPresetId =
    typeof currentSpin === 'number' ? getActivePhysicsPresetId(currentSpin) : null;

  if (!isOpen) return null;

  const handleVerifySecretPassword = (candidate?: string) => {
    const code = (candidate ?? secretPasswordInput).trim();
    if (code === '1987') {
      haptics.success();
      setSecretAuthError(false);
      setSecretPasswordInput('');
      onUpdateSettings((prev) => ({
        ...prev,
        secret1987Unlocked: true,
        secret1987Mode: true,
      }));
    } else {
      haptics.heavy();
      setSecretAuthError(true);
    }
  };

  const toggleSetting = (key: keyof VisualizerSettings) => {
    haptics.light();
    onUpdateSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setNumericSetting = (key: keyof VisualizerSettings, val: number) => {
    haptics.sliderTick();
    onUpdateSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleTogglePhoneMode = () => {
    haptics.medium();
    onUpdateSettings((prev) => {
      const nextPhoneMode = !prev.phoneMode;
      if (nextPhoneMode) {
        // Apply optimized mobile layout preset:
        // compact view, wider FOV for vertical smartphone screens, hide cluttering desktop radar/left HUD/event log,
        // disable heavy motion blur for smooth 60fps mobile GPU rendering
        return {
          ...prev,
          phoneMode: true,
          showLeftHud: false,
          showOverheadMap: false,
          showCursorTelemetry: false,
          showEventLog: false,
          showMetricTelemetry: false,
          cameraFov: 56,
          motionBlurEnabled: false,
        };
      } else {
        // Restore desktop layout preset
        return {
          ...prev,
          phoneMode: false,
          showLeftHud: true,
          showOverheadMap: true,
          showCursorTelemetry: true,
          showEventLog: true,
          cameraFov: 46,
        };
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 pointer-events-auto">
      <div className="relative w-full max-w-xl bg-[#070a12] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-800/90 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                {t.settingsTitle}
              </h2>
              <p className="text-[11px] font-mono text-neutral-400">
                {t.settingsSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer shrink-0"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 text-xs">
          {/* Language & Localization Selector (English Default, German, Japanese, Spanish, Chinese) */}
          <div className="bg-neutral-950/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.languageSectionTitle}</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-200 border-amber-500/40">
                {LANGUAGE_OPTIONS.find((l) => l.id === currentLang)?.nativeName || 'English'}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {t.languageSectionDesc}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
              {LANGUAGE_OPTIONS.map((lang) => {
                const isSelected = currentLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        language: lang.id,
                      }));
                    }}
                    className={`px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.2)]'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-800 text-amber-300">
                        {lang.badge}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-amber-300 shrink-0" />}
                    </div>
                    <div className="font-semibold text-xs mt-1.5 truncate">{lang.nativeName}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{lang.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 0: Phone Mode (Mobile Optimization) */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-950/90 to-neutral-950/90 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{t.phoneModeSectionTitle}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                settings.phoneMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800'
              }`}>
                {settings.phoneMode ? 'ACTIVE' : 'OFF'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  {t.enablePhoneMode}
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                  Optimizes the interface for smartphones and small touchscreens:
                </p>
                <ul className="text-[11px] text-neutral-400 space-y-1 mt-2 font-mono">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Hides bulky desktop telemetry panels, overhead radar & event log for full viewport visibility</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Increases camera FOV to 56° to frame the accretion disk on vertical phone screens</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Disables heavy post-processing motion blur for maximum mobile GPU performance</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Enlarges touch targets and compacts bottom dock controls for one-thumb use</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleTogglePhoneMode}
                className={`w-14 h-7.5 rounded-full transition-colors p-1 shrink-0 cursor-pointer border ${
                  settings.phoneMode
                    ? 'bg-emerald-500/40 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                title="Toggle Phone Mode"
              >
                <div
                  className={`w-5.5 h-5.5 rounded-full transition-transform ${
                    settings.phoneMode
                      ? 'translate-x-6 bg-emerald-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Sub-item: Vibration Haptics Toggle & Intensity Slider */}
            <div className="pt-3 border-t border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
                    <Vibrate className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-neutral-100 font-medium text-xs flex items-center gap-1.5">
                      <span>{t.touchHapticsTitle}</span>
                      {haptics.isSupported && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                      Tactile vibration pulses on range slider scrubbing, preset taps, and sonic boom explosions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {haptics.isSupported && (
                    <button
                      type="button"
                      onClick={() => haptics.pulseBoom()}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer shadow-sm"
                      title="Test Device Vibration Pulse"
                    >
                      {t.testPulse}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      toggleSetting('hapticsEnabled');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer border ${
                      settings.hapticsEnabled !== false
                        ? 'bg-emerald-500/40 border-emerald-400'
                        : 'bg-neutral-900 border-neutral-700'
                    }`}
                    title="Toggle Vibration Haptics"
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full transition-transform ${
                        settings.hapticsEnabled !== false
                          ? 'translate-x-5 bg-emerald-300'
                          : 'translate-x-0 bg-neutral-500'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Haptic Feedback Intensity Slider */}
              <div
                className={`p-3 rounded-lg bg-neutral-900/70 border border-emerald-500/25 space-y-1.5 transition-opacity ${
                  settings.hapticsEnabled === false ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-200 font-medium text-xs">
                    {t.hapticIntensityTitle}
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-xs tabular-nums">
                    {Math.round((settings.hapticsIntensity ?? 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Haptic Feedback Intensity"
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={settings.hapticsIntensity ?? 1.0}
                  onChange={(e) => {
                    const nextIntensity = parseFloat(e.target.value);
                    onUpdateSettings((prev) => ({
                      ...prev,
                      hapticsIntensity: nextIntensity,
                    }));
                    haptics.sliderTick();
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                  <span>10% (Subtle)</span>
                  <span>100% (Standard)</span>
                  <span>200% (Max Boost)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 0.5: Real-Time Kerr Relativity Engine Calculation (4 Flagship Compute Tiers & Log Viewer) */}
          <div
            data-testid="kerr-engine-settings-section"
            className="bg-gradient-to-br from-[#090d1a] via-neutral-950 to-neutral-950 border border-amber-500/40 rounded-xl p-4 space-y-3.5 shadow-[0_0_25px_rgba(245,158,11,0.08)]"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-amber-300 font-mono text-[11px] uppercase tracking-wider font-bold">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Real-Time Kerr Relativity Engine Calculation</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="view-kerr-engine-log-btn"
                  onClick={() => {
                    haptics.light();
                    setIsInlineKerrLogOpen((prev) => !prev);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                    isInlineKerrLogOpen
                      ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/40'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  <span>{isInlineKerrLogOpen ? 'Hide Log' : `View Log (${kerrEngineLogs.length})`}</span>
                </button>

                {onOpenKerrLogModal && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onOpenKerrLogModal();
                    }}
                    className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-cyan-300 font-mono text-[10px] font-semibold cursor-pointer transition-colors"
                    title="Open Full-Screen Kerr Relativity Engine Audit Log"
                  >
                    Full Log
                  </button>
                )}

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    (settings.kerrEngineTier || 'standard') !== 'ultra' || settings.kerrEngineEnabled !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  }`}
                >
                  {(settings.kerrEngineTier || 'standard') !== 'ultra'
                    ? 'ALWAYS ACTIVE'
                    : settings.kerrEngineEnabled !== false
                      ? 'ENGINE ACTIVE'
                      : 'ULTRA BYPASSED'}
                </span>
              </div>
            </div>

            {/* Pre-Load Kerr Relativity Engine Terminal (Always Active; Bypass requires Ultra Tier) */}
            <div className="flex items-start justify-between gap-4 pt-1">
              <div className="space-y-1">
                <div className="text-neutral-100 font-semibold text-xs flex items-center gap-2 flex-wrap">
                  <span>Pre-Load Kerr Relativity Engine Terminal</span>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    {KERR_ENGINE_TIERS[settings.kerrEngineTier || 'standard'].modelCode}
                  </span>
                  {(settings.kerrEngineTier || 'standard') !== 'ultra' && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-rose-300 bg-rose-950/60 border border-rose-500/40 px-1.5 py-0.2 rounded">
                      <Lock className="w-2.5 h-2.5" /> Bypass Requires Ultra ($499/mo)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Executes the <strong className="text-amber-200">Kerr Relativity Engine</strong> terminal before any black hole or star loads, streaming exact Boyer-Lindquist metric tensors (<span className="font-mono text-cyan-300">g_μν</span>), Christoffel symbols, ISCO roots, and radiative transfer telemetry. Always active on Standard, Linear, and Advanced tiers — only the flagship <strong className="text-amber-300">Ultra</strong> model unlocks optional terminal bypass.
                </p>
              </div>

              <button
                type="button"
                disabled={(settings.kerrEngineTier || 'standard') !== 'ultra'}
                onClick={() => {
                  if ((settings.kerrEngineTier || 'standard') === 'ultra') {
                    toggleSetting('kerrEngineEnabled');
                  } else {
                    haptics.heavy();
                  }
                }}
                title={
                  (settings.kerrEngineTier || 'standard') === 'ultra'
                    ? 'Toggle Ultra Instant Bypass'
                    : 'Engine is always active. Select the Ultra ($499/mo) tier to unlock engine bypass.'
                }
                className={`w-12 h-6.5 rounded-full transition-colors p-0.5 shrink-0 border ${
                  (settings.kerrEngineTier || 'standard') !== 'ultra'
                    ? 'bg-emerald-500/30 border-emerald-500/50 opacity-80 cursor-not-allowed'
                    : settings.kerrEngineEnabled !== false
                      ? 'bg-amber-500/40 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer'
                      : 'bg-neutral-900 border-neutral-700 cursor-pointer'
                }`}
                aria-pressed={
                  (settings.kerrEngineTier || 'standard') !== 'ultra' || settings.kerrEngineEnabled !== false
                }
                aria-label="Toggle Real-Time Kerr Relativity Engine Calculation"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform flex items-center justify-center ${
                    (settings.kerrEngineTier || 'standard') !== 'ultra' || settings.kerrEngineEnabled !== false
                      ? 'translate-x-5.5 bg-amber-300 text-neutral-950'
                      : 'translate-x-0 bg-neutral-500 text-neutral-200'
                  }`}
                >
                  {(settings.kerrEngineTier || 'standard') !== 'ultra' && (
                    <Lock className="w-2.5 h-2.5 text-neutral-950" />
                  )}
                </div>
              </button>
            </div>

            {/* 4 Flagship Compute Tiers Grid: Standard, Linear, Advanced, Ultra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {(Object.keys(KERR_ENGINE_TIERS) as KerrEngineTierId[]).map((tierKey) => {
                const tier = KERR_ENGINE_TIERS[tierKey];
                const isSelected = (settings.kerrEngineTier || 'standard') === tierKey;

                return (
                  <button
                    key={tier.id}
                    type="button"
                    data-testid={`kerr-tier-${tier.id}`}
                    onClick={() => {
                      haptics.medium();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        // Non-ultra tiers always force engine active
                        kerrEngineEnabled: tier.id === 'ultra' ? prev.kerrEngineEnabled : true,
                        kerrEngineTier: tier.id,
                      }));
                    }}
                    className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.16)] ring-1 ring-amber-400/40 text-white'
                        : 'bg-neutral-900/75 border-neutral-800/90 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display font-bold text-xs uppercase tracking-wider text-white">
                            {tier.name}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${tier.badgeClass}`}>
                            {tier.modelCode}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/25 text-amber-200 border border-amber-400/50">
                              <Check className="w-2.5 h-2.5" /> ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded shrink-0">
                          {tier.monthlyPriceDisplay}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-amber-200/90 mb-1">
                        {tier.tagline}
                      </div>

                      <p className="text-[10px] text-neutral-400 leading-snug">
                        {tier.description}
                      </p>
                    </div>

                    {/* Speed, Performance & Quality Benchmark Bars */}
                    <div className="mt-2.5 pt-2 border-t border-neutral-800/80 space-y-1.5 font-mono text-[9px]">
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          {tier.tflopsDisplay} ({tier.expectedLatencyDisplay})
                        </span>
                        <span className="text-emerald-300">{tier.costPerSolveDisplay}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-neutral-400 uppercase text-[8px]">Speed</span>
                          <div className="flex-1 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${tier.speedScore}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-amber-300">{tier.speedScore}%</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-16 text-neutral-400 uppercase text-[8px]">Perf</span>
                          <div className="flex-1 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{ width: `${tier.performanceScore}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-cyan-300">{tier.performanceScore}%</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="w-16 text-neutral-400 uppercase text-[8px]">Quality</span>
                          <div className="flex-1 h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className="h-full bg-purple-400 rounded-full"
                              style={{ width: `${tier.qualityScore}%` }}
                            />
                          </div>
                          <span className="w-7 text-right text-purple-300">{tier.qualityScore}%</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Bar: Test Run Engine Now + View Calculation Log */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap font-mono text-[10px]">
              <div className="flex items-center gap-2 text-neutral-400">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Session Solves: <strong className="text-white">{kerrEngineLogs.length}</strong> · Accrued Compute:{' '}
                  <strong className="text-emerald-300">
                    ${kerrEngineLogs.reduce((acc, r) => acc + r.costUsd, 0).toFixed(3)} USD
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    setIsInlineKerrLogOpen((prev) => !prev);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-200 font-semibold cursor-pointer transition-colors"
                >
                  {isInlineKerrLogOpen ? 'Collapse Calculation Log' : 'View Log in Settings'}
                </button>

                {onTriggerKerrCalculation && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onClose();
                      onTriggerKerrCalculation(settings.kerrEngineTier || 'standard');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-bold cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch Kerr Engine Terminal</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inline Expandable Kerr Relativity Engine Calculation Log inside Settings */}
            {isInlineKerrLogOpen && (
              <div
                data-testid="settings-inline-kerr-log"
                className="mt-2 p-3 rounded-xl bg-[#03060c] border border-amber-500/40 space-y-2.5 font-mono text-[10px]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Kerr Relativity Engine — Calculation & Logic Log</span>
                  </div>
                  {kerrEngineLogs.length > 1 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {kerrEngineLogs.slice(0, 5).map((rLog, idx) => (
                        <button
                          key={rLog.id}
                          type="button"
                          onClick={() => setSelectedInlineLogIdx(idx)}
                          className={`px-2 py-0.5 rounded border text-[9px] cursor-pointer ${
                            selectedInlineLogIdx === idx
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                              : 'bg-neutral-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {rLog.targetName} ({rLog.tierName})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {kerrEngineLogs[selectedInlineLogIdx] || kerrEngineLogs[0] ? (
                  (() => {
                    const activeLog = kerrEngineLogs[selectedInlineLogIdx] || kerrEngineLogs[0];
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded-lg bg-neutral-950 border border-slate-800/90 text-[9.5px]">
                          <div>
                            <span className="text-slate-500 block">TARGET</span>
                            <strong className="text-white">{activeLog.targetName}</strong> ({activeLog.massSolarDisplay})
                          </div>
                          <div>
                            <span className="text-slate-500 block">ENGINE TIER</span>
                            <strong className="text-amber-300">{activeLog.modelCode}</strong> ({activeLog.tflopsPeak} TF)
                          </div>
                          <div>
                            <span className="text-slate-500 block">METRIC TENSOR</span>
                            <strong className="text-cyan-300">
                              g_tt={activeLog.summaryMetrics.g_tt.toFixed(3)} · g_rr=+{activeLog.summaryMetrics.g_rr.toFixed(2)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">SOLVE TIME & COST</span>
                            <strong className="text-emerald-300">
                              {activeLog.totalDurationMs} ms · ${activeLog.costUsd.toFixed(3)}
                            </strong>
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {activeLog.steps.map((st) => (
                            <div
                              key={st.id}
                              className="p-2 rounded-lg bg-neutral-950/90 border border-slate-800/80 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="text-amber-300 font-bold">
                                  [{st.stepNumber}/08 · {st.phase}] <span className="text-cyan-300">$ {st.command}</span>
                                </span>
                                <span className="text-emerald-400">{st.residual}</span>
                              </div>
                              <div className="px-2 py-1 rounded bg-[#050914] border border-slate-800/70 text-amber-200 text-[10px] overflow-x-auto">
                                {st.equation}
                              </div>
                              <div className="text-[9.5px] text-slate-300">
                                <strong className="text-purple-300">LOGIC:</strong> {st.logicDecision}
                              </div>
                              <div className="text-[9px] text-slate-400">{st.telemetry}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    No calculations logged yet. Load a black hole or star to populate the Kerr Relativity Engine log.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Physics Presets (General Relativistic Configurations) */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Atom className="w-4 h-4 text-amber-400" />
                <span>{t.physicsPresetsSectionTitle}</span>
              </div>
              <span className="font-mono text-[10px] text-amber-300/80 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                EXACT EINSTEIN METRICS
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Quickly switch between exact General Relativistic spacetime metrics. Dynamically shifts the dimensionless spin parameter <span className="font-mono text-amber-300">a*</span>, recalculates frame-dragging, contracts/expands the event horizon, and snaps the accretion disk to the exact prograde Innermost Stable Circular Orbit (ISCO).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {(Object.keys(PHYSICS_PRESETS_CONFIG) as PhysicsPresetId[]).map((presetKey) => {
                const preset = PHYSICS_PRESETS_CONFIG[presetKey];
                const isActive = activePhysicsPresetId === presetKey;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onSelectPhysicsPreset?.(preset.id);
                    }}
                    className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40 text-neutral-100'
                        : 'bg-neutral-900/70 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-semibold text-xs ${isActive ? 'text-amber-200' : 'text-neutral-200'}`}>
                            {preset.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/50">
                              <Check className="w-2.5 h-2.5" /> ACTIVE
                            </span>
                          )}
                        </div>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${preset.badgeBg}`}>
                          {preset.spinDisplay}
                        </span>
                      </div>

                      <div className="font-mono text-[10px] text-neutral-400 mb-1.5">
                        {preset.tagline}
                      </div>

                      <p className="text-[10px] text-neutral-400 leading-snug">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-800/80 grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                      <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800/60">
                        <span className="text-neutral-400 block text-[8px] uppercase tracking-wider">Horizon r_H</span>
                        <span className="text-neutral-200 font-medium">{preset.horizonRs}</span>
                      </div>
                      <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800/60">
                        <span className="text-neutral-400 block text-[8px] uppercase tracking-wider">ISCO Gap</span>
                        <span className="text-neutral-200 font-medium">{preset.iscoRs}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Rapid Parameter Adjustment Ripples Toggle */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-900">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-100 font-medium text-xs">
                    Rapid Parameter Adjustment Ripples
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      settings.rapidAdjustmentRipples !== false
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {settings.rapidAdjustmentRipples !== false ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Generates propagating relativistic gravitational wave ripples from the black hole when spin or accretion rate are rapidly adjusted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('rapidAdjustmentRipples')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.rapidAdjustmentRipples !== false
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={settings.rapidAdjustmentRipples !== false}
                aria-label="Toggle rapid adjustment ripples"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.rapidAdjustmentRipples !== false
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Background & Screen Lock */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-amber-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Background & Anatomy Behavior</span>
            </div>

            {/* Lock Background When Moving Screen */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  Lock Background When Moving Screen
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Keeps the background stars and nebula completely stationary on screen when rotating or panning the camera.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('lockBackground')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.lockBackground
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.lockBackground
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Sync Singularity With Anatomy Guide */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  Toggle Off Singularity When Closing Anatomy Guide
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Automatically hides the central Kerr ring singularity when you click off the Anatomy Guide.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('syncSingularityWithAnatomy')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.syncSingularityWithAnatomy
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.syncSingularityWithAnatomy
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Always Show Singularity Override */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  Always Show Central Singularity
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Keep the pinpoint singularity and Kerr ring visible inside the black hole shadow even when the Anatomy Guide is off.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('alwaysShowSingularity')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.alwaysShowSingularity
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.alwaysShowSingularity
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Accretion Disk Style & Spacetime Lensing Optics */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sky-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Accretion Disk Style & Relativistic Optics</span>
            </div>

            {/* Accretion State Physical Geometry Toggle (Quiescent vs Active) */}
            {onChangeAccretionState && (
              <div className="pt-1 pb-2 border-b border-neutral-900">
                <div className="text-neutral-100 font-medium text-xs mb-1.5">
                  Accretion State (Physical Geometry)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeAccretionState('quiescent')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accretionState !== 'active'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-semibold text-xs">Quiescent (Razor-Thin)</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                      Standard thin equatorial Novikov-Thorne disk geometry
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeAccretionState('active')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accretionState === 'active'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-semibold text-xs">Active (Volumetric Thick)</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                      Turbulent high-emission torus smoothly connecting lensed arcs
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Accretion State Change & Threshold Shockwave Toggle */}
            <div className="flex items-center justify-between gap-4 pt-2.5 pb-2 border-b border-neutral-900">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-100 font-medium text-xs">
                    Accretion Shockwave Animation
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      settings.accretionShockwaveEnabled !== false
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {settings.accretionShockwaveEnabled !== false ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Propagates a high-energy thermal and radiation-pressure shockwave outward from the event horizon boundary when accretion rate changes rapidly or crosses critical state thresholds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('accretionShockwaveEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.accretionShockwaveEnabled !== false
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={settings.accretionShockwaveEnabled !== false}
                aria-label="Toggle accretion shockwave animation"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.accretionShockwaveEnabled !== false
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Accretion Disk Renderer Toggle (Classic vs Raymarched) */}
            <div className="pt-1 pb-2 border-b border-neutral-900">
              <div className="text-neutral-100 font-medium text-xs mb-1.5">
                Accretion Disk Renderer
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      accretionDiskStyle: 'classic',
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.accretionDiskStyle !== 'raymarched'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="font-semibold text-xs">Classic 3D Disk (Original)</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Original wide 3D equatorial ring mesh with Einstein-lensed arches
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      accretionDiskStyle: 'raymarched',
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.accretionDiskStyle === 'raymarched'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm'
                      : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="font-semibold text-xs">Volumetric Raymarched</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">
                    Full 3D geodesic raymarched disk with ACES tone mapping
                  </div>
                </button>
              </div>
            </div>

            {/* Opt-In Dynamic Resolution Scaling (Defaults to OFF / Locked Native High-DPI @2x) */}
            <div className="flex items-center justify-between gap-3 pt-1 pb-2 border-b border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs flex items-center gap-1.5">
                  <span>Dynamic Resolution Downscaling</span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {settings.dynamicResolutionScaling ? 'OPT-IN ON' : 'LOCKED HIGH-DPI'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Keep OFF (default) to lock crisp High-DPI (@2x) anti-aliased rendering without automatic frame-spike resolution downgrades.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('dynamicResolutionScaling')}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  settings.dynamicResolutionScaling
                    ? 'bg-amber-500/40 border border-amber-400'
                    : 'bg-neutral-800 border border-neutral-700'
                }`}
                aria-label="Toggle dynamic resolution scaling"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.dynamicResolutionScaling
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Bloom Intensity Slider */}
            <div className="pt-1 pb-2 border-b border-neutral-900">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-100 font-medium text-xs">
                  {t.bloomIntensityTitle}
                </span>
                <span className="font-mono text-amber-300 text-xs">
                  {settings.bloomIntensity.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                aria-label="Bloom Intensity"
                min={0.0}
                max={2.5}
                step={0.05}
                value={settings.bloomIntensity}
                onChange={(e) =>
                  setNumericSetting('bloomIntensity', parseFloat(e.target.value))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Controls the relativistic glow, corona halo, and luminous emission intensity on the accretion disk and photon ring.
              </p>
            </div>

            {/* Lens Flare Intensity Slider */}
            <div
              data-testid="lens-flare-intensity-section"
              className="pt-1 pb-2 border-b border-neutral-900"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-100 font-medium text-xs">
                    {t.lensFlareIntensityTitle}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                      (settings.lensFlareIntensity ?? 1.0) > 0.01
                        ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {(settings.lensFlareIntensity ?? 1.0) > 0.01 ? 'CAMERA OPTICS' : 'OFF'}
                  </span>
                </div>
                <span
                  data-testid="lens-flare-intensity-value"
                  className="font-mono text-amber-300 text-xs tabular-nums"
                >
                  {(settings.lensFlareIntensity ?? 1.0).toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                data-testid="lens-flare-intensity-slider"
                aria-label="Lens Flare Intensity"
                min={0.0}
                max={2.5}
                step={0.05}
                value={settings.lensFlareIntensity ?? 1.0}
                onChange={(e) =>
                  setNumericSetting('lensFlareIntensity', parseFloat(e.target.value))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-neutral-500 mt-0.5">
                <span>0.00× (Off)</span>
                <span>1.00× (Standard)</span>
                <span>2.50× (Cinema Anamorphic)</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {t.lensFlareIntensityDesc}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-100 font-medium text-xs">
                  Naked Spacetime Distortion Intensity (No Accretion Disk)
                </span>
                <span className="font-mono text-amber-300 text-xs">
                  {settings.nakedDistortionIntensity.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={settings.nakedDistortionIntensity}
                onChange={(e) =>
                  setNumericSetting('nakedDistortionIntensity', parseFloat(e.target.value))
                }
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Amplifies the relativistic Einstein ring, warped geodesic grid contours, and background starlight deflection when the accretion disk is toggled off.
              </p>
            </div>

            {/* Camera Motion Blur */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  Relativistic Camera Motion Blur
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Applies directional screen-space velocity blur during rapid orbital camera slews.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('motionBlurEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.motionBlurEnabled
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.motionBlurEnabled
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Time Lapse (Long-Exposure Astrophotography) Checkbox */}
            <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-neutral-900">
              <label
                htmlFor="time-lapse-checkbox"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id="time-lapse-checkbox"
                  type="checkbox"
                  checked={Boolean(settings.timeLapseEnabled)}
                  onChange={() => toggleSetting('timeLapseEnabled')}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-amber-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-neutral-100 font-medium text-xs">
                      {t.timeLapseTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        settings.timeLapseEnabled
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.timeLapseEnabled ? 'ACCUMULATING' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {t.timeLapseDesc}
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={() => toggleSetting('timeLapseEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.timeLapseEnabled
                    ? 'bg-amber-500/30 border-amber-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.timeLapseEnabled)}
                aria-label="Toggle Time Lapse Long-Exposure Astrophotography"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.timeLapseEnabled
                      ? 'translate-x-5 bg-amber-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 4: Camera & Orbit Controls */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Camera className="w-3.5 h-3.5" />
              <span>{t.cameraRigSectionTitle}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-100 font-medium text-xs">
                  Camera Field of View (FOV)
                </span>
                <span className="font-mono text-emerald-300 text-xs">
                  {settings.cameraFov}°
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={75}
                step={1}
                value={settings.cameraFov}
                onChange={(e) => setNumericSetting('cameraFov', parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  Sonic Boom Screen Shake
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Applies physical camera recoil and seismic aftershock vibration when triggering a sonic boom pulse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('screenShakeEnabled')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.screenShakeEnabled
                    ? 'bg-emerald-500/30 border-emerald-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.screenShakeEnabled
                      ? 'translate-x-5 bg-emerald-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-900">
              <div>
                <div className="text-neutral-100 font-medium text-xs">
                  Auto-Rotate Camera Mode (Y-Axis Orbit)
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                  Slowly orbits the camera around the black hole&apos;s Y-axis for a dynamic, cinematic perspective of the accretion disk.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('autoRotate')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.autoRotate
                    ? 'bg-emerald-500/30 border-emerald-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.autoRotate
                      ? 'translate-x-5 bg-emerald-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {settings.autoRotate && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-neutral-300 text-[11px]">Auto-Orbit Speed</span>
                  <span className="font-mono text-emerald-300 text-[11px]">
                    {settings.autoRotateSpeed.toFixed(1)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={3.0}
                  step={0.1}
                  value={settings.autoRotateSpeed}
                  onChange={(e) =>
                    setNumericSetting('autoRotateSpeed', parseFloat(e.target.value))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Section 5: HUD & Telemetry Panels */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-purple-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>{t.hudVisibilitySectionTitle}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => toggleSetting('showLeftHud')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showLeftHud
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.leftHudLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showLeftHud ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showOverheadMap')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showOverheadMap
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.overheadRadarLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showOverheadMap ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showTimeDilation')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showTimeDilation
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.timeDilationLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showTimeDilation ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showCursorTelemetry')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showCursorTelemetry
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.cursorReadoutLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showCursorTelemetry ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleSetting('showEventLog')}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  settings.showEventLog !== false
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-75">
                  {t.eventLogLabel}
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showEventLog !== false ? t.visibleStatus : t.hiddenStatus}
                </div>
              </button>
            </div>

            {/* Show Metric Telemetry Checkbox (Real-Time Spacetime Metric Tensor Evolution Overlay) */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-900">
              <label
                htmlFor="show-metric-telemetry-checkbox"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id="show-metric-telemetry-checkbox"
                  type="checkbox"
                  checked={Boolean(settings.showMetricTelemetry)}
                  onChange={() => toggleSetting('showMetricTelemetry')}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-purple-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-neutral-100 font-medium text-xs">
                      {t.showMetricTelemetryTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        settings.showMetricTelemetry
                          ? 'border-purple-500/40 bg-purple-500/15 text-purple-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.showMetricTelemetry ? 'LIVE g_μν' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {t.showMetricTelemetryDesc}
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={() => toggleSetting('showMetricTelemetry')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.showMetricTelemetry
                    ? 'bg-purple-500/30 border-purple-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.showMetricTelemetry)}
                aria-label="Toggle Show Metric Telemetry"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.showMetricTelemetry
                      ? 'translate-x-5 bg-purple-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>

            {/* Show Performance Monitor Checkbox (Three.js Frame Time, Draw Calls, Memory & Shader Layer Bottleneck Diagnostics) */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-neutral-900">
              <label
                htmlFor="show-performance-monitor-checkbox"
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id="show-performance-monitor-checkbox"
                  type="checkbox"
                  checked={Boolean(settings.showPerformanceMonitor)}
                  onChange={() => toggleSetting('showPerformanceMonitor')}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 accent-cyan-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-neutral-100 font-medium text-xs">
                      Show Performance Monitor (Three.js GPU Diagnostics)
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${
                        settings.showPerformanceMonitor
                          ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.showPerformanceMonitor ? 'LIVE TELEMETRY' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Displays real-time frame time (ms/FPS), WebGL draw calls, GPU/heap memory usage, and interactive shader layer toggles to diagnose desktop GPU bottlenecks.
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={() => toggleSetting('showPerformanceMonitor')}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 cursor-pointer border ${
                  settings.showPerformanceMonitor
                    ? 'bg-cyan-500/30 border-cyan-400/70'
                    : 'bg-neutral-900 border-neutral-700'
                }`}
                aria-pressed={Boolean(settings.showPerformanceMonitor)}
                aria-label="Toggle Show Performance Monitor"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full transition-transform ${
                    settings.showPerformanceMonitor
                      ? 'translate-x-5 bg-cyan-300'
                      : 'translate-x-0 bg-neutral-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 6: Snapshot & Video Recording Export */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-cyan-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Download className="w-3.5 h-3.5" />
                <span>{t.snapshotVideoSectionTitle}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {onExportGeodesicCsv && (
                  <button
                    type="button"
                    data-testid="settings-export-geodesic-csv-btn"
                    onClick={() => {
                      haptics.medium();
                      onExportGeodesicCsv();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-200 transition-all cursor-pointer"
                    title="Export live geodesic trajectory coordinates, velocity vectors, redshift, and Boyer-Lindquist metric tensors as CSV"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Export Geodesic CSV</span>
                  </button>
                )}

                {onToggleRecording && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onToggleRecording();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                      isRecording
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                        : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-cyan-200'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-rose-400 text-rose-400" />
                        <span>
                          {t.stopRecording} {Math.floor(recordingSeconds / 60)}:
                          {(recordingSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3 h-3 text-rose-400" />
                        <span>{t.startRecordingBtn}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Toggle 1: Photo Export UI Overlay */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <div className="space-y-0.5 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-neutral-200">
                      {t.includeUiPhotoTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        settings.includeUiInExport
                          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.includeUiInExport ? 'UI ON' : 'CLEAN 3D'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-snug">
                    {t.includeUiPhotoDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('includeUiInExport')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.includeUiInExport ? 'bg-cyan-500' : 'bg-neutral-800'
                  }`}
                  aria-pressed={settings.includeUiInExport}
                  aria-label="Toggle UI elements in photo export"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.includeUiInExport ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Video Recording UI Overlay */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                <div className="space-y-0.5 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-neutral-200">
                      {t.includeUiVideoTitle}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        settings.includeUiInVideoExport
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {settings.includeUiInVideoExport ? 'UI ON' : 'CLEAN 3D'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-snug">
                    {t.includeUiVideoDesc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('includeUiInVideoExport')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.includeUiInVideoExport ? 'bg-rose-500' : 'bg-neutral-800'
                  }`}
                  aria-pressed={Boolean(settings.includeUiInVideoExport)}
                  aria-label="Toggle UI elements in video recording"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.includeUiInVideoExport ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 7: Classified Super Secret Setting (Password: "1987") */}
          <div
            className={`rounded-xl p-4 space-y-3 border transition-all ${
              settings.secret1987Unlocked
                ? 'bg-gradient-to-r from-amber-950/45 via-fuchsia-950/35 to-neutral-950 border-amber-400/50 shadow-[0_0_24px_rgba(245,158,11,0.18)]'
                : 'bg-neutral-950/95 border-rose-500/35'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider font-semibold">
                {settings.secret1987Unlocked ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">{t.secretVaultUnlockedTitle}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300">{t.secretVaultLockedTitle}</span>
                  </>
                )}
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  settings.secret1987Unlocked
                    ? settings.secret1987Mode
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                }`}
              >
                {settings.secret1987Unlocked
                  ? settings.secret1987Mode
                    ? '1987 OVERDRIVE ACTIVE'
                    : 'UNLOCKED'
                  : 'LOCKED'}
              </span>
            </div>

            {!settings.secret1987Unlocked ? (
              <div className="space-y-2.5 pt-1">
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Enter the 4-digit classified clearance passcode to unlock the hidden experimental spacetime anomaly setting.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={secretPasswordInput}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setSecretPasswordInput(nextVal);
                      setSecretAuthError(false);
                      if (nextVal.trim() === '1987') {
                        handleVerifySecretPassword(nextVal);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifySecretPassword();
                      }
                    }}
                    placeholder="Enter 4-digit passcode..."
                    aria-label="Secret Setting Passcode"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-amber-200 font-mono text-xs tracking-widest placeholder:tracking-normal placeholder:text-neutral-500 outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifySecretPassword()}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 font-mono text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Unlock
                  </button>
                </div>

                {secretAuthError && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 bg-rose-950/40 border border-rose-500/40 px-2.5 py-1.5 rounded-lg">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>ACCESS DENIED — Invalid clearance code.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-neutral-900/75 border border-amber-500/40">
                  <div className="space-y-0.5 pr-2">
                    <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Protocol 1987: SN 1987A Triple-Ring & Golden Synth Grid</span>
                    </div>
                    <div className="text-[11px] text-neutral-300 leading-snug">
                      Unleashes the iconic glowing equatorial "Cosmic Pearl Necklace" and twin bipolar hourglass rings of Supernova 1987A, paired with a 1987 Golden-Magenta Cyber Spacetime Manifold and shockwave burst.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSetting('secret1987Mode')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.secret1987Mode ? 'bg-amber-500' : 'bg-neutral-800'
                    }`}
                    aria-pressed={Boolean(settings.secret1987Mode)}
                    aria-label="Toggle Protocol 1987 Secret Mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.secret1987Mode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Vault Anthem Player: Trap Queen — Fetty Wap */}
                <div className="p-3 rounded-lg bg-neutral-900/85 border border-fuchsia-500/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-amber-400/50 bg-neutral-950 shrink-0 flex items-center justify-center">
                        {playerState.artworkUrl ? (
                          <img
                            src={playerState.artworkUrl}
                            alt="Fetty Wap - Trap Queen cover"
                            className={`w-full h-full object-cover ${
                              playerState.isPlaying ? 'scale-105 transition-transform duration-500' : ''
                            }`}
                          />
                        ) : (
                          <Music className="w-4 h-4 text-amber-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {playerState.trackTitle}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            1738
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-fuchsia-300 truncate">
                          {playerState.artistName} • Vault Anthem
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        haptics.medium();
                        void trapQueenPlayer.togglePlay();
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                        playerState.isPlaying
                          ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                          : 'bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-amber-200 border-fuchsia-400/50'
                      }`}
                    >
                      {playerState.isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause Song</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Trap Queen</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Progress & Volume / Source Controls */}
                  <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => trapQueenPlayer.setMode('official')}
                          className={`px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                            playerState.mode === 'official'
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          Full Song (3:42)
                        </button>
                        <button
                          type="button"
                          onClick={() => trapQueenPlayer.setMode('synth1738')}
                          className={`px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                            playerState.mode === 'synth1738'
                              ? 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-200'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          1738 Synth Beat
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3 h-3 text-amber-300" />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={playerState.volume}
                          onChange={(e) =>
                            trapQueenPlayer.setVolume(parseFloat(e.target.value))
                          }
                          aria-label="Trap Queen volume"
                          className="w-16 accent-amber-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    {playerState.mode === 'official' && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-neutral-400 w-8">
                          {Math.floor(playerState.currentTime / 60)}:
                          {Math.floor(playerState.currentTime % 60)
                            .toString()
                            .padStart(2, '0')}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(1, playerState.duration)}
                          step={0.1}
                          value={Math.min(playerState.currentTime, playerState.duration)}
                          onChange={(e) =>
                            trapQueenPlayer.seek(parseFloat(e.target.value))
                          }
                          aria-label="Seek Trap Queen track"
                          className="flex-1 accent-fuchsia-400 cursor-pointer h-1"
                        />
                        <span className="font-mono text-[10px] text-neutral-400 w-8 text-right">
                          {Math.floor(playerState.duration / 60)}:
                          {Math.floor(playerState.duration % 60)
                            .toString()
                            .padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span className="text-amber-300/90">Clearance 1987 Verified</span>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      trapQueenPlayer.stopAndReset();
                      onUpdateSettings((prev) => ({
                        ...prev,
                        secret1987Unlocked: false,
                        secret1987Mode: false,
                      }));
                    }}
                    className="flex items-center gap-1 text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Re-Lock Vault</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-neutral-800/90 bg-neutral-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                trapQueenPlayer.stopAndReset();
                onUpdateSettings(() => ({ ...DEFAULT_VISUALIZER_SETTINGS }));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.resetSettings}</span>
            </button>

            {onResetPhysics && (
              <button
                type="button"
                onClick={onResetPhysics}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.resetPhysics}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-colors text-xs font-mono font-semibold cursor-pointer"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};
