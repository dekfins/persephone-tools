import npcData from '../../data/character/npcs.json';
import beastData from '../../data/character/beasts.json';
import { generateCharacterName, NAME_CULTURES } from '../character/nameGenerator';
import type {
  GeneratedNpcDraft,
  NameCulture,
  NameFirstType,
  NpcBeastBehaviorProfile,
  NpcBeastGeneratorData,
  NpcBeastGeneratorTables,
  NpcCombatPreset,
  NpcCombatProfile,
  NpcGeneratorData,
  NpcGeneratorTables,
  NpcProfile,
  NpcRollDie,
  NpcRollResult
} from '../types';

type RandomSource = () => number;
type SelectOption = { label: string; value: string };
type TableOption = NpcGeneratorTables[keyof NpcGeneratorTables][number];
type BeastTableOption = NpcBeastGeneratorTables[keyof NpcBeastGeneratorTables][number];
type ResolvedNpcTable = {
  result: string;
  roll: NpcRollResult;
};

export type HumanNpcBuildOptions = {
  culture?: NameCulture;
  firstNameType?: NameFirstType;
  name?: string;
  age?: string;
  background?: string;
  role?: string;
  biggestProblem?: string;
  obviousTrait?: string;
  greatestDesire?: string;
  motivation?: string;
  want?: string;
  power?: string;
  hook?: string;
  initialManner?: string;
  defaultDealOutcome?: string;
  combatPresetId?: string;
  gmNotes?: string;
};

export type BeastNpcBuildOptions = {
  name?: string;
  combatPresetId?: string;
  ecologicalRole?: NpcBeastBehaviorProfile['ecologicalRole'];
  basicAnimalFeatures?: string;
  bodyPlan?: string;
  limbNovelty?: string;
  skinNovelty?: string;
  mainWeapon?: string;
  size?: string;
  behaviorTrait?: string;
  harmfulDischarge?: string;
  poisonEffect?: string;
  poisonOnset?: string;
  poisonDuration?: string;
  swarm?: boolean;
  gmNotes?: string;
};

function validateNpcGeneratorData(data: NpcGeneratorData): NpcGeneratorData {
  if (!Array.isArray(data.combatPresets) || data.combatPresets.length === 0) {
    throw new Error('NPC generator data requires at least one combat preset.');
  }

  const presetIds = new Set<string>();
  data.combatPresets.forEach((preset) => {
    if (!preset.id || presetIds.has(preset.id)) throw new Error(`Invalid or duplicate NPC combat preset id "${preset.id}".`);
    presetIds.add(preset.id);
    if (!preset.label || !preset.sourceLabel) throw new Error(`NPC combat preset "${preset.id}" needs labels.`);
    ['hd', 'ac', 'attackBonus', 'morale', 'skillBonus', 'save'].forEach((field) => {
      if (!Number.isInteger(preset[field as keyof NpcCombatPreset])) {
        throw new Error(`NPC combat preset "${preset.id}" has invalid ${field}.`);
      }
    });
    if (!preset.damage || !preset.move) throw new Error(`NPC combat preset "${preset.id}" needs damage and move.`);
    if (preset.armorTag && !['primitive', 'combat', 'powered'].includes(preset.armorTag)) {
      throw new Error(`NPC combat preset "${preset.id}" has invalid armorTag.`);
    }
  });

  if (!presetIds.has(data.defaultCombatPresetId)) {
    throw new Error(`NPC default combat preset "${data.defaultCombatPresetId}" does not exist.`);
  }

  data.combatSelectionRules.forEach((rule) => {
    if (!presetIds.has(rule.presetId)) throw new Error(`NPC combat selection rule references missing preset "${rule.presetId}".`);
    if (!Array.isArray(rule.keywords) || rule.keywords.length === 0) {
      throw new Error(`NPC combat selection rule "${rule.presetId}" needs keywords.`);
    }
  });

  Object.entries(data.tableMetadata).forEach(([tableName, metadata]) => {
    const maxRoll = metadata.entries;
    const entries = data.tables[tableName as keyof NpcGeneratorTables];
    if (!Array.isArray(entries) || entries.length !== maxRoll) {
      throw new Error(`NPC table "${tableName}" must have ${maxRoll} entries.`);
    }
    if (!metadata.label || !metadata.die) throw new Error(`NPC table "${tableName}" needs metadata.`);

    const rolls = new Set<number>();
    entries.forEach((entry) => {
      if (!Number.isInteger(entry.roll) || entry.roll < 1 || entry.roll > maxRoll || rolls.has(entry.roll)) {
        throw new Error(`NPC table "${tableName}" has invalid roll "${entry.roll}".`);
      }
      rolls.add(entry.roll);
      if (!entry.label) throw new Error(`NPC table "${tableName}" roll "${entry.roll}" needs a label.`);
      entry.variants?.forEach((variant) => {
        if (!variant) throw new Error(`NPC table "${tableName}" roll "${entry.roll}" has an empty variant.`);
      });
    });
  });

  data.firstNameTypeOptions.forEach((option) => {
    if (!option.label || !['male', 'female', 'any'].includes(option.value)) {
      throw new Error('NPC first name type options must include valid labels and values.');
    }
  });

  return data;
}

function validateBeastGeneratorData(data: NpcBeastGeneratorData): NpcBeastGeneratorData {
  if (!Array.isArray(data.combatPresets) || data.combatPresets.length === 0) {
    throw new Error('Beast generator data requires at least one combat preset.');
  }

  const presetIds = new Set<string>();
  data.combatPresets.forEach((preset) => {
    if (!preset.id || presetIds.has(preset.id)) throw new Error(`Invalid or duplicate beast combat preset id "${preset.id}".`);
    presetIds.add(preset.id);
    if (!preset.label || !preset.sourceLabel) throw new Error(`Beast combat preset "${preset.id}" needs labels.`);
    ['hd', 'ac', 'attackBonus', 'morale', 'skillBonus', 'save'].forEach((field) => {
      if (!Number.isInteger(preset[field as keyof NpcCombatPreset])) {
        throw new Error(`Beast combat preset "${preset.id}" has invalid ${field}.`);
      }
    });
    if (preset.fixedHp !== undefined && (!Number.isInteger(preset.fixedHp) || preset.fixedHp < 1)) {
      throw new Error(`Beast combat preset "${preset.id}" has invalid fixedHp.`);
    }
    if (!preset.damage || !preset.move) throw new Error(`Beast combat preset "${preset.id}" needs damage and move.`);
  });

  if (!presetIds.has(data.defaultCombatPresetId)) {
    throw new Error(`Beast default combat preset "${data.defaultCombatPresetId}" does not exist.`);
  }

  if (!Array.isArray(data.namePrefixes) || data.namePrefixes.length === 0 || !Array.isArray(data.nameSuffixes) || data.nameSuffixes.length === 0) {
    throw new Error('Beast generator data requires name prefixes and suffixes.');
  }

  data.ecologicalRoles.forEach((role) => {
    if (!role.label || !['predator', 'prey', 'scavenger'].includes(role.value)) {
      throw new Error('Beast ecological roles require valid labels and values.');
    }
  });

  Object.entries(data.tableMetadata).forEach(([tableName, metadata]) => {
    const maxRoll = metadata.entries;
    const entries = data.tables[tableName as keyof NpcBeastGeneratorTables];
    if (!Array.isArray(entries) || entries.length !== maxRoll) {
      throw new Error(`Beast table "${tableName}" must have ${maxRoll} entries.`);
    }
    if (!metadata.label || !metadata.die) throw new Error(`Beast table "${tableName}" needs metadata.`);

    const rolls = new Set<number>();
    entries.forEach((entry) => {
      if (!Number.isInteger(entry.roll) || entry.roll < 1 || entry.roll > maxRoll || rolls.has(entry.roll)) {
        throw new Error(`Beast table "${tableName}" has invalid roll "${entry.roll}".`);
      }
      rolls.add(entry.roll);
      if (!entry.label) throw new Error(`Beast table "${tableName}" roll "${entry.roll}" needs a label.`);
      entry.variants?.forEach((variant) => {
        if (!variant) throw new Error(`Beast table "${tableName}" roll "${entry.roll}" has an empty variant.`);
      });
    });
  });

  return data;
}

const NPC_DATA = validateNpcGeneratorData(npcData as NpcGeneratorData);
const BEAST_DATA = validateBeastGeneratorData(beastData as NpcBeastGeneratorData);
const TABLES = NPC_DATA.tables;
const AGE_TABLE = TABLES.age;
const BACKGROUND_TABLE = TABLES.background;
const ROLE_TABLE = TABLES.role;
const BIGGEST_PROBLEM_TABLE = TABLES.biggestProblem;
const TRAIT_TABLE = TABLES.trait;
const DESIRE_TABLE = TABLES.desire;
const MOTIVATION_TABLE = TABLES.motivation;
const WANT_TABLE = TABLES.want;
const POWER_TABLE = TABLES.power;
const HOOK_TABLE = TABLES.hook;
const MANNER_TABLE = TABLES.manner;
const DEAL_TABLE = TABLES.deal;
const BEAST_TABLES = BEAST_DATA.tables;

export const HUMAN_NPC_COMBAT_PRESETS: NpcCombatPreset[] = NPC_DATA.combatPresets;
export const BEAST_NPC_COMBAT_PRESETS: NpcCombatPreset[] = BEAST_DATA.combatPresets;

export const NPC_COMBAT_OPTIONS: SelectOption[] = HUMAN_NPC_COMBAT_PRESETS.map((preset) => ({
  label: preset.label,
  value: preset.id
}));

export const BEAST_NPC_COMBAT_OPTIONS: SelectOption[] = BEAST_NPC_COMBAT_PRESETS.map((preset) => ({
  label: preset.label,
  value: preset.id
}));

export const NPC_CULTURE_OPTIONS: SelectOption[] = NAME_CULTURES.map((culture) => ({
  label: culture.toUpperCase(),
  value: culture
}));

export const NPC_FIRST_NAME_TYPE_OPTIONS: SelectOption[] = NPC_DATA.firstNameTypeOptions;

export const NPC_AGE_OPTIONS = flattenOptions(AGE_TABLE);
export const NPC_BACKGROUND_OPTIONS = flattenOptions(BACKGROUND_TABLE);
export const NPC_ROLE_OPTIONS = flattenOptions(ROLE_TABLE);
export const NPC_PROBLEM_OPTIONS = flattenOptions(BIGGEST_PROBLEM_TABLE);
export const NPC_TRAIT_OPTIONS = flattenOptions(TRAIT_TABLE);
export const NPC_DESIRE_OPTIONS = flattenOptions(DESIRE_TABLE);
export const NPC_MOTIVATION_OPTIONS = flattenOptions(MOTIVATION_TABLE);
export const NPC_WANT_OPTIONS = flattenOptions(WANT_TABLE);
export const NPC_POWER_OPTIONS = flattenOptions(POWER_TABLE);
export const NPC_HOOK_OPTIONS = flattenOptions(HOOK_TABLE);
export const NPC_MANNER_OPTIONS = flattenOptions(MANNER_TABLE);
export const NPC_DEAL_OPTIONS = flattenOptions(DEAL_TABLE);
export const BEAST_ECOLOGICAL_ROLE_OPTIONS: SelectOption[] = BEAST_DATA.ecologicalRoles;
export const BEAST_FEATURE_OPTIONS = flattenBeastOptions(BEAST_TABLES.basicAnimalFeatures);
export const BEAST_BODY_PLAN_OPTIONS = flattenBeastOptions(BEAST_TABLES.bodyPlan);
export const BEAST_LIMB_OPTIONS = flattenBeastOptions(BEAST_TABLES.limbNovelty);
export const BEAST_SKIN_OPTIONS = flattenBeastOptions(BEAST_TABLES.skinNovelty);
export const BEAST_WEAPON_OPTIONS = flattenBeastOptions(BEAST_TABLES.mainWeapon);
export const BEAST_SIZE_OPTIONS = flattenBeastOptions(BEAST_TABLES.size);
export const BEAST_HARMFUL_DISCHARGE_OPTIONS = flattenBeastOptions(BEAST_TABLES.harmfulDischarge);
export const BEAST_POISON_EFFECT_OPTIONS = flattenBeastOptions(BEAST_TABLES.poisonEffect);
export const BEAST_POISON_ONSET_OPTIONS = flattenBeastOptions(BEAST_TABLES.poisonOnset);
export const BEAST_POISON_DURATION_OPTIONS = flattenBeastOptions(BEAST_TABLES.poisonDuration);

export function beastBehaviorOptions(role: NpcBeastBehaviorProfile['ecologicalRole']): SelectOption[] {
  return flattenBeastOptions(BEAST_TABLES[role]);
}

function flattenOptions(table: TableOption[]): SelectOption[] {
  return table.flatMap((entry) => entry.rollTwice ? [] : (entry.variants ?? [entry.label]).map((variant) => ({
    label: variant,
    value: variant
  })));
}

function flattenBeastOptions(table: BeastTableOption[]): SelectOption[] {
  return table.flatMap((entry) => entry.rollTwice ? [] : (entry.variants ?? [entry.label]).map((variant) => ({
    label: variant,
    value: variant
  })));
}

function rollDie(sides: number, random: RandomSource) {
  return Math.floor(random() * sides) + 1;
}

function randomItem<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)];
}

function resolveTable(
  table: TableOption[] | BeastTableOption[],
  die: NpcRollDie,
  tableName: string,
  random: RandomSource,
  rollOverride?: number,
  depth = 0
): ResolvedNpcTable {
  const sides = Number(die.slice(1));
  const roll = rollOverride ?? rollDie(sides, random);
  const entry = table.find((candidate) => candidate.roll === roll) ?? table[0];
  const result: string = entry.rollTwice && depth < 4
    ? resolveRollTwice(table, die, tableName, random, depth + 1)
    : randomItem(entry.variants ?? [entry.label], random);
  const rollResult: NpcRollResult = {
    die,
    roll,
    table: tableName,
    result
  };
  return { result, roll: rollResult };
}

function resolveRollTwice(
  table: TableOption[] | BeastTableOption[],
  die: NpcRollDie,
  tableName: string,
  random: RandomSource,
  depth: number
): string {
  const concreteEntries = table.filter((entry) => !entry.rollTwice);
  const first: string = resolveTable(concreteEntries, die, tableName, random, undefined, depth).result;
  const second: string = resolveTable(concreteEntries, die, tableName, random, undefined, depth).result;
  return first === second ? first : `${first} / ${second}`;
}

function resolveTableKey(tableKey: keyof NpcGeneratorTables, random: RandomSource) {
  const metadata = NPC_DATA.tableMetadata[tableKey];
  return resolveTable(NPC_DATA.tables[tableKey], metadata.die, metadata.label, random);
}

function resolveBeastTableKey(tableKey: keyof NpcBeastGeneratorTables, random: RandomSource) {
  const metadata = BEAST_DATA.tableMetadata[tableKey];
  return resolveTable(BEAST_DATA.tables[tableKey], metadata.die, metadata.label, random);
}

function rollPresetHp(preset: NpcCombatPreset, random: RandomSource, swarm = false): NpcCombatProfile {
  const hd = swarm ? preset.hd * 4 : preset.hd;
  const hpRolls = preset.fixedHp !== undefined && !swarm
    ? [preset.fixedHp]
    : Array.from({ length: hd }, () => rollDie(8, random));
  return {
    presetId: swarm ? `${preset.id}_swarm` : preset.id,
    label: swarm ? `${preset.label} Swarm` : preset.label,
    sourceLabel: preset.sourceLabel,
    hd,
    hp: hpRolls.reduce((total, roll) => total + roll, 0),
    hpRolls,
    ac: preset.ac,
    armorTag: preset.armorTag,
    attackBonus: preset.attackBonus,
    attacks: preset.attacks ?? 1,
    damage: preset.damage,
    move: preset.move,
    morale: preset.morale,
    skillBonus: preset.skillBonus,
    save: preset.save
  };
}

function defaultCombatPresetId(role: string, background: string) {
  const normalized = `${role} ${background}`.toLowerCase();
  return NPC_DATA.combatSelectionRules.find((rule) => (
    rule.keywords.some((keyword) => normalized.includes(keyword))
  ))?.presetId ?? NPC_DATA.defaultCombatPresetId;
}

function presetById(id: string | undefined, role: string, background: string) {
  const fallbackId = defaultCombatPresetId(role, background);
  return HUMAN_NPC_COMBAT_PRESETS.find((preset) => preset.id === id) ??
    HUMAN_NPC_COMBAT_PRESETS.find((preset) => preset.id === fallbackId) ??
    HUMAN_NPC_COMBAT_PRESETS[0];
}

function beastPresetById(id: string | undefined) {
  return BEAST_NPC_COMBAT_PRESETS.find((preset) => preset.id === id) ??
    BEAST_NPC_COMBAT_PRESETS.find((preset) => preset.id === BEAST_DATA.defaultCombatPresetId) ??
    BEAST_NPC_COMBAT_PRESETS[0];
}

function sanitizeNpcId(name: string, random: RandomSource) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'npc';
  return `npc-${slug}-${Date.now().toString(36)}-${rollDie(9999, random).toString().padStart(4, '0')}`;
}

function ensureOption(value: string | undefined, table: TableOption[], random: RandomSource) {
  return value?.trim() || randomItem(flattenOptions(table), random).value;
}

function ensureBeastOption(value: string | undefined, table: BeastTableOption[], random: RandomSource) {
  return value?.trim() || randomItem(flattenBeastOptions(table), random).value;
}

function randomBeastName(random: RandomSource) {
  const prefix = randomItem(BEAST_DATA.namePrefixes, random);
  const suffix = randomItem(BEAST_DATA.nameSuffixes, random);
  return `${prefix}-${suffix}`;
}

function emptyHumanPersonality(): NpcProfile['personality'] {
  return {
    biggestProblem: '',
    obviousTrait: '',
    greatestDesire: '',
    motivation: '',
    want: '',
    power: '',
    hook: '',
    initialManner: '',
    defaultDealOutcome: ''
  };
}

export function quickRollHumanNpc(random: RandomSource = Math.random): GeneratedNpcDraft {
  const culture = randomItem(NAME_CULTURES, random);
  const name = generateCharacterName({ culture, firstNameType: 'any' }, random);
  const rolls: NpcRollResult[] = [];
  const age = resolveTableKey('age', random);
  const background = resolveTableKey('background', random);
  const role = resolveTableKey('role', random);
  const biggestProblem = resolveTableKey('biggestProblem', random);
  const greatestDesire = resolveTableKey('desire', random);
  const obviousTrait = resolveTableKey('trait', random);
  const motivation = resolveTableKey('motivation', random);
  const want = resolveTableKey('want', random);
  const power = resolveTableKey('power', random);
  const hook = resolveTableKey('hook', random);
  const initialManner = resolveTableKey('manner', random);
  const defaultDealOutcome = resolveTableKey('deal', random);

  rolls.push(
    age.roll,
    background.roll,
    role.roll,
    biggestProblem.roll,
    greatestDesire.roll,
    obviousTrait.roll,
    motivation.roll,
    want.roll,
    power.roll,
    hook.roll,
    initialManner.roll,
    defaultDealOutcome.roll
  );

  const combatPreset = presetById(undefined, role.result, background.result);
  const characterId = sanitizeNpcId(name.fullName, random);

  return {
    characterId,
    profile: {
      schema: 'PERSEPHONE-NPC',
      version: 1,
      kind: 'human',
      characterId,
      identity: {
        name: name.fullName,
        culture,
        firstNameType: name.firstNameType,
        age: age.result,
        background: background.result,
        role: role.result
      },
      personality: {
        biggestProblem: biggestProblem.result,
        obviousTrait: obviousTrait.result,
        greatestDesire: greatestDesire.result,
        motivation: motivation.result,
        want: want.result,
        power: power.result,
        hook: hook.result,
        initialManner: initialManner.result,
        defaultDealOutcome: defaultDealOutcome.result
      },
      combat: rollPresetHp(combatPreset, random),
      rolls,
      generatedAt: new Date().toISOString(),
      gmNotes: ''
    }
  };
}

export function buildHumanNpcFromOptions(options: HumanNpcBuildOptions = {}, random: RandomSource = Math.random): GeneratedNpcDraft {
  const culture = options.culture ?? NAME_CULTURES[0];
  const generatedName = generateCharacterName({ culture, firstNameType: options.firstNameType ?? 'any' }, random);
  const name = options.name?.trim() || generatedName.fullName;
  const age = ensureOption(options.age, AGE_TABLE, random);
  const background = ensureOption(options.background, BACKGROUND_TABLE, random);
  const role = ensureOption(options.role, ROLE_TABLE, random);
  const characterId = sanitizeNpcId(name, random);
  const combatPreset = presetById(options.combatPresetId, role, background);

  return {
    characterId,
    profile: {
      schema: 'PERSEPHONE-NPC',
      version: 1,
      kind: 'human',
      characterId,
      identity: {
        name,
        culture,
        firstNameType: options.firstNameType ?? 'any',
        age,
        background,
        role
      },
      personality: {
        biggestProblem: ensureOption(options.biggestProblem, BIGGEST_PROBLEM_TABLE, random),
        obviousTrait: ensureOption(options.obviousTrait, TRAIT_TABLE, random),
        greatestDesire: ensureOption(options.greatestDesire, DESIRE_TABLE, random),
        motivation: ensureOption(options.motivation, MOTIVATION_TABLE, random),
        want: ensureOption(options.want, WANT_TABLE, random),
        power: ensureOption(options.power, POWER_TABLE, random),
        hook: ensureOption(options.hook, HOOK_TABLE, random),
        initialManner: ensureOption(options.initialManner, MANNER_TABLE, random),
        defaultDealOutcome: ensureOption(options.defaultDealOutcome, DEAL_TABLE, random)
      },
      combat: rollPresetHp(combatPreset, random),
      rolls: [],
      generatedAt: new Date().toISOString(),
      gmNotes: options.gmNotes?.trim() ?? ''
    }
  };
}

export function quickRollBeastNpc(random: RandomSource = Math.random): GeneratedNpcDraft {
  const name = randomBeastName(random);
  const combatPreset = beastPresetById(undefined);
  const ecologicalRole = randomItem(BEAST_DATA.ecologicalRoles, random).value;
  const rolls: NpcRollResult[] = [];
  const basicAnimalFeatures = resolveBeastTableKey('basicAnimalFeatures', random);
  const bodyPlan = resolveBeastTableKey('bodyPlan', random);
  const limbNovelty = resolveBeastTableKey('limbNovelty', random);
  const skinNovelty = resolveBeastTableKey('skinNovelty', random);
  const mainWeapon = resolveBeastTableKey('mainWeapon', random);
  const size = resolveBeastTableKey('size', random);
  const behaviorTrait = resolveBeastTableKey(ecologicalRole, random);
  const harmfulDischarge = resolveBeastTableKey('harmfulDischarge', random);
  const poisonEffect = resolveBeastTableKey('poisonEffect', random);
  const poisonOnset = resolveBeastTableKey('poisonOnset', random);
  const poisonDuration = resolveBeastTableKey('poisonDuration', random);
  const swarm = random() < 0.2;
  const characterId = sanitizeNpcId(name, random);

  rolls.push(
    basicAnimalFeatures.roll,
    bodyPlan.roll,
    limbNovelty.roll,
    skinNovelty.roll,
    mainWeapon.roll,
    size.roll,
    behaviorTrait.roll,
    harmfulDischarge.roll,
    poisonEffect.roll,
    poisonOnset.roll,
    poisonDuration.roll
  );

  return {
    characterId,
    profile: {
      schema: 'PERSEPHONE-NPC',
      version: 1,
      kind: 'beast',
      characterId,
      identity: {
        name,
        culture: 'beast',
        firstNameType: 'any',
        age: size.result,
        background: basicAnimalFeatures.result,
        role: ecologicalRole
      },
      personality: {
        ...emptyHumanPersonality(),
        obviousTrait: behaviorTrait.result,
        hook: `${bodyPlan.result}; ${skinNovelty.result}`,
        initialManner: behaviorTrait.result,
        defaultDealOutcome: 'Beast behavior, not social negotiation'
      },
      morphology: {
        basicAnimalFeatures: basicAnimalFeatures.result,
        bodyPlan: bodyPlan.result,
        limbNovelty: limbNovelty.result,
        skinNovelty: skinNovelty.result,
        mainWeapon: mainWeapon.result,
        size: size.result
      },
      behavior: {
        ecologicalRole,
        trait: behaviorTrait.result,
        swarm
      },
      hazards: {
        harmfulDischarge: harmfulDischarge.result,
        poisonEffect: poisonEffect.result,
        poisonOnset: poisonOnset.result,
        poisonDuration: poisonDuration.result
      },
      combat: rollPresetHp(combatPreset, random, swarm),
      rolls,
      generatedAt: new Date().toISOString(),
      gmNotes: ''
    }
  };
}

export function buildBeastNpcFromOptions(options: BeastNpcBuildOptions = {}, random: RandomSource = Math.random): GeneratedNpcDraft {
  const name = options.name?.trim() || randomBeastName(random);
  const ecologicalRole = options.ecologicalRole ?? 'predator';
  const combatPreset = beastPresetById(options.combatPresetId);
  const characterId = sanitizeNpcId(name, random);
  const basicAnimalFeatures = ensureBeastOption(options.basicAnimalFeatures, BEAST_TABLES.basicAnimalFeatures, random);
  const bodyPlan = ensureBeastOption(options.bodyPlan, BEAST_TABLES.bodyPlan, random);
  const limbNovelty = ensureBeastOption(options.limbNovelty, BEAST_TABLES.limbNovelty, random);
  const skinNovelty = ensureBeastOption(options.skinNovelty, BEAST_TABLES.skinNovelty, random);
  const mainWeapon = ensureBeastOption(options.mainWeapon, BEAST_TABLES.mainWeapon, random);
  const size = ensureBeastOption(options.size, BEAST_TABLES.size, random);
  const behaviorTrait = ensureBeastOption(options.behaviorTrait, BEAST_TABLES[ecologicalRole], random);
  const harmfulDischarge = ensureBeastOption(options.harmfulDischarge, BEAST_TABLES.harmfulDischarge, random);
  const poisonEffect = ensureBeastOption(options.poisonEffect, BEAST_TABLES.poisonEffect, random);
  const poisonOnset = ensureBeastOption(options.poisonOnset, BEAST_TABLES.poisonOnset, random);
  const poisonDuration = ensureBeastOption(options.poisonDuration, BEAST_TABLES.poisonDuration, random);

  return {
    characterId,
    profile: {
      schema: 'PERSEPHONE-NPC',
      version: 1,
      kind: 'beast',
      characterId,
      identity: {
        name,
        culture: 'beast',
        firstNameType: 'any',
        age: size,
        background: basicAnimalFeatures,
        role: ecologicalRole
      },
      personality: {
        ...emptyHumanPersonality(),
        obviousTrait: behaviorTrait,
        hook: `${bodyPlan}; ${skinNovelty}`,
        initialManner: behaviorTrait,
        defaultDealOutcome: 'Beast behavior, not social negotiation'
      },
      morphology: {
        basicAnimalFeatures,
        bodyPlan,
        limbNovelty,
        skinNovelty,
        mainWeapon,
        size
      },
      behavior: {
        ecologicalRole,
        trait: behaviorTrait,
        swarm: options.swarm ?? false
      },
      hazards: {
        harmfulDischarge,
        poisonEffect,
        poisonOnset,
        poisonDuration
      },
      combat: rollPresetHp(combatPreset, random, options.swarm ?? false),
      rolls: [],
      generatedAt: new Date().toISOString(),
      gmNotes: options.gmNotes?.trim() ?? ''
    }
  };
}

export function cloneNpcProfile(profile: NpcProfile): NpcProfile {
  return {
    ...profile,
    morphology: profile.morphology ? { ...profile.morphology } : undefined,
    behavior: profile.behavior ? { ...profile.behavior } : undefined,
    hazards: profile.hazards ? { ...profile.hazards } : undefined,
    identity: { ...profile.identity },
    personality: { ...profile.personality },
    combat: {
      ...profile.combat,
      hpRolls: [...profile.combat.hpRolls]
    },
    rolls: profile.rolls.map((roll) => ({ ...roll }))
  };
}
