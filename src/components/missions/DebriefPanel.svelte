<script lang="ts">
  import { crewState } from "../../lib/states/crewState.svelte";
  import { campaignState } from "../../lib/states/campaignState.svelte";
  import { dbState } from "../../lib/states/dbState.svelte";
  import poisData from '../../data/pois.json';
  import type { PoiDef } from '../../lib/types';

  const pois = poisData as PoiDef[];
  let targetPoiName = $derived(campaignState.completedMission ? pois.find(p => p.id === campaignState.completedMission?.targetName)?.name || campaignState.completedMission.targetName : '');

  async function claimReward() {
    if (!campaignState.completedMission) return;
    
    const mission = campaignState.completedMission;
    const totalPayout = mission.payoutCredits || 0;
    const shipCut = Math.floor(totalPayout * 0.5);
    const personalCut = totalPayout - shipCut;
    
    // 1. Distribute the cash (50% to ship, 50% split among crew)
    if (shipCut > 0) {
      await dbState.updateShipCredits(shipCut);
    }
    if (personalCut > 0) {
      await dbState.updatePersonalCredits(dbState.activeUserId, personalCut);
    }

    // 2. Spawn the loot directly into the Cloud Inventory!
    if (mission.lootItem && mission.lootRarity) {
      await dbState.spawnItem(mission.lootItem, "Trade Good", mission.lootRarity, 1, 1);
    }

    // 3. Clear the completed mission
    campaignState.completedMission = null;

    // 4. Tell the cloud the active flight is officially over
    await dbState.syncTimelineToCloud();
  }
</script>

{#if campaignState.completedMission}
  <div class="modal-backdrop">
    <div class="modal-content">
      
      <h2 class="modal-title">CONTRACT COMPLETE</h2>
      <hr class="modal-divider" />

      <div class="info-row">
        <span>DESTINATION REACHED:</span>
        <span class="info-value">{targetPoiName.toUpperCase()}</span>
      </div>

      <div class="info-row payout-row">
        <span>TOTAL PAYOUT:</span>
        <span class="payout-value">
          {campaignState.completedMission.payoutCredits?.toLocaleString()} CR
        </span>
      </div>

      {#if campaignState.completedMission.lootItem}
        <div class="loot-box">
          <span class="loot-label">SALVAGE SECURED:</span>
          <span class="info-value">{campaignState.completedMission.lootItem.toUpperCase()}</span>
        </div>
      {/if}

      <p class="flavor-text">
        Funds will be split evenly. 50% allocated to Ship Maintenance Slush Fund. The remaining 50% has been wired to individual crew accounts.
      </p>

      <button class="btn-action btn-claim" onclick={claimReward}>
        COLLECT PAYOUT
      </button>

    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(2, 6, 23, 0.85);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal-content {
    width: 100%;
    max-width: 500px;
    background: var(--bg-panel);
    border: 1px solid var(--fighter-green);
    box-shadow: 0 0 20px rgba(74, 222, 128, 0.2);
    padding: 1.5rem;
  }

  .modal-title {
    color: var(--fighter-green);
    font-family: var(--font-terminal);
    margin-top: 0;
  }

  .modal-divider {
    border-color: rgba(255, 255, 255, 0.1);
    margin-bottom: 1.5rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-family: var(--font-terminal);
    color: var(--text-dim);
  }

  .payout-row {
    margin-bottom: 1.5rem;
  }

  .info-value {
    color: var(--text-main);
  }

  .payout-value {
    color: var(--accent-amber);
    font-weight: bold;
    font-size: 1.2rem;
  }

  .loot-box {
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-left: 3px solid var(--ui-cyan);
    margin-bottom: 1.5rem;
    font-family: var(--font-terminal);
  }

  .loot-label {
    color: var(--text-dim);
    font-size: 0.8rem;
    display: block;
    margin-bottom: 0.3rem;
  }

  .flavor-text {
    color: var(--text-dim);
    font-size: 0.85rem;
    font-family: var(--font-terminal);
    line-height: 1.4;
    margin-bottom: 1.5rem;
  }

  .btn-claim {
    width: 100%;
    border-color: var(--fighter-green);
    color: var(--fighter-green);
  }

  .btn-claim:hover {
    background: var(--fighter-green);
    color: var(--bg-void, #0a0a0c);
  }
</style>
