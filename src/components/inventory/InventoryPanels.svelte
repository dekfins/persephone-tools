<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import ShipInventoryPanel from './ShipInventoryPanel.svelte';
  import PersonalInventoryPanel from './PersonalInventoryPanel.svelte';
</script>

{#if dbState.activeCharacter}
  <div class="inventory-grid">
    {#if dbState.activeCampaignId}
      <div class="col-stack">
        <ShipInventoryPanel />
      </div>
    {/if}

    <div class="col-stack">
      <PersonalInventoryPanel />
    </div>

  </div>
{:else}
  <div class="terminal-alert">NO ACTIVE USER AUTHORIZED. PLEASE LOGIN.</div>
{/if}

<style>
  .inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
  }

  .col-stack {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  @media (max-width: 900px) {
    .inventory-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
