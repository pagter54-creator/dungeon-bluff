export const lobbyReady = member => member.member_type === 'ai' || member.lobby_ready === true;
export function beginEntryLoading(session) {
  session.state.entryLoading = { ready: [] };
  session.state.turnPhase = 'loading';
}
export function finishEntryLoading(session, members) {
  const loading=session?.state.entryLoading;
  if(!loading)return false;
  if(!members.every(m=>m.member_type==='ai'||loading.ready.includes(m.id)))return false;
  delete session.state.entryLoading;
  session.state.turnPhase='selecting';session.state.needsOpenTurn=true;
  return true;
}
