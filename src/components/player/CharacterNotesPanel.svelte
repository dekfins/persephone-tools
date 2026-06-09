<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { CharacterNotes } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let creation = $derived(dbState.localCharacterCreation);
  let notes = $derived(creation ?? char?.character_notes ?? null);
  let isSaving = $state(false);
  let lastSyncedCharacterId = $state<string | null>(null);
  let draft = $state<CharacterNotes>({
    homeworld: '',
    employerAffiliation: '',
    goal: '',
    notes: ''
  });

  let savedNotes = $derived(notesToDraft(notes));
  let isDirty = $derived(
    draft.homeworld !== savedNotes.homeworld ||
    draft.employerAffiliation !== savedNotes.employerAffiliation ||
    draft.goal !== savedNotes.goal ||
    draft.notes !== savedNotes.notes
  );
  let fieldsDisabled = $derived(!char || isSaving);

  $effect(() => {
    const characterId = char?.id ?? null;
    if (characterId !== lastSyncedCharacterId || !isDirty) {
      draft = { ...savedNotes };
      lastSyncedCharacterId = characterId;
    }
  });

  function notesToDraft(value: CharacterNotes | null): CharacterNotes {
    return {
      homeworld: value?.homeworld ?? '',
      employerAffiliation: value?.employerAffiliation ?? '',
      goal: value?.goal ?? '',
      notes: value?.notes ?? ''
    };
  }

  function revertNotes() {
    draft = { ...savedNotes };
  }

  async function saveNotes() {
    if (!char || isSaving || !isDirty) return;

    isSaving = true;
    const didSave = await dbState.updateCharacterNotes(char.id, draft);
    isSaving = false;
    if (didSave) draft = { ...savedNotes };
  }
</script>

<TerminalPanel title="CHARACTER NOTES" extraClass="player-panel">
  {#if notes}
    <div class="notes-grid">
      <label class="notes-field notes-row-field" for="character-notes-homeworld">
        <span>HOMEWORLD</span>
        <input
          id="character-notes-homeworld"
          class="terminal-input"
          type="text"
          bind:value={draft.homeworld}
          disabled={fieldsDisabled}
          autocomplete="off"
          placeholder="OPEN"
        />
      </label>
      <label class="notes-field notes-row-field" for="character-notes-employer">
        <span>EMPLOYER</span>
        <input
          id="character-notes-employer"
          class="terminal-input"
          type="text"
          bind:value={draft.employerAffiliation}
          disabled={fieldsDisabled}
          autocomplete="off"
          placeholder="OPEN"
        />
      </label>
      <label class="notes-field" for="character-notes-goal">
        <span>GOAL</span>
        <textarea
          id="character-notes-goal"
          class="terminal-input notes-textarea"
          bind:value={draft.goal}
          disabled={fieldsDisabled}
          placeholder="OPEN"
        ></textarea>
      </label>
      <label class="notes-field" for="character-notes-notes">
        <span>NOTES</span>
        <textarea
          id="character-notes-notes"
          class="terminal-input notes-textarea notes-body"
          bind:value={draft.notes}
          disabled={fieldsDisabled}
          placeholder="OPEN"
        ></textarea>
      </label>
    </div>
    {#if isDirty}
      <div class="notes-actions">
        <button class="btn-action btn-danger" type="button" onclick={revertNotes} disabled={isSaving}>REVERT</button>
        <button class="btn-action btn-full-amber" type="button" onclick={saveNotes} disabled={isSaving}>
          {isSaving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>
    {/if}
  {:else}
    <div class="dim-message">NO ARCHIVE NOTES AVAILABLE</div>
  {/if}
</TerminalPanel>

<style>
  .notes-grid {
    display: grid;
    gap: 0.55rem;
  }

  .notes-field {
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.6rem;
    font-family: var(--font-terminal);
    font-size: 0.78rem;
  }

  .notes-row-field {
    display: grid;
    grid-template-columns: minmax(7rem, auto) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: center;
  }

  .notes-field {
    display: grid;
    gap: 0.45rem;
  }

  span {
    color: var(--text-dim);
    text-transform: uppercase;
  }

  .terminal-input,
  .notes-textarea {
    color: var(--text-main) !important;
    font-size: 0.82rem;
    line-height: 1.4;
    text-transform: none;
  }

  .notes-row-field .terminal-input {
    text-align: right;
  }

  .terminal-input:disabled,
  .notes-textarea:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .notes-textarea {
    min-height: 4.5rem;
    resize: vertical;
  }

  .notes-body {
    min-height: 7rem;
  }

  .notes-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-top: 0.7rem;
  }

  .notes-actions .btn-action {
    min-width: 0;
    width: 100%;
    padding-inline: 0.65rem;
  }

  @media (max-width: 700px) {
    .notes-row-field,
    .notes-actions {
      grid-template-columns: 1fr;
    }

    .notes-row-field .terminal-input {
      text-align: left;
    }
  }
</style>
