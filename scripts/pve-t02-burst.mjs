import {newPlayerRunState,newCombatState} from '../supabase/functions/game-api/pve/model.js';
import {beginTurn,submitCard,resolveBasicTurn} from '../supabase/functions/game-api/pve/combat.js';
import {projectRun} from '../supabase/functions/game-api/pve/projection.js';
import {F1_MONSTER_DEFINITIONS,F1_RELIC_DEFINITIONS} from '../supabase/functions/game-api/pve/content-f1.js';
import {installRelicCatalog} from '../supabase/functions/game-api/pve/relics.js';

export const T02_CHARACTER_IDS=Object.freeze(['gunner','demon_swordsman','martial_artist','berserker']);
export const T02_AUGMENTS=Object.freeze([['aug-241'],['aug-351'],['aug-291'],['aug-121']]);
const DUMMY=Object.freeze({id:'t02_fixture_dummy',name:'T02 Burst Dummy',tier:'NORMAL',baseHp:999,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]});
const THRESHOLD_BOSS=Object.freeze({id:'t02_threshold_fixture',name:'T02 Threshold Telemetry Fixture',tier:'BOSS',baseHp:60,pattern:[{type:'CHARGE',telegraphText:'fixture',payload:{}}]});

function makeRun(seed,id,{augments=T02_AUGMENTS,monsterDef=DUMMY}={}){
  const members=T02_CHARACTER_IDS.map((character_id,i)=>({id:'p'+i,user_id:'stress-user-'+i,member_type:'human',character_id,seat_index:i}));
  const players=members.map(newPlayerRunState);
  for(let i=0;i<players.length;i++)players[i].augments=[...(augments[i]||[])];
  const run={id:'stress-run:'+seed+':'+id,roomId:'stress-room',seed,rngCounter:0,version:0,phase:'COMBAT',floor:1,depth:1,flame:4,maxFlame:5,currentRoomNodeId:'stress-node:'+id,players,usedMonsterIds:[],chosenBossIds:{1:'f1_fallen_lord'},map:{nodes:[],edges:{}},createdAt:'stress',updatedAt:'stress'};
  installRelicCatalog(run,F1_RELIC_DEFINITIONS);
  const roomType=monsterDef.tier==='BOSS'?'BOSS':monsterDef.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT';
  run.combat=newCombatState(players,monsterDef.baseHp,roomType,monsterDef);run.combat.id='stress-combat:'+seed+':'+id;beginTurn(run);
  run.combat.monster.intent={type:'CHARGE',telegraphText:'fixture',payload:{}};
  return run;
}
const hard=(fail,code,message,details={})=>fail(code,message,details);
function card(run,pid,number,fail){
  const view=projectRun(run,pid),p=view.players.find(x=>x.playerId===pid),ids=view.privateCombat?.remainingCardIds||[];
  const row=(p?.cardPool||[]).find(c=>c.baseNumber===number&&ids.includes(c.id));
  if(!row)hard(fail,'T02_FIXTURE_CARD_MISSING','fixture card unavailable',{pid,number,available:(p?.cardPool||[]).filter(c=>ids.includes(c.id)).map(c=>c.baseNumber)});
  return row;
}
function sub(run,pid,number,fail,skillIntent=false){const c=card(run,pid,number,fail);submitCard(run,pid,c.id,skillIntent,null);return c.id;}
function res(run,fail){const r=resolveBasicTurn(run);if(!r)hard(fail,'SOFTLOCK','T02 fixture failed to resolve');return r;}
const packets=(r,pid)=>r.damagePackets.filter(p=>p.sourcePlayerId===pid);
const rc=(r,pid)=>r.cards.find(c=>c.playerId===pid);
const ev=(r,type)=>r.events.filter(e=>e.type===type);
function snap(id,run,result=null,extra={}){
  return {id,phase:run.phase,hp:Object.fromEntries(run.players.map(p=>[p.playerId,p.hp])),resources:Object.fromEntries(run.players.map(p=>[p.playerId,{combo:Number(p.publicResources.combo)||0,devour:Number(p.publicResources.devour)||0,transform:Boolean(p.publicResources.transformationActive),fullBurstReady:p.publicResources.fullBurstReady??null}])),cardPools:Object.fromEntries(run.players.map(p=>[p.playerId,p.cardPool.map(c=>({id:c.id,baseNumber:c.baseNumber,source:c.source}))])),private:Object.fromEntries(run.players.map(p=>{const q=run.combat?.privateByPlayer?.[p.playerId];return [p.playerId,q?{cycleIndex:q.cycleIndex,remaining:[...(q.remainingCardIds||[])],spent:[...(q.spentCardIds||[])],finisherUsedCycle:q.finisherUsedCycle??null}:null]})),result:result?{turn:result.turn,totalDamage:result.totalDamage,cards:structuredClone(result.cards),packets:structuredClone(result.damagePackets),events:structuredClone(result.events),phaseTrace:[...result.phaseTrace]}:null,...extra};
}
function forceDemonTransform(run){
  const p=run.players[1],priv=run.combat.privateByPlayer.p1;
  priv.demonNormalCardPool=structuredClone(p.cardPool);priv.demonNormalRemaining=[...priv.remainingCardIds];priv.demonNormalSpent=[...priv.spentCardIds];priv.demonNormalCycleIndex=priv.cycleIndex;
  p.cardPool=[2,4,5,6].map((baseNumber,i)=>({id:`p1:demon:${run.combat.id}:fixture:${i+1}`,baseNumber,source:'DEMON_TRANSFORM',tags:['TEMPORARY','TRANSFORMED']}));
  priv.remainingCardIds=p.cardPool.map(c=>c.id);priv.spentCardIds=[];p.publicResources.devour=6;p.publicResources.transformationActive=true;p.publicResources.transformationPending=false;
}
function submitUniqueBase(run,fail,{p0=1,p1=2,p2=3,p3=4,skills={}}={}){
  sub(run,'p0',p0,fail,Boolean(skills.p0));sub(run,'p1',p1,fail,Boolean(skills.p1));sub(run,'p2',p2,fail,Boolean(skills.p2));sub(run,'p3',p3,fail,Boolean(skills.p3));return res(run,fail);
}

export function runT02Fixtures(seed,fail){
  const rows=[];
  {
    const run=makeRun(seed,'F1');const pool=run.players[0].cardPool.map(c=>c.baseNumber);
    if(JSON.stringify(pool)!=='[1,2,2,3]'||run.combat.privateByPlayer.p0.remainingCardIds.length!==4)hard(fail,'GUNNER_MAGAZINE_MISMATCH','expanded magazine is not canonical 1/2/2/3',{pool});
    rows.push(snap('F1_GUNNER_EXPANDED_MAGAZINE',run));
  }
  {
    const run=makeRun(seed,'F2'),r=submitUniqueBase(run,fail,{skills:{p0:true}}),ps=packets(r,'p0');
    if(ps.length!==4||ps.filter(p=>p.followUp).length!==3||new Set(ps.map(p=>p.sourceCardId)).size!==4)hard(fail,'FULL_BURST_FOLLOW_UP_MISMATCH','Full Burst did not use all four physical cards exactly once',{ps});
    rows.push(snap('F2_FULL_BURST_ALL_FOLLOWUPS',run,r));
  }
  {
    const run=makeRun(seed,'F3'),r=submitUniqueBase(run,fail,{skills:{p0:true}}),ps=packets(r,'p0');
    if(ps.some(p=>p.followUpDepth>1)||ps.some(p=>String(p.sourceCardId).includes(':base:5'))||run.combat.privateByPlayer.p0.cycleIndex!==2)hard(fail,'FULL_BURST_RECURSIVE_RESET','new cycle entered same Full Burst chain',{ps,priv:run.combat.privateByPlayer.p0});
    rows.push(snap('F3_FULL_BURST_NO_RECURSIVE_RESET',run,r));
  }
  {
    const run=makeRun(seed,'F4');sub(run,'p0',1,fail,true);sub(run,'p1',1,fail);sub(run,'p2',3,fail);sub(run,'p3',4,fail);const r=res(run,fail);
    if(packets(r,'p0').length!==0||rc(r,'p0').fullBurstOutcome!=='FAIL_COLLISION'||run.players[0].hp!==2||run.combat.privateByPlayer.p0.remainingCardIds.length!==3)hard(fail,'FULL_BURST_FAILURE_MISMATCH','Full Burst failure penalty/follow-up diverged',{r:snap('x',run,r)});
    rows.push(snap('F4_FULL_BURST_FAILURE',run,r));
  }
  {
    const run=makeRun(seed,'F5'),r=submitUniqueBase(run,fail);
    if(Number(run.players[1].publicResources.devour)!==1||ev(r,'DEVOUR_GAINED').filter(e=>e.playerId==='p1').length!==1)hard(fail,'DEVOUR_GAIN_MISMATCH','valid Demon attack did not gain Devour +1',{events:r.events});
    rows.push(snap('F5_DEMON_DEVOUR_GAIN',run,r));
  }
  {
    const aug=[['aug-241'],[],['aug-291'],['aug-121']],run=makeRun(seed,'F6',{augments:aug,monsterDef:{...DUMMY,baseHp:1}});
    const r=submitUniqueBase(run,fail,{p0:1,p1:4,p2:3,p3:1}),afterKill=Number(run.players[1].publicResources.devour)||0;
    run.phase='COMBAT';run.combat=newCombatState(run.players,999,'NORMAL_COMBAT',DUMMY);run.combat.id='stress-combat:'+seed+':F6-next';beginTurn(run);
    if(afterKill!==5||Number(run.players[1].publicResources.devour)!==5)hard(fail,'DEVOUR_PERSISTENCE_MISMATCH','base Demon Devour did not persist or highest-only kill total is wrong',{afterKill,afterNext:run.players[1].publicResources.devour,events:r.events});
    rows.push(snap('F6_DEVOUR_PERSISTENCE',run,null,{afterKill}));
  }
  {
    const run=makeRun(seed,'F7');run.players[1].publicResources.devour=5;const r=submitUniqueBase(run,fail);
    if(!run.players[1].publicResources.transformationActive||JSON.stringify(run.players[1].cardPool.map(c=>c.baseNumber))!=='[2,4,5,6]'||ev(r,'DEMON_TRANSFORMED').length!==1)hard(fail,'DEMON_TRANSFORM_THRESHOLD','Devour 6 did not enter one transformation',{events:r.events,pool:run.players[1].cardPool});
    rows.push(snap('F7_TRANSFORMATION_THRESHOLD',run,r));
  }
  {
    const run=makeRun(seed,'F8');run.players[1].publicResources.devour=5;const first=submitUniqueBase(run,fail);
    const second=submitUniqueBase(run,fail,{p0:2,p1:6,p2:1,p3:4});
    const transforms=[...ev(first,'DEMON_TRANSFORMED'),...ev(second,'DEMON_TRANSFORMED')];
    if(transforms.length!==1)hard(fail,'DUPLICATE_TRANSFORMATION','same threshold caused duplicate transformation',{transforms});
    rows.push(snap('F8_NO_DUPLICATE_TRANSFORMATION',run,second,{transformCount:transforms.length}));
  }
  {
    const run=makeRun(seed,'F9');forceDemonTransform(run);const r=submitUniqueBase(run,fail,{p0:1,p1:6,p2:3,p3:4}),ps=packets(r,'p1');
    if(ps.length!==1||ps[0].baseNumber!==6||!String(ps[0].sourceCardId).includes(':demon:')||run.combat.privateByPlayer.p1.remainingCardIds.length!==3)hard(fail,'TRANSFORMED_ATTACK_MISMATCH','transformed attack/lifecycle diverged',{ps,priv:run.combat.privateByPlayer.p1});
    rows.push(snap('F9_TRANSFORMED_ATTACK_BURST',run,r));
  }
  {
    const run=makeRun(seed,'F10');run.players[2].publicResources.lastSubmittedNumber=1;run.players[2].publicResources.combo=0;const r=submitUniqueBase(run,fail,{p0:1,p1:3,p2:2,p3:4});
    if(run.players[2].publicResources.combo!==1||rc(r,'p2').martialComboBonus!==1||packets(r,'p2')[0]?.amount!==3)hard(fail,'MARTIAL_COMBO_GAIN','Martial higher valid card did not gain/use Combo',{card:rc(r,'p2'),packet:packets(r,'p2')});
    rows.push(snap('F10_MARTIAL_COMBO_GAIN',run,r));
  }
  {
    const run=makeRun(seed,'F11');run.players[2].publicResources.combo=2;run.players[2].publicResources.lastSubmittedNumber=1;sub(run,'p0',1,fail);sub(run,'p1',3,fail);sub(run,'p2',3,fail);sub(run,'p3',4,fail);const r=res(run,fail);
    if(run.players[2].publicResources.combo!==2||rc(r,'p2').invalidReason!=='COLLISION')hard(fail,'FINISHER_COLLISION_PRESERVE','One-Hit Kill build did not preserve Combo on collision',{card:rc(r,'p2')});
    rows.push(snap('F11_MARTIAL_COLLISION_PRESERVE',run,r));
  }
  {
    const run=makeRun(seed,'F12');run.players[2].publicResources.combo=3;run.players[2].publicResources.lastSubmittedNumber=2;const r=submitUniqueBase(run,fail,{p0:1,p1:3,p2:5,p3:4,skills:{p2:true}});
    if(run.players[2].publicResources.combo!==0||rc(r,'p2').finisherComboConsumed!==3||rc(r,'p2').finisherBonusDamage!==6||ev(r,'ONE_HIT_KILL_CONSUMED').length!==1)hard(fail,'ONE_HIT_KILL_CONSUME','finisher did not consume Combo once for +2 each',{card:rc(r,'p2'),events:r.events});
    rows.push(snap('F12_ONE_HIT_KILL_CONSUME',run,r));
  }
  {
    const run=makeRun(seed,'F13');run.players[2].publicResources.combo=3;sub(run,'p0',1,fail);sub(run,'p1',2,fail);sub(run,'p2',5,fail,true);sub(run,'p3',5,fail);const r=res(run,fail);
    if(run.players[2].publicResources.combo!==3||rc(r,'p2').finisherComboConsumed!==0||rc(r,'p2').finisherOutcome!=='FAIL_COLLISION')hard(fail,'ONE_HIT_KILL_FAILURE_COST','failed finisher consumed Combo',{card:rc(r,'p2')});
    rows.push(snap('F13_FINISHER_FAILURE',run,r));
  }
  {
    const run=makeRun(seed,'F14');run.players[3].hp=3;const r=submitUniqueBase(run,fail),p=packets(r,'p3')[0];
    if(p?.amount!==7||!(p.modifierIds||[]).includes('AUG_121_BLOOD_FRENZY')||run.players[3].hp!==2)hard(fail,'BLOOD_FRENZY_HIGH_HP','Blood Frenzy actual HP-cost bonus diverged',{p,hp:run.players[3].hp});
    rows.push(snap('F14_BLOOD_FRENZY_HIGH_HP',run,r));
  }
  {
    const run=makeRun(seed,'F15');run.players[3].hp=1;const r=submitUniqueBase(run,fail),p=packets(r,'p3')[0];
    if(p?.amount!==5||(p.modifierIds||[]).includes('AUG_121_BLOOD_FRENZY')||run.players[3].hp!==1)hard(fail,'BLOOD_FRENZY_HP1','HP1 incorrectly received cost-linked Blood Frenzy bonus',{p});
    rows.push(snap('F15_BLOOD_FRENZY_HP1',run,r));
  }
  {
    const run=makeRun(seed,'F16');run.players[3].hp=2;const r=submitUniqueBase(run,fail);
    if(run.players[3].hp!==1||run.players[3].status==='DOWNED')hard(fail,'BERSERKER_SELF_COST_FLOOR','Berserker burst self-cost crossed HP floor',{hp:run.players[3].hp,status:run.players[3].status});
    rows.push(snap('F16_BERSERKER_SELF_COST_FLOOR',run,r));
  }
  {
    const run=makeRun(seed,'F17');run.players[2].publicResources.combo=3;const r=submitUniqueBase(run,fail,{p0:1,p1:2,p2:5,p3:4,skills:{p0:true,p2:true}});
    const chains=new Set(r.damagePackets.map(p=>p.burstChainId));
    if(rc(r,'p0').fullBurstOutcome!=='SUCCESS'||rc(r,'p2').finisherOutcome!=='SUCCESS'||chains.size<4)hard(fail,'MIXED_BURST_IDENTITY','Gunner+Martial burst identities collapsed',{chains:[...chains]});
    rows.push(snap('F17_MIXED_PERSONAL_BURST',run,r));
  }
  {
    const run=makeRun(seed,'F18');forceDemonTransform(run);run.players[2].publicResources.combo=3;run.players[3].hp=3;
    const r=submitUniqueBase(run,fail,{p0:1,p1:6,p2:5,p3:4,skills:{p0:true,p2:true}});
    const effects=[
      rc(r,'p0').fullBurstOutcome==='SUCCESS',
      packets(r,'p1').some(p=>String(p.sourceCardId).includes(':demon:')),
      rc(r,'p2').finisherOutcome==='SUCCESS',
      packets(r,'p3').some(p=>(p.modifierIds||[]).includes('AUG_121_BLOOD_FRENZY'))
    ];
    if(effects.some(x=>!x))hard(fail,'FULL_PARTY_BURST_MISSING','not all four Tier-I burst effects fired',{effects});
    rows.push(snap('F18_FULL_PARTY_BURST',run,r,{partyTurnDamage:r.totalDamage}));
  }
  {
    const run=makeRun(seed,'F19',{monsterDef:THRESHOLD_BOSS});forceDemonTransform(run);run.players[2].publicResources.combo=3;
    const r=submitUniqueBase(run,fail,{p0:1,p1:6,p2:5,p3:4,skills:{p0:true,p2:true}});
    const crossed=[...new Set(r.damagePackets.flatMap(p=>p.bossThresholdsCrossed||[]))];
    if(crossed.length<2)hard(fail,'BOSS_THRESHOLD_TELEMETRY','synthetic threshold fixture did not cross 2 markers',{crossed,totalDamage:r.totalDamage});
    rows.push(snap('F19_BOSS_MULTI_THRESHOLD',run,r,{thresholdsCrossed:crossed,telemetryFixtureOnly:true}));
  }
  {
    const run=makeRun(seed,'F20'),r=submitUniqueBase(run,fail,{skills:{p0:true}});
    if(r.damagePackets.some(p=>p.followUpDepth>1)||r.damagePackets.filter(p=>p.sourcePlayerId==='p0'&&p.followUp).some(p=>r.damagePackets.some(q=>q.parentDamageEventId===p.damageEventId)))hard(fail,'RECURSIVE_FOLLOW_UP','Full Burst follow-up recursively generated another attack',{packets:r.damagePackets});
    rows.push(snap('F20_NO_FOLLOWUP_RECURSION',run,r,{recursiveFollowUpCount:0}));
  }
  {
    const run=makeRun(seed,'F21');run.players[2].publicResources.combo=3;const r=submitUniqueBase(run,fail,{p0:1,p1:2,p2:5,p3:4,skills:{p2:true}});
    for(const p of r.damagePackets)if(new Set(p.modifierIds||[]).size!==(p.modifierIds||[]).length)hard(fail,'DUPLICATE_DAMAGE_MODIFIER','same modifier applied twice',{p});
    rows.push(snap('F21_NO_DUPLICATE_MODIFIER',run,r,{duplicateModifierCount:0}));
  }
  {
    const baseAug=[['aug-241'],[],['aug-291'],['aug-121']],base=makeRun(seed,'F22-base',{augments:baseAug,monsterDef:{...DUMMY,baseHp:1}});
    base.players[3].hp=1;const br=submitUniqueBase(base,fail,{p0:1,p1:4,p2:3,p3:1}),baseDevour=Number(base.players[1].publicResources.devour)||0;
    const released=makeRun(seed,'F22-released',{monsterDef:{...DUMMY,baseHp:1}});released.players[1].publicResources.devour=5;released.players[2].publicResources.combo=2;forceDemonTransform(released);
    // restore a normal valid kill state while retaining transformation snapshot
    const rr=submitUniqueBase(released,fail,{p0:1,p1:6,p2:3,p3:4});
    if(baseDevour!==5||Number(released.players[1].publicResources.devour)!==0||Number(released.players[2].publicResources.combo)!==0||released.players[1].publicResources.transformationActive)hard(fail,'BURST_RESOURCE_SCOPE','RUN Devour or combat resources reset incorrectly',{baseDevour,released:snap('x',released,rr)});
    rows.push(snap('F22_RUN_VS_COMBAT_RESOURCE',released,rr,{baseDevourPersisted:baseDevour}));
  }
  return rows;
}

function summarize(turns,runs){
  const all=turns||[],burst=all.filter(t=>t.isPersonalBurstTurn),non=all.filter(t=>!t.isPersonalBurstTurn);
  const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
  let maxConsecutive=0,current=0;for(const t of all){if(t.isPersonalBurstTurn){current++;maxConsecutive=Math.max(maxConsecutive,current);}else current=0;}
  const bossMaxHp=Math.max(0,...runs.flatMap(r=>(r.burstTurns||[]).map(t=>Number(t.bossMaxHp)||0)));
  const effects=kind=>all.flatMap(t=>(t.activeBurstEffects||[]).filter(e=>e.effect===kind).map(e=>({turn:t,playerId:e.playerId})));
  const effectDamage=kind=>effects(kind).reduce((n,x)=>n+(Number(x.turn.damageByPlayer?.[x.playerId])||0),0);
  const fullBursts=effects('FULL_BURST'),demonBursts=effects('DEMON_TRANSFORM'),finishers=effects('ONE_HIT_KILL'),bloodBursts=effects('BLOOD_FRENZY');
  const fullBurstConsumedPhysicalCards=fullBursts.reduce((n,x)=>n+(x.turn.packets||[]).filter(p=>p.sourcePlayerId===x.playerId).length,0);
  const transformationCount=all.reduce((n,t)=>n+(Number(t.transformationCount)||0),0);
  const comboConsumed=all.reduce((n,t)=>n+(Number(t.comboConsumed)||0),0);
  const berserkerHpCost=all.reduce((n,t)=>n+(Number(t.berserkerHpCost)||0),0);
  const fullBurstDamage=effectDamage('FULL_BURST'),demonTransformedDamage=effectDamage('DEMON_TRANSFORM'),oneHitKillDamage=effectDamage('ONE_HIT_KILL'),bloodFrenzyAttackDamage=effectDamage('BLOOD_FRENZY');
  const devourTransformCost=transformationCount*6;
  return {
    maxSingleCardDamage:Math.max(0,...all.map(t=>t.maxSingleCardDamage||0)),
    maxSinglePlayerTurnDamage:Math.max(0,...all.map(t=>t.maxSinglePlayerTurnDamage||0)),
    maxPartyTurnDamage:Math.max(0,...all.map(t=>t.totalDamage||0)),
    averageBurstTurnDamage:avg(burst.map(t=>t.totalDamage||0)),
    averageNonBurstTurnDamage:avg(non.map(t=>t.totalDamage||0)),
    burstNonBurstRatio:avg(non.map(t=>t.totalDamage||0))?avg(burst.map(t=>t.totalDamage||0))/avg(non.map(t=>t.totalDamage||0)):null,
    maxConsecutiveBurstTurns:maxConsecutive,
    fullBurstActivationCount:fullBursts.length,
    fullBurstFollowUpCount:all.reduce((n,t)=>n+(t.fullBurstFollowUpCount||0),0),
    fullBurstConsumedPhysicalCards,fullBurstDamage,
    transformationCount,
    transformedDemonTurns:demonBursts.length,demonTransformedDamage,devourTransformCost,
    oneHitKillUses:all.reduce((n,t)=>n+(t.oneHitKillUses||0),0),oneHitKillDamage,
    bloodFrenzyBonusOccurrences:all.reduce((n,t)=>n+t.packets.filter(p=>(p.modifierIds||[]).includes('AUG_121_BLOOD_FRENZY')).length,0),
    bloodFrenzyBonusDamage:all.reduce((n,t)=>n+(t.bloodFrenzyBonus||0),0),bloodFrenzyAttackDamage,
    berserkerHpCost,comboConsumed,
    devourGained:all.reduce((n,t)=>n+(t.devourGained||0),0),
    resourcesConsumed:{gunslingerPhysicalCards:fullBurstConsumedPhysicalCards,demonDevourAtTransform:devourTransformCost,martialCombo:comboConsumed,berserkerHp:berserkerHpCost},
    burstDamagePerResource:{
      gunslinger:fullBurstConsumedPhysicalCards?fullBurstDamage/fullBurstConsumedPhysicalCards:null,
      demonSwordsman:devourTransformCost?demonTransformedDamage/devourTransformCost:null,
      martialArtist:comboConsumed?oneHitKillDamage/comboConsumed:null,
      berserker:berserkerHpCost?bloodFrenzyAttackDamage/berserkerHpCost:null
    },
    multiThresholdBurstCount:all.filter(t=>t.bossThresholdsCrossed>=2).length,
    behaviorSkipMeasurable:false,bossBehaviorSkipCount:null,bossMaxHp,
    recursiveFollowUpAttempts:all.reduce((n,t)=>n+(t.recursiveFollowUpAttempts||0),0),
    duplicateDamagePacketCount:all.reduce((n,t)=>n+(t.duplicateDamagePacketCount||0),0),
    duplicateModifierCount:all.reduce((n,t)=>n+(t.duplicateModifierCount||0),0)
  };
}
function comparison(burstRuns,steadyRuns,burstMetrics){
  const combats=rs=>rs.flatMap(r=>r.combats||[]),bc=combats(burstRuns),sc=combats(steadyRuns);
  const turns=xs=>xs.reduce((n,c)=>n+(Number(c.turns)||0),0),damage=xs=>xs.reduce((n,c)=>n+(Number(c.partyDamage)||0),0);
  const burstDpt=damage(bc)/Math.max(1,turns(bc)),steadyDpt=damage(sc)/Math.max(1,turns(sc));
  const hp=rs=>rs.reduce((n,r)=>n+r.players.reduce((m,p)=>m+(Number(p.hp)||0),0),0)/Math.max(1,rs.length);
  const flame=rs=>rs.reduce((n,r)=>n+Math.max(0,4-(Number(r.finalFlame)||0)),0);
  const burstFinalHp=hp(burstRuns),steadyFinalHp=hp(steadyRuns),burstFlameSpent=flame(burstRuns),steadyFlameSpent=flame(steadyRuns);
  const dptRatio=burstDpt/Math.max(.0001,steadyDpt),survivalNotWorse=burstFinalHp>=steadyFinalHp&&burstFlameSpent<=steadyFlameSpent;
  const costSignals=(burstMetrics.fullBurstConsumedPhysicalCards||0)+(burstMetrics.devourTransformCost||0)+(burstMetrics.comboConsumed||0)+(burstMetrics.berserkerHpCost||0);
  const costLow=costSignals===0;
  return {burstDpt,steadyDpt,dptRatio,burstTurns:turns(bc),steadyTurns:turns(sc),burstFinalHp,steadyFinalHp,burstFlameSpent,steadyFlameSpent,survivalNotWorse,costSignals,costLow,burstDominates:dptRatio>=1.35&&survivalNotWorse&&costLow};
}
export function runT02Scenario(seed,{simulateCombat,fail}){
  const fixtures=runT02Fixtures(seed,fail),encounters=[['normal',F1_MONSTER_DEFINITIONS.f1_armored_boar],['elite',F1_MONSTER_DEFINITIONS.f1_echo_bat],['boss',F1_MONSTER_DEFINITIONS.f1_fallen_lord]];
  const burst=encounters.map(([id,monsterDef])=>simulateCombat({seed:seed+':'+id,caseId:'T02-compare-'+id,characterIds:T02_CHARACTER_IDS,augmentIdsByPlayer:T02_AUGMENTS,monsterDef,policy:'burst',flame:4}));
  const steady=encounters.map(([id,monsterDef])=>simulateCombat({seed:seed+':'+id,caseId:'T02-compare-'+id,characterIds:T02_CHARACTER_IDS,augmentIdsByPlayer:T02_AUGMENTS,monsterDef,policy:'steady_burst',flame:4}));
  const burstTurns=burst.flatMap(r=>r.burstTurns||[]),steadyBurstTurns=steady.flatMap(r=>r.burstTurns||[]),burstMetrics=summarize(burstTurns,burst);
  if(burstMetrics.recursiveFollowUpAttempts||burstMetrics.duplicateDamagePacketCount||burstMetrics.duplicateModifierCount)hard(fail,'BURST_IDENTITY_INVARIANT','T02 burst identity invariant failed',{burstMetrics});
  const leaks=[...burst,...steady].reduce((n,r)=>n+(Number(r.combatResourceLeakCount)||0),0);if(leaks)hard(fail,'RESOURCE_LEAK_COMBAT_END','T02 combat resources leaked',{leaks});
  return {scenarioId:'T02',seed,status:'PASS',outcome:burst.some(r=>r.outcome==='RUN_FAILED')?'RUN_FAILED':'COMPLETED',actionCount:[...burst,...steady].reduce((n,r)=>n+r.actions,0),fixtures,combats:burst.flatMap(r=>r.combats||[]),steadyCombats:steady.flatMap(r=>r.combats||[]),burstTurns,steadyBurstTurns,burstMetrics,comparison:comparison(burst,steady,burstMetrics),finalFlame:burst.at(-1)?.finalFlame??null};
}
export function t02GoldenComparable(result){
  const key=new Set(['F1_GUNNER_EXPANDED_MAGAZINE','F2_FULL_BURST_ALL_FOLLOWUPS','F4_FULL_BURST_FAILURE','F6_DEVOUR_PERSISTENCE','F7_TRANSFORMATION_THRESHOLD','F9_TRANSFORMED_ATTACK_BURST','F10_MARTIAL_COMBO_GAIN','F12_ONE_HIT_KILL_CONSUME','F13_FINISHER_FAILURE','F14_BLOOD_FRENZY_HIGH_HP','F15_BLOOD_FRENZY_HP1','F18_FULL_PARTY_BURST','F19_BOSS_MULTI_THRESHOLD','F20_NO_FOLLOWUP_RECURSION','F21_NO_DUPLICATE_MODIFIER','F22_RUN_VS_COMBAT_RESOURCE']);
  const packet=p=>p?{damageEventId:p.damageEventId,rootActionId:p.rootActionId,burstChainId:p.burstChainId,parentDamageEventId:p.parentDamageEventId,sourcePlayerId:p.sourcePlayerId,sourceCardId:p.sourceCardId,baseNumber:p.baseNumber,baseDamage:p.baseDamage,classBonus:p.classBonus,augmentBonus:p.augmentBonus,totalDamage:p.amount,followUp:p.followUp,followUpDepth:p.followUpDepth,modifierIds:p.modifierIds,bossThresholdsCrossed:p.bossThresholdsCrossed}:null;
  return {scenarioId:result.scenarioId,status:result.status,fixtures:(result.fixtures||[]).filter(f=>key.has(f.id)).map(f=>({id:f.id,phase:f.phase,hp:f.hp,resources:f.resources,cardNumbers:Object.fromEntries(Object.entries(f.cardPools||{}).map(([pid,cards])=>[pid,cards.map(c=>c.baseNumber)])),cycles:Object.fromEntries(Object.entries(f.private||{}).map(([pid,x])=>[pid,x?.cycleIndex??null])),totalDamage:f.result?.totalDamage??null,cards:(f.result?.cards||[]).map(c=>({playerId:c.playerId,finalNumber:c.finalNumber,valid:c.valid,invalidReason:c.invalidReason||null,fullBurstOutcome:c.fullBurstOutcome||null,finisherOutcome:c.finisherOutcome||null,finisherComboConsumed:c.finisherComboConsumed??null,finisherBonusDamage:c.finisherBonusDamage??null,martialComboBonus:c.martialComboBonus??null,bloodFrenzyBonusDamage:c.bloodFrenzyBonusDamage??null})),packets:(f.result?.packets||[]).map(packet),events:(f.result?.events||[]).filter(e=>['DEVOUR_GAINED','DEVOUR_KILL_AWARD','DEMON_TRANSFORMED','ONE_HIT_KILL_CONSUMED','ONE_HIT_KILL_FAILED','BERSERKER_ATTACK_HP_COST'].includes(e.type)).map(e=>({type:e.type,playerId:e.playerId,amount:e.amount??null,before:e.before??null,after:e.after??null,totalAward:e.totalAward??null,topDamage:e.topDamage??null,comboConsumed:e.comboConsumed??null,bonusDamage:e.bonusDamage??null,cardNumbers:e.cardNumbers??null})),afterKill:f.afterKill??null,transformCount:f.transformCount??null,partyTurnDamage:f.partyTurnDamage??null,thresholdsCrossed:f.thresholdsCrossed??null,recursiveFollowUpCount:f.recursiveFollowUpCount??null,duplicateModifierCount:f.duplicateModifierCount??null,baseDevourPersisted:f.baseDevourPersisted??null}))};
}
