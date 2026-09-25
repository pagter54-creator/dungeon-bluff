export function settlementPercent(status,stage){
 if(status==='completed')return 100;
 return status==='failed'&&stage>=5?Math.min(70,(stage-3)*10):0;
}
export function settleExpedition(session){
 if(!['failed','completed'].includes(session.status)||session.state.settlement)return;
 const percent=settlementPercent(session.status,session.stage_index);
 const players={};
 for(const [id,p] of Object.entries(session.state.players)){
  players[id]={rawScore:p.score,rawGold:p.gold,score:session.status==='completed'?p.score:Math.floor(Math.max(0,p.score)*percent/100),gold:Math.floor(Math.max(0,p.gold)*percent/100)};
  p.score=players[id].score;p.gold=players[id].gold;
 }
 session.state.settlement={reason:session.status==='completed'?'clear':'wipeout',percent,stage:session.stage_index,players};
}
