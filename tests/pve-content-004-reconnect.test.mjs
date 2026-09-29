import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {isCardSelectableForCharacter} from '../supabase/functions/game-api/pve/characters.js';

const classes=['adventurer','warrior','rogue','mage','berserker','prophet','imp','gambler','gunner','martial_artist','vampire','demon_swordsman','twins'];
function make(classId){
 const players=[classId,'adventurer','adventurer','adventurer'].map((character_id,i)=>newPlayerRunState({id:'p'+i,character_id,member_type:'human',seat_index:i}));
 const run={id:'reconnect-'+classId,seed:'reconnect-'+classId,rngCounter:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,players,combat:newCombatState(players,500)};
 beginTurn(run);return run;
}
function select(run,pid){
 const p=run.players.find(x=>x.playerId===pid),state=run.combat.privateByPlayer[pid];
 return state.remainingCardIds.find(id=>isCardSelectableForCharacter(p,p.cardPool.find(c=>c.id===id)));
}
for(const classId of classes)test('C04 reconnect, privacy, identity, and replay: '+classId,()=>{
 const a=make(classId),b=make(classId),id=select(a,'p0');
 assert.ok(id);
 const before=projectRun(a,'p0');
 assert.ok(before.privateCombat.remainingCardIds.includes(id));
 submitCard(a,'p0',id);
 const mid=projectRun(a,'p0'),other=projectRun(a,'p1');
 assert.equal(mid.privateCombat.selectedCardId,id);
 assert.ok(other.combat.readyPlayerIds.includes('p0'));
 assert.equal(JSON.stringify(other).includes(id),false);
 submitCard(b,'p0',select(b,'p0'));
 for(let i=1;i<4;i++){submitCard(a,'p'+i,select(a,'p'+i));submitCard(b,'p'+i,select(b,'p'+i));}
 const ra=resolveBasicTurn(a),rb=resolveBasicTurn(b);
 assert.deepEqual(ra.cards.map(c=>[c.playerId,c.finalNumber,c.valid]),rb.cards.map(c=>[c.playerId,c.finalNumber,c.valid]));
 assert.ok(a.players[0].cardPool.some(c=>c.id===id));
 assert.equal(projectRun(a,'p0').privateCombat.playerId,'p0');
});
