import {choose} from './rng.js';
import {
  onTurnStartCharacter,onCycleStartCharacter,onTurnEndCharacter,selfModifyCard,collisionImmunity,onValidAttack,
  isCardSelectableForCharacter,validateCharacterSkillIntent,resolvePostCollisionCharacter,baseDamageForCharacter,grantRunGold,
  onCombatEndCharacter
} from './characters.js';
import {publishMonsterIntent,executeMonsterIntent} from './monster.js';
import {beginAugmentChoices} from './augments.js';
import {applyOwnedEffects} from './effects.js';
import {initCombatTelemetry,recordCombatTurnTelemetry,finalizeCombatTelemetry} from './telemetry.js';
import {
  initializeNumberHistories,recordSelfModification,applyPreCollisionSwap,applyPreCollisionSteal,
  finalizeNumbers,attachCollisionGroups,attachValidity,attachDamage,assignVampireThralls,
  validateNumberMutationState
} from './number-mutation.js';

function cardFor(run,pid,cardId){return run.players.find(p=>p.playerId===pid)?.cardPool.find(c=>c.id===cardId);}
function playerFor(run,pid){return run.players.find(p=>p.playerId===pid);}
function selectableIds(run,player){
  const priv=run.combat.privateByPlayer[player.playerId];
  return priv.remainingCardIds.filter(id=>{
    const card=cardFor(run,player.playerId,id);
    return card&&isCardSelectableForCharacter(player,card);
  });
}
function resetCycleIfNeeded(run,player){
  const priv=run.combat.privateByPlayer[player.playerId];
  if(priv.remainingCardIds.length)return false;
  applyOwnedEffects(run,'CYCLE_END',{player,privateState:priv,events:[]});
  priv.cycleIndex=(priv.cycleIndex||1)+1;
  priv.spentCardIds=[];
  priv.remainingCardIds=player.cardPool.map(c=>c.id);
  onCycleStartCharacter(player,priv);
  return true;
}
function spendResolvedCards(run,cards){
  for(const rc of cards){
    const priv=run.combat.privateByPlayer[rc.playerId];
    const consume=[rc.cardInstanceId,...(rc.followUpCardIds||[])];
    for(const id of consume){
      priv.remainingCardIds=priv.remainingCardIds.filter(x=>x!==id);
      if(!priv.spentCardIds.includes(id))priv.spentCardIds.push(id);
    }
    delete priv.selectedCardId;delete priv.skillIntent;
    const player=playerFor(run,rc.playerId);
    if(run.combat.turnSubmissions[rc.playerId]?.autoSubmitted&&player.status==='STUNNED_NEXT_TURN')player.status='ACTIVE';
    resetCycleIfNeeded(run,player);
  }
}
function resolveDowns(run){
  const events=[],pending=new Set(run.combat?.pendingDownPlayerIds||[]);
  for(const p of run.players)if(p.hp<=0)pending.add(p.playerId);
  const newlyDown=run.players.filter(p=>p.status!=='DOWNED'&&p.hp<=0&&pending.has(p.playerId)).sort((a,b)=>a.seat-b.seat);
  for(const p of newlyDown){
    if(run.flame>0){
      run.flame-=1;p.hp=1;p.status='STUNNED_NEXT_TURN';
      events.push({type:'PLAYER_DOWNED',playerId:p.playerId,rescued:true,flame:run.flame,hp:1});applyOwnedEffects(run,'PLAYER_DOWNED',{player:p,events});
    }else{
      p.hp=0;p.status='DOWNED';
      events.push({type:'PLAYER_DOWNED',playerId:p.playerId,rescued:false,flame:run.flame,hp:0});applyOwnedEffects(run,'PLAYER_DOWNED',{player:p,events});
    }
  }
  if(run.combat)run.combat.pendingDownPlayerIds=[];
  if(run.flame===0&&run.players.every(p=>p.status==='DOWNED')){
    run.phase='RUN_FAILED';run.combat.phase='COMBAT_END';
    events.push({type:'RUN_FAILED'});
  }
  return events;
}
function reviveAfterVictory(run){
  for(const p of run.players){
    if(p.status==='DOWNED'){p.status='ACTIVE';p.hp=1;}
    else if(p.status==='STUNNED_NEXT_TURN')p.status='ACTIVE';
  }
}
function autoSubmitStunned(run){
  const c=run.combat;
  for(const p of run.players.filter(p=>p.status==='STUNNED_NEXT_TURN').sort((a,b)=>a.seat-b.seat)){
    const priv=c.privateByPlayer[p.playerId];
    if(!priv.remainingCardIds.length)resetCycleIfNeeded(run,p);
    const choices=selectableIds(run,p);
    if(!choices.length)throw new Error('기절 자동 제출에 사용할 카드가 없습니다.');
    const cardId=choose(run,choices,`stunned-auto:${run.floor}:${run.depth}:${run.currentRoomNodeId||c.monster.id}:${c.turn}:${p.playerId}`);
    c.turnSubmissions[p.playerId]={playerId:p.playerId,cardInstanceId:cardId,skillIntent:false,submittedAt:new Date().toISOString(),autoSubmitted:true};
    priv.selectedCardId=cardId;priv.skillIntent=false;
  }
}
function aiPlan(run,p,priv,cardId){
  const card=cardFor(run,p.playerId,cardId);
  let skillIntent=false,finalNumber=card.baseNumber,score=card.baseNumber;
  let skillData=null;
  if(p.characterId==='mage'&&(p.publicResources.mana||0)>=2){
    const mana=p.publicResources.mana||0;
    if(p.augments.includes('aug-111')){
      const spend=mana>=4?4:2,magnitude=spend===4?2:1;
      const direction=card.baseNumber+magnitude<=6?1:-1;
      skillIntent=true;skillData={direction,manaSpend:spend};finalNumber+=direction*magnitude;score=finalNumber;
    }else{
      const bonus=mana>=4?2:1;
      skillIntent=true;finalNumber+=bonus;score=finalNumber;
    }
  }else if(p.characterId==='gunner'&&p.publicResources.fullBurstReady){
    skillIntent=true;
    score=priv.remainingCardIds.reduce((sum,id)=>sum+(cardFor(run,p.playerId,id)?.baseNumber||0),0);
  }else if(p.characterId==='warrior'&&(p.publicResources.toughnessCharges||0)>0&&card.baseNumber>=5){
    skillIntent=true;
  }
  if(p.characterId==='twins')score+=2;
  return {cardId,skillIntent,skillData,finalNumber,score};
}
function autoSubmitAi(run){
  const c=run.combat,usedAiNumbers=new Set();
  for(const sub of Object.values(c.turnSubmissions)){
    const owner=playerFor(run,sub.playerId);
    if(owner?.memberType!=='ai')continue;
    const card=cardFor(run,sub.playerId,sub.cardInstanceId);
    if(card)usedAiNumbers.add(card.baseNumber);
  }
  for(const p of run.players.filter(p=>p.memberType==='ai'&&p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)){
    if(c.turnSubmissions[p.playerId])continue;
    const priv=c.privateByPlayer[p.playerId];
    if(!priv.remainingCardIds.length)resetCycleIfNeeded(run,p);
    const choices=selectableIds(run,p);
    if(!choices.length)throw new Error('AI가 제출할 수 있는 합법 카드가 없습니다.');
    const plans=choices.map(id=>aiPlan(run,p,priv,id));
    let pool=plans.filter(plan=>!usedAiNumbers.has(plan.finalNumber));
    if(!pool.length)pool=plans;
    const bestScore=Math.max(...pool.map(plan=>plan.score));
    pool=pool.filter(plan=>plan.score===bestScore);
    const plan=pool.length===1?pool[0]:choose(run,pool,`combat-ai-card:${run.floor}:${run.depth}:${run.currentRoomNodeId||c.monster.id}:${c.turn}:${p.playerId}`);
    validateCharacterSkillIntent(p,priv,Boolean(plan.skillIntent),cardFor(run,p.playerId,plan.cardId),plan.skillData);
    c.turnSubmissions[p.playerId]={playerId:p.playerId,cardInstanceId:plan.cardId,skillIntent:Boolean(plan.skillIntent),skillData:plan.skillData??null,submittedAt:new Date().toISOString(),autoSubmitted:true};
    priv.selectedCardId=plan.cardId;priv.skillIntent=Boolean(plan.skillIntent);
    usedAiNumbers.add(plan.finalNumber);
  }
}
export function beginTurn(run){
  const c=run.combat;if(!c||run.phase!=='COMBAT')return;
  if(!c.telemetry)initCombatTelemetry(run,c.roomType||'NORMAL_COMBAT');
  if(!c.combatStartEffectsApplied){for(const p of run.players)applyOwnedEffects(run,'COMBAT_START',{player:p,events:[]});c.combatStartEffectsApplied=true;}
  c.phase='TURN_START';
  for(const p of run.players){onTurnStartCharacter(p,run);applyOwnedEffects(run,'TURN_START',{player:p,events:[]});}
  c.phase='INTENT_PUBLISH';publishMonsterIntent(run);
  c.phase='SELECTION_OPEN';autoSubmitStunned(run);autoSubmitAi(run);
  const active=run.players.filter(p=>p.status!=='DOWNED').map(p=>p.playerId);
  if(active.length&&active.every(pid=>c.turnSubmissions[pid]?.autoSubmitted))return resolveBasicTurn(run);
}
export function submitCard(run,playerId,cardInstanceId,skillIntent=false,skillData=null){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')throw new Error('Card selection is closed.');
  const p=playerFor(run,playerId);if(!p||p.status==='DOWNED')throw new Error('Player cannot act.');
  if(c.turnSubmissions[playerId]?.autoSubmitted)throw new Error('Stunned player already auto-submitted.');
  const priv=c.privateByPlayer[playerId],card=cardFor(run,playerId,cardInstanceId);
  if(!priv||!priv.remainingCardIds.includes(cardInstanceId)||!card)throw new Error('Card is not available.');
  if(!isCardSelectableForCharacter(p,card))throw new Error('현재 쌍둥이 홀짝 상태에 맞는 카드만 선택할 수 있습니다.');
  validateCharacterSkillIntent(p,priv,Boolean(skillIntent),card,skillData);
  c.turnSubmissions[playerId]={playerId,cardInstanceId,skillIntent:Boolean(skillIntent),skillData:skillData==null?null:structuredClone(skillData),submittedAt:new Date().toISOString()};
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
  const mutationEvents=[],events=[];
  initializeNumberHistories(cards);
  c.phase='PRE_COLLISION_SELF_MODIFY';phaseTrace.push(c.phase);
  for(const rc of cards){const p=playerFor(run,rc.playerId);selfModifyCard(p,rc,c.turnSubmissions[rc.playerId]);applyOwnedEffects(run,'PRE_COLLISION_SELF_MODIFY',{player:p,resolved:rc,events});}
  recordSelfModification(cards,mutationEvents);
  c.phase='PRE_COLLISION_SWAP';phaseTrace.push(c.phase);applyPreCollisionSwap(run,cards,mutationEvents);
  c.phase='PRE_COLLISION_STEAL';phaseTrace.push(c.phase);applyPreCollisionSteal(run,cards,mutationEvents);
  c.phase='FINAL_NUMBER_REVEAL';phaseTrace.push(c.phase);finalizeNumbers(cards);
  c.phase='COLLISION_RESOLVE';phaseTrace.push(c.phase);
  for(const rc of cards)rc.collisionImmune=collisionImmunity(playerFor(run,rc.playerId),c.turnSubmissions[rc.playerId]);
  const groups=new Map();for(const rc of cards){const a=groups.get(rc.finalNumber)||[];a.push(rc);groups.set(rc.finalNumber,a);}
  attachCollisionGroups(run,cards,groups);
  for(const group of groups.values()){
    if(group.length>1)for(const rc of group)if(!rc.collisionImmune){rc.valid=false;rc.invalidReason='COLLISION';}
  }
  assignVampireThralls(run,cards,groups,events);
  c.phase='VALIDITY_DERIVE';phaseTrace.push(c.phase);
  const validCards=cards.filter(x=>x.valid),lowestNumber=validCards.length?Math.min(...validCards.map(x=>x.finalNumber)):null;
  const lowestCards=validCards.filter(x=>x.finalNumber===lowestNumber);
  for(const rc of cards)rc.soloLowest=Boolean(rc.valid&&lowestCards.length===1&&lowestCards[0]===rc);
  for(const rc of cards){const p=playerFor(run,rc.playerId);applyOwnedEffects(run,'CARD_VALIDATED',{player:p,resolved:rc,events});resolvePostCollisionCharacter(run,rc,c.turnSubmissions[rc.playerId]);}
  attachValidity(cards);
  c.phase='DAMAGE_BUILD';phaseTrace.push(c.phase);
  const defense=Math.max(0,Number(c.monster.defense)||0);
  const packets=[];
  for(const rc of cards.filter(x=>x.valid)){
    const player=playerFor(run,rc.playerId);
    const primary={sourcePlayerId:rc.playerId,sourceCardId:rc.cardInstanceId,numberUsed:rc.finalNumber,amount:Math.max(0,baseDamageForCharacter(player,rc)+(Number(player.engravings?.[String(rc.finalNumber)])||0)-defense),tags:['BASE_CARD'],followUp:false};
    const primaryDamage={amount:primary.amount},queued=[];
    applyOwnedEffects(run,'BEFORE_DAMAGE',{player,resolved:rc,damage:primaryDamage,followUps:queued,followUp:false,events:[]});
    primary.amount=Math.max(0,primaryDamage.amount);packets.push(primary,...queued.map(x=>({...x,sourceCardId:x.sourceCardId||rc.cardInstanceId})));
    for(const extraId of rc.followUpCardIds||[]){
      const extra=cardFor(run,rc.playerId,extraId);if(!extra)continue;
      const packet={sourcePlayerId:rc.playerId,sourceCardId:extra.id,amount:Math.max(0,extra.baseNumber+(Number(player.engravings?.[String(extra.baseNumber)])||0)-defense),tags:['FOLLOW_UP'],followUp:true};
      const damage={amount:packet.amount},extraQueued=[];
      applyOwnedEffects(run,'BEFORE_DAMAGE',{player,resolved:rc,damage,followUps:extraQueued,followUp:true,events:[]});
      packet.amount=Math.max(0,damage.amount);packets.push(packet,...extraQueued.map(x=>({...x,sourceCardId:x.sourceCardId||extra.id})));
    }
  }
  c.monster.defense=0;
  c.phase='DAMAGE_BATCH_APPLY';phaseTrace.push(c.phase);
  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);c.monster.hp=Math.max(0,c.monster.hp-totalDamage);
  attachDamage(cards,packets);
  validateNumberMutationState(run,cards,mutationEvents,{packets});
  const buildTurnResult=(trace=phaseTrace)=>({
    turn:c.turn,cards,damagePackets:packets,totalDamage,phaseTrace:trace,events,
    numberHistories:cards.map(card=>structuredClone(card.numberHistory)),
    mutationEvents:structuredClone(mutationEvents)
  });
  for(const packet of packets){const p=playerFor(run,packet.sourcePlayerId);applyOwnedEffects(run,'AFTER_DAMAGE',{player:p,damage:{amount:packet.amount},followUp:packet.followUp,packet,events:[]});}
  for(const rc of cards)if(rc.valid)onValidAttack(playerFor(run,rc.playerId));
  c.phase='POST_PLAYER_ATTACK';phaseTrace.push(c.phase);
  for(const rc of cards.filter(x=>x.burstMisfire)){
    const p=playerFor(run,rc.playerId);
    p.hp-=1;
    events.push({type:'FULL_BURST_MISFIRE',playerId:p.playerId,amount:1,hp:p.hp});
  }
  c.phase='KILL_CHECK';phaseTrace.push(c.phase);
  if(c.monster.hp<=0){
    events.push(...resolveDowns(run));
    spendResolvedCards(run,cards);c.turnSubmissions={};
    if(run.phase==='RUN_FAILED'){
      // RULE-01: Flame 0 + boss kill + full-party DOWNED resolves as RUN_FAILED before any boss-clear revival.
      c.phase='COMBAT_END';phaseTrace.push(c.phase);
      for(const p of run.players)onCombatEndCharacter(p);
      c.publicTurnResult=buildTurnResult();
      recordCombatTurnTelemetry(run,c.publicTurnResult);finalizeCombatTelemetry(run,'RUN_FAILED');
      return c.publicTurnResult;
    }
    const rewardEligible=new Set(run.players.filter(p=>p.status!=='DOWNED').map(p=>p.playerId));
    reviveAfterVictory(run);c.phase='COMBAT_END';
    const completionGold=c.roomType==='BOSS'?3:c.roomType==='ELITE_COMBAT'?2:1;
    if(c.roomType==='BOSS'){
      for(const p of run.players){
        const lost=Math.max(0,p.maxHp-p.hp);
        if(lost>0){const heal=Math.max(1,Math.ceil(lost/2));const before=p.hp;p.hp=Math.min(p.maxHp,p.hp+heal);events.push({type:'PLAYER_HEALED',playerId:p.playerId,amount:p.hp-before,hp:p.hp,source:'BOSS_CLEAR'});}
      }
      run.flame=Math.min(run.maxFlame,run.flame+1);
    }
    for(const p of run.players)if(rewardEligible.has(p.playerId))grantRunGold(p,completionGold);
    for(const p of run.players)applyOwnedEffects(run,'MONSTER_KILLED',{player:p,events});
    if(c.roomType==='BOSS')for(const p of run.players)applyOwnedEffects(run,'BOSS_CLEAR',{player:p,events});
    for(const p of run.players)applyOwnedEffects(run,'COMBAT_END',{player:p,events});
    for(const p of run.players)onCombatEndCharacter(p);
    if(c.roomType==='BOSS'){
      run.phase='FLOOR_CLEAR';
      run.floorClear={floor:run.floor,bossId:c.monster.id,bossName:c.monster.name};
      beginAugmentChoices(run,'FLOOR_CLEAR');
    }else{
      run.phase='ROOM_RESULT';
      run.roomResult={roomNodeId:run.currentRoomNodeId,readyPlayerIds:run.players.filter(p=>p.memberType==='ai').map(p=>p.playerId)};
      beginAugmentChoices(run,'ROOM_RESULT');
    }
    c.publicTurnResult=buildTurnResult([...phaseTrace,'COMBAT_END']);
    recordCombatTurnTelemetry(run,c.publicTurnResult);finalizeCombatTelemetry(run,'VICTORY');
    return c.publicTurnResult;
  }
  c.phase='MONSTER_ACTION';phaseTrace.push(c.phase);events.push(...executeMonsterIntent(run));
  c.phase='DOWN_RESOLVE';phaseTrace.push(c.phase);events.push(...resolveDowns(run));
  spendResolvedCards(run,cards);c.turnSubmissions={};
  if(run.phase==='RUN_FAILED'){
    c.phase='COMBAT_END';phaseTrace.push(c.phase);
    for(const p of run.players)onCombatEndCharacter(p);
    c.publicTurnResult=buildTurnResult();
    recordCombatTurnTelemetry(run,c.publicTurnResult);finalizeCombatTelemetry(run,'RUN_FAILED');
    return c.publicTurnResult;
  }
  for(const p of run.players){onTurnEndCharacter(p);applyOwnedEffects(run,'TURN_END',{player:p,events});}
  c.phase='TURN_END';phaseTrace.push(c.phase);
  c.publicTurnResult=buildTurnResult();
  recordCombatTurnTelemetry(run,c.publicTurnResult);
  c.turn+=1;beginTurn(run);
  return c.publicTurnResult;
}
