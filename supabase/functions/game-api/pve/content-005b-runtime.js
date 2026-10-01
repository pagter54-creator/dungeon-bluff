import {applyAdventurer} from './adventurer-runtime.js';
import {applyKnight} from './knight-runtime.js';
import {resourceMax} from './resources.js';

const framework=run=>run.augmentFramework||={once:{},statuses:[],delayed:[],grants:{},acquired:{},temporary:[],telemetry:[],recoveryCounts:{},sequence:0};
function cardState(run,player,id){
  const f=framework(run);f.cardState||={};
  const key=player.playerId+':'+id;
  return f.cardState[key]||=( {resetScope:'COMBAT',ownerId:player.playerId,combatId:run.combat?.id||null} );
}
const mark=(run,id,trigger,success,extra={})=>{
  const f=framework(run);
  f.telemetry.push({augmentId:id,trigger,triggerCount:1,successCount:success?1:0,...extra});
};
const playerOwned=(player,id)=>player.augments?.includes(id);
function runRule(run,id,trigger,ctx){
  const p=ctx.player,r=ctx.resolved;
  if(!p||!playerOwned(p,id))return false;
  const s=cardState(run,p,id),turn=run.combat?.turn||0;
  if(id==='aug-062'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&r.soloLowest&&r.finalNumber===1&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  if(id==='aug-084'||id==='aug-088'){
    if(trigger==='CARD_VALIDATED'&&r){
      const prior=s.lastNumber,current=r.finalNumber;
      const jump=Boolean(r.valid&&Number.isInteger(prior)&&Math.abs(current-prior)>=3);
      const direction=jump?Math.sign(current-prior):0;
      r.content005bBonuses||={};
      if(id==='aug-084')r.content005bBonuses[id]=jump&&s.lastJumpTurn===turn-1?1:0;
      if(id==='aug-088')r.content005bBonuses[id]=jump&&s.lastDirection&&direction!==s.lastDirection?3:0;
      if(jump){s.lastJumpTurn=turn;s.lastDirection=direction;}
      else if(id==='aug-084')s.lastJumpTurn=null;
      s.lastNumber=current;
      if(r.content005bBonuses[id]){mark(run,id,trigger,true,{bonusDamage:r.content005bBonuses[id]});return true;}
    }
    if(trigger==='BEFORE_DAMAGE'&&r?.content005bBonuses?.[id]&&ctx.damage){ctx.damage.amount+=r.content005bBonuses[id];return true;}
  }
  if(id==='aug-095'){
    if(trigger==='TURN_START'){s.fullAtTurn=Number(p.publicResources.mana)===resourceMax(p,'mana',4)?turn:null;return false;}
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&r.skillUsed==='amplify'&&s.fullAtTurn===turn&&ctx.damage){ctx.damage.amount+=2;mark(run,id,trigger,true,{bonusDamage:2});return true;}
  }
  if(id==='aug-122'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&p.hp>1&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  if(id==='aug-125'){
    if(trigger==='CARD_VALIDATED'&&r){
      s.streak=r.valid&&p.hp>1?(s.streak||0)+1:0;
      if(s.streak>=2){r.content005bBonuses||={};r.content005bBonuses[id]=2;}
    }
    if(trigger==='BEFORE_DAMAGE'&&r?.content005bBonuses?.[id]&&ctx.damage){ctx.damage.amount+=2;mark(run,id,trigger,true,{bonusDamage:2});return true;}
  }
  if(id==='aug-133'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&r.revengeConsumed&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  if(id==='aug-142'){
    if(trigger==='BEFORE_DAMAGE'&&r?.valid&&p.hp===1&&ctx.damage){ctx.damage.amount+=1;mark(run,id,trigger,true,{bonusDamage:1});return true;}
  }
  return false;
}
const TRIGGERS=Object.freeze({
  ON_ACQUIRE:[],
  POST_COLLISION:[],
  CARD_VALIDATED:['aug-084','aug-088','aug-125'],
  TURN_START:['aug-095'],
  BEFORE_DAMAGE:['aug-062','aug-084','aug-088','aug-095','aug-122','aug-125','aug-133','aug-142']
});
export function applyContent005B(run,trigger,ctx={}){
  const adventurer=applyAdventurer(run,trigger,ctx);
  const knight=applyKnight(run,trigger,ctx);
  if((run.phase!=='COMBAT'&&trigger!=='ON_ACQUIRE')||ctx.followUp)return [...adventurer,...knight];
  const candidates=TRIGGERS[trigger]||[],p=ctx.player;
  if(!p)return [];
  const owned=new Set(p.augments||[]);
  const fired=[...adventurer,...knight];
  for(const id of candidates)if(!id.match(/^aug-0(?:0[1-9]|[12][0-9]|30)$/)&&owned.has(id)&&runRule(run,id,trigger,ctx))fired.push({augmentId:id,trigger});
  return fired;
}
