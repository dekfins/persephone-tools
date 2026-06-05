<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import type { FinalizeCharacterArchiveResult } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let finalizeResult = $state<FinalizeCharacterArchiveResult | null>(null);

  function classLabel() {
    if (!char) return 'OPEN';
    return `LEVEL ${char.level} ${char.character_class}`.toUpperCase();
  }

  function heritageBackgroundLabel() {
    if (!char) return 'OPEN';
    return `${char.heritage} ${char.background}`.toUpperCase();
  }

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

<TerminalPanel title="IDENTITY" extraClass="player-panel">
  <div class="identity-stack">
    {#if char}
      <div class="identity-summary">
        <strong>{char.name.toUpperCase()}</strong>
        <span>{classLabel()}</span>
        <span>{heritageBackgroundLabel()}</span>
      </div>
    {:else}
      <div class="terminal-alert">AWAITING CREW DATA...</div>
    {/if}

    {#if dbState.isLocalCharacterPreview}
      <div class="terminal-alert">ARCHIVE PREVIEW - NOT SYNCED TO CLOUD</div>
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
      <div class="archive-import">
        <label for="character-archive-import" class="archive-label">IMPORT DEIMOS CHARACTER</label>
        <input
          id="character-archive-import"
          class="terminal-input archive-input"
          type="file"
          accept=".deimos-character,.deimos,text/plain"
          onchange={importArchive}
        />
      </div>
    {/if}
  </div>
</TerminalPanel>

<style>
  .identity-stack {
    display: grid;
    gap: 0.8rem;
  }

  .identity-summary {
    display: grid;
    gap: 0.4rem;
    justify-items: center;
    text-align: center;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 1rem;
    font-family: var(--font-terminal);
  }

  .identity-summary span {
    color: var(--text-dim);
    overflow-wrap: anywhere;
  }

  .identity-summary strong {
    color: var(--accent-amber);
    font-size: 1.1rem;
    overflow-wrap: anywhere;
  }

  .archive-label {
    display: block;
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    margin-bottom: 0.5rem;
  }

  .archive-input {
    width: 100%;
    color: var(--text-main);
    font-family: var(--font-terminal);
  }

  .archive-input::file-selector-button {
    background: transparent;
    color: var(--ui-cyan);
    border: 1px solid var(--ui-cyan);
    padding: 0.6rem 0.85rem;
    margin-right: 0.85rem;
    font-family: var(--font-terminal);
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s;
  }

  .archive-input::file-selector-button:hover {
    background: var(--ui-cyan);
    color: var(--bg-dark);
    border-color: var(--ui-cyan);
  }

  .btn-finalize,
  .btn-danger {
    width: 100%;
  }

  .result-box {
    display: grid;
    gap: 0.35rem;
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
