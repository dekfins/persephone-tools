import {
  formatEquipmentCategory,
  getEquipmentInventoryCategory,
  getEquipmentInventoryMass,
  getEquipmentInventoryRarity
} from './characterConstants';
import { calculateShipItemCost, isCoreSystem, numericValue } from './shipMechanics';
import type { EquipmentCatalogItem, InstalledComponent, InstallableItem } from './types';

export type TerminalItemDetail = {
  label: string;
  value: string | number;
  tone?: string;
};

export type TerminalItemListRow = {
  id: string;
  equipmentId?: string | null;
  itemState?: 'readied' | 'stowed' | 'stored';
  name?: string;
  category?: string;
  rarity?: string;
  quantity: number;
  mass?: number;
  displayName?: string;
  weaponDamage?: string;
  typeLabel?: string;
  nameClass?: string;
  meta?: string;
  statusLabel?: string;
  statusClass?: string;
  detailRows?: TerminalItemDetail[];
  description?: string;
  mechanics?: string;
  expandable?: boolean;
};

export type EquipmentItemListRow = TerminalItemListRow;

export type TerminalSelectTooltipStat = {
  label: string;
  value: string | number;
};

export type TerminalSelectTooltip = {
  title?: string;
  tag?: string;
  tagClass?: string;
  metadata?: string[];
  description?: string;
  stats?: TerminalSelectTooltipStat[];
  mechanics?: string;
};

export type TerminalTooltipScale = {
  costMult: number;
  massPowerMult: number;
};

export function formatCredits(value: number | null | undefined) {
  if (value === null || value === undefined) return 'N/A CR';
  return `${value.toLocaleString()} CR`;
}

export function getShipComponentName(item: Partial<InstallableItem> | Record<string, unknown> | null | undefined) {
  if (!item) return 'Unknown component';
  const record = item as Record<string, unknown>;
  return String(record.fittingName ?? record.defenseName ?? record.weaponName ?? record.engineName ?? record.reactorType ?? record.name ?? 'Unknown component');
}

export function getShipClassTag(className: string | undefined | null) {
  return className?.toLowerCase().trim().replace(/\s+/g, '-') || 'unknown';
}

function booleanFlag(value: unknown) {
  return value === true || value === 'TRUE';
}

export function getShipComponentCost(item: Record<string, unknown>, scale: TerminalTooltipScale) {
  return calculateShipItemCost(item, scale);
}

export function getShipScaledMassPowerValue(
  item: Record<string, unknown>,
  baseValue: unknown,
  scaleFlag: unknown,
  scale: TerminalTooltipScale
) {
  const numericBase = numericValue(baseValue);
  if (numericBase === undefined) return undefined;

  const scales = isCoreSystem(item) || booleanFlag(scaleFlag);
  const result = scales ? numericBase * scale.massPowerMult : numericBase;
  return Math.round(result * 10) / 10;
}

export function getShipComponentPower(item: Record<string, unknown>, scale: TerminalTooltipScale) {
  return getShipScaledMassPowerValue(item, item.basePower ?? item.power, item.hasScalePower, scale);
}

export function getShipComponentMass(item: Record<string, unknown>, scale: TerminalTooltipScale) {
  return getShipScaledMassPowerValue(item, item.baseMass ?? item.mass, item.hasScaleMass, scale);
}

export function getShipComponentMetadata(item: Record<string, unknown>) {
  const parts: string[] = [];
  const armorPiercing = numericValue(item.armorPiercing);
  const ammoRating = numericValue(item.ammoRating);

  if (armorPiercing && armorPiercing > 0) parts.push(`AP ${armorPiercing}`);
  if (booleanFlag(item.isFlak)) parts.push('FLAK');
  if (booleanFlag(item.isClumsy)) parts.push('CLUMSY');
  if (booleanFlag(item.isCloud)) parts.push('CLOUD');
  if (ammoRating && ammoRating > 0) parts.push(`AMMO ${ammoRating}`);
  if (item.techLevel !== undefined && item.techLevel !== null && item.techLevel !== '') parts.push(`TL${item.techLevel}`);

  return parts;
}

export function getShipComponentDetailRows(
  item: Record<string, unknown>,
  category: string | undefined,
  scale: TerminalTooltipScale
): TerminalItemDetail[] {
  const details: TerminalItemDetail[] = [];
  const cost = getShipComponentCost(item, scale);
  const power = getShipComponentPower(item, scale);
  const mass = getShipComponentMass(item, scale);

  if (category) details.push({ label: 'TYPE', value: category.toUpperCase() });
  if (item.class) details.push({ label: 'CLASS', value: String(item.class).toUpperCase(), tone: getShipClassTag(String(item.class)) });
  details.push({ label: 'COST', value: formatCredits(cost) });
  if (power !== undefined) details.push({ label: 'PWR', value: power });
  if (mass !== undefined) details.push({ label: 'MASS', value: mass });
  if (item.hardpoints !== undefined) details.push({ label: 'HARDPOINTS', value: String(item.hardpoints) });
  if (item.damage) details.push({ label: 'DAMAGE', value: String(item.damage) });

  return details;
}

export function getShipComponentMeta(item: Record<string, unknown>, quantity: number, scale: TerminalTooltipScale) {
  const details = [
    formatCredits(getShipComponentCost(item, scale) * quantity),
    `Pwr: ${getShipComponentPower(item, scale) ?? 0}`,
    `Mass: ${getShipComponentMass(item, scale) ?? 0}`
  ];

  if (item.hardpoints !== undefined) details.push(`HP: ${item.hardpoints}`);
  return details.join('  ');
}

export function toShipComponentRow(
  component: InstalledComponent,
  scale: TerminalTooltipScale
): TerminalItemListRow {
  const item = component.item as unknown as Record<string, unknown>;
  const nameClass = getShipClassTag(String(item.class ?? 'unknown'));
  const statusLabel = component.status ?? 'Online';

  return {
    id: component.id,
    quantity: component.quantity,
    displayName: getShipComponentName(component.item),
    typeLabel: component.category.toUpperCase(),
    nameClass,
    meta: getShipComponentMeta(item, component.quantity, scale),
    statusLabel,
    statusClass: statusLabel.toLowerCase(),
    detailRows: getShipComponentDetailRows(item, component.category, scale),
    description: typeof item.description === 'string' ? item.description : undefined,
    mechanics: typeof item.attribute === 'string' ? item.attribute : undefined,
    expandable: true
  };
}

export function getEquipmentTooltip(item: EquipmentCatalogItem): TerminalSelectTooltip {
  const stats: TerminalSelectTooltipStat[] = [
    { label: 'TYPE', value: formatEquipmentCategory(item.category) },
    { label: 'INVENTORY', value: getEquipmentInventoryCategory(item).toUpperCase() },
    { label: 'RARITY', value: getEquipmentInventoryRarity(item).toUpperCase() },
    { label: 'COST', value: formatCredits(item.cost) },
    { label: 'TECH', value: item.techLevel === null ? 'TL?' : `TL${item.techLevel}` },
    { label: 'ENC', value: getEquipmentInventoryMass(item) }
  ];

  if (item.weapon) {
    stats.push({ label: 'DAMAGE', value: item.weapon.damage });
    if (item.weapon.range) stats.push({ label: 'RANGE', value: item.weapon.range });
  }

  if (item.armor) {
    stats.push({ label: 'ARMOR', value: `AC ${item.armor.armorClass}` });
  }

  return {
    title: item.name,
    tag: getEquipmentInventoryRarity(item).toUpperCase(),
    tagClass: `loot-${getEquipmentInventoryRarity(item).toLowerCase()}`,
    metadata: [item.techLevel === null ? 'TL?' : `TL${item.techLevel}`, formatEquipmentCategory(item.category)],
    description: item.description,
    mechanics: item.mechanics,
    stats
  };
}

export function getShipComponentTooltip(
  item: Record<string, unknown>,
  label: string,
  scale: TerminalTooltipScale
): TerminalSelectTooltip {
  const stats = getShipComponentDetailRows(item, undefined, scale)
    .map((detail) => ({ label: detail.label, value: detail.value }));

  return {
    title: label,
    tag: item.class ? String(item.class).toUpperCase() : undefined,
    tagClass: item.class ? getShipClassTag(String(item.class)) : undefined,
    metadata: getShipComponentMetadata(item),
    description: typeof item.description === 'string' ? item.description : undefined,
    mechanics: typeof item.attribute === 'string' ? item.attribute : undefined,
    stats
  };
}
