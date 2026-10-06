import crypto from 'node:crypto';

const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const rank=(seed,key)=>Number.parseInt(hash(seed+'|'+key).slice(0,12),16);
const uniq=xs=>[...new Set(xs)].sort((a,b)=>a-b);

function publicSpentCandidates(view,actorId){
  const result=view.combat?.publicTurnResult;
  if(!result)return [];
  const reset=new Set((result.events||[]).filter(e=>e.type==='CYCLE_RESET').map(e=>e.playerId));
  const used=[...new Set((result.cards||[]).map(c=>c.playerId))];
  const players=new Map((view.players||[]).map(p=>[p.playerId,p]));
  return used
    .filter(pid=>pid!==actorId&&!reset.has(pid)&&players.get(pid)?.status!=='DOWNED')
    .map(pid=>({playerId:pid,characterId:players.get(pid)?.characterId,seat:players.get(pid)?.seat??999}))
    .sort((a,b)=>{
      const pri=id=>id==='gunner'?0:id==='twins'?1:id==='demon_swordsman'?2:3;
      return pri(a.characterId)-pri(b.characterId)||a.seat-b.seat||a.playerId.localeCompare(b.playerId);
    });
}
export function buildRecoveryIntent(view,playerId){
  const p=(view.players||[]).find(x=>x.playerId===playerId);
  if(!p||p.status==='DOWNED'||view.privateCombat?.playerId!==playerId)return null;
  const remainingIds=new Set(view.privateCombat?.remainingCardIds||[]);
  const legalCards=(p.cardPool||[]).filter(c=>remainingIds.has(c.id)).filter(c=>p.characterId!=='twins'||c.baseNumber%2===(p.publicResources?.parity||0));
  const availableNumbers=uniq(legalCards.map(c=>c.baseNumber));
  if(!availableNumbers.length)return null;
  return {
    playerId,characterId:p.characterId,seat:p.seat,hp:p.hp,maxHp:p.maxHp,
    availableNumbers,fullDeckNumbers:uniq((p.cardPool||[]).map(c=>c.baseNumber)),
    remainingCount:remainingIds.size,spentCount:(view.privateCombat?.spentCardIds||[]).length,
    cycleIndex:view.privateCombat?.cycleIndex||1,
    publicResources:structuredClone(p.publicResources||{}),
    fragmentOccupied:Boolean(view.privateProphetState?.fragment||view.privateProphetState?.fragmentPending),fateCandidates:[]
  };
}
function effectiveNumbers(intent,requestAcrobatics){
  if(intent.characterId!=='twins'||!requestAcrobatics)return [...intent.availableNumbers];
  const parity=1-(Number(intent.publicResources?.parity)||0);
  return intent.fullDeckNumbers.filter(n=>n%2===parity);
}
export function planRecoveryTurn(intents,{seed='t06',contextKey='turn',turn=1,optimized=true}={}){
  const clean=(intents||[]).filter(Boolean).sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
  const byClass=id=>clean.find(x=>x.characterId===id);
  const prophet=byClass('prophet'),gunner=byClass('gunner'),twins=byClass('twins'),demon=byClass('demon_swordsman');
  const requestAcrobatics=Boolean(twins?.publicResources?.acrobaticsReady&&(optimized?twins.spentCount>=1:twins.spentCount>=3));
  const acroFirst=Boolean(optimized&&requestAcrobatics&&turn%2===0);
  const immediateActions=[];
  const fateAction=prophet&&(Number(prophet.publicResources?.revelation)||0)>=6&&!prophet.fragmentOccupied?{kind:'PAST_FRAGMENT',playerId:prophet.playerId}:null;
  const acroAction=requestAcrobatics?{kind:'ACROBATICS',playerId:twins.playerId}:null;
  if(acroFirst){if(acroAction)immediateActions.push(acroAction);if(fateAction)immediateActions.push(fateAction);}
  else{if(fateAction)immediateActions.push(fateAction);if(acroAction)immediateActions.push(acroAction);}

  const skillIntent=new Map();
  if(gunner)skillIntent.set(gunner.playerId,Boolean(gunner.publicResources?.fullBurstReady&&(optimized||gunner.remainingCount<=2)));
  if(demon)skillIntent.set(demon.playerId,Boolean(demon.publicResources?.ghostSlashReady&&(optimized||(Number(demon.publicResources?.ghostSlashLevel)||0)>0)));

  const choices=new Map(),used=new Set();
  for(const intent of clean){
    const nums=effectiveNumbers(intent,requestAcrobatics&&intent.playerId===twins?.playerId);
    const ordered=[...nums].sort((a,b)=>b-a||rank(seed,contextKey+':'+intent.playerId+':'+a)-rank(seed,contextKey+':'+intent.playerId+':'+b));
    const n=ordered.find(x=>!used.has(x))??ordered[0];
    choices.set(intent.playerId,n);used.add(n);
  }

  let revelationCollisionTargetId=null;
  if(optimized&&prophet&&(Number(prophet.publicResources?.revelation)||0)<6){
    const candidates=[demon,twins,gunner].filter(Boolean);
    for(const target of candidates){
      const pNums=effectiveNumbers(prophet,false),tNums=effectiveNumbers(target,requestAcrobatics&&target===twins);
      const common=pNums.filter(n=>tNums.includes(n)).sort((a,b)=>b-a);
      if(!common.length)continue;
      const n=common[0];choices.set(prophet.playerId,n);choices.set(target.playerId,n);revelationCollisionTargetId=target.playerId;break;
    }
  }

  return {
    policy:optimized?'RECOVERY_OPTIMIZED':'STEADY_PLAY',
    immediateActions,
    revelationCollisionTargetId,
    decisions:clean.map(intent=>({
      playerId:intent.playerId,characterId:intent.characterId,
      baseNumber:choices.get(intent.playerId),
      skillIntent:Boolean(skillIntent.get(intent.playerId)),
      skillData:null,
      reason:intent.characterId==='gunner'&&skillIntent.get(intent.playerId)?'FULL_BURST':
        intent.characterId==='demon_swordsman'&&skillIntent.get(intent.playerId)?'GHOST_SLASH':
        intent.playerId===revelationCollisionTargetId?'REVELATION_COLLISION_PARTNER':
        intent.characterId==='prophet'&&revelationCollisionTargetId?'REVELATION_COLLISION':'NORMAL_PLAY'
    }))
  };
}
