import {applyParityBellPenalty} from './parity-bell.js';
import {prepareFragmentCards,captureFragments,beforeCollision,derivedProphetPackets,consumeFragment,resetProphecyCycle,fragmentRandomEligible} from './prophet-vampire-rework.js';
import {describeMonsterPattern,describeResolvedSkills} from './presentation.js';
import {twinsResolve,twinsAfterSpend,twinsCycleComplete,twinsAfterHpDamage} from './twins-runtime.js';
import {ghostResolve,ghostPostDamage} from './ghost-runtime.js';
import {protectVampireCollision,resolveVampireValidity,vampirePostDamage,vampirePreDown} from './vampire-runtime.js';
import {prepareMartialCollision,martialPacket,afterMartialDamage} from './martial-runtime.js';
import {gunnerPenetration,gunnerExtraComponent,gunnerState,markGunnerBurstPhase,syncGunnerMagazine} from './gunner-runtime.js';
import {choose} from './rng.js';
import {persistCardCycles} from './card-cycle.js';
import {drawGamblerHand,settleGamblerHand,prepareGamblerAllIn,gamblerSetDamage,finalizeGamblerActualDamage,finalizeGamblerAllIn,applyGamblerValidated,initializeGamblerCombat,cleanupGamblerCombat,prepareGamblerForcedAutoSubmission} from './gambler.js';
import {
  onTurnStartCharacter,onCycleStartCharacter,onTurnEndCharacter,selfModifyCard,collisionImmunity,onValidAttack,
  isCardSelectableForCharacter,validateCharacterSkillIntent,resolvePostCollisionCharacter,resolvePostCollisionEffects,resolveGuardianWallCollisions,
  applyPostPlayerAttackCharacter,baseDamageForCharacter,grantRunGold,onCombatEndCharacter,handleCycleExhaustedCharacter,onMonsterKilledCharacter
} from './characters.js';
import {publishMonsterIntent,executeMonsterIntent} from './monster.js';
import {applyMonsterCardRules,recordMonsterDamageBatch} from './monster-behavior.js';
import {advanceCompletedFloor,finalizeExpeditionClear} from './floor-transition.js';
import {resolveF2AfterDamage} from './monster-behavior-f2.js';
import {resolveF3AfterDamage} from './monster-behavior-f3.js';
import {applyMonsterDamage} from './monster.js';
import {beginAugmentChoices,grantGrowthExp} from './augments.js';
import {applyOwnedEffects} from './effects.js';
import {rogueArmorPenetration} from './rogue-runtime.js';
import {applyMageCollisionCorrection} from './mage-runtime.js';
import {initializeImpCombat,prepareImpSubmission,applyImpCardValidated,applyImpBeforeDamage} from './imp-runtime.js';
import {cleanupAugmentScope,resolveDelayed,clearAugmentStatusesForOwner} from './augment-framework.js';
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
function resetCycleIfNeeded(run,player,events=[],meta={}){
  const priv=run.combat.privateByPlayer[player.playerId];
  if(player.characterId==='prophet'){
    const previousCycleId=priv.cycleIndex||1,remainingBefore=[...priv.remainingCardIds],spentBefore=[...priv.spentCardIds];
    if(resetProphecyCycle(run,player,priv,()=>{applyOwnedEffects(run,'CYCLE_END',{player,privateState:priv,events});cleanupAugmentScope(run,'CYCLE',{playerId:player.playerId});})){
      onCycleStartCharacter(player,priv);
      events.push({type:'CYCLE_RESET',playerId:player.playerId,classId:player.characterId,turn:run.combat.turn,previousCycleId,nextCycleId:priv.cycleIndex,remainingBefore,spentBefore,remainingAfter:[...priv.remainingCardIds],spentAfter:[],resetReason:player.augments?.includes('aug-169')?'PROPHET_NORMAL_POOL_EXHAUSTION':'NATURAL_EXHAUSTION',rootActionId:meta.rootActionId||null});
      return true;
    }
  }
  if(priv.remainingCardIds.length)return false;
  if(player.characterId==='gambler'){drawGamblerHand(run,player,priv);return true;}
  if(handleCycleExhaustedCharacter(player,priv,run,events))return true;
  const previousCycleId=priv.cycleIndex||1,remainingBefore=[...(priv.remainingCardIds||[])],spentBefore=[...(priv.spentCardIds||[])],parityBefore=player.publicResources.parity??null;
  twinsCycleComplete(run,player,events);
  applyOwnedEffects(run,'CYCLE_END',{player,privateState:priv,events});
  cleanupAugmentScope(run,'CYCLE',{playerId:player.playerId});
  priv.cycleIndex=previousCycleId+1;
  priv.spentCardIds=[];
  priv.remainingCardIds=player.cardPool.map(c=>c.id);
  onCycleStartCharacter(player,priv);
  if(events){
    run.combat.derivedEventSequence=(Number(run.combat.derivedEventSequence)||0)+1;
    const rootActionId=meta.rootActionId||null,recoveryChainId=meta.recoveryChainId||rootActionId&&`recovery:${rootActionId}`||null;
    events.push({type:'CYCLE_RESET',eventId:`cycle-reset:${run.combat.id}:${run.combat.turn}:${run.combat.derivedEventSequence}`,turn:run.combat.turn,playerId:player.playerId,classId:player.characterId,previousCycleId,nextCycleId:priv.cycleIndex,resetReason:meta.reason||'NATURAL_EXHAUSTION',remainingBefore,spentBefore,remainingAfter:[...priv.remainingCardIds],spentAfter:[],parityBefore,parityAfter:player.publicResources.parity??null,rootActionId,recoveryChainId,parentEventId:meta.parentEventId||null,chainDepth:Number(meta.chainDepth)||1,sourceEffectId:meta.sourceEffectId||'CYCLE_EXHAUSTION'});
  }
  return true;
}
function spendResolvedCards(run,cards,events=[]){
  for(const rc of cards){
    const priv=run.combat.privateByPlayer[rc.playerId];
    const player=playerFor(run,rc.playerId);
    if(player.characterId==='gambler'){
      settleGamblerHand(run,player,priv,rc.cardInstanceId,rc.finalNumber,{rootActionId:`action:${run.combat.id}:${run.combat.turn}:${rc.playerId}:${rc.cardInstanceId}`});
      delete priv.selectedCardId;delete priv.skillIntent;
      if(run.combat.turnSubmissions[rc.playerId]?.autoSubmitted&&player.status==='STUNNED_NEXT_TURN')player.status='ACTIVE';
      continue;
    }
    if(player.characterId==='gunner'&&rc.skillUsed==='full_burst'&&gunnerState(run,player).burstActions?.['action:'+run.combat.id+':'+run.combat.turn+':'+player.playerId+':'+rc.cardInstanceId]?.completed)continue;
    consumeFragment(run,player,rc);
    const consume=[rc.cardInstanceId,...(rc.followUpCardIds||[])];
    for(const id of consume){
      priv.remainingCardIds=priv.remainingCardIds.filter(x=>x!==id);
      if(!priv.spentCardIds.includes(id))priv.spentCardIds.push(id);
    }
    if(player.characterId==='prophet'&&!rc.isPastFragment){const st=run.augmentFramework?.cardState?.[player.playerId+':pvCore'];if(st?.fragment?.createdTurn===run.combat.turn&&rc.cardInstanceId===st.zeroCardId){priv.spentCardIds=priv.spentCardIds.filter(id=>id!==st.zeroCardId);if(!priv.remainingCardIds.includes(st.zeroCardId))priv.remainingCardIds.push(st.zeroCardId);}}
    delete priv.selectedCardId;delete priv.skillIntent;
    if(run.combat.turnSubmissions[rc.playerId]?.autoSubmitted&&player.status==='STUNNED_NEXT_TURN')player.status='ACTIVE';
    const rootActionId=`action:${run.combat.id}:${run.combat.turn}:${rc.playerId}:${rc.cardInstanceId}`;
    twinsAfterSpend(run,player,rc,events);
    resetCycleIfNeeded(run,player,events,{reason:(rc.followUpCardIds||[]).length?'FULL_BURST':'NATURAL_EXHAUSTION',rootActionId,recoveryChainId:`recovery:${rootActionId}`,parentEventId:null,chainDepth:1,sourceEffectId:(rc.followUpCardIds||[]).length?'FULL_BURST':'CYCLE_EXHAUSTION'});
    if(player.characterId==='gunner'){
      if(rc.skillUsed==='full_burst'){
        markGunnerBurstPhase(run,player,rc,'MAGAZINE/CYCLE_ADVANCE');markGunnerBurstPhase(run,player,rc,'COOLDOWN/RECHARGE');
        gunnerState(run,player).burstActions['action:'+run.combat.id+':'+run.combat.turn+':'+player.playerId+':'+rc.cardInstanceId].completed=true;
      }
      syncGunnerMagazine(run,player);
    }
  }
  persistCardCycles(run,run.combat.privateByPlayer);
}
function resolveDowns(run){
  const events=[],pending=new Set(run.combat?.pendingDownPlayerIds||[]);
  for(const p of run.players)if(p.hp<=0)pending.add(p.playerId);
  const newlyDown=run.players.filter(p=>p.status!=='DOWNED'&&p.hp<=0&&pending.has(p.playerId)).sort((a,b)=>a.seat-b.seat);
  for(const p of newlyDown){
    clearAugmentStatusesForOwner(run,'GUARDIAN_EXTRA_REDIRECT',p.playerId);
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
    if(c.turnSubmissions[p.playerId])continue;
    const priv=c.privateByPlayer[p.playerId];
    if(!priv.remainingCardIds.length)resetCycleIfNeeded(run,p);
    const selectable=selectableIds(run,p);
    const protectedChoices=selectable.filter(id=>fragmentRandomEligible(run,p,id));
    // USER_CONFIRMED: if no other card exists, stun must submit the protected Fragment.
    const choices=protectedChoices.length?protectedChoices:selectable;
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
    const choices=selectableIds(run,p).filter(id=>fragmentRandomEligible(run,p,id));
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
  if(!c.combatStartEffectsApplied){for(const p of run.players){if(p.characterId==='imp')initializeImpCombat(run,p);if(p.characterId==='gambler')initializeGamblerCombat(run,p,c.privateByPlayer[p.playerId]);applyOwnedEffects(run,'COMBAT_START',{player:p,events:[]});}c.combatStartEffectsApplied=true;}
  c.phase='TURN_START';
  for(const p of run.players){onTurnStartCharacter(p,run);applyOwnedEffects(run,'TURN_START',{player:p,events:[]});}
  for(const p of run.players)if(p.characterId==='gambler'&&!c.privateByPlayer[p.playerId].forcedAutoSubmitNext)drawGamblerHand(run,p,c.privateByPlayer[p.playerId]);
  c.phase='INTENT_PUBLISH';publishMonsterIntent(run);
  c.phase='SELECTION_OPEN';for(const p of run.players)applyOwnedEffects(run,'PRE_SELECT',{player:p,privateState:c.privateByPlayer[p.playerId]});
  for(const p of run.players.filter(p=>p.characterId==='gambler'&&p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)){
    if(c.turnSubmissions[p.playerId])continue;const priv=c.privateByPlayer[p.playerId],cardId=prepareGamblerForcedAutoSubmission(run,p,priv);if(!cardId)continue;
    c.turnSubmissions[p.playerId]={playerId:p.playerId,cardInstanceId:cardId,skillIntent:false,submittedAt:new Date().toISOString(),autoSubmitted:true,forcedByAugment:'aug-235'};priv.selectedCardId=cardId;priv.skillIntent=false;
  }
  autoSubmitStunned(run);autoSubmitAi(run);
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
  if(skillData?.equipmentCategory!=null&&(!p.augments.includes('aug-020')||!['LOW','UTILITY','WEAPON'].includes(skillData.equipmentCategory)))throw new Error('INVALID_EQUIPMENT_CATEGORY');
  validateCharacterSkillIntent(p,priv,Boolean(skillIntent),card,skillData);
  if(p.characterId==='imp')prepareImpSubmission(run,p,skillData);
  c.turnSubmissions[playerId]={playerId,cardInstanceId,skillIntent:Boolean(skillIntent),skillData:skillData==null?null:structuredClone(skillData),submittedAt:new Date().toISOString()};
  priv.selectedCardId=cardInstanceId;priv.skillIntent=Boolean(skillIntent);
  applyOwnedEffects(run,'ON_SUBMIT',{player:p,privateState:priv,cardInstanceId});
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
  const mutationEvents=[],events=[...(c.pendingSkillEvents||[])];c.pendingSkillEvents=[];
  prepareFragmentCards(run,cards);
  initializeNumberHistories(cards);
  for(const rc of cards){const p=playerFor(run,rc.playerId);if(p?.characterId==='gambler')prepareGamblerAllIn(run,p,c.privateByPlayer[p.playerId],c.turnSubmissions[p.playerId],rc);}
  c.phase='PRE_COLLISION_SELF_MODIFY';phaseTrace.push(c.phase);
  for(const rc of cards){const p=playerFor(run,rc.playerId),submission=c.turnSubmissions[rc.playerId];if(submission.skillIntent)applyOwnedEffects(run,'ON_SKILL_USE',{player:p,resolved:rc,submission,privateState:c.privateByPlayer[p.playerId],events});selfModifyCard(p,rc,submission);applyOwnedEffects(run,'PRE_COLLISION_SELF_MODIFY',{player:p,resolved:rc,events});}
  recordSelfModification(cards,mutationEvents);
  c.phase='PRE_COLLISION_SWAP';phaseTrace.push(c.phase);for(const rc of cards)applyOwnedEffects(run,'PRE_COLLISION',{player:playerFor(run,rc.playerId),resolved:rc,events});applyPreCollisionSwap(run,cards,mutationEvents);
  c.phase='PRE_COLLISION_STEAL';phaseTrace.push(c.phase);applyPreCollisionSteal(run,cards,mutationEvents);
  c.phase='FINAL_NUMBER_REVEAL';phaseTrace.push(c.phase);finalizeNumbers(cards);captureFragments(run,cards,events);for(const rc of cards)applyOwnedEffects(run,'POST_REVEAL',{player:playerFor(run,rc.playerId),resolved:rc,events});
  c.phase='COLLISION_RESOLVE';phaseTrace.push(c.phase);
  for(const rc of cards)rc.collisionImmune=collisionImmunity(playerFor(run,rc.playerId),c.turnSubmissions[rc.playerId]);
  let groups=new Map();for(const rc of cards){const a=groups.get(rc.finalNumber)||[];a.push(rc);groups.set(rc.finalNumber,a);}
  groups=applyMageCollisionCorrection(run,cards,groups,events);
  attachCollisionGroups(run,cards,groups);beforeCollision(run,cards,events,groups);
  for(const group of groups.values()){
    if(group.length>1)for(const rc of group)if(!rc.collisionImmune){rc.valid=false;rc.invalidReason='COLLISION';}
  }
  prepareMartialCollision(run,cards,events);
  protectVampireCollision(run,cards,events);
  resolveGuardianWallCollisions(run,cards,groups,events);

  c.phase='POST_COLLISION_EFFECTS';phaseTrace.push(c.phase);
  const processedCollisionEventIds=new Set();
  const collisionGroups=resolvePostCollisionEffects(run,cards,groups,events,mutationEvents,processedCollisionEventIds);for(const rc of cards)applyOwnedEffects(run,'POST_COLLISION',{player:playerFor(run,rc.playerId),resolved:rc,submission:c.turnSubmissions[rc.playerId],privateState:c.privateByPlayer[rc.playerId],events});
  c.phase='VALIDITY_DERIVE';phaseTrace.push(c.phase);
  const validCards=cards.filter(x=>x.valid),lowestNumber=validCards.length?Math.min(...validCards.map(x=>x.finalNumber)):null;
  const lowestCards=validCards.filter(x=>x.finalNumber===lowestNumber);
  for(const rc of cards)rc.soloLowest=Boolean(rc.valid&&lowestCards.length===1&&lowestCards[0]===rc);
  for(const rc of cards){const p=playerFor(run,rc.playerId);applyOwnedEffects(run,'CARD_VALIDATED',{player:p,resolved:rc,cards,events});applyImpCardValidated(run,{player:p,resolved:rc,cards,events});if(p.characterId==='gambler')applyGamblerValidated(run,p,c.privateByPlayer[p.playerId],rc);resolvePostCollisionCharacter(run,rc,c.turnSubmissions[rc.playerId],events);}
  attachValidity(cards);c._pvCards=cards;
  for(const rc of cards){const p=playerFor(run,rc.playerId);if(p?.characterId==='gambler')finalizeGamblerAllIn(run,p,c.privateByPlayer[p.playerId],rc);}
  applyMonsterCardRules(run,cards,events);
  resolveVampireValidity(run,cards,events);
  for(const rc of cards){const p=playerFor(run,rc.playerId);ghostResolve(run,p,rc,c.turnSubmissions[rc.playerId],events);twinsResolve(run,p,rc,events);}
  c.phase='DAMAGE_BUILD';phaseTrace.push(c.phase);
  const defense=Math.max(0,Number(c.monster.defense)||0);
  const packets=[],monsterHpBeforeBatch=c.monster.hp;
  const packetIds=new Set();
  const burstPacket=(packet,{resolved,player,followUp=false,parentDamageEventId=null,baseNumber=null,baseDamage=null,classBonus=0,augmentBonus=0,modifierIds=[]}={})=>{
    const rootActionId=`action:${c.id}:${c.turn}:${resolved.playerId}:${resolved.cardInstanceId}`;
    const burstChainId=`burst:${c.id}:${c.turn}:${resolved.playerId}:${resolved.cardInstanceId}`;
    const ordinal=packets.length+1,damageEventId=`player-damage:${burstChainId}:${ordinal}`;
    if(packetIds.has(damageEventId)){const error=new Error('동일 player damage packet ID가 중복 생성되었습니다.');error.code='DUPLICATE_DAMAGE_PACKET';throw error;}
    packetIds.add(damageEventId);
    return {...packet,turn:c.turn,playerId:packet.sourcePlayerId,damageEventId,rootActionId,burstChainId,parentDamageEventId,followUpDepth:followUp?1:0,
      sourceClass:player.characterId,baseNumber:baseNumber??packet.numberUsed??null,baseDamage:baseDamage??0,classBonus,augmentBonus,
      followUpDamage:followUp?(Number(packet.amount)||0):0,modifierIds:[...modifierIds]};
  };
  for(const rc of cards.filter(x=>x.valid)){
    const player=playerFor(run,rc.playerId),martial=martialPacket(run,player,rc,defense),engraving=Number(player.engravings?.[String(rc.finalNumber)])||0;
    const classBonus=(player.characterId==='berserker'?1:0)+(player.characterId==='martial_artist'?Math.max(0,Number(rc.martialComboBonus)||0):0);
    const augmentBonus=Math.max(0,Number(rc.crushBonusDamage)||0)+Math.max(0,Number(rc.revengeBonusDamage)||0)+Math.max(0,Number(rc.finisherBonusDamage)||0)+Math.max(0,Number(rc.bloodFrenzyBonusDamage)||0)+Math.max(0,Number(rc.ghostSlashBonusDamage)||0);
    const modifierIds=[
      ...(player.characterId==='berserker'?['BERSERKER_BASE']:[]),
      ...(player.characterId==='martial_artist'&&Number(rc.martialComboBonus)>0?['MARTIAL_COMBO']:[]),
      ...(Number(rc.crushBonusDamage)>0?['AUG_051_CRUSH']:[]),
      ...(Number(rc.revengeBonusDamage)>0?['AUG_131_REVENGE']:[]),
      ...(Number(rc.finisherBonusDamage)>0?['AUG_291_ONE_HIT_KILL']:[]),
      ...(Number(rc.bloodFrenzyBonusDamage)>0?['AUG_121_BLOOD_FRENZY']:[]),
      ...(Number(rc.ghostSlashBonusDamage)>0?['GHOST_SLASH']:[])
    ];
    const knightArmorPenetration=player.characterId==='warrior'&&player.augments.includes('aug-052')&&Number(rc.crushedCardCount)>0?Math.min(1,defense):0;
    const roguePoisonPenetration=rogueArmorPenetration(run,player,rc,Math.max(0,defense-knightArmorPenetration));
    const gunnerArmorPenetration=gunnerPenetration(run,player,rc,Math.max(0,defense-knightArmorPenetration-roguePoisonPenetration));
    const armorPenetration=Math.min(defense,knightArmorPenetration+roguePoisonPenetration+gunnerArmorPenetration+martial.penetration);
    if(knightArmorPenetration)modifierIds.push('AUG_052_ARMOR_PENETRATION');
    if(roguePoisonPenetration)modifierIds.push('ROGUE_POISON_DEFENSE');
    const damageBeforeBell=Math.max(0,baseDamageForCharacter(player,rc)+engraving+martial.bonus+(Number(rc.vampireBonus)||0)+(Number(rc.ghostBonus)||0)-Math.max(0,martial.defense-armorPenetration)-Math.max(0,(rc.monsterDamagePenalty||0)-(rc.parityBellPenalty||0)));
    const ordinaryAmount=rc.parityBellPenalty?applyParityBellPenalty(damageBeforeBell,rc):damageBeforeBell;
    const resolvedAmount=player.characterId==='gambler'?gamblerSetDamage(run,player,c.privateByPlayer[player.playerId],rc,ordinaryAmount):ordinaryAmount;
    let primary=burstPacket({sourcePlayerId:rc.playerId,sourceCardId:rc.cardInstanceId,numberUsed:rc.finalNumber,amount:resolvedAmount,armorPenetration,tags:[...(rc.allIn?['ALL_IN','SET_DAMAGE']:['BASE_CARD'])],followUp:false},
      {resolved:rc,player,baseNumber:rc.finalNumber,baseDamage:rc.finalNumber,classBonus,augmentBonus,modifierIds});
    const primaryDamage={amount:primary.amount},queued=[];
    applyOwnedEffects(run,'BEFORE_DAMAGE',{player,resolved:rc,damage:primaryDamage,followUps:queued,followUp:false,events:[]});
    applyImpBeforeDamage(run,{player,resolved:rc,damage:primaryDamage,followUp:false,events});
    primary.amount=Math.max(0,primaryDamage.amount);if(player.characterId==='gambler')finalizeGamblerActualDamage(run,player,c.privateByPlayer[player.playerId],rc,primary.amount);packets.push(primary);
    for(const q of queued){
      if((Number(q.followUpDepth)||1)>1){const error=new Error('follow-up depth가 Tier-I 허용 범위를 초과했습니다.');error.code='FOLLOW_UP_DEPTH_EXCEEDED';throw error;}
      packets.push(burstPacket({...q,sourceCardId:q.sourceCardId||rc.cardInstanceId,followUp:true},{resolved:rc,player,followUp:true,parentDamageEventId:primary.damageEventId,baseNumber:q.numberUsed??rc.finalNumber,baseDamage:Number(q.amount)||0}));
    }
    const followSeen=new Set();
    if(player.characterId==='gunner'&&rc.skillUsed==='full_burst')markGunnerBurstPhase(run,player,rc,'REMAINING_CARD_USE');
    for(const extraId of rc.followUpCardIds||[]){
      if(followSeen.has(extraId)){const error=new Error('Full Burst가 동일 physical card를 두 번 사용했습니다.');error.code='FOLLOW_UP_CARD_DUPLICATE';throw error;}followSeen.add(extraId);
      const extra=cardFor(run,rc.playerId,extraId);if(!extra)continue;
      let packet=burstPacket({sourcePlayerId:rc.playerId,sourceCardId:extra.id,numberUsed:extra.baseNumber,amount:Math.max(0,extra.baseNumber+(Number(player.engravings?.[String(extra.baseNumber)])||0)-defense),tags:['FOLLOW_UP'],followUp:true},
        {resolved:rc,player,followUp:true,parentDamageEventId:primary.damageEventId,baseNumber:extra.baseNumber,baseDamage:extra.baseNumber});
      const damage={amount:packet.amount},extraQueued=[];
      applyOwnedEffects(run,'BEFORE_DAMAGE',{player,resolved:rc,damage,followUps:extraQueued,followUp:true,sourceCardId:extra.id,events:[]});
      if(extraQueued.length){const error=new Error('Tier-I Full Burst follow-up이 추가 follow-up을 재귀 생성했습니다.');error.code='RECURSIVE_FOLLOW_UP';throw error;}
      packet.amount=Math.max(0,damage.amount);packet.followUpDamage=packet.amount;packets.push(packet);
    }
    if(rc.twinsExtra>0)packets.push(burstPacket({sourcePlayerId:rc.playerId,sourceCardId:rc.cardInstanceId,numberUsed:rc.finalNumber,amount:rc.twinsExtra,extraDamageComponent:true,tags:['TWINS_EXTRA_DAMAGE_COMPONENT'],followUp:false},{resolved:rc,player,baseDamage:0,modifierIds:['aug-379']}));
    if(rc.ghostExtra>0)packets.push(burstPacket({sourcePlayerId:rc.playerId,sourceCardId:rc.cardInstanceId,numberUsed:rc.finalNumber,amount:rc.ghostExtra,extraDamageComponent:true,tags:['GHOST_EXTRA_DAMAGE_COMPONENT'],followUp:false},{resolved:rc,player,baseDamage:0,modifierIds:['aug-359']}));
    if(martial.extra>0)packets.push(burstPacket({sourcePlayerId:rc.playerId,sourceCardId:rc.cardInstanceId,numberUsed:rc.finalNumber,amount:martial.extra,extraDamageComponent:true,tags:['MARTIAL_EXTRA_DAMAGE_COMPONENT'],followUp:false},{resolved:rc,player,baseDamage:0,modifierIds:['MARTIAL_EXTRA_DAMAGE_COMPONENT']}));
    if(player.characterId==='gunner'){
      const component=gunnerExtraComponent(run,player,rc);
      if(component)packets.push(burstPacket({...component,sourcePlayerId:rc.playerId,sourceCardId:rc.cardInstanceId,numberUsed:rc.finalNumber,tags:['AUG_248_EXTRA_DAMAGE_COMPONENT'],followUp:false},{resolved:rc,player,baseDamage:0,modifierIds:['aug-248']}));
    }
  }
  for(const rc of cards){const p=playerFor(run,rc.playerId);if(p.characterId==='gunner'&&rc.skillUsed==='full_burst'){markGunnerBurstPhase(run,p,rc,'REMAINING_CARD_USE');markGunnerBurstPhase(run,p,rc,'DAMAGE_RESOLUTION');}}
  packets.push(...derivedProphetPackets(run,cards));
  c.monster.defense=0;
  c.phase='DAMAGE_BATCH_APPLY';phaseTrace.push(c.phase);
  const totalDamage=packets.reduce((s,p)=>s+p.amount,0);
  let virtualHp=monsterHpBeforeBatch;
  const thresholdValues=[.75,.5,.25].map(r=>({ratio:r,hp:c.monster.maxHp*r}));
  for(const packet of packets){
    packet.bossHpBefore=virtualHp;const next=Math.max(0,virtualHp-packet.amount);packet.bossHpAfter=next;
    packet.bossThresholdsCrossed=c.roomType==='BOSS'?thresholdValues.filter(t=>virtualHp>t.hp&&next<=t.hp).map(t=>t.ratio):[];
    packet.bossPhasesSkipped='NOT_MEASURABLE';virtualHp=next;
  }
  c.monster.hp=Math.max(0,c.monster.hp-totalDamage);
  recordMonsterDamageBatch(run,totalDamage);
  attachDamage(cards,packets);
  // Final attack packets match displayed damage, including Full Burst and extra
  // components. Armor/invalidity have already resolved; poison is applied later.
  // The persisted turn guard prevents duplicate grants on resolution replay.
  if(c.attackExpGrantedTurn!==c.turn){
    const validOwners=new Set(cards.filter(card=>card.valid).map(card=>card.playerId));
    const expByPlayer=new Map();
    for(const packet of packets){
      if(packet.derived||!validOwners.has(packet.sourcePlayerId))continue;
      const amount=Math.max(0,Number(packet.amount)||0);
      if(!Number.isSafeInteger(amount))throw new Error('INVALID_ATTACK_EXP_AMOUNT');
      expByPlayer.set(packet.sourcePlayerId,(expByPlayer.get(packet.sourcePlayerId)||0)+amount);
    }
    for(const [playerId,amount] of expByPlayer){
      const gained=grantGrowthExp(run,playerId,amount);
      if(gained)events.push({type:'GROWTH_EXP_GAINED',playerId,amount:gained,source:'COMBAT_DAMAGE',turn:c.turn});
    }
    c.attackExpGrantedTurn=c.turn;
  }
  validateNumberMutationState(run,cards,mutationEvents,{packets});
  let skillInterventions=[];
  const monsterPattern=describeMonsterPattern(run,cards,totalDamage,events);
  const buildTurnResult=(trace=phaseTrace)=>({
    skillInterventions,
    monsterPattern:c.monster.hp<=0&&monsterPattern?{...monsterPattern,outcome:'BLOCKED',label:'격파 · 패턴 종료'}:monsterPattern,
    turn:c.turn,cards,damagePackets:packets,totalDamage,phaseTrace:trace,events,
    collisionGroups:structuredClone(collisionGroups),collisionResolutionPasses:1,postCollisionEffectPasses:1,
    numberHistories:cards.map(card=>structuredClone(card.numberHistory)),
    mutationEvents:structuredClone(mutationEvents)
  });
  for(const packet of packets.filter(packet=>!packet.extraDamageComponent)){const p=playerFor(run,packet.sourcePlayerId),resolved=cards.find(x=>x.playerId===packet.sourcePlayerId);applyOwnedEffects(run,'AFTER_DAMAGE',{player:p,resolved,damage:{amount:packet.amount},followUp:packet.followUp,packet,events:[]});}
  for(const rc of cards)if(rc.valid)onValidAttack(playerFor(run,rc.playerId),run,rc,events);
  for(const rc of cards)afterMartialDamage(run,playerFor(run,rc.playerId),rc);
  vampirePostDamage(run,cards,packets,events,monsterHpBeforeBatch);
  ghostPostDamage(run,cards,packets,events);
  c.phase='POST_PLAYER_ATTACK';phaseTrace.push(c.phase);
  for(const rc of cards.filter(x=>x.valid))applyPostPlayerAttackCharacter(run,rc,events);
  for(const rc of cards.filter(x=>x.burstMisfire)){
    const p=playerFor(run,rc.playerId);
    const state=gunnerState(run,p),guard='action:'+c.id+':'+c.turn+':'+p.playerId+':'+rc.cardInstanceId+':self-damage';
    if(state.applied[guard])continue;state.applied[guard]=true;
    const before=p.hp;p.hp=Math.max(0,p.hp-1);state.telemetry.failureSelfDamage+=before-p.hp;
    events.push({type:'FULL_BURST_MISFIRE',playerId:p.playerId,amount:before-p.hp,hp:p.hp,source:'GUNSLINGER_FULL_BURST_FAILURE',damageType:'SELF',canDown:true,minHP:0,timing:'POST_PLAYER_ATTACK'});
  }
  skillInterventions=describeResolvedSkills(run,cards);
  resolveF2AfterDamage(run,events,applyMonsterDamage);
  resolveF3AfterDamage(run,events,applyMonsterDamage);
  c.phase='KILL_CHECK';phaseTrace.push(c.phase);
  if(c.monster.hp<=0){
    onMonsterKilledCharacter(run,cards,packets,events);
    vampirePreDown(run,cards,events);
    events.push(...resolveDowns(run));
    spendResolvedCards(run,cards,events);c.turnSubmissions={};
    if(run.phase==='RUN_FAILED'){
      // RULE-01: Flame 0 + boss kill + full-party DOWNED resolves as RUN_FAILED before any boss-clear revival.
      c.phase='COMBAT_END';phaseTrace.push(c.phase);
      for(const p of run.players){applyOwnedEffects(run,'COMBAT_END',{player:p,roomTypeOverride:'COMBAT'});applyOwnedEffects(run,'ROOM_END',{player:p,roomTypeOverride:'COMBAT'});applyOwnedEffects(run,'RUN_END',{player:p,roomTypeOverride:'COMBAT'});onCombatEndCharacter(p,run);if(p.characterId==='gambler')cleanupGamblerCombat(run,p);}
      cleanupAugmentScope(run,'COMBAT');cleanupAugmentScope(run,'ROOM');cleanupAugmentScope(run,'RUN');resolveDelayed(run,Number.MAX_SAFE_INTEGER);
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
    for(const p of run.players){applyOwnedEffects(run,'COMBAT_END',{player:p,events});applyOwnedEffects(run,'ROOM_END',{player:p,events});if(c.roomType==='BOSS')applyOwnedEffects(run,'FLOOR_END',{player:p,events});if(c.roomType==='BOSS'&&run.floor===3)applyOwnedEffects(run,'RUN_END',{player:p,events});}
    for(const p of run.players){onCombatEndCharacter(p,run);if(p.characterId==='gambler')cleanupGamblerCombat(run,p);}
    cleanupAugmentScope(run,'COMBAT');cleanupAugmentScope(run,'ROOM');resolveDelayed(run,Number.MAX_SAFE_INTEGER);
    if(c.roomType==='BOSS'){
      run.phase='FLOOR_CLEAR';
      run.floorClear={floor:run.floor,bossId:c.monster.id,bossName:c.monster.name};
      if(run.floor<3)beginAugmentChoices(run,'FLOOR_CLEAR');
    }else{
      run.phase='ROOM_RESULT';
      run.roomResult={roomNodeId:run.currentRoomNodeId,readyPlayerIds:run.players.filter(p=>p.memberType==='ai').map(p=>p.playerId)};
      beginAugmentChoices(run,'ROOM_RESULT');
    }
    c.publicTurnResult=buildTurnResult([...phaseTrace,'COMBAT_END']);
    recordCombatTurnTelemetry(run,c.publicTurnResult);finalizeCombatTelemetry(run,'VICTORY');
    if(c.roomType==='BOSS'&&run.floor<3&&run.phase==='FLOOR_CLEAR'&&Number.isInteger(run.map?.depthCount)){
      run.floorTransitionResult={publicTurnResult:structuredClone(c.publicTurnResult),monster:{id:c.monster.id,name:c.monster.name,hp:c.monster.hp,maxHp:c.monster.maxHp}};
      advanceCompletedFloor(run);
    }
    if(c.roomType==='BOSS'&&run.floor===3)finalizeExpeditionClear(run);
    return c.publicTurnResult;
  }
  c.phase='MONSTER_ACTION';phaseTrace.push(c.phase);events.push(...executeMonsterIntent(run));
  twinsAfterHpDamage(run,events);
  vampirePreDown(run,cards,events);
  c.phase='DOWN_RESOLVE';phaseTrace.push(c.phase);events.push(...resolveDowns(run));
  spendResolvedCards(run,cards,events);c.turnSubmissions={};
  if(run.phase==='RUN_FAILED'){
    c.phase='COMBAT_END';phaseTrace.push(c.phase);
    for(const p of run.players){applyOwnedEffects(run,'COMBAT_END',{player:p,roomTypeOverride:'COMBAT'});applyOwnedEffects(run,'ROOM_END',{player:p,roomTypeOverride:'COMBAT'});applyOwnedEffects(run,'RUN_END',{player:p,roomTypeOverride:'COMBAT'});onCombatEndCharacter(p,run);if(p.characterId==='gambler')cleanupGamblerCombat(run,p);}
    cleanupAugmentScope(run,'COMBAT');cleanupAugmentScope(run,'ROOM');cleanupAugmentScope(run,'RUN');resolveDelayed(run,Number.MAX_SAFE_INTEGER);
    c.publicTurnResult=buildTurnResult();
    recordCombatTurnTelemetry(run,c.publicTurnResult);finalizeCombatTelemetry(run,'RUN_FAILED');
    return c.publicTurnResult;
  }
  for(const p of run.players){onTurnEndCharacter(p,run,events);applyOwnedEffects(run,'TURN_END',{player:p,privateState:c.privateByPlayer[p.playerId],events});}
  cleanupAugmentScope(run,'TURN');
  c.phase='TURN_END';phaseTrace.push(c.phase);
  c.publicTurnResult=buildTurnResult();
  recordCombatTurnTelemetry(run,c.publicTurnResult);
  c.turn+=1;beginTurn(run);
  return c.publicTurnResult;
}
