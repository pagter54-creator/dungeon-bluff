export const GAME_MODE=Object.freeze({
  COMPETITIVE:'COMPETITIVE',
  COOP_PVE:'COOP_PVE'
});
export const GAME_MODES=Object.freeze(Object.values(GAME_MODE));
export function parseRequestedGameMode(value){
  if(value==null||value==='')return GAME_MODE.COMPETITIVE;
  if(!GAME_MODES.includes(value)){
    const error=new Error('지원하지 않는 게임 모드입니다.');
    error.code='INVALID_GAME_MODE';
    throw error;
  }
  return value;
}
export function roomGameMode(room){
  return GAME_MODES.includes(room?.game_mode)?room.game_mode:GAME_MODE.COMPETITIVE;
}
export function isCoopPveRoom(room){return roomGameMode(room)===GAME_MODE.COOP_PVE;}
export function coopPveEnabled(value){
  const normalized=String(value??'').trim().toLowerCase();
  return ['1','true','on','yes','enabled'].includes(normalized);
}
export function assertCoopPveEnabled(value){
  if(coopPveEnabled(value))return true;
  const error=new Error('협력 탐험은 현재 점검 중입니다.');
  error.code='COOP_PVE_TEMPORARILY_DISABLED';
  throw error;
}
