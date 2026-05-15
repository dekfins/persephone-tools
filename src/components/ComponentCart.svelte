<script lang="ts">
  import { shipState } from '../lib/shipState.svelte';
  import fittings from '../data/fittings.json';
  import defenses from '../data/defenses.json';
  import weapons from '../data/weapons.json';
  import TerminalSelect from './TerminalSelect.svelte';

  let activeTab = $state('Fittings');

  let selectedFitting = $state<any>(null);
  let selectedDefense = $state<any>(null);
  let selectedWeapon = $state<any>(null);

  $effect(() => {
  if (availableFittings.length > 0) selectedFitting = availableFittings[0];
  if (availableDefenses.length > 0) selectedDefense = availableDefenses[0];
  if (availableWeapons.length > 0) selectedWeapon = availableWeapons[0];
});

  // Helper to check how many of an item are already installed
  function getQty(item: any) {
    if (!item) return 0;
    
    const found = shipState.components.find(c => {
      // Only compare if the specific name property exists on the selected item
      if (item.fittingName) return c.item.fittingName === item.fittingName;
      if (item.defenseName) return c.item.defenseName === item.defenseName;
      if (item.weaponName) return c.item.weaponName === item.weaponName;
      return false;
    });
    
    return found ? found.quantity : 0;
  }

  // Helper to determine if the INSTALL button should be enabled
  function canInstall(item: any, category: string) {
    if (!item) return false;
    const count = getQty(item);
    if (count === 0) return true; // Always allow the first one

    if (category === 'Defense') return false; // Defenses never stack
    if (category === 'Fitting' && item.isStackable !== 'TRUE') return false; // Unique fittings
    
    return true; // Weapons or stackable fittings
  }
  
  function isItemAllowed(item: any) {
    const shipTier = shipState.multipliers.classTier;
    const minTier = shipState.getTier(item.class);
    
    // If maxClass is empty or missing, assume it can go on any higher-tier ship
    const maxTier = (item.maxClass && item.maxClass !== "") 
      ? shipState.getTier(item.maxClass) 
      : 99;

    return shipTier >= minTier && shipTier <= maxTier;
  }

  let availableFittings = $derived(fittings.filter(f => isItemAllowed(f)));
  let availableDefenses = $derived(defenses.filter(d => isItemAllowed(d)));
  let availableWeapons = $derived(weapons.filter(w => isItemAllowed(w)));

  function getClassTag(className: string) {
    if (!className) return 'unknown';
    // Standardizes "Fighter " or "FIGHTER" into "fighter"
    return className.toLowerCase().trim();
  }
</script>

<div class="terminal-card">
  <h2>COMPONENTS</h2>
  
  <div class="tabs">
    <button class={activeTab === 'Fittings' ? 'active' : ''} onclick={() => activeTab = 'Fittings'}>Fittings</button>
    <button class={activeTab === 'Defenses' ? 'active' : ''} onclick={() => activeTab = 'Defenses'}>Defenses</button>
    <button class={activeTab === 'Weapons' ? 'active' : ''} onclick={() => activeTab = 'Weapons'}>Weapons</button>
  </div>

  <div class="tab-content">
    <div class="selector-wrapper">
      {#if activeTab === 'Fittings'}
        <div class="add-row">
          <TerminalSelect 
            id="fitting-select"
            options={availableFittings} 
            bind:value={selectedFitting} 
            labelKey="fittingName" 
            onSelect={(item: any) => shipState.addComponent(item, 'Fitting')} 
          />
        </div>
      {/if}

      {#if activeTab === 'Defenses'}
        <div class="add-row">
          <TerminalSelect 
            id="defense-select"
            options={availableDefenses} 
            bind:value={selectedDefense} 
            labelKey="defenseName" 
            onSelect={(item: any) => shipState.addComponent(item, 'Defense')}
          />
        </div>
      {/if}

      {#if activeTab === 'Weapons'}
        <div class="add-row">
          <TerminalSelect 
            id="weapon-select"
            options={availableWeapons} 
            bind:value={selectedWeapon} 
            labelKey="weaponName" 
            onSelect={(item: any) => shipState.addComponent(item, 'Weapon')}
          />
        </div>
      {/if}
    </div>
  </div>

  {#if shipState.components.length > 0}
    <hr>
    <table class="terminal-table">
      <thead>
        <tr>
          <th>TYPE</th>
          <th>SYSTEM</th>
          <th>QTY</th>
          <th>REMOVE</th>
        </tr>
      </thead>
      <tbody>
        {#each shipState.components as comp}
          <tr>
            <td style="font-size: 0.8em; opacity: 0.8;">{comp.category.toUpperCase()}</td>
            <td class="item-name {getClassTag(comp.item.class)}">
              {comp.item.fittingName || comp.item.defenseName || comp.item.weaponName}
            </td>
            <td>
              <div class="qty-container">
                <span class="qty-number">{comp.quantity}</span>
                
                <div class="qty-actions">
                  <button 
                    class="btn-icon" 
                    disabled={!canInstall(comp.item, comp.category)}
                    onclick={() => shipState.addComponent(comp.item, comp.category)}
                  >
                    +
                  </button>

                  <button 
                    class="btn-icon {comp.quantity <= 1 ? 'hidden-space' : ''}" 
                    onclick={() => shipState.removeComponent(comp.id, false)}
                  >
                    -
                  </button>
                </div>
              </div>
            </td>
            <td><button class="btn-danger" title="Remove All" onclick={() => shipState.removeComponent(comp.id, true)}>X</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  /* --- ADD ROW --- */
  .add-row {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }
  /* --- TERMINAL TABLE --- */
  .terminal-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1.5rem;
  }
  .terminal-table th, .terminal-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px dashed var(--border-subtle);
  }
  .terminal-table th {
    color: var(--text-dim);
    font-weight: normal;
    border-bottom: 1px solid var(--accent-amber);
  }
  
  /* Column Locks */
  .terminal-table th:nth-child(3), .terminal-table td:nth-child(3) {
    width: 120px;
    text-align: right;
  }
  .terminal-table th:last-child, .terminal-table td:last-child {
    width: 80px;
    text-align: center;
  }

  .selector-wrapper {
    width: 50%;
  }

  /* --- QTY CONTROLS --- */
  .qty-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: space-between;
    min-width: 100px;
  }
  .qty-number {
    font-weight: bold;
    min-width: 1.5rem;
    display: inline-block;
  }
  .qty-actions {
    display: flex;
    gap: 0.25rem;
  }
  .hidden-space {
    visibility: hidden;
    pointer-events: none;
  }

  .item-name {
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .item-name.fighter { color: var(--fighter-green); }

  .item-name.frigate { color: var(--frigate-blue); }

  .item-name.cruiser { color: var(--cruiser-purple); }

  .item-name.capital { color: var(--capital-red); }

  /* --- SPECIFIC BUTTONS --- */
  .btn-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
  }
  .btn-danger {
    color: var(--accent-red);
    border-color: var(--accent-red);
  }
  .btn-danger:hover {
    background-color: var(--accent-red);
    color: var(--bg-void);
  }
</style>