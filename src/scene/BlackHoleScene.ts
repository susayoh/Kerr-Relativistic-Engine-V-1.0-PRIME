import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BlackHoleParams,
  GeodesicTrajectory,
  computeNullGeodesic,
  computeRelativisticMetrics,
} from '../physics/gravitationalPhysics';

// Module-scope reusable math objects for zero GC in render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
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

export type CameraPresetId = 'equatorial' | 'polar' | 'grazing' | 'probe' | 'well';

export interface InspectedFeature {
  title: string;
  subtitle: string;
  formula: string;
  description: string;
}

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
  uniform float uTime;
  uniform float uSpin;
  uniform float uAccretionRate;
  uniform float uDopplerStrength;
  uniform float uIscoRatio;
  uniform int uSpectralMode;
  uniform sampler2D uSpectrumLut;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.05;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Disk geometry lies in XZ plane (local XY before rotation, or radial distance from center)
    float r = length(vLocalPos.xy);
    float innerRadius = mix(2.55, 1.38, uSpin * 0.88);
    float outerRadius = 11.8;

    if (r < innerRadius || r > outerRadius) {
      discard;
    }

    float normR = clamp((r - innerRadius) / (outerRadius - innerRadius), 0.0, 1.0);
    float angle = atan(vLocalPos.y, vLocalPos.x);

    // Relativistic Keplerian differential rotation speed: omega ~ r^(-1.5)
    float omega = 3.8 / (pow(r, 1.35) + 0.15 * uSpin);
    float spiralAngle = angle + uTime * omega + 4.8 / (r - innerRadius + 0.65);

    // Magneto-rotational instability (MRI) spiral filaments
    vec2 spiralCoord = vec2(r * 1.45, spiralAngle * 2.0);
    float turbulence = fbm(spiralCoord + vec2(uTime * 0.35, -uTime * 0.6));
    float fineRings = sin(r * 7.5 - uTime * 2.4 + turbulence * 4.5) * 0.5 + 0.5;
    float filament = mix(turbulence, fineRings, 0.35);

    // Relativistic Doppler beaming:
    // Tangent velocity direction in world XZ plane
    vec3 worldNormal = normalize(vWorldPos);
    vec3 tangentDir = normalize(vec3(-vWorldPos.z, 0.0, vWorldPos.x));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float approachCos = dot(tangentDir, viewDir);

    // Orbital beta = v/c increases near inner ISCO
    float beta = clamp(0.68 / sqrt(max(1.05, r - 0.8)), 0.08, 0.78);
    float gamma = inversesqrt(max(0.15, 1.0 - beta * beta));
    float dopplerFactor = 1.0 / (gamma * (1.0 - beta * approachCos * 0.72 * uDopplerStrength));
    float beamingBoost = pow(clamp(dopplerFactor, 0.35, 2.2), 2.4);

    // Novikov-Thorne radial temperature profile T(r) ~ r^(-3/4) * (1 - sqrt(r_in/r))^(1/4)
    float innerTaper = smoothstep(innerRadius, innerRadius + 0.38, r);
    float outerTaper = 1.0 - smoothstep(outerRadius - 3.2, outerRadius, r);
    float radialFlux = pow(1.0 - normR, 1.65) * innerTaper * outerTaper;

    float intensity = radialFlux * (0.45 + 0.95 * filament) * beamingBoost * (0.55 + 0.65 * uAccretionRate);

    // Sample spectral palette
    float lutCoord = clamp(intensity * 0.62, 0.02, 0.98);
    vec3 baseColor = texture2D(uSpectrumLut, vec2(lutCoord, 0.5)).rgb;

    // Spectral Mode overrides
    if (uSpectralMode == 1) {
      // EHT 230 GHz Interferometric Sub-mm Ring Palette
      vec3 ehtDark = vec3(0.18, 0.02, 0.0);
      vec3 ehtMid = vec3(0.92, 0.32, 0.03);
      vec3 ehtHot = vec3(1.0, 0.92, 0.55);
      baseColor = mix(ehtDark, ehtMid, clamp(intensity * 0.85, 0.0, 1.0));
      baseColor = mix(baseColor, ehtHot, clamp((intensity - 0.75) * 1.1, 0.0, 1.0));
    } else if (uSpectralMode == 2) {
      // Chandra High-Energy X-Ray Spectroscopy
      vec3 xCold = vec3(0.05, 0.12, 0.45);
      vec3 xMid = vec3(0.15, 0.68, 0.98);
      vec3 xHot = vec3(0.92, 0.98, 1.0);
      baseColor = mix(xCold, xMid, clamp(intensity * 0.85, 0.0, 1.0));
      baseColor = mix(baseColor, xHot, clamp((intensity - 0.65) * 1.2, 0.0, 1.0));
    } else if (uSpectralMode == 3) {
      // Relativistic Redshift / Blueshift Velocity Map
      vec3 recedeRed = vec3(0.95, 0.16, 0.22);
      vec3 neutralGold = vec3(0.95, 0.78, 0.25);
      vec3 approachBlue = vec3(0.12, 0.82, 1.0);
      float shiftT = clamp(approachCos * 0.5 * uDopplerStrength + 0.5, 0.0, 1.0);
      baseColor = mix(recedeRed, neutralGold, smoothstep(0.0, 0.5, shiftT));
      baseColor = mix(baseColor, approachBlue, smoothstep(0.5, 1.0, shiftT));
      baseColor *= (0.45 + 0.85 * filament) * radialFlux * 1.6;
    } else {
      // Standard Bolometric Blackbody with subtle relativistic blue/red tint
      vec3 blueTint = vec3(0.76, 0.90, 1.0);
      vec3 redTint = vec3(1.0, 0.42, 0.18);
      vec3 dopplerTint = mix(redTint, blueTint, clamp(approachCos * 0.5 * uDopplerStrength + 0.5, 0.0, 1.0));
      baseColor = mix(baseColor, baseColor * dopplerTint * 1.25, 0.55 * clamp(uDopplerStrength, 0.0, 1.0));
    }

    // Photon ring ultra-hot inner edge
    float photonEdge = exp(-pow((r - innerRadius - 0.18) / 0.22, 2.0)) * 1.35;
    baseColor += vec3(1.0, 0.93, 0.80) * photonEdge * uAccretionRate;

    float alpha = clamp(innerTaper * outerTaper * (0.28 + 0.72 * filament) * min(1.3, intensity + 0.25), 0.0, 0.96);
    gl_FragColor = vec4(baseColor, alpha);
  }
`;

const LENSED_HALO_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSpin;
  uniform float uAccretionRate;
  uniform float uDopplerStrength;
  uniform float uLensingStrength;
  uniform int uSpectralMode;

  varying vec2 vUv;
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;

  void main() {
    if (uLensingStrength <= 0.02) discard;

    float r = length(vLocalPos.xy);
    float ringCenter = mix(2.45, 1.65, uSpin * 0.65);
    float ringWidth = 1.65 * uLensingStrength;

    float radialBand = exp(-pow((r - ringCenter) / max(0.25, ringWidth), 2.0));
    float secondaryPhotonRing = exp(-pow((r - (ringCenter * 0.84)) / 0.11, 2.0)) * 1.6;

    float angle = atan(vLocalPos.y, vLocalPos.x);
    float swirl = sin(angle * 6.0 - uTime * 3.2 + r * 4.0) * 0.25 + 0.75;

    // Asymmetric Doppler brightness across left/right side of lensed arch
    float dopplerAsym = 1.0 + 0.55 * uDopplerStrength * cos(angle);

    float totalGlow = (radialBand * swirl + secondaryPhotonRing) * dopplerAsym * uAccretionRate * uLensingStrength;
    if (totalGlow < 0.03) discard;

    vec3 haloColor = vec3(1.0, 0.68, 0.28);
    if (uSpectralMode == 1) {
      haloColor = vec3(0.98, 0.42, 0.08);
    } else if (uSpectralMode == 2) {
      haloColor = vec3(0.38, 0.82, 1.0);
    } else if (uSpectralMode == 3) {
      haloColor = mix(vec3(0.95, 0.22, 0.28), vec3(0.18, 0.85, 1.0), cos(angle) * 0.5 + 0.5);
    } else {
      haloColor = mix(vec3(1.0, 0.52, 0.18), vec3(0.85, 0.94, 1.0), clamp(cos(angle) * 0.45 * uDopplerStrength + 0.4, 0.0, 1.0));
    }

    vec3 finalRgb = haloColor * totalGlow * 1.15 + vec3(1.0, 0.96, 0.88) * secondaryPhotonRing * 0.7;
    float alpha = clamp(totalGlow * 0.78, 0.0, 0.92);
    gl_FragColor = vec4(finalRgb, alpha);
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

  // Root composite 3D groups
  private blackHoleGroup = new THREE.Group();
  private eventHorizonMesh!: THREE.Mesh;
  private photonRingMesh!: THREE.Mesh;
  private accretionDiskGroup = new THREE.Group();
  private accretionDiskMat!: THREE.ShaderMaterial;
  private lensedHaloGroup = new THREE.Group();
  private lensedHaloMat!: THREE.ShaderMaterial;
  private jetsGroup = new THREE.Group();
  private ergosphereGroup = new THREE.Group();
  private spacetimeWellMesh!: THREE.Mesh;
  private spacetimeWellGeo!: THREE.PlaneGeometry;
  private orbitalProbeGroup = new THREE.Group();
  private starfieldInstanced!: THREE.InstancedMesh;
  private geodesicGroup = new THREE.Group();

  // Animated photon pulses along geodesic trajectories
  private activeGeodesicPulses: Array<{
    mesh: THREE.Mesh;
    line: THREE.Line;
    points: THREE.Vector3[];
    progress: number;
    speed: number;
  }> = [];

  // Damped state variables
  private currentScale = 1.0;
  private targetScale = 1.0;
  private currentExploded = 0.0;
  private targetExploded = 0.0;
  private probeOrbitAngle = 0.8;

  // Camera transition state
  private cameraTransitionActive = false;
  private targetCamPos = new THREE.Vector3(0, 6.8, 19.5);
  private targetCamLook = new THREE.Vector3(0, 0, 0);
  private followProbeMode = false;

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
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Exponential Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.0065);

    // 3. Mandatory Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls
    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 400);
    this.camera.position.set(0, 6.2, 19.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxDistance = 58;
    this.controls.minDistance = 3.6;
    this.controls.target.set(0, 0, 0);

    // Cancel scripted camera transition when user manually drags OrbitControls
    this.controls.addEventListener('start', () => {
      this.cameraTransitionActive = false;
      this.followProbeMode = false;
    });

    // Configure Raycaster to inspect Layer 1 interactive telemetry nodes
    this.raycaster.layers.set(1);

    // 5. Build 3-Point Studio & Astrophysical Lighting Rig
    this.setupLightingRig();

    // 6. Build Composite 10-Part Relativistic Black Hole & Observatory Scene
    this.buildCompositeBlackHole();
    this.buildSpacetimeWellGrid();
    this.buildOrbitalProbeAssembly();
    this.buildInstancedStarfield();

    this.scene.add(this.blackHoleGroup);
    this.scene.add(this.geodesicGroup);

    // Seed 3 initial illustrative null geodesic photon rays (Captured, Critical Photon Sphere, Deflected)
    this.seedInitialGeodesics();

    // Apply initial parameters
    this.updateParams(initialParams, true);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('click', this.handleCanvasClick);
    this.renderer.domElement.addEventListener('dblclick', this.handleCanvasDoubleClick);

    // Start render loop
    this.startLoop();
  }

  private setupLightingRig() {
    // Warm Directional Key Light (simulating intense inner accretion disk illumination)
    const keyLight = new THREE.DirectionalLight(0xffcf87, 2.6);
    keyLight.position.set(12, 16, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 45;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Cool Sky/Ground Hemisphere Fill Light
    const hemiFill = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    this.scene.add(hemiFill);

    // Relativistic Rim / Backlight
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    rimLight.position.set(-14, -8, -12);
    this.scene.add(rimLight);
  }

  private createProceduralSpectrumTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, '#120309');
    grad.addColorStop(0.18, '#5a0f1d');
    grad.addColorStop(0.42, '#c83e12');
    grad.addColorStop(0.68, '#f59e0b');
    grad.addColorStop(0.86, '#fef08a');
    grad.addColorStop(1.0, '#e0f2fe');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
    return texture;
  }

  private createProceduralProbeHullTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 0, 256, 256);

    // Multi-layer insulation (MLI) gold foil quilting grid
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  private buildCompositeBlackHole() {
    const spectrumLut = this.createProceduralSpectrumTexture();

    // PART 1: Event Horizon Shadow Core (Schwarzschild/Kerr Black Hole Shadow)
    const horizonGeo = new THREE.SphereGeometry(1.75, 64, 64);
    const horizonMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 4.2);
          vec3 rimGlow = vec3(1.0, 0.58, 0.16) * fresnel * 0.75;
          gl_FragColor = vec4(rimGlow, 1.0);
        }
      `,
    });
    this.eventHorizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    this.eventHorizonMesh.layers.enable(1);
    this.eventHorizonMesh.userData.feature = {
      title: 'Event Horizon (r₊)',
      subtitle: 'Causal Boundary of No Return',
      formula: 'r₊ = (GM/c²)[1 + √(1 - a*²)]',
      description:
        'The null hypersurface where escape velocity equals the speed of light c. Inside r₊, all future-directed timelike and null worldlines point inward toward the singularity.',
    } satisfies InspectedFeature;
    this.blackHoleGroup.add(this.eventHorizonMesh);

    // PART 2: Photon Sphere Critical Ring (r_ph)
    const photonGeo = new THREE.TorusGeometry(2.05, 0.045, 24, 128);
    const photonMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.88,
    });
    this.photonRingMesh = new THREE.Mesh(photonGeo, photonMat);
    this.photonRingMesh.layers.enable(1);
    this.photonRingMesh.userData.feature = {
      title: 'Photon Sphere & Critical Curve',
      subtitle: 'Unstable Bound Null Orbits',
      formula: 'r_ph = 2(GM/c²)[1 + cos(⅔ arccos(-a*))]',
      description:
        'Grazing photons skimming at the critical impact parameter b_c = √27 GM/c² orbit the black hole multiple times before escaping to form the bright Einstein photon ring.',
    } satisfies InspectedFeature;
    this.blackHoleGroup.add(this.photonRingMesh);

    // PART 3: Primary Equatorial Relativistic Accretion Disk (Double-layered for volumetric thickness)
    this.accretionDiskMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpin: { value: this.params.spin },
        uAccretionRate: { value: this.params.accretionRate },
        uDopplerStrength: { value: this.params.dopplerStrength },
        uIscoRatio: { value: 1.0 },
        uSpectralMode: { value: 0 },
        uSpectrumLut: { value: spectrumLut },
      },
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: ACCRETION_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const diskPlaneGeo = new THREE.PlaneGeometry(24, 24, 64, 64);
    const mainDiskMesh = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    mainDiskMesh.rotation.x = -Math.PI / 2;
    mainDiskMesh.layers.enable(1);
    mainDiskMesh.userData.feature = {
      title: 'Relativistic Accretion Disk (ISCO)',
      subtitle: 'Novikov-Thorne Magnetohydrodynamic Plasma',
      formula: 'D = [γ(1 - β cos θ)]⁻¹ · T(r) ∝ r⁻³ᐟ⁴',
      description:
        'Differential Keplerian shear heats infalling plasma to >10⁷ K. Relativistic Doppler beaming brightens and blueshifts the approaching wing while dimming the receding wing.',
    } satisfies InspectedFeature;
    this.accretionDiskGroup.add(mainDiskMesh);

    // Secondary slightly tilted corona sheet for 3D volumetric thickness
    const coronaDiskMesh = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    coronaDiskMesh.rotation.x = -Math.PI / 2 + 0.035;
    coronaDiskMesh.position.y = 0.06;
    this.accretionDiskGroup.add(coronaDiskMesh);
    this.blackHoleGroup.add(this.accretionDiskGroup);

    // PART 4: Gravitationally Lensed Upper & Lower Accretion Halo Arch
    this.lensedHaloMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpin: { value: this.params.spin },
        uAccretionRate: { value: this.params.accretionRate },
        uDopplerStrength: { value: this.params.dopplerStrength },
        uLensingStrength: { value: this.params.lensingStrength },
        uSpectralMode: { value: 0 },
      },
      vertexShader: ACCRETION_VERTEX_SHADER,
      fragmentShader: LENSED_HALO_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const haloGeo = new THREE.PlaneGeometry(13.5, 13.5, 32, 32);
    const haloMesh = new THREE.Mesh(haloGeo, this.lensedHaloMat);
    this.lensedHaloGroup.add(haloMesh);
    this.blackHoleGroup.add(this.lensedHaloGroup);

    // PART 5: Relativistic Bipolar Astrophysical Jets (Blandford-Znajek Mechanism)
    const jetConeGeo = new THREE.ConeGeometry(1.35, 14.5, 32, 24, true);
    jetConeGeo.translate(0, 7.25, 0);
    const jetMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpin: { value: this.params.spin },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSpin;
        varying vec2 vUv;
        void main() {
          float axialFade = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
          float helix = sin(vUv.x * 25.1327 - uTime * 6.5 + vUv.y * 14.0) * 0.5 + 0.5;
          float core = sin(vUv.x * 12.566 + uTime * 4.0) * 0.3 + 0.7;
          float alpha = axialFade * (0.25 + 0.75 * helix * core) * uSpin * 0.65;
          vec3 col = mix(vec3(0.14, 0.55, 0.98), vec3(0.75, 0.92, 1.0), helix);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const northJet = new THREE.Mesh(jetConeGeo, jetMat);
    northJet.position.y = 1.4;
    northJet.layers.enable(1);
    northJet.userData.feature = {
      title: 'Blandford-Znajek Relativistic Jet',
      subtitle: 'Frame-Dragged Magnetospheric Collimation',
      formula: 'P_BZ ∝ B² r₊² (a*)² c',
      description:
        'Twisted poloidal magnetic field lines threading the rotating ergosphere extract rotational energy from the Kerr black hole, launching collimated Lorentz-boosted plasma jets along the spin axis.',
    } satisfies InspectedFeature;

    const southJet = new THREE.Mesh(jetConeGeo, jetMat);
    southJet.rotation.x = Math.PI;
    southJet.position.y = -1.4;

    // Helical magnetic flux tube ribbons wrapping the polar jets
    for (let sign of [1, -1]) {
      const curvePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const y = sign * (1.5 + t * 12.0);
        const radius = 0.22 + t * 0.95;
        const theta = t * Math.PI * 6 * sign;
        curvePts.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius));
      }
      const helixCurve = new THREE.CatmullRomCurve3(curvePts);
      const tubeGeo = new THREE.TubeGeometry(helixCurve, 64, 0.025, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      this.jetsGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
    }

    this.jetsGroup.add(northJet, southJet);
    this.blackHoleGroup.add(this.jetsGroup);

    // PART 6: Ergosphere & Lense-Thirring Frame-Dragging Geodesic Cage
    const ergoGeo = new THREE.SphereGeometry(2.35, 28, 18);
    ergoGeo.scale(1.18, 0.78, 1.18); // Oblate spheroid touching r+ at poles and 2M at equator
    const ergoMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.55,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
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
        'Between the static limit r_ergo and the outer event horizon r₊, Lense-Thirring frame dragging sweeps spacetime faster than light relative to distant stars, forcing all matter to co-rotate with the black hole.',
    } satisfies InspectedFeature;
    this.ergosphereGroup.add(ergoMesh);
    this.blackHoleGroup.add(this.ergosphereGroup);
  }

  private buildSpacetimeWellGrid() {
    // PART 7: Deformable 3D Flamm's Paraboloid Spacetime Embedding Diagram
    this.spacetimeWellGeo = new THREE.PlaneGeometry(34, 34, 68, 68);
    this.spacetimeWellGeo.rotateX(-Math.PI / 2);

    const gridMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
      roughness: 0.6,
      metalness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.spacetimeWellMesh = new THREE.Mesh(this.spacetimeWellGeo, gridMat);
    this.spacetimeWellMesh.position.y = -3.2;
    this.spacetimeWellMesh.layers.enable(1);
    this.spacetimeWellMesh.userData.feature = {
      title: "Flamm's Paraboloid Embedding Grid",
      subtitle: 'Spatial Curvature Cross-Section',
      formula: 'dz/dr = √(Rs / (r - Rs)) · z(r) = 2√(Rs(r - Rs))',
      description:
        'Visualizes intrinsic equatorial spatial curvature in the Schwarzschild/Kerr metric. Higher black hole mass deepens the gravitational potential funnel.',
    } satisfies InspectedFeature;
    this.scene.add(this.spacetimeWellMesh);
    this.deformSpacetimeGrid(this.params.massSolar, this.params.spin);
  }

  private deformSpacetimeGrid(massSolar: number, spin: number) {
    const posAttr = this.spacetimeWellGeo.attributes.position as THREE.BufferAttribute;
    const wellDepth = 2.8 + (massSolar / 100) * 5.2;
    const rs = 1.6 + (massSolar / 100) * 1.1;

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const r = Math.hypot(x, z);

      // Smooth relativistic funnel profile
      const funnel = -wellDepth / Math.sqrt(Math.max(0.55, (r * r) / (rs * rs) + 0.45));
      // Subtle frame-dragging spiral ripple in grid elevation
      const angle = Math.atan2(z, x);
      const twist = spin * 0.22 * Math.sin(angle * 2 + r * 0.6) * Math.exp(-r * 0.12);
      posAttr.setY(i, funnel + twist);
    }
    posAttr.needsUpdate = true;
    this.spacetimeWellGeo.computeVertexNormals();
  }

  private buildOrbitalProbeAssembly() {
    // PART 8: 7-Part Composite Procedural Relativistic Telemetry Spacecraft ("Horizons-IX Probe")
    const foilTexture = this.createProceduralProbeHullTexture();

    // 1. Primary Octagonal Bus Hull (Brushed Gold Multi-Layer Insulation with anisotropy)
    const hullGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.55, 8);
    hullGeo.computeTangents();
    const goldFoilMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      map: foilTexture,
      metalness: 0.92,
      roughness: 0.22,
      anisotropy: 0.8,
      clearcoat: 0.4,
    });
    const hullMesh = new THREE.Mesh(hullGeo, goldFoilMat);
    hullMesh.castShadow = !isSoftwareGl;
    this.orbitalProbeGroup.add(hullMesh);

    // 2. Secondary Parabolic High-Gain Telemetry Dish (LatheGeometry)
    const lathePoints: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const r = (i / 10) * 0.48;
      const y = 0.28 + r * r * 0.65;
      lathePoints.push(new THREE.Vector2(r, y));
    }
    const dishGeo = new THREE.LatheGeometry(lathePoints, 24);
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.48, // >= 0.25 roughness delta from hull
    });
    const dishMesh = new THREE.Mesh(dishGeo, titaniumMat);
    this.orbitalProbeGroup.add(dishMesh);

    // 3. Dish Feed Receiver Tripod Spike
    const spikeGeo = new THREE.ConeGeometry(0.04, 0.35, 12);
    spikeGeo.translate(0, 0.48, 0);
    const darkCarbonMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.4,
      roughness: 0.75,
    });
    const spikeMesh = new THREE.Mesh(spikeGeo, darkCarbonMat);
    this.orbitalProbeGroup.add(spikeMesh);

    // 4 & 5. Port & Starboard Radiator / Solar Array Wings (ExtrudeGeometry with bevel)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -0.14);
    wingShape.lineTo(0.95, -0.10);
    wingShape.lineTo(0.95, 0.10);
    wingShape.lineTo(0, 0.14);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelSize: 0.01,
      bevelThickness: 0.01,
      bevelSegments: 2,
    });
    const solarPanelMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.25,
      metalness: 0.65,
      roughness: 0.15,
      clearcoat: 0.8,
    });

    const leftWing = new THREE.Mesh(wingGeo, solarPanelMat);
    leftWing.position.set(0.26, 0, 0);
    const rightWing = new THREE.Mesh(wingGeo, solarPanelMat);
    rightWing.rotation.y = Math.PI;
    rightWing.position.set(-0.26, 0, 0);
    this.orbitalProbeGroup.add(leftWing, rightWing);

    // 6. Optical Gravity-Gradiometer Sensor Dome (Transmissive Sapphire Crystal with software-GL fallback)
    const domeGeo = new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: isSoftwareGl ? 0 : 0.92,
      transparent: true,
      opacity: isSoftwareGl ? 0.45 : 1.0,
      ior: 1.76,
      thickness: 0.8,
      roughness: 0.08,
      metalness: 0.05,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const domeMesh = new THREE.Mesh(domeGeo, crystalMat);
    domeMesh.rotation.x = Math.PI;
    domeMesh.position.y = -0.26;
    domeMesh.renderOrder = 4;
    this.orbitalProbeGroup.add(domeMesh);

    // 7. Relativistic Hall-Effect Ion Thruster Plume Accent
    const plumeGeo = new THREE.ConeGeometry(0.11, 0.45, 16);
    plumeGeo.rotateX(Math.PI / 2);
    plumeGeo.translate(0, 0, -0.45);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
    this.orbitalProbeGroup.add(plumeMesh);

    // Enable raycasting inspection on all probe parts
    this.orbitalProbeGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.layers.enable(1);
        child.userData.feature = {
          title: 'Horizons-IX Geodesic Telemetry Probe',
          subtitle: 'Relativistic Clock & Redshift Beacon',
          formula: 'dτ = dt √(1 - Rs/r - v²/c²)',
          description:
            'Tracks real-time gravitational time dilation and frame-dragging precession. As the probe orbits closer to the photon sphere, its onboard atomic clock ticks markedly slower than a distant observer.',
        } satisfies InspectedFeature;
      }
    });

    this.scene.add(this.orbitalProbeGroup);
  }

  private buildInstancedStarfield() {
    // PART 9: Instanced Background Starfield (1,400 stars with blackbody stellar classification)
    const starCount = 1400;
    const starGeo = new THREE.OctahedronGeometry(0.14, 1);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.starfieldInstanced = new THREE.InstancedMesh(starGeo, starMat, starCount);

    // Harvard spectral classification colors (O, B, A, F, G, K, M)
    const spectralPalette = [
      0x9bb0ff, // O-type blue giant
      0xaabfff, // B-type blue-white
      0xcad7ff, // A-type white
      0xf8f7ff, // F-type yellow-white
      0xfff4ea, // G-type solar yellow
      0xffd2a1, // K-type orange
      0xffcc6f, // M-type red dwarf
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute on spherical shell between r = 65 and r = 175
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const radius = 68 + Math.random() * 105;

      _vec3A.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      // Apply ±15% (and varied magnitude) scale variation
      const scale = 0.55 + Math.random() * 1.15;
      _vec3B.set(scale, scale, scale);
      _quat.identity();
      _mat4.compose(_vec3A, _quat, _vec3B);
      this.starfieldInstanced.setMatrixAt(i, _mat4);

      const hex = spectralPalette[i % spectralPalette.length];
      _color.setHex(hex);
      this.starfieldInstanced.setColorAt(i, _color);
    }

    this.starfieldInstanced.instanceMatrix.needsUpdate = true;
    if (this.starfieldInstanced.instanceColor) {
      this.starfieldInstanced.instanceColor.needsUpdate = true;
    }
    this.starfieldInstanced.computeBoundingSphere();
    this.scene.add(this.starfieldInstanced);
  }

  private seedInitialGeodesics() {
    // Launch 3 representative photon trajectories: grazing critical orbit, gravitational scatter, and capture
    this.launchPhotonGeodesic(2.38, 0.2, true); // Critical photon sphere grazing
    this.launchPhotonGeodesic(4.15, -0.35, true); // Gravitational deflection
    this.launchPhotonGeodesic(1.15, 0.0, true); // Event horizon capture
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
      opacity: 0.72,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this.geodesicGroup.add(line);

    const pulseGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: traj.colorHex,
    });
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

    // Keep maximum 8 active geodesic trajectories to prevent visual clutter
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

  public updateParams(nextParams: BlackHoleParams, immediate = false) {
    const massChanged =
      Math.abs(nextParams.massSolar - this.params.massSolar) > 0.1 ||
      Math.abs(nextParams.spin - this.params.spin) > 0.01;

    this.params = nextParams;

    // Scale visual radius subtly with mass (0.78x to 1.38x) so changes are physically tangible
    this.targetScale = 0.78 + (nextParams.massSolar / 100) * 0.62;
    this.targetExploded = nextParams.explodedSeparation;

    if (immediate) {
      this.currentScale = this.targetScale;
      this.currentExploded = this.targetExploded;
    }

    // Update shader uniforms
    const modeIndex =
      nextParams.spectralMode === 'eht230ghz'
        ? 1
        : nextParams.spectralMode === 'xray'
        ? 2
        : nextParams.spectralMode === 'doppler'
        ? 3
        : 0;

    this.accretionDiskMat.uniforms.uSpin.value = nextParams.spin;
    this.accretionDiskMat.uniforms.uAccretionRate.value = nextParams.accretionRate;
    this.accretionDiskMat.uniforms.uDopplerStrength.value = nextParams.dopplerStrength;
    this.accretionDiskMat.uniforms.uSpectralMode.value = modeIndex;

    this.lensedHaloMat.uniforms.uSpin.value = nextParams.spin;
    this.lensedHaloMat.uniforms.uAccretionRate.value = nextParams.accretionRate;
    this.lensedHaloMat.uniforms.uDopplerStrength.value = nextParams.dopplerStrength;
    this.lensedHaloMat.uniforms.uLensingStrength.value = nextParams.lensingStrength;
    this.lensedHaloMat.uniforms.uSpectralMode.value = modeIndex;

    this.jetsGroup.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && (mesh.material as THREE.ShaderMaterial).uniforms?.uSpin) {
        (mesh.material as THREE.ShaderMaterial).uniforms.uSpin.value = nextParams.spin;
      }
    });

    // Layer visibilities
    this.accretionDiskGroup.visible = nextParams.layers.accretionDisk;
    this.lensedHaloGroup.visible = nextParams.layers.lensedHalo;
    this.jetsGroup.visible = nextParams.layers.relativisticJets && nextParams.spin > 0.05;
    this.ergosphereGroup.visible = nextParams.layers.ergosphereCage;
    this.spacetimeWellMesh.visible = nextParams.layers.spacetimeGrid;
    this.orbitalProbeGroup.visible = nextParams.layers.orbitalProbe;
    this.geodesicGroup.visible = nextParams.layers.geodesicRays;

    if (massChanged) {
      this.deformSpacetimeGrid(nextParams.massSolar, nextParams.spin);
    }
  }

  public setCameraPreset(preset: CameraPresetId) {
    this.followProbeMode = preset === 'probe';
    this.cameraTransitionActive = true;

    const incRad = THREE.MathUtils.degToRad(this.params.inclinationDeg);

    switch (preset) {
      case 'equatorial':
        this.targetCamPos.set(0, Math.cos(incRad) * 20.5, Math.sin(incRad) * 20.5);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'polar':
        this.targetCamPos.set(0, 23.5, 1.2);
        this.targetCamLook.set(0, 0, 0);
        break;
      case 'grazing':
        this.targetCamPos.set(-5.8, 1.35, 11.2);
        this.targetCamLook.set(1.2, 0.2, 0);
        break;
      case 'well':
        this.targetCamPos.set(14.5, -5.2, 16.5);
        this.targetCamLook.set(0, -3.5, 0);
        break;
      case 'probe':
        // Handled dynamically in tick() to track the orbiting probe
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
  };

  private handlePointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - this.lastRaycastTime < 55) return; // Throttle raycasting for zero frame drops
    this.lastRaycastTime = now;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Project onto equatorial plane Y=0 for live Schwarzschild/Kerr coordinate readout
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
    // Double-clicking anywhere in space fires a test photon geodesic at that impact parameter!
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
    const elapsed = this.accretionDiskMat.uniforms.uTime.value + simDelta;

    // 1. Advance Shader Uniform Clocks
    this.accretionDiskMat.uniforms.uTime.value = elapsed;
    this.lensedHaloMat.uniforms.uTime.value = elapsed;
    this.jetsGroup.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && (mesh.material as THREE.ShaderMaterial).uniforms?.uTime) {
        (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
      }
    });

    // 2. Smooth Exponential Damping on Black Hole Mass Scale & Exploded Anatomy Separation
    this.currentScale = THREE.MathUtils.damp(this.currentScale, this.targetScale, 5.5, rawDelta);
    this.currentExploded = THREE.MathUtils.damp(this.currentExploded, this.targetExploded, 6.0, rawDelta);

    this.eventHorizonMesh.scale.setScalar(this.currentScale);
    this.photonRingMesh.scale.setScalar(this.currentScale);
    this.accretionDiskGroup.scale.setScalar(this.currentScale);
    this.lensedHaloGroup.scale.setScalar(this.currentScale);

    // Exploded view vertical separation of anatomical structures
    this.ergosphereGroup.position.y = this.currentExploded * 3.8;
    this.accretionDiskGroup.position.y = 0;
    this.spacetimeWellMesh.position.y = -3.2 - this.currentExploded * 3.6;
    this.jetsGroup.position.y = this.currentExploded * 1.6;

    // 3. Billboard Lensed Accretion Halo & Photon Ring toward Camera
    this.lensedHaloGroup.lookAt(this.camera.position);
    this.photonRingMesh.lookAt(this.camera.position);

    // 4. Lense-Thirring Frame-Dragging Rotation of Ergosphere Cage
    const metrics = computeRelativisticMetrics(this.params);
    this.ergosphereGroup.rotation.y += simDelta * (0.4 + metrics.frameDraggingOmega * 4.5);
    this.ergosphereGroup.scale.set(
      this.currentScale * (1.0 + 0.22 * this.params.spin),
      this.currentScale * (1.0 - 0.14 * this.params.spin),
      this.currentScale * (1.0 + 0.22 * this.params.spin)
    );

    // 5. Advance Orbital Telemetry Probe along Relativistic Geodesic Orbit
    const orbitSceneRadius = this.params.probeRadiusRs * 1.75 * this.currentScale;
    const angularSpeed = (1.65 * metrics.probeOrbitalBeta) / Math.max(1.5, this.params.probeRadiusRs * 0.45);
    this.probeOrbitAngle += simDelta * angularSpeed;

    const probeX = Math.cos(this.probeOrbitAngle) * orbitSceneRadius;
    const probeZ = -Math.sin(this.probeOrbitAngle) * orbitSceneRadius;
    const probeY = Math.sin(this.probeOrbitAngle * 2.0) * 0.28 * this.params.spin;
    this.orbitalProbeGroup.position.set(probeX, probeY, probeZ);
    // Orient probe tangent to its orbital velocity vector
    _vec3C.set(
      probeX - Math.sin(this.probeOrbitAngle),
      probeY,
      probeZ - Math.cos(this.probeOrbitAngle)
    );
    this.orbitalProbeGroup.lookAt(_vec3C);

    // 6. Advance Geodesic Photon Pulses
    for (const item of this.activeGeodesicPulses) {
      item.progress += rawDelta * item.speed * Math.max(0.25, this.params.timeScale);
      if (item.progress >= item.points.length - 1) {
        item.progress = 0;
      }
      const idx = Math.floor(item.progress);
      const frac = item.progress - idx;
      const p0 = item.points[idx];
      const p1 = item.points[Math.min(item.points.length - 1, idx + 1)];
      item.mesh.position.lerpVectors(p0, p1, frac);
    }

    // 7. Smooth Camera Preset Interpolation or Probe Follow Mode
    if (this.followProbeMode) {
      _vec3A.set(probeX * 1.32, probeY + 1.8, probeZ * 1.32);
      this.camera.position.lerp(_vec3A, 1 - Math.exp(-5.0 * rawDelta));
      this.controls.target.lerp(this.orbitalProbeGroup.position, 1 - Math.exp(-7.0 * rawDelta));
    } else if (this.cameraTransitionActive) {
      const factor = 1 - Math.exp(-5.5 * rawDelta);
      this.camera.position.lerp(this.targetCamPos, factor);
      this.controls.target.lerp(this.targetCamLook, factor);
      if (this.camera.position.distanceTo(this.targetCamPos) < 0.08) {
        this.cameraTransitionActive = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

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
    this.renderer.dispose();
  }
}
