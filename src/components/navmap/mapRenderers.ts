import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { mapPlanets } from './mapDataHelpers';
import type { MappedPlanet, MappedMoon, MappedPoi } from './mapDataHelpers';
import { getTransitTelemetry } from '../../lib/orbitalMath';

const RADIUS_CULL_MAX = 5000;
const hexToNum = (hex: string) => parseInt(hex.replace(/^#/, ''), 16) || 0xffffff;

const labelStyle = new TextStyle({
  fontFamily: 'monospace', 
  fontSize: 48,      // 4x larger for HD oversampling
  fill: 0xeeeeee,
  letterSpacing: 4   
});

export function renderPlanets(
  mappedPlanets: any[],
  planetGraphics: Map<string, { body: Graphics; orbit: Graphics; soi: Graphics; label: Text; hitbox: Graphics }>,
  orbitLayer: Container,
  bodyLayer: Container,
  containerWidth: number,
  containerHeight: number,
  targetPlanetName: string | null,
  hoveredBody: any | null,
  trailOpacity: number,
  onPlanetClick: (planetDef: any) => void,
  onPlanetHover: (planetDef: any | null) => void
) {
  mappedPlanets.forEach(p => {
    // --- 1. INITIALIZATION ---
    if (!planetGraphics.has(p.def.name)) {
      const g = { 
        body: new Graphics(), 
        orbit: new Graphics(), 
        soi: new Graphics(),
        label: new Text({ text: p.def.name.toUpperCase(), style: labelStyle }),
        hitbox: new Graphics()
      };
      
      g.label.scale.set(0.25);
      orbitLayer.addChild(g.orbit);
      bodyLayer.addChild(g.hitbox, g.soi, g.body, g.label);
      
      g.body.eventMode = 'none';

      g.hitbox.eventMode = 'static';
      g.hitbox.cursor = 'pointer';
      g.hitbox.on('pointerdown', (e) => {
        e.stopPropagation();
        onPlanetClick(p.def); 
      });

      planetGraphics.set(p.def.name, g);
    }

    const g = planetGraphics.get(p.def.name)!;

    g.hitbox.on('pointerover', () => onPlanetHover(p.def));
    g.hitbox.on('pointerout', () => onPlanetHover(null));
    g.orbit.clear();
    g.hitbox.clear();

    // --- 2. RENDER SOLID ORBIT ELLIPSE ---
    const subFadeOpacity = Math.min(1, Math.max(0, (p.orbit.rx - 3) / 7));
    
    if (p.def.a > 0 && p.orbit.rx < RADIUS_CULL_MAX && subFadeOpacity > 0) {
      g.orbit.position.set(p.orbit.worldCx, p.orbit.worldCy);
      g.orbit.rotation = p.orbit.rot * (Math.PI / 180);
      
      // Calculate final transparency
      const finalAlpha = trailOpacity * subFadeOpacity;
      
      g.orbit.ellipse(0, 0, p.orbit.rx, p.orbit.ry);
      g.orbit.stroke({ color: hexToNum(p.def.color), width: 1.5, alpha: finalAlpha });
    }

    // --- 3. RENDER SOI ---
    g.soi.clear();
    const screenSoi = p.soiRadius;
    if (screenSoi < Math.max(containerWidth, containerHeight)) {
      const isTargeted = targetPlanetName === p.def.name;      
      const isHovered = hoveredBody?.name === p.def.name || (hoveredBody && 'parentPlanet' in hoveredBody && hoveredBody.parentPlanet === p.def.name);
      if (isTargeted || isHovered) {
        g.soi.circle(p.x, p.y, screenSoi);
        g.soi.stroke({ color: 0x06b6d4, width: 1.5, alpha: 0.8 });
      } else {
        g.soi.circle(p.x, p.y, screenSoi);
        g.soi.stroke({ color: 0x334155, width: 1, alpha: 0.3 });
      }
    }

    // --- 4. RENDER BODY & HITBOX ---
    g.body.clear();
    g.body.circle(0, 0, Math.max(4, p.visualRadius));
    g.body.fill({ color: hexToNum(p.def.color), alpha: 1 });
    g.body.position.set(p.x, p.y); 

    const hitboxRadius = Math.max(15, screenSoi);
    g.hitbox.circle(p.x, p.y, hitboxRadius);
    g.hitbox.fill({ alpha: 0 });

    // --- 5. RENDER LABEL ---
    const isLabelCulled = p.soiRadius > 3000;
    if (!isLabelCulled) {
      g.label.visible = true;
      g.label.alpha = Math.max(0, Math.min(1, 1 - (p.soiRadius - 2000) / 1000));
      g.label.position.set(Math.round(p.x + Math.max(2, p.visualRadius) + 8), Math.round(p.y - 6));
    } else {
      g.label.visible = false;
    }
  });
}

export function renderMoons(
  mappedMoons: any[],
  moonGraphics: Map<string, { body: Graphics; orbit: Graphics; label: Text; soi: Graphics; hitbox: Graphics }>,
  orbitLayer: Container,
  bodyLayer: Container,
  zoom: number,
  orbitScaleMultiplier: number,
  targetPoiId: string | null,
  hoveredBody: any | null,
  trailOpacity: number,
  onMoonClick: (moonDef: any) => void,
  onMoonHover: (moonDef: any | null) => void
) {
  mappedMoons.forEach(m => {
    // --- 1. INITIALIZATION ---
    if (!moonGraphics.has(m.def.id)) {
      const g = { 
        body: new Graphics(), 
        orbit: new Graphics(),
        label: new Text({ text: m.def.name.toUpperCase(), style: labelStyle }),
        soi: new Graphics(),
        hitbox: new Graphics()
      };
      
      g.label.scale.set(0.25);
      orbitLayer.addChild(g.orbit);
      bodyLayer.addChild(g.hitbox, g.soi, g.body, g.label);
      
      g.body.eventMode = 'none';
      g.label.eventMode = 'none';

      g.hitbox.eventMode = 'static';
      g.hitbox.cursor = 'pointer';
      g.hitbox.on('pointerdown', (e) => { e.stopPropagation(); onMoonClick(m.def); });
      g.hitbox.on('pointerover', (e) => { e.stopPropagation(); onMoonHover(m.def); });
      g.hitbox.on('pointerout', (e) => { e.stopPropagation(); onMoonHover(null); });

      moonGraphics.set(m.def.id, g);
    }
    
    const g = moonGraphics.get(m.def.id)!;
    g.orbit.clear(); g.body.clear(); g.soi.clear(); g.hitbox.clear();

    const subFadeOpacity = Math.min(1, Math.max(0, (m.orbit.rx - 3) / 7));
    
    // --- 2. RENDER MOON BODY & SOI ---
    if (subFadeOpacity > 0) {
      const currentScale = (250 / 1.5e12) * zoom * orbitScaleMultiplier;
      const uiRadius = Math.min(15000, Math.max(4, m.def.radius * 1000 * currentScale));
      
      const screenSoi = m.soiRadius || (uiRadius * 4); 
      const isHovered = hoveredBody?.id === m.def.id;
      const isTargeted = targetPoiId === m.def.id;

      if (isHovered || isTargeted) {
        g.soi.circle(m.worldX, m.worldY, screenSoi);
        g.soi.stroke({ color: 0x06b6d4, width: 1.5, alpha: 0.8 * subFadeOpacity });
      } else {
        g.soi.circle(m.worldX, m.worldY, screenSoi);
        g.soi.stroke({ color: 0x334155, width: 1, alpha: 0.3 * subFadeOpacity });
      }

      g.body.position.set(m.worldX, m.worldY);
      g.body.circle(0, 0, uiRadius);
      g.body.fill({ color: hexToNum(m.def.color), alpha: subFadeOpacity });
      const hitboxRadius = Math.max(15, screenSoi);
      g.hitbox.circle(m.worldX, m.worldY, hitboxRadius);
      g.hitbox.fill({ alpha: 0 });

      g.label.visible = true;
      g.label.alpha = subFadeOpacity;
      g.label.position.set(Math.round(m.worldX + uiRadius + 8), Math.round(m.worldY - 6));
    } else {
      g.body.position.set(0, 0); 
      g.label.visible = false;
    }

    // --- 3. RENDER SOLID ORBIT ELLIPSE ---
    if (subFadeOpacity > 0 && m.orbit.rx < RADIUS_CULL_MAX) {
      g.orbit.position.set(m.orbit.worldCx, m.orbit.worldCy);
      g.orbit.rotation = m.orbit.rot * (Math.PI / 180);
      
      const finalAlpha = trailOpacity * subFadeOpacity;
      
      g.orbit.ellipse(0, 0, m.orbit.rx, m.orbit.ry);
      g.orbit.stroke({ color: hexToNum(m.def.color), width: 1.5, alpha: finalAlpha });
    }
  });
}

export function renderPoiOrbits(
  mappedPoiOrbits: any[],
  mappedPlanets: any[], 
  mappedMoons: any[],   
  poiGraphics: Map<string, { orbit: Graphics; body: Graphics; label: Text }>,
  orbitLayer: Container,
  bodyLayer: Container, 
  tailOpacity: number,
  zoom: number,                
  orbitScaleMultiplier: number,
  onPoiClick: (poiDef: any) => void
) {
  const solarScale = (250 / 1.5e12) * zoom * orbitScaleMultiplier;

  mappedPoiOrbits.forEach(poi => {
    
    // --- 1. INITIALIZATION ---
    if (!poiGraphics.has(poi.def.id)) {
      const g = { 
        orbit: new Graphics(), 
        body: new Graphics(),
        label: new Text({ text: poi.def.name.toUpperCase(), style: labelStyle })
      };
      
      g.label.scale.set(0.25);
      orbitLayer.addChild(g.orbit);
      bodyLayer.addChild(g.body, g.label); 
      
      g.body.eventMode = 'static';
      g.body.cursor = 'pointer';
      g.body.on('pointerdown', (e) => { e.stopPropagation(); onPoiClick(poi.def); });
      g.label.eventMode = 'static';
      g.label.cursor = 'pointer';
      g.label.on('pointerdown', (e) => { e.stopPropagation(); onPoiClick(poi.def); });

      poiGraphics.set(poi.def.id, g);
    }
    
    const g = poiGraphics.get(poi.def.id)!;
    g.orbit.clear();
    g.body.clear();

    // --- 2. BULLETPROOF CULLING LOGIC ---
    // Instead of trusting deep properties, we assume it's visible unless proven otherwise
    let poiFade = 1.0;

    // Find parent properties safely
    const parentMoon = mappedMoons.find(m => m.def.name === poi.def.parentBody);
    const parentPlanet = mappedPlanets.find(p => p.def.name === poi.def.parentBody);

    if (parentMoon) {
      // POIs orbiting moons should fade in much later than the moon itself.
      // First, their visibility is capped by the parent moon's fade-in.
      const moonFade = Math.min(1, Math.max(0, (parentMoon.orbit.rx - 3) / 7));
      
      if (poi.def.type === 'station') {
        // For orbiting stations, also fade them based on their own orbit size.
        const poiOrbitFade = Math.min(1, Math.max(0, (poi.orbit.rx - 3) / 7));
        poiFade = Math.min(moonFade, poiOrbitFade);
      } else { // 'surface'
        // For surface locations on moons, fade them IN when the moon itself is large enough on screen.
        const moonUiRadius = Math.min(15000, Math.max(4, parentMoon.def.radius * 1000 * solarScale));
        const surfaceFade = Math.min(1, Math.max(0, (moonUiRadius - 15) / 15)); // Fades when moon radius is 15-30px
        poiFade = Math.min(moonFade, surfaceFade);
      }
    } else if (parentPlanet) {
      // POIs orbiting planets fade in based on their own orbit size (stations) or when zooming into the planet (surface).
      if (poi.def.type === 'station') {
        // For orbiting stations, fade them out as we zoom out (same as moons).
        if (poi.orbit && typeof poi.orbit.rx === 'number') {
          poiFade = Math.min(1, Math.max(0, (poi.orbit.rx - 3) / 7));
        }
      } else { // 'surface'
        // For surface locations, fade them IN when the planet's body is large enough (not based on SOI, which is too early).
        poiFade = Math.min(1, Math.max(0, (parentPlanet.visualRadius - 10) / 10)); // Fades when planet radius is 10-20px
      }
    }

    // --- 3. RENDER POI DOT & LABEL ---
    if (poiFade > 0 && poi.worldX !== undefined && poi.worldY !== undefined) {
      g.body.position.set(poi.worldX, poi.worldY);
      g.body.circle(0, 0, 4); 
      g.body.fill({ color: hexToNum(poi.def.uiColor || '#06b6d4'), alpha: poiFade });

      g.label.visible = true;
      g.label.alpha = poiFade;
      g.label.position.set(Math.round(poi.worldX + 12), Math.round(poi.worldY - 6));
    } else {
      g.body.position.set(0, 0);
      g.label.visible = false;
    }

    // --- 4. RENDER SOLID ORBIT ELLIPSE ---
    // Safely check if orbit radius fields exist before drawing the track
    if (poiFade > 0 && poi.orbit && typeof poi.orbit.rx === 'number' && poi.orbit.rx > 0) {
      if (poi.orbit.rx < RADIUS_CULL_MAX) {
        g.orbit.position.set(poi.orbit.worldCx, poi.orbit.worldCy);
        g.orbit.rotation = poi.orbit.rot * (Math.PI / 180);
        
        // For orbital POIs, their orbit line should also fade with them.
        // For surface POIs, this block is skipped anyway (rx=0), but we use poiFade for consistency.
        const finalAlpha = tailOpacity * poiFade;
        
        g.orbit.ellipse(0, 0, poi.orbit.rx, poi.orbit.ry);
        g.orbit.stroke({ color: hexToNum(poi.def.uiColor || '#06b6d4'), width: 1.5, alpha: finalAlpha });
      }
    }
  });
}

export function renderTransitPipeline(
  originPoi: any,
  targetPoi: any,
  activeTrajectory: any,
  activeMission: any,
  currentDay: number,
  zoom: number,
  orbitScaleMultiplier: number,
  trajectoryGraphics: Graphics,
  getPoiState: (id: string, time: number) => { x: number; y: number },
  sharedRefBody: string | null,
  isPreviewing?: boolean,
  previewElapsed?: number,
  animatedDaysElapsed?: number,
  planets?: any[],
  planetScaleMultiplier?: number
) {
  const currentScale = (250 / 1.5e12) * zoom * orbitScaleMultiplier;

  const drawShip = (g: Graphics, x: number, y: number, angle: number, color: number) => {
    const cos = Math.cos(angle); const sin = Math.sin(angle);
    const rotX = (px: number, py: number) => x + px * cos - py * sin;
    const rotY = (px: number, py: number) => y + px * sin + py * cos;

    g.beginPath();
    g.moveTo(rotX(8, 0), rotY(8, 0));
    g.lineTo(rotX(-6, 5), rotY(-6, 5));
    g.lineTo(rotX(-6, -5), rotY(-6, -5));
    g.closePath();
    g.fill({ color }); g.stroke({ color: 0xffffff, width: 0.5 });
  };

  // Helper to dynamically locate the parent Planet on the screen at a given time
  const getPlanetScreen = (timeSec: number) => {
    if (!sharedRefBody || sharedRefBody === "Sun" || !planets || !planetScaleMultiplier) return { x: 0, y: 0 };
    const mapped = mapPlanets(planets, timeSec, zoom, orbitScaleMultiplier, planetScaleMultiplier);
    const p = mapped.find((pl: any) => pl.def.name === sharedRefBody);
    return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
  };

  const drawDynamicTrajectory = (
    launchDay: number, travelTimeDays: number, originId: string, targetId: string,
    isMission: boolean, flightFraction: number
  ) => {
    const launchSec = launchDay * 86400;
    const arrivalSec = (launchDay + travelTimeDays) * 86400;

    // 1. Get POI Absolute World Coordinates
    const launchWorld = getPoiState(originId, launchSec);
    const arrivalWorld = getPoiState(targetId, arrivalSec);

    // 2. Convert POI to Screen Coordinates
    const launchScreen = { x: launchWorld.x * currentScale, y: -launchWorld.y * currentScale };
    const arrivalScreen = { x: arrivalWorld.x * currentScale, y: -arrivalWorld.y * currentScale };

    // 3. Get Planet Screen Coordinates at bounds
    const refLaunchScreen = getPlanetScreen(launchSec);
    const refArrivalScreen = getPlanetScreen(arrivalSec);

    // 4. Calculate POI Local Screen Coordinates (relative to planet)
    const localOriginScreen = { x: launchScreen.x - refLaunchScreen.x, y: launchScreen.y - refLaunchScreen.y };
    const localTargetScreen = { x: arrivalScreen.x - refArrivalScreen.x, y: arrivalScreen.y - refArrivalScreen.y };

    // 5. Anchor the path to the Planet's CURRENT visual position on the screen!
    const currentFrameSec = isMission
      ? (launchDay + (animatedDaysElapsed || 0)) * 86400
      : (currentDay + (isPreviewing ? previewElapsed || 0 : 0)) * 86400;
    const anchorScreen = getPlanetScreen(currentFrameSec);

    const calcScreenPos = (frac: number) => {
      const localX = localOriginScreen.x + (localTargetScreen.x - localOriginScreen.x) * frac;
      const localY = localOriginScreen.y + (localTargetScreen.y - localOriginScreen.y) * frac;
      return { x: localX + anchorScreen.x, y: localY + anchorScreen.y };
    };

    // Draw the Line
    const steps = 64;
    trajectoryGraphics.beginPath();
    for (let i = 0; i <= steps; i++) {
      const pos = calcScreenPos(i / steps);
      if (i === 0) trajectoryGraphics.moveTo(pos.x, pos.y);
      else trajectoryGraphics.lineTo(pos.x, pos.y);
    }

    if (isMission) {
      trajectoryGraphics.stroke({ color: 0x06b6d4, width: 1.5 });
    } else {
      trajectoryGraphics.stroke({ color: 0xef4444, width: 2, alpha: 0.8 });
      const targetArrival = calcScreenPos(1);
      trajectoryGraphics.circle(targetArrival.x, targetArrival.y, 15);
      trajectoryGraphics.stroke({ color: 0xef4444, width: 1.5, alpha: 0.5 });
    }

    if (isMission || isPreviewing) {
      const shipPos = calcScreenPos(flightFraction);
      let angle = 0;
      if (flightFraction < 0.99) {
        const nextPos = calcScreenPos(flightFraction + 0.01);
        angle = Math.atan2(shipPos.y - nextPos.y, shipPos.x - nextPos.x) + Math.PI;
      } else {
        const prevPos = calcScreenPos(flightFraction - 0.01);
        angle = Math.atan2(prevPos.y - shipPos.y, prevPos.x - shipPos.x) + Math.PI;
      }
      drawShip(trajectoryGraphics, shipPos.x, shipPos.y, angle, 0x06b6d4);
    }
  };

  if (activeMission) {
    const flight = getTransitTelemetry(animatedDaysElapsed || 0, activeMission.telemetry);
    drawDynamicTrajectory(activeMission.launchDay, activeMission.travelTime, activeMission.originName, activeMission.targetName, true, flight.fraction);
  } else if (originPoi && targetPoi && activeTrajectory) {
    const flight = isPreviewing ? getTransitTelemetry(previewElapsed || 0, activeTrajectory.telemetry) : { fraction: 0 };
    drawDynamicTrajectory(currentDay, activeTrajectory.realisticTime, originPoi.id, targetPoi.id, false, flight.fraction);
  }
}