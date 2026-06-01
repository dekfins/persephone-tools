<script lang="ts">
  import { campaignState } from '../../lib/states/campaignState.svelte';
  import { shipState } from '../../lib/states/shipState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { PoiDef } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import poisData from '../../data/celestial/pois.json';

  const pois = poisData as PoiDef[];

  let {
    originPoi,
    targetPoi, // Now allowed to be null initially
    activeTrajectory, // Now allowed to be null initially
    onConfirmLaunch,
    useMaxFuelLimit = $bindable(false),
    userCustomDv = $bindable(""),
    targetPoiId = $bindable<string | null>(null) // NEW: Two-way binding back to OrbitalMap
  }: {
    originPoi: PoiDef;
    targetPoi: PoiDef | null;
    activeTrajectory: any | null;
    onConfirmLaunch: () => void;
    useMaxFuelLimit: boolean;
    userCustomDv: string;
    targetPoiId: string | null;
  } = $props();

  // Safely map POIs so TerminalSelect doesn't crash looking for ship component properties
  let destinationOptions = $derived(
    pois
      .filter(p => p.id !== originPoi.id) // Don't let the player travel to where they already are
      .map(p => ({
        ...p,
        label: p.name.toUpperCase(),
        // Pass a dummy class so the TerminalSelect UI tag doesn't throw a .toUpperCase() error
        class: p.type === 'station' ? 'station' : 'surface', 
        description: `Orbiting ${p.parentBody.toUpperCase()}`
      }))
  );

  // Keep a local state for the TerminalSelect object format
  let selectedTargetObj = $state<{ id: string, label: string } | null>(null);

  // Sync external clicks (if the user still clicks the map) with the dropdown UI
  $effect(() => {
    if (targetPoi) {
      selectedTargetObj = destinationOptions.find(o => o.id === targetPoi!.id) || null;
    } else {
      selectedTargetObj = null;
    }
  });

  let hasInsufficientDV = $derived(
    activeTrajectory
      ? (useMaxFuelLimit && userCustomDv
          ? Number(shipState.propulsion.totalDV.toFixed(2)) < Number(userCustomDv) || shipState.propulsion.totalDV <= 0
          : Number(shipState.propulsion.totalDV.toFixed(2)) < Number(activeTrajectory.maxDv.toFixed(2)) || shipState.propulsion.totalDV <= 0)
      : true
  );
</script>

<TerminalPanel title="TRANSIT COMPUTER">
  
  <div class="stat-row">
    <span>ORIGIN:</span>
    <span style="color: var(--text-main); text-align: right; padding-left: 1rem;">
      {originPoi.name.toUpperCase()}
    </span>
  </div>

  <div class="form-group" style="margin-bottom: 1rem;">
    <span class="stat-row" style="margin-bottom: 4px;">DESTINATION:</span>
    <TerminalSelect
      id="target-select"
      options={destinationOptions}
      bind:value={selectedTargetObj}
      labelKey="label"
      placeholder="SELECT TARGET..."
      popupSide="left"
      showPopup={false}     onSelect={(item: any) => targetPoiId = item.id}
    />
  </div>

  {#if targetPoi && activeTrajectory}
    <div class="stat-row"><span>TRAVEL TIME:</span><span>{activeTrajectory.realisticTime.toFixed(2)} d</span></div>
    <div class="stat-row"><span>BURNOUT DV:</span><span>{activeTrajectory.idealDv.toFixed(2)} km/s</span></div>
    <div class="stat-row"><span>AVAILABLE DV:</span><span style="color: {hasInsufficientDV ? 'var(--accent-red)' : 'var(--text-main)'};">{shipState.propulsion.totalDV.toFixed(2)} km/s</span></div>

    <div class="fuel-config-box">
      <label class="config-label">
        <input type="checkbox" bind:checked={useMaxFuelLimit} />
        <span>CONSTRAINT MANEUVER DELTA-V</span>
      </label>
      {#if useMaxFuelLimit}
        <div class="input-row">
          <input 
            type="text" 
            placeholder="{activeTrajectory.maxDv.toFixed(1)}" 
            bind:value={userCustomDv} 
            oninput={() => {
              const parsedVal = parseFloat(userCustomDv);
              if (!isNaN(parsedVal) && parsedVal > shipState.propulsion.totalDV) {
                userCustomDv = Math.max(0, shipState.propulsion.totalDV).toFixed(2);
              }
            }}
            class="terminal-input" 
          />
          <span class="unit-tag">KM/S</span>
        </div>
      {/if}
    </div>

    {#if !campaignState.isPreviewing}
      <button class="btn-action" style="width: 100%; margin-top: 1rem;"
        onclick={() => {
          campaignState.isPreviewing = true; 
          campaignState.previewElapsed = 0; 
          campaignState.previewTravelTime = activeTrajectory.realisticTime;
        }}>PREVIEW BURN</button>

      <button 
        class="btn-action" 
        style="width: 100%; margin-top: 10px;"
        disabled={hasInsufficientDV}
        onclick={async () => {
          campaignState.initiateTransit({
            originName: originPoi.id, targetName: targetPoi.id, launchDay: campaignState.currentDay,
            travelTime: activeTrajectory.realisticTime, daysElapsed: 0, reqDv: activeTrajectory.maxDv,
            telemetry: activeTrajectory.telemetry 
          });
          onConfirmLaunch();
          await dbState.syncTimelineToCloud();
        }}>
        {hasInsufficientDV ? 'INSUFFICIENT DELTA-V' : 'CONFIRM LAUNCH'}
      </button>
    {/if}
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
  .form-group {
    display: flex;
    flex-direction: column;
  }
  .fuel-config-box {
    margin-top: 10px;
    padding-top: 10px;
  }
  .config-label {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 0.75rem;
    color: var(--text-dim);
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

  .config-label input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    margin: 0;
    width: 1em;
    height: 1em;
    border: 1px solid var(--text-dim);
    background-color: var(--bg-void);
    border-radius: 0;
    cursor: pointer;
    display: grid;
    place-content: center;
  }

  .config-label input[type="checkbox"]:checked {
    border-color: var(--accent-amber);
  }

  .config-label input[type="checkbox"]::before {
    content: '';
    width: 0.6em;
    height: 0.6em;
    background-color: var(--accent-amber);
    transform: scale(0);
    transition: transform 0.1s ease-in-out;
  }

  .config-label input[type="checkbox"]:checked::before {
    transform: scale(1);
  }
</style>