export interface Attributes {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type Skill = 
  | 'Administer'
  | 'Connect'
  | 'Exert'
  | 'Fix'
  | 'Heal'
  | 'Know'
  | 'Lead'
  | 'Notice'
  | 'Perform'
  | 'Pilot'
  | 'Program'
  | 'Punch'
  | 'Shoot'
  | 'Sneak'
  | 'Stab'
  | 'Survive'
  | 'Talk'
  | 'Trade'
  | 'Work';

export type Background =
  | 'Barbarian'
  | 'Clergy'
  | 'Courtesan'
  | 'Criminal'
  | 'Dilettante'
  | 'Entertainer'
  | 'Merchant'
  | 'Noble'
  | 'Official'
  | 'Peasant'
  | 'Physician'
  | 'Pilot'
  | 'Politician'
  | 'Scholar'
  | 'Soldier'
  | 'Spacer'
  | 'Technician'
  | 'Thug'
  | 'Vagabond'
  | 'Worker';

export type Foci =
  | 'Alert'
  | 'Armsman'
  | 'Assassin'
  | 'Authority'
  | 'Close Combatant'
  | 'Connected'
  | 'Die Hard'
  | 'Diplomat'
  | 'Gunslinger'
  | 'Hacker'
  | 'Healer'
  | 'Henchkeeper'
  | 'Ironhide'
  | 'Savage Fray'
  | 'Shocking Assault'
  | 'Sniper'
  | 'Specialist'
  | 'Star Captain'
  | 'Starfarer'
  | 'Tinker'
  | 'Unarmed Combatant'
  | 'Unique Gift'
  | 'Wanderer';

export interface CharacterRecord {
  id: string;
  name: string;
  role: 'PLAYER' | 'GM';
  personal_credits: number;

  attributes: Attributes;
  heritage: 'spacer' | 'earthling';
  background: Background;
  skills: Partial<Record<Skill, number>>; // e.g., { "Shoot": 1, "Pilot": 0, "Administer": -1 }
  character_class: 'expert' | 'warrior' | 'adventurer';
  foci: Foci;
  
  level: number;
  hp: number;
  max_hp: number;
  rads: number;
  max_rads: number;
  base_ac: number;
}