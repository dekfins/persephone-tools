<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import { toastState } from '../../lib/toastState.svelte';
  import { dbState } from '../../lib/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  // --- CUSTOM CONDITION STATE ---
  const conditionOptions = [
    { label: 'HULL', value: 'HULL' },
    { label: 'DRIVE', value: 'DRIVE' },
    { label: 'WEAPON', value: 'WEAPON' },
    { label: 'CREW', value: 'CREW' }
  ];
  let conditionName = $state('');
  let conditionType = $state(conditionOptions[0]);

  // --- TEMPLATE CONDITION STATE ---
  const conditionTemplates = [
    { name: "Cracked Coolant Loop", fixDC: "10", effect: "-1 Reactor Maint. Crit: +1 Rad to engine crew. Untreated 3 segments = -1 RI." },
    { name: "Thruster Offline", fixDC: "12", effect: "TWR reduced by 20% or 0.01g." },
    { name: "Sensor Array Damaged", fixDC: "10", effect: "-2 to Nav/Comms. Blind beyond visual." },
    { name: "Life Support Degradation", fixDC: "10", effect: "-1 to all checks. 2 segments untreated = +1 Rad/segment." },
    { name: "Hull Breach", fixDC: "8", effect: "Lose 1 HP per segment until patched. Vacc suits required." },
    { name: "Berth Microfractures", fixDC: "12", effect: "Resting does not remove Rads." },
    { name: "Comms Array Damaged", fixDC: "10", effect: "Cannot send/receive long-range. Vega lost." },
    { name: "Weapon System Malfunction", fixDC: "12", effect: "One weapon becomes inoperable." },
    { name: "Strange Resonance", fixDC: "14", effect: "-1 Mental saves. May attract attention." }
  ].map(t => ({
    ...t,
    selectLabel: `${t.name} (DC ${t.fixDC})`
  }));
  let selectedConditionTemplate = $state(conditionTemplates[0]);

  // --- ACTIONS ---
  // --- ACTIONS ---
  async function inflictCustomCondition() {
    if (!conditionName) return;
    shipState.vitals.addCondition({
      name: conditionName.toUpperCase(),
      fixDC: "GM",
      effect: `Inflicted by GM. Type: ${conditionType.value}`
    });
    conditionName = '';
    
    await dbState.syncShipStateToCloud(); // <--- FIRE THE SYNC
    toastState.notify('CUSTOM CONDITION INFLICTED');
  }

  async function inflictTemplateCondition() {
    if (!selectedConditionTemplate) return;
    shipState.vitals.addCondition(selectedConditionTemplate);
    
    await dbState.syncShipStateToCloud(); // <--- FIRE THE SYNC
    toastState.notify('TEMPLATE CONDITION INFLICTED');
  }

  async function advanceSegments() {
    shipState.vitals.advanceTravelSegment();
    
    await dbState.syncShipStateToCloud(); // <--- FIRE THE SYNC
    toastState.notify('ALL SEGMENTS ADVANCED');
  }

  async function removeCondition(id: string) {
    shipState.vitals.removeCondition(id);
    
    await dbState.syncShipStateToCloud(); // <--- FIRE THE SYNC
    toastState.notify('CONDITION RESOLVED');
  }
</script>

<TerminalPanel title="SYSTEM DAMAGE LOG" extraClass="gm-panel">
  
  <div class="input-row mb-1">
    <input type="text" aria-label="Condition Name" bind:value={conditionName} class="terminal-input flex-2" placeholder="e.g. Blown Relay" />
    <div class="flex-1">
      <TerminalSelect options={conditionOptions} bind:value={conditionType} id="cond-sel" showPopup={false} />
    </div>
  </div>
  <button class="btn-action btn-full-red mb-1" onclick={inflictCustomCondition}>
    INFLICT CUSTOM
  </button>

  <div class="input-row mb-1">
    <div class="flex-2">
      <TerminalSelect 
        id="condition-inflict-select"
        options={conditionTemplates}
        bind:value={selectedConditionTemplate}
        labelKey="selectLabel"
        showPopup={false}
      />
    </div>
    <div class="flex-1">
      <button class="btn-action btn-full-red" style="height: 100%;" onclick={inflictTemplateCondition}>
        INFLICT
      </button>
    </div>
  </div>

  <hr class="dim-divider" />

  <div class="list-header">
    <span class="text-dim" style="font-size: 0.8rem; font-weight: bold;">ACTIVE CONDITIONS</span>
    <button class="btn-action btn-compact" style="border-color: var(--accent-amber); color: var(--accent-amber); padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick={advanceSegments}>
      +1 SEGMENT (ALL)
    </button>
  </div>

  <div class="conditions-list">
    {#if shipState.vitals.activeConditions.length === 0}
      <div class="terminal-alert empty-state" style="margin-top: 0; padding: 1rem;">NO ACTIVE CONDITIONS</div>
    {/if}

    {#each shipState.vitals.activeConditions as cond}
      <div class="condition-card">
        <div class="cond-header">
          <h4 class="error">{cond.name} [DC {cond.fixDC}]</h4>
          <div class="cond-timer">
            <span>SEGMENTS:</span>
            <button class="btn-icon" onclick={() => cond.segmentsActive = Math.max(0, cond.segmentsActive - 1)}>-</button>
            <span class="timer-val">{cond.segmentsActive}</span>
            <button class="btn-icon" onclick={() => cond.segmentsActive += 1}>+</button>
          </div>
        </div>
        <p class="cond-effect">{cond.effect}</p>
        <button class="btn-danger-text" onclick={() => removeCondition(cond.id)}>RESOLVE / REMOVE</button>
      </div>
    {/each}
  </div>

</TerminalPanel>

<style>
  .dim-divider {
    border: 0;
    border-bottom: 1px dashed var(--text-dim);
    margin: 1.5rem 0;
    opacity: 0.3;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .error { color: var(--accent-red); }
  .text-dim { color: var(--text-dim); }

  .conditions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 350px; 
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .condition-card {
    padding: 1rem;
    background: rgba(255, 0, 0, 0.05);
    border: 1px solid var(--accent-red);
  }

  .cond-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .cond-header h4 {
    margin: 0;
    font-size: 1.1rem;
  }

  .cond-effect {
    margin-bottom: 1rem;
    font-size: 0.9rem;
    color: var(--text-main);
  }

  .cond-timer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--accent-amber);
  }

  .timer-val {
    min-width: 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    text-align: center;
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: transparent;
    color: var(--accent-amber);
    border: 1px solid var(--accent-amber);
    cursor: pointer;
    line-height: 1;
  }

  .btn-danger-text {
    padding: 0;
    background: transparent;
    border: none;
    color: var(--text-dim);
    text-decoration: underline;
    cursor: pointer;
    font-family: var(--font-terminal, monospace);
    font-size: 0.8rem;
  }

  .btn-danger-text:hover {
    color: var(--accent-red);
  }

  /* Scrollbar overrides for the log */
  .conditions-list::-webkit-scrollbar { width: 6px; }
  .conditions-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-left: 1px dashed rgba(255,255,255,0.1);
  }
  .conditions-list::-webkit-scrollbar-thumb {
    background: var(--accent-red);
    border-radius: 2px;
  }
  .conditions-list::-webkit-scrollbar-thumb:hover {
    background: var(--accent-amber);
  }
</style>