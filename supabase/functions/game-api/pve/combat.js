const PIPELINE=['SELECTION_LOCKED','PRE_COLLISION_SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','FINAL_NUMBER_REVEAL','COLLISION_RESOLVE','VALIDITY_DERIVE','DAMAGE_BUILD','DAMAGE_BATCH_APPLY','POST_PLAYER_ATTACK','KILL_CHECK','MONSTER_ACTION','DOWN_RESOLVE','TURN_END'];
function cardFor(run,pid,cardId){return run.players.find(p=>p.playerId===pid)?.cardPool.find(c=>c.id===cardId);}
export function submitCard(run,playerId,cardInstanceId,skillIntent=false){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')throw new Error('Card selection is closed.');
  const priv=c.privateByPlayer[playerId];if(!priv||!priv.remainingCardIds.includes(cardInstanceId))throw new Error('Card is not available.');
  c.turnSubmissions[playerId]={playerId,cardInstanceId,skillIntent:Boolean(skillIntent),submittedAt:new Date().toISOString()};
  priv.selectedCardId=cardInstanceId;priv.skillIntent=Boolean(skillIntent);
}
export function resolveBasicTurn(run){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')throw new Error('Combat is not accepting cards.');
  const active=run.players.filter(p=>p.status!=='DOWNED').map(p=>p.playerId);
  if(active.some(pid=>!c.turnSubmissions[pid]))return null;
  const phaseTrace=[];
  for(const phase of PIPELINE){c.phase=phase;phaseTrace.push(phase);}
  const cards=active.map(pid=>{const sub=c.turnSubmissions[pid], card=cardFor(run,pid,sub.cardInstanceId);if(!card)throw new Error('Submitted card missing.');return {playerId:pid,cardInstanceId:card.id,baseNumber:card.baseNumber,workingNumber:card.baseNumber,finalNumber:card.baseNumber,collisionImmune:false,valid:true};});
  const groups=new Map();for(const rc of cards){const a=groups.get(rc.finalNumber)||[];a.push(rc);groups.set(rc.finalNumber,a);}
  for(const group of groups.values())if(group.length>1)for(const rc of group){rc.valid=false;rc.invalidReason='COLLISION';}
  const packets=cards.filter(x=>x.valid).map(x=>({sourcePlayerId:x.playerId,sourceCardId:x.cardInstanceId,amount:x.finalNumber,tags:['BASE_CARD'],followUp:false}));
  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);c.monster.hp=Math.max(0,c.monster.hp-totalDamage);
  for(const rc of cards){const priv=c.privateByPlayer[rc.playerId];priv.remainingCardIds=priv.remainingCardIds.filter(id=>id!==rc.cardInstanceId);priv.spentCardIds.push(rc.cardInstanceId);delete priv.selectedCardId;delete priv.skillIntent;}
  c.publicTurnResult={turn:c.turn,cards,damagePackets:packets,totalDamage,phaseTrace};
  c.turnSubmissions={};
  if(c.monster.hp<=0){c.phase='COMBAT_END';run.phase='ROOM_RESULT';}
  else {c.turn+=1;c.phase='SELECTION_OPEN';}
  return c.publicTurnResult;
}
