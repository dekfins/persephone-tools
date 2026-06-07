<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
</script>

<TerminalPanel title="NPC DOSSIER" extraClass="gm-panel">
  {#if dbState.npcCharacters.length === 0}
    <div class="terminal-alert">NO NPCS RECORDED</div>
  {:else}
    <div class="npc-list">
      {#each dbState.npcCharacters as npc}
        <div class="npc-row">
          <strong>{npc.name.toUpperCase()}</strong>
          <span>LVL {npc.level} {npc.character_class.toUpperCase()}</span>
          <em>{npc.heritage.toUpperCase()} {npc.background.toUpperCase()}</em>
        </div>
      {/each}
    </div>
  {/if}
</TerminalPanel>

<style>
  .npc-list {
    display: grid;
    gap: 0.65rem;
  }

  .npc-row {
    display: grid;
    gap: 0.25rem;
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .npc-row strong {
    color: var(--accent-amber);
  }

  .npc-row span,
  .npc-row em {
    color: var(--text-dim);
    font-size: 0.74rem;
    font-style: normal;
  }
</style>
