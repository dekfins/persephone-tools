<script lang="ts" module>
  let activeId = $state<string | null>(null);
</script>

<script lang="ts">
  import { shipState } from '../lib/shipState.svelte';
  let { 
    options, 
    value = $bindable(), 
    labelKey = "label", 
    placeholder = "SELECT...", 
    id, 
    onSelect = undefined 
  } = $props();

  let hoveredOption = $state<any>(null);
  let selectedLabel = $derived(value ? value[labelKey] : placeholder);
  let isOpen = $derived(activeId === id);

  function getClassTag(className: string) {
    return className?.toLowerCase().replace(/\s+/g, '-') || '';
  }

  function getMetadataLine(item: any) {
    const parts = [];

    // 1. Armor Piercing (AP X)
    if (item.armorPiercing && item.armorPiercing > 0) {
      parts.push(`AP ${item.armorPiercing}`);
    }

    // 2. Boolean Tags (FLAK, CLUMSY, CLOUD)
    if (item.isFlak === "TRUE" || item.isFlak === true) parts.push("FLAK");
    if (item.isClumsy === "TRUE" || item.isClumsy === true) parts.push("CLUMSY");
    if (item.isCloud === "TRUE" || item.isCloud === true) parts.push("CLOUD");

    // 3. Ammo (AMMO X)
    if (item.ammoRating && item.ammoRating > 0) {
      parts.push(`AMMO ${item.ammoRating}`);
    }

    // 4. Tech Level (TLX)
    if (item.techLevel) {
      parts.push(`TL${item.techLevel}`);
    }

    // Join everything with a comma. 
    // We add a leading comma if there are tags, to separate them from the CLASS.
    const metaString = parts.join(", ");
    return metaString ? `${metaString}` : "";
  }

  function getScaledValue(baseValue: number | undefined, scaleFlag: any, item: any) {
    if (baseValue === undefined) return 0;
    
    // Core systems (Reactors/Engines) ALWAYS scale. 
    // Others only scale if the JSON flag is TRUE.
    const isCore = 'reactorType' in item || 'parentEngine' in item;
    const scales = isCore || scaleFlag === "TRUE" || scaleFlag === true;

    const result = scales ? baseValue * shipState.multipliers.massPowerMult : baseValue;
    
    // Round to 1 decimal place to keep the "DEIMOS" UI clean
    return Math.round(result * 10) / 10;
  }

  function toggle(event: MouseEvent) {
    // Stop the click from reaching the window listener below
    event.stopPropagation(); 
    
    if (activeId === id) {
      activeId = null; // Toggle closed if clicking the same one
    } else {
      activeId = id;   // Open this one (automatically closing others)
    }
  }

  function selectOption(opt: any) {
    value = opt;
    activeId = null; // Close the menu
    if (onSelect) onSelect(opt);
  }

  // Close everything if the user clicks anywhere else on the screen
  function handleGlobalClick() {
    activeId = null;
  }
</script>

<svelte:window onclick={handleGlobalClick} />

<div class="terminal-select-container">
  <button 
    {id} 
    type="button" 
    class="select-trigger" 
    onclick={toggle} 
    aria-haspopup="listbox" 
    aria-expanded={isOpen}
  >
    {selectedLabel}
    <span class="chevron">▼</span>
  </button>

  {#if isOpen}
    <ul class="options-list">
      {#each options as opt}
        <li 
          onmouseenter={() => hoveredOption = opt}
          onmouseleave={() => hoveredOption = null}
        >
          <button class="option-item" onclick={() => selectOption(opt)}>
            {opt[labelKey]}
          </button>
        </li>
      {/each}
    </ul>

    {#if hoveredOption}
      <aside class="stat-popup">
        <h4>{hoveredOption[labelKey]}</h4>

        <div class="stat-row meta-row">
          <span class="class-tag {getClassTag(hoveredOption.class)}">
            {hoveredOption.class.toUpperCase()}
          </span>
          
          <span class="tags-tl">
            {getMetadataLine(hoveredOption)}
          </span>
        </div>

        {#if hoveredOption.description}
          <p class="stat-desc">
            {hoveredOption.description}
          </p>
          <hr />
        {/if}

        <div class="stat-row">
          <span>COST:</span>
          <span>
            {shipState.calculateItemCost(hoveredOption).toLocaleString()} CR
          </span>
        </div>

        {#if (hoveredOption.basePower !== undefined || hoveredOption.power !== undefined)}
          <div class="stat-row">
            <span>PWR:</span>
            <span>
              {getScaledValue(
                hoveredOption.basePower ?? hoveredOption.power, 
                hoveredOption.hasScalePower, 
                hoveredOption
              )}
            </span>
          </div>
        {/if}

        {#if (hoveredOption.baseMass !== undefined || hoveredOption.mass !== undefined)}
          <div class="stat-row">
            <span>MASS:</span>
            <span>
              {getScaledValue(
                hoveredOption.baseMass ?? hoveredOption.mass, 
                hoveredOption.hasScaleMass, 
                hoveredOption
              )}
            </span>
          </div>
        {/if}

        {#if (hoveredOption.hardpoints !== undefined)}
          <div class="stat-row">
            <span>HARDPOINTS</span>
            <span>{hoveredOption.hardpoints}</span>
          </div>
        {/if}
      </aside>
    {/if}
  {/if}
</div>

<style>
  .terminal-select-container {
    position: relative;
    width: 100%;
    font-family: var(--font-terminal);
  }

  /* The main input area */
  .select-trigger {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--bg-void);
    color: var(--accent-amber);
    border: var(--border-subtle);
    padding: 0.75rem;
    font-size: 0.75rem;
    cursor: pointer;
    text-align: left;
    text-transform: uppercase;
  }

  .select-trigger:focus, .select-trigger:hover {
    border-color: var(--accent-amber);
    background-color: rgba(245, 158, 11, 0.05);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
  }

  .chevron {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  /* The actual dropdown menu */
  .options-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50; /* Ensure it floats above other elements */
    margin: 0;
    padding: 0;
    list-style: none;
    background-color: var(--bg-panel);
    border: 1px solid var(--accent-amber);
    border-top: none;
    max-height: 250px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--accent-amber) var(--bg-panel);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
  }

  /* Each item in the list */
  .option-item {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--text-main);
    padding: 0.75rem;
    cursor: pointer;
    text-transform: uppercase;
  }

  .option-item:hover, .option-item:focus {
    background-color: var(--bg-void);
    color: var(--accent-amber);
  }

  .option-item.selected {
    color: var(--accent-amber);
    font-weight: bold;
  }

  .stat-popup {
    position: absolute;
    /* Push it to the right of the dropdown, with a small gap */
    top: 100%; 
    left: calc(100% + 10px); 
    width: 300px;
    background-color: var(--bg-panel);
    border: 1px solid var(--accent-amber);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
    padding: 1rem;
    z-index: 1000; /* Ensure it's above everything */
    pointer-events: none; /* Prevents the mouse from interacting with the popup itself */
  }

  .stat-popup h4 {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: var(--accent-amber);
  }

  .stat-row {
    display: flex;
    justify-content: flex-start;
    font-size: 0.8rem;
    color: var(--text-main);
    margin-bottom: 0.25rem;
  }
  
  .stat-row span:first-child {
    color: var(--text-dim);
    padding-right: 0.5rem
  }

  .stat-desc {
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--text-main);
    margin: 0.5rem 0;
    white-space: pre-wrap; 
    word-wrap: break-word;
  }

  .meta-row {
    justify-content: flex-start !important; 
    gap: 0; 
  }

  .tags-tl {
    font-size: 0.8rem;
    color: var(--accent-amber);
    text-transform: uppercase;
    padding-left: 1em;
  }

  .class-tag {
    font-weight: bold;
    text-transform: uppercase;
  }

  .stat-popup .class-tag.fighter { color: var(--fighter-green) !important; }
  .stat-popup .class-tag.frigate { color: var(--frigate-blue) !important; }
  .stat-popup .class-tag.cruiser { color: var(--cruiser-purple) !important; }
  .stat-popup .class-tag.capital { color: var(--capital-red) !important; }
</style>