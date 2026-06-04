<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { formatFocusPicks } from '../../lib/characterConstants';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let creation = $derived(dbState.localCharacterCreation);

  function partialLabel(value: string) {
    return value.replace('partial_', 'PARTIAL ').replace('_', ' ').toUpperCase();
  }

  function focusLabel() {
    if (!creation) return 'NONE';
    return formatFocusPicks(creation.focusPicks);
  }
</script>

{#if creation}
  <TerminalPanel title="CREATION DATA" extraClass="player-panel">
    <div class="summary-grid">
      <div class="summary-row">
        <span>BASE ATTACK</span>
        <strong>+{creation.baseAttackBonus}</strong>
      </div>
      <div class="summary-row">
        <span>ARMOR CLASS</span>
        <strong>{creation.armorClass}</strong>
      </div>
      <div class="summary-row">
        <span>HP ROLL</span>
        <strong>{creation.hpRoll}</strong>
      </div>
      <div class="summary-row">
        <span>PHYSICAL SAVE</span>
        <strong>{creation.saves.physical}</strong>
      </div>
      <div class="summary-row">
        <span>EVASION SAVE</span>
        <strong>{creation.saves.evasion}</strong>
      </div>
      <div class="summary-row">
        <span>MENTAL SAVE</span>
        <strong>{creation.saves.mental}</strong>
      </div>
      <div class="summary-row">
        <span>FOCI</span>
        <strong>{focusLabel()}</strong>
      </div>
      {#if creation.freeInterestSkill}
        <div class="summary-row">
          <span>FREE SKILL</span>
          <strong>{creation.freeInterestSkill.toUpperCase()}</strong>
        </div>
      {/if}
      {#if creation.adventurerPartials.length > 0}
        <div class="summary-row">
          <span>PARTIALS</span>
          <strong>{creation.adventurerPartials.map(partialLabel).join(' + ')}</strong>
        </div>
      {/if}
      <div class="goal-row">
        <span>GOAL</span>
        <p>{creation.goal}</p>
      </div>
    </div>
  </TerminalPanel>
{/if}

<style>
  .summary-grid {
    display: grid;
    gap: 0.5rem;
  }

  .summary-row,
  .goal-row {
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.55rem;
    font-family: var(--font-terminal);
    font-size: 0.78rem;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  span {
    color: var(--text-dim);
  }

  strong {
    color: var(--accent-amber);
    text-align: right;
  }

  p {
    margin: 0.35rem 0 0;
    color: var(--text-main);
    line-height: 1.35;
  }
</style>
