<script lang="ts">
  import { active } from 'tinro';
</script>

<header class="top-bar">
  <div class="bar-content">
    <div class="brand">DEIMOS</div>
    
    <nav class="tactical-nav">
      <a href="/" class="nav-link" exact use:active>SHIP BUILDER</a>
      <a href="/condition" class="nav-link" use:active>SHIP CONDITION</a>
    </nav>
  </div>
</header>

<style>
  .top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    background: var(--bg-void, #0b0e14);
    border-bottom: 1px solid var(--text-dim, #444);
    z-index: 1000; /* Ensures it stays above your terminal cards */
    padding: 0.7rem 2rem;
  }

  .bar-content {
    display: flex;
    align-items: baseline;
    gap: 3rem; /* Spacing between 'DEIMOS' and the links */
    max-width: 1400px;
    margin: 0 auto;
  }

  .brand {
    color: var(--accent-amber, #f59e0b);
    font-size: 2rem;
    font-weight: bold;
    letter-spacing: 0.15em;
    padding-top: 0.5rem;
    padding-left: 2rem;
  }

  .tactical-nav {
    display: flex;
    gap: 2rem; /* Preserves your original link spacing */
  }

  .nav-link {
    color: var(--ui-cyan);
    text-decoration: none;
    padding: 0.5rem 0;
    letter-spacing: 0.05em;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .nav-link:hover {
    color: var(--ui-bright);
  }

  /* tinro active link styling */
  :global(.active) {
    color: var(--accent-amber) !important;
  }

</style>