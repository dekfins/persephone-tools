<script lang="ts">
  import { dbState } from '../../lib/dbState.svelte';
  import { crewState } from '../../lib/crewState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  function moveToPlayer(itemId: string) {
    dbState.transferItem(itemId, dbState.activeUserId);
  }
</script>

<TerminalPanel title="TEST SHIP" extraClass="ledger-panel">
  <div class="wallet-box">
    <div class="stat-row">
      <span class="label-text">SLUSH FUND:</span>
      <span class="value-text" style="color: var(--fighter-green); font-size: 1.2rem;">
        {crewState.shipCredits.toLocaleString()} CR 
      </span>
    </div>
    <div class="stat-row">
      <span class="label-text">KIBBLE RESERVES:</span>
      <span class="value-text">{crewState.kibbleDays} DAYS</span>
    </div>
  </div>

  <h3 class="section-title">CARGO HOLD</h3>
  {#if dbState.shipInventory.length === 0}
    <div class="terminal-alert empty-state">CARGO HOLD EMPTY</div>
  {:else}
    <ul class="item-list">
      {#each dbState.shipInventory as item}
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
            
            <button class="btn-action btn-compact" onclick={() => moveToPlayer(item.id)}>
              TAKE
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</TerminalPanel>