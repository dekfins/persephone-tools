<script lang="ts">
  let { min = $bindable(0), max = $bindable(10) } = $props();

  // Prevent slider thumbs from crossing each other
  function handleMinInput() {
    if (min >= max) min = max - 1;
  }
  function handleMaxInput() {
    if (max <= min) max = min + 1;
  }
</script>

<div class="slider-container">
  <div class="slider-header">
    <span class="label-text">DIFFICULTY:</span>
    <span class="value-text">{min} - {max}</span>
  </div>
  
  <div class="dual-slider-wrapper">
    <div class="track-bg"></div>
    <div 
      class="track-active" 
      style="left: {(min - 1) / 9 * 100}%; right: {100 - ((max - 1) / 9 * 100)}%;">
    </div>
    
    <input type="range" min="1" max="10" bind:value={min} oninput={handleMinInput} class="ghost-slider" />
    <input type="range" min="1" max="10" bind:value={max} oninput={handleMaxInput} class="ghost-slider" />
  </div>

  <div class="slider-labels">
    <span>1</span>
    <span>10</span>
  </div>
</div>

<style>
  .label-text { color: var(--text-dim, #94a3b8); }
  .value-text { color: var(--accent-amber, #f59e0b); }

  .slider-container {
    margin-bottom: 2rem;
  }
  .slider-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    font-family: var(--font-terminal, monospace);
  }
  .dual-slider-wrapper {
    position: relative;
    width: 100%;
    height: 20px;
  }
  .track-bg {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    z-index: 1;
  }
  .track-active {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 4px;
    background: var(--accent-amber, #f59e0b);
    z-index: 2;
  }
  .ghost-slider {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    background: transparent !important;
    pointer-events: none; /* Let clicks pass through the track */
    z-index: 3;
    margin: 0;
  }
  
  /* Make only the thumbs clickable */
  .ghost-slider::-webkit-slider-thumb {
    pointer-events: auto;
  }
  .ghost-slider::-moz-range-thumb {
    pointer-events: auto;
  }

  /* Override widgets.css tracks for this specific slider to keep them invisible */
  .ghost-slider::-webkit-slider-runnable-track { background: transparent !important; }
  .ghost-slider::-moz-range-track { background: transparent !important; }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--accent-amber, #f59e0b);
    font-family: var(--font-terminal, monospace);
  }
</style>