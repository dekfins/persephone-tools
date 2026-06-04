<script lang="ts">
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  const conditionGroups = [
    { label: 'COMBAT', message: 'NO COMBAT CONDITIONS RECORDED' },
    { label: 'HAZARD', message: 'NO HAZARD CONDITIONS RECORDED' },
    { label: 'CUSTOM', message: 'NO CUSTOM CONDITIONS RECORDED' }
  ];
</script>

<TerminalPanel title="CONDITIONS" extraClass="player-panel">
  <div class="condition-grid">
    {#each conditionGroups as group}
      <section class="condition-group">
        <span>{group.label}</span>
        <strong>{group.message}</strong>
      </section>
    {/each}
  </div>
</TerminalPanel>

<style>
  .condition-grid {
    display: grid;
    gap: 0.5rem;
  }

  .condition-group {
    display: grid;
    gap: 0.25rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
    font-family: var(--font-terminal);
  }

  span {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  strong {
    color: var(--text-main);
    font-size: 0.78rem;
  }
</style>
