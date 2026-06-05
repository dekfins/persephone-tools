<script lang="ts">
  import type { EquipmentCatalogItem } from '../../lib/types';

  let { catalogItem }: { catalogItem: EquipmentCatalogItem } = $props();

  function formatField(value: string) {
    return value.replace(/_/g, ' ').toUpperCase();
  }

  let tagLine = $derived(catalogItem.tags.map(formatField).join(', '));
</script>

<div class="catalog-detail">
  <div class="detail-grid">
    <div>
      <span class="detail-label">LEGALITY</span>
      <span>{formatField(catalogItem.legality)}</span>
    </div>
    <div>
      <span class="detail-label">AVAILABILITY</span>
      <span>{formatField(catalogItem.availability)}</span>
    </div>
  </div>

  <p>{catalogItem.description}</p>

  {#if catalogItem.mechanics}
    <p class="mechanics">{catalogItem.mechanics}</p>
  {/if}

  {#if tagLine}
    <div class="tag-line">{tagLine}</div>
  {/if}
</div>
