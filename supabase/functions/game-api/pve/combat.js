import {choose} from './rng.js';
import {onTurnStartCharacter,onCycleStartCharacter,selfModifyCard,collisionImmunity,onValidAttack} from './characters.js';
import {publishMonsterIntent,executeMonsterIntent} from './monster.js';

const RESOLUTION_PIPELINE=['SELECTION_LOCKED','PRE_COLLISION_SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','FINAL_NUMBER_REVEAL','COLLISION_RESOLVE','VALIDITY_DERIVE','DAMAGE_BUILD','DAMAGE_BATCH_APPLY','POST_PLAYER_ATTACK','KILL_CHECK','MONSTER_ACTION','DOWN_RESOLVE','TURN_END'];
function cardFor(run,pid,cardId){return run.players.find(p=>p.playerId===pid)?.cardPool.find(c=>c.id===cardId);}
function playerFor(run,pid){return run.players.find(p=>p.playerId===pid);}
function resetCycleIfNeeded(run,player){
  const priv=run.combat.privateByPlayer[player.playerId];
  if(priv.remainingCardIds.length)return false;
  priv.cycleIndex=(priv.cycleIndex||1)+1;
  priv.spentCardIds=[];
  priv.remainingCardIds=player.cardPool.map(c=>c.id);
  onCycleStartCharacter(player);
  return true;
}
function spendResolvedCards(run,cards){
  for(const rc of cards){
    const priv=run.combat.privateByPlayer[rc.playerId];
    priv.remainingCardIds=priv.remainingCardIds.filter(id=>id!==rc.cardInstanceId);
    priv.spentCardIds.push(rc.cardInstanceId);
    delete priv.selectedCardId;delete priv.skillIntent;
    const player=playerFor(run,rc.playerId);if(run.combat.turnSubmissions[rc.playerId]?.autoSubmitted&&player.status==='STUNNED_NEXT_TURN')player.status='ACTIVE';
    resetCycleIfNeeded(run,player);
  }
}
function resolveDowns(run){
  const events=[];
  const newlyDown=run.players.filter(p=>p.status!=='DOWNED'&&p.hp<=0).sort((a,b)=>a.seat-b.seat);
  for(const p of newlyDown){
    if(run.flame>0){
      run.flame-=1;p.hp=1;p.status='STUNNED_NEXT_TURN';
      events.push({type:'PLAYER_DOWNED',playerId:p.playerId,rescued:true,flame:run.flame,hp:1});
    }else{
      p.hp=0;p.status='DOWNED';
      events.push({type:'PLAYER_DOWNED',playerId:p.playerId,rescued:false,flame:run.flame,hp:0});
    }
  }
  if(run.flame===0&&run.players.every(p=>p.status==='DOWNED')){
    run.phase='RUN_FAILED';run.combat.phase='COMBAT_END';
    events.push({type:'RUN_FAILED'});
  }
  return events;
}
function reviveAfterVictory(run){
  for(const p of run.players)if(p.status==='DOWNED'){p.status='ACTIVE';p.hp=1;}
}
function autoSubmitStunned(run){
  const c=run.combat;
  for(const p of run.players.filter(p=>p.status==='STUNNED_NEXT_TURN').sort((a,b)=>a.seat-b.seat)){
    const priv=c.privateByPlayer[p.playerId];
    if(!priv.remainingCardIds.length)resetCycleIfNeeded(run,p);
    const cardId=choose(run,priv.remainingCardIds,`stunned-auto:${c.id}:${c.turn}:${p.playerId}`);
    c.turnSubmissions[p.playerId]={playerId:p.playerId,cardInstanceId:cardId,skillIntent:false,submittedAt:new Date().toISOString(),autoSubmitted:true};
    priv.selectedCardId=cardId;priv.skillIntent=false;
  }
}
export function beginTurn(run){
  const c=run.combat;if(!c||run.phase!=='COMBAT')return;
  c.phase='TURN_START';
  for(const p of run.players)onTurnStartCharacter(p);
  c.phase='INTENT_PUBLISH';publishMonsterIntent(run);
  c.phase='SELECTION_OPEN';autoSubmitStunned(run);
}
export function submitCard(run,playerId,cardInstanceId,skillIntent=false){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')throw new Error('Card selection is closed.');
  const p=playerFor(run,playerId);if(!p||p.status==='DOWNED')throw new Error('Player cannot act.');
  if(c.turnSubmissions[playerId]?.autoSubmitted)throw new Error('Stunned player already auto-submitted.');
  const priv=c.privateByPlayer[playerId];if(!priv||!priv.remainingCardIds.includes(cardInstanceId))throw new Error('Card is not available.');
  c.turnSubmissions[playerId]={playerId,cardInstanceId,skillIntent:Boolean(skillIntent),submittedAt:new Date().toISOString()};
  priv.selectedCardId=cardInstanceId;priv.skillIntent=Boolean(skillIntent);
}
export function resolveBasicTurn(run){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')throw new Error('Combat is not accepting cards.');
  const active=run.players.filter(p=>p.status!=='DOWNED').map(p=>p.playerId);
  if(active.some(pid=>!c.turnSubmissions[pid]))return null;
  const phaseTrace=['SELECTION_LOCKED'];
  c.phase='SELECTION_LOCKED';
  const cards=active.map(pid=>{
    const sub=c.turnSubmissions[pid],card=cardFor(run,pid,sub.cardInstanceId);if(!card)throw new Error('Submitted card missing.');
    return {playerId:pid,cardInstanceId:card.id,baseNumber:card.baseNumber,workingNumber:card.baseNumber,finalNumber:card.baseNumber,collisionImmune:false,valid:true};
  });
  c.phase='PRE_COLLISION_SELF_MODIFY';phaseTrace.push(c.phase);
  for(const rc of cards)selfModifyCard(playerFor(run,rc.playerId),rc,c.turnSubmissions[rc.playerId]);
  c.phase='PRE_COLLISION_SWAP';phaseTrace.push(c.phase);
  c.phase='PRE_COLLISION_STEAL';phaseTrace.push(c.phase);
  c.phase='FINAL_NUMBER_REVEAL';phaseTrace.push(c.phase);
  c.phase='COLLISION_RESOLVE';phaseTrace.push(c.phase);
  for(const rc of cards)rc.collisionImmune=collisionImmunity(playerFor(run,rc.playerId),c.turnSubmissions[rc.playerId]);
  const groups=new Map();for(const rc of cards){const a=groups.get(rc.finalNumber)||[];a.push(rc);groups.set(rc.finalNumber,a);}
  for(const group of groups.values())if(group.length>1)for(const rc of group)if(!rc.collisionImmune){rc.valid=false;rc.invalidReason='COLLISION';}
  c.phase='VALIDITY_DERIVE';phaseTrace.push(c.phase);
  c.phase='DAMAGE_BUILD';phaseTrace.push(c.phase);
  const defense=Math.max(0,Number(c.monster.defense)||0);
  const packets=cards.filter(x=>x.valid).map(x=>({sourcePlayerId:x.playerId,sourceCardId:x.cardInstanceId,amount:Math.max(0,x.finalNumber-defense),tags:['BASE_CARD'],followUp:false}));
  c.monster.defense=0;
  c.phase='DAMAGE_BATCH_APPLY';phaseTrace.push(c.phase);
  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);c.monster.hp=Math.max(0,c.monster.hp-totalDamage);
  for(const rc of cards)if(rc.valid)onValidAttack(playerFor(run,rc.playerId));
  c.phase='POST_PLAYER_ATTACK';phaseTrace.push(c.phase);
  c.phase='KILL_CHECK';phaseTrace.push(c.phase);
  const events=[];
  if(c.monster.hp<=0){
    spendResolvedCards(run,cards);reviveAfterVictory(run);c.turnSubmissions={};c.phase='COMBAT_END';run.phase='ROOM_RESULT';
    c.publicTurnResult={turn:c.turn,cards,damagePackets:packets,totalDamage,phaseTrace:[...phaseTrace,'COMBAT_END'],events};
    return c.publicTurnResult;
  }
  c.phase='MONSTER_ACTION';phaseTrace.push(c.phase);events.push(...executeMonsterIntent(run));
  c.phase='DOWN_RESOLVE';phaseTrace.push(c.phase);events.push(...resolveDowns(run));
  spendResolvedCards(run,cards);c.turnSubmissions={};
  c.phase='TURN_END';phaseTrace.push(c.phase);
  c.publicTurnResult={turn:c.turn,cards,damagePackets:packets,totalDamage,phaseTrace,events};
  if(run.phase==='RUN_FAILED')return c.publicTurnResult;
  c.turn+=1;beginTurn(run);
  return c.publicTurnResult;
}
