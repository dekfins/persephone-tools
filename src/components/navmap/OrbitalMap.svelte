<script lang="ts">
  import { onMount } from 'svelte';
  import { Application, Container, Graphics, Text } from 'pixi.js';
  
  import { campaignState } from '../../lib/campaignState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
  import { solveTrajectory, getPoiState } from '../../lib/orbitalMath';
  import type { PlanetDef, MoonDef, PoiDef } from '../../lib/types';
  
  import planetsData from '../../data/planets.json';
  import moonsData from '../../data/moons.json';
  import poisData from '../../data/pois.json';

  import ActiveTransitPanel from './ActiveTransitPanel.svelte';
  import TransitPlanningPanel from './TransitPlanningPanel.svelte';

  import { mapPlanets, mapMoons, mapPoiOrbits } from './mapDataHelpers';
  import { renderPlanets, renderMoons, renderPoiOrbits, renderTransitPipeline } from './mapRenderers';

  const planets = planetsData as PlanetDef[];
  const moons = moonsData as MoonDef[];
  const pois = poisData as PoiDef[];

  // --- PIXI ENGINE REFERENCES ---
  let canvasContainer: HTMLDivElement;
  let pixiApp: Application | null = null;
  let worldContainer: Container | null = null;

  // --- VIEWPORT STATE ---
  let zoom = $state(1.0);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let isDragging = $state(false);
  let containerWidth = $state(0);
  let containerHeight = $state(0);
  let targetPlanet = $state<PlanetDef | null>(null);
  let targetPoiId = $state<string | null>(null);
  let hoveredBody = $state<PlanetDef | MoonDef | null>(null);
  let useMaxFuelLimit = $state(false); 
  let userCustomDv = $state<string>("");

  // --- DATA RESOLVERS ---
  let originPoi = $derived(pois.find(p => p.id === campaignState.shipLocation) || null);
  let targetPoi = $derived(targetPoiId ? (pois.find(p => p.id === targetPoiId) || null) : null);
  
  // NEW HELPER: Finds the top-level system planet (e.g. returns "Jupiter" for a station orbiting Callisto)
  function getSystemPlanetName(poiId: string) {
    const poi = pois.find(p => p.id === poiId);
    if (!poi) return null;
    const moon = moons.find(m => m.name === poi.parentBody);
    if (moon) return moon.parentPlanet;
    const planet = planets.find(p => p.name === poi.parentBody);
    if (planet) return planet.name;
    return null; 
  }

  // Casts a Planet into a mathematical POI object so the solver uses true planetary orbits
  function getPlanetAsPoi(planetName: string | null): any {
    if (!planetName) return null;
    const p = planets.find(pl => pl.name === planetName);
    if (!p) return null;
    
    return {
      id: p.name,
      name: p.name,
      parentBody: "Sun",
      type: "planet",
      a: p.a, 
      e: p.e, 
      omega: p.omega, 
      theta0: p.theta0,
      period: p.period,
      color: p.color
    };
  }

  let transitRefBody = $derived.by(() => {
    let oId = null, tId = null;
    if (campaignState.activeMission) {
      oId = campaignState.activeMission.originName;
      tId = campaignState.activeMission.targetName;
    } else if (originPoi && targetPoi) {
      oId = originPoi.id;
      tId = targetPoi.id;
    }

    if (oId && tId) {
      const p1 = getSystemPlanetName(oId);
      const p2 = getSystemPlanetName(tId);
      if (p1 && p2 && p1 === p2) return p1; // Returns "Jupiter", "Mars", etc.
    }
    return null;
  });

  let activeTrajectory = $derived.by(() => {
    if (!originPoi || !targetPoi || !shipState.engine) return null;
    const activeModeName = shipState.activeMode || shipState.engine.availableModes[0];
    const currentConfig = shipState.engine.configs.find(c => c.mode === activeModeName) || shipState.engine.configs[0]; 
    const accel = (Number(currentConfig?.twrG) || 0.05) * 9.81; 

    let solverOrigin = originPoi;
    let solverTarget = targetPoi;

    // THE SOLVER ALIASING FIX: Substitute true planetary orbits for interplanetary transfers
    if (!transitRefBody) {
      const oPlanetName = getSystemPlanetName(originPoi.id);
      const tPlanetName = getSystemPlanetName(targetPoi.id);
      
      solverOrigin = getPlanetAsPoi(oPlanetName) || originPoi;
      solverTarget = getPlanetAsPoi(tPlanetName) || targetPoi;
    }

    const maxTripDv = solveTrajectory(solverOrigin, solverTarget, campaignState.currentDay, accel, 0)?.maxDv || 0;
    const limitValue = useMaxFuelLimit ? (parseFloat(userCustomDv) || maxTripDv) : shipState.totalDV;
    return solveTrajectory(solverOrigin, solverTarget, campaignState.currentDay, accel, limitValue);
  });

  // --- PIXI ENGINE TICKER ---
  onMount(() => {
    let isDestroyed = false;

    const planetGraphics = new Map<string, { body: Graphics; orbit: Graphics; soi: Graphics; label: Text; hitbox: Graphics }>();
    const moonGraphics = new Map<string, { body: Graphics; orbit: Graphics; label: Text; soi: Graphics; hitbox: Graphics }>();
    const poiGraphics = new Map<string, { orbit: Graphics; body: Graphics; label: Text }>();
    let trajectoryGraphics: Graphics;

    async function initPixi() {
      const app = new Application();
      await app.init({
        resizeTo: canvasContainer,
        background: '#0a0a0c',
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true 
      });

      if (isDestroyed) { app.destroy({ removeView: true }); return; }
      pixiApp = app;
      canvasContainer.appendChild(app.canvas);
      
      app.canvas.style.position = 'absolute';
      app.canvas.style.top = '0';
      app.canvas.style.left = '0';
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.zIndex = '0';

      worldContainer = new Container();
      app.stage.addChild(worldContainer);

      const orbitLayer = new Container();
      const trajectoryLayer = new Container();
      const bodyLayer = new Container();
      worldContainer.addChild(orbitLayer);
      worldContainer.addChild(trajectoryLayer);
      worldContainer.addChild(bodyLayer);

      // Make the stage interactive to detect background clicks
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage.on('pointerdown', () => {
        targetPlanet = null;
        targetPoiId = null;
      });

      trajectoryGraphics = new Graphics();
      trajectoryLayer.addChild(trajectoryGraphics);

      // THE CORE RENDER LOOP
      app.ticker.add((ticker) => {
        campaignState.updateAnimationEasing(ticker.deltaTime / 60);
        
        const currentDisplayDay = campaignState.activeMission 
          ? campaignState.activeMission.launchDay + campaignState.animatedDaysElapsed
          : campaignState.currentDay + (campaignState.isPreviewing ? campaignState.previewElapsed : 0);
        const frameElapsedSeconds = currentDisplayDay * 86400;

        const currentMappedPlanets = mapPlanets(planets, frameElapsedSeconds, zoom, campaignState.orbitScaleMultiplier, campaignState.planetScaleMultiplier);
        const currentMappedMoons = mapMoons(moons, currentMappedPlanets, frameElapsedSeconds, zoom, campaignState.orbitScaleMultiplier);
        const currentMappedPoiOrbits = mapPoiOrbits(pois, currentMappedPlanets, moons, frameElapsedSeconds, zoom, campaignState.orbitScaleMultiplier);

        // --- CAMERA TRACKING ---
        let camTargetX = 0;
        let camTargetY = 0;
        let isTracking = false;

        // 1. Target clicked planet
        if (targetPlanet) {
          const targetPlanetName = targetPlanet.name;
          const p = currentMappedPlanets.find(pl => pl.def.name === targetPlanetName);
          if (p) { camTargetX = -p.x; camTargetY = -p.y; isTracking = true; }
        } 
        // 2. Fallback: Auto-track the system center during active transfers!
        else if (transitRefBody && (campaignState.activeMission || activeTrajectory)) {
          const p = currentMappedPlanets.find(pl => pl.def.name === transitRefBody);
          if (p) { camTargetX = -p.x; camTargetY = -p.y; isTracking = true; }
        }

        if (isTracking && !isDragging) {
          offsetX += (camTargetX - offsetX) * 0.1; // Smooth glide factor
          offsetY += (camTargetY - offsetY) * 0.1;
        }

        if (worldContainer) {
          worldContainer.x = offsetX + containerWidth / 2;
          worldContainer.y = offsetY + containerHeight / 2;
        }

        trajectoryGraphics.clear();

        renderPlanets(
          currentMappedPlanets, 
          planetGraphics, 
          orbitLayer,
          bodyLayer, 
          containerWidth, 
          containerHeight, 
          targetPlanet?.name || null,
          hoveredBody,
          campaignState.orbitTrailOpacity,
          (def) => {
            targetPlanet = def;
            const firstPoi = pois.find(p => p.parentBody === def.name);
            targetPoiId = firstPoi ? firstPoi.id : null;
          },
          (def) => {
            hoveredBody = def;
          }
        );

        renderMoons(
          currentMappedMoons, 
          moonGraphics, 
          orbitLayer, 
          bodyLayer, 
          zoom, 
          campaignState.orbitScaleMultiplier, 
          targetPoiId,
          hoveredBody,
          campaignState.orbitTrailOpacity,
          (moonDef) => {
            // Find the first POI on the clicked moon to set as a valid target
            const firstPoi = pois.find(p => p.parentBody === moonDef.name);
            targetPoiId = firstPoi ? firstPoi.id : null;
            targetPlanet = planets.find(pl => pl.name === moonDef.parentPlanet) || null;
          },
          (moonDef) => {
            hoveredBody = moonDef;
          }
        );

        renderPoiOrbits(
          currentMappedPoiOrbits, 
          currentMappedPlanets,
          currentMappedMoons,
          poiGraphics, 
          orbitLayer, 
          bodyLayer,
          campaignState.orbitTrailOpacity, 
          zoom,
          campaignState.orbitScaleMultiplier,
          (poiDef) => {
            targetPoiId = poiDef.id;
            const p = planets.find(pl => pl.name === poiDef.parentBody);
            if (p) targetPlanet = p;
            const m = moons.find(mo => mo.name === poiDef.parentBody);
            if (m) targetPlanet = planets.find(pl => pl.name === m.parentPlanet) || null;
          }
        );

        renderTransitPipeline(
          originPoi, targetPoi, activeTrajectory, campaignState.activeMission, 
          campaignState.currentDay, zoom, campaignState.orbitScaleMultiplier, 
          trajectoryGraphics, getPoiState,
          transitRefBody,
          campaignState.isPreviewing, campaignState.previewElapsed, campaignState.animatedDaysElapsed,
          planets,
          campaignState.planetScaleMultiplier
        );
      });
    }

    initPixi();
    return () => {
      isDestroyed = true;
      if (pixiApp) {
        pixiApp.destroy({ removeView: true });
        pixiApp = null;
      }
    };
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
  bind:this={canvasContainer}
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
  onmousedown={() => isDragging = true}
  onmouseup={() => isDragging = false}
  onmouseleave={() => isDragging = false}
  onmousemove={(e) => { if (isDragging) { offsetX += e.movementX; offsetY += e.movementY; } }}
  onwheel={handleWheel}
  oncontextmenu={(e) => e.preventDefault()}
>
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
        onConfirmLaunch={() => { targetPlanet = null; targetPoiId = null; }} 
      />
    {/if}
  </div>
</div>

<style>
  .navmap-container { position: relative; width: 100%; height: 100%; min-height: 600px; background-color: #0a0a0c; overflow: hidden; cursor: grab; }
  .navmap-container:active { cursor: grabbing; }
  .hud-top-left { position: absolute; top: 100px; left: 20px; color: var(--ui-cyan, #06b6d4); font-family: var(--font-terminal, monospace); pointer-events: none; z-index: 100; }
  .floating-panel-wrapper { position: absolute; top: 100px; right: 20px; width: 300px; z-index: 100; }
</style>