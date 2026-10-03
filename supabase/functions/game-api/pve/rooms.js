import {adventurerShopPrice} from './adventurer-runtime.js';
import {choose,drawIndex} from './rng.js';
import {selfModifyCard,collisionImmunity,resolveGuardianWallCollisions,isCardSelectableForCharacter,validateCharacterSkillIntent,onCycleStartCharacter,onTurnStartCharacter,onTurnEndCharacter,initializeCombatCharacter,baseDamageForCharacter} from './characters.js';
import {restoreCardCycle,persistCardCycles} from './card-cycle.js';
import {drawGamblerHand,settleGamblerHand,prepareGamblerAllIn,finalizeGamblerAllIn,applyGamblerValidated,consumeGamblerLuck} from './gambler.js';
import {initializeNumberHistories,recordSelfModification,applyPreCollisionSwap,applyPreCollisionSteal,finalizeNumbers,attachCollisionGroups,attachValidity,assignVampireThralls,validateNumberMutationState} from './number-mutation.js';
import {applyOwnedEffects} from './effects.js';
import {cleanupAugmentScope} from './augment-framework.js';
import {relicPool} from './relics.js';
import {clearCombatResourcesForPlayers} from './resources.js';
import {prepareImpSubmission,applyImpCardValidated,applyImpBeforeDamage,cleanupImpRoom} from './imp-runtime.js';

const CARD_RESERVATION_MS=20_000;
const playerFor=(run,id)=>run.players.find(p=>p.playerId===id);
const cardFor=(player,id)=>player.cardPool.find(c=>c.id===id);
const humanIds=run=>run.players.filter(p=>p.memberType==='human').map(p=>p.playerId);
const allIds=run=>run.players.map(p=>p.playerId);

function finishRoom(run){
  for(const player of run.players)applyOwnedEffects(run,'ROOM_END',{player});
  cleanupImpRoom(run);
  cleanupAugmentScope(run,'ROOM');
  clearCombatResourcesForPlayers(run.players);
  if(run.roomState?.privateByPlayer)persistCardCycles(run,run.roomState.privateByPlayer);
  run.phase='ROOM_RESULT';
  run.roomResult={roomNodeId:run.currentRoomNodeId,readyPlayerIds:run.players.filter(p=>p.memberType==='ai').map(p=>p.playerId)};
}
function resetRoomCycle(run,player,state){
  if(state.remainingCardIds.length)return false;
  if(player.characterId==='gambler'){drawGamblerHand(run,player,state);return true;}
  applyOwnedEffects(run,'CYCLE_END',{player,privateState:state,events:[]});
  cleanupAugmentScope(run,'CYCLE',{playerId:player.playerId});
  state.cycleIndex=(state.cycleIndex||1)+1;
  state.spentCardIds=[];
  state.remainingCardIds=player.cardPool.map(c=>c.id);
  onCycleStartCharacter(player,state);
  return true;
}
function spendRoomCards(run,resolved){
  const room=run.roomState;
  for(const rc of resolved){
    const state=room.privateByPlayer[rc.playerId],player=playerFor(run,rc.playerId);
    if(player.characterId==='gambler'){
      settleGamblerHand(run,player,state,rc.cardInstanceId,rc.finalNumber,{rootActionId:`reward:${run.currentRoomNodeId}:${run.roomState.attempt}:${rc.playerId}:${rc.cardInstanceId}`});
      delete state.selectedCardId;delete state.skillIntent;
      continue;
    }
    const ids=[rc.cardInstanceId,...(rc.followUpCardIds||[])];
    for(const id of ids){state.remainingCardIds=state.remainingCardIds.filter(x=>x!==id);if(!state.spentCardIds.includes(id))state.spentCardIds.push(id);}
    delete state.selectedCardId;delete state.skillIntent;
    resetRoomCycle(run,player,state);
  }
  persistCardCycles(run,room.privateByPlayer);
}

export function enterRestRoom(run){
  run.phase='REST';run.roomState={type:'REST',choicesByPlayer:{}};
  // Until a separate AI policy is specified, AI takes the always-valid FULL_HEAL option.
  for(const p of run.players.filter(x=>x.memberType==='ai'))applyRestChoice(run,p.playerId,'FULL_HEAL');
}
export function applyRestChoice(run,playerId,choice,number=null){
  if(run.phase!=='REST'||run.roomState?.type!=='REST')throw new Error('현재 휴식처가 아닙니다.');
  const p=playerFor(run,playerId);if(!p)throw new Error('플레이어를 찾을 수 없습니다.');
  if(run.roomState.choicesByPlayer[playerId])throw new Error('휴식 선택은 한 번만 할 수 있습니다.');
  if(choice==='FULL_HEAL')p.hp=p.maxHp;
  else if(choice==='FLAME')run.flame=Math.min(run.maxFlame,run.flame+1);
  else if(choice==='ENGRAVE'){
    if(!Number.isInteger(number)||number<0||number>6)throw new Error('각인할 숫자는 0~6이어야 합니다.');
    p.engravings[String(number)]=(Number(p.engravings[String(number)])||0)+1;
  }else throw new Error('지원하지 않는 휴식 선택입니다.');
  run.roomState.choicesByPlayer[playerId]={choice,...(choice==='ENGRAVE'?{number}: {})};
  if(allIds(run).every(id=>run.roomState.choicesByPlayer[id]))finishRoom(run);
}
function cardStockValue(run,slot){
  const rare=drawIndex(run,100,`shop-card-rarity:${run.currentRoomNodeId}:${slot}`).index<5;
  return rare?choose(run,[0,6],`shop-card-rare:${run.currentRoomNodeId}:${slot}`):choose(run,[1,2,3,4,5],`shop-card-common:${run.currentRoomNodeId}:${slot}`);
}
function pickUniqueRelics(run,defs,count,context,avoidOwned=true){
  const pool=[...defs],out=[];
  const owned=new Set(run.players.flatMap(p=>p.relics||[]));
  while(pool.length&&out.length<count){
    let candidates=avoidOwned?pool.filter(x=>!owned.has(x.id)):[...pool];
    if(!candidates.length)candidates=[...pool];
    const picked=choose(run,candidates,`${context}:${out.length}`);
    out.push(picked);pool.splice(pool.findIndex(x=>x.id===picked.id),1);
  }
  return out;
}
export function enterShopRoom(run){
  const defs=run.relicCatalog||[],general=relicPool(defs,'GENERAL'),exclusive=relicPool(defs,'SHOP_EXCLUSIVE');
  const cards=Array.from({length:4},(_,i)=>{const value=cardStockValue(run,i);return {id:`card-${i+1}`,kind:'CARD',value,price:[0,6].includes(value)?4:2,sold:false,reservedByPlayerId:null,reservedUntil:null};});
  const relics=[
    ...pickUniqueRelics(run,general,2,`shop-general:${run.currentRoomNodeId}`),
    ...pickUniqueRelics(run,exclusive,2,`shop-exclusive:${run.currentRoomNodeId}`)
  ].map((r,i)=>({id:`relic-${i+1}`,kind:'RELIC',relicId:r.id,price:r.betaPrice??(r.pool==='SHOP_EXCLUSIVE'?5:4),pool:r.pool,sold:false}));
  run.phase='SHOP';run.roomState={type:'SHOP',cardStock:cards,relicStock:relics,readyPlayerIds:run.players.filter(p=>p.memberType==='ai').map(p=>p.playerId),catalogIncomplete:relics.length<4};
  if(allIds(run).every(id=>run.roomState.readyPlayerIds.includes(id)))finishRoom(run);
}
export function expireShopReservations(run,nowMs=Date.now()){
  if(run.roomState?.type!=='SHOP')return false;let changed=false;
  for(const item of run.roomState.cardStock)if(item.reservedByPlayerId&&Number(item.reservedUntil)<=nowMs){item.reservedByPlayerId=null;item.reservedUntil=null;changed=true;}
  return changed;
}
function shopCard(run,id){return run.roomState?.cardStock?.find(x=>x.id===id);}
function shopRelic(run,id){return run.roomState?.relicStock?.find(x=>x.id===id);}
export function reserveShopCard(run,playerId,productId,nowMs=Date.now()){
  if(run.phase!=='SHOP'||run.roomState?.type!=='SHOP')throw new Error('현재 상점이 아닙니다.');
  expireShopReservations(run,nowMs);
  const p=playerFor(run,playerId),item=shopCard(run,productId);if(!p||!item||item.sold)throw new Error('구매할 수 없는 카드 상품입니다.');
  if(p.characterId==='gambler')throw new Error('도박사는 카드 상품을 구매할 수 없습니다.');
  if(run.roomState.readyPlayerIds.includes(playerId))throw new Error('상점 이용을 종료한 플레이어입니다.');
  if(item.reservedByPlayerId&&item.reservedByPlayerId!==playerId)throw new Error('다른 플레이어가 예약 중인 상품입니다.');
  item.reservedByPlayerId=playerId;item.reservedUntil=nowMs+CARD_RESERVATION_MS;return item;
}
export function cancelShopCardReservation(run,playerId,productId){
  const item=shopCard(run,productId);if(!item||item.reservedByPlayerId!==playerId)return false;
  item.reservedByPlayerId=null;item.reservedUntil=null;return true;
}
export function confirmShopCard(run,playerId,productId,replaceCardId,nowMs=Date.now()){
  if(run.phase!=='SHOP'||run.roomState?.type!=='SHOP')throw new Error('현재 상점이 아닙니다.');
  expireShopReservations(run,nowMs);
  const p=playerFor(run,playerId),item=shopCard(run,productId);if(!p||!item||item.sold)throw new Error('구매할 수 없는 카드 상품입니다.');
  if(p.characterId==='gambler')throw new Error('도박사는 카드 상품을 구매할 수 없습니다.');
  if(item.reservedByPlayerId!==playerId||Number(item.reservedUntil)<=nowMs)throw new Error('유효한 카드 상품 예약이 필요합니다.');
  const old=cardFor(p,replaceCardId);if(!old)throw new Error('교체할 물리 카드를 찾을 수 없습니다.');
  const price=adventurerShopPrice(run,p,item.price);
  if(p.runGold<price)throw new Error('런 골드가 부족합니다.');
  p.runGold-=price;adventurerShopPrice(run,p,item.price,{consume:true});
  p.cardPool=p.cardPool.filter(c=>c.id!==replaceCardId);
  p.cardPool.push({id:`${playerId}:shop:${run.currentRoomNodeId}:${productId}`,baseNumber:item.value,source:'SHOP'});
  item.sold=true;item.reservedByPlayerId=null;item.reservedUntil=null;item.buyerPlayerId=playerId;
  return item;
}
export function buyShopRelic(run,playerId,productId){
  if(run.phase!=='SHOP'||run.roomState?.type!=='SHOP')throw new Error('현재 상점이 아닙니다.');
  const p=playerFor(run,playerId),item=shopRelic(run,productId);if(!p||!item||item.sold)throw new Error('구매할 수 없는 유물 상품입니다.');
  if(run.roomState.readyPlayerIds.includes(playerId))throw new Error('상점 이용을 종료한 플레이어입니다.');
  if(p.relics.includes(item.relicId))throw new Error('동일 유물을 중복 보유할 수 없습니다.');
  const price=adventurerShopPrice(run,p,item.price);
  if(p.runGold<price)throw new Error('런 골드가 부족합니다.');
  p.runGold-=price;adventurerShopPrice(run,p,item.price,{consume:true});p.relics.push(item.relicId);item.sold=true;item.buyerPlayerId=playerId;return item;
}
export function finishShop(run,playerId){
  if(run.phase!=='SHOP'||run.roomState?.type!=='SHOP')throw new Error('현재 상점이 아닙니다.');
  if(!run.roomState.readyPlayerIds.includes(playerId))run.roomState.readyPlayerIds.push(playerId);
  for(const item of run.roomState.cardStock)if(item.reservedByPlayerId===playerId){item.reservedByPlayerId=null;item.reservedUntil=null;}
  if(allIds(run).every(id=>run.roomState.readyPlayerIds.includes(id)))finishRoom(run);
}

function fillRewardAiSubmissions(run){
  const room=run.roomState;
  for(const p of run.players.filter(x=>x.memberType==='ai'&&x.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)){
    if(room.turnSubmissions[p.playerId])continue;
    const state=room.privateByPlayer[p.playerId];
    let choices=state.remainingCardIds.filter(id=>rewardSelectable(run,p,id));
    if(!choices.length){resetRoomCycle(run,p,state);choices=state.remainingCardIds.filter(id=>rewardSelectable(run,p,id));}
    if(!choices.length)continue;
    const cardId=choose(run,choices,`reward-ai-card:${run.currentRoomNodeId}:${room.attempt}:${p.playerId}`);
    room.turnSubmissions[p.playerId]={playerId:p.playerId,cardInstanceId:cardId,skillIntent:false,autoSubmitted:true};
    state.selectedCardId=cardId;state.skillIntent=false;
  }
}
export function enterRewardRoom(run){
  for(const p of run.players)initializeCombatCharacter(p);
  const defs=run.relicCatalog||[],general=relicPool(defs,'GENERAL');
  const offered=pickUniqueRelics(run,general,4,`reward:${run.currentRoomNodeId}`).map(x=>x.id);
  run.phase='REWARD_ROOM';
  run.roomState={type:'REWARD_ROOM',attempt:1,relicIds:offered,catalogIncomplete:offered.length<4,privateByPlayer:Object.fromEntries(run.players.map(p=>[p.playerId,restoreCardCycle(run,p)])),turnSubmissions:{},pickOrder:[],picks:{},autoAssigned:{},resolved:false};
  for(const p of run.players){onTurnStartCharacter(p,run);applyOwnedEffects(run,'TURN_START',{player:p,privateState:run.roomState.privateByPlayer[p.playerId]});if(p.characterId==='gambler')drawGamblerHand(run,p,run.roomState.privateByPlayer[p.playerId]);applyOwnedEffects(run,'PRE_SELECT',{player:p,privateState:run.roomState.privateByPlayer[p.playerId]});}
  fillRewardAiSubmissions(run);
  if(run.players.filter(p=>p.status!=='DOWNED').every(p=>run.roomState.turnSubmissions[p.playerId]))resolveRewardAttempt(run);
}
function rewardSelectable(run,p,id){
  const st=run.roomState.privateByPlayer[p.playerId],card=cardFor(p,id);
  return st.remainingCardIds.includes(id)&&card&&isCardSelectableForCharacter(p,card);
}
export function activateRewardSkill(run,playerId){
  if(run.phase!=='REWARD_ROOM'||run.roomState?.type!=='REWARD_ROOM')throw new Error('현재 보상방이 아닙니다.');
  const p=playerFor(run,playerId),room=run.roomState;if(!p||p.characterId!=='twins')throw new Error('보상방에서 즉시 사용할 수 있는 스킬이 아닙니다.');
  if(room.turnSubmissions[playerId])throw new Error('카드 제출 전에 곡예를 사용해 주세요.');
  if(!p.publicResources.acrobaticsReady)throw new Error('새 사이클을 완주하면 곡예가 재충전됩니다.');
  const st=room.privateByPlayer[playerId];st.cycleIndex=(st.cycleIndex||1)+1;st.spentCardIds=[];st.remainingCardIds=p.cardPool.map(c=>c.id);
  p.publicResources.parity=1-(p.publicResources.parity||0);p.publicResources.acrobaticsReady=false;p.persistentCharacterState.acrobaticsLockCycle=st.cycleIndex;
}
export function submitRewardCard(run,playerId,cardInstanceId,skillIntent=false,skillData=null){
  if(run.phase!=='REWARD_ROOM'||run.roomState?.type!=='REWARD_ROOM'||run.roomState.resolved)throw new Error('현재 보상방 카드 제출 단계가 아닙니다.');
  const p=playerFor(run,playerId),room=run.roomState,st=room.privateByPlayer[playerId];if(!p||p.status==='DOWNED')throw new Error('카드를 제출할 수 없습니다.');
  if(room.turnSubmissions[playerId])throw new Error('이미 제출했습니다.');
  if(!rewardSelectable(run,p,cardInstanceId))throw new Error('사용 가능한 카드가 아닙니다.');
  if(skillIntent&&!['warrior','mage','vampire','gunner'].includes(p.characterId))throw new Error('이 스킬은 보상방 카드 판정에 사용할 수 없습니다.');
  validateCharacterSkillIntent(p,st,Boolean(skillIntent),cardFor(p,cardInstanceId),skillData);
  if(p.characterId==='imp')prepareImpSubmission(run,p,skillData);
  room.turnSubmissions[playerId]={playerId,cardInstanceId,skillIntent:Boolean(skillIntent),...(skillData?{skillData:structuredClone(skillData)}:{})};st.selectedCardId=cardInstanceId;st.skillIntent=Boolean(skillIntent);
  applyOwnedEffects(run,'ON_SUBMIT',{player:p,privateState:st,cardInstanceId});
}
function tieOrdered(run,cards){
  const groups=new Map();for(const c of cards){const a=groups.get(c.damage)||[];a.push(c);groups.set(c.damage,a);}
  const out=[];
  for(const damage of [...groups.keys()].sort((a,b)=>b-a)){
    const group=[...groups.get(damage)];
    while(group.length){const picked=group.length===1?group[0]:choose(run,group,`reward-tie:${run.currentRoomNodeId}:${run.roomState.attempt}:${damage}:${out.length}`);out.push(picked);group.splice(group.indexOf(picked),1);}
  }
  return out;
}

function refreshRewardLuckWindow(run){
  const room=run.roomState;if(room?.type!=='REWARD_ROOM')return null;
  room.gamblerLuckWindows ||= {};
  const playerId=room.pickOrder?.[0];if(!playerId)return null;
  const p=playerFor(run,playerId),state=room.privateByPlayer?.[playerId];
  const existing=room.gamblerLuckWindows[playerId];
  if(existing?.phase==='CONFIRMED'||existing?.phase==='CONSUMED')return existing;
  if(p?.characterId!=='gambler'||!p.augments?.includes('aug-211')||!state||state.luck<=0)return null;
  const window=existing||{phase:'LUCK_AVAILABLE',presentationKey:`reward:${run.currentRoomNodeId}:${room.attempt}:${playerId}`,usedMode:null};
  room.gamblerLuckWindows[playerId]=window;
  return window;
}
export function useRewardGamblerLuck(run,playerId,mode,rootActionId=''){
  if(run.phase!=='REWARD_ROOM'||run.roomState?.type!=='REWARD_ROOM')throw new Error('현재 보상방이 아닙니다.');
  const room=run.roomState;if(room.pickOrder?.[0]!==playerId)return false;
  const p=playerFor(run,playerId),state=room.privateByPlayer?.[playerId];
  if(p?.characterId!=='gambler'||!p.augments?.includes('aug-211'))throw new Error('행운 증강을 보유한 도박사만 사용할 수 있습니다.');
  const window=refreshRewardLuckWindow(run);
  if(mode!=='ATTACK'&&mode!=='SPECIAL')throw new Error('행운 사용 방식을 선택해 주세요.');
  if(!window)return false;
  const actionKey=rootActionId||`${window.presentationKey}:${mode}`;
  if(window.phase==='CONSUMED'||window.phase==='CONFIRMED')return false;
  if(window.phase!=='LUCK_AVAILABLE')return false;
  if(!consumeGamblerLuck(run,p,state,actionKey))return false;
  if(mode==='ATTACK')state.luckDamageArmed=true;
  else state.specialCharge=(Number(state.specialCharge)||0)+1;
  window.phase='CONSUMED';window.usedMode=mode;window.actionKey=actionKey;
  persistCardCycles(run,room.privateByPlayer);
  return true;
}
function autoAssignRemaining(run,playerIds){
  const room=run.roomState;
  for(const playerId of playerIds){
    if(!room.relicIds.length){room.autoAssigned[playerId]=null;continue;}
    const relicId=choose(run,room.relicIds,`reward-auto:${run.currentRoomNodeId}:${room.attempt}:${playerId}`);
    room.relicIds=room.relicIds.filter(x=>x!==relicId);playerFor(run,playerId).relics.push(relicId);room.autoAssigned[playerId]=relicId;
  }
  room.resolved=true;finishRoom(run);
}
function autoResolveAiPickers(run){
  const room=run.roomState;
  while(room.pickOrder.length){
    const pid=room.pickOrder[0],p=playerFor(run,pid);if(p.memberType!=='ai')break;
    refreshRewardLuckWindow(run);if(room.gamblerLuckWindows?.[pid]?.phase==='LUCK_AVAILABLE')useRewardGamblerLuck(run,pid,'ATTACK',`reward-ai-luck:${run.currentRoomNodeId}:${pid}`);
    const candidates=room.relicIds.filter(id=>!p.relics.includes(id));const source=candidates.length?candidates:room.relicIds;if(!source.length){room.pickOrder.shift();continue;}
    const relicId=choose(run,source,`reward-ai-pick:${run.currentRoomNodeId}:${pid}`);
    const luckWindow=room.gamblerLuckWindows?.[pid];if(luckWindow)luckWindow.phase='CONFIRMED';
    p.relics.push(relicId);room.picks[pid]=relicId;room.relicIds=room.relicIds.filter(x=>x!==relicId);room.pickOrder.shift();refreshRewardLuckWindow(run);
  }
  if(!room.pickOrder.length&&!room.resolved)autoAssignRemaining(run,room.invalidPlayerIds||[]);
}
export function resolveRewardAttempt(run){
  if(run.phase!=='REWARD_ROOM'||run.roomState?.type!=='REWARD_ROOM')throw new Error('현재 보상방이 아닙니다.');
  const room=run.roomState,active=run.players.filter(p=>p.status!=='DOWNED');if(active.some(p=>!room.turnSubmissions[p.playerId]))return null;
  const cards=active.map(p=>{const sub=room.turnSubmissions[p.playerId],card=cardFor(p,sub.cardInstanceId);return {playerId:p.playerId,seat:p.seat,cardInstanceId:card.id,baseNumber:card.baseNumber,workingNumber:card.baseNumber,finalNumber:card.baseNumber,collisionImmune:false,valid:true};});
  const mutationEvents=[];
  initializeNumberHistories(cards);
  for(const rc of cards){const p=playerFor(run,rc.playerId);if(p?.characterId==='gambler')prepareGamblerAllIn(run,p,room.privateByPlayer[p.playerId],room.turnSubmissions[p.playerId],rc);}
  for(const rc of cards){const p=playerFor(run,rc.playerId),sub=room.turnSubmissions[rc.playerId];if(sub.skillIntent)applyOwnedEffects(run,'ON_SKILL_USE',{player:p,resolved:rc,submission:sub,privateState:room.privateByPlayer[rc.playerId]});selfModifyCard(p,rc,sub);applyOwnedEffects(run,'PRE_COLLISION_SELF_MODIFY',{player:p,resolved:rc,privateState:room.privateByPlayer[rc.playerId],events:[]});}
  recordSelfModification(cards,mutationEvents);
  for(const rc of cards)applyOwnedEffects(run,'PRE_COLLISION',{player:playerFor(run,rc.playerId),resolved:rc,privateState:room.privateByPlayer[rc.playerId]});
  applyPreCollisionSwap(run,cards,mutationEvents,room);
  applyPreCollisionSteal(run,cards,mutationEvents);
  finalizeNumbers(cards);for(const rc of cards)applyOwnedEffects(run,'POST_REVEAL',{player:playerFor(run,rc.playerId),resolved:rc,privateState:room.privateByPlayer[rc.playerId]});
  for(const rc of cards)rc.collisionImmune=collisionImmunity(playerFor(run,rc.playerId),room.turnSubmissions[rc.playerId]);
  const groups=new Map();for(const card of cards){const group=groups.get(card.finalNumber)||[];group.push(card);groups.set(card.finalNumber,group);}
  attachCollisionGroups(run,cards,groups);
  for(const group of groups.values())if(group.length>1)for(const card of group)if(!card.collisionImmune){card.valid=false;card.invalidReason='COLLISION';}
  resolveGuardianWallCollisions(run,cards,groups,[]);
  assignVampireThralls(run,cards,groups,[]);
  for(const rc of cards)applyOwnedEffects(run,'POST_COLLISION',{player:playerFor(run,rc.playerId),resolved:rc,submission:room.turnSubmissions[rc.playerId],privateState:room.privateByPlayer[rc.playerId]});
  attachValidity(cards);
  for(const rc of cards){const p=playerFor(run,rc.playerId);if(p?.characterId==='gambler')finalizeGamblerAllIn(run,p,room.privateByPlayer[p.playerId],rc);}
  for(const card of cards)if(card.invalidReason==='COLLISION'){
    const player=playerFor(run,card.playerId);
    if(player.characterId==='martial_artist')player.score=(Number(player.score)||0)-1;
  }
  validateNumberMutationState(run,cards,mutationEvents);
  const counts=Object.fromEntries([...groups].map(([number,group])=>[number,group.length]));
  for(const c of cards){const player=playerFor(run,c.playerId);applyOwnedEffects(run,'CARD_VALIDATED',{player,resolved:c,privateState:room.privateByPlayer[c.playerId],events:[]});applyImpCardValidated(run,{player,resolved:c,cards,events:[]});if(player.characterId==='gambler')applyGamblerValidated(run,player,room.privateByPlayer[c.playerId],c);}
  for(const c of cards){
    const p=playerFor(run,c.playerId),sub=room.turnSubmissions[c.playerId],st=room.privateByPlayer[c.playerId];
    if(p.characterId==='gunner'&&sub.skillIntent){p.publicResources.fullBurstReady=false;if(c.valid){c.followUpCardIds=st.remainingCardIds.filter(id=>id!==c.cardInstanceId);p.publicResources.burstReadyCycle=(st.cycleIndex||1)+2;}else{p.publicResources.burstReadyCycle=(st.cycleIndex||1)+1;p.hp=Math.max(0,p.hp-1);}}
    const engrave=Number(p.engravings?.[String(c.finalNumber)])||0;const ordinaryAmount=Math.max(0,baseDamageForCharacter(p,c)+engrave);const primary={amount:ordinaryAmount},queued=[];
    applyOwnedEffects(run,'BEFORE_DAMAGE',{player:p,resolved:c,damage:primary,followUps:queued,followUp:false,privateState:room.privateByPlayer[c.playerId],events:[]});
    applyImpBeforeDamage(run,{player:p,resolved:c,damage:primary,followUp:false,events:[]});
    c.damage=Math.max(0,primary.amount)+queued.reduce((s,x)=>s+Math.max(0,Number(x.amount)||0),0);
    for(const id of c.followUpCardIds||[]){const extra=cardFor(p,id);const d={amount:extra.baseNumber+(Number(p.engravings?.[String(extra.baseNumber)])||0)},q=[];applyOwnedEffects(run,'BEFORE_DAMAGE',{player:p,resolved:c,damage:d,followUps:q,followUp:true,privateState:room.privateByPlayer[c.playerId],events:[]});c.damage+=Math.max(0,d.amount)+q.reduce((s,x)=>s+Math.max(0,Number(x.amount)||0),0);}
  }
  spendRoomCards(run,cards);room.turnSubmissions={};
  for(const p of run.players){onTurnEndCharacter(p);applyOwnedEffects(run,'TURN_END',{player:p,privateState:room.privateByPlayer[p.playerId]});}
  cleanupAugmentScope(run,'TURN');
  const valid=cards.filter(c=>c.valid);
  room.publicTurnResult={
    attempt:room.attempt,
    mutationEvents,
    cards:cards.map(card=>({
      playerId:card.playerId,
      finalNumber:card.finalNumber,
      valid:Boolean(card.valid),
      collisionImmune:Boolean(card.collisionImmune),
      collisionGroupSize:counts[card.finalNumber]||1,
      damage:Number(card.damage)||0
    })),
    success:valid.length>0
  };
  if(!valid.length){
    if(room.attempt>=3){autoAssignRemaining(run,run.players.map(p=>p.playerId));return {cards,autoOpened:true};}
    room.attempt+=1;for(const p of run.players){onTurnStartCharacter(p,run);applyOwnedEffects(run,'TURN_START',{player:p,privateState:room.privateByPlayer[p.playerId]});applyOwnedEffects(run,'PRE_SELECT',{player:p,privateState:room.privateByPlayer[p.playerId]});}fillRewardAiSubmissions(run);if(run.players.filter(p=>p.status!=='DOWNED').every(p=>room.turnSubmissions[p.playerId]))return resolveRewardAttempt(run);return {cards,retry:true};
  }
  if(room.catalogIncomplete){autoAssignRemaining(run,run.players.map(p=>p.playerId));return {cards,catalogIncomplete:true};}
  room.invalidPlayerIds=run.players.filter(p=>!valid.some(c=>c.playerId===p.playerId)).map(p=>p.playerId);
  const ranked=tieOrdered(run,valid);
  room.pickOrder=ranked.map(c=>c.playerId);
  refreshRewardLuckWindow(run);
  for(const card of ranked)applyOwnedEffects(run,'REWARD_RANKED',{player:playerFor(run,card.playerId),resolved:card,rank:ranked.indexOf(card),addCandidate:()=>{
    const candidates=relicPool(run.relicCatalog||[],'GENERAL').filter(x=>!room.relicIds.includes(x.id)&&!run.players.some(p=>p.relics.includes(x.id)));
    if(!candidates.length)return false;
    room.relicIds.push(choose(run,candidates,'aug-027:'+run.currentRoomNodeId+':'+card.playerId).id);return true;
  }});
  autoResolveAiPickers(run);
  return {cards,pickOrder:[...room.pickOrder],retry:false};
}
export function chooseRewardRelic(run,playerId,relicId){
  if(run.phase!=='REWARD_ROOM'||run.roomState?.type!=='REWARD_ROOM')throw new Error('현재 보상방이 아닙니다.');
  const room=run.roomState;if(room.pickOrder[0]!==playerId)throw new Error('현재 유물 선택 차례가 아닙니다.');
  const p=playerFor(run,playerId);if(!room.relicIds.includes(relicId))throw new Error('남아 있는 유물만 선택할 수 있습니다.');
  if(p.relics.includes(relicId))throw new Error('동일 유물을 중복 보유할 수 없습니다.');
  const luckWindow=room.gamblerLuckWindows?.[playerId];if(luckWindow&&luckWindow.phase!=='CONFIRMED')luckWindow.phase='CONFIRMED';
  p.relics.push(relicId);room.picks[playerId]=relicId;room.relicIds=room.relicIds.filter(x=>x!==relicId);room.pickOrder.shift();
  refreshRewardLuckWindow(run);
  autoResolveAiPickers(run);
  if(!room.pickOrder.length&&!room.resolved)autoAssignRemaining(run,room.invalidPlayerIds||[]);
}
export function roomReady(run,playerId,nowMs=Date.now()){
  if(run.phase!=='ROOM_RESULT'||!run.roomResult)throw new Error('현재 방 결과 단계가 아닙니다.');
  if(!run.roomResult.readyPlayerIds.includes(playerId))run.roomResult.readyPlayerIds.push(playerId);
  if(allIds(run).every(id=>run.roomResult.readyPlayerIds.includes(id))){
    delete run.roomState;delete run.roomResult;delete run.combat;
    run.phase='MAP_VOTE';run.map.votes={};run.map.voteDeadline=new Date(nowMs+15_000).toISOString();
  }
}
