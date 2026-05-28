<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toastState } from '../../lib/states/toastState.svelte.ts';

  import ShipLogisticsPanel from './ShipLogisticsPanel.svelte';
  import CargoSpawnerPanel from './ItemSpawnerPanel.svelte';
  import ShipOverridePanel from './ShipOverridePanel.svelte';
  import SystemDamagePanel from './SystemDamagePanel.svelte';
  import CharacterEditorPanel from './CharacterEditorPanel.svelte';
  import WorldControlPanel from './WorldControlPanel.svelte';
</script>

{#if toastState.show}
  <div class="terminal-toast gm-toast" transition:fly={{ x: 200, duration: 300 }}>
    <span style="opacity: 0.7; font-size: 0.8em;">[ GM TOOLS ]</span><br/>
    {toastState.message}
  </div>
{/if}

<div class="gm-grid">
  <div class="col-stack">
    <ShipLogisticsPanel />
    <CargoSpawnerPanel />
    <WorldControlPanel />
  </div>

  <div class="col-stack">
    <ShipOverridePanel />
    <SystemDamagePanel />
  </div>

  <div class="col-stack">
    <CharacterEditorPanel />
  </div>
</div>

<style>
.terminal-toast.gm-toast {
    position: fixed;
    top: 80px; 
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid var(--accent-amber);
    color: var(--accent-amber);
    padding: 1rem 1.5rem;
    font-family: var(--font-terminal, monospace);
    font-size: 0.9rem;
    z-index: 9999;
    text-align: right;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
    pointer-events: none; 
  }

  /* Strip native browser number spinners to make them look like text inputs */
  :global(input[type=number]::-webkit-inner-spin-button), 
  :global(input[type=number]::-webkit-outer-spin-button) { 
    -webkit-appearance: none; 
    margin: 0; 
  }
  :global(input[type=number]) {
    -moz-appearance: textfield; /* Firefox */
    appearance: textfield;
  }

  /* --- NEW: Force Text & Number inputs to perfectly match TerminalSelect --- */
  :global(input.terminal-input) {
    background-color: var(--bg-void);
    color: var(--accent-amber);
    border: 1px solid rgba(255, 255, 255, 0.1); /* Matches your subtle border */
    padding: 0.75rem;
    font-size: 0.8rem;
    font-family: var(--font-terminal, monospace);
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: all 0.2s;
  }

  :global(input.terminal-input:focus) {
    border-color: var(--accent-amber);
    background-color: rgba(245, 158, 11, 0.05);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
  }
  
  /* Make placeholders match the dim terminal text */
  :global(input.terminal-input::placeholder) {
    color: var(--text-dim);
    opacity: 0.7;
    text-transform: uppercase;
  }

  .gm-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  :global(.input-group) {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  :global(.input-group label) {
    font-size: 0.8rem;
    color: var(--text-dim);
    margin-bottom: 0.3rem;
    font-family: var(--font-terminal);
  }
  :global(.input-row) {
    display: flex;
    gap: 1rem;
    align-items: stretch;
    margin-bottom: 1rem;
  }
  .col-stack {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* --- UTILITY CLASSES --- */
  :global(.flex-1) { flex: 1; }
  :global(.flex-2) { flex: 2; }
  :global(.no-margin) { margin: 0; }
  :global(.mb-1) { margin-bottom: 1rem; }
  :global(.sel-label) { font-size: 0.8rem; }
  
  :global(.btn-full-cyan) {
    width: 100%;
    border-color: var(--ui-cyan, #00aacc);
  }
  :global(.btn-full-cyan:hover) {
    background: var(--ui-cyan, #00aacc);
    color: var(--bg-void, #00aacc);
  }
  :global(.btn-full-amber) {
    width: 100%;
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }
  :global(.btn-full-amber:hover) {
    background: var(--accent-amber);
    border-color: var(--accent-amber);
    color: var(--bg-void)
  }
  :global(.btn-full-red) {
    width: 100%;
    border-color: var(--accent-red);
    color: var(--accent-red);
  }
  :global(.btn-full-red:hover) {
    background: var(--accent-red);
    border-color: var(--accent-red);
    color: var(--bg-void)
  }
</style>