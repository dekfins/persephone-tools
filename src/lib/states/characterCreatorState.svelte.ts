import backgrounds from '../../data/character/backgrounds.json';
import foci from '../../data/character/foci.json';
import randomCharacter from '../../data/character/randomCharacter.json';
import {
  ALL_ATTRIBUTES,
  ALL_BACKGROUNDS,
  ALL_EQUIPMENT,
  ALL_EQUIPMENT_PACKAGES,
  ALL_FOCI,
  ALL_SKILLS,
  CHARACTER_CLASSES,
  formatEquipmentCategory,
  getAttributeChoices,
  getEquipmentById,
  getEquipmentDisplayName,
  getEquipmentInventoryMass,
  getFocusSkillChoices,
  getSkillChoices,
  HERITAGES
} from '../character/characterConstants';
import { getAttributeModifier } from '../character/characterMechanics';
import { generateCharacterName, generatePlaceName, NAME_CULTURES } from '../character/nameGenerator';
import type {
  AdventurerPartial,
  AttributeKey,
  Attributes,
  Background,
  BackgroundDefinitions,
  BackgroundProgress,
  BackgroundProgressGrant,
  BackgroundProgressMode,
  BackgroundResolvedChoice,
  BackgroundRuleEntry,
  BackgroundTableName,
  CharacterClass,
  CharacterCreationArchive,
  CharacterCreationDetails,
  CharacterFocusPick,
  CharacterRecord,
  CreatorEquipmentChoice,
  CreatorEquipmentMode,
  EquipmentPackageDefinition,
  EquipmentPackageId,
  EquipmentCatalogItem,
  EquipmentWeaponStats,
  Foci,
  FocusDefinitions,
  FocusGrantEntry,
  FocusLevel,
  FocusPickSource,
  FocusProgress,
  FocusProgressGrant,
  Heritage,
  PurchasedEquipmentItem,
  Skill,
  StartingEquipmentItem
} from '../types';

const BACKGROUNDS = backgrounds as BackgroundDefinitions;
const FOCI = foci as FocusDefinitions;
const STANDARD_ARRAY = [14, 12, 11, 10, 9, 7];
const CREATOR_STEPS = ['attributes', 'background', 'class', 'foci', 'vitals', 'equipment', 'identity', 'review'] as const;
type QuickCharacterStyleId =
  | 'expert_smart'
  | 'expert_smooth'
  | 'expert_nimble'
  | 'warrior_melee'
  | 'warrior_ranged'
  | 'warrior_leader';
type QuickFocusPick = {
  focus: Foci;
  skill?: Skill;
};
type QuickCharacterStyle = {
  id: QuickCharacterStyleId;
  class: CharacterClass;
  attributes: Attributes;
  focusRolls: readonly (readonly QuickFocusPick[])[];
};
type RandomCharacterData = {
  affiliations: readonly string[];
  goals: readonly string[];
  notes: readonly string[];
  quickCharacterStyles: readonly QuickCharacterStyle[];
};

function validateRandomCharacterData(data: unknown): RandomCharacterData {
  const value = data as RandomCharacterData;

  if (!Array.isArray(value.affiliations) || !Array.isArray(value.goals) || !Array.isArray(value.notes)) {
    throw new Error('Random character data must include affiliations, goals, and notes arrays.');
  }

  value.quickCharacterStyles.forEach((style) => {
    if (!CHARACTER_CLASSES.some((option) => option.value === style.class)) {
      throw new Error(`Random character style "${style.id}" has invalid class "${style.class}".`);
    }

    ALL_ATTRIBUTES.forEach((attribute) => {
      if (!Number.isInteger(style.attributes[attribute])) {
        throw new Error(`Random character style "${style.id}" has invalid ${attribute.toUpperCase()} score.`);
      }
    });

    if (style.focusRolls.length !== 6) {
      throw new Error(`Random character style "${style.id}" must have exactly six focus rolls.`);
    }

    style.focusRolls.flat().forEach((pick) => {
      if (!ALL_FOCI.includes(pick.focus)) {
        throw new Error(`Random character style "${style.id}" has invalid focus "${pick.focus}".`);
      }
      if (pick.skill && !ALL_SKILLS.includes(pick.skill)) {
        throw new Error(`Random character style "${style.id}" has invalid focus skill "${pick.skill}".`);
      }
    });
  });

  return value;
}

const RANDOM_CHARACTER_DATA = validateRandomCharacterData(randomCharacter);
const DEFAULT_ATTRIBUTES: Attributes = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10
};

type AttributeMethod = 'manual' | 'array' | 'rolled';
type PendingChoiceKind = 'skill' | 'attribute' | 'redirect';
export type CharacterCreatorStep = typeof CREATOR_STEPS[number];

type QueuedCreatorGrant = {
  entry: BackgroundRuleEntry;
  source: BackgroundProgressGrant['source'];
  table?: BackgroundTableName;
  roll?: number;
  tableIndex?: number;
};

type QueuedFocusGrant = {
  entry: FocusGrantEntry;
  source: FocusPickSource;
  focus: Foci;
  level: FocusLevel;
};

type FocusSlot = {
  source: FocusPickSource;
  label: string;
  filter: 'any' | 'combat' | 'noncombat';
};

export type CharacterCreatorDraft = {
  name: string;
  homeworld: string;
  heritage: Heritage;
  background: Background;
  characterClass: CharacterClass;
  adventurerPartials: AdventurerPartial[];
  focusPicks: CharacterFocusPick[];
  focusProgress: FocusProgress;
  employerAffiliation: string;
  goal: string;
  notes: string;
  attributes: Attributes;
  attributeMethod: AttributeMethod;
  skills: Partial<Record<Skill, number>>;
  backgroundProgress: BackgroundProgress;
  freeInterestSkill?: Skill;
  hpRoll: number;
  startingCredits: number;
  equipmentMode: CreatorEquipmentMode;
  selectedPackageId: EquipmentPackageId | null;
  creditRoll?: [number, number];
  customCreditRoll?: [number, number];
  customStartingCredits?: number;
  purchasedItems: PurchasedEquipmentItem[];
};

function cloneAttributes(attributes: Attributes): Attributes {
  return { ...attributes };
}

function createEmptyFocusProgress(): FocusProgress {
  return {
    picks: [],
    grants: [],
    complete: false
  };
}

function createDefaultDraft(): CharacterCreatorDraft {
  return {
    name: '',
    homeworld: '',
    heritage: HERITAGES[0].value,
    background: ALL_BACKGROUNDS[0],
    characterClass: CHARACTER_CLASSES[0].value,
    adventurerPartials: [],
    focusPicks: [],
    focusProgress: createEmptyFocusProgress(),
    employerAffiliation: '',
    goal: '',
    notes: '',
    attributes: cloneAttributes(DEFAULT_ATTRIBUTES),
    attributeMethod: 'manual',
    skills: {},
    backgroundProgress: {},
    hpRoll: 1,
    startingCredits: 0,
    equipmentMode: 'package',
    selectedPackageId: null,
    creditRoll: undefined,
    customCreditRoll: undefined,
    customStartingCredits: undefined,
    purchasedItems: []
  };
}

function clampScore(value: number) {
  if (Number.isNaN(value)) return 10;
  return Math.max(3, Math.min(18, Math.round(value)));
}

function rollDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function signed(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function normalizeQuantity(value: number) {
  return Math.max(1, Math.floor(Number(value)) || 1);
}

function isBuyableEquipment(item: EquipmentCatalogItem) {
  return Boolean(
    item.app.playerVisible &&
    item.app.spawnable &&
    !item.app.gmOnly &&
    item.legality !== 'removed' &&
    item.availability !== 'removed' &&
    item.cost !== null
  );
}

function skillAfterGrant(before: number) {
  return before >= 0 ? Math.min(1, before + 1) : 0;
}

function formatBackgroundEntry(entry: BackgroundRuleEntry) {
  if (entry.type === 'skill') return `${entry.value}-0/+1`;
  if (entry.type === 'special') return entry.value;
  return `+${entry.bonus} ${entry.category.toUpperCase()} STAT`;
}

function formatFocusEntry(entry: FocusGrantEntry) {
  if (entry.type === 'skill') return `${entry.value}-0/+1`;
  return entry.value.toUpperCase();
}

function sanitizeId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[\s\-.]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');

  return `char_${slug || 'unnamed'}`;
}

class CharacterCreatorStateManager {
  draft = $state<CharacterCreatorDraft>(createDefaultDraft());
  activeStep = $state<CharacterCreatorStep>('attributes');
  arrayAssignments = $state<Partial<Record<AttributeKey, number>>>({});
  attributeSetTo14 = $state<{ attribute: AttributeKey; previousValue: number } | null>(null);
  queuedGrants = $state<QueuedCreatorGrant[]>([]);
  queuedFocusGrants = $state<QueuedFocusGrant[]>([]);
  pendingChoiceKind = $state<PendingChoiceKind | null>(null);
  pendingFocusChoiceKind = $state<'skill' | 'redirect' | null>(null);
  lastMessage = $state('');

  get steps() {
    return CREATOR_STEPS.map((key) => ({
      key,
      label: key.toUpperCase()
    }));
  }

  get activeStepIndex() {
    return CREATOR_STEPS.indexOf(this.activeStep);
  }

  get isFirstStep() {
    return this.activeStepIndex === 0;
  }

  get isLastStep() {
    return this.activeStepIndex === CREATOR_STEPS.length - 1;
  }

  get hasDraftProgress() {
    return Boolean(
      this.draft.name.trim() ||
      this.draft.homeworld.trim() ||
      this.draft.employerAffiliation.trim() ||
      this.draft.goal.trim() ||
      this.draft.notes.trim() ||
      this.draft.heritage !== HERITAGES[0].value ||
      this.draft.background !== ALL_BACKGROUNDS[0] ||
      this.draft.characterClass !== CHARACTER_CLASSES[0].value ||
      this.draft.adventurerPartials.length > 0 ||
      this.draft.focusPicks.length > 0 ||
      this.draft.focusProgress.picks.length > 0 ||
      this.draft.focusProgress.grants.length > 0 ||
      this.draft.focusProgress.complete ||
      this.draft.freeInterestSkill ||
      this.draft.attributeMethod !== 'manual' ||
      ALL_ATTRIBUTES.some((attribute) => this.draft.attributes[attribute] !== DEFAULT_ATTRIBUTES[attribute]) ||
      Object.keys(this.arrayAssignments).length > 0 ||
      this.attributeSetTo14 !== null ||
      Object.keys(this.draft.skills).length > 0 ||
      Object.keys(this.draft.backgroundProgress).length > 0 ||
      this.draft.hpRoll !== 1 ||
      this.draft.startingCredits !== 0 ||
      this.draft.equipmentMode !== 'package' ||
      this.draft.selectedPackageId !== null ||
      this.draft.creditRoll !== undefined ||
      this.draft.customCreditRoll !== undefined ||
      this.draft.customStartingCredits !== undefined ||
      this.draft.purchasedItems.length > 0 ||
      this.queuedGrants.length > 0 ||
      this.queuedFocusGrants.length > 0 ||
      this.pendingChoiceKind !== null ||
      this.pendingFocusChoiceKind !== null
    );
  }

  get isArrayAssignmentMode() {
    return this.draft.attributeMethod === 'array';
  }

  get backgroundDefinition() {
    return BACKGROUNDS[this.draft.background];
  }

  get currentQueuedGrant() {
    return this.queuedGrants[0] ?? null;
  }

  get currentQueuedFocusGrant() {
    return this.queuedFocusGrants[0] ?? null;
  }

  get focusDefinitions() {
    return FOCI;
  }

  get standardArrayValues() {
    return STANDARD_ARRAY;
  }

  get availableArrayValues() {
    return STANDARD_ARRAY.filter((value) => {
      return !Object.values(this.arrayAssignments).includes(value);
    });
  }

  get activeAttributeSetTo14() {
    return this.attributeSetTo14?.attribute ?? null;
  }

  get currentChoiceOptions() {
    const pending = this.currentQueuedGrant;
    if (!pending || !this.pendingChoiceKind) return [];

    if (this.pendingChoiceKind === 'attribute' && pending.entry.type === 'stat') {
      return getAttributeChoices(pending.entry.category).map((attribute) => ({
        label: attribute.toUpperCase(),
        value: attribute,
        kind: 'attribute' as const
      }));
    }

    const skills = this.pendingChoiceKind === 'redirect'
      ? ALL_SKILLS.filter((skill) => (this.draft.skills[skill] ?? -1) < 1)
      : pending.entry.type === 'special'
        ? getSkillChoices(pending.entry.value)
        : ALL_SKILLS;

    return skills.map((skill) => ({
      label: skill.toUpperCase(),
      value: skill,
      kind: 'skill' as const
    }));
  }

  get currentFocusChoiceOptions() {
    const pending = this.currentQueuedFocusGrant;
    if (!pending || !this.pendingFocusChoiceKind) return [];

    const skills = this.pendingFocusChoiceKind === 'redirect'
      ? ALL_SKILLS.filter((skill) => (this.draft.skills[skill] ?? -1) < 1)
      : pending.entry.type === 'special'
        ? getFocusSkillChoices(pending.entry.value)
        : ALL_SKILLS;

    return skills.map((skill) => ({
      label: skill.toUpperCase(),
      value: skill,
      kind: 'skill' as const
    }));
  }

  get attributeModifiers() {
    return ALL_ATTRIBUTES.reduce((mods, attribute) => {
      mods[attribute] = getAttributeModifier(this.draft.attributes[attribute]);
      return mods;
    }, {} as Record<AttributeKey, number>);
  }

  get hasExpertTraining() {
    return (
      this.draft.characterClass === 'expert' ||
      this.draft.adventurerPartials.includes('partial_expert')
    );
  }

  get hasWarriorTraining() {
    return (
      this.draft.characterClass === 'warrior' ||
      this.draft.adventurerPartials.includes('partial_warrior')
    );
  }

  get baseAttackBonus() {
    return this.hasWarriorTraining ? 1 : 0;
  }

  get highestFocusLevels() {
    return this.draft.focusPicks.reduce((levels, pick) => {
      levels[pick.focus] = Math.max(levels[pick.focus] ?? 0, pick.level) as FocusLevel;
      return levels;
    }, {} as Partial<Record<Foci, FocusLevel>>);
  }

  get maxHp() {
    const conMod = getAttributeModifier(this.draft.attributes.con);
    const warriorBonus = this.hasWarriorTraining ? 2 : 0;
    const dieHardBonus = this.highestFocusLevels['Die Hard'] ? 2 : 0;
    return Math.max(1, this.draft.hpRoll + conMod + warriorBonus + dieHardBonus);
  }

  get unarmoredArmorClass() {
    const baseArmorClass = 10 + getAttributeModifier(this.draft.attributes.dex);
    const ironhideArmorClass = this.highestFocusLevels.Ironhide ? 16 : 0;
    return Math.max(baseArmorClass, ironhideArmorClass);
  }

  get armorClass() {
    const dexModifier = getAttributeModifier(this.draft.attributes.dex);
    const armorItems = this.allDraftEquipmentItems
      .map((entry) => getEquipmentById(entry.equipmentId))
      .filter((item) => item?.armor && item.armor.armorType !== 'shield');
    const shieldItems = this.allDraftEquipmentItems
      .map((entry) => getEquipmentById(entry.equipmentId))
      .filter((item) => item?.armor?.armorType === 'shield');

    const bestWornArmorClass = armorItems.reduce((best, item) => {
      return Math.max(best, item?.armor?.armorClass ?? 0);
    }, 0);
    const armorClass = bestWornArmorClass > 0
      ? bestWornArmorClass + dexModifier
      : this.unarmoredArmorClass;

    return shieldItems.reduce((currentArmorClass, item) => {
      if (!item?.armor) return currentArmorClass;
      if (currentArmorClass < item.armor.armorClass) return item.armor.armorClass;
      return currentArmorClass + (item.armor.armorClassBonus ?? 0);
    }, armorClass);
  }

  get packageOptions() {
    return [
      {
        label: 'SELECT...',
        value: null,
        description: 'NO EQUIPMENT PACKAGE SELECTED'
      },
      ...ALL_EQUIPMENT_PACKAGES.map((pack) => ({
        label: pack.name.toUpperCase(),
        value: pack.id,
        description: `${pack.credits} CR / ${pack.items.length} ITEMS`
      }))
    ];
  }

  get selectedEquipmentPackage(): EquipmentPackageDefinition | null {
    if (!this.draft.selectedPackageId) return null;
    return ALL_EQUIPMENT_PACKAGES.find((pack) => pack.id === this.draft.selectedPackageId) ?? null;
  }

  get startingEquipmentItems(): StartingEquipmentItem[] {
    if (this.draft.equipmentMode !== 'package') return [];
    const pack = this.selectedEquipmentPackage;
    if (!pack) return [];

    return pack.items.map((entry) => {
      const item = getEquipmentById(entry.equipmentId);
      return {
        equipmentId: entry.equipmentId,
        quantity: normalizeQuantity(entry.quantity),
        displayName: getEquipmentDisplayName(item, entry.equipmentId),
        packageId: pack.id
      };
    });
  }

  get purchasedEquipmentItems(): StartingEquipmentItem[] {
    if (this.draft.equipmentMode !== 'rolled_credits') return [];

    return this.draft.purchasedItems.map((entry) => {
      const item = getEquipmentById(entry.equipmentId);
      return {
        equipmentId: entry.equipmentId,
        quantity: normalizeQuantity(entry.quantity),
        displayName: getEquipmentDisplayName(item, entry.equipmentId)
      };
    });
  }

  get allDraftEquipmentItems(): StartingEquipmentItem[] {
    return [...this.startingEquipmentItems, ...this.purchasedEquipmentItems];
  }

  get startingEquipmentEncumbrance() {
    return this.allDraftEquipmentItems.reduce((total, entry) => {
      const item = getEquipmentById(entry.equipmentId);
      return total + (item ? getEquipmentInventoryMass(item) * entry.quantity : 0);
    }, 0);
  }

  get equipmentArmorSummary() {
    const armorItems = this.allDraftEquipmentItems
      .map((entry) => ({ entry, item: getEquipmentById(entry.equipmentId) }))
      .filter(({ item }) => item?.armor);

    if (armorItems.length === 0) {
      return `UNARMORED AC ${this.unarmoredArmorClass}`;
    }

    return armorItems
      .map(({ entry, item }) => {
        if (!item?.armor) return '';
        const shield = item.armor.armorType === 'shield';
        const value = shield && item.armor.armorClassBonus
          ? `+${item.armor.armorClassBonus} AC`
          : `AC ${item.armor.armorClass}`;
        return `${(entry.displayName ?? getEquipmentDisplayName(item, entry.equipmentId)).toUpperCase()} ${value}`;
      })
      .filter(Boolean)
      .join(' / ');
  }

  get equipmentWeaponSummaries() {
    return this.allDraftEquipmentItems
      .map((entry) => {
        const item = getEquipmentById(entry.equipmentId);
        if (!item?.weapon) return null;
        const hitBonus = this.getWeaponHitBonus(item.weapon, item.category);
        const damageMod = this.getWeaponAttributeModifier(item.weapon);
        return {
          label: entry.displayName ?? getEquipmentDisplayName(item, entry.equipmentId),
          quantity: entry.quantity,
          hitBonus,
          damage: `${item.weapon.damage}${damageMod === 0 ? '' : ` ${signed(damageMod)}`}`
        };
      })
      .filter((summary): summary is { label: string; quantity: number; hitBonus: number; damage: string } => Boolean(summary));
  }

  get buyableEquipmentOptions() {
    return ALL_EQUIPMENT
      .filter(isBuyableEquipment)
      .map((item) => ({
        label: item.name,
        value: item.id,
        description: `${formatEquipmentCategory(item.category)} / ${item.cost?.toLocaleString()} CR`,
        item
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get purchasedEquipmentCost() {
    if (this.draft.equipmentMode !== 'rolled_credits') return 0;

    return this.draft.purchasedItems.reduce((total, entry) => {
      const item = getEquipmentById(entry.equipmentId);
      return total + (item?.cost ?? 0) * normalizeQuantity(entry.quantity);
    }, 0);
  }

  get remainingStartingCredits() {
    return this.draft.startingCredits - this.purchasedEquipmentCost;
  }

  get purchasedEquipmentValidationMessages() {
    const messages: string[] = [];
    if (this.draft.equipmentMode !== 'rolled_credits') return messages;

    this.draft.purchasedItems.forEach((entry) => {
      const item = getEquipmentById(entry.equipmentId);
      if (!item) {
        messages.push(`MISSING CATALOG ITEM ${entry.equipmentId}`);
        return;
      }
      if (!isBuyableEquipment(item)) messages.push(`${item.name.toUpperCase()} IS NOT BUYABLE`);
      if (!Number.isInteger(entry.quantity) || entry.quantity < 1) messages.push(`${item.name.toUpperCase()} HAS INVALID QTY`);
    });

    if (this.remainingStartingCredits < 0) messages.push('STARTING GEAR CART OVERSPENT');
    return messages;
  }

  get saves() {
    const mods = this.attributeModifiers;
    return {
      physical: 15 - Math.max(mods.str, mods.con),
      evasion: 15 - Math.max(mods.int, mods.dex),
      mental: 15 - Math.max(mods.wis, mods.cha)
    };
  }

  get focusSlots(): FocusSlot[] {
    const slots: FocusSlot[] = [{ source: 'base', label: 'BASE FOCUS', filter: 'any' }];
    if (this.hasExpertTraining) slots.push({ source: 'expert', label: 'EXPERT FOCUS', filter: 'noncombat' });
    if (this.hasWarriorTraining) slots.push({ source: 'warrior', label: 'WARRIOR FOCUS', filter: 'combat' });
    return slots;
  }

  get selectedFocusSources() {
    return new Set(this.draft.focusPicks.map((pick) => pick.source));
  }

  get isFocusProgressComplete() {
    return (
      this.focusSlots.every((slot) => this.selectedFocusSources.has(slot.source)) &&
      this.draft.focusProgress.complete === true &&
      this.queuedFocusGrants.length === 0 &&
      this.pendingFocusChoiceKind === null
    );
  }

  get rollCount() {
    return (this.draft.backgroundProgress.choices ?? []).filter((grant) => grant.source === 'roll').length;
  }

  get learningPickCount() {
    return (this.draft.backgroundProgress.choices ?? []).filter((grant) => grant.source === 'learning_pick').length;
  }

  get pickedLearningIndexes() {
    return new Set(
      (this.draft.backgroundProgress.choices ?? [])
        .filter((grant) => grant.source === 'learning_pick')
        .map((grant) => grant.tableIndex)
    );
  }

  get validationMessages() {
    const messages: string[] = [];

    if (!this.draft.name.trim()) messages.push('NAME REQUIRED');
    if (!this.draft.goal.trim()) messages.push('GOAL REQUIRED');
    if (!this.draft.backgroundProgress.complete) messages.push('BACKGROUND SETUP INCOMPLETE');
    if (this.draft.characterClass === 'adventurer' && this.draft.adventurerPartials.length !== 2) {
      messages.push('ADVENTURER PARTIALS REQUIRED');
    }
    if (!this.isFocusProgressComplete) messages.push('FOCI SETUP INCOMPLETE');
    if (!this.draft.freeInterestSkill) messages.push('FREE INTEREST SKILL REQUIRED');
    if (this.draft.hpRoll < 1) messages.push('HP ROLL REQUIRED');
    if (this.draft.equipmentMode === 'package' && !this.selectedEquipmentPackage) {
      messages.push('EQUIPMENT PACKAGE REQUIRED');
    }
    if (this.draft.equipmentMode === 'rolled_credits' && !this.draft.creditRoll) {
      messages.push('STARTING CREDITS ROLL REQUIRED');
    }
    messages.push(...this.purchasedEquipmentValidationMessages);

    return messages;
  }

  isStepComplete(step: CharacterCreatorStep) {
    if (step === 'identity') {
      return Boolean(this.draft.name.trim() && this.draft.goal.trim());
    }

    if (step === 'attributes') {
      return ALL_ATTRIBUTES.every((attribute) => {
        return this.draft.attributes[attribute] >= 3 && this.draft.attributes[attribute] <= 18;
      });
    }

    if (step === 'background') {
      return Boolean(this.draft.backgroundProgress.complete);
    }

    if (step === 'class') {
      return this.draft.characterClass !== 'adventurer' || this.draft.adventurerPartials.length === 2;
    }

    if (step === 'foci') {
      return Boolean(this.isFocusProgressComplete && this.draft.freeInterestSkill);
    }

    if (step === 'vitals') {
      return this.draft.hpRoll >= 1;
    }

    if (step === 'equipment') {
      return this.draft.equipmentMode === 'package'
        ? Boolean(this.selectedEquipmentPackage) && this.purchasedEquipmentValidationMessages.length === 0
        : Boolean(this.draft.creditRoll) && this.purchasedEquipmentValidationMessages.length === 0;
    }

    return this.validationMessages.length === 0;
  }

  setActiveStep(step: CharacterCreatorStep) {
    this.activeStep = step;
  }

  nextStep() {
    if (this.isLastStep) return;
    this.activeStep = CREATOR_STEPS[this.activeStepIndex + 1];
  }

  previousStep() {
    if (this.isFirstStep) return;
    this.activeStep = CREATOR_STEPS[this.activeStepIndex - 1];
  }

  resetDraft() {
    this.draft = createDefaultDraft();
    this.activeStep = 'attributes';
    this.arrayAssignments = {};
    this.attributeSetTo14 = null;
    this.queuedGrants = [];
    this.queuedFocusGrants = [];
    this.pendingChoiceKind = null;
    this.pendingFocusChoiceKind = null;
    this.lastMessage = 'CREATOR DRAFT RESET';
  }

  loadArchive(archive: CharacterCreationArchive) {
    this.draft = {
      name: archive.core.name,
      homeworld: archive.creation.homeworld,
      heritage: archive.core.heritage,
      background: archive.core.background,
      characterClass: archive.core.character_class,
      adventurerPartials: [...archive.creation.adventurerPartials],
      focusPicks: archive.creation.focusPicks.map((pick) => ({ ...pick })),
      focusProgress: {
        ...archive.creation.focusProgress,
        picks: archive.creation.focusProgress.picks.map((pick) => ({ ...pick })),
        grants: archive.creation.focusProgress.grants.map((grant) => ({ ...grant }))
      },
      employerAffiliation: archive.creation.employerAffiliation,
      goal: archive.creation.goal,
      notes: archive.creation.notes,
      attributes: cloneAttributes(archive.core.attributes),
      attributeMethod: archive.creation.attributeMethod,
      skills: { ...archive.core.skills },
      backgroundProgress: {
        ...archive.core.background_progress,
        choices: [...(archive.core.background_progress.choices ?? [])]
      },
      freeInterestSkill: archive.creation.freeInterestSkill,
      hpRoll: archive.creation.hpRoll,
      startingCredits: archive.creation.equipment.startingCredits,
      equipmentMode: archive.creation.equipment.mode,
      selectedPackageId: archive.creation.equipment.packageId ?? null,
      creditRoll: archive.creation.equipment.creditRoll
        ? [...archive.creation.equipment.creditRoll] as [number, number]
        : undefined,
      customCreditRoll: archive.creation.equipment.mode === 'rolled_credits' && archive.creation.equipment.creditRoll
        ? [...archive.creation.equipment.creditRoll] as [number, number]
        : undefined,
      customStartingCredits: archive.creation.equipment.mode === 'rolled_credits'
        ? archive.creation.equipment.startingCredits
        : undefined,
      purchasedItems: archive.creation.equipment.purchasedItems.map((entry) => ({ ...entry }))
    };
    this.activeStep = 'review';
    this.arrayAssignments = {};
    this.attributeSetTo14 = null;
    this.queuedGrants = [];
    this.queuedFocusGrants = [];
    this.pendingChoiceKind = null;
    this.pendingFocusChoiceKind = null;
    this.lastMessage = `${archive.core.name.toUpperCase()} ARCHIVE LOADED`;
  }

  generateRandomCharacter() {
    this.resetDraft();

    const nameCulture = randomItem(NAME_CULTURES);
    const generatedName = generateCharacterName({
      culture: nameCulture,
      firstNameType: 'any'
    });
    const generatedHomeworld = generatePlaceName(nameCulture);

    this.setName(generatedName.fullName);
    this.setHomeworld(generatedHomeworld.placeName);
    this.setEmployerAffiliation(randomItem(RANDOM_CHARACTER_DATA.affiliations));
    this.setGoal(randomItem(RANDOM_CHARACTER_DATA.goals));
    this.setNotes(randomItem(RANDOM_CHARACTER_DATA.notes));
    this.setHeritage(randomItem(HERITAGES).value);
    const quickStyle = randomItem(RANDOM_CHARACTER_DATA.quickCharacterStyles);
    const focusPicks = randomItem(quickStyle.focusRolls);
    this.draft.attributes = cloneAttributes(quickStyle.attributes);
    this.draft.attributeMethod = 'manual';
    this.setBackground(randomItem(ALL_BACKGROUNDS));
    this.setClass(quickStyle.class);
    this.generateQuickBackground();
    this.generateQuickFoci(focusPicks);
    this.applyQuickBonusSkill();
    this.rollHp();
    this.chooseEquipmentPackage(randomItem(ALL_EQUIPMENT_PACKAGES).id);

    this.activeStep = 'review';
    this.lastMessage = `${this.draft.name.toUpperCase()} RANDOM PC GENERATED`;
  }

  setName(value: string) {
    this.draft.name = value;
  }

  setHomeworld(value: string) {
    this.draft.homeworld = value;
  }

  setEmployerAffiliation(value: string) {
    this.draft.employerAffiliation = value;
  }

  setGoal(value: string) {
    this.draft.goal = value;
  }

  setNotes(value: string) {
    this.draft.notes = value;
  }

  setHeritage(value: Heritage) {
    this.draft.heritage = value;
  }

  setBackground(value: Background) {
    this.draft.background = value;
    this.resetCharacterSkillProgress('BACKGROUND CHANGED');
  }

  setClass(value: CharacterClass) {
    this.draft.characterClass = value;
    this.draft.adventurerPartials = value === 'adventurer'
      ? ['partial_expert', 'partial_warrior']
      : [];
    this.resetFocusProgress('CLASS CHANGED');
  }

  setAttribute(attribute: AttributeKey, value: number) {
    this.clearAttributeSetTo14(false);
    this.draft.attributes[attribute] = clampScore(value);
    this.draft.attributeMethod = 'manual';
    this.arrayAssignments = {};
  }

  useStandardArray() {
    this.clearAttributeSetTo14(false);
    this.arrayAssignments = {};
    this.draft.attributeMethod = 'array';
  }

  assignArrayValue(attribute: AttributeKey, value: number) {
    if (!STANDARD_ARRAY.includes(value)) return;

    const alreadyAssignedTo = Object.entries(this.arrayAssignments).find(([key, assignedValue]) => {
      return key !== attribute && assignedValue === value;
    });
    if (alreadyAssignedTo) return;

    this.arrayAssignments = {
      ...this.arrayAssignments,
      [attribute]: value
    };
    this.draft.attributes[attribute] = value;
    this.draft.attributeMethod = 'array';
  }

  rollAttributes() {
    this.clearAttributeSetTo14(false);
    ALL_ATTRIBUTES.forEach((attribute) => {
      this.draft.attributes[attribute] = rollDie(6) + rollDie(6) + rollDie(6);
    });
    this.arrayAssignments = {};
    this.draft.attributeMethod = 'rolled';
  }

  clearAttributeSetTo14(restore = true) {
    if (!this.attributeSetTo14) return;
    const { attribute, previousValue } = this.attributeSetTo14;
    if (restore) {
      this.draft.attributes[attribute] = previousValue;
    }
    this.attributeSetTo14 = null;
  }

  setAttributeTo14(attribute: AttributeKey) {
    if (this.attributeSetTo14?.attribute === attribute) {
      this.clearAttributeSetTo14(true);
      return;
    }

    this.clearAttributeSetTo14(true);
    this.attributeSetTo14 = {
      attribute,
      previousValue: this.draft.attributes[attribute]
    };
    this.draft.attributes[attribute] = 14;
    this.draft.attributeMethod = 'manual';
    this.arrayAssignments = {};
  }

  swapAttributes(left: AttributeKey, right: AttributeKey) {
    if (left === right) return;

    const leftValue = this.draft.attributes[left];
    this.draft.attributes[left] = this.draft.attributes[right];
    this.draft.attributes[right] = leftValue;

    if (this.arrayAssignments[left] !== undefined || this.arrayAssignments[right] !== undefined) {
      this.arrayAssignments = {
        ...this.arrayAssignments,
        [left]: this.arrayAssignments[right],
        [right]: this.arrayAssignments[left]
      };
    }

    if (this.attributeSetTo14?.attribute === left) {
      this.attributeSetTo14 = { ...this.attributeSetTo14, attribute: right };
    } else if (this.attributeSetTo14?.attribute === right) {
      this.attributeSetTo14 = { ...this.attributeSetTo14, attribute: left };
    }
  }

  rollHp() {
    this.draft.hpRoll = rollDie(6);
  }

  setHpRoll(value: number) {
    this.draft.hpRoll = Math.max(1, Math.min(6, Math.round(value)));
  }

  useMaxHpRoll() {
    this.draft.hpRoll = 6;
  }

  rollCredits() {
    if (this.draft.creditRoll) return;

    const first = rollDie(6);
    const second = rollDie(6);
    this.draft.equipmentMode = 'rolled_credits';
    this.draft.creditRoll = [first, second];
    this.draft.startingCredits = (first + second) * 100;
    this.draft.customCreditRoll = [first, second];
    this.draft.customStartingCredits = this.draft.startingCredits;
    this.lastMessage = this.remainingStartingCredits < 0
      ? `STARTING CREDITS ${first}+${second} ROLLED - CART OVERSPENT`
      : `STARTING CREDITS ${first}+${second} ROLLED`;
  }

  setStartingCredits(value: number) {
    this.draft.equipmentMode = 'rolled_credits';
    this.draft.creditRoll = undefined;
    this.draft.startingCredits = Math.max(0, Math.round(value));
    this.draft.customCreditRoll = undefined;
    this.draft.customStartingCredits = this.draft.startingCredits;
    this.lastMessage = this.remainingStartingCredits < 0
      ? 'STARTING CREDITS UPDATED - CART OVERSPENT'
      : 'STARTING CREDITS UPDATED';
  }

  chooseEquipmentPackage(packageId: EquipmentPackageId | null) {
    this.cacheCustomLoadoutCredits();
    this.draft.equipmentMode = 'package';

    if (!packageId) {
      this.draft.selectedPackageId = null;
      this.draft.creditRoll = undefined;
      this.draft.startingCredits = 0;
      this.lastMessage = 'EQUIPMENT PACKAGE CLEARED';
      return;
    }

    const pack = ALL_EQUIPMENT_PACKAGES.find((candidate) => candidate.id === packageId);
    if (!pack) return;

    this.draft.selectedPackageId = packageId;
    this.draft.creditRoll = undefined;
    this.draft.startingCredits = pack.credits;
    this.lastMessage = `${pack.name.toUpperCase()} PACKAGE SELECTED`;
  }

  chooseRolledCredits() {
    if (this.draft.equipmentMode === 'rolled_credits') return;

    this.draft.equipmentMode = 'rolled_credits';
    this.draft.creditRoll = this.draft.customCreditRoll
      ? [...this.draft.customCreditRoll] as [number, number]
      : undefined;
    this.draft.startingCredits = this.draft.customStartingCredits ?? 0;
    this.lastMessage = this.remainingStartingCredits < 0
      ? 'BUY GEAR MODE SELECTED - CART OVERSPENT'
      : 'BUY GEAR MODE SELECTED';
  }

  addPurchasedItem(equipmentId: string, quantity: number) {
    if (this.draft.equipmentMode !== 'rolled_credits') return false;

    const item = getEquipmentById(equipmentId);
    if (!item || !isBuyableEquipment(item)) return false;

    const normalizedQuantity = normalizeQuantity(quantity);
    const cost = (item.cost ?? 0) * normalizedQuantity;
    if (this.remainingStartingCredits - cost < 0) {
      this.lastMessage = 'INSUFFICIENT STARTING CREDITS';
      return false;
    }

    const existing = this.draft.purchasedItems.find((entry) => entry.equipmentId === equipmentId);
    if (existing) {
      existing.quantity = normalizeQuantity(existing.quantity + normalizedQuantity);
    } else {
      this.draft.purchasedItems = [...this.draft.purchasedItems, { equipmentId, quantity: normalizedQuantity }];
    }

    this.lastMessage = `${item.name.toUpperCase()} ADDED TO CART`;
    return true;
  }

  updatePurchasedItemQuantity(equipmentId: string, quantity: number) {
    if (this.draft.equipmentMode !== 'rolled_credits') return;

    const item = getEquipmentById(equipmentId);
    const normalizedQuantity = normalizeQuantity(quantity);

    this.draft.purchasedItems = this.draft.purchasedItems.map((entry) => {
      return entry.equipmentId === equipmentId
        ? { ...entry, quantity: normalizedQuantity }
        : entry;
    });
    this.lastMessage = item
      ? `${item.name.toUpperCase()} QTY UPDATED`
      : 'CART QTY UPDATED';
  }

  removePurchasedItem(equipmentId: string) {
    if (this.draft.equipmentMode !== 'rolled_credits') return;

    const item = getEquipmentById(equipmentId);
    this.draft.purchasedItems = this.draft.purchasedItems.filter((entry) => entry.equipmentId !== equipmentId);
    this.lastMessage = item
      ? `${item.name.toUpperCase()} REMOVED FROM CART`
      : 'CART ITEM REMOVED';
  }

  resetCharacterSkillProgress(message = 'BACKGROUND SETUP RESET') {
    this.draft.skills = {};
    this.draft.backgroundProgress = {};
    this.draft.focusPicks = [];
    this.draft.focusProgress = createEmptyFocusProgress();
    this.draft.freeInterestSkill = undefined;
    this.queuedGrants = [];
    this.queuedFocusGrants = [];
    this.pendingChoiceKind = null;
    this.pendingFocusChoiceKind = null;
    this.lastMessage = message;
  }

  beginQuickSkills() {
    this.startBackgroundProgress('quick_skills');
    this.queuedGrants = this.backgroundDefinition.quickSkills.map((entry) => ({
      entry,
      source: 'quick'
    }));
    this.advanceQueuedGrants();
  }

  beginRollTables() {
    this.startBackgroundProgress('roll_tables');
    this.queuedGrants = [{ entry: this.backgroundDefinition.freeSkill, source: 'free' }];
    this.advanceQueuedGrants();
  }

  beginLearningPicks() {
    this.startBackgroundProgress('pick_learning');
    this.queuedGrants = [{ entry: this.backgroundDefinition.freeSkill, source: 'free' }];
    this.advanceQueuedGrants();
  }

  rollOn(table: BackgroundTableName) {
    if (this.draft.backgroundProgress.mode !== 'roll_tables' || this.rollCount >= 3 || this.queuedGrants.length > 0) {
      return;
    }

    const sides = table === 'growth' ? 6 : 8;
    const roll = rollDie(sides);
    const entry = this.backgroundDefinition[table][roll - 1];

    this.queuedGrants = [{ entry, source: 'roll', table, roll, tableIndex: roll - 1 }];
    this.advanceQueuedGrants();
  }

  pickLearning(index: number) {
    if (
      this.draft.backgroundProgress.mode !== 'pick_learning' ||
      this.learningPickCount >= 2 ||
      this.pickedLearningIndexes.has(index) ||
      this.queuedGrants.length > 0
    ) {
      return;
    }

    const entry = this.backgroundDefinition.learning[index];
    this.queuedGrants = [{ entry, source: 'learning_pick', table: 'learning', tableIndex: index }];
    this.advanceQueuedGrants();
  }

  confirmPendingChoice(choice: BackgroundResolvedChoice) {
    this.advanceQueuedGrants(choice);
  }

  cancelPendingChoice() {
    if (!this.currentQueuedGrant || !this.pendingChoiceKind) return;

    this.queuedGrants = [];
    this.pendingChoiceKind = null;
    this.draft.backgroundProgress = {
      ...this.draft.backgroundProgress,
      complete: false,
      updatedAt: new Date().toISOString()
    };
    this.lastMessage = 'BACKGROUND CHOICE CANCELLED';
  }

  getFocusPick(source: FocusPickSource) {
    return this.draft.focusPicks.find((pick) => pick.source === source) ?? null;
  }

  getFocusOptionsForSlot(slot: FocusSlot) {
    const currentPick = this.getFocusPick(slot.source);

    return ALL_FOCI
      .filter((focus) => {
        const definition = FOCI[focus];
        if (slot.filter !== 'any' && definition.category !== slot.filter) return false;
        const count = this.draft.focusPicks.filter((pick) => pick.focus === focus && pick.source !== slot.source).length;
        return count < 2 || currentPick?.focus === focus;
      })
      .map((focus) => ({
        label: focus.toUpperCase(),
        value: focus,
        description: FOCI[focus].description,
        class: FOCI[focus].category
      }));
  }

  getFocusSelection(source: FocusPickSource) {
    const pick = this.getFocusPick(source);
    if (!pick) return null;
    return {
      label: pick.focus.toUpperCase(),
      value: pick.focus,
      description: FOCI[pick.focus].description,
      class: FOCI[pick.focus].category
    };
  }

  setFocusPick(source: FocusPickSource, focus: Foci) {
    const slot = this.focusSlots.find((candidate) => candidate.source === source);
    if (!slot) return;
    if (slot.filter !== 'any' && FOCI[focus].category !== slot.filter) return;

    const nextBySource = new Map<FocusPickSource, Foci>();
    this.draft.focusPicks.forEach((pick) => nextBySource.set(pick.source, pick.focus));
    nextBySource.set(source, focus);

    const counts: Partial<Record<Foci, number>> = {};
    const nextPicks = this.focusSlots
      .map((candidate) => {
        const nextFocus = nextBySource.get(candidate.source);
        if (!nextFocus) return null;
        counts[nextFocus] = (counts[nextFocus] ?? 0) + 1;
        return {
          focus: nextFocus,
          level: Math.min(counts[nextFocus] ?? 1, 2) as FocusLevel,
          source: candidate.source
        };
      })
      .filter((pick): pick is CharacterFocusPick => Boolean(pick));

    this.draft.focusPicks = nextPicks;
    this.replayFocusProgress('FOCUS SELECTION UPDATED');
  }

  confirmPendingFocusChoice(choice: BackgroundResolvedChoice) {
    this.advanceQueuedFocusGrants(choice);
  }

  applyFreeInterestSkill(skill: Skill) {
    if (!this.isFocusProgressComplete) {
      this.lastMessage = 'RESOLVE FOCI BEFORE FREE SKILL';
      return false;
    }

    if (this.draft.freeInterestSkill === skill) {
      this.lastMessage = `${skill.toUpperCase()} INTEREST SKILL ALREADY APPLIED`;
      return false;
    }

    this.removeFreeInterestSkillGrant();

    if ((this.draft.skills[skill] ?? -1) >= 1) {
      this.lastMessage = 'FREE INTEREST SKILL MUST BE BELOW LEVEL-1';
      return false;
    }

    const before = this.draft.skills[skill] ?? -1;
    const after = skillAfterGrant(before);
    this.draft.skills[skill] = after;
    this.draft.freeInterestSkill = skill;
    this.draft.focusProgress = {
      ...this.draft.focusProgress,
      freeInterestSkill: skill
    };
    this.appendFocusProgressGrant({
      entry: { type: 'skill', value: skill },
      source: 'base',
      focus: this.draft.focusPicks[0]?.focus ?? ALL_FOCI[0],
      level: 1
    }, {
      target: skill,
      before,
      after
    }, skill, 'free_interest');
    this.lastMessage = `${skill.toUpperCase()} INTEREST SKILL APPLIED`;
    return true;
  }

  private generateQuickBackground() {
    this.beginQuickSkills();
    this.resolveRandomBackgroundChoices();
  }

  private resolveRandomBackgroundChoices() {
    let guard = 0;
    while (this.currentQueuedGrant && this.pendingChoiceKind && guard < 50) {
      const options = this.currentChoiceOptions as Array<{
        value: Skill | AttributeKey;
        kind: 'skill' | 'attribute';
      }>;
      const choice = randomItem(options);
      if (!choice) return;

      this.confirmPendingChoice(
        choice.kind === 'skill'
          ? { skill: choice.value as Skill }
          : { attribute: choice.value as AttributeKey }
      );
      guard += 1;
    }
  }

  private generateQuickFoci(picks: readonly QuickFocusPick[]) {
    const remainingPicks = [...picks];
    const assignedPicks = new Map<FocusPickSource, QuickFocusPick>();
    const orderedSlots = [
      ...this.focusSlots.filter((slot) => slot.filter !== 'any'),
      ...this.focusSlots.filter((slot) => slot.filter === 'any')
    ];

    orderedSlots.forEach((slot) => {
      const matchingIndex = remainingPicks.findIndex((pick) => {
        return slot.filter === 'any' || FOCI[pick.focus].category === slot.filter;
      });
      if (matchingIndex < 0) return;

      const [pick] = remainingPicks.splice(matchingIndex, 1);
      assignedPicks.set(slot.source, pick);
    });

    this.focusSlots.forEach((slot) => {
      const pick = assignedPicks.get(slot.source);
      if (!pick) return;

      this.setFocusPick(slot.source, pick.focus);
      this.resolveRandomFocusChoices(pick.skill);
    });

    this.resolveRandomFocusChoices();
  }

  private resolveRandomFocusChoices(preferredSkill?: Skill) {
    let guard = 0;
    while (this.currentQueuedFocusGrant && this.pendingFocusChoiceKind && guard < 50) {
      const preferredChoice = preferredSkill
        ? this.currentFocusChoiceOptions.find((option) => option.value === preferredSkill)
        : undefined;
      const choice = preferredChoice ?? randomItem(this.currentFocusChoiceOptions);
      if (!choice) return;

      this.confirmPendingFocusChoice({ skill: choice.value as Skill });
      guard += 1;
    }
  }

  private applyQuickBonusSkill() {
    const roll = rollDie(20);
    if (roll === 20) {
      const upgradeOptions = ALL_SKILLS.filter((skill) => this.draft.skills[skill] === 0);
      const upgradeSkill = upgradeOptions.length > 0
        ? randomItem(upgradeOptions)
        : randomItem(ALL_SKILLS.filter((skill) => (this.draft.skills[skill] ?? -1) < 1));
      if (upgradeSkill) {
        this.applyFreeInterestSkill(upgradeSkill);
      }
      return;
    }

    const rolledSkill = ALL_SKILLS[roll - 1];
    const skill = (this.draft.skills[rolledSkill] ?? -1) < 1
      ? rolledSkill
      : randomItem(ALL_SKILLS.filter((candidate) => (this.draft.skills[candidate] ?? -1) < 1));

    if (skill) {
      this.applyFreeInterestSkill(skill);
    }
  }

  private removeFreeInterestSkillGrant() {
    const existingGrant = this.draft.focusProgress.grants.find((grant) => grant.source === 'free_interest');
    if (!existingGrant) {
      this.draft.freeInterestSkill = undefined;
      this.draft.focusProgress = {
        ...this.draft.focusProgress,
        freeInterestSkill: undefined
      };
      return;
    }

    if (this.draft.skills[existingGrant.result.target] === existingGrant.result.after) {
      if (existingGrant.result.before < 0) {
        delete this.draft.skills[existingGrant.result.target];
      } else {
        this.draft.skills[existingGrant.result.target] = existingGrant.result.before;
      }
    }

    this.draft.freeInterestSkill = undefined;
    this.draft.focusProgress = {
      ...this.draft.focusProgress,
      grants: this.draft.focusProgress.grants.filter((grant) => grant.source !== 'free_interest'),
      freeInterestSkill: undefined,
      updatedAt: new Date().toISOString()
    };
  }

  buildArchive(): CharacterCreationArchive {
    const exportedAt = new Date().toISOString();
    const core = this.buildCoreRecord();
    const creation: CharacterCreationDetails = {
      schema: 'DEIMOS-CHARACTER',
      version: 1,
      generatedAt: exportedAt,
      hpRoll: this.draft.hpRoll,
      baseAttackBonus: this.baseAttackBonus,
      armorClass: this.armorClass,
      saves: this.saves,
      homeworld: this.draft.homeworld.trim(),
      employerAffiliation: this.draft.employerAffiliation.trim(),
      goal: this.draft.goal.trim(),
      notes: this.draft.notes.trim(),
      focusPicks: this.cloneFocusPicks(),
      focusProgress: this.cloneFocusProgress(),
      freeInterestSkill: this.draft.freeInterestSkill,
      adventurerPartials: [...this.draft.adventurerPartials],
      startingCredits: this.draft.startingCredits,
      attributeMethod: this.draft.attributeMethod,
      equipment: this.buildEquipmentChoice()
    };

    return {
      schema: 'DEIMOS-CHARACTER',
      version: 1,
      exportedAt,
      core,
      creation
    };
  }

  private resetFocusProgress(message: string) {
    this.rebuildSkillsFromBackground();
    this.draft.focusPicks = [];
    this.draft.focusProgress = createEmptyFocusProgress();
    this.draft.freeInterestSkill = undefined;
    this.queuedFocusGrants = [];
    this.pendingFocusChoiceKind = null;
    this.lastMessage = message;
  }

  private replayFocusProgress(message: string) {
    this.rebuildSkillsFromBackground();
    this.draft.freeInterestSkill = undefined;
    this.draft.focusProgress = {
      picks: this.cloneFocusPicks(),
      grants: [],
      complete: false,
      updatedAt: new Date().toISOString()
    };
    this.queuedFocusGrants = this.draft.focusPicks
      .filter((pick) => pick.level === 1)
      .flatMap((pick) => {
        const entry = FOCI[pick.focus].bonusSkill;
        return entry ? [{ entry, source: pick.source, focus: pick.focus, level: pick.level }] : [];
      });
    this.pendingFocusChoiceKind = null;
    this.lastMessage = message;
    this.advanceQueuedFocusGrants();
  }

  private rebuildSkillsFromBackground() {
    const skills: Partial<Record<Skill, number>> = {};
    (this.draft.backgroundProgress.choices ?? []).forEach((grant) => {
      if (grant.result.type !== 'skill') return;
      skills[grant.result.target as Skill] = grant.result.after;
    });
    this.draft.skills = skills;
  }

  private startBackgroundProgress(mode: BackgroundProgressMode) {
    this.draft.skills = {};
    this.draft.backgroundProgress = {
      mode,
      background: this.draft.background,
      baseline: {
        skills: {},
        attributes: cloneAttributes(this.draft.attributes)
      },
      choices: [],
      freeSkillApplied: false,
      complete: false,
      updatedAt: new Date().toISOString()
    };
    this.draft.focusPicks = [];
    this.draft.focusProgress = createEmptyFocusProgress();
    this.draft.freeInterestSkill = undefined;
    this.queuedGrants = [];
    this.queuedFocusGrants = [];
    this.pendingChoiceKind = null;
    this.pendingFocusChoiceKind = null;
  }

  private advanceQueuedGrants(choice?: BackgroundResolvedChoice) {
    if (!this.currentQueuedGrant) return;

    if (choice) {
      const applied = this.applyQueuedGrant(this.currentQueuedGrant, choice);
      if (!applied) return;
      this.queuedGrants = this.queuedGrants.slice(1);
      this.pendingChoiceKind = null;
    }

    while (this.currentQueuedGrant) {
      const applied = this.applyQueuedGrant(this.currentQueuedGrant);
      if (!applied) return;

      this.queuedGrants = this.queuedGrants.slice(1);
      this.pendingChoiceKind = null;
    }

    this.updateBackgroundCompletion();
  }

  private advanceQueuedFocusGrants(choice?: BackgroundResolvedChoice) {
    if (!this.currentQueuedFocusGrant) {
      this.updateFocusCompletion();
      return;
    }

    if (choice) {
      const applied = this.applyQueuedFocusGrant(this.currentQueuedFocusGrant, choice);
      if (!applied) return;
      this.queuedFocusGrants = this.queuedFocusGrants.slice(1);
      this.pendingFocusChoiceKind = null;
    }

    while (this.currentQueuedFocusGrant) {
      const applied = this.applyQueuedFocusGrant(this.currentQueuedFocusGrant);
      if (!applied) return;

      this.queuedFocusGrants = this.queuedFocusGrants.slice(1);
      this.pendingFocusChoiceKind = null;
    }

    this.updateFocusCompletion();
  }

  private applyQueuedGrant(grant: QueuedCreatorGrant, choice?: BackgroundResolvedChoice) {
    const entry = grant.entry;

    if (entry.type === 'stat') {
      const attribute = choice?.attribute;
      if (!attribute) {
        this.pendingChoiceKind = 'attribute';
        return false;
      }
      if (!getAttributeChoices(entry.category).includes(attribute)) return false;

      const before = this.draft.attributes[attribute];
      const after = clampScore(before + entry.bonus);
      this.draft.attributes[attribute] = after;
      this.appendProgressGrant(grant, { type: 'stat', target: attribute, before, after }, undefined, attribute);
      return true;
    }

    if (entry.type === 'special') {
      const skill = choice?.skill;
      if (!skill) {
        this.pendingChoiceKind = 'skill';
        return false;
      }
      if (!getSkillChoices(entry.value).includes(skill)) return false;
      return this.applySkillGrant(grant, skill);
    }

    const current = this.draft.skills[entry.value] ?? -1;
    if (current >= 1) {
      const redirectSkill = choice?.skill;
      if (!redirectSkill) {
        this.pendingChoiceKind = 'redirect';
        return false;
      }
      if ((this.draft.skills[redirectSkill] ?? -1) >= 1) return false;
      return this.applySkillGrant(grant, redirectSkill);
    }

    return this.applySkillGrant(grant, entry.value);
  }

  private applyQueuedFocusGrant(grant: QueuedFocusGrant, choice?: BackgroundResolvedChoice) {
    const entry = grant.entry;

    if (entry.type === 'special') {
      const skill = choice?.skill;
      if (!skill) {
        this.pendingFocusChoiceKind = 'skill';
        return false;
      }
      if (!getFocusSkillChoices(entry.value).includes(skill)) return false;
      return this.applyFocusSkillGrant(grant, skill);
    }

    const current = this.draft.skills[entry.value] ?? -1;
    if (current >= 1) {
      const redirectSkill = choice?.skill;
      if (!redirectSkill) {
        this.pendingFocusChoiceKind = 'redirect';
        return false;
      }
      if ((this.draft.skills[redirectSkill] ?? -1) >= 1) return false;
      return this.applyFocusSkillGrant(grant, redirectSkill);
    }

    return this.applyFocusSkillGrant(grant, entry.value);
  }

  private applySkillGrant(grant: QueuedCreatorGrant, skill: Skill) {
    const before = this.draft.skills[skill] ?? -1;
    if (before >= 1) {
      this.pendingChoiceKind = 'redirect';
      return false;
    }

    const after = skillAfterGrant(before);
    this.draft.skills[skill] = after;
    this.appendProgressGrant(grant, { type: 'skill', target: skill, before, after }, skill);
    return true;
  }

  private applyFocusSkillGrant(grant: QueuedFocusGrant, skill: Skill) {
    const before = this.draft.skills[skill] ?? -1;
    if (before >= 1) {
      this.pendingFocusChoiceKind = 'redirect';
      return false;
    }

    const after = skillAfterGrant(before);
    this.draft.skills[skill] = after;
    this.appendFocusProgressGrant(grant, { target: skill, before, after }, skill);
    return true;
  }

  private appendProgressGrant(
    grant: QueuedCreatorGrant,
    result: BackgroundProgressGrant['result'],
    resolvedSkill?: Skill,
    resolvedAttribute?: AttributeKey
  ) {
    const labelParts = [formatBackgroundEntry(grant.entry)];
    if (resolvedSkill && (grant.entry.type === 'special' || grant.entry.type === 'skill' && grant.entry.value !== resolvedSkill)) {
      labelParts.push(`-> ${resolvedSkill}`);
    }
    if (resolvedAttribute) labelParts.push(`-> ${resolvedAttribute.toUpperCase()}`);

    const nextGrant: BackgroundProgressGrant = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: grant.source,
      label: labelParts.join(' '),
      entry: grant.entry,
      resolvedSkill,
      resolvedAttribute,
      table: grant.table,
      roll: grant.roll,
      tableIndex: grant.tableIndex,
      result
    };

    this.draft.backgroundProgress = {
      ...this.draft.backgroundProgress,
      choices: [...(this.draft.backgroundProgress.choices ?? []), nextGrant],
      freeSkillApplied: this.draft.backgroundProgress.freeSkillApplied || grant.source === 'free',
      updatedAt: new Date().toISOString()
    };
    this.lastMessage = `${labelParts.join(' ')} APPLIED`;
  }

  private appendFocusProgressGrant(
    grant: QueuedFocusGrant,
    result: FocusProgressGrant['result'],
    resolvedSkill: Skill,
    overrideSource?: FocusProgressGrant['source']
  ) {
    const labelParts = [overrideSource === 'free_interest' ? 'FREE INTEREST' : `${grant.focus} ${formatFocusEntry(grant.entry)}`];
    if (grant.entry.type === 'special' || grant.entry.type === 'skill' && grant.entry.value !== resolvedSkill) {
      labelParts.push(`-> ${resolvedSkill}`);
    }

    const nextGrant: FocusProgressGrant = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: overrideSource ?? grant.source,
      focus: overrideSource === 'free_interest' ? undefined : grant.focus,
      level: overrideSource === 'free_interest' ? undefined : grant.level,
      label: labelParts.join(' '),
      entry: overrideSource === 'free_interest' ? undefined : grant.entry,
      resolvedSkill,
      result
    };

    this.draft.focusProgress = {
      ...this.draft.focusProgress,
      picks: this.cloneFocusPicks(),
      grants: [...this.draft.focusProgress.grants, nextGrant],
      updatedAt: new Date().toISOString()
    };
    this.lastMessage = `${labelParts.join(' ')} APPLIED`;
  }

  private updateBackgroundCompletion() {
    const mode = this.draft.backgroundProgress.mode;
    const complete =
      mode === 'quick_skills' ||
      (mode === 'roll_tables' && this.rollCount >= 3) ||
      (mode === 'pick_learning' && this.learningPickCount >= 2);

    this.draft.backgroundProgress = {
      ...this.draft.backgroundProgress,
      complete,
      updatedAt: new Date().toISOString()
    };
  }

  private updateFocusCompletion() {
    const complete = this.focusSlots.every((slot) => this.selectedFocusSources.has(slot.source));
    this.draft.focusProgress = {
      ...this.draft.focusProgress,
      picks: this.cloneFocusPicks(),
      complete,
      updatedAt: new Date().toISOString()
    };
  }

  private cloneFocusPicks() {
    return this.draft.focusPicks.map((pick) => ({ ...pick }));
  }

  private cloneFocusProgress(): FocusProgress {
    return {
      ...this.draft.focusProgress,
      picks: this.cloneFocusPicks(),
      grants: this.draft.focusProgress.grants.map((grant) => ({ ...grant }))
    };
  }

  private buildEquipmentChoice(): CreatorEquipmentChoice {
    return {
      mode: this.draft.equipmentMode,
      packageId: this.draft.equipmentMode === 'package'
        ? this.draft.selectedPackageId ?? undefined
        : undefined,
      creditRoll: this.draft.equipmentMode === 'rolled_credits' && this.draft.creditRoll
        ? [...this.draft.creditRoll] as [number, number]
        : undefined,
      startingCredits: this.draft.startingCredits,
      items: this.startingEquipmentItems.map((entry) => ({
        equipmentId: entry.equipmentId,
        quantity: normalizeQuantity(entry.quantity),
        packageId: entry.packageId
      })),
      purchasedItems: this.draft.equipmentMode === 'rolled_credits'
        ? this.draft.purchasedItems.map((entry) => ({
            equipmentId: entry.equipmentId,
            quantity: normalizeQuantity(entry.quantity)
          }))
        : []
    };
  }

  private cacheCustomLoadoutCredits() {
    if (this.draft.equipmentMode !== 'rolled_credits') return;

    this.draft.customCreditRoll = this.draft.creditRoll
      ? [...this.draft.creditRoll] as [number, number]
      : undefined;
    this.draft.customStartingCredits = this.draft.startingCredits;
  }

  private getWeaponAttributeModifier(weapon: EquipmentWeaponStats) {
    if (weapon.attribute === 'Str') return this.attributeModifiers.str;
    if (weapon.attribute === 'Dex') return this.attributeModifiers.dex;
    if (weapon.attribute === 'Str/Dex') return Math.max(this.attributeModifiers.str, this.attributeModifiers.dex);
    return 0;
  }

  private getWeaponSkillModifier(category: string) {
    if (category === 'ranged_weapon' || category === 'heavy_weapon') return this.draft.skills.Shoot ?? -1;
    if (category === 'melee_weapon') return this.draft.skills.Stab ?? -1;
    return 0;
  }

  private getWeaponHitBonus(weapon: EquipmentWeaponStats, category: string) {
    const energyBonus = category === 'ranged_weapon' &&
      (weapon.ammoType === 'type_a_cell' || weapon.ammoType === 'type_b_cell' || weapon.ammoType === 'integral')
        ? 1
        : 0;

    return this.baseAttackBonus +
      this.getWeaponSkillModifier(category) +
      this.getWeaponAttributeModifier(weapon) +
      energyBonus;
  }

  private buildCoreRecord(): CharacterRecord {
    return {
      id: sanitizeId(this.draft.name),
      name: this.draft.name.trim() || 'Unnamed Drifter',
      role: 'PLAYER',
      personal_credits: Math.max(0, this.remainingStartingCredits),
      attributes: cloneAttributes(this.draft.attributes),
      heritage: this.draft.heritage,
      background: this.draft.background,
      skills: { ...this.draft.skills },
      background_progress: {
        ...this.draft.backgroundProgress,
        choices: [...(this.draft.backgroundProgress.choices ?? [])]
      },
      advancement_progress: {
        generalSkillPoints: 0,
        nonCombatSkillPoints: 0,
        skillInvestments: {},
        attributeBoostCount: 0
      },
      character_class: this.draft.characterClass,
      foci: this.cloneFocusPicks(),
      level: 1,
      xp: 0,
      hp: this.maxHp,
      max_hp: this.maxHp,
      system_strain: 0,
      max_system_strain: this.draft.attributes.con,
      rads: 0,
      max_rads: 10,
      base_ac: this.armorClass,
      active_conditions: []
    };
  }
}

export const characterCreatorState = new CharacterCreatorStateManager();
