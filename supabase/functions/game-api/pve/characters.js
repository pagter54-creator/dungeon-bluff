export const PVE_CHARACTER_DEFS={
  adventurer:{deck:[1,2,3,4,5],skillId:'gold_bonus'},
  warrior:{deck:[2,3,4,5,5],skillId:'toughness'},
  mage:{deck:[1,2,3,4,4],skillId:'amplify'},
};
const fallback={deck:[1,2,3,4,5],skillId:null};

export function pveCharacterDef(characterId){return PVE_CHARACTER_DEFS[characterId]||fallback;}
export function initializeCombatCharacter(player){
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=1;
  if(player.characterId==='mage')player.publicResources.mana=0;
}
export function onTurnStartCharacter(player){
  if(player.status==='DOWNED')return;
  if(player.characterId==='mage')player.publicResources.mana=Math.min(4,(player.publicResources.mana||0)+1);
}
export function onCycleStartCharacter(player){
  if(player.characterId==='warrior')player.publicResources.toughnessCharges=Math.min(2,(player.publicResources.toughnessCharges||0)+1);
}
export function selfModifyCard(player,resolved,submission){
  if(player.characterId!=='mage'||!submission.skillIntent)return;
  const mana=player.publicResources.mana||0;
  if(mana<2)throw new Error('마나가 부족합니다.');
  const spend=mana>=4?4:2, bonus=spend===4?2:1;
  player.publicResources.mana=mana-spend;
  resolved.workingNumber+=bonus;
  resolved.finalNumber=resolved.workingNumber;
  resolved.skillUsed='amplify';
  resolved.skillValue=bonus;
}
export function collisionImmunity(player,submission){
  if(player.characterId!=='warrior'||!submission.skillIntent)return false;
  const charges=player.publicResources.toughnessCharges||0;
  if(charges<1)throw new Error('강인함 충전이 없습니다.');
  player.publicResources.toughnessCharges=charges-1;
  return true;
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
