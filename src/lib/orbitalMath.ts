import type { PoiDef, PlanetDef, MoonDef } from "./types";
import planetsData from "../data/planets.json";
import moonsData from "../data/moons.json";
import poisData from "../data/pois.json";

const planets = planetsData as PlanetDef[];
const moons = moonsData as MoonDef[];
const pois = poisData as PoiDef[];

export const REAL_MASS_KG: Record<string, number> = {
  'Sun': 1.989e30,
  'Earth': 5.972e24,
  'Mars': 6.417e23,
  'Belt (Ceres)': 9.393e20,
  'Jupiter': 1.898e27,
  'Saturn': 5.683e26,
  'Persephone': 1.3e22
};

const MU_SUN = 1.3271244e20; // Base gravitational scaling parameter

// ==========================================
// 1. GENERIC KEPLER SOLVER (The Math Core)
// ==========================================
export function solveOrbit(a: number, e: number, omega: number, period: number, theta0: number, elapsedSeconds: number) {
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

  const h = Math.sqrt(MU_SUN * a * eTerm); 
  const vx = (x * h * e * Math.sin(nu)) / (r * a * eTerm) - (h * Math.sin(nu + omega)) / r;
  const vy = (y * h * e * Math.sin(nu)) / (r * a * eTerm) + (h * Math.cos(nu + omega)) / r;

  return { x, y, vx, vy };
}

// ==========================================
// 2. SPECIFIC BODY RESOLVERS
// ==========================================

export function getPlanetState(planetName: string, elapsedSeconds: number) {
  const p = planets.find(p => p.name === planetName);
  if (!p) return { x: 0, y: 0, vx: 0, vy: 0, radius: 5000 };

  const local = solveOrbit(p.a, p.e, p.omega, p.period, p.theta0 || 0, elapsedSeconds);
  return { ...local, radius: p.radius };
}

export function getMoonState(moonId: string, elapsedSeconds: number) {
  const m = moons.find(m => m.id === moonId);
  if (!m) return { x: 0, y: 0, vx: 0, vy: 0, radius: 1500 };

  const parentState = getPlanetState(m.parentPlanet, elapsedSeconds);
  const local = solveOrbit(m.a, m.e, m.omega, m.period, 0, elapsedSeconds);

  return { 
    x: parentState.x + local.x, 
    y: parentState.y + local.y,
    vx: parentState.vx + local.vx,
    vy: parentState.vy + local.vy,
    radius: m.radius
  };
}

export function getPoiState(poiId: string, elapsedSeconds: number) {
  const poi = pois.find(p => p.id === poiId);
  if (!poi) return { x: 0, y: 0, vx: 0, vy: 0 };

  let parentX = 0, parentY = 0, parentVx = 0, parentVy = 0, parentRadius = 5000;

  // Check if parent is a Planet
  const parentPlanet = planets.find(p => p.name === poi.parentBody);
  if (parentPlanet) {
    const pState = getPlanetState(parentPlanet.name, elapsedSeconds);
    parentX = pState.x; parentY = pState.y; 
    parentVx = pState.vx; parentVy = pState.vy;
    parentRadius = pState.radius;
  } else {
    // Check if parent is a Moon
    const parentMoon = moons.find(m => m.name === poi.parentBody);
    if (parentMoon) {
      const mState = getMoonState(parentMoon.id, elapsedSeconds);
      parentX = mState.x; parentY = mState.y; 
      parentVx = mState.vx; parentVy = mState.vy;
      parentRadius = mState.radius;
    }
  }

  // Snap surfaces directly to their parent's physical crust
  let localA = poi.a;
  if (poi.type === "surface" || localA === 0) {
    localA = parentRadius * 1000; // Convert km to meters
  }

  const local = solveOrbit(localA, poi.e, poi.omega, poi.period, 0, elapsedSeconds);
  
  return { 
    x: parentX + local.x, 
    y: parentY + local.y,
    vx: parentVx + local.vx,
    vy: parentVy + local.vy 
  };
}

// ==========================================
// 3. TRANSIT & UI CALCULATIONS
// ==========================================

export function solveTrajectory(p1: PoiDef, p2: PoiDef, day: number, accel: number, limitDV: number) {
  if (!p1 || !p2 || !accel || p1.id === p2.id) return null;
  
  const startSec = day * 86400;
  // USE THE NEW POI RESOLVER
  const s1 = getPoiState(p1.id, startSec);
  const s2_now = getPoiState(p2.id, startSec);
  
  let dist = Math.sqrt(Math.pow(s2_now.x - s1.x, 2) + Math.pow(s2_now.y - s1.y, 2));
  
  let tSec = 0;
  for (let i = 0; i < 8; i++) {
    tSec = 2 * Math.sqrt(dist / accel);
    const s2_f = getPoiState(p2.id, startSec + tSec);
    dist = Math.sqrt(Math.pow(s2_f.x - s1.x, 2) + Math.pow(s2_f.y - s1.y, 2));
  }

  const s2_f = getPoiState(p2.id, startSec + tSec);
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
    let transitDv = (limitDV * 1000) - relVel;
    if (transitDv < 10) transitDv = 10; 

    vMax = transitDv / 2;
    tAccel = vMax / accel;
    dAccel = 0.5 * accel * Math.pow(tAccel, 2);
    tCoast = (dist - (2 * dAccel)) / vMax;
    realisticT = (2 * tAccel) + tCoast + (relVel / accel);
    actualTripDv = (transitDv + relVel) / 1000;
  } else {
    tAccel = tSec / 2;
    tCoast = 0;
    dAccel = dist / 2;
  }
  
  return { 
    realisticTime: realisticT / 86400, 
    minTotalTime: minTotalT / 86400, 
    maxDv: actualTripDv,
    telemetry: {
      startPos: { x: s1.x, y: s1.y }, endPos: { x: s2_f.x, y: s2_f.y },
      dist, accel, vMax, tAccel, tCoast, sAccel: dAccel, totalT: realisticT, relVel, maxDv: actualTripDv 
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

  let d = 0, currentVel = 0, dvSpent = 0;

  if (t <= m.tAccel) {
    d = 0.5 * m.accel * t * t;
    currentVel = m.accel * t;
    dvSpent = currentVel;
  } else if (t <= m.tAccel + m.tCoast) {
    const tCoast = t - m.tAccel;
    d = m.sAccel + (m.vMax * tCoast);
    currentVel = m.vMax;
    dvSpent = m.vMax;
  } else {
    const tDecel = t - (m.tAccel + m.tCoast);
    d = m.sAccel + (m.vMax * m.tCoast) + ((m.vMax * tDecel) - (0.5 * m.accel * tDecel * tDecel));
    currentVel = Math.max(0, m.vMax - (m.accel * tDecel));
    dvSpent = m.vMax + (m.vMax - currentVel);
  }

  const trueTotalDist = (2 * m.sAccel) + (m.vMax * m.tCoast);
  
  return {
    fraction: Math.max(0, Math.min(1, d / trueTotalDist)),
    currentVelocityKM: currentVel / 1000, 
    remainingDvKM: Math.max(0, totalDvNeeded - (dvSpent / 1000))
  };
}

export function getVisualRadius(body: { name: string, radius?: number }, zoom: number, scaleMultiplier: number = 1) {
  const physicalRadius = body.radius || 5000;
  let baseUiRadius = body.name === "Sun" ? 12 : (physicalRadius > 50000 ? 5 : 3);
  const truePixelRadius = physicalRadius * 1000 * (250 / 1.5e12) * zoom * scaleMultiplier;
  return Math.max(baseUiRadius, truePixelRadius);
}

export function getSoiRadius(planet: PlanetDef, zoom: number, scaleMultiplier: number): number {
  if (planet.name === 'Sun') return 0;
  const mPlanet = REAL_MASS_KG[planet.name] || 5.972e24;
  const mSun = REAL_MASS_KG['Sun'];
  const soiRealMeters = Number(planet.a) * Math.pow(mPlanet / mSun, 0.4);
  const rawSoiPx = soiRealMeters * (250 / 1.5e12) * zoom * scaleMultiplier;
  return Math.max(6, rawSoiPx);
}