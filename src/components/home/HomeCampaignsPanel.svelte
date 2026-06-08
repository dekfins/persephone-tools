<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
</script>

<TerminalPanel title="CAMPAIGNS">
  <div class="campaign-list">
    {#each dbState.campaigns as campaign}
      <button
        class="campaign-row"
        class:active={campaign.id === dbState.activeCampaignId}
        onclick={() => dbState.setActiveCampaign(campaign.id)}
      >
        <span>{campaign.name.toUpperCase()}</span>
        <em>{campaign.status.toUpperCase()}</em>
      </button>
    {/each}
  </div>
</TerminalPanel>

<style>
  .campaign-list {
    display: grid;
    gap: 2rem;
    align-content: start;
  }

  .campaign-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    font-family: var(--font-terminal);
    text-align: left;
    cursor: pointer;
  }

  .campaign-row.active {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .campaign-row span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .campaign-row em {
    color: var(--text-dim);
    font-size: 0.72rem;
    font-style: normal;
  }
</style>
