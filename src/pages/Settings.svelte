<script lang="ts">
  import TerminalPanel from '../components/shared/TerminalPanel.svelte';
  import { campaignState } from '../lib/states/campaignState.svelte';

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
      <div class="setting-info" style="width: 100%;">
        <label for="orbit-tail-opacity" class="setting-name">ORBIT TRAIL OPACITY: {campaignState.orbitTrailOpacity.toFixed(1)}</label>
        <span class="setting-desc">Adjusts the opacity of the orbit trails. Set to 0 to disable trails entirely.</span>
        <input 
          id="orbit-tail-opacity"
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          bind:value={campaignState.orbitTrailOpacity} 
          style="width: 100%; cursor: pointer; margin-top: 10px;"
        />
      </div>
    </div>

    <div class="setting-row">
      <div class="setting-info" style="width: 100%;">
        <label for="orbit-thickness" class="setting-name">ORBIT TRAIL THICKNESS: {campaignState.orbitTrailThickness.toFixed(1)}px</label>
        <span class="setting-desc">Adjusts the thickness of the orbit trails.</span>
        <input 
          id="orbit-thickness"
          type="range" 
          min="1" 
          max="4" 
          step="0.1" 
          bind:value={campaignState.orbitTrailThickness} 
          style="width: 100%; cursor: pointer; margin-top: 10px;"
        />
      </div>
    </div>

    <div class="setting-row">
      <div class="setting-info" style="align-items: flex-start;">
        <label class="setting-name" for="factory-reset">FACTORY RESET</label>
        <span class="setting-desc">Purge all local browser memory and reset website to factory defaults.</span>
        <button class="btn-action btn-danger btn-compact" style="margin-top: 15px;" onclick={factoryReset}>
          WIPE MEMORY
        </button>
      </div>
    </div>

    <div style="margin-top: 2rem; text-align: center; color: var(--text-dim, #888); font-size: 0.85rem;">
      Made with ❤️ by dekfins. <a href="https://github.com/dekfins/ship-builder" target="_blank" style="color: var(--accent-blue, #3b82f6); text-decoration: underline;">Source code on GitHub</a>.
    </div>

  </TerminalPanel>
</div>

<style>
  .settings-container {
    max-width: 800px;
    margin: 0 auto;
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
    gap: 0.25rem;
  }

  .setting-name {
    color: var(--text-main, #eee);
    font-weight: bold;
    font-size: 1rem;
    font-family: var(--font-terminal, monospace);
    letter-spacing: 0.05em;
  }

  .setting-desc {
    color: var(--text-dim, #888);
    font-size: 0.85rem;
  }

</style>
