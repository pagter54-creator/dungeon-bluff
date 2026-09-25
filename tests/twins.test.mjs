import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_CATALOG,selectableCards,startCycle} from '../supabase/functions/game-api/characters.js';
import {createSession,resolveTurn,validateSubmission,activateSkill,openTurn} from '../supabase/functions/game-api/engine.js';
import {activateAcrobatics} from '../supabase/functions/game-api/twins.js';
import {cardPool,activeButton,revelationGauge} from '../src/character-ui.js';
import {selectionInfo} from '../src/battle-rules.js';
import {skinIllustration,SKINS,pendingSkinImage} from '../src/skins.js';
import {entryAssetPlan,loadEntryAssets} from '../src/battle-loading.js';
import {assetLoader} from '../src/asset-loader.js';
import {activeArtFrame,setKnockoutPose,showPlayerPose} from '../src/player-pose-fx.js';

function setup(ids=['twins','adventurer','adventurer','adventurer'],rng=()=>.2){
  const members=ids.map((character_id,i)=>({id:'p'+i,user_id:'u'+i,member_type:'human',character_id,seat_index:i}));
  const g=createSession('room',members,CHARACTER_CATALOG,rng);
  g.state.currentStage={contentId:'armored_boar',category:'monster',name:'boar'};
  g.state.monster={id:'armored_boar',hp:999,maxHp:999,attackIn:99};
  return {g,members,p:g.state.players.p0};
}
function submissions(g,values){return values.map((v,i)=>{const p=g.state.players['p'+i],card=p.cycleCards.find(c=>!c.used&&c.value===v);assert.ok(card,`p${i} ${v} available`);return {member_id:p.memberId,turn_index:g.turn_index,card_id:card.id,card_value:v,use_skill:false};});}
function othersFresh(g){for(const id of ['p1','p2','p3'])startCycle(g.state.players[id],g.state.players[id].character);}
const request=(g,card)=>({session_id:g.id,turn_index:g.turn_index,member_id:'p0',card_id:card.id,card_value:card.value});

test('twins start randomly, use four instances, and never reset parity at cycle boundaries',()=>{
  for(const [roll,parity] of [[.1,1],[.8,0]]){
    const {p}=setup(undefined,()=>roll);assert.equal(p.characterRuntimeState.parity,parity);
    assert.deepEqual(p.cycleCards.map(c=>c.value),[1,2,3,4]);
    startCycle(p,p.character,()=>1-roll);assert.equal(p.characterRuntimeState.parity,parity);
  }
});
test('server and both UI selection modes enforce the current parity, including shuffled single leftovers',()=>{
  const {g,p,members}=setup(),[one,two,three,four]=p.cycleCards;
  assert.throws(()=>validateSubmission(g,members[0],'u0',request(g,two),[]));
  assert.equal(validateSubmission(g,members[0],'u0',request(g,one),[]).id,one.id);
  assert.equal(selectionInfo(p,two.id).ready,false);
  assert.deepEqual(selectionInfo(p,[one.id,three.id],true).cards.map(c=>c.value),[1,3]);
  g.state.currentStage.category='boss';g.state.monster.pending={kind:'shuffle',turn:g.turn_index};
  const b={session_id:g.id,turn_index:g.turn_index,card_ids:[one.id,two.id]};
  assert.throws(()=>validateSubmission(g,members[0],'u0',b,[]));
  b.card_ids=[one.id,three.id];assert.ok([1,3].includes(validateSubmission(g,members[0],'u0',b,[]).value));
  three.used=true;b.card_ids=[one.id];assert.equal(validateSubmission(g,members[0],'u0',b,[]).value,1);
  assert.equal(selectionInfo(p,[one.id],true).count,1);
  const markup=cardPool(p,{own:true});assert.equal((markup.match(/parity-locked/g)||[]).length,2);
  assert.match(markup,/twins-hand/);assert.match(revelationGauge(p),/홀 · 소년/);assert.match(activeButton(p,0,false),/activate-acrobatics/);
});
test('acrobatics immediately replaces cards, flips once under retry, and recharges only after four consumptions',()=>{
  const {g,p,members}=setup();p.cycleCards[0].used=true;
  const oldId=p.cycleCards[1].id,body={session_id:g.id,turn_index:g.turn_index};
  assert.throws(()=>activateSkill(g,members[0],'someone',body,[]));
  assert.equal(activateSkill(g,members[0],'u0',body,[]),true);
  assert.equal(p.characterRuntimeState.parity,0);assert.equal(p.activeSkillState.available,false);
  assert.equal(p.cycleIndex,2);assert.ok(p.cycleCards.every(c=>!c.used));assert.ok(!p.cycleCards.some(c=>c.id===oldId));
  assert.equal(activateSkill(g,members[0],'u0',body,[]),false);assert.equal(p.cycleIndex,2);
  for(const [i,value] of [2,1,4,3].entries()){
    othersFresh(g);resolveTurn(g,submissions(g,[value,5,5,5]));
    assert.equal(p.characterRuntimeState.parity,i%2===0?1:0);
    assert.equal(p.activeSkillState.available,i===3);
    if(i<3)assert.throws(()=>activateAcrobatics(g,p),/완주/);
  }
  assert.equal(p.cycleIndex,3);assert.equal(activateAcrobatics(g,p),true);assert.equal(p.characterRuntimeState.parity,1);
});
test('acrobatics cannot be smuggled through card submission or activated after committing',()=>{
  const {g,p,members}=setup(),card=selectableCards(p)[0],body=request(g,card);
  assert.throws(()=>validateSubmission(g,members[0],'u0',{...body,use_skill:true},[]),/먼저/);
  assert.throws(()=>activateSkill(g,members[0],'u0',body,submissions(g,[1,2,3,4])),/제출 전에/);
});
test('ordinary cycle completion, events and monster transitions all preserve one flip per turn',()=>{
  const {g,p}=setup();
  for(const [i,value] of [1,2,3,4].entries()){
    othersFresh(g);g.state.monster=null;g.state.currentStage={contentId:'truce_offer',category:'event'};
    resolveTurn(g,submissions(g,[value,5,5,5]));assert.equal(p.characterRuntimeState.parity,i%2===0?0:1);
  }
  assert.equal(p.cycleIndex,2);assert.deepEqual(selectableCards(p).map(c=>c.value),[1,3]);
});
test('joint attack adds damage after vampire exchanges including amplified final values, without changing card value',()=>{
  const {g,p}=setup(['twins','vampire','mage','adventurer']);
  const vampire=g.state.players.p1,mage=g.state.players.p2;
  // Two vampires exercise sequential final-number exchanges after amplification.
  const v2=structuredClone(vampire);v2.memberId='p3';v2.characterRuntimeState.thrallId='p0';g.state.players.p3=v2;
  startCycle(v2,v2.character);vampire.characterRuntimeState.thrallId='p2';
  mage.characterRuntimeState.mana=4;
  // First vampire takes mage's 6; second takes twins' 1; twins receive 5.
  const subs=submissions(g,[1,2,4,5]);subs[1].use_skill=true;subs[2].use_skill=true;subs[2].amplify_level=2;subs[2].card_value=6;subs[3].use_skill=true;
  const result=resolveTurn(g,subs),card=result.cards.find(c=>c.memberId==='p0');
  assert.equal(card.value,5);assert.equal(card.effectValue,5);assert.equal(card.damageValue,7);
  assert.equal(result.effects.find(e=>e.type==='attack'&&e.memberId==='p0').amount,7);
  assert.equal(p.cycleCards.find(c=>c.value===1).used,true);assert.equal(p.cycleCards.find(c=>c.value===3).used,false);
});
test('a vampire exchange can create a collision: twins lose the attack but consume the original card',()=>{
  const {g}=setup(['vampire','adventurer','twins','mage']);
  g.state.players.p0.characterRuntimeState.thrallId='p2';
  const sub=submissions(g,[3,2,1,3]);sub[0].use_skill=true;
  const result=resolveTurn(g,sub),c=result.cards.find(c=>c.memberId==='p2');
  assert.equal(c.value,3);assert.equal(c.valid,false);
  assert.equal(result.effects.some(e=>e.type==='attack'&&e.memberId==='p2'),false);
  assert.equal(g.state.players.p2.cycleCards.find(c=>c.value===1).used,true);
});
test('duplicate, event, sealed, devoured and armored cards do not bypass existing rules',()=>{
  for(const kind of ['clash','event','seal','devour','armor']){
    const {g}=setup();
    if(kind==='event'){g.state.monster=null;g.state.currentStage={contentId:'truce_offer',category:'event'};}
    else if(kind!=='clash'){
      g.state.currentStage.category='boss';
      if(kind==='armor')g.state.monster.armorTurn=1;
      else g.state.monster.pending={kind,number:1,turn:1};
    }
    const result=resolveTurn(g,submissions(g,kind==='clash'?[1,1,3,4]:[1,2,3,4]));
    const card=result.cards[0];assert.equal(card.value,1);
    if(kind==='event')assert.equal(card.effectValue,1);
    else assert.equal(result.effects.some(e=>e.type==='attack'&&e.memberId==='p0'&&e.amount>0),false);
  }
});
test('knockout and all AI personalities submit only matching parity; no knockout damage, normal alternation',()=>{
  for(const ai of ['balanced','greedy','cautious','blocker','chaotic'])for(const knockedOut of [true,false]){
    const {g,p,members}=setup();p.knockedOut=knockedOut;if(knockedOut)p.hp=0;
    members[0].member_type='ai';members[0].ai_type=ai;
    const auto=openTurn(g,members,()=>.4);assert.equal(auto.length,1);assert.equal(auto[0].card_value%2,1);
    const peers=submissions(g,[auto[0].card_value,2,4,5]);peers[0]=auto[0];const result=resolveTurn(g,peers);
    assert.equal(p.characterRuntimeState.parity,0);
    if(knockedOut){assert.equal(result.cards[0].damageValue,0);assert.equal(result.effects.some(e=>e.type==='attack'&&e.memberId==='p0'),false);assert.equal(p.hp,3);}
  }
});
test('both partners have independent pose filenames and only current parity stands in front',()=>{
  for(const parity of [0,1]){
    const markup=skinIllustration('twins',null,false,{parity});
    assert.match(markup,new RegExp(`twin-${parity?'B':'G'} twin-active`));
    assert.match(markup,new RegExp(`twin-${parity?'G':'B'} twin-resting`));
    for(const suffix of ['B','G','B_A','B_D','G_A','G_D'])assert.ok(markup.includes(`twins0_${suffix}.png`));
  }
  const plan=entryAssetPlan({state:{players:{p:{characterId:'twins'}},stageOrder:[]}});
  assert.equal(plan.required.length,3);assert.equal(plan.poses.length,6);
  for(const url of [...plan.required,...plan.poses])assert.ok(pendingSkinImage(url));
  assert.ok(SKINS.twins0.isDefault);
});
test('missing future twins artwork does not block entry, but a real network failure does',async()=>{
  const oldLoad=assetLoader.load,oldFetch=globalThis.fetch;
  const g={state:{players:{p:{characterId:'twins'}},stageOrder:[]}};
  try{assetLoader.load=async()=>{throw Error('missing');};globalThis.fetch=async()=>({status:404});await loadEntryAssets(g);
    globalThis.fetch=async()=>({status:503});await assert.rejects(loadEntryAssets(g),/불러오지/);
  }finally{assetLoader.load=oldLoad;globalThis.fetch=oldFetch;}
});
test('even-state damage and revival replace the girl image only and keep the boy untouched',async()=>{
  const image={src:SKINS.twins0.partners[1].preview,style:{},animate:()=>({finished:Promise.resolve()})};
  const frame={dataset:{standingSrc:image.src,damageSrc:SKINS.twins0.partners[1].damage},isConnected:true,querySelector:()=>image};
  const boy={};const panel={querySelector:selector=>selector.includes('twin-active')?frame:boy};
  const oldLoad=assetLoader.load;
  try{assetLoader.load=async()=>{};assert.equal(activeArtFrame(panel),frame);
    const restore=await showPlayerPose(panel,'damage');assert.match(image.src,/twins0_G_D/);
    await setKnockoutPose(panel,true);await restore();assert.match(image.src,/twins0_G_D/);
    await setKnockoutPose(panel,false);assert.match(image.src,/twins0_G\.png$/);assert.deepEqual(boy,{});
  }finally{assetLoader.load=oldLoad;}
});
