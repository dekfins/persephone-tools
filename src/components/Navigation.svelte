<script lang="ts">
  import { active } from 'tinro';
</script>

<nav class="tactical-nav">
  <a href="/" class="nav-link" exact use:active>SHIP BUILDER</a>
  <a href="/condition" class="nav-link" use:active>SHIP CONDITION</a>
</nav>

<style>
  .tactical-nav {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--text-dim);
  }
  
  .nav-link {
    color: var(--ui-cyan);
    text-decoration: none;
    padding: 0.5rem 0;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }
  
  .nav-link:hover {
    color: var(--ui-bright);
  }

  /* 'tinro' automatically adds the 'active' class to the current route */
  :global(.active) {
    color: var(--accent-amber) !important;
    border-bottom: 2px solid var(--accent-amber);
  }
</style>