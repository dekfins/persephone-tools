<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { getTransitTelemetry } from '../../lib/orbitalMath';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import type { PoiDef } from '../../lib/types';
  import poisData from '../../data/pois.json';
  
  const pois = poisData as PoiDef[];

  let liveFlight = $derived.by(() => {
    if (!campaignState.activeMission) return null;
    
    const telemetry = campaignState.activeMission.telemetry;
    const elapsed = campaignState.animatedDaysElapsed || 0; // Fallback to 0 instantly on launch
    
    // Safe fallback if telemetry is missing/broken due to solver bugs
    if (!telemetry) {
      return { currentVelocityKM: 0, remainingDvKM: 0, fraction: 0 };
    }
    
    const result = getTransitTelemetry(elapsed, telemetry);
    return result || { currentVelocityKM: 0, remainingDvKM: 0, fraction: 0 };
  });

  // Cross-reference our active mission string ID with pois.json to get the clean metadata
  let targetPoi = $derived.by(() => {
    const mission = campaignState.activeMission;
    if (!mission) return null;
    return pois.find(p => p.id === mission.targetName);
  });
</script>

{#if campaignState.activeMission && liveFlight}
  <TerminalPanel title="STATUS: IN TRANSIT">
    <div class="stat-row">
      <span>DESTINATION:</span>
      <span>{targetPoi ? targetPoi.name.toUpperCase() : campaignState.activeMission.targetName.toUpperCase()}</span>
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
        <button class="btn-action btn-revert" style="flex: 1;" onclick={() => campaignState.revertSegment()}>
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
  .btn-revert {
    background-color: transparent; /* slate-600 */
    border-color: var(--accent-red, #ef4444);
    color: var(--accent-red, #ef4444);
  }
  .btn-revert:hover {
    background: var(--accent-red, #ef4444) !important;
    color: #fff;
  }
</style>