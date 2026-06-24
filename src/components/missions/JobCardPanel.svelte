<script lang="ts">
  import type { GeneratedMission } from '../../lib/types';
  import { shipState } from '../../lib/states/shipState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import poisData from '../../data/celestial/pois.json';
  import type { PoiDef } from '../../lib/types';

  const pois = poisData as PoiDef[];

  let { job, onAccept }: { 
    job: GeneratedMission; 
    onAccept: (mission: GeneratedMission) => void 
  } = $props();

  let targetPoiName = $derived(pois.find(p => p.id === job.targetPoiId)?.name || job.targetPoiId);
  let availableDv = $derived(shipState.propulsion.totalDV);
  let hasEnoughFuel = $derived(availableDv > 0 && Number(availableDv.toFixed(2)) >= Number(job.reqDv.toFixed(2)));
</script>

<TerminalPanel title={targetPoiName.toUpperCase()} extraClass="job-card">
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
    <span style="color: {!hasEnoughFuel ? 'var(--accent-red)' : 'var(--ui-cyan)'}">
      {job.reqDv.toFixed(2)} km/s
    </span>
  </div>

  {#if !hasEnoughFuel}
    <div class="terminal-alert error fuel-alert">
      INSUFFICIENT FUEL FOR FILED BURN PLAN. AVAILABLE: {availableDv.toFixed(2)} KM/S
    </div>
  {/if}

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
      {#if job.lootReward}
        <br/>
        <span style="font-weight: normal;">+ </span>
        <span class="loot-{job.lootReward.rarity}">{job.lootReward.displayName.toUpperCase()}</span>
      {:else if job.lootItem}
        <br/>
        <span style="font-weight: normal;">+ </span>
        <span class="loot-{job.lootRarity}">{job.lootItem.toUpperCase()}</span>
      {/if}
    </span>
  </div>
  
  <button 
    class="btn-action btn-compact" 
    style="width: 100%; margin-top: 1rem;"
    disabled={!hasEnoughFuel}
    onclick={() => onAccept(job)}
  >
    {hasEnoughFuel ? 'ACCEPT CONTRACT' : 'INSUFFICIENT FUEL'}
  </button>
</TerminalPanel>

<style>
  .card-stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    color: var(--ui-cyan);
    font-family: var(--font-terminal, monospace);
  }

  .text-highlight {
    color: var(--text-main);
    text-align: right;
  }

  .fuel-alert {
    margin: 0.75rem 0 0;
    font-size: 0.72rem;
    line-height: 1.35;
  }

  :global(.job-card h3) {
    font-size: 1rem !important; 
    color: var(--accent-amber) !important;
  }

  .loot-common { color: var(--loot-common); }
  .loot-uncommon { color: var(--loot-uncommon); }
  .loot-rare { color: var(--loot-rare); }
  .loot-epic { color: var(--loot-epic); }
  .loot-legendary { color: var(--loot-legendary); }
</style>
