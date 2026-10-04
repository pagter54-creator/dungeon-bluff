import {choose} from './rng.js';
import {F2_MONSTER_DEFINITIONS} from './content-f2.js';
import {F3_MONSTER_DEFINITIONS} from './content-f3.js';
import {generateFloorMap} from './map.js';
import {persistCardCycles,restoreCardCycle} from './card-cycle.js';
import {clearCombatResourcesForPlayers} from './resources.js';
import {cleanupAugmentScope} from './augment-framework.js';

export function advanceCompletedFloor(run){
  if(![1,2].includes(run.floor)||run.phase!=='FLOOR_CLEAR')return false;
  const runId=run.id;
  if(!run.floorTransitionResult&&run.combat?.publicTurnResult){
    const monster=run.combat.monster;
    run.floorTransitionResult={publicTurnResult:structuredClone(run.combat.publicTurnResult),monster:{id:monster.id,name:monster.name,hp:monster.hp,maxHp:monster.maxHp}};
  }
  cleanupAugmentScope(run,'FLOOR');
  clearCombatResourcesForPlayers(run.players);
  persistCardCycles(run,Object.fromEntries(run.players.map(player=>[player.playerId,restoreCardCycle(run,player)])));
  delete run.combat;delete run.roomState;delete run.roomResult;delete run.roomPresentationBaseline;
  const nextFloor=run.floor+1;
  run.floor=nextFloor;run.depth=0;run.currentRoomNodeId=null;run.usedMonsterIds=[];
  if(nextFloor===2){run.chosenBossIds||={};run.chosenBossIds[2]=choose(run,Object.values(F2_MONSTER_DEFINITIONS).filter(def=>def.tier==='BOSS'),`f2-boss:${run.seed}`).id;}
  if(nextFloor===3){run.chosenBossIds||={};run.chosenBossIds[3]=choose(run,Object.values(F3_MONSTER_DEFINITIONS).filter(def=>def.tier==='BOSS'),`f3-boss:${run.seed}`).id;}
  run.map=generateFloorMap(run);run.map.voteDeadline=null;
  run.phase='MAP_VOTE';run.floorClear={...run.floorClear,completed:true,advancedTo:nextFloor};
  if(run.id!==runId)throw new Error('PVE run identity changed during floor transition.');
  return true;
}

export function finalizeExpeditionClear(run){
  if(run.floor!==3||run.phase!=='FLOOR_CLEAR'||run.combat?.roomType!=='BOSS')return false;
  const monster=run.combat.monster;
  run.finalSummary={clearedFloors:3,finalBossId:monster.id,finalBossName:monster.name,totalRunGold:run.players.reduce((sum,p)=>sum+Math.max(0,Number(p.runGold)||0),0),playerCount:run.players.length,completedAt:new Date().toISOString()};
  run.floorClear={floor:3,bossId:monster.id,bossName:monster.name,completed:true};
  clearCombatResourcesForPlayers(run.players);
  delete run.combat;delete run.roomState;delete run.roomResult;delete run.roomPresentationBaseline;delete run.floorTransitionResult;
  cleanupAugmentScope(run,'RUN');
  run.phase='RUN_CLEAR';return true;
}
