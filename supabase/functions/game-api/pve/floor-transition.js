import {generateFloorMap} from './map.js';
import {persistCardCycles,restoreCardCycle} from './card-cycle.js';
import {clearCombatResourcesForPlayers} from './resources.js';

export function advanceCompletedFloor(run){
  if(run.floor!==1||run.phase!=='FLOOR_CLEAR')return false;
  const runId=run.id;
  if(!run.floorTransitionResult&&run.combat?.publicTurnResult){
    const monster=run.combat.monster;
    run.floorTransitionResult={publicTurnResult:structuredClone(run.combat.publicTurnResult),monster:{id:monster.id,name:monster.name,hp:monster.hp,maxHp:monster.maxHp}};
  }
  clearCombatResourcesForPlayers(run.players);
  persistCardCycles(run,Object.fromEntries(run.players.map(player=>[player.playerId,restoreCardCycle(run,player)])));
  delete run.combat;delete run.roomState;delete run.roomResult;delete run.roomPresentationBaseline;
  run.floor=2;run.depth=0;run.currentRoomNodeId=null;run.usedMonsterIds=[];
  run.map=generateFloorMap(run,12);run.map.voteDeadline=null;
  run.phase='MAP_VOTE';run.floorClear={...run.floorClear,completed:true,advancedTo:2};
  if(run.id!==runId)throw new Error('PVE run identity changed during floor transition.');
  return true;
}
