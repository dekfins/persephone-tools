<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import type { FinalizeCharacterArchiveResult } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let finalizeResult = $state<FinalizeCharacterArchiveResult | null>(null);

  async function importArchive(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const loaded = await dbState.loadLocalCharacterArchive(file);
    toastState.notify(loaded ? 'CHARACTER ARCHIVE LOADED' : 'ERROR: INVALID CHARACTER ARCHIVE');
    input.value = '';
  }

  function clearPreview() {
    dbState.clearLocalCharacterPreview();
    finalizeResult = null;
    toastState.notify('LOCAL CHARACTER PREVIEW CLEARED');
  }

  async function finalizeArchive() {
    finalizeResult = await dbState.finalizeLocalCharacterArchive();
    toastState.notify(finalizeResult.success ? 'CHARACTER FINALIZED' : finalizeResult.message.toUpperCase());
  }
</script>

<TerminalPanel title="CHARACTER ARCHIVE" extraClass="player-panel">
  {#if dbState.isLocalCharacterPreview}
    <div class="terminal-alert">LOCAL PREVIEW MODE</div>
    <button class="btn-action btn-finalize" onclick={finalizeArchive}>FINALIZE INTO CAMPAIGN</button>
    <button class="btn-action btn-danger" onclick={clearPreview}>CLEAR PREVIEW</button>
    {#if finalizeResult}
      <div class="result-box" class:error={!finalizeResult.success}>
        <strong>{finalizeResult.status.replace(/_/g, ' ').toUpperCase()}</strong>
        <span>{finalizeResult.message}</span>
        {#if finalizeResult.inventory.attempted > 0}
          <span>
            INV {finalizeResult.inventory.inserted} INSERTED /
            {finalizeResult.inventory.merged} MERGED /
            {finalizeResult.inventory.failures.length} FAILED
          </span>
        {/if}
      </div>
    {/if}
  {:else}
    <label for="character-archive-import" class="archive-label">IMPORT DEIMOS CHARACTER</label>
    <input
      id="character-archive-import"
      class="terminal-input"
      type="file"
      accept=".deimos-character,.deimos,text/plain"
      onchange={importArchive}
    />
  {/if}
</TerminalPanel>

<style>
  .archive-label {
    display: block;
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    margin-bottom: 0.5rem;
  }

  .btn-danger {
    width: 100%;
    margin-top: 0.8rem;
    border-color: var(--accent-red);
    color: var(--accent-red);
  }

  .btn-danger:hover {
    background: var(--accent-red);
    color: var(--bg-void);
    border-color: var(--accent-red);
  }

  .btn-finalize {
    width: 100%;
    margin-top: 0.8rem;
  }

  .result-box {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.8rem;
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    font-family: var(--font-terminal);
    font-size: 0.78rem;
  }

  .result-box strong {
    color: var(--accent-amber);
  }

  .result-box.error strong {
    color: var(--accent-red);
  }
</style>
