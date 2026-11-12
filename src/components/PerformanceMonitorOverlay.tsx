import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Sliders,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  BlackHoleParams,
  isStellarCategory,
} from '../physics/gravitationalPhysics';
import {
  BlackHoleSceneController,
  ScenePerformanceTelemetry,
  ShaderLayerDiagnosticItem,
  VisualizerSettings,
} from '../scene/BlackHoleScene';

interface PerformanceMonitorOverlayProps {
  sceneController: BlackHoleSceneController | null;
  params: BlackHoleParams;
  settings: VisualizerSettings;
  onChangeParams: React.Dispatch<React.SetStateAction<BlackHoleParams>>;
  onUpdateSettings: React.Dispatch<React.SetStateAction<VisualizerSettings>>;
  onClose: () => void;
  isPhoneMode?: boolean;
  offsetTopForMetricOverlay?: boolean;
}

const FALLBACK_TELEMETRY: ScenePerformanceTelemetry = {
  frameTimeMs: 16.4,
  avgFrameTimeMs: 16.4,
  minFrameTimeMs: 14.2,
  maxFrameTimeMs: 18.8,
  p99FrameTimeMs: 18.5,
  fps: 60,
  frameTimeHistory: Array.from({ length: 30 }, () => 16.4),
  drawCalls: 14,
  triangles: 48200,
  points: 0,
  lines: 1200,
  renderPasses: 1,
  frameNumber: 1,
  geometries: 18,
  textures: 6,
  shaderPrograms: 9,
  estimatedGpuMemoryMb: 34.2,
  jsHeapUsedMb: null,
  jsHeapTotalMb: null,
  jsHeapLimitMb: null,
  rendererBackend: 'WebGL2 Hardware',
  gpuRendererName: 'WebGL Hardware Rasterizer',
  pixelRatio: 1,
  canvasWidth: 1920,
  canvasHeight: 1080,
  bottleneckStatus: 'OPTIMAL',
  primaryBottleneckLayer: 'Gravitational Lensing Raymarcher',
  shaderNanGuardActive: true,
  layerDiagnostics: [],
  gpuCache: {
    cachedTextures: 1,
    cachedGeometries: 14,
    precompiledShaders: 12,
    cacheHits: 24,
    cacheMisses: 0,
    hitRatePct: 100,
    presetTransitionsCached: 0,
    lastPresetSwitchMs: 0.08,
  },
};

export const PerformanceMonitorOverlay: React.FC<PerformanceMonitorOverlayProps> = React.memo(({
  sceneController,
  params,
  settings,
  onChangeParams,
  onUpdateSettings,
  onClose,
  isPhoneMode = false,
  offsetTopForMetricOverlay = false,
}) => {
  const [telemetry, setTelemetry] = useState<ScenePerformanceTelemetry>(() =>
    sceneController ? sceneController.getPerformanceTelemetry() : FALLBACK_TELEMETRY
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showLayerDiagnostics, setShowLayerDiagnostics] = useState<boolean>(false);

  useEffect(() => {
    if (!sceneController || isCollapsed) return;
    setTelemetry(sceneController.getPerformanceTelemetry());
    let lastPerfUpdateMs = performance.now();
    let rafId = 0;
    let isCancelled = false;

    const FRAME_INTERVAL_MS = Math.max(100, settings.highPerformanceMode ? 350 : 150);
    const tickPerf = (now: number) => {
      if (isCancelled) return;
      rafId = window.requestAnimationFrame(tickPerf);
      if (now - lastPerfUpdateMs < FRAME_INTERVAL_MS) return;
      if (sceneController.isOrbitingCamera()) return;
      lastPerfUpdateMs = now;
      setTelemetry(sceneController.getPerformanceTelemetry());
    };
    rafId = window.requestAnimationFrame(tickPerf);

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [sceneController, settings.highPerformanceMode, settings.lowResolutionRender, isCollapsed]);

  const isStar = isStellarCategory(params.objectCategory);

  const handleToggleShaderLayer = (layerId: ShaderLayerDiagnosticItem['id']) => {
    switch (layerId) {
      case 'gravitationalLensing':
        onChangeParams((prev) => ({
          ...prev,
          gravitationalLensing: !prev.gravitationalLensing,
        }));
        break;
      case 'accretionDisk':
        if (isStar) {
          onChangeParams((prev) => ({
            ...prev,
            layers: {
              ...prev.layers,
              pulsarBeams: !prev.layers.pulsarBeams,
            },
          }));
        } else {
          onChangeParams((prev) => ({
            ...prev,
            layers: {
              ...prev.layers,
              accretionDisk: !prev.layers.accretionDisk,
            },
          }));
        }
        break;
      case 'cameraLensFlare':
        onUpdateSettings((prev) => ({
          ...prev,
          lensFlareIntensity: (prev.lensFlareIntensity ?? 1.0) > 0.01 ? 0.0 : 1.0,
        }));
        break;
      case 'postProcessing':
        onUpdateSettings((prev) => {
          const anyPost = prev.motionBlurEnabled || prev.timeLapseEnabled;
          return {
            ...prev,
            motionBlurEnabled: !anyPost,
            timeLapseEnabled: false,
          };
        });
        break;
      case 'spacetimeGrid':
        onChangeParams((prev) => ({
          ...prev,
          layers: {
            ...prev.layers,
            spacetimeGrid: !prev.layers.spacetimeGrid,
          },
        }));
        break;
      case 'starfield':
        onChangeParams((prev) => ({
          ...prev,
          backgroundTheme:
            prev.backgroundTheme === 'pure_black' ? 'galactic_core' : 'pure_black',
        }));
        break;
      case 'binaryStream':
        onChangeParams((prev) => ({
          ...prev,
          systemCategory: prev.systemCategory === 'binary' ? 'isolated' : 'binary',
        }));
        break;
      case 'ergosphere':
        onChangeParams((prev) => ({
          ...prev,
          layers: {
            ...prev.layers,
            ergosphereCage: !prev.layers.ergosphereCage,
          },
        }));
        break;
    }
  };

  const isSafeDiagnosticMode =
    !params.gravitationalLensing &&
    (settings.lensFlareIntensity ?? 1.0) <= 0.01 &&
    !settings.motionBlurEnabled &&
    !settings.timeLapseEnabled;

  const handleToggleSafeDiagnosticMode = () => {
    if (isSafeDiagnosticMode) {
      // Restore full relativistic shaders while keeping WebGL2 Hardware & Volumetric Raymarched active
      onChangeParams((prev) => ({
        ...prev,
        gravitationalLensing: true,
        layers: {
          ...prev.layers,
          accretionDisk: true,
          spacetimeGrid: true,
        },
      }));
      onUpdateSettings((prev) => ({
        ...prev,
        accretionDiskStyle: 'raymarched',
        lensFlareIntensity: 1.0,
        motionBlurEnabled: true,
      }));
    } else {
      // Isolate core geometry without downgrading WebGL2 Hardware or Volumetric Raymarched mode
      onChangeParams((prev) => ({
        ...prev,
        gravitationalLensing: false,
      }));
      onUpdateSettings((prev) => ({
        ...prev,
        accretionDiskStyle: 'raymarched',
        lensFlareIntensity: 0.0,
        motionBlurEnabled: false,
        timeLapseEnabled: false,
      }));
    }
  };

  // Build SVG polyline points for the 60-sample frame time history
  const sparkWidth = 280;
  const sparkHeight = 42;
  const history =
    telemetry.frameTimeHistory.length > 1
      ? telemetry.frameTimeHistory
      : [telemetry.frameTimeMs, telemetry.frameTimeMs];
  const maxGraphMs = Math.max(36, ...history);
  const sparkPoints = history
    .map((ms, idx) => {
      const x = (idx / Math.max(1, history.length - 1)) * sparkWidth;
      const y =
        sparkHeight -
        Math.min(1, Math.max(0, ms / maxGraphMs)) * (sparkHeight - 6) -
        3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const y60Fps =
    sparkHeight - (16.67 / maxGraphMs) * (sparkHeight - 6) - 3;
  const y30Fps =
    sparkHeight - (33.33 / maxGraphMs) * (sparkHeight - 6) - 3;

  const statusBadgeColor =
    telemetry.bottleneckStatus === 'BOTTLENECK'
      ? 'border-rose-500/50 bg-rose-950/70 text-rose-300'
      : telemetry.bottleneckStatus === 'ELEVATED'
      ? 'border-amber-500/50 bg-amber-950/70 text-amber-300'
      : 'border-emerald-500/50 bg-emerald-950/70 text-emerald-300';

  const frameTimeColor =
    telemetry.avgFrameTimeMs > 28
      ? 'text-rose-400'
      : telemetry.avgFrameTimeMs > 18.5
      ? 'text-amber-300'
      : 'text-emerald-300';

  const formatCompactCount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <aside
      data-testid="performance-monitor-overlay"
      aria-label="Performance Monitor"
      className={`hud-panel absolute ${
        offsetTopForMetricOverlay ? 'top-2 sm:top-3 right-2 sm:right-[364px]' : 'top-2 sm:top-3 right-2 sm:right-4'
      } z-20 pointer-events-auto transition-all ${
        isPhoneMode ? 'w-[252px]' : 'w-[276px]'
      } bg-[#050811]/92 backdrop-blur-md border border-slate-800/90 rounded-xl shadow-2xl overflow-hidden text-slate-100`}
    >
      {/* Clean Header Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#080d1a] border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-100">
            Performance
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold tabular-nums border ${statusBadgeColor}`}
          >
            {telemetry.fps} FPS
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Performance Monitor' : 'Minimize Performance Monitor'}
            aria-label={isCollapsed ? 'Expand Performance Monitor' : 'Collapse Performance Monitor'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            title="Close Performance Monitor"
            aria-label="Close Performance Monitor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimized 1-Line Bar */}
      {isCollapsed ? (
        <div className="px-3 py-1.5 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums bg-[#050811]">
          <span>
            <span className="text-slate-400">Frame </span>
            <strong className={frameTimeColor}>{telemetry.frameTimeMs.toFixed(1)}ms</strong>
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <span className="text-slate-400">Draws </span>
            <strong className="text-cyan-300">{telemetry.drawCalls}</strong>
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <span className="text-slate-400">VRAM </span>
            <strong className="text-amber-300">{telemetry.estimatedGpuMemoryMb}MB</strong>
          </span>
        </div>
      ) : (
        <div className="p-2.5 space-y-2 text-xs">
          {/* 1. Core 3-Metric Row: Frame Time, Draw Calls, GPU Memory */}
          <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums">
            <div className="px-2 py-1.5 rounded-lg bg-[#090e1c] border border-slate-800/80">
              <div className="text-[8.5px] text-slate-400 uppercase flex items-center justify-between">
                <span>Frame</span>
                <Cpu className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <div className={`text-xs font-bold mt-0.5 ${frameTimeColor}`}>
                {telemetry.frameTimeMs.toFixed(1)}
                <span className="text-[9px] font-normal text-slate-400 ml-0.5">ms</span>
              </div>
            </div>

            <div className="px-2 py-1.5 rounded-lg bg-[#090e1c] border border-slate-800/80">
              <div className="text-[8.5px] text-slate-400 uppercase flex items-center justify-between">
                <span>Draws</span>
                <Layers className="w-2.5 h-2.5 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-cyan-300 mt-0.5">
                {telemetry.drawCalls}
                <span className="text-[9px] font-normal text-slate-400 ml-0.5">
                  ({formatCompactCount(telemetry.triangles)})
                </span>
              </div>
            </div>

            <div className="px-2 py-1.5 rounded-lg bg-[#090e1c] border border-slate-800/80">
              <div className="text-[8.5px] text-slate-400 uppercase flex items-center justify-between">
                <span>VRAM</span>
                <Database className="w-2.5 h-2.5 text-amber-400" />
              </div>
              <div className="text-xs font-bold text-amber-300 mt-0.5">
                {telemetry.estimatedGpuMemoryMb}
                <span className="text-[9px] font-normal text-slate-400 ml-0.5">MB</span>
              </div>
            </div>
          </div>

          {/* 2. Clean Frame-Time Sparkline */}
          <div className="px-2 py-1.5 rounded-lg bg-[#080c18] border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tabular-nums">
              <span>Avg {telemetry.avgFrameTimeMs.toFixed(1)}ms</span>
              <span>
                {telemetry.canvasWidth}×{telemetry.canvasHeight} ({telemetry.pixelRatio}x)
              </span>
            </div>

            <svg
              viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
              className="w-full h-8 overflow-visible bg-[#05070e] rounded border border-slate-800/60"
            >
              <line
                x1={0}
                y1={y60Fps}
                x2={sparkWidth}
                y2={y60Fps}
                stroke="rgba(16, 185, 129, 0.3)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={0}
                y1={y30Fps}
                x2={sparkWidth}
                y2={y30Fps}
                stroke="rgba(244, 63, 94, 0.25)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <polyline
                fill="none"
                stroke={
                  telemetry.avgFrameTimeMs > 28
                    ? '#fb7185'
                    : telemetry.avgFrameTimeMs > 18.5
                    ? '#fbbf24'
                    : '#34d399'
                }
                strokeWidth="1.75"
                points={sparkPoints}
              />
            </svg>
          </div>

          {/* 3. Simple Quick-Action Row: 0.5x Render Scale + Shader Mode */}
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[9.5px]">
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings.lowResolutionRender)}
              aria-label="Toggle Low-Resolution Render (0.5x)"
              data-testid="toggle-low-resolution-render"
              onClick={() =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  lowResolutionRender: !prev.lowResolutionRender,
                }))
              }
              className={`px-2 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                settings.lowResolutionRender
                  ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                  : 'border-slate-800 bg-[#090e1c] hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Scale WebGL render resolution to 0.5x to boost FPS"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  settings.lowResolutionRender ? 'bg-cyan-400' : 'bg-slate-500'
                }`}
              />
              <span>{settings.lowResolutionRender ? '0.5x Res: ON' : '0.5x Res: OFF'}</span>
            </button>

            <button
              type="button"
              data-testid="perf-shader-tier-mode-btn"
              onClick={() => {
                if (!sceneController) return;
                const curr = sceneController.getShaderQualityMode();
                const next =
                  curr === 'auto'
                    ? 'Full Geodesic'
                    : curr === 'Full Geodesic'
                    ? 'Approximated Null-Geodesic'
                    : 'auto';
                sceneController.setShaderQualityMode(next);
                setTelemetry(sceneController.getPerformanceTelemetry());
              }}
              className="px-2 py-1.5 rounded-lg bg-[#090e1c] hover:bg-slate-800/80 text-slate-200 hover:text-white border border-slate-800 cursor-pointer transition-colors truncate font-semibold"
              title="Cycle shader quality mode: Auto -> Full Geodesic -> Fast Approx"
            >
              Shader: {(telemetry.shaderQualityMode ?? 'auto').toUpperCase()}
            </button>
          </div>

          {/* 4. Compact Collapsible Advanced Details Toggle */}
          <div className="pt-0.5">
            <button
              type="button"
              data-testid="perf-toggle-advanced-btn"
              onClick={() => setShowLayerDiagnostics((prev) => !prev)}
              className="w-full flex items-center justify-between text-[9.5px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer px-1 py-0.5"
            >
              <span className="flex items-center gap-1">
                <Sliders className="w-2.5 h-2.5 text-cyan-400" />
                <span>Advanced Details</span>
              </span>
              <span className="text-cyan-400">{showLayerDiagnostics ? 'Hide' : 'Show'}</span>
            </button>

            {showLayerDiagnostics && (
              <div className="mt-1.5 space-y-1.5 pt-1.5 border-t border-slate-800/80 font-mono text-[9px] tabular-nums">
                {telemetry.passTimings && (
                  <div
                    data-testid="perf-user-timing-breakdown"
                    className="p-2 rounded-lg bg-[#080d1a] border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-300">
                      <span>GPU Scene / Post:</span>
                      <strong>
                        {telemetry.passTimings.gpuScenePassMs.toFixed(1)} /{' '}
                        {telemetry.passTimings.gpuPostPassMs.toFixed(1)} ms
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Tier:</span>
                      <span data-testid="perf-shader-quality-tier" className="text-cyan-300 font-semibold">
                        {telemetry.shaderQualityTier ??
                          telemetry.passTimings.shaderQualityTier ??
                          'Full Geodesic'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Status:</span>
                      <span data-testid="perf-bottleneck-verdict" className="text-emerald-300 font-semibold">
                        {telemetry.passTimings.classification}
                      </span>
                    </div>
                    {telemetry.thermalState && (
                      <div
                        data-testid="perf-thermal-throttling-row"
                        className="flex items-center justify-between text-slate-300"
                      >
                        <span data-testid="perf-thermal-level">
                          {telemetry.thermalState.level} ({telemetry.thermalState.estimatedTempC.toFixed(0)}°C)
                        </span>
                        <span data-testid="perf-thermal-step-count" className="text-cyan-300">
                          {telemetry.thermalState.uStepCount}/{telemetry.thermalState.maxStepCount} steps
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/70">
                      <button
                        type="button"
                        onClick={handleToggleSafeDiagnosticMode}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>{isSafeDiagnosticMode ? 'Restore Shaders' : 'Safe Isolate'}</span>
                      </button>
                      <button
                        type="button"
                        data-testid="perf-console-dump-btn"
                        onClick={() => sceneController?.logShaderPassTelemetryToConsole(true)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                      >
                        Log Console
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                  {telemetry.layerDiagnostics.map((layer) => (
                    <div
                      key={layer.id}
                      className="px-2 py-1 rounded bg-[#090e1b] border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <span
                        className={`truncate ${
                          layer.active ? 'text-slate-200' : 'text-slate-500 line-through'
                        }`}
                      >
                        {layer.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleShaderLayer(layer.id)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        {layer.active ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                        <span>{layer.active ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
});

