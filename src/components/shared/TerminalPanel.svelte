<script lang="ts">
  import type { Snippet } from 'svelte';

  let { 
    title, 
    children, 
    extraClass = '' 
  }: { 
    title?: string; 
    children: Snippet; 
    extraClass?: string; 
  } = $props();
</script>

<div class="terminal-card {extraClass}">
  {#if title}
    <h3>{title}</h3>
  {/if}
  
  {@render children()} 
</div>

<style>
  /* If you want the .btn-action and .terminal-alert classes to be available 
    inside ANY TerminalPanel across the whole app, you can declare them globally here.
  */
  /* In TerminalPanel.svelte */
  h3 {
    margin: 0 0 1rem 0; /* Add a little space below the title */
    color: var(--accent-amber);
    font-size: 1.2rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding-bottom: 0.5rem;
  }

  :global(.terminal-alert) {
    margin-top: 1rem;
    padding: 0.5rem;
    border: 1px solid var(--accent-amber);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
    background-color: var(--bg-void);
    color: var(--accent-amber);
    text-align: center;
    font-weight: bold;
  }

  :global(.terminal-alert.error) {
    border-color: var(--accent-red);
    color: var(--accent-red);
    animation: pulse 2s infinite;
  }

  :global(.btn-action) {
    background: transparent;
    color: var(--ui-cyan, #00aacc);
    border: 1px solid var(--ui-cyan, #00aacc);
    padding: 0.8rem 1rem;
    font-family: monospace;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  :global(.btn-action:hover) {
    background: var(--ui-cyan, #00aacc);
    color: var(--bg-dark, #0b0e14);
    border: 1px solid var(--ui-cyan, #00aacc);
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
</style>