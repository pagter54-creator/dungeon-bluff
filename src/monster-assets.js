const files = {
  boar: 'iron_boar.png', bat: 'echo_bat.png', hunter: 'cowardly_hunter.png',
  golem: 'Executioner_Golem.png', seer: 'Cursed_Prophet.png', slime: 'Starving_Slime.png',
  goblin: 'Chaos_Goblin.png', mimic: 'Mimic_of_Greed.png',
};
export const MONSTER_IMAGES = Object.fromEntries(Object.entries(files).map(([shape,file]) =>
  [shape,new URL(`../monster/${file}`,import.meta.url).href]));
