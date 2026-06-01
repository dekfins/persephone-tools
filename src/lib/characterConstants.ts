import type { Skill, Background, Foci } from './types';

export const HERITAGES = [
  { label: 'EARTHLING', value: 'earthling' as const },
  { label: 'SPACER', value: 'spacer' as const }
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