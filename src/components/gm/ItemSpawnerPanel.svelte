<script lang="ts">
  import { dbState } from '../../lib/dbState.svelte';
  import { toastState } from '../../lib/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  const categoryOptions = [
    { label: 'Weapon', value: 'Weapon' },
    { label: 'Armor', value: 'Armor' },
    { label: 'Consumable', value: 'Consumable' },
    { label: 'Pretech', value: 'Pretech' },
    { label: 'Trade Good', value: 'Trade Good' }
  ];

  const rarityOptions = [
    { label: 'Common', value: 'common' },
    { label: 'Uncommon', value: 'uncommon' },
    { label: 'Rare', value: 'rare' },
    { label: 'Epic', value: 'epic' },
    { label: 'Legendary', value: 'legendary' }
  ];

  let spawnName = $state('');
  let spawnCategory = $state(categoryOptions[0]);
  let spawnRarity = $state(rarityOptions[0]);
  let spawnMass = $state(1);
  let spawnQty = $state(1);

  async function handleSpawn() {
    if (!spawnName) return;
    await dbState.spawnItem(spawnName, spawnCategory.value, spawnRarity.value, spawnMass, spawnQty);
    spawnName = ''; 
    toastState.notify('ITEM SPAWNED');
  } 
</script>

<TerminalPanel title="CARGO SPAWNER" extraClass="gm-panel">
  <div class="input-group">
    <label for="spawn-name">ITEM NAME</label>
    <input type="text" id="spawn-name" bind:value={spawnName} class="terminal-input" placeholder="e.g. Pretech Artifact" />
  </div>

  <div class="input-row">
    <div class="input-group flex-2 no-margin">
      <label for="spawn-category" class="sel-label">CATEGORY</label>
      <TerminalSelect options={categoryOptions} bind:value={spawnCategory} id="cat-sel" showPopup={false} />
    </div>

    <div class="input-group flex-2 no-margin">
      <label for="spawn-rarity" class="sel-label">RARITY</label>
      <TerminalSelect options={rarityOptions} bind:value={spawnRarity} id="rarity-sel" showPopup={false} />
    </div>
    
    <div class="input-group flex-1 no-margin">
      <label for="spawn-mass" class="sel-label">MASS</label>
      <input type="number" id="spawn-mass" bind:value={spawnMass} class="terminal-input" min="0" step="0.5" />
    </div>

    <div class="input-group flex-1 no-margin">
      <label for="spawn-qty" class="mass-label">QTY</label>
      <input type="number" id="spawn-qty" bind:value={spawnQty} class="terminal-input" min="1" step="1" />
    </div>
  </div>

  <button class="btn-action btn-full-cyan" onclick={handleSpawn}>
    SPAWN ITEM IN CARGO
  </button>
</TerminalPanel>