<script lang="ts">
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import DualRangeSlider from './DualRangeSlider.svelte';
  import { campaignState } from '../../lib/states/campaignState.svelte';
  import { shipState } from '../../lib/states/shipState.svelte';
  import poisData from '../../data/celestial/pois.json';

  const pois = poisData as any[];

  let { 
    diffMin = $bindable(), 
    diffMax = $bindable(), 
    isScanning,
    onScan,
    onWebhook,
    hasJobs,
  } = $props<{
    diffMin: number,
    diffMax: number,
    isScanning: boolean,
    onScan: () => void,
    onWebhook: () => void,
    hasJobs: boolean,
  }>();

  // Auto-resolve current location name
  let originName = $derived(
    pois.find(p => p.id === campaignState.shipLocation)?.name || "UNKNOWN"
  );
</script>

<TerminalPanel title="LOCAL JOB BOARD">
  <div class="stat-row">
    <span class="label-text">CURRENT LOCATION:</span>
    <span class="value-text">{originName.toUpperCase()}</span>
  </div>
  <div class="stat-row">
    <span class="label-text">AVAILABLE DV:</span>
    <span class="value-text" style="color: var(--ui-cyan)">{shipState.propulsion.totalDV.toFixed(0)} km/s</span>
  </div>

  <hr class="dim-divider" />

  <DualRangeSlider bind:min={diffMin} bind:max={diffMax} />

  <div class="action-buttons">
    <button class="btn-action btn-action-alert" onclick={onScan} disabled={isScanning}>
      {isScanning ? "SCANNING..." : "SCAN FOR JOBS"}
    </button>

    <button class="btn-action" onclick={onWebhook} disabled={!hasJobs}>
      SEND TO WEBHOOK
    </button>
  </div>
</TerminalPanel>

<style>
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
  
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 2rem; /* Added margin to separate from slider */
  }

  .btn-action-alert {
    color: var(--accent-amber);
    border-color: var(--accent-amber);
  }

  .btn-action-alert:hover {
    background: var(--accent-amber) !important;
    color: #000 !important;
  }
</style>