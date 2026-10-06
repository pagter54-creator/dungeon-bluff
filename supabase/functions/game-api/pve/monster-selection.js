import {choose} from './rng.js';
import {F1_MONSTER_DEFINITIONS} from './content-f1.js';
import {F2_MONSTER_DEFINITIONS} from './content-f2.js';
import {F3_MONSTER_DEFINITIONS} from './content-f3.js';

// Read live catalogue bindings only when selecting, after module initialization.
function catalogues(){return {1:F1_MONSTER_DEFINITIONS,2:F2_MONSTER_DEFINITIONS,3:F3_MONSTER_DEFINITIONS};}
export function selectMonsterWithFallback({run,floor,tier,rngKey,definitionsByFloor=catalogues()}){
 const floors=Object.keys(definitionsByFloor).map(Number).sort((a,b)=>a-b);
 const poolAt=f=>Object.values(definitionsByFloor[f]||{}).filter(m=>m.tier===tier&&m.floor===f);
 const current=poolAt(floor),used=new Set(run.usedMonsterIds||[]),unseen=pool=>pool.filter(m=>!used.has(m.id));
 function selected(pool,source,key=rngKey){
  const monster=choose(run,pool,key);
  run.monsterSelection={monsterSelectionSource:source,floor,tier,monsterId:monster.id,definitionFloor:monster.floor,depth:run.depth,roomNodeId:run.currentRoomNodeId||null};
  return monster;
 }
 if(tier==='BOSS'){
  const chosen=current.find(m=>m.id===run.chosenBossIds?.[floor]);
  if(chosen){run.monsterSelection={monsterSelectionSource:'CHOSEN_BOSS',floor,tier,monsterId:chosen.id,definitionFloor:chosen.floor,depth:run.depth,roomNodeId:run.currentRoomNodeId||null};return chosen;}
  if(!current.length)throw new Error('Current-floor boss catalogue is empty.');
  return selected(current,'CURRENT_FLOOR_BOSS_FALLBACK',rngKey+':boss-fallback');
 }
 if(!['NORMAL','ELITE'].includes(tier))throw new Error('Unsupported monster tier.');
 let pool=unseen(current);if(pool.length)return selected(pool,'CURRENT_FLOOR_UNSEEN');
 for(const previous of floors.filter(f=>f<floor).reverse()){
  pool=unseen(poolAt(previous));if(pool.length)return selected(pool,'PREVIOUS_FLOOR_UNSEEN',rngKey+':previous:'+previous);
 }
 // Priority 3 is intentionally restricted to current/previous floors. With
 // complete catalogues it is normally covered by priorities 1 and 2.
 pool=unseen(floors.filter(f=>f<=floor).flatMap(poolAt));
 if(pool.length)return selected(pool,'GLOBAL_UNSEEN',rngKey+':global-unseen');
 pool=floors.flatMap(poolAt);
 if(!pool.length)throw new Error('Same-tier monster catalogue is empty.');
 return selected(pool,'GLOBAL_REPEAT',rngKey+':global-repeat');
}
export function selectFloorMonster(run,floor,roomType,rngKey){
 const tier={NORMAL_COMBAT:'NORMAL',ELITE_COMBAT:'ELITE',BOSS:'BOSS'}[roomType];
 if(!tier)throw new Error('전투방 타입이 아닙니다.');
 return selectMonsterWithFallback({run,floor,tier,rngKey});
}
