<script lang="ts">
  import { characterCodec } from '../../lib/characterCodec';
  import {
    ALL_ATTRIBUTES,
    ALL_SKILLS,
    formatFocusPicks,
    getEquipmentById
  } from '../../lib/characterConstants';
  import { characterCreatorState } from '../../lib/states/characterCreatorState.svelte';
  import type { AttributeKey, EquipmentCatalogItem, Skill, StartingEquipmentItem } from '../../lib/types';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let archivePreview = $derived(characterCreatorState.buildArchive());
  let validationMessages = $derived(characterCreatorState.validationMessages);
  let trainedSkills = $derived(
    ALL_SKILLS.filter((skill) => (archivePreview.core.skills[skill] ?? -1) >= 0)
  );
  let reviewEquipmentItems = $derived(characterCreatorState.allDraftEquipmentItems);
  let reviewEquipmentRows = $derived(toEquipmentRows(reviewEquipmentItems));

  function exportArchive() {
    if (validationMessages.length > 0) return;
    characterCodec.exportToFile(characterCreatorState.buildArchive());
  }

  function focusSummary() {
    return formatFocusPicks(archivePreview.creation.focusPicks, 'OPEN');
  }

  function equipmentSummary() {
    if (archivePreview.creation.equipment.mode === 'package') {
      return characterCreatorState.selectedEquipmentPackage?.name.toUpperCase() ?? 'PACKAGE';
    }

    const roll = archivePreview.creation.equipment.creditRoll;
    return roll ? `CUSTOM ${roll[0]}+${roll[1]}` : 'CUSTOM';
  }

  function modLabel(attribute: AttributeKey) {
    const modifier = characterCreatorState.attributeModifiers[attribute];
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }

  function skillLabel(skill: Skill) {
    return `${skill} ${archivePreview.core.skills[skill]}`;
  }

  function creatorWeaponDamage(entry: StartingEquipmentItem, item: EquipmentCatalogItem | null) {
    if (!item) return undefined;
    const weapon = characterCreatorState.equipmentWeaponSummaries.find((summary) => {
      return summary.label === (entry.displayName ?? item.sourceName ?? item.name) && entry.equipmentId === item.id;
    });
    return weapon?.damage;
  }

  function toEquipmentRows(items: StartingEquipmentItem[]): TerminalItemListRow[] {
    return items.map((entry, index) => {
      const item = getEquipmentById(entry.equipmentId);
      return {
        id: `creator:review:${entry.equipmentId}:${index}`,
        equipmentId: entry.equipmentId,
        quantity: entry.quantity,
        displayName: entry.displayName,
        weaponDamage: creatorWeaponDamage(entry, item)
      };
    });
  }
</script>

<TerminalPanel title="EXPORT REVIEW" extraClass="creator-panel">
  <div class="review-sections">
    <section class="review-section">
      <h3>CORE RECORD</h3>
      <div class="review-grid">
        <div class="review-row">
          <span>NAME</span>
          <strong>{archivePreview.core.name}</strong>
        </div>
        <div class="review-row">
          <span>HERITAGE</span>
          <strong>{archivePreview.core.heritage.toUpperCase()}</strong>
        </div>
        <div class="review-row">
          <span>CLASS</span>
          <strong>{archivePreview.core.character_class.toUpperCase()}</strong>
        </div>
        <div class="review-row">
          <span>BACKGROUND</span>
          <strong>{archivePreview.core.background.toUpperCase()}</strong>
        </div>
        <div class="review-row">
          <span>HOMEWORLD</span>
          <strong>{archivePreview.creation.homeworld || 'OPEN'}</strong>
        </div>
        <div class="review-row">
          <span>AFFILIATION</span>
          <strong>{archivePreview.creation.employerAffiliation || 'OPEN'}</strong>
        </div>
        <div class="review-row wide">
          <span>GOAL</span>
          <strong>{archivePreview.creation.goal || 'OPEN'}</strong>
        </div>
        <div class="review-row wide">
          <span>NOTES</span>
          <strong>{archivePreview.creation.notes || 'OPEN'}</strong>
        </div>
      </div>
    </section>

    <section class="review-section">
      <h3>MECHANICS</h3>
      <div class="attribute-grid">
        {#each ALL_ATTRIBUTES as attribute}
          <div class="attribute-chip">
            <span>{attribute.toUpperCase()}</span>
            <strong>{archivePreview.core.attributes[attribute]}</strong>
            <em>{modLabel(attribute)}</em>
          </div>
        {/each}
      </div>

      <div class="review-grid compact-grid">
        <div class="review-row">
          <span>HP</span>
          <strong>{archivePreview.core.max_hp}</strong>
        </div>
        <div class="review-row">
          <span>AC</span>
          <strong>{archivePreview.creation.armorClass}</strong>
        </div>
        <div class="review-row">
          <span>BASE ATTACK</span>
          <strong>+{archivePreview.creation.baseAttackBonus}</strong>
        </div>
        <div class="review-row">
          <span>CREDITS</span>
          <strong>{archivePreview.core.personal_credits.toLocaleString()} CR</strong>
        </div>
        <div class="review-row">
          <span>PHY SAVE</span>
          <strong>{archivePreview.creation.saves.physical}</strong>
        </div>
        <div class="review-row">
          <span>EVA SAVE</span>
          <strong>{archivePreview.creation.saves.evasion}</strong>
        </div>
        <div class="review-row">
          <span>MEN SAVE</span>
          <strong>{archivePreview.creation.saves.mental}</strong>
        </div>
        <div class="review-row">
          <span>FOCI</span>
          <strong>{focusSummary()}</strong>
        </div>
      </div>

      <div class="skills-panel">
        <span class="skills-label">SKILLS</span>
        {#if trainedSkills.length > 0}
          <div class="skill-list">
            {#each trainedSkills as skill}
              <span>{skillLabel(skill)}</span>
            {/each}
          </div>
        {:else}
          <div class="empty-line">NO SKILLS RECORDED</div>
        {/if}
      </div>
    </section>

    <section class="review-section">
      <h3>STARTING EQUIPMENT</h3>
      <div class="review-grid compact-grid">
        <div class="review-row">
          <span>MODE</span>
          <strong>{archivePreview.creation.equipment.mode === 'package' ? 'PACKAGE' : 'CUSTOM'}</strong>
        </div>
        <div class="review-row">
          <span>LOADOUT</span>
          <strong>{equipmentSummary()}</strong>
        </div>
        <div class="review-row">
          <span>ITEMS</span>
          <strong>{reviewEquipmentItems.length}</strong>
        </div>
        <div class="review-row">
          <span>ENC</span>
          <strong>{characterCreatorState.startingEquipmentEncumbrance}</strong>
        </div>
      </div>

      <TerminalItemList
        items={reviewEquipmentRows}
        emptyMessage="NO STARTING ITEMS. BUY GEAR WITH ROLLED CREDITS AFTER EXPORT."
      />
    </section>

    <section class="review-section">
      <h3>ARCHIVE</h3>
      <div class="review-grid compact-grid">
        <div class="review-row">
          <span>SCHEMA</span>
          <strong>DEIMOS-CHARACTER-V1</strong>
        </div>
        <div class="review-row">
          <span>BACKGROUND</span>
          <strong>{archivePreview.core.background_progress.complete ? 'COMPLETE' : 'OPEN'}</strong>
        </div>
        <div class="review-row">
          <span>FOCI</span>
          <strong>{archivePreview.creation.focusProgress.complete ? 'COMPLETE' : 'OPEN'}</strong>
        </div>
        <div class="review-row">
          <span>FREE SKILL</span>
          <strong>{archivePreview.creation.freeInterestSkill?.toUpperCase() ?? 'OPEN'}</strong>
        </div>
      </div>
    </section>
  </div>

  {#if validationMessages.length > 0}
    <div class="validation-list">
      {#each validationMessages as message}
        <div class="terminal-alert error">{message}</div>
      {/each}
    </div>
  {:else}
    <div class="terminal-alert">READY FOR ARCHIVE EXPORT</div>
  {/if}

  <div class="action-grid">
    <button class="btn-action" onclick={() => characterCreatorState.resetDraft()}>RESET DRAFT</button>
    <button
      class="btn-action btn-amber"
      disabled={validationMessages.length > 0}
      onclick={exportArchive}
    >
      EXPORT ARCHIVE
    </button>
  </div>
</TerminalPanel>

<style>
  .review-sections,
  .review-section,
  .review-grid,
  .validation-list {
    display: grid;
    gap: 0.55rem;
  }

  .review-sections {
    gap: 1rem;
  }

  .review-section h3 {
    margin: 0;
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }

  .review-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .compact-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .review-row {
    display: grid;
    gap: 0.25rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.55rem;
    font-family: var(--font-terminal);
    font-size: 0.82rem;
  }

  .review-row.wide {
    grid-column: 1 / -1;
  }

  .review-row > span,
  .skills-label {
    color: var(--text-dim);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    line-height: 1.2;
  }

  .review-row strong {
    color: var(--accent-amber);
    overflow-wrap: anywhere;
  }

  .attribute-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .attribute-chip,
  .empty-line {
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .attribute-chip {
    display: grid;
    gap: 0.2rem;
    padding: 0.55rem;
    text-align: center;
    font-size: 0.72rem;
  }

  .attribute-chip span,
  .empty-line {
    color: var(--text-dim);
  }

  .attribute-chip strong {
    color: var(--accent-amber);
  }

  .attribute-chip em {
    color: var(--text-main);
    font-style: normal;
  }

  .skills-panel {
    display: grid;
    gap: 0.45rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.55rem;
    font-family: var(--font-terminal);
  }

  .skills-label {
    display: block;
  }

  .skill-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .skill-list span {
    border: var(--border-subtle);
    background: var(--bg-void);
    color: var(--text-main);
    font-family: var(--font-terminal);
    font-size: 0.72rem;
    padding: 0.35rem 0.45rem;
    text-transform: uppercase;
  }

  .empty-line {
    font-size: 0.72rem;
    padding: 0.5rem;
  }

  .validation-list {
    margin-top: 0.9rem;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-top: 1rem;
  }

  .btn-amber {
    border-color: var(--accent-amber);
    color: var(--accent-amber);
  }

  .btn-amber:hover:not(:disabled) {
    background: var(--accent-amber);
    color: var(--bg-void);
  }

  .btn-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    .review-grid,
    .compact-grid,
    .attribute-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
