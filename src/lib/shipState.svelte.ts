import hulls from '../data/hulls.json';
import constants from '../data/constants.json';
import reactors from '../data/reactors.json';
import rawEngines from '../data/engines.json'; 
import fittings from '../data/fittings.json';
import defenses from '../data/defenses.json';
import weapons from '../data/weapons.json';
import type { ActiveCondition, Engine } from './types'; 

const engines = rawEngines as unknown as Engine[];

class ShipBuilderState {
  name = $state("Unnamed Ship");
  #hull = $state(hulls.find(h => h.hullType === "Free Merchant") as typeof hulls[0]);
  reactor = $state(reactors[0] as typeof reactors[0]);
  
  _engine = $state<Engine | null>(engines.find(e => e.engineName === "Ion Cluster") || null);
  
  components = $state<any[]>([]);
  currentHealth = $state(0);
  currentRI = $state(0);
  activeConditions = $state<ActiveCondition[]>([]);
  
  // 1. THE PROPULSION UPGRADE
  activeFuel = $state<string | null>(null);
  activeMode = $state<string | null>(null);
  
  // Replaced the single number with a reactive Dictionary
  currentFuel = $state<Record<string, number>>({});

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
    this.currentHealth = newHull.health; 
    this.currentFuel = {}; // 2. SAFETY: Flush tanks when swapping hull
  }

  get engine(): Engine | null {
    return this._engine;
  }

  set engine(newEngine: any) {
    if (!newEngine) {
      this._engine = null;
      return;
    }

    const foundEngine = engines.find(e => 
      (newEngine.id && e.id === newEngine.id) || 
      (newEngine.engineName && e.engineName === newEngine.engineName) || 
      (newEngine.parentEngine && e.engineName === newEngine.parentEngine)
    );
    
    this._engine = foundEngine || null;
    this.currentFuel = {}; // SAFETY: Flush tanks when swapping engines
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
    
    if (!itemName) return;

    const existingIndex = this.components.findIndex(c => {
      const compName = this.getItemName(c.item);
      return compName === itemName;
    });

    if (existingIndex !== -1) {
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

    if (!removeAll && this.components[index].quantity > 1) {
      this.components[index].quantity -= 1;
    } else {
      this.components.splice(index, 1);
    }
  }

  calculateItemCost(item: any): number {
    if (!item) return 0;

    const rawValue = item.cost ?? item.baseCost ?? item.weaponCost ?? 0;
    
    const baseItemCost = typeof rawValue === 'string' 
      ? parseInt(rawValue.replace(/,/g, '')) 
      : rawValue;

    const isCoreSystem = 'reactorType' in item || 'parentEngine' in item;
    const scales = isCoreSystem || item.hasScaleCost === "TRUE" || item.hasScaleCost === true;

    if (scales) {
      return baseItemCost * this.multipliers.costMult;
    }

    return baseItemCost;
  }

  advanceTravelSegment() {
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

    for (const comp of this.components) {
      const name = (comp.item.fittingName || comp.item.name || "").toLowerCase();
      if (name.includes("cargo space")) {
        cargoModules += comp.quantity;
      }
    }

    const hullClass = this.hull?.class?.toLowerCase() || "fighter";
    let multiplier = 0;
    
    if (hullClass === "fighter") multiplier = 2;
    else if (hullClass === "frigate") multiplier = 20;
    else if (hullClass === "cruiser") multiplier = 200;
    else if (hullClass === "capital") multiplier = 2000;

    const baseHullCargo = 0; 
    
    return baseHullCargo + (cargoModules * multiplier);
  }

  // --- PROPULSION EXPORTS ---
  // Helper to grab the currently active engine configuration profile
  get activeConfig() {
    if (!this.engine || !this.activeFuel || !this.activeMode) return null;
    return this.engine.configs.find(
      (c: any) => c.fuel === this.activeFuel && c.mode === this.activeMode
    ) || null;
  }

  // Globally accessible Delta-V budget calculated from current fuel cells
  get totalDV() {
    const config = this.activeConfig;
    if (!config || !config.propellants || config.propellants.length === 0) return 0;

    let potentialDVs = config.propellants.map((prop: any) => {
      const loadedCells = this.currentFuel[prop.name] || 0;
      return loadedCells * prop.efficiency;
    });

    return Math.min(...potentialDVs);
  }

  // Action: Consume fuel for a confirmed flight
  consumeDeltaV(dvSpent: number) {
    const config = this.activeConfig;
    if (!config || !config.propellants) return;

    for (const prop of config.propellants) {
      const unitsToBurn = dvSpent / prop.efficiency;
      if (this.currentFuel[prop.name] !== undefined) {
        // Calculate the raw subtraction
        const rawFuel = Math.max(0, this.currentFuel[prop.name] - unitsToBurn);
        
        // Round to exactly 2 decimal places to prevent floating-point bleed in the UI
        this.currentFuel[prop.name] = Math.round(rawFuel * 100) / 100;
      }
    }
  }
}

export const shipState = new ShipBuilderState();