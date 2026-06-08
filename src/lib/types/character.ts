import type { CreatorEquipmentChoice } from './equipment';
import type { CharacterKind } from './campaign';

export interface Attributes {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type AttributeKey = keyof Attributes;

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

export type CharacterSkill = Skill;

export interface SkillDefinition {
  name: Skill;
  description: string;
  defaultAttribute: AttributeKey;
}

export type SkillDefinitions = Record<Skill, SkillDefinition>;

export type BackgroundChoiceToken =
  | 'Any Combat'
  | 'Any Skill'
  | 'Shoot or Trade'
  | 'Stab or Shoot';

export type AttributeCategory = 'any' | 'physical' | 'mental';

export interface SkillGrantEntry {
  type: 'skill';
  value: CharacterSkill;
}

export interface ChoiceTokenEntry {
  type: 'special';
  value: BackgroundChoiceToken;
}

export interface StatGrantEntry {
  type: 'stat';
  category: AttributeCategory;
  bonus: number;
}

export type BackgroundRuleEntry = SkillGrantEntry | ChoiceTokenEntry | StatGrantEntry;

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

export interface BackgroundDefinition {
  name: Background;
  description: string;
  freeSkill: SkillGrantEntry | ChoiceTokenEntry;
  quickSkills: Array<SkillGrantEntry | ChoiceTokenEntry>;
  growth: BackgroundRuleEntry[];
  learning: BackgroundRuleEntry[];
}

export type BackgroundTableName = 'growth' | 'learning';
export type BackgroundDefinitions = Record<Background, BackgroundDefinition>;

export type BackgroundProgressMode = 'quick_skills' | 'roll_tables' | 'pick_learning';

export interface BackgroundResolvedChoice {
  skill?: Skill;
  attribute?: AttributeKey;
}

export interface BackgroundGrantResult {
  type: 'skill' | 'stat';
  target: Skill | AttributeKey;
  before: number;
  after: number;
}

export interface BackgroundProgressGrant {
  id: string;
  source: 'quick' | 'free' | 'roll' | 'learning_pick' | 'free_interest';
  label: string;
  entry: BackgroundRuleEntry;
  resolvedSkill?: Skill;
  resolvedAttribute?: AttributeKey;
  table?: BackgroundTableName;
  roll?: number;
  tableIndex?: number;
  result: BackgroundGrantResult;
}

export interface BackgroundProgress {
  mode?: BackgroundProgressMode;
  background?: Background;
  baseline?: {
    skills: Partial<Record<Skill, number>>;
    attributes: Attributes;
  };
  choices?: BackgroundProgressGrant[];
  freeSkillApplied?: boolean;
  complete?: boolean;
  updatedAt?: string;
}

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

export type FocusCategory = 'combat' | 'noncombat';
export type FocusSkillToken = 'Any Combat' | 'Any Non-Combat' | 'Punch or Stab';
export type FocusPickSource = 'base' | 'expert' | 'warrior' | 'advancement';
export type FocusLevel = 1 | 2;

export interface FocusSkillGrantEntry {
  type: 'skill';
  value: CharacterSkill;
}

export interface FocusChoiceGrantEntry {
  type: 'special';
  value: FocusSkillToken;
}

export type FocusGrantEntry = FocusSkillGrantEntry | FocusChoiceGrantEntry;

export interface FocusDefinition {
  name: Foci;
  category: FocusCategory;
  description: string;
  bonusSkill?: FocusGrantEntry;
  level1: string;
  level2: string;
}

export type FocusDefinitions = Record<Foci, FocusDefinition>;

export interface CharacterFocusPick {
  focus: Foci;
  level: FocusLevel;
  source: FocusPickSource;
}

export interface FocusGrantResult {
  target: Skill;
  before: number;
  after: number;
}

export interface FocusProgressGrant {
  id: string;
  source: FocusPickSource | 'free_interest';
  focus?: Foci;
  level?: FocusLevel;
  label: string;
  entry?: FocusGrantEntry;
  resolvedSkill?: Skill;
  result: FocusGrantResult;
}

export interface FocusProgress {
  picks: CharacterFocusPick[];
  grants: FocusProgressGrant[];
  freeInterestSkill?: Skill;
  complete?: boolean;
  updatedAt?: string;
}

export type CharacterClass = 'expert' | 'warrior' | 'adventurer';
export type Heritage = 'earthling' | 'voidborn';
export type AdventurerPartial = 'partial_expert' | 'partial_warrior';

export interface CharacterSaveScores {
  physical: number;
  evasion: number;
  mental: number;
}

export interface CharacterAdvancementProgress {
  generalSkillPoints: number;
  nonCombatSkillPoints: number;
  skillInvestments: Partial<Record<Skill, number>>;
  attributeBoostCount: number;
}

export type CharacterSkillPointPool = 'general' | 'noncombat';

export interface CharacterSkillPointSpend {
  skill: Skill;
  pool: CharacterSkillPointPool;
}

export interface CharacterLevelUpFocusChoice {
  focus: Foci;
  level: FocusLevel;
  bonusSkill?: Skill;
}

export interface CharacterLevelUpPayload {
  targetLevel: number;
  hpRolls: number[];
  skillSpends: CharacterSkillPointSpend[];
  attributeBoosts: AttributeKey[];
  focusChoice?: CharacterLevelUpFocusChoice;
}

export interface CharacterCreationDetails {
  schema: 'DEIMOS-CHARACTER';
  version: 1;
  generatedAt: string;
  hpRoll: number;
  baseAttackBonus: number;
  armorClass: number;
  saves: CharacterSaveScores;
  homeworld: string;
  employerAffiliation: string;
  goal: string;
  notes: string;
  focusPicks: CharacterFocusPick[];
  focusProgress: FocusProgress;
  freeInterestSkill?: Skill;
  adventurerPartials: AdventurerPartial[];
  startingCredits: number;
  attributeMethod: 'manual' | 'array' | 'rolled';
  equipment: CreatorEquipmentChoice;
}

export interface CharacterCreationArchive {
  schema: 'DEIMOS-CHARACTER';
  version: 1;
  exportedAt: string;
  core: CharacterRecord;
  creation: CharacterCreationDetails;
}

export interface CharacterNotes {
  homeworld: string;
  employerAffiliation: string;
  goal: string;
  notes: string;
}

export type CharacterConditionCategory = 'combat' | 'hazard' | 'custom';

export type CharacterConditionTemplateId =
  | 'prone'
  | 'cover_half'
  | 'cover_total'
  | 'total_defense'
  | 'surprised'
  | 'stunned'
  | 'mortally_wounded'
  | 'poisoned'
  | 'diseased'
  | 'acute_radiation'
  | 'chronic_radiation'
  | 'xenoallergy';

export interface CharacterConditionTemplate {
  id: CharacterConditionTemplateId;
  category: Exclude<CharacterConditionCategory, 'custom'>;
  name: string;
  summary: string;
}

export type CharacterConditionCatalog = Record<CharacterConditionTemplateId, CharacterConditionTemplate>;

export interface CharacterActiveCondition {
  id: string;
  category: CharacterConditionCategory;
  name: string;
  summary: string;
  templateId?: CharacterConditionTemplateId;
  createdAt: string;
}

export interface FinalizeInventoryItemFailure {
  equipmentId: string;
  name: string;
  quantity: number;
  reason: string;
}

export interface FinalizeCharacterArchiveResult {
  success: boolean;
  status:
    | 'no_archive'
    | 'duplicate_character'
    | 'invalid_cart'
    | 'character_insert_failed'
    | 'inventory_partial_failure'
    | 'complete';
  message: string;
  characterId?: string;
  characterInserted: boolean;
  inventory: {
    attempted: number;
    inserted: number;
    merged: number;
    skipped: number;
    failures: FinalizeInventoryItemFailure[];
  };
}

export interface CharacterRecord {
  id: string;
  name: string;
  role: 'PLAYER' | 'GM';
  campaign_id?: string | null;
  owner_user_id?: string | null;
  character_kind?: CharacterKind;
  personal_credits: number;
  character_notes?: CharacterNotes;

  attributes: Attributes;
  heritage: Heritage;
  background: Background;
  skills: Partial<Record<Skill, number>>; // e.g., { "Shoot": 1, "Pilot": 0, "Administer": -1 }
  background_progress: BackgroundProgress;
  advancement_progress: CharacterAdvancementProgress;
  character_class: CharacterClass;
  foci: CharacterFocusPick[];
  
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  system_strain: number;
  max_system_strain: number;
  rads: number;
  max_rads: number;
  base_ac: number;
  active_conditions: CharacterActiveCondition[];
}
