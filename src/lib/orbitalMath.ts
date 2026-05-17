import type { PlanetDef } from "./types"; 

const MU_SUN = 1.3271244e20; // Sun's gravitational parameter (m^3/s^2)

export function getPlanetState(p: PlanetDef, elapsedSeconds: number) {
  // Edge Case Fix: Force cast everything to Numbers to prevent stringified CSV corruption
  const a = Number(p.a) || 0;
  const period = Number(p.period) || 0;
  const e = Number(p.e) || 0;
  const omega = Number(p.omega) || 0;
  const theta0 = Number(p.theta0) || 0;

  if (period === 0 || a === 0) return { x: 0, y: 0, vx: 0, vy: 0 };
  
  const n = (2 * Math.PI) / period;
  const M = (theta0 + (n * elapsedSeconds)) % (2 * Math.PI);

  let E = M;
  const iterations = e > 0.5 ? 12 : 5;
  for (let i = 0; i < iterations; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E));
  const x = r * Math.cos(nu + omega);
  const y = r * Math.sin(nu + omega);

  const eTerm = (1 - e * e);
  if (eTerm <= 0 || r === 0) return { x, y, vx: 0, vy: 0 };

  const h = Math.sqrt(MU_SUN * a * eTerm); // MU_SUN
  const vx = (x * h * e * Math.sin(nu)) / (r * a * eTerm) - (h * Math.sin(nu + omega)) / r;
  const vy = (y * h * e * Math.sin(nu)) / (r * a * eTerm) + (h * Math.cos(nu + omega)) / r;

  return { x, y, vx, vy };
}

export function solveTrajectory(p1: PlanetDef, p2: PlanetDef, day: number, accel: number, limitDV: number) {
  if (!p1 || !p2 || !accel || p1.name === p2.name) return null;
  
  const startSec = day * 86400;
  const s1 = getPlanetState(p1, startSec);
  const s2_now = getPlanetState(p2, startSec);
  
  let dist = Math.sqrt(Math.pow(s2_now.x - s1.x, 2) + Math.pow(s2_now.y - s1.y, 2));
  
  let tSec = 0;
  for (let i = 0; i < 8; i++) {
    tSec = 2 * Math.sqrt(dist / accel);
    const s2_f = getPlanetState(p2, startSec + tSec);
    dist = Math.sqrt(Math.pow(s2_f.x - s1.x, 2) + Math.pow(s2_f.y - s1.y, 2));
  }

  const s2_f = getPlanetState(p2, startSec + tSec);
  const relVel = Math.sqrt(Math.pow(s2_f.vx - s1.vx, 2) + Math.pow(s2_f.vy - s1.vy, 2));
  
  const minTotalT = tSec + (relVel / accel);
  const totalDV = (accel * minTotalT) / 1000;

  let realisticT = minTotalT;
  let vMax = accel * (tSec / 2); 
  let tAccel = tSec / 2;
  let tCoast = 0;
  let dAccel = accel * Math.pow(tAccel, 2) / 2;

  let actualTripDv = totalDV;
  
  if (limitDV > 0 && limitDV < totalDV) {
    // 1. We must reserve fuel for the final orbital rendezvous (parking) burn first!
    let transitDv = (limitDV * 1000) - relVel;
    
    // Safety clamp: If they don't even have enough fuel to park, force a minimal 10 m/s crawl
    if (transitDv < 10) transitDv = 10; 

    // 2. Distribute the remaining fuel to the acceleration and deceleration phases
    vMax = transitDv / 2;
    tAccel = vMax / accel;
    dAccel = 0.5 * accel * Math.pow(tAccel, 2);
    tCoast = (dist - (2 * dAccel)) / vMax;
    
    // Account for acceleration, coasting, and final rendezvous relative velocity matching
    realisticT = (2 * tAccel) + tCoast + (relVel / accel);
    
    // 3. OVERRIDE the infinite fuel budget with the actual constrained budget!
    actualTripDv = (transitDv + relVel) / 1000;
  } else {
    tAccel = tSec / 2;
    tCoast = 0;
    dAccel = dist / 2;
  }
  
  return { 
    realisticTime: realisticT / 86400, 
    minTotalTime: minTotalT / 86400, 
    maxDv: actualTripDv, // <--- EXPORT CORRECT DV
    telemetry: {
      startPos: { x: s1.x, y: s1.y },
      endPos: { x: s2_f.x, y: s2_f.y },
      dist: dist,
      accel: accel,
      vMax: vMax,
      tAccel: tAccel,
      tCoast: tCoast,
      sAccel: dAccel,
      totalT: realisticT,
      relVel: relVel,
      maxDv: actualTripDv // <--- EXPORT CORRECT DV TO THE TELEMETRY TRACKER
    }
  };
}

export function getTransitTelemetry(elapsedDays: number, telemetry: any) {
  if (!telemetry) return { fraction: 0, currentVelocityKM: 0, remainingDvKM: 0 };
  
  const t = elapsedDays * 86400;
  const m = telemetry;
  const totalDvNeeded = m.maxDv; 

  if (t <= 0) return { fraction: 0, currentVelocityKM: 0, remainingDvKM: totalDvNeeded };
  if (t >= m.totalT) return { fraction: 1, currentVelocityKM: 0, remainingDvKM: 0 };

  let d = 0;
  let currentVel = 0;
  let dvSpent = 0;

  if (t <= m.tAccel) {
    // Constant Acceleration Phase
    d = 0.5 * m.accel * t * t;
    currentVel = m.accel * t;
    dvSpent = currentVel;
  } else if (t <= m.tAccel + m.tCoast) {
    // Engine Cutoff Cruise Phase
    const tCoast = t - m.tAccel;
    d = m.sAccel + (m.vMax * tCoast);
    currentVel = m.vMax;
    dvSpent = m.vMax;
  } else {
    // Deceleration & Braking Ranging Phase
    const tDecel = t - (m.tAccel + m.tCoast);
    d = m.sAccel + (m.vMax * m.tCoast) + ((m.vMax * tDecel) - (0.5 * m.accel * tDecel * tDecel));
    currentVel = Math.max(0, m.vMax - (m.accel * tDecel));
    dvSpent = m.vMax + (m.vMax - currentVel);
  }

  const trueTotalDist = (2 * m.sAccel) + (m.vMax * m.tCoast);
  
  return {
    fraction: Math.max(0, Math.min(1, d / trueTotalDist)),
    currentVelocityKM: currentVel / 1000, // Normalized to km/s
    remainingDvKM: Math.max(0, totalDvNeeded - (dvSpent / 1000))
  };
}

// Shared real-world equatorial radii in km
export const REAL_RADII_KM: Record<string, number> = {
  'Sun': 696340,
  'Mercury': 2439,
  'Venus': 6051,
  'Earth': 6371,
  'Mars': 3389,
  'Belt (Ceres)': 473,
  'Jupiter': 69911,
  'Saturn': 58232,
  'Uranus': 25362,
  'Neptune': 24622,
  'Persephone': 1188 
};

// True planetary masses in kg for gravitational calculations
export const REAL_MASS_KG: Record<string, number> = {
  'Sun': 1.989e30,
  'Mercury': 3.301e23,
  'Venus': 4.867e24,
  'Earth': 5.972e24,
  'Mars': 6.417e23,
  'Belt (Ceres)': 9.393e20,
  'Jupiter': 1.898e27,
  'Saturn': 5.683e26,
  'Uranus': 8.681e25,
  'Neptune': 1.024e26,
  'Persephone': 1.3e22
};

/** Compresses true 1:1 planetary dimensions into readable UI radii */
function getBasePixelRadius(planetName: string): number {
  const realRadius = REAL_RADII_KM[planetName] || 5000;
  const ratio = realRadius / 6371; // Earth = 1.0
  return Math.pow(ratio, 0.35); // Smooth compression curve
}

/** Calculates final visual radius in pixels. Keeps the Sun bounded. */
export function getVisualRadius(planetName: string, zoom: number, scaleMultiplier: number): number {
  if (planetName === 'Sun') {
    // Keep the Sun at a clean, non-swallowing base size of 7px
    return Math.max(4, 7 * scaleMultiplier * zoom);
  }
  const earthBasePx = 3; 
  const radius = getBasePixelRadius(planetName) * earthBasePx * scaleMultiplier * zoom;
  return Math.max(1.5, radius); 
}

/** Calculates the true Sphere of Influence boundary */
export function getSoiRadius(planet: PlanetDef, zoom: number, scaleMultiplier: number): number {
  if (planet.name === 'Sun') return 0;
  
  const mPlanet = REAL_MASS_KG[planet.name] || 5.972e24;
  const mSun = REAL_MASS_KG['Sun'];
  
  // Physics formula: Laplace Sphere of Influence: r = a * (m / M)^(2/5)
  const soiRealMeters = Number(planet.a) * Math.pow(mPlanet / mSun, 0.4);
  const soiRealKm = soiRealMeters / 1000;
  
  // Apply the same UI compression curve used for planetary bodies so they scale visually
  const ratio = soiRealKm / 6371; // Scale relative to Earth's physical radius
  const compressedRatio = Math.pow(ratio, 0.35);
  
  const earthBasePx = 3;
  const rawSoiPx = compressedRatio * earthBasePx * scaleMultiplier * zoom;
  
  // Let the calculated values show, but maintain a minimum size slightly larger than visual radius
  return Math.max(6 * zoom, rawSoiPx);
}