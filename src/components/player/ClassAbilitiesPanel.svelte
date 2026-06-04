<script lang="ts">
  import { getClassAbility } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let ability = $derived(char ? getClassAbility(char.character_class) : null);
</script>

<TerminalPanel title="CLASS ABILITIES" extraClass="player-panel">
  {#if char && ability}
    <div class="class-header">
      <span>{ability.role}</span>
      <strong>{ability.label}</strong>
    </div>

    <div class="feature-row">
      <span>CLASS FEATURE</span>
      <p>{ability.feature}</p>
    </div>

    <div class="feature-row">
      <span>HP IMPACT</span>
      <p>{ability.hpImpact}</p>
    </div>

    <div class="bullet-grid">
      {#each ability.bullets as bullet}
        <div>{bullet}</div>
      {/each}
    </div>
  {:else}
    <div class="terminal-alert">AWAITING CLASS DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .class-header,
  .feature-row,
  .bullet-grid div {
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .class-header {
    display: grid;
    gap: 0.25rem;
    padding: 0.65rem;
    margin-bottom: 0.65rem;
  }

  .feature-row {
    display: grid;
    gap: 0.3rem;
    padding: 0.65rem;
    margin-top: 0.5rem;
  }

  .bullet-grid {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.65rem;
  }

  .bullet-grid div {
    color: var(--text-main);
    font-size: 0.78rem;
    padding: 0.55rem;
  }

  span {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  strong {
    color: var(--accent-amber);
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.45;
  }
</style>
