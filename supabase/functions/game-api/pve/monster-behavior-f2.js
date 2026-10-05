import {patternRequirement,adaptivePresentation,adaptiveRuleSummary} from './adaptive-pattern.js';
import {choose} from './rng.js';
import {trackPlayerNumber,changeMonsterStack,checkPartyDamage} from './monster-primitives.js';

const living=run=>run.players.filter(p=>p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
const stateOf=run=>run.combat?.monster?.behaviorState;
const mechOf=run=>run.combat?.monster?.mechanic;
const pick=(run,pool,key)=>pool.length?choose(run,pool,`f2:${key}:${run.floor}:${run.depth}:${run.combat.turn}:${run.combat.monster.id}`):null;
const counter=(state,key,id)=>state[key]?.[id]||0;
function addCounter(state,key,id,threshold,events,label){
  state[key]||={};state[key][id]=counter(state,key,id)+1;
  events.push({type:label,playerId:id,stack:state[key][id]});
  if(state[key][id]>=threshold){state.pendingHits.push(id);state[key][id]=0;}
}
export function createF2State(mechanic){
  const state={stacks:{},pendingHits:[],validCount:0,collisionCount:0};
  if(mechanic.type==='F2_GROWTH')state.stacks.growth=0;
  if(mechanic.type==='F2_PROPHECY')state.curseByPlayer={};
  if(mechanic.type==='F2_SPORE')state.sporeByPlayer={};
  if(mechanic.type==='F2_HYDRA')state.heads=mechanic.heads;
  if(mechanic.type==='F2_MOON')state.phase='MIN';
  if(mechanic.type==='F2_CORRUPTION'){state.lastNumberByPlayer={};state.corruptionByPlayer={};}
  return state;
}
export function f2Presentation(run){
  const m=run.combat?.monster,s=stateOf(run),k=mechOf(run);
  if(!m||!k||!k.type.startsWith('F2_'))return null;
  const p={...adaptivePresentation(run),ruleSummary:adaptiveRuleSummary(run),validCount:s.validCount||0,collisionCount:s.collisionCount||0};
  for(const field of ['currentDangerNumber','nextDangerNumber','copiedNumber','flameMode','thornsActive','chaosRule','heads','targetPlayerId','linkedPlayerIds','phase','threshold','partyDamage','minimumDamage','maximumDamage','growth'])if(s[field]!=null)p[field]=structuredClone(s[field]);
  if(s.stacks?.growth!=null)p.growth=s.stacks.growth;
  if(s.curseByPlayer)p.curseByPlayer={...s.curseByPlayer};
  if(s.sporeByPlayer)p.sporeByPlayer={...s.sporeByPlayer};
  if(s.corruptionByPlayer)p.corruptionByPlayer={...s.corruptionByPlayer};
  if(s.lastNumberByPlayer)p.lastValidNumberByPlayer={...s.lastNumberByPlayer};
  const parts=[];
  if(p.currentDangerNumber!=null)parts.push(`이번 턴 저주 ${p.currentDangerNumber}`);
  if(p.nextDangerNumber!=null)parts.push(`다음 턴 저주 ${p.nextDangerNumber}`);
  if(p.copiedNumber!=null)parts.push(`복제 숫자 ${p.copiedNumber}`);
  if(p.flameMode)parts.push(`늪불 ${p.flameMode==='LOW'?'낮음 · 4~6 위험':'높음 · 1~3 위험'}`);
  if(p.thornsActive!=null)parts.push(`가시 ${p.thornsActive?'활성 · 단독 최고 유효 숫자 반격':'비활성'}`);
  if(p.chaosRule)parts.push(`혼돈 ${p.chaosRule==='ODD'?'짝수 카드 피해 -1':p.chaosRule==='LOW'?'4~6 카드 피해 -1':`유효 숫자 합 ${patternRequirement(run,'requiredSum')} 미만이면 표적 피해 1`}`);
  if(p.heads!=null)parts.push(`머리 ${p.heads} · 서로 다른 유효 숫자 ${patternRequirement(run,'requiredDistinct')}종이면 -1`);
  if(p.growth!=null)parts.push(`성장 ${p.growth} · 피해 ${patternRequirement(run,'minimumDamage')} 이상이면 방지`);
  if(p.targetPlayerId){const target=run.players.find(player=>player.playerId===p.targetPlayerId);parts.push(`표적 ${target?`${target.seat+1}번 자리`:p.targetPlayerId}`);}
  if(p.linkedPlayerIds)parts.push(`실타래 ${p.linkedPlayerIds.map(id=>{const player=run.players.find(p=>p.playerId===id);return player?`${player.seat+1}번 자리`:id}).join(' / ')} · ${s.linkReady?'이번 턴 서로 다른 숫자로 끊기':'다음 턴 서로 다른 숫자로 끊기'}`);
  if(p.phase)parts.push(`${p.phase==='MIN'?'만월 · 최소':'신월 · 최대'} ${p.threshold} · 현재 ${p.partyDamage||0}`);
  for(const player of run.players){const n=player.seat+1;
    if(p.corruptionByPlayer||p.lastValidNumberByPlayer)parts.push(`${n}번 직전 ${p.lastValidNumberByPlayer?.[player.playerId]??'없음'} · 오염 ${p.corruptionByPlayer?.[player.playerId]||0}/3`);
    if(p.sporeByPlayer)parts.push(`${n}번 포자 ${p.sporeByPlayer[player.playerId]||0}/2`);
    if(p.curseByPlayer)parts.push(`${n}번 저주 ${p.curseByPlayer[player.playerId]||0}/2`);
  }
  p.statusText=parts.join(' · ');
  return p;
}
export function prepareF2Turn(run,intent){
  const m=run.combat.monster,s=stateOf(run),k=mechOf(run),type=k?.type;
  if(!type?.startsWith('F2_'))return intent;
  s.pendingHits=[];s.chaosFailure=false;
  if(type==='F2_PROPHECY'){
    s.currentDangerNumber=s.nextDangerNumber??null;
    s.nextDangerNumber=pick(run,[1,2,3,4,5,6],'prophecy-number');
  }
  if(type==='F2_LEECH'){
    s.targetPlayerId=pick(run,living(run),'leech-target')?.playerId||null;
    s.targetBlocked=false;
  }
  if(type==='F2_THREAD'){
    const pool=living(run),first=pick(run,pool,'thread-first');
    const second=pick(run,pool.filter(p=>p.playerId!==first?.playerId),'thread-second');
    if(!s.linkedPlayerIds){s.linkedPlayerIds=first&&second?[first.playerId,second.playerId]:null;s.linkReady=false;}
  }
  if(type==='F2_FLAME')s.flameMode=run.combat.turn%2?'LOW':'HIGH';
  if(type==='F2_THORNS')s.thornsActive=run.combat.turn%2===1;
  if(type==='F2_CHAOS')s.chaosRule=pick(run,['ODD','LOW','VALID_SUM'],'chaos-rule');
  if(type==='F2_MOON'){s.phase=run.combat.turn%2?'MIN':'MAX';s.threshold=s.phase==='MIN'?patternRequirement(run,'minimumDamage'):k.maximumDamage;s.partyDamage=0;s.minimumDamage=patternRequirement(run,'minimumDamage');s.maximumDamage=k.maximumDamage;}
  if(type==='F2_HYDRA')s.requiredDistinct=patternRequirement(run,'requiredDistinct');
  const p=f2Presentation(run);m.presentation=p;
  intent.telegraphText+=p?.statusText?` · ${p.statusText}`:'';
  intent.telegraphText+=` · ${adaptiveRuleSummary(run)}`;
  return intent;
}
export function applyF2CardRules(run,cards,events){
  const m=run.combat.monster,s=stateOf(run),k=mechOf(run),type=k?.type;
  if(!type?.startsWith('F2_'))return;
  const valid=cards.filter(c=>c.valid);
  s.validCount=valid.length;
  s.collisionCount=new Set(cards.filter(c=>c.invalidReason==='COLLISION').map(c=>c.finalNumber)).size;
  if(type==='F2_PROPHECY'&&s.currentDangerNumber!=null)for(const c of cards.filter(c=>c.finalNumber===s.currentDangerNumber))addCounter(s,'curseByPlayer',c.playerId,k.threshold,events,'CURSE_APPLIED');
  if(type==='F2_SPORE')for(const c of cards.filter(c=>c.invalidReason==='COLLISION'))addCounter(s,'sporeByPlayer',c.playerId,k.threshold,events,'SPORE_APPLIED');
  if(type==='F2_LEECH')s.targetBlocked=valid.some(c=>c.playerId===s.targetPlayerId);
  if(type==='F2_COPY'){
    for(const c of valid.filter(c=>c.finalNumber===s.copiedNumber))c.monsterDamagePenalty=(c.monsterDamagePenalty||0)+k.damagePenalty;
    s.copiedNumber=valid.length?[...valid].sort((a,b)=>a.finalNumber-b.finalNumber||a.playerId.localeCompare(b.playerId))[0].finalNumber:null;
  }
  if(type==='F2_FLAME')for(const c of cards)if(s.flameMode==='LOW'?c.finalNumber>=4:c.finalNumber<=3)s.pendingHits.push(c.playerId);
  if(type==='F2_THORNS'&&s.thornsActive&&valid.length){
    const high=Math.max(...valid.map(c=>c.finalNumber)),highest=valid.filter(c=>c.finalNumber===high);
    if(highest.length===1)s.pendingHits.push(highest[0].playerId);
  }
  if(type==='F2_CHAOS'){
    if(s.chaosRule==='ODD')for(const c of valid.filter(c=>c.finalNumber%2===0))c.monsterDamagePenalty=(c.monsterDamagePenalty||0)+1;
    if(s.chaosRule==='LOW')for(const c of valid.filter(c=>c.finalNumber>=4))c.monsterDamagePenalty=(c.monsterDamagePenalty||0)+1;
    if(s.chaosRule==='VALID_SUM')s.chaosFailure=valid.reduce((sum,c)=>sum+c.finalNumber,0)<patternRequirement(run,'requiredSum');
  }
  if(type==='F2_HYDRA'&&new Set(valid.map(c=>c.finalNumber)).size>=patternRequirement(run,'requiredDistinct')&&s.heads>0){s.heads--;events.push({type:'HYDRA_HEAD_REMOVED',heads:s.heads});}
  if(type==='F2_THREAD'&&s.linkedPlayerIds&&s.linkReady){
    const [a,b]=s.linkedPlayerIds.map(id=>cards.find(c=>c.playerId===id));
    if(a&&b&&a.finalNumber===b.finalNumber)s.pendingHits.push(a.playerId,b.playerId);
    events.push({type:'THREAD_RESOLVED',linkedPlayerIds:s.linkedPlayerIds,broken:Boolean(a&&b&&a.finalNumber!==b.finalNumber)});
    s.linkedPlayerIds=null;
  }else if(type==='F2_THREAD'&&s.linkedPlayerIds)s.linkReady=true;
  if(type==='F2_CORRUPTION')for(const c of valid){
    const outcome=trackPlayerNumber(s,c.playerId,c.finalNumber);
    if(outcome.repeated)addCounter(s,'corruptionByPlayer',c.playerId,k.threshold,events,'CORRUPTION_APPLIED');
  }
  m.presentation=f2Presentation(run);
}
export function recordF2DamageBatch(run,totalDamage){
  const s=stateOf(run),k=mechOf(run),type=k?.type;
  if(!type?.startsWith('F2_'))return;
  if(type==='F2_GROWTH'){
    if(!checkPartyDamage(totalDamage,{minimum:patternRequirement(run,'minimumDamage')}).passed)changeMonsterStack(s,'growth',1,{maximum:3});
  }
  if(type==='F2_MOON'){
    s.partyDamage=totalDamage;
    s.thresholdPassed=checkPartyDamage(totalDamage,s.phase==='MIN'?{minimum:patternRequirement(run,'minimumDamage')}:{maximum:k.maximumDamage}).passed;
  }
  run.combat.monster.presentation=f2Presentation(run);
}
export function prepareF2Action(run,action){
  const s=stateOf(run),type=mechOf(run)?.type;
  if(type==='F2_GROWTH'&&action.type==='DIRECT_DAMAGE'&&s.stacks.growth>=2){action.payload.amount=(Number(action.payload.amount)||0)+1;s.stacks.growth=0;}
  if(type==='F2_HYDRA'&&action.type==='DIRECT_DAMAGE'&&s.heads>=2)action.payload.amount=(Number(action.payload.amount)||0)+1;
  return action;
}
export function resolveF2AfterDamage(run,events,applyDamage){
  const m=run.combat.monster,s=stateOf(run),k=mechOf(run),type=k?.type;
  if(!type?.startsWith('F2_')||m.hp<=0||s.resolvedPenaltyTurn===run.combat.turn)return;
  s.resolvedPenaltyTurn=run.combat.turn;
  if(type==='F2_LEECH'&&!s.targetBlocked){
    const target=run.players.find(p=>p.playerId===s.targetPlayerId);
    events.push(...applyDamage(run,target,1,'DIRECT'));
    m.hp=Math.min(m.maxHp,m.hp+k.heal);
    events.push({type:'LEECH_HEALED',amount:k.heal,hp:m.hp});
  }
  if(type==='F2_MOON'&&!s.thresholdPassed){
    const target=pick(run,living(run),'moon-penalty');
    if(target)events.push(...applyDamage(run,target,1,'DIRECT'));
    events.push({type:'MOON_THRESHOLD_FAILED',phase:s.phase,threshold:s.threshold,partyDamage:s.partyDamage});
  }
  if(type==='F2_CHAOS'&&s.chaosFailure){
    const target=pick(run,living(run),'chaos-penalty');
    if(target)events.push(...applyDamage(run,target,1,'DIRECT'));
  }
  for(const id of s.pendingHits||[]){
    const target=run.players.find(p=>p.playerId===id);
    if(target)events.push(...applyDamage(run,target,1,'DIRECT'));
  }
  s.pendingHits=[];
  m.presentation=f2Presentation(run);
}
