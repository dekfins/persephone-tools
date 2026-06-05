<script lang="ts">
  import CoreSystems from '../components/ship-builder/CoreSystemsPanel.svelte';
  import ComponentCart from '../components/ship-builder/ComponentsPanel.svelte';
  import ShipStats from '../components/ship-builder/ShipStatsPanel.svelte';
  import { createShipState } from '../lib/states/shipState.svelte';

  const shipyardState = createShipState();
</script>

<div class="page-container">
  <div class="layout-grid grid-builder">
    <div class="col-stack"><CoreSystems shipyardState={shipyardState} /></div>
    <div class="col-stack"><ComponentCart shipyardState={shipyardState} /></div>
    <div class="col-stack"><ShipStats shipyardState={shipyardState} /></div>
  </div>
</div>
