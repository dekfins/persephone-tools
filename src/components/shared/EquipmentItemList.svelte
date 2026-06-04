<script module lang="ts">
  export type EquipmentItemListRow = {
    id: string;
    equipmentId?: string | null;
    name?: string;
    category?: string;
    rarity?: string;
    quantity: number;
    mass?: number;
    displayName?: string;
    weaponDamage?: string;
  };
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    formatEquipmentCategory,
    formatEquipmentQuantityName,
    getEquipmentById,
    getEquipmentInventoryCategory,
    getEquipmentInventoryMass,
    getEquipmentInventoryRarity
  } from '../../lib/characterConstants';
  import type { EquipmentCatalogItem } from '../../lib/types';

  type Props = {
    items: EquipmentItemListRow[];
    emptyMessage: string;
    rowActions?: Snippet<[EquipmentItemListRow]>;
  };

  let { items, emptyMessage, rowActions }: Props = $props();
  let expandedKeys = $state<string[]>([]);

  function isExpandable(entry: EquipmentItemListRow) {
    return Boolean(entry.equipmentId);
  }

  function isExpanded(entry: EquipmentItemListRow) {
    return expandedKeys.includes(entry.id);
  }

  function toggleDetails(entry: EquipmentItemListRow) {
    if (!isExpandable(entry)) return;
    expandedKeys = expandedKeys.includes(entry.id)
      ? expandedKeys.filter((expandedKey) => expandedKey !== entry.id)
      : [...expandedKeys, entry.id];
  }

  function formatCost(item: EquipmentCatalogItem | null, quantity = 1) {
    if (!item || item.cost === null) return 'N/A CR';
    return `${(item.cost * quantity).toLocaleString()} CR`;
  }

  function formatTechLevel(item: EquipmentCatalogItem) {
    return item.techLevel === null ? 'TL?' : `TL${item.techLevel}`;
  }

  function itemMass(entry: EquipmentItemListRow, item: EquipmentCatalogItem | null) {
    if (item) return getEquipmentInventoryMass(item) * entry.quantity;
    return (entry.mass ?? 0) * entry.quantity;
  }

  function weaponDamage(entry: EquipmentItemListRow, item: EquipmentCatalogItem) {
    return entry.weaponDamage ?? item.weapon?.damage ?? 'N/A';
  }

  function rowName(entry: EquipmentItemListRow, item: EquipmentCatalogItem | null) {
    if (entry.displayName) {
      return entry.quantity > 1 ? `x${entry.quantity} ${entry.displayName}` : entry.displayName;
    }

    if (item) {
      return formatEquipmentQuantityName(item, entry.quantity, entry.equipmentId ?? entry.id);
    }

    const name = entry.name ?? entry.equipmentId ?? 'Unknown equipment';
    return entry.quantity > 1 ? `x${entry.quantity} ${name}` : name;
  }

  function compactMeta(entry: EquipmentItemListRow, item: EquipmentCatalogItem | null) {
    if (!item) {
      const details = [
        entry.category ? `[${entry.category}]` : null,
        `Enc: ${itemMass(entry, item)}`,
        `Qty: ${entry.quantity}`
      ].filter(Boolean);

      return entry.equipmentId
        ? `Missing catalog ID: ${entry.equipmentId}`
        : details.join('  ');
    }

    const details = [
      formatCost(item, entry.quantity),
      `Enc: ${itemMass(entry, item)}`
    ];

    if (item.weapon) details.push(`Dmg: ${weaponDamage(entry, item)}`);
    if (item.armor) details.push(`AC: ${item.armor.armorClass}`);

    return details.join('  ');
  }

  function armorSummary(item: EquipmentCatalogItem) {
    if (!item.armor) return '';
    if (item.armor.armorType === 'shield' && item.armor.armorClassBonus) {
      return `AC ${item.armor.armorClass} / +${item.armor.armorClassBonus} shield`;
    }
    return `AC ${item.armor.armorClass}`;
  }
</script>

{#if items.length > 0}
  <ul class="item-list">
    {#each items as entry}
      {@const catalogItem = entry.equipmentId ? getEquipmentById(entry.equipmentId) : null}
      {@const expanded = isExpanded(entry)}
      <li class="item-row">
        <div class="item-row-main" class:no-toggle={!isExpandable(entry)}>
          {#if isExpandable(entry)}
            <button
              class="chevron-toggle"
              class:expanded
              type="button"
              aria-label={expanded ? 'Hide equipment details' : 'Show equipment details'}
              aria-expanded={expanded}
              onclick={() => toggleDetails(entry)}
            >
              <span class="chevron-mark"></span>
            </button>
          {/if}

          <div class="item-details">
            <span class="item-name">{rowName(entry, catalogItem).toUpperCase()}</span>
            <span class="item-meta">{compactMeta(entry, catalogItem)}</span>
          </div>

          {#if rowActions}
            <div class="row-actions">
              {@render rowActions(entry)}
            </div>
          {/if}
        </div>

        {#if expanded}
          <div class="equipment-dropdown">
            {#if catalogItem}
              <div class="detail-grid">
                <div>
                  <span>TYPE</span>
                  <strong>{formatEquipmentCategory(catalogItem.category)}</strong>
                </div>
                <div>
                  <span>INVENTORY</span>
                  <strong>{getEquipmentInventoryCategory(catalogItem).toUpperCase()}</strong>
                </div>
                <div>
                  <span>RARITY</span>
                  <strong>{getEquipmentInventoryRarity(catalogItem).toUpperCase()}</strong>
                </div>
                <div>
                  <span>COST</span>
                  <strong>{formatCost(catalogItem)}</strong>
                </div>
                <div>
                  <span>TECH</span>
                  <strong>{formatTechLevel(catalogItem)}</strong>
                </div>
                <div>
                  <span>ENC / UNIT</span>
                  <strong>{getEquipmentInventoryMass(catalogItem)}</strong>
                </div>
                {#if catalogItem.weapon}
                  <div>
                    <span>DAMAGE</span>
                    <strong>{weaponDamage(entry, catalogItem)}</strong>
                  </div>
                  <div>
                    <span>RANGE</span>
                    <strong>{catalogItem.weapon.range ?? 'N/A'}</strong>
                  </div>
                  <div>
                    <span>MAGAZINE</span>
                    <strong>{catalogItem.weapon.magazine ?? 'N/A'}</strong>
                  </div>
                {/if}
                {#if catalogItem.armor}
                  <div>
                    <span>ARMOR</span>
                    <strong>{armorSummary(catalogItem)}</strong>
                  </div>
                  <div>
                    <span>ARMOR TYPE</span>
                    <strong>{catalogItem.armor.armorType.toUpperCase()}</strong>
                  </div>
                {/if}
              </div>

              <p>{catalogItem.description}</p>
              {#if catalogItem.mechanics}
                <p class="mechanics">{catalogItem.mechanics}</p>
              {/if}
            {:else}
              <div class="missing-detail">MISSING CATALOG ID: {entry.equipmentId}</div>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{:else}
  <div class="dim-message">{emptyMessage}</div>
{/if}

<style>
  .item-list {
    display: grid;
    gap: 0.45rem;
    margin: 0.85rem 0 0;
    padding: 0;
    list-style: none;
  }

  .item-row {
    display: grid;
    gap: 0;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .item-row-main {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    padding: 0rem 0.55rem;
  }

  .item-row-main.no-toggle {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .chevron-toggle {
    position: relative;
    width: 1.35rem;
    height: 1.35rem;
    display: grid;
    place-items: center;
    background: transparent;
    border: var(--border-subtle);
    color: var(--accent-amber);
    cursor: pointer;
    font-family: var(--font-terminal);
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .chevron-mark {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.38rem;
    height: 0.38rem;
    border-top: 2px solid currentColor;
    border-right: 2px solid currentColor;
    transform: translate(-62%, -50%) rotate(45deg);
  }

  .chevron-toggle.expanded {
    transform: rotate(90deg);
  }

  .chevron-toggle:hover {
    border-color: var(--accent-amber);
  }

  .item-details {
    display: grid;
    gap: 0.12rem;
    min-width: 0;
  }

  .item-name {
    color: var(--accent-amber);
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  .item-meta {
    color: var(--text-dim);
    font-size: 0.7rem;
    white-space: pre-wrap;
  }

  .row-actions {
    min-width: max-content;
  }

  .row-actions :global(.item-actions) {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .equipment-dropdown {
    display: grid;
    gap: 0.55rem;
    padding: 0.65rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .detail-grid div {
    display: grid;
    gap: 0.2rem;
    border: var(--border-subtle);
    padding: 0.45rem;
  }

  .detail-grid span {
    color: var(--text-dim);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .detail-grid strong {
    color: var(--accent-amber);
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  .equipment-dropdown p,
  .missing-detail {
    margin: 0;
    color: var(--text-main);
    font-size: 0.76rem;
    line-height: 1.4;
  }

  .equipment-dropdown .mechanics {
    color: var(--accent-amber);
  }

  .dim-message {
    margin-top: 0.85rem;
    background-color: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-dim);
    font-size: 0.8rem;
    padding: 0.6rem;
    text-align: center;
  }

  @media (max-width: 900px) {
    .item-row-main,
    .item-row-main.no-toggle,
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .chevron-toggle {
      justify-self: start;
    }

    .row-actions {
      min-width: 0;
    }

    .row-actions :global(.item-actions) {
      justify-content: flex-start;
    }
  }
</style>
