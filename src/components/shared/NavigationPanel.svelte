<script lang="ts">
  import { active, router } from 'tinro';
  import { authState } from '../../lib/states/authState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import TerminalSelect from './TerminalSelect.svelte';

  type SelectOption = { label: string; value: string };

  let isProfileExpanded = $state(false);
  let isOverviewActive = $derived(!$router?.path || $router.path === '/overview' || $router.path === '/');
  let isLoginRoute = $derived($router?.path === '/login');
  let campaignOptions = $derived<SelectOption[]>(
    dbState.campaigns.map(campaign => ({ label: campaign.name, value: campaign.id }))
  );
  let selectedCampaign = $derived(
    campaignOptions.find(option => option.value === dbState.activeCampaignId) ?? null
  );
  let characterOptions = $derived<SelectOption[]>(
    dbState.playerCharacters.map(character => ({ label: character.name, value: character.id }))
  );
  let selectedCharacter = $derived(
    characterOptions.find(option => option.value === dbState.activeCharacter?.id) ?? null
  );
  let profileName = $derived(
    authState.profile?.display_name ?? authState.profile?.email ?? 'SIGNED OUT'
  );

  function handleCampaignSelect(option: SelectOption) {
    void dbState.setActiveCampaign(option.value);
  }

  function handleCharacterSelect(option: SelectOption) {
    void dbState.setActiveCharacter(option.value);
  }
</script>

<header class="top-bar">
  <div class="bar-content">
    <a href="/home" class="brand">DEIMOS</a>
    
    {#if authState.isSignedIn && dbState.activeCampaignId}
      <nav class="navbar">
        <a href="/home" class="nav-link" use:active>HOME</a>
        <a href="/overview" class="nav-link" class:active={isOverviewActive}>OVERVIEW</a>
        <a href="/character-creator" class="nav-link" use:active>CREATOR</a>
        <a href="/ship-builder" class="nav-link" exact use:active>SHIP BUILDER</a>
        <a href="/ship-condition" class="nav-link" use:active>SHIP CONDITION</a>
        <a href="/inventory" class="nav-link" use:active>INVENTORY</a>
        <a href="/navmap" class="nav-link" use:active>NAVMAP</a>
        {#if dbState.isGM}
          <a href="/missions" class="nav-link" use:active>JOB BOARD</a> 
          <a href="/gm" class="nav-link" use:active>GM TOOLS</a>
        {/if}
        <a href="/settings" class="nav-link" use:active>SETTINGS</a>
      </nav>
    {:else if !isLoginRoute}
      <nav class="navbar">
        <a href="/login" class="nav-link" use:active>LOGIN</a>
      </nav>
    {/if}
  </div>
</header>

{#if authState.isSignedIn}
  <div class="floating-auth">
    <button
      type="button"
      class="profile-chip"
      aria-expanded={isProfileExpanded}
      aria-controls="profile-selector"
      onclick={() => isProfileExpanded = !isProfileExpanded}
    >
      <span class="profile-kicker">PROFILE</span>
      <span class="profile-name">{profileName}</span>
      <span class="profile-role">{dbState.activeMembership?.role ?? 'NO CAMPAIGN'}</span>
    </button>

    {#if isProfileExpanded}
      <div class="auth-content" id="profile-selector">
        {#if campaignOptions.length > 0}
          <span class="auth-label">CAMPAIGN</span>
          <TerminalSelect
            id="campaign-selector"
            options={campaignOptions}
            value={selectedCampaign}
            onSelect={handleCampaignSelect}
            showPopup={false}
          />

          <span class="auth-label">ACTIVE CHARACTER</span>
          <TerminalSelect
            id="character-selector"
            options={characterOptions}
            value={selectedCharacter}
            placeholder="NO CHARACTER"
            onSelect={handleCharacterSelect}
            showPopup={false}
          />
        {:else}
          <div class="dim-message">NO CAMPAIGN INVITE</div>
        {/if}

        <button class="btn-action btn-danger btn-compact" onclick={() => authState.signOut()}>
          LOG OUT
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    background: var(--bg-void, #0b0e14);
    border-bottom: 1px solid var(--text-dim, #444);
    z-index: 1000; 
    padding: 0.7rem 2rem;
  }

  .bar-content {
    display: flex;
    align-items: baseline;
    gap: 3rem; 
    max-width: 1400px;
    margin: 0 auto;
  }

  .brand {
    color: var(--accent-amber, #f59e0b);
    font-size: 2rem;
    font-weight: bold;
    letter-spacing: 0.15em;
    padding-top: 0.5rem;
    padding-left: 2rem;
    text-decoration: none;
  }

  .navbar {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem; 
  }

  .nav-link {
    color: var(--text-main);
    text-decoration: none;
    padding: 0.5rem 0;
    letter-spacing: 0.05em;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .nav-link:hover {
    color: var(--ui-bright);
  }

  :global(.active) {
    color: var(--accent-amber) !important;
  }

  .floating-auth {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 1000;
    width: min(270px, calc(100vw - 2rem));
    font-family: var(--font-terminal);
  }

  .profile-chip {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.1rem 0.75rem;
    width: 100%;
    padding: 0.45rem 0.65rem;
    background: color-mix(in srgb, var(--bg-panel) 82%, transparent);
    border: var(--border-subtle);
    color: var(--text-main);
    font-family: var(--font-terminal);
    text-align: left;
    cursor: pointer;
    opacity: 0.88;
    transition: border-color 0.2s ease, opacity 0.2s ease, background 0.2s ease;
  }

  .profile-chip:hover,
  .profile-chip:focus-visible,
  .profile-chip[aria-expanded="true"] {
    background: var(--bg-panel);
    border-color: var(--accent-amber);
    opacity: 1;
    outline: none;
  }

  .profile-kicker {
    grid-column: 1 / -1;
    color: var(--text-dim);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
  }

  .profile-name {
    min-width: 0;
    overflow: hidden;
    color: var(--text-main);
    font-size: 0.82rem;
    font-weight: bold;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .profile-role {
    align-self: center;
    color: var(--accent-amber);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
  }

  .auth-content {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.35rem;
    padding: 0.5rem;
    background: var(--bg-panel);
    border: var(--border-subtle);
  }

  .auth-label {
    color: var(--text-dim);
    font-size: 0.65rem;
    letter-spacing: 0.05em;
  }
</style>
