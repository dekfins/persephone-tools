<script lang="ts">
  import OrbitalMap from '../components/navmap/OrbitalMap.svelte';
  import DebriefPanel from '../components/missions/DebriefPanel.svelte';
</script>

<div class="navmap-page">
  <OrbitalMap />
  <DebriefPanel />
</div>



<style>
  .navmap-page {
    position: fixed;
    inset: 0;
    width: 100vw;
    max-width: none;
    height: 100vh;
    z-index: 10;
    background: var(--bg-void);
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
