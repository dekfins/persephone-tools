<script lang="ts">
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let conModifier = $derived(characterCreatorState.attributeModifiers.con);
  let warriorHpBonus = $derived(characterCreatorState.hasWarriorTraining ? 2 : 0);
  let dieHardHpBonus = $derived(characterCreatorState.highestFocusLevels['Die Hard'] ? 2 : 0);

  function signed(value: number) {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  function valueClass(value: number) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }
</script>

<TerminalPanel title="HP + ATTACK + SAVES" extraClass="creator-panel">
  <div class="vitals-grid">
    <section class="vital-card hp-card">
      <span class="label">HP ROLL</span>
      <div class="hp-control">
        <strong>{characterCreatorState.draft.hpRoll}</strong>
        <button class="btn-action" onclick={() => characterCreatorState.rollHp()}>ROLL D6</button>
        <button class="btn-action" onclick={() => characterCreatorState.useMaxHpRoll()}>MAX HP</button>
      </div>
    </section>

    <section class="vital-card">
      <span class="label">MAX HP</span>
      <strong class="large-value">{characterCreatorState.maxHp}</strong>
    </section>

    <section class="vital-card">
      <span class="label">BASE ATTACK</span>
      <strong class="large-value">+{characterCreatorState.baseAttackBonus}</strong>
    </section>
  </div>

  <div class="formula-grid">
    <div class="formula-row">
      <span>D6 ROLL</span>
      <strong>{characterCreatorState.draft.hpRoll}</strong>
    </div>
    <div class="formula-row">
      <span>CON MOD</span>
      <strong class={valueClass(conModifier)}>{signed(conModifier)}</strong>
    </div>
    <div class="formula-row">
      <span>WARRIOR BONUS</span>
      <strong class={valueClass(warriorHpBonus)}>{signed(warriorHpBonus)}</strong>
    </div>
    <div class="formula-row">
      <span>DIE HARD</span>
      <strong class={valueClass(dieHardHpBonus)}>{signed(dieHardHpBonus)}</strong>
    </div>
  </div>

  <div class="save-grid">
    <section class="save-card">
      <span>PHYSICAL</span>
      <strong>{characterCreatorState.saves.physical}</strong>
      <em>STR / CON</em>
    </section>
    <section class="save-card">
      <span>EVASION</span>
      <strong>{characterCreatorState.saves.evasion}</strong>
      <em>INT / DEX</em>
    </section>
    <section class="save-card">
      <span>MENTAL</span>
      <strong>{characterCreatorState.saves.mental}</strong>
      <em>WIS / CHA</em>
    </section>
  </div>
</TerminalPanel>

<style>
  .vitals-grid,
  .formula-grid,
  .save-grid {
    display: grid;
    gap: 0.65rem;
  }

  .vitals-grid {
    grid-template-columns: 2fr 1fr 1fr;
  }

  .formula-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 0.85rem;
  }

  .save-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 0.85rem;
  }

  .vital-card,
  .formula-row,
  .save-card {
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .vital-card {
    display: grid;
    gap: 0.45rem;
    padding: 0.75rem;
  }

  .label,
  .formula-row span,
  .save-card span,
  .save-card em {
    color: var(--text-dim);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .hp-control {
    display: grid;
    grid-template-columns: 3.5rem 1fr 1fr;
    gap: 0.5rem;
    align-items: center;
  }

  .hp-control strong {
    display: grid;
    place-items: center;
    min-height: 2.5rem;
    border: var(--border-subtle);
    background: var(--bg-panel);
    color: var(--accent-amber);
  }

  .large-value {
    color: var(--accent-amber);
    font-size: 2rem;
    line-height: 1;
  }

  .formula-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.6rem;
  }

  .formula-row strong,
  .save-card strong {
    color: var(--accent-amber);
  }

  .formula-row strong.neutral {
    color: var(--text-main);
  }

  .formula-row strong.negative {
    color: var(--accent-red);
  }

  .formula-row strong.positive {
    color: var(--fighter-green);
  }

  .save-card {
    display: grid;
    gap: 0.35rem;
    padding: 0.75rem;
    text-align: center;
  }

  .save-card strong {
    font-size: 1.65rem;
    line-height: 1;
  }

  .save-card em {
    font-style: normal;
  }

  @media (max-width: 760px) {
    .vitals-grid,
    .formula-grid,
    .save-grid,
    .hp-control {
      grid-template-columns: 1fr;
    }
  }
</style>
