<script lang="ts">
  import { createShipState } from '../../lib/states/shipState.svelte';
  import fittings from '../../data/ship/fittings.json';
  import defenses from '../../data/ship/defenses.json';
  import weapons from '../../data/ship/weapons.json';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  
  // Create local state instance for this component
  const localState = createShipState();

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
    
    const found = localState.blueprint.components.find(c => {
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
    const shipTier = localState.blueprint.multipliers.classTier;
    const minTier = localState.blueprint.getTier(item.class);
    
    // If maxClass is empty or missing, assume it can go on any higher-tier ship
    const maxTier = (item.maxClass && item.maxClass !== "") 
      ? localState.blueprint.getTier(item.maxClass) 
      : 99;

    return shipTier >= minTier && shipTier <= maxTier;
  }

  let availableFittings = $derived(fittings.filter(f => isItemAllowed(f)));
  let availableDefenses = $derived(defenses.filter(d => isItemAllowed(d)));
  let availableWeapons = $derived(weapons.filter(w => isItemAllowed(w)));

  function getClassTag(className: string) {
    if (!className) return 'unknown';
    return className.toLowerCase().trim();
  }
</script>

<TerminalPanel title="COMPONENTS">
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
            onSelect={(item: any) => localState.blueprint.addComponent(item, 'Fitting')} 
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
            onSelect={(item: any) => localState.blueprint.addComponent(item, 'Defense')}
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
            onSelect={(item: any) => localState.blueprint.addComponent(item, 'Weapon')}
          />
        </div>
{/if}
    </div>
  </div>

  {#if localState.blueprint.components.length > 0}
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
        {#each localState.blueprint.components as comp}
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
                    onclick={() => localState.blueprint.addComponent(comp.item, comp.category)}
                  >
                    +
                  </button>

                  <button 
                    class="btn-icon {comp.quantity <= 1 ? 'hidden-space' : ''}" 
                    onclick={() => localState.blueprint.removeComponent(comp.id, false)}
                  >
                    -
                  </button>
                </div>
              </div>
            </td>
            <td><button class="btn-danger" title="Remove All" onclick={() => localState.blueprint.removeComponent(comp.id, true)}>X</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</TerminalPanel>

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
    padding: 0.3rem 1.5rem 0.2rem 0;
    font-size: 0.8rem;
    text-align: left;
    border-bottom: 1px dashed var(--border-subtle);
  }
  .terminal-table th {
    color: var(--text-dim);
    font-weight: normal;
    border-bottom: 1px solid var(--accent-amber);
    padding-bottom: 0.5rem;
  }
    /* Add a gap between the header line and the first item in the list */
  .terminal-table tbody tr:first-child td {
    padding-top: 1rem;
  }
  
  /* Column Locks */
  .terminal-table th:nth-child(3), .terminal-table td:nth-child(3) {
    width: 120px;
    text-align: right;
  }
  .terminal-table th:last-child, .terminal-table td:last-child {
    width: 60px;
    text-align: right;
    padding-right: 0;
  }

  .selector-wrapper {
    width: 50%;
  }

  /* --- QTY CONTROLS --- */
  .qty-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .qty-number {
    font-family: var(--font-terminal, monospace);
    font-weight: bold;
    min-width: 1.5rem;
    display: inline-block;
    color: var(--ui-cyan);
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
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 1.4rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 0.2rem;
    transition: color 0.2s;
  }
  .btn-danger:hover {
    background: transparent;
    color: var(--accent-red);
  }
</style>