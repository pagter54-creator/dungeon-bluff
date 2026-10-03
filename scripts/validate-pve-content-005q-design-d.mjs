import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function validateDesignD(doc,decisions,source){
const errors=[];const need=(ok,msg)=>{if(!ok)errors.push(msg);};
const allowedOrigin=new Set(["USER_CONFIRMED","SOURCE_EXPLICIT","005R_RESOLVED","BETA_V02_INFERRED"]);
const ids=Array.from({length:120},(_,i)=>`aug-${271+i}`);const entries=doc.entries||[];const byId=new Map(entries.map(x=>[x.augmentId,x]));
need(entries.length===120,"Expected120contracts");need(byId.size===120,"Duplicate augment IDs");need(ids.every(x=>byId.has(x)),"Exact271..390IDs");
need(doc.designOnly===true,"Design-only gate");
const required=["augmentId","characterId","classDisplay","archetype","stage","name","sourceIntent","sourceValueV01","provenance","sourceClassification","trigger","timingPhase","condition","effectType","effectValue","damageTaxonomy","targetRule","tieRule","stateKey","stateType","stackRule","stackCap","consumeRule","onceScope","resetScope","persistenceScope","roomApplicability","orderingBefore","orderingAfter","visibility","reconnectRule","idempotencyRule","interactionNotes","tooltipBetaV02","runtimePrimitivesRequired","testCasesRequired","designStatus","runtimeReady","executable"];
const rooms=["COMBAT","EVENT","REWARD","SHOP","REST"];
const once=new Set(["NONE","TURN","CYCLE","COMBAT","ROOM","FLOOR","RUN","ACQUISITION"]);
const resets=new Set(["TURN_END","CYCLE_END","COMBAT_END","ROOM_END","FLOOR_END","RUN_END","NEVER_WITHIN_RUN"]);
const persists=new Set(["TEMP","COMBAT","ROOM","FLOOR","RUN"]);
const tax=new Set(["ADD","SET","MULTIPLY","EXTRA_DAMAGE_COMPONENT","SEPARATE_HIT","NOT_APPLICABLE"]);
const original=new Map((source||[]).map(x=>[x.augmentId,x]));
const primitiveNames=new Set((doc.primitiveInventory||[]).map(x=>x.primitive));
let scannerMatches=0;const forbidden=/\b(?:SPEC_PARTIAL|SPEC_AMBIGUOUS|RUNTIME_BLOCKED|TODO|TBD|UNKNOWN|UNRESOLVED)\b|pending user decision|추후 결정|조건 달성 시|적당히/i;
const recurse=(v,path,scan=true)=>{
if(v===null){errors.push("Null at "+path);return;}
if(typeof v==="string"&&scan&&forbidden.test(v)){errors.push("Incomplete marker at "+path);scannerMatches++;}
if(Array.isArray(v))v.forEach((x,i)=>recurse(x,path+"."+i,scan));
else if(v&&typeof v==="object")for(const [k,x] of Object.entries(v)){const historical=["sourceIntent","sourceValueV01","legacyRuntimeStatus","baselineReportedRuntimeStatus","resolutionArtifact","balanceWarning"].includes(k);recurse(x,path+"."+k,scan&&!historical);}
};
for(const e of entries){
const id=e.augmentId;required.forEach(k=>need(e[k]!==undefined&&e[k]!==null,`${id}:missing${k}`));
need(e.designStatus==="SPEC_COMPLETE"&&e.runtimeReady===true&&e.executable===false,`${id}:readiness/executable`);
need(allowedOrigin.has(e.sourceClassification),`${id}:origin`);
for(const [key,value] of Object.entries(e.provenance?.fieldOrigins||{}))for(const o of Array.isArray(value)?value:[value])need(allowedOrigin.has(o),`${id}:origin${key}`);
need(Array.isArray(e.trigger)&&e.trigger.length>0,`${id}:trigger`);
need(e.condition?.expression?.length>4,`${id}:condition`);
for (const token of e.condition?.expression?.match(/\b[A-Z][A-Z_0-9]*\b/g) || []) need(doc.executionModel?.conditions?.[token] || doc.executionModel?.stateDictionary?.[token], `${id}:undeclared predicate ${token}`);
need(e.effectValue?.operations?.length>0,`${id}:effectops`);
need(rooms.every(k=>typeof e.roomApplicability?.[k]==="boolean"),`${id}:rooms`);
need(once.has(e.onceScope)&&resets.has(e.resetScope)&&persists.has(e.persistenceScope),`${id}:scope`);
need(["PUBLIC","OWNER_ONLY","SERVER_ONLY"].includes(e.visibility?.state)&&["PUBLIC","OWNER_ONLY","SERVER_ONLY"].includes(e.visibility?.resolvedEffect)&&e.visibility?.guard==="SERVER_ONLY",`${id}:visibility`);
need(tax.has(e.damageTaxonomy),`${id}:damageTaxonomy`);
need(!e.damageComponents?.length||e.damageTaxonomy!=="NOT_APPLICABLE",`${id}:damage incorrectlyN/A`);
need(e.runtimePrimitivesRequired?.length>0&&e.runtimePrimitivesRequired.every(x=>primitiveNames.has(x)),`${id}:primitive`);
need(e.stateType?.fields&&Object.keys(e.stateType.fields).length>0,`${id}:state`);
need(e.testCasesRequired?.minimumPositiveCase?.givenWhenThen?.length>15&&e.testCasesRequired?.minimumNegativeCase?.givenWhenThen?.length>15,`${id}:behavioraltestcontracts`);
need(e.testCasesRequired?.edgeCases?.some(x=>x.case==="RETRY")&&e.testCasesRequired?.edgeCases?.some(x=>x.case==="RECONNECT"),`${id}:retry/reconnectcontracts`);
need(e.tooltipBetaV02?.length>10,`${id}:tooltip`);
const s=original.get(id);if(source){need(!!s,`${id}:source row`);need(s&&["name","archetype","stage"].every(k=>s[k]===e[k])&&s.classId===e.characterId,`${id}:source identity drift`);need(s&&s.canonicalDescription===e.sourceIntent&&s.betaValue===e.sourceValueV01,`${id}:source wording drift`);}
recurse(e,id);
}
const classes=["martial_artist","vampire","demon_swordsman","twins"];
for(const [i,c] of classes.entries()){
const group=entries.filter(x=>x.characterId===c);need(group.length===30,c+":count");
for(const [stage,n] of [[1,3],[2,9],[3,9],[4,9]])need(group.filter(x=>x.stage===stage).length===n,c+":stage"+stage);
need(group.every(x=>Number(x.augmentId.slice(4))>=271+i*30&&Number(x.augmentId.slice(4))<=300+i*30),c+":range");
}
const archetypes=new Map();for(const e of entries)archetypes.set(e.archetype,(archetypes.get(e.archetype)||0)+1);
need(archetypes.size===12&&[...archetypes.values()].every(x=>x===10),"Archetype distribution");
const high=[271,281,287,291,301,303,307,308,311,321,331,341,351,355,357,358,360,361,371,381,390];
for(const n of high)need(byId.get(`aug-${n}`)?.testCasesRequired.edgeCases.some(x=>x.highRiskTest===true),"highrisk"+n);
const op=(n,name)=>byId.get(`aug-${n}`)?.effectValue.operations.find(x=>x.op===name);
const refs=(n,d)=>byId.get(`aug-${n}`)?.provenance.userConfirmedDecisionIds.includes(d);
const decisionList=decisions?.decisions||[];
for(let n=1;n<=7;n++){const id="D0"+n;need(decisionList.some(x=>x.decisionId===id),id+":decisionmissing");need(doc.userConfirmedDecisionReferences?.some(x=>x.decisionId===id),id+":reference");}
need(refs(287,"D01")&&byId.get("aug-287")?.targetRule==="OWNER_CARD"&&byId.get("aug-287")?.onceScope==="COMBAT"&&op(287,"CONSUME_THRESHOLD_ATTACK_RESERVATION")?.consumeEvenIfNotColliding===true,"D01ownerreservation");
need(doc.baseCanonicals?.vampire.mark.maxPerOwner===1&&doc.baseCanonicals.vampire.mark.sharedTarget===true&&doc.baseCanonicals.vampire.mark.excludeSelf===true,"D02owner-scopedmarks");
need(doc.baseCanonicals?.demon_swordsman.devour.multipleLevels===true&&doc.baseCanonicals.demon_swordsman.devour.scope==="RUN"&&doc.baseCanonicals.demon_swordsman.devour.defaultThreshold===8,"D03overflow");
need(doc.baseCanonicals?.twins.parity.source==="D04"&&doc.baseCanonicals.twins.parity.input.includes("baseNumber%2"),"D04printedparity");
need(refs(303,"D05")&&refs(308,"D05")&&op(303,"GRANT_COMMAND_RESERVE")?.cap===1&&op(303,"GRANT_COMMAND_RESERVE")?.newMarkOnly===true,"D05reserve");
need(op(308,"GAIN_DOMINANCE_NONCONSUMED")?.cap===4&&op(308,"ARM_COMMAND_DAMAGE_STREAM")?.consumeDominance===false&&op(308,"ARM_COMMAND_DAMAGE_STREAM")?.charges===1&&op(308,"ARM_COMMAND_DAMAGE_STREAM")?.consumeCharge===true&&op(308,"ARM_COMMAND_DAMAGE_STREAM")?.eligibleFrom==="NEXT_DISTINCT_PRIMARY_ATTACK_AFTER_COMMAND_RESOLVE","D05persistentDominanceordering");
need(refs(307,"D06")&&op(307,"PROTECT_OWNER_COLLISION_VALIDITY")?.leaveOtherMembersInvalid===true&&byId.get("aug-307")?.targetRule==="OWNER_CARD"&&byId.get("aug-307")?.onceScope==="COMBAT","D06owner-onlyprotection");
need(op(351,"ACTIVATE_TRANSFORMATION")?.cost===6&&op(351,"ACTIVATE_TRANSFORMATION")?.replaceNormalCycle===true&&op(351,"SET_TRANSFORMATION_READY")?.automatic===false,"D07manualactivation");
for(let n=351;n<=360;n++)need(refs(n,"D07"),"D07card"+n);
need(JSON.stringify(op(355,"OVERRIDE_TRANSFORM_POOL")?.value)==="[2,3,4,5,6]"&&JSON.stringify(op(358,"OVERRIDE_TRANSFORM_POOL")?.value)==="[3,4,5,6,6]","D07pooloverride");
need(op(357,"SET_DEVOUR")?.value===2&&op(360,"ON_NORMAL_EXIT_SET_DEVOUR")?.value===2,"D07exitset2");
need(op(390,"RECOVER_CARD")?.sameInstance===true&&op(390,"RECOVER_CARD")?.selector==="MOST_RECENT_SPENT_SEQUENCE_DESC_THEN_CARD_INSTANCE_ID_ASC","Q08recentrecovery");
need(decisions?.unresolvedPriorQuestions?.length===0&&decisions?.remainingDecisionBundles?.length===0,"Decisionqueueempty");
need(doc.crossClassMatrix?.length>=12&&doc.legacyRuntimeComparison?.length===120,"Comparisons");
const audit={target:120,uniqueIds:byId.size,specComplete:entries.filter(x=>x.designStatus==="SPEC_COMPLETE").length,specPartial:0,specAmbiguous:0,runtimeReady:entries.filter(x=>x.runtimeReady===true).length,runtimeBlocked:entries.filter(x=>x.runtimeReady!==true).length,roomResolved:entries.filter(x=>rooms.every(k=>typeof x.roomApplicability?.[k]==="boolean")).length,visibilityResolved:entries.filter(x=>x.visibility?.state&&x.visibility?.guard).length,onceResolved:entries.filter(x=>once.has(x.onceScope)).length,resetResolved:entries.filter(x=>resets.has(x.resetScope)).length,persistenceResolved:entries.filter(x=>persists.has(x.persistenceScope)).length,positiveTestContracts:entries.filter(x=>x.testCasesRequired?.minimumPositiveCase?.givenWhenThen).length,negativeTestContracts:entries.filter(x=>x.testCasesRequired?.minimumNegativeCase?.givenWhenThen).length,highRiskTestContracts:high.length,unresolvedScannerMatches:scannerMatches,userConfirmedDecisionCoverage:errors.some(x=>/^D0/.test(x))?"FAIL":"D01-D07_ALL_APPLIED",designBlockers:errors,classes:Object.fromEntries(classes.map(c=>[c,entries.filter(x=>x.characterId===c).length])),archetypes:Object.fromEntries(archetypes),newContractExecutable:entries.filter(x=>x.executable!==false).length,valid:errors.length===0};
return {errors,audit};
}

export async function loadDesignDFiles(root = fileURLToPath(new URL('../', import.meta.url))) {
  const read = async p => JSON.parse(await readFile(path.join(root, p), 'utf8'));
  const [document, decisions, source, audit] = await Promise.all([
    read('docs/PVE_CONTENT_005Q_DESIGN_D.json'),
    read('docs/PVE_CONTENT_005Q_DESIGN_D_USER_CONFIRMED.json'),
    read('docs/pve-augment-beta-005d.json'),
    read('docs/PVE_CONTENT_005Q_DESIGN_D_AUDIT.json')
  ]);
  return { document, decisions, source: Array.isArray(source) ? source : source.entries, audit };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await loadDesignDFiles();
  const result = validateDesignD(files.document, files.decisions, files.source);
  console.log(JSON.stringify(result.audit, null, 2));
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
}
