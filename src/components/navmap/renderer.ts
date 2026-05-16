import { getPlanetState } from '../../lib/orbitalMath';
import { THEME } from './theme';
import type { PlanetDef } from '../../lib/types';

export function drawNavMap(
  context: CanvasRenderingContext2D,
  canvasEl: HTMLCanvasElement,
  state: {
    planets: PlanetDef[];
    campaignState: any; // Passed in dynamically
    originPlanet: PlanetDef | null;
    targetPlanet: PlanetDef | null;
    activeTrajectory: any;
    zoom: number;
    offsetX: number;
    offsetY: number;
  }
) {
  const { planets, campaignState, originPlanet, targetPlanet, activeTrajectory, zoom, offsetX, offsetY } = state;

  context.clearRect(0, 0, canvasEl.width, canvasEl.height);

  const cx = (canvasEl.width / 2) + offsetX;
  const cy = (canvasEl.height / 2) + offsetY;
  const baseScale = 250 / 1.5e12; 
  const currentScale = baseScale * zoom;
  
  const displayDay = campaignState.currentDay + (campaignState.isPreviewing ? campaignState.previewElapsed : 0);
  const elapsedSeconds = displayDay * 86400;

  // 1. Draw Planets & Orbits
  planets.forEach(p => {
    const s = getPlanetState(p, elapsedSeconds);
    const px = cx + (s.x * currentScale);
    const py = cy - (s.y * currentScale);
    const r = Math.max(2, (p.name === 'Sun' ? 10 : p.size) * zoom);

    if (p.a > 0) {
      const b = p.a * Math.sqrt(1 - p.e * p.e);
      const focusDist = p.a * p.e;
      const centerX = cx - (focusDist * Math.cos(p.omega) * currentScale);
      const centerY = cy + (focusDist * Math.sin(p.omega) * currentScale);

      context.beginPath();
      context.ellipse(centerX, centerY, p.a * currentScale, b * currentScale, -p.omega, 0, 2 * Math.PI);
      context.strokeStyle = (p.name.toLowerCase() === 'persephone' || p.e > 0.5) ? THEME.orbitPersephone : THEME.orbitDefault;
      context.lineWidth = 2; 
      if (p.e > 0.5) context.setLineDash([5, 5]);
      context.stroke();
      context.setLineDash([]);
      context.lineWidth = 1; 
    }

    context.beginPath();
    context.arc(px, py, r, 0, Math.PI * 2);
    context.fillStyle = p.name === 'Sun' ? THEME.amber : p.color; 
    context.fill();

    if (p === originPlanet) {
      context.beginPath(); context.arc(px, py, r + 5, 0, Math.PI * 2);
      context.strokeStyle = THEME.cyan; context.lineWidth = 2; context.stroke();
    } else if (p === targetPlanet) {
      context.beginPath(); context.arc(px, py, r + 5, 0, Math.PI * 2);
      context.strokeStyle = THEME.red; context.lineWidth = 2; context.stroke();
    }

    if (p.name.trim().toLowerCase() !== 'sun') {
      context.font = "10px 'Roboto Mono', monospace";
      context.fillStyle = THEME.textDim;
      context.fillText(p.name.trim().toUpperCase(), px + r + 4, py + 4);
    }
  });

  // 2. Draw Trajectory Plan Overlay
  if (originPlanet && targetPlanet && activeTrajectory && !campaignState.activeMission) {
    const startSec = campaignState.currentDay * 86400;
    const endSec = (campaignState.currentDay + activeTrajectory.realisticTime) * 86400;

    const origPos = getPlanetState(originPlanet, startSec);
    const targetPos = getPlanetState(targetPlanet, endSec);

    const ox = cx + (origPos.x * currentScale);
    const oy = cy - (origPos.y * currentScale);
    const fx = cx + (targetPos.x * currentScale);
    const fy = cy - (targetPos.y * currentScale);

    context.beginPath();
    context.setLineDash([4, 4]);
    context.moveTo(ox, oy);
    context.lineTo(fx, fy);
    context.strokeStyle = THEME.red; 
    context.lineWidth = 2.5; 
    context.stroke();
    context.setLineDash([]);

    const targetRad = Math.max(2, (targetPlanet.name === 'Sun' ? 10 : targetPlanet.size) * zoom);
    context.beginPath();
    context.arc(fx, fy, targetRad + 5, 0, Math.PI * 2);
    context.strokeStyle = THEME.red;
    context.lineWidth = 2;
    context.stroke();
    context.lineWidth = 1; 

    if (campaignState.isPreviewing) {
      // THE UPGRADE: Use true physics to find position
      const fraction = getKinematicFraction(campaignState.previewElapsed, activeTrajectory.telemetry);
      const shipX = ox + fraction * (fx - ox);
      const shipY = oy + fraction * (fy - oy);
      const angle = Math.atan2(fy - oy, fx - ox);
      
      // Draw the triangle ship
      drawShip(context, shipX, shipY, angle);
    }
  }

  // 3. Draw Active Mission In Transit
  if (campaignState.activeMission) {
    const m = campaignState.activeMission;
    const originDef = planets.find(p => p.name === m.originName);
    const targetDef = planets.find(p => p.name === m.targetName);

    if (originDef && targetDef) {
      const startSec = m.launchDay * 86400;
      const endSec = (m.launchDay + m.travelTime) * 86400;

      const origPos = getPlanetState(originDef, startSec);
      const targetPos = getPlanetState(targetDef, endSec);

      const ox = cx + (origPos.x * currentScale);
      const oy = cy - (origPos.y * currentScale);
      const fx = cx + (targetPos.x * currentScale);
      const fy = cy - (targetPos.y * currentScale);

      context.beginPath();
      context.moveTo(ox, oy); context.lineTo(fx, fy);
      context.strokeStyle = THEME.cyan; 
      context.lineWidth = 1.5; 
      context.stroke();

      // THE UPGRADE: Use true physics to find position during actual flight
      const fraction = getKinematicFraction(m.daysElapsed, m.telemetry);
      const shipX = ox + fraction * (fx - ox);
      const shipY = oy + fraction * (fy - oy);
      const angle = Math.atan2(fy - oy, fx - ox);

      // Draw the triangle ship
      drawShip(context, shipX, shipY, angle);
    }
  }
}

// 1. Calculates the true physical position along the route based on acceleration/coasting phases
function getKinematicFraction(elapsedDays: number, telemetry: any) {
  if (!telemetry) return 0;
  const t = elapsedDays * 86400; // Convert current elapsed days to seconds
  const m = telemetry;
  
  if (t <= 0) return 0;
  if (t >= m.totalT) return 1;

  let d = 0;
  if (t <= m.tAccel) {
    // Phase 1: Accelerating (d = 0.5 * a * t^2)
    d = 0.5 * m.accel * t * t;
  } else if (t <= m.tAccel + m.tCoast) {
    // Phase 2: Coasting at vMax
    const tC = t - m.tAccel;
    d = m.sAccel + (m.vMax * tC);
  } else {
    // Phase 3: Decelerating (Flip the formula from the destination backwards)
    const tD = m.totalT - t; // Seconds remaining until arrival
    const dFromEnd = 0.5 * m.accel * tD * tD;
    d = m.dist - dFromEnd;
  }
  
  return Math.max(0, Math.min(1, d / m.dist)); // Return as a percentage of the total distance
}

// 2. Draws the angled triangle ship
function drawShip(context: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle); // Lock orientation to the flight path
  
  context.beginPath();
  context.moveTo(8, 0);     // Nose
  context.lineTo(-6, 5);    // Bottom wing
  context.lineTo(-6, -5);   // Top wing
  context.closePath();
  
  context.fillStyle = THEME.cyan;
  context.fill();
  context.restore();
}