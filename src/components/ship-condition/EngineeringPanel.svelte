<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  function adjustHP(amount: number) {
    shipState.currentHealth = Math.min(shipState.totalHealth, Math.max(0, shipState.currentHealth + amount));
  }

  function adjustRI(amount: number) {
    const maxRI = shipState.reactor?.reactorIntegrity || 6;
    shipState.currentRI = Math.min(maxRI, Math.max(0, shipState.currentRI + amount));
  }

  // Auto-initialize dropdowns when a new engine is installed
  $effect(() => {
    if (shipState.engine) {
      // DEFENSIVE FALLBACKS: If the engine is stale/old, treat it as an empty array
      const fuels = shipState.engine.availableFuels || [];
      const modes = shipState.engine.availableModes || [];

      // Type cast 'as string' prevents TS from complaining if activeFuel is null
      if (!fuels.includes(shipState.activeFuel as string)) {
        shipState.activeFuel = fuels[0] || null;
      }
      
      if (!modes.includes(shipState.activeMode as string)) {
        shipState.activeMode = modes[0] || null;
      }
    } else {
      shipState.activeFuel = null;
      shipState.activeMode = null;
    }
  });

  let maxFuelCells = $derived.by(() => {
    let cells = 0;
    for (const comp of shipState.components) {
      const name = (comp.item.fittingName || "").toLowerCase();
      if (name.includes("bunker") || name.includes("magazine")) cells += comp.quantity * 5;
      else if (name.includes("bottle")) cells += comp.quantity * 1;
    }
    return cells;
  });
</script>

<TerminalPanel title="Engineering Controls">
  <div class="eng-row">
    <span class="eng-label">HP OVERRIDE:</span>
    <div class="btn-group">
      <button class="btn-action slim" onclick={() => adjustHP(-1)}>-1</button>
      <button class="btn-action slim" onclick={() => adjustHP(1)}>+1</button>
    </div>
  </div>

  <div class="eng-row">
    <span class="eng-label">RI OVERRIDE:</span>
    <div class="btn-group">
      <button class="btn-action slim" onclick={() => adjustRI(-1)}>-1</button>
      <button class="btn-action slim" onclick={() => adjustRI(1)}>+1</button>
    </div>
  </div>

  <hr class="dim-divider" />

  <div class="eng-row">
    <span class="eng-label">FUEL TYPE:</span>
    {#if shipState.engine?.availableFuels}
      <select class="terminal-input" bind:value={shipState.activeFuel}>
        {#each shipState.engine.availableFuels as fuel}
          <option value={fuel}>{fuel}</option>
        {/each}
      </select>
    {:else}
      <span class="text-dim">N/A</span>
    {/if}
  </div>

  <div class="eng-row">
    <span class="eng-label">BURN MODE:</span>
    {#if shipState.engine?.availableModes}
      <select class="terminal-input" bind:value={shipState.activeMode}>
        {#each shipState.engine.availableModes as mode}
          <option value={mode}>{mode}</option>
        {/each}
      </select>
    {:else}
      <span class="text-dim">N/A</span>
    {/if}
  </div>

  <div class="eng-row">
    <div class="fuel-label-group">
      <span class="eng-label">ACTIVE FUEL CELLS:</span>
      <span class="text-dim" style="font-size: 0.75rem;">(MAX: {maxFuelCells})</span>
    </div>
    <input 
      type="number" 
      step="0.01" 
      min="0" 
      bind:value={shipState.currentFuel} 
      class="terminal-input num-input" 
    />
  </div>
</TerminalPanel>

<style>
  .eng-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }
  .eng-label {
    color: var(--text-dim);
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }
  .fuel-label-group {
    display: flex;
    flex-direction: column;
  }

  .btn-group {
    display: flex;
    gap: 0.5rem;
  }
  .btn-action.slim {
    padding: 0.2rem 0.8rem;
    font-size: 1rem;
    width: 45px;
    text-align: center;
  }

  .dim-divider {
    border: 0;
    border-bottom: 1px dashed var(--text-dim);
    margin: 1.2rem 0;
    opacity: 0.5;
  }

  .terminal-input {
    background: var(--bg-void);
    color: var(--ui-bright);
    border: 1px solid var(--ui-cyan);
    padding: 0.4rem;
    font-family: inherit;
    width: 150px;
  }
  .num-input {
    text-align: right;
    font-weight: bold;
    color: var(--accent-amber);
    font-size: 1.1rem;
  }
</style>