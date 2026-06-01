<script lang="ts">
  import { campaignState } from '../../lib/states/campaignState.svelte';
  import { shipState } from '../../lib/states/shipState.svelte';
  import { crewState } from '../../lib/states/crewState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import { generateJobBoard } from '../../lib/missionGenerator';
  import type { GeneratedMission } from '../../lib/types';
  import JobBoardControls from './JobBoardControls.svelte';
  import JobResults from './JobResults.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import { router } from 'tinro';
  import poisData from '../../data/celestial/pois.json';
  import type { PoiDef } from '../../lib/types';

  const pois = poisData as PoiDef[];

  // Form State
  let diffMin = $state(2);
  let diffMax = $state(8);
  let jobs = $state<GeneratedMission[]>([]);
  let isScanning = $state(false);
  let activeContract = $state<GeneratedMission | null>(null);
  let upfrontDemand = $state<number>(0);
  let targetPoiName = $derived(activeContract ? pois.find(p => p.id === activeContract?.targetPoiId)?.name || activeContract.targetPoiId : '');

  let accel = $derived.by(() => {
    if (!shipState.blueprint.engine) return 0.05 * 9.81;
    const modeName = shipState.propulsion.activeMode || shipState.blueprint.engine.availableModes[0];
    const config = shipState.blueprint.engine.configs.find(c => c.mode === modeName) || shipState.blueprint.engine.configs[0];
    return (Number(config?.twrG) || 0.05) * 9.81;
  });

  function scanBoard() {
    isScanning = true;
    jobs = []; 
    
    setTimeout(() => {
      jobs = generateJobBoard(
        campaignState.shipLocation,
        campaignState.currentDay,
        accel,
        shipState.propulsion.totalDV,
        diffMin,
        diffMax,
        4
      );
      isScanning = false;
    }, 400);
  }

  async function signContract() {
    if (!activeContract) return;

    // 1. Add negotiated upfront cash to the ship's slush fund
    if (upfrontDemand > 0) {
      await dbState.updateShipCredits(upfrontDemand);
    }

    // 2. Inject the flight plan into the Navmap
    campaignState.initiateTransit({
      originName: activeContract.originPoiId,
      targetName: activeContract.targetPoiId,
      launchDay: campaignState.currentDay,
      travelTime: activeContract.travelTimeDays,
      daysElapsed: 0,
      reqDv: activeContract.reqDv,
      telemetry: activeContract.telemetry,
      payoutCredits: activeContract.payoutCredits,
      lootItem: activeContract.lootItem,
      lootRarity: activeContract.lootRarity
    });

    // 3. PUSH THE LAUNCH TO THE FLEET
    await dbState.syncTimelineToCloud();

    // 4. Switch the UI to the Navmap tab automatically!
    router.goto('/navmap');
  }

  function triggerWebhook() {
    console.log("Webhook triggered. Awaiting Python port logic...");
    // TODO: Implement Discord webhook logic here
  }
</script>

{#if dbState.activeCharacter?.role !== 'GM'}
  <div class="terminal-alert error" style="margin-top: 2rem;">
    UNAUTHORIZED ACCESS. GM CLEARANCE REQUIRED.
  </div>
{:else}
  <div class="job-board-layout">
    
    <div class="control-column">
      <JobBoardControls 
        bind:diffMin
        bind:diffMax
        {isScanning}
        onScan={scanBoard}
        onWebhook={triggerWebhook}
        hasJobs={jobs.length > 0}
      />
    </div>

    <div class="results-column">
      <JobResults 
        {jobs} 
        {isScanning} 
        onAccept={(selectedJob) => activeContract = selectedJob} 
      />
    </div>
  </div>

  {#if activeContract}
    <div class="modal-backdrop">
      <div class="modal-content">
        <TerminalPanel title="CONTRACT NEGOTIATION" extraClass="negotiation-panel">
          
          <div class="stat-row">
            <span class="label-text">TARGET:</span>
            <span class="value-text">{targetPoiName.toUpperCase()}</span>
          </div>
          
          <p class="flavor-text">
            Standard SWN rules apply. Roll <strong>2d6 + Trade</strong>. If successful, the GM may authorize upfront expense coverage for propellant and Kibble.
          </p>

          <div class="input-group" style="margin: 1.5rem 0;">
            <span class="eng-label">UPFRONT EXPENSES (CR):</span>
            <input type="number" min="0" bind:value={upfrontDemand} class="terminal-input num-input" style="width: 120px;" />
          </div>

          <div class="action-buttons" style="flex-direction: row; gap: 1rem;">
            <button class="btn-action btn-red" onclick={() => activeContract = null}>
              CANCEL
            </button>
            <button class="btn-action btn-green" onclick={signContract}>
              SIGN & LAUNCH
            </button>
          </div>

        </TerminalPanel>
      </div>
    </div>
  {/if}
{/if}

<style>
  .job-board-layout {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 2rem;
    align-items: start;
    width: 100%;
  }

  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(2, 6, 23, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999; /* This forces it to the front of the screen */
  }
  
  .modal-content {
    width: 100%;
    max-width: 500px;
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
  }
  
  .flavor-text {
    color: var(--text-main);
    font-size: 0.85rem;
    line-height: 1.5;
    font-family: var(--font-terminal, monospace);
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-left: 3px solid var(--accent-amber);
    margin-top: 1rem;
  }
  
  .input-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .eng-label {
    color: var(--text-dim, #94a3b8);
    font-size: 0.9rem;
    font-family: var(--font-terminal, monospace);
  }
  
  .action-buttons {
    display: flex;
  }

  .btn-red {
    background: transparent;
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    transition: all 0.2s ease;
  }

  .btn-green {
    background: transparent;
    border: 1px solid var(--fighter-green);
    color: var(--fighter-green);
    transition: all 1s ease;
  }

  .btn-red:hover {
    background: var(--accent-red);
    color: #000;
  }

  .btn-green:hover {
    background: var(--fighter-green);
    color: #000;
  }
</style>