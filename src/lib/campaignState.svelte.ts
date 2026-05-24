import type { ActiveMission, FlightTelemetry, PoiDef } from "./types";
import { shipState } from './shipState.svelte';
import { getTransitTelemetry } from './orbitalMath';
import poisData from '../data/pois.json';

interface HistorySnapshot {
  currentDay: number;
  daysElapsed: number;
  fuelSnapshot: Record<string, number>;
}

const pois = poisData as PoiDef[];

class CampaignStateManager {
  currentDay = $state(34); 
  shipLocation = $state("mars_orbit"); 
  activeMission = $state<ActiveMission | null>(null);
  animatedDaysElapsed = $state(0); 
  
  isPreviewing = $state(false);
  previewElapsed = $state(0); 
  previewTravelTime = $state(0);

  isPlaying = $state(false);
  simSpeed = $state(1.0);

  // MAP CONFIGURATORS (Default orbit spacing to 1.8x to resolve inner system clutter)
  planetScaleMultiplier = $state(1.0);
  orbitScaleMultiplier = $state(1.0);
  orbitTrailOpacity = $state(0.5);

  #historyStack = $state<HistorySnapshot[]>([]);

  get formattedDate() {
    let d = new Date("2526-01-01T12:00:00Z");
    d.setDate(d.getDate() + Math.floor(this.currentDay));
    return d.toISOString().split('T')[0];
  }

  executeLocalHop(targetPoiId: string) {
    const currentPoi = pois.find(p => p.id === this.shipLocation);
    if (!currentPoi) return;
    
    if (currentPoi.connections.includes(targetPoiId)) {
      this.currentDay += 0.25;
      
      // Deduct 0.5 fuel cells of the currently active fuel type
      if (shipState.engine && shipState.activeFuel) {
        const fuelKey = shipState.activeFuel;
        if (shipState.currentFuel[fuelKey] !== undefined) {
          shipState.currentFuel[fuelKey] = Math.max(0, shipState.currentFuel[fuelKey] - 0.5);
        }
      }
      
      this.shipLocation = targetPoiId;
    }
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
      fuelSnapshot: { ...shipState.currentFuel }
    });

    const oldTelemetry = getTransitTelemetry(this.activeMission.daysElapsed, this.activeMission.telemetry);

    const remaining = this.activeMission.travelTime - this.activeMission.daysElapsed;
    if (remaining <= 5) {
      this.currentDay += remaining;
      this.activeMission.daysElapsed += remaining;
    } else {
      this.currentDay += 5;
      this.activeMission.daysElapsed += 5;
    }
    
    const newTelemetry = getTransitTelemetry(this.activeMission.daysElapsed, this.activeMission.telemetry);
    const dvUsed = oldTelemetry.remainingDvKM - newTelemetry.remainingDvKM;
    if (dvUsed > 0) {
      shipState.consumeDeltaV(dvUsed);
    }
    
    shipState.advanceTravelSegment();
  }

  revertSegment() {
    if (!this.activeMission || this.#historyStack.length === 0) return;
    const lastState = this.#historyStack.pop();
    if (lastState) {
      this.currentDay = lastState.currentDay;
      this.activeMission.daysElapsed = lastState.daysElapsed;
      shipState.currentFuel = lastState.fuelSnapshot;
      
      for (const cond of shipState.activeConditions) {
        cond.segmentsActive = Math.max(0, cond.segmentsActive - 1);
      }
    }
  }

  get hasUndoBackup() {
    return this.#historyStack.length > 0;
  }

  updateAnimationEasing(dt: number) {
    if (this.isPreviewing) {
      this.previewElapsed += dt * 6; // Fast-forward preview
      if (this.previewElapsed >= this.previewTravelTime) {
        this.isPreviewing = false;
        this.previewElapsed = 0;
      }
    }

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