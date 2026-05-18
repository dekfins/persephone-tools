export interface ShipItem {
  baseCost: number;
  basePower: number;
  baseMass: number;
  class: "Fighter" | "Frigate" | "Cruiser" | "Capital";
  description?: string;
}

// Only used by items that have TRUE/FALSE scaling flags
export interface ScalingComponent extends ShipItem {
  hasScaleCost: "TRUE" | "FALSE";
  hasScalePower: "TRUE" | "FALSE";
  hasScaleMass: "TRUE" | "FALSE";
  maxClass?: string;
  isStackable?: "TRUE" | "FALSE";
}

export interface Fitting extends ScalingComponent {
  fittingName: string;
  maxCrewMultiplier?: number;
}

export interface Defense extends ScalingComponent {
  defenseName: string;
  // Using union types (number | string) because your JSON uses "" for empty values
  healthBonus: number | string;
  armorClassBonus: number | string;
  speedBonus: number | string;
}

// CoreSystems don't scale dynamically via TRUE/FALSE flags in JSON
export interface CoreSystem extends ShipItem {
  parentEngine?: string;     // For engines
  reactorType?: string;      // For reactors
  reactorIntegrity?: number; // Only reactors have this
}

// Weapons use entirely different naming keys (weaponCost, power, mass)
// Therefore, it does NOT extend ShipItem or ScalingComponent
export interface Weapon {
  weaponName: string;
  weaponCost: number;
  ammoCost: number;
  damage: string;
  power: number;
  mass: number;
  hardpoints: number;
  class: "Fighter" | "Frigate" | "Cruiser" | "Capital";
  techLevel: number;
  armorPiercing: number;
  ammoRating: number;
  isCloud: "TRUE" | "FALSE";
  isClumsy: "TRUE" | "FALSE";
  isFlak: "TRUE" | "FALSE";
  description: string;
}

// Hulls ARE the scale, so they use their own unique keys
export interface Hull {
  hullType: string;
  cost: number;
  speed: number;
  armor: number;
  health: number;
  minCrew: number;
  maxCrew: number;
  armorClass: number;
  power: number;
  mass: number;
  hardpoints: number;
  class: "Fighter" | "Frigate" | "Cruiser" | "Capital";
  description: string;
}

export interface HullConstant {
  hullClass: "Fighter" | "Frigate" | "Cruiser" | "Capital";
  costMult: number;
  massPowerMult: number;
  classTier: number;
}

// Use this in your Component Cart logic so TS accepts any installable item
export type InstallableItem = Weapon | Defense | Fitting | CoreSystem;

export interface InstalledComponent {
  id: string;
  category: "Weapon" | "Defense" | "Fitting";
  quantity: number;
  item: InstallableItem;
  status: "Online" | "Damaged" | "Destroyed";
}

export interface ActiveCondition {
  id: string;
  name: string;
  effect: string;
  fixDC: string;
  segmentsActive: number;
}

export interface Propellant {
  name: string;
  efficiency: number;
}

export interface EngineConfig {
  fuel: string;
  mode: string;
  twrG: number;
  propellants: Propellant[];
}

export interface Engine {
  id: string;
  engineName: string;
  class: string;
  baseCost: number;
  basePower: number;
  baseMass: number;
  description: string;
  availableFuels: string[];
  availableModes: string[];
  configs: EngineConfig[];
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

export interface ActiveMission {
  originName: string;
  targetName: string;
  launchDay: number;
  travelTime: number;  // Total days required
  daysElapsed: number; // How far along the route the ship currently is
  reqDv: number;
  telemetry: FlightTelemetry; 
}

// Physical celestial bodies (Planets & Moons)
export interface PlanetDef {
  name: string;
  radius: number; // Physical radius in km
  color: string;  // Hex color
  a: number;
  theta0: number;      // Orbit distance
  e: number;
  omega: number;
  period: number;
}

export interface MoonDef {
  id: string;
  name: string;
  parentPlanet: string; // Strictly a Planet name
  radius: number;       // Physical radius in km
  color: string;        // Hex color
  a: number;            // Orbit distance from parent planet
  e: number;
  omega: number;
  period: number;
}

// UI Overlays (Stations & Surface Markers)
export interface PoiDef {
  id: string;
  name: string;
  parentBody: string;   // Can be a Planet OR a Moon name
  type: "station" | "surface";
  uiColor?: string;     // Optional hex color for the HTML dot/text
  a: number;            // Orbit distance from parentBody (0 if surface)
  e: number;
  omega: number;
  period: number;
  connections: string[];
}