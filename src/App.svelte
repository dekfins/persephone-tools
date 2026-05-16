<script lang="ts">
  import { Route } from 'tinro';
  import { fly } from 'svelte/transition';
  import Navigation from './components/shared/Navigation.svelte';
  
  // Import your pages
  import ShipBuilder from './pages/ShipBuilder.svelte';
  import ShipCondition from './pages/ShipCondition.svelte';
  import Navmap from './pages/NavmapPage.svelte';
  import Settings from './pages/Settings.svelte'
  
  import { onMount } from 'svelte';
  import { shipState } from './lib/shipState.svelte';
  
  let showToast = $state(false);
  let isHydrated = $state(false); // The gatekeeper

  onMount(() => {
    const savedSession = localStorage.getItem('DEIMOS_ACTIVE_SESSION');
    
    if (savedSession) {
      try {
        const payload = JSON.parse(savedSession);
        
        // 1. Rehydrate the reactive Svelte 5 class instance
        shipState.name = payload.name;
        shipState.hull = payload.hull;
        shipState.reactor = payload.reactor;
        shipState.engine = payload.engine; // Your custom setter handles the referencing perfectly!
        shipState.components = payload.components;
        shipState.currentHealth = payload.currentHealth;
        shipState.currentRI = payload.currentRI;
        shipState.activeConditions = payload.activeConditions || [];
        shipState.activeFuel = payload.activeFuel;
        shipState.activeMode = payload.activeMode;
        shipState.currentFuel = payload.currentFuel || {};

        // 2. Trigger the top-right notification
        showToast = true;
        setTimeout(() => showToast = false, 4000);
      } catch (e) {
        console.error("DEIMOS: Save file corrupted. Starting with factory hull.");
      }
    }
    
    // Unlock the autosave loop
    isHydrated = true; 
  });

  // 3. The Svelte 5 Autosave Tracker
  $effect(() => {
    if (!isHydrated) return; // Don't wipe the save before we load it!

    // Reading these properties automatically registers them as reactive dependencies
    const sessionPayload = {
      name: shipState.name,
      hull: shipState.hull,
      reactor: shipState.reactor,
      engine: shipState.engine,
      components: shipState.components,
      currentHealth: shipState.currentHealth,
      currentRI: shipState.currentRI,
      activeConditions: shipState.activeConditions,
      activeFuel: shipState.activeFuel,
      activeMode: shipState.activeMode,
      currentFuel: shipState.currentFuel
    };
    
    localStorage.setItem('DEIMOS_ACTIVE_SESSION', JSON.stringify(sessionPayload));
  });
</script>

<main class="main-content">
  {#if showToast}
    <div class="terminal-toast" transition:fly={{ x: 200, duration: 300 }}>
      <span style="opacity: 0.7; font-size: 0.8em;">[ SYSTEM NOTICE ]</span><br/>
      PREVIOUS SESSION RESTORED
    </div>
  {/if}

  <header>
    <Navigation />
  </header>

  <Route path="/" fallback>
    <ShipBuilder />
  </Route>

  <Route path="/condition">
    <ShipCondition />
  </Route>

  <Route path="/navmap">
    <Navmap />
  </Route>

  <Route path="/settings">
    <Settings />
  </Route>
</main>

<style>
  .main-content {
    padding-top: 80px; /* Keeps space clear for your fixed navbar */
  }

  .terminal-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid var(--ui-cyan, #06b6d4);
    color: var(--ui-cyan, #06b6d4);
    padding: 1rem 1.5rem;
    font-family: var(--font-terminal, monospace);
    font-size: 0.9rem;
    z-index: 9999;
    text-align: right;
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
  }
</style>