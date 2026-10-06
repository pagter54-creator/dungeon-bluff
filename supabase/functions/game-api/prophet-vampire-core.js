// Mode-independent rules. Adapters provide authoritative IDs, cards and RNG.
export const PROPHET_CARD_POOL=Object.freeze([0,1,2,3,4]);
export const VAMPIRE_CARD_POOL=Object.freeze([1,2,3,4,5]);
export const CORE_REVISION='PROPHET_VAMPIRE_20261006';
export function collisionParticipants(cards){
 const groups=new Map();
 for(const c of cards){const n=c.finalNumber??c.value;const g=groups.get(n)||[];g.push(c);groups.set(n,g);}
 return [...groups.values()].filter(g=>g.length>1).flat();
}
export function revelationGain(state,amount,{eventId,max=6,bonus=0}={}){
 state.appliedGains||={};
 if(!eventId)throw new Error('AUTHORITATIVE_REVELATION_EVENT_ID_REQUIRED');
 if(state.appliedGains[eventId])return {applied:false,before:state.revelation,after:state.revelation,amount:0};
 const before=Math.max(0,Number(state.revelation)||0);
 state.revelation=Math.min(max,before+Math.max(0,amount)+Math.max(0,bonus));
 state.appliedGains[eventId]=true;
 return {applied:true,before,after:state.revelation,amount:state.revelation-before};
}
export function armPastFragment(state,{actionId,cost=6}={}){
 state.activations||={};
 if(state.activations[actionId])return false;
 if(state.fragment||state.fragmentPending)throw new Error('이미 과거의 편린을 보유하고 있습니다.');
 if((state.revelation||0)<cost)throw new Error('계시가 부족합니다.');
 state.revelation-=cost;state.fragmentPending={actionId};state.activations[actionId]=true;
 return true;
}
export function capturePastFragment(state,ownerId,cards,{turn,numberOf=c=>c.finalNumber??c.value,idOf=c=>c.playerId??c.memberId}={}){
 if(!state.fragmentPending)return null;
 const others=cards.filter(c=>idOf(c)!==ownerId);
 if(!others.length)throw new Error('PAST_FRAGMENT_REQUIRES_OTHER_CARD');
 state.fragment={value:Math.max(...others.map(numberOf)),createdTurn:turn,actionId:state.fragmentPending.actionId};
 delete state.fragmentPending;state.zeroState='FRAGMENT';
 return state.fragment;
}
export function consumePastFragment(state){
 if(!state.fragment)return null;
 const used=state.fragment;delete state.fragment;state.zeroState='USED_ZERO';return used;
}
export function lowestValidThrall(ownerId,cards,{idOf=c=>c.playerId??c.memberId,numberOf=c=>c.finalNumber??c.value,eligible=()=>true,choose}={}){
 const owner=cards.find(c=>idOf(c)===ownerId);
 if(!owner?.valid)return {targetId:null,candidates:[]};
 const others=cards.filter(c=>idOf(c)!==ownerId&&c.valid&&eligible(idOf(c)));
 if(!others.length)return {targetId:null,candidates:[]};
 const lowest=Math.min(...others.map(numberOf));
 const candidates=others.filter(c=>numberOf(c)===lowest).map(idOf).sort();
 if(typeof choose!=='function')throw new Error('AUTHORITATIVE_THRALL_RNG_REQUIRED');
 return {targetId:candidates.length===1?candidates[0]:choose(candidates),candidates,number:lowest};
}
export function revelationVisible(state,{threshold=3,turn}={}){
 return (state.revelation||0)>=threshold||(turn!=null&&state.visibilityHeldTurn===turn);
}
