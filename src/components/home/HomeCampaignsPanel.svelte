<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type SelectOption = { label: string; value: string };

  let isGM = $derived(dbState.isGM);
  let activeCampaign = $derived(dbState.activeCampaign);
  let activeMembers = $derived(dbState.activeCampaignMembers);
  let rosterCharacters = $derived(dbState.activeCampaignRosterCharacters);
  let availableCharacterOptions = $derived<SelectOption[]>(
    dbState.ownedCharactersAvailableForActiveCampaign.map(character => ({
      label: character.name,
      value: character.id
    }))
  );
  let newCampaignName = $state('');
  let inviteCode = $state('');
  let selectedCharacter = $state<SelectOption | null>(null);

  async function createCampaign() {
    const campaign = await dbState.createCampaign(newCampaignName);
    toastState.notify(campaign ? 'CAMPAIGN CREATED' : 'ERROR: CAMPAIGN CREATE FAILED');
    if (campaign) newCampaignName = '';
  }

  async function joinCampaign() {
    if (!inviteCode.trim()) return;

    try {
      await dbState.redeemCampaignInviteFromHome(inviteCode);
      inviteCode = '';
      toastState.notify('CAMPAIGN JOINED');
    } catch (error) {
      toastState.notify(error instanceof Error ? error.message.toUpperCase() : 'ERROR: INVITE FAILED');
    }
  }

  async function leaveCampaign() {
    if (!activeCampaign) return;
    const confirmed = window.confirm(`Leave ${activeCampaign.name}? Your characters remain in this campaign.`);
    if (!confirmed) return;

    const left = await dbState.leaveCampaign(activeCampaign.id);
    toastState.notify(left ? 'CAMPAIGN LEFT' : 'ERROR: CAMPAIGN LEAVE FAILED');
  }

  async function deleteCampaign() {
    if (!activeCampaign) return;
    const confirmed = window.confirm(`Delete ${activeCampaign.name}? This removes the campaign and campaign-scoped records.`);
    if (!confirmed) return;

    const deleted = await dbState.deleteCampaign(activeCampaign.id);
    toastState.notify(deleted ? 'CAMPAIGN DELETED' : 'ERROR: CAMPAIGN DELETE FAILED');
  }

  async function removeMember(userId: string) {
    const removed = await dbState.removeCampaignMember(userId);
    toastState.notify(removed ? 'MEMBER REMOVED' : 'ERROR: MEMBER REMOVE FAILED');
  }

  async function addCharacterToCampaign() {
    if (!selectedCharacter) return;

    const added = await dbState.addCharacterToCampaign(selectedCharacter.value);
    toastState.notify(
      added
        ? 'CHARACTER ADDED TO CAMPAIGN'
        : dbState.campaignRosterSchemaMissing
          ? 'ERROR: ROSTER MIGRATION REQUIRED'
          : 'ERROR: CHARACTER ADD FAILED'
    );
    if (added) selectedCharacter = null;
  }

  async function removeCharacterFromCampaign(characterId: string) {
    const removed = await dbState.removeCharacterFromCampaign(characterId);
    toastState.notify(
      removed
        ? 'CHARACTER REMOVED FROM CAMPAIGN'
        : dbState.campaignRosterSchemaMissing
          ? 'ERROR: ROSTER MIGRATION REQUIRED'
          : 'ERROR: CHARACTER REMOVE FAILED'
    );
  }
</script>

<TerminalPanel title="CAMPAIGNS">
  <div class="campaign-stack">
    <div class="campaign-list">
      {#if dbState.campaigns.length === 0}
        <div class="dim-message">NO CAMPAIGNS JOINED</div>
      {:else}
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
      {/if}
    </div>

    <div class="join-controls">
      <label for="campaign-invite-code">JOIN CAMPAIGN</label>
      <div class="control-row">
        <input
          id="campaign-invite-code"
          class="terminal-input"
          bind:value={inviteCode}
          placeholder="INVITE CODE..."
        />
        <button class="btn-action btn-compact" onclick={joinCampaign} disabled={!inviteCode.trim()}>JOIN</button>
      </div>
    </div>

    {#if activeCampaign}
      <div class="campaign-actions">
        <button class="btn-action btn-danger" onclick={leaveCampaign}>LEAVE CAMPAIGN</button>
        {#if isGM}
          <button class="btn-action btn-danger" onclick={deleteCampaign}>DELETE CAMPAIGN</button>
        {/if}
      </div>

      <div class="roster-panel">
        <span class="member-heading">CHARACTER ROSTER</span>
        {#if dbState.campaignRosterSchemaMissing}
          <div class="schema-alert">
            CAMPAIGN ROSTER MIGRATION REQUIRED: APPLY db/repairs/20260612030000_campaign_character_roster.sql
          </div>
        {:else}
          <div class="control-row">
            <TerminalSelect
              id="campaign-character-add"
              options={availableCharacterOptions}
              bind:value={selectedCharacter}
              placeholder="SELECT CHARACTER..."
              showPopup={false}
            />
            <button
              class="btn-action btn-compact"
              onclick={addCharacterToCampaign}
              disabled={!selectedCharacter}
            >
              ADD
            </button>
          </div>

          {#if rosterCharacters.length === 0}
            <div class="dim-message">NO CHARACTERS ADDED</div>
          {:else}
            <div class="roster-list">
              {#each rosterCharacters as character}
                <div class="member-row">
                  <div class="member-summary">
                    <span>{character.name.toUpperCase()}</span>
                    <em>LVL {character.level} {character.character_class.toUpperCase()}</em>
                  </div>

                  {#if isGM || dbState.isCharacterOwnedByActiveUser(character)}
                    <button
                      class="btn-action btn-danger btn-compact"
                      onclick={() => removeCharacterFromCampaign(character.id)}
                    >
                      REMOVE
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    {#if isGM}
      <div class="join-controls">
        <label for="new-campaign-name">CREATE CAMPAIGN</label>
        <div class="control-row">
          <input
            id="new-campaign-name"
            class="terminal-input"
            bind:value={newCampaignName}
            placeholder="CAMPAIGN NAME..."
          />
          <button class="btn-action btn-compact" onclick={createCampaign} disabled={!newCampaignName.trim()}>CREATE</button>
        </div>
      </div>

      <div class="member-list">
        <span class="member-heading">ACTIVE PARTY</span>
        {#if activeMembers.length === 0}
          <div class="dim-message">NO PARTY MEMBERS</div>
        {:else}
          {#each activeMembers as member}
            <div class="member-row">
              <div class="member-summary">
                <span>{dbState.formatCampaignMemberName(member).toUpperCase()}</span>
                <em>{member.role}</em>
              </div>

              {#if member.user_id !== dbState.activeUserProfile?.id}
                <button
                  class="btn-action btn-danger btn-compact"
                  onclick={() => removeMember(member.user_id)}
                >
                  REMOVE
                </button>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</TerminalPanel>

<style>
  .campaign-stack {
    display: grid;
    gap: 1rem;
  }

  .campaign-list {
    display: grid;
    gap: 0.75rem;
    align-content: start;
  }

  .campaign-row {
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
    cursor: pointer;
  }

  .campaign-row.active {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .campaign-row span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .campaign-row em {
    color: var(--text-dim);
    font-size: 0.72rem;
    font-style: normal;
  }

  .join-controls,
  .member-list,
  .roster-panel,
  .roster-list {
    display: grid;
    gap: 0.5rem;
    font-family: var(--font-terminal);
  }

  .join-controls label,
  .member-heading {
    color: var(--text-dim);
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    margin-bottom: 0rem;
    margin-top: 0.5rem;
  }

  .control-row,
  .campaign-actions,
  .member-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
  }

  .campaign-actions {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .member-row {
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
  }

  .member-summary {
    min-width: 0;
    display: grid;
    gap: 0.2rem;
  }

  .member-summary span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .member-summary em {
    color: var(--text-dim);
    font-size: 0.68rem;
    font-style: normal;
  }

  .schema-alert {
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    background: rgba(255, 75, 75, 0.08);
    padding: 0.75rem;
    font-family: var(--font-terminal);
    font-size: 0.78rem;
    line-height: 1.45;
  }
</style>
