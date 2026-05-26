<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import { shipCodec } from '../../lib/shipCodec';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  const shipyardStats = $derived([
    { label: 'POWER', used: shipState.blueprint.usedPower, total: shipState.blueprint.totalPower, id: 'power-grid' },
    { label: 'MASS', used: shipState.blueprint.usedMass, total: shipState.blueprint.totalMass, id: 'mass-grid' },
    { label: 'HARDPOINTS', used: shipState.blueprint.usedHardpoints, total: shipState.blueprint.totalHardpoints, id: 'hardpoint-grid' }
  ]);

  let fileInput: HTMLInputElement;

  function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      shipCodec.importFromFile(input.files[0]);
      input.value = ''; 
    }
  }
</script>

<TerminalPanel title={shipState.blueprint.name}>
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

  <div class="terminal-alert {shipState.blueprint.remainingMass < 0 || shipState.blueprint.remainingPower < 0 || shipState.blueprint.remainingHardpoints < 0 ? 'error' : ''}">
    STATUS: {shipState.blueprint.remainingMass < 0 || shipState.blueprint.remainingPower < 0 || shipState.blueprint.remainingHardpoints < 0 ? 'OVERLOAD' : 'NOMINAL'}
  </div>

  <ul>
    <li>HP: {shipState.blueprint.totalHealth}</li>
    <li>COST: {shipState.blueprint.totalCost.toLocaleString()} CR</li>
    <li>ARMOR: {shipState.blueprint.totalArmor}</li>
    <li>AC: {shipState.blueprint.totalArmorClass}</li>
    <li>
      CREW: {shipState.blueprint.currentMinCrew === shipState.blueprint.currentMaxCrew 
        ? shipState.blueprint.currentMinCrew 
        : `${shipState.blueprint.currentMinCrew}/${shipState.blueprint.currentMaxCrew}`}
    </li>
    <li>SPEED: {shipState.blueprint.totalSpeed}</li>
  </ul>
  
  <div class="terminal-controls">
    <button class="btn-action" onclick={() => shipCodec.exportToFile()}>
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
  /* The track (background) */
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
    margin-bottom: 1.2rem;
  }

  .progress-header {
    display: flex;
    justify-content: flex;
    margin-bottom: 0.rem;
    font-size: 0.9rem;
  }

  /* Color Overrides */
  #power-grid { --fill-color: #fcff49; }
  #mass-grid  { --fill-color: #60a5fa; }
  #hardpoint-grid    { --fill-color: #f87171; }

  .value-readout.error {
    color: var(--accent-red);
  }

  .progress-fill.overloaded {
    background-color: #ff2020 !important;
  }

  .terminal-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  /* --- LAYOUT SPACING FIXES --- */
  
  /* Un-squish the progress bars */
  .progress-bar {
    margin-bottom: 0.5rem;
  }

  /* Spread the label and the [used/total] numbers apart */
  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.3rem;
  }

  /* Un-squish the stat list at the bottom */
  ul {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0; /* Adds space above and below the list */
  }
</style>