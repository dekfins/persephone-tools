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
  let showBootScreen = $derived(!isHydrated || authState.isInitializing);
  let bootStatus = $derived(!isHydrated ? 'RESTORING LOCAL SESSION' : 'SYNCING CREW DATA');

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
  {#if showBootScreen}
    <section class="boot-screen" aria-live="polite" aria-busy="true">
      <div class="boot-frame">
        <span class="boot-kicker">DEIMOS CREW TERMINAL</span>
        <h1>INITIALIZING</h1>
        <div class="boot-scanline" aria-hidden="true"></div>
        <div class="boot-status">
          <span>{bootStatus}</span>
          <span class="boot-dots" aria-hidden="true"></span>
        </div>
      </div>
    </section>
  {:else}
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

    <Route path="/home">
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

    <Route fallback redirect="/home" />

    {#if showCampaignLog}
      <CampaignLogPanel />
    {/if}
  {/if}
</main>

<style>
  .main-content {
    padding-top: 80px; /* Keeps space clear for your fixed navbar */
  }

  .boot-screen {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    padding: 2rem;
    background:
      linear-gradient(rgba(0, 170, 204, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 170, 204, 0.035) 1px, transparent 1px),
      var(--bg-void);
    background-size: 42px 42px;
    font-family: var(--font-terminal);
  }

  .boot-frame {
    width: min(30rem, 100%);
    display: grid;
    gap: 1rem;
    padding: 1.4rem;
    background: rgba(20, 20, 23, 0.92);
    border: var(--border-subtle);
    box-shadow: 0 0 28px rgba(0, 170, 204, 0.08);
  }

  .boot-kicker {
    color: var(--text-dim);
    font-size: 0.75rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .boot-frame h1 {
    color: var(--accent-amber);
    font-size: clamp(1.6rem, 8vw, 3rem);
    line-height: 1;
  }

  .boot-scanline {
    position: relative;
    height: 0.45rem;
    overflow: hidden;
    background: var(--bg-void);
    border: var(--border-subtle);
  }

  .boot-scanline::before {
    content: "";
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, var(--ui-cyan), transparent);
    animation: boot-scan 1.15s linear infinite;
  }

  .boot-status {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    color: var(--ui-cyan);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .boot-dots::after {
    content: "";
    animation: boot-dots 1.2s steps(4, end) infinite;
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

  @keyframes boot-scan {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(250%);
    }
  }

  @keyframes boot-dots {
    0% {
      content: "";
    }
    25% {
      content: ".";
    }
    50% {
      content: "..";
    }
    75%,
    100% {
      content: "...";
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .boot-scanline::before,
    .boot-dots::after {
      animation: none;
    }

    .boot-scanline::before {
      transform: none;
      width: 100%;
      opacity: 0.35;
    }

    .boot-dots::after {
      content: "...";
    }
  }

</style>
