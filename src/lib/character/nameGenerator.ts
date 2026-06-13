import nameLists from '../../data/character/names.json';
import type {
  GeneratedCharacterName,
  GeneratedPlaceName,
  NameCulture,
  NameFirstType,
  NameGeneratorNameLists,
  NameGeneratorTables,
  NameGenerationOptions,
  NameTableEntry,
  NameTableKind
} from '../types';

type RandomSource = () => number;
const NAME_LISTS = nameLists as NameGeneratorNameLists;

function firstNameEntries(values: string[]): NameTableEntry[] {
  return values.map((value, index) => ({
    min: index * 4 + 1,
    max: index * 4 + 4,
    value
  }));
}

function placeEntries(values: string[]): NameTableEntry[] {
  return values.map((value, index) => ({
    min: index * 2 + 1,
    max: index * 2 + 2,
    value
  }));
}

function buildNameTables(lists: NameGeneratorNameLists): NameGeneratorTables {
  return Object.fromEntries(
    Object.entries(lists).map(([culture, table]) => [
      culture,
      {
        label: table.label,
        male: firstNameEntries(table.male),
        female: firstNameEntries(table.female),
        surname: firstNameEntries(table.surname),
        place: placeEntries(table.place)
      }
    ])
  ) as NameGeneratorTables;
}

const NAME_TABLES = buildNameTables(NAME_LISTS);

export const NAME_CULTURES = Object.keys(NAME_TABLES) as NameCulture[];

export const NAME_CULTURE_OPTIONS = NAME_CULTURES.map((culture) => ({
  label: NAME_TABLES[culture].label,
  value: culture
}));

export const NAME_FIRST_TYPE_OPTIONS: Array<{ label: string; value: NameFirstType }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Any', value: 'any' }
];

function rollD100(random: RandomSource = Math.random) {
  return Math.floor(random() * 100) + 1;
}

function resolveEntry(entries: readonly NameTableEntry[], roll: number) {
  const entry = entries.find((candidate) => roll >= candidate.min && roll <= candidate.max);
  if (!entry) {
    throw new Error(`Name generator roll ${roll} does not match a d100 table entry.`);
  }
  return entry.value;
}

function normalizeRoll(roll: number) {
  if (!Number.isFinite(roll)) return 1;
  return Math.max(1, Math.min(100, Math.floor(roll)));
}

function resolveFirstNameKind(firstNameType: NameFirstType, random: RandomSource): Extract<NameTableKind, 'male' | 'female'> {
  if (firstNameType === 'any') return random() < 0.5 ? 'male' : 'female';
  return firstNameType;
}

export function getNameTableLabel(culture: NameCulture) {
  return NAME_TABLES[culture].label;
}

export function rollNameTable(culture: NameCulture, tableKind: NameTableKind, roll = rollD100()) {
  return resolveEntry(NAME_TABLES[culture][tableKind], normalizeRoll(roll));
}

export function generateCharacterName(
  options: NameGenerationOptions,
  random: RandomSource = Math.random
): GeneratedCharacterName {
  const firstNameKind = resolveFirstNameKind(options.firstNameType, random);
  const firstNameRoll = rollD100(random);
  const surnameRoll = rollD100(random);
  const firstName = rollNameTable(options.culture, firstNameKind, firstNameRoll);
  const surname = rollNameTable(options.culture, 'surname', surnameRoll);

  return {
    culture: options.culture,
    firstNameType: options.firstNameType,
    firstName,
    surname,
    fullName: `${firstName} ${surname}`,
    rolls: {
      firstName: firstNameRoll,
      surname: surnameRoll
    }
  };
}

export function generatePlaceName(culture: NameCulture, random: RandomSource = Math.random): GeneratedPlaceName {
  const roll = rollD100(random);
  return {
    culture,
    placeName: rollNameTable(culture, 'place', roll),
    roll
  };
}
