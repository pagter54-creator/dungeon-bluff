import {coreState,afterValidity,afterDamageBatch,incomingCoreDamage,chooseThrall} from './prophet-vampire-rework.js';
export const vampireState=coreState;
export const bloodCap=p=>p.augments?.includes('aug-319')||p.augments?.includes('aug-324')?8:6;
export function assignVampireMarks(run,cards,groups,events=[]){afterValidity(run,cards,events);}
export function performVampireSwap(run,p,actor,target,cards,events=[],state=run.combat){
 const s=coreState(run,p),key='swap:'+state.turn+':'+actor.cardInstanceId;
 if(s.claims[key])return false;
 if(p.status==='DOWNED'||target.playerId===p.playerId)throw new Error('피의 명령 대상이 올바르지 않습니다.');
 const requested=state.turnSubmissions[p.playerId]?.skillData?.thrallTargetId;
 if(requested){
  if(s.echo?.targetId===requested&&state.turn<=s.echo.expiresTurn)target=cards.find(c=>c.playerId===requested)||target;
  else if(requested!==p.publicResources.thrallPlayerId)throw new Error('피의 명령 대상이 올바르지 않습니다.');
 }
 if(target.playerId!==p.publicResources.thrallPlayerId&&target.playerId!==s.echo?.targetId)throw new Error('권속 표식이 없습니다.');
 s.claims[key]=true;actor.bloodCommandUsed=true;actor.bloodCommandTargetId=target.playerId;
 actor.ownerPreSwapWorkingNumber=actor.workingNumber;actor.receivedWorkingNumber=target.workingNumber;
 actor.dominanceBefore=p.publicResources.dominance||0;actor.swapBonusBefore=s.swapBonus||0;s.swapBonus=0;
 const before=actor.workingNumber,targetBefore=target.workingNumber;actor.workingNumber=targetBefore;target.workingNumber=before;
 delete p.publicResources.thrallPlayerId;delete s.mark;delete s.echo;delete s.thrallChoice;
 events.push({phase:'PRE_COLLISION_SWAP',effectId:'vampire-blood-command',actorId:p.playerId,targetId:target.playerId,actorBefore:before,targetBefore,actorAfter:targetBefore,targetAfter:before});

 return true;
}
export function protectVampireCollision(){}
export function resolveVampireValidity(run,cards,events=[]){afterValidity(run,cards,events);}
export function vampirePostDamage(run,cards,packets,events=[]){afterDamageBatch(run,cards,packets,events);}
export function vampirePreDown(){}
export function vampireIncomingProtection(){}
export function cleanupVampire(run,p){
 if(run.augmentFramework?.cardState)delete run.augmentFramework.cardState[p.playerId+':pvCore'];
 if(p.characterId==='vampire')for(const key of ['thrallPlayerId','dominance','blood','pact','vampireProtection'])delete p.publicResources[key];
}
export {chooseThrall};
