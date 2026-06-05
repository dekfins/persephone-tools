<script lang="ts">
  import type { Snippet } from 'svelte';

  let { 
    title, 
    children, 
    extraClass = '' 
  }: { 
    title?: string; 
    children: Snippet; 
    extraClass?: string; 
  } = $props();
</script>

<div class="terminal-card {extraClass}">
  {#if title}
    <h3>{title}</h3>
  {/if}
  
  {@render children()} 
</div>
