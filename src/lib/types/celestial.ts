// Physical celestial bodies (Planets & Moons)
export interface PlanetDef {
  name: string;
  radius: number; // Physical radius in km
  color: string;  // Hex color
  a: number;
  theta0: number;      // Orbit distance
  e: number;
  omega: number;
  period: number;
}

export interface MoonDef {
  id: string;
  name: string;
  parentPlanet: string; // Strictly a Planet name
  radius: number;       // Physical radius in km
  color: string;        // Hex color
  a: number;            // Orbit distance from parent planet
  e: number;
  omega: number;
  period: number;
}

// UI Overlays (Stations & Surface Markers)
export interface PoiDef {
  id: string;
  name: string;
  parentBody: string;   // Can be a Planet OR a Moon name
  type: "station" | "surface";
  uiColor?: string;     // Optional hex color for the HTML dot/text
  a: number;            // Orbit distance from parentBody (0 if surface)
  e: number;
  omega: number;
  period: number;
  connections: string[];
}