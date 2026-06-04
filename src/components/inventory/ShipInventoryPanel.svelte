<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { crewState } from '../../lib/states/crewState.svelte';
  import type { ItemRecord } from '../../lib/types';
  import EquipmentItemList, { type EquipmentItemListRow } from '../shared/EquipmentItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let shipInventoryRows = $derived(dbState.shipInventory.map(toEquipmentRow));

  function moveToPlayer(itemId: string) {
    dbState.transferItem(itemId, dbState.activeUserId);
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

    <button class="btn-action btn-compact" onclick={() => moveToPlayer(item.id)}>
      TAKE
    </button>
  </div>
{/snippet}

<TerminalPanel title="TEST SHIP" extraClass="ledger-panel">
  <div class="wallet-box">
    <div class="stat-row">
      <span class="label-text">SLUSH FUND:</span>
      <span class="value-text" style="color: var(--fighter-green); font-size: 1.2rem;">
        {crewState.shipCredits.toLocaleString()} CR 
      </span>
    </div>
    <div class="stat-row">
      <span class="label-text">KIBBLE RESERVES:</span>
      <span class="value-text">{crewState.kibbleDays} DAYS</span>
    </div>
  </div>

  <h3 class="section-title">CARGO HOLD</h3>
  <EquipmentItemList
    items={shipInventoryRows}
    emptyMessage="CARGO HOLD EMPTY"
    rowActions={itemActions}
  />
</TerminalPanel>
