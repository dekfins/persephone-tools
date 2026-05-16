<script lang="ts">
  import TerminalPanel from '../components/shared/TerminalPanel.svelte';

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