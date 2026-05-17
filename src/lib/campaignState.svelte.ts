import type { ActiveMission, FlightTelemetry } from "./types";

interface HistorySnapshot {
  currentDay: number;
  daysElapsed: number;
  fuelSnapshot: FlightTelemetry;
}

class CampaignStateManager {
  currentDay = $state(34); 
  shipLocation = $state("Mars"); 
  activeMission = $state<ActiveMission | null>(null);
  animatedDaysElapsed = $state(0); 
  
  isPreviewing = $state(false);
  previewElapsed = $state(0); 
  previewTravelTime = $state(0);

  isPlaying = $state(false);
  simSpeed = $state(1.0);

  // MAP CONFIGURATORS (Default orbit spacing to 1.8x to resolve inner system clutter)
  planetScaleMultiplier = $state(1.0); 
  orbitScaleMultiplier = $state(1.8); 

  #historyStack = $state<HistorySnapshot[]>([]);

  get formattedDate() {
    let d = new Date("2526-01-01T12:00:00Z");
    d.setDate(d.getDate() + Math.floor(this.currentDay));
    return d.toISOString().split('T')[0];
  }

  initiateTransit(mission: ActiveMission) {
    this.activeMission = mission;
    this.animatedDaysElapsed = 0; 
    this.#historyStack = []; 
  }

  advanceSegment() {
    if (!this.activeMission) return;
    
    // Push frame backup to array stack
    this.#historyStack.push({
      currentDay: this.currentDay,
      daysElapsed: this.activeMission.daysElapsed,
      fuelSnapshot: { ...this.activeMission.telemetry } // Placeholder, wired to engineering
    });

    const remaining = this.activeMission.travelTime - this.activeMission.daysElapsed;
    if (remaining <= 5) {
      this.currentDay += remaining;
      this.activeMission.daysElapsed += remaining;
    } else {
      this.currentDay += 5;
      this.activeMission.daysElapsed += 5;
    }
  }

  revertSegment() {
    if (!this.activeMission || this.#historyStack.length === 0) return;
    const lastState = this.#historyStack.pop();
    if (lastState) {
      this.currentDay = lastState.currentDay;
      this.activeMission.daysElapsed = lastState.daysElapsed;
    }
  }

  get hasUndoBackup() {
    return this.#historyStack.length > 0;
  }

  updateAnimationEasing(dt: number) {
    if (!this.activeMission) return;
    const target = this.activeMission.daysElapsed;
    const diff = target - this.animatedDaysElapsed;

    if (Math.abs(diff) > 0.001) {
      this.animatedDaysElapsed += diff * (dt * 6); 
    } else {
      this.animatedDaysElapsed = target;
      if (this.activeMission.daysElapsed >= this.activeMission.travelTime) {
        this.shipLocation = this.activeMission.targetName;
        this.activeMission = null;
        this.#historyStack = [];
      }
    }
  }
}

export const campaignState = new CampaignStateManager();