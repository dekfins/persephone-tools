<script lang="ts">
  import { shipState } from '../../lib/states/shipState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import fuelsData from '../../data/ship/fuels.json';
  
  // Create local state instance for this component
  const localState = shipState;

  let fuelOptions = $derived((localState.blueprint.engine?.availableFuels || []).map(f => ({ name: f, class: "universal" })));
  let modeOptions = $derived((localState.blueprint.engine?.availableModes || []).map(m => ({ name: m, class: "universal" })));

  // 1. DYNAMIC CONFIG LOOKUP
  let activeConfig = $derived.by(() => {
    if (!localState.blueprint.engine || !localState.propulsion.activeFuel || !localState.propulsion.activeMode) return null;
    return localState.blueprint.engine.configs.find(
      (c: any) => c.fuel === localState.propulsion.activeFuel && c.mode === localState.propulsion.activeMode
    ) || null;
  });

  let activePropellants = $derived(activeConfig?.propellants || []);

  // 2. THE MULTI-FUEL CAPACITY CALCULATOR
  let fuelCapacities = $derived.by(() => {
    let caps: Record<string, number> = {};
    if (!activePropellants.length) return caps;

    let bunkerCap = 0; let cryoCap = 0; let particleCap = 0; let amCap = 0;
    
    for (const comp of localState.blueprint.components) {
      const name = (comp.item.fittingName || comp.item.name || "").toLowerCase();
      const qty = comp.quantity;

      if (name.includes("fuel bunker")) bunkerCap += 5 * qty;
      if (name.includes("cryofuel bunker")) cryoCap += 5 * qty;
      if (name.includes("fissionable")) particleCap += 5 * qty;
      if (name.includes("antimatter bottle")) amCap += 1 * qty;
    }

    for (const prop of activePropellants) {
      const f = prop.name;
      const fuelInfo = fuelsData.find(x => x.name === f);
      const baseCapacity = (fuelInfo && fuelInfo.baseHullCompatible) ? 1 : 0;
      const getCap = (moduleCapacity: number) => moduleCapacity > 0 ? moduleCapacity : baseCapacity;

      if (["Methalox", "Argon", "Xenon"].includes(f)) caps[f] = getCap(bunkerCap + cryoCap);
      else if (["LH2", "H2", "NSW", "D+He-3"].includes(f)) caps[f] = getCap(cryoCap); 
      else if (["Fissionables"].includes(f)) caps[f] = particleCap;
      else if (f === "AM") caps[f] = amCap;
      else caps[f] = 0;
    }
    
    return caps;
  });

  // 3. AUTO-FILL AND HARD SAFETY CLAMP EFFECT
  $effect(() => {
    if (localState.propulsion.currentFuel === undefined || typeof localState.propulsion.currentFuel === 'number') {
      localState.propulsion.currentFuel = {}; 
    }
    
    for (const prop of activePropellants) {
      const maxCap = fuelCapacities[prop.name] || 0;

      if (localState.propulsion.currentFuel[prop.name] === undefined) {
        localState.propulsion.currentFuel[prop.name] = maxCap;
      }
      if (localState.propulsion.currentFuel[prop.name] > maxCap) {
        localState.propulsion.currentFuel[prop.name] = maxCap;
      }
      if (localState.propulsion.currentFuel[prop.name] < 0) {
        localState.propulsion.currentFuel[prop.name] = 0;
      }
    }
  });

  let selectedFuelObj = $state<{ name: string } | null>(null);
  let selectedModeObj = $state<{ name: string } | null>(null);

  $effect(() => {
    const isValidFuel = fuelOptions.some(f => f.name === localState.propulsion.activeFuel);
    if (!isValidFuel && fuelOptions.length > 0) localState.propulsion.activeFuel = fuelOptions[0].name; 
    if (localState.propulsion.activeFuel) selectedFuelObj = { name: localState.propulsion.activeFuel };
  });

  $effect(() => {
    const isValidMode = modeOptions.some(m => m.name === localState.propulsion.activeMode);
    if (!isValidMode && modeOptions.length > 0) localState.propulsion.activeMode = modeOptions[0].name; 
    if (localState.propulsion.activeMode) selectedModeObj = { name: localState.propulsion.activeMode };
  });

  function getFuelUnit(name: string) {
    const upper = name.toUpperCase();
    if (upper === 'FISSIONABLES') return '';
    if (upper === 'AM') return ' BOTTLES';
    return ' CELLS';
  }
</script>

<TerminalPanel title="PROPULSION & FUEL">
  
  {#if dbState.activeCharacter?.role === 'GM'}
    <div class="form-group">
      <label for="fuel-select">FUEL TYPE:</label>
      <TerminalSelect
        id="fuel-select"
        options={fuelOptions}
        bind:value={selectedFuelObj}
        labelKey="name"
        onSelect={(item: any) => localState.propulsion.activeFuel = item.name}
      />
    </div>

    <div class="form-group">
      <label for="mode-select">BURN MODE:</label>
      <TerminalSelect
        id="mode-select"
        options={modeOptions}
        bind:value={selectedModeObj}
        labelKey="name"
        onSelect={(item: any) => localState.propulsion.activeMode = item.name}
      />
    </div>

    {#each activePropellants as prop}
      <div class="eng-row">
        <div class="fuel-label-group">
          <span class="eng-label">{prop.name.toUpperCase()}{getFuelUnit(prop.name)}:</span>
          <span class="text-dim" style="font-size: 0.75rem;">(MAX: {fuelCapacities[prop.name] || 0})</span>
        </div>
        <input 
          type="number" 
          step="0.01" 
          min="0" 
          max={fuelCapacities[prop.name] || 0}
          bind:value={localState.propulsion.currentFuel[prop.name]} 
          class="terminal-input num-input" 
        />
      </div>
    {/each}

    <button class="btn-action" style="width: 100%; border-color: var(--ui-cyan);" onclick={() => dbState.syncShipStateToCloud()}>
      APPLY CHANGES
    </button>
  {:else}
    <div class="telemetry-row">
      <span class="eng-label">ACTIVE MIX:</span>
      <span class="telemetry-value" style="color: var(--ui-cyan);">{localState.propulsion.activeFuel?.toUpperCase() || 'NONE'}</span>
    </div>

    <div class="telemetry-row">
      <span class="eng-label">BURN MODE:</span>
      <span class="telemetry-value">{localState.propulsion.activeMode?.toUpperCase() || 'OFFLINE'}</span>
    </div>

    {#each activePropellants as prop}
      <div class="telemetry-row">
        <span class="eng-label">{prop.name.toUpperCase()} LEVEL:</span>
        <div class="fuel-readout">
          <span class="current-fuel">{localState.propulsion.currentFuel[prop.name]?.toFixed(2) || '0.00'}</span>
          <span class="text-dim"> / {fuelCapacities[prop.name] || 0}</span>
        </div>
      </div>
    {/each}
  {/if}

</TerminalPanel>

<style>
  /* --- BASE LAYOUT --- */
  .eng-row, .telemetry-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .telemetry-row {
    padding: 0.25rem 0;
  }
  .form-group {
    margin-bottom: 1rem;
  }
  .form-group label {
    display: block;
    font-size: 0.8rem;
    color: var(--text-dim);
    margin-bottom: 0.3rem;
  }

  /* --- TYPOGRAPHY --- */
  .eng-label {
    color: var(--text-dim);
    font-size: 0.85rem;
    letter-spacing: 0.05em;
  }
  .telemetry-value {
    font-size: 0.85rem;
    color: var(--accent-amber);
    text-transform: uppercase;
  }
  .fuel-readout .current-fuel {
    font-size: 0.85rem;
    color: var(--accent-amber);
  }
  .fuel-label-group {
    display: flex;
    flex-direction: column;
  }
  
  .text-dim { color: var(--text-dim); }

  /* Strip arrows from number input */
  input[type=number]::-webkit-inner-spin-button, 
  input[type=number]::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
  
  .terminal-input {
    background: var(--bg-void);
    color: var(--ui-bright);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.5rem;
    font-family: var(--font-terminal, monospace);
    width: 100px;
    transition: all 0.2s;
  }
  .terminal-input:focus {
    border-color: var(--accent-amber);
    outline: none;
  }
  .num-input {
    text-align: right;
    font-weight: bold;
    color: var(--accent-amber);
    font-size: 1.1rem;
  }
</style>