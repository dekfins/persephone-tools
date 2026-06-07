<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import { characterCodec } from '../../lib/characterCodec';
  import type { FinalizeCharacterArchiveResult } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let finalizeResult = $state<FinalizeCharacterArchiveResult | null>(null);
  let fileInput: HTMLInputElement;

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

  function exportArchive() {
    if (!dbState.localCharacterArchive) {
      toastState.notify('NO CHARACTER ARCHIVE AVAILABLE');
      return;
    }

    characterCodec.exportToFile(dbState.localCharacterArchive);
  }

  function clearPreview() {
    dbState.clearLocalCharacterPreview();
    finalizeResult = null;
    toastState.notify('LOCAL CHARACTER PREVIEW CLEARED');
  }

  async function finalizeArchive() {
    finalizeResult = await dbState.finalizeLocalCharacterArchive();
    toastState.notify(finalizeResult.success ? 'CHARACTER FINALIZED' : finalizeResult.message.toUpperCase());
    if (finalizeResult.success) {
      dbState.clearLocalCharacterPreview();
    }
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
      <div class="dim-message">AWAITING CREW DATA...</div>
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
          {#if finalizeResult.inventory.failures.length > 0}
            <div class="failure-list">
              {#each finalizeResult.inventory.failures.slice(0, 4) as failure}
                <span>{failure.name.toUpperCase()} x{failure.quantity}: {failure.reason}</span>
              {/each}
              {#if finalizeResult.inventory.failures.length > 4}
                <span>+{finalizeResult.inventory.failures.length - 4} MORE ITEM FAILURES</span>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    <div class="io-controls">
      <button class="btn-action" onclick={exportArchive} disabled={!dbState.localCharacterArchive}>EXPORT CHARACTER</button>
      <button class="btn-action" onclick={() => fileInput.click()}>IMPORT CHARACTER</button>

      <input
        type="file"
        accept=".deimos-character,.deimos,text/plain"
        bind:this={fileInput}
        onchange={importArchive}
        style="display: none;"
      />
    </div>
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

  .io-controls {
    display: flex;
    gap: 1rem;
    width: 100%;
    justify-content: center;
  }

  .io-controls .btn-action {
    flex: 1;
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

  .failure-list {
    display: grid;
    gap: 0.25rem;
    padding-top: 0.35rem;
    color: var(--accent-red);
    overflow-wrap: anywhere;
  }
</style>
