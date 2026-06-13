<script lang="ts">
  import backgrounds from '../../data/character/backgrounds.json';
  import { BACKGROUND_CHOICE_LABELS } from '../../lib/character/characterConstants';
  import { dbState } from '../../lib/states/dbState.svelte';
  import type {
    BackgroundDefinitions,
    BackgroundProgressMode,
    BackgroundRuleEntry
  } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  const BACKGROUNDS = backgrounds as unknown as BackgroundDefinitions;

  let char = $derived(dbState.activeCharacter);
  let background = $derived(char ? BACKGROUNDS[char.background] : null);
  let progress = $derived(
    char && char.background_progress?.background === char.background ? char.background_progress : null
  );
  let choices = $derived(progress?.choices ?? []);
  let progressMismatch = $derived(
    Boolean(char?.background_progress?.background && char.background_progress.background !== char.background)
  );

  function formatEntry(entry: BackgroundRuleEntry) {
    if (entry.type === 'skill') return `${entry.value}-0/+1`;
    if (entry.type === 'special') return BACKGROUND_CHOICE_LABELS[entry.value];
    return `+${entry.bonus} ${entry.category.toUpperCase()} STAT`;
  }

  function modeLabel(value: BackgroundProgressMode | undefined) {
    if (value === 'quick_skills') return 'QUICK SKILLS';
    if (value === 'roll_tables') return 'ROLL ON TABLES';
    if (value === 'pick_learning') return 'PICK FROM LEARNING';
    return 'NOT SELECTED';
  }

  function grantDetail(resultTarget: string, before: number, after: number) {
    return `${resultTarget.toUpperCase()} ${before} > ${after}`;
  }
</script>

<TerminalPanel title="BACKGROUND RECORD" extraClass="player-panel">
  {#if char && background}
    <div class="background-header">
      <div class="stat-row">
        <span>BACKGROUND</span>
        <strong>{background.name.toUpperCase()}</strong>
      </div>
      <div class="stat-row">
        <span>MODE</span>
        <strong>{modeLabel(progress?.mode)}</strong>
      </div>
      <div class="stat-row">
        <span>STATUS</span>
        <strong>{progress?.complete ? 'COMPLETE' : 'OPEN'}</strong>
      </div>
      {#if progressMismatch}
        <div class="terminal-alert error">BACKGROUND CHANGED: RECORDED PROGRESS DOES NOT MATCH</div>
      {/if}
      <p>{background.description}</p>
    </div>

    <div class="choice-log">
      <h4>CHOICES MADE</h4>
      {#if choices.length > 0}
        {#each choices as grant}
          <div class="choice-row">
            <span class="choice-source">{grant.source.replace('_', ' ')}</span>
            <span>{grant.label || formatEntry(grant.entry)}</span>
            <span class="choice-result">
              {grantDetail(grant.result.target, grant.result.before, grant.result.after)}
            </span>
          </div>
        {/each}
      {:else}
        <div class="terminal-alert">NO BACKGROUND CHOICES RECORDED</div>
      {/if}
    </div>
  {:else}
    <div class="terminal-alert">AWAITING BACKGROUND DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .background-header,
  .choice-log {
    display: grid;
    gap: 0.6rem;
  }

  .choice-log {
    margin-top: 0.85rem;
  }

  .stat-row,
  .choice-row,
  p {
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.55rem;
    font-size: 0.78rem;
  }

  .stat-row span,
  .choice-source,
  h4 {
    color: var(--text-dim);
  }

  .stat-row strong,
  .choice-result {
    color: var(--accent-amber);
    text-align: right;
  }

  p {
    margin: 0;
    padding: 0.65rem;
    color: var(--text-main);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  h4 {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }

  .choice-row {
    display: grid;
    grid-template-columns: 5.5rem 1fr;
    gap: 0.35rem 0.65rem;
    padding: 0.55rem;
    color: var(--text-main);
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  .choice-result {
    grid-column: 2;
  }
</style>
