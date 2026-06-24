<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte.ts';
  import { crewState } from '../../lib/states/crewState.svelte.ts';
  import { shipState } from '../../lib/states/shipState.svelte.ts';
  import { toastState } from '../../lib/states/toastState.svelte.ts';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid, { type TerminalStatGridItem } from '../shared/TerminalStatGrid.svelte';

  let creditsAdjust = $state(0);
  let kibbleAdjust = $state(0);
  let overrideHp = $state(shipState.vitals.currentHealth);
  let overrideRi = $state(shipState.vitals.currentRI);
  let maxHp = $derived(shipState.blueprint.totalHealth);
  let maxRi = $derived(shipState.blueprint.reactor?.reactorIntegrity || 6);
  let logisticsStats = $derived<TerminalStatGridItem[]>([
    { label: 'SLUSH FUND', value: `${crewState.shipCredits.toLocaleString()} CR`, tone: 'credit' },
    { label: 'KIBBLE', value: `${crewState.kibbleDays} DAYS` },
    {
      label: 'HULL',
      value: `${shipState.vitals.currentHealth}/${maxHp}`,
      tone: shipState.vitals.currentHealth <= maxHp / 4 ? 'error' : 'accent'
    },
    {
      label: 'REACTOR',
      value: `${shipState.vitals.currentRI}/${maxRi}`,
      tone: shipState.vitals.currentRI <= 2 ? 'error' : 'accent'
    }
  ]);

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

  async function applyShipOverrides() {
    shipState.vitals.currentHealth = overrideHp;
    shipState.vitals.currentRI = overrideRi;

    await dbState.syncShipStateToCloud();
    toastState.notify('SHIP VITALS UPDATED');
  }
</script>

<TerminalPanel title="SHIP LOGISTICS" extraClass="gm-panel">
  <TerminalStatGrid items={logisticsStats} columns={4} />

  <section class="logistics-section">
    <h4>SUPPLIES & SLUSH FUND</h4>

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
  </section>

  <section class="logistics-section">
    <h4>HULL & REACTOR OVERRIDE</h4>

    <div class="input-row no-margin">
      <div class="input-group no-margin">
        <label for="override-hp">SET HP (Max: {maxHp})</label>
        <input type="number" id="override-hp" bind:value={overrideHp} class="terminal-input" />
      </div>
      <div class="input-group no-margin">
        <label for="override-ri">SET RI (Max: {maxRi})</label>
        <input type="number" id="override-ri" bind:value={overrideRi} class="terminal-input" />
      </div>
      <div class="input-group flex-1 no-margin">
        <label for="apply-override">&nbsp;</label>
        <button class="btn-action btn-full-amber" onclick={applyShipOverrides}>
          APPLY
        </button>
      </div>
    </div>
  </section>
</TerminalPanel>

<style>
  .logistics-section {
    display: grid;
    gap: 1rem;
  }

  .logistics-section h4 {
    margin: 0;
    padding-bottom: 0.45rem;
    border-bottom: 1px dashed var(--border-subtle);
    color: var(--text-dim);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }
</style>
