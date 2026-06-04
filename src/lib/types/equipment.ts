import type { CharacterSkill } from './character';

export type EquipmentCategory =
  | 'armor'
  | 'ranged_weapon'
  | 'melee_weapon'
  | 'heavy_weapon'
  | 'ammo_power'
  | 'computing'
  | 'communications'
  | 'tools_medical'
  | 'field_equipment'
  | 'food_water'
  | 'trade_good'
  | 'pharmaceutical'
  | 'restricted_tech';

export type EquipmentLegality =
  | 'open'
  | 'licensed'
  | 'restricted'
  | 'contraband'
  | 'military'
  | 'pretech'
  | 'removed';

export type EquipmentAvailability =
  | 'common'
  | 'station_only'
  | 'licensed_vendor'
  | 'black_market'
  | 'faction_contact'
  | 'mission_reward'
  | 'not_for_sale'
  | 'removed';

export type EquipmentSource = 'rulebook' | 'persephone_reflavor' | 'persephone_homebrew';

export type EquipmentPackageId =
  | 'gunslinger'
  | 'soldier'
  | 'scout'
  | 'medic'
  | 'civilian'
  | 'technician'
  | 'barbarian'
  | 'blade'
  | 'thief'
  | 'hacker';

export type EquipmentTag =
  | 'advanced'
  | 'ammo'
  | 'anti_vehicle'
  | 'armor'
  | 'black_market'
  | 'burst'
  | 'computing'
  | 'concealable'
  | 'consumable'
  | 'explosive'
  | 'food'
  | 'heavy'
  | 'illegal_space'
  | 'medical'
  | 'nonlethal'
  | 'pharmaceutical'
  | 'powered'
  | 'pretech'
  | 'primitive'
  | 'radiation'
  | 'reload_slow'
  | 'shield'
  | 'suppression'
  | 'survival'
  | 'tool'
  | 'trade'
  | 'vacc'
  | 'vehicle_mount'
  | 'water';

export interface EquipmentAppFlags {
  playerVisible: boolean;
  gmOnly?: boolean;
  spawnable: boolean;
}

export interface EquipmentArmorStats {
  armorClass: number;
  armorClassBonus?: number;
  armorType: 'primitive' | 'street' | 'combat' | 'powered' | 'shield';
}

export interface EquipmentWeaponStats {
  damage: string;
  range?: string;
  magazine?: string;
  attribute?: 'Str' | 'Dex' | 'Str/Dex' | 'None';
  shock?: string;
  reload?: string;
  ammoType?: 'projectile' | 'missile' | 'type_a_cell' | 'type_b_cell' | 'integral' | 'none';
}

export interface EquipmentPharmaceuticalStats {
  requiredSkill?: {
    skill: CharacterSkill;
    minimumLevel: number;
  };
  effect: string;
  strainCost?: number;
  radEffect?: string;
  overdoseRisk?: string;
  duration?: string;
}

export interface EquipmentRadiationStats {
  effect: string;
  radModifier?: number;
  duration?: string;
}

export interface EquipmentLogisticsStats {
  units?: string;
  days?: number;
  waterLiters?: number;
  quality?: 'survival' | 'standard' | 'fresh' | 'luxury' | 'hazard';
}

export interface EquipmentCatalogItem {
  id: string;
  name: string;
  sourceName: string;
  category: EquipmentCategory;
  description: string;
  cost: number | null;
  encumbrance: number | '*' | null;
  techLevel: number | null;
  legality: EquipmentLegality;
  availability: EquipmentAvailability;
  tags: EquipmentTag[];
  source: EquipmentSource;
  mechanics?: string;
  app: EquipmentAppFlags;
  armor?: EquipmentArmorStats;
  weapon?: EquipmentWeaponStats;
  pharmaceutical?: EquipmentPharmaceuticalStats;
  radiation?: EquipmentRadiationStats;
  logistics?: EquipmentLogisticsStats;
}

export type EquipmentCatalog = Record<string, EquipmentCatalogItem>;

export interface EquipmentPackageEntry {
  equipmentId: string;
  quantity: number;
  displayName?: string;
}

export interface EquipmentPackageDefinition {
  id: EquipmentPackageId;
  name: string;
  credits: number;
  items: EquipmentPackageEntry[];
}

export type EquipmentPackageCatalog = Record<EquipmentPackageId, EquipmentPackageDefinition>;

export interface StartingEquipmentItem extends EquipmentPackageEntry {
  packageId?: EquipmentPackageId;
}

export type CreatorEquipmentMode = 'package' | 'rolled_credits';

export interface PurchasedEquipmentItem {
  equipmentId: string;
  quantity: number;
}

export interface CreatorEquipmentChoice {
  mode: CreatorEquipmentMode;
  packageId?: EquipmentPackageId;
  creditRoll?: [number, number];
  startingCredits: number;
  items: StartingEquipmentItem[];
  purchasedItems: PurchasedEquipmentItem[];
}
