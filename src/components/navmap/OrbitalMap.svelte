<script lang="ts">
  import { onMount } from 'svelte';
  import { Application, Container, Graphics, Text } from 'pixi.js'; // PIXI.js library for 2D rendering
  
  import { campaignState } from '../../lib/states/campaignState.svelte';
  import { shipState } from '../../lib/states/shipState.svelte';
  import { solveTrajectory, getPoiState } from '../../lib/orbitalMath';
  import type { PlanetDef, MoonDef, PoiDef } from '../../lib/types';
  
  import planetsData from '../../data/planets.json';
  import moonsData from '../../data/moons.json';
  import poisData from '../../data/pois.json';

  import ActiveTransitPanel from './ActiveTransitPanel.svelte'; // Panel to display active transit information
  import TransitPlanningPanel from './TransitPlanningPanel.svelte'; // Panel for planning new transits

  // Helper functions to transform raw celestial body data into renderable coordinates
  import { mapPlanets, mapMoons, mapPoiOrbits } from '../../lib/helpers/mapDataHelpers'; 
  // Helper functions to draw celestial bodies, orbits, and trajectories on the PIXI canvas
  import { renderPlanets, renderMoons, renderPoiOrbits, renderTransitPipeline } from '../../lib/mapRenderers';
  // Helper functions to calculate derived state for the map
  import { calculateActiveTrajectory, calculateTransitRefBody } from '../../lib/helpers/mapStateHelpers';

  // Load static data for celestial bodies and points of interest
  const planets = planetsData as PlanetDef[];
  const moons = moonsData as MoonDef[];
  const pois = poisData as PoiDef[];

  // --- PIXI ENGINE REFERENCES ---
  let canvasContainer: HTMLDivElement; // Reference to the DOM element that will host the PIXI canvas
  let pixiApp: Application | null = null; // The main PIXI.js application instance
  let worldContainer: Container | null = null; // Main container for all celestial bodies and orbits, allowing for camera movement

  // --- VIEWPORT STATE ---
  let zoom = $state(1.0); // Current zoom level of the map
  let offsetX = $state(0); // X-offset for camera panning
  let offsetY = $state(0); // Y-offset for camera panning
  let isDragging = $state(false); // Flag to indicate if the map is currently being dragged
  let containerWidth = $state(0); // Width of the canvas container
  let containerHeight = $state(0); // Height of the canvas container
  let targetPlanet = $state<PlanetDef | null>(null); // The planet currently targeted by the camera (e.g., clicked by user)
  let targetPoiId = $state<string | null>(null); // The ID of the POI selected as the destination for transit planning
  let hoveredBody = $state<PlanetDef | MoonDef | null>(null); // The celestial body currently hovered over by the mouse
  let useMaxFuelLimit = $state(false); // Flag for transit planning: whether to constrain DV by max fuel
  let userCustomDv = $state<string>(""); // User-defined custom DV for transit planning

  // --- DATA RESOLVERS ---
  // Derived state for the current origin and target POIs based on campaign state and user selection
  let originPoi = $derived(pois.find(p => p.id === campaignState.shipLocation) || null);
  let targetPoi = $derived(targetPoiId ? (pois.find(p => p.id === targetPoiId) || null) : null);
  
  // Determines the common reference body (e.g., "Jupiter") for intra-system transfers, or null for interplanetary
  let transitRefBody = $derived(calculateTransitRefBody(
    campaignState, 
    originPoi, 
    targetPoi, 
    pois, 
    moons, 
    planets
  ));

  // Calculates the active trajectory using the orbital solver based on origin, target, and ship's engine
  let activeTrajectory = $derived(calculateActiveTrajectory({
    originPoi,
    targetPoi,
    shipState,
    campaignState,
    transitRefBody,
    useMaxFuelLimit,
    userCustomDv,
    pois,
    moons,
    planets
  }));

  // --- PIXI ENGINE TICKER ---
  // Svelte's onMount lifecycle hook for PIXI initialization and cleanup
  onMount(() => {
    let isDestroyed = false; // Flag to prevent PIXI from initializing if component is unmounted quickly

    // Maps to store PIXI Graphics objects for celestial bodies, allowing efficient updates
    const planetGraphics = new Map<string, { body: Graphics; orbit: Graphics; soi: Graphics; label: Text; hitbox: Graphics }>();
    const moonGraphics = new Map<string, { body: Graphics; orbit: Graphics; label: Text; soi: Graphics; hitbox: Graphics }>();
    const poiGraphics = new Map<string, { orbit: Graphics; body: Graphics; label: Text }>();
    let trajectoryGraphics: Graphics; // PIXI Graphics object for drawing the transit trajectory

    async function initPixi() {
      const app = new Application();
      await app.init({
        resizeTo: canvasContainer,
        background: '#0a0a0c',
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        antialias: true 
      });

      // If component was destroyed before PIXI finished initializing, clean up
      if (isDestroyed) { app.destroy({ removeView: true }); return; }
      pixiApp = app;
      canvasContainer.appendChild(app.canvas);
      
      // Apply CSS styles to make the canvas fill its container
      app.canvas.style.position = 'absolute';
      app.canvas.style.top = '0';
      app.canvas.style.left = '0';
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      app.canvas.style.zIndex = '0';
      
      // Setup PIXI display hierarchy for proper rendering order (e.g., orbits behind bodies)
      worldContainer = new Container();
      app.stage.addChild(worldContainer);

      const orbitLayer = new Container();
      const trajectoryLayer = new Container();
      const bodyLayer = new Container();
      // Add layers in drawing order (orbits first, then trajectory, then bodies on top)
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

        const currentMappedPlanets = mapPlanets(planets, frameElapsedSeconds, zoom, 1.0, 1.0);
        const currentMappedMoons = mapMoons(moons, currentMappedPlanets, frameElapsedSeconds, zoom, 1.0);
        const currentMappedPoiOrbits = mapPoiOrbits(pois, currentMappedPlanets, moons, frameElapsedSeconds, zoom, 1.0);

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
        
        // Smoothly interpolate camera offset towards the target if tracking and not dragging
        if (isTracking && !isDragging) {
          offsetX += (camTargetX - offsetX) * 0.1; // Smooth glide factor
          offsetY += (camTargetY - offsetY) * 0.1;
        }
        
        // Apply the calculated camera offset to the world container
        if (worldContainer) {
          worldContainer.x = offsetX + containerWidth / 2;
          worldContainer.y = offsetY + containerHeight / 2;
        }
        
        // Clear previous trajectory drawing before redrawing for the current frame
        trajectoryGraphics.clear();
        
        // Render planets, moons, POI orbits, and the transit pipeline using dedicated renderer functions
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
          campaignState.orbitTrailThickness,
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
          containerWidth,
          containerHeight,
          zoom, 
          1.0, 
          targetPoiId,
          hoveredBody,
          campaignState.orbitTrailOpacity,
          campaignState.orbitTrailThickness,
          (moonDef: MoonDef) => {
            // Find the first POI on the clicked moon to set as a valid target
            const firstPoi = pois.find(p => p.parentBody === moonDef.name);
            targetPoiId = firstPoi ? firstPoi.id : null;
            targetPlanet = planets.find(pl => pl.name === moonDef.parentPlanet) || null;
          },
          (moonDef: MoonDef | null) => {
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
          campaignState.orbitTrailThickness,
          zoom,
          1.0,
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
          campaignState.currentDay, zoom, 1.0, 
          trajectoryGraphics, getPoiState,
          transitRefBody,
          campaignState.isPreviewing, campaignState.previewElapsed, campaignState.animatedDaysElapsed,
          planets,
          1.0
        );
      });
    }

    // Initialize PIXI and set up cleanup function for component unmount
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
  <!-- Heads-Up Display (HUD) for current date and day -->
  <div class="hud-top-left">
    DATE: {campaignState.formattedDate}<br/>
    DAY: {Math.floor(campaignState.currentDay)}
  </div>
  
  <!-- Floating panel for transit information (active mission or planning) -->
    <div 
      class="floating-panel-wrapper"
      onwheel={(e) => e.stopPropagation()}
      onmousedown={(e) => e.stopPropagation()}
    >
      {#if campaignState.activeMission}
        <ActiveTransitPanel />
      {:else if originPoi}
        <TransitPlanningPanel 
          {originPoi} 
          {targetPoi} 
          {activeTrajectory} 
          bind:useMaxFuelLimit 
          bind:userCustomDv 
          bind:targetPoiId 
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