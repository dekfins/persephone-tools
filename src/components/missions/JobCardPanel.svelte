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
    <span style="color: {job.reqDv > shipState.propulsion.totalDV ? 'var(--accent-red)' : 'var(--ui-cyan)'}">
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
  
  <button 
    class="btn-action btn-compact" 
    style="width: 100%; margin-top: 1rem;"
    onclick={() => onAccept(job)}
  >
    ACCEPT CONTRACT
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

  :global(.job-card h3) {
    font-size: 1rem !important; 
    color: var(--ui-cyan) !important;
  }

  .loot-common { color: var(--loot-common); }
  .loot-uncommon { color: var(--loot-uncommon); }
  .loot-rare { color: var(--loot-rare); }
  .loot-epic { color: var(--loot-epic); }
  .loot-legendary { color: var(--loot-legendary); }
</style>
