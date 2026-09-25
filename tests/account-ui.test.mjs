import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRegistration,validatePassword } from '../src/account-validation.js';
import { cardComponent } from '../src/card-component.js';
import { COSMETIC_ASSETS,cosmeticClass } from '../src/cosmetics.js';

test('registration rejects mismatched confirmation and malformed credentials before a request',()=>{
 assert.throws(()=>validateRegistration({email:'a@example.test',password:'12345678',confirm:'87654321',nickname:'Name'}),/일치/);
 assert.throws(()=>validateRegistration({email:'bad',password:'12345678',confirm:'12345678',nickname:'Name'}),/이메일/);
 assert.throws(()=>validatePassword('short','short'),/8자/);
 assert.equal(validateRegistration({email:' a@example.test ',password:'password8',confirm:'password8',nickname:'  모험가  '}).nickname,'모험가');
});
test('cosmetics preserve card numbers, used/locked states and never render secret submitted values',()=>{
 const card={id:'instance-1',value:7,used:true};
 const loadout={equipped_card_front:'card_front_03',equipped_card_back:'card_back_02'};
 const used=cardComponent(card,{loadout,own:true});assert.match(used,/cosmetic-front-jade/);assert.match(used,/>7<\/b>/);assert.match(used,/spent/);assert.match(used,/disabled/);
 const back=cardComponent(null,{loadout,blocked:true,revealId:'player-1'});assert.match(back,/cosmetic-back-stars/);assert.match(back,/reveal-value">\?</);assert.ok(!back.includes('7'));
 assert.equal(cosmeticClass({equipped_card_front:'bad" onclick="x'},'front'),'cosmetic-front-default');
 assert.equal(Object.keys(COSMETIC_ASSETS).length,55);
});
test('all ten cosmetic preview files exist and panel UI has no separate hand section',async()=>{
 for(const item of Object.values(COSMETIC_ASSETS))if(item.preview?.endsWith('.svg'))assert.match(await readFile(new URL(item.preview),'utf8'),/<svg/);
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');assert.ok(!source.includes('${ownHand('));assert.ok(source.includes('mobileSelection(player'));
});
test('Auth registration upgrades the same user immediately in one update; failures never report success',async()=>{
 const calls=[];let upgrade=true,registered=true,authError=null;let session={access_token:'test-token',user:{id:'same-user',is_anonymous:true}};
 const client={auth:{
  async getSession(){return {data:{session},error:null};},async getUser(){return {data:{user:session.user},error:null};},
  onAuthStateChange(){},async updateUser(fields){calls.push(fields);return {data:{user:{...session.user,email:fields.email,is_anonymous:!upgrade}},error:authError};},
  async signInWithPassword(fields){calls.push({login:fields});return {error:null};},async signOut(){calls.push({logout:true});return {error:null};}
 },realtime:{async setAuth(){}}};
 globalThis.__accountTestClient=client;
 const originalFetch=globalThis.fetch,originalLocation=globalThis.location;let reloads=0;
 globalThis.location={href:'https://example.test/dungeon/',reload(){reloads++;}};
 globalThis.fetch=async(_url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({profile:{account_type:registered?'registered':'guest',free_nickname_change_available:true},stats:registered?{rating_points:1000,account_gold:0}:null})};};
 try{
  let source=await readFile(new URL('../src/api.js',import.meta.url),'utf8');
  source=source.replace("const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');","const createClient=()=>globalThis.__accountTestClient;");
  source=source.replace(/import \{ SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY \} from '[^']+';/,"const SUPABASE_URL='https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY='test-public-key';");
  source=source.replaceAll(/(['"])(\.\/[^'"]+)\1/g,(_,q,path)=>`${q}${new URL(`../src/${path.slice(2)}`,import.meta.url).href}${q}`);
  const api=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  await api.connect(()=>{});
  await assert.rejects(api.registerAccount({email:'a@example.test',password:'password8',confirm:'wrong',nickname:'Name'}),/일치/);assert.equal(calls.length,0);
  const fields={email:'a@example.test',password:'password8',confirm:'password8',nickname:'Name'};
  const account=await api.registerAccount(fields);
  assert.deepEqual(calls.filter(c=>c.email),[{email:'a@example.test',password:'password8'}]);assert.equal(api.user.id,'same-user');
  assert.deepEqual(calls.map(c=>c.action||'updateUser'),['register_account','updateUser','get_account']);
  assert.equal(account.stats.rating_points,1000);assert.equal(account.stats.account_gold,0);assert.equal(account.profile.free_nickname_change_available,true);
  upgrade=false;await assert.rejects(api.registerAccount(fields),/계정 전환/);upgrade=true;
  registered=false;await assert.rejects(api.registerAccount(fields),/계정 등록을 마치지/);registered=true;
  authError=new Error('Auth unavailable');await assert.rejects(api.registerAccount(fields),/Auth unavailable/);authError=null;
  assert.equal(api.finishRegistration,undefined);
  await api.loginAccount('a@example.test','password8');await api.logoutAccount();assert.equal(reloads,2);
 }finally{globalThis.fetch=originalFetch;if(originalLocation===undefined)delete globalThis.location;else globalThis.location=originalLocation;delete globalThis.__accountTestClient;}
});
