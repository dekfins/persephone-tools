<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import type { Skill } from '../../lib/types';

  let char = $derived(dbState.activeCharacter);

  // Explicitly mapping the union type to an iterable array for the UI grid
  const ALL_SKILLS: Skill[] = [
    'Administer', 'Connect', 'Exert', 'Fix', 'Heal', 'Know',
    'Lead', 'Notice', 'Perform', 'Pilot', 'Program', 'Punch',
    'Shoot', 'Sneak', 'Stab', 'Survive', 'Talk', 'Trade', 'Work'
  ];

  async function adjustSkill(skill: Skill, delta: number) {
    if (!char) return;

    // Default to -1 if the skill isn't present in the JSONB record
    const currentLevel = char.skills?.[skill] ?? -1;
    
    // Clamp the skill level between untrained (-1) and master (4)
    const newLevel = Math.max(-1, Math.min(4, currentLevel + delta));

    if (currentLevel === newLevel) return;

    // Construct the new nested JSONB object
    const updatedSkills = { 
      ...(char.skills || {}), 
      [skill]: newLevel 
    };

    // Push via the centralized manager
    await dbState.updateCharacter(char.id, { skills: updatedSkills });
  }
</script>

<TerminalPanel title="VOCATIONAL SKILLS" extraClass="player-panel">
  {#if char}
    <div class="skills-grid">
      {#each ALL_SKILLS as skill}
        {@const level = char.skills?.[skill] ?? -1}
        <div class="skill-row" class:trained={level > -1}>
          <span class="skill-name">{skill.toUpperCase()}</span>
          <div class="skill-controls">
            <button class="btn-action btn-compact" onclick={() => adjustSkill(skill, -1)} disabled={level <= -1}>-</button>
            <span class="skill-level">{level}</span>
            <button class="btn-action btn-compact" onclick={() => adjustSkill(skill, 1)} disabled={level >= 4}>+</button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .skills-grid {
    display: grid;
    /* 2 columns handles 19 skills efficiently without making the list too long */
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem 1.5rem;
  }

  .skill-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
    border-bottom: 1px dashed var(--border-subtle);
    color: var(--text-dim);
    transition: color 0.2s;
  }

  /* Highlight skills the character has actively invested points into */
  .skill-row.trained {
    color: var(--text-main);
  }

  .skill-row.trained .skill-name {
    color: var(--accent-amber);
    font-weight: bold;
  }

  .skill-name {
    font-family: var(--font-terminal);
    font-size: 0.85rem;
    letter-spacing: 0.05em;
  }

  .skill-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .skill-level {
    font-family: var(--font-terminal);
    font-weight: bold;
    font-size: 1rem;
    width: 1.5rem;
    text-align: center;
  }

  /* Ensure the compact buttons from your widgets.css scale nicely here */
  button.btn-compact {
    padding: 0.1rem 0.4rem;
    font-size: 0.8rem;
    min-width: 1.5rem;
  }
</style>