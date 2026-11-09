import React from 'react';
import {
  X,
  Settings,
  Sliders,
  Camera,
  Eye,
  Sparkles,
  RotateCcw,
  Lock,
  Compass,
} from 'lucide-react';
import {
  VisualizerSettings,
  DEFAULT_VISUALIZER_SETTINGS,
} from '../scene/BlackHoleScene';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VisualizerSettings;
  onUpdateSettings: (updater: (prev: VisualizerSettings) => VisualizerSettings) => void;
  onResetPhysics?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetPhysics,
}) => {
  if (!isOpen) return null;

  const toggleSetting = (key: keyof VisualizerSettings) => {
    onUpdateSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setNumericSetting = (key: keyof VisualizerSettings, val: number) => {
    onUpdateSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div className="relative w-full max-w-xl bg-[#070a12] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/90 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Visualizer Settings & Preferences
              </h2>
              <p className="text-[11px] font-mono text-neutral-400">
                Customize camera behavior, spacetime distortion optics, singularity sync & HUD
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Background & Screen Lock */}
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

          {/* Section 2: Accretion Disk Style & Spacetime Lensing Optics */}
          <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-sky-300 font-mono text-[11px] uppercase tracking-wider font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Accretion Disk Style & Relativistic Optics</span>
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

          {/* Section 3: Camera & Orbit Controls */}
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

          {/* Section 4: HUD & Telemetry Panels */}
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
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-neutral-800/90 bg-neutral-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings(() => ({ ...DEFAULT_VISUALIZER_SETTINGS }))}
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
