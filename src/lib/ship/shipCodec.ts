import { shipState, MasterShipState } from '../states/shipState.svelte';

const FILE_HEADER = 'DEIMOS-V1|';

export const shipCodec = {
  exportToFile(state: MasterShipState = shipState) {
    const payload = {
      // 1. The Blueprint Data
      name: state.blueprint.name,
      hull: state.blueprint.hull,
      reactor: state.blueprint.reactor,
      engine: state.blueprint.engine,
      components: state.blueprint.components.map(c => ({
        item: c.item,
        category: c.category,
        id: c.id,
        quantity: c.quantity,
        status: c.status // In case you add component damage later!
      })),
      
      // 2. The LIVE Tracker Data
      currentHealth: state.vitals.currentHealth,
      currentRI: state.vitals.currentRI,
      activeConditions: state.vitals.activeConditions,
      activeFuel: state.propulsion.activeFuel,
      activeMode: state.propulsion.activeMode,
      currentFuel: state.propulsion.currentFuel
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

  importFromFile(file: File, state: MasterShipState = shipState): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;

        if (!content.startsWith(FILE_HEADER)) {
          const error = new Error("CRITICAL ERROR: Corrupted or invalid .deimos file.");
          alert(error.message);
          reject(error);
          return;
        }

        try {
          const encodedData = content.substring(FILE_HEADER.length);
          const jsonStr = decodeURIComponent(atob(encodedData));
          const payload = JSON.parse(jsonStr);

          // 1. Load Blueprint Data
          state.blueprint.name = payload.name;
          state.blueprint.hull = payload.hull;
          state.blueprint.reactor = payload.reactor;
          state.blueprint.engine = payload.engine;
          state.blueprint.components = payload.components;

          // 2. Load LIVE Tracker Data (With safety fallbacks for old save files!)
          // If an old save file doesn't have currentHealth, it defaults to max hull health
          state.vitals.currentHealth = payload.currentHealth ?? state.blueprint.hull.health;
          
          // If it doesn't have RI, default to max RI
          state.vitals.currentRI = payload.currentRI ?? (state.blueprint.reactor?.reactorIntegrity || 6);
          
          state.vitals.activeConditions = payload.activeConditions || [];
          state.propulsion.activeFuel = payload.activeFuel || null;
          state.propulsion.activeMode = payload.activeMode || null;
          state.propulsion.currentFuel = payload.currentFuel || {};
          resolve();

        } catch (error) {
          alert("DECRYPTION FAILED: The file archive has been tampered with.");
          console.error(error);
          reject(error);
        }
      };

      reader.onerror = () => {
        const error = reader.error ?? new Error("Failed to read ship archive.");
        reject(error);
      };

      reader.readAsText(file);
    });
  }
};
