<script module lang="ts">
  export type {
    EquipmentItemListRow,
    TerminalItemDetail,
    TerminalItemListRow
  } from '../../lib/ui/terminalItems';
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
  } from '../../lib/character/characterConstants';
  import type { EquipmentCatalogItem } from '../../lib/types';
  import type { TerminalItemDetail, TerminalItemListRow } from '../../lib/ui/terminalItems';
  import { formatCredits } from '../../lib/ui/terminalItems';
  import TerminalStatGrid from './TerminalStatGrid.svelte';

  type Props = {
    items: TerminalItemListRow[];
    emptyMessage: string;
    rowActions?: Snippet<[TerminalItemListRow]>;
  };

  let { items, emptyMessage, rowActions }: Props = $props();
  let expandedKeys = $state<string[]>([]);

  function isExpandable(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    if (entry.expandable !== undefined) return entry.expandable;
    return Boolean(entry.equipmentId || item || entry.detailRows?.length || entry.description || entry.mechanics);
  }

  function isExpanded(entry: TerminalItemListRow) {
    return expandedKeys.includes(entry.id);
  }

  function toggleDetails(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    if (!isExpandable(entry, item)) return;
    expandedKeys = expandedKeys.includes(entry.id)
      ? expandedKeys.filter((expandedKey) => expandedKey !== entry.id)
      : [...expandedKeys, entry.id];
  }

  function formatTechLevel(item: EquipmentCatalogItem) {
    return item.techLevel === null ? 'TL?' : `TL${item.techLevel}`;
  }

  function itemMass(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    if (item) return getEquipmentInventoryMass(item) * entry.quantity;
    return (entry.mass ?? 0) * entry.quantity;
  }

  function weaponDamage(entry: TerminalItemListRow, item: EquipmentCatalogItem) {
    return entry.weaponDamage ?? item.weapon?.damage ?? 'N/A';
  }

  function rowName(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    if (entry.displayName) {
      return entry.quantity > 1 ? `x${entry.quantity} ${entry.displayName}` : entry.displayName;
    }

    if (item) {
      return formatEquipmentQuantityName(item, entry.quantity, entry.equipmentId ?? entry.id);
    }

    const name = entry.name ?? entry.equipmentId ?? 'Unknown item';
    return entry.quantity > 1 ? `x${entry.quantity} ${name}` : name;
  }

  function rarityClass(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    if (entry.nameClass) return entry.nameClass;

    const rarity = (item ? getEquipmentInventoryRarity(item) : entry.rarity)?.toLowerCase();
    const knownRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

    return rarity && knownRarities.includes(rarity) ? `loot-${rarity}` : 'loot-common';
  }

  function compactMeta(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    if (entry.meta) return entry.meta;

    if (!item) {
      const details = [
        entry.typeLabel ? `[${entry.typeLabel}]` : entry.category ? `[${entry.category}]` : null,
        `Enc: ${itemMass(entry, item)}`,
        `Qty: ${entry.quantity}`
      ].filter(Boolean);

      return entry.equipmentId
        ? `Missing catalog ID: ${entry.equipmentId}`
        : details.join('  ');
    }

    const details = [
      formatCredits(item.cost === null ? null : item.cost * entry.quantity),
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

  function catalogDetailRows(entry: TerminalItemListRow, item: EquipmentCatalogItem): TerminalItemDetail[] {
    const rows: TerminalItemDetail[] = [
      { label: 'TYPE', value: formatEquipmentCategory(item.category) },
      { label: 'INVENTORY', value: getEquipmentInventoryCategory(item).toUpperCase() },
      { label: 'RARITY', value: getEquipmentInventoryRarity(item).toUpperCase(), tone: rarityClass(entry, item) },
      { label: 'COST', value: formatCredits(item.cost) },
      { label: 'TECH', value: formatTechLevel(item) },
      { label: 'ENC / UNIT', value: getEquipmentInventoryMass(item) }
    ];

    if (item.weapon) {
      rows.push({ label: 'DAMAGE', value: weaponDamage(entry, item) });
      rows.push({ label: 'RANGE', value: item.weapon.range ?? 'N/A' });
      rows.push({ label: 'MAGAZINE', value: item.weapon.magazine ?? 'N/A' });
    }

    if (item.armor) {
      rows.push({ label: 'ARMOR', value: armorSummary(item) });
      rows.push({ label: 'ARMOR TYPE', value: item.armor.armorType.toUpperCase() });
    }

    return rows;
  }

  function visibleDetailRows(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    if (entry.detailRows?.length) return entry.detailRows;
    if (item) return catalogDetailRows(entry, item);
    return [];
  }

  function rowDescription(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    return entry.description ?? item?.description;
  }

  function rowMechanics(entry: TerminalItemListRow, item: EquipmentCatalogItem | null) {
    return entry.mechanics ?? item?.mechanics;
  }
</script>

{#if items.length > 0}
  <ul class="item-list">
    {#each items as entry}
      {@const catalogItem = entry.equipmentId ? getEquipmentById(entry.equipmentId) : null}
      {@const expanded = isExpanded(entry)}
      {@const canExpand = isExpandable(entry, catalogItem)}
      {@const detailRows = visibleDetailRows(entry, catalogItem)}
      {@const description = rowDescription(entry, catalogItem)}
      {@const mechanics = rowMechanics(entry, catalogItem)}
      <li class="item-row status-{entry.statusClass ?? 'neutral'}">
        <div class="item-row-main" class:no-toggle={!canExpand}>
          {#if canExpand}
            <button
              class="chevron-toggle"
              class:expanded
              type="button"
              aria-label={expanded ? 'Hide item details' : 'Show item details'}
              aria-expanded={expanded}
              onclick={() => toggleDetails(entry, catalogItem)}
            >
              <span class="chevron-mark"></span>
            </button>
          {/if}

          <div class="item-details">
            <div class="item-heading">
              {#if entry.typeLabel}
                <span class="type-label">[{entry.typeLabel}]</span>
              {/if}
              <span class={`item-name ${rarityClass(entry, catalogItem)}`}>
                {rowName(entry, catalogItem).toUpperCase()}
              </span>
            </div>
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
            {#if detailRows.length > 0}
              <TerminalStatGrid items={detailRows} columns={3} dense />
            {/if}

            {#if description}
              <p>{description}</p>
            {/if}

            {#if mechanics}
              <p class="mechanics">{mechanics}</p>
            {/if}

            {#if entry.equipmentId && !catalogItem && !entry.detailRows?.length}
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
