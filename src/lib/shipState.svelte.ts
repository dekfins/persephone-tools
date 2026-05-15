import hulls from '../data/hulls.json';
import constants from '../data/constants.json';
import reactors from '../data/reactors.json';
import engines from '../data/engines.json';
import fittings from '../data/fittings.json';
import defenses from '../data/defenses.json';
import weapons from '../data/weapons.json';

class ShipBuilderState {
  name = $state("Unnamed Ship");
  #hull = $state(hulls.find(h => h.hullType === "Free Merchant") as typeof hulls[0]);
  reactor = $state(reactors[0] as typeof reactors[0]);
  engine = $state(engines.find(e => e.parentEngine === "Ion Cluster") as typeof engines[0]);
  components = $state<any[]>([]);
  currentHealth = $state(0);

  constructor() {
    this.currentHealth = this.hull.health; 
  }

  get hull() {
    return this.#hull;
  }

  set hull(newHull: typeof hulls[0]) {
    this.#hull = newHull;
    this.components = [];
    this.currentHealth = newHull.health; // Set to max HP on load
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

    // New item entry
    this.components.push({ item, category, id: crypto.randomUUID(), quantity: 1 });
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
    const coreMass = (this.reactor.baseMass + this.engine.baseMass) * this.multipliers.massPowerMult;
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
    let power = this.engine.basePower * this.multipliers.massPowerMult;

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
    
    const coreCost = (this.reactor.baseCost || 0) + (this.engine.baseCost || 0);
    cost += (coreCost * this.multipliers.costMult);
    
    for (const comp of this.components) {
      // Reuse the logic!
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
}

export const shipState = new ShipBuilderState();