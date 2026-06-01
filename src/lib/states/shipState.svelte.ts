import hulls from '../../data/ship/hulls.json';
import constants from '../../data/constants.json';
import reactors from '../../data/ship/reactors.json';
import rawEngines from '../../data/ship/engines.json'; 
import type { ActiveCondition, Engine } from '../types'; 

const engines = rawEngines as unknown as Engine[];

// --- 1. THE BLUEPRINT ---
// Only cares about the physical design, components, and maximum limits
export class ShipBlueprint {
  name = $state("Unnamed Ship");
  #hull = $state(hulls.find(h => h.hullType === "Free Merchant") as typeof hulls[0]);
  #reactor = $state(reactors[0] as typeof reactors[0]);
  _engine = $state<Engine | null>(engines.find(e => e.engineName === "Ion Cluster") || null);
  components = $state<any[]>([]);

  // Callbacks to safely tell the rest of the ship when core parts change
  onHullChange: (hull: typeof hulls[0]) => void = () => {};
  onEngineChange: () => void = () => {};

  get hull(): typeof hulls[0] { return this.#hull; }
  set hull(newHull: typeof hulls[0] | null) {
    if (!newHull?.hullType) return; // A ship must have a hull. Do not process null/undefined or malformed objects.

    // Re-find the hull from the master list to ensure we have a full, clean object.
    const foundHull = hulls.find(h => h.hullType === newHull.hullType);
    if (!foundHull) return; // Hull from save/payload not found in game data.

    this.#hull = foundHull;
    this.components = []; // Side-effect: changing hull clears components.
    this.onHullChange(foundHull);
  }

  get reactor(): typeof reactors[0] { return this.#reactor; }
  set reactor(newReactor: typeof reactors[0] | null) {
    if (!newReactor?.reactorType) return; // A ship must have a reactor.

    const foundReactor = reactors.find(r => r.reactorType === newReactor.reactorType);
    if (foundReactor) this.#reactor = foundReactor;
  }

  get engine(): Engine | null { return this._engine; }
  set engine(newEngine: any) {
    if (!newEngine) {
      this._engine = null;
    } else {
      const foundEngine = engines.find(e => 
        (newEngine.id && e.id === newEngine.id) || 
        (newEngine.engineName && e.engineName === newEngine.engineName) || 
        (newEngine.parentEngine && e.engineName === newEngine.parentEngine)
      );
      this._engine = foundEngine || null;
    }
    this.onEngineChange();
  }

  get multipliers() { return constants.find(c => c.hullClass === this.hull.class)!; }
  
  getTier(className: string) {
    const match = constants.find(c => c.hullClass === className);
    return match ? match.classTier : 99;
  }

  private getItemName(item: any) {
    return item.fittingName || item.defenseName || item.weaponName || item.name;
  }

  addComponent(item: any, category: string) {
    const isDefense = category === 'Defense';
    const itemName = this.getItemName(item);
    if (!itemName) return;

    const existingIndex = this.components.findIndex(c => this.getItemName(c.item) === itemName);
    if (existingIndex !== -1) {
      if (isDefense || (item.isStackable === "FALSE")) return; 
      this.components[existingIndex].quantity += 1;
      return;
    }
    this.components.push({ item, category, id: crypto.randomUUID(), quantity: 1, status: "Online" });
  }

  removeComponent(id: string, removeAll = false) {
    const index = this.components.findIndex(c => c.id === id);
    if (index === -1) return;
    if (!removeAll && this.components[index].quantity > 1) {
      this.components[index].quantity -= 1;
    } else {
      this.components.splice(index, 1);
    }
  }

  calculateItemCost(item: any): number {
    if (!item) return 0;
    const rawValue = item.cost ?? item.baseCost ?? item.weaponCost ?? 0;
    const baseItemCost = typeof rawValue === 'string' ? parseInt(rawValue.replace(/,/g, '')) : rawValue;
    const isCoreSystem = 'reactorType' in item || 'engineName' in item || 'parentEngine' in item;
    const scales = isCoreSystem || item.hasScaleCost === "TRUE" || item.hasScaleCost === true;
    return scales ? baseItemCost * this.multipliers.costMult : baseItemCost;
  }

  get availableEngines() { return engines.filter((e: any) => this.getTier(e.class) <= this.multipliers.classTier); }
  get totalMass() { return this.hull.mass; }
  get totalPower() { return this.hull.power + this.reactor.basePower * this.multipliers.massPowerMult; }
  get totalHardpoints() { return this.hull.hardpoints; }

  get usedMass() { 
    const coreMass = (this.reactor.baseMass + (this.engine?.baseMass || 0)) * this.multipliers.massPowerMult;
    let mass = coreMass;
    for (const comp of this.components) {
      const base = comp.item.baseMass ?? comp.item.mass ?? 0;
      mass += (comp.item.hasScaleMass === "TRUE" ? base * this.multipliers.massPowerMult : base) * comp.quantity;
    }
    return mass; 
  }

  get usedPower() { 
    let power = (this.engine?.basePower || 0) * this.multipliers.massPowerMult;
    for (const comp of this.components) {
      const base = comp.item.basePower ?? comp.item.power ?? 0;
      power += (comp.item.hasScalePower === "TRUE" ? base * this.multipliers.massPowerMult : base) * comp.quantity;
    }
    return power; 
  }

  get usedHardpoints() { return this.components.reduce((acc, comp) => acc + ((comp.item.hardpoints || 0) * comp.quantity), 0); }
  get remainingMass() { return this.totalMass - this.usedMass; }
  get remainingPower() { return this.totalPower - this.usedPower; }
  get remainingHardpoints() { return this.totalHardpoints - this.usedHardpoints; }
  
  get totalCost() {
    let cost = this.hull.cost;
    const coreCost = (this.reactor.baseCost || 0) + (this.engine?.baseCost || 0);
    cost += (coreCost * this.multipliers.costMult);
    for (const comp of this.components) { cost += this.calculateItemCost(comp.item) * comp.quantity; }
    return cost;
  }

  get totalHealth() { return this.hull.health + this.components.reduce((acc, c) => acc + (c.item.healthBonus ?? 0) * c.quantity, 0); }
  get totalArmor() { return this.hull.armor + this.components.reduce((acc, c) => acc + (c.item.armorBonus ?? 0) * c.quantity, 0); }
  get totalArmorClass() { return this.hull.armorClass + this.components.reduce((acc, c) => acc + (c.item.armorClassBonus ?? 0) * c.quantity, 0); }
  get totalSpeed() { return this.hull.speed + this.components.reduce((acc, c) => acc + (c.item.speedBonus ?? 0) * c.quantity, 0); }
  get currentMinCrew() { return Math.max(0, this.hull.minCrew + this.components.reduce((acc, c) => acc + (c.item.minCrewBonus ?? 0) * c.quantity, 0)); }
  
  get currentMaxCrew() {
    const base = this.hull.maxCrew;
    let flat = 0, mult = 0;
    for (const comp of this.components) {
      flat += (comp.item.maxCrewBonus ?? 0) * comp.quantity;
      mult += (comp.item.maxCrewMultiplier ?? 0) * comp.quantity;
    }
    return base + flat + Math.floor(base * mult);
  }

  get totalCargo() {
    const cargoModules = this.components.filter(c => (c.item.fittingName || c.item.name || "").toLowerCase().includes("cargo space")).reduce((acc, c) => acc + c.quantity, 0);
    const m = { "fighter": 2, "frigate": 20, "cruiser": 200, "capital": 2000 }[this.hull.class.toLowerCase()] || 0;
    return cargoModules * m;
  }
}

// --- 2. THE VITALS ---
// Only cares about damage, wear, and tear
export class ShipVitals {
  currentHealth = $state(0);
  currentRI = $state(0);
  activeConditions = $state<ActiveCondition[]>([]);

  advanceTravelSegment() {
    for (const cond of this.activeConditions) cond.segmentsActive += 1;
  }

  addCondition(conditionTemplate: Omit<ActiveCondition, 'id' | 'segmentsActive'>) {
    this.activeConditions.push({ ...conditionTemplate, id: crypto.randomUUID(), segmentsActive: 0 });
  }

  removeCondition(id: string) {
    this.activeConditions = this.activeConditions.filter(c => c.id !== id);
  }
}

// --- 3. THE PROPULSION ---
// Only cares about thrust, fuel modes, and delta-V
export class ShipPropulsion {
  activeFuel = $state<string | null>(null);
  activeMode = $state<string | null>(null);
  currentFuel = $state<Record<string, number>>({});

  constructor(private blueprint: ShipBlueprint) {}

  get activeConfig() {
    if (!this.blueprint.engine || !this.activeFuel || !this.activeMode) return null;
    return this.blueprint.engine.configs.find((c: any) => c.fuel === this.activeFuel && c.mode === this.activeMode) || null;
  }

  get totalDV() {
    const config = this.activeConfig;
    if (!config || !config.propellants || config.propellants.length === 0) return 0;
    let potentialDVs = config.propellants.map((prop: any) => {
      const loadedCells = this.currentFuel[prop.name] || 0;
      return loadedCells * prop.efficiency;
    });
    return Math.min(...potentialDVs);
  }

  consumeDeltaV(dvSpent: number) {
    const config = this.activeConfig;
    if (!config || !config.propellants) return;
    for (const prop of config.propellants) {
      const unitsToBurn = dvSpent / prop.efficiency;
      if (this.currentFuel[prop.name] !== undefined) {
        const rawFuel = Math.max(0, this.currentFuel[prop.name] - unitsToBurn);
        this.currentFuel[prop.name] = Math.round(rawFuel * 100) / 100;
      }
    }
  }
}

// --- 4. THE MASTER UMBRELLA ---
export class MasterShipState {
  blueprint = new ShipBlueprint();
  vitals = new ShipVitals();
  propulsion = new ShipPropulsion(this.blueprint);

  constructor() {
    // 1. Initialize vitals on boot
    this.vitals.currentHealth = this.blueprint.hull.health;
    this.vitals.currentRI = this.blueprint.reactor?.reactorIntegrity || 6;

    // 2. Safely wire side-effects without creating circular dependencies
    this.blueprint.onHullChange = (hull) => {
      this.vitals.currentHealth = hull.health;
      this.propulsion.currentFuel = {};
    };

    this.blueprint.onEngineChange = () => {
      this.propulsion.currentFuel = {};
    };
  }
}

export const shipState = new MasterShipState();

// Factory function to create independent ship state instances
export function createShipState() {
  return new MasterShipState();
}