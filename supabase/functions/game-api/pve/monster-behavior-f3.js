import {choose} from './rng.js';
import {changeMonsterStack,tickMonsterCountdown} from './monster-primitives.js';
const state=run=>run.combat.monster.behaviorState,mechanic=run=>run.combat.monster.mechanic;
const living=run=>run.players.filter(p=>p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat||a.playerId.localeCompare(b.playerId));
const pick=(run,key)=>{const pool=living(run);return pool.length?choose(run,pool,'f3:'+key+':'+run.floor+':'+run.depth+':'+run.combat.turn+':'+run.combat.monster.id)?.playerId:null;};
const seat=(run,id)=>{const p=run.players.find(p=>p.playerId===id);return p?String(p.seat+1)+'번 자리':'없음';};
const band=n=>n<8?'0~7':n<16?'8~15':'16 이상';
const maskText={SILENCE:'활성 스킬 사용자는 피해 1',GREED:'단독 최고 유효 숫자 플레이어 피해 1',HUMILITY:'4~6 유효 공격 피해 -1',DISCORD:'중복 시 이번 턴 방어 +1'};
export function createF3State(k){
 const s={stacks:{},pendingHits:[],pendingAoe:false,validCount:0,collisionCount:0};
 if(k.type==='F3_SKILL_FEED')s.stacks.feed=0;
 if(k.type==='F3_ARCHIVIST')s.recent=[];
 if(k.type==='F3_EXECUTION'){s.countdown=k.length;s.progress=0;}
 if(k.type==='F3_AUDIT')s.stacks.audit=0;
 if(k.type==='F3_ADAPT'){s.history={high:[],count:[],band:[]};s.adaptation=null;s.misses=0;}
 if(k.type==='F3_MASK'){s.maskIndex=0;s.maskTurns=0;s.mask=k.masks[0];}
 return s;
}
export function f3Presentation(run){
 const m=run.combat?.monster;if(!m?.mechanic?.type?.startsWith('F3_'))return null;
 const s=m.behaviorState,k=m.mechanic,t=k.type,p={ruleSummary:m.ruleSummary,validCount:s.validCount||0,collisionCount:s.collisionCount||0};
 const parts=[];
 if(t==='F3_GREED')parts.push('탐욕 '+(s.greedActive?'활성 · 최고 숫자 반격':'비활성'));
 if(s.targetPlayerId)parts.push('표적 '+seat(run,s.targetPlayerId));
 if(t==='F3_TAX')parts.push('세금 회피 유효 합 '+k.requiredSum+' 이상 · 현재 '+(s.validSum||0));
 if(t==='F3_DUEL')parts.push('결투 승리 유효 최종 숫자 '+(k.threshold+1)+' 이상');
 if(t==='F3_CHOIR')parts.push('침묵 서로 다른 유효 숫자 '+k.requiredDistinct+'종 · 현재 '+(s.distinctCount||0));
 if(t==='F3_SKILL_FEED')parts.push('기술먹이 '+s.stacks.feed+'/'+k.threshold+(s.boostReady?' · 다음 공격 +1 대기':''));
 if(t==='F3_ARCHIVIST')parts.push('기록 숫자 '+(s.recorded??'없음')+' · 해당 유효 공격 피해 -1');
 if(t==='F3_APPRAISAL')parts.push('우대 숫자 '+(s.mode==='LOW'?'1~2':'4~6')+' · 그 밖의 피해 -1');
 if(t==='F3_EXECUTION')parts.push('처형 남은 턴 '+s.countdown+' · 유효 공격 '+s.progress+'/'+k.requiredHits);
 if(t==='F3_AUDIT')parts.push('감사 '+s.stacks.audit+'/'+k.threshold+' · 직전 유효 인원 '+(s.previousCount??'없음'));
 if(t==='F3_NULL')parts.push('이번 턴 약화 '+(s.nullRule==='ODD'?'홀수':'4~6')+' 유효 공격 피해 -1');
 if(t==='F3_ADAPT'){parts.push('관찰: 최고 유효 숫자 / 유효 인원 / 피해 구간');parts.push(s.adaptation?'학습 '+s.adaptation.kind+' '+s.adaptation.value+' · 적응 '+s.adaptation.stack+'/'+k.maximum+' · '+(s.adaptation.kind==='BAND'?'같은 피해 구간이면 표적 피해 1':'해당 유효 공격 피해 -1'):'적응 없음');parts.push('다른 전략 2턴이면 적응 -1 · 현재 '+s.misses+'/2');}
 if(t==='F3_MASK')parts.push('가면 '+s.mask+' · '+maskText[s.mask]+' · 변경까지 '+s.untilChange+'턴'+(s.late?' · 후반 매 턴 교체':''));
 p.statusText=parts.join(' · ');
 return p;
}
export function prepareF3Turn(run,intent){
 const m=run.combat.monster,k=mechanic(run),s=state(run),t=k?.type;
 if(!t?.startsWith('F3_'))return intent;
 s.pendingHits=[];s.pendingAoe=false;s.partyDamage=0;
 if(t==='F3_GREED')s.greedActive=run.combat.turn%2===1;
 if(t==='F3_TAX'){s.validSum=0;s.targetPlayerId=pick(run,'tax');}
 if(t==='F3_DUEL')s.targetPlayerId=pick(run,'duel');
 if(t==='F3_CHOIR')s.distinctCount=0;
 if(t==='F3_ARCHIVIST'){const counts=new Map();for(const row of s.recent.slice(-2))for(const n of row)counts.set(n,(counts.get(n)||0)+1);s.recorded=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??null;}
 if(t==='F3_APPRAISAL')s.mode=run.combat.turn%2?'LOW':'HIGH';
 if(t==='F3_EXECUTION'&&(!s.targetPlayerId||!living(run).some(p=>p.playerId===s.targetPlayerId)))s.targetPlayerId=pick(run,'execution');
 if(t==='F3_AUDIT')s.targetPlayerId=pick(run,'audit');
 if(t==='F3_NULL')s.nullRule=run.combat.turn%2?'ODD':'HIGH';
 if(t==='F3_MASK'){s.late=m.hp<=m.maxHp/2;if(run.combat.turn>1&&(s.late||s.maskTurns>=2)){s.maskIndex=(s.maskIndex+1)%k.masks.length;s.maskTurns=0;}s.mask=k.masks[s.maskIndex];s.maskTurns++;s.untilChange=s.late?1:3-s.maskTurns;}
 m.presentation=f3Presentation(run);intent.telegraphText+=' · '+m.presentation.statusText+' · '+m.ruleSummary;
 return intent;
}
export function applyF3CardRules(run,cards,events=[]){
 const m=run.combat.monster,k=mechanic(run),s=state(run),t=k?.type;
 if(!t?.startsWith('F3_'))return;
 const valid=cards.filter(c=>c.valid),nums=valid.map(c=>c.finalNumber),high=nums.length?Math.max(...nums):null,highest=valid.filter(c=>c.finalNumber===high);
 s.validCount=valid.length;s.collisionCount=new Set(cards.filter(c=>c.invalidReason==='COLLISION').map(c=>c.finalNumber)).size;
 const penalty=c=>c.monsterDamagePenalty=(c.monsterDamagePenalty||0)+1;
 if(t==='F3_GREED'&&s.greedActive&&highest.length===1)s.pendingHits.push(highest[0].playerId);
 if(t==='F3_TAX')s.validSum=nums.reduce((a,b)=>a+b,0);
 if(t==='F3_DUEL'&&!valid.some(c=>c.playerId===s.targetPlayerId&&c.finalNumber>k.threshold))s.pendingHits.push(s.targetPlayerId);
 if(t==='F3_CHOIR'){s.distinctCount=new Set(nums).size;s.pendingAoe=s.distinctCount<k.requiredDistinct;}
 if(t==='F3_SKILL_FEED'){const used=Object.values(run.combat.turnSubmissions).filter(x=>x.skillIntent).length;changeMonsterStack(s,'feed',used,{maximum:3});if(s.stacks.feed>=k.threshold){s.boostReady=true;s.stacks.feed=0;}if(used)events.push({type:'SKILL_FEED',used,stack:s.stacks.feed});}
 if(t==='F3_ARCHIVIST'){valid.filter(c=>c.finalNumber===s.recorded).forEach(penalty);s.recent.push(nums);s.recent=s.recent.slice(-2);}
 if(t==='F3_APPRAISAL')valid.filter(c=>s.mode==='LOW'?c.finalNumber>2:c.finalNumber<4).forEach(penalty);
 if(t==='F3_EXECUTION')s.progress+=valid.length;
 if(t==='F3_AUDIT'){changeMonsterStack(s,'audit',s.previousCount===valid.length?1:-1,{maximum:3});s.previousCount=valid.length;if(s.stacks.audit>=k.threshold){s.pendingHits.push(s.targetPlayerId);s.stacks.audit=0;}}
 if(t==='F3_NULL')valid.filter(c=>s.nullRule==='ODD'?c.finalNumber%2===1:c.finalNumber>=4).forEach(penalty);
 if(t==='F3_ADAPT'){s.currentHigh=high;s.currentCount=valid.length;if(s.adaptation?.kind==='HIGH'&&high===s.adaptation.value)highest.forEach(penalty);if(s.adaptation?.kind==='COUNT'&&valid.length===s.adaptation.value)valid.forEach(penalty);}
 if(t==='F3_MASK'){if(s.mask==='SILENCE')for(const x of Object.values(run.combat.turnSubmissions).filter(x=>x.skillIntent))s.pendingHits.push(x.playerId);if(s.mask==='GREED'&&highest.length===1)s.pendingHits.push(highest[0].playerId);if(s.mask==='HUMILITY')valid.filter(c=>c.finalNumber>=4).forEach(penalty);if(s.mask==='DISCORD'&&s.collisionCount)m.defense=Math.max(1,m.defense||0);}
 m.presentation=f3Presentation(run);
}
export function recordF3DamageBatch(run,totalDamage){
 const m=run.combat.monster,s=state(run),k=mechanic(run),t=k?.type;
 if(!t?.startsWith('F3_'))return;
 s.partyDamage=totalDamage;
 if(t==='F3_EXECUTION'&&tickMonsterCountdown(s).ready)s.executionReady=true;
 if(t==='F3_ADAPT'){
  const current={HIGH:s.currentHigh,COUNT:s.currentCount,BAND:band(totalDamage)};
  if(s.adaptation?.kind==='BAND'&&current.BAND===s.adaptation.value){const target=pick(run,'adapt');if(target)s.pendingHits.push(target);}
  let learned=null;
  for(const [kind,key] of [['HIGH','high'],['COUNT','count'],['BAND','band']]){
   const value=current[kind],prev=s.history[key].slice(-2);
   if(value!=null&&prev.includes(value)&&(!learned||s.adaptation?.kind===kind&&s.adaptation.value===value))learned={kind,value};
   s.history[key]=[...prev,value].slice(-3);
  }
  if(learned&&(!s.adaptation||s.adaptation.kind===learned.kind&&s.adaptation.value===learned.value)){s.adaptation=s.adaptation?{...s.adaptation,stack:Math.min(k.maximum,s.adaptation.stack+1)}:{...learned,stack:1};s.misses=0;}
  else if(s.adaptation&&++s.misses>=2){s.adaptation.stack=Math.max(0,s.adaptation.stack-1);s.misses=0;if(!s.adaptation.stack)s.adaptation=null;}
 }
 m.presentation=f3Presentation(run);
}
export function prepareF3Action(run,action){const s=state(run);if(mechanic(run)?.type==='F3_SKILL_FEED'&&s.boostReady&&['DIRECT_DAMAGE','AOE_DAMAGE'].includes(action.type)){action.payload.amount=(Number(action.payload.amount)||0)+1;s.boostReady=false;}return action;}
export function resolveF3AfterDamage(run,events,applyDamage){
 const m=run.combat.monster,s=state(run),k=mechanic(run),t=k?.type;
 if(!t?.startsWith('F3_')||m.hp<=0||s.resolvedTurn===run.combat.turn)return;
 s.resolvedTurn=run.combat.turn;
 if(t==='F3_TAX'&&s.validSum<k.requiredSum){const p=run.players.find(p=>p.playerId===s.targetPlayerId);if(p){const amount=Math.min(1,Math.max(0,p.runGold||0));p.runGold-=amount;events.push({type:'TAX_COLLECTED',playerId:p.playerId,amount});}}
 if(t==='F3_EXECUTION'&&s.executionReady){if(s.progress<k.requiredHits){const p=run.players.find(p=>p.playerId===s.targetPlayerId);if(p)events.push(...applyDamage(run,p,2,'DIRECT'));events.push({type:'EXECUTION_FAILED',progress:s.progress});}else events.push({type:'EXECUTION_CANCELLED',progress:s.progress});s.countdown=k.length;s.progress=0;s.executionReady=false;s.targetPlayerId=null;}
 if(s.pendingAoe)for(const p of living(run))events.push(...applyDamage(run,p,1,'AOE'));
 for(const id of s.pendingHits){const p=run.players.find(p=>p.playerId===id);if(p)events.push(...applyDamage(run,p,1,'DIRECT'));}
 s.pendingHits=[];s.pendingAoe=false;m.presentation=f3Presentation(run);
}
