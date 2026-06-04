<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);

  function classLabel() {
    if (!char) return 'OPEN';
    return `LEVEL ${char.level} ${char.character_class}`.toUpperCase();
  }

  function heritageBackgroundLabel() {
    if (!char) return 'OPEN';
    return `${char.heritage} ${char.background}`.toUpperCase();
  }
</script>

<TerminalPanel title="IDENTITY" extraClass="player-panel">
  {#if char}
    <div class="identity-stack">
      <div class="identity-row primary">
        <span>NAME</span>
        <strong>{char.name.toUpperCase()}</strong>
      </div>
      <div class="identity-row">
        <span>CLASS</span>
        <strong>{classLabel()}</strong>
      </div>
      <div class="identity-row">
        <span>ORIGIN</span>
        <strong>{heritageBackgroundLabel()}</strong>
      </div>
      {#if dbState.localCharacterCreation}
        <div class="identity-row">
          <span>HOMEWORLD</span>
          <strong>{dbState.localCharacterCreation.homeworld || 'OPEN'}</strong>
        </div>
      {/if}
      {#if dbState.isLocalCharacterPreview}
        <div class="terminal-alert">ARCHIVE PREVIEW - NOT SYNCED TO CLOUD</div>
      {/if}
    </div>
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .identity-stack {
    display: grid;
    gap: 0.5rem;
  }

  .identity-row {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: 0.75rem;
    align-items: center;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
    font-family: var(--font-terminal);
  }

  .identity-row.primary {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  span {
    color: var(--text-dim);
    font-size: 0.75rem;
  }

  strong {
    color: var(--accent-amber);
    overflow-wrap: anywhere;
  }
</style>
