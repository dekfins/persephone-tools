import type {
  AttributeKey,
  Attributes,
  CharacterAdvancementProgress,
  CharacterClass,
  CharacterFocusPick,
  CharacterRecord,
  CharacterSaveScores,
  Foci,
  FocusLevel,
  Skill
} from '../types';
import { COMBAT_SKILLS } from './characterConstants';

export type ClassAbilityDefinition = {
  label: string;
  role: string;
  feature: string;
  hpImpact: string;
  bullets: string[];
  rules: string[];
};

export const CLASS_ABILITIES: Record<CharacterClass, ClassAbilityDefinition> = {
  expert: {
    label: 'EXPERT',
    role: 'SKILL SPECIALIST',
    feature: 'ONCE PER SCENE, REROLL A FAILED SKILL CHECK AND KEEP THE BETTER RESULT',
    hpImpact: 'NORMAL HP',
    bullets: [
      'EXTRA NON-COMBAT FOCUS',
      'MORE SKILL POINTS',
      'STANDARD ATTACK / HP'
    ],
    rules: [
      'Once per scene, reroll a failed skill check and keep the better result. This does not apply to attack rolls.',
      'Gain a non-combat focus as a bonus focus at first level.',
      'When you advance a level, gain a bonus skill point that must be spent on a non-combat, non-psychic skill.',
      'Starting maximum HP: 1d6+Con Mod, minimum 1.',
      'Attack bonus: half your character level, rounded down, so +0 at first level.'
    ]
  },
  warrior: {
    label: 'WARRIOR',
    role: 'COMBAT SPECIALIST',
    feature: 'ONCE PER SCENE, TURN A MISSED ATTACK INTO A HIT OR NEGATE A COMBAT HIT',
    hpImpact: '+2 MAX HP',
    bullets: [
      'EXTRA COMBAT FOCUS',
      'IMPROVED ATTACK BONUS',
      '+2 HP / LEVEL'
    ],
    rules: [
      'Once per scene, as an Instant ability after dice are rolled, either turn your missed attack into a hit or negate a successful attack against you. This does not apply to environmental damage, effects without attack rolls, or hits against a vehicle you occupy.',
      'Gain a combat focus as a bonus focus at first level.',
      'You gain two extra maximum hit points at each character level.',
      'Starting maximum HP: 1d6+2+Con Mod, minimum 1.',
      'Attack bonus: equal to your character level, so +1 at first level.'
    ]
  },
  adventurer: {
    label: 'ADVENTURER',
    role: 'HYBRID GENERALIST',
    feature: 'PARTIAL EXPERT + PARTIAL WARRIOR. NO EXTRA CLASS FEATURES.',
    hpImpact: '+2 MAX HP',
    bullets: [
      'EXTRA NON-COMBAT FOCUS',
      'EXTRA COMBAT FOCUS',
      'SKILL POINTS AND ATTACK BONUS',
      '+2 HP / LEVEL'
    ],
    rules: [
      'Gain a non-combat focus as a bonus focus at first level.',
      'When you advance a level, gain a bonus skill point that must be spent on a non-combat, non-psychic skill.',
      'Gain a combat focus as a bonus focus at first level.',
      'You gain two extra maximum hit points at each character level.',
      'Starting maximum HP: 1d6+2+Con Mod, minimum 1.',
      'Attack bonus: half your character level, rounded down, plus +1 at first and fifth levels.',
      'You do not gain the Expert reroll or the Warrior once-per-scene combat ability.'
    ]
  }
};

export const XP_THRESHOLDS = [0, 3, 6, 12, 18, 27, 39, 54, 72, 93] as const;
export const FOCUS_ADVANCEMENT_LEVELS = [2, 5, 7, 10] as const;

export const SKILL_ADVANCEMENT_RULES: Record<number, { cost: number; minLevel: number }> = {
  0: { cost: 1, minLevel: 1 },
  1: { cost: 2, minLevel: 1 },
  2: { cost: 3, minLevel: 3 },
  3: { cost: 4, minLevel: 6 },
  4: { cost: 5, minLevel: 9 }
};

export const ATTRIBUTE_BOOST_RULES = [
  { cost: 1, minLevel: 1 },
  { cost: 2, minLevel: 1 },
  { cost: 3, minLevel: 3 },
  { cost: 4, minLevel: 6 },
  { cost: 5, minLevel: 9 }
] as const;

export const EMPTY_ADVANCEMENT_PROGRESS: CharacterAdvancementProgress = {
  generalSkillPoints: 0,
  nonCombatSkillPoints: 0,
  skillInvestments: {},
  attributeBoostCount: 0
};

export function normalizeAdvancementProgress(value: unknown): CharacterAdvancementProgress {
  const source = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Partial<CharacterAdvancementProgress>
    : {};
  const rawInvestments = source.skillInvestments &&
    typeof source.skillInvestments === 'object' &&
    !Array.isArray(source.skillInvestments)
      ? source.skillInvestments
      : {};

  const skillInvestments = Object.entries(rawInvestments).reduce((investments, [skill, amount]) => {
    if (typeof amount === 'number' && amount > 0) {
      investments[skill as Skill] = Math.floor(amount);
    }
    return investments;
  }, {} as Partial<Record<Skill, number>>);

  return {
    generalSkillPoints: Math.max(0, Math.floor(Number(source.generalSkillPoints) || 0)),
    nonCombatSkillPoints: Math.max(0, Math.floor(Number(source.nonCombatSkillPoints) || 0)),
    skillInvestments,
    attributeBoostCount: Math.max(0, Math.min(5, Math.floor(Number(source.attributeBoostCount) || 0)))
  };
}

export function getTotalExperienceRequired(level: number) {
  const normalizedLevel = Math.max(1, Math.floor(level));
  if (normalizedLevel <= XP_THRESHOLDS.length) return XP_THRESHOLDS[normalizedLevel - 1];
  return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + (normalizedLevel - XP_THRESHOLDS.length) * 24;
}

export function getNextLevelThreshold(level: number) {
  return getTotalExperienceRequired(Math.max(1, Math.floor(level)) + 1);
}

export function getLevelForXP(xp: number) {
  const normalizedXP = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;

  while (normalizedXP >= getTotalExperienceRequired(level + 1)) {
    level += 1;
  }

  return level;
}

export function canLevelUp(character: Pick<CharacterRecord, 'level' | 'xp'>) {
  return Math.max(0, character.xp ?? 0) >= getNextLevelThreshold(character.level);
}

export function hasExpertTraining(characterClass: CharacterClass) {
  return characterClass === 'expert' || characterClass === 'adventurer';
}

export function hasWarriorTraining(characterClass: CharacterClass) {
  return characterClass === 'warrior' || characterClass === 'adventurer';
}

export function hasFocusLevel(picks: CharacterFocusPick[], focus: Foci) {
  return (getHighestFocusLevels(picks)[focus] ?? 0) > 0;
}

export function getSkillRankCap(characterLevel: number) {
  const level = Math.max(1, Math.floor(characterLevel));
  if (level >= 9) return 4;
  if (level >= 6) return 3;
  if (level >= 3) return 2;
  return 1;
}

export function getNextSkillRankCost(currentRank: number) {
  const nextRank = currentRank + 1;
  return SKILL_ADVANCEMENT_RULES[nextRank]?.cost ?? null;
}

export function canAdvanceSkill(currentRank: number, characterLevel: number) {
  const nextRank = currentRank + 1;
  const rule = SKILL_ADVANCEMENT_RULES[nextRank];
  return Boolean(rule && nextRank <= 4 && characterLevel >= rule.minLevel);
}

export function isCombatSkill(skill: Skill) {
  return COMBAT_SKILLS.includes(skill);
}

export function grantsFocusAtLevel(level: number) {
  return FOCUS_ADVANCEMENT_LEVELS.includes(level as never);
}

export function getAttributeBoostRule(attributeBoostCount: number) {
  return ATTRIBUTE_BOOST_RULES[attributeBoostCount] ?? null;
}

export function getAttributeModifier(score: number) {
  if (score <= 3) return -2;
  if (score <= 7) return -1;
  if (score <= 13) return 0;
  if (score <= 17) return 1;
  return 2;
}

export function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function getAttributeModifiers(attributes: Attributes): Record<AttributeKey, number> {
  return {
    str: getAttributeModifier(attributes.str),
    dex: getAttributeModifier(attributes.dex),
    con: getAttributeModifier(attributes.con),
    int: getAttributeModifier(attributes.int),
    wis: getAttributeModifier(attributes.wis),
    cha: getAttributeModifier(attributes.cha)
  };
}

export function getSavingThrows(attributes: Attributes, level = 1): CharacterSaveScores {
  const mods = getAttributeModifiers(attributes);
  const levelAdjustment = Math.max(0, Math.floor(level) - 1);
  return {
    physical: 15 - levelAdjustment - Math.max(mods.str, mods.con),
    evasion: 15 - levelAdjustment - Math.max(mods.int, mods.dex),
    mental: 15 - levelAdjustment - Math.max(mods.wis, mods.cha)
  };
}

export function getBaseAttackBonus(characterClass: CharacterClass, level = 1) {
  const normalizedLevel = Math.max(1, Math.floor(level));
  if (characterClass === 'warrior') return normalizedLevel;
  if (characterClass === 'adventurer') {
    return Math.floor(normalizedLevel / 2) + 1 + (normalizedLevel >= 5 ? 1 : 0);
  }
  return Math.floor(normalizedLevel / 2);
}

export function getClassAbility(characterClass: CharacterClass) {
  return CLASS_ABILITIES[characterClass];
}

export function getHighestFocusLevels(picks: CharacterFocusPick[]) {
  return picks.reduce((levels, pick) => {
    levels[pick.focus] = Math.max(levels[pick.focus] ?? 0, pick.level) as FocusLevel;
    return levels;
  }, {} as Partial<Record<Foci, FocusLevel>>);
}
