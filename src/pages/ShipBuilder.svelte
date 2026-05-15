<script lang="ts">
  import CoreSystems from '../components/CoreSystems.svelte';
  import ComponentCart from '../components/ComponentCart.svelte';
  import ShipStats from '../components/ShipStats.svelte';
</script>

<div class="grid">
  <section class="col-left"><CoreSystems /></section>
  <section class="col-middle"><ComponentCart /></section>
  <section class="col-right"><ShipStats /></section>
</div>