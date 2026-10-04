// Read-only presentation metadata captured before monster penalties reset their state.
// This module never grants resources, changes validity or executes a monster action.
export function describeMonsterPattern(run,cards,totalDamage,events=[]){
 const m=run.combat?.monster,k=m?.mechanic,s=m?.behaviorState;
 if(!m||!k||!s)return null;
 const valid=cards.filter(c=>c.valid),penalized=valid.filter(c=>c.monsterDamagePenalty>0);
 let outcome='ACTIVE',label='패턴 발동';
 const set=(o,l)=>{outcome=o;label=l;};
 const block=(label='저지 성공')=>set('BLOCKED',label),wait=(label='준비 중')=>set('WAIT',label);
 const hit=(ids,label='패턴 발동')=>{if(ids?.length)set('ACTIVE',label);else block();};
 const penalty=()=>{if(!penalized.length)block('약화 회피');else set(penalized.length<valid.length?'PARTIAL':'ACTIVE','공격 약화');};
 switch(k.type){
  case 'ARMOR_VALID_HITS':if(!s.armor&&valid.length)block('철갑 파쇄');else if(valid.length)set('PARTIAL','철갑 일부 파쇄');break;
  case 'HUNT':case 'COUNTDOWN_STRIKE':case 'PARTY_ORDER':
   if(m.intent?.type==='CHARGE')wait();else if(s.attackBlocked)block();break;
  case 'DPS_WINDOW':if(s.countdown>0)wait();else if(!s.pendingFailure)block();break;
  case 'LAST_HIGHEST_TARGET':if(m.intent?.type==='CHARGE')wait();break;
  case 'COLLISION_STACK':if(s.collisionCount===0)block('쥐떼 억제');else set('PARTIAL','쥐떼 집결');break;
  case 'VALID_GUARD':if(!s.guardPending)block('방어 저지');else label='방어 강화';break;
  case 'FORBIDDEN_NUMBER':case 'PARITY_BELL':penalty();break;
  case 'ECHO':if(!s.stacks?.echo)block('메아리 억제');else set('PARTIAL','메아리 축적');break;
  case 'DOMINION':if(valid.length>=k.requiredValidCount)set('PARTIAL','지배 약화');else label='지배 강화';break;
  case 'F2_PROPHECY':
   if(s.currentDangerNumber==null)wait('저주 예고');
   else hit(cards.filter(c=>c.finalNumber===s.currentDangerNumber),'저주 중첩');break;
  case 'F2_GROWTH':if(totalDamage>=k.minimumDamage)block('성장 저지');else label='성장';break;
  case 'F2_SPORE':hit(cards.filter(c=>c.invalidReason==='COLLISION'),'포자 중첩');break;
  case 'F2_LEECH':if(s.targetBlocked)block('흡혈 저지');else label='흡혈 발동';break;
  case 'F2_COPY':penalty();break;
  case 'F2_FLAME':hit(s.pendingHits,'늪불 반격');break;
  case 'F2_THORNS':if(!s.thornsActive)wait('가시 비활성');else hit(s.pendingHits,'가시 반격');break;
  case 'F2_CHAOS':if(s.chaosRule==='VALID_SUM'){if(!s.chaosFailure)block();else label='혼돈 반격';}else penalty();break;
  case 'F2_HYDRA':
   if(events.some(e=>e.type==='HYDRA_HEAD_REMOVED'))set(s.heads?'PARTIAL':'BLOCKED',s.heads?'머리 제거 · 부분 저지':'머리 제거 완료');
   else if(!s.heads)wait('머리 제거 완료');else label='머리 유지';break;
  case 'F2_THREAD':{const e=events.find(e=>e.type==='THREAD_RESOLVED');if(!e)wait('실타래 연결');else if(e.broken)block('실타래 절단');else label='실타래 유지';break;}
  case 'F2_CORRUPTION':hit(events.filter(e=>e.type==='CORRUPTION_APPLIED'),'오염 중첩');break;
  case 'F2_MOON':if(s.thresholdPassed)block('달 조건 달성');else label='달 조건 실패';break;
  case 'F3_GREED':if(!s.greedActive)wait('탐욕 비활성');else hit(s.pendingHits,'탐욕 반격');break;
  case 'F3_TAX':if(s.validSum>=k.requiredSum)block('징수 저지');else label='징수 발동';break;
  case 'F3_DUEL':hit(s.pendingHits,'결투 실패');if(!s.pendingHits.length)label='결투 승리';break;
  case 'F3_CHOIR':if(!s.pendingAoe)block('성가 저지');else label='성가 발동';break;
  case 'F3_SKILL_FEED':if(!events.some(e=>e.type==='SKILL_FEED'))block('기술먹이 억제');else label='기술 흡수';break;
  case 'F3_ARCHIVIST':case 'F3_APPRAISAL':case 'F3_NULL':penalty();break;
  case 'F3_EXECUTION':if(!s.executionReady)wait('처형 준비');else if(s.progress>=k.requiredHits)block('처형 취소');else label='처형 실패';break;
  case 'F3_AUDIT':if(s.pendingHits?.length)label='감사 발동';else wait('감사 진행');break;
  case 'F3_ADAPT':
   if(!s.adaptation)wait('전략 관찰');else if(s.misses)set('PARTIAL','전략 변경 진행');
   else if(penalized.length||s.pendingHits?.length)label='적응 발동';else wait('적응 관찰');break;
  case 'F3_MASK':
   if(s.mask==='HUMILITY')penalty();
   else if(s.mask==='DISCORD'){if(!s.collisionCount)block('불화 저지');else label='불화 방어';}
   else hit(s.pendingHits,s.mask==='SILENCE'?'침묵 반격':'탐욕 반격');break;
  default:wait('패턴 판정');
 }
 const targetIds=[...new Set([s.targetPlayerId,s.lastHighestPlayerId,m.intent?.payload?.targetPlayerId,...(s.linkedPlayerIds||[]),...(s.pendingHits||[])].filter(Boolean))];
 return {outcome,label,targetIds,mechanicType:k.type,detail:m.presentation?.statusText||'',phase:'MONSTER_PATTERN'};
}

export function describeResolvedSkills(run,cards){
 const out=[],state=run.augmentFramework?.cardState||{};
 for(const p of run.players||[]){
  const prediction=state[p.playerId+':seer']?.prediction;
  if(p.characterId==='prophet'&&prediction?.evaluatedTurn===run.combat?.turn&&typeof prediction.success==='boolean')
   out.push({actorId:p.playerId,kind:'PREDICTION_RESULT',success:prediction.success});
  const gunner=state[p.playerId+':gunner'];
  if(p.characterId==='gunner'&&cards.some(c=>c.playerId===p.playerId&&c.skillUsed==='precision_shot'&&c.invalidReason==='COLLISION')&&gunner?.aug253?.preservedForCycleId!=null)
   out.push({actorId:p.playerId,kind:'PRECISION_PRESERVED',success:true});
 }
 return out;
}
