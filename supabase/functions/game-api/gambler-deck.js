export const GAMBLER_DECK = [1,1,2,2,3,3,4,4,5,5,6];
function shuffle(cards,rng){
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards;
}
export function ensureGamblerDeck(player,rng=Math.random){
  const r=player.characterRuntimeState ||= {};
  if(Array.isArray(r.drawPile)&&Array.isArray(r.discardPile))return;
  const deck=[...GAMBLER_DECK];
  // Preserve a hand already dealt by the previous rules during a rolling update.
  for(const card of player.cycleCards||[]){const i=deck.indexOf(card.value);if(i>=0)deck.splice(i,1);}
  r.drawPile=shuffle(deck,rng);r.discardPile=[];r.sixProgress=[];r.sevenProgress=[];
  for(const key of ['observing','observationPasses','observationPrevious','observationComplete'])delete r[key];
}
export function gamblerRegistered(player,value){
  const r=player.characterRuntimeState;
  return [...r.drawPile,...r.discardPile,...(player.cycleCards||[]).map(c=>c.value)].filter(v=>v===value).length;
}
export function drawGamblerHand(player,rng=Math.random){
  ensureGamblerDeck(player,rng);
  const r=player.characterRuntimeState,held=[];
  while(held.length<2){
    if(!r.drawPile.length){r.drawPile=shuffle(r.discardPile.splice(0),rng);}
    if(!r.drawPile.length)break;
    r.drawSequence=(r.drawSequence||0)+1;
    held.push({id:player.memberId+'-draw-'+r.drawSequence,slot:held.length,value:r.drawPile.pop(),used:false});
  }
  player.cycleIndex=0;player.cycleCards=held;
}
export function settleGamblerHand(player,cardId,rng=Math.random,effects=[],submittedValue){
  ensureGamblerDeck(player,rng);
  const r=player.characterRuntimeState,selected=player.cycleCards.find(c=>c.id===cardId);
  if(!selected)throw new Error('도박사의 제출 카드를 찾지 못했습니다.');
  // Physical consumption uses the original instance; numeric skill conditions
  // use the final submitted value after blood command, like other card rules.
  const valueUsed=submittedValue??selected.value;
  for(const card of player.cycleCards)if(card.id!==cardId||card.value<6)r.discardPile.push(card.value);
  player.cycleCards=[];
  for(const [value,key,needed] of [[6,'sixProgress',3],[7,'sevenProgress',5]]){
    r[key] ||= [];
    if(gamblerRegistered(player,value)>=2){r[key]=[];continue;}
    if(valueUsed<1||valueUsed>5)continue;
    if(!r[key].includes(valueUsed))r[key].push(valueUsed);
    if(r[key].length>=needed){
      r[key]=[];r.discardPile.push(value);
      effects.push({type:'skill',skillId:'random_hand',phase:'refill',memberId:player.memberId,label:`운명의 패 · ${value} 충전`,chargedValue:value});
    }
  }
}

const composition=cards=>Array.from({length:7},(_,i)=>cards.filter(v=>v===i+1).length);
// Scrub every replay snapshot as well as the current state. Even the owner
// receives counts, never the ordered draw pile. Mutates only a response clone.
export function hideGamblerDecks(session,viewerId){
  if(!session)return;
  const clean=players=>{for(const p of Object.values(players||{})){
    if(p.skillId!=='random_hand')continue;
    const r=p.characterRuntimeState;if(!r)continue;
    if(Array.isArray(r.drawPile)&&Array.isArray(r.discardPile)){
      p.gamblerDeck={drawCount:r.drawPile.length,discardCount:r.discardPile.length,
        sixProgress:[...(r.sixProgress||[])],sevenProgress:[...(r.sevenProgress||[])],
        sixMax:gamblerRegistered(p,6)>=2,sevenMax:gamblerRegistered(p,7)>=2};
      if(p.memberId===viewerId)Object.assign(p.gamblerDeck,{
        drawComposition:composition(r.drawPile),discardComposition:composition(r.discardPile),
        sixCount:gamblerRegistered(p,6),sevenCount:gamblerRegistered(p,7),
      });
    }
    delete r.drawPile;delete r.discardPile;delete r.sixProgress;delete r.sevenProgress;
  }};
  clean(session.state.players);
  for(const result of [...(session.state.eventLog||[]),session.state.lastResult].filter(Boolean)){
    clean(result.beforePlayers);clean(result.afterPlayers);
  }
}
