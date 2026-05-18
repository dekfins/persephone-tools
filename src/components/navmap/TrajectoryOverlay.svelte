<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { getPoiState, getTransitTelemetry, getVisualRadius } from '../../lib/orbitalMath';
  import type { PlanetDef, PoiDef, MoonDef } from '../../lib/types';
  import poisData from '../../data/pois.json';
  import moonsData from '../../data/moons.json';

  const pois = poisData as PoiDef[];
  const moons = moonsData as MoonDef[];

  let {
    planets,
    originPoi,
    targetPoi,
    activeTrajectory,
    zoom
  }: {
    planets: PlanetDef[];
    originPoi: PoiDef | null;
    targetPoi: PoiDef | null;
    activeTrajectory: any;
    zoom: number;
  } = $props();

  // Helper to dynamically resolve the parent body (Planet or Moon) for visual offset scaling
  function getParentBody(parentName: string) {
    return planets.find(p => p.name === parentName) || 
           moons.find(m => m.name === parentName) || 
           { name: parentName, radius: 5000 };
  }
</script>

{#if originPoi && targetPoi && activeTrajectory && !campaignState.activeMission}
  {@const origState = getPoiState(originPoi.id, campaignState.currentDay * 86400)}
  {@const targetState = getPoiState(targetPoi.id, (campaignState.currentDay + activeTrajectory.realisticTime) * 86400)}
  
  {@const flightScale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier}
  
  {@const cx1 = origState.x * flightScale}
  {@const cy1 = -origState.y * flightScale}
  {@const cx2 = targetState.x * flightScale}
  {@const cy2 = -targetState.y * flightScale}

  {@const originR = getVisualRadius(getParentBody(originPoi.parentBody), zoom, campaignState.planetScaleMultiplier)}
  {@const targetR = getVisualRadius(getParentBody(targetPoi.parentBody), zoom, campaignState.planetScaleMultiplier)}

  {@const dx = cx2 - cx1}
  {@const dy = cy2 - cy1}
  {@const dist = Math.sqrt(dx * dx + dy * dy) || 1}
  {@const ux = dx / dist}
  {@const uy = dy / dist}

  {@const ox = cx1 + ux * (originR + 6)}
  {@const oy = cy1 + uy * (originR + 6)}
  {@const fx = cx2 - ux * (targetR + 6)}
  {@const fy = cy2 - uy * (targetR + 6)}

  <line x1={ox} y1={oy} x2={fx} y2={fy} class="trajectory-line" />
  
  <circle cx={cx2} cy={cy2} r={targetR + 5} class="target-future-ring" />

  {#if campaignState.isPreviewing}
    {@const flight = getTransitTelemetry(campaignState.previewElapsed, activeTrajectory.telemetry)}
    {@const shipX = ox + flight.fraction * (fx - ox)}
    {@const shipY = oy + flight.fraction * (fy - oy)}
    {@const angle = Math.atan2(fy - oy, fx - ox) * (180 / Math.PI)}
    
    <polygon points="8,0 -6,5 -6,-5" transform="translate({shipX}, {shipY}) rotate({angle})" class="player-ship" />
  {/if}
{/if}

{#if campaignState.activeMission}
  {@const m = campaignState.activeMission}
  {@const originDef = pois.find(p => p.id === m.originName)}
  {@const targetDef = pois.find(p => p.id === m.targetName)}
  
  {#if originDef && targetDef}
    {@const flightScale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier}
    
    {@const cx1 = getPoiState(originDef.id, m.launchDay * 86400).x * flightScale}
    {@const cy1 = -getPoiState(originDef.id, m.launchDay * 86400).y * flightScale}
    {@const cx2 = getPoiState(targetDef.id, (m.launchDay + m.travelTime) * 86400).x * flightScale}
    {@const cy2 = -getPoiState(targetDef.id, (m.launchDay + m.travelTime) * 86400).y * flightScale}

    {@const originR = getVisualRadius(getParentBody(originDef.parentBody), zoom, campaignState.planetScaleMultiplier)}
    {@const targetR = getVisualRadius(getParentBody(targetDef.parentBody), zoom, campaignState.planetScaleMultiplier)}

    {@const dx = cx2 - cx1}
    {@const dy = cy2 - cy1}
    {@const dist = Math.sqrt(dx * dx + dy * dy) || 1}
    {@const ux = dx / dist}
    {@const uy = dy / dist}

    {@const ox = cx1 + ux * (originR + 6)}
    {@const oy = cy1 + uy * (originR + 6)}
    {@const fx = cx2 - ux * (targetR + 6)}
    {@const fy = cy2 - uy * (targetR + 6)}

    <line x1={ox} y1={oy} x2={fx} y2={fy} class="trajectory-line-active" />

    {@const flight = getTransitTelemetry(campaignState.animatedDaysElapsed, m.telemetry)}
    {@const shipX = ox + flight.fraction * (fx - ox)}
    {@const shipY = oy + flight.fraction * (fy - oy)}
    {@const angle = Math.atan2(fy - oy, fx - ox) * (180 / Math.PI)}
    
    <polygon points="8,0 -6,5 -6,-5" transform="translate({shipX}, {shipY}) rotate({angle})" class="player-ship" />
  {/if}
{/if}

<style>
  .trajectory-line {
    stroke: var(--accent-red, #ef4444);
    stroke-width: 2.5px;
    stroke-dasharray: 4, 4;
    pointer-events: none;
  }
  .trajectory-line-active {
    stroke: var(--ui-cyan, #06b6d4);
    stroke-width: 1.5px;
    pointer-events: none;
  }
  .target-future-ring {
    stroke: var(--accent-red, #ef4444);
    stroke-width: 2px;
    fill: none;
    pointer-events: none;
  }
  .player-ship {
    fill: var(--ui-cyan, #06b6d4);
    stroke: #ffffff;
    stroke-width: 0.5px;
    pointer-events: none;
  }
</style>