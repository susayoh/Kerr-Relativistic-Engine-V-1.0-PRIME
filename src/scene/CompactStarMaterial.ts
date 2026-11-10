import * as THREE from 'three';

/**
 * Configuration options for the physically grounded Compact Star (Neutron Star / Pulsar) shader.
 */
export interface CompactStarMaterialOptions {
  /** Base thermal blackbody color of the iron crust surface (default: #0ea5e9) */
  baseColor?: THREE.ColorRepresentation;
  /** Peak emission intensity of the magnetic polar hotspots (>50,000 K look) */
  hotspotIntensity?: number;
  /** Physical coordinate radius of the compact star in scene units (e.g., R_star ≈ 1.65) */
  radius?: number;
  /** Schwarzschild radius R_s = 2GM/c^2 in scene units (typically R_s / R_star ≈ 0.35 - 0.48) */
  schwarzschildRadius?: number;
  /** Initial normalized magnetic dipole axis in world/local space */
  magneticAxis?: THREE.Vector3;
}

/**
 * Strongly-typed uniform interface for the Compact Star ShaderMaterial.
 */
export interface CompactStarUniforms {
  [uniform: string]: THREE.IUniform<any>;
  uTime: THREE.IUniform<number>;
  uMagneticAxis: THREE.IUniform<THREE.Vector3>;
  uBaseColor: THREE.IUniform<THREE.Color>;
  uHotspotIntensity: THREE.IUniform<number>;
  uRadius: THREE.IUniform<number>;
  uSchwarzschildRadius: THREE.IUniform<number>;
}

/**
 * Configuration options for the Relativistic Pulsar Beam System.
 */
export interface PulsarBeamSystemOptions {
  /** Physical radius of the host compact star (R_star) where the polar caps sit (default: 1.65) */
  starRadius?: number;
  /** Length of each relativistic synchrotron beam cone (default: 18.0) */
  beamLength?: number;
  /** Narrow apex radius at the magnetic polar cap (default: 0.32) */
  baseRadius?: number;
  /** Outer expanded radius at the far end of the beam (default: 2.4) */
  tipRadius?: number;
  /** Core relativistic emission color (default: blinding white-blue #f0f9ff) */
  coreColor?: THREE.ColorRepresentation;
  /** Outer synchrotron sheath color (default: cyan-violet #38bdf8) */
  sheathColor?: THREE.ColorRepresentation;
  /** Overall beam radiance multiplier (default: 1.85) */
  beamIntensity?: number;
  /** Initial normalized magnetic dipole axis */
  magneticAxis?: THREE.Vector3;
}

/**
 * Strongly-typed uniform interface for the Pulsar Beam ShaderMaterial.
 */
export interface PulsarBeamUniforms {
  [uniform: string]: THREE.IUniform<any>;
  uTime: THREE.IUniform<number>;
  uMagneticAxis: THREE.IUniform<THREE.Vector3>;
  uStarRadius: THREE.IUniform<number>;
  uBeamLength: THREE.IUniform<number>;
  uCoreColor: THREE.IUniform<THREE.Color>;
  uSheathColor: THREE.IUniform<THREE.Color>;
  uBeamIntensity: THREE.IUniform<number>;
}

/**
 * Return object from `createPulsarBeamSystem()`.
 */
export interface PulsarBeamSystem {
  /** Parent group containing both North (+uMagneticAxis) and South (-uMagneticAxis) beam meshes */
  group: THREE.Group;
  /** North magnetic pole relativistic jet mesh */
  northBeamMesh: THREE.Mesh;
  /** South magnetic pole relativistic jet mesh */
  southBeamMesh: THREE.Mesh;
  /** Shared volumetric core-sheath additive ShaderMaterial */
  material: THREE.ShaderMaterial;
  /** Uniform bindings for real-time synchronization */
  uniforms: PulsarBeamUniforms;
  /** Updates beam positions, quaternion alignment, and uniforms to match the precessing magnetic axis */
  update: (elapsedTime: number, magneticAxis: THREE.Vector3, starRadius?: number, intensity?: number) => void;
  /** Disposes beam geometries and shader material */
  dispose: () => void;
}

// ============================================================================
// COMPACT STAR (NEUTRON STAR / PULSAR) SURFACE SHADERS
// ============================================================================

/**
 * GLSL Vertex Shader for the Compact Star surface:
 * - Passes local position (`vPosition`), world position (`vWorldPosition`),
 *   normalized world normal (`vNormal`), and camera view vector (`vViewVector`).
 * - Computes high-frequency crustal seismic & magnetohydrodynamic (MHD) ripple displacements.
 */
export const COMPACT_STAR_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMagneticAxis;
  uniform float uRadius;
  uniform float uSchwarzschildRadius;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewVector;
  varying float vSeismicDisplacement;

  // High-frequency 3D sinusoidal wave interference for non-radial crustal seismic oscillation modes
  float computeSeismicMode(vec3 dir, float t, vec3 magAxis) {
    float mode1 = sin(dir.x * 22.0 + t * 14.0) * cos(dir.y * 22.0 - t * 11.0) * sin(dir.z * 22.0 + t * 9.0);
    float mode2 = sin(dot(dir, vec3(14.5, -18.2, 16.7)) + t * 23.0);
    
    // Bilateral symmetry for magneto-elastic torsional standing waves at both poles
    float magAlign = abs(dot(dir, normalize(magAxis)));
    float torsionalWave = sin(acos(clamp(magAlign, 0.0, 1.0)) * 36.0 - t * 28.0) * magAlign;

    return (mode1 * 0.45 + mode2 * 0.30 + torsionalWave * 0.25);
  }

  void main() {
    vec3 localDir = normalize(position);
    vPosition = position;

    // Subtle high-frequency vertex ripple displacement driven by surface seismic/magnetic modes
    float seismicWave = computeSeismicMode(localDir, uTime, uMagneticAxis);
    vSeismicDisplacement = seismicWave;
    float displacementAmplitude = uRadius * 0.0085;
    vec3 displacedPosition = position + normal * (seismicWave * displacementAmplitude);

    vec4 worldPos4 = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPosition = worldPos4.xyz;

    // Transform normal to world space accurately (GLSL ES 1.00 compatible for uniform scale)
    vNormal = normalize(mat3(modelMatrix) * normal);

    // World-space view vector pointing from the surface fragment toward the camera
    vViewVector = cameraPosition - vWorldPosition;

    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`;

/**
 * GLSL Fragment Shader for the Compact Star surface:
 * - Fixes Bug #2 (Lower Hemisphere Bleed / Texture Discontinuity):
 *   1. Enforces perfect bilateral symmetry for magnetic hotspots via `abs(dot(normalize(vNormal), normalize(uMagneticAxis)))`.
 *   2. Offsets the position domain passed into the 3D simplex / fBM noise by `+ vec3(128.0)`
 *      (`vec3 noiseCoord = (vPosition + vec3(128.0)) * frequency;`) so negative coordinate space
 *      never triggers hash/gradient banding or bleached white saturation in the southern hemisphere.
 * - Implements Beloborodov (2002) relativistic gravitational self-lensing & coronal Fresnel limb glow.
 */
export const COMPACT_STAR_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMagneticAxis;
  uniform vec3 uBaseColor;
  uniform float uHotspotIntensity;
  uniform float uRadius;
  uniform float uSchwarzschildRadius;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewVector;
  varying float vSeismicDisplacement;

  // ============================================================================
  // 1. 3D SIMPLEX NOISE & OPTIMIZED FRACTIONAL BROWNIAN MOTION (fBM)
  // ============================================================================
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i);
    vec4 p = permute(
      permute(
        permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0)
      )
      + i.x + vec4(0.0, i1.x, i2.x, 1.0)
    );

    // Gradients: 7x7 points over a square, mapped onto an octahedron
    float n_ = 0.142857142857; // 1.0 / 7.0
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // Ultra-fast 3D trigonometric gyroid warp field (zero texture/hash cost, seamless in 3D)
  vec3 gyroidWarp3D(vec3 pos, float baseFreq) {
    vec3 p = (pos + vec3(128.0)) * baseFreq;
    float gx = dot(sin(p), cos(p.yzx));
    float gy = dot(sin(p * 1.62 + vec3(4.2, 1.7, 8.3)), cos(p.zxy * 1.62));
    float gz = dot(sin(p * 2.35 + vec3(9.1, 6.4, 3.8)), cos(p.yzx * 2.35));
    return clamp(vec3(gx, gy, gz) * 0.25 + 0.5, 0.0, 1.0);
  }

  // 3-Octave Fractional Brownian Motion (fBM) operating on positive-offset coordinates
  float fbm4(vec3 pos, float baseFreq) {
    // Offset position domain by a large positive vector (+128.0) before scaling by frequency
    // to prevent hash/gradient sampling failure or banding across negative coordinate space
    vec3 noiseCoord = (pos + vec3(128.0)) * baseFreq;

    float value = 0.0;
    float amplitude = 0.533;
    const mat3 rot = mat3(
       0.80,  0.60,  0.00,
      -0.60,  0.80,  0.00,
       0.00,  0.00,  1.00
    );

    for (int i = 0; i < 3; i++) {
      value += amplitude * snoise(noiseCoord);
      noiseCoord = rot * noiseCoord * 2.05 + vec3(17.3, 31.7, 23.9);
      amplitude *= 0.5;
    }
    return clamp(value * 0.5 + 0.5, 0.0, 1.0);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewVector);
    vec3 B_axis = normalize(uMagneticAxis);

    // ============================================================================
    // 2. RELATIVISTIC SELF-LENSING & GRAVITATIONAL LIMB BENDING
    // ============================================================================
    // Beloborodov (2002) gravitational light-bending approximation:
    //   1 - cos(alpha) = (1 - cos(psi)) * (1 - R_s / R)
    float compactness = clamp(uSchwarzschildRadius / max(uRadius, 0.001), 0.0, 0.68);
    float grFactor = 1.0 / max(0.32, 1.0 - compactness);

    float rawMu = dot(N, V);
    float mu = clamp(rawMu, 0.0, 1.0);

    vec3 tangentPart = N - V * rawMu;
    float tangentLen = length(tangentPart);
    vec3 tangentAwayFromView = tangentLen > 1e-4 ? (tangentPart / tangentLen) : N;
    float deflectionAngle = compactness * pow(max(0.0001, 1.0 - mu), 0.85) * 1.35;
    vec3 N_lensed = normalize(N * cos(deflectionAngle) + tangentAwayFromView * sin(deflectionAngle));

    // ============================================================================
    // 3. BILATERALLY SYMMETRIC MAGNETIC POLAR HOTSPOTS
    // ============================================================================
    // Enforce exact bilateral symmetry for both North (+uMagneticAxis) and South (-uMagneticAxis)
    // magnetic polar caps by wrapping the dot product in abs():
    float polarAlignment = abs(dot(normalize(vNormal), normalize(uMagneticAxis)));
    float lensedPolarAlignment = abs(dot(N_lensed, B_axis));
    float effectivePoleAlign = max(polarAlignment, lensedPolarAlignment * 0.96);

    // ============================================================================
    // 4. POSITIVE-DOMAIN fBM SURFACE GRANULATION & PLASMA SHEAR
    // ============================================================================
    // Symmetric zonal shear flow driven by bilateral polar alignment (no negative latitude discontinuity)
    vec3 flowOffset = vec3(
      uTime * 0.32,
      uTime * 0.24 + polarAlignment * 0.85,
      uTime * 0.28
    );

    // Sample 3D fBM using (vPosition + vec3(128.0)) * frequency so North & South hemispheres
    // share identical, richly detailed plasma granulation without bleaching or horizontal banding
    vec3 samplePos = vPosition + flowOffset;
    vec3 warpVec = gyroidWarp3D(samplePos, 2.2);

    float granulation = fbm4(samplePos + (warpVec - 0.5) * 1.15, 3.2);
    float fineShear = snoise((samplePos - flowOffset * 1.6 + warpVec * 0.85 + vec3(128.0)) * 7.2) * 0.5 + 0.5;

    float surfacePattern = clamp(granulation * 0.68 + fineShear * 0.32 + vSeismicDisplacement * 0.08, 0.0, 1.0);

    // Base thermal emission driven by uBaseColor (supports cyan/blue pulsars, violet quark stars, gold dwarfs, and crimson supergiants)
    vec3 coolCrust = max(uBaseColor * 0.55, vec3(0.03));
    vec3 warmCrust = uBaseColor * 1.38 + mix(uBaseColor * 0.25, vec3(0.10, 0.28, 0.46), 0.35);
    vec3 hotFilament = mix(uBaseColor, vec3(0.95, 0.97, 1.0), 0.68) * 1.85;

    vec3 crustColor = mix(coolCrust, warmCrust, smoothstep(0.18, 0.76, surfacePattern));
    crustColor = mix(crustColor, hotFilament, smoothstep(0.68, 0.96, surfacePattern));

    // ============================================================================
    // 5. DUAL OPPOSING MAGNETIC POLAR HOTSPOT EMISSION (>50,000 K)
    // ============================================================================
    float outerPolarHalo = smoothstep(0.64, 0.94, effectivePoleAlign);
    float innerPolarCore = smoothstep(0.85, 0.992, effectivePoleAlign);

    float polarTurbulence = 0.84 + 0.32 * (snoise((vPosition + vec3(uTime * 1.2 + 128.0)) * 5.6) * 0.5 + 0.5);

    vec3 polarHaloColor = mix(uBaseColor, vec3(0.38, 0.78, 1.0), 0.48) * 2.2;
    vec3 polarCoreColor = mix(uBaseColor, vec3(0.94, 0.98, 1.0), 0.82) * 4.2;

    vec3 hotspotEmission = (
      polarHaloColor * outerPolarHalo +
      polarCoreColor * innerPolarCore
    ) * uHotspotIntensity * polarTurbulence;

    // ============================================================================
    // 6. ATMOSPHERIC CORONAL FRESNEL GLOW & LIMB BRIGHTENING
    // ============================================================================
    float effectiveMu = clamp(pow(max(mu, 0.001), 1.0 / grFactor), 0.0001, 1.0);
    float limbDarkening = mix(0.74, 1.12, pow(effectiveMu, 0.42));

    float grazing = clamp(1.0 - mu, 0.0001, 1.0);
    float fresnel = pow(grazing, 2.35);
    float rimFlare = pow(grazing, 4.8);

    float coronaStreamers = 0.80 + 0.40 * fineShear;
    vec3 coronaBaseColor = mix(uBaseColor, vec3(0.50, 0.90, 1.0), 0.38);
    vec3 coronaHotColor = mix(uBaseColor, vec3(0.92, 0.97, 1.0), 0.78);

    vec3 coronalGlow = (
      coronaBaseColor * fresnel * (1.35 + compactness * 1.65) * coronaStreamers +
      coronaHotColor * rimFlare * (2.1 + outerPolarHalo * 2.4)
    );

    vec3 finalColor = (crustColor * limbDarkening) + hotspotEmission + coronalGlow;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ============================================================================
// RELATIVISTIC PULSAR BEAM SHADERS (VOLUMETRIC CORE-SHEATH ADDITIVE MODEL)
// ============================================================================

export const PULSAR_BEAM_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uBeamLength;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vAxialFraction;

  void main() {
    vUv = uv;
    vAxialFraction = clamp(uv.y, 0.0, 1.0);

    // Subtle magnetohydrodynamic helical pinch oscillation along the relativistic jet
    // Scaled by uv.y so the base contact ring (uv.y == 0.0) stays locked to the polar cap
    float helicalWave = sin(uv.y * 18.0 - uTime * 16.0 + uv.x * 6.2831853) * 0.025 * uv.y;
    vec3 displacedPos = position + normal * helicalWave;

    vec4 worldPos = modelMatrix * vec4(displacedPos, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const PULSAR_BEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMagneticAxis;
  uniform float uStarRadius;
  uniform float uBeamLength;
  uniform vec3 uCoreColor;
  uniform vec3 uSheathColor;
  uniform float uBeamIntensity;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vAxialFraction;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDir);

    // ============================================================================
    // 1. TRANSVERSE GAUSSIAN RADIAL FALLOFF (CORE-SHEATH VOLUMETRIC PROFILE)
    // ============================================================================
    float viewCos = abs(dot(N, V));
    float rTransverse = sqrt(clamp(1.0 - viewCos * viewCos, 0.0, 1.0));

    float sigmaCore = 0.26;
    float gaussianCore = exp(-(rTransverse * rTransverse) / (2.0 * sigmaCore * sigmaCore));

    float sigmaSheath = 0.52;
    float gaussianSheath = exp(-(rTransverse * rTransverse) / (2.0 * sigmaSheath * sigmaSheath));

    float edgeFade = 1.0 - smoothstep(0.35, 1.0, rTransverse);
    gaussianCore *= edgeFade;
    gaussianSheath *= edgeFade;

    // ============================================================================
    // 2. LONGITUDINAL ATTENUATION & CONTACT FOOT FADE (smoothstep(0.0, 0.05, vUv.y))
    // ============================================================================
    float y = clamp(vUv.y, 0.0, 1.0);

    // Smooth alpha fade right at the contact foot (vUv.y in [0.0, 0.05])
    // so the beam erupts seamlessly out of the polar cap without a gap or hard intersection ring
    float baseContactFade = smoothstep(0.0, 0.05, y);

    // Relativistic inverse-square + exponential synchrotron cooling along the jet length
    float distalDecay = exp(-y * 2.15) * (1.0 - smoothstep(0.18, 1.0, y));

    float longitudinalProfile = baseContactFade * distalDecay;

    // ============================================================================
    // 3. HIGH-SPEED RELATIVISTIC PLASMA MODULATION (OUTWARD STREAMING WAVES)
    // ============================================================================
    float theta = vUv.x * 6.2831853;
    float fastWave1 = sin(y * 28.0 - uTime * 22.0 + cos(theta * 2.0) * 0.6) * 0.5 + 0.5;
    float fastWave2 = sin(y * 54.0 - uTime * 38.0 - sin(theta * 3.0) * 0.8) * 0.5 + 0.5;

    vec2 streamCoord = vec2(vUv.x * 6.0, y * 10.0 - uTime * 6.5);
    float plasmaTurbulence = valueNoise2D(streamCoord) * 0.65 + valueNoise2D(streamCoord * 2.3 - vec2(0.0, uTime * 4.0)) * 0.35;

    float streamModulation = 0.72 + 0.28 * (fastWave1 * 0.5 + fastWave2 * 0.3 + plasmaTurbulence * 0.2);

    // ============================================================================
    // 4. VOLUMETRIC CORE-SHEATH COLOR COMPOSITING (ADDITIVE BLENDING)
    // ============================================================================
    vec3 VioletFringe = vec3(0.48, 0.32, 0.98);
    vec3 outerSheathRgb = mix(VioletFringe, uSheathColor, smoothstep(0.15, 0.65, gaussianSheath));
    vec3 coreRgb = uCoreColor * 2.6;

    float launchZoneBoost = 1.0 + 1.25 * exp(-y * 9.0) * gaussianCore;

    vec3 beamRgb = (
      outerSheathRgb * gaussianSheath * 0.95 +
      coreRgb * pow(max(0.0001, gaussianCore), 1.35) * 1.65
    ) * longitudinalProfile * streamModulation * launchZoneBoost * uBeamIntensity;

    float alpha = clamp((gaussianSheath * 0.75 + gaussianCore * 0.85) * longitudinalProfile, 0.0, 1.0);

    gl_FragColor = vec4(beamRgb * alpha, alpha);
  }
`;

// ============================================================================
// THREE.JS FACTORY FUNCTIONS & SYNCHRONIZED PRECESSION CONTROLLER
// ============================================================================

/**
 * Creates a configured THREE.ShaderMaterial for a physically grounded Compact Star (Neutron Star / Pulsar).
 */
export function createCompactStarMaterial(
  options: CompactStarMaterialOptions = {}
): THREE.ShaderMaterial {
  const {
    baseColor = 0x0ea5e9,
    hotspotIntensity = 1.65,
    radius = 1.65,
    schwarzschildRadius = 0.68,
    magneticAxis = new THREE.Vector3(Math.sin(0.42), Math.cos(0.42), 0.0).normalize(),
  } = options;

  const uniforms: CompactStarUniforms = {
    uTime: { value: 0.0 },
    uMagneticAxis: { value: magneticAxis.clone().normalize() },
    uBaseColor: { value: new THREE.Color(baseColor) },
    uHotspotIntensity: { value: hotspotIntensity },
    uRadius: { value: radius },
    uSchwarzschildRadius: { value: schwarzschildRadius },
  };

  return new THREE.ShaderMaterial({
    name: 'CompactStarShaderMaterial',
    vertexShader: COMPACT_STAR_VERTEX_SHADER,
    fragmentShader: COMPACT_STAR_FRAGMENT_SHADER,
    uniforms,
    transparent: false,
    depthWrite: true,
    depthTest: true,
  });
}

// Reusable vectors for zero-GC real-time alignment
const _upAxis = new THREE.Vector3(0, 1, 0);
const _northDir = new THREE.Vector3();
const _southDir = new THREE.Vector3();

/**
 * Creates the complete Relativistic Pulsar Beam System:
 * - Fixes Bug #3 (Detached / Floating Pulsar Beam Origins):
 *   1. Translates the CylinderGeometry buffer by `+height / 2.0` (`beamGeometry.translate(0, beamLength / 2.0, 0)`)
 *      so its local origin `(0, 0, 0)` sits at the exact bottom base (`vUv.y = 0`).
 *   2. Anchors the North beam directly at `+uMagneticAxis.clone().multiplyScalar(starRadius)`
 *      and the South beam at `-uMagneticAxis.clone().multiplyScalar(starRadius)`.
 *   3. Aligns each beam's local up vector `(0, 1, 0)` with `±uMagneticAxis` via `quaternion.setFromUnitVectors()`.
 */
export function createPulsarBeamSystem(
  options: PulsarBeamSystemOptions = {}
): PulsarBeamSystem {
  const {
    starRadius = 1.65,
    beamLength = 18.0,
    baseRadius = 0.34,
    tipRadius = 2.4,
    coreColor = 0xf0f9ff,
    sheathColor = 0x38bdf8,
    beamIntensity = 1.85,
    magneticAxis = new THREE.Vector3(Math.sin(0.42), Math.cos(0.42), 0.0).normalize(),
  } = options;

  const uniforms: PulsarBeamUniforms = {
    uTime: { value: 0.0 },
    uMagneticAxis: { value: magneticAxis.clone().normalize() },
    uStarRadius: { value: starRadius },
    uBeamLength: { value: beamLength },
    uCoreColor: { value: new THREE.Color(coreColor) },
    uSheathColor: { value: new THREE.Color(sheathColor) },
    uBeamIntensity: { value: beamIntensity },
  };

  const material = new THREE.ShaderMaterial({
    name: 'PulsarBeamShaderMaterial',
    vertexShader: PULSAR_BEAM_VERTEX_SHADER,
    fragmentShader: PULSAR_BEAM_FRAGMENT_SHADER,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Translate CylinderGeometry along +Y by height / 2.0 so local origin (0, 0, 0) is at the bottom base (vUv.y = 0)
  const beamGeometry = new THREE.CylinderGeometry(tipRadius, baseRadius, beamLength, 64, 16, true);
  beamGeometry.translate(0, beamLength / 2.0, 0);

  const group = new THREE.Group();
  const northBeamMesh = new THREE.Mesh(beamGeometry, material);
  const southBeamMesh = new THREE.Mesh(beamGeometry, material);

  northBeamMesh.renderOrder = 25;
  southBeamMesh.renderOrder = 25;

  group.add(northBeamMesh, southBeamMesh);

  const alignBeamsToAxis = (axis: THREE.Vector3, rStar: number) => {
    _northDir.copy(axis).normalize();
    _southDir.copy(_northDir).negate();

    // Anchor North beam base directly on the North magnetic polar cap (+uMagneticAxis * starRadius)
    northBeamMesh.position.copy(_northDir).multiplyScalar(rStar);
    northBeamMesh.quaternion.setFromUnitVectors(_upAxis, _northDir);

    // Anchor South beam base directly on the South magnetic polar cap (-uMagneticAxis * starRadius)
    southBeamMesh.position.copy(_southDir).multiplyScalar(rStar);
    southBeamMesh.quaternion.setFromUnitVectors(_upAxis, _southDir);
  };

  alignBeamsToAxis(uniforms.uMagneticAxis.value, starRadius);

  const update = (
    elapsedTime: number,
    nextMagneticAxis: THREE.Vector3,
    nextStarRadius?: number,
    nextIntensity?: number
  ) => {
    uniforms.uTime.value = elapsedTime;
    uniforms.uMagneticAxis.value.copy(nextMagneticAxis).normalize();
    if (typeof nextStarRadius === 'number') {
      uniforms.uStarRadius.value = nextStarRadius;
    }
    if (typeof nextIntensity === 'number') {
      uniforms.uBeamIntensity.value = nextIntensity;
    }
    alignBeamsToAxis(uniforms.uMagneticAxis.value, uniforms.uStarRadius.value);
  };

  const dispose = () => {
    beamGeometry.dispose();
    material.dispose();
  };

  return {
    group,
    northBeamMesh,
    southBeamMesh,
    material,
    uniforms,
    update,
    dispose,
  };
}

/**
 * Updates the Compact Star material and synchronizes the PulsarBeamSystem in the animation loop.
 */
export function updateCompactStarPrecession(
  material: THREE.ShaderMaterial,
  elapsedTime: number,
  spinRate = 6.0,
  obliquityRad = THREE.MathUtils.degToRad(24),
  precessionRate = 0.45,
  beamSystem?: PulsarBeamSystem,
  outMagneticAxis?: THREE.Vector3
): THREE.Vector3 {
  const uniforms = material.uniforms as CompactStarUniforms;
  uniforms.uTime.value = elapsedTime;

  const spinPhase = elapsedTime * spinRate;
  const nutationWobble = Math.sin(elapsedTime * precessionRate) * THREE.MathUtils.degToRad(4.5);
  const effectiveObliquity = obliquityRad + nutationWobble;

  const sinAlpha = Math.sin(effectiveObliquity);
  const cosAlpha = Math.cos(effectiveObliquity);

  const magAxis = uniforms.uMagneticAxis.value as THREE.Vector3;
  magAxis.set(
    sinAlpha * Math.cos(spinPhase),
    cosAlpha,
    sinAlpha * Math.sin(spinPhase)
  ).normalize();

  if (beamSystem) {
    const rStar = uniforms.uRadius.value as number;
    beamSystem.update(elapsedTime, magAxis, rStar);
  }

  if (outMagneticAxis) {
    outMagneticAxis.copy(magAxis);
  }
  return magAxis;
}
