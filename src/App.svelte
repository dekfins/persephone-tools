<script lang="ts">
  import { Route, router } from 'tinro';
  import { fly } from 'svelte/transition';
  import Navigation from './components/shared/NavigationPanel.svelte';
  import CampaignLogPanel from './components/campaign/CampaignLogPanel.svelte';
  
  // Import your pages
  import Login from './pages/Login.svelte';
  import Home from './pages/Home.svelte';
  import Invite from './pages/Invite.svelte';
  import CharacterCreator from './pages/CharacterCreator.svelte';
  import PlayerDashboard from './pages/PlayerDashboard.svelte';
  import ShipBuilder from './pages/ShipBuilder.svelte';
  import ShipCondition from './pages/ShipCondition.svelte';
  import Inventory from './pages/Inventory.svelte';
  import Navmap from './pages/NavmapPage.svelte';
  import Missions from './pages/Missions.svelte';
  import GMDashboard from './pages/GMDashboard.svelte';
  import Settings from './pages/Settings.svelte'
  
  import { onMount } from 'svelte';
  import { shipState } from './lib/states/shipState.svelte';
  import { crewState } from './lib/states/crewState.svelte';
  import { dbState } from './lib/states/dbState.svelte';
  import { authState } from './lib/states/authState.svelte';
  
  let showToast = $state(false);
  let isHydrated = $state(false); // The gatekeeper
  let showCampaignLog = $derived(authState.isSignedIn && Boolean(dbState.activeCampaignId) && $router?.path !== '/login');

  onMount(async () => {
    const savedSession = localStorage.getItem('DEIMOS_ACTIVE_SESSION');
    if (savedSession) {
      try {
        const payload = JSON.parse(savedSession);
        
        if (payload.blueprint) {
          shipState.blueprint.name = payload.blueprint.name;
          shipState.blueprint.hull = payload.blueprint.hull;
          shipState.blueprint.reactor = payload.blueprint.reactor;
          shipState.blueprint.engine = payload.blueprint.engine;
          shipState.blueprint.components = payload.blueprint.components;
          
          shipState.vitals.currentHealth = payload.vitals.currentHealth;
          shipState.vitals.currentRI = payload.vitals.currentRI;
          shipState.vitals.activeConditions = payload.vitals.activeConditions;
          
          shipState.propulsion.activeFuel = payload.propulsion.activeFuel;
          shipState.propulsion.activeMode = payload.propulsion.activeMode;
          shipState.propulsion.currentFuel = payload.propulsion.currentFuel;
        }

        if (payload.crewState) {
          crewState.shipCredits = payload.crewState.shipCredits ?? 5000;
          crewState.kibbleDays = payload.crewState.kibbleDays ?? 30;
          crewState.cargo = payload.crewState.cargo ?? [];
          if (payload.crewState.crew) crewState.crew = payload.crewState.crew;
        }

        showToast = true;
        setTimeout(() => showToast = false, 4000);
      } catch (e) {
        console.error("DEIMOS: Save file corrupted. Starting with factory hull.");
      }
    }
    
    isHydrated = true;

    await authState.initialize();
  });

  $effect(() => {
    if (authState.isInitializing) return;

    const currentPath = $router?.path ?? '/';
    const isInvitePath = currentPath.startsWith('/invite/');
    const hasPendingInvite = Boolean(localStorage.getItem('DEIMOS_PENDING_INVITE_CODE'));

    if (!authState.isSignedIn && currentPath !== '/login' && !isInvitePath) {
      router.goto('/login');
      return;
    }

    if (authState.isSignedIn && hasPendingInvite && !isInvitePath) {
      router.goto(`/invite/${encodeURIComponent(localStorage.getItem('DEIMOS_PENDING_INVITE_CODE') ?? '')}`);
      return;
    }

    if (authState.isSignedIn && (currentPath === '/' || currentPath === '/login') && !hasPendingInvite) {
      router.goto('/home');
    }
  });

  $effect(() => {
    if (!isHydrated) return; 

    const sessionPayload = {
      blueprint: {
        name: shipState.blueprint.name,
        hull: shipState.blueprint.hull,
        reactor: shipState.blueprint.reactor,
        engine: shipState.blueprint.engine,
        components: shipState.blueprint.components,
      },
      vitals: {
        currentHealth: shipState.vitals.currentHealth,
        currentRI: shipState.vitals.currentRI,
        activeConditions: shipState.vitals.activeConditions,
      },
      propulsion: {
        activeFuel: shipState.propulsion.activeFuel,
        activeMode: shipState.propulsion.activeMode,
        currentFuel: shipState.propulsion.currentFuel,
      },
      crewState: {
        shipCredits: crewState.shipCredits,
        kibbleDays: crewState.kibbleDays,
        cargo: crewState.cargo,
        crew: crewState.crew
      }
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

  <Route path="/login">
    <Login />
  </Route>

  <Route path="/invite/:code">
    <Invite />
  </Route>

  <Route path="/home" fallback>
    <Home />
  </Route>

  <Route path="/overview">
    <PlayerDashboard />
  </Route>

  <Route path="/character-creator">
    <CharacterCreator />
  </Route>

  <Route path="/ship-builder">
    <ShipBuilder />
  </Route>

  <Route path="/ship-condition">
    <ShipCondition />
  </Route>

  <Route path="/inventory">
    <Inventory />
  </Route>

  <Route path="/navmap">
    <Navmap />
  </Route>

  <Route path="/missions">
    <Missions />
  </Route>

  <Route path="/gm">
    <GMDashboard />
  </Route>

  <Route path="/settings">
    <Settings />
  </Route>

  {#if showCampaignLog}
    <CampaignLogPanel />
  {/if}
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
