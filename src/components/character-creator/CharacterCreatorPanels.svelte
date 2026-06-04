<script lang="ts">
  import CreatorAttributesPanel from './CreatorAttributesPanel.svelte';
  import CreatorBackgroundPanel from './CreatorBackgroundPanel.svelte';
  import CreatorClassPanel from './CreatorClassPanel.svelte';
  import CreatorEquipmentPanel from './CreatorEquipmentPanel.svelte';
  import CreatorFociPanel from './CreatorFociPanel.svelte';
  import CreatorIdentityPanel from './CreatorIdentityPanel.svelte';
  import CreatorReviewPanel from './CreatorReviewPanel.svelte';
  import CreatorSummaryPanel from './CreatorSummaryPanel.svelte';
  import CreatorVitalsPanel from './CreatorVitalsPanel.svelte';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
</script>

<div class="creator-layout">
  <div class="creator-shell">
    <div class="step-strip">
      {#each characterCreatorState.steps as step, index}
        <button
          class="step-button"
          class:active={step.key === characterCreatorState.activeStep}
          class:complete={characterCreatorState.isStepComplete(step.key)}
          onclick={() => characterCreatorState.setActiveStep(step.key)}
        >
          <span>{index + 1}</span>
          {step.label}
        </button>
      {/each}
    </div>

    <div class="creator-stage">
      {#if characterCreatorState.activeStep === 'identity'}
        <CreatorIdentityPanel />
      {:else if characterCreatorState.activeStep === 'attributes'}
        <CreatorAttributesPanel />
      {:else if characterCreatorState.activeStep === 'background'}
        <CreatorBackgroundPanel />
      {:else if characterCreatorState.activeStep === 'class'}
        <CreatorClassPanel />
      {:else if characterCreatorState.activeStep === 'foci'}
        <CreatorFociPanel />
      {:else if characterCreatorState.activeStep === 'vitals'}
        <CreatorVitalsPanel />
      {:else if characterCreatorState.activeStep === 'equipment'}
        <CreatorEquipmentPanel />
      {:else}
        <CreatorReviewPanel />
      {/if}
    </div>

    <div class="step-controls">
      <button
        class="btn-action"
        disabled={characterCreatorState.isFirstStep}
        onclick={() => characterCreatorState.previousStep()}
      >
        PREV
      </button>
      <button
        class="btn-action"
        disabled={characterCreatorState.isLastStep}
        onclick={() => characterCreatorState.nextStep()}
      >
        NEXT
      </button>
    </div>
  </div>

  <aside class="summary-column">
    <CreatorSummaryPanel />
  </aside>
  </div>

<style>
  .creator-layout {
    display: grid;
    grid-template-columns: minmax(0, 780px) 340px;
    gap: var(--layout-gap);
    align-items: start;
    justify-content: center;
    width: 100%;
  }

  .creator-shell {
    display: grid;
    gap: var(--layout-gap);
    width: 100%;
  }

  .summary-column {
    position: sticky;
    top: 96px;
  }

  .step-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .step-controls {
    display: grid;
    gap: 0.6rem;
  }

  .step-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .step-button {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.45rem;
    align-items: center;
    background: var(--bg-void);
    color: var(--text-dim);
    border: var(--border-subtle);
    padding: 0.65rem;
    font-family: var(--font-terminal);
    font-size: 0.72rem;
    text-align: left;
    cursor: pointer;
  }

  .step-button span {
    display: grid;
    place-items: center;
    width: 1.35rem;
    height: 1.35rem;
    border: var(--border-subtle);
    color: var(--text-main);
  }

  .step-button.active {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .step-button.complete span {
    color: var(--fighter-green);
    border-color: rgba(74, 222, 128, 0.45);
  }

  .creator-stage {
    min-height: 31rem;
  }

  .btn-action:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 1180px) {
    .creator-layout {
      grid-template-columns: minmax(0, 780px);
    }

    .summary-column {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .step-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
