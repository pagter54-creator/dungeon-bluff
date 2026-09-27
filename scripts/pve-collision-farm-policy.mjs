import crypto from 'node:crypto';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const rank=(seed,key)=>Number.parseInt(hash(`${seed}|${key}`).slice(0,12),16);
const uniq=values=>[...new Set(values)].sort((a,b)=>a-b);

export function buildCollisionFarmIntent(view,playerId){
  const player=(view.players||[]).find(p=>p.playerId===playerId);
  if(!player||player.status==='DOWNED'||view.privateCombat?.playerId!==playerId)return null;
  const remaining=new Set(view.privateCombat?.remainingCardIds||[]);
  const availableNumbers=uniq((player.cardPool||[])
    .filter(card=>remaining.has(card.id))
    .map(card=>card.baseNumber));
  if(!availableNumbers.length)return null;
  return {
    playerId,characterId:player.characterId,seat:player.seat,
    availableNumbers,
    preferredCollisionNumbers:[...availableNumbers],
    publicResources:structuredClone(player.publicResources||{}),
    privateCycle:{
      cycleIndex:view.privateCombat?.cycleIndex||1,
      bloodCommandUsedCycle:view.privateCombat?.bloodCommandUsedCycle??null
    }
  };
}

function farmTarget(intents,seed,contextKey){
  const all=uniq(intents.flatMap(x=>x.availableNumbers));
  const scored=all.map(number=>{
    const members=intents.filter(x=>x.availableNumbers.includes(number));
    const classes=new Set(members.map(x=>x.characterId));
    const core=(classes.has('warrior')?3:0)+(classes.has('berserker')?3:0)+(classes.has('imp')?1:0)+(classes.has('vampire')?1:0);
    return {number,count:members.length,core,tie:rank(seed,`${contextKey}:farm-target:${number}`)};
  });
  scored.sort((a,b)=>b.count-a.count||b.core-a.core||a.tie-b.tie||b.number-a.number);
  return scored[0]?.number??null;
}

function alternateNumber(intent,target,used=new Set()){
  const candidates=intent.availableNumbers.filter(n=>n!==target).sort((a,b)=>{
    const au=used.has(a)?1:0,bu=used.has(b)?1:0;
    return au-bu||b-a;
  });
  return candidates[0]??target;
}

export function planCollisionFarmTurn(intents,{seed='t04',contextKey='turn'}={}){
  const clean=(intents||[]).filter(Boolean).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  const targetNumber=farmTarget(clean,seed,contextKey);
  const eligible=clean.filter(x=>x.availableNumbers.includes(targetNumber));
  const participantIds=new Set(eligible.map(x=>x.playerId));

  // Do not turn the stress policy into a synthetic "all four always collide" fixture.
  // When all four can farm the same number, deterministically let one non-core member peel off on alternating contexts.
  if(eligible.length===4&&rank(seed,`${contextKey}:peel`)%2===0){
    const peel=[...eligible]
      .filter(x=>x.characterId!=='warrior'&&x.characterId!=='berserker')
      .sort((a,b)=>(a.characterId==='vampire'?0:1)-(b.characterId==='vampire'?0:1)||b.seat-a.seat)[0];
    if(peel&&peel.availableNumbers.some(n=>n!==targetNumber))participantIds.delete(peel.playerId);
  }

  const usedAlternates=new Set();
  const decisions=clean.map(intent=>{
    const farms=participantIds.has(intent.playerId);
    const baseNumber=farms?targetNumber:alternateNumber(intent,targetNumber,usedAlternates);
    if(!farms)usedAlternates.add(baseNumber);
    let skillIntent=false;
    if(intent.characterId==='warrior'){
      skillIntent=farms&&(Number(intent.publicResources?.toughnessCharges)||0)>0&&participantIds.size>=2;
    }else if(intent.characterId==='vampire'){
      const thrallId=intent.publicResources?.thrallPlayerId;
      const targetActive=clean.some(x=>x.playerId===thrallId);
      const unused=intent.privateCycle.bloodCommandUsedCycle!==intent.privateCycle.cycleIndex;
      skillIntent=Boolean(thrallId)&&targetActive&&unused&&(rank(seed,`${contextKey}:vampire-command`)%2===0);
    }
    return {playerId:intent.playerId,characterId:intent.characterId,baseNumber,skillIntent,skillData:null,intentionalCollision:farms};
  });
  return {
    policy:'COLLISION_FARM',targetNumber,
    intentionalParticipantIds:[...participantIds].sort(),
    intentionalCollisionAttempt:participantIds.size>=2,
    decisions
  };
}

export function planCollisionSafeTurn(intents,{seed='t04',contextKey='turn'}={}){
  const clean=(intents||[]).filter(Boolean).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  const used=new Set(),decisions=[];
  for(const intent of clean){
    const ordered=[...intent.availableNumbers].sort((a,b)=>b-a||rank(seed,`${contextKey}:safe:${intent.playerId}:${a}`)-rank(seed,`${contextKey}:safe:${intent.playerId}:${b}`));
    const unique=ordered.find(n=>!used.has(n));
    const baseNumber=unique??ordered.sort((a,b)=>{
      const ac=decisions.filter(x=>x.baseNumber===a).length,bc=decisions.filter(x=>x.baseNumber===b).length;
      return ac-bc||b-a;
    })[0];
    used.add(baseNumber);
    decisions.push({playerId:intent.playerId,characterId:intent.characterId,baseNumber,skillIntent:false,skillData:null,intentionalCollision:false});
  }
  return {
    policy:'SAFE_PLAY',targetNumber:null,intentionalParticipantIds:[],
    intentionalCollisionAttempt:false,decisions
  };
}
