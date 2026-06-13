<script lang="ts">
  import { dbState } from '../lib/states/dbState.svelte';
  import PlayerDashboardPanels from '../components/player/PlayerDashboardPanels.svelte';

  let canViewPlayerDashboard = $derived(Boolean(dbState.activeCharacter) || dbState.isLocalCharacterPreview);
</script>

<div class="page-container">
  {#if canViewPlayerDashboard}
    <PlayerDashboardPanels />
  {:else}
    <div class="terminal-alert error" style="margin-top: 4rem;">
      ACCESS DENIED
    </div>
  {/if}
</div>
