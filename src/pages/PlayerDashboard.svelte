<script lang="ts">
  import { dbState } from '../lib/states/dbState.svelte';
  import PlayerDashboardPanels from '../components/player/PlayerDashboardPanels.svelte';
  import '../styles/layout.css';
</script>

<div class="page-container">
  {#if dbState.activeCharacter?.role === 'PLAYER' || dbState.activeCharacter?.role === 'GM'}
    <PlayerDashboardPanels />
  {:else}
    <div class="terminal-alert error" style="margin-top: 4rem;">
      ACCESS DENIED: CREW AUTHORIZATION REQUIRED
    </div>
  {/if}
</div>