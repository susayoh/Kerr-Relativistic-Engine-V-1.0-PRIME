/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, Zap, Maximize2, Eye, Download, Video, Square, Settings, Sliders } from 'lucide-react';
import {
  ARCHETYPE_DEFINITIONS,
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  GeodesicTrajectory,
  SystemCategory,
  PhysicsPresetId,
  computeRelativisticMetrics,
  computeNullGeodesic,
  buildGeodesicTrajectoryCsv,
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
  triggerEventLogJsonDownload,
} from './components/EventLogOverlay';
import { MetricTelemetryOverlay } from './components/MetricTelemetryOverlay';
import {
  KerrRelativityEngineModal,
  KerrEngineLogViewerModal,
  KerrEngineRunLog,
  KerrEngineTierId,
  generateKerrEngineCalculationRun,
} from './components/KerrRelativityEngineModal';
import { CompareModeOverlay } from './components/CompareModeOverlay';
import { PerformanceMonitorOverlay } from './components/PerformanceMonitorOverlay';
import { ChangelogModal } from './components/ChangelogModal';
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
  const compareCanvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneControllerRef = useRef<BlackHoleSceneController | null>(null);
  const compareSceneControllerRef = useRef<BlackHoleSceneController | null>(null);
  const [controllerInstance, setControllerInstance] = useState<BlackHoleSceneController | null>(null);

  const [params, setParams] = useState<BlackHoleParams>(DEFAULT_PARAMS);
  const [settings, setSettings] = useState<VisualizerSettings>(() => {
    const isInitialMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    return {
      ...DEFAULT_VISUALIZER_SETTINGS,
      focusMode: true,
      showOverheadMap: !isInitialMobile,
      showPerformanceMonitor: false,
      showEventLog: false,
      showMetricTelemetry: false,
      highPerformanceMode: !isInitialMobile,
      webglDepthPeeling: true,
    };
  });
  const [isDevMode, setIsDevMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('kerr_dev_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [activePresetId, setActivePresetId] = useState<string>('ton618');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [comparePresetId, setComparePresetId] = useState<string>('sgra');
  const [compareSpinOverride, setCompareSpinOverride] = useState<number>(0.15);
  const [syncSpinInCompare, setSyncSpinInCompare] = useState<boolean>(false);
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
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState<boolean>(false);
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
  const [hasCompletedStartupSequence, setHasCompletedStartupSequence] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const [isCinematicTourActive, setIsCinematicTourActive] = useState<boolean>(false);
  const [cinematicTourStageLabel, setCinematicTourStageLabel] = useState<string>('Polar Axis');

  // Cinematic 6.0s Non-Skippable Boot-In Telemetry Overlay + Post-Boot Sequence (+1.5s Watermark -> +1.0s Seed -> +2.0s Expand)
  const [showBootOverlay, setShowBootOverlay] = useState<boolean>(true);
  const [isBootOverlayFading, setIsBootOverlayFading] = useState<boolean>(false);
  const [showWatermarkOverlay, setShowWatermarkOverlay] = useState<boolean>(false);
  const [isWatermarkOverlayFading, setIsWatermarkOverlayFading] = useState<boolean>(false);
  const [isPostBootSequenceActive, setIsPostBootSequenceActive] = useState<boolean>(true);
  const watermarkFadeTimerRef = useRef<number | null>(null);

  const handleFinishBootIntro = useCallback(() => {
    setIsBootOverlayFading((alreadyFading) => {
      if (alreadyFading) return true;
      window.setTimeout(() => {
        setShowBootOverlay(false);
      }, 450);
      return true;
    });
  }, []);

  const handleStartWatermarkDisplay = useCallback(() => {
    setShowWatermarkOverlay(true);
    setIsWatermarkOverlayFading(false);
  }, []);

  const handleSingularitySeedLoaded = useCallback(() => {
    if (watermarkFadeTimerRef.current !== null) {
      window.clearTimeout(watermarkFadeTimerRef.current);
      watermarkFadeTimerRef.current = null;
    }
    setIsWatermarkOverlayFading(true);
    watermarkFadeTimerRef.current = window.setTimeout(() => {
      setShowWatermarkOverlay(false);
    }, 550);
  }, []);

  const handleFinishWatermarkPause = useCallback(() => {
    if (watermarkFadeTimerRef.current !== null) {
      window.clearTimeout(watermarkFadeTimerRef.current);
      watermarkFadeTimerRef.current = null;
    }
    setIsPostBootSequenceActive(false);
    setIsWatermarkOverlayFading(true);
    window.setTimeout(() => {
      setShowWatermarkOverlay(false);
    }, 650);
  }, []);

  // First-time visitor floating interaction hint state (persisted via localStorage "kerr_has_interacted")
  const [showInteractionHint, setShowInteractionHint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('kerr_has_interacted') !== 'true';
    } catch {
      return true;
    }
  });
  const [isInteractionHintFading, setIsInteractionHintFading] = useState<boolean>(false);

  const handleFirstCanvasInteraction = useCallback(() => {
    if (
      sceneControllerRef.current?.isBootIntroRunning() ||
      sceneControllerRef.current?.isWatermarkPauseRunning()
    ) {
      return;
    }
    if (!showInteractionHint || isInteractionHintFading) return;
    setIsInteractionHintFading(true);
    try {
      window.localStorage.setItem('kerr_has_interacted', 'true');
    } catch {
      // Ignore storage quota / privacy mode errors
    }
    window.setTimeout(() => {
      setShowInteractionHint(false);
    }, 450);
  }, [showInteractionHint, isInteractionHintFading]);

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
          // Auto-turn off desktop-heavy floating overlays when entering phone viewport
          setSettings((s) => ({
            ...s,
            showEventLog: false,
            showOverheadMap: false,
            showPerformanceMonitor: false,
          }));
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
  const hoverCoordsRef = useRef<{
    rRs: number;
    phiDeg: number;
    redshiftZ: number;
  } | null>(null);
  const cameraCoordsRef = useRef<{
    r: number;
    theta: number;
    phi: number;
  }>({ r: 16.5, theta: 71, phi: 96 });
  const observerReadoutRef = useRef<HTMLDivElement | null>(null);
  const lastObserverDomUpdateRef = useRef<number>(0);
  const isDraggingCameraRef = useRef<boolean>(false);
  const cursorReadoutRef = useRef<HTMLDivElement | null>(null);

  const metrics = useMemo(() => computeRelativisticMetrics(params), [params]);

  // Low-Latency Proximity Warning System (Photon Sphere Radius & Ergosphere Static Limit)
  const [proximityZone, setProximityZone] = useState<'none' | 'ergosphere' | 'photon_sphere'>('none');
  const [proximityBurst, setProximityBurst] = useState<boolean>(false);
  const proximityZoneRef = useRef<'none' | 'ergosphere' | 'photon_sphere'>('none');
  const lastProximityHapticMsRef = useRef<number>(0);
  const proximityReadoutDomRef = useRef<HTMLSpanElement | null>(null);
  const proximityBurstTimerRef = useRef<number | null>(null);

  const evaluateProximityThresholds = useCallback(
    (
      rRs: number,
      thetaDeg: number,
      spinVal: number,
      photonSphereRgVal: number,
      category: BlackHoleParams['objectCategory'],
      suppressDuringBoot: boolean
    ) => {
      if (isStellarCategory(category) || suppressDuringBoot) {
        if (proximityZoneRef.current !== 'none') {
          proximityZoneRef.current = 'none';
          setProximityZone('none');
        }
        return;
      }

      const thetaRad = (thetaDeg * Math.PI) / 180;
      const sinThetaSq = Math.sin(thetaRad) * Math.sin(thetaRad);
      // Photon sphere capture envelope in Rs (1.50 Rs Schwarzschild limit + prograde Kerr shell)
      const photonSphereThresholdRs = Math.max(1.52, photonSphereRgVal * 0.5);
      // Ergosphere static limit & Lense-Thirring frame-dragging envelope in Rs
      const ergosphereThresholdRs = Math.max(
        photonSphereThresholdRs + 0.55,
        1.85 + 0.65 * Math.abs(spinVal) * sinThetaSq
      );

      let nextZone: 'none' | 'ergosphere' | 'photon_sphere' = 'none';
      if (rRs <= photonSphereThresholdRs) {
        nextZone = 'photon_sphere';
      } else if (rRs <= ergosphereThresholdRs) {
        nextZone = 'ergosphere';
      }

      // Zero-latency direct DOM telemetry readout update
      const domEl = proximityReadoutDomRef.current;
      if (domEl && nextZone !== 'none') {
        const progradePhRs = photonSphereRgVal * 0.5;
        const staticLimitRs =
          0.5 *
          (1.0 + Math.sqrt(Math.max(0, 1.0 - spinVal * spinVal * Math.cos(thetaRad) * Math.cos(thetaRad))));
        domEl.textContent =
          nextZone === 'photon_sphere'
            ? `r = ${rRs.toFixed(2)} Rₛ · r_ph(pro) = ${progradePhRs.toFixed(2)} Rₛ · θ = ${thetaDeg.toFixed(0)}°`
            : `r = ${rRs.toFixed(2)} Rₛ · r_ergo(θ) = ${staticLimitRs.toFixed(2)} Rₛ · θ = ${thetaDeg.toFixed(0)}°`;
      }

      if (nextZone !== proximityZoneRef.current) {
        const prevZone = proximityZoneRef.current;
        proximityZoneRef.current = nextZone;
        setProximityZone(nextZone);

        if (nextZone !== 'none') {
          setProximityBurst(true);
          if (proximityBurstTimerRef.current !== null) {
            window.clearTimeout(proximityBurstTimerRef.current);
          }
          proximityBurstTimerRef.current = window.setTimeout(() => {
            setProximityBurst(false);
            proximityBurstTimerRef.current = null;
          }, 440);

          const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (nowMs - lastProximityHapticMsRef.current >= 550) {
            lastProximityHapticMsRef.current = nowMs;
            if (nextZone === 'photon_sphere') {
              haptics.pulseBoom();
            } else if (prevZone === 'none') {
              haptics.medium();
            }
          }
        }
      }
    },
    [haptics]
  );

  const proximityEvalRef = useRef<{
    spin: number;
    photonSphereRg: number;
    objectCategory: BlackHoleParams['objectCategory'];
    suppressDuringBoot: boolean;
    highPerformanceMode: boolean;
    evaluate: typeof evaluateProximityThresholds;
  }>({
    spin: params.spin,
    photonSphereRg: metrics.photonSphereRg,
    objectCategory: params.objectCategory,
    suppressDuringBoot: true,
    highPerformanceMode: Boolean(settings.highPerformanceMode),
    evaluate: evaluateProximityThresholds,
  });

  useEffect(() => {
    const suppressDuringBoot =
      (showBootOverlay && !isBootOverlayFading) ||
      (!isStellarCategory(params.objectCategory) && isSingularityCollapsed);
    proximityEvalRef.current = {
      spin: params.spin,
      photonSphereRg: metrics.photonSphereRg,
      objectCategory: params.objectCategory,
      suppressDuringBoot,
      highPerformanceMode: Boolean(settings.highPerformanceMode),
      evaluate: evaluateProximityThresholds,
    };
    evaluateProximityThresholds(
      cameraCoordsRef.current.r,
      cameraCoordsRef.current.theta,
      params.spin,
      metrics.photonSphereRg,
      params.objectCategory,
      suppressDuringBoot
    );
  }, [
    params.spin,
    params.objectCategory,
    metrics.photonSphereRg,
    showBootOverlay,
    isBootOverlayFading,
    isSingularityCollapsed,
    settings.highPerformanceMode,
    evaluateProximityThresholds,
  ]);

  const activePreset = useMemo(
    () => ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0],
    [activePresetId]
  );

  const comparePreset = useMemo(
    () => ASTROPHYSICAL_PRESETS.find((p) => p.id === comparePresetId) || ASTROPHYSICAL_PRESETS[1],
    [comparePresetId]
  );

  // Synchronized physics parameters for Viewport B in Compare Mode:
  // Shares accretionRate, inclinationDeg, dopplerStrength, probeRadiusRs, timeScale, wellDepthMultiplier,
  // spectralMode, backgroundTheme, and layers with Viewport A while contrasting preset mass & Kerr spin a*
  const compareParams = useMemo<BlackHoleParams>(() => {
    return {
      ...params,
      presetId: comparePreset.id,
      objectCategory: comparePreset.category,
      trueMassSolar: comparePreset.trueMassSolar,
      massSolar: comparePreset.params.massSolar ?? params.massSolar,
      spin: syncSpinInCompare ? params.spin : compareSpinOverride,
    };
  }, [params, comparePreset, syncSpinInCompare, compareSpinOverride]);

  const compareMetrics = useMemo(
    () => computeRelativisticMetrics(compareParams),
    [compareParams]
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
      // Never append WARNING: Frame spike detected or background spike warnings while the user is actively orbiting/zooming the camera
      if (
        (isDraggingCameraRef.current || sceneControllerRef.current?.isOrbitingCamera()) &&
        (message.includes('WARNING: Frame spike detected') ||
          message.toLowerCase().includes('spike') ||
          category !== 'system')
      ) {
        return;
      }
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

  const appendLogEventRef = useRef(appendLogEvent);
  useEffect(() => {
    appendLogEventRef.current = appendLogEvent;
  }, [appendLogEvent]);

  // Initialize Three.js WebGL scene once inside isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = new BlackHoleSceneController(mountEl, DEFAULT_PARAMS, {
      onFeatureSelect: (feat) => {
        setInspectedFeature(feat);
        if (feat) {
          appendLogEventRef.current('system', `Inspected anatomical region: ${feat.title}`, feat.formula);
        }
      },
      onTrajectoryCreated: (traj) => {
        setLastTrajectory(traj);
        relativisticAudio.triggerGeodesicPing(traj.outcome);
        if (traj.outcome === 'captured') {
          appendLogEventRef.current(
            'geodesic',
            'Geodesic trajectory completed',
            `Photon captured by r₊ event horizon (b = ${traj.impactParameterB.toFixed(2)} Rₛ)`
          );
        } else if (traj.outcome === 'critical-orbit') {
          appendLogEventRef.current(
            'geodesic',
            'Geodesic trajectory completed',
            `Critical photon-ring resonance orbit (b = ${traj.impactParameterB.toFixed(2)} Rₛ)`
          );
        } else {
          appendLogEventRef.current(
            'geodesic',
            'Geodesic trajectory completed',
            `Gravitational lensing deflection scattered ray (b = ${traj.impactParameterB.toFixed(2)} Rₛ)`
          );
        }
      },
      onHoverCoordsChange: (coords) => {
        hoverCoordsRef.current = coords;
        const el = cursorReadoutRef.current;
        if (el) {
          if (coords) {
            el.style.display = 'block';
            el.textContent = `Cursor: r = ${coords.rRs.toFixed(2)} Rₛ · φ = ${coords.phiDeg.toFixed(0)}° · z = +${coords.redshiftZ.toFixed(3)}`;
          } else {
            el.style.display = 'none';
          }
        }
      },
      onObserverReadoutChange: ({ rRs, thetaDeg, phiDeg }, forceImmediate) => {
        cameraCoordsRef.current = { r: rRs, theta: thetaDeg, phi: phiDeg };
        // Low-latency proximity evaluation on every camera move
        const pCtx = proximityEvalRef.current;
        pCtx.evaluate(
          rRs,
          thetaDeg,
          pCtx.spin,
          pCtx.photonSphereRg,
          pCtx.objectCategory,
          pCtx.suppressDuringBoot
        );
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const domThrottleMs = pCtx.highPerformanceMode ? 360 : 200;
        if (forceImmediate || now - lastObserverDomUpdateRef.current >= domThrottleMs) {
          lastObserverDomUpdateRef.current = now;
          const el = observerReadoutRef.current;
          if (el) {
            el.textContent = `Observer: r = ${rRs.toFixed(1)} Rₛ | θ = ${thetaDeg.toFixed(0)}° | φ = ${phiDeg.toFixed(0)}°`;
          }
        }
      },
      onCameraDragStateChange: (isDragging) => {
        isDraggingCameraRef.current = isDragging;
      },
      onSingularityStateChange: (collapsed) => {
        setIsSingularityCollapsed(collapsed);
        if (!collapsed) {
          setHasCompletedStartupSequence(true);
          relativisticAudio.triggerAccretionShockPulse(false);
          appendLogEventRef.current(
            'metric',
            'Singularity seed expanded into full horizon',
            'Kerr event horizon r₊ & relativistic accretion disk deployed'
          );
        } else {
          appendLogEventRef.current(
            'metric',
            'Black hole collapsed to Singularity Seed',
            'Event horizon echo pulse emitted · Quasinormal ringdown active'
          );
        }
      },
      onCameraChange: (pos, target) => {
        compareSceneControllerRef.current?.syncCameraPose(pos, target);
      },
      onBootIntroComplete: () => {
        handleFinishBootIntro();
      },
      onWatermarkDisplayStart: () => {
        handleStartWatermarkDisplay();
      },
      onSingularitySeedLoaded: () => {
        handleSingularitySeedLoaded();
      },
      onWatermarkPauseComplete: () => {
        handleFinishWatermarkPause();
      },
      onCinematicTourChange: (active, stageId, stageLabel) => {
        setIsCinematicTourActive(active);
        setCinematicTourStageLabel(stageLabel);
        if (active) {
          setActiveCamera(stageId);
        }
      },
      enableBootIntro: true,
    });
    sceneControllerRef.current = controller;
    setControllerInstance(controller);

    return () => {
      controller.dispose();
      sceneControllerRef.current = null;
      setControllerInstance(null);
      relativisticAudio.dispose();
    };
  }, [
    handleFinishBootIntro,
    handleStartWatermarkDisplay,
    handleSingularitySeedLoaded,
    handleFinishWatermarkPause,
  ]);

  // Initialize & synchronize secondary Three.js WebGL scene when Side-by-Side Compare Mode is active
  useEffect(() => {
    if (!isCompareMode) {
      compareSceneControllerRef.current?.dispose();
      compareSceneControllerRef.current = null;
      window.setTimeout(() => sceneControllerRef.current?.resize(), 30);
      return;
    }

    const mountB = compareCanvasMountRef.current;
    if (!mountB) return;

    const compareCtrl = new BlackHoleSceneController(mountB, compareParams, {
      onFeatureSelect: (feat) => {
        setInspectedFeature(feat);
      },
      onHoverCoordsChange: (coords) => {
        hoverCoordsRef.current = coords;
      },
      onCameraChange: (pos, target) => {
        sceneControllerRef.current?.syncCameraPose(pos, target);
      },
      enableBootIntro: false,
    });
    compareCtrl.updateSettings(settings);
    compareCtrl.expandFromSingularity();
    compareSceneControllerRef.current = compareCtrl;

    // Also ensure primary scene is expanded and resized for side-by-side comparison
    sceneControllerRef.current?.expandFromSingularity();
    window.setTimeout(() => {
      sceneControllerRef.current?.resize();
      compareCtrl.resize();
    }, 30);

    return () => {
      compareCtrl.dispose();
      compareSceneControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompareMode]);

  // Push parameter updates to Three.js controller(s) and Web Audio synthesizer
  useEffect(() => {
    sceneControllerRef.current?.updateParams(params);
    relativisticAudio.updateParameters(params);
  }, [params]);

  useEffect(() => {
    compareSceneControllerRef.current?.updateParams(compareParams);
  }, [compareParams]);

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
  // Refactored to a requestAnimationFrame-based throttle instead of setInterval so telemetry updates never block the main UI thread
  useEffect(() => {
    if (params.timeScale === 0) return;

    let tickCount = 0;
    let rafId = 0;
    let isCancelled = false;
    const telemetryIntervalMs = settings.highPerformanceMode ? 18000 : 9500;
    let lastSampleTimeMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();

    const stepTelemetry = (nowMs: number) => {
      if (isCancelled) return;
      rafId = window.requestAnimationFrame(stepTelemetry);

      if (nowMs - lastSampleTimeMs < telemetryIntervalMs) {
        return;
      }

      const ctrl = sceneControllerRef.current;
      // Yield without blocking the main thread while camera is actively orbiting or dragging
      if (!ctrl || isSingularityCollapsed || isDraggingCameraRef.current || ctrl.isOrbitingCamera()) {
        return;
      }

      lastSampleTimeMs = nowMs;
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
    };

    rafId = window.requestAnimationFrame(stepTelemetry);

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [
    params.timeScale,
    params.objectCategory,
    params.accretionRate,
    params.accretionState,
    params.spin,
    settings.highPerformanceMode,
    isSingularityCollapsed,
    appendLogEvent,
  ]);

  // Push visualizer settings updates to Three.js controller(s)
  useEffect(() => {
    sceneControllerRef.current?.updateSettings(settings);
    compareSceneControllerRef.current?.updateSettings(settings);
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
      } else if (e.key === 'f' || e.key === 'F') {
        setSettings((prev) => ({ ...prev, focusMode: !prev.focusMode }));
      } else if (e.key === 'Escape') {
        handleSetCleanMode(false);
        setSettings((prev) => (prev.focusMode ? { ...prev, focusMode: false } : prev));
      } else if (e.code === 'Space') {
        e.preventDefault();
        // Initial 6s boot and 4s watermark pause are strictly non-skippable
        if (
          sceneControllerRef.current?.isBootIntroRunning() ||
          sceneControllerRef.current?.isWatermarkPauseRunning()
        ) {
          return;
        }
        if (isSingularityCollapsed) {
          haptics.pulseBoom();
          if (params.timeScale === 0) {
            setParams((p) => ({ ...p, timeScale: 1.0 }));
          }
          sceneControllerRef.current?.expandFromSingularity();
          return;
        }
        haptics.medium();
        setParams((p) => ({ ...p, timeScale: p.timeScale === 0 ? 1.0 : 0.0 }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleToggleCleanMode,
    handleSetCleanMode,
    isSingularityCollapsed,
    params.timeScale,
    haptics,
  ]);

  const handleCompleteKerrDeploy = useCallback(
    (run: KerrEngineRunLog) => {
      setActiveKerrTerminalRun(null);
      const found =
        ASTROPHYSICAL_PRESETS.find((p) => p.id === run.presetId) || ASTROPHYSICAL_PRESETS[0];

      if (found.category === 'black_hole') {
        sceneControllerRef.current?.replaySingularityExpansion();
        compareSceneControllerRef.current?.expandFromSingularity();
      } else {
        sceneControllerRef.current?.triggerEventHorizonPulse(found.category);
      }
      relativisticAudio.triggerAccretionShockPulse(isStellarCategory(found.category));
      appendLogEvent(
        'metric',
        `Kerr Engine [v1.4] Apex Metric Core (${run.tierName.toUpperCase()}) converged (${run.totalDurationMs} ms)`,
        `${run.modelCode} · Cost: $${run.costUsd.toFixed(3)} · g_tt = ${run.summaryMetrics.g_tt.toFixed(3)}`
      );
    },
    [appendLogEvent]
  );

  const handleTriggerManualKerrSolve = useCallback(
    (tierOverride?: KerrEngineTierId) => {
      const currentPreset =
        ASTROPHYSICAL_PRESETS.find((p) => p.id === activePresetId) || ASTROPHYSICAL_PRESETS[0];
      const tierToUse = tierOverride || settings.kerrEngineTier || 'ultra';
      const run = generateKerrEngineCalculationRun(currentPreset, params, tierToUse);
      setKerrEngineLogs((prev) => [run, ...prev.slice(0, 49)]);
      setActiveKerrTerminalRun(run);
    },
    [activePresetId, params, settings.kerrEngineTier]
  );

  const handleRecordDiagnosticStressTest = useCallback(
    (run: KerrEngineRunLog, applyParamsToScene?: Partial<BlackHoleParams>) => {
      setKerrEngineLogs((prev) => {
        if (prev.some((existing) => existing.id === run.id)) return prev;
        return [run, ...prev.slice(0, 49)];
      });
      if (applyParamsToScene) {
        setParams((prev) => ({
          ...prev,
          ...applyParamsToScene,
        }));
      }
      appendLogEvent(
        'metric',
        `Diagnostic Stress Test Logged: ${run.targetName}`,
        `a* = ${run.spin.toFixed(3)} · g_tt = ${run.summaryMetrics.g_tt.toFixed(4)} · K = ${run.summaryMetrics.kretschmann.toExponential(2)} M⁻⁴`
      );
    },
    [appendLogEvent]
  );

  // Kerr Relativity Engine is ALWAYS active on Standard, Linear, and Advanced tiers,
  // and can only be bypassed when the Ultra tier is selected and toggled off.
  const isKerrEngineActive =
    (settings.kerrEngineTier || 'ultra') !== 'ultra' || settings.kerrEngineEnabled !== false;

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
        accretionState: found.params.accretionState ?? params.accretionState ?? 'quiescent',
        // Respect preset accretionDisk setting for stars vs black holes; keep ergosphere, anatomy guide, and stars off by default
        layers: {
          ...params.layers,
          accretionDisk: found.category === 'black_hole',
          ...(found.params.layers || {}),
          spacetimeGrid: true,
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
        settings.kerrEngineTier || 'ultra'
      );
      setKerrEngineLogs((prev) => [run, ...prev.slice(0, 29)]);

      appendLogEvent(
        'system',
        `Target locked: ${found.name}`,
        `${found.classification} · Mass: ${found.plainMassExplanation}`
      );

      if (isKerrEngineActive) {
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
    [appendLogEvent, params, isKerrEngineActive, settings.kerrEngineTier]
  );

  const handleSelectComparePreset = useCallback(
    (presetId: string) => {
      const found = ASTROPHYSICAL_PRESETS.find((p) => p.id === presetId);
      if (!found) return;
      setComparePresetId(found.id);
      if (typeof found.params.spin === 'number') {
        setCompareSpinOverride(found.params.spin);
      }

      const nextCompareParams: BlackHoleParams = {
        ...compareParams,
        ...found.params,
        presetId: found.id,
        objectCategory: found.category,
        trueMassSolar: found.trueMassSolar,
        massSolar: found.params.massSolar ?? compareParams.massSolar,
        spin: syncSpinInCompare ? params.spin : found.params.spin ?? compareSpinOverride,
        layers: {
          ...compareParams.layers,
          accretionDisk: found.category === 'black_hole',
          ...(found.params.layers || {}),
        },
      };

      const run = generateKerrEngineCalculationRun(
        found,
        nextCompareParams,
        settings.kerrEngineTier || 'ultra'
      );
      setKerrEngineLogs((prev) => [run, ...prev.slice(0, 29)]);

      appendLogEvent(
        'system',
        `Compare Viewport B locked: ${found.name}`,
        `${found.classification} · Spin a* = ${nextCompareParams.spin.toFixed(3)}`
      );

      if (isKerrEngineActive) {
        setActiveKerrTerminalRun(run);
      } else {
        compareSceneControllerRef.current?.expandFromSingularity();
      }
    },
    [
      appendLogEvent,
      compareParams,
      compareSpinOverride,
      isKerrEngineActive,
      params.spin,
      settings.kerrEngineTier,
      syncSpinInCompare,
    ]
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
      accretionState: currentPreset.params.accretionState ?? 'quiescent',
      layers: {
        ...DEFAULT_PARAMS.layers,
        accretionDisk: currentPreset.category === 'black_hole',
        ...(currentPreset.params.layers || {}),
        spacetimeGrid: true,
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
    compareSceneControllerRef.current?.setCameraPreset(targetCam);
    sceneControllerRef.current?.triggerEventHorizonPulse(currentPreset.category);
    appendLogEvent('system', 'Relativistic parameters reset to baseline', currentPreset.name);
  }, [activePresetId, appendLogEvent]);

  const handleSelectCamera = useCallback((preset: CameraPresetId) => {
    setIsCinematicTourActive(false);
    setActiveCamera(preset);
    sceneControllerRef.current?.setCameraPreset(preset);
    compareSceneControllerRef.current?.setCameraPreset(preset);
  }, []);

  const handleToggleCinematicTour = useCallback(() => {
    const ctrl = sceneControllerRef.current;
    if (!ctrl) return;
    haptics.medium();
    if (params.timeScale === 0) {
      setParams((p) => ({ ...p, timeScale: 1.0 }));
    }
    const nextActive = ctrl.toggleCinematicTour();
    setIsCinematicTourActive(nextActive);
    appendLogEvent(
      'orbital',
      nextActive ? 'Cinematic Tour engaged' : 'Cinematic Tour disengaged',
      nextActive
        ? 'Automated geodesic camera pan: Polar Axis → Equatorial Plane → 45° Horizon Plunge'
        : 'Manual observer orbit control restored'
    );
  }, [appendLogEvent, haptics, params.timeScale]);

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
    compareSceneControllerRef.current?.triggerEventHorizonPulse('black_hole');
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
    compareSceneControllerRef.current?.launchPhotonGeodesic(impactB, 0);
  }, []);

  const handleClearPhotons = useCallback(() => {
    sceneControllerRef.current?.clearGeodesics();
    compareSceneControllerRef.current?.clearGeodesics();
    setLastTrajectory(null);
  }, []);

  const handleExportGeodesicCsv = useCallback(
    (impactBOverride?: number) => {
      haptics.success();
      const bVal = typeof impactBOverride === 'number' ? impactBOverride : 2.4;
      const csvContent = sceneControllerRef.current
        ? sceneControllerRef.current.exportLiveGeodesicCsv(bVal)
        : buildGeodesicTrajectoryCsv(
            [lastTrajectory || computeNullGeodesic(bVal * 1.75, 1.75, params.spin, 0)],
            params,
            1.75
          );

      const rowCount = Math.max(0, csvContent.split('\n').length - 1);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `kerr-geodesic-trajectories-${activePresetId}-${Date.now()}.csv`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);

      appendLogEvent(
        'geodesic',
        'Live Geodesic Trajectory CSV exported',
        `${rowCount} relativistic integration steps · Boyer-Lindquist g_μν & null geodesic telemetry saved`
      );
    },
    [activePresetId, appendLogEvent, haptics, lastTrajectory, params]
  );

  const handleExportEventLogJson = useCallback(() => {
    haptics.success();
    triggerEventLogJsonDownload(
      eventLogs,
      {
        presetId: activePresetId,
        objectCategory: params.objectCategory,
        spin: params.spin,
        accretionRate: params.accretionRate,
        observerInclinationDeg: params.inclinationDeg,
      },
      `kerr-event-log-${activePresetId}-${Date.now()}.json`
    );
    appendLogEvent(
      'system',
      'Simulation event log exported as JSON',
      `${eventLogs.length} telemetry events saved to device`
    );
  }, [
    activePresetId,
    appendLogEvent,
    eventLogs,
    haptics,
    params.accretionRate,
    params.inclinationDeg,
    params.objectCategory,
    params.spin,
  ]);

  const handleToggleAudio = useCallback(() => {
    const enabled = relativisticAudio.toggleAudio(params);
    setAudioEnabled(enabled);
  }, [params]);

  const drawKerrEngineWatermark = useCallback(
    (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
      const s = Math.max(0.85, Math.min(2.2, canvasWidth / 1400));
      const padX = Math.round(28 * s);
      const padY = Math.round(24 * s);

      ctx.save();

      // Subtle optical drop shadow for legibility over both deep space and bright accretion glow (zero background box)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.88)';
      ctx.shadowBlur = 9 * s;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1.5 * s;

      const primaryFont = `700 ${Math.round(12 * s)}px "Chakra Petch", "Plus Jakarta Sans", sans-serif`;
      const versionFont = `600 ${Math.round(10.5 * s)}px "JetBrains Mono", monospace`;
      const subFont = `500 ${Math.round(8.5 * s)}px "JetBrains Mono", monospace`;

      const titleStr = 'KERR RELATIVITY ENGINE';
      const versionStr = 'v1.4';
      const subStr = 'GENERATED BY KERR ENGINE · APEX METRIC CORE';

      ctx.font = primaryFont;
      const titleW = ctx.measureText(titleStr).width;
      ctx.font = versionFont;
      const versionW = ctx.measureText(versionStr).width;
      ctx.font = subFont;
      const subW = ctx.measureText(subStr).width;

      const topRowW = titleW + Math.round(7 * s) + versionW;
      const textBlockW = Math.max(topRowW, subW);
      const emblemRadius = 9.5 * s;
      const dividerGap = Math.round(11 * s);
      const totalWidth = Math.round(emblemRadius * 2) + dividerGap * 2 + textBlockW;

      const startX = Math.max(16, canvasWidth - totalWidth - padX);
      const centerY = Math.max(24, canvasHeight - padY - Math.round(14 * s));

      // 1. Floating 12-ray starburst singularity logo emblem (no enclosing box)
      const cx = startX + emblemRadius;
      const cy = centerY;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(232, 139, 107, 0.92)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 6;
        const rRay = (i % 2 === 0 ? emblemRadius : emblemRadius * 0.82);
        ctx.beginPath();
        ctx.lineWidth = (i % 3 === 0 ? 1.75 : 1.2) * s;
        ctx.moveTo(Math.cos(angle) * -rRay, Math.sin(angle) * -rRay);
        ctx.lineTo(Math.cos(angle) * rRay, Math.sin(angle) * rRay);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 2.6 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#090A0F';
      ctx.fill();
      ctx.lineWidth = 1.5 * s;
      ctx.strokeStyle = 'rgba(246, 184, 158, 0.95)';
      ctx.stroke();
      ctx.restore();

      // 2. Delicate vertical architectural hairline divider
      const dividerX = cx + emblemRadius + dividerGap;
      const dividerHalfH = 11.5 * s;
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, 1 * s);
      ctx.strokeStyle = 'rgba(244, 241, 234, 0.24)';
      ctx.moveTo(dividerX, centerY - dividerHalfH);
      ctx.lineTo(dividerX, centerY + dividerHalfH);
      ctx.stroke();

      // 3. Two-line precision typography stack (unboxed)
      const textX = dividerX + dividerGap;
      const topRowY = centerY - 5.5 * s;
      const bottomRowY = centerY + 7.5 * s;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      ctx.font = primaryFont;
      ctx.fillStyle = 'rgba(247, 244, 238, 0.92)';
      ctx.fillText(titleStr, textX, topRowY);

      ctx.font = versionFont;
      ctx.fillStyle = 'rgba(232, 139, 107, 0.95)';
      ctx.fillText(versionStr, textX + titleW + Math.round(7 * s), topRowY + 0.5 * s);

      ctx.font = subFont;
      ctx.fillStyle = 'rgba(214, 208, 198, 0.68)';
      ctx.fillText(subStr, textX, bottomRowY);

      ctx.restore();
    },
    []
  );

  const handleExportSnapshot = useCallback(async () => {
    if (!sceneControllerRef.current) return;
    haptics.success();
    const timestamp = Date.now();
    const filename = `cosmic-vis-${activePresetId}-${timestamp}.png`;

    // If UI export is enabled, composite the HTML interface over the clean 3D WebGL render
    if (settings.includeUiInExport && appContainerRef.current) {
      try {
        const containerEl = appContainerRef.current;
        const primaryWebglCanvas = sceneControllerRef.current.getCanvas();
        const secondaryWebglCanvas = compareSceneControllerRef.current?.getCanvas();
        const webglDataUrl = sceneControllerRef.current.captureSnapshotDataUrl();
        const uiDataUrl = await toPng(containerEl, {
          backgroundColor: 'transparent',
          width: containerEl.clientWidth,
          height: containerEl.clientHeight,
          style: {
            backgroundColor: 'transparent',
          },
          filter: (node: HTMLElement) => {
            // Only exclude the 3D WebGL viewport canvases (composited below); keep 2D HUD canvases like Overhead Radar
            if (node === primaryWebglCanvas || (secondaryWebglCanvas && node === secondaryWebglCanvas)) {
              return false;
            }
            // Exclude modal dialogs if open during export
            if (node.getAttribute?.('role') === 'dialog') return false;
            return true;
          },
          pixelRatio: window.devicePixelRatio || 1,
          cacheBust: true,
          skipFonts: true,
          fontEmbedCSS: '',
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

        compositeCanvas.width = Math.max(
          bgImg.naturalWidth || bgImg.width,
          uiImg.naturalWidth || uiImg.width
        );
        compositeCanvas.height = Math.max(
          bgImg.naturalHeight || bgImg.height,
          uiImg.naturalHeight || uiImg.height
        );
        const ctx = compositeCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bgImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
          ctx.drawImage(uiImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
          drawKerrEngineWatermark(ctx, compositeCanvas.width, compositeCanvas.height);
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

    // Default clean 3D WebGL render with Kerr Relativity Engine v1.4 watermark
    const dataUrl = sceneControllerRef.current.captureSnapshotDataUrl();
    try {
      const cleanImg = new Image();
      await new Promise<void>((resolve, reject) => {
        cleanImg.onload = () => resolve();
        cleanImg.onerror = reject;
        cleanImg.src = dataUrl;
      });
      const watermarkCanvas = document.createElement('canvas');
      watermarkCanvas.width = cleanImg.naturalWidth || cleanImg.width || 1920;
      watermarkCanvas.height = cleanImg.naturalHeight || cleanImg.height || 1080;
      const wCtx = watermarkCanvas.getContext('2d');
      if (wCtx) {
        wCtx.drawImage(cleanImg, 0, 0, watermarkCanvas.width, watermarkCanvas.height);
        drawKerrEngineWatermark(wCtx, watermarkCanvas.width, watermarkCanvas.height);
        const watermarkedUrl = watermarkCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename;
        link.href = watermarkedUrl;
        link.click();
        return;
      }
    } catch {
      // Fallback if image decode fails
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, [activePresetId, drawKerrEngineWatermark, haptics, settings.includeUiInExport]);

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
        const containerEl = appContainerRef.current;
        const secondaryWebglCanvas = compareSceneControllerRef.current?.getCanvas();
        const domCanvas = await toCanvas(containerEl, {
          backgroundColor: 'transparent',
          width: containerEl.clientWidth,
          height: containerEl.clientHeight,
          style: {
            backgroundColor: 'transparent',
          },
          filter: (node: HTMLElement) => {
            if (node === webglCanvas || (secondaryWebglCanvas && node === secondaryWebglCanvas)) {
              return false;
            }
            if (node.getAttribute?.('role') === 'dialog') return false;
            return true;
          },
          pixelRatio: window.devicePixelRatio || 1,
          cacheBust: false,
          skipFonts: true,
          fontEmbedCSS: '',
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

      // Stamp the Kerr Relativity Engine v1.4 watermark & starburst logo on every video frame
      drawKerrEngineWatermark(ctx, recordCanvas.width, recordCanvas.height);

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

  useEffect(() => {
    const activeUiTheme = settings.uiTheme || 'observatory_gold';
    document.documentElement.setAttribute('data-ui-theme', activeUiTheme);
  }, [settings.uiTheme]);

  const isStar = isStellarCategory(params.objectCategory);
  const isFocusMode = Boolean(settings.focusMode);
  const isBootOrSeedStage =
    (showBootOverlay && !isBootOverlayFading) ||
    isPostBootSequenceActive ||
    showWatermarkOverlay ||
    (!isStar && isSingularityCollapsed);
  const isUiHiddenForBootOrSeed = isCleanMode || isFocusMode || isBootOrSeedStage;
  const t = TRANSLATIONS[settings.language || 'en'] || TRANSLATIONS.en;

  return (
    <div
      ref={appContainerRef}
      data-ui-theme={settings.uiTheme || 'observatory_gold'}
      className="relative w-screen h-screen overflow-hidden bg-black select-none flex flex-col"
    >
      {/* Zone 1-3 Top Navigation Bar (Flows smoothly in with the post-singularity camera pan-in) */}
      {!isCleanMode && !isFocusMode && (
        <div
          className={`relative z-30 transition-all duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isBootOrSeedStage
              ? 'opacity-0 -translate-y-6 pointer-events-none'
              : 'opacity-100'
          }`}
        >
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
            isCompareMode={isCompareMode}
            onToggleCompareMode={() => {
              setIsCompareMode((prev) => {
                const next = !prev;
                appendLogEvent(
                  'system',
                  next
                    ? 'Side-by-Side Compare Mode engaged'
                    : 'Single-viewport visualization restored',
                  next
                    ? `Synchronizing physics parameters between ${activePreset.name} and ${comparePreset.name}`
                    : activePreset.name
                );
                return next;
              });
            }}
            isPerfMonitorVisible={Boolean(settings.showPerformanceMonitor)}
            onTogglePerfMonitor={() =>
              setSettings((prev) => ({
                ...prev,
                showPerformanceMonitor: !prev.showPerformanceMonitor,
              }))
            }
            isPhoneMode={isPhone}
            hapticsEnabled={settings.hapticsEnabled !== false}
            language={settings.language || 'en'}
            uiTheme={settings.uiTheme || 'observatory_gold'}
            onOpenChangelogModal={() => setIsChangelogModalOpen(true)}
            isDevMode={isDevMode}
            onUnlockDevMode={() => {
              setIsDevMode(true);
              setIsSettingsModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Main 3D Viewport Stage (Supports Single View or Side-by-Side Synchronized Compare Mode) */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <div
          className={`absolute inset-0 w-full h-full flex ${
            isCompareMode ? 'flex-col md:flex-row' : 'flex-col'
          }`}
        >
          {/* Primary Viewport A */}
          <div
            data-testid="viewport-primary"
            className={`relative h-full ${
              isCompareMode
                ? `w-full md:w-1/2 border-b md:border-b-0 md:border-r ${
                    settings.uiTheme === 'observatory_gold'
                      ? 'border-zinc-500/40'
                      : settings.uiTheme === 'cryo_quantum'
                      ? 'border-emerald-500/35'
                      : 'border-[#D97757]/40'
                  }`
                : 'w-full'
            }`}
          >
            <div
              ref={canvasMountRef}
              onPointerDown={handleFirstCanvasInteraction}
              onTouchStart={handleFirstCanvasInteraction}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none overscroll-none"
            />
            {isCompareMode && !isCleanMode && (
              <div
                className={`absolute bottom-44 sm:bottom-48 left-3 z-10 pointer-events-none px-2.5 py-1 rounded-lg bg-[#050506]/90 border font-mono text-[10px] ${
                  settings.uiTheme === 'observatory_gold'
                    ? 'border-zinc-400/45 text-zinc-100'
                    : settings.uiTheme === 'cryo_quantum'
                    ? 'border-emerald-500/45 text-emerald-200'
                    : 'border-[#D97757]/50 text-[#F4A688]'
                }`}
              >
                <strong>A: {activePreset.name}</strong> · Spin a* = {params.spin.toFixed(3)} · ISCO ={' '}
                {(metrics.iscoProgradeRg * 0.5).toFixed(2)} Rₛ
              </div>
            )}
          </div>

          {/* Secondary Viewport B (Mounted in Compare Mode) */}
          {isCompareMode && (
            <div
              data-testid="viewport-compare"
              className="relative w-full md:w-1/2 h-full"
            >
              <div
                ref={compareCanvasMountRef}
                onPointerDown={handleFirstCanvasInteraction}
                onTouchStart={handleFirstCanvasInteraction}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none overscroll-none"
              />
              {!isCleanMode && (
                <div
                  className={`absolute bottom-44 sm:bottom-48 right-3 z-10 pointer-events-none px-2.5 py-1 rounded-lg bg-[#050506]/90 border font-mono text-[10px] ${
                    settings.uiTheme === 'observatory_gold'
                      ? 'border-[#D4AF37]/50 text-[#FDE68A]'
                      : settings.uiTheme === 'cryo_quantum'
                      ? 'border-amber-500/45 text-amber-200'
                      : 'border-[#E6D5B8]/45 text-[#F7F4EE]'
                  }`}
                >
                  <strong>B: {comparePreset.name}</strong> · Spin a* ={' '}
                  {compareParams.spin.toFixed(3)} · ISCO ={' '}
                  {(compareMetrics.iscoProgradeRg * 0.5).toFixed(2)} Rₛ
                </div>
              )}
            </div>
          )}
        </div>

        {/* Low-Latency Proximity Warning System (Triggers Subtle Edge Vignette Pulse & Telemetry Alert inside Ergosphere or Photon Sphere) */}
        {!isUiHiddenForBootOrSeed && proximityZone !== 'none' && (
          <>
            {/* Subtle Screen-Edge Radial Vignette Pulse */}
            <div
              data-testid="proximity-warning-vignette"
              className="pointer-events-none absolute inset-0 z-10 proximity-vignette-active transition-opacity duration-300"
              style={{
                background:
                  settings.uiTheme === 'cryo_quantum'
                    ? proximityZone === 'photon_sphere'
                      ? 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 56%, rgba(16, 185, 129, 0.16) 85%, rgba(52, 211, 153, 0.32) 100%)'
                      : 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(16, 185, 129, 0.1) 88%, rgba(52, 211, 153, 0.22) 100%)'
                    : settings.uiTheme === 'kerr_claude'
                    ? proximityZone === 'photon_sphere'
                      ? 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 56%, rgba(217, 119, 87, 0.16) 85%, rgba(217, 119, 87, 0.34) 100%)'
                      : 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(217, 119, 87, 0.1) 88%, rgba(217, 119, 87, 0.24) 100%)'
                    : proximityZone === 'photon_sphere'
                    ? 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 56%, rgba(212, 175, 55, 0.16) 85%, rgba(244, 244, 245, 0.28) 100%)'
                    : 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 62%, rgba(212, 175, 55, 0.1) 88%, rgba(244, 244, 245, 0.2) 100%)',
              }}
            />

            {/* Academic Telemetry Proximity Alert Pill */}
            <div
              data-testid="proximity-warning-alert"
              role="status"
              aria-live="polite"
              className={`pointer-events-none absolute ${
                isCompareMode
                  ? 'bottom-44 sm:bottom-48'
                  : params.timeScale === 0
                  ? 'top-14'
                  : 'top-3'
              } left-1/2 -translate-x-1/2 z-25 flex flex-col items-center gap-0.5 px-3.5 py-1.5 rounded-xl border backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.94)] font-mono transition-all ${
                proximityBurst ? 'proximity-banner-burst' : ''
              } ${
                settings.uiTheme === 'cryo_quantum'
                  ? 'bg-[#030504]/96 border-emerald-400/65 text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : settings.uiTheme === 'kerr_claude'
                  ? 'bg-[#080605]/96 border-[#D97757]/65 text-[#F7F4EE] shadow-[0_0_20px_rgba(217,119,87,0.22)]'
                  : 'bg-[#050506]/96 border-[#D4AF37]/65 text-zinc-100 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
              }`}
            >
              <div className="flex items-center gap-2 text-[10px] sm:text-[10.5px] font-bold tracking-wider uppercase whitespace-nowrap">
                <span
                  className={`w-2 h-2 rounded-full animate-ping shrink-0 ${
                    settings.uiTheme === 'cryo_quantum'
                      ? 'bg-emerald-400'
                      : settings.uiTheme === 'kerr_claude'
                      ? 'bg-[#D97757]'
                      : 'bg-[#D4AF37]'
                  }`}
                />
                <span>
                  {proximityZone === 'photon_sphere'
                    ? 'PHOTON SPHERE CAPTURE ZONE · r ≤ r_ph'
                    : 'ERGOSPHERE BOUNDARY · g_tt ≥ 0'}
                </span>
                <span className="hidden sm:inline text-[9px] font-normal opacity-80">
                  {proximityZone === 'photon_sphere'
                    ? '[Unstable Null Geodesic Orbit]'
                    : '[Lense–Thirring Frame Dragging]'}
                </span>
              </div>
              <span
                ref={proximityReadoutDomRef}
                className="text-[9px] text-neutral-300 tabular-nums tracking-wide"
              >
                r = {cameraCoordsRef.current.r.toFixed(2)} Rₛ · θ ={' '}
                {cameraCoordsRef.current.theta.toFixed(0)}°
              </span>
            </div>
          </>
        )}

        {/* Side-by-Side Compare Mode Control Header & Spin Contrast HUD */}
        {!isCleanMode && isCompareMode && (
          <CompareModeOverlay
            presetAId={activePresetId}
            presetBId={comparePresetId}
            paramsA={params}
            paramsB={compareParams}
            metricsA={metrics}
            metricsB={compareMetrics}
            syncSpinInCompare={syncSpinInCompare}
            onToggleSyncSpin={() => setSyncSpinInCompare((prev) => !prev)}
            onSelectPresetA={handleSelectPreset}
            onSelectPresetB={handleSelectComparePreset}
            onChangeSpinA={(nextSpin) => setParams((p) => ({ ...p, spin: nextSpin }))}
            onChangeSpinB={(nextSpin) => {
              setSyncSpinInCompare(false);
              setCompareSpinOverride(nextSpin);
            }}
            onApplySpinContrastPreset={(spinA, spinB) => {
              setSyncSpinInCompare(false);
              setParams((p) => ({ ...p, spin: spinA }));
              setCompareSpinOverride(spinB);
              appendLogEvent(
                'metric',
                'Kerr Spin Contrast Preset applied',
                `Viewport A: a* = ${spinA.toFixed(3)} vs Viewport B: a* = ${spinB.toFixed(3)}`
              );
            }}
            onSwapPresets={() => {
              const prevA = activePresetId;
              const prevSpinA = params.spin;
              const prevSpinB = compareParams.spin;
              setActivePresetId(comparePresetId);
              setComparePresetId(prevA);
              setParams((p) => ({ ...p, spin: prevSpinB }));
              setCompareSpinOverride(prevSpinA);
            }}
            onCloseCompare={() => setIsCompareMode(false)}
            isPhoneMode={isPhone}
            uiTheme={settings.uiTheme || 'observatory_gold'}
          />
        )}

        {/* High-Visibility Simulation Paused Status Pill */}
        {params.timeScale === 0 && (
          <div className="hud-panel absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#050811]/95 border border-amber-500/60 text-amber-300 font-mono text-[11px] font-semibold shadow-[0_0_25px_rgba(245,158,11,0.3)]">
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
        {!isUiHiddenForBootOrSeed && !isCompareMode && (
          <BlackHoleAnatomyOverlay
            sceneController={controllerInstance || sceneControllerRef.current}
            isVisible={isAnatomyVisible}
            onToggleVisible={handleToggleAnatomyVisible}
            onSelectPreset={handleSelectPreset}
            isDockCollapsed={isDockCollapsed}
          />
        )}

        {/* Left HUD Column: Target Specification Badge + Overhead Radar + Event Log (Flows smoothly in with camera pan-in) */}
        {!isCleanMode && !isFocusMode && !isCompareMode && (settings.showLeftHud || settings.showOverheadMap || settings.showTimeDilation || Boolean(settings.showEventLog)) && (
          <div
            className={`hud-panel absolute top-2 sm:top-2.5 left-2 sm:left-3.5 z-10 flex flex-col items-start gap-1.5 sm:gap-2 pointer-events-none transition-all duration-[1850ms] delay-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isPhone ? 'w-[238px]' : 'w-[268px]'
            } ${
              isBootOrSeedStage
                ? 'opacity-0 -translate-x-8'
                : 'opacity-100'
            }`}
          >
            {/* Target Spec Badge */}
            {settings.showLeftHud && (
              <motion.div
                initial={{ opacity: 0, x: -12, y: 6 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className={`hud-panel ${isBootOrSeedStage ? 'pointer-events-none' : 'pointer-events-auto'} bg-[#050811]/95 border border-slate-800/80 rounded-xl ${isPhone ? 'px-2 py-1.5' : 'p-2.5'} shadow-xl transition-all w-full`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider border shrink-0 ${
                      ARCHETYPE_DEFINITIONS[activePreset.archetype].badgeBg
                    }`}
                  >
                    {activePreset.classification}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 truncate">
                    {activePreset.designation}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-1.5 mt-0.5">
                  <h1 className={`font-display ${isPhone ? 'text-sm' : 'text-base sm:text-lg'} font-bold text-slate-100 tracking-tight flex items-center gap-1 whitespace-nowrap`}>
                    <span>{activePreset.name}</span>
                    {!isPhone && activePreset.id === 'ton618' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-normal flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        Titan
                      </span>
                    )}
                    {!isPhone && params.objectCategory === 'star' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-normal flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 text-emerald-400" />
                        Remnant
                      </span>
                    )}
                    {!isPhone && params.objectCategory === 'luminous_star' && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 font-mono font-normal flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                        Star
                      </span>
                    )}
                  </h1>
                  <span className={`font-mono text-amber-300 font-bold ${isPhone ? 'text-[10px]' : 'text-[11px]'} shrink-0 whitespace-nowrap`}>
                    {activePreset.plainMassExplanation}
                  </span>
                </div>

                {!isPhone && (
                  <p className="text-[10.5px] text-slate-300 leading-snug mt-0.5">
                    {activePreset.solarEquivalence}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-slate-400 pt-1 mt-1 border-t border-slate-800/60">
                  <span className="truncate">{params.objectCategory === 'luminous_star' ? t.photosphereLabel : isStar ? t.crustLabel : t.horizonLabel} <strong className="text-slate-200">{activePreset.horizonDiameterKmDisplay}</strong></span>
                  <span className="shrink-0">a* <strong className="text-cyan-300">{params.spin.toFixed(3)}</strong></span>
                </div>

                {/* Direct DOM-Ref Observer Spherical Readout (Zero React re-renders during OrbitControls drag) */}
                <div
                  ref={observerReadoutRef}
                  data-testid="observer-readout"
                  className={`${isPhone ? 'hidden sm:block' : ''} mt-1 pt-1 border-t border-slate-800/50 text-[9px] font-mono text-slate-300 tabular-nums truncate`}
                >
                  Observer: r = 16.5 Rₛ | θ = 71° | φ = 96°
                </div>

                {/* Quick Link to Real Scale Explorer if TON 618 is selected */}
                {activePreset.id === 'ton618' && !isPhone && (
                  <div className="mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between gap-1.5">
                    <span className="text-[9px] text-amber-400 font-mono whitespace-nowrap">True: 66B M☉ · 2,600 AU</span>
                    <button
                      type="button"
                      onClick={() => setIsCosmicScaleModalOpen(true)}
                      className="text-[9px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Maximize2 className="w-2.5 h-2.5 shrink-0" />
                      <span>{t.compareRealSize}</span>
                    </button>
                  </div>
                )}

                {settings.showCursorTelemetry && (
                  <div
                    ref={cursorReadoutRef}
                    style={{ display: 'none' }}
                    className="mt-1 pt-1 border-t border-slate-800/50 text-[9.5px] font-mono text-cyan-300/90 tabular-nums truncate"
                  />
                )}
              </motion.div>
            )}

            {/* 2D Overhead Radar Widget: Replaces Time Dilation UI in Left HUD Column */}
            {settings.showOverheadMap && (
              <motion.div
                initial={{ opacity: 0, x: -12, y: 6 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.34, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto"
              >
                <OverheadMapWidget
                  sceneController={controllerInstance || sceneControllerRef.current}
                  cameraCoordsRef={cameraCoordsRef}
                  highPerformanceMode={Boolean(settings.highPerformanceMode)}
                  onSetProbeRadius={(newRadius) =>
                    setParams((prev) => ({ ...prev, probeRadiusRs: newRadius }))
                  }
                />
              </motion.div>
            )}

            {/* Optional Local Time Dilation Display (Toggled in Settings, off initially) */}
            {settings.showTimeDilation && (
              <motion.div
                initial={{ opacity: 0, x: -12, y: 6 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.34, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto"
              >
                <TimeDilationDisplay
                  probeRadiusRs={params.probeRadiusRs}
                  spin={params.spin}
                  timeScale={params.timeScale}
                  initialCollapsed={false}
                  onSetProbeRadius={(newRadius) =>
                    setParams((prev) => ({ ...prev, probeRadiusRs: newRadius }))
                  }
                />
              </motion.div>
            )}

            {/* Real-Time Astrophysical Event Log Stacked in Left HUD Column */}
            {Boolean(settings.showEventLog) && (
              <EventLogOverlay
                events={eventLogs}
                onClearEvents={() => setEventLogs([])}
                onExportEvents={handleExportEventLogJson}
                isPaused={params.timeScale === 0}
                isDockCollapsed={isDockCollapsed}
                isPhoneMode={isPhone}
                language={settings.language || 'en'}
                inlineStack={true}
              />
            )}
          </div>
        )}

        {/* Interactive Click-to-Inspect Feature Popover (Bottom-Right when active) */}
        {!isCleanMode && inspectedFeature && (
          <motion.div
            key={inspectedFeature.title}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="hud-panel absolute bottom-24 right-6 z-20 w-80 bg-[#080c16]/95 border border-slate-800 rounded-lg p-3.5 shadow-xl pointer-events-auto"
          >
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
          </motion.div>
        )}

        {/* Interactive Singularity Seed Prompt (Simple top-centered text prompt without box outline) */}
        {hasCompletedStartupSequence && !isCleanMode && !showBootOverlay && !isStar && isSingularityCollapsed && (
          <div className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex justify-center select-none">
            <button
              type="button"
              data-testid="singularity-seed-expand-button"
              onClick={() => {
                haptics.pulseBoom();
                if (params.timeScale === 0) {
                  setParams((p) => ({ ...p, timeScale: 1.0 }));
                }
                sceneControllerRef.current?.expandFromSingularity();
              }}
              className="flex items-center gap-2 px-3 py-1 bg-transparent border-0 outline-none shadow-none text-neutral-300 hover:text-white font-mono text-[11px] sm:text-xs tracking-[0.12em] uppercase transition-opacity opacity-85 hover:opacity-100 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse shrink-0" />
              <span>{t.singularitySeedPrompt}</span>
            </button>
          </div>
        )}

        {/* Clean Kerr Engine Initialization Overlay (Centered during initial boot sequence, with Watermark Logo Icon) */}
        {showBootOverlay && (
          <div
            data-testid="cinematic-boot-overlay"
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none select-none transition-opacity duration-500 ${
              isBootOverlayFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="pointer-events-none px-6 py-4 rounded-xl bg-[#050507]/95 border border-zinc-800/90 backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,0.98)] font-mono text-xs text-left space-y-2.5 max-w-sm w-full">
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  {/* 12-Ray Starburst Singularity Emblem (Same as Watermark Logo) */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="-24 -24 48 48"
                    className="shrink-0 overflow-visible"
                    aria-hidden="true"
                  >
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const angle = (i * Math.PI) / 6;
                      const rRay = i % 2 === 0 ? 18 : 14.5;
                      const x1 = Math.cos(angle) * -rRay;
                      const y1 = Math.sin(angle) * -rRay;
                      const x2 = Math.cos(angle) * rRay;
                      const y2 = Math.sin(angle) * rRay;
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="rgba(232, 139, 107, 0.94)"
                          strokeWidth={i % 3 === 0 ? '2.4' : '1.6'}
                          strokeLinecap="round"
                        />
                      );
                    })}
                    <circle
                      cx="0"
                      cy="0"
                      r="4.6"
                      fill="#090A0F"
                      stroke="rgba(246, 184, 158, 0.96)"
                      strokeWidth="2.1"
                    />
                  </svg>
                  <span className="font-display text-[11px] font-bold text-zinc-100 uppercase tracking-widest">
                    Kerr Engine
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 text-[9.5px] text-zinc-300 font-bold">
                  v1.4
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-zinc-100 font-semibold tracking-wider text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 animate-pulse shrink-0" />
                <span>INITIALIZING KERR ENGINE...</span>
              </div>

              <div className="text-[10px] text-zinc-400 tracking-wider pl-4">
                Loading Apex Metric Core &amp; Geodesic Solver
              </div>

              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div className="h-full w-full bg-zinc-200 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Post-Boot Kerr Relativity Engine Watermark Overlay (Displayed 1.5s after boot in the center of the screen) */}
        {showWatermarkOverlay && (
          <div
            data-testid="boot-watermark-overlay"
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none select-none transition-opacity duration-500 ease-out ${
              isWatermarkOverlayFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-4 px-6 py-4 drop-shadow-[0_6px_28px_rgba(0,0,0,0.95)]">
              {/* 12-Ray Starburst Singularity Emblem */}
              <svg
                width="44"
                height="44"
                viewBox="-24 -24 48 48"
                className="shrink-0 overflow-visible"
                aria-hidden="true"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const angle = (i * Math.PI) / 6;
                  const rRay = i % 2 === 0 ? 18 : 14.5;
                  const x1 = Math.cos(angle) * -rRay;
                  const y1 = Math.sin(angle) * -rRay;
                  const x2 = Math.cos(angle) * rRay;
                  const y2 = Math.sin(angle) * rRay;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(232, 139, 107, 0.94)"
                      strokeWidth={i % 3 === 0 ? '2.4' : '1.6'}
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle
                  cx="0"
                  cy="0"
                  r="4.6"
                  fill="#090A0F"
                  stroke="rgba(246, 184, 158, 0.96)"
                  strokeWidth="2.1"
                />
              </svg>

              {/* Delicate Vertical Architectural Hairline Divider */}
              <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#E88B6B]/60 to-transparent" />

              {/* Kerr Relativity Engine v1.4 Signature Typography */}
              <div className="flex flex-col text-left">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-display text-lg sm:text-xl font-bold tracking-[0.12em] text-zinc-100 uppercase">
                    KERR RELATIVITY ENGINE
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-semibold text-[#E88B6B]">
                    v1.4
                  </span>
                </div>
                <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.2em] text-zinc-400 uppercase mt-0.5">
                  GENERATED BY KERR ENGINE · APEX METRIC CORE
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Lightweight Non-Blocking First-Time Visitor Interaction Cue (Positioned cleanly above the Control Dock handle tabs) */}
        {!isUiHiddenForBootOrSeed && showInteractionHint && (
          <div
            data-testid="floating-interaction-hint"
            className={`interaction-hint-pill ${
              isInteractionHintFading ? 'is-fading-out' : 'opacity-100'
            } absolute ${
              isDockCollapsed ? 'bottom-14 sm:bottom-16' : 'bottom-56 sm:bottom-60'
            } left-1/2 -translate-x-1/2 z-10 pointer-events-none px-3.5 py-1.5 rounded-full bg-[#050811]/80 border border-slate-700/70 text-slate-200/90 font-mono text-[11px] tracking-wide shadow-[0_4px_20px_rgba(0,0,0,0.65)] whitespace-nowrap select-none`}
          >
            {isPhone ? 'Touch to Rotate • Pinch to Zoom' : 'Drag to Orbit • Scroll to Zoom'}
          </div>
        )}

        {/* Clean Mode Floating Restore UI & Export Snapshot Buttons (Unobtrusive Bottom-Right Corner) */}
        {isCleanMode && (
          <div className="hud-panel absolute bottom-5 right-5 z-30 pointer-events-auto flex items-center gap-2">
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
        {!isUiHiddenForBootOrSeed && Boolean(settings.showMetricTelemetry) && (
          <MetricTelemetryOverlay
            params={params}
            metrics={metrics}
            sceneController={controllerInstance || sceneControllerRef.current}
            hoverCoordsRef={hoverCoordsRef}
            highPerformanceMode={Boolean(settings.highPerformanceMode)}
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

        {/* Real-Time Three.js Performance Monitor & GPU Shader Bottleneck Diagnostics Overlay */}
        {!isUiHiddenForBootOrSeed && Boolean(settings.showPerformanceMonitor) && (
          <PerformanceMonitorOverlay
            sceneController={controllerInstance || sceneControllerRef.current}
            params={params}
            settings={settings}
            onChangeParams={setParams}
            onUpdateSettings={setSettings}
            onClose={() =>
              setSettings((prev) => ({ ...prev, showPerformanceMonitor: false }))
            }
            isPhoneMode={isPhone}
            offsetTopForMetricOverlay={Boolean(settings.showMetricTelemetry)}
          />
        )}


        {/* Unified Collapsible Bottom Control Dock (Flows smoothly in with the post-singularity camera pan-in) */}
        {!isCleanMode && !isFocusMode && (
          <div
            className={`fixed inset-0 z-20 pointer-events-none transition-all duration-[1900ms] delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isBootOrSeedStage
                ? 'opacity-0 translate-y-10 [&_.hud-dock]:!pointer-events-none'
                : 'opacity-100'
            }`}
          >
            <ControlDock
              params={params}
              metrics={metrics}
              activePresetId={activePresetId}
              isCollapsed={isDockCollapsed}
              onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
              onToggleCleanMode={handleToggleCleanMode}
              isFocusMode={isFocusMode}
              onToggleFocusMode={() =>
                setSettings((prev) => ({ ...prev, focusMode: !prev.focusMode }))
              }
              onChangeParams={setParams}
              onSelectPreset={handleSelectPreset}
              onResetParams={handleResetParams}
              onSelectCamera={handleSelectCamera}
              activeCamera={activeCamera}
              isCinematicTourActive={isCinematicTourActive}
              cinematicTourStageLabel={cinematicTourStageLabel}
              onToggleCinematicTour={handleToggleCinematicTour}
              onLaunchPhoton={handleLaunchPhoton}
              onClearPhotons={handleClearPhotons}
              onExportGeodesicCsv={handleExportGeodesicCsv}
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
          </div>
        )}

        {/* Focus Mode Small Unobtrusive Status Line at the Bottom */}
        {!isCleanMode && isFocusMode && !isBootOrSeedStage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            data-testid="focus-mode-status-line"
            className="hud-panel absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 rounded-full bg-[#080605]/88 backdrop-blur-md border border-[#D97757]/35 text-zinc-300 font-mono text-[10px] sm:text-[11px] shadow-[0_8px_30px_rgba(0,0,0,0.85)] whitespace-nowrap max-w-[95vw]"
          >
            <svg
              width="14"
              height="14"
              viewBox="-24 -24 48 48"
              className="shrink-0 overflow-visible"
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (i * Math.PI) / 6;
                const rRay = i % 2 === 0 ? 18 : 14.5;
                return (
                  <line
                    key={i}
                    x1={Math.cos(angle) * -rRay}
                    y1={Math.sin(angle) * -rRay}
                    x2={Math.cos(angle) * rRay}
                    y2={Math.sin(angle) * rRay}
                    stroke="rgba(232, 139, 107, 0.94)"
                    strokeWidth={i % 3 === 0 ? '2.4' : '1.6'}
                    strokeLinecap="round"
                  />
                );
              })}
              <circle
                cx="0"
                cy="0"
                r="4.6"
                fill="#090A0F"
                stroke="rgba(246, 184, 158, 0.96)"
                strokeWidth="2.1"
              />
            </svg>
            <span className="font-semibold text-[#F7F4EE] truncate">
              {activePreset.name}
            </span>
            <span className="text-zinc-600 hidden sm:inline">·</span>
            <span className="text-[#F4A688] hidden sm:inline tabular-nums">
              {activePreset.plainMassExplanation}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-300 tabular-nums">
              a* = <strong className="text-[#F7F4EE]">{params.spin.toFixed(3)}</strong>
            </span>
            <span className="text-zinc-600 hidden md:inline">·</span>
            <span className="text-zinc-400 hidden md:inline tabular-nums">
              r₊ = {(metrics.eventHorizonRg * 0.5).toFixed(2)} Rₛ · ISCO = {(metrics.iscoProgradeRg * 0.5).toFixed(2)} Rₛ
            </span>
            <div className="h-3 w-px bg-zinc-800 mx-0.5" />
            <button
              type="button"
              data-testid="focus-mode-open-controls-btn"
              onClick={() => {
                haptics.light();
                setSettings((prev) => ({ ...prev, focusMode: false }));
                setIsDockCollapsed(false);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/70 transition-colors cursor-pointer"
              title="Open Controls Dock"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>Controls</span>
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.light();
                setIsSettingsModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/70 transition-colors cursor-pointer"
              title="Open Settings"
            >
              <Settings className="w-3 h-3" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              type="button"
              data-testid="exit-focus-mode-btn"
              onClick={() => {
                haptics.light();
                setSettings((prev) => ({ ...prev, focusMode: false }));
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#201815] hover:bg-[#2c201c] text-[#F4A688] border border-[#D97757]/60 transition-colors cursor-pointer"
              title="Exit Focus Mode (F / Esc)"
            >
              <Eye className="w-3 h-3" />
              <span>Exit Focus</span>
            </button>
          </motion.div>
        )}
      </main>

      {/* Relativistic Metrics & Effective Potential Modal */}
      <PhysicsModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
        params={params}
        metrics={metrics}
        onExportGeodesicCsv={() => handleExportGeodesicCsv()}
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
        onExportGeodesicCsv={() => handleExportGeodesicCsv()}
        onExportEventLogJson={handleExportEventLogJson}
        eventLogCount={eventLogs.length}
        activeParams={params}
        onRecordDiagnosticStressTest={handleRecordDiagnosticStressTest}
        isDevMode={isDevMode}
        onLockDevSession={() => setIsDevMode(false)}
      />

      {/* Real-Time Kerr Relativity Engine Pre-Load Terminal Modal */}
      <KerrRelativityEngineModal
        activeRun={activeKerrTerminalRun}
        onCompleteDeploy={handleCompleteKerrDeploy}
        onOpenSettingsLog={() => {
          setIsSettingsModalOpen(true);
          setIsKerrLogModalOpen(true);
        }}
        uiTheme={settings.uiTheme || 'observatory_gold'}
      />

      {/* Full-Screen Kerr Relativity Engine Calculation & Billing Log Modal */}
      <KerrEngineLogViewerModal
        isOpen={isKerrLogModalOpen}
        onClose={() => setIsKerrLogModalOpen(false)}
        logs={kerrEngineLogs}
        activeTierId={settings.kerrEngineTier || 'ultra'}
        onSelectTier={(nextTier) =>
          setSettings((prev) => ({
            ...prev,
            kerrEngineEnabled: nextTier === 'ultra' ? prev.kerrEngineEnabled : true,
            kerrEngineTier: nextTier,
          }))
        }
        onRerunCalculation={() => handleTriggerManualKerrSolve()}
      />

      {/* Minimalist Terminal-Style Release Changelog Modal (Triggered via TopBar v1.4 Badge) */}
      <ChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
        uiTheme={settings.uiTheme || 'observatory_gold'}
      />
    </div>
  );
}
