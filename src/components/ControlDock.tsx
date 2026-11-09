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
} from 'lucide-react';
import {
  ARCHETYPE_DEFINITIONS,
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  DerivedRelativisticMetrics,
  GeodesicTrajectory,
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
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('spacetime');
  const [impactB, setImpactB] = useState<number>(2.4);

  const activePreset =
    ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

  const isPaused = params.timeScale === 0;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-20 w-[min(940px,94vw)] pointer-events-auto transition-transform duration-200 ease-out"
      style={{
        transform: isCollapsed
          ? 'translate(-50%, calc(100% - 34px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Top Collapse / Expand Handle (Cinema / Zen Mode Drawer Toggle) */}
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

      {/* Main Dock Panel (Smart minimalistic glass surface) */}
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

          {/* Unboxed Telemetry Readout + Transport Action Buttons */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono tabular-nums">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${ARCHETYPE_DEFINITIONS[activePreset.archetype].badgeBg}`}>
                {activePreset.name} · {activePreset.plainMassExplanation}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">
                dτ/dt <strong className="text-emerald-400">{(1 / metrics.probeTimeDilationFactor).toFixed(3)}</strong>
              </span>
            </div>

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

        {/* Smart Archetype Quick Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 border-b border-slate-800/50 text-xs scrollbar-none">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Targets:</span>
          </span>
          {ASTROPHYSICAL_PRESETS.map((preset) => {
            const isCurrent = activePresetId === preset.id;
            const isTon618 = preset.id === 'ton618';
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : isTon618
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40 hover:bg-amber-900/40'
                    : 'bg-[#0a0f1d] text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
                title={`${preset.name}: ${preset.solarEquivalence}`}
              >
                {isTon618 && <Sparkles className="w-3 h-3 text-amber-400" />}
                <span>{preset.name}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  {preset.archetype === 'ultramassive' ? 'UMBH' : preset.archetype === 'primordial' ? 'PBH' : preset.archetype === 'supermassive' ? 'SMBH' : preset.archetype === 'intermediate' ? 'IMBH' : 'Stellar'}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Spacetime & Accretion Disk Parameters */}
        {activeTab === 'spacetime' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Mass Slider with Plain-English Solar Mass Explanations */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mass Scale</span>
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-bold">
                  {params.massSolar.toFixed(1)} <span className="text-amber-400 font-sans text-[11px]">Suns (M☉)</span>
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={0.5}
                value={params.massSolar}
                onChange={(e) =>
                  onChangeParams((prev) => ({ ...prev, massSolar: parseFloat(e.target.value) }))
                }
                className="sci-slider w-full"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span title="1 Solar Mass = Weight of our Sun (~333,000 Earths)">1 M☉ = 1 Sun (~333k Earths)</span>
                <span className="font-mono text-cyan-400">r₊ {metrics.eventHorizonKm.toFixed(0)} km</span>
              </div>
            </div>

            {/* Kerr Spin Parameter Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Kerr Spin (a*)</span>
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
                <span>0.0 Schwarzschild</span>
                <span>0.998 Thorne Limit</span>
              </div>
            </div>

            {/* Accretion Rate Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Accretion Flux (ṁ)</span>
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
                <span>MRI Turbulence</span>
              </div>
            </div>

            {/* Relativistic Doppler Beaming */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Doppler Boost (Planck Shift)</span>
                <span className="font-mono tabular-nums text-amber-400 font-semibold">
                  {(params.dopplerStrength * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.05}
                value={params.dopplerStrength}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    dopplerStrength: parseFloat(e.target.value),
                  }))
                }
                className="sci-slider w-full"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Natural Planckian</span>
                <span>Relativistic D³</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Spectral Band & Anatomical Layer Toggles */}
        {activeTab === 'spectral' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Spectral Band Selector (4 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Observatory Spectral Filter</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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

            {/* Exploded Layer Separation Slider (3 cols) */}
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
                Separates Ergosphere, Disk & Well
              </span>
            </div>

            {/* Composite Sub-Layer Visibility Toggles (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Anatomical Subsystem Layers</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'accretionDisk', label: 'Accretion Disk' },
                    { key: 'ergosphereCage', label: 'Ergosphere' },
                    { key: 'spacetimeGrid', label: 'Spacetime Well' },
                    { key: 'orbitalStars', label: 'S-Star Cluster' },
                    { key: 'geodesicRays', label: 'Photon Rays' },
                  ] as const
                ).map((item) => {
                  const active = params.layers[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        onChangeParams((prev) => ({
                          ...prev,
                          layers: {
                            ...prev.layers,
                            [item.key]: !prev.layers[item.key],
                          },
                        }))
                      }
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70'
                          : 'bg-[#111827] text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Camera Choreography & Orbiting S-Stars */}
        {activeTab === 'camera' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Camera Viewpoint Presets (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Relativistic Camera Perspectives</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'equatorial', label: 'Equatorial Plane' },
                    { id: 'grazing', label: 'Grazing Horizon' },
                    { id: 'polar', label: 'Top-Down Polar' },
                    { id: 'well', label: 'Spacetime Funnel' },
                    { id: 'star', label: 'Lock to Star S2' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onSelectCamera(cam.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeCamera === cam.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                        : 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{cam.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Star S2 Orbital Radius Scrubber (3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Star S2 Orbit (r / Rₛ)</span>
                <span className="font-mono tabular-nums text-cyan-400 font-semibold">
                  {params.probeRadiusRs.toFixed(2)} Rₛ
                </span>
              </div>
              <input
                type="range"
                min={1.25}
                max={6.5}
                step={0.05}
                value={params.probeRadiusRs}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    probeRadiusRs: parseFloat(e.target.value),
                  }))
                }
                className="sci-slider w-full"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>v/c = {(metrics.probeOrbitalBeta * 100).toFixed(1)}%</span>
                <span>z = +{metrics.probeRedshiftZ.toFixed(3)}</span>
              </div>
            </div>

            {/* Simulation Time Multiplier (3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Coordinate Time Rate</span>
                <span className="font-mono tabular-nums text-slate-100 font-semibold">
                  {params.timeScale.toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2.5}
                step={0.05}
                value={params.timeScale}
                onChange={(e) =>
                  onChangeParams((prev) => ({
                    ...prev,
                    timeScale: parseFloat(e.target.value),
                  }))
                }
                className="sci-slider w-full"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Paused</span>
                <span>Relativistic Warp</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Interactive Null Geodesic Photon Launcher */}
        {activeTab === 'geodesics' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Impact Parameter (b / R_g)</span>
                <span className="font-mono tabular-nums text-amber-400 font-semibold">
                  {impactB >= 0 ? `+${impactB.toFixed(2)}` : impactB.toFixed(2)} R_g
                </span>
              </div>
              <input
                type="range"
                min={-6.5}
                max={6.5}
                step={0.05}
                value={impactB}
                onChange={(e) => setImpactB(parseFloat(e.target.value))}
                className="sci-slider w-full"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>|b| &lt; 2.1 Captured</span>
                <span>b_crit ≈ 2.38 R_g</span>
              </div>
            </div>

            <div className="lg:col-span-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLaunchPhoton(impactB)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Fire Test Photon</span>
              </button>

              <button
                type="button"
                onClick={() => onLaunchPhoton(2.38)}
                className="px-3 py-2 text-xs font-medium text-amber-300 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-700/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Critical Orbit (b_c)
              </button>

              <button
                type="button"
                onClick={onClearPhotons}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-300 bg-[#111827] hover:bg-slate-800 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Clear All Geodesic Rays"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-1 text-xs font-mono">
              <div className="text-slate-400">
                Tip: Double-click anywhere in the 3D space to fire a photon ray at that coordinate.
              </div>
              {lastTrajectory && (
                <div className="text-slate-200 flex items-center gap-2">
                  <span>Last Ray (b={lastTrajectory.impactParameterB.toFixed(2)}):</span>
                  <span
                    className={
                      lastTrajectory.outcome === 'captured'
                        ? 'text-rose-400 font-semibold'
                        : lastTrajectory.outcome === 'critical-orbit'
                        ? 'text-amber-400 font-semibold'
                        : 'text-cyan-400 font-semibold'
                    }
                  >
                    {lastTrajectory.outcome === 'captured'
                      ? '✖ Captured by Horizon'
                      : lastTrajectory.outcome === 'critical-orbit'
                      ? '▲ Photon Sphere Grazing'
                      : '● Gravitationally Deflected'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
