<script lang="ts">
  import { campaignState } from '../../lib/states/campaignState.svelte';
  import { dbState } from '../../lib/states/dbState.svelte';
  import { getTransitTelemetry } from '../../lib/navmap/orbitalMath';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid, { type TerminalStatGridItem } from '../shared/TerminalStatGrid.svelte';
  import type { PoiDef } from '../../lib/types';
  import poisData from '../../data/celestial/pois.json';
  
  const pois = poisData as PoiDef[];

  let liveFlight = $derived.by(() => {
    if (!campaignState.activeMission) return null;
    
    const telemetry = campaignState.activeMission.telemetry;
    const elapsed = campaignState.animatedDaysElapsed || 0; // Fallback to 0 instantly on launch
    
    // Safe fallback if telemetry is missing/broken due to solver bugs
    if (!telemetry) {
      return { currentVelocityKM: 0, remainingDvKM: 0, fraction: 0 };
    }
    
    const result = getTransitTelemetry(elapsed, telemetry);
    return result || { currentVelocityKM: 0, remainingDvKM: 0, fraction: 0 };
  });

  // Cross-reference our active mission string ID with pois.json to get the clean metadata
  let targetPoi = $derived.by(() => {
    const mission = campaignState.activeMission;
    if (!mission) return null;
    return pois.find(p => p.id === mission.targetName);
  });

  let canManageTimeline = $derived(dbState.isGM);
  let missionLabel = $derived(
    campaignState.activeMission
      ? targetPoi
        ? targetPoi.name.toUpperCase()
        : campaignState.activeMission.targetName.toUpperCase()
      : ''
  );
  let totalSegments = $derived(
    campaignState.activeMission
      ? Math.ceil(campaignState.activeMission.travelTime / 5)
      : 0
  );
  let currentSegment = $derived(
    campaignState.activeMission
      ? Math.min(
          Math.floor(campaignState.activeMission.daysElapsed / 5) + 1,
          totalSegments
        )
      : 0
  );
  let transitReadout = $derived.by<TerminalStatGridItem[]>(() => {
    const mission = campaignState.activeMission;
    if (!mission || !liveFlight) return [];

    return [
      {
        label: 'Destination',
        value: missionLabel
      },
      {
        label: 'Progress',
        value: `${mission.daysElapsed.toFixed(1)} / ${mission.travelTime.toFixed(1)} d`
      },
      {
        label: 'Velocity',
        value: `${liveFlight.currentVelocityKM.toFixed(2)} km/s`
      },
      {
        label: 'Remaining DV',
        value: `${liveFlight.remainingDvKM.toFixed(2)} km/s`,
        tone: 'danger'
      },
      {
        label: 'Segment',
        value: `${currentSegment} / ${totalSegments}`
      }
    ];
  });
  let isFinalSegment = $derived(
    campaignState.activeMission
      ? campaignState.activeMission.travelTime - campaignState.activeMission.daysElapsed <= 5
      : false
  );

  async function advanceTransitSegment() {
    if (!canManageTimeline) return;

    campaignState.advanceSegment();
    if (campaignState.isTransitComplete) {
      campaignState.completeTransit();
    }

    // Transit advancement changes time, active flight/location, fuel, and conditions.
    await dbState.syncTimelineToCloud();
    await dbState.syncShipStateToCloud();
  }

  async function undoTransitSegment() {
    if (!canManageTimeline) return;

    campaignState.revertSegment();
    await dbState.syncTimelineToCloud();
    await dbState.syncShipStateToCloud();
  }
</script>

{#if campaignState.activeMission && liveFlight}
  <TerminalPanel title="STATUS: IN TRANSIT">
    {#if !canManageTimeline}
      <div class="readonly-banner">
        PLAYER READOUT MODE: GM TIMELINE CONTROL REQUIRED
      </div>
    {/if}

    <div class="active-transit-readout" class:readonly={!canManageTimeline}>
      <TerminalStatGrid items={transitReadout} columns={3} dense valueTone="main" />
    </div>
    
    {#if canManageTimeline}
      <div class="transit-actions">
        <button class="btn-action advance-action" onclick={advanceTransitSegment}>
          {isFinalSegment ? 'ARRIVE' : 'ADVANCE SEGMENT'}
        </button>
        {#if campaignState.hasUndoBackup}
          <button class="btn-action btn-revert" onclick={undoTransitSegment}>
            UNDO
          </button>
        {/if}
      </div>
    {:else}
      <button class="btn-action timeline-readonly" disabled>
        GM AUTHORIZATION REQUIRED
      </button>
    {/if}
  </TerminalPanel>
{/if}

<style>
  .readonly-banner {
    margin-bottom: 0.85rem;
    padding: 0.5rem;
    border: var(--border-subtle);
    background: var(--bg-void);
    color: var(--text-dim);
    font-family: var(--font-terminal, monospace);
    font-size: 0.72rem;
    text-align: center;
  }

  .active-transit-readout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .active-transit-readout.readonly {
    margin-bottom: 0;
  }

  .transit-actions {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(6rem, 1fr);
    gap: 8px;
    margin-top: 1rem;
  }

  .advance-action {
    min-width: 0;
  }

  .btn-revert {
    background-color: transparent; /* slate-600 */
    border-color: var(--accent-red, #ef4444);
    color: var(--accent-red, #ef4444);
  }

  .btn-revert:hover {
    background: var(--accent-red, #ef4444) !important;
    color: #fff;
  }

  .timeline-readonly {
    width: 100%;
    margin-top: 1rem;
    color: var(--text-dim);
    border: var(--border-subtle);
  }

  @media (max-width: 700px) {
    .transit-actions {
      grid-template-columns: 1fr;
    }
  }
</style>
