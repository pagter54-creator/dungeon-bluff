import {recordEffectTelemetry} from './telemetry.js';
const has=(p,n)=>p.augments?.includes('aug-'+n);
const sort=(a,b)=>(a.seat-b.seat)||a.playerId.localeCompare(b.playerId);
const player=(run,id)=>run.players.find(p=>p.playerId===id);
const card=(cards,id)=>cards.find(c=>c.playerId===id);
const live=p=>p&&p.status!=='DOWNED'&&p.hp>0;
const combat=run=>run.phase==='COMBAT';
export const bloodCap=p=>has(p,324)||has(p,328)?8:6;
export function vampireState(run,p){
 run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
 run.augmentFramework.cardState||={};
 const state=run.combat||run.roomState,key=p.playerId+':vampire',scope=state?.id||run.currentRoomNodeId||run.phase;
 let s=run.augmentFramework.cardState[key];
 if(!s||s.scope!==scope)s=run.augmentFramework.cardState[key]={scope,sequence:0,mark:null,reserve:null,guards:{},results:{},turn:null,bound:null,pact:0,jointStreak:0,commandSuccesses:0,jointCommands:0,commandPower:0,dominanceCharge:null,dominanceFour:false,pending:{},receipts:[],metrics:{}};
 return s;
}
function claim(run,p,n,scope='TURN',branch=''){
 const s=vampireState(run,p),c=run.combat||run.roomState,cycle=c.privateByPlayer?.[p.playerId]?.cycleIndex||1;
 const key=n+':'+branch+':'+(scope==='COMBAT'?'combat':scope==='CYCLE'?'cycle:'+cycle:'turn:'+c.turn);
 if(s.guards[key])return false;s.guards[key]=true;s.metrics[n]=(s.metrics[n]||0)+1;recordEffectTelemetry(run,{id:'aug-'+n},p.playerId,true);return true;
}
function refresh(run,p){
 const s=vampireState(run,p),c=run.combat||run.roomState;
 if(s.turn!==c.turn){s.turn=c.turn;s.results={};for(const k of Object.keys(s.guards))if(k.includes('turn:')&&!k.endsWith('turn:'+c.turn))delete s.guards[k];const cy=c.privateByPlayer?.[p.playerId]?.cycleIndex||1;for(const k of Object.keys(s.guards))if(k.includes('cycle:')&&!k.endsWith('cycle:'+cy))delete s.guards[k];}
 if(p.publicResources.thrallPlayerId&&!live(player(run,p.publicResources.thrallPlayerId)))delete p.publicResources.thrallPlayerId;
 if(s.mark&&!live(player(run,s.mark.thrallPlayerId))){s.mark=null;delete p.publicResources.thrallPlayerId;}
 if(s.bound&&!live(player(run,s.bound))){s.bound=null;s.pact=0;s.jointStreak=0;}
 // Migrate an authoritative old snapshot without selecting a new target.
 if(!s.mark&&p.publicResources.thrallPlayerId&&live(player(run,p.publicResources.thrallPlayerId)))s.mark={ownerVampireId:p.playerId,thrallPlayerId:p.publicResources.thrallPlayerId,sourceAugmentOrBase:'BASE',active:true,createdRootActionId:'snapshot',createdSequence:++s.sequence,retentionUsed:false};
 if(s.mark&&s.bound===null)bind(s,s.mark.thrallPlayerId);
 return s;
}
function bind(s,target){if(s.bound===target)return;s.bound=target;s.pact=0;s.jointStreak=0;}
export function assignVampireMarks(run,cards,groups,events=[]){
 if(![...groups.values()].some(g=>g.length>=2))return;
 for(const p of run.players.filter(p=>p.characterId==='vampire'&&live(p)).sort(sort)){
 const s=refresh(run,p);if(s.mark?.active)continue;
 const target=run.players.filter(q=>q.playerId!==p.playerId&&live(q)).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||sort(a,b))[0];
 if(!target)continue;
 s.mark={ownerVampireId:p.playerId,thrallPlayerId:target.playerId,sourceAugmentOrBase:'BASE',active:true,createdRootActionId:'mark:'+(run.combat||run.roomState).id+':'+(run.combat||run.roomState).turn+':'+p.playerId,createdSequence:++s.sequence,retentionUsed:false};
 p.publicResources.thrallPlayerId=target.playerId;bind(s,target.playerId);
 events.push({type:'THRALL_MARKED',playerId:p.playerId,ownerVampireId:p.playerId,targetId:target.playerId,score:Number(target.score)||0});
 }
}
function reserve(run,p,n){
 const s=vampireState(run,p);if(!s.reserve)s.reserve={source:'aug-'+n,earnedSequence:s.sequence,earnedTurn:(run.combat||run.roomState).turn};
}
export function performVampireSwap(run,p,actor,target,cards,events=[],state=run.combat){
 const s=refresh(run,p),root=state.turn+':'+actor.cardInstanceId;
 if(s.results['swap:'+root])return false;
 if(!live(p)||!live(player(run,target.playerId))||!s.mark?.active||s.mark.thrallPlayerId!==target.playerId)throw new Error('피의 명령 대상이 이번 턴 판정에 없습니다.');
 const mark=structuredClone(s.mark),before=actor.workingNumber,targetBefore=target.workingNumber;
 actor.bloodCommandUsed=true;actor.bloodCommandTargetId=target.playerId;actor.bloodCommandMark=mark;
 actor.ownerPreSwapWorkingNumber=before;actor.receivedWorkingNumber=targetBefore;
 actor.targetPreSwapDuplicateCount=cards.filter(c=>c.workingNumber===targetBefore).length;
 actor.dominanceBefore=Math.max(0,Number(p.publicResources.dominance)||0);
 actor.workingNumber=targetBefore;target.workingNumber=before;
 if(combat(run)&&s.reserve&&!mark.retentionUsed&&mark.createdSequence>s.reserve.earnedSequence){const source=Number(s.reserve.source.slice(4));s.reserve=null;s.mark.retentionUsed=true;claim(run,p,source,'TURN','defer');}
 else{s.mark=null;delete p.publicResources.thrallPlayerId;}
 if(combat(run)&&has(p,308)){
 p.publicResources.dominance=Math.min(4,actor.dominanceBefore+1);s.dominanceCharge={root};
 claim(run,p,308,'TURN');
 if(p.publicResources.dominance===4&&!s.dominanceFour){s.dominanceFour=true;reserve(run,p,308);}
 }
 s.results['swap:'+root]=true;
 events.push({phase:'PRE_COLLISION_SWAP',effectId:'vampire-blood-command',actorId:p.playerId,targetId:target.playerId,actorBefore:before,targetBefore,actorAfter:targetBefore,targetAfter:before});
 return true;
}
export function protectVampireCollision(run,cards,events=[]){
 if(!combat(run))return;
 for(const rc of cards){const p=player(run,rc.playerId);if(p?.characterId!=='vampire'||!has(p,307)||!rc.bloodCommandUsed||rc.invalidReason!=='COLLISION'||!live(p))continue;
 if(claim(run,p,307,'COMBAT')){rc.valid=true;delete rc.invalidReason;rc.collisionImmune=true;events.push({type:'VAMPIRE_COMMAND_COLLISION_PROTECTED',playerId:p.playerId,source:'aug-307'});}}
}
function bonus(rc,value){if(rc?.valid)rc.vampireBonus=(Number(rc.vampireBonus)||0)+value;}
function arm(run,target,value,source,root,afterTurn=null){
 if(!target)return;const s=vampireState(run,target),old=s.pending[source];s.pending[source]={value:Math.max(value,old?.value||0),root,afterTurn};
}
function protection(target){if(target)target.publicResources.vampireProtection=Math.max(1,Number(target.publicResources.vampireProtection)||0);}
export function resolveVampireValidity(run,cards,events=[]){
 if(!combat(run))return;
 for(const p of run.players.filter(p=>p.characterId==='vampire'&&live(p)).sort(sort)){
 const s=refresh(run,p),rc=card(cards,p.playerId);if(!rc)continue;const root=run.combat.turn+':'+rc.cardInstanceId;
 if(s.results['valid:'+root])continue;s.results['valid:'+root]=true;
 const target=player(run,rc.bloodCommandTargetId||s.bound),other=target?card(cards,target.playerId):null;
 if(rc.bloodCommandUsed&&rc.valid){
 s.commandSuccesses++;if(other?.valid)s.jointCommands++;
 if(has(p,301)&&!has(p,308)&&claim(run,p,301,'CYCLE')){bonus(rc,rc.dominanceBefore||0);p.publicResources.dominance=1;}
 if(has(p,303)&&other?.valid&&claim(run,p,303,'CYCLE'))reserve(run,p,303);
 if(has(p,304)&&rc.receivedWorkingNumber>rc.ownerPreSwapWorkingNumber&&claim(run,p,304))bonus(rc,1);
 if(has(p,305)){s.commandPower=Math.min(3,s.commandPower+1);bonus(rc,s.commandPower);claim(run,p,305);}
 if(has(p,306)&&other?.valid&&rc.targetPreSwapDuplicateCount>=2&&claim(run,p,306))bonus(rc,2);
 if(has(p,309)&&s.commandSuccesses>=2&&claim(run,p,309))bonus(rc,4);
 if(has(p,310)&&other?.valid&&s.jointCommands>=2&&claim(run,p,310)){bonus(rc,3);bonus(other,3);}
 }
 const bound=player(run,s.bound),br=bound?card(cards,bound.playerId):null,both=rc.valid&&br?.valid;
 if(has(p,311)&&br){
 const before=s.pact;
 if(both){const gain=has(p,312)&&claim(run,p,312,'CYCLE')?2:1;s.pact=Math.min(3,s.pact+gain);s.jointStreak++;claim(run,p,311);if(s.pact>=2){bonus(rc,1);bonus(br,1);}}
 else{const preserve=has(p,318)&&before===3&&Boolean(rc.valid)!==Boolean(br.valid)&&claim(run,p,318,'CYCLE');if(!preserve)s.pact=Math.max(0,s.pact-1);s.jointStreak=0;}
 if(both&&has(p,313)&&Math.abs(rc.finalNumber-br.finalNumber)>=2&&claim(run,p,313)){bonus(rc,1);bonus(br,1);}
 if(both&&has(p,314)&&Math.abs(rc.finalNumber-br.finalNumber)===1&&claim(run,p,314,'COMBAT')){protection(p);protection(bound);}
 if(both&&has(p,317)&&s.jointStreak>=2&&claim(run,p,317)){bonus(rc,2);bonus(br,2);}
 if(both&&has(p,319)&&rc.finalNumber>=4&&br.finalNumber>=4&&claim(run,p,319)){bonus(rc,3);bonus(br,3);}
 p.publicResources.pact=s.pact;
 }
 }
 // Receipts for any target class, consumed once by a distinct primary VALID root.
 for(const rc of cards.filter(c=>c.valid)){
 const p=player(run,rc.playerId),s=vampireState(run,p),root=run.combat.turn+':'+rc.cardInstanceId;
 if(s.results['receipt:'+root])continue;s.results['receipt:'+root]=true;
 for(const [key,r]of Object.entries(s.pending))if(r.root!==root&&(r.afterTurn===null||run.combat.turn>r.afterTurn)){bonus(rc,r.value);delete s.pending[key];}
 if(p.characterId==='vampire'&&has(p,308)&&!rc.bloodCommandUsed&&s.dominanceCharge&&s.dominanceCharge.root!==root){bonus(rc,Number(p.publicResources.dominance)||0);s.dominanceCharge=null;}
 }
}
function blood(run,p,value,n){const before=Number(p.publicResources.blood)||0;p.publicResources.blood=Math.min(bloodCap(p),before+value);claim(run,p,n);return p.publicResources.blood-before;}
function heal(run,p,target,n,events){
 const before=target.hp;target.hp=Math.min(target.maxHp,before+1);if(target.hp<=before)return false;
 const root=run.combat.turn+':'+(card(run.combat._vampireCards||[],p.playerId)?.cardInstanceId||p.playerId),s=vampireState(run,p);
 events.push({type:'PLAYER_HEALED',phase:'POST_DAMAGE_PRE_DOWN',playerId:target.playerId,sourcePlayerId:p.playerId,source:'TRANSFUSION',amount:1,before,after:target.hp});
 if(has(p,323)&&before===1&&claim(run,p,323,'COMBAT'))protection(target);
 if(has(p,325)||has(p,329)){arm(run,target,2,'transfusion',root);if(has(p,325))claim(run,p,325);if(has(p,329)){claim(run,p,329);protection(target);}}
 if(has(p,330)){s.receipts.push({targetId:target.playerId,afterTurn:run.combat.turn,id:++s.sequence});}
 return true;
}
export function vampirePostDamage(run,cards,packets,events=[],enemyHpBefore=null){
 if(!combat(run))return;const c=run.combat;c._vampireCards=cards;
 for(const p of run.players.filter(p=>p.characterId==='vampire'&&live(p)).sort(sort)){
 const s=refresh(run,p),rc=card(cards,p.playerId),root=c.turn+':'+(rc?.cardInstanceId||p.playerId);if(s.results['post:'+root])continue;s.results['post:'+root]=true;
 const actual=id=>packets.filter(q=>q.sourcePlayerId===id&&!q.followUp&&!q.extraDamageComponent).reduce((a,q)=>a+q.amount,0);
 const target=player(run,s.bound),br=target?card(cards,target.playerId):null;
 if(rc?.valid){
 if(has(p,321))blood(run,p,1,321);
 if(has(p,322)&&actual(p.playerId)>=4)blood(run,p,1,322);
 if(has(p,326)&&((enemyHpBefore??c.monster.hp)*2>=c.monster.maxHp||c.roomType==='BOSS'))blood(run,p,2,326);
 }
 s.receipts=s.receipts.filter(r=>{const tr=card(cards,r.targetId);if(c.turn>r.afterTurn&&tr?.valid){blood(run,p,1,330);return false;}return true;});
 if(br?.valid&&has(p,315)&&actual(target.playerId)>=4&&claim(run,p,315))arm(run,p,2,'pair',root,c.turn);
 if(s.pact===3&&rc?.valid&&br?.valid&&has(p,320)&&claim(run,p,320,'TURN','success')){arm(run,p,1,'pact',root);arm(run,target,1,'pact',root);}
 }
 delete c._vampireCards;
}
export function vampirePreDown(run,cards,events=[]){
 if(!combat(run))return;
 const owners=run.players.filter(p=>p.characterId==='vampire'&&live(p)).sort(sort),damageEvents=events.filter(e=>e.type==='PLAYER_DAMAGED'&&e.actualDamage>0);
 // The damage-event order is authoritative; owner seats break simultaneous rescue ties.
 for(const e of damageEvents)for(const p of owners){
 const s=refresh(run,p),target=player(run,s.bound),root=run.combat.turn+':'+(card(cards,p.playerId)?.cardInstanceId||p.playerId);
 if(e.damageType==='DIRECT'&&target&&[p.playerId,target.playerId].includes(e.playerId)){
 if(has(p,316)&&claim(run,p,316,'COMBAT')){if(e.playerId===target.playerId)arm(run,p,1,'pair',root);else protection(target);}
 if(has(p,320)&&s.pact===3&&claim(run,p,320,'TURN','damage'))protection(e.playerId===p.playerId?target:p);
 }
 if(has(p,327)&&e.playerId!==p.playerId&&(Number(p.publicResources.blood)||0)>=4){
 const q=player(run,e.playerId);if(live(q)&&q.hp===1&&claim(run,p,327,'COMBAT')){p.publicResources.blood-=4;heal(run,p,q,327,events);}
 }
 }
 for(const p of owners)if(has(p,321)){
 const cost=has(p,328)?3:4,q=run.players.filter(x=>live(x)&&x.hp<x.maxHp).sort((a,b)=>a.hp-b.hp||sort(a,b))[0];
 if(q&&(Number(p.publicResources.blood)||0)>=cost&&claim(run,p,321,'TURN','transfuse')){p.publicResources.blood-=cost;heal(run,p,q,321,events);}
 }
}
export function vampireIncomingProtection(p,damage,damageType){
 if(damageType!=='DIRECT'||!(p.publicResources.vampireProtection>0)||!(damage.amount>0))return;
 damage.amount=Math.max(0,damage.amount-p.publicResources.vampireProtection);delete p.publicResources.vampireProtection;
}
export function cleanupVampire(run,p){
 if(run.augmentFramework?.cardState)delete run.augmentFramework.cardState[p.playerId+':vampire'];
 if(p.characterId==='vampire')for(const key of ['thrallPlayerId','dominance','blood','pact','vampireProtection'])delete p.publicResources[key];
 else delete p.publicResources.vampireProtection;
}
