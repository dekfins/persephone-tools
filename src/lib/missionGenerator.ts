// src/lib/missionGenerator.ts
import { solveTrajectory } from './orbitalMath';
import type { PoiDef } from './types';
import type { GeneratedMission } from './types';
import missionsData from '../data/missions.json';
import poisData from '../data/celestial/pois.json';
import planetsData from '../data/celestial/planets.json';
import moonsData from '../data/celestial/moons.json';

const pois = poisData as PoiDef[];

// Helper to grab random items from arrays
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Emulates your Python get_random_loot logic
function getRandomLoot(difficulty: number): { rarity: string; item: string } {
  const roll = Math.floor(Math.random() * 100) + 1;
  let rarity = "common";

  if (roll + difficulty >= 105) rarity = "legendary";
  else if (roll + difficulty >= 95) rarity = "epic";
  else if (roll + (difficulty * 2) >= 75) rarity = "rare";
  else if (roll + (difficulty * 3) >= 50) rarity = "uncommon";

  const items = (missionsData as any).loot[rarity] || ["a handful of loose credits"];
  return { rarity, item: getRandomElement(items) };
}

// Emulates your Python get_location logic, but wired to your actual POIs
function getRandomTargetPoi(originPoiId: string): PoiDef | null {
  const validTargets = pois.filter(p => p.id !== originPoiId);
  if (validTargets.length === 0) return null;
  return getRandomElement(validTargets);
}

// Abstract planet resolver for the math solver (from your OrbitalMap fixes)
function getPlanetAsPoi(planetName: string | null): any {
  if (!planetName) return null;
  const p = (planetsData as any[]).find(pl => pl.name === planetName);
  if (!p) return null;
  return {
    id: p.name, name: p.name, parentBody: "Sun", type: "planet",
    a: p.a, e: p.e, omega: p.omega, theta0: p.theta0, period: p.period
  };
}

function getSystemPlanetName(poiId: string) {
  const poi = pois.find(p => p.id === poiId);
  if (!poi) return null;
  const moon = (moonsData as any[]).find(m => m.name === poi.parentBody);
  if (moon) return moon.parentPlanet;
  const planet = (planetsData as any[]).find(p => p.name === poi.parentBody);
  if (planet) return planet.name;
  return null;
}

export function generateJobBoard(
  originPoiId: string, 
  currentDay: number, 
  accel: number, 
  availableDv: number, 
  diffMin: number, 
  diffMax: number,
  count: number = 3
): GeneratedMission[] {
  const originPoi = pois.find(p => p.id === originPoiId);
  if (!originPoi) return [];

  const jobs: GeneratedMission[] = [];
  let attempts = 0;

  // Keep rolling until we find the requested amount of jobs or hit a safety limit
  while (jobs.length < count && attempts < 50) {
    attempts++;
    
    const targetPoi = getRandomTargetPoi(originPoiId);
    if (!targetPoi) continue;

    const difficulty = Math.floor(Math.random() * (diffMax - diffMin + 1)) + diffMin;

    // --- PHYSICS INTEGRATION ---
    // Safely abstract interplanetary targets just like we did for the Map UI
    const oPlanetName = getSystemPlanetName(originPoi.id);
    const tPlanetName = getSystemPlanetName(targetPoi.id);
    const isInterplanetary = oPlanetName !== tPlanetName;

    const solverOrigin = isInterplanetary ? (getPlanetAsPoi(oPlanetName) || originPoi) : originPoi;
    const solverTarget = isInterplanetary ? (getPlanetAsPoi(tPlanetName) || targetPoi) : targetPoi;

    // Calculate real trajectory constraints!
    const trajectory = solveTrajectory(solverOrigin, solverTarget, currentDay, accel, availableDv);
    
    // If we can't reach it physically, skip this generation
    if (!trajectory) continue;

    // --- PAYOUT CALCULATION ---
    // trajectory.telemetry.dist is in meters. 1 AU = 1.496e11 meters
    const distanceAu = trajectory.telemetry.dist / 1.496e11;
    const baseFee = 2000;
    const auRate = 1500;
    const hazardMult = 1.0 + (difficulty * 0.2);
    
    const rawCredits = (baseFee + (distanceAu * auRate)) * hazardMult;
    const variance = (Math.random() * 0.1) + 0.95; // 0.95 to 1.05
    const finalCredits = Math.floor(rawCredits * variance);

    let payoutString = `${finalCredits.toLocaleString()} CR`;
    let loot: { rarity: string, item: string } | undefined;

    // 50% chance for a loot drop
    if (Math.random() > 0.50) {
      loot = getRandomLoot(difficulty);
      payoutString += ` + ${loot.item}`;
    }

    jobs.push({
      id: crypto.randomUUID(),
      targetPoiId: targetPoi.id,
      originPoiId: originPoi.id,
      difficulty,
      client: getRandomElement((missionsData as any).clients),
      objective: getRandomElement((missionsData as any).objectives),
      adversary: getRandomElement((missionsData as any).adversaries),
      twist: getRandomElement((missionsData as any).complications),
      travelTimeDays: trajectory.realisticTime,
      reqDv: trajectory.maxDv,
      payoutString,
      payoutCredits: finalCredits,
      lootRarity: loot?.rarity,
      lootItem: loot?.item,
      telemetry: trajectory.telemetry
    });
  }

  return jobs;
}