import type { PlanetDef, MoonDef, PoiDef } from './types';
import { solveTrajectory } from './orbitalMath';

// The stores exported from Svelte files are store objects, not callables,
// so using ReturnType<typeof ...> is incorrect. Use broad any types here
// to avoid incorrect constraints; these are used only for shaping
// function params in this module.
type CampaignState = any;
type ShipState = any;

/**
 * Finds the top-level system planet for a given POI.
 * e.g., returns "Jupiter" for a station orbiting Callisto.
 * @param poiId The ID of the Point of Interest.
 * @param pois The array of all POI definitions.
 * @param moons The array of all moon definitions.
 * @param planets The array of all planet definitions.
 * @returns The name of the parent planet, or null if not found.
 */
export function getSystemPlanetName(poiId: string, pois: PoiDef[], moons: MoonDef[], planets: PlanetDef[]): string | null {
  const poi = pois.find(p => p.id === poiId);
  if (!poi) return null;

  // If the parent is a moon, find the moon's parent planet
  const moon = moons.find(m => m.name === poi.parentBody);
  if (moon) return moon.parentPlanet;

  // If the parent is a planet, return its name
  const planet = planets.find(p => p.name === poi.parentBody);
  if (planet) return planet.name;

  return null;
}

/**
 * Casts a Planet definition into a mathematical POI-like object.
 * This is used by the orbital solver for interplanetary transfers,
 * allowing it to calculate trajectories between true planetary orbits.
 * @param planetName The name of the planet to cast.
 * @param planets The array of all planet definitions.
 * @returns A POI-like object representing the planet, or null.
 */
export function getPlanetAsPoi(planetName: string | null, planets: PlanetDef[]): PoiDef | null {
  if (!planetName) return null;
  const p = planets.find(pl => pl.name === planetName);
  if (!p) return null;

  // The returned object must conform to the PoiDef structure for the solver
  return {
    id: p.name,
    name: p.name,
    parentBody: "Sun",
    // PoiDef.type expects values like "station" | "surface"; use "surface" for planet bodies
    type: "surface",
    a: p.a,
    e: p.e,
    omega: p.omega,
    period: p.period,
    uiColor: p.color,
    connections: []
  };
}

/**
 * Determines the common reference body for a transit.
 * For intra-system transfers (e.g., Io to Europa), it returns the parent planet ("Jupiter").
 * For interplanetary transfers, it returns null.
 * @returns The name of the common reference body, or null.
 */
export function calculateTransitRefBody(
  campaignState: CampaignState,
  originPoi: PoiDef | null,
  targetPoi: PoiDef | null,
  pois: PoiDef[],
  moons: MoonDef[],
  planets: PlanetDef[]
): string | null {
  let originId: string | null = null;
  let targetId: string | null = null;

  if (campaignState.activeMission) {
    originId = campaignState.activeMission.originName;
    targetId = campaignState.activeMission.targetName;
  } else if (originPoi && targetPoi) {
    originId = originPoi.id;
    targetId = targetPoi.id;
  }

  if (originId && targetId) {
    const p1 = getSystemPlanetName(originId, pois, moons, planets);
    const p2 = getSystemPlanetName(targetId, pois, moons, planets);
    if (p1 && p2 && p1 === p2) return p1;
  }

  return null;
}

/**
 * Calculates the active trajectory using the orbital solver.
 * It considers the origin, target, ship's engine, and any user-defined constraints.
 * @returns The calculated trajectory object, or null if inputs are invalid.
 */
export function calculateActiveTrajectory({ originPoi, targetPoi, shipState, campaignState, transitRefBody, useMaxFuelLimit, userCustomDv, pois, moons, planets }: { originPoi: PoiDef | null; targetPoi: PoiDef | null; shipState: ShipState; campaignState: CampaignState; transitRefBody: string | null; useMaxFuelLimit: boolean; userCustomDv: string; pois: PoiDef[]; moons: MoonDef[]; planets: PlanetDef[]; }) {
  if (!originPoi || !targetPoi || !shipState.blueprint.engine) return null;

  // Determine the ship's current engine configuration for acceleration
  const activeModeName = shipState.propulsion.activeMode || shipState.blueprint.engine.availableModes[0];
  const currentConfig = shipState.blueprint.engine.configs.find((c: any) => c.mode === activeModeName) || shipState.blueprint.engine.configs[0];
  const accel = (Number(currentConfig?.twrG) || 0.05) * 9.81;

  let solverOrigin: PoiDef | null = originPoi;
  let solverTarget: PoiDef | null = targetPoi;

  if (!transitRefBody) {
    const originPlanetName = getSystemPlanetName(originPoi.id, pois, moons, planets);
    const targetPlanetName = getSystemPlanetName(targetPoi.id, pois, moons, planets);
    solverOrigin = getPlanetAsPoi(originPlanetName, planets) || originPoi;
    solverTarget = getPlanetAsPoi(targetPlanetName, planets) || targetPoi;
  }

  const maxTripDv = solveTrajectory(solverOrigin, solverTarget, campaignState.currentDay, accel, 0)?.maxDv || 0;
  const limitValue = useMaxFuelLimit ? (parseFloat(userCustomDv) || maxTripDv) : shipState.propulsion.totalDV;
  return solveTrajectory(solverOrigin, solverTarget, campaignState.currentDay, accel, limitValue);
}