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
    <button class="btn-action" onclick={() => characterCreatorState.useStandardArray()}>USE ARRAY</button>
    <button class="btn-action" onclick={() => characterCreatorState.rollAttributes()}>ROLL 3D6</button>
  </div>

  <div class="attr-grid">
    {#each ALL_ATTRIBUTES as attribute}
      <div class="attr-card">
        <label for="creator-attr-{attribute}">{attribute}</label>
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
        <span class="mod {modClass(characterCreatorState.attributeModifiers[attribute])}">
          {modLabel(characterCreatorState.attributeModifiers[attribute])}
        </span>
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
    grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
    align-items: center;
  }

  label,
  .label {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .attr-input {
    text-align: center;
  }

  .value {
    color: var(--accent-amber);
    font-family: var(--font-terminal);
    text-align: right;
  }

  .mod {
    font-family: var(--font-terminal);
    text-align: right;
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

</style>
