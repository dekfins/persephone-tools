import { supabase } from '../supabaseClient';
import type { CharacterRecord, ItemRecord } from '../types';
import { shipState } from './shipState.svelte';
import { campaignState } from './campaignState.svelte';
import { crewState } from './crewState.svelte';

class DatabaseStateManager {
  activeUserId = $state<string>("char_segarus");
  characters = $state<CharacterRecord[]>([]);
  items = $state<ItemRecord[]>([]);
  #isSubscribed = false;

  // --- RELATIONAL GETTERS ---
  get activeCharacter() {
    return this.characters.find(c => c.id === this.activeUserId) || null;
  }

  get shipInventory() {
    return this.items.filter(item => item.owner_id === "SHIP_INVENTORY");
  }

  get personalInventory() {
    return this.items.filter(item => item.owner_id === this.activeUserId);
  }

  // --- SUPABASE NETWORK CALLS ---
  async loadData() {
    // Fetch Characters
    const { data: charData, error: charErr } = await supabase.from('characters').select('*');
    if (charData) this.characters = charData;
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
      i.name === localItem.name &&
      i.category === localItem.category &&
      i.rarity === localItem.rarity
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
    const char = this.characters.find(c => c.id === characterId);
    if (!char) return;

    const newTotal = char.personal_credits + amountToAdd;
    char.personal_credits = newTotal; // Optimistic local update

    const { error } = await supabase
      .from('characters')
      .update({ personal_credits: newTotal })
      .eq('id', characterId);

    if (error) console.error("Failed to update credits:", error);
  }

  async spawnItem(name: string, category: string, rarity: string, mass: number, quantity: number = 1) {
    // 1. Look for an exact match already in the ship's cargo
    const existingItem = this.items.find(i => 
      i.owner_id === 'SHIP_INVENTORY' && 
      i.name.toLowerCase() === name.toLowerCase() &&
      i.category === category &&
      i.rarity === rarity
    );

    if (existingItem) {
      // 2a. STACK IT: Update the quantity of the existing row
      const newQty = existingItem.quantity + quantity;
      
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
          owner_id: 'SHIP_INVENTORY',
          name,
          category,
          rarity,
          quantity,
          mass
        });
        
      if (error) console.error("GM Error - Failed to spawn item:", error);
    }
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
    const char = this.characters.find(c => c.id === characterId);
    if (char) char.hp = newHP;

    const { error } = await supabase
      .from('characters')
      .update({ hp: newHP })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update HP:", error);
  }


  async updateRads(characterId: string, newRads: number) {
    // Optimistic local update
    const char = this.characters.find(c => c.id === characterId);
    if (char) char.rads = newRads;

    const { error } = await supabase
      .from('characters')
      .update({ rads: newRads })
      .eq('id', characterId);

    if (error) console.error("GM Error - Failed to update rads:", error);
  }

  async updateCharacter(characterId: string, updates: Partial<CharacterRecord>) {
    // Update local state for immediate feedback
    // const index = this.characters.findIndex(c => c.id === characterId);
    // if (index !== -1) {
    //   this.characters[index] = { ...this.characters[index], ...updates };
    // }
    const char = this.characters.find(c => c.id === characterId);
    if (char) Object.assign(char, updates);

    // Push to Supabase
    const { error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', characterId);

    if (error) console.error("Update failed:", error);
  }
}

export const dbState = new DatabaseStateManager();