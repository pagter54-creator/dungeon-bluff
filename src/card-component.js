import { cosmeticClass } from './cosmetics.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Shared by the status panel and mobile selection bar; hidden submissions have no value in the DOM.
export function cardComponent(card, {loadout,own=false,blocked=false,restricted=false,selected=null,faceDown=false,revealId=null}={}){
 const front=cosmeticClass(loadout,'front'),back=cosmeticClass(loadout,'back');
 if(revealId)return `<div class="reveal-card ${front} ${back} ${blocked?'locked':''}" data-reveal="${esc(revealId)}"><span class="card-back">◇</span><b class="reveal-value">?</b><i></i></div>`;
 const disabled=!own||blocked||card.used||restricted;
 const chosen=Array.isArray(selected)?selected.includes(card.id):selected===card.id;
 return `<button type="button" class="pool-card ${front} ${back} ${card.used?'spent used':''} ${restricted?'parity-locked':''} ${own&&chosen?'chosen selected':''} ${blocked?'locked':''} ${faceDown?'face-down':''}" data-card-instance="${esc(card.id)}" ${own?`data-action="select-card" data-card-id="${esc(card.id)}"`:''} ${disabled?'disabled':''} aria-pressed="${own&&chosen}" aria-label="${faceDown?'비공개 카드':card.value}, ${card.used?'사용 완료':restricted?'홀짝 제한':'사용 가능'}"><b>${faceDown?'◇':card.value}</b><small>${card.used?'OFF':restricted?'잠김':'◆'}</small></button>`;
}
