<script lang="ts">
  import planetsData from '../../data/planets.json';
  import moonsData from '../../data/moons.json';
  import poisData from '../../data/pois.json';
  import { getMoonState, getPoiState } from '../../lib/orbitalMath';
  import { campaignState } from '../../lib/campaignState.svelte';
  import type { PlanetDef, MoonDef, PoiDef } from '../../lib/types';

  interface Props {
    zoom: number;
    panX: number;
    panY: number;
    timelineSnapshot: number;
    targetPlanet?: PlanetDef | null;
    // Relaxed typing so we can pass both Moons and POIs as targets
    onPoiSelect?: (target: any) => void; 
  }
  
  let { zoom, panX, panY, timelineSnapshot, targetPlanet, onPoiSelect }: Props = $props();

  const planets = planetsData as PlanetDef[];
  const moons = moonsData as MoonDef[];
  const pois = poisData as PoiDef[];

  // UNIFIED LABEL RESOLVER
  // We calculate Moon labels and POI labels in one clean pass so Svelte can render them together
  let labelPositions = $derived.by(() => {
    const scale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier;
    const labels = [];

    // 1. Resolve Moon Labels
    for (const m of moons) {
      const state = getMoonState(m.id, timelineSnapshot);
      const screenX = panX + (state.x * scale);
      const screenY = panY + (-state.y * scale);
      const screenOrbitRadius = m.a * scale;
      const displayRadius = Math.max(4, m.radius * 1000 * scale);
      
      // Moons fade in exactly when their orbital line becomes visible (3px)
      if (screenOrbitRadius > 3) {
        labels.push({
          id: m.id, name: m.name, type: 'moon', color: m.color,
          screenX, screenY, displayRadius, original: m
        });
      }
    }

    // 2. Resolve POI Labels (Stations & Surfaces)
    for (const p of pois) {
      const state = getPoiState(p.id, timelineSnapshot);
      const screenX = panX + (state.x * scale);
      const screenY = panY + (-state.y * scale);
      
      let visibilityRadius = p.a * scale; // Default to orbit radius for stations
      
      if (p.type === "surface" || p.a === 0) {
        // Surfaces are visible based on the physical screen size of their parent body
        const parentMoon = moons.find(m => m.name === p.parentBody);
        if (parentMoon) {
          visibilityRadius = parentMoon.radius * 1000 * scale;
        } else {
          const parentPlanet = planets.find(pl => pl.name === p.parentBody);
          if (parentPlanet) visibilityRadius = (parentPlanet.radius || 5000) * 1000 * scale;
        }
      }

      // Slightly higher cull threshold (10px) so labels don't pop in while the parent is still dust
      if (visibilityRadius > 10) {
        labels.push({
          id: p.id, name: p.name, type: p.type, color: p.uiColor || 'var(--ui-cyan, #06b6d4)',
          screenX, screenY, displayRadius: 3, original: p
        });
      }
    }

    return labels;
  });
</script>

<div class="poi-overlay-wrapper">
  {#each labelPositions as item (item.id)}
    
    <div 
      class="poi-anchor" 
      style="transform: translate3d({item.screenX}px, {item.screenY}px, 0);"
    >
      
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      {#if item.type !== 'moon'}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="poi-dot"
          style="
            background-color: {item.color}; 
            box-shadow: 0 0 6px {item.color};
            pointer-events: auto; 
            cursor: pointer;
          "
          onclick={(e) => {
            e.stopPropagation();
            if (onPoiSelect) {
              // In this block, item.type is never 'moon', so item.original is always a PoiDef.
              onPoiSelect(item.original);
            }
          }}
        ></div>
      {/if}

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="poi-text-wrapper"
        style="
          transform: 
            translateX({item.type === 'moon' ? item.displayRadius + 8 : 12}px) 
            translateY({item.type === 'surface' ? '10px' : (item.type === 'station' ? '-22px' : '-50%')});
        "
        onclick={(e) => {
          e.stopPropagation();
          if (onPoiSelect) {
            if (item.type === 'moon') {
              const moon = item.original as MoonDef;
              // Create a synthetic object that has a `parentBody` property for consistency
              onPoiSelect({ ...moon, parentBody: moon.parentPlanet });
            } else {
              // PoiDef already has a parentBody, so we can pass it directly
              onPoiSelect(item.original);
            }
          }
        }}
      >
        <span class="poi-text">
          {item.name}
        </span>
      </div>

    </div>
  {/each}
</div>

<style>
  .poi-overlay-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 10;
  }
  
  .poi-anchor {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .poi-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transform: translate(-50%, -50%); /* Pulls the dot dead-center over the line */
  }

  .poi-text-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    pointer-events: auto;
    cursor: pointer;
  }

  .poi-text {
    color: #ffffff;
    font-size: 0.7rem;
    font-family: inherit;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 1px;
    pointer-events: none;
  }
</style>