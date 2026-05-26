<script lang="ts">
  import { dbState } from '../../lib/dbState.svelte';
    import { toastState } from '../../lib/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  let charOptions = $derived(
    dbState.characters
      .filter(c => c.role === 'PLAYER')
      .map(c => ({ label: c.name, value: c.id }))
  );

  let targetChar = $state<{label: string, value: string} | null>(null);
  let creditAdjust = $state(0);
  let radAdjust = $state(0);

  async function applyCharEdits() {
    if (!targetChar) return;
    const char = dbState.characters.find(c => c.id === targetChar!.value);
    if (!char) return;

    if (creditAdjust !== 0) {
      await dbState.updatePersonalCredits(char.id, creditAdjust);
      toastState.notify('CHARACTER CREDITS UPDATED');
    }
    
    if (radAdjust !== 0) {
      const newRads = Math.max(0, Math.min(10, char.rads + radAdjust));
      await dbState.updateRads(char.id, newRads);
      toastState.notify('CHARACTER RADS UPDATED');
    }

    creditAdjust = 0;
    radAdjust = 0;
  }
</script>

<TerminalPanel title="CHARACTER EDITOR" extraClass="gm-panel">
  <div class="mb-1">
    <TerminalSelect 
      options={charOptions} 
      bind:value={targetChar} 
      placeholder="SELECT CREW MEMBER..." 
      id="char-sel" 
      showPopup={false} 
    />
  </div>

  {#if targetChar}
    <div class="input-row">
      <div class="input-group">
        <label for="credit-adjust">ADJUST CREDITS (+/-)</label>
        <input type="number" id="credit-adjust" bind:value={creditAdjust} class="terminal-input" />
      </div>
      <div class="input-group">
        <label for="rad-adjust">ADJUST RADS (+/-)</label>
        <input type="number" id="rad-adjust" bind:value={radAdjust} class="terminal-input" />
      </div>
    </div>
    <button class="btn-action btn-full-amber" onclick={applyCharEdits}>
      FORCE OVERRIDE
    </button>
  {/if}
</TerminalPanel>