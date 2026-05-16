<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import fuelsData from '../../data/fuels.json';

  function adjustHP(amount: number) {
    shipState.currentHealth = Math.min(shipState.totalHealth, Math.max(0, shipState.currentHealth + amount));
  }

  function adjustRI(amount: number) {
    const maxRI = shipState.reactor?.reactorIntegrity || 6;
    shipState.currentRI = Math.min(maxRI, Math.max(0, shipState.currentRI + amount));
  }

  let fuelOptions = $derived((shipState.engine?.availableFuels || []).map(f => ({ name: f, class: "universal" })));
  let modeOptions = $derived((shipState.engine?.availableModes || []).map(m => ({ name: m, class: "universal" })));

  // 1. DYNAMIC CONFIG LOOKUP
  let activeConfig = $derived.by(() => {
    if (!shipState.engine || !shipState.activeFuel || !shipState.activeMode) return null;
    return shipState.engine.configs.find(
      (c: any) => c.fuel === shipState.activeFuel && c.mode === shipState.activeMode
    ) || null;
  });

  let activePropellants = $derived(activeConfig?.propellants || []);

  // 2. THE MULTI-FUEL CAPACITY CALCULATOR
  let fuelCapacities = $derived.by(() => {
    let caps: Record<string, number> = {};
    if (!activePropellants.length) return caps;

    let bunkerCap = 0; let cryoCap = 0; let particleCap = 0; let amCap = 0;
    
    for (const comp of shipState.components) {
      const name = (comp.item.fittingName || comp.item.name || "").toLowerCase();
      const qty = comp.quantity;

      if (name.includes("fuel bunker")) bunkerCap += 5 * qty;
      if (name.includes("cryofuel bunker")) cryoCap += 5 * qty;
      if (name.includes("fissionables tank") || name.includes("pellet")) particleCap += 5 * qty;
      if (name.includes("antimatter bottle")) amCap += 1 * qty;
    }

    for (const prop of activePropellants) {
      const f = prop.name;
      const fuelInfo = fuelsData.find(x => x.name === f);
      const baseCapacity = (fuelInfo && fuelInfo.baseHullCompatible) ? 1 : 0;
      const getCap = (moduleCapacity: number) => moduleCapacity > 0 ? moduleCapacity : baseCapacity;

      if (["Methalox", "Argon", "Xenon"].includes(f)) caps[f] = getCap(bunkerCap + cryoCap);
      else if (["LH2", "H2", "NSW", "D+He-3"].includes(f)) caps[f] = getCap(cryoCap); 
      else if (["Particles", "Pellets"].includes(f)) caps[f] = particleCap;
      else if (f === "AM") caps[f] = amCap;
      else caps[f] = 0;
    }
    
    return caps;
  });

  // 3. AUTO-FILL AND HARD SAFETY CLAMP EFFECT
  $effect(() => {
    if (shipState.currentFuel === undefined || typeof shipState.currentFuel === 'number') {
      shipState.currentFuel = {}; 
    }
    
    for (const prop of activePropellants) {
      const maxCap = fuelCapacities[prop.name] || 0;

      // RULE 1: If coming from the builder/importing, fuel values are undefined.
      // Automatically snap them up to their hardware max capacity!
      if (shipState.currentFuel[prop.name] === undefined) {
        shipState.currentFuel[prop.name] = maxCap;
      }

      // RULE 2: Continuous Clamping Safety. If a user manually types past the max,
      // or if your cargo capacity shrinks, immediately force it down to maxCap.
      if (shipState.currentFuel[prop.name] > maxCap) {
        shipState.currentFuel[prop.name] = maxCap;
      }
      if (shipState.currentFuel[prop.name] < 0) {
        shipState.currentFuel[prop.name] = 0;
      }
    }
  });

  let selectedFuelObj = $state<{ name: string } | null>(null);
  let selectedModeObj = $state<{ name: string } | null>(null);

  $effect(() => {
    const isValidFuel = fuelOptions.some(f => f.name === shipState.activeFuel);
    
    if (!isValidFuel && fuelOptions.length > 0) {
      shipState.activeFuel = fuelOptions[0].name; 
    }
    
    if (shipState.activeFuel) {
      selectedFuelObj = { name: shipState.activeFuel };
    }
  });

  $effect(() => {
    const isValidMode = modeOptions.some(m => m.name === shipState.activeMode);
    
    if (!isValidMode && modeOptions.length > 0) {
      shipState.activeMode = modeOptions[0].name; 
    }

    if (shipState.activeMode) {
      selectedModeObj = { name: shipState.activeMode };
    }
  });
</script>

<TerminalPanel title="Engineering Controls">
  <div class="eng-row">
    <span class="eng-label">HP OVERRIDE:</span>
    <div class="btn-group">
      <button class="btn-action slim" onclick={() => adjustHP(-1)}>-1</button>
      <button class="btn-action slim" onclick={() => adjustHP(1)}>+1</button>
    </div>
  </div>

  <div class="eng-row">
    <span class="eng-label">RI OVERRIDE:</span>
    <div class="btn-group">
      <button class="btn-action slim" onclick={() => adjustRI(-1)}>-1</button>
      <button class="btn-action slim" onclick={() => adjustRI(1)}>+1</button>
    </div>
  </div>

  <hr class="dim-divider" />

  <div class="form-group">
    <label for="fuel-select">Fuel Type:</label>
    <TerminalSelect
      id="fuel-select"
      options={fuelOptions}
      bind:value={selectedFuelObj}
      labelKey="name"
      onSelect={(item: any) => shipState.activeFuel = item.name}
    />
  </div>

  <div class="form-group">
    <label for="mode-select">Burn Mode:</label>
    <TerminalSelect
      id="mode-select"
      options={modeOptions}
      bind:value={selectedModeObj}
      labelKey="name"
      onSelect={(item: any) => shipState.activeMode = item.name}
    />
  </div>

  <hr class="dim-divider" />

  {#each activePropellants as prop}
    <div class="eng-row">
      <div class="fuel-label-group">
        <span class="eng-label">{prop.name.toUpperCase()} CELLS:</span>
        <span class="text-dim" style="font-size: 0.75rem;">(MAX: {fuelCapacities[prop.name] || 0})</span>
      </div>
      <input 
        type="number" 
        step="0.01" 
        min="0" 
        max={fuelCapacities[prop.name] || 0}
        bind:value={shipState.currentFuel[prop.name]} 
        class="terminal-input num-input" 
      />
    </div>
  {/each}

</TerminalPanel>

<style>
  .eng-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.2rem;
  }
  .eng-label {
    color: var(--text-dim);
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }
  .fuel-label-group {
    display: flex;
    flex-direction: column;
  }

  .btn-group {
    display: flex;
    gap: 0.5rem;
  }
  .btn-action.slim {
    padding: 0.2rem 0.8rem;
    font-size: 1rem;
    width: 45px;
    text-align: center;
  }

  .dim-divider {
    border: 0;
    border-bottom: 1px dashed var(--text-dim);
    margin: 1.2rem 0;
    opacity: 0.5;
  }

  .terminal-input {
    background: var(--bg-void);
    color: var(--ui-bright);
    border: 1px solid var(--ui-cyan);
    padding: 0.4rem;
    font-family: inherit;
    width: 150px;
  }
  .num-input {
    text-align: right;
    font-weight: bold;
    color: var(--accent-amber);
    font-size: 1.1rem;
  }
</style>