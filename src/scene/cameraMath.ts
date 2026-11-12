import * as THREE from 'three';

export interface CartesianCoords3D {
  x: number;
  y: number;
  z: number;
}

export interface ObserverSphericalCoords {
  rRs: number;
  thetaDeg: number;
  phiDeg: number;
}

export interface BoyerLindquistCoords {
  rRg: number;
  thetaRad: number;
  phiRad: number;
}

export interface ProjectedScreenPoint {
  screenX: number;
  screenY: number;
  isVisible: boolean;
  z: number;
  ndcX: number;
  ndcY: number;
}

/**
 * Converts spherical / Boyer-Lindquist observer coordinates `(r, thetaDeg, phiDeg)`
 * into Three.js Y-up Cartesian coordinates `(x, y, z)`:
 * - `x = offsetX + r * sin(theta) * cos(phi)`
 * - `y = offsetY + r * cos(theta)`
 * - `z = offsetZ + r * sin(theta) * sin(phi)`
 */
export function sphericalToCartesian(
  r: number,
  thetaDeg: number,
  phiDeg: number,
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0
): CartesianCoords3D {
  const thetaRad = THREE.MathUtils.degToRad(thetaDeg);
  const phiRad = THREE.MathUtils.degToRad(phiDeg);
  return sphericalRadToCartesian(r, thetaRad, phiRad, offsetX, offsetY, offsetZ);
}

/**
 * Converts spherical / Boyer-Lindquist observer coordinates `(r, thetaRad, phiRad)` in radians
 * into Three.js Y-up Cartesian coordinates `(x, y, z)`.
 */
export function sphericalRadToCartesian(
  r: number,
  thetaRad: number,
  phiRad: number,
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0
): CartesianCoords3D {
  const sinTheta = Math.sin(thetaRad);
  return {
    x: offsetX + r * sinTheta * Math.cos(phiRad),
    y: offsetY + r * Math.cos(thetaRad),
    z: offsetZ + r * sinTheta * Math.sin(phiRad),
  };
}

/**
 * Converts Three.js Y-up Cartesian camera and target positions into Boyer-Lindquist / spherical
 * observer readout coordinates `{ rRs, thetaDeg, phiDeg }`, where `1 R_s = 1.75` world units.
 */
export function cartesianToObserverSpherical(
  camPos: CartesianCoords3D,
  targetPos: CartesianCoords3D = { x: 0, y: 0, z: 0 },
  rsWorldUnit = 1.75
): ObserverSphericalCoords {
  const dx = camPos.x - targetPos.x;
  const dy = camPos.y - targetPos.y;
  const dz = camPos.z - targetPos.z;
  const dist = Math.max(0.001, Math.hypot(dx, dy, dz));
  const rRs = Math.max(0.55, dist / rsWorldUnit);
  const thetaDeg = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(dy / dist, -1, 1)));
  const phiDeg = ((THREE.MathUtils.radToDeg(Math.atan2(dz, dx)) % 360) + 360) % 360;
  return { rRs, thetaDeg, phiDeg };
}

/**
 * Exact oblate spheroidal Boyer-Lindquist `(r, θ, φ)` to Three.js Y-up Cartesian `(x, y, z)` conversion
 * for a Kerr spacetime with dimensionless spin `a*`:
 * - `x = √(r² + a²) sin(θ) cos(φ)`
 * - `y = r cos(θ)` (spin axis aligned with +Y)
 * - `z = √(r² + a²) sin(θ) sin(φ)`
 */
export function boyerLindquistToCartesian(
  rRg: number,
  thetaRad: number,
  phiRad: number,
  spinA = 0
): CartesianCoords3D & { rho: number } {
  const rho = Math.sqrt(Math.max(0, rRg * rRg + spinA * spinA));
  const sinTheta = Math.sin(thetaRad);
  return {
    x: rho * sinTheta * Math.cos(phiRad),
    y: rRg * Math.cos(thetaRad),
    z: rho * sinTheta * Math.sin(phiRad),
    rho,
  };
}

/**
 * Inverse Three.js Y-up Cartesian `(x, y, z)` to oblate Boyer-Lindquist `(r, θ, φ)` conversion
 * solving `r⁴ - (R² - a²) r² - a² y² = 0` where `R² = x² + y² + z²`.
 */
export function cartesianToBoyerLindquist(
  x: number,
  y: number,
  z: number,
  spinA = 0
): BoyerLindquistCoords {
  const rSqCart = x * x + y * y + z * z;
  const aSq = spinA * spinA;
  const diff = rSqCart - aSq;
  const disc = Math.sqrt(Math.max(0, diff * diff + 4.0 * aSq * y * y));
  const rRg = Math.sqrt(Math.max(0, 0.5 * (diff + disc)));
  const safeR = Math.max(1e-6, rRg);
  const thetaRad = Math.acos(THREE.MathUtils.clamp(y / safeR, -1.0, 1.0));
  const phiRad = ((Math.atan2(z, x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return { rRg, thetaRad, phiRad };
}

/**
 * Intersects a 3D ray with the equatorial accretion plane (`y = 0`) and returns
 * Boyer-Lindquist polar coordinates `{ rRs, phiDeg, redshiftZ }` for hover telemetry.
 */
export function intersectEquatorialPlanePolar(
  rayOrigin: CartesianCoords3D,
  rayDirection: CartesianCoords3D,
  currentScale: number,
  rsWorldUnit = 1.75
): { rRs: number; phiDeg: number; redshiftZ: number } | null {
  if (Math.abs(rayDirection.y) <= 0.001) return null;
  const t = -rayOrigin.y / rayDirection.y;
  if (t <= 0 || t >= 80) return null;

  const hitX = rayOrigin.x + rayDirection.x * t;
  const hitZ = rayOrigin.z + rayDirection.z * t;
  const rScene = Math.hypot(hitX, hitZ);
  const rRs = Math.max(0.5, rScene / (rsWorldUnit * currentScale));
  const phiDeg = ((Math.atan2(hitZ, hitX) * 180) / Math.PI + 360) % 360;
  const redshiftZ = rRs > 1.02 ? 1.0 / Math.sqrt(1.0 - 1.0 / rRs) - 1.0 : 99.99;
  return { rRs, phiDeg, redshiftZ };
}

/**
 * Converts pointer client coordinates `(clientX, clientY)` and canvas bounding rect
 * into Normalized Device Coordinates (NDC) in `[-1, 1]`.
 */
export function clientPointerToNdc(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  return {
    x: ((clientX - rect.left) / w) * 2 - 1,
    y: -((clientY - rect.top) / h) * 2 + 1,
  };
}

/**
 * Converts Normalized Device Coordinates `(ndcX, ndcY, ndcZ)` into 2D viewport screen pixels
 * `(screenX, screenY)` and computes a frustum/margin visibility flag.
 */
export function ndcToScreenCoords(
  ndcX: number,
  ndcY: number,
  ndcZ: number,
  width: number,
  height: number,
  marginPx = 0
): ProjectedScreenPoint {
  const screenX = (ndcX * 0.5 + 0.5) * width;
  const screenY = (-ndcY * 0.5 + 0.5) * height;
  const isVisible =
    ndcZ < 1.0 &&
    screenX > marginPx &&
    screenX < width - marginPx &&
    screenY > marginPx &&
    screenY < height - marginPx;
  return {
    screenX,
    screenY,
    isVisible,
    z: ndcZ,
    ndcX,
    ndcY,
  };
}

const _defaultScratchVec = new THREE.Vector3();

/**
 * Projects a 3D world-space position through `camera` into 2D screen pixel coordinates
 * `(screenX, screenY, isVisible, z)`. Uses an optional `scratchVec` to avoid GC allocations.
 */
export function projectWorldPointToScreen(
  worldPos: CartesianCoords3D,
  camera: THREE.Camera,
  width: number,
  height: number,
  marginPx = 0,
  scratchVec: THREE.Vector3 = _defaultScratchVec
): ProjectedScreenPoint {
  scratchVec.set(worldPos.x, worldPos.y, worldPos.z).project(camera);
  return ndcToScreenCoords(scratchVec.x, scratchVec.y, scratchVec.z, width, height, marginPx);
}

/**
 * Projects raw `(wx, wy, wz)` world coordinates into `{ x, y, z }` 2D canvas coordinates.
 */
export function projectWorldCoordsToScreen2D(
  wx: number,
  wy: number,
  wz: number,
  camera: THREE.Camera,
  width: number,
  height: number,
  scratchVec: THREE.Vector3 = _defaultScratchVec
): { x: number; y: number; z: number } {
  scratchVec.set(wx, wy, wz).project(camera);
  return {
    x: (scratchVec.x * 0.5 + 0.5) * width,
    y: (-scratchVec.y * 0.5 + 0.5) * height,
    z: scratchVec.z,
  };
}

/**
 * Computes the target camera position and look-at target for any named `preset`
 * (`'equatorial' | 'polar' | 'plunge_45' | 'grazing' | 'well'`).
 */
export function computeCameraPresetPose(
  preset: 'equatorial' | 'polar' | 'grazing' | 'star' | 'well' | 'plunge_45',
  targetScale: number,
  inclinationDeg: number,
  isBinary: boolean
): { position: CartesianCoords3D; target: CartesianCoords3D } | null {
  const distMultiplier = Math.max(0.72, Math.sqrt(targetScale));
  const incRad = THREE.MathUtils.degToRad(inclinationDeg);
  const lookX = isBinary ? 4.2 * distMultiplier : 0;

  switch (preset) {
    case 'equatorial': {
      const dist = (isBinary ? 32.5 : 26.5) * distMultiplier;
      return {
        position: {
          x: lookX,
          y: Math.cos(incRad) * dist,
          z: Math.sin(incRad) * dist,
        },
        target: { x: lookX, y: 0, z: 0 },
      };
    }
    case 'polar':
      return {
        position: {
          x: lookX,
          y: (isBinary ? 38.0 : 32.0) * distMultiplier,
          z: 1.5 * distMultiplier,
        },
        target: { x: lookX, y: 0, z: 0 },
      };
    case 'plunge_45': {
      const plungeR = (isBinary ? 19.5 : 14.2) * distMultiplier;
      return {
        position: sphericalToCartesian(plungeR, 45, 62, lookX, 0, 0),
        target: { x: lookX, y: 0, z: 0 },
      };
    }
    case 'grazing':
      return {
        position: {
          x: -9.5 * distMultiplier,
          y: 2.2 * distMultiplier,
          z: 16.5 * distMultiplier,
        },
        target: { x: 0, y: 0, z: 0 },
      };
    case 'well':
      return {
        position: {
          x: 24.0 * distMultiplier,
          y: -14.0 * distMultiplier,
          z: 28.0 * distMultiplier,
        },
        target: { x: lookX * 0.5, y: -10.0, z: 0 },
      };
    case 'star':
    default:
      return null;
  }
}

/**
 * Computes the observer spherical dolly target position when expanding from the Singularity Seed.
 */
export function computeSingularityExpansionCameraTarget(targetScale: number): CartesianCoords3D & {
  endR: number;
  endThetaRad: number;
  endPhiRad: number;
} {
  const endR = Math.max(28.875, 25.5 * Math.sqrt(targetScale));
  const endThetaRad = THREE.MathUtils.degToRad(71.0);
  const endPhiRad = THREE.MathUtils.degToRad(96.0);
  const pos = sphericalRadToCartesian(endR, endThetaRad, endPhiRad);
  return {
    ...pos,
    endR,
    endThetaRad,
    endPhiRad,
  };
}
