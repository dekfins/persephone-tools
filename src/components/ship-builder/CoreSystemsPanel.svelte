<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import hulls from '../../data/hulls.json'
  import reactors from '../../data/reactors.json';
  import engines from '../../data/engines.json';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let availableReactors = $derived(
    reactors.filter(r => shipState.blueprint.getTier(r.class) <= shipState.blueprint.multipliers.classTier)
  );

  let availableEngines = $derived(
    engines.filter(e => shipState.blueprint.getTier(e.class) <= shipState.blueprint.multipliers.classTier)
  );

  $effect(() => {
    const tier = shipState.blueprint.multipliers.classTier;
    
    if (shipState.blueprint.reactor && shipState.blueprint.getTier(shipState.blueprint.reactor.class) > tier) {
      shipState.blueprint.reactor = availableReactors[0];
    }
    
    if (shipState.blueprint.engine && shipState.blueprint.getTier(shipState.blueprint.engine.class) > tier) {
      shipState.blueprint.engine = availableEngines[0];
    }
  });
</script>

<TerminalPanel title="CORE SYSTEMS">
  <div class="form-group">
    <label for="shipName">Ship Name:</label>
    <input id="shipName" type="text" placeholder="Enter Name..." bind:value={shipState.blueprint.name} class="terminal-input"/>
  </div>

  <div class="form-group">
    <label for="hull-select">Hull Type:</label>
    <TerminalSelect 
      id="hull-dropdown"
      options={hulls} 
      bind:value={shipState.blueprint.hull} 
      labelKey="hullType" 
    />
  </div>

  <div class="form-group">
    <label for="reactor-select">Reactor Core</label>
    <TerminalSelect 
      id="reactor-select"
      options={availableReactors} 
      bind:value={shipState.blueprint.reactor} 
      labelKey="reactorType" 
    />
  </div>
  
  <div class="form-group">
    <label for="engine-select">Engine Drive</label>
    <TerminalSelect 
      id="engine-select"
      options={availableEngines} 
      bind:value={shipState.blueprint.engine} 
      labelKey="engineName" />
  </div>
</TerminalPanel>