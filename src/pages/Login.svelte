<script lang="ts">
  import { authState, PENDING_INVITE_KEY } from '../lib/states/authState.svelte';
  import TerminalPanel from '../components/shared/TerminalPanel.svelte';

  $effect(() => {
    if (!authState.isInitializing && authState.isSignedIn) {
      const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY);
      window.location.href = pendingInvite
        ? `/invite/${encodeURIComponent(pendingInvite)}`
        : '/home';
    }
  });
</script>

<div class="login-shell">
  <TerminalPanel title="DEIMOS ACCESS">
    <div class="login-stack">
      <div class="system-copy">
        <strong>CAMPAIGN LINK REQUIRED</strong>
        <span>Sign in with Google. Access remains locked until a GM links your account to a campaign.</span>
      </div>

      {#if authState.authError}
        <div class="terminal-alert error">{authState.authError}</div>
      {/if}

      <button class="btn-action" onclick={() => authState.signInWithGoogle()} disabled={authState.isSigningIn}>
        {authState.isSigningIn ? 'OPENING GOOGLE...' : 'SIGN IN WITH GOOGLE'}
      </button>
      <span class="trust-note">Uses Supabase for secure authentication. You may briefly see a supabase.co address while signing in.</span>
    </div>
  </TerminalPanel>
</div>

<style>
  .login-shell {
    max-width: 520px;
    margin: 6rem auto 0;
    padding: 2rem;
  }

  .login-stack {
    display: grid;
    gap: 1rem;
  }

  .system-copy {
    display: grid;
    gap: 0.4rem;
    padding: 1rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .system-copy strong {
    color: var(--accent-amber);
  }

  .system-copy span {
    color: var(--text-dim);
    line-height: 1.45;
  }

  .trust-note {
    color: var(--text-dim);
    font-size: 0.85rem;
  }
</style>
