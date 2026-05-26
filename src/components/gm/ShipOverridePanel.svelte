<script lang="ts">
    import { dbState } from '../../lib/dbState.svelte';
  import { shipState } from '../../lib/shipState.svelte';
    import { toastState } from '../../lib/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let overrideHp = $state(shipState.blueprint.totalHealth);
  let overrideRi = $state(shipState.blueprint.reactor?.reactorIntegrity || 6);

  async function applyShipOverrides() {
    shipState.vitals.currentHealth = overrideHp;
    shipState.vitals.currentRI = overrideRi;
    
    await dbState.syncShipStateToCloud();
    toastState.notify('SHIP VITALS UPDATED');
  }
</script>

<TerminalPanel title="HULL & REACTOR OVERRIDE" extraClass="gm-panel">
  <div class="input-row no-margin">
    <div class="input-group no-margin">
      <label for="override-hp">SET HP (Max: {shipState.blueprint.totalHealth})</label>
      <input type="number" id="override-hp" bind:value={overrideHp} class="terminal-input" />
    </div>
    <div class="input-group no-margin">
      <label for="override-ri">SET RI (Max: {shipState.blueprint.reactor?.reactorIntegrity || 6})</label>
      <input type="number" id="override-ri" bind:value={overrideRi} class="terminal-input" />
    </div>
    <div class="input-group flex-1 no-margin">
      <label for="apply-override">&nbsp;</label>
      <button class="btn-action btn-full-amber" onclick={applyShipOverrides}>
        APPLY OVERRIDE
      </button>
    </div>
  </div>
</TerminalPanel>