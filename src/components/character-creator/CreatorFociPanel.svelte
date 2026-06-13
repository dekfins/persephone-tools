<script lang="ts">
  import { untrack } from 'svelte';
  import { ALL_SKILLS } from '../../lib/character/characterConstants';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { BackgroundResolvedChoice, Foci, FocusGrantEntry, FocusPickSource, Skill } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type SelectOption<T> = {
    label: string;
    value: T;
    description?: string;
    class?: string;
    kind?: 'skill';
  };

  type FreeSkillOption = SelectOption<Skill | ''>;

  const freeSkillPlaceholder: FreeSkillOption = {
    label: 'SELECT...',
    value: ''
  };

  let selectedFocusChoice = $state<SelectOption<Skill> | null>(null);
  let selectedFreeSkill = $state<FreeSkillOption>(freeSkillPlaceholder);

  let focusGrants = $derived(characterCreatorState.draft.focusProgress.grants ?? []);
  let freeSkillOptions = $derived(
    [
      freeSkillPlaceholder,
      ...ALL_SKILLS
        .filter((skill) => skill === characterCreatorState.draft.freeInterestSkill || (characterCreatorState.draft.skills[skill] ?? -1) < 1)
        .map((skill) => ({ label: skill.toUpperCase(), value: skill }))
    ]
  );

  $effect(() => {
    selectedFocusChoice = characterCreatorState.currentFocusChoiceOptions[0] ?? null;
  });

  $effect(() => {
    const currentSelectedValue = untrack(() => selectedFreeSkill?.value);
    const nextSelectedFreeSkill =
      freeSkillOptions.find((option) => option.value === characterCreatorState.draft.freeInterestSkill) ??
      freeSkillPlaceholder;

    if (currentSelectedValue !== nextSelectedFreeSkill?.value) {
      selectedFreeSkill = nextSelectedFreeSkill;
    }
  });

  function applyFocus(source: FocusPickSource, focus: Foci) {
    characterCreatorState.setFocusPick(source, focus);
  }

  function formatFocusEntry(entry: FocusGrantEntry) {
    if (entry.type === 'skill') return `${entry.value}-0/+1`;
    return entry.value.toUpperCase();
  }

  function focusLevelLabel(focus: Foci) {
    const level = characterCreatorState.highestFocusLevels[focus] ?? 1;
    return `LVL ${level}`;
  }

  function pendingTitle() {
    if (characterCreatorState.pendingFocusChoiceKind === 'redirect') return 'DUPLICATE FOCUS SKILL';
    return 'FOCUS SKILL TARGET';
  }

  function confirmPendingChoice() {
    if (!selectedFocusChoice) return;
    characterCreatorState.confirmPendingFocusChoice({ skill: selectedFocusChoice.value } satisfies BackgroundResolvedChoice);
  }

  function selectFreeSkill(option: FreeSkillOption) {
    if (!option.value) {
      selectedFreeSkill = freeSkillOptions.find((candidate) => candidate.value === characterCreatorState.draft.freeInterestSkill) ?? freeSkillPlaceholder;
      return;
    }

    const applied = characterCreatorState.applyFreeInterestSkill(option.value);
    if (!applied) {
      selectedFreeSkill = freeSkillOptions.find((candidate) => candidate.value === characterCreatorState.draft.freeInterestSkill) ?? freeSkillPlaceholder;
    }
  }
</script>

<TerminalPanel title="FOCI + FREE SKILL" extraClass="creator-panel">
  <div class="focus-status">
    <span>FOCUS SLOTS</span>
    <strong>{characterCreatorState.draft.focusPicks.length}/{characterCreatorState.focusSlots.length}</strong>
  </div>

  <div class="focus-grid">
    {#each characterCreatorState.focusSlots as slot}
      {@const pick = characterCreatorState.getFocusPick(slot.source)}
      <section class="focus-card">
        <div class="focus-heading">
          <div>
            <span>{slot.label}</span>
            <strong>{slot.filter === 'any' ? 'ANY FOCUS' : `${slot.filter.toUpperCase()} ONLY`}</strong>
          </div>
          {#if pick}
            <em>{focusLevelLabel(pick.focus)}</em>
          {/if}
        </div>

        <div class="focus-option-grid">
          {#each characterCreatorState.getFocusOptionsForSlot(slot) as option}
            <button
              class="focus-option"
              class:active={pick?.focus === option.value}
              onclick={() => applyFocus(slot.source, option.value)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          {/each}
        </div>

        {#if pick}
          {@const definition = characterCreatorState.focusDefinitions[pick.focus]}
          {#if definition}
            <p>{definition.description}</p>
            <div class="focus-effect">
              <span>LEVEL 1</span>
              <strong>{definition.level1}</strong>
            </div>
            <div class="focus-effect">
              <span>LEVEL 2</span>
              <strong>{definition.level2}</strong>
            </div>
          {/if}
        {/if}
      </section>
    {/each}
  </div>

  <div class="grant-log">
    <h4>FOCUS GRANTS</h4>
    {#if focusGrants.length > 0}
      {#each focusGrants as grant}
        <div class="grant-row">
          <span>{grant.source.replace('_', ' ').toUpperCase()}</span>
          <span>{grant.label}</span>
          <strong>{grant.result.target.toUpperCase()} {grant.result.before} &gt; {grant.result.after}</strong>
        </div>
      {/each}
    {:else}
      <div class="dim-message">NO FOCUS GRANTS RECORDED</div>
    {/if}
  </div>

  <div class="free-skill-box">
    <h4>FREE INTEREST SKILL</h4>
    <div class="free-skill-controls">
      <TerminalSelect
        id="creator-free-interest-skill"
        options={freeSkillOptions}
        bind:value={selectedFreeSkill}
        onSelect={selectFreeSkill}
        placeholder="SELECT..."
        showPopup={false}
      />
    </div>
  </div>
</TerminalPanel>

{#if characterCreatorState.currentQueuedFocusGrant && characterCreatorState.pendingFocusChoiceKind}
  <div class="modal-overlay">
    <div class="terminal-card modal-content">
      <h3>{pendingTitle()}</h3>
      <div class="choice-entry">
        {characterCreatorState.currentQueuedFocusGrant.focus}:
        {formatFocusEntry(characterCreatorState.currentQueuedFocusGrant.entry)}
      </div>
      <TerminalSelect
        id="creator-pending-focus-choice"
        options={characterCreatorState.currentFocusChoiceOptions}
        bind:value={selectedFocusChoice}
        showPopup={false}
      />
      <div class="modal-actions">
        <button class="btn-action btn-amber" onclick={confirmPendingChoice}>APPLY CHOICE</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .focus-status,
  .focus-card,
  .grant-row,
  .dim-message,
  .choice-entry {
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .focus-status {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.65rem;
    margin-bottom: 0.8rem;
  }

  .focus-status span,
  .focus-heading span,
  .focus-effect span,
  h4 {
    color: var(--text-dim);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
  }

  .focus-status strong,
  .focus-heading strong,
  .grant-row strong {
    color: var(--accent-amber);
  }

  .focus-grid {
    display: grid;
    gap: 0.75rem;
  }

  .focus-option-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
    max-height: 15rem;
    overflow: auto;
    padding-right: 0.2rem;
  }

  .focus-option {
    display: grid;
    gap: 0.25rem;
    align-content: start;
    min-height: 5.5rem;
    background: var(--bg-panel);
    color: var(--text-main);
    border: var(--border-subtle);
    padding: 0.55rem;
    font-family: var(--font-terminal);
    text-align: left;
    cursor: pointer;
  }

  .focus-option.active {
    border-color: var(--accent-amber);
    background: rgba(245, 158, 11, 0.08);
  }

  .focus-option strong {
    color: var(--accent-amber);
    font-size: 0.76rem;
  }

  .focus-option span {
    color: var(--text-dim);
    font-size: 0.68rem;
    line-height: 1.3;
  }

  .focus-card {
    display: grid;
    gap: 0.65rem;
    padding: 0.75rem;
  }

  .focus-heading,
  .grant-row,
  .modal-actions {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
    align-items: center;
  }

  .free-skill-controls {
    display: grid;
    gap: 0.75rem;
  }

  .focus-heading div {
    display: grid;
    gap: 0.25rem;
  }

  .focus-heading em {
    color: var(--fighter-green);
    font-style: normal;
    font-size: 0.75rem;
  }

  .focus-card p {
    color: var(--text-main);
    font-family: var(--font-terminal);
    font-size: 0.8rem;
    line-height: 1.45;
    margin: 0;
  }

  .focus-effect {
    display: grid;
    gap: 0.25rem;
  }

  .focus-effect strong {
    color: var(--text-main);
    font-size: 0.78rem;
    font-weight: 400;
    line-height: 1.45;
  }

  .grant-log,
  .free-skill-box {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.9rem;
  }

  .grant-row {
    grid-template-columns: 8rem 1fr auto;
    padding: 0.55rem;
    font-size: 0.76rem;
  }

  .grant-row span {
    color: var(--text-main);
  }

  .dim-message {
    color: var(--text-dim);
    font-size: 0.8rem;
    padding: 0.6rem;
    text-align: center;
  }

  .btn-amber {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .btn-amber:hover:not(:disabled) {
    background: var(--accent-amber);
    color: var(--bg-void);
  }

  .btn-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.85);
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    display: grid;
    gap: 0.85rem;
    width: min(420px, calc(100vw - 2rem));
    background: var(--bg-panel);
    border: 1px solid var(--accent-amber);
    padding: 1.2rem;
  }

  .choice-entry {
    color: var(--accent-amber);
    padding: 0.6rem;
    text-align: center;
  }

  @media (max-width: 760px) {
    .focus-option-grid,
    .grant-row,
    .free-skill-controls,
    .modal-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
