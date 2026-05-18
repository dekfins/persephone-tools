<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
  import { getPlanetState, getMoonState, getPoiState, solveTrajectory, getVisualRadius, getSoiRadius } from '../../lib/orbitalMath';
  import type { PlanetDef, MoonDef, PoiDef } from '../../lib/types';
  
  import planetsData from '../../data/planets.json';
  import moonsData from '../../data/moons.json';
  import poisData from '../../data/pois.json';
  
  import PlanetNode from './PlanetNode.svelte';
  import TrajectoryOverlay from './TrajectoryOverlay.svelte';
  import PoiOverlay from './PoiOverlay.svelte';
  import ActiveTransitPanel from './ActiveTransitPanel.svelte';
  import TransitPlanningPanel from './TransitPlanningPanel.svelte'; 
  
  const planets = planetsData as PlanetDef[];
  const moons = moonsData as MoonDef[];
  const pois = poisData as PoiDef[];

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

  // --- ORIGIN & TARGET RESOLUTION ---
  let originPoi = $derived(pois.find(p => p.id === campaignState.shipLocation) || null);
  
  let originPlanet = $derived.by(() => {
    if (!originPoi) return null;
    const p = planets.find(pl => pl.name === originPoi.parentBody);
    if (p) return p;
    const m = moons.find(mo => mo.name === originPoi.parentBody);
    if (m) return planets.find(pl => pl.name === m.parentPlanet) || null;
    return null;
  });

  let targetPoiId = $state<string | null>(null);
  let targetPoi = $derived(targetPoiId ? (pois.find(p => p.id === targetPoiId) || null) : null);

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
  const RADIUS_CULL_MAX = 25000;

  // --- 1. PLANETARY LAYER ---
  let mappedPlanets = $derived(
    planets.map(p => {
      const state = getPlanetState(p.name, elapsedSeconds);
      const currentScale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier; 
      const b = p.a * Math.sqrt(1 - p.e * p.e);
      const focusDist = p.a * p.e;
      
      const visualRadius = getVisualRadius(p, zoom, campaignState.planetScaleMultiplier);
      const soiRadius = getSoiRadius(p, zoom, campaignState.planetScaleMultiplier);

      const cx = -(focusDist * Math.cos(p.omega)) * currentScale;
      const cy = (focusDist * Math.sin(p.omega)) * currentScale;
      const x = state.x * currentScale;
      const y = -state.y * currentScale;
      const rot = -p.omega * (180 / Math.PI);

      // Angle from ellipse center to planet, converted to CSS rotation, canceling out the ellipse's transform
      const dx = x - cx;
      const dy = y - cy;
      const maskAngle = (Math.atan2(dy, dx) * (180 / Math.PI)) + 90 - rot;

      return {
        def: p, x, y, visualRadius, soiRadius,
        orbit: { cx, cy, rx: p.a * currentScale, ry: b * currentScale, rot, maskAngle }
      };
    })
  );

  // --- 2. MOON LAYER (Screen Space) ---
  let mappedMoons = $derived(
    moons.map(m => {
      const state = getMoonState(m.id, elapsedSeconds);
      const currentScale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier;

      const parentPlanet = mappedPlanets.find(p => p.def.name === m.parentPlanet);
      const parentX = parentPlanet ? parentPlanet.x : 0;
      const parentY = parentPlanet ? parentPlanet.y : 0;

      const localX = state.x * currentScale;
      const localY = -state.y * currentScale;
      
      const b = m.a * Math.sqrt(1 - m.e * m.e);
      const focusDist = m.a * m.e;
      const rot = -m.omega * (180 / Math.PI);

      const screenCx = parentX - (focusDist * Math.cos(m.omega)) * currentScale + offsetX + (containerWidth / 2);
      const screenCy = parentY + (focusDist * Math.sin(m.omega)) * currentScale + offsetY + (containerHeight / 2);
      const screenX = localX + offsetX + (containerWidth / 2);
      const screenY = localY + offsetY + (containerHeight / 2);

      const dx = screenX - screenCx;
      const dy = screenY - screenCy;
      const maskAngle = (Math.atan2(dy, dx) * (180 / Math.PI)) + 90 - rot;

      return {
        def: m, screenX, screenY,
        orbit: { screenCx, screenCy, rx: m.a * currentScale, ry: b * currentScale, rot, maxRadius: m.a * currentScale, maskAngle }
      };
    })
  );

  // --- 3. POI ORBIT RINGS (Screen Space) ---
  let mappedPoiOrbits = $derived(
    pois.filter(p => p.a > 0).map(poi => {
      const state = getPoiState(poi.id, elapsedSeconds);
      const currentScale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier;

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
      const rot = -poi.omega * (180 / Math.PI);

      const screenCx = parentX - (focusDist * Math.cos(poi.omega)) * currentScale + offsetX + (containerWidth / 2);
      const screenCy = parentY + (focusDist * Math.sin(poi.omega)) * currentScale + offsetY + (containerHeight / 2);
      const screenX = state.x * currentScale + offsetX + (containerWidth / 2);
      const screenY = -state.y * currentScale + offsetY + (containerHeight / 2);

      const dx = screenX - screenCx;
      const dy = screenY - screenCy;
      const maskAngle = (Math.atan2(dy, dx) * (180 / Math.PI)) + 90 - rot;

      return {
        def: poi,
        orbit: { screenCx, screenCy, rx: poi.a * currentScale, ry: b * currentScale, rot, maxRadius: poi.a * currentScale, maskAngle }
      };
    })
  );

  let activeTrajectory = $derived.by(() => {
    if (!originPoi || !targetPoi || !shipState.engine) return null;
    const activeModeName = shipState.activeMode || shipState.engine.availableModes[0];
    const currentConfig = shipState.engine.configs.find(c => c.mode === activeModeName) || shipState.engine.configs[0]; 
    const accel = (Number(currentConfig?.twrG) || 0.05) * 9.81; 
    const maxTripDv = solveTrajectory(originPoi, targetPoi, campaignState.currentDay, accel, 0)?.maxDv || 0;
    const limitValue = useMaxFuelLimit ? (parseFloat(userCustomDv) || maxTripDv) : 0;
    return solveTrajectory(originPoi, targetPoi, campaignState.currentDay, accel, limitValue);
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
        {#if planet.def.a > 0 && planet.orbit.rx < 12000}
          {@const fadeOpacity = Math.max(0, 1 - ((planet.orbit.rx - 4000) / 6000))}
          <ellipse 
            cx={planet.orbit.cx} cy={planet.orbit.cy} rx={planet.orbit.rx} ry={planet.orbit.ry} 
            transform="rotate({planet.orbit.rot} {planet.orbit.cx} {planet.orbit.cy})"
            stroke={planet.def.color || '#ffffff'}
            class="orbit-line {planet.def.name === 'Persephone' ? 'orbit-anomaly' : ''}"
            style="
              stroke-opacity: {fadeOpacity};
              -webkit-mask-image: conic-gradient(from {planet.orbit.maskAngle}deg at 50% 50%, rgba(0,0,0,1) 0deg, rgba(0,0,0,0.5) 360deg);
              mask-image: conic-gradient(from {planet.orbit.maskAngle}deg at 50% 50%, rgba(0,0,0,1) 0deg, rgba(0,0,0,0.5) 360deg);
            "
          />
        {/if}
      {/each}

      <TrajectoryOverlay {planets} {originPoi} {targetPoi} {activeTrajectory} zoom={zoom} />

      {#each mappedPlanets as planet}
        <PlanetNode 
          {planet} 
          {originPlanet} 
          {targetPlanet} 
          zoom={zoom} 
          onTarget={(def) => {
            targetPlanet = def;
            // FIX: Auto-select the first POI on this planet to fire up the Transit Panel
            const firstPoi = pois.find(p => p.parentBody === def.name);
            targetPoiId = firstPoi ? firstPoi.id : null;
          }} 
        />
      {/each}
    </g>

    {#each mappedMoons as mMoon}
      {@const subFadeOpacity = Math.min(1, Math.max(0, (mMoon.orbit.maxRadius - 3) / 7))}
      
      {#if subFadeOpacity > 0 && mMoon.orbit.maxRadius < RADIUS_CULL_MAX}
        {@const maxFadeOpacity = Math.max(0, 1 - ((mMoon.orbit.maxRadius - 15000) / 10000))}
        {@const finalOpacity = Math.min(subFadeOpacity, maxFadeOpacity)}

        {#if finalOpacity > 0}
          <ellipse 
            cx={mMoon.orbit.screenCx} cy={mMoon.orbit.screenCy} 
            rx={mMoon.orbit.rx} ry={mMoon.orbit.ry}
            transform="rotate({mMoon.orbit.rot} {mMoon.orbit.screenCx} {mMoon.orbit.screenCy})"
            stroke={mMoon.def.color || '#cbd5e1'}
            class="orbit-line sub-orbit"
            style="
              stroke-opacity: {finalOpacity};
              -webkit-mask-image: conic-gradient(from {mMoon.orbit.maskAngle}deg at 50% 50%, rgba(0,0,0,1) 0deg, rgba(0,0,0,0.5) 360deg);
              mask-image: conic-gradient(from {mMoon.orbit.maskAngle}deg at 50% 50%, rgba(0,0,0,1) 0deg, rgba(0,0,0,0.5) 360deg);
            "
          />
        {/if}
      {/if}

      {@const currentScale = (250 / 1.5e12) * zoom * campaignState.orbitScaleMultiplier}
      {@const uiRadius = Math.min(15000, Math.max(4, mMoon.def.radius * 1000 * currentScale))}
      
      {#if subFadeOpacity > 0}
        <circle 
          cx={mMoon.screenX} cy={mMoon.screenY} r={uiRadius} 
          fill={mMoon.def.color || "#cbd5e1"} stroke="#000000" stroke-width="1.5px"
          opacity={subFadeOpacity}
          class="planet-body" 
          style="pointer-events: auto; cursor: pointer;"
          onclick={(e) => {
            e.stopPropagation();
            // FIX: Focus parent planet and select the first POI on this moon
            const parentPl = planets.find(p => p.name === mMoon.def.parentPlanet);
            if (parentPl) targetPlanet = parentPl;

            const firstPoi = pois.find(p => p.parentBody === mMoon.def.name);
            targetPoiId = firstPoi ? firstPoi.id : null;
          }}
        />
      {/if}
    {/each}

    {#each mappedPoiOrbits as mPoi}
      {@const subFadeOpacity = Math.min(1, Math.max(0, (mPoi.orbit.maxRadius - 3) / 7))}
      {#if subFadeOpacity > 0 && mPoi.orbit.maxRadius < RADIUS_CULL_MAX}
        {@const maxFadeOpacity = Math.max(0, 1 - ((mPoi.orbit.maxRadius - 15000) / 10000))}
        {@const finalOpacity = Math.min(subFadeOpacity, maxFadeOpacity)}

        {#if finalOpacity > 0}
          <ellipse 
            cx={mPoi.orbit.screenCx} cy={mPoi.orbit.screenCy} 
            rx={mPoi.orbit.rx} ry={mPoi.orbit.ry}
            transform="rotate({mPoi.orbit.rot} {mPoi.orbit.screenCx} {mPoi.orbit.screenCy})"
            stroke={mPoi.def.uiColor || '#06b6d4'}
            class="orbit-line sub-orbit"
            style="
              stroke-opacity: {finalOpacity};
              -webkit-mask-image: conic-gradient(from {mPoi.orbit.maskAngle}deg at 50% 50%, rgba(0,0,0,1) 0deg, rgba(0,0,0,0.5) 360deg);
              mask-image: conic-gradient(from {mPoi.orbit.maskAngle}deg at 50% 50%, rgba(0,0,0,1) 0deg, rgba(0,0,0,0.5) 360deg);
            "
          />
        {/if}
      {/if}
    {/each}
  </svg>

  <PoiOverlay 
    {zoom} 
    panX={offsetX + containerWidth / 2} 
    panY={offsetY + containerHeight / 2} 
    timelineSnapshot={elapsedSeconds} 
    {targetPlanet} 
    onPoiSelect={(poi) => {
      // Find the absolute root planet to focus the camera
      const parentPlanet = planets.find(p => p.name === poi.parentBody) || 
                           planets.find(p => p.name === moons.find(m => m.name === poi.parentBody)?.parentPlanet);
      if (parentPlanet) targetPlanet = parentPlanet;
      
      targetPoiId = poi.id;
      console.log("Selected destination:", poi.name);
    }}
  />

  <div class="hud-top-left">
    DATE: {campaignState.formattedDate}<br/>
    DAY: {Math.floor(campaignState.currentDay)}
  </div>

  <div class="floating-panel-wrapper">
    {#if campaignState.activeMission}
      <ActiveTransitPanel />
    {:else if activeTrajectory && originPoi && targetPoi}
      <TransitPlanningPanel 
        {originPoi} 
        {targetPoi} 
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
  background-color: #000000;
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
  stroke-width: 1.5px;
  pointer-events: none;
}
.sub-orbit {
  stroke-width: 1px;
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