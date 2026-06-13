<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { ItemRecord, ItemState } from '../../lib/types';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';

  type EncumbranceStatus = {
    label: string;
    movement: string;
    severity: 'normal' | 'light' | 'heavy' | 'overloaded';
  };

  let personalInventoryRows = $derived(dbState.personalInventory.map(toEquipmentRow));
  let readiedRows = $derived(personalInventoryRows.filter((item) => item.itemState === 'readied'));
  let stowedRows = $derived(personalInventoryRows.filter((item) => item.itemState === 'stowed'));
  let strengthScore = $derived(dbState.activeCharacter?.attributes.str ?? 0);
  let readiedLimit = $derived(Math.floor(strengthScore / 2));
  let stowedLimit = $derived(strengthScore);
  let readiedEnc = $derived(totalEncumbrance(readiedRows));
  let stowedEnc = $derived(totalEncumbrance(stowedRows));
  let encumbranceStatus = $derived(getEncumbranceStatus());
  let loadoutStats = $derived([
    { label: 'WALLET', value: `${dbState.activeCharacter?.personal_credits.toLocaleString() || 0} CR` },
    { label: 'READY', value: `${readiedEnc}/${readiedLimit} ENC`, tone: readiedEnc > readiedLimit ? 'over-limit' : undefined },
    { label: 'STOWED', value: `${stowedEnc}/${stowedLimit} ENC`, tone: stowedEnc > stowedLimit ? 'over-limit' : undefined },
    {
      label: 'MOVE',
      value: `${encumbranceStatus.movement} ${encumbranceStatus.label}`,
      tone: encumbranceStatus.severity === 'normal' ? undefined : `movement-${encumbranceStatus.severity}`
    }
  ]);

  function moveToShip(itemId: string) {
    dbState.transferItem(itemId, 'SHIP_INVENTORY');
  }

  function setItemState(itemId: string, itemState: ItemState) {
    dbState.updateItemState(itemId, itemState);
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

  function totalEncumbrance(items: TerminalItemListRow[]) {
    return items.reduce((total, item) => total + (item.mass ?? 0) * item.quantity, 0);
  }

  function getEncumbranceStatus(): EncumbranceStatus {
    const readyOver = Math.max(0, readiedEnc - readiedLimit);
    const stowedOver = Math.max(0, stowedEnc - stowedLimit);

    if (readyOver > 4 || stowedOver > 8) {
      return { label: 'OVERLOADED', movement: '5M', severity: 'overloaded' };
    }

    if (readyOver > 2 || stowedOver > 4) {
      return { label: 'HEAVY', movement: '5M', severity: 'heavy' };
    }

    if (readyOver > 0 || stowedOver > 0) {
      return { label: 'LIGHT', movement: '7M', severity: 'light' };
    }

    return { label: 'CLEAR', movement: '10M', severity: 'normal' };
  }
</script>

{#snippet itemActions(item: TerminalItemListRow)}
  {#if !dbState.isLocalCharacterPreview}
    <div class="item-actions">
      {#if dbState.isGM}
        <button class="btn-action-red btn-compact" onclick={() => dbState.deleteItem(item.id)}>
          X
        </button>
      {/if}

      {#if item.itemState === 'readied'}
        <button class="btn-action btn-compact" onclick={() => setItemState(item.id, 'stowed')}>
          STOW
        </button>
      {:else if item.itemState === 'stowed'}
        <button class="btn-action btn-compact" onclick={() => setItemState(item.id, 'readied')}>
          READY
        </button>
      {/if}

      {#if dbState.activeCampaignId}
        <button class="btn-action btn-compact" onclick={() => moveToShip(item.id)}>
          STORE
        </button>
      {/if}
    </div>
  {/if}
{/snippet}

<TerminalPanel title="PERSONAL LOADOUT: {dbState.activeCharacter?.name || 'UNKNOWN'}" extraClass="ledger-panel">
  <TerminalStatGrid items={loadoutStats} columns={4} />

  {#if dbState.isLocalCharacterPreview}
    <div class="terminal-alert">ARCHIVE PREVIEW LOADOUT - NOT SYNCED TO CARGO</div>
  {/if}

  <section class="loadout-section">
    <h3>READIED</h3>
    <TerminalItemList
      items={readiedRows}
      emptyMessage="NO READIED GEAR"
      rowActions={itemActions}
    />
  </section>

  <section class="loadout-section">
    <h3>STOWED</h3>
    <TerminalItemList
      items={stowedRows}
      emptyMessage="NO STOWED GEAR"
      rowActions={itemActions}
    />
  </section>
</TerminalPanel>

<style>
  .loadout-section {
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
