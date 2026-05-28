<script lang="ts">
  import { createShipState } from '../../lib/states/shipState.svelte';
  import hulls from '../../data/hulls.json'
  import reactors from '../../data/reactors.json';
  import engines from '../../data/engines.json';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  
  // Create local state instance for this component
  const localState = createShipState();

  let availableReactors = $derived(
    reactors.filter(r => localState.blueprint.getTier(r.class) <= localState.blueprint.multipliers.classTier)
  );

  let availableEngines = $derived(
    engines.filter(e => localState.blueprint.getTier(e.class) <= localState.blueprint.multipliers.classTier)
  );

  $effect(() => {
    const tier = localState.blueprint.multipliers.classTier;
    
    if (localState.blueprint.reactor && localState.blueprint.getTier(localState.blueprint.reactor.class) > tier) {
      localState.blueprint.reactor = availableReactors[0];
    }
    
    if (localState.blueprint.engine && localState.blueprint.getTier(localState.blueprint.engine.class) > tier) {
      localState.blueprint.engine = availableEngines[0];
    }
  });
</script>

<TerminalPanel title="CORE SYSTEMS">
<div class="form-group">
  <label for="shipName">Ship Name:</label>
  <input id="shipName" type="text" placeholder="Enter Name..." bind:value={localState.blueprint.name} class="terminal-input"/>
</div>

<div class="form-group">
  <label for="hull-select">Hull Type:</label>
  <TerminalSelect 
    id="hull-dropdown"
    options={hulls} 
    bind:value={localState.blueprint.hull} 
    labelKey="hullType" 
  />
</div>

<div class="form-group">
  <label for="reactor-select">Reactor Core</label>
  <TerminalSelect 
    id="reactor-select"
    options={availableReactors} 
    bind:value={localState.blueprint.reactor} 
    labelKey="reactorType" 
  />
</div>

<div class="form-group">
  <label for="engine-select">Engine Drive</label>
  <TerminalSelect 
    id="engine-select"
    options={availableEngines} 
    bind:value={localState.blueprint.engine} 
    labelKey="engineName" />
</div>
</TerminalPanel>