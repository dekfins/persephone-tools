class CrewStateManager {
  shipCredits = $state(5000);   // The ship's shared slush fund
  kibbleDays = $state(30);      // Abstracted ship-wide food tracker
  cargo = $state<{ id: string; name: string; rarity: string; quantity: number }[]>([]);
  
  // Individual Player Accounts
  crew = $state<{ id: string; name: string; personalCredits: number }[]>([
    { id: "player_1", name: "PLAYER 1", personalCredits: 500 },
    { id: "player_2", name: "PLAYER 2", personalCredits: 500 },
    { id: "player_3", name: "PLAYER 3", personalCredits: 500 }
  ]);

  // --- LEDGER HELPERS ---
  addShipCredits(amount: number) {
    this.shipCredits += amount;
  }

  spendShipCredits(amount: number): boolean {
    if (this.shipCredits >= amount) {
      this.shipCredits -= amount;
      return true;
    }
    return false;
  }

  spendPersonalCredits(crewId: string, amount: number): boolean {
    const member = this.crew.find(c => c.id === crewId);
    if (member && member.personalCredits >= amount) {
      member.personalCredits -= amount;
      return true;
    }
    return false;
  }

  // Splits mission payouts between the ship's maintenance fund and the crew's pockets
  distributePayout(totalCredits: number, shipCutPercentage: number = 0.5) {
    const shipCut = Math.floor(totalCredits * shipCutPercentage);
    const remainder = totalCredits - shipCut;
    const crewShare = Math.floor(remainder / this.crew.length);

    this.addShipCredits(shipCut);
    for (let member of this.crew) {
      member.personalCredits += crewShare;
    }
  }

  // --- INVENTORY HELPERS ---
  consumeKibble(days: number) {
    this.kibbleDays = Math.max(0, this.kibbleDays - days);
  }

  addCargo(name: string, rarity: string, quantity: number = 1) {
    const existingItem = this.cargo.find(c => c.name === name && c.rarity === rarity);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cargo.push({ id: crypto.randomUUID(), name, rarity, quantity });
    }
  }

  removeCargo(id: string, quantity: number = 1) {
    const itemIndex = this.cargo.findIndex(c => c.id === id);
    if (itemIndex > -1) {
      this.cargo[itemIndex].quantity -= quantity;
      if (this.cargo[itemIndex].quantity <= 0) {
        this.cargo.splice(itemIndex, 1);
      }
    }
  }
}

export const crewState = new CrewStateManager();