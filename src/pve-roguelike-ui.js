import {PVE_CHARACTER_TO_LOBBY} from './game-mode.js';
import {skinPortrait} from './skins.js';
import {augmentUi,relicUi} from './pve-ui-catalog.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const PVE_ROOM_LABELS=Object.freeze({
  NORMAL_COMBAT:'일반 전투',ELITE_COMBAT:'엘리트 전투',BOSS:'보스',
  EVENT:'이벤트',REST:'휴식처',SHOP:'상점',REWARD_ROOM:'보상 방'
});
const ROOM_ICONS=Object.freeze({NORMAL_COMBAT:'⚔',ELITE_COMBAT:'♜',BOSS:'♛',EVENT:'?',REST:'♨',SHOP:'¤',REWARD_ROOM:'✦'});

export function pvePlayerForUser(run,userId){return run?.players?.find(p=>p.userId===userId)||null;}
export function pveLobbyCharacterId(player){return player?.lobbyCharacterId||PVE_CHARACTER_TO_LOBBY[player?.characterId]||player?.characterId;}
export function pveConnectedNodes(run){
  const map=run?.map;if(!map)return[];
  const ids=map.currentNodeId?(map.edges?.[map.currentNodeId]||[]):(map.nodes||[]).filter(n=>n.depth===1).map(n=>n.id);
  return ids.map(id=>(map.nodes||[]).find(n=>n.id===id)).filter(Boolean);
}
function pointFor(map,node){
  const row=(map.nodes||[]).filter(n=>n.depth===node.depth).sort((a,b)=>a.id.localeCompare(b.id));
  const index=Math.max(0,row.findIndex(n=>n.id===node.id));
  const xs=row.length<=1?[500]:row.length===2?[330,670]:row.map((_,i)=>220+i*(560/(row.length-1)));
  return {x:xs[index]??500,y:80+(node.depth-1)*150};
}
export function pveMapGeometry(run){
  const map=run?.map;if(!map)return {height:0,nodes:[],edges:[]};
  const points=Object.fromEntries((map.nodes||[]).map(node=>[node.id,pointFor(map,node)]));
  const edges=[];
  for(const [from,targets] of Object.entries(map.edges||{}))for(const to of targets||[])if(points[from]&&points[to])edges.push({from,to,a:points[from],b:points[to]});
  return {height:Math.max(250,(map.depthCount||1)*150+90),nodes:(map.nodes||[]).map(node=>Object.assign({},node,points[node.id])),edges};
}
export function pveMapOverlayMarkup(run,userId,{visitedNodes=[]}={}){
  const map=run?.map;if(!map)return '';
  const geo=pveMapGeometry(run),reachable=new Set(pveConnectedNodes(run).map(n=>n.id)),visited=new Set(visitedNodes);
  const canVote=run.phase==='MAP_VOTE',votes=map.votes||{},me=(run.players||[]).find(p=>p.userId===userId);
  const lines=geo.edges.map(edge=>'<line x1="'+edge.a.x+'" y1="'+edge.a.y+'" x2="'+edge.b.x+'" y2="'+edge.b.y+'" class="'+(map.currentNodeId===edge.from&&reachable.has(edge.to)?'reachable':'')+'"/>').join('');
  const nodes=geo.nodes.map(node=>{
    const current=node.id===map.currentNodeId,isReachable=reachable.has(node.id),isVisited=visited.has(node.id);
    const state=current?'current':isVisited?'visited':isReachable?'reachable':node.depth<(run.depth||0)?'past':'locked';
    const voteCount=Object.values(votes).filter(id=>id===node.id).length,mine=votes[me?.playerId]===node.id;
    const action=canVote&&isReachable?'pve-vote':'pve-map-node-info';
    return '<button type="button" class="pve-map-node '+state+' '+(mine?'mine':'')+'" style="--map-x:'+(node.x/10)+'%;--map-y:'+node.y+'px" data-action="'+action+'" data-node-id="'+esc(node.id)+'" '+(canVote&&isReachable?'':'disabled')+'><i>'+(ROOM_ICONS[node.type]||'◇')+'</i><b>'+esc(PVE_ROOM_LABELS[node.type]||node.type)+'</b><small>D'+node.depth+(voteCount?' · '+voteCount+'표':'')+'</small></button>';
  }).join('');
  const legend=Object.entries(ROOM_ICONS).map(([type,icon])=>'<span><i>'+icon+'</i>'+esc(PVE_ROOM_LABELS[type])+'</span>').join('');
  return '<section class="pve-map-overlay" role="dialog" aria-label="협력 탐험 지도"><div class="pve-map-toolbar"><div><div class="eyebrow">EXPEDITION MAP · FLOOR '+esc(run.floor)+'</div><h2>경로 지도</h2><p>지도는 언제든 확인할 수 있습니다. 이동은 방 종료 후에만 투표합니다.</p></div><button class="icon-button" data-action="pve-map-close" aria-label="지도 닫기">×</button></div><div class="pve-map-scroll"><div class="pve-map-canvas" style="height:'+geo.height+'px"><svg class="pve-map-edges" viewBox="0 0 1000 '+geo.height+'" preserveAspectRatio="none" aria-hidden="true">'+lines+'</svg>'+nodes+'</div></div><div class="pve-map-legend">'+legend+'</div></section>';
}
export function pveRelicStripMarkup(bundle,run){
  const rows=(run.players||[]).filter(p=>(p.relics||[]).length);if(!rows.length)return '';
  return '<section class="pve-relic-strip" aria-label="보유 유물">'+rows.map(player=>{
    const member=bundle.members?.find(m=>m.id===player.playerId);
    return '<div class="pve-relic-owner"><b>'+esc(member?.display_name||player.displayName||'플레이어')+'</b><div>'+player.relics.map(id=>{const relic=relicUi(id);return '<button type="button" class="pve-relic-icon" data-action="pve-relic-info" data-relic-id="'+esc(id)+'" title="'+esc(relic.name)+' · '+esc(relic.text)+'">✦<span>'+esc(relic.name)+'</span></button>';}).join('')+'</div></div>';
  }).join('')+'</section>';
}
export function pveEventActionsMarkup(run){
  const room=run.roomState||{};
  return '<section class="pve-context-panel"><div class="eyebrow">EVENT CHOICE</div><h3>'+esc(room.name||'던전 이벤트')+'</h3><div class="pve-action-grid">'+(room.options||[]).map(o=>'<button class="button secondary" data-action="pve-event" data-option-id="'+esc(o.id)+'">'+esc(o.label)+'</button>').join('')+'</div></section>';
}
export function pveRestActionsMarkup(run,{engraveMode=false,selectedNumber=null}={}){
  if(engraveMode)return '<section class="pve-context-panel card-selector-mode"><div class="eyebrow">NUMBER ENGRAVING</div><h3>각인할 숫자의 카드를 선택하세요.</h3><p>물리 슬롯이 아니라 <b>숫자 값</b>을 강화합니다.</p><div class="pve-inline-confirm"><span>'+(selectedNumber==null?'카드를 선택하세요.':'숫자 '+esc(selectedNumber)+' 선택')+'</span><button class="button primary" data-action="pve-rest-engrave-confirm" '+(selectedNumber==null?'disabled':'')+'>각인 확정 →</button><button class="button secondary" data-action="pve-rest-engrave-cancel">취소</button></div></section>';
  return '<section class="pve-context-panel"><div class="eyebrow">REST</div><h3>각자 휴식 방법을 선택합니다.</h3><div class="pve-action-grid"><button class="button secondary" data-action="pve-rest" data-choice="FULL_HEAL">♥ HP 전부 회복</button><button class="button secondary" data-action="pve-rest" data-choice="FLAME">✦ Expedition Flame +1</button><button class="button secondary" data-action="pve-rest-engrave">◇ Number Engraving</button></div></section>';
}
export function pveShopMarkup(run,{reservation=null,selectedCardId=null}={}){
  const room=run.roomState||{},products=[...(room.cardStock||[]),...(room.relicStock||[])];
  if(reservation){
    const item=(room.cardStock||[]).find(x=>x.id===reservation);
    return '<section class="pve-context-panel card-selector-mode"><div class="eyebrow">CARD REPLACEMENT</div><h3>교체할 내 카드를 선택하세요.</h3><p>구매 카드: <b>'+esc(item?.value)+'</b> · '+esc(item?.price)+'G</p><div class="pve-inline-confirm"><span>'+(selectedCardId?'교체 카드 선택 완료':'아래 내 카드에서 하나를 선택하세요.')+'</span><button class="button primary" data-action="pve-shop-confirm-card" '+(selectedCardId?'':'disabled')+'>구매 + 교체 확정 →</button><button class="button secondary" data-action="pve-shop-cancel-card">취소</button></div></section>';
  }
  const cards=products.map(item=>{
    const relic=item.kind==='RELIC'?relicUi(item.relicId):null,sold=item.sold;
    const title=item.kind==='CARD'?'숫자 '+item.value+' 카드':relic?.name||item.relicId;
    const desc=item.kind==='CARD'?'카드 교체 상품':relic?.text||'유물';
    return '<button class="pve-shop-item '+(sold?'sold':'')+'" data-action="pve-shop-item" data-product-id="'+esc(item.id)+'" data-kind="'+esc(item.kind)+'" '+(sold?'disabled':'')+'><i>'+(item.kind==='CARD'?esc(item.value):'✦')+'</i><b>'+esc(title)+'</b><span>'+esc(item.price)+'G</span><small>'+esc(desc)+'</small></button>';
  }).join('');
  return '<section class="pve-context-panel pve-shop-display"><div class="eyebrow">DUNGEON SHOP</div><h3>진열 상품</h3><div class="pve-shop-grid">'+cards+'</div><button class="button primary pve-shop-ready" data-action="pve-shop-ready">상점 이용 종료 →</button></section>';
}
export function pveRewardPromptMarkup(run,me){
  const room=run.roomState||{};
  if(room.pickOrder?.[0]===me?.playerId){
    const cards=(room.relicIds||[]).map(id=>{const relic=relicUi(id);return '<button data-action="pve-reward-relic" data-relic-id="'+esc(id)+'"><i>✦</i><b>'+esc(relic.name)+'</b><p>'+esc(relic.text)+'</p></button>';}).join('');
    return '<div class="pve-modal-layer"><section class="pve-choice-popup"><div class="eyebrow">RELIC REWARD</div><h2>유물을 선택하세요.</h2><div class="pve-choice-cards">'+cards+'</div></section></div>';
  }
  return '<section class="pve-context-panel"><div class="eyebrow">REWARD CONTEST</div><h3>카드를 제출해 보상 우선권을 정합니다.</h3><p>기존 카드 선택 영역에서 한 장을 고른 뒤 제출하세요.</p></section>';
}
export function pveAugmentPopupMarkup(run){
  const offer=run.privateAugmentOffer;
  const cards=offer?(offer.augmentIds||[]).map(id=>{const item=augmentUi(id,offer.tier);return '<button data-action="pve-augment" data-augment-id="'+esc(id)+'"><i aria-hidden="true">◇</i><small>TIER '+item.tier+'</small><b>'+esc(item.name)+'</b><p>'+esc(item.description)+'</p></button>';}).join(''):'';
  return '<div class="pve-modal-layer"><section class="pve-choice-popup augment-popup"><div class="eyebrow">AUGMENT CHOICE</div><h2>증강을 선택하세요.</h2>'+(offer?'<div class="pve-choice-cards">'+cards+'</div>':'<p>다른 플레이어의 선택을 기다리는 중입니다.</p>')+'</section></div>';
}
export function pveRoomResultOverlayMarkup(bundle,run,{interactive=true,playerId=null}={}){
  const readyIds=run.roomResult?.readyPlayerIds||[],ready=new Set(readyIds);
  const rows=[...(run.players||[])].sort((a,b)=>(a.seat||0)-(b.seat||0)).map(p=>{
    const m=bundle.members?.find(x=>x.id===p.playerId),name=m?.display_name||p.displayName||'플레이어';
    return '<article><div class="summary-portrait">'+skinPortrait(pveLobbyCharacterId(p),m?.loadout)+'</div><b title="'+esc(name)+'">'+esc(name)+'</b><div class="summary-changes"><span>HP '+p.hp+'/'+p.maxHp+'</span><span>EXP '+(p.growthExp||0)+'</span><span>RUN GOLD '+(p.runGold||0)+'G</span></div><small class="summary-ready">'+(ready.has(p.playerId)?'✓ 확인 완료':'결과 확인 대기')+'</small></article>';
  }).join('');
  const mineReady=Boolean(playerId&&ready.has(playerId)),readyText=readyIds.length+' / '+(run.players?.length||0)+' 확인';
  const actions=interactive?'<footer><span>'+readyText+'</span><button class="button secondary" data-action="pve-map-open">지도 미리보기 ◇</button><button class="button primary" data-action="pve-room-ready" data-network '+(mineReady?'disabled data-unavailable="true"':'')+'>'+(mineReady?'확인 완료 ✓':'지도로 →')+'</button></footer>':'<footer><span>증강 선택 후 결과 확인을 계속합니다.</span></footer>';
  return '<section class="room-result-overlay pve-room-result" role="dialog" aria-modal="true" aria-labelledby="pve-room-result-title"><div class="room-result-sheet pve-room-result-sheet"><small class="eyebrow">ROOM COMPLETE</small><h2 id="pve-room-result-title">방 공략 완료 <small>협력 탐험</small></h2><div class="room-result-party">'+rows+'</div><div class="summary-party">EXPEDITION FLAME <b>'+esc(run.flame)+' / '+esc(run.maxFlame)+'</b></div>'+actions+'</div></section>';
}
export function pveTerminalMarkup(bundle,run,me){
  const clear=run.phase==='RUN_CLEAR',mineGold=Number(me?.runGold)||0,settlement=bundle.pveSettlement;
  const text=!clear?'실패 또는 중도 종료된 협력 탐험의 Run Gold는 영구 지급되지 않습니다.':bundle.pveRewardsCommitted||settlement?.settled?'계정 Gold 정산 완료':'계정 Gold를 서버에서 정산 중입니다.';
  return '<section class="end-screen '+(clear?'victory':'failure')+'"><div class="end-emblem">'+(clear?'♛':'♠')+'</div><div class="eyebrow">CO-OP EXPEDITION · BETA</div><h1>'+(clear?'협력 탐험 완료':'협력 탐험 종료')+'</h1><p>'+(clear?'PVE 런을 완료했습니다.':'이번 협력 탐험은 여기까지입니다.')+'</p><div class="account-notice"><b>RP 변동 없음</b><br>협력 탐험은 경쟁 RP와 랭킹에 영향을 주지 않습니다.</div><div class="end-stats"><span>내 Run Gold <b>'+mineGold+'G</b></span><span>FLOOR <b>'+run.floor+'</b></span><span>FLAME <b>'+run.flame+'</b></span></div><p class="muted">'+text+'</p><button class="button primary" data-action="leave" data-network>원정대 나가기 →</button></section>';
}
