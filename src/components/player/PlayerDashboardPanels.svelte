<script lang="ts">
  import IdentityPanel from './IdentityPanel.svelte';
  import VitalsPanel from './PlayerVitalsPanel.svelte';
  import AttributesPanel from './AttributesPanel.svelte';
  // Future imports: AttributesPanel, SkillsPanel, etc.
</script>

<div class="player-grid">
  <div class="col-stack">
    <IdentityPanel />
    <VitalsPanel />
  </div>

  <div class="col-stack">
    <AttributesPanel />
  </div>

  <div class="col-stack"></div>
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
</style>