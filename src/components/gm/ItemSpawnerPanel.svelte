<script lang="ts">
  import {
    ALL_SPAWNABLE_EQUIPMENT,
    formatEquipmentCategory,
    getEquipmentInventoryCategory,
    getEquipmentInventoryMass,
    getEquipmentInventoryRarity
  } from '../../lib/character/characterConstants';
  import { dbState } from '../../lib/states/dbState.svelte.ts';
  import { toastState } from '../../lib/states/toastState.svelte.ts';
  import type { EquipmentCatalogItem } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type SpawnMode = 'catalog' | 'custom';
  type SelectOption = { label: string; value: string };
  type CatalogOption = SelectOption & { item: EquipmentCatalogItem };

  const categoryOptions = [
    { label: 'Weapon', value: 'Weapon' },
    { label: 'Armor', value: 'Armor' },
    { label: 'Consumable', value: 'Consumable' },
    { label: 'Pretech', value: 'Pretech' },
    { label: 'Trade Good', value: 'Trade Good' }
  ];

  const rarityOptions = [
    { label: 'Common', value: 'common' },
    { label: 'Uncommon', value: 'uncommon' },
    { label: 'Rare', value: 'rare' },
    { label: 'Epic', value: 'epic' },
    { label: 'Legendary', value: 'legendary' }
  ];

  const catalogOptions: CatalogOption[] = ALL_SPAWNABLE_EQUIPMENT
    .map((item) => ({
      label: item.name,
      value: item.id,
      item
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const catalogCategoryOptions: SelectOption[] = [
    { label: 'All', value: 'all' },
    ...Array.from(new Set(catalogOptions.map((option) => getEquipmentInventoryCategory(option.item))))
      .sort()
      .map((category) => ({ label: category, value: category }))
  ];

  let spawnMode = $state<SpawnMode>('catalog');
  let catalogCategory = $state(catalogCategoryOptions[0]);
  let selectedCatalogOption = $state<CatalogOption | null>(catalogOptions[0] ?? null);
  let catalogQty = $state(1);
  let spawnName = $state('');
  let spawnCategory = $state(categoryOptions[0]);
  let spawnRarity = $state(rarityOptions[0]);
  let spawnMass = $state(1);
  let spawnQty = $state(1);
  let filteredCatalogOptions = $derived(
    catalogOptions.filter((option) => catalogCategory.value === 'all' || getEquipmentInventoryCategory(option.item) === catalogCategory.value)
  );
  let selectedCatalogItem = $derived(selectedCatalogOption?.item ?? null);

  function handleCatalogCategorySelect(option: SelectOption) {
    catalogCategory = option;
    selectedCatalogOption = catalogOptions.find((catalogOption) => (
      option.value === 'all' || getEquipmentInventoryCategory(catalogOption.item) === option.value
    )) ?? null;
  }

  function formatCost(item: EquipmentCatalogItem) {
    return item.cost === null ? 'NOT FOR SALE' : `${item.cost.toLocaleString()} CR`;
  }

  function formatTechLevel(item: EquipmentCatalogItem) {
    return item.techLevel === null ? 'UNKNOWN' : `TL${item.techLevel}`;
  }

  function formatTags(item: EquipmentCatalogItem) {
    return item.tags.map((tag) => tag.replace(/_/g, ' ').toUpperCase()).join(', ');
  }

  async function handleCatalogSpawn() {
    if (!selectedCatalogOption) return;
    const quantity = Math.max(1, Math.floor(catalogQty) || 1);
    await dbState.spawnCatalogItem(selectedCatalogOption.value, quantity);
    catalogQty = quantity;
    toastState.notify('CATALOG ITEM SPAWNED');
  }

  async function handleCustomSpawn() {
    const itemName = spawnName.trim();
    if (!itemName) return;
    const quantity = Math.max(1, Math.floor(spawnQty) || 1);
    await dbState.spawnItem(itemName, spawnCategory.value, spawnRarity.value, spawnMass, quantity);
    spawnQty = quantity;
    spawnName = ''; 
    toastState.notify('ITEM SPAWNED');
  } 
</script>

<TerminalPanel title="CARGO SPAWNER" extraClass="gm-panel">
  <div class="mode-grid">
    <button
      class="btn-action mode-button"
      class:active={spawnMode === 'catalog'}
      onclick={() => spawnMode = 'catalog'}
    >
      SPAWN FROM CATALOG
    </button>
    <button
      class="btn-action mode-button"
      class:active={spawnMode === 'custom'}
      onclick={() => spawnMode = 'custom'}
    >
      SPAWN CUSTOM ITEM
    </button>
  </div>

  {#if spawnMode === 'catalog'}
    <div class="input-row">
      <div class="input-group flex-1 no-margin">
        <label for="catalog-category" class="sel-label">FILTER</label>
        <TerminalSelect
          options={catalogCategoryOptions}
          bind:value={catalogCategory}
          id="catalog-category"
          onSelect={handleCatalogCategorySelect}
          showPopup={false}
        />
      </div>

      <div class="input-group flex-2 no-margin">
        <label for="catalog-item" class="sel-label">CATALOG ITEM</label>
        <TerminalSelect
          options={filteredCatalogOptions}
          bind:value={selectedCatalogOption}
          id="catalog-item"
          popupSide="left"
        />
      </div>

      <div class="input-group qty-field no-margin">
        <label for="catalog-qty" class="mass-label">QTY</label>
        <input type="number" id="catalog-qty" bind:value={catalogQty} class="terminal-input" min="1" step="1" />
      </div>
    </div>

    {#if selectedCatalogItem}
      <div class="catalog-detail">
        <div class="detail-header">
          <span>{selectedCatalogItem.name.toUpperCase()}</span>
          <span>{formatTechLevel(selectedCatalogItem)}</span>
        </div>

        <div class="detail-grid">
          <div>
            <span class="detail-label">INVENTORY</span>
            <span>{getEquipmentInventoryCategory(selectedCatalogItem).toUpperCase()}</span>
          </div>
          <div>
            <span class="detail-label">RARITY</span>
            <span>{getEquipmentInventoryRarity(selectedCatalogItem).toUpperCase()}</span>
          </div>
          <div>
            <span class="detail-label">ENCUMBRANCE</span>
            <span>{getEquipmentInventoryMass(selectedCatalogItem)}</span>
          </div>
          <div>
            <span class="detail-label">COST</span>
            <span>{formatCost(selectedCatalogItem)}</span>
          </div>
          <div>
            <span class="detail-label">CATALOG</span>
            <span>{formatEquipmentCategory(selectedCatalogItem.category)}</span>
          </div>
          <div>
            <span class="detail-label">ACCESS</span>
            <span>{selectedCatalogItem.legality.toUpperCase()} / {selectedCatalogItem.availability.toUpperCase()}</span>
          </div>
        </div>

        <p>{selectedCatalogItem.description}</p>
        {#if selectedCatalogItem.mechanics}
          <p class="mechanics">{selectedCatalogItem.mechanics}</p>
        {/if}
        <div class="tag-line">{formatTags(selectedCatalogItem)}</div>
      </div>
    {:else}
      <div class="terminal-alert empty-state">NO SPAWNABLE CATALOG ITEMS</div>
    {/if}

    <button class="btn-action btn-full-cyan" onclick={handleCatalogSpawn} disabled={!selectedCatalogItem}>
      SPAWN CATALOG ITEM
    </button>
  {:else}
    <div class="input-group">
      <label for="spawn-name">ITEM NAME</label>
      <input type="text" id="spawn-name" bind:value={spawnName} class="terminal-input" placeholder="e.g. Pretech Artifact" />
    </div>

    <div class="input-row">
      <div class="input-group flex-2 no-margin">
        <label for="spawn-category" class="sel-label">CATEGORY</label>
        <TerminalSelect options={categoryOptions} bind:value={spawnCategory} id="cat-sel" showPopup={false} />
      </div>

      <div class="input-group flex-2 no-margin">
        <label for="spawn-rarity" class="sel-label">RARITY</label>
        <TerminalSelect options={rarityOptions} bind:value={spawnRarity} id="rarity-sel" showPopup={false} />
      </div>
      
      <div class="input-group flex-1 no-margin">
        <label for="spawn-mass" class="sel-label">MASS</label>
        <input type="number" id="spawn-mass" bind:value={spawnMass} class="terminal-input" min="0" step="0.5" />
      </div>

      <div class="input-group flex-1 no-margin">
        <label for="spawn-qty" class="mass-label">QTY</label>
        <input type="number" id="spawn-qty" bind:value={spawnQty} class="terminal-input" min="1" step="1" />
      </div>
    </div>

    <button class="btn-action btn-full-cyan" onclick={handleCustomSpawn}>
      SPAWN ITEM IN CARGO
    </button>
  {/if}
</TerminalPanel>

<style>
  .mode-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .qty-field {
    width: 5.5rem;
  }

  @media (max-width: 900px) {
    .mode-grid {
      grid-template-columns: 1fr;
    }

    .qty-field {
      width: 100%;
    }
  }
</style>
