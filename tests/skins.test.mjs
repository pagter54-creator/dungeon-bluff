import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SKINS,DEFAULT_SKINS,SKIN_ART_LAYOUT,SKIN_POSE_LIFT,AVAILABLE_POSES,skinFor,skinPortrait,skinIllustration } from '../src/skins.js';
import { poseUrl } from '../src/player-pose-fx.js';
import { createSkinDrawClient } from '../src/skin-draw.js';
import { partyPanels } from '../src/character-ui.js';

test('all available skins map to supplied full/cropped PNG pairs, with eight free defaults',async()=>{
 assert.equal(Object.keys(SKINS).length,43);assert.equal(Object.keys(DEFAULT_SKINS).length,13);
 for(const skin of Object.values(SKINS))for(const field of ['preview','portrait']){
  if(['gunner0','fighter0','twins0'].includes(skin.id)){assert.match(skin[field],new RegExp(skin.id));continue;}
  const file=await readFile(new URL(skin[field]));assert.equal(file.subarray(1,4).toString(),'PNG',skin.id+field);
 }
 assert.equal(SKINS.travler2.name,'신참 항해사');assert.equal(SKINS.warrior2.name,'북부의 병사');
 assert.equal(skinFor('rogue').id,'thief0');assert.equal(skinFor('seer').id,'prophet0');
 assert.equal(skinFor('mage',{equipped_character_skins:{mage:'thief1'}}).id,'mage0');
 assert.equal(skinFor('rogue',{equipped_character_skins:{rogue:'thief2'}}).id,'thief2');
 assert.match(skinPortrait('warrior'),/warrior0_crop\.png/);
});

test('combat pose convention is emitted for every skin and existing berserker poses preload',async()=>{
 assert.equal(AVAILABLE_POSES.length,8);
 for(const url of AVAILABLE_POSES){const file=await readFile(new URL(url));assert.equal(file.subarray(1,4).toString(),'PNG');}
 assert.equal(poseUrl('https://game.test/skin%20image/mage3.png','A'),'https://game.test/skin%20image/mage3_A.png');
 const markup=skinIllustration('berserker',{equipped_character_skins:{berserker:'berserker3'}});
 assert.match(markup,/berserker3_A\.png/);assert.match(markup,/berserker3_D\.png/);assert.match(markup,/player-illustration-base/);
 const future=skinIllustration('mage',{equipped_character_skins:{mage:'mage3'}});
 assert.match(future,/mage3_A\.png/);assert.match(future,/mage3_D\.png/);
 for(const id of ['gunner1','gunner2','fighter1','fighter2']){const skin=SKINS[id];assert.equal(skin.isDefault,false);assert.match(skinIllustration(skin.character,{equipped_character_skins:{[skin.character]:id}}),new RegExp(id+'_A\\.png'));assert.match(skin.damage,new RegExp(id+'_D\\.png'));}
});

test('battle illustrations use frozen equipped full art for everyone, including default AI skins',()=>{
 const player=(id,characterId,loadout)=>({memberId:id,characterId,character:{id:characterId,display_name:characterId,definition:{}},loadout,hp:3,maxHp:3,cycleCards:[],score:0,gold:0});
 const players={a:player('a','mage',{equipped_character_skins:{mage:'mage2'}}),b:player('b','warrior',{})};
 const markup=partyPanels({session:{state:{lockedMembers:[]}},members:[{id:'a',seat_index:0,display_name:'Me'},{id:'b',seat_index:1,display_name:'AI',ai_type:'balanced'}]},players,{me:{id:'a'}});
 assert.match(markup,/mage2\.png/);assert.match(markup,/warrior0\.png/);assert.doesNotMatch(markup,/_crop\.png/);
 assert.equal((markup.match(/class="player-art-stage"/g)||[]).length,2);
 assert.equal((markup.match(/class="player-info"/g)||[]).length,2);
 assert.ok(markup.indexOf('player-art-stage')<markup.indexOf('player-info'));
 assert.ok(markup.indexOf('player-info')<markup.indexOf('player-heading'));
});

test('character artwork exposes per-skin scale and position without changing pose assets',()=>{
 assert.equal(SKIN_ART_LAYOUT.gambler0.scale,1.06);
 const art=skinIllustration('gambler');
 assert.match(art,/--art-scale:1\.06/);
 assert.match(art,/--art-offset-x:0px/);
 assert.match(art,/--art-position-y:100%/);
 assert.match(art,/gambler0_A\.png/);
 assert.equal(SKIN_POSE_LIFT.prophet2,36);
 const shortArt=skinIllustration('seer',{equipped_character_skins:{seer:'prophet2'}});
 assert.match(shortArt,/--base-lift:36px/);
 assert.match(shortArt,/data-attack-lift="38"/);
 assert.match(shortArt,/data-damage-lift="38"/);
});

test('lost draw responses reuse the same receipt across reloads and clear it only on success',async()=>{
 const saved=new Map(),calls=[];const storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 const id='12345678-1234-1234-1234-123456789abc';let fail=true;
 const request=async(action,args)=>{calls.push({action,...args});if(fail)throw new Error('timeout');return {item:{id:'mage1'}};};
 const first=createSkinDrawClient({request,storage,uuid:()=>id});
 await assert.rejects(first.draw('user-1'),/timeout/);assert.equal(first.hasPending('user-1'),true);
 const reloaded=createSkinDrawClient({request,storage,uuid:()=>assert.fail('must reuse stored key')});
 assert.equal(reloaded.hasPending('user-2'),false);fail=false;
 assert.equal((await reloaded.draw('user-1')).item.id,'mage1');
 assert.deepEqual(calls,[{action:'draw_skin',request_id:id},{action:'draw_skin',request_id:id}]);assert.equal(reloaded.hasPending('user-1'),false);
});

test('storage denial still preserves the request key in memory after a timeout',async()=>{
 let fail=true,ids=[];const draw=createSkinDrawClient({storage:{getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}},request:async(_,args)=>{ids.push(args.request_id);if(fail)throw Error('timeout');return {};}});
 await assert.rejects(draw.draw('u'));fail=false;await draw.draw('u');assert.equal(ids[0],ids[1]);
});

test('gacha and inventory UI show full art, block duplicate clicks and equip the awarded skin',async()=>{
 const keys=['document','addEventListener','localStorage','__skinApi','__revealSkin'];
 const originals=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const listeners={},saved=new Map(),requests=[];let markup='',releaseDraw;
 const account={profile:{account_type:'registered',display_name:'Collector'},stats:{rating_points:1000,account_gold:20,games_completed:0},inventory:[],loadout:{equipped_character_skins:{}}};
 const items=Object.values(SKINS).map(s=>({id:s.id,display_name:s.name,asset_key:s.id,target_character_id:s.character,item_type:'character_skin',is_default:s.isDefault,gacha_enabled:!s.isDefault}));
 globalThis.document={addEventListener:(event,fn)=>{listeners[event]=fn;}};
 globalThis.addEventListener=()=>{};
 globalThis.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
 globalThis.__skinApi={user:{id:'collector'},accountRequest:async(action,args)=>{
  requests.push({action,...args});
  if(action==='get_account')return account;
  if(action==='get_shop')return {items:[
   {id:'card_back_02',display_name:'뒷면 둘',asset_key:'card_back_02',item_type:'card_back',price:5},
   {id:'card_front_02',display_name:'앞면 둘',asset_key:'card_front_02',item_type:'card_front',price:5},
   {id:'card_back_01',display_name:'뒷면 하나',asset_key:'card_back_01',item_type:'card_back',price:5},
   {id:'card_front_01',display_name:'앞면 하나',asset_key:'card_front_01',item_type:'card_front',price:5},
   ...[...items].reverse()
  ]};
  if(action==='draw_skin')return new Promise(resolve=>{releaseDraw=()=>{account.stats.account_gold=10;account.inventory=['mage1'];resolve({item:{id:'mage1'},account});};});
  if(action==='equip_item'){account.loadout.equipped_character_skins.mage=args.item_id;return account;}
 }};
 globalThis.__revealSkin=async id=>{assert.equal(id,'mage1');markup='REVEALED mage1';};
 const click=(action,extra={})=>{const b={dataset:{meta:action,...extra},disabled:false};return listeners.click({target:{closest:()=>b}});};
 try{
  let source=await readFile(new URL('../src/account-ui.js',import.meta.url),'utf8');
  source=source.replace(/import \* as api from [^;]+;/,'const api=globalThis.__skinApi;');
  source=source.replace(/import \{ revealSkin \} from [^;]+;/,'const revealSkin=globalThis.__revealSkin;');
  source=source.replaceAll(/(['"])(\.\/[^'"]+)\1/g,(_,q,path)=>`${q}${new URL(`../src/${path.slice(2)}`,import.meta.url).href}${q}`);
  const ui=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  ui.initAccountUI({showModal:s=>{markup=s;},toast:()=>{},onAccount:()=>{},ready:()=>true});
  await ui.openAccountPage('shop');
  assert.ok(markup.indexOf('카드 앞면')<markup.indexOf('카드 뒷면'));
  assert.ok(markup.indexOf('앞면 하나')<markup.indexOf('앞면 둘'));
  assert.ok(markup.indexOf('뒷면 하나')<markup.indexOf('뒷면 둘'));
  await click('category',{category:'character_skin'});await ui.openAccountPage('inventory');
  assert.ok(markup.indexOf('data-character-group="gambler"')<markup.indexOf('data-character-group="mage"'));
  const groups=['gambler','berserker','imp','mage','seer','rogue','adventurer','warrior'].map(characterGroup=>({dataset:{characterGroup},hidden:false}));
  const filters=['all',...groups.map(group=>group.dataset.characterGroup)].map(character=>({dataset:{character},setAttribute(name,value){this[name]=value;}}));
  const gallery={querySelectorAll:selector=>selector==='[data-character-group]'?groups:filters};
  const filterButton={dataset:{meta:'skin-filter',character:'mage'},disabled:false,closest:selector=>selector==='.skin-inventory'?gallery:filterButton};
  const shopCalls=requests.filter(r=>r.action==='get_shop').length;
  await listeners.click({target:{closest:()=>filterButton}});
  assert.equal(groups.find(group=>group.dataset.characterGroup==='mage').hidden,false);
  assert.equal(groups.find(group=>group.dataset.characterGroup==='seer').hidden,true);
  assert.equal(filters.find(filter=>filter.dataset.character==='mage')['aria-pressed'],'true');
  assert.equal(requests.filter(r=>r.action==='get_shop').length,shopCalls);
  await ui.openAccountPage('gacha');assert.match(markup,/mage1\.png/);assert.doesNotMatch(markup,/_crop\.png/);assert.match(markup,/3\.33%/);
  assert.ok(markup.indexOf('data-character-group="gambler"')<markup.indexOf('data-character-group="mage"'));
  assert.match(markup,/data-character-group="seer"[^>]*><h3/);
  const drawing=click('draw');await click('draw');assert.equal(requests.filter(r=>r.action==='draw_skin').length,1);
  releaseDraw();await drawing;assert.equal(markup,'REVEALED mage1');
  await click('equip',{item:'mage1'});assert.match(markup,/mage0\.png/);assert.match(markup,/mage1\.png/);assert.doesNotMatch(markup,/mage2\.png/);assert.match(markup,/data-item="mage1" disabled/);
  await ui.openAccountPage('gacha');assert.match(markup,/3\.45%/);assert.match(markup,/보유 중 · 뽑기 제외/);
  account.stats.account_gold=0;await ui.openAccountPage('gacha');assert.match(markup,/data-meta="draw" disabled/);
 }finally{for(const k of keys){if(originals[k])Object.defineProperty(globalThis,k,originals[k]);else delete globalThis[k];}}
});

test('new default skins keep future filenames, pose paths and optional loading behavior',async()=>{
 const {pendingSkinImage}=await import('../src/skins.js');
 for(const id of ['gunner','fighter']){
  const skin=skinFor(id);assert.equal(skin.id,id+'0');assert.equal(skin.isDefault,true);
  for(const [field,suffix] of [['preview',''],['portrait','_crop'],['attack','_A'],['damage','_D']]){
   assert.ok(skin[field].endsWith(`${id}0${suffix}.png`));assert.ok(pendingSkinImage(skin[field]));
  }
 }
 assert.equal(pendingSkinImage(SKINS.mage0.preview),false);
});
