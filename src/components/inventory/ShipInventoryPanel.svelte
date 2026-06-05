<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { crewState } from '../../lib/states/crewState.svelte';
  import type { ItemRecord } from '../../lib/types';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';

  let shipInventoryRows = $derived(dbState.shipInventory.map(toEquipmentRow));
  let totalStoredItems = $derived(shipInventoryRows.reduce((total, item) => total + item.quantity, 0));
  let totalStoredEnc = $derived(
    shipInventoryRows.reduce((total, item) => total + (item.mass ?? 0) * item.quantity, 0)
  );
  let cargoStats = $derived([
    { label: 'SLUSH FUND', value: `${crewState.shipCredits.toLocaleString()} CR`, tone: 'credit' },
    { label: 'KIBBLE', value: `${crewState.kibbleDays} DAYS` },
    { label: 'CARGO', value: `${totalStoredItems} ITEMS` },
    { label: 'STORED ENC', value: totalStoredEnc }
  ]);

  function moveToPlayer(itemId: string) {
    dbState.transferItem(itemId, dbState.activeUserId);
  }

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

{#snippet itemActions(item: TerminalItemListRow)}
  {#if !dbState.isLocalCharacterPreview}
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
  {/if}
{/snippet}

<TerminalPanel title="SHIP STORES" extraClass="ledger-panel">
  <TerminalStatGrid items={cargoStats} columns={4} />

  <section class="cargo-section">
    <h3>STORED CARGO</h3>
    <TerminalItemList
      items={shipInventoryRows}
      emptyMessage="CARGO HOLD EMPTY"
      rowActions={itemActions}
    />
  </section>
</TerminalPanel>

<style>
  .cargo-section {
    display: grid;
    gap: 0;
    margin-top: 1rem;
  }

  h3 {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    margin: 0;
    padding-bottom: 0.45rem;
    border-bottom: 1px dashed var(--border-subtle);
  }
</style>
