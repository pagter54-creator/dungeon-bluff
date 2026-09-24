import { SKINS,DEFAULT_SKINS,skinFor } from './skins.js';
import { createSkinDrawClient } from './skin-draw.js';
import { revealSkin } from './skin-reveal.js';
import * as api from './api.js';
import { html } from './character-ui.js';
import { COSMETIC_ASSETS,preloadCosmetics } from './cosmetics.js';
let account=null,options,working=false,activePage='account',category='card_front';
let skinFilter='all';
const characterOrder=[...new Set(Object.values(SKINS).map(s=>s.character))];
const cardTypes=[['card_front','카드 앞면'],['card_back','카드 뒷면']];
export function sortCatalogItems(items){
 const typeRank={card_front:0,card_back:1,character_skin:2};
 return [...items].sort((a,b)=>(typeRank[a.item_type]??3)-(typeRank[b.item_type]??3)
  ||characterOrder.indexOf(a.target_character_id)-characterOrder.indexOf(b.target_character_id)
  ||(Number(a.id.match(/\d+$/)?.[0])||0)-(Number(b.id.match(/\d+$/)?.[0])||0)
  ||a.id.localeCompare(b.id));
}
function skinGroups(items,render,filter='all'){
 return characterOrder.map(character=>{
  const group=sortCatalogItems(items.filter(item=>item.target_character_id===character));
  if(!group.length)return '';
  const label=Object.values(SKINS).find(s=>s.character===character)?.label||character;
  return `<section class="catalog-group" data-character-group="${character}" ${filter!=='all'&&filter!==character?'hidden':''}><h3 class="catalog-heading">${html(label)} <small>${group.length}종</small></h3><div class="shop-grid skin-gallery">${group.map(render).join('')}</div></section>`;
 }).join('');
}
const skinDraw=createSkinDrawClient({request:api.accountRequest,storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)}});
export const getAccount=()=>account;
const registered=()=>account?.profile.account_type==='registered';
const button=(label,action,extra='')=>`<button class="button secondary" data-meta="${action}" ${extra}>${label}</button>`;
function preview(id){const item=COSMETIC_ASSETS[id];return item?.preview?`<img class="cosmetic-preview ${item.type==='character_skin'?'skin-full-preview':''}" src="${item.preview}" alt="${html(item.name||'카드 치장 미리보기')}" loading="lazy" draggable="false">`:`<div class="cosmetic-preview default-preview">${id.includes('back')?'◇':'5'}</div>`;}
export async function refreshAccount(){
 account=await api.accountRequest('get_account');options?.onAccount(account);void preloadCosmetics(account.inventory.filter(id=>!SKINS[id]));
 return account;
}
function guestGate(){return `<p>이메일 계정을 등록하면 상점과 인벤토리, 영구 RP·Account Gold를 이용할 수 있습니다.</p>${button('계정 등록','register')}`;}
function identity(){
 if(!account)return '<p>계정 정보를 불러오는 중입니다.</p>';
 const p=account.profile,s=account.stats;
 return `<div class="account-identity"><span class="eyebrow">${registered()?'REGISTERED ADVENTURER':'GUEST ADVENTURER'}</span><h2>${html(p.display_name)}</h2>${s?`<div class="account-balances"><b>${s.rating_points}<small>RP</small></b><b>${s.account_gold}<small>ACCOUNT GOLD</small></b><b>${s.games_completed}<small>COMPLETED</small></b></div>`:'<p>게스트 플레이의 RP와 골드는 영구 저장되지 않습니다.</p>'}</div>`;
}
function nicknameForm(){return `<form data-meta-form="nickname"><label>닉네임<input name="nickname" required minlength="2" maxlength="16" value="${html(account?.profile.nickname)}"></label><p>${registered()?account.profile.free_nickname_change_available?'무료 변경 1회 사용 가능':'변경 비용: 50 Account Gold':'게스트 이름 뒤에 랜덤 4자리 코드가 붙습니다.'}</p><button class="button primary">닉네임 변경</button></form>`;}
function registrationForm(){return `<div class="eyebrow">KEEP YOUR ADVENTURE</div><h2>계정 등록</h2><p>가입 즉시 1000 RP · 0 Account Gold · 무료 닉네임 변경 1회를 사용할 수 있습니다.</p><form data-meta-form="register"><label>이메일<input name="email" type="email" required autocomplete="email"></label><label>비밀번호<input name="password" type="password" required minlength="8" autocomplete="new-password"></label><label>비밀번호 확인<input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label><label>닉네임<input name="nickname" required minlength="2" maxlength="16" value="${html(account?.profile.registration_nickname||account?.profile.nickname||'')}"></label><button class="button primary full">가입 완료</button></form>`;}
function accountPage(){
 let contents=identity();
 if(!registered()){
  contents+=`<div class="meta-actions">${button('계정 등록','register')}${button('로그인','login')}${button('게스트 이름 변경','nickname')}</div>`;
 }else contents+=`<div class="meta-actions">${button('닉네임 변경','nickname')}${button('로그아웃','logout')}</div>`;
 return contents;
}
export async function openAccountPage(page='account'){
 activePage=page;options.showModal('<div class="eyebrow">DUNGEON BLUFF</div><h2>불러오는 중…</h2>');
 try{
  await refreshAccount();let markup='';
  if(page==='account')markup=accountPage();
  if(page==='ranking'){
   const board=await api.accountRequest('get_leaderboard');
   const row=r=>`<li class="${r.is_me?'is-me':''}"><span>#${r.rank}</span><b>${html(r.nickname)}</b><strong>${r.rating_points} RP</strong></li>`;
   markup=`<div class="eyebrow">HALL OF ADVENTURERS</div><h2>랭킹</h2><p>이메일 계정 · RP 기준 공동 순위</p><ol class="leaderboard">${board.entries.map(row).join('')||'<li>첫 번째 원정의 주인공을 기다립니다.</li>'}</ol>${board.me&&!board.entries.some(r=>r.is_me)?`<h3>내 순위</h3><ol class="leaderboard">${row(board.me)}</ol>`:''}`;
  }
  if(page==='shop'){
   const {items}=await api.accountRequest('get_shop');
   markup=`${identity()}<h2>상점</h2>${!registered()?guestGate():''}<article class="gacha-banner"><div><span class="eyebrow">A NEW FACE OF FATE</span><h2>운명의 옷장</h2><p>중복 없는 캐릭터 스킨 · 1회 10 Account Gold</p>${button('스킨 뽑기 →','gacha')}</div>${preview('mage1')}${preview('thief2')}</article>${cardTypes.map(([type,label])=>{const group=sortCatalogItems(items.filter(i=>i.item_type===type));return group.length?`<section class="catalog-group"><h3 class="catalog-heading">${label} <small>${group.length}종</small></h3><div class="shop-grid">${group.map(i=>`<article class="shop-item">${preview(i.asset_key)}<small>${type==='card_front'?'CARD FRONT':'CARD BACK'}</small><h3>${html(i.display_name)}</h3><p>${i.price} Account Gold</p>${button(account.inventory.includes(i.id)?'보유 중':'구매','purchase',`data-item="${html(i.id)}" ${!registered()||account.inventory.includes(i.id)?'disabled':''}`)}</article>`).join('')}</div></section>`:''}).join('')}`;
  }
  if(page==='gacha'){
   const {items}=await api.accountRequest('get_shop');const pool=items.filter(i=>i.item_type==='character_skin'&&i.gacha_enabled&&!i.is_default);
   const remaining=pool.filter(i=>!account.inventory.includes(i.id)).length,pending=skinDraw.hasPending(api.user.id);
   markup=`${identity()}<div class="gacha-intro"><span class="eyebrow">WARDROBE OF FATE</span><h2>아직 만나지 못한 당신.</h2><p>빛 속에서 새로운 스킨을 만나세요.<br>보유하지 않은 스킨 중 하나가 같은 확률로 등장합니다.</p><strong>${pool.length-remaining} / ${pool.length} 수집</strong><p>기본 스킨 ${Object.keys(DEFAULT_SKINS).length}종은 무료 · 중복 없음 · 모두 수집하면 구매 종료</p>${registered()?button(pending?'이전 뽑기 결과 확인 / 재시도':remaining?'스킨 뽑기 · 10 Account Gold':'모든 스킨 수집 완료','draw',`${!pending&&(!remaining||account.stats.account_gold<10)?'disabled':''}`):guestGate()}${registered()&&remaining&&account.stats.account_gold<10&&!pending?'<p>Account Gold가 부족합니다. 원정을 성공해 골드를 모아 보세요.</p>':''}${pending?'<p>응답을 받지 못한 요청을 다시 확인합니다. 이미 지급됐다면 추가 차감 없이 결과를 표시합니다.</p>':''}</div>${skinGroups(pool,i=>`<article class="shop-item ${account.inventory.includes(i.id)?'skin-owned':''}">${preview(i.asset_key)}<small>${html(SKINS[i.id]?.label)}</small><h3>${html(i.display_name)}</h3><p>${account.inventory.includes(i.id)?'✓ 보유 중 · 뽑기 제외':'등장 확률 '+(100/remaining).toFixed(2)+'%'}</p></article>`)}`;
  }
  if(page==='inventory'){
   const {items}=await api.accountRequest('get_shop');const owned=items.filter(i=>i.item_type===category&&(i.is_default||account.inventory.includes(i.id)));
   if(category!=='character_skin')owned.unshift({id:`default_${category}`,asset_key:`default_${category}`,display_name:'기본 카드',item_type:category});
   const equipped=i=>i.item_type==='character_skin'?skinFor(i.target_character_id,account.loadout).id===i.id:account.loadout[`equipped_${category}`]===i.id;
   const itemCard=i=>`<article class="shop-item">${preview(i.asset_key)}${i.item_type==='character_skin'?`<small>${html(SKINS[i.id]?.label)} · ${i.is_default?'기본 지급':'보유 스킨'}</small>`:''}<h3>${html(i.display_name)}</h3>${button(equipped(i)?'장착 중':'장착','equip',`data-item="${html(i.id)}" ${equipped(i)?'disabled':''}`)}</article>`;
   const skinList=category==='character_skin';
   const filters=`<div class="skin-filter" role="group" aria-label="스킨 직업 필터">${[['all','전체'],...characterOrder.map(character=>[character,Object.values(SKINS).find(s=>s.character===character)?.label||character])].map(([id,label])=>button(label,'skin-filter',`data-character="${id}" aria-pressed="${id===skinFilter}"`)).join('')}</div>`;
   markup=`${identity()}<h2>인벤토리</h2>${registered()?`<div class="inventory-tabs">${[['card_front','카드 앞면'],['card_back','카드 뒷면'],['character_skin','캐릭터 스킨']].map(([id,label])=>button(label,'category',`data-category="${id}" aria-pressed="${id===category}"`)).join('')}</div>${skinList?`<p>캐릭터마다 한 벌씩 장착합니다. 다음 원정부터 얼굴 이미지로 표시됩니다.</p><div class="skin-inventory">${filters}${skinGroups(owned,itemCard,skinFilter)}</div>`:`<div class="shop-grid">${sortCatalogItems(owned).map(itemCard).join('')||'<p>보유한 치장이 없습니다.</p>'}</div>`}`:guestGate()}`;
  }
  if(activePage===page)options.showModal(markup);
 }catch(e){options.showModal(`<h2>계정 연결 확인</h2><p>${html(e.message)}</p>`);}
}
export function initAccountUI(config){
 options=config;
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-meta]');if(!b||b.disabled||working)return;
  const action=b.dataset.meta;
  if(['account','ranking','shop','inventory','gacha'].includes(action)){void openAccountPage(action);return;}
  if(action==='register'){options.showModal(registrationForm());return;}
  if(action==='nickname'){options.showModal(nicknameForm());return;}
  if(action==='skin-inventory'){category='character_skin';void openAccountPage('inventory');return;}
  if(action==='category'){category=b.dataset.category;void openAccountPage('inventory');return;}
  if(action==='skin-filter'){
   skinFilter=b.dataset.character;
   const gallery=b.closest('.skin-inventory');
   gallery?.querySelectorAll('[data-character-group]').forEach(group=>{group.hidden=skinFilter!=='all'&&group.dataset.characterGroup!==skinFilter;});
   gallery?.querySelectorAll('[data-meta="skin-filter"]').forEach(filter=>filter.setAttribute('aria-pressed',String(filter.dataset.character===skinFilter)));
   return;
  }
  if(action==='login'){
   options.showModal(`<h2>로그인</h2><form data-meta-form="login"><label>이메일<input name="email" type="email" required autocomplete="email"></label><label>비밀번호<input name="password" type="password" required autocomplete="current-password"></label><button class="button primary">로그인</button></form>`);return;
  }
  working=true;b.disabled=true;
  try{
   if(action==='draw'){
    options.showModal('<section class="gacha-intro"><div class="summon-loading" aria-hidden="true">✦</div><h2>운명의 문을 여는 중…</h2><p>결과를 확인하고 있습니다.</p></section>');
    const result=await skinDraw.draw(api.user.id);account=result.account;options.onAccount(account);
    await revealSkin(result.item.id,options.showModal);return;
   }
   if(action==='logout'){if(!options.canSwitch())throw new Error('방에서 나온 뒤 로그아웃해 주세요.');await api.logoutAccount();}
   if(action==='purchase'||action==='equip'){
    await api.accountRequest(action==='purchase'?'purchase_item':'equip_item',{item_id:b.dataset.item});
    options.toast(action==='purchase'?'구매했습니다.':'장착했습니다. 다음 원정부터 적용됩니다.');if(action==='equip'&&SKINS[b.dataset.item]){category='character_skin';await openAccountPage('inventory');}else await openAccountPage(activePage);
   }
  }catch(err){options.toast(err.message);if(action==='draw')await openAccountPage('gacha');}finally{working=false;b.disabled=false;}
 });
 document.addEventListener('submit',async e=>{
  const type=e.target.dataset.metaForm;if(!type)return;e.preventDefault();if(working)return;
  const data=Object.fromEntries(new FormData(e.target));const b=e.target.querySelector('button');working=true;b.disabled=true;
  try{
   if(type==='register'){await api.registerAccount(data);options.toast('가입이 완료되었습니다. 1000 RP로 모험을 시작하세요.');}
   if(type==='nickname'){await api.accountRequest('change_nickname',{nickname:data.nickname});options.toast('닉네임을 변경했습니다.');await options.onNickname?.();}
   if(type==='login'){if(!options.canSwitch())throw new Error('방에서 나온 뒤 로그인해 주세요.');await api.loginAccount(data.email,data.password);return;}
   await openAccountPage('account');
  }catch(err){options.toast(err.message);}finally{working=false;b.disabled=false;}
 });
 addEventListener('account-auth-changed',()=>{if(options.ready())void refreshAccount().catch(()=>{});});
}
