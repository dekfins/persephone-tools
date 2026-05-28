<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import type { Attributes } from '../../lib/types';

  let char = $derived(dbState.activeCharacter);

  // SWN Standard Modifier Calculation
  function getMod(score: number): string {
    if (!score) return '+0';
    if (score <= 3) return '-2';
    if (score <= 7) return '-1';
    if (score <= 13) return '+0';
    if (score <= 17) return '+1';
    return '+2';
  }

  // Force strict order for standard TTRPG display
  const attrList: Array<keyof Attributes> = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  async function handleAttributeChange(attrKey: keyof Attributes, event: Event) {
    if (!char || !char.attributes) return;
    
    const input = event.target as HTMLInputElement;
    let newValue = parseInt(input.value, 10);
    
    // Hard-Sci-Fi Mechanics: Clamp stats between biological limits (3 and 18)
    if (isNaN(newValue)) newValue = 10;
    newValue = Math.max(3, Math.min(18, newValue));
    input.value = newValue.toString(); // Force UI to reflect clamped value if user types "99"

    // Construct the new nested JSONB object
    const updatedAttributes = { 
      ...char.attributes, 
      [attrKey]: newValue 
    };

    // Push via the centralized manager
    await dbState.updateCharacter(char.id, { attributes: updatedAttributes });
  }
</script>

<TerminalPanel title="ATTRIBUTES" extraClass="player-panel">
  {#if char && char.attributes}
    <div class="attr-grid">
      {#each attrList as attr}
        <div class="attr-card">
          <label for="attr-{attr}">{attr}</label>
          <div class="attr-controls">
            <input 
              id="attr-{attr}"
              type="number" 
              class="terminal-input attr-input" 
              value={char.attributes[attr]} 
              onchange={(e) => handleAttributeChange(attr, e)}
              min="3"
              max="18"
            />
            <div 
              class="mod-box" 
              class:positive={parseInt(getMod(char.attributes[attr])) > 0} 
              class:negative={parseInt(getMod(char.attributes[attr])) < 0}
            >
              {getMod(char.attributes[attr])}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .attr-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .attr-card {
    display: flex;
    flex-direction: column;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.75rem;
  }

  label {
    font-family: var(--font-terminal);
    color: var(--text-dim);
    font-size: 0.85rem;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
    text-align: center;
    letter-spacing: 0.1em;
  }

  .attr-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .attr-input {
    width: 100%;
    text-align: center;
    font-size: 1.2rem;
    font-weight: bold;
    padding: 0.25rem;
  }

  .mod-box {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-subtle);
    padding: 0.4rem 0.5rem;
    min-width: 2.5rem;
    text-align: center;
    font-weight: bold;
    color: var(--text-main);
    font-size: 1rem;
  }

  .mod-box.positive {
    color: var(--fighter-green);
    border-color: rgba(74, 222, 128, 0.3);
  }

  .mod-box.negative {
    color: var(--accent-red);
    border-color: rgba(239, 68, 68, 0.3);
  }
</style>