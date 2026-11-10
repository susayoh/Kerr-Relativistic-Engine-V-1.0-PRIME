import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  BlackHoleParams,
  GeodesicTrajectory,
  computeNullGeodesic,
  computeRelativisticMetrics,
  BackgroundThemeId,
  BACKGROUND_THEMES,
} from '../physics/gravitationalPhysics';
import { relativisticAudio } from '../audio/relativisticAudio';

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

export interface VisualizerSettings {
  accretionDiskStyle: AccretionDiskStyle;
  bloomIntensity: number;
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
  phoneMode: boolean;
  hapticsEnabled: boolean;
  includeUiInExport: boolean;
  rapidAdjustmentRipples: boolean;
  accretionShockwaveEnabled: boolean;
}

export const isMobileDevice = (() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
})();

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
  accretionDiskStyle: 'classic',
  bloomIntensity: 1.0,
  lockBackground: false,
  syncSingularityWithAnatomy: true,
  alwaysShowSingularity: false,
  nakedDistortionIntensity: 1.25,
  motionBlurEnabled: !isMobileDevice,
  screenShakeEnabled: true,
  cameraFov: isMobileDevice ? 56 : 46,
  autoRotate: false,
  autoRotateSpeed: 0.6,
  showLeftHud: !isMobileDevice,
  showOverheadMap: !isMobileDevice,
  showTimeDilation: false,
  showCursorTelemetry: !isMobileDevice,
  phoneMode: isMobileDevice,
  hapticsEnabled: true,
  includeUiInExport: false,
  rapidAdjustmentRipples: true,
  accretionShockwaveEnabled: true,
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

export type CameraPresetId = 'equatorial' | 'polar' | 'grazing' | 'star' | 'well';

export interface InspectedFeature {
  title: string;
  subtitle: string;
  formula: string;
  description: string;
}

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

    // In Active mode (uAccretionState > 0.01), drastically expand vertical (Y-axis) density scale
    // with 3D turbulent MHD vertical billowing so the equatorial torus seamlessly bridges into the lensed arcs
    if (uAccretionState > 0.01) {
      float innerRamp = smoothstep(1.05, 2.35, r);
      float outerEnvelope = 1.0 - 0.32 * smoothstep(10.8, 16.2, r);
      float scaleHeight = (0.52 + 0.24 * max(0.0, r - 1.55)) * innerRamp * outerEnvelope;

      vec2 unitDir = pos.xy / max(0.0001, r);
      float cosPhi = unitDir.x;
      float sinPhi = unitDir.y;
      float cos2Phi = cosPhi * cosPhi - sinPhi * sinPhi;
      float sin2Phi = 2.0 * cosPhi * sinPhi;

      float billow = sin(r * 2.5 - uTurbulenceBuffer.z * 0.65 + cos2Phi * 1.9 + aVerticalLayer * 2.4) * 0.22
                   + cos(r * 5.1 - uTurbulenceBuffer.x * 2.4 + sin2Phi * 1.6 - aVerticalLayer * 1.7) * 0.14;

      // Local Z corresponds to world vertical Y because the ring mesh is rotated -PI/2 around X
      pos.z += (aVerticalLayer * scaleHeight + billow * scaleHeight * (0.38 + 0.62 * abs(aVerticalLayer))) * uAccretionState;
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

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vVerticalLayer;

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
    float radialHeat = pow(clamp(1.0 - normR, 0.0, 1.0), 0.82);
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

  void main() {
    if (uExpansionProgress < 0.02) {
      discard;
    }

    float r = length(vLocalPos.xy);
    float spin = clamp(uDiskParams.x, 0.0, 1.0);
    float accretionRate = uDiskParams.y;
    int spectralMode = int(uDiskParams.z);
    float absLayer = abs(vVerticalLayer);

    // In Quiescent mode, discard any elevated volumetric strata so only the razor-thin midplane renders
    if (uAccretionState < 0.5 && absLayer > 0.01) {
      discard;
    }

    // Vertical Y-axis density falloff across the thick volumetric torus in Active mode
    float verticalDensityFalloff = exp(-pow(absLayer, 1.45) * 1.55);
    float layerPhaseOffset = vVerticalLayer * 1.65 * uAccretionState;

    // Classic Disk Mode (uDiskStyle < 0.5): Original vibrant 3D equatorial accretion disk
    if (uDiskStyle < 0.5) {
      float r_horizon = mix(2.05, 1.35, spin * 0.65);
      float rIn = max(r_horizon + 0.10, mix(2.55, 1.45, spin * 0.75));
      float rOut = mix(12.2, 14.4, uAccretionState);

      if (r < r_horizon) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      if (r < rIn || r > rOut) {
        discard;
      }

      // Continuous 2PI unit vector so the classic disk has zero horizontal slice seam
      vec2 unitDir = vLocalPos.xy / max(0.0001, r);
      float omega = 3.2 / (pow(r, 1.45) + 0.15 * spin);
      float twist = uTurbulenceBuffer.x * omega * 1.5 - 1.35 * log(max(0.1, r / rIn)) + layerPhaseOffset * 0.35;
      float ct = cos(twist);
      float st = sin(twist);
      vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

      float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
      float sin2Phi = 2.0 * rotDir.x * rotDir.y;
      float cos3Phi = 4.0 * rotDir.x * rotDir.x * rotDir.x - 3.0 * rotDir.x;

      float turbFreqBoost = mix(1.0, 1.35, uAccretionState);
      float waveA = sin(r * uTurbulenceHarmonics.x * 3.1 * turbFreqBoost - uTurbulenceBuffer.z * 0.55 + cos2Phi * 1.2 + uTurbulenceBuffer.y + layerPhaseOffset);
      float waveB = cos(r * uTurbulenceHarmonics.x * 6.4 * turbFreqBoost - uTurbulenceBuffer.z * 0.8 + waveA * (1.4 + 0.45 * uAccretionState) + sin2Phi * 0.9 - layerPhaseOffset * 0.7);
      float waveC = sin(r * 3.8 * turbFreqBoost + cos3Phi * 1.1 - uTurbulenceBuffer.w + layerPhaseOffset * 1.2);
      float diskTurb = waveA * 0.5 + 0.5;
      float diskRings = waveB * 0.5 + 0.5;
      float diskFilaments = mix(mix(diskTurb, diskRings, uTurbulenceHarmonics.z), waveC * 0.5 + 0.5, 0.25 + 0.12 * uAccretionState);

      vec2 toCamXZ = length(cameraPosition.xz) > 0.001
        ? normalize(cameraPosition.xz)
        : vec2(0.0, 1.0);
      vec2 worldUnitXZ = vWorldPos.xz / max(0.0001, length(vWorldPos.xz));
      vec2 tanVelXZ = vec2(-worldUnitXZ.y, worldUnitXZ.x);
      float approachCos = dot(tanVelXZ, toCamXZ);

      float beta = clamp(uDopplerCoeffs.y * inversesqrt(max(0.65, r - 0.5)), 0.05, 0.78);
      float dopplerFactor = 1.0 / (1.0 - beta * approachCos * uDopplerCoeffs.x);
      float dopplerBoost = pow(clamp(dopplerFactor, 0.35, 2.35), uDopplerCoeffs.w);

      float normR = clamp((r - rIn) / (rOut - rIn), 0.0, 1.0);
      float shockGrowth = 1.0 - pow(1.0 - clamp(uExpansionProgress, 0.0, 1.0), 2.6);
      float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
      float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);
      if (unfurlMask <= 0.001) {
        discard;
      }
      // Shockwave-coupled leading rim compression as the disk grows outward with the shockwave
      float ignitionWave = exp(-pow((normR - diskUnfurl) / 0.09, 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

      float innerTaper = smoothstep(rIn, rIn + mix(0.42, 0.28, uAccretionState), r);
      float outerTaper = 1.0 - smoothstep(rOut - mix(2.2, 3.2, uAccretionState), rOut, r);
      float radialProfile = pow(1.0 - normR, mix(1.15, 0.92, uAccretionState)) * innerTaper * outerTaper;

      // Constraint 2: Base Emission Multiplier significantly boosted in Active mode
      float activeEmissionMult = mix(1.0, 2.45, uAccretionState) * (1.0 + ignitionWave);
      float flux = radialProfile * (0.30 + 0.70 * diskFilaments) * dopplerBoost * (0.65 + 0.45 * accretionRate) * activeEmissionMult;

      float sonicRarefaction = 0.0;
      float sonicCompression = 0.0;
      if (uPulseStrength > 0.001) {
        float dShock = r - uPulseRadius;
        float leadFront = exp(-pow(dShock / 0.32, 2.0));
        float tailFront = exp(-pow((dShock + 1.35) / 0.42, 2.0)) * 0.65;
        float rarefactionTrough = exp(-pow((dShock + 0.62) / 0.52, 2.0));
        float acousticWake = sin(dShock * 5.8) * exp(-abs(dShock + 1.1) * 0.42) * step(dShock, 0.15) * 0.25;
        sonicCompression = clamp((leadFront + tailFront + max(0.0, acousticWake)) * uPulseStrength * innerTaper * outerTaper, 0.0, 1.0);
        sonicRarefaction = clamp(rarefactionTrough * uPulseStrength * innerTaper * outerTaper, 0.0, 0.88);
      }

      float lutU = clamp(flux * 0.65, 0.02, 0.99);
      vec3 baseLut = texture2D(uSpectrumLut, vec2(lutU, 0.5)).rgb;

      // Constraint 3: Spectral Filter dictates final color, while Active mode's boosted emission pushes
      // the standard thermal filter (spectralMode == 0) into white-hot core -> bright gold -> red outer edge
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
      float coreWhiteHot = exp(-normR * mix(3.2, 4.2, uAccretionState)) * (0.65 + 0.85 * uAccretionState) * max(0.45, bloomMult) * dopplerBoost;
      vec3 coreTone = (spectralMode == 2)
        ? vec3(0.88, 0.97, 1.0)
        : (spectralMode == 3)
        ? mix(vec3(1.0, 0.65, 0.35), vec3(0.75, 0.95, 1.0), clamp(approachCos * 0.5 + 0.5, 0.0, 1.0))
        : mix(vec3(1.0, 0.88, 0.56), vec3(1.0, 0.99, 0.94), uAccretionState);

      vec3 bloomGlow = coreTone * coreWhiteHot + baseLut * (0.45 * bloomMult * flux);
      vec3 diskColor = baseLut * (0.48 + (0.75 + 0.60 * bloomMult) * flux) + bloomGlow;
      if (uAccretionState > 0.5 && spectralMode == 0) {
        // Preserve rich bright-gold mid-disk and deep-red outer taper while keeping the inner core blazing white-hot
        vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
        float outerRedMask = smoothstep(0.52, 0.92, normR);
        diskColor = mix(diskColor, activeThermal * (0.75 + 0.55 * radialProfile), outerRedMask * 0.68);
      }

      float bloomAlphaBoost = 0.82 + 0.22 * min(2.0, bloomMult);
      float baseAlpha = clamp(radialProfile * (0.52 + 0.48 * diskFilaments) * min(1.4, dopplerBoost) * bloomAlphaBoost * mix(1.0, 1.25, uAccretionState), 0.0, 0.98);
      float stratumWeight = (absLayer > 0.01) ? (verticalDensityFalloff * 0.62) : 1.0;
      float diskAlpha = clamp(baseAlpha * stratumWeight * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress), 0.0, 0.98);

      if (uPulseStrength > 0.001) {
        // Sonic boom N-wave: dark evacuated decompression cavity + desaturated neutral grey shock front (no bright colors)
        float luma = dot(diskColor, vec3(0.299, 0.587, 0.114));
        vec3 neutralShock = mix(vec3(luma * 0.72), vec3(0.52, 0.55, 0.60), 0.35);
        diskColor = mix(diskColor, neutralShock, sonicCompression * 0.78);
        diskColor *= (1.0 - sonicRarefaction * 0.76);
        diskAlpha = clamp(diskAlpha * (1.0 - sonicRarefaction * 0.42 + sonicCompression * 0.15), 0.0, 0.98);
      }

      gl_FragColor = vec4(diskColor, diskAlpha);
      return;
    }

    // Volumetric Raymarched Mode (uDiskStyle >= 0.5)
    float r_horizon = mix(1.95, 1.62, spin * 0.45);
    float rIn = mix(2.38, 1.92, spin * 0.55);
    float rOut = mix(15.6, 16.2, uAccretionState);

    if (r < r_horizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    if (r < rIn || r > rOut) {
      discard;
    }

    vec2 unitDir = vLocalPos.xy / max(0.0001, r);
    float omega = 3.2 / (pow(r, 1.35) + 0.15 * spin);
    float twist = uTurbulenceBuffer.x * omega * 1.5 - 1.35 * log(max(0.1, r / rIn)) + layerPhaseOffset * 0.35;
    float ct = cos(twist);
    float st = sin(twist);
    vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

    float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
    float sin2Phi = 2.0 * rotDir.x * rotDir.y;
    float cos3Phi = 4.0 * rotDir.x * rotDir.x * rotDir.x - 3.0 * rotDir.x;

    float turbBoost = mix(1.0, 1.32, uAccretionState);
    float waveA = sin(r * 4.4 * turbBoost - uTurbulenceBuffer.z * 0.55 + cos2Phi * 1.15 + uTurbulenceBuffer.y + layerPhaseOffset);
    float waveB = cos(r * 8.8 * turbBoost - uTurbulenceBuffer.z * 0.8 + waveA * (1.35 + 0.4 * uAccretionState) + sin2Phi * 0.85 - layerPhaseOffset * 0.6);
    float waveC = sin(r * 2.9 * turbBoost + cos3Phi * 0.9 - uTurbulenceBuffer.w + layerPhaseOffset);
    float diskTurb = waveA * 0.5 + 0.5;
    float diskRings = waveB * 0.5 + 0.5;
    float plasmaBands = pow(mix(diskTurb, diskRings, 0.45), 1.25);
    float diskFilaments = clamp(mix(plasmaBands, waveC * 0.5 + 0.5, 0.25), 0.14, 1.0);

    vec2 toCamXZ = length(cameraPosition.xz) > 0.001
      ? normalize(cameraPosition.xz)
      : vec2(0.0, 1.0);
    vec2 worldUnitXZ = vWorldPos.xz / max(0.0001, length(vWorldPos.xz));
    vec2 tanVelXZ = vec2(-worldUnitXZ.y, worldUnitXZ.x);
    float approachCos = dot(tanVelXZ, toCamXZ);

    float beta = clamp(0.48 * inversesqrt(max(1.0, r - 0.6)), 0.05, 0.54);
    float dopplerFactor = 1.0 / (1.0 - beta * approachCos * uDopplerCoeffs.x);
    float dopplerBoost = mix(
      1.0,
      clamp(pow(clamp(dopplerFactor, 0.52, 1.62), 1.28), 0.48, 1.72),
      clamp(uDopplerCoeffs.x, 0.0, 1.0)
    );

    float normR = clamp((r - rIn) / (rOut - rIn), 0.0, 1.0);
    float shockGrowth = 1.0 - pow(1.0 - clamp(uExpansionProgress, 0.0, 1.0), 2.6);
    float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
    float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);
    if (unfurlMask <= 0.001) {
      discard;
    }
    float ignitionWave = exp(-pow((normR - diskUnfurl) / 0.09, 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

    float innerTaper = smoothstep(rIn, rIn + 0.25, r);
    float corePeak = exp(-normR * 2.1);
    float sustainedBody = pow(max(0.0, 1.0 - normR * 0.68), 0.55);
    float outerTaper = 1.0 - smoothstep(0.72, 1.0, normR);
    float radialProfile = mix(sustainedBody, corePeak, 0.35) * innerTaper * outerTaper;

    float activeEmissionMult = mix(1.0, 2.35, uAccretionState) * (1.0 + ignitionWave);
    float accretionScale = (0.95 + 0.52 * clamp(accretionRate, 0.0, 2.5)) * activeEmissionMult;
    float innerCoreBoost = 1.0 + mix(1.65, 2.65, uAccretionState) * exp(-normR * 5.2);
    float flux = radialProfile * innerCoreBoost * (0.34 + 0.66 * diskFilaments) * dopplerBoost * accretionScale;

    float sonicRarefaction = 0.0;
    float sonicCompression = 0.0;
    if (uPulseStrength > 0.001) {
      float dShock = r - uPulseRadius;
      float leadFront = exp(-pow(dShock / 0.35, 2.0));
      float tailFront = exp(-pow((dShock + 1.40) / 0.45, 2.0)) * 0.65;
      float rarefactionTrough = exp(-pow((dShock + 0.65) / 0.55, 2.0));
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
      baseLut = mix(baseLut * activeThermal, activeThermal, 0.78);
    } else {
      baseLut = mix(baseLut * physicalColorGradient, physicalColorGradient, 0.52);
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float whiteCoreGlow = smoothstep(mix(0.24, 0.32, uAccretionState), 0.0, normR) * (0.50 + 0.50 * diskFilaments) * dopplerBoost * (0.35 + 0.65 * bloomMult) * mix(1.0, 1.65, uAccretionState);
    vec3 coreTone = (spectralMode == 2) ? vec3(0.88, 0.97, 1.0) : vec3(1.0, 0.96, 0.84);
    vec3 diskColor = baseLut * (0.85 + (1.15 + 0.80 * bloomMult) * flux) + coreTone * whiteCoreGlow * (0.75 + 0.55 * bloomMult);
    float baseAlpha = clamp(pow(radialProfile, 0.68) * (0.62 + 0.38 * diskFilaments) * min(1.30, dopplerBoost) * (0.85 + 0.18 * min(2.0, bloomMult)) * mix(1.0, 1.2, uAccretionState), 0.0, 0.98);
    float stratumWeight = (absLayer > 0.01) ? (verticalDensityFalloff * 0.62) : 1.0;
    float diskAlpha = clamp(baseAlpha * stratumWeight * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress), 0.0, 0.98);

    vec3 tonemappedColor = acesFilm(diskColor * (1.05 + 0.23 * bloomMult));
    if (uPulseStrength > 0.001) {
      float luma = dot(tonemappedColor, vec3(0.299, 0.587, 0.114));
      vec3 neutralShock = mix(vec3(luma * 0.72), vec3(0.52, 0.55, 0.60), 0.35);
      tonemappedColor = mix(tonemappedColor, neutralShock, sonicCompression * 0.78);
      tonemappedColor *= (1.0 - sonicRarefaction * 0.76);
      diskAlpha = clamp(diskAlpha * (1.0 - sonicRarefaction * 0.42 + sonicCompression * 0.15), 0.0, 0.98);
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

const LENSING_FRAGMENT_SHADER = `
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

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float fastTurb2D(vec2 p) {
    return (sin(p.x * 1.35 + cos(p.y * 1.65)) + cos(p.y * 1.85 - sin(p.x * 1.45))) * 0.25 + 0.5;
  }

  float gyroidOctave(vec3 p) {
    return dot(sin(p), cos(p.yzx)) * 0.3333 + 0.5;
  }

  // Fast 3-octave 3D Fractional Brownian Motion (fBM) without heavy simplex lattice instruction bloat
  float fbmSphere(vec3 p) {
    float v = 0.52 * gyroidOctave(p * 2.2);
    p = vec3(p.y + p.z * 0.6, p.z - p.x * 0.6, p.x + p.y * 0.6) * 1.65 + vec3(1.7, 3.1, 2.3);
    v += 0.30 * gyroidOctave(p * 2.2);
    p = vec3(p.y - p.z * 0.6, p.z + p.x * 0.6, p.x - p.y * 0.6) * 1.65 + vec3(4.1, 1.9, 3.7);
    v += 0.18 * gyroidOctave(p * 2.2);
    return clamp(v, 0.0, 1.0);
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
      float flareFilaments = pow(clamp(1.0 - abs(q1 - 0.52) * 3.6, 0.0, 1.0), 2.4);

      vec3 colUmbra       = vec3(0.45, 0.06, 0.01);
      vec3 colPhotosphere = vec3(0.98, 0.38, 0.05);
      vec3 colGranulePeak = vec3(1.00, 0.78, 0.24);
      vec3 colSolarFlare  = vec3(1.00, 0.98, 0.90);

      vec3 surfaceCol = mix(colUmbra, colPhotosphere, sunspots);
      surfaceCol = mix(surfaceCol, colGranulePeak, granules);
      surfaceCol = mix(surfaceCol, colSolarFlare, flareFilaments * 0.65);

      float fresnel = pow(1.0 - ndv, 2.15);
      vec3 coronaGlow = vec3(1.00, 0.56, 0.14) * fresnel * 1.75 + vec3(1.00, 0.93, 0.74) * pow(1.0 - ndv, 5.0) * 1.15;
      float limbDarkening = mix(0.68, 1.15, pow(ndv, 0.42));

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
    float radialHeat = pow(clamp(1.0 - normR, 0.0, 1.0), 0.82);
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

    if (uExpansionProgress < 0.02 || rHit <= r_horizon || rHit < rIn || rHit > rOut) {
      return;
    }

    vec2 unitDir = hitXZ / max(0.0001, rHit);
    float omega = 3.2 / (pow(rHit, 1.35) + 0.15 * spin);
    float twist = uTime * omega * 1.5 - 1.35 * log(max(0.1, rHit / rIn)) + verticalY * 0.45 * uAccretionState;
    float ct = cos(twist);
    float st = sin(twist);
    vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

    float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
    float sin2Phi = 2.0 * rotDir.x * rotDir.y;

    float turbScale = mix(1.0, 1.35, uAccretionState);
    float turbA = fastTurb2D(rotDir * (rHit * 0.55 * turbScale) + vec2(uTime * 0.12, -uTime * 0.10 + verticalY * 0.35));
    float turbB = fastTurb2D(rotDir * (rHit * 1.20 * turbScale) - vec2(uTime * 0.16, uTime * 0.14 - verticalY * 0.45));

    float band1 = sin(rHit * 4.4 * turbScale - uTime * 1.8 + cos2Phi * 1.15 + (turbA - 0.5) * (2.0 + 0.65 * uAccretionState) + verticalY * 1.2) * 0.5 + 0.5;
    float band2 = cos(rHit * 8.8 * turbScale - uTime * 2.5 + sin2Phi * 0.85 + (turbB - 0.5) * (1.5 + 0.55 * uAccretionState) - verticalY * 0.9) * 0.5 + 0.5;
    float plasmaBands = pow(mix(band1, band2, 0.42), 1.25);
    float diskFilaments = clamp(mix(turbA, plasmaBands, 0.72), 0.14, 1.0);

    vec2 toCamXZ = length(uCameraPos.xz - uBlackHolePos.xz) > 0.001
      ? normalize(uCameraPos.xz - uBlackHolePos.xz)
      : vec2(0.0, 1.0);
    vec2 tanVelXZ = vec2(-unitDir.y, unitDir.x);
    float approach = dot(tanVelXZ, toCamXZ);
    float beta = clamp(0.48 / sqrt(max(1.0, rHit - 0.6)), 0.05, 0.54);
    float dopplerFactor = 1.0 / (1.0 - beta * approach * uDopplerStrength);
    float dopplerBoost = mix(
      1.0,
      clamp(pow(clamp(dopplerFactor, 0.52, 1.62), 1.28), 0.48, 1.72),
      clamp(uDopplerStrength, 0.0, 1.0)
    );

    float normR = clamp((rHit - rIn) / (rOut - rIn), 0.0, 1.0);
    float shockGrowth = 1.0 - pow(1.0 - clamp(uExpansionProgress, 0.0, 1.0), 2.6);
    float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
    float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);
    if (unfurlMask <= 0.001) {
      return;
    }
    float ignitionWave = exp(-pow((normR - diskUnfurl) / 0.09, 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

    float innerTaper = smoothstep(rIn, rIn + 0.25, rHit);
    float corePeak = exp(-normR * 2.1);
    float sustainedBody = pow(max(0.0, 1.0 - normR * 0.68), 0.55);
    float outerTaper = 1.0 - smoothstep(0.72, 1.0, normR);
    float radialProfile = mix(sustainedBody, corePeak, 0.35) * innerTaper * outerTaper;

    // Constraint 2: Significantly boosted base emission multiplier in Active mode
    float activeEmissionMult = mix(1.0, 2.40, uAccretionState) * (1.0 + ignitionWave);
    float accretionScale = (0.95 + 0.52 * clamp(uAccretionRate, 0.0, 2.5)) * activeEmissionMult;
    float innerCoreBoost = 1.0 + mix(1.65, 2.75, uAccretionState) * exp(-normR * 5.2);
    float flux = radialProfile * innerCoreBoost * (0.34 + 0.66 * diskFilaments) * dopplerBoost * accretionScale;

    float sonicRarefaction = 0.0;
    float sonicCompression = 0.0;
    if (uPulseStrength > 0.001) {
      float dShock = rHit - uPulseRadius;
      float leadFront = exp(-pow(dShock / 0.35, 2.0));
      float tailFront = exp(-pow((dShock + 1.40) / 0.45, 2.0)) * 0.65;
      float rarefactionTrough = exp(-pow((dShock + 0.65) / 0.55, 2.0));
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
      baseLut = mix(baseLut * activeThermal, activeThermal, 0.78);
    } else {
      baseLut = mix(baseLut * physicalColorGradient, physicalColorGradient, 0.52);
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float whiteCoreGlow = smoothstep(mix(0.24, 0.34, uAccretionState), 0.0, normR) * (0.50 + 0.50 * diskFilaments) * dopplerBoost * (0.35 + 0.65 * bloomMult) * mix(1.0, 1.65, uAccretionState);
    vec3 coreTone = (spectralMode == 2) ? vec3(0.88, 0.97, 1.0) : vec3(1.0, 0.96, 0.84);
    outColor = baseLut * (0.85 + (1.15 + 0.80 * bloomMult) * flux) + coreTone * whiteCoreGlow * (0.75 + 0.55 * bloomMult);
    outAlpha = clamp(pow(radialProfile, 0.68) * (0.62 + 0.38 * diskFilaments) * min(1.30, dopplerBoost) * (0.85 + 0.18 * min(2.0, bloomMult)) * mix(1.0, 1.22, uAccretionState) * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress), 0.0, 0.98);

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

    // Classic Mode (uDiskStyle < 0.5):
    // Renders the original Einstein-lensed upper & lower arches + shadow + photon ring while mainDiskMesh renders the 3D equatorial ring
    if (uDiskStyle < 0.5) {
      vec3 rayDir = normalize(vWorldPos - uCameraPos);
      vec3 toCenter = uBlackHolePos - uCameraPos;
      float tClosest = dot(toCenter, rayDir);
      vec3 pClosest = uCameraPos + rayDir * tClosest - uBlackHolePos;
      vec3 pLocal = pClosest / max(0.01, uScale);
      float b = length(pLocal);
      float r_horizon = mix(2.45, 2.25, spin * 0.45);

      if (uIsStar < 0.5 && b < r_horizon) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      float bloomMult = max(0.0, uBloomIntensity);
      float distFromHorizon = max(0.0, b - r_horizon);
      float activePhotonBoost = mix(1.0, 1.55, uAccretionState);
      float photonRing1 = (uIsStar > 0.5) ? 0.0 : exp(-pow(distFromHorizon / 0.06, 2.0)) * (0.65 + 0.55 * bloomMult) * activePhotonBoost;
      float photonRing2 = (uIsStar > 0.5) ? 0.0 : exp(-pow((distFromHorizon - 0.08) / 0.11, 2.0)) * (0.25 + 0.25 * bloomMult) * activePhotonBoost;
      float photonBloom = (uIsStar > 0.5) ? 0.0 : exp(-distFromHorizon / (0.24 + 0.22 * bloomMult)) * 0.42 * bloomMult * activePhotonBoost;
      float photonRing = photonRing1 + photonRing2 + photonBloom;
      vec3 photonColor = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.80, 0.38), spin * 0.5) * photonRing;

      vec3 lensedDiskColor = vec3(0.0);
      float lensedDiskAlpha = 0.0;

      if (uShowDisk > 0.5 && uLensingActive > 0.5 && uExpansionProgress > 0.02 && b >= r_horizon) {
        float rIn = mix(2.55, 1.45, spin * 0.75);
        float rOut = mix(11.8, 14.0, uAccretionState);

        // Analytical Einstein gravitational deflection of rays passing above and below the shadow
        // plus Schlieren sonic-boom refractive shock deflection at b ≈ uPulseRadius
        float shockRefraction = 0.0;
        if (uPulseStrength > 0.001) {
          float dWave = b - uPulseRadius;
          shockRefraction = -dWave * exp(-pow(dWave / 0.55, 2.0)) * uPulseStrength * 0.38;
        }
        float alpha = clamp((2.1 * r_horizon) / (b + 0.12) + shockRefraction, 0.0, 1.48);
        vec3 inward = -normalize(pLocal);
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

            if (rHit >= rIn && rHit <= rOut) {
              vec2 unitDir = hitPos.xz / max(0.0001, rHit);
              float omega = 3.2 / (pow(rHit, 1.45) + 0.15 * spin);
              float twist = uTime * omega * 1.5 - 1.35 * log(max(0.1, rHit / rIn));
              float ct = cos(twist);
              float st = sin(twist);
              vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

              float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
              float sin2Phi = 2.0 * rotDir.x * rotDir.y;

              float turbScale = mix(1.0, 1.35, uAccretionState);
              float turbA = fastTurb2D(rotDir * (rHit * 0.65 * turbScale) + vec2(uTime * 0.12, -uTime * 0.10));
              float turbVertical = fastTurb2D(vec2(pLocal.x * 0.45 + uTime * 0.18, pLocal.y * 0.55 - uTime * 0.14));
              float band1 = sin(rHit * 5.2 * turbScale - uTime * 1.8 + cos2Phi * 1.15 + (turbA - 0.5) * (1.8 + 0.65 * uAccretionState)) * 0.5 + 0.5;
              float band2 = cos(rHit * 10.4 * turbScale - uTime * 2.4 + sin2Phi * 0.85 + (turbVertical - 0.5) * 1.2 * uAccretionState) * 0.5 + 0.5;
              float diskFilaments = mix(turbA, mix(band1, band2, 0.45), 0.65);
              if (uAccretionState > 0.5) {
                diskFilaments = mix(diskFilaments, turbVertical, 0.28);
              }

              float approach = clamp(uvCentered.x / max(0.001, length(uvCentered)), -1.0, 1.0);
              float beta = clamp(0.68 / sqrt(max(0.75, rHit - 0.4)), 0.05, 0.78);
              float dopplerFactor = 1.0 / (1.0 - beta * approach * uDopplerStrength);
              float dopplerBoost = pow(clamp(dopplerFactor, 0.35, 2.35), 2.1);

              float normR = clamp((rHit - rIn) / (rOut - rIn), 0.0, 1.0);
              float shockGrowth = 1.0 - pow(1.0 - clamp(uExpansionProgress, 0.0, 1.0), 2.6);
              float diskUnfurl = smoothstep(0.0, 0.92, shockGrowth);
              float unfurlMask = 1.0 - smoothstep(max(0.0, diskUnfurl - 0.18), diskUnfurl + 0.03, normR);
              float ignitionWave = exp(-pow((normR - diskUnfurl) / 0.09, 2.0)) * sin(clamp(uExpansionProgress, 0.0, 1.0) * 3.14159265) * 1.45;

              float innerTaper = smoothstep(rIn, rIn + mix(0.45, 0.28, uAccretionState), rHit);
              float outerTaper = 1.0 - smoothstep(rOut - mix(2.4, 3.2, uAccretionState), rOut, rHit);
              float radialProfile = pow(1.0 - normR, mix(1.25, 0.92, uAccretionState)) * innerTaper * outerTaper;

              // Constraint 1: In Quiescent mode, archMask masks near the equatorial plane for the razor-thin disk.
              // In Active mode, drastically increase vertical Y-axis density scale & falloff so the lensed arcs
              // smoothly and continuously connect to the main equatorial disk!
              float quiescentArchMask = smoothstep(0.18, 0.85, abs(pLocal.y));
              float scaleHeightY = 1.25 + 0.32 * max(0.0, b - rIn);
              float yTurbOffset = (turbVertical - 0.5) * 0.65;
              float activeVolumetricEnvelope = exp(-pow(max(0.0, abs(pLocal.y + yTurbOffset) - 0.35) / scaleHeightY, 1.45));
              float activeArchMask = mix(0.78, 1.0, smoothstep(0.0, 0.45, abs(pLocal.y))) * clamp(activeVolumetricEnvelope * 1.15, 0.0, 1.0);
              float archMask = mix(quiescentArchMask, activeArchMask, uAccretionState) * unfurlMask * smoothstep(0.02, 0.16, uExpansionProgress);

              // Constraint 2: Significantly increase base emission intensity in Active mode
              float activeEmissionMult = mix(1.0, 2.45, uAccretionState) * (1.0 + ignitionWave);
              float flux = radialProfile * (0.28 + 0.72 * diskFilaments) * dopplerBoost * (0.65 + 0.45 * uAccretionRate) * activeEmissionMult;
              float sonicRarefaction = 0.0;
              float sonicCompression = 0.0;
              if (uPulseStrength > 0.001) {
                float dShock = rHit - uPulseRadius;
                float leadFront = exp(-pow(dShock / 0.35, 2.0));
                float tailFront = exp(-pow((dShock + 1.35) / 0.45, 2.0)) * 0.65;
                float rarefactionTrough = exp(-pow((dShock + 0.62) / 0.52, 2.0));
                sonicCompression = clamp((leadFront + tailFront) * uPulseStrength * innerTaper * outerTaper, 0.0, 1.0);
                sonicRarefaction = clamp(rarefactionTrough * uPulseStrength * innerTaper * outerTaper, 0.0, 0.88);
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

              float innerArchBloom = exp(-normR * mix(3.0, 3.8, uAccretionState)) * max(0.45, bloomMult) * mix(0.55, 1.25, uAccretionState) * dopplerBoost;
              vec3 coreTone = (spectralMode == 2)
                ? vec3(0.88, 0.97, 1.0)
                : (spectralMode == 3)
                ? mix(vec3(1.0, 0.65, 0.35), vec3(0.75, 0.95, 1.0), clamp(approach * 0.5 + 0.5, 0.0, 1.0))
                : mix(vec3(1.0, 0.88, 0.56), vec3(1.0, 0.99, 0.94), uAccretionState);

              lensedDiskColor = (baseLut * (0.48 + (0.75 + 0.60 * bloomMult) * flux) + coreTone * innerArchBloom) * archMask;
              if (uAccretionState > 0.5 && spectralMode == 0) {
                vec3 activeThermal = computeActiveThermalSpectrum(normR, flux, diskFilaments);
                float outerRedMask = smoothstep(0.52, 0.92, normR);
                lensedDiskColor = mix(lensedDiskColor, activeThermal * (0.75 + 0.55 * radialProfile) * archMask, outerRedMask * 0.68);
              }
              lensedDiskAlpha = clamp(radialProfile * (0.48 + 0.52 * diskFilaments) * min(1.4, dopplerBoost) * (0.82 + 0.22 * min(2.0, bloomMult)) * mix(1.0, 1.28, uAccretionState), 0.0, 0.98) * archMask;
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

      // Companion Star Gravitational Lensing (Analytical Einstein deflection when star passes behind the black hole)
      vec3 lensedStarRgb = vec3(0.0);
      float lensedStarAlpha = 0.0;
      if (uIsBinarySystem > 0.5 && uLensingActive > 0.5 && b >= r_horizon) {
        float starLensAlpha = clamp((2.15 * r_horizon) / (b + 0.10), 0.0, 1.52);
        vec3 inwardWorld = -normalize(pClosest);
        vec3 starBentDir = normalize(rayDir + inwardWorld * sin(starLensAlpha));
        sampleLensedCompanionStar(vWorldPos, starBentDir, lensedStarRgb, lensedStarAlpha);
        float nearPhotonBoost = 1.0 + 0.85 * exp(-distFromHorizon * 1.6);
        lensedStarRgb *= nearPhotonBoost;
      }

      float einsteinGlow = (uIsStar > 0.5 || uLensingActive < 0.5)
        ? 0.0
        : clamp(0.12 / (distFromHorizon + 0.18), 0.0, 0.45) * (0.15 + 0.15 * bloomMult);
      vec3 einsteinColor = vec3(0.22, 0.38, 0.62) * einsteinGlow;

      // Composite lensed companion star behind the foreground/lensed accretion disk
      vec3 combinedLensedRgb = lensedDiskColor + lensedStarRgb * (1.0 - lensedDiskAlpha * 0.82);
      float combinedLensedAlpha = max(lensedDiskAlpha, lensedStarAlpha);

      vec3 finalRgb = combinedLensedRgb + photonColor + einsteinColor;
      float finalAlpha = clamp(max(combinedLensedAlpha, max(clamp(photonRing, 0.0, 0.98), einsteinGlow)), 0.0, 1.0) * quadFade;
      gl_FragColor = vec4(finalRgb, finalAlpha);
      return;
    }

    // Volumetric Raymarched Mode (uDiskStyle >= 0.5):
    float r_horizon = (uIsStar > 0.5) ? 0.0 : mix(1.95, 1.62, spin * 0.45);
    float rIn = mix(2.38, 1.92, spin * 0.55);
    float rOut = mix(15.6, 16.4, uAccretionState);

    vec3 viewZ = normalize(uCameraPos - uBlackHolePos);
    vec3 planeOffset = (vWorldPos - uBlackHolePos) / max(0.01, uScale);
    float canonicalCamDist = 34.0;
    vec3 ro = viewZ * canonicalCamDist;
    if (abs(ro.y) < 0.14) {
      ro.y = (ro.y >= 0.0 ? 0.14 : -0.14);
    }
    vec3 rd = normalize(planeOffset - ro);

    float R_bound = 19.2;
    float tProj = dot(-ro, rd);
    float b2 = dot(ro, ro) - tProj * tProj;
    if (b2 >= R_bound * R_bound) discard;

    float halfChord = sqrt(max(0.0, R_bound * R_bound - b2));
    float tStart = max(0.0, tProj - halfChord);
    vec3 pos = ro + rd * tStart;
    vec3 dir = rd;

    vec3 accumColor = vec3(0.0);
    float accumAlpha = 0.0;
    bool hitHorizon = false;
    float minRayR = 100.0;
    float lensFactor = (uLensingActive > 0.5 && uIsStar < 0.5) ? 1.0 : 0.0;

    for (int step = 0; step < 42; step++) {
      float r = length(pos);
      minRayR = min(minRayR, r);

      if (r < r_horizon) {
        accumColor = vec3(0.0);
        accumAlpha = 1.0;
        hitHorizon = true;
        break;
      }

      if (r > R_bound + 0.5 && dot(pos, dir) > 0.0) {
        break;
      }

      float stepSize = clamp(r * 0.22, 0.20, 0.95);

      vec3 hVec = cross(pos, dir);
      float h2 = dot(hVec, hVec);
      float r2 = max(0.25, r * r);
      vec3 accel = -lensFactor * (1.35 * r_horizon * h2 / (r2 * r2 * r)) * pos;

      vec3 nextDir = normalize(dir + accel * stepSize);
      vec3 nextPos = pos + nextDir * stepSize;
      float nextR = length(nextPos);
      minRayR = min(minRayR, nextR);

      if (nextR < r_horizon) {
        accumColor = vec3(0.0);
        accumAlpha = 1.0;
        hitHorizon = true;
        break;
      }

      if (uShowDisk > 0.5 && accumAlpha < 0.97) {
        bool crossedEquator = (pos.y >= 0.0 && nextPos.y < 0.0) || (pos.y <= 0.0 && nextPos.y > 0.0);
        vec3 midPos = 0.5 * (pos + nextPos);
        float rCyl = length(midPos.xz);
        float scaleHeightY = 0.46 + 0.22 * max(0.0, rCyl - rIn);
        float absY = abs(midPos.y);
        bool inActiveVolume = (uAccretionState > 0.5) && (rCyl >= rIn && rCyl <= rOut) && (absY < scaleHeightY * 2.1);

        if (crossedEquator || inActiveVolume) {
          float denom = abs(pos.y) + abs(nextPos.y);
          float frac = denom > 1e-6 ? abs(pos.y) / denom : 0.5;
          vec3 evalPos = crossedEquator ? mix(pos, nextPos, frac) : midPos;
          float rHit = length(evalPos.xz);

          if (rHit < r_horizon && crossedEquator) {
            accumColor = vec3(0.0);
            accumAlpha = 1.0;
            hitHorizon = true;
            break;
          }

          vec3 sampleCol;
          float sampleAlpha;
          float normY = crossedEquator ? 0.0 : (evalPos.y / scaleHeightY);
          sampleEquatorialDisk(evalPos.xz, normY, nextDir, rHit, r_horizon, rIn, rOut, spin, sampleCol, sampleAlpha);

          float vertWeight = crossedEquator ? 1.0 : (exp(-pow(absY / scaleHeightY, 1.50)) * stepSize * 0.52);
          float weight = (1.0 - accumAlpha) * clamp(sampleAlpha * vertWeight, 0.0, 0.95);
          accumColor += sampleCol * weight;
          accumAlpha += weight;
        }
      }

      pos = nextPos;
      dir = nextDir;
    }

    if (hitHorizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Companion Star Gravitational Lensing along the exited geodesic ray in Raymarched mode
    if (uIsBinarySystem > 0.5 && accumAlpha < 0.98) {
      vec3 exitWorldPos = uBlackHolePos + pos * max(0.01, uScale);
      vec3 lensedStarRgb = vec3(0.0);
      float lensedStarAlpha = 0.0;
      sampleLensedCompanionStar(exitWorldPos, normalize(dir), lensedStarRgb, lensedStarAlpha);
      if (lensedStarAlpha > 0.001) {
        float w = (1.0 - accumAlpha) * lensedStarAlpha;
        accumColor += lensedStarRgb * w;
        accumAlpha += w;
      }
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float distFromHorizon = max(0.0, minRayR - r_horizon);
    float activePhotonBoost = mix(1.0, 1.50, uAccretionState);
    float photonRing1 = (uIsStar > 0.5) ? 0.0 : exp(-pow(distFromHorizon / 0.055, 2.0)) * (0.65 + 0.55 * bloomMult) * activePhotonBoost;
    float photonRing2 = (uIsStar > 0.5) ? 0.0 : exp(-pow((distFromHorizon - 0.07) / 0.10, 2.0)) * (0.25 + 0.25 * bloomMult) * activePhotonBoost;
    float photonBloom = (uIsStar > 0.5) ? 0.0 : exp(-distFromHorizon / (0.24 + 0.22 * bloomMult)) * 0.42 * bloomMult * activePhotonBoost;
    float photonRing = photonRing1 + photonRing2 + photonBloom;
    vec3 photonColor = mix(vec3(1.0, 0.96, 0.86), vec3(1.0, 0.80, 0.35), spin * 0.45) * photonRing;

    float einsteinGlow = (uIsStar > 0.5 || uLensingActive < 0.5)
      ? 0.0
      : clamp(0.09 / (distFromHorizon + 0.18), 0.0, 0.38) * (0.14 + 0.12 * bloomMult);
    vec3 einsteinColor = vec3(0.22, 0.36, 0.58) * einsteinGlow;

    vec3 hdrColor = accumColor + photonColor + einsteinColor;
    vec3 tonemapped = acesFilm(hdrColor * (1.05 + 0.23 * bloomMult));

    float outAlpha = clamp(max(accumAlpha, max(clamp(photonRing, 0.0, 0.98), einsteinGlow)), 0.0, 1.0) * quadFade;
    gl_FragColor = vec4(tonemapped, outAlpha);
  }
`;

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
    float towardL1 = max(0.0, -dir.x);
    float rocheCusp = pow(towardL1, 2.35) * 0.34 + pow(towardL1, 5.5) * 0.22;
    // Slight polar flattening from orbital tidal stress
    float polarCompression = 1.0 - 0.07 * dir.y * dir.y;
    vRocheStretch = clamp(towardL1, 0.0, 1.0);

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
    float flareRidges = pow(clamp(1.0 - abs(q2 - 0.51) * 4.0, 0.0, 1.0), 2.5);

    // Extra tidal heating near the L1 Roche lobe overflow nozzle where plasma is ripped off the star
    float l1TidalHeat = pow(vRocheStretch, 2.2) * (0.55 + 0.45 * flareRidges);

    vec3 colSunspotUmbra = vec3(0.42, 0.05, 0.008);
    vec3 colDeepOrange   = vec3(0.96, 0.34, 0.04);
    vec3 colBrightGold   = vec3(1.00, 0.76, 0.22);
    vec3 colWhiteFlare   = vec3(1.00, 0.98, 0.91);

    vec3 photosphere = mix(colSunspotUmbra, colDeepOrange, sunspotMask);
    photosphere = mix(photosphere, colBrightGold, granuleCells);
    photosphere = mix(photosphere, colWhiteFlare, clamp(flareRidges * 0.68 + l1TidalHeat * 0.65, 0.0, 1.0));

    // Bright Coronal Fresnel Glow at the stellar limb + solar limb darkening profile
    float fresnelRim = pow(1.0 - ndv, 2.25);
    float outerFresnel = pow(1.0 - ndv, 5.2);
    float limbDarkening = mix(0.62, 1.16, pow(ndv, 0.44));

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
    float rimEnvelope = pow(clamp(1.0 - ndv, 0.0, 1.0), 1.85) * smoothstep(0.0, 0.36, ndv);
    float l1PlumeBoost = 1.0 + 0.65 * pow(vRocheStretch, 2.0);
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
    float coreProfile = pow(ndv, mix(0.85, 1.65, uIsOuterSheath));
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

    // Deep pitch-black singularity shadow core in the interior (ndv > 0.42),
    // surrounded by a razor-sharp incandescent photon-capture rim and outer corona
    float horizonShadow = smoothstep(0.32, 0.52, ndv);
    float photonRim = exp(-pow((ndv - 0.36) * 8.5, 2.0)) * (1.15 + 0.55 * plasmaTurb);
    float outerCorona = pow(1.0 - ndv, 2.6) * (0.75 + 0.45 * fineRipple);

    vec3 primaryGlow = vec3(1.0, 0.86, 0.48);
    vec3 coreHot = vec3(1.0, 0.99, 0.94);
    int spectralMode = int(uSpectralMode + 0.5);
    if (spectralMode == 2) {
      primaryGlow = vec3(0.38, 0.78, 1.0);
      coreHot = vec3(0.90, 0.98, 1.0);
    } else if (spectralMode == 3) {
      primaryGlow = mix(vec3(0.98, 0.42, 0.14), vec3(0.28, 0.85, 1.0), clamp(vLocalPos.x * 0.8 + 0.5, 0.0, 1.0));
    }

    vec3 rimColor = mix(primaryGlow, coreHot, clamp(photonRim * 0.75, 0.0, 1.0)) * (photonRim * 1.45 + outerCorona * 0.95);
    vec3 finalRgb = mix(rimColor, vec3(0.0, 0.0, 0.0), horizonShadow);
    float alpha = clamp((horizonShadow + photonRim + outerCorona * 0.85) * uOpacity, 0.0, 1.0);
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

    // Tightly coiled nascent micro-photon ring and gravitational lensing shimmer around the small singularity ball
    float innerShadow = 1.0 - smoothstep(0.18, 0.25, r);
    float photonRing = exp(-pow((r - 0.26) * 18.0, 2.0)) * 1.35;
    float secondRing = exp(-pow((r - 0.36) * 11.0, 2.0)) * 0.55;
    float angle = atan(p.y, p.x);
    float spiralWisp = (0.5 + 0.5 * sin(angle * 3.0 + r * 16.0 - uTime * 5.2)) * exp(-max(0.0, r - 0.24) * 4.5);
    float haloFalloff = exp(-max(0.0, r - 0.24) * 4.2) * (0.45 + 0.35 * spiralWisp);

    int spectralMode = int(uSpectralMode + 0.5);
    vec3 tint = (spectralMode == 2) ? vec3(0.45, 0.84, 1.0) : vec3(1.0, 0.82, 0.42);
    vec3 col = mix(tint, vec3(1.0, 0.99, 0.94), clamp(photonRing, 0.0, 1.0)) * (photonRing + secondRing + haloFalloff);
    col = mix(col, vec3(0.0), innerShadow);
    float alpha = clamp((innerShadow * 0.95 + photonRing * 0.90 + secondRing * 0.55 + haloFalloff * 0.65) * (1.0 - smoothstep(0.75, 1.0, r)) * uOpacity, 0.0, 0.98);
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
  uniform vec2 uVelocity;
  uniform float uStrength;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    if (uStrength < 0.005) {
      gl_FragColor = texture2D(tDiffuse, vUv);
      return;
    }

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

    vec4 finalColor = accum / totalWeight;

    // Relativistic Doppler optical headlamp tint on high-speed observer motion
    vec3 tinted = mix(finalColor.rgb, finalColor.rgb * vec3(0.94, 0.98, 1.06), uStrength * 0.22);
    gl_FragColor = vec4(tinted, finalColor.a);
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

  // Relativistic Camera-Motion Blur Post-Processing
  private motionBlurRenderTarget!: THREE.WebGLRenderTarget;
  private postScene = new THREE.Scene();
  private postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private postMaterial!: THREE.ShaderMaterial;
  private postQuad!: THREE.Mesh;
  private prevCamQuat = new THREE.Quaternion();
  private camMotionBlurStrength = 0.0;
  private camMotionVelocity = new THREE.Vector2(0, 0);

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
  private isSingularityCollapsed = true;
  private expansionProgress = 0.0;
  private targetExpansionProgress = 0.0;
  private lastWellExpansionProgress = -1.0;
  private pointerDownPos = new THREE.Vector2();

  // Spacetime Well Manifold
  private spacetimeWellMesh!: THREE.Mesh;
  private spacetimeWellGeo!: THREE.BufferGeometry;

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
  private starRestPositions: THREE.Vector3[] = [];
  private starfieldScales: THREE.Vector3[] = [];
  private starfieldColors: THREE.Color[] = [];
  private starfieldCount = 5500;
  private starTwinklePhases = new Float32Array(5500);
  private starTwinkleSpeeds = new Float32Array(5500);
  private starBaseScales = new Float32Array(5500);

  // Null Geodesics
  private geodesicGroup = new THREE.Group();
  private activeGeodesicPulses: Array<{
    mesh: THREE.Mesh;
    line: THREE.Line;
    points: THREE.Vector3[];
    progress: number;
    speed: number;
  }> = [];

  // Relativistic Gravitational Lensing Shader Mesh (Interstellar Gargantua ray-marched distortion)
  private gravitationalLensMesh!: THREE.Mesh;
  private gravitationalLensMat!: THREE.ShaderMaterial;

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
  private pulseProgress = 0.0;
  private pulseDuration = 2.45;
  private pulseStrength = 0.0;
  private pulseRadius = 1.75;
  private pulseColor = new THREE.Color(0x94a3b8);

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
  private isUserInteracting = false;
  private targetCamPos = new THREE.Vector3(0, 6.8, 19.5);
  private targetCamLook = new THREE.Vector3(0, 0, 0);
  private followStarMode = false;

  // Raycasting for interactive feature inspection & double-click photon launch
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private lastRaycastTime = 0;
  private onFeatureSelect?: (feature: InspectedFeature | null) => void;
  private onTrajectoryCreated?: (traj: GeodesicTrajectory) => void;
  private onHoverCoordsChange?: (coords: { rRs: number; phiDeg: number; redshiftZ: number } | null) => void;
  private onSingularityStateChange?: (isCollapsed: boolean) => void;

  private params: BlackHoleParams;
  private settings: VisualizerSettings = { ...DEFAULT_VISUALIZER_SETTINGS };
  private showSingularityInAnatomy = false;

  constructor(
    container: HTMLElement,
    initialParams: BlackHoleParams,
    callbacks?: {
      onFeatureSelect?: (feature: InspectedFeature | null) => void;
      onTrajectoryCreated?: (traj: GeodesicTrajectory) => void;
      onHoverCoordsChange?: (coords: { rRs: number; phiDeg: number; redshiftZ: number } | null) => void;
      onSingularityStateChange?: (isCollapsed: boolean) => void;
    }
  ) {
    this.container = container;
    this.params = initialParams;
    this.onFeatureSelect = callbacks?.onFeatureSelect;
    this.onTrajectoryCreated = callbacks?.onTrajectoryCreated;
    this.onHoverCoordsChange = callbacks?.onHoverCoordsChange;
    this.onSingularityStateChange = callbacks?.onSingularityStateChange;

    // 1. Pre-check & Acquire WebGL Context Safely (prevents THREE.WebGLRenderer from throwing or logging errors if WebGL is blocked)
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.domElement = canvas;

    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      const ctxAttrs: WebGLContextAttributes = {
        alpha: false,
        antialias: false,
        powerPreference: 'default',
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
      };
      gl = (
        canvas.getContext('webgl2', ctxAttrs) ||
        canvas.getContext('webgl', ctxAttrs) ||
        canvas.getContext('experimental-webgl', ctxAttrs)
      ) as WebGLRenderingContext | WebGL2RenderingContext | null;
    } catch {
      gl = null;
    }

    if (gl) {
      isSoftwareGl = detectSoftwareGl(gl);
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          context: gl as WebGLRenderingContext,
          antialias: !isSoftwareGl,
          powerPreference: 'default',
          preserveDrawingBuffer: false,
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = false;
        this.renderer.debug.checkShaderErrors = false;
        this.renderer.setSize(width, height);
      } catch {
        this.renderer = null;
      }
    }

    if (!this.renderer) {
      // If WebGL context creation was blocked by the browser, create a clean 2D Canvas for fallback rendering
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = width;
      fallbackCanvas.height = height;
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

    // 3. Camera & OrbitControls
    const aspect = width / Math.max(1, height);
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 500);
    this.camera.position.set(0, 8.2, 24.5);

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 110;
    this.controls.minDistance = 3.5;
    this.controls.target.set(0, 0, 0);

    this.controls.addEventListener('start', () => {
      this.isUserInteracting = true;
      this.cameraTransitionActive = false;
      this.followStarMode = false;
    });

    this.controls.addEventListener('end', () => {
      this.isUserInteracting = false;
    });

    this.raycaster.layers.set(1);

    // 4. Lighting Rig
    this.setupLightingRig();

    // 5. Build Composite Subsystems
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

    this.scene.add(this.blackHoleGroup);
    this.scene.add(this.neutronStarGroup);
    this.scene.add(this.geodesicGroup);

    // Apply initial parameters
    this.updateParams(initialParams, true);

    // Event listeners
    window.addEventListener('resize', this.handleResize);
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.domElement.addEventListener('click', this.handleCanvasClick);

    this.startLoop();
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
    texture.anisotropy = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    texture.needsUpdate = true;
    return texture;
  }

  private buildCompositeBlackHole() {
    const spectrumLut = this.createProceduralSpectrumTexture();

    // 1. Central Event Horizon (Shadow rendered directly on the lens quad)
    this.eventHorizonMesh = new THREE.Mesh();
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
    this.singularityCoreMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.26, 64, 64),
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
    this.singularityHaloMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 8.8),
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
      this.params.objectCategory === 'star' ? 1.0 : 0.0
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
        uAccretionState: { value: this.params.accretionState === 'active' ? 1.0 : 0.0 },
        uExpansionProgress: { value: this.expansionProgress },
      },
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    // 2. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Ring Geometry)
    const diskPlaneGeo = new THREE.RingGeometry(1.02, 16.2, 160, 64);
    const vertCount = diskPlaneGeo.attributes.position.count;
    const midLayerAttr = new Float32Array(vertCount);
    diskPlaneGeo.setAttribute('aVerticalLayer', new THREE.BufferAttribute(midLayerAttr, 1));

    const mainDiskMesh = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    mainDiskMesh.rotation.x = -Math.PI / 2;
    mainDiskMesh.renderOrder = 1;
    mainDiskMesh.layers.enable(1);
    mainDiskMesh.userData.feature = {
      title: 'Relativistic Accretion Disk (ISCO)',
      subtitle: 'Magnetohydrodynamic Plasma & Differential Shear',
      formula: 'T(r) ∝ r⁻³ᐟ⁴ [1 - √(r_in/r)]¹ᐟ⁴ · D = [γ(1 - β cos θ)]⁻¹',
      description:
        'Superheated gas spiraling inwards toward the innermost stable circular orbit (ISCO), reaching millions of degrees and radiating across X-ray and optical spectra.',
    } satisfies InspectedFeature;
    this.accretionDiskGroup.add(mainDiskMesh);

    // 2b. Volumetric 3D Vertical Torus Strata for Active Accretion Mode (Y-Axis Density Scale & Falloff)
    this.activeDiskVolumeGroup = new THREE.Group();
    const volumeLayers = [-0.95, -0.62, -0.32, 0.32, 0.62, 0.95];
    for (const layerVal of volumeLayers) {
      const layerGeo = new THREE.RingGeometry(1.05, 16.2, 128, 44);
      const count = layerGeo.attributes.position.count;
      const layerArr = new Float32Array(count).fill(layerVal);
      layerGeo.setAttribute('aVerticalLayer', new THREE.BufferAttribute(layerArr, 1));
      const layerMesh = new THREE.Mesh(layerGeo, this.accretionDiskMat);
      layerMesh.rotation.x = -Math.PI / 2;
      layerMesh.renderOrder = 2;
      this.activeDiskVolumeGroup.add(layerMesh);
    }
    this.activeDiskVolumeGroup.visible = this.params.accretionState === 'active';
    this.accretionDiskGroup.add(this.activeDiskVolumeGroup);

    this.blackHoleGroup.add(this.accretionDiskGroup);

    // 3. Ergosphere Geometric Boundary (Toggled OFF automatically by default)
    const ergoGeo = new THREE.SphereGeometry(2.35, 32, 32);
    ergoGeo.scale(1.0, 0.72, 1.0);
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
          float leadShock = exp(-pow(delta * 26.0, 2.0));
          // Deep dark rarefaction / decompression trough right behind the leading shock front
          float rarefaction = exp(-pow((delta + 0.09) * 11.5, 2.0));
          // Secondary trailing recovery Mach wave (N-wave tail)
          float tailShock = exp(-pow((delta + 0.20) * 18.0, 2.0)) * 0.55;
          // Subtle acoustic pressure striations inside the shock wake
          float wakeRipples = (0.5 + 0.5 * cos(delta * 58.0)) * exp(-pow((delta + 0.11) * 7.5, 2.0)) * 0.30;

          vec3 compressionTone = mix(uColor, vec3(0.72, 0.75, 0.80), 0.45) * 0.78;
          vec3 rarefactionTone = vec3(0.01, 0.015, 0.025);
          float compWeight = clamp(leadShock + tailShock + wakeRipples, 0.0, 1.0);
          vec3 finalRgb = mix(rarefactionTone, compressionTone, compWeight / max(0.001, compWeight + rarefaction * 0.95));
          float alpha = clamp(leadShock * 0.62 + rarefaction * 0.58 + tailShock * 0.36 + wakeRipples * 0.22, 0.0, 0.85) * uOpacity;
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

    // Additional concentric acoustic pressure ripple rings
    const extraRatios = [
      { ratio: 0.88, opacityWeight: 0.68 },
      { ratio: 0.74, opacityWeight: 0.52 },
      { ratio: 0.58, opacityWeight: 0.38 },
      { ratio: 0.36, opacityWeight: 0.24 },
      { ratio: 0.22, opacityWeight: 0.16 },
    ];
    this.extraPulseRippleMeshes = [];
    for (const def of extraRatios) {
      const mat = pulseShaderMat.clone();
      const mesh = new THREE.Mesh(ringGeo.clone(), mat);
      mesh.visible = false;
      this.eventHorizonPulseGroup.add(mesh);
      this.extraPulseRippleMeshes.push({ mesh, ratio: def.ratio, opacityWeight: def.opacityWeight });
    }

    // 3D Spherical Sonic Boom Mach Wavefront Shell (achromatic Prandtl-Glauert vapor/pressure boundary)
    const shellGeo = new THREE.SphereGeometry(1.0, 48, 32);
    const shellMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x94a3b8) },
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
          float equatorialFocus = pow(sin(theta), 1.4);
          // Sharp grazing-angle Mach shock rim + inner dark rarefaction band
          float viewCos = abs(vNormalVec.z);
          float outerRim = exp(-pow(viewCos * 5.2, 2.0));
          float innerTrough = exp(-pow((viewCos - 0.24) * 7.5, 2.0));
          vec3 rimColor = mix(uColor, vec3(0.68, 0.72, 0.77), 0.5) * 0.65;
          vec3 rgb = mix(vec3(0.02, 0.025, 0.04), rimColor, outerRim / max(0.001, outerRim + innerTrough));
          float alpha = (outerRim * 0.42 + innerTrough * 0.28) * equatorialFocus * uOpacity;
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

    // Subtle neutral boundary pressure-condensation shell (no bright flash)
    const burstGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const burstMat = new THREE.MeshBasicMaterial({
      color: 0x8892a0,
      transparent: true,
      opacity: 0.0,
      blending: THREE.NormalBlending,
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
            float crest = exp(-pow(delta * 26.0, 2.0));
            // Quasinormal oscillatory trailing ripples (damping harmonic wave train)
            float harmonic1 = exp(-pow((delta + 0.12) * 18.0, 2.0)) * 0.65 * (0.6 + 0.4 * cos(delta * 65.0 - uPhase));
            float harmonic2 = exp(-pow((delta + 0.24) * 14.0, 2.0)) * 0.40 * (0.6 + 0.4 * sin(delta * 85.0 - uPhase * 1.5));
            float harmonic3 = exp(-pow((delta + 0.36) * 11.0, 2.0)) * 0.22;
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
            float rim = exp(-pow(viewCos * 5.2, 2.0));
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

    const isStar = this.params?.objectCategory === 'star';
    const effectiveScale = isStar ? 0.45 : this.currentScale;
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
          float leadShock = exp(-pow(delta * 28.0, 2.0));
          // Thermal plasma compression wake with acoustic striations
          float wake = exp(-pow((delta + 0.14) * 14.0, 2.0)) * (0.6 + 0.4 * cos(delta * 70.0));
          float trailingMist = exp(-pow((delta + 0.28) * 9.0, 2.0)) * 0.35;
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
          float rim = exp(-pow(viewCos * 4.8, 2.0));
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

    const isStar = this.params?.objectCategory === 'star';
    const effectiveScale = isStar ? 0.45 : this.currentScale;
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

  private buildPrototypeNeutronStar() {
    // 1. Ultra-Dense Crystalline Iron Crust Sphere (20 km Physical Stellar Surface)
    const crustGeo = new THREE.SphereGeometry(1.65, 48, 48);
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.25,
      roughness: 0.25,
      metalness: 0.9,
      wireframe: false,
    });
    this.neutronStarMesh = new THREE.Mesh(crustGeo, crustMat);
    this.neutronStarMesh.layers.enable(1);
    this.neutronStarMesh.userData.feature = {
      title: 'Neutron Star Crystalline Crust',
      subtitle: '10¹⁴ g/cm³ Solid Baryonic Surface (No Event Horizon)',
      formula: 'R_star ≈ 10-12 km > R_s = 2GM/c² ≈ 4.2 km (TOV Limit)',
      description:
        'A physical solid surface composed of an ultra-dense crystalline lattice of iron nuclei and degenerate relativistic electrons. Supported by neutron degeneracy pressure, it does not collapse into a black hole.',
    } satisfies InspectedFeature;
    this.neutronStarGroup.add(this.neutronStarMesh);

    // Glowing Hotspot Corona Aura
    const auraGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    this.neutronStarMesh.add(auraMesh);

    // 2. Dual Relativistic Pulsar Radio Lighthouse Beams (Synchrotron Jet Cones)
    // Beams are tilted at ~24° relative to the rotational axis
    this.pulsarBeamsGroup = new THREE.Group();
    this.pulsarBeamsGroup.rotation.z = THREE.MathUtils.degToRad(24);

    const beamConeGeo = new THREE.ConeGeometry(2.2, 18.0, 32, 1, true);
    beamConeGeo.translate(0, 9.0, 0);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // North Magnetic Pole Beam
    const northBeam = new THREE.Mesh(beamConeGeo, beamMat);
    this.pulsarBeamsGroup.add(northBeam);

    // South Magnetic Pole Beam
    const southBeam = new THREE.Mesh(beamConeGeo, beamMat.clone());
    southBeam.rotation.x = Math.PI;
    this.pulsarBeamsGroup.add(southBeam);

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

  private buildBinaryAccretionSystem() {
    this.binarySystemGroup = new THREE.Group();
    this.binarySystemGroup.renderOrder = 15;

    // 1. Companion Donor Star (Volumetric fBM Boiling Solar Surface + Roche Lobe Teardrop Deformation)
    const starGeo = new THREE.SphereGeometry(this.companionStarBaseRadius, 96, 96);
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
    const coronaGeo = new THREE.SphereGeometry(this.companionStarBaseRadius * 1.34, 64, 64);
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
    const p1 = new THREE.Vector3(12.8, 0.16, -2.8);
    const p2 = new THREE.Vector3(8.6, -0.12, -7.8);
    const p3 = new THREE.Vector3(2.2, 0.0, -9.4); // Tangent entry into outer prograde accretion disk

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
    // Expansive, high-resolution continuous Cartesian Spacetime Manifold (136x136 grid to crisply resolve multi-ring gravitational wave ripples)
    this.spacetimeWellGeo = new THREE.PlaneGeometry(130, 130, 136, 136);
    this.spacetimeWellGeo.rotateX(-Math.PI / 2);

    const wellMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      opacity: 0.28,
      roughness: 0.35,
      metalness: 0.8,
    });

    this.spacetimeWellMesh = new THREE.Mesh(this.spacetimeWellGeo, wellMat);
    this.spacetimeWellMesh.position.y = -7.5;
    this.spacetimeWellMesh.renderOrder = -1;
    this.spacetimeWellMesh.layers.enable(1);
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
    const posAttr = this.spacetimeWellGeo.attributes.position as THREE.BufferAttribute;
    const depthMult = this.params.wellDepthMultiplier || 2.2;
    const isStar = this.params.objectCategory === 'star';

    // Truly deep and steep general-relativistic gravitational funnel:
    // Starts as a subtle localized dimple when compressed in the small singularity ball state,
    // and plunges deep into the cosmic abyss (18 to 48 units deep) along with the expanding shockwave.
    const shockGrowth = isStar
      ? 1.0
      : 1.0 - Math.pow(1.0 - Math.min(1.0, Math.max(0.0, this.expansionProgress)), 2.6);
    const expansionWellFactor = isStar ? 1.0 : 0.04 + 0.96 * shockGrowth;
    const wellDepth = (16.0 + (massSolar / 100) * 32.0) * depthMult * expansionWellFactor;
    const baseRs = 2.4 + (massSolar / 100) * 2.2;
    const rs = isStar ? baseRs : baseRs * (0.18 + 0.82 * shockGrowth);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const r = Math.hypot(x, z);

      let depth: number;

      if (isStar) {
        // For a Neutron Star: The well is steep outside, but BOTTOMS OUT at the solid physical crust
        // (R_star > R_s), physically demonstrating why there is NO singularity or horizon!
        const rCrust = rs * 1.25;
        if (r < rCrust) {
          const surfaceBottom = -wellDepth / Math.pow((rCrust * rCrust) / (rs * rs) + 0.18, 0.52);
          // Quadratic bowl inside the star's uniform interior density (Schwarzschild interior solution)
          const interiorDip = surfaceBottom - 1.2 * (1.0 - (r * r) / (rCrust * rCrust));
          depth = interiorDip;
        } else {
          depth = -wellDepth / Math.pow((r * r) / (rs * rs) + 0.18, 0.52);
        }
      } else {
        // For a Black Hole: Steep, plunging gravitational abyss falling toward the central throat
        depth = -wellDepth / Math.pow((r * r) / (rs * rs) + 0.12, 0.54);
      }

      // Authentic Kerr frame-dragging vortex spiral (Lense-Thirring effect)
      const angle = Math.atan2(z, x);
      const frameDragSpiral = spin * 0.45 * Math.sin(angle * 2.0 + r * 0.28) * Math.exp(-r * 0.1) * shockGrowth;

      // Binary Companion Star secondary gravitational potential well (Roche equipotential depression)
      let companionWellDip = 0.0;
      if (!isStar && this.params.systemCategory === 'binary') {
        const starDist = 21.0 * shockGrowth;
        const sx = Math.cos(this.binaryOrbitAngle) * starDist;
        const sz = -Math.sin(this.binaryOrbitAngle) * starDist;
        const rComp = Math.hypot(x - sx, z - sz);
        const rsComp = Math.max(1.8, rs * 0.62);
        companionWellDip = -(wellDepth * 0.34) / Math.pow((rComp * rComp) / (rsComp * rsComp) + 0.65, 0.52);
      }

      // Dynamic Event Horizon Pulse: Dense Multi-Ring Concentric Gravitational Wave Train on the Gravity Well
      let pulseWave = 0.0;
      if (this.pulseStrength > 0.005) {
        // Wavefront radius in local manifold coordinates (erupts from small singularity ball r = 0.35 out to r = 62 across the entire 130x130 grid)
        const frontR = 0.35 + Math.pow(this.pulseProgress, 0.78) * 61.5;
        const innerTap = Math.min(1.0, Math.max(0.0, (r - 0.30) / 1.6));
        // Smooth step cutoff ahead of the expanding wavefront
        const leadingEdge = 1.0 / (1.0 + Math.exp((r - frontR) * 1.6));
        // Sustained wave-train envelope behind the wavefront so 10-14 concentric ripples undulate across the well at once
        const distBehind = Math.max(0.0, frontR - r);
        const distAhead = Math.max(0.0, r - frontR);
        const trainEnvelope = Math.exp(-distBehind * 0.032) * Math.exp(-distAhead * 0.55);

        // High-density concentric ripple harmonics propagating outward at c
        const phase1 = r * 1.75 - this.pulseProgress * 42.0;
        const phase2 = r * 3.25 - this.pulseProgress * 64.0;
        const phase3 = r * 0.95 - this.pulseProgress * 24.0;
        const multiRipple =
          Math.sin(phase1) * 0.72 +
          Math.cos(phase2) * 0.34 +
          Math.sin(phase3) * 0.42;

        const radialFalloff = 1.0 / (1.0 + r * 0.016);
        pulseWave =
          multiRipple *
          leadingEdge *
          innerTap *
          trainEnvelope *
          this.pulseStrength *
          5.2 *
          radialFalloff;
      }

      // Propagating metric ripples from rapid spin or accretion rate adjustments
      let paramRippleWave = 0.0;
      if (this.settings.rapidAdjustmentRipples !== false) {
        for (const rip of this.parameterRipples) {
          if (!rip.active) continue;
          const ease = 1.0 - Math.pow(1.0 - rip.progress, 2.2);
          const curR = THREE.MathUtils.lerp(rip.startRadius, rip.maxRadius, ease);
          const rDist = Math.abs(r - curR);
          if (rDist < 7.5) {
            const waveEnv = Math.exp(-Math.pow(rDist * 0.52, 2.0));
            const waveCycle = Math.sin(rDist * 2.4 - rip.progress * 26.0);
            const fade = Math.pow(1.0 - rip.progress, 1.25) * rip.intensity;
            paramRippleWave += waveEnv * waveCycle * fade * 2.6;
          }
        }
      }

      // Propagating thermal radiation blast wave from accretion state/rate threshold change
      let accretionShockWave = 0.0;
      if (this.isAccretionShockActive && this.settings.accretionShockwaveEnabled !== false) {
        const shockFrontR = this.accretionShockRadius;
        const rDist = Math.abs(r - shockFrontR);
        if (rDist < 8.5) {
          const waveEnv = Math.exp(-Math.pow(rDist * 0.45, 2.0));
          const waveOsc = Math.sin(rDist * 2.1 - this.accretionShockProgress * 32.0);
          const shockFade = Math.pow(1.0 - this.accretionShockProgress, 1.2) * this.accretionShockIntensity;
          accretionShockWave += waveEnv * waveOsc * shockFade * 3.4;
        }
      }

      posAttr.setY(i, depth + companionWellDip + frameDragSpiral + pulseWave + paramRippleWave + accretionShockWave);
    }
    posAttr.needsUpdate = true;
    this.spacetimeWellGeo.computeVertexNormals();

    if (this.spacetimeWellMesh) {
      const wellMat = this.spacetimeWellMesh.material as THREE.MeshStandardMaterial;
      wellMat.emissiveIntensity = 0.45;
      wellMat.opacity = 0.28 + this.pulseStrength * 0.12;
    }
    this.lastWellExpansionProgress = this.expansionProgress;
  }

  private buildRelativisticLensingWarp() {
    // Ray-marched Relativistic Gravitational Lens (Interstellar Gargantua ray-deflected geometry & Einstein rings)
    const lensGeo = new THREE.PlaneGeometry(44, 44);
    const spectrumLut = this.createProceduralSpectrumTexture();

    this.gravitationalLensMat = new THREE.ShaderMaterial({
      uniforms: {
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
        uIsStar: { value: this.params.objectCategory === 'star' ? 1.0 : 0.0 },
        uPulseRadius: { value: 0 },
        uPulseStrength: { value: 0 },
        uTime: { value: 0 },
        uDiskStyle: { value: this.settings.accretionDiskStyle === 'raymarched' ? 1.0 : 0.0 },
        uBloomIntensity: { value: this.settings.bloomIntensity },
        uAccretionState: { value: this.params.accretionState === 'active' ? 1.0 : 0.0 },
        uExpansionProgress: { value: this.expansionProgress },
        uIsBinarySystem: { value: this.params.systemCategory === 'binary' ? 1.0 : 0.0 },
        uCompanionStarPos: { value: new THREE.Vector3(21.0, 0, 0) },
        uCompanionStarRadius: { value: this.companionStarBaseRadius },
      },
      vertexShader: LENSING_VERTEX_SHADER,
      fragmentShader: LENSING_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    this.gravitationalLensMesh = new THREE.Mesh(lensGeo, this.gravitationalLensMat);
    this.gravitationalLensMesh.renderOrder = 10;
    this.blackHoleGroup.add(this.gravitationalLensMesh);
  }

  private buildRelativisticMotionBlurPass() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.motionBlurRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.motionBlurRenderTarget.texture },
        uVelocity: { value: this.camMotionVelocity },
        uStrength: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
      vertexShader: MOTION_BLUR_VERTEX_SHADER,
      fragmentShader: MOTION_BLUR_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });
    this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
    this.postScene.add(this.postQuad);
    this.prevCamQuat.copy(this.camera.quaternion);
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
    const starCount = this.starfieldCount;
    // High-fidelity smooth sphere geometry instead of coarse faceted octahedrons
    const starGeo = new THREE.SphereGeometry(0.12, 6, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.starfieldInstanced = new THREE.InstancedMesh(starGeo, starMat, starCount);

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

    // Milky Way Galactic Plane Orientation:
    // Inclined ~56 degrees relative to the black hole coordinates, cutting diagonally across the sky
    const galTiltX = 0.98; // ~56 deg
    const galRotY = 0.62;  // ~35 deg
    const cosTilt = Math.cos(galTiltX);
    const sinTilt = Math.sin(galTiltX);
    const cosRot = Math.cos(galRotY);
    const sinRot = Math.sin(galRotY);

    for (let i = 0; i < starCount; i++) {
      let x = 0, y = 0, z = 0;
      const radius = 75 + Math.random() * 135;

      // 72% of stars form the dense, realistic Milky Way Galactic Disc & Central Bulge band
      if (i < starCount * 0.72) {
        const l = Math.random() * Math.PI * 2.0; // Galactic longitude
        // Gaussian distribution along galactic equator (Box-Muller transform)
        const u1 = Math.max(0.0001, Math.random());
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        // Bulge concentration toward galactic center (l = 0 or PI)
        const bulgeFactor = 0.14 + 0.12 * Math.exp(-Math.pow(Math.min(l, Math.PI * 2 - l) / 0.8, 2.0));
        const b = z0 * bulgeFactor; // Galactic latitude in radians

        // Spherical position in galactic plane frame
        const cosB = Math.cos(b);
        const gx = cosB * Math.cos(l);
        const gy = Math.sin(b);
        const gz = cosB * Math.sin(l);

        // Rotate into celestial observer frame: Rotate X, then Rotate Y
        const y1 = gy * cosTilt - gz * sinTilt;
        const z1 = gy * sinTilt + gz * cosTilt;
        x = (gx * cosRot + z1 * sinRot) * radius;
        y = y1 * radius;
        z = (-gx * sinRot + z1 * cosRot) * radius;
      } else {
        // 28% of stars populate the diffuse spherical cosmic halo
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

      // Realistic Astronomical Initial Mass Function (IMF) / Apparent Magnitude Distribution:
      // - 82% faint dwarf stars: tiny, crisp, beautiful sub-pixel pinpricks
      // - 14% medium brightness stars
      // - 4% luminous bright navigation stars & supergiant beacons
      let baseScale = 0.18;
      const magRand = Math.random();
      if (magRand < 0.82) {
        baseScale = 0.14 + Math.pow(Math.random(), 3.2) * 0.28;
      } else if (magRand < 0.96) {
        baseScale = 0.45 + Math.random() * 0.40;
      } else {
        baseScale = 0.95 + Math.random() * 0.95;
      }

      this.starBaseScales[i] = baseScale;
      this.starTwinklePhases[i] = Math.random() * Math.PI * 2;
      this.starTwinkleSpeeds[i] = 1.4 + Math.random() * 3.8;

      const scaleVec = new THREE.Vector3(baseScale, baseScale, baseScale);
      this.starfieldScales.push(scaleVec);

      _mat4.compose(restPos, _quat.identity(), scaleVec);
      this.starfieldInstanced.setMatrixAt(i, _mat4);

      // Real astronomical spectral population weighting:
      // M and K red/orange dwarf stars are by far the most numerous in the universe (~60%),
      // Solar G and F stars are moderate (~30%), while hot B and O stars are rare (~10%)
      let colorIndex = 0;
      const specRand = Math.random();
      if (specRand < 0.32) {
        colorIndex = 6; // M red dwarf
      } else if (specRand < 0.58) {
        colorIndex = 5; // K orange dwarf
      } else if (specRand < 0.78) {
        colorIndex = 4; // G solar yellow
      } else if (specRand < 0.90) {
        colorIndex = 3; // F warm white
      } else if (specRand < 0.96) {
        colorIndex = 2; // A white
      } else if (specRand < 0.99) {
        colorIndex = 1; // B blue-white
      } else {
        colorIndex = 0; // O electric blue
      }

      const col = spectralColors[colorIndex].clone();
      if (baseScale > 0.8) {
        col.multiplyScalar(1.25);
      }
      this.starfieldColors.push(col);
      this.starfieldInstanced.setColorAt(i, col);
    }

    this.starfieldInstanced.instanceMatrix.needsUpdate = true;
    if (this.starfieldInstanced.instanceColor) {
      this.starfieldInstanced.instanceColor.needsUpdate = true;
    }
    this.starfieldInstanced.computeBoundingSphere();
    this.scene.add(this.starfieldInstanced);
  }

  /**
   * Applies General Relativistic Gravitational Lensing Deflection & Motion Parallax:
   * 1. 3D Spatial Depth Parallax: stars at varying celestial distances (R ~ 75-210) experience
   *    differential parallax as the observer rotates or orbits around the gravitational titan.
   * 2. General Relativistic Lensing: Light passing near the central mass is deflected by
   *    Einstein's angle α ≈ 4GM/(c² b) = 2 Rs / b. Background stars behind the object warp radially
   *    outward away from the event horizon shadow.
   */
  private updateGravitationalLensingOfStarfield() {
    const camPos = this.camera.position;
    const rs = 1.75 * this.currentScale;
    const einsteinRadiusSq = Math.max(0.2, rs * rs * 2.8);
    const elapsed = this.accretionDiskSimTime;

    // Camera coordinate frame for rotation and orbit parallax
    _camRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    _camUp.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();

    // Camera view direction
    _vec3B.subVectors(this.controls.target, camPos).normalize();

    for (let i = 0; i < this.starfieldCount; i++) {
      const restPos = this.starRestPositions[i];
      const restDist = restPos.length();

      // Subtle celestial twinkle scintillation
      const twinkle = 1.0 + Math.sin(elapsed * this.starTwinkleSpeeds[i] + this.starTwinklePhases[i]) * 0.15;
      const curScale = this.starBaseScales[i] * twinkle;
      this.starfieldScales[i].set(curScale, curScale, curScale);

      // 1. Subtle camera rotation & orbital depth parallax:
      // Stars at 75-210 units have varying depth factors. Closer stars shift more than distant ones.
      const depthFactor = this.settings.lockBackground ? 0.0 : (135.0 / Math.max(50.0, restDist)) - 0.85;
      // Parallax translation from camera orbital position
      _vec3D.copy(camPos).multiplyScalar(-0.045 * depthFactor);
      // Parallax shear from camera rotation angle relative to star vector
      const dotRight = _camRight.dot(restPos);
      const dotUp = _camUp.dot(restPos);
      _vec3D.addScaledVector(_camRight, -dotRight * 0.0022 * depthFactor);
      _vec3D.addScaledVector(_camUp, -dotUp * 0.0022 * depthFactor);

      // Star position with parallax applied
      const parallaxPos = _vec3E.copy(restPos).add(_vec3D);

      // 2. Gravitational lensing deflection
      _vec3A.subVectors(parallaxPos, camPos);
      const starDist = _vec3A.length();
      if (starDist < 1.0) continue;

      const starDir = _vec3A.normalize();
      const cosAngle = starDir.dot(_vec3B);

      // Only stars behind or near the central object (cosAngle > 0.35) experience visible lensing deflection
      if (cosAngle > 0.35) {
        const sinAngle = Math.sqrt(Math.max(0.001, 1.0 - cosAngle * cosAngle));
        const impactB = Math.max(rs * 0.9, starDist * sinAngle);

        // Einstein deflection displacement: α ≈ 2 Rs / b
        let deflectionFactor = Math.min(7.5, einsteinRadiusSq / (impactB + 0.35));

        // Sonic Boom Schlieren Optical Shock Refraction: stars passing through the expanding shockwave ripple radially
        if (this.pulseStrength > 0.005) {
          const dShock = impactB - this.pulseRadius;
          const shockKick = -dShock * Math.exp(-(dShock * dShock) / Math.max(0.4, 0.85 * this.currentScale)) * this.pulseStrength * 1.45;
          deflectionFactor += shockKick;
        }

        // Transverse outward unit vector from black hole center to star in view plane
        _vec3C.crossVectors(_vec3B, starDir).crossVectors(_vec3C, _vec3B).normalize();

        const deflectedPos = _vec3A.copy(parallaxPos).addScaledVector(_vec3C, deflectionFactor * 2.2);
        _mat4.compose(deflectedPos, _quat.identity(), this.starfieldScales[i]);
      } else {
        _mat4.compose(parallaxPos, _quat.identity(), this.starfieldScales[i]);
      }

      this.starfieldInstanced.setMatrixAt(i, _mat4);
    }
    this.starfieldInstanced.instanceMatrix.needsUpdate = true;
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
      mesh: pulseMesh,
      line,
      points: vecPoints,
      progress: 0,
      speed: 28.0,
    });

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
  }

  public triggerEventHorizonPulse(category?: 'black_hole' | 'star') {
    const isStar = (category || this.params.objectCategory) === 'star';

    // If triggering a pulse while the black hole is in its small singularity ball state,
    // automatically grow it into the full black hole along with the shockwave!
    if (!isStar && this.isSingularityCollapsed) {
      this.isSingularityCollapsed = false;
      this.expansionProgress = 0.0;
      this.targetExpansionProgress = 1.0;
      this.onSingularityStateChange?.(false);
    }

    this.isPulseActive = true;
    this.pulseProgress = 0.0;
    this.pulseStrength = 1.0;
    const minSeedWorldScale = 0.11;
    const startScale = isStar
      ? this.currentScale
      : THREE.MathUtils.lerp(minSeedWorldScale, this.currentScale, this.expansionProgress);
    this.pulseRadius = 2.26 * startScale;

    // Trigger Sonic Boom Camera Screen Shake recoil
    this.shakeIntensity = 1.0;
    this.shakeElapsed = 0.0;

    // Achromatic neutral slate/silver sonic boom tone (no bright colors)
    this.pulseColor.set(isStar ? 0x94a3b8 : 0x8a94a6);

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
  }

  public expandFromSingularity() {
    if (!this.isSingularityCollapsed && this.targetExpansionProgress >= 0.99) return;
    this.expansionProgress = 0.0;
    this.isSingularityCollapsed = false;
    this.targetExpansionProgress = 1.0;
    this.onSingularityStateChange?.(false);
    this.triggerEventHorizonPulse(this.params.objectCategory);
  }

  public collapseToSingularity() {
    this.isSingularityCollapsed = true;
    this.targetExpansionProgress = 0.0;
    this.isPulseActive = false;
    this.pulseStrength = 0.0;
    if (this.primaryPulseMesh) this.primaryPulseMesh.visible = false;
    if (this.secondaryPulseMesh) this.secondaryPulseMesh.visible = false;
    if (this.tertiaryPulseMesh) this.tertiaryPulseMesh.visible = false;
    for (const extra of this.extraPulseRippleMeshes) {
      extra.mesh.visible = false;
    }
    if (this.gravitationalWaveShellMesh) this.gravitationalWaveShellMesh.visible = false;
    if (this.horizonFlashMesh) this.horizonFlashMesh.visible = false;
    if (this.accretionDiskMat) this.accretionDiskMat.uniforms.uPulseStrength.value = 0.0;
    this.onSingularityStateChange?.(true);
  }

  public replaySingularityExpansion() {
    this.expansionProgress = 0.0;
    this.isSingularityCollapsed = false;
    this.targetExpansionProgress = 1.0;
    this.onSingularityStateChange?.(false);
    this.triggerEventHorizonPulse(this.params.objectCategory);
  }

  public getIsSingularityCollapsed(): boolean {
    return this.isSingularityCollapsed;
  }

  public updateParams(nextParams: BlackHoleParams, immediate = false) {
    const prevBackgroundTheme = this.params ? this.params.backgroundTheme : undefined;
    const prevSystemCategory = this.params ? this.params.systemCategory : undefined;

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

      if (stateChanged || thresholdExceeded) {
        const isSurge = nextParams.accretionRate >= prevAccretionRate || nextParams.accretionState === 'active';
        const intensity = Math.min(1.5, Math.max(0.85, deltaAccretion * 2.2 + (stateChanged ? 0.45 : 0.0)));
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

    // Proportional Astrophysical Cosmic Scaling:
    // Replicates the colossal physical disparity of cosmic objects:
    // - Neutron stars / pulsars (PSR B1919+21, Magnetar): 0.45 scale (tiny 20 km city-sized crust in the vast void)
    // - Stellar-mass black holes (V404 Cygni ~9 M☉, Cygnus X-1 ~21 M☉, GW150914 ~62 M☉): 0.62 - 0.78 scale
    // - Intermediate black holes (GW190521 ~142 M☉): 0.98 scale
    // - Supermassive Sgr A* (~4.3 Million M☉): 2.45 scale
    // - Supermassive M87* (~6.5 Billion M☉): 3.65 scale
    // - Ultramassive TON 618 (~66 Billion M☉): 4.85 scale (and up to 6.5x with trueCosmicScale)
    let calculatedScale = 1.0;
    const isStar = nextParams.objectCategory === 'star';
    if (isStar) {
      calculatedScale = 0.45;
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
      this.camera.position.normalize().multiplyScalar(idealDist);
      this.controls.maxDistance = Math.max(110, idealDist * 2.5);
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
    const isActiveAccretion = nextParams.accretionState === 'active';
    const accretionStateVal = isActiveAccretion ? 1.0 : 0.0;

    if (this.activeDiskVolumeGroup) {
      this.activeDiskVolumeGroup.visible = isActiveAccretion;
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

      // In Classic mode, the 3D equatorial ring mesh renders directly; in Raymarched mode, the unified raymarcher renders it
      this.accretionDiskMat.colorWrite = isStar || isClassicDisk || !nextParams.gravitationalLensing;
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

    // Object Category switching: Black hole vs Compact Star
    if (isStar) {
      this.eventHorizonMesh.visible = false;
      this.neutronStarGroup.visible = true;
      this.pulsarBeamsGroup.visible = nextParams.layers.pulsarBeams ?? true;
      this.magneticDipoleGroup.visible = nextParams.layers.magneticField ?? true;
      if (this.singularitySeedGroup) this.singularitySeedGroup.visible = false;
    } else {
      this.eventHorizonMesh.visible = true;
      this.neutronStarGroup.visible = false;
    }

    // Layer visibilities (Note: ergosphereCage is toggled off automatically by default)
    this.accretionDiskGroup.visible = nextParams.layers.accretionDisk;
    this.ergosphereGroup.visible = isStar ? false : nextParams.layers.ergosphereCage;
    this.spacetimeWellMesh.visible = nextParams.layers.spacetimeGrid;
    this.orbitalStarsGroup.visible = nextParams.layers.orbitalStars;
    this.geodesicGroup.visible = nextParams.layers.geodesicRays;

    if (!nextParams.layers.orbitalStars && this.followStarMode) {
      this.followStarMode = false;
      this.setCameraPreset('equatorial');
    }

    // Update S2 orbital trail radius
    const trailPoints: THREE.Vector3[] = [];
    const trailSegments = 120;
    const r = nextParams.probeRadiusRs * 1.75 * this.targetScale;
    for (let i = 0; i <= trailSegments; i++) {
      const theta = (i / trailSegments) * Math.PI * 2;
      trailPoints.push(new THREE.Vector3(Math.cos(theta) * r, 0, -Math.sin(theta) * r));
    }
    this.starOrbitTrail.geometry.setFromPoints(trailPoints);

    if (massChanged) {
      this.deformSpacetimeWell(nextParams.massSolar, nextParams.spin);
    }
  }

  public setCameraPreset(preset: CameraPresetId) {
    this.followStarMode = preset === 'star';
    this.cameraTransitionActive = true;

    const distMultiplier = Math.max(0.72, Math.sqrt(this.targetScale));
    const incRad = THREE.MathUtils.degToRad(this.params.inclinationDeg);
    const isBinary = this.params.objectCategory !== 'star' && this.params.systemCategory === 'binary';
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

  private handleResize = () => {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    if (this.renderer) {
      this.renderer.setSize(width, height);
    } else {
      this.domElement.width = width;
      this.domElement.height = height;
      this.domElement.style.width = `${width}px`;
      this.domElement.style.height = `${height}px`;
    }
    this.motionBlurRenderTarget?.setSize(width, height);
    if (this.postMaterial) {
      this.postMaterial.uniforms.uResolution.value.set(width, height);
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos.set(e.clientX, e.clientY);
  };

  private handlePointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - this.lastRaycastTime < 55) return;
    this.lastRaycastTime = now;

    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const ray = this.raycaster.ray;

    // Show interactive pointer cursor when hovering over the clickable singularity ball / black hole center
    if (this.params.objectCategory !== 'star') {
      const distToOrigin = ray.distanceToPoint(this.blackHoleGroup.position);
      const hitRadius = this.isSingularityCollapsed
        ? Math.max(3.8, 1.8 * this.currentScale)
        : 2.25 * this.currentScale;
      this.domElement.style.cursor = distToOrigin < hitRadius ? 'pointer' : 'crosshair';
    } else {
      this.domElement.style.cursor = 'crosshair';
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
    // Ignore drag-releases from camera orbiting
    const dragDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dragDist > 7) return;

    const rect = this.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const distToCenter = this.raycaster.ray.distanceToPoint(this.blackHoleGroup.position);
    const isStar = this.params.objectCategory === 'star';

    if (!isStar) {
      if (this.isSingularityCollapsed) {
        // Clicking the small singularity ball (or near center) triggers the expansion animation
        if (distToCenter < Math.max(3.6, 2.2 * this.currentScale)) {
          this.expandFromSingularity();
          return;
        }
      } else {
        // Clicking directly on the central black hole shadow collapses it back into the small singularity ball
        // so the user can click the black hole again anytime to replay the expansion animation
        if (distToCenter < 2.25 * this.currentScale) {
          this.collapseToSingularity();
          return;
        }
      }
    }

    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const hit of hits) {
      if (hit.object.visible && hit.object.userData?.feature) {
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
    if (!this.renderer) {
      this.frameId = window.setTimeout(cb, 32);
      return;
    }
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.isDisposed) return;

    const rawDelta = Math.min(0.1, this.clock.getDelta());
    const simDelta = rawDelta * this.params.timeScale;
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

    const isStar = this.params.objectCategory === 'star';
    const minSeedWorldScale = 0.11; // Small singularity ball initial scale (~0.25 world units radius)

    if (isStar) {
      this.expansionProgress = 1.0;
    } else if (simDelta > 0 && Math.abs(this.expansionProgress - this.targetExpansionProgress) > 0.0005) {
      if (this.targetExpansionProgress > this.expansionProgress) {
        // Grow from the small singularity ball in 1:1 lockstep with the shockwave duration!
        this.expansionProgress = Math.min(1.0, this.expansionProgress + simDelta / this.pulseDuration);
      } else {
        // Smooth gravitational collapse back to the small singularity ball
        this.expansionProgress = Math.max(0.0, this.expansionProgress - simDelta * 1.65);
      }
    } else if (simDelta > 0) {
      this.expansionProgress = this.targetExpansionProgress;
    }

    // Unified shockwave & singularity growth curve:
    // Both the black hole scale and the shockwave front follow the exact same relativistic blast curve
    const expT = this.expansionProgress;
    const shockGrowth = isStar ? 1.0 : 1.0 - Math.pow(1.0 - expT, 2.6);
    const effectiveScale = isStar
      ? this.currentScale
      : THREE.MathUtils.lerp(minSeedWorldScale, this.currentScale, shockGrowth);

    this.eventHorizonMesh.scale.setScalar(effectiveScale);
    this.accretionDiskGroup.scale.setScalar(effectiveScale);
    this.neutronStarGroup.scale.setScalar(this.currentScale);

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

    // Update Small Singularity Ball (grows directly into the black hole event horizon along with effectiveScale)
    if (this.singularitySeedGroup) {
      const showSeed = !isStar && this.expansionProgress < 0.82;
      this.singularitySeedGroup.visible = showSeed;
      if (showSeed) {
        const seedFade = 1.0 - THREE.MathUtils.smoothstep(shockGrowth, 0.18, 0.78);
        const idlePulse = (1.0 - shockGrowth) * (Math.sin(elapsed * 5.2) * 0.06 + Math.cos(elapsed * 11.3) * 0.03);
        // Scales directly with effectiveScale so the small singularity ball physically grows into the black hole!
        this.singularitySeedGroup.scale.setScalar(effectiveScale * (1.0 + idlePulse));

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
      this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
    }

    this.ergosphereGroup.position.y = this.currentExploded * 3.8;
    const wellBaseY = -Math.max(6.8, 4.15 * this.currentScale);
    this.spacetimeWellMesh.position.y = wellBaseY - this.currentExploded * 3.6;
    const wellXZScale = Math.max(1.0, this.currentScale * 0.55);
    this.spacetimeWellMesh.scale.set(wellXZScale, 1.0, wellXZScale);

    // 3. Lense-Thirring Frame-Dragging Rotation
    const metrics = computeRelativisticMetrics(this.params);
    this.ergosphereGroup.rotation.y += simDelta * (0.4 + metrics.frameDraggingOmega * 4.5);
    this.ergosphereGroup.scale.set(
      effectiveScale * (1.0 + 0.22 * this.params.spin),
      effectiveScale * (1.0 - 0.14 * this.params.spin),
      effectiveScale * (1.0 + 0.22 * this.params.spin)
    );

    // 4. Pulsar Lighthouse Beams & Magnetic Field Rotation
    if (this.params.objectCategory === 'star') {
      // Rapid rotation of neutron star crust and sweeping pulsar lighthouse beams (~1.3 second period)
      this.pulsarRotationAngle += simDelta * (4.5 + this.params.spin * 8.0);
      this.pulsarBeamsGroup.rotation.y = this.pulsarRotationAngle;
      this.magneticDipoleGroup.rotation.y = this.pulsarRotationAngle;
      this.neutronStarMesh.rotation.y = this.pulsarRotationAngle * 0.8;
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
        this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
      } else {
        // Synchronized N-wave blast expansion: starts at the small singularity ball (2.26 * minSeedWorldScale ≈ 0.25)
        // and expands outward in lockstep with the growing black hole and unfurling accretion disk
        const ease = 1.0 - Math.pow(1.0 - this.pulseProgress, 2.6);
        this.pulseStrength = Math.pow(1.0 - this.pulseProgress, 1.45);
        const startR = isStar ? 1.75 * this.currentScale : 2.26 * minSeedWorldScale;
        const maxShockRadius = 18.5 * this.currentScale;
        this.pulseRadius = THREE.MathUtils.lerp(startR, maxShockRadius, ease);

        // Update accretion disk sonic-boom rarefaction & compression uniforms in local effectiveScale space
        this.accretionDiskMat.uniforms.uPulseRadius.value = this.pulseRadius / Math.max(0.05, effectiveScale);
        this.accretionDiskMat.uniforms.uPulseStrength.value = this.pulseStrength;
        this.accretionDiskMat.uniforms.uDiskParams.value.w = isStar ? 1.0 : 0.0;

        // Primary leading sonic shockwave ring riding on the outer growing boundary of the accretion disk
        this.primaryPulseMesh.visible = true;
        this.primaryPulseMesh.scale.set(this.pulseRadius, this.pulseRadius, this.pulseRadius);
        (this.primaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.82;

        // Secondary trailing N-wave shock ring coupled to the expanding mid-disk
        const secondaryR = Math.max(startR, this.pulseRadius * 0.76);
        this.secondaryPulseMesh.visible = true;
        this.secondaryPulseMesh.scale.set(secondaryR, secondaryR, secondaryR);
        (this.secondaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.56;

        // Tertiary acoustic ring riding right along the growing Event Horizon shadow boundary
        const horizonShockR = Math.max(startR, 2.35 * effectiveScale);
        this.tertiaryPulseMesh.visible = true;
        this.tertiaryPulseMesh.scale.set(horizonShockR, horizonShockR, horizonShockR);
        (this.tertiaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.48;

        // Additional concentric pressure ripple rings
        for (const extra of this.extraPulseRippleMeshes) {
          const ringR = Math.max(startR, this.pulseRadius * extra.ratio);
          extra.mesh.visible = true;
          extra.mesh.scale.set(ringR, ringR, ringR);
          (extra.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
            this.pulseStrength * extra.opacityWeight;
        }

        // 3D Spherical Sonic Boom Mach Shell expanding outward from the small singularity ball
        const gwShellR = THREE.MathUtils.lerp(startR, maxShockRadius * 1.12, ease);
        this.gravitationalWaveShellMesh.visible = true;
        this.gravitationalWaveShellMesh.scale.set(gwShellR, gwShellR, gwShellR);
        (this.gravitationalWaveShellMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.58;

        // Boundary pressure-condensation shell hugging the growing event horizon sphere as it inflates
        if (this.pulseProgress < 0.65) {
          const burstT = this.pulseProgress / 0.65;
          const burstScale = 1.25 * effectiveScale;
          this.horizonFlashMesh.visible = true;
          this.horizonFlashMesh.scale.set(burstScale, burstScale, burstScale);
          (this.horizonFlashMesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - burstT) * 0.22;
        } else {
          this.horizonFlashMesh.visible = false;
        }

        // Ripple and plunge the spacetime well manifold in real-time with the shockwave
        this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
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

      if (hasActiveRipples && !this.isPulseActive) {
        this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
      }
    }

    // 4d. Accretion State & Threshold Burst Shockwave Animation
    if (this.isAccretionShockActive && this.settings.accretionShockwaveEnabled !== false) {
      const shockStep = Math.min(0.05, Math.max(0.005, rawDelta));
      this.accretionShockProgress += shockStep / this.accretionShockDuration;
      if (this.accretionShockProgress >= 1.0) {
        this.clearAccretionShockwave();
      } else {
        const t = this.accretionShockProgress;
        const blastEase = 1.0 - Math.pow(1.0 - t, 2.5);
        const isStar = this.params?.objectCategory === 'star';
        const effScale = isStar ? 0.45 : this.currentScale;
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

        if (!this.isPulseActive) {
          this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
        }
      }
    }

    // 5. Authentic Gravitational Lensing of Background Starfield
    if (this.params.gravitationalLensing !== false) {
      this.updateGravitationalLensingOfStarfield();
    }

    // 5b. Distant Background Star Gravitational Microlensing Simulation
    this.updateBackgroundStarMicrolensing(simDelta);

    // 6. Advance Orbiting Star S2 along Relativistic Orbit
    const orbitSceneRadius = this.params.probeRadiusRs * 1.75 * this.currentScale;
    const angularSpeed = (1.65 * metrics.probeOrbitalBeta) / Math.max(1.5, this.params.probeRadiusRs * 0.45);
    this.starOrbitAngle += simDelta * angularSpeed;

    const starX = Math.cos(this.starOrbitAngle) * orbitSceneRadius;
    const starZ = -Math.sin(this.starOrbitAngle) * orbitSceneRadius;
    const starY = Math.sin(this.starOrbitAngle * 2.0) * 0.22 * this.params.spin;
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

    // 9. Camera Controls, Interpolation & Cinematic Y-Axis Auto-Rotate Mode
    if (this.followStarMode) {
      _vec3A.set(starX * 1.35, starY + 2.0, starZ * 1.35);
      this.camera.position.lerp(_vec3A, 1 - Math.exp(-5.0 * rawDelta));
      this.controls.target.lerp(this.starS2Mesh.position, 1 - Math.exp(-7.0 * rawDelta));
    } else if (this.cameraTransitionActive) {
      const factor = 1 - Math.exp(-5.5 * rawDelta);
      this.camera.position.lerp(this.targetCamPos, factor);
      this.controls.target.lerp(this.targetCamLook, factor);
      if (this.camera.position.distanceTo(this.targetCamPos) < 0.08) {
        this.cameraTransitionActive = false;
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

    this.controls.update();

    // 10.Relativistic Camera Angular Velocity & Motion Blur (measured before transient screen shake)
    const dot = Math.min(1.0, Math.max(-1.0, this.camera.quaternion.dot(this.prevCamQuat)));
    const angleDiff = 2.0 * Math.acos(Math.abs(dot));
    const camAngularSpeed = rawDelta > 0.0001 ? angleDiff / rawDelta : 0.0;

    // Detect angular direction in screen space
    _quatA.copy(this.camera.quaternion).multiply(this.prevCamQuat.clone().invert());
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
      this.gravitationalLensMat.uniforms.uPulseRadius.value = this.pulseRadius / Math.max(0.05, effectiveScale);
      this.gravitationalLensMat.uniforms.uPulseStrength.value = this.pulseStrength;
      this.gravitationalLensMat.uniforms.uExpansionProgress.value = isStar ? 1.0 : this.expansionProgress;
      this.gravitationalLensMat.uniforms.uIsBinarySystem.value = isBinary ? 1.0 : 0.0;
      this.gravitationalLensMat.uniforms.uCompanionStarPos.value.copy(this.companionStarWorldPos);
      this.gravitationalLensMat.uniforms.uCompanionStarRadius.value =
        this.companionStarBaseRadius * effectiveScale;
    }

    // 13. Relativistic Audio Modulation: Camera Proximity & Gravitational Time Dilation
    const rs = 1.75 * this.currentScale;
    const distanceRs = Math.max(1.05, camDist / rs);
    const timeDilation = Math.sqrt(Math.max(0.01, 1.0 - 1.0 / distanceRs));
    relativisticAudio.updateCameraProximity(distanceRs, timeDilation);

    if (this.renderer) {
      if (this.settings.motionBlurEnabled && this.camMotionBlurStrength > 0.012 && this.motionBlurRenderTarget && this.postMaterial) {
        this.postMaterial.uniforms.uStrength.value = this.camMotionBlurStrength;
        this.postMaterial.uniforms.uVelocity.value.copy(this.camMotionVelocity);
        this.renderer.setRenderTarget(this.motionBlurRenderTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.postScene, this.postCamera);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    } else if (this.fallbackCtx2D) {
      this.renderFallback2D(elapsed, effectiveScale);
    }

    // Restore unshaken camera state so OrbitControls never drifts
    if (appliedShake) {
      this.camera.position.copy(_savedCamPos);
      this.controls.target.copy(_savedCamTarget);
      this.camera.lookAt(this.controls.target);
      this.camera.updateMatrixWorld();
    }

    if (isSoftwareGl && this.renderer) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private renderFallback2D(elapsed: number, effectiveScale: number) {
    const ctx = this.fallbackCtx2D;
    if (!ctx) return;
    const width = this.domElement.width || window.innerWidth;
    const height = this.domElement.height || window.innerHeight;

    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, width, height);

    // Project 3D black hole origin into 2D screen coordinates
    _vec3A.copy(this.blackHoleGroup.position).project(this.camera);
    const bhX = (_vec3A.x * 0.5 + 0.5) * width;
    const bhY = (-_vec3A.y * 0.5 + 0.5) * height;
    const camDist = Math.max(5.0, this.camera.position.distanceTo(this.blackHoleGroup.position));
    const pxPerUnit = (height * 0.5) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) / camDist;
    const horizonPx = Math.max(6, 2.26 * effectiveScale * pxPerUnit);

    // 1. Background starfield
    if (this.params.backgroundTheme !== 'pure_black') {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.65)';
      for (let i = 0; i < 160; i++) {
        const sx = ((Math.sin(i * 127.1) * 0.5 + 0.5) * width);
        const sy = ((Math.cos(i * 311.7) * 0.5 + 0.5) * height);
        const r = (i % 5 === 0) ? 1.5 : 0.9;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Binary Accretion System (Companion Star & Bezier Plasma Bridge) when systemCategory === 'binary'
    if (this.params.objectCategory !== 'star' && this.params.systemCategory === 'binary' && this.expansionProgress > 0.05) {
      _vec3B.copy(this.companionStarWorldPos).project(this.camera);
      const starX = (_vec3B.x * 0.5 + 0.5) * width;
      const starY = (-_vec3B.y * 0.5 + 0.5) * height;
      const starR = Math.max(8, this.companionStarBaseRadius * effectiveScale * pxPerUnit);

      // Accretion stream plasma bridge
      const streamGrad = ctx.createLinearGradient(starX, starY, bhX, bhY);
      streamGrad.addColorStop(0, 'rgba(251, 146, 60, 0.75)');
      streamGrad.addColorStop(0.6, 'rgba(250, 204, 21, 0.65)');
      streamGrad.addColorStop(1, 'rgba(255, 251, 235, 0.85)');
      ctx.strokeStyle = streamGrad;
      ctx.lineWidth = Math.max(3, starR * 0.28);
      ctx.beginPath();
      ctx.moveTo(starX, starY);
      ctx.quadraticCurveTo((starX + bhX) * 0.5, (starY + bhY) * 0.5 + starR * 1.1, bhX + horizonPx * 1.6, bhY);
      ctx.stroke();

      // Companion star coronal glow & boiling solar surface
      const coronaGrad = ctx.createRadialGradient(starX, starY, starR * 0.2, starX, starY, starR * 1.85);
      coronaGrad.addColorStop(0, '#fffbeb');
      coronaGrad.addColorStop(0.45, '#fbbf24');
      coronaGrad.addColorStop(0.72, '#ea580c');
      coronaGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(starX, starY, starR * 1.85, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Relativistic Accretion Disk & Lensed Arches
    if (this.params.layers.accretionDisk && this.expansionProgress > 0.02) {
      const diskOuterPx = horizonPx * (this.params.accretionState === 'active' ? 4.4 : 3.8);
      const isXray = this.params.spectralMode === 'xray';

      // Upper and lower gravitationally lensed Einstein arches
      const archGrad = ctx.createRadialGradient(bhX, bhY, horizonPx * 0.95, bhX, bhY, horizonPx * 2.4);
      archGrad.addColorStop(0, isXray ? 'rgba(186, 230, 253, 0.95)' : 'rgba(254, 240, 138, 0.95)');
      archGrad.addColorStop(0.45, isXray ? 'rgba(56, 189, 248, 0.55)' : 'rgba(245, 158, 11, 0.65)');
      archGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = archGrad;
      ctx.beginPath();
      ctx.arc(bhX, bhY, horizonPx * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Equatorial accretion disk ellipse
      ctx.save();
      ctx.translate(bhX, bhY);
      const tilt = Math.max(0.18, Math.abs(Math.cos(THREE.MathUtils.degToRad(this.params.inclinationDeg))));
      ctx.scale(1.0, this.params.accretionState === 'active' ? Math.max(0.36, tilt * 1.35) : tilt);
      const diskGrad = ctx.createRadialGradient(0, 0, horizonPx * 1.05, 0, 0, diskOuterPx);
      diskGrad.addColorStop(0, isXray ? '#e0f2fe' : '#fffbeb');
      diskGrad.addColorStop(0.28, isXray ? '#38bdf8' : '#fbbf24');
      diskGrad.addColorStop(0.68, isXray ? '#0284c7' : '#ea580c');
      diskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.arc(0, 0, diskOuterPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Event Horizon Shadow & Photon Ring
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(bhX, bhY, horizonPx, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.params.spectralMode === 'xray' ? 'rgba(125, 211, 252, 0.9)' : 'rgba(253, 224, 71, 0.92)';
    ctx.lineWidth = Math.max(1.5, horizonPx * 0.08);
    ctx.beginPath();
    ctx.arc(bhX, bhY, horizonPx * (1.02 + Math.sin(elapsed * 4.0) * 0.01), 0, Math.PI * 2);
    ctx.stroke();

    // 5. Sonic Boom Shockwave Ring
    if (this.isPulseActive && this.pulseStrength > 0.01) {
      const shockPx = this.pulseRadius * pxPerUnit;
      ctx.strokeStyle = `rgba(148, 163, 184, ${Math.min(0.75, this.pulseStrength * 0.65)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(bhX, bhY, shockPx, 0, Math.PI * 2);
      ctx.stroke();
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
    const isStar = this.params.objectCategory === 'star';

    if (isStar) {
      const starAnchors: Array<{
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
    this.settings = { ...nextSettings };
    const isClassicDisk = nextSettings.accretionDiskStyle !== 'raymarched';
    const diskStyleVal = isClassicDisk ? 0.0 : 1.0;
    const isStar = this.params?.objectCategory === 'star';

    if (this.accretionDiskMat) {
      this.accretionDiskMat.uniforms.uDiskStyle.value = diskStyleVal;
      this.accretionDiskMat.uniforms.uBloomIntensity.value = nextSettings.bloomIntensity;
      this.accretionDiskMat.uniforms.uDopplerCoeffs.value.set(
        this.params.dopplerStrength,
        isClassicDisk ? 0.70 : 0.48,
        1.0,
        isClassicDisk ? 2.2 : 1.25
      );
      this.accretionDiskMat.colorWrite = isStar || isClassicDisk || !this.params.gravitationalLensing;
    }
    if (this.gravitationalLensMat) {
      this.gravitationalLensMat.uniforms.uDiskStyle.value = diskStyleVal;
      this.gravitationalLensMat.uniforms.uBloomIntensity.value = nextSettings.bloomIntensity;
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

  public captureSnapshotDataUrl(): string {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
    return this.domElement.toDataURL('image/png');
  }

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('click', this.handleCanvasClick);
    this.domElement.removeEventListener('dblclick', this.handleCanvasDoubleClick);
    this.controls.dispose();
    this.gravitationalLensMesh?.geometry?.dispose();
    this.gravitationalLensMat?.dispose();
    this.accretionDiskMat?.dispose();
    this.singularityCoreMesh?.geometry?.dispose();
    this.singularityCoreMat?.dispose();
    this.singularityHaloMesh?.geometry?.dispose();
    this.singularityHaloMat?.dispose();
    this.binaryStarMesh?.geometry?.dispose();
    this.binaryStarMat?.dispose();
    this.binaryCoronaMesh?.geometry?.dispose();
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
    this.postMaterial?.dispose();
    this.postQuad?.geometry?.dispose();
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
