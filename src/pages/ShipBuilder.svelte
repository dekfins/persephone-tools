<script lang="ts">
  import CoreSystems from '../components/ship-builder/CoreSystemsPanel.svelte';
  import ComponentCart from '../components/ship-builder/ComponentsPanel.svelte';
  import ShipStats from '../components/ship-builder/ShipStatsPanel.svelte';
</script>

<div class="page-container">
  <div class="layout-grid grid-builder">
    <div class="col-stack"><CoreSystems /></div>
    <div class="col-stack"><ComponentCart /></div>
    <div class="col-stack"><ShipStats /></div>
  </div>
</div>