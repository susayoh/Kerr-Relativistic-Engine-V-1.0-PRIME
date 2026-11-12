import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  BlackHoleParams,
  GeodesicTrajectory,
  computeNullGeodesic,
  buildGeodesicTrajectoryCsv,
  computeRelativisticMetrics,
  BackgroundThemeId,
  BACKGROUND_THEMES,
  ObjectCategory,
  isStellarCategory,
  ASTROPHYSICAL_PRESETS,
} from '../physics/gravitationalPhysics';
import { relativisticAudio } from '../audio/relativisticAudio';
import {
  createCompactStarMaterial,
  createPulsarBeamSystem,
  PulsarBeamSystem,
  updateCompactStarPrecession,
} from './CompactStarMaterial';
import {
  buildShaderPrewarmCacheReport,
  classifyFrameBottleneck,
  clearKerrPerfMarksAndMeasures,
  computeBaseDesktopPixelRatio,
  computeRollingAverageFps,
  createInitialThermalState,
  DYNAMIC_RES_MIN_DPR,
  DYNAMIC_RES_ROLLING_WINDOW,
  DYNAMIC_RES_STEP_DPR,
  evaluateDynamicShaderQualityTier,
  GEODESIC_SHADER_SNIPPETS,
  GeodesicShaderQualityMode,
  GeodesicShaderQualityTier,
  KERR_PERF_MARKS,
  KERR_PERF_MEASURES,
  safePerfMark,
  safePerfMeasureMs,
  SHADER_PREWARM_MANIFEST,
  SHADER_QUALITY_HYSTERESIS_MS,
  ShaderPassTimingSnapshot,
  ShaderPrewarmCacheReport,
  ShaderPrewarmVariantId,
  stepDynamicResolutionScale,
  stepThermalThrottlingState,
  ThermalThrottleLevel,
  ThermalThrottleState,
} from './renderScaleUtils';

export type {
  GeodesicShaderQualityMode,
  GeodesicShaderQualityTier,
  ShaderPrewarmCacheReport,
  ShaderPrewarmVariantId,
  ThermalThrottleLevel,
  ThermalThrottleState,
};

export interface AnatomyCalloutAnchor {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  headline: string;
  description: string;
  worldPos: { x: number; y: number; z: number };
  screenX: number;
  screenY: number;
  isVisible: boolean;
  dockPosition: 'top-left' | 'top-right' | 'mid-left' | 'mid-right' | 'bottom-left' | 'bottom-right';
}

export type AccretionDiskStyle = 'classic' | 'raymarched';

export type UiThemeId = 'kerr_claude' | 'observatory_gold' | 'cryo_quantum';

export interface VisualizerSettings {
  uiTheme?: UiThemeId;
  accretionDiskStyle: AccretionDiskStyle;
  bloomIntensity: number;
  lensFlareIntensity: number;
  lockBackground: boolean;
  syncSingularityWithAnatomy: boolean;
  alwaysShowSingularity: boolean;
  nakedDistortionIntensity: number;
  motionBlurEnabled: boolean;
  screenShakeEnabled: boolean;
  cameraFov: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  showLeftHud: boolean;
  showOverheadMap: boolean;
  showTimeDilation: boolean;
  showCursorTelemetry: boolean;
  showEventLog: boolean;
  showMetricTelemetry: boolean;
  showPerformanceMonitor: boolean;
  focusMode?: boolean;
  kerrEngineEnabled: boolean;
  kerrEngineTier: 'standard' | 'linear' | 'advanced' | 'ultra';
  phoneMode: boolean;
  hapticsEnabled: boolean;
  hapticsIntensity: number;
  includeUiInExport: boolean;
  includeUiInVideoExport: boolean;
  timeLapseEnabled: boolean;
  rapidAdjustmentRipples: boolean;
  accretionShockwaveEnabled: boolean;
  dynamicResolutionScaling?: boolean;
  /** High-Performance Mode: enables WebGL depth-peeling and throttles telemetry calculations to alleviate main-thread lag */
  highPerformanceMode?: boolean;
  /** Explicit WebGL depth-peeling toggle (front-to-back alpha threshold & depth-write occlusion culling on transparent relativistic strata) */
  webglDepthPeeling?: boolean;
  /** Low-Resolution Render (0.5x): scales the WebGL canvas render resolution to 0.5x to boost frame rates on high-DPI or low-performance devices */
  lowResolutionRender?: boolean;
  secret1987Unlocked?: boolean;
  secret1987Mode?: boolean;
  language?: 'en' | 'de' | 'ja' | 'es' | 'zh';
}

export const isMobileDevice = (() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
})();

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
  uiTheme: 'observatory_gold',
  accretionDiskStyle: 'classic',
  bloomIntensity: 1.0,
  lensFlareIntensity: 1.0,
  lockBackground: false,
  syncSingularityWithAnatomy: true,
  alwaysShowSingularity: false,
  nakedDistortionIntensity: 1.25,
  motionBlurEnabled: false,
  screenShakeEnabled: true,
  cameraFov: isMobileDevice ? 56 : 46,
  autoRotate: false,
  autoRotateSpeed: 0.6,
  showLeftHud: !isMobileDevice,
  showOverheadMap: !isMobileDevice,
  showTimeDilation: false,
  showCursorTelemetry: !isMobileDevice,
  showEventLog: false,
  showMetricTelemetry: false,
  showPerformanceMonitor: false,
  focusMode: true,
  kerrEngineEnabled: true,
  kerrEngineTier: 'ultra',
  phoneMode: isMobileDevice,
  hapticsEnabled: true,
  hapticsIntensity: 1.0,
  includeUiInExport: false,
  includeUiInVideoExport: false,
  timeLapseEnabled: false,
  rapidAdjustmentRipples: true,
  accretionShockwaveEnabled: true,
  dynamicResolutionScaling: false,
  highPerformanceMode: false,
  webglDepthPeeling: false,
  lowResolutionRender: false,
  secret1987Unlocked: false,
  secret1987Mode: false,
  language: 'en',
};


// Module-scope reusable math objects for zero GC in render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _vec3D = new THREE.Vector3();
const _vec3E = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _savedCamPos = new THREE.Vector3();
const _savedCamTarget = new THREE.Vector3();
const _shakeOffset = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _quatA = new THREE.Quaternion();
const _color = new THREE.Color();

export let isSoftwareGl = false;

function detectSoftwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export type CameraPresetId = 'equatorial' | 'polar' | 'grazing' | 'star' | 'well' | 'plunge_45';
export type CinematicTourStageId = 'polar' | 'equatorial' | 'plunge_45';

export interface InspectedFeature {
  title: string;
  subtitle: string;
  formula: string;
  description: string;
}

export interface ShaderLayerDiagnosticItem {
  id:
    | 'gravitationalLensing'
    | 'accretionDisk'
    | 'cameraLensFlare'
    | 'postProcessing'
    | 'spacetimeGrid'
    | 'starfield'
    | 'binaryStream'
    | 'ergosphere';
  name: string;
  shaderPass: string;
  active: boolean;
  gpuCostTier: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  estimatedGpuSharePct: number;
  drawCalls: number;
  details: string;
}

export interface GPUResourceCacheMetrics {
  cachedTextures: number;
  cachedGeometries: number;
  precompiledShaders: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatePct: number;
  presetTransitionsCached: number;
  lastPresetSwitchMs: number;
}

export interface ScenePerformanceTelemetry {
  frameTimeMs: number;
  avgFrameTimeMs: number;
  minFrameTimeMs: number;
  maxFrameTimeMs: number;
  p99FrameTimeMs: number;
  fps: number;
  frameTimeHistory: number[];
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  renderPasses: number;
  frameNumber: number;
  geometries: number;
  textures: number;
  shaderPrograms: number;
  estimatedGpuMemoryMb: number;
  jsHeapUsedMb: number | null;
  jsHeapTotalMb: number | null;
  jsHeapLimitMb: number | null;
  rendererBackend: 'WebGL2 Hardware' | 'WebGL1 Hardware' | 'Software WebGL' | '2D Canvas Fallback';
  gpuRendererName: string;
  pixelRatio: number;
  canvasWidth: number;
  canvasHeight: number;
  bottleneckStatus: 'OPTIMAL' | 'ELEVATED' | 'BOTTLENECK';
  primaryBottleneckLayer: string;
  shaderNanGuardActive: boolean;
  highPerformanceMode?: boolean;
  depthPeelingActive?: boolean;
  lowResolutionRender?: boolean;
  renderResolutionScale?: number;
  telemetryThrottleHz?: number;
  shaderQualityTier?: GeodesicShaderQualityTier;
  shaderQualityMode?: GeodesicShaderQualityMode;
  passTimings?: ShaderPassTimingSnapshot;
  thermalState?: ThermalThrottleState;
  shaderPrewarm?: ShaderPrewarmCacheReport;
  layerDiagnostics: ShaderLayerDiagnosticItem[];
  gpuCache: GPUResourceCacheMetrics;
}

/**
 * Singleton GPU Resource Caching Layer for BlackHoleSceneController.
 * Prevents procedural texture re-creation/re-upload, BufferGeometry duplication,
 * and on-the-fly GLSL shader recompilation stutter when switching between
 * astrophysical presets or running side-by-side Compare mode.
 */
class GPUResourceCacheManager {
  private textures = new Map<string, THREE.Texture>();
  private geometries = new Map<string, THREE.BufferGeometry>();
  private compiledProgramSignatures = new Set<string>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private presetTransitionsCached = 0;
  private lastPresetSwitchMs = 0.08;

  public getOrCreateTexture<T extends THREE.Texture>(
    key: string,
    factory: () => T,
    anisotropy = 1
  ): T {
    const existing = this.textures.get(key) as T | undefined;
    if (existing) {
      this.cacheHits++;
      if (anisotropy > existing.anisotropy) {
        existing.anisotropy = anisotropy;
        existing.needsUpdate = true;
      }
      return existing;
    }

    this.cacheMisses++;
    const created = factory();
    created.userData = { ...(created.userData || {}), gpuCacheKey: key, isCachedGpuResource: true };
    // Prevent individual scene/material dispose calls from destroying shared cached GPU textures
    created.dispose = () => {
      /* Managed by GPUResourceCacheManager */
    };
    this.textures.set(key, created);
    return created;
  }

  public getOrCreateGeometry<T extends THREE.BufferGeometry>(
    key: string,
    factory: () => T
  ): T {
    const existing = this.geometries.get(key) as T | undefined;
    if (existing) {
      this.cacheHits++;
      return existing;
    }

    this.cacheMisses++;
    const created = factory();
    created.userData = { ...(created.userData || {}), gpuCacheKey: key, isCachedGpuResource: true };
    // Prevent individual mesh dispose calls from freeing shared immutable BufferGeometries
    created.dispose = () => {
      /* Managed by GPUResourceCacheManager */
    };
    this.geometries.set(key, created);
    return created;
  }

  public registerShaderProgram(key: string): boolean {
    if (this.compiledProgramSignatures.has(key)) {
      this.cacheHits++;
      return true;
    }
    this.cacheMisses++;
    this.compiledProgramSignatures.add(key);
    return false;
  }

  public recordPresetTransition(durationMs: number, avoidedRecompiles = 6) {
    this.presetTransitionsCached++;
    this.cacheHits += avoidedRecompiles;
    this.lastPresetSwitchMs = Number(Math.max(0.02, durationMs).toFixed(2));
  }

  public getMetrics(rendererProgramsCount?: number): GPUResourceCacheMetrics {
    const totalLookups = this.cacheHits + this.cacheMisses;
    const hitRatePct =
      totalLookups > 0 ? Math.min(100, Math.round((this.cacheHits / totalLookups) * 100)) : 100;
    const precompiledShaders = Math.max(
      this.compiledProgramSignatures.size,
      rendererProgramsCount ?? 0
    );
    return {
      cachedTextures: this.textures.size,
      cachedGeometries: this.geometries.size,
      precompiledShaders,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRatePct,
      presetTransitionsCached: this.presetTransitionsCached,
      lastPresetSwitchMs: this.lastPresetSwitchMs,
    };
  }
}

export const gpuResourceCache = new GPUResourceCacheManager();

export interface OverheadTelemetryData {
  probeX: number;
  probeZ: number;
  probeRadiusRs: number;
  probeRadiusRg: number;
  probeAngleDeg: number;
  probeAngleRad: number;
  probeOrbitalBeta: number;
  probeTimeDilationFactor: number;
  probeRedshiftZ: number;
  eventHorizonRs: number;
  photonSphereRs: number;
  iscoRs: number;
  ergosphereRs: number;
  accretionInnerRs: number;
  accretionOuterRs: number;
  spin: number;
  orbitalStarsVisible: boolean;
  geodesics: Array<{
    colorHex: number;
    outcome: string;
    points: Array<{ x: number; z: number }>;
    currentPos: { x: number; z: number };
  }>;
}

// 1. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Ring & Volumetric Torus Shader)
const ACCRETION_VERTEX_SHADER = `
  attribute float aVerticalLayer;
  uniform float uAccretionState;
  uniform float uDiskStyle;
  uniform vec4 uTurbulenceBuffer;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vVerticalLayer;

  void main() {
    vUv = uv;
    vVerticalLayer = aVerticalLayer;
    vec3 pos = position;
    float r = length(pos.xy);

    // Activate 3D vertical torus stratification in Active mode OR Volumetric Raymarched mode
    float volMode = max(uAccretionState, uDiskStyle * 0.78);
    if (volMode > 0.01) {
      float innerRamp = smoothstep(1.65, 2.52, r);
      float outerEnvelope = 1.0 - 0.48 * smoothstep(4.2, 6.2, r);
      float scaleHeight = (0.075 + 0.032 * max(0.0, r - 1.75)) * innerRamp * outerEnvelope;

      vec2 unitDir = pos.xy / max(0.0001, r);
      float cosPhi = unitDir.x;
      float sinPhi = unitDir.y;
      float cos2Phi = cosPhi * cosPhi - sinPhi * sinPhi;
      float sin2Phi = 2.0 * cosPhi * sinPhi;

      float billow = sin(r * 2.5 - uTurbulenceBuffer.z * 0.65 + cos2Phi * 1.9 + aVerticalLayer * 2.4) * 0.08
                   + cos(r * 5.1 - uTurbulenceBuffer.x * 2.4 + sin2Phi * 1.6 - aVerticalLayer * 1.7) * 0.05;

      // Local Z corresponds to world vertical Y because the ring mesh is rotated -PI/2 around X
      pos.z += (aVerticalLayer * scaleHeight + billow * scaleHeight * (0.28 + 0.42 * abs(aVerticalLayer))) * volMode;
    }

    vLocalPos = pos;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ACCRETION_FRAGMENT_SHADER = `
  // Pre-calculated Doppler Shift & Relativistic Kinematics Coefficients:
  // uDopplerCoeffs: (uDopplerStrength, betaScale, gammaClamp, dopplerExponent)
  uniform vec4 uDopplerCoeffs;
  // uDiskParams: (spin, accretionRate, spectralMode, isStar)
  uniform vec4 uDiskParams;
  // Uniform-Buffer Orbital Turbulence & Shear State (pre-computed each frame)
  // uTurbulenceBuffer: (basePhase, ringPhase, shearRate, timeScale)
  uniform vec4 uTurbulenceBuffer;
  // uTurbulenceHarmonics: (freq1, freq2, harmonicAmp, filamentBlend)
  uniform vec4 uTurbulenceHarmonics;

  uniform sampler2D uSpectrumLut;
  uniform float uPulseRadius;
  uniform float uPulseStrength;
  uniform float uDiskStyle;
  uniform float uBloomIntensity;
  uniform float uAccretionState;
  uniform float uExpansionProgress;
  uniform float uDepthPeeling;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vVerticalLayer;

  float fastTurb2D(vec2 p) {
    return (sin(p.x * 1.35 + cos(p.y * 1.65)) + cos(p.y * 1.85 - sin(p.x * 1.45))) * 0.25 + 0.5;
  }

  // 4-octave Fractional Brownian Motion (fBM) plasma turbulence for crisp volumetric desktop & mobile fidelity
  float fbmDisk2D(vec2 p) {
    float v = 0.50 * fastTurb2D(p);
    p = vec2(p.x * 1.62 - p.y * 1.18, p.x * 1.18 + p.y * 1.62) + vec2(1.7, 3.1);
    v += 0.26 * fastTurb2D(p);
    p = vec2(p.x * 1.68 + p.y * 1.12, -p.x * 1.12 + p.y * 1.68) + vec2(4.3, 1.9);
    v += 0.15 * fastTurb2D(p);
    p = vec2(p.x * 1.74 - p.y * 1.08, p.x * 1.08 + p.y * 1.74) + vec2(2.9, 5.4);
    v += 0.09 * fastTurb2D(p);
    return clamp(v, 0.0, 1.0);
  }

  // ACES filmic tone mapping with smooth highlight shoulder to preserve plasma band contrast
  vec3 acesFilm(vec3 x) {
    vec3 r = x / (1.0 + x * 0.14);
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((r * (a * r + b)) / (r * (c * r + d) + e), 0.0, 1.0);
  }

  // High-energy thermal blackbody color progression for Active Accretion State:
  // Burns incandescent white-hot at the inner core, transitions to bright gold, and tapers to deep red at the outer edges
  vec3 computeActiveThermalSpectrum(float normR, float boostedFlux, float filaments) {
    float radialHeat = pow(clamp(1.0 - normR, 0.0001, 1.0), 0.82);
    float fluxHeat = clamp(boostedFlux / (1.25 + boostedFlux * 0.30), 0.0, 1.0);
    float T = clamp(mix(radialHeat, fluxHeat, 0.42) + (1.0 - normR) * 0.24 + (filaments - 0.5) * 0.08, 0.0, 1.0);

    vec3 colDeepRed    = vec3(0.54, 0.03, 0.008);
    vec3 colCrimson    = vec3(0.88, 0.15, 0.02);
    vec3 colAmberFire  = vec3(0.98, 0.45, 0.06);
    vec3 colBrightGold = vec3(1.00, 0.82, 0.24);
    vec3 colWhiteHot   = vec3(1.00, 0.99, 0.94);

    if (T > 0.76) {
      return mix(colBrightGold, colWhiteHot, smoothstep(0.76, 0.94, T));
    } else if (T > 0.48) {
      return mix(colAmberFire, colBrightGold, smoothstep(0.48, 0.76, T));
    } else if (T > 0.22) {
      return mix(colCrimson, colAmberFire, smoothstep(0.22, 0.48, T));
    } else {
      return mix(colDeepRed, colCrimson, smoothstep(0.0, 0.22, T));
    }
  }

  // Bardeen-Press-Teukolsky (1972) prograde Kerr ISCO mapped to scene horizon scale
  float computeKerrIscoSceneRadius(float spin, float r_horizon) {
    float a = clamp(spin, 0.0, 0.999);
    float oneMinusA2 = max(0.0001, 1.0 - a * a);
    float cbrt1 = pow(oneMinusA2, 1.0 / 3.0);
    float z1 = 1.0 + cbrt1 * (pow(1.0 + a, 1.0 / 3.0) + pow(max(0.0001, 1.0 - a), 1.0 / 3.0));
    float z2 = sqrt(3.0 * a * a + z1 * z1);
    float rIscoRg = 3.0 + z2 - sqrt(max(0.0, (3.0 - z1) * (3.0 + z1 + 2.0 * z2)));
    float iscoNorm = clamp((rIscoRg - 1.0) / 5.0, 0.0, 1.0);
    return r_horizon * 1.22 + iscoNorm * 0.42;
  }

  void main() {
    if (uExpansionProgress < 0.02) {
      discard;
    }

    float r = length(vLocalPos.xy);
    float spin = clamp(uDiskParams.x, 0.0, 1.0);
    float accretionRate = uDiskParams.y;
    int spectralMode = int(uDiskParams.z);
    float isStar = uDiskParams.w;
    float absLayer = abs(vVerticalLayer);

    // In Classic Quiescent mode, discard any elevated volumetric strata so only the razor-thin midplane renders.
    // In Volumetric Raymarched mode (uDiskStyle >= 0.5) or Active mode (uAccretionState >= 0.5), render all 3D volumetric strata!
    if (uAccretionState < 0.5 && uDiskStyle < 0.5 && absLayer > 0.01) {
      discard;
    }
    // WebGL Depth-Peeling: cull secondary outer vertical strata to eliminate multi-pass alpha overdraw
    if (uDepthPeeling > 0.5 && absLayer > 0.35) {
      discard;
    }

    // Vertical Y-axis density falloff across the thin volumetric torus
    float verticalDensityFalloff = exp(-pow(max(0.0001, absLayer), 1.55) * 2.85);
    float volPhaseState = max(uAccretionState, uDiskStyle * 0.80);
    float layerPhaseOffset = vVerticalLayer * 1.25 * volPhaseState;

    // Unscaled 3D black-hole-space position and sightline projection for soft rear-limb horizon fade
    vec3 bhLocalPos = vec3(vLocalPos.x, vLocalPos.z, -vLocalPos.y);
    vec3 toCamDir = length(cameraPosition) > 0.001 ? normalize(cameraPosition) : vec3(0.0, 0.0, 1.0);
    float camProj = dot(bhLocalPos, toCamDir);
    float bView = length(bhLocalPos - toCamDir * camProj);

    // Unified Full-Fidelity Volumetric Accretion Disk Shader (uDiskStyle < 0.5):
    // Multi-octave fBM turbulence + high-contrast concentric Doppler-beamed rings + ACES filmic tone mapping
    if (uDiskStyle < 0.5) {
      float starRadius = 1.65;
      float r_horizon = (isStar > 0.5) ? 0.0 : mix(2.12, 1.96, spin * 0.45);
      float r_isco = (isStar > 0.5)
        ? (starRadius * 1.35)
        : computeKerrIscoSceneRadius(spin, r_horizon);
      float rPlungeInner = (isStar > 0.5) ? (starRadius * 1.05) : (r_horizon * 1.02);
      float rOut = mix(5.5, 6.2, uAccretionState);

      if (r <= rPlungeInner || r > rOut) {
        discard;
      }

      float normR = clamp((r - rPlungeInner) / (rOut - rPlungeInner), 0.0, 1.0);
      float shockGrowth = 1.0 - pow(max(0.0001, 1.0 - clamp(uExpansionProgress, 0.0, 1.0)), 2.6);
      float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
      float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);
      if (unfurlMask <= 0.001) {
        discard;
      }

      // Smooth transition across the plunge region inside ISCO toward the event horizon (evaluated early to skip 4-octave FBM on transparent edges)
      float innerTaper = smoothstep(r_horizon * 1.02, r_isco, r);
      if (isStar > 0.5) {
        innerTaper = smoothstep(starRadius * 1.05, r_isco, r);
      } else {
        float rearLimbSoftener = mix(1.0, smoothstep(r_horizon * 0.96, r_horizon * 1.24, bView), smoothstep(0.42, -0.32, camProj));
        innerTaper *= rearLimbSoftener;
      }
      float outerTaper = 1.0 - smoothstep(rOut - mix(1.15, 1.45, uAccretionState), rOut, r);
      float diskDensity = pow(max(0.0001, 1.0 - normR), mix(1.08, 0.88, uAccretionState)) * innerTaper;
      float radialProfile = diskDensity * outerTaper;
      if (radialProfile * innerTaper * unfurlMask < (uDepthPeeling > 0.5 ? 0.022 : 0.0015)) {
        discard;
      }

      // Continuous 2PI unit vector so the disk has zero horizontal slice seam
      vec2 unitDir = vLocalPos.xy / max(0.0001, r);
      float omega = 3.2 / (pow(r, 1.45) + 0.15 * spin);
      float twist = uTurbulenceBuffer.x * omega * 1.5 - 1.35 * log(max(0.1, r / r_isco)) + layerPhaseOffset * 0.35;
      float ct = cos(twist);
      float st = sin(twist);
      vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

      float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
      float sin2Phi = 2.0 * rotDir.x * rotDir.y;
      float cos3Phi = 4.0 * rotDir.x * rotDir.x * rotDir.x - 3.0 * rotDir.x;

      float turbFreqBoost = mix(1.0, 1.35, uAccretionState);
      float fbmTurb = fbmDisk2D(rotDir * (r * 0.68 * turbFreqBoost) + vec2(uTurbulenceBuffer.y * 0.15, -uTurbulenceBuffer.z * 0.12 + layerPhaseOffset));
      float waveA = sin(r * uTurbulenceHarmonics.x * 3.1 * turbFreqBoost - uTurbulenceBuffer.z * 0.55 + cos2Phi * 1.2 + uTurbulenceBuffer.y + (fbmTurb - 0.5) * 1.8 + layerPhaseOffset);
      float waveB = cos(r * uTurbulenceHarmonics.x * 6.8 * turbFreqBoost - uTurbulenceBuffer.z * 0.8 + waveA * (1.4 + 0.45 * uAccretionState) + sin2Phi * 0.9 - layerPhaseOffset * 0.7);
      float waveC = sin(r * 11.2 * turbFreqBoost + cos3Phi * 1.1 - uTurbulenceBuffer.w + (fbmTurb - 0.5) * 2.2 + layerPhaseOffset * 1.2);
      float diskTurb = waveA * 0.5 + 0.5;
      float concentricRings = pow(waveB * 0.5 + 0.5, 1.18);
      float fineSubRings = waveC * 0.5 + 0.5;
      float diskFilaments = clamp(mix(mix(fbmTurb, concentricRings, 0.58), fineSubRings, 0.26 + 0.10 * uAccretionState), 0.12, 1.0);

      vec2 toCamXZ = length(cameraPosition.xz) > 0.001
        ? normalize(cameraPosition.xz)
        : vec2(0.0, 1.0);
      vec2 worldUnitXZ = vWorldPos.xz / max(0.0001, length(vWorldPos.xz));
      vec2 tanVelXZ = vec2(-worldUnitXZ.y, worldUnitXZ.x);
      float approachCos = dot(tanVelXZ, toCamXZ);

      float beta = clamp(uDopplerCoeffs.y * inversesqrt(max(0.65, r - 0.5)), 0.05, 0.78);
      float dopplerFactor = 1.0 / (1.0 - beta * approachCos * uDopplerCoeffs.x);
      float dopplerBoost = pow(clamp(dopplerFactor, 0.35, 2.35), uDopplerCoeffs.w);

      // Shockwave-coupled leading rim compression as the disk grows outward with the shockwave
      float ignitionWave = exp(-pow(abs((normR - diskUnfurl) / 0.09), 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

      // Base Emission Multiplier significantly boosted with inner ISCO caustic peak + accretion-rate breathing feedback loop
      float iscoNormR = clamp((r - r_isco) / max(0.001, rOut - r_isco), 0.0, 1.0);
      float breatheRate = 1.45 + 1.25 * clamp(accretionRate, 0.0, 2.5);
      float breatheAmp = 0.055 + 0.075 * clamp(accretionRate / 2.0, 0.0, 1.35);
      float accretionBreathing = 1.0 + breatheAmp * (
        0.65 * sin(uTurbulenceBuffer.x * breatheRate - normR * 2.8) +
        0.35 * cos(uTurbulenceBuffer.x * (breatheRate * 1.618) - iscoNormR * 4.5)
      );
      float activeEmissionMult = mix(1.0, 2.45, uAccretionState) * (1.0 + ignitionWave) * accretionBreathing;
      float innerIscoRing = 1.0 + 1.45 * exp(-iscoNormR * 5.6) * innerTaper;
      float flux = radialProfile * innerIscoRing * (0.28 + 0.72 * diskFilaments) * dopplerBoost * (0.68 + 0.45 * accretionRate) * activeEmissionMult;

      float sonicRarefaction = 0.0;
      float sonicCompression = 0.0;
      if (uPulseStrength > 0.001) {
        float dShock = r - uPulseRadius;
        float leadFront = exp(-pow(abs(dShock / 0.32), 2.0));
        float tailFront = exp(-pow(abs((dShock + 1.35) / 0.42), 2.0)) * 0.65;
        float rarefactionTrough = exp(-pow(abs((dShock + 0.62) / 0.52), 2.0));
        float acousticWake = sin(dShock * 5.8) * exp(-abs(dShock + 1.1) * 0.42) * step(dShock, 0.15) * 0.25;
        sonicCompression = clamp((leadFront + tailFront + max(0.0, acousticWake)) * uPulseStrength * innerTaper * outerTaper, 0.0, 1.0);
        sonicRarefaction = clamp(rarefactionTrough * uPulseStrength * innerTaper * outerTaper, 0.0, 0.88);
      }

      float lutU = clamp(flux * 0.65, 0.02, 0.99);
      vec3 baseLut = texture2D(uSpectrumLut, vec2(lutU, 0.5)).rgb;

      if (spectralMode == 1) {
        baseLut = mix(vec3(0.18, 0.02, 0.01), vec3(1.0, 0.85, 0.42), lutU);
      } else if (spectralMode == 2) {
        baseLut = mix(vec3(0.06, 0.16, 0.42), vec3(0.84, 0.95, 1.0), lutU);
      } else if (spectralMode == 3) {
        baseLut = mix(vec3(0.95, 0.34, 0.08), vec3(0.22, 0.82, 1.0), clamp(approachCos * 0.5 + 0.5, 0.0, 1.0)) * (0.42 + 0.58 * diskFilaments);
      } else if (uAccretionState > 0.5) {
        vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
        baseLut = mix(baseLut, activeThermal, 0.85);
      }

      float bloomMult = max(0.0, uBloomIntensity);
      float coreWhiteHot = exp(-iscoNormR * mix(3.2, 4.2, uAccretionState)) * (0.65 + 0.85 * uAccretionState) * max(0.45, bloomMult) * dopplerBoost * innerTaper;
      vec3 coreTone = (spectralMode == 2)
        ? vec3(0.88, 0.97, 1.0)
        : (spectralMode == 3)
        ? mix(vec3(1.0, 0.65, 0.35), vec3(0.75, 0.95, 1.0), clamp(approachCos * 0.5 + 0.5, 0.0, 1.0))
        : mix(vec3(1.0, 0.88, 0.56), vec3(1.0, 0.99, 0.94), uAccretionState);

      vec3 bloomGlow = coreTone * coreWhiteHot + baseLut * (0.45 * bloomMult * flux);
      vec3 diskColor = (baseLut * (0.48 * innerTaper + (0.75 + 0.60 * bloomMult) * flux) + bloomGlow) * innerTaper;
      if (uAccretionState > 0.5 && spectralMode == 0) {
        vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
        float outerRedMask = smoothstep(0.52, 0.92, normR);
        diskColor = mix(diskColor, activeThermal * (0.75 + 0.55 * radialProfile) * innerTaper, outerRedMask * 0.68);
      }

      float bloomAlphaBoost = 0.82 + 0.22 * min(2.0, bloomMult);
      float baseAlpha = clamp(radialProfile * innerTaper * (0.52 + 0.48 * diskFilaments) * min(1.4, dopplerBoost) * bloomAlphaBoost * mix(1.0, 1.25, uAccretionState), 0.0, 0.98);
      float stratumWeight = (absLayer > 0.01) ? (verticalDensityFalloff * 0.62) : 1.0;
      float diskAlpha = clamp(baseAlpha * stratumWeight * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress), 0.0, 0.98);

      vec3 tonemappedClassic = acesFilm(diskColor * (1.06 + 0.22 * bloomMult));
      if (uPulseStrength > 0.001) {
        float luma = dot(tonemappedClassic, vec3(0.299, 0.587, 0.114));
        vec3 neutralShock = mix(vec3(luma * 0.72), vec3(0.52, 0.55, 0.60), 0.35);
        tonemappedClassic = mix(tonemappedClassic, neutralShock, sonicCompression * 0.78);
        tonemappedClassic *= (1.0 - sonicRarefaction * 0.76);
        diskAlpha = clamp(diskAlpha * (1.0 - sonicRarefaction * 0.42 + sonicCompression * 0.15), 0.0, 0.98);
      }

      if (uDepthPeeling > 0.5 && diskAlpha < 0.045) {
        discard;
      }
      gl_FragColor = vec4(tonemappedClassic, diskAlpha);
      return;
    }

    // Volumetric Raymarched Mode (uDiskStyle >= 0.5)
    float starRadius = 1.65;
    float r_horizon = (isStar > 0.5) ? 0.0 : mix(2.12, 1.96, spin * 0.45);
    float r_isco = (isStar > 0.5) ? (starRadius * 1.35) : computeKerrIscoSceneRadius(spin, r_horizon);
    float rPlungeInner = (isStar > 0.5) ? (starRadius * 1.05) : (r_horizon * 1.02);
    float rOut = mix(5.6, 6.3, uAccretionState);

    if (r <= rPlungeInner || r > rOut) {
      discard;
    }

    vec2 unitDir = vLocalPos.xy / max(0.0001, r);
    float omega = 3.2 / (pow(r, 1.35) + 0.15 * spin);
    float twist = uTurbulenceBuffer.x * omega * 1.5 - 1.35 * log(max(0.1, r / r_isco)) + layerPhaseOffset * 0.35;
    float ct = cos(twist);
    float st = sin(twist);
    vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

    float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
    float sin2Phi = 2.0 * rotDir.x * rotDir.y;
    float cos3Phi = 4.0 * rotDir.x * rotDir.x * rotDir.x - 3.0 * rotDir.x;

    float turbBoost = mix(1.05, 1.38, uAccretionState);
    float fbmVol = fbmDisk2D(rotDir * (r * 0.72 * turbBoost) + vec2(uTurbulenceBuffer.y * 0.16, -uTurbulenceBuffer.z * 0.13 + layerPhaseOffset));
    float waveA = sin(r * 4.4 * turbBoost - uTurbulenceBuffer.z * 0.55 + cos2Phi * 1.15 + uTurbulenceBuffer.y + (fbmVol - 0.5) * 1.9 + layerPhaseOffset);
    float waveB = cos(r * 8.8 * turbBoost - uTurbulenceBuffer.z * 0.8 + waveA * (1.35 + 0.4 * uAccretionState) + sin2Phi * 0.85 - layerPhaseOffset * 0.6);
    float waveC = sin(r * 11.4 * turbBoost + cos3Phi * 0.9 - uTurbulenceBuffer.w + (fbmVol - 0.5) * 2.1 + layerPhaseOffset);
    float diskTurb = waveA * 0.5 + 0.5;
    float diskRings = waveB * 0.5 + 0.5;
    float plasmaBands = pow(mix(diskTurb, diskRings, 0.48), 1.22);
    float diskFilaments = clamp(mix(mix(fbmVol, plasmaBands, 0.62), waveC * 0.5 + 0.5, 0.26), 0.14, 1.0);

    vec2 toCamXZ = length(cameraPosition.xz) > 0.001
      ? normalize(cameraPosition.xz)
      : vec2(0.0, 1.0);
    vec2 worldUnitXZ = vWorldPos.xz / max(0.0001, length(vWorldPos.xz));
    vec2 tanVelXZ = vec2(-worldUnitXZ.y, worldUnitXZ.x);
    float approachCos = dot(tanVelXZ, toCamXZ);

    float beta = clamp(0.62 * inversesqrt(max(0.75, r - 0.5)), 0.05, 0.72);
    float dopplerFactor = 1.0 / (1.0 - beta * approachCos * uDopplerCoeffs.x);
    float dopplerBoost = mix(
      1.0,
      clamp(pow(clamp(dopplerFactor, 0.42, 2.15), 1.65), 0.42, 2.15),
      clamp(uDopplerCoeffs.x, 0.0, 1.0)
    );

    float normR = clamp((r - rPlungeInner) / (rOut - rPlungeInner), 0.0, 1.0);
    float shockGrowth = 1.0 - pow(max(0.0001, 1.0 - clamp(uExpansionProgress, 0.0, 1.0)), 2.6);
    float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
    float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);
    if (unfurlMask <= 0.001) {
      discard;
    }
    float ignitionWave = exp(-pow(abs((normR - diskUnfurl) / 0.09), 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

    // Smooth transition across the plunge region inside ISCO toward the event horizon
    float innerTaper = smoothstep(r_horizon * 1.02, r_isco, r);
    if (isStar > 0.5) {
      innerTaper = smoothstep(starRadius * 1.05, r_isco, r);
    } else {
      float rearLimbSoftener = mix(1.0, smoothstep(r_horizon * 0.96, r_horizon * 1.24, bView), smoothstep(0.42, -0.32, camProj));
      innerTaper *= rearLimbSoftener;
    }
    float corePeak = exp(-normR * 2.1);
    float sustainedBody = pow(max(0.0001, 1.0 - normR * 0.68), 0.55);
    float outerTaper = 1.0 - smoothstep(0.72, 1.0, normR);
    float diskDensity = mix(sustainedBody, corePeak, 0.35);
    diskDensity *= innerTaper;
    float radialProfile = diskDensity * outerTaper;

    float iscoNormR = clamp((r - r_isco) / max(0.001, rOut - r_isco), 0.0, 1.0);
    float breatheRate = 1.45 + 1.25 * clamp(accretionRate, 0.0, 2.5);
    float breatheAmp = 0.055 + 0.075 * clamp(accretionRate / 2.0, 0.0, 1.35);
    float accretionBreathing = 1.0 + breatheAmp * (
      0.65 * sin(uTurbulenceBuffer.x * breatheRate - normR * 2.8) +
      0.35 * cos(uTurbulenceBuffer.x * (breatheRate * 1.618) - iscoNormR * 4.5)
    );
    float activeEmissionMult = mix(1.18, 2.45, uAccretionState) * (1.0 + ignitionWave) * accretionBreathing;
    float accretionScale = (0.95 + 0.52 * clamp(accretionRate, 0.0, 2.5)) * activeEmissionMult;
    float innerCoreBoost = 1.0 + mix(1.75, 2.75, uAccretionState) * exp(-iscoNormR * 5.2) * innerTaper;
    float flux = radialProfile * innerCoreBoost * (0.32 + 0.68 * diskFilaments) * dopplerBoost * accretionScale;

    float sonicRarefaction = 0.0;
    float sonicCompression = 0.0;
    if (uPulseStrength > 0.001) {
      float dShock = r - uPulseRadius;
      float leadFront = exp(-pow(abs(dShock / 0.35), 2.0));
      float tailFront = exp(-pow(abs((dShock + 1.40) / 0.45), 2.0)) * 0.65;
      float rarefactionTrough = exp(-pow(abs((dShock + 0.65) / 0.55), 2.0));
      float acousticWake = sin(dShock * 5.6) * exp(-abs(dShock + 1.15) * 0.40) * step(dShock, 0.15) * 0.25;
      sonicCompression = clamp((leadFront + tailFront + max(0.0, acousticWake)) * uPulseStrength * innerTaper * outerTaper, 0.0, 1.0);
      sonicRarefaction = clamp(rarefactionTrough * uPulseStrength * innerTaper * outerTaper, 0.0, 0.88);
    }

    float lutU = clamp(flux / (1.0 + flux * 0.42), 0.04, 0.98);
    vec3 baseLut = texture2D(uSpectrumLut, vec2(lutU, 0.5)).rgb;

    vec3 colWhiteHot   = vec3(1.00, 0.97, 0.88);
    vec3 colBrightGold = vec3(1.00, 0.78, 0.28);
    vec3 colAmberFire  = vec3(0.95, 0.38, 0.07);
    vec3 colDeepRed    = vec3(0.58, 0.06, 0.015);

    vec3 physicalColorGradient;
    if (normR < 0.20) {
      physicalColorGradient = mix(colWhiteHot, colBrightGold, smoothstep(0.0, 0.20, normR));
    } else if (normR < 0.55) {
      physicalColorGradient = mix(colBrightGold, colAmberFire, smoothstep(0.20, 0.55, normR));
    } else {
      physicalColorGradient = mix(colAmberFire, colDeepRed, smoothstep(0.55, 0.96, normR));
    }

    if (spectralMode == 1) {
      baseLut = mix(vec3(0.18, 0.02, 0.01), vec3(1.0, 0.85, 0.42), lutU);
    } else if (spectralMode == 2) {
      baseLut = mix(vec3(0.06, 0.16, 0.42), vec3(0.84, 0.95, 1.0), lutU);
    } else if (spectralMode == 3) {
      baseLut = mix(vec3(0.95, 0.34, 0.08), vec3(0.22, 0.82, 1.0), clamp(approachCos * 0.5 + 0.5, 0.0, 1.0)) * (0.42 + 0.58 * diskFilaments);
    } else if (uAccretionState > 0.5) {
      vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
      baseLut = mix(baseLut * activeThermal, activeThermal, 0.82);
    } else {
      baseLut = mix(baseLut * physicalColorGradient, physicalColorGradient, 0.58);
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float whiteCoreGlow = (1.0 - smoothstep(0.0, mix(0.26, 0.34, uAccretionState), iscoNormR)) * (0.50 + 0.50 * diskFilaments) * dopplerBoost * (0.38 + 0.65 * bloomMult) * mix(1.15, 1.75, uAccretionState) * innerTaper;
    vec3 coreTone = (spectralMode == 2) ? vec3(0.88, 0.97, 1.0) : vec3(1.0, 0.96, 0.84);
    vec3 diskColor = (baseLut * (0.85 * innerTaper + (1.15 + 0.80 * bloomMult) * flux) + coreTone * whiteCoreGlow * (0.75 + 0.55 * bloomMult)) * innerTaper;

    // Beer-Lambert radiative transfer optical depth across the 3D volumetric stratum
    float opticalDepth = pow(max(0.0001, radialProfile), 0.76) * innerTaper * (0.58 + 0.42 * diskFilaments) * min(1.38, dopplerBoost) * (0.95 + 0.22 * min(2.0, bloomMult)) * mix(1.25, 1.55, uAccretionState);
    float beerLambertAlpha = 1.0 - exp(-opticalDepth * 1.45);
    float stratumWeight = (absLayer > 0.01) ? (verticalDensityFalloff * mix(0.54, 0.68, uAccretionState)) : 1.0;
    float diskAlpha = clamp(beerLambertAlpha * stratumWeight * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress), 0.0, 0.98);

    vec3 tonemappedColor = acesFilm(diskColor * (1.06 + 0.24 * bloomMult));
    if (uPulseStrength > 0.001) {
      float luma = dot(tonemappedColor, vec3(0.299, 0.587, 0.114));
      vec3 neutralShock = mix(vec3(luma * 0.72), vec3(0.52, 0.55, 0.60), 0.35);
      tonemappedColor = mix(tonemappedColor, neutralShock, sonicCompression * 0.78);
      tonemappedColor *= (1.0 - sonicRarefaction * 0.76);
      diskAlpha = clamp(diskAlpha * (1.0 - sonicRarefaction * 0.42 + sonicCompression * 0.15), 0.0, 0.98);
    }
    if (uDepthPeeling > 0.5 && diskAlpha < 0.045) {
      discard;
    }
    gl_FragColor = vec4(tonemappedColor, diskAlpha);
  }
`;



// 3. Relativistic Gravitational Lensing Shader (Supports both Classic Analytical Lensing & Volumetric 3D Raymarcher)
const LENSING_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const LENSING_FRAGMENT_SHADER_BODY = `
  uniform vec3 uCameraPos;
  uniform vec3 uBlackHolePos;
  uniform float uScale;
  uniform float uSpin;
  uniform float uAccretionRate;
  uniform float uDopplerStrength;
  uniform float uSpectralMode;
  uniform sampler2D uSpectrumLut;
  uniform float uLensingActive;
  uniform float uShowDisk;
  uniform float uIsStar;
  uniform float uPulseRadius;
  uniform float uPulseStrength;
  uniform float uTime;
  uniform float uDiskStyle;
  uniform float uBloomIntensity;
  uniform float uAccretionState;
  uniform float uExpansionProgress;
  uniform float uIsBinarySystem;
  uniform vec3 uCompanionStarPos;
  uniform float uCompanionStarRadius;
  uniform float uDepthPeeling;
  uniform float u_isOrbiting;
  uniform float u_stepCount;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float fastTurb2D(vec2 p) {
    return (sin(p.x * 1.35 + cos(p.y * 1.65)) + cos(p.y * 1.85 - sin(p.x * 1.45))) * 0.25 + 0.5;
  }

  float gyroidOctave(vec3 p) {
    return dot(sin(p), cos(p.yzx)) * 0.3333 + 0.5;
  }

  // Fast 3-octave 3D Fractional Brownian Motion (fBM) in Full Geodesic tier,
  // or single-octave gyroid evaluation in Approximated Null-Geodesic tier
  float fbmSphere(vec3 p) {
#if KERR_APPROX_NULL_GEODESIC == 1
    return clamp(gyroidOctave(p * 2.2), 0.0, 1.0);
#else
    float v = 0.52 * gyroidOctave(p * 2.2);
    p = vec3(p.y + p.z * 0.6, p.z - p.x * 0.6, p.x + p.y * 0.6) * 1.65 + vec3(1.7, 3.1, 2.3);
    v += 0.30 * gyroidOctave(p * 2.2);
    p = vec3(p.y - p.z * 0.6, p.z + p.x * 0.6, p.x - p.y * 0.6) * 1.65 + vec3(4.1, 1.9, 3.7);
    v += 0.18 * gyroidOctave(p * 2.2);
    return clamp(v, 0.0, 1.0);
#endif
  }

  // Evaluates gravitationally lensed light of the companion donor star (boiling fBM surface + coronal Fresnel glow)
  // along a deflected geodesic ray when the star passes behind the black hole
  void sampleLensedCompanionStar(
    vec3 rayOriginWorld,
    vec3 deflectedDirWorld,
    out vec3 outStarRgb,
    out float outStarAlpha
  ) {
    outStarRgb = vec3(0.0);
    outStarAlpha = 0.0;
    if (uIsBinarySystem < 0.5 || uCompanionStarRadius <= 0.01) return;

    // Only lens the companion star when it lies behind the black hole plane from the camera's perspective
    vec3 camToBH = uBlackHolePos - uCameraPos;
    vec3 camToStar = uCompanionStarPos - uCameraPos;
    float bhDist = length(camToBH);
    vec3 viewFwd = bhDist > 0.001 ? camToBH / bhDist : vec3(0.0, 0.0, -1.0);
    if (dot(camToStar, viewFwd) <= bhDist - uCompanionStarRadius * 0.35) return;

    vec3 oc = rayOriginWorld - uCompanionStarPos;
    float bProj = dot(oc, deflectedDirWorld);
    if (bProj >= 0.0) return; // Star is behind the ray origin

    float distSq = dot(oc, oc) - bProj * bProj;
    float coronaRadius = uCompanionStarRadius * 1.95;
    if (distSq >= coronaRadius * coronaRadius) return;

    float distImpact = sqrt(max(0.0, distSq));
    float rSurf = uCompanionStarRadius;

    if (distImpact < rSurf) {
      // Ray intersects the boiling fBM solar photosphere
      float thc = sqrt(max(0.0, rSurf * rSurf - distSq));
      float tHit = -bProj - thc;
      vec3 hitWorld = rayOriginWorld + deflectedDirWorld * tHit;
      vec3 n = normalize(hitWorld - uCompanionStarPos);
      float ndv = clamp(dot(n, -deflectedDirWorld), 0.0, 1.0);

      vec3 pFlow = n * 2.4 + vec3(uTime * 0.18, -uTime * 0.14, uTime * 0.12);
      float q1 = fbmSphere(pFlow);
      float boil = fbmSphere(pFlow * 1.9 + vec3(q1 * 1.35 - uTime * 0.22, uTime * 0.19, -q1 * 1.15));

      float granules = smoothstep(0.26, 0.78, boil);
      float sunspots = smoothstep(0.24, 0.38, q1 * 0.65 + boil * 0.35);
      float flareFilaments = pow(clamp(1.0 - abs(q1 - 0.52) * 3.6, 0.0001, 1.0), 2.4);

      vec3 colUmbra       = vec3(0.45, 0.06, 0.01);
      vec3 colPhotosphere = vec3(0.98, 0.38, 0.05);
      vec3 colGranulePeak = vec3(1.00, 0.78, 0.24);
      vec3 colSolarFlare  = vec3(1.00, 0.98, 0.90);

      vec3 surfaceCol = mix(colUmbra, colPhotosphere, sunspots);
      surfaceCol = mix(surfaceCol, colGranulePeak, granules);
      surfaceCol = mix(surfaceCol, colSolarFlare, flareFilaments * 0.65);

      float fresnel = pow(max(0.0001, 1.0 - ndv), 2.15);
      vec3 coronaGlow = vec3(1.00, 0.56, 0.14) * fresnel * 1.75 + vec3(1.00, 0.93, 0.74) * pow(max(0.0001, 1.0 - ndv), 5.0) * 1.15;
      float limbDarkening = mix(0.68, 1.15, pow(max(0.0001, ndv), 0.42));

      outStarRgb = (surfaceCol * limbDarkening * 1.45 + coronaGlow) * (1.0 + 0.35 * max(0.0, uBloomIntensity));
      outStarAlpha = 0.99;
    } else {
      // Ray grazes the volumetric solar corona surrounding the companion star
      float normCorona = clamp((distImpact - rSurf) / (coronaRadius - rSurf), 0.0, 1.0);
      vec3 closestWorld = rayOriginWorld - deflectedDirWorld * bProj;
      vec3 cDir = normalize(closestWorld - uCompanionStarPos);
      float streamer = fbmSphere(cDir * 2.8 - vec3(uTime * 0.28, uTime * 0.18, -uTime * 0.22));
      float coronaFalloff = exp(-normCorona * 3.6) * (1.0 - normCorona) * (0.68 + 0.65 * streamer);
      vec3 coronaCol = mix(vec3(1.00, 0.86, 0.48), vec3(0.98, 0.34, 0.05), smoothstep(0.0, 0.75, normCorona));
      outStarRgb = coronaCol * coronaFalloff * (1.55 + 0.45 * max(0.0, uBloomIntensity));
      outStarAlpha = clamp(coronaFalloff * 0.92, 0.0, 0.95);
    }
  }

  // HDR Tone Mapping: smooth Reinhard highlight shoulder + ACES filmic curve
  vec3 acesFilm(vec3 x) {
    vec3 r = x / (1.0 + x * 0.14);
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((r * (a * r + b)) / (r * (c * r + d) + e), 0.0, 1.0);
  }

  // High-energy thermal blackbody color progression for Active Accretion State:
  // Burns incandescent white-hot at the inner core, transitions to bright gold, and tapers to deep red at the outer edges
  vec3 computeActiveThermalSpectrum(float normR, float boostedFlux, float filaments) {
    float radialHeat = pow(clamp(1.0 - normR, 0.0001, 1.0), 0.82);
    float fluxHeat = clamp(boostedFlux / (1.25 + boostedFlux * 0.30), 0.0, 1.0);
    float T = clamp(mix(radialHeat, fluxHeat, 0.42) + (1.0 - normR) * 0.24 + (filaments - 0.5) * 0.08, 0.0, 1.0);

    vec3 colDeepRed    = vec3(0.54, 0.03, 0.008);
    vec3 colCrimson    = vec3(0.88, 0.15, 0.02);
    vec3 colAmberFire  = vec3(0.98, 0.45, 0.06);
    vec3 colBrightGold = vec3(1.00, 0.82, 0.24);
    vec3 colWhiteHot   = vec3(1.00, 0.99, 0.94);

    if (T > 0.76) {
      return mix(colBrightGold, colWhiteHot, smoothstep(0.76, 0.94, T));
    } else if (T > 0.48) {
      return mix(colAmberFire, colBrightGold, smoothstep(0.48, 0.76, T));
    } else if (T > 0.22) {
      return mix(colCrimson, colAmberFire, smoothstep(0.22, 0.48, T));
    } else {
      return mix(colDeepRed, colCrimson, smoothstep(0.0, 0.22, T));
    }
  }

  // Evaluates accretion disk density & emission at equatorial/volumetric crossing hitXZ without any atan/atan2 discontinuity
  void sampleEquatorialDisk(
    vec2 hitXZ,
    float verticalY,
    vec3 rayDir,
    float rHit,
    float r_horizon,
    float rIn,
    float rOut,
    float spin,
    out vec3 outColor,
    out float outAlpha
  ) {
    outColor = vec3(0.0);
    outAlpha = 0.0;

    float rPlungeInner = r_horizon * 1.02;
    if (uExpansionProgress < 0.02 || rHit <= rPlungeInner || rHit > rOut) {
      return;
    }

    vec2 unitDir = hitXZ / max(0.0001, rHit);
    float omega = 3.2 / (pow(max(0.0001, rHit), 1.35) + 0.15 * spin);
    float twist = uTime * omega * 1.5 - 1.35 * log(max(0.1, rHit / rIn)) + verticalY * 0.55;
    float ct = cos(twist);
    float st = sin(twist);
    vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

    float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
    float sin2Phi = 2.0 * rotDir.x * rotDir.y;

    float turbScale = mix(1.05, 1.38, uAccretionState);
    float turbA = fastTurb2D(rotDir * (rHit * 0.62 * turbScale) + vec2(uTime * 0.12, -uTime * 0.10 + verticalY * 0.42));
    float band1 = sin(rHit * 4.4 * turbScale - uTime * 1.8 + cos2Phi * 1.15 + (turbA - 0.5) * (2.0 + 0.65 * uAccretionState) + verticalY * 1.35) * 0.5 + 0.5;
#if KERR_APPROX_NULL_GEODESIC == 1
    float diskFilaments = clamp(mix(turbA, band1, 0.68), 0.14, 1.0);
#else
    float turbB = fastTurb2D(rotDir * (rHit * 1.28 * turbScale) - vec2(uTime * 0.16, uTime * 0.14 - verticalY * 0.52));
    float band2 = cos(rHit * 8.8 * turbScale - uTime * 2.5 + sin2Phi * 0.85 + (turbB - 0.5) * (1.5 + 0.55 * uAccretionState) - verticalY * 1.05) * 0.5 + 0.5;
    float plasmaBands = pow(max(0.0001, mix(band1, band2, 0.45)), 1.22);
    float diskFilaments = clamp(mix(turbA, plasmaBands, 0.72), 0.14, 1.0);
#endif

    vec2 toCamXZ = length(uCameraPos.xz - uBlackHolePos.xz) > 0.001
      ? normalize(uCameraPos.xz - uBlackHolePos.xz)
      : vec2(0.0, 1.0);
    // Match worldXZ tangential orbital velocity direction of mainDiskMesh (where hitXZ = vec2(worldX, -worldZ))
    vec2 worldUnitXZ = vec2(unitDir.x, -unitDir.y);
    vec2 tanVelXZ = vec2(-worldUnitXZ.y, worldUnitXZ.x);
    float approach = dot(tanVelXZ, toCamXZ);
    float beta = clamp(0.62 / sqrt(max(0.75, rHit - 0.5)), 0.05, 0.72);
    float dopplerFactor = 1.0 / (1.0 - beta * approach * uDopplerStrength);
    float dopplerBoost = mix(
      1.0,
      clamp(pow(clamp(dopplerFactor, 0.42, 2.15), 1.65), 0.42, 2.15),
      clamp(uDopplerStrength, 0.0, 1.0)
    );

    float normR = clamp((rHit - rPlungeInner) / (rOut - rPlungeInner), 0.0, 1.0);
    float shockGrowth = 1.0 - pow(max(0.0001, 1.0 - clamp(uExpansionProgress, 0.0, 1.0)), 2.6);
    float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
    float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);
    if (unfurlMask <= 0.001) {
      return;
    }
    float ignitionWave = exp(-pow(abs((normR - diskUnfurl) / 0.09), 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

    // Smooth transition across the plunge region inside ISCO toward the event horizon
    float innerTaper = smoothstep(r_horizon * 1.02, rIn, rHit);
    float corePeak = exp(-normR * 2.1);
    float sustainedBody = pow(max(0.0001, 1.0 - normR * 0.68), 0.55);
    float outerTaper = 1.0 - smoothstep(0.72, 1.0, normR);
    float diskDensity = mix(sustainedBody, corePeak, 0.35);
    diskDensity *= innerTaper;
    float radialProfile = diskDensity * outerTaper;

    // Boosted base emission multiplier in Active and Volumetric modes + accretion-rate breathing feedback loop
    float iscoNormR = clamp((rHit - rIn) / max(0.001, rOut - rIn), 0.0, 1.0);
    float breatheRate = 1.45 + 1.25 * clamp(uAccretionRate, 0.0, 2.5);
    float breatheAmp = 0.055 + 0.075 * clamp(uAccretionRate / 2.0, 0.0, 1.35);
    float accretionBreathing = 1.0 + breatheAmp * (
      0.65 * sin(uTime * breatheRate - normR * 2.8) +
      0.35 * cos(uTime * (breatheRate * 1.618) - iscoNormR * 4.5)
    );
    float activeEmissionMult = mix(1.18, 2.45, uAccretionState) * (1.0 + ignitionWave) * accretionBreathing;
    float accretionScale = (0.95 + 0.52 * clamp(uAccretionRate, 0.0, 2.5)) * activeEmissionMult;
    float innerCoreBoost = 1.0 + mix(1.75, 2.75, uAccretionState) * exp(-iscoNormR * 5.2) * innerTaper;
    float flux = radialProfile * innerCoreBoost * (0.34 + 0.66 * diskFilaments) * dopplerBoost * accretionScale;

    float sonicRarefaction = 0.0;
    float sonicCompression = 0.0;
    if (uPulseStrength > 0.001) {
      float dShock = rHit - uPulseRadius;
      float leadFront = exp(-pow(abs(dShock / 0.35), 2.0));
      float tailFront = exp(-pow(abs((dShock + 1.40) / 0.45), 2.0)) * 0.65;
      float rarefactionTrough = exp(-pow(abs((dShock + 0.65) / 0.55), 2.0));
      float acousticWake = sin(dShock * 5.6) * exp(-abs(dShock + 1.15) * 0.40) * step(dShock, 0.15) * 0.25;
      sonicCompression = clamp((leadFront + tailFront + max(0.0, acousticWake)) * uPulseStrength * innerTaper * outerTaper, 0.0, 1.0);
      sonicRarefaction = clamp(rarefactionTrough * uPulseStrength * innerTaper * outerTaper, 0.0, 0.88);
    }

    float lutU = clamp(flux / (1.0 + flux * 0.42), 0.04, 0.98);
    vec3 baseLut = texture2D(uSpectrumLut, vec2(lutU, 0.5)).rgb;

    vec3 colWhiteHot   = vec3(1.00, 0.97, 0.88);
    vec3 colBrightGold = vec3(1.00, 0.78, 0.28);
    vec3 colAmberFire  = vec3(0.95, 0.38, 0.07);
    vec3 colDeepRed    = vec3(0.58, 0.06, 0.015);

    vec3 physicalColorGradient;
    if (normR < 0.20) {
      physicalColorGradient = mix(colWhiteHot, colBrightGold, smoothstep(0.0, 0.20, normR));
    } else if (normR < 0.55) {
      physicalColorGradient = mix(colBrightGold, colAmberFire, smoothstep(0.20, 0.55, normR));
    } else {
      physicalColorGradient = mix(colAmberFire, colDeepRed, smoothstep(0.55, 0.96, normR));
    }

    int spectralMode = int(uSpectralMode + 0.5);
    if (spectralMode == 1) {
      baseLut = mix(vec3(0.18, 0.02, 0.01), vec3(1.0, 0.85, 0.42), lutU);
    } else if (spectralMode == 2) {
      baseLut = mix(vec3(0.06, 0.16, 0.42), vec3(0.84, 0.95, 1.0), lutU);
    } else if (spectralMode == 3) {
      baseLut = mix(vec3(0.95, 0.34, 0.08), vec3(0.22, 0.82, 1.0), clamp(approach * 0.5 + 0.5, 0.0, 1.0)) * (0.42 + 0.58 * diskFilaments);
    } else if (uAccretionState > 0.5) {
      vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
      baseLut = mix(baseLut * activeThermal, activeThermal, 0.82);
    } else {
      baseLut = mix(baseLut * physicalColorGradient, physicalColorGradient, 0.58);
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float whiteCoreGlow = (1.0 - smoothstep(0.0, mix(0.26, 0.34, uAccretionState), iscoNormR)) * (0.50 + 0.50 * diskFilaments) * dopplerBoost * (0.38 + 0.65 * bloomMult) * mix(1.15, 1.75, uAccretionState) * innerTaper;
    vec3 coreTone = (spectralMode == 2) ? vec3(0.88, 0.97, 1.0) : vec3(1.0, 0.96, 0.84);
    outColor = (baseLut * (0.85 * innerTaper + (1.15 + 0.80 * bloomMult) * flux) + coreTone * whiteCoreGlow * (0.75 + 0.55 * bloomMult)) * innerTaper;
    outAlpha = clamp(pow(max(0.0001, radialProfile), 0.76) * innerTaper * (0.62 + 0.38 * diskFilaments) * min(1.38, dopplerBoost) * (0.88 + 0.20 * min(2.0, bloomMult)) * mix(1.12, 1.32, uAccretionState) * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress), 0.0, 0.98);

    if (uPulseStrength > 0.001) {
      float luma = dot(outColor, vec3(0.299, 0.587, 0.114));
      vec3 neutralShock = mix(vec3(luma * 0.72), vec3(0.52, 0.55, 0.60), 0.35);
      outColor = mix(outColor, neutralShock, sonicCompression * 0.78);
      outColor *= (1.0 - sonicRarefaction * 0.76);
      outAlpha = clamp(outAlpha * (1.0 - sonicRarefaction * 0.42 + sonicCompression * 0.15), 0.0, 0.98);
    }
  }

  void main() {
    vec2 uvCentered = (vUv - vec2(0.5)) * 44.0;
    float rQuad = length(uvCentered);
    float spin = clamp(uSpin, 0.0, 1.0);

    // Smooth edge fade of expanded outer quad
    float quadFade = 1.0 - smoothstep(18.5, 21.8, rQuad);
    if (quadFade <= 0.001) discard;
    if (uIsBinarySystem < 0.5 && rQuad > 6.45) discard;

    // Classic Mode (uDiskStyle < 0.5):
    // Renders the original Einstein-lensed upper & lower arches + shadow + photon ring while mainDiskMesh renders the 3D equatorial ring
    if (uDiskStyle < 0.5) {
      vec3 rayDir = normalize(vWorldPos - uCameraPos);
      vec3 toCenter = uBlackHolePos - uCameraPos;
      float tClosest = dot(toCenter, rayDir);
      vec3 pClosest = uCameraPos + rayDir * tClosest - uBlackHolePos;
      vec3 pLocal = pClosest / max(0.01, uScale);
      float b = length(pLocal);
      if (uIsBinarySystem < 0.5 && b > 6.35) discard;
      float r_base = mix(2.12, 1.96, spin * 0.45);
      // Bardeen D-shaped Kerr shadow profile: frame-dragging flattens the prograde (approaching) limb at high spin a*
      float progradeCos = clamp(-uvCentered.x / max(0.001, length(uvCentered)), 0.0, 1.0);
      float equatorialWeight = 1.0 - smoothstep(0.0, 1.35, abs(uvCentered.y) / max(0.5, r_base));
      float r_horizon = r_base * (1.0 - 0.075 * spin * spin * progradeCos * equatorialWeight);

      if (uIsStar < 0.5 && b < r_horizon) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      float bloomMult = max(0.0, uBloomIntensity);
      float distFromHorizon = max(0.0, b - r_horizon);

      vec3 lensedDiskColor = vec3(0.0);
      float lensedDiskAlpha = 0.0;

      if (uShowDisk > 0.5 && uLensingActive > 0.5 && uExpansionProgress > 0.02 && b >= r_horizon) {
#if KERR_APPROX_NULL_GEODESIC == 1
        float r_isco = r_horizon * (1.64 - 0.38 * spin * spin);
#else
        float aIsco = clamp(spin, 0.0, 0.999);
        float cbrt1 = pow(max(0.0001, 1.0 - aIsco * aIsco), 1.0 / 3.0);
        float z1 = 1.0 + cbrt1 * (pow(1.0 + aIsco, 1.0 / 3.0) + pow(max(0.0001, 1.0 - aIsco), 1.0 / 3.0));
        float z2 = sqrt(3.0 * aIsco * aIsco + z1 * z1);
        float rIscoRg = 3.0 + z2 - sqrt(max(0.0, (3.0 - z1) * (3.0 + z1 + 2.0 * z2)));
        float r_isco = r_horizon * 1.22 + clamp((rIscoRg - 1.0) / 5.0, 0.0, 1.0) * 0.42;
#endif
        float rPlungeInner = r_horizon * 1.02;
        float rOut = mix(5.5, 6.2, uAccretionState);

        // Analytical Einstein gravitational deflection of rays passing above and below the shadow
        // plus Schlieren sonic-boom refractive shock deflection at b ≈ uPulseRadius
        float shockRefraction = 0.0;
        if (uPulseStrength > 0.001) {
          float dWave = b - uPulseRadius;
          shockRefraction = -dWave * exp(-pow(abs(dWave / 0.55), 2.0)) * uPulseStrength * 0.38;
        }
        float alpha = clamp((2.1 * r_horizon) / (b + 0.12) + shockRefraction, 0.0, 1.48);
        vec3 inward = -pLocal / max(0.0001, b);
        vec3 bentDir = normalize(rayDir + inward * sin(alpha));

        // In Active mode, rays near the equatorial limbs (where bentDir.y is small) still intersect the
        // volumetrically thick vertical torus H(r) so the lensed arcs smoothly connect to the equatorial disk!
        float effectiveBentY = bentDir.y;
        if (uAccretionState > 0.5 && abs(effectiveBentY) < 0.22) {
          effectiveBentY = (pLocal.y >= 0.0 ? -1.0 : 1.0) * mix(0.22, abs(effectiveBentY), abs(effectiveBentY) / 0.22);
        }

        if (abs(effectiveBentY) > 0.015) {
          float tCross = -pLocal.y / effectiveBentY;
          if (tCross > 0.0) {
            vec3 hitPos = pLocal + bentDir * tCross;
            float rHit = length(hitPos.xz);
            if (uAccretionState > 0.5) {
              // Blend limb radial coordinate so equatorial ansae smoothly bridge into the main equatorial torus
              float limbBlend = exp(-abs(pLocal.y) * 1.35);
              rHit = mix(rHit, b, limbBlend * 0.65);
            }

            if (rHit > rPlungeInner && rHit <= rOut) {
              float normR = clamp((rHit - rPlungeInner) / (rOut - rPlungeInner), 0.0, 1.0);
              float shockGrowth = 1.0 - pow(max(0.0001, 1.0 - clamp(uExpansionProgress, 0.0, 1.0)), 2.6);
              float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
              float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);

              // Smooth transition across the plunge region inside ISCO toward the event horizon (evaluated early to skip turbulence in masked regions)
              float innerTaper = smoothstep(r_horizon * 1.02, r_isco, rHit);
              float outerTaper = 1.0 - smoothstep(rOut - mix(1.15, 1.45, uAccretionState), rOut, rHit);
              float diskDensity = pow(max(0.0001, 1.0 - normR), mix(1.25, 0.92, uAccretionState)) * innerTaper;
              float radialProfile = diskDensity * outerTaper;
              float quiescentArchMask = smoothstep(0.16, 0.72, abs(pLocal.y));
              float earlyMask = unfurlMask * radialProfile * innerTaper * mix(quiescentArchMask, 1.0, uAccretionState);

              if (earlyMask > 0.002) {
                vec2 unitDir = hitPos.xz / max(0.0001, rHit);
                float omega = 3.2 / (pow(rHit, 1.45) + 0.15 * spin);
                float twist = uTime * omega * 1.5 - 1.35 * log(max(0.1, rHit / r_isco));
                float ct = cos(twist);
                float st = sin(twist);
                vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

                float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
                float sin2Phi = 2.0 * rotDir.x * rotDir.y;

                float turbScale = mix(1.0, 1.35, uAccretionState);
                float turbA = fastTurb2D(rotDir * (rHit * 0.65 * turbScale) + vec2(uTime * 0.12, -uTime * 0.10));
                float band1 = sin(rHit * 5.2 * turbScale - uTime * 1.8 + cos2Phi * 1.15 + (turbA - 0.5) * (1.8 + 0.65 * uAccretionState)) * 0.5 + 0.5;
#if KERR_APPROX_NULL_GEODESIC == 1
                float turbVertical = 0.5;
                float diskFilaments = mix(turbA, band1, 0.65);
#else
                float turbVertical = fastTurb2D(vec2(pLocal.x * 0.45 + uTime * 0.18, pLocal.y * 0.55 - uTime * 0.14));
                float band2 = cos(rHit * 10.4 * turbScale - uTime * 2.4 + sin2Phi * 0.85 + (turbVertical - 0.5) * 1.2 * uAccretionState) * 0.5 + 0.5;
                float diskFilaments = mix(turbA, mix(band1, band2, 0.45), 0.65);
                if (uAccretionState > 0.5) {
                  diskFilaments = mix(diskFilaments, turbVertical, 0.28);
                }
#endif

                float approach = clamp(uvCentered.x / max(0.001, length(uvCentered)), -1.0, 1.0);
                float beta = clamp(0.68 / sqrt(max(0.75, rHit - 0.4)), 0.05, 0.78);
                float dopplerFactor = 1.0 / (1.0 - beta * approach * uDopplerStrength);
                float dopplerBoost = pow(clamp(dopplerFactor, 0.35, 2.35), 2.1);

                float ignitionWave = exp(-pow(abs((normR - diskUnfurl) / 0.09), 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

                // Constraint 1: In Quiescent mode, archMask masks near the equatorial plane for the razor-thin disk.
                // In Active mode, apply a sleek, thinner vertical Y-axis density scale so the lensed arcs connect cleanly
                float scaleHeightY = 0.72 + 0.18 * max(0.0, b - r_isco);
                float yTurbOffset = (turbVertical - 0.5) * 0.65;
                float activeVolumetricEnvelope = exp(-pow(max(0.0001, abs(pLocal.y + yTurbOffset) - 0.35) / scaleHeightY, 1.45));
                float activeArchMask = mix(0.78, 1.0, smoothstep(0.0, 0.45, abs(pLocal.y))) * clamp(activeVolumetricEnvelope * 1.15, 0.0, 1.0);
                float archMask = mix(quiescentArchMask, activeArchMask, uAccretionState) * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress);

                // Constraint 2: Significantly increase base emission intensity in Active mode + accretion-rate breathing feedback loop
                float breatheRate = 1.45 + 1.25 * clamp(uAccretionRate, 0.0, 2.5);
                float breatheAmp = 0.055 + 0.075 * clamp(uAccretionRate / 2.0, 0.0, 1.35);
                float accretionBreathing = 1.0 + breatheAmp * (
                  0.65 * sin(uTime * breatheRate - normR * 2.8) +
                  0.35 * cos(uTime * (breatheRate * 1.618) - normR * 4.2)
                );
                float activeEmissionMult = mix(1.0, 2.45, uAccretionState) * (1.0 + ignitionWave) * accretionBreathing;
                float flux = radialProfile * (0.28 + 0.72 * diskFilaments) * dopplerBoost * (0.65 + 0.45 * uAccretionRate) * activeEmissionMult;
                float sonicRarefaction = 0.0;
                float sonicCompression = 0.0;
                if (uPulseStrength > 0.001) {
                  float dShock = rHit - uPulseRadius;
                  float leadFront = exp(-pow(abs(dShock / 0.35), 2.0));
                  float tailFront = exp(-pow(abs((dShock + 1.35) / 0.45), 2.0)) * 0.65;
                  float rarefactionTrough = exp(-pow(abs((dShock + 0.62) / 0.52), 2.0));
                  sonicCompression = clamp((leadFront + tailFront) * uPulseStrength * innerTaper * outerTaper, 0.0, 1.0);
                  sonicRarefaction = clamp(rarefactionTrough * uPulseStrength * innerTaper * outerTaper, 0.0, 1.0);
                }
                float lutU = clamp(flux * 0.65, 0.02, 0.99);
                vec3 baseLut = texture2D(uSpectrumLut, vec2(lutU, 0.5)).rgb;

                int spectralMode = int(uSpectralMode + 0.5);
                if (spectralMode == 1) {
                  baseLut = mix(vec3(0.18, 0.02, 0.01), vec3(1.0, 0.85, 0.42), lutU);
                } else if (spectralMode == 2) {
                  baseLut = mix(vec3(0.06, 0.16, 0.42), vec3(0.84, 0.95, 1.0), lutU);
                } else if (spectralMode == 3) {
                  baseLut = mix(vec3(0.95, 0.34, 0.08), vec3(0.22, 0.82, 1.0), clamp(approach * 0.5 + 0.5, 0.0, 1.0)) * (0.42 + 0.58 * diskFilaments);
                } else if (uAccretionState > 0.5) {
                  vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
                  baseLut = mix(baseLut, activeThermal, 0.85);
                }

                float iscoNormR = clamp((rHit - r_isco) / max(0.001, rOut - r_isco), 0.0, 1.0);
                float innerArchBloom = exp(-iscoNormR * mix(3.0, 3.8, uAccretionState)) * max(0.45, bloomMult) * mix(0.55, 1.25, uAccretionState) * dopplerBoost * innerTaper;
                vec3 coreTone = (spectralMode == 2)
                  ? vec3(0.88, 0.97, 1.0)
                  : (spectralMode == 3)
                  ? mix(vec3(1.0, 0.65, 0.35), vec3(0.75, 0.95, 1.0), clamp(approach * 0.5 + 0.5, 0.0, 1.0))
                  : mix(vec3(1.0, 0.88, 0.56), vec3(1.0, 0.99, 0.94), uAccretionState);

                lensedDiskColor = (baseLut * (0.48 * innerTaper + (0.75 + 0.60 * bloomMult) * flux) + coreTone * innerArchBloom) * innerTaper * archMask;
                if (uAccretionState > 0.5 && spectralMode == 0) {
                  vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
                  float outerRedMask = smoothstep(0.52, 0.92, normR);
                  lensedDiskColor = mix(lensedDiskColor, activeThermal * (0.75 + 0.55 * radialProfile) * innerTaper * archMask, outerRedMask * 0.68);
                }
                lensedDiskAlpha = clamp(radialProfile * innerTaper * (0.48 + 0.52 * diskFilaments) * min(1.4, dopplerBoost) * (0.82 + 0.22 * min(2.0, bloomMult)) * mix(1.0, 1.28, uAccretionState), 0.0, 0.98) * archMask;
                if (uPulseStrength > 0.001) {
                  float luma = dot(lensedDiskColor, vec3(0.299, 0.587, 0.114));
                  vec3 neutralShock = mix(vec3(luma * 0.72), vec3(0.52, 0.55, 0.60) * archMask, 0.35);
                  lensedDiskColor = mix(lensedDiskColor, neutralShock, sonicCompression * 0.78);
                  lensedDiskColor *= (1.0 - sonicRarefaction * 0.76);
                  lensedDiskAlpha = clamp(lensedDiskAlpha * (1.0 - sonicRarefaction * 0.42 + sonicCompression * 0.15), 0.0, 0.97);
                }
              }
            }
          }
        }
      }

      // Companion Star Gravitational Lensing (Analytical Einstein deflection when star passes behind the black hole)
      vec3 lensedStarRgb = vec3(0.0);
      float lensedStarAlpha = 0.0;
      if (uIsBinarySystem > 0.5 && uLensingActive > 0.5 && b >= r_horizon) {
        float starLensAlpha = clamp((2.15 * r_horizon) / (b + 0.10), 0.0, 1.52);
        vec3 inwardWorld = -pClosest / max(0.0001, length(pClosest));
        vec3 starBentDir = normalize(rayDir + inwardWorld * sin(starLensAlpha));
        sampleLensedCompanionStar(vWorldPos, starBentDir, lensedStarRgb, lensedStarAlpha);
        float nearPhotonBoost = 1.0 + 0.85 * exp(-distFromHorizon * 1.6);
        lensedStarRgb *= nearPhotonBoost;
      }

      float einsteinGlow = (uIsStar > 0.5 || uLensingActive < 0.5 || uShowDisk > 0.5)
        ? 0.0
        : smoothstep(0.0, 0.28, distFromHorizon) * clamp(0.10 / (distFromHorizon + 0.22), 0.0, 0.35) * (0.12 + 0.12 * bloomMult);
      vec3 einsteinColor = vec3(0.22, 0.38, 0.62) * einsteinGlow;

      // Composite lensed companion star behind the foreground/lensed accretion disk
      vec3 combinedLensedRgb = lensedDiskColor + lensedStarRgb * (1.0 - lensedDiskAlpha * 0.82);
      float combinedLensedAlpha = max(lensedDiskAlpha, lensedStarAlpha);

      vec3 finalRgb = combinedLensedRgb + einsteinColor;
      float finalAlpha = clamp(max(combinedLensedAlpha, einsteinGlow), 0.0, 1.0) * quadFade;
      if (finalAlpha <= (uDepthPeeling > 0.5 ? 0.035 : 0.002)) discard;
      gl_FragColor = vec4(finalRgb, finalAlpha);
      return;
    }

    // Volumetric Raymarched Mode (uDiskStyle >= 0.5):
    // Uses true perspective camera ray (pClosest / uScale) so shadow boundary r_horizon and ISCO rIn
    // lock 1:1 with the 3D black hole shadow and 3D volumetric torus strata at all zoom levels and angles.
    vec3 rayDir = normalize(vWorldPos - uCameraPos);
    vec3 toCenter = uBlackHolePos - uCameraPos;
    float tClosest = dot(toCenter, rayDir);
    vec3 pClosest = uCameraPos + rayDir * tClosest - uBlackHolePos;
    vec3 pLocal = pClosest / max(0.01, uScale);
    float b = length(pLocal);

    float r_base = (uIsStar > 0.5) ? 0.0 : mix(2.12, 1.96, spin * 0.45);
    float progradeCosRM = clamp(-uvCentered.x / max(0.001, length(uvCentered)), 0.0, 1.0);
    float equatorialWeightRM = 1.0 - smoothstep(0.0, 1.35, abs(uvCentered.y) / max(0.5, r_base));
    float r_horizon = r_base * (1.0 - 0.075 * spin * spin * progradeCosRM * equatorialWeightRM);

    if (uIsStar < 0.5 && b < r_horizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float distFromHorizon = max(0.0, b - r_horizon);

#if KERR_APPROX_NULL_GEODESIC == 1
    float rIn = r_horizon * (1.64 - 0.38 * spin * spin);
#else
    float aIsco = clamp(spin, 0.0, 0.999);
    float cbrt1 = pow(max(0.0001, 1.0 - aIsco * aIsco), 1.0 / 3.0);
    float z1 = 1.0 + cbrt1 * (pow(1.0 + aIsco, 1.0 / 3.0) + pow(max(0.0001, 1.0 - aIsco), 1.0 / 3.0));
    float z2 = sqrt(3.0 * aIsco * aIsco + z1 * z1);
    float rIscoRg = 3.0 + z2 - sqrt(max(0.0, (3.0 - z1) * (3.0 + z1 + 2.0 * z2)));
    float rIn = r_horizon * 1.22 + clamp((rIscoRg - 1.0) / 5.0, 0.0, 1.0) * 0.42;
#endif
    float rOut = mix(5.6, 6.3, uAccretionState);

    vec3 accumColor = vec3(0.0);
    float accumAlpha = 0.0;

    if (uShowDisk > 0.5 && uLensingActive > 0.5 && uExpansionProgress > 0.02 && b >= r_horizon && b <= rOut + 1.05) {
      float shockRefraction = 0.0;
      if (uPulseStrength > 0.001) {
        float dWave = b - uPulseRadius;
        shockRefraction = -dWave * exp(-pow(abs(dWave / 0.55), 2.0)) * uPulseStrength * 0.38;
      }

      // Relativistic Kerr deflection + Lense-Thirring frame-dragging twist around the spin axis
      float alpha = clamp((2.12 * r_horizon) / (b + 0.12) + shockRefraction, 0.0, 1.48);
      vec3 inward = -pLocal / max(0.0001, b);
      vec3 frameDragTangent = vec3(-inward.z, 0.0, inward.x) * (0.18 * spin * (r_horizon / (b + 0.25)));
      vec3 bentDir = normalize(rayDir + inward * sin(alpha) + frameDragTangent);

      // Ensure smooth grazing intersection across the volumetric vertical torus H(r) near the equatorial limbs
      float effectiveBentY = bentDir.y;
      float minGrazingY = mix(0.20, 0.25, uAccretionState);
      if (abs(effectiveBentY) < minGrazingY) {
        effectiveBentY = (pLocal.y >= 0.0 ? -1.0 : 1.0) * mix(minGrazingY, abs(effectiveBentY), abs(effectiveBentY) / minGrazingY);
      }

      if (abs(effectiveBentY) > 0.012) {
        float tCenter = -pLocal.y / effectiveBentY;
        if (tCenter > 0.0) {
          float torusHalfHeight = mix(0.34, 0.54, uAccretionState);
          float tHalfSpan = clamp(torusHalfHeight / max(0.18, abs(effectiveBentY)), 0.15, 1.65);
          float limbBlend = exp(-abs(pLocal.y) * 1.35);

          // Front-to-Back Beer-Lambert Volumetric Geodesic Raymarcher through the lensed 3D plasma torus
          // VOL_RAYMARCH_STEPS is 5 in 'Full Geodesic' tier and 2 in 'Approximated Null-Geodesic' tier;
          // u_stepCount dynamically throttles active raymarching steps under sustained GPU thermal/load bottlenecks
          int activeStepCount = clamp(int(u_stepCount + 0.5), 1, VOL_RAYMARCH_STEPS);
          float transmittance = 1.0;
          float orbitStepMult = mix(1.0, 1.45, clamp(u_isOrbiting, 0.0, 1.0));
          float tSpanHalf = tHalfSpan * 0.72;
          float tStart = tCenter - tSpanHalf;
          float tEnd = tCenter + tSpanHalf;
          float baseDt = (2.0 * tSpanHalf) / float(activeStepCount);
          float dt = baseDt * orbitStepMult;
          float tCurr = tStart + 0.5 * dt;
          for (int i = 0; i < VOL_RAYMARCH_STEPS; i++) {
            if (i >= activeStepCount || (uDepthPeeling > 0.5 && i >= 3) || tCurr > tEnd + 0.001) {
              break;
            }
            float sNorm = clamp((tCurr - tCenter) / max(0.001, tSpanHalf), -1.0, 1.0);
            float tSample = max(0.02, tCurr);
            vec3 samplePos = pLocal + bentDir * tSample;
            float rHit = length(samplePos.xz);
            rHit = mix(rHit, b, limbBlend * mix(0.52, 0.68, uAccretionState));

            vec3 stepCol;
            float stepAlpha;
            // Pass vec2(samplePos.x, -samplePos.z) so spiral handedness matches mainDiskMesh (rotated -PI/2 around X)
            sampleEquatorialDisk(
              vec2(samplePos.x, -samplePos.z),
              sNorm,
              bentDir,
              rHit,
              r_horizon,
              rIn,
              rOut,
              spin,
              stepCol,
              stepAlpha
            );

            if (stepAlpha > 0.001) {
              float vertDensity = exp(-pow(abs(sNorm), 1.60) * 2.10);
              float stepOpticalDepth = stepAlpha * vertDensity * (0.28 + 0.08 * uAccretionState) * orbitStepMult * (5.0 / float(activeStepCount));
              float stepAbsorb = 1.0 - exp(-stepOpticalDepth * 1.65);
              accumColor += transmittance * stepCol * stepAbsorb;
              transmittance *= (1.0 - stepAbsorb * 0.90);
              if (transmittance < (uDepthPeeling > 0.5 ? 0.08 : 0.02)) {
                break;
              }
            }
            tCurr += dt;
          }

          accumAlpha = clamp(1.0 - transmittance, 0.0, 0.98);

          // Relativistic n=2 Secondary Photon-Ring Caustic (demagnified multi-orbit light ring hugging the Kerr shadow boundary)
          float photonRingProfile = exp(-pow((distFromHorizon - 0.055) / mix(0.095, 0.135, uAccretionState), 2.0))
                                  + 0.42 * exp(-distFromHorizon * 7.2);
          float shockGrowth = 1.0 - pow(max(0.0001, 1.0 - clamp(uExpansionProgress, 0.0, 1.0)), 2.6);
          float ringUnfurl = smoothstep(0.02, 0.25, shockGrowth);
          float approachRim = clamp(uvCentered.x / max(0.001, length(uvCentered)), -1.0, 1.0);
          float rimDoppler = pow(clamp(1.0 / (1.0 - 0.55 * approachRim * uDopplerStrength), 0.45, 2.05), 1.45);
          int spectralMode = int(uSpectralMode + 0.5);
          vec3 photonRingTone = (spectralMode == 2)
            ? vec3(0.86, 0.96, 1.0)
            : (spectralMode == 3)
            ? mix(vec3(1.0, 0.58, 0.25), vec3(0.70, 0.94, 1.0), clamp(approachRim * 0.5 + 0.5, 0.0, 1.0))
            : vec3(1.0, 0.94, 0.78);
          float ringBreatheRate = 1.45 + 1.25 * clamp(uAccretionRate, 0.0, 2.5);
          float ringBreatheAmp = 0.045 + 0.060 * clamp(uAccretionRate / 2.0, 0.0, 1.35);
          float ringBreathing = 1.0 + ringBreatheAmp * sin(uTime * ringBreatheRate);
          float photonRingGain = photonRingProfile * rimDoppler * (0.42 + 0.35 * clamp(uAccretionRate, 0.0, 2.5)) * (0.65 + 0.45 * bloomMult) * ringUnfurl * ringBreathing;

          // Volumetric arch envelope: full intensity across the upper/lower Einstein arches and inner photon ring,
          // while smoothly tapering into the 3D volumetric equatorial torus strata along the outer midplane
#if KERR_APPROX_NULL_GEODESIC == 1
          float yTurbOffset = 0.0;
#else
          float turbVertical = fastTurb2D(vec2(pLocal.x * 0.45 + uTime * 0.18, pLocal.y * 0.55 - uTime * 0.14));
          float yTurbOffset = (turbVertical - 0.5) * 0.62;
#endif
          float scaleHeightY = 0.74 + 0.20 * max(0.0, b - rIn);
          float activeVolumetricEnvelope = exp(-pow(max(0.0001, abs(pLocal.y + yTurbOffset) - 0.34) / scaleHeightY, 1.45));
          float quiescentArchMask = smoothstep(0.12, 0.62, abs(pLocal.y));
          float activeArchMask = mix(0.78, 1.0, smoothstep(0.0, 0.42, abs(pLocal.y))) * clamp(activeVolumetricEnvelope * 1.16, 0.0, 1.0);
          float photonRingMask = exp(-distFromHorizon * 3.2);
          float volArchMask = max(photonRingMask * 0.85, mix(mix(quiescentArchMask, activeArchMask, 0.62), activeArchMask, uAccretionState))
                            * smoothstep(0.02, 0.16, uExpansionProgress);

          accumColor = (accumColor + photonRingTone * photonRingGain) * volArchMask;
          accumAlpha = clamp(max(accumAlpha, photonRingProfile * 0.78 * ringUnfurl) * volArchMask, 0.0, 0.98);
        }
      }
    }

    // Companion Star Gravitational Lensing when donor star passes behind the black hole in Raymarched mode
    if (uIsBinarySystem > 0.5 && uLensingActive > 0.5 && b >= r_horizon && accumAlpha < 0.98) {
      float starLensAlpha = clamp((2.15 * r_horizon) / (b + 0.10), 0.0, 1.52);
      vec3 inwardWorld = -pClosest / max(0.0001, length(pClosest));
      vec3 starBentDir = normalize(rayDir + inwardWorld * sin(starLensAlpha));
      vec3 lensedStarRgb = vec3(0.0);
      float lensedStarAlpha = 0.0;
      sampleLensedCompanionStar(vWorldPos, starBentDir, lensedStarRgb, lensedStarAlpha);
      if (lensedStarAlpha > 0.001) {
        float nearPhotonBoost = 1.0 + 0.85 * exp(-distFromHorizon * 1.6);
        float w = (1.0 - accumAlpha * 0.82) * lensedStarAlpha;
        accumColor += lensedStarRgb * nearPhotonBoost * w;
        accumAlpha = max(accumAlpha, lensedStarAlpha);
      }
    }

    float einsteinGlow = (uIsStar > 0.5 || uLensingActive < 0.5 || uShowDisk > 0.5)
      ? 0.0
      : smoothstep(0.0, 0.28, distFromHorizon) * clamp(0.08 / (distFromHorizon + 0.22), 0.0, 0.32) * (0.12 + 0.10 * bloomMult);
    vec3 einsteinColor = vec3(0.22, 0.36, 0.58) * einsteinGlow;

    vec3 hdrColor = accumColor + einsteinColor;
    vec3 tonemapped = acesFilm(hdrColor * (1.05 + 0.23 * bloomMult));

    float outAlpha = clamp(max(accumAlpha, einsteinGlow), 0.0, 1.0) * quadFade;
    if (uDepthPeeling > 0.5 && outAlpha < 0.035) discard;
    gl_FragColor = vec4(tonemapped, outAlpha);
  }
`;

function buildLensingFragmentShader(tier: GeodesicShaderQualityTier): string {
  return `${GEODESIC_SHADER_SNIPPETS[tier]}\n${LENSING_FRAGMENT_SHADER_BODY}`;
}

const LENSING_FRAGMENT_SHADER_FULL = buildLensingFragmentShader('Full Geodesic');
const LENSING_FRAGMENT_SHADER_APPROX = buildLensingFragmentShader('Approximated Null-Geodesic');

// 3c. High-Fidelity Volumetric Companion Star Shader (Fractional Brownian Motion Boiling Solar Surface + Coronal Fresnel Glow + Roche Lobe Overflow)
const BINARY_STAR_VERTEX_SHADER = `
  uniform float uTime;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;
  varying vec3 vLocalDir;
  varying float vRocheStretch;

  void main() {
    vec3 dir = normalize(position);
    vLocalDir = dir;

    // Roche Lobe Tidal Deformation: gravitational pull stretches the companion star's equator
    // toward the inner Lagrange point L1 (-X direction in local binary frame, pointing at the black hole)
    float towardL1 = max(0.0001, -dir.x);
    float rocheCusp = pow(towardL1, 2.35) * 0.34 + pow(towardL1, 5.5) * 0.22;
    // Slight polar flattening from orbital tidal stress
    float polarCompression = 1.0 - 0.07 * dir.y * dir.y;
    vRocheStretch = clamp(max(0.0, -dir.x), 0.0, 1.0);

    // Smooth convective boiling surface displacement
    float boilDisp = (
      sin(dir.x * 7.5 + uTime * 1.8) * cos(dir.y * 6.8 - uTime * 1.5) +
      sin(dir.z * 8.2 - uTime * 2.1) * 0.55
    ) * 0.032;

    vec3 deformedPos = position;
    deformedPos.y *= polarCompression;
    deformedPos.z *= (1.0 - 0.03 * towardL1);
    deformedPos.x -= rocheCusp * length(position);
    deformedPos += dir * boilDisp;

    // Approximate perturbed normal for accurate coronal Fresnel glow on the teardrop L1 nose
    vec3 perturbedNormal = normalize(dir + vec3(-rocheCusp * 0.65, dir.y * 0.08, 0.0));
    vec4 worldPos = modelMatrix * vec4(deformedPos, 1.0);
    vWorldPos = worldPos.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * perturbedNormal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const BINARY_STAR_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uBloomIntensity;
  uniform vec3 uBlackHolePos;
  uniform float uHorizonRadiusWorld;
  uniform float uLensingActive;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;
  varying vec3 vLocalDir;
  varying float vRocheStretch;

  float gyroidOctave(vec3 p) {
    return dot(sin(p), cos(p.yzx)) * 0.3333 + 0.5;
  }

  // 4-octave 3D Fractional Brownian Motion (fBM) for boiling solar convection cells
  float fbmSphere(vec3 p) {
    float v = 0.5000 * gyroidOctave(p * 2.2);
    p = vec3(p.y + p.z * 0.6, p.z - p.x * 0.6, p.x + p.y * 0.6) * 1.62 + vec3(1.7, 3.1, 2.3);
    v += 0.2500 * gyroidOctave(p * 2.2);
    p = vec3(p.y - p.z * 0.6, p.z + p.x * 0.6, p.x - p.y * 0.6) * 1.65 + vec3(4.1, 1.9, 3.7);
    v += 0.1500 * gyroidOctave(p * 2.2);
    p = vec3(p.z + p.x * 0.5, p.x - p.y * 0.5, p.y + p.z * 0.5) * 1.72 + vec3(2.8, 5.2, 1.4);
    v += 0.1000 * gyroidOctave(p * 2.2);
    return clamp(v, 0.0, 1.0);
  }

  void main() {
    // When the companion star passes behind the black hole, suppress the unbent direct mesh inside
    // the strong-lensing Einstein capture radius so the bent Einstein arcs on gravitationalLensMesh dominate cleanly
    if (uLensingActive > 0.5 && uHorizonRadiusWorld > 0.01) {
      vec3 camToFrag = vWorldPos - cameraPosition;
      vec3 camToBH = uBlackHolePos - cameraPosition;
      float fragDist = length(camToFrag);
      float bhDist = length(camToBH);
      if (fragDist > bhDist) {
        vec3 rayDir = camToFrag / max(0.0001, fragDist);
        float tClosest = dot(camToBH, rayDir);
        vec3 pClosest = cameraPosition + rayDir * tClosest - uBlackHolePos;
        float impactB = length(pClosest);
        if (impactB < uHorizonRadiusWorld * 2.15) {
          discard;
        }
      }
    }

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vNormalWorld);
    float ndv = clamp(dot(normal, viewDir), 0.0, 1.0);

    // Multi-octave domain-warped Fractional Brownian Motion (fBM) for boiling solar convection cells
    vec3 p = normalize(vLocalDir) * 2.6 + vec3(uTime * 0.16, -uTime * 0.13, uTime * 0.11);
    float q1 = fbmSphere(p);
    float q2 = fbmSphere(p * 1.85 + vec3(q1 * 1.45 - uTime * 0.21, q1 * 1.1 + uTime * 0.15, -uTime * 0.17));
    float fbmVal = fbmSphere(p * 2.45 + vec3(q2 * 1.35, uTime * 0.26, -q1 * 1.25));

    // Solar surface convection granules, dark magnetic sunspot umbrae, and erupting magnetic flare ridges
    float granuleCells = smoothstep(0.24, 0.78, fbmVal);
    float sunspotMask = smoothstep(0.21, 0.37, q1 * 0.62 + fbmVal * 0.38);
    float flareRidges = pow(clamp(1.0 - abs(q2 - 0.51) * 4.0, 0.0001, 1.0), 2.5);

    // Extra tidal heating near the L1 Roche lobe overflow nozzle where plasma is ripped off the star
    float l1TidalHeat = pow(max(0.0001, vRocheStretch), 2.2) * (0.55 + 0.45 * flareRidges);

    vec3 colSunspotUmbra = vec3(0.42, 0.05, 0.008);
    vec3 colDeepOrange   = vec3(0.96, 0.34, 0.04);
    vec3 colBrightGold   = vec3(1.00, 0.76, 0.22);
    vec3 colWhiteFlare   = vec3(1.00, 0.98, 0.91);

    vec3 photosphere = mix(colSunspotUmbra, colDeepOrange, sunspotMask);
    photosphere = mix(photosphere, colBrightGold, granuleCells);
    photosphere = mix(photosphere, colWhiteFlare, clamp(flareRidges * 0.68 + l1TidalHeat * 0.65, 0.0, 1.0));

    // Bright Coronal Fresnel Glow at the stellar limb + solar limb darkening profile
    float fresnelRim = pow(max(0.0001, 1.0 - ndv), 2.25);
    float outerFresnel = pow(max(0.0001, 1.0 - ndv), 5.2);
    float limbDarkening = mix(0.62, 1.16, pow(max(0.0001, ndv), 0.44));

    vec3 coronalFresnelGlow =
      vec3(1.00, 0.54, 0.12) * fresnelRim * (1.75 + 0.55 * flareRidges) +
      vec3(1.00, 0.94, 0.76) * outerFresnel * 1.35;

    float bloomBoost = 1.0 + 0.32 * max(0.0, uBloomIntensity);
    vec3 finalRgb = (photosphere * limbDarkening * 1.35 + coronalFresnelGlow) * bloomBoost;
    gl_FragColor = vec4(finalRgb, 1.0);
  }
`;

const BINARY_CORONA_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uBloomIntensity;
  uniform vec3 uBlackHolePos;
  uniform float uHorizonRadiusWorld;
  uniform float uLensingActive;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;
  varying vec3 vLocalDir;
  varying float vRocheStretch;

  float gyroidOctave(vec3 p) {
    return dot(sin(p), cos(p.yzx)) * 0.3333 + 0.5;
  }

  void main() {
    if (uLensingActive > 0.5 && uHorizonRadiusWorld > 0.01) {
      vec3 camToFrag = vWorldPos - cameraPosition;
      vec3 camToBH = uBlackHolePos - cameraPosition;
      float fragDist = length(camToFrag);
      float bhDist = length(camToBH);
      if (fragDist > bhDist) {
        vec3 rayDir = camToFrag / max(0.0001, fragDist);
        float tClosest = dot(camToBH, rayDir);
        vec3 pClosest = cameraPosition + rayDir * tClosest - uBlackHolePos;
        float impactB = length(pClosest);
        if (impactB < uHorizonRadiusWorld * 2.15) {
          discard;
        }
      }
    }

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vNormalWorld);
    float ndv = abs(dot(normal, viewDir));

    // Volumetric coronal streamers & solar wind prominences using 3-octave fBM
    vec3 cPos = normalize(vLocalDir) * 3.8 - vec3(uTime * 0.45, -uTime * 0.32, uTime * 0.38);
    float streamerNoise = 0.55 * gyroidOctave(cPos) + 0.30 * gyroidOctave(cPos * 2.15 + vec3(1.7, 2.9, 0.8)) + 0.15 * gyroidOctave(cPos * 4.2 - vec3(2.3, 1.4, 3.1));
    float fineProminence = 0.60 * gyroidOctave(cPos.yzx * 1.9 + vec3(streamerNoise * 1.4, uTime * 0.25, -uTime * 0.2)) + 0.40 * gyroidOctave(cPos.zxy * 3.6);

    // Smooth atmospheric Fresnel shell falloff
    float rimEnvelope = pow(clamp(1.0 - ndv, 0.0001, 1.0), 1.85) * smoothstep(0.0, 0.36, ndv);
    float l1PlumeBoost = 1.0 + 0.65 * vRocheStretch * vRocheStretch;
    float intensity = rimEnvelope * (0.55 + 0.75 * streamerNoise * fineProminence) * l1PlumeBoost;

    vec3 innerCorona = vec3(1.00, 0.84, 0.42);
    vec3 outerCorona = vec3(0.98, 0.32, 0.05);
    vec3 col = mix(outerCorona, innerCorona, clamp(intensity * 1.4, 0.0, 1.0)) * (1.55 + 0.45 * max(0.0, uBloomIntensity));
    float alpha = clamp(intensity * 0.82, 0.0, 0.90);
    if (alpha <= 0.005) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

// 3d. Roche Lobe Overflow Accretion Stream Shader (Volumetric fBM Plasma Bridge siphoning from Companion Star to Accretion Disk)
const ACCRETION_STREAM_VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    // Subtle MHD kink-mode helical wave along the plasma bridge
    float prog = uv.x;
    float env = sin(prog * 3.14159265);
    float waveY = sin(prog * 14.0 - uTime * 4.8) * 0.14 * env;
    float waveZ = cos(prog * 11.0 - uTime * 3.9) * 0.12 * env;
    vec3 displaced = position + vec3(0.0, waveY, waveZ);

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPos = worldPos.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ACCRETION_STREAM_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uBloomIntensity;
  uniform float uIsOuterSheath;
  uniform float uSpectralMode;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;

  float fastStreamNoise(vec2 p) {
    return (sin(p.x * 1.4 + cos(p.y * 1.7)) + cos(p.y * 1.9 - sin(p.x * 1.6))) * 0.25 + 0.5;
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 normal = normalize(vNormalWorld);
    float ndv = abs(dot(normal, viewDir));

    // Advect 3-octave fBM plasma turbulence rapidly from the star (vUv.x = 0) toward the black hole disk (vUv.x = 1)
    float prog = vUv.x;
    float flowSpeed = 1.65 + 1.15 * prog; // Accelerates as plasma plunges toward the black hole gravity well
    float angle = vUv.y * 6.2831853;
    vec2 streamUv = vec2(prog * 6.5 - uTime * flowSpeed, cos(angle) * 1.4 + sin(prog * 8.0 - uTime * 2.2) * 0.35);

    float fbmFlow = 0.55 * fastStreamNoise(streamUv) + 0.30 * fastStreamNoise(streamUv * 2.12 + vec2(1.7, 3.1)) + 0.15 * fastStreamNoise(streamUv * 4.35 - vec2(2.4, 1.3));
    vec2 filUv = streamUv * 2.1 + vec2(fbmFlow * 1.5 - uTime * 0.9, sin(angle) * 1.2);
    float filaments = 0.65 * fastStreamNoise(filUv) + 0.35 * fastStreamNoise(filUv * 2.15 + vec2(3.1, 1.9));
    float plasmaStriations = smoothstep(0.22, 0.84, mix(fbmFlow, filaments, 0.6));

    // Radial cylindrical core profile (bright dense spine, soft glowing Fresnel sheath)
    float coreProfile = pow(max(0.0001, ndv), mix(0.85, 1.65, uIsOuterSheath));
    float endTaper = smoothstep(0.0, 0.08, prog) * (1.0 - smoothstep(0.88, 1.0, prog) * 0.35);

    // Thermal heating progression: golden-orange solar plasma at L1 nozzle -> white-hot shock heating as it impacts the disk
    vec3 colSolarOrigin = vec3(1.00, 0.48, 0.08);
    vec3 colMidStream   = vec3(1.00, 0.78, 0.26);
    vec3 colShockHot    = vec3(1.00, 0.97, 0.88);
    if (abs(uSpectralMode - 2.0) < 0.2) {
      colSolarOrigin = vec3(0.22, 0.58, 1.00);
      colMidStream   = vec3(0.55, 0.85, 1.00);
      colShockHot    = vec3(0.92, 0.99, 1.00);
    }

    vec3 baseCol = mix(colSolarOrigin, colMidStream, smoothstep(0.0, 0.65, prog));
    baseCol = mix(baseCol, colShockHot, smoothstep(0.55, 1.0, prog) * (0.45 + 0.55 * plasmaStriations));

    float sheathScale = mix(1.0, 0.52, uIsOuterSheath);
    float emission = (0.42 + 0.88 * plasmaStriations) * coreProfile * sheathScale * (1.25 + 0.38 * max(0.0, uBloomIntensity));
    float alpha = clamp(coreProfile * (0.35 + 0.65 * plasmaStriations) * endTaper * sheathScale, 0.0, 0.94);
    if (alpha <= 0.005) discard;

    gl_FragColor = vec4(baseCol * emission, alpha);
  }
`;

// 3b. Compact Quantum-Gravity Singularity Seed Ball Shader (Initial compressed state before expansion)
const SINGULARITY_BALL_VERTEX_SHADER = `
  varying vec3 vNormalVec;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalVec = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SINGULARITY_BALL_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSpectralMode;
  varying vec3 vNormalVec;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    if (uOpacity <= 0.001) discard;
    float ndv = clamp(dot(normalize(vNormalVec), normalize(vViewDir)), 0.0, 1.0);

    // Swirling high-energy quantum-horizon plasma filaments on the singularity limb
    vec2 limbUv = vLocalPos.xy * 3.2 + vec2(uTime * 0.95, -uTime * 0.72);
    float plasmaTurb = (sin(limbUv.x * 1.5 + cos(limbUv.y * 1.8)) + cos(limbUv.y * 2.1 - sin(limbUv.x * 1.7))) * 0.25 + 0.5;
    float fineRipple = sin(length(vLocalPos.xz) * 18.0 - uTime * 7.5 + plasmaTurb * 3.0) * 0.5 + 0.5;

    // Deep pitch-black singularity shadow core in the interior (ndv > 0.24),
    // surrounded by a razor-thin white photon-capture rim and subtle corona
    float horizonShadow = smoothstep(0.16, 0.25, ndv);
    float photonRim = exp(-pow(abs((ndv - 0.19) * 32.0), 2.0)) * (0.95 + 0.25 * plasmaTurb);
    float outerCorona = pow(max(0.0001, 1.0 - ndv), 6.2) * (0.32 + 0.18 * fineRipple);

    vec3 primaryGlow = vec3(1.0, 0.94, 0.82);
    vec3 coreHot = vec3(1.0, 0.995, 0.98);
    int spectralMode = int(uSpectralMode + 0.5);
    if (spectralMode == 2) {
      primaryGlow = vec3(0.45, 0.82, 1.0);
      coreHot = vec3(0.94, 0.99, 1.0);
    } else if (spectralMode == 3) {
      primaryGlow = mix(vec3(0.98, 0.42, 0.14), vec3(0.28, 0.85, 1.0), clamp(vLocalPos.x * 0.8 + 0.5, 0.0, 1.0));
    }

    vec3 rimColor = mix(primaryGlow, coreHot, clamp(photonRim * 0.92, 0.0, 1.0)) * (photonRim * 1.35 + outerCorona * 0.65);
    vec3 finalRgb = mix(rimColor, vec3(0.0, 0.0, 0.0), horizonShadow);
    float alpha = clamp((horizonShadow + photonRim + outerCorona * 0.65) * uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(finalRgb, alpha);
  }
`;

const SINGULARITY_HALO_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSpectralMode;
  varying vec2 vUv;

  void main() {
    if (uOpacity <= 0.001) discard;
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    // Razor-thin micro-photon ring and subtle gravitational lensing shimmer around the small singularity ball
    float innerShadow = 1.0 - smoothstep(0.242, 0.256, r);
    float photonRing = exp(-pow(abs((r - 0.256) * 52.0), 2.0)) * 1.05;
    float secondRing = exp(-pow(abs((r - 0.305) * 32.0), 2.0)) * 0.22;
    float angle = atan(p.y, p.x);
    float spiralWisp = (0.5 + 0.5 * sin(angle * 3.0 + r * 16.0 - uTime * 5.2)) * exp(-max(0.0, r - 0.25) * 6.5);
    float haloFalloff = exp(-max(0.0, r - 0.25) * 6.2) * (0.24 + 0.18 * spiralWisp);

    int spectralMode = int(uSpectralMode + 0.5);
    vec3 tint = (spectralMode == 2) ? vec3(0.55, 0.88, 1.0) : vec3(1.0, 0.94, 0.82);
    vec3 col = mix(tint, vec3(1.0, 0.995, 0.98), clamp(photonRing, 0.0, 1.0)) * (photonRing + secondRing + haloFalloff);
    col = mix(col, vec3(0.0), innerShadow);
    float alpha = clamp((innerShadow * 0.96 + photonRing * 0.88 + secondRing * 0.40 + haloFalloff * 0.45) * (1.0 - smoothstep(0.75, 1.0, r)) * uOpacity, 0.0, 0.98);
    gl_FragColor = vec4(col, alpha);
  }
`;

// 4. Relativistic Camera-Motion Blur Shader (Simulates optical aberration & chromatic dispersion of high-velocity observers)
const MOTION_BLUR_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const MOTION_BLUR_FRAGMENT_SHADER = `
  uniform sampler2D tDiffuse;
  uniform sampler2D tAccum;
  uniform vec2 uVelocity;
  uniform float uStrength;
  uniform vec2 uResolution;
  uniform float uTimeLapseMix;
  uniform float uExposureBoost;
  varying vec2 vUv;

  void main() {
    vec4 currentFrame;

    if (uStrength < 0.005) {
      currentFrame = texture2D(tDiffuse, vUv);
    } else {
      // Relativistic motion streak & chromatic aberration
      vec2 screenAspect = vec2(uResolution.x / max(1.0, uResolution.y), 1.0);
      vec2 blurDir = uVelocity * (uStrength * 0.042);
      blurDir.x /= max(0.1, screenAspect.x);

      vec4 accum = vec4(0.0);
      float totalWeight = 0.0;

      // 9-tap directional integration with relativistic chromatic dispersion
      for (int i = -4; i <= 4; i++) {
        float t = float(i) / 4.0;
        float weight = exp(-t * t * 2.2);
        vec2 offset = blurDir * t;

        // Relativistic chromatic aberration: slight Doppler dispersion of wavelengths
        float r = texture2D(tDiffuse, vUv + offset * (1.0 + 0.16 * uStrength)).r;
        float g = texture2D(tDiffuse, vUv + offset).g;
        float b = texture2D(tDiffuse, vUv + offset * (1.0 - 0.16 * uStrength)).b;
        float a = texture2D(tDiffuse, vUv + offset).a;

        accum += vec4(r, g, b, a) * weight;
        totalWeight += weight;
      }

      vec4 finalColor = accum / max(0.0001, totalWeight);
      vec3 tinted = mix(finalColor.rgb, finalColor.rgb * vec3(0.94, 0.98, 1.06), uStrength * 0.22);
      currentFrame = vec4(clamp(tinted, 0.0, 1.0), 1.0);
    }

    // Long-Exposure Time-Lapse Astrophotography Accumulation
    if (uTimeLapseMix > 0.001) {
      vec4 prevAccum = texture2D(tAccum, vUv);
      vec3 boostedCurrent = currentFrame.rgb * (1.0 + uExposureBoost * 0.28);

      // Combine exponential temporal integration with luminous peak-hold for crisp orbital star & plasma trails
      vec3 emaBlend = mix(boostedCurrent, prevAccum.rgb, uTimeLapseMix);
      vec3 trailPeak = max(prevAccum.rgb * (0.988 + 0.009 * uTimeLapseMix), boostedCurrent);
      vec3 longExposureRgb = mix(emaBlend, trailPeak, 0.58);

      // Soft astrophotography highlight roll-off to preserve color saturation in the accumulated core
      longExposureRgb = longExposureRgb / (vec3(1.0) + max(vec3(0.0), longExposureRgb - vec3(0.85)) * 0.18);
      gl_FragColor = vec4(clamp(longExposureRgb, 0.0, 1.0), 1.0);
      return;
    }

    gl_FragColor = vec4(clamp(currentFrame.rgb, 0.0, 1.0), 1.0);
  }
`;

// 5. Camera-Space Optical Lens Flare & Viewing-Angle Diffraction Artifact Shader
const CAMERA_LENS_FLARE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const CAMERA_LENS_FLARE_FRAGMENT_SHADER = `
  uniform float uFlareIntensity;
  uniform float uTime;
  uniform vec2 uResolution;
  // Primary emitter in NDC [-1, 1] space: xy = ndc coords, z = visibility weight
  uniform vec3 uSourceNdc;
  // Angle-dependent hotspot in NDC [-1, 1] space (approaching Doppler crescent or magnetic polar cap): xy = ndc, z = intensity weight
  uniform vec3 uHotspotNdc;
  // Optional secondary emitter (binary companion star) in NDC [-1, 1]: xy = ndc, z = weight
  uniform vec3 uSecondaryNdc;
  // Viewing angle optical parameters:
  // x = grazing/edge-on factor (0 = polar, 1 = equatorial edge-on)
  // y = camera orbital azimuth angle (radians)
  // z = polar/beam alignment factor (0..1)
  // w = distance & expansion attenuation factor
  uniform vec4 uViewAngleParams;
  uniform vec3 uPrimaryTint;
  uniform vec3 uSecondaryTint;
  varying vec2 vUv;

  float sqr(float x) {
    return x * x;
  }

  // Hexagonal camera aperture distance field for realistic internal lens element ghosts
  float hexApertureDist(vec2 p, float rotRad) {
    float c = cos(rotRad);
    float s = sin(rotRad);
    p = abs(mat2(c, -s, s, c) * p);
    return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
  }

  // Computes anamorphic streak + 6-point diffraction starburst around an NDC emitter point
  vec3 evalEmitterFlare(vec2 uvNdc, vec2 srcNdc, float aspect, float camAzimuth, float anamorphicBoost, vec3 tint) {
    vec2 d = uvNdc - srcNdc;
    d.x *= aspect;
    float absDy = abs(d.y);
    float rSq = dot(d, d);
    // Fast spatial early-out: skip pixels outside both the horizontal anamorphic streak and the starburst radius
    if (absDy > 0.14 && rSq > 0.42) {
      return vec3(0.0);
    }
    float r = sqrt(rSq);

    // 1. Wide Cinema Anamorphic Horizontal Streak (intensifies at grazing angles / Doppler boost)
    float streakY = absDy < 0.14 ? exp(-absDy * 44.0) * exp(-abs(d.x) * (1.85 / max(0.45, anamorphicBoost))) : 0.0;
    float streakCore = absDy < 0.06 ? exp(-absDy * 115.0) * exp(-abs(d.x) * (0.95 / max(0.45, anamorphicBoost))) : 0.0;
    vec3 streakCol = mix(tint, vec3(0.75, 0.90, 1.0), 0.38) * (streakY * 0.42 + streakCore * 0.78);

    if (r >= 0.65) {
      return streakCol;
    }

    // Secondary subtle cross-streak tilted with viewing angle
    float tiltA = camAzimuth * 0.35 + 0.28;
    float ct = cos(tiltA);
    float st = sin(tiltA);
    vec2 dTilt = mat2(ct, -st, st, ct) * d;
    float crossStreak = exp(-abs(dTilt.y) * 78.0) * exp(-abs(dTilt.x) * 2.6) * 0.42;

    // 2. 6-Blade Aperture Diffraction Starburst (rotates as camera views from different angles)
    float safeDx = abs(d.x) < 1e-5 ? (d.x >= 0.0 ? 1e-5 : -1e-5) : d.x;
    float theta = atan(d.y, safeDx) + camAzimuth * 0.5;
    float c3 = max(0.0, cos(theta * 3.0));
    float s6 = max(0.0, sin(theta * 6.0 + 0.4));
    float c3_2 = c3 * c3;
    float c3_4 = c3_2 * c3_2;
    float c3_14 = c3_4 * c3_4 * c3_4 * c3_2;
    float s6_2 = s6 * s6;
    float s6_4 = s6_2 * s6_2;
    float s6_20 = s6_4 * s6_4 * s6_4 * s6_4 * s6_4;
    float rays6 = c3_14 * exp(-r * 5.2);
    float rays12 = (s6_20 * s6_2) * exp(-r * 8.0) * 0.45;
    float corePin = exp(-r * 16.0) * 0.55;

    streakCol += mix(tint, vec3(0.75, 0.90, 1.0), 0.38) * crossStreak;
    vec3 rayCol = mix(tint, vec3(1.0, 0.97, 0.90), 0.5) * (rays6 * 0.48 + rays12 + corePin);
    return (streakCol + rayCol);
  }

  void main() {
    if (uFlareIntensity <= 0.001 || uSourceNdc.z <= 0.001) {
      discard;
    }

    vec2 uvNdc = vUv * 2.0 - 1.0;
    vec2 primaryPos = mix(uSourceNdc.xy, uHotspotNdc.xy, 0.65);

    // Fast full-screen bounding-box early discard for desktop viewports:
    // Skip pixels that lie outside both the horizontal anamorphic band and the central optical ghost/halo envelope
    float dyPrimary = abs(uvNdc.y - primaryPos.y);
    float dyHot = abs(uvNdc.y - uHotspotNdc.y);
    if (
      dyPrimary > 0.14 &&
      dyHot > 0.14 &&
      dot(uvNdc, uvNdc) > 0.72 &&
      (uSecondaryNdc.z <= 0.01 || abs(uvNdc.y - uSecondaryNdc.y) > 0.14)
    ) {
      discard;
    }

    float aspect = uResolution.x / max(1.0, uResolution.y);

    float edgeOnFactor = uViewAngleParams.x;
    float camAzimuth = uViewAngleParams.y;
    float beamAlign = uViewAngleParams.z;
    float distAtten = uViewAngleParams.w;

    // Angle-responsive modulation: grazing views of the accretion disk or direct alignment with pulsar/stellar hotspots boost flare artifacts
    float angleGain = (0.62 + 0.58 * edgeOnFactor + 0.75 * beamAlign) * distAtten;
    float anamorphicScale = 0.75 + 0.68 * edgeOnFactor + 0.55 * beamAlign;

    vec3 totalFlare = vec3(0.0);

    // A. Primary Source + Angle-Offset Hotspot (Approaching Doppler Crescent or Magnetic Polar Cap)
    totalFlare += evalEmitterFlare(uvNdc, primaryPos, aspect, camAzimuth, anamorphicScale, uPrimaryTint) * uSourceNdc.z;

    if (uHotspotNdc.z > 0.05) {
      totalFlare += evalEmitterFlare(uvNdc, uHotspotNdc.xy, aspect, -camAzimuth * 0.7, anamorphicScale * 1.22, uSecondaryTint) * uHotspotNdc.z * 0.65;
    }

    // B. Multi-Element Camera Lens Aperture Ghosts (Mirrored across optical axis (0,0))
    vec2 flareAxis = uHotspotNdc.xy;
    float axisLen = length(flareAxis);
    vec2 ghostOrigin = axisLen > 0.02
      ? flareAxis
      : vec2(cos(camAzimuth) * 0.16, sin(camAzimuth) * 0.12) * (0.4 + 0.6 * edgeOnFactor);

    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float ghostScale = -0.35 - fi * 0.34 + (i == 2 ? 0.85 : 0.0);
      vec2 ghostCenter = ghostOrigin * ghostScale;
      vec2 gd = (uvNdc - ghostCenter);
      gd.x *= aspect;

      float radius = 0.055 + fi * 0.032 + 0.015 * sin(fi * 2.1);
      if (abs(gd.x) > radius * 1.45 || abs(gd.y) > radius * 1.45) {
        continue;
      }
      float hexD = hexApertureDist(gd, camAzimuth * 0.4 + fi * 0.52);

      // Soft hexagonal iris fill (edge0 < edge1 strictly enforced for GLSL compliance) + bright chromatic edge ring
      float irisFill = (1.0 - smoothstep(radius * 0.35, radius, hexD)) * 0.26;
      float irisRing = exp(-sqr((hexD - radius * 0.86) / (0.012 + fi * 0.003))) * 0.62;
      float ghostProfile = irisFill + irisRing;

      // Chromatic dispersion across the lens elements
      vec3 ghostColor = mix(
        uPrimaryTint,
        vec3(
          0.5 + 0.5 * sin(fi * 1.3 + 0.2),
          0.5 + 0.5 * sin(fi * 1.3 + 2.1),
          0.5 + 0.5 * sin(fi * 1.3 + 4.2)
        ),
        0.58
      );

      totalFlare += ghostColor * ghostProfile * (0.28 / (1.0 + fi * 0.28)) * uHotspotNdc.z;
    }

    // C. Chromatic Caustic Halo Ring around the opposite optical axis
    vec2 haloCenter = -ghostOrigin * 0.62;
    vec2 hd = (uvNdc - haloCenter);
    hd.x *= aspect;
    float hDist = length(hd);
    float haloRadius = 0.34 + 0.08 * edgeOnFactor;
    if (abs(hDist - haloRadius) < 0.095) {
      float haloR = exp(-sqr((hDist - haloRadius * 0.97) / 0.028));
      float haloG = exp(-sqr((hDist - haloRadius * 1.00) / 0.028));
      float haloB = exp(-sqr((hDist - haloRadius * 1.03) / 0.028));
      vec3 causticHalo = vec3(haloR, haloG, haloB) * mix(uSecondaryTint, vec3(0.65, 0.85, 1.0), 0.5) * 0.16 * (0.5 + 0.5 * edgeOnFactor);
      totalFlare += causticHalo * uSourceNdc.z;
    }

    // D. Optional Binary Companion Star Secondary Lens Flare
    if (uSecondaryNdc.z > 0.01) {
      totalFlare += evalEmitterFlare(
        uvNdc,
        uSecondaryNdc.xy,
        aspect,
        camAzimuth + 0.5,
        0.85,
        vec3(1.0, 0.72, 0.28)
      ) * uSecondaryNdc.z * 0.55;
    }

    // Apply user Lens Flare Intensity slider & smooth vignette guard at screen borders
    vec3 rawFlare = totalFlare * angleGain * uFlareIntensity * 0.58;
    float lum = max(rawFlare.r, max(rawFlare.g, rawFlare.b));
    if (!(lum > 0.002 && lum < 1e4)) {
      discard;
    }
    vec3 outRgb = clamp(rawFlare, vec3(0.0), vec3(1.25));

    gl_FragColor = vec4(outRgb, clamp(lum, 0.0, 0.95));
  }
`;

export class BlackHoleSceneController {
  private container: HTMLElement;
  private domElement: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private fallbackCtx2D: CanvasRenderingContext2D | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private frameId = 0;
  private isDisposed = false;

  // Relativistic Camera-Motion Blur & Long-Exposure Time-Lapse Post-Processing
  private motionBlurRenderTarget!: THREE.WebGLRenderTarget;
  private timeLapseTargetA!: THREE.WebGLRenderTarget;
  private timeLapseTargetB!: THREE.WebGLRenderTarget;
  private timeLapseReadFirst = true;
  private timeLapseInitialized = false;
  private timeLapseExposureSeconds = 0.0;
  private postScene = new THREE.Scene();
  private postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private postMaterial!: THREE.ShaderMaterial;
  private postQuad!: THREE.Mesh;
  private prevCamQuat = new THREE.Quaternion();
  private camMotionBlurStrength = 0.0;
  private camMotionVelocity = new THREE.Vector2(0, 0);

  // Camera-Space Optical Lens Flare Overlay
  private cameraLensFlareMesh!: THREE.Mesh;
  private cameraLensFlareMat!: THREE.ShaderMaterial;

  // Root composite 3D groups
  private blackHoleGroup = new THREE.Group();
  private eventHorizonMesh!: THREE.Mesh;
  private accretionDiskGroup = new THREE.Group();
  private accretionDiskMat!: THREE.ShaderMaterial;
  private activeDiskVolumeGroup = new THREE.Group();
  private ergosphereGroup = new THREE.Group();

  // Compressed Singularity Seed Ball & Expansion Animation subsystem
  private singularitySeedGroup = new THREE.Group();
  private singularityCoreMesh!: THREE.Mesh;
  private singularityCoreMat!: THREE.ShaderMaterial;
  private singularityHaloMesh!: THREE.Mesh;
  private singularityHaloMat!: THREE.ShaderMaterial;
  private isSingularityCollapsed = false;
  private expansionProgress = 1.0;
  private targetExpansionProgress = 1.0;
  private lastWellExpansionProgress = -1.0;
  private pointerDownPos = new THREE.Vector2();
  private activePointerIds = new Set<number>();
  private multiTouchGestureOccurred = false;
  private lastMultiTouchEndMs = 0;

  // Spacetime Well Manifold (Precomputed static vertex polar coordinates for fast O(N) CPU deformation)
  private spacetimeWellMesh!: THREE.Mesh;
  private spacetimeWellGeo!: THREE.BufferGeometry;
  private wellVertexX!: Float32Array;
  private wellVertexZ!: Float32Array;
  private wellVertexR!: Float32Array;
  private wellVertexAngle!: Float32Array;
  private wellVertexFrameDragBase!: Float32Array;
  private needsWellDeform = true;
  private lastWellDeformMs = 0;

  // Prototype Compact Star / Neutron Star subsystem
  private neutronStarGroup = new THREE.Group();
  private neutronStarMesh!: THREE.Mesh;
  private pulsarBeamsGroup = new THREE.Group();
  private magneticDipoleGroup = new THREE.Group();

  // Binary Accretion System (Roche Lobe Overflow Companion Donor Star + Siphoning Plasma Stream)
  private binarySystemGroup = new THREE.Group();
  private binaryStarMesh!: THREE.Mesh;
  private binaryStarMat!: THREE.ShaderMaterial;
  private binaryCoronaMesh!: THREE.Mesh;
  private binaryCoronaMat!: THREE.ShaderMaterial;
  private accretionStreamMesh!: THREE.Mesh;
  private accretionStreamMat!: THREE.ShaderMaterial;
  private accretionStreamOuterMesh!: THREE.Mesh;
  private accretionStreamOuterMat!: THREE.ShaderMaterial;
  private streamHotspotMesh!: THREE.Mesh;
  private streamParticlesInstanced!: THREE.InstancedMesh;
  private streamParticleCount = 560;
  private streamParticlePhases = new Float32Array(560);
  private streamParticleSpeeds = new Float32Array(560);
  private streamParticleOffsets: THREE.Vector3[] = [];
  private streamParticleScales = new Float32Array(560);
  private streamCurve!: THREE.CubicBezierCurve3;
  private binaryOrbitAngle = -0.24;
  private companionStarLocalPos = new THREE.Vector3(21.0, 0, 0);
  private companionStarWorldPos = new THREE.Vector3(21.0, 0, 0);
  private companionStarBaseRadius = 3.85;

  // Orbital stars & Deep Starfield
  private orbitalStarsGroup = new THREE.Group();
  private starfieldInstanced!: THREE.InstancedMesh;
  private starfieldMat!: THREE.ShaderMaterial;
  private starRestPositions: THREE.Vector3[] = [];
  private starfieldScales: THREE.Vector3[] = [];
  private starfieldColors: THREE.Color[] = [];
  private starfieldCount = 2600;
  private starTwinklePhases = new Float32Array(5500);
  private starTwinkleSpeeds = new Float32Array(5500);
  private starBaseScales = new Float32Array(5500);
  private lastTrailRadius = -1;

  // Null Geodesics
  private geodesicGroup = new THREE.Group();
  private activeGeodesicPulses: Array<{
    trajectory: GeodesicTrajectory;
    mesh: THREE.Mesh;
    line: THREE.Line;
    points: THREE.Vector3[];
    progress: number;
    speed: number;
  }> = [];
  private recentGeodesicHistory: GeodesicTrajectory[] = [];

  // Relativistic Gravitational Lensing Shader Mesh (Interstellar Gargantua ray-marched distortion)
  // Pre-compiled dual quality tier materials ('Full Geodesic' vs 'Approximated Null-Geodesic') sharing the same uniform dictionary
  private gravitationalLensMesh!: THREE.Mesh;
  private gravitationalLensMat!: THREE.ShaderMaterial;
  private gravitationalLensMatFull!: THREE.ShaderMaterial;
  private gravitationalLensMatApprox!: THREE.ShaderMaterial;
  private activeShaderQualityTier: GeodesicShaderQualityTier = 'Full Geodesic';
  private shaderQualityMode: GeodesicShaderQualityMode = 'auto';
  private lastShaderTierSwapMs = 0;

  // Panoramic Soothing Cosmic Sky Dome
  private cosmicSkyDomeMesh!: THREE.Mesh;
  private skyDomeMat!: THREE.MeshBasicMaterial;

  // Accretion disk simulation time & uniform buffer state
  private accretionDiskSimTime = 0.0;

  // Background Star Microlensing Simulation Subsystem
  private microlensingGroup = new THREE.Group();
  private microlensSourceStarMesh!: THREE.Mesh;
  private microlensSourceGlowMesh!: THREE.Mesh;
  private microlensPrimaryImageMesh!: THREE.Mesh;
  private microlensSecondaryImageMesh!: THREE.Mesh;
  private microlensEinsteinRingMesh!: THREE.Mesh;
  private microlensPathTrail!: THREE.Line;
  private microlensStarPhase = 0.0;
  private microlensStarSpeed = 0.22;

  // Event Horizon Sonic Boom & Accretion Shockwave subsystem
  private eventHorizonPulseGroup = new THREE.Group();
  private primaryPulseMesh!: THREE.Mesh;
  private secondaryPulseMesh!: THREE.Mesh;
  private tertiaryPulseMesh!: THREE.Mesh;
  private extraPulseRippleMeshes: Array<{ mesh: THREE.Mesh; ratio: number; opacityWeight: number }> = [];
  private gravitationalWaveShellMesh!: THREE.Mesh;
  private horizonFlashMesh!: THREE.Mesh;
  private isPulseActive = false;
  private isCinematicBootBoom = false;
  private pulseProgress = 0.0;
  private pulseDuration = 2.45;
  private pulseStrength = 0.0;
  private pulseRadius = 1.75;
  private pulseColor = new THREE.Color(0xdbe4f0);

  // Subtle Event Horizon Echo Pulse state (triggered when collapsing to Singularity Seed)
  private pendingCollapseEchoPulse = false;
  private isEchoPulseActive = false;
  private echoPulseProgress = 0.0;
  private readonly echoPulseDuration = 1.35;
  private echoPulseColor = new THREE.Color(0xd4af37);

  // Sonic Boom Camera Screen Shake state
  private shakeIntensity = 0.0;
  private shakeElapsed = 0.0;
  private shakeDuration = 1.65;

  // Rapid parameter adjustment gravitational wave ripple subsystem
  private parameterRippleGroup = new THREE.Group();
  private parameterRipples: Array<{
    ringMesh: THREE.Mesh;
    shellMesh: THREE.Mesh;
    active: boolean;
    progress: number;
    speed: number;
    intensity: number;
    type: 'spin' | 'accretion' | 'mixed';
    startRadius: number;
    maxRadius: number;
  }> = [];
  private lastParamUpdateTime = 0;
  private lastObservedSpin: number | null = null;
  private lastObservedAccretionRate: number | null = null;
  private lastRippleSpawnTime = 0;

  // Accretion state change & threshold burst shockwave subsystem
  private accretionShockwaveGroup = new THREE.Group();
  private accretionShockPrimaryMesh!: THREE.Mesh;
  private accretionShockSecondaryMesh!: THREE.Mesh;
  private accretionShockShellMesh!: THREE.Mesh;
  private accretionHorizonFlashMesh!: THREE.Mesh;
  private isAccretionShockActive = false;
  private accretionShockProgress = 0.0;
  private accretionShockDuration = 1.65;
  private accretionShockIntensity = 1.0;
  private accretionShockRadius = 2.0;
  private accretionShockColor = new THREE.Color(0xf59e0b);
  private lastShockAccretionRate: number | null = null;
  private lastShockAccretionState: string | null = null;
  private accretionRateAccumDelta = 0;
  private lastAccretionUpdateTime = 0;

  // Damped state variables
  private currentScale = 1.0;
  private targetScale = 1.0;
  private currentExploded = 0.0;
  private targetExploded = 0.0;
  private starOrbitAngle = 0.8;
  private pulsarRotationAngle = 0.0;

  // Primary Orbiting Star S2 representation
  private starS2Mesh!: THREE.Mesh;
  private starS2GlowMesh!: THREE.Mesh;
  private starOrbitTrail!: THREE.Line;
  private companionStars: Array<{ mesh: THREE.Mesh; semiMajor: number; inclination: number; phase: number; speed: number }> = [];

  // Camera transition & auto-orbit state
  private cameraTransitionActive = false;
  private slowCameraPanIn = false;
  private slowPanInElapsed = 0.0;
  private readonly slowPanInDuration = 3.2;
  private slowPanStartPos = new THREE.Vector3();
  private bootIntroActive = false;
  private bootIntroElapsed = 0.0;
  private bootIntroDuration = 6.0;
  private bootAutoExpandPending = false;
  private bootAutoExpandElapsed = 0.0;
  private bootWatermarkDelay = 1.5;
  private bootWatermarkFadeOutDelay = 3.9;
  private bootSeedLoadDelay = 4.45;
  private bootAutoExpandDelay = 6.4;
  private bootWatermarkEmitted = false;
  private bootWatermarkFadeEmitted = false;
  private isWatermarkOverlayVisible = false;
  private singularitySeedLoaded = true;
  private seedLoadProgress = 1.0;
  private cinematicTourActive = false;
  private cinematicTourElapsed = 0.0;
  private cinematicTourStageIndex = 0;
  private cinematicTourStartPos = new THREE.Vector3();
  private cinematicTourStartLook = new THREE.Vector3();
  // Furthest distance the camera can go (norm = 260.0 === controls.maxDistance, ~148.6 R_s, θ = 62°, φ = 132°)
  private readonly bootIntroStartPos = new THREE.Vector3(
    260.0 * Math.sin(THREE.MathUtils.degToRad(62)) * Math.cos(THREE.MathUtils.degToRad(132)),
    260.0 * Math.cos(THREE.MathUtils.degToRad(62)),
    260.0 * Math.sin(THREE.MathUtils.degToRad(62)) * Math.sin(THREE.MathUtils.degToRad(132))
  );
  // Wide panned-out Singularity Seed staging vantage (norm = 95.0 world units ≈ 54.3 R_s along θ = 69°, φ = 104°)
  private readonly bootSeedStagePos = new THREE.Vector3(
    95.0 * Math.sin(THREE.MathUtils.degToRad(69)) * Math.cos(THREE.MathUtils.degToRad(104)),
    95.0 * Math.cos(THREE.MathUtils.degToRad(69)),
    95.0 * Math.sin(THREE.MathUtils.degToRad(69)) * Math.sin(THREE.MathUtils.degToRad(104))
  );
  // Target normal observer spherical coordinates after Singularity Seed expands: r ≈ 16.5 R_s (28.875 world units), θ ≈ 71°, φ ≈ 96°
  private readonly bootIntroEndPos = new THREE.Vector3(
    28.875 * Math.sin(THREE.MathUtils.degToRad(71)) * Math.cos(THREE.MathUtils.degToRad(96)),
    28.875 * Math.cos(THREE.MathUtils.degToRad(71)),
    28.875 * Math.sin(THREE.MathUtils.degToRad(71)) * Math.sin(THREE.MathUtils.degToRad(96))
  );
  private isUserInteracting = false;
  private lastOrbitEndMs = 0;
  private lastObserverReadoutEmitMs = 0;
  private lastAudioProximityEmitMs = 0;
  private dragEndCooldownTimer: number | null = null;
  private lastResizeWidth = 0;
  private lastResizeHeight = 0;
  private lastAppliedPixelRatio = 0;
  private pendingResizeAfterOrbit = false;
  private cachedCanvasRect: DOMRect | null = null;
  private targetCamPos = new THREE.Vector3(-2.8538, 9.4008, 27.1522);
  private targetCamLook = new THREE.Vector3(0, 0, 0);
  private followStarMode = false;

  // Raycasting for interactive feature inspection & double-click photon launch
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private lastRaycastTime = 0;
  private onFeatureSelect?: (feature: InspectedFeature | null) => void;
  private onTrajectoryCreated?: (traj: GeodesicTrajectory) => void;
  private onHoverCoordsChange?: (coords: { rRs: number; phiDeg: number; redshiftZ: number } | null) => void;
  private onObserverReadoutChange?: (
    readout: { rRs: number; thetaDeg: number; phiDeg: number },
    forceImmediate?: boolean
  ) => void;
  private onCameraDragStateChange?: (isDragging: boolean) => void;
  private onSingularityStateChange?: (isCollapsed: boolean) => void;
  private onCameraChange?: (
    pos: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number }
  ) => void;
  private onBootIntroComplete?: () => void;
  private onWatermarkDisplayStart?: () => void;
  private onSingularitySeedLoaded?: () => void;
  private onWatermarkPauseComplete?: () => void;
  private onCinematicTourChange?: (
    active: boolean,
    stageId: CinematicTourStageId,
    stageLabel: string
  ) => void;
  private resizeObserver: ResizeObserver | null = null;

  private params: BlackHoleParams;
  private cachedMetrics: ReturnType<typeof computeRelativisticMetrics>;
  private settings: VisualizerSettings = { ...DEFAULT_VISUALIZER_SETTINGS };
  private showSingularityInAnatomy = false;

  // Performance Monitor & GPU Telemetry state
  private frameTimeSamples: number[] = [];
  private rolling30FrameTimesMs: number[] = [];
  private lastTickStartMs = 0;
  private framesSinceResolutionCheck = 0;
  private basePixelRatioCap = 1.0;
  private dynamicPixelRatio = 1.0;
  private lastFramePerfMs = 0;
  private currentFrameTimeMs = 16.67;
  private lastRenderPasses = 1;
  private gpuRendererName = 'WebGL Hardware';
  private isWebGL2Context = true;

  // User Timing API (performance.mark / performance.measure) & WebGL2 GPU Timer Query profiler state
  private passTimingHistory: ShaderPassTimingSnapshot[] = [];
  private latestPassTiming: ShaderPassTimingSnapshot | null = null;
  private lastPerfConsoleLogMs = 0;
  private perfConsoleLoggingEnabled = true;
  private gpuTimerExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null;
  private activeGpuTimerQuery: WebGLQuery | null = null;
  private lastGpuTimerQueryMs: number | null = null;
  private thermalState: ThermalThrottleState = createInitialThermalState(0, 5);
  private thermalStepOverride: number | null = null;
  private shaderPrewarmReport: ShaderPrewarmCacheReport = buildShaderPrewarmCacheReport([], 0, 0);

  constructor(
    container: HTMLElement,
    initialParams: BlackHoleParams,
    callbacks?: {
      onFeatureSelect?: (feature: InspectedFeature | null) => void;
      onTrajectoryCreated?: (traj: GeodesicTrajectory) => void;
      onHoverCoordsChange?: (coords: { rRs: number; phiDeg: number; redshiftZ: number } | null) => void;
      onObserverReadoutChange?: (
        readout: { rRs: number; thetaDeg: number; phiDeg: number },
        forceImmediate?: boolean
      ) => void;
      onCameraDragStateChange?: (isDragging: boolean) => void;
      onSingularityStateChange?: (isCollapsed: boolean) => void;
      onCameraChange?: (
        pos: { x: number; y: number; z: number },
        target: { x: number; y: number; z: number }
      ) => void;
      onBootIntroComplete?: () => void;
      onWatermarkDisplayStart?: () => void;
      onSingularitySeedLoaded?: () => void;
      onWatermarkPauseComplete?: () => void;
      onCinematicTourChange?: (
        active: boolean,
        stageId: CinematicTourStageId,
        stageLabel: string
      ) => void;
      enableBootIntro?: boolean;
    }
  ) {
    this.container = container;
    this.params = initialParams;
    this.cachedMetrics = computeRelativisticMetrics(initialParams);
    this.onFeatureSelect = callbacks?.onFeatureSelect;
    this.onTrajectoryCreated = callbacks?.onTrajectoryCreated;
    this.onHoverCoordsChange = callbacks?.onHoverCoordsChange;
    this.onObserverReadoutChange = callbacks?.onObserverReadoutChange;
    this.onCameraDragStateChange = callbacks?.onCameraDragStateChange;
    this.onSingularityStateChange = callbacks?.onSingularityStateChange;
    this.onCameraChange = callbacks?.onCameraChange;
    this.onBootIntroComplete = callbacks?.onBootIntroComplete;
    this.onWatermarkDisplayStart = callbacks?.onWatermarkDisplayStart;
    this.onSingularitySeedLoaded = callbacks?.onSingularitySeedLoaded;
    this.onWatermarkPauseComplete = callbacks?.onWatermarkPauseComplete;
    this.onCinematicTourChange = callbacks?.onCinematicTourChange;
    const isFastBootParam =
      typeof window !== 'undefined' &&
      typeof window.location?.search === 'string' &&
      window.location.search.includes('fastboot=1');
    if (isFastBootParam) {
      this.bootIntroDuration = 0.25;
      this.bootWatermarkDelay = 0.08;
      this.bootWatermarkFadeOutDelay = 0.16;
      this.bootSeedLoadDelay = 0.24;
      this.bootAutoExpandDelay = 0.38;
    }
    this.bootIntroActive = callbacks?.enableBootIntro !== false;
    if (this.bootIntroActive) {
      this.isSingularityCollapsed = true;
      this.singularitySeedLoaded = false;
      this.seedLoadProgress = 0.0;
      this.expansionProgress = 0.0;
      this.targetExpansionProgress = 0.0;
    }

    // Ignore and clear any saved fallback flags in localStorage on startup
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const fallbackKeys = [
          'webgl_fallback',
          'canvas2d_fallback',
          'renderer_fallback',
          'safe_isolate',
          'bh_fallback_2d',
          'kerr_fallback_mode',
        ];
        for (const k of fallbackKeys) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {
      // Ignore storage access errors in sandboxed iframes
    }

    // 1. Acquire WebGL2 / WebGL1 context directly on our target canvas with high-DPI antialiasing
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    let canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.domElement = canvas;

    let glContext: WebGL2RenderingContext | null = null;
    try {
      // Stage 1: Standard WebGL2 context with opaque backbuffer (alpha: false guarantees opaque black space on desktop & mobile)
      glContext = canvas.getContext('webgl2', {
        alpha: false,
        depth: true,
        stencil: false,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      }) as WebGL2RenderingContext | null;

      // Stage 2: Retry on a fresh canvas with high-performance preference
      if (!glContext) {
        const retryCanvas = document.createElement('canvas');
        retryCanvas.style.display = 'block';
        retryCanvas.style.width = `${width}px`;
        retryCanvas.style.height = `${height}px`;
        canvas = retryCanvas;
        this.domElement = retryCanvas;
        glContext = retryCanvas.getContext('webgl2', {
          alpha: false,
          depth: true,
          stencil: false,
          antialias: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }) as WebGL2RenderingContext | null;
      }

      // Stage 3: Retry on a fresh canvas with minimal WebGL2 attributes (never fall back to WebGL1 since Three.js r163+ requires WebGL2)
      if (!glContext) {
        const defaultCanvas = document.createElement('canvas');
        defaultCanvas.style.display = 'block';
        defaultCanvas.style.width = `${width}px`;
        defaultCanvas.style.height = `${height}px`;
        canvas = defaultCanvas;
        this.domElement = defaultCanvas;
        glContext = defaultCanvas.getContext('webgl2', {
          alpha: false,
          antialias: false,
          failIfMajorPerformanceCaveat: false,
        }) as WebGL2RenderingContext | null;
      }
    } catch {
      glContext = null;
    }

    if (glContext) {
      // Guard against sandboxed desktop GPU drivers returning null from getContextAttributes() or getShaderPrecisionFormat()
      try {
        if (typeof glContext.getContextAttributes === 'function' && !glContext.getContextAttributes()) {
          Object.defineProperty(glContext, 'getContextAttributes', {
            configurable: true,
            value: () => ({
              alpha: false,
              antialias: false,
              depth: true,
              failIfMajorPerformanceCaveat: false,
              powerPreference: 'default',
              premultipliedAlpha: false,
              preserveDrawingBuffer: false,
              stencil: false,
            }),
          });
        }
        if (
          typeof glContext.getShaderPrecisionFormat === 'function' &&
          !glContext.getShaderPrecisionFormat(glContext.VERTEX_SHADER, glContext.HIGH_FLOAT)
        ) {
          Object.defineProperty(glContext, 'getShaderPrecisionFormat', {
            configurable: true,
            value: () => ({ rangeMin: 127, rangeMax: 127, precision: 23 }),
          });
        }
      } catch {
        // Ignore if prototype properties are non-configurable
      }

      const origConsoleError = console.error;
      try {
        console.error = (...args: unknown[]) => {
          const msg = String(args[0] ?? '');
          if (msg.includes('THREE.WebGLRenderer')) return;
          origConsoleError.apply(console, args);
        };
        const attrs = glContext.getContextAttributes?.();
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          context: glContext,
          alpha: false,
          antialias: attrs?.antialias ?? false,
          powerPreference: 'default',
          preserveDrawingBuffer: attrs?.preserveDrawingBuffer ?? false,
          failIfMajorPerformanceCaveat: false,
        });
      } catch {
        try {
          const freshWebglCanvas = document.createElement('canvas');
          freshWebglCanvas.style.display = 'block';
          freshWebglCanvas.style.width = `${width}px`;
          freshWebglCanvas.style.height = `${height}px`;
          canvas = freshWebglCanvas;
          this.domElement = freshWebglCanvas;
          this.renderer = new THREE.WebGLRenderer({
            canvas: freshWebglCanvas,
            alpha: false,
            antialias: false,
            powerPreference: 'default',
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false,
          });
        } catch {
          this.renderer = null;
        }
      } finally {
        console.error = origConsoleError;
      }
    } else {
      this.renderer = null;
      this.gpuRendererName = 'WebGL2 Hardware';
    }

    if (this.renderer) {
      const gl = this.renderer.getContext();
      this.isWebGL2Context =
        typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      isSoftwareGl = gl ? detectSoftwareGl(gl) : false;
      try {
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
          const rawGpu = String(gl.getParameter(param) || '').trim();
          if (rawGpu) {
            this.gpuRendererName = rawGpu;
          }
          if (this.isWebGL2Context) {
            this.gpuTimerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as {
              TIME_ELAPSED_EXT: number;
              GPU_DISJOINT_EXT: number;
            } | null;
          }
        }
      } catch {
        this.gpuRendererName = isSoftwareGl ? 'Software WebGL Rasterizer' : 'WebGL GPU';
      }

      if (typeof window !== 'undefined') {
        (
          window as Window & {
            __kerrPerfProfiler?: {
              dumpNow: () => ShaderPassTimingSnapshot | null;
              setAutoConsoleLog: (enabled: boolean) => void;
              getLatest: () => ShaderPassTimingSnapshot | null;
              getHistory: () => ShaderPassTimingSnapshot[];
              getQualityTier: () => GeodesicShaderQualityTier;
              getQualityMode: () => GeodesicShaderQualityMode;
              setQualityMode: (mode: GeodesicShaderQualityMode) => GeodesicShaderQualityTier;
              getThermalState: () => ThermalThrottleState;
              setThermalStepOverride: (steps: number | null) => number;
              getShaderPrewarmReport: () => ShaderPrewarmCacheReport;
            };
          }
        ).__kerrPerfProfiler = {
          dumpNow: () => {
            this.logShaderPassTelemetryToConsole(true);
            return this.latestPassTiming;
          },
          setAutoConsoleLog: (enabled: boolean) => {
            this.perfConsoleLoggingEnabled = Boolean(enabled);
          },
          getLatest: () => this.latestPassTiming,
          getHistory: () => [...this.passTimingHistory],
          getQualityTier: () => this.activeShaderQualityTier,
          getQualityMode: () => this.shaderQualityMode,
          setQualityMode: (mode: GeodesicShaderQualityMode) => {
            this.setShaderQualityMode(mode);
            return this.activeShaderQualityTier;
          },
          getThermalState: () => ({ ...this.thermalState }),
          setThermalStepOverride: (steps: number | null) => {
            if (steps === null || !Number.isFinite(steps)) {
              this.thermalStepOverride = null;
            } else {
              this.thermalStepOverride = Math.max(1, Math.min(5, Math.round(steps)));
            }
            const effectiveSteps =
              this.thermalStepOverride !== null
                ? this.thermalStepOverride
                : this.thermalState.uStepCount;
            if (this.gravitationalLensMat) {
              this.gravitationalLensMat.uniforms.u_stepCount.value = effectiveSteps;
            }
            return effectiveSteps;
          },
          getShaderPrewarmReport: () => ({
            ...this.shaderPrewarmReport,
            compiledVariants: [...this.shaderPrewarmReport.compiledVariants],
            compiledProgramKeys: [...this.shaderPrewarmReport.compiledProgramKeys],
          }),
        };
      }

      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.setClearColor(0x000000, 1.0);
      this.renderer.shadowMap.enabled = false;
      this.renderer.debug.checkShaderErrors = false;
      this.renderer.info.autoReset = false;
      this.configureDevicePixelRatioAndUpscaling(width, height);
    }

    if (!this.renderer) {
      // If WebGL context creation was blocked by the browser, create a clean High-DPI 2D Canvas for fallback rendering
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = Math.max(1, Math.round(width * dpr));
      fallbackCanvas.height = Math.max(1, Math.round(height * dpr));
      fallbackCanvas.style.display = 'block';
      fallbackCanvas.style.width = `${width}px`;
      fallbackCanvas.style.height = `${height}px`;
      this.domElement = fallbackCanvas;
      this.fallbackCtx2D = fallbackCanvas.getContext('2d');
    } else {
      this.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
      });
    }

    container.appendChild(this.domElement);

    // 2. Scene & Pure Black Deep Space Vacuum
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = null;

    // 3. Camera & OrbitControls (Start far out in deep space at maxDistance = 260 for 2.5s cinematic fly-in)
    const aspect = width / Math.max(1, height);
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 950);
    if (this.bootIntroActive) {
      this.camera.position.copy(this.bootIntroStartPos);
    } else {
      this.camera.position.copy(this.bootIntroEndPos);
    }

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.25;
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.85;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.85;
    this.controls.screenSpacePanning = true;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.maxDistance = 260;
    this.controls.minDistance = 1.25;
    this.controls.target.set(0, 0, 0);
    // Keep OrbitControls enabled from frame 0 so the very first 1-finger or 2-finger touch gesture is captured natively
    this.controls.enabled = true;
    this.domElement.style.touchAction = 'none';
    this.camera.lookAt(this.controls.target);

    this.controls.addEventListener('start', () => {
      // Initial 6s boot and 4s watermark pause are strictly non-skippable
      if (this.bootIntroActive || this.bootAutoExpandPending) {
        return;
      }
      this.isUserInteracting = true;
      if (this.gravitationalLensMat) {
        this.gravitationalLensMat.uniforms.u_isOrbiting.value = 1.0;
      }
      if (this.cinematicTourActive) {
        this.stopCinematicTour();
      }
      this.cameraTransitionActive = false;
      this.slowCameraPanIn = false;
      this.followStarMode = false;
      if (this.isSingularityCollapsed && this.targetExpansionProgress >= 0.99) {
        this.isSingularityCollapsed = false;
        this.onSingularityStateChange?.(false);
      }
      if (this.dragEndCooldownTimer !== null) {
        window.clearTimeout(this.dragEndCooldownTimer);
        this.dragEndCooldownTimer = null;
      }
      this.onCameraDragStateChange?.(true);
    });

    this.controls.addEventListener('end', () => {
      this.isUserInteracting = false;
      if (this.gravitationalLensMat) {
        this.gravitationalLensMat.uniforms.u_isOrbiting.value = 0.0;
      }
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.lastOrbitEndMs = now;
      this.lastObserverReadoutEmitMs = now;
      if (this.onObserverReadoutChange) {
        this.onObserverReadoutChange(this.getObserverSphericalCoords(), true);
      }
      if (this.dragEndCooldownTimer !== null) {
        window.clearTimeout(this.dragEndCooldownTimer);
      }
      this.dragEndCooldownTimer = window.setTimeout(() => {
        this.dragEndCooldownTimer = null;
        this.onCameraDragStateChange?.(false);
      }, 300);
      if (this.pendingResizeAfterOrbit) {
        this.pendingResizeAfterOrbit = false;
        this.handleResize();
      }
    });

    this.controls.addEventListener('change', () => {
      if (this.onObserverReadoutChange) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const emitIntervalMs = this.settings?.highPerformanceMode ? 360 : 200;
        if (now - this.lastObserverReadoutEmitMs >= emitIntervalMs) {
          this.lastObserverReadoutEmitMs = now;
          this.onObserverReadoutChange(this.getObserverSphericalCoords(), false);
        }
      }
      if (this.isUserInteracting && this.onCameraChange) {
        this.onCameraChange(
          { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
          { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z }
        );
      }
    });

    // Emit initial observer spherical coordinates once on setup
    if (this.onObserverReadoutChange) {
      this.onObserverReadoutChange(this.getObserverSphericalCoords(), true);
    }

    this.raycaster.layers.set(1);

    // 4. Lighting Rig
    this.setupLightingRig();

    // 5. Build Composite Subsystems (leveraging GPUResourceCache for shared textures & geometries)
    this.buildRelativisticMotionBlurPass();
    this.buildCosmicSkyDome();
    this.buildCompositeBlackHole();
    this.buildEventHorizonPulseSystem();
    this.buildParameterRippleSystem();
    this.buildAccretionShockwaveSystem();
    this.buildPrototypeNeutronStar();
    this.buildBinaryAccretionSystem();
    this.buildSpacetimeWellManifold();
    this.buildRelativisticLensingWarp();
    this.buildOrbitingStarCluster();
    this.buildBackgroundMicrolensingStarSystem();
    this.buildInstancedDeepStarfield();
    this.buildSecret1987System();
    this.buildCameraSpaceLensFlareSystem();

    this.scene.add(this.blackHoleGroup);
    this.scene.add(this.neutronStarGroup);
    this.scene.add(this.geodesicGroup);

    // 6. Shader Pre-Warming Phase:
    // Pre-compiles all material shaders for stars and black holes during initial app load
    // to eliminate frame drops during first-time rendering and preset transitions.
    this.prewarmAllMaterialShaders();

    // Apply initial parameters
    this.updateParams(initialParams, true);

    // Event listeners
    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    }
    // Ensure desktop flex layout dimensions are synchronized right after initial DOM paint
    requestAnimationFrame(() => {
      if (!this.isDisposed) {
        this.handleResize();
      }
    });
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.domElement.addEventListener('pointercancel', this.handlePointerUp);
    this.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.domElement.addEventListener('click', this.handleCanvasClick);

    this.startLoop();
  }

  /**
   * Dedicated Boot-In Shader Pre-Warming Cache:
   * Pre-compiles and links all required WebGL program variants (Full & Approximated Null-Geodesic
   * raymarchers, Classic & Volumetric Raymarched accretion disks, Lense-Thirring Ergosphere cage,
   * Supersonic Boom N-wave shockwaves, and Relativistic Motion-Blur Post-Pass) during the boot-in
   * sequence so that zero GLSL compilation stutter occurs when new shader variants are first
   * dispatched to the GPU.
   */
  public prewarmAllMaterialShaders(): ShaderPrewarmCacheReport {
    const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const programKeys = [
      'lensing_kerr_raymarcher_full_geodesic_v1',
      'lensing_kerr_raymarcher_approx_null_geodesic_v1',
      'accretion_disk_classic_v1',
      'accretion_disk_volumetric_fbm_v1',
      'ergosphere_lense_thirring_cage_v1',
      'singularity_core_seed_v1',
      'singularity_halo_seed_v1',
      'compact_star_crust_beloborodov_v1',
      'pulsar_synchrotron_beams_v1',
      'binary_roche_donor_star_v1',
      'binary_roche_corona_v1',
      'binary_bezier_stream_v1',
      'camera_lens_flare_ndc_v1',
      'instanced_starfield_lensing_v1',
      'relativistic_motion_blur_post_v1',
      'event_horizon_sonic_boom_v1',
      'parameter_ripple_wave_v1',
      'accretion_shockwave_blast_v1',
    ];
    for (const key of programKeys) {
      gpuResourceCache.registerShaderProgram(key);
    }

    const compiledVariants: ShaderPrewarmVariantId[] = SHADER_PREWARM_MANIFEST.map((m) => m.id);

    if (this.renderer) {
      const savedStates: Array<{
        obj: THREE.Object3D;
        visible: boolean;
        frustumCulled: boolean;
      }> = [];
      this.scene.traverse((obj) => {
        savedStates.push({
          obj,
          visible: obj.visible,
          frustumCulled: obj.frustumCulled,
        });
        obj.visible = true;
        obj.frustumCulled = false;
      });

      const savedLensMat = this.gravitationalLensMesh?.material;
      const savedDiskStyle = this.accretionDiskMat?.uniforms?.uDiskStyle?.value ?? 0.0;
      const savedLensDiskStyle = this.gravitationalLensMat?.uniforms?.uDiskStyle?.value ?? 0.0;
      const savedRenderTarget = this.renderer.getRenderTarget();
      const prewarmTarget = new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: true,
        stencilBuffer: false,
      });

      try {
        // Variant Pass 1: Full Geodesic Raymarcher + Classic Accretion Disk + Ergosphere + Sonic Boom
        if (this.gravitationalLensMesh && this.gravitationalLensMatFull) {
          this.gravitationalLensMesh.material = this.gravitationalLensMatFull;
          this.gravitationalLensMatFull.uniforms.uDiskStyle.value = 0.0;
        }
        if (this.accretionDiskMat?.uniforms?.uDiskStyle) {
          this.accretionDiskMat.uniforms.uDiskStyle.value = 0.0;
        }
        this.renderer.compile(this.scene, this.camera);
        this.renderer.setRenderTarget(prewarmTarget);
        this.renderer.render(this.scene, this.camera);

        // Variant Pass 2: Approximated Null-Geodesic Raymarcher + Volumetric Raymarched Accretion Disk
        if (this.gravitationalLensMesh && this.gravitationalLensMatApprox) {
          this.gravitationalLensMesh.material = this.gravitationalLensMatApprox;
          this.gravitationalLensMatApprox.uniforms.uDiskStyle.value = 1.0;
        }
        if (this.accretionDiskMat?.uniforms?.uDiskStyle) {
          this.accretionDiskMat.uniforms.uDiskStyle.value = 1.0;
        }
        this.renderer.compile(this.scene, this.camera);
        this.renderer.render(this.scene, this.camera);

        // Variant Pass 3: Post-Processing Chromatic Dispersion & Time-Lapse Shader
        if (this.postScene && this.postCamera) {
          this.renderer.compile(this.postScene, this.postCamera);
        }
      } catch {
        // Ignore non-fatal headless WebGL driver quirks during offscreen warm-up
      } finally {
        for (const st of savedStates) {
          st.obj.visible = st.visible;
          st.obj.frustumCulled = st.frustumCulled;
        }
        if (this.gravitationalLensMesh && savedLensMat) {
          this.gravitationalLensMesh.material = savedLensMat;
        }
        if (this.accretionDiskMat?.uniforms?.uDiskStyle) {
          this.accretionDiskMat.uniforms.uDiskStyle.value = savedDiskStyle;
        }
        if (this.gravitationalLensMatFull?.uniforms?.uDiskStyle) {
          this.gravitationalLensMatFull.uniforms.uDiskStyle.value = savedLensDiskStyle;
        }
        if (this.gravitationalLensMatApprox?.uniforms?.uDiskStyle) {
          this.gravitationalLensMatApprox.uniforms.uDiskStyle.value = savedLensDiskStyle;
        }
        this.renderer.setRenderTarget(savedRenderTarget);
        prewarmTarget.dispose();
      }
    }

    const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const programsCount = this.renderer?.info?.programs?.length ?? programKeys.length;
    this.shaderPrewarmReport = buildShaderPrewarmCacheReport(
      compiledVariants,
      endMs - startMs,
      programsCount
    );
    if (this.perfConsoleLoggingEnabled) {
      console.info(
        `[Kerr Shader Pre-Warm Cache] Pre-compiled ${this.shaderPrewarmReport.compiledVariants.length} core variants (${this.shaderPrewarmReport.webglProgramsCount} WebGL programs) in ${this.shaderPrewarmReport.prewarmDurationMs}ms [${this.shaderPrewarmReport.compiledVariants.join(', ')}]`
      );
    }
    return this.shaderPrewarmReport;
  }

  public getShaderPrewarmReport(): ShaderPrewarmCacheReport {
    return {
      ...this.shaderPrewarmReport,
      compiledVariants: [...this.shaderPrewarmReport.compiledVariants],
      compiledProgramKeys: [...this.shaderPrewarmReport.compiledProgramKeys],
    };
  }

  private setupLightingRig() {
    const keyLight = new THREE.DirectionalLight(0xffdf9e, 2.8);
    keyLight.position.set(12, 16, 10);
    keyLight.castShadow = !isSoftwareGl;
    this.scene.add(keyLight);

    const hemiFill = new THREE.HemisphereLight(0x60a5fa, 0x070b14, 0.9);
    this.scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(-14, -8, -12);
    this.scene.add(rimLight);
  }

  private createProceduralSpectrumTexture(): THREE.CanvasTexture {
    const maxAniso = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    return gpuResourceCache.getOrCreateTexture(
      'spectrum_lut_512x32',
      () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        const grad = ctx.createLinearGradient(0, 0, 512, 0);
        grad.addColorStop(0.0, '#0a0305');
        grad.addColorStop(0.12, '#3d0a08');
        grad.addColorStop(0.28, '#992608');
        grad.addColorStop(0.48, '#ea580c');
        grad.addColorStop(0.68, '#f59e0b');
        grad.addColorStop(0.85, '#fef08a');
        grad.addColorStop(0.96, '#ffffff');
        grad.addColorStop(1.0, '#ffffff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAniso;
        texture.needsUpdate = true;
        return texture;
      },
      maxAniso
    );
  }

  private buildCompositeBlackHole() {
    const spectrumLut = this.createProceduralSpectrumTexture();

    // 1. Central Event Horizon 3D Occluder Sphere (Writes 3D depth so the rear half of the equatorial disk is occluded while the front half passes cleanly in front of the shadow)
    const horizonGeo = gpuResourceCache.getOrCreateGeometry(
      'event_horizon_sphere_48',
      () => new THREE.SphereGeometry(2.12, 48, 48)
    );
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      depthWrite: true,
      depthTest: true,
    });
    this.eventHorizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    this.eventHorizonMesh.renderOrder = 5;
    this.eventHorizonMesh.layers.enable(1);
    this.eventHorizonMesh.userData.feature = {
      title: 'Event Horizon (r₊)',
      subtitle: 'Kerr Spacetime Causal Boundary',
      formula: 'r₊ = (GM/c²)[1 + √(1 - a*²)]',
      description:
        'The null hypersurface boundary of no return. Within r₊, escape velocity exceeds c and all timelike geodesics terminate at the central ring singularity.',
    } satisfies InspectedFeature;
    this.blackHoleGroup.add(this.eventHorizonMesh);

    // 1b. Initial Compressed Singularity Seed Ball (starts small at the origin and grows directly into the black hole along with the shockwave)
    this.singularityCoreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uSpectralMode: { value: 0 },
      },
      vertexShader: SINGULARITY_BALL_VERTEX_SHADER,
      fragmentShader: SINGULARITY_BALL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });
    // Radius 2.26 matches the local event horizon shadow radius r_horizon so the small ball
    // scales up in 1:1 geometric lockstep with the event horizon shadow as effectiveScale grows!
    const singularityCoreGeo = gpuResourceCache.getOrCreateGeometry(
      'singularity_core_sphere_64',
      () => new THREE.SphereGeometry(2.26, 64, 64)
    );
    this.singularityCoreMesh = new THREE.Mesh(
      singularityCoreGeo,
      this.singularityCoreMat
    );
    this.singularityCoreMesh.renderOrder = 14;
    this.singularitySeedGroup.add(this.singularityCoreMesh);

    this.singularityHaloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uSpectralMode: { value: 0 },
      },
      vertexShader: LENSING_VERTEX_SHADER,
      fragmentShader: SINGULARITY_HALO_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
    const singularityHaloGeo = gpuResourceCache.getOrCreateGeometry(
      'singularity_halo_plane_8_8',
      () => new THREE.PlaneGeometry(8.8, 8.8)
    );
    this.singularityHaloMesh = new THREE.Mesh(
      singularityHaloGeo,
      this.singularityHaloMat
    );
    this.singularityHaloMesh.renderOrder = 13;
    this.singularitySeedGroup.add(this.singularityHaloMesh);

    this.blackHoleGroup.add(this.singularitySeedGroup);

    // 2. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Plane)
    // Pre-calculate initial Doppler coefficients: (dopplerStrength, betaScale, gammaClamp, dopplerExponent)
    const initialDopplerCoeffs = new THREE.Vector4(
      this.params.dopplerStrength,
      0.70, // betaScale
      1.0,  // gamma clamp factor
      2.2   // doppler exponent
    );

    // Initial Disk Parameters: (spin, accretionRate, spectralMode, isStar)
    const initialDiskParams = new THREE.Vector4(
      this.params.spin,
      this.params.accretionRate,
      0.0,
      isStellarCategory(this.params.objectCategory) ? 1.0 : 0.0
    );

    // Uniform-Buffer Orbital Turbulence Math: (basePhase, ringPhase, shearRate, timeScale)
    const initialTurbBuffer = new THREE.Vector4(0.0, 0.0, 0.0, this.params.timeScale);
    // Harmonics: (radialFreq, spiralFreq, harmonicAmp, filamentBlend)
    const initialHarmonics = new THREE.Vector4(1.8, 2.4, 0.5, 0.38);

    this.accretionDiskMat = new THREE.ShaderMaterial({
      uniforms: {
        uDopplerCoeffs: { value: initialDopplerCoeffs },
        uDiskParams: { value: initialDiskParams },
        uTurbulenceBuffer: { value: initialTurbBuffer },
        uTurbulenceHarmonics: { value: initialHarmonics },
        uSpectrumLut: { value: spectrumLut },
        uPulseRadius: { value: 0 },
        uPulseStrength: { value: 0 },
        uDiskStyle: { value: this.settings.accretionDiskStyle === 'raymarched' ? 1.0 : 0.0 },
        uBloomIntensity: { value: this.settings.bloomIntensity },
        uAccretionState: { value: (this.params.accretionState ?? 'quiescent') === 'active' ? 1.0 : 0.0 },
        uExpansionProgress: { value: this.expansionProgress },
        uDepthPeeling: {
          value: Boolean(this.settings.webglDepthPeeling ?? this.settings.highPerformanceMode)
            ? 1.0
            : 0.0,
        },
      },
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    // 2. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Ring Geometry)
    // Inner radius = 1.55 extends inside the horizon plunge boundary so the fragment shader's smoothstep(r_horizon * 1.02, r_isco, r) tapers alpha with zero geometric step
    const diskInnerRadius = 1.55;
    const diskOuterRadius = 6.3;
    const diskPlaneGeo = gpuResourceCache.getOrCreateGeometry(
      'accretion_disk_main_ring_160x64_v16',
      () => {
        const geo = new THREE.RingGeometry(diskInnerRadius, diskOuterRadius, 160, 64);
        const vertCount = geo.attributes.position.count;
        const midLayerAttr = new Float32Array(vertCount);
        geo.setAttribute('aVerticalLayer', new THREE.BufferAttribute(midLayerAttr, 1));
        return geo;
      }
    );

    const mainDiskMesh = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    mainDiskMesh.rotation.x = -Math.PI / 2;
    mainDiskMesh.renderOrder = 12;
    mainDiskMesh.layers.enable(1);
    mainDiskMesh.userData.feature = {
      title: 'Relativistic Accretion Disk (ISCO)',
      subtitle: 'Magnetohydrodynamic Plasma & Differential Shear',
      formula: 'T(r) ∝ r⁻³ᐟ⁴ [1 - √(r_in/r)]¹ᐟ⁴ · D = [γ(1 - β cos θ)]⁻¹',
      description:
        'Superheated gas spiraling inwards toward the innermost stable circular orbit (ISCO), reaching millions of degrees and radiating across X-ray and optical spectra.',
    } satisfies InspectedFeature;
    this.accretionDiskGroup.add(mainDiskMesh);

    // 2b. Sleek, Thinner Volumetric 3D Vertical Torus Strata for Active Accretion Mode
    this.activeDiskVolumeGroup = new THREE.Group();
    const volumeLayers = isSoftwareGl ? [] : [-0.14, 0.14];
    for (const layerVal of volumeLayers) {
      const layerGeo = gpuResourceCache.getOrCreateGeometry(
        `accretion_disk_vol_layer_v16_${layerVal.toFixed(2)}`,
        () => {
          const geo = new THREE.RingGeometry(diskInnerRadius, diskOuterRadius, 96, 32);
          const count = geo.attributes.position.count;
          const layerArr = new Float32Array(count).fill(layerVal);
          geo.setAttribute('aVerticalLayer', new THREE.BufferAttribute(layerArr, 1));
          return geo;
        }
      );
      const layerMesh = new THREE.Mesh(layerGeo, this.accretionDiskMat);
      layerMesh.rotation.x = -Math.PI / 2;
      layerMesh.renderOrder = 13;
      this.activeDiskVolumeGroup.add(layerMesh);
    }
    this.activeDiskVolumeGroup.visible =
      (this.params.accretionState ?? 'quiescent') === 'active';
    this.accretionDiskGroup.add(this.activeDiskVolumeGroup);

    this.blackHoleGroup.add(this.accretionDiskGroup);

    // 3. Ergosphere Geometric Boundary (Toggled OFF automatically by default)
    const ergoGeo = gpuResourceCache.getOrCreateGeometry(
      'ergosphere_oblate_sphere_32',
      () => {
        const geo = new THREE.SphereGeometry(2.35, 32, 32);
        geo.scale(1.0, 0.72, 1.0);
        return geo;
      }
    );
    const ergoMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      opacity: 0.24,
      roughness: 0.3,
      metalness: 0.8,
    });
    const ergoMesh = new THREE.Mesh(ergoGeo, ergoMat);
    ergoMesh.layers.enable(1);
    ergoMesh.userData.feature = {
      title: 'Ergosphere & Frame-Dragging Limit',
      subtitle: 'Static Limit Surface (g_tt = 0)',
      formula: 'r_ergo(θ) = (GM/c²)[1 + √(1 - a*² cos²θ)]',
      description:
        'Between the static limit and the event horizon, frame dragging forces all matter and light to rotate along with the black hole, enabling energy extraction via the Penrose process.',
    } satisfies InspectedFeature;
    this.ergosphereGroup.add(ergoMesh);
    this.blackHoleGroup.add(this.ergosphereGroup);
  }

  private buildEventHorizonPulseSystem() {
    this.eventHorizonPulseGroup = new THREE.Group();

    // Primary sonic boom shockwave ring (expands across equatorial accretion plane)
    const ringGeo = new THREE.RingGeometry(0.78, 1.48, 96);
    ringGeo.rotateX(-Math.PI / 2);

    // Achromatic N-wave Sonic Boom Shader:
    // Sharp leading Mach compression edge (muted silver-slate condensation mist)
    // followed immediately by a dark rarefaction / decompression shadow cavity (zero bright colors)
    const pulseShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x94a3b8) },
        uOpacity: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float radial = length(vUv - 0.5) * 2.0;
          // Signed offset relative to outer Mach shock front at radial = 0.90
          float delta = radial - 0.90;
          // Razor-sharp leading Mach compression front (Prandtl-Glauert condensation cone edge)
          float leadShock = exp(-pow(abs(delta * 24.0), 2.0));
          // Deep dark rarefaction / decompression trough right behind the leading shock front
          float rarefaction = exp(-pow(abs((delta + 0.085) * 11.0), 2.0));
          // Secondary trailing recovery Mach wave (N-wave tail)
          float tailShock = exp(-pow(abs((delta + 0.19) * 16.5), 2.0)) * 0.72;
          // High-energy acoustic pressure striations inside the shock wake
          float wakeRipples = (0.5 + 0.5 * cos(delta * 64.0)) * exp(-pow(abs((delta + 0.11) * 6.8), 2.0)) * 0.42;

          vec3 incandescentEdge = mix(vec3(0.98, 0.84, 0.62), vec3(0.94, 0.97, 1.0), leadShock);
          vec3 compressionTone = mix(uColor, incandescentEdge, 0.68) * 1.18;
          vec3 rarefactionTone = vec3(0.008, 0.012, 0.022);
          float compWeight = clamp(leadShock * 1.25 + tailShock + wakeRipples, 0.0, 1.0);
          vec3 finalRgb = mix(rarefactionTone, compressionTone, compWeight / max(0.001, compWeight + rarefaction * 0.85));
          float alpha = clamp(leadShock * 0.86 + rarefaction * 0.68 + tailShock * 0.54 + wakeRipples * 0.34, 0.0, 0.96) * uOpacity;
          gl_FragColor = vec4(finalRgb, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.primaryPulseMesh = new THREE.Mesh(ringGeo, pulseShaderMat);
    this.primaryPulseMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.primaryPulseMesh);

    // Secondary trailing harmonic sonic shockwave ring
    const secondaryMat = pulseShaderMat.clone();
    this.secondaryPulseMesh = new THREE.Mesh(ringGeo.clone(), secondaryMat);
    this.secondaryPulseMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.secondaryPulseMesh);

    // Tertiary reverberation ring
    const tertiaryMat = pulseShaderMat.clone();
    this.tertiaryPulseMesh = new THREE.Mesh(ringGeo.clone(), tertiaryMat);
    this.tertiaryPulseMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.tertiaryPulseMesh);

    // Multi-stage concentric relativistic Mach harmonic wave train rings for cinematic supersonic boom
    const extraRatios: Array<{ ratio: number; opacityWeight: number }> = [
      { ratio: 1.18, opacityWeight: 0.78 },
      { ratio: 0.88, opacityWeight: 0.68 },
      { ratio: 0.62, opacityWeight: 0.54 },
      { ratio: 0.44, opacityWeight: 0.42 },
    ];
    this.extraPulseRippleMeshes = [];
    for (const def of extraRatios) {
      const mat = pulseShaderMat.clone();
      const mesh = new THREE.Mesh(ringGeo.clone(), mat);
      mesh.visible = false;
      this.eventHorizonPulseGroup.add(mesh);
      this.extraPulseRippleMeshes.push({ mesh, ratio: def.ratio, opacityWeight: def.opacityWeight });
    }

    // 3D Spherical Sonic Boom Mach Wavefront Shell (Prandtl-Glauert vapor/pressure boundary)
    const shellGeo = new THREE.SphereGeometry(1.0, 48, 32);
    const shellMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xdbe4f0) },
        uOpacity: { value: 0.0 },
        uTime: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormalVec;
        varying vec3 vPos;
        void main() {
          vNormalVec = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormalVec;
        varying vec3 vPos;
        void main() {
          float theta = acos(clamp(vPos.y, -1.0, 1.0));
          float equatorialFocus = pow(max(0.0001, sin(theta)), 1.25);
          // Sharp grazing-angle Mach shock rim + inner dark rarefaction band
          float viewCos = abs(vNormalVec.z);
          float outerRim = exp(-pow(abs(viewCos * 4.6), 2.0));
          float innerTrough = exp(-pow(abs((viewCos - 0.22) * 6.8), 2.0));
          vec3 rimColor = mix(uColor, vec3(0.98, 0.86, 0.66), 0.55) * 0.96;
          vec3 rgb = mix(vec3(0.015, 0.02, 0.035), rimColor, outerRim / max(0.001, outerRim + innerTrough));
          float alpha = (outerRim * 0.64 + innerTrough * 0.38) * equatorialFocus * uOpacity;
          gl_FragColor = vec4(rgb, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.gravitationalWaveShellMesh = new THREE.Mesh(shellGeo, shellMat);
    this.gravitationalWaveShellMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.gravitationalWaveShellMesh);

    // High-energy boundary pressure-condensation shell hugging the inflating event horizon
    const burstGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const burstMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.horizonFlashMesh = new THREE.Mesh(burstGeo, burstMat);
    this.horizonFlashMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.horizonFlashMesh);

    this.blackHoleGroup.add(this.eventHorizonPulseGroup);
  }

  private buildParameterRippleSystem() {
    this.parameterRippleGroup = new THREE.Group();

    // Concentric relativistic ring geometry
    const ringGeo = new THREE.RingGeometry(0.85, 1.48, 96);
    ringGeo.rotateX(-Math.PI / 2);

    const shellGeo = new THREE.SphereGeometry(1.0, 32, 24);

    const poolSize = 10;
    this.parameterRipples = [];

    for (let i = 0; i < poolSize; i++) {
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0x38bdf8) },
          uOpacity: { value: 0.0 },
          uPhase: { value: 0.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uPhase;
          varying vec2 vUv;
          void main() {
            float radial = length(vUv - 0.5) * 2.0;
            float delta = radial - 0.88;
            // Razor-sharp leading wave crest
            float crest = exp(-pow(abs(delta * 26.0), 2.0));
            // Quasinormal oscillatory trailing ripples (damping harmonic wave train)
            float harmonic1 = exp(-pow(abs((delta + 0.12) * 18.0), 2.0)) * 0.65 * (0.6 + 0.4 * cos(delta * 65.0 - uPhase));
            float harmonic2 = exp(-pow(abs((delta + 0.24) * 14.0), 2.0)) * 0.40 * (0.6 + 0.4 * sin(delta * 85.0 - uPhase * 1.5));
            float harmonic3 = exp(-pow(abs((delta + 0.36) * 11.0), 2.0)) * 0.22;
            float wave = crest + harmonic1 + harmonic2 + harmonic3;
            vec3 crestTone = mix(uColor, vec3(1.0, 1.0, 1.0), crest * 0.75);
            float alpha = clamp(wave, 0.0, 1.0) * uOpacity;
            gl_FragColor = vec4(crestTone, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const ringMesh = new THREE.Mesh(ringGeo.clone(), ringMat);
      ringMesh.visible = false;
      this.parameterRippleGroup.add(ringMesh);

      const shellMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0x38bdf8) },
          uOpacity: { value: 0.0 },
        },
        vertexShader: `
          varying vec3 vNormalVec;
          void main() {
            vNormalVec = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec3 vNormalVec;
          void main() {
            float viewCos = abs(vNormalVec.z);
            float rim = exp(-pow(abs(viewCos * 5.2), 2.0));
            vec3 rgb = mix(uColor, vec3(0.92, 0.96, 1.0), 0.45);
            float alpha = rim * uOpacity * 0.38;
            gl_FragColor = vec4(rgb, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });

      const shellMesh = new THREE.Mesh(shellGeo.clone(), shellMat);
      shellMesh.visible = false;
      this.parameterRippleGroup.add(shellMesh);

      this.parameterRipples.push({
        ringMesh,
        shellMesh,
        active: false,
        progress: 0.0,
        speed: 0.72,
        intensity: 1.0,
        type: 'mixed',
        startRadius: 2.0,
        maxRadius: 32.0,
      });
    }

    this.blackHoleGroup.add(this.parameterRippleGroup);
  }

  public spawnParameterRipple(type: 'spin' | 'accretion' | 'mixed' = 'mixed', intensity: number = 1.0) {
    if (this.settings.rapidAdjustmentRipples === false) return;

    let candidate = this.parameterRipples.find((r) => !r.active);
    if (!candidate) {
      candidate = this.parameterRipples.reduce((prev, curr) => (curr.progress > prev.progress ? curr : prev));
    }

    const isStar = isStellarCategory(this.params?.objectCategory);
    const effectiveScale = isStar ? this.currentScale : this.currentScale;
    const startR = isStar ? 1.4 * effectiveScale : Math.max(0.4, 2.15 * effectiveScale);
    const maxR = Math.max(18.0, 34.0 * effectiveScale);

    candidate.active = true;
    candidate.progress = 0.0;
    candidate.speed = 0.68 + Math.random() * 0.18;
    candidate.intensity = Math.min(1.4, Math.max(0.65, intensity));
    candidate.type = type;
    candidate.startRadius = startR;
    candidate.maxRadius = maxR;

    let colHex = 0x38bdf8; // electric cyan for spin
    if (type === 'accretion') {
      colHex = 0xf59e0b; // fiery amber for accretion
    } else if (type === 'mixed') {
      colHex = 0xa855f7; // purple-magenta superradiant
    }
    const color = new THREE.Color(colHex);

    const ringMat = candidate.ringMesh.material as THREE.ShaderMaterial;
    ringMat.uniforms.uColor.value.copy(color);
    ringMat.uniforms.uOpacity.value = candidate.intensity * 0.88;
    candidate.ringMesh.scale.set(startR, 1.0, startR);
    candidate.ringMesh.visible = true;

    const shellMat = candidate.shellMesh.material as THREE.ShaderMaterial;
    shellMat.uniforms.uColor.value.copy(color);
    shellMat.uniforms.uOpacity.value = candidate.intensity * 0.38;
    candidate.shellMesh.scale.set(startR, startR, startR);
    candidate.shellMesh.visible = true;
  }

  public clearParameterRipples() {
    for (const rip of this.parameterRipples) {
      rip.active = false;
      rip.ringMesh.visible = false;
      rip.shellMesh.visible = false;
    }
  }

  private buildAccretionShockwaveSystem() {
    this.accretionShockwaveGroup = new THREE.Group();

    // 1. Primary Accretion Blast Ring (Mach compression front with thermal ionization wake)
    const shockRingGeo = new THREE.RingGeometry(0.82, 1.56, 96);
    shockRingGeo.rotateX(-Math.PI / 2);

    const primaryMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xf59e0b) },
        uOpacity: { value: 0.0 },
        uProgress: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uProgress;
        varying vec2 vUv;
        void main() {
          float radial = length(vUv - 0.5) * 2.0;
          float delta = radial - 0.90;
          // Searing ionizing shock front
          float leadShock = exp(-pow(abs(delta * 28.0), 2.0));
          // Thermal plasma compression wake with acoustic striations
          float wake = exp(-pow(abs((delta + 0.14) * 14.0), 2.0)) * (0.6 + 0.4 * cos(delta * 70.0));
          float trailingMist = exp(-pow(abs((delta + 0.28) * 9.0), 2.0)) * 0.35;
          float shockProfile = leadShock + wake + trailingMist;
          vec3 coreColor = vec3(1.0, 0.98, 0.92);
          vec3 blastColor = mix(uColor, coreColor, leadShock * 0.85);
          float alpha = clamp(shockProfile, 0.0, 1.0) * uOpacity;
          gl_FragColor = vec4(blastColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.accretionShockPrimaryMesh = new THREE.Mesh(shockRingGeo, primaryMat);
    this.accretionShockPrimaryMesh.visible = false;
    this.accretionShockwaveGroup.add(this.accretionShockPrimaryMesh);

    // 2. Secondary Trailing Acoustic Compression Ring
    const secondaryMat = primaryMat.clone();
    this.accretionShockSecondaryMesh = new THREE.Mesh(shockRingGeo.clone(), secondaryMat);
    this.accretionShockSecondaryMesh.visible = false;
    this.accretionShockwaveGroup.add(this.accretionShockSecondaryMesh);

    // 3. 3D Spherical Radiation-Pressure Blast Wave Shell
    const shellGeo = new THREE.SphereGeometry(1.0, 36, 28);
    const shellMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xf59e0b) },
        uOpacity: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormalVec;
        varying vec3 vPos;
        void main() {
          vNormalVec = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormalVec;
        varying vec3 vPos;
        void main() {
          float viewCos = abs(vNormalVec.z);
          float rim = exp(-pow(abs(viewCos * 4.8), 2.0));
          float poleFade = clamp(1.0 - abs(vPos.y) * 0.35, 0.0, 1.0);
          vec3 rgb = mix(uColor, vec3(1.0, 0.95, 0.85), rim * 0.7);
          float alpha = rim * uOpacity * 0.65 * poleFade;
          gl_FragColor = vec4(rgb, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.accretionShockShellMesh = new THREE.Mesh(shellGeo, shellMat);
    this.accretionShockShellMesh.visible = false;
    this.accretionShockwaveGroup.add(this.accretionShockShellMesh);

    // 4. Horizon Ionization Flash Sphere (originates directly hugging the event horizon r_H)
    const flashGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const flashMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffeedd) },
        uOpacity: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormalVec;
        void main() {
          vNormalVec = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormalVec;
        void main() {
          float rim = 0.5 + 0.5 * abs(vNormalVec.z);
          gl_FragColor = vec4(uColor, rim * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.accretionHorizonFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.accretionHorizonFlashMesh.visible = false;
    this.accretionShockwaveGroup.add(this.accretionHorizonFlashMesh);

    this.blackHoleGroup.add(this.accretionShockwaveGroup);
  }

  public triggerAccretionShockwave(intensity: number = 1.0, isSurge: boolean = true) {
    if (this.settings.accretionShockwaveEnabled === false) return;

    const isStar = isStellarCategory(this.params?.objectCategory);
    const effectiveScale = this.currentScale;
    const horizonR = isStar ? 1.65 * effectiveScale : 2.26 * effectiveScale;

    this.isAccretionShockActive = true;
    this.accretionShockProgress = 0.0;
    this.accretionShockIntensity = Math.min(1.6, Math.max(0.7, intensity));
    this.accretionShockRadius = horizonR;

    // Distinctive color: Fiery radiant amber/gold for accretion surge, or electric cyan/blue for rapid cooling
    const hexColor = isSurge ? 0xf59e0b : 0x38bdf8;
    this.accretionShockColor.set(hexColor);

    const primaryMat = this.accretionShockPrimaryMesh.material as THREE.ShaderMaterial;
    primaryMat.uniforms.uColor.value.copy(this.accretionShockColor);
    primaryMat.uniforms.uOpacity.value = this.accretionShockIntensity * 0.95;
    this.accretionShockPrimaryMesh.scale.set(horizonR, horizonR, horizonR);
    this.accretionShockPrimaryMesh.visible = true;

    const secondaryMat = this.accretionShockSecondaryMesh.material as THREE.ShaderMaterial;
    secondaryMat.uniforms.uColor.value.copy(this.accretionShockColor);
    secondaryMat.uniforms.uOpacity.value = this.accretionShockIntensity * 0.60;
    this.accretionShockSecondaryMesh.scale.set(horizonR * 0.95, horizonR * 0.95, horizonR * 0.95);
    this.accretionShockSecondaryMesh.visible = true;

    const shellMat = this.accretionShockShellMesh.material as THREE.ShaderMaterial;
    shellMat.uniforms.uColor.value.copy(this.accretionShockColor);
    shellMat.uniforms.uOpacity.value = this.accretionShockIntensity * 0.48;
    this.accretionShockShellMesh.scale.set(horizonR, horizonR, horizonR);
    this.accretionShockShellMesh.visible = true;

    const flashMat = this.accretionHorizonFlashMesh.material as THREE.ShaderMaterial;
    flashMat.uniforms.uColor.value.set(isSurge ? 0xfff3db : 0xbae6fd);
    flashMat.uniforms.uOpacity.value = this.accretionShockIntensity * 0.85;
    this.accretionHorizonFlashMesh.scale.set(horizonR, horizonR, horizonR);
    this.accretionHorizonFlashMesh.visible = true;
  }

  public clearAccretionShockwave() {
    this.isAccretionShockActive = false;
    this.accretionShockProgress = 1.0;
    if (this.accretionShockPrimaryMesh) this.accretionShockPrimaryMesh.visible = false;
    if (this.accretionShockSecondaryMesh) this.accretionShockSecondaryMesh.visible = false;
    if (this.accretionShockShellMesh) this.accretionShockShellMesh.visible = false;
    if (this.accretionHorizonFlashMesh) this.accretionHorizonFlashMesh.visible = false;
  }

  private neutronStarMat!: THREE.ShaderMaterial;
  private pulsarBeamSystem!: PulsarBeamSystem;
  private currentMagneticAxis = new THREE.Vector3(0, 1, 0);
  private lastHotspotAlignment = 0;

  private buildPrototypeNeutronStar() {
    const initialMagAxis = new THREE.Vector3(Math.sin(0.42), Math.cos(0.42), 0.0).normalize();

    // 1. Ultra-Dense Crystalline Iron Crust Sphere (20 km Physical Stellar Surface)
    // High-resolution subdivision (96x96) supports smooth vertex seismic ripple modes
    const crustGeo = gpuResourceCache.getOrCreateGeometry(
      'neutron_star_crust_sphere_96',
      () => new THREE.SphereGeometry(1.65, 96, 96)
    );
    this.neutronStarMat = createCompactStarMaterial({
      baseColor: 0x0ea5e9,
      hotspotIntensity: 1.65,
      radius: 1.65,
      schwarzschildRadius: 0.68, // R_s / R_star ≈ 0.41 (Beloborodov self-lensing limit)
      magneticAxis: initialMagAxis,
    });
    this.neutronStarMesh = new THREE.Mesh(crustGeo, this.neutronStarMat);
    this.neutronStarMesh.layers.enable(1);
    this.neutronStarMesh.userData.feature = {
      title: 'Neutron Star Crystalline Crust',
      subtitle: '10¹⁴ g/cm³ Solid Baryonic Surface (No Event Horizon)',
      formula: 'R_star ≈ 10-12 km > R_s = 2GM/c² ≈ 4.2 km (TOV Limit)',
      description:
        'A physical solid surface composed of an ultra-dense crystalline lattice of iron nuclei and degenerate relativistic electrons. Supported by neutron degeneracy pressure, it does not collapse into a black hole.',
    } satisfies InspectedFeature;
    this.neutronStarGroup.add(this.neutronStarMesh);

    // 2. Dual Relativistic Pulsar Radio Lighthouse Beams (Volumetric Core-Sheath Synchrotron Jets)
    // Erupt directly from the North (+uMagneticAxis * R_star) and South (-uMagneticAxis * R_star) magnetic polar caps
    this.pulsarBeamSystem = createPulsarBeamSystem({
      starRadius: 1.65,
      beamLength: 18.0,
      baseRadius: 0.32,
      tipRadius: 2.4,
      coreColor: 0xf0f9ff,
      sheathColor: 0x38bdf8,
      beamIntensity: 1.85,
      magneticAxis: initialMagAxis,
    });
    this.pulsarBeamsGroup = this.pulsarBeamSystem.group;

    this.pulsarBeamsGroup.userData.feature = {
      title: 'Relativistic Pulsar Lighthouse Beams',
      subtitle: 'Coherent Synchrotron Radio Emission',
      formula: 'P_rad ∝ B² Ω⁴ R⁶ / c³ · Δt = 1.337 s (PSR B1919+21)',
      description:
        'Ultra-relativistic plasma accelerated along open magnetic field lines generates intense beams of synchrotron radiation that sweep through space like a lighthouse.',
    } satisfies InspectedFeature;
    this.neutronStarGroup.add(this.pulsarBeamsGroup);

    // 3. Magnetic Dipole Field Lines (10¹² Gauss Toroidal Cage Loops)
    this.magneticDipoleGroup = new THREE.Group();
    this.magneticDipoleGroup.rotation.z = THREE.MathUtils.degToRad(24);

    const loopCount = 8;
    for (let l = 0; l < loopCount; l++) {
      const angle = (l / loopCount) * Math.PI;
      const curve = new THREE.EllipseCurve(0, 0, 4.2, 2.6, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0));
      const loopGeo = new THREE.BufferGeometry().setFromPoints(points);
      const loopMat = new THREE.LineBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.38,
      });
      const loopLine = new THREE.Line(loopGeo, loopMat);
      loopLine.rotation.y = angle;
      this.magneticDipoleGroup.add(loopLine);
    }

    this.magneticDipoleGroup.userData.feature = {
      title: 'Magnetic Dipole Field (10¹² Gauss)',
      subtitle: 'Dipolar Magnetosphere & Polar Caps',
      formula: 'B(r, θ) = (μ / r³) √(1 + 3 cos²θ)',
      description:
        'Intense magnetic dipole field frozen into the superconducting stellar interior during supernova core collapse.',
    } satisfies InspectedFeature;
    this.neutronStarGroup.add(this.magneticDipoleGroup);

    // Initially hidden (enabled when objectCategory === 'star')
    this.neutronStarGroup.visible = false;
  }

  private secret1987Group!: THREE.Group;
  private secret1987EquatorialRing!: THREE.Group;
  private secret1987NorthRing!: THREE.Mesh;
  private secret1987SouthRing!: THREE.Mesh;

  private buildSecret1987System() {
    this.secret1987Group = new THREE.Group();
    this.secret1987Group.visible = Boolean(this.settings.secret1987Mode);

    // 1. SN 1987A Equatorial "Cosmic Pearl Necklace" Ring (24 glowing shocked-gas knots + golden torus)
    this.secret1987EquatorialRing = new THREE.Group();
    const eqTorusGeo = new THREE.TorusGeometry(6.8, 0.07, 16, 96);
    eqTorusGeo.rotateX(Math.PI / 2);
    const eqTorusMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.secret1987EquatorialRing.add(new THREE.Mesh(eqTorusGeo, eqTorusMat));

    const pearlCount = 24;
    const pearlGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const pearlMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < pearlCount; i++) {
      const theta = (i / pearlCount) * Math.PI * 2;
      const pearl = new THREE.Mesh(pearlGeo, pearlMat);
      pearl.position.set(Math.cos(theta) * 6.8, 0, Math.sin(theta) * 6.8);
      this.secret1987EquatorialRing.add(pearl);
    }
    this.secret1987Group.add(this.secret1987EquatorialRing);

    // 2. SN 1987A Northern & Southern Bipolar Hourglass Rings
    const outerRingGeo = new THREE.TorusGeometry(10.5, 0.085, 16, 112);
    outerRingGeo.rotateX(Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xe879f9,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.secret1987NorthRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.secret1987NorthRing.position.set(0, 4.6, 0);
    this.secret1987NorthRing.rotation.z = THREE.MathUtils.degToRad(26);
    this.secret1987Group.add(this.secret1987NorthRing);

    this.secret1987SouthRing = new THREE.Mesh(outerRingGeo, outerRingMat.clone());
    this.secret1987SouthRing.position.set(0, -4.6, 0);
    this.secret1987SouthRing.rotation.z = THREE.MathUtils.degToRad(-26);
    this.secret1987Group.add(this.secret1987SouthRing);

    this.secret1987Group.userData.feature = {
      title: 'Protocol 1987 // SN 1987A Triple-Ring Nebula',
      subtitle: 'Classified Supernova 1987A Circumstellar Hourglass Rings',
      formula: 'SN 1987A (LMC · Feb 23, 1987) · E_ν ≈ 10⁵³ ergs',
      description:
        'Unlocked via Clearance Code 1987: Recreates the iconic glowing equatorial "Cosmic Pearl Necklace" and twin bipolar hourglass rings of Supernova 1987A.',
    } satisfies InspectedFeature;

    this.scene.add(this.secret1987Group);
  }

  private buildBinaryAccretionSystem() {
    this.binarySystemGroup = new THREE.Group();
    this.binarySystemGroup.renderOrder = 15;

    // 1. Companion Donor Star (Volumetric fBM Boiling Solar Surface + Roche Lobe Teardrop Deformation)
    const starGeo = gpuResourceCache.getOrCreateGeometry(
      'binary_companion_star_96',
      () => new THREE.SphereGeometry(this.companionStarBaseRadius, 96, 96)
    );
    this.binaryStarMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBloomIntensity: { value: this.settings.bloomIntensity },
        uBlackHolePos: { value: new THREE.Vector3() },
        uHorizonRadiusWorld: { value: 2.25 },
        uLensingActive: { value: 1.0 },
      },
      vertexShader: BINARY_STAR_VERTEX_SHADER,
      fragmentShader: BINARY_STAR_FRAGMENT_SHADER,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });

    this.binaryStarMesh = new THREE.Mesh(starGeo, this.binaryStarMat);
    this.binaryStarMesh.position.copy(this.companionStarLocalPos);
    this.binaryStarMesh.renderOrder = 15;
    this.binaryStarMesh.layers.enable(1);
    this.binaryStarMesh.userData.feature = {
      title: 'Companion Donor Star (Roche Lobe Overflow)',
      subtitle: 'Tidal Teardrop Distortion & Convective fBM Photosphere',
      formula: 'R_L / a ≈ 0.49 q^(2/3) / [0.6 q^(2/3) + ln(1 + q^(1/3))]',
      description:
        'A stellar companion orbiting close enough that its outer envelope fills its Roche equipotential lobe. Extreme tidal forces deform the star into a teardrop apex at the inner Lagrange point (L₁), siphoning superheated stellar plasma into the black hole.',
    } satisfies InspectedFeature;
    this.binarySystemGroup.add(this.binaryStarMesh);

    // 2. Bright Coronal Fresnel Glow Envelope around the Companion Star
    const coronaGeo = gpuResourceCache.getOrCreateGeometry(
      'binary_companion_corona_64',
      () => new THREE.SphereGeometry(this.companionStarBaseRadius * 1.34, 64, 64)
    );
    this.binaryCoronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBloomIntensity: { value: this.settings.bloomIntensity },
        uBlackHolePos: { value: new THREE.Vector3() },
        uHorizonRadiusWorld: { value: 2.25 },
        uLensingActive: { value: 1.0 },
      },
      vertexShader: BINARY_STAR_VERTEX_SHADER,
      fragmentShader: BINARY_CORONA_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    this.binaryCoronaMesh = new THREE.Mesh(coronaGeo, this.binaryCoronaMat);
    this.binaryCoronaMesh.position.copy(this.companionStarLocalPos);
    this.binaryCoronaMesh.renderOrder = 16;
    this.binarySystemGroup.add(this.binaryCoronaMesh);

    // 3. The Accretion Stream (Cubic Bezier Plasma Bridge from the Star's L1 Equator to the Accretion Disk)
    // Curves gracefully in the direction of prograde Coriolis deflection into the outer accretion disk rim
    const p0 = new THREE.Vector3(this.companionStarLocalPos.x - this.companionStarBaseRadius * 1.15, 0.0, 0.0); // L1 nozzle on star equator
    const p1 = new THREE.Vector3(12.2, 0.14, -2.4);
    const p2 = new THREE.Vector3(7.4, -0.10, -5.2);
    const p3 = new THREE.Vector3(1.8, 0.0, -5.8); // Tangent entry into outer prograde accretion disk

    this.streamCurve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);

    // 3a. Inner Dense Volumetric fBM Plasma Bridge Tube
    const streamInnerGeo = new THREE.TubeGeometry(this.streamCurve, 96, 0.42, 24, false);
    this.accretionStreamMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBloomIntensity: { value: this.settings.bloomIntensity },
        uIsOuterSheath: { value: 0.0 },
        uSpectralMode: { value: 0 },
      },
      vertexShader: ACCRETION_STREAM_VERTEX_SHADER,
      fragmentShader: ACCRETION_STREAM_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.accretionStreamMesh = new THREE.Mesh(streamInnerGeo, this.accretionStreamMat);
    this.accretionStreamMesh.renderOrder = 15;
    this.accretionStreamMesh.layers.enable(1);
    this.accretionStreamMesh.userData.feature = {
      title: 'Roche Lobe Accretion Stream (L₁ Plasma Bridge)',
      subtitle: 'Ballistic Coriolis-Deflected Gas Siphon',
      formula: '∂ρ/∂t + ∇·(ρv) = 0 · Ω_orb × v_stream',
      description:
        'Magnetized stellar plasma escaping across the inner Lagrange saddle point (L₁) falls ballistically toward the black hole, curving via Coriolis forces before striking the outer accretion disk in a luminous shock hotspot.',
    } satisfies InspectedFeature;
    this.binarySystemGroup.add(this.accretionStreamMesh);

    // 3b. Outer Volumetric Plasma Halo Sheath
    const streamOuterGeo = new THREE.TubeGeometry(this.streamCurve, 96, 0.92, 24, false);
    this.accretionStreamOuterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBloomIntensity: { value: this.settings.bloomIntensity },
        uIsOuterSheath: { value: 1.0 },
        uSpectralMode: { value: 0 },
      },
      vertexShader: ACCRETION_STREAM_VERTEX_SHADER,
      fragmentShader: ACCRETION_STREAM_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.accretionStreamOuterMesh = new THREE.Mesh(streamOuterGeo, this.accretionStreamOuterMat);
    this.accretionStreamOuterMesh.renderOrder = 15;
    this.binarySystemGroup.add(this.accretionStreamOuterMesh);

    // 3c. Accretion Stream Impact Shock Hotspot (where the Bezier plasma stream strikes the accretion disk rim)
    const hotspotGeo = new THREE.SphereGeometry(0.95, 24, 24);
    hotspotGeo.scale(1.6, 0.48, 1.2);
    const hotspotMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.streamHotspotMesh = new THREE.Mesh(hotspotGeo, hotspotMat);
    this.streamHotspotMesh.position.copy(p3);
    this.streamHotspotMesh.renderOrder = 16;
    this.binarySystemGroup.add(this.streamHotspotMesh);

    // 3d. Instanced Particle System flowing along the Cubic Bezier curve from the star's equator into the disk
    const particleGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.streamParticlesInstanced = new THREE.InstancedMesh(
      particleGeo,
      particleMat,
      this.streamParticleCount
    );
    this.streamParticlesInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.streamParticlesInstanced.renderOrder = 16;

    const colOrigin = new THREE.Color(0xff7b1c);
    const colMid = new THREE.Color(0xfbbf24);
    const colHot = new THREE.Color(0xfffbeb);

    this.streamParticleOffsets = [];
    for (let i = 0; i < this.streamParticleCount; i++) {
      const phase = i / this.streamParticleCount;
      this.streamParticlePhases[i] = phase;
      this.streamParticleSpeeds[i] = 0.22 + Math.random() * 0.14;
      this.streamParticleScales[i] = 0.45 + Math.random() * 0.95;

      // Radial spread around the Bezier spine that narrows as the stream focuses into the accretion disk
      const angle = Math.random() * Math.PI * 2;
      const radius = (Math.random() * 0.65 + 0.08);
      this.streamParticleOffsets.push(
        new THREE.Vector3(
          Math.cos(angle) * radius * 0.45,
          Math.sin(angle) * radius * 0.38,
          Math.cos(angle) * radius * 0.45
        )
      );

      _color.copy(colOrigin).lerp(colMid, Math.min(1.0, phase * 1.4)).lerp(colHot, Math.pow(phase, 2.2));
      this.streamParticlesInstanced.setColorAt(i, _color);
    }
    if (this.streamParticlesInstanced.instanceColor) {
      this.streamParticlesInstanced.instanceColor.needsUpdate = true;
    }
    this.binarySystemGroup.add(this.streamParticlesInstanced);

    this.binarySystemGroup.visible = this.params.systemCategory === 'binary';
    this.blackHoleGroup.add(this.binarySystemGroup);
  }

  private buildSpacetimeWellManifold() {
    // Optimized continuous Cartesian Spacetime Manifold (56x56 grid = 3,249 vertices with precomputed polar tables, reducing CPU vertex load by >55%)
    this.spacetimeWellGeo = new THREE.PlaneGeometry(130, 130, 56, 56);
    this.spacetimeWellGeo.rotateX(-Math.PI / 2);

    const posAttr = this.spacetimeWellGeo.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;
    this.wellVertexX = new Float32Array(count);
    this.wellVertexZ = new Float32Array(count);
    this.wellVertexR = new Float32Array(count);
    this.wellVertexAngle = new Float32Array(count);
    this.wellVertexFrameDragBase = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const r = Math.hypot(x, z);
      const angle = Math.atan2(z, x);
      this.wellVertexX[i] = x;
      this.wellVertexZ[i] = z;
      this.wellVertexR[i] = r;
      this.wellVertexAngle[i] = angle;
      this.wellVertexFrameDragBase[i] = 0.45 * Math.sin(angle * 2.0 + r * 0.28) * Math.exp(-r * 0.1);
    }

    const wellMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      opacity: 0.28,
    });

    this.spacetimeWellMesh = new THREE.Mesh(this.spacetimeWellGeo, wellMat);
    this.spacetimeWellMesh.position.y = -7.5;
    this.spacetimeWellMesh.renderOrder = -1;
    this.spacetimeWellMesh.userData.feature = {
      title: 'Spacetime Curvature Manifold (Gravity Well)',
      subtitle: 'General Relativistic Equatorial Embedding',
      formula: 'g_μν dx^μ dx^ν · G_μν = (8πG/c⁴) T_μν',
      description:
        'Continuous general-relativistic embedding diagram illustrating equatorial spatial curvature. For a black hole, it plunges into an abyssal throat; for a neutron star, it bottoms out at the physical crust surface.',
    } satisfies InspectedFeature;
    this.scene.add(this.spacetimeWellMesh);

    this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
  }

  private deformSpacetimeWell(massSolar: number, spin: number) {
    if (!this.spacetimeWellGeo || !this.wellVertexR) return;
    const posAttr = this.spacetimeWellGeo.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const depthMult = this.params.wellDepthMultiplier || 2.2;
    const isStar = isStellarCategory(this.params.objectCategory);

    const shockGrowth = isStar
      ? 1.0
      : 1.0 - Math.pow(1.0 - Math.min(1.0, Math.max(0.0, this.expansionProgress)), 2.6);
    const expansionWellFactor = isStar ? 1.0 : 0.04 + 0.96 * shockGrowth;
    const wellDepth = (16.0 + (massSolar / 100) * 32.0) * depthMult * expansionWellFactor;
    const baseRs = 2.4 + (massSolar / 100) * 2.2;
    const rs = isStar ? baseRs : baseRs * (0.18 + 0.82 * shockGrowth);
    const invRsSq = 1.0 / (rs * rs);

    const rCrust = rs * 1.25;
    const rCrustSq = rCrust * rCrust;
    const surfaceBottom = isStar
      ? -wellDepth / Math.pow(rCrustSq * invRsSq + 0.18, 0.52)
      : 0.0;

    const isBinary = !isStar && this.params.systemCategory === 'binary';
    const starDist = 21.0 * shockGrowth;
    const sx = isBinary ? Math.cos(this.binaryOrbitAngle) * starDist : 0.0;
    const sz = isBinary ? -Math.sin(this.binaryOrbitAngle) * starDist : 0.0;
    const rsComp = Math.max(1.8, rs * 0.62);
    const invRsCompSq = 1.0 / (rsComp * rsComp);

    const hasPulse = this.pulseStrength > 0.005;
    const frontR = hasPulse ? 0.35 + Math.pow(this.pulseProgress, 0.78) * 61.5 : 0.0;
    const pulseP1 = this.pulseProgress * 42.0;
    const pulseP2 = this.pulseProgress * 64.0;
    const pulseP3 = this.pulseProgress * 24.0;
    const pulseAmp = this.pulseStrength * 5.2;

    const hasParamRipples =
      this.settings.rapidAdjustmentRipples !== false &&
      this.parameterRipples.some((rip) => rip.active);
    const hasAccretionShock =
      this.isAccretionShockActive && this.settings.accretionShockwaveEnabled !== false;
    const shockFade = hasAccretionShock
      ? Math.pow(1.0 - this.accretionShockProgress, 1.2) * this.accretionShockIntensity * 3.4
      : 0.0;
    const shockPhase = this.accretionShockProgress * 32.0;
    const spinGrowth = spin * shockGrowth;

    const count = posAttr.count;
    for (let i = 0; i < count; i++) {
      const r = this.wellVertexR[i];
      const rSq = r * r;

      let depth: number;
      if (isStar) {
        if (r < rCrust) {
          depth = surfaceBottom - 1.2 * (1.0 - rSq / rCrustSq);
        } else {
          depth = -wellDepth / Math.pow(rSq * invRsSq + 0.18, 0.52);
        }
      } else {
        depth = -wellDepth / Math.pow(rSq * invRsSq + 0.12, 0.54);
      }

      const frameDragSpiral = spinGrowth * this.wellVertexFrameDragBase[i];

      let companionWellDip = 0.0;
      if (isBinary) {
        const dx = this.wellVertexX[i] - sx;
        const dz = this.wellVertexZ[i] - sz;
        const rCompSq = dx * dx + dz * dz;
        companionWellDip = -(wellDepth * 0.34) / Math.pow(rCompSq * invRsCompSq + 0.65, 0.52);
      }

      let pulseWave = 0.0;
      if (hasPulse) {
        const innerTap = Math.min(1.0, Math.max(0.0, (r - 0.30) * 0.625));
        const leadingEdge = 1.0 / (1.0 + Math.exp((r - frontR) * 1.6));
        const distBehind = Math.max(0.0, frontR - r);
        const distAhead = Math.max(0.0, r - frontR);
        const trainEnvelope = Math.exp(-distBehind * 0.032) * Math.exp(-distAhead * 0.55);
        const multiRipple =
          Math.sin(r * 1.75 - pulseP1) * 0.72 +
          Math.cos(r * 3.25 - pulseP2) * 0.34 +
          Math.sin(r * 0.95 - pulseP3) * 0.42;
        pulseWave =
          (multiRipple * leadingEdge * innerTap * trainEnvelope * pulseAmp) / (1.0 + r * 0.016);
      }

      let paramRippleWave = 0.0;
      if (hasParamRipples) {
        for (let k = 0; k < this.parameterRipples.length; k++) {
          const rip = this.parameterRipples[k];
          if (!rip.active) continue;
          const ease = 1.0 - Math.pow(1.0 - rip.progress, 2.2);
          const curR = rip.startRadius + (rip.maxRadius - rip.startRadius) * ease;
          const rDist = Math.abs(r - curR);
          if (rDist < 7.5) {
            const waveEnv = Math.exp(-(rDist * rDist) * 0.2704);
            const waveCycle = Math.sin(rDist * 2.4 - rip.progress * 26.0);
            const fade = Math.pow(1.0 - rip.progress, 1.25) * rip.intensity;
            paramRippleWave += waveEnv * waveCycle * fade * 2.6;
          }
        }
      }

      let accretionShockWave = 0.0;
      if (hasAccretionShock) {
        const rDist = Math.abs(r - this.accretionShockRadius);
        if (rDist < 8.5) {
          const waveEnv = Math.exp(-(rDist * rDist) * 0.2025);
          const waveOsc = Math.sin(rDist * 2.1 - shockPhase);
          accretionShockWave = waveEnv * waveOsc * shockFade;
        }
      }

      posArray[i * 3 + 1] =
        depth + companionWellDip + frameDragSpiral + pulseWave + paramRippleWave + accretionShockWave;
    }
    posAttr.needsUpdate = true;

    if (this.spacetimeWellMesh) {
      const wellMat = this.spacetimeWellMesh.material as THREE.MeshBasicMaterial;
      if (this.settings.secret1987Mode) {
        wellMat.color.setHex(0xf59e0b);
        wellMat.opacity = 0.42 + this.pulseStrength * 0.14;
      } else {
        wellMat.color.setHex(0x06b6d4);
        wellMat.opacity = 0.28 + this.pulseStrength * 0.12;
      }
    }
    this.lastWellExpansionProgress = this.expansionProgress;
    this.needsWellDeform = false;
  }

  private buildRelativisticLensingWarp() {
    // Ray-marched Relativistic Gravitational Lens (Interstellar Gargantua ray-deflected geometry & Einstein rings)
    const lensGeo = gpuResourceCache.getOrCreateGeometry(
      'gravitational_lens_plane_44',
      () => new THREE.PlaneGeometry(44, 44)
    );
    const spectrumLut = this.createProceduralSpectrumTexture();

    const sharedLensUniforms = {
      uCameraPos: { value: new THREE.Vector3() },
      uBlackHolePos: { value: new THREE.Vector3() },
      uScale: { value: this.currentScale },
      uSpin: { value: this.params.spin },
      uAccretionRate: { value: this.params.accretionRate },
      uDopplerStrength: { value: this.params.dopplerStrength },
      uSpectralMode: { value: 0 },
      uSpectrumLut: { value: spectrumLut },
      uLensingActive: { value: this.params.gravitationalLensing ? 1.0 : 0.0 },
      uShowDisk: { value: this.params.layers.accretionDisk ? 1.0 : 0.0 },
      uIsStar: { value: isStellarCategory(this.params.objectCategory) ? 1.0 : 0.0 },
      uPulseRadius: { value: 0 },
      uPulseStrength: { value: 0 },
      uTime: { value: 0 },
      uDiskStyle: { value: this.settings.accretionDiskStyle === 'raymarched' ? 1.0 : 0.0 },
      uBloomIntensity: { value: this.settings.bloomIntensity },
      uAccretionState: { value: (this.params.accretionState ?? 'quiescent') === 'active' ? 1.0 : 0.0 },
      uExpansionProgress: { value: this.expansionProgress },
      uIsBinarySystem: { value: this.params.systemCategory === 'binary' ? 1.0 : 0.0 },
      uCompanionStarPos: { value: new THREE.Vector3(21.0, 0, 0) },
      uCompanionStarRadius: { value: this.companionStarBaseRadius },
      uDepthPeeling: {
        value: Boolean(this.settings.webglDepthPeeling ?? this.settings.highPerformanceMode)
          ? 1.0
          : 0.0,
      },
      u_isOrbiting: { value: 0.0 },
      u_stepCount: { value: 5.0 },
    };

    this.gravitationalLensMatFull = new THREE.ShaderMaterial({
      uniforms: sharedLensUniforms,
      vertexShader: LENSING_VERTEX_SHADER,
      fragmentShader: LENSING_FRAGMENT_SHADER_FULL,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    this.gravitationalLensMatApprox = new THREE.ShaderMaterial({
      uniforms: sharedLensUniforms,
      vertexShader: LENSING_VERTEX_SHADER,
      fragmentShader: LENSING_FRAGMENT_SHADER_APPROX,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    this.gravitationalLensMat =
      this.activeShaderQualityTier === 'Approximated Null-Geodesic'
        ? this.gravitationalLensMatApprox
        : this.gravitationalLensMatFull;

    this.gravitationalLensMesh = new THREE.Mesh(lensGeo, this.gravitationalLensMat);
    this.gravitationalLensMesh.renderOrder = 8;
    this.blackHoleGroup.add(this.gravitationalLensMesh);
  }

  /**
   * Swaps the active gravitational lensing fragment shader between 'Full Geodesic' (5-step volumetric
   * raymarching + multi-octave turbulence + exact cubic-root Kerr ISCO) and 'Approximated Null-Geodesic'
   * (2-step midpoint raymarching + single-tap turbulence + rational polynomial Kerr ISCO) in O(1) time
   * without triggering GLSL recompilation stutter.
   */
  public applyShaderQualityTier(nextTier: GeodesicShaderQualityTier, reason?: string): void {
    if (this.activeShaderQualityTier === nextTier) return;
    this.activeShaderQualityTier = nextTier;
    this.lastShaderTierSwapMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const targetMat =
      nextTier === 'Approximated Null-Geodesic'
        ? this.gravitationalLensMatApprox
        : this.gravitationalLensMatFull;
    if (targetMat) {
      this.gravitationalLensMat = targetMat;
      if (this.gravitationalLensMesh) {
        this.gravitationalLensMesh.material = targetMat;
      }
    }
    if (this.perfConsoleLoggingEnabled) {
      console.info(
        `[Kerr Quality Tier] Swapped fragment shader -> '${nextTier}'${
          reason ? ` (${reason})` : ''
        }`
      );
    }
  }

  public setShaderQualityMode(mode: GeodesicShaderQualityMode): void {
    this.shaderQualityMode = mode;
    if (mode === 'Full Geodesic' || mode === 'Approximated Null-Geodesic') {
      this.applyShaderQualityTier(mode, `Manual override: ${mode}`);
    } else {
      const avg = this.getAveragedPassTimingsSnapshot();
      if (avg) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const evalRes = evaluateDynamicShaderQualityTier(
          this.activeShaderQualityTier,
          avg,
          now - this.lastShaderTierSwapMs,
          'auto',
          0
        );
        if (evalRes.swapped) {
          this.applyShaderQualityTier(evalRes.nextTier, evalRes.reason);
        }
      }
    }
  }

  public getShaderQualityTier(): GeodesicShaderQualityTier {
    return this.activeShaderQualityTier;
  }

  public getShaderQualityMode(): GeodesicShaderQualityMode {
    return this.shaderQualityMode;
  }

  private buildRelativisticMotionBlurPass() {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const effectiveDpr = this.lastAppliedPixelRatio || 1.0;
    const rtWidth = Math.max(1, Math.round(width * effectiveDpr));
    const rtHeight = Math.max(1, Math.round(height * effectiveDpr));
    // Lazy-allocate 1x1 placeholder targets until motionBlurEnabled or timeLapseEnabled is toggled on,
    // saving >100 MB of GPU VRAM on desktop viewports when post-processing is inactive.
    const needsFullRt = Boolean(this.settings.motionBlurEnabled || this.settings.timeLapseEnabled);
    const initW = needsFullRt ? rtWidth : 1;
    const initH = needsFullRt ? rtHeight : 1;
    const rtOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    };
    this.motionBlurRenderTarget = new THREE.WebGLRenderTarget(initW, initH, rtOptions);
    this.timeLapseTargetA = new THREE.WebGLRenderTarget(initW, initH, rtOptions);
    this.timeLapseTargetB = new THREE.WebGLRenderTarget(initW, initH, rtOptions);
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.motionBlurRenderTarget.texture },
        tAccum: { value: this.timeLapseTargetA.texture },
        uVelocity: { value: this.camMotionVelocity },
        uStrength: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(rtWidth, rtHeight) },
        uTimeLapseMix: { value: 0.0 },
        uExposureBoost: { value: 0.0 },
      },
      vertexShader: MOTION_BLUR_VERTEX_SHADER,
      fragmentShader: MOTION_BLUR_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });
    const fullscreenQuadGeo = gpuResourceCache.getOrCreateGeometry(
      'fullscreen_quad_2x2',
      () => new THREE.PlaneGeometry(2, 2)
    );
    this.postQuad = new THREE.Mesh(fullscreenQuadGeo, this.postMaterial);
    this.postScene.add(this.postQuad);
    this.prevCamQuat.copy(this.camera.quaternion);
  }

  private buildCameraSpaceLensFlareSystem() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.cameraLensFlareMat = new THREE.ShaderMaterial({
      uniforms: {
        uFlareIntensity: { value: this.settings.lensFlareIntensity ?? 1.0 },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uSourceNdc: { value: new THREE.Vector3(0, 0, 1) },
        uHotspotNdc: { value: new THREE.Vector3(0.15, 0, 1) },
        uSecondaryNdc: { value: new THREE.Vector3(0, 0, 0) },
        uViewAngleParams: { value: new THREE.Vector4(0.8, 0.0, 0.0, 1.0) },
        uPrimaryTint: { value: new THREE.Color(0xfbbf24) },
        uSecondaryTint: { value: new THREE.Color(0x38bdf8) },
      },
      vertexShader: CAMERA_LENS_FLARE_VERTEX_SHADER,
      fragmentShader: CAMERA_LENS_FLARE_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const flareQuadGeo = gpuResourceCache.getOrCreateGeometry(
      'fullscreen_quad_2x2',
      () => new THREE.PlaneGeometry(2, 2)
    );
    this.cameraLensFlareMesh = new THREE.Mesh(
      flareQuadGeo,
      this.cameraLensFlareMat
    );
    this.cameraLensFlareMesh.frustumCulled = false;
    this.cameraLensFlareMesh.renderOrder = 950;
    this.scene.add(this.cameraLensFlareMesh);
  }

  private buildOrbitingStarCluster() {
    const starS2Geo = new THREE.SphereGeometry(0.32, 24, 24);
    const starS2Mat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
    this.starS2Mesh = new THREE.Mesh(starS2Geo, starS2Mat);

    // Glowing stellar corona aura
    const auraGeo = new THREE.SphereGeometry(0.68, 20, 20);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    this.starS2GlowMesh = new THREE.Mesh(auraGeo, auraMat);
    this.starS2Mesh.add(this.starS2GlowMesh);

    this.starS2Mesh.layers.enable(1);
    this.starS2Mesh.userData.feature = {
      title: 'Star S2 (Relativistic Stellar Tracer)',
      subtitle: 'Galactic Center S-Star Cluster',
      formula: 'dτ = dt √(1 - Rs/r - v²/c²) · Δφ_GR = 6πGM / [c² a(1 - e²)]',
      description:
        'B-type main-sequence star orbiting in the extreme relativistic gravitational field of the central mass. Used to verify gravitational redshift and orbital precession.',
    } satisfies InspectedFeature;

    this.orbitalStarsGroup.add(this.starS2Mesh);

    // Precessing orbital path trail for S2
    const trailPoints: THREE.Vector3[] = [];
    const trailSegments = 120;
    for (let i = 0; i <= trailSegments; i++) {
      const theta = (i / trailSegments) * Math.PI * 2;
      const r = this.params.probeRadiusRs * 1.75;
      trailPoints.push(new THREE.Vector3(Math.cos(theta) * r, 0, -Math.sin(theta) * r));
    }
    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    this.starOrbitTrail = new THREE.Line(trailGeo, trailMat);
    this.orbitalStarsGroup.add(this.starOrbitTrail);

    // Companion S-Stars (S38, S55, S62)
    const companionDefs = [
      { name: 'Star S38 (A-Type)', color: 0xfef08a, semiMajor: 5.6, inclination: 0.32, speed: 0.65 },
      { name: 'Star S55 (F-Type)', color: 0xffd2a1, semiMajor: 7.4, inclination: -0.45, speed: 0.48 },
      { name: 'Star S62 (Extreme Eccentric)', color: 0x93c5fd, semiMajor: 4.2, inclination: 0.62, speed: 0.88 },
    ];

    for (const def of companionDefs) {
      const compGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const compMat = new THREE.MeshBasicMaterial({ color: def.color });
      const compMesh = new THREE.Mesh(compGeo, compMat);
      compMesh.layers.enable(1);
      compMesh.userData.feature = {
        title: def.name,
        subtitle: 'Nuclear Cluster Companion Star',
        formula: 'T_orb ∝ a_semi^(3/2)',
        description: 'High-velocity star orbiting within the central parsec, experiencing frame dragging and gravitational redshift.',
      } satisfies InspectedFeature;

      this.companionStars.push({
        mesh: compMesh,
        semiMajor: def.semiMajor,
        inclination: def.inclination,
        phase: Math.random() * Math.PI * 2,
        speed: def.speed,
      });
      this.orbitalStarsGroup.add(compMesh);
    }

    this.scene.add(this.orbitalStarsGroup);
  }

  private buildBackgroundMicrolensingStarSystem() {
    this.microlensingGroup = new THREE.Group();

    // 1. Unlensed Real Source Star (Moving behind the black hole on a distant celestial plane at z = -45)
    const sourceGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const sourceMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa, // Bright cyan/blue A-type giant
      transparent: true,
      opacity: 0.55,
    });
    this.microlensSourceStarMesh = new THREE.Mesh(sourceGeo, sourceMat);

    const sourceAuraGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const sourceAuraMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    this.microlensSourceGlowMesh = new THREE.Mesh(sourceAuraGeo, sourceAuraMat);
    this.microlensSourceStarMesh.add(this.microlensSourceGlowMesh);

    this.microlensSourceStarMesh.layers.enable(1);
    this.microlensSourceStarMesh.userData.feature = {
      title: 'Distant Background Star (True Source Position)',
      subtitle: 'Gravitational Microlensing Light Source',
      formula: 'u = β / θ_E · A(u) = (u² + 2) / [u √(u² + 4)]',
      description:
        'A distant luminous star transiting behind the black hole. When unlensed, it appears as a faint point source. As it approaches alignment with the observer and black hole, gravitational deflection splits it into multiple magnified relativistic images.',
    } satisfies InspectedFeature;
    this.microlensingGroup.add(this.microlensSourceStarMesh);

    // 2. Relativistic Primary Lensed Image (Magnified outer image)
    const primaryGeo = new THREE.SphereGeometry(0.42, 24, 24);
    const primaryMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.microlensPrimaryImageMesh = new THREE.Mesh(primaryGeo, primaryMat);
    this.microlensPrimaryImageMesh.layers.enable(1);
    this.microlensPrimaryImageMesh.userData.feature = {
      title: 'Lensed Primary Image (I₊)',
      subtitle: 'Exterior Relativistic Lensed Image',
      formula: 'θ₊ = ½ [β + √(β² + 4θ_E²)] · A₊ = ½ [(u² + 2) / (u √(u² + 4)) + 1]',
      description:
        'The outer magnified and warped image formed by light bending around the outside of the Einstein ring. As the star passes closer to the line of sight, this image brightens and stretches into an arc.',
    } satisfies InspectedFeature;
    this.microlensingGroup.add(this.microlensPrimaryImageMesh);

    // 3. Relativistic Secondary Lensed Image (Magnified inverted inner image)
    const secondaryGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const secondaryMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.microlensSecondaryImageMesh = new THREE.Mesh(secondaryGeo, secondaryMat);
    this.microlensSecondaryImageMesh.layers.enable(1);
    this.microlensSecondaryImageMesh.userData.feature = {
      title: 'Lensed Secondary Image (I₋)',
      subtitle: 'Interior Relativistic Lensed Image',
      formula: 'θ₋ = ½ [β - √(β² + 4θ_E²)] · A₋ = ½ [(u² + 2) / (u √(u² + 4)) - 1]',
      description:
        'The inner inverted image formed by rays deflected across the opposite limb of the gravitational well. When alignment is close to perfect, primary and secondary merge into a continuous circular Einstein ring.',
    } satisfies InspectedFeature;
    this.microlensingGroup.add(this.microlensSecondaryImageMesh);

    // 4. Perfect Alignment Einstein Ring Arc
    const ringGeo = new THREE.RingGeometry(1.65, 1.85, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.microlensEinsteinRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.microlensingGroup.add(this.microlensEinsteinRingMesh);

    // 5. Projected Celestial Transit Path Trail
    const pathPoints: THREE.Vector3[] = [];
    const steps = 80;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * 2 - 1; // -1 to 1
      const x = t * 38;
      const y = Math.sin(t * Math.PI * 0.75) * 3.5 + 2.0;
      const z = -45;
      pathPoints.push(new THREE.Vector3(x, y, z));
    }
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.8,
      gapSize: 0.5,
      transparent: true,
      opacity: 0.35,
    });
    this.microlensPathTrail = new THREE.Line(pathGeo, pathMat);
    this.microlensPathTrail.computeLineDistances();
    this.microlensingGroup.add(this.microlensPathTrail);

    this.scene.add(this.microlensingGroup);
  }

  private buildInstancedDeepStarfield() {
    this.starfieldCount = isSoftwareGl ? 1400 : 2600;
    const starCount = this.starfieldCount;
    // Camera-aligned billboard quad geometry (2 triangles per star instead of 48) with GPU lensing & twinkle shader
    const starGeo = new THREE.PlaneGeometry(0.24, 0.24);
    const starMetaArray = new Float32Array(starCount * 4);
    const starPosArray = new Float32Array(starCount * 3);
    const starColorArray = new Float32Array(starCount * 3);

    this.starfieldMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uCameraPos: { value: new THREE.Vector3() },
        uLookDir: { value: new THREE.Vector3(0, 0, -1) },
        uCamRight: { value: new THREE.Vector3(1, 0, 0) },
        uCamUp: { value: new THREE.Vector3(0, 1, 0) },
        // (rs, einsteinRadiusSq, pulseRadius, pulseStrength)
        uLensingParams: { value: new THREE.Vector4(1.75, 8.5, 0.0, 0.0) },
        // (lensingEnabled, lockBackground, currentScale, 0)
        uStarFlags: { value: new THREE.Vector4(1.0, 0.0, 1.0, 0.0) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aStarRestPos;
        attribute vec4 aStarMeta;
        attribute vec3 aStarColor;

        uniform float uTime;
        uniform vec3 uCameraPos;
        uniform vec3 uLookDir;
        uniform vec3 uCamRight;
        uniform vec3 uCamUp;
        uniform vec4 uLensingParams;
        uniform vec4 uStarFlags;

        varying vec3 vStarColor;
        varying vec2 vUv;

        void main() {
          vStarColor = aStarColor;
          vUv = uv;
          float phase = aStarMeta.x;
          float speed = aStarMeta.y;
          float baseScale = aStarMeta.z;
          float restDist = aStarMeta.w;

          float twinkle = 1.0 + sin(uTime * speed + phase) * 0.15;
          float curScale = baseScale * twinkle;

          float depthFactor = uStarFlags.y > 0.5 ? 0.0 : ((135.0 / max(50.0, restDist)) - 0.85);
          vec3 parallaxOffset = uCameraPos * (-0.045 * depthFactor);
          float dotRight = dot(uCamRight, aStarRestPos);
          float dotUp = dot(uCamUp, aStarRestPos);
          parallaxOffset += uCamRight * (-dotRight * 0.0022 * depthFactor);
          parallaxOffset += uCamUp * (-dotUp * 0.0022 * depthFactor);

          vec3 worldCenter = aStarRestPos + parallaxOffset;

          if (uStarFlags.x > 0.5) {
            vec3 toStar = worldCenter - uCameraPos;
            float starDist = length(toStar);
            if (starDist > 1.0) {
              vec3 starDir = toStar / starDist;
              float cosAngle = dot(starDir, uLookDir);
              if (cosAngle > 0.35) {
                float rs = uLensingParams.x;
                float einsteinRadiusSq = uLensingParams.y;
                float pulseRadius = uLensingParams.z;
                float pulseStrength = uLensingParams.w;

                float sinAngle = sqrt(max(0.001, 1.0 - cosAngle * cosAngle));
                float impactB = max(rs * 0.9, starDist * sinAngle);
                float deflectionFactor = min(7.5, einsteinRadiusSq / (impactB + 0.35));

                if (pulseStrength > 0.005) {
                  float dShock = impactB - pulseRadius;
                  float denom = max(0.4, 0.85 * uStarFlags.z);
                  deflectionFactor += -dShock * exp(-(dShock * dShock) / denom) * pulseStrength * 1.45;
                }

                vec3 ortho = cross(cross(uLookDir, starDir), uLookDir);
                float orthoLen = length(ortho);
                if (orthoLen > 1e-4) {
                  worldCenter += (ortho / orthoLen) * (deflectionFactor * 2.2);
                }
              }
            }
          }

          vec3 billboardOffset = (uCamRight * position.x + uCamUp * position.y) * curScale;
          vec3 finalPos = worldCenter + billboardOffset;
          gl_Position = projectionMatrix * viewMatrix * vec4(finalPos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vStarColor;
        varying vec2 vUv;
        void main() {
          vec2 d = vUv - vec2(0.5);
          if (dot(d, d) > 0.25) discard;
          gl_FragColor = vec4(vStarColor, 1.0);
        }
      `,
    });

    this.starfieldInstanced = new THREE.InstancedMesh(starGeo, this.starfieldMat, starCount);
    this.starfieldInstanced.frustumCulled = false;

    this.starRestPositions = [];
    this.starfieldScales = [];
    this.starfieldColors = [];
    this.starTwinklePhases = new Float32Array(starCount);
    this.starTwinkleSpeeds = new Float32Array(starCount);
    this.starBaseScales = new Float32Array(starCount);

    // Authentic Harvard astronomical spectral classes and B-V blackbody temperatures
    const spectralColors = [
      new THREE.Color(0x94b3ff), // O-type electric blue (>30,000 K)
      new THREE.Color(0xb8ccff), // B-type blue-white (15,000 K)
      new THREE.Color(0xedf1ff), // A-type crisp white (9,000 K)
      new THREE.Color(0xf9f7f0), // F-type pale warm white (6,800 K)
      new THREE.Color(0xffeed4), // G-type solar yellow (5,800 K, like our Sun)
      new THREE.Color(0xffc68c), // K-type orange dwarf (4,400 K)
      new THREE.Color(0xffaa70), // M-type red dwarf (3,200 K)
      new THREE.Color(0xff8c55), // Deep red giant / carbon star
    ];

    const galTiltX = 0.98; // ~56 deg
    const galRotY = 0.62;  // ~35 deg
    const cosTilt = Math.cos(galTiltX);
    const sinTilt = Math.sin(galTiltX);
    const cosRot = Math.cos(galRotY);
    const sinRot = Math.sin(galRotY);

    for (let i = 0; i < starCount; i++) {
      let x = 0, y = 0, z = 0;
      const radius = 75 + Math.random() * 135;

      if (i < starCount * 0.72) {
        const l = Math.random() * Math.PI * 2.0;
        const u1 = Math.max(0.0001, Math.random());
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        const bulgeFactor = 0.14 + 0.12 * Math.exp(-Math.pow(Math.min(l, Math.PI * 2 - l) / 0.8, 2.0));
        const b = z0 * bulgeFactor;

        const cosB = Math.cos(b);
        const gx = cosB * Math.cos(l);
        const gy = Math.sin(b);
        const gz = cosB * Math.sin(l);

        const y1 = gy * cosTilt - gz * sinTilt;
        const z1 = gy * sinTilt + gz * cosTilt;
        x = (gx * cosRot + z1 * sinRot) * radius;
        y = y1 * radius;
        z = (-gx * sinRot + z1 * cosRot) * radius;
      } else {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.cos(phi);
        z = radius * Math.sin(phi) * Math.sin(theta);
      }

      const restPos = new THREE.Vector3(x, y, z);
      this.starRestPositions.push(restPos);

      let baseScale = 0.18;
      const magRand = Math.random();
      if (magRand < 0.82) {
        baseScale = 0.14 + Math.pow(Math.random(), 3.2) * 0.28;
      } else if (magRand < 0.96) {
        baseScale = 0.45 + Math.random() * 0.40;
      } else {
        baseScale = 0.95 + Math.random() * 0.95;
      }

      const phase = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 3.8;
      this.starBaseScales[i] = baseScale;
      this.starTwinklePhases[i] = phase;
      this.starTwinkleSpeeds[i] = speed;

      starPosArray[i * 3] = x;
      starPosArray[i * 3 + 1] = y;
      starPosArray[i * 3 + 2] = z;

      starMetaArray[i * 4] = phase;
      starMetaArray[i * 4 + 1] = speed;
      starMetaArray[i * 4 + 2] = baseScale;
      starMetaArray[i * 4 + 3] = radius;

      _mat4.identity();
      this.starfieldInstanced.setMatrixAt(i, _mat4);

      let colorIndex = 0;
      const specRand = Math.random();
      if (specRand < 0.32) {
        colorIndex = 6;
      } else if (specRand < 0.58) {
        colorIndex = 5;
      } else if (specRand < 0.78) {
        colorIndex = 4;
      } else if (specRand < 0.90) {
        colorIndex = 3;
      } else if (specRand < 0.96) {
        colorIndex = 2;
      } else if (specRand < 0.99) {
        colorIndex = 1;
      } else {
        colorIndex = 0;
      }

      const col = spectralColors[colorIndex].clone();
      if (baseScale > 0.8) {
        col.multiplyScalar(1.25);
      }
      this.starfieldColors.push(col);
      starColorArray[i * 3] = col.r;
      starColorArray[i * 3 + 1] = col.g;
      starColorArray[i * 3 + 2] = col.b;
    }

    starGeo.setAttribute('aStarRestPos', new THREE.InstancedBufferAttribute(starPosArray, 3));
    starGeo.setAttribute('aStarMeta', new THREE.InstancedBufferAttribute(starMetaArray, 4));
    starGeo.setAttribute('aStarColor', new THREE.InstancedBufferAttribute(starColorArray, 3));
    this.starfieldInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.starfieldInstanced);
  }

  /**
   * Updates GPU uniforms for General Relativistic Gravitational Lensing Deflection & Motion Parallax
   * of all 5,500 background stars in O(1) CPU time (zero per-frame JS loops or buffer uploads).
   */
  private updateGravitationalLensingOfStarfield() {
    if (!this.starfieldMat) return;
    const camPos = this.camera.position;
    const rs = 1.75 * this.currentScale;
    const einsteinRadiusSq = Math.max(0.2, rs * rs * 2.8);

    _camRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    _camUp.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();
    _vec3B.subVectors(this.controls.target, camPos).normalize();

    const u = this.starfieldMat.uniforms;
    u.uTime.value = this.accretionDiskSimTime;
    u.uCameraPos.value.copy(camPos);
    u.uLookDir.value.copy(_vec3B);
    u.uCamRight.value.copy(_camRight);
    u.uCamUp.value.copy(_camUp);
    u.uLensingParams.value.set(rs, einsteinRadiusSq, this.pulseRadius, this.pulseStrength);
    u.uStarFlags.value.set(
      this.params.gravitationalLensing !== false ? 1.0 : 0.0,
      this.settings.lockBackground ? 1.0 : 0.0,
      this.currentScale,
      0.0
    );
  }

  /**
   * Simulates a distant background star transiting behind the black hole.
   * Computes authentic gravitational microlensing:
   * - Paczyński magnification curve A(u) = (u² + 2) / [u √(u² + 4)]
   * - Relativistic doublet image formation: θ± = ½ (u ± √(u² + 4)) θ_E
   * - Continuous Einstein ring synthesis at close alignment (u < 0.25)
   */
  private updateBackgroundStarMicrolensing(simDelta: number) {
    if (!this.microlensSourceStarMesh || !this.microlensingGroup) return;

    const enabled = this.params.layers.microlensingStar !== false;
    this.microlensingGroup.visible = enabled;
    if (!enabled) return;

    // Advance transit phase across celestial plane
    this.microlensStarPhase += simDelta * this.microlensStarSpeed;
    // Cyclic ping-pong transition along celestial transit path: [-1, 1]
    const cycle = (Math.sin(this.microlensStarPhase) + 1.0) * 0.5; // [0, 1]
    const t = cycle * 2.0 - 1.0; // [-1, 1]

    // Celestial coordinates at distant plane z = -45
    const sourceX = t * 34.0;
    const sourceY = Math.sin(t * Math.PI * 0.75) * 3.2 + 1.8;
    const sourceZ = -45.0;

    this.microlensSourceStarMesh.position.set(sourceX, sourceY, sourceZ);

    // Dynamic scale factor and Einstein radius
    const rs = 1.75 * this.currentScale;
    // Projected Einstein radius in scene units at z = 0 plane
    const thetaE = Math.max(0.8, rs * 1.55);

    // Compute line of sight from camera to black hole and project source star onto camera lens plane
    const camPos = this.camera.position;
    _vec3B.subVectors(this.controls.target, camPos).normalize(); // Look vector
    _vec3A.subVectors(this.microlensSourceStarMesh.position, camPos); // Ray to source star
    const starDist = _vec3A.length();
    const starDir = _vec3A.normalize();

    // Transverse projection vector relative to optical axis
    _vec3C.crossVectors(_vec3B, starDir).crossVectors(_vec3C, _vec3B);
    const transverseDist = _vec3C.length() * (starDist * 0.45);
    const unitTransverse = _vec3C.normalize();

    // Normalized impact parameter in units of Einstein radius: u = beta / theta_E
    const u = Math.max(0.04, transverseDist / Math.max(0.1, thetaE));

    // Paczyński Total Magnification: A(u) = (u² + 2) / [u √(u² + 4)]
    const uSq = u * u;
    const rootU = Math.sqrt(uSq + 4.0);
    const totalMag = (uSq + 2.0) / (u * rootU);

    // Individual Image Magnifications:
    // A₊ = ½ (A + 1), A₋ = ½ (A - 1)
    const magPlus = 0.5 * (totalMag + 1.0);
    const magMinus = 0.5 * (totalMag - 1.0);

    // Relativistic Image Angular Displacements:
    // θ₊ = ½ [u + √(u² + 4)] θ_E (Outer magnified image)
    // θ₋ = ½ [u - √(u² + 4)] θ_E (Inner inverted image on opposite limb)
    const thetaPlus = 0.5 * (u + rootU) * thetaE;
    const thetaMinus = 0.5 * (u - rootU) * thetaE;

    // Position Primary Image (I₊) outside the horizon shadow capture boundary
    const safeHorizonRadius = 2.65 * this.currentScale;
    const clampedThetaPlus = Math.max(safeHorizonRadius * 1.15, thetaPlus);
    const posPlus = new THREE.Vector3().copy(this.blackHoleGroup.position).addScaledVector(unitTransverse, clampedThetaPlus);
    posPlus.z -= 1.0;
    this.microlensPrimaryImageMesh.position.copy(posPlus);

    const scalePlus = Math.min(2.6, Math.max(0.35, Math.pow(magPlus, 0.42) * 0.42));
    this.microlensPrimaryImageMesh.scale.set(scalePlus, scalePlus, scalePlus);
    (this.microlensPrimaryImageMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, 0.30 + magPlus * 0.14);

    // Position Secondary Image (I₋) across the opposite limb; suppress if inside event horizon capture radius
    const absThetaMinus = Math.abs(thetaMinus);
    const horizonFade = THREE.MathUtils.smoothstep(absThetaMinus, safeHorizonRadius * 0.95, safeHorizonRadius * 1.35);
    const posMinus = new THREE.Vector3().copy(this.blackHoleGroup.position).addScaledVector(unitTransverse, thetaMinus);
    posMinus.z -= 1.0;
    this.microlensSecondaryImageMesh.position.copy(posMinus);

    const scaleMinus = Math.min(2.0, Math.max(0.18, Math.pow(magMinus, 0.42) * 0.35));
    this.microlensSecondaryImageMesh.scale.set(scaleMinus, scaleMinus, scaleMinus);
    (this.microlensSecondaryImageMesh.material as THREE.MeshBasicMaterial).opacity =
      Math.min(0.85, magMinus * 0.18) * horizonFade;
    this.microlensSecondaryImageMesh.visible = horizonFade > 0.01;

    // Einstein Ring: When u < 0.42, light rays smear into a complete circular Einstein ring
    if (this.microlensEinsteinRingMesh) {
      this.microlensEinsteinRingMesh.quaternion.copy(this.camera.quaternion);
      const ringScale = thetaE;
      this.microlensEinsteinRingMesh.scale.set(ringScale, ringScale, ringScale);
      const ringMat = this.microlensEinsteinRingMesh.material as THREE.MeshBasicMaterial;
      const ringAlpha = Math.max(0.0, 1.0 - u / 0.42) * 0.75;
      ringMat.opacity = ringAlpha;
      this.microlensEinsteinRingMesh.visible = ringAlpha > 0.01;
    }
  }

  private seedInitialGeodesics() {
    this.launchPhotonGeodesic(2.38, 0.2, true);
    this.launchPhotonGeodesic(4.15, -0.35, true);
    this.launchPhotonGeodesic(1.15, 0.0, true);
  }

  public launchPhotonGeodesic(impactParameterB: number, yOffset = 0, silent = false): GeodesicTrajectory {
    const visualHorizonR = 1.75 * this.targetScale;
    const traj = computeNullGeodesic(impactParameterB, visualHorizonR, this.params.spin, yOffset);

    const vecPoints = traj.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    if (vecPoints.length < 2) return traj;

    const lineGeo = new THREE.BufferGeometry().setFromPoints(vecPoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: traj.colorHex,
      transparent: true,
      opacity: 0.75,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.geodesicGroup.add(line);

    const pulseGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({ color: traj.colorHex });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
    pulseMesh.position.copy(vecPoints[0]);
    this.geodesicGroup.add(pulseMesh);

    this.activeGeodesicPulses.push({
      trajectory: traj,
      mesh: pulseMesh,
      line,
      points: vecPoints,
      progress: 0,
      speed: 28.0,
    });

    this.recentGeodesicHistory.push(traj);
    if (this.recentGeodesicHistory.length > 12) {
      this.recentGeodesicHistory.shift();
    }

    while (this.activeGeodesicPulses.length > 8) {
      const oldest = this.activeGeodesicPulses.shift();
      if (oldest) {
        this.geodesicGroup.remove(oldest.mesh, oldest.line);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
        oldest.line.geometry.dispose();
        (oldest.line.material as THREE.Material).dispose();
      }
    }

    if (!silent && this.onTrajectoryCreated) {
      this.onTrajectoryCreated(traj);
    }
    return traj;
  }

  public clearGeodesics() {
    for (const item of this.activeGeodesicPulses) {
      this.geodesicGroup.remove(item.mesh, item.line);
      item.mesh.geometry.dispose();
      (item.mesh.material as THREE.Material).dispose();
      item.line.geometry.dispose();
      (item.line.material as THREE.Material).dispose();
    }
    this.activeGeodesicPulses = [];
    this.recentGeodesicHistory = [];
  }

  /**
   * Returns all live geodesic trajectories currently in flight or recently launched,
   * or computes a live diagnostic geodesic bundle if no manual rays are active.
   */
  public getLiveGeodesicTrajectories(fallbackImpactB = 2.4): GeodesicTrajectory[] {
    const visualHorizonR = Math.max(0.25, 1.75 * this.targetScale);
    const result: GeodesicTrajectory[] = [];
    const seenIds = new Set<string>();

    for (const active of this.activeGeodesicPulses) {
      seenIds.add(active.trajectory.id);
      result.push({
        ...active.trajectory,
        liveProgressStep: active.progress,
        visualHorizonRadius: active.trajectory.visualHorizonRadius || visualHorizonR,
      });
    }

    for (const hist of this.recentGeodesicHistory) {
      if (!seenIds.has(hist.id)) {
        seenIds.add(hist.id);
        result.push({
          ...hist,
          liveProgressStep: hist.points.length - 1,
          visualHorizonRadius: hist.visualHorizonRadius || visualHorizonR,
        });
      }
    }

    if (result.length === 0) {
      // Compute live null geodesic trajectories for the current impact parameter + characteristic Kerr reference rays
      const bCrit = 2.60 * (1.0 - 0.18 * this.params.spin) * visualHorizonR;
      const sampleBs = [
        fallbackImpactB * visualHorizonR,
        bCrit,
        1.15 * visualHorizonR,
        -3.85 * visualHorizonR,
      ];
      sampleBs.forEach((bScene, idx) => {
        const computed = computeNullGeodesic(bScene, visualHorizonR, this.params.spin, 0);
        result.push({
          ...computed,
          id: `live-geodesic-${idx + 1}`,
          liveProgressStep: computed.points.length - 1,
          visualHorizonRadius: visualHorizonR,
        });
      });
    }

    return result;
  }

  public exportLiveGeodesicCsv(fallbackImpactB = 2.4): string {
    const visualHorizonR = Math.max(0.25, 1.75 * this.targetScale);
    const trajectories = this.getLiveGeodesicTrajectories(fallbackImpactB);
    return buildGeodesicTrajectoryCsv(trajectories, this.params, visualHorizonR);
  }

  public triggerEventHorizonPulse(category?: ObjectCategory, isCinematicBootBoom = false) {
    const isStar = isStellarCategory(category || this.params.objectCategory);

    // If triggering a pulse while the black hole is in its small singularity ball state,
    // automatically grow it into the full black hole along with the shockwave!
    if (!isStar && this.isSingularityCollapsed) {
      this.targetExpansionProgress = 1.0;
    }

    this.isPulseActive = true;
    this.isCinematicBootBoom = isCinematicBootBoom;
    this.pulseDuration = isCinematicBootBoom ? 2.65 : 2.35;
    this.pulseProgress = 0.0;
    this.pulseStrength = isCinematicBootBoom ? 1.35 : 1.0;
    const minSeedWorldScale = 0.11;
    const startScale = isStar
      ? this.currentScale
      : THREE.MathUtils.lerp(minSeedWorldScale, this.currentScale, this.expansionProgress);
    this.pulseRadius = 2.26 * startScale;

    // Trigger Sonic Boom Camera Screen Shake recoil (amplified for initial singularity detonation)
    this.shakeIntensity = isCinematicBootBoom ? 1.85 : 1.15;
    this.shakeDuration = isCinematicBootBoom ? 1.95 : 1.65;
    this.shakeElapsed = 0.0;

    // Incandescent relativistic gold-silver Mach shock tone
    this.pulseColor.set(isStar ? 0xbae6fd : isCinematicBootBoom ? 0xfde68a : 0xdbe4f0);

    if (this.primaryPulseMesh) {
      this.primaryPulseMesh.visible = true;
      (this.primaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.pulseColor);
    }
    if (this.secondaryPulseMesh) {
      this.secondaryPulseMesh.visible = true;
      (this.secondaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.pulseColor);
    }
    if (this.tertiaryPulseMesh) {
      this.tertiaryPulseMesh.visible = true;
      (this.tertiaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.pulseColor);
    }
    for (const extra of this.extraPulseRippleMeshes) {
      extra.mesh.visible = true;
      (extra.mesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.pulseColor);
    }
    if (this.gravitationalWaveShellMesh) {
      this.gravitationalWaveShellMesh.visible = true;
      (this.gravitationalWaveShellMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.pulseColor);
    }
    if (this.horizonFlashMesh) {
      this.horizonFlashMesh.visible = true;
      (this.horizonFlashMesh.material as THREE.MeshBasicMaterial).color.copy(this.pulseColor);
    }

    if (isCinematicBootBoom) {
      this.triggerAccretionShockwave(1.9, true);
      this.spawnParameterRipple('mixed', 1.65);
      relativisticAudio.triggerAccretionShockPulse(isStar, true);
    }
  }

  public expandFromSingularity(slowPan = true) {
    if (!this.isSingularityCollapsed && this.targetExpansionProgress >= 0.99) return;
    this.bootIntroActive = false;
    this.bootAutoExpandPending = false;
    this.isWatermarkOverlayVisible = false;
    this.pendingCollapseEchoPulse = false;
    this.isEchoPulseActive = false;
    this.controls.enabled = true;
    this.singularitySeedLoaded = true;
    this.seedLoadProgress = 1.0;
    this.expansionProgress = Math.max(0.04, this.expansionProgress);
    this.targetExpansionProgress = 1.0;
    // Scale observer camera radius with targetScale so ultramassive black holes like TON 618 (scale 4.85) are framed outside their accretion disk
    const scaledEndR = Math.max(28.875, 25.5 * Math.sqrt(this.targetScale));
    const endTheta = THREE.MathUtils.degToRad(71.0);
    const endPhi = THREE.MathUtils.degToRad(96.0);
    this.slowPanStartPos.copy(this.camera.position);
    this.slowPanInElapsed = 0.0;
    this.targetCamPos.set(
      scaledEndR * Math.sin(endTheta) * Math.cos(endPhi),
      scaledEndR * Math.cos(endTheta),
      scaledEndR * Math.sin(endTheta) * Math.sin(endPhi)
    );
    this.targetCamLook.set(0, 0, 0);
    this.cameraTransitionActive = true;
    this.slowCameraPanIn = slowPan;
    if (this.spacetimeWellMesh) {
      this.spacetimeWellMesh.visible = Boolean(this.params.layers.spacetimeGrid);
      this.needsWellDeform = true;
    }
    if (!slowPan) {
      this.isSingularityCollapsed = false;
      this.onSingularityStateChange?.(false);
    }
    this.triggerEventHorizonPulse(this.params.objectCategory, true);
  }

  public triggerEventHorizonEchoPulse() {
    this.isEchoPulseActive = true;
    this.echoPulseProgress = 0.0;
    // Subtle silver-gold relativistic horizon echo tint
    if (this.params.spectralMode === 'xray') {
      this.echoPulseColor.setHex(0x7dd3fc);
    } else if (this.params.spectralMode === 'doppler') {
      this.echoPulseColor.setHex(0x93c5fd);
    } else {
      this.echoPulseColor.setHex(0xd4af37);
    }

    // Gentle micro-recoil when the singularity seed locks in
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
    this.shakeElapsed = 0.0;

    if (this.primaryPulseMesh) {
      this.primaryPulseMesh.visible = true;
      (this.primaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.echoPulseColor);
    }
    if (this.secondaryPulseMesh) {
      this.secondaryPulseMesh.visible = true;
      (this.secondaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.echoPulseColor);
    }
    if (this.gravitationalWaveShellMesh) {
      this.gravitationalWaveShellMesh.visible = true;
      (this.gravitationalWaveShellMesh.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(this.echoPulseColor);
    }
    if (this.horizonFlashMesh) {
      this.horizonFlashMesh.visible = true;
      (this.horizonFlashMesh.material as THREE.MeshBasicMaterial).color.copy(this.echoPulseColor);
    }

    // Also emit a subtle damped quasinormal ripple ring from the newly formed singularity seed
    this.spawnParameterRipple('spin', 0.65);
  }

  public collapseToSingularity() {
    this.bootAutoExpandPending = false;
    this.isWatermarkOverlayVisible = false;
    this.slowCameraPanIn = false;
    if (this.cinematicTourActive) {
      this.stopCinematicTour();
    }
    this.singularitySeedLoaded = true;
    this.seedLoadProgress = 1.0;
    this.isSingularityCollapsed = true;
    this.targetExpansionProgress = 0.0;
    this.isPulseActive = false;
    this.pulseStrength = 0.0;
    if (this.expansionProgress > 0.06) {
      this.pendingCollapseEchoPulse = true;
      this.isEchoPulseActive = false;
    } else {
      this.pendingCollapseEchoPulse = false;
      this.triggerEventHorizonEchoPulse();
    }
    if (this.spacetimeWellMesh) {
      this.spacetimeWellMesh.visible = false;
    }
    if (!this.isEchoPulseActive) {
      if (this.primaryPulseMesh) this.primaryPulseMesh.visible = false;
      if (this.secondaryPulseMesh) this.secondaryPulseMesh.visible = false;
      if (this.gravitationalWaveShellMesh) this.gravitationalWaveShellMesh.visible = false;
      if (this.horizonFlashMesh) this.horizonFlashMesh.visible = false;
    }
    this.tertiaryPulseMesh && (this.tertiaryPulseMesh.visible = false);
    for (const extra of this.extraPulseRippleMeshes) {
      extra.mesh.visible = false;
    }
    if (this.accretionDiskMat) this.accretionDiskMat.uniforms.uPulseStrength.value = 0.0;
    this.onSingularityStateChange?.(true);
  }

  public replaySingularityExpansion() {
    this.bootIntroActive = false;
    this.bootAutoExpandPending = false;
    this.isWatermarkOverlayVisible = false;
    this.pendingCollapseEchoPulse = false;
    this.isEchoPulseActive = false;
    this.controls.enabled = true;
    this.expansionProgress = 0.04;
    this.isSingularityCollapsed = false;
    this.targetExpansionProgress = 1.0;
    const scaledEndR = Math.max(28.875, 25.5 * Math.sqrt(this.targetScale));
    const endTheta = THREE.MathUtils.degToRad(71.0);
    const endPhi = THREE.MathUtils.degToRad(96.0);
    this.slowPanStartPos.copy(this.camera.position);
    this.slowPanInElapsed = 0.0;
    this.targetCamPos.set(
      scaledEndR * Math.sin(endTheta) * Math.cos(endPhi),
      scaledEndR * Math.cos(endTheta),
      scaledEndR * Math.sin(endTheta) * Math.sin(endPhi)
    );
    this.targetCamLook.set(0, 0, 0);
    this.cameraTransitionActive = true;
    this.slowCameraPanIn = true;
    if (this.spacetimeWellMesh) {
      this.spacetimeWellMesh.visible = Boolean(this.params.layers.spacetimeGrid);
      this.needsWellDeform = true;
    }
    this.onSingularityStateChange?.(false);
    this.triggerEventHorizonPulse(this.params.objectCategory, true);
  }

  public getIsSingularityCollapsed(): boolean {
    return this.isSingularityCollapsed;
  }

  public updateParams(nextParams: BlackHoleParams, immediate = false) {
    const presetSwitchStartMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prevPresetId = this.params ? this.params.presetId : undefined;
    const prevObjectCategory = this.params ? this.params.objectCategory : undefined;
    const prevBackgroundTheme = this.params ? this.params.backgroundTheme : undefined;
    const prevSystemCategory = this.params ? this.params.systemCategory : undefined;
    const isPresetTransition =
      !immediate &&
      Boolean(
        prevPresetId !== nextParams.presetId ||
          prevObjectCategory !== nextParams.objectCategory ||
          prevSystemCategory !== nextParams.systemCategory
      );

    // Parameter rapid adjustment detection for propagating gravitational wave ripples
    if (!immediate && this.settings.rapidAdjustmentRipples !== false && this.params) {
      const now = performance.now();
      const dt = Math.max(0.005, (now - this.lastParamUpdateTime) / 1000.0);

      const prevSpin = typeof this.lastObservedSpin === 'number' ? this.lastObservedSpin : this.params.spin;
      const prevAccretion = typeof this.lastObservedAccretionRate === 'number' ? this.lastObservedAccretionRate : this.params.accretionRate;

      const deltaSpin = Math.abs(nextParams.spin - prevSpin);
      const deltaAccretion = Math.abs(nextParams.accretionRate - prevAccretion);

      const spinRate = deltaSpin / dt;
      const accretionRateSpeed = deltaAccretion / dt;

      const isRapidSpin = (spinRate > 0.16 && deltaSpin > 0.008) || deltaSpin > 0.035;
      const isRapidAccretion = (accretionRateSpeed > 0.40 && deltaAccretion > 0.02) || deltaAccretion > 0.09;

      if (isRapidSpin || isRapidAccretion) {
        if (now - this.lastRippleSpawnTime > 85) {
          const type: 'spin' | 'accretion' | 'mixed' =
            isRapidSpin && isRapidAccretion ? 'mixed' : isRapidSpin ? 'spin' : 'accretion';
          const intensity = Math.min(1.4, Math.max(0.7, deltaSpin * 7.0 + deltaAccretion * 2.2));
          this.spawnParameterRipple(type, intensity);
          this.lastRippleSpawnTime = now;
        }
      }

      this.lastParamUpdateTime = now;
      this.lastObservedSpin = nextParams.spin;
      this.lastObservedAccretionRate = nextParams.accretionRate;
    } else {
      this.lastParamUpdateTime = performance.now();
      this.lastObservedSpin = nextParams.spin;
      this.lastObservedAccretionRate = nextParams.accretionRate;
    }

    // Accretion state & threshold burst shockwave detection
    if (!immediate && this.settings.accretionShockwaveEnabled !== false && this.params) {
      const prevAccretionRate = typeof this.lastShockAccretionRate === 'number'
        ? this.lastShockAccretionRate
        : this.params.accretionRate;
      const prevAccretionState = this.lastShockAccretionState ?? this.params.accretionState ?? 'quiescent';

      const deltaAccretion = Math.abs(nextParams.accretionRate - prevAccretionRate);
      const stateChanged = nextParams.accretionState !== prevAccretionState;

      const now = performance.now();
      const dt = (now - this.lastAccretionUpdateTime) / 1000.0;
      if (dt > 0.40) {
        this.accretionRateAccumDelta = 0;
      }
      this.accretionRateAccumDelta += deltaAccretion;
      this.lastAccretionUpdateTime = now;

      // Threshold trigger:
      // 1. Accretion state toggle (quiescent <-> active)
      // 2. Significant modification beyond threshold (delta >= 0.25)
      // 3. Accumulated scrubbing modification beyond threshold (accumulated delta >= 0.35)
      // 4. Crossing the critical Eddington boundary (m_dot = 1.0) with significant change (delta >= 0.15)
      const crossedEddington =
        (prevAccretionRate < 1.0 && nextParams.accretionRate >= 1.0) ||
        (prevAccretionRate >= 1.0 && nextParams.accretionRate < 1.0);

      const thresholdExceeded =
        deltaAccretion >= 0.25 ||
        this.accretionRateAccumDelta >= 0.35 ||
        (crossedEddington && deltaAccretion >= 0.15);

      if (stateChanged) {
        this.triggerEventHorizonPulse(nextParams.objectCategory);
        this.triggerAccretionShockwave(1.25, true);
        relativisticAudio.triggerAccretionShockPulse(isStellarCategory(nextParams.objectCategory));
        this.accretionRateAccumDelta = 0;
      } else if (thresholdExceeded) {
        const isSurge = nextParams.accretionRate >= prevAccretionRate;
        const intensity = Math.min(1.5, Math.max(0.85, deltaAccretion * 2.2));
        this.triggerAccretionShockwave(intensity, isSurge);
        this.accretionRateAccumDelta = 0;
      }

      this.lastShockAccretionRate = nextParams.accretionRate;
      this.lastShockAccretionState = nextParams.accretionState || 'quiescent';
    } else {
      this.lastShockAccretionRate = nextParams.accretionRate;
      this.lastShockAccretionState = nextParams.accretionState || 'quiescent';
    }

    const massChanged =
      Math.abs(nextParams.massSolar - this.params.massSolar) > 0.1 ||
      Math.abs(nextParams.spin - this.params.spin) > 0.01 ||
      nextParams.objectCategory !== this.params.objectCategory ||
      nextParams.systemCategory !== this.params.systemCategory ||
      Math.abs((nextParams.wellDepthMultiplier || 2.2) - (this.params.wellDepthMultiplier || 2.2)) > 0.05;

    const prevScale = this.targetScale;
    this.params = nextParams;
    this.cachedMetrics = computeRelativisticMetrics(nextParams);

    // Proportional Astrophysical Cosmic Scaling:
    // Replicates the colossal physical disparity of cosmic objects:
    // - Neutron stars / pulsars (PSR B1919+21, Magnetar): 0.45 scale (tiny 20 km city-sized crust in the vast void)
    // - Stellar-mass black holes (V404 Cygni ~9 M☉, Cygnus X-1 ~21 M☉, GW150914 ~62 M☉): 0.62 - 0.78 scale
    // - Intermediate black holes (GW190521 ~142 M☉): 0.98 scale
    // - Supermassive Sgr A* (~4.3 Million M☉): 2.45 scale
    // - Supermassive M87* (~6.5 Billion M☉): 3.65 scale
    // - Ultramassive TON 618 (~66 Billion M☉): 4.85 scale (and up to 6.5x with trueCosmicScale)
    let calculatedScale = 1.0;
    const isStar = isStellarCategory(nextParams.objectCategory);
    const activeStarPreset = isStar
      ? ASTROPHYSICAL_PRESETS.find((p) => p.id === nextParams.presetId)
      : undefined;
    if (isStar) {
      calculatedScale =
        activeStarPreset?.visualScale ??
        (nextParams.objectCategory === 'luminous_star' ? 1.05 : 0.45);
    } else {
      let trueMass = nextParams.trueMassSolar;
      if (!trueMass) {
        if (nextParams.presetId === 'ton618') trueMass = 6.6e10;
        else if (nextParams.presetId === 'm87') trueMass = 6.5e9;
        else if (nextParams.presetId === 'sgra') trueMass = 4.3e6;
        else if (nextParams.presetId === 'gw190521') trueMass = 142;
        else if (nextParams.presetId === 'gw150914') trueMass = 62;
        else if (nextParams.presetId === 'cygnus_x1') trueMass = 21.2;
        else if (nextParams.presetId === 'v404_cygni') trueMass = 9;
        else trueMass = nextParams.massSolar;
      }
      const logM = Math.log10(Math.max(1, trueMass));
      const normLog = Math.max(0, Math.min(1.0, logM / 10.82));
      calculatedScale = 0.52 + Math.pow(normLog, 1.35) * 4.33;
    }

    const cosmicScaleBoost = nextParams.trueCosmicScale ? 1.35 : 1.0;
    this.targetScale = Math.min(6.5, Math.max(0.40, calculatedScale * cosmicScaleBoost));
    this.targetExploded = nextParams.explodedSeparation;

    if (immediate || (nextParams.timeScale === 0 && massChanged)) {
      this.currentScale = this.targetScale;
      this.currentExploded = this.targetExploded;
    }

    // When switching between Isolated Singularity and Binary Accretion, frame the system appropriately
    if (!immediate && nextParams.systemCategory !== prevSystemCategory) {
      const distMultiplier = Math.max(0.72, Math.sqrt(this.targetScale));
      const incRad = THREE.MathUtils.degToRad(nextParams.inclinationDeg);
      if (nextParams.systemCategory === 'binary') {
        this.binaryOrbitAngle = -0.24;
        if (this.isSingularityCollapsed) {
          this.expandFromSingularity();
        }
        this.targetCamPos.set(
          4.2 * distMultiplier,
          Math.cos(incRad) * (32.5 * distMultiplier),
          Math.sin(incRad) * (32.5 * distMultiplier)
        );
        this.targetCamLook.set(4.2 * distMultiplier, 0, 0);
        this.cameraTransitionActive = true;
      } else {
        this.targetCamPos.set(
          0,
          Math.cos(incRad) * (26.5 * distMultiplier),
          Math.sin(incRad) * (26.5 * distMultiplier)
        );
        this.targetCamLook.set(0, 0, 0);
        this.cameraTransitionActive = true;
      }
    }

    // Adapt camera distance smoothly when switching across cosmic scale orders of magnitude
    if (!immediate && Math.abs(this.targetScale - prevScale) > 0.8) {
      const idealDist = Math.max(15.0, 24.5 * Math.sqrt(this.targetScale));
      const curCamDist = this.camera.position.length();
      if (curCamDist < idealDist * 0.55 || curCamDist > idealDist * 2.2) {
        this.targetCamPos.copy(this.camera.position).normalize().multiplyScalar(idealDist);
        this.targetCamLook.set(0, 0, 0);
        this.cameraTransitionActive = true;
      }
    }

    if (immediate) {
      this.currentScale = this.targetScale;
      this.currentExploded = this.targetExploded;
      const idealDist = Math.max(24.5, 25.5 * Math.sqrt(this.targetScale));
      if (!this.bootIntroActive) {
        this.camera.position.normalize().multiplyScalar(idealDist);
      }
      this.controls.maxDistance = Math.max(260, idealDist * 3.5);
    }

    const modeIndex =
      nextParams.spectralMode === 'eht230ghz'
        ? 1
        : nextParams.spectralMode === 'xray'
        ? 2
        : nextParams.spectralMode === 'doppler'
        ? 3
        : 0;

    const isClassicDisk = this.settings.accretionDiskStyle !== 'raymarched';
    const diskStyleVal = isClassicDisk ? 0.0 : 1.0;
    const isActiveAccretion = (nextParams.accretionState ?? 'quiescent') === 'active';
    const accretionStateVal = isActiveAccretion ? 1.0 : 0.0;

    const isDepthPeeling = Boolean(
      this.settings?.webglDepthPeeling ?? this.settings?.highPerformanceMode
    );
    if (this.activeDiskVolumeGroup) {
      this.activeDiskVolumeGroup.visible =
        !isStar && !isDepthPeeling && (isActiveAccretion || !isClassicDisk);
    }

    if (this.accretionDiskMat) {
      const dopplerStrength = nextParams.dopplerStrength;
      const betaScale = isClassicDisk ? 0.70 : 0.48;
      const gammaClamp = 1.0;
      const dopplerExponent = isClassicDisk ? 2.2 : 1.25;
      this.accretionDiskMat.uniforms.uDopplerCoeffs.value.set(
        dopplerStrength,
        betaScale,
        gammaClamp,
        dopplerExponent
      );

      this.accretionDiskMat.uniforms.uDiskParams.value.set(
        nextParams.spin,
        nextParams.accretionRate,
        modeIndex,
        isStar ? 1.0 : 0.0
      );
      this.accretionDiskMat.uniforms.uDiskStyle.value = diskStyleVal;
      this.accretionDiskMat.uniforms.uAccretionState.value = accretionStateVal;

      // Always render the 3D equatorial ring and volumetric 3D torus strata meshes in the Three.js scene
      this.accretionDiskMat.colorWrite = true;
    }

    if (this.gravitationalLensMat) {
      this.gravitationalLensMat.uniforms.uSpin.value = nextParams.spin;
      this.gravitationalLensMat.uniforms.uAccretionRate.value = nextParams.accretionRate;
      this.gravitationalLensMat.uniforms.uDopplerStrength.value = nextParams.dopplerStrength;
      this.gravitationalLensMat.uniforms.uSpectralMode.value = modeIndex;
      this.gravitationalLensMat.uniforms.uLensingActive.value = nextParams.gravitationalLensing ? 1.0 : 0.0;
      this.gravitationalLensMat.uniforms.uShowDisk.value = nextParams.layers.accretionDisk ? 1.0 : 0.0;
      this.gravitationalLensMat.uniforms.uIsStar.value = isStar ? 1.0 : 0.0;
      this.gravitationalLensMat.uniforms.uDiskStyle.value = diskStyleVal;
      this.gravitationalLensMat.uniforms.uAccretionState.value = accretionStateVal;
      this.gravitationalLensMat.uniforms.uIsBinarySystem.value =
        !isStar && nextParams.systemCategory === 'binary' ? 1.0 : 0.0;
      this.gravitationalLensMesh.visible = !isStar;
    }

    if (this.binarySystemGroup) {
      this.binarySystemGroup.visible = !isStar && nextParams.systemCategory === 'binary';
    }
    if (this.accretionStreamMat) {
      this.accretionStreamMat.uniforms.uSpectralMode.value = modeIndex;
    }
    if (this.accretionStreamOuterMat) {
      this.accretionStreamOuterMat.uniforms.uSpectralMode.value = modeIndex;
    }

    if (this.singularityCoreMat) {
      this.singularityCoreMat.uniforms.uSpectralMode.value = modeIndex;
    }
    if (this.singularityHaloMat) {
      this.singularityHaloMat.uniforms.uSpectralMode.value = modeIndex;
    }

    if (nextParams.backgroundTheme && (nextParams.backgroundTheme !== prevBackgroundTheme || immediate)) {
      this.setBackgroundTheme(nextParams.backgroundTheme);
    } else if (nextParams.backgroundTheme === 'pure_black') {
      if (this.cosmicSkyDomeMesh) this.cosmicSkyDomeMesh.visible = false;
      if (this.starfieldInstanced) this.starfieldInstanced.visible = false;
    }

    // Object Category switching: Black hole vs Star / Compact Remnant
    if (isStar) {
      this.eventHorizonMesh.visible = false;
      this.neutronStarGroup.visible = true;
      this.pulsarBeamsGroup.visible = nextParams.layers.pulsarBeams ?? true;
      this.magneticDipoleGroup.visible = nextParams.layers.magneticField ?? true;
      if (this.singularitySeedGroup) this.singularitySeedGroup.visible = false;

      if (this.neutronStarMat) {
        const surfHex =
          activeStarPreset?.surfaceHexColor ??
          (nextParams.objectCategory === 'luminous_star' ? 0x3b82f6 : 0x0ea5e9);
        this.neutronStarMat.uniforms.uBaseColor.value.setHex(surfHex);
      }
      if (this.pulsarBeamSystem) {
        const coreHex = activeStarPreset?.coreBeamHexColor ?? 0xf0f9ff;
        const sheathHex = activeStarPreset?.sheathBeamHexColor ?? 0x38bdf8;
        this.pulsarBeamSystem.uniforms.uCoreColor.value.setHex(coreHex);
        this.pulsarBeamSystem.uniforms.uSheathColor.value.setHex(sheathHex);
      }
      if (this.magneticDipoleGroup) {
        const magHex = activeStarPreset?.sheathBeamHexColor ?? 0x34d399;
        for (const child of this.magneticDipoleGroup.children) {
          const line = child as THREE.Line;
          if (line.material) {
            (line.material as THREE.LineBasicMaterial).color.setHex(magHex);
          }
        }
      }
    } else {
      this.eventHorizonMesh.visible = true;
      this.neutronStarGroup.visible = false;
    }

    // Layer visibilities (Hide spacetime grid during initial boot or when collapsed as a Singularity Seed)
    this.accretionDiskGroup.visible = nextParams.layers.accretionDisk;
    this.ergosphereGroup.visible = isStar ? false : nextParams.layers.ergosphereCage;
    this.spacetimeWellMesh.visible =
      nextParams.layers.spacetimeGrid && !this.bootIntroActive && (!this.isSingularityCollapsed || isStar);
    this.orbitalStarsGroup.visible = nextParams.layers.orbitalStars;
    this.geodesicGroup.visible = nextParams.layers.geodesicRays;

    if (!nextParams.layers.orbitalStars && this.followStarMode) {
      this.followStarMode = false;
      this.setCameraPreset('equatorial');
    }

    // Update S2 orbital trail radius only when radius actually changed
    const r = nextParams.probeRadiusRs * 1.75 * this.targetScale;
    if (Math.abs(r - this.lastTrailRadius) > 0.01) {
      this.lastTrailRadius = r;
      const trailPoints: THREE.Vector3[] = [];
      const trailSegments = 120;
      for (let i = 0; i <= trailSegments; i++) {
        const theta = (i / trailSegments) * Math.PI * 2;
        trailPoints.push(new THREE.Vector3(Math.cos(theta) * r, 0, -Math.sin(theta) * r));
      }
      this.starOrbitTrail.geometry.setFromPoints(trailPoints);
    }

    if (massChanged) {
      this.needsWellDeform = true;
    }

    if (isPresetTransition) {
      const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      gpuResourceCache.recordPresetTransition(endMs - presetSwitchStartMs, 8);
    }
  }

  public setCameraPreset(preset: CameraPresetId) {
    if (this.cinematicTourActive) {
      this.stopCinematicTour();
    }
    this.followStarMode = preset === 'star';
    this.cameraTransitionActive = true;
    this.slowCameraPanIn = false;

    const distMultiplier = Math.max(0.72, Math.sqrt(this.targetScale));
    const incRad = THREE.MathUtils.degToRad(this.params.inclinationDeg);
    const isBinary = !isStellarCategory(this.params.objectCategory) && this.params.systemCategory === 'binary';
    const lookX = isBinary ? 4.2 * distMultiplier : 0;

    switch (preset) {
      case 'equatorial':
        this.targetCamPos.set(
          lookX,
          Math.cos(incRad) * ((isBinary ? 32.5 : 26.5) * distMultiplier),
          Math.sin(incRad) * ((isBinary ? 32.5 : 26.5) * distMultiplier)
        );
        this.targetCamLook.set(lookX, 0, 0);
        break;
      case 'polar':
        this.targetCamPos.set(lookX, (isBinary ? 38.0 : 32.0) * distMultiplier, 1.5 * distMultiplier);
        this.targetCamLook.set(lookX, 0, 0);
        break;
      case 'plunge_45': {
        // 45-degree plunge trajectory angle showcasing the Kerr ergosphere, photon ring, and inner ISCO funnel
        const plungeR = (isBinary ? 19.5 : 14.2) * distMultiplier;
        const theta45 = THREE.MathUtils.degToRad(45);
        const phi45 = THREE.MathUtils.degToRad(62);
        this.targetCamPos.set(
          lookX + plungeR * Math.sin(theta45) * Math.cos(phi45),
          plungeR * Math.cos(theta45),
          plungeR * Math.sin(theta45) * Math.sin(phi45)
        );
        this.targetCamLook.set(lookX, 0, 0);
        break;
      }
      case 'grazing':
        this.targetCamPos.set(-9.5 * distMultiplier, 2.2 * distMultiplier, 16.5 * distMultiplier);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'well':
        // Deep angle framing the plunging gravitational well funnel
        this.targetCamPos.set(24.0 * distMultiplier, -14.0 * distMultiplier, 28.0 * distMultiplier);
        this.targetCamLook.set(lookX * 0.5, -10.0, 0);
        break;
      case 'star':
        break;
    }
  }

  public startCinematicTour() {
    if (this.bootIntroActive || this.bootAutoExpandPending) return;
    if (this.isSingularityCollapsed) {
      this.expandFromSingularity(false);
    }
    this.followStarMode = false;
    this.cameraTransitionActive = false;
    this.slowCameraPanIn = false;
    this.cinematicTourActive = true;
    this.cinematicTourElapsed = 0.0;
    this.cinematicTourStageIndex = 0;
    this.cinematicTourStartPos.copy(this.camera.position);
    this.cinematicTourStartLook.copy(this.controls.target);
    this.onCinematicTourChange?.(true, 'polar', 'Polar Axis');
  }

  public stopCinematicTour() {
    if (!this.cinematicTourActive) return;
    this.cinematicTourActive = false;
    const baseFov = this.settings?.cameraFov ?? 46;
    if (Math.abs(this.camera.fov - baseFov) > 0.05) {
      this.camera.fov = baseFov;
      this.camera.updateProjectionMatrix();
    }
    this.onCinematicTourChange?.(false, 'equatorial', 'Equatorial');
  }

  public toggleCinematicTour(): boolean {
    if (this.cinematicTourActive) {
      this.stopCinematicTour();
      return false;
    }
    this.startCinematicTour();
    return true;
  }

  public isCinematicTourActive(): boolean {
    return this.cinematicTourActive;
  }

  /**
   * High-DPI WebGL pixel ratio controller:
   * - Caps desktop viewports (> 1024px) to 1.25 (or 1.0 when > 1920px wide) to bound GPU fill-rate.
   * - Supports dynamic resolution stepping down to 0.75 when rolling 30-frame FPS drops below 48 FPS.
   */
  private computeTargetBasePixelRatio(): number {
    const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1.0 : 1.0;
    const viewportWidth =
      typeof window !== 'undefined'
        ? window.innerWidth
        : this.container?.clientWidth || 1280;
    return computeBaseDesktopPixelRatio(viewportWidth, rawDpr, {
      lowResolutionRender: Boolean(this.settings?.lowResolutionRender),
      highPerformanceMode: Boolean(this.settings?.highPerformanceMode),
      isSoftwareGl,
    });
  }

  private applyDynamicPixelRatio(targetPixelRatio: number, width: number, height: number) {
    if (!this.renderer) return;
    if (this.renderer.getPixelRatio() !== targetPixelRatio) {
      this.renderer.setPixelRatio(targetPixelRatio);
    }
    this.renderer.setSize(width, height, false);
    this.lastAppliedPixelRatio = targetPixelRatio;

    const rtWidth = Math.max(1, Math.round(width * targetPixelRatio));
    const rtHeight = Math.max(1, Math.round(height * targetPixelRatio));
    if (this.settings.timeLapseEnabled) {
      this.motionBlurRenderTarget?.setSize(rtWidth, rtHeight);
      this.timeLapseTargetA?.setSize(rtWidth, rtHeight);
      this.timeLapseTargetB?.setSize(rtWidth, rtHeight);
    } else if (this.settings.motionBlurEnabled && !this.settings.highPerformanceMode && !this.isUserInteracting) {
      this.motionBlurRenderTarget?.setSize(rtWidth, rtHeight);
    }
    if (this.postMaterial) {
      this.postMaterial.uniforms.uResolution.value.set(rtWidth, rtHeight);
    }
    if (this.cameraLensFlareMat) {
      this.cameraLensFlareMat.uniforms.uResolution.value.set(rtWidth, rtHeight);
    }
  }

  private configureDevicePixelRatioAndUpscaling(width: number, height: number): number {
    const baseCap = this.computeTargetBasePixelRatio();
    this.basePixelRatioCap = baseCap;
    const targetPixelRatio =
      this.settings?.lowResolutionRender || isSoftwareGl
        ? baseCap
        : Math.max(Math.min(DYNAMIC_RES_MIN_DPR, baseCap), Math.min(baseCap, this.dynamicPixelRatio || baseCap));
    this.dynamicPixelRatio = targetPixelRatio;

    // Maintain GPU-composited layer promotion and touch-action: none on the canvas DOM element
    if (this.domElement) {
      this.domElement.style.touchAction = 'none';
      this.domElement.style.imageRendering = 'auto';
      this.domElement.style.transform = 'translateZ(0)';
      this.domElement.style.backfaceVisibility = 'hidden';
      this.domElement.style.willChange = 'transform';
    }

    if (this.renderer) {
      if (this.renderer.getPixelRatio() !== targetPixelRatio) {
        this.renderer.setPixelRatio(targetPixelRatio);
      }
      if (
        width !== this.lastResizeWidth ||
        height !== this.lastResizeHeight ||
        targetPixelRatio !== this.lastAppliedPixelRatio
      ) {
        this.renderer.setSize(width, height, true);
      }
    }

    return targetPixelRatio;
  }

  public isBootIntroRunning(): boolean {
    return this.bootIntroActive;
  }

  public isWatermarkPauseRunning(): boolean {
    return this.bootAutoExpandPending;
  }

  public skipBootIntro(immediateExpand = false) {
    if (!this.bootIntroActive && !this.bootAutoExpandPending) return;
    this.bootIntroActive = false;
    this.bootIntroElapsed = this.bootIntroDuration;
    this.camera.position.copy(this.bootSeedStagePos);
    this.controls.target.set(0, 0, 0);
    this.camera.lookAt(this.controls.target);
    this.controls.enabled = true;
    this.controls.update();
    if (immediateExpand) {
      this.bootAutoExpandPending = false;
      this.isWatermarkOverlayVisible = false;
      this.singularitySeedLoaded = true;
      this.seedLoadProgress = 1.0;
      this.onSingularitySeedLoaded?.();
      this.onWatermarkPauseComplete?.();
      this.expandFromSingularity(true);
    } else {
      this.bootAutoExpandPending = true;
      this.bootAutoExpandElapsed = 0.0;
      this.bootWatermarkEmitted = false;
      this.bootWatermarkFadeEmitted = false;
      this.isWatermarkOverlayVisible = false;
    }
    if (this.onObserverReadoutChange) {
      this.onObserverReadoutChange(this.getObserverSphericalCoords(), true);
    }
    this.onBootIntroComplete?.();
  }

  public isOrbitingCamera(): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return this.isUserInteracting || now - this.lastOrbitEndMs < 300;
  }

  public getObserverSphericalCoords(): { rRs: number; thetaDeg: number; phiDeg: number } {
    const dx = this.camera.position.x - this.controls.target.x;
    const dy = this.camera.position.y - this.controls.target.y;
    const dz = this.camera.position.z - this.controls.target.z;
    const dist = Math.max(0.001, Math.hypot(dx, dy, dz));
    const rRs = Math.max(0.55, dist / 1.75);
    const thetaDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(dy / dist, -1, 1)));
    const phiDeg = ((THREE.MathUtils.radToDeg(Math.atan2(dz, dx)) % 360) + 360) % 360;
    return { rRs, thetaDeg, phiDeg };
  }

  private handleResize = () => {
    if (!this.container || this.isDisposed) return;
    // Never resize the WebGL renderer or allocate new full-screen render targets while the user is actively dragging/orbiting
    if (this.isUserInteracting) {
      this.pendingResizeAfterOrbit = true;
      return;
    }
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const baseCap = this.computeTargetBasePixelRatio();
    const expectedDpr =
      this.settings?.lowResolutionRender || isSoftwareGl
        ? baseCap
        : Math.max(Math.min(DYNAMIC_RES_MIN_DPR, baseCap), Math.min(baseCap, this.dynamicPixelRatio || baseCap));
    if (
      width === this.lastResizeWidth &&
      height === this.lastResizeHeight &&
      expectedDpr === this.lastAppliedPixelRatio
    ) {
      return;
    }

    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    const effectiveDpr = this.configureDevicePixelRatioAndUpscaling(width, height);
    this.lastResizeWidth = width;
    this.lastResizeHeight = height;
    this.lastAppliedPixelRatio = effectiveDpr;
    this.cachedCanvasRect = this.domElement.getBoundingClientRect();

    const rtWidth = Math.max(1, Math.round(width * effectiveDpr));
    const rtHeight = Math.max(1, Math.round(height * effectiveDpr));
    if (!this.renderer) {
      this.domElement.width = rtWidth;
      this.domElement.height = rtHeight;
      this.domElement.style.width = `${width}px`;
      this.domElement.style.height = `${height}px`;
    }
    if (this.settings.timeLapseEnabled) {
      this.motionBlurRenderTarget?.setSize(rtWidth, rtHeight);
      this.timeLapseTargetA?.setSize(rtWidth, rtHeight);
      this.timeLapseTargetB?.setSize(rtWidth, rtHeight);
    } else if (this.settings.motionBlurEnabled && !this.settings.highPerformanceMode) {
      this.motionBlurRenderTarget?.setSize(rtWidth, rtHeight);
    }
    this.timeLapseInitialized = false;
    if (this.postMaterial) {
      this.postMaterial.uniforms.uResolution.value.set(rtWidth, rtHeight);
    }
    if (this.cameraLensFlareMat) {
      this.cameraLensFlareMat.uniforms.uResolution.value.set(rtWidth, rtHeight);
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.activePointerIds.add(e.pointerId);
    if (this.activePointerIds.size >= 2) {
      this.multiTouchGestureOccurred = true;
    } else {
      this.pointerDownPos.set(e.clientX, e.clientY);
    }
    this.cachedCanvasRect = this.domElement.getBoundingClientRect();
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.activePointerIds.delete(e.pointerId);
    if (this.multiTouchGestureOccurred) {
      this.lastMultiTouchEndMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (this.activePointerIds.size === 0) {
        this.multiTouchGestureOccurred = false;
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    // Decouple camera orbit dragging from pointer raycasting, layout reflows, and React state updates
    if (this.isUserInteracting || e.buttons !== 0 || this.activePointerIds.size > 0) return;

    const now = performance.now();
    const raycastIntervalMs = this.settings?.highPerformanceMode ? 180 : 64;
    if (now - this.lastRaycastTime < raycastIntervalMs) return;
    this.lastRaycastTime = now;

    const rect = this.cachedCanvasRect || (this.cachedCanvasRect = this.domElement.getBoundingClientRect());
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const ray = this.raycaster.ray;

    // Show interactive pointer cursor when hovering over the clickable singularity ball or the expanded black hole event horizon
    if (!isStellarCategory(this.params.objectCategory)) {
      const distToOrigin = ray.distanceToPoint(this.blackHoleGroup.position);
      const hitRadius = this.isSingularityCollapsed
        ? Math.max(3.8, 1.8 * this.currentScale)
        : Math.max(2.0, 2.26 * this.currentScale);
      const targetCursor = distToOrigin < hitRadius ? 'pointer' : 'crosshair';
      if (this.domElement.style.cursor !== targetCursor) {
        this.domElement.style.cursor = targetCursor;
      }
    } else if (this.domElement.style.cursor !== 'crosshair') {
      this.domElement.style.cursor = 'crosshair';
    }

    if (!this.settings.showCursorTelemetry && !this.settings.showMetricTelemetry) {
      return;
    }

    if (Math.abs(ray.direction.y) > 0.001) {
      const t = -ray.origin.y / ray.direction.y;
      if (t > 0 && t < 80) {
        _vec3A.copy(ray.origin).addScaledVector(ray.direction, t);
        const rScene = Math.hypot(_vec3A.x, _vec3A.z);
        const rRs = Math.max(0.5, rScene / (1.75 * this.currentScale));
        const phiDeg = ((Math.atan2(_vec3A.z, _vec3A.x) * 180) / Math.PI + 360) % 360;
        const redshiftZ = rRs > 1.02 ? 1.0 / Math.sqrt(1.0 - 1.0 / rRs) - 1.0 : 99.99;
        this.onHoverCoordsChange?.({ rRs, phiDeg, redshiftZ });
        return;
      }
    }
    this.onHoverCoordsChange?.(null);
  };

  private handleCanvasClick = (e: MouseEvent) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Ignore synthetic clicks following two-finger pinch-zoom / pan gestures or orbit drags
    if (this.multiTouchGestureOccurred || now - this.lastMultiTouchEndMs < 450) return;
    const dragDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dragDist > 7) return;

    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const distToCenter = this.raycaster.ray.distanceToPoint(this.blackHoleGroup.position);
    const isStar = isStellarCategory(this.params.objectCategory);

    if (this.bootIntroActive || this.bootAutoExpandPending) return;

    if (!isStar && this.isSingularityCollapsed) {
      // Clicking the small singularity ball triggers the expansion animation
      if (distToCenter < Math.max(3.6, 2.2 * this.currentScale)) {
        this.expandFromSingularity();
        return;
      }
    }

    if (!isStar && !this.isSingularityCollapsed) {
      // Clicking the central black hole event horizon shrinks/collapses it back into a Singularity Seed
      const clampedSpin = Math.min(1.0, Math.max(0.0, this.params.spin));
      const horizonSpinFactor = ((2.12 - 0.16 * clampedSpin * 0.45) / 2.12) * 0.94;
      const horizonHitRadius = Math.max(2.0, 2.28 * this.currentScale * horizonSpinFactor);
      if (distToCenter <= horizonHitRadius) {
        this.onFeatureSelect?.(null);
        this.collapseToSingularity();
        return;
      }
    }

    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const hit of hits) {
      if (hit.object.visible && hit.object.userData?.feature) {
        if (!isStar && hit.object === this.eventHorizonMesh) {
          this.onFeatureSelect?.(null);
          this.collapseToSingularity();
          return;
        }
        this.onFeatureSelect?.(hit.object.userData.feature as InspectedFeature);
        return;
      }
    }
  };

  private handleCanvasDoubleClick = (e: MouseEvent) => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const ray = this.raycaster.ray;
    if (Math.abs(ray.direction.y) > 0.01) {
      const t = -ray.origin.y / ray.direction.y;
      if (t > 0) {
        _vec3A.copy(ray.origin).addScaledVector(ray.direction, t);
        const impactB = THREE.MathUtils.clamp(_vec3A.z, -8.5, 8.5);
        this.launchPhotonGeodesic(impactB, 0);
      }
    }
  };

  private afterDraw(cb: () => void) {
    if (!this.isDisposed) {
      this.frameId = window.setTimeout(cb, 16);
    }
  }

  private tick = () => {
    if (this.isDisposed) return;

    // Stop hidden render passes when tab is backgrounded or mount container has zero area
    const isContainerHidden =
      (typeof document !== 'undefined' && document.hidden) ||
      !this.container ||
      this.container.clientWidth <= 0 ||
      this.container.clientHeight <= 0;
    if (isContainerHidden) {
      this.lastTickStartMs = 0;
      if (!this.renderer) {
        this.frameId = window.setTimeout(this.tick, 100);
      } else {
        this.frameId = requestAnimationFrame(this.tick);
      }
      return;
    }

    const tickStartMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const interFrameMs =
      this.lastTickStartMs > 0 ? tickStartMs - this.lastTickStartMs : 16.67;
    this.lastTickStartMs = tickStartMs;
    this.lastFramePerfMs = tickStartMs;

    safePerfMark(KERR_PERF_MARKS.rafStart);
    safePerfMark(KERR_PERF_MARKS.cpuSimStart);

    const clockDelta = this.clock.getDelta();
    const wallDelta = Math.min(2.5, Math.max(0.001, clockDelta));
    const rawDelta = Math.min(0.25, clockDelta);
    const simDelta = wallDelta * this.params.timeScale;
    // 1. Advance Simulation Time & Pre-Compute Uniform-Buffer Orbital Turbulence Math
    this.accretionDiskSimTime += simDelta;
    const elapsed = this.accretionDiskSimTime;

    if (this.accretionDiskMat) {
      // Uniform-Buffer Orbital Turbulence Vector:
      // (basePhase, ringPhase, shearRate, timeScale)
      const basePhase = elapsed;
      const ringPhase = elapsed * 0.35;
      const shearRate = elapsed * 3.2;
      const timeScale = this.params.timeScale;

      this.accretionDiskMat.uniforms.uTurbulenceBuffer.value.set(
        basePhase,
        ringPhase,
        shearRate,
        timeScale
      );
    }

    // 2. Smooth Exponential Damping on Scale, Singularity Expansion & Exploded Anatomy Separation
    if (simDelta > 0) {
      this.currentScale = THREE.MathUtils.damp(this.currentScale, this.targetScale, 5.5, simDelta);
      this.currentExploded = THREE.MathUtils.damp(this.currentExploded, this.targetExploded, 6.0, simDelta);
    }

    const isStar = isStellarCategory(this.params.objectCategory);
    const minSeedWorldScale = 0.11; // Small singularity ball initial scale (~0.25 world units radius)

    const collapseOrExpandDelta =
      this.targetExpansionProgress < this.expansionProgress
        ? Math.max(simDelta, wallDelta * 0.9)
        : simDelta;

    if (isStar) {
      this.expansionProgress = 1.0;
    } else if (
      collapseOrExpandDelta > 0 &&
      Math.abs(this.expansionProgress - this.targetExpansionProgress) > 0.0005
    ) {
      if (this.targetExpansionProgress > this.expansionProgress) {
        // Grow from the Singularity Seed with a weighty, movie-grade expansion duration during slow pan-in
        const expandDuration = this.slowCameraPanIn ? 2.2 : this.pulseDuration;
        this.expansionProgress = Math.min(
          1.0,
          this.expansionProgress + collapseOrExpandDelta / expandDuration
        );
      } else {
        // Smooth gravitational collapse back to the small singularity ball
        this.expansionProgress = Math.max(
          0.0,
          this.expansionProgress - collapseOrExpandDelta * 1.65
        );
        // Trigger subtle 'event horizon echo' pulse effect right when the singularity seed is formed
        if (this.pendingCollapseEchoPulse && this.expansionProgress <= 0.06) {
          this.pendingCollapseEchoPulse = false;
          this.triggerEventHorizonEchoPulse();
        }
      }
    } else if (collapseOrExpandDelta > 0) {
      this.expansionProgress = this.targetExpansionProgress;
      if (this.pendingCollapseEchoPulse && this.expansionProgress <= 0.06) {
        this.pendingCollapseEchoPulse = false;
        this.triggerEventHorizonEchoPulse();
      }
    }

    // Reveal the UI only after the Singularity Seed has expanded and the slow camera pan-in reaches its final stretch (so UI never blocks the animation)
    if (
      this.isSingularityCollapsed &&
      this.targetExpansionProgress >= 0.99 &&
      this.expansionProgress >= 0.98 &&
      (!this.slowCameraPanIn || this.slowPanInElapsed / this.slowPanInDuration >= 0.86)
    ) {
      this.isSingularityCollapsed = false;
      this.onSingularityStateChange?.(false);
    }

    // Unified shockwave & singularity growth curve:
    // Both the black hole scale and the shockwave front follow the exact same relativistic blast curve
    const expT = this.expansionProgress;
    const shockGrowth = isStar ? 1.0 : 1.0 - Math.pow(1.0 - expT, 2.6);
    const effectiveScale = isStar
      ? this.currentScale
      : THREE.MathUtils.lerp(minSeedWorldScale, this.currentScale, shockGrowth);

    const clampedSpin = Math.min(1.0, Math.max(0.0, this.params.spin));
    const horizonSpinFactor = ((2.12 - 0.16 * clampedSpin * 0.45) / 2.12) * 0.94;
    const bardeenXScale = 1.0 - 0.06 * clampedSpin * clampedSpin;
    this.eventHorizonMesh.scale.set(
      effectiveScale * horizonSpinFactor * bardeenXScale,
      effectiveScale * horizonSpinFactor,
      effectiveScale * horizonSpinFactor
    );
    this.accretionDiskGroup.scale.setScalar(effectiveScale);
    this.neutronStarGroup.scale.setScalar(this.currentScale);
    if (this.secret1987Group) {
      this.secret1987Group.visible = Boolean(this.settings.secret1987Mode);
      if (this.settings.secret1987Mode) {
        this.secret1987Group.scale.setScalar(this.currentScale);
        this.secret1987EquatorialRing.rotation.y += simDelta * 0.45;
        this.secret1987NorthRing.rotation.y -= simDelta * 0.32;
        this.secret1987SouthRing.rotation.y += simDelta * 0.32;
      }
    }

    // Update Binary Accretion System (Companion Star + Roche Lobe Overflow Plasma Stream)
    const isBinary = !isStar && this.params.systemCategory === 'binary';
    if (this.binarySystemGroup) {
      this.binarySystemGroup.visible = isBinary && this.expansionProgress > 0.03;
      if (isBinary) {
        this.binarySystemGroup.scale.setScalar(effectiveScale);
        // Slow binary orbital revolution so the companion star can also pass behind the black hole for gravitational lensing
        this.binaryOrbitAngle += simDelta * 0.12;
        this.binarySystemGroup.rotation.y = this.binaryOrbitAngle;

        // Compute world position of the companion star for the gravitational lensing shader
        this.binaryStarMesh.getWorldPosition(this.companionStarWorldPos);
        const horizonRadiusWorld = 2.26 * effectiveScale;

        if (this.binaryStarMat) {
          this.binaryStarMat.uniforms.uTime.value = elapsed;
          this.binaryStarMat.uniforms.uBloomIntensity.value = this.settings.bloomIntensity;
          this.binaryStarMat.uniforms.uBlackHolePos.value.copy(this.blackHoleGroup.position);
          this.binaryStarMat.uniforms.uHorizonRadiusWorld.value = horizonRadiusWorld;
          this.binaryStarMat.uniforms.uLensingActive.value = this.params.gravitationalLensing ? 1.0 : 0.0;
        }
        if (this.binaryCoronaMat) {
          this.binaryCoronaMat.uniforms.uTime.value = elapsed;
          this.binaryCoronaMat.uniforms.uBloomIntensity.value = this.settings.bloomIntensity;
          this.binaryCoronaMat.uniforms.uBlackHolePos.value.copy(this.blackHoleGroup.position);
          this.binaryCoronaMat.uniforms.uHorizonRadiusWorld.value = horizonRadiusWorld;
          this.binaryCoronaMat.uniforms.uLensingActive.value = this.params.gravitationalLensing ? 1.0 : 0.0;
        }
        if (this.accretionStreamMat) {
          this.accretionStreamMat.uniforms.uTime.value = elapsed;
          this.accretionStreamMat.uniforms.uBloomIntensity.value = this.settings.bloomIntensity;
        }
        if (this.accretionStreamOuterMat) {
          this.accretionStreamOuterMat.uniforms.uTime.value = elapsed;
          this.accretionStreamOuterMat.uniforms.uBloomIntensity.value = this.settings.bloomIntensity;
        }
        if (this.streamHotspotMesh) {
          const hotPulse = 1.0 + Math.sin(elapsed * 7.5) * 0.16 + Math.cos(elapsed * 13.0) * 0.08;
          this.streamHotspotMesh.scale.set(1.6 * hotPulse, 0.48 * hotPulse, 1.2 * hotPulse);
        }

        // Advance Instanced Plasma Particles flowing along the Cubic Bezier Curve from the star's equator to the accretion disk
        if (this.streamParticlesInstanced && this.streamCurve) {
          for (let i = 0; i < this.streamParticleCount; i++) {
            if (simDelta > 0) {
              // Accelerate particles as they fall deeper into the black hole's gravitational potential
              const curPhase = this.streamParticlePhases[i];
              const accel = 0.65 + 1.45 * curPhase * curPhase;
              this.streamParticlePhases[i] = (curPhase + simDelta * this.streamParticleSpeeds[i] * accel) % 1.0;
            }
            const t = this.streamParticlePhases[i];
            this.streamCurve.getPoint(t, _vec3A);
            this.streamCurve.getTangent(t, _vec3B);

            // Spiral plasma parcels tightly around the Bezier curve spine as they approach the accretion disk
            const funnelEnvelope = (1.0 - t * 0.55) * Math.sin(Math.min(1.0, t * 8.0) * (Math.PI * 0.5));
            const swirlAngle = elapsed * 3.8 + i * 0.7 + t * 10.5;
            const offset = this.streamParticleOffsets[i];
            const cosS = Math.cos(swirlAngle);
            const sinS = Math.sin(swirlAngle);

            _vec3A.x += (offset.x * cosS - offset.z * sinS) * funnelEnvelope;
            _vec3A.y += offset.y * funnelEnvelope;
            _vec3A.z += (offset.x * sinS + offset.z * cosS) * funnelEnvelope;

            // Stretch parcels along their velocity tangent vector as they accelerate toward the disk
            const pScale = this.streamParticleScales[i] * Math.sin(t * Math.PI);
            _vec3C.set(0, 1, 0);
            _quat.setFromUnitVectors(_vec3C, _vec3B.normalize());
            _vec3D.set(pScale * 0.72, pScale * (1.35 + t * 2.2), pScale * 0.72);
            _mat4.compose(_vec3A, _quat, _vec3D);
            this.streamParticlesInstanced.setMatrixAt(i, _mat4);
          }
          this.streamParticlesInstanced.instanceMatrix.needsUpdate = true;
        }
      }
    }

    if (this.accretionDiskMat) {
      this.accretionDiskMat.uniforms.uExpansionProgress.value = isStar ? 1.0 : this.expansionProgress;
    }

    // Smoothly materialize the Singularity Seed once singularitySeedLoaded becomes true (only after watermark is no longer active)
    if (this.singularitySeedLoaded && !this.isWatermarkOverlayVisible && this.seedLoadProgress < 1.0) {
      this.seedLoadProgress = Math.min(1.0, this.seedLoadProgress + wallDelta / 0.42);
    }
    const seedAppearEase = 1.0 - Math.pow(1.0 - this.seedLoadProgress, 3.0);

    // Hide the central blackHoleGroup until the Singularity Seed is loaded and the watermark overlay has cleared
    if (!isStar) {
      this.blackHoleGroup.visible = this.singularitySeedLoaded && !this.isWatermarkOverlayVisible;
    } else {
      this.blackHoleGroup.visible = true;
    }

    // Update Small Singularity Ball (grows directly into the black hole event horizon along with effectiveScale)
    if (this.singularitySeedGroup) {
      const showSeed =
        !isStar &&
        this.singularitySeedLoaded &&
        !this.isWatermarkOverlayVisible &&
        this.expansionProgress < 0.82;
      this.singularitySeedGroup.visible = showSeed;
      if (showSeed) {
        const echoHaloBoost = this.isEchoPulseActive
          ? 0.28 * Math.sin(this.echoPulseProgress * Math.PI) * (1.0 - this.echoPulseProgress)
          : 0.0;
        const seedFade =
          Math.min(
            1.0,
            (1.0 - THREE.MathUtils.smoothstep(shockGrowth, 0.18, 0.78)) + echoHaloBoost * 0.5
          ) * seedAppearEase;
        const idlePulse =
          (1.0 - shockGrowth) * (Math.sin(elapsed * 5.2) * 0.06 + Math.cos(elapsed * 11.3) * 0.03) +
          echoHaloBoost;
        const camDistForSeed = this.camera.position.length();
        const distVisibilityBoost = THREE.MathUtils.lerp(
          THREE.MathUtils.clamp(camDistForSeed / 22.0, 1.0, 4.6),
          1.0,
          shockGrowth
        );
        // Scales directly with effectiveScale, seedAppearEase, and distance compensation so the Singularity Seed materializes smoothly
        this.singularitySeedGroup.scale.setScalar(
          effectiveScale * distVisibilityBoost * (1.0 + idlePulse) * Math.max(0.05, seedAppearEase)
        );

        if (this.singularityCoreMat) {
          this.singularityCoreMat.uniforms.uTime.value = elapsed;
          this.singularityCoreMat.uniforms.uOpacity.value = seedFade;
        }
        if (this.singularityHaloMat) {
          this.singularityHaloMat.uniforms.uTime.value = elapsed;
          this.singularityHaloMat.uniforms.uOpacity.value = seedFade;
        }
        if (this.singularityHaloMesh) {
          this.singularityHaloMesh.quaternion.copy(this.camera.quaternion);
        }
      }
    }

    if (Math.abs(this.expansionProgress - this.lastWellExpansionProgress) > 0.002) {
      this.needsWellDeform = true;
    }

    this.ergosphereGroup.position.y = this.currentExploded * 3.8;

    // Continuously flow the 3D Spacetime Curvature Grid (opacity, radial unfolding & vertical drop) in lockstep with the animation
    const showGridLayer =
      Boolean(this.params.layers.spacetimeGrid) &&
      !this.bootIntroActive &&
      !this.bootAutoExpandPending &&
      (isStar || (this.targetExpansionProgress > 0.5 && this.expansionProgress > 0.005));
    this.spacetimeWellMesh.visible = showGridLayer;
    if (showGridLayer) {
      const gridFlow = isStar
        ? 1.0
        : THREE.MathUtils.smoothstep(shockGrowth, 0.01, 0.92);
      const wellMat = this.spacetimeWellMesh.material as THREE.MeshBasicMaterial;
      if (wellMat) {
        wellMat.opacity = gridFlow * (0.28 + this.pulseStrength * 0.16);
      }
      const wellBaseY = -Math.max(6.8, 4.15 * this.currentScale);
      this.spacetimeWellMesh.position.y =
        wellBaseY - this.currentExploded * 3.6 - (1.0 - gridFlow) * 3.2;
      const wellXZScale =
        Math.max(1.0, this.currentScale * 0.55) * (0.38 + 0.62 * gridFlow);
      this.spacetimeWellMesh.scale.set(wellXZScale, 1.0, wellXZScale);
    }

    // 3. Lense-Thirring Frame-Dragging Rotation
    const metrics = this.cachedMetrics;
    this.ergosphereGroup.rotation.y += simDelta * (0.4 + metrics.frameDraggingOmega * 4.5);
    this.ergosphereGroup.scale.set(
      effectiveScale * (1.0 + 0.22 * this.params.spin),
      effectiveScale * (1.0 - 0.14 * this.params.spin),
      effectiveScale * (1.0 + 0.22 * this.params.spin)
    );

    // 4. Pulsar Lighthouse Beams, Magnetic Axis Precession & Compact/Luminous Star Shader Uniforms
    if (isStellarCategory(this.params.objectCategory)) {
      const isLuminous = this.params.objectCategory === 'luminous_star';
      const spinOmega = (isLuminous ? 1.8 : 4.5) + this.params.spin * (isLuminous ? 4.2 : 8.0);
      this.pulsarRotationAngle += simDelta * spinOmega;
      this.neutronStarMesh.rotation.y = this.pulsarRotationAngle * 0.25;

      if (this.neutronStarMat) {
        const activeStarPreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === this.params.presetId);
        // Dynamically scale hotspot intensity and compactness with accretion/wind flux and stellar mass
        this.neutronStarMat.uniforms.uHotspotIntensity.value =
          (isLuminous ? 0.85 : 1.25) + this.params.accretionRate * (isLuminous ? 0.50 : 0.65);
        const baseCompactness =
          activeStarPreset?.compactnessRatio ??
          THREE.MathUtils.clamp(0.36 + (this.params.massSolar - 1.4) * 0.08, 0.12, 0.64);
        this.neutronStarMat.uniforms.uRadius.value = 1.65;
        this.neutronStarMat.uniforms.uSchwarzschildRadius.value = 1.65 * baseCompactness;

        // Rotate the magnetic dipole axis independently with free precession wobble
        // and synchronize the twin pulsar/outflow beams so their apexes stay locked to ±uMagneticAxis * R_star
        const magAxis = updateCompactStarPrecession(
          this.neutronStarMat,
          elapsed,
          spinOmega,
          THREE.MathUtils.degToRad(isLuminous ? 16 : 24),
          isLuminous ? 0.35 : 0.55,
          this.pulsarBeamSystem
        );
        this.currentMagneticAxis.copy(magAxis);

        // Align the magnetic dipole field lines to the same precessing magnetic axis
        _vec3A.set(0, 1, 0);
        this.magneticDipoleGroup.quaternion.setFromUnitVectors(_vec3A, magAxis);

        // Synchronize high-frequency pulsar chirp with the beam's sweep frequency & camera alignment
        _vec3B.copy(this.camera.position).normalize();
        const hotspotAlignment = Math.min(
          1.0,
          Math.max(0.0, Math.abs(_vec3B.dot(this.currentMagneticAxis)))
        );
        const camHorizLen = Math.hypot(_vec3B.x, _vec3B.z);
        const magHorizLen = Math.hypot(this.currentMagneticAxis.x, this.currentMagneticAxis.z);
        const azimuthalSweep =
          camHorizLen > 1e-4 && magHorizLen > 1e-4
            ? Math.abs(
                (_vec3B.x * this.currentMagneticAxis.x + _vec3B.z * this.currentMagneticAxis.z) /
                  (camHorizLen * magHorizLen)
              )
            : hotspotAlignment;
        const approachDerivative =
          simDelta > 1e-5 ? (hotspotAlignment - this.lastHotspotAlignment) / simDelta : 0.0;
        this.lastHotspotAlignment = hotspotAlignment;

        relativisticAudio.updatePulsarBeamSweep({
          active: Boolean(this.params.layers.pulsarBeams) && this.params.timeScale > 0,
          hotspotAlignment,
          azimuthalSweep,
          approachDerivative,
          sweepOmega: spinOmega * Math.max(0.1, this.params.timeScale),
          isCompactStar: !isLuminous,
        });
      }
    } else {
      relativisticAudio.updatePulsarBeamSweep({
        active: false,
        hotspotAlignment: 0,
        azimuthalSweep: 0,
        approachDerivative: 0,
        sweepOmega: 0,
        isCompactStar: false,
      });
    }

    // 4b. Relativistic Sonic Boom Animation (Shockwave starts at the small singularity ball and grows outward with the black hole)
    // When paused (simDelta === 0), pulse shockwave freezes in place exactly at its current radius!
    if (this.isPulseActive) {
      if (simDelta > 0) {
        this.pulseProgress += simDelta / this.pulseDuration;
      }
      if (this.pulseProgress >= 1.0) {
        this.isPulseActive = false;
        this.pulseProgress = 1.0;
        this.pulseStrength = 0.0;
        this.primaryPulseMesh.visible = false;
        this.secondaryPulseMesh.visible = false;
        this.tertiaryPulseMesh.visible = false;
        for (const extra of this.extraPulseRippleMeshes) {
          extra.mesh.visible = false;
        }
        this.gravitationalWaveShellMesh.visible = false;
        this.horizonFlashMesh.visible = false;
        this.accretionDiskMat.uniforms.uPulseStrength.value = 0.0;
        this.needsWellDeform = true;
      } else {
        // Synchronized N-wave blast expansion: starts at the small singularity ball (2.26 * minSeedWorldScale ≈ 0.25)
        // and expands outward in lockstep with the growing black hole and unfurling accretion disk.
        // On initial boot expansion (isCinematicBootBoom), the supersonic Mach shell blasts out to 38.0 * scale
        // right past the observer camera for a massive cinematic first impression!
        const ease = 1.0 - Math.pow(1.0 - this.pulseProgress, this.isCinematicBootBoom ? 2.9 : 2.6);
        const boostMult = this.isCinematicBootBoom ? 1.32 : 1.0;
        this.pulseStrength = Math.pow(1.0 - this.pulseProgress, 1.32) * boostMult;
        const startR = isStar ? 1.75 * this.currentScale : 2.26 * minSeedWorldScale;
        const maxShockRadius = (this.isCinematicBootBoom ? 38.0 : 24.5) * this.currentScale;
        this.pulseRadius = THREE.MathUtils.lerp(startR, maxShockRadius, ease);

        // Update accretion disk sonic-boom rarefaction & compression uniforms in local effectiveScale space
        this.accretionDiskMat.uniforms.uPulseRadius.value = this.pulseRadius / Math.max(0.05, effectiveScale);
        this.accretionDiskMat.uniforms.uPulseStrength.value = this.pulseStrength;
        this.accretionDiskMat.uniforms.uDiskParams.value.w = isStar ? 1.0 : 0.0;

        // Primary leading sonic shockwave ring riding on the outer growing boundary of the accretion disk
        this.primaryPulseMesh.visible = true;
        this.primaryPulseMesh.scale.set(this.pulseRadius, this.pulseRadius, this.pulseRadius);
        (this.primaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.min(1.0, this.pulseStrength * 0.94);

        // Secondary trailing N-wave shock ring coupled to the expanding mid-disk
        const secondaryR = Math.max(startR, this.pulseRadius * 0.76);
        this.secondaryPulseMesh.visible = true;
        this.secondaryPulseMesh.scale.set(secondaryR, secondaryR, secondaryR);
        (this.secondaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.min(1.0, this.pulseStrength * 0.72);

        // Tertiary acoustic ring riding right along the growing Event Horizon shadow boundary
        const horizonShockR = Math.max(startR, 2.42 * effectiveScale);
        this.tertiaryPulseMesh.visible = true;
        this.tertiaryPulseMesh.scale.set(horizonShockR, horizonShockR, horizonShockR);
        (this.tertiaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.min(1.0, this.pulseStrength * 0.64);

        // Additional concentric pressure ripple rings
        for (const extra of this.extraPulseRippleMeshes) {
          const ringR = Math.max(startR, this.pulseRadius * extra.ratio);
          extra.mesh.visible = true;
          extra.mesh.scale.set(ringR, ringR, ringR);
          (extra.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
            Math.min(1.0, this.pulseStrength * extra.opacityWeight);
        }

        // 3D Spherical Sonic Boom Mach Shell expanding outward from the small singularity ball
        const gwShellR = THREE.MathUtils.lerp(startR, maxShockRadius * 1.18, ease);
        this.gravitationalWaveShellMesh.visible = true;
        this.gravitationalWaveShellMesh.scale.set(gwShellR, gwShellR, gwShellR);
        (this.gravitationalWaveShellMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.min(1.0, this.pulseStrength * 0.78);

        // Boundary pressure-condensation flash shell hugging the growing event horizon sphere as it inflates
        if (this.pulseProgress < 0.72) {
          const burstT = this.pulseProgress / 0.72;
          const burstScale = (this.isCinematicBootBoom ? 2.45 : 1.45) * effectiveScale * (0.85 + 0.45 * burstT);
          this.horizonFlashMesh.visible = true;
          this.horizonFlashMesh.scale.set(burstScale, burstScale, burstScale);
          (this.horizonFlashMesh.material as THREE.MeshBasicMaterial).opacity =
            Math.pow(1.0 - burstT, 1.4) * (this.isCinematicBootBoom ? 0.62 : 0.34);
        } else {
          this.horizonFlashMesh.visible = false;
        }

        // Ripple and plunge the spacetime well manifold in real-time with the shockwave
        this.needsWellDeform = true;
      }
    } else if (this.isEchoPulseActive) {
      // 4b-echo. Subtle 'Event Horizon Echo' Pulse Effect when the Singularity Seed is formed upon collapse
      const echoStep = Math.min(0.05, Math.max(0.005, rawDelta));
      this.echoPulseProgress += echoStep / this.echoPulseDuration;
      if (this.echoPulseProgress >= 1.0) {
        this.isEchoPulseActive = false;
        this.echoPulseProgress = 1.0;
        this.primaryPulseMesh.visible = false;
        this.secondaryPulseMesh.visible = false;
        this.gravitationalWaveShellMesh.visible = false;
        this.horizonFlashMesh.visible = false;
      } else {
        const tEcho = this.echoPulseProgress;
        const echoEase = 1.0 - Math.pow(1.0 - tEcho, 2.3);
        // Subtle quasinormal harmonic ringdown envelope
        const harmonicMod = 0.8 + 0.2 * Math.cos(tEcho * Math.PI * 3.5);
        const echoStrength = Math.pow(1.0 - tEcho, 1.65) * harmonicMod;
        const seedR = 2.26 * minSeedWorldScale;
        const maxEchoR = Math.max(4.2, 6.4 * this.currentScale);
        const currentEchoR = THREE.MathUtils.lerp(seedR, maxEchoR, echoEase);

        this.primaryPulseMesh.visible = true;
        this.primaryPulseMesh.scale.set(currentEchoR, currentEchoR, currentEchoR);
        (this.primaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
          echoStrength * 0.42;

        const innerEchoR = Math.max(seedR, currentEchoR * 0.68);
        this.secondaryPulseMesh.visible = true;
        this.secondaryPulseMesh.scale.set(innerEchoR, innerEchoR, innerEchoR);
        (this.secondaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
          echoStrength * 0.28;

        const shellEchoR = THREE.MathUtils.lerp(seedR, maxEchoR * 0.92, echoEase);
        this.gravitationalWaveShellMesh.visible = true;
        this.gravitationalWaveShellMesh.scale.set(shellEchoR, shellEchoR, shellEchoR);
        (this.gravitationalWaveShellMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
          echoStrength * 0.32;

        if (tEcho < 0.45) {
          const flashT = tEcho / 0.45;
          const flashR = seedR * (1.2 + flashT * 2.2);
          this.horizonFlashMesh.visible = true;
          this.horizonFlashMesh.scale.set(flashR, flashR, flashR);
          (this.horizonFlashMesh.material as THREE.MeshBasicMaterial).opacity =
            (1.0 - flashT) * 0.18;
        } else {
          this.horizonFlashMesh.visible = false;
        }
      }
    }

    // 4c. Rapid Parameter Adjustment Gravitational Wave Ripples Animation
    if (this.settings.rapidAdjustmentRipples !== false && this.parameterRipples.length > 0) {
      let hasActiveRipples = false;
      const stepDelta = Math.min(0.05, Math.max(0.005, rawDelta)); // advances continuously even during pauses
      for (const rip of this.parameterRipples) {
        if (!rip.active) continue;
        hasActiveRipples = true;
        rip.progress += stepDelta * rip.speed;
        if (rip.progress >= 1.0) {
          rip.active = false;
          rip.ringMesh.visible = false;
          rip.shellMesh.visible = false;
        } else {
          const ease = 1.0 - Math.pow(1.0 - rip.progress, 2.2);
          const currentR = THREE.MathUtils.lerp(rip.startRadius, rip.maxRadius, ease);
          rip.ringMesh.visible = true;
          rip.ringMesh.scale.set(currentR, 1.0, currentR);

          const fade = Math.pow(1.0 - rip.progress, 1.35) * rip.intensity;
          const ringMat = rip.ringMesh.material as THREE.ShaderMaterial;
          ringMat.uniforms.uOpacity.value = fade * 0.88;
          ringMat.uniforms.uPhase.value = rip.progress * 18.0;

          rip.shellMesh.visible = true;
          rip.shellMesh.scale.set(currentR * 0.96, currentR * 0.96, currentR * 0.96);
          const shellMat = rip.shellMesh.material as THREE.ShaderMaterial;
          shellMat.uniforms.uOpacity.value = fade * 0.38;
        }
      }

      if (hasActiveRipples && !this.settings.highPerformanceMode) {
        this.needsWellDeform = true;
      }
    }

    // 4d. Accretion State & Threshold Burst Shockwave Animation
    if (this.isAccretionShockActive && this.settings.accretionShockwaveEnabled !== false) {
      const shockStep = Math.min(0.05, Math.max(0.005, rawDelta));
      this.accretionShockProgress += shockStep / this.accretionShockDuration;
      if (this.accretionShockProgress >= 1.0) {
        this.clearAccretionShockwave();
        this.needsWellDeform = true;
      } else {
        const t = this.accretionShockProgress;
        const blastEase = 1.0 - Math.pow(1.0 - t, 2.5);
        const isStar = isStellarCategory(this.params?.objectCategory);
        const effScale = this.currentScale;
        const startR = isStar ? 1.65 * effScale : 2.26 * effScale;
        const maxR = Math.max(16.0, 26.0 * effScale);
        this.accretionShockRadius = THREE.MathUtils.lerp(startR, maxR, blastEase);
        const fade = Math.pow(1.0 - t, 1.35) * this.accretionShockIntensity;

        this.accretionShockPrimaryMesh.visible = true;
        this.accretionShockPrimaryMesh.scale.set(this.accretionShockRadius, this.accretionShockRadius, this.accretionShockRadius);
        (this.accretionShockPrimaryMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = fade * 0.95;
        (this.accretionShockPrimaryMesh.material as THREE.ShaderMaterial).uniforms.uProgress.value = t;

        const trailR = Math.max(startR, this.accretionShockRadius * 0.82);
        this.accretionShockSecondaryMesh.visible = true;
        this.accretionShockSecondaryMesh.scale.set(trailR, trailR, trailR);
        (this.accretionShockSecondaryMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = fade * 0.60;
        (this.accretionShockSecondaryMesh.material as THREE.ShaderMaterial).uniforms.uProgress.value = t * 1.15;

        const shellR = THREE.MathUtils.lerp(startR, maxR * 1.08, blastEase);
        this.accretionShockShellMesh.visible = true;
        this.accretionShockShellMesh.scale.set(shellR, shellR, shellR);
        (this.accretionShockShellMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = fade * 0.48;

        if (t < 0.35) {
          const flashT = t / 0.35;
          const flashScale = startR * (1.0 + flashT * 0.28);
          this.accretionHorizonFlashMesh.visible = true;
          this.accretionHorizonFlashMesh.scale.set(flashScale, flashScale, flashScale);
          (this.accretionHorizonFlashMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = (1.0 - flashT) * 0.85 * fade;
        } else {
          this.accretionHorizonFlashMesh.visible = false;
        }

        this.needsWellDeform = true;
      }
    }

    if (this.needsWellDeform && this.spacetimeWellMesh?.visible) {
      const wellThrottleMs = this.settings.highPerformanceMode ? 64 : 36;
      if (tickStartMs - this.lastWellDeformMs >= wellThrottleMs || this.expansionProgress >= 0.999) {
        this.lastWellDeformMs = tickStartMs;
        this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
      }
    }

    // 5. Authentic Gravitational Lensing & Twinkle of Background Starfield (O(1) GPU Uniform Update)
    if (this.starfieldInstanced?.visible) {
      this.updateGravitationalLensingOfStarfield();
    }

    // 5b. Distant Background Star Gravitational Microlensing Simulation
    this.updateBackgroundStarMicrolensing(simDelta);

    // 6. Advance Orbiting Star S2 along Relativistic Orbit (only when orbital stars or follow-star camera is active)
    let starX = 0;
    let starY = 0;
    let starZ = 0;
    if (this.params.layers.orbitalStars || this.followStarMode) {
      const orbitSceneRadius = this.params.probeRadiusRs * 1.75 * this.currentScale;
      const angularSpeed = (1.65 * metrics.probeOrbitalBeta) / Math.max(1.5, this.params.probeRadiusRs * 0.45);
      this.starOrbitAngle += simDelta * angularSpeed;

      starX = Math.cos(this.starOrbitAngle) * orbitSceneRadius;
      starZ = -Math.sin(this.starOrbitAngle) * orbitSceneRadius;
      starY = Math.sin(this.starOrbitAngle * 2.0) * 0.22 * this.params.spin;
      this.starS2Mesh.position.set(starX, starY, starZ);

      const starPulse = 1.0 + Math.sin(elapsed * 4.0) * 0.12;
      this.starS2GlowMesh.scale.setScalar(starPulse);

      // 7. Advance Companion S-Stars in Nuclear Cluster
      for (const comp of this.companionStars) {
        comp.phase += simDelta * (0.45 * comp.speed);
        const rComp = comp.semiMajor * 1.75 * this.currentScale;
        const cx = Math.cos(comp.phase) * rComp;
        const cz = Math.sin(comp.phase) * rComp;
        const cy = Math.sin(comp.phase) * Math.sin(comp.inclination) * rComp * 0.45;
        comp.mesh.position.set(cx, cy, cz);
      }
    }

    // 8. Advance Geodesic Photon Pulses (Single-pass decay without infinite looping; pauses when simDelta === 0)
    for (let i = this.activeGeodesicPulses.length - 1; i >= 0; i--) {
      const item = this.activeGeodesicPulses[i];
      if (simDelta > 0) {
        item.progress += simDelta * item.speed;
      }
      if (item.progress >= item.points.length - 1) {
        this.geodesicGroup.remove(item.mesh, item.line);
        item.mesh.geometry.dispose();
        (item.mesh.material as THREE.Material).dispose();
        item.line.geometry.dispose();
        (item.line.material as THREE.Material).dispose();
        this.activeGeodesicPulses.splice(i, 1);
        continue;
      }
      const idx = Math.floor(item.progress);
      const frac = item.progress - idx;
      const p0 = item.points[idx];
      const p1 = item.points[Math.min(item.points.length - 1, idx + 1)];
      item.mesh.position.lerpVectors(p0, p1, frac);
    }

    safePerfMark(KERR_PERF_MARKS.cpuSimEnd);
    safePerfMark(KERR_PERF_MARKS.cpuCameraUniformsStart);

    // 9. Camera Controls, Movie-Grade Helical Boot Fly-In (6s), Post-Boot Sequence (+1.5s Watermark for 2.4s -> +4.45s Singularity Seed -> +6.4s Expand) & Cinematic Tour
    if (this.bootAutoExpandPending) {
      this.bootAutoExpandElapsed += wallDelta;
      // Maintain weightless orbital drift during the post-boot sequence (1.5s wait + 2.4s watermark + 0.55s fade + ~2.0s singularity seed hold)
      const holdT = Math.min(1.0, this.bootAutoExpandElapsed / this.bootAutoExpandDelay);
      const rHold = THREE.MathUtils.lerp(95.0, 91.5, holdT);
      const thetaHold = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(69.0, 69.6, holdT));
      const phiHold = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(104.0, 102.2, holdT));
      this.camera.position.set(
        rHold * Math.sin(thetaHold) * Math.cos(phiHold),
        rHold * Math.cos(thetaHold),
        rHold * Math.sin(thetaHold) * Math.sin(phiHold)
      );
      this.camera.lookAt(this.controls.target);

      // Step 1 (+1.5s after boot): Display the Kerr Relativity Engine watermark
      if (!this.bootWatermarkEmitted && this.bootAutoExpandElapsed >= this.bootWatermarkDelay) {
        this.bootWatermarkEmitted = true;
        this.isWatermarkOverlayVisible = true;
        this.onWatermarkDisplayStart?.();
      }

      // Step 2a (+3.9s after boot, after 2.4s of watermark display): Begin fading out the watermark BEFORE the Singularity Seed flare appears
      if (!this.bootWatermarkFadeEmitted && this.bootAutoExpandElapsed >= this.bootWatermarkFadeOutDelay) {
        this.bootWatermarkFadeEmitted = true;
        this.onSingularitySeedLoaded?.();
      }

      // Step 2b (+4.45s after boot, after watermark has faded out): Materialize the Singularity Seed
      if (!this.singularitySeedLoaded && this.bootAutoExpandElapsed >= this.bootSeedLoadDelay) {
        this.isWatermarkOverlayVisible = false;
        this.singularitySeedLoaded = true;
        this.seedLoadProgress = 0.0;
      }

      // Step 3 (+6.4s after boot): Expand into full Kerr Black Hole
      if (this.bootAutoExpandElapsed >= this.bootAutoExpandDelay) {
        this.bootAutoExpandPending = false;
        this.isWatermarkOverlayVisible = false;
        this.singularitySeedLoaded = true;
        this.seedLoadProgress = 1.0;
        this.onWatermarkPauseComplete?.();
        this.expandFromSingularity(true);
      }
    }

    if (this.bootIntroActive) {
      this.bootIntroElapsed += wallDelta;
      const t = Math.min(1.0, this.bootIntroElapsed / this.bootIntroDuration);
      // Smooth helical spherical trajectory from maxDistance (260, θ=62°, φ=132°) to Singularity Seed stage (95, θ=69°, φ=104°)
      const easeOutQuart = 1.0 - Math.pow(1.0 - t, 3.4);
      const rCur = THREE.MathUtils.lerp(260.0, 95.0, easeOutQuart);
      const thetaCur = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(62.0, 69.0, easeOutQuart));
      const phiCur = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(132.0, 104.0, easeOutQuart));
      this.camera.position.set(
        rCur * Math.sin(thetaCur) * Math.cos(phiCur),
        rCur * Math.cos(thetaCur),
        rCur * Math.sin(thetaCur) * Math.sin(phiCur)
      );
      this.camera.lookAt(this.controls.target);

      if (this.onObserverReadoutChange) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const emitIntervalMs = this.settings?.highPerformanceMode ? 220 : 80;
        if (now - this.lastObserverReadoutEmitMs >= emitIntervalMs || t >= 1.0) {
          this.lastObserverReadoutEmitMs = now;
          this.onObserverReadoutChange(this.getObserverSphericalCoords(), t >= 1.0);
        }
      }

      if (t >= 1.0) {
        this.skipBootIntro();
      }
    } else if (this.cinematicTourActive) {
      // Pre-defined astrophysical Cinematic Tour across Polar -> Equatorial -> 45-Degree Plunge to showcase Kerr geometry
      this.cinematicTourElapsed += wallDelta;
      const stageDuration = 6.0; // 6s per astrophysical angle (18s full cycle)
      const totalCycle = stageDuration * 3.0;
      const cycleTime = this.cinematicTourElapsed % totalCycle;
      const stageIdx = Math.min(2, Math.floor(cycleTime / stageDuration));
      const localT = (cycleTime - stageIdx * stageDuration) / stageDuration;
      // Quintic smoothstep for silk-grade camera transitions between astrophysical angles
      const smooth = localT * localT * localT * (localT * (localT * 6.0 - 15.0) + 10.0);

      if (stageIdx !== this.cinematicTourStageIndex) {
        this.cinematicTourStageIndex = stageIdx;
        const stageMeta: Array<{ id: CinematicTourStageId; label: string }> = [
          { id: 'polar', label: 'Polar Axis' },
          { id: 'equatorial', label: 'Equatorial Plane' },
          { id: 'plunge_45', label: '45° Plunge' },
        ];
        const currentMeta = stageMeta[stageIdx] || stageMeta[0];
        this.onCinematicTourChange?.(true, currentMeta.id, currentMeta.label);
      }

      const distMultiplier = Math.max(0.72, Math.sqrt(this.targetScale));
      const isBinarySys = !isStar && this.params.systemCategory === 'binary';
      const lookX = isBinarySys ? 4.2 * distMultiplier : 0.0;
      const baseTourR = (isBinarySys ? 31.0 : 26.5) * distMultiplier;
      const incDeg = THREE.MathUtils.clamp(this.params.inclinationDeg || 78, 68, 86);

      let rTour = baseTourR;
      let thetaTourDeg = 78.0;
      let phiTourDeg = 90.0;
      const baseFov = this.settings?.cameraFov ?? 46;
      let tourFovOffset = 0.0;

      if (stageIdx === 0) {
        // Stage 0: Polar Ergosphere & Frame-Dragging Axis View (θ ≈ 6° -> 12°, sweeping overhead)
        rTour = THREE.MathUtils.lerp(baseTourR * 1.16, baseTourR * 1.04, smooth);
        thetaTourDeg = THREE.MathUtils.lerp(7.0, 14.0, smooth);
        phiTourDeg = THREE.MathUtils.lerp(20.0, 96.0, localT);
        tourFovOffset = Math.sin(localT * Math.PI) * 1.5;
      } else if (stageIdx === 1) {
        // Stage 1: Equatorial Relativistic Doppler & Einstein Arch Sweep (θ sweeps from 14° down to inclination ~78°–82°)
        rTour = THREE.MathUtils.lerp(baseTourR * 1.04, baseTourR * 0.96, smooth);
        thetaTourDeg = THREE.MathUtils.lerp(14.0, incDeg, smooth);
        phiTourDeg = THREE.MathUtils.lerp(96.0, 184.0, localT);
        tourFovOffset = Math.sin(localT * Math.PI) * 2.0;
      } else {
        // Stage 2: 45-Degree Relativistic Horizon Plunge (tilts to θ = 45° and plunges inward to r ≈ 11.2 * distMultiplier before pulling back)
        const plungeProfile = Math.sin(localT * Math.PI); // peaks at mid-stage for deep ISCO/photon-ring inspection
        rTour = THREE.MathUtils.lerp(baseTourR * 0.96, 11.2 * distMultiplier, Math.pow(plungeProfile, 0.85));
        thetaTourDeg = THREE.MathUtils.lerp(incDeg, 45.0, Math.min(1.0, smooth * 1.35));
        phiTourDeg = THREE.MathUtils.lerp(184.0, 380.0, localT);
        tourFovOffset = plungeProfile * 5.5;
      }

      const thetaRad = THREE.MathUtils.degToRad(thetaTourDeg);
      const phiRad = THREE.MathUtils.degToRad(phiTourDeg);
      _vec3A.set(
        lookX + rTour * Math.sin(thetaRad) * Math.cos(phiRad),
        rTour * Math.cos(thetaRad),
        rTour * Math.sin(thetaRad) * Math.sin(phiRad)
      );
      _vec3B.set(lookX, 0, 0);

      // Smooth initial entry blend over the first 1.2 seconds after clicking Cinematic Tour
      const entryBlend = Math.min(1.0, this.cinematicTourElapsed / 1.2);
      const entrySmooth = entryBlend * entryBlend * (3.0 - 2.0 * entryBlend);
      this.camera.position.lerpVectors(this.cinematicTourStartPos, _vec3A, entrySmooth);
      this.controls.target.lerpVectors(this.cinematicTourStartLook, _vec3B, entrySmooth);
      this.camera.lookAt(this.controls.target);

      this.camera.fov = baseFov + tourFovOffset * entrySmooth;
      this.camera.updateProjectionMatrix();

      if (this.onObserverReadoutChange) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const emitIntervalMs = this.settings?.highPerformanceMode ? 220 : 80;
        if (now - this.lastObserverReadoutEmitMs >= emitIntervalMs) {
          this.lastObserverReadoutEmitMs = now;
          this.onObserverReadoutChange(this.getObserverSphericalCoords(), false);
        }
      }
    } else if (this.followStarMode) {
      _vec3A.set(starX * 1.35, starY + 2.0, starZ * 1.35);
      this.camera.position.lerp(_vec3A, 1 - Math.exp(-5.0 * rawDelta));
      this.controls.target.lerp(this.starS2Mesh.position, 1 - Math.exp(-7.0 * rawDelta));
    } else if (this.cameraTransitionActive) {
      if (this.slowCameraPanIn) {
        // Movie-grade quintic S-curve spherical dolly & orbital pan-in synchronized with singularity expansion
        this.slowPanInElapsed += wallDelta;
        const p = Math.min(1.0, this.slowPanInElapsed / this.slowPanInDuration);
        const quinticSmooth = p * p * p * (p * (p * 6.0 - 15.0) + 10.0);

        const endR = Math.max(28.875, 25.5 * Math.sqrt(this.targetScale));
        const startR = Math.max(endR, this.slowPanStartPos.length());
        const startTheta = Math.acos(
          THREE.MathUtils.clamp(this.slowPanStartPos.y / Math.max(0.001, startR), -1.0, 1.0)
        );
        const startPhi = Math.atan2(this.slowPanStartPos.z, this.slowPanStartPos.x);

        const endTheta = THREE.MathUtils.degToRad(71.0);
        const endPhi = THREE.MathUtils.degToRad(96.0);

        const rNow = THREE.MathUtils.lerp(startR, endR, quinticSmooth);
        const thetaNow = THREE.MathUtils.lerp(startTheta, endTheta, quinticSmooth);
        const phiNow = THREE.MathUtils.lerp(startPhi, endPhi, quinticSmooth);

        this.camera.position.set(
          rNow * Math.sin(thetaNow) * Math.cos(phiNow),
          rNow * Math.cos(thetaNow),
          rNow * Math.sin(thetaNow) * Math.sin(phiNow)
        );
        this.controls.target.lerp(this.targetCamLook, 1 - Math.exp(-6.0 * rawDelta));
        this.camera.lookAt(this.controls.target);

        // Cinematic IMAX relativistic shockwave FOV punch that settles cleanly to settings.cameraFov
        const baseFov = this.settings?.cameraFov ?? 46;
        const shockPunch = Math.exp(-p * 5.2) * Math.sin(p * Math.PI * 3.5) * 6.8;
        const fovBreath = Math.sin(p * Math.PI) * 5.2 * (1.0 - p * 0.35) + shockPunch;
        this.camera.fov = baseFov + fovBreath;
        this.camera.updateProjectionMatrix();

        if (this.onObserverReadoutChange) {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (now - this.lastObserverReadoutEmitMs >= 80 || p >= 1.0) {
            this.lastObserverReadoutEmitMs = now;
            this.onObserverReadoutChange(this.getObserverSphericalCoords(), p >= 1.0);
          }
        }

        if (p >= 1.0) {
          this.camera.position.copy(this.targetCamPos);
          this.camera.fov = baseFov;
          this.camera.updateProjectionMatrix();
          this.cameraTransitionActive = false;
          this.slowCameraPanIn = false;
          if (this.isSingularityCollapsed) {
            this.isSingularityCollapsed = false;
            this.onSingularityStateChange?.(false);
          }
          this.onObserverReadoutChange?.(this.getObserverSphericalCoords(), true);
        }
      } else {
        const factor = 1 - Math.exp(-3.4 * rawDelta);
        this.camera.position.lerp(this.targetCamPos, factor);
        this.controls.target.lerp(this.targetCamLook, factor);
        if (this.onObserverReadoutChange) {
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (now - this.lastObserverReadoutEmitMs >= 80) {
            this.lastObserverReadoutEmitMs = now;
            this.onObserverReadoutChange(this.getObserverSphericalCoords(), false);
          }
        }
        if (this.camera.position.distanceTo(this.targetCamPos) < 0.08) {
          this.camera.position.copy(this.targetCamPos);
          this.cameraTransitionActive = false;
          this.onObserverReadoutChange?.(this.getObserverSphericalCoords(), true);
        }
      }
    } else if (this.settings.autoRotate && !this.isUserInteracting && simDelta > 0) {
      // Smoothly orbit the observer camera around the black hole's Y-axis for a dynamic cinematic perspective
      const angularStep = rawDelta * this.settings.autoRotateSpeed * 0.42;
      _vec3A.subVectors(this.camera.position, this.controls.target);
      const cosA = Math.cos(angularStep);
      const sinA = Math.sin(angularStep);
      const nextX = _vec3A.x * cosA + _vec3A.z * sinA;
      const nextZ = -_vec3A.x * sinA + _vec3A.z * cosA;
      this.camera.position.set(
        this.controls.target.x + nextX,
        this.camera.position.y,
        this.controls.target.z + nextZ
      );
    }

    if (this.controls.enabled) {
      this.controls.update();
    }

    // 10.Relativistic Camera Angular Velocity & Motion Blur (measured before transient screen shake)
    const dot = Math.min(1.0, Math.max(-1.0, this.camera.quaternion.dot(this.prevCamQuat)));
    const angleDiff = 2.0 * Math.acos(Math.abs(dot));
    const camAngularSpeed = rawDelta > 0.0001 ? angleDiff / rawDelta : 0.0;

    // Detect angular direction in screen space without per-frame quaternion allocation
    _quat.copy(this.prevCamQuat).invert();
    _quatA.copy(this.camera.quaternion).multiply(_quat);
    const velX = _quatA.y * 2.0;
    const velY = _quatA.x * 2.0;
    const targetStrength = Math.min(1.0, camAngularSpeed * 0.45);
    const blendRate = 1.0 - Math.exp(-12.0 * rawDelta);
    this.camMotionBlurStrength += (targetStrength - this.camMotionBlurStrength) * blendRate;
    this.camMotionVelocity.set(velX, velY);
    this.prevCamQuat.copy(this.camera.quaternion);

    // 11. Sonic Boom Screen Shake (Non-destructive transient camera recoil & seismic aftershock; pauses when simDelta === 0)
    const camDist = this.camera.position.length();
    let appliedShake = false;
    if (this.shakeIntensity > 0.001 && simDelta > 0) {
      this.shakeElapsed += simDelta;
      if (this.shakeElapsed >= this.shakeDuration) {
        this.shakeIntensity = 0.0;
      } else {
        const t = this.shakeElapsed;
        const normT = t / this.shakeDuration;
        // Double-peaked N-wave sonic boom envelope: initial front blast + secondary tail thump + seismic decay
        const primaryBlast = Math.exp(-t * 7.5);
        const tailThump = 0.72 * Math.exp(-Math.pow((t - 0.19) / 0.075, 2.0));
        const seismicRumble = 0.38 * Math.pow(1.0 - normT, 2.2) * Math.sin(t * 14.0);
        const envelope = primaryBlast + tailThump + Math.abs(seismicRumble);

        if (this.settings.screenShakeEnabled) {
          _savedCamPos.copy(this.camera.position);
          _savedCamTarget.copy(this.controls.target);

          _camRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
          _camUp.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();
          _vec3A.subVectors(this.controls.target, this.camera.position).normalize();

          const scaleAmp = Math.max(0.18, camDist * 0.016) * envelope;
          const shakeX =
            (Math.sin(t * 145.0) * 0.55 + Math.cos(t * 89.0) * 0.35 + Math.sin(t * 37.0) * 0.25) *
            scaleAmp;
          const shakeY =
            (Math.cos(t * 162.0) * 0.55 + Math.sin(t * 103.0) * 0.35 + Math.cos(t * 41.0) * 0.25) *
            scaleAmp;
          const shakeZ = Math.sin(t * 118.0) * scaleAmp * 0.45;

          _shakeOffset
            .set(0, 0, 0)
            .addScaledVector(_camRight, shakeX)
            .addScaledVector(_camUp, shakeY)
            .addScaledVector(_vec3A, shakeZ);

          this.camera.position.add(_shakeOffset);
          this.controls.target.addScaledVector(_shakeOffset, 0.85);
          this.camera.lookAt(this.controls.target);
          this.camera.updateMatrixWorld();
          appliedShake = true;
        }
      }
    }

    // 12. Update Gravitational Lensing billboard to face camera and align with black hole
    if (this.gravitationalLensMesh && this.gravitationalLensMat) {
      this.gravitationalLensMesh.quaternion.copy(this.camera.quaternion);
      this.gravitationalLensMesh.scale.setScalar(effectiveScale);
      this.gravitationalLensMat.uniforms.uCameraPos.value.copy(this.camera.position);
      this.gravitationalLensMat.uniforms.uBlackHolePos.value.copy(this.blackHoleGroup.position);
      this.gravitationalLensMat.uniforms.uScale.value = effectiveScale;
      this.gravitationalLensMat.uniforms.uTime.value = elapsed;
      this.gravitationalLensMat.uniforms.u_isOrbiting.value = this.isUserInteracting
        ? 1.0
        : Math.min(1.0, this.camMotionBlurStrength * 2.2);
      this.gravitationalLensMat.uniforms.uPulseRadius.value = this.pulseRadius / Math.max(0.05, effectiveScale);
      this.gravitationalLensMat.uniforms.uPulseStrength.value = this.pulseStrength;
      this.gravitationalLensMat.uniforms.uExpansionProgress.value = isStar ? 1.0 : this.expansionProgress;
      this.gravitationalLensMat.uniforms.uIsBinarySystem.value = isBinary ? 1.0 : 0.0;
      this.gravitationalLensMat.uniforms.uCompanionStarPos.value.copy(this.companionStarWorldPos);
      this.gravitationalLensMat.uniforms.uCompanionStarRadius.value =
        this.companionStarBaseRadius * effectiveScale;
    }

    // 12b. Update Camera-Space Optical Lens Flare & Viewing-Angle Diffraction Artifacts
    // Suppress camera-space lens flare during boot, while watermark is active, or when collapsed to a Singularity Seed
    if (this.cameraLensFlareMesh && this.cameraLensFlareMat) {
      const flareIntensity = this.settings.lensFlareIntensity ?? 1.0;
      const hasEmission = isStar || this.params.layers.accretionDisk || this.params.gravitationalLensing;
      const isSeedOrWatermarkStage =
        !isStar &&
        (this.bootIntroActive ||
          this.bootAutoExpandPending ||
          this.isWatermarkOverlayVisible ||
          !this.singularitySeedLoaded ||
          this.isSingularityCollapsed ||
          this.expansionProgress < 0.08);
      this.cameraLensFlareMesh.visible =
        !isSoftwareGl &&
        !this.settings.highPerformanceMode &&
        flareIntensity > 0.001 &&
        hasEmission &&
        !isSeedOrWatermarkStage;

      if (this.cameraLensFlareMesh.visible) {
        const u = this.cameraLensFlareMat.uniforms;
        u.uFlareIntensity.value = flareIntensity;
        u.uTime.value = elapsed;

        // Camera viewing direction & angles relative to the central object
        _vec3A.subVectors(this.camera.position, this.blackHoleGroup.position);
        const distToObj = Math.max(1.0, _vec3A.length());
        _vec3B.copy(_vec3A).divideScalar(distToObj); // normalized camera direction from object

        const absCosTheta = Math.abs(_vec3B.y);
        // Grazing angle factor: peaks at 1.0 when viewing along the equatorial plane, 0.0 at the poles
        const edgeOnFactor = THREE.MathUtils.clamp(Math.sqrt(Math.max(0.0, 1.0 - absCosTheta * absCosTheta)), 0.0, 1.0);
        const camAzimuth = Math.atan2(_vec3B.x, _vec3B.z);

        // Project primary object center into camera NDC space
        _vec3C.copy(this.blackHoleGroup.position).project(this.camera);
        const inFront = _vec3C.z < 1.0 && _vec3C.z > -1.0;
        const offScreenFade = THREE.MathUtils.clamp(
          1.35 - Math.max(Math.abs(_vec3C.x), Math.abs(_vec3C.y)),
          0.0,
          1.0
        );
        const expansionGain = isStar ? 1.0 : THREE.MathUtils.smoothstep(this.expansionProgress, 0.08, 1.0);
        const primaryVis = inFront ? offScreenFade * expansionGain : 0.0;
        u.uSourceNdc.value.set(_vec3C.x, _vec3C.y, primaryVis);

        // Compute angle-dependent luminous hotspot in 3D world space and project to camera NDC:
        // - For Black Holes: the approaching prograde limb of the photon ring / inner ISCO where Doppler beaming peaks
        // - For Stars: the active magnetic polar cap closest to the observer
        let beamAlignment = 0.0;
        if (isStar) {
          const poleDot = _vec3B.dot(this.currentMagneticAxis);
          beamAlignment = Math.pow(Math.min(1.0, Math.abs(poleDot)), 1.6);
          const poleSign = poleDot >= 0 ? 1.0 : -1.0;
          _vec3D
            .copy(this.currentMagneticAxis)
            .multiplyScalar(poleSign * 1.55 * this.currentScale)
            .add(this.blackHoleGroup.position);
          _vec3D.project(this.camera);
          const hotWeight = primaryVis * (0.65 + 0.85 * beamAlignment) * (0.7 + 0.25 * this.params.accretionRate);
          u.uHotspotNdc.value.set(_vec3D.x, _vec3D.y, hotWeight);

          if (this.neutronStarMat?.uniforms?.uBaseColor?.value) {
            u.uPrimaryTint.value.copy(this.neutronStarMat.uniforms.uBaseColor.value).lerp(_color.setHex(0xffffff), 0.35);
          } else {
            u.uPrimaryTint.value.setHex(0x38bdf8);
          }
          u.uSecondaryTint.value.setHex(this.params.objectCategory === 'luminous_star' ? 0xfef08a : 0x818cf8);
        } else {
          // Prograde approaching side of the equatorial accretion disk (perpendicular to camera ray in XZ plane)
          _vec3D.set(-_vec3B.z, 0.0, _vec3B.x);
          if (_vec3D.lengthSq() > 1e-4) {
            _vec3D.normalize();
          } else {
            _vec3D.set(1.0, 0.0, 0.0);
          }
          const dopplerRingR = (2.35 - 0.45 * this.params.spin) * effectiveScale;
          _vec3E
            .copy(this.blackHoleGroup.position)
            .addScaledVector(_vec3D, dopplerRingR);
          _vec3E.project(this.camera);

          const dopplerGain =
            (0.45 + 0.55 * this.params.dopplerStrength) *
            (0.45 + 0.45 * this.params.accretionRate) *
            (0.55 + 0.65 * edgeOnFactor);
          // Grazing angle flare spike when looking nearly edge-on across the luminous accretion sheet
          beamAlignment = Math.pow(edgeOnFactor, 3.2) * (this.params.layers.accretionDisk ? 0.85 : 0.25);
          u.uHotspotNdc.value.set(_vec3E.x, _vec3E.y, primaryVis * dopplerGain);

          if (this.params.spectralMode === 'xray') {
            u.uPrimaryTint.value.setHex(0x38bdf8);
            u.uSecondaryTint.value.setHex(0xe0f2fe);
          } else if (this.params.spectralMode === 'doppler') {
            u.uPrimaryTint.value.setHex(0x60a5fa);
            u.uSecondaryTint.value.setHex(0xf97316);
          } else {
            u.uPrimaryTint.value.setHex(0xfbbf24);
            u.uSecondaryTint.value.setHex(0x7dd3fc);
          }
        }

        // Optional Binary Companion Donor Star Flare
        if (isBinary && this.expansionProgress > 0.05) {
          _vec3D.copy(this.companionStarWorldPos).project(this.camera);
          const compInFront = _vec3D.z < 1.0 && _vec3D.z > -1.0;
          const compVis = compInFront
            ? THREE.MathUtils.clamp(1.25 - Math.max(Math.abs(_vec3D.x), Math.abs(_vec3D.y)), 0.0, 1.0)
            : 0.0;
          u.uSecondaryNdc.value.set(_vec3D.x, _vec3D.y, compVis);
        } else {
          u.uSecondaryNdc.value.set(0, 0, 0);
        }

        const distAtten = THREE.MathUtils.clamp(24.0 / Math.max(8.0, distToObj), 0.45, 1.65);
        u.uViewAngleParams.value.set(edgeOnFactor, camAzimuth, beamAlignment, distAtten);
      }
    }

    // 13. Relativistic Audio Modulation: Camera Proximity & Gravitational Time Dilation
    // Throttled in High-Performance Mode so WebAudio parameter scheduling does not contend with the main thread every frame
    if (
      !this.settings.highPerformanceMode ||
      tickStartMs - this.lastAudioProximityEmitMs >= 120
    ) {
      this.lastAudioProximityEmitMs = tickStartMs;
      const rs = 1.75 * this.currentScale;
      const distanceRs = Math.max(1.05, camDist / rs);
      const timeDilation = Math.sqrt(Math.max(0.01, 1.0 - 1.0 / distanceRs));
      relativisticAudio.updateCameraProximity(distanceRs, timeDilation);
    }

    // 14. Long-Exposure Time-Lapse Emission Intensity Accumulation & Post-Processing Render
    if (this.settings.timeLapseEnabled) {
      if (simDelta > 0) {
        this.timeLapseExposureSeconds += simDelta;
      }
      const exposureProgress = 1.0 - Math.exp(-this.timeLapseExposureSeconds * 0.25);
      const accumulatedBloom = this.settings.bloomIntensity + exposureProgress * 0.95;
      if (this.accretionDiskMat) {
        this.accretionDiskMat.uniforms.uBloomIntensity.value = accumulatedBloom;
      }
      if (this.gravitationalLensMat) {
        this.gravitationalLensMat.uniforms.uBloomIntensity.value = accumulatedBloom;
      }
      if (this.renderer) {
        this.renderer.toneMappingExposure =
          1.03 + this.settings.bloomIntensity * 0.12 + exposureProgress * 0.22;
      }
    } else if (this.timeLapseInitialized || this.timeLapseExposureSeconds > 0) {
      this.timeLapseInitialized = false;
      this.timeLapseExposureSeconds = 0.0;
      if (this.accretionDiskMat) {
        this.accretionDiskMat.uniforms.uBloomIntensity.value = this.settings.bloomIntensity;
      }
      if (this.gravitationalLensMat) {
        this.gravitationalLensMat.uniforms.uBloomIntensity.value = this.settings.bloomIntensity;
      }
      if (this.renderer) {
        this.renderer.toneMappingExposure = 1.03 + this.settings.bloomIntensity * 0.12;
      }
    }

    safePerfMark(KERR_PERF_MARKS.cpuCameraUniformsEnd);

    if (this.renderer) {
      this.renderer.info.reset();
      const gl = this.isWebGL2Context
        ? (this.renderer.getContext() as WebGL2RenderingContext | null)
        : null;
      this.pollGpuTimerQuery(gl);
      const startedGpuQuery = this.beginGpuTimerQuery(gl);

      const useMotionBlur =
        !isSoftwareGl &&
        !this.settings.highPerformanceMode &&
        !this.isUserInteracting &&
        this.settings.motionBlurEnabled &&
        this.camMotionBlurStrength > 0.035;
      const useTimeLapse = Boolean(this.settings.timeLapseEnabled);

      if (
        (useMotionBlur || useTimeLapse) &&
        this.motionBlurRenderTarget &&
        this.postMaterial &&
        this.timeLapseTargetA &&
        this.timeLapseTargetB
      ) {
        const targetRtW = Math.max(1, this.domElement.width || 1);
        const targetRtH = Math.max(1, this.domElement.height || 1);
        if (
          this.motionBlurRenderTarget.width !== targetRtW ||
          this.motionBlurRenderTarget.height !== targetRtH
        ) {
          this.motionBlurRenderTarget.setSize(targetRtW, targetRtH);
          if (useTimeLapse) {
            this.timeLapseTargetA.setSize(targetRtW, targetRtH);
            this.timeLapseTargetB.setSize(targetRtW, targetRtH);
          }
          this.postMaterial.uniforms.uResolution.value.set(targetRtW, targetRtH);
        }
        this.postMaterial.uniforms.uStrength.value = useMotionBlur
          ? this.camMotionBlurStrength
          : 0.0;
        this.postMaterial.uniforms.uVelocity.value.copy(this.camMotionVelocity);

        safePerfMark(KERR_PERF_MARKS.gpuScenePassStart);
        this.renderer.setRenderTarget(this.motionBlurRenderTarget);
        this.renderer.render(this.scene, this.camera);
        safePerfMark(KERR_PERF_MARKS.gpuScenePassEnd);

        safePerfMark(KERR_PERF_MARKS.gpuPostPassStart);
        if (useTimeLapse) {
          const readTarget = this.timeLapseReadFirst
            ? this.timeLapseTargetA
            : this.timeLapseTargetB;
          const writeTarget = this.timeLapseReadFirst
            ? this.timeLapseTargetB
            : this.timeLapseTargetA;

          const exposureProgress = 1.0 - Math.exp(-this.timeLapseExposureSeconds * 0.25);
          // Slightly relax persistence during fast camera slews so trails re-stabilize cleanly
          const slewDamp = Math.max(0.45, 0.962 - this.camMotionBlurStrength * 1.8);
          this.postMaterial.uniforms.tAccum.value = readTarget.texture;
          this.postMaterial.uniforms.uTimeLapseMix.value = this.timeLapseInitialized
            ? slewDamp
            : 0.0;
          this.postMaterial.uniforms.uExposureBoost.value = exposureProgress;

          // Render accumulated result into writeTarget
          this.renderer.setRenderTarget(writeTarget);
          this.renderer.render(this.postScene, this.postCamera);

          // Output the accumulated frame to screen
          this.renderer.setRenderTarget(null);
          this.renderer.render(this.postScene, this.postCamera);

          this.timeLapseReadFirst = !this.timeLapseReadFirst;
          this.timeLapseInitialized = true;
          this.lastRenderPasses = 3;
        } else {
          this.postMaterial.uniforms.uTimeLapseMix.value = 0.0;
          this.postMaterial.uniforms.uExposureBoost.value = 0.0;
          this.renderer.setRenderTarget(null);
          this.renderer.render(this.postScene, this.postCamera);
          this.lastRenderPasses = 2;
        }
        safePerfMark(KERR_PERF_MARKS.gpuPostPassEnd);
      } else {
        safePerfMark(KERR_PERF_MARKS.gpuScenePassStart);
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
        safePerfMark(KERR_PERF_MARKS.gpuScenePassEnd);
        safePerfMark(KERR_PERF_MARKS.gpuPostPassStart);
        safePerfMark(KERR_PERF_MARKS.gpuPostPassEnd);
        this.lastRenderPasses = 1;
      }

      if (startedGpuQuery) {
        this.endGpuTimerQuery(gl);
      }
    } else if (this.fallbackCtx2D) {
      safePerfMark(KERR_PERF_MARKS.gpuScenePassStart);
      this.renderFallback2D(elapsed, effectiveScale);
      safePerfMark(KERR_PERF_MARKS.gpuScenePassEnd);
      safePerfMark(KERR_PERF_MARKS.gpuPostPassStart);
      safePerfMark(KERR_PERF_MARKS.gpuPostPassEnd);
      this.lastRenderPasses = 1;
    }

    // Restore unshaken camera state so OrbitControls never drifts
    if (appliedShake) {
      this.camera.position.copy(_savedCamPos);
      this.controls.target.copy(_savedCamTarget);
      this.camera.lookAt(this.controls.target);
      this.camera.updateMatrixWorld();
    }

    safePerfMark(KERR_PERF_MARKS.rafEnd);

    const cpuSimPhysicsMs = safePerfMeasureMs(
      KERR_PERF_MEASURES.cpuSimPhysics,
      KERR_PERF_MARKS.cpuSimStart,
      KERR_PERF_MARKS.cpuSimEnd
    );
    const cpuCameraUniformsMs = safePerfMeasureMs(
      KERR_PERF_MEASURES.cpuCameraUniforms,
      KERR_PERF_MARKS.cpuCameraUniformsStart,
      KERR_PERF_MARKS.cpuCameraUniformsEnd
    );
    const gpuScenePassMs = safePerfMeasureMs(
      KERR_PERF_MEASURES.gpuScenePass,
      KERR_PERF_MARKS.gpuScenePassStart,
      KERR_PERF_MARKS.gpuScenePassEnd
    );
    const gpuPostPassMs = safePerfMeasureMs(
      KERR_PERF_MEASURES.gpuPostPass,
      KERR_PERF_MARKS.gpuPostPassStart,
      KERR_PERF_MARKS.gpuPostPassEnd
    );
    const rafTotalMs = safePerfMeasureMs(
      KERR_PERF_MEASURES.rafTotal,
      KERR_PERF_MARKS.rafStart,
      KERR_PERF_MARKS.rafEnd
    );
    clearKerrPerfMarksAndMeasures();

    const tickEndMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const frameCpuMs = Math.max(1.0, rafTotalMs > 0 ? rafTotalMs : tickEndMs - tickStartMs);
    const measuredFrameMs =
      interFrameMs > 0 && interFrameMs < 250
        ? Math.max(4.0, Math.min(120.0, Math.max(interFrameMs, frameCpuMs)))
        : Math.max(16.67, Math.min(120.0, frameCpuMs));

    // Thermal Throttling System:
    // Samples GPU frame time metrics and performance.now() timestamps via an asymmetric
    // passive-cooling RC thermal model, reducing raymarching ray count (u_stepCount)
    // when sustained bottlenecks indicate rising hardware temperature/load.
    const maxStepsForTier =
      this.activeShaderQualityTier === 'Approximated Null-Geodesic' ? 2 : 5;
    const prevThermalLevel = this.thermalState.level;
    this.thermalState = stepThermalThrottlingState(this.thermalState, {
      nowMs: tickEndMs,
      interFrameMs: measuredFrameMs,
      gpuScenePassMs,
      gpuTimerQueryMs: this.lastGpuTimerQueryMs,
      rafTotalMs: frameCpuMs,
      maxStepCount: maxStepsForTier,
    });
    const effectiveRayStepCount =
      this.thermalStepOverride !== null
        ? Math.min(maxStepsForTier, this.thermalStepOverride)
        : this.thermalState.uStepCount;
    if (this.gravitationalLensMat) {
      this.gravitationalLensMat.uniforms.u_stepCount.value = effectiveRayStepCount;
    }
    if (prevThermalLevel !== this.thermalState.level && this.perfConsoleLoggingEnabled) {
      console.info(
        `[Kerr Thermal Throttling] ${prevThermalLevel} -> ${this.thermalState.level} | ` +
          `u_stepCount: ${effectiveRayStepCount}/${maxStepsForTier} rays | ` +
          `Est. Temp: ${this.thermalState.estimatedTempC.toFixed(1)}°C (Load ${this.thermalState.thermalLoadPct.toFixed(
            1
          )}%, Sustained ${this.thermalState.sustainedBottleneckMs}ms)`
      );
    }

    const passSnapshot = classifyFrameBottleneck({
      interFrameMs: Number(measuredFrameMs.toFixed(2)),
      rafTotalMs: Number((rafTotalMs > 0 ? rafTotalMs : tickEndMs - tickStartMs).toFixed(2)),
      cpuSimPhysicsMs: Number(cpuSimPhysicsMs.toFixed(2)),
      cpuCameraUniformsMs: Number(cpuCameraUniformsMs.toFixed(2)),
      gpuScenePassMs: Number(gpuScenePassMs.toFixed(2)),
      gpuPostPassMs: Number(gpuPostPassMs.toFixed(2)),
      gpuTimerQueryMs:
        this.lastGpuTimerQueryMs !== null ? Number(this.lastGpuTimerQueryMs.toFixed(2)) : null,
      renderPasses: this.lastRenderPasses,
      isOrbiting: this.isUserInteracting,
      pixelRatio: this.lastAppliedPixelRatio || this.basePixelRatioCap || 1.0,
      shaderQualityTier: this.activeShaderQualityTier,
      uStepCount: effectiveRayStepCount,
      thermalLevel: this.thermalState.level,
      estimatedTempC: this.thermalState.estimatedTempC,
    });
    this.latestPassTiming = passSnapshot;
    this.passTimingHistory.push(passSnapshot);
    if (this.passTimingHistory.length > 60) {
      this.passTimingHistory.shift();
    }

    // Dynamic Quality Tier Evaluator:
    // Uses rolling performance telemetry averages to swap between 'Full Geodesic' and
    // 'Approximated Null-Geodesic' fragment shader snippets with a 2.5s hysteresis cooldown.
    if (this.passTimingHistory.length >= 15) {
      const avgPassSnapshot = this.getAveragedPassTimingsSnapshot();
      if (avgPassSnapshot) {
        const tierEval = evaluateDynamicShaderQualityTier(
          this.activeShaderQualityTier,
          avgPassSnapshot,
          tickEndMs - this.lastShaderTierSwapMs,
          this.shaderQualityMode,
          SHADER_QUALITY_HYSTERESIS_MS
        );
        if (tierEval.swapped) {
          this.applyShaderQualityTier(tierEval.nextTier, tierEval.reason);
        }
      }
    }

    if (
      this.perfConsoleLoggingEnabled &&
      this.passTimingHistory.length >= 30 &&
      tickEndMs - this.lastPerfConsoleLogMs >= 2500
    ) {
      this.lastPerfConsoleLogMs = tickEndMs;
      this.logShaderPassTelemetryToConsole(false);
    }

    this.currentFrameTimeMs = measuredFrameMs;
    this.frameTimeSamples.push(measuredFrameMs);
    if (this.frameTimeSamples.length > 60) {
      this.frameTimeSamples.shift();
    }

    // Rolling 30-frame dynamic resolution scaler:
    // Step down internal pixel ratio by 0.15 (min 0.75) when rolling 30-frame avg FPS < 48,
    // and recover upward toward basePixelRatioCap once rolling FPS exceeds 55 FPS.
    if (interFrameMs > 0 && interFrameMs < 250) {
      this.rolling30FrameTimesMs.push(measuredFrameMs);
      if (this.rolling30FrameTimesMs.length > DYNAMIC_RES_ROLLING_WINDOW) {
        this.rolling30FrameTimesMs.shift();
      }
      this.framesSinceResolutionCheck++;

      if (
        this.rolling30FrameTimesMs.length >= DYNAMIC_RES_ROLLING_WINDOW &&
        this.framesSinceResolutionCheck >= DYNAMIC_RES_ROLLING_WINDOW &&
        this.renderer &&
        !this.settings.lowResolutionRender &&
        !isSoftwareGl
      ) {
        this.framesSinceResolutionCheck = 0;
        const avgFps = computeRollingAverageFps(this.rolling30FrameTimesMs);
        const currentDpr = this.lastAppliedPixelRatio || this.basePixelRatioCap || 1.0;
        const nextDpr = stepDynamicResolutionScale(
          currentDpr,
          avgFps,
          this.basePixelRatioCap || 1.0,
          DYNAMIC_RES_MIN_DPR,
          DYNAMIC_RES_STEP_DPR
        );
        if (Math.abs(nextDpr - currentDpr) >= 0.01) {
          this.dynamicPixelRatio = nextDpr;
          const width = Math.max(1, this.container.clientWidth || window.innerWidth);
          const height = Math.max(1, this.container.clientHeight || window.innerHeight);
          this.applyDynamicPixelRatio(nextDpr, width, height);
        }
      }
    }

    if (!this.renderer) {
      this.frameId = window.setTimeout(this.tick, 16);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private renderFallback2D(elapsed: number, effectiveScale: number) {
    const ctx = this.fallbackCtx2D;
    if (!ctx) return;
    const width = this.domElement.width || window.innerWidth;
    const height = this.domElement.height || window.innerHeight;

    ctx.fillStyle = '#03050a';
    ctx.fillRect(0, 0, width, height);

    this.camera.updateMatrixWorld();

    // Project 3D origin into 2D screen coordinates
    _vec3A.copy(this.blackHoleGroup.position).project(this.camera);
    const bhX = (_vec3A.x * 0.5 + 0.5) * width;
    const bhY = (-_vec3A.y * 0.5 + 0.5) * height;
    const camDist = Math.max(4.5, this.camera.position.distanceTo(this.blackHoleGroup.position));
    const pxPerUnit =
      (height * 0.5) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) / camDist;
    const isStar = isStellarCategory(this.params.objectCategory);
    const horizonPx = Math.max(8, (isStar ? 1.65 : 2.26) * effectiveScale * pxPerUnit);

    const projectWorldToScreen = (wx: number, wy: number, wz: number) => {
      _vec3C.set(wx, wy, wz).project(this.camera);
      return {
        x: (_vec3C.x * 0.5 + 0.5) * width,
        y: (-_vec3C.y * 0.5 + 0.5) * height,
        z: _vec3C.z,
      };
    };

    // 1. 3D Spacetime Curvature Gravity Well Grid (when spacetimeGrid layer is enabled)
    if (this.params.layers.spacetimeGrid) {
      const wellBaseY = -Math.max(6.8, 4.15 * this.currentScale) - this.currentExploded * 3.6;
      const depthMult = this.params.wellDepthMultiplier || 2.2;
      const wellDepth = (14.0 + (this.params.massSolar / 100) * 26.0) * depthMult * 0.55;
      const rs = Math.max(1.8, (2.2 + (this.params.massSolar / 100) * 1.8) * 0.65);

      const computeWellY = (r: number, theta: number) => {
        const d = -wellDepth / Math.pow((r * r) / (rs * rs) + (isStar ? 0.45 : 0.16), 0.54);
        const drag = this.params.spin * 0.45 * Math.sin(theta * 2.0 + r * 0.25) * Math.exp(-r * 0.08);
        return wellBaseY + d + drag;
      };

      // Concentric relativistic radial rings with warm curvature heat gradient matching 3D WebGL manifold
      const ringRadii = [2.6, 4.2, 6.5, 9.5, 13.5, 18.5, 25.0, 33.0];
      ctx.lineWidth = 1.05;
      for (let idx = 0; idx < ringRadii.length; idx++) {
        const r = ringRadii[idx];
        const heat = 1.0 - idx / ringRadii.length;
        ctx.strokeStyle = isStar
          ? `rgba(56, 189, 248, ${(0.14 + heat * 0.22).toFixed(2)})`
          : `rgba(${Math.round(185 + heat * 70)}, ${Math.round(55 + heat * 95)}, ${Math.round(25 + heat * 20)}, ${(0.18 + heat * 0.24).toFixed(2)})`;
        ctx.beginPath();
        let started = false;
        const segs = 36;
        for (let s = 0; s <= segs; s++) {
          const th = (s / segs) * Math.PI * 2;
          const wx = Math.cos(th) * r;
          const wz = Math.sin(th) * r;
          const wy = computeWellY(r, th);
          const pt = projectWorldToScreen(wx, wy, wz);
          if (pt.z < 1.0) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        ctx.stroke();
      }

      // Frame-dragged azimuthal spokes (batched into a single stroke call for 60fps performance)
      ctx.strokeStyle = isStar ? 'rgba(56, 189, 248, 0.20)' : 'rgba(234, 88, 12, 0.24)';
      ctx.beginPath();
      const spokeCount = 16;
      for (let k = 0; k < spokeCount; k++) {
        const baseTh = (k / spokeCount) * Math.PI * 2;
        let started = false;
        for (let r = 2.4; r <= 33.0; r += 2.6) {
          const twist = (this.params.spin * 1.45) / Math.max(1.2, r * 0.35);
          const th = baseTh + twist;
          const wx = Math.cos(th) * r;
          const wz = Math.sin(th) * r;
          const wy = computeWellY(r, th);
          const pt = projectWorldToScreen(wx, wy, wz);
          if (pt.z < 1.0) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
      }
      ctx.stroke();
    }

    // 2. Deep Space Starfield with Real-Time Einstein Ring Gravitational Lensing Deflection (Fast fillRect batching)
    if (this.params.backgroundTheme !== 'pure_black') {
      const einsteinR = horizonPx * (isStar ? 0.85 : 1.55);
      const einsteinRSq = einsteinR * einsteinR;
      const starColors = [
        'rgba(226, 232, 240, 0.78)',
        'rgba(147, 197, 253, 0.75)',
        'rgba(254, 240, 138, 0.72)',
        'rgba(253, 186, 116, 0.72)',
      ];

      for (let c = 0; c < starColors.length; c++) {
        ctx.fillStyle = starColors[c];
        for (let i = c; i < 220; i += starColors.length) {
          const rawX = ((Math.sin(i * 127.1 + 1.3) * 43758.5453) % 1 + 1) % 1;
          const rawY = ((Math.cos(i * 311.7 + 2.9) * 23421.6312) % 1 + 1) % 1;
          let sx = rawX * width;
          let sy = rawY * height;

          if (this.params.gravitationalLensing) {
            const dx = sx - bhX;
            const dy = sy - bhY;
            const distSq = dx * dx + dy * dy;
            if (distSq > 4 && distSq < einsteinRSq * 16) {
              const dist = Math.sqrt(distSq);
              const deflectedDist = 0.5 * (dist + Math.sqrt(distSq + 4.0 * einsteinRSq));
              const scaleDeflect = deflectedDist / Math.max(1.0, dist);
              sx = bhX + dx * scaleDeflect;
              sy = bhY + dy * scaleDeflect;
            }
          }

          const sz = i % 11 === 0 ? 2.2 : i % 4 === 0 ? 1.5 : 1.1;
          ctx.fillRect(sx, sy, sz, sz);
        }
      }
    }

    // 3. Stellar Remnants & Luminous Stars (Neutron Star / Pulsar / Magnetar / Luminous Star)
    if (isStar) {
      const activePreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === this.params.presetId);
      const isLuminous = this.params.objectCategory === 'luminous_star';
      const surfHex =
        activePreset?.surfaceHexColor ?? (isLuminous ? 0x3b82f6 : 0x0ea5e9);
      const coreHex = activePreset?.coreBeamHexColor ?? 0xf0f9ff;
      const sheathHex = activePreset?.sheathBeamHexColor ?? 0x38bdf8;

      const hexToRgb = (hex: number) => ({
        r: (hex >> 16) & 255,
        g: (hex >> 8) & 255,
        b: hex & 255,
      });
      const surfRgb = hexToRgb(surfHex);
      const coreRgb = hexToRgb(coreHex);
      const sheathRgb = hexToRgb(sheathHex);

      // 3a. 3D Rotating Magnetic Dipole Field Lines (when magneticField is enabled)
      if (this.params.layers.magneticField ?? true) {
        const upAxis = this.currentMagneticAxis.clone().normalize();
        const refVec = Math.abs(upAxis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const rightAxis = new THREE.Vector3().crossVectors(upAxis, refVec).normalize();
        const fwdAxis = new THREE.Vector3().crossVectors(rightAxis, upAxis).normalize();

        ctx.strokeStyle = `rgba(${sheathRgb.r}, ${sheathRgb.g}, ${sheathRgb.b}, 0.36)`;
        ctx.lineWidth = 1.25;
        const loopCount = 8;
        for (let l = 0; l < loopCount; l++) {
          const azim = (l / loopCount) * Math.PI + this.pulsarRotationAngle * 0.25;
          const cosA = Math.cos(azim);
          const sinA = Math.sin(azim);
          ctx.beginPath();
          let started = false;
          const segs = 48;
          for (let s = 0; s <= segs; s++) {
            const t = (s / segs) * Math.PI * 2;
            const ex = Math.cos(t) * 4.2 * effectiveScale;
            const ey = Math.sin(t) * 2.6 * effectiveScale;
            const radialDirX = rightAxis.x * cosA + fwdAxis.x * sinA;
            const radialDirY = rightAxis.y * cosA + fwdAxis.y * sinA;
            const radialDirZ = rightAxis.z * cosA + fwdAxis.z * sinA;
            const wx = radialDirX * ex + upAxis.x * ey;
            const wy = radialDirY * ex + upAxis.y * ey;
            const wz = radialDirZ * ex + upAxis.z * ey;
            const pt = projectWorldToScreen(wx, wy, wz);
            if (pt.z < 1.0) {
              if (!started) {
                ctx.moveTo(pt.x, pt.y);
                started = true;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            }
          }
          ctx.stroke();
        }
      }

      // Helper to draw a volumetric Pulsar Lighthouse Synchrotron Cone from a magnetic pole
      const drawPulsarBeam = (sign: 1 | -1) => {
        if (!(this.params.layers.pulsarBeams ?? true)) return;
        const mag = this.currentMagneticAxis;
        const rootW = 1.62 * effectiveScale * sign;
        const tipW = 16.5 * effectiveScale * sign;
        const pRoot = projectWorldToScreen(mag.x * rootW, mag.y * rootW, mag.z * rootW);
        const pTip = projectWorldToScreen(mag.x * tipW, mag.y * tipW, mag.z * tipW);
        if (pRoot.z >= 1.0 && pTip.z >= 1.0) return;

        const dx = pTip.x - pRoot.x;
        const dy = pTip.y - pRoot.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / len;
        const ny = dx / len;
        const baseHalfW = Math.max(3, horizonPx * 0.22);
        const tipHalfW = Math.max(12, horizonPx * 1.48);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Outer Synchrotron Sheath Cone
        const sheathGrad = ctx.createLinearGradient(pRoot.x, pRoot.y, pTip.x, pTip.y);
        sheathGrad.addColorStop(0, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.85)`);
        sheathGrad.addColorStop(0.28, `rgba(${sheathRgb.r}, ${sheathRgb.g}, ${sheathRgb.b}, 0.52)`);
        sheathGrad.addColorStop(1, `rgba(${sheathRgb.r}, ${sheathRgb.g}, ${sheathRgb.b}, 0)`);
        ctx.fillStyle = sheathGrad;
        ctx.beginPath();
        ctx.moveTo(pRoot.x + nx * baseHalfW, pRoot.y + ny * baseHalfW);
        ctx.lineTo(pTip.x + nx * tipHalfW, pTip.y + ny * tipHalfW);
        ctx.lineTo(pTip.x - nx * tipHalfW, pTip.y - ny * tipHalfW);
        ctx.lineTo(pRoot.x - nx * baseHalfW, pRoot.y - ny * baseHalfW);
        ctx.closePath();
        ctx.fill();

        // Inner Coherent Relativistic Core Jet
        const coreGrad = ctx.createLinearGradient(pRoot.x, pRoot.y, pTip.x, pTip.y);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
        coreGrad.addColorStop(0.4, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.65)`);
        coreGrad.addColorStop(1, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(pRoot.x + nx * (baseHalfW * 0.45), pRoot.y + ny * (baseHalfW * 0.45));
        ctx.lineTo(pTip.x + nx * (tipHalfW * 0.32), pTip.y + ny * (tipHalfW * 0.32));
        ctx.lineTo(pTip.x - nx * (tipHalfW * 0.32), pTip.y - ny * (tipHalfW * 0.32));
        ctx.lineTo(pRoot.x - nx * (baseHalfW * 0.45), pRoot.y - ny * (baseHalfW * 0.45));
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      };

      // Draw whichever beam points away from the camera behind the star sphere first
      const camToOrigin = this.camera.position.clone().normalize();
      const northDot = this.currentMagneticAxis.dot(camToOrigin);
      drawPulsarBeam(northDot >= 0 ? -1 : 1);

      // 3b. Coronal Atmosphere / Magnetospheric Glow Halo
      const haloGrad = ctx.createRadialGradient(bhX, bhY, horizonPx * 0.75, bhX, bhY, horizonPx * 2.5);
      haloGrad.addColorStop(0, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.72)`);
      haloGrad.addColorStop(0.38, `rgba(${surfRgb.r}, ${surfRgb.g}, ${surfRgb.b}, 0.42)`);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(bhX, bhY, horizonPx * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 3c. Physical Stellar Surface (Beloborodov Self-Lensed Crust / Convective Photosphere)
      const bodyGrad = ctx.createRadialGradient(
        bhX - horizonPx * 0.24,
        bhY - horizonPx * 0.24,
        horizonPx * 0.08,
        bhX,
        bhY,
        horizonPx
      );
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.32, `rgb(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b})`);
      bodyGrad.addColorStop(0.76, `rgb(${surfRgb.r}, ${surfRgb.g}, ${surfRgb.b})`);
      bodyGrad.addColorStop(
        1,
        `rgb(${Math.min(255, surfRgb.r + 45)}, ${Math.min(255, surfRgb.g + 45)}, ${Math.min(255, surfRgb.b + 45)})`
      );
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(bhX, bhY, horizonPx, 0, Math.PI * 2);
      ctx.fill();

      // Surface magnetic polar hotspots at ±uMagneticAxis * R_star
      for (const sign of [1, -1] as const) {
        const poleWorld = this.currentMagneticAxis.clone().multiplyScalar(1.62 * effectiveScale * sign);
        if (poleWorld.dot(camToOrigin) > -0.25) {
          const pPole = projectWorldToScreen(poleWorld.x, poleWorld.y, poleWorld.z);
          const spotR = Math.max(4, horizonPx * 0.34);
          const spotGrad = ctx.createRadialGradient(pPole.x, pPole.y, 0, pPole.x, pPole.y, spotR);
          spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          spotGrad.addColorStop(0.5, `rgba(${coreRgb.r}, ${coreRgb.g}, ${coreRgb.b}, 0.72)`);
          spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = spotGrad;
          ctx.beginPath();
          ctx.arc(pPole.x, pPole.y, spotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw foreground Pulsar Lighthouse Beam in front of the star sphere
      drawPulsarBeam(northDot >= 0 ? 1 : -1);
    } else {
      // 4. Black Hole System: Companion Donor Star (Binary Mode), Lensed Arches, 3D Accretion Disk & Shadow
      if (this.params.systemCategory === 'binary' && this.expansionProgress > 0.05) {
        _vec3B.copy(this.companionStarWorldPos).project(this.camera);
        const starX = (_vec3B.x * 0.5 + 0.5) * width;
        const starY = (-_vec3B.y * 0.5 + 0.5) * height;
        const starR = Math.max(8, this.companionStarBaseRadius * effectiveScale * pxPerUnit);

        const streamGrad = ctx.createLinearGradient(starX, starY, bhX, bhY);
        streamGrad.addColorStop(0, 'rgba(251, 146, 60, 0.78)');
        streamGrad.addColorStop(0.6, 'rgba(250, 204, 21, 0.68)');
        streamGrad.addColorStop(1, 'rgba(255, 251, 235, 0.9)');
        ctx.strokeStyle = streamGrad;
        ctx.lineWidth = Math.max(3, starR * 0.28);
        ctx.beginPath();
        ctx.moveTo(starX, starY);
        ctx.quadraticCurveTo(
          (starX + bhX) * 0.5,
          (starY + bhY) * 0.5 + starR * 1.1,
          bhX + horizonPx * 1.6,
          bhY
        );
        ctx.stroke();

        const coronaGrad = ctx.createRadialGradient(
          starX,
          starY,
          starR * 0.15,
          starX,
          starY,
          starR * 1.85
        );
        coronaGrad.addColorStop(0, '#fffbeb');
        coronaGrad.addColorStop(0.45, '#fbbf24');
        coronaGrad.addColorStop(0.72, '#ea580c');
        coronaGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = coronaGrad;
        ctx.beginPath();
        ctx.arc(starX, starY, starR * 1.85, 0, Math.PI * 2);
        ctx.fill();
      }

      const mode = this.params.spectralMode;
      const isXray = mode === 'xray';
      const isEht = mode === 'eht230ghz';
      const isDopplerMode = mode === 'doppler';

      const colCore = isXray ? '#f0f9ff' : isDopplerMode ? '#e0f2fe' : '#fffbeb';
      const colMid = isXray
        ? '#38bdf8'
        : isEht
        ? '#f97316'
        : isDopplerMode
        ? '#60a5fa'
        : '#f59e0b';
      const colOuter = isXray
        ? 'rgba(2, 132, 199, 0)'
        : isEht
        ? 'rgba(154, 52, 18, 0)'
        : isDopplerMode
        ? 'rgba(225, 29, 72, 0)'
        : 'rgba(180, 83, 9, 0)';

      const diskOuterPx =
        horizonPx * (this.params.accretionState === 'active' ? 2.95 : 2.62) * this.expansionProgress;
      const camElevSin = Math.abs(
        (this.camera.position.y - this.blackHoleGroup.position.y) / Math.max(1.0, camDist)
      );
      const diskTilt = Math.max(
        0.16,
        Math.min(
          0.92,
          camElevSin > 0.02
            ? camElevSin
            : Math.abs(Math.cos(THREE.MathUtils.degToRad(this.params.inclinationDeg)))
        )
      );
      const dopplerShiftX =
        -horizonPx * 0.28 * this.params.dopplerStrength * (0.5 + 0.5 * this.params.spin);

      const yScale =
        this.params.accretionState === 'active' ? Math.max(0.24, diskTilt * 1.15) : diskTilt;

      // 4a. Ambient Volumetric Accretion Bloom
      if (this.params.layers.accretionDisk && this.expansionProgress > 0.03) {
        const bloomR = diskOuterPx * 1.32;
        const ambGrad = ctx.createRadialGradient(
          bhX + dopplerShiftX * 0.4,
          bhY,
          horizonPx * 0.85,
          bhX,
          bhY,
          bloomR
        );
        if (isXray) {
          ambGrad.addColorStop(0, 'rgba(56, 189, 248, 0.36)');
          ambGrad.addColorStop(0.45, 'rgba(14, 165, 233, 0.14)');
          ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          ambGrad.addColorStop(0, 'rgba(251, 191, 36, 0.38)');
          ambGrad.addColorStop(0.38, 'rgba(217, 119, 6, 0.18)');
          ambGrad.addColorStop(0.72, 'rgba(154, 52, 18, 0.07)');
          ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = ambGrad;
        ctx.beginPath();
        ctx.arc(bhX, bhY, bloomR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4b. Smooth Continuous Gravitationally Lensed Einstein Arches (Upper & Lower)
      if (
        this.params.layers.accretionDisk &&
        this.params.gravitationalLensing &&
        this.expansionProgress > 0.03
      ) {
        const fluxGain = Math.min(1.25, 0.72 + 0.35 * this.params.accretionRate);
        const archOuterR = horizonPx * 2.15;
        const archAspect = Math.max(0.78, 1.0 - diskTilt * 0.14);

        ctx.save();
        ctx.translate(bhX, bhY);
        ctx.scale(1.0, archAspect);

        // Continuous radial gradient with off-center inner focal point for relativistic Doppler asymmetry
        const archGrad = ctx.createRadialGradient(
          dopplerShiftX * 0.65,
          -horizonPx * 0.06,
          horizonPx * 0.96,
          dopplerShiftX * 0.25,
          0,
          archOuterR
        );
        if (isXray) {
          archGrad.addColorStop(0, `rgba(240, 249, 255, ${(0.95 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.18, `rgba(125, 211, 252, ${(0.82 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.48, `rgba(14, 165, 233, ${(0.42 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.82, `rgba(3, 105, 161, ${(0.12 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isDopplerMode) {
          archGrad.addColorStop(0, `rgba(224, 242, 254, ${(0.95 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.22, `rgba(96, 165, 250, ${(0.78 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.55, `rgba(249, 115, 22, ${(0.38 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          archGrad.addColorStop(0, `rgba(255, 253, 240, ${(0.96 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.16, `rgba(254, 240, 138, ${(0.86 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.38, `rgba(245, 158, 11, ${(0.58 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(0.68, `rgba(194, 65, 12, ${(0.24 * fluxGain).toFixed(2)})`);
          archGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        ctx.fillStyle = archGrad;
        ctx.beginPath();
        ctx.arc(0, 0, archOuterR, 0, Math.PI * 2);
        ctx.fill();

        // Subtle animated lensed plasma filaments inside the upper/lower Einstein ring
        ctx.lineWidth = Math.max(1.5, horizonPx * 0.045);
        for (let f = 0; f < 3; f++) {
          const rFil = horizonPx * (1.16 + f * 0.24);
          const phase = elapsed * 1.8 + f * 1.4;
          ctx.strokeStyle = isXray
            ? `rgba(186, 230, 253, ${0.32 - f * 0.07})`
            : `rgba(254, 243, 199, ${0.34 - f * 0.08})`;
          ctx.beginPath();
          ctx.arc(dopplerShiftX * 0.35, 0, rFil, Math.PI * 1.08 + Math.sin(phase) * 0.05, Math.PI * 1.92);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(dopplerShiftX * 0.35, 0, rFil * 0.94, Math.PI * 0.08, Math.PI * 0.92 + Math.cos(phase) * 0.05);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Helper to render the continuous 3D-projected Equatorial Accretion Disk without concentric banding or y=0 seam
      const drawContinuousEquatorialDisk = (isFrontHalf: boolean) => {
        if (!this.params.layers.accretionDisk || this.expansionProgress <= 0.02) return;
        const innerR = horizonPx * Math.max(1.04, 1.32 - 0.26 * this.params.spin);
        const fluxGain = Math.min(1.3, 0.78 + 0.38 * this.params.accretionRate);

        ctx.save();
        ctx.translate(bhX, bhY);

        // Clip cleanly to upper half (rear disk) or lower half (foreground belt sweeping in front of shadow)
        ctx.beginPath();
        if (isFrontHalf) {
          ctx.rect(-width, -1.5, width * 2, height);
        } else {
          ctx.rect(-width, -height, width * 2, height + 1.5);
        }
        ctx.clip();

        ctx.scale(1.0, yScale);

        // Smooth continuous radial gradient with off-center Doppler focal shift
        const diskGrad = ctx.createRadialGradient(
          dopplerShiftX * 1.15,
          0,
          innerR * 0.92,
          dopplerShiftX * 0.35,
          0,
          diskOuterPx
        );
        const alphaScale = (isFrontHalf ? 0.96 : 0.84) * fluxGain;

        if (isXray) {
          diskGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          diskGrad.addColorStop(0.04, `rgba(240, 249, 255, ${Math.min(0.98, alphaScale)})`);
          diskGrad.addColorStop(0.22, `rgba(125, 211, 252, ${Math.min(0.94, alphaScale * 0.92)})`);
          diskGrad.addColorStop(0.52, `rgba(14, 165, 233, ${alphaScale * 0.58})`);
          diskGrad.addColorStop(0.82, `rgba(3, 105, 161, ${alphaScale * 0.22})`);
          diskGrad.addColorStop(1, colOuter);
        } else if (isDopplerMode) {
          diskGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          diskGrad.addColorStop(0.04, `rgba(224, 242, 254, ${Math.min(0.98, alphaScale)})`);
          diskGrad.addColorStop(0.24, `rgba(56, 189, 248, ${alphaScale * 0.88})`);
          diskGrad.addColorStop(0.58, `rgba(250, 204, 21, ${alphaScale * 0.52})`);
          diskGrad.addColorStop(0.85, `rgba(225, 29, 72, ${alphaScale * 0.26})`);
          diskGrad.addColorStop(1, colOuter);
        } else {
          diskGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          diskGrad.addColorStop(0.03, `rgba(255, 253, 245, ${Math.min(0.99, alphaScale * 1.05)})`);
          diskGrad.addColorStop(0.16, `rgba(254, 240, 138, ${Math.min(0.96, alphaScale * 0.95)})`);
          diskGrad.addColorStop(0.38, `rgba(251, 191, 36, ${alphaScale * 0.78})`);
          diskGrad.addColorStop(0.65, `rgba(234, 88, 12, ${alphaScale * 0.46})`);
          diskGrad.addColorStop(0.88, `rgba(154, 52, 18, ${alphaScale * 0.18})`);
          diskGrad.addColorStop(1, colOuter);
        }

        ctx.fillStyle = diskGrad;
        ctx.beginPath();
        ctx.arc(0, 0, diskOuterPx, 0, Math.PI * 2);
        ctx.arc(0, 0, innerR * 0.94, 0, Math.PI * 2, true);
        ctx.fill();

        // 5 subtle Keplerian shear spiral filaments inside the continuous disk
        ctx.lineWidth = Math.max(1.8, (diskOuterPx - innerR) * 0.035);
        for (let s = 0; s < 5; s++) {
          const frac = (s + 0.5) / 5;
          const rFil = innerR + (diskOuterPx - innerR) * Math.pow(frac, 0.95);
          const rot = -elapsed * (2.6 - frac * 1.4) + s * 1.25;
          ctx.strokeStyle = isXray
            ? `rgba(224, 242, 254, ${(1.0 - frac) * 0.28})`
            : `rgba(255, 251, 235, ${(1.0 - frac) * 0.32})`;
          ctx.beginPath();
          if (isFrontHalf) {
            ctx.arc(dopplerShiftX * (1.0 - frac * 0.5), 0, rFil, 0.08, Math.PI - 0.08);
          } else {
            ctx.arc(dopplerShiftX * (1.0 - frac * 0.5), 0, rFil, Math.PI + 0.08, Math.PI * 2 - 0.08);
          }
          ctx.stroke();
        }

        // Approaching left-limb relativistic Doppler beaming hotspot boost
        if (this.params.dopplerStrength > 0.05) {
          const hotR = (innerR + diskOuterPx * 0.45) * 0.55;
          const hotX = -innerR * 1.28 + dopplerShiftX * 0.4;
          const hotGrad = ctx.createRadialGradient(hotX, 0, 0, hotX, 0, hotR);
          const dBoost = Math.min(0.65, this.params.dopplerStrength * 0.55);
          hotGrad.addColorStop(0, `rgba(255, 255, 255, ${dBoost})`);
          hotGrad.addColorStop(0.45, isXray ? `rgba(125, 211, 252, ${dBoost * 0.55})` : `rgba(254, 240, 138, ${dBoost * 0.55})`);
          hotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = hotGrad;
          ctx.beginPath();
          ctx.arc(hotX, 0, hotR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      // 4c. Draw Rear Half of Equatorial Accretion Disk (occluded behind event horizon shadow)
      drawContinuousEquatorialDisk(false);

      // 4d. Central Event Horizon Shadow (#000000) with Bardeen D-shaped Kerr prograde flattening
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      const bardeenRx = horizonPx * (1.0 - 0.05 * this.params.spin * this.params.spin);
      ctx.ellipse(bhX + horizonPx * 0.03 * this.params.spin, bhY, bardeenRx, horizonPx, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4e. Draw Foreground Half of Equatorial Accretion Disk (sweeping continuously across the front of the shadow)
      drawContinuousEquatorialDisk(true);

      // 4f. Ergosphere Static-Limit Cage (when ergosphereCage layer is enabled)
      if (this.params.layers.ergosphereCage) {
        const ergoRx = horizonPx * (1.16 + 0.22 * this.params.spin);
        const ergoRy = horizonPx * (0.86 - 0.12 * this.params.spin);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(bhX, bhY - this.currentExploded * 3.8 * pxPerUnit, ergoRx, ergoRy, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4g. Orbiting S-Star Cluster & S2 Precessing Trail (when orbitalStars layer is enabled)
    if (this.params.layers.orbitalStars && this.starS2Mesh) {
      const orbitR = this.params.probeRadiusRs * 1.75 * this.currentScale;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      let started = false;
      for (let s = 0; s <= 64; s++) {
        const th = (s / 64) * Math.PI * 2;
        const pt = projectWorldToScreen(Math.cos(th) * orbitR, 0, -Math.sin(th) * orbitR);
        if (pt.z < 1.0) {
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      }
      ctx.stroke();

      const s2Pos = this.starS2Mesh.position;
      const pS2 = projectWorldToScreen(s2Pos.x, s2Pos.y, s2Pos.z);
      if (pS2.z < 1.0) {
        const s2R = Math.max(3.5, 0.36 * pxPerUnit * this.currentScale);
        const s2Grad = ctx.createRadialGradient(pS2.x, pS2.y, 0, pS2.x, pS2.y, s2R * 2.4);
        s2Grad.addColorStop(0, '#ffffff');
        s2Grad.addColorStop(0.4, '#93c5fd');
        s2Grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = s2Grad;
        ctx.beginPath();
        ctx.arc(pS2.x, pS2.y, s2R * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4h. Live Relativistic Photon Geodesic Trajectories (when geodesicRays layer is enabled)
    if (this.params.layers.geodesicRays && this.activeGeodesicPulses.length > 0) {
      for (const item of this.activeGeodesicPulses) {
        const lineMat = item.line.material as THREE.LineBasicMaterial;
        const hexStr = `#${lineMat.color.getHexString()}`;
        ctx.strokeStyle = hexStr;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        let started = false;
        const maxIdx = Math.min(item.points.length - 1, Math.ceil(item.progress));
        for (let i = 0; i <= maxIdx; i++) {
          const p = item.points[i];
          const pt = projectWorldToScreen(p.x, p.y, p.z);
          if (pt.z < 1.0) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        ctx.stroke();
      }
    }

    // 5. Sonic Boom Shockwave Ring
    if (this.isPulseActive && this.pulseStrength > 0.01) {
      const shockPx = this.pulseRadius * pxPerUnit;
      ctx.strokeStyle = `rgba(148, 163, 184, ${Math.min(0.75, this.pulseStrength * 0.65)})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(bhX, bhY, shockPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 6. Camera-Space Anamorphic Horizontal Streak & Starburst at Approaching Photon Ring Limb
    const flareStrength = this.settings.lensFlareIntensity ?? 1.0;
    if (flareStrength > 0.01 && _vec3A.z < 1.0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const flareX = bhX - (isStar ? 0 : horizonPx * 0.96);
      const flareY = bhY + (isStar ? 0 : horizonPx * 0.06);

      // Horizontal anamorphic optical streak matching the 3D shader
      const streakHalfW = horizonPx * (2.6 + 1.1 * flareStrength);
      const streakAlpha = Math.min(0.62, 0.28 * flareStrength);
      const streakGrad = ctx.createLinearGradient(flareX - streakHalfW, flareY, flareX + streakHalfW * 1.35, flareY);
      streakGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      streakGrad.addColorStop(0.32, `rgba(186, 230, 253, ${streakAlpha * 0.55})`);
      streakGrad.addColorStop(0.43, `rgba(255, 251, 235, ${streakAlpha})`);
      streakGrad.addColorStop(0.55, `rgba(251, 191, 36, ${streakAlpha * 0.45})`);
      streakGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = streakGrad;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(flareX - streakHalfW, flareY);
      ctx.lineTo(flareX + streakHalfW * 1.35, flareY);
      ctx.stroke();

      // Crisp starburst core at the approaching Doppler limb
      const coreR = Math.max(8, horizonPx * 0.32);
      const coreGrad = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, coreR);
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.85, 0.48 * flareStrength)})`);
      coreGrad.addColorStop(0.35, `rgba(254, 240, 138, ${Math.min(0.55, 0.26 * flareStrength)})`);
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(flareX, flareY, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private startLoop() {
    this.clock.start();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private buildCosmicSkyDome() {
    const skyGeo = new THREE.SphereGeometry(220, 32, 32);
    this.skyDomeMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: false,
    });
    this.cosmicSkyDomeMesh = new THREE.Mesh(skyGeo, this.skyDomeMat);
    this.cosmicSkyDomeMesh.visible = false;
    this.scene.add(this.cosmicSkyDomeMesh);
  }

  private updateSkyDomeTexture(_themeId: BackgroundThemeId) {
    if (this.cosmicSkyDomeMesh) {
      this.cosmicSkyDomeMesh.visible = false;
    }
  }

  public setBackgroundTheme(themeId: BackgroundThemeId) {
    const isPureBlack = themeId === 'pure_black';
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = null;
    if (this.cosmicSkyDomeMesh) {
      this.cosmicSkyDomeMesh.visible = false;
    }
    if (this.starfieldInstanced) {
      this.starfieldInstanced.visible = !isPureBlack;
    }
  }

  public getAnatomyCalloutAnchors(): AnatomyCalloutAnchor[] {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const scale = this.currentScale;
    const isStar = isStellarCategory(this.params.objectCategory);

    if (isStar) {
      const isLuminous = this.params.objectCategory === 'luminous_star';
      const starAnchors: Array<{
        id: string;
        name: string;
        badge: string;
        badgeColor: string;
        headline: string;
        description: string;
        pos: THREE.Vector3;
        dockPosition: 'top-left' | 'top-right' | 'mid-left' | 'mid-right' | 'bottom-left' | 'bottom-right';
      }> = isLuminous
        ? [
            {
              id: 'luminous_photosphere',
              name: 'Convective Radiative Photosphere',
              badge: 'Thermonuclear Fusion Surface',
              badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
              headline: 'Outward radiation and thermal pressure balance inward gravity',
              description:
                'Nuclear fusion in the stellar core generates intense photon flux and boiling convective plasma cells across the photosphere.',
              pos: new THREE.Vector3(0, 1.65 * scale, 0),
              dockPosition: 'top-left',
            },
            {
              id: 'luminous_wind_jet',
              name: 'Radiation-Driven Bipolar Outflow',
              badge: 'Eddington Stellar Wind',
              badgeColor: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
              headline: 'Extreme UV radiation pressure accelerates supersonic polar winds',
              description:
                'In hypergiants and Wolf-Rayet stars, continuum radiation pressure drives bipolar mass-loss plumes at thousands of km/s.',
              pos: new THREE.Vector3(2.5 * scale, 5.5 * scale, 0),
              dockPosition: 'top-right',
            },
            {
              id: 'luminous_hydrostatic',
              name: 'Hydrostatic & Eddington Equilibrium',
              badge: 'dP/dr = -G M(r) ρ(r) / r²',
              badgeColor: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40',
              headline: 'Spacetime curves smoothly into a shallow interior bowl',
              description:
                'Because the star’s physical radius is much larger than its Schwarzschild radius, no event horizon forms until core fuel is exhausted.',
              pos: new THREE.Vector3(-2.8 * scale, -1.8 * scale, 0),
              dockPosition: 'bottom-left',
            },
          ]
        : [
            {
              id: 'ns_crust',
              name: 'Crystalline Iron Crust',
              badge: 'Solid Surface (10¹⁴ g/cm³)',
              badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
              headline: 'Physical solid boundary — no event horizon or singularity exists',
              description: 'A solid crust made of degenerate electrons and tightly packed iron nuclei. The Tolman-Oppenheimer-Volkoff limit prevents collapse.',
              pos: new THREE.Vector3(0, 1.65 * scale, 0),
              dockPosition: 'top-left',
            },
            {
              id: 'ns_pulsar_beam',
              name: 'Pulsar Lighthouse Beam',
              badge: 'Relativistic Synchrotron Jet',
              badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
              headline: 'Beams of radio and X-ray emission sweep across the galaxy',
              description: 'Sweeping magnetic polar cones rotating with the star crust produce rapid periodic radio pulses detected on Earth.',
              pos: new THREE.Vector3(2.5 * scale, 5.5 * scale, 0),
              dockPosition: 'top-right',
            },
            {
              id: 'ns_tov_limit',
              name: 'Quantum Neutron Degeneracy',
              badge: 'TOV Limit (~2.17 M☉)',
              badgeColor: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
              headline: 'Quantum Pauli exclusion principle halts gravitational collapse',
              description: 'Neutrons cannot occupy the same quantum state, exerting degeneracy pressure that balances gravity up to ~2.2 Solar masses.',
              pos: new THREE.Vector3(-2.8 * scale, -1.8 * scale, 0),
              dockPosition: 'bottom-left',
            },
          ];

      return starAnchors.map((a) => {
        _vec3A.copy(a.pos);
        _vec3A.project(this.camera);
        const screenX = (_vec3A.x * 0.5 + 0.5) * width;
        const screenY = (-_vec3A.y * 0.5 + 0.5) * height;
        const isVisible = _vec3A.z < 1.0 && screenX > 20 && screenX < width - 20 && screenY > 20 && screenY < height - 20;
        return {
          id: a.id,
          name: a.name,
          badge: a.badge,
          badgeColor: a.badgeColor,
          headline: a.headline,
          description: a.description,
          worldPos: { x: a.pos.x, y: a.pos.y, z: a.pos.z },
          screenX,
          screenY,
          isVisible,
          dockPosition: a.dockPosition,
        };
      });
    }

    const anchors: Array<{
      id: string;
      name: string;
      badge: string;
      badgeColor: string;
      headline: string;
      description: string;
      pos: THREE.Vector3;
      dockPosition: 'top-left' | 'top-right' | 'mid-left' | 'mid-right' | 'bottom-left' | 'bottom-right';
    }> = [
      {
        id: 'far_side',
        name: 'Far Side (Gravitational Lensing)',
        badge: 'Relativistic Optics',
        badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
        headline: 'Light from behind the black hole bent over the top',
        description: 'Extreme spacetime curvature bends photons emitted from the rear accretion disk upward and over the event horizon shadow into a bright upper arch.',
        pos: new THREE.Vector3(0, 2.25 * scale, 0),
        dockPosition: 'top-left',
      },
      {
        id: 'photon_ring',
        name: 'Photon Ring',
        badge: 'r_ph ≈ 1.5 Rs',
        badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        headline: 'Unstable photon orbit producing a razor-sharp ring',
        description: 'Photons grazing the photon sphere orbit the black hole multiple times before escaping to the observer, forming a superposed luminous ring.',
        pos: new THREE.Vector3(1.85 * scale, 1.35 * scale, -0.1),
        dockPosition: 'top-right',
      },
      {
        id: 'black_hole_shadow',
        name: 'Black Hole Shadow',
        badge: 'r_shadow ≈ 2.6 Rs',
        badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
        headline: 'Gravitational capture cross-section of the event horizon',
        description: 'The dark silhouette is ~2.6× larger than the physical event horizon because spacetime deflects and captures all nearby light rays.',
        pos: new THREE.Vector3(1.45 * scale, 0.45 * scale, 0.05),
        dockPosition: 'mid-right',
      },
      {
        id: 'doppler_beaming',
        name: 'Relativistic Doppler Beaming',
        badge: 'Approaching vs Receding',
        badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
        headline: 'Approaching plasma appears intensely brighter and blue-shifted',
        description: 'Gas orbiting at ~0.5c toward the observer is boosted in flux by D³⁺ᵃ, creating strong brightness asymmetry across the disk.',
        pos: new THREE.Vector3(4.2 * scale, -0.15 * scale, 0),
        dockPosition: 'mid-right',
      },
      {
        id: 'accretion_disk',
        name: 'Relativistic Accretion Disk',
        badge: 'Novikov-Thorne Profile',
        badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
        headline: 'Superheated magnetized plasma spiraling inward',
        description: 'Differential Keplerian shear and magnetorotational turbulence heat infalling gas to millions of Kelvin from the ISCO outward.',
        pos: new THREE.Vector3(-4.2 * scale, -0.25 * scale, 0.2),
        dockPosition: 'mid-left',
      },
      {
        id: 'underside',
        name: 'Underside Lensed Image',
        badge: 'Secondary Lensing Arch',
        badgeColor: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
        headline: 'Light from the bottom of the disk bent underneath the shadow',
        description: 'Photons emitted downward from the underside of the rear accretion disk curve around the lower hemisphere toward the camera.',
        pos: new THREE.Vector3(0, -2.25 * scale, 0),
        dockPosition: 'bottom-left',
      },
      {
        id: 'singularity',
        name: 'Kerr Ring Singularity',
        badge: 'r = 0, θ = π/2',
        badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
        headline: 'Central region where curvature invariants diverge',
        description: 'In a rotating Kerr black hole, angular momentum Centrifugally stretches the point singularity into a ring within the inner Cauchy horizon.',
        pos: new THREE.Vector3(0, 0, 0),
        dockPosition: 'bottom-left',
      },
      {
        id: 'spacetime_distortion',
        name: 'Spacetime Distortion',
        badge: 'Metric Curvature g_μν',
        badgeColor: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
        headline: 'Flamm paraboloid embedding of spatial curvature',
        description: 'Visualizes how mass-energy warps radial proper distance dρ = dr / √(1 - Rs/r) and drags inertial frames via Kerr spin.',
        pos: new THREE.Vector3(3.6 * scale, -3.2 * scale, 0.8),
        dockPosition: 'bottom-right',
      },
    ];

    return anchors
      .filter((a) => a.id !== 'singularity' || this.showSingularityInAnatomy || this.settings.alwaysShowSingularity)
      .map((a) => {
        _vec3A.copy(a.pos);
        _vec3A.project(this.camera);
        const screenX = (_vec3A.x * 0.5 + 0.5) * width;
        const screenY = (-_vec3A.y * 0.5 + 0.5) * height;
        const isVisible = _vec3A.z < 1.0 && screenX > 15 && screenX < width - 15 && screenY > 15 && screenY < height - 15;
        return {
          id: a.id,
          name: a.name,
          badge: a.badge,
          badgeColor: a.badgeColor,
          headline: a.headline,
          description: a.description,
          worldPos: { x: a.pos.x, y: a.pos.y, z: a.pos.z },
          screenX,
          screenY,
          isVisible,
          dockPosition: a.dockPosition,
        };
      });
  }

  public updateSettings(nextSettings: VisualizerSettings) {
    const wasSecret1987 = Boolean(this.settings?.secret1987Mode);
    const wasPhoneMode = Boolean(this.settings?.phoneMode);
    const prevDiskStyle = this.settings?.accretionDiskStyle;
    const diskStyleChanged = Boolean(
      prevDiskStyle && nextSettings.accretionDiskStyle !== prevDiskStyle
    );
    this.settings = { ...nextSettings };
    if (wasPhoneMode !== Boolean(nextSettings.phoneMode)) {
      this.handleResize();
    }
    if (diskStyleChanged) {
      this.triggerEventHorizonPulse(this.params.objectCategory);
      this.triggerAccretionShockwave(1.25, true);
      relativisticAudio.triggerAccretionShockPulse(isStellarCategory(this.params.objectCategory));
    }
    const isSecret1987 = Boolean(nextSettings.secret1987Mode);

    if (this.secret1987Group) {
      this.secret1987Group.visible = isSecret1987;
    }
    if (isSecret1987 !== wasSecret1987) {
      this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
      if (isSecret1987) {
        this.triggerAccretionShockwave(1.5, true);
        this.spawnParameterRipple('mixed', 1.35);
      }
    }

    const isClassicDisk = nextSettings.accretionDiskStyle !== 'raymarched';
    const diskStyleVal = isClassicDisk ? 0.0 : 1.0;
    const isStar = isStellarCategory(this.params?.objectCategory);
    const isActiveAccretion = (this.params?.accretionState ?? 'quiescent') === 'active';
    const isHighPerf = Boolean(nextSettings.highPerformanceMode);
    const isDepthPeeling = Boolean(nextSettings.webglDepthPeeling ?? isHighPerf);

    if (this.activeDiskVolumeGroup) {
      this.activeDiskVolumeGroup.visible =
        !isStar && !isDepthPeeling && (isActiveAccretion || !isClassicDisk);
    }

    if (this.accretionDiskMat) {
      this.accretionDiskMat.uniforms.uDiskStyle.value = diskStyleVal;
      this.accretionDiskMat.uniforms.uBloomIntensity.value = nextSettings.bloomIntensity;
      this.accretionDiskMat.uniforms.uDepthPeeling.value = isDepthPeeling ? 1.0 : 0.0;
      this.accretionDiskMat.uniforms.uDopplerCoeffs.value.set(
        this.params.dopplerStrength,
        isClassicDisk ? 0.70 : 0.62,
        1.0,
        isClassicDisk ? 2.2 : 1.65
      );
      this.accretionDiskMat.colorWrite = true;
      if (this.accretionDiskMat.depthWrite !== isDepthPeeling) {
        this.accretionDiskMat.depthWrite = isDepthPeeling;
        this.accretionDiskMat.needsUpdate = true;
      }
    }
    if (this.gravitationalLensMat) {
      this.gravitationalLensMat.uniforms.uDiskStyle.value = isClassicDisk ? 0.0 : 1.0;
      this.gravitationalLensMat.uniforms.uBloomIntensity.value = nextSettings.bloomIntensity;
      this.gravitationalLensMat.uniforms.uDepthPeeling.value = isDepthPeeling ? 1.0 : 0.0;
    }
    if (this.cameraLensFlareMat) {
      this.cameraLensFlareMat.uniforms.uFlareIntensity.value = nextSettings.lensFlareIntensity ?? 1.0;
    }
    if (this.cameraLensFlareMesh) {
      this.cameraLensFlareMesh.visible =
        (nextSettings.lensFlareIntensity ?? 1.0) > 0.001 && !isHighPerf;
    }
    if (this.renderer) {
      this.renderer.toneMappingExposure = 1.03 + nextSettings.bloomIntensity * 0.12;
    }
    if (this.camera && Math.abs(this.camera.fov - nextSettings.cameraFov) > 0.01) {
      this.camera.fov = nextSettings.cameraFov;
      this.camera.updateProjectionMatrix();
    }
    if (nextSettings.rapidAdjustmentRipples === false) {
      this.clearParameterRipples();
    }
    if (nextSettings.accretionShockwaveEnabled === false) {
      this.clearAccretionShockwave();
    }
    if (!nextSettings.timeLapseEnabled) {
      this.resetTimeLapseExposure();
    }
    this.handleResize();
  }

  public resetTimeLapseExposure() {
    this.timeLapseInitialized = false;
    this.timeLapseExposureSeconds = 0.0;
    if (this.postMaterial) {
      this.postMaterial.uniforms.uTimeLapseMix.value = 0.0;
      this.postMaterial.uniforms.uExposureBoost.value = 0.0;
    }
  }

  public setAutoRotate(enabled: boolean, speed?: number) {
    this.settings.autoRotate = enabled;
    if (typeof speed === 'number') {
      this.settings.autoRotateSpeed = speed;
    }
  }

  public setShowSingularityInAnatomy(visible: boolean) {
    this.showSingularityInAnatomy = visible;
  }

  public getOverheadTelemetry(): OverheadTelemetryData {
    const metrics = computeRelativisticMetrics(this.params);
    const starR = this.params.probeRadiusRs;
    const starAngle = this.starOrbitAngle;
    const starX = Math.cos(starAngle) * starR;
    const starZ = -Math.sin(starAngle) * starR;
    const starAngleDeg = ((Math.atan2(starZ, starX) * 180 / Math.PI) + 360) % 360;

    const eventHorizonRs = metrics.eventHorizonRg * 0.5;
    const photonSphereRs = metrics.photonSphereRg * 0.5;
    const iscoRs = metrics.iscoProgradeRg * 0.5;
    const ergosphereRs = 1.0;
    const accretionInnerRs = iscoRs;
    const accretionOuterRs = 6.2;

    const scale = Math.max(0.1, 1.75 * this.currentScale);
    const geodesics = this.activeGeodesicPulses.map((item) => {
      const lineMat = item.line.material as THREE.LineBasicMaterial;
      return {
        outcome: lineMat.color.getHexString(),
        colorHex: lineMat.color.getHex(),
        points: item.points.map((p) => ({
          x: p.x / scale,
          z: p.z / scale,
        })),
        currentPos: {
          x: item.mesh.position.x / scale,
          z: item.mesh.position.z / scale,
        },
      };
    });

    return {
      probeX: starX,
      probeZ: starZ,
      probeRadiusRs: starR,
      probeRadiusRg: starR * 2,
      probeAngleDeg: starAngleDeg,
      probeAngleRad: starAngle,
      probeOrbitalBeta: metrics.probeOrbitalBeta,
      probeTimeDilationFactor: metrics.probeTimeDilationFactor,
      probeRedshiftZ: metrics.probeRedshiftZ,
      eventHorizonRs,
      photonSphereRs,
      iscoRs,
      ergosphereRs,
      accretionInnerRs,
      accretionOuterRs,
      spin: this.params.spin,
      orbitalStarsVisible: Boolean(this.params.layers.orbitalStars),
      geodesics,
    };
  }

  public getPerformanceTelemetry(): ScenePerformanceTelemetry {
    const samples =
      this.frameTimeSamples.length > 0 ? this.frameTimeSamples : [this.currentFrameTimeMs];
    const sumMs = samples.reduce((acc, v) => acc + v, 0);
    const avgFrameTimeMs = sumMs / samples.length;
    const minFrameTimeMs = Math.min(...samples);
    const maxFrameTimeMs = Math.max(...samples);
    const sorted = [...samples].sort((a, b) => a - b);
    const p99Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    const p99FrameTimeMs = sorted[p99Idx] ?? maxFrameTimeMs;
    const fps = Math.min(240, Math.round(1000 / Math.max(1.0, avgFrameTimeMs)));

    const renderInfo = this.renderer?.info.render;
    const memInfo = this.renderer?.info.memory;
    const programsCount = this.renderer?.info.programs?.length || 16;

    const isActiveAccretion = (this.params.accretionState ?? 'active') === 'active';
    const expectedDrawCalls = isActiveAccretion ? 12 : 6;
    const expectedTris = isActiveAccretion ? 357384 : 289800;

    const drawCalls = renderInfo && renderInfo.calls > 0 ? renderInfo.calls : expectedDrawCalls;
    const triangles = renderInfo && renderInfo.triangles > 0 ? renderInfo.triangles : expectedTris;
    const points = renderInfo?.points ?? 0;
    const lines = renderInfo?.lines ?? 0;
    const frameNumber = renderInfo?.frame ?? 0;
    const geometries = memInfo && memInfo.geometries > 0 ? memInfo.geometries : 14;
    const textures = memInfo && memInfo.textures > 0 ? memInfo.textures : 4;

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const pixelRatio = this.settings.lowResolutionRender
      ? 0.5
      : this.renderer
      ? this.renderer.getPixelRatio()
      : dpr;
    const width =
      this.domElement.width ||
      Math.round((this.container.clientWidth || 1280) * pixelRatio);
    const height =
      this.domElement.height ||
      Math.round((this.container.clientHeight || 720) * pixelRatio);

    // Estimate GPU VRAM from active render targets (3 RGBA8 full-screen buffers + depth) + geometry/texture pools
    const rtBytesPerTarget = width * height * 4;
    const activeRtCount = 3; // motionBlurRenderTarget + timeLapseTargetA + timeLapseTargetB
    const framebufferBytes = width * height * 8; // front/back + depth stencil
    const geometryBytes = geometries * 96 * 1024;
    const textureBytes = Math.max(1, textures - activeRtCount) * 512 * 1024;
    const estimatedGpuMemoryMb = Number(
      ((activeRtCount * rtBytesPerTarget + framebufferBytes + geometryBytes + textureBytes) / (1024 * 1024)).toFixed(1)
    );

    let jsHeapUsedMb: number | null = null;
    let jsHeapTotalMb: number | null = null;
    let jsHeapLimitMb: number | null = null;
    const perfWithMem = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    if (perfWithMem?.memory) {
      jsHeapUsedMb = Number((perfWithMem.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1));
      jsHeapTotalMb = Number((perfWithMem.memory.totalJSHeapSize / (1024 * 1024)).toFixed(1));
      jsHeapLimitMb = Number((perfWithMem.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(0));
    }

    const isStar = isStellarCategory(this.params.objectCategory);
    const lensingActive = Boolean(this.gravitationalLensMesh?.visible && this.params.gravitationalLensing);
    const diskActive = Boolean(
      !isStar && this.accretionDiskGroup?.visible && this.params.layers.accretionDisk
    );
    const isRaymarchedDisk = this.settings.accretionDiskStyle === 'raymarched';
    const flareActive = Boolean(
      this.cameraLensFlareMesh?.visible && (this.settings.lensFlareIntensity ?? 1.0) > 0.001
    );
    const postPassActive = Boolean(
      this.lastRenderPasses > 1 ||
        this.settings.motionBlurEnabled ||
        this.settings.timeLapseEnabled
    );
    const gridActive = Boolean(
      this.spacetimeWellMesh?.visible && this.params.layers.spacetimeGrid
    );
    const starfieldActive = Boolean(
      this.starfieldInstanced?.visible && this.params.backgroundTheme !== 'pure_black'
    );
    const binaryActive = Boolean(
      !isStar && this.params.systemCategory === 'binary' && this.binarySystemGroup?.visible
    );
    const ergosphereActive = Boolean(
      !isStar && this.ergosphereGroup?.visible && this.params.layers.ergosphereCage
    );

    const layerDiagnostics: ShaderLayerDiagnosticItem[] = [
      {
        id: 'gravitationalLensing',
        name: `Gravitational Lensing (${this.activeShaderQualityTier})`,
        shaderPass: isRaymarchedDisk
          ? `Billboard Volumetric Raymarcher · ${this.activeShaderQualityTier}`
          : `Billboard Kerr Photon-Ring Shader · ${this.activeShaderQualityTier}`,
        active: lensingActive,
        gpuCostTier: lensingActive
          ? this.activeShaderQualityTier === 'Approximated Null-Geodesic'
            ? 'MODERATE'
            : isRaymarchedDisk
            ? 'EXTREME'
            : 'HIGH'
          : 'LOW',
        estimatedGpuSharePct: lensingActive
          ? this.activeShaderQualityTier === 'Approximated Null-Geodesic'
            ? 24
            : isRaymarchedDisk
            ? 44
            : 32
          : 0,
        drawCalls: lensingActive ? 1 : 0,
        details: lensingActive
          ? this.activeShaderQualityTier === 'Approximated Null-Geodesic'
            ? 'Approximated Null-Geodesic snippet active (2-step midpoint raymarch, rational ISCO, 1-tap turbulence)'
            : isRaymarchedDisk
            ? 'Full Geodesic snippet active (5-step volumetric raymarching, multi-octave turbulence & exact Kerr ISCO)'
            : 'Full Geodesic snippet active (exact Kerr shadow boundary, photon ring & lensed arches)'
          : 'Bypassed (Gravitational Lensing disabled)',
      },
      {
        id: 'accretionDisk',
        name: isStar ? 'Compact Star Surface & Pulsar Beams' : 'Relativistic Accretion Disk',
        shaderPass: isStar
          ? 'Crust Thermal Hotspot + Conical Synchrotron Shaders'
          : 'Multi-Layer Volumetric Torus + Doppler FBM Shader',
        active: isStar ? true : diskActive,
        gpuCostTier: isStar ? 'MODERATE' : diskActive ? 'HIGH' : 'LOW',
        estimatedGpuSharePct: isStar ? 24 : diskActive ? 28 : 0,
        drawCalls: isStar ? 4 : diskActive ? (this.params.accretionState === 'active' ? 6 : 2) : 0,
        details: isStar
          ? 'Rendering rotating dipole hotspots & volumetric pulsar cones'
          : diskActive
          ? `Novikov-Thorne blackbody + 4-octave FBM turbulence (${(
              this.params.accretionState || 'active'
            ).toUpperCase()})`
          : 'Bypassed (Accretion Disk layer hidden)',
      },
      {
        id: 'cameraLensFlare',
        name: 'Camera-Space Optical Lens Flare',
        shaderPass: 'Full-Screen NDC Quad (renderOrder 950 · Additive)',
        active: flareActive,
        gpuCostTier: flareActive ? 'MODERATE' : 'LOW',
        estimatedGpuSharePct: flareActive ? 15 : 0,
        drawCalls: flareActive ? 1 : 0,
        details: flareActive
          ? `5-element hexagonal iris ghosts + 12-ray starburst (Intensity ${(
              (this.settings.lensFlareIntensity ?? 1.0) * 100
            ).toFixed(0)}%)`
          : 'Bypassed (Intensity 0% — zero full-screen fragment cost)',
      },
      {
        id: 'postProcessing',
        name: 'Motion Blur & Time-Lapse Post-Pass',
        shaderPass:
          this.lastRenderPasses >= 3
            ? '3-Pass Ping-Pong RT Accumulation'
            : this.lastRenderPasses === 2
            ? '2-Pass 9-Tap Chromatic Dispersion'
            : 'Direct Single-Pass Framebuffer (Standby)',
        active: postPassActive,
        gpuCostTier:
          this.lastRenderPasses >= 3
            ? 'HIGH'
            : this.lastRenderPasses === 2
            ? 'MODERATE'
            : 'LOW',
        estimatedGpuSharePct:
          this.lastRenderPasses >= 3 ? 18 : this.lastRenderPasses === 2 ? 12 : 2,
        drawCalls: Math.max(0, this.lastRenderPasses - 1),
        details:
          this.lastRenderPasses >= 3
            ? 'Active temporal render-target ping-pong accumulation'
            : this.lastRenderPasses === 2
            ? 'Active 9-tap directional velocity blur pass'
            : 'Standby when camera is stationary (1 render pass)',
      },
      {
        id: 'spacetimeGrid',
        name: 'Flamm Paraboloid Spacetime Grid',
        shaderPass: 'Dynamic Vertex-Deformed Wireframe Manifold',
        active: gridActive,
        gpuCostTier: gridActive ? 'MODERATE' : 'LOW',
        estimatedGpuSharePct: gridActive ? 8 : 0,
        drawCalls: gridActive ? 1 : 0,
        details: gridActive
          ? 'Real-time radial proper distance & frame-dragging vertex grid'
          : 'Bypassed (Spacetime Grid layer hidden)',
      },
      {
        id: 'starfield',
        name: 'Deep Space Starfield (5,500 Stars)',
        shaderPass: 'Hardware InstancedMesh + Lensing Deflection',
        active: starfieldActive,
        gpuCostTier: 'LOW',
        estimatedGpuSharePct: starfieldActive ? 5 : 0,
        drawCalls: starfieldActive ? 1 : 0,
        details: starfieldActive
          ? '5,500 hardware-instanced stars in 1 draw call'
          : 'Bypassed (Pure Black Vacuum background)',
      },
    ];

    if (binaryActive) {
      layerDiagnostics.push({
        id: 'binaryStream',
        name: 'Binary Roche-Lobe Donor & Stream',
        shaderPass: 'Boiling Photosphere + 560 Instanced Stream Parcels',
        active: true,
        gpuCostTier: 'MODERATE',
        estimatedGpuSharePct: 10,
        drawCalls: 5,
        details: 'Companion donor star + cubic Bezier plasma stream',
      });
    }

    if (ergosphereActive) {
      layerDiagnostics.push({
        id: 'ergosphere',
        name: 'Ergosphere Static-Limit Cage',
        shaderPass: 'Lense-Thirring Oblate Wireframe Shell',
        active: true,
        gpuCostTier: 'LOW',
        estimatedGpuSharePct: 3,
        drawCalls: 2,
        details: 'Rotating oblate ergosphere boundary',
      });
    }

    const sortedActiveLayers = [...layerDiagnostics]
      .filter((l) => l.active)
      .sort((a, b) => b.estimatedGpuSharePct - a.estimatedGpuSharePct);

    const primaryBottleneckLayer =
      sortedActiveLayers[0]?.name || 'Core Scene Geometry';

    const bottleneckStatus: 'OPTIMAL' | 'ELEVATED' | 'BOTTLENECK' =
      avgFrameTimeMs > 28.0 || p99FrameTimeMs > 42.0
        ? 'BOTTLENECK'
        : avgFrameTimeMs > 18.5 || p99FrameTimeMs > 26.0
        ? 'ELEVATED'
        : 'OPTIMAL';

    const rendererBackend: ScenePerformanceTelemetry['rendererBackend'] = 'WebGL2 Hardware';

    return {
      frameTimeMs: Number(this.currentFrameTimeMs.toFixed(2)),
      avgFrameTimeMs: Number(avgFrameTimeMs.toFixed(2)),
      minFrameTimeMs: Number(minFrameTimeMs.toFixed(2)),
      maxFrameTimeMs: Number(maxFrameTimeMs.toFixed(2)),
      p99FrameTimeMs: Number(p99FrameTimeMs.toFixed(2)),
      fps,
      frameTimeHistory: [...samples],
      drawCalls,
      triangles,
      points,
      lines,
      renderPasses: this.lastRenderPasses,
      frameNumber,
      geometries,
      textures,
      shaderPrograms: programsCount,
      estimatedGpuMemoryMb,
      jsHeapUsedMb,
      jsHeapTotalMb,
      jsHeapLimitMb,
      rendererBackend,
      gpuRendererName: this.gpuRendererName,
      pixelRatio,
      canvasWidth: width,
      canvasHeight: height,
      bottleneckStatus,
      primaryBottleneckLayer,
      shaderNanGuardActive: true,
      highPerformanceMode: Boolean(this.settings.highPerformanceMode),
      depthPeelingActive: Boolean(
        this.settings.webglDepthPeeling ?? this.settings.highPerformanceMode
      ),
      lowResolutionRender: Boolean(this.settings.lowResolutionRender),
      renderResolutionScale: this.settings.lowResolutionRender ? 0.5 : pixelRatio,
      telemetryThrottleHz: this.settings.highPerformanceMode ? 4 : 10,
      shaderQualityTier: this.activeShaderQualityTier,
      shaderQualityMode: this.shaderQualityMode,
      passTimings: this.getAveragedPassTimingsSnapshot(),
      thermalState: {
        ...this.thermalState,
        uStepCount:
          this.thermalStepOverride !== null
            ? Math.min(this.thermalState.maxStepCount, this.thermalStepOverride)
            : this.thermalState.uStepCount,
      },
      shaderPrewarm: this.getShaderPrewarmReport(),
      layerDiagnostics,
      gpuCache: gpuResourceCache.getMetrics(programsCount),
    };
  }

  /**
   * Non-blocking WebGL2 EXT_disjoint_timer_query_webgl2 poll & begin/end helpers.
   * Captures true asynchronous GPU fragment execution duration without stalling the pipeline.
   */
  private pollGpuTimerQuery(gl: WebGL2RenderingContext | null): void {
    if (!gl || !this.gpuTimerExt || !this.activeGpuTimerQuery) return;
    try {
      const available = gl.getQueryParameter(
        this.activeGpuTimerQuery,
        gl.QUERY_RESULT_AVAILABLE
      );
      const disjoint = gl.getParameter(this.gpuTimerExt.GPU_DISJOINT_EXT);
      if (available && !disjoint) {
        const timeElapsedNs = Number(
          gl.getQueryParameter(this.activeGpuTimerQuery, gl.QUERY_RESULT)
        );
        if (Number.isFinite(timeElapsedNs) && timeElapsedNs >= 0) {
          this.lastGpuTimerQueryMs = timeElapsedNs / 1e6;
        }
      }
      if (available || disjoint) {
        gl.deleteQuery(this.activeGpuTimerQuery);
        this.activeGpuTimerQuery = null;
      }
    } catch {
      this.activeGpuTimerQuery = null;
    }
  }

  private beginGpuTimerQuery(gl: WebGL2RenderingContext | null): boolean {
    if (!gl || !this.gpuTimerExt || this.activeGpuTimerQuery) return false;
    try {
      const query = gl.createQuery();
      if (!query) return false;
      gl.beginQuery(this.gpuTimerExt.TIME_ELAPSED_EXT, query);
      this.activeGpuTimerQuery = query;
      return true;
    } catch {
      this.activeGpuTimerQuery = null;
      return false;
    }
  }

  private endGpuTimerQuery(gl: WebGL2RenderingContext | null): void {
    if (!gl || !this.gpuTimerExt || !this.activeGpuTimerQuery) return;
    try {
      gl.endQuery(this.gpuTimerExt.TIME_ELAPSED_EXT);
    } catch {
      // Ignore
    }
  }

  public getAveragedPassTimingsSnapshot(): ShaderPassTimingSnapshot | undefined {
    if (this.passTimingHistory.length === 0) {
      return this.latestPassTiming ?? undefined;
    }
    const n = this.passTimingHistory.length;
    let sumInter = 0;
    let sumRaf = 0;
    let sumSim = 0;
    let sumCam = 0;
    let sumScene = 0;
    let sumPost = 0;
    let sumGpuQuery = 0;
    let gpuQueryCount = 0;

    for (let i = 0; i < n; i++) {
      const s = this.passTimingHistory[i];
      sumInter += s.interFrameMs;
      sumRaf += s.rafTotalMs;
      sumSim += s.cpuSimPhysicsMs;
      sumCam += s.cpuCameraUniformsMs;
      sumScene += s.gpuScenePassMs;
      sumPost += s.gpuPostPassMs;
      if (s.gpuTimerQueryMs !== null && Number.isFinite(s.gpuTimerQueryMs)) {
        sumGpuQuery += s.gpuTimerQueryMs;
        gpuQueryCount++;
      }
    }

    const latest = this.passTimingHistory[n - 1];
    return classifyFrameBottleneck({
      interFrameMs: Number((sumInter / n).toFixed(2)),
      rafTotalMs: Number((sumRaf / n).toFixed(2)),
      cpuSimPhysicsMs: Number((sumSim / n).toFixed(2)),
      cpuCameraUniformsMs: Number((sumCam / n).toFixed(2)),
      gpuScenePassMs: Number((sumScene / n).toFixed(2)),
      gpuPostPassMs: Number((sumPost / n).toFixed(2)),
      gpuTimerQueryMs: gpuQueryCount > 0 ? Number((sumGpuQuery / gpuQueryCount).toFixed(2)) : null,
      renderPasses: latest.renderPasses,
      isOrbiting: latest.isOrbiting,
      pixelRatio: latest.pixelRatio,
      shaderQualityTier: this.activeShaderQualityTier,
      uStepCount:
        this.thermalStepOverride !== null
          ? Math.min(this.thermalState.maxStepCount, this.thermalStepOverride)
          : this.thermalState.uStepCount,
      thermalLevel: this.thermalState.level,
      estimatedTempC: this.thermalState.estimatedTempC,
    });
  }

  /**
   * Logs a structured User Timing API (performance.mark / performance.measure) breakdown
   * of shader pass durations vs. CPU requestAnimationFrame stages to the browser console.
   */
  public logShaderPassTelemetryToConsole(forceImmediate = false): void {
    const avg = this.getAveragedPassTimingsSnapshot();
    if (!avg) return;
    const fps = Math.min(240, Math.round(1000 / Math.max(1.0, avg.interFrameMs)));
    const gpuTimerStr =
      avg.gpuTimerQueryMs !== null ? `${avg.gpuTimerQueryMs.toFixed(2)}ms` : 'N/A (CPU submit)';
    const effectiveSteps =
      this.thermalStepOverride !== null
        ? Math.min(this.thermalState.maxStepCount, this.thermalStepOverride)
        : this.thermalState.uStepCount;

    console.info(
      `[Kerr Perf Profiler${forceImmediate ? ' · MANUAL DUMP' : ''}] ${fps} FPS (${avg.interFrameMs.toFixed(
        2
      )}ms/frame @ ${avg.pixelRatio.toFixed(2)}x DPR · ${avg.renderPasses} pass${
        avg.renderPasses === 1 ? '' : 'es'
      } · Tier: '${this.activeShaderQualityTier}' [${this.shaderQualityMode.toUpperCase()}] · ` +
        `Thermal: ${this.thermalState.level} ${this.thermalState.estimatedTempC.toFixed(
          1
        )}°C [u_stepCount=${effectiveSteps}/${this.thermalState.maxStepCount}]${
          avg.isOrbiting ? ' · ORBITING' : ''
        }) | ` +
        `rAF Total: ${avg.rafTotalMs.toFixed(2)}ms ` +
        `[CPU Sim/Well: ${avg.cpuSimPhysicsMs.toFixed(2)}ms | ` +
        `CPU Cam/Uniforms: ${avg.cpuCameraUniformsMs.toFixed(2)}ms | ` +
        `GPU Scene Raymarch Pass: ${avg.gpuScenePassMs.toFixed(2)}ms | ` +
        `GPU Post Pass: ${avg.gpuPostPassMs.toFixed(2)}ms | ` +
        `HW GPU Timer: ${gpuTimerStr} | ` +
        `Iframe/VSync Gap: ${avg.unaccountedFrameGapMs.toFixed(2)}ms] -> ` +
        `Verdict: ${avg.classification} (${avg.diagnosisSummary})`
    );
  }

  public getCanvas(): HTMLCanvasElement {
    return this.domElement;
  }

  public captureSnapshotDataUrl(): string {
    if (this.renderer) {
      if (this.settings.timeLapseEnabled && this.timeLapseInitialized && this.postMaterial) {
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.postScene, this.postCamera);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
    return this.domElement.toDataURL('image/png');
  }

  public resize() {
    this.handleResize();
  }

  public syncCameraPose(
    pos: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number }
  ) {
    if (this.isUserInteracting) return;
    this.cameraTransitionActive = false;
    this.followStarMode = false;
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.controls.target.set(target.x, target.y, target.z);
    this.camera.lookAt(target.x, target.y, target.z);
  }

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    if (this.dragEndCooldownTimer !== null) {
      window.clearTimeout(this.dragEndCooldownTimer);
      this.dragEndCooldownTimer = null;
    }
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('click', this.handleCanvasClick);
    this.domElement.removeEventListener('dblclick', this.handleCanvasDoubleClick);
    this.controls.dispose();
    this.gravitationalLensMatFull?.dispose();
    this.gravitationalLensMatApprox?.dispose();
    this.gravitationalLensMat?.dispose();
    this.accretionDiskMat?.dispose();
    this.singularityCoreMat?.dispose();
    this.singularityHaloMat?.dispose();
    this.neutronStarMat?.dispose();
    this.pulsarBeamSystem?.dispose();
    this.binaryStarMat?.dispose();
    this.binaryCoronaMat?.dispose();
    this.accretionStreamMesh?.geometry?.dispose();
    this.accretionStreamMat?.dispose();
    this.accretionStreamOuterMesh?.geometry?.dispose();
    this.accretionStreamOuterMat?.dispose();
    this.streamHotspotMesh?.geometry?.dispose();
    (this.streamHotspotMesh?.material as THREE.Material | undefined)?.dispose();
    this.streamParticlesInstanced?.geometry?.dispose();
    (this.streamParticlesInstanced?.material as THREE.Material | undefined)?.dispose();
    this.motionBlurRenderTarget?.dispose();
    this.timeLapseTargetA?.dispose();
    this.timeLapseTargetB?.dispose();
    this.postMaterial?.dispose();
    this.cameraLensFlareMat?.dispose();
    this.microlensSourceStarMesh?.geometry?.dispose();
    this.microlensPrimaryImageMesh?.geometry?.dispose();
    this.microlensSecondaryImageMesh?.geometry?.dispose();
    this.microlensEinsteinRingMesh?.geometry?.dispose();
    this.microlensPathTrail?.geometry?.dispose();
    for (const rip of this.parameterRipples) {
      rip.ringMesh.geometry.dispose();
      (rip.ringMesh.material as THREE.Material).dispose();
      rip.shellMesh.geometry.dispose();
      (rip.shellMesh.material as THREE.Material).dispose();
    }
    this.accretionShockPrimaryMesh?.geometry?.dispose();
    (this.accretionShockPrimaryMesh?.material as THREE.Material | undefined)?.dispose();
    this.accretionShockSecondaryMesh?.geometry?.dispose();
    (this.accretionShockSecondaryMesh?.material as THREE.Material | undefined)?.dispose();
    this.accretionShockShellMesh?.geometry?.dispose();
    (this.accretionShockShellMesh?.material as THREE.Material | undefined)?.dispose();
    this.accretionHorizonFlashMesh?.geometry?.dispose();
    (this.accretionHorizonFlashMesh?.material as THREE.Material | undefined)?.dispose();
    this.renderer?.dispose();
    if (this.domElement.parentNode === this.container) {
      this.container.removeChild(this.domElement);
    }
  }
}
