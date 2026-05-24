<script lang="ts">
  import { campaignState } from '../../lib/campaignState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
  import type { PoiDef } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let {
    originPoi,
    targetPoi,
    activeTrajectory,
    onConfirmLaunch,
    useMaxFuelLimit = $bindable(false),
    userCustomDv = $bindable("")
  }: {
    originPoi: PoiDef;
    targetPoi: PoiDef;
    activeTrajectory: any;
    onConfirmLaunch: () => void;
    useMaxFuelLimit: boolean;
    userCustomDv: string;
  } = $props();

  let hasInsufficientDV = $derived(
    useMaxFuelLimit && userCustomDv
      ? Number(shipState.totalDV.toFixed(2)) < Number(userCustomDv) || shipState.totalDV <= 0
      : Number(shipState.totalDV.toFixed(2)) < Number(activeTrajectory.maxDv.toFixed(2)) || shipState.totalDV <= 0
  );
</script>

<TerminalPanel title="{originPoi.name.toUpperCase()} -> {targetPoi.name.toUpperCase()}">
  <div class="stat-row"><span>TRAVEL TIME:</span><span>{activeTrajectory.realisticTime.toFixed(2)} d</span></div>
  <div class="stat-row"><span>BURNOUT DV:</span><span>{activeTrajectory.idealDv.toFixed(2)} km/s</span></div>
  <div class="stat-row"><span>AVAILABLE DV:</span><span style="color: {hasInsufficientDV ? 'var(--accent-red)' : 'var(--text-main)'};">{shipState.totalDV.toFixed(2)} km/s</span></div>

  <div class="fuel-config-box">
    <label class="config-label">
      <input type="checkbox" bind:checked={useMaxFuelLimit} />
      <span>CONSTRAINT MANEUVER DELTA-V</span>
    </label>
    {#if useMaxFuelLimit}
      <div class="input-row">
        <input type="text" placeholder="{activeTrajectory.maxDv.toFixed(1)}" bind:value={userCustomDv} class="terminal-input" />
        <span class="unit-tag">KM/S</span>
      </div>
    {/if}
  </div>

  {#if !campaignState.isPreviewing}
    <button class="btn-action" style="width: 100%; margin-top: 1rem;" onclick={() => {
        campaignState.isPreviewing = true; 
        campaignState.previewElapsed = 0; 
        campaignState.previewTravelTime = activeTrajectory.realisticTime;
    }}>PREVIEW BURN</button>

    <button 
      class="btn-action" 
      style="width: 100%; margin-top: 10px;" 
      disabled={hasInsufficientDV}
      onclick={() => {
        campaignState.initiateTransit({
          originName: originPoi.id, targetName: targetPoi.id, launchDay: campaignState.currentDay,
          travelTime: activeTrajectory.realisticTime, daysElapsed: 0, reqDv: activeTrajectory.maxDv,
          telemetry: activeTrajectory.telemetry 
        });
        onConfirmLaunch();
      }}>
      {hasInsufficientDV ? 'INSUFFICIENT DELTA-V' : 'CONFIRM LAUNCH'}
    </button>
  {/if}
</TerminalPanel>

<style>
  .stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--ui-cyan);
    font-family: var(--font-terminal, monospace);
  }
  .fuel-config-box {
    margin-top: 10px;
    border-top: 1px dashed rgba(6, 182, 212, 0.3);
    padding-top: 10px;
  }
  .config-label {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 0.75rem;
    color: #94a3b8;
    font-family: monospace;
    cursor: pointer;
  }
  .input-row {
    display: flex;
    gap: 4px;
    margin-top: 6px;
    align-items: center;
  }
  .terminal-input {
    background: #020617;
    border: 1px solid var(--ui-cyan, #06b6d4);
    padding: 4px 8px;
    color: #fff;
    font-family: monospace;
    font-size: 0.85rem;
    width: 100px;
  }
  .unit-tag {
    font-size: 0.75rem;
    color: var(--ui-cyan);
    font-family: monospace;
  }
</style>