export interface ItemRecord {
  id: string;
  owner_id: string; 
  equipment_id?: string | null;
  name: string;
  category: string;
  rarity: string;
  quantity: number;
  mass: number;
}
