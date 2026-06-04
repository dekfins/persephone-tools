<script lang="ts">
  import { active, router } from 'tinro';
  import { dbState } from '../../lib/states/dbState.svelte';

  let isProfileExpanded = $state(false);
  let isOverviewActive = $derived(!$router?.path || $router.path === '/overview' || $router.path === '/');
  let activeProfile = $derived(dbState.activeCharacter);
</script>

<header class="top-bar">
  <div class="bar-content">
    <div class="brand">DEIMOS</div>
    
    <nav class="navbar">
      <a href="/overview" class="nav-link" class:active={isOverviewActive}>OVERVIEW</a>
      <a href="/character-creator" class="nav-link" use:active>CREATOR</a>
      <a href="/ship-builder" class="nav-link" exact use:active>SHIP BUILDER</a>
      <a href="/ship-condition" class="nav-link" use:active>SHIP CONDITION</a>
      <a href="/inventory" class="nav-link" use:active>INVENTORY</a>
      <a href="/navmap" class="nav-link" use:active>NAVMAP</a>
      {#if dbState.activeCharacter?.role === 'GM'}
        <a href="/missions" class="nav-link" use:active>JOB BOARD</a> 
        <a href="/gm" class="nav-link" use:active>GM TOOLS</a>
      {/if}
      <a href="/settings" class="nav-link" use:active>SETTINGS</a>
    </nav>
  </div>
</header>

<div class="floating-auth">
  <button
    type="button"
    class="profile-chip"
    aria-expanded={isProfileExpanded}
    aria-controls="profile-selector"
    onclick={() => isProfileExpanded = !isProfileExpanded}
  >
    <span class="profile-kicker">PROFILE</span>
    <span class="profile-name">{activeProfile?.name ?? 'NO ACTIVE USER'}</span>
    <span class="profile-role">{activeProfile?.role ?? 'UNSET'}</span>
  </button>

  {#if isProfileExpanded}
    <div class="auth-content">
      <span class="auth-label">ACTIVE USER</span>
      <select 
        id="profile-selector"
        bind:value={dbState.activeUserId} 
        class="auth-select"
        onchange={() => isProfileExpanded = false}
      >
        {#each dbState.characters as char}
          <option value={char.id}>{char.name} ({char.role})</option>
        {/each}
      </select>
    </div>
  {/if}
</div>

<style>
  /* --- NAVBAR STYLES --- */
  .top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    background: var(--bg-void, #0b0e14);
    border-bottom: 1px solid var(--text-dim, #444);
    z-index: 1000; 
    padding: 0.7rem 2rem;
  }

  .bar-content {
    display: flex;
    align-items: baseline;
    gap: 3rem; 
    max-width: 1400px;
    margin: 0 auto;
  }

  .brand {
    color: var(--accent-amber, #f59e0b);
    font-size: 2rem;
    font-weight: bold;
    letter-spacing: 0.15em;
    padding-top: 0.5rem;
    padding-left: 2rem;
  }

  .navbar {
    display: flex;
    gap: 2rem; 
  }

  .nav-link {
    color: var(--ui-cyan);
    text-decoration: none;
    padding: 0.5rem 0;
    letter-spacing: 0.05em;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .nav-link:hover {
    color: var(--ui-bright);
  }

  :global(.active) {
    color: var(--accent-amber) !important;
  }

  /* --- FLOATING AUTH STYLES --- */
  .floating-auth {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 1000;
    width: min(240px, calc(100vw - 2rem));
    font-family: var(--font-terminal);
  }

  .profile-chip {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.1rem 0.75rem;
    width: 100%;
    padding: 0.45rem 0.65rem;
    background: color-mix(in srgb, var(--bg-panel) 82%, transparent);
    border: var(--border-subtle);
    color: var(--text-main);
    font-family: var(--font-terminal);
    text-align: left;
    cursor: pointer;
    opacity: 0.82;
    transition: border-color 0.2s ease, opacity 0.2s ease, background 0.2s ease;
  }

  .profile-chip:hover,
  .profile-chip:focus-visible,
  .profile-chip[aria-expanded="true"] {
    background: var(--bg-panel);
    border-color: var(--ui-cyan);
    opacity: 1;
    outline: none;
  }

  .profile-kicker {
    grid-column: 1 / -1;
    color: var(--text-dim);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
  }

  .profile-name {
    min-width: 0;
    overflow: hidden;
    color: var(--ui-cyan);
    font-size: 0.82rem;
    font-weight: bold;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .profile-role {
    align-self: center;
    color: var(--accent-amber);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
  }

  .auth-content {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.35rem;
    padding: 0.5rem;
    background: var(--bg-panel);
    border: var(--border-subtle);
  }

  .auth-label {
    color: var(--text-dim);
    font-size: 0.65rem;
    letter-spacing: 0.05em;
  }

  .auth-select {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    color: var(--ui-cyan);
    border: 1px solid var(--ui-cyan);
    padding: 0.45rem;
    font-family: var(--font-terminal);
    font-size: 0.8rem;
    cursor: pointer;
  }
  
  .auth-select:focus {
    outline: none;
    border-color: var(--ui-bright);
    box-shadow: 0 0 5px rgba(6, 182, 212, 0.3);
  }
</style>
