import type { PoiDef, PlanetDef, MoonDef } from "./types";
import planetsData from "../data/planets.json";
import moonsData from "../data/moons.json";
import poisData from "../data/pois.json";

const planets = planetsData as PlanetDef[];
const moons = moonsData as MoonDef[];
const pois = poisData as PoiDef[];

// Universal standard gravitational constant
const G_CONSTANT = 6.6743e-11;

// COMPLETE SYSTEM MASS DICTIONARY (In KG)
// Used to dynamically scale orbital velocities based on true local parents
export const REAL_MASS_KG: Record<string, number> = {
  'Sun': 1.989e30,
  'Earth': 5.972e24,
  'Moon': 7.342e22,
  'Mars': 6.417e23,
  'Phobos': 1.066e16,
  'Deimos': 1.476e15,
  'Belt (Ceres)': 9.393e20,
  'Jupiter': 1.898e27,
  'Io': 8.932e22,
  'Europa': 4.8e22,
  'Ganymede': 1.481e23,
  'Callisto': 1.076e23,
  'Saturn': 5.683e26,
  'Titan': 1.345e23,
  'Iapetus': 1.806e21,
  'Persephone': 1.3e22
};

// ==========================================
// 1. DYNAMIC KEPLER SOLVER
// ==========================================
export function solveOrbit(a: number, e: number, omega: number, period: number, theta0: number, elapsedSeconds: number, parentBodyName: string) {
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

  // FIX 1: Dynamically look up local parent mass to avoid solar gravity corruption
  const parentMass = REAL_MASS_KG[parentBodyName] || REAL_MASS_KG['Sun'];
  const localMu = G_CONSTANT * parentMass;

  const h = Math.sqrt(localMu * a * eTerm); 
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

  // Planets orbit the Sun
  const local = solveOrbit(p.a, p.e, p.omega, p.period, p.theta0 || 0, elapsedSeconds, 'Sun');
  return { ...local, radius: p.radius };
}

export function getMoonState(moonId: string, elapsedSeconds: number) {
  const m = moons.find(m => m.id === moonId);
  if (!m) return { x: 0, y: 0, vx: 0, vy: 0, radius: 1500 };

  const parentState = getPlanetState(m.parentPlanet, elapsedSeconds);
  // Moons orbit their parent planets
  const local = solveOrbit(m.a, m.e, m.omega, m.period, 0, elapsedSeconds, m.parentPlanet);

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

  const parentPlanet = planets.find(p => p.name === poi.parentBody);
  if (parentPlanet) {
    const pState = getPlanetState(parentPlanet.name, elapsedSeconds);
    parentX = pState.x; parentY = pState.y; 
    parentVx = pState.vx; parentVy = pState.vy;
    parentRadius = pState.radius;
  } else {
    const parentMoon = moons.find(m => m.name === poi.parentBody);
    if (parentMoon) {
      const mState = getMoonState(parentMoon.id, elapsedSeconds);
      parentX = mState.x; parentY = mState.y; 
      parentVx = mState.vx; parentVy = mState.vy;
      parentRadius = mState.radius;
    }
  }

  let localA = poi.a;
  if (poi.type === "surface" || localA === 0) {
    localA = parentRadius * 1000; 
  }

  // POIs orbit their primary parentBody
  const local = solveOrbit(localA, poi.e, poi.omega, poi.period, 0, elapsedSeconds, poi.parentBody);
  
  return { 
    x: parentX + local.x, 
    y: parentY + local.y,
    vx: parentVx + local.vx,
    vy: parentVy + local.vy 
  };
}

// ==========================================
// 3. BRACHISTOCHRONE INTERCEPT ENGINE
// ==========================================
export function solveTrajectory(p1: PoiDef, p2: PoiDef, day: number, accel: number, limitDV: number) {
  if (!p1 || !p2 || !accel || p1.id === p2.id) return null;
  
  const startSec = day * 86400;
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
  
  let vMax = accel * (tSec / 2); 
  let tAccel = tSec / 2;
  let tCoast = 0;
  let dAccel = 0.5 * accel * Math.pow(tAccel, 2);
  
  // Total trip DV combines the baseline intercept push + the speed matching injection delta-v
  const totalDV = ((vMax * 2) + relVel) / 1000;
  let actualTripDv = totalDV;
  let realisticT = tSec;

  if (limitDV > 0 && limitDV < totalDV) {
    let transitDv = (limitDV * 1000) - relVel;
    if (transitDv < 10) transitDv = 10; 

    vMax = transitDv / 2;
    tAccel = vMax / accel;
    dAccel = 0.5 * accel * Math.pow(tAccel, 2);
    tCoast = (dist - (2 * dAccel)) / vMax;
    if (tCoast < 0) tCoast = 0;
    
    realisticT = (2 * tAccel) + tCoast;
    actualTripDv = limitDV;
  }

  return { 
    realisticTime: realisticT / 86400, 
    minTotalTime: tSec / 86400, 
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

  const totalFlightTime = (2 * m.tAccel) + m.tCoast;
  if (t <= 0) return { fraction: 0, currentVelocityKM: 0, remainingDvKM: m.maxDv };
  if (t >= totalFlightTime) return { fraction: 1, currentVelocityKM: 0, remainingDvKM: 0 };

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
    // FIX 2: Bounding tDecel ensures the kinematic calculation stops dead at the endpoint
    const boundedTDecel = Math.min(m.tAccel, tDecel);
    d = m.sAccel + (m.vMax * m.tCoast) + ((m.vMax * boundedTDecel) - (0.5 * m.accel * boundedTDecel * boundedTDecel));
    currentVel = Math.max(0, m.vMax - (m.accel * boundedTDecel));
    dvSpent = m.vMax + (m.accel * boundedTDecel);
  }

  const trueTotalDist = (2 * m.sAccel) + (m.vMax * m.tCoast);
  const fraction = Math.max(0, Math.min(1, d / trueTotalDist));
  
  // Linearly bleed down remaining matching budget along the profile
  const totalPropulsionDv = (m.vMax * 2) / 1000;
  const remainingPropulsionDv = Math.max(0, totalPropulsionDv - (dvSpent / 1000));
  const remainingMatchingDv = (m.relVel / 1000) * (1 - fraction);

  return {
    fraction,
    currentVelocityKM: currentVel / 1000, 
    remainingDvKM: remainingPropulsionDv + remainingMatchingDv
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