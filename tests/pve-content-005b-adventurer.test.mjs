import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {applyOwnedEffects} from '../supabase/functions/game-api/pve/effects.js';
import {applyMonsterDamage} from '../supabase/functions/game-api/pve/monster.js';
import {onValidAttack} from '../supabase/functions/game-api/pve/characters.js';
import {scopedAdventurerState,adventurerShopPrice,assertAdventurerHandler,ADVENTURER_HANDLER_IDS} from '../supabase/functions/game-api/pve/adventurer-runtime.js';
import {ADVENTURER_CONTRACTS} from '../supabase/functions/game-api/pve/adventurer-contracts.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
import {AUGMENT_BY_ID,augmentCandidates} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {beginAugmentChoices,chooseAugment} from '../supabase/functions/game-api/pve/augments.js';
import {cleanupAugmentScope,grantRelicOpportunity,chooseRelicOpportunity} from '../supabase/functions/game-api/pve/augment-framework.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {augmentUi} from '../src/pve-ui-catalog.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
const aid=n=>'aug-'+String(n).padStart(3,'0');
function fixture(n){
 const players=Array.from({length:4},(_,i)=>newPlayerRunState({id:'p'+i,user_id:'u'+i,seat_index:i,member_type:'human',character_id:'adventurer'}));
 const p=players[0];p.augments=[...new Set([...(n>=12&&n<=20?[aid(11)]:[]),...(n>=22?[aid(21)]:[]),aid(n)])];
 const run={id:'ad-test',version:0,seed:'ad-seed',rngCounter:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'node',flame:4,maxFlame:5,players,relicCatalog:Array.from({length:8},(_,i)=>({id:'relic'+i,name:'Relic '+i,pool:'GENERAL',effects:[]}))};
 run.combat=newCombatState(players,999);run.combat.id='ad-combat';
 return {run,p};
}
function fire(run,p,trigger,ctx={}){return applyOwnedEffects(run,trigger,{player:p,...ctx});}
function attack(run,p,n,valid=true){
 const r={playerId:p.playerId,cardInstanceId:'card-'+run.combat.turn,finalNumber:n,baseNumber:6,valid,invalidReason:valid?null:'COLLISION'};
 const cards=[r,...[1,2,3].map((i)=>({playerId:'p'+i,finalNumber:((n+i-1)%5)+1,valid:true}))];
 fire(run,p,'POST_COLLISION',{resolved:r,cards});
 fire(run,p,'CARD_VALIDATED',{resolved:r,cards});
 const damage={amount:5};fire(run,p,'BEFORE_DAMAGE',{resolved:r,damage});
 run.combat.turn+=1;return {r,damage};
}
function equipStart(run,p){attack(run,p,1,false);}
function discover(run,p){const r={playerId:p.playerId,cardInstanceId:'discovery',finalNumber:1,valid:true};const cards=[1,2,3,4].map((finalNumber,i)=>({playerId:'p'+i,cardInstanceId:'d'+i,finalNumber,valid:true}));fire(run,p,'CARD_VALIDATED',{resolved:r,cards});}
function discoveries(run,p,count){for(let i=0;i<count;i++){run.combat.id='discovery-'+i;run.combat.turn=1;discover(run,p);cleanupAugmentScope(run,'COMBAT');}run.combat.id='boss';run.combat.roomType='BOSS';}
const positive={
1:({run,p})=>{attack(run,p,1);assert.equal(attack(run,p,2).damage.amount,6);},
2:({run,p})=>{fire(run,p,'ON_ACQUIRE');assert.equal(p.maxHp,4);},
3:({run,p})=>{attack(run,p,1);attack(run,p,2);assert.equal(attack(run,p,3).damage.amount,6);},
4:({run,p})=>{attack(run,p,1,false);attack(run,p,2);assert.equal(p.growthExp,1);},
5:({run,p})=>{applyMonsterDamage(run,p,2,'DIRECT');assert.equal(p.hp,2);assert.equal(attack(run,p,1).damage.amount,6);},
6:({run,p})=>{attack(run,p,1);attack(run,p,2);assert.equal(attack(run,p,3).damage.amount,8);},
7:({run,p})=>{attack(run,p,1);attack(run,p,2);attack(run,p,3);assert.equal(p.growthExp,1);},
8:({run,p})=>{fire(run,p,'ON_ACQUIRE');assert.equal(p.maxHp,4);},
9:({run,p})=>{attack(run,p,1);attack(run,p,2);attack(run,p,3);assert.equal(attack(run,p,4).damage.amount,8);},
10:({run,p})=>{attack(run,p,1);run.combat.monster.hp=0;fire(run,p,'COMBAT_END');assert.equal(p.growthExp,3);},
11:({run,p})=>{equipStart(run,p);assert.equal(attack(run,p,5).damage.amount,6);},
12:({run,p})=>{equipStart(run,p);run.players[1].hp=1;attack(run,p,2);const st=run.augmentFramework.statuses.find(x=>x.sourceId===aid(12));assert.equal(st.targetId,'p1');},
13:({run,p})=>{equipStart(run,p);attack(run,p,3);assert.equal(p.growthExp,2);},
14:({run,p})=>{equipStart(run,p);attack(run,p,4);assert.equal(attack(run,p,5).damage.amount,6);},
15:({run,p})=>{equipStart(run,p);assert.equal(attack(run,p,5).damage.amount,8);},
16:({run,p})=>{equipStart(run,p);attack(run,p,2);attack(run,p,3);assert.equal(attack(run,p,5).damage.amount,8);},
17:({run,p})=>{equipStart(run,p);attack(run,p,2);attack(run,p,3);assert.equal(attack(run,p,5).damage.amount,8);assert.equal(scopedAdventurerState(run,p,'equipment').retrofit,0);},
18:({run,p})=>{equipStart(run,p);attack(run,p,2);attack(run,p,3);attack(run,p,5);assert.equal(attack(run,p,4).damage.amount,6);},
19:({run,p})=>{equipStart(run,p);assert.equal(attack(run,p,5).damage.amount,9);assert.equal(attack(run,p,4).damage.amount,5);},
20:({run,p})=>{equipStart(run,p);run.combat.turnSubmissions.p0={skillData:{equipmentCategory:'WEAPON'}};assert.equal(attack(run,p,2).damage.amount,6);},
21:({run,p})=>{discover(run,p);assert.deepEqual(run.players.map(x=>x.growthExp),[1,1,1,1]);},
22:({run,p})=>{discover(run,p);assert.deepEqual(run.players.map(x=>x.growthExp),[2,2,2,2]);},
23:({run,p})=>{discover(run,p);fire(run,p,'MONSTER_KILLED');assert.deepEqual(run.players.map(x=>x.runGold),[2,2,2,2]);},
24:({run,p})=>{discover(run,p);run.combat.turn++;assert.equal(attack(run,run.players[1],5).damage.amount,6);},
25:({run,p})=>{run.combat.roomType='ELITE_COMBAT';discover(run,p);assert.deepEqual(run.players.map(x=>x.growthExp),[3,3,3,3]);},
26:({run,p})=>{discoveries(run,p,2);run.phase='SHOP';assert.equal(adventurerShopPrice(run,p,4,{consume:true}),3);assert.equal(adventurerShopPrice(run,p,4),4);},
27:({run,p})=>{run.phase='REWARD_ROOM';let added=0;fire(run,p,'REWARD_RANKED',{rank:1,resolved:{valid:true},addCandidate:()=>++added});assert.equal(added,1);},
28:({run,p})=>{discoveries(run,p,3);assert.deepEqual(run.players.map(x=>x.growthExp),[14,14,14,14]);},
29:({run,p})=>{discoveries(run,p,2);fire(run,p,'BOSS_CLEAR');assert.deepEqual(run.players.map(x=>x.runGold),[2,2,2,2]);},
30:({run,p})=>{discoveries(run,p,3);fire(run,p,'BOSS_CLEAR');const [key,op]=Object.entries(run.augmentFramework.relicOpportunities)[0];assert.equal(op.status,'PENDING');assert.equal(chooseRelicOpportunity(run,op.playerId,key,op.candidateIds[0]).applied,true);assert.equal(run.players.flatMap(x=>x.relics).length,1);}
};
for(let n=1;n<=30;n++)test('005B-A positive '+aid(n),()=>{const f=fixture(n);positive[n](f);assert.ok(f.run.augmentFramework.telemetry.some(x=>x.augmentId===aid(n)&&x.triggerCount===1&&x.successCount===1),aid(n)+' telemetry');});
for(const n of [1,3,6,9])test('005B-A negative '+aid(n)+' invalid breaks streak',()=>{
 const {run,p}=fixture(n);attack(run,p,1,false);assert.equal(attack(run,p,2).damage.amount,n===6?6:5);
});
for(const phase of ['EVENT','REWARD_ROOM','SHOP','REST'])test('005B-A room matrix '+phase+' excludes combat damage and EXP',()=>{
 for(let n=1;n<=30;n++){
 const {run,p}=fixture(n);run.phase=phase;
 const r={valid:true,finalNumber:5,cardInstanceId:'private'};const damage={amount:5};
 fire(run,p,'CARD_VALIDATED',{resolved:r,cards:[1,2,3,4].map(finalNumber=>({valid:true,finalNumber}))});fire(run,p,'BEFORE_DAMAGE',{resolved:r,damage});
 assert.equal(damage.amount,5,aid(n));assert.equal(p.growthExp,0,aid(n));
 }
});
test('005B-A registry and contract metadata audit; all 30 candidates and all 3 archetypes',()=>{
 const expected=Array.from({length:30},(_,i)=>aid(i+1));
 assert.deepEqual(ADVENTURER_HANDLER_IDS,expected);
 assert.deepEqual(Object.keys(EXECUTABLE_AUGMENT_RUNTIME).filter(x=>Number(x.slice(4))<=30).sort(),expected);
 assert.equal(Object.keys(EXECUTABLE_AUGMENT_RUNTIME).filter(x=>Number(x.slice(4))<=150).length,39);
 const doc=JSON.parse(readFileSync(new URL('../docs/PVE_CONTENT_005B_A_RUNTIME.json',import.meta.url)));
 for(const c of doc.entries){
 assert.deepEqual(ADVENTURER_CONTRACTS[c.augmentId],c);
 for(const key of ['name','archetype','stage','trigger','condition','effect','value','cap','onceScope','resetScope','persistenceScope','roomApplicability','visibility','runtimeHandler','candidatePool','tooltip','telemetry'])assert.ok(c[key]!=null,c.augmentId+':'+key);
 assert.equal(augmentUi(c.augmentId,c.stage).description,c.tooltip);
 assert.ok(!c.tooltip.includes('조건 달성 시'));assertAdventurerHandler(c.augmentId);
 assert.equal(AUGMENT_BY_ID[c.augmentId].executable,true);
 assert.ok(augmentCandidates('adventurer',c.stage,c.archetype).some(x=>x.id===c.augmentId));
 }
 assert.throws(()=>assertAdventurerHandler('aug-031'),/MISSING/);
 for(const archetype of new Set(doc.entries.map(x=>x.archetype)))assert.equal(doc.entries.filter(x=>x.archetype===archetype).length,10);
});
for(const stage1 of [1,11,21])test('005B-A stage progression '+aid(stage1)+' through stage 4',()=>{
 const {run,p}=fixture(stage1);p.augments=[];p.growthExp=50;
 for(const [tier,threshold] of [[1,50],[2,150],[3,350],[4,750]]){
 p.growthExp=threshold;run.phase='ROOM_RESULT';assert.equal(beginAugmentChoices(run),true);
 const offer=run.augmentChoice.offersByPlayer.p0;assert.equal(offer.length,3);assert.equal(new Set(offer).size,3);
 assert.ok(offer.every(id=>AUGMENT_BY_ID[id].tier===tier));
 const chosen=tier===1?aid(stage1):offer[0];chooseAugment(run,p.playerId,chosen);
 }
 assert.equal(p.augments.length,4);assert.equal(p.persistentCharacterState.augmentTiers.length,4);
});
for(const n of [3,17,22,30,13])test('005B-A reconnect '+aid(n)+' preserves behavior and private state',()=>{
 const a=fixture(n);if(n===3){attack(a.run,a.p,1);attack(a.run,a.p,2);}
 if(n===17){equipStart(a.run,a.p);attack(a.run,a.p,2);attack(a.run,a.p,3);}
 if(n===22)discover(a.run,a.p);
 if(n===30){discoveries(a.run,a.p,3);fire(a.run,a.p,'BOSS_CLEAR');}
 if(n===13){equipStart(a.run,a.p);attack(a.run,a.p,3);}
 const saved=JSON.parse(JSON.stringify(a.run)),p=saved.players[0];
 if(n===3||n===17)assert.equal(attack(saved,p,5).damage.amount,attack(a.run,a.p,5).damage.amount);
 else{const before=p.growthExp,relics=p.relics.length;if(n===30)fire(saved,p,'BOSS_CLEAR');else if(n===22)discover(saved,p);else fire(saved,p,'CARD_VALIDATED',{resolved:{valid:true,finalNumber:3}});assert.equal(p.growthExp,before);assert.equal(p.relics.length,relics);}
 assert.equal(projectRun(saved,'p1').augmentFramework,undefined);
});
test('005B-A base EXP + equipment EXP retry-safe distinct ledgers; Gold independent',()=>{
 const {run,p}=fixture(13);equipStart(run,p);const r={valid:true,finalNumber:3,cardInstanceId:'utility'};
 fire(run,p,'CARD_VALIDATED',{resolved:r});onValidAttack(p,run,r);onValidAttack(p,run,r);fire(run,p,'CARD_VALIDATED',{resolved:r});
 assert.equal(p.growthExp,3);assert.equal(p.runGold,0);
 const sources=Object.values(run.augmentFramework.grants).map(x=>x.sourceAugmentId);assert.ok(sources.includes('ADVENTURER_BASE'));assert.ok(sources.includes('aug-013'));
});
test('005B-A negative relic opportunity duplicate/full inventory terminal failure',()=>{
 const {run,p}=fixture(30);run.relicInventoryLimit=1;for(const target of run.players)target.relics=['relic0'];
 const first=grantRelicOpportunity(run,p,{applicationId:'full'});assert.equal(first.applied,false);
 run.players[0].relics=[];assert.equal(grantRelicOpportunity(run,p,{applicationId:'full'}).applied,false);
 run.relicInventoryLimit=99;run.relicCatalog=[{id:'relic0',pool:'GENERAL'}];for(const target of run.players)target.relics=['relic0'];
 assert.equal(grantRelicOpportunity(run,p,{applicationId:'duplicate'}).applied,false);
});
test('005B-A seeded relic grant determinism and Gold idempotency',()=>{
 const {run,p}=fixture(30);discoveries(run,p,3);const a=structuredClone(run),b=structuredClone(run);
 fire(a,a.players[0],'BOSS_CLEAR');fire(b,b.players[0],'BOSS_CLEAR');assert.deepEqual(a,b);
 const gold=fixture(23);discover(gold.run,gold.p);fire(gold.run,gold.p,'MONSTER_KILLED');fire(gold.run,gold.p,'MONSTER_KILLED');assert.equal(gold.p.runGold,2);assert.equal(gold.p.growthExp,1);const sources=Object.values(gold.run.augmentFramework.grants).map(x=>x.sourceAugmentId);assert.ok(sources.includes('ADVENTURER_BASE_GOLD'));assert.ok(sources.includes('aug-023'));
});
test('005B-A full equipment archetype and mixed archetype ordering',()=>{
 const {run,p}=fixture(19);p.augments=[aid(11),aid(13),aid(17),aid(19),aid(3)];
 equipStart(run,p);attack(run,p,2);attack(run,p,3);assert.equal(attack(run,p,5).damage.amount,12);assert.equal(p.growthExp,2);
 cleanupAugmentScope(run,'COMBAT');assert.equal(Object.values(run.augmentFramework.cardState).filter(x=>x.resetScope==='COMBAT').length,0);assert.equal(p.augments.length,5);
});
test('005B-A candidate acquisition E2E after real room clear; next room and reconnect',()=>{
 const {run,p}=fixture(2);p.augments=[aid(1)];p.augmentBuild='노련한 탐험가';p.persistentCharacterState.augmentTiers=[1];p.growthExp=149;run.combat.monster.hp=1;
 beginTurn(run);[1,2,3,4].forEach((n,i)=>{const player=run.players[i],id=player.cardPool.find(c=>c.baseNumber===n).id;submitCard(run,player.playerId,id);});
 resolveBasicTurn(run);assert.equal(run.phase,'AUGMENT_CHOICE');chooseAugment(run,p.playerId,aid(3));assert.ok(p.augments.includes(aid(3)));
 const saved=structuredClone(run);saved.phase='COMBAT';saved.combat=newCombatState(saved.players,999);saved.combat.id='next-room';const owner=saved.players[0];
 attack(saved,owner,1);attack(saved,owner,2);assert.equal(attack(saved,owner,3).damage.amount,7);
 const restored=JSON.parse(JSON.stringify(saved));assert.ok(restored.players[0].augments.includes(aid(3)));assert.equal(attack(restored,restored.players[0],4).damage.amount,7);
});

test('005B-A negative equipment conditions and caps; FINAL_NUMBER alternation',()=>{
 const a=fixture(13);equipStart(a.run,a.p);attack(a.run,a.p,3);a.run.combat.privateByPlayer.p0.cycleIndex++;attack(a.run,a.p,2);attack(a.run,a.p,3);assert.equal(a.p.growthExp,2);
 const b=fixture(14);equipStart(b.run,b.p);attack(b.run,b.p,4);attack(b.run,b.p,4);assert.equal(attack(b.run,b.p,5).damage.amount,6);attack(b.run,b.p,1);assert.equal(attack(b.run,b.p,5).damage.amount,5);
 const c=fixture(17);equipStart(c.run,c.p);attack(c.run,c.p,2);attack(c.run,c.p,2);attack(c.run,c.p,3);assert.equal(attack(c.run,c.p,5).damage.amount,6);
 const d=fixture(19);equipStart(d.run,d.p);attack(d.run,d.p,2);const status=d.run.augmentFramework.statuses.find(x=>x.sourceId==='aug-019');assert.equal(status.payload.amount,2);
});
test('005B-A negative discovery and Reward rank; lowest HP ties use lobby seats',()=>{
 const a=fixture(22);fire(a.run,a.p,'CARD_VALIDATED',{resolved:{valid:true,finalNumber:1},cards:[1,2,3,3].map(finalNumber=>({valid:true,finalNumber}))});assert.equal(a.p.growthExp,0);
 const b=fixture(25);discover(b.run,b.p);assert.equal(b.p.growthExp,1);
 const c=fixture(27);c.run.phase='REWARD_ROOM';let added=0;fire(c.run,c.p,'REWARD_RANKED',{rank:2,resolved:{valid:true},addCandidate:()=>++added});assert.equal(added,0);
 const d=fixture(12);equipStart(d.run,d.p);d.run.players[1].hp=d.run.players[2].hp=1;attack(d.run,d.p,2);assert.equal(d.run.augmentFramework.statuses.find(x=>x.sourceId==='aug-012').targetId,'p1');
});
test('005B-A relic opportunity confirms once after reconnect and hides other players candidates',()=>{
 const {run,p}=fixture(30);discoveries(run,p,3);fire(run,p,'BOSS_CLEAR');const saved=JSON.parse(JSON.stringify(run));
 const [id,op]=Object.entries(saved.augmentFramework.relicOpportunities)[0];
 assert.equal(projectRun(saved,'p1').privateRelicOpportunity,undefined);assert.deepEqual(projectRun(saved,op.playerId).privateRelicOpportunity.candidateIds,op.candidateIds);
 assert.throws(()=>chooseRelicOpportunity(saved,'p1',id,op.candidateIds[0]),/OWNER/);
 assert.throws(()=>chooseRelicOpportunity(saved,op.playerId,id,'forged'),/CANDIDATE/);
 assert.equal(chooseRelicOpportunity(saved,op.playerId,id,op.candidateIds[0]).applied,true);
 assert.equal(chooseRelicOpportunity(saved,op.playerId,id,op.candidateIds[0]).applied,false);
 assert.equal(saved.players.flatMap(x=>x.relics).length,1);
});
test('005B-A full inventory at final confirmation fails permanently without replacement',()=>{
 const {run,p}=fixture(30);run.relicInventoryLimit=1;
 grantRelicOpportunity(run,p,{applicationId:'late-full'});const op=run.augmentFramework.relicOpportunities['late-full'];
 p.relics=['another'];assert.equal(chooseRelicOpportunity(run,p.playerId,'late-full',op.candidateIds[0]).reason,'FULL_INVENTORY');
 p.relics=[];assert.equal(chooseRelicOpportunity(run,p.playerId,'late-full',op.candidateIds[0]).applied,false);
});
