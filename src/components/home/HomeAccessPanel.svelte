<script lang="ts">
  import { authState } from '../../lib/states/authState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let activeCampaign = $derived(dbState.activeCampaign);
  let isGM = $derived(dbState.isGM);

  function characterLine() {
    const char = dbState.activeCharacter;
    if (!char) return 'NO ACTIVE CHARACTER';
    return `${char.name.toUpperCase()} / LEVEL ${char.level} ${char.character_class.toUpperCase()}`;
  }
</script>

<TerminalPanel title="HOME">
  {#if authState.isInitializing}
    <div class="dim-message">AUTH SESSION INITIALIZING...</div>
  {:else if !authState.isSignedIn}
    <div class="terminal-alert error">SIGN-IN REQUIRED</div>
    <a href="/login" class="btn-action home-link">GO TO LOGIN</a>
  {:else if dbState.campaigns.length === 0}
    <div class="access-pending">
      <strong>ACCESS PENDING</strong>
      <span>{authState.profile?.email ?? 'SIGNED-IN USER'} has no campaign invitation yet.</span>
    </div>
  {:else}
    <div class="dossier">
      <span>ACTIVE CAMPAIGN</span>
      <strong>{activeCampaign?.name.toUpperCase() ?? 'NO CAMPAIGN'}</strong>
      <em>{characterLine()}</em>
    </div>

    <div class="action-grid">
      <a href="/overview" class="btn-action home-link">OPEN CHARACTER</a>
      <a href="/ship-condition" class="btn-action home-link">SHIP CONDITION</a>
      <a href="/inventory" class="btn-action home-link">INVENTORY</a>
      {#if isGM}
        <a href="/gm" class="btn-action home-link gm-action">GM TOOLS</a>
        <a href="/missions" class="btn-action home-link gm-action">JOB BOARD</a>
      {/if}
    </div>
  {/if}
</TerminalPanel>

<style>
  .dossier,
  .access-pending {
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
  .dossier em,
  .access-pending span {
    color: var(--text-dim);
    font-style: normal;
  }

  .dossier strong,
  .access-pending strong {
    color: var(--accent-amber);
    font-size: 1.1rem;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
