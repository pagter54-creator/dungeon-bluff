export const GAME_MODE=Object.freeze({
  COMPETITIVE:'COMPETITIVE',
  COOP_PVE:'COOP_PVE'
});
export function roomGameMode(room){
  return room?.gameMode===GAME_MODE.COOP_PVE||room?.game_mode===GAME_MODE.COOP_PVE?GAME_MODE.COOP_PVE:GAME_MODE.COMPETITIVE;
}
export function gameModeMeta(mode){
  return mode===GAME_MODE.COOP_PVE
    ? {label:'협력 탐험',beta:true,description:'4명이 협력하여 던전을 공략합니다.',reward:'Gold 획득 가능 · RP 변동 없음'}
    : {label:'경쟁 탐험',beta:false,description:'기존 점수 경쟁 탐험',reward:''};
}
export function gameModeSelectorMarkup(coopPveEnabled=true){
  const disabled=coopPveEnabled?'':' disabled';
  const maintenance=coopPveEnabled?'':'<strong>점검 중</strong><br>';
  return '<fieldset class="game-mode-selector"><legend>게임 모드</legend>'
    +'<label class="game-mode-option"><input type="radio" name="gameMode" value="COMPETITIVE" checked><span><b>경쟁 탐험</b><small>기존 점수 경쟁 탐험</small></span></label>'
    +'<label class="game-mode-option coop"><input type="radio" name="gameMode" value="COOP_PVE"'+disabled+'><span><b>협력 탐험 <em>BETA</em></b><small>'+maintenance+'4명이 협력하여 던전을 공략합니다.<br>Gold 획득 가능 · RP 변동 없음</small></span></label>'
    +'</fieldset>';
}
export function gameModeBadge(mode){
  const meta=gameModeMeta(mode);
  return '<span class="game-mode-badge '+(meta.beta?'coop':'competitive')+'">'+meta.label+(meta.beta?' <b>BETA</b>':'')+'</span>';
}
export const PVE_SUPPORTED_LOBBY_CHARACTER_IDS=Object.freeze(new Set([
  'adventurer','warrior','rogue','mage','berserker','seer','imp','gunner','fighter','vampire','demonsword','twins'
]));
export const PVE_CHARACTER_TO_LOBBY=Object.freeze({
  prophet:'seer',martial_artist:'fighter',demon_swordsman:'demonsword'
});
