import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GAME_MODE as SERVER_MODE,parseRequestedGameMode,roomGameMode as serverRoomMode} from '../supabase/functions/game-api/game-mode.js';
import {GAME_MODE,gameModeSelectorMarkup,gameModeBadge,gameModeMeta,roomGameMode} from '../src/game-mode.js';
import {buildInitialPveRun,unsupportedPveRoomCharacters,pveCharacterIdForRoom} from '../supabase/functions/game-api/pve/api.js';
import {pveBetaMarkup,pveConnectedNodes} from '../src/pve-beta-ui.js';

const members=()=>[
 {id:'p0',user_id:'00000000-0000-4000-8000-000000000001',member_type:'human',character_id:'seer',seat_index:0,display_name:'A'},
 {id:'p1',user_id:'00000000-0000-4000-8000-000000000002',member_type:'human',character_id:'fighter',seat_index:1,display_name:'B'},
 {id:'p2',user_id:null,member_type:'ai',ai_type:'balanced',character_id:'demonsword',seat_index:2,display_name:'AI'},
 {id:'p3',user_id:null,member_type:'ai',ai_type:'balanced',character_id:'twins',seat_index:3,display_name:'AI2'}
];
test('UI-01..03 game mode selector defaults competitive and carries canonical request values',()=>{
 const html=gameModeSelectorMarkup();
 assert.match(html,/name="gameMode" value="COMPETITIVE" checked/);
 assert.match(html,/name="gameMode" value="COOP_PVE"/);
 assert.match(html,/협력 탐험/);assert.match(html,/BETA/);assert.match(html,/Gold 획득 가능 · RP 변동 없음/);
 assert.equal((html.match(/checked/g)||[]).length,1);
});
test('UI-04..06 mode badges distinguish competitive and cooperative Beta without inferring from titles',async()=>{
 assert.match(gameModeBadge(GAME_MODE.COMPETITIVE),/경쟁 탐험/);assert.doesNotMatch(gameModeBadge(GAME_MODE.COMPETITIVE),/BETA/);
 assert.match(gameModeBadge(GAME_MODE.COOP_PVE),/협력 탐험/);assert.match(gameModeBadge(GAME_MODE.COOP_PVE),/BETA/);
 assert.equal(roomGameMode({gameMode:'COOP_PVE',room_title:'경쟁이라고 써도'}),'COOP_PVE');
 const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(source,/gameModeBadge\(r\.gameMode\)/);assert.match(source,/gameModeBadge\(mode\)/);
});
test('MODE-01/04 server defaults missing mode to competitive and rejects invalid enum',()=>{
 assert.equal(parseRequestedGameMode(undefined),SERVER_MODE.COMPETITIVE);
 assert.equal(parseRequestedGameMode(''),SERVER_MODE.COMPETITIVE);
 assert.equal(parseRequestedGameMode(SERVER_MODE.COOP_PVE),SERVER_MODE.COOP_PVE);
 assert.equal(serverRoomMode({game_mode:null}),SERVER_MODE.COMPETITIVE);
 assert.throws(()=>parseRequestedGameMode('PVE_RANKED'),error=>error.code==='INVALID_GAME_MODE');
});
test('room character adapter maps competitive IDs explicitly and rejects unsupported gambler',()=>{
 assert.equal(pveCharacterIdForRoom('seer'),'prophet');
 assert.equal(pveCharacterIdForRoom('fighter'),'martial_artist');
 assert.equal(pveCharacterIdForRoom('demonsword'),'demon_swordsman');
 assert.equal(pveCharacterIdForRoom('gambler'),null);
 assert.deepEqual(unsupportedPveRoomCharacters(members()),[]);
 assert.deepEqual(unsupportedPveRoomCharacters([...members().slice(0,3),{...members()[3],character_id:'gambler'}]),['gambler']);
});
test('MODE-08 initial COOP run reuses actual PVE map/model and preserves lobby character identity',()=>{
 const bundle={room:{id:'11111111-1111-4111-8111-111111111111',game_mode:'COOP_PVE'},members:members()};
 const run=buildInitialPveRun(bundle,{seed:'room-mode-test',depthCount:8,now:1_800_000_000_000});
 assert.equal(run.phase,'MAP_VOTE');assert.equal(run.floor,1);assert.equal(run.depth,0);assert.equal(run.players.length,4);
 assert.equal(run.players[0].characterId,'prophet');assert.equal(run.players[0].lobbyCharacterId,'seer');
 assert.equal(run.players[1].characterId,'martial_artist');assert.equal(run.players[2].characterId,'demon_swordsman');
 assert.equal(pveConnectedNodes(run).length,2);
});
test('PVE Beta result UI states Gold separately and clearly says RP does not change',()=>{
 const roomMembers=members();
 const run=buildInitialPveRun({room:{id:'11111111-1111-4111-8111-111111111111'},members:roomMembers},{seed:'result-ui',now:1_800_000_000_000});
 run.phase='RUN_CLEAR';run.players[0].runGold=12;
 const bundle={room:{room_title:'PVE',gameMode:'COOP_PVE'},members:roomMembers,characters:[],run,pveRewardsCommitted:true};
 const html=pveBetaMarkup(bundle,roomMembers[0].user_id);
 assert.match(html,/RP 변동 없음/);assert.match(html,/12G/);assert.match(html,/계정 Gold 정산 완료/);
});
test('PVE mode metadata advertises Beta reward contract',()=>{
 const meta=gameModeMeta(GAME_MODE.COOP_PVE);assert.equal(meta.beta,true);assert.equal(meta.reward,'Gold 획득 가능 · RP 변동 없음');
});
