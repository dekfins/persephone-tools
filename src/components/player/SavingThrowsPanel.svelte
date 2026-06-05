<script lang="ts">
  import { getSavingThrows } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';

  let char = $derived(dbState.activeCharacter);
  let saves = $derived(char ? dbState.localCharacterCreation?.saves ?? getSavingThrows(char.attributes) : null);
  let saveItems = $derived(saves ? [
    { label: 'PHYSICAL', value: `${saves.physical}+`, detail: 'STR / CON' },
    { label: 'EVASION', value: `${saves.evasion}+`, detail: 'INT / DEX' },
    { label: 'MENTAL', value: `${saves.mental}+`, detail: 'WIS / CHA' }
  ] : []);
</script>

<TerminalPanel title="SAVING THROWS" extraClass="player-panel">
  {#if saves}
    <TerminalStatGrid items={saveItems} columns={3} />
  {:else}
    <div class="terminal-alert">AWAITING SAVE DATA...</div>
  {/if}
</TerminalPanel>
