<script lang="ts" module>
  let activeId = $state<string | null>(null);
</script>

<script lang="ts">
  import { shipState } from '../../lib/states/shipState.svelte';

  let {
    options,
    value = $bindable(),
    labelKey = 'label',
    placeholder = 'SELECT...',
    id,
    onSelect = undefined,
    popupSide = 'right',
    showPopup = true
  } = $props();

  let searchTerm = $state('');
  let hoveredOption = $state<any>(null);
  let selectedLabel = $derived(value ? value[labelKey] : placeholder);
  let isOpen = $derived(activeId === id);
  let displayValue = $derived(isOpen ? searchTerm : selectedLabel);
  let filteredOptions = $derived.by(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return options;

    return options.filter((opt: any) => String(opt?.[labelKey] ?? '').toLowerCase().includes(query));
  });

  function getClassTag(className: string) {
    return className?.toLowerCase().replace(/\s+/g, '-') || '';
  }

  function getMetadataLine(item: any) {
    const parts = [];

    if (item.armorPiercing && item.armorPiercing > 0) parts.push(`AP ${item.armorPiercing}`);
    if (item.isFlak === 'TRUE' || item.isFlak === true) parts.push('FLAK');
    if (item.isClumsy === 'TRUE' || item.isClumsy === true) parts.push('CLUMSY');
    if (item.isCloud === 'TRUE' || item.isCloud === true) parts.push('CLOUD');
    if (item.ammoRating && item.ammoRating > 0) parts.push(`AMMO ${item.ammoRating}`);
    if (item.techLevel) parts.push(`TL${item.techLevel}`);

    return parts.join(', ');
  }

  function hasMetadataLine(item: any) {
    return Boolean(item?.class || getMetadataLine(item));
  }

  function getTooltipCost(item: any) {
    if (!item) return 0;
    const rawValue = item.cost ?? item.baseCost ?? item.weaponCost ?? 0;
    const baseItemCost = typeof rawValue === 'string' ? parseInt(rawValue.replace(/,/g, '')) : rawValue;
    const isCore = 'reactorType' in item || 'engineName' in item || 'parentEngine' in item;
    const scales = isCore || item.hasScaleCost === 'TRUE' || item.hasScaleCost === true;

    return scales ? baseItemCost * shipState.blueprint.multipliers.costMult : baseItemCost;
  }

  function hasCostMetadata(item: any) {
    if (!item) return false;
    return item.cost !== undefined || item.baseCost !== undefined || item.weaponCost !== undefined;
  }

  function hasNumericMetadata(item: any) {
    if (!item) return false;
    return (
      hasCostMetadata(item) ||
      item.basePower !== undefined ||
      item.power !== undefined ||
      item.baseMass !== undefined ||
      item.mass !== undefined ||
      item.hardpoints !== undefined
    );
  }

  function getScaledValue(baseValue: number | undefined, scaleFlag: any, item: any) {
    if (baseValue === undefined) return 0;

    const isCore = 'reactorType' in item || 'engineName' in item || 'parentEngine' in item;
    const scales = isCore || scaleFlag === 'TRUE' || scaleFlag === true;
    const result = scales ? baseValue * shipState.blueprint.multipliers.massPowerMult : baseValue;

    return Math.round(result * 10) / 10;
  }

  function openSelect(event: MouseEvent | FocusEvent) {
    event.stopPropagation();

    if (activeId !== id) {
      searchTerm = '';
      hoveredOption = null;
      activeId = id;
    }
  }

  function handleInput(event: Event) {
    searchTerm = (event.target as HTMLInputElement).value;
    hoveredOption = null;
    activeId = id;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      activeId = null;
      hoveredOption = null;
      return;
    }

    if (event.key === 'Enter' && filteredOptions.length > 0) {
      event.preventDefault();
      selectOption(filteredOptions[0]);
    }
  }

  function selectOption(opt: any) {
    value = opt;
    searchTerm = '';
    hoveredOption = null;
    activeId = null;
    if (onSelect) onSelect(opt);
  }

  function handleGlobalClick() {
    activeId = null;
    hoveredOption = null;
  }
</script>

<svelte:window onclick={handleGlobalClick} />

<div class="terminal-select-container">
  <div class="select-trigger">
    <input
      {id}
      type="text"
      class="select-input"
      value={displayValue}
      placeholder={isOpen ? selectedLabel : placeholder}
      autocomplete="off"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-controls="{id}-options"
      onfocus={openSelect}
      onclick={openSelect}
      oninput={handleInput}
      onkeydown={handleKeydown}
    />
    <button
      type="button"
      class="chevron-button"
      aria-label="Open options"
      onclick={openSelect}
    >
      V
    </button>
  </div>

  {#if isOpen}
    <ul id="{id}-options" class="options-list" role="listbox">
      {#each filteredOptions as opt}
        <li
          onmouseenter={() => hoveredOption = opt}
          onmouseleave={() => hoveredOption = null}
        >
          <button
            class="option-item"
            class:selected={opt === value}
            role="option"
            aria-selected={opt === value}
            onclick={() => selectOption(opt)}
          >
            {opt[labelKey]}
          </button>
        </li>
      {/each}
      {#if filteredOptions.length === 0}
        <li class="empty-option">NO MATCHES</li>
      {/if}
    </ul>

    {#if hoveredOption && showPopup}
      <aside class="stat-popup {popupSide}">
        <h4>{hoveredOption[labelKey]}</h4>
        {#if hasMetadataLine(hoveredOption)}
          <div class="stat-row meta-row">
            {#if hoveredOption.class}
              <span class="class-tag {getClassTag(hoveredOption.class)}">
                {hoveredOption.class.toUpperCase()}
              </span>
            {/if}

            <span class="tags-tl">
              {getMetadataLine(hoveredOption)}
            </span>
          </div>
        {/if}

        {#if hoveredOption.description}
          <p class="stat-desc">
            {hoveredOption.description}
          </p>
          {#if hasNumericMetadata(hoveredOption)}
            <hr />
          {/if}
        {/if}

        {#if hasCostMetadata(hoveredOption)}
          <div class="stat-row">
            <span>COST:</span>
            <span>
              {getTooltipCost(hoveredOption).toLocaleString()} CR
            </span>
          </div>
        {/if}

        {#if hoveredOption.basePower !== undefined || hoveredOption.power !== undefined}
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

        {#if hoveredOption.baseMass !== undefined || hoveredOption.mass !== undefined}
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

        {#if hoveredOption.hardpoints !== undefined}
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

  .select-trigger {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    background-color: var(--bg-void);
    color: var(--accent-amber);
    border: var(--border-subtle);
    border-radius: 0;
    cursor: text;
    overflow: hidden;
  }

  .select-trigger:focus-within,
  .select-trigger:hover {
    border-color: var(--accent-amber);
    background-color: rgba(245, 158, 11, 0.05);
  }

  .select-input {
    appearance: none;
    -webkit-appearance: none;
    min-width: 0;
    width: 100%;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--accent-amber);
    font-family: var(--font-terminal);
    font-size: 0.8rem;
    padding: 0.75rem;
    text-transform: uppercase;
    outline: none;
  }

  .select-input::placeholder {
    color: var(--text-main);
    opacity: 0.5;
  }

  .select-input:focus {
    border: none;
    box-shadow: none;
    outline: none;
  }

  .chevron-button {
    appearance: none;
    -webkit-appearance: none;
    align-self: stretch;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--accent-amber);
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: 0.8rem;
    opacity: 0.7;
    padding: 0 0.75rem 0 0.25rem;
  }

  .chevron-button:focus {
    box-shadow: none;
    outline: none;
  }

  .options-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
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
  }

  .option-item,
  .empty-option {
    width: 100%;
    text-align: left;
    color: var(--text-main);
    padding: 0.75rem;
    text-transform: uppercase;
  }

  .option-item {
    background: none;
    border: none;
    cursor: pointer;
  }

  .empty-option {
    color: var(--text-dim);
    font-size: 0.8rem;
  }

  .option-item:hover,
  .option-item:focus {
    background-color: var(--bg-void);
    color: var(--accent-amber);
  }

  .option-item.selected {
    color: var(--accent-amber);
    font-weight: bold;
  }

  .stat-popup {
    position: absolute;
    top: 100%;
    width: 300px;
    background-color: var(--bg-panel);
    border: 1px solid var(--accent-amber);
    box-shadow: 0 0 5px rgba(255, 191, 0, 0.3);
    padding: 1rem;
    z-index: 1000;
    pointer-events: none;
  }

  .stat-popup.right {
    left: calc(100% + 10px) !important;
    right: auto !important;
  }

  .stat-popup.left {
    right: calc(100% + 10px) !important;
    left: auto !important;
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
    padding-right: 0.5rem;
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
