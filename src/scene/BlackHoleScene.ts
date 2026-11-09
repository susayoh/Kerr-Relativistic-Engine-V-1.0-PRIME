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

// Realistic 3D Relativistic Accretion Disk Shader with Continuous Doppler Beaming & MRI Turbulence
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
  uniform int uSpectralMode;
  uniform sampler2D uSpectrumLut;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  // High-performance 2D Simplex Noise for fine plasma filaments
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

  void main() {
    float r = length(vLocalPos.xy);
    float horizonRadius = mix(1.75, 1.08, uSpin * 0.72);
    float iscoRadius = mix(2.65, 1.45, uSpin * 0.88);
    float outerRadius = 12.2;

    if (r < horizonRadius || r > outerRadius) {
      discard;
    }

    float angle = atan(vLocalPos.y, vLocalPos.x);

    // Relativistic Keplerian differential shear omega ~ r^(-1.5)
    float omega = 3.6 / (pow(r, 1.42) + 0.12 * uSpin);
    float spiralAngle = angle + uTime * omega + 4.2 / (max(0.2, r - iscoRadius + 0.55));

    // Multi-scale Magneto-Rotational Instability (MRI) filaments
    vec2 spiralCoord = vec2(r * 1.6, spiralAngle * 2.2);
    float turbulence = fbm(spiralCoord + vec2(uTime * 0.25, -uTime * 0.45));
    float fineRings = sin(r * 8.5 - uTime * 2.8 + turbulence * 3.5) * 0.5 + 0.5;
    float filaments = mix(turbulence, fineRings, 0.32);

    // Relativistic Kinematics:
    // Orbital velocity v/c in Kerr spacetime
    float beta = clamp(0.72 / sqrt(max(1.08, r - 0.75 + 0.25 * uSpin)), 0.05, 0.78);
    float gamma = inversesqrt(max(0.12, 1.0 - beta * beta));

    // Tangent velocity unit vector in world space
    vec3 tangentDir = normalize(vec3(-vWorldPos.z, 0.0, vWorldPos.x));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float approachCos = dot(tangentDir, viewDir);

    // Continuous Relativistic Doppler Factor: D = 1 / [gamma * (1 - beta * cos theta)]
    float dopplerFactor = 1.0 / (gamma * (1.0 - beta * approachCos * 0.85 * uDopplerStrength));

    // Continuous, elegant Doppler flux boost (subtle and physically authentic, no ugly harsh neon split)
    float dopplerBoost = mix(1.0, pow(clamp(dopplerFactor, 0.45, 2.4), 2.2), clamp(uDopplerStrength, 0.0, 1.0));

    // Novikov-Thorne radial temperature profile with inner plunging decay
    float normR = clamp((r - iscoRadius) / (outerRadius - iscoRadius), 0.0, 1.0);
    float mainDiskFlux = pow(1.0 - normR, 1.55) * smoothstep(iscoRadius - 0.1, iscoRadius + 0.45, r);
    float outerFalloff = 1.0 - smoothstep(outerRadius - 2.8, outerRadius, r);

    // Inner plunging region between Horizon and ISCO: matter free-falls into horizon
    float plungeMask = (1.0 - smoothstep(horizonRadius, iscoRadius, r)) * smoothstep(horizonRadius, horizonRadius + 0.15, r);
    float plungeSpiral = sin(angle * 3.0 + uTime * 6.5 + 8.0 / max(0.1, r - horizonRadius + 0.2)) * 0.5 + 0.5;
    float plungeFlux = plungeMask * (0.35 + 0.65 * plungeSpiral) * 0.55;

    float totalFlux = (mainDiskFlux + plungeFlux) * outerFalloff * (0.55 + 0.85 * filaments);
    float intensity = totalFlux * dopplerBoost * (0.65 + 0.55 * uAccretionRate);

    // Physical Blackbody Color Spectrum:
    // Approaching wing gets hotter (bright incandescent white-gold), receding wing gets cooler (warm deep amber)
    float effTempRatio = clamp(intensity * (0.75 + 0.35 * dopplerFactor), 0.02, 1.4);
    vec3 baseColor = texture2D(uSpectrumLut, vec2(clamp(effTempRatio * 0.68, 0.02, 0.98), 0.5)).rgb;

    // Spectral mode adjustments
    if (uSpectralMode == 1) {
      // EHT 230 GHz Sub-mm palette
      vec3 ehtDark = vec3(0.14, 0.02, 0.01);
      vec3 ehtMid = vec3(0.95, 0.38, 0.04);
      vec3 ehtHot = vec3(1.0, 0.94, 0.65);
      baseColor = mix(ehtDark, ehtMid, clamp(intensity * 0.85, 0.0, 1.0));
      baseColor = mix(baseColor, ehtHot, clamp((intensity - 0.7) * 1.2, 0.0, 1.0));
    } else if (uSpectralMode == 2) {
      // Chandra X-Ray palette
      vec3 xDark = vec3(0.04, 0.12, 0.35);
      vec3 xMid = vec3(0.18, 0.65, 0.98);
      vec3 xHot = vec3(0.92, 0.98, 1.0);
      baseColor = mix(xDark, xMid, clamp(intensity * 0.85, 0.0, 1.0));
      baseColor = mix(baseColor, xHot, clamp((intensity - 0.6) * 1.3, 0.0, 1.0));
    } else if (uSpectralMode == 3) {
      // Smooth Doppler velocity map (smooth, non-garish)
      vec3 recedeAmber = vec3(0.95, 0.42, 0.12);
      vec3 neutralGold = vec3(0.98, 0.82, 0.35);
      vec3 approachCyan = vec3(0.25, 0.85, 1.0);
      float shiftT = clamp(approachCos * 0.48 * uDopplerStrength + 0.5, 0.0, 1.0);
      vec3 dopplerRgb = mix(recedeAmber, neutralGold, smoothstep(0.0, 0.5, shiftT));
      dopplerRgb = mix(dopplerRgb, approachCyan, smoothstep(0.5, 1.0, shiftT));
      baseColor = mix(baseColor, dopplerRgb, 0.6) * intensity;
    }

    float alpha = clamp(totalFlux * (0.45 + 0.55 * filaments) * min(1.4, intensity + 0.3), 0.0, 0.98);
    gl_FragColor = vec4(baseColor, alpha);
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
  private accretionDiskGroup = new THREE.Group();
  private accretionDiskMat!: THREE.ShaderMaterial;
  private ergosphereGroup = new THREE.Group();
  private spacetimeWellMesh!: THREE.Mesh;
  private spacetimeWellGeo!: THREE.BufferGeometry;
  private orbitalStarsGroup = new THREE.Group();
  private starfieldInstanced!: THREE.InstancedMesh;
  private geodesicGroup = new THREE.Group();

  // Primary Orbiting Star S2 representation
  private starS2Mesh!: THREE.Mesh;
  private starS2GlowMesh!: THREE.Mesh;
  private starOrbitTrail!: THREE.Line;
  private companionStars: Array<{ mesh: THREE.Mesh; semiMajor: number; inclination: number; phase: number; speed: number }> = [];

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
  private starOrbitAngle = 0.8;

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

    // 3. Mandatory Studio Environment Reflection
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
    this.controls.maxDistance = 95;
    this.controls.minDistance = 3.8;
    this.controls.target.set(0, 0, 0);

    this.controls.addEventListener('start', () => {
      this.cameraTransitionActive = false;
      this.followStarMode = false;
    });

    this.raycaster.layers.set(1);

    // 5. Build 3-Point Astrophysical Lighting Rig
    this.setupLightingRig();

    // 6. Build Composite Relativistic Black Hole & Nuclear Star Cluster Scene
    this.buildCompositeBlackHole();
    this.buildSpacetimeWellManifold();
    this.buildOrbitingStarCluster();
    this.buildInstancedDeepStarfield();

    this.scene.add(this.blackHoleGroup);
    this.scene.add(this.geodesicGroup);

    // Seed representative null geodesic photon rays
    this.seedInitialGeodesics();

    // Apply initial parameters
    this.updateParams(initialParams, true);

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event listeners
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('click', this.handleCanvasClick);
    this.renderer.domElement.addEventListener('dblclick', this.handleCanvasDoubleClick);

    this.startLoop();
  }

  private setupLightingRig() {
    // Warm Key Light from inner accretion flow
    const keyLight = new THREE.DirectionalLight(0xffdf9e, 2.8);
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
    this.scene.add(keyLight);

    // Cool Sky/Ground Fill Light
    const hemiFill = new THREE.HemisphereLight(0x60a5fa, 0x070b14, 0.9);
    this.scene.add(hemiFill);

    // Relativistic Rim Light
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
    // Smooth Planck thermodynamic blackbody temperature gradient (Infrared -> Red -> Gold -> White -> Blue-white)
    grad.addColorStop(0.0, '#0a0305');
    grad.addColorStop(0.15, '#3b0d11');
    grad.addColorStop(0.35, '#8f280a');
    grad.addColorStop(0.55, '#d97706');
    grad.addColorStop(0.75, '#fbbf24');
    grad.addColorStop(0.88, '#fef3c7');
    grad.addColorStop(1.0, '#dbeafe');
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

    // 1. Central Event Horizon Shadow Core (Schwarzschild / Kerr Causal Boundary)
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
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
      `,
    });
    this.eventHorizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    this.eventHorizonMesh.layers.enable(1);
    this.eventHorizonMesh.userData.feature = {
      title: 'Event Horizon (r₊)',
      subtitle: 'Kerr Spacetime Causal Boundary',
      formula: 'r₊ = (GM/c²)[1 + √(1 - a*²)]',
      description:
        'The null hypersurface boundary of no return. Within r₊, escape velocity exceeds c and all timelike geodesics terminate at the central ring singularity.',
    } satisfies InspectedFeature;
    this.blackHoleGroup.add(this.eventHorizonMesh);

    // 2. High-Fidelity 3D Relativistic Accretion Disk (Multi-Layered with Warping & Plunging Flow)
    this.accretionDiskMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpin: { value: this.params.spin },
        uAccretionRate: { value: this.params.accretionRate },
        uDopplerStrength: { value: this.params.dopplerStrength },
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

    // Primary Equatorial Disk Sheet
    const diskPlaneGeo = new THREE.PlaneGeometry(25, 25, 80, 80);
    const mainDiskMesh = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    mainDiskMesh.rotation.x = -Math.PI / 2;
    mainDiskMesh.layers.enable(1);
    mainDiskMesh.userData.feature = {
      title: 'Relativistic Accretion Disk (ISCO)',
      subtitle: 'Magnetohydrodynamic Plasma & Differential Shear',
      formula: 'T(r) ∝ r⁻³ᐟ⁴ [1 - √(r_in/r)]¹ᐟ⁴ · D = [γ(1 - β cos θ)]⁻¹',
      description:
        'Keplerian shear drives viscous magneto-rotational instability (MRI), heating plasma to millions of degrees. Continuous relativistic Doppler beaming smoothly illuminates approaching plasma.',
    } satisfies InspectedFeature;
    this.accretionDiskGroup.add(mainDiskMesh);

    // Secondary slightly warped vertical corona layers for authentic 3D volumetric thickness
    const corona1 = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    corona1.rotation.x = -Math.PI / 2 + 0.025;
    corona1.position.y = 0.05;
    const corona2 = new THREE.Mesh(diskPlaneGeo, this.accretionDiskMat);
    corona2.rotation.x = -Math.PI / 2 - 0.025;
    corona2.position.y = -0.05;
    this.accretionDiskGroup.add(corona1, corona2);
    this.blackHoleGroup.add(this.accretionDiskGroup);

    // 4. Kerr Ergosphere & Lense-Thirring Frame-Dragging Geodesic Spheroid
    const ergoGeo = new THREE.SphereGeometry(2.35, 32, 20);
    ergoGeo.scale(1.18, 0.78, 1.18);
    const ergoMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
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

  private buildSpacetimeWellManifold() {
    // Expansive, clean Cartesian Spacetime Manifold (Continuous rubber sheet with NO hole in center)
    // Spreads 110 units wide into deep space, asymptotically flattening to Minkowski spacetime
    this.spacetimeWellGeo = new THREE.PlaneGeometry(110, 110, 64, 64);
    this.spacetimeWellGeo.rotateX(-Math.PI / 2);

    const wellMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
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
        'Continuous general-relativistic embedding diagram illustrating equatorial spatial curvature extending far into the cosmic background with a solid central throat.',
    } satisfies InspectedFeature;
    this.scene.add(this.spacetimeWellMesh);

    this.deformSpacetimeWell(this.params.massSolar, this.params.spin);
  }

  private deformSpacetimeWell(massSolar: number, spin: number) {
    const posAttr = this.spacetimeWellGeo.attributes.position as THREE.BufferAttribute;
    const wellDepth = 4.8 + (massSolar / 100) * 8.0;
    const rs = 2.4 + (massSolar / 100) * 2.2;

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const r = Math.hypot(x, z);

      // Smooth Einstein gravitational funnel with solid center (no hole)
      // At r -> 0: curves down smoothly to the throat bottom
      // At large r: asymptotically flattens out into flat space
      const funnel = -wellDepth / Math.pow((r * r) / (rs * rs) + 0.65, 0.44);

      // Subtle Kerr frame-dragging vortex spiral
      const angle = Math.atan2(z, x);
      const frameDragSpiral = spin * 0.35 * Math.sin(angle * 2.0 + r * 0.32) * Math.exp(-r * 0.12);

      posAttr.setY(i, funnel + frameDragSpiral);
    }
    posAttr.needsUpdate = true;
    this.spacetimeWellGeo.computeVertexNormals();
  }

  private buildOrbitingStarCluster() {
    // Primary Target: Relativistic S-Star S2 (The famous B-type star orbiting Sgr A* used to test GR!)
    const starS2Geo = new THREE.SphereGeometry(0.32, 24, 24);
    const starS2Mat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd, // B-type blue-white star
    });
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
        'B-type main-sequence star orbiting in the extreme relativistic gravitational field of the supermassive black hole. Tracking S2 provided the first direct confirmation of gravitational redshift and Schwarzschild orbital precession.',
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

    // Companion S-Stars (S38, S55, S62) orbiting at distinct inclinations and radii
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
        description:
          'High-velocity star orbiting within the central parsec of the black hole, experiencing frame dragging and gravitational redshift.',
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

  private buildInstancedDeepStarfield() {
    // 2,200 High-Density Celestial Stars with Harvard Spectral Classification
    const starCount = 2200;
    const starGeo = new THREE.OctahedronGeometry(0.16, 1);
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
      const radius = 60 + Math.random() * 125;

      _vec3A.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      const scale = 0.45 + Math.random() * 1.35;
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

  public updateParams(nextParams: BlackHoleParams, immediate = false) {
    const massChanged =
      Math.abs(nextParams.massSolar - this.params.massSolar) > 0.1 ||
      Math.abs(nextParams.spin - this.params.spin) > 0.01;

    this.params = nextParams;

    // Scale black hole significantly bigger: up to 3.0x scale for majestic cosmic presence
    this.targetScale = 1.35 + (nextParams.massSolar / 100) * 1.65;
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

    this.accretionDiskMat.uniforms.uSpin.value = nextParams.spin;
    this.accretionDiskMat.uniforms.uAccretionRate.value = nextParams.accretionRate;
    this.accretionDiskMat.uniforms.uDopplerStrength.value = nextParams.dopplerStrength;
    this.accretionDiskMat.uniforms.uSpectralMode.value = modeIndex;

    // Layer visibilities
    this.accretionDiskGroup.visible = nextParams.layers.accretionDisk;
    this.ergosphereGroup.visible = nextParams.layers.ergosphereCage;
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
        this.targetCamPos.set(22.0, -8.5, 26.0);
        this.targetCamLook.set(0, -4.5, 0);
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
    const elapsed = this.accretionDiskMat.uniforms.uTime.value + simDelta;

    // 1. Advance Shader Uniform Clocks
    this.accretionDiskMat.uniforms.uTime.value = elapsed;

    // 2. Smooth Exponential Damping on Black Hole Mass Scale & Exploded Anatomy Separation
    this.currentScale = THREE.MathUtils.damp(this.currentScale, this.targetScale, 5.5, rawDelta);
    this.currentExploded = THREE.MathUtils.damp(this.currentExploded, this.targetExploded, 6.0, rawDelta);

    this.eventHorizonMesh.scale.setScalar(this.currentScale);
    this.accretionDiskGroup.scale.setScalar(this.currentScale);

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

    // 4. Advance Orbiting Star S2 along Relativistic Orbit
    const orbitSceneRadius = this.params.probeRadiusRs * 1.75 * this.currentScale;
    const angularSpeed = (1.65 * metrics.probeOrbitalBeta) / Math.max(1.5, this.params.probeRadiusRs * 0.45);
    this.starOrbitAngle += simDelta * angularSpeed;

    const starX = Math.cos(this.starOrbitAngle) * orbitSceneRadius;
    const starZ = -Math.sin(this.starOrbitAngle) * orbitSceneRadius;
    const starY = Math.sin(this.starOrbitAngle * 2.0) * 0.22 * this.params.spin;
    this.starS2Mesh.position.set(starX, starY, starZ);

    // Gentle star corona pulsation
    const starPulse = 1.0 + Math.sin(elapsed * 4.0) * 0.12;
    this.starS2GlowMesh.scale.setScalar(starPulse);

    // 5. Advance Companion S-Stars in Nuclear Cluster
    for (const comp of this.companionStars) {
      comp.phase += simDelta * (0.45 * comp.speed);
      const rComp = comp.semiMajor * 1.75 * this.currentScale;
      const cx = Math.cos(comp.phase) * rComp;
      const cz = Math.sin(comp.phase) * rComp;
      const cy = Math.sin(comp.phase) * Math.sin(comp.inclination) * rComp * 0.45;
      comp.mesh.position.set(cx, cy, cz);
    }

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

    // 7. Smooth Camera Preset Interpolation or Star Follow Mode
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
    this.renderer.dispose();
  }
}
