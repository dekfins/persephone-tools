<script lang="ts">
  import { ALL_ATTRIBUTES } from '../../lib/characterConstants';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { AttributeKey } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type ArrayOption = {
    label: string;
    value: number;
  };

  let selectedSwapAttribute = $state<AttributeKey | null>(null);

  function modLabel(value: number) {
    return value >= 0 ? `+${value}` : `${value}`;
  }

  function modClass(value: number) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  function updateAttribute(attribute: AttributeKey, event: Event) {
    characterCreatorState.setAttribute(attribute, Number((event.target as HTMLInputElement).value));
  }

  function valueLength(value: string | number) {
    return `${value}`.length;
  }

  function valueWidthFactor(value: string | number) {
    return 1.55 / Math.max(valueLength(value), 1);
  }

  function handleAttributeCardClick(attribute: AttributeKey) {
    if (selectedSwapAttribute === attribute) {
      selectedSwapAttribute = null;
      return;
    }

    if (!selectedSwapAttribute) {
      selectedSwapAttribute = attribute;
      return;
    }

    characterCreatorState.swapAttributes(selectedSwapAttribute, attribute);
    selectedSwapAttribute = null;
  }

  function handleSetTo14(attribute: AttributeKey) {
    characterCreatorState.setAttributeTo14(attribute);
    selectedSwapAttribute = null;
  }

  function getArrayOptions(attribute: AttributeKey): ArrayOption[] {
    const currentValue = characterCreatorState.arrayAssignments[attribute];
    const values = currentValue === undefined
      ? characterCreatorState.availableArrayValues
      : [currentValue, ...characterCreatorState.availableArrayValues];

    return values
      .filter((value, index, allValues) => allValues.indexOf(value) === index)
      .sort((left, right) => right - left)
      .map((value) => ({ label: String(value), value }));
  }

  function getArraySelection(attribute: AttributeKey) {
    const currentValue = characterCreatorState.arrayAssignments[attribute];
    if (currentValue === undefined) return null;
    return { label: String(currentValue), value: currentValue };
  }
</script>

<TerminalPanel title="ATTRIBUTES + AC" extraClass="creator-panel">
  <div class="action-row">
    <button class="btn-action" onclick={() => characterCreatorState.useStandardArray()}>STANDARD ARRAY</button>
    <button class="btn-action" onclick={() => characterCreatorState.rollAttributes()}>ROLL 3D6</button>
  </div>

  <div class="attr-grid">
    {#each ALL_ATTRIBUTES as attribute}
      <div
        class="attr-card"
        class:selected-swap={selectedSwapAttribute === attribute}
        role="button"
        tabindex="0"
        onclick={() => handleAttributeCardClick(attribute)}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleAttributeCardClick(attribute);
          }
        }}
      >
        <label for="creator-attr-{attribute}">{attribute}</label>
        <div
          class="attr-control"
          role="presentation"
          style:--value-width-factor={valueWidthFactor(characterCreatorState.draft.attributes[attribute])}
          onclick={(event) => event.stopPropagation()}
          onkeydown={(event) => event.stopPropagation()}
        >
          {#if characterCreatorState.isArrayAssignmentMode}
            <TerminalSelect
              id="creator-array-{attribute}"
              options={getArrayOptions(attribute)}
              value={getArraySelection(attribute)}
              placeholder="ASSIGN"
              onSelect={(option: ArrayOption) => characterCreatorState.assignArrayValue(attribute, option.value)}
              showPopup={false}
            />
          {:else}
            <input
              id="creator-attr-{attribute}"
              type="number"
              min="3"
              max="18"
              class="terminal-input attr-input"
              value={characterCreatorState.draft.attributes[attribute]}
              onchange={(event) => updateAttribute(attribute, event)}
            />
          {/if}
        </div>
        <span class="mod {modClass(characterCreatorState.attributeModifiers[attribute])}">
          {modLabel(characterCreatorState.attributeModifiers[attribute])}
        </span>
        <button
          class="btn-action set-14"
          class:active-set={characterCreatorState.activeAttributeSetTo14 === attribute}
          type="button"
          onclick={(event) => {
            event.stopPropagation();
            handleSetTo14(attribute);
          }}
        >
          SET TO 14
        </button>
      </div>
    {/each}
  </div>
</TerminalPanel>

<style>
  .action-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .attr-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.85rem;
  }

  .attr-card,
  .derived-card {
    display: grid;
    gap: 0.35rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
  }

  .attr-card {
    grid-template-columns: 2.5rem minmax(3rem, 4.75rem) 2.5rem minmax(4.5rem, 1fr);
    align-items: center;
    cursor: pointer;
    transition:
      border-color 120ms ease,
      background-color 120ms ease;
  }

  .attr-card.selected-swap {
    border-color: var(--accent-amber);
    background: var(--bg-panel);
  }

  label,
  .label {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .attr-control {
    min-width: 0;
    container-type: inline-size;
  }

  .attr-input {
    width: 100%;
    min-width: 0;
    padding-inline: 0.25rem;
    color: var(--accent-amber);
    font-family: var(--font-terminal);
    font-size: clamp(0.7rem, calc(100cqw * var(--value-width-factor)), 1.25rem);
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }

  .value {
    color: var(--accent-amber);
    font-family: var(--font-terminal);
    text-align: right;
  }

  .mod {
    font-family: var(--font-terminal);
    font-size: 1rem;
    text-align: right;
  }

  .set-14 {
    justify-self: end;
    width: 4.5rem;
    min-width: 0;
    padding: 0.5rem 0rem;
    font-size: 0.68rem;    
    white-space: nowrap;
  }

  .set-14.active-set {
    background: var(--ui-cyan);
    color: var(--bg-void);
  }

  .mod.neutral {
    color: var(--text-main);
  }

  .mod.negative {
    color: var(--accent-red);
  }

  .mod.positive {
    color: var(--fighter-green);
  }

  .derived-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-top: 0.85rem;
  }

  @media (max-width: 720px) {
    .attr-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 420px) {
    .attr-card {
      grid-template-columns: 2.5rem minmax(3rem, 1fr) 2.5rem;
    }

    .set-14 {
      grid-column: 1 / -1;
    }
  }

</style>
