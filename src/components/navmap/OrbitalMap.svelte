<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
  import { getPlanetState, solveTrajectory, getVisualRadius, getSoiRadius } from '../../lib/orbitalMath';
  import type { PlanetDef } from '../../lib/types'; 
  import planetsData from '../../data/planets.json';
  import PlanetNode from './PlanetNode.svelte';
  import TrajectoryOverlay from './TrajectoryOverlay.svelte';
  import ActiveTransitPanel from './ActiveTransitPanel.svelte';
  import TransitPlanningPanel from './TransitPlanningPanel.svelte'; 
  
  const planets = planetsData as PlanetDef[];

  // --- VIEWPORT CONFIGURATION ---
  let zoom = $state(1.0);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let isDragging = $state(false);
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  let targetPlanet = $state<PlanetDef | null>(null);
  let useMaxFuelLimit = $state(false); 
  let userCustomDv = $state<string>(""); 

  let originPlanet = $derived(planets.find(p => p.name === campaignState.shipLocation) || null);

  let lastFrameTime = $state(performance.now());
  $effect(() => {
    let animationFrameId: number;
    function loop(ts: number) {
      let dt = (ts - lastFrameTime) / 1000;
      if (dt > 0.1) dt = 0.1; 
      lastFrameTime = ts;

      if (campaignState.isPreviewing) {
        campaignState.previewElapsed += (dt * 4); 
        if (campaignState.previewElapsed >= campaignState.previewTravelTime) {
          campaignState.isPreviewing = false; 
        }
      }
      campaignState.updateAnimationEasing(dt);
      animationFrameId = requestAnimationFrame(loop);
    }
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  });

  let displayDay = $derived(
    campaignState.activeMission 
      ? campaignState.activeMission.launchDay + campaignState.animatedDaysElapsed
      : campaignState.currentDay + (campaignState.isPreviewing ? campaignState.previewElapsed : 0)
  );
  let elapsedSeconds = $derived(displayDay * 86400);

  // WIRED TO NEW LIBRARY SCALE MATRIX WITH SPACE MULTIPLIERS
  let mappedPlanets = $derived(
    planets.map(p => {
      const state = getPlanetState(p, elapsedSeconds);
      const currentScale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier; 
      const b = p.a * Math.sqrt(1 - p.e * p.e);
      const focusDist = p.a * p.e;
      
      const visualRadius = getVisualRadius(p.name, zoom, campaignState.planetScaleMultiplier);
      const soiRadius = getSoiRadius(p, zoom, campaignState.planetScaleMultiplier);

      return {
        def: p, x: state.x * currentScale, y: -state.y * currentScale, visualRadius, soiRadius,
        orbit: {
          cx: -(focusDist * Math.cos(p.omega)) * currentScale, cy: (focusDist * Math.sin(p.omega)) * currentScale,
          rx: p.a * currentScale, ry: b * currentScale, rot: -p.omega * (180 / Math.PI)
        }
      };
    })
  );

  let activeTrajectory = $derived.by(() => {
    if (!originPlanet || !targetPlanet || !shipState.engine) return null;
    const activeModeName = shipState.activeMode || shipState.engine.availableModes[0];
    const currentConfig = shipState.engine.configs.find(c => c.mode === activeModeName) || shipState.engine.configs[0]; 
    const accel = (Number(currentConfig?.twrG) || 0.05) * 9.81; 
    const maxTripDv = solveTrajectory(originPlanet, targetPlanet, campaignState.currentDay, accel, 0)?.maxDv || 0;
    const limitValue = useMaxFuelLimit ? (parseFloat(userCustomDv) || maxTripDv) : 0;
    return solveTrajectory(originPlanet, targetPlanet, campaignState.currentDay, accel, limitValue);
  });

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    offsetX = (e.clientX - containerWidth / 2) - ((e.clientX - containerWidth / 2) - offsetX) * factor;
    offsetY = (e.clientY - containerHeight / 2) - ((e.clientY - containerHeight / 2) - offsetY) * factor;
    zoom *= factor;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="navmap-container"
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  onmousedown={() => isDragging = true}
  onmouseup={() => isDragging = false}
  onmouseleave={() => isDragging = false}
  onmousemove={(e) => { if (isDragging) { offsetX += e.movementX; offsetY += e.movementY; } }}
  onwheel={handleWheel}
  oncontextmenu={(e) => e.preventDefault()}
  onclick={(e) => { if (e.target === e.currentTarget || (e.target as Element).tagName === 'svg') targetPlanet = null; }}
>
  <svg class="navmap-svg">
    <g transform="translate({offsetX + containerWidth / 2}, {offsetY + containerHeight / 2})">
      {#each mappedPlanets as planet}
        {#if planet.def.a > 0}
          <ellipse 
            cx={planet.orbit.cx} cy={planet.orbit.cy} rx={planet.orbit.rx} ry={planet.orbit.ry} 
            transform="rotate({planet.orbit.rot} {planet.orbit.cx} {planet.orbit.cy})"
            class="orbit-line {planet.def.name === 'Persephone' ? 'orbit-anomaly' : ''}"
          />
        {/if}
      {/each}

      <TrajectoryOverlay {planets} {originPlanet} {targetPlanet} {activeTrajectory} zoom={zoom} />

      {#each mappedPlanets as planet}
        <PlanetNode {planet} {originPlanet} {targetPlanet} zoom={zoom} onTarget={(def) => targetPlanet = def} />
      {/each}
    </g>
  </svg>

  <div class="hud-top-left">
    DATE: {campaignState.formattedDate}<br/>
    DAY: {Math.floor(campaignState.currentDay)}
  </div>

  <div class="floating-panel-wrapper">
    {#if campaignState.activeMission}
      <ActiveTransitPanel />
    {:else if activeTrajectory && originPlanet && targetPlanet}
      <TransitPlanningPanel 
        {originPlanet} 
        {targetPlanet} 
        {activeTrajectory} 
        bind:useMaxFuelLimit 
        bind:userCustomDv 
        onConfirmLaunch={() => { targetPlanet = null; }} 
      />
    {/if}
  </div>
</div>

<style>
.navmap-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
  background-color: #0b0e14;
  overflow: hidden;
  cursor: grab;
}
.navmap-container:active {
  cursor: grabbing;
}
.navmap-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.orbit-line {
  fill: none;
  stroke: rgba(26, 42, 58, 0.8);
  stroke-width: 2px;
}
.hud-top-left {
  position: absolute;
  top: 100px;
  left: 20px;
  color: var(--ui-cyan, #06b6d4);
  font-family: var(--font-terminal, monospace);
  pointer-events: none;
}
.floating-panel-wrapper {
  position: absolute;
  top: 100px;
  right: 20px;
  width: 300px;
  z-index: 100;
}
</style>