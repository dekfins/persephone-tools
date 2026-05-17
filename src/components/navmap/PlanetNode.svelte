<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import type { PlanetDef } from '../../lib/types';

  let {
    planet,
    originPlanet,
    targetPlanet,
    zoom,
    onTarget
  }: {
    planet: any; // The mapped planet object containing x, y, visualRadius, etc.
    originPlanet: PlanetDef | null;
    targetPlanet: PlanetDef | null;
    zoom: number;
    onTarget: (def: PlanetDef | null) => void;
  } = $props();

  let isSun = $derived(planet.def.name === 'Sun');
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<g 
  transform="translate({planet.x}, {planet.y})" 
  class="planet-group"
  onclick={(e) => {
    e.stopPropagation();
    if (planet.def.name !== campaignState.shipLocation) onTarget(planet.def);
    else onTarget(null);
  }}
>
  {#if !isSun}
    <circle 
      cx={0} cy={0} 
      r={planet.soiRadius} 
      class="soi-ring {targetPlanet === planet.def ? 'soi-targeted' : ''}" 
    />
    <text x={planet.visualRadius + 6} y={4} class="planet-label">
      {planet.def.name.toUpperCase()}
    </text>
  {/if}

  {#if planet.def === originPlanet}
    <circle cx={0} cy={0} r={planet.visualRadius + 5} class="planet-origin-ring" />
  {:else if planet.def === targetPlanet}
    <circle cx={0} cy={0} r={planet.visualRadius + 5} class="planet-target-ring" />
  {/if}

  <circle cx={0} cy={0} r={planet.visualRadius} fill={isSun ? '#f59e0b' : planet.def.color} />

  {#if zoom > 1.8 && !isSun}
    {#if campaignState.shipLocation === planet.def.name && !campaignState.activeMission}
      <g class="player-parked-beacon">
        <circle cx={0} cy={0} r={planet.visualRadius + 4} class="beacon-pulse" />
        <polygon 
          points="5,0 -4,3 -4,-3" 
          transform="translate(0, -{planet.visualRadius + 6}) rotate(-90)" 
          class="player-ship" 
        />
      </g>
    {/if}
  {/if}
</g>

<style>
  .player-ship {
    fill: var(--ui-cyan, #06b6d4);
    stroke: #ffffff;
    stroke-width: 0.5px;
  }
  .planet-group {
    cursor: pointer;
  }
  .planet-label {
    fill: rgba(255, 255, 255, 0.7);
    font-size: 10px;
    font-family: var(--font-terminal, monospace);
    pointer-events: none;
  }
  .planet-origin-ring {
    fill: none;
    stroke: var(--ui-cyan, #06b6d4);
    stroke-width: 2px;
  }
  .planet-target-ring {
    fill: none;
    stroke: var(--accent-red, #ef4444);
    stroke-width: 2px;
  }

  .soi-ring {
    fill: rgba(6, 182, 212, 0.02);
    stroke: rgba(6, 182, 212, 0.15);
    stroke-width: 1px;
    stroke-dasharray: 3 3;
    transition: all 0.2s;
  }
  .planet-group:hover .soi-ring {
    fill: rgba(239, 68, 68, 0.08);
    stroke: var(--accent-red, #ef4444);
  }
  .soi-targeted {
    fill: rgba(239, 68, 68, 0.08);
    stroke: var(--accent-red, #ef4444);
  }

  .beacon-pulse {
    fill: none;
    stroke: var(--ui-cyan, #06b6d4);
    stroke-width: 1px;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% {
      r: 5px;
      opacity: 1;
    }
    100% {
      r: 25px;
      opacity: 0;
    }
  }
</style>