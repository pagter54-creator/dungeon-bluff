import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import dgram from 'node:dgram';
let networkAttempts=0;
const deny=()=>{networkAttempts++;throw new Error('SIMULATION_NETWORK_FORBIDDEN');};
globalThis.fetch=deny;globalThis.WebSocket=class{constructor(){deny();}};globalThis.XMLHttpRequest=class{constructor(){deny();}};
http.request=http.get=https.request=https.get=net.connect=net.createConnection=tls.connect=dgram.createSocket=deny;
const root=pathToFileURL(path.resolve(process.env.PVE_SIM_RUNTIME||fileURLToPath(new URL('../',import.meta.url)))+path.sep);
const artifactRoot=pathToFileURL(path.resolve(process.env.PVE_SIM_OUTPUT||process.cwd())+path.sep);await fs.mkdir(artifactRoot,{recursive:true});
const mod=name=>import(new URL('supabase/functions/game-api/pve/'+name+'.js',root));
const {setGamblerDrawPreference}=await mod('gambler');
const {restoreCardCycle}=await mod('card-cycle');
const [{newPlayerRunState,newCombatState},{PVE_CHARACTER_DEFS,isCardSelectableForCharacter,validateCharacterSkillIntent,activateImmediateCharacterSkill,selfModifyCard},{beginTurn,submitCard,resolveBasicTurn},{AUGMENT_DEFINITIONS,AUGMENT_BY_ID},{beginAugmentChoices,chooseAugment:chooseAugmentBase},{installRelicCatalog},rooms,projection,f1,f2,f3]=await Promise.all(['model','characters','combat','augment-catalog','augments','relics','rooms','projection','content-f1','content-f2','content-f3'].map(mod));
import {captureResolvedTurn,snapshotAdaptiveRequirement,flameTransition} from './pve-rebalance-measurement.mjs';
const {selectMoonPatternCandidate}=await mod('moon-pattern-ai');
const {getPatternContributors,patternRequirement}=await mod('adaptive-pattern');
const ARM=process.env.PVE_ARM||'BOTH';
const AI_ENABLED=['AI_ONLY','BOTH'].includes(ARM),NEW_MAX=['MOON_ONLY','BOTH'].includes(ARM);
const aiLog=[],migrationLog=[],f3Entries=[],f3PatternTurns=[],oracleCounts=new Map();
const reworkLog=[],probes=new Map(),auditTurns=[],bossSnapshots=[],bossSamples=[];let oracleActive=false,selectionSnapshot=null;
const observed=[],flameLog=[],growthLog=[],floorLog=[],actionLog=[],poolLog=[];
globalThis.__balanceAction=(run,intent)=>!oracleActive&&actionLog.push({runId:run.id,combatId:run.combat.id,turn:run.combat.turn,monsterId:run.combat.monster.id,type:intent.type,amount:intent.payload?.amount||0,addedCharge:Boolean(intent.cadenceTelegraph),echoStack:run.combat.monster.behaviorState?.stacks?.echo??null});
globalThis.__balanceAdaptive=snapshotAdaptiveRequirement;
globalThis.__balanceObserve=(run,result,submissions,adaptive)=>!oracleActive&&observed.push(captureResolvedTurn(result,submissions,run.combat.monster.intent,adaptive));
globalThis.__balanceFlame=(run,before,after)=>!oracleActive&&flameLog.push({runId:run.id,seed:run.seed,floor:run.floor,depth:run.depth,...flameTransition(before,after)});
globalThis.__reworkProbe=(run,cards,after=false)=>{
 if(oracleActive)return;
 const m=run.combat.monster,bs=m.behaviorState,key=run.combat.id+':'+run.combat.turn;
 if(m.mechanic?.type?.startsWith('F3_')){if(!after)probes.set(key,{combatId:run.combat.id,monsterId:m.id,turn:run.combat.turn,mechanic:m.mechanic.type,before:structuredClone(bs),requirements:Object.fromEntries(['requiredSum','requiredDistinct','requiredHits'].filter(k=>m.mechanic[k]!=null).map(k=>[k,patternRequirement(run,k)])),contributors:getPatternContributors(run).length});else{const row=probes.get(key);row.after=structuredClone(bs);}return;}
 if(!['PARITY_BELL','F2_CORRUPTION','F2_MOON'].includes(m.mechanic?.type))return;
 if(!after)probes.set(key,{combatId:run.combat.id,monsterId:m.id,turn:run.combat.turn,phase:bs.phase,threshold:bs.threshold,lastNumbers:structuredClone(bs.lastNumberByPlayer||{}),corruptionBefore:structuredClone(bs.corruptionByPlayer||{})});
 else {const q=probes.get(key);q.corruptionAfter=structuredClone(bs.corruptionByPlayer||{});q.pendingHits=[...(bs.pendingHits||[])];}
};
function chooseAugment(run,pid,id){const p=run.players.find(p=>p.playerId===pid),tiers=new Set(p.persistentCharacterState.augmentTiers||[]);const out=chooseAugmentBase(run,pid,id);for(const tier of p.persistentCharacterState.augmentTiers||[])if(!tiers.has(tier))growthLog.push({runId:run.id,seed:run.seed,playerId:pid,tier,floor:run.floor,depth:run.depth,position:([0,0,10,21][run.floor]||0)+run.depth});return out;}
const classes=Object.keys(PVE_CHARACTER_DEFS),monsters=[...Object.values(f1.F1_MONSTER_DEFINITIONS),...Object.values(f2.F2_MONSTER_DEFINITIONS),...Object.values(f3.F3_MONSTER_DEFINITIONS)];
const relics=f1.F1_RELIC_DEFINITIONS;
const profiles=['RANDOM','COLLISION_AVOID','GREEDY_DAMAGE','SAFE','RESOURCE_AWARE'];
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
let randomState=521050;
const rand=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
const pick=a=>a[Math.floor(rand()*a.length)];
const draws=new Map(),buildCatalog=new Map(),parties=[],partyHashes=new Set();let duplicates=0;
const least=items=>pick(items.filter(x=>(draws.get(x.id)||0)===Math.min(...items.map(y=>draws.get(y.id)||0))));
function makeBase(character,seat){return newPlayerRunState({id:'p'+seat,seat_index:seat,character_id:character,member_type:'human'});}
function runShell(seed,players,floor=1){const run={id:'sim:'+seed,roomId:'IN_MEMORY_ONLY',seed,rngCounter:0,version:0,phase:'ROOM_RESULT',floor,depth:1,flame:4,maxFlame:5,players,usedMonsterIds:[],chosenBossIds:{},map:{nodes:[],edges:{}},currentRoomNodeId:'snapshot',createdAt:'simulation',updatedAt:'simulation'};installRelicCatalog(run,relics);return run;}
function newBuild(character,stage,seat,baseline=false){
 const p=makeBase(character,seat),run=runShell('build:'+randomState,[p]);
 const tiers=baseline?0:({EARLY:1,MID:2,LATE:4}[stage]);
 p.growthExp=tiers?[50,150,350,750][tiers-1]:0;
 if(tiers){let rounds=0,choices=0;while(beginAugmentChoices(run)){if(++rounds>8)throw new Error('SNAPSHOT_GROWTH_LOOP:'+character+':'+JSON.stringify(p.augments)+':'+run.phase);while(run.phase==='AUGMENT_CHOICE'){if(++choices>8)throw new Error('SNAPSHOT_CHOICE_LOOP:'+character);const offer=run.augmentChoice.offersByPlayer[p.playerId];const chosen=least(offer.map(id=>AUGMENT_BY_ID[id]));chooseAugment(run,p.playerId,chosen.id);draws.set(chosen.id,(draws.get(chosen.id)||0)+1);}}}
 const relicCount=baseline?0:stage==='EARLY'?Math.floor(rand()*2):stage==='MID'?Math.floor(rand()*3):Math.floor(rand()*4);
 // Legal shop acquisition paths, with finite stage budget representing earlier earned Gold.
 for(let i=0;i<relicCount;i++){run.currentRoomNodeId='snapshot-shop-'+i;rooms.enterShopRoom(run);const options=run.roomState.relicStock.filter(x=>!p.relics.includes(x.relicId));if(options.length){const item=pick(options);p.runGold+=item.price;rooms.buyShopRelic(run,p.playerId,item.id);}}
 const engraves=baseline?0:stage==='EARLY'?0:stage==='MID'?Math.floor(rand()*2):Math.floor(rand()*3);
 for(let i=0;i<engraves;i++){rooms.enterRestRoom(run);rooms.applyRestChoice(run,p.playerId,'ENGRAVE',pick(p.cardPool).baseNumber);}
 if(!baseline&&p.characterId!=='gambler'&&stage!=='EARLY'&&rand()<.5){run.currentRoomNodeId='snapshot-card';rooms.enterShopRoom(run);const item=pick(run.roomState.cardStock);p.runGold+=item.price;rooms.reserveShopCard(run,p.playerId,item.id,1000);rooms.confirmShopCard(run,p.playerId,item.id,pick(p.cardPool.filter(c=>c.slotRole!=='PROPHECY_SLOT'&&!(p.characterId==='prophet'&&c.id===`${p.playerId}:base:1`))).id,1001);}
 const canonical={characterId:character,stage,augments:[...p.augments].sort(),relics:[...p.relics].sort(),engravings:p.engravings,cards:p.cardPool.map(c=>c.baseNumber).sort((a,b)=>a-b)};
 const id=hash(canonical).slice(0,20),family=character+'/'+(p.augmentBuild||'BASELINE')+'/'+stage;
 buildCatalog.set(id,{id,family,...canonical,baseline,player:structuredClone(p)});
 return id;
}
function generate(n){let attempts=0,repeatAttempts=0;while(parties.length<n){if(++attempts>n*30+100)throw new Error('PARTY_RESAMPLING_LIMIT');const index=parties.length,stage=['EARLY','MID','LATE'][index%3],repeatClass=classes[(index%150+Math.floor(index/150))%classes.length],composition=index%150<13&&repeatAttempts<10?Array(4).fill(repeatClass):Array.from({length:4},()=>pick(classes)),ids=composition.map((character,seat)=>newBuild(character,stage,seat));const id=hash(ids).slice(0,20);if(partyHashes.has(id)){duplicates++;repeatAttempts++;continue;}repeatAttempts=0;partyHashes.add(id);parties.push({id,ids,stage,profiles:ids.map((_,s)=>profiles[(index+s)%profiles.length])});if(parties.length%500===0)console.log(JSON.stringify({generatedParties:parties.length,duplicates}));}}
const num=x=>Number(x)||0;
function emptyPlayer(p,build,profile){return {playerId:p.playerId,buildId:build.id,family:build.family,classId:p.characterId,stage:build.stage,profile,augmentIds:build.augments.join(','),relicIds:build.relics.join(','),engravings:JSON.stringify(build.engravings),cardPool:build.cards.join(','),turns:0,cardsUsed:0,valid:0,invalid:0,collisions:0,damage:0,primaryDamage:0,followupDamage:0,attributedAugmentBonus:0,attributedClassBonus:0,engravingDamage:'NOT_SEPARATELY_ATTRIBUTABLE',damageTaken:0,prevented:0,healingReceived:0,selfHealing:0,allyHealing:0,healingUnattributed:0,protectionContribution:0,downs:0,revives:0,skillUses:0,immediateActivations:0,submittedActivations:0,skillSuccess:0,skillFail:0,skillDamage:0,maxTurnDamage:0,killingBlows:0,killParticipation:0,topDamageKills:0,exp:0,gold:0};}
function decision(run,p,profile,seed){
 const view=projection.projectRun(run,p.playerId),owner=view.players.find(x=>x.playerId===p.playerId);
 const allOwnerCards=(owner.cardPool||[]).filter(c=>(view.privateCombat.remainingCardIds||[]).includes(c.id)&&isCardSelectableForCharacter(owner,c));
 let cards=(owner.cardPool||[]).filter(c=>(view.privateCombat.remainingCardIds||[]).includes(c.id)&&isCardSelectableForCharacter(owner,c));
 if(!cards.length)throw new Error('NO_LEGAL_CARD:'+p.characterId);
 const salt=Number.parseInt(hash([seed,run.combat.turn,p.playerId]).slice(0,8),16)/4294967296;
 const chooseRandom=a=>a[Math.floor(salt*a.length)];
 // Every policy is based solely on owner projection. Public teammate remaining pools are allowed,
 // but current teammate submissions and private combat zones are never inspected.
 const risk=c=>view.players.filter(x=>x.playerId!==p.playerId&&x.status!=='DOWNED').reduce((a,x)=>{const pool=(view.combat?.publicCardCycles?.[x.playerId]?.cards||[]).filter(y=>!y.used);return a+pool.filter(y=>y.baseNumber===c.baseNumber).length/Math.max(1,pool.length);},0);
 if(profile==='RANDOM')cards=[chooseRandom(cards)];
 else cards.sort((a,b)=>profile==='COLLISION_AVOID'||profile==='SAFE'?risk(a)-risk(b)||Math.abs(a.baseNumber-(1+(run.combat.turn+p.seat)%5))-Math.abs(b.baseNumber-(1+(run.combat.turn+p.seat)%5))||b.baseNumber-a.baseNumber:b.baseNumber-a.baseNumber);
 const card=cards[0],skillData=p.characterId==='mage'&&p.augments.includes('aug-111')?{direction:card.baseNumber===6?-1:1,manaSpend:2}:null;
 let skillIntent=profile!=='RANDOM'||salt<.35;
 if(['adventurer','rogue','berserker','imp','prophet','twins'].includes(p.characterId))skillIntent=false;
 if(p.characterId==='gambler')skillIntent=p.augments.includes('aug-231')&&profile!=='SAFE'&&profile!=='RANDOM'&&(view.privateCombat.remainingCardIds||[]).length>=2;
 if(profile==='SAFE'&&p.hp===p.maxHp&&p.characterId==='warrior')skillIntent=false;
 if(profile==='RESOURCE_AWARE'&&p.characterId==='mage'&&num(p.publicResources.mana)<4)skillIntent=false;
 if(p.characterId==='vampire'&&!view.players.some(x=>x.playerId===p.publicResources.thrallPlayerId&&x.status!=='DOWNED'))skillIntent=false;
 if(skillIntent){try{validateCharacterSkillIntent(p,run.combat.privateByPlayer[p.playerId],true,card,skillData);}catch{skillIntent=false;}}
 const baseline={card,skillIntent,skillData};
 if(!AI_ENABLED||view.combat.monster.id!=='f2_moon_eating_witch')return baseline;
 // This whitelist deliberately omits privateRevelation revealed teammate cards.
 const publicState={monsterId:view.combat.monster.id,phase:view.combat.monster.presentation.phase,threshold:view.combat.monster.presentation.threshold,ownerSeat:owner.seat,teammatePools:view.players.filter(x=>x.playerId!==p.playerId&&x.status!=='DOWNED').map(x=>(view.combat.publicCardCycles[x.playerId]?.cards||[]).filter(c=>!c.used&&c.baseNumber!=null).map(c=>c.displayNumber??c.baseNumber))};
 // A legal Vampire exchange has an unknown received number. Preserve the
 // existing decision rather than pretending that printed owner number survives.
 if(owner.characterId==='vampire'&&baseline.skillIntent){aiLog.push({seed,combatId:run.combat.id,turn:run.combat.turn,playerId:p.playerId,phase:publicState.phase,changed:false,rank:null,finalEstimate:null,hiddenInfoAccessViolations:0,helped:null,hurt:null,skipReason:'PRESERVE_LEGAL_UNKNOWN_TARGET_SWAP'});return baseline;}
 const candidates=[];
 for(const ownCard of allOwnerCards){
  const plans=owner.characterId==='mage'?[{skillIntent:false,skillData:null}]:[{skillIntent:baseline.skillIntent,skillData:baseline.skillData}];
  if(owner.characterId==='mage')for(const direction of [-1,1])for(const manaSpend of [2,4,6,7])plans.push({skillIntent:true,skillData:{direction,manaSpend}});
  for(const proposed of plans){let plan=proposed;try{validateCharacterSkillIntent(owner,view.privateCombat,plan.skillIntent,ownCard,plan.skillData);}catch{if(owner.characterId==='mage')continue;plan={skillIntent:false,skillData:null};validateCharacterSkillIntent(owner,view.privateCombat,false,ownCard,null);}
   const rc={workingNumber:ownCard.baseNumber,finalNumber:ownCard.baseNumber};
   if(owner.characterId==='prophet'&&ownCard.baseNumber===0&&view.privateProphetState?.fragment)rc.workingNumber=rc.finalNumber=view.privateProphetState.fragment.value;
   const copied=structuredClone(owner);selfModifyCard(copied,rc,plan);
   // A Vampire exchange depends on a hidden teammate selection: no exact number
   // is invented. Preserve only the existing legal baseline swap choice.
   if(owner.characterId==='vampire'&&plan.skillIntent&&(!baseline.skillIntent||ownCard.id!==baseline.card.id))continue;
   const burstEstimate=owner.characterId==='gunner'&&plan.skillIntent?allOwnerCards.filter(c=>c.id!==ownCard.id).reduce((n,c)=>n+c.baseNumber+(owner.engravings?.[c.baseNumber]||0),0):0;
   candidates.push({card:ownCard,...plan,finalNumber:rc.finalNumber,expectedDamage:Math.max(0,rc.finalNumber)+(owner.engravings?.[ownCard.baseNumber]||0)+burstEstimate,collisionProtected:owner.characterId==='warrior'&&plan.skillIntent&&!owner.augments.includes('aug-041'),cost:rc.resourceSpent||Number(plan.skillIntent)});
  }
 }
 const chosen=selectMoonPatternCandidate(publicState,candidates,baseline);
 aiLog.push({seed,combatId:run.combat.id,turn:run.combat.turn,playerId:p.playerId,phase:publicState.phase,changed:chosen.card.id!==card.id||chosen.skillIntent!==skillIntent||JSON.stringify(chosen.skillData)!==JSON.stringify(skillData),rank:chosen.chosenCardRankForPattern,finalEstimate:chosen.finalNumber,hiddenInfoAccessViolations:0,helped:null,hurt:null});
 return chosen;
}
const runs=[],playersData=[],encounters=[],errors=[],turnLog=[];
function simulate(party,seed,monster,mode='RANDOMIZED',existingRun=null){
 const builds=party.ids.map(id=>buildCatalog.get(id));
 const ps=builds.map((b,i)=>{const original=structuredClone(b.player),identity=new Map(original.cardPool.map((c,k)=>[c.id,'p'+i+':physical:'+k]));identity.set(original.playerId,'p'+i);const remap=value=>typeof value==='string'?(identity.get(value)||value):Array.isArray(value)?value.map(remap):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[identity.get(k)||k,remap(v)])):value;const p=remap(original);p.playerId='p'+i;p.seat=i;p.memberType='human';return p;});
 if(existingRun)ps.splice(0,ps.length,...existingRun.players);
 const run=existingRun||runShell(seed,ps,monster.floor),flameStartIndex=flameLog.length,metrics=ps.map((p,i)=>emptyPlayer(p,builds[i],party.profiles[i]));
 const encounterFloor=run.floor;
 const expStart=ps.map(p=>p.growthExp),goldStart=ps.map(p=>p.runGold);
 // Freeze acquisition tiers at snapshot for isolated, constant-build encounter experiments.
 // The real engine still grants EXP; post-victory choices are not used for another encounter.
 const type=monster.tier==='BOSS'?'BOSS':monster.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT';
 if(!existingRun){run.phase='COMBAT';run.combat=newCombatState(ps,monster.baseHp,type,monster);run.combat.id='combat:'+hash(seed).slice(0,32);beginTurn(run);}const combat=run.combat;
 let turns=0,error='',capped=false;const pattern={ACTIVE:0,BLOCKED:0,PARTIAL:0,WAIT:0};
 try{while(run.phase==='COMBAT'){
  if(turns>=100){capped=true;break;}
  const oldHp=run.combat.monster.hp,turnDamage=ps.map(()=>0);selectionSnapshot=structuredClone(run);
  for(let i=0;i<ps.length;i++){const p=ps[i];if(p.status==='DOWNED'||run.combat.turnSubmissions[p.playerId])continue;
   if(p.characterId==='gambler'){const view=projection.projectRun(run,p.playerId),pending=view.privateCombat?.drawChoicePending;if(pending){const profile=party.profiles[i],salt=Number.parseInt(hash([seed,run.combat.turn,p.playerId,'draw-choice']).slice(0,8),16);const choice=pending==='AUG_228'?(profile==='SAFE'||profile==='COLLISION_AVOID'?'LOW':profile==='RANDOM'?(salt%2?'LOW':'HIGH'):'HIGH'):profile==='SAFE'||profile==='COLLISION_AVOID'?[1,2,3]:profile==='RANDOM'?[[1,2,3],[2,3,4],[3,4,5]][salt%3]:[3,4,5];setGamblerDrawPreference(run,p,run.combat.privateByPlayer[p.playerId],choice);}}
   if(party.profiles[i]!=='RANDOM'&&(['prophet','twins'].includes(p.characterId)||p.characterId==='demon_swordsman'&&p.augments.includes('aug-351'))){
    const ready=p.characterId==='prophet'?p.cardPool.some(c=>c.baseNumber===0)&&ps.some(other=>other.playerId!==p.playerId&&other.status!=='DOWNED')&&num(p.publicResources.revelation)>=(projection.projectRun(run,p.playerId).privateProphetState?.cost||6)&&!projection.projectRun(run,p.playerId).privateProphetState?.fragment&&!projection.projectRun(run,p.playerId).privateProphetState?.fragmentPending:p.characterId==='twins'?Boolean(p.publicResources.acrobaticsReady)&&run.combat.privateByPlayer[p.playerId].spentCardIds.length>1:num(p.publicResources.devour)>=6&&!p.publicResources.transformationActive;
    if(ready){let data=null;try{activateImmediateCharacterSkill(run,p,data);metrics[i].skillUses++;metrics[i].immediateActivations++;metrics[i].skillSuccess++;}catch(e){if(!e.code)throw e;}}
   }
   const d=decision(run,p,party.profiles[i],seed);submitCard(run,p.playerId,d.card.id,d.skillIntent,d.skillData);if(d.skillIntent){metrics[i].skillUses++;metrics[i].submittedActivations++;}
  }
  const submittedSnapshot=structuredClone(run);const oracleSnapshot=structuredClone(submittedSnapshot);oracleSnapshot.combat.turnSubmissions=structuredClone(selectionSnapshot.combat.turnSubmissions);const last=resolveBasicTurn(run);if(!last)throw new Error('RESOLUTION_STUCK');const internalResults=observed.splice(0);for(const result of internalResults){turns++;
  const probe=probes.get(combat.id+':'+result.turn);if(probe){
 const damage=result.events.filter(e=>e.type==='PLAYER_DAMAGED'),patternDamage=damage.filter(e=>e.auditPatternSource).reduce((n,e)=>n+num(e.amount),0),baseDamage=damage.filter(e=>!e.auditPatternSource).reduce((n,e)=>n+num(e.amount),0);
 const row={...probe,seed,partyId:party.id,mode,stage:party.stage,patternDamage,baseDamage,totalDamage:result.totalDamage,downs:result.events.filter(e=>e.type==='PLAYER_DOWNED').length,killed:combat.monster.hp===0,cards:result.cards.map(c=>({playerId:c.playerId,number:c.finalNumber,valid:c.valid,collision:c.collisionGroupSize>1,bellPenalty:c.parityBellPenalty||0,bellBefore:c.parityBellDamageBefore??null,floorApplied:!!c.parityBellFloorApplied,damage:result.damagePackets.filter(q=>q.sourcePlayerId===c.playerId&&!q.followUp).reduce((a,q)=>a+q.amount,0)}))};
 if(monster.id==='f1_iron_bell_keeper'){row.wrongParity=row.cards.filter(c=>c.valid&&Math.abs(c.number%2)!==(probe.phase==='ODD'?1:0));reworkLog.push(row);}
 if(monster.floor===2&&monster.tier==='BOSS'){
 row.contributors=getPatternContributors(selectionSnapshot).length;row.validNumberSum=row.cards.filter(c=>c.valid).reduce((n,c)=>n+c.number,0);row.submittedNumbers=Object.entries(submittedSnapshot.combat.turnSubmissions).map(([pid,x])=>({playerId:pid,number:submittedSnapshot.players.find(p=>p.playerId===pid).cardPool.find(c=>c.id===x.cardInstanceId)?.baseNumber}));
 if(monster.id==='f2_rottenheart_ancient')row.repeatPlayers=row.cards.map(c=>{const pl=selectionSnapshot.players.find(p=>p.playerId===c.playerId),view=projection.projectRun(selectionSnapshot,c.playerId),owner=view.players.find(p=>p.playerId===c.playerId),legal=owner.cardPool.filter(x=>view.privateCombat.remainingCardIds.includes(x.id)&&isCardSelectableForCharacter(owner,x));const last=probe.lastNumbers[c.playerId]??null;return {...c,last,repeat:c.valid&&last===c.number,forced:last!=null&&legal.length>0&&legal.every(x=>x.baseNumber===last),legalNumbers:legal.map(x=>x.baseNumber)};});
 if(monster.id==='f2_moon_eating_witch'){row.passed=probe.phase==='MIN'?row.totalDamage>=probe.threshold:(NEW_MAX?row.validNumberSum:row.totalDamage)<=probe.threshold;row.oracle=bossOnly?moonOracle(oracleSnapshot,probe.phase,probe.threshold):null;row.collisionFailure=!row.passed&&row.cards.some(c=>c.collision);}
 auditTurns.push(row);
 }
 if(monster.floor===3){
 const valid=row.cards.filter(c=>c.valid),type=probe.mechanic;
 row.quantity=type==='F3_TAX'?valid.reduce((n,c)=>n+c.number,0):type==='F3_CHOIR'?new Set(valid.map(c=>c.number)).size:type==='F3_EXECUTION'?(probe.before.progress||0)+valid.length:null;
 row.required=probe.requirements.requiredSum??probe.requirements.requiredDistinct??probe.requirements.requiredHits??null;
 row.opportunity=row.required!=null&&!row.killed&&(type!=='F3_EXECUTION'||probe.before.countdown===1);
 row.passed=row.opportunity?row.quantity>=row.required:null;
 if(row.opportunity&&!row.passed&&f3Target){const key=monster.id,selected=parseInt(hash([seed,result.turn]).slice(0,8),16)%20===0;if(selected&&(oracleCounts.get(key)||0)<40){oracleCounts.set(key,(oracleCounts.get(key)||0)+1);row.oracle=f3Oracle(oracleSnapshot,type,row.required-(type==='F3_EXECUTION'?(probe.before.progress||0):0));}else row.oracle={classification:'NOT_SAMPLED',scope:'DETERMINISTIC_HASH_SAMPLE_1_IN_20_CAP_40_PER_SPECIES'};}
 f3PatternTurns.push({...row,events:result.events.filter(e=>!['AUGMENT_TRIGGERED'].includes(e.type))});
 }probes.delete(combat.id+':'+result.turn);}
  for(const c of result.cards||[]){const m=metrics[Number(c.playerId.slice(1))];m.turns++;m.cardsUsed+=1+(c.followUpCardIds||[]).length;m.valid+=c.valid?1:0;m.invalid+=c.valid?0:1;m.collisions+=c.collisionGroupSize>1?1:0;if(c.diagnosticSkillIntent){m.skillSuccess+=c.valid?1:0;m.skillFail+=c.valid?0:1;}}
  for(const q of result.damagePackets||[]){const i=Number(q.sourcePlayerId.slice(1)),m=metrics[i];m.damage+=num(q.amount);turnDamage[i]+=num(q.amount);m[q.followUp?'followupDamage':'primaryDamage']+=num(q.amount);m.attributedAugmentBonus+=num(q.augmentBonus);m.attributedClassBonus+=num(q.classBonus);if(result.cards.find(c=>c.playerId===q.sourcePlayerId)?.skillUsed)m.skillDamage+=num(q.amount);}
  for(const e of result.events||[]){const m=metrics.find(x=>x.playerId===e.playerId);if(e.type==='PLAYER_DAMAGED'&&m){m.damageTaken+=num(e.amount);m.prevented+=num(e.preventedDamage);}if(e.type==='PLAYER_DOWNED'&&m){m.downs++;m.revives+=e.rescued?1:0;}if(e.type==='PLAYER_HEALED'&&m){m.healingReceived+=num(e.amount);const actor=metrics.find(x=>x.playerId===(e.sourcePlayerId||e.ownerId));if(actor){actor[actor===m?'selfHealing':'allyHealing']+=num(e.amount);}else m.healingUnattributed+=num(e.amount);}if(e.type==='DAMAGE_REDIRECTED'){const actor=metrics.find(x=>x.playerId===e.redirectSource);if(actor)actor.protectionContribution+=num(e.damageBeforeReduction);}}
  if(result.monsterPattern)pattern[result.monsterPattern.outcome]++;turnLog.push({seed,monsterId:monster.id,floor:encounterFloor,definitionFloor:monster.floor,tier:monster.tier,turn:result.turn,damage:result.totalDamage,adaptive:result.diagnosticAdaptive,pattern:result.monsterPattern?.outcome,intent:result.diagnosticIntent?.type,addedCharge:Boolean(result.diagnosticIntent?.cadenceTelegraph),executedAction:actionLog.findLast(x=>x.combatId===combat.id&&x.turn===result.turn)?.type||null,downs:result.events.filter(e=>e.type==='PLAYER_DOWNED').length});
  for(let i=0;i<4;i++)metrics[i].maxTurnDamage=Math.max(metrics[i].maxTurnDamage,turnDamage[i]);
  if(oldHp>0&&combat.monster.hp===0){const max=Math.max(...turnDamage);for(let i=0;i<4;i++){metrics[i].killParticipation+=turnDamage[i]>0?1:0;metrics[i].topDamageKills+=turnDamage[i]===max&&max>0?1:0;}let hp=oldHp;for(const q of result.damagePackets||[]){if(hp>0&&hp-num(q.amount)<=0)metrics[Number(q.sourcePlayerId.slice(1))].killingBlows++;hp-=num(q.amount);}}
  }
  if(!ps.every(p=>Number.isFinite(p.hp)&&Number.isFinite(p.growthExp)))throw new Error('INVALID_STATE');
  run._telemetryPending=[];if(run.augmentFramework?.telemetry)run.augmentFramework.telemetry=[];
 }}catch(e){error=e.code||e.message;errors.push({seed,partyId:party.id,monsterId:monster.id,error,stack:e.stack,phase:run.phase,depth:run.depth,floor:run.floor,usedMonsterIds:[...(run.usedMonsterIds||[])],eventPlayers:run.phase==='EVENT'?run.players.map(p=>({class:p.characterId,status:p.status,resources:p.publicResources,pool:p.cardPool.map(c=>({id:c.id,baseNumber:c.baseNumber})),state:run.roomState.privateByPlayer[p.playerId]})):null});}
 const clear=combat.monster.hp===0&&run.phase!=='RUN_FAILED',total=metrics.reduce((s,m)=>s+m.damage,0);
 const runId='S'+runs.length;
 for(let i=0;i<4;i++){const m=metrics[i];Object.assign(m,{runId,mode,floor:encounterFloor,definitionFloor:monster.floor,monsterId:monster.id,tier:monster.tier,encounterTurns:turns,remainingHP:ps[i].hp,survived:ps[i].status!=='DOWNED'?1:0,clear:clear?1:0,dpt:turns?m.damage/turns:0,damageShare:total?m.damage/total:0,exp:ps[i].growthExp-expStart[i],gold:ps[i].runGold-goldStart[i],error});playersData.push(m);}
 const record={runId,seed,mode,scope:existingRun?'EXPEDITION_ENCOUNTER':'CONTROLLED_ENCOUNTER',partyId:party.id,buildIds:party.ids.join(','),stage:party.stage,profiles:party.profiles.join(','),floorReached:encounterFloor,runClear:'NOT_FULL_EXPEDITION',encounterClear:clear?1:0,runFailed:run.phase==='RUN_FAILED'?1:0,turns,encounters:1,damage:total,damageTaken:metrics.reduce((s,m)=>s+m.damageTaken,0),downs:metrics.reduce((s,m)=>s+m.downs,0),revives:metrics.reduce((s,m)=>s+m.revives,0),flameSpent:flameLog.slice(flameStartIndex).reduce((n,x)=>n+x.spent,0),finalFlame:run.flame,finalHP:ps.map(p=>p.hp).join(','),turnCap:capped?1:0,error};runs.push(record);
 encounters.push({runId,mode,monsterId:monster.id,name:monster.name,floor:encounterFloor,definitionFloor:monster.floor,tier:monster.tier,partyId:party.id,buildIds:record.buildIds,stage:party.stage,startHP:combat.monster.maxHp,endHP:combat.monster.hp,turns,clear:clear?1:0,wipe:record.runFailed,downs:record.downs,partyDamage:total,monsterDamage:record.damageTaken,dpt:turns?total/turns:0,patternAttempts:Object.values(pattern).reduce((a,b)=>a+b,0),patternActive:pattern.ACTIVE,patternBlocked:pattern.BLOCKED,patternPartial:pattern.PARTIAL,patternWait:pattern.WAIT,turnCap:record.turnCap,error});
 return record;
}
function moonOracle(snapshot,phase,threshold){
 const base=structuredClone(snapshot);
 const options=base.players.filter(p=>p.status!=='DOWNED'&&!base.combat.turnSubmissions[p.playerId]).map(p=>{const view=projection.projectRun(base,p.playerId),owner=view.players.find(x=>x.playerId===p.playerId);return {pid:p.playerId,cards:owner.cardPool.filter(c=>view.privateCombat.remainingCardIds.includes(c.id)&&isCardSelectableForCharacter(owner,c)).flatMap(c=>{const candidates=[{id:c.id,number:c.baseNumber,skill:false,data:null},{id:c.id,number:c.baseNumber,skill:true,data:null}];if(p.characterId==='mage')for(const direction of [-1,1])for(const manaSpend of [2,4,6])candidates.push({id:c.id,number:c.baseNumber,skill:true,data:{direction,manaSpend}});return candidates.filter(x=>{try{validateCharacterSkillIntent(p,base.combat.privateByPlayer[p.playerId],x.skill,c,x.data);return true;}catch{return false;}});})};});
 if(options.some(x=>!x.cards.length))return {classification:'IMPOSSIBLE_DUE_TO_CURRENT_HANDS',exists:false,checked:0,scope:'SUBMISSION_SKILLS_ONLY'};
 // Public printed numbers determine enumeration order. No RNG outcome is used
 // to select or rank a candidate. Replay only verifies its damage afterwards.
 for(const o of options)o.cards.sort((a,b)=>phase==='MIN'?b.number-a.number:a.number-b.number);
 let checked=0,min=Infinity,max=-Infinity,witness=null,rngSensitive=false;const rejectedCombinations={};
 const search=(i,choice)=>{if(witness)return;if(i<options.length){for(const c of options[i].cards){search(i+1,[...choice,{pid:options[i].pid,...c}]);if(witness)return;}return;}
  const r=structuredClone(base);oracleActive=true;globalThis.__auditPacketsOnly=true;
  try{for(const x of choice)submitCard(r,x.pid,x.id,x.skill,x.data);const out=resolveBasicTurn(r);checked++;const quantity=phase==='MAX'&&NEW_MAX?out.cards.filter(c=>c.valid).reduce((n,c)=>n+c.finalNumber,0):out.totalDamage;min=Math.min(min,quantity);max=Math.max(max,quantity);rngSensitive||=r.rngCounter!==base.rngCounter;if(phase==='MIN'?out.totalDamage>=threshold:quantity<=threshold)witness={cards:choice.map(x=>({playerId:x.pid,printed:x.number,skill:x.skill,data:x.data})),damage:out.totalDamage,validNumberSum:out.cards.filter(c=>c.valid).reduce((n,c)=>n+c.finalNumber,0),rngSensitive:r.rngCounter!==base.rngCounter};}
  catch(e){const reason=e.code||e.message;if(!['피의 명령 대상이 이번 턴 판정에 없습니다.','PAST_FRAGMENT_REQUIRES_OTHER_CARD'].includes(reason))throw e;rejectedCombinations[reason]=(rejectedCombinations[reason]||0)+1;}finally{oracleActive=false;globalThis.__auditPacketsOnly=false;}
 };search(0,[]);
 return {exists:!!witness,checked,min,max,witness,rngSensitive,rejectedCombinations,classification:witness?(witness.rngSensitive?'RNG_DEPENDENT_WITNESS':'ACHIEVABLE'):rngSensitive?'UNRESOLVED_RANDOM_EFFECT':'IMPOSSIBLE_DUE_TO_CURRENT_HANDS',scope:'SUBMISSION_SKILLS_ONLY; start-of-turn public state; existing forced auto-submissions fixed; no future hand/RNG knowledge'};
}
function f3Oracle(snapshot,type,threshold){
 const base=structuredClone(snapshot);
 const options=base.players.filter(p=>p.status!=='DOWNED'&&!base.combat.turnSubmissions[p.playerId]).map(p=>{const view=projection.projectRun(base,p.playerId),owner=view.players.find(x=>x.playerId===p.playerId);return {pid:p.playerId,cards:owner.cardPool.filter(c=>view.privateCombat.remainingCardIds.includes(c.id)&&isCardSelectableForCharacter(owner,c)).flatMap(c=>{const candidates=[{id:c.id,number:c.baseNumber,skill:false,data:null},{id:c.id,number:c.baseNumber,skill:true,data:null}];if(p.characterId==='mage')for(const direction of [-1,1])for(const manaSpend of [2,4,6])candidates.push({id:c.id,number:c.baseNumber,skill:true,data:{direction,manaSpend}});return candidates.filter(x=>{try{validateCharacterSkillIntent(p,base.combat.privateByPlayer[p.playerId],x.skill,c,x.data);return true;}catch{return false;}});})};});
 if(options.some(x=>!x.cards.length))return {classification:'IMPOSSIBLE_DUE_TO_CURRENT_HANDS',exists:false,checked:0,scope:'SUBMISSION_SKILLS_ONLY'};
 // Public printed numbers determine enumeration order. No RNG outcome is used
 // to select or rank a candidate. Replay only verifies its damage afterwards.
 for(const o of options)o.cards.sort((a,b)=>true?b.number-a.number:a.number-b.number);
 let bounded=false;let checked=0,min=Infinity,max=-Infinity,witness=null,rngSensitive=false;const rejectedCombinations={};
 const search=(i,choice)=>{if(witness||bounded)return;if(i<options.length){for(const c of options[i].cards){search(i+1,[...choice,{pid:options[i].pid,...c}]);if(witness||bounded)return;}return;}
  if(checked>=128){bounded=true;return;}const r=structuredClone(base);oracleActive=true;globalThis.__auditPacketsOnly=true;
  try{for(const x of choice)submitCard(r,x.pid,x.id,x.skill,x.data);const out=resolveBasicTurn(r);checked++;const valid=out.cards.filter(c=>c.valid),quantity=type==='F3_TAX'?valid.reduce((n,c)=>n+c.finalNumber,0):type==='F3_CHOIR'?new Set(valid.map(c=>c.finalNumber)).size:valid.length;min=Math.min(min,quantity);max=Math.max(max,quantity);rngSensitive||=r.rngCounter!==base.rngCounter;if(quantity>=threshold)witness={cards:choice.map(x=>({playerId:x.pid,printed:x.number,skill:x.skill,data:x.data})),damage:out.totalDamage,validNumberSum:out.cards.filter(c=>c.valid).reduce((n,c)=>n+c.finalNumber,0),rngSensitive:r.rngCounter!==base.rngCounter};}
  catch(e){const reason=e.code||e.message;if(!['피의 명령 대상이 이번 턴 판정에 없습니다.','PAST_FRAGMENT_REQUIRES_OTHER_CARD'].includes(reason))throw e;rejectedCombinations[reason]=(rejectedCombinations[reason]||0)+1;}finally{oracleActive=false;globalThis.__auditPacketsOnly=false;}
 };search(0,[]);
 return {exists:!!witness,checked,bounded,min,max,witness,rngSensitive,rejectedCombinations,classification:witness?(witness.rngSensitive?'RNG_DEPENDENT_WITNESS':'ACHIEVABLE'):rngSensitive?'UNRESOLVED_RANDOM_EFFECT':bounded?'SEARCH_INCOMPLETE':'IMPOSSIBLE_DUE_TO_CURRENT_HANDS',scope:'SUBMISSION_SKILLS_ONLY; start-of-turn public state; existing forced auto-submissions fixed; no future hand/RNG knowledge'};
}
const count=Number(process.argv[2]||12),seeds=Number(process.argv[3]||3),f3Only=process.argv[4]==='f3-only',f3Target=process.argv[4]==='f3-target',fullOnly=process.argv[4]==='full-only'||f3Only,targetOnly=process.argv[4]==='target-only',bossOnly=process.argv[4]==='boss-only';fsSync.writeFileSync(new URL('progress-'+count+'.json',artifactRoot),JSON.stringify({phase:'GENERATE',time:Date.now()}));generate(count);
const start=Date.now();
if(!targetOnly&&!bossOnly&&!f3Target)for(let i=0;i<parties.length;i++){const mon=monsters[(Math.floor(i/3)+(i%3)*13)%monsters.length];for(let s=0;s<seeds;s++){fsSync.writeFileSync(new URL('progress-'+count+'.json',artifactRoot),JSON.stringify({phase:'RANDOMIZED',i,s,time:Date.now()}));simulate(parties[i],'random:'+i+':'+s,mon);}if((i+1)%100===0)console.log(JSON.stringify({parties:i+1,runs:runs.length,exceptions:errors.length,elapsedSeconds:(Date.now()-start)/1000}));}
if(targetOnly){for(let i=0;i<parties.length;i++){for(const id of (process.env.PVE_NORMAL_AUDIT==='true'?monsters.filter(m=>m.floor===1&&m.tier==='NORMAL').map(m=>m.id):['f1_iron_bell_keeper']))simulate(parties[i],'matched-target:'+id+':'+i,monsters.find(m=>m.id===id),'MATCHED_TARGETED');if((i+1)%100===0)console.log(JSON.stringify({targetedParties:i+1,runs:runs.length,errors:errors.length}));}}
if(count>=1500&&!fullOnly&&!targetOnly){
 // Minimal-resource baseline, one instance of each class in each stage vs every actual monster.
 for(let st=0;st<3;st++)for(let c=0;c<classes.length;c++){const stage=['EARLY','MID','LATE'][st],ids=Array.from({length:4},(_,i)=>newBuild(classes[(c+i)%classes.length],stage,i,true)),party={id:'baseline:'+st+':'+c,ids,stage,profiles:Array(4).fill('RESOURCE_AWARE')};for(let m=0;m<monsters.length;m++)simulate(party,'baseline:'+st+':'+c+':'+m,monsters[m],'BASELINE');}
 // Independently seeded follow-up of high/low class-build families, high threats and variance.
 const groups=new Map();for(const row of playersData.filter(x=>x.mode==='RANDOMIZED'&&!x.error)){const a=groups.get(row.family)||[];a.push(row);groups.set(row.family,a);}
 const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
 const ranked=[...groups].filter(([,a])=>a.length>=30).map(([family,a])=>({family,stage:family.split('/')[2],dpt:mean(a.map(x=>x.dpt)),share:mean(a.map(x=>x.damageShare)),survival:mean(a.map(x=>x.survived)),prevent:mean(a.map(x=>x.prevented)),protect:mean(a.map(x=>x.protectionContribution)),clear:mean(a.map(x=>x.clear)),variance:mean(a.map(x=>x.dpt*x.dpt))-mean(a.map(x=>x.dpt))**2}));
 const percentile=(a,v)=>100*(a.filter(x=>x<v).length+.5*a.filter(x=>x===v).length)/a.length;
 for(const row of ranked){const peers=ranked.filter(x=>x.stage===row.stage);row.score=[['dpt',.35],['share',.1],['survival',.2],['prevent',.15],['protect',.1],['clear',.1]].reduce((sum,[key,w])=>sum+w*percentile(peers.map(x=>x[key]),row[key]),0);}ranked.sort((a,b)=>a.score-b.score);
 const k=Math.max(1,Math.ceil(ranked.length*.05)),selected=[...ranked.slice(0,k),...ranked.slice(-k),...[...ranked].sort((a,b)=>b.variance-a.variance).slice(0,5)];
 const threats=monsters.map(m=>({monster:m,score:mean(encounters.filter(x=>x.mode==='RANDOMIZED'&&x.monsterId===m.id).map(x=>x.monsterDamage+3*x.downs+10*x.wipe))})).sort((a,b)=>b.score-a.score).slice(0,10);
 const targetParties=new Set();for(const f of selected){const candidate=parties.find(p=>p.ids.some(id=>buildCatalog.get(id).family===f.family));if(!candidate)continue;targetParties.add(candidate.id);for(let s=0;s<100;s++)simulate(candidate,'target-family:'+f.family+':'+s,monsters[s%monsters.length],'TARGETED');}
 for(const {monster} of threats)for(let s=0;s<100;s++)simulate(parties[(s*31)%parties.length],'target-monster:'+monster.id+':'+s,monster,'TARGETED');
 const meanCounter=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length),classBase=Object.fromEntries(classes.map(c=>[c,meanCounter(playersData.filter(x=>x.mode==='RANDOMIZED'&&x.classId===c&&!x.error).map(x=>x.damageTaken+3*x.downs))]));
 const counters=[];for(const monster of monsters)for(const c of classes){const a=playersData.filter(x=>x.mode==='RANDOMIZED'&&x.monsterId===monster.id&&x.classId===c&&!x.error);if(a.length>=20)counters.push({monster,c,delta:meanCounter(a.map(x=>x.damageTaken+3*x.downs))-classBase[c]});}
 for(const counter of counters.sort((a,b)=>b.delta-a.delta).slice(0,5)){const candidates=parties.filter(p=>p.ids.some(id=>buildCatalog.get(id).characterId===counter.c));for(let s=0;s<100;s++)simulate(candidates[s%candidates.length],'target-counter:'+counter.monster.id+':'+counter.c+':'+s,counter.monster,'TARGETED');}
}
if(!targetOnly&&!bossOnly&&!f3Target&&(count>=1500||fullOnly)){
 const apiURL=new URL('supabase/functions/game-api/pve/api.js',root),raw=await fs.readFile(apiURL,'utf8');
 // Expose the existing private room-entry routine without changing its body or rules.
 const exposed=raw.replace(/from (['"])(\.[^'"]+)\1/g,(_,q,path)=>'from '+JSON.stringify(new URL(path,apiURL).href))+'\nexport {enterNode};\n';
 const exposedURL=new URL('api-room-entry.instrumented.mjs',artifactRoot);await fs.writeFile(exposedURL,exposed);
 const {buildInitialPveRun,enterNode}=await import(exposedURL),{resolveVote,connectedNodeIds}=await mod('map'),events=await mod('events');
 for(let n=0;n<Number(process.env.PVE_EXPEDITION_COUNT||500);n++){
  let uuidCounter=0;
  globalThis.crypto.randomUUID=()=>{const h=hash('expedition-identity:'+n+':'+uuidCounter++);return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);};
  const party={id:'expedition:'+n,ids:Array.from({length:4},(_,i)=>newBuild(classes[(n+i*3)%classes.length],'EARLY',i,true)),stage:'EARLY',profiles:n%2?Array(4).fill('COLLISION_AVOID'):['SAFE','RESOURCE_AWARE','COLLISION_AVOID','RANDOM']};
  const seed='expedition:'+n,bundle={room:{id:'LOCAL_ONLY'},members:party.ids.map((id,i)=>({id:'p'+i,user_id:'LOCAL-'+i,seat_index:i,character_id:buildCatalog.get(id).characterId,member_type:'human'}))};
  // buildInitialPveRun expects lobby class identifiers, mapped to canonical runtime IDs.
  const reverse={prophet:'seer',martial_artist:'fighter',demon_swordsman:'demonsword'};for(const m of bundle.members)m.character_id=reverse[m.character_id]||m.character_id;
  let run=buildInitialPveRun(bundle,{seed,now:0});if(f3Only){const sources=JSON.parse(await fs.readFile(process.env.PVE_F3_SNAPSHOTS,'utf8')).f3Entries,entry=sources[n%sources.length];run=structuredClone(entry.run);Object.assign(party,structuredClone(entry.party));run.id='f3-sequence:'+n;run.seed='f3-sequence:'+n;run.rngCounter=0;}floorLog.push({runId:run.id,floor:1,depth:0,meanAugments:0});let steps=0,error='',capped=false;const child=[],playerStart=playersData.length;
  try{while(!['RUN_CLEAR','RUN_FAILED','ABANDONED'].includes(run.phase)){
   if(++steps>1200){capped=true;break;}if(!floorLog.some(x=>x.runId===run.id&&x.floor===run.floor))floorLog.push({runId:run.id,seed:run.seed,floor:run.floor,depth:run.depth,meanAugments:run.players.reduce((n,p)=>n+p.augments.length,0)/4});
   if(run.phase==='MAP_VOTE'){
    if(run.floor===3&&!f3Entries.some(e=>e.seed===seed))f3Entries.push({seed,party:structuredClone(party),run:structuredClone(run)});
    const candidates=connectedNodeIds(run.map).map(id=>run.map.nodes.find(x=>x.id===id)),cost={REST:0,SHOP:1,REWARD_ROOM:2,EVENT:3,NORMAL_COMBAT:4,ELITE_COMBAT:5,BOSS:6};candidates.sort((a,b)=>cost[a.type]-cost[b.type]);const id=candidates[n%candidates.length].id;run.map.votes={'p0':id};enterNode(run,resolveVote(run,['p0'],0));if(run.monsterSelection?.roomNodeId===id)poolLog.push({runId:run.id,seed:run.seed,...run.monsterSelection});
   }else if(run.phase==='COMBAT'){
    party.stage=run.floor===1?'EARLY':run.floor===2?'MID':'LATE';party.ids=run.players.map(p=>{const canonical={characterId:p.characterId,stage:party.stage,augments:[...p.augments].sort(),relics:[...p.relics].sort(),engravings:p.engravings,cards:p.cardPool.map(c=>c.baseNumber).sort((a,b)=>a-b)},id=hash(canonical).slice(0,20);buildCatalog.set(id,{id,family:p.characterId+'/'+(p.augmentBuild||'BASELINE')+'/'+party.stage,...canonical,baseline:!p.augments.length,player:structuredClone(p)});return id;});
    if(run.floor===2&&run.combat.roomType==='BOSS')bossSnapshots.push({seed,party:structuredClone(party),run:structuredClone(run)});const monster=monsters.find(m=>m.id===run.combat.monster.id),record=simulate(party,seed+':'+run.floor+':'+run.depth,monster,'EXPEDITION',run);record.expeditionId='E'+n;child.push(record);if(record.turnCap||record.error){capped=Boolean(record.turnCap);error=record.error;break;}
   }else if(run.phase==='AUGMENT_CHOICE'){const pid=Object.keys(run.augmentChoice.offersByPlayer)[0],offer=run.augmentChoice.offersByPlayer[pid];chooseAugment(run,pid,offer[(n+steps)%offer.length]);}
   else if(run.phase==='FLOOR_CLEAR'){rooms.roomReady;const {advanceCompletedFloor}=await mod('floor-transition');advanceCompletedFloor(run);if(run.floor===3)f3Entries.push({seed,party:structuredClone(party),run:structuredClone(run)});floorLog.push({runId:run.id,floor:run.floor,depth:0,meanAugments:run.players.reduce((n,p)=>n+p.augments.length,0)/4});}
   else if(run.phase==='ROOM_RESULT'){for(const p of run.players)if(run.phase==='ROOM_RESULT')rooms.roomReady(run,p.playerId,0);}
   else if(run.phase==='REST'){for(const p of run.players)if(run.phase==='REST')rooms.applyRestChoice(run,p.playerId,p.hp<p.maxHp?'FULL_HEAL':run.flame<3?'FLAME':'ENGRAVE',p.cardPool[0]?.baseNumber||1);}
   else if(run.phase==='SHOP'){for(const p of run.players)if(run.phase==='SHOP'){const item=run.roomState.relicStock.find(x=>!x.sold&&!p.relics.includes(x.relicId)&&x.price<=p.runGold);if(item)rooms.buyShopRelic(run,p.playerId,item.id);rooms.finishShop(run,p.playerId);}}
   else if(run.phase==='EVENT'){for(const p of run.players)if(run.phase==='EVENT'&&p.status!=='DOWNED'&&!run.roomState.turnSubmissions[p.playerId]){const state=run.roomState.privateByPlayer[p.playerId];let cards=p.cardPool.filter(c=>state.remainingCardIds.includes(c.id)&&isCardSelectableForCharacter(p,c));if(!cards.length&&!state.remainingCardIds.length)cards=events.simulationAvailableCards(run,p);if(!cards.length)throw new Error('EVENT_NO_LEGAL_CARD');events.submitEventCard(run,p.playerId,cards[(n+p.seat)%cards.length].id);}}
   else if(run.phase==='REWARD_ROOM'){
    if(run.roomState.phase==='PICK'||run.roomState.pickOrder?.length){const pid=run.roomState.pickOrder[0],p=run.players.find(x=>x.playerId===pid),relic=run.roomState.relicIds.find(id=>!p.relics.includes(id));if(!relic)throw new Error('REWARD_NO_UNOWNED_CHOICE');rooms.chooseRewardRelic(run,pid,relic);}
    else {for(const p of run.players)if(run.phase==='REWARD_ROOM'&&p.status!=='DOWNED'&&!run.roomState.turnSubmissions[p.playerId]){const state=run.roomState.privateByPlayer[p.playerId],cards=p.cardPool.filter(c=>state.remainingCardIds.includes(c.id)&&isCardSelectableForCharacter(p,c));if(!cards.length)throw new Error('REWARD_NO_LEGAL_CARD');rooms.submitRewardCard(run,p.playerId,cards[(n+p.seat)%cards.length].id);}if(run.phase==='REWARD_ROOM')rooms.resolveRewardAttempt(run);}
   }else throw new Error('UNHANDLED_PHASE:'+run.phase);
  }}catch(e){error=e.code||e.message;errors.push({seed,partyId:party.id,monsterId:run.combat?.monster?.id||'',error,stack:e.stack,phase:run.phase,depth:run.depth,floor:run.floor,usedMonsterIds:[...(run.usedMonsterIds||[])],eventPlayers:run.phase==='EVENT'?run.players.map(p=>({class:p.characterId,status:p.status,resources:p.publicResources,pool:p.cardPool.map(c=>({id:c.id,baseNumber:c.baseNumber})),state:run.roomState.privateByPlayer[p.playerId]})):null});}
  const sum=key=>child.reduce((s,r)=>s+num(r[key]),0),clear=run.phase==='RUN_CLEAR'?1:0;
  for(const row of playersData.slice(playerStart)){row.expeditionId='E'+n;row.expeditionClear=clear;}
  runs.push({runId:'E'+n,seed,mode:'EXPEDITION',scope:'FULL_EXPEDITION',partyId:party.id,buildIds:party.ids.join(','),stage:'DYNAMIC',profiles:party.profiles.join(','),runtimeRunId:run.id,finalDepth:run.depth,finalPhase:run.phase,floorReached:run.floor,runClear:clear,encounterClear:child.length?sum('encounterClear')/child.length:0,runFailed:run.phase==='RUN_FAILED'?1:0,turns:sum('turns'),encounters:child.length,damage:sum('damage'),damageTaken:sum('damageTaken'),downs:sum('downs'),revives:sum('revives'),flameSpent:flameLog.filter(x=>x.runId===run.id).reduce((n,x)=>n+x.spent,0),finalFlame:run.flame,finalHP:run.players.map(p=>p.hp).join(','),turnCap:capped?1:0,error});
  if((n+1)%50===0)console.log(JSON.stringify({expeditions:n+1,exceptions:errors.length}));
 }
}
if(bossOnly){
 const empirical=JSON.parse(await fs.readFile(process.env.PVE_BOSS_SNAPSHOTS,'utf8')).bossSnapshots;
 if(!empirical.length)throw new Error('NO_EMPIRICAL_BOSS_SNAPSHOTS');
 const fresh=parties.map(p=>({...p,stage:'MID',ids:p.ids.map((id,seat)=>newBuild(buildCatalog.get(id).characterId,'MID',seat))}));
 for(const id of ['f2_moon_eating_witch'])for(let i=0;i<Number(process.env.PVE_TARGETED_COUNT||250);i++){
 if(process.env.PVE_TARGET_INDICES&&!JSON.parse(process.env.PVE_TARGET_INDICES).includes(i))continue;
 const def=monsters.find(m=>m.id===id),seed='boss-audit:'+id+':'+i;
 if(i<125){const party=fresh[i];bossSamples.push({seed,boss:id,cohort:'CONTROLLED_FRESH',source:'LEGAL_MID_SNAPSHOT',hp:'FULL',flame:4,buildIds:party.ids,profiles:party.profiles});simulate(party,seed,def,'CONTROLLED_FRESH');}
 else {const source=empirical[(i-125)%empirical.length],r=structuredClone(source.run),party=structuredClone(source.party);bossSamples.push({seed,boss:id,cohort:'EXPEDITION_LIKE',sourceSeed:source.seed,sourceBoss:r.combat.monster.id,source:'EMPIRICAL_ENTRY_CLASS_CORE_MIGRATED_RESAMPLED',hp:r.players.map(p=>p.hp),maxHp:r.players.map(p=>p.maxHp),flame:r.flame,buildIds:party.ids,profiles:party.profiles,augments:r.players.map(p=>p.augments.length),engravings:r.players.map(p=>p.engravings),relics:r.players.map(p=>p.relics),cards:r.players.map(p=>p.cardPool.map(c=>c.baseNumber))});for(const p of r.players){if(!['prophet','vampire'].includes(p.characterId))continue;
 const before={resources:structuredClone(p.publicResources),cards:p.cardPool.map(c=>c.baseNumber)};
 if(p.characterId==='prophet')for(const c of p.cardPool)if(c.source==='BASE'&&c.baseNumber===5)c.baseNumber=0;
 p.publicResources=p.characterId==='prophet'?{revelation:0,revelationMax:p.augments.includes('aug-153')?8:6}:{blood:0,bloodMax:p.augments.includes('aug-319')||p.augments.includes('aug-324')?8:6,dominance:0};
 if(r.augmentFramework?.cardState)for(const key of Object.keys(r.augmentFramework.cardState))if(key.startsWith(p.playerId+':')&&/seer|vampire|pvCore/.test(key))delete r.augmentFramework.cardState[key];
 migrationLog.push({seed,playerId:p.playerId,classId:p.characterId,before,after:{resources:structuredClone(p.publicResources),cards:p.cardPool.map(c=>c.baseNumber)},hpPreserved:p.hp,flamePreserved:r.flame,growthPreserved:p.growthExp});
 }r.seed=seed;r.rngCounter=0;r.phase='COMBAT';if(r.combat.monster.id!==def.id){r.combat.monster=newCombatState(structuredClone(r.players),def.baseHp,'BOSS',def).monster;const {publishMonsterIntent}=await mod('monster');publishMonsterIntent(r);}for(const p of r.players){const canonical={characterId:p.characterId,stage:'MID',augments:[...p.augments].sort(),relics:[...p.relics].sort(),engravings:p.engravings,cards:p.cardPool.map(c=>c.baseNumber).sort((a,b)=>a-b)},bid=hash(canonical).slice(0,20);buildCatalog.set(bid,{id:bid,family:p.characterId+'/'+(p.augmentBuild||'BASELINE')+'/MID',...canonical,player:structuredClone(p)});}party.ids=r.players.map(p=>hash({characterId:p.characterId,stage:'MID',augments:[...p.augments].sort(),relics:[...p.relics].sort(),engravings:p.engravings,cards:p.cardPool.map(c=>c.baseNumber).sort((a,b)=>a-b)}).slice(0,20));simulate(party,seed,def,'EXPEDITION_LIKE',r);}
 if((i+1)%25===0)console.log(JSON.stringify({boss:id,encounters:i+1,exceptions:errors.length}));
 }
}

if(f3Target){
 const sources=JSON.parse(await fs.readFile(process.env.PVE_F3_SNAPSHOTS,'utf8')).f3Entries;
 if(!sources.length)throw new Error('NO_COMPATIBLE_F3_ENTRY');
 const register=(players,stage)=>players.map(p=>{const canonical={characterId:p.characterId,stage,augments:[...p.augments].sort(),relics:[...p.relics].sort(),engravings:p.engravings,cards:p.cardPool.map(c=>c.baseNumber).sort((a,b)=>a-b)},id=hash(canonical).slice(0,20);buildCatalog.set(id,{id,family:p.characterId+'/'+(p.augmentBuild||'BASELINE')+'/'+stage,...canonical,player:structuredClone(p)});return id;});
 const controlled=Array.from({length:150},(_,i)=>({id:'controlled-f3:'+i,ids:Array.from({length:4},(_,seat)=>newBuild(classes[(i+seat*3)%classes.length],'LATE',seat)),stage:'LATE',profiles:profiles.map((_,j)=>profiles[(i+j)%profiles.length]).slice(0,4)}));
 for(const monster of monsters.filter(m=>m.floor===3)){
  const n=monster.tier==='BOSS'?150:100;
  for(let i=0;i<n;i++){
   if(process.env.PVE_REPAIR_SEEDS&&!JSON.parse(process.env.PVE_REPAIR_SEEDS).includes('f3-target:'+monster.id+':E:'+i))continue;
   if(process.env.PVE_COHORT_ONLY!=='EXPEDITION')simulate(controlled[i],'f3-target:'+monster.id+':C:'+i,monster,'CONTROLLED_F3');
   const entry=sources[i%sources.length],run=structuredClone(entry.run),party=structuredClone(entry.party);
    run.id='target:'+hash(monster.id+':'+i).slice(0,32);run.seed='f3-target:'+monster.id+':E:'+i;run.rngCounter=0;run.phase='COMBAT';party.stage='LATE';party.ids=register(run.players,'LATE');
   const roomType=monster.tier==='BOSS'?'BOSS':monster.tier==='ELITE'?'ELITE_COMBAT':'NORMAL_COMBAT',node=run.map.nodes.find(n=>n.type===roomType);
   if(!node)throw new Error('F3_TARGET_ROOM_CONTEXT_MISSING');run.currentRoomNodeId=node.id;run.depth=node.depth;run.map.currentNodeId=node.id;if(monster.tier==='BOSS')run.chosenBossIds[3]=monster.id;
   run.combat=newCombatState(run.players,monster.baseHp,roomType,monster);run.combat.privateByPlayer=Object.fromEntries(run.players.map(p=>[p.playerId,restoreCardCycle(run,p)]));run.combat.id=run.id;beginTurn(run);
   bossSamples.push({monsterId:monster.id,cohort:'EXPEDITION_LIKE_F3',empiricalSeed:entry.seed,synthetic:false});simulate(party,run.seed,monster,'EXPEDITION_LIKE_F3',run);
  }
  console.log(JSON.stringify({monster:monster.id,encounters:n*2,errors:errors.length}));
 }
}
const output={f3Entries,f3PatternTurns,aiLog,migrationLog,auditTurns,bossSamples,bossSnapshots,reworkLog,poolLog,turnLog,flameLog,growthLog,floorLog,actionLog,metadata:{sourceSHA:process.env.PVE_SOURCE_SHA||'WORKING_TREE',baselineSHA:'ee31994a95969e7abce667108d14a393cfff20d8',condition:ARM,date:'2026-10-06',uniqueParties:parties.length,uniquePlayerBuilds:buildCatalog.size,duplicatePartyRejected:duplicates,networkAttempts,classes:classes.length,monsters:monsters.length,augments:AUGMENT_DEFINITIONS.length,elapsedSeconds:(Date.now()-start)/1000,count,seeds,exceptions:errors.length,turnCaps:runs.filter(x=>x.turnCap).length,scope:f3Only?'F3_ONLY_SEQUENCE':fullOnly?'FULL_EXPEDITION':'CONTROLLED_ENCOUNTERS',incompatibleMixes:'Single archetype enforced by real chooseAugment; mixed archetypes are illegal.'},classes,monsters:monsters.map(({id,name,floor,tier})=>({id,name,floor,tier})),augments:AUGMENT_DEFINITIONS.map(({id,name,characterId,build,tier})=>({id,name,characterId,build,tier})),parties,builds:[...buildCatalog.values()].map(({player,...b})=>b),runs,players:playersData,encounters,errors};
await fs.writeFile(new URL('results-'+count+'.json',artifactRoot),JSON.stringify(output));console.log(JSON.stringify(output.metadata));
