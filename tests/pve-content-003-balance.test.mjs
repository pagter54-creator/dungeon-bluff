import test from 'node:test';
import assert from 'node:assert/strict';
import {F3_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f3.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn} from '../supabase/functions/game-api/pve/combat.js';
const sum=x=>x.reduce((a,b)=>a+b,0),mean=x=>x.length?sum(x)/x.length:0;
function simulate(def,seed){
 const players=Array.from({length:4},(_,seat)=>newPlayerRunState({id:'p'+seat,seat_index:seat,member_type:'ai',character_id:'adventurer'}));
 const run={id:'f3-balance-'+def.id+'-'+seed,seed:'f3-balance-'+seed,rngCounter:0,phase:'COMBAT',floor:3,depth:1,currentRoomNodeId:'f3-d1-n0',flame:4,maxFlame:5,players,cardCycles:{},chosenBossIds:{3:def.id},usedMonsterIds:[],map:{depthCount:10}};
 run.combat=newCombatState(players,def.baseHp,def.tier==='BOSS'?'BOSS':def.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',def);
 beginTurn(run);
 const record=run._telemetryPending?.find(x=>x.logType==='COMBAT')?.payload;
 assert.ok(record,def.id+' lacks combat telemetry');return record;
}
test('Floor 3 fresh-party balance telemetry is recorded without altering stress references',()=>{
 const records=Object.values(F3_MONSTER_DEFINITIONS).flatMap(def=>[1,2,3].map(seed=>simulate(def,seed)));
 assert.equal(records.length,36);const report={};
 for(const tier of ['NORMAL','ELITE','BOSS']){
  const group=records.filter(x=>F3_MONSTER_DEFINITIONS[x.monster_id].tier===tier);
  const target=tier==='NORMAL'?7:tier==='ELITE'?12:17;
  const turns=mean(group.map(x=>x.turn_count)),clears=group.filter(x=>x.outcome==='VICTORY').length/group.length;
  const damage=sum(group.map(x=>x.party_damage_total)),totalTurns=sum(group.map(x=>x.turn_count));
  const valid=sum(group.map(x=>sum(Object.values(x.valid_attack_count)))),collisions=sum(group.map(x=>sum(Object.values(x.collision_count))));
  report[tier]={samples:group.length,averageTurns:turns,clearRate:clears,averagePartyDamagePerTurn:totalTurns?damage/totalTurns:0,collisionRate:valid+collisions?collisions/(valid+collisions):0,downCount:sum(group.map(x=>sum(Object.values(x.down_count)))),flameConsumption:sum(group.map(x=>x.flame_spent)),warning:Math.abs(turns-target)>target*.3||clears<.5?'BALANCE_WARNING_F3':null};
 }
 console.log('[F3 BALANCE TELEMETRY]',JSON.stringify(report));
});
