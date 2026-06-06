<script lang="ts">
  import { ALL_CHARACTER_CONDITIONS } from '../../lib/characterConstants';
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { CharacterActiveCondition, CharacterConditionTemplate } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let templatesOpen = $state(false);
  let customCondition = $state('');

  function categoryLabel(category: CharacterActiveCondition['category']) {
    return category.toUpperCase();
  }

  async function addTemplateCondition(template: CharacterConditionTemplate) {
    if (!char) return;
    await dbState.addCharacterCondition(char.id, template);
    templatesOpen = false;
  }

  async function addCustomCondition() {
    if (!char) return;

    const name = customCondition.trim();
    if (!name) return;

    await dbState.addCharacterCondition(char.id, {
      category: 'custom',
      name,
      summary: 'Custom condition.'
    });
    customCondition = '';
  }

  async function removeCondition(conditionId: string) {
    if (!char) return;
    await dbState.removeCharacterCondition(char.id, conditionId);
  }

  function handleCustomKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCustomCondition();
  }
</script>

<TerminalPanel title="CONDITIONS" extraClass="player-panel">
  {#if char}
    <div class="condition-control">
      <button
        class="condition-toggle"
        type="button"
        aria-expanded={templatesOpen}
        aria-controls="condition-template-list"
        onclick={() => templatesOpen = !templatesOpen}
      >
        <span class="chevron-toggle" class:expanded={templatesOpen} aria-hidden="true">
          <span class="chevron-mark"></span>
        </span>
        <span>CONDITION</span>
      </button>

      <input
        class="terminal-input custom-condition-input"
        type="text"
        bind:value={customCondition}
        placeholder="Enter custom condition..."
        aria-label="Enter custom condition"
        onkeydown={handleCustomKeydown}
      />
    </div>

    {#if templatesOpen}
      <div id="condition-template-list" class="condition-template-list">
        {#each ALL_CHARACTER_CONDITIONS as template}
          <button
            class="condition-option"
            type="button"
            onclick={() => addTemplateCondition(template)}
          >
            <span class="condition-option-heading">
              <span class="type-label">[{categoryLabel(template.category)}]</span>
              <span class="condition-name">{template.name}</span>
            </span>
            <span class="condition-summary">{template.summary}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if char.active_conditions.length > 0}
      <ul class="item-list condition-list">
        {#each char.active_conditions as condition}
          <li class="item-row">
            <div class="item-row-main no-toggle">
              <div class="item-details">
                <div class="item-heading">
                  <span class="type-label">[{categoryLabel(condition.category)}]</span>
                  <span class="item-name condition-name">{condition.name}</span>
                </div>
                <span class="item-meta">{condition.summary}</span>
              </div>

              <div class="row-actions">
                <button
                  class="btn-action-red btn-compact"
                  type="button"
                  onclick={() => removeCondition(condition.id)}
                >
                  REMOVE
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="dim-message empty-state">NO ACTIVE CONDITIONS</div>
    {/if}
  {:else}
    <div class="dim-message">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .condition-control {
    display: grid;
    grid-template-columns: minmax(9rem, auto) minmax(0, 1fr);
    align-items: stretch;
    gap: 0.75rem;
    font-family: var(--font-terminal);
  }

  .condition-toggle {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.55rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    cursor: pointer;
    font-family: var(--font-terminal);
    min-height: var(--control-height);
    padding: var(--control-padding);
    text-align: left;
  }

  .condition-toggle:hover {
    border-color: var(--accent-amber);
  }

  .condition-toggle .chevron-toggle {
    pointer-events: none;
  }

  .custom-condition-input {
    color: var(--text-main) !important;
    text-transform: none;
  }

  .custom-condition-input::placeholder {
    text-transform: none;
  }

  .condition-template-list {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.65rem;
    padding: 0.65rem;
    background: rgba(255, 255, 255, 0.02);
    border: var(--border-subtle);
  }

  .condition-option {
    display: grid;
    gap: 0.25rem;
    width: 100%;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    cursor: pointer;
    font-family: var(--font-terminal);
    padding: 0.65rem;
    text-align: left;
    text-transform: none;
  }

  .condition-option:hover {
    border-color: var(--accent-amber);
    background: rgba(245, 158, 11, 0.05);
  }

  .condition-option-heading {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .condition-name {
    color: var(--text-main);
    font-weight: bold;
    overflow-wrap: anywhere;
    text-transform: none;
  }

  .condition-summary {
    color: var(--text-dim);
    font-size: 0.78rem;
    line-height: 1.4;
    text-transform: none;
  }

  .condition-list {
    margin-top: 0.75rem;
  }

  .empty-state {
    margin-top: 0.75rem;
  }

  @media (max-width: 700px) {
    .condition-control {
      grid-template-columns: 1fr;
    }
  }
</style>
