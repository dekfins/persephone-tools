<script lang="ts">
  import OrbitalMap from '../components/navmap/OrbitalMap.svelte';
</script>

<div class="navmap-page">
  <OrbitalMap />
</div>

<style>
  .navmap-page {
    position: fixed; /* Detaches from normal page layout */
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10; /* High enough to cover the background, low enough to stay under the navbar */
    background: var(--bg-dark, #0b0e14);
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>