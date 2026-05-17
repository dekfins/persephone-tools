<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { getTransitTelemetry } from '../../lib/orbitalMath';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  
  let liveFlight = $derived(
    campaignState.activeMission 
      ? getTransitTelemetry(campaignState.animatedDaysElapsed, campaignState.activeMission.telemetry)
      : null
  );
</script>

{#if campaignState.activeMission && liveFlight}
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
      <span>VELOCITY:</span>
      <span style="color: #fff;">{liveFlight.currentVelocityKM.toFixed(2)} km/s</span>
    </div>
    <div class="stat-row">
      <span>REMAINING DV:</span>
      <span style="color: #e11d48;">{liveFlight.remainingDvKM.toFixed(2)} km/s</span>
    </div>
    <div class="stat-row">
      <span>SEGMENT:</span>
      <span>
        {Math.min(
          Math.floor(campaignState.activeMission.daysElapsed / 5) + 1, 
          Math.ceil(campaignState.activeMission.travelTime / 5)
        )} / {Math.ceil(campaignState.activeMission.travelTime / 5)}
      </span>
    </div>
    
    <div style="display: flex; gap: 8px; margin-top: 1rem;">
      <button class="btn-action" style="flex: 2;" onclick={() => campaignState.advanceSegment()}>
        {(campaignState.activeMission.travelTime - campaignState.activeMission.daysElapsed) <= 5 ? 'ARRIVE' : 'ADVANCE SEGMENT'}
      </button>
      {#if campaignState.hasUndoBackup}
        <button class="btn-action btn-revert" style="flex: 1; background: #475569;" onclick={() => campaignState.revertSegment()}>
          UNDO
        </button>
      {/if}
    </div>
  </TerminalPanel>
{/if}

<style>
  .stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--ui-cyan);
    font-family: var(--font-terminal, monospace);
  }
  .btn-revert:hover {
    background: #ef4444 !important;
    color: #fff;
  }
</style>
