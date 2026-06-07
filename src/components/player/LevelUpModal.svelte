<script lang="ts">
  import foci from '../../data/character/foci.json';
  import {
    ALL_ATTRIBUTES,
    ALL_FOCI,
    ALL_SKILLS,
    getFocusSkillChoices
  } from '../../lib/characterConstants';
  import {
    canAdvanceSkill,
    formatModifier,
    getAttributeBoostRule,
    getAttributeModifier,
    getBaseAttackBonus,
    getHighestFocusLevels,
    getNextSkillRankCost,
    getSavingThrows,
    grantsFocusAtLevel,
    hasExpertTraining,
    hasWarriorTraining,
    isCombatSkill,
    normalizeAdvancementProgress
  } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import type {
    AttributeKey,
    Attributes,
    CharacterLevelUpFocusChoice,
    CharacterSkillPointSpend,
    FocusDefinitions,
    Foci,
    Skill
  } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  type Props = {
    onClose: () => void;
  };

  type Simulation = {
    skills: Partial<Record<Skill, number>>;
    investments: Partial<Record<Skill, number>>;
    attributes: Attributes;
    generalSkillPoints: number;
    nonCombatSkillPoints: number;
    attributeBoostCount: number;
  };

  type LevelUpStep = 'hp' | 'skills' | 'focus' | 'review';

  const LEVEL_UP_STEPS: Array<{ key: LevelUpStep; label: string }> = [
    { key: 'hp', label: 'HP' },
    { key: 'skills', label: 'SKILLS' },
    { key: 'focus', label: 'FOCUS' },
    { key: 'review', label: 'REVIEW' }
  ];

  const FOCI = foci as FocusDefinitions;

  let { onClose }: Props = $props();
  let char = $derived(dbState.activeCharacter);
  let targetLevel = $derived(char ? char.level + 1 : 1);
  let hpRolls = $state<number[]>([]);
  let skillSpends = $state<CharacterSkillPointSpend[]>([]);
  let attributeBoosts = $state<AttributeKey[]>([]);
  let selectedFocus = $state<CharacterLevelUpFocusChoice | null>(null);
  let selectedFocusBonusSkill = $state<Skill | null>(null);
  let expandedFocus = $state<Foci | null>(null);
  let isSubmitting = $state(false);
  let submitError = $state('');
  let activeStep = $state<LevelUpStep>('hp');

  let advancementProgress = $derived(char ? normalizeAdvancementProgress(char.advancement_progress) : normalizeAdvancementProgress(null));
  let needsFocus = $derived(grantsFocusAtLevel(targetLevel));
  let ownedFocusLevels = $derived(char ? getHighestFocusLevels(char.foci) : {});
  let conModifier = $derived(char ? getAttributeModifier(char.attributes.con) : 0);
  let dieAdjustedValues = $derived(hpRolls.map((roll) => Math.max(1, roll + conModifier)));
  let dieTotal = $derived(dieAdjustedValues.reduce((total, roll) => total + roll, 0));
  let warriorHpBonus = $derived(char && hasWarriorTraining(char.character_class) ? 2 * targetLevel : 0);
  let dieHardHpBonus = $derived(char && ownedFocusLevels['Die Hard'] ? 2 * targetLevel : 0);
  let hpRollTotal = $derived(dieTotal + warriorHpBonus + dieHardHpBonus);
  let nextMaxHp = $derived(char ? hpRollTotal > char.max_hp ? hpRollTotal : char.max_hp + 1 : 0);
  let hpGain = $derived(char ? Math.max(0, nextMaxHp - char.max_hp) : 0);
  let nextHp = $derived(char ? Math.min(nextMaxHp, char.hp + hpGain) : 0);
  let currentAttack = $derived(char ? getBaseAttackBonus(char.character_class, char.level) : 0);
  let nextAttack = $derived(char ? getBaseAttackBonus(char.character_class, targetLevel) : 0);
  let currentSaves = $derived(char ? getSavingThrows(char.attributes, char.level) : null);
  let simulation = $derived.by(simulateAdvancement);
  let nextSaves = $derived(char ? getSavingThrows(simulation.attributes, targetLevel) : null);
  let focusBonusOptions = $derived(getFocusBonusOptions());
  let requiredFocusBonusReady = $derived(isFocusBonusReady());
  let canConfirm = $derived(Boolean(
    char &&
    hpRolls.length === targetLevel &&
    (!needsFocus || selectedFocus) &&
    requiredFocusBonusReady &&
    !isSubmitting
  ));
  let activeStepIndex = $derived(LEVEL_UP_STEPS.findIndex((step) => step.key === activeStep));

  $effect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  });

  function cloneSkills() {
    return { ...(char?.skills ?? {}) };
  }

  function cloneInvestments() {
    return { ...(advancementProgress.skillInvestments ?? {}) };
  }

  function applySkillCredit(
    skills: Partial<Record<Skill, number>>,
    investments: Partial<Record<Skill, number>>,
    skill: Skill,
    points: number,
    bypassLevelRequirement = false
  ) {
    let remaining = points;
    let rank = skills[skill] ?? -1;
    let investment = Math.max(0, Math.floor(investments[skill] ?? 0));

    while (remaining > 0) {
      const cost = getNextSkillRankCost(rank);
      if (cost === null) return false;
      if (!bypassLevelRequirement && !canAdvanceSkill(rank, targetLevel)) return false;

      const needed = Math.max(0, cost - investment);
      const spent = Math.min(remaining, needed);
      investment += spent;
      remaining -= spent;

      if (investment >= cost) {
        rank += 1;
        skills[skill] = rank;
        investment = 0;
      }
    }

    if (investment > 0) {
      investments[skill] = investment;
    } else {
      delete investments[skill];
    }

    return true;
  }

  function getResolvedFocusBonusSkill() {
    if (!selectedFocus || selectedFocus.level !== 1) return undefined;
    const entry = FOCI[selectedFocus.focus]?.bonusSkill;
    if (!entry) return undefined;
    if (entry.type === 'skill' && (cloneSkills()[entry.value] ?? -1) < 4) return entry.value;
    return selectedFocusBonusSkill ?? undefined;
  }

  function simulateAdvancement(): Simulation {
    const skills = cloneSkills();
    const investments = cloneInvestments();
    const attributes = char ? { ...char.attributes } : { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    let generalSkillPoints = advancementProgress.generalSkillPoints + 3;
    let nonCombatSkillPoints = advancementProgress.nonCombatSkillPoints + (char && hasExpertTraining(char.character_class) ? 1 : 0);
    let attributeBoostCount = advancementProgress.attributeBoostCount;

    const focusBonusSkill = getResolvedFocusBonusSkill();
    if (focusBonusSkill) {
      applySkillCredit(skills, investments, focusBonusSkill, 3, true);
    }

    skillSpends.forEach((spend) => {
      if (spend.pool === 'noncombat') {
        nonCombatSkillPoints -= 1;
      } else {
        generalSkillPoints -= 1;
      }
      applySkillCredit(skills, investments, spend.skill, 1);
    });

    attributeBoosts.forEach((attribute) => {
      const rule = getAttributeBoostRule(attributeBoostCount);
      if (!rule) return;
      generalSkillPoints -= rule.cost;
      attributeBoostCount += 1;
      attributes[attribute] = Math.min(18, attributes[attribute] + 1);
    });

    return {
      skills,
      investments,
      attributes,
      generalSkillPoints,
      nonCombatSkillPoints,
      attributeBoostCount
    };
  }

  function rollHitPoints() {
    hpRolls = Array.from({ length: targetLevel }, () => Math.floor(Math.random() * 6) + 1);
  }

  function skillRank(skill: Skill) {
    return simulation.skills[skill] ?? -1;
  }

  function skillInvestment(skill: Skill) {
    return simulation.investments[skill] ?? 0;
  }

  function skillCostLabel(skill: Skill) {
    const cost = getNextSkillRankCost(skillRank(skill));
    if (cost === null) return 'MAX';
    return `${skillInvestment(skill)}/${cost} SP`;
  }

  function canSpendSkill(skill: Skill) {
    if (!canAdvanceSkill(skillRank(skill), targetLevel)) return false;
    if (isCombatSkill(skill)) return simulation.generalSkillPoints > 0;
    return simulation.nonCombatSkillPoints > 0 || simulation.generalSkillPoints > 0;
  }

  function spendSkill(skill: Skill) {
    if (!canSpendSkill(skill)) return;
    const pool = !isCombatSkill(skill) && simulation.nonCombatSkillPoints > 0 ? 'noncombat' : 'general';
    skillSpends = [...skillSpends, { skill, pool }];
  }

  function undoSkill(skill: Skill) {
    const index = [...skillSpends].reverse().findIndex((spend) => spend.skill === skill);
    if (index < 0) return;
    const actualIndex = skillSpends.length - 1 - index;
    skillSpends = skillSpends.filter((_, spendIndex) => spendIndex !== actualIndex);
  }

  function canBoostAttribute(attribute: AttributeKey) {
    const rule = getAttributeBoostRule(simulation.attributeBoostCount);
    return Boolean(
      rule &&
      targetLevel >= rule.minLevel &&
      simulation.generalSkillPoints >= rule.cost &&
      simulation.attributes[attribute] < 18
    );
  }

  function boostAttribute(attribute: AttributeKey) {
    if (!canBoostAttribute(attribute)) return;
    attributeBoosts = [...attributeBoosts, attribute];
  }

  function undoAttributeBoost(attribute: AttributeKey) {
    const index = [...attributeBoosts].reverse().findIndex((entry) => entry === attribute);
    if (index < 0) return;
    const actualIndex = attributeBoosts.length - 1 - index;
    attributeBoosts = attributeBoosts.filter((_, boostIndex) => boostIndex !== actualIndex);
  }

  function selectFocus(focus: Foci, level: 1 | 2) {
    selectedFocus = { focus, level };
    selectedFocusBonusSkill = null;
    expandedFocus = focus;
  }

  function focusModeLabel(focus: Foci) {
    const ownedLevel = ownedFocusLevels[focus] ?? 0;
    return ownedLevel === 1 ? 'UPGRADE TO LEVEL 2' : 'NEW LVL 1';
  }

  function focusOptionLevel(focus: Foci): 1 | 2 | null {
    const ownedLevel = ownedFocusLevels[focus] ?? 0;
    if (ownedLevel === 0) return 1;
    if (ownedLevel === 1) return 2;
    return null;
  }

  function getFocusBonusOptions() {
    if (!selectedFocus || selectedFocus.level !== 1) return [];
    const entry = FOCI[selectedFocus.focus]?.bonusSkill;
    if (!entry) return [];
    const skills = cloneSkills();

    if (entry.type === 'skill') {
      if ((skills[entry.value] ?? -1) < 4) return [];
      return ALL_SKILLS.filter((skill) => skill !== entry.value && (skills[skill] ?? -1) < 4);
    }

    const choices = getFocusSkillChoices(entry.value).filter((skill) => (skills[skill] ?? -1) < 4);
    return choices.length > 0 ? choices : ALL_SKILLS.filter((skill) => (skills[skill] ?? -1) < 4);
  }

  function isFocusBonusReady() {
    if (!selectedFocus || selectedFocus.level !== 1) return true;
    const entry = FOCI[selectedFocus.focus]?.bonusSkill;
    if (!entry) return true;
    if (entry.type === 'skill' && (cloneSkills()[entry.value] ?? -1) < 4) return true;
    return Boolean(selectedFocusBonusSkill);
  }

  function focusBonusLabel() {
    if (!selectedFocus || selectedFocus.level !== 1) return 'NONE';
    const entry = FOCI[selectedFocus.focus]?.bonusSkill;
    if (!entry) return 'NONE';
    if (entry.type === 'skill' && (cloneSkills()[entry.value] ?? -1) < 4) return `${entry.value.toUpperCase()} +3 SP`;
    return selectedFocusBonusSkill ? `${selectedFocusBonusSkill.toUpperCase()} +3 SP` : 'SELECT BONUS SKILL';
  }

  function formatAttack(value: number) {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  function isStepComplete(step: LevelUpStep) {
    if (step === 'hp') return hpRolls.length === targetLevel;
    if (step === 'skills') return true;
    if (step === 'focus') return !needsFocus || Boolean(selectedFocus && requiredFocusBonusReady);
    return canConfirm;
  }

  function setActiveStep(step: LevelUpStep) {
    activeStep = step;
  }

  function previousStep() {
    if (activeStepIndex <= 0) return;
    activeStep = LEVEL_UP_STEPS[activeStepIndex - 1].key;
  }

  function nextStep() {
    if (activeStepIndex >= LEVEL_UP_STEPS.length - 1) return;
    activeStep = LEVEL_UP_STEPS[activeStepIndex + 1].key;
  }

  function focusChoicePayload() {
    if (!selectedFocus) return undefined;
    const bonusSkill = getResolvedFocusBonusSkill();
    return {
      ...selectedFocus,
      bonusSkill
    };
  }

  async function confirmLevelUp() {
    if (!char || !canConfirm) return;
    isSubmitting = true;
    submitError = '';

    const success = await dbState.levelUpCharacter(char.id, {
      targetLevel,
      hpRolls,
      skillSpends,
      attributeBoosts,
      focusChoice: focusChoicePayload()
    });

    isSubmitting = false;
    if (success) {
      onClose();
      return;
    }

    submitError = 'LEVEL-UP VALIDATION FAILED';
  }
</script>

<div class="level-modal-backdrop">
  <div class="level-modal" role="dialog" aria-modal="true" aria-label="Level up">
    <div class="modal-header">
      <div>
        <span>ADVANCEMENT</span>
        <h2>{char ? `${char.name.toUpperCase()} LEVEL ${char.level} -> ${targetLevel}` : 'LEVEL UP'}</h2>
      </div>
      <button class="btn-action" type="button" onclick={onClose}>CLOSE</button>
    </div>

    {#if char}
      <div class="step-strip">
        {#each LEVEL_UP_STEPS as step, index}
          <button
            class="step-button"
            class:active={step.key === activeStep}
            class:complete={isStepComplete(step.key)}
            type="button"
            onclick={() => setActiveStep(step.key)}
          >
            <span>{index + 1}</span>
            {step.label}
          </button>
        {/each}
      </div>

      <div class="level-stage">
        {#if activeStep === 'hp'}
          <TerminalPanel title="ROLL HIT POINTS" extraClass="level-up-panel">
            <div class="panel-toolbar">
              <span>HP ADVANCEMENT</span>
              <button class="btn-action" type="button" onclick={rollHitPoints}>ROLL HP</button>
            </div>

            <p>
              Roll {targetLevel}d6 for all {targetLevel} levels, plus per-level modifiers.
              <br>If the total beats your current {char.max_hp} HP, use the new total.
              <br>Otherwise, HP goes up by 1.
            </p>

            <div class="result-box">
              <span>HP</span>
              <strong>{hpRolls.length === targetLevel ? `${char.max_hp} -> ${nextMaxHp}` : `${char.max_hp} -> ?`}</strong>
            </div>

            {#if hpRolls.length === targetLevel}
              <div class="detail-stack">
                <div>Dice: {hpRolls.join(' + ')} = {hpRolls.reduce((total, roll) => total + roll, 0)}</div>
                <div>Per-level bonus: {formatModifier(conModifier)} CON + {hasWarriorTraining(char.character_class) ? '2 Warrior' : '0 Warrior'} x {targetLevel} levels{dieHardHpBonus ? ` + 2 Die Hard x ${targetLevel} levels` : ''}</div>
                <div>Total rolled: {hpRollTotal} vs current max: {char.max_hp} -> {hpRollTotal > char.max_hp ? `Higher. New max HP = ${nextMaxHp}` : `Lower. New max HP = ${nextMaxHp}`}</div>
                <div>Current HP: {char.hp} -> {nextHp}</div>
                <div>Attack: {formatAttack(currentAttack)} -> {formatAttack(nextAttack)}</div>
                {#if currentSaves && nextSaves}
                  <div>Saves: P {currentSaves.physical}+ -> {nextSaves.physical}+, E {currentSaves.evasion}+ -> {nextSaves.evasion}+, M {currentSaves.mental}+ -> {nextSaves.mental}+</div>
                {/if}
              </div>
            {:else}
              <div class="dim-message">HP ROLL REQUIRED</div>
            {/if}
          </TerminalPanel>
        {:else if activeStep === 'skills'}
          <TerminalPanel title="SPEND SKILL POINTS" extraClass="level-up-panel">
            <div class="panel-toolbar">
              <span>AVAILABLE POINTS</span>
              <strong>{simulation.generalSkillPoints} SP</strong>
            </div>
            {#if hasExpertTraining(char.character_class)}
              <div class="pool-note">+{simulation.nonCombatSkillPoints} NON-COMBAT SP</div>
            {/if}
            <p>
              Max skill rank at level {targetLevel}: {targetLevel >= 9 ? 4 : targetLevel >= 6 ? 3 : targetLevel >= 3 ? 2 : 1}.
              <br>Skill points are invested 1 at a time; partial investments carry forward.
            </p>

            <ul class="item-list skill-list">
              {#each ALL_SKILLS as skill}
                <li class="item-row">
                  <div class="item-row-main no-toggle">
                    <div class="item-details">
                      <div class="item-heading">
                        <span class="item-name" class:combat-skill={isCombatSkill(skill)}>{skill}</span>
                        <span class="type-label">RANK {skillRank(skill)}</span>
                      </div>
                      <span class="item-meta">{skillCostLabel(skill)}</span>
                    </div>
                    <div class="row-actions">
                      <div class="item-actions">
                        <button class="btn-action btn-compact" type="button" disabled={!canSpendSkill(skill)} onclick={() => spendSkill(skill)}>SPEND</button>
                        <button class="btn-action-red btn-compact" type="button" disabled={!skillSpends.some((spend) => spend.skill === skill)} onclick={() => undoSkill(skill)}>UNDO</button>
                      </div>
                    </div>
                  </div>
                </li>
              {/each}
            </ul>

            <div class="panel-toolbar compact">
              <h3>ATTRIBUTE BOOSTS</h3>
              <span>{simulation.attributeBoostCount}/5</span>
            </div>
            <div class="attribute-grid">
              {#each ALL_ATTRIBUTES as attribute}
                <div class="attribute-cell">
                  <span>{attribute.toUpperCase()}</span>
                  <strong>{char.attributes[attribute]} -> {simulation.attributes[attribute]}</strong>
                  <div class="attribute-actions">
                    <button class="btn-action btn-compact" type="button" disabled={!canBoostAttribute(attribute)} onclick={() => boostAttribute(attribute)}>BOOST</button>
                    <button class="btn-action-red btn-compact" type="button" disabled={!attributeBoosts.includes(attribute)} onclick={() => undoAttributeBoost(attribute)}>UNDO</button>
                  </div>
                </div>
              {/each}
            </div>
          </TerminalPanel>
        {:else if activeStep === 'focus'}
          <TerminalPanel title="CHOOSE FOCUS" extraClass="level-up-panel">
            <div class="panel-toolbar">
              <span>FOCUS ADVANCEMENT</span>
              <strong>{needsFocus ? 'REQUIRED' : 'NONE'}</strong>
            </div>

            {#if needsFocus}
              <div class="focus-list">
                {#each ALL_FOCI as focus}
                  {@const optionLevel = focusOptionLevel(focus)}
                  {#if optionLevel}
                    {@const expanded = expandedFocus === focus}
                    <div class="focus-row" class:expanded>
                      <button class="focus-toggle" type="button" aria-expanded={expanded} onclick={() => selectFocus(focus, optionLevel)}>
                        <span>{focus.toUpperCase()}</span>
                        <span class={FOCI[focus].category === 'combat' ? 'combat-skill' : ''}>{FOCI[focus].category.toUpperCase()}</span>
                        <strong>{focusModeLabel(focus)}</strong>
                      </button>
                      {#if expanded}
                        <div class="focus-detail">
                          <p>{FOCI[focus].description}</p>
                          <div class="level-row owned">
                            <span>LEVEL 1</span>
                            <p>{FOCI[focus].level1}</p>
                          </div>
                          <div class="level-row" class:owned={optionLevel === 2}>
                            <span>LEVEL 2</span>
                            <p>{FOCI[focus].level2}</p>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>

              <div class="result-box">
                <span>FOCUS BONUS</span>
                <strong>{focusBonusLabel()}</strong>
              </div>

              {#if focusBonusOptions.length > 0}
                <div class="bonus-grid">
                  {#each focusBonusOptions as skill}
                    <button
                      class="condition-option"
                      class:selected={selectedFocusBonusSkill === skill}
                      type="button"
                      onclick={() => selectedFocusBonusSkill = skill}
                    >
                      <span class="condition-option-heading">
                        <span class="item-name" class:combat-skill={isCombatSkill(skill)}>{skill}</span>
                        <span class="type-label">+3 SP CREDIT</span>
                      </span>
                    </button>
                  {/each}
                </div>
              {/if}
            {:else}
              <div class="dim-message">NO FOCUS GAINED THIS LEVEL</div>
            {/if}
          </TerminalPanel>
        {:else}
          <TerminalPanel title="REVIEW ADVANCEMENT" extraClass="level-up-panel">
            <div class="review-grid">
              <div>
                <span>LEVEL</span>
                <strong>{char.level} -> {targetLevel}</strong>
              </div>
              <div>
                <span>HP</span>
                <strong>{char.hp}/{char.max_hp} -> {nextHp}/{nextMaxHp}</strong>
              </div>
              <div>
                <span>SKILL POINTS</span>
                <strong>{simulation.generalSkillPoints}SP / {simulation.nonCombatSkillPoints} NON-COMBAT</strong>
              </div>
              <div>
                <span>FOCUS</span>
                <strong>{selectedFocus ? `${selectedFocus.focus.toUpperCase()} LVL ${selectedFocus.level}` : needsFocus ? 'REQUIRED' : 'NONE'}</strong>
              </div>
            </div>
            {#if !canConfirm}
              <div class="terminal-alert">COMPLETE REQUIRED ADVANCEMENT STEPS BEFORE CONFIRMING</div>
            {/if}
          </TerminalPanel>
        {/if}
      </div>

      {#if submitError}
        <div class="terminal-alert">{submitError}</div>
      {/if}

      <div class="modal-actions">
        <button class="btn-action" type="button" onclick={onClose}>CANCEL</button>
        <button class="btn-action" type="button" disabled={activeStepIndex === 0} onclick={previousStep}>PREV</button>
        {#if activeStep === 'review'}
          <button class="btn-action btn-amber" type="button" disabled={!canConfirm} onclick={confirmLevelUp}>
            {isSubmitting ? 'COMMITTING...' : 'CONFIRM LEVEL'}
          </button>
        {:else}
          <button class="btn-action btn-amber" type="button" onclick={nextStep}>NEXT</button>
        {/if}
      </div>
    {:else}
      <div class="terminal-alert">AWAITING CREW DATA...</div>
    {/if}
  </div>
</div>

<style>
  .level-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 1.25rem;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .level-modal {
    display: grid;
    gap: 1rem;
    width: min(860px, calc(100vw - 2rem));
    max-height: calc(100vh - 2rem);
    overflow: auto;
    background: var(--bg-dark);
    border: 1px solid var(--accent-amber);
    padding: 1.2rem;
    font-family: var(--font-terminal);
  }

  .modal-header,
  .modal-actions,
  .panel-toolbar,
  .item-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .modal-header,
  .panel-toolbar,
  .modal-actions {
    justify-content: space-between;
  }

  .modal-header span,
  .panel-toolbar span,
  .pool-note,
  .type-label,
  .item-meta,
  .result-box span,
  .detail-stack,
  .focus-toggle span,
  .level-row span {
    color: var(--text-dim);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  p {
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .step-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .step-button {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.45rem;
    align-items: center;
    background: var(--bg-void);
    color: var(--text-dim);
    border: var(--border-subtle);
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: 0.72rem;
    padding: 0.65rem;
    text-align: left;
  }

  .step-button span {
    display: grid;
    place-items: center;
    width: 1.35rem;
    height: 1.35rem;
    border: var(--border-subtle);
    color: var(--text-main);
  }

  .step-button.active {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .step-button.complete span {
    color: var(--fighter-green);
    border-color: rgba(74, 222, 128, 0.45);
  }

  .level-stage {
    min-height: 30rem;
  }

  :global(.level-up-panel) {
    min-width: 0;
  }

  .result-box,
  .detail-stack,
  .focus-detail,
  .level-row {
    display: grid;
    gap: 0.35rem;
    border: var(--border-subtle);
    padding: 0.65rem;
  }

  .result-box strong,
  .panel-toolbar strong,
  .focus-toggle strong {
    color: var(--accent-amber);
  }

  .skill-list,
  .focus-list,
  .bonus-grid {
    display: grid;
    gap: 0.45rem;
    max-height: 18rem;
    overflow: auto;
  }

  .skill-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 0;
    margin: 0;
  }

  .skill-list .item-row-main.no-toggle {
    grid-template-columns: 1fr;
  }

  .skill-list .item-heading {
    gap: 0.35rem;
  }

  .skill-list .row-actions {
    min-width: 0;
  }

  .skill-list .item-actions {
    display: grid;
    grid-template-columns: repeat(2, 3.5rem);
    gap: 0.45rem;
    justify-content: end;
  }

  .skill-list .btn-compact {
    width: 3.5rem;
    min-width: 3.5rem;
  }

  .item-name {
    color: var(--text-main);
    font-weight: bold;
  }

  .combat-skill {
    color: var(--capital-red) !important;
  }

  .btn-action:disabled,
  .btn-action-red:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .level-modal .btn-compact {
    display: inline-grid;
    place-items: center;
    width: 3.5rem;
    min-width: 3.5rem;
    height: 2.5rem;
    padding: 0;
    line-height: 1;
  }

  .panel-toolbar.compact h3 {
    font-size: 0.8rem;
  }

  .attribute-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .attribute-cell {
    display: grid;
    gap: 0.45rem;
    min-width: 0;
    min-height: 7.25rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.55rem;
    text-align: center;
  }

  .attribute-cell span {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  .attribute-cell strong {
    color: var(--text-main);
    font-size: 0.95rem;
    white-space: nowrap;
  }

  .attribute-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem;
    justify-content: center;
  }

  .attribute-actions .btn-compact {
    width: 100%;
    min-width: 0;
  }

  .focus-row {
    display: grid;
    background: var(--bg-panel);
    border: var(--border-subtle);
  }

  .focus-row.expanded {
    border-color: var(--accent-amber);
  }

  .focus-toggle {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 0.65rem;
    align-items: center;
    background: transparent;
    border: 0;
    color: var(--text-main);
    cursor: pointer;
    font-family: var(--font-terminal);
    padding: 0.6rem;
    text-align: left;
  }

  .focus-detail {
    border-width: 1px 0 0;
  }

  .level-row {
    opacity: 0.55;
  }

  .level-row.owned {
    opacity: 1;
  }

  .condition-option {
    display: grid;
    gap: 0.25rem;
    width: 100%;
    background: var(--bg-panel);
    border: var(--border-subtle);
    color: var(--text-main);
    cursor: pointer;
    font-family: var(--font-terminal);
    padding: 0.65rem;
    text-align: left;
    text-transform: none;
  }

  .condition-option.selected,
  .condition-option:hover {
    border-color: var(--accent-amber);
  }

  .condition-option-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    align-items: baseline;
  }

  .review-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .review-grid > div {
    display: grid;
    gap: 0.25rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
  }

  .review-grid span {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  .review-grid strong {
    color: var(--accent-amber);
    overflow-wrap: anywhere;
  }

  .modal-actions {
    justify-content: flex-end;
  }

  @media (max-width: 1100px) {
    .attribute-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .skill-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .skill-list,
    .focus-list,
    .bonus-grid {
      max-height: none;
    }
  }

  @media (max-width: 700px) {
    .step-strip,
    .review-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .modal-header,
    .modal-actions,
    .panel-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .focus-toggle {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 520px) {
    .skill-list,
    .attribute-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
