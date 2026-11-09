/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, Zap, Maximize2, Eye, Download } from 'lucide-react';
import {
  ARCHETYPE_DEFINITIONS,
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  GeodesicTrajectory,
  SystemCategory,
  computeRelativisticMetrics,
} from './physics/gravitationalPhysics';
import {
  BlackHoleSceneController,
  CameraPresetId,
  InspectedFeature,
  VisualizerSettings,
  DEFAULT_VISUALIZER_SETTINGS,
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
import { SettingsModal } from './components/SettingsModal';
import { useHaptics } from './hooks/useHaptics';

const DEFAULT_PARAMS: BlackHoleParams = {
  objectCategory: 'black_hole',
  systemCategory: 'isolated',
  backgroundTheme: 'galactic_core',
  presetId: 'ton618',
  trueMassSolar: 66000000000,
  massSolar: 100,
  spin: 0.98,
  accretionRate: 1.95,
  inclinationDeg: 78,
  dopplerStrength: 0.65,
  probeRadiusRs: 3.6,
  explodedSeparation: 0.0,
  timeScale: 1.0,
  wellDepthMultiplier: 2.2, // Deep, plunging general-relativistic gravity well
  gravitationalLensing: true, // Authentic spacetime gravitational lensing deflection
  trueCosmicScale: false,
  spectralMode: 'blackbody',
  accretionState: 'quiescent',
  layers: {
    accretionDisk: true,
    ergosphereCage: false, // Toggled off automatically by default
    spacetimeGrid: true,
    orbitalStars: false, // Disabled initially and when clicking a black hole
    geodesicRays: false, // Disabled by default per user request
    pulsarBeams: true,
    magneticField: true,
    anatomyLines: false, // Anatomy guide turned off by default
    microlensingStar: false, // Disabled initially and when clicking a black hole
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneControllerRef = useRef<BlackHoleSceneController | null>(null);
  const [controllerInstance, setControllerInstance] = useState<BlackHoleSceneController | null>(null);

  const [params, setParams] = useState<BlackHoleParams>(DEFAULT_PARAMS);
  const [settings, setSettings] = useState<VisualizerSettings>(DEFAULT_VISUALIZER_SETTINGS);
  const [activePresetId, setActivePresetId] = useState<string>('ton618');
  const [activeCamera, setActiveCamera] = useState<CameraPresetId>('equatorial');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState<boolean>(false);
  const [isArchetypeModalOpen, setIsArchetypeModalOpen] = useState<boolean>(false);
  const [isCosmicScaleModalOpen, setIsCosmicScaleModalOpen] = useState<boolean>(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isSingularityCollapsed, setIsSingularityCollapsed] = useState<boolean>(true);

  const haptics = useHaptics({ enabled: settings.hapticsEnabled !== false });

  const isAnatomyVisible = params.layers.anatomyLines ?? false;
  const handleToggleAnatomyVisible = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      layers: {
        ...prev.layers,
        anatomyLines: !(prev.layers.anatomyLines ?? false),
      },
    }));
  }, []);

  // Unified Clean Mode ("Hide UI") handler:
  // When activated, hides all UI overlays, switches background to pure black (#000000),
  // and removes the gravity well (spacetimeGrid) as well as S-Stars (orbitalStars & microlensingStar).
  const handleSetCleanMode = useCallback((nextClean: boolean) => {
    setIsCleanMode(nextClean);
    if (nextClean) {
      setParams((prev) => ({
        ...prev,
        backgroundTheme: 'pure_black',
        layers: {
          ...prev.layers,
          spacetimeGrid: false,
          orbitalStars: false,
          microlensingStar: false,
          geodesicRays: false,
          ergosphereCage: false,
        },
      }));
    } else {
      setParams((prev) => ({
        ...prev,
        backgroundTheme: 'galactic_core',
        layers: {
          ...prev.layers,
          spacetimeGrid: true,
          orbitalStars: false,
          microlensingStar: false,
          anatomyLines: false,
        },
      }));
    }
  }, []);

  const handleToggleCleanMode = useCallback(() => {
    setIsCleanMode((prev) => {
      const nextClean = !prev;
      if (nextClean) {
        setParams((p) => ({
          ...p,
          backgroundTheme: 'pure_black',
          layers: {
            ...p.layers,
            spacetimeGrid: false,
            orbitalStars: false,
            microlensingStar: false,
            geodesicRays: false,
            ergosphereCage: false,
            anatomyLines: false,
          },
        }));
      } else {
        setParams((p) => ({
          ...p,
          backgroundTheme: 'galactic_core',
          layers: {
            ...p.layers,
            spacetimeGrid: true,
            orbitalStars: false,
            microlensingStar: false,
            anatomyLines: false,
          },
        }));
      }
      return nextClean;
    });
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
      onSingularityStateChange: (collapsed) => {
        setIsSingularityCollapsed(collapsed);
        if (!collapsed) {
          relativisticAudio.triggerAccretionShockPulse(false);
        }
      },
    });
    sceneControllerRef.current = controller;
    setControllerInstance(controller);

    return () => {
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

  // Push visualizer settings updates to Three.js controller
  useEffect(() => {
    sceneControllerRef.current?.updateSettings(settings);
  }, [settings]);

  // Keyboard shortcut 'H' for dock collapse, 'C' for clean mode, 'Escape' to restore UI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        handleToggleCleanMode();
      } else if (e.key === 'Escape') {
        handleSetCleanMode(false);
      } else if (e.code === 'Space') {
        e.preventDefault();
        haptics.medium();
        setParams((p) => ({ ...p, timeScale: p.timeScale === 0 ? 1.0 : 0.0 }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleCleanMode, handleSetCleanMode, haptics]);

  const handleSelectPreset = useCallback((presetId: string) => {
    const found = ASTROPHYSICAL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setParams((prev) => ({
      ...prev,
      ...found.params,
      presetId: found.id,
      trueMassSolar: found.trueMassSolar,
      objectCategory: found.category,
      // Ensure ergosphere, anatomy guide, and stars remain off when clicking a black hole
      layers: {
        ...prev.layers,
        ...(found.params.layers || {}),
        ergosphereCage: false,
        orbitalStars: false,
        microlensingStar: false,
        geodesicRays: false,
        anatomyLines: false,
      },
    }));

    // Expand from singularity ball (or trigger pulse for compact stars)
    if (found.category === 'black_hole') {
      sceneControllerRef.current?.replaySingularityExpansion();
    } else {
      sceneControllerRef.current?.triggerEventHorizonPulse(found.category);
    }
    relativisticAudio.triggerAccretionShockPulse(found.category === 'star');
  }, []);

  const handleResetParams = useCallback(() => {
    const currentPreset =
      ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];

    setParams((prev) => ({
      ...DEFAULT_PARAMS,
      backgroundTheme: prev.backgroundTheme || 'galactic_core',
      ...currentPreset.params,
      presetId: currentPreset.id,
      trueMassSolar: currentPreset.trueMassSolar,
      objectCategory: currentPreset.category,
      layers: {
        ...DEFAULT_PARAMS.layers,
        ...(currentPreset.params.layers || {}),
        ergosphereCage: false,
        orbitalStars: false,
        microlensingStar: false,
        geodesicRays: false,
        anatomyLines: false,
      },
    }));

    const targetCam: CameraPresetId = currentPreset.category === 'star' ? 'polar' : 'equatorial';
    setActiveCamera(targetCam);
    sceneControllerRef.current?.setCameraPreset(targetCam);
    sceneControllerRef.current?.triggerEventHorizonPulse(currentPreset.category);
  }, [activePresetId]);

  const handleSelectCamera = useCallback((preset: CameraPresetId) => {
    setActiveCamera(preset);
    sceneControllerRef.current?.setCameraPreset(preset);
  }, []);

  const handleChangeSystemCategory = useCallback((nextCategory: SystemCategory) => {
    setParams((prev) => ({
      ...prev,
      objectCategory: 'black_hole',
      systemCategory: nextCategory,
    }));
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
    haptics.success();
    const dataUrl = sceneControllerRef.current.captureSnapshotDataUrl();
    const link = document.createElement('a');
    link.download = `cosmic-vis-${activePresetId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [activePresetId, haptics]);

  const isStar = params.objectCategory === 'star';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none flex flex-col">
      {/* Zone 1-3 Top Navigation Bar (Hidden in Clean Mode) */}
      {!isCleanMode && (
        <TopBar
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          systemCategory={params.systemCategory || 'isolated'}
          onChangeSystemCategory={handleChangeSystemCategory}
          onOpenTheoryModal={() => setIsTheoryModalOpen(true)}
          onOpenArchetypeModal={() => setIsArchetypeModalOpen(true)}
          onOpenCosmicScaleModal={() => setIsCosmicScaleModalOpen(true)}
          onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          activeBackgroundTheme={params.backgroundTheme || 'galactic_core'}
          isAnatomyVisible={isAnatomyVisible}
          onToggleAnatomyVisible={handleToggleAnatomyVisible}
          onExportSnapshot={handleExportSnapshot}
          isCleanMode={isCleanMode}
          onToggleCleanMode={handleToggleCleanMode}
          isPhoneMode={settings.phoneMode}
          hapticsEnabled={settings.hapticsEnabled !== false}
        />
      )}

      {/* Main 3D Viewport Stage */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Isolated WebGL Canvas Container */}
        <div
          ref={canvasMountRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none overscroll-none"
        />

        {/* High-Visibility Simulation Paused Status Pill */}
        {params.timeScale === 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#050811]/95 border border-amber-500/60 text-amber-300 font-mono text-[11px] font-semibold backdrop-blur-md shadow-[0_0_25px_rgba(245,158,11,0.3)]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="tracking-wide">SIMULATION PAUSED</span>
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, timeScale: 1.0 }))}
              className="ml-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-black hover:bg-amber-300 font-sans text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
              title="Resume Simulation (Space)"
            >
              Resume
            </button>
          </div>
        )}

        {/* Dynamic Relativistic Anatomy & Leader Lines Overlay */}
        {!isCleanMode && (
          <BlackHoleAnatomyOverlay
            sceneController={controllerInstance || sceneControllerRef.current}
            isVisible={isAnatomyVisible}
            onToggleVisible={handleToggleAnatomyVisible}
            onSelectPreset={handleSelectPreset}
            isDockCollapsed={isDockCollapsed}
          />
        )}

        {/* Left HUD Column: Target Specification Badge + Overhead Radar (with optional Time Dilation UI from Settings) */}
        {!isCleanMode && (settings.showLeftHud || settings.showOverheadMap || settings.showTimeDilation) && (
          <div className={`absolute top-2 sm:top-3 left-2 sm:left-4 z-10 flex flex-col items-start gap-2 pointer-events-none ${settings.phoneMode ? 'max-w-[250px]' : 'max-w-xs sm:max-w-sm'}`}>
            {/* Target Spec Badge */}
            {settings.showLeftHud && (
              <div className={`pointer-events-auto bg-[#050811]/95 border border-slate-800/80 rounded-xl ${settings.phoneMode ? 'p-2' : 'p-3'} shadow-xl transition-all w-full`}>
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
                  <h1 className={`font-display ${settings.phoneMode ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} font-bold text-slate-100 tracking-tight flex items-center gap-1.5`}>
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

                {settings.showCursorTelemetry && hoverCoords && (
                  <div className="mt-1.5 pt-1 border-t border-slate-800/50 text-[10px] font-mono text-cyan-300/90 tabular-nums">
                    Cursor: r = {hoverCoords.rRs.toFixed(2)} Rₛ · φ = {hoverCoords.phiDeg.toFixed(0)}° · z = +{hoverCoords.redshiftZ.toFixed(3)}
                  </div>
                )}
              </div>
            )}

            {/* 2D Overhead Radar Widget: Replaces Time Dilation UI in Left HUD Column */}
            {settings.showOverheadMap && (
              <div className="pointer-events-auto">
                <OverheadMapWidget
                  sceneController={controllerInstance || sceneControllerRef.current}
                  onSetProbeRadius={(newRadius) =>
                    setParams((prev) => ({ ...prev, probeRadiusRs: newRadius }))
                  }
                />
              </div>
            )}

            {/* Optional Local Time Dilation Display (Toggled in Settings, off initially) */}
            {settings.showTimeDilation && (
              <div className="pointer-events-auto">
                <TimeDilationDisplay
                  probeRadiusRs={params.probeRadiusRs}
                  spin={params.spin}
                  timeScale={params.timeScale}
                  initialCollapsed={false}
                  onSetProbeRadius={(newRadius) =>
                    setParams((prev) => ({ ...prev, probeRadiusRs: newRadius }))
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Interactive Click-to-Inspect Feature Popover (Bottom-Right when active) */}
        {!isCleanMode && inspectedFeature && (
          <div className="absolute bottom-24 right-6 z-20 w-80 bg-[#080c16]/95 border border-slate-800 rounded-lg p-3.5 shadow-xl pointer-events-auto">
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

        {/* Interactive Singularity Ball Prompt (Displayed when compressed as a small singularity ball) */}
        {!isCleanMode && !isStar && isSingularityCollapsed && (
          <div className={`absolute ${settings.phoneMode ? (isDockCollapsed ? 'bottom-12' : 'bottom-[51vh]') : 'bottom-20 sm:bottom-24'} left-1/2 -translate-x-1/2 z-20 pointer-events-auto px-2 w-full max-w-sm flex justify-center transition-all`}>
            <button
              type="button"
              onClick={() => {
                haptics.pulseBoom();
                if (params.timeScale === 0) {
                  setParams((p) => ({ ...p, timeScale: 1.0 }));
                }
                sceneControllerRef.current?.expandFromSingularity();
              }}
              className="group flex items-center justify-center gap-2.5 px-4 py-2 rounded-xl bg-[#050811]/90 hover:bg-[#0a1022] border border-amber-500/40 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)] transition-all cursor-pointer text-center"
            >
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 shrink-0" />
              <span className="font-mono text-xs font-semibold text-amber-200 group-hover:text-white tracking-wide">
                Singularity Seed — Tap black hole to expand
              </span>
            </button>
          </div>
        )}

        {/* Clean Mode Floating Restore UI & Export Snapshot Buttons (Unobtrusive Bottom-Right Corner) */}
        {isCleanMode && (
          <div className="absolute bottom-5 right-5 z-30 pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSnapshot}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#050811]/90 hover:bg-black text-neutral-200 hover:text-white border border-neutral-700/80 hover:border-amber-400 shadow-2xl font-mono text-xs transition-all cursor-pointer"
              title="Export high-resolution PNG snapshot"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold tracking-wide">Export</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetCleanMode(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#050811]/90 hover:bg-black text-neutral-200 hover:text-white border border-neutral-700/80 hover:border-amber-400 shadow-2xl font-mono text-xs transition-all cursor-pointer"
              title="Restore full user interface (Shortcut: C or ESC)"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold tracking-wide">Show UI</span>
              <span className="text-[10px] text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                C / Esc
              </span>
            </button>
          </div>
        )}

        {/* Unified Collapsible Bottom Control Dock */}
        {!isCleanMode && (
          <ControlDock
            params={params}
            metrics={metrics}
            activePresetId={activePresetId}
            isCollapsed={isDockCollapsed}
            onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
            onToggleCleanMode={handleToggleCleanMode}
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
            onChangeSystemCategory={handleChangeSystemCategory}
            isPhoneMode={settings.phoneMode}
            hapticsEnabled={settings.hapticsEnabled !== false}
            onTriggerPulse={() => {
              haptics.pulseBoom();
              if (params.objectCategory === 'black_hole') {
                sceneControllerRef.current?.replaySingularityExpansion();
              } else {
                sceneControllerRef.current?.triggerEventHorizonPulse(params.objectCategory);
              }
              relativisticAudio.triggerAccretionShockPulse(params.objectCategory === 'star');
            }}
          />
        )}
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

      {/* Visualizer Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        accretionState={params.accretionState || 'quiescent'}
        onChangeAccretionState={(nextState) =>
          setParams((prev) => ({ ...prev, accretionState: nextState }))
        }
        onResetPhysics={handleResetParams}
      />
    </div>
  );
}
