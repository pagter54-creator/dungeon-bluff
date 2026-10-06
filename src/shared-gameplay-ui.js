const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function sharedGameTopMarkup({
  counterLabel='STAGE',counterValue=1,counterTotal=null,progressMarkup='',
  meterLabel='',meterValue='',meterTotal=null,meterDanger=false,mapButton=false,leave=true,extraClass=''
}={}){
  return `<section class="game-top shared-gameplay-top ${esc(extraClass)}">
    <div class="stage-counter"><span>${esc(counterLabel)}</span><b>${esc(String(counterValue).padStart(2,'0'))}</b>${counterTotal==null?'':`<small>/ ${esc(counterTotal)}</small>`}</div>
    <div class="stage-track">${progressMarkup}</div>
    <div class="knockout-meter"><small>${esc(meterLabel)}</small><b class="${meterDanger?'danger-text':''}">${esc(meterValue)}${meterTotal==null?'':`<span> / ${esc(meterTotal)}</span>`}</b></div>
    ${mapButton?'<button class="button secondary small pve-map-button" data-action="pve-map-open" type="button">지도 ◇</button>':''}
    ${leave?'<button class="icon-button" data-action="leave-confirm" aria-label="원정 나가기">↗</button>':''}
  </section>`;
}

export function sharedEncounterMarkup({
  categoryLabel='ENCOUNTER',name='',subtitle='',color='#8a6fa0',enemyArt='',
  monster=null,turnIndex=1,revealing=false,threatLabel=null,threatValue='Ⅰ',
  threatDetail='',intentLabel='',intentText='',bossStatus='',intentMarkup=''
}={}){
  const hasMonster=Boolean(monster);
  const hp=Number(monster?.hp)||0,maxHp=Math.max(0,Number(monster?.maxHp)||0);
  return `<section class="arena shared-gameplay-encounter ${hasMonster&&monster?.boss?'boss-arena':''}" style="--stage-color:${esc(color)}">
    <div class="arena-grid"></div>
    <div class="encounter-heading"><div class="eyebrow">${esc(categoryLabel)}</div><h1>${esc(name)}</h1><p>${esc(subtitle||'당신의 카드가 다음 운명을 결정합니다')}</p></div>
    <div id="enemy-art" class="enemy-art ${monster?.imminent?'monster-action-turn':''}" ${monster?.imminent?'aria-label="몬스터 행동 턴"':''}>${enemyArt}</div>
    <div class="arena-side left"><span>TURN</span><b>${esc(String(turnIndex).padStart(2,'0'))}</b><small>${revealing?'REVEALING':'SELECTING'}</small></div>
    <div class="arena-side right"><span>${esc(threatLabel|| (hasMonster?'THREAT':'ENCOUNTER'))}</span><b>${esc(threatValue)}</b><small>${esc(threatDetail)}</small></div>
    ${hasMonster?`<div class="enemy-health"><div><span>${monster.boss?'BOSS':'MONSTER'} HP</span><b>${hp} <small>/ ${maxHp}</small></b></div><div class="health-track"><i style="width:${maxHp?Math.max(0,Math.min(100,hp/maxHp*100)):0}%"></i></div></div>`:''}
    ${intentMarkup||`<div class="intent ${monster?.imminent?'imminent':''}"><span>${esc(intentLabel||'◇ 방의 규칙')}</span><p>${esc(intentText)}</p></div>`}
    ${bossStatus?`<div class="boss-status"><b>이번 턴 특수 효과</b><p>${esc(bossStatus)}</p></div>`:''}
  </section>`;
}


export function sharedResultOverlayMarkup({
  contentMarkup='',animate=false,extraClass='',sheetClass='',titleId='room-result-title'
}={}){
  const overlayClasses=['room-result-overlay',animate?'summary-enter':'',extraClass].filter(Boolean).map(esc).join(' ');
  const sheetClasses=['room-result-sheet',sheetClass].filter(Boolean).map(esc).join(' ');
  return `<section class="${overlayClasses}" role="dialog" aria-modal="true" aria-labelledby="${esc(titleId)}"><div class="${sheetClasses}">${contentMarkup}</div></section>`;
}
