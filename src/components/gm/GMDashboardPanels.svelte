<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toastState } from '../../lib/states/toastState.svelte.ts';

  import ShipLogisticsPanel from './ShipLogisticsPanel.svelte';
  import CargoSpawnerPanel from './ItemSpawnerPanel.svelte';
  import SystemDamagePanel from './SystemDamagePanel.svelte';
  import CharacterEditorPanel from './CharacterEditorPanel.svelte';
  import WorldControlPanel from './WorldControlPanel.svelte';
  import NpcSummaryPanel from './NpcSummaryPanel.svelte';
  import TerminalMenuPanel, { type TerminalMenuEntry } from '../shared/TerminalMenuPanel.svelte';

  type GmToolId =
    | 'ship-logistics'
    | 'world-controls'
    | 'character-editor'
    | 'cargo-spawner'
    | 'system-damage'
    | 'npc-dossier';

  type GmToolEntry = TerminalMenuEntry & { id: GmToolId };

  const toolEntries: GmToolEntry[] = [
    {
      id: 'ship-logistics',
      label: 'SHIP LOGISTICS',
      description: 'Slush fund, kibble, hull, and reactor overrides.'
    },
    {
      id: 'world-controls',
      label: 'UNIVERSE CONTROLS',
      description: 'Timeline adjustment and forced translocation.'
    },
    {
      id: 'character-editor',
      label: 'CHARACTER EDITOR',
      description: 'Session-0 attributes and numeric player overrides.'
    },
    {
      id: 'cargo-spawner',
      label: 'CARGO SPAWNER',
      description: 'Spawn catalog or custom cargo.'
    },
    {
      id: 'system-damage',
      label: 'SYSTEM DAMAGE LOG',
      description: 'Inflict, advance, and resolve conditions.'
    },
    {
      id: 'npc-dossier',
      label: 'NPC DOSSIER',
      description: 'Review recorded NPC profiles.'
    }
  ];

  let activeTool = $state<GmToolId>('ship-logistics');

  function selectTool(entry: TerminalMenuEntry) {
    activeTool = entry.id as GmToolId;
  }
</script>

{#if toastState.show}
  <div class="terminal-toast gm-toast" transition:fly={{ x: 200, duration: 300 }}>
    <span style="opacity: 0.7; font-size: 0.8em;">[ GM TOOLS ]</span><br/>
    {toastState.message}
  </div>
{/if}

<div class="gm-tools-layout">
  <TerminalMenuPanel
    title="GM TOOL MENU"
    entries={toolEntries}
    activeId={activeTool}
    onSelect={selectTool}
    ariaLabel="GM tools"
  />

  <section class="gm-tool-detail" aria-live="polite">
    {#if activeTool === 'ship-logistics'}
      <ShipLogisticsPanel />
    {:else if activeTool === 'world-controls'}
      <WorldControlPanel />
    {:else if activeTool === 'character-editor'}
      <CharacterEditorPanel />
    {:else if activeTool === 'cargo-spawner'}
      <CargoSpawnerPanel />
    {:else if activeTool === 'system-damage'}
      <SystemDamagePanel />
    {:else if activeTool === 'npc-dossier'}
      <NpcSummaryPanel />
    {/if}
  </section>
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

  .gm-tools-layout {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr);
    gap: 2rem;
    align-items: start;
  }

  .gm-tool-detail {
    min-width: 0;
  }

  @media (max-width: 900px) {
    .gm-tools-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
