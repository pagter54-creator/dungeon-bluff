export const lobbyReady = member => member.member_type === 'ai' || member.lobby_ready === true;
const loadingState=target=>target?.state||target;
export function beginEntryLoading(target) {
  const state=loadingState(target);if(!state)return;
  state.entryLoading = { ready: [] };
  if(target?.state)state.turnPhase = 'loading';
}
export function finishEntryLoading(target, members) {
  const state=loadingState(target),loading=state?.entryLoading;
  if(!loading)return false;
  if(!members.every(m=>m.member_type==='ai'||loading.ready.includes(m.id)))return false;
  delete state.entryLoading;
  if(target?.state){state.turnPhase='selecting';state.needsOpenTurn=true;}
  return true;
}
