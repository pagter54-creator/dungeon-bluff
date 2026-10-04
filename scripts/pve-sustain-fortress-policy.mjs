import crypto from 'node:crypto';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const rank=(seed,key)=>Number.parseInt(hash(`${seed}|${key}`).slice(0,12),16);
const uniq=values=>[...new Set(values)].sort((a,b)=>a-b);

export function buildSustainIntent(view,playerId){
  const player=(view.players||[]).find(p=>p.playerId===playerId);
  if(!player||player.status==='DOWNED'||view.privateCombat?.playerId!==playerId)return null;
  const remaining=new Set(view.privateCombat?.remainingCardIds||[]);
  const availableNumbers=uniq((player.cardPool||[]).filter(card=>remaining.has(card.id)).map(card=>card.baseNumber));
  if(!availableNumbers.length)return null;
  return {
    playerId,characterId:player.characterId,seat:player.seat,hp:player.hp,maxHp:player.maxHp,
    availableNumbers,
    publicResources:structuredClone(player.publicResources||{}),
    monsterIntent:view.combat?.monster?.intent?structuredClone(view.combat.monster.intent):null
  };
}

function chooseSafe(intents,seed,contextKey){
  const used=new Set(),out=new Map();
  for(const intent of [...intents].sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId))){
    const ordered=[...intent.availableNumbers].sort((a,b)=>{
      const au=used.has(a)?1:0,bu=used.has(b)?1:0;
      return au-bu||b-a||rank(seed,`${contextKey}:${intent.playerId}:${a}`)-rank(seed,`${contextKey}:${intent.playerId}:${b}`);
    });
    const n=ordered[0];out.set(intent.playerId,n);used.add(n);
  }
  return out;
}
function shared(a,b){return a.availableNumbers.filter(n=>b.availableNumbers.includes(n)).sort((x,y)=>y-x);}
function wounded(intents,excludeId=null){
  return intents.filter(x=>x.playerId!==excludeId&&x.hp>0&&x.hp<x.maxHp).sort((a,b)=>a.hp-b.hp||a.seat-b.seat);
}
function magePair(mage,targets,mana){
  for(const target of targets){
    for(const targetNumber of [...target.availableNumbers].sort((a,b)=>b-a)){
      for(const spend of [2,4]){
        if(mana<spend)continue;
        const delta=spend===4?2:1,base=targetNumber-delta;
        if(mage.availableNumbers.includes(base))return {target,targetNumber,mageBase:base,manaSpend:spend};
      }
    }
  }
  return null;
}

export function planSustainTurn(intents,{seed='t03',contextKey='turn',optimized=true}={}){
  const clean=(intents||[]).filter(Boolean).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  const choices=chooseSafe(clean,seed,contextKey);
  const reasons=new Map(clean.map(x=>[x.playerId,'SAFE_DAMAGE']));
  const skills=new Map(clean.map(x=>[x.playerId,{skillIntent:false,skillData:null,requestTransfusion:false}]));
  const byClass=id=>clean.find(x=>x.characterId===id);
  const vampire=byClass('vampire'),mage=byClass('mage'),warrior=byClass('warrior'),berserker=byClass('berserker');
  const hurt=wounded(clean);

  // Blood healing is automatic; the policy submits cards without manual Transfusion.

  if(optimized&&mage&&hurt.length){
    const mana=Number(mage.publicResources?.mana)||0;
    const pair=magePair(mage,wounded(clean,mage.playerId),mana);
    if(pair){
      choices.set(mage.playerId,pair.mageBase);
      choices.set(pair.target.playerId,pair.targetNumber);
      skills.set(mage.playerId,{skillIntent:true,skillData:{manaSpend:pair.manaSpend},requestTransfusion:false});
      reasons.set(mage.playerId,'WHITE_MAGIC');
      reasons.set(pair.target.playerId,'WHITE_MAGIC_TARGET');
    }
  }

  const occupiedCollisionNumbers=new Set();
  for(const a of clean)for(const b of clean)if(a.seat<b.seat&&choices.get(a.playerId)===choices.get(b.playerId))occupiedCollisionNumbers.add(choices.get(a.playerId));

  if(optimized&&warrior&&(Number(warrior.publicResources?.toughnessCharges)||0)>0){
    const directTargetId=warrior.monsterIntent?.type==='DIRECT_DAMAGE'?warrior.monsterIntent?.payload?.targetPlayerId:null;
    const targets=wounded(clean,warrior.playerId).sort((a,b)=>{
      const ap=a.playerId===directTargetId?0:1,bp=b.playerId===directTargetId?0:1;
      return ap-bp||a.hp-b.hp||a.seat-b.seat;
    });
    for(const target of targets){
      const common=shared(warrior,target).find(n=>!occupiedCollisionNumbers.has(n));
      if(common==null)continue;
      choices.set(warrior.playerId,common);choices.set(target.playerId,common);
      skills.set(warrior.playerId,{skillIntent:true,skillData:null,requestTransfusion:false});
      reasons.set(warrior.playerId,'GUARDIAN_WALL');reasons.set(target.playerId,'GUARDIAN_TARGET');
      occupiedCollisionNumbers.add(common);break;
    }
  }

  if(optimized&&berserker&&berserker.hp<berserker.maxHp&&!reasons.get(berserker.playerId).includes('TARGET')){
    const partners=clean.filter(x=>x.playerId!==berserker.playerId&&reasons.get(x.playerId)==='SAFE_DAMAGE').sort((a,b)=>a.seat-b.seat);
    for(const target of partners){
      const common=shared(berserker,target).find(n=>!occupiedCollisionNumbers.has(n));
      if(common==null)continue;
      choices.set(berserker.playerId,common);choices.set(target.playerId,common);
      reasons.set(berserker.playerId,'BERSERKER_COLLISION_HEAL');reasons.set(target.playerId,'BERSERKER_COLLISION_PARTNER');
      occupiedCollisionNumbers.add(common);break;
    }
  }

  if(!optimized&&warrior&&(Number(warrior.publicResources?.toughnessCharges)||0)>0){
    const targetId=warrior.monsterIntent?.type==='DIRECT_DAMAGE'?warrior.monsterIntent?.payload?.targetPlayerId:null;
    const target=clean.find(x=>x.playerId===targetId&&x.playerId!==warrior.playerId&&x.hp<=1);
    if(target){
      const common=shared(warrior,target)[0];
      if(common!=null){
        choices.set(warrior.playerId,common);choices.set(target.playerId,common);
        skills.set(warrior.playerId,{skillIntent:true,skillData:null,requestTransfusion:false});
        reasons.set(warrior.playerId,'EMERGENCY_GUARD');reasons.set(target.playerId,'EMERGENCY_GUARD_TARGET');
      }
    }
  }

  return {
    policy:optimized?'SUSTAIN_OPTIMIZED':'NORMAL_PLAY',
    decisions:clean.map(intent=>({
      playerId:intent.playerId,characterId:intent.characterId,baseNumber:choices.get(intent.playerId),
      ...skills.get(intent.playerId),reason:reasons.get(intent.playerId)
    }))
  };
}
