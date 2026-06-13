<script lang="ts">
  import { CHARACTER_CLASSES } from '../../lib/character/characterConstants';
  import { CLASS_ABILITIES, type ClassAbilityDefinition } from '../../lib/character/characterMechanics';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { CharacterClass } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  const classDetails = CLASS_ABILITIES as Record<CharacterClass, ClassAbilityDefinition>;

  let selectedClass = $derived(characterCreatorState.draft.characterClass);
  let selectedDetails = $derived(classDetails[selectedClass]);
</script>

<TerminalPanel title="CLASS SELECTION" extraClass="creator-panel">
  <div class="class-grid">
    {#each CHARACTER_CLASSES as option}
      {@const detail = classDetails[option.value]}
      <button
        class="class-card"
        class:active={characterCreatorState.draft.characterClass === option.value}
        onclick={() => characterCreatorState.setClass(option.value)}
      >
        <span class="card-kicker">{detail.role}</span>
        <strong>{detail.label}</strong>
        <div class="card-bullets">
          {#each detail.bullets as bullet}
            <span>{bullet}</span>
          {/each}
        </div>
      </button>
    {/each}
  </div>

  <section class="class-effects" aria-label="Selected class effects">
    <div class="effects-header">
      <span>SELECTED CLASS</span>
      <strong>{selectedDetails.label}</strong>
    </div>

    <div class="effects-grid">
      <div class="effect-row">
        <span>MAX HP FORMULA IMPACT</span>
        <strong>{selectedDetails.hpImpact}</strong>
      </div>
      <div class="effect-row">
        <span>CLASS FEATURE</span>
        <strong>{selectedDetails.feature}</strong>
      </div>
    </div>
  </section>
</TerminalPanel>

<style>
  .class-grid {
    display: grid;
    gap: 0.65rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .class-card {
    display: grid;
    gap: 0.65rem;
    align-content: start;
    min-height: 10rem;
    background: var(--bg-void);
    color: var(--text-main);
    border: var(--border-subtle);
    padding: 0.8rem;
    font-family: var(--font-terminal);
    text-align: left;
    cursor: pointer;
  }

  .class-card.active {
    border-color: var(--accent-amber);
    background: rgba(245, 158, 11, 0.08);
    box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.2);
  }

  .class-card strong {
    color: var(--accent-amber);
    font-size: 1rem;
  }

  .card-kicker,
  .effects-header span,
  .effect-row span {
    color: var(--text-dim);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
  }

  .card-bullets {
    display: grid;
    gap: 0.35rem;
  }

  .card-bullets span {
    color: var(--text-main);
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .card-bullets span::before {
    content: '> ';
    color: var(--accent-amber);
  }

  .class-effects {
    display: grid;
    gap: 0.65rem;
    margin-top: 0.85rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.75rem;
    font-family: var(--font-terminal);
  }

  .effects-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }

  .effects-header strong,
  .effect-row strong {
    color: var(--accent-amber);
  }

  .effects-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .effect-row {
    display: grid;
    gap: 0.3rem;
    min-height: 4.4rem;
    background: var(--bg-panel);
    border: var(--border-subtle);
    padding: 0.55rem;
  }

  .effect-row strong {
    font-size: 0.82rem;
    line-height: 1.35;
  }

  @media (max-width: 760px) {
    .class-grid,
    .effects-grid {
      grid-template-columns: 1fr;
    }

    .effects-header {
      display: grid;
    }
  }
</style>
