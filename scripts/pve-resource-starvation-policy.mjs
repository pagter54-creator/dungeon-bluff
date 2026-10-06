import crypto from 'node:crypto';

const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const seededIndex=(seed,key,length)=>Number.parseInt(hash(`${seed}|${key}`).slice(0,12),16)%length;

function ownCards(view,playerId){
  const player=(view.players||[]).find(p=>p.playerId===playerId);
  const remaining=new Set(view.privateCombat?.remainingCardIds||[]);
  return (player?.cardPool||[])
    .filter(card=>remaining.has(card.id))
    .sort((a,b)=>a.baseNumber-b.baseNumber||String(a.id).localeCompare(String(b.id)));
}
export function buildResourceStarvationDecision(view,playerId,{seed='t09',contextKey='turn'}={}){
  const player=(view.players||[]).find(p=>p.playerId===playerId);
  if(!player||player.status==='DOWNED'||view.privateCombat?.playerId!==playerId)return null;
  const cards=ownCards(view,playerId);
  if(!cards.length)return null;
  const min=cards[0].baseNumber;
  const tied=cards.filter(card=>card.baseNumber===min);
  const card=tied[seededIndex(seed,`${contextKey}:${playerId}:card:${min}`,tied.length)];
  let skillIntent=false,skillData=null;
  if(player.characterId==='warrior'){
    skillIntent=(Number(player.publicResources?.toughnessCharges)||0)>0;
  }else if(player.characterId==='mage'){
    const mana=Number(player.publicResources?.mana)||0;
    if(mana>=2){skillIntent=true;skillData={manaSpend:2};}
  }else if(player.characterId==='gunner'){
    skillIntent=player.publicResources?.fullBurstReady===true;
  }
  return {
    playerId,characterId:player.characterId,cardInstanceId:card.id,baseNumber:card.baseNumber,
    skillIntent,skillData,
    requestRevelation:player.characterId==='prophet'&&(Number(player.publicResources?.revelation)||0)>=(view.privateProphetState?.cost||6)&&!view.privateProphetState?.fragment&&!view.privateProphetState?.fragmentPending
  };
}

export function invalidResourceProbe(view,playerId){
  const player=(view.players||[]).find(p=>p.playerId===playerId);
  if(!player||player.status==='DOWNED'||view.privateCombat?.playerId!==playerId)return null;
  const card=ownCards(view,playerId)[0];
  if(player.characterId==='prophet'&&(Number(player.publicResources?.revelation)||0)<(view.privateProphetState?.cost||6)&&!view.privateProphetState?.fragment&&!view.privateProphetState?.fragmentPending){
    return {kind:'IMMEDIATE_SKILL',expectedCode:'INSUFFICIENT_RESOURCE'};
  }
  if(!card)return null;
  if(player.characterId==='warrior'&&(Number(player.publicResources?.toughnessCharges)||0)<1){
    return {kind:'SUBMIT',cardInstanceId:card.id,skillIntent:true,skillData:null,expectedCode:'INSUFFICIENT_RESOURCE'};
  }
  if(player.characterId==='mage'){
    const mana=Number(player.publicResources?.mana)||0;
    if(mana<2)return {kind:'SUBMIT',cardInstanceId:card.id,skillIntent:true,skillData:{manaSpend:2},expectedCode:'INSUFFICIENT_RESOURCE'};
    if(mana<4)return {kind:'SUBMIT',cardInstanceId:card.id,skillIntent:true,skillData:{manaSpend:4},expectedCode:'INSUFFICIENT_RESOURCE'};
  }
  if(player.characterId==='gunner'&&player.publicResources?.fullBurstReady!==true){
    return {kind:'SUBMIT',cardInstanceId:card.id,skillIntent:true,skillData:null,expectedCode:'SKILL_NOT_READY'};
  }
  return null;
}
