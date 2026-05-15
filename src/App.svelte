<script lang="ts">
  import { Route } from 'tinro';
  import Navigation from './components/Navigation.svelte';
  
  // Import your pages
  import ShipBuilder from './pages/ShipBuilder.svelte';
  import ShipCondition from './pages/ShipCondition.svelte';
</script>

<main class="container">
  <header>
    <h1 class="terminal-prompt">DEIMOS</h1>
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
  /* Ensure the container takes up the full screen */
  .container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: 20px;
  }
</style>