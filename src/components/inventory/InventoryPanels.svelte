<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import ShipInventoryPanel from './ShipInventoryPanel.svelte';
  import PersonalInventoryPanel from './PersonalInventoryPanel.svelte';
</script>

{#if dbState.activeCharacter}
  <div class="inventory-header">
    <h2 style="color: var(--ui-cyan); font-family: var(--font-terminal); margin: 0;">LOGISTICS & INVENTORY</h2>
    <div class="user-badge">
      <span class="label">AUTHORIZED USER:</span>
      <span class="value">{dbState.activeCharacter.name} [{dbState.activeCharacter.role}]</span>
    </div>
  </div>

  <div class="inventory-grid">
    
    <div class="col-stack">
      <ShipInventoryPanel />
    </div>

    <div class="col-stack">
      <PersonalInventoryPanel />
    </div>

  </div>
{:else}
  <div class="terminal-alert">NO ACTIVE USER AUTHORIZED. PLEASE LOGIN.</div>
{/if}

<style>
  .inventory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--ui-cyan);
    padding-bottom: 1rem;
  }
  .inventory-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 2rem;
  }

  .user-badge .label { color: var(--text-dim); font-size: 0.8rem; margin-right: 0.5rem; }
  .user-badge .value { color: var(--ui-cyan); font-weight: bold; }
  
  :global(.wallet-box) {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem;
    margin-bottom: 2rem;
  }
  :global(.stat-row) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-family: var(--font-terminal, monospace);
  }
  :global(.label-text) { color: var(--text-dim); font-size: 0.85rem; }
  
  :global(.section-title) {
    color: var(--text-dim);
    font-family: var(--font-terminal, monospace);
    font-size: 0.9rem;
    border-bottom: 1px dashed var(--text-dim);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }

  :global(.item-list) {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.item-row) {
    display: grid;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
  }

  :global(.item-row-main) {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0;
  }

  :global(.item-row-main.no-toggle) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  :global(.item-details) {
    display: flex;
    flex-direction: column;
    font-family: var(--font-terminal, monospace);
    min-width: 0;
  }

  :global(.item-name) {
    font-weight: bold;
    font-size: 0.9rem;
  }

  :global(.item-meta) {
    color: var(--text-dim);
    font-size: 0.75rem;
    margin-top: 0.2rem;
  }
  
  :global(.empty-state) {
    color: var(--text-dim) !important;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  :global(.btn-action-red) {
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    background: transparent;
  }

  :global(.btn-action-red:hover) {
    background: var(--accent-red);
    color: var(--bg-dark, #0b0e14);
  }

  @media (max-width: 900px) {
    .inventory-header {
      display: grid;
      gap: 0.75rem;
    }

    .inventory-grid {
      grid-template-columns: 1fr;
    }

    :global(.item-row-main),
    :global(.item-row-main.no-toggle) {
      grid-template-columns: 1fr;
    }
  }
</style>
