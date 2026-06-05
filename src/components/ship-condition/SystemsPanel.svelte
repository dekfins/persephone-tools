<script lang="ts">
  import defenses from '../../data/ship/defenses.json';
  import fittings from '../../data/ship/fittings.json';
  import weapons from '../../data/ship/weapons.json';
  import { dbState } from '../../lib/states/dbState.svelte.ts';
  import { shipState } from '../../lib/states/shipState.svelte';
  import { toShipComponentRow } from '../../lib/terminalItems';
  import type { InstalledComponent } from '../../lib/types';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  
  const localState = shipState;

  let isMarketOpen = $state(false);

  const marketInventories = {
    Fitting: fittings.map(f => ({ ...f, displayName: f.fittingName })),
    Weapon: weapons.map(w => ({ ...w, displayName: w.weaponName })),
    Defense: defenses.map(d => ({ ...d, displayName: d.defenseName }))
  };

  const categoryOptions = [
    { label: 'FITTINGS', value: 'Fitting' },
    { label: 'DEFENSES', value: 'Defense' },
    { label: 'WEAPONS', value: 'Weapon' }
  ];

  let selectedCategoryObj = $state(categoryOptions[0]);
  let selectedItem = $state<any>(null);

  let availableItems = $derived.by(() => {
    const rawList = marketInventories[selectedCategoryObj.value as keyof typeof marketInventories] || [];
    const currentTier = localState.blueprint.multipliers.classTier;
    return rawList.filter((item: any) => localState.blueprint.getTier(item.class) <= currentTier);
  });
  let componentRows = $derived(
    localState.blueprint.components.map((component) => {
      const row = toShipComponentRow(component as InstalledComponent, localState.blueprint.multipliers);
      return {
        ...row,
        mechanics: getLiveAttribute(component)
      };
    })
  );

  $effect(() => {
    selectedCategoryObj;
    selectedItem = null;
  });

  async function cycleStatus(comp: any) {
    const currentStatus = comp.status || 'Online'; 
    
    if (currentStatus === 'Online') comp.status = 'Damaged';
    else if (currentStatus === 'Damaged') comp.status = 'Destroyed';
    else comp.status = 'Online';

    await dbState.syncShipStateToCloud();
  }

  function getLiveAttribute(comp: any) {
    const masterList = [...fittings, ...weapons, ...defenses] as any[];
    const targetName = comp.item.fittingName || comp.item.weaponName || comp.item.defenseName;

    const liveItem = masterList.find(i => {
      const masterName = i.fittingName || i.weaponName || i.defenseName;
      return masterName === targetName;
    });

    return liveItem?.attribute || comp.item.attribute || 'DATA LINK SEVERED';
  }

  function getComponent(row: TerminalItemListRow) {
    return localState.blueprint.components.find(component => component.id === row.id);
  }

  async function cycleRowStatus(row: TerminalItemListRow) {
    const component = getComponent(row);
    if (!component) return;
    await cycleStatus(component);
  }

  async function removeRow(row: TerminalItemListRow) {
    localState.blueprint.removeComponent(row.id);
    await dbState.syncShipStateToCloud();
  }

  async function handleAddItem() {
    if (selectedItem) {
      localState.blueprint.addComponent(selectedItem, selectedCategoryObj.value);
      selectedItem = null;
      isMarketOpen = false;
      await dbState.syncShipStateToCloud();
    }
  }
</script>

{#snippet systemActions(row: TerminalItemListRow)}
  <div class="item-actions">
    <button 
      class="status-btn status-{row.statusClass ?? 'online'}"
      onclick={() => cycleRowStatus(row)}
    >
      {(row.statusLabel || 'Online').toUpperCase()}
    </button>
    
    <button 
      class="btn-action-red btn-compact" 
      onclick={() => removeRow(row)}
      title="Remove Component"
    >
      X
    </button>
  </div>
{/snippet}

<TerminalPanel title="Internal Systems">
  <TerminalItemList
    items={componentRows}
    emptyMessage="NO INTERNAL SYSTEMS INSTALLED"
    rowActions={systemActions}
  />

  <button class="btn-add-item" onclick={() => isMarketOpen = !isMarketOpen}>
    {isMarketOpen ? '- Cancel installation...' : '+ Add item...'}
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
            showPopup={false}
          />
        </div>
        <div class="market-field component-field">
          <label for="available-components">AVAILABLE COMPONENTS</label>
          <TerminalSelect
            id="market-item-select"
            options={availableItems}
            bind:value={selectedItem}
            labelKey="displayName"
            popupSide="left"
            tooltipScale={localState.blueprint.multipliers}
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
</TerminalPanel>

<style>
  .status-btn {
    font-family: monospace;
    font-size: 0.8rem;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    min-width: 6.8rem;
  }

  .status-online {
    color: var(--text-main);
  }

  .status-damaged {
    color: var(--accent-amber);
  }

  .status-destroyed {
    color: var(--accent-red);
    text-decoration: line-through;
  }

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
    background: rgba(0, 0, 0, 0.3);
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

  .component-field {
    flex: 2;
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

  @media (max-width: 900px) {
    .market-row {
      flex-direction: column;
    }
  }
</style>
