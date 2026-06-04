<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { ItemRecord } from '../../lib/types';
  import EquipmentItemList, { type EquipmentItemListRow } from '../shared/EquipmentItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let personalInventoryRows = $derived(dbState.personalInventory.map(toEquipmentRow));

  function moveToShip(itemId: string) {
    dbState.transferItem(itemId, "SHIP_INVENTORY");
  }

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

{#snippet itemActions(item: EquipmentItemListRow)}
  <div class="item-actions">
    {#if dbState.activeCharacter?.role === 'GM'}
      <button class="btn-action-red btn-compact" onclick={() => dbState.deleteItem(item.id)}>
        X
      </button>
    {/if}

    {#if !dbState.isLocalCharacterPreview}
      <button class="btn-action btn-compact" onclick={() => moveToShip(item.id)}>
        STOW
      </button>
    {/if}
  </div>
{/snippet}

<TerminalPanel title="PERSONAL LOADOUT: {dbState.activeCharacter?.name || 'UNKNOWN'}" extraClass="ledger-panel">
  <div class="wallet-box">
    <div class="stat-row">
      <span class="label-text">PERSONAL WALLET:</span>
      <span class="value-text" style="color: var(--accent-amber); font-size: 1.2rem;">
        {dbState.activeCharacter?.personal_credits.toLocaleString() || 0} CR
      </span>
    </div>
    <div class="stat-row">
      <span class="label-text">RAD STACKS:</span>
      <span class="value-text" style="color: {(dbState.activeCharacter?.rads || 0) > 4 ? 'var(--accent-red)' : 'var(--ui-bright)'};">
        {dbState.activeCharacter?.rads || 0} / 10
      </span>
    </div>
  </div>

  {#if dbState.isLocalCharacterPreview}
    <div class="terminal-alert">ARCHIVE PREVIEW LOADOUT - NOT SYNCED TO CARGO</div>
  {/if}

  <h3 class="section-title">BACKPACK</h3>
  <EquipmentItemList
    items={personalInventoryRows}
    emptyMessage="BACKPACK EMPTY"
    rowActions={itemActions}
  />
</TerminalPanel>
