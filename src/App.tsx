/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, Zap, Maximize2 } from 'lucide-react';
import {
  ARCHETYPE_DEFINITIONS,
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  GeodesicTrajectory,
  computeRelativisticMetrics,
  BackgroundThemeId,
} from './physics/gravitationalPhysics';
import {
  BlackHoleSceneController,
  CameraPresetId,
  InspectedFeature,
} from './scene/BlackHoleScene';
import { relativisticAudio } from './audio/relativisticAudio';
import { TopBar } from './components/TopBar';
import { ControlDock } from './components/ControlDock';
import { PhysicsModal } from './components/PhysicsModal';
import { ArchetypeModal } from './components/ArchetypeModal';
import { CosmicScaleModal } from './components/CosmicScaleModal';
import { BackgroundSelectorModal } from './components/BackgroundSelectorModal';
import { BlackHoleAnatomyOverlay } from './components/BlackHoleAnatomyOverlay';
import { OverheadMapWidget } from './components/OverheadMapWidget';
import { TimeDilationDisplay } from './components/TimeDilationDisplay';

const DEFAULT_PARAMS: BlackHoleParams = {
  objectCategory: 'black_hole',
  backgroundTheme: 'galactic_core',
  massSolar: 100,
  spin: 0.98,
  accretionRate: 1.95,
  inclinationDeg: 58,
  dopplerStrength: 0.65,
  probeRadiusRs: 3.6,
  explodedSeparation: 0.0,
  timeScale: 1.0,
  wellDepthMultiplier: 2.2, // Deep, plunging general-relativistic gravity well
  gravitationalLensing: true, // Authentic spacetime gravitational lensing deflection
  trueCosmicScale: false,
  spectralMode: 'blackbody',
  layers: {
    accretionDisk: true,
    ergosphereCage: false, // Toggled off automatically by default
    spacetimeGrid: true,
    orbitalStars: true,
    geodesicRays: false, // Disabled by default per user request
    pulsarBeams: true,
    magneticField: true,
    anatomyLines: true,
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneControllerRef = useRef<BlackHoleSceneController | null>(null);
  const [controllerInstance, setControllerInstance] = useState<BlackHoleSceneController | null>(null);

  const [params, setParams] = useState<BlackHoleParams>(DEFAULT_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string>('ton618');
  const [activeCamera, setActiveCamera] = useState<CameraPresetId>('equatorial');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState<boolean>(false);
  const [isArchetypeModalOpen, setIsArchetypeModalOpen] = useState<boolean>(false);
  const [isCosmicScaleModalOpen, setIsCosmicScaleModalOpen] = useState<boolean>(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  const isAnatomyVisible = params.layers.anatomyLines ?? true;
  const handleToggleAnatomyVisible = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      layers: {
        ...prev.layers,
        anatomyLines: !(prev.layers.anatomyLines ?? true),
      },
    }));
  }, []);

  const [inspectedFeature, setInspectedFeature] = useState<InspectedFeature | null>(null);
  const [lastTrajectory, setLastTrajectory] = useState<GeodesicTrajectory | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{
    rRs: number;
    phiDeg: number;
    redshiftZ: number;
  } | null>(null);

  const metrics = useMemo(() => computeRelativisticMetrics(params), [params]);

  const activePreset = useMemo(
    () => ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0],
    [activePresetId]
  );

  // Initialize Three.js WebGL scene once inside isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = new BlackHoleSceneController(mountEl, DEFAULT_PARAMS, {
      onFeatureSelect: (feat) => setInspectedFeature(feat),
      onTrajectoryCreated: (traj) => {
        setLastTrajectory(traj);
        relativisticAudio.triggerGeodesicPing(traj.outcome);
      },
      onHoverCoordsChange: (coords) => setHoverCoords(coords),
    });
    sceneControllerRef.current = controller;
    setControllerInstance(controller);

    const initPulseTimer = setTimeout(() => {
      controller.triggerEventHorizonPulse('black_hole');
    }, 350);

    return () => {
      clearTimeout(initPulseTimer);
      controller.dispose();
      sceneControllerRef.current = null;
      setControllerInstance(null);
      relativisticAudio.dispose();
    };
  }, []);

  // Push parameter updates to Three.js controller and Web Audio synthesizer
  useEffect(() => {
    sceneControllerRef.current?.updateParams(params);
    relativisticAudio.updateParameters(params);
  }, [params]);

  // Keyboard shortcut 'H' for Cinema / Zen Mode control dock collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPreset = useCallback((presetId: string) => {
    const found = ASTROPHYSICAL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setParams((prev) => ({
      ...prev,
      ...found.params,
      objectCategory: found.category,
      // Ensure ergosphere remains off by default
      layers: {
        ...prev.layers,
        ...(found.params.layers || {}),
        ergosphereCage: false,
      },
    }));

    // Trigger visual 'event horizon pulse' animation rippling outward from the center
    sceneControllerRef.current?.triggerEventHorizonPulse(found.category);
    relativisticAudio.triggerAccretionShockPulse(found.category === 'star');
  }, []);

  const handleResetParams = useCallback(() => {
    setActivePresetId('ton618');
    setParams(DEFAULT_PARAMS);
    setActiveCamera('equatorial');
    sceneControllerRef.current?.setCameraPreset('equatorial');
  }, []);

  const handleSelectCamera = useCallback((preset: CameraPresetId) => {
    setActiveCamera(preset);
    sceneControllerRef.current?.setCameraPreset(preset);
  }, []);

  const handleLaunchPhoton = useCallback((impactB: number) => {
    sceneControllerRef.current?.launchPhotonGeodesic(impactB, 0);
  }, []);

  const handleClearPhotons = useCallback(() => {
    sceneControllerRef.current?.clearGeodesics();
    setLastTrajectory(null);
  }, []);

  const handleToggleAudio = useCallback(() => {
    const enabled = relativisticAudio.toggleAudio(params);
    setAudioEnabled(enabled);
  }, [params]);

  const handleExportSnapshot = useCallback(() => {
    if (!sceneControllerRef.current) return;
    const dataUrl = sceneControllerRef.current.captureSnapshotDataUrl();
    const link = document.createElement('a');
    link.download = `cosmic-vis-${activePresetId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [activePresetId]);

  const isStar = params.objectCategory === 'star';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070d] select-none flex flex-col">
      {/* Zone 1-3 Top Navigation Bar */}
      <TopBar
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onOpenTheoryModal={() => setIsTheoryModalOpen(true)}
        onOpenArchetypeModal={() => setIsArchetypeModalOpen(true)}
        onOpenCosmicScaleModal={() => setIsCosmicScaleModalOpen(true)}
        onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
        activeBackgroundTheme={params.backgroundTheme || 'galactic_core'}
        isAnatomyVisible={isAnatomyVisible}
        onToggleAnatomyVisible={handleToggleAnatomyVisible}
        onExportSnapshot={handleExportSnapshot}
      />

      {/* Main 3D Viewport Stage */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Isolated WebGL Canvas Container */}
        <div
          ref={canvasMountRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />

        {/* Dynamic Relativistic Anatomy & Leader Lines Overlay matching PMF IAS Poster */}
        <BlackHoleAnatomyOverlay
          sceneController={controllerInstance || sceneControllerRef.current}
          isVisible={isAnatomyVisible}
          onToggleVisible={handleToggleAnatomyVisible}
          onSelectPreset={handleSelectPreset}
        />

        {/* Left HUD Column: Astrophysical Target Specification + Real-Time Time Dilation Monitor */}
        <div className="absolute top-3 left-4 z-10 flex flex-col items-start gap-2.5 pointer-events-none max-w-xs sm:max-w-sm">
          {/* Target Spec Badge */}
          <div className="pointer-events-auto bg-[#050811]/90 border border-slate-800/80 rounded-xl p-3 shadow-xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  ARCHETYPE_DEFINITIONS[activePreset.archetype].badgeBg
                }`}
              >
                {activePreset.classification}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate">
                {activePreset.designation}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 mt-1">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>{activePreset.name}</span>
                {activePreset.id === 'ton618' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-normal flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    Titan
                  </span>
                )}
                {isStar && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-normal flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                    Pulsar
                  </span>
                )}
              </h1>
              <span className="font-mono text-amber-300 font-bold text-xs sm:text-sm">
                {activePreset.plainMassExplanation}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-snug mt-1">
              {activePreset.solarEquivalence}
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 mt-1.5 border-t border-slate-800/60">
              <span>{isStar ? 'Physical Crust' : 'Horizon'} <strong className="text-slate-200">{activePreset.horizonDiameterKmDisplay}</strong></span>
              <span>Spin a* <strong className="text-cyan-300">{params.spin.toFixed(3)}</strong></span>
            </div>

            {/* Quick Link to Real Scale Explorer if TON 618 is selected */}
            {activePreset.id === 'ton618' && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-mono">True Scale: 66 Billion M☉ (2,600 AU)</span>
                <button
                  type="button"
                  onClick={() => setIsCosmicScaleModalOpen(true)}
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-0.5 cursor-pointer"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                  Compare Real Size
                </button>
              </div>
            )}

            {hoverCoords && (
              <div className="mt-1.5 pt-1 border-t border-slate-800/50 text-[10px] font-mono text-cyan-300/90 tabular-nums">
                Cursor: r = {hoverCoords.rRs.toFixed(2)} Rₛ · φ = {hoverCoords.phiDeg.toFixed(0)}° · z = +{hoverCoords.redshiftZ.toFixed(3)}
              </div>
            )}
          </div>

          {/* Real-Time Local Time Dilation Display (dt/dτ) */}
          <div className="pointer-events-auto">
            <TimeDilationDisplay
              probeRadiusRs={params.probeRadiusRs}
              spin={params.spin}
              timeScale={params.timeScale}
              onSetProbeRadius={(newRadius) =>
                setParams((prev) => ({ ...prev, probeRadiusRs: newRadius }))
              }
            />
          </div>
        </div>

        {/* Right HUD Column: Interactive Feature Card + 2D Overhead Map Widget */}
        <div className="absolute top-4 right-6 z-20 flex flex-col items-end gap-3 pointer-events-auto">
          {/* Interactive Click-to-Inspect Feature Popover */}
          {inspectedFeature && (
            <div className="w-80 bg-[#080c16]/95 border border-slate-800 rounded-lg p-3.5 shadow-xl pointer-events-auto">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-mono text-amber-400">
                    {inspectedFeature.subtitle}
                  </div>
                  <h3 className="font-display text-sm font-bold text-slate-100 mt-0.5">
                    {inspectedFeature.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedFeature(null)}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded cursor-pointer"
                  aria-label="Close inspection card"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 px-2 py-1 bg-[#0d1322] border border-slate-800/90 rounded font-mono text-xs text-cyan-300">
                {inspectedFeature.formula}
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {inspectedFeature.description}
              </p>
            </div>
          )}

          {/* 2D Overhead Map Widget: Top-Down View & Real-Time Probe Tracking */}
          <OverheadMapWidget
            sceneController={controllerInstance || sceneControllerRef.current}
            onSetProbeRadius={(newRadius) =>
              setParams((prev) => ({ ...prev, probeRadiusRs: newRadius }))
            }
          />
        </div>

        {/* Unified Collapsible Bottom Control Dock */}
        <ControlDock
          params={params}
          metrics={metrics}
          activePresetId={activePresetId}
          isCollapsed={isDockCollapsed}
          onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
          onChangeParams={setParams}
          onSelectPreset={handleSelectPreset}
          onResetParams={handleResetParams}
          onSelectCamera={handleSelectCamera}
          activeCamera={activeCamera}
          onLaunchPhoton={handleLaunchPhoton}
          onClearPhotons={handleClearPhotons}
          lastTrajectory={lastTrajectory}
          audioEnabled={audioEnabled}
          onToggleAudio={handleToggleAudio}
          onOpenCosmicScaleModal={() => setIsCosmicScaleModalOpen(true)}
          onTriggerPulse={() => {
            sceneControllerRef.current?.triggerEventHorizonPulse(params.objectCategory);
            relativisticAudio.triggerAccretionShockPulse(params.objectCategory === 'star');
          }}
        />
      </main>

      {/* Relativistic Metrics & Effective Potential Modal */}
      <PhysicsModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
        params={params}
        metrics={metrics}
      />

      {/* Cosmic Archetypes & Solar Mass Guide Modal */}
      <ArchetypeModal
        isOpen={isArchetypeModalOpen}
        onClose={() => setIsArchetypeModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
      />

      {/* True Cosmic Scale & Order-of-Magnitude Visualizer Modal */}
      <CosmicScaleModal
        isOpen={isCosmicScaleModalOpen}
        onClose={() => setIsCosmicScaleModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
      />

      {/* Cosmic Background Environment Selector Modal */}
      <BackgroundSelectorModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        activeThemeId={params.backgroundTheme || 'galactic_core'}
        onSelectTheme={(themeId) =>
          setParams((prev) => ({ ...prev, backgroundTheme: themeId }))
        }
      />
    </div>
  );
}
