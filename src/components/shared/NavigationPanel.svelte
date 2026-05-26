<script lang="ts">
  import { active } from 'tinro';
  import { dbState } from '../../lib/dbState.svelte';
  import TerminalPanel from './TerminalPanel.svelte';
</script>

<header class="top-bar">
  <div class="bar-content">
    <div class="brand">DEIMOS</div>
    
    <nav class="navbar">
      <a href="/" class="nav-link" exact use:active>SHIP BUILDER</a>
      <a href="/condition" class="nav-link" use:active>SHIP CONDITION</a>
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
  <TerminalPanel title="PROFILE" extraClass="auth-panel">
    <div class="auth-content">
      <span class="auth-label">ACTIVE USER ID:</span>
      <select 
        bind:value={dbState.activeUserId} 
        class="auth-select"
      >
        {#each dbState.characters as char}
          <option value={char.id}>{char.name} ({char.role})</option>
        {/each}
      </select>
    </div>
  </TerminalPanel>
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
    bottom: 2rem;
    left: 2rem;
    z-index: 1000;
    width: 260px; /* Compact width for a side panel */
  }

  .auth-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .auth-label {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }

  .auth-select {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    color: var(--ui-cyan);
    border: 1px solid var(--ui-cyan);
    padding: 0.5rem;
    font-family: var(--font-terminal);
    font-size: 0.9rem;
    cursor: pointer;
  }
  
  .auth-select:focus {
    outline: none;
    border-color: var(--ui-bright);
    box-shadow: 0 0 5px rgba(6, 182, 212, 0.3);
  }
</style>