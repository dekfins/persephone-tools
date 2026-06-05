<script lang="ts">
  import { ALL_ATTRIBUTES, ALL_SKILLS, SKILL_DEFINITIONS } from '../../lib/characterConstants';
  import { formatModifier, getAttributeModifier } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { AttributeKey, Skill } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type AttributeOption = {
    label: string;
    value: AttributeKey;
  };

  type SkillRollResult = {
    total: number;
    dieOne: number;
    dieTwo: number;
    skillLevel: number;
    attribute: AttributeKey;
    attributeModifier: number;
  };

  const attributeOptions: AttributeOption[] = ALL_ATTRIBUTES.map((attribute) => ({
    label: attribute.toUpperCase(),
    value: attribute
  }));

  let char = $derived(dbState.activeCharacter);
  let expandedSkill = $state<Skill | null>(null);
  let attributeOverrides = $state<Partial<Record<Skill, AttributeKey>>>({});
  let rollResults = $state<Partial<Record<Skill, SkillRollResult>>>({});

  function skillLevel(skill: Skill) {
    return char?.skills?.[skill] ?? -1;
  }

  function skillDefinition(skill: Skill) {
    return SKILL_DEFINITIONS[skill];
  }

  function selectedAttribute(skill: Skill) {
    return attributeOverrides[skill] ?? skillDefinition(skill).defaultAttribute;
  }

  function selectedAttributeOption(skill: Skill) {
    const attribute = selectedAttribute(skill);
    return attributeOptions.find((option) => option.value === attribute) ?? attributeOptions[0];
  }

  function setSkillAttribute(skill: Skill, option: AttributeOption) {
    attributeOverrides = {
      ...attributeOverrides,
      [skill]: option.value
    };
  }

  function attributeModifier(attribute: AttributeKey) {
    if (!char) return 0;
    return getAttributeModifier(char.attributes[attribute]);
  }

  function rollSkill(skill: Skill) {
    if (!char) return;

    const attribute = selectedAttribute(skill);
    const dieOne = Math.floor(Math.random() * 6) + 1;
    const dieTwo = Math.floor(Math.random() * 6) + 1;
    const currentSkillLevel = skillLevel(skill);
    const currentAttributeModifier = attributeModifier(attribute);

    rollResults = {
      ...rollResults,
      [skill]: {
        total: dieOne + dieTwo + currentSkillLevel + currentAttributeModifier,
        dieOne,
        dieTwo,
        skillLevel: currentSkillLevel,
        attribute,
        attributeModifier: currentAttributeModifier
      }
    };
  }

  function rollSummary(result: SkillRollResult) {
    const skillPart = `${formatRollTerm(result.skillLevel)} skill`;
    const attributePart = `${formatRollTerm(result.attributeModifier)} ${result.attribute.toUpperCase()}`;
    return `${result.total} [${result.dieOne}+${result.dieTwo}] ${skillPart} ${attributePart}`;
  }

  function formatRollTerm(value: number) {
    return value >= 0 ? `+ ${value}` : `- ${Math.abs(value)}`;
  }
</script>

<TerminalPanel title="SKILLS" extraClass="player-panel">
  {#if char}
    <div class="skill-list">
      {#each ALL_SKILLS as skill}
        {@const expanded = expandedSkill === skill}
        <div class="skill-row" class:expanded>
          <button
            class="skill-toggle"
            type="button"
            aria-expanded={expanded}
            onclick={() => expandedSkill = expanded ? null : skill}
          >
            <span>{skill.toUpperCase()}</span>
            <strong>{skillLevel(skill)}</strong>
          </button>
        </div>
      {/each}
    </div>

    {#if expandedSkill}
      {@const skill = expandedSkill}
      {@const definition = skillDefinition(skill)}
      {@const attribute = selectedAttribute(skill)}
      {@const result = rollResults[skill]}
      <div class="skill-detail">
        <p>{definition.description}</p>
        <div class="roll-controls">
          <div class="attribute-control">
            <span>SUGGESTED ATTRIBUTE</span>
            <TerminalSelect
              options={attributeOptions}
              value={selectedAttributeOption(skill)}
              id={`skill-attribute-${skill}`}
              showPopup={false}
              onSelect={(option: AttributeOption) => setSkillAttribute(skill, option)}
            />
          </div>
          <button class="btn-action" onclick={() => rollSkill(skill)}>
            ROLL 2D6
          </button>
        </div>

        <div class="formula-line">
          2D6 + {skillLevel(skill)} SKILL + {formatModifier(attributeModifier(attribute))} {attribute.toUpperCase()}
        </div>

        {#if result}
          <div class="roll-result">{rollSummary(result)}</div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .skill-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .skill-row {
    display: grid;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .skill-row.expanded {
    border-color: var(--accent-amber);
  }

  .skill-toggle {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    background: transparent;
    border: 0;
    color: var(--text-main);
    padding: 0.55rem;
    font-family: var(--font-terminal);
    text-align: left;
    cursor: pointer;
  }

  .skill-toggle span {
    color: var(--text-main);
    font-size: 0.82rem;
  }

  .skill-toggle strong {
    color: var(--accent-amber);
    padding: 0 0.1rem;
    text-align: center;
  }

  .skill-detail {
    display: grid;
    gap: 0.6rem;
    margin-top: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
    font-family: var(--font-terminal);
  }

  p {
    margin: 0;
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .roll-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: end;
  }

  .attribute-control {
    display: grid;
    gap: 0.3rem;
  }

  .attribute-control span,
  .formula-line {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  .formula-line,
  .roll-result {
    border: var(--border-subtle);
    padding: 0.45rem;
  }

  .roll-result {
    color: var(--accent-amber);
    font-size: 0.9rem;
  }

  @media (max-width: 700px) {
    .skill-list {
      grid-template-columns: 1fr;
    }

    .roll-controls {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 701px) and (max-width: 1050px) {
    .skill-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
