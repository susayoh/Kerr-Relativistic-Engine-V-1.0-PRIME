import * as THREE from 'three';
import {
  ASTROPHYSICAL_PRESETS,
  BlackHoleParams,
  isStellarCategory,
} from '../physics/gravitationalPhysics';

export interface KerrUniformSettingsInput {
  accretionDiskStyle?: 'classic' | 'raymarched';
  bloomIntensity?: number;
  lensFlareIntensity?: number;
  webglDepthPeeling?: boolean;
  highPerformanceMode?: boolean;
}

export interface KerrLensingUniforms {
  [uniform: string]: THREE.IUniform<any>;
  uCameraPos: { value: THREE.Vector3 };
  uBlackHolePos: { value: THREE.Vector3 };
  uScale: { value: number };
  uSpin: { value: number };
  uAccretionRate: { value: number };
  uDopplerStrength: { value: number };
  uSpectralMode: { value: number };
  uSpectrumLut: { value: THREE.Texture | null };
  uLensingActive: { value: number };
  uShowDisk: { value: number };
  uIsStar: { value: number };
  uPulseRadius: { value: number };
  uPulseStrength: { value: number };
  uTime: { value: number };
  uDiskStyle: { value: number };
  uBloomIntensity: { value: number };
  uAccretionState: { value: number };
  uExpansionProgress: { value: number };
  uIsBinarySystem: { value: number };
  uCompanionStarPos: { value: THREE.Vector3 };
  uCompanionStarRadius: { value: number };
  uDepthPeeling: { value: number };
  u_isOrbiting: { value: number };
  u_stepCount: { value: number };
}

export interface AccretionDiskUniforms {
  [uniform: string]: THREE.IUniform<any>;
  uDopplerCoeffs: { value: THREE.Vector4 };
  uDiskParams: { value: THREE.Vector4 };
  uTurbulenceBuffer: { value: THREE.Vector4 };
  uTurbulenceHarmonics: { value: THREE.Vector4 };
  uSpectrumLut: { value: THREE.Texture | null };
  uPulseRadius: { value: number };
  uPulseStrength: { value: number };
  uDiskStyle: { value: number };
  uBloomIntensity: { value: number };
  uAccretionState: { value: number };
  uExpansionProgress: { value: number };
  uDepthPeeling: { value: number };
}

/**
 * Astrophysical preset ID to true solar mass (M☉) lookup table for proportional cosmic scaling.
 */
export const PRESET_TRUE_MASS_SOLAR_MAP: Readonly<Record<string, number>> = {
  ton618: 6.6e10,
  m87: 6.5e9,
  sgra: 4.3e6,
  gw190521: 142,
  gw150914: 62,
  cygnus_x1: 21.2,
  v404_cygni: 9,
};

/**
 * Spectral mode string to integer shader uniform `uSpectralMode` index mapping.
 */
export const SPECTRAL_MODE_INDEX_MAP: Readonly<Record<BlackHoleParams['spectralMode'], number>> = {
  blackbody: 0,
  eht230ghz: 1,
  xray: 2,
  doppler: 3,
};

/**
 * Spectral mode to optical lens flare primary & secondary tint hex colors.
 */
export const SPECTRAL_LENS_FLARE_TINTS: Readonly<
  Record<BlackHoleParams['spectralMode'], { primaryHex: number; secondaryHex: number }>
> = {
  blackbody: { primaryHex: 0xfbbf24, secondaryHex: 0x7dd3fc },
  eht230ghz: { primaryHex: 0xfbbf24, secondaryHex: 0x7dd3fc },
  xray: { primaryHex: 0x38bdf8, secondaryHex: 0xe0f2fe },
  doppler: { primaryHex: 0x60a5fa, secondaryHex: 0xf97316 },
};

/**
 * Maps `BlackHoleParams['spectralMode']` to its integer GLSL uniform value (`0..3`).
 */
export function mapSpectralModeToIndex(spectralMode: BlackHoleParams['spectralMode']): number {
  return SPECTRAL_MODE_INDEX_MAP[spectralMode] ?? 0;
}

/**
 * Computes proportional astrophysical cosmic visual scale (`targetScale`) from `BlackHoleParams`
 * and `ASTROPHYSICAL_PRESETS` / `PRESET_TRUE_MASS_SOLAR_MAP`.
 */
export function computePresetTargetScale(params: BlackHoleParams): number {
  let calculatedScale = 1.0;
  const isStar = isStellarCategory(params.objectCategory);
  if (isStar) {
    const activeStarPreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === params.presetId);
    calculatedScale =
      activeStarPreset?.visualScale ??
      (params.objectCategory === 'luminous_star' ? 1.05 : 0.45);
  } else {
    let trueMass = params.trueMassSolar;
    if (!trueMass) {
      trueMass =
        (params.presetId ? PRESET_TRUE_MASS_SOLAR_MAP[params.presetId] : undefined) ??
        params.massSolar;
    }
    const logM = Math.log10(Math.max(1, trueMass));
    const normLog = Math.max(0, Math.min(1.0, logM / 10.82));
    calculatedScale = 0.52 + Math.pow(normLog, 1.35) * 4.33;
  }

  const cosmicScaleBoost = params.trueCosmicScale ? 1.35 : 1.0;
  return Math.min(6.5, Math.max(0.4, calculatedScale * cosmicScaleBoost));
}

export interface PresetStarUniformAppearance {
  surfaceHexColor: number;
  coreBeamHexColor: number;
  sheathBeamHexColor: number;
  magneticDipoleHexColor: number;
  visualScale: number;
  compactnessRatio: number;
  hotspotIntensity: number;
}

/**
 * Maps a stellar/compact-remnant preset and `BlackHoleParams` into shader uniform colors and compactness.
 */
export function mapPresetStarAppearance(params: BlackHoleParams): PresetStarUniformAppearance {
  const activeStarPreset = ASTROPHYSICAL_PRESETS.find((p) => p.id === params.presetId);
  const isLuminous = params.objectCategory === 'luminous_star';
  const surfaceHexColor =
    activeStarPreset?.surfaceHexColor ?? (isLuminous ? 0x3b82f6 : 0x0ea5e9);
  const coreBeamHexColor = activeStarPreset?.coreBeamHexColor ?? 0xf0f9ff;
  const sheathBeamHexColor = activeStarPreset?.sheathBeamHexColor ?? 0x38bdf8;
  const magneticDipoleHexColor = activeStarPreset?.sheathBeamHexColor ?? 0x34d399;
  const visualScale = activeStarPreset?.visualScale ?? (isLuminous ? 1.05 : 0.45);
  const compactnessRatio =
    activeStarPreset?.compactnessRatio ??
    THREE.MathUtils.clamp(0.36 + (params.massSolar - 1.4) * 0.08, 0.12, 0.64);
  const hotspotIntensity =
    (isLuminous ? 0.85 : 1.25) + params.accretionRate * (isLuminous ? 0.5 : 0.65);

  return {
    surfaceHexColor,
    coreBeamHexColor,
    sheathBeamHexColor,
    magneticDipoleHexColor,
    visualScale,
    compactnessRatio,
    hotspotIntensity,
  };
}

export interface MappedKerrUniformValues {
  modeIndex: number;
  isStar: boolean;
  isStarVal: number;
  isClassicDisk: boolean;
  diskStyleVal: number;
  isActiveAccretion: boolean;
  accretionStateVal: number;
  isDepthPeeling: boolean;
  depthPeelingVal: number;
  isBinarySystem: boolean;
  binarySystemVal: number;
  lensingActiveVal: number;
  showDiskVal: number;
  dopplerCoeffs: [number, number, number, number];
  diskParams: [number, number, number, number];
}

/**
 * Stateless mapper from `BlackHoleParams` + `VisualizerSettings` to normalized Kerr shader uniform values.
 */
export function mapParamsToKerrUniformValues(
  params: BlackHoleParams,
  settings?: KerrUniformSettingsInput
): MappedKerrUniformValues {
  const modeIndex = mapSpectralModeToIndex(params.spectralMode);
  const isStar = isStellarCategory(params.objectCategory);
  const isStarVal = isStar ? 1.0 : 0.0;
  const isClassicDisk = (settings?.accretionDiskStyle ?? 'classic') !== 'raymarched';
  const diskStyleVal = isClassicDisk ? 0.0 : 1.0;
  const isActiveAccretion = (params.accretionState ?? 'quiescent') === 'active';
  const accretionStateVal = isActiveAccretion ? 1.0 : 0.0;
  const isDepthPeeling = Boolean(settings?.webglDepthPeeling ?? settings?.highPerformanceMode);
  const depthPeelingVal = isDepthPeeling ? 1.0 : 0.0;
  const isBinarySystem = !isStar && params.systemCategory === 'binary';
  const binarySystemVal = isBinarySystem ? 1.0 : 0.0;
  const lensingActiveVal = params.gravitationalLensing ? 1.0 : 0.0;
  const showDiskVal = params.layers.accretionDisk ? 1.0 : 0.0;

  const betaScale = isClassicDisk ? 0.7 : 0.48;
  const gammaClamp = 1.0;
  const dopplerExponent = isClassicDisk ? 2.2 : 1.25;

  return {
    modeIndex,
    isStar,
    isStarVal,
    isClassicDisk,
    diskStyleVal,
    isActiveAccretion,
    accretionStateVal,
    isDepthPeeling,
    depthPeelingVal,
    isBinarySystem,
    binarySystemVal,
    lensingActiveVal,
    showDiskVal,
    dopplerCoeffs: [params.dopplerStrength, betaScale, gammaClamp, dopplerExponent],
    diskParams: [params.spin, params.accretionRate, modeIndex, isStarVal],
  };
}

export interface CreateInitialKerrUniformsOptions {
  params: BlackHoleParams;
  settings?: KerrUniformSettingsInput;
  spectrumLut?: THREE.Texture | null;
  currentScale?: number;
  expansionProgress?: number;
  companionStarBaseRadius?: number;
  initialStepCount?: number;
}

/**
 * Creates the default uniform dictionary (`KerrLensingUniforms`) for the general relativistic
 * Kerr gravitational lensing & volumetric raymarching `ShaderMaterial`.
 */
export function createInitialKerrUniforms(
  options: CreateInitialKerrUniformsOptions
): KerrLensingUniforms {
  const {
    params,
    settings,
    spectrumLut = null,
    currentScale = 1.0,
    expansionProgress = 1.0,
    companionStarBaseRadius = 3.85,
    initialStepCount = 160.0,
  } = options;

  const mapped = mapParamsToKerrUniformValues(params, settings);

  return {
    uCameraPos: { value: new THREE.Vector3() },
    uBlackHolePos: { value: new THREE.Vector3() },
    uScale: { value: currentScale },
    uSpin: { value: params.spin },
    uAccretionRate: { value: params.accretionRate },
    uDopplerStrength: { value: params.dopplerStrength },
    uSpectralMode: { value: mapped.modeIndex },
    uSpectrumLut: { value: spectrumLut },
    uLensingActive: { value: mapped.lensingActiveVal },
    uShowDisk: { value: mapped.showDiskVal },
    uIsStar: { value: mapped.isStarVal },
    uPulseRadius: { value: 0 },
    uPulseStrength: { value: 0 },
    uTime: { value: 0 },
    uDiskStyle: { value: mapped.diskStyleVal },
    uBloomIntensity: { value: settings?.bloomIntensity ?? 1.0 },
    uAccretionState: { value: mapped.accretionStateVal },
    uExpansionProgress: { value: expansionProgress },
    uIsBinarySystem: { value: params.systemCategory === 'binary' ? 1.0 : 0.0 },
    uCompanionStarPos: { value: new THREE.Vector3(21.0, 0, 0) },
    uCompanionStarRadius: { value: companionStarBaseRadius },
    uDepthPeeling: { value: mapped.depthPeelingVal },
    u_isOrbiting: { value: 0.0 },
    u_stepCount: { value: initialStepCount },
  };
}

/**
 * Creates the default uniform dictionary (`AccretionDiskUniforms`) for the 3D equatorial
 * relativistic accretion disk `ShaderMaterial`.
 */
export function createInitialAccretionDiskUniforms(options: {
  params: BlackHoleParams;
  settings?: KerrUniformSettingsInput;
  spectrumLut?: THREE.Texture | null;
  expansionProgress?: number;
}): AccretionDiskUniforms {
  const { params, settings, spectrumLut = null, expansionProgress = 1.0 } = options;
  const mapped = mapParamsToKerrUniformValues(params, settings);

  return {
    uDopplerCoeffs: {
      value: new THREE.Vector4(params.dopplerStrength, 0.7, 1.0, 2.2),
    },
    uDiskParams: {
      value: new THREE.Vector4(params.spin, params.accretionRate, 0.0, mapped.isStarVal),
    },
    uTurbulenceBuffer: {
      value: new THREE.Vector4(0.0, 0.0, 0.0, params.timeScale),
    },
    uTurbulenceHarmonics: {
      value: new THREE.Vector4(1.8, 2.4, 0.5, 0.38),
    },
    uSpectrumLut: { value: spectrumLut },
    uPulseRadius: { value: 0 },
    uPulseStrength: { value: 0 },
    uDiskStyle: { value: mapped.diskStyleVal },
    uBloomIntensity: { value: settings?.bloomIntensity ?? 1.0 },
    uAccretionState: { value: mapped.accretionStateVal },
    uExpansionProgress: { value: expansionProgress },
    uDepthPeeling: { value: mapped.depthPeelingVal },
  };
}

/**
 * Creates the initial uniform dictionary for the compressed Singularity Seed core & halo shaders.
 */
export function createInitialSingularityUniforms(spectralModeIndex = 0) {
  return {
    uTime: { value: 0 },
    uOpacity: { value: 1.0 },
    uSpectralMode: { value: spectralModeIndex },
  };
}

/**
 * Creates the initial uniform dictionary for the camera-space optical lens flare shader.
 */
export function createInitialCameraLensFlareUniforms(
  width: number,
  height: number,
  flareIntensity = 1.0
) {
  return {
    uFlareIntensity: { value: flareIntensity },
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(width, height) },
    uSourceNdc: { value: new THREE.Vector3(0, 0, 1) },
    uHotspotNdc: { value: new THREE.Vector3(0.15, 0, 1) },
    uSecondaryNdc: { value: new THREE.Vector3(0, 0, 0) },
    uViewAngleParams: { value: new THREE.Vector4(0.8, 0.0, 0.0, 1.0) },
    uPrimaryTint: { value: new THREE.Color(0xfbbf24) },
    uSecondaryTint: { value: new THREE.Color(0x38bdf8) },
  };
}

/**
 * Creates the initial uniform dictionary for the hardware-instanced deep starfield shader.
 */
export function createInitialStarfieldUniforms() {
  return {
    uTime: { value: 0.0 },
    uCameraPos: { value: new THREE.Vector3() },
    uLookDir: { value: new THREE.Vector3(0, 0, -1) },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamUp: { value: new THREE.Vector3(0, 1, 0) },
    uLensingParams: { value: new THREE.Vector4(1.75, 8.5, 0.0, 0.0) },
    uStarFlags: { value: new THREE.Vector4(1.0, 0.0, 1.0, 0.0) },
  };
}
