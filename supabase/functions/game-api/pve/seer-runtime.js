import {SEER_CONTRACTS} from './seer-contracts.js';
import {coreState,activateFragment,beforePrimaryDamage,endCoreTurn} from './prophet-vampire-rework.js';
export const SEER_HANDLER_IDS=Object.freeze(Object.keys(SEER_CONTRACTS));
export const scopedSeerState=coreState;
export function initializeSeerCombat(p){p.publicResources.revelation=0;p.publicResources.revelationMax=p.augments?.includes('aug-153')?8:6;}
export function onSeerTurnStart(){}
export function resolveSeerBaseValidity(){return 0;}
export function cleanupSeerCombat(run,p){
 const f=run.augmentFramework;if(!f)return;
 if(f.cardState){delete f.cardState[p.playerId+':pvCore'];delete f.cardState[p.playerId+':seer'];}
 // Retire persisted pre-rework provenance without deleting another owner's receipts.
 if(f.seer){for(const key of Object.keys(f.seer.applied||{}))if(key.startsWith(p.playerId+':'))delete f.seer.applied[key];
  for(const [key,value] of Object.entries(f.seer.recoveredCards||{}))if(value.ownerId===p.playerId||value.ownerPlayerId===p.playerId)delete f.seer.recoveredCards[key];
  f.seer.buffs=(f.seer.buffs||[]).filter(x=>x.ownerId!==p.playerId&&x.ownerPlayerId!==p.playerId);
 }
}
export function activateSeerImmediateSkill(run,p){return activateFragment(run,p);}
export function applySeerRuntime(run,trigger,ctx={}){
 if(run.phase!=='COMBAT')return [];
 if(trigger==='BEFORE_DAMAGE'&&ctx.player&&ctx.damage&&!ctx.followUp)beforePrimaryDamage(run,ctx.player,ctx.resolved,ctx.damage);
 if(trigger==='TURN_END'&&ctx.player?.characterId==='prophet')endCoreTurn(run,ctx.events||[]);
 return [];
}
export function assertSeerHandler(id){if(!SEER_CONTRACTS[id])throw new Error('MISSING_SEER_HANDLER:'+id);}
