<script lang="ts">
  import { shipState } from '../../lib/states/shipState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  
  // Create local state instance for this component
  const localState = shipState;
</script>

<TerminalPanel title="ACTIVE SHIP CONDITIONS" extraClass="span-full">
  <div class="conditions-list">
    {#if localState.vitals.activeConditions.length === 0}
      <div class="dim-message">
        SHIP OPERATING NOMINALLY. NO ACTIVE DEBUFFS.
      </div>
    {:else}
      {#each localState.vitals.activeConditions as cond}
        <div class="condition-card">
          <div class="cond-header">
            <h4 class="error">{cond.name} [DC {cond.fixDC}]</h4>
            <div class="cond-timer">
              <span>SEGMENTS ACTIVE:</span>
              <span>{cond.segmentsActive}</span>
            </div>
          </div>
          <p class="cond-effect">{cond.effect}</p>
        </div>
      {/each}
    {/if}
  </div>
</TerminalPanel>

<style>
  .error {
    color: var(--accent-red);
  }

  .conditions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 500px; 
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .condition-card {
    padding: 1rem;
    background: rgba(255, 0, 0, 0.05);
    border: 1px solid var(--accent-red);
    box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.1);
  }

  .cond-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .cond-header h4 {
    margin: 0;
    font-size: 1.1rem;
    text-transform: uppercase;
  }

  .cond-effect {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-main);
    line-height: 1.4;
  }

  .cond-timer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--accent-amber);
    background: transparent;
    padding: 0.3rem 0.6rem;
  }

  /* Custom Scrollbar for the list */
  .conditions-list::-webkit-scrollbar {
    width: 6px;
  }
  .conditions-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-left: 1px dashed var(--border-subtle, #333);
  }
  .conditions-list::-webkit-scrollbar-thumb {
    background: var(--accent-red);
    border-radius: 2px;
  }
</style>