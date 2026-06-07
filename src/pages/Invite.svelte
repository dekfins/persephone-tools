<script lang="ts">
  import { router } from 'tinro';
  import TerminalPanel from '../components/shared/TerminalPanel.svelte';
  import { authState, PENDING_INVITE_KEY } from '../lib/states/authState.svelte';
  import { dbState } from '../lib/states/dbState.svelte';

  let code = $state('');
  let status = $state<'pending' | 'redeeming' | 'success' | 'error'>('pending');
  let message = $state('Checking invite...');

  function readInviteCode() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return decodeURIComponent(parts[1] ?? '').trim().toUpperCase();
  }

  async function redeemInvite() {
    if (status === 'redeeming' || status === 'success') return;

    code = readInviteCode();
    if (!code) {
      status = 'error';
      message = 'Missing invite code.';
      return;
    }

    localStorage.setItem(PENDING_INVITE_KEY, code);

    if (authState.isInitializing) return;

    if (!authState.isSignedIn) {
      message = 'Sign in with Google to redeem this invite.';
      router.goto('/login');
      return;
    }

    status = 'redeeming';
    message = 'Redeeming invite...';

    try {
      await dbState.redeemCampaignInvite(code);
      localStorage.removeItem(PENDING_INVITE_KEY);
      status = 'success';
      message = 'Invite accepted.';
      router.goto('/home');
    } catch (error) {
      status = 'error';
      message = error instanceof Error ? error.message : 'Invite redemption failed.';
    }
  }

  $effect(() => {
    void redeemInvite();
  });
</script>

<div class="invite-shell">
  <TerminalPanel title="CAMPAIGN INVITE">
    <div class="invite-stack">
      <div class="invite-code">{code || 'NO CODE'}</div>

      {#if status === 'error'}
        <div class="terminal-alert error">{message}</div>
        <a href="/home" class="btn-action invite-link">RETURN HOME</a>
      {:else}
        <div class="dim-message">{message}</div>
      {/if}
    </div>
  </TerminalPanel>
</div>

<style>
  .invite-shell {
    max-width: 520px;
    margin: 6rem auto 0;
    padding: 2rem;
  }

  .invite-stack {
    display: grid;
    gap: 1rem;
  }

  .invite-code {
    padding: 1rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--accent-amber);
    font-family: var(--font-terminal);
    font-size: 1.1rem;
    font-weight: bold;
    text-align: center;
    letter-spacing: 0.08em;
  }

  .invite-link {
    display: inline-flex;
    justify-content: center;
    text-decoration: none;
  }
</style>
