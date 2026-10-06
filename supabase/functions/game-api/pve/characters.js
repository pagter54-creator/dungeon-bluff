import {PROPHET_CARD_POOL} from '../prophet-vampire-core.js';
import {chooseThrall} from './prophet-vampire-rework.js';
import {twinsTurnStart,twinsTurnEnd,activateTwins,cleanupTwins} from './twins-runtime.js';
import {ghostGain,ghostTurnEnd,activateGhostTransformation,ghostCycleExit,cleanupGhost} from './ghost-runtime.js';
import {cleanupVampire} from './vampire-runtime.js';
import {resolveMartial,cleanupMartial} from './martial-runtime.js';
import {ensureGunnerMagazine,resolveGunnerSelected} from './gunner-runtime.js';
import {grantAugmentExp} from './augment-framework.js';
import {choose} from './rng.js';
import {GAMBLER_BASE_DECK} from './gambler.js';
import {clearCombatResources,clearResourcesByScope,resourceMax} from './resources.js';
import {executableAugmentRuntime} from './augment-runtime.js';
import {upsertAugmentStatus} from './augment-framework.js';
import {consumeKnightNextCycleBonus,knightFreeUseAvailable} from './knight-runtime.js';
import {mageNaturalManaRecovery,resolveMageWhiteMagicCollision} from './mage-runtime.js';
import {planBerserkerCollisionHeal,afterBerserkerAttackCost,notifyBerserkerHeal} from './berserker-runtime.js';
import {initializeSeerCombat,onSeerTurnStart,resolveSeerBaseValidity,cleanupSeerCombat,activateSeerImmediateSkill} from './seer-runtime.js';
import {onImpTurnEnd,cleanupImpCombat} from './imp-runtime.js';

export const PVE_CHARACTER_DEFS={
  adventurer:{deck:[1,2,3,4,5],skillId:'gold_bonus'},
  warrior:{deck:[2,3,4,5,5],skillId:'toughness'},
  mage:{deck:[1,2,3,4,4],skillId:'amplify'},
  rogue:{deck:[1,1,3,4,5],skillId:'sneaky_strike'},
  berserker:{deck:[1,2,4,4,5],skillId:null},
  vampire:{deck:[1,2,3,4,5],skillId:'blood_command'},
  imp:{deck:[1,2,3,4,5],skillId:'steal'},
  prophet:{deck:[...PROPHET_CARD_POOL],skillId:'revelation'},
  gunner:{deck:[1,2,3],skillId:'full_burst'},
  gambler:{deck:[...GAMBLER_BASE_DECK],skillId:'random_hand'},
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
export function handleCycleExhaustedCharacter(player,privateState,run,events=[]){return ghostCycleExit(run,player,privateState,events);}
export function initializeCombatCharacter(player){
  clearCombatResources(player);
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=1;
  if(player.characterId==='mage')player.publicResources.mana=0;
  if(player.characterId==='prophet')initializeSeerCombat(player);
  if(player.characterId==='berserker'&&player.augments.includes('aug-131'))player.publicResources.revenge=0;
  if(player.characterId==='vampire'){player.publicResources.blood=0;player.publicResources.dominance=0;player.publicResources.pact=0;}
  if(player.characterId==='gunner'){
    // Construct the starting magazine before its first physical cycle exists.
    // Later acquisitions preserve identities through ensureGunnerMagazine.
    if(!player.persistentCharacterState.gunnerMagazineInitialized&&player.augments.includes('aug-241')){
      setCanonicalBaseDeck(player,[1,2,2,3]);player.persistentCharacterState.gunnerMagazineOverridePending=true;
    }
    player.persistentCharacterState.gunnerMagazineInitialized=true;
    if(player.augments.includes('aug-241'))ensureGunnerMagazine({players:[player]},player);
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
      player.publicResources.ghostSlashLevel=Math.max(0,Number(player.publicResources.ghostSlashLevel)||0);player.publicResources.ghostSlashReady=true;
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
  if(player.characterId==='prophet')onSeerTurnStart(run,player);
  if(player.status==='DOWNED')return;
  if(player.characterId==='mage')mageNaturalManaRecovery(run,player);
  if(player.characterId==='twins')twinsTurnStart(run,player);
}
export function onCycleStartCharacter(player,privateState){
  if(player.characterId==='warrior'){
    player.publicResources.toughnessCharges=Math.min(resourceMax(player,'toughnessCharges',2),(player.publicResources.toughnessCharges||0)+1);
    consumeKnightNextCycleBonus(player);
  }
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
  if(player.characterId==='imp'&&run)onImpTurnEnd(run,player);
  if(player.characterId==='twins'&&run)twinsTurnEnd(run,player,events);
  if(player.characterId==='demon_swordsman'&&run)ghostTurnEnd(run,player,events);
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
  if(player.characterId==='warrior'&&(player.publicResources.toughnessCharges||0)<1&&!knightFreeUseAvailable(player,privateState))rejectSkill('INSUFFICIENT_RESOURCE','강인함 충전이 없습니다.');
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
      const allowed=player.augments.includes('aug-099')?[2,4,6,7]:player.augments.includes('aug-091')?[2,4,6]:[2,4];
      const requested=skillData?.manaSpend==null?null:Number(skillData.manaSpend);
      const manaSpend=requested??(player.augments.includes('aug-099')&&mana>=7?7:player.augments.includes('aug-091')&&mana>=6?6:mana>=4?4:2);
      if(!allowed.includes(manaSpend))rejectSkill('INVALID_SKILL_REQUEST','증폭 마나 비용이 올바르지 않습니다.');
      if(mana<manaSpend)rejectSkill('INSUFFICIENT_RESOURCE','마나가 부족합니다.');
    }
  }
  if(player.characterId==='vampire'){

    const targetId=player.publicResources.thrallPlayerId;
    if(!targetId)rejectSkill('SKILL_NOT_READY','피의 명령에 사용할 권속 표식이 없습니다.');

  }
}
export function activateImmediateCharacterSkill(run,player,skillData=null){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')rejectSkill('INVALID_PHASE','현재 스킬을 사용할 수 없습니다.');
  if(player.status==='DOWNED')rejectSkill('INVALID_PHASE','쓰러진 플레이어는 스킬을 사용할 수 없습니다.');
  if(c.turnSubmissions[player.playerId])rejectSkill('ALREADY_USED','카드 확정 제출 이후에는 이번 턴 즉시 스킬을 사용할 수 없습니다.');
  const priv=c.privateByPlayer[player.playerId];
  if(player.characterId==='vampire'){if(skillData?.thrallTargetId)return chooseThrall(run,player,skillData.thrallTargetId);rejectSkill('INVALID_PHASE','피의 명령은 카드 제출 시 사용하며 수혈은 자동 처리됩니다.');}
  if(player.characterId==='prophet'){try{return activateSeerImmediateSkill(run,player,skillData);}catch(error){if(error.message==='계시가 부족합니다.')rejectSkill('INSUFFICIENT_RESOURCE',error.message);if(error.message==='이미 과거의 편린을 보유하고 있습니다.')rejectSkill('ALREADY_USED',error.message);throw error;}}
  if(player.characterId==='demon_swordsman'&&player.augments.includes('aug-351'))return activateGhostTransformation(run,player);
  if(player.characterId!=='twins')rejectSkill('SKILL_NOT_READY','즉시 발동할 수 있는 PVE 스킬이 아닙니다.');
  return activateTwins(run,player);
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
  const spend=requested??(player.augments.includes('aug-099')&&maxMana>=7&&mana>=7?7:maxMana>=6&&mana>=6?6:mana>=4?4:2);
  if(mana<spend)rejectSkill('INSUFFICIENT_RESOURCE','마나가 부족합니다.');
  const bonus=spend===7?4:spend===6?3:spend===4?2:1;
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
  const charges=player.publicResources.toughnessCharges||0,free=Boolean(submission.knightFreeToughness);
  if(!free&&charges<1)rejectSkill('INSUFFICIENT_RESOURCE','강인함 충전이 없습니다.');
  if(!free)player.publicResources.toughnessCharges=charges-1;
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
      const submission=(run.combat||run.roomState)?.turnSubmissions?.[card.playerId];
      return player?.status!=='DOWNED'&&player?.characterId==='warrior'&&player.augments.includes('aug-041')&&submission?.skillIntent===true&&card.invalidReason==='COLLISION';
    }).sort((a,b)=>{
      const pa=run.players.find(p=>p.playerId===a.playerId),pb=run.players.find(p=>p.playerId===b.playerId);
      return (pa?.seat??999)-(pb?.seat??999)||a.playerId.localeCompare(b.playerId);
    });
    for(const guardian of guardians){
      const guardianPlayer=run.players.find(p=>p.playerId===guardian.playerId);
      const submission=(run.combat||run.roomState)?.turnSubmissions?.[guardian.playerId];
      let candidates=[...group].filter(card=>{
        if(card.playerId===guardian.playerId||card.invalidReason!=='COLLISION'||card.valid)return false;
        const targetPlayer=run.players.find(p=>p.playerId===card.playerId);
        const targetSubmission=(run.combat||run.roomState)?.turnSubmissions?.[card.playerId];
        const sacrificingGuardian=targetPlayer?.characterId==='warrior'&&targetPlayer.augments.includes('aug-041')&&targetSubmission?.skillIntent===true;
        return targetPlayer?.status!=='DOWNED'&&!sacrificingGuardian;
      }).sort((a,b)=>{
        const pa=run.players.find(p=>p.playerId===a.playerId),pb=run.players.find(p=>p.playerId===b.playerId);
        return (pa?.seat??999)-(pb?.seat??999)||a.playerId.localeCompare(b.playerId);
      });
      const maxRescues=run.phase==='COMBAT'&&guardianPlayer.augments.includes('aug-048')?2:1;
      const rescued=candidates.slice(0,maxRescues);if(!rescued.length)continue;
      guardian.valid=false;guardian.invalidReason='COLLISION';guardian.guardianSacrifice=true;
      guardian.guardianRescueTargetId=rescued[0].playerId;guardian.guardianRescueTargetIds=rescued.map(card=>card.playerId);
      for(const target of rescued){
        target.valid=true;delete target.invalidReason;target.guardianRescued=true;target.guardianRescuedBy=guardian.playerId;
        const guardEventId=`guard:${run.floor}:${run.depth}:${run.combat?.monster?.id||'combat'}:${run.combat?.turn||run.roomState?.attempt||0}:${guardian.playerId}:${target.playerId}`;
        events.push({type:'GUARDIAN_WALL_RESCUE',phase:'COLLISION_RESOLVE',guardEventId,finalNumber:Number(finalNumber),playerId:guardian.playerId,targetId:target.playerId,redirectCount:1});
        rescueCount++;
      }
      if(run.phase==='COMBAT'){
        const protectedTarget=rescued[0];
        guardianPlayer.publicResources.guardianTargetPlayerId=protectedTarget.playerId;
        if(guardianPlayer.augments.includes('aug-049'))upsertAugmentStatus(run,guardianPlayer,{statusId:'GUARDIAN_EXTRA_REDIRECT',targetId:protectedTarget.playerId,sourceId:'aug-049',payload:{ready:false}});
      }
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
      const plan=planBerserkerCollisionHeal(run,player,resolved,{amount:1,healCap});
      const before=player.hp,after=Math.min(plan.healCap,before+plan.amount);
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
      const white=resolveMageWhiteMagicCollision(run,resolved,group,events);
      if(white.triggered){
        whiteMagicHeal+=white.healAmount;triggeredEffectCount++;
        for(const h of resolved.whiteMagicHeals||[]){
          const target=run.players.find(p=>p.playerId===h.targetId);
          if(target?.characterId==='berserker'&&Number(h.amount)>0)notifyBerserkerHeal(run,target,h.amount,'WHITE_MAGIC');
        }
      }
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
  if(resolved.berserkerAttackCostApplied)return 0;
  // CARD_VALIDATED is the canonical cost snapshot, shared with damage bonuses.
  const before=player.hp,expected=Number.isFinite(resolved.berserkerExpectedHpCost)?resolved.berserkerExpectedHpCost:Math.max(0,Math.min(1,before-1));
  const after=Math.max(1,before-expected),cost=Math.max(0,before-after);
  resolved.berserkerAttackCostApplied=true;
  player.hp=after;resolved.berserkerAttackHpCost=cost;
  if(player.augments.includes('aug-121')&&Number(resolved.bloodFrenzyExpectedHpCost)!==cost){
    const error=new Error('피의 광전 피해 보너스와 실제 HP 비용이 불일치합니다.');error.code='BLOOD_FRENZY_COST_MISMATCH';throw error;
  }
  events.push({type:'BERSERKER_ATTACK_HP_COST',phase:'POST_PLAYER_ATTACK',playerId:player.playerId,amount:cost,before,after,bloodFrenzyBonusDamage:Number(resolved.bloodFrenzyBonusDamage)||0});
  afterBerserkerAttackCost(run,player,resolved,{before,after,cost,events});
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
  if(player.characterId==='martial_artist')resolveMartial(run,player,resolved,submission,events);

  if(player.characterId==='berserker'&&player.augments.includes('aug-121')&&resolved.valid){
    const bonus=Math.max(0,Number(runtimeConfig('aug-121').bonusDamageOnActualHpCost)||2);
    resolved.bloodFrenzyBonusDamage=player.hp>1?bonus:0;
    resolved.bloodFrenzyExpectedHpCost=player.hp>1?1:0;
  }
  if(player.characterId==='prophet')resolveSeerBaseValidity(run,player,resolved,events);
  if(player.characterId==='gunner')resolveGunnerSelected(run,player,resolved,submission,events);
}
export function baseDamageForCharacter(player,resolved){
  if(player.characterId==='rogue'&&resolved.soloLowest&&!player.augments.includes('aug-071'))return 5;
  let damage=resolved.finalNumber;
  if(player.characterId==='twins')damage+=(resolved.twinsBaseBonus??2)+(Number(resolved.twinsBonus)||0);
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
  if(run){cleanupMartial(run,player);cleanupVampire(run,player);cleanupGhost(run,player);cleanupTwins(run,player);}
  if(player.characterId==='prophet'&&run)cleanupSeerCombat(run,player);
  if(player.characterId==='imp'&&run)cleanupImpCombat(run,player);
  const priv=run?.combat?.privateByPlayer?.[player.playerId];
  clearCombatResources(player);
  if(priv){delete priv.revelationPeek;delete priv.demonNormalCardPool;delete priv.demonNormalRemaining;delete priv.demonNormalSpent;delete priv.demonNormalCycleIndex;}
}
export function onValidAttack(player,run=null,resolved=null,events=[]){
  if(player.characterId==='adventurer'){
    if(run?.combat&&resolved)grantAugmentExp(run,player,1,'ADVENTURER_BASE',`base-exp:${run.combat.id}:${run.combat.turn}:${player.playerId}:${resolved.cardInstanceId}`);
    else player.growthExp+=1;
  }
  if(player.characterId==='demon_swordsman'&&run?.phase!=='COMBAT'&&run)ghostGain(run,player,1,events,{reason:'EVENT_VALID',rootActionId:run.roomState?.id+':'+run.roomState?.turn+':'+player.playerId});
}
export function onMonsterKilledCharacter(run,cards,packets,events=[]){
  for(const player of run.players.filter(p=>p.characterId==='martial_artist'))player.publicResources.combo=0;
}
export function grantRunGold(player,amount){
  if(amount<=0)return 0;
  const total=amount+(player.characterId==='adventurer'?1:0);
  player.runGold+=total;
  return total;
}
