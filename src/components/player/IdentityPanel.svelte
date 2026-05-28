<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import type { Background } from '../../lib/types';

  let char = $derived(dbState.activeCharacter);
  
  // Modal state toggles
  let showEditModal = $state(false);
  let editName = $state('');

  // Strict structural options for selectors
  const heritageOptions = [
    { label: 'EARTHLING', value: 'earthling' as const },
    { label: 'SPACER', value: 'spacer' as const }
  ];

  const classOptions = [
    { label: 'EXPERT', value: 'expert' as const },
    { label: 'WARRIOR', value: 'warrior' as const },
    { label: 'ADVENTURER', value: 'adventurer' as const }
  ];

  const backgroundOptions = [
    'Barbarian', 'Clergy', 'Courtesan', 'Criminal', 'Dilettante',
    'Entertainer', 'Merchant', 'Noble', 'Official', 'Peasant',
    'Physician', 'Pilot', 'Politician', 'Scholar', 'Soldier',
    'Spacer', 'Technician', 'Thug', 'Vagabond', 'Worker'
  ].map(bg => ({ label: bg.toUpperCase(), value: bg as Background }));

  // Selected object references for TerminalSelect bindings
  let editHeritage = $state(heritageOptions[0]);
  let editClass = $state(classOptions[0]);
  let editBackground = $state(backgroundOptions[0]);

  function openEdit() {
    if (!char) return;
    
    editName = char.name;
    
    // Find matching object structures to seed the inputs accurately
    editHeritage = heritageOptions.find(opt => opt.value === char.heritage) || heritageOptions[0];
    editClass = classOptions.find(opt => opt.value === char.character_class) || classOptions[0];
    editBackground = backgroundOptions.find(opt => opt.value === char.background) || backgroundOptions[0];
    
    showEditModal = true;
  }

  async function saveIdentity() {
    if (!char) return;
    
    if (!editName.trim()) {
      toastState.notify('ERROR: NAME FIELD CANNOT BE EMPTY');
      return;
    }

    await dbState.updateCharacter(char.id, {
      name: editName.trim(),
      heritage: editHeritage.value,
      character_class: editClass.value,
      background: editBackground.value
    });

    showEditModal = false;
    toastState.notify('IDENTITY RECORDS UPDATED');
  }
</script>

<TerminalPanel title="CREW IDENTITY" extraClass="player-panel">
  {#if char}
    <div class="stat-row">
      <span class="sel-label">NAME</span>
      <span class="value">{char.name}</span>
    </div>
    <div class="stat-row">
      <span class="sel-label">HERITAGE</span>
      <span class="value">{char.heritage.toUpperCase()}</span>
    </div>
    <div class="stat-row">
      <span class="sel-label">BACKGROUND</span>
      <span class="value">{char.background.toUpperCase()}</span>
    </div>
    <div class="stat-row">
      <span class="sel-label">CLASS</span>
      <span class="value">{char.character_class.toUpperCase()}</span>
    </div>
    <div class="stat-row">
      <span class="sel-label">LEVEL</span>
      <span class="value">{char.level}</span>
    </div>
    <div class="stat-row">
      <span class="sel-label">CREDITS</span>
      <span class="value">{char.personal_credits.toLocaleString()} CR</span>
    </div>

    <button class="btn-action btn-full-amber mt-1" onclick={openEdit}>
      MODIFY IDENTITY DATA
    </button>
  {/if}
</TerminalPanel>

{#if showEditModal}
  <div class="modal-overlay">
    <div class="terminal-card modal-content">
      <h3>EDIT CHARACTER</h3>
      <hr style="border-color: var(--border-subtle); margin-bottom: 1rem;" />
      
      <div class="form-group">
        <label for="edit-name">NAME</label>
        <input 
          id="edit-name" 
          type="text" 
          class="terminal-input" 
          bind:value={editName} 
          autocomplete="off"
        />
      </div>

      <div class="form-group">
        <label for="edit-heritage">HERITAGE</label>
        <TerminalSelect 
          id="edit-heritage"
          options={heritageOptions} 
          bind:value={editHeritage} 
          showPopup={false}
        />
      </div>

      <div class="form-group">
        <label for="edit-background">BACKGROUND</label>
        <TerminalSelect 
          id="edit-background"
          options={backgroundOptions} 
          bind:value={editBackground} 
          showPopup={false}
        />
      </div>

      <div class="form-group">
        <label for="edit-class">CLASS</label>
        <TerminalSelect 
          id="edit-class"
          options={classOptions} 
          bind:value={editClass} 
          showPopup={false}
        />
      </div>

      <div class="modal-actions">
        <button class="btn-action" onclick={() => showEditModal = false}>CANCEL</button>
        <button class="btn-action btn-amber" onclick={saveIdentity}>CONFIRM CHANGES</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-family: var(--font-terminal, monospace);
  }
  
  .value {
    color: var(--accent-amber);
  }

  .mt-1 { margin-top: 1rem; }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    width: 420px;
    border: 1px solid var(--accent-amber);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
    background: var(--bg-panel);
    padding: 1.5rem;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .btn-amber {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .btn-amber:hover {
    background: var(--accent-amber);
    color: var(--bg-void);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 1.2rem;
  }

  .form-group :global(.terminal-select-trigger) {
    width: 100%;
  }
</style>