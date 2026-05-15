<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  // 1. The "Lookup" Logic
  let activeConfig = $derived.by(() => {
    if (!shipState.engine || !shipState.activeFuel || !shipState.activeMode) return null;
    
    // Scan the hardware configurations for the exact match
    return shipState.engine.configs.find(
      (c: any) => c.fuel === shipState.activeFuel && c.mode === shipState.activeMode
    ) || null;
  });

  // 2. The Derived Stats
  let twr = $derived(activeConfig?.twrG || 0);
  
  let totalDV = $derived(
    Math.round((activeConfig?.efficiency || 0) * (shipState.currentFuel || 0))
  );
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
  </div>
</TerminalPanel>

<style>
  /* --- 3x3 GRID LAYOUT --- */
  .vitals-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* Forces exactly 3 equal columns */
    border: 1px solid var(--text-dim);
    background: rgba(0, 0, 0, 0.2);
  }

  .vital-cell {
    display: flex;
    flex-direction: column;
    align-items: center;      /* Centers content horizontally */
    justify-content: center;  /* Centers content vertically */
    padding: 0.75rem 0.5rem;
    border: 1px solid var(--text-dim); /* Internal grid lines */
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
</style>