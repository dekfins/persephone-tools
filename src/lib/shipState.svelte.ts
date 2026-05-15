import hulls from '../data/hulls.json';
import constants from '../data/constants.json';
import reactors from '../data/reactors.json';
import rawEngines from '../data/engines.json'; // We import this as raw data
import fittings from '../data/fittings.json';
import defenses from '../data/defenses.json';
import weapons from '../data/weapons.json';
import type { ActiveCondition, Engine } from './types'; // Import the new blueprint

// Force TypeScript to accept the new JSON structure
const engines = rawEngines as unknown as Engine[];

class ShipBuilderState {
  name = $state("Unnamed Ship");
  #hull = $state(hulls.find(h => h.hullType === "Free Merchant") as typeof hulls[0]);
  reactor = $state(reactors[0] as typeof reactors[0]);
  
  // 1. Initialize the engine safely using the NEW key (engineName)
  _engine = $state<Engine | null>(engines.find(e => e.engineName === "Ion Cluster") || null);
  
  components = $state<any[]>([]);
  currentHealth = $state(0);
  currentRI = $state(0);
  activeConditions = $state<ActiveCondition[]>([]);
  
  // 2. The propulsion states (No duplicates!)
  activeFuel = $state<string | null>(null);
  activeMode = $state<string | null>(null);
  currentFuel = $state(0);

  constructor() {
    this.currentHealth = this.hull.health; 
    this.currentRI = this.reactor?.reactorIntegrity || 6;
  }
  get hull() {
    return this.#hull;
  }

  set hull(newHull: typeof hulls[0]) {
    this.#hull = newHull;
    this.components = [];
    this.currentHealth = newHull.health; // Set to max HP on load
  }

  get engine(): Engine | null {
    return this._engine;
  }

  set engine(newEngine: any) {
    if (!newEngine) {
      this._engine = null;
      return;
    }
    
    // LEGACY UPGRADE: If it's an old save file using 'parentEngine', intercept and upgrade it
    if (newEngine.parentEngine && !newEngine.engineName) {
      this._engine = engines.find(e => e.engineName === newEngine.parentEngine) || null;
      return;
    }
    
    // MODERN PATH: If it's selected from the dropdown, it's already the perfect live object. Trust it!
    this._engine = newEngine;
  }

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
    
    // Safety: If no name found, abort
    if (!itemName) return;

    const existingIndex = this.components.findIndex(c => {
      const compName = this.getItemName(c.item);
      // Ensure we only match if both names exist and are the same
      return compName === itemName;
    });

    if (existingIndex !== -1) {
      // Logic for existing items
      if (isDefense || (item.isStackable === "FALSE")) return; 
      
      this.components[existingIndex].quantity += 1;
      return;
    }

    this.components.push({ 
      item, 
      category, 
      id: crypto.randomUUID(), 
      quantity: 1, 
      status: "Online" 
    });
  }

  removeComponent(id: string, removeAll = false) {
    const index = this.components.findIndex(c => c.id === id);
    if (index === -1) return;

    // Check quantity directly on the state proxy
    if (!removeAll && this.components[index].quantity > 1) {
      this.components[index].quantity -= 1;
    } else {
      // Use splice to remove the specific row from the reactive array
      this.components.splice(index, 1);
    }
  }

  calculateItemCost(item: any): number {
    if (!item) return 0;

    // 1. Identify the raw cost value (covers cost, baseCost, price)
    const rawValue = item.cost ?? item.baseCost ?? item.weaponCost ?? 0;
    
    // 2. Clean the value (handling strings or formatted numbers)
    const baseItemCost = typeof rawValue === 'string' 
      ? parseInt(rawValue.replace(/,/g, '')) 
      : rawValue;

    // 3. Determine Scaling
    // Logic: Reactors and Engines ALWAYS scale. 
    // Fittings/Weapons/Defenses only scale if hasScaleCost is TRUE.
    const isCoreSystem = 'reactorType' in item || 'parentEngine' in item;
    const scales = isCoreSystem || item.hasScaleCost === "TRUE" || item.hasScaleCost === true;

    if (scales) {
      return baseItemCost * this.multipliers.costMult;
    }

    return baseItemCost;
  }

  advanceTravelSegment() {
    // Increases the timer on all active conditions
    for (const cond of this.activeConditions) {
      cond.segmentsActive += 1;
    }
  }

  addCondition(conditionTemplate: Omit<ActiveCondition, 'id' | 'segmentsActive'>) {
    this.activeConditions.push({
      ...conditionTemplate,
      id: crypto.randomUUID(),
      segmentsActive: 0
    });
  }

  removeCondition(id: string) {
    this.activeConditions = this.activeConditions.filter(c => c.id !== id);
  }

  get multipliers() {
    return constants.find(c => c.hullClass === this.hull.class)!;
  }

  get availableEngines() {
    const currentTier = this.multipliers.classTier;
    return engines.filter((e: any) => this.getTier(e.class) <= currentTier);
  }

  get totalMass() { return this.hull.mass; }

  get totalPower() { return this.hull.power + this.reactor.basePower * this.multipliers.massPowerMult; }

  get totalHardpoints() { return this.hull.hardpoints; }

  get usedMass() { 
    // Added optional chaining (?.) and a fallback (|| 0)
    const coreMass = (this.reactor.baseMass + (this.engine?.baseMass || 0)) * this.multipliers.massPowerMult;
    let mass = coreMass;

    for (const comp of this.components) {
      const base = comp.item.baseMass ?? comp.item.mass ?? 0;
      let itemMass = base;
      if (comp.item.hasScaleMass === "TRUE") itemMass = base * this.multipliers.massPowerMult;
      mass += itemMass * comp.quantity;
    }
    return mass; 
  }

  get usedPower() { 
    // Added optional chaining (?.) and a fallback (|| 0)
    let power = (this.engine?.basePower || 0) * this.multipliers.massPowerMult;

    for (const comp of this.components) {
      const base = comp.item.basePower ?? comp.item.power ?? 0;
      let itemPower = base;
      if (comp.item.hasScalePower === "TRUE") itemPower = base * this.multipliers.massPowerMult;
      power += itemPower * comp.quantity;
    }
    return power; 
  }

  get usedHardpoints() {
    return this.components.reduce((acc, comp) => acc + ((comp.item.hardpoints || 0) * comp.quantity), 0);
  }

  get remainingMass() { return this.totalMass - this.usedMass; }
  get remainingPower() { return this.totalPower - this.usedPower; }
  get remainingHardpoints() { return this.totalHardpoints - this.usedHardpoints; }
  
  get totalCost() {
    let cost = this.hull.cost;
    
    // Added optional chaining (?.) and a fallback (|| 0)
    const coreCost = (this.reactor.baseCost || 0) + (this.engine?.baseCost || 0);
    cost += (coreCost * this.multipliers.costMult);
    
    for (const comp of this.components) {
      cost += this.calculateItemCost(comp.item) * comp.quantity;
    }
    
    return cost;
  }

  get totalHealth() { 
    let health = this.hull.health;
    for (const comp of this.components) {
      health += (comp.item.healthBonus ?? 0) * comp.quantity;
    }
    return health; 
  }

  get totalArmor() {
    let armor = this.hull.armor;
    for (const comp of this.components) {
      armor += (comp.item.armorBonus ?? 0) * comp.quantity;
    }
    return armor;
  }

  get totalArmorClass() {
    let armorClass = this.hull.armorClass;
    for (const comp of this.components) {
      armorClass += (comp.item.armorClassBonus ?? 0) * comp.quantity;
    }
    return armorClass;
  }

  get totalSpeed() {
    let speed = this.hull.speed;
    for (const comp of this.components) {
      speed += (comp.item.speedBonus ?? 0) * comp.quantity;
    }
    return speed;
  }

  get currentMinCrew() {
    let min = this.hull.minCrew;
    for (const comp of this.components) {
      min += (comp.item.minCrewBonus ?? 0) * comp.quantity;
    }
    return Math.max(0, min);
  }

  get currentMaxCrew() {
    const baseHullCrew = this.hull.maxCrew;
    let flatBonus = 0;
    let multiplierBonus = 0;

    for (const comp of this.components) {
      flatBonus += (comp.item.maxCrewBonus ?? 0) * comp.quantity;
      multiplierBonus += (comp.item.maxCrewMultiplier ?? 0) * comp.quantity;
    }
    return baseHullCrew + flatBonus + Math.floor(baseHullCrew * multiplierBonus);
  }

  get totalCargo() {
    let cargoModules = 0;

    // 1. Find how many "Cargo space" fittings are installed
    for (const comp of this.components) {
      const name = (comp.item.fittingName || comp.item.name || "").toLowerCase();
      if (name.includes("cargo space")) {
        cargoModules += comp.quantity;
      }
    }

    // 2. Determine the multiplier based on the Hull Class
    const hullClass = this.hull?.class?.toLowerCase() || "fighter";
    let multiplier = 0;
    
    if (hullClass === "fighter") multiplier = 2;
    else if (hullClass === "frigate") multiplier = 20;
    else if (hullClass === "cruiser") multiplier = 200;
    else if (hullClass === "capital") multiplier = 2000;

    // 3. Add base hull cargo (if your hulls.json has it) + the calculated module cargo
    const baseHullCargo = 0; 
    
    return baseHullCargo + (cargoModules * multiplier);
  }
}

export const shipState = new ShipBuilderState();