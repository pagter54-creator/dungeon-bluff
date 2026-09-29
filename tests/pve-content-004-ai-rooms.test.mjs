import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn} from '../supabase/functions/game-api/pve/combat.js';
import {enterEventRoom} from '../supabase/functions/game-api/pve/events.js';
import {enterRewardRoom,enterRestRoom,enterShopRoom} from '../supabase/functions/game-api/pve/rooms.js';
import {isCardSelectableForCharacter} from '../supabase/functions/game-api/pve/characters.js';

const classes=['adventurer','warrior','rogue','mage','berserker','prophet','imp','gambler','gunner','martial_artist','vampire','demon_swordsman','twins'];
function fresh(characterId){
 const players=[characterId,'adventurer','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,character_id,member_type:i===0?'ai':'human',seat_index:i}));
 return {id:'ai-'+characterId,seed:'ai-'+characterId,rngCounter:0,phase:'MAP_VOTE',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'node',players};
}
for(const classId of classes)test('C04 AI and room entry never softlock: '+classId,()=>{
 const run=fresh(classId);run.phase='COMBAT';run.combat=newCombatState(run.players,500);beginTurn(run);
 const submission=run.combat.turnSubmissions.p0,privateState=run.combat.privateByPlayer.p0;
 assert.ok(submission,'AI did not submit');
 assert.ok(privateState.remainingCardIds.includes(submission.cardInstanceId));
 const card=run.players[0].cardPool.find(c=>c.id===submission.cardInstanceId);
 assert.ok(card&&isCardSelectableForCharacter(run.players[0],card));
 const event=fresh(classId);enterEventRoom(event);
 assert.equal(event.phase,'EVENT');assert.ok(event.roomState.turnSubmissions.p0);
 const reward=fresh(classId);enterRewardRoom(reward);
 assert.equal(reward.phase,'REWARD_ROOM');assert.ok(reward.roomState.turnSubmissions.p0);
 const rest=fresh(classId);enterRestRoom(rest);
 assert.equal(rest.phase,'REST');assert.equal(rest.roomState.choicesByPlayer.p0.choice,'FULL_HEAL');
 const shop=fresh(classId);enterShopRoom(shop);
 assert.equal(shop.phase,'SHOP');assert.ok(shop.roomState.readyPlayerIds.includes('p0'));
});
