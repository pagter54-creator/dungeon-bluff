import {choose} from './rng.js';
import {applyEffectDefinitions} from './effects.js';
import {selectF1Event,F1_EVENT_DEFINITIONS} from './content-f1.js';

const playerFor=(run,id)=>run.players.find(p=>p.playerId===id);
const eventById=id=>F1_EVENT_DEFINITIONS.find(x=>x.id===id)||null;

function finishEvent(run){
  run.phase='ROOM_RESULT';
  run.roomResult={roomNodeId:run.currentRoomNodeId,readyPlayerIds:run.players.filter(p=>p.memberType==='ai').map(p=>p.playerId)};
}
function applyOption(run,player,option,eventId){
  const effect={id:`${eventId}:${option.id}:${player.playerId}`,trigger:'ROOM_END',priority:1,maxTriggers:1,resetScope:'RUN',operations:option.result||[]};
  applyEffectDefinitions(run,player,[effect],'ROOM_END',{events:[]});
}
export function enterEventRoom(run){
  const def=selectF1Event(run);
  run.phase='EVENT';
  run.roomState={
    type:'EVENT',eventId:def.id,name:def.name,
    options:def.options.map(({id,label})=>({id,label})),
    choicesByPlayer:{}
  };
  for(const p of run.players.filter(x=>x.memberType==='ai').sort((a,b)=>a.seat-b.seat)){
    const option=choose(run,def.options,`f1-event-ai:${def.id}:${p.playerId}`);
    chooseEventOption(run,p.playerId,option.id,true);
  }
}
export function chooseEventOption(run,playerId,optionId,allowAi=false){
  if(run.phase!=='EVENT'||run.roomState?.type!=='EVENT')throw new Error('현재 이벤트 방이 아닙니다.');
  const player=playerFor(run,playerId);if(!player)throw new Error('플레이어를 찾을 수 없습니다.');
  if(player.memberType==='ai'&&!allowAi)throw new Error('AI 선택은 서버에서만 처리합니다.');
  if(run.roomState.choicesByPlayer[playerId])throw new Error('이벤트 선택은 한 번만 할 수 있습니다.');
  const def=eventById(run.roomState.eventId),option=def?.options.find(x=>x.id===optionId);
  if(!option)throw new Error('현재 이벤트의 선택지가 아닙니다.');
  applyOption(run,player,option,def.id);
  run.roomState.choicesByPlayer[playerId]={optionId};
  if(run.players.every(p=>run.roomState.choicesByPlayer[p.playerId]))finishEvent(run);
  return option;
}
