<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let npcCharacters = $derived(dbState.npcCharacters);

  async function deleteCharacter(characterId: string, characterName: string) {
    const confirmed = window.confirm(`Delete ${characterName}? This also deletes their personal inventory.`);
    if (!confirmed) return;

    const deleted = await dbState.deleteCharacter(characterId);
    toastState.notify(deleted ? 'CHARACTER DELETED' : 'ERROR: CHARACTER DELETE FAILED');
  }
</script>

<TerminalPanel title="NPCS">
  {#if npcCharacters.length === 0}
    <div class="dim-message">NO NPCS RECORDED</div>
  {:else}
    <div class="character-list">
      {#each npcCharacters as npc}
        <div class="npc-row">
          <div class="npc-summary">
            <span>{npc.name.toUpperCase()}</span>
            <em>LVL {npc.level} {npc.character_class.toUpperCase()}</em>
          </div>

          <button
            class="btn-action btn-danger btn-delete"
            aria-label={`Delete ${npc.name}`}
            onclick={() => deleteCharacter(npc.id, npc.name)}
          >
            DELETE
          </button>
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

  .npc-row {
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

  .npc-summary {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
  }

  .npc-summary span,
  .npc-row span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .npc-summary em,
  .npc-row em {
    color: var(--text-dim);
    font-size: 0.72rem;
    font-style: normal;
  }

  .btn-delete {
    padding: 0.45rem 0.65rem;
    font-size: 0.68rem;
  }
</style>
