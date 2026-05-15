import { shipState } from './shipState.svelte';

const FILE_HEADER = 'DEIMOS-V1|';

export const shipCodec = {
  exportToFile() {
    const payload = {
      name: shipState.name,
      hull: shipState.hull,
      reactor: shipState.reactor,
      engine: shipState.engine,

      components: shipState.components.map(c => ({
        item: c.item,
        category: c.category,
        id: c.id,
        quantity: c.quantity
      }))
    };

    const jsonStr = JSON.stringify(payload);
    const encodedData = btoa(encodeURIComponent(jsonStr));
    const finalFileContent = `${FILE_HEADER}${encodedData}`;

    const blob = new Blob([finalFileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;

    a.download = `${shipState.name.replace(/\s+/g, '_')}.deimos`;
    document.body.appendChild(a);
    a.click();
    
    // 5. Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // --- IMPORT FROM FILE ---
  importFromFile(file: File) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;

      // 1. Verify the Security Header
      if (!content.startsWith(FILE_HEADER)) {
        alert("CRITICAL ERROR: Corrupted or invalid .deimos file.");
        return;
      }

      try {
        // 2. Strip the header and decode
        const encodedData = content.substring(FILE_HEADER.length);
        const jsonStr = decodeURIComponent(atob(encodedData));
        const payload = JSON.parse(jsonStr);

        // 3. Inject the payload back into the live ShipState
        shipState.name = payload.name;
        shipState.hull = payload.hull;
        shipState.reactor = payload.reactor;
        shipState.engine = payload.engine;
        shipState.components = payload.components;
        
      } catch (error) {
        alert("DECRYPTION FAILED: The file archive has been tampered with.");
        console.error(error);
      }
    };

    reader.readAsText(file);
  }
};