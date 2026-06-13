<script lang="ts">
  import { router } from 'tinro';
  import { authState } from '../../lib/states/authState.svelte';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let activeCampaign = $derived(dbState.activeCampaign);
  let isGM = $derived(dbState.isGM);
  let inviteCode = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);
  let usernameLabel = $derived(authState.profile?.display_name?.trim() || 'SIGNED-IN USER');

  function characterLine() {
    const char = dbState.activeCharacter;
    if (!char) return 'NO ACTIVE CHARACTER';
    return `${char.name.toUpperCase()} / LEVEL ${char.level} ${char.character_class.toUpperCase()}`;
  }

  async function joinCampaign() {
    const code = inviteCode.trim();
    if (!code) return;

    try {
      await dbState.redeemCampaignInviteFromHome(code);
      inviteCode = '';
      toastState.notify('CAMPAIGN JOINED');
    } catch (error) {
      toastState.notify(error instanceof Error ? error.message.toUpperCase() : 'ERROR: INVITE FAILED');
    }
  }

  async function importArchive(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const loaded = await dbState.loadLocalCharacterArchive(file);
    toastState.notify(loaded ? 'CHARACTER ARCHIVE LOADED' : 'ERROR: INVALID CHARACTER ARCHIVE');
    input.value = '';

    if (loaded && dbState.localCharacterArchive) {
      characterCreatorState.loadArchive(dbState.localCharacterArchive);
      router.goto('/character-creator');
    }
  }
</script>

<TerminalPanel title="HOME">
  {#if authState.isInitializing}
    <div class="dim-message">AUTH SESSION INITIALIZING...</div>
  {:else if !authState.isSignedIn}
    <div class="terminal-alert error">SIGN-IN REQUIRED</div>
    <a href="/login" class="btn-action home-link">GO TO LOGIN</a>
  {:else}
    <div class="dossier">
      <div class="dossier-greeting">
        <span>WELCOME,</span>
        <strong>{usernameLabel.toUpperCase()}</strong>
      </div>
      <em>{characterLine()}</em>
    </div>

    <div class="action-grid">
      <a href="/overview" class="btn-action home-link">OPEN CHARACTER</a>
      <a href="/character-creator" class="btn-action home-link">CREATE CHARACTER</a>
      <button class="btn-action home-link" onclick={() => fileInput?.click()}>IMPORT CHARACTER</button>
      {#if activeCampaign}
        <a href="/ship-condition" class="btn-action home-link">SHIP CONDITION</a>
        <a href="/inventory" class="btn-action home-link">INVENTORY</a>
      {/if}
      {#if activeCampaign && isGM}
        <a href="/gm" class="btn-action home-link gm-action">GM TOOLS</a>
        <a href="/missions" class="btn-action home-link gm-action">JOB BOARD</a>
      {/if}
    </div>

    {#if !activeCampaign}
      <div class="terminal-alert">NO CAMPAIGN LINKED</div>
    {/if}

    <div class="join-controls">
      <label for="home-invite-code">INVITE CODE</label>
      <div class="join-row">
        <input
          id="home-invite-code"
          class="terminal-input"
          bind:value={inviteCode}
          placeholder="ENTER CODE..."
        />
        <button class="btn-action" onclick={joinCampaign} disabled={!inviteCode.trim()}>JOIN</button>
      </div>
    </div>

    <input
      type="file"
      accept=".deimos-character,.deimos,text/plain"
      bind:this={fileInput}
      onchange={importArchive}
      style="display: none;"
    />
  {/if}
</TerminalPanel>

<style>
  .dossier {
    display: grid;
    gap: 0.4rem;
    justify-items: center;
    text-align: center;
    padding: 1rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .dossier span,
  .dossier em {
    color: var(--text-dim);
    font-style: normal;
  }

  .dossier-greeting {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: 0.35rem;
  }

  .dossier strong {
    color: var(--accent-amber);
    font-size: 1.1rem;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .action-grid .btn-action,
  .home-link {
    box-sizing: border-box;
    width: 100%;
    min-height: 2.85rem;
    align-items: center;
    font-size: 0.8rem;
    line-height: 1;
  }

  .join-controls {
    display: grid;
    gap: 0.45rem;
    font-family: var(--font-terminal);
  }

  .join-controls label {
    color: var(--text-dim);
    font-size: 0.65rem;
    letter-spacing: 0.05em;
  }

  .join-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
  }

  .home-link {
    display: inline-flex;
    justify-content: center;
    text-decoration: none;
  }

  .gm-action {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .gm-action:hover {
    background: var(--accent-amber);
  }
</style>
