<script lang="ts">
  import backgrounds from '../../data/character/backgrounds.json';
  import {
    ALL_BACKGROUNDS,
    BACKGROUND_CHOICE_LABELS
  } from '../../lib/characterConstants';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { AttributeKey, Background, BackgroundDefinitions, BackgroundRuleEntry, Skill } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type ChoiceOption = {
    label: string;
    value: Skill | AttributeKey;
    kind: 'skill' | 'attribute';
  };

  const BACKGROUNDS = backgrounds as BackgroundDefinitions;
  const backgroundOptions = ALL_BACKGROUNDS.map((background) => ({
    label: background.toUpperCase(),
    value: background,
    description: BACKGROUNDS[background].description
  }));

  let selectedBackground = $state(backgroundOptions[0]);
  let selectedChoice = $state<ChoiceOption | null>(null);

  let choices = $derived(characterCreatorState.draft.backgroundProgress.choices ?? []);

  $effect(() => {
    selectedBackground = backgroundOptions.find((option) => option.value === characterCreatorState.draft.background) ?? backgroundOptions[0];
  });

  $effect(() => {
    selectedChoice = characterCreatorState.currentChoiceOptions[0] ?? null;
  });

  function formatEntry(entry: BackgroundRuleEntry) {
    if (entry.type === 'skill') return `${entry.value}-0/+1`;
    if (entry.type === 'special') return BACKGROUND_CHOICE_LABELS[entry.value];
    return `+${entry.bonus} ${entry.category.toUpperCase()} STAT`;
  }

  function pendingTitle() {
    if (!characterCreatorState.currentQueuedGrant) return '';
    if (characterCreatorState.pendingChoiceKind === 'redirect') return 'DUPLICATE SKILL REDIRECT';
    if (characterCreatorState.pendingChoiceKind === 'attribute') return 'ATTRIBUTE TARGET';
    return 'SKILL TARGET';
  }

  function confirmPendingChoice() {
    if (!selectedChoice) return;

    characterCreatorState.confirmPendingChoice(
      selectedChoice.kind === 'skill'
        ? { skill: selectedChoice.value as Skill }
        : { attribute: selectedChoice.value as AttributeKey }
    );
  }

</script>

<TerminalPanel title="BACKGROUND SETUP" extraClass="creator-panel">
  <div class="background-select">
    <label for="creator-background">BACKGROUND</label>
    <TerminalSelect
      id="creator-background"
      options={backgroundOptions}
      bind:value={selectedBackground}
      onSelect={(option: { value: Background }) => characterCreatorState.setBackground(option.value)}
      popupSide="right"
    />
  </div>
  
  <section class="background-description" aria-label="Background description">
    {characterCreatorState.backgroundDefinition.description}
  </section>

  <div class="mode-grid four">
    <button
      class="btn-action mode-option"
      class:active={characterCreatorState.draft.backgroundProgress.mode === 'quick_skills'}
      onclick={() => characterCreatorState.beginQuickSkills()}
    >
      QUICK SKILLS
    </button>
    <button
      class="btn-action mode-option"
      class:active={characterCreatorState.draft.backgroundProgress.mode === 'roll_tables'}
      onclick={() => characterCreatorState.beginRollTables()}
    >
      ROLL TABLES
    </button>
    <button
      class="btn-action mode-option"
      class:active={characterCreatorState.draft.backgroundProgress.mode === 'pick_learning'}
      onclick={() => characterCreatorState.beginLearningPicks()}
    >
      PICK LEARNING
    </button>
    <button class="btn-action btn-danger reset-background" onclick={() => characterCreatorState.resetCharacterSkillProgress()}>
      RESET
    </button>
  </div>

  {#if characterCreatorState.draft.backgroundProgress.mode}
    {#if characterCreatorState.draft.backgroundProgress.mode === 'roll_tables' && !characterCreatorState.draft.backgroundProgress.complete}
      <div class="progress-line">ROLLS: {characterCreatorState.rollCount}/3</div>
      <div class="mode-grid two">
        <button class="btn-action" onclick={() => characterCreatorState.rollOn('growth')}>ROLL GROWTH</button>
        <button class="btn-action" onclick={() => characterCreatorState.rollOn('learning')}>ROLL LEARNING</button>
      </div>
    {/if}

    {#if characterCreatorState.draft.backgroundProgress.mode === 'pick_learning' && !characterCreatorState.draft.backgroundProgress.complete}
      <div class="progress-line">LEARNING PICKS: {characterCreatorState.learningPickCount}/2</div>
      <div class="learning-grid">
        {#each characterCreatorState.backgroundDefinition.learning as entry, index}
          <button
            class="btn-action learning-choice"
            disabled={characterCreatorState.pickedLearningIndexes.has(index)}
            onclick={() => characterCreatorState.pickLearning(index)}
          >
            {index + 1}: {formatEntry(entry)}
          </button>
        {/each}
      </div>
    {/if}
  {/if}

  <div class="choice-log">
    <h4>CHOICES MADE</h4>
    {#if choices.length > 0}
      {#each choices as grant}
        <div class="choice-row">
          <span>{grant.source.replace('_', ' ')}</span>
          <span>{grant.label}</span>
          <span class="choice-result">
            {grant.result.target.toUpperCase()} {grant.result.before} &gt; {grant.result.after}
          </span>
        </div>
      {/each}
    {:else}
      <div class="dim-message">NO BACKGROUND CHOICES RECORDED</div>
    {/if}
  </div>

</TerminalPanel>

{#if characterCreatorState.currentQueuedGrant && characterCreatorState.pendingChoiceKind}
  <div class="modal-overlay">
    <div class="terminal-card modal-content">
      <h3>{pendingTitle()}</h3>
      <div class="choice-entry">{formatEntry(characterCreatorState.currentQueuedGrant.entry)}</div>
      <TerminalSelect
        id="creator-pending-background-choice"
        options={characterCreatorState.currentChoiceOptions}
        bind:value={selectedChoice}
        showPopup={false}
      />
      <div class="modal-actions">
        <button class="btn-action btn-danger" onclick={() => characterCreatorState.cancelPendingChoice()}>CANCEL</button>
        <button class="btn-action btn-amber" onclick={confirmPendingChoice}>APPLY CHOICE</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .choice-result {
    color: var(--accent-amber);
  }

  .background-select {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.65rem;
  }

  label {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
  }

  .background-description {
    border: var(--border-subtle);
    background: var(--bg-void);
    color: var(--text-main);
    font-family: var(--font-terminal);
    font-size: 0.8rem;
    line-height: 1.5;
    padding: 0.75rem;
    margin: 0.65rem 0 0.8rem;
  }

  .mode-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.6rem;
    margin-top: 0.8rem;
  }

  .mode-grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mode-grid.four {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .mode-option.active,
  .mode-option.active:hover {
    background: var(--ui-cyan, #00aacc);
    color: var(--bg-void) !important;
    border-color: var(--ui-cyan, #00aacc);
  }

  .progress-line,
  .choice-entry {
    border: var(--border-subtle);
    background: var(--bg-void);
    color: var(--accent-amber);
    padding: 0.6rem;
    text-align: center;
    font-size: 0.8rem;
    text-transform: uppercase;
    margin-top: 0.8rem;
  }

  .learning-grid,
  .choice-log {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.9rem;
  }

  h4 {
    color: var(--text-dim);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
  }

  .learning-choice {
    text-align: left;
    white-space: normal;
  }

  .choice-row {
    display: grid;
    grid-template-columns: 5.75rem 1fr;
    gap: 0.3rem 0.55rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.55rem;
    font-size: 0.76rem;
    text-transform: uppercase;
  }

  .choice-row span:first-child {
    color: var(--text-dim);
  }

  .choice-result {
    grid-column: 2;
  }

  .dim-message {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
  }

  .btn-danger {
    border-color: var(--accent-red);
    color: var(--accent-red);
  }

  .reset-background {
    width: 100%;
  }

  .btn-danger:hover {
    background: var(--accent-red);
    color: var(--bg-void);
    border-color: var(--accent-red);
  }

  .btn-amber {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .btn-amber:hover {
    background: var(--accent-amber);
    color: var(--bg-void);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    width: min(420px, calc(100vw - 2rem));
    border: 1px solid var(--accent-amber);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
    background: var(--bg-panel);
    padding: 1.5rem;
    display: grid;
    gap: 0.85rem;
  }

  .modal-content h3 {
    color: var(--accent-amber);
    font-size: 1rem;
    letter-spacing: 0.08em;
  }

  .modal-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    align-items: center;
  }

  .modal-actions .btn-action {
    width: 100%;
  }

  @media (max-width: 720px) {
    .mode-grid.two,
    .mode-grid.four,
    .modal-actions {
      grid-template-columns: 1fr;
    }

  }
</style>
