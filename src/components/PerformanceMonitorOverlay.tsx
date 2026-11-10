import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Layers,
  ShieldCheck,
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

export const PerformanceMonitorOverlay: React.FC<PerformanceMonitorOverlayProps> = ({
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
    if (!sceneController) return;
    setTelemetry(sceneController.getPerformanceTelemetry());

    let animId = 0;
    const TARGET_FPS = 30;
    const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    const updateTelemetryLoop = (now: number) => {
      animId = requestAnimationFrame(updateTelemetryLoop);

      // 30fps requestAnimationFrame-throttling (~33.33ms interval)
      const elapsedMs = now - lastFrameTime;
      if (elapsedMs < FRAME_INTERVAL_MS) {
        return;
      }
      lastFrameTime = now - (elapsedMs % FRAME_INTERVAL_MS);
      setTelemetry(sceneController.getPerformanceTelemetry());
    };

    animId = requestAnimationFrame(updateTelemetryLoop);
    return () => cancelAnimationFrame(animId);
  }, [sceneController]);

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
      // Restore full relativistic shaders
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
        accretionDiskStyle: 'classic',
        lensFlareIntensity: 1.0,
        motionBlurEnabled: true,
      }));
    } else {
      // Isolate core geometry by bypassing heavy full-screen fragment passes
      onChangeParams((prev) => ({
        ...prev,
        gravitationalLensing: false,
      }));
      onUpdateSettings((prev) => ({
        ...prev,
        accretionDiskStyle: 'classic',
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
      aria-label="Three.js Performance Monitor & GPU Bottleneck Diagnostics"
      className={`absolute ${
        offsetTopForMetricOverlay ? 'top-2 sm:top-3 right-2 sm:right-[364px]' : 'top-2 sm:top-3 right-2 sm:right-4'
      } z-20 pointer-events-auto transition-all ${
        isPhoneMode ? 'w-[285px]' : isCollapsed ? 'w-[310px]' : 'w-[356px]'
      } bg-[#050811]/95 border border-slate-800/90 rounded-xl shadow-2xl overflow-hidden text-slate-100`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#080d1a] border-b border-slate-800/90">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-100">
                Three.js Perf Monitor
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${statusBadgeColor}`}
              >
                {telemetry.fps} FPS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Performance Monitor' : 'Collapse to compact bar'}
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
            title="Hide Performance Monitor (Can be re-enabled in Settings)"
            aria-label="Close Performance Monitor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Collapsed Summary Strip */}
      {isCollapsed ? (
        <div className="px-3 py-2 flex items-center justify-between gap-2 font-mono text-[10px] tabular-nums bg-[#050811]">
          <div>
            <span className="text-slate-400">FRAME </span>
            <strong className={frameTimeColor}>{telemetry.frameTimeMs.toFixed(1)}ms</strong>
          </div>
          <span className="text-slate-700">·</span>
          <div>
            <span className="text-slate-400">CALLS </span>
            <strong className="text-cyan-300">{telemetry.drawCalls}</strong>
          </div>
          <span className="text-slate-700">·</span>
          <div>
            <span className="text-slate-400">VRAM </span>
            <strong className="text-amber-300">{telemetry.estimatedGpuMemoryMb}MB</strong>
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-2.5 text-xs">
          {/* 1. Primary 3-Pillar Telemetry Cards: Frame Time, Draw Calls, Memory Usage */}
          <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums">
            {/* Frame Time Card */}
            <div className="p-2 rounded-lg bg-[#090e1c] border border-slate-800/80">
              <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase">
                <span>Frame Time</span>
                <Cpu className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <div className={`text-sm font-bold mt-0.5 ${frameTimeColor}`}>
                {telemetry.frameTimeMs.toFixed(1)}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">ms</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                Avg {telemetry.avgFrameTimeMs.toFixed(1)} · P95 {telemetry.p99FrameTimeMs.toFixed(1)}
              </div>
            </div>

            {/* Draw Calls Card */}
            <div className="p-2 rounded-lg bg-[#090e1c] border border-slate-800/80">
              <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase">
                <span>Draw Calls</span>
                <Layers className="w-2.5 h-2.5 text-cyan-400" />
              </div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">
                {telemetry.drawCalls}
                <span className="text-[10px] font-normal text-slate-400 ml-1">
                  ({telemetry.renderPasses}p)
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {formatCompactCount(telemetry.triangles)} tris · {telemetry.shaderPrograms} shd
              </div>
            </div>

            {/* Memory Usage Card */}
            <div className="p-2 rounded-lg bg-[#090e1c] border border-slate-800/80">
              <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase">
                <span>GPU Memory</span>
                <Database className="w-2.5 h-2.5 text-amber-400" />
              </div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                {telemetry.estimatedGpuMemoryMb}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">MB</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {telemetry.geometries} geo · {telemetry.textures} tex
              </div>
            </div>
          </div>

          {/* 2. Real-Time Frame-Time Sparkline Graph & JS Heap / Resolution Bar */}
          <div className="p-2 rounded-lg bg-[#080c18] border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tabular-nums">
              <span>FRAME TIME HISTORY (60 SAMPLES)</span>
              <span className="text-slate-300">
                {telemetry.canvasWidth}×{telemetry.canvasHeight} @{telemetry.pixelRatio}x
              </span>
            </div>

            <svg
              viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
              className="w-full h-10 overflow-visible bg-[#05070e] rounded border border-slate-800/60"
            >
              {/* 16.67ms (60 FPS) Target Line */}
              <line
                x1={0}
                y1={y60Fps}
                x2={sparkWidth}
                y2={y60Fps}
                stroke="rgba(16, 185, 129, 0.35)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {/* 33.33ms (30 FPS) Bottleneck Line */}
              <line
                x1={0}
                y1={y30Fps}
                x2={sparkWidth}
                y2={y30Fps}
                stroke="rgba(244, 63, 94, 0.35)"
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

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tabular-nums">
              <span className="truncate max-w-[175px]" title={telemetry.gpuRendererName}>
                {telemetry.rendererBackend}
              </span>
              <span>
                {telemetry.jsHeapUsedMb !== null
                  ? `JS Heap: ${telemetry.jsHeapUsedMb}/${telemetry.jsHeapTotalMb} MB`
                  : `Programs: ${telemetry.shaderPrograms} compiled`}
              </span>
            </div>
          </div>

          {/* 3. White-Screen GLSL Guard & Primary Bottleneck Status Banner */}
          <div className="px-2.5 py-1.5 rounded-lg bg-[#090f1d] border border-slate-800/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <div className="font-mono text-[9px] text-emerald-300 font-semibold">
                  GLSL NaN & Smoothstep Guard: ACTIVE
                </div>
                <div className="font-mono text-[9px] text-slate-400 truncate">
                  Top Load: <strong className="text-slate-200">{telemetry.primaryBottleneckLayer}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSafeDiagnosticMode}
              className={`px-2 py-1 rounded text-[9px] font-mono font-semibold border transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
                isSafeDiagnosticMode
                  ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                  : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title={
                isSafeDiagnosticMode
                  ? 'Restore Gravitational Lensing, Lens Flare, and Motion Blur shaders'
                  : 'Bypass full-screen fragment shaders (Lensing, Lens Flare, Motion Blur) to isolate GPU bottlenecks'
              }
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>{isSafeDiagnosticMode ? 'Restore Shaders' : 'Safe Isolate'}</span>
            </button>
          </div>

          {/* 3b. GPU Resource Caching Layer (Zero-Recompile Preset Transitions) */}
          {telemetry.gpuCache && (
            <div className="px-2.5 py-1.5 rounded-lg bg-[#080d1a] border border-cyan-500/25 flex items-center justify-between gap-2 font-mono text-[9px] tabular-nums">
              <div className="min-w-0 truncate">
                <div className="text-cyan-300 font-semibold">
                  GPU Resource Cache: {telemetry.gpuCache.hitRatePct}% Hit ({telemetry.gpuCache.cacheHits} hits)
                </div>
                <div className="text-slate-400 truncate">
                  {telemetry.gpuCache.precompiledShaders} pre-warmed shaders · {telemetry.gpuCache.cachedGeometries} geo · {telemetry.gpuCache.cachedTextures} LUT
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-emerald-300 font-semibold">0 Recompiles</div>
                <div className="text-slate-400">
                  Switch {telemetry.gpuCache.lastPresetSwitchMs.toFixed(2)}ms
                </div>
              </div>
            </div>
          )}

          {/* 4. Interactive Per-Layer Shader & Object Bottleneck Diagnostics */}
          <div className="border-t border-slate-800/80 pt-2">
            <button
              type="button"
              onClick={() => setShowLayerDiagnostics((prev) => !prev)}
              className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-cyan-300 hover:text-cyan-200 cursor-pointer mb-1.5"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <Sliders className="w-3 h-3" />
                <span>Shader & Layer Bottleneck Diagnostics</span>
              </span>
              <span>{showLayerDiagnostics ? 'HIDE' : 'INSPECT'}</span>
            </button>

            {showLayerDiagnostics && (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                {telemetry.layerDiagnostics.map((layer) => {
                  const tierBadge =
                    layer.gpuCostTier === 'EXTREME'
                      ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                      : layer.gpuCostTier === 'HIGH'
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : layer.gpuCostTier === 'MODERATE'
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400';

                  return (
                    <div
                      key={layer.id}
                      className={`px-2 py-1.5 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                        layer.active
                          ? 'bg-[#090e1b] border-slate-800/90'
                          : 'bg-[#060912]/60 border-slate-900 text-slate-500'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-[10px] font-semibold truncate ${
                              layer.active ? 'text-slate-100' : 'text-slate-500 line-through'
                            }`}
                          >
                            {layer.name}
                          </span>
                          <span
                            className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold border shrink-0 ${tierBadge}`}
                          >
                            {layer.active ? `${layer.gpuCostTier} ~${layer.estimatedGpuSharePct}%` : 'BYPASSED'}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                          {layer.shaderPass}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleShaderLayer(layer.id)}
                        className={`px-2 py-1 rounded text-[9px] font-mono font-semibold border transition-colors shrink-0 cursor-pointer flex items-center gap-1 ${
                          layer.active
                            ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                        title={`Toggle ${layer.name} to test GPU frame-time impact`}
                      >
                        {layer.active ? (
                          <>
                            <Eye className="w-2.5 h-2.5 text-cyan-300" />
                            <span>ON</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-2.5 h-2.5 text-slate-500" />
                            <span>OFF</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
