import {patternRequirement,adaptivePresentation,adaptiveRuleSummary} from './adaptive-pattern.js';
import {trackPlayerNumber,changeMonsterStack,checkPartyDamage,advanceMonsterPhase,tickMonsterCountdown} from './monster-primitives.js';
import {choose} from './rng.js';
import {createF2State,f2Presentation,prepareF2Turn,applyF2CardRules,recordF2DamageBatch,prepareF2Action} from './monster-behavior-f2.js';
import {createF3State,f3Presentation,prepareF3Turn,applyF3CardRules,recordF3DamageBatch,prepareF3Action} from './monster-behavior-f3.js';

const living=run=>run.players.filter(player=>player.status!=='DOWNED');
const bySeat=(a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId);
const playerFor=(run,id)=>run.players.find(player=>player.playerId===id);

export function createMonsterBehaviorState(mechanic){
  if(!mechanic)return {};
  if(mechanic.type.startsWith('F2_'))return createF2State(mechanic);
  if(mechanic.type.startsWith('F3_'))return createF3State(mechanic);
  const state={stacks:{},validCount:0,collisionCount:0};
  if(mechanic.type==='ARMOR_VALID_HITS')state.armor=mechanic.initial;
  if(mechanic.type==='DOMINION')state.meter=mechanic.initial;
  if(['COUNTDOWN_STRIKE','DPS_WINDOW'].includes(mechanic.type))state.countdown=mechanic.length;
  if(mechanic.type==='DPS_WINDOW'){state.progress=0;state.cycle=1;state.resolvedCycle=0;state.phase='CHARGING';}
  if(mechanic.type==='PARITY_BELL')state.phase='ODD';
  if(mechanic.type==='ECHO')state.lastValidNumbers=[];
  return state;
}

export function monsterPresentation(run){
  const monster=run.combat?.monster,mechanic=monster?.mechanic,state=monster?.behaviorState||{};
  if(!monster||!mechanic)return null;
  if(mechanic.type.startsWith('F2_'))return f2Presentation(run);
  if(mechanic.type.startsWith('F3_'))return f3Presentation(run);
  const publicState={...adaptivePresentation(run),ruleSummary:adaptiveRuleSummary(run),validCount:state.validCount||0,collisionCount:state.collisionCount||0};
  if(Number.isInteger(state.armor))publicState.armor=state.armor;
  if(Number.isInteger(state.countdown))publicState.countdown=state.countdown;
  if(Number.isInteger(state.progress)){publicState.progress=state.progress;publicState.threshold=patternRequirement(run,'minimumDamage');}
  if(Number.isInteger(state.forbiddenNumber))publicState.forbiddenNumber=state.forbiddenNumber;
  if(Number.isInteger(patternRequirement(run,'requiredValidCount')))publicState.requiredValidCount=patternRequirement(run,'requiredValidCount');
  if(Number.isInteger(state.meter))publicState.meter=state.meter;
  if(Number.isInteger(state.stacks?.swarm))publicState.swarm=state.stacks.swarm;
  if(Number.isInteger(state.stacks?.echo))publicState.echo=state.stacks.echo;
  if(Array.isArray(state.lastValidNumbers))publicState.echoNumbers=[...state.lastValidNumbers];
  if(state.phase)publicState.phase=state.phase;
  if(state.targetPlayerId)publicState.targetPlayerId=state.targetPlayerId;
  if(state.lastHighestPlayerId)publicState.threatPlayerId=state.lastHighestPlayerId;
  const details=[];
  if(publicState.armor!=null)details.push(`철갑 ${publicState.armor}`);
  if(publicState.swarm!=null)details.push(`쥐떼 ${publicState.swarm}/${mechanic.threshold}`);
  if(publicState.echo!=null)details.push(`메아리 ${publicState.echo}/${mechanic.threshold}`);
  if(publicState.meter!=null)details.push(`지배 ${publicState.meter}/${mechanic.maximum}`);
  if(publicState.countdown!=null)details.push(`남은 턴 ${publicState.countdown}`);
  if(publicState.progress!=null)details.push(`피해 ${publicState.progress}/${publicState.threshold}`);
  if(publicState.forbiddenNumber!=null)details.push(`금지 숫자 ${publicState.forbiddenNumber}`);
  if(publicState.phase==='ODD'||publicState.phase==='EVEN')details.push(`${publicState.phase==='ODD'?'홀수':'짝수'}의 종 · ${publicState.phase==='ODD'?'짝수':'홀수'} 공격 -1 (종 패널티만 최소 1)`);
  if(publicState.echoNumbers?.length)details.push(`직전 유효 숫자 ${publicState.echoNumbers.join(', ')}`);
  publicState.statusText=details.join(' · ');
  return publicState;
}

export function prepareMonsterTurn(run,intent){
  const monster=run.combat?.monster,mechanic=monster?.mechanic,state=monster?.behaviorState;
  if(!mechanic||!state)return intent;
  if(mechanic.type.startsWith('F2_'))return prepareF2Turn(run,intent);
  if(mechanic.type.startsWith('F3_'))return prepareF3Turn(run,intent);
  if(mechanic.type==='FORBIDDEN_NUMBER')state.forbiddenNumber=mechanic.numbers[(run.combat.turn-1)%mechanic.numbers.length];
  if(mechanic.type==='LAST_HIGHEST_TARGET'||mechanic.type==='HUNT'){
    if(mechanic.type==='HUNT'&&(!state.targetPlayerId||playerFor(run,state.targetPlayerId)?.status==='DOWNED')){
      const pool=living(run).sort(bySeat);
      state.targetPlayerId=choose(run,pool,`hunt-target:${run.floor}:${run.depth}:${run.combat.turn}:${monster.id}`).playerId;
    }
    const targetId=mechanic.type==='LAST_HIGHEST_TARGET'?state.lastHighestPlayerId:state.targetPlayerId;
    const target=playerFor(run,targetId);
    if(target&&target.status!=='DOWNED')intent.payload.targetPlayerId=target.playerId;
    if(mechanic.type==='HUNT')state.targetPlayerId=intent.payload.targetPlayerId;
    if(intent.payload.targetPlayerId&&!intent.telegraphText.includes('번 자리')){const chosen=playerFor(run,intent.payload.targetPlayerId);if(chosen)intent.telegraphText+=` (${chosen.seat+1}번 자리)`;}
  }
  const extra=monsterPresentation(run)?.statusText;
  intent.telegraphText+=extra?` · ${extra}`:'';
  intent.telegraphText+=` · ${adaptiveRuleSummary(run)}`;
  monster.presentation=monsterPresentation(run);
  return intent;
}

export function applyMonsterCardRules(run,cards,events=[]){
  const monster=run.combat?.monster,mechanic=monster?.mechanic,state=monster?.behaviorState;
  if(!mechanic||!state)return;
  if(mechanic.type.startsWith('F2_'))return applyF2CardRules(run,cards,events);
  if(mechanic.type.startsWith('F3_'))return applyF3CardRules(run,cards,events);
  const valid=cards.filter(card=>card.valid);
  state.validCount=valid.length;
  const collisionGroups=new Set(cards.filter(card=>card.invalidReason==='COLLISION').map(card=>card.finalNumber));
  state.collisionCount=collisionGroups.size;
  if(mechanic.type==='ARMOR_VALID_HITS'){
    for(const card of valid){if(state.armor>0){card.monsterDamagePenalty=(card.monsterDamagePenalty||0)+1;state.armor--;}}
  }else if(mechanic.type==='HUNT'){
    state.attackBlocked=valid.length>=patternRequirement(run,'requiredValidCount');
  }else if(mechanic.type==='COUNTDOWN_STRIKE'||mechanic.type==='PARTY_ORDER'){
    state.attackBlocked=valid.length>=patternRequirement(run,'requiredValidCount');
  }else if(mechanic.type==='LAST_HIGHEST_TARGET'){
    const ordered=valid.map(card=>({card,player:playerFor(run,card.playerId)})).sort((a,b)=>b.card.finalNumber-a.card.finalNumber||bySeat(a.player,b.player));
    state.lastHighestPlayerId=ordered[0]?.card.playerId||null;
  }else if(mechanic.type==='COLLISION_STACK'){
    changeMonsterStack(state,'swarm',collisionGroups.size?collisionGroups.size:-1,{maximum:3});
  }else if(mechanic.type==='VALID_GUARD'){
    state.guardPending=valid.length<patternRequirement(run,'requiredValidCount');
  }else if(mechanic.type==='FORBIDDEN_NUMBER'){
    for(const card of cards.filter(card=>card.finalNumber===state.forbiddenNumber)){
      card.monsterDamagePenalty=(card.monsterDamagePenalty||0)+mechanic.damagePenalty;
      const player=playerFor(run,card.playerId);player.publicResources.chain=1;
      events.push({type:'MONSTER_CHAINED',playerId:card.playerId,finalNumber:card.finalNumber});
    }
  }else if(mechanic.type==='ECHO'){
    const previous=new Set(state.lastValidNumbers);
    const repeated=valid.filter(card=>previous.has(card.finalNumber));
    const before=state.stacks.echo||0;
    changeMonsterStack(state,'echo',repeated.length?1:-1,{maximum:3});
    events.push({type:'ECHO_CHANGED',before,after:state.stacks.echo,delta:state.stacks.echo-before,repeatedNumbers:[...new Set(repeated.map(c=>c.finalNumber))].sort((a,b)=>a-b),repeatedPlayerIds:repeated.map(c=>c.playerId)});
    for(const card of valid)trackPlayerNumber(state,card.playerId,card.finalNumber);
    state.lastValidNumbers=[...new Set(valid.map(card=>card.finalNumber))].sort((a,b)=>a-b);
  }else if(mechanic.type==='PARITY_BELL'){
    const parity=state.phase==='ODD'?1:0;
    for(const card of valid)if(Math.abs(card.finalNumber%2)!==parity){card.monsterDamagePenalty=(card.monsterDamagePenalty||0)+mechanic.damagePenalty;card.parityBellPenalty=mechanic.damagePenalty;card.parityBellMinimumDamage=1;}
  }else if(mechanic.type==='DOMINION'){
    state.meter=Math.max(0,Math.min(mechanic.maximum,state.meter+(valid.length>=patternRequirement(run,'requiredValidCount')?-1:1)));
  }
  monster.presentation=monsterPresentation(run);
}

export function recordMonsterDamageBatch(run,totalDamage){
  const monster=run.combat?.monster,mechanic=monster?.mechanic,state=monster?.behaviorState;
  if(mechanic?.type?.startsWith('F2_'))return recordF2DamageBatch(run,totalDamage);
  if(mechanic?.type?.startsWith('F3_'))return recordF3DamageBatch(run,totalDamage);
  if(mechanic?.type!=='DPS_WINDOW'||!state)return;
  state.progress+=totalDamage;
  const tick=tickMonsterCountdown(state);
  if(tick.ready&&state.resolvedCycle!==state.cycle){
    state.pendingFailure=!checkPartyDamage(state.progress,{minimum:patternRequirement(run,'minimumDamage')}).passed;
    state.resolvedCycle=state.cycle;
  }
  monster.presentation=monsterPresentation(run);
}

export function prepareMonsterAction(run,intent){
  const monster=run.combat?.monster,mechanic=monster?.mechanic,state=monster?.behaviorState;
  if(!mechanic||!state)return intent;
  const action=structuredClone(intent);
  if(mechanic.type.startsWith('F2_'))return prepareF2Action(run,action);
  if(mechanic.type.startsWith('F3_'))return prepareF3Action(run,action);
  if(['HUNT','COUNTDOWN_STRIKE','PARTY_ORDER'].includes(mechanic.type)&&state.attackBlocked&&action.type!=='CHARGE'){
    action.type='CHARGE';action.telegraphText='유효 카드 협동으로 공격을 저지했다';action.payload={};
  }
  if(mechanic.type==='HUNT'&&action.type==='DIRECT_DAMAGE'&&state.collisionCount>=mechanic.collisionBoostAt)action.payload.amount=2;
  if(mechanic.type==='COLLISION_STACK'&&action.type==='DIRECT_DAMAGE'&&state.stacks.swarm>=mechanic.threshold){action.type='AOE_DAMAGE';action.payload={amount:1};}
  if(mechanic.type==='ECHO'&&action.type==='AOE_DAMAGE'&&state.stacks.echo>=mechanic.threshold)action.payload.amount=2;
  if(mechanic.type==='DOMINION'){
    if(['DEFEND','HEAL'].includes(action.type)&&state.meter>=2)action.payload.amount=(Number(action.payload.amount)||0)+1;
    if(action.type==='AOE_DAMAGE'&&state.meter>=mechanic.maximum)action.payload.amount=2;
  }
  if(mechanic.type==='DPS_WINDOW'&&state.countdown===0){
    action.type=state.pendingFailure?'AOE_DAMAGE':'CHARGE';
    action.payload=state.pendingFailure?{amount:1}:{};
    action.telegraphText=state.pendingFailure?'성문 파쇄 실패 · 전원 피해':'성문 파쇄 저지';
  }
  return action;
}

export function finishMonsterAction(run,action,events=[]){
  const monster=run.combat?.monster,mechanic=monster?.mechanic,state=monster?.behaviorState;
  if(!mechanic||!state)return;
  if(mechanic.type==='ARMOR_VALID_HITS'&&action.type==='DEFEND')state.armor=Math.min(mechanic.maximum,state.armor+mechanic.recover);
  if(mechanic.type==='VALID_GUARD'&&state.guardPending)monster.defense=mechanic.defense;
  if(mechanic.type==='COLLISION_STACK'&&action.type==='AOE_DAMAGE')state.stacks.swarm=0;
  if(mechanic.type==='ECHO'&&action.type==='AOE_DAMAGE')state.stacks.echo=0;
  if(mechanic.type==='COUNTDOWN_STRIKE'){
    const tick=tickMonsterCountdown(state);
    if(tick.ready)state.countdown=mechanic.length;
  }
  if(mechanic.type==='DPS_WINDOW'&&state.countdown===0){state.countdown=mechanic.length;state.progress=0;state.pendingFailure=false;state.cycle++;}
  if(mechanic.type==='PARITY_BELL')advanceMonsterPhase(state,['ODD','EVEN']);
  if(mechanic.type==='HUNT'&&action.type==='DIRECT_DAMAGE')state.targetPlayerId=null;
  if(mechanic.type==='FORBIDDEN_NUMBER')for(const player of living(run))delete player.publicResources.chain;
  monster.presentation=monsterPresentation(run);
  events.push({type:'MONSTER_BEHAVIOR_RESOLVED',mechanicType:mechanic.type,presentation:monster.presentation});
}
