<script lang="ts">
  import { campaignState } from "../../lib/states/campaignState.svelte";
  import { dbState } from "../../lib/states/dbState.svelte";
  import poisData from '../../data/celestial/pois.json';
  import type { ActiveMission, CharacterRecord, PoiDef } from '../../lib/types';

  type PayoutRecipientShare = {
    characterId: string;
    name: string;
    amount: number;
  };

  type PayoutLogDetails = {
    missionTarget: {
      id: string;
      name: string;
    };
    totalPayout: number;
    shipCut: number;
    personalCut: number;
    recipients: PayoutRecipientShare[];
    loot: {
      item: string;
      rarity: string;
      equipmentId?: string;
      quantity?: number;
    } | null;
    summary: string;
  };

  const pois = poisData as PoiDef[];
  let targetPoiName = $derived(campaignState.completedMission ? pois.find(p => p.id === campaignState.completedMission?.targetName)?.name || campaignState.completedMission.targetName : '');
  let payoutRecipients = $derived.by<CharacterRecord[]>(() => {
    if (dbState.activeCampaignRosterCharacters.length > 0) return dbState.activeCampaignRosterCharacters;
    return dbState.activeCharacter ? [dbState.activeCharacter] : [];
  });
  let hasCashPayout = $derived((campaignState.completedMission?.payoutCredits ?? 0) > 0);
  let hasLootPayout = $derived(Boolean(
    campaignState.completedMission?.lootReward ||
    (campaignState.completedMission?.lootItem && campaignState.completedMission?.lootRarity)
  ));
  let completedLootDisplay = $derived(
    campaignState.completedMission?.lootReward?.displayName ??
    campaignState.completedMission?.lootItem ??
    ''
  );

  function formatCredits(amount: number) {
    return `${amount.toLocaleString()} CR`;
  }

  function getPoiName(poiId: string) {
    return pois.find(poi => poi.id === poiId)?.name || poiId;
  }

  function getMissionLootDetails(mission: ActiveMission): PayoutLogDetails['loot'] {
    if (mission.lootReward) {
      return {
        item: mission.lootReward.displayName,
        rarity: mission.lootReward.rarity,
        equipmentId: mission.lootReward.equipmentId,
        quantity: mission.lootReward.quantity
      };
    }

    if (mission.lootItem && mission.lootRarity) {
      return { item: mission.lootItem, rarity: mission.lootRarity };
    }

    return null;
  }

  function buildPayoutLogDetails(mission: ActiveMission, recipients: CharacterRecord[]): PayoutLogDetails {
    const totalPayout = Math.max(0, Math.floor(mission.payoutCredits ?? 0));
    const shipCut = Math.floor(totalPayout * 0.5);
    const personalCut = totalPayout - shipCut;
    const crewShare = recipients.length > 0
      ? Math.floor(personalCut / recipients.length)
      : 0;
    const remainder = recipients.length > 0 ? personalCut % recipients.length : 0;
    const recipientShares = personalCut > 0
      ? recipients.map((recipient, index) => ({
          characterId: recipient.id,
          name: recipient.name,
          amount: crewShare + (index < remainder ? 1 : 0)
        }))
      : [];
    const loot = getMissionLootDetails(mission);
    const cashSummary = totalPayout > 0
      ? `${formatCredits(totalPayout)} total; ${formatCredits(shipCut)} to ship; ${formatCredits(personalCut)} ${recipients.length > 0 ? `split across ${recipients.length} crew` : 'not assigned because no crew received personal shares'}`
      : 'no cash payout';
    const lootSummary = loot ? `; salvage: ${loot.item} (${loot.rarity})` : '';

    return {
      missionTarget: {
        id: mission.targetName,
        name: getPoiName(mission.targetName)
      },
      totalPayout,
      shipCut,
      personalCut,
      recipients: recipientShares,
      loot,
      summary: `Mission payout claimed: ${cashSummary}${lootSummary}.`
    };
  }

  async function claimReward() {
    if (!dbState.isGM || !campaignState.completedMission) return;
    
    const mission = campaignState.completedMission;
    const payoutDetails = buildPayoutLogDetails(mission, payoutRecipients);
    
    // 1. Distribute the cash (50% to ship, 50% split among rostered crew)
    if (payoutDetails.shipCut > 0) {
      await dbState.updateShipCredits(payoutDetails.shipCut);
    }
    if (payoutDetails.personalCut > 0 && payoutDetails.recipients.length > 0) {
      for (const recipient of payoutDetails.recipients) {
        if (recipient.amount > 0) {
          await dbState.updatePersonalCredits(recipient.characterId, recipient.amount);
        }
      }
    }

    // 2. Spawn the loot directly into the Cloud Inventory!
    if (mission.lootReward) {
      await dbState.spawnCatalogItem(mission.lootReward.equipmentId, mission.lootReward.quantity);
    } else if (mission.lootItem && mission.lootRarity) {
      await dbState.spawnItem(mission.lootItem, "Trade Good", mission.lootRarity, 1, 1);
    }

    // 3. Clear the completed mission
    campaignState.completedMission = null;

    // 4. Tell the cloud the active flight is officially over
    await dbState.syncTimelineToCloud();

    // 5. Record one high-level payout summary as the newest campaign log event.
    await dbState.createCampaignLog(
      'mission_payout',
      payoutDetails.summary,
      {
        missionTarget: payoutDetails.missionTarget,
        totalPayout: payoutDetails.totalPayout,
        shipCut: payoutDetails.shipCut,
        personalCut: payoutDetails.personalCut,
        recipients: payoutDetails.recipients,
        loot: payoutDetails.loot
      },
      null
    );
  }
</script>

{#if dbState.isGM && campaignState.completedMission && (hasCashPayout || hasLootPayout)}
  <div class="modal-backdrop">
    <div class="modal-content">
      
      <h2 class="modal-title">CONTRACT COMPLETE</h2>
      <hr class="modal-divider" />

      <div class="info-row">
        <span>DESTINATION REACHED:</span>
        <span class="info-value">{targetPoiName.toUpperCase()}</span>
      </div>

      {#if hasCashPayout}
        <div class="info-row payout-row">
          <span>TOTAL PAYOUT:</span>
          <span class="payout-value">
            {campaignState.completedMission.payoutCredits?.toLocaleString()} CR
          </span>
        </div>
      {/if}

      {#if hasLootPayout}
        <div class="loot-box">
          <span class="loot-label">SALVAGE SECURED:</span>
          <span class="info-value">{completedLootDisplay.toUpperCase()}</span>
        </div>
      {/if}

      {#if hasCashPayout}
        <p class="flavor-text">
          50% allocated to Ship Maintenance Slush Fund. The remaining 50% will be split across {payoutRecipients.length > 0 ? `${payoutRecipients.length} rostered crew account${payoutRecipients.length === 1 ? '' : 's'}` : 'the available crew roster'}.
        </p>
      {/if}

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
