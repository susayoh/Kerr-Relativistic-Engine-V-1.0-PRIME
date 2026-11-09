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

// Shared NASA / Schnittman Relativistic Accretion Streamline & Blackbody Color Function
const GLSL_NASA_DISK_COLOR = `
  // ACES filmic tone mapping
  vec3 acesFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  // Maps normalized thermal/Doppler intensity [0..1.6] to the authentic NASA Goddard / Schnittman
  // fiery crimson -> blazing orange -> golden amber -> incandescent yellow-white palette
  vec3 nasaBlackbodyPalette(float intensity, int spectralMode, float approachCos) {
    float x = clamp(intensity, 0.0, 1.65);
    if (spectralMode == 1) {
      // EHT 230 GHz millimeter radio palette
      vec3 c0 = vec3(0.0);
      vec3 c1 = vec3(0.32, 0.03, 0.0);
      vec3 c2 = vec3(0.88, 0.28, 0.02);
      vec3 c3 = vec3(1.0, 0.78, 0.22);
      vec3 c4 = vec3(1.0, 0.96, 0.75);
      if (x < 0.25) return mix(c0, c1, x / 0.25);
      if (x < 0.55) return mix(c1, c2, (x - 0.25) / 0.30);
      if (x < 0.95) return mix(c2, c3, (x - 0.55) / 0.40);
      return mix(c3, c4, clamp((x - 0.95) / 0.55, 0.0, 1.0));
    } else if (spectralMode == 2) {
      // Chandra X-Ray palette
      return mix(vec3(0.02, 0.08, 0.26), vec3(0.85, 0.96, 1.0), clamp(x * 0.75, 0.0, 1.0));
    } else if (spectralMode == 3) {
      // Relativistic Doppler velocity map (approaching blue-cyan vs receding red-orange)
      return mix(vec3(0.95, 0.22, 0.04), vec3(0.20, 0.88, 1.0), clamp(approachCos * 0.5 + 0.5, 0.0, 1.0)) * clamp(x, 0.0, 1.2);
    }

    // Standard NASA Goddard / Schnittman Relativistic Blackbody Palette (BH_labeled-scaled_fb8356c7.jpeg)
    vec3 blackVoid   = vec3(0.00, 0.00, 0.00);
    vec3 deepMaroon  = vec3(0.24, 0.015, 0.00);
    vec3 crimsonRed  = vec3(0.68, 0.07, 0.005);
    vec3 fieryOrange = vec3(0.96, 0.30, 0.01);
    vec3 amberGold   = vec3(1.00, 0.62, 0.06);
    vec3 brightGold  = vec3(1.00, 0.86, 0.32);
    vec3 whiteHot    = vec3(1.00, 0.97, 0.82);

    if (x < 0.14) return mix(blackVoid, deepMaroon, x / 0.14);
    if (x < 0.34) return mix(deepMaroon, crimsonRed, (x - 0.14) / 0.20);
    if (x < 0.62) return mix(crimsonRed, fieryOrange, (x - 0.34) / 0.28);
    if (x < 0.92) return mix(fieryOrange, amberGold, (x - 0.62) / 0.30);
    if (x < 1.25) return mix(amberGold, brightGold, (x - 0.92) / 0.33);
    return mix(brightGold, whiteHot, clamp((x - 1.25) / 0.40, 0.0, 1.0));
  }

  // Computes laminar, concentrically sheared orbital plasma streamlines matching NASA's visualization
  float computeNasaStreamlines(float r, float angle, float simTime, float spin) {
    // Differential Keplerian angular velocity
    float omega = 2.6 / (pow(max(1.2, r), 1.38) + 0.15 * spin);
    float phase = angle + simTime * omega;

    // Cyclic coordinates so there is zero seam at +-PI
    vec2 cyc1 = vec2(cos(phase) * 0.55 + r * 3.6, sin(phase) * 0.55 + r * 1.8);
    vec2 cyc2 = vec2(cos(phase * 2.0) * 0.42 + r * 7.5, sin(phase * 2.0) * 0.42 - r * 2.4);

    // Azimuthally stretched laminar streamlines (high radial frequency, low azimuthal frequency)
    float noiseLow = snoise(cyc1) * 0.5 + 0.5;
    float noiseHigh = snoise(cyc2) * 0.5 + 0.5;

    // Sharp concentric orbital tracks & dark MHD gaps between glowing plasma filaments
    float band1 = sin(r * 13.5 + noiseLow * 2.6 - simTime * 0.9) * 0.5 + 0.5;
    float band2 = sin(r * 28.0 - noiseHigh * 2.1 + cos(phase) * 0.45) * 0.5 + 0.5;
    float band3 = cos(r * 52.0 + noiseLow * 1.8 + sin(phase * 2.0) * 0.35) * 0.5 + 0.5;

    // Carve distinct dark concentric grooves like the NASA ray-traced disk
    float grooveMask = smoothstep(0.14, 0.78, band1) * (0.55 + 0.45 * smoothstep(0.18, 0.85, band2));
    float fineFilaments = mix(band2, band3, 0.42);
    return clamp(grooveMask * (0.62 + 0.52 * fineFilaments) * (0.72 + 0.38 * noiseLow), 0.04, 1.35);
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
  uniform vec4 uDopplerCoeffs;
  uniform vec4 uDiskParams;
  uniform vec4 uTurbulenceBuffer;
  uniform vec4 uTurbulenceHarmonics;
  uniform sampler2D uSpectrumLut;
  uniform float uPulseRadius;
  uniform float uPulseStrength;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

` + GLSL_SIMPLEX_NOISE + GLSL_NASA_DISK_COLOR + `

  void main() {
    float r = length(vLocalPos.xy);
    float spin = clamp(uDiskParams.x, 0.0, 0.998);
    float accretionRate = uDiskParams.y;
    int spectralMode = int(uDiskParams.z);
    float isCorona = uDiskParams.w;

    // Inner boundary matches the Black Hole Shadow radius so the shadow interior stays pitch black
    float rIn = 2.46;
    float rOut = 12.6;

    if (r <= rIn * 0.96 || r > rOut) {
      discard;
    }

    float angle = atan(vLocalPos.y, vLocalPos.x);
    float simTime = uTurbulenceBuffer.x;

    float streamlines = computeNasaStreamlines(r, angle, simTime, spin);

    // Relativistic Tangential Velocity & Doppler Beaming (Left side approaching = bright yellow-gold, Right side receding = dim crimson)
    vec3 localOffset = vWorldPos;
    vec3 tangentDir = normalize(vec3(-localOffset.z, 0.0, localOffset.x));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float approachCos = dot(tangentDir, viewDir);

    float beta = clamp(0.68 * inversesqrt(max(0.9, r - 1.1)), 0.08, 0.78);
    float gamma = inversesqrt(max(0.15, 1.0 - beta * beta));
    float dopplerFactor = 1.0 / (gamma * (1.0 - beta * approachCos * uDopplerCoeffs.x));
    // Strong asymmetric beaming matching NASA's Doppler beaming label
    float dopplerBoost = mix(1.0, pow(clamp(dopplerFactor, 0.36, 2.85), 2.15), uDopplerCoeffs.x);

    // Radial brightness profile: brightest near the inner accretion rim (r = 2.6..4.8), tapering smoothly to pure black at rOut
    float normR = clamp((r - rIn) / (rOut - rIn), 0.0, 1.0);
    float innerRise = smoothstep(rIn * 0.97, rIn + 0.32, r);
    float radialFalloff = pow(max(0.0, 1.0 - normR), 1.55) * (0.45 + 0.85 * exp(-normR * 2.6));

    float intensity = innerRise * radialFalloff * streamlines * dopplerBoost * (0.68 + 0.42 * accretionRate);

    // Event Horizon Pulse shockwave
    if (uPulseStrength > 0.001) {
      float primaryCrest = exp(-pow((r - uPulseRadius) / 0.55, 2.0));
      float echoCrest = exp(-pow((r - uPulseRadius * 0.72) / 0.75, 2.0)) * 0.55;
      intensity += (primaryCrest + echoCrest) * uPulseStrength * 1.65;
    }

    vec3 diskColor = nasaBlackbodyPalette(intensity * 1.18, spectralMode, approachCos);
    float outerFade = 1.0 - smoothstep(rOut - 3.2, rOut, r);
    float diskAlpha = clamp(innerRise * outerFade * smoothstep(0.02, 0.22, intensity) * 0.98, 0.0, 0.99);

    if (isCorona > 0.5) {
      float coronaRadial = exp(-pow((r - (rIn + 0.8)) / 2.4, 2.0));
      diskAlpha *= 0.22 * coronaRadial;
    }

    if (diskAlpha <= 0.003) discard;
    gl_FragColor = vec4(acesFilm(diskColor * 1.08), diskAlpha);
  }
`;

// 2. 3D Event Horizon Shadow Sphere Shader — Pure Pitch Black (#000000) Interior
const HORIZON_VERTEX_SHADER = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HORIZON_FRAGMENT_SHADER = `
  uniform float uSpin;
  uniform int uSpectralMode;

  void main() {
    // Pure pitch black (#000000) inside the black hole shadow as requested
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
`;

// 2b. Relativistic Compact Star / Pulsar Magnetothermal Crust Shader
const STAR_SURFACE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocalPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const STAR_SURFACE_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSpin;
  varying vec3 vNormal;
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;

` + GLSL_SIMPLEX_NOISE + `

  void main() {
    vec3 nPos = normalize(vLocalPos);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float ndotv = max(0.0, dot(vNormal, viewDir));

    // Spherical coordinates for animated magnetothermal convection granulation
    float phi = atan(nPos.z, nPos.x);
    float theta = acos(clamp(nPos.y, -1.0, 1.0));
    vec2 uvSphere = vec2(phi * 1.5, theta * 3.0);

    float gran1 = fbm(uvSphere * 2.8 + vec2(uTime * 0.35, -uTime * 0.2));
    float gran2 = fbm(uvSphere * 6.2 - vec2(uTime * 0.55, gran1 * 1.8));
    float crustCells = clamp(gran1 * 0.6 + gran2 * 0.4, 0.0, 1.0);

    // Magnetic dipole axis tilted by 24 degrees
    vec3 magAxis = normalize(vec3(-sin(0.4188), cos(0.4188), 0.0));
    float magDot = abs(dot(nPos, magAxis));
    // Intense polar synchrotron & X-ray hotspot caps at north & south magnetic poles
    float polarHotspot = pow(magDot, 6.0) * 1.85 + pow(magDot, 18.0) * 2.2;

    // Base superheated neutron star / magnetar color palette
    vec3 deepCrust = vec3(0.06, 0.28, 0.68);
    vec3 midPlasma = vec3(0.22, 0.72, 0.98);
    vec3 hotCore = vec3(0.92, 0.98, 1.0);

    vec3 surfaceCol = mix(deepCrust, midPlasma, smoothstep(0.22, 0.78, crustCells));
    surfaceCol = mix(surfaceCol, hotCore, clamp(pow(crustCells, 2.6) * 0.85 + polarHotspot * 0.65, 0.0, 1.0));

    // Relativistic atmospheric limb brightening
    float limb = pow(1.0 - ndotv, 2.4);
    surfaceCol += vec3(0.35, 0.88, 1.0) * limb * 0.95;
    surfaceCol += vec3(0.85, 0.96, 1.0) * polarHotspot * 0.55;

    gl_FragColor = vec4(surfaceCol, 1.0);
  }
`;

// 2c. Volumetric Pulsar Synchrotron Lighthouse Beam Shader
const PULSAR_BEAM_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vLocalPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const PULSAR_BEAM_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float edgeSoftness = pow(abs(dot(vNormal, viewDir)), 1.35);
    float distAlong = clamp(abs(vLocalPos.y) / 18.0, 0.0, 1.0);
    float longitudinalFade = (1.0 - smoothstep(0.15, 1.0, distAlong)) * smoothstep(0.0, 0.08, distAlong);

    float pulseWave = sin(distAlong * 18.0 - uTime * 9.5) * 0.5 + 0.5;
    float coreSpine = pow(edgeSoftness, 3.2);

    vec3 col = mix(uColor, vec3(0.92, 0.99, 1.0), coreSpine * 0.75 + pulseWave * 0.25);
    float alpha = (edgeSoftness * 0.52 + coreSpine * 0.65) * longitudinalFade * (0.75 + 0.25 * pulseWave);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.88));
  }
`;

// 3. NASA / Schnittman Relativistic Gravitational Lensing Shader:
// Renders:
// - The Upper Lensed Arch ("Image of the disk's far side")
// - The Lower Lensed Arch ("Image of the disk's underside")
// - The Razor-Thin Relativistic Photon Ring inside the dark Black Hole Shadow
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
  uniform float uIsStar;
  uniform float uPulseRadius;
  uniform float uPulseStrength;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPos;

` + GLSL_SIMPLEX_NOISE + GLSL_NASA_DISK_COLOR + `

  void main() {
    if (uIsStar > 0.5 || uLensingActive < 0.5) {
      discard;
    }

    // View-plane coordinates centered on the black hole (in Rg scale units, [-16..16])
    vec2 p = (vUv - vec2(0.5)) * 32.0;

    // Slight Kerr spin asymmetry shifting the photon ring & shadow slightly left
    vec2 pShifted = p - vec2(-uSpin * 0.08, 0.0);
    float r = length(pShifted);

    // Outer boundary fade
    float quadFade = 1.0 - smoothstep(13.5, 15.6, r);
    if (quadFade <= 0.001) discard;

    // Compute observer elevation angle relative to the equatorial accretion plane
    vec3 viewVec = normalize(uCameraPos - uBlackHolePos);
    float elevSin = abs(viewVec.y); // ~0.17 at 80 deg inclination (grazing), ~1.0 at polar
    // Lensed arches are most prominent when viewing near the equatorial plane (as in the NASA image)
    float archVisibility = smoothstep(0.96, 0.55, elevSin);

    // Doppler beaming factor across horizontal axis (left side p.x < 0 is approaching us!)
    float approachCos = clamp(-p.x / max(1.8, abs(p.x) + 1.4), -1.0, 1.0);
    float beta = clamp(0.68 * inversesqrt(max(0.9, r - 0.9)), 0.12, 0.78);
    float gamma = inversesqrt(max(0.15, 1.0 - beta * beta));
    float dopplerFactor = 1.0 / (gamma * (1.0 - beta * approachCos * uDopplerStrength));
    float dopplerBoost = mix(1.0, pow(clamp(dopplerFactor, 0.34, 2.85), 2.15), uDopplerStrength);

    // --- 1. RAZOR-THIN RELATIVISTIC PHOTON RING (n=1 primary & n=2 sub-ring) ---
    // In the NASA image, the photon ring is a crisp, delicate golden-orange circle at r = 2.08
    // surrounded by the pitch-black Black Hole Shadow!
    float rPhoton = 2.06;
    float distPhoton1 = abs(r - rPhoton);
    float distPhoton2 = abs(r - (rPhoton * 0.965));

    // Fine granular photon-orbit texture along the ring
    float ringAngle = atan(pShifted.y, pShifted.x);
    float ringGranule = 0.78 + 0.22 * sin(ringAngle * 14.0 + uTime * 3.5);
    float photonDoppler = mix(0.28, 1.65, clamp((-pShifted.x / max(0.5, r)) * 0.5 + 0.5, 0.0, 1.0));

    float photonRing1 = exp(-pow(distPhoton1 / 0.024, 2.0)) * 1.45 * photonDoppler * ringGranule;
    float photonRing2 = exp(-pow(distPhoton2 / 0.018, 2.0)) * 0.55 * photonDoppler;
    float photonGlow  = exp(-pow(distPhoton1 / 0.075, 2.0)) * 0.24 * photonDoppler;
    float totalPhoton = photonRing1 + photonRing2 + photonGlow;

    vec3 photonCol = nasaBlackbodyPalette(totalPhoton * 1.05, uSpectralMode, approachCos);

    // --- 2. UPPER LENSED ARCH ("Image of the disk's far side") ---
    // Warps the far side of the disk up and over the Black Hole Shadow (r from 2.48 to 6.35),
    // flaring smoothly outward at the horizontal waist (p.y -> 0) into the main disk wings!
    vec3 upperArchCol = vec3(0.0);
    float upperArchAlpha = 0.0;

    if (p.y > -0.35) {
      // Horizontal waist flare creates the continuous saucer/arch transition at y ~ 0
      float waistFlare = exp(-pow(max(0.0, p.y) / 1.45, 1.65)) * 0.92;
      vec2 pUpper = vec2(p.x / (1.0 + waistFlare), p.y * 1.03);
      float rUpper = length(pUpper);
      float rInUpper = 2.48;
      float rOutUpper = 6.45;

      if (rUpper >= rInUpper * 0.95 && rUpper <= rOutUpper) {
        float normRU = clamp((rUpper - rInUpper) / (rOutUpper - rInUpper), 0.0, 1.0);
        float innerEdgeU = smoothstep(rInUpper * 0.96, rInUpper + 0.26, rUpper);
        float outerEdgeU = 1.0 - smoothstep(rOutUpper - 1.65, rOutUpper, rUpper);
        float yCutU = smoothstep(-0.32, 0.08, p.y);

        float phiUpper = atan(pUpper.y, -pUpper.x);
        float streamlinesU = computeNasaStreamlines(rUpper * 1.15, phiUpper, uTime, uSpin);
        float radialFluxU = pow(max(0.0, 1.0 - normRU), 1.35) * (0.52 + 0.78 * exp(-normRU * 2.2));

        float intensityU = innerEdgeU * outerEdgeU * yCutU * radialFluxU * streamlinesU * dopplerBoost * (0.68 + 0.42 * uAccretionRate) * archVisibility;
        upperArchCol = nasaBlackbodyPalette(intensityU * 1.15, uSpectralMode, approachCos);
        upperArchAlpha = clamp(innerEdgeU * outerEdgeU * yCutU * smoothstep(0.02, 0.18, intensityU) * 0.96 * archVisibility, 0.0, 0.98);
      }
    }

    // --- 3. LOWER LENSED ARCH ("Image of the disk's underside") ---
    // Light rays from beneath the far side of the disk bent under the Black Hole Shadow.
    // Separated from the foreground horizontal disk belt by a realistic dark occlusion gap near y ~ -0.25!
    vec3 lowerArchCol = vec3(0.0);
    float lowerArchAlpha = 0.0;

    if (p.y < -0.22) {
      float waistFlareL = exp(-pow(abs(p.y + 0.22) / 1.05, 1.8)) * 0.32;
      vec2 pLower = vec2(p.x / (1.0 + waistFlareL), (p.y + 0.12) * 1.06);
      float rLower = length(pLower);
      float rInLower = 2.48;
      float rOutLower = 5.55;

      if (rLower >= rInLower * 0.95 && rLower <= rOutLower) {
        float normRL = clamp((rLower - rInLower) / (rOutLower - rInLower), 0.0, 1.0);
        float innerEdgeL = smoothstep(rInLower * 0.96, rInLower + 0.24, rLower);
        float outerEdgeL = 1.0 - smoothstep(rOutLower - 1.35, rOutLower, rLower);
        // Crisp dark occlusion gap directly beneath the foreground equatorial disk plane
        float underDiskGap = smoothstep(-0.24, -0.58, p.y);

        float phiLower = atan(-pLower.y, -pLower.x);
        float streamlinesL = computeNasaStreamlines(rLower * 1.22, phiLower, uTime, uSpin);
        float radialFluxL = pow(max(0.0, 1.0 - normRL), 1.42) * (0.48 + 0.75 * exp(-normRL * 2.3));

        float intensityL = innerEdgeL * outerEdgeL * underDiskGap * radialFluxL * streamlinesL * dopplerBoost * (0.64 + 0.40 * uAccretionRate) * archVisibility;
        lowerArchCol = nasaBlackbodyPalette(intensityL * 1.12, uSpectralMode, approachCos);
        lowerArchAlpha = clamp(innerEdgeL * outerEdgeL * underDiskGap * smoothstep(0.02, 0.18, intensityL) * 0.95 * archVisibility, 0.0, 0.98);
      }
    }

    // Combine Upper Arch, Lower Arch, and Photon Ring
    vec3 combinedArchCol = upperArchCol + lowerArchCol;
    float combinedArchAlpha = clamp(max(upperArchAlpha, lowerArchAlpha), 0.0, 0.98);

    vec3 finalCol = combinedArchCol + photonCol;
    float finalAlpha = clamp(max(combinedArchAlpha, clamp(totalPhoton, 0.0, 0.98)), 0.0, 0.99) * quadFade;

    // Inside the black hole shadow (where there is no photon ring or lensed arch), discard so the
    // pure-black 3D eventHorizonMesh and central Singularity remain 100% crisp and unobstructed!
    if (finalAlpha <= 0.004) {
      discard;
    }

    gl_FragColor = vec4(acesFilm(finalCol * 1.06), finalAlpha);
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
  private eventHorizonMat!: THREE.ShaderMaterial;
  private accretionDiskGroup = new THREE.Group();
  private accretionDiskMat!: THREE.ShaderMaterial;
  private accretionCoronaMat!: THREE.ShaderMaterial;
  private singularityGroup = new THREE.Group();
  private singularityGlowMesh!: THREE.Mesh;
  private ergosphereGroup = new THREE.Group();

  // Spacetime Well Manifold
  private spacetimeWellMesh!: THREE.Mesh;
  private spacetimeWellGeo!: THREE.BufferGeometry;

  // Prototype Compact Star / Neutron Star subsystem
  private neutronStarGroup = new THREE.Group();
  private neutronStarMesh!: THREE.Mesh;
  private neutronStarMat!: THREE.ShaderMaterial;
  private pulsarBeamsGroup = new THREE.Group();
  private pulsarBeamMat!: THREE.ShaderMaterial;
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
  private starParallaxWeights = new Float32Array(5500);
  private dampedCamAzimuth = 0.0;
  private dampedCamElevation = 0.17;
  private prevCamAzimuth = 0.0;
  private prevCamElevation = 0.17;
  private camRotParallaxVel = new THREE.Vector2(0, 0);

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
  private gravitationalWaveShellMesh!: THREE.Mesh;
  private horizonFlashMesh!: THREE.Mesh;
  private isPulseActive = false;
  private pulseProgress = 0.0;
  private pulseDuration = 2.4;
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

  // Camera transition state
  private cameraTransitionActive = false;
  private targetCamPos = new THREE.Vector3(0, 4.3, 25.2);
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

    // 2. Scene & Pure Pitch-Black Vacuum Outside the Black Hole
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0);

    // 3. Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls (Framed at ~80° grazing equatorial inclination like NASA visualization)
    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(44, aspect, 0.1, 500);
    this.camera.position.set(0, 4.3, 25.2);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 110;
    this.controls.minDistance = 3.5;
    this.controls.target.set(0, 0, 0);

    this.controls.addEventListener('start', () => {
      this.cameraTransitionActive = false;
      this.followStarMode = false;
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
    grad.addColorStop(0.0, '#000000');
    grad.addColorStop(0.14, '#3d0400');
    grad.addColorStop(0.32, '#991400');
    grad.addColorStop(0.54, '#f24800');
    grad.addColorStop(0.76, '#ff9900');
    grad.addColorStop(0.92, '#ffe066');
    grad.addColorStop(1.0, '#fff7d6');
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

    // 1. Central 3D Black Hole Shadow Sphere (Pure #000000 pitch-black interior, writes to depth so front half of disk passes in front while rear half is occluded)
    const horizonGeo = new THREE.SphereGeometry(2.38, 64, 64);
    this.eventHorizonMat = new THREE.ShaderMaterial({
      uniforms: {
        uSpin: { value: this.params.spin },
        uSpectralMode: { value: 0 },
      },
      vertexShader: HORIZON_VERTEX_SHADER,
      fragmentShader: HORIZON_FRAGMENT_SHADER,
      depthWrite: true,
      depthTest: true,
    });
    this.eventHorizonMesh = new THREE.Mesh(horizonGeo, this.eventHorizonMat);
    this.eventHorizonMesh.renderOrder = 0;
    this.eventHorizonMesh.layers.enable(1);
    this.eventHorizonMesh.userData.feature = {
      title: 'Black Hole Shadow & Event Horizon (r₊)',
      subtitle: 'Gravitational Light-Capture Boundary',
      formula: 'R_shadow = √27 GM/c² ≈ 2.6 R_s · r₊ = (GM/c²)[1 + √(1 - a*²)]',
      description:
        'An area roughly twice the size of the event horizon — the black hole\'s point of no return — formed by its extreme gravitational lensing and capture of light rays.',
    } satisfies InspectedFeature;
    this.blackHoleGroup.add(this.eventHorizonMesh);

    // 1b. Central Gravitational Singularity (Kerr Ring Singularity & Quantum Core at r = 0)
    this.singularityGroup = new THREE.Group();
    const singFeature: InspectedFeature = {
      title: 'Gravitational Singularity (r = 0)',
      subtitle: 'Kerr Ring Singularity & Infinite Curvature Core',
      formula: 'r = 0, θ = π/2 · R_μνρσ R^μνρσ → ∞ · ρ → ∞',
      description:
        'At the very center of the black hole lies the gravitational singularity — a one-dimensional ring in a spinning Kerr black hole where all infalling matter is compressed to infinite density and general-relativistic spacetime curvature diverges.',
    };

    // Pinpoint incandescent central core
    const coreGeo = new THREE.SphereGeometry(0.055, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff7d6,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.renderOrder = 5;
    coreMesh.layers.enable(1);
    coreMesh.userData.feature = singFeature;
    this.singularityGroup.add(coreMesh);

    // Delicate equatorial Kerr Ring Singularity
    const kerrRingGeo = new THREE.RingGeometry(0.11, 0.145, 64);
    kerrRingGeo.rotateX(-Math.PI / 2);
    const kerrRingMat = new THREE.MeshBasicMaterial({
      color: 0xffb74d,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const kerrRingMesh = new THREE.Mesh(kerrRingGeo, kerrRingMat);
    kerrRingMesh.renderOrder = 5;
    kerrRingMesh.layers.enable(1);
    kerrRingMesh.userData.feature = singFeature;
    this.singularityGroup.add(kerrRingMesh);

    // Subtle singularity caustic glint
    const glintGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const glintMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float d = length(p);
          float halo = exp(-d * 6.5) * 0.65;
          float crossSpikes = (exp(-abs(p.x) * 28.0) * exp(-abs(p.y) * 4.5) + exp(-abs(p.y) * 28.0) * exp(-abs(p.x) * 4.5)) * 0.55;
          float a = clamp((halo + crossSpikes) * (1.0 - smoothstep(0.65, 1.0, d)), 0.0, 0.9);
          if (a <= 0.01) discard;
          vec3 col = mix(vec3(1.0, 0.52, 0.08), vec3(1.0, 0.96, 0.82), clamp(halo + crossSpikes, 0.0, 1.0));
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.singularityGlowMesh = new THREE.Mesh(glintGeo, glintMat);
    this.singularityGlowMesh.renderOrder = 5;
    this.singularityGlowMesh.layers.enable(1);
    this.singularityGlowMesh.userData.feature = singFeature;
    this.singularityGroup.add(this.singularityGlowMesh);

    this.blackHoleGroup.add(this.singularityGroup);

    // 2. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Plane + Subtle Corona)
    const initialDopplerCoeffs = new THREE.Vector4(
      this.params.dopplerStrength,
      0.72,
      1.0,
      2.2
    );

    const initialDiskParams = new THREE.Vector4(
      this.params.spin,
      this.params.accretionRate,
      0.0,
      0.0
    );

    const initialTurbBuffer = new THREE.Vector4(0.0, 0.0, 0.0, this.params.timeScale);
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
      },
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    const diskPlaneGeo = new THREE.RingGeometry(2.38, 12.6, 160, 64);
    const mainDiskMesh = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    mainDiskMesh.rotation.x = -Math.PI / 2;
    mainDiskMesh.renderOrder = 2;
    mainDiskMesh.layers.enable(1);
    mainDiskMesh.userData.feature = {
      title: 'Relativistic Accretion Disk',
      subtitle: 'Hot Rotating Plasma & Relativistic Doppler Beaming',
      formula: 'T(r) ∝ r⁻³ᐟ⁴ [1 - √(r_in/r)]¹ᐟ⁴ · D = [γ(1 - β cos θ)]⁻¹',
      description:
        'The hot, thin, rotating disk formed by matter slowly spiraling toward the black hole. Light from glowing gas is brighter on the left side where material is moving toward us.',
    } satisfies InspectedFeature;
    this.accretionDiskGroup.add(mainDiskMesh);

    // Thin Volumetric Upper & Lower Plasma Corona Layers
    this.accretionCoronaMat = this.accretionDiskMat.clone();
    this.accretionCoronaMat.blending = THREE.AdditiveBlending;
    this.accretionCoronaMat.uniforms.uDiskParams.value = new THREE.Vector4(
      this.params.spin,
      this.params.accretionRate,
      0.0,
      1.0
    );

    const coronaGeo = new THREE.RingGeometry(2.42, 9.8, 128, 32);
    const upperCorona = new THREE.Mesh(coronaGeo, this.accretionCoronaMat);
    upperCorona.rotation.x = -Math.PI / 2;
    upperCorona.position.y = 0.08;
    upperCorona.renderOrder = 3;
    this.accretionDiskGroup.add(upperCorona);

    const lowerCorona = new THREE.Mesh(coronaGeo, this.accretionCoronaMat);
    lowerCorona.rotation.x = -Math.PI / 2;
    lowerCorona.position.y = -0.08;
    lowerCorona.renderOrder = 3;
    this.accretionDiskGroup.add(lowerCorona);

    this.blackHoleGroup.add(this.accretionDiskGroup);

    // 3. Ergosphere Geometric Boundary (Toggled OFF automatically by default)
    const ergoGeo = new THREE.SphereGeometry(2.55, 32, 32);
    ergoGeo.scale(1.0, 0.72, 1.0);
    const ergoMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      wireframe: true,
      transparent: true,
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
          float dist = abs(length(vUv - 0.5) * 2.0 - 0.85);
          float ring = exp(-pow(dist * 7.5, 2.0));
          // Bright, incandescent core line with soft plasma aura
          float coreLine = exp(-pow(dist * 22.0, 2.0));
          vec3 finalRgb = mix(uColor, vec3(1.0, 0.98, 0.88), coreLine * 0.7);
          gl_FragColor = vec4(finalRgb, (ring + coreLine * 0.8) * uOpacity);
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
    // 1. Ultra-Dense Crystalline Iron Crust Sphere with Procedural Magnetothermal Convection & Polar Hotspots
    const crustGeo = new THREE.SphereGeometry(1.65, 64, 64);
    this.neutronStarMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpin: { value: this.params.spin },
      },
      vertexShader: STAR_SURFACE_VERTEX_SHADER,
      fragmentShader: STAR_SURFACE_FRAGMENT_SHADER,
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

    // Volumetric Fresnel Magnetospheric Corona Shroud
    const auraGeo = new THREE.SphereGeometry(2.05, 48, 48);
    const auraMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x38bdf8) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.2);
          vec3 col = mix(uColor, vec3(0.9, 0.98, 1.0), fresnel * 0.65);
          gl_FragColor = vec4(col, fresnel * 0.68);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    this.neutronStarMesh.add(auraMesh);

    // 2. Dual Relativistic Pulsar Radio Lighthouse Beams (Volumetric Synchrotron Jet Cones)
    this.pulsarBeamsGroup = new THREE.Group();
    this.pulsarBeamsGroup.rotation.z = THREE.MathUtils.degToRad(24);

    const beamConeGeo = new THREE.ConeGeometry(2.35, 18.5, 48, 1, true);
    beamConeGeo.translate(0, 9.25, 0);

    this.pulsarBeamMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x38bdf8) },
      },
      vertexShader: PULSAR_BEAM_VERTEX_SHADER,
      fragmentShader: PULSAR_BEAM_FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // North Magnetic Pole Beam
    const northBeam = new THREE.Mesh(beamConeGeo, this.pulsarBeamMat);
    this.pulsarBeamsGroup.add(northBeam);

    // South Magnetic Pole Beam
    const southBeam = new THREE.Mesh(beamConeGeo, this.pulsarBeamMat);
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

    // 3. Magnetic Dipole Field Lines (Multi-shell 10¹²–10¹⁵ Gauss Dipolar Magnetosphere Cage)
    this.magneticDipoleGroup = new THREE.Group();
    this.magneticDipoleGroup.rotation.z = THREE.MathUtils.degToRad(24);

    const loopCount = 12;
    const shellRadii = [
      { rx: 3.4, ry: 2.1, color: 0x67e8f9, opacity: 0.52 },
      { rx: 4.8, ry: 3.0, color: 0x34d399, opacity: 0.36 },
    ];
    for (const shell of shellRadii) {
      for (let l = 0; l < loopCount; l++) {
        const angle = (l / loopCount) * Math.PI;
        const curve = new THREE.EllipseCurve(0, 0, shell.rx, shell.ry, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(72).map((p) => new THREE.Vector3(p.x, p.y, 0));
        const loopGeo = new THREE.BufferGeometry().setFromPoints(points);
        const loopMat = new THREE.LineBasicMaterial({
          color: shell.color,
          transparent: true,
          opacity: shell.opacity,
          blending: THREE.AdditiveBlending,
        });
        const loopLine = new THREE.Line(loopGeo, loopMat);
        loopLine.rotation.y = angle;
        this.magneticDipoleGroup.add(loopLine);
      }
    }

    this.magneticDipoleGroup.userData.feature = {
      title: 'Magnetic Dipole Field (10¹²–10¹⁵ Gauss)',
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
    // Expansive, continuous Cartesian Spacetime Manifold (Continuous rubber sheet with NO hole in center)
    // Spreads 130 units wide into deep cosmic Minkowski space
    this.spacetimeWellGeo = new THREE.PlaneGeometry(130, 130, 80, 80);
    this.spacetimeWellGeo.rotateX(-Math.PI / 2);

    const wellMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      roughness: 0.35,
      metalness: 0.8,
    });

    this.spacetimeWellMesh = new THREE.Mesh(this.spacetimeWellGeo, wellMat);
    this.spacetimeWellMesh.position.y = -3.8;
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

      // Dynamic Event Horizon Pulse: Spacetime Gravitational Wave Ripple
      let pulseWave = 0.0;
      if (this.pulseStrength > 0.005) {
        // Multi-harmonic gravitational wave train propagating through the metric
        const shockRadius = this.pulseRadius * 1.85;
        const wavePhase1 = r - shockRadius;
        const waveProfile1 = Math.exp(-Math.pow(wavePhase1 / 3.4, 2.0));
        const wave1 = Math.sin(wavePhase1 * 1.65) * waveProfile1;

        // Trailing reverberation echo (dispersive metric deformation)
        const wavePhase2 = r - (shockRadius * 0.72);
        const waveProfile2 = Math.exp(-Math.pow(wavePhase2 / 4.6, 2.0));
        const wave2 = Math.sin(wavePhase2 * 2.1) * waveProfile2 * 0.55;

        // Radial dampening as the wave dissipates across asymptotic flat spacetime
        const radialFalloff = 1.0 / (1.0 + r * 0.045);
        pulseWave = (wave1 + wave2) * this.pulseStrength * 5.4 * radialFalloff;
      }

      posAttr.setY(i, depth + frameDragSpiral + pulseWave);
    }
    posAttr.needsUpdate = true;
    this.spacetimeWellGeo.computeVertexNormals();
  }

  private buildRelativisticLensingWarp() {
    // Ray-marched Relativistic Gravitational Lens (Interstellar Gargantua ray-deflected geometry & Einstein rings)
    const lensGeo = new THREE.PlaneGeometry(32, 32);
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
        uIsStar: { value: this.params.objectCategory === 'star' ? 1.0 : 0.0 },
        uPulseRadius: { value: 0 },
        uPulseStrength: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: LENSING_VERTEX_SHADER,
      fragmentShader: LENSING_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.gravitationalLensMesh = new THREE.Mesh(lensGeo, this.gravitationalLensMat);
    // RenderOrder 1: after 3D eventHorizonMesh (0), before 3D equatorial accretionDiskGroup (2)
    this.gravitationalLensMesh.renderOrder = 1;
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
    this.starParallaxWeights = new Float32Array(starCount);

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
      // Multi-tiered radial depth distribution [60..215] for rich 3D parallax separation
      const depthTierRand = Math.random();
      const radius =
        depthTierRand < 0.18
          ? 60 + Math.random() * 32 // Foreground stellar cluster tier (strong parallax)
          : depthTierRand < 0.68
          ? 92 + Math.random() * 55 // Mid-field galactic disc tier (moderate parallax)
          : 147 + Math.random() * 68; // Deep background halo tier (subtle reference parallax)

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

      // Inverse-distance parallax weight: foreground stars shift more than distant background stars
      const normInvDist = (220.0 - radius) / 160.0; // ~1.0 for close (r=60), ~0.03 for far (r=215)
      this.starParallaxWeights[i] = 0.12 + Math.pow(Math.max(0.0, normInvDist), 1.35) * 1.85;

      // Realistic Astronomical Initial Mass Function (IMF) / Apparent Magnitude Distribution:
      let baseScale = 0.18;
      const magRand = Math.random();
      if (magRand < 0.80) {
        baseScale = 0.15 + Math.pow(Math.random(), 2.8) * 0.30;
      } else if (magRand < 0.95) {
        baseScale = 0.48 + Math.random() * 0.44;
      } else {
        baseScale = 0.98 + Math.random() * 1.05;
      }

      this.starBaseScales[i] = baseScale;
      this.starTwinklePhases[i] = Math.random() * Math.PI * 2;
      this.starTwinkleSpeeds[i] = 1.4 + Math.random() * 3.8;

      const scaleVec = new THREE.Vector3(baseScale, baseScale, baseScale);
      this.starfieldScales.push(scaleVec);

      _mat4.compose(restPos, _quat.identity(), scaleVec);
      this.starfieldInstanced.setMatrixAt(i, _mat4);

      let colorIndex = 0;
      const specRand = Math.random();
      if (specRand < 0.30) {
        colorIndex = 6; // M red dwarf
      } else if (specRand < 0.55) {
        colorIndex = 5; // K orange dwarf
      } else if (specRand < 0.76) {
        colorIndex = 4; // G solar yellow
      } else if (specRand < 0.89) {
        colorIndex = 3; // F warm white
      } else if (specRand < 0.96) {
        colorIndex = 2; // A white
      } else if (specRand < 0.99) {
        colorIndex = 1; // B blue-white
      } else {
        colorIndex = 0; // O electric blue
      }

      const col = spectralColors[colorIndex].clone();
      if (baseScale > 0.75) {
        col.multiplyScalar(1.35);
      }
      this.starfieldColors.push(col);
      this.starfieldInstanced.setColorAt(i, col);
    }

    this.starfieldInstanced.instanceMatrix.needsUpdate = true;
    if (this.starfieldInstanced.instanceColor) {
      this.starfieldInstanced.instanceColor.needsUpdate = true;
    }
    this.starfieldInstanced.frustumCulled = false;
    this.scene.add(this.starfieldInstanced);
  }

  /**
   * Updates Background Starfield with Camera-Rotation Parallax & General Relativistic Lensing:
   * 1. Multi-Layer Camera Rotation Parallax: Computes the camera's spherical azimuth & elevation
   *    rotation angles as well as instantaneous angular rotation velocity, shifting foreground,
   *    mid-field, and deep-field stars differentially along the camera's local right/up tangent plane.
   * 2. Sky Dome Counter-Parallax: Subtly shifts the cosmic nebula dome at infinity for spatial orientation.
   * 3. General Relativistic Lensing: Deflects starlight passing near the central mass by α ≈ 2 Rs / b.
   */
  private updateGravitationalLensingOfStarfield(rawDelta = 0.016) {
    const camPos = this.camera.position;
    const camDist = Math.max(0.1, camPos.length());
    const rs = 1.75 * this.currentScale;
    const einsteinRadiusSq = Math.max(0.2, rs * rs * 2.8);
    const elapsed = this.clock.getElapsedTime();
    const lensingActive = this.params.gravitationalLensing !== false;

    // Compute camera spherical rotation coordinates (azimuth & elevation)
    const rawAzimuth = Math.atan2(camPos.x, camPos.z);
    const rawElevation = Math.asin(THREE.MathUtils.clamp(camPos.y / camDist, -1.0, 1.0));

    // Handle shortest-arc wrap-around at +-PI for azimuth
    let deltaAz = rawAzimuth - this.dampedCamAzimuth;
    if (deltaAz > Math.PI) deltaAz -= Math.PI * 2.0;
    if (deltaAz < -Math.PI) deltaAz += Math.PI * 2.0;

    const dampRate = 1.0 - Math.exp(-8.5 * rawDelta);
    this.dampedCamAzimuth += deltaAz * dampRate;
    this.dampedCamElevation += (rawElevation - this.dampedCamElevation) * dampRate;

    // Instantaneous angular rotation velocity for dynamic rotational parallax feel
    let stepAz = rawAzimuth - this.prevCamAzimuth;
    if (stepAz > Math.PI) stepAz -= Math.PI * 2.0;
    if (stepAz < -Math.PI) stepAz += Math.PI * 2.0;
    const stepEl = rawElevation - this.prevCamElevation;
    this.prevCamAzimuth = rawAzimuth;
    this.prevCamElevation = rawElevation;

    const invDt = rawDelta > 0.0005 ? Math.min(30.0, 1.0 / rawDelta) : 0.0;
    const targetRotVelX = THREE.MathUtils.clamp(stepAz * invDt * 1.8, -6.5, 6.5);
    const targetRotVelY = THREE.MathUtils.clamp(stepEl * invDt * 1.8, -6.5, 6.5);
    this.camRotParallaxVel.x += (targetRotVelX - this.camRotParallaxVel.x) * dampRate;
    this.camRotParallaxVel.y += (targetRotVelY - this.camRotParallaxVel.y) * dampRate;

    // Subtle counter-rotation parallax on the deep nebula sky dome
    if (this.cosmicSkyDomeMesh) {
      this.cosmicSkyDomeMesh.rotation.y = -this.dampedCamAzimuth * 0.045;
      this.cosmicSkyDomeMesh.rotation.x = this.dampedCamElevation * 0.035;
    }

    // Camera local orthonormal frame for screen-aligned parallax displacement
    _camRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    _camUp.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();
    _vec3B.subVectors(this.controls.target, camPos).normalize();

    const azSin = Math.sin(this.dampedCamAzimuth);
    const azCos = Math.cos(this.dampedCamAzimuth);
    const elSin = Math.sin(this.dampedCamElevation - 0.32);

    for (let i = 0; i < this.starfieldCount; i++) {
      const restPos = this.starRestPositions[i];
      const pWeight = this.starParallaxWeights[i];

      // Subtle celestial twinkle scintillation
      const twinkle = 1.0 + Math.sin(elapsed * this.starTwinkleSpeeds[i] + this.starTwinklePhases[i]) * 0.16;
      const curScale = this.starBaseScales[i] * twinkle;
      this.starfieldScales[i].set(curScale, curScale, curScale);

      // 1. Camera-Rotation & Orbital Depth Parallax:
      // Combines positional orbital parallax, spherical camera-angle tangent shift, and angular velocity lag
      const rotShiftRight = (azSin * 4.8 + this.camRotParallaxVel.x * 1.65) * pWeight;
      const rotShiftUp = (elSin * 4.2 + this.camRotParallaxVel.y * 1.45) * pWeight;

      _vec3D.copy(camPos).multiplyScalar(-0.065 * pWeight);
      _vec3D.addScaledVector(_camRight, -rotShiftRight);
      _vec3D.addScaledVector(_camUp, rotShiftUp);

      // Differential azimuthal twist around vertical axis based on camera rotation
      const twistAngle = (azSin * 0.038 + (1.0 - azCos) * 0.022) * pWeight;
      const cosT = Math.cos(twistAngle);
      const sinT = Math.sin(twistAngle);
      const rx = restPos.x * cosT - restPos.z * sinT;
      const rz = restPos.x * sinT + restPos.z * cosT;

      const parallaxPos = _vec3E.set(rx, restPos.y, rz).add(_vec3D);

      // 2. General Relativistic Lensing Deflection (when enabled)
      if (lensingActive) {
        _vec3A.subVectors(parallaxPos, camPos);
        const starDist = _vec3A.length();
        if (starDist < 1.0) continue;

        const starDir = _vec3A.normalize();
        const cosAngle = starDir.dot(_vec3B);

        if (cosAngle > 0.35) {
          const sinAngle = Math.sqrt(Math.max(0.001, 1.0 - cosAngle * cosAngle));
          const impactB = Math.max(rs * 0.9, starDist * sinAngle);
          const deflectionFactor = Math.min(7.5, einsteinRadiusSq / (impactB + 0.35));

          _vec3C.crossVectors(_vec3B, starDir).crossVectors(_vec3C, _vec3B).normalize();
          const deflectedPos = _vec3A.copy(parallaxPos).addScaledVector(_vec3C, deflectionFactor * 2.2);
          _mat4.compose(deflectedPos, _quat.identity(), this.starfieldScales[i]);
          this.starfieldInstanced.setMatrixAt(i, _mat4);
          continue;
        }
      }

      _mat4.compose(parallaxPos, _quat.identity(), this.starfieldScales[i]);
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

    // Position Primary Image (I₊) in front of the black hole
    const posPlus = new THREE.Vector3().copy(this.blackHoleGroup.position).addScaledVector(unitTransverse, thetaPlus);
    posPlus.z += 0.5; // Slight forward bias to remain crisply visible
    this.microlensPrimaryImageMesh.position.copy(posPlus);

    const scalePlus = Math.min(3.2, Math.max(0.35, Math.pow(magPlus, 0.42) * 0.45));
    this.microlensPrimaryImageMesh.scale.set(scalePlus, scalePlus, scalePlus);
    (this.microlensPrimaryImageMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1.0, 0.35 + magPlus * 0.18);

    // Position Secondary Image (I₋) across the opposite limb
    const posMinus = new THREE.Vector3().copy(this.blackHoleGroup.position).addScaledVector(unitTransverse, thetaMinus);
    posMinus.z += 0.4;
    this.microlensSecondaryImageMesh.position.copy(posMinus);

    const scaleMinus = Math.min(2.4, Math.max(0.18, Math.pow(magMinus, 0.42) * 0.38));
    this.microlensSecondaryImageMesh.scale.set(scaleMinus, scaleMinus, scaleMinus);
    (this.microlensSecondaryImageMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.95, magMinus * 0.22);

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
    }

    const modeIndex =
      nextParams.spectralMode === 'eht230ghz'
        ? 1
        : nextParams.spectralMode === 'xray'
        ? 2
        : nextParams.spectralMode === 'doppler'
        ? 3
        : 0;

    if (this.accretionDiskMat) {
      const dopplerStrength = nextParams.dopplerStrength;
      const betaScale = 0.72;
      const gammaClamp = 1.0;
      const dopplerExponent = 2.2;
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
        0.0
      );
    }

    if (this.accretionCoronaMat) {
      this.accretionCoronaMat.uniforms.uDopplerCoeffs.value.set(
        nextParams.dopplerStrength,
        0.72,
        1.0,
        2.2
      );
      this.accretionCoronaMat.uniforms.uDiskParams.value.set(
        nextParams.spin,
        nextParams.accretionRate,
        modeIndex,
        1.0
      );
    }

    if (this.eventHorizonMat) {
      this.eventHorizonMat.uniforms.uSpin.value = nextParams.spin;
      this.eventHorizonMat.uniforms.uSpectralMode.value = modeIndex;
      this.eventHorizonMesh.scale.setScalar(this.currentScale);
    }

    if (this.singularityGroup) {
      this.singularityGroup.visible = !isStar;
      this.singularityGroup.scale.setScalar(this.currentScale);
    }

    if (this.gravitationalLensMat) {
      this.gravitationalLensMat.uniforms.uSpin.value = nextParams.spin;
      this.gravitationalLensMat.uniforms.uAccretionRate.value = nextParams.accretionRate;
      this.gravitationalLensMat.uniforms.uDopplerStrength.value = nextParams.dopplerStrength;
      this.gravitationalLensMat.uniforms.uSpectralMode.value = modeIndex;
      this.gravitationalLensMat.uniforms.uLensingActive.value = nextParams.gravitationalLensing ? 1.0 : 0.0;
      this.gravitationalLensMat.uniforms.uIsStar.value = isStar ? 1.0 : 0.0;
      this.gravitationalLensMesh.visible = isStar ? false : (nextParams.layers.accretionDisk || nextParams.gravitationalLensing);
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
      this.singularityGroup.visible = false;
      this.neutronStarGroup.visible = true;
      this.pulsarBeamsGroup.visible = nextParams.layers.pulsarBeams ?? true;
      this.magneticDipoleGroup.visible = nextParams.layers.magneticField ?? true;
    } else {
      this.eventHorizonMesh.visible = true;
      this.singularityGroup.visible = true;
      this.neutronStarGroup.visible = false;
    }

    // Layer visibilities (Note: ergosphereCage is toggled off automatically by default)
    this.accretionDiskGroup.visible = nextParams.layers.accretionDisk;
    this.ergosphereGroup.visible = isStar ? false : nextParams.layers.ergosphereCage;
    this.spacetimeWellMesh.visible = nextParams.layers.spacetimeGrid;
    this.orbitalStarsGroup.visible = nextParams.layers.orbitalStars;
    this.geodesicGroup.visible = nextParams.layers.geodesicRays;

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
        this.targetCamPos.set(0, Math.cos(incRad) * (25.5 * distMultiplier), Math.sin(incRad) * (25.5 * distMultiplier));
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'polar':
        this.targetCamPos.set(0, 32.0 * distMultiplier, 1.5 * distMultiplier);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'grazing':
        this.targetCamPos.set(-9.5 * distMultiplier, 2.2 * distMultiplier, 16.5 * distMultiplier);
        this.targetCamLook.set(1.5, 0.2, 0);
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

    if (this.accretionCoronaMat) {
      this.accretionCoronaMat.uniforms.uTurbulenceBuffer.value.set(
        elapsed,
        elapsed * 0.35,
        elapsed * 3.2,
        this.params.timeScale
      );
    }

    // 2. Smooth Exponential Damping on Scale & Exploded Anatomy Separation
    this.currentScale = THREE.MathUtils.damp(this.currentScale, this.targetScale, 5.5, rawDelta);
    this.currentExploded = THREE.MathUtils.damp(this.currentExploded, this.targetExploded, 6.0, rawDelta);

    this.eventHorizonMesh.scale.setScalar(this.currentScale);
    if (this.singularityGroup) {
      this.singularityGroup.scale.setScalar(this.currentScale);
      if (this.singularityGlowMesh) {
        this.singularityGlowMesh.quaternion.copy(this.camera.quaternion);
      }
    }
    this.accretionDiskGroup.scale.setScalar(this.currentScale);
    this.neutronStarGroup.scale.setScalar(this.currentScale);

    this.ergosphereGroup.position.y = this.currentExploded * 3.8;
    this.spacetimeWellMesh.position.y = -3.2 - this.currentExploded * 3.6;

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
      this.pulsarRotationAngle += simDelta * (4.5 + this.params.spin * 8.0);
      this.pulsarBeamsGroup.rotation.y = this.pulsarRotationAngle;
      this.magneticDipoleGroup.rotation.y = this.pulsarRotationAngle;
      this.neutronStarMesh.rotation.y = this.pulsarRotationAngle * 0.8;
      if (this.neutronStarMat) {
        this.neutronStarMat.uniforms.uTime.value = elapsed;
        this.neutronStarMat.uniforms.uSpin.value = this.params.spin;
      }
      if (this.pulsarBeamMat) {
        this.pulsarBeamMat.uniforms.uTime.value = elapsed;
      }
    }

    // 4b. Event Horizon Pulse Animation (Accretion Disk Disturbance & Shockwave Ripple)
    if (this.isPulseActive) {
      this.pulseProgress += rawDelta / this.pulseDuration;
      if (this.pulseProgress >= 1.0) {
        this.isPulseActive = false;
        this.pulseProgress = 1.0;
        this.pulseStrength = 0.0;
        this.primaryPulseMesh.visible = false;
        this.secondaryPulseMesh.visible = false;
        this.tertiaryPulseMesh.visible = false;
        this.gravitationalWaveShellMesh.visible = false;
        this.horizonFlashMesh.visible = false;
        this.accretionDiskMat.uniforms.uPulseStrength.value = 0.0;
        if (this.accretionCoronaMat) {
          this.accretionCoronaMat.uniforms.uPulseStrength.value = 0.0;
        }
        this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
      } else {
        const ease = 1.0 - Math.pow(1.0 - this.pulseProgress, 2.8);
        this.pulseStrength = Math.pow(1.0 - this.pulseProgress, 1.6);
        const startR = 1.75 * this.currentScale;
        const maxShockRadius = 22.0 * this.currentScale;
        this.pulseRadius = THREE.MathUtils.lerp(startR, maxShockRadius, ease);

        this.accretionDiskMat.uniforms.uPulseRadius.value = this.pulseRadius / this.currentScale;
        this.accretionDiskMat.uniforms.uPulseStrength.value = this.pulseStrength;
        if (this.accretionCoronaMat) {
          this.accretionCoronaMat.uniforms.uPulseRadius.value = this.pulseRadius / this.currentScale;
          this.accretionCoronaMat.uniforms.uPulseStrength.value = this.pulseStrength;
        }

        this.primaryPulseMesh.visible = true;
        this.primaryPulseMesh.scale.set(this.pulseRadius, this.pulseRadius, this.pulseRadius);
        (this.primaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.95;

        const secondaryR = Math.max(startR, this.pulseRadius * 0.72);
        this.secondaryPulseMesh.visible = true;
        this.secondaryPulseMesh.scale.set(secondaryR, secondaryR, secondaryR);
        (this.secondaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.65;

        const tertiaryR = Math.max(startR, this.pulseRadius * 0.48);
        this.tertiaryPulseMesh.visible = true;
        this.tertiaryPulseMesh.scale.set(tertiaryR, tertiaryR, tertiaryR);
        (this.tertiaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.40;

        const gwShellR = THREE.MathUtils.lerp(startR, maxShockRadius * 1.2, ease);
        this.gravitationalWaveShellMesh.visible = true;
        this.gravitationalWaveShellMesh.scale.set(gwShellR, gwShellR, gwShellR);
        (this.gravitationalWaveShellMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.70;

        if (this.pulseProgress < 0.28) {
          const burstT = this.pulseProgress / 0.28;
          const burstScale = THREE.MathUtils.lerp(1.0, 1.55, burstT) * this.currentScale;
          this.horizonFlashMesh.visible = true;
          this.horizonFlashMesh.scale.set(burstScale, burstScale, burstScale);
          (this.horizonFlashMesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - burstT) * 0.9;
        } else {
          this.horizonFlashMesh.visible = false;
        }

        this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
      }
    }

    // 5. Camera-Rotation Parallax & Gravitational Lensing of Background Starfield (always updates parallax)
    this.updateGravitationalLensingOfStarfield(rawDelta);

    // 5b. Distant Background Star Gravitational Microlensing Simulation
    this.updateBackgroundStarMicrolensing(simDelta);

    // 6. Advance Orbiting Star S2 along Relativistic Orbit with Doppler Color Shift
    const orbitSceneRadius = this.params.probeRadiusRs * 1.75 * this.currentScale;
    const angularSpeed = (1.65 * metrics.probeOrbitalBeta) / Math.max(1.5, this.params.probeRadiusRs * 0.45);
    this.starOrbitAngle += simDelta * angularSpeed;

    const starX = Math.cos(this.starOrbitAngle) * orbitSceneRadius;
    const starZ = -Math.sin(this.starOrbitAngle) * orbitSceneRadius;
    const starY = Math.sin(this.starOrbitAngle * 2.0) * 0.22 * this.params.spin;
    this.starS2Mesh.position.set(starX, starY, starZ);

    // Relativistic Doppler shift of Star S2 corona based on line-of-sight orbital velocity
    _vec3A.set(-Math.sin(this.starOrbitAngle), 0, -Math.cos(this.starOrbitAngle)).normalize();
    _vec3B.subVectors(this.camera.position, this.starS2Mesh.position).normalize();
    const s2Approach = _vec3A.dot(_vec3B);
    const s2Hue = THREE.MathUtils.clamp(0.58 + s2Approach * 0.08, 0.06, 0.65);
    (this.starS2GlowMesh.material as THREE.MeshBasicMaterial).color.setHSL(s2Hue, 0.92, 0.68);

    const starPulse = 1.0 + Math.sin(elapsed * 4.5) * 0.14;
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

    // 8. Advance Geodesic Photon Pulses (Single-pass decay without infinite looping)
    for (let i = this.activeGeodesicPulses.length - 1; i >= 0; i--) {
      const item = this.activeGeodesicPulses[i];
      item.progress += rawDelta * item.speed * Math.max(0.25, this.params.timeScale);
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

    // 9. Camera Controls & Interpolation
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
    }

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

    this.controls.update();

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

    if (this.camMotionBlurStrength > 0.012 && this.motionBlurRenderTarget && this.postMaterial) {
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
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: 0.92,
    });
    this.cosmicSkyDomeMesh = new THREE.Mesh(skyGeo, this.skyDomeMat);
    this.scene.add(this.cosmicSkyDomeMesh);
    this.updateSkyDomeTexture(this.params.backgroundTheme || 'pure_black');
  }

  private updateSkyDomeTexture(themeId: BackgroundThemeId) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (themeId === 'pure_black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 512, 256);
    } else if (themeId === 'galactic_core') {
      const grad = ctx.createRadialGradient(256, 128, 15, 256, 128, 255);
      grad.addColorStop(0.0, '#2d180d');
      grad.addColorStop(0.35, '#180d07');
      grad.addColorStop(0.7, '#0c0604');
      grad.addColorStop(1.0, '#060303');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.09)';
      ctx.beginPath();
      ctx.ellipse(256, 128, 230, 48, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (themeId === 'cosmic_nebula') {
      const grad = ctx.createRadialGradient(256, 128, 15, 256, 128, 255);
      grad.addColorStop(0.0, '#082535');
      grad.addColorStop(0.4, '#09152b');
      grad.addColorStop(0.75, '#050c18');
      grad.addColorStop(1.0, '#02050b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.beginPath();
      ctx.ellipse(230, 110, 200, 60, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (themeId === 'stellar_nursery') {
      const grad = ctx.createRadialGradient(256, 128, 15, 256, 128, 255);
      grad.addColorStop(0.0, '#260e32');
      grad.addColorStop(0.4, '#170924');
      grad.addColorStop(0.75, '#0c0515');
      grad.addColorStop(1.0, '#05020a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);

      ctx.fillStyle = 'rgba(192, 132, 252, 0.09)';
      ctx.beginPath();
      ctx.ellipse(270, 130, 210, 55, 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (themeId === 'soothing_void') {
      const grad = ctx.createRadialGradient(256, 128, 30, 256, 128, 250);
      grad.addColorStop(0.0, '#0e121a');
      grad.addColorStop(0.5, '#080c12');
      grad.addColorStop(1.0, '#030508');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);
    } else {
      const grad = ctx.createRadialGradient(256, 128, 20, 256, 128, 250);
      grad.addColorStop(0.0, '#101520');
      grad.addColorStop(0.6, '#0a0d16');
      grad.addColorStop(1.0, '#06080e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (this.skyDomeMat.map) {
      this.skyDomeMat.map.dispose();
    }
    this.skyDomeMat.map = texture;
    this.skyDomeMat.needsUpdate = true;
  }

  public setBackgroundTheme(themeId: BackgroundThemeId) {
    const isPureBlack = themeId === 'pure_black';
    const theme = BACKGROUND_THEMES[themeId] || BACKGROUND_THEMES.pure_black;
    this.scene.background = new THREE.Color(theme.bgColor);
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
    this.updateSkyDomeTexture(themeId);
    if (this.gravitationalLensMat && this.skyDomeMat?.map) {
      this.gravitationalLensMat.uniforms.uSkyTexture.value = this.skyDomeMat.map;
    }
    if (this.cosmicSkyDomeMesh) {
      this.cosmicSkyDomeMesh.visible = !isPureBlack;
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

    // Camera-aligned right & up basis vectors so callouts on the lensed arches, photon ring,
    // and black hole shadow always attach to the exact visual feature on screen!
    _camRight.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    _camUp.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();

    const makeCamAlignedPos = (rightUnits: number, upUnits: number, forwardUnits = 0) => {
      const p = new THREE.Vector3();
      p.addScaledVector(_camRight, rightUnits * scale);
      p.addScaledVector(_camUp, upUnits * scale);
      if (forwardUnits !== 0) {
        _vec3B.subVectors(this.camera.position, this.controls.target).normalize();
        p.addScaledVector(_vec3B, forwardUnits * scale);
      }
      return p;
    };

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

    // Authentic NASA Goddard / Jeremy Schnittman Black Hole Anatomy Labels (BH_labeled-scaled_fb8356c7.jpeg) + Central Singularity
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
        name: "Image of the disk's far side",
        badge: 'Gravitational Lensing (Upper Arch)',
        badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        headline: "Image of the disk's far side",
        description: "The black hole's gravitational field alters the path of light from the far side of the disk, producing this part of the image.",
        pos: makeCamAlignedPos(-1.65, 3.35),
        dockPosition: 'top-left',
      },
      {
        id: 'photon_ring',
        name: 'Photon ring',
        badge: 'Multiple Orbiting Light Images',
        badgeColor: 'text-amber-200 border-amber-400/40 bg-amber-950/40',
        headline: 'Photon ring',
        description: 'A ring of light composed of multiple distorted images of the disk. The light making up these images has orbited the black hole two, three or even more times before escaping to us. They become thinner and fainter closer to the black hole.',
        pos: makeCamAlignedPos(0.18, 2.04),
        dockPosition: 'top-right',
      },
      {
        id: 'black_hole_shadow',
        name: 'Black hole shadow',
        badge: '2× Event Horizon Capture Area',
        badgeColor: 'text-neutral-200 border-neutral-600/50 bg-neutral-900/70',
        headline: 'Black hole shadow',
        description: "This is an area roughly twice the size of the event horizon — the black hole's point of no return — that is formed by its gravitational lensing and capture of light rays.",
        pos: makeCamAlignedPos(1.05, 0.82),
        dockPosition: 'mid-right',
      },
      {
        id: 'doppler_beaming',
        name: 'Doppler beaming',
        badge: 'Relativistic Approaching Gas',
        badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        headline: 'Doppler beaming',
        description: "Light from glowing gas in the accretion disk is brighter on the side where material is moving toward us, fainter on the side where it's moving away from us.",
        pos: makeCamAlignedPos(-3.15, 0.25, 1.2),
        dockPosition: 'mid-left',
      },
      {
        id: 'accretion_disk',
        name: 'Accretion disk',
        badge: 'Infalling Superheated Matter',
        badgeColor: 'text-orange-300 border-orange-500/40 bg-orange-950/40',
        headline: 'Accretion disk',
        description: 'The hot, thin, rotating disk formed by matter slowly spiraling toward the black hole.',
        pos: makeCamAlignedPos(-6.65, -0.22, 1.8),
        dockPosition: 'bottom-left',
      },
      {
        id: 'underside',
        name: "Image of the disk's underside",
        badge: 'Gravitationally Lensed Underside',
        badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        headline: "Image of the disk's underside",
        description: 'Light rays from beneath the far side of the disk are gravitationally "lensed" to produce this part of the image.',
        pos: makeCamAlignedPos(-1.62, -3.05),
        dockPosition: 'bottom-left',
      },
      {
        id: 'singularity',
        name: 'Singularity',
        badge: 'Infinite Curvature Core (r = 0)',
        badgeColor: 'text-amber-100 border-amber-300/40 bg-amber-950/50',
        headline: 'Singularity',
        description: 'The infinitely dense central core inside the event horizon where spacetime curvature becomes infinite and all infalling matter is crushed.',
        pos: new THREE.Vector3(0, 0, 0),
        dockPosition: 'bottom-right',
      },
    ];

    return anchors.map((a) => {
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
    const accretionOuterRs = 5.8;

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
