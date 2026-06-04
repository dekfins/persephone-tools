<script lang="ts">
  import foci from '../../data/character/foci.json';
  import { getHighestFocusLevels } from '../../lib/characterMechanics';
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { Foci, FocusDefinition, FocusDefinitions, FocusGrantEntry, FocusLevel } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  type OwnedFocus = {
    focus: Foci;
    level: FocusLevel;
    definition: FocusDefinition;
  };

  const FOCI = foci as FocusDefinitions;

  let char = $derived(dbState.activeCharacter);
  let expandedFocus = $state<Foci | null>(null);
  let ownedFoci = $derived.by((): OwnedFocus[] => {
    if (!char) return [];
    const highestLevels = getHighestFocusLevels(char.foci);
    return Object.entries(highestLevels)
      .map(([focus, level]) => ({
        focus: focus as Foci,
        level: level as FocusLevel,
        definition: FOCI[focus as Foci]
      }))
      .filter((entry) => Boolean(entry.definition));
  });

  function formatGrant(entry: FocusGrantEntry | undefined) {
    if (!entry) return 'NONE';
    if (entry.type === 'skill') return entry.value.toUpperCase();
    return entry.value.toUpperCase();
  }
</script>

<TerminalPanel title="FOCI" extraClass="player-panel">
  {#if char}
    {#if ownedFoci.length > 0}
      <div class="focus-list">
        {#each ownedFoci as entry}
          {@const expanded = expandedFocus === entry.focus}
          <div class="focus-row" class:expanded>
            <button
              class="focus-toggle"
              type="button"
              aria-expanded={expanded}
              onclick={() => expandedFocus = expanded ? null : entry.focus}
            >
              <span>{entry.focus.toUpperCase()}</span>
              <strong>LVL {entry.level}</strong>
            </button>

            {#if expanded}
              <div class="focus-detail">
                <p>{entry.definition.description}</p>
                <div class="detail-row">
                  <span>BONUS SKILL</span>
                  <strong>{formatGrant(entry.definition.bonusSkill)}</strong>
                </div>
                <div class="level-row owned">
                  <span>LEVEL 1 OWNED</span>
                  <p>{entry.definition.level1}</p>
                </div>
                <div class="level-row" class:owned={entry.level >= 2}>
                  <span>LEVEL 2 {entry.level >= 2 ? 'OWNED' : 'LOCKED'}</span>
                  <p>{entry.definition.level2}</p>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="terminal-alert">NO FOCI RECORDED</div>
    {/if}
  {:else}
    <div class="terminal-alert">AWAITING FOCI DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .focus-list {
    display: grid;
    gap: 0.5rem;
  }

  .focus-row {
    display: grid;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .focus-row.expanded {
    border-color: var(--accent-amber);
  }

  .focus-toggle {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    background: transparent;
    border: 0;
    color: var(--text-main);
    padding: 0.6rem;
    font-family: var(--font-terminal);
    text-align: left;
    cursor: pointer;
  }

  .focus-toggle span,
  .detail-row span,
  .level-row span {
    color: var(--text-dim);
    font-size: 0.72rem;
  }

  .focus-toggle strong,
  .detail-row strong {
    color: var(--accent-amber);
  }

  .focus-detail {
    display: grid;
    gap: 0.55rem;
    border-top: var(--border-subtle);
    padding: 0.65rem;
  }

  .detail-row,
  .level-row {
    display: grid;
    gap: 0.25rem;
    border: var(--border-subtle);
    padding: 0.55rem;
  }

  .level-row {
    opacity: 0.55;
  }

  .level-row.owned {
    opacity: 1;
  }

  p {
    margin: 0;
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.45;
  }
</style>
