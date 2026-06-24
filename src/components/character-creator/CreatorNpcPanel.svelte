<script lang="ts">
  import {
    BEAST_BODY_PLAN_OPTIONS,
    BEAST_ECOLOGICAL_ROLE_OPTIONS,
    BEAST_FEATURE_OPTIONS,
    BEAST_HARMFUL_DISCHARGE_OPTIONS,
    BEAST_LIMB_OPTIONS,
    BEAST_NPC_COMBAT_OPTIONS,
    BEAST_POISON_DURATION_OPTIONS,
    BEAST_POISON_EFFECT_OPTIONS,
    BEAST_POISON_ONSET_OPTIONS,
    BEAST_SIZE_OPTIONS,
    BEAST_SKIN_OPTIONS,
    BEAST_WEAPON_OPTIONS,
    beastBehaviorOptions,
    buildBeastNpcFromOptions,
    buildHumanNpcFromOptions,
    NPC_AGE_OPTIONS,
    NPC_BACKGROUND_OPTIONS,
    NPC_COMBAT_OPTIONS,
    NPC_CULTURE_OPTIONS,
    NPC_DEAL_OPTIONS,
    NPC_DESIRE_OPTIONS,
    NPC_FIRST_NAME_TYPE_OPTIONS,
    NPC_HOOK_OPTIONS,
    NPC_MANNER_OPTIONS,
    NPC_MOTIVATION_OPTIONS,
    NPC_POWER_OPTIONS,
    NPC_PROBLEM_OPTIONS,
    NPC_ROLE_OPTIONS,
    NPC_TRAIT_OPTIONS,
    NPC_WANT_OPTIONS,
    quickRollBeastNpc,
    quickRollHumanNpc,
    type BeastNpcBuildOptions,
    type HumanNpcBuildOptions
  } from '../../lib/npc/npcGenerator';
  import { dbState } from '../../lib/states/dbState.svelte';
  import { toastState } from '../../lib/states/toastState.svelte';
  import type { GeneratedNpcDraft, NpcCombatProfile, NpcProfile } from '../../lib/types';
  import type { TerminalStatGridItem } from '../shared/TerminalStatGrid.svelte';
  import TerminalItemList, { type TerminalItemListRow } from '../shared/TerminalItemList.svelte';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalSelect from '../shared/TerminalSelect.svelte';
  import TerminalStatGrid from '../shared/TerminalStatGrid.svelte';

  type Mode = 'quick' | 'build';
  type NpcType = 'human' | 'beast';
  type SelectOption = { label: string; value: string };

  let mode = $state<Mode>('quick');
  let npcType = $state<NpcType>('human');
  let preview = $state<GeneratedNpcDraft | null>(null);
  let selectedNpcId = $state<string | null>(null);
  let buildName = $state('');
  let buildNotes = $state('');
  let selectedCulture = $state<SelectOption | null>(NPC_CULTURE_OPTIONS[0] ?? null);
  let selectedFirstNameType = $state<SelectOption | null>(NPC_FIRST_NAME_TYPE_OPTIONS[0] ?? null);
  let selectedAge = $state<SelectOption | null>(null);
  let selectedBackground = $state<SelectOption | null>(null);
  let selectedRole = $state<SelectOption | null>(null);
  let selectedProblem = $state<SelectOption | null>(null);
  let selectedTrait = $state<SelectOption | null>(null);
  let selectedDesire = $state<SelectOption | null>(null);
  let selectedMotivation = $state<SelectOption | null>(null);
  let selectedWant = $state<SelectOption | null>(null);
  let selectedPower = $state<SelectOption | null>(null);
  let selectedHook = $state<SelectOption | null>(null);
  let selectedManner = $state<SelectOption | null>(null);
  let selectedDeal = $state<SelectOption | null>(null);
  let selectedCombat = $state<SelectOption | null>(null);
  let beastName = $state('');
  let beastNotes = $state('');
  let selectedBeastCombat = $state<SelectOption | null>(null);
  let selectedBeastRole = $state<SelectOption | null>(BEAST_ECOLOGICAL_ROLE_OPTIONS[0] ?? null);
  let selectedBeastFeature = $state<SelectOption | null>(null);
  let selectedBeastBody = $state<SelectOption | null>(null);
  let selectedBeastLimb = $state<SelectOption | null>(null);
  let selectedBeastSkin = $state<SelectOption | null>(null);
  let selectedBeastWeapon = $state<SelectOption | null>(null);
  let selectedBeastSize = $state<SelectOption | null>(null);
  let selectedBeastBehavior = $state<SelectOption | null>(null);
  let selectedBeastDischarge = $state<SelectOption | null>(null);
  let selectedBeastPoisonEffect = $state<SelectOption | null>(null);
  let selectedBeastPoisonOnset = $state<SelectOption | null>(null);
  let selectedBeastPoisonDuration = $state<SelectOption | null>(null);
  let beastSwarm = $state(false);

  let npcCharacters = $derived(dbState.npcCharacters);
  let selectedNpc = $derived(npcCharacters.find((npc) => npc.id === selectedNpcId) ?? npcCharacters[0] ?? null);
  let selectedProfile = $derived(selectedNpc ? dbState.getNpcProfile(selectedNpc.id) : null);
  let activeProfile = $derived(preview?.profile ?? selectedProfile);
  let npcRows = $derived(npcCharacters.map(toNpcRow));
  let selectedBeastBehaviorOptions = $derived(beastBehaviorOptions((selectValue(selectedBeastRole) as BeastNpcBuildOptions['ecologicalRole']) ?? 'predator'));

  function selectValue(option: SelectOption | null) {
    return option?.value;
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

  function personalityStats(profile: NpcProfile): TerminalStatGridItem[] {
    if (profile.kind === 'beast') return beastDossierStats(profile);

    return [
      { label: 'AGE', value: profile.identity.age },
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
      { label: 'POISON', value: profile.hazards ? `${profile.hazards.poisonEffect}; ${profile.hazards.poisonOnset}; ${profile.hazards.poisonDuration}` : 'None' }
    ];
  }

  function toNpcRow(npc: typeof npcCharacters[number]): TerminalItemListRow {
    const profile = dbState.getNpcProfile(npc.id);
    const combat = profile?.combat;

    return {
      id: npc.id,
      quantity: 1,
      displayName: npc.name,
      typeLabel: profile?.kind === 'beast' ? 'BEAST NPC' : 'HUMAN NPC',
      nameClass: selectedNpcId === npc.id && !preview ? 'loot-rare' : 'loot-uncommon',
      meta: profile
        ? `${profile.identity.role.toUpperCase()}  HD ${combat?.hd ?? npc.level}  AC ${combat?.ac ?? npc.base_ac}`
        : `HD ${npc.level}  AC ${npc.base_ac}`,
      detailRows: profile
        ? profile.kind === 'beast'
          ? [
            { label: 'ROLE', value: profile.behavior?.ecologicalRole ?? profile.identity.role },
            { label: 'SIZE', value: profile.morphology?.size ?? profile.identity.age },
            { label: 'FEATURES', value: profile.morphology?.basicAnimalFeatures ?? profile.identity.background },
            { label: 'COMBAT', value: profile.combat.label },
            { label: 'SAVE', value: `${profile.combat.save}+` },
            { label: 'MORALE', value: profile.combat.morale }
          ]
          : [
            { label: 'ROLE', value: profile.identity.role },
            { label: 'BACKGROUND', value: profile.identity.background },
            { label: 'COMBAT', value: profile.combat.label },
            { label: 'SAVE', value: `${profile.combat.save}+` },
            { label: 'MORALE', value: profile.combat.morale },
            { label: 'SKILL', value: `+${profile.combat.skillBonus}` }
          ]
        : [
            { label: 'KIND', value: npc.character_kind ?? 'NPC' },
            { label: 'BACKGROUND', value: npc.background },
            { label: 'CLASS', value: npc.character_class }
          ],
      description: profile?.kind === 'beast'
        ? profile.behavior?.trait
        : profile?.personality.hook,
      mechanics: profile?.kind === 'beast' && profile.hazards
        ? `${profile.hazards.harmfulDischarge}; poison ${profile.hazards.poisonEffect} (${profile.hazards.poisonOnset}, ${profile.hazards.poisonDuration})`
        : profile?.personality.want,
      expandable: true
    };
  }

  function rollQuickNpc() {
    preview = npcType === 'beast' ? quickRollBeastNpc() : quickRollHumanNpc();
    selectedNpcId = null;
    mode = 'quick';
  }

  function buildNpcPreview() {
    if (npcType === 'beast') {
      const options: BeastNpcBuildOptions = {
        name: beastName,
        combatPresetId: selectValue(selectedBeastCombat),
        ecologicalRole: selectValue(selectedBeastRole) as BeastNpcBuildOptions['ecologicalRole'],
        basicAnimalFeatures: selectValue(selectedBeastFeature),
        bodyPlan: selectValue(selectedBeastBody),
        limbNovelty: selectValue(selectedBeastLimb),
        skinNovelty: selectValue(selectedBeastSkin),
        mainWeapon: selectValue(selectedBeastWeapon),
        size: selectValue(selectedBeastSize),
        behaviorTrait: selectValue(selectedBeastBehavior),
        harmfulDischarge: selectValue(selectedBeastDischarge),
        poisonEffect: selectValue(selectedBeastPoisonEffect),
        poisonOnset: selectValue(selectedBeastPoisonOnset),
        poisonDuration: selectValue(selectedBeastPoisonDuration),
        swarm: beastSwarm,
        gmNotes: beastNotes
      };

      preview = buildBeastNpcFromOptions(options);
      selectedNpcId = null;
      mode = 'build';
      return;
    }

    const options: HumanNpcBuildOptions = {
      culture: selectValue(selectedCulture) as HumanNpcBuildOptions['culture'],
      firstNameType: selectValue(selectedFirstNameType) as HumanNpcBuildOptions['firstNameType'],
      name: buildName,
      age: selectValue(selectedAge),
      background: selectValue(selectedBackground),
      role: selectValue(selectedRole),
      biggestProblem: selectValue(selectedProblem),
      obviousTrait: selectValue(selectedTrait),
      greatestDesire: selectValue(selectedDesire),
      motivation: selectValue(selectedMotivation),
      want: selectValue(selectedWant),
      power: selectValue(selectedPower),
      hook: selectValue(selectedHook),
      initialManner: selectValue(selectedManner),
      defaultDealOutcome: selectValue(selectedDeal),
      combatPresetId: selectValue(selectedCombat),
      gmNotes: buildNotes
    };

    preview = buildHumanNpcFromOptions(options);
    selectedNpcId = null;
    mode = 'build';
  }

  async function savePreview() {
    if (!preview) return;

    const saved = await dbState.saveGeneratedNpc(preview);
    toastState.notify(saved ? 'NPC SAVED' : 'ERROR: NPC SAVE FAILED');
    if (!saved) return;

    selectedNpcId = preview.characterId;
    preview = null;
    buildName = '';
    buildNotes = '';
    beastName = '';
    beastNotes = '';
  }

  async function deleteNpc() {
    if (!selectedNpc) return;

    const confirmed = window.confirm(`Delete ${selectedNpc.name}? This also deletes their private NPC dossier.`);
    if (!confirmed) return;

    const deleted = await dbState.deleteCharacter(selectedNpc.id);
    toastState.notify(deleted ? 'NPC DELETED' : 'ERROR: NPC DELETE FAILED');
    if (deleted) selectedNpcId = null;
  }

  function selectNpc(npcId: string) {
    selectedNpcId = npcId;
    preview = null;
  }

  function profileTitle(profile: NpcProfile | null) {
    return profile?.identity.name.toUpperCase() ?? selectedNpc?.name.toUpperCase() ?? 'NO NPC SELECTED';
  }

  function profileSubtitle(profile: NpcProfile) {
    if (profile.kind === 'beast') {
      return `${(profile.behavior?.ecologicalRole ?? profile.identity.role).toUpperCase()} / ${(profile.morphology?.size ?? profile.identity.age).toUpperCase()}`;
    }

    return `${profile.identity.role.toUpperCase()} / ${profile.identity.background.toUpperCase()}`;
  }
</script>

{#snippet npcActions(row: TerminalItemListRow)}
  <button class="btn-action row-button" type="button" onclick={() => selectNpc(row.id)}>
    SELECT
  </button>
{/snippet}

<TerminalPanel title="NPC GENERATOR" extraClass="creator-panel npc-generator-panel">
  <div class="generator-controls">
    <div class="mode-grid">
      <button class="btn-action mode-button" class:active={npcType === 'human'} onclick={() => npcType = 'human'}>
        HUMAN
      </button>
      <button class="btn-action mode-button" class:active={npcType === 'beast'} onclick={() => npcType = 'beast'}>
        BEAST
      </button>
    </div>

    <div class="mode-grid">
      <button class="btn-action mode-button" class:active={mode === 'quick'} onclick={() => mode = 'quick'}>
        QUICK ROLL
      </button>
      <button class="btn-action mode-button" class:active={mode === 'build'} onclick={() => mode = 'build'}>
        BUILD NPC
      </button>
    </div>

    {#if mode === 'quick'}
      <button class="btn-action btn-full-cyan" type="button" onclick={rollQuickNpc}>
        QUICK ROLL {npcType === 'beast' ? 'BEAST' : 'HUMAN NPC'}
      </button>
    {:else if npcType === 'human'}
      <div class="builder-grid">
        <div class="input-group">
          <label for="npc-name">NAME</label>
          <input id="npc-name" class="terminal-input" bind:value={buildName} placeholder="ROLL IF BLANK" />
        </div>

        <div class="input-group">
          <label for="npc-culture" class="sel-label">NAME CULTURE</label>
          <TerminalSelect id="npc-culture" options={NPC_CULTURE_OPTIONS} bind:value={selectedCulture} showPopup={false} />
        </div>

        <div class="input-group">
          <label for="npc-first-name" class="sel-label">FIRST NAME</label>
          <TerminalSelect id="npc-first-name" options={NPC_FIRST_NAME_TYPE_OPTIONS} bind:value={selectedFirstNameType} showPopup={false} />
        </div>

        <div class="input-group">
          <label for="npc-age" class="sel-label">AGE</label>
          <TerminalSelect id="npc-age" options={NPC_AGE_OPTIONS} bind:value={selectedAge} placeholder="ROLL AGE..." showPopup={false} />
        </div>

        <div class="input-group">
          <label for="npc-background" class="sel-label">BACKGROUND</label>
          <TerminalSelect id="npc-background" options={NPC_BACKGROUND_OPTIONS} bind:value={selectedBackground} placeholder="ROLL BACKGROUND..." showPopup={false} />
        </div>

        <div class="input-group">
          <label for="npc-role" class="sel-label">ROLE</label>
          <TerminalSelect id="npc-role" options={NPC_ROLE_OPTIONS} bind:value={selectedRole} placeholder="ROLL ROLE..." showPopup={false} />
        </div>

        <div class="input-group">
          <label for="npc-combat" class="sel-label">COMBAT PRESET</label>
          <TerminalSelect id="npc-combat" options={NPC_COMBAT_OPTIONS} bind:value={selectedCombat} placeholder="AUTO PICK..." showPopup={false} />
        </div>
      </div>

      <div class="builder-grid wide">
        <div class="input-group">
          <label for="npc-problem" class="sel-label">PROBLEM</label>
          <TerminalSelect id="npc-problem" options={NPC_PROBLEM_OPTIONS} bind:value={selectedProblem} placeholder="ROLL PROBLEM..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-trait" class="sel-label">TRAIT</label>
          <TerminalSelect id="npc-trait" options={NPC_TRAIT_OPTIONS} bind:value={selectedTrait} placeholder="ROLL TRAIT..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-desire" class="sel-label">DESIRE</label>
          <TerminalSelect id="npc-desire" options={NPC_DESIRE_OPTIONS} bind:value={selectedDesire} placeholder="ROLL DESIRE..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-motivation" class="sel-label">MOTIVATION</label>
          <TerminalSelect id="npc-motivation" options={NPC_MOTIVATION_OPTIONS} bind:value={selectedMotivation} placeholder="ROLL MOTIVATION..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-want" class="sel-label">WANT</label>
          <TerminalSelect id="npc-want" options={NPC_WANT_OPTIONS} bind:value={selectedWant} placeholder="ROLL WANT..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-power" class="sel-label">POWER</label>
          <TerminalSelect id="npc-power" options={NPC_POWER_OPTIONS} bind:value={selectedPower} placeholder="ROLL POWER..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-hook" class="sel-label">HOOK</label>
          <TerminalSelect id="npc-hook" options={NPC_HOOK_OPTIONS} bind:value={selectedHook} placeholder="ROLL HOOK..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-manner" class="sel-label">MANNER</label>
          <TerminalSelect id="npc-manner" options={NPC_MANNER_OPTIONS} bind:value={selectedManner} placeholder="ROLL MANNER..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="npc-deal" class="sel-label">DEAL</label>
          <TerminalSelect id="npc-deal" options={NPC_DEAL_OPTIONS} bind:value={selectedDeal} placeholder="ROLL DEAL..." showPopup={false} />
        </div>
      </div>

      <div class="input-group">
        <label for="npc-notes">GM NOTES</label>
        <textarea id="npc-notes" class="terminal-input" bind:value={buildNotes} rows="3"></textarea>
      </div>

      <button class="btn-action btn-full-cyan" type="button" onclick={buildNpcPreview}>
        BUILD PREVIEW
      </button>
    {:else}
      <div class="builder-grid">
        <div class="input-group">
          <label for="beast-name">NAME</label>
          <input id="beast-name" class="terminal-input" bind:value={beastName} placeholder="ROLL IF BLANK" />
        </div>

        <div class="input-group">
          <label for="beast-combat" class="sel-label">COMBAT PRESET</label>
          <TerminalSelect id="beast-combat" options={BEAST_NPC_COMBAT_OPTIONS} bind:value={selectedBeastCombat} placeholder="AUTO PICK..." showPopup={false} />
        </div>

        <div class="input-group">
          <label for="beast-role" class="sel-label">ECOLOGICAL ROLE</label>
          <TerminalSelect id="beast-role" options={BEAST_ECOLOGICAL_ROLE_OPTIONS} bind:value={selectedBeastRole} showPopup={false} />
        </div>

        <label class="check-row" for="beast-swarm">
          <input id="beast-swarm" type="checkbox" bind:checked={beastSwarm} />
          SWARM
        </label>
      </div>

      <div class="builder-grid wide">
        <div class="input-group">
          <label for="beast-feature" class="sel-label">FEATURES</label>
          <TerminalSelect id="beast-feature" options={BEAST_FEATURE_OPTIONS} bind:value={selectedBeastFeature} placeholder="ROLL FEATURES..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-body" class="sel-label">BODY PLAN</label>
          <TerminalSelect id="beast-body" options={BEAST_BODY_PLAN_OPTIONS} bind:value={selectedBeastBody} placeholder="ROLL BODY..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-limb" class="sel-label">LIMBS</label>
          <TerminalSelect id="beast-limb" options={BEAST_LIMB_OPTIONS} bind:value={selectedBeastLimb} placeholder="ROLL LIMBS..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-skin" class="sel-label">SKIN</label>
          <TerminalSelect id="beast-skin" options={BEAST_SKIN_OPTIONS} bind:value={selectedBeastSkin} placeholder="ROLL SKIN..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-weapon" class="sel-label">WEAPON</label>
          <TerminalSelect id="beast-weapon" options={BEAST_WEAPON_OPTIONS} bind:value={selectedBeastWeapon} placeholder="ROLL WEAPON..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-size" class="sel-label">SIZE</label>
          <TerminalSelect id="beast-size" options={BEAST_SIZE_OPTIONS} bind:value={selectedBeastSize} placeholder="ROLL SIZE..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-behavior" class="sel-label">BEHAVIOR</label>
          <TerminalSelect id="beast-behavior" options={selectedBeastBehaviorOptions} bind:value={selectedBeastBehavior} placeholder="ROLL BEHAVIOR..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-discharge" class="sel-label">DISCHARGE</label>
          <TerminalSelect id="beast-discharge" options={BEAST_HARMFUL_DISCHARGE_OPTIONS} bind:value={selectedBeastDischarge} placeholder="ROLL DISCHARGE..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-poison-effect" class="sel-label">POISON</label>
          <TerminalSelect id="beast-poison-effect" options={BEAST_POISON_EFFECT_OPTIONS} bind:value={selectedBeastPoisonEffect} placeholder="ROLL POISON..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-poison-onset" class="sel-label">ONSET</label>
          <TerminalSelect id="beast-poison-onset" options={BEAST_POISON_ONSET_OPTIONS} bind:value={selectedBeastPoisonOnset} placeholder="ROLL ONSET..." showPopup={false} />
        </div>
        <div class="input-group">
          <label for="beast-poison-duration" class="sel-label">DURATION</label>
          <TerminalSelect id="beast-poison-duration" options={BEAST_POISON_DURATION_OPTIONS} bind:value={selectedBeastPoisonDuration} placeholder="ROLL DURATION..." showPopup={false} />
        </div>
      </div>

      <div class="input-group">
        <label for="beast-notes">GM NOTES</label>
        <textarea id="beast-notes" class="terminal-input" bind:value={beastNotes} rows="3"></textarea>
      </div>

      <button class="btn-action btn-full-cyan" type="button" onclick={buildNpcPreview}>
        BUILD PREVIEW
      </button>
    {/if}
  </div>

  {#if preview}
    <div class="preview-actions">
      <span>UNSAVED PREVIEW</span>
      <button class="btn-action btn-full-amber" type="button" onclick={savePreview}>
        SAVE NPC
      </button>
    </div>
  {/if}

  <div class="npc-layout">
    <section class="npc-list" aria-label="Saved NPCs">
      <TerminalItemList items={npcRows} emptyMessage="NO NPCS RECORDED" rowActions={npcActions} />
    </section>

    <section class="npc-detail" aria-label="NPC details">
      <div class="detail-header">
        <div>
          <strong>{profileTitle(activeProfile)}</strong>
          {#if activeProfile}
            <span>{profileSubtitle(activeProfile)}</span>
          {/if}
        </div>

        {#if selectedNpc && !preview}
          <button class="btn-action btn-danger btn-delete" type="button" onclick={deleteNpc}>
            DELETE
          </button>
        {/if}
      </div>

      {#if activeProfile}
        <TerminalStatGrid items={combatStats(activeProfile.combat)} columns={3} dense valueTone="main" scaleValues={false} />

        <TerminalStatGrid items={personalityStats(activeProfile)} columns={2} dense valueTone="main" scaleValues={false} />

        {#if activeProfile.rolls.length > 0}
          <div class="roll-strip">
            {#each activeProfile.rolls as roll}
              <span>{roll.die}:{roll.roll} {roll.table}</span>
            {/each}
          </div>
        {/if}

        {#if activeProfile.gmNotes}
          <p class="notes">{activeProfile.gmNotes}</p>
        {/if}
      {:else}
        <div class="terminal-alert">SELECT OR GENERATE AN NPC</div>
      {/if}
    </section>
  </div>
</TerminalPanel>

<style>
  .generator-controls {
    display: grid;
    gap: 1rem;

  }

  .mode-grid,
  .preview-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .mode-button.active {
    background: var(--ui-cyan);
    color: var(--bg-void);
  }

  .builder-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .builder-grid.wide {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .input-group {
    min-width: 0;
  }

  .check-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    align-self: end;
    min-height: 2.65rem;
    padding: 0.55rem 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--text-main);
    font-family: var(--font-terminal);
    font-size: 0.72rem;
    cursor: pointer;
  }

  .check-row input {
    accent-color: var(--accent-amber);
  }

  textarea.terminal-input {
    min-height: 5rem;
    resize: vertical;
  }

  .preview-actions {
    align-items: center;
    padding: 0.65rem;
    margin-bottom: 1rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    color: var(--accent-amber);
    font-family: var(--font-terminal);
    font-size: 0.76rem;
  }

  .npc-layout {
    display: grid;
    grid-template-columns: minmax(9rem, 0.8fr) minmax(0, 1.4fr);
    gap: 1rem;
  }

  .npc-list {
    min-width: 0;
  }

  .npc-detail {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  .detail-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: start;
    padding: 0.75rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
  }

  .detail-header > div {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .btn-delete {
    padding: 0.45rem 0.65rem;
    font-size: 0.68rem;
  }

  .row-button {
    padding: 0.4rem 0.55rem;
    font-size: 0.66rem;
  }

  .roll-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .roll-strip span,
  .notes {
    padding: 0.4rem 0.5rem;
    background: var(--bg-void);
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

  @media (max-width: 1200px) {
    .npc-layout,
    .builder-grid,
    .builder-grid.wide {
      grid-template-columns: 1fr;
    }
  }
</style>
