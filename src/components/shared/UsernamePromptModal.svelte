<script lang="ts">
  import { authState } from '../../lib/states/authState.svelte';

  let usernameDraft = $state('');
  let isSaving = $state(false);
  let localError = $state<string | null>(null);

  $effect(() => {
    usernameDraft = authState.profile?.display_name ?? authState.profile?.email ?? '';
  });

  async function saveUsername(event: SubmitEvent) {
    event.preventDefault();
    localError = null;
    isSaving = true;
    const didSave = await authState.updateUsername(usernameDraft);
    isSaving = false;

    if (!didSave) {
      localError = authState.usernameError;
    }
  }
</script>

<div class="username-modal-backdrop">
  <div class="terminal-card username-modal" role="dialog" aria-modal="true" aria-labelledby="username-title">
    <form class="username-form" onsubmit={saveUsername}>
      <div class="modal-kicker">PROFILE INITIALIZATION</div>
      <h2 id="username-title">SET USERNAME</h2>
      <p class="modal-copy">
        Confirm the name other campaign members will see in DEIMOS.
      </p>

      <label for="first-login-username">USERNAME</label>
      <input
        id="first-login-username"
        class="terminal-input"
        type="text"
        autocomplete="nickname"
        bind:value={usernameDraft}
      />

      {#if localError}
        <div class="terminal-alert error">{localError}</div>
      {/if}

      <button class="btn-action btn-full-amber" type="submit" disabled={isSaving || !usernameDraft.trim()}>
        {isSaving ? 'SAVING...' : 'CONFIRM USERNAME'}
      </button>
    </form>
  </div>
</div>

<style>
  .username-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(5, 8, 12, 0.78);
    backdrop-filter: blur(4px);
  }

  .username-modal {
    width: min(28rem, 100%);
  }

  .username-form {
    display: grid;
    gap: 1rem;
  }

  .modal-kicker {
    color: var(--ui-cyan);
    font-family: var(--font-terminal);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 0;
    color: var(--accent-amber);
    font-size: 1.4rem;
    letter-spacing: 0.08em;
  }

  .modal-copy {
    margin: 0;
    color: var(--text-dim);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .btn-action {
    width: 100%;
  }
</style>
