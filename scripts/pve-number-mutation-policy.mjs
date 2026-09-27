import crypto from 'node:crypto';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const rank=(seed,key)=>Number.parseInt(hash(`${seed}|${key}`).slice(0,12),16);
const uniq=values=>[...new Set(values)].sort((a,b)=>a-b);

export function buildNumberMutationIntent(view,playerId){
  const player=(view.players||[]).find(p=>p.playerId===playerId);
  if(!player||player.status==='DOWNED')return null;
  if(view.privateCombat?.playerId!==playerId)throw new Error('T05 intent requires only the owner private projection.');
  const remaining=new Set(view.privateCombat?.remainingCardIds||[]);
  const availableNumbers=uniq((player.cardPool||[]).filter(card=>remaining.has(card.id)).map(card=>card.baseNumber));
  return {
    playerId,characterId:player.characterId,seat:player.seat,
    availableNumbers,
    publicResources:structuredClone(player.publicResources||{}),
    privateCycle:{
      cycleIndex:view.privateCombat?.cycleIndex||1,
      bloodCommandUsedCycle:view.privateCombat?.bloodCommandUsedCycle??null
    }
  };
}
function highest(numbers){return numbers.length?Math.max(...numbers):null;}
function frequencyTarget(impIntent,intents,seed,contextKey){
  const candidates=impIntent?.availableNumbers||[];
  if(!candidates.length)return null;
  const scored=candidates.map(number=>({
    number,
    count:intents.filter(x=>x.playerId!==impIntent.playerId&&x.availableNumbers.includes(number)).length,
    tie:rank(seed,`${contextKey}:target:${number}`)
  }));
  scored.sort((a,b)=>b.count-a.count||a.tie-b.tie||b.number-a.number);
  return scored[0].number;
}
function reverseMathPlan(intent,target){
  const mana=Number(intent.publicResources?.mana)||0;
  const spends=[4,2].filter(spend=>mana>=spend);
  const options=[];
  for(const base of intent.availableNumbers)for(const spend of spends){
    const magnitude=spend===4?2:1;
    for(const direction of [-1,1]){
      const final=base+direction*magnitude;
      if(final<0||final>6)continue;
      options.push({baseNumber:base,finalNumber:final,skillIntent:true,skillData:{direction,manaSpend:spend}});
    }
  }
  const exact=options.filter(x=>x.finalNumber===target).sort((a,b)=>b.skillData.manaSpend-a.skillData.manaSpend||b.baseNumber-a.baseNumber);
  if(exact.length)return exact[0];
  // Still exercise Reverse Math when mana exists, but keep it local and deterministic.
  options.sort((a,b)=>b.finalNumber-a.finalNumber||b.skillData.manaSpend-a.skillData.manaSpend||b.baseNumber-a.baseNumber);
  return options[0]||null;
}

export function planNumberMutationTurn(intents,{seed='t05',contextKey='turn'}={}){
  const clean=(intents||[]).filter(Boolean).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  const byClass=Object.fromEntries(clean.map(x=>[x.characterId,x]));
  const imp=byClass.imp,target=frequencyTarget(imp,clean,seed,contextKey);
  const decisions=[];
  for(const intent of clean){
    let plan={baseNumber:highest(intent.availableNumbers),skillIntent:false,skillData:null};
    if(target!=null&&intent.availableNumbers.includes(target))plan.baseNumber=target;
    if(intent.characterId==='mage'){
      const reverse=reverseMathPlan(intent,target);
      if(reverse)plan=reverse;
    }else if(intent.characterId==='vampire'){
      const thrallId=intent.publicResources?.thrallPlayerId;
      const targetIsActive=clean.some(other=>other.playerId===thrallId);
      const canCommand=Boolean(thrallId)&&targetIsActive&&intent.privateCycle.bloodCommandUsedCycle!==intent.privateCycle.cycleIndex;
      plan.skillIntent=canCommand;
    }else if(intent.characterId==='warrior'){
      const toughness=Number(intent.publicResources?.toughnessCharges)||0;
      plan.skillIntent=toughness>0&&target!=null&&plan.baseNumber===target;
    }
    decisions.push({playerId:intent.playerId,characterId:intent.characterId,targetNumber:target,...plan});
  }
  return {targetNumber:target,decisions};
}
