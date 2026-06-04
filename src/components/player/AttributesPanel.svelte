<script lang="ts">
  import { ALL_ATTRIBUTES } from '../../lib/characterConstants';
  import { formatModifier, getAttributeModifier } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import type { AttributeKey } from '../../lib/types';

  let char = $derived(dbState.activeCharacter);

  function modLabel(attribute: AttributeKey) {
    const modifier = char?.attributes ? getAttributeModifier(char.attributes[attribute]) : 0;
    return formatModifier(modifier);
  }
</script>

<TerminalPanel title="ATTRIBUTES" extraClass="player-panel">
  {#if char && char.attributes}
    <div class="attr-grid">
      {#each ALL_ATTRIBUTES as attr}
        {@const modifier = getAttributeModifier(char.attributes[attr])}
        <div class="attr-card">
          <span>{attr.toUpperCase()}</span>
          <strong>{char.attributes[attr]}</strong>
          <em class:positive={modifier > 0} class:negative={modifier < 0}>{modLabel(attr)}</em>
        </div>
      {/each}
    </div>
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .attr-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .attr-card {
    display: grid;
    grid-template-columns: 2.5rem 1fr 2.5rem;
    align-items: center;
    gap: 0.45rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
    font-family: var(--font-terminal);
  }

  span {
    color: var(--text-dim);
    font-size: 0.78rem;
  }

  strong {
    color: var(--accent-amber);
    text-align: center;
    font-size: 1.1rem;
  }

  em {
    color: var(--text-main);
    font-style: normal;
    text-align: right;
    font-weight: bold;
  }

  em.positive {
    color: var(--fighter-green);
  }

  em.negative {
    color: var(--accent-red);
  }
</style>
