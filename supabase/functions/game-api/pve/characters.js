import {choose} from './rng.js';
import {clearCombatResources,clearResourcesByScope,resourceMax} from './resources.js';

export const PVE_CHARACTER_DEFS={
  adventurer:{deck:[1,2,3,4,5],skillId:'gold_bonus'},
  warrior:{deck:[2,3,4,5,5],skillId:'toughness'},
  mage:{deck:[1,2,3,4,4],skillId:'amplify'},
  rogue:{deck:[1,1,3,4,5],skillId:'sneaky_strike'},
  vampire:{deck:[1,2,3,4,5],skillId:'blood_command'},
  imp:{deck:[1,2,3,4,5],skillId:'steal'},
  gunner:{deck:[1,2,3],skillId:'full_burst'},
  twins:{deck:[1,2,3,4],skillId:'acrobatics'},
};
const fallback={deck:[1,2,3,4,5],skillId:null};

export function pveCharacterDef(characterId){return PVE_CHARACTER_DEFS[characterId]||fallback;}
export function initializeCombatCharacter(player){
  clearCombatResources(player);
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=1;
  if(player.characterId==='mage')player.publicResources.mana=0;
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
  if(player.characterId==='twins')throw new Error('곡예는 카드 제출 전에 별도 스킬로 사용해야 합니다.');
  if(player.characterId==='gunner'&&!player.publicResources.fullBurstReady)throw new Error('전탄발사가 아직 재충전되지 않았습니다.');
  if(player.characterId==='mage'&&player.augments.includes('aug-111')){
    const direction=Number(skillData?.direction),manaSpend=Number(skillData?.manaSpend);
    if(![-1,1].includes(direction))throw new Error('역산술 방향은 +1 또는 -1이어야 합니다.');
    if(![2,4].includes(manaSpend))throw new Error('역산술은 마나 2 또는 4를 선택해야 합니다.');
    if((player.publicResources.mana||0)<manaSpend)throw new Error('마나가 부족합니다.');
    const magnitude=manaSpend===4?2:1,next=(card?.baseNumber??0)+direction*magnitude;
    if(!Number.isInteger(next)||next<0||next>6)throw new Error('역산술 결과는 0~6 범위여야 합니다.');
  }
  if(player.characterId==='vampire'){
    const targetId=player.publicResources.thrallPlayerId;
    if(!targetId)throw new Error('피의 명령에 사용할 권속 표식이 없습니다.');
    if(player.augments.includes('aug-301')&&(privateState?.bloodCommandUsedCycle=== (privateState?.cycleIndex||1)))throw new Error('완전한 권속의 피의 명령은 사이클당 1회만 사용할 수 있습니다.');
  }
}
export function activateImmediateCharacterSkill(run,player){
  if(player.characterId!=='twins')throw new Error('즉시 발동할 수 있는 PVE 스킬이 아닙니다.');
  const c=run.combat;if(!c||c.phase!=='SELECTION_OPEN')throw new Error('현재 스킬을 사용할 수 없습니다.');
  if(c.turnSubmissions[player.playerId])throw new Error('카드 제출 전에 곡예를 사용해 주세요.');
  if(!player.publicResources.acrobaticsReady)throw new Error('새 사이클을 완주하면 곡예가 재충전됩니다.');
  const priv=c.privateByPlayer[player.playerId];
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
  const spend=maxMana>=6&&mana>=6?6:mana>=4?4:2;
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
  if(charges<1)throw new Error('강인함 충전이 없습니다.');
  player.publicResources.toughnessCharges=charges-1;
  return true;
}
export function resolvePostCollisionCharacter(run,resolved,submission){
  const player=run.players.find(p=>p.playerId===resolved.playerId);
  if(player?.characterId!=='gunner'||!submission.skillIntent)return;
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
export function onCombatEndCharacter(player){clearCombatResources(player);}
export function onValidAttack(player){
  if(player.characterId==='adventurer')player.growthExp+=1;
}
export function grantRunGold(player,amount){
  if(amount<=0)return 0;
  const total=amount+(player.characterId==='adventurer'?1:0);
  player.runGold+=total;
  return total;
}
