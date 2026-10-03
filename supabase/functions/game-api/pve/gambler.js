import {drawIndex} from './rng.js';

export const GAMBLER_BASE_DECK=Object.freeze([1,1,2,2,3,3,4,4,5,5,6]);
export const GAMBLER_ZONES=Object.freeze(['DECK','HAND','DISCARD','VANISHED']);

function boundedHistory(state,row){
  state.history||=[];
  state.history.push(row);
  if(state.history.length>48)state.history.splice(0,state.history.length-48);
}
function shuffleIds(run,ids,key){
  const out=[...ids];
  for(let i=out.length-1;i>0;i--){
    const {index}=drawIndex(run,i+1,`${key}:${i}`);
    [out[i],out[index]]=[out[index],out[i]];
  }
  return out;
}
export function normalizeGamblerState(run,player,state){
  state.playerId=player.playerId;
  state.usesStandardCycle=false;
  state.remainingCardIds=Array.isArray(state.remainingCardIds)?state.remainingCardIds:[];
  state.spentCardIds=[];
  state.drawPileIds=Array.isArray(state.drawPileIds)?state.drawPileIds:[];
  state.discardPileIds=Array.isArray(state.discardPileIds)?state.discardPileIds:[];
  state.vanishedCardIds=Array.isArray(state.vanishedCardIds)?state.vanishedCardIds:[];
  state.sixProgress=Array.isArray(state.sixProgress)?state.sixProgress:[];
  state.sevenProgress=Array.isArray(state.sevenProgress)?state.sevenProgress:[];
  state.drawCount=Number(state.drawCount)||0;
  state.shuffleCount=Number(state.shuffleCount)||0;
  state.unlockSerial=Number(state.unlockSerial)||0;
  state.luck=Math.max(0,Math.min(1,Number(state.luck)||0));
  state.specialCharge=Math.max(0,Number(state.specialCharge)||0);
  state.history=Array.isArray(state.history)?state.history:[];
  state.processedActions=state.processedActions&&typeof state.processedActions==='object'?state.processedActions:{};
  state.pendingAllIn=state.pendingAllIn||null;
  // Old snapshots had no explicit initial shuffle marker. Keep their current order authoritative.
  if(state.deckInitialized==null)state.deckInitialized=true;
  const all=new Set(player.cardPool.map(c=>c.id));
  const zones=[state.drawPileIds,state.remainingCardIds,state.discardPileIds,state.vanishedCardIds];
  const seen=new Set();
  for(const zone of zones){
    for(const id of [...zone]){
      if(!all.has(id)||seen.has(id))throw new Error('GAMBLER_ZONE_INTEGRITY');
      seen.add(id);
    }
  }
  for(const id of all)if(!seen.has(id))state.drawPileIds.push(id);
  return state;
}
export function freshGamblerState(player){
  return {playerId:player.playerId,cycleIndex:0,usesStandardCycle:false,remainingCardIds:[],spentCardIds:[],
    drawPileIds:player.cardPool.map(card=>card.id),discardPileIds:[],vanishedCardIds:[],
    sixProgress:[],sevenProgress:[],drawCount:0,shuffleCount:0,unlockSerial:0,luck:0,specialCharge:0,
    history:[],processedActions:{},pendingAllIn:null,deckInitialized:false};
}
function ensureInitialShuffle(run,player,state){
  if(state.deckInitialized)return;
  state.drawPileIds=shuffleIds(run,state.drawPileIds,`gambler-initial-shuffle:${run.floor}:${run.depth}:${run.currentRoomNodeId||'room'}:${player.playerId}`);
  state.deckInitialized=true;state.shuffleCount++;
}
function reshuffle(run,player,state){
  if(state.drawPileIds.length||!state.discardPileIds.length)return false;
  state.drawPileIds=shuffleIds(run,state.discardPileIds,`gambler-reshuffle:${run.floor}:${run.depth}:${run.currentRoomNodeId||'room'}:${player.playerId}:${state.shuffleCount}`);
  state.discardPileIds=[];state.shuffleCount++;
  state.sixProgress=[];state.sevenProgress=[];
  boundedHistory(state,{type:'SHUFFLE',turn:run.combat?.turn||run.roomState?.turn||0,shuffleCount:state.shuffleCount});
  return true;
}
function drawOne(run,player,state){
  normalizeGamblerState(run,player,state);ensureInitialShuffle(run,player,state);reshuffle(run,player,state);
  if(!state.drawPileIds.length)return null;
  const cardId=state.drawPileIds.shift();
  state.drawCount++;
  boundedHistory(state,{type:'DRAW',turn:run.combat?.turn||run.roomState?.turn||0,cardInstanceId:cardId,drawCount:state.drawCount});
  return cardId;
}
export function drawGamblerHand(run,player,state,count=2){
  if(player.characterId!=='gambler')return [];
  normalizeGamblerState(run,player,state);
  const drawn=[];
  while(state.remainingCardIds.length<count){
    const cardId=drawOne(run,player,state);
    if(!cardId)break;
    state.remainingCardIds.push(cardId);drawn.push(cardId);
  }
  return drawn;
}
function registered(player,state,value){
  return player.cardPool.filter(card=>card.baseNumber===value&&!state.vanishedCardIds.includes(card.id)).length;
}
function unlock(run,player,state,value,rootActionId=''){
  if(registered(player,state,value)>=2)return null;
  const key=`unlock:${value}:${rootActionId||state.unlockSerial+1}`;
  if(state.processedActions[key])return null;
  state.processedActions[key]=true;
  const id=`${player.playerId}:gambler:unlock:${value}:${++state.unlockSerial}`;
  player.cardPool.push({id,baseNumber:value,source:'GAMBLER_UNLOCK'});
  state.discardPileIds.push(id);
  boundedHistory(state,{type:'UNLOCK',turn:run.combat?.turn||0,cardInstanceId:id,value});
  return id;
}
export function addGamblerLuck(run,player,state,rootActionId=''){
  normalizeGamblerState(run,player,state);
  const key=`luck-gain:${rootActionId}`;if(rootActionId&&state.processedActions[key])return false;
  if(rootActionId)state.processedActions[key]=true;
  const before=state.luck;state.luck=1;
  if(before!==state.luck)boundedHistory(state,{type:'LUCK_GAIN',turn:run.combat?.turn||0,rootActionId});
  return before!==state.luck;
}
export function consumeGamblerLuck(run,player,state,rootActionId=''){
  normalizeGamblerState(run,player,state);
  if(state.luck<=0)return false;
  const key=`luck-spend:${rootActionId}`;if(rootActionId&&state.processedActions[key])return false;
  if(rootActionId)state.processedActions[key]=true;
  state.luck=0;boundedHistory(state,{type:'LUCK_SPEND',turn:run.combat?.turn||0,rootActionId});return true;
}
export function settleGamblerHand(run,player,state,selectedId,finalNumber,{rootActionId=''}={}){
  if(player.characterId!=='gambler')return false;
  normalizeGamblerState(run,player,state);
  const actionKey=rootActionId&&`settle:${rootActionId}`;
  if(actionKey&&state.processedActions[actionKey])return false;
  if(!state.remainingCardIds.includes(selectedId))throw new Error('GAMBLER_CARD_NOT_IN_HAND');
  const used=player.cardPool.find(c=>c.id===selectedId);
  for(const id of [...state.remainingCardIds]){
    const card=player.cardPool.find(c=>c.id===id);
    if(id===selectedId&&card?.baseNumber>=6){
      if(!state.vanishedCardIds.includes(id))state.vanishedCardIds.push(id);
      boundedHistory(state,{type:'VANISH',turn:run.combat?.turn||0,cardInstanceId:id,value:card.baseNumber});
    }else{
      if(!state.discardPileIds.includes(id))state.discardPileIds.push(id);
      boundedHistory(state,{type:'DISCARD',turn:run.combat?.turn||0,cardInstanceId:id,value:card?.baseNumber??null});
    }
  }
  state.remainingCardIds=[];state.spentCardIds=[];
  if(player.augments?.includes('aug-211')&&(used?.baseNumber===6||used?.baseNumber===7))addGamblerLuck(run,player,state,rootActionId||`special:${state.drawCount}`);
  if(Number.isInteger(finalNumber)&&finalNumber>=1&&finalNumber<=5){
    for(const [value,key,needed] of [[6,'sixProgress',3],[7,'sevenProgress',5]]){
      if(registered(player,state,value)>=2){state[key]=[];continue;}
      if(!state[key].includes(finalNumber))state[key].push(finalNumber);
      if(state[key].length>=needed){state[key]=[];unlock(run,player,state,value,rootActionId||`progress:${state.drawCount}:${value}`);}
    }
  }
  if(actionKey)state.processedActions[actionKey]=true;
  const wasAllIn=Boolean(state.pendingAllIn?.finalized&&state.pendingAllIn.judgmentCardId===selectedId);
  let nextDrawCount=wasAllIn?1:2;
  if(player.augments?.includes('aug-233')&&state.allInFailedThisTurn&&!state.insuranceUsed){nextDrawCount=2;state.insuranceUsed=true;}
  state.allInFailedThisTurn=false;
  if(wasAllIn)state.pendingAllIn=null;
  drawGamblerHand(run,player,state,nextDrawCount);
  return true;
}
export function prepareGamblerAllIn(run,player,state,submission,resolved){
  normalizeGamblerState(run,player,state);
  if(!player.augments?.includes('aug-231'))return null;
  const ids=[...(state.remainingCardIds||[])];
  if(ids.length<2)return null;
  const judgmentId=submission?.cardInstanceId||resolved?.cardInstanceId;
  if(!ids.includes(judgmentId))throw new Error('GAMBLER_ALL_IN_JUDGMENT_NOT_IN_HAND');
  const partnerId=ids.find(id=>id!==judgmentId);
  const judgment=player.cardPool.find(c=>c.id===judgmentId),partner=player.cardPool.find(c=>c.id===partnerId);
  if(!judgment||!partner)throw new Error('GAMBLER_ALL_IN_CARD_MISSING');
  const rootActionId=`all-in:${run.combat?.id||run.currentRoomNodeId||'room'}:${run.combat?.turn||0}:${player.playerId}:${judgmentId}`;
  state.pendingAllIn={rootActionId,judgmentCardId:judgmentId,partnerCardId:partnerId,cardIds:[judgmentId,partnerId],
    values:[judgment.baseNumber,partner.baseNumber],sum:judgment.baseNumber+partner.baseNumber,finalized:false};
  if(resolved){resolved.allIn=true;resolved.allInRootActionId=rootActionId;resolved.allInCardIds=[judgmentId,partnerId];resolved.allInValues=[judgment.baseNumber,partner.baseNumber];resolved.allInSum=judgment.baseNumber+partner.baseNumber;}
  return state.pendingAllIn;
}

export function applyGamblerValidated(run,player,state,resolved){
  if(player.characterId!=='gambler')return 0;
  normalizeGamblerState(run,player,state);
  const turn=run.combat?.turn||run.roomState?.attempt||0;
  const value=Number(resolved?.baseNumber);
  const valid=Boolean(resolved?.valid);
  state.runtimeOnce||={};
  state.validOrdinaryHistory=Array.isArray(state.validOrdinaryHistory)?state.validOrdinaryHistory:[];
  state.shuffleOrdinarySeen=Array.isArray(state.shuffleOrdinarySeen)?state.shuffleOrdinarySeen:[];
  let bonus=0;
  const onceTurn=(id)=>{const k=`${id}:turn:${turn}`;if(state.runtimeOnce[k])return false;state.runtimeOnce[k]=true;return true;};
  if(!valid){
    if(resolved?.allIn)state.allInFailedThisTurn=true;
    return 0;
  }
  if(value===6){
    if(player.augments?.includes('aug-212')&&onceTurn('aug-212')){bonus+=2;state.specialCharge=(Number(state.specialCharge)||0)+1;}
    if(player.augments?.includes('aug-218')&&onceTurn('aug-218'))bonus+=3;
  }
  if(value===7){
    if(player.augments?.includes('aug-213'))bonus+=4;
    if(player.augments?.includes('aug-219')&&!state.aug219Used){bonus+=7;state.aug219Used=true;}
  }
  if([6,7].includes(value)){
    if(player.augments?.includes('aug-217')&&state.lastValidSpecial&&state.lastValidSpecial!==value&&onceTurn('aug-217'))bonus+=3;
    state.lastValidSpecial=value;
  }else if(value>=1&&value<=5){
    if(player.augments?.includes('aug-215')&&[6,7].includes(state.lastValidCardValue)&&onceTurn('aug-215'))bonus+=2;
    state.validOrdinaryHistory.push(value);if(state.validOrdinaryHistory.length>8)state.validOrdinaryHistory.shift();
    if(!state.shuffleOrdinarySeen.includes(value))state.shuffleOrdinarySeen.push(value);
    if(player.augments?.includes('aug-214')){
      state.aug214Run=Array.isArray(state.aug214Run)?state.aug214Run:[];
      if(!state.aug214Run.includes(value))state.aug214Run.push(value);else state.aug214Run=[value];
      if(state.aug214Run.length>=3&&!state.aug214TriggeredShuffle){state.specialCharge=(Number(state.specialCharge)||0)+1;state.aug214TriggeredShuffle=true;state.aug214Run=[];}
    }
    if(player.augments?.includes('aug-221')){
      state.countedOrdinary=Array.isArray(state.countedOrdinary)?state.countedOrdinary:[];
      if(!state.countedOrdinary.includes(value)){state.countedOrdinary.push(value);state.cardCounter=Math.min(3,(Number(state.cardCounter)||0)+1);}
      if(state.cardCounter>=3)state.cardCounterArmed=true;
    }
    if(player.augments?.includes('aug-222')&&onceTurn('aug-222')){
      const ids=[...(state.drawPileIds||[]),...(state.remainingCardIds||[])];
      const copies=ids.filter(id=>player.cardPool.find(card=>card.id===id)?.baseNumber===value).length;
      if(copies>=2)bonus+=1;
    }
    if(player.augments?.includes('aug-225')){
      const h=state.validOrdinaryHistory.slice(-3);if(h.length===3&&Math.abs(h[1]-h[0])===1&&h[2]-h[1]===h[1]-h[0])state.sequenceArmed=true;
    }
    if(player.augments?.includes('aug-226')&&onceTurn('aug-226')){
      const h=state.validOrdinaryHistory.slice(-5);if(h.length===5){const counts=Object.values(h.reduce((m,n)=>(m[n]=(m[n]||0)+1,m),{})).sort((a,b)=>b-a);if(counts.length===4&&counts[0]===2)bonus+=2;}
    }
    if(player.augments?.includes('aug-227')&&state.shuffleOrdinarySeen.length===5)state.fiveMemoryArmed=true;
  }
  if(state.cardCounterArmed){bonus+=2;state.cardCounter=0;state.cardCounterArmed=false;state.countedOrdinary=[];}
  if(state.sequenceArmed&&value>=1&&value<=7){bonus+=3;state.sequenceArmed=false;state.validOrdinaryHistory=[];}
  if(state.fiveMemoryArmed&&[6,7].includes(value)){bonus+=4;state.fiveMemoryArmed=false;}
  resolved.gamblerBonusDamage=(Number(resolved.gamblerBonusDamage)||0)+bonus;
  state.lastValidCardValue=value;
  boundedHistory(state,{type:'VALID',turn,cardInstanceId:resolved.cardInstanceId,value,bonus});
  return bonus;
}

export function gamblerSetDamage(run,player,state,resolved,damage){
  const validatedBonus=Math.max(0,Number(resolved?.gamblerBonusDamage)||0);
  if(!resolved?.allIn||!player.augments?.includes('aug-231'))return Math.max(0,Number(damage)||0)+validatedBonus;
  const key=`all-in-damage:${resolved.allInRootActionId}`;
  if(state.processedActions[key])return damage;
  let amount=Math.max(0,Number(resolved.allInSum)||0);
  const values=resolved.allInValues||[];
  if(player.augments.includes('aug-232'))amount+=Math.max(...[0,...(resolved.allInSum>=10?[4]:resolved.allInSum>=8?[2]:[])]);
  if(player.augments.includes('aug-234')&&values.length===2&&values.every(v=>v<=3))amount+=1;
  const streak=Math.max(0,Math.min(4,Number(state.allInWinStreak)||0));
  if(player.augments.includes('aug-239'))amount+=streak;
  if(player.augments.includes('aug-240')&&!state.houseUsed){amount+=8;state.houseUsed=true;}
  amount+=validatedBonus;
  state.processedActions[key]=true;
  boundedHistory(state,{type:'ALL_IN_DAMAGE',turn:run.combat?.turn||0,rootActionId:resolved.allInRootActionId,amount});
  return amount;
}
export function finalizeGamblerAllIn(run,player,state,resolved){
  if(!resolved?.allIn)return;
  if(resolved.valid){state.allInWinStreak=player.augments?.includes('aug-239')?Math.min(4,(Number(state.allInWinStreak)||0)+1):0;}
  else{
    state.allInWinStreak=0;state.allInFailedThisTurn=true;
    if(player.augments?.includes('aug-240')&&!state.houseUsed){
      state.houseUsed=true;player.hp-=1;run.combat&&(run.combat.pendingDownPlayerIds||=[]);
      if(run.combat&&player.hp<=0&&!run.combat.pendingDownPlayerIds.includes(player.playerId))run.combat.pendingDownPlayerIds.push(player.playerId);
    }
  }
  if(state.pendingAllIn)state.pendingAllIn.finalized=true;
  boundedHistory(state,{type:'ALL_IN_RESULT',turn:run.combat?.turn||0,rootActionId:resolved.allInRootActionId,valid:Boolean(resolved.valid)});
}
export function gamblerOwnerPrivateState(run,player,state){
  normalizeGamblerState(run,player,state);
  return {
    usesStandardCycle:false,
    deckOrderIds:[...state.drawPileIds],
    handIds:[...state.remainingCardIds],
    discardIds:[...state.discardPileIds],
    vanishedIds:[...state.vanishedCardIds],
    sixProgress:[...state.sixProgress],sevenProgress:[...state.sevenProgress],
    luck:state.luck,specialCharge:state.specialCharge,
    history:state.history.map(x=>({...x})),pendingAllIn:state.pendingAllIn?{...state.pendingAllIn}:null
  };
}
export function gamblerPublicAggregate(player,state){
  return {deckCount:state.drawPileIds?.length||0,handCount:state.remainingCardIds?.length||0,discardCount:state.discardPileIds?.length||0,
    vanishedCount:state.vanishedCardIds?.length||0,luck:Number(state.luck)||0};
}
