<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import fittings from '../../data/fittings.json';
  import weapons from '../../data/weapons.json';
  import defenses from '../../data/defenses.json';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  function cycleStatus(comp: any) {
    const currentStatus = comp.status || "Online"; 
    
    if (currentStatus === "Online") comp.status = "Damaged";
    else if (currentStatus === "Damaged") comp.status = "Destroyed";
    else comp.status = "Online";
  }

  function getClassTag(className: string) {
    if (!className) return 'unknown';
    return className.toLowerCase().trim();
  }

  function getLiveAttribute(comp: any) {
    const masterList = [...fittings, ...weapons, ...defenses] as any[];
    
    const targetName = comp.item.fittingName || comp.item.weaponName || comp.item.defenseName;

    const liveItem = masterList.find(i => {
      const masterName = i.fittingName || i.weaponName || i.defenseName;
      return masterName === targetName;
    });

    return liveItem?.attribute || comp.item.attribute || "DATA LINK SEVERED";
  }

  // --- MID-FLIGHT MARKET LOGIC ---
  let isMarketOpen = $state(false);

  const marketInventories = {
    Fitting: fittings.map(f => ({ ...f, displayName: f.fittingName})),
    Weapon: weapons.map(w => ({ ...w, displayName: w.weaponName})),
    Defense: defenses.map(d => ({ ...d, displayName: d.defenseName}))
  };

  const categoryOptions = [
    { label: 'FITTINGS', value: 'Fitting' },
    { label: 'WEAPONS', value: 'Weapon' },
    { label: 'DEFENSES', value: 'Defense' }
  ];

  let selectedCategoryObj = $state(categoryOptions[0]);
  let selectedItem = $state<any>(null);

  let availableItems = $derived.by(() => {
    const rawList = marketInventories[selectedCategoryObj.value as keyof typeof marketInventories] || [];
    const currentTier = shipState.multipliers.classTier;
    return rawList.filter((item: any) => shipState.getTier(item.class) <= currentTier);
  });

  $effect(() => {
    selectedCategoryObj; // Track dependency
    selectedItem = null;
  });

  function handleAddItem() {
    if (selectedItem) {
      shipState.addComponent(selectedItem, selectedCategoryObj.value);
      selectedItem = null;
      isMarketOpen = false;
    }
  }
</script>

<TerminalPanel title="Internal Systems">
  <div class="systems-list">
    {#each shipState.components as comp}
      <div class="system-row is-{comp.status?.toLowerCase() || 'online'}">
        <div class="sys-primary">
          <span class="cat-label">[{comp.category.substring(0,3).toUpperCase()}]</span> 
          <span class="item-label {getClassTag(comp.item.class)}">
            {comp.item.fittingName || comp.item.defenseName || comp.item.weaponName}
            {#if comp.quantity > 1} 
              <span class="qty-badge">x{comp.quantity}</span>
            {/if}
          </span>
        </div>

        <div class="sys-secondary">
          <span class="sys-desc">
            {getLiveAttribute(comp)}
          </span>
        </div>

        <div class="sys-action">
          <button 
            class="status-btn status-{(comp.status || 'Online').toLowerCase()}"
            onclick={() => cycleStatus(comp)}
          >
            {(comp.status || 'Online').toUpperCase()}
          </button>
          
          <button 
            class="btn-remove" 
            onclick={() => shipState.removeComponent(comp.id)}
            title="Remove Component"
          >
            X
          </button>
        </div>
      </div>
    {/each}

    <button class="btn-add-item" onclick={() => isMarketOpen = !isMarketOpen}>
      {isMarketOpen ? "- Cancel installation..." : "+ Add item..."}
    </button>

    {#if isMarketOpen}
      <div class="market-popup">
        <div class="market-row">
          <div class="market-field">
            <label for="category">CATEGORY</label>
            <TerminalSelect
              id="market-cat-select"
              options={categoryOptions}
              bind:value={selectedCategoryObj}
              labelKey="label"
            />
          </div>
          <div class="market-field" style="flex: 2;">
            <label for="available-components">AVAILABLE COMPONENTS</label>
            <TerminalSelect
              id="market-item-select"
              options={availableItems}
              bind:value={selectedItem}
              labelKey="displayName"
              popupSide="left"
            />
          </div>
        </div>
        
        <button 
          class="btn-install" 
          disabled={!selectedItem}
          onclick={handleAddItem}
        >
          INSTALL COMPONENT
        </button>
      </div>
    {/if}
  </div>
</TerminalPanel>

<style>
  /* PULLS THE LIST UP HIGHER */
  .systems-list {
    margin-top: -0.5rem; 
  }

  .systems-list::-webkit-scrollbar {
    width: 6px;
  }

  .systems-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-left: 1px dashed var(--border-subtle, #333);
  }

  .systems-list::-webkit-scrollbar-thumb {
    background: var(--ui-cyan, #00aacc);
    border-radius: 2px;
  }

  .systems-list::-webkit-scrollbar-thumb:hover {
    background: var(--accent-amber, #ffb000);
  }

  .system-row { 
    display: grid;
    grid-template-columns: 2.5fr 3.5fr 120px; /* Changed from 100px */
    gap: 1.5rem; 
    align-items: center; 
    border-bottom: 1px dashed var(--border-subtle); 
    padding: 0.2rem 0;
    min-width: 0;
  }

  /* Align the buttons together */
  .sys-action {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
  }

  /* Style the new remove button */
  .btn-remove {
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 1.4rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 0.2rem;
    transition: color 0.2s;
  }

  .btn-remove:hover {
    color: var(--accent-red);
  }

  .system-row.is-destroyed .sys-primary,
  .system-row.is-destroyed .sys-secondary {
    opacity: 0.3;
    text-decoration: line-through;
  }

  .system-row.is-damaged .sys-secondary {
    opacity: 0.7;
    color: var(--accent-amber);
  }

  /* COLUMN 1 */
  .sys-primary { 
    display: flex;
    gap: 0.5rem; 
    align-items: baseline; 
    min-width: 0;
    font-size: 0.8rem;
  }
  .cat-label {
    font-size: 0.8em;
    opacity: 0.8;
    color: var(--text-dim);
  }
  .item-label { 
    font-weight: 500; 
    text-transform: uppercase; 
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; 
  }
  .qty-badge {
    color: var(--ui-cyan);
    margin-left: 0.25rem;
  }

  .sys-secondary {
    font-family: var(--font-terminal, monospace);
    font-size: 0.8rem;
    color: var(--text-main);
    line-height: 1.4;
  }
  .sys-desc {
    display: block;
  }

  /* COLUMN 3 */
  .sys-action {
    display: flex;
    justify-content: flex-end;
  }
  .status-btn {
    font-family: monospace;
    font-size: 0.8rem;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    border: 1px solid;
    background: transparent;
    width: 100%;
  }
  .status-online {
    color: var(--ui-cyan);
    border-color: transparent;
  }
  .status-damaged {
    color: var(--accent-amber);
    border-color: transparent;
  }
  .status-destroyed {
    color: var(--accent-red);
    border-color: transparent;
    text-decoration: line-through;
  }

  .item-label.fighter { color: var(--fighter-green); }
  .item-label.frigate { color: var(--frigate-blue); }
  .item-label.cruiser { color: var(--cruiser-purple); }
  .item-label.capital { color: var(--capital-red); }

  /* --- MID-FLIGHT MARKET STYLES --- */
  .btn-add-item {
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-family: var(--font-terminal, monospace);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.8rem 0 0.2rem 0;
    text-align: left;
    width: 100%;
  }

  .btn-add-item:hover {
    color: var(--text-main);
  }

  .market-popup {
    margin-top: 0.5rem;
    padding: 1rem;
    border: 1px solid var(--accent-amber);
    background: rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .market-row {
    display: flex;
    gap: 1rem;
  }

  .market-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .market-field label {
    font-size: 0.75rem;
    color: var(--text-dim);
    letter-spacing: 0.05em;
  }

  .btn-install {
    background: transparent;
    border: 1px solid var(--accent-amber);
    color: var(--accent-amber);
    padding: 0.6rem;
    font-family: var(--font-terminal, monospace);
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.2s ease;
  }

  .btn-install:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.15);
  }

  .btn-install:disabled {
    border-color: var(--text-dim);
    color: var(--text-dim);
    cursor: not-allowed;
  }
</style>