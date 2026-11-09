import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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
  cameraFov: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  showLeftHud: boolean;
  showOverheadMap: boolean;
  showTimeDilation: boolean;
  showCursorTelemetry: boolean;
}

export const DEFAULT_VISUALIZER_SETTINGS: VisualizerSettings = {
  accretionDiskStyle: 'classic',
  bloomIntensity: 1.0,
  lockBackground: false,
  syncSingularityWithAnatomy: true,
  alwaysShowSingularity: false,
  nakedDistortionIntensity: 1.25,
  motionBlurEnabled: true,
  cameraFov: 46,
  autoRotate: false,
  autoRotateSpeed: 0.6,
  showLeftHud: true,
  showOverheadMap: true,
  showTimeDilation: false,
  showCursorTelemetry: true,
};


// Module-scope reusable math objects for zero GC in render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _vec3D = new THREE.Vector3();
const _vec3E = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _quatA = new THREE.Quaternion();
const _color = new THREE.Color();

export const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

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

// High-performance 2D Simplex Noise GLSL helper
const GLSL_SIMPLEX_NOISE = `
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.87, 0.48, -0.48, 0.87);
    for (int i = 0; i < 5; i++) {
      v += a * (snoise(p) * 0.5 + 0.5);
      p = rot * p * 2.15;
      a *= 0.5;
    }
    return v;
  }
`;

// 1. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Ring Shader)
const ACCRETION_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  void main() {
    vUv = uv;
    vLocalPos = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
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

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

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

  void main() {
    float r = length(vLocalPos.xy);
    float spin = clamp(uDiskParams.x, 0.0, 0.998);
    float accretionRate = uDiskParams.y;
    int spectralMode = int(uDiskParams.z);

    // Classic Disk Mode (uDiskStyle < 0.5): Original vibrant 3D equatorial accretion disk
    if (uDiskStyle < 0.5) {
      float r_horizon = mix(2.05, 1.35, spin * 0.65);
      float rIn = max(r_horizon + 0.10, mix(2.55, 1.45, spin * 0.75));
      float rOut = 12.2;

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
      float twist = uTurbulenceBuffer.x * omega * 1.5 - 1.35 * log(max(0.1, r / rIn));
      float ct = cos(twist);
      float st = sin(twist);
      vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

      float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
      float sin2Phi = 2.0 * rotDir.x * rotDir.y;
      float cos3Phi = 4.0 * rotDir.x * rotDir.x * rotDir.x - 3.0 * rotDir.x;

      float waveA = sin(r * uTurbulenceHarmonics.x * 3.1 - uTurbulenceBuffer.z * 0.55 + cos2Phi * 1.2 + uTurbulenceBuffer.y);
      float waveB = cos(r * uTurbulenceHarmonics.x * 6.4 - uTurbulenceBuffer.z * 0.8 + waveA * 1.4 + sin2Phi * 0.9);
      float waveC = sin(r * 3.8 + cos3Phi * 1.1 - uTurbulenceBuffer.w);
      float diskTurb = waveA * 0.5 + 0.5;
      float diskRings = waveB * 0.5 + 0.5;
      float diskFilaments = mix(mix(diskTurb, diskRings, uTurbulenceHarmonics.z), waveC * 0.5 + 0.5, 0.25);

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
      float innerTaper = smoothstep(rIn, rIn + 0.42, r);
      float outerTaper = 1.0 - smoothstep(rOut - 2.2, rOut, r);
      float radialProfile = pow(1.0 - normR, 1.15) * innerTaper * outerTaper;

      float flux = radialProfile * (0.30 + 0.70 * diskFilaments) * dopplerBoost * (0.65 + 0.45 * accretionRate);

      if (uPulseStrength > 0.001) {
        float c1 = exp(-pow((r - uPulseRadius) / 0.42, 2.0));
        float c2 = exp(-pow((r - uPulseRadius * 0.85) / 0.46, 2.0)) * 0.82;
        float c3 = exp(-pow((r - uPulseRadius * 0.70) / 0.50, 2.0)) * 0.68;
        float c4 = exp(-pow((r - uPulseRadius * 0.56) / 0.54, 2.0)) * 0.54;
        float c5 = exp(-pow((r - uPulseRadius * 0.42) / 0.58, 2.0)) * 0.40;
        float c6 = exp(-pow((r - uPulseRadius * 0.28) / 0.62, 2.0)) * 0.28;
        float fineWave = (0.5 + 0.5 * cos((r - uPulseRadius) * 5.2)) * exp(-abs(r - uPulseRadius * 0.68) * 0.32) * 0.55;
        float totalRipple = c1 + c2 + c3 + c4 + c5 + c6 + fineWave;
        flux += totalRipple * uPulseStrength * 1.55 * innerTaper * outerTaper;
      }

      float lutU = clamp(flux * 0.65, 0.02, 0.98);
      vec3 baseLut = texture2D(uSpectrumLut, vec2(lutU, 0.5)).rgb;

      if (spectralMode == 1) {
        baseLut = mix(vec3(0.18, 0.02, 0.01), vec3(1.0, 0.85, 0.42), lutU);
      } else if (spectralMode == 2) {
        baseLut = mix(vec3(0.06, 0.16, 0.42), vec3(0.84, 0.95, 1.0), lutU);
      } else if (spectralMode == 3) {
        baseLut = mix(vec3(0.95, 0.34, 0.08), vec3(0.22, 0.82, 1.0), clamp(approachCos * 0.5 + 0.5, 0.0, 1.0)) * (0.42 + 0.58 * diskFilaments);
      }

      float bloomMult = max(0.0, uBloomIntensity);
      float innerHalo = exp(-normR * 3.2) * bloomMult * 0.65 * dopplerBoost;
      vec3 bloomGlow = vec3(1.0, 0.88, 0.56) * innerHalo + baseLut * (0.45 * bloomMult * flux);
      vec3 diskColor = baseLut * (0.48 + (0.75 + 0.60 * bloomMult) * flux) + bloomGlow;
      float bloomAlphaBoost = 0.82 + 0.22 * min(2.0, bloomMult);
      float diskAlpha = clamp(radialProfile * (0.52 + 0.48 * diskFilaments) * min(1.4, dopplerBoost) * bloomAlphaBoost, 0.0, 0.98);
      gl_FragColor = vec4(diskColor, diskAlpha);
      return;
    }

    // Volumetric Raymarched Mode (uDiskStyle >= 0.5)
    float r_horizon = mix(1.95, 1.62, spin * 0.45);
    float rIn = mix(2.38, 1.92, spin * 0.55);
    float rOut = 15.6;

    if (r < r_horizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    if (r < rIn || r > rOut) {
      discard;
    }

    vec2 unitDir = vLocalPos.xy / max(0.0001, r);
    float omega = 3.2 / (pow(r, 1.35) + 0.15 * spin);
    float twist = uTurbulenceBuffer.x * omega * 1.5 - 1.35 * log(max(0.1, r / rIn));
    float ct = cos(twist);
    float st = sin(twist);
    vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

    float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
    float sin2Phi = 2.0 * rotDir.x * rotDir.y;
    float cos3Phi = 4.0 * rotDir.x * rotDir.x * rotDir.x - 3.0 * rotDir.x;

    float waveA = sin(r * 4.4 - uTurbulenceBuffer.z * 0.55 + cos2Phi * 1.15 + uTurbulenceBuffer.y);
    float waveB = cos(r * 8.8 - uTurbulenceBuffer.z * 0.8 + waveA * 1.35 + sin2Phi * 0.85);
    float waveC = sin(r * 2.9 + cos3Phi * 0.9 - uTurbulenceBuffer.w);
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
    float innerTaper = smoothstep(rIn, rIn + 0.25, r);
    float corePeak = exp(-normR * 2.1);
    float sustainedBody = pow(max(0.0, 1.0 - normR * 0.68), 0.55);
    float outerTaper = 1.0 - smoothstep(0.72, 1.0, normR);
    float radialProfile = mix(sustainedBody, corePeak, 0.35) * innerTaper * outerTaper;

    float accretionScale = 0.95 + 0.52 * clamp(accretionRate, 0.0, 2.5);
    float innerCoreBoost = 1.0 + 1.65 * exp(-normR * 5.2);
    float flux = radialProfile * innerCoreBoost * (0.34 + 0.66 * diskFilaments) * dopplerBoost * accretionScale;

    if (uPulseStrength > 0.001) {
      float c1 = exp(-pow((r - uPulseRadius) / 0.45, 2.0));
      float c2 = exp(-pow((r - uPulseRadius * 0.85) / 0.50, 2.0)) * 0.82;
      float c3 = exp(-pow((r - uPulseRadius * 0.70) / 0.55, 2.0)) * 0.68;
      float c4 = exp(-pow((r - uPulseRadius * 0.56) / 0.60, 2.0)) * 0.54;
      float c5 = exp(-pow((r - uPulseRadius * 0.42) / 0.65, 2.0)) * 0.40;
      float c6 = exp(-pow((r - uPulseRadius * 0.28) / 0.70, 2.0)) * 0.28;
      float fineWave = (0.5 + 0.5 * cos((r - uPulseRadius) * 5.2)) * exp(-abs(r - uPulseRadius * 0.68) * 0.30) * 0.55;
      float totalShock = (c1 + c2 + c3 + c4 + c5 + c6 + fineWave) * uPulseStrength;
      flux += totalShock * 1.35 * innerTaper * outerTaper;
    }

    float lutU = clamp(flux / (1.0 + flux * 0.42), 0.04, 0.94);
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
    } else {
      baseLut = mix(baseLut * physicalColorGradient, physicalColorGradient, 0.52);
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float whiteCoreGlow = smoothstep(0.24, 0.0, normR) * (0.50 + 0.50 * diskFilaments) * dopplerBoost * (0.35 + 0.65 * bloomMult);
    vec3 diskColor = baseLut * (0.85 + (1.15 + 0.80 * bloomMult) * flux) + vec3(1.0, 0.94, 0.78) * whiteCoreGlow * (0.75 + 0.55 * bloomMult);
    float diskAlpha = clamp(pow(radialProfile, 0.68) * (0.62 + 0.38 * diskFilaments) * min(1.30, dopplerBoost) * (0.85 + 0.18 * min(2.0, bloomMult)), 0.0, 0.98);

    vec3 tonemappedColor = acesFilm(diskColor * (1.05 + 0.23 * bloomMult));
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
  uniform int uSpectralMode;
  uniform sampler2D uSpectrumLut;
  uniform sampler2D uSkyTexture;
  uniform float uLensingActive;
  uniform float uShowDisk;
  uniform float uIsStar;
  uniform float uPulseRadius;
  uniform float uPulseStrength;
  uniform float uTime;
  uniform float uDiskStyle;
  uniform float uBloomIntensity;

  varying vec2 vUv;
  varying vec3 vWorldPos;

` + GLSL_SIMPLEX_NOISE + `

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

  // Evaluates accretion disk density & emission at equatorial crossing hitXZ without any atan/atan2 discontinuity
  void sampleEquatorialDisk(
    vec2 hitXZ,
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

    if (rHit <= r_horizon || rHit < rIn || rHit > rOut) {
      return;
    }

    vec2 unitDir = hitXZ / max(0.0001, rHit);
    float omega = 3.2 / (pow(rHit, 1.35) + 0.15 * spin);
    float twist = uTime * omega * 1.5 - 1.35 * log(max(0.1, rHit / rIn));
    float ct = cos(twist);
    float st = sin(twist);
    vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

    float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
    float sin2Phi = 2.0 * rotDir.x * rotDir.y;

    float turbA = snoise(rotDir * (rHit * 0.55) + vec2(uTime * 0.12, -uTime * 0.10)) * 0.5 + 0.5;
    float turbB = snoise(rotDir * (rHit * 1.20) - vec2(uTime * 0.16, uTime * 0.14)) * 0.5 + 0.5;

    float band1 = sin(rHit * 4.4 - uTime * 1.8 + cos2Phi * 1.15 + (turbA - 0.5) * 2.0) * 0.5 + 0.5;
    float band2 = cos(rHit * 8.8 - uTime * 2.5 + sin2Phi * 0.85 + (turbB - 0.5) * 1.5) * 0.5 + 0.5;
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
    float innerTaper = smoothstep(rIn, rIn + 0.25, rHit);
    float corePeak = exp(-normR * 2.1);
    float sustainedBody = pow(max(0.0, 1.0 - normR * 0.68), 0.55);
    float outerTaper = 1.0 - smoothstep(0.72, 1.0, normR);
    float radialProfile = mix(sustainedBody, corePeak, 0.35) * innerTaper * outerTaper;

    float accretionScale = 0.95 + 0.52 * clamp(uAccretionRate, 0.0, 2.5);
    float innerCoreBoost = 1.0 + 1.65 * exp(-normR * 5.2);
    float flux = radialProfile * innerCoreBoost * (0.34 + 0.66 * diskFilaments) * dopplerBoost * accretionScale;

    if (uPulseStrength > 0.001) {
      float c1 = exp(-pow((rHit - uPulseRadius) / 0.45, 2.0));
      float c2 = exp(-pow((rHit - uPulseRadius * 0.85) / 0.50, 2.0)) * 0.82;
      float c3 = exp(-pow((rHit - uPulseRadius * 0.70) / 0.55, 2.0)) * 0.68;
      float c4 = exp(-pow((rHit - uPulseRadius * 0.56) / 0.60, 2.0)) * 0.54;
      float c5 = exp(-pow((rHit - uPulseRadius * 0.42) / 0.65, 2.0)) * 0.40;
      float c6 = exp(-pow((rHit - uPulseRadius * 0.28) / 0.70, 2.0)) * 0.28;
      float fineWave = (0.5 + 0.5 * cos((rHit - uPulseRadius) * 5.2)) * exp(-abs(rHit - uPulseRadius * 0.68) * 0.30) * 0.55;
      flux += (c1 + c2 + c3 + c4 + c5 + c6 + fineWave) * uPulseStrength * 1.35 * innerTaper * outerTaper;
    }

    float lutU = clamp(flux / (1.0 + flux * 0.42), 0.04, 0.94);
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

    if (uSpectralMode == 1) {
      baseLut = mix(vec3(0.18, 0.02, 0.01), vec3(1.0, 0.85, 0.42), lutU);
    } else if (uSpectralMode == 2) {
      baseLut = mix(vec3(0.06, 0.16, 0.42), vec3(0.84, 0.95, 1.0), lutU);
    } else if (uSpectralMode == 3) {
      baseLut = mix(vec3(0.95, 0.34, 0.08), vec3(0.22, 0.82, 1.0), clamp(approach * 0.5 + 0.5, 0.0, 1.0)) * (0.42 + 0.58 * diskFilaments);
    } else {
      baseLut = mix(baseLut * physicalColorGradient, physicalColorGradient, 0.52);
    }

    float bloomMult = max(0.0, uBloomIntensity);
    float whiteCoreGlow = smoothstep(0.24, 0.0, normR) * (0.50 + 0.50 * diskFilaments) * dopplerBoost * (0.35 + 0.65 * bloomMult);
    outColor = baseLut * (0.85 + (1.15 + 0.80 * bloomMult) * flux) + vec3(1.0, 0.94, 0.78) * whiteCoreGlow * (0.75 + 0.55 * bloomMult);
    outAlpha = clamp(pow(radialProfile, 0.68) * (0.62 + 0.38 * diskFilaments) * min(1.30, dopplerBoost) * (0.85 + 0.18 * min(2.0, bloomMult)), 0.0, 0.98);
  }

  void main() {
    vec2 uvCentered = (vUv - vec2(0.5)) * 44.0;
    float rQuad = length(uvCentered);
    float spin = clamp(uSpin, 0.0, 0.998);

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
      float photonRing1 = (uIsStar > 0.5) ? 0.0 : exp(-pow(distFromHorizon / 0.06, 2.0)) * (0.65 + 0.55 * bloomMult);
      float photonRing2 = (uIsStar > 0.5) ? 0.0 : exp(-pow((distFromHorizon - 0.08) / 0.11, 2.0)) * (0.25 + 0.25 * bloomMult);
      float photonBloom = (uIsStar > 0.5) ? 0.0 : exp(-distFromHorizon / (0.24 + 0.22 * bloomMult)) * 0.42 * bloomMult;
      float photonRing = photonRing1 + photonRing2 + photonBloom;
      vec3 photonColor = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.80, 0.38), spin * 0.5) * photonRing;

      vec3 lensedDiskColor = vec3(0.0);
      float lensedDiskAlpha = 0.0;

      if (uShowDisk > 0.5 && uLensingActive > 0.5 && b >= r_horizon) {
        float rIn = mix(2.55, 1.45, spin * 0.75);
        float rOut = 11.8;

        // Analytical Einstein gravitational deflection of rays passing above and below the shadow
        float alpha = clamp((2.1 * r_horizon) / (b + 0.12), 0.0, 1.48);
        vec3 inward = -normalize(pLocal);
        vec3 bentDir = normalize(rayDir + inward * sin(alpha));

        if (abs(bentDir.y) > 0.015) {
          float tCross = -pLocal.y / bentDir.y;
          if (tCross > 0.0) {
            vec3 hitPos = pLocal + bentDir * tCross;
            float rHit = length(hitPos.xz);
            if (rHit >= rIn && rHit <= rOut) {
              vec2 unitDir = hitPos.xz / max(0.0001, rHit);
              float omega = 3.2 / (pow(rHit, 1.45) + 0.15 * spin);
              float twist = uTime * omega * 1.5 - 1.35 * log(max(0.1, rHit / rIn));
              float ct = cos(twist);
              float st = sin(twist);
              vec2 rotDir = vec2(unitDir.x * ct - unitDir.y * st, unitDir.x * st + unitDir.y * ct);

              float cos2Phi = rotDir.x * rotDir.x - rotDir.y * rotDir.y;
              float sin2Phi = 2.0 * rotDir.x * rotDir.y;

              float turbA = snoise(rotDir * (rHit * 0.65) + vec2(uTime * 0.12, -uTime * 0.10)) * 0.5 + 0.5;
              float band1 = sin(rHit * 5.2 - uTime * 1.8 + cos2Phi * 1.15 + (turbA - 0.5) * 1.8) * 0.5 + 0.5;
              float band2 = cos(rHit * 10.4 - uTime * 2.4 + sin2Phi * 0.85) * 0.5 + 0.5;
              float diskFilaments = mix(turbA, mix(band1, band2, 0.45), 0.65);

              float approach = clamp(uvCentered.x / max(0.001, length(uvCentered)), -1.0, 1.0);
              float beta = clamp(0.68 / sqrt(max(0.75, rHit - 0.4)), 0.05, 0.78);
              float dopplerFactor = 1.0 / (1.0 - beta * approach * uDopplerStrength);
              float dopplerBoost = pow(clamp(dopplerFactor, 0.35, 2.35), 2.1);

              float normR = clamp((rHit - rIn) / (rOut - rIn), 0.0, 1.0);
              float innerTaper = smoothstep(rIn, rIn + 0.45, rHit);
              float outerTaper = 1.0 - smoothstep(rOut - 2.4, rOut, rHit);
              float radialProfile = pow(1.0 - normR, 1.25) * innerTaper * outerTaper;

              // Smoothly mask near the equatorial plane so the 3D mainDiskMesh renders the primary disk without overlap
              float archMask = smoothstep(0.18, 0.85, abs(pLocal.y));
              float flux = radialProfile * (0.28 + 0.72 * diskFilaments) * dopplerBoost * (0.65 + 0.45 * uAccretionRate);
              if (uPulseStrength > 0.001) {
                float c1 = exp(-pow((rHit - uPulseRadius) / 0.45, 2.0));
                float c2 = exp(-pow((rHit - uPulseRadius * 0.84) / 0.50, 2.0)) * 0.80;
                float c3 = exp(-pow((rHit - uPulseRadius * 0.68) / 0.55, 2.0)) * 0.64;
                float c4 = exp(-pow((rHit - uPulseRadius * 0.52) / 0.60, 2.0)) * 0.48;
                float c5 = exp(-pow((rHit - uPulseRadius * 0.36) / 0.65, 2.0)) * 0.34;
                float fineWave = (0.5 + 0.5 * cos((rHit - uPulseRadius) * 5.0)) * exp(-abs(rHit - uPulseRadius * 0.68) * 0.32) * 0.50;
                flux += (c1 + c2 + c3 + c4 + c5 + fineWave) * uPulseStrength * 1.35 * innerTaper * outerTaper;
              }
              float lutU = clamp(flux * 0.65, 0.02, 0.98);
              vec3 baseLut = texture2D(uSpectrumLut, vec2(lutU, 0.5)).rgb;

              if (uSpectralMode == 1) {
                baseLut = mix(vec3(0.18, 0.02, 0.01), vec3(1.0, 0.85, 0.42), lutU);
              } else if (uSpectralMode == 2) {
                baseLut = mix(vec3(0.06, 0.16, 0.42), vec3(0.84, 0.95, 1.0), lutU);
              } else if (uSpectralMode == 3) {
                baseLut = mix(vec3(0.95, 0.34, 0.08), vec3(0.22, 0.82, 1.0), clamp(approach * 0.5 + 0.5, 0.0, 1.0)) * (0.42 + 0.58 * diskFilaments);
              }

              float innerArchBloom = exp(-normR * 3.0) * bloomMult * 0.55 * dopplerBoost;
              lensedDiskColor = (baseLut * (0.48 + (0.75 + 0.60 * bloomMult) * flux) + vec3(1.0, 0.88, 0.56) * innerArchBloom) * archMask;
              lensedDiskAlpha = clamp(radialProfile * (0.48 + 0.52 * diskFilaments) * min(1.4, dopplerBoost) * (0.82 + 0.22 * min(2.0, bloomMult)), 0.0, 0.97) * archMask;
            }
          }
        }
      }

      float einsteinGlow = (uIsStar > 0.5 || uLensingActive < 0.5)
        ? 0.0
        : clamp(0.12 / (distFromHorizon + 0.18), 0.0, 0.45) * (0.15 + 0.15 * bloomMult);
      vec3 einsteinColor = vec3(0.22, 0.38, 0.62) * einsteinGlow;

      vec3 finalRgb = lensedDiskColor + photonColor + einsteinColor;
      float finalAlpha = clamp(max(lensedDiskAlpha, max(clamp(photonRing, 0.0, 0.98), einsteinGlow)), 0.0, 1.0) * quadFade;
      gl_FragColor = vec4(finalRgb, finalAlpha);
      return;
    }

    // Volumetric Raymarched Mode (uDiskStyle >= 0.5):
    float r_horizon = (uIsStar > 0.5) ? 0.0 : mix(1.95, 1.62, spin * 0.45);
    float rIn = mix(2.38, 1.92, spin * 0.55);
    float rOut = 15.6;

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

    for (int step = 0; step < 130; step++) {
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

      float stepSize = clamp(r * 0.082, 0.075, 0.38);

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

      if (uShowDisk > 0.5 && ((pos.y >= 0.0 && nextPos.y < 0.0) || (pos.y <= 0.0 && nextPos.y > 0.0))) {
        float denom = abs(pos.y) + abs(nextPos.y);
        float frac = denom > 1e-6 ? abs(pos.y) / denom : 0.5;
        vec3 hitPos = mix(pos, nextPos, frac);
        float rHit = length(hitPos);

        if (rHit < r_horizon) {
          accumColor = vec3(0.0);
          accumAlpha = 1.0;
          hitHorizon = true;
          break;
        }

        vec3 sampleCol;
        float sampleAlpha;
        sampleEquatorialDisk(hitPos.xz, nextDir, rHit, r_horizon, rIn, rOut, spin, sampleCol, sampleAlpha);

        if (sampleAlpha > 0.001) {
          float weight = (1.0 - accumAlpha) * sampleAlpha;
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

    float bloomMult = max(0.0, uBloomIntensity);
    float distFromHorizon = max(0.0, minRayR - r_horizon);
    float photonRing1 = (uIsStar > 0.5) ? 0.0 : exp(-pow(distFromHorizon / 0.055, 2.0)) * (0.65 + 0.55 * bloomMult);
    float photonRing2 = (uIsStar > 0.5) ? 0.0 : exp(-pow((distFromHorizon - 0.07) / 0.10, 2.0)) * (0.25 + 0.25 * bloomMult);
    float photonBloom = (uIsStar > 0.5) ? 0.0 : exp(-distFromHorizon / (0.24 + 0.22 * bloomMult)) * 0.42 * bloomMult;
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
  private renderer: THREE.WebGLRenderer;
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
  private ergosphereGroup = new THREE.Group();

  // Spacetime Well Manifold
  private spacetimeWellMesh!: THREE.Mesh;
  private spacetimeWellGeo!: THREE.BufferGeometry;

  // Prototype Compact Star / Neutron Star subsystem
  private neutronStarGroup = new THREE.Group();
  private neutronStarMesh!: THREE.Mesh;
  private pulsarBeamsGroup = new THREE.Group();
  private magneticDipoleGroup = new THREE.Group();

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

  // Event Horizon Pulse & Accretion Disturbance subsystem
  private eventHorizonPulseGroup = new THREE.Group();
  private primaryPulseMesh!: THREE.Mesh;
  private secondaryPulseMesh!: THREE.Mesh;
  private tertiaryPulseMesh!: THREE.Mesh;
  private extraPulseRippleMeshes: Array<{ mesh: THREE.Mesh; ratio: number; opacityWeight: number }> = [];
  private gravitationalWaveShellMesh!: THREE.Mesh;
  private horizonFlashMesh!: THREE.Mesh;
  private isPulseActive = false;
  private pulseProgress = 0.0;
  private pulseDuration = 3.2;
  private pulseStrength = 0.0;
  private pulseRadius = 1.75;
  private pulseColor = new THREE.Color(0xfbbf24);

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
    }
  ) {
    this.container = container;
    this.params = initialParams;
    this.onFeatureSelect = callbacks?.onFeatureSelect;
    this.onTrajectoryCreated = callbacks?.onTrajectoryCreated;
    this.onHoverCoordsChange = callbacks?.onHoverCoordsChange;

    // 1. Initialize WebGLRenderer with Software-WebGL Guard & ACES Filmic Color Pipeline
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Pure Black Deep Space Vacuum
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = null;

    // 3. Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls
    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 500);
    this.camera.position.set(0, 8.2, 24.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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

    // 5. Lighting Rig
    this.setupLightingRig();

    // 6. Build Composite Subsystems
    this.buildRelativisticMotionBlurPass();
    this.buildCosmicSkyDome();
    this.buildCompositeBlackHole();
    this.buildEventHorizonPulseSystem();
    this.buildPrototypeNeutronStar();
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

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event listeners
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('click', this.handleCanvasClick);

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
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
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

    // Primary shockwave ring (expands across equatorial accretion plane)
    const ringGeo = new THREE.RingGeometry(0.85, 1.45, 96);
    ringGeo.rotateX(-Math.PI / 2);

    const pulseShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xfbbf24) },
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
          float dist = abs(radial - 0.85);
          float ring = exp(-pow(dist * 7.0, 2.0));
          // Concentric harmonic sub-ripples inside each shockwave ring
          float subRipples = (0.55 + 0.45 * cos((radial - 0.85) * 42.0)) * exp(-pow(dist * 4.5, 2.0));
          // Bright, incandescent core line with soft plasma aura
          float coreLine = exp(-pow(dist * 22.0, 2.0));
          vec3 finalRgb = mix(uColor, vec3(1.0, 0.98, 0.88), coreLine * 0.75 + subRipples * 0.25);
          gl_FragColor = vec4(finalRgb, (ring * 0.75 + subRipples * 0.55 + coreLine * 0.85) * uOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.primaryPulseMesh = new THREE.Mesh(ringGeo, pulseShaderMat);
    this.primaryPulseMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.primaryPulseMesh);

    // Secondary trailing harmonic shockwave ring
    const secondaryMat = pulseShaderMat.clone();
    this.secondaryPulseMesh = new THREE.Mesh(ringGeo.clone(), secondaryMat);
    this.secondaryPulseMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.secondaryPulseMesh);

    // Tertiary reverberation ring
    const tertiaryMat = pulseShaderMat.clone();
    this.tertiaryPulseMesh = new THREE.Mesh(ringGeo.clone(), tertiaryMat);
    this.tertiaryPulseMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.tertiaryPulseMesh);

    // Additional concentric reverberation ripple rings (7 total expanding shockwave rings)
    const extraRatios = [
      { ratio: 0.90, opacityWeight: 0.82 },
      { ratio: 0.78, opacityWeight: 0.70 },
      { ratio: 0.62, opacityWeight: 0.55 },
      { ratio: 0.36, opacityWeight: 0.34 },
      { ratio: 0.24, opacityWeight: 0.24 },
    ];
    this.extraPulseRippleMeshes = [];
    for (const def of extraRatios) {
      const mat = pulseShaderMat.clone();
      const mesh = new THREE.Mesh(ringGeo.clone(), mat);
      mesh.visible = false;
      this.eventHorizonPulseGroup.add(mesh);
      this.extraPulseRippleMeshes.push({ mesh, ratio: def.ratio, opacityWeight: def.opacityWeight });
    }

    // 3D Quadrupole Gravitational Wave Shell (spherical expanding ripple propagating at c)
    const shellGeo = new THREE.SphereGeometry(1.0, 48, 32);
    const shellMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xfbbf24) },
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
          // Quadrupole radiation pattern (sin^2 theta cos 2 phi)
          float theta = acos(clamp(vPos.y, -1.0, 1.0));
          float phi = atan(vPos.z, vPos.x);
          float quadrupole = pow(sin(theta), 2.0) * (0.65 + 0.35 * cos(phi * 2.0));
          
          // Fresnel rim glow
          float fresnel = pow(1.0 - abs(vNormalVec.z), 2.5);
          float alpha = fresnel * quadrupole * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.gravitationalWaveShellMesh = new THREE.Mesh(shellGeo, shellMat);
    this.gravitationalWaveShellMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.gravitationalWaveShellMesh);

    // Horizon flash burst sphere (brief incandescent flash at the causal boundary)
    const burstGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const burstMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    this.horizonFlashMesh = new THREE.Mesh(burstGeo, burstMat);
    this.horizonFlashMesh.visible = false;
    this.eventHorizonPulseGroup.add(this.horizonFlashMesh);

    this.blackHoleGroup.add(this.eventHorizonPulseGroup);
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
    // Plunges down deep into the cosmic abyss (18 to 48 units deep)
    const wellDepth = (16.0 + (massSolar / 100) * 32.0) * depthMult;
    const rs = 2.4 + (massSolar / 100) * 2.2;

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
      const frameDragSpiral = spin * 0.45 * Math.sin(angle * 2.0 + r * 0.28) * Math.exp(-r * 0.1);

      // Dynamic Event Horizon Pulse: Dense Multi-Ring Concentric Gravitational Wave Train on the Gravity Well
      let pulseWave = 0.0;
      if (this.pulseStrength > 0.005) {
        // Wavefront radius in local manifold coordinates (travels from throat r = 2.5 out to r = 62 across the entire 130x130 grid)
        const frontR = 2.5 + Math.pow(this.pulseProgress, 0.82) * 59.5;
        const innerTap = Math.min(1.0, Math.max(0.0, (r - 1.6) / 2.2));
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

      posAttr.setY(i, depth + frameDragSpiral + pulseWave);
    }
    posAttr.needsUpdate = true;
    this.spacetimeWellGeo.computeVertexNormals();

    if (this.spacetimeWellMesh) {
      const wellMat = this.spacetimeWellMesh.material as THREE.MeshStandardMaterial;
      wellMat.emissiveIntensity = 0.45 + this.pulseStrength * 0.55;
      wellMat.opacity = 0.28 + this.pulseStrength * 0.20;
    }
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
        uSkyTexture: { value: this.skyDomeMat?.map || null },
        uLensingActive: { value: this.params.gravitationalLensing ? 1.0 : 0.0 },
        uShowDisk: { value: this.params.layers.accretionDisk ? 1.0 : 0.0 },
        uIsStar: { value: this.params.objectCategory === 'star' ? 1.0 : 0.0 },
        uPulseRadius: { value: 0 },
        uPulseStrength: { value: 0 },
        uTime: { value: 0 },
        uDiskStyle: { value: this.settings.accretionDiskStyle === 'raymarched' ? 1.0 : 0.0 },
        uBloomIntensity: { value: this.settings.bloomIntensity },
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
        const deflectionFactor = Math.min(7.5, einsteinRadiusSq / (impactB + 0.35));

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
    this.isPulseActive = true;
    this.pulseProgress = 0.0;
    this.pulseStrength = 1.0;
    this.pulseRadius = 1.75 * this.currentScale;

    const isStar = (category || this.params.objectCategory) === 'star';
    this.pulseColor.set(isStar ? 0x38bdf8 : 0xfbbf24);

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

  public updateParams(nextParams: BlackHoleParams, immediate = false) {
    const prevBackgroundTheme = this.params ? this.params.backgroundTheme : undefined;
    const massChanged =
      Math.abs(nextParams.massSolar - this.params.massSolar) > 0.1 ||
      Math.abs(nextParams.spin - this.params.spin) > 0.01 ||
      nextParams.objectCategory !== this.params.objectCategory ||
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
      this.gravitationalLensMesh.visible = !isStar;
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

    switch (preset) {
      case 'equatorial':
        this.targetCamPos.set(0, Math.cos(incRad) * (26.5 * distMultiplier), Math.sin(incRad) * (26.5 * distMultiplier));
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'polar':
        this.targetCamPos.set(0, 32.0 * distMultiplier, 1.5 * distMultiplier);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'grazing':
        this.targetCamPos.set(-9.5 * distMultiplier, 2.2 * distMultiplier, 16.5 * distMultiplier);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'well':
        // Deep angle framing the plunging gravitational well funnel
        this.targetCamPos.set(24.0 * distMultiplier, -14.0 * distMultiplier, 28.0 * distMultiplier);
        this.targetCamLook.set(0, -10.0, 0);
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
    this.renderer.setSize(width, height);
    this.motionBlurRenderTarget?.setSize(width, height);
    if (this.postMaterial) {
      this.postMaterial.uniforms.uResolution.value.set(width, height);
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - this.lastRaycastTime < 55) return;
    this.lastRaycastTime = now;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const ray = this.raycaster.ray;
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
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const hit of hits) {
      if (hit.object.visible && hit.object.userData?.feature) {
        this.onFeatureSelect?.(hit.object.userData.feature as InspectedFeature);
        return;
      }
    }
  };

  private handleCanvasDoubleClick = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
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

    // 2. Smooth Exponential Damping on Scale & Exploded Anatomy Separation
    this.currentScale = THREE.MathUtils.damp(this.currentScale, this.targetScale, 5.5, rawDelta);
    this.currentExploded = THREE.MathUtils.damp(this.currentExploded, this.targetExploded, 6.0, rawDelta);

    this.eventHorizonMesh.scale.setScalar(this.currentScale);
    this.accretionDiskGroup.scale.setScalar(this.currentScale);
    this.neutronStarGroup.scale.setScalar(this.currentScale);

    this.ergosphereGroup.position.y = this.currentExploded * 3.8;
    const wellBaseY = -Math.max(6.8, 4.15 * this.currentScale);
    this.spacetimeWellMesh.position.y = wellBaseY - this.currentExploded * 3.6;
    const wellXZScale = Math.max(1.0, this.currentScale * 0.55);
    this.spacetimeWellMesh.scale.set(wellXZScale, 1.0, wellXZScale);

    // 3. Lense-Thirring Frame-Dragging Rotation
    const metrics = computeRelativisticMetrics(this.params);
    this.ergosphereGroup.rotation.y += simDelta * (0.4 + metrics.frameDraggingOmega * 4.5);
    this.ergosphereGroup.scale.set(
      this.currentScale * (1.0 + 0.22 * this.params.spin),
      this.currentScale * (1.0 - 0.14 * this.params.spin),
      this.currentScale * (1.0 + 0.22 * this.params.spin)
    );

    // 4. Pulsar Lighthouse Beams & Magnetic Field Rotation
    if (this.params.objectCategory === 'star') {
      // Rapid rotation of neutron star crust and sweeping pulsar lighthouse beams (~1.3 second period)
      this.pulsarRotationAngle += simDelta * (4.5 + this.params.spin * 8.0);
      this.pulsarBeamsGroup.rotation.y = this.pulsarRotationAngle;
      this.magneticDipoleGroup.rotation.y = this.pulsarRotationAngle;
      this.neutronStarMesh.rotation.y = this.pulsarRotationAngle * 0.8;
    }

    // 4b. Event Horizon Pulse Animation (Accretion Disk Disturbance & Shockwave Ripple)
    if (this.isPulseActive && simDelta > 0) {
      this.pulseProgress += simDelta / this.pulseDuration;
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
        // High-energy blast, decelerating outward with reverberating echoes
        const ease = 1.0 - Math.pow(1.0 - this.pulseProgress, 2.8);
        this.pulseStrength = Math.pow(1.0 - this.pulseProgress, 1.6);
        const startR = 1.75 * this.currentScale;
        const maxShockRadius = 22.0 * this.currentScale;
        this.pulseRadius = THREE.MathUtils.lerp(startR, maxShockRadius, ease);

        // Update accretion disk disturbance shader uniforms
        this.accretionDiskMat.uniforms.uPulseRadius.value = this.pulseRadius / this.currentScale;
        this.accretionDiskMat.uniforms.uPulseStrength.value = this.pulseStrength;
        this.accretionDiskMat.uniforms.uDiskParams.value.w = this.params.objectCategory === 'star' ? 1.0 : 0.0;

        // Primary shockwave ring expansion & fade
        this.primaryPulseMesh.visible = true;
        this.primaryPulseMesh.scale.set(this.pulseRadius, this.pulseRadius, this.pulseRadius);
        (this.primaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.95;

        // Secondary harmonic echo ring
        const secondaryR = Math.max(startR, this.pulseRadius * 0.72);
        this.secondaryPulseMesh.visible = true;
        this.secondaryPulseMesh.scale.set(secondaryR, secondaryR, secondaryR);
        (this.secondaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.65;

        // Tertiary reverberation ring
        const tertiaryR = Math.max(startR, this.pulseRadius * 0.48);
        this.tertiaryPulseMesh.visible = true;
        this.tertiaryPulseMesh.scale.set(tertiaryR, tertiaryR, tertiaryR);
        (this.tertiaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.45;

        // Additional concentric ripple rings
        for (const extra of this.extraPulseRippleMeshes) {
          const ringR = Math.max(startR, this.pulseRadius * extra.ratio);
          extra.mesh.visible = true;
          extra.mesh.scale.set(ringR, ringR, ringR);
          (extra.mesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
            this.pulseStrength * extra.opacityWeight;
        }

        // 3D Quadrupole Gravitational Wave Shell (expands spherically at c)
        const gwShellR = THREE.MathUtils.lerp(startR, maxShockRadius * 1.2, ease);
        this.gravitationalWaveShellMesh.visible = true;
        this.gravitationalWaveShellMesh.scale.set(gwShellR, gwShellR, gwShellR);
        (this.gravitationalWaveShellMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.70;

        // Horizon flash burst decay at the causal boundary
        if (this.pulseProgress < 0.28) {
          const burstT = this.pulseProgress / 0.28;
          const burstScale = THREE.MathUtils.lerp(1.0, 1.55, burstT) * this.currentScale;
          this.horizonFlashMesh.visible = true;
          this.horizonFlashMesh.scale.set(burstScale, burstScale, burstScale);
          (this.horizonFlashMesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - burstT) * 0.9;
        } else {
          this.horizonFlashMesh.visible = false;
        }

        // Ripple the spacetime well manifold in real-time
        this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
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

    // 10. Update Gravitational Lensing billboard to face camera and align with black hole
    if (this.gravitationalLensMesh && this.gravitationalLensMat) {
      this.gravitationalLensMesh.quaternion.copy(this.camera.quaternion);
      this.gravitationalLensMesh.scale.setScalar(this.currentScale);
      this.gravitationalLensMat.uniforms.uCameraPos.value.copy(this.camera.position);
      this.gravitationalLensMat.uniforms.uBlackHolePos.value.copy(this.blackHoleGroup.position);
      this.gravitationalLensMat.uniforms.uScale.value = this.currentScale;
      this.gravitationalLensMat.uniforms.uTime.value = elapsed;
      this.gravitationalLensMat.uniforms.uPulseRadius.value = this.pulseRadius / this.currentScale;
      this.gravitationalLensMat.uniforms.uPulseStrength.value = this.pulseStrength;
    }

    // 12. Relativistic Audio Modulation: Camera Proximity & Gravitational Time Dilation
    const camDist = this.camera.position.length();
    const rs = 1.75 * this.currentScale;
    const distanceRs = Math.max(1.05, camDist / rs);
    const timeDilation = Math.sqrt(Math.max(0.01, 1.0 - 1.0 / distanceRs));
    relativisticAudio.updateCameraProximity(distanceRs, timeDilation);

    // 13. Camera Angular Velocity & Relativistic Motion Blur
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

    if (isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

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
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('click', this.handleCanvasClick);
    this.renderer.domElement.removeEventListener('dblclick', this.handleCanvasDoubleClick);
    this.controls.dispose();
    this.gravitationalLensMesh?.geometry?.dispose();
    this.gravitationalLensMat?.dispose();
    this.accretionDiskMat?.dispose();
    this.motionBlurRenderTarget?.dispose();
    this.postMaterial?.dispose();
    this.postQuad?.geometry?.dispose();
    this.microlensSourceStarMesh?.geometry?.dispose();
    this.microlensPrimaryImageMesh?.geometry?.dispose();
    this.microlensSecondaryImageMesh?.geometry?.dispose();
    this.microlensEinsteinRingMesh?.geometry?.dispose();
    this.microlensPathTrail?.geometry?.dispose();
    this.renderer.dispose();
  }
}
