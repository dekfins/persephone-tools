<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

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
</script>

<TerminalPanel title="Active Conditions (Travel)" extraClass="span-full">
  <div class="condition-controls">
    
    <TerminalSelect 
      id="condition-inflict-select"
      options={conditionTemplates}
      bind:value={selectedConditionTemplate}
      labelKey="selectLabel"
    />

    <button class="btn-action" onclick={() => shipState.addCondition(selectedConditionTemplate)}>INFLICT</button>
    <button class="btn-action" onclick={() => shipState.advanceTravelSegment()}>
      +1 SEGMENT
    </button>
  </div>

  <div class="conditions-list">
    {#if shipState.activeConditions.length === 0}
      <p class="text-dim" style="margin-top: 1rem;">Ship operating nominally. No active debuffs.</p>
    {/if}

    {#each shipState.activeConditions as cond}
      <div class="condition-card">
        <div class="cond-header">
          <h4 class="error">{cond.name} [DC {cond.fixDC}]</h4>
          <div class="cond-timer">
            <span>SEGMENTS ACTIVE:</span>
            <button class="btn-icon" onclick={() => cond.segmentsActive = Math.max(0, cond.segmentsActive - 1)}>-</button>
            <span class="timer-val">{cond.segmentsActive}</span>
            <button class="btn-icon" onclick={() => cond.segmentsActive += 1}>+</button>
          </div>
        </div>
        <p class="cond-effect">{cond.effect}</p>
        <button class="btn-danger-text" onclick={() => shipState.removeCondition(cond.id)}>RESOLVE / REMOVE</button>
      </div>
    {/each}
  </div>
</TerminalPanel>

<style>
  .error {
    color: var(--accent-red);
  }

  .text-dim {
    color: var(--text-dim);
  }

  .condition-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding-bottom: 1rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .conditions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 400px; /* Safe scroll limit */
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

    font-size: 0.9rem;
    color: var(--accent-amber);
  }

  .timer-val {
    min-width: 1.5rem;

    font-size: 1.1rem;
    font-weight: bold;
    text-align: center;
  }

  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 24px;
    height: 24px;
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
    font-family: inherit;
  }

  .btn-danger-text:hover {
    color: var(--accent-red);
  }

  .conditions-list::-webkit-scrollbar {
    width: 6px;
  }

  .conditions-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-left: 1px dashed var(--border-subtle, #333);
  }

  .conditions-list::-webkit-scrollbar-thumb {
    background: var(--ui-cyan, #00aacc);
    border-radius: 2px;
  }

  .conditions-list::-webkit-scrollbar-thumb:hover {
    background: var(--accent-amber, #ffb000);
  }
</style>

