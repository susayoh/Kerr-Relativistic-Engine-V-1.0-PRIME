import React, { useState } from 'react';
import {
  Camera,
  ChevronDown,
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
} from 'lucide-react';
import {
  ARCHETYPE_DEFINITIONS,
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  DerivedRelativisticMetrics,
  GeodesicTrajectory,
  ObjectCategory,
  BackgroundThemeId,
  BACKGROUND_THEMES,
} from '../physics/gravitationalPhysics';
import { CameraPresetId } from '../scene/BlackHoleScene';

interface ControlDockProps {
  params: BlackHoleParams;
  metrics: DerivedRelativisticMetrics;
  activePresetId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  onChangeParams,
  onSelectPreset,
  onResetParams,
  onSelectCamera,
  activeCamera,
  onLaunchPhoton,
  onClearPhotons,
  lastTrajectory,
  audioEnabled,
  onToggleAudio,
  onOpenCosmicScaleModal,
  onTriggerPulse,
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('spacetime');
  const [impactB, setImpactB] = useState<number>(2.4);
  const [selectedCategory, setSelectedCategory] = useState<ObjectCategory>(params.objectCategory || 'black_hole');

  const activePreset =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  const isPaused = params.timeScale === 0;
  const isStar = params.objectCategory === 'star';
  const isTon618 = activePresetId === 'ton618';

  const categoryFilteredPresets = ASTROPHYSICAL_PRESETS.filter(
    (p) => p.category === selectedCategory
  );

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-20 w-[min(940px,94vw)] pointer-events-auto transition-transform duration-200 ease-out"
      style={{
        transform: isCollapsed
          ? 'translate(-50%, calc(100% - 34px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Top Collapse / Expand Handle */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-slate-300 bg-[#080c16] border border-b-0 border-slate-800 rounded-t-lg hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Toggle Cinema / Zen Mode (Shortcut: H)"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Panel */}
      <div className="bg-[#060912]/92 backdrop-blur-md border border-slate-800/80 rounded-xl shadow-2xl p-3 sm:p-3.5">
        {/* Top Row: Mode Tabs + Quick Transport & Telemetry Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-slate-800/70">
          {/* Interactive Functional Segmented Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-[#0a0f1d] rounded-lg border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('spacetime')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'spacetime'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Spacetime</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('spectral')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'spectral'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('geodesics')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'geodesics'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>Geodesics</span>
            </button>
          </div>

          {/* Quick Cosmic Scale Trigger + Transport Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Real Size Explorer Button */}
            <button
              type="button"
              onClick={onOpenCosmicScaleModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                isTon618
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30'
                  : 'bg-[#0f172a] text-cyan-300 border-cyan-800/80 hover:bg-cyan-950/60'
              }`}
              title="Explore Real Astronomical Scale (Neutron Star vs TON 618 vs Solar System)"
            >
              <Maximize2 className="w-3 h-3 text-amber-400" />
              <span>Real Cosmic Scale</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onChangeParams((prev) => ({
                    ...prev,
                    timeScale: prev.timeScale === 0 ? 1.0 : 0.0,
                  }))
                }
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-200 bg-[#0f172a] hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
              >
                {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                type="button"
                onClick={onTriggerPulse}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Trigger Event Horizon Pulse (Accretion Shockwave Ripple)"
              >
                <Waves className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Pulse</span>
              </button>

              <button
                type="button"
                onClick={onToggleAudio}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  audioEnabled
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80'
                    : 'bg-[#0f172a] text-slate-300 border-slate-700/80 hover:bg-slate-800'
                }`}
                title="Toggle Procedural Relativistic Audio"
              >
                {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              </button>

              <button
                type="button"
                onClick={onResetParams}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-300 bg-[#0f172a] hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Reset Parameters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Switcher & Targets Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-800/50 text-xs">
          {/* Object Category Tabs */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">
              Category:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('black_hole');
                if (activePreset.category !== 'black_hole') {
                  onSelectPreset('ton618');
                }
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === 'black_hole'
                  ? 'bg-purple-950/80 text-purple-200 border border-purple-500/60 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Black Holes (7)
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('star');
                if (activePreset.category !== 'star') {
                  onSelectPreset('psr_b1919');
                }
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'star'
                  ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/60 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Compact Stars (2)</span>
            </button>
          </div>

          {/* Filtered Preset Target Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {categoryFilteredPresets.map((preset) => {
              const isCurrent = activePresetId === preset.id;
              const isCurrentTon = preset.id === 'ton618';
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : isCurrentTon
                      ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40 hover:bg-amber-900/40'
                      : preset.category === 'star'
                      ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/40'
                      : 'bg-[#0a0f1d] text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                  title={`${preset.name}: ${preset.solarEquivalence}`}
                >
                  {isCurrentTon && <Sparkles className="w-3 h-3 text-amber-400" />}
                  <span>{preset.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">
                    {preset.archetype === 'ultramassive'
                      ? 'UMBH'
                      : preset.archetype === 'neutron_star'
                      ? 'Pulsar'
                      : preset.archetype === 'magnetar'
                      ? 'Magnetar'
                      : preset.archetype === 'primordial'
                      ? 'PBH'
                      : preset.archetype === 'supermassive'
                      ? 'SMBH'
                      : preset.archetype === 'intermediate'
                      ? 'IMBH'
                      : 'Stellar'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TON 618 Scale Explainer Banner (When TON 618 is active) */}
        {isTon618 && (
          <div className="mb-2.5 px-3 py-1.5 bg-gradient-to-r from-amber-950/50 via-[#0e1422] to-[#0a0f1d] border border-amber-500/40 rounded-lg flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>TON 618 Mass:</strong> 66 Billion Suns (66,000,000,000 M☉) · 390 Billion km horizon (2,600 AU).
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenCosmicScaleModal}
              className="text-amber-300 underline hover:text-amber-200 text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              Why 100 Suns slider? Click for True Scale Explorer →
            </button>
          </div>
        )}

        {/* TAB 1: Spacetime, Deep Gravity Well & Accretion Parameters */}
        {activeTab === 'spacetime' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Mass Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isStar ? 'Stellar Mass' : 'Black Hole Mass'}</span>
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-bold">
                  {params.massSolar.toFixed(1)} <span className="text-amber-400 font-sans text-[11px]">Suns (M☉)</span>
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
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{isStar ? '1.4 TOV Limit' : '1 M☉ = 1 Sun'}</span>
                <span className="font-mono text-cyan-400">
                  {isStar ? 'Crust 20 km' : `r₊ ${metrics.eventHorizonKm.toFixed(0)} km`}
                </span>
              </div>
            </div>

            {/* Gravity Well Depth Multiplier (Plunging Deep Funnel) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gravity Well Depth</span>
                </span>
                <span className="font-mono tabular-nums text-cyan-300 font-semibold">
                  {(params.wellDepthMultiplier || 2.2).toFixed(1)}× <span className="text-slate-500">Plunge</span>
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
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Shallow</span>
                <span>{isStar ? 'Crust Basin' : 'Abyssal Throat'}</span>
              </div>
            </div>

            {/* Kerr Spin Parameter Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{isStar ? 'Rotation Rate' : 'Kerr Spin (a*)'}</span>
                <span className="font-mono tabular-nums text-amber-400 font-semibold">
                  {params.spin.toFixed(3)} <span className="text-slate-500">cJ/GM²</span>
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
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>0.0 Static</span>
                <span>{isStar ? 'Millisecond Period' : '0.998 Thorne Limit'}</span>
              </div>
            </div>

            {/* Accretion / Radiation Rate Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{isStar ? 'Stellar Wind Flux' : 'Accretion Flux (ṁ)'}</span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">
                  {params.accretionRate.toFixed(2)} <span className="text-slate-500">Ṁ_Edd</span>
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
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>T_max {(metrics.peakDiskTempK / 1e6).toFixed(1)} MK</span>
                <span>Plasma Flow</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Spectral Band & Anatomical Layer Toggles */}
        {activeTab === 'spectral' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Spectral Band Selector */}
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Observatory Filter</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'blackbody', label: 'Optical BB' },
                    { id: 'eht230ghz', label: 'EHT 230 GHz' },
                    { id: 'xray', label: 'Chandra X-Ray' },
                    { id: 'doppler', label: 'Doppler Shift' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({ ...prev, spectralMode: mode.id }))
                    }
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      params.spectralMode === mode.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/70'
                        : 'bg-[#111827] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exploded Layer Separation Slider */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Exploded Anatomy</span>
                <span className="font-mono tabular-nums text-amber-400 font-semibold">
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
              <span className="text-[11px] text-slate-500 font-mono">
                Vertical Manifold Lift
              </span>
            </div>

            {/* Composite Sub-Layer Visibility Toggles */}
            <div className="lg:col-span-5 flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Anatomical Subsystem Layers</span>
              <div className="flex flex-wrap gap-1.5">
                {/* Accretion Disk */}
                <button
                  type="button"
                  onClick={() =>
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, accretionDisk: !prev.layers.accretionDisk },
                    }))
                  }
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    params.layers.accretionDisk
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70'
                      : 'bg-[#111827] text-slate-500 border-slate-800'
                  }`}
                >
                  Accretion Disk
                </button>

                {/* Spacetime Grid */}
                <button
                  type="button"
                  onClick={() =>
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, spacetimeGrid: !prev.layers.spacetimeGrid },
                    }))
                  }
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    params.layers.spacetimeGrid
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70'
                      : 'bg-[#111827] text-slate-500 border-slate-800'
                  }`}
                >
                  Spacetime Well
                </button>

                {/* S-Stars */}
                <button
                  type="button"
                  onClick={() =>
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, orbitalStars: !prev.layers.orbitalStars },
                    }))
                  }
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    params.layers.orbitalStars
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70'
                      : 'bg-[#111827] text-slate-500 border-slate-800'
                  }`}
                >
                  Orbiting Stars
                </button>

                {/* Photon Geodesic Rays */}
                <button
                  type="button"
                  onClick={() =>
                    onChangeParams((prev) => ({
                      ...prev,
                      layers: { ...prev.layers, geodesicRays: !prev.layers.geodesicRays },
                    }))
                  }
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    params.layers.geodesicRays
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70'
                      : 'bg-[#111827] text-slate-500 border-slate-800'
                  }`}
                >
                  Photon Rays
                </button>

                {/* Ergosphere (Toggled off automatically by default) */}
                {!isStar && (
                  <button
                    type="button"
                    onClick={() =>
                      onChangeParams((prev) => ({
                        ...prev,
                        layers: { ...prev.layers, ergosphereCage: !prev.layers.ergosphereCage },
                      }))
                    }
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      params.layers.ergosphereCage
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70'
                        : 'bg-[#111827] text-slate-500 border-slate-800'
                    }`}
                    title="Frame-Dragging Static Limit boundary (Off by default)"
                  >
                    Ergosphere {params.layers.ergosphereCage ? '(On)' : '(Off)'}
                  </button>
                )}

                {/* Star-specific layers: Pulsar Beams & Magnetic Field */}
                {isStar && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeParams((prev) => ({
                          ...prev,
                          layers: {
                            ...prev.layers,
                            pulsarBeams: !(prev.layers.pulsarBeams ?? true),
                          },
                        }))
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        params.layers.pulsarBeams ?? true
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70'
                          : 'bg-[#111827] text-slate-500 border-slate-800'
                      }`}
                    >
                      Pulsar Beams
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeParams((prev) => ({
                          ...prev,
                          layers: {
                            ...prev.layers,
                            magneticField: !(prev.layers.magneticField ?? true),
                          },
                        }))
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        params.layers.magneticField ?? true
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70'
                          : 'bg-[#111827] text-slate-500 border-slate-800'
                      }`}
                    >
                      Dipole Magnetic Field
                    </button>
                  </>
                )}

                {/* Anatomy Guide Lines Toggle matching PMF IAS Poster */}
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
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    params.layers.anatomyLines ?? true
                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/70 font-semibold'
                      : 'bg-[#111827] text-slate-500 border-slate-800'
                  }`}
                  title="Toggle dynamic leader lines and descriptions from the infographic"
                >
                  Anatomy Guide Lines
                </button>
              </div>
            </div>

            {/* Cosmic Background Environment Selection */}
            <div className="lg:col-span-12 flex flex-col gap-1.5 pt-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-400">
                Cosmic Background Environment (Anti-Glare / Eye Strain Relief)
              </span>
              <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                          : 'bg-[#111827] text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                      title={theme.tagline}
                    >
                      {theme.name.split(' (')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Camera Presets */}
        {activeTab === 'camera' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 mr-1">Observatory Viewports:</span>
              {(
                [
                  { id: 'equatorial', label: 'Equatorial View' },
                  { id: 'polar', label: 'Polar Axis' },
                  { id: 'grazing', label: 'Grazing Disk' },
                  { id: 'well', label: 'Deep Gravity Well' },
                  { id: 'star', label: 'Follow Orbiting Star' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectCamera(preset.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    activeCamera === preset.id
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                      : 'bg-[#111827] text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* True Cosmic Scale Visualizer Toggle */}
            <button
              type="button"
              onClick={() =>
                onChangeParams((prev) => ({
                  ...prev,
                  trueCosmicScale: !prev.trueCosmicScale,
                }))
              }
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
                params.trueCosmicScale
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-[#0f172a] text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Gargantuan Proportions: {params.trueCosmicScale ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        )}

        {/* TAB 4: Geodesic Photon Launcher */}
        {activeTab === 'geodesics' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full flex items-center gap-3">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Impact Parameter (b):
              </span>
              <input
                type="range"
                min={-6.0}
                max={6.0}
                step={0.1}
                value={impactB}
                onChange={(e) => setImpactB(parseFloat(e.target.value))}
                className="sci-slider flex-1"
              />
              <span className="font-mono text-xs text-amber-300 font-bold tabular-nums w-12 text-right">
                {impactB.toFixed(1)} Rs
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onLaunchPhoton(impactB)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Fire Photon Ray</span>
              </button>

              <button
                type="button"
                onClick={onClearPhotons}
                className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-md transition-colors cursor-pointer"
                title="Clear all active photon trajectories"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
