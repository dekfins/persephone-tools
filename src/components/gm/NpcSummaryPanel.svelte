<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import type { CharacterRecord, NpcCombatProfile, NpcProfile } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid, { type TerminalStatGridItem } from '../shared/TerminalStatGrid.svelte';

  let expandedNpcIds = $state<string[]>([]);

  function isExpanded(npcId: string) {
    return expandedNpcIds.includes(npcId);
  }

  function toggleNpc(npcId: string) {
    expandedNpcIds = isExpanded(npcId)
      ? expandedNpcIds.filter((expandedNpcId) => expandedNpcId !== npcId)
      : [...expandedNpcIds, npcId];
  }

  function combatStats(combat: NpcCombatProfile): TerminalStatGridItem[] {
    return [
      { label: 'HD', value: combat.hd },
      { label: 'HP', value: combat.hp, detail: combat.hpRolls.join('+') },
      { label: 'AC', value: combat.armorTag ? `${combat.ac} ${combat.armorTag}` : combat.ac },
      { label: 'ATK', value: combat.attacks > 1 ? `+${combat.attackBonus} x${combat.attacks}` : `+${combat.attackBonus}` },
      { label: 'DMG', value: combat.damage },
      { label: 'MOVE', value: combat.move },
      { label: 'ML', value: combat.morale },
      { label: 'SKILL', value: `+${combat.skillBonus}` },
      { label: 'SAVE', value: `${combat.save}+` }
    ];
  }

  function humanDossierStats(profile: NpcProfile): TerminalStatGridItem[] {
    return [
      { label: 'CULTURE', value: profile.identity.culture },
      { label: 'AGE', value: profile.identity.age },
      { label: 'BACKGROUND', value: profile.identity.background },
      { label: 'ROLE', value: profile.identity.role },
      { label: 'PROBLEM', value: profile.personality.biggestProblem },
      { label: 'TRAIT', value: profile.personality.obviousTrait },
      { label: 'DESIRE', value: profile.personality.greatestDesire },
      { label: 'MOTIVATION', value: profile.personality.motivation },
      { label: 'WANT', value: profile.personality.want },
      { label: 'POWER', value: profile.personality.power },
      { label: 'HOOK', value: profile.personality.hook },
      { label: 'MANNER', value: profile.personality.initialManner },
      { label: 'DEAL', value: profile.personality.defaultDealOutcome }
    ];
  }

  function beastDossierStats(profile: NpcProfile): TerminalStatGridItem[] {
    return [
      { label: 'KIND', value: 'Beast' },
      { label: 'ROLE', value: profile.behavior?.ecologicalRole ?? profile.identity.role },
      { label: 'SIZE', value: profile.morphology?.size ?? profile.identity.age },
      { label: 'FEATURES', value: profile.morphology?.basicAnimalFeatures ?? profile.identity.background },
      { label: 'BODY', value: profile.morphology?.bodyPlan ?? 'Unknown' },
      { label: 'LIMBS', value: profile.morphology?.limbNovelty ?? 'Unknown' },
      { label: 'SKIN', value: profile.morphology?.skinNovelty ?? 'Unknown' },
      { label: 'WEAPON', value: profile.morphology?.mainWeapon ?? profile.combat.damage },
      { label: 'BEHAVIOR', value: profile.behavior?.trait ?? profile.personality.obviousTrait },
      { label: 'SWARM', value: profile.behavior?.swarm ? 'Yes' : 'No' },
      { label: 'DISCHARGE', value: profile.hazards?.harmfulDischarge ?? 'None' },
      {
        label: 'POISON',
        value: profile.hazards
          ? `${profile.hazards.poisonEffect}; ${profile.hazards.poisonOnset}; ${profile.hazards.poisonDuration}`
          : 'None'
      }
    ];
  }

  function dossierStats(profile: NpcProfile) {
    return profile.kind === 'beast' ? beastDossierStats(profile) : humanDossierStats(profile);
  }

  function fallbackStats(npc: CharacterRecord): TerminalStatGridItem[] {
    return [
      { label: 'HD', value: npc.level },
      { label: 'HP', value: `${npc.hp}/${npc.max_hp}` },
      { label: 'AC', value: npc.base_ac },
      { label: 'BACKGROUND', value: npc.background },
      { label: 'CLASS', value: npc.character_class },
      { label: 'HERITAGE', value: npc.heritage }
    ];
  }

  function profileSubtitle(profile: NpcProfile, npc: CharacterRecord) {
    if (profile.kind === 'beast') {
      return `${(profile.behavior?.ecologicalRole ?? profile.identity.role).toUpperCase()} / ${(profile.morphology?.size ?? profile.identity.age).toUpperCase()}`;
    }

    return `${(profile.identity.role || npc.character_class).toUpperCase()} / ${(profile.identity.background || npc.background).toUpperCase()}`;
  }
</script>

<TerminalPanel title="NPC DOSSIER" extraClass="gm-panel">
  {#if dbState.npcCharacters.length === 0}
    <div class="terminal-alert">NO NPCS RECORDED</div>
  {:else}
    <div class="npc-list">
      {#each dbState.npcCharacters as npc}
        {@const profile = dbState.getNpcProfile(npc.id)}
        {@const expanded = isExpanded(npc.id)}
        <div class="npc-row" class:expanded>
          <button
            type="button"
            class="npc-row-main"
            aria-expanded={expanded}
            aria-controls="npc-detail-{npc.id}"
            onclick={() => toggleNpc(npc.id)}
          >
            <span class="chevron-toggle" class:expanded>
              <span class="chevron-mark"></span>
            </span>

            <span class="npc-summary">
              <strong>{npc.name.toUpperCase()}</strong>
              <span>HD {profile?.combat.hd ?? npc.level} / AC {profile?.combat.ac ?? npc.base_ac}</span>
              {#if profile}
                <em>
                  {profile.kind === 'beast' ? 'BEAST' : profile.identity.role.toUpperCase()} /
                  {profile.combat.label.toUpperCase()}
                </em>
              {:else}
                <em>{npc.heritage.toUpperCase()} {npc.background.toUpperCase()}</em>
              {/if}
            </span>
          </button>

          {#if expanded}
            <div class="npc-detail" id="npc-detail-{npc.id}">
              {#if profile}
                <div class="detail-header">
                  <strong>{profile.identity.name.toUpperCase()}</strong>
                  <span>{profileSubtitle(profile, npc)}</span>
                </div>

                <section class="detail-section">
                  <h4>COMBAT PROFILE</h4>
                  <TerminalStatGrid items={combatStats(profile.combat)} columns={3} dense valueTone="main" scaleValues={false} />
                </section>

                <section class="detail-section">
                  <h4>{profile.kind === 'beast' ? 'BEAST DOSSIER' : 'PERSONALITY DOSSIER'}</h4>
                  <TerminalStatGrid items={dossierStats(profile)} columns={2} dense valueTone="main" scaleValues={false} />
                </section>

                {#if profile.rolls.length > 0}
                  <section class="detail-section">
                    <h4>GENERATION ROLLS</h4>
                    <div class="roll-strip">
                      {#each profile.rolls as roll}
                        <span>{roll.die}:{roll.roll} {roll.table}</span>
                      {/each}
                    </div>
                  </section>
                {/if}

                {#if profile.gmNotes}
                  <section class="detail-section">
                    <h4>GM NOTES</h4>
                    <p class="notes">{profile.gmNotes}</p>
                  </section>
                {/if}
              {:else}
                <div class="detail-header">
                  <strong>{npc.name.toUpperCase()}</strong>
                  <span>LEGACY NPC RECORD</span>
                </div>

                <TerminalStatGrid items={fallbackStats(npc)} columns={3} dense valueTone="main" scaleValues={false} />
                <div class="terminal-alert empty-state">NO PRIVATE NPC PROFILE RECORDED</div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</TerminalPanel>

<style>
  .npc-list {
    display: grid;
    gap: 0.65rem;
  }

  .npc-row {
    display: grid;
    gap: 0.65rem;
    padding: 0;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .npc-row.expanded {
    border-color: rgba(245, 158, 11, 0.45);
  }

  .npc-row-main {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.65rem;
    width: 100%;
    padding: 0.65rem;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font-family: var(--font-terminal);
    text-align: left;
  }

  .npc-row-main:hover,
  .npc-row-main:focus-visible {
    outline: none;
    background: rgba(245, 158, 11, 0.05);
  }

  .npc-summary {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .npc-row strong {
    color: var(--accent-amber);
  }

  .npc-row span,
  .npc-row em {
    color: var(--text-dim);
    font-size: 0.74rem;
    font-style: normal;
  }

  .chevron-toggle {
    position: relative;
    width: 1.35rem;
    height: 1.35rem;
    display: grid;
    place-items: center;
    border: var(--border-subtle);
    color: var(--accent-amber);
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .chevron-toggle.expanded {
    transform: rotate(90deg);
    border-color: var(--accent-amber);
  }

  .chevron-mark {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.38rem;
    height: 0.38rem;
    border-top: 2px solid currentColor;
    border-right: 2px solid currentColor;
    transform: translate(-62%, -50%) rotate(45deg);
  }

  .npc-detail {
    display: grid;
    gap: 0.75rem;
    padding: 0 0.65rem 0.65rem;
    min-width: 0;
  }

  .detail-header {
    display: grid;
    gap: 0.25rem;
    padding: 0.65rem;
    background: var(--bg-panel);
    border: var(--border-subtle);
  }

  .detail-section {
    display: grid;
    gap: 0.5rem;
  }

  .detail-section h4 {
    margin: 0;
    padding-bottom: 0.35rem;
    border-bottom: 1px dashed var(--border-subtle);
    color: var(--text-dim);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
  }

  .roll-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .roll-strip span,
  .notes {
    padding: 0.4rem 0.5rem;
    background: var(--bg-panel);
    border: var(--border-subtle);
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.68rem;
  }

  .notes {
    margin: 0;
    color: var(--text-main);
    line-height: 1.45;
  }

  @media (max-width: 700px) {
    .npc-row-main {
      grid-template-columns: 1fr;
    }

    .chevron-toggle {
      justify-self: start;
    }
  }
</style>
