export const RESET_SCOPES=Object.freeze(['TURN','CYCLE','COMBAT','FLOOR','RUN']);

export const PVE_RESOURCE_DEFS=Object.freeze({
  mana:{resetScope:'COMBAT',baseMax:4},
  manaMax:{resetScope:'COMBAT'},
  toughnessCharges:{resetScope:'COMBAT',baseMax:2},
  toughnessChargesMax:{resetScope:'COMBAT'},
  fullBurstReady:{resetScope:'COMBAT'},
  burstReadyCycle:{resetScope:'COMBAT'},
  acrobaticsReady:{resetScope:'COMBAT'},
  acrobaticsRechargeProgress:{resetScope:'COMBAT',baseMax:3},
  acrobaticsBoostReady:{resetScope:'COMBAT'},
  parity:{resetScope:'COMBAT'},
  armor:{resetScope:'COMBAT'},
  veteranStreak:{resetScope:'COMBAT'},
  unyielding:{resetScope:'COMBAT'},
  sneakyStack:{resetScope:'COMBAT',baseMax:2},
  dominance:{resetScope:'COMBAT',baseMax:2},
  thrallPlayerId:{resetScope:'COMBAT'},
  greed:{resetScope:'TURN'},
  stolenNumber:{resetScope:'RUN',baseMax:3},
  revelation:{resetScope:'COMBAT',baseMax:6},
  revelationMax:{resetScope:'COMBAT'},
  revenge:{resetScope:'COMBAT',baseMax:1},
  blood:{resetScope:'COMBAT',baseMax:6},
  pact:{resetScope:'COMBAT',baseMax:3},
  vampireProtection:{resetScope:'COMBAT',baseMax:1},
  guardianTargetPlayerId:{resetScope:'COMBAT'},
  combo:{resetScope:'COMBAT',baseMax:3},
  lastSubmittedNumber:{resetScope:'COMBAT'},
  transformationActive:{resetScope:'COMBAT'},
  transformationPending:{resetScope:'COMBAT'},
  transformationTurn:{resetScope:'COMBAT'},
  devourAtTransform:{resetScope:'COMBAT'},
  devour:{resetScope:'RUN'},
  ghostSlashLevel:{resetScope:'RUN'},
  ghostSlashReady:{resetScope:'COMBAT'},
  poison:{resetScope:'COMBAT'},
  break:{resetScope:'COMBAT'},
  prank:{resetScope:'COMBAT'},
  heat:{resetScope:'COMBAT'},
  chain:{resetScope:'COMBAT'}
});

export const PVE_PERSISTENT_STATE_DEFS=Object.freeze({
  acrobaticsLockCycle:{resetScope:'COMBAT'},
  bloodCommandUsedCycle:{resetScope:'COMBAT'},
  finisherUsedCycle:{resetScope:'COMBAT'}
});

export function resourceDefinition(resource){return PVE_RESOURCE_DEFS[resource]||null;}
export function resourceMax(player,resource,fallback=Infinity){
  if(resource==='blood'&&(player?.augments?.includes('aug-324')||player?.augments?.includes('aug-319')))return 8;
  if(resource==='dominance'&&player?.augments?.includes('aug-308'))return 3;
  if(resource==='stolenNumber'){
    if(player?.augments?.includes('aug-198'))return 7;
    if(player?.augments?.includes('aug-192'))return 5;
  }
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
