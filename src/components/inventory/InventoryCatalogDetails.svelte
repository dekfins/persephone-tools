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

<style>
  .catalog-detail {
    display: grid;
    gap: 0.65rem;
    border: var(--border-subtle);
    background: var(--bg-void);
    color: var(--text-main);
    font-family: var(--font-terminal);
    padding: 0.75rem;
    margin-top: 0.7rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .detail-grid div {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
    font-size: 0.74rem;
    text-transform: uppercase;
  }

  .detail-label {
    color: var(--text-dim);
  }

  p {
    margin: 0;
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .mechanics {
    color: var(--accent-amber);
  }

  .tag-line {
    color: var(--text-dim);
    font-size: 0.72rem;
    line-height: 1.4;
    text-transform: uppercase;
  }

  @media (max-width: 900px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
