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
} from 'lucide-react';
import {
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  DerivedRelativisticMetrics,
  GeodesicTrajectory,
  ObjectCategory,
  BACKGROUND_THEMES,
} from '../physics/gravitationalPhysics';
import { CameraPresetId } from '../scene/BlackHoleScene';

interface ControlDockProps {
  params: BlackHoleParams;
  metrics: DerivedRelativisticMetrics;
  activePresetId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleCleanMode?: () => void;
  onChangeParams: (updater: (prev: BlackHoleParams) => BlackHoleParams) => void;
  onSelectPreset: (presetId: string) => void;
  onResetParams: () => void;
  onSelectCamera: (preset: CameraPresetId) => void;
  activeCamera: CameraPresetId;
  onLaunchPhoton: (impactB: number) => void;
  onClearPhotons: () => void;
  lastTrajectory: GeodesicTrajectory | null;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenCosmicScaleModal: () => void;
  onTriggerPulse: () => void;
}

type DockTab = 'spacetime' | 'spectral' | 'camera' | 'geodesics';

export const ControlDock: React.FC<ControlDockProps> = ({
  params,
  metrics,
  activePresetId,
  isCollapsed,
  onToggleCollapse,
  onToggleCleanMode,
  onChangeParams,
  onSelectPreset,
  onResetParams,
  onSelectCamera,
  activeCamera,
  onLaunchPhoton,
  onClearPhotons,
  audioEnabled,
  onToggleAudio,
  onOpenCosmicScaleModal,
  onTriggerPulse,
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('spacetime');
  const [impactB, setImpactB] = useState<number>(2.4);

  const activePreset =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  const handlePrevPreset = () => {
    const curIdx = ASTROPHYSICAL_PRESETS.findIndex((p) => p.id === activePresetId);
    const prevIdx = (curIdx - 1 + ASTROPHYSICAL_PRESETS.length) % ASTROPHYSICAL_PRESETS.length;
    onSelectPreset(ASTROPHYSICAL_PRESETS[prevIdx].id);
  };

  const handleNextPreset = () => {
    const curIdx = ASTROPHYSICAL_PRESETS.findIndex((p) => p.id === activePresetId);
    const nextIdx = (curIdx + 1) % ASTROPHYSICAL_PRESETS.length;
    onSelectPreset(ASTROPHYSICAL_PRESETS[nextIdx].id);
  };

  const isPaused = params.timeScale === 0;
  const isStar = params.objectCategory === 'star';
  const isTon618 = activePresetId === 'ton618';

  // Critical impact parameter for Kerr spacetime
  const bCrit = isStar ? 0.0 : 2.62 * (1.0 - params.spin * 0.22);
  const absB = Math.abs(impactB);
  const isCaptured = absB < bCrit - 0.12;
  const isResonant = absB >= bCrit - 0.12 && absB <= bCrit + 0.18;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-2 sm:bottom-3 z-20 w-[min(980px,calc(100vw-1.5rem))] pointer-events-auto transition-transform duration-200 ease-out"
      style={{
        transform: isCollapsed
          ? 'translate(-50%, calc(100% - 30px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Top Collapse / Expand & Clean UI Handle Bar */}
      <div className="flex justify-center items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-mono text-neutral-300 bg-neutral-950 border border-b-0 border-neutral-800 rounded-t-md hover:text-amber-300 hover:bg-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          title="Toggle Control Dock (Shortcut: H)"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              <span>Minimize Dock (H)</span>
            </>
          )}
        </button>

        {onToggleCleanMode && (
          <button
            type="button"
            onClick={onToggleCleanMode}
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono text-amber-300 bg-neutral-950 border border-b-0 border-neutral-800 rounded-t-md hover:text-white hover:bg-neutral-900 hover:border-amber-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
            title="Hide all UI elements for a completely clean viewport (Shortcut: C)"
          >
            <EyeOff className="w-3 h-3 text-amber-400" />
            <span>Hide UI (C)</span>
          </button>
        )}
      </div>

      {/* Main Grid Chassis */}
      <div className="bg-[#060911]/95 border border-neutral-800/90 rounded-xl shadow-2xl p-2.5 sm:p-3 flex flex-col gap-2 max-h-[46vh] sm:max-h-[50vh] overflow-y-auto">
        {/* ROW 1: Unified Modular Command Bar (Tabs + Target Preset Picker + Actions) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center pb-2 border-b border-neutral-800/80">
          {/* Section A: Segmented Mode Tabs (Cols 1-5) */}
          <div className="md:col-span-5 flex items-center gap-1 p-0.5 bg-neutral-950 rounded-lg border border-neutral-800/90 w-full sm:w-auto">
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
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

          {/* Section B: Astrophysical Target Selector (Cols 6-8) */}
          <div className="md:col-span-4 flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={handlePrevPreset}
              className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Previous Target Preset"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="relative flex-1 flex items-center min-w-0">
              <div className="absolute left-2.5 pointer-events-none flex items-center text-amber-400">
                {isStar ? (
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <select
                value={activePresetId}
                onChange={(e) => onSelectPreset(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-xs bg-neutral-900 hover:bg-neutral-850 border border-neutral-700/80 hover:border-amber-400/80 text-neutral-200 font-semibold rounded-lg transition-colors cursor-pointer appearance-none outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 truncate"
                title="Select Astrophysical Target (TON 618, Sagittarius A*, M87*, Cygnus X-1, etc.)"
              >
                <optgroup label="Supermassive & Ultramassive Black Holes" className="bg-neutral-950 text-neutral-200">
                  <option value="ton618">TON 618 (66 Billion M☉ · Ultramassive)</option>
                  <option value="m87">M87* (6.5 Billion M☉ · EHT Target)</option>
                  <option value="sagittarius_a">Sagittarius A* (4.15 Million M☉ · Milky Way)</option>
                </optgroup>
                <optgroup label="Intermediate & Stellar Black Holes" className="bg-neutral-950 text-neutral-200">
                  <option value="gw190521">GW190521 (142 M☉ · LIGO Merger)</option>
                  <option value="cygnus_x1">Cygnus X-1 (21.2 M☉ · HMXB System)</option>
                  <option value="v404_cygni">V404 Cygni (9.0 M☉ · Jet Precession)</option>
                  <option value="primordial_micro">Micro PBH (10¹² kg · Hawking Decay)</option>
                </optgroup>
                <optgroup label="Compact Relativistic Stars" className="bg-neutral-950 text-neutral-200">
                  <option value="psr_b1919">PSR B1919+21 (Pulsar · Lighthouse Beams)</option>
                  <option value="sgr_1806">SGR 1806-20 (Magnetar · 10¹⁵ G Field)</option>
                </optgroup>
              </select>
              <div className="absolute right-2 pointer-events-none flex items-center text-neutral-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextPreset}
              className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Next Target Preset"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Real Scale Button */}
            <button
              type="button"
              onClick={onOpenCosmicScaleModal}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Compare Real Astronomical Scale (TON 618 vs Solar System)"
            >
              <Maximize2 className="w-3 h-3 text-neutral-400" />
              <span className="hidden sm:inline">Scale</span>
            </button>
          </div>

          {/* Section C: Transport Actions (Cols 9-12) */}
          <div className="md:col-span-3 flex items-center justify-end gap-1.5 w-full">
            <button
              type="button"
              onClick={() =>
                onChangeParams((prev) => ({
                  ...prev,
                  timeScale: prev.timeScale === 0 ? 1.0 : 0.0,
                }))
              }
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3 text-neutral-400" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={onTriggerPulse}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Trigger Event Horizon Pulse (Accretion Shockwave)"
            >
              <Waves className="w-3 h-3 text-amber-400" />
              <span>Pulse</span>
            </button>

            <button
              type="button"
              onClick={onToggleAudio}
              className={`p-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                audioEnabled
                  ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Toggle Relativistic Audio"
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onResetParams}
              className="p-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Reset Default Parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ROW 2: Modular Content Grid for Active Tab */}

        {/* TAB 1: SPACETIME PARAMETERS GRID */}
        {activeTab === 'spacetime' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Module 1: Mass */}
              <div className="flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
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
                  onChange={(e) =>
                    onChangeParams((prev) => ({ ...prev, massSolar: parseFloat(e.target.value) }))
                  }
                  className="sci-slider w-full"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>{isStar ? '1.4 TOV' : '5 M☉'}</span>
                  <span className="text-neutral-400">
                    {isStar ? 'R 20km' : `r₊ ${metrics.eventHorizonKm.toFixed(0)} km`}
                  </span>
                </div>
              </div>

              {/* Module 2: Kerr Spin Parameter */}
              <div className="flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
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
                  onChange={(e) =>
                    onChangeParams((prev) => ({ ...prev, spin: parseFloat(e.target.value) }))
                  }
                  className="sci-slider w-full"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>0.000</span>
                  <span className="text-neutral-400">0.998 Limit</span>
                </div>
              </div>

              {/* Module 3: Accretion Flux */}
              <div className="flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
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
                  onChange={(e) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      accretionRate: parseFloat(e.target.value),
                    }))
                  }
                  className="sci-slider w-full"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>{(metrics.peakDiskTempK / 1e6).toFixed(1)} MK</span>
                  <span>Plasma</span>
                </div>
              </div>

              {/* Module 4: Gravity Well Depth */}
              <div className="flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
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
                  onChange={(e) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      wellDepthMultiplier: parseFloat(e.target.value),
                    }))
                  }
                  className="sci-slider w-full"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>0.8× Shallow</span>
                  <span>3.5× Plunge</span>
                </div>
              </div>
            </div>

            {/* Bottom Sub-Strip: Gravitational Lensing Toggle + Doppler Beaming Slider + Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-1.5 border-t border-neutral-800/80 text-xs">
              <div className="sm:col-span-4 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onChangeParams((prev) => ({
                      ...prev,
                      gravitationalLensing: !prev.gravitationalLensing,
                    }))
                  }
                  className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md border text-xs font-medium transition-all cursor-pointer ${
                    params.gravitationalLensing
                      ? 'bg-neutral-800 text-amber-300 border-neutral-700 shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                  }`}
                  title="Toggle Interstellar Gargantua Double-Arch Deflection"
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400/90" />
                    <span>Lensing Shader:</span>
                  </span>
                  <span className="font-mono font-bold text-[10px] uppercase">
                    {params.gravitationalLensing ? 'Double Arch (On)' : 'Off'}
                  </span>
                </button>
              </div>

              {/* Doppler strength scrubber */}
              <div className="sm:col-span-4 flex items-center gap-2 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded-md">
                <span className="text-[11px] font-mono text-neutral-400 whitespace-nowrap">Doppler:</span>
                <input
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={params.dopplerStrength}
                  onChange={(e) =>
                    onChangeParams((prev) => ({
                      ...prev,
                      dopplerStrength: parseFloat(e.target.value),
                    }))
                  }
                  className="sci-slider flex-1"
                />
                <span className="font-mono text-[11px] text-amber-300/90 font-bold tabular-nums w-8 text-right">
                  {(params.dopplerStrength * 100).toFixed(0)}%
                </span>
              </div>

              {/* Spacetime horizon telemetry */}
              <div className="sm:col-span-4 flex items-center justify-between sm:justify-end gap-2 px-2 py-1 text-[11px] font-mono text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-md">
                <span>ISCO: <strong className="text-neutral-200 font-semibold">{metrics.iscoProgradeRg.toFixed(2)} Rg</strong></span>
                <span>·</span>
                <span>r_ph: <strong className="text-amber-300/90 font-semibold">{metrics.photonSphereRg.toFixed(2)} Rg</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LAYERS, SPECTRAL FILTERS & BACKGROUND GRID */}
        {activeTab === 'spectral' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Cell 1: Observatory Spectral Band (Cols 1-3) */}
            <div className="md:col-span-3 flex flex-col gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Spectral Filter
              </span>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
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

            {/* Cell 2: Exploded Vertical Lift (Cols 4-5) */}
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
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    explodedSeparation: parseFloat(e.target.value),
                  }))
                }
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
                  onClick={() =>
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, orbitalStars: !prev.layers.orbitalStars },
                    }))
                  }
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
                        anatomyLines: !(prev.layers.anatomyLines ?? true),
                      },
                    }))
                  }
                  className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                    params.layers.anatomyLines ?? true
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
                        microlensingStar: !(prev.layers.microlensingStar ?? true),
                      },
                    }))
                  }
                  className={`col-span-2 px-2 py-1 text-xs rounded border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    params.layers.microlensingStar ?? true
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
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                {Object.values(BACKGROUND_THEMES).slice(0, 4).map((theme) => {
                  const isActive = (params.backgroundTheme || 'galactic_core') === theme.id;
                  const isPitchBlack = theme.id === 'pure_black';
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
                          : isPitchBlack
                          ? 'bg-black text-neutral-300 border-neutral-750 hover:border-neutral-600'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                      title={theme.name}
                    >
                      {isPitchBlack ? 'Pure Black' : theme.name.split(' (')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CAMERA OBSERVATORY VIEWPORTS */}
        {activeTab === 'camera' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {(
              [
                { id: 'equatorial', label: 'Equatorial', desc: 'Accretion Plane' },
                { id: 'polar', label: 'Polar Axis', desc: 'Overhead Jet' },
                { id: 'grazing', label: 'Grazing', desc: 'Rim Horizon' },
                { id: 'well', label: 'Gravity Well', desc: 'Throat Funnel' },
                { id: 'star', label: 'Orbiting Star', desc: 'S2 Companion' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectCamera(preset.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                  activeCamera === preset.id
                    ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5 mb-0.5 text-neutral-400" />
                <span className="text-xs font-semibold">{preset.label}</span>
                <span className={`text-[10px] font-mono ${activeCamera === preset.id ? 'text-amber-300/80' : 'text-neutral-500'}`}>
                  {preset.desc}
                </span>
              </button>
            ))}

            {/* True Cosmic Scale Visualizer Tile */}
            <button
              type="button"
              onClick={() =>
                onChangeParams((prev) => ({
                  ...prev,
                  trueCosmicScale: !prev.trueCosmicScale,
                }))
              }
              className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                params.trueCosmicScale
                  ? 'bg-neutral-800 text-amber-300 font-medium border-neutral-700 shadow-sm'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5 mb-0.5 text-neutral-400" />
              <span className="text-xs font-semibold">True Scale</span>
              <span className={`text-[10px] font-mono ${params.trueCosmicScale ? 'text-amber-300/80' : 'text-neutral-500'}`}>
                {params.trueCosmicScale ? 'Gargantuan' : 'Normalized'}
              </span>
            </button>
          </div>
        )}

        {/* TAB 4: GEODESIC PHOTON LAUNCHER */}
        {activeTab === 'geodesics' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Cell 1: Impact Parameter Slider (Cols 1-6) */}
            <div className="md:col-span-6 flex flex-col justify-between gap-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
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
                onChange={(e) => setImpactB(parseFloat(e.target.value))}
                className="sci-slider w-full"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span>-6.0 Rₛ (Retrograde)</span>
                <span>+6.0 Rₛ (Prograde)</span>
              </div>
            </div>

            {/* Cell 2: Trajectory Outcome Prediction (Cols 7-9) */}
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

            {/* Cell 3: Action Buttons (Cols 10-12) */}
            <div className="md:col-span-3 flex flex-row md:flex-col justify-center gap-1.5 h-full">
              <button
                type="button"
                onClick={() => onLaunchPhoton(impactB)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 transition-colors cursor-pointer shadow-md"
                title="Fire a single test photon pulse to trace general-relativistic light bending"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Fire Single Ray</span>
              </button>

              <button
                type="button"
                onClick={onClearPhotons}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Clear all active photon trajectories"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Rays</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
