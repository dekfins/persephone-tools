<script lang="ts">
  import OrbitalMap from '../components/navmap/OrbitalMap.svelte';
  import DebriefPanel from '../components/missions/DebriefPanel.svelte';
</script>

<div class="page-container">
  <OrbitalMap />
  <DebriefPanel />
</div>



<style>
  .page-container {
    position: fixed; /* Detaches from normal page layout */
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10; /* High enough to cover the background, low enough to stay under the navbar */
    background: var(--bg-void);
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>