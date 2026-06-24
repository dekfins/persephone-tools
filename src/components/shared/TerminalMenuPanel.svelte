<script module lang="ts">
  export type TerminalMenuEntry = {
    id: string;
    label: string;
    kicker?: string;
    description?: string;
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import TerminalPanel from './TerminalPanel.svelte';

  type Props = {
    title: string;
    entries: TerminalMenuEntry[];
    activeId: string;
    onSelect: (entry: TerminalMenuEntry) => void;
    ariaLabel?: string;
  };

  let {
    title,
    entries,
    activeId,
    onSelect,
    ariaLabel = title
  }: Props = $props();

  function selectEntry(entry: TerminalMenuEntry) {
    if (entry.disabled) return;
    onSelect(entry);
  }
</script>

<TerminalPanel title={title} extraClass="terminal-menu-panel">
  <nav class="terminal-menu-list" aria-label={ariaLabel}>
    {#each entries as entry (entry.id)}
      <button
        type="button"
        class="terminal-menu-entry"
        class:active={entry.id === activeId}
        disabled={entry.disabled}
        aria-current={entry.id === activeId ? 'page' : undefined}
        onclick={() => selectEntry(entry)}
      >
        <span class="entry-heading">
          {#if entry.kicker}
            <span class="entry-kicker">{entry.kicker}</span>
          {/if}
          <strong>{entry.label}</strong>
        </span>

        {#if entry.description}
          <span class="entry-description">{entry.description}</span>
        {/if}
      </button>
    {/each}
  </nav>
</TerminalPanel>

<style>
  :global(.terminal-menu-panel) {
    position: sticky;
    top: 5.5rem;
  }

  .terminal-menu-list {
    display: grid;
    gap: 0.65rem;
  }

  .terminal-menu-entry {
    display: grid;
    gap: 0.3rem;
    width: 100%;
    padding: 0.75rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    cursor: pointer;
    font-family: var(--font-terminal);
    text-align: left;
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
  }

  .terminal-menu-entry:hover,
  .terminal-menu-entry:focus-visible,
  .terminal-menu-entry.active {
    background: rgba(245, 158, 11, 0.06);
    border-color: var(--accent-amber);
    outline: none;
  }

  .terminal-menu-entry.active {
    color: var(--accent-amber);
  }

  .terminal-menu-entry:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .entry-heading {
    display: grid;
    gap: 0.18rem;
  }

  .entry-kicker,
  .entry-description {
    color: var(--text-dim);
    font-size: 0.72rem;
    line-height: 1.35;
    text-transform: uppercase;
  }

  .entry-heading strong {
    color: inherit;
    font-size: 0.92rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  @media (max-width: 900px) {
    :global(.terminal-menu-panel) {
      position: static;
    }

    .terminal-menu-list {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
  }
</style>
