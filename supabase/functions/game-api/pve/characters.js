import {choose} from './rng.js';
import {clearCombatResources,clearResourcesByScope,resourceMax} from './resources.js';

export const PVE_CHARACTER_DEFS={
  adventurer:{deck:[1,2,3,4,5],skillId:'gold_bonus'},
  warrior:{deck:[2,3,4,5,5],skillId:'toughness'},
  mage:{deck:[1,2,3,4,4],skillId:'amplify'},
  rogue:{deck:[1,1,3,4,5],skillId:'sneaky_strike'},
  vampire:{deck:[1,2,3,4,5],skillId:'blood_command'},
  imp:{deck:[1,2,3,4,5],skillId:'steal'},
  prophet:{deck:[1,2,3,4,5],skillId:'revelation'},
  gunner:{deck:[1,2,3],skillId:'full_burst'},
  twins:{deck:[1,2,3,4],skillId:'acrobatics'},
};
const fallback={deck:[1,2,3,4,5],skillId:null};

export class PveSkillError extends Error{
  constructor(code,message){super(message);this.name='PveSkillError';this.code=code;}
}
const rejectSkill=(code,message)=>{throw new PveSkillError(code,message);};

export function pveCharacterDef(characterId){return PVE_CHARACTER_DEFS[characterId]||fallback;}
export function initializeCombatCharacter(player){
  clearCombatResources(player);
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=1;
  if(player.characterId==='mage')player.publicResources.mana=0;
  if(player.characterId==='prophet')player.publicResources.revelation=0;
  if(player.characterId==='gunner'){
    player.publicResources.fullBurstReady=true;
    player.publicResources.burstReadyCycle=1;
  }
  if(player.characterId==='twins'){
    player.publicResources.acrobaticsReady=true;
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
  if(player.characterId==='twins'&&!Number.isInteger(player.publicResources.parity)){
    player.publicResources.parity=choose(run,[0,1],`twins-parity:${player.playerId}`);
  }
}
export function onCycleStartCharacter(player,privateState){
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=Math.min(resourceMax(player,'toughnessCharges',2),(player.publicResources.toughnessCharges||0)+1);
  if(player.characterId==='gunner'){
    player.publicResources.fullBurstReady=(privateState.cycleIndex||1)>=(player.publicResources.burstReadyCycle||1);
  }
  if(player.characterId==='twins'){
    const lock=player.persistentCharacterState.acrobaticsLockCycle;
    if(lock!=null&&(privateState.cycleIndex||1)>lock){
      player.publicResources.acrobaticsReady=true;
      delete player.persistentCharacterState.acrobaticsLockCycle;
    }
  }
}
export function onTurnEndCharacter(player){
  if(player.characterId==='twins'&&Number.isInteger(player.publicResources.parity))player.publicResources.parity=1-player.publicResources.parity;
}
export function isCardSelectableForCharacter(player,card){
  if(player.characterId!=='twins')return true;
  return card.baseNumber%2===(player.publicResources.parity||0);
}
export function validateCharacterSkillIntent(player,privateState,skillIntent,card=null,skillData=null){
  if(!skillIntent)return;
  if(player.characterId==='twins')rejectSkill('INVALID_PHASE','곡예는 카드 제출 전에 별도 스킬로 사용해야 합니다.');
  if(player.characterId==='gunner'&&!player.publicResources.fullBurstReady)rejectSkill('SKILL_NOT_READY','전탄발사가 아직 재충전되지 않았습니다.');
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
    const targetId=player.publicResources.thrallPlayerId;
    if(!targetId)rejectSkill('SKILL_NOT_READY','피의 명령에 사용할 권속 표식이 없습니다.');
    if(player.augments.includes('aug-301')&&(privateState?.bloodCommandUsedCycle=== (privateState?.cycleIndex||1)))rejectSkill('ALREADY_USED','완전한 권속의 피의 명령은 사이클당 1회만 사용할 수 있습니다.');
  }
}
export function activateImmediateCharacterSkill(run,player){
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')rejectSkill('INVALID_PHASE','현재 스킬을 사용할 수 없습니다.');
  if(player.status==='DOWNED')rejectSkill('INVALID_PHASE','쓰러진 플레이어는 스킬을 사용할 수 없습니다.');
  if(c.turnSubmissions[player.playerId])rejectSkill('ALREADY_USED','카드 확정 제출 이후에는 이번 턴 즉시 스킬을 사용할 수 없습니다.');
  const priv=c.privateByPlayer[player.playerId];
  if(player.characterId==='prophet'){
    if((player.publicResources.revelation||0)<1)rejectSkill('INSUFFICIENT_RESOURCE','계시가 없습니다.');
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
  if(!player.publicResources.acrobaticsReady)rejectSkill('SKILL_NOT_READY','새 사이클을 완주하면 곡예가 재충전됩니다.');
  priv.cycleIndex=(priv.cycleIndex||1)+1;
  priv.spentCardIds=[];
  priv.remainingCardIds=player.cardPool.map(card=>card.id);
  player.publicResources.parity=1-(player.publicResources.parity||0);
  player.publicResources.acrobaticsReady=false;
  player.persistentCharacterState.acrobaticsLockCycle=priv.cycleIndex;
  return {type:'ACROBATICS_USED',playerId:player.playerId,cycleIndex:priv.cycleIndex,parity:player.publicResources.parity};
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
    resolved.workingNumber=next;resolved.finalNumber=next;
    resolved.skillUsed='reverse_math';resolved.skillValue=direction*magnitude;resolved.resourceSpent=spend;
    return;
  }
  const requested=submission.skillData?.manaSpend==null?null:Number(submission.skillData.manaSpend);
  const spend=requested??(maxMana>=6&&mana>=6?6:mana>=4?4:2);
  if(mana<spend)rejectSkill('INSUFFICIENT_RESOURCE','마나가 부족합니다.');
  const bonus=spend===6?3:spend===4?2:1;
  player.publicResources.mana=mana-spend;
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
  return true;
}
export function resolvePostCollisionCharacter(run,resolved,submission,events=[]){
  const player=run.players.find(p=>p.playerId===resolved.playerId);
  if(!player)return;
  if(player.characterId==='prophet'&&resolved.invalidReason==='COLLISION'){
    const before=player.publicResources.revelation||0;
    const after=Math.min(resourceMax(player,'revelation',1),before+1);
    player.publicResources.revelation=after;
    resolved.revelationGained=after-before;
    if(after>before)events.push({type:'REVELATION_GAINED',playerId:player.playerId,before,after,reason:'COLLISION'});
  }
  if(player.characterId!=='gunner'||!submission.skillIntent)return;
  const priv=run.combat.privateByPlayer[player.playerId];
  player.publicResources.fullBurstReady=false;
  if(resolved.valid){
    resolved.followUpCardIds=priv.remainingCardIds.filter(id=>id!==resolved.cardInstanceId);
    player.publicResources.burstReadyCycle=(priv.cycleIndex||1)+2;
    resolved.skillUsed='full_burst';
  }else if(resolved.invalidReason==='COLLISION'){
    player.publicResources.burstReadyCycle=(priv.cycleIndex||1)+1;
    resolved.skillUsed='full_burst';
    resolved.burstMisfire=true;
  }
}
export function baseDamageForCharacter(player,resolved){
  if(player.characterId==='rogue'&&resolved.soloLowest)return 5;
  return resolved.finalNumber+(player.characterId==='twins'?2:0);
}
export function onCombatEndCharacter(player,run=null){
  clearCombatResources(player);
  const priv=run?.combat?.privateByPlayer?.[player.playerId];
  if(priv)delete priv.revelationPeek;
}
export function onValidAttack(player){
  if(player.characterId==='adventurer')player.growthExp+=1;
}
export function grantRunGold(player,amount){
  if(amount<=0)return 0;
  const total=amount+(player.characterId==='adventurer'?1:0);
  player.runGold+=total;
  return total;
}
