<script lang="ts">
  import { HERITAGES } from '../../lib/characterConstants';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { Heritage } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  const heritageOptions = HERITAGES.map((option) => ({
    ...option,
    label: option.value === 'earthling' ? 'Earthling' : 'Voidborn'
  }));

  let heritageOption = $state(heritageOptions[0]);

  $effect(() => {
    heritageOption = heritageOptions.find((option) => option.value === characterCreatorState.draft.heritage) ?? heritageOptions[0];
  });

  function handleName(event: Event) {
    characterCreatorState.setName((event.target as HTMLInputElement).value);
  }

  function handleHomeworld(event: Event) {
    characterCreatorState.setHomeworld((event.target as HTMLInputElement).value);
  }

  function handleEmployerAffiliation(event: Event) {
    characterCreatorState.setEmployerAffiliation((event.target as HTMLInputElement).value);
  }

  function handleGoal(event: Event) {
    characterCreatorState.setGoal((event.target as HTMLTextAreaElement).value);
  }

  function handleNotes(event: Event) {
    characterCreatorState.setNotes((event.target as HTMLTextAreaElement).value);
  }
</script>

<TerminalPanel title="CREATOR IDENTITY" extraClass="creator-panel">
  <div class="form-grid">
    <div class="form-group span-full">
      <label for="creator-name">NAME</label>
      <input
        id="creator-name"
        type="text"
        class="terminal-input"
        value={characterCreatorState.draft.name}
        oninput={handleName}
        placeholder="Enter character name"
        autocomplete="off"
      />
    </div>

    <div class="form-group">
      <label for="creator-homeworld">HOMEWORLD</label>
      <input
        id="creator-homeworld"
        type="text"
        class="terminal-input"
        value={characterCreatorState.draft.homeworld}
        oninput={handleHomeworld}
        placeholder="Example: Ceres Transfer Habitat"
        autocomplete="off"
      />
    </div>

    <div class="form-group identity-select">
      <label for="creator-heritage">HERITAGE</label>
      <TerminalSelect
        id="creator-heritage"
        options={heritageOptions}
        bind:value={heritageOption}
        onSelect={(option: { value: Heritage }) => characterCreatorState.setHeritage(option.value)}
        showPopup={false}
      />
    </div>

    <div class="form-group span-full">
      <label for="creator-employer-affiliation">EMPLOYER / AFFILIATION</label>
      <input
        id="creator-employer-affiliation"
        type="text"
        class="terminal-input"
        value={characterCreatorState.draft.employerAffiliation}
        oninput={handleEmployerAffiliation}
        placeholder="Example: Big Heff Researcher, Independent Trader"
        autocomplete="off"
      />
    </div>

    <div class="form-group span-full">
      <label for="creator-goal">GOAL</label>
      <textarea
        id="creator-goal"
        class="terminal-input goal-input"
        value={characterCreatorState.draft.goal}
        oninput={handleGoal}
        placeholder="What drives your character? What are they trying to achieve?"
      ></textarea>
    </div>

    <div class="form-group span-full">
      <label for="creator-notes">NOTES</label>
      <textarea
        id="creator-notes"
        class="terminal-input notes-input"
        value={characterCreatorState.draft.notes}
        oninput={handleNotes}
        placeholder="Any other details about your character's appearance, personality, backstory, etc."
      ></textarea>
    </div>
  </div>
</TerminalPanel>

<style>
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 0.85rem;
    row-gap: 0.85rem;
    align-items: start;
  }

  .form-group {
    display: grid;
    grid-template-rows: auto auto;
    gap: 0.45rem;
    align-content: start;
  }

  label {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    line-height: 1;
    letter-spacing: 0.08em;
    margin: 0;
    text-transform: uppercase;
  }

  .span-full {
    grid-column: 1 / -1;
  }

  input.terminal-input,
  textarea.terminal-input,
  .terminal-input,
  .goal-input,
  .notes-input {
    width: 100%;
    background: var(--bg-void);
    color: var(--text-main);
    border: var(--border-subtle);
    padding: 0.75rem;
    font-family: var(--font-terminal);
    font-size: 0.9rem;
    line-height: 1.4;
    box-sizing: border-box;
    display: block;
    min-height: 2.65rem;
    text-transform: none;
  }

  .goal-input,
  .notes-input {
    min-height: 5rem;
    resize: vertical;
  }

  .notes-input {
    min-height: 6rem;
  }

  .terminal-input:focus,
  .goal-input:focus,
  .notes-input:focus {
    outline: none;
    border-color: var(--accent-amber);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
  }

  input.terminal-input::placeholder,
  textarea.terminal-input::placeholder,
  .terminal-input::placeholder {
    color: var(--text-main);
    font-family: var(--font-terminal);
    opacity: 0.5;
    text-transform: none;
  }

  .identity-select :global(.option-item) {
    color: var(--text-main);
    font-size: 0.9rem;
    line-height: 1.4;
    text-transform: none;
  }

  .identity-select :global(.select-input) {
    color: var(--accent-amber);
    font-size: 0.9rem;
    line-height: 1.4;
    min-height: 2.65rem;
    text-transform: none;
  }

  .identity-select :global(.select-trigger) {
    min-height: 2.65rem;
  }

  .identity-select :global(.option-item.selected) {
    color: var(--accent-amber);
  }

  @media (max-width: 700px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
