/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, Zap, Maximize2, Eye, Download, Video, Square } from 'lucide-react';
import {
  ARCHETYPE_DEFINITIONS,
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  GeodesicTrajectory,
  SystemCategory,
  PhysicsPresetId,
  computeRelativisticMetrics,
  isStellarCategory,
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
import { PhysicsQuickGuideModal } from './components/PhysicsQuickGuideModal';
import { ArchetypeModal } from './components/ArchetypeModal';
import { CosmicScaleModal } from './components/CosmicScaleModal';
import { BackgroundSelectorModal } from './components/BackgroundSelectorModal';
import { BlackHoleAnatomyOverlay } from './components/BlackHoleAnatomyOverlay';
import { OverheadMapWidget } from './components/OverheadMapWidget';
import { TimeDilationDisplay } from './components/TimeDilationDisplay';
import { SettingsModal } from './components/SettingsModal';
import {
  EventLogOverlay,
  AstrophysicalLogEvent,
  AstrophysicalEventCategory,
} from './components/EventLogOverlay';
import { MetricTelemetryOverlay } from './components/MetricTelemetryOverlay';
import {
  KerrRelativityEngineModal,
  KerrEngineLogViewerModal,
  KerrEngineRunLog,
  KerrEngineTierId,
  generateKerrEngineCalculationRun,
} from './components/KerrRelativityEngineModal';
import { useHaptics, setGlobalHapticIntensity } from './hooks/useHaptics';
import { TRANSLATIONS } from './i18n/translations';
import { toPng, toCanvas } from 'html-to-image';

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
  const appContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [isQuickGuideModalOpen, setIsQuickGuideModalOpen] = useState<boolean>(false);
  const [isArchetypeModalOpen, setIsArchetypeModalOpen] = useState<boolean>(false);
  const [isCosmicScaleModalOpen, setIsCosmicScaleModalOpen] = useState<boolean>(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isKerrLogModalOpen, setIsKerrLogModalOpen] = useState<boolean>(false);
  const [activeKerrTerminalRun, setActiveKerrTerminalRun] = useState<KerrEngineRunLog | null>(null);
  const [kerrEngineLogs, setKerrEngineLogs] = useState<KerrEngineRunLog[]>(() => [
    generateKerrEngineCalculationRun(
      ASTROPHYSICAL_PRESETS[0],
      DEFAULT_PARAMS,
      DEFAULT_VISUALIZER_SETTINGS.kerrEngineTier
    ),
  ]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isSingularityCollapsed, setIsSingularityCollapsed] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingRafRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const includeUiInVideoRef = useRef<boolean>(settings.includeUiInVideoExport);

  useEffect(() => {
    includeUiInVideoRef.current = Boolean(settings.includeUiInVideoExport);
  }, [settings.includeUiInVideoExport]);

  // Responsive mobile viewport tracking (screen width <= 768px)
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileScreen((prevMobile) => {
        if (!prevMobile && mobile) {
          // Auto-turn off Event Log when entering phone viewport
          setSettings((s) => (s.showEventLog ? { ...s, showEventLog: false } : s));
        }
        return mobile;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effective phone mode: active either via Settings toggle or mobile viewport
  const isPhone = settings.phoneMode || isMobileScreen;

  useEffect(() => {
    setGlobalHapticIntensity(settings.hapticsIntensity ?? 1.0);
  }, [settings.hapticsIntensity]);

  const haptics = useHaptics({
    enabled: settings.hapticsEnabled !== false,
    intensity: settings.hapticsIntensity ?? 1.0,
  });

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

  const formatLogTimestamp = useCallback(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
  }, []);

  const [eventLogs, setEventLogs] = useState<AstrophysicalLogEvent[]>(() => {
    const t0 = new Date().toTimeString().slice(0, 8);
    return [
      {
        id: 'init-metric',
        timestamp: t0,
        category: 'metric',
        message: 'Kerr-Newman spacetime metric initialized',
        detail: 'a* = 0.920 · r₊ = 0.69 Rₛ · Relativistic lensing active',
      },
      {
        id: 'init-target',
        timestamp: t0,
        category: 'system',
        message: 'Target locked: TON 618 (66 Billion M☉)',
        detail: 'Ultramassive Quasar · ṁ = 1.65× Eddington luminosity',
      },
    ];
  });

  const appendLogEvent = useCallback(
    (category: AstrophysicalEventCategory, message: string, detail?: string) => {
      const timestamp = formatLogTimestamp();
      setEventLogs((prev) => {
        const next: AstrophysicalLogEvent = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp,
          category,
          message,
          detail,
        };
        return [...prev.slice(-39), next];
      });
    },
    [formatLogTimestamp]
  );

  // Initialize Three.js WebGL scene once inside isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = new BlackHoleSceneController(mountEl, DEFAULT_PARAMS, {
      onFeatureSelect: (feat) => {
        setInspectedFeature(feat);
        if (feat) {
          appendLogEvent('system', `Inspected anatomical region: ${feat.title}`, feat.formula);
        }
      },
      onTrajectoryCreated: (traj) => {
        setLastTrajectory(traj);
        relativisticAudio.triggerGeodesicPing(traj.outcome);
        if (traj.outcome === 'captured') {
          appendLogEvent(
            'geodesic',
            'Geodesic trajectory completed',
            `Photon captured by r₊ event horizon (b = ${traj.impactParameterB.toFixed(2)} Rₛ)`
          );
        } else if (traj.outcome === 'critical-orbit') {
          appendLogEvent(
            'geodesic',
            'Geodesic trajectory completed',
            `Critical photon-ring resonance orbit (b = ${traj.impactParameterB.toFixed(2)} Rₛ)`
          );
        } else {
          appendLogEvent(
            'geodesic',
            'Geodesic trajectory completed',
            `Gravitational lensing deflection scattered ray (b = ${traj.impactParameterB.toFixed(2)} Rₛ)`
          );
        }
      },
      onHoverCoordsChange: (coords) => setHoverCoords(coords),
      onSingularityStateChange: (collapsed) => {
        setIsSingularityCollapsed(collapsed);
        if (!collapsed) {
          relativisticAudio.triggerAccretionShockPulse(false);
          appendLogEvent(
            'metric',
            'Singularity seed expanded into full horizon',
            'Kerr event horizon r₊ & relativistic accretion disk deployed'
          );
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
  }, [appendLogEvent]);

  // Push parameter updates to Three.js controller and Web Audio synthesizer
  useEffect(() => {
    sceneControllerRef.current?.updateParams(params);
    relativisticAudio.updateParameters(params);
  }, [params]);

  // Track real-time parameter transitions (Accretion Rate spikes, Kerr spin shifts, Well depth, Spectral filters)
  const loggedParamsRef = useRef({
    accretionRate: params.accretionRate,
    accretionState: params.accretionState,
    spin: params.spin,
    wellDepthMultiplier: params.wellDepthMultiplier,
    spectralMode: params.spectralMode,
    orbitalStars: params.layers.orbitalStars,
    timeLapseEnabled: settings.timeLapseEnabled,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const prev = loggedParamsRef.current;

      // 1. Accretion Rate spike / drop detection
      const deltaAccretion = params.accretionRate - prev.accretionRate;
      if (Math.abs(deltaAccretion) >= 0.18) {
        if (deltaAccretion > 0) {
          appendLogEvent(
            'accretion',
            'Accretion Rate spike detected',
            `Mass-infall flux surged to ṁ = ${params.accretionRate.toFixed(2)}× Eddington (T_peak ≈ ${(metrics.peakDiskTempK / 1e6).toFixed(2)} MK)`
          );
        } else {
          appendLogEvent(
            'accretion',
            'Accretion mass-infall subsiding',
            `Disk radiative flux reduced to ṁ = ${params.accretionRate.toFixed(2)}× Eddington`
          );
        }
        prev.accretionRate = params.accretionRate;
      }

      // 2. Accretion State transition (Active vs Quiescent)
      if (params.accretionState !== prev.accretionState) {
        if (params.accretionState === 'active') {
          appendLogEvent(
            'accretion',
            'Accretion Rate spike detected',
            'Active volumetric coronal torus & thermal flare state engaged'
          );
        } else {
          appendLogEvent(
            'accretion',
            'Quiescent razor-thin disk restored',
            'Coronal scale-height relaxed to equatorial plane'
          );
        }
        prev.accretionState = params.accretionState;
      }

      // 3. Kerr Spin parameter shift
      if (Math.abs(params.spin - prev.spin) >= 0.1) {
        appendLogEvent(
          'metric',
          `Kerr frame-dragging updated (a* = ${params.spin.toFixed(3)})`,
          `Prograde ISCO shifted to ${(metrics.iscoProgradeRg * 0.5).toFixed(2)} Rₛ · r₊ = ${(metrics.eventHorizonRg * 0.5).toFixed(2)} Rₛ`
        );
        prev.spin = params.spin;
      }

      // 4. Gravity Well Depth shift
      if (Math.abs(params.wellDepthMultiplier - prev.wellDepthMultiplier) >= 0.35) {
        appendLogEvent(
          'metric',
          'Gravity well curvature depth adjusted',
          `Spacetime embedding plunge set to ${params.wellDepthMultiplier.toFixed(1)}× Rₛ`
        );
        prev.wellDepthMultiplier = params.wellDepthMultiplier;
      }

      // 5. Spectral filter change
      if (params.spectralMode !== prev.spectralMode) {
        const modeNames: Record<BlackHoleParams['spectralMode'], string> = {
          blackbody: 'Optical Thermal Blackbody',
          eht230ghz: 'EHT 230 GHz VLBI Millimeter Band',
          xray: 'Chandra High-Energy X-Ray Corona',
          doppler: 'Relativistic Doppler Red/Blueshift Map',
        };
        appendLogEvent(
          'system',
          `Spectral band tuned: ${modeNames[params.spectralMode]}`,
          'Radiative transfer lookup table updated'
        );
        prev.spectralMode = params.spectralMode;
      }

      // 6. S-Star Orbital tracers toggled
      if (params.layers.orbitalStars !== prev.orbitalStars) {
        if (params.layers.orbitalStars) {
          appendLogEvent(
            'orbital',
            'Relativistic S-Star orbital tracers deployed',
            `Tracking Keplerian/Kerr precession at r = ${params.probeRadiusRs.toFixed(2)} Rₛ`
          );
        }
        prev.orbitalStars = params.layers.orbitalStars;
      }

      // 7. Time-Lapse astrophotography toggled
      if (settings.timeLapseEnabled !== prev.timeLapseEnabled) {
        appendLogEvent(
          'system',
          settings.timeLapseEnabled
            ? 'Time-Lapse long-exposure accumulation started'
            : 'Time-Lapse exposure buffer cleared',
          settings.timeLapseEnabled
            ? 'Integrating high-velocity orbital & accretion photon trails'
            : 'Returned to instantaneous real-time frame rendering'
        );
        prev.timeLapseEnabled = settings.timeLapseEnabled;
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [
    params.accretionRate,
    params.accretionState,
    params.spin,
    params.wellDepthMultiplier,
    params.spectralMode,
    params.layers.orbitalStars,
    params.probeRadiusRs,
    settings.timeLapseEnabled,
    metrics.peakDiskTempK,
    metrics.iscoProgradeRg,
    metrics.eventHorizonRg,
    appendLogEvent,
  ]);

  // Continuous Real-Time Astrophysical Telemetry Monitor while simulation is running
  useEffect(() => {
    if (params.timeScale === 0) return;

    let tickCount = 0;
    const intervalId = window.setInterval(() => {
      const ctrl = sceneControllerRef.current;
      if (!ctrl || isSingularityCollapsed) return;

      tickCount += 1;
      const telemetry = ctrl.getOverheadTelemetry();

      if (telemetry.orbitalStarsVisible && tickCount % 2 === 1) {
        appendLogEvent(
          'orbital',
          'Relativistic orbital passage telemetry',
          `v = ${(telemetry.probeOrbitalBeta * 100).toFixed(1)}% c at r = ${telemetry.probeRadiusRs.toFixed(2)} Rₛ · z = +${telemetry.probeRedshiftZ.toFixed(3)}`
        );
      } else if (isStellarCategory(params.objectCategory)) {
        appendLogEvent(
          'orbital',
          'Pulsar magnetosphere sweep synchronized',
          `Relativistic lighthouse beam aligned · Spin a* = ${params.spin.toFixed(3)}`
        );
      } else if (params.accretionRate >= 1.35 || params.accretionState === 'active') {
        appendLogEvent(
          'accretion',
          'Accretion Rate spike detected',
          `MRI magnetic reconnection flare at inner ISCO boundary (${telemetry.iscoRs.toFixed(2)} Rₛ)`
        );
      } else if (params.spin >= 0.8) {
        appendLogEvent(
          'metric',
          'Lense-Thirring frame-dragging vortex shear',
          `Ergosphere torsional coupling active (r_ergo = ${telemetry.ergosphereRs.toFixed(2)} Rₛ)`
        );
      } else {
        appendLogEvent(
          'geodesic',
          'Geodesic trajectory completed',
          `Photon ring lensed caustic stabilized at r_ph = ${telemetry.photonSphereRs.toFixed(2)} Rₛ`
        );
      }
    }, 9500);

    return () => window.clearInterval(intervalId);
  }, [
    params.timeScale,
    params.objectCategory,
    params.accretionRate,
    params.accretionState,
    params.spin,
    isSingularityCollapsed,
    appendLogEvent,
  ]);

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

  const handleCompleteKerrDeploy = useCallback(
    (run: KerrEngineRunLog) => {
      setActiveKerrTerminalRun(null);
      const found =
        ASTROPHYSICAL_PRESETS.find((p) => p.id === run.presetId) || ASTROPHYSICAL_PRESETS[0];

      if (found.category === 'black_hole') {
        sceneControllerRef.current?.replaySingularityExpansion();
      } else {
        sceneControllerRef.current?.triggerEventHorizonPulse(found.category);
      }
      relativisticAudio.triggerAccretionShockPulse(isStellarCategory(found.category));
      appendLogEvent(
        'metric',
        `Kerr Relativity Engine [${run.tierName.toUpperCase()}] converged (${run.totalDurationMs} ms)`,
        `${run.modelCode} · Cost: $${run.costUsd.toFixed(3)} · g_tt = ${run.summaryMetrics.g_tt.toFixed(3)}`
      );
    },
    [appendLogEvent]
  );

  const handleTriggerManualKerrSolve = useCallback(
    (tierOverride?: KerrEngineTierId) => {
      const currentPreset =
        ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];
      const tierToUse = tierOverride || settings.kerrEngineTier || 'advanced';
      const run = generateKerrEngineCalculationRun(currentPreset, params, tierToUse);
      setKerrEngineLogs((prev) => [run, ...prev.slice(0, 29)]);
      setActiveKerrTerminalRun(run);
    },
    [activePresetId, params, settings.kerrEngineTier]
  );

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const found = ASTROPHYSICAL_PRESETS.find((p) => p.id === presetId);
      if (!found) return;
      setActivePresetId(found.id);

      const nextParams: BlackHoleParams = {
        ...params,
        ...found.params,
        presetId: found.id,
        trueMassSolar: found.trueMassSolar,
        objectCategory: found.category,
        // Ensure ergosphere, anatomy guide, and stars remain off when clicking a black hole
        layers: {
          ...params.layers,
          ...(found.params.layers || {}),
          ergosphereCage: false,
          orbitalStars: false,
          microlensingStar: false,
          geodesicRays: false,
          anatomyLines: false,
        },
      };
      setParams(nextParams);

      const run = generateKerrEngineCalculationRun(
        found,
        nextParams,
        settings.kerrEngineTier || 'advanced'
      );
      setKerrEngineLogs((prev) => [run, ...prev.slice(0, 29)]);

      appendLogEvent(
        'system',
        `Target locked: ${found.name}`,
        `${found.classification} · Mass: ${found.plainMassExplanation}`
      );

      // If Real-Time Kerr Relativity Engine pre-load terminal is enabled, stream calculation before deploying 3D expansion
      if (settings.kerrEngineEnabled !== false) {
        setActiveKerrTerminalRun(run);
      } else {
        if (found.category === 'black_hole') {
          sceneControllerRef.current?.replaySingularityExpansion();
        } else {
          sceneControllerRef.current?.triggerEventHorizonPulse(found.category);
        }
        relativisticAudio.triggerAccretionShockPulse(isStellarCategory(found.category));
      }
    },
    [appendLogEvent, params, settings.kerrEngineEnabled, settings.kerrEngineTier]
  );

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

    const targetCam: CameraPresetId = isStellarCategory(currentPreset.category) ? 'polar' : 'equatorial';
    setActiveCamera(targetCam);
    sceneControllerRef.current?.setCameraPreset(targetCam);
    sceneControllerRef.current?.triggerEventHorizonPulse(currentPreset.category);
    appendLogEvent('system', 'Relativistic parameters reset to baseline', currentPreset.name);
  }, [activePresetId, appendLogEvent]);

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
    appendLogEvent(
      'accretion',
      nextCategory === 'binary'
        ? 'Binary Roche-lobe mass transfer activated'
        : 'Isolated singularity architecture restored',
      nextCategory === 'binary'
        ? 'Donor star tidal stream feeding outer accretion disk'
        : 'Single Kerr spacetime metric'
    );
  }, [appendLogEvent]);

  const handleSelectPhysicsPreset = useCallback((presetId: PhysicsPresetId) => {
    haptics.medium();
    setParams((prev) => {
      let nextSpin = 0.0;
      let nextAccretion = prev.accretionRate;
      let nextDoppler = prev.dopplerStrength;
      let nextErgoCage = prev.layers.ergosphereCage;

      if (presetId === 'schwarzschild') {
        nextSpin = 0.0;
        nextAccretion = Math.min(prev.accretionRate, 0.90);
        nextDoppler = 0.20;
        nextErgoCage = false; // Schwarzschild spacetime has zero ergosphere
      } else if (presetId === 'moderate_kerr') {
        nextSpin = 0.70;
        nextAccretion = 1.30;
        nextDoppler = 0.55;
      } else if (presetId === 'kerr_max') {
        nextSpin = 0.998;
        nextAccretion = Math.max(prev.accretionRate, 1.85);
        nextDoppler = 0.80;
      } else if (presetId === 'extreme_kerr') {
        nextSpin = 1.0;
        nextAccretion = Math.max(prev.accretionRate, 1.95);
        nextDoppler = 0.95;
      }

      return {
        ...prev,
        objectCategory: 'black_hole',
        spin: nextSpin,
        accretionRate: nextAccretion,
        dopplerStrength: nextDoppler,
        layers: {
          ...prev.layers,
          ergosphereCage: nextErgoCage,
        },
      };
    });

    sceneControllerRef.current?.triggerEventHorizonPulse('black_hole');
    relativisticAudio.triggerAccretionShockPulse(false);
    appendLogEvent(
      'metric',
      `GR Metric preset loaded: ${presetId.toUpperCase()}`,
      presetId === 'kerr_max' || presetId === 'extreme_kerr'
        ? 'Accretion Rate spike detected · High frame-dragging regime'
        : 'Spacetime metric tensor reconfigured'
    );
  }, [haptics, appendLogEvent]);

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

  const handleExportSnapshot = useCallback(async () => {
    if (!sceneControllerRef.current) return;
    haptics.success();
    const timestamp = Date.now();
    const filename = `cosmic-vis-${activePresetId}-${timestamp}.png`;

    // If UI export is enabled, composite the HTML interface over the clean 3D WebGL render
    if (settings.includeUiInExport && appContainerRef.current) {
      try {
        const webglDataUrl = sceneControllerRef.current.captureSnapshotDataUrl();
        const uiDataUrl = await toPng(appContainerRef.current, {
          backgroundColor: 'transparent',
          style: {
            backgroundColor: 'transparent',
          },
          filter: (node: HTMLElement) => {
            // Do not capture the WebGL canvas in the DOM snapshot (it is composited directly)
            if (node.tagName === 'CANVAS') return false;
            // Exclude modal dialogs if open during export
            if (node.getAttribute?.('role') === 'dialog') return false;
            return true;
          },
          pixelRatio: window.devicePixelRatio || 1,
          cacheBust: true,
        });

        const compositeCanvas = document.createElement('canvas');
        const bgImg = new Image();
        const uiImg = new Image();

        await Promise.all([
          new Promise<void>((resolve, reject) => {
            bgImg.onload = () => resolve();
            bgImg.onerror = reject;
            bgImg.src = webglDataUrl;
          }),
          new Promise<void>((resolve, reject) => {
            uiImg.onload = () => resolve();
            uiImg.onerror = reject;
            uiImg.src = uiDataUrl;
          }),
        ]);

        compositeCanvas.width = bgImg.naturalWidth || bgImg.width;
        compositeCanvas.height = bgImg.naturalHeight || bgImg.height;
        const ctx = compositeCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bgImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
          ctx.drawImage(uiImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
          const compositeUrl = compositeCanvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = filename;
          link.href = compositeUrl;
          link.click();
          return;
        }
      } catch (err) {
        console.warn('UI composite snapshot failed, falling back to clean WebGL render', err);
      }
    }

    // Default clean 3D WebGL render (auto-off behavior)
    const dataUrl = sceneControllerRef.current.captureSnapshotDataUrl();
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, [activePresetId, haptics, settings.includeUiInExport]);

  const stopRecordingCleanup = useCallback(() => {
    if (recordingRafRef.current !== null) {
      cancelAnimationFrame(recordingRafRef.current);
      recordingRafRef.current = null;
    }
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const handleToggleRecording = useCallback(() => {
    // If currently recording, stop and save video
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      haptics.success();
      mediaRecorderRef.current.stop();
      stopRecordingCleanup();
      setIsRecording(false);
      return;
    }

    if (!sceneControllerRef.current) return;
    const webglCanvas = sceneControllerRef.current.getCanvas();
    if (!webglCanvas) return;

    haptics.medium();

    // Offscreen compositing canvas so we can record 60fps 3D WebGL + optional live UI overlay
    const recordCanvas = document.createElement('canvas');
    recordCanvas.width = webglCanvas.width || 1920;
    recordCanvas.height = webglCanvas.height || 1080;
    const ctx = recordCanvas.getContext('2d');
    if (!ctx) return;

    let uiOverlayCanvas: HTMLCanvasElement | null = null;
    let isCapturingUi = false;
    let lastUiCaptureMs = 0;
    let isActive = true;

    const refreshUiOverlay = async () => {
      if (!isActive || !includeUiInVideoRef.current || !appContainerRef.current || isCapturingUi) {
        return;
      }
      isCapturingUi = true;
      try {
        const domCanvas = await toCanvas(appContainerRef.current, {
          backgroundColor: 'transparent',
          style: {
            backgroundColor: 'transparent',
          },
          filter: (node: HTMLElement) => {
            if (node.tagName === 'CANVAS') return false;
            if (node.getAttribute?.('role') === 'dialog') return false;
            return true;
          },
          pixelRatio: window.devicePixelRatio || 1,
          cacheBust: false,
        });
        if (isActive) {
          uiOverlayCanvas = domCanvas;
        }
      } catch {
        // Ignore transient DOM serialization errors during rapid layout changes
      } finally {
        isCapturingUi = false;
      }
    };

    const renderCompositeFrame = (nowMs: number) => {
      if (!isActive) return;

      if (
        webglCanvas.width > 0 &&
        webglCanvas.height > 0 &&
        (recordCanvas.width !== webglCanvas.width || recordCanvas.height !== webglCanvas.height)
      ) {
        recordCanvas.width = webglCanvas.width;
        recordCanvas.height = webglCanvas.height;
      }

      ctx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
      ctx.drawImage(webglCanvas, 0, 0, recordCanvas.width, recordCanvas.height);

      if (includeUiInVideoRef.current) {
        if (nowMs - lastUiCaptureMs > 320) {
          lastUiCaptureMs = nowMs;
          void refreshUiOverlay();
        }
        if (uiOverlayCanvas) {
          ctx.drawImage(uiOverlayCanvas, 0, 0, recordCanvas.width, recordCanvas.height);
        }
      }

      recordingRafRef.current = requestAnimationFrame(renderCompositeFrame);
    };

    if (includeUiInVideoRef.current) {
      void refreshUiOverlay();
    }
    renderCompositeFrame(performance.now());

    const stream = recordCanvas.captureStream(60);
    const candidateMimeTypes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const selectedMimeType =
      candidateMimeTypes.find(
        (type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
      ) || '';

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(
      stream,
      selectedMimeType
        ? { mimeType: selectedMimeType, videoBitsPerSecond: 12_000_000 }
        : { videoBitsPerSecond: 12_000_000 }
    );

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      isActive = false;
      stopRecordingCleanup();
      stream.getTracks().forEach((track) => track.stop());

      if (chunks.length === 0) return;
      const finalMime = recorder.mimeType || selectedMimeType || 'video/webm';
      const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: finalMime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `cosmic-vis-video-${activePresetId}-${Date.now()}.${ext}`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);
    setRecordingSeconds(0);

    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }, [activePresetId, haptics, stopRecordingCleanup]);

  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stopRecordingCleanup]);

  const isStar = isStellarCategory(params.objectCategory);
  const t = TRANSLATIONS[settings.language || 'en'] || TRANSLATIONS.en;

  return (
    <div
      ref={appContainerRef}
      className="relative w-screen h-screen overflow-hidden bg-black select-none flex flex-col"
    >
      {/* Zone 1-3 Top Navigation Bar (Hidden in Clean Mode) */}
      {!isCleanMode && (
        <TopBar
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          systemCategory={params.systemCategory || 'isolated'}
          onChangeSystemCategory={handleChangeSystemCategory}
          onOpenTheoryModal={() => setIsTheoryModalOpen(true)}
          onOpenQuickGuideModal={() => setIsQuickGuideModalOpen(true)}
          onOpenArchetypeModal={() => setIsArchetypeModalOpen(true)}
          onOpenCosmicScaleModal={() => setIsCosmicScaleModalOpen(true)}
          onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          activeBackgroundTheme={params.backgroundTheme || 'galactic_core'}
          isAnatomyVisible={isAnatomyVisible}
          onToggleAnatomyVisible={handleToggleAnatomyVisible}
          onExportSnapshot={handleExportSnapshot}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          onToggleRecording={handleToggleRecording}
          isCleanMode={isCleanMode}
          onToggleCleanMode={handleToggleCleanMode}
          isPhoneMode={isPhone}
          hapticsEnabled={settings.hapticsEnabled !== false}
          language={settings.language || 'en'}
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
            <span className="tracking-wide">{t.simulationPaused}</span>
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, timeScale: 1.0 }))}
              className="ml-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-black hover:bg-amber-300 font-sans text-[11px] font-bold cursor-pointer transition-colors shadow-sm"
              title={`${t.resume} (Space)`}
            >
              {t.resume}
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
          <div className={`absolute top-2 sm:top-3 left-2 sm:left-4 z-10 flex flex-col items-start gap-2 pointer-events-none ${isPhone ? 'max-w-[210px]' : 'max-w-xs sm:max-w-sm'}`}>
            {/* Target Spec Badge */}
            {settings.showLeftHud && (
              <div className={`pointer-events-auto bg-[#050811]/95 border border-slate-800/80 rounded-xl ${isPhone ? 'p-1.5' : 'p-3'} shadow-xl transition-all w-full`}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                      ARCHETYPE_DEFINITIONS[activePreset.archetype].badgeBg
                    }`}
                  >
                    {activePreset.classification}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 truncate">
                    {activePreset.designation}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-1 mt-0.5">
                  <h1 className={`font-display ${isPhone ? 'text-sm' : 'text-xl sm:text-2xl'} font-bold text-slate-100 tracking-tight flex items-center gap-1`}>
                    <span>{activePreset.name}</span>
                    {activePreset.id === 'ton618' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-normal flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        Titan
                      </span>
                    )}
                    {params.objectCategory === 'star' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-normal flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 text-emerald-400" />
                        Remnant
                      </span>
                    )}
                    {params.objectCategory === 'luminous_star' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-normal flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                        Star
                      </span>
                    )}
                  </h1>
                  <span className="font-mono text-amber-300 font-bold text-xs">
                    {activePreset.plainMassExplanation}
                  </span>
                </div>

                {!isPhone && (
                  <p className="text-[11px] text-slate-300 leading-snug mt-1">
                    {activePreset.solarEquivalence}
                  </p>
                )}

                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 mt-1 border-t border-slate-800/60">
                  <span>{params.objectCategory === 'luminous_star' ? t.photosphereLabel : isStar ? t.crustLabel : t.horizonLabel} <strong className="text-slate-200">{activePreset.horizonDiameterKmDisplay}</strong></span>
                  <span>a* <strong className="text-cyan-300">{params.spin.toFixed(3)}</strong></span>
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
                      {t.compareRealSize}
                    </button>
                  </div>
                )}

                {settings.showCursorTelemetry && hoverCoords && (
                  <div className="mt-1.5 pt-1 border-t border-slate-800/50 text-[10px] font-mono text-cyan-300/90 tabular-nums">
                    {t.cursorLabel}: r = {hoverCoords.rRs.toFixed(2)} Rₛ · φ = {hoverCoords.phiDeg.toFixed(0)}° · z = +{hoverCoords.redshiftZ.toFixed(3)}
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
          <div className={`absolute ${isPhone ? (isDockCollapsed ? 'bottom-14' : 'bottom-[200px]') : 'bottom-20 sm:bottom-24'} left-1/2 -translate-x-1/2 z-20 pointer-events-auto px-2 w-full max-w-sm flex justify-center transition-all`}>
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
                {t.singularitySeedPrompt}
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
              title={t.exportSnapshot}
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold tracking-wide">{t.exportSnapshot}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleRecording}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border shadow-2xl font-mono text-xs transition-all cursor-pointer ${
                isRecording
                  ? 'bg-rose-950/90 border-rose-400 text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.4)]'
                  : 'bg-[#050811]/90 hover:bg-black text-neutral-200 hover:text-white border-neutral-700/80 hover:border-rose-400'
              }`}
              title={isRecording ? t.stopRecording : t.recordVideo}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                  <span className="font-semibold tracking-wide">
                    REC {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold tracking-wide">{t.recordVideo}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSetCleanMode(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#050811]/90 hover:bg-black text-neutral-200 hover:text-white border border-neutral-700/80 hover:border-amber-400 shadow-2xl font-mono text-xs transition-all cursor-pointer"
              title={`${t.showUi} (Shortcut: C / ESC)`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold tracking-wide">{t.showUi}</span>
              <span className="text-[10px] text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                C / Esc
              </span>
            </button>
          </div>
        )}

        {/* Top-Right Real-Time Spacetime Metric Tensor Evolution Overlay */}
        {!isCleanMode && Boolean(settings.showMetricTelemetry) && (
          <MetricTelemetryOverlay
            params={params}
            metrics={metrics}
            sceneController={controllerInstance || sceneControllerRef.current}
            hoverCoords={hoverCoords}
            onChangeProbeRadius={(newRadius) =>
              setParams((prev) => ({ ...prev, probeRadiusRs: newRadius }))
            }
            onClose={() =>
              setSettings((prev) => ({ ...prev, showMetricTelemetry: false }))
            }
            isPhoneMode={isPhone}
            language={settings.language || 'en'}
          />
        )}

        {/* Bottom-Left Real-Time Astrophysical Event Log Overlay */}
        {!isCleanMode && settings.showEventLog !== false && (
          <EventLogOverlay
            events={eventLogs}
            onClearEvents={() => setEventLogs([])}
            isPaused={params.timeScale === 0}
            isDockCollapsed={isDockCollapsed}
            isPhoneMode={isPhone}
            language={settings.language || 'en'}
          />
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
            onOpenQuickGuideModal={() => setIsQuickGuideModalOpen(true)}
            onChangeSystemCategory={handleChangeSystemCategory}
            isPhoneMode={isPhone}
            hapticsEnabled={settings.hapticsEnabled !== false}
            onTriggerPulse={() => {
              haptics.pulseBoom();
              if (params.objectCategory === 'black_hole') {
                sceneControllerRef.current?.replaySingularityExpansion();
              } else {
                sceneControllerRef.current?.triggerEventHorizonPulse(params.objectCategory);
              }
              relativisticAudio.triggerAccretionShockPulse(isStellarCategory(params.objectCategory));
              appendLogEvent(
                'accretion',
                'Relativistic accretion shockwave emitted',
                'Magnetosonic pressure wave propagating across horizon'
              );
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

      {/* Plain-English Physics Quick-Guide Modal */}
      <PhysicsQuickGuideModal
        isOpen={isQuickGuideModalOpen}
        onClose={() => setIsQuickGuideModalOpen(false)}
        params={params}
        onChangeParams={setParams}
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
        currentSpin={params.spin}
        onSelectPhysicsPreset={handleSelectPhysicsPreset}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onToggleRecording={handleToggleRecording}
        kerrEngineLogs={kerrEngineLogs}
        onOpenKerrLogModal={() => setIsKerrLogModalOpen(true)}
        onTriggerKerrCalculation={handleTriggerManualKerrSolve}
      />

      {/* Real-Time Kerr Relativity Engine Pre-Load Terminal Modal */}
      <KerrRelativityEngineModal
        activeRun={activeKerrTerminalRun}
        onCompleteDeploy={handleCompleteKerrDeploy}
        onOpenSettingsLog={() => {
          setIsSettingsModalOpen(true);
          setIsKerrLogModalOpen(true);
        }}
      />

      {/* Full-Screen Kerr Relativity Engine Calculation & Billing Log Modal */}
      <KerrEngineLogViewerModal
        isOpen={isKerrLogModalOpen}
        onClose={() => setIsKerrLogModalOpen(false)}
        logs={kerrEngineLogs}
        activeTierId={settings.kerrEngineTier || 'advanced'}
        onSelectTier={(nextTier) =>
          setSettings((prev) => ({
            ...prev,
            kerrEngineEnabled: true,
            kerrEngineTier: nextTier,
          }))
        }
        onRerunCalculation={() => handleTriggerManualKerrSolve()}
      />
    </div>
  );
}
