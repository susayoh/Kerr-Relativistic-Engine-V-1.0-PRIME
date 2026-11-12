// Primary General Relativistic Raymarching, Gravitational Lensing & Accretion Disk Shaders

// 1. High-Fidelity 3D Relativistic Accretion Disk (Equatorial Ring & Volumetric Torus Shader)
export const ACCRETION_VERTEX_SHADER = `
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

export const ACCRETION_FRAGMENT_SHADER = `
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

// 2. Relativistic Gravitational Lensing & Kerr Raymarcher Shader
export const KERR_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const KERR_FRAGMENT_SHADER = `
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

export const LENSING_VERTEX_SHADER = KERR_VERTEX_SHADER;
export const LENSING_FRAGMENT_SHADER_BODY = KERR_FRAGMENT_SHADER;
