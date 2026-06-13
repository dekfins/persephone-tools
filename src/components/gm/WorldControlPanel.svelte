<script lang="ts">
  import { campaignState } from '../../lib/states/campaignState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import poisData from '../../data/celestial/pois.json';
  
  let timeAdjust = $state(1);
  let teleportTarget = $state(poisData[0]);
  let canManageTimeline = $derived(dbState.isGM);

  async function adjustTime() {
    if (!canManageTimeline) return;

    campaignState.adjustCurrentDay(timeAdjust);
    await dbState.syncTimelineToCloud();
    toastState.notify(`TIMELINE SHIFTED BY ${timeAdjust} DAYS`);
    timeAdjust = 1;
  }

  async function forceTeleport() {
    if (!canManageTimeline || !teleportTarget) return;

    campaignState.forceLocation(teleportTarget.id);
    await dbState.syncTimelineToCloud();
    toastState.notify(`FLEET TRANSLOCATED TO ${teleportTarget.name.toUpperCase()}`);
  }
</script>

{#if canManageTimeline}
  <TerminalPanel title="UNIVERSE CONTROLS" extraClass="gm-panel">
  
    <div class="input-row mb-1">
      <div class="input-group flex-2 no-margin">
        <label for="time-adjust">TIME SKIP (DAYS +/-)</label>
        <input type="number" id="time-adjust" bind:value={timeAdjust} class="terminal-input" step="0.25" />
      </div>
      <div class="input-group flex-1 no-margin">
        <label for="adjust-time">&nbsp;</label>
        <button class="btn-action btn-full-cyan" id="adjust-time" onclick={adjustTime}>
          ADVANCE TIME
        </button>
      </div>
    </div>

    <div class="input-row no-margin">
      <div class="input-group flex-2 no-margin">
        <label for="teleport-sel" class="sel-label">FORCE TELEPORT LOCATION</label>
        <TerminalSelect
          id="teleport-sel"
          options={poisData}
          bind:value={teleportTarget}
          labelKey="name"
          showPopup={false}
        />
      </div>
      <div class="input-group flex-1 no-margin">
        <label for="apply-override">&nbsp;</label>
        <button class="btn-action btn-full-red" onclick={forceTeleport}>
          TELEPORT
        </button>
      </div>
    </div>

  </TerminalPanel>
{/if}
