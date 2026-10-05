import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInitialPveRun,handlePveAction} from '../supabase/functions/game-api/pve/api.js';
import {connectedNodeIds} from '../supabase/functions/game-api/pve/map.js';
import {AUGMENT_BY_ID} from '../supabase/functions/game-api/pve/augment-catalog.js';
import {F1_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {F2_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f2.js';
import {F3_MONSTER_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f3.js';
const json=(body,status=200)=>({body,status});
const actionId=n=>'d0000000-0000-4000-8000-'+String(n).padStart(12,'0');
function adminFor(initial){
 let state=structuredClone(initial),version=0;const receipts=new Map(),ledger=new Map();let gold=1000,rp=50,settled=0,settleCalls=0;
 return {get state(){return structuredClone(state);},get version(){return version;},get wallet(){return {gold,rp,settled,settleCalls};},
 from(){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{id:'p0'},error:null};}};},
 async rpc(name,args){
 if(name==='pve_read')return {data:{version,state:structuredClone(state),action_result:receipts.get(args.p_action_id)||null},error:null};
 if(name==='pve_try_commit'){
 if(receipts.has(args.p_action_id))return {data:{version,state:structuredClone(state),duplicate:true},error:null};
 if(args.p_expected!==version)return {data:{conflict:true,version,state:structuredClone(state)},error:null};
 version++;state=structuredClone(args.p_state);state.version=version;
 // Existing pve_try_commit persists a clean state after draining telemetry to SQL rows.
 delete state._telemetryPending;
 // Controlled encounter fixture: the real router, card resolution, floor transition,
 // acquisition and cleanup still execute; these are not natural-balance claims.
 if(state.phase==='COMBAT'){state.combat.monster.hp=state.combat.turn<7?999:1;state.combat.monster.intent={type:'CHARGE',payload:{},telegraphText:'fixture wait'};for(const p of state.players){p.hp=p.maxHp;p.status='ACTIVE';}state.flame=state.maxFlame;state.combat.pendingDownPlayerIds=[];}
 receipts.set(args.p_action_id,{state:structuredClone(state),committed_version:version});return {data:{version,state:structuredClone(state)},error:null};
 }
 if(name==='pve_settle_rewards'){
 settleCalls++;if(ledger.has(state.id))return {data:{...ledger.get(state.id),duplicate:true},error:null};
 const paid=state.phase==='RUN_CLEAR'?state.players[0].runGold:0;gold+=paid;settled++;state.rewards_committed=true;
 const row={settled:true,paid_gold:paid,rp_delta:0};ledger.set(state.id,row);return {data:row,error:null};
 }throw new Error('unexpected RPC '+name);
 }};
}
async function call(admin,action,n,extra={},retry=false){
 const body={action:'pve.'+action,run_id:admin.state.id,...(action==='getState'?{}:{action_id:actionId(n),expected_version:admin.version}),...extra};
 const result=await handlePveAction({admin,user:{id:'u0'},body,json});assert.ok(result&&result.status<400,action+': '+JSON.stringify(result));
 if(retry){const before=JSON.stringify(admin.state),version=admin.version,again=await handlePveAction({admin,user:{id:'u0'},body,json});assert.equal(again.body.idempotent,true);assert.equal(admin.version,version);assert.equal(JSON.stringify(admin.state),before);}
 return result.body.run;
}
function legal(run,room=false){
 const z=room?run.privateRoomState:run.privateCombat,p=run.players[0];
 return (z.remainingCardIds||[]).map(id=>p.cardPool.find(c=>c.id===id)).filter(c=>c&&(p.characterId!=='twins'||c.baseNumber%2===(p.publicResources.parity||0))).sort((a,b)=>(p.characterId==='demon_swordsman'?a.baseNumber-b.baseNumber:b.baseNumber-a.baseNumber)||a.id.localeCompare(b.id))[0]?.id;
}
for(const [party,classes,equipped] of [
 ['FOUR_NEW',['martial_artist','vampire','demon_swordsman','twins'],[['aug-271','aug-272','aug-273','aug-280'],['aug-301','aug-303','aug-307','aug-308'],['aug-351','aug-352','aug-355','aug-360'],['aug-381','aug-382','aug-385','aug-390']]],
 ['TWINS_OWNER',['twins','mage','imp','vampire'],[['aug-371','aug-373','aug-377','aug-380'],['aug-091','aug-092'],['aug-181','aug-183'],['aug-301','aug-307']]],
 ['GHOST_OWNER',['demon_swordsman','seer','gunner','berserker'],[['aug-351','aug-352','aug-353','aug-355','aug-359'],['aug-161','aug-162'],['aug-241','aug-248'],['aug-121','aug-122']]],
 ['VAMPIRE_OWNER',['vampire','imp','seer','gambler'],[['aug-321','aug-325','aug-328','aug-329'],['aug-181','aug-183'],['aug-161','aug-162'],['aug-231','aug-232']]]
])test('005D FINAL '+party+' three-floor real API expedition, reconnect, retries and settlement',async()=>{
 const members=classes.map((character_id,i)=>({id:'p'+i,user_id:i===0?'u0':undefined,member_type:i===0?'human':'ai',character_id:({martial_artist:'fighter',demon_swordsman:'demonsword'}[character_id]||character_id),seat_index:i,display_name:'005D '+i}));
 const initial=buildInitialPveRun({room:{id:'30000000-0000-4000-8000-000000000003'},members},{seed:'005d-final-'+party,depthCount:8});
 for(let i=0;i<4;i++){initial.players[i].augments.push(...equipped[i]);initial.players[i].augmentBuild=AUGMENT_BY_ID[equipped[i][0]].build;initial.players[i].persistentCharacterState.augmentTiers=[...new Set(equipped[i].map(id=>AUGMENT_BY_ID[id].tier))];}
 const admin=adminFor(initial);let n=1000,run=await call(admin,'getState',0),floors=[],reconnects=[],skills=0,retried=false;
 for(let guard=0;guard<900&&!['RUN_CLEAR','RUN_FAILED'].includes(run.phase);guard++){
 if(run.phase==='MAP_VOTE'){
 if(run.floor===3&&!reconnects.includes('F3_MAP')){const before=admin.state;run=await call(admin,'getState',0);assert.deepEqual(admin.state,before);reconnects.push('F3_MAP');}
 if(!floors.includes(run.floor))floors.push(run.floor);
 const nodes=connectedNodeIds(run.map).map(id=>run.map.nodes.find(x=>x.id===id));
 // Cadence changes target RNG consumption and thus later floor paths. This API
 // lifecycle fixture selects an existing feasible node, retaining unique pools;
 // the unfiltered balance simulation separately records pool exhaustion failures.
 const defs=[null,F1_MONSTER_DEFINITIONS,F2_MONSTER_DEFINITIONS,F3_MONSTER_DEFINITIONS][run.floor],used=admin.state.usedMonsterIds||[];
 const target=nodes.find(node=>!['NORMAL_COMBAT','ELITE_COMBAT'].includes(node.type)||Object.values(defs).some(m=>m.tier===(node.type==='NORMAL_COMBAT'?'NORMAL':'ELITE')&&!used.includes(m.id)));
 assert.ok(target,'fixture has a feasible connected room');run=await call(admin,'voteNextRoom',n++,{node_id:target.id});continue;
 }
 if(run.phase==='COMBAT'){
 if(!reconnects.includes('F1_COMBAT')){const before=admin.state;run=await call(admin,'getState',0);assert.deepEqual(admin.state,before);reconnects.push('F1_COMBAT');}
 const p=run.players[0];if(p.characterId==='twins'&&p.publicResources.acrobaticsReady||p.characterId==='demon_swordsman'&&p.publicResources.transformationPending&&!p.publicResources.transformationActive){run=await call(admin,'activateSkill',n++,{},true);skills++;}
 run=await call(admin,'submitCard',n++,{card_instance_id:legal(run)},!retried);retried=true;continue;
 }
 if(run.phase==='EVENT'){run=await call(admin,'submitEventCard',n++,{card_instance_id:legal(run,true)});continue;}
 if(run.phase==='REST'){run=await call(admin,'restChoice',n++,{choice:'FULL_HEAL'});continue;}
 if(run.phase==='SHOP'){run=await call(admin,'shopReady',n++);continue;}
 if(run.phase==='REWARD_ROOM'){run=run.roomState.pickOrder?.length?await call(admin,'rewardChooseRelic',n++,{relic_id:run.roomState.relicIds.find(id=>!run.players[0].relics.includes(id))}):await call(admin,'rewardSubmitCard',n++,{card_instance_id:legal(run,true)});continue;}
 if(run.phase==='ROOM_RESULT'){run=await call(admin,'roomReady',n++);continue;}
 if(run.phase==='AUGMENT_CHOICE'){run=await call(admin,'chooseAugment',n++,{augment_id:run.privateAugmentOffer.augmentIds[0]});continue;}
 if(run.phase==='FLOOR_CLEAR'){run=await call(admin,'continueFloor',n++);continue;}assert.fail('unhandled '+run.phase);
 }
 assert.equal(run.phase,'RUN_CLEAR');assert.deepEqual(floors,[1,2,3]);assert.deepEqual(reconnects,['F1_COMBAT','F3_MAP']);assert.equal(retried,true);
 if(classes[0]==='twins'||classes[0]==='demon_swordsman')assert.ok(skills>0,'skills='+skills+' class='+classes[0]);
 const paid=admin.state.players[0].runGold;await call(admin,'getState',0);await call(admin,'getState',0);assert.equal(admin.wallet.gold,1000+paid);assert.equal(admin.wallet.rp,50);assert.equal(admin.wallet.settled,1);assert.equal(admin.state.rewards_committed,true);
 assert.equal(admin.state.players.some(p=>p.cardPool.some(c=>c.source==='DEMON_TRANSFORM')),false);
 for(const [i,ids] of equipped.entries())for(const id of ids)assert.ok(admin.state.players[i].augments.includes(id),id);
});
for(const terminal of ['RUN_FAILED','ABANDONED'])test('005D FINAL '+terminal+' settlement pays zero and leaves RP unchanged on reconnect',async()=>{
 const members=Array.from({length:4},(_,i)=>({id:'p'+i,user_id:i===0?'u0':undefined,member_type:i===0?'human':'ai',character_id:'twins',seat_index:i}));
 const initial=buildInitialPveRun({room:{id:'30000000-0000-4000-8000-000000000003'},members},{seed:terminal,depthCount:8});initial.phase=terminal;initial.players[0].runGold=500;
 const admin=adminFor(initial);await call(admin,'getState',0);await call(admin,'getState',0);assert.equal(admin.wallet.gold,1000);assert.equal(admin.wallet.rp,50);assert.equal(admin.wallet.settled,1);
});
