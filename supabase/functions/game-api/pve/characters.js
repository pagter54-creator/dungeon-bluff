import {choose} from './rng.js';
import {clearCombatResources,clearResourcesByScope,resourceMax} from './resources.js';
import {executableAugmentRuntime} from './augment-runtime.js';

export const PVE_CHARACTER_DEFS={
  adventurer:{deck:[1,2,3,4,5],skillId:'gold_bonus'},
  warrior:{deck:[2,3,4,5,5],skillId:'toughness'},
  mage:{deck:[1,2,3,4,4],skillId:'amplify'},
  rogue:{deck:[1,1,3,4,5],skillId:'sneaky_strike'},
  berserker:{deck:[1,2,4,4,5],skillId:null},
  vampire:{deck:[1,2,3,4,5],skillId:'blood_command'},
  imp:{deck:[1,2,3,4,5],skillId:'steal'},
  prophet:{deck:[1,2,3,4,5],skillId:'revelation'},
  gunner:{deck:[1,2,3],skillId:'full_burst'},
  martial_artist:{deck:[1,2,3,4,5],skillId:'one_hit_kill'},
  demon_swordsman:{deck:[1,2,3,4,4],skillId:'ghost_slash'},
  twins:{deck:[1,2,3,4],skillId:'acrobatics'},
};
const fallback={deck:[1,2,3,4,5],skillId:null};

export class PveSkillError extends Error{
  constructor(code,message){super(message);this.name='PveSkillError';this.code=code;}
}
const rejectSkill=(code,message)=>{throw new PveSkillError(code,message);};

export function pveCharacterDef(characterId){return PVE_CHARACTER_DEFS[characterId]||fallback;}
const setCanonicalBaseDeck=(player,numbers)=>{
  const current=(player.cardPool||[]).map(card=>card.baseNumber);
  if(current.length===numbers.length&&current.every((n,i)=>n===numbers[i]))return;
  const onlyBase=(player.cardPool||[]).every(card=>card.source==='BASE');
  if(!onlyBase)return;
  player.cardPool=numbers.map((baseNumber,i)=>({id:`${player.playerId}:base:${i+1}`,baseNumber,source:'BASE'}));
};
const updateGhostSlashLevel=(player,events=[],reason='DEVOUR',context={})=>{
  if(player.characterId!=='demon_swordsman'||player.augments.includes('aug-351'))return 0;
  const devour=Math.max(0,Number(player.publicResources.devour)||0);
  const threshold=Math.max(1,Number(runtimeConfig('aug-331').levelThreshold)||8);
  const before=Math.max(0,Number(player.publicResources.ghostSlashLevel)||0),after=Math.floor(devour/threshold);
  if(after<=before)return 0;
  const readyBefore=player.publicResources.ghostSlashReady===true;
  player.publicResources.ghostSlashLevel=after;player.publicResources.ghostSlashReady=true;
  const rootActionId=context.rootActionId||null,recoveryChainId=context.recoveryChainId||rootActionId&&`reactivation:${rootActionId}`||null;
  events.push({type:'GHOST_SLASH_LEVEL_UP',playerId:player.playerId,before,after,devour,reason,reactivated:!readyBefore,rootActionId,recoveryChainId,parentEventId:context.parentEventId||null,chainDepth:Number(context.chainDepth)||1,sourceEffectId:context.sourceEffectId||'DEMON_BASE'});
  if(!readyBefore)events.push({type:'GHOST_SLASH_REACTIVATED',playerId:player.playerId,skillId:'ghost_slash',stateBefore:'USED',stateAfter:'READY',reactivationReason:'LEVEL_UP',devourBefore:context.devourBefore??null,devourAfter:devour,levelBefore:before,levelAfter:after,rootActionId,recoveryChainId,parentEventId:context.parentEventId||null,chainDepth:Number(context.chainDepth)||1,sourceEffectId:context.sourceEffectId||'DEMON_BASE'});
  return after-before;
};
const gainDevour=(player,amount,events=[],reason='VALID_ATTACK',context={})=>{
  const gain=Math.max(0,Number(amount)||0);if(player.characterId!=='demon_swordsman'||gain<=0)return 0;
  const before=Math.max(0,Number(player.publicResources.devour)||0),after=before+gain;
  player.publicResources.devour=after;
  const rootActionId=context.rootActionId||null,recoveryChainId=context.recoveryChainId||rootActionId&&`reactivation:${rootActionId}`||null;
  const eventId=context.eventId||rootActionId&&`devour:${rootActionId}:${reason}:${before}->${after}`||null;
  events.push({type:'DEVOUR_GAINED',eventId,playerId:player.playerId,before,after,amount:gain,reason,rootActionId,recoveryChainId,parentEventId:context.parentEventId||null,chainDepth:Number(context.chainDepth)||1,sourceEffectId:context.sourceEffectId||'DEMON_BASE'});
  if(player.augments.includes('aug-351')){
    const threshold=Math.max(1,Number(runtimeConfig('aug-351').transformThreshold)||6);
    if(before<threshold&&after>=threshold&&!player.publicResources.transformationActive&&!player.publicResources.transformationPending){
      player.publicResources.transformationPending=true;
      events.push({type:'DEMON_TRANSFORMATION_READY',playerId:player.playerId,threshold,before,after,rootActionId,recoveryChainId,parentEventId:eventId,chainDepth:(Number(context.chainDepth)||1)+1,sourceEffectId:'aug-351'});
    }
  }else updateGhostSlashLevel(player,events,reason,{...context,devourBefore:before,parentEventId:eventId,chainDepth:(Number(context.chainDepth)||1)+1});
  return gain;
};
function activateDemonTransformation(player,privateState,run,events=[]){
  if(player.characterId!=='demon_swordsman'||!player.augments.includes('aug-351')||!player.publicResources.transformationPending||player.publicResources.transformationActive)return false;
  const cfg=runtimeConfig('aug-351'),deck=[...(cfg.transformedDeck||[2,4,5,6])];
  privateState.demonNormalCardPool=structuredClone(player.cardPool);
  privateState.demonNormalRemaining=[...(privateState.remainingCardIds||[])];
  privateState.demonNormalSpent=[...(privateState.spentCardIds||[])];
  privateState.demonNormalCycleIndex=privateState.cycleIndex||1;
  const serial=(Number(privateState.demonTransformationSerial)||0)+1;privateState.demonTransformationSerial=serial;
  player.cardPool=deck.map((baseNumber,i)=>({id:`${player.playerId}:demon:${run.combat.id}:${serial}:${i+1}`,baseNumber,source:'DEMON_TRANSFORM',tags:['TEMPORARY','TRANSFORMED']}));
  privateState.remainingCardIds=player.cardPool.map(card=>card.id);privateState.spentCardIds=[];delete privateState.selectedCardId;
  player.publicResources.transformationPending=false;player.publicResources.transformationActive=true;
  player.publicResources.transformationTurn=run.combat.turn;player.publicResources.devourAtTransform=player.publicResources.devour||0;
  events.push({type:'DEMON_TRANSFORMED',playerId:player.playerId,turn:run.combat.turn,devourAtTransform:player.publicResources.devourAtTransform,cardNumbers:deck,serial});
  return true;
}
export function handleCycleExhaustedCharacter(player,privateState,run){
  if(player.characterId!=='demon_swordsman'||!player.augments.includes('aug-351')||!player.publicResources.transformationActive||!privateState.demonNormalCardPool)return false;
  player.cardPool=structuredClone(privateState.demonNormalCardPool);
  privateState.remainingCardIds=[...(privateState.demonNormalRemaining||[])];
  privateState.spentCardIds=[...(privateState.demonNormalSpent||[])];
  privateState.cycleIndex=privateState.demonNormalCycleIndex||privateState.cycleIndex||1;
  delete privateState.demonNormalCardPool;delete privateState.demonNormalRemaining;delete privateState.demonNormalSpent;delete privateState.demonNormalCycleIndex;
  player.publicResources.transformationActive=false;player.publicResources.transformationPending=false;
  delete player.publicResources.transformationTurn;delete player.publicResources.devourAtTransform;
  player.publicResources.devour=0;
  return true;
}
export function initializeCombatCharacter(player){
  clearCombatResources(player);
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=1;
  if(player.characterId==='mage')player.publicResources.mana=0;
  if(player.characterId==='prophet')player.publicResources.revelation=0;
  if(player.characterId==='berserker'&&player.augments.includes('aug-131'))player.publicResources.revenge=0;
  if(player.characterId==='vampire'&&player.augments.includes('aug-321'))player.publicResources.blood=0;
  if(player.characterId==='gunner'){
    if(player.augments.includes('aug-241'))setCanonicalBaseDeck(player,[...(runtimeConfig('aug-241').expandedDeck||[1,2,2,3])]);
    player.publicResources.fullBurstReady=true;
    player.publicResources.burstReadyCycle=1;
  }
  if(player.characterId==='martial_artist'){
    player.publicResources.combo=0;delete player.publicResources.lastSubmittedNumber;
  }
  if(player.characterId==='demon_swordsman'){
    if(player.augments.includes('aug-351')){
      player.publicResources.devour=0;player.publicResources.ghostSlashLevel=0;player.publicResources.ghostSlashReady=false;
      player.publicResources.transformationActive=false;player.publicResources.transformationPending=false;
    }else{
      player.publicResources.devour=Math.max(0,Number(player.publicResources.devour)||0);
      player.publicResources.ghostSlashLevel=Math.floor(player.publicResources.devour/8);player.publicResources.ghostSlashReady=true;
    }
  }
  if(player.characterId==='twins'){
    player.publicResources.acrobaticsReady=true;
    player.publicResources.acrobaticsRechargeProgress=0;
    player.publicResources.acrobaticsBoostReady=false;
    delete player.publicResources.parity;
  }
}
export function onTurnStartCharacter(player,run){
  clearResourcesByScope(player,'TURN');
  if(player.characterId==='prophet'){
    const priv=run.combat?.privateByPlayer?.[player.playerId];
    if(priv)delete priv.revelationPeek;
  }
  if(player.status==='DOWNED')return;
  if(player.characterId==='mage')player.publicResources.mana=Math.min(resourceMax(player,'mana',4),(player.publicResources.mana||0)+1);
  if(player.characterId==='twins'){
    if(!Number.isInteger(player.publicResources.parity))player.publicResources.parity=choose(run,[0,1],`twins-parity:${player.playerId}`);
    const state=run.combat?.privateByPlayer?.[player.playerId]||run.roomState?.privateByPlayer?.[player.playerId];
    const remaining=(state?.remainingCardIds||[]).map(id=>player.cardPool.find(card=>card.id===id)?.baseNumber).filter(Number.isInteger);
    if(remaining.length&&!remaining.some(number=>number%2===player.publicResources.parity))player.publicResources.parity=1-player.publicResources.parity;
  }
}
export function onCycleStartCharacter(player,privateState){
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=Math.min(resourceMax(player,'toughnessCharges',2),(player.publicResources.toughnessCharges||0)+1);
  if(player.characterId==='gunner'){
    player.publicResources.fullBurstReady=(privateState.cycleIndex||1)>=(player.publicResources.burstReadyCycle||1);
  }
  if(player.characterId==='demon_swordsman'&&!player.augments.includes('aug-351'))player.publicResources.ghostSlashReady=true;
  if(player.characterId==='twins'){
    if(player.augments.includes('aug-381'))return;
    const lock=player.persistentCharacterState.acrobaticsLockCycle;
    if(lock!=null&&(privateState.cycleIndex||1)>lock){
      player.publicResources.acrobaticsReady=true;
      delete player.persistentCharacterState.acrobaticsLockCycle;
    }
  }
}
export function onTurnEndCharacter(player,run=null,events=[]){
  if(player.characterId==='twins'&&Number.isInteger(player.publicResources.parity)){
    const before=player.publicResources.parity;player.publicResources.parity=1-before;
    events.push({type:'TWINS_PARITY_FLIPPED',playerId:player.playerId,before,after:player.publicResources.parity,reason:'TURN_END',turn:run?.combat?.turn??null});
  }
  if(player.characterId==='demon_swordsman'&&run?.combat)activateDemonTransformation(player,run.combat.privateByPlayer?.[player.playerId],run,events);
}
export function isCardSelectableForCharacter(player,card){
  if(player.characterId!=='twins')return true;
  return card.baseNumber%2===(player.publicResources.parity||0);
}
export function validateCharacterSkillIntent(player,privateState,skillIntent,card=null,skillData=null){
  if(!skillIntent)return;
  if(player.characterId==='twins')rejectSkill('INVALID_PHASE','곡예는 카드 제출 전에 별도 스킬로 사용해야 합니다.');
  if(player.characterId==='prophet')rejectSkill('INVALID_PHASE','계시는 카드 확정 제출 전에 별도 스킬로 사용해야 합니다.');
  if(player.characterId==='gunner'&&!player.publicResources.fullBurstReady)rejectSkill('SKILL_NOT_READY','전탄발사가 아직 재충전되지 않았습니다.');
  if(player.characterId==='martial_artist'){
    if(!player.augments.includes('aug-291'))rejectSkill('INVALID_SKILL_REQUEST','현재 무투가 빌드에는 제출형 액티브가 없습니다.');
    const combo=Math.max(0,Number(player.publicResources.combo)||0);
    if(combo<1)rejectSkill('INSUFFICIENT_RESOURCE','일격필살에 필요한 연격이 없습니다.');
    if(privateState?.finisherUsedCycle===(privateState?.cycleIndex||1))rejectSkill('ALREADY_USED','일격필살은 사이클당 1회만 사용할 수 있습니다.');
  }
  if(player.characterId==='demon_swordsman'){
    if(player.augments.includes('aug-351'))rejectSkill('INVALID_SKILL_REQUEST','해방된 귀검은 귀참 대신 귀화를 사용합니다.');
    if(!player.publicResources.ghostSlashReady)rejectSkill('SKILL_NOT_READY','이번 사이클의 귀참을 이미 사용했습니다.');
  }
  if(player.characterId==='warrior'&&(player.publicResources.toughnessCharges||0)<1)rejectSkill('INSUFFICIENT_RESOURCE','강인함 충전이 없습니다.');
  if(player.characterId==='mage'){
    const mana=player.publicResources.mana||0;
    if(player.augments.includes('aug-111')){
      const direction=Number(skillData?.direction),manaSpend=Number(skillData?.manaSpend);
      if(![-1,1].includes(direction))rejectSkill('INVALID_SKILL_REQUEST','역산술 방향은 +1 또는 -1이어야 합니다.');
      if(![2,4].includes(manaSpend))rejectSkill('INVALID_SKILL_REQUEST','역산술은 마나 2 또는 4를 선택해야 합니다.');
      if(mana<manaSpend)rejectSkill('INSUFFICIENT_RESOURCE','마나가 부족합니다.');
      const magnitude=manaSpend===4?2:1,next=(card?.baseNumber??0)+direction*magnitude;
      if(!Number.isInteger(next)||next<0||next>6)rejectSkill('INVALID_SKILL_REQUEST','역산술 결과는 0~6 범위여야 합니다.');
    }else{
      const allowed=player.augments.includes('aug-091')?[2,4,6]:[2,4];
      const requested=skillData?.manaSpend==null?null:Number(skillData.manaSpend);
      const manaSpend=requested??(player.augments.includes('aug-091')&&mana>=6?6:mana>=4?4:2);
      if(!allowed.includes(manaSpend))rejectSkill('INVALID_SKILL_REQUEST','증폭 마나 비용이 올바르지 않습니다.');
      if(mana<manaSpend)rejectSkill('INSUFFICIENT_RESOURCE','마나가 부족합니다.');
    }
  }
  if(player.characterId==='vampire'){
    if(player.augments.includes('aug-321'))rejectSkill('INVALID_PHASE','수혈은 카드 제출 전에 별도 스킬로 사용해야 합니다.');
    const targetId=player.publicResources.thrallPlayerId;
    if(!targetId)rejectSkill('SKILL_NOT_READY','피의 명령에 사용할 권속 표식이 없습니다.');
    if(player.augments.includes('aug-301')&&(privateState?.bloodCommandUsedCycle=== (privateState?.cycleIndex||1)))rejectSkill('ALREADY_USED','완전한 권속의 피의 명령은 사이클당 1회만 사용할 수 있습니다.');
  }
}
export function activateImmediateCharacterSkill(run,player,skillData=null){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')rejectSkill('INVALID_PHASE','현재 스킬을 사용할 수 없습니다.');
  if(player.status==='DOWNED')rejectSkill('INVALID_PHASE','쓰러진 플레이어는 스킬을 사용할 수 없습니다.');
  if(c.turnSubmissions[player.playerId])rejectSkill('ALREADY_USED','카드 확정 제출 이후에는 이번 턴 즉시 스킬을 사용할 수 없습니다.');
  const priv=c.privateByPlayer[player.playerId];
  if(player.characterId==='vampire'&&player.augments.includes('aug-321')){
    const cfg=executableAugmentRuntime('aug-321')?.config||{};
    const cost=Math.max(1,Number(cfg.bloodCost)||4),healAmount=Math.max(1,Number(cfg.healAmount)||1);
    const blood=Math.max(0,Number(player.publicResources.blood)||0);
    if(blood<cost)rejectSkill('INSUFFICIENT_RESOURCE','수혈에 필요한 혈액이 부족합니다.');
    c.transfusionUsedTurnByPlayer||={};
    if(c.transfusionUsedTurnByPlayer[player.playerId]===c.turn)rejectSkill('ALREADY_USED','수혈은 턴당 1회만 사용할 수 있습니다.');
    const candidates=run.players
      .filter(p=>p.status!=='DOWNED'&&p.hp>0&&p.hp<p.maxHp&&(cfg.includeSelf!==false||p.playerId!==player.playerId))
      .sort((a,b)=>a.hp-b.hp||a.seat-b.seat||a.playerId.localeCompare(b.playerId));
    const target=candidates[0];
    if(!target)rejectSkill('SKILL_NOT_READY','회복이 필요한 생존 아군이 없습니다.');
    player.publicResources.blood=blood-cost;
    const before=target.hp,after=Math.min(target.maxHp,before+healAmount),healed=Math.max(0,after-before);
    target.hp=after;c.transfusionUsedTurnByPlayer[player.playerId]=c.turn;
    const healEventId=`heal:transfusion:${run.floor}:${run.depth}:${c.monster?.id||'combat'}:${c.turn}:${player.playerId}`;
    const event={type:'TRANSFUSION_USED',phase:'SELECTION_OPEN',healEventId,playerId:player.playerId,targetId:target.playerId,bloodBefore:blood,bloodSpent:cost,bloodAfter:player.publicResources.blood,requestedHeal:healAmount,amount:healed,before,after,wastedHeal:Math.max(0,healAmount-healed)};
    c.pendingSkillEvents||=[];c.pendingSkillEvents.push(event);
    if(healed>0)c.pendingSkillEvents.push({type:'PLAYER_HEALED',phase:'SELECTION_OPEN',healEventId,playerId:target.playerId,sourcePlayerId:player.playerId,source:'TRANSFUSION',amount:healed,before,after});
    return event;
  }
  if(player.characterId==='prophet'){
    if((player.publicResources.revelation||0)<1)rejectSkill('INSUFFICIENT_RESOURCE','계시가 없습니다.');
    if(player.augments.includes('aug-161')){
      const targetPlayerId=String(skillData?.target_player_id||skillData?.targetPlayerId||'');
      if(!targetPlayerId)rejectSkill('INVALID_SKILL_REQUEST','운명 조작자는 복구할 아군을 지정해야 합니다.');
      const target=run.players.find(p=>p.playerId===targetPlayerId&&p.playerId!==player.playerId&&p.status!=='DOWNED');
      if(!target)rejectSkill('INVALID_SKILL_REQUEST','운명 조작자 대상이 올바르지 않습니다.');
      const targetPriv=c.privateByPlayer[target.playerId];
      let recoverable=(targetPriv?.spentCardIds||[]).filter(id=>{
        const card=target.cardPool.find(x=>x.id===id);
        return card?.source==='BASE'&&!(card.tags||[]).some(tag=>['TEMPORARY','TRANSFORMED','SPECIAL'].includes(tag));
      }).sort();
      if(target.characterId==='twins'){
        const submittedId=c.turnSubmissions[target.playerId]?.cardInstanceId||null;
        const currentParity=Number(target.publicResources.parity)||0;
        recoverable=recoverable.filter(candidateId=>{
          const ids=[...(targetPriv.remainingCardIds||[]),candidateId].filter(id=>id!==submittedId);
          const startParity=submittedId?1-currentParity:currentParity;
          const counts=[0,0];
          for(const id of ids){const card=target.cardPool.find(x=>x.id===id);if(card)counts[card.baseNumber%2]++;}
          return counts[startParity]===Math.ceil(ids.length/2)&&counts[1-startParity]===Math.floor(ids.length/2);
        });
      }
      if(!recoverable.length)rejectSkill('SKILL_NOT_READY','대상 아군의 현재 사이클에 안전하게 복구 가능한 사용 카드가 없습니다.');
      const cardId=choose(run,recoverable,`fate-manipulator:${run.floor}:${run.depth}:${run.currentRoomNodeId||c.monster.id}:${c.turn}:${player.playerId}:${target.playerId}`);
      const card=target.cardPool.find(x=>x.id===cardId);
      if(!card||!targetPriv.spentCardIds.includes(cardId)||targetPriv.remainingCardIds.includes(cardId))rejectSkill('INVALID_STATE','복구 대상 physical card zone이 올바르지 않습니다.');
      const cycleId=targetPriv.cycleIndex||1;
      targetPriv.spentCardIds=targetPriv.spentCardIds.filter(id=>id!==cardId);
      targetPriv.remainingCardIds.push(cardId);
      const order=new Map(target.cardPool.map((x,index)=>[x.id,index]));
      targetPriv.remainingCardIds.sort((a,b)=>(order.get(a)??999)-(order.get(b)??999)||a.localeCompare(b));
      player.publicResources.revelation=0;
      c.derivedEventSequence=(Number(c.derivedEventSequence)||0)+1;
      const rootActionId=`skill:${c.id}:${c.turn}:${player.playerId}:fate-manipulator`;
      const recoveryChainId=`recovery:${rootActionId}`,eventId=`recovery-event:${c.id}:${c.turn}:${c.derivedEventSequence}`;
      const recovery={type:'CARD_RECOVERED',eventId,turn:c.turn,actorId:player.playerId,targetPlayerId:target.playerId,cardInstanceId:cardId,fromZone:'SPENT',toZone:'REMAINING',cycleIdBefore:cycleId,cycleIdAfter:cycleId,sourceEffectId:'aug-161',sourceCardInstanceId:null,rootActionId,recoveryChainId,parentEventId:null,chainDepth:1};
      const used={type:'FATE_MANIPULATOR_USED',eventId:`fate:${eventId}`,turn:c.turn,playerId:player.playerId,targetPlayerId:target.playerId,recoveredCardId:cardId,rootActionId,recoveryChainId,parentEventId:null,chainDepth:0,sourceEffectId:'aug-161'};
      c.pendingSkillEvents||=[];c.pendingSkillEvents.push(used,recovery);
      priv.revelationPeek={turn:c.turn,targetPlayerId:target.playerId,recoveredCardId:cardId,recoveryMode:'ALLY'};
      return used;
    }
    const targets=run.players
      .filter(p=>p.playerId!==player.playerId&&p.status!=='DOWNED'&&c.turnSubmissions[p.playerId])
      .sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
    const target=targets[0];
    if(!target)rejectSkill('SKILL_NOT_READY','확인할 수 있는 다른 플레이어의 제출 카드가 아직 없습니다.');
    const targetSubmission=c.turnSubmissions[target.playerId];
    const targetCard=target.cardPool.find(card=>card.id===targetSubmission.cardInstanceId);
    if(!targetCard)rejectSkill('INVALID_STATE','계시 대상 카드를 찾을 수 없습니다.');
    const candidates=[...(priv.spentCardIds||[])].sort();
    const recoveredCardId=candidates.length?choose(run,candidates,`prophet-recovery:${run.floor}:${run.depth}:${run.currentRoomNodeId||c.monster.id}:${c.turn}:${player.playerId}`):null;
    player.publicResources.revelation=0;
    if(recoveredCardId){
      priv.spentCardIds=priv.spentCardIds.filter(id=>id!==recoveredCardId);
      if(!priv.remainingCardIds.includes(recoveredCardId))priv.remainingCardIds.push(recoveredCardId);
      const order=new Map(player.cardPool.map((card,index)=>[card.id,index]));
      priv.remainingCardIds.sort((a,b)=>(order.get(a)??999)-(order.get(b)??999)||a.localeCompare(b));
    }
    priv.revelationPeek={turn:c.turn,targetPlayerId:target.playerId,selectedNumber:targetCard.baseNumber,recoveredCardId};
    return {
      type:'REVELATION_USED',playerId:player.playerId,targetPlayerId:target.playerId,
      selectedNumber:targetCard.baseNumber,recoveredCardId
    };
  }
  if(player.characterId!=='twins')rejectSkill('SKILL_NOT_READY','즉시 발동할 수 있는 PVE 스킬이 아닙니다.');
  if(!player.publicResources.acrobaticsReady)rejectSkill('SKILL_NOT_READY',player.augments.includes('aug-381')?'유효 공격 3회를 달성하면 곡예가 재충전됩니다.':'새 사이클을 완주하면 곡예가 재충전됩니다.');
  const previousCycleId=priv.cycleIndex||1,remainingBefore=[...(priv.remainingCardIds||[])],spentBefore=[...(priv.spentCardIds||[])],parityBefore=player.publicResources.parity||0;
  priv.cycleIndex=previousCycleId+1;
  priv.spentCardIds=[];
  priv.remainingCardIds=player.cardPool.map(card=>card.id);
  player.publicResources.parity=1-parityBefore;
  player.publicResources.acrobaticsReady=false;
  if(player.augments.includes('aug-381')){
    player.publicResources.acrobaticsRechargeProgress=0;
    player.publicResources.acrobaticsBoostReady=true;
    delete player.persistentCharacterState.acrobaticsLockCycle;
  }else player.persistentCharacterState.acrobaticsLockCycle=priv.cycleIndex;
  c.derivedEventSequence=(Number(c.derivedEventSequence)||0)+1;
  const rootActionId=`skill:${c.id}:${c.turn}:${player.playerId}:acrobatics`,recoveryChainId=`recovery:${rootActionId}`;
  const resetEvent={type:'CYCLE_RESET',eventId:`cycle-reset:${c.id}:${c.turn}:${c.derivedEventSequence}`,turn:c.turn,playerId:player.playerId,classId:'twins',previousCycleId,nextCycleId:priv.cycleIndex,resetReason:'ACROBATICS',remainingBefore,spentBefore,remainingAfter:[...priv.remainingCardIds],spentAfter:[],parityBefore,parityAfter:player.publicResources.parity,rootActionId,recoveryChainId,parentEventId:null,chainDepth:1,sourceEffectId:player.augments.includes('aug-381')?'aug-381':'TWINS_BASE'};
  const used={type:'ACROBATICS_USED',eventId:`acrobatics:${c.id}:${c.turn}:${c.derivedEventSequence}`,playerId:player.playerId,cycleIndex:priv.cycleIndex,parity:player.publicResources.parity,rootActionId,recoveryChainId,parentEventId:null,chainDepth:0,sourceEffectId:player.augments.includes('aug-381')?'aug-381':'TWINS_BASE'};
  c.pendingSkillEvents||=[];c.pendingSkillEvents.push(used,resetEvent);
  return used;
}
export function selfModifyCard(player,resolved,submission){
  if(player.characterId!=='mage'||!submission.skillIntent)return;
  const mana=player.publicResources.mana||0,maxMana=resourceMax(player,'mana',4);
  if(mana<2)throw new Error('마나가 부족합니다.');
  if(player.augments.includes('aug-111')){
    const direction=Number(submission.skillData?.direction),spend=Number(submission.skillData?.manaSpend);
    if(![-1,1].includes(direction)||![2,4].includes(spend)||spend>mana)throw new Error('역산술 제출 정보가 올바르지 않습니다.');
    const magnitude=spend===4?2:1,next=resolved.workingNumber+direction*magnitude;
    if(next<0||next>6)throw new Error('역산술 결과는 0~6 범위여야 합니다.');
    player.publicResources.mana=mana-spend;
    resolved.resourceName='mana';resolved.resourceBefore=mana;resolved.resourceSpent=spend;resolved.resourceAfter=player.publicResources.mana;
    resolved.workingNumber=next;resolved.finalNumber=next;
    resolved.skillUsed='reverse_math';resolved.skillValue=direction*magnitude;resolved.resourceSpent=spend;
    return;
  }
  const requested=submission.skillData?.manaSpend==null?null:Number(submission.skillData.manaSpend);
  const spend=requested??(maxMana>=6&&mana>=6?6:mana>=4?4:2);
  if(mana<spend)rejectSkill('INSUFFICIENT_RESOURCE','마나가 부족합니다.');
  const bonus=spend===6?3:spend===4?2:1;
  player.publicResources.mana=mana-spend;
  resolved.resourceName='mana';resolved.resourceBefore=mana;resolved.resourceSpent=spend;resolved.resourceAfter=player.publicResources.mana;
  resolved.workingNumber+=bonus;
  resolved.finalNumber=resolved.workingNumber;
  resolved.skillUsed='amplify';
  resolved.skillValue=bonus;
  resolved.resourceSpent=spend;
}
export function collisionImmunity(player,submission){
  if(player.characterId!=='warrior'||!submission.skillIntent)return false;
  const charges=player.publicResources.toughnessCharges||0;
  if(charges<1)rejectSkill('INSUFFICIENT_RESOURCE','강인함 충전이 없습니다.');
  player.publicResources.toughnessCharges=charges-1;
  if(player.augments.includes('aug-041'))return false;
  return true;
}
const runtimeConfig=augmentId=>executableAugmentRuntime(augmentId)?.config||{};
const collisionInvariantError=(code,message)=>{const error=new Error(message);error.code=code;throw error;};
const collisionMemberIds=(run,group)=>[...group].sort((a,b)=>{
  const pa=run.players.find(p=>p.playerId===a.playerId),pb=run.players.find(p=>p.playerId===b.playerId);
  return (pa?.seat??999)-(pb?.seat??999)||a.playerId.localeCompare(b.playerId);
}).map(card=>card.playerId);

export function resolveGuardianWallCollisions(run,cards,groups,events=[]){
  let rescueCount=0;
  for(const [finalNumber,group] of [...groups.entries()].sort((a,b)=>Number(a[0])-Number(b[0]))){
    if(group.length<2)continue;
    const guardians=[...group].filter(card=>{
      const player=run.players.find(p=>p.playerId===card.playerId);
      const submission=run.combat?.turnSubmissions?.[card.playerId];
      return player?.status!=='DOWNED'&&player?.characterId==='warrior'&&player.augments.includes('aug-041')&&submission?.skillIntent===true&&card.invalidReason==='COLLISION';
    }).sort((a,b)=>{
      const pa=run.players.find(p=>p.playerId===a.playerId),pb=run.players.find(p=>p.playerId===b.playerId);
      return (pa?.seat??999)-(pb?.seat??999)||a.playerId.localeCompare(b.playerId);
    });
    for(const guardian of guardians){
      const guardianPlayer=run.players.find(p=>p.playerId===guardian.playerId);
      const candidates=[...group].filter(card=>{
        if(card.playerId===guardian.playerId||card.invalidReason!=='COLLISION'||card.valid)return false;
        const targetPlayer=run.players.find(p=>p.playerId===card.playerId);
        const targetSubmission=run.combat?.turnSubmissions?.[card.playerId];
        const sacrificingGuardian=targetPlayer?.characterId==='warrior'&&targetPlayer.augments.includes('aug-041')&&targetSubmission?.skillIntent===true;
        return targetPlayer?.status!=='DOWNED'&&!sacrificingGuardian;
      }).sort((a,b)=>{
        const pa=run.players.find(p=>p.playerId===a.playerId),pb=run.players.find(p=>p.playerId===b.playerId);
        return (pa?.seat??999)-(pb?.seat??999)||a.playerId.localeCompare(b.playerId);
      });
      const target=candidates[0];if(!target)continue;
      target.valid=true;delete target.invalidReason;target.guardianRescued=true;target.guardianRescuedBy=guardian.playerId;
      guardian.valid=false;guardian.invalidReason='COLLISION';guardian.guardianSacrifice=true;guardian.guardianRescueTargetId=target.playerId;
      guardianPlayer.publicResources.guardianTargetPlayerId=target.playerId;
      const guardEventId=`guard:${run.floor}:${run.depth}:${run.combat?.monster?.id||'combat'}:${run.combat?.turn||0}:${guardian.playerId}`;
      events.push({type:'GUARDIAN_WALL_RESCUE',phase:'COLLISION_RESOLVE',guardEventId,finalNumber:Number(finalNumber),playerId:guardian.playerId,targetId:target.playerId,redirectCount:1});
      rescueCount++;
    }
  }
  return rescueCount;
}

export function resolvePostCollisionEffects(run,cards,groups,events=[],mutationEvents=[],processedCollisionEventIds=new Set()){
  const collisionGroups=[];
  const entries=[...groups.entries()].filter(([,group])=>group.length>1).sort((a,b)=>Number(a[0])-Number(b[0]));
  let attributedCollisionResource=false;
  for(const [finalNumber,group] of entries){
    const members=collisionMemberIds(run,group);
    const collisionEventId=`collision:${run.combat.id}:${run.combat.turn}:${finalNumber}:${members.join(',')}`;
    if(processedCollisionEventIds.has(collisionEventId))collisionInvariantError('COLLISION_REWARD_REENTRY','동일 collision event가 POST_COLLISION_EFFECTS에 재진입했습니다.');
    processedCollisionEventIds.add(collisionEventId);
    for(const card of group)card.collisionEventId=collisionEventId;

    const invalidated=group.filter(card=>card.invalidReason==='COLLISION'&&!card.valid);
    const immune=group.filter(card=>card.collisionImmune&&card.valid);
    let berserkerHeal=0,whiteMagicHeal=0,knightCrushBonusDamage=0,crushedCardCount=0;
    const crushedCardIds=[];
    let triggeredEffectCount=0;

    for(const resolved of invalidated){
      const player=run.players.find(p=>p.playerId===resolved.playerId);
      if(player?.characterId!=='berserker'||player.status==='DOWNED')continue;
      const immortal=player.augments.includes('aug-131');
      const healCap=immortal?player.maxHp:Math.min(player.maxHp,2);
      const before=player.hp,after=Math.min(healCap,before+1);
      const healed=Math.max(0,after-before);
      player.hp=after;
      resolved.berserkerCollisionHeal=healed;
      if(healed>0){
        berserkerHeal+=healed;triggeredEffectCount++;
        const healEventId=`heal:berserker:${collisionEventId}:${player.playerId}`;
        events.push({
          type:'BERSERKER_COLLISION_HEAL',phase:'POST_COLLISION_EFFECTS',
          collisionEventId,healEventId,playerId:player.playerId,amount:healed,before,after,healCap
        });
        events.push({type:'PLAYER_HEALED',phase:'POST_COLLISION_EFFECTS',collisionEventId,healEventId,playerId:player.playerId,sourcePlayerId:player.playerId,source:'BERSERKER_COLLISION',amount:healed,before,after});
      }
    }

    for(const resolved of invalidated){
      const player=run.players.find(p=>p.playerId===resolved.playerId);
      if(player?.characterId!=='mage'||!player.augments.includes('aug-101')||!(Number(resolved.resourceSpent)>0))continue;
      const cfg=runtimeConfig('aug-101'),healAmount=Math.max(1,Number(cfg.healAmount)||1);
      const targetCards=[...group].filter(card=>card.playerId!==player.playerId).sort((a,b)=>{
        const pa=run.players.find(p=>p.playerId===a.playerId),pb=run.players.find(p=>p.playerId===b.playerId);
        return (pa?.seat??999)-(pb?.seat??999)||a.playerId.localeCompare(b.playerId);
      });
      const targetCard=targetCards.find(card=>run.players.find(p=>p.playerId===card.playerId)?.status!=='DOWNED');
      if(!targetCard)continue;
      const target=run.players.find(p=>p.playerId===targetCard.playerId),before=target.hp,after=Math.min(target.maxHp,before+healAmount),healed=Math.max(0,after-before);
      target.hp=after;resolved.whiteMagicTargetId=target.playerId;resolved.whiteMagicHeal=healed;
      whiteMagicHeal+=healed;triggeredEffectCount++;
      const healEventId=`heal:white:${collisionEventId}:${player.playerId}:${target.playerId}`;
      events.push({type:'WHITE_MAGIC_HEAL',phase:'POST_COLLISION_EFFECTS',collisionEventId,healEventId,playerId:player.playerId,targetId:target.playerId,requestedHeal:healAmount,amount:healed,before,after,wastedHeal:Math.max(0,healAmount-healed)});
      if(healed>0)events.push({type:'PLAYER_HEALED',phase:'POST_COLLISION_EFFECTS',collisionEventId,healEventId,playerId:target.playerId,sourcePlayerId:player.playerId,source:'WHITE_MAGIC',amount:healed,before,after});
    }

    for(const resolved of immune){
      const player=run.players.find(p=>p.playerId===resolved.playerId);
      if(player?.characterId!=='warrior'||!player.augments.includes('aug-051'))continue;
      const ids=invalidated.filter(card=>card.playerId!==player.playerId).map(card=>card.cardInstanceId);
      const cfg=runtimeConfig('aug-051');
      const perCard=Math.max(0,Number(cfg.crushDamagePerCard)||0);
      const cap=Math.max(0,Number(cfg.crushDamageCap)||0);
      const bonus=Math.min(cap,ids.length*perCard);
      resolved.crushedCardIds=[...ids];
      resolved.crushedCardCount=ids.length;
      resolved.crushBonusDamage=bonus;
      crushedCardIds.push(...ids);
      crushedCardCount+=ids.length;
      knightCrushBonusDamage+=bonus;
      if(ids.length>0){
        triggeredEffectCount++;
        events.push({
          type:'KNIGHT_CRUSH_CAPTURE',phase:'POST_COLLISION_EFFECTS',
          collisionEventId,playerId:player.playerId,crushedCardIds:[...ids],crushedCardCount:ids.length,bonusDamage:bonus
        });
      }
    }

    if(new Set(crushedCardIds).size!==crushedCardIds.length)collisionInvariantError('CRUSH_DUPLICATE_CARD','같은 invalid card가 한 collision에서 두 번 압살로 계산되었습니다.');

    const memberSet=new Set(members);
    const impStolenBeforeCollision=(mutationEvents||[])
      .filter(event=>event.effectId==='imp-steal'&&memberSet.has(event.targetId))
      .reduce((sum,event)=>sum+(Number(event.stolen)||0),0);
    const vampireSwapCount=(mutationEvents||[])
      .filter(event=>event.phase==='PRE_COLLISION_SWAP'&&(memberSet.has(event.actorId)||memberSet.has(event.targetId))).length;

    const resourcesGenerated=[];
    if(!attributedCollisionResource){
      const marks=(events||[]).filter(event=>event.type==='THRALL_MARKED');
      if(marks.length){
        resourcesGenerated.push(...marks.map(event=>({resource:'thrallPlayerId',playerId:event.playerId,targetId:event.targetId,amount:1})));
        attributedCollisionResource=true;
        triggeredEffectCount+=marks.length;
      }
    }
    collisionGroups.push({
      collisionEventId,turn:run.combat.turn,finalNumber:Number(finalNumber),members,
      invalidatedPlayers:invalidated.map(card=>card.playerId),
      immunePlayers:immune.map(card=>card.playerId),
      crushedCardIds:[...crushedCardIds],crushedCardCount,
      berserkerHeal,whiteMagicHeal,impStolenBeforeCollision,vampireSwapCount,knightCrushBonusDamage,
      resourcesGenerated,
      totalImmediateDamageValue:knightCrushBonusDamage,
      totalHealingValue:berserkerHeal+whiteMagicHeal,
      triggeredEffectCount,
      recursiveCollisionTriggerCount:0
    });
  }

  for(const resolved of cards.filter(card=>card.valid)){
    const player=run.players.find(p=>p.playerId===resolved.playerId);
    if(player?.characterId!=='berserker'||!player.augments.includes('aug-131')||player.status==='DOWNED')continue;
    const revenge=Math.max(0,Number(player.publicResources.revenge)||0);
    if(revenge<1)continue;
    const cfg=runtimeConfig('aug-131');
    const bonus=Math.max(0,Number(cfg.revengeBonusDamage)||0);
    resolved.revengeBonusDamage=bonus;
    resolved.revengeConsumed=1;
    player.publicResources.revenge=0;
    events.push({type:'BERSERKER_REVENGE_CONSUMED',phase:'POST_COLLISION_EFFECTS',playerId:player.playerId,amount:1,bonusDamage:bonus});
  }
  return collisionGroups;
}

export function applyPostPlayerAttackCharacter(run,resolved,events=[]){
  if(!resolved?.valid)return 0;
  const player=run.players.find(p=>p.playerId===resolved.playerId);
  if(player?.characterId!=='berserker'||player.status==='DOWNED')return 0;
  const before=player.hp,after=Math.max(1,before-1),cost=Math.max(0,before-after);
  player.hp=after;resolved.berserkerAttackHpCost=cost;
  if(player.augments.includes('aug-121')&&Number(resolved.bloodFrenzyExpectedHpCost)!==cost){
    const error=new Error('피의 광전 피해 보너스와 실제 HP 비용이 불일치합니다.');error.code='BLOOD_FRENZY_COST_MISMATCH';throw error;
  }
  events.push({type:'BERSERKER_ATTACK_HP_COST',phase:'POST_PLAYER_ATTACK',playerId:player.playerId,amount:cost,before,after,bloodFrenzyBonusDamage:Number(resolved.bloodFrenzyBonusDamage)||0});
  return cost;
}

export function onMonsterPlayerDamagedCharacter(player,{damageType,actualDamage,events=[]}={}){
  if(player?.characterId!=='berserker'||player.status==='DOWNED'||!player.augments.includes('aug-131'))return 0;
  if(damageType!=='DIRECT'||!(Number(actualDamage)>0))return 0;
  const before=Math.max(0,Number(player.publicResources.revenge)||0);
  const max=resourceMax(player,'revenge',runtimeConfig('aug-131').revengeMax??1);
  const after=Math.min(max,before+1);
  player.publicResources.revenge=after;
  const gained=after-before;
  if(gained>0)events.push({type:'BERSERKER_REVENGE_GAINED',phase:'MONSTER_ACTION',playerId:player.playerId,before,after,amount:gained,damageType});
  return gained;
}

export function resolvePostCollisionCharacter(run,resolved,submission,events=[]){
  const player=run.players.find(p=>p.playerId===resolved.playerId);
  if(!player)return;
  const priv=run.combat?.privateByPlayer?.[player.playerId];
  if(player.characterId==='twins'&&player.augments.includes('aug-381')&&resolved.valid){
    const cfg=runtimeConfig('aug-381');
    if(player.publicResources.acrobaticsBoostReady){
      const bonus=Math.max(0,Number(cfg.postAcrobaticsFirstValidBonusDamage)||2);
      resolved.acrobaticsBonusDamage=bonus;player.publicResources.acrobaticsBoostReady=false;
      events.push({type:'AERIAL_ACROBATICS_BONUS_CONSUMED',playerId:player.playerId,bonusDamage:bonus,cardInstanceId:resolved.cardInstanceId});
    }
    if(!player.publicResources.acrobaticsReady){
      const before=Math.max(0,Number(player.publicResources.acrobaticsRechargeProgress)||0),need=Math.max(1,Number(cfg.rechargeValidAttacks)||3),after=Math.min(need,before+1);
      player.publicResources.acrobaticsRechargeProgress=after;
      events.push({type:'ACROBATICS_RECHARGE_PROGRESS',playerId:player.playerId,before,after,required:need,cardInstanceId:resolved.cardInstanceId});
      if(after>=need){player.publicResources.acrobaticsReady=true;events.push({type:'ACROBATICS_RECHARGED',playerId:player.playerId,progress:after,required:need,reason:'VALID_ATTACKS'});}
    }
  }
  if(player.characterId==='martial_artist'){
    const before=Math.max(0,Number(player.publicResources.combo)||0),previous=Number.isFinite(Number(player.publicResources.lastSubmittedNumber))?Number(player.publicResources.lastSubmittedNumber):null;
    if(player.augments.includes('aug-291')&&submission.skillIntent){
      if(priv)priv.finisherUsedCycle=priv.cycleIndex||1;
      resolved.skillUsed='one_hit_kill';resolved.finisherComboBefore=before;
      if(resolved.valid){
        const per=Math.max(0,Number(runtimeConfig('aug-291').bonusDamagePerCombo)||2);
        resolved.finisherComboConsumed=before;resolved.finisherBonusDamage=before*per;player.publicResources.combo=0;resolved.finisherOutcome='SUCCESS';
        events.push({type:'ONE_HIT_KILL_CONSUMED',playerId:player.playerId,comboConsumed:before,bonusDamage:resolved.finisherBonusDamage,comboAfter:0});
      }else{
        resolved.finisherComboConsumed=0;resolved.finisherBonusDamage=0;resolved.finisherOutcome=resolved.invalidReason==='COLLISION'?'FAIL_COLLISION':'FAIL_INVALID';
        player.publicResources.combo=before;
        events.push({type:'ONE_HIT_KILL_FAILED',playerId:player.playerId,comboPreserved:before,reason:resolved.invalidReason||'INVALID'});
      }
    }else if(resolved.invalidReason==='COLLISION'){
      if(!player.augments.includes('aug-291'))player.publicResources.combo=0;
    }else if(resolved.valid){
      if(previous!=null&&resolved.finalNumber>previous)player.publicResources.combo=Math.min(resourceMax(player,'combo',3),before+1);
      resolved.martialComboBonus=Math.max(0,Number(player.publicResources.combo)||0);
    }
    resolved.comboBefore=before;resolved.comboAfter=Math.max(0,Number(player.publicResources.combo)||0);resolved.previousSubmittedNumber=previous;
    player.publicResources.lastSubmittedNumber=resolved.finalNumber;
  }
  if(player.characterId==='demon_swordsman'&&!player.augments.includes('aug-351')&&submission.skillIntent&&resolved.valid){
    const level=Math.max(0,Number(player.publicResources.ghostSlashLevel)||0);
    resolved.skillUsed='ghost_slash';resolved.ghostSlashBonusDamage=level+1;player.publicResources.ghostSlashReady=false;
    events.push({type:'GHOST_SLASH_USED',playerId:player.playerId,level,bonusDamage:resolved.ghostSlashBonusDamage});
  }
  if(player.characterId==='berserker'&&player.augments.includes('aug-121')&&resolved.valid){
    const bonus=Math.max(0,Number(runtimeConfig('aug-121').bonusDamageOnActualHpCost)||2);
    resolved.bloodFrenzyBonusDamage=player.hp>1?bonus:0;
    resolved.bloodFrenzyExpectedHpCost=player.hp>1?1:0;
  }
  if(player.characterId==='prophet'&&resolved.invalidReason==='COLLISION'){
    const before=player.publicResources.revelation||0;
    const after=Math.min(resourceMax(player,'revelation',1),before+1);
    player.publicResources.revelation=after;
    resolved.revelationGained=after-before;
    if(after>before)events.push({type:'REVELATION_GAINED',playerId:player.playerId,before,after,reason:'COLLISION'});
  }
  if(player.characterId!=='gunner'||!submission.skillIntent)return;
  const gunnerPriv=run.combat.privateByPlayer[player.playerId];
  player.publicResources.fullBurstReady=false;
  if(resolved.valid){
    resolved.followUpCardIds=gunnerPriv.remainingCardIds.filter(id=>id!==resolved.cardInstanceId);
    player.publicResources.burstReadyCycle=(gunnerPriv.cycleIndex||1)+2;
    resolved.skillUsed='full_burst';
    resolved.fullBurstOutcome='SUCCESS';
  }else if(resolved.invalidReason==='COLLISION'){
    player.publicResources.burstReadyCycle=(gunnerPriv.cycleIndex||1)+1;
    resolved.skillUsed='full_burst';
    resolved.fullBurstOutcome='FAIL_COLLISION';
    resolved.burstMisfire=true;
  }
}
export function baseDamageForCharacter(player,resolved){
  if(player.characterId==='rogue'&&resolved.soloLowest)return 5;
  let damage=resolved.finalNumber;
  if(player.characterId==='twins')damage+=2+Math.max(0,Number(resolved.acrobaticsBonusDamage)||0);
  if(player.characterId==='berserker')damage+=1;
  if(player.characterId==='martial_artist')damage+=Math.max(0,Number(resolved.martialComboBonus)||0);
  damage+=Math.max(0,Number(resolved.crushBonusDamage)||0);
  damage+=Math.max(0,Number(resolved.revengeBonusDamage)||0);
  damage+=Math.max(0,Number(resolved.finisherBonusDamage)||0);
  damage+=Math.max(0,Number(resolved.bloodFrenzyBonusDamage)||0);
  damage+=Math.max(0,Number(resolved.ghostSlashBonusDamage)||0);
  return damage;
}
export function onCombatEndCharacter(player,run=null){
  const priv=run?.combat?.privateByPlayer?.[player.playerId];
  if(player.characterId==='demon_swordsman'&&player.augments.includes('aug-351')){
    if(priv?.demonNormalCardPool){
      player.cardPool=structuredClone(priv.demonNormalCardPool);
      priv.remainingCardIds=[...(priv.demonNormalRemaining||[])];
      priv.spentCardIds=[...(priv.demonNormalSpent||[])];
      priv.cycleIndex=priv.demonNormalCycleIndex||priv.cycleIndex||1;
      delete priv.selectedCardId;
    }
    player.publicResources.devour=0;
  }
  clearCombatResources(player);
  if(priv){delete priv.revelationPeek;delete priv.demonNormalCardPool;delete priv.demonNormalRemaining;delete priv.demonNormalSpent;delete priv.demonNormalCycleIndex;}
}
export function onValidAttack(player,run=null,resolved=null,events=[]){
  if(player.characterId==='adventurer')player.growthExp+=1;
  if(player.characterId==='demon_swordsman'){
    const rootActionId=run?.combat&&resolved?`action:${run.combat.id}:${run.combat.turn}:${player.playerId}:${resolved.cardInstanceId}`:null;
    const context={rootActionId,recoveryChainId:rootActionId?`reactivation:${rootActionId}`:null,sourceEffectId:'DEMON_BASE',chainDepth:1};
    gainDevour(player,1,events,'VALID_ATTACK',context);
    if(player.augments.includes('aug-331')&&resolved?.skillUsed==='ghost_slash'){
      const extra=Math.max(0,Number(runtimeConfig('aug-331').extraDevourOnValidGhostSlash)||1);
      if(extra>0)gainDevour(player,extra,events,'GHOST_SLASH_VALID',{...context,sourceEffectId:'aug-331',chainDepth:2});
    }
  }
  if(player.characterId==='vampire'&&player.augments.includes('aug-321')){
    const cfg=runtimeConfig('aug-321'),gain=Math.max(0,Number(cfg.bloodPerValidAttack)||1);
    const before=Math.max(0,Number(player.publicResources.blood)||0),max=resourceMax(player,'blood',Number(cfg.bloodMax)||6),after=Math.min(max,before+gain);
    player.publicResources.blood=after;
    if(after>before)events.push({type:'VAMPIRE_BLOOD_GAINED',phase:'POST_DAMAGE',playerId:player.playerId,amount:after-before,before,after,sourceCardId:resolved?.cardInstanceId||null});
  }
}
export function onMonsterKilledCharacter(run,cards,packets,events=[]){
  const damageByPlayer={};
  for(const packet of packets||[])damageByPlayer[packet.sourcePlayerId]=(damageByPlayer[packet.sourcePlayerId]||0)+(Number(packet.amount)||0);
  const maxDamage=Math.max(0,...Object.values(damageByPlayer));
  for(const player of run.players.filter(p=>p.characterId==='demon_swordsman')){
    const contribution=Number(damageByPlayer[player.playerId])||0;if(contribution<=0)continue;
    const totalAward=contribution===maxDamage?5:3;
    const extra=Math.max(0,totalAward-1);
    if(extra>0){
      const packet=(packets||[]).find(x=>x.sourcePlayerId===player.playerId&&!x.followUp)||(packets||[]).find(x=>x.sourcePlayerId===player.playerId);
      const rootActionId=packet?.rootActionId||run?.combat&&`kill:${run.combat.id}:${run.combat.turn}:${player.playerId}`;
      gainDevour(player,extra,events,contribution===maxDamage?'KILL_TOP_DAMAGE':'KILL_CONTRIBUTION',{rootActionId,recoveryChainId:rootActionId?`reactivation:${rootActionId}`:null,sourceEffectId:'DEMON_KILL',chainDepth:2});
    }
    events.push({type:'DEVOUR_KILL_AWARD',playerId:player.playerId,totalAward,topDamage:contribution===maxDamage,turnDamage:contribution});
  }
  for(const player of run.players.filter(p=>p.characterId==='martial_artist'))player.publicResources.combo=0;
}
export function grantRunGold(player,amount){
  if(amount<=0)return 0;
  const total=amount+(player.characterId==='adventurer'?1:0);
  player.runGold+=total;
  return total;
}
