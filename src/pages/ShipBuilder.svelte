<script lang="ts">
  import CoreSystems from '../components/ship-builder/CoreSystems.svelte';
  import ComponentCart from '../components/ship-builder/ComponentCart.svelte';
  import ShipStats from '../components/ship-builder/ShipStats.svelte';
</script>

<div class="page-container">
  <div class="layout-grid grid-builder">
    <div class="col-stack"><CoreSystems /></div>
    <div class="col-stack"><ComponentCart /></div>
    <div class="col-stack"><ShipStats /></div>
  </div>
</div>