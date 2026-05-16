<script lang="ts">
  // 1. Import shipCodec alongside shipState
  import { shipState } from '../../lib/shipState.svelte';
  import { shipCodec } from '../../lib/shipCodec'
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let activeConfig = $derived.by(() => {
    if (!shipState.engine || !shipState.activeFuel || !shipState.activeMode) return null;
    
    return shipState.engine.configs.find(
      (c: any) => c.fuel === shipState.activeFuel && c.mode === shipState.activeMode
    ) || null;
  });

  let twr = $derived(activeConfig?.twrG || 0);
  
  let totalDV = $derived.by(() => {
    if (!activeConfig || !activeConfig.propellants || activeConfig.propellants.length === 0) return 0;

    let potentialDVs = activeConfig.propellants.map((prop: any) => {
      const loadedCells = shipState.currentFuel[prop.name] || 0;
      return loadedCells * prop.efficiency;
    });

    return Math.round(Math.min(...potentialDVs));
  });

  // 2. File Import Handling
  let fileInput: HTMLInputElement;

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      shipCodec.importFromFile(target.files[0]);
      // Reset the input so the same file can be uploaded again if needed
      target.value = ''; 
    }
  }
</script>

<TerminalPanel title={shipState.name || "UNNAMED SHIP"} extraClass="vitals-panel">
  <div class="vitals-grid">
    <div class="vital-cell">
      <span class="vital-label">HP</span>
      <span class="vital-value accent {shipState.currentHealth <= (shipState.totalHealth / 4) ? 'error' : ''}">
        {shipState.currentHealth}/{shipState.totalHealth}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">RI</span>
      <span class="vital-value accent {shipState.currentRI <= 2 ? 'error' : ''}">
        {shipState.currentRI}/{shipState.reactor?.reactorIntegrity || 6}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">ARMOR</span>
      <span class="vital-value">{shipState.totalArmor}</span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">AC</span>
      <span class="vital-value">{shipState.totalArmorClass}</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">CARGO</span>
      <span class="vital-value">{shipState.totalCargo}t</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">CREW</span>
      <span class="vital-value">
        {shipState.currentMinCrew === shipState.currentMaxCrew ? shipState.currentMinCrew : `${shipState.currentMinCrew}/${shipState.currentMaxCrew}`}
      </span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">SPEED</span>
      <span class="vital-value">{shipState.totalSpeed}</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">TWR</span>
      <span class="vital-value">{twr}</span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">DV</span>
      <span class="vital-value">{totalDV}</span>
    </div>

    <div class="vital-cell">
      <span class="vital-label">POWER</span>
      <span class="vital-value {shipState.usedPower > shipState.totalPower ? 'error' : ''}">
        {Math.round(shipState.usedPower * 10) / 10}/{Math.round(shipState.totalPower * 10) / 10}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">MASS</span>
      <span class="vital-value {shipState.usedMass > shipState.totalMass ? 'error' : ''}">
        {Math.round(shipState.usedMass * 10) / 10}/{Math.round(shipState.totalMass * 10) / 10}
      </span>
    </div>
    <div class="vital-cell">
      <span class="vital-label">HPTS</span>
      <span class="vital-value {shipState.usedHardpoints > shipState.totalHardpoints ? 'error' : ''}">
        {shipState.usedHardpoints}/{shipState.totalHardpoints}
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
    font-size: 1.15rem;
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