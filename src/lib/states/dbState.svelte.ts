import { supabase } from '../supabase/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import backgrounds from '../../data/character/backgrounds.json';
import type {
  AttributeKey,
  CampaignCharacter,
  CampaignLogEvent,
  CampaignLogSnapshot,
  CampaignMemberView,
  CampaignInvite,
  CampaignMembership,
  CampaignRecord,
  CampaignRole,
  CharacterAdvancementProgress,
  CharacterActiveCondition,
  CharacterConditionTemplate,
  CharacterNotes,
  BackgroundDefinitions,
  BackgroundProgress,
  BackgroundProgressGrant,
  BackgroundProgressMode,
  BackgroundRuleEntry,
  BackgroundResolvedChoice,
  BackgroundTableName,
  CharacterCreationArchive,
  CharacterLevelUpPayload,
  CharacterRecord,
  FinalizeCharacterArchiveResult,
  FinalizeInventoryItemFailure,
  Foci,
  FocusDefinitions,
  ItemRecord,
  ItemState,
  InviteRedemptionResult,
  GeneratedNpcDraft,
  NpcProfile,
  NpcProfileRecord,
  ProfileRecord,
  PurchasedEquipmentItem,
  Skill
} from '../types';
import {
  getAttributeChoices,
  getEquipmentById,
  getEquipmentDisplayName,
  getEquipmentInventoryCategory,
  getEquipmentInventoryMass,
  getEquipmentInventoryRarity,
  getFocusSkillChoices,
  getSkillChoices
} from '../character/characterConstants';
import foci from '../../data/character/foci.json';
import {
  canAdvanceSkill,
  canLevelUp,
  getAttributeBoostRule,
  getAttributeModifier,
  getHighestFocusLevels,
  getNextSkillRankCost,
  grantsFocusAtLevel,
  hasExpertTraining,
  hasWarriorTraining,
  isCombatSkill,
  normalizeAdvancementProgress
} from '../character/characterMechanics';
import { characterCodec } from '../character/characterCodec';
import { shipState } from './shipState.svelte';
import { campaignState } from './campaignState.svelte';
import { crewState } from './crewState.svelte';

const BACKGROUNDS = backgrounds as BackgroundDefinitions;
const FOCI = foci as FocusDefinitions;
const SHIP_INVENTORY_OWNER_ID = 'SHIP_INVENTORY';
const CONDITION_CATEGORIES = ['combat', 'hazard', 'custom'] as const;
const DEFAULT_CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111';

type FinalizeInventoryDraft = {
  equipmentId: string;
  name: string;
  quantity: number;
  equipment_id?: string | null;
  item_state: ItemState;
  category: string;
  rarity: string;
  mass: number;
};

function emptyFinalizeResult(status: FinalizeCharacterArchiveResult['status'], message: string): FinalizeCharacterArchiveResult {
  return {
    success: false,
    status,
    message,
    characterInserted: false,
    inventory: {
      attempted: 0,
      inserted: 0,
      merged: 0,
      skipped: 0,
      failures: []
    }
  };
}

function isBuyableCatalogItem(item: NonNullable<ReturnType<typeof getEquipmentById>>) {
  return Boolean(
    item.app.playerVisible &&
    item.app.spawnable &&
    !item.app.gmOnly &&
    item.legality !== 'removed' &&
    item.availability !== 'removed' &&
    item.cost !== null
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueById<T extends { id: string }>(records: T[]) {
  return [...new Map(records.map(record => [record.id, record])).values()];
}

function isCampaignIdNotNullError(error: { message?: string } | null | undefined) {
  return Boolean(
    error?.message?.includes('campaign_id') &&
    error.message.includes('violates not-null constraint')
  );
}

function isMissingCampaignRosterTable(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(
    error?.code === 'PGRST205' &&
    error.message?.includes('campaign_characters')
  );
}

class DatabaseStateManager {
  activeUserId = $state<string | null>(null);
  activeCampaignId = $state<string | null>(null);
  activeUserProfile = $state<ProfileRecord | null>(null);
  campaigns = $state<CampaignRecord[]>([]);
  memberships = $state<CampaignMembership[]>([]);
  campaignInvites = $state<CampaignInvite[]>([]);
  campaignCharacters = $state<CampaignCharacter[]>([]);
  campaignRosterSchemaMissing = $state(false);
  campaignLogEvents = $state<CampaignLogEvent[]>([]);
  campaignMemberProfiles = $state<Record<string, ProfileRecord>>({});
  characters = $state<CharacterRecord[]>([]);
  npcProfiles = $state<Record<string, NpcProfileRecord>>({});
  items = $state<ItemRecord[]>([]);
  localCharacterArchive = $state<CharacterCreationArchive | null>(null);
  #subscription: RealtimeChannel | null = null;
  #lastLedgerSnapshot: Record<string, unknown> | null = null;
  #ledgerRefreshInterval: ReturnType<typeof setInterval> | null = null;
  #isRefreshingLedger = false;
  #suppressRealtimeWarningsUntil = 0;

  // --- RELATIONAL GETTERS ---
  get activeCampaign() {
    return this.campaigns.find(campaign => campaign.id === this.activeCampaignId) ?? null;
  }

  get activeMembership() {
    if (!this.activeCampaignId || !this.activeUserProfile) return null;
    return this.memberships.find(membership =>
      membership.campaign_id === this.activeCampaignId &&
      membership.user_id === this.activeUserProfile?.id
    ) ?? null;
  }

  get isGM() {
    return this.activeMembership?.role === 'GM' || this.activeCharacter?.role === 'GM';
  }

  get playerCharacters() {
    return this.characters.filter(character => (character.character_kind ?? character.role) === 'PLAYER');
  }

  get ownedPlayerCharacters() {
    return this.playerCharacters.filter(character => this.isCharacterOwnedByActiveUser(character));
  }

  get visiblePlayerCharacters() {
    if (!this.activeCampaignId) return this.ownedPlayerCharacters;
    return this.activeCampaignRosterCharacters;
  }

  get activeCampaignRosterCharacters() {
    if (!this.activeCampaignId) return [];
    const rosterIds = new Set(
      this.campaignCharacters
        .filter(entry => entry.campaign_id === this.activeCampaignId)
        .map(entry => entry.character_id)
    );

    return this.playerCharacters.filter(character => rosterIds.has(character.id));
  }

  get ownedCharactersAvailableForActiveCampaign() {
    if (!this.activeCampaignId) return this.ownedPlayerCharacters;
    const rosterIds = new Set(
      this.campaignCharacters
        .filter(entry => entry.campaign_id === this.activeCampaignId)
        .map(entry => entry.character_id)
    );

    return this.ownedPlayerCharacters.filter(character => !rosterIds.has(character.id));
  }

  get npcCharacters() {
    return this.characters.filter(character => character.character_kind === 'NPC');
  }

  getNpcProfile(characterId: string) {
    return this.npcProfiles[characterId]?.profile ?? null;
  }

  get activeCampaignMembers(): CampaignMemberView[] {
    if (!this.activeCampaignId) return [];
    return this.memberships
      .filter(membership => membership.campaign_id === this.activeCampaignId)
      .map(membership => ({
        ...membership,
        profile: this.campaignMemberProfiles[membership.user_id] ?? null
      }));
  }

  get activeCharacter() {
    if (this.localCharacterArchive) return this.localCharacterArchive.core;
    const membershipCharacterId = this.activeMembership?.active_character_id;
    const activeId = this.activeUserId ?? membershipCharacterId;
    if (activeId) {
      const selected = this.characters.find(c => c.id === activeId);
      if (selected) return selected;
    }

    return this.activeCampaignRosterCharacters[0] ?? this.ownedPlayerCharacters[0] ?? this.characters.find(c => c.role === 'GM') ?? null;
  }

  get localCharacterCreation() {
    return this.localCharacterArchive?.creation ?? null;
  }

  get isLocalCharacterPreview() {
    return Boolean(this.localCharacterArchive);
  }

  get shipInventory() {
    return this.items.filter(item =>
      item.owner_id === SHIP_INVENTORY_OWNER_ID &&
      item.campaign_id === this.activeCampaignId &&
      item.item_state === 'stored'
    );
  }

  get personalInventory() {
    if (this.localCharacterArchive) {
      const archive = this.localCharacterArchive;
      const previewItems: ItemRecord[] = [];

      archive.creation.equipment.items.forEach((entry, index) => {
        const catalogItem = getEquipmentById(entry.equipmentId);
        if (!catalogItem) return;

        previewItems.push({
          id: `preview-${archive.core.id}-${index}-${entry.equipmentId}`,
          owner_id: archive.core.id,
          equipment_id: entry.equipmentId,
          item_state: 'stowed',
          name: getEquipmentDisplayName(catalogItem, entry.equipmentId),
          category: getEquipmentInventoryCategory(catalogItem),
          rarity: getEquipmentInventoryRarity(catalogItem),
          quantity: this.normalizeSpawnQuantity(entry.quantity),
          mass: getEquipmentInventoryMass(catalogItem)
        });
      });

      archive.creation.equipment.purchasedItems.forEach((entry, index) => {
        const catalogItem = getEquipmentById(entry.equipmentId);
        if (!catalogItem) return;

        previewItems.push({
          id: `preview-${archive.core.id}-purchase-${index}-${entry.equipmentId}`,
          owner_id: archive.core.id,
          equipment_id: entry.equipmentId,
          item_state: 'stowed',
          name: catalogItem.name,
          category: getEquipmentInventoryCategory(catalogItem),
          rarity: getEquipmentInventoryRarity(catalogItem),
          quantity: this.normalizeSpawnQuantity(entry.quantity),
          mass: getEquipmentInventoryMass(catalogItem)
        });
      });

      return previewItems;
    }

    return this.items.filter(item =>
      item.owner_id === this.activeCharacter?.id &&
      (item.item_state === 'readied' || item.item_state === 'stowed')
    );
  }

  getCharacterById(characterId: string) {
    if (this.localCharacterArchive?.core.id === characterId) return this.localCharacterArchive.core;
    return this.characters.find(c => c.id === characterId) || null;
  }

  isCharacterOwnedByActiveUser(character: CharacterRecord | null | undefined) {
    if (!character || !this.activeUserProfile) return false;
    return character.owner_user_id === this.activeUserProfile.id;
  }

  canManageCharacter(character: CharacterRecord | null | undefined) {
    if (!character) return false;
    if (this.localCharacterArchive?.core.id === character.id) return true;
    if (this.isGM) return true;
    return (
      this.isCharacterOwnedByActiveUser(character) &&
      (character.character_kind ?? character.role) === 'PLAYER'
    );
  }

  canDeleteCharacter(character: CharacterRecord | null | undefined) {
    return this.canManageCharacter(character);
  }

  canSelectCharacter(character: CharacterRecord | null | undefined) {
    if (!character) return false;
    if (this.isCharacterOwnedByActiveUser(character)) return true;
    return (
      Boolean(this.activeCampaignId) &&
      this.visiblePlayerCharacters.some(visibleCharacter => visibleCharacter.id === character.id) &&
      (character.character_kind ?? character.role) === 'PLAYER'
    );
  }

  isCharacterInActiveCampaignRoster(characterId: string) {
    return Boolean(
      this.activeCampaignId &&
      this.campaignCharacters.some(entry =>
        entry.campaign_id === this.activeCampaignId &&
        entry.character_id === characterId
      )
    );
  }

  normalizeSpawnQuantity(quantity: number) {
    return Math.max(1, Math.floor(Number(quantity)) || 1);
  }

  normalizeItemRecord(item: ItemRecord): ItemRecord {
    const itemState = item.item_state ?? (item.owner_id === SHIP_INVENTORY_OWNER_ID ? 'stored' : 'stowed');
    return {
      ...item,
      campaign_id: item.campaign_id ?? null,
      item_state: itemState
    };
  }

  normalizeActiveConditions(value: unknown): CharacterActiveCondition[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((condition) => {
      if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return [];
      const entry = condition as Partial<CharacterActiveCondition>;
      if (typeof entry.id !== 'string') return [];
      if (!CONDITION_CATEGORIES.includes(entry.category as never)) return [];
      if (typeof entry.name !== 'string') return [];
      if (typeof entry.summary !== 'string') return [];
      if (typeof entry.createdAt !== 'string') return [];

      return [{
        id: entry.id,
        category: entry.category,
        name: entry.name,
        summary: entry.summary,
        templateId: entry.templateId,
        createdAt: entry.createdAt
      } as CharacterActiveCondition];
    });
  }

  normalizeAdvancementProgress(value: unknown): CharacterAdvancementProgress {
    return normalizeAdvancementProgress(value);
  }

  normalizeCharacterNotes(value: unknown): CharacterNotes {
    if (!isRecord(value)) {
      return {
        homeworld: '',
        employerAffiliation: '',
        goal: '',
        notes: ''
      };
    }

    return {
      homeworld: typeof value.homeworld === 'string' ? value.homeworld : '',
      employerAffiliation: typeof value.employerAffiliation === 'string' ? value.employerAffiliation : '',
      goal: typeof value.goal === 'string' ? value.goal : '',
      notes: typeof value.notes === 'string' ? value.notes : ''
    };
  }

  normalizeCharacterRecord(char: CharacterRecord): CharacterRecord {
    return {
      ...char,
      campaign_id: char.campaign_id ?? null,
      character_kind: char.character_kind ?? (char.role === 'GM' ? 'GM' : 'PLAYER'),
      xp: typeof char.xp === 'number' ? char.xp : 0,
      character_notes: this.normalizeCharacterNotes(char.character_notes),
      advancement_progress: this.normalizeAdvancementProgress(char.advancement_progress),
      active_conditions: this.normalizeActiveConditions(char.active_conditions)
    };
  }

  normalizeNpcProfileRecord(record: NpcProfileRecord): NpcProfileRecord {
    const profile = isRecord(record.profile) ? record.profile as unknown as NpcProfile : null;
    const gmNotes = typeof record.gm_notes === 'string' ? record.gm_notes : '';

    return {
      ...record,
      gm_notes: gmNotes,
      profile: {
        schema: 'PERSEPHONE-NPC',
        version: 1,
        kind: profile?.kind === 'beast' ? 'beast' : 'human',
        characterId: typeof profile?.characterId === 'string' ? profile.characterId : record.character_id,
        identity: {
          name: typeof profile?.identity?.name === 'string' ? profile.identity.name : 'Unnamed NPC',
          culture: typeof profile?.identity?.culture === 'string' ? profile.identity.culture : 'unknown',
          firstNameType: typeof profile?.identity?.firstNameType === 'string' ? profile.identity.firstNameType : 'any',
          age: typeof profile?.identity?.age === 'string' ? profile.identity.age : 'Unknown age',
          background: typeof profile?.identity?.background === 'string' ? profile.identity.background : 'Unknown background',
          role: typeof profile?.identity?.role === 'string' ? profile.identity.role : 'Unknown role'
        },
        personality: {
          biggestProblem: typeof profile?.personality?.biggestProblem === 'string' ? profile.personality.biggestProblem : '',
          obviousTrait: typeof profile?.personality?.obviousTrait === 'string' ? profile.personality.obviousTrait : '',
          greatestDesire: typeof profile?.personality?.greatestDesire === 'string' ? profile.personality.greatestDesire : '',
          motivation: typeof profile?.personality?.motivation === 'string' ? profile.personality.motivation : '',
          want: typeof profile?.personality?.want === 'string' ? profile.personality.want : '',
          power: typeof profile?.personality?.power === 'string' ? profile.personality.power : '',
          hook: typeof profile?.personality?.hook === 'string' ? profile.personality.hook : '',
          initialManner: typeof profile?.personality?.initialManner === 'string' ? profile.personality.initialManner : '',
          defaultDealOutcome: typeof profile?.personality?.defaultDealOutcome === 'string' ? profile.personality.defaultDealOutcome : ''
        },
        morphology: isRecord(profile?.morphology)
          ? {
              basicAnimalFeatures: typeof profile.morphology.basicAnimalFeatures === 'string' ? profile.morphology.basicAnimalFeatures : '',
              bodyPlan: typeof profile.morphology.bodyPlan === 'string' ? profile.morphology.bodyPlan : '',
              limbNovelty: typeof profile.morphology.limbNovelty === 'string' ? profile.morphology.limbNovelty : '',
              skinNovelty: typeof profile.morphology.skinNovelty === 'string' ? profile.morphology.skinNovelty : '',
              mainWeapon: typeof profile.morphology.mainWeapon === 'string' ? profile.morphology.mainWeapon : '',
              size: typeof profile.morphology.size === 'string' ? profile.morphology.size : ''
            }
          : undefined,
        behavior: isRecord(profile?.behavior)
          ? {
              ecologicalRole: profile.behavior.ecologicalRole === 'prey' || profile.behavior.ecologicalRole === 'scavenger'
                ? profile.behavior.ecologicalRole
                : 'predator',
              trait: typeof profile.behavior.trait === 'string' ? profile.behavior.trait : '',
              swarm: profile.behavior.swarm === true
            }
          : undefined,
        hazards: isRecord(profile?.hazards)
          ? {
              harmfulDischarge: typeof profile.hazards.harmfulDischarge === 'string' ? profile.hazards.harmfulDischarge : '',
              poisonEffect: typeof profile.hazards.poisonEffect === 'string' ? profile.hazards.poisonEffect : '',
              poisonOnset: typeof profile.hazards.poisonOnset === 'string' ? profile.hazards.poisonOnset : '',
              poisonDuration: typeof profile.hazards.poisonDuration === 'string' ? profile.hazards.poisonDuration : ''
            }
          : undefined,
        combat: {
          presetId: typeof profile?.combat?.presetId === 'string' ? profile.combat.presetId : 'normal_human',
          label: typeof profile?.combat?.label === 'string' ? profile.combat.label : 'Baseline Spacer',
          sourceLabel: typeof profile?.combat?.sourceLabel === 'string' ? profile.combat.sourceLabel : 'Normal Human',
          hd: typeof profile?.combat?.hd === 'number' ? profile.combat.hd : 1,
          hp: typeof profile?.combat?.hp === 'number' ? profile.combat.hp : 1,
          hpRolls: Array.isArray(profile?.combat?.hpRolls) ? profile.combat.hpRolls.filter((roll) => typeof roll === 'number') : [1],
          ac: typeof profile?.combat?.ac === 'number' ? profile.combat.ac : 10,
          armorTag: profile?.combat?.armorTag,
          attackBonus: typeof profile?.combat?.attackBonus === 'number' ? profile.combat.attackBonus : 0,
          attacks: typeof profile?.combat?.attacks === 'number' ? profile.combat.attacks : 1,
          damage: typeof profile?.combat?.damage === 'string' ? profile.combat.damage : 'Unarmed',
          move: typeof profile?.combat?.move === 'string' ? profile.combat.move : '10m',
          morale: typeof profile?.combat?.morale === 'number' ? profile.combat.morale : 6,
          skillBonus: typeof profile?.combat?.skillBonus === 'number' ? profile.combat.skillBonus : 1,
          save: typeof profile?.combat?.save === 'number' ? profile.combat.save : 15
        },
        rolls: Array.isArray(profile?.rolls)
          ? profile.rolls.filter((roll) => isRecord(roll)) as NpcProfile['rolls']
          : [],
        generatedAt: typeof profile?.generatedAt === 'string' ? profile.generatedAt : new Date().toISOString(),
        gmNotes
      }
    };
  }

  applySkillCredit(
    skills: Partial<Record<Skill, number>>,
    investments: Partial<Record<Skill, number>>,
    skill: Skill,
    points: number,
    characterLevel: number,
    bypassLevelRequirement = false
  ) {
    let remaining = Math.max(0, Math.floor(points));
    let rank = skills[skill] ?? -1;
    let investment = Math.max(0, Math.floor(investments[skill] ?? 0));

    while (remaining > 0) {
      const cost = getNextSkillRankCost(rank);
      if (cost === null) return false;
      if (!bypassLevelRequirement && !canAdvanceSkill(rank, characterLevel)) return false;

      const needed = Math.max(0, cost - investment);
      const spent = Math.min(remaining, needed);
      investment += spent;
      remaining -= spent;

      if (investment >= cost) {
        rank += 1;
        skills[skill] = rank;
        investment = 0;
      }
    }

    if (investment > 0) {
      investments[skill] = investment;
    } else {
      delete investments[skill];
    }

    return true;
  }

  getFocusBonusSkill(focus: Foci, skills: Partial<Record<Skill, number>>, selectedSkill?: Skill) {
    const entry = FOCI[focus]?.bonusSkill;
    if (!entry) return null;

    if (entry.type === 'skill') {
      if ((skills[entry.value] ?? -1) < 4) return entry.value;
      return selectedSkill && selectedSkill !== entry.value && (skills[selectedSkill] ?? -1) < 4
        ? selectedSkill
        : null;
    }

    const tokenChoices = getFocusSkillChoices(entry.value);
    if (!selectedSkill) return null;
    if (tokenChoices.includes(selectedSkill) && (skills[selectedSkill] ?? -1) < 4) return selectedSkill;
    if (tokenChoices.every((skill) => (skills[skill] ?? -1) >= 4) && (skills[selectedSkill] ?? -1) < 4) {
      return selectedSkill;
    }

    return null;
  }

  itemsCanStack(candidate: ItemRecord, target: ItemRecord) {
    if (candidate.item_state !== target.item_state) return false;
    if (target.equipment_id) return candidate.equipment_id === target.equipment_id;

    return !candidate.equipment_id &&
      candidate.name === target.name &&
      candidate.category === target.category &&
      candidate.rarity === target.rarity;
  }

  async loadLocalCharacterArchive(file: File) {
    try {
      this.localCharacterArchive = await characterCodec.importFromFile(file);
      return true;
    } catch (error) {
      console.error('Character archive import failed:', error);
      return false;
    }
  }

  clearLocalCharacterPreview() {
    this.localCharacterArchive = null;
  }

  setActiveUserProfile(profile: ProfileRecord | null) {
    this.activeUserProfile = profile;
    if (profile) {
      this.campaignMemberProfiles = {
        ...this.campaignMemberProfiles,
        [profile.id]: profile
      };
    }
  }

  clearForSignedOut() {
    this.activeUserProfile = null;
    this.activeCampaignId = null;
    this.activeUserId = null;
    this.campaigns = [];
    this.memberships = [];
    this.campaignInvites = [];
    this.campaignCharacters = [];
    this.campaignRosterSchemaMissing = false;
    this.characters = [];
    this.npcProfiles = {};
    this.items = [];
    this.campaignLogEvents = [];
    this.campaignMemberProfiles = {};
    this.localCharacterArchive = null;
    this.#lastLedgerSnapshot = null;

    this.stopCampaignRealtime();
  }

  async setActiveCampaign(campaignId: string) {
    if (this.activeCampaignId === campaignId) return;
    this.activeCampaignId = campaignId;
    await this.loadCampaignData(campaignId);
    this.subscribeToChanges();
  }

  async setActiveCharacter(characterId: string) {
    const character = this.getCharacterById(characterId);
    if (!this.canSelectCharacter(character)) return;

    this.activeUserId = characterId;

    if (!this.activeCampaignId || !this.activeUserProfile || !this.isCharacterInActiveCampaignRoster(characterId)) return;

    const { error } = await supabase
      .from('campaign_members')
      .update({ active_character_id: characterId })
      .eq('campaign_id', this.activeCampaignId)
      .eq('user_id', this.activeUserProfile.id);

    if (error) console.error('Failed to update active character:', error);
  }

  stopCampaignRealtime() {
    this.#suppressRealtimeWarningsUntil = Date.now() + 3000;
    if (this.#subscription) {
      void supabase.removeChannel(this.#subscription);
      this.#subscription = null;
    }
    this.stopLedgerRefresh();
  }

  applyLedgerState(ledgerData: Record<string, any>) {
    if (ledgerData.ship_name !== null && ledgerData.ship_name !== undefined) shipState.blueprint.name = ledgerData.ship_name;
    if (ledgerData.hull !== null && ledgerData.hull !== undefined) shipState.blueprint.hull = ledgerData.hull;
    if (ledgerData.reactor !== null && ledgerData.reactor !== undefined) shipState.blueprint.reactor = ledgerData.reactor;
    if (ledgerData.engine !== null && ledgerData.engine !== undefined) shipState.blueprint.engine = ledgerData.engine;
    if (ledgerData.hp !== null && ledgerData.hp !== undefined) shipState.vitals.currentHealth = ledgerData.hp;
    if (ledgerData.ri !== null && ledgerData.ri !== undefined) shipState.vitals.currentRI = ledgerData.ri;
    if (ledgerData.active_fuel !== undefined) shipState.propulsion.activeFuel = ledgerData.active_fuel;
    if (ledgerData.active_mode !== undefined) shipState.propulsion.activeMode = ledgerData.active_mode;
    if (ledgerData.fuel_levels) shipState.propulsion.currentFuel = ledgerData.fuel_levels;
    if (ledgerData.ship_credits !== undefined) crewState.shipCredits = ledgerData.ship_credits;
    if (ledgerData.kibble_days !== undefined) crewState.kibbleDays = ledgerData.kibble_days;
    if (ledgerData.active_conditions) shipState.vitals.activeConditions = ledgerData.active_conditions;
    if (ledgerData.components) shipState.blueprint.components = ledgerData.components;
    if (ledgerData.current_day !== undefined) campaignState.currentDay = ledgerData.current_day;
    if (ledgerData.current_location) campaignState.shipLocation = ledgerData.current_location;
    if (ledgerData.active_flight !== undefined) campaignState.activeMission = ledgerData.active_flight;
    this.#lastLedgerSnapshot = this.createLedgerSnapshot(ledgerData);
  }

  createLedgerSnapshot(ledgerData: Record<string, any> = {}) {
    return {
      id: ledgerData.id ?? 'TT-9',
      campaign_id: ledgerData.campaign_id ?? this.activeCampaignId,
      ship_name: ledgerData.ship_name ?? shipState.blueprint.name,
      hull: ledgerData.hull ?? shipState.blueprint.hull,
      reactor: ledgerData.reactor ?? shipState.blueprint.reactor,
      engine: ledgerData.engine ?? shipState.blueprint.engine,
      hp: ledgerData.hp ?? shipState.vitals.currentHealth,
      ri: ledgerData.ri ?? shipState.vitals.currentRI,
      active_fuel: ledgerData.active_fuel ?? shipState.propulsion.activeFuel,
      active_mode: ledgerData.active_mode ?? shipState.propulsion.activeMode,
      fuel_levels: ledgerData.fuel_levels ?? shipState.propulsion.currentFuel,
      ship_credits: ledgerData.ship_credits ?? crewState.shipCredits,
      kibble_days: ledgerData.kibble_days ?? crewState.kibbleDays,
      active_conditions: ledgerData.active_conditions ?? shipState.vitals.activeConditions,
      components: ledgerData.components ?? shipState.blueprint.components,
      current_day: ledgerData.current_day ?? campaignState.currentDay,
      current_location: ledgerData.current_location ?? campaignState.shipLocation,
      active_flight: ledgerData.active_flight ?? campaignState.activeMission
    };
  }

  async upsertShipLedger(payload: Record<string, unknown>, errorLabel: string) {
    if (!this.activeCampaignId) return { data: null, error: null };

    const { id, ...ledgerPayload } = {
      ...this.createLedgerSnapshot(),
      ...payload,
      campaign_id: this.activeCampaignId
    };

    let result = await supabase
      .from('ship_ledger')
      .upsert(ledgerPayload, { onConflict: 'campaign_id' })
      .select()
      .maybeSingle();

    if (result.error) {
      result = await supabase
        .from('ship_ledger')
        .upsert(
          {
            id: this.#lastLedgerSnapshot?.id ?? this.activeCampaignId,
            ...ledgerPayload
          },
          { onConflict: 'campaign_id' }
        )
        .select()
        .maybeSingle();
    }

    if (result.error) console.error(errorLabel, result.error);
    if (result.data) this.#lastLedgerSnapshot = this.createLedgerSnapshot(result.data as Record<string, unknown>);

    return result;
  }

  async refreshShipLedgerFromCloud() {
    if (!this.activeCampaignId || this.#isRefreshingLedger) return;
    this.#isRefreshingLedger = true;

    const { data, error } = await supabase
      .from('ship_ledger')
      .select('*')
      .eq('campaign_id', this.activeCampaignId)
      .maybeSingle();

    this.#isRefreshingLedger = false;

    if (error) {
      console.error('Failed to refresh ship ledger:', error);
      return;
    }

    if (data) this.applyLedgerState(data as Record<string, unknown>);
  }

  startLedgerRefresh() {
    this.stopLedgerRefresh();
    void this.refreshShipLedgerFromCloud();
    this.#ledgerRefreshInterval = setInterval(() => {
      void this.refreshShipLedgerFromCloud();
    }, 2000);
  }

  stopLedgerRefresh() {
    if (!this.#ledgerRefreshInterval) return;
    clearInterval(this.#ledgerRefreshInterval);
    this.#ledgerRefreshInterval = null;
  }

  async createCampaignLog(
    eventType: string,
    summary: string,
    payload: Record<string, unknown> = {},
    snapshot: CampaignLogSnapshot | null = null
  ) {
    if (!this.activeCampaignId) return;

    const logDraft = {
      campaign_id: this.activeCampaignId,
      actor_user_id: this.activeUserProfile?.id ?? null,
      actor_character_id: this.activeCharacter?.id ?? null,
      actor_role: this.activeMembership?.role ?? null,
      event_type: eventType,
      campaign_day: campaignState.currentDay,
      summary,
      payload,
      snapshot
    };

    const { data, error } = await supabase
      .from('campaign_log_events')
      .insert(logDraft)
      .select()
      .single();

    if (error) {
      console.error('Failed to write campaign log:', error);
      return;
    }

    if (data) this.campaignLogEvents = [data as CampaignLogEvent, ...this.campaignLogEvents].slice(0, 100);
  }

  async rollbackLogEvent(event: CampaignLogEvent) {
    if (!this.isGM || !event.snapshot || event.reverted_at) return false;

    const snapshot = event.snapshot;
    const before = snapshot.before;
    let restored = false;

    if (snapshot.table === 'ship_ledger' && isRecord(before)) {
      const { id, campaign_id, ...ledgerUpdates } = before;
      const { error } = await supabase
        .from('ship_ledger')
        .update(ledgerUpdates)
        .eq('campaign_id', event.campaign_id);

      if (error) {
        console.error('Rollback failed for ship ledger:', error);
        return false;
      }

      this.applyLedgerState(before);
      restored = true;
    }

    if (snapshot.table === 'characters') {
      if (isRecord(before)) {
        const { error } = await supabase
          .from('characters')
          .upsert(before);

        if (error) {
          console.error('Rollback failed for character:', error);
          return false;
        }

        const restoredCharacter = this.normalizeCharacterRecord(before as unknown as CharacterRecord);
        const index = this.characters.findIndex(character => character.id === restoredCharacter.id);
        if (index !== -1) this.characters[index] = restoredCharacter;
        else this.characters.push(restoredCharacter);
        restored = true;
      } else if (snapshot.recordId) {
        const { error } = await supabase
          .from('characters')
          .delete()
          .eq('id', snapshot.recordId);

        if (error) {
          console.error('Rollback failed for inserted character:', error);
          return false;
        }

        this.characters = this.characters.filter(character => character.id !== snapshot.recordId);
        restored = true;
      }
    }

    if (snapshot.table === 'items') {
      if (Array.isArray(before)) {
        const restoredItems = before as unknown as ItemRecord[];
        const restoreIds = restoredItems.map(item => item.id);

        if (restoreIds.length > 0) {
          await supabase.from('items').delete().in('id', restoreIds);
          const { error } = await supabase.from('items').upsert(restoredItems);

          if (error) {
            console.error('Rollback failed for item set:', error);
            return false;
          }

          this.items = [
            ...this.items.filter(item => !restoreIds.includes(item.id)),
            ...restoredItems.map(item => this.normalizeItemRecord(item))
          ];
          restored = true;
        }
      } else if (isRecord(before)) {
        const { error } = await supabase
          .from('items')
          .upsert(before);

        if (error) {
          console.error('Rollback failed for item:', error);
          return false;
        }

        const restoredItem = this.normalizeItemRecord(before as unknown as ItemRecord);
        const index = this.items.findIndex(item => item.id === restoredItem.id);
        if (index !== -1) this.items[index] = restoredItem;
        else this.items.push(restoredItem);
        restored = true;
      } else if (snapshot.recordId) {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', snapshot.recordId);

        if (error) {
          console.error('Rollback failed for inserted item:', error);
          return false;
        }

        this.items = this.items.filter(item => item.id !== snapshot.recordId);
        restored = true;
      }
    }

    if (!restored) return false;

    const revertedAt = new Date().toISOString();
    const { error } = await supabase
      .from('campaign_log_events')
      .update({
        reverted_at: revertedAt,
        reverted_by: this.activeUserProfile?.id ?? null
      })
      .eq('id', event.id);

    if (error) {
      console.error('Failed to mark log event as reverted:', error);
      return false;
    }

    const index = this.campaignLogEvents.findIndex(logEvent => logEvent.id === event.id);
    if (index !== -1) {
      this.campaignLogEvents[index] = {
        ...this.campaignLogEvents[index],
        reverted_at: revertedAt,
        reverted_by: this.activeUserProfile?.id ?? null
      };
    }

    await this.createCampaignLog(
      'rollback',
      `Rolled back: ${event.summary}`,
      { rolledBackEventId: event.id, eventType: event.event_type },
      null
    );

    return true;
  }

  // --- SUPABASE NETWORK CALLS ---
  async loadData() {
    if (!this.activeUserProfile) {
      this.clearForSignedOut();
      return;
    }

    const [membershipResult, ownedCharactersResult] = await Promise.all([
      supabase
        .from('campaign_members')
        .select('campaign_id,user_id,role,active_character_id'),
      supabase
        .from('characters')
        .select('*')
        .eq('owner_user_id', this.activeUserProfile.id)
    ]);

    const { data: membershipData, error: membershipErr } = membershipResult;
    const { data: ownedCharacterData, error: ownedCharacterErr } = ownedCharactersResult;

    if (ownedCharacterErr) {
      console.error('Error loading owned characters:', ownedCharacterErr);
    }

    const ownedCharacters = (ownedCharacterData ?? []) as CharacterRecord[];
    this.characters = ownedCharacters.map((char) => this.normalizeCharacterRecord(char));
    await this.loadOwnedPersonalItems(this.characters);

    if (membershipErr) {
      console.error('Error loading campaign memberships:', membershipErr);
      return;
    }

    this.memberships = (membershipData ?? []) as CampaignMembership[];
    await this.loadProfilesForMemberships(this.memberships);
    const campaignIds = this.memberships.map(membership => membership.campaign_id);

    if (campaignIds.length === 0) {
      this.stopCampaignRealtime();
      this.activeCampaignId = null;
      this.campaigns = [];
      this.campaignInvites = [];
      this.campaignCharacters = [];
      this.campaignLogEvents = [];
      this.campaignMemberProfiles = {};
      this.activeUserId = this.ownedPlayerCharacters.some(character => character.id === this.activeUserId)
        ? this.activeUserId
        : this.ownedPlayerCharacters[0]?.id ?? null;
      return;
    }

    const { data: campaignData, error: campaignErr } = await supabase
      .from('campaigns')
      .select('*')
      .in('id', campaignIds)
      .order('updated_at', { ascending: false });

    if (campaignErr) {
      console.error('Error loading campaigns:', campaignErr);
      return;
    }

    this.campaigns = (campaignData ?? []) as CampaignRecord[];
    const nextCampaignId = this.activeCampaignId && campaignIds.includes(this.activeCampaignId)
      ? this.activeCampaignId
      : this.campaigns[0]?.id ?? campaignIds[0];

    this.activeCampaignId = nextCampaignId;
    await this.loadCampaignData(nextCampaignId);
  }

  async loadOwnedPersonalItems(characters: CharacterRecord[]) {
    const ownedCharacterIds = characters
      .filter(character => this.isCharacterOwnedByActiveUser(character))
      .map(character => character.id);

    if (ownedCharacterIds.length === 0) {
      this.items = this.items.filter(item => item.owner_id === SHIP_INVENTORY_OWNER_ID);
      return;
    }

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('owner_id', ownedCharacterIds);

    if (error) {
      console.error('Error loading owned character items:', error);
      return;
    }

    const shipItems = this.items.filter(item => item.owner_id === SHIP_INVENTORY_OWNER_ID);
    this.items = uniqueById([
      ...shipItems,
      ...(data ?? []).map((item) => this.normalizeItemRecord(item as ItemRecord))
    ]);
  }

  async loadProfilesForMemberships(memberships: CampaignMembership[]) {
    const userIds = [...new Set(memberships.map(membership => membership.user_id).filter(Boolean))];
    if (userIds.length === 0) {
      this.campaignMemberProfiles = {};
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,display_name,avatar_url,created_at')
      .in('id', userIds);

    if (error) {
      console.error('Error loading campaign member profiles:', error);
      return;
    }

    this.campaignMemberProfiles = Object.fromEntries(
      (data ?? []).map(profile => [profile.id, profile as ProfileRecord])
    );
  }

  async loadCampaignData(campaignId: string) {
    const rosterResult = await supabase
      .from('campaign_characters')
      .select('campaign_id,character_id,user_id,created_at')
      .eq('campaign_id', campaignId);

    if (rosterResult.error) {
      if (isMissingCampaignRosterTable(rosterResult.error)) {
        this.campaignRosterSchemaMissing = true;
        console.error(
          'Campaign roster schema missing. Apply db/repairs/20260612030000_campaign_character_roster.sql:',
          rosterResult.error
        );
      } else {
        console.error('Error loading campaign roster:', rosterResult.error);
      }
      this.campaignCharacters = this.campaignCharacters.filter(entry => entry.campaign_id !== campaignId);
    } else {
      this.campaignRosterSchemaMissing = false;
      this.campaignCharacters = [
        ...this.campaignCharacters.filter(entry => entry.campaign_id !== campaignId),
        ...((rosterResult.data ?? []) as CampaignCharacter[])
      ];
    }

    const rosterCharacterIds = (rosterResult.data ?? []).map(entry => entry.character_id);
    const rosterCharactersRequest = rosterCharacterIds.length > 0
      ? supabase.from('characters').select('*').in('id', rosterCharacterIds)
      : Promise.resolve({ data: [], error: null });
    const rosterItemsRequest = rosterCharacterIds.length > 0
      ? supabase.from('items').select('*').in('owner_id', rosterCharacterIds)
      : Promise.resolve({ data: [], error: null });
    const npcProfilesRequest = this.isGM
      ? supabase.from('npc_profiles').select('*').eq('campaign_id', campaignId)
      : Promise.resolve({ data: [], error: null });

    const [campaignCharactersResult, rosterCharactersResult, rosterItemsResult, itemsResult, ledgerResult, logsResult, npcProfilesResult] = await Promise.all([
      supabase.from('characters').select('*').eq('campaign_id', campaignId),
      rosterCharactersRequest,
      rosterItemsRequest,
      supabase.from('items').select('*').eq('campaign_id', campaignId),
      supabase.from('ship_ledger').select('*').eq('campaign_id', campaignId).maybeSingle(),
      supabase
        .from('campaign_log_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('event_time', { ascending: false })
        .limit(100),
      npcProfilesRequest
    ]);

    if (campaignCharactersResult.data || rosterCharactersResult.data) {
      const campaignScopedCharacters = ((campaignCharactersResult.data ?? []) as CharacterRecord[])
        .filter(character => (character.character_kind ?? character.role) !== 'PLAYER');
      this.characters = uniqueById([
        ...this.characters,
        ...campaignScopedCharacters.map((char) => this.normalizeCharacterRecord(char)),
        ...((rosterCharactersResult.data ?? []) as CharacterRecord[]).map((char) => this.normalizeCharacterRecord(char))
      ]);
    }
    if (campaignCharactersResult.error) console.error('Error loading campaign characters:', campaignCharactersResult.error);
    if (rosterCharactersResult.error) console.error('Error loading roster characters:', rosterCharactersResult.error);

    if (itemsResult.data || rosterItemsResult.data) {
      this.items = uniqueById([
        ...this.items.filter(item => item.campaign_id !== campaignId || item.owner_id !== SHIP_INVENTORY_OWNER_ID),
        ...((itemsResult.data ?? []) as ItemRecord[]).map((item) => this.normalizeItemRecord(item)),
        ...((rosterItemsResult.data ?? []) as ItemRecord[]).map((item) => this.normalizeItemRecord(item))
      ]);
    }
    if (itemsResult.error) console.error('Error loading items:', itemsResult.error);
    if (rosterItemsResult.error) console.error('Error loading roster items:', rosterItemsResult.error);

    if (ledgerResult.data) {
      this.applyLedgerState(ledgerResult.data as Record<string, any>);
    }
    if (ledgerResult.error) console.error('Error loading ship ledger:', ledgerResult.error);

    if (logsResult.data) {
      this.campaignLogEvents = logsResult.data as CampaignLogEvent[];
    }
    if (logsResult.error) console.error('Error loading campaign logs:', logsResult.error);

    if (npcProfilesResult.data) {
      const profiles = (npcProfilesResult.data as NpcProfileRecord[]).map((record) => this.normalizeNpcProfileRecord(record));
      this.npcProfiles = Object.fromEntries(profiles.map((record) => [record.character_id, record]));
    } else if (!this.isGM) {
      this.npcProfiles = {};
    }
    if (npcProfilesResult.error && this.isGM) console.error('Error loading NPC profiles:', npcProfilesResult.error);

    await this.loadCampaignInvites();

    const membershipCharacterId = this.activeMembership?.active_character_id;
    this.activeUserId = membershipCharacterId && this.isCharacterInActiveCampaignRoster(membershipCharacterId)
      ? membershipCharacterId
      : this.activeCampaignRosterCharacters[0]?.id ?? this.ownedPlayerCharacters[0]?.id ?? this.characters.find(character => character.role === 'GM')?.id ?? null;
  }

  async loadCampaignInvites() {
    if (!this.activeCampaignId || !this.isGM) {
      this.campaignInvites = [];
      return;
    }

    const { data, error } = await supabase
      .from('campaign_invites')
      .select('*')
      .eq('campaign_id', this.activeCampaignId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading campaign invites:', error);
      this.campaignInvites = [];
      return;
    }

    this.campaignInvites = (data ?? []) as CampaignInvite[];
  }

  async createCampaign(name: string, description = '') {
    if (!this.activeUserProfile) return null;

    const normalizedName = name.trim();
    if (!normalizedName) return null;

    const campaignDraft = {
      name: normalizedName,
      description: description.trim() || null,
      status: 'active' as const,
      created_by: this.activeUserProfile.id
    };

    let campaign: CampaignRecord | null = null;
    const directResult = await supabase
      .from('campaigns')
      .insert(campaignDraft)
      .select()
      .single();

    if (directResult.error) {
      const rpcResult = await supabase.rpc('create_home_campaign', {
        campaign_name: normalizedName,
        campaign_description: campaignDraft.description
      });

      if (rpcResult.error) {
        console.error('Failed to create campaign:', directResult.error, rpcResult.error);
        return null;
      }

      campaign = rpcResult.data as CampaignRecord;
    } else {
      campaign = directResult.data as CampaignRecord;

      const membershipResult = await supabase
        .from('campaign_members')
        .insert({
          campaign_id: campaign.id,
          user_id: this.activeUserProfile.id,
          role: 'GM' as CampaignRole,
          active_character_id: null
        });

      if (membershipResult.error) {
        await supabase
          .from('campaigns')
          .delete()
          .eq('id', campaign.id);
        console.error('Failed to create campaign membership:', membershipResult.error);
        return null;
      }
    }

    await this.loadData();
    await this.setActiveCampaign(campaign.id);
    await this.createCampaignLog(
      'campaign_created',
      `Created campaign ${campaign.name}.`,
      { campaignId: campaign.id },
      null
    );

    return campaign;
  }

  async deleteCampaign(campaignId = this.activeCampaignId) {
    if (!campaignId || !this.isGM) return false;

    const campaign = this.campaigns.find(entry => entry.id === campaignId) ?? null;
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      const { error: rpcError } = await supabase.rpc('delete_home_campaign', {
        target_campaign: campaignId
      });

      if (rpcError) {
        console.error('Failed to delete campaign:', error, rpcError);
        return false;
      }
    }

    this.campaigns = this.campaigns.filter(entry => entry.id !== campaignId);
    this.memberships = this.memberships.filter(membership => membership.campaign_id !== campaignId);

    if (this.activeCampaignId === campaignId) {
      this.activeCampaignId = null;
      this.activeUserId = null;
      this.characters = [];
      this.npcProfiles = {};
      this.items = [];
      this.campaignInvites = [];
      this.campaignLogEvents = [];
      const nextCampaign = this.campaigns[0] ?? null;
      if (nextCampaign) await this.setActiveCampaign(nextCampaign.id);
    }

    if (campaign) {
      await this.createCampaignLog(
        'campaign_deleted',
        `Deleted campaign ${campaign.name}.`,
        { campaignId },
        null
      );
    }

    return true;
  }

  async leaveCampaign(campaignId = this.activeCampaignId) {
    if (!campaignId || !this.activeUserProfile) return false;
    const wasActiveCampaign = campaignId === this.activeCampaignId;

    const membership = this.memberships.find(entry =>
      entry.campaign_id === campaignId &&
      entry.user_id === this.activeUserProfile?.id
    );
    if (!membership) return false;

    const campaignMemberships = this.memberships.filter(entry => entry.campaign_id === campaignId);
    const gmCount = campaignMemberships.filter(entry => entry.role === 'GM').length;
    if (membership.role === 'GM' && gmCount <= 1) return false;

    if (wasActiveCampaign) this.stopCampaignRealtime();

    const { data: deletedMemberships, error } = await supabase
      .from('campaign_members')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('user_id', this.activeUserProfile.id)
      .select('campaign_id,user_id');

    if (!error && (deletedMemberships ?? []).length === 0) {
      await this.loadData();
      const stillMember = this.memberships.some(entry =>
        entry.campaign_id === campaignId &&
        entry.user_id === this.activeUserProfile?.id
      );
      if (!stillMember) {
        if (this.activeCampaignId) this.subscribeToChanges();
        else this.stopCampaignRealtime();
        return true;
      }
    }

    if (error || (deletedMemberships ?? []).length === 0) {
      const { error: rpcError } = await supabase.rpc('leave_home_campaign', {
        target_campaign: campaignId
      });

      if (rpcError) {
        if (wasActiveCampaign) this.subscribeToChanges();
        console.error('Failed to leave campaign:', error, rpcError);
        return false;
      }
    }

    await this.loadData();
    if (this.activeCampaignId) this.subscribeToChanges();
    else this.stopCampaignRealtime();
    return true;
  }

  async removeCampaignMember(userId: string, campaignId = this.activeCampaignId) {
    if (!campaignId || !this.isGM || userId === this.activeUserProfile?.id) return false;

    const membership = this.memberships.find(entry =>
      entry.campaign_id === campaignId &&
      entry.user_id === userId
    );
    if (!membership) return false;

    const { error } = await supabase
      .from('campaign_members')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('user_id', userId);

    if (error) {
      const { error: rpcError } = await supabase.rpc('remove_home_campaign_member', {
        target_campaign: campaignId,
        target_user: userId
      });

      if (rpcError) {
        console.error('Failed to remove campaign member:', error, rpcError);
        return false;
      }
    }

    this.memberships = this.memberships.filter(entry =>
      entry.campaign_id !== campaignId ||
      entry.user_id !== userId
    );
    await this.createCampaignLog(
      'member_removed',
      `Removed ${this.formatCampaignMemberName(membership)} from the campaign.`,
      { userId, role: membership.role },
      null
    );

    return true;
  }

  async addCharacterToCampaign(characterId: string, campaignId = this.activeCampaignId) {
    if (!campaignId || !this.activeUserProfile) return false;

    const character = this.getCharacterById(characterId);
    if (!character || !this.isCharacterOwnedByActiveUser(character)) return false;

    const existing = this.campaignCharacters.find(entry =>
      entry.campaign_id === campaignId &&
      entry.character_id === characterId
    );
    if (existing) return true;

    const rosterDraft: CampaignCharacter = {
      campaign_id: campaignId,
      character_id: characterId,
      user_id: this.activeUserProfile.id
    };

    const { data, error } = await supabase
      .from('campaign_characters')
      .insert(rosterDraft)
      .select('campaign_id,character_id,user_id,created_at')
      .single();

    if (error) {
      if (isMissingCampaignRosterTable(error)) {
        this.campaignRosterSchemaMissing = true;
        console.error(
          'Campaign roster schema missing. Apply db/repairs/20260612030000_campaign_character_roster.sql:',
          error
        );
      } else {
        console.error('Failed to add character to campaign:', error);
      }
      return false;
    }

    this.campaignRosterSchemaMissing = false;
    this.campaignCharacters = [
      ...this.campaignCharacters,
      (data ?? rosterDraft) as CampaignCharacter
    ];

    if (campaignId === this.activeCampaignId) await this.setActiveCharacter(characterId);
    await this.createCampaignLog(
      'campaign_character_add',
      `Added ${character.name} to the campaign roster.`,
      { characterId },
      null
    );

    return true;
  }

  async removeCharacterFromCampaign(characterId: string, campaignId = this.activeCampaignId) {
    if (!campaignId || !this.activeUserProfile) return false;

    const character = this.getCharacterById(characterId);
    const rosterEntry = this.campaignCharacters.find(entry =>
      entry.campaign_id === campaignId &&
      entry.character_id === characterId
    );
    if (!rosterEntry) return false;

    const canRemove = this.isGM || rosterEntry.user_id === this.activeUserProfile.id;
    if (!canRemove) return false;

    const { error } = await supabase
      .from('campaign_characters')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('character_id', characterId);

    if (error) {
      if (isMissingCampaignRosterTable(error)) {
        this.campaignRosterSchemaMissing = true;
        console.error(
          'Campaign roster schema missing. Apply db/repairs/20260612030000_campaign_character_roster.sql:',
          error
        );
      } else {
        console.error('Failed to remove character from campaign:', error);
      }
      return false;
    }

    this.campaignRosterSchemaMissing = false;
    this.campaignCharacters = this.campaignCharacters.filter(entry =>
      entry.campaign_id !== campaignId ||
      entry.character_id !== characterId
    );

    if (this.activeUserId === characterId && campaignId === this.activeCampaignId) {
      this.activeUserId = this.activeCampaignRosterCharacters[0]?.id ?? this.ownedPlayerCharacters[0]?.id ?? null;
    }

    await supabase
      .from('campaign_members')
      .update({ active_character_id: null })
      .eq('campaign_id', campaignId)
      .eq('active_character_id', characterId);

    if (character) {
      await this.createCampaignLog(
        'campaign_character_remove',
        `Removed ${character.name} from the campaign roster.`,
        { characterId },
        null
      );
    }

    return true;
  }

  async redeemCampaignInviteFromHome(code: string) {
    return await this.redeemCampaignInvite(code);
  }

  formatCampaignMemberName(membership: CampaignMembership | CampaignMemberView) {
    const profile = this.campaignMemberProfiles[membership.user_id];
    return profile?.display_name || profile?.email || membership.user_id.slice(0, 8);
  }

  async createCampaignInvite(
    role: CampaignInvite['role'] = 'PLAYER',
    options: { expiresAt?: string | null; maxUses?: number | null } = {}
  ) {
    if (!this.activeCampaignId || !this.isGM) return null;

    const { data, error } = await supabase.rpc('create_campaign_invite', {
      target_campaign: this.activeCampaignId,
      invite_role: role,
      invite_expires_at: options.expiresAt ?? null,
      invite_max_uses: options.maxUses ?? null
    });

    if (error) {
      console.error('Failed to create campaign invite:', error);
      return null;
    }

    const invite = data as CampaignInvite;
    this.campaignInvites = [invite, ...this.campaignInvites];
    await this.createCampaignLog(
      'invite_created',
      `Created ${role} invite ${invite.code}.`,
      { inviteId: invite.id, code: invite.code, role },
      null
    );

    return invite;
  }

  async revokeCampaignInvite(inviteId: string) {
    if (!this.isGM) return false;
    const invite = this.campaignInvites.find(entry => entry.id === inviteId);

    const revokedAt = new Date().toISOString();
    const { error } = await supabase
      .from('campaign_invites')
      .update({ revoked_at: revokedAt })
      .eq('id', inviteId);

    if (error) {
      console.error('Failed to revoke campaign invite:', error);
      return false;
    }

    this.campaignInvites = this.campaignInvites.filter(entry => entry.id !== inviteId);
    await this.createCampaignLog(
      'invite_revoked',
      `Revoked invite ${invite?.code ?? inviteId}.`,
      { inviteId, code: invite?.code },
      null
    );

    return true;
  }

  async redeemCampaignInvite(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return null;

    const { data, error } = await supabase.rpc('redeem_campaign_invite', {
      invite_code: normalizedCode
    });

    if (error) {
      console.error('Failed to redeem campaign invite:', error);
      throw new Error(error.message);
    }

    const result = Array.isArray(data)
      ? data[0] as InviteRedemptionResult | undefined
      : data as InviteRedemptionResult | undefined;

    if (!result) throw new Error('Invite redemption returned no campaign.');

    await this.loadData();
    await this.setActiveCampaign(result.campaign_id);
    await this.createCampaignLog(
      'invite_redeemed',
      `${this.activeUserProfile?.email ?? 'User'} redeemed an invite.`,
      { code: normalizedCode, role: result.role, alreadyMember: result.already_member },
      null
    );

    return result;
  }

  async syncShipStateToCloud() {
    if (!this.activeCampaignId) return;
    const previousSnapshot = this.#lastLedgerSnapshot ?? this.createLedgerSnapshot();
    const payload = {
      ship_name: shipState.blueprint.name,
      hull: shipState.blueprint.hull,
      reactor: shipState.blueprint.reactor,
      engine: shipState.blueprint.engine,
      hp: shipState.vitals.currentHealth,
      ri: shipState.vitals.currentRI,
      active_fuel: shipState.propulsion.activeFuel,
      active_mode: shipState.propulsion.activeMode,
      fuel_levels: { ...shipState.propulsion.currentFuel },
      active_conditions: shipState.vitals.activeConditions.map(condition => ({ ...condition })),
      components: shipState.blueprint.components.map(component => ({ ...component }))
    };

    const { error } = await this.upsertShipLedger(payload, "GM Error - Failed to sync ship state:");
    if (!error) {
      this.#lastLedgerSnapshot = this.createLedgerSnapshot({ ...previousSnapshot, ...payload });
      await this.createCampaignLog(
        'ship_state_sync',
        'Ship state synchronized.',
        payload,
        { table: 'ship_ledger', recordId: String(previousSnapshot.id ?? 'TT-9'), before: previousSnapshot }
      );
    }
  }

  async syncTimelineToCloud() {
    if (!this.activeCampaignId) return;
    const previousSnapshot = this.#lastLedgerSnapshot ?? this.createLedgerSnapshot();
    const payload = {
      current_day: campaignState.currentDay,
      current_location: campaignState.shipLocation,
      active_flight: campaignState.activeMission
    };

    const { error } = await this.upsertShipLedger(payload, "GM Error - Failed to sync timeline:");
    if (!error) {
      this.#lastLedgerSnapshot = this.createLedgerSnapshot({ ...previousSnapshot, ...payload });
      await this.createCampaignLog(
        'timeline_sync',
        'Campaign timeline synchronized.',
        payload,
        { table: 'ship_ledger', recordId: String(previousSnapshot.id ?? 'TT-9'), before: previousSnapshot }
      );
    }
  }

  subscribeToChanges() {
    if (!this.activeCampaignId) return;
    this.stopCampaignRealtime();

    const campaignFilter = `campaign_id=eq.${this.activeCampaignId}`;
    this.#subscription = supabase
      .channel(`campaign-db-changes-${this.activeCampaignId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: campaignFilter },
        (payload) => {
          console.log('Real-time Item Change:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const index = this.items.findIndex(i => i.id === payload.new.id);
            if (index !== -1) this.items[index] = this.normalizeItemRecord(payload.new as ItemRecord);
          } 
          else if (payload.eventType === 'INSERT') {
            this.items.push(this.normalizeItemRecord(payload.new as ItemRecord));
          } 
          else if (payload.eventType === 'DELETE') {
            this.items = this.items.filter(i => i.id !== payload.old.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: campaignFilter },
        (payload) => {
          console.log('Real-time Character Change:', payload);
          if (payload.eventType === 'UPDATE') {
            const index = this.characters.findIndex(c => c.id === payload.new.id);
            if (index !== -1) this.characters[index] = this.normalizeCharacterRecord(payload.new as CharacterRecord);
          } else if (payload.eventType === 'INSERT') {
            this.characters.push(this.normalizeCharacterRecord(payload.new as CharacterRecord));
          } else if (payload.eventType === 'DELETE') {
            this.characters = this.characters.filter(c => c.id !== payload.old.id);
            const characterId = String(payload.old.id ?? '');
            const { [characterId]: _removed, ...remaining } = this.npcProfiles;
            this.npcProfiles = remaining;
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'npc_profiles', filter: campaignFilter },
        (payload) => {
          if (!this.isGM) return;

          if (payload.eventType === 'DELETE') {
            const characterId = String(payload.old.character_id ?? '');
            const { [characterId]: _removed, ...remaining } = this.npcProfiles;
            this.npcProfiles = remaining;
            return;
          }

          const incoming = this.normalizeNpcProfileRecord(payload.new as NpcProfileRecord);
          this.npcProfiles = {
            ...this.npcProfiles,
            [incoming.character_id]: incoming
          };
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ship_ledger', filter: campaignFilter },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log('Real-time Ship Ledger Change:', payload);
            this.applyLedgerState(payload.new as Record<string, any>);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_log_events', filter: campaignFilter },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as CampaignLogEvent;
            if (!this.campaignLogEvents.some(event => event.id === incoming.id)) {
              this.campaignLogEvents = [incoming, ...this.campaignLogEvents].slice(0, 100);
            }
          } else if (payload.eventType === 'UPDATE') {
            const index = this.campaignLogEvents.findIndex(event => event.id === payload.new.id);
            if (index !== -1) this.campaignLogEvents[index] = payload.new as CampaignLogEvent;
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_members', filter: campaignFilter },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            this.memberships = this.memberships.filter(membership =>
              membership.campaign_id !== payload.old.campaign_id ||
              membership.user_id !== payload.old.user_id
            );
            return;
          }

          const incoming = payload.new as CampaignMembership;
          const index = this.memberships.findIndex(membership =>
            membership.campaign_id === incoming.campaign_id &&
            membership.user_id === incoming.user_id
          );

          if (index !== -1) {
            this.memberships[index] = incoming;
          } else {
            this.memberships.push(incoming);
          }
          if (!this.campaignMemberProfiles[incoming.user_id]) {
            void this.loadProfilesForMemberships(this.memberships);
          }

          if (
            incoming.campaign_id === this.activeCampaignId &&
            incoming.user_id === this.activeUserProfile?.id
          ) {
            this.activeUserId = incoming.active_character_id && this.characters.some(character => character.id === incoming.active_character_id)
              ? incoming.active_character_id
              : this.activeUserId;
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_characters', filter: campaignFilter },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            this.campaignCharacters = this.campaignCharacters.filter(entry =>
              entry.campaign_id !== payload.old.campaign_id ||
              entry.character_id !== payload.old.character_id
            );
            return;
          }

          const incoming = payload.new as CampaignCharacter;
          const index = this.campaignCharacters.findIndex(entry =>
            entry.campaign_id === incoming.campaign_id &&
            entry.character_id === incoming.character_id
          );
          if (index !== -1) this.campaignCharacters[index] = incoming;
          else this.campaignCharacters.push(incoming);

          if (incoming.campaign_id === this.activeCampaignId) {
            void this.loadCampaignData(incoming.campaign_id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_invites', filter: campaignFilter },
        (payload) => {
          if (!this.isGM) return;

          if (payload.eventType === 'DELETE') {
            this.campaignInvites = this.campaignInvites.filter(invite => invite.id !== payload.old.id);
            return;
          }

          const incoming = payload.new as CampaignInvite;
          if (incoming.revoked_at) {
            this.campaignInvites = this.campaignInvites.filter(invite => invite.id !== incoming.id);
            return;
          }

          const index = this.campaignInvites.findIndex(invite => invite.id === incoming.id);
          if (index !== -1) {
            this.campaignInvites[index] = incoming;
          } else {
            this.campaignInvites = [incoming, ...this.campaignInvites];
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${this.activeCampaignId}` },
        (payload) => {
          const incoming = payload.new as CampaignRecord;
          const index = this.campaigns.findIndex(campaign => campaign.id === incoming.id);
          if (index !== -1) this.campaigns[index] = incoming;
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          void this.refreshShipLedgerFromCloud();
        }

        if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') &&
          Date.now() > this.#suppressRealtimeWarningsUntil
        ) {
          console.warn('Campaign realtime subscription status:', status, error);
        }
      });

    this.startLedgerRefresh();
  }

  async transferItem(itemId: string, newOwnerId: string) {
    if (newOwnerId === SHIP_INVENTORY_OWNER_ID && !this.activeCampaignId) return;

    const localItem = this.items.find(i => i.id === itemId);
    if (!localItem) return;
    const snapshotItems = [localItem].map(item => ({ ...item }));

    const nextItemState: ItemState = newOwnerId === SHIP_INVENTORY_OWNER_ID ? 'stored' : 'stowed';
    const transferCandidate = {
      ...localItem,
      owner_id: newOwnerId,
      item_state: nextItemState
    };

    // 1. Check if the destination owner already has this exact item
    const existingStack = this.items.find(i => 
      i.id !== itemId && // Don't match against itself
      i.owner_id === newOwnerId &&
      this.itemsCanStack(i, transferCandidate)
    );

    if (existingStack) {
      snapshotItems.push({ ...existingStack });
      // 2a. MERGE STACKS
      const combinedQty = existingStack.quantity + localItem.quantity;
      
      // Optimistic local update
      existingStack.quantity = combinedQty;
      this.items = this.items.filter(i => i.id !== itemId);

      // Tell Supabase to update the existing stack AND delete the old transferred row
      await supabase.from('items').update({ quantity: combinedQty }).eq('id', existingStack.id);
      await supabase.from('items').delete().eq('id', itemId);
      await this.createCampaignLog(
        'inventory_transfer',
        `Transferred ${localItem.name} and merged stack.`,
        { itemId, newOwnerId, mergedInto: existingStack.id },
        { table: 'items', before: snapshotItems }
      );
      
    } else {
      // 2b. NO STACK EXISTS: Just move the item
      localItem.owner_id = newOwnerId; // Optimistic local update
      localItem.item_state = nextItemState;
      const { error } = await supabase
        .from('items')
        .update({ owner_id: newOwnerId, item_state: nextItemState })
        .eq('id', itemId);

      if (error) console.error("Failed to transfer item:", error);
      if (!error) {
        await this.createCampaignLog(
          'inventory_transfer',
          `Transferred ${localItem.name}.`,
          { itemId, newOwnerId },
          { table: 'items', recordId: itemId, before: snapshotItems }
        );
      }
    }
  }

  async updateItemState(itemId: string, itemState: ItemState) {
    const localItem = this.items.find(i => i.id === itemId);
    if (!localItem || itemState === 'stored') return;

    const stateCandidate = {
      ...localItem,
      item_state: itemState
    };

    const existingStack = this.items.find(i =>
      i.id !== itemId &&
      i.owner_id === localItem.owner_id &&
      this.itemsCanStack(i, stateCandidate)
    );

    if (existingStack) {
      const snapshotItems = [{ ...localItem }, { ...existingStack }];
      const combinedQty = existingStack.quantity + localItem.quantity;
      existingStack.quantity = combinedQty;
      this.items = this.items.filter(i => i.id !== itemId);

      await supabase.from('items').update({ quantity: combinedQty }).eq('id', existingStack.id);
      await supabase.from('items').delete().eq('id', itemId);
      await this.createCampaignLog(
        'inventory_state',
        `Changed ${localItem.name} carry state and merged stack.`,
        { itemId, itemState, mergedInto: existingStack.id },
        { table: 'items', before: snapshotItems }
      );
      return;
    }

    const previousItem = { ...localItem };
    localItem.item_state = itemState;

    const { error } = await supabase
      .from('items')
      .update({ item_state: itemState })
      .eq('id', itemId);

    if (error) console.error("Failed to update item state:", error);
    if (!error) {
      await this.createCampaignLog(
        'inventory_state',
        `Changed ${localItem.name} carry state to ${itemState}.`,
        { itemId, itemState },
        { table: 'items', recordId: itemId, before: previousItem }
      );
    }
  }

  async updatePersonalCredits(characterId: string, amountToAdd: number) {
    const char = this.getCharacterById(characterId);
    if (!char) return;
    if (this.localCharacterArchive?.core.id !== characterId && !this.canManageCharacter(char)) return;

    const previousChar = { ...char };
    const newTotal = char.personal_credits + amountToAdd;
    char.personal_credits = newTotal; // Optimistic local update

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ personal_credits: newTotal })
      .eq('id', characterId);

    if (error) console.error("Failed to update credits:", error);
    if (!error) {
      await this.createCampaignLog(
        'character_credits',
        `Updated ${char.name} personal credits by ${amountToAdd}.`,
        { characterId, amountToAdd, personal_credits: newTotal },
        { table: 'characters', recordId: characterId, before: previousChar }
      );
    }
  }

  async spawnItem(name: string, category: string, rarity: string, mass: number, quantity: number = 1) {
    if (!this.activeCampaignId) return;
    const normalizedQuantity = this.normalizeSpawnQuantity(quantity);

    // 1. Look for an exact match already in the ship's cargo
    const existingItem = this.items.find(i => 
      i.owner_id === SHIP_INVENTORY_OWNER_ID &&
      i.item_state === 'stored' &&
      !i.equipment_id &&
      i.name.toLowerCase() === name.toLowerCase() &&
      i.category === category &&
      i.rarity === rarity
    );

    if (existingItem) {
      const previousItem = { ...existingItem };
      // 2a. STACK IT: Update the quantity of the existing row
      const newQty = existingItem.quantity + normalizedQuantity;
      
      // We must AWAIT the network call to finish updating the cloud
      const { error } = await supabase
        .from('items')
        .update({ quantity: newQty })
        .eq('id', existingItem.id);
      
      if (error) console.error("GM Error - Failed to stack loot:", error);
      if (!error) {
        existingItem.quantity = newQty;
        await this.createCampaignLog(
          'inventory_spawn',
          `Added ${normalizedQuantity} ${name} to ship inventory.`,
          { itemId: existingItem.id, quantity: normalizedQuantity },
          { table: 'items', recordId: existingItem.id, before: previousItem }
        );
      }
      
    } else {
      // 2b. NEW ITEM: Insert a brand new row
      // We must AWAIT the network call to finish inserting into the cloud
      const { data, error } = await supabase
        .from('items')
        .insert({
          campaign_id: this.activeCampaignId,
          owner_id: SHIP_INVENTORY_OWNER_ID,
          item_state: 'stored',
          name,
          category,
          rarity,
          quantity: normalizedQuantity,
          mass
        })
        .select()
        .single();
        
      if (error) console.error("GM Error - Failed to spawn item:", error);
      if (data) {
        this.items.push(this.normalizeItemRecord(data as ItemRecord));
        await this.createCampaignLog(
          'inventory_spawn',
          `Spawned ${normalizedQuantity} ${name} into ship inventory.`,
          { itemId: (data as ItemRecord).id, quantity: normalizedQuantity },
          { table: 'items', recordId: (data as ItemRecord).id, before: null }
        );
      }
    }
  }

  async spawnCatalogItem(equipmentId: string, quantity: number = 1) {
    if (!this.activeCampaignId) return;
    const catalogItem = getEquipmentById(equipmentId);
    if (!catalogItem || !catalogItem.app.spawnable) return;

    const normalizedQuantity = this.normalizeSpawnQuantity(quantity);
    const existingItem = this.items.find(i =>
      i.owner_id === SHIP_INVENTORY_OWNER_ID &&
      i.item_state === 'stored' &&
      i.equipment_id === equipmentId
    );

    if (existingItem) {
      const previousItem = { ...existingItem };
      const newQty = existingItem.quantity + normalizedQuantity;
      const { error } = await supabase
        .from('items')
        .update({ quantity: newQty })
        .eq('id', existingItem.id);

      if (error) console.error("GM Error - Failed to stack catalog item:", error);
      if (!error) {
        existingItem.quantity = newQty;
        await this.createCampaignLog(
          'inventory_spawn',
          `Added ${normalizedQuantity} ${catalogItem.name} to ship inventory.`,
          { itemId: existingItem.id, equipmentId, quantity: normalizedQuantity },
          { table: 'items', recordId: existingItem.id, before: previousItem }
        );
      }
      return;
    }

    const { data, error } = await supabase
      .from('items')
      .insert({
        campaign_id: this.activeCampaignId,
        equipment_id: equipmentId,
        owner_id: SHIP_INVENTORY_OWNER_ID,
        item_state: 'stored',
        name: catalogItem.name,
        category: getEquipmentInventoryCategory(catalogItem),
        rarity: getEquipmentInventoryRarity(catalogItem),
        quantity: normalizedQuantity,
        mass: getEquipmentInventoryMass(catalogItem)
      })
      .select()
      .single();

    if (error) console.error("GM Error - Failed to spawn catalog item:", error);
    if (data) {
      this.items.push(this.normalizeItemRecord(data as ItemRecord));
      await this.createCampaignLog(
        'inventory_spawn',
        `Spawned ${normalizedQuantity} ${catalogItem.name} into ship inventory.`,
        { itemId: (data as ItemRecord).id, equipmentId, quantity: normalizedQuantity },
        { table: 'items', recordId: (data as ItemRecord).id, before: null }
      );
    }
  }

  getArchivePurchasedSpent(archive: CharacterCreationArchive) {
    return archive.creation.equipment.purchasedItems.reduce((total, entry) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      return total + (catalogItem?.cost ?? 0) * this.normalizeSpawnQuantity(entry.quantity);
    }, 0);
  }

  validateArchivePurchasedItems(archive: CharacterCreationArchive) {
    const failures: FinalizeInventoryItemFailure[] = [];

    archive.creation.equipment.purchasedItems.forEach((entry) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      const quantity = Number(entry.quantity);

      if (!catalogItem) {
        failures.push({
          equipmentId: entry.equipmentId,
          name: entry.equipmentId,
          quantity: this.normalizeSpawnQuantity(quantity),
          reason: 'Missing catalog item.'
        });
        return;
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        failures.push({
          equipmentId: entry.equipmentId,
          name: catalogItem.name,
          quantity,
          reason: 'Invalid quantity.'
        });
      }

      if (!isBuyableCatalogItem(catalogItem)) {
        failures.push({
          equipmentId: entry.equipmentId,
          name: catalogItem.name,
          quantity: this.normalizeSpawnQuantity(quantity),
          reason: 'Catalog item is not available for player purchase.'
        });
      }
    });

    const remainingCredits = archive.creation.equipment.startingCredits - this.getArchivePurchasedSpent(archive);
    if (remainingCredits < 0) {
      failures.push({
        equipmentId: 'credits',
        name: 'Starting credits',
        quantity: 1,
        reason: 'Purchased cart exceeds starting credits.'
      });
    }

    return {
      valid: failures.length === 0,
      remainingCredits,
      failures
    };
  }

  buildFinalizeInventoryDrafts(archive: CharacterCreationArchive): FinalizeInventoryDraft[] {
    const drafts: FinalizeInventoryDraft[] = [];

    archive.creation.equipment.items.forEach((entry) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      if (!catalogItem) return;

      drafts.push({
        equipmentId: entry.equipmentId,
        equipment_id: entry.equipmentId,
        name: getEquipmentDisplayName(catalogItem, entry.equipmentId),
        item_state: 'stowed',
        category: getEquipmentInventoryCategory(catalogItem),
        rarity: getEquipmentInventoryRarity(catalogItem),
        quantity: this.normalizeSpawnQuantity(entry.quantity),
        mass: getEquipmentInventoryMass(catalogItem)
      });
    });

    archive.creation.equipment.purchasedItems.forEach((entry: PurchasedEquipmentItem) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      if (!catalogItem) return;

      drafts.push({
        equipmentId: entry.equipmentId,
        equipment_id: entry.equipmentId,
        name: catalogItem.name,
        item_state: 'stowed',
        category: getEquipmentInventoryCategory(catalogItem),
        rarity: getEquipmentInventoryRarity(catalogItem),
        quantity: this.normalizeSpawnQuantity(entry.quantity),
        mass: getEquipmentInventoryMass(catalogItem)
      });
    });

    return drafts;
  }

  async finalizeInventoryForCharacter(characterId: string, drafts: FinalizeInventoryDraft[]) {
    const result = {
      attempted: drafts.length,
      inserted: 0,
      merged: 0,
      skipped: 0,
      failures: [] as FinalizeInventoryItemFailure[]
    };

    for (const draft of drafts) {
      if (draft.quantity < 1) {
        result.skipped += 1;
        result.failures.push({
          equipmentId: draft.equipmentId,
          name: draft.name,
          quantity: draft.quantity,
          reason: 'Invalid quantity.'
        });
        continue;
      }

      const existingItem = this.items.find((item) => {
        if (item.owner_id !== characterId) return false;
        return this.itemsCanStack(item, {
          id: 'finalize-candidate',
          owner_id: characterId,
          equipment_id: draft.equipment_id,
          item_state: draft.item_state,
          name: draft.name,
          category: draft.category,
          rarity: draft.rarity,
          quantity: draft.quantity,
          mass: draft.mass
        });
      });

      if (existingItem) {
        const nextQuantity = existingItem.quantity + draft.quantity;
        const { error } = await supabase
          .from('items')
          .update({ quantity: nextQuantity })
          .eq('id', existingItem.id);

        if (error) {
          result.failures.push({
            equipmentId: draft.equipmentId,
            name: draft.name,
            quantity: draft.quantity,
            reason: error.message
          });
          continue;
        }

        existingItem.quantity = nextQuantity;
        result.merged += 1;
        continue;
      }

      const { data, error } = await supabase
          .from('items')
          .insert({
          campaign_id: this.activeCampaignId ?? null,
          equipment_id: draft.equipment_id,
          owner_id: characterId,
          item_state: draft.item_state,
          name: draft.name,
          category: draft.category,
          rarity: draft.rarity,
          quantity: draft.quantity,
          mass: draft.mass
        })
        .select()
        .single();

      if (error) {
        result.failures.push({
          equipmentId: draft.equipmentId,
          name: draft.name,
          quantity: draft.quantity,
          reason: error.message
        });
        continue;
      }

      if (data) this.items.push(data as ItemRecord);
      result.inserted += 1;
    }

    return result;
  }

  async finalizeCharacterArchive(archive: CharacterCreationArchive): Promise<FinalizeCharacterArchiveResult> {
    const characterId = archive.core.id;
    const validation = this.validateArchivePurchasedItems(archive);

    if (!validation.valid || validation.remainingCredits < 0) {
      return {
        ...emptyFinalizeResult('invalid_cart', 'Purchased cart validation failed.'),
        characterId,
        inventory: {
          attempted: archive.creation.equipment.purchasedItems.length,
          inserted: 0,
          merged: 0,
          skipped: 0,
          failures: validation.failures
        }
      };
    }

    const { data: existingCharacters, error: existingError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', characterId)
      .limit(1);

    if (existingError) {
      return {
        ...emptyFinalizeResult('character_insert_failed', `Failed to check existing character id: ${existingError.message}`),
        characterId
      };
    }

    if ((existingCharacters ?? []).length > 0) {
      return {
        ...emptyFinalizeResult('duplicate_character', `Character id already exists: ${characterId}.`),
        characterId
      };
    }

    const core: CharacterRecord = {
      ...archive.core,
      campaign_id: this.activeCampaignId ?? null,
      owner_user_id: this.activeUserProfile?.id ?? null,
      character_kind: archive.core.role === 'GM' ? 'GM' : 'PLAYER',
      personal_credits: validation.remainingCredits,
      character_notes: {
        homeworld: archive.creation.homeworld,
        employerAffiliation: archive.creation.employerAffiliation,
        goal: archive.creation.goal,
        notes: archive.creation.notes
      }
    };

    const { data: insertedCharacter, error: insertError } = await supabase
      .from('characters')
      .insert(core)
      .select()
      .single();

    if (insertError) {
      return {
        ...emptyFinalizeResult(
          'character_insert_failed',
          isCampaignIdNotNullError(insertError)
            ? 'Database migration required: characters.campaign_id is still NOT NULL. Apply db/repairs/20260612020000_personal_character_ownership.sql.'
            : insertError.message
        ),
        characterId
      };
    }

    if (insertedCharacter) {
      this.characters.push(this.normalizeCharacterRecord(insertedCharacter as CharacterRecord));
      this.activeUserId = characterId;
    }

    const inventory = await this.finalizeInventoryForCharacter(characterId, this.buildFinalizeInventoryDrafts(archive));
    const complete = inventory.failures.length === 0;

    if (this.activeCampaignId) {
      await this.createCampaignLog(
        'character_finalize',
        `Finalized character archive for ${core.name}.`,
        { characterId, inventory },
        { table: 'characters', recordId: characterId, before: null }
      );
    }

    return {
      success: complete,
      status: complete ? 'complete' : 'inventory_partial_failure',
      message: complete
        ? 'Character archive finalized.'
        : 'Character inserted, but one or more inventory rows failed.',
      characterId,
      characterInserted: true,
      inventory
    };
  }

  async finalizeLocalCharacterArchive(): Promise<FinalizeCharacterArchiveResult> {
    if (!this.localCharacterArchive) {
      return emptyFinalizeResult('no_archive', 'No local character archive loaded.');
    }

    return await this.finalizeCharacterArchive(this.localCharacterArchive);
  }

  async saveGeneratedNpc(draft: GeneratedNpcDraft) {
    if (!this.activeCampaignId || !this.isGM) return false;

    const profile: NpcProfile = {
      ...draft.profile,
      kind: draft.profile.kind ?? 'human',
      characterId: draft.characterId,
      identity: { ...draft.profile.identity },
      personality: { ...draft.profile.personality },
      morphology: draft.profile.morphology ? { ...draft.profile.morphology } : undefined,
      behavior: draft.profile.behavior ? { ...draft.profile.behavior } : undefined,
      hazards: draft.profile.hazards ? { ...draft.profile.hazards } : undefined,
      combat: {
        ...draft.profile.combat,
        hpRolls: [...draft.profile.combat.hpRolls]
      },
      rolls: draft.profile.rolls.map((roll) => ({ ...roll })),
      gmNotes: draft.profile.gmNotes.trim()
    };
    const isBeast = profile.kind === 'beast';

    const core: CharacterRecord = {
      id: draft.characterId,
      name: profile.identity.name.trim() || 'Unnamed NPC',
      role: 'GM',
      campaign_id: this.activeCampaignId,
      owner_user_id: this.activeUserProfile?.id ?? null,
      character_kind: 'NPC',
      personal_credits: 0,
      character_notes: isBeast
        ? {
            homeworld: profile.morphology?.basicAnimalFeatures ?? profile.identity.background,
            employerAffiliation: `${profile.behavior?.ecologicalRole ?? profile.identity.role}${profile.behavior?.swarm ? ' swarm' : ''}`,
            goal: profile.behavior?.trait ?? '',
            notes: [
              profile.morphology ? `${profile.morphology.size}; ${profile.morphology.bodyPlan}; ${profile.morphology.mainWeapon}` : '',
              profile.hazards ? `${profile.hazards.harmfulDischarge}; poison ${profile.hazards.poisonEffect} (${profile.hazards.poisonOnset}, ${profile.hazards.poisonDuration})` : ''
            ].filter(Boolean).join(' | ')
          }
        : {
            homeworld: profile.identity.background,
            employerAffiliation: profile.identity.role,
            goal: profile.personality.greatestDesire,
            notes: profile.personality.hook
          },
      attributes: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10
      },
      heritage: 'earthling',
      background: 'Worker',
      skills: {},
      background_progress: {},
      advancement_progress: {
        generalSkillPoints: 0,
        nonCombatSkillPoints: 0,
        skillInvestments: {},
        attributeBoostCount: 0
      },
      character_class: isBeast ? 'warrior' : 'expert',
      foci: [],
      level: Math.max(1, Math.floor(profile.combat.hd)),
      xp: 0,
      hp: profile.combat.hp,
      max_hp: profile.combat.hp,
      system_strain: 0,
      max_system_strain: 10,
      rads: 0,
      max_rads: 10,
      base_ac: profile.combat.ac,
      active_conditions: []
    };

    const { data: insertedCharacter, error: characterError } = await supabase
      .from('characters')
      .insert(core)
      .select()
      .single();

    if (characterError) {
      console.error('Failed to save generated NPC character:', characterError);
      return false;
    }

    const profileDraft: NpcProfileRecord = {
      character_id: draft.characterId,
      campaign_id: this.activeCampaignId,
      profile,
      gm_notes: profile.gmNotes,
      created_by: this.activeUserProfile?.id ?? null
    };

    const { data: insertedProfile, error: profileError } = await supabase
      .from('npc_profiles')
      .insert(profileDraft)
      .select()
      .single();

    if (profileError) {
      await supabase
        .from('characters')
        .delete()
        .eq('id', draft.characterId);
      console.error('Failed to save generated NPC profile:', profileError);
      return false;
    }

    if (insertedCharacter) {
      this.characters = uniqueById([
        ...this.characters,
        this.normalizeCharacterRecord(insertedCharacter as CharacterRecord)
      ]);
    }

    if (insertedProfile) {
      const normalizedProfile = this.normalizeNpcProfileRecord(insertedProfile as NpcProfileRecord);
      this.npcProfiles = {
        ...this.npcProfiles,
        [normalizedProfile.character_id]: normalizedProfile
      };
    }

    await this.createCampaignLog(
      'npc_create',
      `Generated NPC ${core.name}.`,
      {
        characterId: draft.characterId,
        role: profile.identity.role,
        kind: profile.kind,
        combatPreset: profile.combat.label
      },
      { table: 'characters', recordId: draft.characterId, before: null }
    );

    return true;
  }

  async deleteCharacter(characterId: string) {
    const previousCharacter = this.characters.find(character =>
      character.id === characterId
    );
    if (!previousCharacter) return false;
    if (!this.canDeleteCharacter(previousCharacter)) return false;

    const previousItems = this.items.filter(item =>
      item.owner_id === characterId
    );
    const previousNpcProfile = this.npcProfiles[characterId] ?? null;
    const previousActiveUserId = this.activeUserId;
    const previousMemberships = this.memberships.map(membership => ({ ...membership }));

    const nextActiveCharacter = this.visiblePlayerCharacters.find(character =>
      character.id !== characterId &&
      (character.character_kind ?? character.role) === 'PLAYER'
    );

    this.characters = this.characters.filter(character => character.id !== characterId);
    this.items = this.items.filter(item => item.owner_id !== characterId);
    if (previousNpcProfile) {
      const { [characterId]: _removed, ...remainingNpcProfiles } = this.npcProfiles;
      this.npcProfiles = remainingNpcProfiles;
    }
    if (this.activeUserId === characterId) this.activeUserId = nextActiveCharacter?.id ?? null;
    this.memberships = this.memberships.map(membership =>
      membership.active_character_id === characterId
        ? { ...membership, active_character_id: null }
        : membership
    );

    const membershipQuery = supabase
      .from('campaign_members')
      .update({ active_character_id: null })
      .eq('active_character_id', characterId);

    if (this.activeCampaignId) membershipQuery.eq('campaign_id', this.activeCampaignId);

    const { error: membershipError } = await membershipQuery;

    if (membershipError) {
      this.characters = [...this.characters, previousCharacter];
      this.items = [...this.items, ...previousItems];
      if (previousNpcProfile) this.npcProfiles = { ...this.npcProfiles, [characterId]: previousNpcProfile };
      this.activeUserId = previousActiveUserId;
      this.memberships = previousMemberships;
      console.error('Failed to clear deleted character selections:', membershipError);
      return false;
    }

    const { error: itemsError } = await supabase
      .from('items')
      .delete()
      .eq('owner_id', characterId);

    if (itemsError) {
      this.characters = [...this.characters, previousCharacter];
      this.items = [...this.items, ...previousItems];
      if (previousNpcProfile) this.npcProfiles = { ...this.npcProfiles, [characterId]: previousNpcProfile };
      this.activeUserId = previousActiveUserId;
      this.memberships = previousMemberships;
      console.error('Failed to delete character inventory:', itemsError);
      return false;
    }

    const { error: characterError } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId);

    if (characterError) {
      this.characters = [...this.characters, previousCharacter];
      this.items = [...this.items, ...previousItems];
      if (previousNpcProfile) this.npcProfiles = { ...this.npcProfiles, [characterId]: previousNpcProfile };
      this.activeUserId = previousActiveUserId;
      this.memberships = previousMemberships;
      console.error('Failed to delete character:', characterError);
      return false;
    }

    if (this.activeCampaignId) {
      await this.createCampaignLog(
        'character_delete',
        `Deleted character ${previousCharacter.name}.`,
        { characterId, inventoryDeleted: previousItems.length },
        {
          table: 'characters',
          recordId: characterId,
          before: {
            character: previousCharacter,
            items: previousItems
          }
        }
      );
    }

    return true;
  }

  async deleteItem(itemId: string) {
    if (!this.isGM) return;

    const previousItem = this.items.find(i => i.id === itemId);
    // Optimistic local update
    this.items = this.items.filter(i => i.id !== itemId);

    // Send the hard delete to Supabase
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) console.error("GM Error - Failed to delete item:", error);
    if (!error && previousItem) {
      await this.createCampaignLog(
        'inventory_delete',
        `Deleted ${previousItem.name} from inventory.`,
        { itemId },
        { table: 'items', recordId: itemId, before: previousItem }
      );
    }
  }

  async updateShipCredits(amountToAdd: number) {
    if (!this.activeCampaignId) return;
    const previousSnapshot = this.#lastLedgerSnapshot ?? this.createLedgerSnapshot();
    const currentCredits = Number(previousSnapshot.ship_credits ?? crewState.shipCredits) || 0;
    const newTotal = Math.max(0, currentCredits + amountToAdd);

    crewState.shipCredits = newTotal;

    const { error } = await this.upsertShipLedger(
      { ship_credits: newTotal },
      "GM Error - Failed to update ship credits:"
    );

    if (!error) {
      this.#lastLedgerSnapshot = this.createLedgerSnapshot({ ...previousSnapshot, ship_credits: newTotal });
      await this.createCampaignLog(
        'ship_credits',
        `Updated ship credits by ${amountToAdd}.`,
        { amountToAdd, ship_credits: newTotal },
        { table: 'ship_ledger', recordId: String(previousSnapshot.id ?? 'TT-9'), before: previousSnapshot }
      );
    }
  }

  async updateKibble(amountToAdd: number) {
    if (!this.activeCampaignId) return;
    const previousSnapshot = this.#lastLedgerSnapshot ?? this.createLedgerSnapshot();
    const currentKibble = Number(previousSnapshot.kibble_days ?? crewState.kibbleDays) || 0;
    const newKibble = Math.max(0, currentKibble + amountToAdd);
    
    crewState.kibbleDays = newKibble;

    const { error } = await this.upsertShipLedger(
      { kibble_days: newKibble },
      "GM Error - Failed to update kibble:"
    );

    if (!error) {
      this.#lastLedgerSnapshot = this.createLedgerSnapshot({ ...previousSnapshot, kibble_days: newKibble });
      await this.createCampaignLog(
        'ship_kibble',
        `Updated Kibble by ${amountToAdd}.`,
        { amountToAdd, kibble_days: newKibble },
        { table: 'ship_ledger', recordId: String(previousSnapshot.id ?? 'TT-9'), before: previousSnapshot }
      );
    }
  }

  async updateHP(characterId: string, newHP: number) {
    // Optimistic local update
    const char = this.getCharacterById(characterId);
    const previousChar = char ? { ...char } : null;
    if (char) char.hp = newHP;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ hp: newHP })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update HP:", error);
    if (!error && previousChar && char) {
      await this.createCampaignLog(
        'character_hp',
        `Updated ${char.name} HP to ${newHP}.`,
        { characterId, hp: newHP },
        { table: 'characters', recordId: characterId, before: previousChar }
      );
    }
  }


  async updateRads(characterId: string, newRads: number) {
    // Optimistic local update
    const char = this.getCharacterById(characterId);
    const previousChar = char ? { ...char } : null;
    if (char) char.rads = newRads;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ rads: newRads })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update rads:", error);
    if (!error && previousChar && char) {
      await this.createCampaignLog(
        'character_rads',
        `Updated ${char.name} Rads to ${newRads}.`,
        { characterId, rads: newRads },
        { table: 'characters', recordId: characterId, before: previousChar }
      );
    }
  }

  async updateSystemStrain(characterId: string, newSystemStrain: number) {
    const char = this.getCharacterById(characterId);
    const previousChar = char ? { ...char } : null;
    if (char) char.system_strain = newSystemStrain;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ system_strain: newSystemStrain })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update system strain:", error);
    if (!error && previousChar && char) {
      await this.createCampaignLog(
        'character_system_strain',
        `Updated ${char.name} System Strain to ${newSystemStrain}.`,
        { characterId, system_strain: newSystemStrain },
        { table: 'characters', recordId: characterId, before: previousChar }
      );
    }
  }

  async updateXP(characterId: string, newXP: number) {
    const normalizedXP = Math.max(0, Math.floor(Number(newXP)) || 0);
    const char = this.getCharacterById(characterId);
    const previousChar = char ? { ...char } : null;
    if (char) char.xp = normalizedXP;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ xp: normalizedXP })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update XP:", error);
    if (!error && previousChar && char) {
      await this.createCampaignLog(
        'character_xp',
        `Updated ${char.name} XP to ${normalizedXP}.`,
        { characterId, xp: normalizedXP },
        { table: 'characters', recordId: characterId, before: previousChar }
      );
    }
  }

  async levelUpCharacter(characterId: string, payload: CharacterLevelUpPayload) {
    if (this.localCharacterArchive?.core.id === characterId) return false;

    const char = this.getCharacterById(characterId);
    if (!char) return false;
    if (!canLevelUp(char)) return false;

    const targetLevel = char.level + 1;
    if (payload.targetLevel !== targetLevel) return false;
    if (payload.hpRolls.length !== targetLevel) return false;
    if (!payload.hpRolls.every((roll) => Number.isInteger(roll) && roll >= 1 && roll <= 6)) return false;

    const conModifier = getAttributeModifier(char.attributes.con);
    const dieTotal = payload.hpRolls.reduce((total, roll) => total + Math.max(1, roll + conModifier), 0);
    const warriorBonus = hasWarriorTraining(char.character_class) ? 2 * targetLevel : 0;
    const dieHardBonus = getHighestFocusLevels(char.foci)['Die Hard'] ? 2 * targetLevel : 0;
    const rolledMaxHp = dieTotal + warriorBonus + dieHardBonus;
    const nextMaxHp = rolledMaxHp > char.max_hp ? rolledMaxHp : char.max_hp + 1;
    const hpGain = nextMaxHp - char.max_hp;
    const nextHp = Math.min(nextMaxHp, char.hp + hpGain);

    const nextSkills: Partial<Record<Skill, number>> = { ...(char.skills ?? {}) };
    const nextAttributes = { ...char.attributes };
    const currentProgress = this.normalizeAdvancementProgress(char.advancement_progress);
    const nextProgress: CharacterAdvancementProgress = {
      generalSkillPoints: currentProgress.generalSkillPoints + 3,
      nonCombatSkillPoints: currentProgress.nonCombatSkillPoints + (hasExpertTraining(char.character_class) ? 1 : 0),
      skillInvestments: { ...(currentProgress.skillInvestments ?? {}) },
      attributeBoostCount: currentProgress.attributeBoostCount
    };
    const nextFoci = char.foci.map((pick) => ({ ...pick }));
    const needsFocusChoice = grantsFocusAtLevel(targetLevel);

    if (needsFocusChoice) {
      const focusChoice = payload.focusChoice;
      if (!focusChoice || !FOCI[focusChoice.focus]) return false;

      const highestFocusLevels = getHighestFocusLevels(nextFoci);
      const ownedLevel = highestFocusLevels[focusChoice.focus] ?? 0;
      if (focusChoice.level === 1) {
        if (ownedLevel > 0) return false;
        nextFoci.push({
          source: 'advancement',
          focus: focusChoice.focus,
          level: 1
        });

        const bonusEntry = FOCI[focusChoice.focus].bonusSkill;
        if (bonusEntry) {
          const bonusSkill = this.getFocusBonusSkill(focusChoice.focus, nextSkills, focusChoice.bonusSkill);
          if (!bonusSkill) return false;
          const applied = this.applySkillCredit(nextSkills, nextProgress.skillInvestments, bonusSkill, 3, targetLevel, true);
          if (!applied) return false;
        }
      } else if (focusChoice.level === 2) {
        if (ownedLevel !== 1) return false;
        nextFoci.push({
          source: 'advancement',
          focus: focusChoice.focus,
          level: 2
        });
      } else {
        return false;
      }
    } else if (payload.focusChoice) {
      return false;
    }

    for (const spend of payload.skillSpends) {
      if (spend.pool === 'noncombat') {
        if (isCombatSkill(spend.skill)) return false;
        if (nextProgress.nonCombatSkillPoints <= 0) return false;
        nextProgress.nonCombatSkillPoints -= 1;
      } else {
        if (nextProgress.generalSkillPoints <= 0) return false;
        nextProgress.generalSkillPoints -= 1;
      }

      const applied = this.applySkillCredit(nextSkills, nextProgress.skillInvestments, spend.skill, 1, targetLevel);
      if (!applied) return false;
    }

    for (const attribute of payload.attributeBoosts) {
      const rule = getAttributeBoostRule(nextProgress.attributeBoostCount);
      if (!rule) return false;
      if (targetLevel < rule.minLevel) return false;
      if (nextProgress.generalSkillPoints < rule.cost) return false;

      nextProgress.generalSkillPoints -= rule.cost;
      nextProgress.attributeBoostCount += 1;
      nextAttributes[attribute] = Math.min(18, nextAttributes[attribute] + 1);
    }

    const updates: Partial<CharacterRecord> = {
      level: targetLevel,
      hp: nextHp,
      max_hp: nextMaxHp,
      skills: nextSkills,
      attributes: nextAttributes,
      foci: nextFoci,
      advancement_progress: nextProgress
    };

    return await this.updateCharacter(characterId, updates);
  }

  async addCharacterCondition(characterId: string, condition: CharacterConditionTemplate | Pick<CharacterActiveCondition, 'category' | 'name' | 'summary'>) {
    const char = this.getCharacterById(characterId);
    if (!char) return;

    const nextCondition: CharacterActiveCondition = {
      id: crypto.randomUUID(),
      category: condition.category,
      name: condition.name,
      summary: condition.summary,
      templateId: 'id' in condition ? condition.id : undefined,
      createdAt: new Date().toISOString()
    };

    await this.updateCharacter(characterId, {
      active_conditions: [...this.normalizeActiveConditions(char.active_conditions), nextCondition]
    });
  }

  async removeCharacterCondition(characterId: string, conditionId: string) {
    const char = this.getCharacterById(characterId);
    if (!char) return;

    await this.updateCharacter(characterId, {
      active_conditions: this.normalizeActiveConditions(char.active_conditions).filter((condition) => condition.id !== conditionId)
    });
  }

  async updateCharacterNotes(characterId: string, notes: CharacterNotes) {
    const normalizedNotes = this.normalizeCharacterNotes(notes);

    if (this.localCharacterArchive?.core.id === characterId) {
      this.localCharacterArchive = {
        ...this.localCharacterArchive,
        core: {
          ...this.localCharacterArchive.core,
          character_notes: normalizedNotes
        },
        creation: {
          ...this.localCharacterArchive.creation,
          homeworld: normalizedNotes.homeworld,
          employerAffiliation: normalizedNotes.employerAffiliation,
          goal: normalizedNotes.goal,
          notes: normalizedNotes.notes
        }
      };
      return true;
    }

    return await this.updateCharacter(characterId, {
      character_notes: normalizedNotes
    });
  }

  async updateCharacterSkill(characterId: string, skill: Skill, level: number) {
    const char = this.getCharacterById(characterId);
    if (!char) return;

    const updatedSkills = { ...(char.skills ?? {}) };
    const normalizedLevel = Math.max(-1, Math.min(4, level));

    if (normalizedLevel < 0) {
      delete updatedSkills[skill];
    } else {
      updatedSkills[skill] = normalizedLevel;
    }

    await this.updateCharacter(characterId, { skills: updatedSkills });
  }

  async grantCharacterStat(characterId: string, attribute: AttributeKey, amount: number) {
    const char = this.getCharacterById(characterId);
    if (!char || !char.attributes) return;

    const updatedAttributes = {
      ...char.attributes,
      [attribute]: Math.max(3, Math.min(18, char.attributes[attribute] + amount))
    };

    await this.updateCharacter(characterId, { attributes: updatedAttributes });
  }

  formatBackgroundEntry(entry: BackgroundRuleEntry) {
    if (entry.type === 'skill') return `${entry.value}-0/+1`;
    if (entry.type === 'special') return entry.value;
    return `+${entry.bonus} ${entry.category} stat`;
  }

  getBackgroundRule(characterId: string, table: BackgroundTableName, roll: number) {
    const char = this.getCharacterById(characterId);
    if (!char) return null;

    const background = BACKGROUNDS[char.background];
    const index = roll - 1;
    return background?.[table]?.[index] ?? null;
  }

  getBackgroundProgress(characterId: string) {
    const char = this.getCharacterById(characterId);
    if (!char) return {};

    const progress = char.background_progress ?? {};
    return progress.background === char.background ? progress : {};
  }

  createBackgroundProgress(char: CharacterRecord, mode: BackgroundProgressMode): BackgroundProgress {
    return {
      mode,
      background: char.background,
      baseline: {
        skills: { ...(char.skills ?? {}) },
        attributes: { ...char.attributes }
      },
      choices: [],
      freeSkillApplied: false,
      complete: false,
      updatedAt: new Date().toISOString()
    };
  }

  getActiveBackgroundProgress(char: CharacterRecord, mode: BackgroundProgressMode) {
    const currentProgress = char.background_progress ?? {};

    if (currentProgress.background === char.background && currentProgress.mode) {
      if (currentProgress.mode !== mode) return null;
      return currentProgress;
    }

    return this.createBackgroundProgress(char, mode);
  }

  buildBackgroundGrant(
    char: CharacterRecord,
    entry: BackgroundRuleEntry,
    choice?: BackgroundResolvedChoice
  ) {
    if (entry.type === 'skill') {
      const skill = entry.value;
      const updatedSkills = { ...(char.skills ?? {}) };
      const before = updatedSkills[skill] ?? -1;
      const after = before >= 0 ? Math.min(4, before + 1) : 0;

      updatedSkills[skill] = after;

      return {
        updates: { skills: updatedSkills },
        result: { type: 'skill' as const, target: skill, before, after },
        resolvedSkill: skill
      };
    }

    if (entry.type === 'special') {
      const skill = choice?.skill;
      if (!skill || !getSkillChoices(entry.value).includes(skill)) return null;

      const updatedSkills = { ...(char.skills ?? {}) };
      const before = updatedSkills[skill] ?? -1;
      const after = before >= 0 ? Math.min(4, before + 1) : 0;

      updatedSkills[skill] = after;

      return {
        updates: { skills: updatedSkills },
        result: { type: 'skill' as const, target: skill, before, after },
        resolvedSkill: skill
      };
    }

    const attribute = choice?.attribute;
    if (!attribute || !getAttributeChoices(entry.category).includes(attribute)) return null;

    const updatedAttributes = { ...char.attributes };
    const before = updatedAttributes[attribute];
    const after = Math.max(3, Math.min(18, before + entry.bonus));

    updatedAttributes[attribute] = after;

    return {
      updates: { attributes: updatedAttributes },
      result: { type: 'stat' as const, target: attribute, before, after },
      resolvedAttribute: attribute
    };
  }

  async commitBackgroundGrant(
    characterId: string,
    progress: BackgroundProgress,
    entry: BackgroundRuleEntry,
    source: BackgroundProgressGrant['source'],
    choice?: BackgroundResolvedChoice,
    meta: Pick<BackgroundProgressGrant, 'table' | 'roll' | 'tableIndex'> = {},
    progressUpdates: Partial<BackgroundProgress> = {}
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const grant = this.buildBackgroundGrant(char, entry, choice);
    if (!grant) return false;

    const labelParts = [this.formatBackgroundEntry(entry)];
    if (grant.resolvedSkill && entry.type === 'special') labelParts.push(`-> ${grant.resolvedSkill}`);
    if (grant.resolvedAttribute) labelParts.push(`-> ${grant.resolvedAttribute.toUpperCase()}`);

    const nextGrant: BackgroundProgressGrant = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      label: labelParts.join(' '),
      entry,
      resolvedSkill: grant.resolvedSkill,
      resolvedAttribute: grant.resolvedAttribute,
      result: grant.result,
      ...meta
    };

    const nextProgress: BackgroundProgress = {
      ...progress,
      ...progressUpdates,
      choices: [...(progress.choices ?? []), nextGrant],
      updatedAt: new Date().toISOString()
    };

    await this.updateCharacter(characterId, {
      ...grant.updates,
      background_progress: nextProgress
    });

    return true;
  }

  async startBackgroundSetup(
    characterId: string,
    mode: BackgroundProgressMode,
    choice?: BackgroundResolvedChoice
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, mode);
    if (!progress) return false;

    if (mode === 'quick_skills') {
      await this.updateCharacter(characterId, {
        background_progress: {
          ...progress,
          updatedAt: new Date().toISOString()
        }
      });
      return true;
    }

    if (progress.freeSkillApplied) return true;

    const freeSkill = BACKGROUNDS[char.background].freeSkill;
    if (freeSkill.type === 'special' && !choice?.skill) return false;

    return await this.commitBackgroundGrant(
      characterId,
      progress,
      freeSkill,
      'free',
      choice,
      {},
      { freeSkillApplied: true }
    );
  }

  async applyBackgroundQuickSkills(
    characterId: string,
    choices: Partial<Record<string, BackgroundResolvedChoice>> = {}
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, 'quick_skills');
    if (!progress) return false;

    const entries = BACKGROUNDS[char.background].quickSkills;
    const unresolved = entries.some((entry) => {
      return entry.type === 'special' && !choices[entry.value]?.skill;
    });

    if (unresolved) return false;

    const updatedSkills = { ...(char.skills ?? {}) };
    const quickGrants: BackgroundProgressGrant[] = [];

    for (const entry of entries) {
      const selectedSkill = entry.type === 'skill'
        ? entry.value
        : choices[entry.value]?.skill;

      if (!selectedSkill || !getSkillChoices(entry.type === 'special' ? entry.value : 'Any Skill').includes(selectedSkill)) {
        return false;
      }

      const before = updatedSkills[selectedSkill] ?? -1;
      const after = before >= 0 ? Math.min(4, before + 1) : 0;
      updatedSkills[selectedSkill] = after;

      const labelParts = [this.formatBackgroundEntry(entry)];
      if (entry.type === 'special') labelParts.push(`-> ${selectedSkill}`);

      quickGrants.push({
        id: `${Date.now()}-${quickGrants.length}-${Math.random().toString(36).slice(2, 8)}`,
        source: 'quick',
        label: labelParts.join(' '),
        entry,
        resolvedSkill: selectedSkill,
        result: {
          type: 'skill',
          target: selectedSkill,
          before,
          after
        }
      });
    }

    await this.updateCharacter(characterId, {
      skills: updatedSkills,
      background_progress: {
        ...progress,
        choices: [...(progress.choices ?? []), ...quickGrants],
        complete: true,
        updatedAt: new Date().toISOString()
      }
    });

    return true;
  }

  async applyBackgroundRollSelection(
    characterId: string,
    table: BackgroundTableName,
    roll: number,
    choice?: BackgroundResolvedChoice
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, 'roll_tables');
    if (!progress || !progress.freeSkillApplied) return false;

    const rollCount = (progress.choices ?? []).filter(grant => grant.source === 'roll').length;
    if (rollCount >= 3) return false;

    const entry = this.getBackgroundRule(characterId, table, roll);
    if (!entry) return false;

    const applied = await this.commitBackgroundGrant(
      characterId,
      progress,
      entry,
      'roll',
      choice,
      { table, roll, tableIndex: roll - 1 }
    );

    if (!applied) return false;

    const updatedChar = this.getCharacterById(characterId);
    const updatedProgress = updatedChar?.background_progress;
    const nextRollCount = (updatedProgress?.choices ?? []).filter(grant => grant.source === 'roll').length;

    if (updatedProgress && nextRollCount >= 3) {
      await this.updateCharacter(characterId, {
        background_progress: {
          ...updatedProgress,
          complete: true,
          updatedAt: new Date().toISOString()
        }
      });
    }

    return true;
  }

  async applyBackgroundLearningPick(
    characterId: string,
    tableIndex: number,
    choice?: BackgroundResolvedChoice
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, 'pick_learning');
    if (!progress || !progress.freeSkillApplied) return false;

    const learningPickCount = (progress.choices ?? []).filter(grant => grant.source === 'learning_pick').length;
    if (learningPickCount >= 2) return false;

    const pickedIndexes = new Set(
      (progress.choices ?? [])
        .filter(grant => grant.source === 'learning_pick')
        .map(grant => grant.tableIndex)
    );
    if (pickedIndexes.has(tableIndex)) return false;

    const entry = BACKGROUNDS[char.background].learning[tableIndex];
    if (!entry) return false;

    const applied = await this.commitBackgroundGrant(
      characterId,
      progress,
      entry,
      'learning_pick',
      choice,
      { table: 'learning', tableIndex }
    );

    if (!applied) return false;

    const updatedChar = this.getCharacterById(characterId);
    const updatedProgress = updatedChar?.background_progress;
    const nextPickCount = (updatedProgress?.choices ?? []).filter(grant => grant.source === 'learning_pick').length;

    if (updatedProgress && nextPickCount >= 2) {
      await this.updateCharacter(characterId, {
        background_progress: {
          ...updatedProgress,
          complete: true,
          updatedAt: new Date().toISOString()
        }
      });
    }

    return true;
  }

  async resetBackgroundProgress(characterId: string) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = char.background_progress ?? {};
    if (!progress.baseline) {
      await this.updateCharacter(characterId, { background_progress: {} });
      return true;
    }

    await this.updateCharacter(characterId, {
      skills: { ...progress.baseline.skills },
      attributes: { ...progress.baseline.attributes },
      background_progress: {}
    });

    return true;
  }

  async updateCharacter(characterId: string, updates: Partial<CharacterRecord>) {
    // Update local state for immediate feedback
    // const index = this.characters.findIndex(c => c.id === characterId);
    // if (index !== -1) {
    //   this.characters[index] = { ...this.characters[index], ...updates };
    // }
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    if (this.localCharacterArchive?.core.id !== characterId && !this.canManageCharacter(char)) {
      console.warn('Blocked character update without ownership:', characterId);
      return false;
    }

    const previousChar = char ? { ...char } : null;
    if (char) Object.assign(char, updates);

    if (this.localCharacterArchive?.core.id === characterId) {
      this.localCharacterArchive = {
        ...this.localCharacterArchive,
        core: { ...this.localCharacterArchive.core, ...updates }
      };
      return true;
    }

    // Push to Supabase
    const { error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', characterId);

    if (!error) {
      if (previousChar) {
        await this.createCampaignLog(
          'character_update',
          `Updated ${previousChar.name}.`,
          { characterId, fields: Object.keys(updates) },
          { table: 'characters', recordId: characterId, before: previousChar }
        );
      }
      return true;
    }

    if (
      updates.advancement_progress !== undefined &&
      error.code === 'PGRST204' &&
      error.message.includes('advancement_progress')
    ) {
      const { advancement_progress, ...fallbackUpdates } = updates;
      console.error(
        "Update failed: missing characters.advancement_progress. Apply supabase/migrations/20260606010000_add_character_advancement_progress.sql to persist level-up SP carryover.",
        error
      );

      if (Object.keys(fallbackUpdates).length === 0) return false;

      const { error: fallbackError } = await supabase
        .from('characters')
        .update(fallbackUpdates)
        .eq('id', characterId);

      if (fallbackError) {
        console.error("Update fallback failed:", fallbackError);
        return false;
      }

      if (previousChar) {
        await this.createCampaignLog(
          'character_update',
          `Updated ${previousChar.name}.`,
          { characterId, fields: Object.keys(fallbackUpdates) },
          { table: 'characters', recordId: characterId, before: previousChar }
        );
      }

      return true;
    }

    console.error("Update failed:", error);
    return false;
  }
}

export const dbState = new DatabaseStateManager();
