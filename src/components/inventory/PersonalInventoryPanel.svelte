<script lang="ts">
  import { dbState } from '../../lib/dbState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  function moveToShip(itemId: string) {
    dbState.transferItem(itemId, "SHIP_INVENTORY");
  }
</script>

<TerminalPanel title="PERSONAL LOADOUT: {dbState.activeCharacter?.name || 'UNKNOWN'}" extraClass="ledger-panel">
  <div class="wallet-box">
    <div class="stat-row">
      <span class="label-text">PERSONAL WALLET:</span>
      <span class="value-text" style="color: var(--accent-amber); font-size: 1.2rem;">
        {dbState.activeCharacter?.personal_credits.toLocaleString() || 0} CR
      </span>
    </div>
    <div class="stat-row">
      <span class="label-text">RAD STACKS:</span>
      <span class="value-text" style="color: {(dbState.activeCharacter?.rads || 0) > 4 ? 'var(--accent-red)' : 'var(--ui-bright)'};">
        {dbState.activeCharacter?.rads || 0} / 10
      </span>
    </div>
  </div>

  <h3 class="section-title">BACKPACK</h3>
  
  {#if dbState.personalInventory.length === 0}
    <div class="terminal-alert empty-state">BACKPACK EMPTY</div>
  {:else}
    <ul class="item-list">
      {#each dbState.personalInventory as item}
        <li class="item-row">
          <div class="item-details">
            <span class="item-name loot-{item.rarity}">{item.name.toUpperCase()}</span>
            <span class="item-meta">[{item.category}] • {item.mass}t • Qty: {item.quantity}</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            {#if dbState.activeCharacter?.role === 'GM'}
              <button class="btn-action-red btn-compact" onclick={() => dbState.deleteItem(item.id)}>
                X
              </button>
            {/if}

            <button class="btn-action btn-compact" onclick={() => moveToShip(item.id)}>
              STOW
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</TerminalPanel>