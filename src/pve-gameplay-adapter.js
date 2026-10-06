import {skillCues,monsterCue} from './pve-combat-presentation.js';
import {PVE_CHARACTER_TO_LOBBY} from './game-mode.js';

const skillByCharacter=Object.freeze({
  adventurer:'gold_bonus',warrior:'toughness',rogue:'low_card_gold',mage:'amplify',
  berserker:'blood_heat',prophet:'revelation',imp:'number_steal',gambler:'random_hand',gunner:'full_burst',
  martial_artist:'combo',vampire:'blood_command',demon_swordsman:'soul_slash',twins:'acrobatics'
});
const lobbyId=player=>player?.lobbyCharacterId||PVE_CHARACTER_TO_LOBBY[player?.characterId]||player?.characterId;
const memberFor=(bundle,player)=>bundle?.members?.find(m=>m.id===player.playerId)||null;
const characterForPlayer=(bundle,player)=>bundle?.characters?.find(c=>c.id===lobbyId(player))||null;

function publicCycle(run,player,scope='combat'){
  const state=scope==='room'||scope==='event'?run.roomState:run.combat;
  const publicState=state?.publicCardCycles?.[player.playerId]||run.publicCardCycles?.[player.playerId];
  if(publicState)return publicState;
  const own=scope==='room'||scope==='event'?run.privateRoomState:run.privateCombat;
  if(own?.playerId!==player.playerId){
    if(player.characterId==='gambler')return {cycleIndex:0,cards:Array.from({length:player.gamblerDeck?.handCount??2},()=>({baseNumber:null,used:false}))};
    return {cycleIndex:1,cards:(player.cardPool||[]).map(c=>({baseNumber:c.baseNumber,used:false}))};
  }
  if(player.characterId==='gambler')return {cycleIndex:0,cards:(own.remainingCardIds||[]).map(id=>player.cardPool.find(c=>c.id===id)).filter(Boolean).map(c=>({id:c.id,baseNumber:c.baseNumber,used:false}))};
  const remaining=new Set(own.remainingCardIds||[]);
  return {cycleIndex:own.cycleIndex||1,cards:(player.cardPool||[]).map(c=>({baseNumber:c.baseNumber,used:c.id?!remaining.has(c.id):false}))};
}
function activeSkillAvailable(player){
  const r=player.publicResources||{};
  if(player.characterId==='warrior')return (r.toughnessCharges||0)>0;
  if(player.characterId==='mage')return (r.mana||0)>=2;
  if(player.characterId==='gunner')return Boolean(r.fullBurstReady);
  if(player.characterId==='vampire')return Boolean(r.thrallPlayerId);
  if(player.characterId==='demon_swordsman')return player.augments?.includes('aug-351')?Boolean(r.transformationPending)&&!r.transformationActive:r.ghostSlashReady!==false;
  if(player.characterId==='twins')return Boolean(r.acrobaticsReady);
  if(player.characterId==='prophet')return (r.revelation||0)>=6;
  return false;
}
function runtimeState(player){
  const r=player.publicResources||{};
  const reverseMath=(player.augments||[]).includes('aug-111');
  const manaMax=(player.augments||[]).includes('aug-091')?6:4;
  return {
    ...r,
    ghostTransformation:player.augments?.includes('aug-351')||false,
    sun:r.sun,moon:r.moon,eclipse:r.eclipse,acrobaticsRechargeNeed:player.augments?.includes('aug-381')?(player.augments?.includes('aug-385')?2:3):null,
    ghostThreshold:player.augments?.includes('aug-348')?4:player.augments?.includes('aug-342')?5:player.augments?.includes('aug-341')?6:8,
    mana:r.mana||0,
    manaMax,
    reverseMath,
    toughnessCharges:r.toughnessCharges||0,
    revelationStacks:r.revelationStacks??r.revelation??0,
    predation:r.predation??r.devour??0,
    comboStacks:r.comboStacks??r.combo??0,
    comboPrevious:r.comboPrevious??r.lastSubmittedNumber??null,
    parity:r.parity??0,
    thrallId:r.thrallPlayerId||null
  };
}

export function pveGameplayPlayers(bundle,run,{scope='combat'}={}){
  const players={};
  for(const p of run.players||[]){
    const member=memberFor(bundle,p),character=characterForPlayer(bundle,p),cycle=publicCycle(run,p,scope);
    const physical=p.cardPool||[];
    const rawSkillId=skillByCharacter[p.characterId]||character?.definition?.skill?.id||'';
    const rewardSkillSupported=scope==='event'?['warrior','mage','vampire'].includes(p.characterId):scope!=='room'||['warrior','mage','gunner','twins'].includes(p.characterId);
    players[p.playerId]={
      memberId:p.playerId,
      characterId:lobbyId(p),
      character,
      loadout:member?.loadout,
      hp:p.hp,maxHp:p.maxHp,
      score:(Number(p.growthExp)||0)+(Number(p.score)||0),
      gold:Number(p.runGold)||0,
      knockedOut:p.status==='DOWNED',
      cycleIndex:cycle.cycleIndex||1,
      cycleCards:(cycle.cards||[]).map((card,index)=>({
        id:card.id||physical[index]?.id||`pve-public:${p.playerId}:${cycle.cycleIndex||1}:${index}`,
        slot:index,value:card.displayNumber??card.baseNumber,used:Boolean(card.used)||(run.phase==='SHOP'&&p.characterId==='prophet'&&(card.id||physical[index]?.id)===`${p.playerId}:base:1`),prophecySlot:p.characterId==='prophet'&&(card.id||physical[index]?.id)===`${p.playerId}:base:1`,fragment:p.characterId==='prophet'&&card.baseNumber===0&&(card.displayNumber??0)!==0
      })),
      skillId:rewardSkillSupported?rawSkillId:'',
      skillType:rewardSkillSupported?(character?.definition?.skill?.type||'passive'):'passive',
      characterRuntimeState:{...runtimeState(p),...(p.playerId===run.privateCombat?.playerId&&p.characterId==='prophet'?{prophetCore:run.privateProphetState,fragmentCost:run.privateProphetState?.cost||6}:{}),...(p.playerId===run.privateCombat?.playerId&&p.characterId==='vampire'?{thrallChoice:run.privateVampireState?.thrallChoice,echo:run.privateVampireState?.echo}:{})},
      ...(p.characterId==='gambler'&&p.gamblerDeck?{gamblerDeck:p.gamblerDeck}:{}),
      activeSkillState:{available:rewardSkillSupported&&activeSkillAvailable(p)}
    };
  }
  return players;
}

export function pveGameplayBundle(bundle,run,{scope='combat'}={}){
  const ready=scope==='room'||scope==='event'?(run.roomState?.readyPlayerIds||[]):(run.combat?.readyPlayerIds||[]);
  const roomType=run.combat?.roomType||run.roomState?.type||'EVENT';
  const category=roomType==='BOSS'?'boss':roomType.includes('COMBAT')?'monster':'event';
  return {
    ...bundle,
    privateState:{revealedCards:run.privateRevelation?.revealedCards||[]},
    session:{
      id:run.id,turn_index:run.combat?.turn||1,
      state:{
        lockedMembers:[...ready],
        selectionHolds:{},
        currentStage:{category},
        monster:run.combat?.monster||null
      }
    }
  };
}

export function pveStageModel(run){
  const roomType=run.combat?.roomType||run.roomState?.type||run.map?.nodes?.find(n=>n.id===run.currentRoomNodeId)?.type||'EVENT';
  const monster=run.combat?.monster;
  const shapeByMonster={f1_armored_boar:'boar',f1_coward_hunter:'hunter',f1_echo_bat:'bat',f2_cursed_prophet:'seer',f2_hungry_slime:'slime',f2_chaos_goblin:'goblin',f3_greed_mimic:'mimic',f3_execution_golem:'golem'};
  return {
    category:roomType==='BOSS'?'boss':roomType.includes('COMBAT')?'monster':'event',
    roomType,
    name:monster?.name||roomType,
    subtitle:`FLOOR ${run.floor} · DEPTH ${run.depth}`,
    color:roomType==='BOSS'?'#c76578':roomType==='ELITE_COMBAT'?'#9b77c8':'#7f9a91',
    shape:shapeByMonster[monster?.id]||monster?.id||null,
    contentId:monster?.id||roomType
  };
}
function mappedSkill(card){
  if(card.skillUsed==='amplify'||card.skillUsed==='reverse_math')return 'amplify';
  if(card.bloodCommandUsed)return 'blood_command';
  if(card.ghostSlashBonusDamage>0)return 'soul_slash';
  return card.skillUsed||null;
}
function mutationEffects(turnResult){
  const effects=[];
  for(const event of turnResult?.presentationMutations||[]){
    if(event.effectId==='vampire-blood-command'){
      effects.push({type:'vampire_swap',sourceId:event.actorId,targetId:event.targetId,sourceValue:event.actorBefore,targetValue:event.targetBefore});
    }else if(event.effectId==='imp-steal'){
      effects.push({type:'imp_number_steal',memberId:event.actorId,targetId:event.targetId,sourceValue:null,targetValue:event.after});
    }
  }
  return effects;
}
function combatEventEffects(turnResult){
  const out=[];
  for(const event of turnResult?.events||[]){
    if(event.type==='PLAYER_DAMAGED'&&event.amount>0)out.push({type:'damage',memberId:event.playerId,amount:event.amount});
    else if(event.type==='PLAYER_HEALED'&&event.amount>0)out.push({type:'heal',memberId:event.playerId,amount:event.amount});
    else if(event.type==='FULL_BURST_MISFIRE'&&event.amount>0)out.push({type:'damage',memberId:event.playerId,amount:event.amount,reason:'burst_misfire'});
    else if(event.type==='PLAYER_DOWNED'){
      if(event.rescued)out.push({type:'revive',memberId:event.playerId,hp:event.hp||1});
      else out.push({type:'knockout',memberId:event.playerId});
    }
  }
  return out;
}

export function adaptPveTurnResult(bundle,beforeRun,afterRun){
  const turnResult=afterRun?.combat?.publicTurnResult||afterRun?.floorTransitionResult?.publicTurnResult;
  if(!turnResult)return null;
  const stage=pveStageModel(beforeRun||afterRun);
  const beforeMonster=structuredClone(beforeRun?.combat?.monster||afterRun.combat?.monster||afterRun?.floorTransitionResult?.monster||null);
  const afterMonster=structuredClone(afterRun?.combat?.monster||afterRun?.floorTransitionResult?.monster||beforeMonster||null);
  const effects=[...mutationEffects(turnResult),...combatEventEffects(turnResult)];
  for(const packet of turnResult.damagePackets||[]){
    const player=(afterRun.players||[]).find(p=>p.playerId===packet.sourcePlayerId);
    const character=characterForPlayer(bundle,player);
    effects.push({
      type:'attack',memberId:packet.sourcePlayerId,amount:Number(packet.amount)||0,
      attackFx:character?.definition?.attackFx||'sword',
      attackSfx:character?.definition?.attackSfx||undefined,
      hits:1
    });
  }
  if(beforeMonster&&afterRun?.combat?.monster){
    const hpAfterAttacks=Math.max(0,beforeMonster.hp-(Number(turnResult.totalDamage)||0));
    const healedHp=Math.max(0,Number(afterRun.combat.monster.hp)||0);
    if(healedHp>hpAfterAttacks)effects.push({type:'monster_heal_after',amount:healedHp-hpAfterAttacks});
  }
  const cards=(turnResult.cards||[]).map(card=>{
    const skillId=mappedSkill(card);
    return {
      memberId:card.playerId,
      cardId:card.cardInstanceId,
      value:card.finalNumber,
      ...(['amplify','reverse_math'].includes(card.skillUsed)?{pveNumberBefore:card.baseNumber}:{}),
      valid:Boolean(card.valid),
      resisted:Boolean(card.collisionImmune&&card.valid&&Number(card.collisionGroupSize)>1),
      skillUsed:Boolean(skillId),
      skillId,
      amplifyLevel:skillId==='amplify'?Math.abs(Number(card.skillValue)||1):0
    };
  });
  return {
    pvePresentation:{skills:skillCues(turnResult,afterRun.players||[]),pattern:monsterCue(beforeMonster,turnResult,afterMonster)},
    turnIndex:turnResult.turn,
    stageIndex:beforeRun?.depth||afterRun.depth||1,
    stage,
    cards,
    effects,
    monsterBefore:beforeMonster,
    monsterAfter:afterMonster,
    totalDamage:Number(turnResult.totalDamage)||0,
    stageCleared:Boolean(beforeMonster&&afterMonster&&afterMonster.hp<=0),
    success:true
  };
}

export function adaptPveRewardResult(beforeRun,afterRun){
  const result=afterRun?.roomState?.publicTurnResult;
  if(!result||afterRun?.roomState?.type!=='REWARD_ROOM')return null;
  const key=`${afterRun.currentRoomNodeId||'reward'}:${result.attempt||1}`;
  return {
    key,
    turnIndex:result.attempt||1,
    stageIndex:afterRun.depth||1,
    stage:{category:'event',roomType:'REWARD_ROOM',name:'보상 방',subtitle:`FLOOR ${afterRun.floor} · DEPTH ${afterRun.depth}`,color:'#8b779c',shape:'seer',contentId:'REWARD_ROOM'},
    cards:(result.cards||[]).map(card=>({
      memberId:card.playerId,
      cardId:null,
      value:card.finalNumber,
      valid:Boolean(card.valid),
      resisted:Boolean(card.collisionImmune&&card.valid&&Number(card.collisionGroupSize)>1),
      skillUsed:false,
      skillId:null,
      amplifyLevel:0
    })),
    effects:[],
    monsterBefore:null,
    monsterAfter:null,
    totalDamage:0,
    stageCleared:false,
    success:Boolean(result.success),
    resolutionLabel:result.success?'보상 우선권 판정':'전원 중복 · 재도전'
  };
}

export function pveRelicRows(run){
  return (run.players||[]).map(player=>({
    playerId:player.playerId,
    relicIds:[...(player.relics||[])]
  }));
}

export function adaptPveEventResult(beforeRun,afterRun){
  const room=afterRun?.roomState,result=room?.publicTurnResult;
  if(room?.type!=='EVENT'||!result)return null;
  return {
    key:`${afterRun.currentRoomNodeId||room.eventId}:${result.turn||1}`,
    turnIndex:result.turn||1,stageIndex:afterRun.depth||1,
    stage:{category:'event',roomType:'EVENT',name:room.name,subtitle:room.ruleSummary,color:'#7f9a91',shape:'seer',contentId:room.illustration||room.eventId},
    cards:(result.cards||[]).map(card=>({
      memberId:card.playerId,cardId:null,value:card.finalNumber,valid:Boolean(card.valid),
      resisted:Boolean(card.collisionImmune&&card.valid&&Number(card.collisionGroupSize)>1),
      skillUsed:false,skillId:null,amplifyLevel:0
    })),
    effects:mutationEffects(result),monsterBefore:null,monsterAfter:null,totalDamage:0,
    stageCleared:true,success:result.outcome==='SUCCESS',
    resolutionLabel:result.outcome==='ALL_COLLIDE'?'전원 중복 · 실패':result.outcome==='SUCCESS'?'이벤트 성공':'조건 미달'
  };
}
