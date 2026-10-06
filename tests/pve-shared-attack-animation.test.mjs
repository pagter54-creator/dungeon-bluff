import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptPveTurnResult} from '../src/pve-gameplay-adapter.js';
import {revelationGauge} from '../src/character-ui.js';
function fixture(characterId,attackFx,cards,damagePackets){
 const player={playerId:'p',characterId,hp:3,publicResources:{combo:3}};
 const lobbyId=characterId==='martial_artist'?'fighter':characterId;
 const bundle={members:[{id:'p',character_id:lobbyId}],characters:[{id:lobbyId,definition:{attackFx}}]};
 const before={id:'r',floor:1,depth:1,players:[player],combat:{monster:{hp:100,maxHp:100}}};
 const after={...before,combat:{monster:{hp:90,maxHp:100},publicTurnResult:{turn:1,cards,damagePackets,totalDamage:10,events:[],presentationMutations:[]}}};
 return adaptPveTurnResult(bundle,before,after).effects.filter(e=>e.type==='attack');
}
test('full burst uses one PvP multi-hit animation without pose/recovery pauses between bullets',()=>{
 const effects=fixture('gunner','bullet',[{playerId:'p',cardInstanceId:'c1',skillUsed:'full_burst',valid:true}], [
 {sourcePlayerId:'p',sourceCardId:'c1',amount:1,burstChainId:'burst'},
 {sourcePlayerId:'p',sourceCardId:'c2',amount:2,followUp:true,tags:['FOLLOW_UP'],burstChainId:'burst'},
 {sourcePlayerId:'p',sourceCardId:'c3',amount:3,followUp:true,tags:['FOLLOW_UP'],burstChainId:'burst'},
 {sourcePlayerId:'p',sourceCardId:'c1',amount:4,extraDamageComponent:true}
 ]);
 assert.deepEqual(effects.map(e=>[e.amount,e.hits,e.attackFx]),[[6,3,'bullet'],[4,1,'bullet']]);
});
test('martial attack animation restores one plus resolved combo stack hits',()=>{
 for(const stacks of [0,1,2,3,4]){
  const [effect]=fixture('martial_artist','fist',[{playerId:'p',valid:true,comboAfter:stacks}], [{sourcePlayerId:'p',amount:10}]);
  assert.equal(effect.hits,1+stacks);assert.equal(effect.amount,10);assert.equal(effect.attackFx,'fist');
 }
});
test('ordinary follow-ups keep separate animation and damage totals',()=>{
 const effects=fixture('gunner','bullet',[{playerId:'p',valid:true}], [{sourcePlayerId:'p',amount:2},{sourcePlayerId:'p',amount:8,followUp:true,tags:['FOLLOW_UP']}]);
 assert.deepEqual(effects.map(e=>[e.amount,e.hits]),[[2,1],[8,1]]);
});
test('shared prophet gauge preserves filled rectangular segments and accessible stack values',()=>{
 const markup=revelationGauge({skillId:'revelation',characterRuntimeState:{revelationStacks:3,revelationMax:6}});
 assert.match(markup,/seer-gauge/);assert.match(markup,/aria-valuenow="3"/);assert.equal((markup.match(/revelation-pip filled/g)||[]).length,3);assert.equal((markup.match(/class="revelation-pip/g)||[]).length,6);
});
