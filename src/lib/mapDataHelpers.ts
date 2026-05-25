import { getPlanetState, getMoonState, getPoiState, getVisualRadius, getSoiRadius, getMoonSoiRadius } from './orbitalMath';
import type { PlanetDef, MoonDef, PoiDef } from './types';

export interface MappedPlanet {
  def: PlanetDef;
  x: number;
  y: number;
  visualRadius: number;
  soiRadius: number;
  orbit: {
    worldCx: number;
    worldCy: number;
    rx: number;
    ry: number;
    rot: number;
  };
}

export function mapPlanets(
  planets: PlanetDef[],
  elapsedSeconds: number,
  zoom: number,
  orbitScaleMultiplier: number,
  planetScaleMultiplier: number
): MappedPlanet[] {
  return planets.map(p => {
    const state = getPlanetState(p.name, elapsedSeconds);
    const currentScale = (250 / 1.5e12) * zoom * orbitScaleMultiplier;
    const b = p.a * Math.sqrt(1 - p.e * p.e);
    const focusDist = p.a * p.e;
    const visualRadius = getVisualRadius(p, zoom, planetScaleMultiplier);
    const soiRadius = getSoiRadius(p, zoom, planetScaleMultiplier);

    return {
      def: p,
      x: state.x * currentScale,
      y: -state.y * currentScale,
      visualRadius,
      soiRadius,
      orbit: {
        worldCx: -(focusDist * Math.cos(p.omega)) * currentScale,
        worldCy: (focusDist * Math.sin(p.omega)) * currentScale,
        rx: p.a * currentScale,
        ry: b * currentScale,
        rot: -p.omega * (180 / Math.PI)
      }
    };
  });
}

export interface MappedMoon {
  def: MoonDef;
  worldX: number;
  worldY: number;
  soiRadius: number;
  orbit: {
    worldCx: number;
    worldCy: number;
    rx: number;
    ry: number;
    rot: number;
    maxRadius: number;
  };
}

export function mapMoons(
  moons: MoonDef[],
  mappedPlanets: MappedPlanet[],
  elapsedSeconds: number,
  zoom: number,
  orbitScaleMultiplier: number
): MappedMoon[] {
  return moons.map(m => {
    const state = getMoonState(m.id, elapsedSeconds);
    const currentScale = (250 / 1.5e12) * zoom * orbitScaleMultiplier;
    const parentPlanet = mappedPlanets.find(p => p.def.name === m.parentPlanet);
    const b = m.a * Math.sqrt(1 - m.e * m.e);
    const focusDist = m.a * m.e;
    const soiRadius = getMoonSoiRadius(m, zoom, orbitScaleMultiplier);

    return {
      def: m,
      worldX: state.x * currentScale,
      worldY: -state.y * currentScale,
      soiRadius,
      orbit: {
        worldCx: (parentPlanet ? parentPlanet.x : 0) - (focusDist * Math.cos(m.omega)) * currentScale,
        worldCy: (parentPlanet ? parentPlanet.y : 0) + (focusDist * Math.sin(m.omega)) * currentScale,
        rx: m.a * currentScale,
        ry: b * currentScale,
        rot: -m.omega * (180 / Math.PI),
        maxRadius: m.a * currentScale
      }
    };
  });
}

export interface MappedPoi {
  def: PoiDef;
  worldX: number;
  worldY: number;
  orbit: {
    worldCx: number;
    worldCy: number;
    rx: number;
    ry: number;
    rot: number;
    maxRadius: number;
  };
}

export function mapPoiOrbits(
  pois: PoiDef[],
  mappedPlanets: MappedPlanet[],
  moons: MoonDef[],
  elapsedSeconds: number,
  zoom: number,
  orbitScaleMultiplier: number
): MappedPoi[] {
  return pois.map(poi => {
    const currentScale = (250 / 1.5e12) * zoom * orbitScaleMultiplier;
    const poiState = getPoiState(poi.id, elapsedSeconds);

    let parentX = 0, parentY = 0;
    const parentPlanet = mappedPlanets.find(p => p.def.name === poi.parentBody);

    if (parentPlanet) {
      parentX = parentPlanet.x;
      parentY = parentPlanet.y;
    } else {
      const parentMoon = moons.find(m => m.name === poi.parentBody);
      if (parentMoon) {
        const mState = getMoonState(parentMoon.id, elapsedSeconds);
        parentX = mState.x * currentScale;
        parentY = -mState.y * currentScale;
      }
    }

    const b = poi.a * Math.sqrt(1 - poi.e * poi.e);
    const focusDist = poi.a * poi.e;

    return {
      def: poi,
      worldX: poiState.x * currentScale,
      worldY: -poiState.y * currentScale,
      orbit: {
        worldCx: parentX - (focusDist * Math.cos(poi.omega)) * currentScale,
        worldCy: parentY + (focusDist * Math.sin(poi.omega)) * currentScale,
        rx: poi.a * currentScale,
        ry: b * currentScale,
        rot: -poi.omega * (180 / Math.PI),
        maxRadius: poi.a * currentScale
      }
    };
  });
}
