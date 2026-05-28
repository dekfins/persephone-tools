<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);

  async function adjustHP(amount: number) {
    if (!char) return;
    const newHP = Math.max(0, Math.min(char.max_hp, char.hp + amount));
    if (newHP !== char.hp) {
      // Assuming you will add updateHP to dbState similar to updateRads
      await dbState.updateHP(char.id, newHP);
    }
  }

  async function adjustRads(amount: number) {
    if (!char) return;
    const newRads = Math.max(0, Math.min(char.max_rads, char.rads + amount));
    if (newRads !== char.rads) {
      await dbState.updateRads(char.id, newRads);
    }
  }
</script>

<TerminalPanel title="VITALS" extraClass="player-panel">
  {#if char}
    <div class="input-row align-center">
      <div class="flex-1">
        <label for="hp" class="sel-label">HIT POINTS</label>
        <div class="value-display">{char.hp}/{char.max_hp}</div>
      </div>
      <div class="controls flex-1">
        <button class="btn-action" onclick={() => adjustHP(-1)}>-1</button>
        <button class="btn-action" onclick={() => adjustHP(1)}>+1</button>
      </div>
    </div>

    <div class="input-row align-center mt-1">
      <div class="flex-1">
        <label for="rads" class="sel-label">RADS</label>
        <div class="value-display">{char.rads}/{char.max_rads}</div>
      </div>
      <div class="controls flex-1">
        <button class="btn-action" onclick={() => adjustRads(-1)}>-1</button>
        <button class="btn-action" onclick={() => adjustRads(1)}>+1</button>
      </div>
    </div>
  {/if}
</TerminalPanel>

<style>
  .align-center {
    align-items: center;
  }
  .mt-1 {
    margin-top: 1.5rem;
  }
  .value-display {
    color: var(--accent-amber);
    font-size: 1.2rem;
    font-weight: bold;
    font-family: var(--font-terminal, monospace);
  }
  .controls {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .btn-action {
    padding: 0.4rem 0.8rem;
    min-width: 40px;
  }
</style>