<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let isGM = $derived(dbState.isGM);
  let playerCharacters = $derived(dbState.playerCharacters);

  async function deleteCharacter(characterId: string, characterName: string) {
    const confirmed = window.confirm(`Delete ${characterName}? This also deletes their personal inventory.`);
    if (!confirmed) return;

    const deleted = await dbState.deleteCharacter(characterId);
    toastState.notify(deleted ? 'CHARACTER DELETED' : 'ERROR: CHARACTER DELETE FAILED');
  }
</script>

<TerminalPanel title={isGM ? 'CREW' : 'CHARACTERS'}>
  {#if playerCharacters.length === 0}
    <div class="dim-message">NO LINKED CHARACTERS</div>
  {:else}
    <div class="character-list">
      {#each playerCharacters as character}
        <div
          class="character-row"
          class:active={character.id === dbState.activeCharacter?.id}
        >
          <button class="character-select" onclick={() => dbState.setActiveCharacter(character.id)}>
            <span>{character.name.toUpperCase()}</span>
            <em>LVL {character.level} {character.character_class.toUpperCase()}</em>
          </button>

          {#if isGM}
            <button
              class="btn-action btn-danger btn-delete"
              aria-label={`Delete ${character.name}`}
              onclick={() => deleteCharacter(character.id, character.name)}
            >
              DELETE
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</TerminalPanel>

<style>
  .character-list {
    display: grid;
    gap: 2rem;
    align-content: start;
  }

  .character-row {
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
  }

  .character-select {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    padding: 0;
    background: transparent;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .character-row.active {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .character-row span,
  .character-select span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .character-row em,
  .character-select em {
    color: var(--text-dim);
    font-size: 0.72rem;
    font-style: normal;
  }

  .btn-delete {
    padding: 0.45rem 0.65rem;
    font-size: 0.68rem;
  }
</style>
