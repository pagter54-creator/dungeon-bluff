import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn} from '../supabase/functions/game-api/pve/combat.js';
import {applyOwnedEffects} from '../supabase/functions/game-api/pve/effects.js';
import {applyImpCardValidated,applyImpBeforeDamage} from '../supabase/functions/game-api/pve/imp-runtime.js';
import {applyGamblerValidated} from '../supabase/functions/game-api/pve/gambler.js';
import {EXECUTABLE_AUGMENT_RUNTIME} from '../supabase/functions/game-api/pve/augment-runtime.js';
const source=JSON.parse(fs.readFileSync(new URL('../docs/PVE_CONTENT_005Q_DESIGN_C.json',import.meta.url),'utf8'));
for(let n=151;n<=270;n++){
 const id='aug-'+String(n).padStart(3,'0'),contract=EXECUTABLE_AUGMENT_RUNTIME[id];
 test('005C FINAL five-room contract and real forbidden damage gates '+id,()=>{
  assert.deepEqual(contract.roomApplicability,n<=180?{COMBAT:true,EVENT:false,REWARD:false,SHOP:false,REST:false}:source.cards.find(c=>c.augmentId===id).roomApplicability,id);
  for(const [room,phase] of [['COMBAT','COMBAT'],['EVENT','EVENT'],['REWARD','REWARD_ROOM'],['SHOP','SHOP'],['REST','REST']]){
   if(contract.roomApplicability[room])continue;
   const player=newPlayerRunState({id:'p0',character_id:contract.classId||contract.characterId,seat_index:0,member_type:'human'});player.augments=[id];
   const run={id:'rooms-'+id,seed:'rooms-'+id,rngCounter:0,phase:'COMBAT',floor:1,depth:1,currentRoomNodeId:'node',flame:5,maxFlame:5,players:[player]};
   run.combat=newCombatState([player],99999);run.combat.id='combat';beginTurn(run);run.phase=phase;
   const hp=player.hp,exp=player.growthExp,resources=structuredClone(player.publicResources);
   const resolved={playerId:'p0',cardInstanceId:player.cardPool[0].id,baseNumber:6,finalNumber:6,valid:true,stealTotal:3,stealTargetCount:3},damage={amount:6};
   applyOwnedEffects(run,'CARD_VALIDATED',{player,resolved,cards:[resolved]});
   applyOwnedEffects(run,'BEFORE_DAMAGE',{player,resolved,damage});
   applyImpCardValidated(run,{player,resolved,cards:[resolved]});applyImpBeforeDamage(run,{player,resolved,damage});
   if(player.characterId==='gambler')assert.equal(applyGamblerValidated(run,player,run.combat.privateByPlayer.p0,resolved),0);
   assert.equal(damage.amount,6,id+' '+room);assert.equal(player.hp,hp);assert.equal(player.growthExp,exp);assert.deepEqual(player.publicResources,resources);
  }
 });
}
