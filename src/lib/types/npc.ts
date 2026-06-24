export type NpcProfileSchema = 'PERSEPHONE-NPC';
export type NpcProfileKind = 'human' | 'beast';

export type NpcRollDie = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface NpcRollResult {
  die: NpcRollDie;
  roll: number;
  table: string;
  result: string;
}

export interface NpcCombatProfile {
  presetId: string;
  label: string;
  sourceLabel: string;
  hd: number;
  hp: number;
  hpRolls: number[];
  ac: number;
  armorTag?: 'primitive' | 'combat' | 'powered';
  attackBonus: number;
  attacks: number;
  damage: string;
  move: string;
  morale: number;
  skillBonus: number;
  save: number;
}

export interface NpcIdentityProfile {
  name: string;
  culture: string;
  firstNameType: string;
  age: string;
  background: string;
  role: string;
}

export interface NpcPersonalityProfile {
  biggestProblem: string;
  obviousTrait: string;
  greatestDesire: string;
  motivation: string;
  want: string;
  power: string;
  hook: string;
  initialManner: string;
  defaultDealOutcome: string;
}

export interface NpcBeastMorphologyProfile {
  basicAnimalFeatures: string;
  bodyPlan: string;
  limbNovelty: string;
  skinNovelty: string;
  mainWeapon: string;
  size: string;
}

export interface NpcBeastBehaviorProfile {
  ecologicalRole: 'predator' | 'prey' | 'scavenger';
  trait: string;
  swarm: boolean;
}

export interface NpcBeastHazardProfile {
  harmfulDischarge: string;
  poisonEffect: string;
  poisonOnset: string;
  poisonDuration: string;
}

export interface NpcProfile {
  schema: NpcProfileSchema;
  version: 1;
  kind: NpcProfileKind;
  characterId: string | null;
  identity: NpcIdentityProfile;
  personality: NpcPersonalityProfile;
  morphology?: NpcBeastMorphologyProfile;
  behavior?: NpcBeastBehaviorProfile;
  hazards?: NpcBeastHazardProfile;
  combat: NpcCombatProfile;
  rolls: NpcRollResult[];
  generatedAt: string;
  gmNotes: string;
}

export interface NpcProfileRecord {
  character_id: string;
  campaign_id: string;
  profile: NpcProfile;
  gm_notes: string;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NpcCombatPreset {
  id: string;
  label: string;
  sourceLabel: string;
  hd: number;
  fixedHp?: number;
  ac: number;
  armorTag?: 'primitive' | 'combat' | 'powered';
  attackBonus: number;
  attacks?: number;
  damage: string;
  move: string;
  morale: number;
  skillBonus: number;
  save: number;
}

export interface NpcTableEntry {
  roll: number;
  label: string;
  variants?: string[];
  rollTwice?: boolean;
}

export interface NpcGeneratorTables {
  age: NpcTableEntry[];
  background: NpcTableEntry[];
  role: NpcTableEntry[];
  biggestProblem: NpcTableEntry[];
  trait: NpcTableEntry[];
  desire: NpcTableEntry[];
  motivation: NpcTableEntry[];
  want: NpcTableEntry[];
  power: NpcTableEntry[];
  hook: NpcTableEntry[];
  manner: NpcTableEntry[];
  deal: NpcTableEntry[];
}

export interface NpcGeneratorData {
  combatPresets: NpcCombatPreset[];
  defaultCombatPresetId: string;
  combatSelectionRules: Array<{
    presetId: string;
    keywords: string[];
  }>;
  firstNameTypeOptions: Array<{
    label: string;
    value: 'male' | 'female' | 'any';
  }>;
  tableMetadata: Record<keyof NpcGeneratorTables, {
    die: NpcRollDie;
    label: string;
    entries: number;
  }>;
  tables: NpcGeneratorTables;
}

export interface NpcBeastGeneratorTables {
  basicAnimalFeatures: NpcTableEntry[];
  bodyPlan: NpcTableEntry[];
  limbNovelty: NpcTableEntry[];
  skinNovelty: NpcTableEntry[];
  mainWeapon: NpcTableEntry[];
  size: NpcTableEntry[];
  predator: NpcTableEntry[];
  prey: NpcTableEntry[];
  scavenger: NpcTableEntry[];
  harmfulDischarge: NpcTableEntry[];
  poisonEffect: NpcTableEntry[];
  poisonOnset: NpcTableEntry[];
  poisonDuration: NpcTableEntry[];
}

export interface NpcBeastGeneratorData {
  combatPresets: NpcCombatPreset[];
  defaultCombatPresetId: string;
  namePrefixes: string[];
  nameSuffixes: string[];
  ecologicalRoles: Array<{
    label: string;
    value: NpcBeastBehaviorProfile['ecologicalRole'];
  }>;
  tableMetadata: Record<keyof NpcBeastGeneratorTables, {
    die: NpcRollDie;
    label: string;
    entries: number;
  }>;
  tables: NpcBeastGeneratorTables;
}

export interface GeneratedNpcDraft {
  characterId: string;
  profile: NpcProfile;
}
