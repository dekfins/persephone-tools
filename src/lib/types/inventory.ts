export type ItemState = 'readied' | 'stowed' | 'stored';

export interface ItemRecord {
  id: string;
  campaign_id?: string | null;
  owner_id: string; 
  equipment_id?: string | null;
  item_state: ItemState;
  name: string;
  category: string;
  rarity: string;
  quantity: number;
  mass: number;
}
