<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import hulls from '../../data/hulls.json'
  import reactors from '../../data/reactors.json';
  import engines from '../../data/engines.json';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  let availableReactors = $derived(
    reactors.filter(r => shipState.getTier(r.class) <= shipState.multipliers.classTier)
  );

  let availableEngines = $derived(
    engines.filter(e => shipState.getTier(e.class) <= shipState.multipliers.classTier)
  );

  $effect(() => {
    const tier = shipState.multipliers.classTier;
    
    if (shipState.reactor && shipState.getTier(shipState.reactor.class) > tier) {
      shipState.reactor = availableReactors[0];
    }
    
    if (shipState.engine && shipState.getTier(shipState.engine.class) > tier) {
      shipState.engine = availableEngines[0];
    }
  });
</script>

<div class="terminal-card">
  <div class="form-group">
    <label for="shipName">Ship Name:</label>
    <input id="shipName" type="text" placeholder="Enter Name..." bind:value={shipState.name} class="terminal-input"/>
  </div>

  <div class="form-group">
    <label for="hull-select">Hull Type:</label>
    <TerminalSelect 
      id="hull-dropdown"
      options={hulls} 
      bind:value={shipState.hull} 
      labelKey="hullType" 
    />
  </div>

  <div class="form-group">
    <label for="reactor-select">Reactor Core</label>
    <TerminalSelect 
      id="reactor-select"
      options={availableReactors} 
      bind:value={shipState.reactor} 
      labelKey="reactorType" 
    />
  </div>
  
  <div class="form-group">
    <label for="engine-select">Engine Drive</label>
    <TerminalSelect 
      id="engine-select"
      options={availableEngines} 
      bind:value={shipState.engine} 
      labelKey="engineName" />
  </div>
</div>