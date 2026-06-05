<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { ItemRecord } from '../../lib/types';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';

  let personalInventoryRows = $derived(dbState.personalInventory.map(toEquipmentRow));
  let totalEncumbrance = $derived(
    dbState.personalInventory.reduce((total, item) => total + item.mass * item.quantity, 0)
  );
  let loadoutStats = $derived(dbState.activeCharacter ? [
    { label: 'WALLET', value: `${dbState.activeCharacter.personal_credits.toLocaleString()} CR` },
    { label: 'ITEMS', value: personalInventoryRows.length },
    { label: 'ENC', value: totalEncumbrance }
  ] : []);

  function toEquipmentRow(item: ItemRecord): TerminalItemListRow {
    return {
      id: item.id,
      equipmentId: item.equipment_id,
      itemState: item.item_state,
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
    <TerminalStatGrid items={loadoutStats} columns={3} />

    {#if dbState.isLocalCharacterPreview}
      <div class="terminal-alert">ARCHIVE PREVIEW LOADOUT - NOT SYNCED TO CARGO</div>
    {/if}

    <TerminalItemList
      items={personalInventoryRows}
      emptyMessage="PERSONAL LOADOUT EMPTY"
    />
  {:else}
    <div class="terminal-alert">AWAITING LOADOUT DATA...</div>
  {/if}
</TerminalPanel>

<style>
</style>
