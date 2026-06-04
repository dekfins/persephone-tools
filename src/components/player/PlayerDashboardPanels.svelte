<script lang="ts">
  import IdentityPanel from './IdentityPanel.svelte';
  import VitalsPanel from './PlayerVitalsPanel.svelte';
  import AttributesPanel from './AttributesPanel.svelte';
  import SkillsPanel from './SkillsPanel.svelte';
  import ConditionsPanel from './ConditionsPanel.svelte';
  import SavingThrowsPanel from './SavingThrowsPanel.svelte';
  import ClassAbilitiesPanel from './ClassAbilitiesPanel.svelte';
  import FociPanel from './FociPanel.svelte';
  import PersonalLoadoutSummaryPanel from './PersonalLoadoutSummaryPanel.svelte';
  import CharacterArchiveImportPanel from './CharacterArchiveImportPanel.svelte';
</script>

<div class="player-grid">
  <div class="col-stack">
    <CharacterArchiveImportPanel />
    <IdentityPanel />
    <VitalsPanel />
    <ConditionsPanel />
  </div>

  <div class="col-stack">
    <AttributesPanel />
    <SavingThrowsPanel />
    <ClassAbilitiesPanel />
  </div>

  <div class="col-stack">
    <SkillsPanel />
    <FociPanel />
    <PersonalLoadoutSummaryPanel />
  </div>
</div>

<style>
  .player-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  .col-stack {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  @media (max-width: 1100px) {
    .player-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
