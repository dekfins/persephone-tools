<script lang="ts">
  import { shipState } from '../../lib/states/shipState.svelte';
  import { shipCodec } from '../../lib/shipCodec';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid, { type TerminalStatGridItem } from '../shared/TerminalStatGrid.svelte';
  
  // Create local state instance for this component
  const localState = shipState;

  let twr = $derived(localState.propulsion.activeConfig?.twrG || 0);
  let totalDV = $derived(localState.propulsion.totalDV);
  let crewLabel = $derived(
    localState.blueprint.currentMinCrew === localState.blueprint.currentMaxCrew
      ? `${localState.blueprint.currentMinCrew}`
      : `${localState.blueprint.currentMinCrew}/${localState.blueprint.currentMaxCrew}`
  );
  let vitalsGridItems = $derived<TerminalStatGridItem[]>([
    {
      label: 'HP',
      value: `${localState.vitals.currentHealth}/${localState.blueprint.totalHealth}`,
      tone: localState.vitals.currentHealth <= localState.blueprint.totalHealth / 4 ? 'error' : 'accent'
    },
    {
      label: 'RI',
      value: `${localState.vitals.currentRI}/${localState.blueprint.reactor?.reactorIntegrity || 6}`,
      tone: localState.vitals.currentRI <= 2 ? 'error' : 'accent'
    },
    { label: 'ARMOR', value: localState.blueprint.totalArmor },
    { label: 'AC', value: localState.blueprint.totalArmorClass },
    { label: 'CARGO', value: `${localState.blueprint.totalCargo}t` },
    { label: 'CREW', value: crewLabel },
    { label: 'SPEED', value: localState.blueprint.totalSpeed },
    { label: 'TWR', value: twr },
    { label: 'DV', value: Math.round(totalDV) },
    {
      label: 'POWER',
      value: `${Math.round(localState.blueprint.usedPower * 10) / 10}/${Math.round(localState.blueprint.totalPower * 10) / 10}`,
      tone: localState.blueprint.usedPower > localState.blueprint.totalPower ? 'error' : undefined
    },
    {
      label: 'MASS',
      value: `${Math.round(localState.blueprint.usedMass * 10) / 10}/${Math.round(localState.blueprint.totalMass * 10) / 10}`,
      tone: localState.blueprint.usedMass > localState.blueprint.totalMass ? 'error' : undefined
    },
    {
      label: 'HPTS',
      value: `${localState.blueprint.usedHardpoints}/${localState.blueprint.totalHardpoints}`,
      tone: localState.blueprint.usedHardpoints > localState.blueprint.totalHardpoints ? 'error' : undefined
    }
  ]);

  let fileInput: HTMLInputElement;

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      shipCodec.importFromFile(target.files[0], localState);
      target.value = '';
    }
  }
</script>

<TerminalPanel title={localState.blueprint.name || "UNNAMED SHIP"} extraClass="vitals-panel">
  <div class="vitals-grid">
    <TerminalStatGrid items={vitalsGridItems} columns={3} valueTone="amber" />
  </div>
  <div class="io-controls">
    <button class="btn-action" onclick={() => shipCodec.exportToFile(localState)}>EXPORT SHIP</button>
    <button class="btn-action" onclick={() => fileInput.click()}>IMPORT SHIP</button>
    
    <input 
      type="file" 
      accept=".deimos" 
      bind:this={fileInput} 
      onchange={handleFileUpload} 
      style="display: none;" 
    />
  </div>
</TerminalPanel>

<style>
  .vitals-grid {
    margin-bottom: 1rem;
  }

  .io-controls {
    display: flex;
    gap: 1rem;
    width: 100%;
  }
</style>
