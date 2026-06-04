<script lang="ts">
  import { getSavingThrows } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let saves = $derived(char ? dbState.localCharacterCreation?.saves ?? getSavingThrows(char.attributes) : null);
</script>

<TerminalPanel title="SAVING THROWS" extraClass="player-panel">
  {#if saves}
    <div class="save-grid">
      <div class="save-card">
        <span>PHYSICAL</span>
        <strong>{saves.physical}+</strong>
        <em>STR / CON</em>
      </div>
      <div class="save-card">
        <span>EVASION</span>
        <strong>{saves.evasion}+</strong>
        <em>INT / DEX</em>
      </div>
      <div class="save-card">
        <span>MENTAL</span>
        <strong>{saves.mental}+</strong>
        <em>WIS / CHA</em>
      </div>
    </div>
  {:else}
    <div class="terminal-alert">AWAITING SAVE DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .save-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .save-card {
    display: grid;
    gap: 0.25rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.7rem;
    font-family: var(--font-terminal);
    text-align: center;
  }

  span,
  em {
    color: var(--text-dim);
    font-size: 0.72rem;
    font-style: normal;
  }

  strong {
    color: var(--accent-amber);
    font-size: 1.2rem;
  }

  @media (max-width: 700px) {
    .save-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
