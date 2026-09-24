// Compact, four-column room receipts. Details use the existing accessible modal.
import {skinPortrait} from './skins.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=n=>n>0?'+'+n:String(n);
export function roomSummaryMarkup(bundle,me,animate=false){
 const s=bundle.session.state,r=s.roomSummary;if(!r)return '';
 const ready=r.ready.includes(me?.id),offer=s.roomChoices?.[me?.id],decision=r.decisions[me?.id];
 const options=s.gateOptions||[],needsChoice=Boolean((offer||options.length)&&!decision);
 const choice=(id,label,disabled=false)=>`<button class="button secondary small" data-action="room-choice" data-choice="${id}" data-network data-unavailable="${ready||disabled}" ${ready||disabled?'disabled':''}>${decision===id?'✓ ':''}${label}</button>`;
 let choices='';
 if(offer?.kind==='shop'){const names={map:'낡은 지도',dice:'행운의 주사위',shield:'철제 부적'};choices=choice('buy',names[offer.item]+' · '+offer.price+'G',s.players[me.id].gold<offer.price&&!decision)+choice('skip','지나가기');}
 if(offer?.kind==='altar')choices=choice('cash','지금 +4G')+choice('bet','생존 도전 +7G');
 if(!offer&&options.length)choices=options.map(o=>choice(o.kind,o.kind==='combat'?'전투로':'이벤트로')).join('');
 if(offer&&!decision)choices+='<button class="button secondary small" data-action="reward-details" aria-label="보상 상세">ⓘ</button>';
 if(decision)choices='<small class="summary-decision">선택 완료 ✓</small>';
 const echoes=r.echoes||[],gained=echoes.filter(e=>e.status==='획득'),spent=echoes.filter(e=>e.status!=='획득');
 const partyGold=Object.values(r.deltas).reduce((a,d)=>a+d.gold,0);
 return `<section class="room-result-overlay ${animate?'summary-enter':''}" role="dialog" aria-modal="true" aria-labelledby="room-result-title"><div class="room-result-sheet"><small class="eyebrow">ROOM ${r.stageIndex} · ${r.success?'COMPLETE':'RESULT'}</small><h2 id="room-result-title">${esc(r.name)} <small>${r.success?'완료':'조건 미달'}</small></h2><div class="room-result-party">${[...bundle.members].sort((a,b)=>a.seat_index-b.seat_index).map(m=>{
  const p=s.players[m.id],d=r.deltas[m.id]||{hp:0,gold:0,score:0};const values=[['HP',d.hp],['G',d.gold],['점수',d.score]].filter(([,v])=>v!==0);
  return `<article><div class="summary-portrait">${skinPortrait(p.characterId,p.loadout)}</div><b title="${esc(m.display_name)}">${esc(m.display_name)}</b><div class="summary-changes">${values.length?values.map(([label,n],i)=>`<span class="${n>0?'gain':'loss'}" style="--receipt-delay:${i*65}ms">${label} ${signed(n)}</span>`).join(''):'<small>변화 없음</small>'}</div><small class="summary-ready">${r.ready.includes(m.id)?'✓ 준비':'대기'}</small></article>`;
 }).join('')}</div><div class="summary-party">${partyGold?`파티 골드 <b>${signed(partyGold)}G</b>`:''}</div>${echoes.length?`<button class="summary-echo" data-action="echo-details" data-summary-details title="${esc(echoes.map(e=>e.name+': '+e.description).join(' / '))}"><b>${gained.length?'✦ '+esc(gained[0].name)+(gained.length>1?' 외 '+(gained.length-1)+'개':''):'잔향 정산'}</b><small>${gained.length?'획득 ':''}${spent.length?'· '+spent.length+'개 발동/종료':''} ⓘ</small></button>`:''}<div class="summary-choices">${choices}</div><footer><span>${r.ready.length} / ${bundle.members.length} 준비</span><button class="button primary" data-action="room-ready" data-network data-unavailable="${ready||needsChoice}" ${ready||needsChoice?'disabled':''}>${ready?'준비 완료 ✓':'준비 완료'}</button></footer><button class="summary-leave" data-action="leave-confirm">원정 나가기</button></div></section>`;
}
export function echoHud(bundle,me){
 const s=bundle.session.state,echoes=[s.echo,...Object.values(s.personalEchoes||{})].filter(Boolean);
 const own=echoes.filter(e=>!e.memberId||e.memberId===me?.id);
 return `<div class="echo-hud">${own.map(e=>`<button data-action="echo-details" data-echo-id="${esc(e.id)}" data-echo-owner="${esc(e.memberId||'')}" title="${esc(e.description)}">✦ ${esc(e.name||e.id)}</button>`).join('')}${s.roomInfo?'<button data-action="echo-info">✧ 조건 확인</button>':''}${bundle.privateState?.nextRoom?`<span>지도 · 다음 ${esc(bundle.privateState.nextRoom)}</span>`:''}</div>`;
}
export function echoDetails(bundle,button){
 const s=bundle.session.state;
 const items=button.hasAttribute('data-summary-details')?s.roomSummary?.echoes||[]:[s.echo,...Object.values(s.personalEchoes||{})].filter(e=>e&&e.id===button.dataset.echoId&&(e.memberId||'')===(button.dataset.echoOwner||''));
 return `<h2>잔향</h2>${items.map(e=>`<p><b>${esc(e.name||e.id)}</b> ${esc(e.status||'')} ${e.memberId?'· '+esc(bundle.members.find(m=>m.id===e.memberId)?.display_name||''):''}<br>${esc(e.description||'')}</p>`).join('')}`;
}
