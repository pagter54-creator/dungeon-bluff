// Version-two room rules; running older expeditions retain their original rules.
export const EVENT_RULES={
 pressure_plate:['압력판 회랑','유효 합 8 이상: 전원 +2G · 안전한 발걸음. 실패: 무작위 1명 HP −1.'],
 overload_device:['과부하 장치','유효 합 9 이하: 안정된 동력. 초과: 최고 유효 카드 HP −1 · 전원 +2G.'],
 twin_statues:['쌍둥이 석상','유효 숫자 정확히 2종: 쌍둥이의 가호. 실패: 최고·최저 유효 카드 HP −1.'],
 collapsing_bridge:['붕괴하는 다리','최저 유효 카드는 선두 획득. 그보다 높은 유효 카드 중 1명 HP −1.'],
 greedy_chest:['탐욕의 상자','최고 유효 카드 +6G · 탐욕의 여운.'],
 humble_chest:['겸손한 상자','최저 유효 카드 +2G · 겸손의 여운.'],
 balance_vault:['균형의 보물고','유효 합 10: 전원 +2G · 균형. 실패: 최고 유효 카드 +2G.'],
 cursed_safe:['저주받은 금고','최고 유효 카드 +6G · 금고의 저주.'],
 healing_spring:['치유의 샘','최저 유효 카드 HP +1 · 맑은 정신.'],
 shared_supplies:['공동 식량 창고','유효 합 7~9: 최저 HP 1명 회복. 10 이상: 2명 회복 · 든든함.'],
 field_clinic:['야전 치료소','최고·최저 유효 카드 HP +1.'],
 suspicious_merchant:['수상한 상인','유효 카드 1~2: 지도 1G / 3~4: 주사위 2G / 5 이상: 부적 3G.'],
 gamblers_altar:['도박꾼의 제단','유효 카드 숫자만큼 추첨 가중치. 당첨: 즉시 4G 또는 다음 전투 생존 시 7G.'],
 ancient_gate:['고대의 문','유효 합 정확히 7: 다음 방 종류를 선택.'],
 suspicious_offer:['수상한 제안','큰 숫자를 내면 귀한 제안을 받을 것 같습니다.'],
 truce_offer:['휴전 제안','네 숫자가 모두 다르면 전원 +2G · 휴전. 실패 페널티 없음.'],
};
export const ECHOES={
 footsteps:['안전한 발걸음','combat','다음 전투의 첫 공격 카운트 진행을 한 번 멈춥니다.'],
 power:['안정된 동력','combat','다음 전투 첫 턴에는 중복 카드도 유효합니다.'],
 twins:['쌍둥이의 가호','combat','다음 전투 첫 턴 유효 숫자가 2종이면 공격 카운트를 멈춥니다.'],
 lead:['선두','combat','다음 전투 첫 턴에 제출한 카드를 한 번 바꿀 수 있습니다.'],
 greed:['탐욕의 여운','combat','다음 전투 첫 턴 최고 유효 카드가 +2G를 받습니다.'],
 humility:['겸손의 여운','combat','다음 전투 첫 턴 최저 유효 카드가 HP 1을 회복합니다.'],
 balance:['균형','combat','다음 전투 첫 턴 최고·최저 유효 숫자 차이가 2 이하면 공격 카운트를 멈춥니다.'],
 curse:['금고의 저주','combat','다음 전투 첫 턴 중복이 발생하면 공격 카운트가 1 더 진행됩니다.'],
 clarity:['맑은 정신','combat','다음 전투에서 처음 중복이 발생한 턴의 중복을 무시합니다.'],
 hearty:['든든함','combat','다음 전투 첫 기본 공격의 피해 대상이 1명 줄어듭니다.'],
 shield:['철제 부적','combat','다음 전투에서 자신의 첫 피해를 무효화합니다.'],
 map:['낡은 지도','room','다음 방 종류를 미리 확인합니다.'],
 dice:['행운의 주사위','event','다음 이벤트에서 제출한 카드를 한 번 바꿀 수 있습니다.'],
 doubt:['의심','event','다음 이벤트 시작 시 실제 조건을 확인합니다.'],
 truce:['휴전','combat','다음 전투 첫 턴 공격 카운트가 진행되지 않습니다.'],
 bet:['한 번 더 걸기','combat','다음 전투 종료 시 기절하지 않았다면 +7G를 받습니다.'],
};
export const isCombat=stage=>['monster','boss'].includes(stage.category);
const family=stage=>isCombat(stage)?'combat':'event';
export function validRhythm(stages){return stages.every((s,i)=>i<2||family(s)!==family(stages[i-1])||family(s)!==family(stages[i-2]));}
// Backtracking viability check prevents a forced run at the end of the pool.
export function rhythmOrder(stages,boss,rng=Math.random,prefix=[]){
 const walk=(pool,done)=>{
  if(!pool.length)return validRhythm([...prefix,...done,boss])?done:null;
  const groups=['combat','event'].map(kind=>({kind,items:pool.filter(s=>family(s)===kind)})).filter(g=>g.items.length);
  const last=[...prefix,...done].at(-1);const weights=groups.map(g=>g.items.length*(last&&family(last)===g.kind ? .35 : 1));
  let roll=rng()*weights.reduce((a,b)=>a+b,0),first=weights.findIndex(w=>(roll-=w)<=0);if(first<0)first=0;
  for(const g of [groups[first],...groups.filter((_,i)=>i!==first)]){
   const item=g.items[Math.floor(rng()*g.items.length)];if(!validRhythm([...prefix,...done,item]))continue;
   const result=walk(pool.filter(s=>s!==item),[...done,item]);if(result)return result;
  }return null;
 };return walk([...stages],[])||null;
}
export function echoList(s){return [s.echo,...Object.values(s.personalEchoes||{})].filter(Boolean);}
function log(s,echo,status){(s.echoLog||=[]).push({id:echo.id,name:ECHOES[echo.id][0],description:ECHOES[echo.id][2],memberId:echo.memberId||null,status});}
export function removeEcho(s,e,status='소멸'){log(s,e,status);if(e.memberId)delete s.personalEchoes[e.memberId];else s.echo=null;}
export function giveEcho(session,id,memberId){
 const s=session.state,old=memberId?s.personalEchoes?.[memberId]:s.echo;
 if(old)removeEcho(s,old,'교체');
 const e={id,memberId:memberId||null,createdStage:session.stage_index,activeStage:null};
 if(memberId)(s.personalEchoes||={})[memberId]=e;else s.echo=e;log(s,e,'획득');
}
export function beginEchoStage(session){
 const s=session.state;s.echoLog=[];s.selectionHolds={};s.roomChoices={};s.roomInfo=null;
 s.stageStartPlayers=Object.fromEntries(Object.entries(s.players).map(([id,p])=>[id,{hp:p.hp,score:p.score,gold:p.gold}]));
 for(const e of echoList(s))if(e.createdStage<session.stage_index){
  const target=ECHOES[e.id][1];if(target==='room'||target===family(s.currentStage))e.activeStage=session.stage_index;
  if(e.activeStage===session.stage_index&&e.id==='doubt'){
   s.roomInfo=s.currentStage.contentId==='suspicious_offer'?'실제 보상: 최저 유효 카드 +2G · 의심 획득.':s.currentStage.rule;
   removeEcho(s,e,'공개');
  }
 }
}
export function activeEcho(session,id,memberId){return echoList(session.state).find(e=>e.id===id&&e.activeStage===session.stage_index&&(!memberId||e.memberId===memberId));}
export function echoCardRules(session,cards){
 if(!session.state.remakeVersion||!session.state.monster)return;
 const s=session.state,first=s.stageTurn===0;
 const e=first&&activeEcho(session,'power')||cards.some(c=>c.clashed)&&activeEcho(session,'clarity');
 if(e){for(const c of cards)if(c.clashed){c.valid=true;c.echoProtected=true;}removeEcho(s,e,'발동');}
}
export function echoCountdown(session,cards){
 const s=session.state;if(!s.remakeVersion)return 1;
 let amount=1;const unique=[...new Set(cards.filter(c=>c.valid).map(c=>c.value))];
 for(const e of [...echoList(s)])if(e.activeStage===session.stage_index){
  if(e.id==='footsteps'){amount=0;removeEcho(s,e,'발동');}
  if(s.stageTurn===1&&['twins','balance','truce','curse'].includes(e.id)){
   const applies=e.id==='truce'||e.id==='twins'&&unique.length===2||e.id==='balance'&&unique.length>0&&Math.max(...unique)-Math.min(...unique)<=2||e.id==='curse'&&cards.some(c=>c.clashed);
   if(applies)amount=e.id==='curse'?amount+1:0;
   removeEcho(s,e,applies?'발동':'조건 미달');
  }
 }return amount;
}
export function echoFirstTurn(session,cards,heal,gold){
 if(!session.state.remakeVersion||session.state.stageTurn!==1)return;
 const valid=cards.filter(c=>c.valid);
 for(const id of ['greed','humility']){const e=activeEcho(session,id);if(!e)continue;
  const value=(id==='greed'?Math.max:Math.min)(...valid.map(c=>c.value));
  for(const c of valid.filter(c=>c.value===value))id==='greed'?gold(c.memberId,2,id):heal(c.memberId,1);
  removeEcho(session.state,e,valid.length?'발동':'조건 미달');
 }
}
export function finishEchoStage(session,gold){
 const s=session.state;
 for(const e of [...echoList(s)])if(e.activeStage===session.stage_index){
  if(e.id==='bet'&&!s.players[e.memberId].knockedOut&&s.players[e.memberId].hp>0)gold(e.memberId,7,'bet');
  removeEcho(s,e,e.id==='bet'?'정산':'소멸');
 }
}
export function eventResult(session,cards,{damage,heal,gold,rng}){
 const s=session.state,valid=cards.filter(c=>c.valid),sum=valid.reduce((a,c)=>a+c.effectValue,0);
 const extreme=high=>{const v=(high?Math.max:Math.min)(...valid.map(c=>c.value));return valid.filter(c=>c.value===v).map(c=>c.memberId);};
 const high=extreme(true),low=extreme(false),all=Object.keys(s.players);let success=valid.length>0;
 const pay=(ids,n)=>ids.forEach(id=>gold(id,n,s.currentStage.contentId));
 const hurt=ids=>[...new Set(ids)].forEach(id=>damage(id,1));
 const cure=ids=>[...new Set(ids)].forEach(id=>heal(id,1));
 const one=ids=>ids.length?[ids[Math.floor(rng()*ids.length)]]:[];
 const echo=id=>giveEcho(session,id);
 switch(s.currentStage.contentId){
 case 'pressure_plate':success=sum>=8;if(success){pay(all,2);echo('footsteps');}else hurt(one(all));break;
 case 'overload_device':success=sum<=9;if(success)echo('power');else{hurt(high);pay(all,2);}break;
 case 'twin_statues':success=new Set(valid.map(c=>c.value)).size===2;if(success)echo('twins');else hurt([...high,...low]);break;
 case 'collapsing_bridge':for(const id of low)giveEcho(session,'lead',id);hurt(one(valid.filter(c=>!low.includes(c.memberId)).map(c=>c.memberId)));break;
 case 'greedy_chest':if(success){pay(high,6);echo('greed');}break;
 case 'humble_chest':if(success){pay(low,2);echo('humility');}break;
 case 'balance_vault':success=sum===10;if(success){pay(all,2);echo('balance');}else pay(high,2);break;
 case 'cursed_safe':if(success){pay(high,6);echo('curse');}break;
 case 'healing_spring':if(success){cure(low);echo('clarity');}break;
 case 'shared_supplies':{success=sum>=7;const weakest=all.filter(id=>!s.players[id].knockedOut).sort((a,b)=>s.players[a].hp-s.players[b].hp||a.localeCompare(b));if(success)cure(weakest.slice(0,sum>=10?2:1));if(sum>=10)echo('hearty');break;}
 case 'field_clinic':cure([...high,...low]);break;
 case 'suspicious_merchant':for(const c of valid){const tier=c.value<=2?['map',1]:c.value<=4?['dice',2]:['shield',3];s.roomChoices[c.memberId]={kind:'shop',item:tier[0],price:tier[1]};}break;
 case 'gamblers_altar':{let draw=rng()*valid.reduce((a,c)=>a+c.value,0);const winner=valid.find(c=>(draw-=c.value)<=0);if(winner)s.roomChoices[winner.memberId]={kind:'altar'};break;}
 case 'ancient_gate':success=sum===7;if(success){
  const prefix=s.stageOrder.slice(0,session.stage_index),pool=s.stageOrder.slice(session.stage_index,9),boss=s.stageOrder[9];
  s.gateOptions=[];for(const kind of ['combat','event']){const next=pool.find(x=>family(x)===kind);if(!next||!validRhythm([...prefix,next]))continue;const rest=rhythmOrder(pool.filter(x=>x!==next),boss,rng,[...prefix,next]);if(rest)s.gateOptions.push({kind,order:[...prefix,next,...rest,boss]});}
 }break;
 case 'suspicious_offer':if(success){pay(low,2);echo('doubt');}break;
 case 'truce_offer':success=cards.length===4&&cards.every(c=>!c.clashed);if(success){pay(all,2);echo('truce');}break;
 }
 return success;
}
export function summaryDeltas(s){return Object.fromEntries(Object.entries(s.players).map(([id,p])=>{const b=s.stageStartPlayers?.[id]||p;return[id,{hp:p.hp-b.hp,gold:p.gold-b.gold,score:p.score-b.score}];}));}
export function chooseRoomReward(session,memberId,choice){
 const s=session.state,summary=s.roomSummary;if(!summary)throw new Error('결산 중이 아닙니다.');
 if(summary.decisions[memberId])return false;
 if(summary.ready.includes(memberId))throw new Error('이미 준비를 마쳤습니다.');
 const offer=s.roomChoices[memberId],p=s.players[memberId];
 if(offer){
  if(offer.kind==='shop'){
   if(!['buy','skip'].includes(choice))throw new Error('구매 여부를 선택해 주세요.');
   if(choice==='buy'){if(p.gold<offer.price)throw new Error('Run Gold가 부족합니다.');p.gold-=offer.price;giveEcho(session,offer.item,memberId);}
  }else{if(!['cash','bet'].includes(choice))throw new Error('보상을 선택해 주세요.');if(choice==='cash')p.gold+=p.skillId==='gold_bonus'?5:4;else giveEcho(session,'bet',memberId);}
 }else if(s.gateOptions?.length){if(!s.gateOptions.some(o=>o.kind===choice))throw new Error('경로를 선택해 주세요.');}
 else throw new Error('선택할 보상이 없습니다.');
 summary.decisions[memberId]=choice;summary.deltas=summaryDeltas(s);summary.echoes=structuredClone(s.echoLog);return true;
}
