<script lang="ts">
  import { getClassAbility } from '../../lib/character/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let ability = $derived(char ? getClassAbility(char.character_class) : null);
</script>

<TerminalPanel title="CLASS ABILITIES" extraClass="player-panel">
  {#if char && ability}
    <section class="ability-box" aria-label={`${ability.label} class abilities`}>
      <div class="ability-rules">
        {#each ability.rules as rule}
          <p>{rule}</p>
        {/each}
      </div>
    </section>
  {:else}
    <div class="terminal-alert">AWAITING CLASS DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .ability-box {
    display: grid;
    gap: 0.7rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.75rem;
    font-family: var(--font-terminal);
  }

  .ability-rules {
    display: grid;
    gap: 0.45rem;
  }

  .ability-rules p {
    margin: 0;
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .ability-rules p::before {
    content: '> ';
    color: var(--accent-amber);
  }
</style>
