<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import IdentityPanel from './IdentityPanel.svelte';
  import VitalsPanel from './PlayerVitalsPanel.svelte';
  import AttributesPanel from './AttributesPanel.svelte';
  import SkillsPanel from './SkillsPanel.svelte';
  import ConditionsPanel from './PlayerConditionsPanel.svelte';
  import SavingThrowsPanel from './SavingThrowsPanel.svelte';
  import ClassAbilitiesPanel from './ClassAbilitiesPanel.svelte';
  import CharacterNotesPanel from './CharacterNotesPanel.svelte';
  import FociPanel from './FociPanel.svelte';
  import PersonalLoadoutSummaryPanel from './PersonalLoadoutSummaryPanel.svelte';

  let hasLoadedCharacter = $derived(Boolean(dbState.activeCharacter));
</script>

<div class="player-grid" class:identity-only={!hasLoadedCharacter}>
  <div class="col-stack">
    <IdentityPanel />
    {#if hasLoadedCharacter}
      <VitalsPanel />
      <AttributesPanel />
      <SavingThrowsPanel />
      <ClassAbilitiesPanel />
      <CharacterNotesPanel />
    {/if}
  </div>

  {#if hasLoadedCharacter}
    <div class="col-stack">
      <ConditionsPanel />
      <SkillsPanel />
      <FociPanel />
      <PersonalLoadoutSummaryPanel />
    </div>
  {/if}
</div>

<style>
  .player-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    gap: 2rem;
  }
  .col-stack {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .player-grid.identity-only {
    grid-template-columns: minmax(280px, 520px);
    justify-content: center;
  }

  @media (max-width: 1100px) {
    .player-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
