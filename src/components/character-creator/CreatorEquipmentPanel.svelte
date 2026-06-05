<script lang="ts">
  import {
    formatEquipmentCategory,
    getEquipmentById,
    getEquipmentInventoryCategory,
    getEquipmentInventoryMass,
    getEquipmentInventoryRarity
  } from '../../lib/characterConstants';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { EquipmentCatalogItem, EquipmentPackageId, StartingEquipmentItem } from '../../lib/types';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';

  type PackageOption = {
    label: string;
    value: EquipmentPackageId | null;
    description: string;
  };

  type SelectOption = { label: string; value: string };
  type CatalogOption = SelectOption & { description: string; item: EquipmentCatalogItem };

  let packageSelection = $derived(
    characterCreatorState.packageOptions.find((option) => option.value === characterCreatorState.draft.selectedPackageId) ?? null
  );
  let catalogCategoryOptions = $derived([
    { label: 'All', value: 'all' },
    ...Array.from(new Set(characterCreatorState.buyableEquipmentOptions.map((option) => getEquipmentInventoryCategory(option.item))))
      .sort()
      .map((category) => ({ label: category, value: category }))
  ]);
  let catalogCategory = $state<SelectOption>({ label: 'All', value: 'all' });
  let selectedCatalogOption = $state<CatalogOption | null>(null);
  let purchaseQty = $state(1);
  let filteredCatalogOptions = $derived(
    characterCreatorState.buyableEquipmentOptions.filter((option) => {
      return catalogCategory.value === 'all' || getEquipmentInventoryCategory(option.item) === catalogCategory.value;
    })
  );
  let selectedCatalogItem = $derived(selectedCatalogOption?.item ?? null);
  let selectedCost = $derived(selectedCatalogItem?.cost ?? 0);
  let normalizedPurchaseQty = $derived(Math.max(1, Math.floor(Number(purchaseQty)) || 1));
  let purchaseTotal = $derived(selectedCost * normalizedPurchaseQty);
  let canAddToCart = $derived(Boolean(
    selectedCatalogItem &&
    selectedCatalogItem.cost !== null &&
    purchaseTotal <= characterCreatorState.remainingStartingCredits
  ));
  let packageRows = $derived(toEquipmentRows(characterCreatorState.startingEquipmentItems, 'package'));
  let cartRows = $derived(toEquipmentRows(characterCreatorState.purchasedEquipmentItems, 'cart'));
  let selectedCatalogDetailRows = $derived(selectedCatalogItem ? [
    { label: 'TYPE', value: formatEquipmentCategory(selectedCatalogItem.category) },
    { label: 'INVENTORY', value: getEquipmentInventoryCategory(selectedCatalogItem).toUpperCase() },
    { label: 'RARITY', value: getEquipmentInventoryRarity(selectedCatalogItem).toUpperCase() },
    { label: 'ENC', value: getEquipmentInventoryMass(selectedCatalogItem) },
    { label: 'TECH', value: formatTechLevel(selectedCatalogItem) },
    { label: 'LINE TOTAL', value: `${purchaseTotal.toLocaleString()} CR` }
  ] : []);

  function choosePackage(option: PackageOption) {
    characterCreatorState.chooseEquipmentPackage(option.value);
  }

  function chooseCategory(option: SelectOption) {
    catalogCategory = option;
    selectedCatalogOption = null;
  }

  function selectCatalog(option: CatalogOption) {
    selectedCatalogOption = option;
  }

  function addToCart() {
    const itemId = selectedCatalogOption?.value ?? selectedCatalogItem?.id;
    if (!itemId) return;
    const added = characterCreatorState.addPurchasedItem(itemId, purchaseQty);
    if (added) purchaseQty = normalizedPurchaseQty;
  }

  function formatCost(item: EquipmentCatalogItem | null) {
    return item?.cost === null || !item ? 'N/A' : `${item.cost.toLocaleString()} CR`;
  }

  function formatTechLevel(item: EquipmentCatalogItem) {
    return item.techLevel === null ? 'TL?' : `TL${item.techLevel}`;
  }

  function creatorWeaponDamage(entry: StartingEquipmentItem, item: EquipmentCatalogItem | null) {
    if (!item) return undefined;
    const weapon = characterCreatorState.equipmentWeaponSummaries.find((summary) => {
      return summary.label === (entry.displayName ?? item.sourceName ?? item.name) && entry.equipmentId === item.id;
    });
    return weapon?.damage;
  }

  function toEquipmentRows(items: StartingEquipmentItem[], prefix: string): TerminalItemListRow[] {
    return items.map((entry, index) => {
      const item = getEquipmentById(entry.equipmentId);
      return {
        id: `creator:${prefix}:${entry.equipmentId}:${index}`,
        equipmentId: entry.equipmentId,
        quantity: entry.quantity,
        displayName: entry.displayName,
        weaponDamage: creatorWeaponDamage(entry, item)
      };
    });
  }
</script>

<TerminalPanel title="STARTING EQUIPMENT" extraClass="creator-panel">
  <div class="mode-grid">
    <button
      class="btn-action"
      class:active={characterCreatorState.draft.equipmentMode === 'package'}
      onclick={() => characterCreatorState.chooseEquipmentPackage(characterCreatorState.draft.selectedPackageId)}
    >
      PACKAGE
    </button>
    <button
      class="btn-action"
      class:active={characterCreatorState.draft.equipmentMode === 'rolled_credits'}
      onclick={() => characterCreatorState.chooseRolledCredits()}
    >
      CUSTOM
    </button>
  </div>

  {#if characterCreatorState.draft.equipmentMode === 'package'}
    <div class="package-grid">
      <div class="form-group">
        <label for="creator-equipment-package">EQUIPMENT PACKAGE</label>
        <TerminalSelect
          id="creator-equipment-package"
          options={characterCreatorState.packageOptions}
          value={packageSelection}
          placeholder="SELECT PACKAGE"
          onSelect={choosePackage}
          showPopup={false}
        />
      </div>
    </div>
  {/if}

  <div class="equipment-overview" class:with-roll={characterCreatorState.draft.equipmentMode === 'rolled_credits'}>
    <div class="summary-grid" class:with-remaining={characterCreatorState.draft.equipmentMode === 'rolled_credits'}>
      <div class="summary-card">
        <span>STARTING CR</span>
        <strong>{characterCreatorState.draft.startingCredits.toLocaleString()} CR</strong>
      </div>
      {#if characterCreatorState.draft.equipmentMode === 'rolled_credits'}
        <div class="summary-card" class:danger={characterCreatorState.remainingStartingCredits < 0}>
          <span>CR REMAINING</span>
          <strong>{characterCreatorState.remainingStartingCredits.toLocaleString()} CR</strong>
        </div>
      {/if}
      <div class="summary-card">
        <span>TOTAL ENC</span>
        <strong>{characterCreatorState.startingEquipmentEncumbrance}</strong>
      </div>
    </div>

    {#if characterCreatorState.draft.equipmentMode === 'rolled_credits'}
      <button
        class="btn-action roll-button"
        onclick={() => characterCreatorState.rollCredits()}
        disabled={Boolean(characterCreatorState.draft.creditRoll)}
      >
        {characterCreatorState.draft.creditRoll ? 'CREDITS ROLLED' : 'ROLL 2D6 X 100'}
      </button>
    {/if}
  </div>

  {#if characterCreatorState.draft.equipmentMode === 'rolled_credits'}
    <div class="purchase-grid">
      <div class="form-group">
        <label for="creator-buy-category">FILTER</label>
        <TerminalSelect
          id="creator-buy-category"
          options={catalogCategoryOptions}
          bind:value={catalogCategory}
          onSelect={chooseCategory}
          showPopup={false}
        />
      </div>
      <div class="form-group item-select">
        <label for="creator-buy-item">CATALOG ITEM</label>
        <TerminalSelect
          id="creator-buy-item"
          options={filteredCatalogOptions}
          bind:value={selectedCatalogOption}
          onSelect={selectCatalog}
          placeholder="SELECT ITEM"
          popupSide="left"
        />
      </div>
      <div class="form-group qty-field">
        <label for="creator-buy-qty">QTY</label>
        <input id="creator-buy-qty" class="terminal-input" type="number" min="1" step="1" bind:value={purchaseQty} />
      </div>
    </div>

    {#if selectedCatalogItem}
      <div class="catalog-detail">
        <div class="detail-header">
          <strong>{selectedCatalogItem.name.toUpperCase()}</strong>
          <span>{formatCost(selectedCatalogItem)}</span>
        </div>
        <TerminalStatGrid items={selectedCatalogDetailRows} columns={3} dense />
        <p>{selectedCatalogItem.description}</p>
        {#if selectedCatalogItem.mechanics}
          <p class="mechanics">{selectedCatalogItem.mechanics}</p>
        {/if}
      </div>
    {/if}

    <button class="btn-action btn-full-cyan" onclick={addToCart} disabled={!canAddToCart}>
      ADD TO CART
    </button>
  {/if}

  {#if characterCreatorState.draft.equipmentMode === 'package'}
    <h4>PACKAGE ITEMS</h4>
    <TerminalItemList
      items={packageRows}
      emptyMessage="NO PACKAGE ITEMS SELECTED"
    />
  {/if}

  {#if characterCreatorState.draft.equipmentMode === 'rolled_credits'}
    <h4>CART</h4>
    {#snippet cartActions(entry: TerminalItemListRow)}
      <div class="cart-controls">
        <input
          class="terminal-input qty-input"
          type="number"
          min="1"
          step="1"
          value={entry.quantity}
          oninput={(event) => entry.equipmentId && characterCreatorState.updatePurchasedItemQuantity(entry.equipmentId, Number(event.currentTarget.value))}
        />
        <button class="btn-action btn-danger" onclick={() => entry.equipmentId && characterCreatorState.removePurchasedItem(entry.equipmentId)}>
          REMOVE
        </button>
      </div>
    {/snippet}

    <TerminalItemList
      items={cartRows}
      emptyMessage="NO PURCHASED GEAR IN CART"
      rowActions={cartActions}
    />
  {/if}

  {#each characterCreatorState.purchasedEquipmentValidationMessages as message}
    <div class="terminal-alert error">{message}</div>
  {/each}
</TerminalPanel>

<style>
  .mode-grid,
  .package-grid,
  .equipment-overview,
  .summary-grid,
  .purchase-grid {
    display: grid;
    gap: 0.65rem;
  }

  .mode-grid,
  .package-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .equipment-overview.with-roll {
    grid-template-columns: minmax(0, 1fr) 12rem;
    align-items: stretch;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-grid.with-remaining {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .purchase-grid {
    grid-template-columns: minmax(8rem, 0.8fr) minmax(12rem, 2fr) 5.5rem;
  }

  .package-grid,
  .equipment-overview,
  .purchase-grid,
  .terminal-alert,
  h4 {
    margin-top: 0.85rem;
  }

  .roll-button {
    width: 100%;
    min-height: 100%;
  }

  .form-group {
    display: grid;
    gap: 0.35rem;
  }

  label {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  h4 {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cart-controls {
    display: grid;
    gap: 0.65rem;
    align-items: center;
  }

  .cart-controls {
    grid-template-columns: 5rem auto;
  }

  .qty-input {
    width: 5rem;
  }

  @media (max-width: 900px) {
    .mode-grid,
    .package-grid,
    .equipment-overview.with-roll,
    .summary-grid,
    .purchase-grid {
      grid-template-columns: 1fr;
    }

    .qty-field,
    .qty-input {
      width: 100%;
    }
  }
</style>
