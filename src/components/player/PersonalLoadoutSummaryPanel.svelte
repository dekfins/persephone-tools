<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { ItemRecord } from '../../lib/types';
  import EquipmentItemList, { type EquipmentItemListRow } from '../shared/EquipmentItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let personalInventoryRows = $derived(dbState.personalInventory.map(toEquipmentRow));
  let totalEncumbrance = $derived(
    dbState.personalInventory.reduce((total, item) => total + item.mass * item.quantity, 0)
  );

  function toEquipmentRow(item: ItemRecord): EquipmentItemListRow {
    return {
      id: item.id,
      equipmentId: item.equipment_id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      quantity: item.quantity,
      mass: item.mass
    };
  }
</script>

<TerminalPanel title="PERSONAL LOADOUT" extraClass="player-panel">
  {#if dbState.activeCharacter}
    <div class="loadout-stats">
      <div>
        <span>WALLET</span>
        <strong>{dbState.activeCharacter.personal_credits.toLocaleString()} CR</strong>
      </div>
      <div>
        <span>ITEMS</span>
        <strong>{personalInventoryRows.length}</strong>
      </div>
      <div>
        <span>ENC</span>
        <strong>{totalEncumbrance}</strong>
      </div>
    </div>

    {#if dbState.isLocalCharacterPreview}
      <div class="terminal-alert">ARCHIVE PREVIEW LOADOUT - NOT SYNCED TO CARGO</div>
    {/if}

    <EquipmentItemList
      items={personalInventoryRows}
      emptyMessage="PERSONAL LOADOUT EMPTY"
    />
  {:else}
    <div class="terminal-alert">AWAITING LOADOUT DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .loadout-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .loadout-stats div {
    display: grid;
    gap: 0.25rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.55rem;
    font-family: var(--font-terminal);
  }

  span {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  strong {
    color: var(--accent-amber);
    overflow-wrap: anywhere;
  }

  @media (max-width: 700px) {
    .loadout-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
