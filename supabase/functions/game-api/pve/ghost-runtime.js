import {recordEffectTelemetry} from './telemetry.js';
const has=(p,n)=>p.augments?.includes('aug-'+n),isGhost=p=>p.characterId==='demon_swordsman',active=run=>run.phase==='COMBAT';
const root=(run,p,c)=>'action:'+run.combat.id+':'+run.combat.turn+':'+p.playerId+':'+(c?.cardInstanceId||'system');
export function ghostState(run,p){
 run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};run.augmentFramework.cardState||={};
 const key=p.playerId+':ghost',scope=run.combat?.id||run.currentRoomNodeId||run.phase;let s=run.augmentFramework.cardState[key];
 if(!s||s.scope!==scope)s=run.augmentFramework.cardState[key]={scope,turn:0,guards:{},metrics:{},windows:{},effectiveLevel:0,nextValid:0,madness:0,madnessFrom:0,dance:0,transformedStreak:0,normalStreak:0,firstTransformed:false,exitCharges:0,serial:0,gained:0,previousGain:0,slashThisTurn:false,extra:{},processed:{},transformActions:{}};
 p.persistentCharacterState||={};p.persistentCharacterState.ghostHunger||={noGain:0,slashIdle:0};return s;
}
function tick(run,p){const s=ghostState(run,p),turn=run.combat?.turn||0;if(s.turn!==turn){s.previousGain=s.gained;s.gained=0;s.slashThisTurn=false;s.turn=turn;for(const k of Object.keys(s.guards))if(!k.endsWith(':'+turn))delete s.guards[k];s.processed={};s.extra={};}return s;}
function mark(run,p,n,branch=''){const s=tick(run,p),key=n+':'+branch+':'+run.combat.turn;if(s.guards[key])return false;s.guards[key]=true;s.metrics[n]=(s.metrics[n]||0)+1;recordEffectTelemetry(run,{id:'aug-'+n},p.playerId,true);return true;}
export const ghostThreshold=(run,p)=>active(run)?has(p,348)?4:has(p,342)?5:has(p,341)?6:8:8;
function levelChanged(run,p,before,after,events,context,externalLevels=0){
 if(after===before)return;const s=tick(run,p);
 if(after>before){const wasReady=p.publicResources.ghostSlashReady===true;p.publicResources.ghostSlashReady=true;
 for(let level=before+1;level<=after;level++)events.push({type:'GHOST_SLASH_LEVEL_UP',playerId:p.playerId,before:level-1,after:level,devour:p.publicResources.devour,reason:context.reason||'DEVOUR',rootActionId:context.rootActionId||null,recoveryChainId:context.recoveryChainId||null,sourceEffectId:context.sourceEffectId||'DEMON_BASE',parentEventId:context.parentEventId||null,chainDepth:2,reactivated:!wasReady&&level===before+1});
 if(!wasReady)events.push({type:'GHOST_SLASH_REACTIVATED',playerId:p.playerId,skillId:'ghost_slash',stateBefore:'USED',stateAfter:'READY',reactivationReason:'LEVEL_UP',levelBefore:before,levelAfter:after,devourAfter:p.publicResources.devour,rootActionId:context.rootActionId||null,recoveryChainId:context.recoveryChainId||null,chainDepth:2,parentEventId:context.parentEventId||null,sourceEffectId:context.sourceEffectId||'DEMON_BASE'});
 if(active(run)&&has(p,344)&&mark(run,p,344)){s.windows.level={damage:1,start:run.combat.turn+1,end:run.combat.turn+2};}
 }else events.push({type:'GHOST_SLASH_LEVEL_DROPPED',playerId:p.playerId,before,after,reason:'HUNGER'});
 if(active(run)&&has(p,350)&&mark(run,p,350)){s.madness=Math.min(3,s.madness+1);s.madnessFrom=run.combat.turn+1;}
}
export function ghostGain(run,p,amount,events=[],context={}){
 if(!isGhost(p)||amount<=0)return 0;const s=tick(run,p),guard=context.rootActionId&&context.rootActionId+':'+(context.reason||'GAIN');
 if(guard&&s.processed[guard])return 0;if(guard)s.processed[guard]=true;
 const before=Math.max(0,Number(p.publicResources.devour)||0),gain=Math.max(0,Number(amount)||0),total=before+gain,eventId=guard?'devour:'+context.rootActionId+':'+(context.reason||'VALID_ATTACK')+':'+before+'->'+total:null;
 p.publicResources.devour=total;
 events.push({type:'DEVOUR_GAINED',eventId,playerId:p.playerId,before,after:total,amount:gain,reason:context.reason||'VALID_ATTACK',rootActionId:context.rootActionId||null,recoveryChainId:context.recoveryChainId||null,sourceEffectId:context.sourceEffectId||'DEMON_BASE',chainDepth:1});
 if(active(run)){s.gained+=gain;p.persistentCharacterState.ghostHunger.noGain=0;
 if(has(p,345)&&s.gained+s.previousGain>=3){s.effectiveLevel=1;mark(run,p,345);}
 }
 if(has(p,351)){p.publicResources.transformationPending=!p.publicResources.transformationActive&&total>=6;return gain;}
 const threshold=ghostThreshold(run,p),oldLevel=Math.max(0,Number(p.publicResources.ghostSlashLevel)||0),externalLevels=Math.floor(total/threshold);
 p.publicResources.devour=total%threshold;let levels=externalLevels;
 if(active(run)&&has(p,338)&&externalLevels>0){const carry=externalLevels*2,carryTotal=p.publicResources.devour+carry;levels+=Math.floor(carryTotal/threshold);p.publicResources.devour=carryTotal%threshold;mark(run,p,338);events.push({type:'DEVOUR_CARRY_GAINED',playerId:p.playerId,amount:carry,externalLevels,recursive:false});}
 p.publicResources.ghostSlashLevel=oldLevel+levels;if(active(run)&&has(p,335)&&externalLevels>0)mark(run,p,335);
 levelChanged(run,p,oldLevel,p.publicResources.ghostSlashLevel,events,{...context,parentEventId:eventId},externalLevels);return gain;
}
export function ghostResolve(run,p,c,submission,events=[]){
 if(!isGhost(p)||!active(run))return;const s=tick(run,p),r=root(run,p,c);if(s.processed['validity:'+r])return;s.processed['validity:'+r]=true;
 c.ghostLevelBefore=Math.max(0,Number(p.publicResources.ghostSlashLevel)||0);c.ghostBonus=0;c.ghostExtra=0;
 if(!c.valid){s.normalStreak=0;s.transformedStreak=0;s.dance=0;return;}
 const slash=!has(p,351)&&Boolean(submission?.skillIntent),transformed=Boolean(p.publicResources.transformationActive);
 if(slash){c.skillUsed='ghost_slash';c.ghostSlashBonusDamage=c.ghostLevelBefore+1+s.effectiveLevel;p.publicResources.ghostSlashReady=false;s.slashThisTurn=true;
 if(s.effectiveLevel){s.effectiveLevel=0;mark(run,p,345,'consume');}events.push({type:'GHOST_SLASH_USED',playerId:p.playerId,level:c.ghostLevelBefore,bonusDamage:c.ghostSlashBonusDamage});
 }
 if(s.nextValid){c.ghostBonus+=s.nextValid;s.nextValid=0;mark(run,p,346,'consume');}
 if(s.madness&&run.combat.turn>=s.madnessFrom)c.ghostBonus+=s.madness;
 for(const [key,w] of Object.entries(s.windows)){if(run.combat.turn>w.end){delete s.windows[key];continue;}if(run.combat.turn>=w.start&&(key!=='normal'||!slash&&!transformed))c.ghostBonus+=w.damage;}
 const hp=run.combat.monster.hp,max=run.combat.monster.maxHp;c.ghostHalf=hp*2<=max;c.ghostQuarter=hp*4<=max;
 if(slash&&c.ghostHalf&&has(p,336)){c.ghostBonus+=2;}
 if(slash&&c.ghostQuarter&&has(p,339)){c.ghostBonus+=5;mark(run,p,339,'damage');}
 if(!slash&&!transformed&&c.ghostLevelBefore>=3&&has(p,340)){c.ghostBonus+=2;mark(run,p,340);}
 if(transformed){s.transformedStreak++;s.normalStreak=0;
 if(s.firstTransformed){s.firstTransformed=false;if(has(p,353)){c.ghostBonus+=2;mark(run,p,353);}}
 if(has(p,356)){s.dance=Math.min(3,s.dance+1);c.ghostBonus+=2*s.dance;mark(run,p,356);}
 if(has(p,359)&&s.transformedStreak%3===0){c.ghostExtra=3;mark(run,p,359);}
 }else{s.normalStreak++;s.transformedStreak=0;s.dance=0;if(s.exitCharges>0&&has(p,360)){c.ghostBonus+=2;s.exitCharges--;mark(run,p,360,'consume');}}
}
export function ghostPostDamage(run,cards,packets,events=[]){
 if(!active(run))return;const killed=run.combat.monster.hp<=0,damage={};
 for(const packet of packets)if(!packet.followUp)damage[packet.sourcePlayerId]=(damage[packet.sourcePlayerId]||0)+Math.max(0,Number(packet.amount)||0);
 const top=Math.max(0,...Object.values(damage));
 for(const c of cards){const p=run.players.find(x=>x.playerId===c.playerId);if(!isGhost(p))continue;const s=tick(run,p),r=root(run,p,c);if(!c.valid||s.processed['post:'+r])continue;s.processed['post:'+r]=true;
 const slash=c.skillUsed==='ghost_slash',contributed=(damage[p.playerId]||0)>0,jointTop=contributed&&damage[p.playerId]===top;
 let gain=killed&&contributed?(jointTop?8:4):1;
 if(killed&&contributed)events.push({type:'DEVOUR_KILL_AWARD',playerId:p.playerId,totalAward:gain,topDamage:jointTop,turnDamage:damage[p.playerId]});
 const extra=(n,amount)=>{if(has(p,n)&&mark(run,p,n))gain+=amount;};
 if(slash){extra(331,1);extra(334,2);extra(347,3);if(has(p,343)){p.persistentCharacterState.ghostHunger.noGain=0;mark(run,p,343);}
 if(has(p,337)&&mark(run,p,337))s.windows.normal={damage:2,start:run.combat.turn+1,end:run.combat.turn+2};
 if(has(p,349)&&((damage[p.playerId]||0)>=6||killed&&contributed)){extra(349,3);p.persistentCharacterState.ghostHunger.noGain=0;}
 if(has(p,339)&&c.ghostQuarter&&killed&&contributed)extra(339,3);
 }else if(!p.publicResources.transformationActive)extra(332,1);
 if(killed&&contributed)extra(333,2+(jointTop?1:0));
 if(c.ghostHalf)extra(336,1);
 if(has(p,351)){extra(352,1);if(!p.publicResources.transformationActive&&s.normalStreak>=2)extra(354,1);}
 ghostGain(run,p,gain,events,{rootActionId:r,recoveryChainId:'reactivation:'+r,reason:killed&&contributed?'KILL_TOTAL':'VALID_ATTACK',sourceEffectId:'DEMON_BASE'});
 }
}
export function ghostTurnEnd(run,p,events=[]){
 if(!isGhost(p)||!active(run)||has(p,351))return;const s=tick(run,p);if(s.processed['turn-end:'+run.combat.turn])return;s.processed['turn-end:'+run.combat.turn]=true;
 const h=p.persistentCharacterState.ghostHunger;if(s.slashThisTurn)h.slashIdle=0;else h.slashIdle++;
 if(s.gained>0)h.noGain=0;else h.noGain++;
 let limit=has(p,342)?2:has(p,341)?3:Infinity;
 if(has(p,348)&&Number(p.publicResources.ghostSlashLevel)>=3)limit=2;
 if(has(p,347)&&h.slashIdle>=3&&Number.isFinite(limit))limit=Math.max(1,limit-1);
 const before=Math.max(0,Number(p.publicResources.ghostSlashLevel)||0);
 if(h.noGain>=limit){h.noGain=0;p.publicResources.ghostSlashLevel=Math.max(0,before-1);
 if(before>0){if(has(p,346)){s.nextValid=Math.max(1,s.nextValid);mark(run,p,346);}levelChanged(run,p,before,p.publicResources.ghostSlashLevel,events,{reason:'HUNGER'});}
 }
}
function replacePool(run,p,priv,numbers,source,serial){
 const cycle=(priv.cycleIndex||1)+1;p.cardPool=numbers.map((baseNumber,i)=>({id:p.playerId+':ghost:'+run.combat.id+':'+serial+':'+source+':'+i,baseNumber,source,tags:source==='DEMON_TRANSFORM'?['TEMPORARY','TRANSFORMED']:[]}));
 priv.cycleIndex=cycle;priv.remainingCardIds=p.cardPool.map(c=>c.id);priv.spentCardIds=[];delete priv.selectedCardId;delete priv.skillIntent;
 delete priv.demonNormalCardPool;delete priv.demonNormalRemaining;delete priv.demonNormalSpent;delete priv.demonNormalCycleIndex;
 if(run.cardCycles)run.cardCycles[p.playerId]=structuredClone(priv);
}
export function activateGhostTransformation(run,p){
 const c=run.combat,priv=c?.privateByPlayer?.[p.playerId];if(!isGhost(p)||!has(p,351)||!active(run)||c?.phase!=='SELECTION_OPEN'||!priv||p.status==='DOWNED'||c.turnSubmissions[p.playerId]){const e=new Error('귀화는 카드 확정 제출 전에 사용합니다.');e.code='INVALID_PHASE';throw e;}
 const s=tick(run,p),key=c.turn+':'+(priv.cycleIndex||1);
 if(p.publicResources.transformationActive){const e=new Error('이미 귀화 상태입니다.');e.code='ALREADY_USED';throw e;}
 if(Number(p.publicResources.devour)<6){const e=new Error('귀화에 필요한 포식 6이 없습니다.');e.code='INSUFFICIENT_RESOURCE';throw e;}
 if(s.transformActions[key])return s.transformActions[key];
 const before=p.publicResources.devour;p.publicResources.devour-=6;p.publicResources.transformationActive=true;p.publicResources.transformationPending=false;p.publicResources.ghostSlashReady=false;
 const pool=has(p,358)?[3,4,5,6,6]:has(p,355)?[2,3,4,5,6]:[2,4,5,6];s.serial++;replacePool(run,p,priv,pool,'DEMON_TRANSFORM',s.serial);
 s.firstTransformed=true;s.dance=0;s.transformedStreak=0;s.normalStreak=0;s.exitCharges=0;
 mark(run,p,351);if(has(p,355)&&!has(p,358))mark(run,p,355);if(has(p,358))mark(run,p,358);
 const event={type:'DEMON_TRANSFORMED',playerId:p.playerId,turn:c.turn,devourBefore:before,devourAtTransform:p.publicResources.devour,spentDevour:6,cardNumbers:pool,serial:s.serial,manual:true};
 s.transformActions={};s.transformActions[key]=event;c.pendingSkillEvents||=[];c.pendingSkillEvents.push(event);return event;
}
export function ghostCycleExit(run,p,priv,events=[]){
 if(!isGhost(p)||!has(p,351)||!p.publicResources.transformationActive||priv.remainingCardIds.length)return false;
 const s=tick(run,p);p.publicResources.transformationActive=false;p.publicResources.transformationPending=false;p.publicResources.devour=has(p,357)||has(p,360)?2:0;
 s.dance=0;s.transformedStreak=0;s.firstTransformed=false;s.normalStreak=0;s.exitCharges=has(p,360)?2:0;
 if(has(p,357))mark(run,p,357);if(has(p,360))mark(run,p,360,'exit');
 replacePool(run,p,priv,[1,2,3,4,4],'BASE',++s.serial);events.push({type:'DEMON_TRANSFORMATION_ENDED',playerId:p.playerId,devour:p.publicResources.devour,normalCycle:priv.cycleIndex});return true;
}
export function cleanupGhost(run,p){
 if(!isGhost(p))return;const priv=run.combat?.privateByPlayer?.[p.playerId],s=ghostState(run,p);
 if(has(p,351)){p.publicResources.devour=0;p.publicResources.transformationActive=false;p.publicResources.transformationPending=false;
 if(priv&&(p.cardPool||[]).some(c=>c.source==='DEMON_TRANSFORM'))replacePool(run,p,priv,[1,2,3,4,4],'BASE',++s.serial);}
 delete run.augmentFramework.cardState[p.playerId+':ghost'];
}
