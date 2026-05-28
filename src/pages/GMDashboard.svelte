<script lang="ts">
  import { dbState } from '../lib/states/dbState.svelte';
  import GMDashboardPanel from '../components/gm/GMDashboardPanels.svelte';
  import '../styles/layout.css';
</script>

<div class="page-container">
  {#if dbState.activeCharacter?.role === 'GM'}
    <GMDashboardPanel />
  {:else}
    <div class="terminal-alert error" style="margin-top: 4rem;">
      ACCESS DENIED
    </div>
  {/if}
</div>