export type MissionLootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface MissionLootReward {
  equipmentId: string;
  quantity: number;
  rarity: MissionLootRarity;
  displayName: string;
}

export interface ActiveMission {
  originName: string;
  targetName: string;
  launchDay: number;
  travelTime: number;  // Total days required
  daysElapsed: number; // How far along the route the ship currently is
  reqDv: number;
  telemetry: FlightTelemetry; 
  payoutCredits?: number;
  lootReward?: MissionLootReward;
  // Legacy fallback for active flights saved before catalog-backed mission rewards.
  lootItem?: string;
  lootRarity?: MissionLootRarity | string;
}

export interface GeneratedMission {
  id: string;
  targetPoiId: string;
  originPoiId: string;
  difficulty: number;
  client: string;
  objective: string;
  adversary: string;
  twist: string;
  travelTimeDays: number;
  reqDv: number;
  payoutString: string;
  payoutCredits: number;
  lootReward?: MissionLootReward;
  // Legacy fallback for active flights saved before catalog-backed mission rewards.
  lootRarity?: MissionLootRarity | string;
  lootItem?: string;
  telemetry: any;
}

export interface FlightTelemetry {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  dist: number;
  accel: number;
  vMax: number;
  tAccel: number;
  tCoast: number;
  sAccel: number;
  totalT: number;
  relVel: number;
  maxDv: number;
}
