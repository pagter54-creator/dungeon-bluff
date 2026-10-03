import {drawIndex} from './rng.js';
import {GAMBLER_CONTRACTS} from './gambler-contracts.js';

export const GAMBLER_BASE_DECK=Object.freeze([1,1,2,2,3,3,4,4,5,5,6]);
export const GAMBLER_ZONES=Object.freeze(['DECK','HAND','DISCARD','VANISHED']);

function gamblerRoomScope(run){
  if(run?.phase==='COMBAT')return 'COMBAT';
  if(run?.phase==='EVENT')return 'EVENT';
  if(run?.phase==='REWARD_ROOM')return 'REWARD';
  if(run?.phase==='SHOP')return 'SHOP';
  if(run?.phase==='REST')return 'REST';
  return null;
}
function hasGamblerAugment(run,player,id){
  const scope=gamblerRoomScope(run);
  return Boolean(player?.augments?.includes(id)&&scope&&GAMBLER_CONTRACTS[id]?.roomApplicability?.[scope]===true);
}

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
  state.runtimeOnce=state.runtimeOnce&&typeof state.runtimeOnce==='object'?state.runtimeOnce:{};
  state.validOrdinaryHistory=Array.isArray(state.validOrdinaryHistory)?state.validOrdinaryHistory:[];
  state.shuffleOrdinarySeen=Array.isArray(state.shuffleOrdinarySeen)?state.shuffleOrdinarySeen:[];
  state.countedOrdinary=Array.isArray(state.countedOrdinary)?state.countedOrdinary:[];
  state.aug214Run=Array.isArray(state.aug214Run)?state.aug214Run:[];
  state.predictedNumbers=Array.isArray(state.predictedNumbers)?state.predictedNumbers:[];
  state.weakenedBorrowedIds=Array.isArray(state.weakenedBorrowedIds)?state.weakenedBorrowedIds:[];
  state.drawPreference=state.drawPreference||null;
  state.drawChoicePending=state.drawChoicePending||null;
  state.drawPenaltyTurns=Math.max(0,Number(state.drawPenaltyTurns)||0);
  state.doubleDownReady=Boolean(state.doubleDownReady);
  state.forcedAutoSubmitNext=Boolean(state.forcedAutoSubmitNext);
  state.aug237Used=Boolean(state.aug237Used);
  state.aug238Used=Boolean(state.aug238Used);
  state.telemetry=state.telemetry&&typeof state.telemetry==='object'?state.telemetry:{};
  state.telemetry.drawCount=Number(state.telemetry.drawCount)||0;state.telemetry.vanishCount=Number(state.telemetry.vanishCount)||0;state.telemetry.reshuffleCount=Number(state.telemetry.reshuffleCount)||0;state.telemetry.luckUsed=Number(state.telemetry.luckUsed)||0;state.telemetry.allInAttempt=Number(state.telemetry.allInAttempt)||0;state.telemetry.allInSuccess=Number(state.telemetry.allInSuccess)||0;state.telemetry.allInDamage=Number(state.telemetry.allInDamage)||0;state.telemetry.augment=state.telemetry.augment&&typeof state.telemetry.augment==='object'?state.telemetry.augment:{};
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
    history:[],processedActions:{},pendingAllIn:null,runtimeOnce:{},validOrdinaryHistory:[],shuffleOrdinarySeen:[],countedOrdinary:[],aug214Run:[],predictedNumbers:[],weakenedBorrowedIds:[],drawPreference:null,drawChoicePending:null,drawPenaltyTurns:0,doubleDownReady:false,forcedAutoSubmitNext:false,aug237Used:false,aug238Used:false,telemetry:{drawCount:0,vanishCount:0,reshuffleCount:0,luckUsed:0,allInAttempt:0,allInSuccess:0,allInDamage:0,augment:{}},firstDrawAfterShuffle:false,deckInitialized:false};
}
export function initializeGamblerCombat(run,player,state){
  normalizeGamblerState(run,player,state);
  state.runtimeOnce={};
  state.aug219Used=false;state.insuranceUsed=false;state.fortuneStack=0;state.fortuneLastSpecial=null;state.fortuneOrdinarySeen=[];
  state.allInWinStreak=0;state.houseUsed=false;state.aug237Used=false;state.aug238Used=false;
  state.doubleDownReady=false;state.forcedAutoSubmitNext=false;state.drawPenaltyTurns=0;
  state.allInFailedThisTurn=false;state.pendingAllIn=null;
}
function ensureInitialShuffle(run,player,state){
  if(state.deckInitialized)return;
  state.drawPileIds=shuffleIds(run,state.drawPileIds,`gambler-initial-shuffle:${run.floor}:${run.depth}:${run.currentRoomNodeId||'room'}:${player.playerId}`);
  state.deckInitialized=true;state.shuffleCount++;state.firstDrawAfterShuffle=true;
}
function reshuffle(run,player,state){
  if(state.drawPileIds.length||!state.discardPileIds.length)return false;
  const discardCounts=new Map();
  for(const id of state.discardPileIds){const value=player.cardPool.find(c=>c.id===id)?.baseNumber;if(Number.isInteger(value))discardCounts.set(value,(discardCounts.get(value)||0)+1);}
  const maxDiscard=Math.max(0,...discardCounts.values());
  state.discardMemoryNumber=maxDiscard>=2?[...discardCounts.entries()].filter(([,count])=>count===maxDiscard).sort((a,b)=>a[0]-b[0])[0]?.[0]??null:null;
  state.drawPileIds=shuffleIds(run,state.discardPileIds,`gambler-reshuffle:${run.floor}:${run.depth}:${run.currentRoomNodeId||'room'}:${player.playerId}:${state.shuffleCount}`);
  state.discardPileIds=[];state.shuffleCount++;state.telemetry.reshuffleCount++;
  state.sixProgress=[];state.sevenProgress=[];
  state.aug214Run=[];state.aug214TriggeredShuffle=false;
  state.countedOrdinary=[];state.cardCounter=0;state.cardCounterArmed=false;
  state.shuffleOrdinarySeen=[];state.fiveMemoryArmed=false;
  state.sequenceArmed=false;
  state.aug228UsedShuffle=false;state.aug230UsedShuffle=false;
  state.firstDrawAfterShuffle=true;state.drawPreference=null;state.drawChoicePending=null;
  boundedHistory(state,{type:'SHUFFLE',turn:run.combat?.turn||run.roomState?.turn||0,shuffleCount:state.shuffleCount});
  return true;
}

function predictedFromDeck(player,state){
  const counts=new Map();
  for(const id of state.drawPileIds){const value=player.cardPool.find(c=>c.id===id)?.baseNumber;if(value>=1&&value<=5)counts.set(value,(counts.get(value)||0)+1);}
  const max=Math.max(0,...counts.values());
  return max?[...counts.entries()].filter(([,count])=>count===max).map(([value])=>value).sort((a,b)=>a-b):[];
}
function requiredDrawChoice(run,player,state){
  if(!state.firstDrawAfterShuffle)return null;
  if(hasGamblerAugment(run,player,'aug-230')&&!state.aug230UsedShuffle)return 'AUG_230';
  if(hasGamblerAugment(run,player,'aug-228')&&!state.aug228UsedShuffle)return 'AUG_228';
  return null;
}
function applyDrawGuarantee(player,state){
  if(!state.firstDrawAfterShuffle||!state.drawPreference)return;
  const values=state.drawPreference.values||[];
  const firstTwo=state.drawPileIds.slice(0,2);
  const match=id=>values.includes(player.cardPool.find(c=>c.id===id)?.baseNumber);
  if(values.length&&!firstTwo.some(match)){
    const idx=state.drawPileIds.findIndex(match);
    if(idx>=0){const target=Math.min(1,state.drawPileIds.length-1);[state.drawPileIds[target],state.drawPileIds[idx]]=[state.drawPileIds[idx],state.drawPileIds[target]];}
  }
  if(state.drawPreference.source==='aug-228')state.aug228UsedShuffle=true;
  if(state.drawPreference.source==='aug-230')state.aug230UsedShuffle=true;
  state.drawChoicePending=null;
}
export function setGamblerDrawPreference(run,player,state,choice){
  normalizeGamblerState(run,player,state);
  const required=requiredDrawChoice(run,player,state);
  if(!required||state.drawChoicePending!==required)throw new Error('GAMBLER_DRAW_CHOICE_NOT_AVAILABLE');
  let values,source;
  if(required==='AUG_228'){
    if(choice!=='LOW'&&choice!=='HIGH')throw new Error('GAMBLER_DRAW_RANGE_INVALID');
    values=choice==='LOW'?[1,2,3]:[3,4,5];source='aug-228';
  }else{
    if(!Array.isArray(choice)||choice.length!==3||new Set(choice).size!==3||choice.some(v=>!Number.isInteger(v)||v<1||v>5))throw new Error('GAMBLER_DRAW_NUMBERS_INVALID');
    values=[...choice].sort((a,b)=>a-b);source='aug-230';
  }
  state.drawPreference={source,values};
  applyDrawGuarantee(player,state);
  boundedHistory(state,{type:'DRAW_CHOICE',turn:run.combat?.turn||0,source,values:[...values]});
  return drawGamblerHand(run,player,state);
}
function drawOne(run,player,state){
  normalizeGamblerState(run,player,state);ensureInitialShuffle(run,player,state);reshuffle(run,player,state);
  if(!state.drawPileIds.length)return null;
  const cardId=state.drawPileIds.shift();
  state.drawCount++;state.telemetry.drawCount++;
  boundedHistory(state,{type:'DRAW',turn:run.combat?.turn||run.roomState?.turn||0,cardInstanceId:cardId,drawCount:state.drawCount});
  return cardId;
}
export function drawGamblerHand(run,player,state,count=2){
  if(player.characterId!=='gambler')return [];
  normalizeGamblerState(run,player,state);ensureInitialShuffle(run,player,state);reshuffle(run,player,state);
  const required=requiredDrawChoice(run,player,state);
  if(required&&!state.drawPreference){state.drawChoicePending=required;state.predictedNumbers=predictedFromDeck(player,state);return [];}
  applyDrawGuarantee(player,state);
  const predictionBefore=[...predictedFromDeck(player,state)];
  const drawn=[];
  while(state.remainingCardIds.length<count){
    const cardId=drawOne(run,player,state);
    if(!cardId)break;
    state.remainingCardIds.push(cardId);drawn.push(cardId);
  }
  if(drawn.length){state.firstDrawAfterShuffle=false;state.drawPreference=null;state.currentPrediction=predictionBefore;state.predictedNumbers=predictedFromDeck(player,state);}
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
  state.luck=0;state.telemetry.luckUsed++;boundedHistory(state,{type:'LUCK_SPEND',turn:run.combat?.turn||0,rootActionId});return true;
}
export function settleGamblerHand(run,player,state,selectedId,finalNumber,{rootActionId=''}={}){
  if(player.characterId!=='gambler')return false;
  normalizeGamblerState(run,player,state);
  const actionKey=rootActionId&&`settle:${rootActionId}`;
  if(actionKey&&state.processedActions[actionKey])return false;
  if(!state.remainingCardIds.includes(selectedId))throw new Error('GAMBLER_CARD_NOT_IN_HAND');
  const used=player.cardPool.find(c=>c.id===selectedId);
  const allInUse=state.pendingAllIn?.finalized&&state.pendingAllIn.judgmentCardId===selectedId?new Set(state.pendingAllIn.cardIds||[]):null;
  const physicallyUsed=allInUse||new Set([selectedId]);
  for(const id of [...state.remainingCardIds]){
    const card=player.cardPool.find(c=>c.id===id);
    if(physicallyUsed.has(id)&&card?.baseNumber>=6){
      if(!state.vanishedCardIds.includes(id)){state.vanishedCardIds.push(id);state.telemetry.vanishCount++;}
      boundedHistory(state,{type:'VANISH',turn:run.combat?.turn||0,cardInstanceId:id,value:card.baseNumber});
    }else{
      if(!state.discardPileIds.includes(id))state.discardPileIds.push(id);
      boundedHistory(state,{type:'DISCARD',turn:run.combat?.turn||0,cardInstanceId:id,value:card?.baseNumber??null});
    }
  }
  state.remainingCardIds=[];state.spentCardIds=[];
  if(Number.isInteger(finalNumber)&&finalNumber>=1&&finalNumber<=5){
    for(const [value,key,needed] of [[6,'sixProgress',3],[7,'sevenProgress',5]]){
      if(registered(player,state,value)>=2){state[key]=[];continue;}
      if(!state[key].includes(finalNumber))state[key].push(finalNumber);
      if(state[key].length>=needed){state[key]=[];unlock(run,player,state,value,rootActionId||`progress:${state.drawCount}:${value}`);}
    }
  }
  if(actionKey)state.processedActions[actionKey]=true;
  const pending=state.pendingAllIn;
  const wasAllIn=Boolean(pending?.finalized&&pending.judgmentCardId===selectedId);
  if(wasAllIn&&pending.externalSpecialCardId){
    const id=pending.externalSpecialCardId,card=player.cardPool.find(c=>c.id===id);
    state.drawPileIds=state.drawPileIds.filter(x=>x!==id);state.discardPileIds=state.discardPileIds.filter(x=>x!==id);
    if(card?.baseNumber>=6&&!state.vanishedCardIds.includes(id)){state.vanishedCardIds.push(id);state.telemetry.vanishCount++;}
    boundedHistory(state,{type:'VANISH',turn:run.combat?.turn||0,cardInstanceId:id,value:card?.baseNumber??null,source:'AUG_238'});
  }
  let nextDrawCount=2;
  if(wasAllIn){
    let penaltyTurns=Math.max(0,Number(state.drawPenaltyTurns)||0);
    if(pending.allAssets)penaltyTurns=Math.max(penaltyTurns,2);
    else if(!(pending.valid&&hasGamblerAugment(run,player,'aug-235')&&!pending.doubleDownSecond))penaltyTurns=Math.max(penaltyTurns,1);
    if(pending.aug237Reduced)penaltyTurns=Math.max(0,penaltyTurns-1);
    if(penaltyTurns>0){nextDrawCount=1;penaltyTurns--;}
    state.drawPenaltyTurns=penaltyTurns;
    if(pending.doubleDownSecond&&!pending.valid&&hasGamblerAugment(run,player,'aug-235')){nextDrawCount=0;state.forcedAutoSubmitNext=true;}
  }else if(state.drawPenaltyTurns>0){
    nextDrawCount=1;state.drawPenaltyTurns--;
  }
  if(hasGamblerAugment(run,player,'aug-233')&&state.allInFailedThisTurn&&!state.insuranceUsed){nextDrawCount=2;state.insuranceUsed=true;state.drawPenaltyTurns=0;state.forcedAutoSubmitNext=false;}
  state.allInFailedThisTurn=false;
  if(wasAllIn)state.pendingAllIn=null;
  if(nextDrawCount>0)drawGamblerHand(run,player,state,nextDrawCount);
  return true;
}
export function prepareGamblerAllIn(run,player,state,submission,resolved){
  normalizeGamblerState(run,player,state);
  if(!hasGamblerAugment(run,player,'aug-231'))return null;
  const ids=[...(state.remainingCardIds||[])];
  if(ids.length<2)return null;
  const judgmentId=submission?.cardInstanceId||resolved?.cardInstanceId;
  if(!ids.includes(judgmentId))throw new Error('GAMBLER_ALL_IN_JUDGMENT_NOT_IN_HAND');
  const partnerId=ids.find(id=>id!==judgmentId);
  const judgment=player.cardPool.find(c=>c.id===judgmentId),partner=player.cardPool.find(c=>c.id===partnerId);
  if(!judgment||!partner)throw new Error('GAMBLER_ALL_IN_CARD_MISSING');
  const turn=run.combat?.turn||0;
  const rootActionId=`all-in:${run.combat?.id||run.currentRoomNodeId||'room'}:${turn}:${player.playerId}:${judgmentId}`;
  if(state.pendingAllIn?.rootActionId===rootActionId){const prior=state.pendingAllIn;if(resolved){resolved.allIn=true;resolved.allInRootActionId=rootActionId;resolved.allInCardIds=[...(prior.cardIds||[])];resolved.allInValues=[...(prior.values||[])];resolved.allInSum=prior.sum;resolved.doubleDownSecond=Boolean(prior.doubleDownSecond);resolved.allAssets=Boolean(prior.allAssets);resolved.gamblerBorrowBonus=Number(prior.borrowBonus)||0;}return prior;}
  const doubleDownSecond=Boolean(hasGamblerAugment(run,player,'aug-235')&&state.doubleDownReady);
  const handOrdinary=[judgment,partner].every(card=>card.baseNumber>=1&&card.baseNumber<=5);
  const specialPool=[...(state.discardPileIds||[]),...(state.drawPileIds||[])]
    .map(id=>player.cardPool.find(card=>card.id===id)).filter(card=>card&&card.baseNumber>=6&&!state.vanishedCardIds.includes(card.id))
    .sort((a,b)=>a.baseNumber-b.baseNumber||String(a.id).localeCompare(String(b.id)));
  const allAssets=Boolean(hasGamblerAugment(run,player,'aug-238')&&!state.aug238Used&&handOrdinary&&specialPool.length);
  const externalSpecial=allAssets?specialPool[0]:null;
  const values=[judgment.baseNumber,partner.baseNumber,...(externalSpecial?[externalSpecial.baseNumber]:[])];
  const cardIds=[judgmentId,partnerId,...(externalSpecial?[externalSpecial.id]:[])];
  let borrowedCardId=null,borrowBonus=0;
  const borrowKey=`aug-236:turn:${turn}`;
  if(hasGamblerAugment(run,player,'aug-236')&&!state.runtimeOnce[borrowKey]){
    const candidate=(state.drawPileIds||[]).find(id=>!cardIds.includes(id));
    if(candidate){borrowedCardId=candidate;borrowBonus=1;state.runtimeOnce[borrowKey]=true;if(!state.weakenedBorrowedIds.includes(candidate))state.weakenedBorrowedIds.push(candidate);}
  }
  state.pendingAllIn={rootActionId,judgmentCardId:judgmentId,partnerCardId:partnerId,cardIds,values,sum:values.reduce((a,b)=>a+b,0),
    finalized:false,doubleDownSecond,allAssets,externalSpecialCardId:externalSpecial?.id||null,borrowedCardId,borrowBonus};
  if(doubleDownSecond)state.doubleDownReady=false;
  if(allAssets)state.aug238Used=true;
  if(resolved){
    resolved.allIn=true;resolved.allInRootActionId=rootActionId;resolved.allInCardIds=[...cardIds];resolved.allInValues=[...values];
    resolved.allInSum=state.pendingAllIn.sum;resolved.doubleDownSecond=doubleDownSecond;resolved.allAssets=allAssets;resolved.gamblerBorrowBonus=borrowBonus;
  }
  state.telemetry.allInAttempt++;
  boundedHistory(state,{type:'ALL_IN_ATTEMPT',turn,rootActionId,cardIds:[...cardIds],judgmentCardId:judgmentId});
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
  const counterWasArmed=Boolean(state.cardCounterArmed);
  const sequenceWasArmed=Boolean(state.sequenceArmed);
  if(hasGamblerAugment(run,player,'aug-220'))bonus+=Math.max(0,Math.min(4,Number(state.fortuneStack)||0));
  if(state.weakenedBorrowedIds.includes(resolved?.cardInstanceId)){resolved.gamblerDamagePenalty=(Number(resolved.gamblerDamagePenalty)||0)+1;state.weakenedBorrowedIds=state.weakenedBorrowedIds.filter(id=>id!==resolved.cardInstanceId);}
  if(value>=1&&value<=5&&state.luckDamageArmed){bonus+=1;state.luckDamageArmed=false;}
  if(value>=1&&value<=5&&hasGamblerAugment(run,player,'aug-223')&&state.discardMemoryNumber===value&&onceTurn('aug-223'))bonus+=1;
  if(value>=1&&value<=5&&hasGamblerAugment(run,player,'aug-224')&&Array.isArray(state.currentPrediction)&&state.currentPrediction.includes(value)&&onceTurn('aug-224'))bonus+=1;
  if(counterWasArmed){bonus+=2;state.cardCounter=0;state.cardCounterArmed=false;state.countedOrdinary=[];}
  if(sequenceWasArmed){bonus+=3;state.sequenceArmed=false;state.validOrdinaryHistory=[];}
  if(value===6){
    if(hasGamblerAugment(run,player,'aug-212')&&onceTurn('aug-212')){bonus+=2;state.specialCharge=(Number(state.specialCharge)||0)+1;}
    if(hasGamblerAugment(run,player,'aug-218')&&onceTurn('aug-218'))bonus+=3;
  }
  if(value===7){
    if(hasGamblerAugment(run,player,'aug-213'))bonus+=4;
    if(hasGamblerAugment(run,player,'aug-219')&&!state.aug219Used){bonus+=7;state.aug219Used=true;}
  }
  if([6,7].includes(value)){
    if(hasGamblerAugment(run,player,'aug-211'))addGamblerLuck(run,player,state,`valid:${run.combat?.id||run.currentRoomNodeId||'room'}:${turn}:${resolved.cardInstanceId}`);
    if(hasGamblerAugment(run,player,'aug-216')&&state.aug216Cycle!==state.shuffleCount){state.specialCharge=(Number(state.specialCharge)||0)+1;state.aug216Cycle=state.shuffleCount;}
    if(hasGamblerAugment(run,player,'aug-217')&&state.lastValidSpecial&&state.lastValidSpecial!==value&&onceTurn('aug-217'))bonus+=3;
    if(hasGamblerAugment(run,player,'aug-220')){
      state.fortuneOrdinarySeen=Array.isArray(state.fortuneOrdinarySeen)?state.fortuneOrdinarySeen:[];
      if(state.fortuneLastSpecial&&state.fortuneLastSpecial!==value&&state.fortuneOrdinarySeen.length>=3)state.fortuneStack=Math.min(4,(Number(state.fortuneStack)||0)+1);
      state.fortuneLastSpecial=value;
    }
    state.lastValidSpecial=value;
  }else if(value>=1&&value<=5){
    if(hasGamblerAugment(run,player,'aug-215')&&[6,7].includes(state.lastValidCardValue)&&onceTurn('aug-215'))bonus+=2;
    state.validOrdinaryHistory.push(value);if(state.validOrdinaryHistory.length>8)state.validOrdinaryHistory.shift();
    if(!state.shuffleOrdinarySeen.includes(value))state.shuffleOrdinarySeen.push(value);
    state.fortuneOrdinarySeen=Array.isArray(state.fortuneOrdinarySeen)?state.fortuneOrdinarySeen:[];if(!state.fortuneOrdinarySeen.includes(value))state.fortuneOrdinarySeen.push(value);
    let countingCombo=null;
    if(hasGamblerAugment(run,player,'aug-214')){
      state.aug214Run=Array.isArray(state.aug214Run)?state.aug214Run:[];
      if(!state.aug214Run.includes(value))state.aug214Run.push(value);else state.aug214Run=[value];
      if(state.aug214Run.length>=3&&!state.aug214TriggeredShuffle){state.specialCharge=(Number(state.specialCharge)||0)+1;state.aug214TriggeredShuffle=true;state.aug214Run=[];}
    }
    if(hasGamblerAugment(run,player,'aug-221')){
      state.countedOrdinary=Array.isArray(state.countedOrdinary)?state.countedOrdinary:[];
      if(!state.countedOrdinary.includes(value)){state.countedOrdinary.push(value);state.cardCounter=Math.min(3,(Number(state.cardCounter)||0)+1);}
      if(state.cardCounter>=3){state.cardCounterArmed=true;countingCombo='COUNTER3';}
    }
    if(hasGamblerAugment(run,player,'aug-222')&&onceTurn('aug-222')){
      const ids=[...(state.drawPileIds||[]),...(state.remainingCardIds||[])];
      const copies=ids.filter(id=>player.cardPool.find(card=>card.id===id)?.baseNumber===value).length;
      if(copies>=2)bonus+=1;
    }
    if(hasGamblerAugment(run,player,'aug-225')){
      const h=state.validOrdinaryHistory.slice(-3);if(h.length===3&&Math.abs(h[1]-h[0])===1&&h[2]-h[1]===h[1]-h[0]){state.sequenceArmed=true;countingCombo='SEQUENCE3';}
    }
    if(hasGamblerAugment(run,player,'aug-226')&&onceTurn('aug-226')){
      const h=state.validOrdinaryHistory.slice(-5);if(h.length===5){const counts=Object.values(h.reduce((m,n)=>(m[n]=(m[n]||0)+1,m),{})).sort((a,b)=>b-a);if(counts.length===4&&counts[0]===2){bonus+=2;countingCombo='FULL_HOUSE';}}
    }
    if(hasGamblerAugment(run,player,'aug-227')&&state.shuffleOrdinarySeen.length===5){state.fiveMemoryArmed=true;countingCombo='FIVE_MEMORY';}
    if(countingCombo&&hasGamblerAugment(run,player,'aug-229')&&countingCombo!==state.lastCountingCombo&&onceTurn('aug-229')){bonus+=3;state.lastCountingCombo=countingCombo;}
  }
  if(state.fiveMemoryArmed&&[6,7].includes(value)){bonus+=4;state.fiveMemoryArmed=false;}
  resolved.gamblerBonusDamage=(Number(resolved.gamblerBonusDamage)||0)+bonus;
  state.lastValidCardValue=value;
  boundedHistory(state,{type:'VALID',turn,cardInstanceId:resolved.cardInstanceId,value,bonus});
  return bonus;
}

export function gamblerSetDamage(run,player,state,resolved,damage){
  const validatedBonus=Number(resolved?.gamblerBonusDamage)||0;
  const penalty=Math.max(0,Number(resolved?.gamblerDamagePenalty)||0);
  if(!resolved?.allIn||!hasGamblerAugment(run,player,'aug-231'))return Math.max(0,(Number(damage)||0)+validatedBonus-penalty);
  const key=`all-in-damage:${resolved.allInRootActionId}`;
  if(Number.isFinite(state.processedActions[key]))return state.processedActions[key];
  let amount=Math.max(0,Number(resolved.allInSum)||0)+(resolved.allAssets?4:0)+(Number(resolved.gamblerBorrowBonus)||0);
  const values=resolved.allInValues||[];
  if(hasGamblerAugment(run,player,'aug-232'))amount+=Math.max(...[0,...(resolved.allInSum>=10?[4]:resolved.allInSum>=8?[2]:[])]);
  if(hasGamblerAugment(run,player,'aug-234')&&values.length===2&&values.every(v=>v<=3))amount+=1;
  if(hasGamblerAugment(run,player,'aug-235')&&resolved.doubleDownSecond)amount+=2;
  const streak=Math.max(0,Math.min(4,Number(state.allInWinStreak)||0));
  if(hasGamblerAugment(run,player,'aug-239'))amount+=streak;
  if(hasGamblerAugment(run,player,'aug-240')&&!state.houseUsed){amount+=8;state.houseUsed=true;}
  amount=Math.max(0,amount+validatedBonus-penalty);
  if(hasGamblerAugment(run,player,'aug-237')&&amount>=8&&!state.aug237Used){state.aug237Used=true;if(state.pendingAllIn)state.pendingAllIn.aug237Reduced=true;resolved.aug237Reduced=true;}
  state.processedActions[key]=amount;state.telemetry.allInDamage+=amount;
  boundedHistory(state,{type:'ALL_IN_DAMAGE',turn:run.combat?.turn||0,rootActionId:resolved.allInRootActionId,amount});
  return amount;
}
export function finalizeGamblerAllIn(run,player,state,resolved){
  if(!resolved?.allIn)return;
  const key=`all-in-final:${resolved.allInRootActionId}`;
  if(state.processedActions[key])return;
  state.processedActions[key]=true;
  if(resolved.valid){
    state.telemetry.allInSuccess++;
    state.allInWinStreak=hasGamblerAugment(run,player,'aug-239')?Math.min(4,(Number(state.allInWinStreak)||0)+1):0;
    if(hasGamblerAugment(run,player,'aug-235')){if(resolved.doubleDownSecond)state.doubleDownReady=false;else state.doubleDownReady=true;}
  }
  else{
    state.allInWinStreak=0;state.allInFailedThisTurn=true;
    if(hasGamblerAugment(run,player,'aug-240')&&!state.houseUsed){
      state.houseUsed=true;player.hp-=1;run.combat&&(run.combat.pendingDownPlayerIds||=[]);
      if(run.combat&&player.hp<=0&&!run.combat.pendingDownPlayerIds.includes(player.playerId))run.combat.pendingDownPlayerIds.push(player.playerId);
    }
  }
  if(state.pendingAllIn){state.pendingAllIn.finalized=true;state.pendingAllIn.valid=Boolean(resolved.valid);state.pendingAllIn.doubleDownSecond=Boolean(resolved.doubleDownSecond);}
  boundedHistory(state,{type:'ALL_IN_RESULT',turn:run.combat?.turn||0,rootActionId:resolved.allInRootActionId,valid:Boolean(resolved.valid)});
}
export function prepareGamblerForcedAutoSubmission(run,player,state){
  normalizeGamblerState(run,player,state);
  if(!state.forcedAutoSubmitNext)return null;
  state.forcedAutoSubmitNext=false;
  drawGamblerHand(run,player,state,1);
  const ids=[...(state.remainingCardIds||[])];if(!ids.length)return null;
  const {index}=drawIndex(run,ids.length,`gambler-double-down-auto:${run.combat?.id||run.currentRoomNodeId||'room'}:${run.combat?.turn||0}:${player.playerId}`);
  const cardInstanceId=ids[index];
  boundedHistory(state,{type:'DOUBLE_DOWN_AUTO',turn:run.combat?.turn||0,cardInstanceId});
  return cardInstanceId;
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
