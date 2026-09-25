import { startCycle } from './characters.js';

// This is an immediate, persisted action, not a modifier on submission.
export function activateAcrobatics(session, player, rng = Math.random) {
  if(player.skillId!=='acrobatics'||player.knockedOut)throw new Error('곡예를 사용할 수 없습니다.');
  const runtime=player.characterRuntimeState;
  if(runtime.acrobatTurn===session.turn_index)return false;
  if(!player.activeSkillState.available)throw new Error('카드 사이클을 끝까지 완주하면 곡예가 재충전됩니다.');
  startCycle(player,player.character,rng,true);
  runtime.parity=1-runtime.parity;
  runtime.acrobatTurn=session.turn_index;
  return true;
}
