<script lang="ts">
  import { dbState } from '../../lib/dbState.svelte';
    import { toastState } from '../../lib/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let creditsAdjust = $state(0);
  let kibbleAdjust = $state(0);

  async function applyCreditsEdit() {
    if (creditsAdjust !== 0) {
      await dbState.updateShipCredits(creditsAdjust);
      creditsAdjust = 0;
      toastState.notify('SHIP SLUSH FUND UPDATED');
    }
  }

  async function applyKibbleEdit() {
    if (kibbleAdjust !== 0) {
      await dbState.updateKibble(kibbleAdjust);
      kibbleAdjust = 0;
      toastState.notify('SHIP LOGISTICS UPDATED');
    }
  }
</script>

<TerminalPanel title="SHIP LOGISTICS" extraClass="gm-panel">
  <div class="input-row mb-1">
    <div class="input-group flex-2 no-margin">
      <label for="credits-adjust">ADJUST SLUSH FUND (CR +/-)</label>
      <input type="number" id="credits-adjust" bind:value={creditsAdjust} class="terminal-input" />
    </div>
    <div class="input-group flex-1 no-margin">
      <label for="apply-credits-edit">&nbsp;</label>
      <button class="btn-action btn-full-amber" onclick={applyCreditsEdit}>
        UPDATE
      </button>
    </div>
  </div>

  <div class="input-row no-margin">
    <div class="input-group flex-2 no-margin">
      <label for="kibble-adjust">ADJUST KIBBLE (DAYS +/-)</label>
      <input type="number" id="kibble-adjust" bind:value={kibbleAdjust} class="terminal-input" />
    </div>
    <div class="input-group flex-1 no-margin">
      <label for="apply-kibble-edit">&nbsp;</label>
      <button class="btn-action btn-full-amber" onclick={applyKibbleEdit}>
        UPDATE
      </button>
    </div>
  </div>
</TerminalPanel>