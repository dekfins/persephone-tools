import equipmentCatalog from '../../data/character/equipment.json';
import equipmentPackages from '../../data/character/equipmentPackages.json';
import conditionCatalog from '../../data/character/conditions.json';
import skillMetadata from '../../data/character/skills.json';
import type {
  AttributeCategory,
  AttributeKey,
  Background,
  BackgroundChoiceToken,
  CharacterConditionCatalog,
  CharacterConditionTemplate,
  CharacterFocusPick,
  EquipmentPackageCatalog,
  EquipmentPackageDefinition,
  EquipmentPackageId,
  EquipmentCatalog,
  EquipmentCatalogItem,
  EquipmentCategory,
  FocusSkillToken,
  Foci,
  Skill,
  SkillDefinitions
} from '../types';

export const HERITAGES = [
  { label: 'EARTHLING', value: 'earthling' as const },
  { label: 'VOIDBORN', value: 'voidborn' as const }
];

export const CHARACTER_CLASSES = [
  { label: 'EXPERT', value: 'expert' as const },
  { label: 'WARRIOR', value: 'warrior' as const },
  { label: 'ADVENTURER', value: 'adventurer' as const }
];

// Enforcing the array against the CharacterSkill union guarantees no typos
export const ALL_SKILLS: Skill[] = [
  'Administer', 'Connect', 'Exert', 'Fix', 'Heal', 'Know',
  'Lead', 'Notice', 'Perform', 'Pilot', 'Program', 'Punch',
  'Shoot', 'Sneak', 'Stab', 'Survive', 'Talk', 'Trade', 'Work'
];

export const SKILL_DEFINITIONS = skillMetadata as SkillDefinitions;

export const COMBAT_SKILLS: Skill[] = ['Punch', 'Shoot', 'Stab'];
export const NON_COMBAT_SKILLS: Skill[] = ALL_SKILLS.filter((skill) => !COMBAT_SKILLS.includes(skill));
export const PHYSICAL_ATTRIBUTES: AttributeKey[] = ['str', 'dex', 'con'];
export const MENTAL_ATTRIBUTES: AttributeKey[] = ['int', 'wis', 'cha'];
export const ALL_ATTRIBUTES: AttributeKey[] = [
  ...PHYSICAL_ATTRIBUTES,
  ...MENTAL_ATTRIBUTES
];

export const BACKGROUND_CHOICE_LABELS: Record<BackgroundChoiceToken, string> = {
  'Any Combat': 'ANY COMBAT',
  'Any Skill': 'ANY SKILL',
  'Shoot or Trade': 'SHOOT OR TRADE',
  'Stab or Shoot': 'STAB OR SHOOT'
};

export function isSkill(value: string): value is Skill {
  return (ALL_SKILLS as string[]).includes(value);
}

export function getSkillChoices(token: BackgroundChoiceToken): Skill[] {
  if (token === 'Any Combat') return COMBAT_SKILLS;
  if (token === 'Shoot or Trade') return ['Shoot', 'Trade'];
  if (token === 'Stab or Shoot') return ['Stab', 'Shoot'];
  return ALL_SKILLS;
}

export function getFocusSkillChoices(token: FocusSkillToken): Skill[] {
  if (token === 'Any Combat') return COMBAT_SKILLS;
  if (token === 'Punch or Stab') return ['Punch', 'Stab'];
  return NON_COMBAT_SKILLS;
}

export function formatFocusPicks(picks: CharacterFocusPick[], emptyLabel = 'NONE') {
  if (picks.length === 0) return emptyLabel;

  const highestLevels = new Map<Foci, number>();
  picks.forEach((pick) => {
    highestLevels.set(pick.focus, Math.max(highestLevels.get(pick.focus) ?? 0, pick.level));
  });

  return Array.from(highestLevels.entries())
    .map(([focus, level]) => `${focus} ${level}`)
    .join(' / ')
    .toUpperCase();
}

export function getAttributeChoices(category: AttributeCategory): AttributeKey[] {
  if (category === 'physical') return PHYSICAL_ATTRIBUTES;
  if (category === 'mental') return MENTAL_ATTRIBUTES;
  return ALL_ATTRIBUTES;
}

export const ALL_BACKGROUNDS: Background[] = [
  'Barbarian', 'Clergy', 'Courtesan', 'Criminal', 'Dilettante',
  'Entertainer', 'Merchant', 'Noble', 'Official', 'Peasant',
  'Physician', 'Pilot', 'Politician', 'Scholar', 'Soldier',
  'Spacer', 'Technician', 'Thug', 'Vagabond', 'Worker'
];

export const ALL_FOCI: Foci[] = [
  'Alert', 'Armsman', 'Assassin', 'Authority', 'Close Combatant',
  'Connected', 'Die Hard', 'Diplomat', 'Gunslinger', 'Hacker',
  'Healer', 'Henchkeeper', 'Ironhide', 'Savage Fray', 'Shocking Assault',
  'Sniper', 'Specialist', 'Star Captain', 'Starfarer', 'Tinker',
  'Unarmed Combatant', 'Unique Gift', 'Wanderer'
];

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  'armor',
  'ranged_weapon',
  'melee_weapon',
  'heavy_weapon',
  'ammo_power',
  'computing',
  'communications',
  'tools_medical',
  'field_equipment',
  'food_water',
  'trade_good',
  'pharmaceutical',
  'restricted_tech'
];

function validateConditionCatalog(catalog: CharacterConditionCatalog) {
  Object.entries(catalog).forEach(([key, condition]) => {
    if (key !== condition.id) {
      throw new Error(`Condition catalog key "${key}" does not match condition id "${condition.id}".`);
    }
  });
}

function validateEquipmentCatalog(catalog: EquipmentCatalog) {
  Object.entries(catalog).forEach(([key, item]) => {
    if (key !== item.id) {
      throw new Error(`Equipment catalog key "${key}" does not match item id "${item.id}".`);
    }
  });
}

function validateSkillDefinitions(definitions: SkillDefinitions) {
  ALL_SKILLS.forEach((skill) => {
    const definition = definitions[skill];
    if (!definition) {
      throw new Error(`Missing skill definition for "${skill}".`);
    }
    if (definition.name !== skill) {
      throw new Error(`Skill definition key "${skill}" does not match name "${definition.name}".`);
    }
    if (!ALL_ATTRIBUTES.includes(definition.defaultAttribute)) {
      throw new Error(`Skill definition "${skill}" has invalid default attribute "${definition.defaultAttribute}".`);
    }
  });
}

validateSkillDefinitions(SKILL_DEFINITIONS);

export const CHARACTER_CONDITIONS_BY_ID = conditionCatalog as CharacterConditionCatalog;
validateConditionCatalog(CHARACTER_CONDITIONS_BY_ID);
export const ALL_CHARACTER_CONDITIONS: CharacterConditionTemplate[] = Object.values(CHARACTER_CONDITIONS_BY_ID);

export const EQUIPMENT_BY_ID = equipmentCatalog as EquipmentCatalog;
validateEquipmentCatalog(EQUIPMENT_BY_ID);
export const EQUIPMENT_PACKAGES_BY_ID = equipmentPackages as EquipmentPackageCatalog;

export const ALL_EQUIPMENT: EquipmentCatalogItem[] = Object.values(EQUIPMENT_BY_ID);
export const ALL_SPAWNABLE_EQUIPMENT: EquipmentCatalogItem[] = ALL_EQUIPMENT.filter((item) => item.app.spawnable);
export const ALL_EQUIPMENT_PACKAGES: EquipmentPackageDefinition[] = Object.values(EQUIPMENT_PACKAGES_BY_ID);

function validateEquipmentPackages(packages: EquipmentPackageCatalog) {
  Object.entries(packages).forEach(([key, pack]) => {
    if (key !== pack.id) {
      throw new Error(`Equipment package key "${key}" does not match package id "${pack.id}".`);
    }

    pack.items.forEach((entry) => {
      if (!EQUIPMENT_BY_ID[entry.equipmentId]) {
        throw new Error(`Equipment package "${pack.id}" references missing equipment "${entry.equipmentId}".`);
      }

      if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
        throw new Error(`Equipment package "${pack.id}" has invalid quantity for "${entry.equipmentId}".`);
      }
    });
  });
}

validateEquipmentPackages(EQUIPMENT_PACKAGES_BY_ID);

export function getEquipmentById(id: string) {
  return EQUIPMENT_BY_ID[id] ?? null;
}

export function getEquipmentDisplayName(item: EquipmentCatalogItem | null, fallback = 'Unknown equipment') {
  return item?.sourceName || item?.name || fallback;
}

export function formatEquipmentQuantityName(item: EquipmentCatalogItem | null, quantity: number, fallback = 'Unknown equipment') {
  const name = getEquipmentDisplayName(item, fallback);
  return quantity > 1 ? `x${quantity} ${name}` : name;
}

export function getEquipmentPackageById(id: EquipmentPackageId) {
  return EQUIPMENT_PACKAGES_BY_ID[id] ?? null;
}

export function getEquipmentByCategory(category: EquipmentCategory) {
  return ALL_EQUIPMENT.filter((item) => item.category === category);
}

export function formatEquipmentCategory(category: EquipmentCategory) {
  return category
    .split('_')
    .map((word) => word.toUpperCase())
    .join(' ');
}

export function getEquipmentInventoryMass(item: EquipmentCatalogItem) {
  return typeof item.encumbrance === 'number' ? item.encumbrance : 0;
}

export function getEquipmentInventoryCategory(item: EquipmentCatalogItem) {
  if (item.legality === 'pretech' || item.tags.includes('pretech')) return 'Pretech';
  if (item.category === 'armor') return 'Armor';
  if (item.category === 'ranged_weapon' || item.category === 'melee_weapon' || item.category === 'heavy_weapon') return 'Weapon';
  if (item.tags.includes('consumable')) return 'Consumable';
  if (item.category === 'ammo_power') return 'Ammunition';
  if (item.category === 'computing') return 'Computing';
  if (item.category === 'communications') return 'Communications';
  if (item.category === 'tools_medical' || item.category === 'pharmaceutical') return 'Medical';
  if (item.category === 'field_equipment') return 'Field Equipment';
  if (item.category === 'food_water') return 'Food & Water';
  if (item.category === 'trade_good') return 'Trade Good';
  return 'Restricted Tech';
}

export function getEquipmentInventoryRarity(item: EquipmentCatalogItem) {
  if (item.legality === 'pretech' || item.tags.includes('pretech')) return 'legendary';
  if (item.availability === 'mission_reward' || item.availability === 'not_for_sale' || item.legality === 'military') return 'epic';
  if (
    item.availability === 'black_market' ||
    item.availability === 'faction_contact' ||
    item.legality === 'restricted' ||
    item.legality === 'contraband'
  ) {
    return 'rare';
  }
  if (item.availability === 'station_only' || item.availability === 'licensed_vendor' || item.legality === 'licensed') return 'uncommon';
  return 'common';
}
