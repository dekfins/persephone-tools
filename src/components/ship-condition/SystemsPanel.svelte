<script lang="ts">
  import { shipState } from '../../lib/shipState.svelte';
  import fittings from '../../data/fittings.json';
  import weapons from '../../data/weapons.json';
  import defenses from '../../data/defenses.json';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  function cycleStatus(comp: any) {
    const currentStatus = comp.status || "Online"; 
    
    if (currentStatus === "Online") comp.status = "Damaged";
    else if (currentStatus === "Damaged") comp.status = "Destroyed";
    else comp.status = "Online";
  }

  function getClassTag(className: string) {
    if (!className) return 'unknown';
    return className.toLowerCase().trim();
  }

  function getLiveAttribute(comp: any) {
    const masterList = [...fittings, ...weapons, ...defenses] as any[];
    
    // 1. Get the specific name from the component snapshot
    const targetName = comp.item.fittingName || comp.item.weaponName || comp.item.defenseName;

    // 2. Find the match in the master list by checking the same consolidated name
    const liveItem = masterList.find(i => {
      const masterName = i.fittingName || i.weaponName || i.defenseName;
      return masterName === targetName;
    });

    return liveItem?.attribute || comp.item.attribute || "DATA LINK SEVERED";
  }
</script>

<TerminalPanel title="Internal Systems">
  {#if shipState.components.length === 0}
    <p class="text-dim">No components installed.</p>
  {/if}
  
  <div class="systems-list">
    {#each shipState.components as comp}
      <div class="system-row is-{comp.status?.toLowerCase() || 'online'}">
        <div class="sys-primary">
          <span class="cat-label">[{comp.category.substring(0,3).toUpperCase()}]</span> 
          <span class="item-label {getClassTag(comp.item.class)}">
            {comp.item.fittingName || comp.item.defenseName || comp.item.weaponName}
            {#if comp.quantity > 1} 
              <span class="qty-badge">x{comp.quantity}</span>
            {/if}
          </span>
        </div>

        <div class="sys-secondary">
          <span class="sys-desc">
            {getLiveAttribute(comp)}
          </span>
        </div>

        <div class="sys-action">
          <button 
            class="status-btn status-{(comp.status || 'Online').toLowerCase()}"
            onclick={() => cycleStatus(comp)}
          >
            {(comp.status || 'Online').toUpperCase()}
          </button>
        </div>
      </div>
    {/each}
  </div>
</TerminalPanel>


<style>
  .systems-list::-webkit-scrollbar {
    width: 6px;
  }

  .systems-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-left: 1px dashed var(--border-subtle, #333);
  }

  .systems-list::-webkit-scrollbar-thumb {
    background: var(--ui-cyan, #00aacc); /* Uses your accent color */
    border-radius: 2px;
  }

  .systems-list::-webkit-scrollbar-thumb:hover {
    background: var(--accent-amber, #ffb000);
  }

  /* The new 3-Column Grid for the row */
  .system-row { 
    display: grid; 
    grid-template-columns: 2.5fr 3.5fr 100px; 
    gap: 1.5rem; 
    align-items: center; 
    border-bottom: 1px dashed var(--border-subtle); 
    padding: 0.6rem 0;
    min-width: 0; 
  }

  /* Dim the entire row if the system is destroyed */
  .system-row.is-destroyed .sys-primary,
  .system-row.is-destroyed .sys-secondary {
    opacity: 0.3;
    text-decoration: line-through;
  }

  .system-row.is-damaged .sys-secondary {
    opacity: 0.7;
    color: var(
      --accent-amber
    ); /* Highlight the effect so the GM remembers it might be glitchy */
  }

  /* COLUMN 1 */
  .sys-primary { 
    display: flex; 
    gap: 0.5rem; 
    align-items: baseline; 
    min-width: 0;
  }
  .cat-label {
    font-size: 0.8em;
    opacity: 0.8;
    color: var(--text-dim);
  }
  .item-label { 
    font-weight: 500; 
    text-transform: uppercase; 
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; 
  }
  .qty-badge {
    color: var(--ui-cyan);
    margin-left: 0.25rem;
  }

  .sys-secondary {
    font-family: var(
      --font-terminal,
      monospace
    ); /* Use standard text for readability */
    font-size: 0.85rem;
    color: var(--text-main);
    line-height: 1.4;
  }
  .sys-desc {
    display: block;
  }

  /* COLUMN 3 */
  .sys-action {
    display: flex;
    justify-content: flex-end;
  }
  .status-btn {
    font-family: monospace;
    font-size: 0.8rem;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    border: 1px solid;
    background: transparent;
    width: 100%;
  }
  .status-online {
    color: var(--ui-cyan);
    border-color: var(--ui-cyan);
  }
  .status-damaged {
    color: var(--accent-amber);
    border-color: var(--accent-amber);
    background: rgba(245, 158, 11, 0.1);
  }
  .status-destroyed {
    color: var(--accent-red);
    border-color: var(--accent-red);
    background: rgba(239, 68, 68, 0.2);
    text-decoration: line-through;
  }

  .text-dim {
    color: var(--text-dim);
  }

  .item-label.fighter {
    color: var(--fighter-green);
  }
  .item-label.frigate {
    color: var(--frigate-blue);
  }
  .item-label.cruiser {
    color: var(--cruiser-purple);
  }
  .item-label.capital {
    color: var(--capital-red);
  }

</style>