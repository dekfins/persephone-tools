import { supabase } from '../supabaseClient';
import backgrounds from '../../data/character/backgrounds.json';
import type {
  AttributeKey,
  BackgroundDefinitions,
  BackgroundProgress,
  BackgroundProgressGrant,
  BackgroundProgressMode,
  BackgroundRuleEntry,
  BackgroundResolvedChoice,
  BackgroundTableName,
  CharacterCreationArchive,
  CharacterRecord,
  FinalizeCharacterArchiveResult,
  FinalizeInventoryItemFailure,
  ItemRecord,
  PurchasedEquipmentItem,
  Skill
} from '../types';
import {
  getAttributeChoices,
  getEquipmentById,
  getEquipmentDisplayName,
  getEquipmentInventoryCategory,
  getEquipmentInventoryMass,
  getEquipmentInventoryRarity,
  getSkillChoices
} from '../characterConstants';
import { characterCodec } from '../characterCodec';
import { shipState } from './shipState.svelte';
import { campaignState } from './campaignState.svelte';
import { crewState } from './crewState.svelte';

const BACKGROUNDS = backgrounds as BackgroundDefinitions;
const SHIP_INVENTORY_OWNER_ID = 'SHIP_INVENTORY';

type FinalizeInventoryDraft = {
  equipmentId: string;
  name: string;
  quantity: number;
  equipment_id?: string | null;
  category: string;
  rarity: string;
  mass: number;
};

function emptyFinalizeResult(status: FinalizeCharacterArchiveResult['status'], message: string): FinalizeCharacterArchiveResult {
  return {
    success: false,
    status,
    message,
    characterInserted: false,
    inventory: {
      attempted: 0,
      inserted: 0,
      merged: 0,
      skipped: 0,
      failures: []
    }
  };
}

function isBuyableCatalogItem(item: NonNullable<ReturnType<typeof getEquipmentById>>) {
  return Boolean(
    item.app.playerVisible &&
    item.app.spawnable &&
    !item.app.gmOnly &&
    item.legality !== 'removed' &&
    item.availability !== 'removed' &&
    item.cost !== null
  );
}

class DatabaseStateManager {
  activeUserId = $state<string>("char_segarus");
  characters = $state<CharacterRecord[]>([]);
  items = $state<ItemRecord[]>([]);
  localCharacterArchive = $state<CharacterCreationArchive | null>(null);
  #isSubscribed = false;

  // --- RELATIONAL GETTERS ---
  get activeCharacter() {
    if (this.localCharacterArchive) return this.localCharacterArchive.core;
    return this.characters.find(c => c.id === this.activeUserId) || null;
  }

  get localCharacterCreation() {
    return this.localCharacterArchive?.creation ?? null;
  }

  get isLocalCharacterPreview() {
    return Boolean(this.localCharacterArchive);
  }

  get shipInventory() {
    return this.items.filter(item => item.owner_id === SHIP_INVENTORY_OWNER_ID);
  }

  get personalInventory() {
    if (this.localCharacterArchive) {
      const archive = this.localCharacterArchive;
      const previewItems: ItemRecord[] = [];

      archive.creation.equipment.items.forEach((entry, index) => {
        const catalogItem = getEquipmentById(entry.equipmentId);
        if (!catalogItem) return;

        previewItems.push({
          id: `preview-${archive.core.id}-${index}-${entry.equipmentId}`,
          owner_id: archive.core.id,
          equipment_id: entry.equipmentId,
          name: getEquipmentDisplayName(catalogItem, entry.equipmentId),
          category: getEquipmentInventoryCategory(catalogItem),
          rarity: getEquipmentInventoryRarity(catalogItem),
          quantity: this.normalizeSpawnQuantity(entry.quantity),
          mass: getEquipmentInventoryMass(catalogItem)
        });
      });

      archive.creation.equipment.purchasedItems.forEach((entry, index) => {
        const catalogItem = getEquipmentById(entry.equipmentId);
        if (!catalogItem) return;

        previewItems.push({
          id: `preview-${archive.core.id}-purchase-${index}-${entry.equipmentId}`,
          owner_id: archive.core.id,
          equipment_id: entry.equipmentId,
          name: catalogItem.name,
          category: getEquipmentInventoryCategory(catalogItem),
          rarity: getEquipmentInventoryRarity(catalogItem),
          quantity: this.normalizeSpawnQuantity(entry.quantity),
          mass: getEquipmentInventoryMass(catalogItem)
        });
      });

      return previewItems;
    }

    return this.items.filter(item => item.owner_id === this.activeUserId);
  }

  getCharacterById(characterId: string) {
    if (this.localCharacterArchive?.core.id === characterId) return this.localCharacterArchive.core;
    return this.characters.find(c => c.id === characterId) || null;
  }

  normalizeSpawnQuantity(quantity: number) {
    return Math.max(1, Math.floor(Number(quantity)) || 1);
  }

  itemsCanStack(candidate: ItemRecord, target: ItemRecord) {
    if (target.equipment_id) return candidate.equipment_id === target.equipment_id;

    return !candidate.equipment_id &&
      candidate.name === target.name &&
      candidate.category === target.category &&
      candidate.rarity === target.rarity;
  }

  async loadLocalCharacterArchive(file: File) {
    try {
      this.localCharacterArchive = await characterCodec.importFromFile(file);
      return true;
    } catch (error) {
      console.error('Character archive import failed:', error);
      return false;
    }
  }

  clearLocalCharacterPreview() {
    this.localCharacterArchive = null;
  }

  // --- SUPABASE NETWORK CALLS ---
  async loadData() {
    // Fetch Characters
    const { data: charData, error: charErr } = await supabase.from('characters').select('*');
    if (charData) this.characters = charData.map((char) => ({ xp: 0, ...char })) as CharacterRecord[];
    if (charErr) console.error("Error loading characters:", charErr);

    // Fetch Items
    const { data: itemData, error: itemErr } = await supabase.from('items').select('*');
    if (itemData) this.items = itemData;
    if (itemErr) console.error("Error loading items:", itemErr);

    // Fetch Ship Ledger (Hull & Fuel)
    const { data: ledgerData, error: ledgerErr } = await supabase.from('ship_ledger').select('*').eq('id', 'TT-9').single();
    if (ledgerData) {
      if (ledgerData.hp !== null) shipState.vitals.currentHealth = ledgerData.hp;
      if (ledgerData.ri !== null) shipState.vitals.currentRI = ledgerData.ri;
      if (ledgerData.active_fuel) shipState.propulsion.activeFuel = ledgerData.active_fuel;
      if (ledgerData.active_mode) shipState.propulsion.activeMode = ledgerData.active_mode;
      if (ledgerData.fuel_levels) shipState.propulsion.currentFuel = ledgerData.fuel_levels;
      if (ledgerData.ship_credits !== undefined) crewState.shipCredits = ledgerData.ship_credits;
      if (ledgerData.kibble_days !== undefined) crewState.kibbleDays = ledgerData.kibble_days;
      if (ledgerData.active_conditions) shipState.vitals.activeConditions = ledgerData.active_conditions;
      if (ledgerData.components) shipState.blueprint.components = ledgerData.components;
      if (ledgerData.current_day !== undefined) campaignState.currentDay = ledgerData.current_day;
      if (ledgerData.current_location) campaignState.shipLocation = ledgerData.current_location;
      if (ledgerData.active_flight !== undefined) campaignState.activeMission = ledgerData.active_flight;
    }
    if (ledgerErr) console.error("Error loading ship ledger:", ledgerErr);
  }

  async syncShipStateToCloud() {
    const payload = {
      hp: shipState.vitals.currentHealth,
      ri: shipState.vitals.currentRI,
      active_fuel: shipState.propulsion.activeFuel,
      active_mode: shipState.propulsion.activeMode,
      fuel_levels: shipState.propulsion.currentFuel,
      active_conditions: shipState.vitals.activeConditions,
      components: shipState.blueprint.components
    };

    const { error } = await supabase
      .from('ship_ledger')
      .update(payload)
      .eq('id', 'TT-9');

    if (error) console.error("GM Error - Failed to sync ship state:", error);
  }

  async syncTimelineToCloud() {
    const payload = {
      current_day: campaignState.currentDay,
      current_location: campaignState.shipLocation,
      active_flight: campaignState.activeMission
    };

    const { error } = await supabase
      .from('ship_ledger')
      .update(payload)
      .eq('id', 'TT-9');

    if (error) console.error("GM Error - Failed to sync timeline:", error);
  }

  subscribeToChanges() {
    if (this.#isSubscribed) return;
    this.#isSubscribed = true;

    supabase
      .channel(`public-db-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          console.log('Real-time Item Change:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const index = this.items.findIndex(i => i.id === payload.new.id);
            if (index !== -1) this.items[index] = payload.new as ItemRecord;
          } 
          else if (payload.eventType === 'INSERT') {
            this.items.push(payload.new as ItemRecord);
          } 
          else if (payload.eventType === 'DELETE') {
            this.items = this.items.filter(i => i.id !== payload.old.id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters' },
        (payload) => {
          console.log('Real-time Character Change:', payload);
          const index = this.characters.findIndex(c => c.id === payload.new.id);
          if (index !== -1) this.characters[index] = payload.new as CharacterRecord;
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ship_ledger' },
        (payload) => {
          console.log('Real-time Ship Ledger Change:', payload);
          if (payload.new.id === 'TT-9') {
            // Update Vitals
            if (payload.new.hp !== null) shipState.vitals.currentHealth = payload.new.hp;
            if (payload.new.ri !== null) shipState.vitals.currentRI = payload.new.ri;

            // Update Fuel
            if (payload.new.active_fuel) shipState.propulsion.activeFuel = payload.new.active_fuel;
            if (payload.new.active_mode) shipState.propulsion.activeMode = payload.new.active_mode;
            if (payload.new.fuel_levels) shipState.propulsion.currentFuel = payload.new.fuel_levels;
            if (payload.new.ship_credits !== undefined) crewState.shipCredits = payload.new.ship_credits;
            if (payload.new.kibble_days !== undefined) crewState.kibbleDays = payload.new.kibble_days;
            if (payload.new.active_conditions) shipState.vitals.activeConditions = payload.new.active_conditions;
            if (payload.new.components) shipState.blueprint.components = payload.new.components;
            if (payload.new.current_day !== undefined) campaignState.currentDay = payload.new.current_day;
            if (payload.new.current_location) campaignState.shipLocation = payload.new.current_location;
            if (payload.new.active_flight !== undefined) campaignState.activeMission = payload.new.active_flight;
          }
        }
      )
      .subscribe();
  }

  async transferItem(itemId: string, newOwnerId: string) {
    const localItem = this.items.find(i => i.id === itemId);
    if (!localItem) return;

    // 1. Check if the destination owner already has this exact item
    const existingStack = this.items.find(i => 
      i.id !== itemId && // Don't match against itself
      i.owner_id === newOwnerId &&
      this.itemsCanStack(i, localItem)
    );

    if (existingStack) {
      // 2a. MERGE STACKS
      const combinedQty = existingStack.quantity + localItem.quantity;
      
      // Optimistic local update
      existingStack.quantity = combinedQty;
      this.items = this.items.filter(i => i.id !== itemId);

      // Tell Supabase to update the existing stack AND delete the old transferred row
      await supabase.from('items').update({ quantity: combinedQty }).eq('id', existingStack.id);
      await supabase.from('items').delete().eq('id', itemId);
      
    } else {
      // 2b. NO STACK EXISTS: Just move the item
      localItem.owner_id = newOwnerId; // Optimistic local update
      const { error } = await supabase
        .from('items')
        .update({ owner_id: newOwnerId })
        .eq('id', itemId);

      if (error) console.error("Failed to transfer item:", error);
    }
  }

  async updatePersonalCredits(characterId: string, amountToAdd: number) {
    const char = this.getCharacterById(characterId);
    if (!char) return;

    const newTotal = char.personal_credits + amountToAdd;
    char.personal_credits = newTotal; // Optimistic local update

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ personal_credits: newTotal })
      .eq('id', characterId);

    if (error) console.error("Failed to update credits:", error);
  }

  async spawnItem(name: string, category: string, rarity: string, mass: number, quantity: number = 1) {
    const normalizedQuantity = this.normalizeSpawnQuantity(quantity);

    // 1. Look for an exact match already in the ship's cargo
    const existingItem = this.items.find(i => 
      i.owner_id === SHIP_INVENTORY_OWNER_ID &&
      !i.equipment_id &&
      i.name.toLowerCase() === name.toLowerCase() &&
      i.category === category &&
      i.rarity === rarity
    );

    if (existingItem) {
      // 2a. STACK IT: Update the quantity of the existing row
      const newQty = existingItem.quantity + normalizedQuantity;
      
      // We must AWAIT the network call to finish updating the cloud
      const { error } = await supabase
        .from('items')
        .update({ quantity: newQty })
        .eq('id', existingItem.id);
      
      if (error) console.error("GM Error - Failed to stack loot:", error);
      
    } else {
      // 2b. NEW ITEM: Insert a brand new row
      // We must AWAIT the network call to finish inserting into the cloud
      const { error } = await supabase
        .from('items')
        .insert({
          owner_id: SHIP_INVENTORY_OWNER_ID,
          name,
          category,
          rarity,
          quantity: normalizedQuantity,
          mass
        });
        
      if (error) console.error("GM Error - Failed to spawn item:", error);
    }
  }

  async spawnCatalogItem(equipmentId: string, quantity: number = 1) {
    const catalogItem = getEquipmentById(equipmentId);
    if (!catalogItem || !catalogItem.app.spawnable) return;

    const normalizedQuantity = this.normalizeSpawnQuantity(quantity);
    const existingItem = this.items.find(i =>
      i.owner_id === SHIP_INVENTORY_OWNER_ID &&
      i.equipment_id === equipmentId
    );

    if (existingItem) {
      const newQty = existingItem.quantity + normalizedQuantity;
      const { error } = await supabase
        .from('items')
        .update({ quantity: newQty })
        .eq('id', existingItem.id);

      if (error) console.error("GM Error - Failed to stack catalog item:", error);
      return;
    }

    const { error } = await supabase
      .from('items')
      .insert({
        equipment_id: equipmentId,
        owner_id: SHIP_INVENTORY_OWNER_ID,
        name: catalogItem.name,
        category: getEquipmentInventoryCategory(catalogItem),
        rarity: getEquipmentInventoryRarity(catalogItem),
        quantity: normalizedQuantity,
        mass: getEquipmentInventoryMass(catalogItem)
      });

    if (error) console.error("GM Error - Failed to spawn catalog item:", error);
  }

  getArchivePurchasedSpent(archive: CharacterCreationArchive) {
    return archive.creation.equipment.purchasedItems.reduce((total, entry) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      return total + (catalogItem?.cost ?? 0) * this.normalizeSpawnQuantity(entry.quantity);
    }, 0);
  }

  validateArchivePurchasedItems(archive: CharacterCreationArchive) {
    const failures: FinalizeInventoryItemFailure[] = [];

    archive.creation.equipment.purchasedItems.forEach((entry) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      const quantity = Number(entry.quantity);

      if (!catalogItem) {
        failures.push({
          equipmentId: entry.equipmentId,
          name: entry.equipmentId,
          quantity: this.normalizeSpawnQuantity(quantity),
          reason: 'Missing catalog item.'
        });
        return;
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        failures.push({
          equipmentId: entry.equipmentId,
          name: catalogItem.name,
          quantity,
          reason: 'Invalid quantity.'
        });
      }

      if (!isBuyableCatalogItem(catalogItem)) {
        failures.push({
          equipmentId: entry.equipmentId,
          name: catalogItem.name,
          quantity: this.normalizeSpawnQuantity(quantity),
          reason: 'Catalog item is not available for player purchase.'
        });
      }
    });

    const remainingCredits = archive.creation.equipment.startingCredits - this.getArchivePurchasedSpent(archive);
    if (remainingCredits < 0) {
      failures.push({
        equipmentId: 'credits',
        name: 'Starting credits',
        quantity: 1,
        reason: 'Purchased cart exceeds starting credits.'
      });
    }

    return {
      valid: failures.length === 0,
      remainingCredits,
      failures
    };
  }

  buildFinalizeInventoryDrafts(archive: CharacterCreationArchive): FinalizeInventoryDraft[] {
    const drafts: FinalizeInventoryDraft[] = [];

    archive.creation.equipment.items.forEach((entry) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      if (!catalogItem) return;

      drafts.push({
        equipmentId: entry.equipmentId,
        equipment_id: entry.equipmentId,
        name: getEquipmentDisplayName(catalogItem, entry.equipmentId),
        category: getEquipmentInventoryCategory(catalogItem),
        rarity: getEquipmentInventoryRarity(catalogItem),
        quantity: this.normalizeSpawnQuantity(entry.quantity),
        mass: getEquipmentInventoryMass(catalogItem)
      });
    });

    archive.creation.equipment.purchasedItems.forEach((entry: PurchasedEquipmentItem) => {
      const catalogItem = getEquipmentById(entry.equipmentId);
      if (!catalogItem) return;

      drafts.push({
        equipmentId: entry.equipmentId,
        equipment_id: entry.equipmentId,
        name: catalogItem.name,
        category: getEquipmentInventoryCategory(catalogItem),
        rarity: getEquipmentInventoryRarity(catalogItem),
        quantity: this.normalizeSpawnQuantity(entry.quantity),
        mass: getEquipmentInventoryMass(catalogItem)
      });
    });

    return drafts;
  }

  async finalizeInventoryForCharacter(characterId: string, drafts: FinalizeInventoryDraft[]) {
    const result = {
      attempted: drafts.length,
      inserted: 0,
      merged: 0,
      skipped: 0,
      failures: [] as FinalizeInventoryItemFailure[]
    };

    for (const draft of drafts) {
      if (draft.quantity < 1) {
        result.skipped += 1;
        result.failures.push({
          equipmentId: draft.equipmentId,
          name: draft.name,
          quantity: draft.quantity,
          reason: 'Invalid quantity.'
        });
        continue;
      }

      const existingItem = this.items.find((item) => {
        if (item.owner_id !== characterId) return false;
        return this.itemsCanStack(item, {
          id: 'finalize-candidate',
          owner_id: characterId,
          equipment_id: draft.equipment_id,
          name: draft.name,
          category: draft.category,
          rarity: draft.rarity,
          quantity: draft.quantity,
          mass: draft.mass
        });
      });

      if (existingItem) {
        const nextQuantity = existingItem.quantity + draft.quantity;
        const { error } = await supabase
          .from('items')
          .update({ quantity: nextQuantity })
          .eq('id', existingItem.id);

        if (error) {
          result.failures.push({
            equipmentId: draft.equipmentId,
            name: draft.name,
            quantity: draft.quantity,
            reason: error.message
          });
          continue;
        }

        existingItem.quantity = nextQuantity;
        result.merged += 1;
        continue;
      }

      const { data, error } = await supabase
        .from('items')
        .insert({
          equipment_id: draft.equipment_id,
          owner_id: characterId,
          name: draft.name,
          category: draft.category,
          rarity: draft.rarity,
          quantity: draft.quantity,
          mass: draft.mass
        })
        .select()
        .single();

      if (error) {
        result.failures.push({
          equipmentId: draft.equipmentId,
          name: draft.name,
          quantity: draft.quantity,
          reason: error.message
        });
        continue;
      }

      if (data) this.items.push(data as ItemRecord);
      result.inserted += 1;
    }

    return result;
  }

  async finalizeLocalCharacterArchive(): Promise<FinalizeCharacterArchiveResult> {
    if (!this.localCharacterArchive) {
      return emptyFinalizeResult('no_archive', 'No local character archive loaded.');
    }

    const archive = this.localCharacterArchive;
    const characterId = archive.core.id;
    const validation = this.validateArchivePurchasedItems(archive);

    if (!validation.valid || validation.remainingCredits < 0) {
      return {
        ...emptyFinalizeResult('invalid_cart', 'Purchased cart validation failed.'),
        characterId,
        inventory: {
          attempted: archive.creation.equipment.purchasedItems.length,
          inserted: 0,
          merged: 0,
          skipped: 0,
          failures: validation.failures
        }
      };
    }

    const { data: existingCharacters, error: existingError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', characterId)
      .limit(1);

    if (existingError) {
      return {
        ...emptyFinalizeResult('character_insert_failed', `Failed to check existing character id: ${existingError.message}`),
        characterId
      };
    }

    if ((existingCharacters ?? []).length > 0) {
      return {
        ...emptyFinalizeResult('duplicate_character', `Character id already exists: ${characterId}.`),
        characterId
      };
    }

    const core: CharacterRecord = {
      ...archive.core,
      personal_credits: validation.remainingCredits
    };

    const { data: insertedCharacter, error: insertError } = await supabase
      .from('characters')
      .insert(core)
      .select()
      .single();

    if (insertError) {
      return {
        ...emptyFinalizeResult('character_insert_failed', insertError.message),
        characterId
      };
    }

    if (insertedCharacter) this.characters.push(insertedCharacter as CharacterRecord);

    const inventory = await this.finalizeInventoryForCharacter(characterId, this.buildFinalizeInventoryDrafts(archive));
    const complete = inventory.failures.length === 0;

    return {
      success: complete,
      status: complete ? 'complete' : 'inventory_partial_failure',
      message: complete
        ? 'Character archive finalized.'
        : 'Character inserted, but one or more inventory rows failed.',
      characterId,
      characterInserted: true,
      inventory
    };
  }

  async deleteItem(itemId: string) {
    // Optimistic local update
    this.items = this.items.filter(i => i.id !== itemId);

    // Send the hard delete to Supabase
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) console.error("GM Error - Failed to delete item:", error);
  }

  async updateShipCredits(amountToAdd: number) {
    // 1. Fetch the current slush fund
    const { data, error: fetchErr } = await supabase
      .from('ship_ledger')
      .select('ship_credits')
      .eq('id', 'TT-9')
      .single();

    if (fetchErr || !data) {
      console.error("GM Error - Failed to fetch ship credits:", fetchErr);
      return;
    }

    // 2. Calculate new total (preventing negative credits)
    const newTotal = Math.max(0, data.ship_credits + amountToAdd);

    // 3. Optimistic local update (makes the UI feel instant)
    crewState.shipCredits = newTotal;

    // 4. Push the update to the cloud
    const { error: updateErr } = await supabase
      .from('ship_ledger')
      .update({ ship_credits: newTotal })
      .eq('id', 'TT-9');

    if (updateErr) console.error("GM Error - Failed to update ship credits:", updateErr);
  }

  async updateKibble(amountToAdd: number) {
    // 1. Fetch the current kibble days
    const { data, error: fetchErr } = await supabase
      .from('ship_ledger')
      .select('kibble_days')
      .eq('id', 'TT-9')
      .single();

    if (fetchErr || !data) {
      console.error("GM Error - Failed to fetch kibble:", fetchErr);
      return;
    }

    // 2. Calculate new total (preventing negative kibble)
    const newKibble = Math.max(0, data.kibble_days + amountToAdd);
    
    // Optimistic state correction
    crewState.kibbleDays = newKibble;

    // 3. Push the update to the cloud
    const { error: updateErr } = await supabase
      .from('ship_ledger')
      .update({ kibble_days: newKibble })
      .eq('id', 'TT-9');

    if (updateErr) console.error("GM Error - Failed to update kibble:", updateErr);
  }

  async updateHP(characterId: string, newHP: number) {
    // Optimistic local update
    const char = this.getCharacterById(characterId);
    if (char) char.hp = newHP;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ hp: newHP })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update HP:", error);
  }


  async updateRads(characterId: string, newRads: number) {
    // Optimistic local update
    const char = this.getCharacterById(characterId);
    if (char) char.rads = newRads;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ rads: newRads })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update rads:", error);
  }

  async updateSystemStrain(characterId: string, newSystemStrain: number) {
    const char = this.getCharacterById(characterId);
    if (char) char.system_strain = newSystemStrain;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ system_strain: newSystemStrain })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update system strain:", error);
  }

  async updateXP(characterId: string, newXP: number) {
    const normalizedXP = Math.max(0, Math.floor(Number(newXP)) || 0);
    const char = this.getCharacterById(characterId);
    if (char) char.xp = normalizedXP;

    if (this.localCharacterArchive?.core.id === characterId) return;

    const { error } = await supabase
      .from('characters')
      .update({ xp: normalizedXP })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update XP:", error);
  }

  async updateCharacterSkill(characterId: string, skill: Skill, level: number) {
    const char = this.getCharacterById(characterId);
    if (!char) return;

    const updatedSkills = { ...(char.skills ?? {}) };
    const normalizedLevel = Math.max(-1, Math.min(4, level));

    if (normalizedLevel < 0) {
      delete updatedSkills[skill];
    } else {
      updatedSkills[skill] = normalizedLevel;
    }

    await this.updateCharacter(characterId, { skills: updatedSkills });
  }

  async grantCharacterStat(characterId: string, attribute: AttributeKey, amount: number) {
    const char = this.getCharacterById(characterId);
    if (!char || !char.attributes) return;

    const updatedAttributes = {
      ...char.attributes,
      [attribute]: Math.max(3, Math.min(18, char.attributes[attribute] + amount))
    };

    await this.updateCharacter(characterId, { attributes: updatedAttributes });
  }

  formatBackgroundEntry(entry: BackgroundRuleEntry) {
    if (entry.type === 'skill') return `${entry.value}-0/+1`;
    if (entry.type === 'special') return entry.value;
    return `+${entry.bonus} ${entry.category} stat`;
  }

  getBackgroundRule(characterId: string, table: BackgroundTableName, roll: number) {
    const char = this.getCharacterById(characterId);
    if (!char) return null;

    const background = BACKGROUNDS[char.background];
    const index = roll - 1;
    return background?.[table]?.[index] ?? null;
  }

  getBackgroundProgress(characterId: string) {
    const char = this.getCharacterById(characterId);
    if (!char) return {};

    const progress = char.background_progress ?? {};
    return progress.background === char.background ? progress : {};
  }

  createBackgroundProgress(char: CharacterRecord, mode: BackgroundProgressMode): BackgroundProgress {
    return {
      mode,
      background: char.background,
      baseline: {
        skills: { ...(char.skills ?? {}) },
        attributes: { ...char.attributes }
      },
      choices: [],
      freeSkillApplied: false,
      complete: false,
      updatedAt: new Date().toISOString()
    };
  }

  getActiveBackgroundProgress(char: CharacterRecord, mode: BackgroundProgressMode) {
    const currentProgress = char.background_progress ?? {};

    if (currentProgress.background === char.background && currentProgress.mode) {
      if (currentProgress.mode !== mode) return null;
      return currentProgress;
    }

    return this.createBackgroundProgress(char, mode);
  }

  buildBackgroundGrant(
    char: CharacterRecord,
    entry: BackgroundRuleEntry,
    choice?: BackgroundResolvedChoice
  ) {
    if (entry.type === 'skill') {
      const skill = entry.value;
      const updatedSkills = { ...(char.skills ?? {}) };
      const before = updatedSkills[skill] ?? -1;
      const after = before >= 0 ? Math.min(4, before + 1) : 0;

      updatedSkills[skill] = after;

      return {
        updates: { skills: updatedSkills },
        result: { type: 'skill' as const, target: skill, before, after },
        resolvedSkill: skill
      };
    }

    if (entry.type === 'special') {
      const skill = choice?.skill;
      if (!skill || !getSkillChoices(entry.value).includes(skill)) return null;

      const updatedSkills = { ...(char.skills ?? {}) };
      const before = updatedSkills[skill] ?? -1;
      const after = before >= 0 ? Math.min(4, before + 1) : 0;

      updatedSkills[skill] = after;

      return {
        updates: { skills: updatedSkills },
        result: { type: 'skill' as const, target: skill, before, after },
        resolvedSkill: skill
      };
    }

    const attribute = choice?.attribute;
    if (!attribute || !getAttributeChoices(entry.category).includes(attribute)) return null;

    const updatedAttributes = { ...char.attributes };
    const before = updatedAttributes[attribute];
    const after = Math.max(3, Math.min(18, before + entry.bonus));

    updatedAttributes[attribute] = after;

    return {
      updates: { attributes: updatedAttributes },
      result: { type: 'stat' as const, target: attribute, before, after },
      resolvedAttribute: attribute
    };
  }

  async commitBackgroundGrant(
    characterId: string,
    progress: BackgroundProgress,
    entry: BackgroundRuleEntry,
    source: BackgroundProgressGrant['source'],
    choice?: BackgroundResolvedChoice,
    meta: Pick<BackgroundProgressGrant, 'table' | 'roll' | 'tableIndex'> = {},
    progressUpdates: Partial<BackgroundProgress> = {}
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const grant = this.buildBackgroundGrant(char, entry, choice);
    if (!grant) return false;

    const labelParts = [this.formatBackgroundEntry(entry)];
    if (grant.resolvedSkill && entry.type === 'special') labelParts.push(`-> ${grant.resolvedSkill}`);
    if (grant.resolvedAttribute) labelParts.push(`-> ${grant.resolvedAttribute.toUpperCase()}`);

    const nextGrant: BackgroundProgressGrant = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      label: labelParts.join(' '),
      entry,
      resolvedSkill: grant.resolvedSkill,
      resolvedAttribute: grant.resolvedAttribute,
      result: grant.result,
      ...meta
    };

    const nextProgress: BackgroundProgress = {
      ...progress,
      ...progressUpdates,
      choices: [...(progress.choices ?? []), nextGrant],
      updatedAt: new Date().toISOString()
    };

    await this.updateCharacter(characterId, {
      ...grant.updates,
      background_progress: nextProgress
    });

    return true;
  }

  async startBackgroundSetup(
    characterId: string,
    mode: BackgroundProgressMode,
    choice?: BackgroundResolvedChoice
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, mode);
    if (!progress) return false;

    if (mode === 'quick_skills') {
      await this.updateCharacter(characterId, {
        background_progress: {
          ...progress,
          updatedAt: new Date().toISOString()
        }
      });
      return true;
    }

    if (progress.freeSkillApplied) return true;

    const freeSkill = BACKGROUNDS[char.background].freeSkill;
    if (freeSkill.type === 'special' && !choice?.skill) return false;

    return await this.commitBackgroundGrant(
      characterId,
      progress,
      freeSkill,
      'free',
      choice,
      {},
      { freeSkillApplied: true }
    );
  }

  async applyBackgroundQuickSkills(
    characterId: string,
    choices: Partial<Record<string, BackgroundResolvedChoice>> = {}
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, 'quick_skills');
    if (!progress) return false;

    const entries = BACKGROUNDS[char.background].quickSkills;
    const unresolved = entries.some((entry) => {
      return entry.type === 'special' && !choices[entry.value]?.skill;
    });

    if (unresolved) return false;

    const updatedSkills = { ...(char.skills ?? {}) };
    const quickGrants: BackgroundProgressGrant[] = [];

    for (const entry of entries) {
      const selectedSkill = entry.type === 'skill'
        ? entry.value
        : choices[entry.value]?.skill;

      if (!selectedSkill || !getSkillChoices(entry.type === 'special' ? entry.value : 'Any Skill').includes(selectedSkill)) {
        return false;
      }

      const before = updatedSkills[selectedSkill] ?? -1;
      const after = before >= 0 ? Math.min(4, before + 1) : 0;
      updatedSkills[selectedSkill] = after;

      const labelParts = [this.formatBackgroundEntry(entry)];
      if (entry.type === 'special') labelParts.push(`-> ${selectedSkill}`);

      quickGrants.push({
        id: `${Date.now()}-${quickGrants.length}-${Math.random().toString(36).slice(2, 8)}`,
        source: 'quick',
        label: labelParts.join(' '),
        entry,
        resolvedSkill: selectedSkill,
        result: {
          type: 'skill',
          target: selectedSkill,
          before,
          after
        }
      });
    }

    await this.updateCharacter(characterId, {
      skills: updatedSkills,
      background_progress: {
        ...progress,
        choices: [...(progress.choices ?? []), ...quickGrants],
        complete: true,
        updatedAt: new Date().toISOString()
      }
    });

    return true;
  }

  async applyBackgroundRollSelection(
    characterId: string,
    table: BackgroundTableName,
    roll: number,
    choice?: BackgroundResolvedChoice
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, 'roll_tables');
    if (!progress || !progress.freeSkillApplied) return false;

    const rollCount = (progress.choices ?? []).filter(grant => grant.source === 'roll').length;
    if (rollCount >= 3) return false;

    const entry = this.getBackgroundRule(characterId, table, roll);
    if (!entry) return false;

    const applied = await this.commitBackgroundGrant(
      characterId,
      progress,
      entry,
      'roll',
      choice,
      { table, roll, tableIndex: roll - 1 }
    );

    if (!applied) return false;

    const updatedChar = this.getCharacterById(characterId);
    const updatedProgress = updatedChar?.background_progress;
    const nextRollCount = (updatedProgress?.choices ?? []).filter(grant => grant.source === 'roll').length;

    if (updatedProgress && nextRollCount >= 3) {
      await this.updateCharacter(characterId, {
        background_progress: {
          ...updatedProgress,
          complete: true,
          updatedAt: new Date().toISOString()
        }
      });
    }

    return true;
  }

  async applyBackgroundLearningPick(
    characterId: string,
    tableIndex: number,
    choice?: BackgroundResolvedChoice
  ) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = this.getActiveBackgroundProgress(char, 'pick_learning');
    if (!progress || !progress.freeSkillApplied) return false;

    const learningPickCount = (progress.choices ?? []).filter(grant => grant.source === 'learning_pick').length;
    if (learningPickCount >= 2) return false;

    const pickedIndexes = new Set(
      (progress.choices ?? [])
        .filter(grant => grant.source === 'learning_pick')
        .map(grant => grant.tableIndex)
    );
    if (pickedIndexes.has(tableIndex)) return false;

    const entry = BACKGROUNDS[char.background].learning[tableIndex];
    if (!entry) return false;

    const applied = await this.commitBackgroundGrant(
      characterId,
      progress,
      entry,
      'learning_pick',
      choice,
      { table: 'learning', tableIndex }
    );

    if (!applied) return false;

    const updatedChar = this.getCharacterById(characterId);
    const updatedProgress = updatedChar?.background_progress;
    const nextPickCount = (updatedProgress?.choices ?? []).filter(grant => grant.source === 'learning_pick').length;

    if (updatedProgress && nextPickCount >= 2) {
      await this.updateCharacter(characterId, {
        background_progress: {
          ...updatedProgress,
          complete: true,
          updatedAt: new Date().toISOString()
        }
      });
    }

    return true;
  }

  async resetBackgroundProgress(characterId: string) {
    const char = this.getCharacterById(characterId);
    if (!char) return false;

    const progress = char.background_progress ?? {};
    if (!progress.baseline) {
      await this.updateCharacter(characterId, { background_progress: {} });
      return true;
    }

    await this.updateCharacter(characterId, {
      skills: { ...progress.baseline.skills },
      attributes: { ...progress.baseline.attributes },
      background_progress: {}
    });

    return true;
  }

  async updateCharacter(characterId: string, updates: Partial<CharacterRecord>) {
    // Update local state for immediate feedback
    // const index = this.characters.findIndex(c => c.id === characterId);
    // if (index !== -1) {
    //   this.characters[index] = { ...this.characters[index], ...updates };
    // }
    const char = this.getCharacterById(characterId);
    if (char) Object.assign(char, updates);

    if (this.localCharacterArchive?.core.id === characterId) {
      this.localCharacterArchive = {
        ...this.localCharacterArchive,
        core: { ...this.localCharacterArchive.core, ...updates }
      };
      return;
    }

    // Push to Supabase
    const { error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', characterId);

    if (error) console.error("Update failed:", error);
  }
}

export const dbState = new DatabaseStateManager();
