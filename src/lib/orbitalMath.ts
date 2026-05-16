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
  // Edge Case Fix: Prevent math panics if the target is the exact same as the origin
  if (!p1 || !p2 || !accel || p1.name === p2.name) return null;
  
  const startSec = day * 86400;
  const s1 = getPlanetState(p1, startSec);
  const s2_now = getPlanetState(p2, startSec);
  
  let dist = Math.sqrt(Math.pow(s2_now.x - s1.x, 2) + Math.pow(s2_now.y - s1.y, 2));
  
  let tSec = 0;
  // 8 Iterations of Newton-Raphson to find the intercept point
  for (let i = 0; i < 8; i++) {
    tSec = 2 * Math.sqrt(dist / accel);
    const s2_f = getPlanetState(p2, startSec + tSec);
    dist = Math.sqrt(Math.pow(s2_f.x - s1.x, 2) + Math.pow(s2_f.y - s1.y, 2));
  }

  const s2_f = getPlanetState(p2, startSec + tSec);
  const relVel = Math.sqrt(Math.pow(s2_f.vx - s1.vx, 2) + Math.pow(s2_f.vy - s1.vy, 2));
  
  // Total time if we have infinite fuel
  const minTotalT = tSec + (relVel / accel);
  const totalDV = (accel * minTotalT) / 1000;

  let realisticT = minTotalT;
  let vMax = accel * (tSec / 2); // Unbounded velocity
  let tAccel = tSec / 2;
  let tCoast = 0;
  let dAccel = accel * Math.pow(tAccel, 2) / 2;
  
  // Coasting logic if Delta-V is capped
  if (limitDV > 0 && limitDV < totalDV) {
    vMax = (limitDV * 1000) / 2;
    tAccel = vMax / accel;
    dAccel = 0.5 * accel * Math.pow(tAccel, 2);
    tCoast = (dist - (2 * dAccel)) / vMax;
    realisticT = (2 * tAccel) + tCoast + (relVel / accel);
  } else {
    // Unbounded burn (accelerate halfway, decelerate halfway)
    tAccel = tSec / 2;
    tCoast = 0;
    dAccel = dist / 2;
  }
  
  return { 
    realisticTime: realisticT / 86400, // Converted back to days
    minTotalTime: minTotalT / 86400, 
    maxDv: totalDV,
    // NEW: Full telemetry export for the canvas to draw the ship!
    telemetry: {
      startPos: { x: s1.x, y: s1.y },
      endPos: { x: s2_f.x, y: s2_f.y },
      dist: dist,
      accel: accel,
      vMax: vMax,
      tAccel: tAccel,
      tCoast: tCoast,
      sAccel: dAccel,
      totalT: realisticT
    }
  };
}
