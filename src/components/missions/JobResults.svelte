<script lang="ts">
  import type { GeneratedMission } from '../../lib/types';
  import JobCard from './JobCardPanel.svelte';

  let { jobs, isScanning, onAccept } = $props<{
    jobs: GeneratedMission[],
    isScanning: boolean,
    onAccept: (job: GeneratedMission) => void
  }>();
</script>

{#if jobs.length === 0 && !isScanning}
  <div class="terminal-alert" style="grid-column: 1 / -1;">
    NO JOBS FOUND. ADJUST DIFFICULTY FILTER AND RESCAN.
  </div>
{:else if jobs.length > 0}
  <div class="jobs-grid">
    {#each jobs as job}
      <JobCard 
        {job} 
        onAccept={onAccept} 
      />
    {/each}
  </div>
{/if}

<style>
  .jobs-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* Forces exact 2x2 layout */
    gap: 1.5rem;
  }
</style>