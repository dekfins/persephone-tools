<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import { shipCodec } from '../../lib/shipCodec';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let twr = $derived(shipState.propulsion.activeConfig?.twrG || 0);
  let totalDV = $derived(shipState.propulsion.totalDV);

  let fileInput: HTMLInputElement;

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      shipCodec.importFromFile(target.files[0]);
      target.value = '';
    }
  }
</script>

<TerminalPanel title={shipState.blueprint.name || "UNNAMED SHIP"} extraClass="vitals-panel">
  <div class="vitals-grid">
    <div class="vital-cell">
      <span class="vital-label">HP</span>
      <span class="vital-value accent {shipState.vitals.currentHealth <= (shipState.blueprint.totalHealth / 4) ? 'error' : ''}">
        {shipState.vitals.currentHealth}/{shipState.blueprint.totalHealth}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">RI</span>
      <span class="vital-value accent {shipState.vitals.currentRI <= 2 ? 'error' : ''}">
        {shipState.vitals.currentRI}/{shipState.blueprint.reactor?.reactorIntegrity || 6}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">ARMOR</span>
      <span class="vital-value">{shipState.blueprint.totalArmor}</span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">AC</span>
      <span class="vital-value">{shipState.blueprint.totalArmorClass}</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">CARGO</span>
      <span class="vital-value">{shipState.blueprint.totalCargo}t</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">CREW</span>
      <span class="vital-value">
        {shipState.blueprint.currentMinCrew === shipState.blueprint.currentMaxCrew ? shipState.blueprint.currentMinCrew : `${shipState.blueprint.currentMinCrew}/${shipState.blueprint.currentMaxCrew}`}
      </span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">SPEED</span>
      <span class="vital-value">{shipState.blueprint.totalSpeed}</span>
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
      <span class="vital-value {shipState.blueprint.usedPower > shipState.blueprint.totalPower ? 'error' : ''}">
        {Math.round(shipState.blueprint.usedPower * 10) / 10}/{Math.round(shipState.blueprint.totalPower * 10) / 10}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">MASS</span>
      <span class="vital-value {shipState.blueprint.usedMass > shipState.blueprint.totalMass ? 'error' : ''}">
        {Math.round(shipState.blueprint.usedMass * 10) / 10}/{Math.round(shipState.blueprint.totalMass * 10) / 10}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">HPTS</span>
      <span class="vital-value {shipState.blueprint.usedHardpoints > shipState.blueprint.totalHardpoints ? 'error' : ''}">
        {shipState.blueprint.usedHardpoints}/{shipState.blueprint.totalHardpoints}
      </span>
    </div>
</div>
  <div class="io-controls">
    <button class="btn-action" onclick={() => shipCodec.exportToFile()}>EXPORT SHIP</button>
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