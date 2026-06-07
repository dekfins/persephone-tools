<script lang="ts">
  import { authState } from '../lib/states/authState.svelte';
  import { dbState } from '../lib/states/dbState.svelte';
  import { toastState } from '../lib/states/toastState.svelte';
  import CampaignInvitePanel from '../components/campaign/CampaignInvitePanel.svelte';
  import TerminalPanel from '../components/shared/TerminalPanel.svelte';

  let activeCampaign = $derived(dbState.activeCampaign);
  let isGM = $derived(dbState.isGM);
  let playerCharacters = $derived(dbState.playerCharacters);
  let npcCharacters = $derived(dbState.npcCharacters);

  function characterLine() {
    const char = dbState.activeCharacter;
    if (!char) return 'NO ACTIVE CHARACTER';
    return `${char.name.toUpperCase()} / LEVEL ${char.level} ${char.character_class.toUpperCase()}`;
  }

  async function deleteCharacter(characterId: string, characterName: string) {
    const confirmed = window.confirm(`Delete ${characterName}? This also deletes their personal inventory.`);
    if (!confirmed) return;

    const deleted = await dbState.deleteCharacter(characterId);
    toastState.notify(deleted ? 'CHARACTER DELETED' : 'ERROR: CHARACTER DELETE FAILED');
  }
</script>

<div class="home-grid">
  <div class="home-main">
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

    {#if dbState.campaigns.length > 0}
      <TerminalPanel title="CAMPAIGNS">
        <div class="campaign-list">
          {#each dbState.campaigns as campaign}
            <button
              class="campaign-row"
              class:active={campaign.id === dbState.activeCampaignId}
              onclick={() => dbState.setActiveCampaign(campaign.id)}
            >
              <span>{campaign.name.toUpperCase()}</span>
              <em>{campaign.status.toUpperCase()}</em>
            </button>
          {/each}
        </div>
      </TerminalPanel>
    {/if}

    {#if isGM}
      <CampaignInvitePanel />
    {/if}
  </div>

  {#if dbState.campaigns.length > 0}
    <div class="home-side">
      <TerminalPanel title={isGM ? 'CREW' : 'CHARACTERS'}>
        {#if playerCharacters.length === 0}
          <div class="dim-message">NO LINKED CHARACTERS</div>
        {:else}
          <div class="character-list">
            {#each playerCharacters as character}
              <div
                class="character-row"
                class:active={character.id === dbState.activeCharacter?.id}
              >
                <button class="character-select" onclick={() => dbState.setActiveCharacter(character.id)}>
                  <span>{character.name.toUpperCase()}</span>
                  <em>LVL {character.level} {character.character_class.toUpperCase()}</em>
                </button>

                {#if isGM}
                  <button
                    class="btn-action btn-danger btn-delete"
                    aria-label={`Delete ${character.name}`}
                    onclick={() => deleteCharacter(character.id, character.name)}
                  >
                    DELETE
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </TerminalPanel>

      {#if isGM}
        <TerminalPanel title="NPCS">
          {#if npcCharacters.length === 0}
            <div class="dim-message">NO NPCS RECORDED</div>
          {:else}
            <div class="character-list">
              {#each npcCharacters as npc}
                <div class="npc-row">
                  <div class="npc-summary">
                    <span>{npc.name.toUpperCase()}</span>
                    <em>LVL {npc.level} {npc.character_class.toUpperCase()}</em>
                  </div>

                  <button
                    class="btn-action btn-danger btn-delete"
                    aria-label={`Delete ${npc.name}`}
                    onclick={() => deleteCharacter(npc.id, npc.name)}
                  >
                    DELETE
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </TerminalPanel>
      {/if}
    </div>
  {/if}
</div>

<style>
  .home-grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    gap: 2rem;
    align-items: start;
    max-width: 1180px;
    margin: 0 auto;
    padding: 2rem;
  }

  .home-main,
  .home-side,
  .campaign-list,
  .character-list {
    display: grid;
    gap: 2rem;
    align-content: start;
  }

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

  .campaign-row,
  .character-row,
  .npc-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
    padding: 0.75rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    font-family: var(--font-terminal);
    text-align: left;
  }

  .campaign-row {
    cursor: pointer;
  }

  .character-select,
  .npc-summary {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: center;
  }

  .character-select {
    padding: 0;
    background: transparent;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .campaign-row.active,
  .character-row.active {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .campaign-row span,
  .character-row span,
  .character-select span,
  .npc-summary span,
  .npc-row span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .campaign-row em,
  .character-row em,
  .character-select em,
  .npc-summary em,
  .npc-row em {
    color: var(--text-dim);
    font-size: 0.72rem;
    font-style: normal;
  }

  .btn-delete {
    padding: 0.45rem 0.65rem;
    font-size: 0.68rem;
  }

  @media (max-width: 1000px) {
    .home-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
