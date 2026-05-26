<script lang="ts">
  import JobBoardPanel from '../components/missions/JobBoardPanel.svelte';
  import '../styles/layout.css'; 
</script>

<div class="page-container">
  <div class="layout-grid">
    <div class="col-stack" style="grid-column: 1 / -1;">
      <JobBoardPanel />
    </div>
  </div>
</div>