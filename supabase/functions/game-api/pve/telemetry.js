const pending=run=>run._telemetryPending||(run._telemetryPending=[]);

export function queueTelemetry(run,logType,payload){
  if(!run||!logType)return;
  pending(run).push({logType,payload:structuredClone(payload)});
}
export function recordRngTelemetry(run,{contextKey,counter,index,length}){
  queueTelemetry(run,'RNG',{context_key:contextKey,counter,index,length});
}
export function initCombatTelemetry(run,roomType='NORMAL_COMBAT'){
  const c=run.combat;if(!c)return;
  c.telemetry={
    roomType,turnCount:0,flameStart:run.flame,
    hpStart:Object.fromEntries(run.players.map(p=>[p.playerId,p.hp])),
    expStart:Object.fromEntries(run.players.map(p=>[p.playerId,p.growthExp])),
    goldStart:Object.fromEntries(run.players.map(p=>[p.playerId,p.runGold])),
    playerDamageTotal:Object.fromEntries(run.players.map(p=>[p.playerId,0])),
    validAttackCount:Object.fromEntries(run.players.map(p=>[p.playerId,0])),
    collisionCount:Object.fromEntries(run.players.map(p=>[p.playerId,0])),
    damageTaken:Object.fromEntries(run.players.map(p=>[p.playerId,0])),
    healingDone:Object.fromEntries(run.players.map(p=>[p.playerId,0])),
    downCount:Object.fromEntries(run.players.map(p=>[p.playerId,0]))
  };
}
export function recordCombatTurnTelemetry(run,result){
  const t=run.combat?.telemetry;if(!t||!result)return;
  t.turnCount=Math.max(t.turnCount,result.turn||run.combat.turn||0);
  for(const card of result.cards||[]){
    if(card.valid)t.validAttackCount[card.playerId]=(t.validAttackCount[card.playerId]||0)+1;
    if(card.invalidReason==='COLLISION')t.collisionCount[card.playerId]=(t.collisionCount[card.playerId]||0)+1;
  }
  for(const packet of result.damagePackets||[])t.playerDamageTotal[packet.sourcePlayerId]=(t.playerDamageTotal[packet.sourcePlayerId]||0)+(Number(packet.amount)||0);
  for(const event of result.events||[]){
    if(event.type==='PLAYER_DAMAGED')t.damageTaken[event.playerId]=(t.damageTaken[event.playerId]||0)+(Number(event.amount)||0);
    if(event.type==='PLAYER_HEALED')t.healingDone[event.playerId]=(t.healingDone[event.playerId]||0)+(Number(event.amount)||0);
    if(event.type==='PLAYER_DOWNED')t.downCount[event.playerId]=(t.downCount[event.playerId]||0)+1;
  }
}
export function finalizeCombatTelemetry(run,outcome='COMBAT_END'){
  const c=run.combat,t=c?.telemetry;if(!c||!t||t.finalized)return null;
  t.finalized=true;
  const log={
    run_id:run.id,floor:run.floor,room_type:t.roomType,monster_id:c.monster?.id||null,outcome,
    turn_count:t.turnCount,
    party_damage_total:Object.values(t.playerDamageTotal).reduce((a,b)=>a+b,0),
    player_damage_total:structuredClone(t.playerDamageTotal),
    valid_attack_count:structuredClone(t.validAttackCount),
    collision_count:structuredClone(t.collisionCount),
    damage_taken:structuredClone(t.damageTaken),
    healing_done:structuredClone(t.healingDone),
    down_count:structuredClone(t.downCount),
    flame_spent:Math.max(0,(t.flameStart||0)-run.flame),
    exp_gained:Object.fromEntries(run.players.map(p=>[p.playerId,p.growthExp-(t.expStart[p.playerId]||0)])),
    run_gold_gained:Object.fromEntries(run.players.map(p=>[p.playerId,p.runGold-(t.goldStart[p.playerId]||0)])),
    gambler_runtime:Object.fromEntries(run.players.filter(p=>p.characterId==='gambler').map(p=>[
      p.playerId,structuredClone(c.privateByPlayer?.[p.playerId]?.telemetry||{})
    ]))
  };
  queueTelemetry(run,'COMBAT',log);return log;
}
export function recordEffectTelemetry(run,effect,playerId,triggered,metrics={}){
  queueTelemetry(run,'EFFECT',{
    effect_id:effect.id,player_id:playerId,
    trigger_count:1,successful_trigger_count:triggered?1:0,
    extra_damage:Number(metrics.extra_damage)||0,
    healing:Number(metrics.healing)||0,
    prevented_damage:Number(metrics.prevented_damage)||0,
    cards_recovered:Number(metrics.cards_recovered)||0,
    resources_refunded:Number(metrics.resources_refunded)||0,
    exp_bonus:Number(metrics.exp_bonus)||0,
    gold_bonus:Number(metrics.gold_bonus)||0
  });
}
export function betaWarnings(combatLog){
  const out=[];if(!combatLog)return out;
  if(combatLog.floor===1&&combatLog.room_type==='NORMAL_COMBAT'&&(combatLog.turn_count<=4||combatLog.turn_count>=9))out.push('F1_NORMAL_TURN_COUNT');
  return out;
}
