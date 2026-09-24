export function pileButton(player,pile,own){
  const deck=player.gamblerDeck||{},draw=pile==='draw',label=draw?'뽑을 덱':'버린 덱';
  const count=deck[draw?'drawCount':'discardCount'];
  const available=own&&Array.isArray(deck[draw?'drawComposition':'discardComposition']);
  return `<button type="button" class="gambler-pile" data-action="gambler-deck" data-pile="${pile}" ${available?'':'disabled'} aria-label="${label} ${count??'-'}장${available?' 구성 보기':''}"><span aria-hidden="true">${draw?'▣':'▤'}</span><small>${label}</small><b>${count??'-'}</b></button>`;
}
export function gamblerCharges(player){
  const d=player.gamblerDeck;if(!d?.sixProgress)return '';
  return `<div class="gambler-charges">${[6,7].map(value=>{
    const six=value===6,progress=d[six?'sixProgress':'sevenProgress'],max=d[six?'sixCount':'sevenCount']>=2;
    const slots=Array.from({length:six?3:5},(_,i)=>`<i class="${max||(six?i<progress.length:progress.includes(i+1))?'filled':''}">${six?'●':i+1}</i>`).join('');
    return `<div aria-label="${value} 카드 충전 ${max?'MAX':progress.length+'/'+(six?3:5)}"><b>${value}</b><span class="charge-dice">${slots}</span><small>${max?'MAX':progress.length+'/'+(six?3:5)}</small></div>`;
  }).join('')}</div>`;
}
export function gamblerPileDetails(player,pile){
  const counts=player?.gamblerDeck?.[pile==='draw'?'drawComposition':'discardComposition'];
  if(!Array.isArray(counts))return '<h2>덱 정보를 불러오는 중</h2>';
  return `<div class="eyebrow">운명의 패</div><h2>${pile==='draw'?'뽑을 카드 덱':'버린 카드 덱'} · ${counts.reduce((a,b)=>a+b,0)}장</h2><div class="gambler-deck-detail">${counts.map((count,i)=>`<span class="${count?'':'empty'}"><b>${i+1}</b> × ${count}</span>`).join('')}</div><p>종류별 장수만 표시합니다. 실제 뽑는 순서는 알 수 없습니다.</p>`;
}
