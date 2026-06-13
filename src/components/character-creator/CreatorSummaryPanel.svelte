<script lang="ts">
  import { ALL_ATTRIBUTES, ALL_SKILLS, formatFocusPicks } from '../../lib/character/characterConstants';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { AttributeKey, Skill } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let trainedSkills = $derived(
    ALL_SKILLS.filter((skill) => (characterCreatorState.draft.skills[skill] ?? -1) >= 0)
  );

  function modLabel(attribute: AttributeKey) {
    const modifier = characterCreatorState.attributeModifiers[attribute];
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }

  function skillLabel(skill: Skill) {
    return `${skill} ${characterCreatorState.draft.skills[skill]}`;
  }

  function classLabel() {
    if (characterCreatorState.draft.characterClass !== 'adventurer') {
      return characterCreatorState.draft.characterClass.toUpperCase();
    }

    return 'ADVENTURER: PARTIAL EXPERT + WARRIOR';
  }

  function focusLabel() {
    return formatFocusPicks(characterCreatorState.draft.focusPicks, 'OPEN');
  }
</script>

<TerminalPanel title="CHARACTER SUMMARY" extraClass="creator-summary-panel">
  <div class="summary-section">
    <div class="identity-block">
      <strong>{characterCreatorState.draft.name || 'UNNAMED DRIFTER'}</strong>
      <span>{characterCreatorState.draft.heritage.toUpperCase()}</span>
    </div>

    <div class="summary-row">
      <span>BACKGROUND</span>
      <strong>{characterCreatorState.draft.background.toUpperCase()}</strong>
    </div>
    <div class="summary-row">
      <span>CLASS</span>
      <strong>{classLabel()}</strong>
    </div>
    <div class="summary-row">
      <span>FOCI</span>
      <strong>{focusLabel()}</strong>
    </div>
  </div>

  <div class="summary-section">
    <h4>ATTRIBUTES</h4>
    <div class="attribute-grid">
      {#each ALL_ATTRIBUTES as attribute}
        <div class="attribute-chip">
          <span>{attribute.toUpperCase()}</span>
          <strong>{characterCreatorState.draft.attributes[attribute]}</strong>
          <em>{modLabel(attribute)}</em>
        </div>
      {/each}
    </div>
  </div>

  <div class="summary-section">
    <h4>VITALS</h4>
    <div class="stat-grid">
      <div>
        <span>HP</span>
        <strong>{characterCreatorState.maxHp}</strong>
      </div>
      <div>
        <span>ATK BONUS</span>
        <strong>+{characterCreatorState.baseAttackBonus}</strong>
      </div>
      <div>
        <span>AC</span>
        <strong>{characterCreatorState.armorClass}</strong>
      </div>
    </div>
  </div>

  <div class="summary-section">
    <h4>SAVES</h4>
    <div class="stat-grid">
      <div>
        <span>PHY</span>
        <strong>{characterCreatorState.saves.physical}+</strong>
      </div>
      <div>
        <span>EVA</span>
        <strong>{characterCreatorState.saves.evasion}+</strong>
      </div>
      <div>
        <span>MEN</span>
        <strong>{characterCreatorState.saves.mental}+</strong>
      </div>
    </div>
  </div>
  <div class="summary-section">
    <h4>SKILLS</h4>
    {#if trainedSkills.length > 0}
      <div class="skill-list">
        {#each trainedSkills as skill}
          <span>{skillLabel(skill)}</span>
        {/each}
      </div>
    {:else}
      <div class="empty-line">NO SKILLS RECORDED</div>
    {/if}
  </div>
</TerminalPanel>

<style>
  .summary-section {
    display: grid;
    gap: 0.35rem;
    margin-bottom: 0.6rem;
  }

  .summary-section:last-child {
    margin-bottom: 0;
  }

  .identity-block,
  .summary-row,
  .attribute-chip,
  .stat-grid div,
  .empty-line {
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .identity-block {
    display: grid;
    gap: 0.25rem;
    padding: 0.65rem;
  }

  .identity-block strong,
  .summary-row strong,
  .attribute-chip strong,
  .stat-grid strong {
    color: var(--accent-amber);
  }

  .identity-block span,
  .summary-row span,
  .attribute-chip span,
  .stat-grid span,
  h4 {
    color: var(--text-dim);
  }

  h4 {
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    margin: 0;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem;
    font-size: 0.76rem;
  }

  .summary-row strong {
    text-align: right;
  }

  .attribute-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .attribute-chip {
    display: grid;
    grid-template-columns: 2rem 1fr 2rem;
    gap: 0.35rem;
    align-items: center;
    padding: 0.45rem;
    font-size: 0.72rem;
  }

  .attribute-chip strong,
  .attribute-chip em {
    text-align: right;
    font-style: normal;
  }

  .attribute-chip em {
    color: var(--text-main);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .stat-grid div {
    display: grid;
    gap: 0.25rem;
    padding: 0.5rem;
    text-align: center;
    font-size: 0.72rem;
  }

  .skill-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .skill-list span {
    display: inline-grid;
    min-height: 1.9rem;
    place-items: center;
    border: var(--border-subtle);
    background: var(--bg-void);
    color: var(--text-main);
    font-family: var(--font-terminal);
    font-size: 0.72rem;
    line-height: 1;
    padding: 0 0.45rem;
    text-transform: uppercase;
  }

  .empty-line {
    color: var(--text-dim);
    font-size: 0.72rem;
    padding: 0.5rem;
    text-align: center;
  }
</style>
