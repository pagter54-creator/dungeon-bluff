import {GAME_MODE,gameModeBadge,PVE_CHARACTER_TO_LOBBY} from './game-mode.js';
import {MONSTER_IMAGES} from './monster-assets.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const roomTypeLabel=Object.freeze({
  NORMAL_COMBAT:'일반 전투',ELITE_COMBAT:'엘리트 전투',BOSS:'보스',
  EVENT:'이벤트',REST:'휴식처',SHOP:'상점',REWARD_ROOM:'보상 방'
});
export function pvePlayerForUser(run,userId){return run?.players?.find(p=>p.userId===userId)||null;}
export function pveConnectedNodes(run){
  const map=run?.map;if(!map)return[];
  const ids=map.currentNodeId?(map.edges?.[map.currentNodeId]||[]):(map.nodes||[]).filter(n=>n.depth===1).map(n=>n.id);
  return ids.map(id=>(map.nodes||[]).find(n=>n.id===id)).filter(Boolean);
}
function displayCharacterId(player){return player?.lobbyCharacterId||PVE_CHARACTER_TO_LOBBY[player?.characterId]||player?.characterId;}
function memberName(bundle,player){return bundle.members?.find(m=>m.id===player.playerId)?.display_name||player.displayName||player.playerId;}
function characterName(bundle,player){
  const id=displayCharacterId(player);
  return bundle.characters?.find(c=>c.id===id)?.display_name||id||'모험가';
}
function hearts(p){return Array.from({length:p.maxHp||3},(_,i)=>`<span class="heart ${i<(p.hp||0)?'filled':''}">♥</span>`).join('');}
function partyMarkup(bundle){
  return `<div class="pve-party">${(bundle.run.players||[]).slice().sort((a,b)=>a.seat-b.seat).map(p=>`<article class="pve-party-member"><div><b>${esc(memberName(bundle,p))}</b><small>${esc(characterName(bundle,p))}${p.memberType==='ai'?' · AI':''}</small></div><div class="hearts" aria-label="HP ${p.hp}/${p.maxHp}">${hearts(p)}</div><span>RUN GOLD <b>${Number(p.runGold)||0}G</b></span></article>`).join('')}</div>`;
}
function ownCards(run,me,{reward=false}={}){
  const privateState=reward?run.privateRoomState:run.privateCombat;
  const remaining=new Set(privateState?.remainingCardIds||[]);
  return (me?.cardPool||[]).filter(c=>remaining.has(c.id)).sort((a,b)=>a.baseNumber-b.baseNumber||a.id.localeCompare(b.id));
}
function pveHeader(bundle){
  const r=bundle.run,mode=GAME_MODE.COOP_PVE;
  return `<section class="pve-beta-header"><div><div class="eyebrow">CO-OP EXPEDITION · BETA</div><h1>${esc(bundle.room.room_title)}</h1><div class="pve-mode-line">${gameModeBadge(mode)}<span>Gold 획득 가능 · RP 변동 없음</span></div></div><div class="pve-run-stats"><span>FLOOR <b>${r.floor}</b></span><span>DEPTH <b>${r.depth}</b></span><span>FLAME <b>${r.flame} / ${r.maxFlame}</b></span></div><button class="button secondary small" data-action="leave-confirm">나가기 ↗</button></section>`;
}
function mapVoteMarkup(run){
  const nodes=pveConnectedNodes(run),votes=run.map?.votes||{};
  return `<section class="pve-panel pve-map"><div class="eyebrow">ROUTE VOTE</div><h2>다음 방을 선택하세요.</h2><p>AI는 지도 투표에 참여하지 않습니다.</p><div class="pve-route-grid">${nodes.map(n=>`<button class="pve-route-card" data-action="pve-vote" data-node-id="${esc(n.id)}"><b>${esc(roomTypeLabel[n.type]||n.type)}</b><small>DEPTH ${n.depth}</small><span>${Object.values(votes).filter(id=>id===n.id).length}표</span></button>`).join('')}</div></section>`;
}
function combatMarkup(bundle,me){
  const run=bundle.run,c=run.combat,ready=(c?.readyPlayerIds||[]).includes(me.playerId),cards=ownCards(run,me);
  const m=c?.monster||{};
  const skillCapable=(me.characterId==='gunner'&&me.publicResources?.fullBurstReady)||(me.characterId==='demon_swordsman'&&me.publicResources?.ghostSlashReady)||(me.characterId==='warrior'&&(me.publicResources?.toughnessCharges||0)>0);
  return `<section class="pve-panel pve-combat"><div class="eyebrow">${esc(roomTypeLabel[c?.roomType]||'COMBAT')}</div><h2>${esc(m.name||'몬스터')}</h2>${MONSTER_IMAGES[m.id]?`<img class="pve-monster-portrait" src="${MONSTER_IMAGES[m.id]}" alt="${esc(m.name||'몬스터')}" draggable="false" decoding="async">`:''}<div class="pve-monster-bar"><span>HP <b>${m.hp} / ${m.maxHp}</b></span><i style="width:${m.maxHp?Math.max(0,m.hp/m.maxHp*100):0}%"></i></div><p class="pve-intent">${esc(m.intent?.telegraphText||'몬스터의 행동을 주시하세요.')}</p><p class="pve-monster-rule">${esc(m.presentation?.ruleSummary||'')}</p><p class="pve-monster-status">${esc(m.presentation?.statusText||'')}</p><div class="pve-monster-player-status">${(run.players||[]).map(p=>{const status=m.presentation||{};const labels=[status.curseByPlayer?.[p.playerId]!=null?`저주 ${status.curseByPlayer[p.playerId]}`:null,status.sporeByPlayer?.[p.playerId]!=null?`포자 ${status.sporeByPlayer[p.playerId]}`:null,status.corruptionByPlayer?.[p.playerId]!=null?`오염 ${status.corruptionByPlayer[p.playerId]}`:null,status.lastValidNumberByPlayer?.[p.playerId]!=null?`직전 유효 숫자 ${status.lastValidNumberByPlayer[p.playerId]}`:null].filter(Boolean);return labels.length?`<span>${esc(memberName(bundle,p))}: ${esc(labels.join(' · '))}</span>`:''}).join('')}</div><div class="pve-own-cards" aria-label="내 PVE 카드">${cards.map(card=>`<div class="pve-card"><b>${card.baseNumber}</b><button class="button small primary" data-action="pve-submit-card" data-card-id="${esc(card.id)}" ${ready?'disabled':''}>제출</button>${skillCapable?`<button class="button small secondary" data-action="pve-submit-card" data-card-id="${esc(card.id)}" data-use-skill="true" ${ready?'disabled':''}>스킬 + 제출</button>`:''}</div>`).join('')||'<span class="muted">사용 가능한 카드가 없습니다.</span>'}</div><p class="pve-wait">${ready?'✓ 제출 완료 · 동료를 기다리는 중':'카드 한 장을 선택해 제출하세요.'}</p></section>`;
}
function augmentMarkup(run){
  const offer=run.privateAugmentOffer;
  return `<section class="pve-panel"><div class="eyebrow">AUGMENT CHOICE</div><h2>증강을 선택하세요.</h2>${offer?`<p>Tier ${offer.tier}</p><div class="pve-action-grid">${offer.augmentIds.map(id=>`<button class="button secondary" data-action="pve-augment" data-augment-id="${esc(id)}">${esc(id)}</button>`).join('')}</div>`:'<p>다른 플레이어의 선택을 기다리는 중입니다.</p>'}</section>`;
}
function eventMarkup(run){
  const room=run.roomState||{},chosen=Boolean(room.choicesByPlayer&&run.players.some(p=>room.choicesByPlayer[p.playerId]));
  return `<section class="pve-panel"><div class="eyebrow">EVENT</div><h2>${esc(room.name||'던전 이벤트')}</h2><div class="pve-action-grid">${(room.options||[]).map(o=>`<button class="button secondary" data-action="pve-event" data-option-id="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div></section>`;
}
function restMarkup(){
  return `<section class="pve-panel"><div class="eyebrow">REST</div><h2>휴식처</h2><p>이번 Beta UI에서는 핵심 선택부터 제공합니다.</p><div class="pve-action-grid"><button class="button secondary" data-action="pve-rest" data-choice="FULL_HEAL">HP 전부 회복</button><button class="button secondary" data-action="pve-rest" data-choice="FLAME">Flame +1</button></div></section>`;
}
function shopMarkup(run){
  const room=run.roomState||{};
  return `<section class="pve-panel"><div class="eyebrow">SHOP</div><h2>던전 상점</h2><div class="pve-action-grid">${(room.relicStock||[]).filter(x=>!x.sold).map(x=>`<button class="button secondary" data-action="pve-buy-relic" data-product-id="${esc(x.id)}">${esc(x.relicId||x.id)} · ${x.price}G</button>`).join('')}</div><button class="button primary" data-action="pve-shop-ready">상점 이용 종료 →</button></section>`;
}
function rewardMarkup(run,me){
  const room=run.roomState||{},privateState=run.privateRoomState;
  if(room.pickOrder?.[0]===me.playerId)return `<section class="pve-panel"><div class="eyebrow">RELIC REWARD</div><h2>유물을 선택하세요.</h2><div class="pve-action-grid">${(room.relicIds||[]).map(id=>`<button class="button secondary" data-action="pve-reward-relic" data-relic-id="${esc(id)}">${esc(id)}</button>`).join('')}</div></section>`;
  const submitted=Boolean(room.readyPlayerIds?.includes?.(me.playerId)||privateState?.selectedCardId);
  if(!room.resolved&&!submitted){
    const cards=ownCards(run,me,{reward:true});
    return `<section class="pve-panel"><div class="eyebrow">REWARD CONTEST</div><h2>보상 카드 판정</h2><div class="pve-own-cards">${cards.map(card=>`<div class="pve-card"><b>${card.baseNumber}</b><button class="button small primary" data-action="pve-reward-card" data-card-id="${esc(card.id)}">제출</button></div>`).join('')}</div></section>`;
  }
  return `<section class="pve-panel"><div class="eyebrow">REWARD</div><h2>보상 판정을 기다리는 중</h2><p>다른 플레이어의 제출 또는 유물 선택을 기다립니다.</p></section>`;
}
function roomResultMarkup(){
  return `<section class="pve-panel"><div class="eyebrow">ROOM COMPLETE</div><h2>다음 방으로 이동할 준비가 됐나요?</h2><button class="button primary" data-action="pve-room-ready">다음 방 준비 ✓</button></section>`;
}
function terminalMarkup(bundle,me){
  const run=bundle.run,clear=run.phase==='RUN_CLEAR',mineGold=Number(me?.runGold)||0;
  const settlement=bundle.pveSettlement;
  const settlementText=!clear?'실패 또는 중도 종료된 협력 탐험의 Run Gold는 영구 지급되지 않습니다.'
    : bundle.pveRewardsCommitted||settlement?.settled?'계정 Gold 정산 완료':'계정 Gold를 서버에서 정산 중입니다.';
  return `<section class="end-screen ${clear?'victory':'failure'}"><div class="end-emblem">${clear?'♛':'♠'}</div><div class="eyebrow">CO-OP EXPEDITION · BETA</div><h1>${clear?'협력 탐험 완료':'협력 탐험 종료'}</h1><p>${clear?'PVE 런을 완료했습니다.':'이번 협력 탐험은 여기까지입니다.'}</p><div class="account-notice"><b>RP 변동 없음</b><br>협력 탐험은 경쟁 RP와 랭킹에 영향을 주지 않습니다.</div><div class="end-stats"><span>내 Run Gold <b>${mineGold}G</b></span><span>FLOOR <b>${run.floor}</b></span><span>FLAME <b>${run.flame}</b></span>${clear&&run.finalSummary?`<span>공략 <b>${esc(run.finalSummary.clearedFloors)} / 3층</b></span><span>파티 Run Gold <b>${esc(run.finalSummary.totalRunGold)}G</b></span>`:''}</div><p class="muted">${settlementText}</p><button class="button primary" data-action="leave" data-network>원정대 나가기 →</button></section>`;
}
export function pveBetaMarkup(bundle,userId){
  const run=bundle?.run;if(!run)return'';
  const me=pvePlayerForUser(run,userId);
  if(!me)return `<section class="pve-panel"><h2>PVE 원정 참가 정보를 찾을 수 없습니다.</h2></section>`;
  if(['RUN_CLEAR','RUN_FAILED','ABANDONED'].includes(run.phase))return pveHeader(bundle)+partyMarkup(bundle)+terminalMarkup(bundle,me);
  let body='';
  if(run.phase==='MAP_VOTE')body=mapVoteMarkup(run);
  else if(run.phase==='COMBAT')body=combatMarkup(bundle,me);
  else if(run.phase==='AUGMENT_CHOICE')body=augmentMarkup(run);
  else if(run.phase==='EVENT')body=eventMarkup(run);
  else if(run.phase==='REST')body=restMarkup();
  else if(run.phase==='SHOP')body=shopMarkup(run);
  else if(run.phase==='REWARD_ROOM')body=rewardMarkup(run,me);
  else if(run.phase==='ROOM_RESULT')body=roomResultMarkup();
  else if(run.phase==='FLOOR_CLEAR'||run.phase==='FLOOR_TRANSITION')body=`<section class="pve-panel"><div class="eyebrow">FLOOR CLEAR</div><h2>Floor ${run.floor} 공략 완료</h2><p>현재 PVE Beta vertical slice의 다음 진행 상태를 기다리고 있습니다.</p></section>`;
  else body=`<section class="pve-panel"><div class="eyebrow">PVE BETA</div><h2>${esc(run.phase)}</h2><p>서버 상태를 동기화하고 있습니다.</p></section>`;
  return pveHeader(bundle)+partyMarkup(bundle)+body;
}
