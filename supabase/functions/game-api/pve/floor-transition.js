import {choose} from './rng.js';
import {F2_MONSTER_DEFINITIONS} from './content-f2.js';
import {generateFloorMap} from './map.js';
import {persistCardCycles,restoreCardCycle} from './card-cycle.js';
import {clearCombatResourcesForPlayers} from './resources.js';

export function advanceCompletedFloor(run){
  if(![1,2].includes(run.floor)||run.phase!=='FLOOR_CLEAR')return false;
  const runId=run.id;
  if(!run.floorTransitionResult&&run.combat?.publicTurnResult){
    const monster=run.combat.monster;
    run.floorTransitionResult={publicTurnResult:structuredClone(run.combat.publicTurnResult),monster:{id:monster.id,name:monster.name,hp:monster.hp,maxHp:monster.maxHp}};
  }
  clearCombatResourcesForPlayers(run.players);
  persistCardCycles(run,Object.fromEntries(run.players.map(player=>[player.playerId,restoreCardCycle(run,player)])));
  delete run.combat;delete run.roomState;delete run.roomResult;delete run.roomPresentationBaseline;
  const nextFloor=run.floor+1;
  run.floor=nextFloor;run.depth=0;run.currentRoomNodeId=null;run.usedMonsterIds=[];
  if(nextFloor===2){run.chosenBossIds||={};run.chosenBossIds[2]=choose(run,Object.values(F2_MONSTER_DEFINITIONS).filter(def=>def.tier==='BOSS'),`f2-boss:${run.seed}`).id;}
  run.map=generateFloorMap(run,12);run.map.voteDeadline=null;
  run.phase='MAP_VOTE';run.floorClear={...run.floorClear,completed:true,advancedTo:nextFloor};
  if(run.id!==runId)throw new Error('PVE run identity changed during floor transition.');
  return true;
}
