// Post-Processing, Bloom, Anamorphic Flare & Secondary Scene Shaders

// 1. High-Fidelity Volumetric Companion Star Shader (Fractional Brownian Motion Boiling Solar Surface + Coronal Fresnel Glow + Roche Lobe Overflow)
export const BINARY_STAR_VERTEX_SHADER = `
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

export const BINARY_STAR_FRAGMENT_SHADER = `
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

export const BINARY_CORONA_FRAGMENT_SHADER = `
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

// 2. Roche Lobe Overflow Accretion Stream Shader (Volumetric fBM Plasma Bridge siphoning from Companion Star to Accretion Disk)
export const ACCRETION_STREAM_VERTEX_SHADER = `
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

export const ACCRETION_STREAM_FRAGMENT_SHADER = `
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

// 3. Compact Quantum-Gravity Singularity Seed Ball Shader (Initial compressed state before expansion)
export const SINGULARITY_BALL_VERTEX_SHADER = `
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

export const SINGULARITY_BALL_FRAGMENT_SHADER = `
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

export const SINGULARITY_HALO_FRAGMENT_SHADER = `
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
export const MOTION_BLUR_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const MOTION_BLUR_FRAGMENT_SHADER = `
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
export const CAMERA_LENS_FLARE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const CAMERA_LENS_FLARE_FRAGMENT_SHADER = `
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

// 6. High-Definition Relativistic Supersonic Boom N-Wave Shock Ring & Prandtl-Glauert Vapor Shell Shaders
export const PULSE_RING_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const PULSE_RING_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  float shockTurb2D(vec2 p) {
    return (sin(p.x * 1.45 + cos(p.y * 1.75)) + cos(p.y * 1.95 - sin(p.x * 1.55))) * 0.25 + 0.5;
  }

  float fbmShock(vec2 p) {
    float v = 0.52 * shockTurb2D(p);
    p = vec2(p.x * 1.68 - p.y * 1.22, p.x * 1.22 + p.y * 1.68) + vec2(1.9, 3.3);
    v += 0.30 * shockTurb2D(p);
    p = vec2(p.x * 1.74 + p.y * 1.15, -p.x * 1.15 + p.y * 1.74) + vec2(4.2, 1.7);
    v += 0.18 * shockTurb2D(p);
    return clamp(v, 0.0, 1.0);
  }

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float radial = length(centered);
    // Smooth radial boundary feathering to eliminate any polygon ring edge clipping
    float innerFeather = smoothstep(0.60, 0.72, radial);
    float outerFeather = 1.0 - smoothstep(0.94, 0.995, radial);
    float ringEnvelope = innerFeather * outerFeather;
    if (ringEnvelope <= 0.001 || uOpacity <= 0.001) discard;

    // Continuous azimuthal unit vector & subtle organic vapor perturbation (zero angular seam)
    vec2 dir = centered / max(0.0001, radial);
    float cos2Phi = dir.x * dir.x - dir.y * dir.y;
    float sin2Phi = 2.0 * dir.x * dir.y;

    float fbmFine = fbmShock(centered * 6.5 + vec2(cos2Phi * 1.2, sin2Phi * 1.2));
    float angularPerturb = (fbmFine - 0.5) * 0.014;

    // Signed offset relative to the single outer Mach shock front at radial = 0.875
    float delta = (radial + angularPerturb) - 0.875;

    // Single razor-sharp leading Relativistic Mach Shock Front + smooth Prandtl-Glauert vapor wake
    float leadNeedle = exp(-pow(abs(delta * 48.0), 2.0));
    float vaporWake = exp(-pow(abs((delta + 0.045) * 16.0), 2.0)) * (0.72 + 0.28 * fbmFine);

    vec3 coreWhiteHot = vec3(1.0, 0.99, 0.96);
    vec3 goldIonized  = mix(uColor, vec3(1.0, 0.86, 0.58), 0.58);

    vec3 shockRgb =
      coreWhiteHot * (leadNeedle * 1.35) +
      goldIonized * (vaporWake * 0.95);

    float totalIntensity = clamp(leadNeedle * 1.05 + vaporWake * 0.58, 0.0, 1.0);

    float alpha = totalIntensity * ringEnvelope * uOpacity;
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(shockRgb, alpha);
  }
`;

export const PULSE_SHELL_VERTEX_SHADER = `
  varying vec3 vNormalVec;
  varying vec3 vPos;
  void main() {
    vNormalVec = normalize(normalMatrix * normal);
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const PULSE_SHELL_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vNormalVec;
  varying vec3 vPos;

  float shellGyroid(vec3 p) {
    return dot(sin(p), cos(p.yzx)) * 0.3333 + 0.5;
  }

  void main() {
    if (uOpacity <= 0.001) discard;
    vec3 dir = normalize(vPos);
    float equatorialFocus = pow(max(0.0001, 1.0 - abs(dir.y) * 0.72), 1.35);

    vec3 p = dir * 5.5 + vec3(uTime * 0.35, -uTime * 0.25, uTime * 0.2);
    float n1 = shellGyroid(p);
    float causticWeb = pow(clamp(1.0 - abs(n1 - 0.5) * 3.0, 0.0, 1.0), 2.0);

    // Single grazing-angle Fresnel Mach condensation rim
    float viewCos = abs(vNormalVec.z);
    float outerMachRim = exp(-pow(abs(viewCos * 6.2), 2.0));
    float filamentVeil = pow(clamp(1.0 - viewCos, 0.0, 1.0), 2.8) * causticWeb * 0.32;

    vec3 primaryRim = mix(uColor, vec3(1.0, 0.93, 0.78), 0.6) * 1.18;
    vec3 rgb = primaryRim * (outerMachRim + filamentVeil);

    float alpha = clamp((outerMachRim * 0.65 + filamentVeil * 0.35) * equatorialFocus * uOpacity, 0.0, 0.85);
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(rgb, alpha);
  }
`;

// 7. Rapid Parameter Adjustment Quasinormal Ripple Shaders
export const PARAMETER_RIPPLE_RING_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const PARAMETER_RIPPLE_RING_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    float radial = length(vUv - 0.5) * 2.0;
    float edgeFeather = smoothstep(0.62, 0.72, radial) * (1.0 - smoothstep(0.95, 1.0, radial));
    float delta = radial - 0.88;
    // Single clean leading wave crest
    float crest = exp(-pow(abs(delta * 30.0), 2.0));
    float softWake = exp(-pow(abs((delta + 0.06) * 14.0), 2.0)) * 0.35;
    float wave = crest + softWake;
    vec3 crestTone = mix(uColor, vec3(1.0, 1.0, 1.0), crest * 0.72);
    float alpha = clamp(wave * edgeFeather, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(crestTone, alpha);
  }
`;

export const PARAMETER_RIPPLE_SHELL_VERTEX_SHADER = `
  varying vec3 vNormalVec;
  void main() {
    vNormalVec = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const PARAMETER_RIPPLE_SHELL_FRAGMENT_SHADER = `
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
`;

// 8. Accretion State & Threshold Burst Shockwave Shaders
export const ACCRETION_SHOCK_RING_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ACCRETION_SHOCK_RING_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uProgress;
  varying vec2 vUv;

  float shockNoise(vec2 p) {
    return (sin(p.x * 1.5 + cos(p.y * 1.8)) + cos(p.y * 2.0 - sin(p.x * 1.6))) * 0.25 + 0.5;
  }

  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    float radial = length(centered);
    float edgeMask = smoothstep(0.60, 0.70, radial) * (1.0 - smoothstep(0.95, 1.0, radial));
    if (edgeMask <= 0.001 || uOpacity <= 0.001) discard;

    vec2 dir = centered / max(0.0001, radial);
    float n1 = shockNoise(centered * 7.5 + dir * (uProgress * 4.0));
    float delta = (radial + (n1 - 0.5) * 0.014) - 0.885;

    // Single crisp ionizing shock front + soft thermal glow wake
    float leadShock = exp(-pow(abs(delta * 44.0), 2.0));
    float trailingMist = exp(-pow(abs((delta + 0.055) * 15.0), 2.0)) * 0.48 * (0.7 + 0.3 * n1);

    float shockProfile = leadShock * 1.12 + trailingMist;
    vec3 coreColor = vec3(1.0, 0.99, 0.94);
    vec3 blastColor = mix(uColor, coreColor, clamp(leadShock * 0.88, 0.0, 1.0)) * 1.18;
    float alpha = clamp(shockProfile * edgeMask, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(blastColor, alpha);
  }
`;

export const ACCRETION_SHOCK_SHELL_VERTEX_SHADER = `
  varying vec3 vNormalVec;
  varying vec3 vPos;
  void main() {
    vNormalVec = normalize(normalMatrix * normal);
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ACCRETION_SHOCK_SHELL_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormalVec;
  varying vec3 vPos;
  void main() {
    float viewCos = abs(vNormalVec.z);
    float rim = exp(-pow(abs(viewCos * 5.8), 2.0));
    float poleFade = clamp(1.0 - abs(vPos.y) * 0.35, 0.0, 1.0);
    vec3 rgb = mix(uColor, vec3(1.0, 0.96, 0.88), clamp(rim * 0.75, 0.0, 1.0));
    float alpha = rim * 0.62 * uOpacity * poleFade;
    gl_FragColor = vec4(rgb, alpha);
  }
`;

export const ACCRETION_HORIZON_FLASH_VERTEX_SHADER = `
  varying vec3 vNormalVec;
  void main() {
    vNormalVec = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ACCRETION_HORIZON_FLASH_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormalVec;
  void main() {
    float rim = 0.5 + 0.5 * abs(vNormalVec.z);
    gl_FragColor = vec4(uColor, rim * uOpacity);
  }
`;

// 9. Background Starfield Gravitational Lensing & Parallax Shaders
export const STARFIELD_VERTEX_SHADER = /* glsl */ `
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
`;

export const STARFIELD_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vStarColor;
  varying vec2 vUv;
  void main() {
    vec2 d = vUv - vec2(0.5);
    if (dot(d, d) > 0.25) discard;
    gl_FragColor = vec4(vStarColor, 1.0);
  }
`;
