<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let creation = $derived(dbState.localCharacterCreation);
  let notes = $derived(creation ?? char?.character_notes ?? null);

  function displayValue(value: string) {
    return value.trim() || 'OPEN';
  }
</script>

<TerminalPanel title="CHARACTER NOTES" extraClass="player-panel">
  {#if notes}
    <div class="notes-grid">
      <div class="notes-row">
        <span>HOMEWORLD</span>
        <strong>{displayValue(notes.homeworld)}</strong>
      </div>
      <div class="notes-row">
        <span>EMPLOYER</span>
        <strong>{displayValue(notes.employerAffiliation)}</strong>
      </div>
      <div class="notes-block">
        <span>GOAL</span>
        <p>{displayValue(notes.goal)}</p>
      </div>
      <div class="notes-block">
        <span>NOTES</span>
        <p>{displayValue(notes.notes)}</p>
      </div>
    </div>
  {:else}
    <div class="dim-message">NO ARCHIVE NOTES AVAILABLE</div>
  {/if}
</TerminalPanel>

<style>
  .notes-grid {
    display: grid;
    gap: 0.55rem;
  }

  .notes-row,
  .notes-block {
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.6rem;
    font-family: var(--font-terminal);
    font-size: 0.78rem;
  }

  .notes-row {
    display: grid;
    grid-template-columns: minmax(7rem, auto) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: start;
  }

  span {
    color: var(--text-dim);
  }

  strong {
    color: var(--accent-amber);
    text-align: right;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0.35rem 0 0;
    color: var(--text-main);
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
