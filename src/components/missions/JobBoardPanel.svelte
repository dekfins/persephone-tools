<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
  import { generateJobBoard } from '../../lib/missionGenerator';
  import type { GeneratedMission } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import poisData from '../../data/pois.json';

  const pois = poisData as any[];

  // Form State
  let diffMin = $state(2);
  let diffMax = $state(8);
  let jobs = $state<GeneratedMission[]>([]);
  let isScanning = $state(false);

  // Auto-resolve current location name
  let originName = $derived(
    pois.find(p => p.id === campaignState.shipLocation)?.name || "UNKNOWN"
  );

  // Auto-resolve current acceleration 
  let accel = $derived.by(() => {
    if (!shipState.engine) return 0.05 * 9.81;
    const modeName = shipState.activeMode || shipState.engine.availableModes[0];
    const config = shipState.engine.configs.find(c => c.mode === modeName) || shipState.engine.configs[0];
    return (Number(config?.twrG) || 0.05) * 9.81;
  });

  // Prevent slider thumbs from crossing each other
  function handleMinInput() {
    if (diffMin >= diffMax) diffMin = diffMax - 1;
  }
  function handleMaxInput() {
    if (diffMax <= diffMin) diffMax = diffMin + 1;
  }

  function scanBoard() {
    isScanning = true;
    jobs = []; 
    
    setTimeout(() => {
      jobs = generateJobBoard(
        campaignState.shipLocation,
        campaignState.currentDay,
        accel,
        shipState.totalDV,
        diffMin,
        diffMax,
        4 // Increased to 4 for the 2x2 grid symmetry!
      );
      isScanning = false;
    }, 400);
  }

  function triggerWebhook() {
    console.log("Webhook triggered. Awaiting Python port logic...");
    // TODO: Implement Discord webhook logic here
  }
</script>

<div class="job-board-layout">
  
  <div class="control-column">
    <TerminalPanel title="LOCAL JOB BOARD">
      <div class="stat-row">
        <span class="label-text">CURRENT LOCATION:</span>
        <span class="value-text">{originName.toUpperCase()}</span>
      </div>
      <div class="stat-row">
        <span class="label-text">AVAILABLE DV:</span>
        <span class="value-text" style="color: var(--ui-cyan)">{shipState.totalDV.toFixed(0)} km/s</span>
      </div>

      <hr class="dim-divider" />

      <div class="slider-container">
        <div class="slider-header">
          <span class="label-text">DIFFICULTY:</span>
          <span class="value-text">{diffMin} - {diffMax}</span>
        </div>
        
        <div class="dual-slider-wrapper">
          <div class="track-bg"></div>
          <div 
            class="track-active" 
            style="left: {(diffMin - 1) / 9 * 100}%; right: {100 - ((diffMax - 1) / 9 * 100)}%;">
          </div>
          
          <input type="range" min="1" max="10" bind:value={diffMin} oninput={handleMinInput} class="ghost-slider" />
          <input type="range" min="1" max="10" bind:value={diffMax} oninput={handleMaxInput} class="ghost-slider" />
        </div>

        <div class="slider-labels">
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn-action btn-action-alert" onclick={scanBoard} disabled={isScanning}>
          {isScanning ? "SCANNING..." : "SCAN FOR JOBS"}
        </button>

        <button class="btn-action" onclick={triggerWebhook} disabled={jobs.length === 0}>
          SEND TO WEBHOOK
        </button>
      </div>
    </TerminalPanel>
  </div>

  <div class="results-column">
    {#if jobs.length === 0 && !isScanning}
      <div class="terminal-alert" style="grid-column: 1 / -1;">
        NO JOBS FOUND. ADJUST DIFFICULTY FILTER AND RESCAN.
      </div>
    {:else if jobs.length > 0}
      <div class="jobs-grid">
        {#each jobs as job}
          <TerminalPanel title={job.targetPoiId.toUpperCase()} extraClass="job-card">
            <div class="card-stat-row">
              <span>OBJECTIVE:</span>
              <span class="text-highlight">{job.objective.toUpperCase()}</span>
            </div>
            
            <div class="card-stat-row">
              <span>DIFFICULTY:</span>
              <span style="color: {job.difficulty > 7 ? 'var(--accent-red)' : job.difficulty > 3 ? 'var(--accent-amber)' : 'var(--fighter-green)'}">
                {job.difficulty} / 10
              </span>
            </div>

            <div class="card-stat-row"><span>TRAVEL TIME:</span><span>{job.travelTimeDays.toFixed(1)} d</span></div>
            
            <div class="card-stat-row">
              <span>DV REQUIRED:</span>
              <span style="color: {job.reqDv > shipState.totalDV ? 'var(--accent-red)' : 'var(--ui-cyan)'}">
                {job.reqDv.toFixed(2)} km/s
              </span>
            </div>

            <div class="card-stat-row"><span>CLIENT:</span><span class="text-highlight">{job.client.toUpperCase()}</span></div>
            <div class="card-stat-row"><span>ADVERSARY:</span><span class="text-highlight">{job.adversary.toUpperCase()}</span></div>
            <div class="card-stat-row" style="color: var(--accent-red)">
              <span>TWIST:</span>
              <span class="text-highlight">{job.twist.toUpperCase()}</span>
            </div>

            <div class="card-stat-row" style="align-items: flex-start;">
              <span>PAYOUT:</span>
              <span style="color: #ffffff; font-weight: bold; text-align: right;">
                {job.payoutCredits.toLocaleString()} CR
                {#if job.lootItem}
                  <br/>
                  <span style="font-weight: normal;">+ </span>
                  <span class="loot-{job.lootRarity}">{job.lootItem.toUpperCase()}</span>
                {/if}
              </span>
            </div>
            
            <button class="btn-action btn-compact" style="width: 100%; margin-top: 1rem;">
              ACCEPT CONTRACT
            </button>
          </TerminalPanel>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .job-board-layout {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 2rem;
    align-items: start;
    width: 100%;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    font-family: var(--font-terminal, monospace);
  }

  .label-text { color: var(--text-dim, #94a3b8); }
  .value-text { color: var(--accent-amber, #f59e0b); }

  .dim-divider {
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin: 1.5rem 0;
  }

  /* CUSTOM DUAL SLIDER STYLES */
  .slider-container {
    margin-bottom: 2rem;
  }
  .slider-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    font-family: var(--font-terminal, monospace);
  }
  .dual-slider-wrapper {
    position: relative;
    width: 100%;
    height: 20px;
  }
  .track-bg {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    z-index: 1;
  }
  .track-active {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 4px;
    background: var(--accent-amber, #f59e0b);
    z-index: 2;
  }
  .ghost-slider {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    background: transparent !important;
    pointer-events: none; /* Let clicks pass through the track */
    z-index: 3;
    margin: 0;
  }
  
  /* Make only the thumbs clickable */
  .ghost-slider::-webkit-slider-thumb {
    pointer-events: auto;
  }
  .ghost-slider::-moz-range-thumb {
    pointer-events: auto;
  }

  /* Override widgets.css tracks for this specific slider to keep them invisible */
  .ghost-slider::-webkit-slider-runnable-track { background: transparent !important; }
  .ghost-slider::-moz-range-track { background: transparent !important; }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--accent-amber, #f59e0b);
    font-family: var(--font-terminal, monospace);
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .btn-action-alert {
    color: var(--accent-amber);
    border-color: var(--accent-amber);
  }

  .btn-action-alert:hover {
    background: var(--accent-amber) !important;
    color: #000 !important;
  }

  /* RESULTS GRID STYLES */
  .jobs-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* Forces exact 2x2 layout */
    gap: 1.5rem;
  }

  .card-stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    color: var(--ui-cyan, #06b6d4);
    font-family: var(--font-terminal, monospace);
  }

  .text-highlight {
    color: var(--text-main, #e2e8f0);
    text-align: right;
  }

  :global(.job-card h3) {
    font-size: 1rem !important; 
    color: var(--ui-cyan) !important;
  }

  .loot-common { color: #94a3b8; }
  .loot-uncommon { color: #4ade80; }
  .loot-rare { color: #60a5fa; }
  .loot-epic { color: #c084fc; }
  .loot-legendary { color: var(--accent-amber, #f59e0b); }
</style>