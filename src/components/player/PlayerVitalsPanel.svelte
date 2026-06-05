<script lang="ts">
  import { dbState } from '../../lib/states/dbState.svelte';
  import { getBaseAttackBonus } from '../../lib/characterMechanics';
  import TerminalPanel from '../shared/TerminalPanel.svelte';
  import TerminalStatGrid, { type TerminalStatGridItem } from '../shared/TerminalStatGrid.svelte';

  let char = $derived(dbState.activeCharacter);
  let creation = $derived(dbState.localCharacterCreation);

  let attackBonus = $derived(char ? creation?.baseAttackBonus ?? getBaseAttackBonus(char.character_class) : 0);
  let armorClass = $derived(char ? creation?.armorClass ?? char.base_ac : 10);
  let vitalsItems = $derived<TerminalStatGridItem[]>(char ? [
    {
      label: 'HIT POINTS',
      value: `${char.hp}/${char.max_hp}`,
      onDecrement: () => adjustHP(-1),
      onIncrement: () => adjustHP(1)
    },
    {
      label: 'SYSTEM STRAIN',
      value: `${char.system_strain}/${char.max_system_strain}`,
      onDecrement: () => adjustSystemStrain(-1),
      onIncrement: () => adjustSystemStrain(1)
    },
    {
      label: 'RADS',
      value: `${char.rads}/${char.max_rads}`,
      tone: char.rads > Math.floor(char.max_rads / 2) ? 'danger' : undefined,
      onDecrement: () => adjustRads(-1),
      onIncrement: () => adjustRads(1)
    },
    { label: 'ATTACK BONUS', value: attackBonus >= 0 ? `+${attackBonus}` : attackBonus },
    { label: 'ARMOR CLASS', value: armorClass },
    {
      label: 'XP',
      value: char.xp ?? 0,
      onDecrement: () => adjustXP(-1),
      onIncrement: () => adjustXP(1)
    }
  ] : []);

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
</script>

<TerminalPanel title="VITALS" extraClass="player-panel">
  {#if char}
    <TerminalStatGrid items={vitalsItems} columns={3} />

    {#if dbState.isLocalCharacterPreview}
      <div class="terminal-alert">ARCHIVE PREVIEW VITALS - NOT SYNCED TO CLOUD</div>
    {/if}
  {:else}
    <div class="terminal-alert">AWAITING CREW DATA...</div>
  {/if}
</TerminalPanel>
