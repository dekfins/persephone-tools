<script lang="ts">
  import ShipVitalsPanel from '../components/ship-condition/ShipVitalsPanel.svelte';
  import FuelManagementPanel from '../components/ship-condition/FuelManagementPanel.svelte';
  import SystemsPanel from '../components/ship-condition/SystemsPanel.svelte';
  import ConditionsPanel from '../components/ship-condition/ConditionsPanel.svelte';
</script>

<div class="page-container">
  
  <div class="layout-grid grid-condition">
    
    <div class="col-stack">
      <ShipVitalsPanel />
      <FuelManagementPanel />
    </div>
    
    <div class="col-stack">
      <SystemsPanel />
      <ConditionsPanel />
    </div>

  </div>
</div>
