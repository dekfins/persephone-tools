<script lang="ts">
  import { shipState } from '../lib/shipState.svelte';
  import { shipCodec } from '../lib/shipCodec';

  const shipyardStats = $derived([
    { label: 'POWER', used: shipState.usedPower, total: shipState.totalPower, id: 'power-grid' },
    { label: 'MASS', used: shipState.usedMass, total: shipState.totalMass, id: 'mass-grid' },
    { label: 'HARDPOINTS', used: shipState.usedHardpoints, total: shipState.totalHardpoints, id: 'hardpoint-grid' }
  ]);

  let fileInput: HTMLInputElement;

  function handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      shipCodec.importFromFile(input.files[0]);
      
      // Reset the input so the user can import the same file again if needed
      input.value = ''; 
    }
  }
</script>

<div class="terminal-card">
  <h3>{shipState.name}</h3>

  {#each shipyardStats as stat}
  <div class="progress-bar">
    <div class="progress-header">
      <span>{stat.label}</span>
      <span class="value-readout" class:error={stat.used > stat.total}>
        [{stat.used}/{stat.total}]
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

  <div class="terminal-alert {shipState.remainingMass < 0 || shipState.remainingPower < 0 || shipState.remainingHardpoints < 0 ? 'error' : ''}">
    STATUS: {shipState.remainingMass < 0 || shipState.remainingPower < 0 || shipState.remainingHardpoints < 0 ? 'OVERLOAD' : 'NOMINAL'}
  </div>

  <ul>
    <li>HP: {shipState.totalHealth}</li>
    <li>COST: {shipState.totalCost.toLocaleString()} CR</li>
    <li>ARMOR: {shipState.totalArmor}</li>
    <li>AC: {shipState.totalArmorClass}</li>
    <li>
      CREW: {shipState.currentMinCrew === shipState.currentMaxCrew 
        ? shipState.currentMinCrew 
        : `${shipState.currentMinCrew}/${shipState.currentMaxCrew}`}
    </li>
    <li>SPEED: {shipState.totalSpeed}</li>
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
</div>

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
    width: var(--progress); /* Controlled by Svelte inline style */
    background-color: var(--fill-color);
    
    /* THIS is what makes it smooth in Zen/Firefox! */
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Color Overrides */
  #power-grid { --fill-color: #fcff49; }
  #mass-grid  { --fill-color: #60a5fa; }
  #hardpoint-grid    { --fill-color: #f87171; }

  .value-readout.error {
    color: var(--accent-red);
  }

  /* This targets the bar itself when it hits 100%+ */
  .progress-fill.overloaded {
    background-color: #ff2020 !important;
  }

  /* --- ALERTS --- */
  .terminal-alert {
    padding: 0.5rem;
    border: 1px solid var(--accent-amber);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
    color: var(--accent-amber);
    text-align: center;
    font-weight: bold;
  }

  .terminal-alert.error {
    border-color: var(--accent-red);
    color: var(--accent-red);
    animation: pulse 2s infinite;
  }

  .terminal-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .btn-action {
    background: transparent;
    color: var(--ui-cyan, #00aacc);
    border: 1px solid var(--ui-cyan, #00aacc);
    padding: 0.8rem 1rem;
    font-family: monospace;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-action:hover {
    background: var(--ui-cyan, #00aacc);
    color: var(--bg-dark, #0b0e14);
    border: 1px solid var(--ui-cyan, #00aacc);
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  
</style>