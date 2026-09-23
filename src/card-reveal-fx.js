import { finishAnimation } from './animation-wait.js';

export async function flipRevealCard(card, result, reduced=false) {
  if(!card)return;
  if(!reduced)await finishAnimation(card.animate([{transform:'scaleX(1)'},{transform:'scaleX(.04)'}],{duration:240,easing:'ease-in'}));
  card.querySelector('.reveal-value').textContent=result.value;
  card.classList.add('revealed');
  if(result.amplified){
    const label=document.createElement('small');label.className='amplified-label';
    label.textContent=`${result.value} → ${result.effectValue}`;card.append(label);
  }
  await finishAnimation(card.animate(reduced?[{opacity:.3},{opacity:1}]:[{transform:'scaleX(.04)'},{transform:'scaleX(1)'}],{duration:reduced?350:300,easing:'ease-out'}));
}
