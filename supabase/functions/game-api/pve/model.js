export const RUN_PHASES=['CREATED','MAP_VOTE','ROOM_ENTER','COMBAT','EVENT','REST','SHOP','REWARD_ROOM','AUGMENT_CHOICE','ROOM_RESULT','FLOOR_CLEAR','FLOOR_TRANSITION','RUN_CLEAR','RUN_FAILED','ABANDONED'];
export const COMBAT_PHASES=['TURN_START','INTENT_PUBLISH','SELECTION_OPEN','SELECTION_LOCKED','PRE_COLLISION_SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL','FINAL_NUMBER_REVEAL','COLLISION_RESOLVE','VALIDITY_DERIVE','DAMAGE_BUILD','DAMAGE_BATCH_APPLY','POST_PLAYER_ATTACK','KILL_CHECK','MONSTER_ACTION','DOWN_RESOLVE','TURN_END','COMBAT_END'];
export function baseCards(playerId){
  return [1,2,3,4,5].map((baseNumber,i)=>({id:`${playerId}:base:${i+1}`,baseNumber,source:'BASE'}));
}
export function newPlayerRunState(member){
  return {playerId:member.id,userId:member.user_id||undefined,seat:member.seat_index,memberType:member.member_type,characterId:member.character_id||'adventurer',hp:3,maxHp:3,runGold:0,growthExp:0,augments:[],relics:[],engravings:{},cardPool:baseCards(member.id),publicResources:{},persistentCharacterState:{},status:'ACTIVE'};
}
export function newPrivateCombatState(player){
  return {playerId:player.playerId,spentCardIds:[],remainingCardIds:player.cardPool.map(c=>c.id)};
}
export function newCombatState(players,hp=90){
  return {id:crypto.randomUUID(),phase:'SELECTION_OPEN',turn:1,monster:{id:'pve_training_monster',name:'훈련용 괴물',hp,maxHp:hp,statuses:[],intent:null},privateByPlayer:Object.fromEntries(players.map(p=>[p.playerId,newPrivateCombatState(p)])),turnSubmissions:{},effectCounters:{}};
}
