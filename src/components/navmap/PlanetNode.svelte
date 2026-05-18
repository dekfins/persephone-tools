<script lang="ts">
  import type { PlanetDef } from '../../lib/types';
  
  interface Props {
    planet: any; // Using your existing mapped planet object
    originPlanet: PlanetDef | null;
    targetPlanet: PlanetDef | null;
    zoom: number;
    onTarget: (def: PlanetDef) => void;
  }
  
  let { planet, originPlanet, targetPlanet, zoom, onTarget }: Props = $props();

  // 1. Decouple the SOI logic: Calculate if it's wider than the screen
  let isSoiCulled = $derived(planet.soiRadius > 1500);

  // 2. Decouple the Label logic: Culls at a higher zoom threshold than the SOI
  // It completely unmounts when the SOI would theoretically be 3000 pixels wide.
  let isLabelCulled = $derived(planet.soiRadius > 3000);
</script>

<g class="planet-node-group" transform="translate({planet.x}, {planet.y})">
  
  {#if !isSoiCulled}
    <circle 
      class="planet-soi" 
      r={planet.soiRadius} 
      style="pointer-events: none;" 
    />
  {/if}

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <circle 
    class="planet-body" 
    r={Math.max(2, planet.visualRadius)}
    fill={planet.def.color} onclick={(e) => {
      e.stopPropagation(); 
      onTarget(planet.def);
    }}
    style="cursor: pointer; pointer-events: auto;"
  />

  {#if !isLabelCulled}
    {@const labelOpacity = Math.max(0, 1 - (planet.soiRadius - 2000) / 1000)}
    <text 
      class="planet-label" 
      x={Math.max(2, planet.visualRadius) + 8} 
      y="4"
      fill-opacity={labelOpacity}
    >
      {planet.def.name}
    </text>
  {/if}
</g>

<style>
  .planet-soi {
    fill: rgba(6, 182, 212, 0.05); /* Very faint background */
    stroke: rgba(6, 182, 212, 0.2);
    stroke-width: 1px;
    /* Do NOT use hover states here, it kills the CPU on large radii */
  }
  .planet-body {
    transition: filter 0.2s;
  }
  .planet-body:hover {
    filter: brightness(1.5);
  }

  .planet-label {
    font-size: 0.8rem;
    fill: var(--text-main, #eee);
    font-family: var(--font-terminal, monospace);
    text-transform: uppercase;
    pointer-events: none; /* Allows clicks to pass through to the circle */
  }
</style>