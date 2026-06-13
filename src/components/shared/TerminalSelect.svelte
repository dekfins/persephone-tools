<script lang="ts" module>
  let activeId = $state<string | null>(null);
</script>

<script lang="ts">
  import {
    getEquipmentTooltip,
    getShipClassTag,
    getShipComponentMetadata,
    getShipComponentTooltip,
    type TerminalSelectTooltip,
    type TerminalTooltipScale
  } from '../../lib/ui/terminalItems';

  type Props = {
    options: any[];
    value?: any;
    labelKey?: string;
    placeholder?: string;
    id: string;
    onSelect?: ((option: any) => void) | undefined;
    popupSide?: 'left' | 'right';
    showPopup?: boolean;
    tooltipResolver?: ((option: any) => TerminalSelectTooltip | null | undefined) | undefined;
    tooltipScale?: TerminalTooltipScale;
  };

  let {
    options,
    value = $bindable<any>(),
    labelKey = 'label',
    placeholder = 'SELECT...',
    id,
    onSelect = undefined,
    popupSide = 'right',
    showPopup = true,
    tooltipResolver = undefined,
    tooltipScale = { costMult: 1, massPowerMult: 1 }
  }: Props = $props();

  let searchTerm = $state('');
  let hoveredOption = $state<any>(null);
  let selectedLabel = $derived(value ? optionLabel(value) : placeholder);
  let isOpen = $derived(activeId === id);
  let displayValue = $derived(isOpen ? searchTerm : selectedLabel);
  let filteredOptions = $derived.by(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return options;

    return options.filter((opt: any) => optionLabel(opt).toLowerCase().includes(query));
  });
  let activeTooltip = $derived(hoveredOption ? buildTooltip(hoveredOption) : null);

  function optionLabel(option: any) {
    return String(option?.[labelKey] ?? option?.label ?? option?.name ?? '');
  }

  function optionKey(option: any) {
    if (!option) return '';
    const candidate = option.value ?? option.id ?? option?.[labelKey] ?? option.label ?? option.name;
    return String(candidate ?? '');
  }

  function isSelected(option: any) {
    return optionKey(option) === optionKey(value);
  }

  function isEquipmentCatalogItem(item: any) {
    return Boolean(item?.id && item?.sourceName && item?.category && item?.app);
  }

  function hasShipStats(item: any) {
    return Boolean(
      item?.baseCost !== undefined ||
      item?.weaponCost !== undefined ||
      item?.basePower !== undefined ||
      item?.power !== undefined ||
      item?.baseMass !== undefined ||
      item?.mass !== undefined ||
      item?.hardpoints !== undefined ||
      item?.reactorType ||
      item?.engineName ||
      item?.parentEngine
    );
  }

  function buildTooltip(option: any): TerminalSelectTooltip | null {
    if (tooltipResolver) return tooltipResolver(option) ?? null;

    const catalogItem = isEquipmentCatalogItem(option?.item)
      ? option.item
      : isEquipmentCatalogItem(option)
        ? option
        : null;

    if (catalogItem) return getEquipmentTooltip(catalogItem);

    if (hasShipStats(option)) {
      return getShipComponentTooltip(option, optionLabel(option), tooltipScale);
    }

    if (option?.description || option?.class) {
      return {
        title: optionLabel(option),
        tag: option.class ? String(option.class).toUpperCase() : undefined,
        tagClass: option.class ? getShipClassTag(String(option.class)) : undefined,
        metadata: getShipComponentMetadata(option),
        description: option.description,
        stats: [],
        mechanics: undefined
      };
    }

    return null;
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
            class:selected={isSelected(opt)}
            role="option"
            aria-selected={isSelected(opt)}
            onclick={() => selectOption(opt)}
          >
            {optionLabel(opt)}
          </button>
        </li>
      {/each}
      {#if filteredOptions.length === 0}
        <li class="empty-option">NO MATCHES</li>
      {/if}
    </ul>

    {#if activeTooltip && showPopup}
      <aside class="stat-popup {popupSide}">
        <h4>{activeTooltip.title ?? optionLabel(hoveredOption)}</h4>
        {#if activeTooltip.tag || activeTooltip.metadata?.length}
          <div class="stat-row meta-row">
            {#if activeTooltip.tag}
              <span class="class-tag {activeTooltip.tagClass ?? ''}">
                {activeTooltip.tag}
              </span>
            {/if}

            {#if activeTooltip.metadata?.length}
              <span class="tags-tl">
                {activeTooltip.metadata.join(', ')}
              </span>
            {/if}
          </div>
        {/if}

        {#if activeTooltip.description}
          <p class="stat-desc">
            {activeTooltip.description}
          </p>
          {#if activeTooltip.stats?.length}
            <hr />
          {/if}
        {/if}

        {#each activeTooltip.stats ?? [] as stat}
          <div class="stat-row">
            <span>{stat.label}:</span>
            <span>{stat.value}</span>
          </div>
        {/each}

        {#if activeTooltip.mechanics}
          <p class="stat-desc mechanics">
            {activeTooltip.mechanics}
          </p>
        {/if}
      </aside>
    {/if}
  {/if}
</div>
