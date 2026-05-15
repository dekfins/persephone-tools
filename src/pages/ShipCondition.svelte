<script lang="ts">
  import { shipState } from '../lib/shipState.svelte';

  // Helper functions for the GM to quickly adjust HP
  function applyDamage(amount: number) {
    shipState.currentHealth = Math.max(0, shipState.currentHealth - amount);
  }

  function repairHull(amount: number) {
    shipState.currentHealth = Math.min(shipState.hull.health, shipState.currentHealth + amount);
  }
</script>

<div class="condition-layout">
  <header class="tactical-header">
    <h2 class="class-label">[{shipState.hull.hullType.toUpperCase()}] {shipState.name || "UNNAMED SHIP"}</h2>
  </header>
  
  <div class="grid-layout">
    <section class="panel vitals-panel">
      <h3>CORE VITALS</h3>
      
      <div class="stat-row highlight">
        <span>HULL INTEGRITY:</span>
        <div class="hp-controls">
          <button class="btn-dmg" onclick={() => applyDamage(1)}>-1</button>
          <button class="btn-dmg" onclick={() => applyDamage(5)}>-5</button>
          <span class="hp-value">{shipState.currentHealth} / {shipState.hull.health}</span>
          <button class="btn-rep" onclick={() => repairHull(1)}>+1</button>
        </div>
      </div>

      <div class="stat-row">
        <span>ARMOR CLASS (AC):</span>
        <span>{shipState.hull.armorClass}</span> 
      </div>

      <div class="stat-row">
        <span>ARMOR (DMG REDUCTION):</span>
        <span>{shipState.hull.armor}</span>
      </div>
      
      <div class="stat-row">
        <span>SPEED:</span>
        <span>{shipState.hull.speed}</span>
      </div>
    </section>

    <section class="panel systems-panel">
      <h3>INTERNAL SYSTEMS</h3>
      <p class="text-dim">Awaiting component telemetry...</p>
    </section>
  </div>
</div>

<style>
  /* Add your DEIMOS terminal styling here */
  .grid-layout { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
  .panel { border: 1px solid var(--ui-cyan); padding: 1.5rem; }
  .stat-row { display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 1.1rem; }
  .hp-controls { display: flex; gap: 0.5rem; align-items: center; }
  .hp-value { font-weight: bold; color: var(--accent-amber); min-width: 80px; text-align: center; }
  .btn-dmg { color: var(--tactical-red); border-color: var(--tactical-red); }
  .btn-rep { color: var(--ui-bright); border-color: var(--ui-bright); }
</style>