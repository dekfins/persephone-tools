import type {
  AttributeKey,
  Attributes,
  CharacterClass,
  CharacterFocusPick,
  CharacterSaveScores,
  Foci,
  FocusLevel
} from './types';

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
      'Starting maximum hit points: 1d6+Con Mod, minimum 1.',
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
      'Starting maximum hit points: 1d6+2+Con Mod, minimum 1.',
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
      'Starting maximum hit points: 1d6+2+Con Mod, minimum 1.',
      'Attack bonus: half your character level, rounded down, plus +1 at first and fifth levels.',
      'You do not gain the Expert reroll or the Warrior once-per-scene combat ability.'
    ]
  }
};

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

export function getSavingThrows(attributes: Attributes): CharacterSaveScores {
  const mods = getAttributeModifiers(attributes);
  return {
    physical: 15 - Math.max(mods.str, mods.con),
    evasion: 15 - Math.max(mods.int, mods.dex),
    mental: 15 - Math.max(mods.wis, mods.cha)
  };
}

export function getBaseAttackBonus(characterClass: CharacterClass) {
  return characterClass === 'warrior' || characterClass === 'adventurer' ? 1 : 0;
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
