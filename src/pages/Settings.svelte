<script lang="ts">
  import TerminalPanel from '../components/shared/TerminalPanel.svelte';
  import { campaignState } from '../lib/campaignState.svelte';

  function factoryReset() {
    const confirmWipe = confirm("WARNING: This will permanently nuke your local save. Are you sure?");
    if (confirmWipe) {
      localStorage.removeItem('DEIMOS_ACTIVE_SESSION');
      window.location.reload(); 
    }
  }
</script>

<div class="settings-container">
  <TerminalPanel title="System Configuration">
    
    <div class="setting-row">
      <div class="setting-info">
        <span class="setting-name">FACTORY RESET</span>
        <span class="setting-desc">Purge all local browser memory and reset DEIMOS to factory defaults.</span>
      </div>
      
      <button class="btn-action btn-danger" onclick={factoryReset}>
        WIPE MEMORY
      </button>
    </div>

    <div class="setting-row">
      <div class="setting-info" style="width: 100%;">
        <label for="planet-scale" class="setting-name">PLANET VISUAL SCALE: {campaignState.planetScaleMultiplier.toFixed(1)}x</label>
        <span class="setting-desc">Adjusts celestial body size for readability. Does not affect physics.</span>
        <input 
          id="planet-scale"
          type="range" 
          min="0.1" 
          max="10" 
          step="0.1" 
          bind:value={campaignState.planetScaleMultiplier} 
          style="width: 100%; cursor: pointer; margin-top: 10px;"
        />
      </div>
    </div>

    <div class="setting-row">
      <div class="setting-info" style="width: 100%;">
        <label for="orbit-scale" class="setting-name">ORBIT SPACING: {campaignState.orbitScaleMultiplier.toFixed(1)}x</label>
        <span class="setting-desc">Expands or compresses the distances between planetary orbits.</span>
        <input 
          id="orbit-scale"
          type="range" 
          min="0.1" 
          max="10" 
          step="0.1" 
          bind:value={campaignState.orbitScaleMultiplier} 
          style="width: 100%; cursor: pointer; margin-top: 10px;"
        />
      </div>
    </div>

  </TerminalPanel>
</div>

<style>
  .settings-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 0;
    border-bottom: 1px dashed var(--border-subtle, #333);
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .setting-name {
    color: var(--text-main, #eee);
    font-weight: bold;
    font-family: var(--font-terminal, monospace);
    letter-spacing: 0.05em;
  }

  .setting-desc {
    color: var(--text-dim, #888);
    font-size: 0.85rem;
  }

  /* Override the global btn-action colors for the emergency button */
  .btn-danger {
    color: var(--accent-red, #ef4444);
    border-color: var(--accent-red, #ef4444);
  }

  .btn-danger:hover {
    background: var(--accent-red, #ef4444) !important;
    color: #000 !important;
  }
</style>