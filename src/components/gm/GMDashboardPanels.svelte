<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toastState } from '../../lib/states/toastState.svelte.ts';

  import ShipLogisticsPanel from './ShipLogisticsPanel.svelte';
  import CargoSpawnerPanel from './ItemSpawnerPanel.svelte';
  import ShipOverridePanel from './ShipOverridePanel.svelte';
  import SystemDamagePanel from './SystemDamagePanel.svelte';
  import CharacterEditorPanel from './CharacterEditorPanel.svelte';
  import WorldControlPanel from './WorldControlPanel.svelte';
  import NpcSummaryPanel from './NpcSummaryPanel.svelte';
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
    <WorldControlPanel />
  </div>

  <div class="col-stack">
    <ShipOverridePanel />
    <CharacterEditorPanel />
    <NpcSummaryPanel />
  </div>

  <div class="col-stack">
    <CargoSpawnerPanel />
    <SystemDamagePanel />
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

  .gm-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr);
    gap: 2rem;
  }

  .col-stack {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
</style>
