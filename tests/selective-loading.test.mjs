import test from 'node:test';
import assert from 'node:assert/strict';
import {ownSkinImages,roomSkinImages} from '../src/loading-ui.js';

test('creation prioritizes only the current default and owned equipped skins',()=>{
 const selected=ownSkinImages({equipped_character_skins:{mage:'mage3',rogue:'thief2'}});
 assert.equal(selected.length,3);
 assert.ok(selected.some(url=>url.endsWith('/mage3.png')));
 assert.ok(selected.some(url=>url.endsWith('/thief2.png')));
 assert.ok(selected.some(url=>url.endsWith('/travler0.png')));
});

test('room loading uses only present members and the local equipped skin',()=>{
 const members=[
  {user_id:'mine',character_id:'mage',loadout:{}},
  {user_id:'other',character_id:'rogue',loadout:{equipped_character_skins:{rogue:'thief3'}}},
 ];
 const selected=roomSkinImages(members,'mine',{equipped_character_skins:{mage:'mage2'}});
 assert.equal(selected.length,2);
 assert.ok(selected[0].endsWith('/mage2.png'));
 assert.ok(selected[1].endsWith('/thief3.png'));
});
