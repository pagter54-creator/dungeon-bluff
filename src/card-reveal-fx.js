import { finishAnimation } from './animation-wait.js';

export async function flipRevealCard(card, result, reduced=false) {
  if(!card)return;
  if(!reduced)await finishAnimation(card.animate([{transform:'perspective(650px) translateY(0) rotateY(0)'},{transform:'perspective(650px) translateY(-14px) rotateY(88deg)'}],{duration:240,easing:'ease-in'}));
  card.querySelector('.reveal-value').textContent=result.value;
  card.classList.add('revealed');
  if(result.amplified){
    const label=document.createElement('small');label.className='amplified-label';
    label.textContent=`${result.value} → ${result.effectValue}`;card.append(label);
  }
  await finishAnimation(card.animate(reduced?[{opacity:.3},{opacity:1}]:[{transform:'perspective(650px) translateY(-14px) rotateY(-88deg)',filter:'brightness(2)'},{transform:'perspective(650px) translateY(-5px) rotateY(0) scale(1.12)',filter:'brightness(1.4)',offset:.7},{transform:'perspective(650px) translateY(0) rotateY(0) scale(1)',filter:'brightness(1)'}],{duration:reduced?350:360,easing:'ease-out'}));
}
