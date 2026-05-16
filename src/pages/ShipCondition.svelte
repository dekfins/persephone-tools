<script lang="ts">
  import { shipState } from '../lib/shipState.svelte';
  import VitalsPanel from '../components/ship-condition/VitalsPanel.svelte';
  import EngineeringPanel from '../components/ship-condition/EngineeringPanel.svelte'; 
  import SystemsPanel from '../components/ship-condition/SystemsPanel.svelte';
  import ConditionsPanel from '../components/ship-condition/ConditionsPanel.svelte';
  import '../styles/layout.css'; 
</script>

<div class="page-container">
  
  <div class="layout-grid grid-condition">
    
    <div class="col-stack">
      <VitalsPanel />
      <EngineeringPanel />
    </div>
    
    <div class="col-stack">
      <SystemsPanel />
      <ConditionsPanel />
    </div>

  </div>
</div>