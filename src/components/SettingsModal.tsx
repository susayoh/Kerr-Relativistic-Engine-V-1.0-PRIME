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
}) => {
  const haptics = useHaptics({ enabled: settings.hapticsEnabled !== false });
  const [secretPasswordInput, setSecretPasswordInput] = useState<string>('');
  const [secretAuthError, setSecretAuthError] = useState<boolean>(false);
  const [playerState, setPlayerState] = useState<TrapQueenPlayerState>(() =>
    trapQueenPlayer.getState()
  );

  useEffect(() => {
    return trapQueenPlayer.subscribe(setPlayerState);
  }, []);

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
        // compact view, wider FOV for vertical smartphone screens, hide cluttering desktop radar/left HUD,
        // disable heavy motion blur for smooth 60fps mobile GPU rendering
        return {
          ...prev,
          phoneMode: true,
          showLeftHud: false,
          showOverheadMap: false,
          showCursorTelemetry: false,
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
                Visualizer Settings & Preferences
              </h2>
              <p className="text-[11px] font-mono text-neutral-400">
                Customize camera behavior, Phone Mode layout, spacetime distortion optics & HUD
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
          {/* Section 0: Phone Mode (Mobile Optimization) */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-950/90 to-neutral-950/90 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Phone Mode (Mobile Experience)</span>
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
                  Enable Phone Mode
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                  Optimizes the interface for smartphones and small touchscreens:
                </p>
                <ul className="text-[11px] text-neutral-400 space-y-1 mt-2 font-mono">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Hides bulky desktop telemetry panels & overhead radar for full viewport visibility</span>
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

            {/* Sub-item: Vibration Haptics Toggle */}
            <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
                  <Vibrate className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-neutral-100 font-medium text-xs flex items-center gap-1.5">
                    <span>Touch Vibration Haptics</span>
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
                    Test Pulse
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
          </div>

          {/* Section 1: Physics Presets (General Relativistic Configurations) */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Atom className="w-4 h-4 text-amber-400" />
                <span>Physics Presets (GR Configurations)</span>
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

            {/* Bloom Intensity Slider */}
            <div className="pt-1 pb-2 border-b border-neutral-900">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-100 font-medium text-xs">
                  Bloom Intensity
                </span>
                <span className="font-mono text-amber-300 text-xs">
                  {settings.bloomIntensity.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
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
          </div>

          {/* Section 4: Camera & Orbit Controls */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Camera className="w-3.5 h-3.5" />
              <span>Camera & Orbital Rig</span>
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
              <span>HUD & Telemetry Visibility</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
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
                  Left HUD
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showLeftHud ? 'Visible' : 'Hidden'}
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
                  Overhead Radar
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showOverheadMap ? 'Visible' : 'Hidden'}
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
                  Time Dilation
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showTimeDilation ? 'Visible' : 'Hidden'}
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
                  Cursor Readout
                </div>
                <div className="font-semibold text-xs mt-0.5">
                  {settings.showCursorTelemetry ? 'Visible' : 'Hidden'}
                </div>
              </button>
            </div>
          </div>

          {/* Section 6: Snapshot & Image Export */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
                <Download className="w-3.5 h-3.5" />
                <span>Snapshot & Image Export</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  settings.includeUiInExport
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                }`}
              >
                {settings.includeUiInExport ? 'UI OVERLAY ON' : 'AUTO-OFF (CLEAN)'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-medium text-neutral-200">
                  Include UI Elements in Export
                </div>
                <div className="text-[11px] text-neutral-400 leading-snug">
                  When enabled, exported PNG captures include the top bar, HUD metrics, and dock overlay. Defaults to off for clean, cinematic 3D wallpapers.
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('includeUiInExport')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.includeUiInExport ? 'bg-cyan-500' : 'bg-neutral-800'
                }`}
                aria-pressed={settings.includeUiInExport}
                aria-label="Toggle UI elements in export"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.includeUiInExport ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
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
                    <span className="text-amber-300">Classified Vault // Protocol 1987</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300">Super Secret Setting (Password Protected)</span>
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
              <span>Reset Settings</span>
            </button>

            {onResetPhysics && (
              <button
                type="button"
                onClick={onResetPhysics}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>Reset Physics</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-colors text-xs font-mono font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
