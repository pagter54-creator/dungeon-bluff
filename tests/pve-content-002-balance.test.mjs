import test from 'node:test';
import assert from 'node:assert/strict';
import {F2_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f2.js';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn} from '../supabase/functions/game-api/pve/combat.js';

const sum=values=>values.reduce((a,b)=>a+b,0);
const mean=values=>values.length?sum(values)/values.length:0;
function simulate(def,seed){
  const players=Array.from({length:4},(_,seat)=>newPlayerRunState({id:`p${seat}`,seat_index:seat,member_type:'ai',character_id:'adventurer'}));
  const run={id:`f2-balance-${def.id}-${seed}`,seed:`f2-balance-${seed}`,rngCounter:0,phase:'COMBAT',floor:2,depth:1,currentRoomNodeId:'f2-d1-n0',flame:4,maxFlame:5,players,cardCycles:{},chosenBossIds:{2:def.id},usedMonsterIds:[],map:{depthCount:12}};
  run.combat=newCombatState(players,def.baseHp,def.tier==='BOSS'?'BOSS':def.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',def);
  beginTurn(run);
  const record=run._telemetryPending?.find(x=>x.logType==='COMBAT')?.payload;
  assert.ok(record,`${def.id} lacks combat telemetry`);
  return record;
}
test('Floor 2 deterministic encounter balance telemetry is recorded without changing goldens',()=>{
  const records=Object.values(F2_MONSTER_DEFINITIONS).flatMap(def=>[1,2,3].map(seed=>simulate(def,seed)));
  assert.equal(records.length,36);
  const report={};
  for(const tier of ['NORMAL','ELITE','BOSS']){
    const group=records.filter(record=>F2_MONSTER_DEFINITIONS[record.monster_id].tier===tier);
    const target=tier==='NORMAL'?7:tier==='ELITE'?11:15;
    const turns=mean(group.map(record=>record.turn_count));
    const clearRate=group.filter(record=>record.outcome==='VICTORY').length/group.length;
    const totalDamage=sum(group.map(record=>record.party_damage_total));
    const totalTurns=sum(group.map(record=>record.turn_count));
    const valid=sum(group.map(record=>sum(Object.values(record.valid_attack_count))));
    const collisions=sum(group.map(record=>sum(Object.values(record.collision_count))));
    report[tier]={samples:group.length,averageTurns:turns,clearRate,averagePartyDamagePerTurn:totalTurns?totalDamage/totalTurns:0,collisionRate:valid+collisions?collisions/(valid+collisions):0,downCount:sum(group.map(record=>sum(Object.values(record.down_count)))),flameConsumption:sum(group.map(record=>record.flame_spent)),warning:Math.abs(turns-target)>target*0.3||clearRate<0.5?'BALANCE_WARNING_F2':null};
  }
  console.log('[F2 BALANCE TELEMETRY]',JSON.stringify(report));
});
