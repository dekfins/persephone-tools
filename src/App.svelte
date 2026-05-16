<script lang="ts">
  import { Route } from 'tinro';
  import Navigation from './components/shared/Navigation.svelte';
  
  // Import your pages
  import ShipBuilder from './pages/ShipBuilder.svelte';
  import ShipCondition from './pages/ShipCondition.svelte';
</script>

<main class="main-content">
  <header>
    <Navigation />
  </header>

  <Route path="/" fallback>
    <ShipBuilder />
  </Route>

  <Route path="/condition">
    <ShipCondition />
  </Route>
</main>

<style>
  .main-content {
    padding-top: 80px; 
    padding-left: 2rem;
    padding-right: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
</style>