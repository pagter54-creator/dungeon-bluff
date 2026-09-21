import * as api from './api.js';
import { html } from './character-ui.js';
import { COSMETIC_ASSETS,preloadCosmetics } from './cosmetics.js';
let account=null,options,working=false,activePage='account',category='card_front';
export const getAccount=()=>account;
const registered=()=>account?.profile.account_type==='registered';
const button=(label,action,extra='')=>`<button class="button secondary" data-meta="${action}" ${extra}>${label}</button>`;
function preview(id){const item=COSMETIC_ASSETS[id];return item?.preview?`<img class="cosmetic-preview" src="${item.preview}" alt="카드 치장 미리보기" loading="lazy">`:`<div class="cosmetic-preview default-preview">${id.includes('back')?'◇':'5'}</div>`;}
export async function refreshAccount(){
 account=await api.accountRequest('get_account');options?.onAccount(account);void preloadCosmetics(account.inventory);
 return account;
}
function guestGate(){return `<p>이메일 계정을 등록하면 상점과 인벤토리, 영구 RP·Account Gold를 이용할 수 있습니다.</p>${button('계정 등록','register')}`;}
function identity(){
 if(!account)return '<p>계정 정보를 불러오는 중입니다.</p>';
 const p=account.profile,s=account.stats;
 return `<div class="account-identity"><span class="eyebrow">${registered()?'REGISTERED ADVENTURER':'GUEST ADVENTURER'}</span><h2>${html(p.display_name)}</h2>${s?`<div class="account-balances"><b>${s.rating_points}<small>RP</small></b><b>${s.account_gold}<small>ACCOUNT GOLD</small></b><b>${s.games_completed}<small>COMPLETED</small></b></div>`:'<p>게스트 플레이의 RP와 골드는 영구 저장되지 않습니다.</p>'}</div>`;
}
function nicknameForm(){return `<form data-meta-form="nickname"><label>닉네임<input name="nickname" required minlength="2" maxlength="16" value="${html(account?.profile.nickname)}"></label><p>${registered()?account.profile.free_nickname_change_available?'무료 변경 1회 사용 가능':'변경 비용: 50 Account Gold':'게스트 이름 뒤에 랜덤 4자리 코드가 붙습니다.'}</p><button class="button primary">닉네임 변경</button></form>`;}
function registrationForm(){return `<div class="eyebrow">KEEP YOUR ADVENTURE</div><h2>계정 등록</h2><p>이메일 인증 후 비밀번호 설정을 마치면 영구 계정이 됩니다.</p><form data-meta-form="register"><label>이메일<input name="email" type="email" required autocomplete="email"></label><label>비밀번호<input name="password" type="password" required minlength="8" autocomplete="new-password"></label><label>비밀번호 확인<input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label><label>닉네임<input name="nickname" required minlength="2" maxlength="16" value="${html(account?.profile.registration_nickname||account?.profile.nickname||'')}"></label><button class="button primary full">인증 메일 받기</button></form>`;}
function accountPage(){
 const p=account.profile;
 let contents=identity();
 if(!registered()){
  if(p.registration_nickname)contents+=p.email_verified?`<div class="account-notice">이메일 인증 완료 · 비밀번호를 설정해 가입을 마쳐 주세요.</div><form data-meta-form="finish"><label>비밀번호<input name="password" type="password" required minlength="8" autocomplete="new-password"></label><label>비밀번호 확인<input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label><button class="button primary">가입 완료</button></form><p>닉네임이 선점되었다면 계정 등록에서 다른 이름을 입력해 주세요.</p>`:'<div class="account-notice">인증 메일을 확인해 주세요. 인증 후 이 화면을 다시 열어 가입을 완료하세요.</div>';
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
   const {items}=await api.accountRequest('get_shop');void preloadCosmetics(items.map(i=>i.asset_key));
   markup=`${identity()}<h2>상점</h2>${!registered()?guestGate():''}<div class="shop-grid">${items.map(i=>`<article class="shop-item">${preview(i.asset_key)}<small>${i.item_type==='card_front'?'CARD FRONT':'CARD BACK'}</small><h3>${html(i.display_name)}</h3><p>${i.price} Account Gold</p>${button(account.inventory.includes(i.id)?'보유 중':'구매','purchase',`data-item="${html(i.id)}" ${!registered()||account.inventory.includes(i.id)?'disabled':''}`)}</article>`).join('')}<article class="shop-item coming-soon"><div class="cosmetic-preview default-preview">✦</div><small>COMING SOON</small><h3>스킨 뽑기</h3><p>10 Gold</p>${button('준비 중','gacha')}</article></div>`;
  }
  if(page==='inventory'){
   const {items}=await api.accountRequest('get_shop');const owned=items.filter(i=>i.item_type===category&&account.inventory.includes(i.id));
   if(category!=='character_skin')owned.unshift({id:`default_${category}`,asset_key:`default_${category}`,display_name:'기본 카드',item_type:category});
   markup=`${identity()}<h2>인벤토리</h2>${registered()?`<div class="inventory-tabs">${[['card_front','카드 앞면'],['card_back','카드 뒷면'],['character_skin','캐릭터 스킨']].map(([id,label])=>button(label,'category',`data-category="${id}" aria-pressed="${id===category}"`)).join('')}</div><div class="shop-grid">${owned.map(i=>`<article class="shop-item">${preview(i.asset_key)}<h3>${html(i.display_name)}</h3>${button(account.loadout[`equipped_${category}`]===i.id?'장착 중':'장착','equip',`data-item="${i.id}" ${account.loadout[`equipped_${category}`]===i.id?'disabled':''}`)}</article>`).join('')||'<p>보유한 캐릭터 스킨이 없습니다. 준비 중입니다.</p>'}</div>`:guestGate()}`;
  }
  if(activePage===page)options.showModal(markup);
 }catch(e){options.showModal(`<h2>계정 연결 확인</h2><p>${html(e.message)}</p>`);}
}
export function initAccountUI(config){
 options=config;
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-meta]');if(!b||b.disabled||working)return;
  const action=b.dataset.meta;
  if(['account','ranking','shop','inventory'].includes(action)){void openAccountPage(action);return;}
  if(action==='register'){options.showModal(registrationForm());return;}
  if(action==='nickname'){options.showModal(nicknameForm());return;}
  if(action==='gacha'){options.toast('스킨 뽑기 기능은 준비 중입니다.');return;}
  if(action==='category'){category=b.dataset.category;void openAccountPage('inventory');return;}
  if(action==='login'){
   options.showModal(`<h2>로그인</h2><form data-meta-form="login"><label>이메일<input name="email" type="email" required autocomplete="email"></label><label>비밀번호<input name="password" type="password" required autocomplete="current-password"></label><button class="button primary">로그인</button></form>`);return;
  }
  working=true;b.disabled=true;
  try{
   if(action==='logout'){if(!options.canSwitch())throw new Error('방에서 나온 뒤 로그아웃해 주세요.');await api.logoutAccount();}
   if(action==='purchase'||action==='equip'){
    await api.accountRequest(action==='purchase'?'purchase_item':'equip_item',{item_id:b.dataset.item});
    options.toast(action==='purchase'?'구매했습니다.':'장착했습니다. 다음 원정부터 적용됩니다.');await openAccountPage(activePage);
   }
  }catch(err){options.toast(err.message);}finally{working=false;b.disabled=false;}
 });
 document.addEventListener('submit',async e=>{
  const type=e.target.dataset.metaForm;if(!type)return;e.preventDefault();if(working)return;
  const data=Object.fromEntries(new FormData(e.target));const b=e.target.querySelector('button');working=true;b.disabled=true;
  try{
   if(type==='register'){await api.registerAccount(data);options.toast('인증 메일을 확인해 주세요. 비밀번호는 저장하지 않습니다.');}
   if(type==='finish'){await api.finishRegistration(data.password,data.confirm);options.toast('계정 등록 상태를 확인했습니다.');}
   if(type==='nickname'){await api.accountRequest('change_nickname',{nickname:data.nickname});options.toast('닉네임을 변경했습니다.');await options.onNickname?.();}
   if(type==='login'){if(!options.canSwitch())throw new Error('방에서 나온 뒤 로그인해 주세요.');await api.loginAccount(data.email,data.password);return;}
   await openAccountPage('account');
  }catch(err){options.toast(err.message);}finally{working=false;b.disabled=false;}
 });
 addEventListener('account-auth-changed',()=>{if(options.ready())void refreshAccount().catch(()=>{});});
}
