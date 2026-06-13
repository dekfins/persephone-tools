<script lang="ts">
  import CoreSystems from '../components/ship-builder/CoreSystemsPanel.svelte';
  import ComponentCart from '../components/ship-builder/ComponentsPanel.svelte';
  import ShipStats from '../components/ship-builder/ShipStatsPanel.svelte';
  import { shipState } from '../lib/states/shipState.svelte';
</script>

<div class="page-container">
  <div class="layout-grid grid-builder">
    <div class="col-stack"><CoreSystems shipyardState={shipState} /></div>
    <div class="col-stack"><ComponentCart shipyardState={shipState} /></div>
    <div class="col-stack"><ShipStats shipyardState={shipState} /></div>
  </div>
</div>
