<script module lang="ts">
  export type TerminalStatGridItem = {
    label: string;
    value: string | number;
    tone?: string;
    detail?: string;
    onDecrement?: () => void | Promise<void>;
    onIncrement?: () => void | Promise<void>;
  };
</script>

<script lang="ts">
  type Props = {
    items: TerminalStatGridItem[];
    columns?: 2 | 3 | 4;
    dense?: boolean;
    valueTone?: 'amber' | 'main';
    scaleValues?: boolean;
  };

  let {
    items,
    columns = 2,
    dense = false,
    valueTone = 'amber',
    scaleValues = true
  }: Props = $props();

  function valueLength(value: string | number) {
    return `${value}`.length;
  }
</script>

<div
  class="terminal-stat-grid columns-{columns}"
  class:dense
  class:no-scale={!scaleValues}
  class:value-main={valueTone === 'main'}
>
  {#each items as item}
    <div class="terminal-stat-cell {item.tone ?? ''}">
      <div class="stat-content">
        <span>{item.label}</span>
        <strong class={item.tone ?? ''} style:--value-length={valueLength(item.value)}>
          {item.value}
        </strong>
        {#if item.detail}
          <em>{item.detail}</em>
        {/if}
      </div>

      {#if item.onDecrement || item.onIncrement}
        <div class="stat-controls">
          {#if item.onDecrement}
            <button class="btn-action" type="button" onclick={item.onDecrement}>
              -1
            </button>
          {/if}
          {#if item.onIncrement}
            <button class="btn-action" type="button" onclick={item.onIncrement}>
              +1
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .terminal-stat-grid {
    display: grid;
    gap: 0.5rem;
  }

  .terminal-stat-grid.columns-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .terminal-stat-grid.columns-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .terminal-stat-grid.columns-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .terminal-stat-cell {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
    min-height: 5.5rem;
    padding: 0.65rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    font-family: var(--font-terminal);
    text-align: center;
  }

  .terminal-stat-cell:has(.stat-controls) {
    min-height: 6.75rem;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 0.55rem;
  }

  .stat-content {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .stat-controls {
    display: grid;
    grid-template-columns: repeat(2, 2.5rem);
    gap: 0.45rem;
    justify-content: center;
    align-items: center;
  }

  .btn-action {
    min-width: 2.5rem;
    padding: 0.4rem 0.65rem;
  }

  .terminal-stat-grid.dense {
    gap: var(--detail-grid-gap);
  }

  .terminal-stat-grid.dense .terminal-stat-cell {
    min-height: 0;
    padding: 0.45rem;
    text-align: left;
  }

  .terminal-stat-grid.dense .terminal-stat-cell:has(.stat-controls) {
    min-height: 5rem;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  span,
  em {
    color: var(--text-dim);
    font-style: normal;
    text-transform: uppercase;
  }

  span {
    font-size: 0.72rem;
  }

  em {
    font-size: 0.7rem;
  }

  strong {
    min-width: 0;
    color: var(--accent-amber);
    font-size: clamp(0.7rem, calc(1.45rem - (var(--value-length) * 0.055rem)), 1.25rem);
    line-height: 1;
    white-space: nowrap;
  }

  .terminal-stat-grid.value-main strong {
    color: var(--text-main);
  }

  .terminal-stat-grid.no-scale strong {
    font-size: 0.95rem;
  }

  .terminal-stat-grid.dense strong {
    font-size: clamp(0.7rem, calc(0.95rem - (var(--value-length) * 0.018rem)), 0.82rem);
  }

  strong.error,
  strong.danger,
  strong.movement-heavy,
  strong.movement-overloaded {
    color: var(--accent-red);
  }

  strong.credit {
    color: var(--fighter-green);
  }

  strong.accent {
    color: var(--accent-amber);
  }

  .terminal-stat-cell.error,
  .terminal-stat-cell.danger,
  .terminal-stat-cell.over-limit,
  .terminal-stat-cell.movement-light,
  .terminal-stat-cell.movement-heavy,
  .terminal-stat-cell.movement-overloaded {
    border-color: var(--accent-amber);
  }

  .terminal-stat-cell.error,
  .terminal-stat-cell.danger,
  .terminal-stat-cell.movement-heavy,
  .terminal-stat-cell.movement-overloaded {
    border-color: var(--accent-red);
  }

  @media (max-width: 1100px) {
    .terminal-stat-grid.columns-4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .terminal-stat-grid,
    .terminal-stat-grid.columns-2,
    .terminal-stat-grid.columns-3,
    .terminal-stat-grid.columns-4 {
      grid-template-columns: 1fr;
    }

    .terminal-stat-cell:has(.stat-controls) {
      grid-template-rows: minmax(0, 1fr) auto;
    }
  }
</style>
