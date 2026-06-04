<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { getBaseAttackBonus } from '../../lib/characterMechanics';
  import TerminalPanel from '../shared/TerminalPanel.svelte';

  let char = $derived(dbState.activeCharacter);
  let creation = $derived(dbState.localCharacterCreation);
  let xpDraft = $state('');

  let attackBonus = $derived(char ? creation?.baseAttackBonus ?? getBaseAttackBonus(char.character_class) : 0);
  let armorClass = $derived(char ? creation?.armorClass ?? char.base_ac : 10);

  async function adjustHP(amount: number) {
    if (!char) return;
    const newHP = Math.max(0, Math.min(char.max_hp, char.hp + amount));
    if (newHP !== char.hp) {
      await dbState.updateHP(char.id, newHP);
    }
  }

  async function adjustRads(amount: number) {
    if (!char) return;
    const newRads = Math.max(0, Math.min(char.max_rads, char.rads + amount));
    if (newRads !== char.rads) {
      await dbState.updateRads(char.id, newRads);
    }
  }

  async function adjustSystemStrain(amount: number) {
    if (!char) return;
    const newSystemStrain = Math.max(0, Math.min(char.max_system_strain, char.system_strain + amount));
    if (newSystemStrain !== char.system_strain) {
      await dbState.updateSystemStrain(char.id, newSystemStrain);
    }
  }

  async function adjustXP(amount: number) {
    if (!char) return;
    await dbState.updateXP(char.id, Math.max(0, (char.xp ?? 0) + amount));
  }

  async function commitXP() {
    if (!char) return;
    const parsedXP = Number.parseInt(xpDraft, 10);
    await dbState.updateXP(char.id, Number.isFinite(parsedXP) ? parsedXP : char.xp ?? 0);
    xpDraft = '';
  }
</script>

<TerminalPanel title="VITALS" extraClass="player-panel">
  {#if char}
    <div class="vitals-grid">
      <div class="vital-row">
        <div>
          <span>HIT POINTS</span>
          <strong>{char.hp}/{char.max_hp}</strong>
        </div>
        <div class="controls">
          <button class="btn-action" onclick={() => adjustHP(-1)}>-1</button>
          <button class="btn-action" onclick={() => adjustHP(1)}>+1</button>
        </div>
      </div>

      <div class="vital-row">
        <div>
          <span>RADS</span>
          <strong class:danger={char.rads > Math.floor(char.max_rads / 2)}>{char.rads}/{char.max_rads}</strong>
        </div>
        <div class="controls">
          <button class="btn-action" onclick={() => adjustRads(-1)}>-1</button>
          <button class="btn-action" onclick={() => adjustRads(1)}>+1</button>
        </div>
      </div>

      <div class="vital-row">
        <div>
          <span>SYSTEM STRAIN</span>
          <strong>{char.system_strain}/{char.max_system_strain}</strong>
        </div>
        <div class="controls">
          <button class="btn-action" onclick={() => adjustSystemStrain(-1)}>-1</button>
          <button class="btn-action" onclick={() => adjustSystemStrain(1)}>+1</button>
        </div>
      </div>

      <div class="vital-row">
        <div>
          <span>XP</span>
          <strong>{char.xp ?? 0}</strong>
        </div>
        <div class="xp-controls">
          <button class="btn-action" onclick={() => adjustXP(-1)}>-1</button>
          <input
            class="terminal-input xp-input"
            type="number"
            min="0"
            placeholder={(char.xp ?? 0).toString()}
            value={xpDraft}
            oninput={(event) => xpDraft = event.currentTarget.value}
            onchange={commitXP}
          />
          <button class="btn-action" onclick={() => adjustXP(1)}>+1</button>
        </div>
      </div>

      <div class="static-grid">
        <div>
          <span>ATTACK BONUS</span>
          <strong>{attackBonus >= 0 ? `+${attackBonus}` : attackBonus}</strong>
        </div>
        <div>
          <span>ARMOR CLASS</span>
          <strong>{armorClass}</strong>
        </div>
      </div>
    </div>

    {#if dbState.isLocalCharacterPreview}
      <div class="terminal-alert">ARCHIVE PREVIEW VITALS - NOT SYNCED TO CLOUD</div>
    {/if}
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>

<style>
  .vitals-grid {
    display: grid;
    gap: 0.65rem;
  }

  .vital-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.75rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
    font-family: var(--font-terminal);
  }

  .vital-row div:first-child {
    display: grid;
    gap: 0.2rem;
  }

  span {
    color: var(--text-dim);
    font-size: 0.78rem;
  }

  strong {
    color: var(--accent-amber);
    font-size: 1.15rem;
  }

  strong.danger {
    color: var(--accent-red);
  }

  .controls {
    display: flex;
    gap: 0.45rem;
  }

  .xp-controls {
    display: grid;
    grid-template-columns: auto 4.75rem auto;
    gap: 0.45rem;
    align-items: center;
  }

  .xp-input {
    width: 100%;
    padding: 0.45rem;
    text-align: center;
  }

  .static-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .static-grid div {
    display: grid;
    gap: 0.2rem;
    background: var(--bg-void);
    border: var(--border-subtle);
    padding: 0.65rem;
    font-family: var(--font-terminal);
  }

  .btn-action {
    min-width: 2.5rem;
    padding: 0.4rem 0.65rem;
  }

  @media (max-width: 700px) {
    .static-grid,
    .xp-controls {
      grid-template-columns: 1fr;
    }
  }
</style>
