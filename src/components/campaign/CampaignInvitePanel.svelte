<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { CampaignInvite, CampaignRole } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type RoleOption = { label: string; value: CampaignRole };
  type ExpiryOption = { label: string; value: 'day' | 'week' | 'month' | 'never' };

  const roleOptions: RoleOption[] = [
    { label: 'PLAYER', value: 'PLAYER' },
    { label: 'GM', value: 'GM' }
  ];

  const expiryOptions: ExpiryOption[] = [
    { label: '1 DAY', value: 'day' },
    { label: '1 WEEK', value: 'week' },
    { label: '1 MONTH', value: 'month' },
    { label: 'NEVER', value: 'never' }
  ];

  let selectedRole = $state<RoleOption>(roleOptions[0]);
  let selectedExpiry = $state<ExpiryOption>(expiryOptions[1]);
  let maxUsesInput = $state('');
  let latestInviteUrl = $state('');
  let statusMessage = $state('');

  function inviteUrl(invite: CampaignInvite) {
    return `${window.location.origin}/invite/${encodeURIComponent(invite.code)}`;
  }

  function formatExpiry(invite: CampaignInvite) {
    if (!invite.expires_at) return 'NO EXPIRY';
    return new Date(invite.expires_at).toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).toUpperCase();
  }

  function maxUsesValue() {
    const parsed = Number(maxUsesInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.floor(parsed);
  }

  function expiryValue() {
    if (selectedExpiry.value === 'never') return null;

    const date = new Date();
    if (selectedExpiry.value === 'day') date.setDate(date.getDate() + 1);
    if (selectedExpiry.value === 'week') date.setDate(date.getDate() + 7);
    if (selectedExpiry.value === 'month') date.setMonth(date.getMonth() + 1);

    return date.toISOString();
  }

  async function createInvite() {
    const invite = await dbState.createCampaignInvite(selectedRole.value, {
      maxUses: maxUsesValue(),
      expiresAt: expiryValue()
    });

    if (!invite) {
      statusMessage = 'INVITE CREATION FAILED';
      return;
    }

    latestInviteUrl = inviteUrl(invite);
    statusMessage = 'INVITE CREATED';
  }

  async function copyLatestInvite() {
    if (!latestInviteUrl) return;
    await navigator.clipboard.writeText(latestInviteUrl);
    statusMessage = 'INVITE LINK COPIED';
  }

  async function copyInvite(invite: CampaignInvite) {
    await navigator.clipboard.writeText(inviteUrl(invite));
    statusMessage = 'INVITE LINK COPIED';
  }

  async function revokeInvite(invite: CampaignInvite) {
    const revoked = await dbState.revokeCampaignInvite(invite.id);
    statusMessage = revoked ? 'INVITE REVOKED' : 'REVOKE FAILED';
    if (latestInviteUrl === inviteUrl(invite)) latestInviteUrl = '';
  }
</script>

<TerminalPanel title="CAMPAIGN INVITES">
  <div class="invite-stack">
    <div class="invite-controls">
      <div class="input-group no-margin">
        <label for="invite-role" class="sel-label">ROLE</label>
        <TerminalSelect
          id="invite-role"
          options={roleOptions}
          bind:value={selectedRole}
          showPopup={false}
        />
      </div>

      <div class="input-group no-margin">
        <label for="invite-max-uses">MAX USES</label>
        <input
          id="invite-max-uses"
          class="terminal-input"
          type="number"
          min="1"
          step="1"
          placeholder="OPEN"
          bind:value={maxUsesInput}
        />
      </div>

      <div class="input-group no-margin">
        <label for="invite-expiry" class="sel-label">EXPIRES IN</label>
        <TerminalSelect
          id="invite-expiry"
          options={expiryOptions}
          bind:value={selectedExpiry}
          showPopup={false}
        />
      </div>
    </div>

    <button class="btn-action" onclick={createInvite} disabled={!dbState.isGM}>
      CREATE INVITE
    </button>

    {#if latestInviteUrl}
      <div class="latest-invite">
        <span>{latestInviteUrl}</span>
        <button class="btn-action btn-compact" onclick={copyLatestInvite}>COPY</button>
      </div>
    {/if}

    {#if statusMessage}
      <div class="dim-message">{statusMessage}</div>
    {/if}

    <div class="invite-list">
      {#if dbState.campaignInvites.length === 0}
        <div class="dim-message">NO ACTIVE INVITES</div>
      {:else}
        {#each dbState.campaignInvites as invite}
          <div class="invite-row">
            <div class="invite-main">
              <strong>{invite.code}</strong>
              <span>{invite.role} / {invite.uses}{invite.max_uses ? ` OF ${invite.max_uses}` : ''} USES / {formatExpiry(invite)}</span>
            </div>
            <div class="invite-actions">
              <button class="btn-action btn-compact" onclick={() => copyInvite(invite)}>COPY</button>
              <button class="btn-action btn-danger btn-compact" onclick={() => revokeInvite(invite)}>REVOKE</button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</TerminalPanel>

<style>
  .invite-stack {
    display: grid;
    gap: 1rem;
  }

  .invite-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.7fr) minmax(0, 1.2fr);
    gap: 0.75rem;
    align-items: end;
  }

  .latest-invite {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .latest-invite span {
    min-width: 0;
    overflow: hidden;
    color: var(--accent-amber);
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .invite-list {
    display: grid;
    gap: 0.65rem;
  }

  .invite-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .invite-main {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .invite-main strong {
    color: var(--accent-amber);
    letter-spacing: 0.08em;
  }

  .invite-main span {
    color: var(--text-dim);
    font-size: 0.7rem;
  }

  .invite-actions {
    display: flex;
    gap: 0.5rem;
  }

  @media (max-width: 900px) {
    .invite-controls,
    .invite-row,
    .latest-invite {
      grid-template-columns: 1fr;
    }

    .invite-actions {
      justify-content: stretch;
    }

    .invite-actions .btn-action {
      flex: 1;
    }
  }
</style>
