<script lang="ts">
  import defenses from '../../data/ship/defenses.json';
  import fittings from '../../data/ship/fittings.json';
  import weapons from '../../data/ship/weapons.json';
  import { createShipState, type MasterShipState } from '../../lib/states/shipState.svelte';
  import { toShipComponentRow } from '../../lib/ui/terminalItems';
  import type { InstalledComponent } from '../../lib/types';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  
  let {
    shipyardState: localState = createShipState()
  }: {
    shipyardState?: MasterShipState;
  } = $props();

  let activeTab = $state('Fittings');

  let selectedFitting = $state<any>(null);
  let selectedDefense = $state<any>(null);
  let selectedWeapon = $state<any>(null);

  let availableFittings = $derived(fittings.filter(f => isItemAllowed(f)));
  let availableDefenses = $derived(defenses.filter(d => isItemAllowed(d)));
  let availableWeapons = $derived(weapons.filter(w => isItemAllowed(w)));
  let componentRows = $derived(
    localState.blueprint.components.map((component) => (
      toShipComponentRow(component as InstalledComponent, localState.blueprint.multipliers)
    ))
  );

  $effect(() => {
    if (availableFittings.length > 0) selectedFitting = availableFittings[0];
    if (availableDefenses.length > 0) selectedDefense = availableDefenses[0];
    if (availableWeapons.length > 0) selectedWeapon = availableWeapons[0];
  });

  function getQty(item: any) {
    if (!item) return 0;
    
    const found = localState.blueprint.components.find(c => {
      if (item.fittingName) return c.item.fittingName === item.fittingName;
      if (item.defenseName) return c.item.defenseName === item.defenseName;
      if (item.weaponName) return c.item.weaponName === item.weaponName;
      return false;
    });
    
    return found ? found.quantity : 0;
  }

  function canInstall(item: any, category: string) {
    if (!item) return false;
    const count = getQty(item);
    if (count === 0) return true;

    if (category === 'Defense') return false;
    if (category === 'Fitting' && item.isStackable !== 'TRUE') return false;
    
    return true;
  }
  
  function isItemAllowed(item: any) {
    const shipTier = localState.blueprint.multipliers.classTier;
    const minTier = localState.blueprint.getTier(item.class);
    const maxTier = (item.maxClass && item.maxClass !== '') 
      ? localState.blueprint.getTier(item.maxClass) 
      : 99;

    return shipTier >= minTier && shipTier <= maxTier;
  }

  function getComponent(row: TerminalItemListRow) {
    return localState.blueprint.components.find(component => component.id === row.id);
  }

  function canInstallRow(row: TerminalItemListRow) {
    const component = getComponent(row);
    return component ? canInstall(component.item, component.category) : false;
  }

  function isStackableRow(row: TerminalItemListRow) {
    const component = getComponent(row);
    if (!component) return false;
    if (component.category === 'Defense') return false;
    if (component.category === 'Fitting') return component.item.isStackable === 'TRUE';
    return true;
  }

  function installOne(row: TerminalItemListRow) {
    const component = getComponent(row);
    if (!component || !canInstall(component.item, component.category)) return;
    localState.blueprint.addComponent(component.item, component.category);
  }

  function removeOne(row: TerminalItemListRow) {
    localState.blueprint.removeComponent(row.id, false);
  }

  function removeAll(row: TerminalItemListRow) {
    localState.blueprint.removeComponent(row.id, true);
  }
</script>

{#snippet componentActions(row: TerminalItemListRow)}
  <div class="item-actions">
    {#if isStackableRow(row)}
      <button
        class="btn-action btn-compact"
        disabled={!canInstallRow(row)}
        onclick={() => installOne(row)}
      >
        +
      </button>

      <button
        class="btn-action btn-compact"
        class:hidden-space={row.quantity <= 1}
        onclick={() => removeOne(row)}
      >
        -
      </button>
    {/if}

    <button class="btn-action-red btn-compact" title="Remove All" onclick={() => removeAll(row)}>
      X
    </button>
  </div>
{/snippet}

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
            tooltipScale={localState.blueprint.multipliers}
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
            tooltipScale={localState.blueprint.multipliers}
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
            tooltipScale={localState.blueprint.multipliers}
            onSelect={(item: any) => localState.blueprint.addComponent(item, 'Weapon')}
          />
        </div>
      {/if}
    </div>
  </div>

  <TerminalItemList
    items={componentRows}
    emptyMessage="NO COMPONENTS INSTALLED"
    rowActions={componentActions}
  />
</TerminalPanel>

<style>
  .add-row {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }

  .selector-wrapper {
    width: 50%;
  }

  .hidden-space {
    visibility: hidden;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .selector-wrapper {
      width: 100%;
    }
  }
</style>
