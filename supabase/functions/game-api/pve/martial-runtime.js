import {recordEffectTelemetry} from './telemetry.js';
// 005D-A: authoritative DESIGN-D Martial mechanics; state is serialized server-side.
const has=(p,n)=>p.augments?.includes('aug-'+n);
export const martialCap=p=>has(p,292)?5:has(p,271)?4:3;
export function martialState(run,p){
  run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};run.augmentFramework.cardState||={};
  const key=p.playerId+':martial';
  let s=run.augmentFramework.cardState[key];
  if(!s||s.combatId!==run.combat.id)s=run.augmentFramework.cardState[key]={combatId:run.combat.id,guards:{},lastTurn:null,results:{},exaltation:0,qi:0,maxStreak:0,heldTurns:0,consumed:0,nextPair:2,pending:null,reservation:null,reservationClaimed:false,metrics:{}};
  return s;
}
function claim(run,p,n,scope='TURN'){
 const s=martialState(run,p),cycle=run.combat.privateByPlayer?.[p.playerId]?.cycleIndex||1;
 const key=n+':'+(scope==='COMBAT'?'combat':scope==='CYCLE'?'cycle:'+cycle:'turn:'+run.combat.turn);
 if(s.guards[key])return false;s.guards[key]=true;recordEffectTelemetry(run,{id:'aug-'+n},p.playerId,true);s.metrics[n]=(s.metrics[n]||0)+1;return true;
}
function enemyState(run){
 const c=run.combat;c.martialEnemy||={enemyId:c.monster.id,units:[],sequence:0,firstThree:false,vulnerabilityTurn:null,shredEnabled:false};
 return c.martialEnemy;
}
function arm(run,p,value,root){const s=martialState(run,p);s.pending={value:Math.max(value,s.pending?.value||0),root};}
function grant(run,p,n){
 const e=enemyState(run),before=e.units.length;
 for(let i=0;i<n&&e.units.length<3;i++)e.units.push({supplierOwnerId:p.playerId,sequence:++e.sequence});
 if(e.units.length>=2&&run.players.some(x=>has(x,283)))e.shredEnabled=true;
 if(before<3&&e.units.length===3){
  if(!e.firstThree){e.firstThree=true;for(const owner of run.players.filter(x=>x.characterId==='martial_artist'&&has(x,287))){const s=martialState(run,owner);if(!s.reservationClaimed)s.reservation={enemyId:e.enemyId,afterTurn:run.combat.turn};}}
  if(run.players.some(x=>has(x,288)))e.vulnerabilityTurn=run.combat.turn+1;
 }
}
export function prepareMartialCollision(run,cards,events=[]){
 if(run.phase!=='COMBAT')return;
 for(const rc of cards){
 const p=run.players.find(x=>x.playerId===rc.playerId);if(p?.characterId!=='martial_artist')continue;
 const s=martialState(run,p),r=s.reservation;
 if(r&&r.enemyId===run.combat.monster.id&&run.combat.turn>r.afterTurn&&!s.reservationClaimed){
 s.reservationClaimed=true;s.reservation=null;claim(run,p,287,'COMBAT');rc.martialReservationUsed=true;
 if(rc.invalidReason==='COLLISION'&&p.status!=='DOWNED'){rc.valid=true;delete rc.invalidReason;rc.collisionImmune=true;events.push({type:'MARTIAL_COLLISION_PROTECTED',playerId:p.playerId,source:'aug-287'});}
 }
 }
}
export function resolveMartial(run,p,rc,submission={},events=[]){
 if(run.phase!=='COMBAT'||p.characterId!=='martial_artist')return;
 const s=martialState(run,p),root=run.combat.turn+':'+rc.cardInstanceId;
 if(s.lastTurn!==run.combat.turn){s.lastTurn=run.combat.turn;s.results={};for(const k of Object.keys(s.guards))if(k.includes('turn:')&&!k.endsWith('turn:'+run.combat.turn))delete s.guards[k];const cycle=run.combat.privateByPlayer?.[p.playerId]?.cycleIndex||1;for(const k of Object.keys(s.guards))if(k.includes('cycle:')&&!k.endsWith('cycle:'+cycle))delete s.guards[k];}
 if(s.results[root]){Object.assign(rc,structuredClone(s.results[root]));return;}
 const before=Math.max(0,Number(p.publicResources.combo)||0),raw=p.publicResources.lastSubmittedNumber,previous=raw==null?null:Number(raw),rising=previous!==null&&rc.finalNumber>previous;
 const collision=!rc.valid&&rc.invalidReason==='COLLISION',finisher=has(p,291)&&submission.skillIntent===true,normal=rc.valid&&!finisher,cap=martialCap(p);
 let combo=before,bonus=0,extra=0;
 rc.comboBefore=before;rc.previousSubmittedNumber=previous;
 let protectedCombo=false;
 if(before>=3&&(collision||normal&&previous!==null&&!rising)&&has(p,299)&&claim(run,p,299,'CYCLE'))protectedCombo=true;
 if(collision){
 if(protectedCombo||has(p,291))combo=before;
 else if(before>=2&&has(p,280)&&claim(run,p,280,'COMBAT'))combo=2;
 else if(before>=2&&has(p,276)&&claim(run,p,276,'CYCLE'))combo=Math.max(0,before-1);
 else combo=0;
 p.score=(Number(p.score)||0)-1;events.push({type:'MARTIAL_COLLISION_SCORE_LOST',playerId:p.playerId,amount:1,score:p.score});
 if(has(p,278))s.exaltation=Math.max(0,s.exaltation-1);else if(has(p,275))s.exaltation=0;
 }
 if(!rc.valid&&rc.invalidReason!=='COLLISION'&&has(p,274)&&claim(run,p,274))arm(run,p,1,root);
 if(finisher){
 claim(run,p,291,'CYCLE');
 const priv=run.combat.privateByPlayer?.[p.playerId];if(priv)priv.finisherUsedCycle=priv.cycleIndex||1;
 rc.skillUsed='one_hit_kill';rc.finisherComboBefore=before;rc.finisherComboConsumed=rc.valid?before:0;
 rc.finisherOutcome=rc.valid?'SUCCESS':collision?'FAIL_COLLISION':'FAIL_INVALID';
 if(!rc.valid){rc.finisherBonusDamage=0;events.push({type:'ONE_HIT_KILL_FAILED',playerId:p.playerId,comboPreserved:before,reason:rc.invalidReason||'INVALID'});}
 if(rc.valid){
 const qi=s.qi;combo=0;bonus+=before*(has(p,298)?3:2);
 if(has(p,295)){bonus+=qi*2;s.qi=0;}
 if(has(p,294)&&s.heldTurns>=2&&claim(run,p,294))bonus++;
 if(has(p,296)&&claim(run,p,296,'COMBAT'))rc.martialPenetration=1;
 if(has(p,298)&&before===5&&qi===3)extra+=5;
 let restored=has(p,297)&&before>=1?1:0;
 if(has(p,300)&&claim(run,p,300,'CYCLE'))restored=Math.max(restored,Math.ceil(before/2));
 rc.martialRestore=restored;
 events.push({type:'ONE_HIT_KILL_CONSUMED',playerId:p.playerId,comboConsumed:before,bonusDamage:rc.finisherBonusDamage??bonus,comboAfter:0});
 }
 }else if(normal){
 if(rising)combo=Math.min(cap,before+1);
 else if(previous!==null&&has(p,293)&&!protectedCombo&&claim(run,p,293,'CYCLE'))combo=Math.max(0,before-1);
 if(!rising&&previous!==null&&rc.finalNumber===previous&&has(p,272))claim(run,p,272,'CYCLE');
 if(has(p,271)&&rising&&before===4&&claim(run,p,271))bonus++;
 if(has(p,273)&&combo>=2&&claim(run,p,273))bonus++;
 if(has(p,277)&&rising&&rc.finalNumber-previous>=2&&claim(run,p,277))bonus+=2;
 if(has(p,275)||has(p,278)){
 if(combo===cap){claim(run,p,has(p,278)?278:275);}
 if(combo===cap)s.exaltation=Math.min(has(p,278)?4:3,s.exaltation+1);
 bonus+=s.exaltation;
 }
 s.maxStreak=combo===cap?s.maxStreak+1:0;
 if(has(p,279)&&combo===cap&&s.maxStreak%3===0&&claim(run,p,279))extra+=3;
 if(has(p,295)&&rising&&before===cap)s.qi=Math.min(3,s.qi+1);
 if(has(p,281)&&rising){claim(run,p,281);grant(run,p,has(p,286)&&combo>=2&&claim(run,p,286)?2:1);}
 }
 if(!normal)s.maxStreak=0;
 if(rc.valid&&s.pending&&s.pending.root!==root){bonus+=s.pending.value;s.pending=null;}
 p.publicResources.combo=combo;p.publicResources.comboMax=cap;p.publicResources.lastSubmittedNumber=rc.finalNumber;
 p.publicResources.qi=s.qi;p.publicResources.exaltation=s.exaltation;
 if(normal)rc.martialComboBonus=has(p,281)?0:combo;else delete rc.martialComboBonus;
 if(finisher)rc.finisherBonusDamage=rc.valid?bonus:0;else delete rc.finisherBonusDamage;rc.martialBonusDamage=finisher?0:bonus;rc.martialExtraDamage=extra;rc.comboAfter=combo;
 s.heldTurns=combo>0?s.heldTurns+1:0;
 const fields=['comboBefore','previousSubmittedNumber','skillUsed','finisherComboBefore','finisherComboConsumed','finisherOutcome','martialRestore','martialPenetration','martialComboBonus','finisherBonusDamage','martialBonusDamage','martialExtraDamage','comboAfter'];
 s.results[root]=Object.fromEntries(fields.filter(k=>rc[k]!==undefined).map(k=>[k,rc[k]]));
 events.push({type:'MARTIAL_RESOLVED',playerId:p.playerId,comboBefore:before,comboAfter:combo,qi:s.qi,finalNumber:rc.finalNumber,valid:rc.valid});
}
export function martialPacket(run,p,rc,defense){
 if(run.phase!=='COMBAT'||!rc.valid)return {defense,bonus:0,extra:0,penetration:0};
 const e=enemyState(run),key=run.combat.turn+':'+p.playerId+':'+rc.cardInstanceId;
 e.packetTurn===run.combat.turn||(e.packetTurn=run.combat.turn,e.packetResults={});
 if(e.packetResults[key])return e.packetResults[key];
 let bonus=Number(rc.martialBonusDamage)||0,extra=Number(rc.martialExtraDamage)||0;
 const index=e.units.findIndex(x=>x.supplierOwnerId!==p.playerId),unit=index>=0?e.units[index]:null;
 // Shred observes the before-consumption snapshot, then the unit is consumed.
 const adjusted=e.shredEnabled&&e.units.length>=2?Math.max(0,defense-1):defense;
 if(unit){
 const owner=run.players.find(x=>x.playerId===unit.supplierOwnerId),s=martialState(run,owner),root=run.combat.turn+':'+rc.cardInstanceId;
 e.units.splice(index,1);bonus++;s.consumed++;
 if(has(owner,282)&&claim(run,owner,282))bonus++;
 if(has(owner,284)&&claim(run,owner,284))arm(run,owner,1,root);
 if(has(owner,285)&&s.consumed%2===0&&claim(run,owner,285))grant(run,owner,1);
 if(has(owner,289)&&(Number(owner.publicResources.combo)||0)>=2&&claim(run,owner,289)){extra+=3;grant(run,owner,1);}
 if(has(owner,290)&&s.consumed>=s.nextPair&&claim(run,owner,290)){owner.publicResources.combo=Math.min(martialCap(owner),(Number(owner.publicResources.combo)||0)+1);s.nextPair+=2;}
 }
 if(e.vulnerabilityTurn===run.combat.turn)bonus+=2;
 const result={defense:adjusted,bonus,extra,penetration:Math.min(adjusted,Number(rc.martialPenetration)||0)};
 e.packetResults[key]=result;return result;
}
export function afterMartialDamage(run,p,rc){
 if(run.phase==='COMBAT'&&p.characterId==='martial_artist'&&rc.valid&&rc.martialRestore)p.publicResources.combo=Math.min(martialCap(p),Math.max(Number(p.publicResources.combo)||0,rc.martialRestore));
}
export function cleanupMartial(run,p){
 if(p.characterId!=='martial_artist')return;
 if(run?.augmentFramework?.cardState)delete run.augmentFramework.cardState[p.playerId+':martial'];
 for(const key of ['comboMax','qi','exaltation'])delete p.publicResources[key];
}
