<script lang="ts">
  import { ALL_ATTRIBUTES } from '../../lib/characterConstants';
  import { formatModifier, getAttributeModifier } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';

  let char = $derived(dbState.activeCharacter);
  let attributeItems = $derived(char?.attributes ? ALL_ATTRIBUTES.map((attr) => {
    const modifier = getAttributeModifier(char.attributes[attr]);
    return {
      label: attr.toUpperCase(),
      value: char.attributes[attr],
      detail: formatModifier(modifier),
      tone: modifier > 0 ? 'positive' : modifier < 0 ? 'negative' : undefined
    };
  }) : []);
</script>

<TerminalPanel title="ATTRIBUTES" extraClass="player-panel">
  {#if char && char.attributes}
    <TerminalStatGrid items={attributeItems} columns={6} />
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>
