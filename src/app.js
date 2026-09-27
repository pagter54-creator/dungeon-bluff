import {nextAmplifyLevel} from './character-ui.js';
import {roomSummaryMarkup,echoHud,echoDetails} from './room-summary.js';
import { loadInitialAssets,ensureOwnAssets,ensureRoomAssets } from './loading-ui.js';
import {warmLobbyAssets,stopLobbyLoading,loadEntryAssets,loadPveEntryAssets} from './battle-loading.js';
import { isShuffleTurn,selectionInfo,toggleCardSelection } from './battle-rules.js';
import { skinPortrait,skinFor } from './skins.js';
import { initAccountUI, refreshAccount, openAccountPage, getAccount } from './account-ui.js';
import { preloadSession } from './cosmetics.js';
import * as api from './api.js';
import { dungeonArt, creatureArt, eventArt, bindEventArtFallback } from './art.js';
import { reveal, finale } from './fx.js';
import { initAudioControls, getAudio } from './audio.js';
import { characterFor, characterChoices, deckLabel, partyPanels, mobileSelection, cycleCards } from './character-ui.js';
import { characterGuide } from './character-guide.js';
import {gamblerPileDetails} from './gambler-ui.js';
import { animateCycle, showSkillEffect } from './character-fx.js';
import { setKnockoutPose,animateTwinHandoff } from './player-pose-fx.js';
import { showGameBackground } from './game-background.js';
import { initMotionControl } from './motion.js';
import {GAME_MODE,roomGameMode,gameModeMeta,gameModeBadge,gameModeSelectorMarkup,PVE_SUPPORTED_LOBBY_CHARACTER_IDS} from './game-mode.js';
import {sharedGameTopMarkup,sharedEncounterMarkup} from './shared-gameplay-ui.js';
import {pveGameplayPlayers,pveGameplayBundle,pveStageModel,adaptPveTurnResult,adaptPveRewardResult} from './pve-gameplay-adapter.js';
import {pvePlayerForUser,pveOwnShopReservation,pveMapOverlayMarkup,pveRelicStripMarkup,pveEventActionsMarkup,pveRestActionsMarkup,pveShopMarkup,pveRewardPromptMarkup,pveAugmentPopupMarkup,pveRoomResultOverlayMarkup,pveTerminalMarkup,PVE_ROOM_LABELS} from './pve-roguelike-ui.js';
import {relicUi} from './pve-ui-catalog.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const AI = { balanced: ['균형형', '중복, 공격, 보상을 균형 있게'], greedy: ['탐욕형', '높은 카드와 개인 보상을 우선'], cautious: ['신중형', '피격과 기절을 최대한 회피'], blocker: ['견제형', '선두의 공개 행동을 읽고 견제'], chaotic: ['혼돈형', '가장 예측하기 어려운 선택'] };
const categoryLabel = { monster: 'MONSTER ENCOUNTER', boss: 'FINAL BOSS', trap: 'DUNGEON TRAP', treasure: 'HIDDEN TREASURE', recovery: 'A MOMENT OF REST', event: 'UNKNOWN ENCOUNTER' };
let bundle = null;
let view = 'home';
let connected = false;
let profile = null;
let busy = false;
let syncing = false;
let resync = false;
let animating = false;
let lastResult = 0;
let queue = [];
let selected = null;
let useSkill = false;
let toastTimer;
let sessionIdentity = null;
let pveRunIdentity = null;
let rewardRefreshSession = null;
let shownSummary=null;
let roomEpoch = 0;
let listLoading = false;
let coopPveEnabled=true;
let pveSelected=null,pveUseSkill=false,pveMapOpen=false,pveEngraveMode=false,pveAnimating=false,pveLastPresentedTurn=0,pveLastPresentedRewardKey='';
let pveEntryWork=null,pveEntryProgress='',pveEntryError='',pveEntryCompleted=null;
const pveVisitedNodes=new Set();
let entryWork=null,entryProgress='',entryError='',entryCompleted=null;
const status = (text, online = false) => {
  const el = document.querySelector('#connection'); el.classList.toggle('online', online); el.lastChild.textContent = ` ${text}`;
};
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4500); }
function showModal(html) { document.querySelector('#modal-body').innerHTML = html; modal.showModal(); }
function setProfile(next) {
  profile = next;
  const button = document.querySelector('#nickname');
  button.textContent = profile.display_name;
  button.title = `${profile.display_name} · 닉네임 변경`;
  button.setAttribute('aria-label', `${profile.display_name}, 닉네임 변경`);
  button.disabled = false;
}
function nicknameModal() {
  showModal(`<div class="eyebrow">YOUR ADVENTURER</div><h2>어떤 이름으로 떠날까요?</h2><p>원정대에 표시할 닉네임을 정하세요. 나중에도 변경할 수 있습니다.</p><form id="nickname-form"><label>닉네임<input name="display_name" required minlength="2" maxlength="16" autocomplete="nickname" value="${escape(profile?.nickname_set ? profile.nickname || profile.display_name : '')}" placeholder="2~16자, 글자·숫자·공백·_·-"></label><button class="button primary full" data-network>닉네임 저장 <span>→</span></button></form>`);
  updateBusy();
}
const mine = () => bundle?.members.find(m => m.user_id === api.user?.id);
const isHost = () => bundle?.room.host_user_id === api.user?.id;
function updateBusy() { document.querySelectorAll('[data-network]').forEach(button => { button.disabled = busy || button.dataset.unavailable === 'true'; }); }
async function perform(action, params = {}) {
  if (busy) return;
  busy = true; updateBusy();
  try {
    if (action==='create_room') await ensureOwnAssets(getAccount()?.loadout);
    const response = await api.request(action, { ...(bundle?.room ? { room_id: bundle.room.id } : {}), ...params });
    if (response.profile) {
      setProfile(response.profile); modal.close(); toast('닉네임을 저장했습니다.');
      if (bundle) await sync();
    } else if (response.left) {
      stopLobbyLoading();entryError='';entryCompleted=null;
      roomEpoch++; await api.unsubscribe(); bundle = null; queue = []; sessionIdentity = null; pveRunIdentity=null; lastResult = 0; view = 'home'; renderHome();
    } else if (response.room) { modal.close(); await accept(response); }
    return response;
  } catch (error) { toast(error.message); if (bundle) void sync(); }
  finally { busy = false; updateBusy(); }
}
async function performPve(action,params={}){
  if(busy||!bundle?.run)return null;
  const before=structuredClone(bundle.run);
  busy=true;updateBusy();
  try{
    const mutation=action!=='pve.getState';
    const response=await api.request(action,{
      run_id:bundle.run.id,
      ...(mutation?{expected_version:bundle.run.version,action_id:crypto.randomUUID()}:{}),
      ...params
    });
    if(response.run){
      bundle={...bundle,run:response.run,pveSettlement:response.settlement??bundle.pveSettlement,pveRewardsCommitted:response.settlement?.settled===true?true:bundle.pveRewardsCommitted};
      if(response.run.map?.currentNodeId)pveVisitedNodes.add(response.run.map.currentNodeId);
      if(before.phase!=='MAP_VOTE'&&response.run.phase==='MAP_VOTE')pveMapOpen=true;
      if(['RUN_CLEAR','RUN_FAILED','ABANDONED'].includes(response.run.phase))void refreshAccount().catch(()=>{});
      const presentation=adaptPveTurnResult(bundle,before,response.run);
      const rewardPresentation=adaptPveRewardResult(before,response.run);
      if(presentation&&presentation.turnIndex>pveLastPresentedTurn&&!document.hidden)await presentPveTurn(before,response.run,presentation);
      else if(rewardPresentation&&rewardPresentation.key!==pveLastPresentedRewardKey&&!document.hidden)await presentPveRewardAttempt(before,response.run,rewardPresentation);
      else renderPve();
    }
    return response;
  }catch(error){toast(error.message);void sync();return null;}
  finally{busy=false;updateBusy();}
}
function pveProgressMarkup(run){
  const count=run.map?.depthCount||1,current=run.depth||0;
  return Array.from({length:count},(_,index)=>{const depth=index+1;return '<span class="stage-node '+(depth<current?'passed':depth===current?'current':'')+'" title="Depth '+depth+'">'+(depth<current?'✓':depth===count?'♛':'◇')+'</span>';}).join('');
}
function pveTopMarkup(run){
  return sharedGameTopMarkup({counterLabel:'FLOOR',counterValue:run.floor,counterTotal:3,progressMarkup:pveProgressMarkup(run),meterLabel:'EXPEDITION FLAME',meterValue:run.flame,meterTotal:run.maxFlame,mapButton:true,extraClass:'pve-shared-top'});
}
function renderPveEntryLoading(){
  const humans=(bundle?.members||[]).filter(member=>member.member_type==='human'),ready=bundle?.run?.entryLoading?.ready||[];
  app.innerHTML='<section class="entry-loading"><div class="eyebrow">CO-OP EXPEDITION · ASSET LOADING</div><h1>원정대를 준비합니다</h1><p role="status">'+escape(pveEntryError||pveEntryProgress||'인간 플레이어 일러스트 확인 중')+'</p><div class="entry-members">'+humans.map(member=>'<div><b>'+escape(member.display_name)+'</b><span>'+(ready.includes(member.id)?'✓ 로딩 완료':'이미지 준비 중')+'</span></div>').join('')+'</div>'+(pveEntryError?'<button class="button primary" data-action="retry-pve-entry">다시 시도</button>':'')+'<button class="button secondary" data-action="leave-confirm">나가기</button></section>';
  updateBusy();
}
async function preparePveEntry(){
  const run=bundle?.run;if(!run||pveEntryWork===run.id||pveEntryCompleted===run.id)return;
  pveEntryWork=run.id;pveEntryError='';
  try{
    await loadPveEntryAssets(run,bundle.members,(done,total)=>{if(bundle?.run?.id!==run.id)return;pveEntryProgress='일러스트 '+done+' / '+total;renderPveEntryLoading();});
    if(bundle?.run?.id!==run.id)return;
    const response=await api.request('assets_loaded',{room_id:bundle.room.id,run_id:run.id,expected_version:run.version,action_id:crypto.randomUUID()});
    if(bundle?.run?.id!==run.id)return;
    pveEntryCompleted=run.id;pveEntryProgress='완료 · 동료를 기다리는 중';
    await accept(response);
  }catch(error){if(bundle?.run?.id===run.id){pveEntryCompleted=null;pveEntryError=error.message;renderPveEntryLoading();}}
  finally{if(pveEntryWork===run.id)pveEntryWork=null;}
}
function pveEncounterArt(run){
  const stage=pveStageModel(run);
  if(run.combat?.monster)return creatureArt(stage.shape,stage.color);
  const category=run.phase==='REST'?'recovery':run.phase==='SHOP'||run.phase==='REWARD_ROOM'?'treasure':'event';
  return eventArt(category,run.roomState?.id);
}
function pveMageIntentChoices(player,selectedCardId){
  const mana=Number(player?.publicResources?.mana)||0,augments=player?.augments||[];
  const max=augments.includes('aug-091')?3:2;
  const magnitudes=Array.from({length:max},(_,i)=>i+1).filter(level=>mana>=level*2);
  if(!augments.includes('aug-111'))return magnitudes;
  const base=player?.cardPool?.find(card=>card.id===selectedCardId)?.baseNumber;
  const choices=[];
  for(const level of magnitudes){
    for(const sign of [1,-1]){
      const delta=level*sign;
      if(base==null||base+delta>=0&&base+delta<=6)choices.push(delta);
    }
  }
  return choices;
}
function pveSkillData(run){
  const player=pvePlayerForUser(run,api.user?.id),level=Number(pveUseSkill)||0;
  if(player?.characterId!=='mage'||!level)return undefined;
  const data={manaSpend:Math.abs(level)*2};
  if((player.augments||[]).includes('aug-111'))data.direction=Math.sign(level);
  return data;
}
function renderPveGameplay(run,{presentation=null}={}){
  const adaptedBundle=pveGameplayBundle(bundle,run,{scope:'combat'}),players=pveGameplayPlayers(bundle,run,{scope:'combat'}),member=mine(),mePlayer=players[member?.id];
  const stage=pveStageModel(run),monster=presentation?.monsterBefore||run.combat?.monster,intent=run.combat?.monster?.intent;
  const locked=Boolean((run.combat?.readyPlayerIds||[]).includes(member?.id));
  app.innerHTML=pveTopMarkup(run)+sharedEncounterMarkup({categoryLabel:PVE_ROOM_LABELS[run.combat?.roomType]||'COMBAT',name:monster?.name||stage.name,subtitle:stage.subtitle,color:stage.color,enemyArt:pveEncounterArt(run),monster:monster?{...monster,boss:run.combat?.roomType==='BOSS',imminent:!presentation&&intent?.type&&!['CHARGE','DEFEND'].includes(intent.type)}:null,turnIndex:presentation?.turnIndex||run.combat?.turn||1,revealing:Boolean(presentation),threatLabel:run.combat?.roomType==='BOSS'?'BOSS PATTERN':'THREAT',threatValue:run.combat?.roomType==='BOSS'?'Ⅲ':'Ⅱ',threatDetail:presentation?'판정 중':'행동 예고',intentLabel:presentation?'◇ 카드 판정':intent?.type?'⚠ '+intent.type:'◇ 몬스터 의도',intentText:presentation?'동시 공개 결과를 판정하고 있습니다.':intent?.telegraphText||'몬스터의 행동을 주시하세요.'})+pveRelicStripMarkup(bundle,run)+'<section class="party-grid">'+partyPanels(adaptedBundle,players,{me:member,result:presentation,selected:pveSelected,useSkill:pveUseSkill,statLabel:'EXP'})+'</section>'+(presentation?'':mobileSelection(mePlayer,{result:null,locked,selected:pveSelected,useSkill:pveUseSkill,twoCards:false}));
  bindEventArtFallback(app);
  for(const p of Object.values(players))if(p.knockedOut)void setKnockoutPose(app.querySelector('[data-player="'+p.memberId+'"]'),true);
  if(pveMapOpen)app.insertAdjacentHTML('beforeend',pveMapOverlayMarkup(run,api.user?.id,{visitedNodes:[...pveVisitedNodes]}));
  updateBusy();
}
function pveSelectorNumber(run,cardId){
  const me=pvePlayerForUser(run,api.user?.id);return me?.cardPool?.find(card=>card.id===cardId)?.baseNumber??null;
}
function renderPveRoom(run){
  const member=mine(),scope=run.phase==='REWARD_ROOM'?'room':'combat',adaptedBundle=pveGameplayBundle(bundle,run,{scope}),players=pveGameplayPlayers(bundle,run,{scope}),mePlayer=players[member?.id],shopReservation=pveOwnShopReservation(run,member?.id);
  const selector=Boolean((run.phase==='SHOP'&&shopReservation)||(run.phase==='REST'&&pveEngraveMode)||(run.phase==='REWARD_ROOM'&&!run.roomState?.resolved&&run.roomState?.pickOrder?.[0]!==member?.id));
  const roomName=run.phase==='EVENT'?(run.roomState?.name||'던전 이벤트'):run.phase==='REST'?'휴식처':run.phase==='SHOP'?'던전 상점':run.phase==='REWARD_ROOM'?'보상 방':run.phase==='AUGMENT_CHOICE'?'증강 선택':run.phase==='ROOM_RESULT'?'방 공략 완료':'협력 탐험';
  const roomCategory=run.phase==='REST'?'A MOMENT OF REST':run.phase==='SHOP'?'TRADING POST':run.phase==='REWARD_ROOM'?'REWARD ROOM':run.phase==='EVENT'?'UNKNOWN ENCOUNTER':'CO-OP EXPEDITION · BETA';
  app.innerHTML=pveTopMarkup(run)+sharedEncounterMarkup({categoryLabel:roomCategory,name:roomName,subtitle:'FLOOR '+run.floor+' · DEPTH '+run.depth,color:'#8b779c',enemyArt:pveEncounterArt(run),turnIndex:run.combat?.turn||1,threatLabel:'ROOM',threatValue:'Ⅰ',threatDetail:'협력 선택',intentLabel:'◇ 방의 규칙',intentText:run.phase==='MAP_VOTE'?'다음 경로를 투표하세요.':run.phase==='SHOP'?'Run Gold로 필요한 상품을 구매합니다.':run.phase==='REST'?'각 플레이어가 자신의 휴식 행동을 선택합니다.':'파티와 함께 방의 선택을 해결하세요.'})+pveRelicStripMarkup(bundle,run)+'<section class="party-grid '+(selector?'pve-selector-shell':'')+'">'+partyPanels(adaptedBundle,players,{me:member,result:selector?null:{},selected:pveSelected,useSkill:false,statLabel:'EXP'})+'</section>'+(selector?mobileSelection(mePlayer,{result:null,locked:false,selected:pveSelected,useSkill:false,twoCards:false}):'');
  if(run.phase==='EVENT')app.insertAdjacentHTML('beforeend',pveEventActionsMarkup(run));
  if(run.phase==='REST')app.insertAdjacentHTML('beforeend',pveRestActionsMarkup(run,{engraveMode:pveEngraveMode,selectedNumber:pveSelectorNumber(run,pveSelected)}));
  if(run.phase==='SHOP')app.insertAdjacentHTML('beforeend',pveShopMarkup(run,{reservation:shopReservation,selectedCardId:pveSelected}));
  if(run.phase==='REWARD_ROOM')app.insertAdjacentHTML('beforeend',pveRewardPromptMarkup(run,pvePlayerForUser(run,api.user?.id)));
  if(run.phase==='AUGMENT_CHOICE'){
    if(run.augmentChoice?.resumePhase==='ROOM_RESULT')app.insertAdjacentHTML('beforeend',pveRoomResultOverlayMarkup(bundle,run,{interactive:false}));
    else if(run.augmentChoice?.resumePhase==='FLOOR_CLEAR')app.insertAdjacentHTML('beforeend','<section class="room-result-overlay pve-room-result"><div class="room-result-sheet pve-room-result-sheet"><div class="eyebrow">FLOOR CLEAR</div><h2>Floor '+escape(run.floor)+' 공략 완료</h2><p>증강 선택 후 다음 층 진행을 계속합니다.</p></div></section>');
    app.insertAdjacentHTML('beforeend',pveAugmentPopupMarkup(run));
  }
  if(run.phase==='ROOM_RESULT')app.insertAdjacentHTML('beforeend',pveRoomResultOverlayMarkup(bundle,run,{playerId:member?.id}));
  if(run.phase==='FLOOR_CLEAR'||run.phase==='FLOOR_TRANSITION')app.insertAdjacentHTML('beforeend','<section class="room-result-overlay pve-room-result"><div class="room-result-sheet pve-room-result-sheet"><div class="eyebrow">FLOOR CLEAR</div><h2>Floor '+escape(run.floor)+' 공략 완료</h2><button class="button secondary" data-action="pve-map-open">지도 확인 ◇</button></div></section>');
  if(pveMapOpen)app.insertAdjacentHTML('beforeend',pveMapOverlayMarkup(run,api.user?.id,{visitedNodes:[...pveVisitedNodes]}));
  bindEventArtFallback(app);updateBusy();
}
async function presentPveTurn(beforeRun,afterRun,presentation){
  if(pveAnimating)return;
  pveAnimating=true;pveSelected=null;pveUseSkill=false;
  try{renderPveGameplay(beforeRun,{presentation});await reveal(presentation);pveLastPresentedTurn=Math.max(pveLastPresentedTurn,presentation.turnIndex||0);}
  catch(error){console.error('PVE turn presentation failed:',error);toast('일부 협력 전투 연출을 재생하지 못했습니다. 최신 상태로 복구합니다.');}
  finally{pveAnimating=false;if(bundle?.run?.id===afterRun.id)renderPve();}
}
function renderPveRewardGameplay(run,{presentation=null}={}){
  const adaptedBundle=pveGameplayBundle(bundle,run,{scope:'room'}),players=pveGameplayPlayers(bundle,run,{scope:'room'}),member=mine();
  app.innerHTML=pveTopMarkup(run)+sharedEncounterMarkup({categoryLabel:'REWARD ROOM',name:'보상 방',subtitle:'FLOOR '+run.floor+' · DEPTH '+run.depth,color:'#8b779c',enemyArt:pveEncounterArt(run),turnIndex:presentation?.turnIndex||run.roomState?.attempt||1,revealing:Boolean(presentation),threatLabel:'REWARD',threatValue:'✦',threatDetail:presentation?'판정 중':'우선권 경쟁',intentLabel:'◇ 보상 판정',intentText:presentation?'동시 공개 결과를 판정하고 있습니다.':'카드를 제출해 유물 선택 우선권을 정합니다.'})+pveRelicStripMarkup(bundle,run)+'<section class="party-grid">'+partyPanels(adaptedBundle,players,{me:member,result:presentation,selected:pveSelected,useSkill:false,statLabel:'EXP'})+'</section>';
  bindEventArtFallback(app);
  if(pveMapOpen)app.insertAdjacentHTML('beforeend',pveMapOverlayMarkup(run,api.user?.id,{visitedNodes:[...pveVisitedNodes]}));
  updateBusy();
}
async function presentPveRewardAttempt(beforeRun,afterRun,presentation){
  if(pveAnimating)return;
  pveAnimating=true;pveSelected=null;pveUseSkill=false;
  try{renderPveRewardGameplay(beforeRun,{presentation});await reveal(presentation);pveLastPresentedRewardKey=presentation.key;}
  catch(error){console.error('PVE reward presentation failed:',error);toast('보상방 카드 공개 연출을 재생하지 못했습니다. 최신 상태로 복구합니다.');}
  finally{pveAnimating=false;if(bundle?.run?.id===afterRun.id)renderPve();}
}
function renderPve(){
  if(!bundle?.run)return;view='pve';
  const run=bundle.run;
  if(run.entryLoading){renderPveEntryLoading();const me=mine();if(!pveEntryWork&&!pveEntryError&&!run.entryLoading.ready?.includes(me?.id)&&pveEntryCompleted!==run.id)void preparePveEntry();return;}
  pveEntryCompleted=run.id;
  const me=pvePlayerForUser(run,api.user?.id);
  if(['RUN_CLEAR','RUN_FAILED','ABANDONED'].includes(run.phase)){app.innerHTML=pveTerminalMarkup(bundle,run,me);updateBusy();return;}
  if(run.phase==='COMBAT')renderPveGameplay(run);else renderPveRoom(run);
}
async function accept(next, restoring = false) {
  if (!next.room) return;
  const previousPve=bundle?.run&&next.run?.id===bundle.run.id?structuredClone(bundle.run):null;
  if (bundle?.room.id === next.room.id && next.room.version < bundle.room.version) return;
  const newRoom = bundle?.room.id !== next.room.id;
  const newSession = next.session?.id && next.session.id !== sessionIdentity;
  const newPveRun = next.run?.id && next.run.id !== pveRunIdentity;
  if(newRoom&&!next.session&&!next.run)await ensureRoomAssets(next.members,api.user?.id,getAccount()?.loadout);
  if (newSession && !next.session.state.entryLoading) await preloadSession(next.session);
  if (bundle?.room.id === next.room.id && next.room.version < bundle.room.version) return;
  if (newRoom) roomEpoch++;
  if(newSession){entryError='';entryProgress='';entryCompleted=null;}
  if(newPveRun){pveSelected=null;pveUseSkill=false;pveMapOpen=next.run?.phase==='MAP_VOTE';pveEngraveMode=false;pveEntryError='';pveEntryProgress='';pveEntryCompleted=null;pveVisitedNodes.clear();pveLastPresentedTurn=restoring?(next.run?.combat?.publicTurnResult?.turn||0):0;const rewardResult=next.run?.roomState?.publicTurnResult;pveLastPresentedRewardKey=restoring&&rewardResult?((next.run.currentRoomNodeId||'reward')+':'+(rewardResult.attempt||1)):'';}
  bundle = next;
  void getAudio().setScene(next.session||next.run ? 'dungeon' : 'lobby');
  if (newRoom) await api.subscribe(next.room.id, sync, status);
  if(next.run){
    pveRunIdentity=next.run.id;
    if(next.run.map?.currentNodeId)pveVisitedNodes.add(next.run.map.currentNodeId);
    if(previousPve?.phase!=='MAP_VOTE'&&next.run.phase==='MAP_VOTE')pveMapOpen=true;
    if(['RUN_CLEAR','RUN_FAILED','ABANDONED'].includes(next.run.phase)&&rewardRefreshSession!==next.run.id){rewardRefreshSession=next.run.id;void refreshAccount().catch(()=>{});}
    const presentation=previousPve?adaptPveTurnResult(bundle,previousPve,next.run):null;
    const rewardPresentation=previousPve?adaptPveRewardResult(previousPve,next.run):null;
    if(presentation&&presentation.turnIndex>pveLastPresentedTurn&&!pveAnimating&&!document.hidden)await presentPveTurn(previousPve,next.run,presentation);
    else if(rewardPresentation&&rewardPresentation.key!==pveLastPresentedRewardKey&&!pveAnimating&&!document.hidden)await presentPveRewardAttempt(previousPve,next.run,rewardPresentation);
    else renderPve();
    updateBusy();
    return;
  }
  pveRunIdentity=null;
  if (next.session?.status !== 'active' && next.session && rewardRefreshSession !== next.session.id) { rewardRefreshSession=next.session.id; void refreshAccount().catch(()=>{}); }
  if (next.session?.id !== sessionIdentity) {
    sessionIdentity = next.session?.id || null;
    lastResult = restoring ? (next.session?.state.lastResult?.turnIndex || 0) : 0;
    queue = []; selected = null; useSkill = false;
  }
  view = next.session ? 'game' : 'lobby';
  if (next.session) {
    void showGameBackground(next.session.id);
    // Catch up to the latest turn instead of replaying minutes of stale battles.
    const newResults = next.session.state.eventLog.filter(e => e.type === 'turn_result' && e.turnIndex > lastResult).slice(-2);
    for (const r of newResults) { queue.push(r); lastResult = r.turnIndex; selected = null; useSkill = false; }
    if (document.hidden && queue.length > 2) queue = queue.slice(-2);
    if (!animating) {
      if (queue.length && !document.hidden) void playQueue();
      else {
        if (!queue.length) renderGame();
        if (!document.hidden && !queue.length && newSession && !restoring && next.session.status === 'active') {
          for (const p of Object.values(next.session.state.players)) if(['random','continuous'].includes(p.character?.definition?.deckType)) void animateCycle({memberId:p.memberId,random:true,cards:p.cycleCards});
        }
      }
    }
  } else {renderLobby();warmLobbyAssets(next.members.map(m=>({...m,loadout:m.user_id===api.user?.id?getAccount()?.loadout:m.loadout})));}
  updateBusy();
}
async function playQueue() {
  animating = true;
  try {
    while (queue.length && bundle && !document.hidden) {
      const result = queue.shift();
      try {
        renderGame(result); await reveal(result);
        if (document.hidden) { queue.unshift(result); break; }
      }
      catch (error) {
        console.error('Turn presentation failed:', result.turnIndex, error);
        toast('일부 전투 연출을 재생하지 못했습니다. 다음 턴은 계속 진행됩니다.');
      }
    }
  } catch (error) {
    console.error('Turn queue failed:', error);
    toast('전투 화면을 최신 상태로 복구했습니다.');
  } finally {
    animating = false;
    if (bundle?.session) { renderGame(); if (bundle.session.status !== 'active'&&!bundle.session.state.roomSummary) finale(bundle.session.status === 'completed'); }
  }
}
async function sync() {
  if (!connected) return;
  if (syncing) { resync = true; return; }
  syncing = true;
  const epoch = roomEpoch;
  const roomId = bundle?.room.id;
  try {
    const next = await api.request('get_room_state', roomId ? { room_id: roomId } : {});
    if (epoch !== roomEpoch) return;
    if (next.room) await accept(next, !bundle);
    else if (bundle) {
      roomEpoch++; await api.unsubscribe(); bundle = null; queue = []; sessionIdentity = null; pveRunIdentity=null; lastResult = 0;
      selected = null; useSkill = false; renderHome();
      toast('접속이 오래 끊겨 방이 종료되었습니다. 새 방을 만들어 주세요.');
    }
  } catch (error) { status('연결 복구 중', false); }
  finally { syncing = false; if (resync) { resync = false; void sync(); } }
}
function renderHome() {
  void getAudio().setScene('lobby');
  view = 'home';
  app.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-diamond"></span> 4인 협력 · 심리전 던전 레이드</div><h1>네 장의 카드.<br>하나의 <em>운명.</em></h1><p class="hero-description">같은 숫자는 사라진다.<br>동료의 패를 읽고, 던전의 끝까지 살아남아라.</p><div class="hero-actions"><button class="button primary" data-action="create">방 생성 <span>↗</span></button><button class="button secondary" data-action="find">방 찾기 <span>⌕</span></button><button class="button secondary" data-action="character-guide">캐릭터 도감 <span>◇</span></button></div><div class="hero-facts"><span><b>04</b> PLAYERS</span><span><b>10</b> STAGES</span><span><b>05</b> CARDS</span></div></div><div class="hero-visual">${dungeonArt()}<span class="art-label">THE GATE IS OPEN<br><b>당신의 선택을 기다립니다</b></span><div class="hero-card card-one"><small>Ⅰ</small><strong>1</strong><span>◇</span></div><div class="hero-card card-five"><small>Ⅴ</small><strong>5</strong><span>✧</span></div><div class="hero-card card-three"><small>Ⅲ</small><strong>3</strong><span>◇</span></div><div class="visual-caption"><span class="live-dot"></span> 믿을 건, 당신의 눈치뿐.</div></div></section><section class="principles"><article><span class="principle-number">01 /</span><div><h3>눈치껏, 한 장</h3><p>공개된 카드 풀에서 비밀리에 한 장을 선택하세요.</p></div><span class="principle-symbol">♠</span></article><article><span class="principle-number">02 /</span><div><h3>겹치면, 사라진다</h3><p>같은 숫자를 낸 카드들은 모두 무효가 됩니다.</p></div><span class="principle-symbol">⨯</span></article><article><span class="principle-number">03 /</span><div><h3>함께, 끝까지</h3><p>누적 기절 8회면 전멸. 보스까지 살아남으세요.</p></div><span class="principle-symbol">⚑</span></article></section>${!api.configured ? '<div class="setup-note"><span>연결 설정 대기</span> config.js에 Supabase URL과 publishable key를 입력하면 온라인 원정이 열립니다. <button data-action="setup">설정 안내 ↗</button></div>' : ''}`;
  app.insertAdjacentHTML('beforeend','<nav class="meta-menu" aria-label="계정 콘텐츠"><button data-meta="ranking"><small>HALL OF FAME</small>랭킹 ↗</button><button data-meta="shop"><small>TRADING POST</small>상점 ↗</button><button data-meta="inventory"><small>YOUR COLLECTION</small>인벤토리 ↗</button><button data-meta="account"><small>ADVENTURER ACCOUNT</small>계정 / 등록 ↗</button></nav>');
}
function connectionNeeded() {
  if (connected) return false;
  if (!api.configured) setupHelp(); else toast('서버 연결 중입니다. 잠시 후 다시 시도해 주세요.');
  return true;
}
function setupHelp() {
  showModal('<div class="eyebrow">SERVER CONNECTION</div><h2>던전의 문을 열 준비</h2><p>프로젝트의 <code>config.js</code>에 <b>SUPABASE_URL</b>과 <b>SUPABASE_PUBLISHABLE_KEY</b>를 입력하세요.</p><ol class="guide-list"><li>Supabase Anonymous Auth 활성화</li><li>동봉한 SQL 마이그레이션 적용</li><li><code>game-api</code> Edge Function 배포</li><li>Realtime에서 private 채널 사용 설정</li><li><code>npm start</code> 실행 후 새로고침</li></ol><p class="muted">정확한 명령과 검증 항목은 README.md에 있습니다.</p>');
}
async function createModal() {
  if (connectionNeeded()) return;
  try{
    const publicConfig=await api.request('get_public_config');
    coopPveEnabled=publicConfig?.coopPveEnabled!==false;
  }catch(error){
    toast(error.message);
  }
  showModal(`<div class="eyebrow">NEW EXPEDITION</div><h2>동료를 모으세요.</h2><p>누가 같은 카드를 낼지, 아무도 모릅니다.</p><form id="create-form"><label>방 제목<input name="room_title" required maxlength="40" placeholder="눈치 좋은 모험가 구합니다" autocomplete="off"></label><label>비밀번호 <span class="muted">선택 사항</span><input name="password" type="password" maxlength="72" placeholder="비워두면 누구나 참가할 수 있어요" autocomplete="new-password"></label>${gameModeSelectorMarkup(coopPveEnabled)}<button class="button primary full" data-network>방 생성하기 <span>→</span></button></form>`);
}
async function renderFind() {
  if (connectionNeeded()) return;
  view = 'find';
  app.innerHTML = `<section class="page-heading"><div><div class="eyebrow">FIND YOUR PARTY</div><h1>함께할 동료들.</h1><p>빈자리에 합류하고, 새로운 원정을 시작하세요.</p></div><button class="button secondary" data-action="home">← 돌아가기</button></section><div class="find-layout"><section><div class="section-label">공개 원정 <button class="text-button" data-action="refresh">새로고침 ↻</button></div><div id="room-list" class="room-list"><div class="empty-state">원정 목록을 불러오는 중…</div></div></section><aside class="join-box"><span class="eyebrow">HAVE AN INVITATION?</span><h2>초대받았나요?</h2><p>동료에게 받은 6자리 코드를 입력하세요.</p><form id="code-form"><input name="room_code" class="code-input" required minlength="6" maxlength="6" pattern="[A-Za-z2-9]{6}" placeholder="ABC234" autocomplete="off" aria-label="방 코드"><button class="button primary full" data-network>코드로 참가 <span>→</span></button></form><div class="aside-rule">네 명이 모이면 출발합니다.<br>빈자리는 AI로 채울 수 있어요.</div></aside></div>`;
  await loadRooms();
}
async function loadRooms() {
  if (listLoading) return;
  listLoading = true;
  try {
    const { rooms } = await api.request('list_rooms');
    const el = document.querySelector('#room-list'); if (!el) return;
    el.innerHTML = rooms.length ? rooms.map(r => `<article class="room-list-card"><div class="room-mini-icon">${r.has_password ? '▣' : '◇'}</div><div class="room-card-info"><div class="room-mode-row">${gameModeBadge(r.gameMode)}</div><h3>${escape(r.room_title)}</h3><p>${r.has_password ? '비밀번호 있음' : '자유 참가'} <span>·</span> AI ${r.ai_count}명 <span>·</span> ${r.status === 'waiting' ? '대기 중' : '플레이 중'}</p></div><strong class="member-count">${r.member_count}<small> / 4</small></strong><button class="button small secondary" data-action="join" data-id="${r.id}" data-password="${r.has_password}" ${r.status !== 'waiting' || r.member_count >= 4 ? 'disabled' : ''}>참가 →</button></article>`).join('') : '<div class="empty-state"><span>◇</span><h3>아직 열린 원정이 없어요.</h3><p>첫 번째 원정대를 만들어보세요.</p><button class="button primary" data-action="create">방 생성 →</button></div>';
  } catch (error) { toast(error.message); const el = document.querySelector('#room-list'); if (el) el.innerHTML = '<div class="empty-state">목록을 불러오지 못했습니다. 새로고침해 주세요.</div>'; }
  finally { listLoading = false; }
}
function joinModal(params, password = false) {
  if (!password) { void perform('join_room', params); return; }
  showModal('<div class="eyebrow">PRIVATE PARTY</div><h2>비밀번호를 입력하세요.</h2><form id="password-form"><label>방 비밀번호<input type="password" name="password" required maxlength="72" autocomplete="current-password"></label><button class="button primary full" data-network>참가하기 →</button></form>');
  document.querySelector('#password-form').addEventListener('submit', e => { e.preventDefault(); void perform('join_room', { ...params, password: new FormData(e.target).get('password') }); });
}
function aiModal() {
  showModal(`<div class="eyebrow">CHOOSE A COMPANION</div><h2>어떤 동료와 함께할까요?</h2><p>AI도 공개 정보와 자신에게 허용된 계시만 사용합니다.</p><div class="ai-options">${Object.entries(AI).map(([id, [name, description]], i) => `<button data-action="add-ai" data-type="${id}" data-network><span class="ai-icon">${['◈', '♛', '◇', '♜', '✧'][i]}</span><span><b>${name}</b><small>${description}</small></span><code>${id}</code></button>`).join('')}</div>`);
}
function renderLobby() {
  const {room,members}=bundle,host=isHost(),ready=m=>m.member_type==='ai'||m.lobby_ready===true;
  const mode=roomGameMode(room),modeMeta=gameModeMeta(mode),unsupported=mode===GAME_MODE.COOP_PVE?members.filter(m=>!PVE_SUPPORTED_LOBBY_CHARACTER_IDS.has(m.character_id)):[];
  const count=members.filter(ready).length,canStart=members.length===4&&count===4&&!unsupported.length;
  app.innerHTML=`<section class="page-heading"><div><div class="eyebrow">BASE CAMP · 원정 준비</div><h1>${escape(room.room_title)}</h1><div class="lobby-mode">${gameModeBadge(mode)}${modeMeta.beta?`<span>${escape(modeMeta.reward)}</span>`:''}</div></div><button class="button secondary" data-action="leave-confirm">나가기 ↗</button></section><section class="invite-bar"><div><span>ROOM CODE</span><strong>${room.room_code}</strong><button class="text-button" data-action="copy">코드 복사 ⧉</button></div><span>${count} / 4 준비 완료</span></section><div class="lobby-slots">${[0,1,2,3].map(seat=>{
    const m=members.find(m=>m.seat_index===seat);
    if(!m)return `<article class="lobby-slot empty"><span class="seat-number">0${seat+1}</span><div class="empty-avatar">＋</div><h3>동료를 기다리는 중</h3>${host?'<button class="button secondary small" data-action="ai">AI 동료 추가 +</button>':''}</article>`;
    const character=characterFor(bundle,m.character_id),own=m.user_id===api.user.id;
    return `<article class="lobby-slot illustrated-lobby seat-${seat}"><div class="lobby-illustration" aria-hidden="true"><img src="${skinFor(character.id,own?getAccount()?.loadout:m.loadout).preview}" alt="" draggable="false"></div><span class="seat-number">0${seat+1}</span><span class="member-badge">${m.member_type==='ai'?'AI COMPANION':'HUMAN'}${m.user_id===room.host_user_id?' · HOST':''}</span><div class="lobby-member-info"><h3>${escape(m.display_name)}</h3><p>${escape(character.display_name)}</p><p class="lobby-deck">${escape(deckLabel(character))}</p><p>${escape(character.definition?.skill?.name||'')}</p>${own||(host&&m.member_type==='ai')?`<button class="button secondary small" data-action="character-select" data-member="${m.id}">캐릭터 선택</button>`:''}<span class="ready-marker">${ready(m)?'✓ 준비 완료':'캐릭터 선택 · 준비 대기'}</span>${own?`<button class="button ${ready(m)?'secondary':'primary'} small" data-action="lobby-ready" data-ready="${!ready(m)}" data-network>${ready(m)?'준비 취소':'준비'}</button>`:''}${host&&m.member_type==='ai'?`<button class="text-button remove-ai" data-action="remove-ai" data-id="${m.id}" data-network>AI 제거</button>`:''}</div></article>`;
  }).join('')}</div><section class="departure"><div><span class="eyebrow">YOUR PARTY</span><h2>${count}<small> / 4명 준비 완료</small></h2><p>${unsupported.length?`협력 탐험 미지원 캐릭터: ${unsupported.map(m=>escape(characterFor(bundle,m.character_id).display_name)).join(', ')}`:mode===GAME_MODE.COOP_PVE?'협력 탐험 Beta · 경쟁 RP는 변동하지 않습니다.':'캐릭터를 변경하면 준비가 취소됩니다.'}</p></div>${host?`<button class="button primary start-button" data-action="start" data-network data-unavailable="${!canStart}" ${canStart?'':'disabled'}>${canStart?(mode===GAME_MODE.COOP_PVE?'협력 탐험 시작 →':'던전 입장 →'):unsupported.length?'PVE 미지원 캐릭터 변경 필요':'동료의 준비를 기다리는 중'}</button>`:'<p class="muted">호스트의 출발을 기다리는 중</p>'}</section>`;
}
function renderEntryLoading(){
 const s=bundle.session.state,ready=s.entryLoading?.ready||[];
 app.innerHTML=`<section class="entry-loading"><div class="eyebrow">EXPEDITION LOADING</div><h1>원정대를 준비합니다</h1><p role="status">${escape(entryError||entryProgress||'일러스트 확인 중')}</p><div class="entry-members">${bundle.members.map(m=>`<div><b>${escape(m.display_name)}</b><span>${m.member_type==='ai'||ready.includes(m.id)?'✓ 로딩 완료':'이미지 준비 중'}</span></div>`).join('')}</div>${entryError?'<button class="button primary" data-action="retry-entry">다시 시도</button>':''}<button class="button secondary" data-action="leave-confirm">나가기</button></section>`;
}
async function prepareEntry(){
 if(entryWork||!bundle?.session?.state.entryLoading)return;
 const session=bundle.session,roomId=bundle.room.id;entryWork=session.id;entryError='';
 try{
  await loadEntryAssets(session,(done,total)=>{if(bundle?.session?.id!==session.id)return;entryProgress=`일러스트 ${done} / ${total}`;if(bundle.session.state.entryLoading)renderEntryLoading();});
  if(bundle?.session?.id!==session.id)return;
  const response=await api.request('assets_loaded',{room_id:roomId,session_id:session.id});
  if(bundle?.session?.id!==session.id)return;
  entryCompleted=session.id;entryProgress='완료 · 동료를 기다리는 중';await accept(response);
 }catch(error){if(bundle?.session?.id===session.id){entryError=error.message;renderEntryLoading();}}
 finally{entryWork=null;if(bundle?.session?.state.entryLoading&&!entryError&&entryCompleted!==bundle.session.id)void prepareEntry();}
}
function hearts(player) { return Array.from({ length: player.maxHp }, (_, i) => `<span class="heart ${i < player.hp ? 'filled' : ''}">♥</span>`).join(''); }
function renderGame(result = null) {
  if (!bundle?.session) return;
  if(bundle.session.state.entryLoading){renderEntryLoading();if(!entryWork&&!entryError&&entryCompleted!==bundle.session.id)void prepareEntry();return;}
  const g = bundle.session, s = g.state, me = mine();
  if (!result && g.status !== 'active' && !s.roomSummary) { renderEnd(); return; }
  const stage = result?.stage || s.currentStage;
  const monster = result ? result.monsterBefore : s.monster;
  const players = result?.beforePlayers || s.players;
  const player = players[me?.id];
  const locked = Boolean(s.roomSummary || (s.lockedMembers.includes(me?.id) && !s.selectionHolds?.[me?.id]));
  const stageIndex = result?.stageIndex || g.stage_index;
  const turnIndex = result?.turnIndex || g.turn_index;
  const previousTwins=new Map([...app.querySelectorAll("[data-player]")].map(el=>[el.dataset.player,el.querySelector(".twins-art")?.dataset.parity]));
  const progressMarkup=s.stageOrder.map((st,i)=>`<span class="stage-node ${i+1<stageIndex?'passed':i+1===stageIndex?'current':''}" title="Stage ${i+1}">${i===9?'♛':i+1<stageIndex?'✓':'◇'}</span>`).join('');
  const topMarkup=sharedGameTopMarkup({counterLabel:'STAGE',counterValue:stageIndex,counterTotal:10,progressMarkup,meterLabel:'누적 기절',meterValue:g.party_knockouts,meterTotal:8,meterDanger:g.party_knockouts>=7});
  const intentLabel=monster?(monster.attackIn===1?(stage.category==='boss'&&monster.nextAction==='special'?'✦ 이번 턴 특수 패턴':'⚠ 이번 턴 공격'):`◷ ${monster.attackIn}턴 후 ${stage.category==='boss'&&monster.nextAction==='special'?'특수 패턴':'공격'}`):'◇ 방의 규칙';
  const encounterMarkup=sharedEncounterMarkup({categoryLabel:categoryLabel[stage.category],name:stage.name,subtitle:stage.subtitle||'당신의 카드가 다음 운명을 결정합니다',color:stage.color,enemyArt:monster?creatureArt(stage.shape,stage.color):eventArt(stage.category,stage.contentId),monster:monster?{...monster,boss:stage.category==='boss',imminent:monster.attackIn===1}:null,turnIndex,revealing:Boolean(result),threatLabel:monster?'THREAT':'ENCOUNTER',threatValue:monster?(stage.category==='boss'?'Ⅲ':'Ⅱ'):'Ⅰ',threatDetail:monster?'공격 예고 확인':'한 턴으로 판정',intentLabel,intentText:monster?.intent||stage.rule,bossStatus:monster?.statusText||''});
  app.innerHTML=topMarkup+encounterMarkup+`<section class="party-grid">${partyPanels(bundle,players,{me,result:result||s.roomSummary,selected,useSkill})}</section>${s.roomSummary?'':mobileSelection(player,{result,locked,selected,useSkill,twoCards:isShuffleTurn(g)})}<details class="battle-log"><summary>원정 기록 <span>${s.eventLog.length} TURNS</span></summary><div>${[...s.eventLog].reverse().map(log=>`<p><span>STAGE ${log.stageIndex} · TURN ${log.turnIndex}</span><b>${escape(log.stage.name)}</b> ${log.cards.filter(c=>!c.valid).length}장 중복 · ${log.monsterBefore?`${log.totalDamage} 피해`:log.success?'성공':'조건 미달'}${log.stageCleared?' · 다음 방':''}</p>`).join('')||'<p>첫 번째 선택을 기다리고 있습니다.</p>'}</div></details>`;
  bindEventArtFallback(app);
  for(const panel of app.querySelectorAll('[data-player]')){
    const before=previousTwins.get(panel.dataset.player),after=panel.querySelector('.twins-art')?.dataset.parity;
    if(before&&after&&before!==after)animateTwinHandoff(panel);
  }
  if(!result&&s.remakeVersion){
    app.querySelector('.party-grid')?.insertAdjacentHTML('beforebegin',echoHud(bundle,me));
    if(s.selectionHolds?.[me?.id]&&s.lockedMembers.includes(me.id))app.insertAdjacentHTML('beforeend','<div class="echo-hud"><button data-action="confirm-card" data-network>현재 카드 확정 ✓</button><span>다른 카드를 골라 한 번 다시 제출할 수 있습니다.</span></div>');
    if(s.roomSummary){const key=g.id+':'+s.roomSummary.stageIndex;app.insertAdjacentHTML('beforeend',roomSummaryMarkup(bundle,me,shownSummary!==key));shownSummary=key;const overlay=app.querySelector('.room-result-overlay');for(const child of app.children)if(child!==overlay)child.inert=true;overlay.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
  }
  for (const p of Object.values(players)) if (p.knockedOut) {
    void setKnockoutPose(app.querySelector(`[data-player="${p.memberId}"]`),true);
  }
  updateBusy();
}
function renderEnd() {
  const g = bundle.session;
  const success = g.status === 'completed';
  const ranked = [...bundle.members].sort((a, b) => g.state.players[b.id].score - g.state.players[a.id].score);
  app.innerHTML = `<section class="end-screen ${success ? 'victory' : 'failure'}"><div class="end-emblem">${success ? '♛' : '♠'}</div><div class="eyebrow">${success ? 'EXPEDITION COMPLETE' : 'EXPEDITION FAILED'}</div><h1>${success ? '던전이 당신을 기억합니다.' : '이번 운명은, 여기까지.'}</h1><p>${success ? '열 개의 방, 그리고 마지막 보스. 함께 살아남았습니다.' : `누적 기절 8회. ${g.stage_index}스테이지 도달 · 이번 원정 점수와 골드 ${g.state.settlement?.percent||0}% 정산`}</p><div class="account-notice">${getAccount()?.profile.account_type==='registered'?(success?'RP는 순위 기본값 + 평균 점수와의 차이 × 0.35 + Run Gold × 0.1로 정산됩니다. 공동 2위까지 RP 손실을 방지하며, 순위별 상·하한이 적용됩니다. 보상은 한 번만 지급됩니다.':'전멸 정산 골드는 계정에 한 번 지급됩니다. 영구 RP와 클리어 횟수는 유지됩니다.'):'게스트의 이번 원정 점수와 골드는 영구 저장되지 않습니다.'}</div><div class="end-stats"><span>도달 스테이지 <b>${g.stage_index} / 10</b></span><span>플레이한 턴 <b>${g.turn_index - 1}</b></span><span>누적 기절 <b>${g.party_knockouts} / 8</b></span></div><div class="ranking">${ranked.map((m, i) => `<div><span class="rank">0${1 + ranked.filter(other => g.state.players[other.id].score > g.state.players[m.id].score).length}</span><span class="small-avatar avatar-${m.seat_index}">${skinPortrait(g.state.players[m.id].characterId,g.state.players[m.id].loadout)}</span><b>${escape(m.display_name)}${m.user_id === api.user.id ? ' · 나' : ''}</b><span>${g.state.players[m.id].score} <small>PTS${g.state.settlement?` · ${g.state.settlement.players[m.id]?.rawScore??0} × ${g.state.settlement.percent}%`:''}</small></span><span>${g.state.players[m.id].gold} <small>G${g.state.settlement?` · ${g.state.settlement.players[m.id]?.rawGold??0} × ${g.state.settlement.percent}%`:''}</small></span></div>`).join('')}</div><button class="button primary" data-action="leave" data-network>새로운 원정 준비 <span>→</span></button></section>`;
}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'home') renderHome();
  if (action === 'setup') setupHelp();
  if (action === 'character-guide') showModal(characterGuide());
  if(action==='gambler-deck'&&!animating)showModal(gamblerPileDetails(bundle?.session?.state.players[mine()?.id],button.dataset.pile));
  if (action === 'create') void createModal();
  if (action === 'find') void renderFind();
  if (action === 'refresh') void loadRooms();
  if (action === 'join') joinModal({ room_id: button.dataset.id }, button.dataset.password === 'true');
  if (action === 'ai') aiModal();
  if (action === 'character-select') showModal(characterChoices(bundle, button.dataset.member));
  if(action==='lobby-ready')void perform('set_ready',{ready:button.dataset.ready==='true'});
  if(action==='retry-entry'){entryError='';void prepareEntry();}
  if(action==='retry-pve-entry'){pveEntryError='';void preparePveEntry();}
  if (action === 'set-character') void perform('set_character', { member_id: button.dataset.member, character_id: button.dataset.character });
  if (action === 'skill-info') {
    const c = characterFor(bundle, button.dataset.character), skill = c.definition?.skill;
    if (skill) showModal(`<div class="eyebrow">${skill.type === 'hybrid' ? 'PASSIVE & ACTIVE' : skill.type.toUpperCase()} · ${escape(c.display_name)}</div><h2>${escape(skill.name)}</h2><p>${escape(skill.description)}</p>`);
  }
  if (action === 'toggle-skill' && !animating && !pveAnimating) { if(view==='pve'){const p=pvePlayerForUser(bundle?.run,api.user?.id);if(p?.characterId==='mage'){const choices=pveMageIntentChoices(p,pveSelected),current=Number(pveUseSkill)||0,index=choices.indexOf(current);pveUseSkill=choices.length?(index<0?choices[0]:index===choices.length-1?0:choices[index+1]):0;}else pveUseSkill=!pveUseSkill;renderPve();}else{const p=bundle?.session?.state.players[mine()?.id];useSkill=p?.skillId==='amplify'?nextAmplifyLevel(p.characterRuntimeState.mana||0,Number(useSkill)||0):!useSkill;renderGame();} }
  if(action==='activate-acrobatics'&&!animating&&!pveAnimating&&view==='pve'){void performPve(bundle.run?.phase==='REWARD_ROOM'?'pve.rewardActivateSkill':'pve.activateSkill');}
  else if(action==='activate-acrobatics'&&!animating&&bundle?.session){
    const member=mine(),session=bundle.session;
    const response=await perform('activate_skill',{session_id:session.id,turn_index:session.turn_index,member_id:member.id});
    if(response?.session?.state.players[member.id]?.characterRuntimeState.acrobatTurn===session.turn_index){
      selected=null;useSkill=false;renderGame();
      void showSkillEffect(document.querySelector(`[data-player="${member.id}"]`),'acrobatics','곡예 · 교대!');
    }
  }
  if(action==='activate-revelation'&&!animating&&!pveAnimating&&view==='pve'){void performPve('pve.activateSkill');}
  else if (action === 'activate-revelation' && !animating && bundle?.session) {
    const member = mine(), session = bundle.session;
    const response = await perform('activate_skill', { session_id:session.id, turn_index:session.turn_index, member_id:member.id });
    if (response?.session?.state.players[member.id]?.characterRuntimeState.revealExpiresTurn === session.turn_index) {
      void showSkillEffect(document.querySelector(`[data-player="${member.id}"]`), 'revelation', '계시 · 이번 턴 전체 공개');
    }
  }
  if (action === 'add-ai') void perform('add_ai', { ai_type: button.dataset.type });
  if (action === 'remove-ai') void perform('remove_ai', { member_id: button.dataset.id });
  if (action === 'start') void perform('start_game');
  if(action==='pve-map-open'){pveMapOpen=true;if(pveAnimating)app.insertAdjacentHTML('beforeend',pveMapOverlayMarkup(bundle.run,api.user?.id,{visitedNodes:[...pveVisitedNodes]}));else renderPve();}
  if(action==='pve-map-close'){pveMapOpen=false;if(pveAnimating)button.closest('.pve-map-overlay')?.remove();else renderPve();}
  if(action==='pve-vote')void performPve('pve.voteNextRoom',{node_id:button.dataset.nodeId});
  if(action==='pve-relic-info'){const relic=relicUi(button.dataset.relicId);showModal('<div class="eyebrow">RELIC</div><h2>'+escape(relic.name)+'</h2><p>'+escape(relic.text)+'</p>');}
  if(action==='pve-submit-card')void performPve('pve.submitCard',{card_instance_id:button.dataset.cardId,skill_intent:button.dataset.useSkill==='true'});
  if(action==='pve-augment')void performPve('pve.chooseAugment',{augment_id:button.dataset.augmentId});
  if(action==='pve-event')void performPve('pve.chooseEventOption',{option_id:button.dataset.optionId});
  if(action==='pve-rest')void performPve('pve.restChoice',{choice:button.dataset.choice});
  if(action==='pve-rest-engrave'){pveEngraveMode=true;pveSelected=null;renderPve();}
  if(action==='pve-rest-engrave-cancel'){pveEngraveMode=false;pveSelected=null;renderPve();}
  if(action==='pve-rest-engrave-confirm'&&pveSelected){const number=pveSelectorNumber(bundle.run,pveSelected);if(number!=null)showModal('<div class="eyebrow">NUMBER ENGRAVING · CONFIRM</div><h2>숫자 '+escape(number)+'을 각인할까요?</h2><p>각인은 물리 카드 슬롯이 아니라 이 숫자 값에 적용됩니다.</p><button class="button primary full" data-action="pve-rest-engrave-apply" data-number="'+escape(number)+'">각인 적용 →</button>');}
  if(action==='pve-rest-engrave-apply'){const number=Number(button.dataset.number);modal.close();if(Number.isInteger(number)){pveEngraveMode=false;pveSelected=null;void performPve('pve.restChoice',{choice:'ENGRAVE',number});}}
  if(action==='pve-shop-item'){const room=bundle.run?.roomState||{},item=[...(room.cardStock||[]),...(room.relicStock||[])].find(x=>x.id===button.dataset.productId);if(item){if(item.kind==='CARD')showModal('<div class="eyebrow">SHOP · CARD</div><h2>숫자 '+escape(item.value)+' 카드</h2><p>가격 '+escape(item.price)+'G · 구매하면 내 카드 한 장과 교체합니다.</p><button class="button primary full" data-action="pve-shop-reserve" data-product-id="'+escape(item.id)+'">교체 카드 선택 →</button>');else{const relic=relicUi(item.relicId);showModal('<div class="eyebrow">SHOP · RELIC</div><h2>'+escape(relic.name)+'</h2><p>'+escape(relic.text)+'</p><p>'+escape(item.price)+'G</p><button class="button primary full" data-action="pve-shop-buy-relic-confirm" data-product-id="'+escape(item.id)+'">구매 확인 →</button>');}}}
  if(action==='pve-shop-reserve'){const productId=button.dataset.productId;modal.close();pveSelected=null;void performPve('pve.shopReserveCard',{product_id:productId});}
  if(action==='pve-shop-buy-relic-confirm'){const room=bundle.run?.roomState||{},item=(room.relicStock||[]).find(x=>x.id===button.dataset.productId);if(item){const relic=relicUi(item.relicId);showModal('<div class="eyebrow">SHOP · CONFIRM</div><h2>'+escape(relic.name)+'을 구매할까요?</h2><p>'+escape(item.price)+'G를 사용합니다.</p><button class="button primary full" data-action="pve-shop-buy-relic-apply" data-product-id="'+escape(item.id)+'">구매 확정 →</button>');}}
  if(action==='pve-shop-buy-relic-apply'){modal.close();void performPve('pve.shopBuyRelic',{product_id:button.dataset.productId});}
  if(action==='pve-shop-confirm-card'&&button.dataset.productId&&pveSelected){const productId=button.dataset.productId,room=bundle.run?.roomState||{},item=(room.cardStock||[]).find(x=>x.id===productId&&x.reservedByPlayerId===mine()?.id),number=pveSelectorNumber(bundle.run,pveSelected);if(item)showModal('<div class="eyebrow">SHOP · CARD REPLACEMENT · CONFIRM</div><h2>이 카드를 교체할까요?</h2><p>내 숫자 '+escape(number)+' 카드 → 상점 숫자 '+escape(item.value)+' 카드 · '+escape(item.price)+'G</p><button class="button primary full" data-action="pve-shop-confirm-card-apply" data-product-id="'+escape(productId)+'" data-replace-card-id="'+escape(pveSelected)+'">구매 + 교체 확정 →</button>');}
  if(action==='pve-shop-confirm-card-apply'){const productId=button.dataset.productId,replaceId=button.dataset.replaceCardId;modal.close();pveSelected=null;void performPve('pve.shopConfirmCard',{product_id:productId,replace_card_id:replaceId});}
  if(action==='pve-shop-cancel-card'&&button.dataset.productId){const productId=button.dataset.productId;pveSelected=null;void performPve('pve.shopCancelCard',{product_id:productId});}
  if(action==='pve-shop-ready')void performPve('pve.shopReady');
  if(action==='pve-reward-card')void performPve('pve.rewardSubmitCard',{card_instance_id:button.dataset.cardId,skill_intent:false});
  if(action==='pve-reward-relic')void performPve('pve.rewardChooseRelic',{relic_id:button.dataset.relicId});
  if(action==='pve-room-ready')void performPve('pve.roomReady');
  if (action === 'copy') { try { await navigator.clipboard.writeText(bundle.room.room_code); toast('방 코드를 복사했습니다.'); } catch { toast(`방 코드: ${bundle.room.room_code}`); } }
  if (action === 'leave-confirm') {
    if (animating) { toast('결과 연출이 끝난 뒤 나갈 수 있습니다.'); return; }
    showModal(`<div class="eyebrow">LEAVE PARTY</div><h2>원정대를 떠날까요?</h2><p>${bundle.run ? '진행 중인 협력 탐험에서 나가면 자리는 AI가 이어받습니다. 중도 탈주자의 Run Gold는 영구 계정에 지급되지 않습니다.' : bundle.session?.status === 'active' ? '진행 중인 자리는 균형형 AI가 이어받습니다. 나간 원정에는 다시 참가할 수 없습니다.' : '호스트라면 다음 인간 플레이어에게 호스트가 이전됩니다.'}</p><button class="button primary full" data-action="leave" data-network>방 나가기 →</button>`);
  }
  if (action === 'leave') { modal.close(); void perform('leave_room'); }
  if(action==='reward-details'){const offer=bundle.session.state.roomChoices?.[mine()?.id];showModal('<h2>'+escape(offer?.name||'제단의 선택')+'</h2><p>'+escape(offer?.description||'즉시 4G 또는 다음 전투 종료 시 HP가 남아 있고 기절하지 않았다면 7G. 도전 효과는 해당 전투 종료 후 사라집니다.')+'</p>');}
  if(action==='echo-details')showModal(echoDetails(bundle,button));
  if(action==='echo-info')showModal('<h2>확인한 조건</h2><p>'+escape(bundle.session.state.roomInfo)+'</p>');
  if(action==='room-ready'||action==='room-choice')void perform(action==='room-ready'?'room_ready':'room_choice',{session_id:bundle.session.id,stage_index:bundle.session.state.roomSummary.stageIndex,choice:button.dataset.choice});
  if(action==='confirm-card')void perform('confirm_card',{session_id:bundle.session.id,turn_index:bundle.session.turn_index});
  if (action === 'select-card' && !animating && !pveAnimating) { if(view==='pve'){pveSelected=button.dataset.cardId;const p=pvePlayerForUser(bundle?.run,api.user?.id);if(p?.characterId==='mage'&&(p.augments||[]).includes('aug-111')&&pveUseSkill&&!pveMageIntentChoices(p,pveSelected).includes(Number(pveUseSkill)))pveUseSkill=0;renderPve();}else if(!bundle?.session?.state.roomSummary){selected=toggleCardSelection(selected,button.dataset.cardId,isShuffleTurn(bundle.session));renderGame();} }
  if(action==='submit'&&view==='pve'&&pveSelected!==null&&!pveAnimating){const cardId=pveSelected,skill=Boolean(pveUseSkill);void (async()=>{const response=bundle.run.phase==='REWARD_ROOM'?await performPve('pve.rewardSubmitCard',{card_instance_id:cardId,skill_intent:skill,skill_data:pveSkillData(bundle.run)}):await performPve('pve.submitCard',{card_instance_id:cardId,skill_intent:skill,skill_data:pveSkillData(bundle.run)});if(response){pveSelected=null;pveUseSkill=false;renderPve();}})();}
  else if (action === 'submit' && selected !== null && !animating) {
    const me = mine(), g = bundle.session;
    const twoCards=isShuffleTurn(g),info=selectionInfo(g.state.players[me.id],selected,twoCards);
    if(info.ready)void perform(g.state.selectionHolds?.[me.id]&&g.state.lockedMembers.includes(me.id)?'reselect_card':'submit_card',{session_id:g.id,turn_index:g.turn_index,member_id:me.id,...(twoCards?{card_ids:info.cards.map(c=>c.id)}:{card_id:info.cards[0].id,card_value:info.cards[0].value}),use_skill:Boolean(useSkill),amplify_level:g.state.players[me.id].skillId==='amplify'?Number(useSkill)||0:0});
  }
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'nickname-form') { event.preventDefault(); void perform('set_profile', Object.fromEntries(new FormData(event.target))); }
  if (event.target.id === 'create-form') { event.preventDefault(); void perform('create_room', Object.fromEntries(new FormData(event.target))); }
  if (event.target.id === 'code-form') {
    event.preventDefault(); const room_code = new FormData(event.target).get('room_code').trim().toUpperCase();
    // Code entry includes optional password, avoiding any password-disclosure query.
    showModal(`<div class="eyebrow">JOIN PARTY · ${escape(room_code)}</div><h2>원정에 합류합니다.</h2><p>비밀번호가 없는 방은 비워두세요.</p><form id="direct-join-form"><label>비밀번호 <span class="muted">선택 사항</span><input type="password" name="password" maxlength="72" autocomplete="current-password"></label><button class="button primary full" data-network>참가하기 →</button></form>`);
    document.querySelector('#direct-join-form').addEventListener('submit', e => { e.preventDefault(); void perform('join_room', { room_code, password: new FormData(e.target).get('password') }); });
  }
});
document.querySelector('.modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); } });
document.querySelector('#help').addEventListener('click', () => showModal('<div class="eyebrow">HOW TO SURVIVE</div><h2>눈치를 읽고, 살아남아라.</h2><ol class="guide-list"><li><b>각자 카드 한 장.</b> 4명 모두 비밀리에 선택합니다.</li><li><b>같은 숫자는 전부 무효.</b> 유효한 카드만 공격과 방 효과에 참여합니다.</li><li><b>모든 제출 카드는 소비.</b> 5장을 쓰면 자신의 기본 덱을 다시 받습니다. 도박사는 11장 순환 덱에서 매 턴 2장을 뽑습니다. 사용한 6·7만 소멸하며, 재충전된 카드는 버린 덱에 들어갑니다.</li><li><b>HP는 3.</b> 0이 되면 한 턴 자동 제출 후 HP 3으로 부활합니다.</li><li><b>누적 기절 8회는 전멸.</b> 도달 스테이지에 따라 원정 점수·골드를 정산합니다. 1~4층 0%, 5층 20%, 6층 30%, 7층 40%, 8층 50%, 9층 60%, 보스층 70%, 클리어 100%. 소수점은 버립니다.</li><li><b>10번째 방은 보스.</b> 2턴마다 일반 공격과 특수 패턴을 번갈아 사용합니다. 일반 몬스터는 3턴마다 공격합니다.</li></ol><p class="muted">일반 공격은 카드 숫자만큼 피해를 줍니다. 적이 쓰러지는 턴에도 모든 유효 카드가 끝까지 공격합니다. 공동 최고 피해자 모두 일반 몬스터 +10점, 보스 +20점을 받습니다. 처치 골드 3G는 기존처럼 그중 한 명에게 지급합니다. 기절 시 -10점과 -3G, 광전사는 추가 -3점입니다.</p>'));
document.querySelector('#nickname').addEventListener('click', () => void openAccountPage('account'));
initAccountUI({showModal,toast,canSwitch:()=>!bundle,ready:()=>connected,onNickname:()=>bundle?sync():Promise.resolve(),onAccount:data=>{
  setProfile(data.profile);
  document.querySelector('#account-summary').textContent=data.stats?data.stats.rating_points+' RP · '+data.stats.account_gold+' Account Gold':'GUEST · 계정 등록';
}});
initAudioControls();
initMotionControl();
// Block native drag/drop and context menus without blocking range-slider gestures
// or caret/selection inside nickname and password inputs.
for (const type of ['dragstart', 'dragover', 'drop', 'contextmenu']) document.addEventListener(type, event => event.preventDefault(), { capture: true });
addEventListener('online', () => { status('재연결 중'); void sync(); });
addEventListener('offline', () => status('연결 끊김 · 복구 대기'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
setInterval(() => { if (!document.hidden && connected && bundle) void sync(); }, 5000);
try {await loadInitialAssets();} catch(error) {toast(error.message);}
renderHome();
try {
  connected = await api.connect(status);
  if (connected) {
    status('온라인', true); await sync();
    document.querySelector('#nickname').disabled = false;
    try {
      await refreshAccount();
      if (!profile.nickname_set && !modal.open) nicknameModal();
    } catch (error) { toast(error.message); }
  }
  else status('서버 설정 대기');
} catch (error) { status('연결 실패'); toast(error.message); }

// Keep keyboard navigation inside the receipt while the room awaits readiness.
document.addEventListener('keydown',event=>{
 if(event.key!=='Tab'||modal.open)return;const overlay=app.querySelector('.room-result-overlay');if(!overlay)return;
 const buttons=[...overlay.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
