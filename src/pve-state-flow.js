// A turn belongs to an encounter; turn numbers restart in every room.
export function pveTurnKey(run,presentation){
  const turn=presentation?.turnIndex??run?.combat?.publicTurnResult?.turn??run?.floorTransitionResult?.publicTurnResult?.turn;
  const transition=!run?.combat?.publicTurnResult?run?.floorTransitionResult:null;
  return turn==null?'':[run.id,transition?.floor??run.floor,transition?.roomNodeId??run.currentRoomNodeId??run.map?.currentNodeId,turn].join(':');
}
function intentContext(run){return JSON.stringify([run.id,run.phase,run.floor,run.currentRoomNodeId||run.map?.currentNodeId,run.combat?.turn,run.roomState?.turn,run.roomState?.attempt,run.map?.voteRound]);}
export async function requestPveMutation(request,action,params,before,onRefresh){
  for(let attempt=0;attempt<4;attempt++){
    try{return await request(action,params);}
    catch(error){
      const latest=error.data?.run;
      if(error.code!=='STATE_CONFLICT'||!latest)throw error;
      onRefresh(latest);
      if(intentContext(latest)!==intentContext(before))throw new Error('방이나 턴이 변경되었습니다. 최신 화면에서 다시 선택해 주세요.');
      if(attempt===3)throw new Error('다른 플레이어의 선택을 반영했습니다. 다시 제출해 주세요.');
      // Retain the action ID: a lost response must never execute twice.
      params={...params,expected_version:latest.version};
    }
  }
}

// Items arriving during playback stay in FIFO order, including new items
// appended while the presenter is awaiting attack/reveal animations.
export async function drainPvePresentationQueue(queue,present){
  while(queue.length)await present(queue.shift());
}
