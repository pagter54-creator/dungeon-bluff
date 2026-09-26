import {choose} from './rng.js';
import {applyOwnedEffects} from './effects.js';

export function publishMonsterIntent(run){
  const c=run.combat;if(!c||c.monster.hp<=0)return null;
  const living=run.players.filter(p=>p.status!=='DOWNED');
  if(!living.length)return null;
  let intent;
  if(c.turn%3===0){
    const target=choose(run,living,`monster-target:${c.id}:${c.turn}`);
    intent={type:'DIRECT_DAMAGE',telegraphText:`${target.seat+1}번 자리 공격`,payload:{targetPlayerId:target.playerId,amount:1}};
  }else{
    intent={type:'CHARGE',telegraphText:'힘을 모으고 있다',payload:{}};
  }
  c.monster.intent=intent;return intent;
}
export function executeMonsterIntent(run){
  const c=run.combat,intent=c?.monster?.intent;if(!c||!intent)return [];
  const events=[];
  const damage=(player,amount)=>{if(!player||player.status==='DOWNED'||amount<=0)return;const armor=Math.max(0,Number(player.publicResources.armor)||0),blocked=Math.min(armor,amount);if(blocked)player.publicResources.armor=armor-blocked;const actual=Math.max(0,amount-blocked);if(actual)player.hp-=actual;events.push({type:'PLAYER_DAMAGED',playerId:player.playerId,amount:actual,blocked,hp:player.hp});applyOwnedEffects(run,'PLAYER_DAMAGED',{player,damage:{amount:actual},events});};
  if(intent.type==='DIRECT_DAMAGE'){
    const target=run.players.find(p=>p.playerId===intent.payload?.targetPlayerId&&p.status!=='DOWNED')||run.players.filter(p=>p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)[0];
    damage(target,Number(intent.payload?.amount)||0);
  }else if(intent.type==='AOE_DAMAGE'){
    const amount=Number(intent.payload?.amount)||0;
    for(const p of run.players.filter(p=>p.status!=='DOWNED'))damage(p,amount);
  }else if(intent.type==='HEAL'){
    const amount=Math.max(0,Number(intent.payload?.amount)||0);c.monster.hp=Math.min(c.monster.maxHp,c.monster.hp+amount);
  }else if(intent.type==='DEFEND'){
    c.monster.defense=Math.max(0,Number(intent.payload?.amount)||1);
  }else if(['APPLY_STATUS','SEAL_NUMBER','FORCE_RANDOM_CHOICE','CHARGE','SPECIAL'].includes(intent.type)){
    events.push({type:'MONSTER_INTENT_EXECUTED',intentType:intent.type,payload:intent.payload||{}});
  }else throw new Error('Unsupported monster intent.');
  return events;
}
