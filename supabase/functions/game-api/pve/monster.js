import {choose} from './rng.js';
import {applyOwnedEffects} from './effects.js';
import {f1MonsterById} from './content-f1.js';
import {onMonsterPlayerDamagedCharacter} from './characters.js';

function materializeIntent(run,template){
  const intent=structuredClone(template);
  if(intent.type==='DIRECT_DAMAGE'&&intent.payload?.target==='RANDOM_LIVING'){
    const living=run.players.filter(p=>p.status!=='DOWNED');
    const target=choose(run,living,`monster-target:${run.floor}:${run.depth}:${run.currentRoomNodeId||run.combat.monster.id}:${run.combat.turn}:${run.combat.monster.id}`);
    intent.payload.targetPlayerId=target.playerId;delete intent.payload.target;
    intent.telegraphText=`${intent.telegraphText} (${target.seat+1}번 자리)`;
  }
  return intent;
}
export function publishMonsterIntent(run){
  const c=run.combat;if(!c||c.monster.hp<=0)return null;
  const living=run.players.filter(p=>p.status!=='DOWNED');if(!living.length)return null;
  const def=f1MonsterById(c.monster.id);
  let intent;
  if(def?.pattern?.length){
    const template=def.pattern[(c.turn-1)%def.pattern.length];
    intent=materializeIntent(run,template);
  }else if(c.turn%3===0){
    const target=choose(run,living,`monster-target:${run.floor}:${run.depth}:${run.currentRoomNodeId||c.monster.id}:${c.turn}:${c.monster.id}`);
    intent={type:'DIRECT_DAMAGE',telegraphText:`${target.seat+1}번 자리 공격`,payload:{targetPlayerId:target.playerId,amount:1}};
  }else intent={type:'CHARGE',telegraphText:'힘을 모으고 있다',payload:{}};
  c.monster.intent=intent;return intent;
}
function nextDamageEventId(run){
  const c=run.combat;c.damageEventSequence=(Number(c.damageEventSequence)||0)+1;
  return `damage:${run.floor}:${run.depth}:${c.monster?.id||'monster'}:${c.turn}:${c.damageEventSequence}`;
}
function guardianRedirect(run,originalPlayer,damageType,events,damageEventId,rawDamage){
  if(damageType!=='DIRECT'||!originalPlayer||originalPlayer.status==='DOWNED')return {target:originalPlayer,redirected:false};
  const guards=run.players.filter(p=>
    p.status!=='DOWNED'&&p.characterId==='warrior'&&p.augments?.includes('aug-041')&&
    p.publicResources?.guardianTargetPlayerId===originalPlayer.playerId
  ).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  const guard=guards[0];if(!guard)return {target:originalPlayer,redirected:false};
  delete guard.publicResources.guardianTargetPlayerId;
  events.push({
    type:'DAMAGE_REDIRECTED',phase:'DAMAGE_REDIRECT_DECISION',damageEventId,
    originalTarget:originalPlayer.playerId,redirectedTarget:guard.playerId,redirectSource:guard.playerId,
    damageBeforeReduction:rawDamage,redirectConsumed:true
  });
  return {target:guard,redirected:true,originalTarget:originalPlayer.playerId,redirectSource:guard.playerId};
}
export function applyMonsterDamage(run,originalPlayer,amount,damageType,{damageEventId=null}={}){
  const c=run.combat,events=[];
  if(!c||!originalPlayer||originalPlayer.status==='DOWNED'||amount<=0)return events;
  const id=damageEventId||nextDamageEventId(run);
  c.processedDamageEventIds||=[];
  if(c.processedDamageEventIds.includes(id)){
    const error=new Error('동일 monster damage packet이 두 번 처리되었습니다.');error.code='DAMAGE_PACKET_REENTRY';throw error;
  }
  c.processedDamageEventIds.push(id);
  const rawDamage=Math.max(0,Number(amount)||0);
  const redirect=guardianRedirect(run,originalPlayer,damageType,events,id,rawDamage);
  const player=redirect.target;
  if(!player||player.status==='DOWNED')return events;
  const incomingDamage={amount:rawDamage};
  const beforeEffects=incomingDamage.amount;
  applyOwnedEffects(run,'BEFORE_PLAYER_DAMAGE',{player,incomingDamage,damageType,damageEventId:id,events});
  const afterEffects=Math.max(0,Number(incomingDamage.amount)||0);
  const effectPrevented=Math.max(0,beforeEffects-afterEffects);
  const armor=Math.max(0,Number(player.publicResources.armor)||0),blocked=Math.min(armor,afterEffects);
  if(blocked)player.publicResources.armor=armor-blocked;
  const actual=Math.max(0,afterEffects-blocked),preventedDamage=Math.max(0,rawDamage-actual);
  if(actual)player.hp-=actual;
  c.pendingDownPlayerIds||=[];
  if(player.hp<=0&&!c.pendingDownPlayerIds.includes(player.playerId))c.pendingDownPlayerIds.push(player.playerId);
  events.push({
    type:'PLAYER_DAMAGED',phase:'APPLY_ACTUAL_DAMAGE',damageEventId:id,
    playerId:player.playerId,originalTarget:originalPlayer.playerId,
    redirectedFrom:redirect.redirected?originalPlayer.playerId:null,redirectSource:redirect.redirectSource||null,
    rawDamage,damageBeforeReduction:rawDamage,effectPrevented,blocked,preventedDamage,
    amount:actual,actualDamage:actual,hp:player.hp,damageType,reductionSources:[
      ...(effectPrevented>0?[{type:'EFFECT',amount:effectPrevented}]:[]),
      ...(blocked>0?[{type:'ARMOR',amount:blocked}]:[])
    ]
  });
  applyOwnedEffects(run,'PLAYER_DAMAGED',{player,damage:{amount:actual},damageType,damageEventId:id,events});
  onMonsterPlayerDamagedCharacter(player,{damageType,actualDamage:actual,events});
  if(player.hp>=1)c.pendingDownPlayerIds=c.pendingDownPlayerIds.filter(pid=>pid!==player.playerId);
  return events;
}
export function executeMonsterIntent(run){
  const c=run.combat,intent=c?.monster?.intent;if(!c||!intent)return [];
  const events=[];
  if(intent.type==='DIRECT_DAMAGE'){
    const target=run.players.find(p=>p.playerId===intent.payload?.targetPlayerId&&p.status!=='DOWNED')||run.players.filter(p=>p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)[0];
    events.push(...applyMonsterDamage(run,target,Number(intent.payload?.amount)||0,'DIRECT'));
  }else if(intent.type==='AOE_DAMAGE'){
    const amount=Number(intent.payload?.amount)||0;
    for(const p of run.players.filter(p=>p.status!=='DOWNED'))events.push(...applyMonsterDamage(run,p,amount,'AOE'));
  }else if(intent.type==='HEAL'){
    const amount=Math.max(0,Number(intent.payload?.amount)||0);c.monster.hp=Math.min(c.monster.maxHp,c.monster.hp+amount);
  }else if(intent.type==='DEFEND'){
    c.monster.defense=Math.max(0,Number(intent.payload?.amount)||1);
  }else if(['APPLY_STATUS','SEAL_NUMBER','FORCE_RANDOM_CHOICE','CHARGE','SPECIAL'].includes(intent.type)){
    events.push({type:'MONSTER_INTENT_EXECUTED',intentType:intent.type,payload:intent.payload||{}});
  }else throw new Error('Unsupported monster intent.');
  return events;
}
