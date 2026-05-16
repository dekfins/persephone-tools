import type { ActiveMission } from "./types";

class CampaignStateManager {
  currentDay = $state(34); 
  shipLocation = $state("Mars"); 
  
  // Mission Tracking
  activeMission = $state<ActiveMission | null>(null);
  
  // Preview Animation Tracking
  isPreviewing = $state(false);
  previewElapsed = $state(0); 
  previewTravelTime = $state(0);

  // Playback limits
  isPlaying = $state(false);
  simSpeed = $state(1.0);

  get formattedDate() {
    let d = new Date("2526-01-01T12:00:00Z");
    d.setDate(d.getDate() + Math.floor(this.currentDay));
    return d.toISOString().split('T')[0];
  }

  // Action: Advance the campaign by 5 days (or finish the trip)
  advanceSegment() {
    if (!this.activeMission) return;
    
    const remaining = this.activeMission.travelTime - this.activeMission.daysElapsed;
    
    if (remaining <= 5) {
      // Arrive at destination
      this.currentDay += remaining;
      this.shipLocation = this.activeMission.targetName;
      this.activeMission = null; 
    } else {
      // Standard 5-day segment
      this.currentDay += 5;
      this.activeMission.daysElapsed += 5;
    }
  }
}

export const campaignState = new CampaignStateManager();