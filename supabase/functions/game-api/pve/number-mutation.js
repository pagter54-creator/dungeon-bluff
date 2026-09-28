const cardByPlayer=(cards,playerId)=>cards.find(card=>card.playerId===playerId)||null;
const playerById=(run,playerId)=>run.players.find(player=>player.playerId===playerId)||null;
const seatOf=(run,playerId)=>playerById(run,playerId)?.seat??Number.MAX_SAFE_INTEGER;
const sortedIds=(run,ids)=>[...ids].sort((a,b)=>seatOf(run,a)-seatOf(run,b)||a.localeCompare(b));

export const NUMBER_MUTATION_PHASES=Object.freeze([
  'BASE_NUMBER',
  'SELF_MODIFY',
  'PRE_COLLISION_SWAP',
  'PRE_COLLISION_STEAL',
  'FINAL_NUMBER',
  'COLLISION_GROUP',
  'COLLISION_RESOLUTION',
  'VALIDITY',
  'DAMAGE'
]);

export function initializeNumberHistories(cards){
  for(const card of cards){
    card.workingNumber=card.baseNumber;
    card.finalNumber=card.baseNumber;
    card.numberHistory={
      playerId:card.playerId,
      cardInstanceId:card.cardInstanceId,
      baseNumber:card.baseNumber,
      selfModifiedNumber:card.baseNumber,
      postSwapNumber:card.baseNumber,
      postStealNumber:card.baseNumber,
      finalNumber:card.baseNumber,
      collisionGroup:[card.playerId],
      collisionImmune:false,
      valid:true,
      damage:0
    };
  }
}
export function recordSelfModification(cards,events){
  for(const card of cards){
    card.numberHistory.selfModifiedNumber=card.workingNumber;
    card.numberHistory.postSwapNumber=card.workingNumber;
    card.numberHistory.postStealNumber=card.workingNumber;
    card.numberHistory.finalNumber=card.workingNumber;
    if(card.skillUsed==='reverse_math'&&card.skillValue){
      events.push({
        phase:'SELF_MODIFY',effectId:'aug-111-reverse-math',actorId:card.playerId,
        before:card.baseNumber,after:card.workingNumber,
        manaSpent:card.resourceSpent,direction:Math.sign(card.skillValue)
      });
    }else if(card.skillUsed==='amplify'&&card.skillValue){
      events.push({
        phase:'SELF_MODIFY',effectId:'mage-amplify',actorId:card.playerId,
        before:card.baseNumber,after:card.workingNumber,manaSpent:card.resourceSpent
      });
    }
  }
}
export function applyPreCollisionSwap(run,cards,events,state=run.combat){
  const vampires=run.players.filter(p=>p.characterId==='vampire'&&p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat);
  for(const vampire of vampires){
    const submission=state.turnSubmissions[vampire.playerId];
    if(!submission?.skillIntent)continue;
    const actor=cardByPlayer(cards,vampire.playerId);
    const targetId=vampire.publicResources.thrallPlayerId;
    const target=targetId?cardByPlayer(cards,targetId):null;
    if(!actor||!target)throw new Error('피의 명령 대상이 이번 턴 판정에 없습니다.');
    const priv=state.privateByPlayer[vampire.playerId];
    const cycleIndex=priv?.cycleIndex||1;
    if(vampire.augments.includes('aug-301')&&priv.bloodCommandUsedCycle===cycleIndex)throw new Error('완전한 권속의 피의 명령은 사이클당 1회만 사용할 수 있습니다.');
    const actorBefore=actor.workingNumber,targetBefore=target.workingNumber;
    actor.workingNumber=targetBefore;target.workingNumber=actorBefore;
    actor.bloodCommandUsed=true;actor.bloodCommandTargetId=target.playerId;
    actor.dominanceBefore=Math.max(0,Number(vampire.publicResources.dominance)||0);
    if(vampire.augments.includes('aug-301'))priv.bloodCommandUsedCycle=cycleIndex;
    delete vampire.publicResources.thrallPlayerId;
    actor.numberHistory.postSwapNumber=actor.workingNumber;
    target.numberHistory.postSwapNumber=target.workingNumber;
    for(const card of cards)if(card!==actor&&card!==target)card.numberHistory.postSwapNumber=card.workingNumber;
    events.push({
      phase:'PRE_COLLISION_SWAP',effectId:'vampire-blood-command',
      actorId:vampire.playerId,targetId:target.playerId,
      actorBefore,targetBefore,actorAfter:actor.workingNumber,targetAfter:target.workingNumber
    });
  }
  for(const card of cards)card.numberHistory.postSwapNumber=card.workingNumber;
}
export function applyPreCollisionSteal(run,cards,events){
  const imps=run.players.filter(p=>p.characterId==='imp'&&p.status!=='DOWNED'&&cardByPlayer(cards,p.playerId)).sort((a,b)=>a.seat-b.seat);
  if(imps.length>1)throw new Error('MULTI_IMP_STEAL_UNDEFINED');
  if(!imps.length){for(const card of cards)card.numberHistory.postStealNumber=card.workingNumber;return;}
  const imp=imps[0],actor=cardByPlayer(cards,imp.playerId);
  const actorStart=actor.workingNumber;
  const targets=cards
    .filter(card=>card.playerId!==imp.playerId&&playerById(run,card.playerId)?.characterId!=='imp'&&card.workingNumber===actorStart)
    .sort((a,b)=>seatOf(run,a.playerId)-seatOf(run,b.playerId)||a.playerId.localeCompare(b.playerId));
  let total=0;
  actor.stealTargets=[];
  for(const target of targets){
    const before=target.workingNumber;
    const stolen=Math.min(1,Math.max(0,before));
    if(stolen<=0)continue;
    target.workingNumber=before-stolen;total+=stolen;
    actor.stealTargets.push(target.playerId);
    events.push({
      phase:'PRE_COLLISION_STEAL',effectId:'imp-steal',actorId:imp.playerId,targetId:target.playerId,
      before,after:target.workingNumber,stolen
    });
  }
  actor.workingNumber=actorStart+total;
  actor.stealTotal=total;
  actor.stealTargetCount=actor.stealTargets.length;
  actor.greedGained=total;
  imp.publicResources.greed=total;
  if(total>0)events.push({
    phase:'PRE_COLLISION_STEAL',effectId:'imp-steal-summary',actorId:imp.playerId,
    before:actorStart,after:actor.workingNumber,totalActuallyStolen:total,targetIds:[...actor.stealTargets]
  });
  for(const card of cards)card.numberHistory.postStealNumber=card.workingNumber;
}
export function finalizeNumbers(cards){
  for(const card of cards){
    card.finalNumber=card.workingNumber;
    card.numberHistory.finalNumber=card.finalNumber;
  }
}
export function attachCollisionGroups(run,cards,groups){
  for(const group of groups.values()){
    const ids=sortedIds(run,group.map(card=>card.playerId));
    for(const card of group){
      card.collisionGroup=[...ids];
      card.collisionGroupSize=ids.length;
      card.numberHistory.collisionGroup=[...ids];
      card.numberHistory.collisionImmune=Boolean(card.collisionImmune);
    }
  }
}
export function attachValidity(cards){
  for(const card of cards){
    card.numberHistory.collisionImmune=Boolean(card.collisionImmune);
    card.numberHistory.valid=Boolean(card.valid);
  }
}
export function attachDamage(cards,packets){
  for(const card of cards){
    card.numberHistory.damage=(packets||[])
      .filter(packet=>packet.sourcePlayerId===card.playerId&&packet.sourceCardId===card.cardInstanceId&&!packet.followUp)
      .reduce((sum,packet)=>sum+(Number(packet.amount)||0),0);
  }
}
export function assignVampireThralls(run,cards,groups,events){
  const collisionExists=[...groups.values()].some(group=>group.length>1);
  if(!collisionExists)return;
  for(const vampire of run.players.filter(p=>p.characterId==='vampire'&&p.status!=='DOWNED').sort((a,b)=>a.seat-b.seat)){
    if(vampire.publicResources.thrallPlayerId)continue;
    const candidates=run.players
      .filter(p=>p.playerId!==vampire.playerId&&p.status!=='DOWNED')
      .sort((a,b)=>(b.growthExp-a.growthExp)||(a.seat-b.seat)||a.playerId.localeCompare(b.playerId));
    const target=candidates[0];if(!target)continue;
    vampire.publicResources.thrallPlayerId=target.playerId;
    events.push({type:'THRALL_MARKED',playerId:vampire.playerId,targetId:target.playerId,growthExp:target.growthExp});
  }
}
export function validateNumberMutationState(run,cards,events,{minimum=0,packets=[]}={}){
  for(const card of cards){
    const h=card.numberHistory;
    for(const field of ['baseNumber','selfModifiedNumber','postSwapNumber','postStealNumber','finalNumber']){
      if(!Number.isFinite(h?.[field])||!Number.isInteger(h[field]))throw new Error(`NUMBER_01_INVALID_INTEGER:${card.playerId}:${field}`);
    }
    if(h.finalNumber!==card.finalNumber||h.postStealNumber!==card.finalNumber)throw new Error(`NUMBER_02_FINAL_MISMATCH:${card.playerId}`);
    const primary=(packets||[]).find(packet=>packet.sourcePlayerId===card.playerId&&packet.sourceCardId===card.cardInstanceId&&!packet.followUp);
    if(card.valid&&primary&&primary.numberUsed!==card.finalNumber)throw new Error(`NUMBER_03_DAMAGE_NUMBER_MISMATCH:${card.playerId}`);
    if(h.postStealNumber<minimum)throw new Error(`NUMBER_06_BELOW_MINIMUM:${card.playerId}`);
    const owner=playerById(run,card.playerId);
    if(!owner?.cardPool.some(x=>x.id===card.cardInstanceId))throw new Error(`NUMBER_04_OWNERSHIP_CHANGED:${card.playerId}`);
  }
  const stealEvents=(events||[]).filter(e=>e.phase==='PRE_COLLISION_STEAL'&&e.effectId==='imp-steal');
  const summaries=(events||[]).filter(e=>e.phase==='PRE_COLLISION_STEAL'&&e.effectId==='imp-steal-summary');
  if(summaries.length>1)throw new Error('NUMBER_07_STEAL_REENTERED');
  if(summaries.length){
    const stolen=stealEvents.reduce((sum,e)=>sum+(Number(e.stolen)||0),0);
    if(stolen!==summaries[0].totalActuallyStolen)throw new Error('NUMBER_05_STEAL_CONSERVATION');
  }
  const uniqueMutationKeys=new Set();
  for(const event of events||[]){
    if(!['SELF_MODIFY','PRE_COLLISION_SWAP','PRE_COLLISION_STEAL'].includes(event.phase))continue;
    if(event.effectId==='imp-steal-summary')continue;
    const key=`${event.phase}:${event.effectId}:${event.actorId||''}:${event.targetId||''}`;
    if(uniqueMutationKeys.has(key))throw new Error('NUMBER_07_DUPLICATE_MUTATION');
    uniqueMutationKeys.add(key);
  }
  const phaseOrder=Object.fromEntries(NUMBER_MUTATION_PHASES.map((phase,index)=>[phase,index]));
  let previous=-1;
  for(const event of events||[]){
    if(!(event.phase in phaseOrder))continue;
    const index=phaseOrder[event.phase];
    if(index<previous)throw new Error('NUMBER_08_PHASE_REENTRY');
    previous=index;
  }
  return true;
}
