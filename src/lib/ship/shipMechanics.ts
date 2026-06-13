import constants from '../../data/constants.json';

export type ShipCostScale = {
  costMult: number;
};

function booleanFlag(value: unknown) {
  return value === true || value === 'TRUE';
}

export function numericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function isCoreSystem(item: Record<string, unknown>) {
  return 'reactorType' in item || 'engineName' in item || 'parentEngine' in item;
}

function getClassCostMultiplier(className: unknown) {
  if (typeof className !== 'string') return 1;
  return constants.find((constant) => constant.hullClass === className)?.costMult ?? 1;
}

export function calculateShipItemCost(item: Record<string, unknown>, scale: ShipCostScale) {
  const weaponCost = numericValue(item.weaponCost);
  if (weaponCost !== undefined) {
    const minimumClassCostMult = getClassCostMultiplier(item.class);
    return (weaponCost / minimumClassCostMult) * scale.costMult;
  }

  const baseCost = numericValue(item.cost ?? item.baseCost) ?? 0;
  const scales = isCoreSystem(item) || booleanFlag(item.hasScaleCost);
  return scales ? baseCost * scale.costMult : baseCost;
}
