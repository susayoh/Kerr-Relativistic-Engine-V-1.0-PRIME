import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Layers,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Send,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Maximize2,
  Zap,
  Waves,
  Eye,
  EyeOff,
  Radio,
  BookOpen,
  Download,
} from 'lucide-react';
import {
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  DerivedRelativisticMetrics,
  GeodesicTrajectory,
  ObjectCategory,
  SystemCategory,
  BACKGROUND_THEMES,
  isStellarCategory,
} from '../physics/gravitationalPhysics';
import { CameraPresetId } from '../scene/BlackHoleScene';
import { useHaptics } from '../hooks/useHaptics';

interface ControlDockProps {
  params: BlackHoleParams;
  metrics: DerivedRelativisticMetrics;
  activePresetId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleCleanMode?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onChangeParams: (updater: (prev: BlackHoleParams) => BlackHoleParams) => void;
  onSelectPreset: (presetId: string) => void;
  onResetParams: () => void;
  onSelectCamera: (preset: CameraPresetId) => void;
  activeCamera: CameraPresetId;
  isCinematicTourActive?: boolean;
  cinematicTourStageLabel?: string;
  onToggleCinematicTour?: () => void;
  onLaunchPhoton: (impactB: number) => void;
  onClearPhotons: () => void;
  onExportGeodesicCsv?: (impactB: number) => void;
  lastTrajectory: GeodesicTrajectory | null;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenCosmicScaleModal: () => void;
  onOpenQuickGuideModal?: () => void;
  onTriggerPulse: () => void;
  onChangeSystemCategory?: (category: SystemCategory) => void;
  isPhoneMode?: boolean;
  hapticsEnabled?: boolean;
}

type DockTab = 'spacetime' | 'spectral' | 'camera' | 'geodesics';

export const ControlDock: React.FC<ControlDockProps> = React.memo(({
  params,
  metrics,
  activePresetId,
  isCollapsed,
  onToggleCollapse,
  onToggleCleanMode,
  isFocusMode = false,
  onToggleFocusMode,
  onChangeParams,
  onSelectPreset,
  onResetParams,
  onSelectCamera,
  activeCamera,
  isCinematicTourActive = false,
  cinematicTourStageLabel = 'Polar Axis',
  onToggleCinematicTour,
  onLaunchPhoton,
  onClearPhotons,
  onExportGeodesicCsv,
  audioEnabled,
  onToggleAudio,
  onOpenCosmicScaleModal,
  onOpenQuickGuideModal,
  onTriggerPulse,
  onChangeSystemCategory,
  isPhoneMode = false,
  hapticsEnabled = true,
}) => {
  const haptics = useHaptics({ enabled: hapticsEnabled });
  const [activeTab, setActiveTab] = useState<DockTab>('spacetime');
  const [impactB, setImpactB] = useState<number>(2.4);

  const activePreset =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  const handlePrevPreset = () => {
    haptics.medium();
    const curIdx = ASTROPHYSICAL_PRESETS.findIndex((p) => p.id === activePresetId);
    const prevIdx = (curIdx - 1 + ASTROPHYSICAL_PRESETS.length) % ASTROPHYSICAL_PRESETS.length;
    onSelectPreset(ASTROPHYSICAL_PRESETS[prevIdx].id);
  };

  const handleNextPreset = () => {
    haptics.medium();
    const curIdx = ASTROPHYSICAL_PRESETS.findIndex((p) => p.id === activePresetId);
    const nextIdx = (curIdx + 1) % ASTROPHYSICAL_PRESETS.length;
    onSelectPreset(ASTROPHYSICAL_PRESETS[nextIdx].id);
  };

  const isPaused = params.timeScale === 0;
  const isStar = isStellarCategory(params.objectCategory);
  const isTon618 = activePresetId === 'ton618';

  // Critical impact parameter for Kerr spacetime
  const bCrit = isStar ? 0.0 : 2.62 * (1.0 - params.spin * 0.22);
  const absB = Math.abs(impactB);
  const isCaptured = absB < bCrit - 0.12;
  const isResonant = absB >= bCrit - 0.12 && absB <= bCrit + 0.18;

  // Dedicated Mobile / Phone Viewport Layout:
  // Ultra-compact, non-scrollable, fits 100% on phone screens (<190px total height)
  // Leaves 75-80% of screen unblocked for viewing the 3D black hole
  if (isPhoneMode) {
    if (isCollapsed) {
      return (
        <div className="hud-dock fixed left-1/2 -translate-x-1/2 bottom-2 z-20 pointer-events-auto w-[calc(100vw-1rem)] max-w-sm">
          <div className="hud-panel flex items-center justify-between gap-1.5 px-3 py-1.5 bg-[#060911]/95 border border-amber-500/40 rounded-full shadow-2xl">
            {/* Target Preset Pill */}
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                onToggleCollapse();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-200 hover:text-white truncate max-w-[125px] cursor-pointer"
            >
              {isStar ? (
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{activePreset.name.split(' ')[0]}</span>
              <ChevronUp className="w-3 h-3 text-neutral-400 shrink-0" />
            </button>

            {/* Quick Play/Pause */}
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                onChangeParams((prev) => ({
                  ...prev,
                  timeScale: prev.timeScale === 0 ? 1.0 : 0.0,
                }));
              }}
              className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                isPaused
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
              }`}
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {isPaused ? (
                <Play className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Quick Sonic Boom Shockwave Pulse */}
            <button
              type="button"
              onClick={() => {
                haptics.pulseBoom();
                if (isPaused) {
                  onChangeParams((prev) => ({ ...prev, timeScale: 1.0 }));
                }
                onTriggerPulse();
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-900 hover:bg-neutral-850 text-amber-300 border border-neutral-800 cursor-pointer"
              title="Trigger Sonic Boom Pulse"
            >
              <Waves className="w-3 h-3 text-amber-400" />
              <span>Pulse</span>
            </button>

            {/* Quick Focus Mode Toggle */}
            {onToggleFocusMode && (
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onToggleFocusMode();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-900 hover:bg-neutral-850 text-amber-300 border border-neutral-800 cursor-pointer"
                title="Enter Focus Mode (Shortcut: F)"
              >
                <Eye className="w-3 h-3 text-amber-400" />
                <span>Focus</span>
              </button>
            )}

            {/* Expand Controls Drawer */}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onToggleCollapse();
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-amber-500/25 border border-amber-500/60 rounded-full hover:bg-amber-500/40 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span>Controls</span>
            </button>
          </div>
        </div>
      );
    }

    // Expanded Phone Mode Drawer
    return (
      <div className="hud-dock fixed left-1/2 -translate-x-1/2 bottom-1 z-20 pointer-events-auto w-[calc(100vw-0.75rem)] max-w-sm sm:max-w-md">
        <div className="hud-panel bg-[#060911]/98 border border-neutral-800/90 rounded-2xl shadow-2xl p-2 flex flex-col gap-1.5">
          {/* Header Row: Minimize + Target Switcher + Quick Actions */}
          <div className="flex items-center justify-between gap-1 pb-1 border-b border-neutral-800/80">
            {/* Minimize Button */}
            <button
              type="button"
              onClick={() => {
                haptics.light();
                onToggleCollapse();
              }}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-neutral-300 bg-neutral-900 hover:bg-neutral-850 rounded-md border border-neutral-800 cursor-pointer shrink-0"
              title="Minimize Controls"
            >
              <ChevronDown className="w-3 h-3 text-amber-400" />
              <span>Min</span>
            </button>

            {/* Target Preset Selector with Prev/Next buttons */}
            <div className="flex items-center gap-0.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={handlePrevPreset}
                className="p-1 rounded bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer shrink-0"
                title="Previous Preset"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <div className="relative flex-1 min-w-0">
                <select
                  value={activePresetId}
                  onChange={(e) => {
                    haptics.medium();
                    onSelectPreset(e.target.value);
                  }}
                  className="w-full pl-1.5 pr-4 py-0.5 text-[11px] font-bold bg-neutral-900 border border-neutral-700/80 text-amber-200 rounded appearance-none outline-none truncate cursor-pointer"
                >
                  <optgroup label="Black Holes" className="bg-neutral-950 text-neutral-200">
                    {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'black_hole').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.plainMassExplanation})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Compact Relativistic Stars" className="bg-neutral-950 text-neutral-200">
                    {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'star').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.plainMassExplanation})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Luminous & Hypergiant Stars" className="bg-neutral-950 text-neutral-200">
                    {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'luminous_star').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.plainMassExplanation})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                  <ChevronDown className="w-2.5 h-2.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextPreset}
                className="p-1 rounded bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer shrink-0"
                title="Next Preset"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Transport Icons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  onChangeParams((prev) => ({
                    ...prev,
                    timeScale: prev.timeScale === 0 ? 1.0 : 0.0,
                  }));
                }}
                className={`p-1 rounded border transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                    : 'text-neutral-300 bg-neutral-900 border-neutral-800 hover:bg-neutral-850'
                }`}
                title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              >
                {isPaused ? (
                  <Play className="w-3 h-3 fill-amber-400 text-amber-400" />
                ) : (
                  <Pause className="w-3 h-3" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.pulseBoom();
                  if (isPaused) {
                    onChangeParams((prev) => ({ ...prev, timeScale: 1.0 }));
                  }
                  onTriggerPulse();
                }}
                className="p-1 rounded text-neutral-200 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 cursor-pointer"
                title="Trigger Sonic Boom Pulse"
              >
                <Waves className="w-3 h-3 text-amber-300" />
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onToggleAudio();
                }}
                className={`p-1 rounded border transition-colors cursor-pointer ${
                  audioEnabled
                    ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
                title="Toggle Audio"
              >
                {audioEnabled ? (
                  <Volume2 className="w-3 h-3 text-amber-400" />
                ) : (
                  <VolumeX className="w-3 h-3" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.heavy();
                  onResetParams();
                }}
                className="p-1 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded cursor-pointer"
                title="Reset Parameters"
              >
                <RotateCcw className="w-3 h-3" />
              </button>

              {onOpenQuickGuideModal && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onOpenQuickGuideModal();
                  }}
                  className="p-1 text-amber-300 hover:text-amber-200 bg-neutral-900 border border-amber-500/40 rounded cursor-pointer"
                  title="Open Physics Quick-Guide (Simple Analogies)"
                >
                  <BookOpen className="w-3 h-3" />
                </button>
              )}

              {onToggleFocusMode && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onToggleFocusMode();
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded border cursor-pointer ${
                    isFocusMode
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                      : 'text-amber-300 bg-neutral-900 border-neutral-800 hover:border-amber-500/40'
                  }`}
                  title="Focus Mode (Shortcut: F)"
                >
                  <Eye className="w-3 h-3 text-amber-400" />
                  <span>Focus</span>
                </button>
              )}

              {onToggleCleanMode && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onToggleCleanMode();
                  }}
                  className="p-1 text-amber-400 bg-neutral-900 border border-neutral-800 rounded cursor-pointer"
                  title="Hide UI"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Segmented Mode Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-950 rounded-lg border border-neutral-800/90">
            {(
              [
                { id: 'spacetime', label: 'Space', icon: Sliders },
                { id: 'spectral', label: 'Layers', icon: Layers },
                { id: 'camera', label: 'Cam', icon: Camera },
                { id: 'geodesics', label: 'Rays', icon: Orbit },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setActiveTab(tab.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-neutral-800 text-amber-300 font-semibold border border-neutral-700/80 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Spacetime Parameters */}
          {activeTab === 'spacetime' && (
            <div className="flex flex-col gap-1.5">
              {/* 2x2 Ultra-Compact Sliders */}
              <div className="grid grid-cols-2 gap-1.5">
                {/* Mass */}
                <div className="flex flex-col justify-between gap-1 px-2 py-1.5 rounded-md bg-neutral-950 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-[10px] leading-tight">
                    <span className="text-neutral-400 font-medium flex items-center gap-1">
                      <Scale className="w-2.5 h-2.5 text-amber-400" />
                      <span>{isStar ? 'Mass' : 'Mass'}</span>
                    </span>
                    <span className="font-mono text-neutral-100 font-bold tabular-nums">
                      {params.massSolar.toFixed(1)} <span className="text-amber-400/80 text-[9px]">M☉</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={isStar ? 1.4 : 5}
                    max={100}
                    step={0.5}
                    value={params.massSolar}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({ ...prev, massSolar: parseFloat(e.target.value) }));
                    }}
                    className="sci-slider w-full !mt-1 !mb-0.5"
                  />
                </div>

                {/* Kerr Spin */}
                <div className="flex flex-col justify-between gap-1 px-2 py-1.5 rounded-md bg-neutral-950 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-[10px] leading-tight">
                    <span className="text-neutral-400 font-medium flex items-center gap-1">
                      <Orbit className="w-2.5 h-2.5 text-amber-400" />
                      <span>Spin (a*)</span>
                    </span>
                    <span className="font-mono text-amber-300 font-bold tabular-nums">
                      {params.spin.toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.998}
                    step={0.002}
                    value={params.spin}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({ ...prev, spin: parseFloat(e.target.value) }));
                    }}
                    className="sci-slider w-full !mt-1 !mb-0.5"
                  />
                </div>

                {/* Accretion Rate */}
                <div className="flex flex-col justify-between gap-1 px-2 py-1.5 rounded-md bg-neutral-950 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-[10px] leading-tight">
                    <span className="text-neutral-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      <span>{isStar ? 'Wind' : 'Accretion'}</span>
                    </span>
                    <span className="font-mono text-neutral-100 font-bold tabular-nums">
                      {params.accretionRate.toFixed(2)} <span className="text-neutral-500 text-[9px]">Ṁ</span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={2.0}
                    step={0.05}
                    value={params.accretionRate}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({ ...prev, accretionRate: parseFloat(e.target.value) }));
                    }}
                    className="sci-slider w-full !mt-1 !mb-0.5"
                  />
                </div>

                {/* Gravity Well Depth */}
                <div className="flex flex-col justify-between gap-1 px-2 py-1.5 rounded-md bg-neutral-950 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-[10px] leading-tight">
                    <span className="text-neutral-400 font-medium flex items-center gap-1">
                      <Compass className="w-2.5 h-2.5 text-cyan-400" />
                      <span>Well Depth</span>
                    </span>
                    <span className="font-mono text-neutral-200 font-bold tabular-nums">
                      {(params.wellDepthMultiplier || 2.2).toFixed(1)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={3.5}
                    step={0.1}
                    value={params.wellDepthMultiplier || 2.2}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({ ...prev, wellDepthMultiplier: parseFloat(e.target.value) }));
                    }}
                    className="sci-slider w-full !mt-1 !mb-0.5"
                  />
                </div>
              </div>

              {/* Bottom Quick Toggles Row */}
              <div className="flex items-center justify-between gap-1 text-[10px] pt-1 border-t border-neutral-800/80">
                {/* Accretion State Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onChangeParams((prev) => ({
                      ...prev,
                      accretionState: prev.accretionState === 'active' ? 'quiescent' : 'active',
                    }));
                  }}
                  className={`flex-1 py-1 px-1.5 rounded border font-mono uppercase tracking-wider text-center transition-colors cursor-pointer truncate ${
                    params.accretionState === 'active'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/70 font-bold'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  {params.accretionState === 'active' ? 'Disk: Active' : 'Disk: Thin'}
                </button>

                {/* Gravitational Lensing Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onChangeParams((prev) => ({
                      ...prev,
                      gravitationalLensing: !prev.gravitationalLensing,
                    }));
                  }}
                  className={`flex-1 py-1 px-1.5 rounded border font-mono uppercase tracking-wider text-center transition-colors cursor-pointer truncate ${
                    params.gravitationalLensing
                      ? 'bg-neutral-800 text-amber-300 border-neutral-700 font-bold'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  {params.gravitationalLensing ? 'Lens: On' : 'Lens: Off'}
                </button>

                {/* Doppler Beaming Quick Step */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.sliderTick();
                    onChangeParams((prev) => ({
                      ...prev,
                      dopplerStrength: prev.dopplerStrength >= 1.0 ? 0.0 : Math.round((prev.dopplerStrength + 0.35) * 100) / 100,
                    }));
                  }}
                  className="flex-1 py-1 px-1.5 rounded border border-neutral-800 bg-neutral-950 text-neutral-300 font-mono text-center cursor-pointer truncate"
                  title="Cycle Doppler Beaming (0% -> 35% -> 70% -> 100%)"
                >
                  Doppler: {(params.dopplerStrength * 100).toFixed(0)}%
                </button>

                {/* System Category: Isolated vs Binary */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    const nextCat: SystemCategory = params.systemCategory === 'binary' ? 'isolated' : 'binary';
                    if (onChangeSystemCategory) {
                      onChangeSystemCategory(nextCat);
                    } else {
                      onChangeParams((prev) => ({
                        ...prev,
                        objectCategory: 'black_hole',
                        systemCategory: nextCat,
                      }));
                    }
                  }}
                  className={`flex-1 py-1 px-1.5 rounded border font-mono uppercase tracking-wider text-center transition-colors cursor-pointer truncate ${
                    params.systemCategory === 'binary'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/70 font-bold'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  {params.systemCategory === 'binary' ? 'Binary' : 'Single'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Spectral & Layers */}
          {activeTab === 'spectral' && (
            <div className="flex flex-col gap-1.5 text-xs">
              {/* Row 1: Spectral Filters */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'blackbody', label: 'Optical' },
                    { id: 'eht230ghz', label: '230GHz' },
                    { id: 'xray', label: 'Chandra' },
                    { id: 'doppler', label: 'Doppler' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onChangeParams((prev) => ({ ...prev, spectralMode: mode.id }));
                    }}
                    className={`flex-1 py-1 text-[10px] font-medium rounded border transition-colors cursor-pointer text-center truncate ${
                      params.spectralMode === mode.id
                        ? 'bg-neutral-800 text-amber-300 font-semibold border-neutral-700 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Row 2: Subsystem Layers */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, accretionDisk: !prev.layers.accretionDisk },
                    }));
                  }}
                  className={`py-1 text-[10px] rounded border transition-colors cursor-pointer text-center truncate ${
                    params.layers.accretionDisk
                      ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                  }`}
                >
                  Disk
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, spacetimeGrid: !prev.layers.spacetimeGrid },
                    }));
                  }}
                  className={`py-1 text-[10px] rounded border transition-colors cursor-pointer text-center truncate ${
                    params.layers.spacetimeGrid
                      ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    const nextOrbitalStars = !params.layers.orbitalStars;
                    if (!nextOrbitalStars && activeCamera === 'star') {
                      onSelectCamera('equatorial');
                    }
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, orbitalStars: nextOrbitalStars },
                    }));
                  }}
                  className={`py-1 text-[10px] rounded border transition-colors cursor-pointer text-center truncate ${
                    params.layers.orbitalStars
                      ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                  }`}
                >
                  S-Stars
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: {
                        ...prev.layers,
                        anatomyLines: !(prev.layers.anatomyLines ?? false),
                      },
                    }));
                  }}
                  className={`py-1 text-[10px] rounded border transition-colors cursor-pointer text-center truncate ${
                    params.layers.anatomyLines ?? false
                      ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700'
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                  }`}
                >
                  Anatomy
                </button>
              </div>

              {/* Row 3: Exploded View Scrubber & Background Theme */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap">Explode:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={params.explodedSeparation}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({
                        ...prev,
                        explodedSeparation: parseFloat(e.target.value),
                      }));
                    }}
                    className="sci-slider flex-1 !my-0.5"
                  />
                  <span className="font-mono text-[9px] text-amber-300 font-bold tabular-nums">
                    {(params.explodedSeparation * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {Object.values(BACKGROUND_THEMES).slice(0, 3).map((theme) => {
                    const isActive = (params.backgroundTheme || 'galactic_core') === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          haptics.light();
                          onChangeParams((prev) => ({
                            ...prev,
                            backgroundTheme: theme.id,
                          }));
                        }}
                        className={`px-1.5 py-0.5 text-[9px] rounded border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-neutral-800 text-amber-300 font-bold border-neutral-700'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {theme.id === 'pure_black' ? 'Black' : theme.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Camera Viewports */}
          {activeTab === 'camera' && (
            <div className="grid grid-cols-3 gap-1">
              {onToggleCinematicTour && (
                <button
                  type="button"
                  data-testid="camera-tab-cinematic-tour-btn"
                  onClick={() => {
                    haptics.medium();
                    onToggleCinematicTour();
                  }}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md border text-center transition-all cursor-pointer ${
                    isCinematicTourActive
                      ? 'bg-amber-500/25 text-amber-200 font-semibold border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-neutral-950 text-amber-300 border-amber-500/40 hover:border-amber-400 hover:text-white'
                  }`}
                  title="Toggle Automated Cinematic Camera Tour"
                >
                  <Orbit
                    className={`w-3 h-3 shrink-0 ${
                      isCinematicTourActive ? 'text-amber-300 animate-spin' : 'text-amber-400'
                    }`}
                  />
                  <span className="text-[10px] font-semibold truncate">
                    {isCinematicTourActive ? 'Tour: On' : 'Cinematic'}
                  </span>
                </button>
              )}

              {(
                [
                  { id: 'equatorial', label: 'Equatorial' },
                  { id: 'polar', label: 'Polar Jet' },
                  { id: 'plunge_45', label: '45° Plunge' },
                  { id: 'grazing', label: 'Grazing' },
                  { id: 'well', label: 'Gravity Well' },
                  ...(params.layers.orbitalStars
                    ? ([{ id: 'star', label: 'S2 Star' }] as const)
                    : []),
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onSelectCamera(preset.id);
                  }}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md border text-center transition-all cursor-pointer ${
                    activeCamera === preset.id && !isCinematicTourActive
                      ? 'bg-neutral-800 text-amber-300 font-semibold border-neutral-700 shadow-sm'
                      : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:text-white'
                  }`}
                >
                  <Camera className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span className="text-[10px] font-medium truncate">{preset.label}</span>
                </button>
              ))}

              {/* True Scale Visualizer */}
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  onChangeParams((prev) => ({
                    ...prev,
                    trueCosmicScale: !prev.trueCosmicScale,
                  }));
                }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md border text-center transition-all cursor-pointer ${
                  params.trueCosmicScale
                    ? 'bg-neutral-800 text-amber-300 font-semibold border-neutral-700 shadow-sm'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3 h-3 text-neutral-400 shrink-0" />
                <span className="text-[10px] font-medium truncate">
                  {params.trueCosmicScale ? 'Scale: True' : 'True Scale'}
                </span>
              </button>
            </div>
          )}

          {/* Tab 4: Geodesic Photon Launcher */}
          {activeTab === 'geodesics' && (
            <div className="flex flex-col gap-1.5">
              {/* Impact Parameter Slider */}
              <div className="flex flex-col justify-between px-1.5 py-1 rounded-md bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center justify-between text-[10px] leading-tight">
                  <span className="text-neutral-400 font-medium flex items-center gap-1">
                    <Orbit className="w-2.5 h-2.5 text-amber-400" />
                    <span>Impact (b)</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold tabular-nums">
                    {impactB >= 0 ? `+${impactB.toFixed(1)}` : impactB.toFixed(1)} Rₛ
                  </span>
                  <span className="text-[9px] font-mono">
                    {isCaptured ? (
                      <span className="text-rose-400 font-bold">Plunge</span>
                    ) : isResonant ? (
                      <span className="text-amber-400 font-bold">Orbit</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">Escape</span>
                    )}
                  </span>
                </div>
                <input
                  type="range"
                  min={-6.0}
                  max={6.0}
                  step={0.1}
                  value={impactB}
                  onChange={(e) => {
                    haptics.sliderTick();
                    setImpactB(parseFloat(e.target.value));
                  }}
                  className="sci-slider w-full !my-0.5"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onLaunchPhoton(impactB);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-750 text-amber-300 border border-neutral-700 transition-colors cursor-pointer shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>Fire Ray Pulse</span>
                </button>

                {onExportGeodesicCsv && (
                  <button
                    type="button"
                    data-testid="export-geodesic-csv-btn-phone"
                    onClick={() => {
                      haptics.medium();
                      onExportGeodesicCsv(impactB);
                    }}
                    className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 rounded-lg cursor-pointer"
                    title="Export live geodesic trajectory data as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onClearPhotons();
                  }}
                  className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer"
                  title="Clear active rays"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Control Dock Layout
  return (
    <div
      className={`hud-dock fixed left-1/2 bottom-1 sm:bottom-3 z-20 pointer-events-auto transition-transform duration-200 ease-out ${
        isPhoneMode
          ? 'w-[calc(100vw-0.75rem)] max-w-sm sm:max-w-md'
          : 'w-[calc(100vw-1.5rem)] max-w-5xl 2xl:max-w-6xl'
      }`}
      style={{
        transform: isCollapsed
          ? isPhoneMode
            ? 'translate(-50%, calc(100% - 32px))'
            : 'translate(-50%, calc(100% - 30px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Top Collapse / Expand & Clean UI Handle Bar */}
      <div className="flex justify-center items-center gap-2 mb-0.5">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onToggleCollapse();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono text-neutral-200 bg-neutral-950 border border-b-0 border-neutral-800 rounded-t-lg hover:text-amber-300 hover:bg-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg ${
            isPhoneMode ? 'text-[11px] py-1 px-3' : ''
          }`}
          title="Toggle Control Dock (Shortcut: H)"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>{isPhoneMode ? `${activePreset.name.split(' ')[0]} Controls` : 'Controls (H)'}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              <span>{isPhoneMode ? 'Minimize' : 'Minimize Dock'}</span>
            </>
          )}
        </button>

        {onToggleFocusMode && (
          <button
            type="button"
            data-testid="control-dock-focus-mode-btn"
            onClick={() => {
              haptics.medium();
              onToggleFocusMode();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono bg-neutral-950 border border-b-0 rounded-t-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg ${
              isFocusMode
                ? 'text-amber-200 border-amber-400/70 bg-amber-500/15'
                : 'text-neutral-200 border-neutral-800 hover:text-amber-300 hover:bg-neutral-900 hover:border-amber-500/40'
            } ${isPhoneMode ? 'text-[11px] py-1 px-2.5' : ''}`}
            title="Toggle Focus Mode: Hide non-essential HUD and show compact bottom status bar (Shortcut: F)"
          >
            <Eye className="w-3 h-3 text-amber-400" />
            <span>Focus Mode</span>
          </button>
        )}

        {onToggleCleanMode && (
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onToggleCleanMode();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono text-amber-300 bg-neutral-950 border border-b-0 border-neutral-800 rounded-t-lg hover:text-white hover:bg-neutral-900 hover:border-amber-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg ${
              isPhoneMode ? 'text-[11px] py-1 px-2.5' : ''
            }`}
            title="Hide all UI elements for a completely clean viewport (Shortcut: C)"
          >
            <EyeOff className="w-3 h-3 text-amber-400" />
            <span>Hide UI</span>
          </button>
        )}
      </div>

      {/* Main Grid Chassis */}
      <div
        className={`hud-panel bg-[#060911]/95 border border-neutral-800/90 rounded-xl shadow-2xl ${
          isPhoneMode
            ? 'p-2 flex flex-col gap-1.5 max-h-[48vh] overflow-y-auto overscroll-contain'
            : 'p-2.5 sm:p-3 flex flex-col gap-2 max-h-[46vh] sm:max-h-[50vh] overflow-y-auto'
        }`}
      >
        {/* ROW 1: Modular Command Bar */}
        {isPhoneMode ? (
          /* Phone Mode Ergonomic 2-Tier Command Bar */
          <div className="flex flex-col gap-1.5 pb-1.5 border-b border-neutral-800/80">
            {/* Tier 1: Segmented Mode Tabs + Quick Transport Icon Buttons */}
            <div className="flex items-center justify-between gap-1.5">
              {/* Mode Tabs */}
              <div className="flex items-center gap-0.5 p-0.5 bg-neutral-950 rounded-lg border border-neutral-800/90 flex-1 min-w-0">
                {(
                  [
                    { id: 'spacetime', label: 'Space', icon: Sliders },
                    { id: 'spectral', label: 'Layers', icon: Layers },
                    { id: 'camera', label: 'Cam', icon: Camera },
                    { id: 'geodesics', label: 'Rays', icon: Orbit },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setActiveTab(tab.id);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-neutral-800 text-amber-300 font-semibold border border-neutral-700/80 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Transport Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onChangeParams((prev) => ({
                      ...prev,
                      timeScale: prev.timeScale === 0 ? 1.0 : 0.0,
                    }));
                  }}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isPaused
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border-neutral-800'
                  }`}
                  title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
                >
                  {isPaused ? (
                    <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-neutral-300" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.pulseBoom();
                    if (isPaused) {
                      onChangeParams((prev) => ({ ...prev, timeScale: 1.0 }));
                    }
                    onTriggerPulse();
                  }}
                  className="p-1.5 rounded-lg text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-400 transition-colors cursor-pointer"
                  title="Trigger Relativistic Sonic Boom"
                >
                  <Waves className="w-3.5 h-3.5 text-amber-300" />
                </button>

                {onToggleCinematicTour && (
                  <button
                    type="button"
                    data-testid="control-dock-cinematic-tour-btn"
                    onClick={onToggleCinematicTour}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isCinematicTourActive
                        ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                        : 'text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border-neutral-700/80 hover:border-amber-400'
                    }`}
                    title="Cinematic Tour: Automatically pan through Polar, Equatorial, and 45° Plunge angles"
                  >
                    <Orbit className={`w-3.5 h-3.5 ${isCinematicTourActive ? 'text-amber-300 animate-spin' : 'text-amber-400'}`} />
                    <span>Cinematic Tour</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onToggleAudio();
                  }}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    audioEnabled
                      ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                  title="Toggle Audio"
                >
                  {audioEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.heavy();
                    onResetParams();
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                  title="Reset Parameters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tier 2: System Category Dropdown + Target Switcher */}
            <div className="flex items-center gap-1.5 w-full">
              {/* System Category: Isolated vs Binary */}
              <div className="relative flex items-center shrink-0">
                <select
                  aria-label="System Category"
                  value={params.systemCategory || 'isolated'}
                  onChange={(e) => {
                    haptics.medium();
                    const nextCat = e.target.value as SystemCategory;
                    if (onChangeSystemCategory) {
                      onChangeSystemCategory(nextCat);
                    } else {
                      onChangeParams((prev) => ({
                        ...prev,
                        objectCategory: 'black_hole',
                        systemCategory: nextCat,
                      }));
                    }
                  }}
                  className="pl-2 pr-5 py-1 text-[11px] bg-neutral-900 border border-amber-500/40 text-amber-200 font-semibold rounded-lg appearance-none outline-none cursor-pointer"
                >
                  <option value="isolated" className="bg-neutral-950 text-neutral-200">
                    Isolated
                  </option>
                  <option value="binary" className="bg-neutral-950 text-amber-200">
                    Binary
                  </option>
                </select>
                <div className="absolute right-1 pointer-events-none flex items-center text-amber-400">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              {/* Target Switcher: < [ Target Name ] > */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={handlePrevPreset}
                  className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer shrink-0"
                  title="Previous Target Preset"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="relative flex-1 min-w-0">
                  <select
                    value={activePresetId}
                    onChange={(e) => {
                      haptics.medium();
                      onSelectPreset(e.target.value);
                    }}
                    className="w-full pl-2 pr-6 py-1 text-[11px] bg-neutral-900 border border-neutral-700/80 text-neutral-200 font-semibold rounded-lg appearance-none outline-none truncate cursor-pointer"
                  >
                    <optgroup label="Black Holes" className="bg-neutral-950 text-neutral-200">
                      {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'black_hole').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.plainMassExplanation})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Compact Relativistic Stars" className="bg-neutral-950 text-neutral-200">
                      {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'star').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.plainMassExplanation})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Luminous & Hypergiant Stars" className="bg-neutral-950 text-neutral-200">
                      {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'luminous_star').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.plainMassExplanation})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-neutral-400">
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextPreset}
                  className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer shrink-0"
                  title="Next Target Preset"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Unified Modular Command Bar */
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 pb-2 border-b border-neutral-800/80">
            {/* Section A: Segmented Mode Tabs */}
            <div className="flex items-center gap-0.5 p-0.5 bg-neutral-950 rounded-lg border border-neutral-800/90 shrink-0">
              {(
                [
                  { id: 'spacetime', label: 'Spacetime', icon: Sliders },
                  { id: 'spectral', label: 'Layers', icon: Layers },
                  { id: 'camera', label: 'Camera', icon: Camera },
                  { id: 'geodesics', label: 'Geodesics', icon: Orbit },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      haptics.light();
                      setActiveTab(tab.id);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-neutral-800 text-amber-300 font-medium border border-neutral-700/80 shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Section B: System Category Dropdown + Astrophysical Target Selector */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
              {/* System Category Dropdown: Isolated Singularity vs Binary Accretion (shown on 2xl; TopBar always provides this dropdown) */}
              <div className="hidden 2xl:flex relative items-center shrink-0">
                <select
                  aria-label="System Category"
                  value={params.systemCategory || 'isolated'}
                  onChange={(e) => {
                    haptics.medium();
                    const nextCat = e.target.value as SystemCategory;
                    if (onChangeSystemCategory) {
                      onChangeSystemCategory(nextCat);
                    } else {
                      onChangeParams((prev) => ({
                        ...prev,
                        objectCategory: 'black_hole',
                        systemCategory: nextCat,
                      }));
                    }
                  }}
                  className="pl-2.5 pr-6 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 hover:border-amber-400 text-amber-200 font-semibold rounded-lg transition-colors cursor-pointer appearance-none outline-none focus:border-amber-400"
                  title="System Category: Switch between Single Black Hole (Isolated Singularity) and Binary Accretion System (Roche Lobe Overflow)"
                >
                  <option value="isolated" className="bg-neutral-950 text-neutral-200">
                    Isolated Singularity
                  </option>
                  <option value="binary" className="bg-neutral-950 text-amber-200">
                    Binary Accretion
                  </option>
                </select>
                <div className="absolute right-1.5 pointer-events-none flex items-center text-amber-400">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePrevPreset}
                className="p-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Previous Target Preset"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="relative flex-1 min-w-0 overflow-hidden">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-amber-400 z-10">
                  {isStar ? (
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <select
                  value={activePresetId}
                  onChange={(e) => {
                    haptics.medium();
                    onSelectPreset(e.target.value);
                  }}
                  className="block w-full min-w-0 max-w-full pl-8 pr-6 py-1.5 text-xs bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-amber-400/80 text-neutral-200 font-semibold rounded-lg transition-colors cursor-pointer appearance-none outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 truncate"
                  title="Select Astrophysical Target (TON 618, Sagittarius A*, M87*, Cygnus X-1, Pulsars, etc.)"
                >
                  <optgroup label="Black Holes (Ultramassive to Primordial)" className="bg-neutral-950 text-neutral-200">
                    {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'black_hole').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.plainMassExplanation})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Compact Relativistic Stars" className="bg-neutral-950 text-neutral-200">
                    {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'star').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.plainMassExplanation})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Luminous & Hypergiant Stars" className="bg-neutral-950 text-neutral-200">
                    {ASTROPHYSICAL_PRESETS.filter((p) => p.category === 'luminous_star').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.plainMassExplanation})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-neutral-400 z-10">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextPreset}
                className="p-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Next Target Preset"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Section C: Transport Actions */}
            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  onChangeParams((prev) => ({
                    ...prev,
                    timeScale: prev.timeScale === 0 ? 1.0 : 0.0,
                  }));
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer border ${
                  isPaused
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border-neutral-800 hover:text-white'
                }`}
                title={isPaused ? 'Resume Simulation (Space)' : 'Pause Simulation (Space)'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <Pause className="w-3.5 h-3.5 text-neutral-400" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.pulseBoom();
                  if (isPaused) {
                    onChangeParams((prev) => ({ ...prev, timeScale: 1.0 }));
                  }
                  onTriggerPulse();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-slate-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Trigger Relativistic Sonic Boom (N-Wave Pressure Shock)"
              >
                <Waves className="w-3.5 h-3.5 text-slate-300" />
                <span>Pulse</span>
              </button>

              {onToggleCinematicTour && (
                <button
                  type="button"
                  data-testid="control-dock-cinematic-tour-btn"
                  onClick={onToggleCinematicTour}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                    isCinematicTourActive
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'text-amber-200/95 bg-neutral-900 hover:bg-neutral-800 border-amber-500/40 hover:border-amber-400 hover:text-white'
                  }`}
                  title="Cinematic Tour: Automatically pan camera through Polar, Equatorial, and 45-Degree Plunge angles to showcase Kerr geometry"
                >
                  <Orbit
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isCinematicTourActive ? 'text-amber-300 animate-spin' : 'text-amber-400'
                    }`}
                  />
                  <span>
                    {isCinematicTourActive
                      ? `Tour: ${cinematicTourStageLabel}`
                      : 'Cinematic Tour'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onToggleAudio();
                }}
                className={`p-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                  audioEnabled
                    ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
                title="Toggle Relativistic Audio"
              >
                {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-400" />}
              </button>

              {onOpenQuickGuideModal && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onOpenQuickGuideModal();
                  }}
                  className="p-1.5 text-xs text-amber-300 hover:text-amber-100 bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 rounded-lg transition-colors cursor-pointer"
                  title="Open Physics Quick-Guide (Plain-English Analogies for Spin, Accretion Rate & Well Depth)"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
              )}

              {onToggleFocusMode && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onToggleFocusMode();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                    isFocusMode
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                      : 'text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border-neutral-700/80 hover:border-amber-400 hover:text-white'
                  }`}
                  title="Toggle Focus Mode (Shortcut: F)"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Focus</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  haptics.heavy();
                  onResetParams();
                }}
                className="p-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                title={`Reset Default Parameters for ${activePreset.name}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ROW 2: Modular Content Grid for Active Tab */}

        {/* TAB 1: SPACETIME PARAMETERS GRID */}
        {activeTab === 'spacetime' && (
          <div className="flex flex-col gap-2">
            <div className={`grid ${isPhoneMode ? 'grid-cols-2 gap-1.5' : 'grid-cols-2 md:grid-cols-4 gap-2'}`}>
              {/* Module 1: Mass */}
              <div className={`flex flex-col justify-between gap-1 ${isPhoneMode ? 'p-1.5' : 'p-2'} rounded-lg bg-neutral-950 border border-neutral-800/80`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1">
                    <Scale className="w-3 h-3 text-amber-400/90" />
                    <span>{isStar ? 'Mass' : 'Mass (M)'}</span>
                  </span>
                  <span className="font-mono text-xs text-neutral-100 font-bold tabular-nums">
                    {params.massSolar.toFixed(1)} <span className="text-amber-400/80 text-[10px]">M☉</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={isStar ? 1.4 : 5}
                  max={100}
                  step={0.5}
                  value={params.massSolar}
                  onChange={(e) => {
                    haptics.sliderTick();
                    onChangeParams((prev) => ({ ...prev, massSolar: parseFloat(e.target.value) }));
                  }}
                  className="sci-slider w-full"
                />
                <div className={`flex items-center justify-between ${isPhoneMode ? 'text-[9px]' : 'text-[10px]'} font-mono text-neutral-500`}>
                  <span>{isStar ? '1.4 TOV' : '5 M☉'}</span>
                  <span className="text-neutral-400">
                    {isStar ? 'R 20km' : `r₊ ${metrics.eventHorizonKm.toFixed(0)} km`}
                  </span>
                </div>
              </div>

              {/* Module 2: Kerr Spin Parameter */}
              <div className={`flex flex-col justify-between gap-1 ${isPhoneMode ? 'p-1.5' : 'p-2'} rounded-lg bg-neutral-950 border border-neutral-800/80`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1">
                    <Orbit className="w-3 h-3 text-amber-400/90" />
                    <span>{isStar ? 'Spin' : 'Kerr Spin (a*)'}</span>
                  </span>
                  <span className="font-mono text-xs text-amber-300/90 font-bold tabular-nums">
                    {params.spin.toFixed(3)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.998}
                  step={0.002}
                  value={params.spin}
                  onChange={(e) => {
                    haptics.sliderTick();
                    onChangeParams((prev) => ({ ...prev, spin: parseFloat(e.target.value) }));
                  }}
                  className="sci-slider w-full"
                />
                <div className={`flex items-center justify-between ${isPhoneMode ? 'text-[9px]' : 'text-[10px]'} font-mono text-neutral-500`}>
                  <span>0.000</span>
                  <span className="text-neutral-400">0.998 Limit</span>
                </div>
              </div>

              {/* Module 3: Accretion Flux */}
              <div className={`flex flex-col justify-between gap-1 ${isPhoneMode ? 'p-1.5' : 'p-2'} rounded-lg bg-neutral-950 border border-neutral-800/80`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400/90" />
                    <span>{isStar ? 'Wind Flux' : 'Accretion (ṁ)'}</span>
                  </span>
                  <span className="font-mono text-xs text-neutral-100 font-bold tabular-nums">
                    {params.accretionRate.toFixed(2)} <span className="text-neutral-500 text-[10px]">Ṁ_Edd</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={2.0}
                  step={0.05}
                  value={params.accretionRate}
                  onChange={(e) => {
                    haptics.sliderTick();
                    onChangeParams((prev) => ({
                      ...prev,
                      accretionRate: parseFloat(e.target.value),
                    }));
                  }}
                  className="sci-slider w-full"
                />
                <div className={`flex items-center justify-between ${isPhoneMode ? 'text-[9px]' : 'text-[10px]'} font-mono text-neutral-500`}>
                  <span>{(metrics.peakDiskTempK / 1e6).toFixed(1)} MK</span>
                  <span>Plasma</span>
                </div>
              </div>

              {/* Module 4: Gravity Well Depth */}
              <div className={`flex flex-col justify-between gap-1 ${isPhoneMode ? 'p-1.5' : 'p-2'} rounded-lg bg-neutral-950 border border-neutral-800/80`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1">
                    <Compass className="w-3 h-3 text-cyan-400/90" />
                    <span>Well Depth</span>
                  </span>
                  <span className="font-mono text-xs text-neutral-200 font-bold tabular-nums">
                    {(params.wellDepthMultiplier || 2.2).toFixed(1)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={3.5}
                  step={0.1}
                  value={params.wellDepthMultiplier || 2.2}
                  onChange={(e) => {
                    haptics.sliderTick();
                    onChangeParams((prev) => ({
                      ...prev,
                      wellDepthMultiplier: parseFloat(e.target.value),
                    }));
                  }}
                  className="sci-slider w-full"
                />
                <div className={`flex items-center justify-between ${isPhoneMode ? 'text-[9px]' : 'text-[10px]'} font-mono text-neutral-500`}>
                  <span>0.8× Shallow</span>
                  <span>3.5× Plunge</span>
                </div>
              </div>
            </div>

            {/* Bottom Sub-Strip */}
            {isPhoneMode ? (
              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-neutral-800/80 text-[11px]">
                {/* Accretion State: Quiescent vs Active */}
                <div className="flex items-center justify-between gap-1 px-1.5 py-1 bg-neutral-950 border border-neutral-800 rounded-md">
                  <span className="text-[10px] font-mono text-neutral-400">State:</span>
                  <div className="flex items-center gap-0.5">
                    {(
                      [
                        { id: 'quiescent', label: 'Quiescent' },
                        { id: 'active', label: 'Active' },
                      ] as const
                    ).map((mode) => {
                      const isSelected = (params.accretionState || 'quiescent') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            haptics.light();
                            onChangeParams((prev) => ({
                              ...prev,
                              accretionState: mode.id,
                            }));
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-200 border-amber-400/70 font-bold'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gravitational Lensing Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    onChangeParams((prev) => ({
                      ...prev,
                      gravitationalLensing: !prev.gravitationalLensing,
                    }));
                  }}
                  className={`flex items-center justify-between px-2 py-1 rounded-md border text-[11px] font-medium transition-all cursor-pointer ${
                    params.gravitationalLensing
                      ? 'bg-neutral-800 text-amber-300 border-neutral-700 shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400/90" />
                    <span>Lensing</span>
                  </span>
                  <span className="font-mono font-bold text-[10px] uppercase">
                    {params.gravitationalLensing ? 'On' : 'Off'}
                  </span>
                </button>

                {/* Doppler strength scrubber */}
                <div className="flex items-center gap-1 px-1.5 py-1 bg-neutral-950 border border-neutral-800 rounded-md">
                  <span className="text-[10px] font-mono text-neutral-400">Doppler:</span>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={params.dopplerStrength}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({
                        ...prev,
                        dopplerStrength: parseFloat(e.target.value),
                      }));
                    }}
                    className="sci-slider flex-1"
                  />
                  <span className="font-mono text-[10px] text-amber-300/90 font-bold tabular-nums w-7 text-right">
                    {(params.dopplerStrength * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Spacetime horizon telemetry */}
                <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-md whitespace-nowrap">
                  <span>ISCO <strong className="text-neutral-200 font-semibold">{metrics.iscoProgradeRg.toFixed(1)}</strong></span>
                  <span>·</span>
                  <span>r_ph <strong className="text-amber-300/90 font-semibold">{metrics.photonSphereRg.toFixed(1)}</strong></span>
                </div>
              </div>
            ) : (
              /* Desktop Sub-Strip: Accretion State + Gravitational Lensing Toggle + Doppler Beaming Slider + Telemetry */
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-1.5 border-t border-neutral-800/80 text-xs">
                {/* Accretion State: Quiescent vs Active */}
                <div className="sm:col-span-5 flex items-center justify-between gap-1.5 px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-md overflow-hidden">
                  <span className="text-[11px] font-mono text-neutral-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                    <Zap className="w-3 h-3 text-amber-400/90 shrink-0" />
                    <span>Accretion State:</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {(
                      [
                        { id: 'quiescent', label: 'Quiescent' },
                        { id: 'active', label: 'Active' },
                      ] as const
                    ).map((mode) => {
                      const isSelected = (params.accretionState || 'quiescent') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            haptics.light();
                            onChangeParams((prev) => ({
                              ...prev,
                              accretionState: mode.id,
                            }));
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? mode.id === 'active'
                                ? 'bg-amber-500/20 text-amber-200 border-amber-400/70 font-bold shadow-sm'
                                : 'bg-neutral-800 text-amber-300 border-neutral-700 font-bold'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                          }`}
                          title={
                            mode.id === 'active'
                              ? 'Active State: Volumetrically thick, turbulent MHD torus with high-energy thermal emission and smoothly connected lensed arcs'
                              : 'Quiescent State: Razor-thin equatorial Novikov-Thorne disk'
                          }
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gravitational Lensing Toggle */}
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onChangeParams((prev) => ({
                        ...prev,
                        gravitationalLensing: !prev.gravitationalLensing,
                      }));
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-md border text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      params.gravitationalLensing
                        ? 'bg-neutral-800 text-amber-300 border-neutral-700 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                    title="Toggle Interstellar Gargantua Double-Arch Deflection"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400/90 shrink-0" />
                      <span>Lensing:</span>
                    </span>
                    <span className="font-mono font-bold text-[10px] uppercase">
                      {params.gravitationalLensing ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>

                {/* Doppler strength scrubber */}
                <div className="sm:col-span-3 flex items-center gap-1.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded-md min-w-0 overflow-hidden">
                  <span className="text-[11px] font-mono text-neutral-400 whitespace-nowrap shrink-0">Doppler:</span>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={params.dopplerStrength}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({
                        ...prev,
                        dopplerStrength: parseFloat(e.target.value),
                      }));
                    }}
                    className="sci-slider flex-1 min-w-0 w-full"
                  />
                  <span className="font-mono text-[11px] text-amber-300/90 font-bold tabular-nums shrink-0 text-right">
                    {(params.dopplerStrength * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Spacetime horizon telemetry */}
                <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-1.5 px-2 py-1 text-[10px] font-mono text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-md whitespace-nowrap">
                  <span>ISCO <strong className="text-neutral-200 font-semibold">{metrics.iscoProgradeRg.toFixed(1)}</strong></span>
                  <span>·</span>
                  <span>r_ph <strong className="text-amber-300/90 font-semibold">{metrics.photonSphereRg.toFixed(1)}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LAYERS, SPECTRAL FILTERS & BACKGROUND GRID */}
        {activeTab === 'spectral' && (
          isPhoneMode ? (
            /* Phone Mode 2x2 Grid for Layers & Filters */
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {/* Box 1: Spectral Filter */}
              <div className="flex flex-col justify-between p-1.5 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                  Spectral Band
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'blackbody', label: 'Optical' },
                      { id: 'eht230ghz', label: '230GHz' },
                      { id: 'xray', label: 'Chandra' },
                      { id: 'doppler', label: 'Doppler' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        haptics.light();
                        onChangeParams((prev) => ({ ...prev, spectralMode: mode.id }));
                      }}
                      className={`px-1.5 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer text-center ${
                        params.spectralMode === mode.id
                          ? 'bg-neutral-800 text-amber-300 font-semibold border-neutral-700 shadow-sm'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Box 2: Accretion State & Exploded View */}
              <div className="flex flex-col justify-between p-1.5 rounded-lg bg-neutral-950 border border-neutral-800/80 gap-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-400 uppercase">State</span>
                  <div className="flex gap-0.5">
                    {(
                      [
                        { id: 'quiescent', label: 'Quiescent' },
                        { id: 'active', label: 'Active' },
                      ] as const
                    ).map((stateMode) => (
                      <button
                        key={stateMode.id}
                        type="button"
                        onClick={() => {
                          haptics.light();
                          onChangeParams((prev) => ({ ...prev, accretionState: stateMode.id }));
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border cursor-pointer ${
                          (params.accretionState || 'quiescent') === stateMode.id
                            ? 'bg-amber-500/20 text-amber-200 border-amber-400/70 font-semibold'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {stateMode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-neutral-300 font-medium">Exploded View</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {(params.explodedSeparation * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={params.explodedSeparation}
                    onChange={(e) => {
                      haptics.sliderTick();
                      onChangeParams((prev) => ({
                        ...prev,
                        explodedSeparation: parseFloat(e.target.value),
                      }));
                    }}
                    className="sci-slider w-full mt-0.5"
                  />
                </div>
              </div>

              {/* Box 3: Subsystem Layers */}
              <div className="flex flex-col p-1.5 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                  Layers
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: { ...prev.layers, accretionDisk: !prev.layers.accretionDisk },
                      }));
                    }}
                    className={`px-1.5 py-1 text-[10px] rounded border transition-colors cursor-pointer text-center ${
                      params.layers.accretionDisk
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    Disk
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: { ...prev.layers, spacetimeGrid: !prev.layers.spacetimeGrid },
                      }));
                    }}
                    className={`px-1.5 py-1 text-[10px] rounded border transition-colors cursor-pointer text-center ${
                      params.layers.spacetimeGrid
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    Grid Well
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      const nextOrbitalStars = !params.layers.orbitalStars;
                      if (!nextOrbitalStars && activeCamera === 'star') {
                        onSelectCamera('equatorial');
                      }
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: { ...prev.layers, orbitalStars: nextOrbitalStars },
                      }));
                    }}
                    className={`px-1.5 py-1 text-[10px] rounded border transition-colors cursor-pointer text-center ${
                      params.layers.orbitalStars
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    S-Stars
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: {
                          ...prev.layers,
                          anatomyLines: !(prev.layers.anatomyLines ?? false),
                        },
                      }));
                    }}
                    className={`px-1.5 py-1 text-[10px] rounded border transition-colors cursor-pointer text-center ${
                      params.layers.anatomyLines ?? false
                        ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    Anatomy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: {
                          ...prev.layers,
                          microlensingStar: !(prev.layers.microlensingStar ?? false),
                        },
                      }));
                    }}
                    className={`col-span-2 px-1 py-0.5 text-[9px] rounded border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      params.layers.microlensingStar ?? false
                        ? 'bg-neutral-800 text-cyan-300 font-medium border-neutral-700 shadow-sm'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                    <span>Microlensing Star</span>
                  </button>
                </div>
              </div>

              {/* Box 4: Environment */}
              <div className="flex flex-col p-1.5 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                  Environment
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {Object.values(BACKGROUND_THEMES).map((theme) => {
                    const isActive = (params.backgroundTheme || 'galactic_core') === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          haptics.light();
                          onChangeParams((prev) => ({
                            ...prev,
                            backgroundTheme: theme.id,
                          }));
                        }}
                        className={`px-1 py-1 text-[10px] rounded border transition-all truncate cursor-pointer text-center ${
                          isActive
                            ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                            : 'bg-black text-neutral-400 border-neutral-800'
                        }`}
                        title={theme.name}
                      >
                        {theme.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Layout */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              {/* Cell 1: Observatory Spectral Band & Independent Accretion State (Cols 1-3) */}
              <div className="md:col-span-3 flex flex-col justify-between gap-1.5 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <div>
                  <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                    Spectral Filter
                  </span>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {(
                      [
                        { id: 'blackbody', label: 'Optical' },
                        { id: 'eht230ghz', label: 'EHT 230GHz' },
                        { id: 'xray', label: 'Chandra' },
                        { id: 'doppler', label: 'Doppler' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          onChangeParams((prev) => ({ ...prev, spectralMode: mode.id }))
                        }
                        className={`px-2 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer text-center ${
                          params.spectralMode === mode.id
                            ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Independent Physical Geometry Setting: Accretion State */}
                <div className="pt-1.5 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                      Accretion State
                    </span>
                    <span className="text-[9px] font-mono text-neutral-500">
                      Geometry
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {(
                      [
                        { id: 'quiescent', label: 'Quiescent' },
                        { id: 'active', label: 'Active' },
                      ] as const
                    ).map((stateMode) => {
                      const isSelected = (params.accretionState || 'quiescent') === stateMode.id;
                      return (
                        <button
                          key={stateMode.id}
                          type="button"
                          onClick={() =>
                            onChangeParams((prev) => ({
                              ...prev,
                              accretionState: stateMode.id,
                            }))
                          }
                          className={`px-2 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer text-center ${
                            isSelected
                              ? stateMode.id === 'active'
                                ? 'bg-amber-500/20 text-amber-200 border-amber-400/70 font-semibold shadow-sm'
                                : 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                          }`}
                        >
                          {stateMode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cell 2: Exploded Vertical Lift (Cols 4-6) */}
              <div className="md:col-span-3 flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Exploded View</span>
                  <span className="font-mono tabular-nums text-amber-300/90 font-bold">
                    {(params.explodedSeparation * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={params.explodedSeparation}
                  onChange={(e) => {
                    haptics.sliderTick();
                    onChangeParams((prev) => ({
                      ...prev,
                      explodedSeparation: parseFloat(e.target.value),
                    }));
                  }}
                  className="sci-slider w-full"
                />
                <span className="text-[10px] text-neutral-500 font-mono">
                  Vertical Manifold Lift
                </span>
              </div>

              {/* Cell 3: Anatomical Subsystems Toggle (Cols 6-8) */}
              <div className="md:col-span-3 flex flex-col gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Subsystem Layers
                </span>
                <div className="grid grid-cols-2 gap-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: { ...prev.layers, accretionDisk: !prev.layers.accretionDisk },
                      }))
                    }
                    className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                      params.layers.accretionDisk
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    Accretion Disk
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: { ...prev.layers, spacetimeGrid: !prev.layers.spacetimeGrid },
                      }))
                    }
                    className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                      params.layers.spacetimeGrid
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    Gravity Well
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextOrbitalStars = !params.layers.orbitalStars;
                      if (!nextOrbitalStars && activeCamera === 'star') {
                        onSelectCamera('equatorial');
                      }
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: { ...prev.layers, orbitalStars: nextOrbitalStars },
                      }));
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                      params.layers.orbitalStars
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700 font-medium'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    S-Stars
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: {
                          ...prev.layers,
                          anatomyLines: !(prev.layers.anatomyLines ?? false),
                        },
                      }))
                    }
                    className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                      params.layers.anatomyLines ?? false
                        ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    Anatomy Guide
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: {
                          ...prev.layers,
                          microlensingStar: !(prev.layers.microlensingStar ?? false),
                        },
                      }))
                    }
                    className={`col-span-2 px-2 py-1 text-xs rounded border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      params.layers.microlensingStar ?? false
                        ? 'bg-neutral-800 text-cyan-300 font-medium border-neutral-700 shadow-sm'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                    title="Toggle Distant Background Star Microlensing Path & Relativistic Doublet Images"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Microlensing Star (Paczyński Lensing)</span>
                  </button>
                </div>
              </div>

              {/* Cell 4: Cosmic Environment Swatches (Cols 9-12) */}
              <div className="md:col-span-3 flex flex-col gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Environment
                </span>
                <div className="grid grid-cols-1 gap-1 mt-0.5">
                  {Object.values(BACKGROUND_THEMES).map((theme) => {
                    const isActive = (params.backgroundTheme || 'galactic_core') === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() =>
                          onChangeParams((prev) => ({
                            ...prev,
                            backgroundTheme: theme.id,
                          }))
                        }
                        className={`px-2 py-1 text-xs rounded border transition-all truncate cursor-pointer text-left ${
                          isActive
                            ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                            : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-600'
                        }`}
                        title={theme.name}
                      >
                        {theme.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 3: CAMERA OBSERVATORY VIEWPORTS */}
        {activeTab === 'camera' && (
          <div
            className={`grid ${
              isPhoneMode
                ? 'grid-cols-3 gap-1.5'
                : `grid-cols-2 sm:grid-cols-4 ${
                    params.layers.orbitalStars ? 'md:grid-cols-8' : 'md:grid-cols-7'
                  } gap-2`
            }`}
          >
            {onToggleCinematicTour && (
              <button
                type="button"
                data-testid="camera-tab-cinematic-tour-btn"
                onClick={onToggleCinematicTour}
                className={`flex flex-col items-center justify-center ${
                  isPhoneMode ? 'p-1.5' : 'p-2'
                } rounded-lg border text-center transition-all cursor-pointer ${
                  isCinematicTourActive
                    ? 'bg-amber-500/25 text-amber-200 font-semibold border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-neutral-950 text-amber-300 border-amber-500/40 hover:border-amber-400 hover:text-white'
                }`}
                title="Automatically pan camera through Polar, Equatorial, and 45-Degree Plunge angles to showcase Kerr geometry"
              >
                <Orbit
                  className={`${isPhoneMode ? 'w-3 h-3 mb-0.5' : 'w-3.5 h-3.5 mb-0.5'} ${
                    isCinematicTourActive ? 'text-amber-300 animate-spin' : 'text-amber-400'
                  }`}
                />
                <span className={`${isPhoneMode ? 'text-[11px]' : 'text-xs'} font-semibold truncate w-full`}>
                  Cinematic Tour
                </span>
                <span
                  className={`text-[9px] font-mono ${
                    isCinematicTourActive ? 'text-amber-200' : 'text-neutral-400'
                  } truncate w-full`}
                >
                  {isCinematicTourActive ? cinematicTourStageLabel : 'Polar · Eq · 45° Plunge'}
                </span>
              </button>
            )}

            {(
              [
                { id: 'equatorial', label: 'Equatorial', desc: 'Accretion Plane' },
                { id: 'polar', label: 'Polar Axis', desc: 'Overhead Jet' },
                { id: 'plunge_45', label: '45° Plunge', desc: 'Kerr Infall' },
                { id: 'grazing', label: 'Grazing', desc: 'Rim Horizon' },
                { id: 'well', label: 'Gravity Well', desc: 'Throat Funnel' },
                ...(params.layers.orbitalStars
                  ? ([{ id: 'star', label: 'Orbiting Star', desc: 'S2 Companion' }] as const)
                  : []),
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  onSelectCamera(preset.id);
                }}
                className={`flex flex-col items-center justify-center ${
                  isPhoneMode ? 'p-1.5' : 'p-2'
                } rounded-lg border text-center transition-all cursor-pointer ${
                  activeCamera === preset.id && !isCinematicTourActive
                    ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <Camera className={`${isPhoneMode ? 'w-3 h-3 mb-0.5' : 'w-3.5 h-3.5 mb-0.5'} text-neutral-400`} />
                <span className={`${isPhoneMode ? 'text-[11px]' : 'text-xs'} font-semibold truncate w-full`}>
                  {preset.label}
                </span>
                <span
                  className={`text-[9px] font-mono ${
                    activeCamera === preset.id && !isCinematicTourActive ? 'text-amber-300/80' : 'text-neutral-500'
                  } truncate w-full`}
                >
                  {preset.desc}
                </span>
              </button>
            ))}

            {/* True Cosmic Scale Visualizer Tile */}
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                onChangeParams((prev) => ({
                  ...prev,
                  trueCosmicScale: !prev.trueCosmicScale,
                }));
              }}
              className={`flex flex-col items-center justify-center ${
                isPhoneMode ? 'p-1.5' : 'p-2'
              } rounded-lg border text-center transition-all cursor-pointer ${
                params.trueCosmicScale
                  ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <Maximize2 className={`${isPhoneMode ? 'w-3 h-3 mb-0.5' : 'w-3.5 h-3.5 mb-0.5'} text-neutral-400`} />
              <span className={`${isPhoneMode ? 'text-[11px]' : 'text-xs'} font-semibold`}>True Scale</span>
              <span
                className={`text-[9px] font-mono ${
                  params.trueCosmicScale ? 'text-amber-300/80' : 'text-neutral-500'
                }`}
              >
                {params.trueCosmicScale ? 'Gargantuan' : 'Normalized'}
              </span>
            </button>
          </div>
        )}

        {/* TAB 4: GEODESIC PHOTON LAUNCHER */}
        {activeTab === 'geodesics' && (
          isPhoneMode ? (
            /* Phone Mode Geodesics Launcher */
            <div className="flex flex-col gap-1.5">
              {/* Impact Parameter Slider */}
              <div className="flex flex-col justify-between gap-1 p-1.5 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1">
                    <Orbit className="w-3 h-3 text-amber-400/90" />
                    <span>Impact Parameter (b)</span>
                  </span>
                  <span className="font-mono text-xs text-amber-300/90 font-bold tabular-nums">
                    {impactB >= 0 ? `+${impactB.toFixed(1)}` : impactB.toFixed(1)} Rₛ
                  </span>
                </div>
                <input
                  type="range"
                  min={-6.0}
                  max={6.0}
                  step={0.1}
                  value={impactB}
                  onChange={(e) => {
                    haptics.sliderTick();
                    setImpactB(parseFloat(e.target.value));
                  }}
                  className="sci-slider w-full mt-0.5"
                />
                <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500">
                  <span>-6.0 Rₛ (Retrograde)</span>
                  <span>b_crit = {bCrit.toFixed(2)} Rₛ</span>
                  <span>+6.0 Rₛ (Prograde)</span>
                </div>
              </div>

              {/* Trajectory Outcome & Action Buttons */}
              <div className="grid grid-cols-2 gap-1.5 items-center">
                <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center justify-center text-center">
                  {isCaptured ? (
                    <span className="text-[11px] font-medium text-rose-300">Horizon Plunge (Captured)</span>
                  ) : isResonant ? (
                    <span className="text-[11px] font-medium text-amber-300">Photon Sphere (Orbit)</span>
                  ) : (
                    <span className="text-[11px] font-medium text-neutral-200">Einstein Escape</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.medium();
                      onLaunchPhoton(impactB);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-750 text-amber-300 border border-neutral-700 transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Fire Ray</span>
                  </button>

                  {onExportGeodesicCsv && (
                    <button
                      type="button"
                      onClick={() => {
                        haptics.medium();
                        onExportGeodesicCsv(impactB);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 rounded-lg cursor-pointer"
                      title="Export live geodesic trajectory data as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onClearPhotons();
                    }}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 border border-neutral-800 rounded-lg cursor-pointer"
                    title="Clear active rays"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Geodesics Launcher */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
              {/* Cell 1: Impact Parameter Slider (Cols 1-5) */}
              <div className="md:col-span-5 flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                    <Orbit className="w-3 h-3 text-amber-400/90" />
                    <span>Impact Parameter (b)</span>
                  </span>
                  <span className="font-mono text-xs text-amber-300/90 font-bold tabular-nums">
                    {impactB >= 0 ? `+${impactB.toFixed(1)}` : impactB.toFixed(1)} Rₛ
                  </span>
                </div>
                <input
                  type="range"
                  min={-6.0}
                  max={6.0}
                  step={0.1}
                  value={impactB}
                  onChange={(e) => {
                    haptics.sliderTick();
                    setImpactB(parseFloat(e.target.value));
                  }}
                  className="sci-slider w-full"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>-6.0 Rₛ (Retrograde)</span>
                  <span>+6.0 Rₛ (Prograde)</span>
                </div>
              </div>

              {/* Cell 2: Trajectory Outcome Prediction (Cols 6-8) */}
              <div className="md:col-span-3 flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80 h-full">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                  Trajectory Outcome
                </span>
                <div className="flex items-center gap-1.5 my-auto">
                  {isCaptured ? (
                    <span className="text-xs font-medium text-rose-300 bg-neutral-900 px-2 py-1 rounded border border-rose-900/60 w-full text-center">
                      Horizon Plunge (Captured)
                    </span>
                  ) : isResonant ? (
                    <span className="text-xs font-medium text-amber-300 bg-neutral-900 px-2 py-1 rounded border border-amber-900/60 w-full text-center">
                      Photon Sphere Near-Orbit
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-neutral-200 bg-neutral-900 px-2 py-1 rounded border border-neutral-700/60 w-full text-center">
                      Einstein Deflection (Escape)
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-neutral-500">
                  b_crit = {bCrit.toFixed(2)} Rₛ
                </span>
              </div>

              {/* Cell 3: Action Buttons (Cols 9-12) */}
              <div className="md:col-span-4 flex flex-col justify-center gap-1.5 h-full">
                <button
                  type="button"
                  onClick={() => {
                    haptics.medium();
                    onLaunchPhoton(impactB);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 transition-colors cursor-pointer shadow-md"
                  title="Fire a single test photon pulse to trace general-relativistic light bending"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Fire Single Ray</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  {onExportGeodesicCsv && (
                    <button
                      type="button"
                      data-testid="export-geodesic-csv-btn"
                      onClick={() => {
                        haptics.medium();
                        onExportGeodesicCsv(impactB);
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold text-cyan-300 hover:text-cyan-100 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/40 rounded-lg transition-colors cursor-pointer"
                      title="Export live geodesic trajectory data as a CSV file for external relativistic analysis"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export CSV</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      onClearPhotons();
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg transition-colors cursor-pointer ${
                      onExportGeodesicCsv ? '' : 'col-span-2'
                    }`}
                    title="Clear all active photon trajectories"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Rays</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
});
