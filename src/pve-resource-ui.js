const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function pveMageLimits(player){
 const aug=player?.augments||[],r=player?.publicResources||{};
 const manaMax=Number(r.manaMax)||(aug.includes('aug-092')||aug.includes('aug-099')?7:aug.includes('aug-091')?6:4);
 const reverse=aug.includes('aug-111');
 return {manaMax,amplifyMax:reverse?2:aug.includes('aug-099')?4:manaMax>=6?3:2,reverse};
}
export const pveAmplifyCost=level=>Math.abs(Number(level))===4?7:Math.abs(Number(level))*2;
export function pveMageChoices(player,selectedCardId){
 const {amplifyMax,reverse}=pveMageLimits(player),mana=Number(player?.publicResources?.mana)||0;
 const magnitudes=Array.from({length:amplifyMax},(_,i)=>i+1).filter(level=>mana>=pveAmplifyCost(level));
 if(!reverse)return magnitudes;
 const base=player?.cardPool?.find(c=>c.id===selectedCardId)?.baseNumber;
 return magnitudes.flatMap(level=>[level,-level]).filter(delta=>base==null||(base+delta>=0&&base+delta<=6));
}
const RESOURCE_LABELS={gunnerAccuracy:['정밀도',4],gunnerWeakness:['약점',3],knightAdvance:['전진',4],rogueCritical:['치명타',3],rogueLowestStreak:['최저 연속',3],rogueLeapStack:['도약',3],rogueLeapChain:['도약 연속',null],roguePoison:['독 중첩',3],berserkerVigor:['활력',3],berserkerWound:['상처 기억',3],berserkerBrawl:['난전',4],sneakyStack:['비열함',2],overheat:['과열',3],burstOutput:['전탄 출력',null],mageSymmetry117:['대칭',3],mageSymmetry120:['균형',4],qi:['기',3],exaltation:['고양',3],blood:['혈기',null],dominance:['지배',null],pact:['혈약',3],poison:['독',null],armor:['방어',null],veteranStreak:['노련함',null],unyielding:['불굴',null],revenge:['복수',null],stolenNumber:['저장 숫자',null],chain:['연쇄',null]};
export function pveResourceBadges(player){
 const r=player.publicResources||{},badges=[];
 if(player.characterId==='mage'){const limit=pveMageLimits(player);badges.push({label:limit.reverse?'역산술 최대':'증폭 최대',text:(limit.reverse?'±':'+')+limit.amplifyMax},{label:'마나 최대',text:limit.manaMax});}
 for(const [key,[label,baseMax]] of Object.entries(RESOURCE_LABELS))if(Number.isFinite(r[key])){const aug=player.augments||[];const inferred=key==='exaltation'?(aug.includes('aug-278')?4:3):key==='blood'?(aug.includes('aug-319')||aug.includes('aug-324')?8:6):key==='dominance'?(aug.includes('aug-308')?3:2):key==='stolenNumber'?(aug.includes('aug-198')?7:aug.includes('aug-192')?5:3):baseMax;const max=Number(r[key+'Max'])||inferred;badges.push({label,value:r[key],max,text:String(r[key])+(max?'/'+max:'')});}
 if(r.allInReady!=null)badges.push({label:'올인',text:r.allInReady?'발동 턴':r.allInTurnsUntil+'턴 뒤'});
 if(r.precisionShotPreserved)badges.push({label:'정밀 사격',text:'보존'});
 return badges;
}
export function pveResourceBadgesMarkup(badges=[]){
 return badges.length?'<div class="pve-resource-badges" aria-label="증강 자원">'+badges.map(b=>'<span><small>'+esc(b.label)+'</small><b>'+esc(b.text)+'</b>'+(b.max?'<i class="pve-resource-fill" style="--resource-fill:'+Math.max(0,Math.min(100,100*b.value/b.max))+'%"></i>':'')+'</span>').join('')+'</div>':'';
}
