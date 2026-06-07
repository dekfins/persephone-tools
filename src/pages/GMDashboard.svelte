<script lang="ts">
  import { dbState } from '../lib/states/dbState.svelte';
  import GMDashboardPanel from '../components/gm/GMDashboardPanels.svelte';
</script>

<div class="page-container">
  {#if dbState.isGM}
    <GMDashboardPanel />
  {:else}
    <div class="terminal-alert error" style="margin-top: 4rem;">
      ACCESS DENIED
    </div>
  {/if}
</div>
