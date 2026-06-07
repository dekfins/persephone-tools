<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { CampaignLogEvent } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let isOpen = $state(false);

  function formatTime(value: string) {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCampaignDay(event: CampaignLogEvent) {
    return event.campaign_day === null ? 'DAY --' : `DAY ${Number(event.campaign_day).toFixed(2)}`;
  }

  function canRollback(event: CampaignLogEvent) {
    return dbState.isGM && Boolean(event.snapshot) && !event.reverted_at;
  }
</script>

<button
  type="button"
  class="log-trigger"
  class:open={isOpen}
  aria-expanded={isOpen}
  aria-controls="campaign-log-drawer"
  onclick={() => isOpen = !isOpen}
>
  {isOpen ? 'X' : 'LOG'}
</button>

{#if isOpen}
  <button
    type="button"
    class="log-scrim"
    aria-label="Close campaign log"
    onclick={() => isOpen = false}
  ></button>
{/if}

<aside id="campaign-log-drawer" class="campaign-log" class:open={isOpen}>
  <TerminalPanel title="CAMPAIGN LOG">
    {#if dbState.campaignLogEvents.length === 0}
      <div class="dim-message">NO RECORDED EVENTS</div>
    {:else}
      <div class="log-list">
        {#each dbState.campaignLogEvents as event}
          <article class="log-row" class:reverted={Boolean(event.reverted_at)}>
            <div class="log-meta">
              <span>{formatTime(event.event_time)}</span>
              <span>{formatCampaignDay(event)}</span>
            </div>
            <strong>{event.summary}</strong>
            <div class="log-type">{event.event_type.replace(/_/g, ' ').toUpperCase()}</div>

            {#if event.reverted_at}
              <div class="rollback-state">REVERTED {formatTime(event.reverted_at)}</div>
            {:else if canRollback(event)}
              <button class="btn-action btn-compact rollback-button" onclick={() => dbState.rollbackLogEvent(event)}>
                ROLLBACK
              </button>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </TerminalPanel>
</aside>

<style>
  .log-trigger {
    position: fixed;
    top: 92px;
    right: 1rem;
    z-index: 1100;
    width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.5rem;
    background: var(--bg-panel);
    border: var(--border-subtle);
    color: var(--accent-amber);
    font-family: var(--font-terminal);
    font-size: 0.74rem;
    font-weight: bold;
    letter-spacing: 0.1em;
    cursor: pointer;
    box-shadow: 0 0 16px rgba(0, 0, 0, 0.35);
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }

  .log-trigger:hover,
  .log-trigger.open {
    border-color: var(--accent-amber);
    background: var(--bg-void);
  }

  .log-scrim {
    position: fixed;
    inset: 0;
    z-index: 1040;
    background: rgba(0, 0, 0, 0.24);
    border: 0;
    cursor: default;
  }

  .campaign-log {
    position: fixed;
    top: 80px;
    right: 0;
    bottom: 0;
    width: min(380px, calc(100vw - 2rem));
    z-index: 1050;
    display: grid;
    padding: 0.75rem;
    background: color-mix(in srgb, var(--bg-void) 94%, transparent);
    border-left: var(--border-subtle);
    box-shadow: -18px 0 30px rgba(0, 0, 0, 0.35);
    overflow: hidden;
    transform: translateX(100%);
    transition: transform 0.18s ease;
    pointer-events: none;
  }

  .campaign-log.open {
    transform: translateX(0);
    pointer-events: auto;
  }

  .campaign-log :global(.terminal-card) {
    height: 100%;
    overflow: hidden;
  }

  .log-list {
    display: grid;
    gap: 0.65rem;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .log-row {
    display: grid;
    gap: 0.35rem;
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .log-row.reverted {
    opacity: 0.58;
  }

  .log-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    color: var(--text-dim);
    font-size: 0.68rem;
  }

  .log-row strong {
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .log-type,
  .rollback-state {
    color: var(--accent-amber);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
  }

  .rollback-button {
    width: 100%;
    border-color: var(--accent-red);
    color: var(--accent-red);
  }

  @media (max-width: 700px) {
    .campaign-log {
      top: 72px;
      width: min(360px, calc(100vw - 1rem));
    }
  }
</style>
