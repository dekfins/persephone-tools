<script lang="ts">
  import { shipState } from '../../lib/states/shipState.svelte';
  import { shipCodec } from '../../lib/shipCodec';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  
  // Create local state instance for this component
  const localState = shipState;

  let twr = $derived(localState.propulsion.activeConfig?.twrG || 0);
  let totalDV = $derived(localState.propulsion.totalDV);

  let fileInput: HTMLInputElement;

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      shipCodec.importFromFile(target.files[0], localState);
      target.value = '';
    }
  }
</script>

<TerminalPanel title={localState.blueprint.name || "UNNAMED SHIP"} extraClass="vitals-panel">
  <div class="vitals-grid">
    <div class="vital-cell">
      <span class="vital-label">HP</span>
      <span class="vital-value accent {localState.vitals.currentHealth <= (localState.blueprint.totalHealth / 4) ? 'error' : ''}">
        {localState.vitals.currentHealth}/{localState.blueprint.totalHealth}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">RI</span>
      <span class="vital-value accent {localState.vitals.currentRI <= 2 ? 'error' : ''}">
        {localState.vitals.currentRI}/{localState.blueprint.reactor?.reactorIntegrity || 6}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">ARMOR</span>
      <span class="vital-value">{localState.blueprint.totalArmor}</span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">AC</span>
      <span class="vital-value">{localState.blueprint.totalArmorClass}</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">CARGO</span>
      <span class="vital-value">{localState.blueprint.totalCargo}t</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">CREW</span>
      <span class="vital-value">
        {localState.blueprint.currentMinCrew === localState.blueprint.currentMaxCrew ? localState.blueprint.currentMinCrew : `${localState.blueprint.currentMinCrew}/${localState.blueprint.currentMaxCrew}`}
      </span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">SPEED</span>
      <span class="vital-value">{localState.blueprint.totalSpeed}</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">TWR</span>
      <span class="vital-value">{twr}</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">DV</span>
      <span class="vital-value">{Math.round(totalDV)}</span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">POWER</span>
      <span class="vital-value {localState.blueprint.usedPower > localState.blueprint.totalPower ? 'error' : ''}">
        {Math.round(localState.blueprint.usedPower * 10) / 10}/{Math.round(localState.blueprint.totalPower * 10) / 10}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">MASS</span>
      <span class="vital-value {localState.blueprint.usedMass > localState.blueprint.totalMass ? 'error' : ''}">
        {Math.round(localState.blueprint.usedMass * 10) / 10}/{Math.round(localState.blueprint.totalMass * 10) / 10}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">HPTS</span>
      <span class="vital-value {localState.blueprint.usedHardpoints > localState.blueprint.totalHardpoints ? 'error' : ''}">
        {localState.blueprint.usedHardpoints}/{localState.blueprint.totalHardpoints}
      </span>
    </div>
  </div>
  <div class="io-controls">
    <button class="btn-action" onclick={() => shipCodec.exportToFile(localState)}>EXPORT SHIP</button>
    <button class="btn-action" onclick={() => fileInput.click()}>IMPORT SHIP</button>
    
    <input 
      type="file" 
      accept=".deimos" 
      bind:this={fileInput} 
      onchange={handleFileUpload} 
      style="display: none;" 
    />
  </div>
</TerminalPanel>

<style>
  /* --- 3x3 GRID LAYOUT --- */
  .vitals-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--text-dim);
    background: rgba(0, 0, 0, 0.2);
    margin-bottom: 1rem; /* Space before buttons */
  }

  .vital-cell {
    display: flex;
    flex-direction: column;
    align-items: center;      
    justify-content: center;  
    padding: 0.5rem 0.5rem;
    border: 1px solid var(--text-dim); 
    text-align: center;
  }

  .vital-label {
    color: var(--text-dim);
    font-size: 0.85rem;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
    letter-spacing: 0.05em;
  }

  .vital-value {
    font-size: 1rem;
    font-weight: bold;
    color: var(--text-main);
  }

  .vital-value.accent {
    color: var(--accent-amber);
  }

  .vital-value.error {
    color: var(--accent-red);
    animation: pulse 2s infinite;
  }

  @keyframes pulse { 
    0% { opacity: 1; } 
    50% { opacity: 0.5; } 
    100% { opacity: 1; } 
  }

  /* --- I/O CONTROLS --- */
  .io-controls {
    display: flex;
    gap: 1rem;
    width: 100%;
  }
</style>