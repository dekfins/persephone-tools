<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
  import { generateJobBoard } from '../../lib/missionGenerator';
  import type { GeneratedMission } from '../../lib/types';
  import JobBoardControls from './JobBoardControls.svelte';
  import JobResults from './JobResults.svelte';

  // Form State
  let diffMin = $state(2);
  let diffMax = $state(8);
  let jobs = $state<GeneratedMission[]>([]);
  let isScanning = $state(false);

  // Auto-resolve current acceleration 
  let accel = $derived.by(() => {
    if (!shipState.engine) return 0.05 * 9.81;
    const modeName = shipState.activeMode || shipState.engine.availableModes[0];
    const config = shipState.engine.configs.find(c => c.mode === modeName) || shipState.engine.configs[0];
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
        shipState.totalDV,
        diffMin,
        diffMax,
        4
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
    <JobResults {jobs} {isScanning} />
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
</style>