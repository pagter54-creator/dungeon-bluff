export const RESET_SCOPES=Object.freeze(['TURN','CYCLE','COMBAT','FLOOR','RUN']);

export const PVE_RESOURCE_DEFS=Object.freeze({
  mana:{resetScope:'COMBAT',baseMax:4},
  manaMax:{resetScope:'COMBAT'},
  toughnessCharges:{resetScope:'COMBAT',baseMax:2},
  toughnessChargesMax:{resetScope:'COMBAT'},
  fullBurstReady:{resetScope:'COMBAT'},
  burstReadyCycle:{resetScope:'COMBAT'},
  acrobaticsReady:{resetScope:'COMBAT'},
  parity:{resetScope:'COMBAT'},
  armor:{resetScope:'COMBAT'},
  veteranStreak:{resetScope:'COMBAT'},
  unyielding:{resetScope:'COMBAT'},
  sneakyStack:{resetScope:'COMBAT',baseMax:2},
  revelation:{resetScope:'COMBAT'},
  combo:{resetScope:'COMBAT'},
  poison:{resetScope:'COMBAT'},
  break:{resetScope:'COMBAT'},
  prank:{resetScope:'COMBAT'},
  heat:{resetScope:'COMBAT'}
});

export const PVE_PERSISTENT_STATE_DEFS=Object.freeze({
  acrobaticsLockCycle:{resetScope:'COMBAT'}
});

export function resourceDefinition(resource){return PVE_RESOURCE_DEFS[resource]||null;}
export function resourceMax(player,resource,fallback=Infinity){
  const explicit=Number(player?.publicResources?.[`${resource}Max`]);
  if(Number.isFinite(explicit)&&explicit>=0)return explicit;
  const base=Number(PVE_RESOURCE_DEFS[resource]?.baseMax);
  if(Number.isFinite(base)&&base>=0)return base;
  return fallback;
}
export function clearResourcesByScope(player,scope){
  for(const [key,def] of Object.entries(PVE_RESOURCE_DEFS))if(def.resetScope===scope)delete player.publicResources[key];
  for(const [key,def] of Object.entries(PVE_PERSISTENT_STATE_DEFS))if(def.resetScope===scope)delete player.persistentCharacterState[key];
}
export function clearCombatResources(player){clearResourcesByScope(player,'COMBAT');}
export function clearCombatResourcesForPlayers(players){for(const p of players||[])clearCombatResources(p);}
