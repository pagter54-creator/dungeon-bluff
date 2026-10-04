import test from 'node:test';
import assert from 'node:assert/strict';
import {F3_MONSTER_DEFINITIONS,selectF3Monster} from '../supabase/functions/game-api/pve/content-f3.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {prepareF3Turn,applyF3CardRules,recordF3DamageBatch,prepareF3Action,resolveF3AfterDamage,f3Presentation} from '../supabase/functions/game-api/pve/monster-behavior-f3.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {pveStageModel} from '../src/pve-gameplay-adapter.js';
import {creatureArt} from '../src/art.js';
function setup(id){
 const def=F3_MONSTER_DEFINITIONS[id],players=Array.from({length:4},(_,i)=>newPlayerRunState({id:'p'+i,seat_index:i,member_type:'human',character_id:'adventurer'}));
 const run={id:'f3-'+id,seed:'f3-rules',rngCounter:0,phase:'COMBAT',floor:3,depth:1,players,flame:4,maxFlame:5,currentRoomNodeId:'f3-d1-n0'};
 run.combat=newCombatState(players,def.baseHp,def.tier==='BOSS'?'BOSS':def.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',def);return run;
}
const cards=(nums,flags=nums.map(()=>true))=>nums.map((finalNumber,i)=>({playerId:'p'+i,finalNumber,valid:flags[i],...(flags[i]?{}:{invalidReason:'COLLISION'})}));
function turn(run,nums,{flags,skills=[],damage=10}={}){
 run.combat.turnSubmissions=Object.fromEntries(skills.map(i=>['p'+i,{playerId:'p'+i,skillIntent:true}]));
 const intent=prepareF3Turn(run,{type:'CHARGE',telegraphText:'행동 예고',payload:{}});
 assert.ok(intent.telegraphText.includes(run.combat.monster.ruleSummary));
 const row=cards(nums,flags);applyF3CardRules(run,row,[]);recordF3DamageBatch(run,damage);return row;
}
function hits(run){const applied=[];resolveF3AfterDamage(run,[],(_run,p,amount,type)=>{applied.push({id:p?.playerId,amount,type});return [];});return applied;}
test('Floor 3 roster has 7 Normal, 3 Elite, 2 Boss at canonical HP',()=>{
 const defs=Object.values(F3_MONSTER_DEFINITIONS);assert.equal(defs.length,12);
 for(const [tier,n,hp] of [['NORMAL',7,160],['ELITE',3,280],['BOSS',2,420]]){const group=defs.filter(d=>d.tier===tier);assert.equal(group.length,n);for(const d of group){assert.equal(d.baseHp,hp);assert.ok(d.ruleSummary&&d.pattern.length);}}
 const run=setup('f3_greed_mimic');run.usedMonsterIds=[];const one=selectF3Monster(run,'NORMAL_COMBAT');run.usedMonsterIds.push(one.id);assert.notEqual(selectF3Monster(run,'NORMAL_COMBAT').id,one.id);
});
test('seven Normal mechanics honor public final numbers and skill intent',()=>{
 let r=setup('f3_greed_mimic');turn(r,[1,2,3,5]);assert.equal(hits(r)[0].id,'p3');
 r=setup('f3_royal_tax_collector');r.players.forEach(p=>p.runGold=2);turn(r,[1,1,2,2]);const taxTarget=r.combat.monster.behaviorState.targetPlayerId;hits(r);assert.equal(r.players.find(p=>p.playerId===taxTarget).runGold,1);
 r=setup('f3_abyss_duelist');turn(r,[1,2,3,3]);assert.equal(hits(r)[0].id,r.combat.monster.behaviorState.targetPlayerId);
 r=setup('f3_black_choir');turn(r,[1,1,2,2]);assert.equal(hits(r).length,4);
 r=setup('f3_skillfeed_familiar');turn(r,[1,2,3,4],{skills:[0,1]});assert.equal(r.combat.monster.behaviorState.boostReady,true);assert.equal(prepareF3Action(r,{type:'DIRECT_DAMAGE',payload:{amount:1}}).payload.amount,2);
 r=setup('f3_abyss_archivist');r.combat.monster.behaviorState.recent=[[4,3],[4,2]];const row=turn(r,[1,2,3,4]);assert.equal(r.combat.monster.behaviorState.recorded,4);assert.equal(row[3].monsterDamagePenalty,1);
 r=setup('f3_royal_appraiser');const app=turn(r,[1,2,4,5]);assert.equal(r.combat.monster.behaviorState.mode,'LOW');assert.equal(app[3].monsterDamagePenalty,1);
});
test('three Elite mechanics reset their countdown or stack',()=>{
 let r=setup('f3_execution_golem');turn(r,[1,2,3,4],{flags:[true,true,false,false]});r.combat.turn++;turn(r,[1,2,3,4],{flags:[true,true,false,false]});assert.equal(hits(r)[0].amount,2);assert.equal(r.combat.monster.behaviorState.countdown,2);
 r=setup('f3_abyss_auditor');turn(r,[1,2,3,4],{flags:[true,true,false,false]});r.combat.turn++;turn(r,[1,2,3,4],{flags:[true,true,false,false]});r.combat.turn++;turn(r,[1,2,3,4],{flags:[true,true,false,false]});assert.equal(hits(r).length,1);assert.equal(r.combat.monster.behaviorState.stacks.audit,0);
 r=setup('f3_null_choir_priest');const row=turn(r,[1,2,3,4]);assert.equal(row[0].monsterDamagePenalty,1);assert.equal(row[1].monsterDamagePenalty,undefined);
});
test('Abyss King learns, caps, handles invalid cards, and decays after strategy changes',()=>{
 let r=setup('f3_abyss_king');turn(r,[1,2,3,5]);r.combat.turn++;turn(r,[1,2,3,5]);assert.equal(r.combat.monster.behaviorState.adaptation.kind,'HIGH');
 r.combat.turn++;assert.equal(turn(r,[1,2,3,5])[3].monsterDamagePenalty,1);
 for(let i=0;i<4;i++){r.combat.turn++;turn(r,[1,2,3,5]);}assert.equal(r.combat.monster.behaviorState.adaptation.stack,3);
 r.combat.turn++;turn(r,[1,2,3,4]);r.combat.turn++;turn(r,[1,2,3,4]);assert.equal(r.combat.monster.behaviorState.adaptation.stack,2);
 r=setup('f3_abyss_king');turn(r,[1,2,3,4]);r.combat.turn++;turn(r,[1,2,3,5]);assert.equal(r.combat.monster.behaviorState.adaptation.kind,'COUNT');
 r=setup('f3_abyss_king');turn(r,[1,2,3,4],{flags:[true,true,false,false]});r.combat.turn++;turn(r,[1,2,3,4],{flags:[true,true,false,false]});assert.equal(r.combat.monster.behaviorState.adaptation.value,2);
 assert.ok(f3Presentation(r).statusText.includes('다른 전략 2턴'));
});
test('Masked Queen publishes one mask, rotates, and accelerates below half HP',()=>{
 const r=setup('f3_masked_queen'),s=r.combat.monster.behaviorState,seen=[];
 for(let n=1;n<=7;n++){r.combat.turn=n;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});seen.push(s.mask);}
 assert.deepEqual(seen,['SILENCE','SILENCE','GREED','GREED','HUMILITY','HUMILITY','DISCORD']);
 r.combat.turnSubmissions={p0:{playerId:'p0',skillIntent:true}};applyF3CardRules(r,cards([1,1,3,4],[false,false,true,true]),[]);assert.equal(r.combat.monster.defense,1);assert.equal(s.pendingHits.length,0);
 r.combat.monster.hp=200;r.combat.turn=8;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});assert.equal(s.mask,'SILENCE');assert.equal(s.untilChange,1);
 r.combat.turn=9;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});assert.equal(s.mask,'GREED');assert.equal(structuredClone(r).combat.monster.behaviorState.mask,'GREED');
});
test('final Boss victory clears combat, while simultaneous full wipe fails',()=>{
 function finish(wipe){
  const r=setup('f3_abyss_king');r.map={depthCount:10};r.cardCycles={};r.combat.monster.hp=1;
  if(wipe){r.flame=0;for(const p of r.players)p.hp=0;}
  beginTurn(r);for(const p of r.players)submitCard(r,p.playerId,p.cardPool.find(c=>c.baseNumber===p.seat+1).id);
  resolveBasicTurn(r);return r;
 }
 const clear=finish(false);assert.equal(clear.phase,'RUN_CLEAR');assert.equal(clear.combat,undefined);assert.equal(clear.finalSummary.clearedFloors,3);
 const failed=finish(true);assert.equal(failed.phase,'RUN_FAILED');assert.equal(failed.finalSummary,undefined);
});
test('every Floor 3 monster renders existing artwork, including documented reused illustrations',()=>{
 for(const d of Object.values(F3_MONSTER_DEFINITIONS)){const stage=pveStageModel({floor:3,depth:1,combat:{roomType:d.tier==='BOSS'?'BOSS':d.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',monster:d}});const art=creatureArt(stage.shape);assert.ok(art.includes('<img'),d.id);}
});

test('Abyss King damage-band learning, modified final values, collision filtering, and reconnect',()=>{
 let r=setup('f3_abyss_king');
 turn(r,[1,2,3,5],{damage:10});r.combat.turn++;
 turn(r,[1,2,4,6],{flags:[true,true,true,false],damage:11});
 assert.equal(r.combat.monster.behaviorState.adaptation.kind,'BAND');
 r.combat.turn++;turn(r,[1,2,3,4],{damage:12});assert.equal(hits(r).length,1);
 r=setup('f3_abyss_king');turn(r,[1,2,3,6],{flags:[true,true,true,false]});r.combat.turn++;turn(r,[1,2,3,6],{flags:[true,true,true,false]});
 assert.equal(r.combat.monster.behaviorState.adaptation.value,3);
 const saved=structuredClone(r);assert.equal(saved.combat.monster.behaviorState.adaptation.value,3);
 r=setup('f3_abyss_king');turn(r,[1,2,3,6]);r.combat.turn++;turn(r,[1,2,3,6]);r.combat.turn++;
 const modified=cards([1,2,3,6]);modified[3].baseNumber=1;
 prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});applyF3CardRules(r,modified,[]);
 assert.equal(modified[3].monsterDamagePenalty,1);
});
test('all four Queen masks apply only their current rule',()=>{
 const r=setup('f3_masked_queen'),s=r.combat.monster.behaviorState;
 r.combat.turn=1;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});r.combat.turnSubmissions={p0:{playerId:'p0',skillIntent:true}};
 applyF3CardRules(r,cards([1,2,3,4]),[]);assert.deepEqual(s.pendingHits,['p0']);
 r.combat.turn=2;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});
 r.combat.turn=3;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});r.combat.turnSubmissions={p0:{playerId:'p0',skillIntent:true}};
 applyF3CardRules(r,cards([1,2,3,4]),[]);assert.deepEqual(s.pendingHits,['p3']);
 r.combat.turn=4;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});
 r.combat.turn=5;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});const humility=cards([1,2,3,4]);applyF3CardRules(r,humility,[]);
 assert.equal(humility[3].monsterDamagePenalty,1);assert.equal(s.pendingHits.length,0);
 r.combat.turn=6;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});
 r.combat.turn=7;prepareF3Turn(r,{type:'CHARGE',telegraphText:'예고',payload:{}});r.combat.turnSubmissions={p0:{playerId:'p0',skillIntent:true}};
 applyF3CardRules(r,cards([1,1,3,4],[false,false,true,true]),[]);
 assert.equal(r.combat.monster.defense,1);assert.equal(s.pendingHits.length,0);
});
test('Queen death on a mask transition still reaches RUN_CLEAR',()=>{
 const r=setup('f3_masked_queen');r.map={depthCount:10};r.cardCycles={};r.combat.turn=3;r.combat.monster.behaviorState.maskTurns=2;r.combat.monster.hp=1;
 beginTurn(r);assert.equal(r.combat.monster.behaviorState.mask,'GREED');
 for(const p of r.players)submitCard(r,p.playerId,p.cardPool.find(c=>c.baseNumber===p.seat+1).id);
 resolveBasicTurn(r);assert.equal(r.phase,'RUN_CLEAR');assert.equal(r.combat,undefined);
});
