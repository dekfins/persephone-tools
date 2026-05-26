import { shipState } from './shipState.svelte';

const FILE_HEADER = 'DEIMOS-V1|';

export const shipCodec = {
  exportToFile() {
    const payload = {
      // 1. The Blueprint Data
      name: shipState.blueprint.name,
      hull: shipState.blueprint.hull,
      reactor: shipState.blueprint.reactor,
      engine: shipState.blueprint.engine,
      components: shipState.blueprint.components.map(c => ({
        item: c.item,
        category: c.category,
        id: c.id,
        quantity: c.quantity,
        status: c.status // In case you add component damage later!
      })),
      
      // 2. The LIVE Tracker Data
      currentHealth: shipState.vitals.currentHealth,
      currentRI: shipState.vitals.currentRI,
      activeConditions: shipState.vitals.activeConditions,
      activeFuel: shipState.propulsion.activeFuel,
      activeMode: shipState.propulsion.activeMode,
      currentFuel: shipState.propulsion.currentFuel
    };

    const jsonStr = JSON.stringify(payload);
    const encodedData = btoa(encodeURIComponent(jsonStr));
    const finalFileContent = `${FILE_HEADER}${encodedData}`;

    const blob = new Blob([finalFileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;

    // The Sanitization Pipeline we built earlier
    const sanitizedFilename = shipState.blueprint.name
      .toLowerCase()
      .trim()
      .replace(/[\s\-\.]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_');

    const finalName = sanitizedFilename || 'unnamed_ship';

    a.download = `${finalName}.deimos`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importFromFile(file: File) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;

      if (!content.startsWith(FILE_HEADER)) {
        alert("CRITICAL ERROR: Corrupted or invalid .deimos file.");
        return;
      }

      try {
        const encodedData = content.substring(FILE_HEADER.length);
        const jsonStr = decodeURIComponent(atob(encodedData));
        const payload = JSON.parse(jsonStr);

        // 1. Load Blueprint Data
        shipState.blueprint.name = payload.name;
        shipState.blueprint.hull = payload.hull;
        shipState.blueprint.reactor = payload.reactor;
        shipState.blueprint.engine = payload.engine;
        shipState.blueprint.components = payload.components;

        // 2. Load LIVE Tracker Data (With safety fallbacks for old save files!)
        // If an old save file doesn't have currentHealth, it defaults to max hull health
        shipState.vitals.currentHealth = payload.currentHealth ?? shipState.blueprint.hull.health;
        
        // If it doesn't have RI, default to max RI
        shipState.vitals.currentRI = payload.currentRI ?? (shipState.blueprint.reactor?.reactorIntegrity || 6);
        
        shipState.vitals.activeConditions = payload.activeConditions || [];
        shipState.propulsion.activeFuel = payload.activeFuel || null;
        shipState.propulsion.activeMode = payload.activeMode || null;
        shipState.propulsion.currentFuel = payload.currentFuel || {};
        
      } catch (error) {
        alert("DECRYPTION FAILED: The file archive has been tampered with.");
        console.error(error);
      }
    };

    reader.readAsText(file);
  }
};