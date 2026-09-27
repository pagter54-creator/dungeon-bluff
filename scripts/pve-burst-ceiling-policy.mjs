import crypto from 'node:crypto';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const rank=(seed,key)=>Number.parseInt(hash(`${seed}|${key}`).slice(0,12),16);
const uniq=xs=>[...new Set(xs)].sort((a,b)=>a-b);

export function buildBurstIntent(view,playerId){
  const p=(view.players||[]).find(x=>x.playerId===playerId);
  if(!p||p.status==='DOWNED'||view.privateCombat?.playerId!==playerId)return null;
  const remaining=new Set(view.privateCombat?.remainingCardIds||[]);
  const available=uniq((p.cardPool||[]).filter(c=>remaining.has(c.id)).map(c=>c.baseNumber));
  if(!available.length)return null;
  return {
    playerId,characterId:p.characterId,seat:p.seat,hp:p.hp,maxHp:p.maxHp,
    availableNumbers:available,remainingCount:remaining.size,cycleIndex:view.privateCombat?.cycleIndex||1,
    publicResources:structuredClone(p.publicResources||{}),
    finisherUsedCycle:view.privateCombat?.finisherUsedCycle??null
  };
}
const pick=(numbers,mode='high')=>mode==='low'?numbers[0]:numbers.at(-1);
function preferred(intent,optimized){
  const r=intent.publicResources||{};
  if(intent.characterId==='gunner'){
    const burst=r.fullBurstReady===true;
    if(optimized&&burst&&intent.remainingCount>=3)return {number:pick(intent.availableNumbers,'low'),skillIntent:true,reason:'FULL_BURST_MAX_MAG',burst:true};
    if(!optimized&&burst&&intent.remainingCount<=2)return {number:pick(intent.availableNumbers,'high'),skillIntent:true,reason:'FULL_BURST_STEADY',burst:true};
    return {number:pick(intent.availableNumbers,'high'),skillIntent:false,reason:'GUNNER_BUILD',burst:false};
  }
  if(intent.characterId==='martial_artist'){
    const combo=Number(r.combo)||0,prev=Number.isFinite(Number(r.lastSubmittedNumber))?Number(r.lastSubmittedNumber):null;
    const finisherReady=combo>0&&intent.finisherUsedCycle!==intent.cycleIndex;
    if(optimized&&combo>=3&&finisherReady)return {number:pick(intent.availableNumbers,'high'),skillIntent:true,reason:'ONE_HIT_KILL_MAX',burst:true};
    if(!optimized&&combo>=1&&finisherReady&&intent.remainingCount<=2)return {number:pick(intent.availableNumbers,'high'),skillIntent:true,reason:'ONE_HIT_KILL_STEADY',burst:true};
    const higher=prev==null?[]:intent.availableNumbers.filter(n=>n>prev);
    const number=higher.length?pick(higher,'low'):pick(intent.availableNumbers,'low');
    return {number,skillIntent:false,reason:higher.length?'COMBO_BUILD':'COMBO_RESET_PATH',burst:false};
  }
  if(intent.characterId==='demon_swordsman'){
    const transformed=r.transformationActive===true;
    return {number:pick(intent.availableNumbers,'high'),skillIntent:false,reason:transformed?'DEMON_TRANSFORM_BURST':'DEVOUR_BUILD',burst:transformed};
  }
  if(intent.characterId==='berserker'){
    const frenzy=intent.hp>1;
    return {number:pick(intent.availableNumbers,'high'),skillIntent:false,reason:frenzy?'BLOOD_FRENZY_WINDOW':'BERSERKER_BASE',burst:frenzy};
  }
  return {number:pick(intent.availableNumbers,'high'),skillIntent:false,reason:'HIGH_CARD',burst:false};
}
export function planBurstTurn(intents,{seed='t02',contextKey='turn',optimized=true}={}){
  const clean=(intents||[]).filter(Boolean).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  const proposed=new Map(clean.map(i=>[i.playerId,preferred(i,optimized)]));
  const order=[...clean].sort((a,b)=>{
    const ab=proposed.get(a.playerId)?.burst?0:1,bb=proposed.get(b.playerId)?.burst?0:1;
    return ab-bb||a.seat-b.seat;
  });
  const used=new Set(),decisions=[];
  for(const intent of order){
    const pref=proposed.get(intent.playerId),alternates=[pref.number,...intent.availableNumbers.filter(n=>n!==pref.number).sort((a,b)=>b-a)];
    let number=alternates.find(n=>!used.has(n));
    if(number==null)number=alternates.sort((a,b)=>rank(seed,`${contextKey}:${intent.playerId}:${a}`)-rank(seed,`${contextKey}:${intent.playerId}:${b}`))[0];
    used.add(number);
    decisions.push({playerId:intent.playerId,characterId:intent.characterId,baseNumber:number,skillIntent:pref.skillIntent,skillData:null,reason:pref.reason,plannedBurst:pref.burst});
  }
  decisions.sort((a,b)=>clean.find(x=>x.playerId===a.playerId).seat-clean.find(x=>x.playerId===b.playerId).seat);
  return {policy:optimized?'BURST_OPTIMIZED':'STEADY_PLAY',decisions};
}
