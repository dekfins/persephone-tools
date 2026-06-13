<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import CampaignInvitePanel from '../campaign/CampaignInvitePanel.svelte';
  import HomeAccessPanel from './HomeAccessPanel.svelte';
  import HomeCampaignsPanel from './HomeCampaignsPanel.svelte';
  import HomeCharactersPanel from './HomeCharactersPanel.svelte';
  import HomeNpcsPanel from './HomeNpcsPanel.svelte';

  let hasCampaigns = $derived(dbState.campaigns.length > 0);
  let isGM = $derived(dbState.isGM);
</script>

<div class="home-grid">
  <div class="col-stack">
    <HomeAccessPanel />

    <HomeCampaignsPanel />

    {#if isGM}
      <CampaignInvitePanel />
    {/if}
  </div>

  <div class="col-stack">
    <HomeCharactersPanel />

    {#if hasCampaigns && isGM}
      <HomeNpcsPanel />
    {/if}
  </div>
</div>

<style>
  .home-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    gap: 2rem;
    align-items: start;
    max-width: 1180px;
    width: 100%;
    margin: 0 auto;
  }

  .col-stack {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  @media (max-width: 1000px) {
    .home-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
