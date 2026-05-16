<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { campaignState } from '../../lib/campaignState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
  import { getPlanetState, solveTrajectory } from '../../lib/orbitalMath';
  import type { PlanetDef } from '../../lib/types';   
  import planetsData from '../../data/planets.json';
  
  import { drawNavMap } from './renderer';
  
  import TerminalPanel from '../shared/TerminalPanel.svelte'; 
  
  const planets = planetsData as PlanetDef[];

  // --- DOM & VIEWPORT STATE ---
  let canvas = $state<HTMLCanvasElement | null>(null);
  let ctx = $state<CanvasRenderingContext2D | null>(null);
  let animationFrameId = $state<number>(0);
  let lastFrameTime = $state<number>(0);

  let zoom = $state(1.0);
  let offsetX = $state(0);
  let offsetY = $state(0); 
  let isDragging = $state(false);
  let lastMouseX = $state(0);
  let lastMouseY = $state(0);

  // --- TARGETING STATE ---
  let originPlanet = $derived(planets.find(p => p.name === campaignState.shipLocation) || null);
  let targetPlanet = $state<PlanetDef | null>(null);

  // --- REACTIVE SOLVER ---
  let activeTrajectory = $derived.by(() => {
    if (!originPlanet || !targetPlanet || !shipState.engine) return null;
    
    const activeModeName = shipState.activeMode || shipState.engine.availableModes[0];
    const currentConfig = shipState.engine.configs.find(c => c.mode === activeModeName) || shipState.engine.configs[0]; 
    
    const rawTwr = Number(currentConfig?.twrG);
    const accel = (isNaN(rawTwr) ? 0.05 : rawTwr) * 9.81; 
    const limitDV = 0; 

    return solveTrajectory(originPlanet, targetPlanet, campaignState.currentDay, accel, limitDV);
  });

  // --- ENGINE LOOP ---
  function render(ts: number) {
    const context = ctx;
    const canvasEl = canvas;
    if (!context || !canvasEl) return;
    
    let dt = (ts - lastFrameTime) / 1000;
    if (dt > 0.1) dt = 0.1; 
    lastFrameTime = ts;

    if (campaignState.isPreviewing) {
      campaignState.previewElapsed += (dt * 15); 
      if (campaignState.previewElapsed >= campaignState.previewTravelTime) {
        campaignState.isPreviewing = false; 
      }
    }

    const rect = canvasEl.parentElement?.getBoundingClientRect();
    if (rect && (canvasEl.width !== rect.width || canvasEl.height !== rect.height)) {
      canvasEl.width = rect.width;
      canvasEl.height = rect.height;
    }

    // Call the external renderer
    drawNavMap(context, canvasEl, {
      planets,
      campaignState,
      originPlanet,
      targetPlanet,
      activeTrajectory,
      zoom,
      offsetX,
      offsetY
    });

    animationFrameId = requestAnimationFrame(render);
  }

  onMount(() => {
    if (canvas) {
      ctx = canvas.getContext('2d');
      lastFrameTime = performance.now();
      animationFrameId = requestAnimationFrame(render);
    }
  });

  onDestroy(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });

  // --- MOUSE HANDLERS ---
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (!canvas) return;
    const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - rect.left) - canvas.width / 2;
    const dy = (e.clientY - rect.top) - canvas.height / 2;
    offsetX = dx - (dx - offsetX) * delta;
    offsetY = dy - (dy - offsetY) * delta;
    zoom *= delta;
  }

  function handleMouseDown(e: MouseEvent) {
    if (!canvas) return;
    if (e.button === 2 || e.ctrlKey) {
      isDragging = true;
    } else if (e.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const cx = (canvas.width / 2) + offsetX;
      const cy = (canvas.height / 2) + offsetY;
      const currentScale = (250 / 1.5e12) * zoom;

      const clicked = planets.find(p => {
        const s = getPlanetState(p, campaignState.currentDay * 86400);
        const px = cx + (s.x * currentScale);
        const py = cy - (s.y * currentScale);
        return Math.hypot(px - clickX, py - clickY) < 15;
      });

      if (clicked) {
        if (clicked.name !== campaignState.shipLocation) {
          targetPlanet = clicked; 
        } else {
          targetPlanet = null; 
        }
      } else {
        targetPlanet = null; 
      }
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (isDragging) {
      offsetX += e.clientX - lastMouseX;
      offsetY += e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }
</script>

<div class="navmap-container">
  <canvas 
    bind:this={canvas}
    onwheel={handleWheel}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    oncontextmenu={(e) => e.preventDefault()}
  ></canvas>

  <div class="hud-top-left">
    DATE: {campaignState.formattedDate}<br/>
    DAY: {Math.floor(campaignState.currentDay)}
  </div>

  <div class="floating-panel-wrapper">
    {#if campaignState.activeMission}
      <TerminalPanel title="STATUS: IN TRANSIT">
        <div class="stat-row">
          <span>DESTINATION:</span>
          <span>{campaignState.activeMission.targetName.toUpperCase()}</span>
        </div>
        <div class="stat-row">
          <span>PROGRESS:</span>
          <span>{campaignState.activeMission.daysElapsed.toFixed(1)} / {campaignState.activeMission.travelTime.toFixed(1)} d</span>
        </div>
        <div class="stat-row">
          <span>SEGMENT:</span>
          <span>
            {Math.min(Math.floor(campaignState.activeMission.daysElapsed / 5) + 1, Math.ceil(campaignState.activeMission.travelTime / 5))} / {Math.ceil(campaignState.activeMission.travelTime / 5)}
          </span>
        </div>
        
        <button 
          class="btn-action" 
          style="width: 100%; margin-top: 1rem;"
          onclick={() => campaignState.advanceSegment()}
        >
          {(campaignState.activeMission.travelTime - campaignState.activeMission.daysElapsed) <= 5 
            ? `FINISH TRAVEL (${(campaignState.activeMission.travelTime - campaignState.activeMission.daysElapsed).toFixed(1)}d)` 
            : 'ADVANCE SEGMENT (5 DAYS)'}
        </button>
      </TerminalPanel>

    {:else if activeTrajectory && originPlanet && targetPlanet}
      <TerminalPanel title="{originPlanet.name.toUpperCase()} -> {targetPlanet.name.toUpperCase()}">
        <div class="stat-row">
          <span>TRAVEL TIME:</span>
          <span>{activeTrajectory.realisticTime.toFixed(2)} d</span>
        </div>
        <div class="stat-row">
          <span>REQ DV:</span>
          <span>{activeTrajectory.maxDv.toFixed(2)} km/s</span>
        </div>

        {#if !campaignState.isPreviewing}
          <button 
            class="btn-action" 
            style="width: 100%; margin-top: 1rem;" 
            onclick={() => {
              campaignState.isPreviewing = true;
              campaignState.previewElapsed = 0;
              campaignState.previewTravelTime = activeTrajectory.realisticTime;
          }}>
            PREVIEW BURN
          </button>

          <button 
            class="btn-action" 
            style="width: 100%; margin-top: 10px;" 
            onclick={() => {
              campaignState.activeMission = {
                originName: originPlanet!.name,
                targetName: targetPlanet!.name,
                launchDay: campaignState.currentDay,
                travelTime: activeTrajectory!.realisticTime,
                daysElapsed: 0,
                reqDv: activeTrajectory!.maxDv,
                telemetry: activeTrajectory!.telemetry // SAVING THE TELEMETRY FOR FLIGHT
              };
              targetPlanet = null;
          }}>
            CONFIRM LAUNCH
          </button>
        {/if}
      </TerminalPanel>
    {/if}
  </div>
</div>

<style>
  .navmap-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 600px; 
    background-color: #000;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: crosshair;
  }

  .hud-top-left {
    position: absolute;
    top: 100px;
    left: 20px;
    color: var(--ui-cyan, #06b6d4);
    font-family: var(--font-terminal, monospace);
    pointer-events: none;
    text-shadow: 0 0 5px rgba(6, 182, 212, 0.5);
  }

  /* PANEL POSITIONING & INTERNAL STYLES */
  .floating-panel-wrapper {
    position: absolute;
    top: 100px;
    right: 20px;
    width: 300px;
    z-index: 100;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--ui-cyan);
    font-family: var(--font-terminal, monospace);
  }
</style>