<script lang="ts">
  import { ALL_ATTRIBUTES } from '../../lib/character/characterConstants';
  import { dbState } from '../../lib/states/dbState.svelte.ts';
  import { toastState } from '../../lib/states/toastState.svelte.ts';
  import type {
    AttributeKey,
    Attributes,
    CharacterRecord,
    GmCharacterNumericStats,
    GmSessionZeroAttributeInput
  } from '../../lib/types';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';

  type CharacterOption = {
    label: string;
    value: string;
  };

  type SetTo14Option = {
    label: string;
    value: AttributeKey | null;
  };

  const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
    str: 'STR',
    dex: 'DEX',
    con: 'CON',
    int: 'INT',
    wis: 'WIS',
    cha: 'CHA'
  };

  const SET_TO_14_OPTIONS: SetTo14Option[] = [
    { label: 'NO SET-TO-14', value: null },
    ...ALL_ATTRIBUTES.map((attribute) => ({
      label: `SET ${ATTRIBUTE_LABELS[attribute]} TO 14`,
      value: attribute
    }))
  ];

  let targetChar = $state<CharacterOption | null>(null);
  let rawRollDraft = $state<Record<AttributeKey, string>>(createEmptyRawRolls());
  let setTo14Option = $state<SetTo14Option>(SET_TO_14_OPTIONS[0]);
  let numericDraft = $state<GmCharacterNumericStats | null>(null);
  let isFinalizing = $state(false);
  let isSaving = $state(false);
  let resultMessage = $state('');
  let resultIsError = $state(false);

  let charOptions = $derived(
    dbState.activeCampaignRosterCharacters
      .map((character) => ({ label: character.name, value: character.id }))
      .sort((left, right) => left.label.localeCompare(right.label))
  );
  let selectedCharacter = $derived(
    targetChar
      ? dbState.activeCampaignRosterCharacters.find((character) => character.id === targetChar?.value) ?? null
      : null
  );
  let sessionZeroInput = $derived(parseSessionZeroInput());
  let sessionZeroPreview = $derived(
    selectedCharacter && sessionZeroInput
      ? dbState.previewSessionZeroAttributes(selectedCharacter.id, sessionZeroInput)
      : null
  );
  let numericValidationMessages = $derived(validateNumericDraft());
  let numericDirty = $derived(isNumericDraftDirty());

  function createEmptyRawRolls(): Record<AttributeKey, string> {
    return {
      str: '',
      dex: '',
      con: '',
      int: '',
      wis: '',
      cha: ''
    };
  }

  function toNumericDraft(character: CharacterRecord): GmCharacterNumericStats {
    return {
      attributes: { ...character.attributes },
      hp: character.hp,
      max_hp: character.max_hp,
      system_strain: character.system_strain,
      max_system_strain: character.max_system_strain,
      rads: character.rads,
      max_rads: character.max_rads,
      base_ac: character.base_ac,
      xp: character.xp,
      personal_credits: character.personal_credits
    };
  }

  function selectCharacter(option: CharacterOption) {
    targetChar = option;
    rawRollDraft = createEmptyRawRolls();
    setTo14Option = SET_TO_14_OPTIONS[0];
    const character = dbState.activeCampaignRosterCharacters.find((entry) => entry.id === option.value);
    numericDraft = character ? toNumericDraft(character) : null;
    resultMessage = '';
    resultIsError = false;
  }

  function updateRawRoll(attribute: AttributeKey, event: Event) {
    rawRollDraft = {
      ...rawRollDraft,
      [attribute]: (event.target as HTMLInputElement).value
    };
  }

  function parseSessionZeroInput(): GmSessionZeroAttributeInput | null {
    const attributes = {} as Attributes;

    for (const attribute of ALL_ATTRIBUTES) {
      const value = Number(rawRollDraft[attribute]);
      if (!Number.isInteger(value) || value < 3 || value > 18) return null;
      attributes[attribute] = value;
    }

    return {
      rawAttributes: attributes,
      setTo14Attribute: setTo14Option.value ?? undefined
    };
  }

  async function finalizeSessionZeroAttributes() {
    if (!selectedCharacter || !sessionZeroInput || isFinalizing) return;

    const characterId = selectedCharacter.id;
    isFinalizing = true;
    const success = await dbState.finalizeSessionZeroAttributes(characterId, sessionZeroInput);
    isFinalizing = false;
    resultIsError = !success;
    resultMessage = success
      ? 'SESSION 0 ATTRIBUTES FINALIZED. REVIEW HP AND AC.'
      : 'ATTRIBUTE FINALIZATION FAILED.';

    if (success) {
      const updated = dbState.getCharacterById(characterId);
      if (updated && selectedCharacter?.id === characterId) numericDraft = toNumericDraft(updated);
      toastState.notify('SESSION 0 ATTRIBUTES FINALIZED');
    }
  }

  function updateNumericAttribute(attribute: AttributeKey, event: Event) {
    if (!numericDraft) return;
    numericDraft = {
      ...numericDraft,
      attributes: {
        ...numericDraft.attributes,
        [attribute]: Number((event.target as HTMLInputElement).value)
      }
    };
  }

  function updateNumericField(
    field: Exclude<keyof GmCharacterNumericStats, 'attributes'>,
    event: Event
  ) {
    if (!numericDraft) return;
    numericDraft = {
      ...numericDraft,
      [field]: Number((event.target as HTMLInputElement).value)
    };
  }

  function validateNumericDraft() {
    if (!numericDraft) return [];
    const draft = numericDraft;
    const messages: string[] = [];

    if (ALL_ATTRIBUTES.some((attribute) => {
      const value = draft.attributes[attribute];
      return !Number.isInteger(value) || value < 3 || value > 18;
    })) {
      messages.push('ATTRIBUTES MUST BE WHOLE NUMBERS FROM 3 TO 18');
    }
    if (!Number.isInteger(draft.max_hp) || draft.max_hp < 1) {
      messages.push('MAX HP MUST BE AT LEAST 1');
    }
    if (!Number.isInteger(draft.hp) || draft.hp < 0 || draft.hp > draft.max_hp) {
      messages.push('CURRENT HP MUST BE BETWEEN 0 AND MAX HP');
    }
    if (
      !Number.isInteger(draft.max_system_strain) ||
      draft.max_system_strain < 0 ||
      !Number.isInteger(draft.system_strain) ||
      draft.system_strain < 0 ||
      draft.system_strain > draft.max_system_strain
    ) {
      messages.push('SYSTEM STRAIN MUST BE BETWEEN 0 AND ITS MAXIMUM');
    }
    if (
      !Number.isInteger(draft.max_rads) ||
      draft.max_rads < 0 ||
      !Number.isInteger(draft.rads) ||
      draft.rads < 0 ||
      draft.rads > draft.max_rads
    ) {
      messages.push('RADS MUST BE BETWEEN 0 AND THEIR MAXIMUM');
    }
    if (
      !Number.isInteger(draft.base_ac) ||
      draft.base_ac < 0 ||
      !Number.isInteger(draft.xp) ||
      draft.xp < 0 ||
      !Number.isInteger(draft.personal_credits) ||
      draft.personal_credits < 0
    ) {
      messages.push('AC, XP, AND CREDITS MUST BE NON-NEGATIVE WHOLE NUMBERS');
    }

    return messages;
  }

  function isNumericDraftDirty() {
    if (!selectedCharacter || !numericDraft) return false;
    return JSON.stringify(numericDraft) !== JSON.stringify(toNumericDraft(selectedCharacter));
  }

  function revertNumericDraft() {
    if (!selectedCharacter) return;
    numericDraft = toNumericDraft(selectedCharacter);
    resultMessage = '';
    resultIsError = false;
  }

  async function saveNumericOverrides() {
    if (
      !selectedCharacter ||
      !numericDraft ||
      numericValidationMessages.length > 0 ||
      !numericDirty ||
      isSaving
    ) return;

    const characterId = selectedCharacter.id;
    isSaving = true;
    const success = await dbState.updateCampaignPlayerStats(characterId, numericDraft);
    isSaving = false;
    resultIsError = !success;
    resultMessage = success ? 'NUMERIC OVERRIDES SAVED.' : 'NUMERIC OVERRIDE FAILED.';

    if (success) {
      const updated = dbState.getCharacterById(characterId);
      if (updated && selectedCharacter?.id === characterId) numericDraft = toNumericDraft(updated);
      toastState.notify('CHARACTER STATS UPDATED');
    }
  }
</script>

<TerminalPanel title="CHARACTER EDITOR" extraClass="gm-panel">
  <div class="editor-stack">
    <TerminalSelect
      options={charOptions}
      value={targetChar}
      placeholder="SELECT ACTIVE CREW MEMBER..."
      id="char-sel"
      showPopup={false}
      onSelect={selectCharacter}
    />

    {#if selectedCharacter}
      <section class="editor-section">
        <div class="section-heading">
          <div>
            <h3>SESSION 0 ATTRIBUTE FINALIZATION</h3>
            <p>ENTER THE SIX RAW 3D6 TOTALS RECORDED IN DISCORD.</p>
          </div>
          <span>RAW → 14 → GROWTH → FINAL</span>
        </div>

        <div class="finalization-grid">
          <span class="grid-heading">STAT</span>
          <span class="grid-heading">RAW</span>
          <span class="grid-heading">SET-14</span>
          <span class="grid-heading">GROWTH</span>
          <span class="grid-heading">FINAL</span>

          {#each ALL_ATTRIBUTES as attribute}
            <strong>{ATTRIBUTE_LABELS[attribute]}</strong>
            <input
              aria-label="{ATTRIBUTE_LABELS[attribute]} raw 3d6 total"
              class="terminal-input compact-input"
              type="number"
              min="3"
              max="18"
              step="1"
              value={rawRollDraft[attribute]}
              onchange={(event) => updateRawRoll(attribute, event)}
            />
            <span>{sessionZeroPreview?.baseAttributes[attribute] ?? '—'}</span>
            <span class:positive={(sessionZeroPreview?.growthBonuses[attribute] ?? 0) > 0}>
              {sessionZeroPreview ? `+${sessionZeroPreview.growthBonuses[attribute]}` : '—'}
            </span>
            <strong class="final-value">{sessionZeroPreview?.finalAttributes[attribute] ?? '—'}</strong>
          {/each}
        </div>

        <TerminalSelect
          options={SET_TO_14_OPTIONS}
          bind:value={setTo14Option}
          id="session-zero-set-14"
          showPopup={false}
        />

        <div class="terminal-alert warning">
          FINALIZATION UPDATES CON-BASED SYSTEM STRAIN. REVIEW HP AND AC BELOW AFTER APPLYING.
        </div>

        <button
          class="btn-action btn-full-amber"
          disabled={!sessionZeroPreview || isFinalizing}
          onclick={finalizeSessionZeroAttributes}
        >
          {isFinalizing ? 'FINALIZING...' : 'FINALIZE SESSION 0 ATTRIBUTES'}
        </button>
      </section>

      {#if numericDraft}
        <section class="editor-section">
          <div class="section-heading">
            <div>
              <h3>GENERAL NUMERIC OVERRIDES</h3>
              <p>ABSOLUTE HOSTED VALUES. LEVEL, CLASS, SKILLS, AND FOCI ARE NOT EXPOSED.</p>
            </div>
          </div>

          <div class="attribute-input-grid">
            {#each ALL_ATTRIBUTES as attribute}
              <label>
                <span>{ATTRIBUTE_LABELS[attribute]}</span>
                <input
                  class="terminal-input"
                  type="number"
                  min="3"
                  max="18"
                  step="1"
                  value={numericDraft.attributes[attribute]}
                  onchange={(event) => updateNumericAttribute(attribute, event)}
                />
              </label>
            {/each}
          </div>

          <div class="numeric-input-grid">
            <label>
              <span>CURRENT HP</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.hp} onchange={(event) => updateNumericField('hp', event)} />
            </label>
            <label>
              <span>MAX HP</span>
              <input class="terminal-input" type="number" min="1" step="1" value={numericDraft.max_hp} onchange={(event) => updateNumericField('max_hp', event)} />
            </label>
            <label>
              <span>SYSTEM STRAIN</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.system_strain} onchange={(event) => updateNumericField('system_strain', event)} />
            </label>
            <label>
              <span>MAX SYSTEM STRAIN</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.max_system_strain} onchange={(event) => updateNumericField('max_system_strain', event)} />
            </label>
            <label>
              <span>RADS</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.rads} onchange={(event) => updateNumericField('rads', event)} />
            </label>
            <label>
              <span>MAX RADS</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.max_rads} onchange={(event) => updateNumericField('max_rads', event)} />
            </label>
            <label>
              <span>ARMOR CLASS</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.base_ac} onchange={(event) => updateNumericField('base_ac', event)} />
            </label>
            <label>
              <span>XP</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.xp} onchange={(event) => updateNumericField('xp', event)} />
            </label>
            <label class="wide-input">
              <span>PERSONAL CREDITS</span>
              <input class="terminal-input" type="number" min="0" step="1" value={numericDraft.personal_credits} onchange={(event) => updateNumericField('personal_credits', event)} />
            </label>
          </div>

          {#if numericValidationMessages.length > 0}
            <div class="validation-list">
              {#each numericValidationMessages as message}
                <div class="terminal-alert error">{message}</div>
              {/each}
            </div>
          {/if}

          {#if numericDirty}
            <div class="override-actions">
              <button class="btn-action" disabled={isSaving} onclick={revertNumericDraft}>REVERT</button>
              <button
                class="btn-action btn-full-amber"
                disabled={numericValidationMessages.length > 0 || isSaving}
                onclick={saveNumericOverrides}
              >
                {isSaving ? 'SAVING...' : 'SAVE OVERRIDE'}
              </button>
            </div>
          {/if}
        </section>
      {/if}

      {#if resultMessage}
        <div class="terminal-alert" class:error={resultIsError}>{resultMessage}</div>
      {/if}
    {:else}
      <div class="empty-state">SELECT A ROSTERED PLAYER CHARACTER TO BEGIN.</div>
    {/if}
  </div>
</TerminalPanel>

<style>
  .editor-stack,
  .editor-section,
  .validation-list {
    display: grid;
    gap: 0.8rem;
  }

  .editor-section {
    padding-top: 0.9rem;
    border-top: var(--border-subtle);
  }

  .section-heading {
    display: flex;
    gap: 1rem;
    align-items: start;
    justify-content: space-between;
    font-family: var(--font-terminal);
  }

  .section-heading h3,
  .section-heading p {
    margin: 0;
  }

  .section-heading h3 {
    color: var(--accent-amber);
    font-size: 0.84rem;
    letter-spacing: 0.06em;
  }

  .section-heading p,
  .section-heading > span {
    margin-top: 0.3rem;
    color: var(--text-dim);
    font-size: 0.7rem;
    line-height: 1.45;
  }

  .section-heading > span {
    white-space: nowrap;
  }

  .finalization-grid {
    display: grid;
    grid-template-columns: 3.2rem minmax(4rem, 1fr) repeat(3, minmax(3.8rem, 0.8fr));
    gap: 0.45rem;
    align-items: center;
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    font-family: var(--font-terminal);
    text-align: center;
  }

  .grid-heading {
    color: var(--text-dim);
    font-size: 0.66rem;
  }

  .compact-input {
    min-width: 0;
    padding-inline: 0.35rem;
    text-align: center;
  }

  .positive,
  .final-value {
    color: var(--fighter-green);
  }

  .attribute-input-grid,
  .numeric-input-grid {
    display: grid;
    gap: 0.65rem;
  }

  .attribute-input-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .numeric-input-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  label {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
  }

  label > span {
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.7rem;
  }

  .wide-input {
    grid-column: 1 / -1;
  }

  .override-actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.65rem;
  }

  .btn-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .empty-state {
    padding: 1rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-dim);
    font-family: var(--font-terminal);
    font-size: 0.76rem;
    text-align: center;
  }

  @media (max-width: 780px) {
    .attribute-input-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .section-heading {
      display: grid;
    }

    .finalization-grid {
      grid-template-columns: 2.5rem repeat(4, minmax(0, 1fr));
      padding: 0.45rem;
      font-size: 0.76rem;
    }

    .attribute-input-grid,
    .numeric-input-grid,
    .override-actions {
      grid-template-columns: 1fr;
    }

    .wide-input {
      grid-column: auto;
    }
  }
</style>
