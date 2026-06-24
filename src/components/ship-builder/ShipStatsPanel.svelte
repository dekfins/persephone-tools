<script lang="ts">
  import { createShipState } from '../../lib/states/shipState.svelte';
  import { shipCodec } from '../../lib/ship/shipCodec';
  import type { MasterShipState } from '../../lib/states/shipState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';
  
  let {
    shipyardState: localState = createShipState()
  }: {
    shipyardState?: MasterShipState;
  } = $props();

  const shipyardStats = $derived([
    { label: 'POWER', used: localState.blueprint.usedPower, total: localState.blueprint.totalPower, id: 'power-grid' },
    { label: 'MASS', used: localState.blueprint.usedMass, total: localState.blueprint.totalMass, id: 'mass-grid' },
    { label: 'HARDPOINTS', used: localState.blueprint.usedHardpoints, total: localState.blueprint.totalHardpoints, id: 'hardpoint-grid' }
  ]);

  const crewLabel = $derived(
    localState.blueprint.currentMinCrew === localState.blueprint.currentMaxCrew 
      ? `${localState.blueprint.currentMinCrew}`
      : `${localState.blueprint.currentMinCrew}/${localState.blueprint.currentMaxCrew}`
  );

  const shipStatGrid = $derived([
    { label: 'HP', value: `${localState.blueprint.totalHealth}` },
    { label: 'AC', value: `${localState.blueprint.totalArmorClass}` },
    { label: 'ARMOR', value: `${localState.blueprint.totalArmor}` },
    { label: 'SPEED', value: `${localState.blueprint.totalSpeed}` },
    { label: 'CREW', value: crewLabel },
    { label: 'COST', value: `${localState.blueprint.totalCost.toLocaleString()} CR` }
  ]);

  let fileInput: HTMLInputElement;

  async function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      try {
        await shipCodec.importFromFile(input.files[0], localState);
      } finally {
        input.value = ''; 
      }
    }
  }
</script>

<TerminalPanel title={localState.blueprint.name}>
  <div class="shipyard-progress">
    {#each shipyardStats as stat}
      <div class="progress-bar">
        <div class="progress-header">
          <span>{stat.label}</span>
          <span class="value-readout" class:error={stat.used > stat.total}>
            {stat.used}/{stat.total}
          </span>
        </div>

        <div class="progress-container">
          <div 
            class="progress-fill" 
            id={stat.id}
            style="width: {Math.min((stat.used / (stat.total || 1)) * 100, 100)}%"
            class:overloaded={stat.used > stat.total}
          ></div>
        </div>
      </div>
    {/each}
  </div>

  <div class="stats-wrap">
    <TerminalStatGrid items={shipStatGrid} columns={2} />
  </div>
  
<div class="terminal-controls">
  <button class="btn-action" onclick={() => shipCodec.exportToFile(localState)}>
    EXPORT SHIP
  </button>

  <button class="btn-action" onclick={() => fileInput.click()}>
    IMPORT SHIP
  </button>

  <input 
    type="file" 
    accept=".deimos" 
    bind:this={fileInput} 
    onchange={handleImport} 
    style="display: none;" 
  />
</div>

</TerminalPanel>

<style>
  .shipyard-progress {
    display: grid;
    gap: 1.5rem;
    padding: 0.75rem;
    background: var(--bg-void);
    border: var(--border-subtle);
  }

  .progress-container {
    width: 100%;
    height: 12px;
    background: var(--bg-void);
    border: 1px solid var(--text-dim);
    position: relative;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    width: var(--progress);
    background-color: var(--fill-color);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .progress-bar {
    display: grid;
    gap: 0.3rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  /* Color Overrides */
  #power-grid { --fill-color: #fcff49; }
  #mass-grid  { --fill-color: #60a5fa; }
  #hardpoint-grid    { --fill-color: #f87171; }

  .value-readout {
    color: var(--accent-amber);
  }

  .value-readout.error {
    color: var(--accent-red);
  }

  .progress-fill.overloaded {
    background-color: #ff2020 !important;
  }

  .terminal-controls {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

</style>
