import {
  ALL_BACKGROUNDS,
  ALL_EQUIPMENT_PACKAGES,
  ALL_FOCI,
  ALL_SKILLS,
  CHARACTER_CLASSES,
  getEquipmentById,
  HERITAGES
} from './characterConstants';
import type {
  AdventurerPartial,
  AttributeKey,
  CharacterCreationArchive,
  CharacterFocusPick,
  CharacterRecord,
  CreatorEquipmentChoice,
  EquipmentPackageId,
  Foci,
  Skill
} from './types';

export const CHARACTER_FILE_HEADER = 'DEIMOS-CHARACTER-V1|';
const FILE_EXTENSION = 'deimos-character';

const ATTRIBUTE_KEYS: AttributeKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ADVENTURER_PARTIALS: AdventurerPartial[] = ['partial_expert', 'partial_warrior'];
const FOCUS_SOURCES = ['base', 'expert', 'warrior'];
const EQUIPMENT_PACKAGE_IDS = ALL_EQUIPMENT_PACKAGES.map((pack) => pack.id);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSkill(value: unknown): value is Skill {
  return typeof value === 'string' && (ALL_SKILLS as string[]).includes(value);
}

function isFocus(value: unknown): value is Foci {
  return typeof value === 'string' && (ALL_FOCI as string[]).includes(value);
}

function normalizeFocusPicks(value: unknown): CharacterFocusPick[] | null {
  if (isFocus(value)) {
    return [{ focus: value, level: 1, source: 'base' }];
  }

  if (!Array.isArray(value)) return null;

  const picks = value.map((pick) => {
    if (!isObject(pick)) return null;
    if (!isFocus(pick.focus)) return null;
    if (pick.level !== 1 && pick.level !== 2) return null;
    if (typeof pick.source !== 'string' || !FOCUS_SOURCES.includes(pick.source)) return null;
    return {
      focus: pick.focus,
      level: pick.level,
      source: pick.source
    } as CharacterFocusPick;
  });

  if (picks.some((pick) => pick === null)) return null;
  return picks as CharacterFocusPick[];
}

function hasValidAttributes(value: unknown) {
  if (!isObject(value)) return false;
  return ATTRIBUTE_KEYS.every((key) => {
    const score = value[key];
    return typeof score === 'number' && score >= 3 && score <= 18;
  });
}

function hasValidSkills(value: unknown) {
  if (!isObject(value)) return false;

  return Object.entries(value).every(([skill, level]) => {
    return isSkill(skill) && typeof level === 'number' && level >= 0 && level <= 4;
  });
}

function hasValidCharacterCore(value: unknown): value is CharacterRecord {
  if (!isObject(value)) return false;

  const heritageValues = HERITAGES.map((option) => option.value);
  const classValues = CHARACTER_CLASSES.map((option) => option.value);

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.role === 'PLAYER' || value.role === 'GM') &&
    typeof value.personal_credits === 'number' &&
    hasValidAttributes(value.attributes) &&
    heritageValues.includes(value.heritage as never) &&
    (ALL_BACKGROUNDS as string[]).includes(value.background as string) &&
    hasValidSkills(value.skills) &&
    isObject(value.background_progress) &&
    classValues.includes(value.character_class as never) &&
    normalizeFocusPicks(value.foci) !== null &&
    typeof value.level === 'number' &&
    typeof value.xp === 'number' &&
    typeof value.hp === 'number' &&
    typeof value.max_hp === 'number' &&
    typeof value.system_strain === 'number' &&
    typeof value.max_system_strain === 'number' &&
    typeof value.rads === 'number' &&
    typeof value.max_rads === 'number' &&
    typeof value.base_ac === 'number'
  );
}

function isEquipmentPackageId(value: unknown): value is EquipmentPackageId {
  return typeof value === 'string' && (EQUIPMENT_PACKAGE_IDS as string[]).includes(value);
}

function hasValidEquipmentChoice(value: unknown): value is CreatorEquipmentChoice {
  if (!isObject(value)) return false;
  if (value.mode !== 'package' && value.mode !== 'rolled_credits') return false;
  if (typeof value.startingCredits !== 'number' || value.startingCredits < 0) return false;

  if (value.mode === 'package' && !isEquipmentPackageId(value.packageId)) return false;

  if (value.creditRoll !== undefined) {
    if (!Array.isArray(value.creditRoll) || value.creditRoll.length !== 2) return false;
    if (!value.creditRoll.every((roll) => Number.isInteger(roll) && roll >= 1 && roll <= 6)) return false;
  }

  if (!Array.isArray(value.items)) return false;

  const validStartingItems = value.items.every((entry) => {
    if (!isObject(entry)) return false;
    if (typeof entry.equipmentId !== 'string' || !getEquipmentById(entry.equipmentId)) return false;
    const quantity = entry.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) return false;
    if (entry.displayName !== undefined && typeof entry.displayName !== 'string') return false;
    if (entry.packageId !== undefined && !isEquipmentPackageId(entry.packageId)) return false;
    return true;
  });

  if (!validStartingItems) return false;
  if (!Array.isArray(value.purchasedItems)) return false;

  return value.purchasedItems.every((entry) => {
    if (!isObject(entry)) return false;
    if (typeof entry.equipmentId !== 'string' || !getEquipmentById(entry.equipmentId)) return false;
    const quantity = entry.quantity;
    return typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= 1;
  });
}

function hasValidCreationDetails(value: unknown) {
  if (!isObject(value)) return false;
  if (value.schema !== 'DEIMOS-CHARACTER' || value.version !== 1) return false;
  if (typeof value.generatedAt !== 'string') return false;
  if (typeof value.hpRoll !== 'number') return false;
  if (typeof value.baseAttackBonus !== 'number') return false;
  if (typeof value.armorClass !== 'number') return false;
  if (!isObject(value.saves)) return false;
  if (
    typeof value.saves.physical !== 'number' ||
    typeof value.saves.evasion !== 'number' ||
    typeof value.saves.mental !== 'number'
  ) return false;
  if (typeof value.homeworld !== 'string') return false;
  if (typeof value.employerAffiliation !== 'string') return false;
  if (typeof value.goal !== 'string') return false;
  if (typeof value.notes !== 'string') return false;
  if (normalizeFocusPicks(value.focusPicks ?? value.focus) === null) return false;
  if (value.focusProgress !== undefined && !isObject(value.focusProgress)) return false;
  if (value.freeInterestSkill !== undefined && !isSkill(value.freeInterestSkill)) return false;
  if (!Array.isArray(value.adventurerPartials)) return false;
  if (
    !value.adventurerPartials.every((partial) => {
      return ADVENTURER_PARTIALS.includes(partial as AdventurerPartial);
    })
  ) return false;
  if (typeof value.startingCredits !== 'number') return false;
  if (value.attributeMethod !== 'manual' && value.attributeMethod !== 'array' && value.attributeMethod !== 'rolled') return false;
  return hasValidEquipmentChoice(value.equipment);
}

function normalizeArchivePayload(value: unknown) {
  if (!isObject(value)) return value;
  if (!isObject(value.core) || !isObject(value.creation)) return value;

  const conScore = isObject(value.core.attributes) && typeof value.core.attributes.con === 'number'
    ? value.core.attributes.con
    : 10;

  value.core.system_strain = typeof value.core.system_strain === 'number'
    ? value.core.system_strain
    : 0;
  value.core.max_system_strain = typeof value.core.max_system_strain === 'number'
    ? value.core.max_system_strain
    : conScore;
  value.core.xp = typeof value.core.xp === 'number'
    ? value.core.xp
    : 0;

  const coreFocusPicks = normalizeFocusPicks(value.core.foci);
  const creationFocusPicks = normalizeFocusPicks(value.creation.focusPicks ?? value.creation.focus);
  if (!coreFocusPicks || !creationFocusPicks) return value;

  value.core.foci = coreFocusPicks;
  value.creation.focusPicks = creationFocusPicks;
  value.creation.focusProgress = isObject(value.creation.focusProgress)
    ? value.creation.focusProgress
    : {
        picks: creationFocusPicks,
        grants: [],
        complete: true
      };
  value.creation.homeworld = typeof value.creation.homeworld === 'string'
    ? value.creation.homeworld
    : '';
  value.creation.employerAffiliation = typeof value.creation.employerAffiliation === 'string'
    ? value.creation.employerAffiliation
    : '';
  value.creation.notes = typeof value.creation.notes === 'string'
    ? value.creation.notes
    : '';

  if (isObject(value.creation.equipment) && value.creation.equipment.purchasedItems === undefined) {
    value.creation.equipment.purchasedItems = [];
  }

  value.creation.equipment = hasValidEquipmentChoice(value.creation.equipment)
    ? value.creation.equipment
    : {
        mode: 'rolled_credits',
        startingCredits: typeof value.creation.startingCredits === 'number' ? value.creation.startingCredits : 0,
        items: [],
        purchasedItems: []
      };

  return value;
}

export function isCharacterCreationArchive(value: unknown): value is CharacterCreationArchive {
  if (!isObject(value)) return false;

  return (
    value.schema === 'DEIMOS-CHARACTER' &&
    value.version === 1 &&
    typeof value.exportedAt === 'string' &&
    hasValidCharacterCore(value.core) &&
    hasValidCreationDetails(value.creation)
  );
}

function encodeArchive(archive: CharacterCreationArchive) {
  const jsonStr = JSON.stringify(archive);
  return btoa(encodeURIComponent(jsonStr));
}

function decodeArchive(content: string) {
  if (!content.startsWith(CHARACTER_FILE_HEADER)) {
    throw new Error('Invalid DEIMOS character archive header.');
  }

  const encodedData = content.substring(CHARACTER_FILE_HEADER.length);
  const payload = normalizeArchivePayload(JSON.parse(decodeURIComponent(atob(encodedData))));

  if (!isCharacterCreationArchive(payload)) {
    throw new Error('Invalid DEIMOS character archive payload.');
  }

  return payload;
}

function sanitizeFilename(name: string) {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[\s\-.]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_');

  return sanitized || 'unnamed_character';
}

export const characterCodec = {
  exportToFile(archive: CharacterCreationArchive) {
    const finalFileContent = `${CHARACTER_FILE_HEADER}${encodeArchive(archive)}`;
    const blob = new Blob([finalFileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${sanitizeFilename(archive.core.name)}.${FILE_EXTENSION}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importFromFile(file: File): Promise<CharacterCreationArchive> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          resolve(decodeArchive(String(event.target?.result ?? '')));
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read character archive.'));
      reader.readAsText(file);
    });
  },

  decodeArchive
};
