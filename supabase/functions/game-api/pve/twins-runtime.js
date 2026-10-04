import {choose} from './rng.js';
import {recordEffectTelemetry} from './telemetry.js';
const has=(p,n)=>p.augments?.includes('aug-'+n),active=run=>run.phase==='COMBAT',isTwin=p=>p.characterId==='twins',live=p=>p.status!=='DOWNED'&&p.hp>0;
const root=(run,p,c)=>'action:'+run.combat.id+':'+run.combat.turn+':'+p.playerId+':'+c.cardInstanceId;
export function twinsState(run,p){
 run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};run.augmentFramework.cardState||={};
 const key=p.playerId+':twins',scope=run.combat?.id||run.currentRoomNodeId;let s=run.augmentFramework.cardState[key];
 if(!s||s.scope!==scope)s=run.augmentFramework.cardState[key]={scope,turn:0,guards:{},cycle:0,collisions:0,attempts:0,allValid:true,streak:0,previousValid:false,previousFinal:null,nextValid:0,nextCycle:0,performance:false,activation:null,serial:0,postAttempts:0,postAll:true,postValid:0,postStreak:0,alternating:0,previousPrinted:null,acroPending:0,encoreProcs:0,nextEncore:0,progress:0,sun:2,moon:2,pendingEclipse:null,special:null,lastEclipse:null,flow:0,ring:0,inertia:false,sunWindow:null,moonNext:0,firstSunUsed:false,firstMoonUsed:false,spentSequence:0,spentById:{},processed:{}};
 return s;
}
function tick(run,p){const s=twinsState(run,p),t=run.combat?.turn||0;if(s.turn!==t){s.turn=t;s.processed={};for(const k of Object.keys(s.guards))if(k.startsWith('TURN:'))delete s.guards[k];}return s;}
function cycle(run,p,s){const z=run.combat.privateByPlayer[p.playerId],n=z.cycleIndex||1;if(s.cycle!==n){s.cycle=n;s.collisions=0;s.attempts=0;s.allValid=true;for(const k of Object.keys(s.guards))if(k.startsWith('CYCLE:'))delete s.guards[k];}return z;}
function claim(run,p,n,scope='TURN'){const s=tick(run,p),z=run.combat?.privateByPlayer?.[p.playerId],key=scope+':'+n+':'+(scope==='TURN'?run.combat.turn:scope==='CYCLE'?z.cycleIndex||1:s.scope);if(s.guards[key])return false;s.guards[key]=true;recordEffectTelemetry(run,{id:'aug-'+n},p.playerId,true);return true;}
const need=p=>has(p,385)?2:3;
function progress(run,p,amount,events=[]){const s=tick(run,p),before=s.progress;s.progress=Math.min(need(p),s.progress+amount);p.publicResources.acrobaticsRechargeProgress=s.progress;if(s.progress>=need(p)){p.publicResources.acrobaticsReady=true;events.push({type:'ACROBATICS_RECHARGED',playerId:p.playerId,progress:s.progress,required:need(p),reason:'VALID_ATTACKS'});}return s.progress-before;}
function protect(p){if(p)p.publicResources.twinsProtection=Math.max(1,Number(p.publicResources.twinsProtection)||0);}
function living(run){return run.players.filter(live).sort((a,b)=>a.hp-b.hp||a.seat-b.seat||a.playerId.localeCompare(b.playerId));}
function heal(run,p,events,source){if(!live(p)||p.hp>=p.maxHp)return false;const before=p.hp;p.hp=Math.min(p.maxHp,p.hp+1);events.push({type:'PLAYER_HEALED',playerId:p.playerId,sourcePlayerId:source.playerId,source:'TWINS_SUN',amount:p.hp-before});return true;}
export function twinsTurnStart(run,p){
 if(!isTwin(p)||p.status==='DOWNED')return;const z=run.combat?.privateByPlayer?.[p.playerId]||run.roomState?.privateByPlayer?.[p.playerId];
 if(!Number.isInteger(p.publicResources.parity))p.publicResources.parity=choose(run,[0,1],'twins-parity:'+(run.combat?.id||run.roomState?.id||run.currentRoomNodeId)+':'+p.playerId);
 const cards=(z?.remainingCardIds||[]).map(id=>p.cardPool.find(c=>c.id===id)).filter(Boolean);
 if(cards.length&&!cards.some(c=>c.baseNumber%2===p.publicResources.parity))p.publicResources.parity=1-p.publicResources.parity;
 if(!active(run))return;const s=tick(run,p);cycle(run,p,s);
 if(s.pendingEclipse?.turn===run.combat.turn&&!s.special){
 s.special=s.pendingEclipse.kind;s.pendingEclipse=null;
 if(s.lastEclipse&&s.lastEclipse!==s.special){if(has(p,377)){s.flow=Math.min(3,s.flow+1);claim(run,p,377);}if(has(p,380)){s.ring=Math.min(3,s.ring+1);claim(run,p,380);}}
 s.lastEclipse=s.special;}
 if(has(p,371)){p.publicResources.sun=s.sun;p.publicResources.moon=s.moon;p.publicResources.eclipse=s.special;}
}
export function activateTwins(run,p){
 const c=run.combat,z=c?.privateByPlayer?.[p.playerId];if(!isTwin(p)||!active(run)||c?.phase!=='SELECTION_OPEN'||!live(p)||c.turnSubmissions[p.playerId]){const e=new Error('곡예는 카드 확정 제출 전에 사용합니다.');e.code='INVALID_PHASE';throw e;};
 if(!p.publicResources.acrobaticsReady){const e=new Error('곡예가 아직 재충전되지 않았습니다.');e.code='SKILL_NOT_READY';throw e;};
 const s=tick(run,p),remaining=z.remainingCardIds.length,previous=z.cycleIndex||1,parity=p.publicResources.parity||0,remainingBefore=[...z.remainingCardIds],spentBefore=[...z.spentCardIds];
 z.cycleIndex=previous+1;z.remainingCardIds=p.cardPool.filter(x=>x.source==='BASE').map(x=>x.id);z.spentCardIds=[];delete z.selectedCardId;delete z.skillIntent;s.spentById={};
 p.publicResources.parity=1-parity;p.publicResources.acrobaticsReady=false;p.publicResources.acrobaticsRechargeProgress=0;s.progress=0;s.serial++;s.activation=s.serial;s.postAttempts=0;s.postAll=true;s.postValid=0;s.postStreak=0;s.alternating=0;s.previousPrinted=null;
 s.acroPending=(has(p,386)&&remaining<=2?2:0)+(has(p,389)&&remaining<=1?6:0);s.activationExtra=s.nextEncore;s.nextEncore=0;
 p.publicResources.acrobaticsBoostReady=has(p,381);if(has(p,381))delete p.persistentCharacterState.acrobaticsLockCycle;else p.persistentCharacterState.acrobaticsLockCycle=z.cycleIndex;
 s.cycle=0;cycle(run,p,s);
 c.derivedEventSequence=(Number(c.derivedEventSequence)||0)+1;
 const rootActionId='skill:'+c.id+':'+c.turn+':'+p.playerId+':acrobatics',recoveryChainId='recovery:'+rootActionId;
 const reset={type:'CYCLE_RESET',eventId:'cycle-reset:'+c.id+':'+c.turn+':'+c.derivedEventSequence,turn:c.turn,playerId:p.playerId,classId:'twins',previousCycleId:previous,nextCycleId:z.cycleIndex,resetReason:'ACROBATICS',remainingBefore,spentBefore,remainingAfter:[...z.remainingCardIds],spentAfter:[],parityBefore:parity,parityAfter:p.publicResources.parity,rootActionId,recoveryChainId,parentEventId:null,chainDepth:1,sourceEffectId:has(p,381)?'aug-381':'TWINS_BASE'};
 const used={type:'ACROBATICS_USED',eventId:'acrobatics:'+c.id+':'+c.turn+':'+c.derivedEventSequence,playerId:p.playerId,cycleIndex:z.cycleIndex,parity:p.publicResources.parity,rootActionId,recoveryChainId,parentEventId:null,chainDepth:0,sourceEffectId:has(p,381)?'aug-381':'TWINS_BASE'};
 c.pendingSkillEvents||=[];c.pendingSkillEvents.push(used,reset);
 if(run.cardCycles)run.cardCycles[p.playerId]=structuredClone(z);return used;
}
export function twinsResolve(run,p,c,events=[]){
 if(!isTwin(p)||!active(run))return;const s=tick(run,p),r=root(run,p,c);if(s.processed[r])return;s.processed[r]=true;const z=cycle(run,p,s);
 c.twinsBonus=0;c.twinsExtra=0;c.twinsRemainingBefore=z.remainingCardIds.length;s.attempts++;
 const collision=c.invalidReason==='COLLISION';let preserve=false;
 if(collision){s.collisions++;s.performance=false;if(has(p,363)&&s.collisions===1&&claim(run,p,363,'CYCLE'))preserve=true;}
 if(s.activation){s.postAttempts++;s.postAll=s.postAll&&c.valid;c.twinsPostAttempt=s.postAttempts;
 if(!c.valid){s.postStreak=0;s.alternating=0;if(s.postAttempts===1&&collision&&has(p,384)&&claim(run,p,384))progress(run,p,1,events);}
 }
 if(!c.valid){s.allValid=false;if(!preserve){s.streak=0;s.previousValid=false;}return;}
 const previous=s.previousValid,previousFinal=s.previousFinal;s.streak++;s.previousValid=true;s.previousFinal=c.finalNumber;
 c.twinsBaseBonus=has(p,371)?0:has(p,361)&&previous?3:2;
 if(has(p,362)&&s.streak>=3)c.twinsBonus++;
 const consumed=s.nextValid>0;if(consumed){c.twinsBonus+=s.nextValid;s.nextValid=0;}
 if(has(p,365)&&s.streak>=3&&!consumed&&!s.nextValid&&claim(run,p,365))s.nextValid=2;
 if(has(p,366)&&previousFinal!=null&&Math.abs(c.finalNumber-previousFinal)>=2)c.twinsBonus+=2;
 if(s.nextCycle){c.twinsBonus+=s.nextCycle;s.nextCycle=0;}
 if(s.performance)c.twinsBonus+=3;
 if(has(p,369)&&c.twinsRemainingBefore===1)c.twinsBonus+=4;
 if(has(p,371)){
 c.twinsBonus+=has(p,377)?s.flow:0;
 if(s.special==='MOON'){
 let bonus=has(p,373)?6:4;
 if(has(p,379)&&!s.firstMoonUsed&&claim(run,p,379,'COMBAT')){bonus=8;s.firstMoonUsed=true;if(c.finalNumber>=5)c.twinsExtra=3;}
 c.twinsBonus+=bonus+(has(p,380)?s.ring:0);
 }else if(s.special==='SUN'){
 const people=living(run),missing=people.filter(x=>x.hp<x.maxHp),healCount=has(p,378)&&!s.firstSunUsed&&claim(run,p,378,'COMBAT')?2:1;
 if(healCount===2)s.firstSunUsed=true;
 const targets=missing.slice(0,healCount);for(const target of targets)heal(run,target,events,p);
 const protectedIds=new Set();
 if(has(p,372)){const q=people.find(x=>x.playerId!==targets[0]?.playerId);if(q){protect(q);protectedIds.add(q.playerId);}}
 if(has(p,378)&&healCount===2){const q=[...people].sort((a,b)=>b.hp-a.hp||a.seat-b.seat||a.playerId.localeCompare(b.playerId))[0];if(q){protect(q);protectedIds.add(q.playerId);}}
 if(has(p,380))for(const q of people.filter(x=>!protectedIds.has(x.playerId)).slice(0,s.ring))protect(q);
 }else{
 if(s.moonNext){c.twinsBonus+=s.moonNext;s.moonNext=0;}
 const amount=s.inertia?2:1;s.inertia=false;s.sun=Math.max(0,Math.min(4,s.sun+(c.finalNumber%2?amount:-amount)));s.moon=4-s.sun;
 if(s.sun===4||s.moon===4)s.pendingEclipse={kind:s.sun===4?'SUN':'MOON',turn:run.combat.turn+1};
 }p.publicResources.sun=s.sun;p.publicResources.moon=s.moon;
 }
 if(s.activation){
 s.postValid++;s.postStreak++;const parity=c.baseNumber%2;s.alternating=s.previousPrinted!=null&&s.previousPrinted!==parity?s.alternating+1:1;s.previousPrinted=parity;
 if(has(p,381)){
 if(s.postValid===1){c.twinsBonus+=(has(p,382)?4:2)+(s.activationExtra||0);p.publicResources.acrobaticsBoostReady=false;}
 else if(has(p,383)&&s.postValid===2)c.twinsBonus+=2;
 if(!p.publicResources.acrobaticsReady)progress(run,p,1,events);
 }
 if(s.acroPending){c.twinsBonus+=s.acroPending;s.acroPending=0;}
 if(has(p,387)&&s.alternating>=2)c.twinsBonus+=2;
 if(has(p,388)&&s.postStreak>=3&&s.encoreActivationUsed!==s.activation&&s.encoreProcs<2){s.encoreActivationUsed=s.activation;s.encoreProcs++;p.publicResources.acrobaticsReady=true;s.nextEncore=2;claim(run,p,388);}
 if(has(p,390)&&s.postAttempts===3&&s.postAll)c.twins390=true;
 }
}
export function twinsAfterSpend(run,p,c,events=[]){
 if(!isTwin(p)||!active(run))return;const s=tick(run,p),z=cycle(run,p,s),r=root(run,p,c);if(s.processed['spend:'+r])return;s.processed['spend:'+r]=true;
 // Preserve deterministic prior SPENT order before recording the current submission.
 for(const id of z.spentCardIds)if(id!==c.cardInstanceId&&!s.spentById[id])s.spentById[id]=++s.spentSequence;
 if(z.spentCardIds.includes(c.cardInstanceId))s.spentById[c.cardInstanceId]=++s.spentSequence;
 const eligible=()=>z.spentCardIds.filter(id=>id!==c.cardInstanceId&&id!==z.selectedCardId&&!z.remainingCardIds.includes(id)&&p.cardPool.some(x=>x.id===id&&x.source==='BASE'&&!(x.tags||[]).some(t=>['TEMPORARY','VANISHED_SOURCE','DERIVED'].includes(t))));
 const recover=(n,parity=null,recent=false)=>{
 let ids=eligible().filter(id=>parity==null||p.cardPool.find(x=>x.id===id).baseNumber%2===parity);if(!ids.length)return false;
 if(s.guards['CYCLE:'+n+':'+(z.cycleIndex||1)])return false;
 ids.sort((a,b)=>recent?(s.spentById[b]-s.spentById[a]||a.localeCompare(b)):a.localeCompare(b));
 const id=recent?ids[0]:choose(run,ids,'twins-recover:'+r+':'+n);z.spentCardIds=z.spentCardIds.filter(x=>x!==id);z.remainingCardIds.push(id);delete s.spentById[id];claim(run,p,n,n===390?'TURN':'CYCLE');
 events.push({type:'CARD_RECOVERED',playerId:p.playerId,cardInstanceId:id,fromZone:'SPENT',toZone:'REMAINING',rootActionId:r,sourceEffectId:'aug-'+n});return true;
 };
 if(c.valid&&has(p,364)&&s.streak>=2)recover(364,1-(p.publicResources.parity||0));
 if(c.valid&&has(p,370)&&s.streak>=4)recover(370);
 if(c.twins390&&has(p,390)){recover(390,null,true);progress(run,p,1,events);}
}
export function twinsCycleComplete(run,p,events=[]){
 if(!isTwin(p)||!active(run))return;const s=tick(run,p);if(s.collisions===0&&has(p,367)){heal(run,p,events,p);s.nextCycle=Math.max(2,s.nextCycle);}
 if(s.attempts>0&&s.allValid&&has(p,368))s.performance=true;
 s.spentById={};
}
export function twinsAfterHpDamage(run,events=[]){
 if(!active(run))return;
 for(const p of run.players.filter(isTwin)){
 const s=tick(run,p);if(!has(p,375)||!s.sunWindow||run.combat.turn<s.sunWindow.start||run.combat.turn>s.sunWindow.end)continue;
 const e=events.find(x=>x.type==='PLAYER_DAMAGED'&&Number(x.actualDamage)>0&&run.players.some(q=>q.playerId===x.playerId&&live(q)));if(e){protect(run.players.find(q=>q.playerId===e.playerId));s.sunWindow=null;claim(run,p,375);}
 }
}
export function twinsTurnEnd(run,p,events=[]){
 if(!isTwin(p)||!Number.isInteger(p.publicResources.parity))return;
 if(!active(run)){const before=p.publicResources.parity;p.publicResources.parity=1-before;events.push({type:'TWINS_PARITY_FLIPPED',playerId:p.playerId,before,after:p.publicResources.parity,reason:'TURN_END',turn:run.roomState?.turn??null});return;}
 const s=tick(run,p);if(s.processed['end:'+run.combat?.turn])return;s.processed['end:'+run.combat?.turn]=true;
 const before=p.publicResources.parity;p.publicResources.parity=1-before;events.push({type:'TWINS_PARITY_FLIPPED',playerId:p.playerId,before,after:p.publicResources.parity,reason:'TURN_END',turn:run.combat?.turn??null});
 if(!active(run))return;
 if(s.special){if(has(p,374))s.inertia=true;if(s.special==='SUN'&&has(p,375))s.sunWindow={start:run.combat.turn+1,end:run.combat.turn+2};if(s.special==='MOON'&&has(p,376))s.moonNext=1;s.sun=2;s.moon=2;s.special=null;p.publicResources.sun=2;p.publicResources.moon=2;p.publicResources.eclipse=null;}
 if(s.sunWindow&&run.combat.turn>s.sunWindow.end)s.sunWindow=null;
}
export function twinsIncomingProtection(p,damage,type){if(type!=='DIRECT'||damage.amount<=0||!p.publicResources.twinsProtection)return 0;const prevented=Math.min(damage.amount,p.publicResources.twinsProtection);damage.amount-=prevented;delete p.publicResources.twinsProtection;return prevented;}
export function cleanupTwins(run,p){delete p.publicResources.twinsProtection;if(!isTwin(p))return;for(const key of ['sun','moon','eclipse'])delete p.publicResources[key];if(run.augmentFramework?.cardState)delete run.augmentFramework.cardState[p.playerId+':twins'];delete p.persistentCharacterState.acrobaticsLockCycle;}
