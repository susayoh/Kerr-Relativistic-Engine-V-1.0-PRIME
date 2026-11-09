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

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  // ACES filmic tone mapping to preserve dynamic range under strong Doppler beaming
  vec3 acesFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    float r = length(vLocalPos.xy);
    float spin = uDiskParams.x;
    float accretionRate = uDiskParams.y;
    int spectralMode = int(uDiskParams.z);

    float r_horizon = mix(1.75, 1.08, spin * 0.72);
    float rIn = 1.68;
    float rOut = 11.8;

    // Hard-clamp the inner event horizon shadow directly in the shader
    if (r <= r_horizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    if (r < rIn || r > rOut) {
      discard;
    }

    float angle = atan(vLocalPos.y, vLocalPos.x);

    // Optimized Relativistic Keplerian differential shear using uniform-buffer constants
    // Avoids expensive per-fragment pow() with optimized rational shear formulation
    float rInv = 1.0 / (r * sqrt(r) + 0.12 * spin);
    float omega = 3.6 * rInv;
    float spiralPhase = angle + uTurbulenceBuffer.x * omega * 2.2;

    // Fast multi-frequency trigonometric orbital turbulence & density wave harmonics
    // Sourced directly from the uniform-buffer parameters (bypasses heavy multi-octave simplex loops)
    float waveA = sin(r * uTurbulenceHarmonics.x + spiralPhase * uTurbulenceHarmonics.y + uTurbulenceBuffer.y);
    float waveB = cos(r * 9.5 - uTurbulenceBuffer.z + waveA * 1.8);
    float waveC = sin(r * 4.2 + spiralPhase * 1.5 - uTurbulenceBuffer.w);
    float diskTurb = waveA * 0.5 + 0.5;
    float diskRings = waveB * 0.5 + 0.5;
    float diskFilaments = mix(diskTurb, diskRings, uTurbulenceHarmonics.w) + waveC * 0.12;

    // Relativistic Kinematics:
    vec3 tangentDir = normalize(vec3(-vWorldPos.z, 0.0, vWorldPos.x));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float approachCos = dot(tangentDir, viewDir);

    // Optimized Doppler factor using pre-calculated uniform coefficients
    // beta = clamp(betaScale / sqrt(r - 0.7), 0.05, 0.76)
    float beta = clamp(uDopplerCoeffs.y * inversesqrt(max(1.0, r - 0.7)), 0.05, 0.76);
    float gamma = inversesqrt(max(0.1, 1.0 - beta * beta));
    float dopplerFactor = 1.0 / (gamma * (1.0 - beta * approachCos * uDopplerCoeffs.x));
    float dopplerBoost = mix(1.0, pow(clamp(dopplerFactor, 0.35, 2.7), uDopplerCoeffs.w), uDopplerCoeffs.x);

    // Radial Novikov-Thorne flux profile matching top arch
    float normR = clamp((r - rIn) / (rOut - rIn), 0.0, 1.0);
    float flux = pow(1.0 - normR, 1.42) * smoothstep(rIn, rIn + 0.28, r) * (1.0 - smoothstep(rOut - 2.0, rOut, r));
    flux *= (0.65 + 0.8 * diskFilaments) * dopplerBoost * (0.7 + 0.5 * accretionRate);

    // Event Horizon Multi-Stage Pulse & Accretion Disturbance Shockwave
    if (uPulseStrength > 0.001) {
      // Primary compression shock front
      float primaryDist = abs(r - uPulseRadius);
      float primaryCrest = exp(-pow(primaryDist / 0.55, 2.0));
      // Trailing harmonic echoes (density ripples reverberating across disk)
      float echoDist1 = abs(r - (uPulseRadius * 0.72));
      float echoCrest1 = exp(-pow(echoDist1 / 0.75, 2.0)) * 0.65;
      float echoDist2 = abs(r - (uPulseRadius * 0.48));
      float echoCrest2 = exp(-pow(echoDist2 / 0.95, 2.0)) * 0.40;
      float totalShock = (primaryCrest + echoCrest1 + echoCrest2) * uPulseStrength;
      flux += totalShock * 2.8;
    }

    // Physical Blackbody Color Spectrum (identical to top lensed arch)
    vec3 baseLut = texture2D(uSpectrumLut, vec2(clamp(flux * 0.65, 0.02, 0.98), 0.5)).rgb;
    if (spectralMode == 1) { // EHT 230 GHz
      baseLut = mix(vec3(0.14, 0.02, 0.01), vec3(1.0, 0.95, 0.65), clamp(flux * 0.85, 0.0, 1.0));
    } else if (spectralMode == 2) { // Chandra X-Ray
      baseLut = mix(vec3(0.04, 0.12, 0.35), vec3(0.92, 0.98, 1.0), clamp(flux * 0.85, 0.0, 1.0));
    } else if (spectralMode == 3) { // Doppler shift map
      baseLut = mix(vec3(0.95, 0.38, 0.1), vec3(0.2, 0.85, 1.0), clamp(approachCos * 0.5 + 0.5, 0.0, 1.0)) * flux;
    }

    vec3 diskColor = baseLut * 1.5;
    float diskAlpha = clamp(flux * (0.65 + 0.35 * diskFilaments) * min(1.6, dopplerBoost), 0.0, 0.98);

    // Exposure & Tone Mapping: ACES tone mapping to maintain texture/contrast on Doppler beamed side
    vec3 tonemappedColor = acesFilm(diskColor * 1.15);
    gl_FragColor = vec4(tonemappedColor, diskAlpha);
  }
`;



// 3. Relativistic Gravitational Lensing Shader (The Interstellar Gargantua Double-Arch Effect & Background Warping)
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

` + GLSL_SIMPLEX_NOISE + `

  // ACES filmic tone mapping to preserve dynamic range and avoid blown-out highlights
  vec3 acesFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    // Coordinate in view quad plane relative to black hole center in scale units
    vec2 uvCentered = (vUv - vec2(0.5)) * 32.0;
    float r = length(uvCentered); // Impact parameter / radius in units of black hole scale
    float r_horizon = (uIsStar > 0.5) ? 0.0 : mix(2.62, 2.05, uSpin * 0.65);

    // Smooth edge fade of outer quad to prevent boundary seams
    float quadFade = 1.0 - smoothstep(13.8, 15.6, r);
    if (quadFade <= 0.001) discard;

    // 1. Direct inner event horizon shadow clamp
    if (r <= r_horizon) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec3 rayDir = normalize(vWorldPos - uCameraPos);
    vec3 toCenter = uBlackHolePos - uCameraPos;
    float tCenter = dot(toCenter, rayDir);
    vec3 pClosest = uCameraPos + tCenter * rayDir;
    vec3 bVec = pClosest - uBlackHolePos;

    float rs = 1.75 * uScale;

    // 2. Continuous Incandescent Photon Ring (razor-sharp Einstein ring inner edge)
    float ringDist = abs(r - r_horizon * 1.012);
    float photonRing = (uIsStar > 0.5) ? 0.0 : exp(-pow(ringDist / 0.028, 2.0));
    vec3 photonColor = mix(vec3(1.0, 0.98, 0.94), vec3(1.0, 0.80, 0.36), uSpin * 0.45);

    // 3. Gravitational deflection of light rays in curved spacetime (Continuous Einstein Lens)
    float bNorm = max(0.18, r);
    float alpha = (uLensingActive > 0.5) ? (4.2 / bNorm) * (1.0 + 1.25 / bNorm) : 0.0;
    vec3 deflNormal = normalize(bVec);
    vec3 bentRay = normalize(rayDir - deflNormal * sin(alpha));

    // 4. Lensed Accretion Disk (Interstellar Gargantua Double Arch: back rim bent over top and bottom)
    vec3 lensedDiskColor = vec3(0.0);
    float lensedDiskAlpha = 0.0;

    float deltaY = pClosest.y - uBlackHolePos.y;
    float bentDy = bentRay.y;

    if (abs(bentDy) > 0.004) {
      float tCross = -deltaY / bentDy;
      // Intersection behind the black hole plane
      if (tCross > 0.0 && uLensingActive > 0.5) {
        vec3 hitPos = pClosest + bentRay * tCross;
        float rHit = length(hitPos.xz - uBlackHolePos.xz) / max(0.01, uScale);
        float rIn = 1.68;
        float rOut = 11.8;

        if (rHit >= rIn && rHit <= rOut) {
          float phi = atan(hitPos.z - uBlackHolePos.z, hitPos.x - uBlackHolePos.x);
          float omega = 3.6 / (pow(rHit, 1.42) + 0.12 * uSpin);
          float spiralPhase = phi + uTime * omega * 2.2;
          float diskTurb = snoise(vec2(rHit * 1.8, spiralPhase * 2.4 + uTime * 0.35)) * 0.5 + 0.5;
          float diskRings = sin(rHit * 9.5 - uTime * 3.2 + diskTurb * 2.6) * 0.5 + 0.5;
          float diskFilaments = mix(diskTurb, diskRings, 0.38);

          // Doppler beaming on lensed arch
          vec3 tanVel = normalize(vec3(-(hitPos.z - uBlackHolePos.z), 0.0, hitPos.x - uBlackHolePos.x));
          float approach = dot(tanVel, -rayDir);
          float beta = clamp(0.70 / sqrt(max(1.0, rHit - 0.7)), 0.05, 0.76);
          float gamma = inversesqrt(max(0.1, 1.0 - beta * beta));
          float dopplerFactor = 1.0 / (gamma * (1.0 - beta * approach * uDopplerStrength));
          float dopplerBoost = mix(1.0, pow(clamp(dopplerFactor, 0.35, 2.7), 2.2), clamp(uDopplerStrength, 0.0, 1.0));

          float normR = clamp((rHit - rIn) / (rOut - rIn), 0.0, 1.0);
          float flux = pow(1.0 - normR, 1.42) * smoothstep(rIn, rIn + 0.28, rHit) * (1.0 - smoothstep(rOut - 2.0, rOut, rHit));
          flux *= (0.65 + 0.8 * diskFilaments) * dopplerBoost * (0.7 + 0.5 * uAccretionRate);

          // Pulse shock front ripples across gravitationally lensed arches
          if (uPulseStrength > 0.001) {
            float primaryDist = abs(rHit - uPulseRadius);
            float primaryCrest = exp(-pow(primaryDist / 0.55, 2.0));
            float echoDist = abs(rHit - (uPulseRadius * 0.72));
            float echoCrest = exp(-pow(echoDist / 0.75, 2.0)) * 0.65;
            flux += (primaryCrest + echoCrest) * uPulseStrength * 2.8;
          }

          vec3 baseLut = texture2D(uSpectrumLut, vec2(clamp(flux * 0.65, 0.02, 0.98), 0.5)).rgb;
          if (uSpectralMode == 1) { // EHT 230 GHz
            baseLut = mix(vec3(0.14, 0.02, 0.01), vec3(1.0, 0.95, 0.65), clamp(flux * 0.85, 0.0, 1.0));
          } else if (uSpectralMode == 2) { // Chandra X-ray
            baseLut = mix(vec3(0.04, 0.12, 0.35), vec3(0.92, 0.98, 1.0), clamp(flux * 0.85, 0.0, 1.0));
          } else if (uSpectralMode == 3) { // Doppler shift map
            baseLut = mix(vec3(0.95, 0.38, 0.1), vec3(0.2, 0.85, 1.0), clamp(approach * 0.5 + 0.5, 0.0, 1.0)) * flux;
          }

          vec3 rawDiskColor = baseLut * 1.5;

          // Exposure & Tone Mapping: ACES film tone mapping preserves dynamic range on Doppler boosted side
          lensedDiskColor = acesFilm(rawDiskColor * 1.15);
          lensedDiskAlpha = clamp(flux * (0.65 + 0.35 * diskFilaments) * min(1.6, dopplerBoost), 0.0, 0.98);
        }
      }
    }

    // 5. Gravitational Deflection of the Celestial Sky Dome
    float skyPhi = atan(bentRay.z, bentRay.x);
    float skyTheta = acos(clamp(bentRay.y, -1.0, 1.0));
    vec2 skyUv = vec2((skyPhi + 3.14159) / 6.28318, skyTheta / 3.14159);
    vec3 bgSky = texture2D(uSkyTexture, skyUv).rgb;

    // Continuous Einstein Ring Glow around the horizon
    float distFromShadow = max(0.001, r - r_horizon);
    float einsteinGlow = (uIsStar > 0.5 || uLensingActive < 0.5) ? 0.0 : clamp((rs * 0.30) / (distFromShadow + 0.06), 0.0, 0.8) * 0.22;
    bgSky += vec3(0.2, 0.35, 0.55) * einsteinGlow;

    // ACES tone mapping to photon ring emission
    vec3 mappedPhotonColor = acesFilm(photonColor * (photonRing * 3.8));

    // Composite: Sky + Lensed Arches + Continuous Einstein Ring
    vec3 col = bgSky;
    col = mix(col, lensedDiskColor, lensedDiskAlpha);
    col += mappedPhotonColor;

    float outAlpha = max(lensedDiskAlpha, photonRing * 0.94) * quadFade;
    gl_FragColor = vec4(col, outAlpha);
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
  private starfieldCount = 2200;

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

    // 2. Scene & Deep Space Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060b);
    this.scene.fog = new THREE.FogExp2(0x04060b, 0.0055);

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
      },
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    // 2. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Ring Geometry)
    const diskPlaneGeo = new THREE.RingGeometry(1.68, 12.2, 144, 48);
    const mainDiskMesh = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    mainDiskMesh.rotation.x = -Math.PI / 2;
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
    this.gravitationalLensMesh.renderOrder = 2;
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
    const starGeo = new THREE.OctahedronGeometry(0.18, 1);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.starfieldInstanced = new THREE.InstancedMesh(starGeo, starMat, starCount);

    const spectralPalette = [
      0x9bb0ff, // O-type deep blue
      0xaabfff, // B-type blue-white
      0xcad7ff, // A-type white
      0xf8f7ff, // F-type pale yellow
      0xfff4ea, // G-type solar
      0xffd2a1, // K-type orange
      0xffcc6f, // M-type red
    ];

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const radius = 65 + Math.random() * 135;

      const restPos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      this.starRestPositions.push(restPos);

      const scaleVal = 0.45 + Math.random() * 1.35;
      const scaleVec = new THREE.Vector3(scaleVal, scaleVal, scaleVal);
      this.starfieldScales.push(scaleVec);

      _mat4.compose(restPos, _quat.identity(), scaleVec);
      this.starfieldInstanced.setMatrixAt(i, _mat4);

      const hex = spectralPalette[i % spectralPalette.length];
      const col = new THREE.Color(hex);
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
   * Applies General Relativistic Gravitational Lensing Deflection:
   * Light passing near the central mass is deflected by Einstein's angle α ≈ 4GM/(c² b) = 2 Rs / b.
   * Background stars behind the object warp radially outward away from the event horizon shadow.
   */
  private updateGravitationalLensingOfStarfield() {
    const camPos = this.camera.position;
    const rs = 1.75 * this.currentScale;
    const einsteinRadiusSq = Math.max(0.2, rs * rs * 2.8);

    // Camera view direction
    _vec3B.subVectors(this.controls.target, camPos).normalize();

    for (let i = 0; i < this.starfieldCount; i += 2) {
      const restPos = this.starRestPositions[i];
      // Vector from camera to star
      _vec3A.subVectors(restPos, camPos);
      const starDist = _vec3A.length();
      if (starDist < 1.0) continue;

      const starDir = _vec3A.normalize();
      // Dot product: cos angle between star ray and black hole line of sight
      const cosAngle = starDir.dot(_vec3B);

      // Only stars behind or near the central object (cosAngle > 0.4) experience visible lensing deflection
      if (cosAngle > 0.5) {
        // Distance of closest approach (impact parameter in scene units)
        const sinAngle = Math.sqrt(Math.max(0.001, 1.0 - cosAngle * cosAngle));
        const impactB = Math.max(rs * 0.9, starDist * sinAngle);

        // Einstein deflection displacement
        const deflectionFactor = Math.min(6.5, einsteinRadiusSq / (impactB + 0.4));

        // Transverse outward unit vector from black hole center to star in view plane
        _vec3C.crossVectors(_vec3B, starDir).crossVectors(_vec3C, _vec3B).normalize();

        const deflectedPos = _vec3A.copy(restPos).addScaledVector(_vec3C, deflectionFactor * 2.2);
        _mat4.compose(deflectedPos, _quat.identity(), this.starfieldScales[i]);
      } else {
        _mat4.compose(restPos, _quat.identity(), this.starfieldScales[i]);
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

    this.params = nextParams;

    // Scale black hole: For TON 618 or true cosmic scale mode, expand majestically up to 3.8x scale
    const cosmicScaleBoost = nextParams.trueCosmicScale ? 1.6 : 1.0;
    this.targetScale = (1.35 + (nextParams.massSolar / 100) * 1.65) * cosmicScaleBoost;
    this.targetExploded = nextParams.explodedSeparation;

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

    const isStar = nextParams.objectCategory === 'star';

    if (this.accretionDiskMat) {
      // Pre-calculated Doppler shift coefficients: (dopplerStrength, betaScale, gammaClamp, dopplerExponent)
      const dopplerStrength = nextParams.dopplerStrength;
      const betaScale = 0.70;
      const gammaClamp = 1.0;
      const dopplerExponent = 2.2;
      this.accretionDiskMat.uniforms.uDopplerCoeffs.value.set(
        dopplerStrength,
        betaScale,
        gammaClamp,
        dopplerExponent
      );

      // Compact disk parameter vector: (spin, accretionRate, spectralMode, isStar)
      this.accretionDiskMat.uniforms.uDiskParams.value.set(
        nextParams.spin,
        nextParams.accretionRate,
        modeIndex,
        isStar ? 1.0 : 0.0
      );
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

    const incRad = THREE.MathUtils.degToRad(this.params.inclinationDeg);

    switch (preset) {
      case 'equatorial':
        this.targetCamPos.set(0, Math.cos(incRad) * 26.5, Math.sin(incRad) * 26.5);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'polar':
        this.targetCamPos.set(0, 32.0, 1.5);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'grazing':
        this.targetCamPos.set(-9.5, 2.2, 16.5);
        this.targetCamLook.set(1.5, 0.2, 0);
        break;
      case 'well':
        // Deep angle framing the plunging gravitational well funnel
        this.targetCamPos.set(24.0, -14.0, 28.0);
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
      // Rapid rotation of neutron star crust and sweeping pulsar lighthouse beams (~1.3 second period)
      this.pulsarRotationAngle += simDelta * (4.5 + this.params.spin * 8.0);
      this.pulsarBeamsGroup.rotation.y = this.pulsarRotationAngle;
      this.magneticDipoleGroup.rotation.y = this.pulsarRotationAngle;
      this.neutronStarMesh.rotation.y = this.pulsarRotationAngle * 0.8;
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
        (this.tertiaryPulseMesh.material as THREE.ShaderMaterial).uniforms.uOpacity.value = this.pulseStrength * 0.40;

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
    this.updateSkyDomeTexture(this.params.backgroundTheme || 'galactic_core');
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
    const theme = BACKGROUND_THEMES[themeId] || BACKGROUND_THEMES.galactic_core;
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

    // Authentic labels directly from the user-provided PMF IAS infographic (Black-Holes_7bd54699.webp)
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
        id: 'sagittarius_a',
        name: 'Sagittarius A*',
        badge: 'Our Galactic Center',
        badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
        headline: 'Supermassive black hole at our galaxy\'s center',
        description: 'Contains 4.3 million solar masses packed into a region smaller than Mercury\'s orbit, anchoring the central parsec of the Milky Way.',
        pos: new THREE.Vector3(0, 2.15 * scale, 0),
        dockPosition: 'top-left',
      },
      {
        id: 'einstein_1916',
        name: 'Einstein Prediction (1916)',
        badge: 'General Relativity',
        badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
        headline: 'Einstein predicted black holes in 1916 via general relativity',
        description: 'Curved spacetime bends light rays from the rear accretion disk upward and over the event horizon shadow into the iconic upper halo arc.',
        pos: new THREE.Vector3(1.75 * scale, 2.75 * scale, -0.1),
        dockPosition: 'top-right',
      },
      {
        id: 'eht_2019',
        name: 'Event Horizon Telescope (EHT)',
        badge: 'First Image (2019)',
        badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        headline: 'EHT collaboration released the first image of a black hole (2019)',
        description: 'Synchronized radio dishes across planet Earth resolved the bright photon ring and shadow of supermassive black hole M87* and Sagittarius A*.',
        pos: new THREE.Vector3(1.85 * scale, 0.85 * scale, 0.05),
        dockPosition: 'mid-right',
      },
      {
        id: 'the_unicorn',
        name: 'The Unicorn',
        badge: 'Closest Black Hole to Earth',
        badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
        headline: 'One of the closest known black holes to Earth (~1,500 ly)',
        description: 'Located in the constellation Monoceros, this tiny stellar-mass black hole (~3 Suns) orbits a red giant companion.',
        pos: new THREE.Vector3(4.8 * scale, 0.0, 0),
        dockPosition: 'mid-right',
      },
      {
        id: 'hawking_evaporation',
        name: 'Hawking Evaporation',
        badge: 'Quantum Radiation',
        badgeColor: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
        headline: 'Do not die, but are theoretically predicted to slowly evaporate',
        description: 'Hawking predicted black holes emit quantum radiation and slowly shrink over unfathomable cosmic timescales (~10⁶⁷ to 10¹⁰⁰ years).',
        pos: new THREE.Vector3(2.05 * scale, -1.85 * scale, 0),
        dockPosition: 'bottom-right',
      },
      {
        id: 'ligo_waves',
        name: 'LIGO Gravitational Waves',
        badge: 'Spacetime Ripples (2015)',
        badgeColor: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
        headline: 'In 2015, LIGO detected gravitational waves from merging stellar black holes',
        description: 'Laser interferometers measured spacetime distortion 1/10,000th the width of a proton when two black holes collided 1.3 billion light-years away.',
        pos: new THREE.Vector3(3.6 * scale, -2.75 * scale, 0.8),
        dockPosition: 'bottom-right',
      },
      {
        id: 'cygnus_x1',
        name: 'Cygnus X-1',
        badge: 'First Discovered Black Hole',
        badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
        headline: 'First discovered black hole in the Milky Way (1964/1971)',
        description: 'An X-ray source in Cygnus consisting of a 21-solar-mass black hole feeding on high-velocity gas from a blue supergiant companion star.',
        pos: new THREE.Vector3(0, -2.25 * scale, 0),
        dockPosition: 'bottom-left',
      },
      {
        id: 'three_layers',
        name: 'Three Layers',
        badge: 'Horizon & Singularity',
        badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
        headline: 'Outer and inner event horizon and the central singularity',
        description: 'Event Horizon: Boundary beyond which light cannot escape. Singularity: Infinitely dense zero-volume point where all mass is concentrated.',
        pos: new THREE.Vector3(-1.35 * scale, -1.65 * scale, 0.1),
        dockPosition: 'bottom-left',
      },
      {
        id: 'matter_attraction',
        name: 'Matter Attraction',
        badge: 'Relativistic Accretion',
        badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
        headline: 'Grow by attracting nearby matter through their immense gravity',
        description: 'Interstellar gas and torn companion stars spiral down into an accretion disk, converting gravitational potential energy into brilliant radiation.',
        pos: new THREE.Vector3(-3.8 * scale, -0.25 * scale, 0.2),
        dockPosition: 'mid-left',
      },
      {
        id: 'alpha_centauri',
        name: 'Alpha Centauri',
        badge: 'Nearest Star Reference',
        badgeColor: 'text-slate-300 border-slate-600/40 bg-slate-900/60',
        headline: 'Nearest star system; Proxima Centauri is closest to Earth (4.24 ly)',
        description: 'Our closest stellar neighbor is over 40 trillion km away. Black holes are safely isolated at vast interstellar and intergalactic distances.',
        pos: new THREE.Vector3(-5.2 * scale, 0.3 * scale, 0),
        dockPosition: 'mid-left',
      },
      {
        id: 'not_wormholes',
        name: 'Not Wormholes',
        badge: 'Physical Reality',
        badgeColor: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
        headline: 'Black holes are NOT wormholes (tunnels connecting two points)',
        description: 'Unlike speculative sci-fi wormholes connecting two portals in space and time, black holes crush all infalling matter into a singular dense core.',
        pos: new THREE.Vector3(-2.3 * scale, 1.95 * scale, 0),
        dockPosition: 'top-left',
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
