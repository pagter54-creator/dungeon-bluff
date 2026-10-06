// Presentation consumes projected, resolved events only. No combat state mutations.
export const CLASS_THEMES=Object.freeze({
 adventurer:{glyph:'◇',color:'#c3ac82',name:'모험가'},
 warrior:{glyph:'⬡',color:'#cad2dd',name:'기사'},rogue:{glyph:'╱',color:'#85b39a',name:'도적'},
 mage:{glyph:'✺',color:'#7dcbd4',name:'마법사'},berserker:{glyph:'⚒',color:'#d56470',name:'광전사'},
 prophet:{glyph:'✧',color:'#a9b5e4',name:'예언가'},imp:{glyph:'✹',color:'#ed8796',name:'임프'},
 gambler:{glyph:'⚄',color:'#d0b779',name:'도박사'},gunner:{glyph:'⌖',color:'#d6b28a',name:'총잡이'},
 martial_artist:{glyph:'✴',color:'#e2b28c',name:'무투가'},vampire:{glyph:'牙',color:'#cb5778',name:'흡혈귀'},
 demon_swordsman:{glyph:'╳',color:'#a84e70',name:'귀검사'},twins:{glyph:'☀☾',color:'#c4acd8',name:'쌍둥이'}
});
export const MONSTER_THEMES=Object.freeze({
  "f1_armored_boar": {
    "name": "철갑 멧돼지",
    "glyph": "⬡",
    "color": "#c3b598",
    "motif": "armored-boar",
    "boss": false,
    "activationAngle": 0,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f1_coward_hunter": {
    "name": "비겁한 사냥꾼",
    "glyph": "➶",
    "color": "#c99875",
    "motif": "coward-hunter",
    "boss": false,
    "activationAngle": 37,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f1_rusty_ballista": {
    "name": "녹슨 발리스타",
    "glyph": "⌖",
    "color": "#a88b65",
    "motif": "rusty-ballista",
    "boss": false,
    "activationAngle": 74,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f1_gate_guard_dog": {
    "name": "성문 경비견",
    "glyph": "♜",
    "color": "#ccac7b",
    "motif": "gate-guard-dog",
    "boss": false,
    "activationAngle": 111,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f1_sewer_rat_swarm": {
    "name": "하수도 쥐떼",
    "glyph": "⋰",
    "color": "#aaab83",
    "motif": "sewer-rat-swarm",
    "boss": false,
    "activationAngle": 148,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f1_graveyard_sentinel": {
    "name": "묘지 파수병",
    "glyph": "⚑",
    "color": "#99a9af",
    "motif": "graveyard-sentinel",
    "boss": false,
    "activationAngle": 5,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f1_chain_jailer": {
    "name": "사슬 간수",
    "glyph": "⛓",
    "color": "#9fa7bb",
    "motif": "chain-jailer",
    "boss": false,
    "activationAngle": 42,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f1_echo_bat": {
    "name": "메아리 박쥐",
    "glyph": "◎",
    "color": "#b89bc9",
    "motif": "echo-bat",
    "boss": false,
    "activationAngle": 79,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f1_siege_captain": {
    "name": "공성대장",
    "glyph": "⚒",
    "color": "#c68b74",
    "motif": "siege-captain",
    "boss": false,
    "activationAngle": 116,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f1_iron_bell_keeper": {
    "name": "철종지기",
    "glyph": "◐",
    "color": "#c0a6c6",
    "motif": "iron-bell-keeper",
    "boss": false,
    "activationAngle": 153,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f1_fallen_lord": {
    "name": "몰락한 성주",
    "glyph": "♛",
    "color": "#b481a6",
    "motif": "fallen-lord",
    "boss": true,
    "activationAngle": 10,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f1_gatebreaker_colossus": {
    "name": "성문 파쇄 거상",
    "glyph": "▣",
    "color": "#ca9579",
    "motif": "gatebreaker-colossus",
    "boss": true,
    "activationAngle": 47,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f2_cursed_prophet": {
    "name": "저주받은 예언자",
    "glyph": "✧",
    "color": "#ac94cb",
    "motif": "cursed-prophet",
    "boss": false,
    "activationAngle": 84,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f2_hungry_slime": {
    "name": "굶주린 슬라임",
    "glyph": "●",
    "color": "#a6ba6d",
    "motif": "hungry-slime",
    "boss": false,
    "activationAngle": 121,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f2_spore_acolyte": {
    "name": "포자 시종",
    "glyph": "❋",
    "color": "#9db895",
    "motif": "spore-acolyte",
    "boss": false,
    "activationAngle": 158,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f2_swamp_leech": {
    "name": "늪지 흡혈충",
    "glyph": "∿",
    "color": "#b57883",
    "motif": "swamp-leech",
    "boss": false,
    "activationAngle": 15,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f2_mycelium_doppelganger": {
    "name": "균사 도플갱어",
    "glyph": "◇",
    "color": "#9cb4aa",
    "motif": "mycelium-doppelganger",
    "boss": false,
    "activationAngle": 52,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f2_wisp_lamplighter": {
    "name": "늪불 등불지기",
    "glyph": "♨",
    "color": "#99b9b0",
    "motif": "wisp-lamplighter",
    "boss": false,
    "activationAngle": 89,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f2_thorn_dryad": {
    "name": "가시 드라이어드",
    "glyph": "✣",
    "color": "#b3938e",
    "motif": "thorn-dryad",
    "boss": false,
    "activationAngle": 126,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f2_chaos_goblin": {
    "name": "혼돈 고블린",
    "glyph": "✹",
    "color": "#c5a077",
    "motif": "chaos-goblin",
    "boss": false,
    "activationAngle": 163,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f2_rootjaw_hydra": {
    "name": "뿌리턱 히드라",
    "glyph": "Ψ",
    "color": "#8da78c",
    "motif": "rootjaw-hydra",
    "boss": false,
    "activationAngle": 20,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f2_thread_witch": {
    "name": "실타래 마녀",
    "glyph": "⌁",
    "color": "#bd9fac",
    "motif": "thread-witch",
    "boss": false,
    "activationAngle": 57,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f2_rottenheart_ancient": {
    "name": "썩은심장 고목",
    "glyph": "♣",
    "color": "#a39b79",
    "motif": "rottenheart-ancient",
    "boss": true,
    "activationAngle": 94,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f2_moon_eating_witch": {
    "name": "달을 삼킨 마녀",
    "glyph": "☾",
    "color": "#a4a7d1",
    "motif": "moon-eating-witch",
    "boss": true,
    "activationAngle": 131,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f3_greed_mimic": {
    "name": "탐욕의 미믹",
    "glyph": "◈",
    "color": "#c5b17c",
    "motif": "greed-mimic",
    "boss": false,
    "activationAngle": 168,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f3_royal_tax_collector": {
    "name": "왕실 세금징수관",
    "glyph": "¤",
    "color": "#c4a086",
    "motif": "royal-tax-collector",
    "boss": false,
    "activationAngle": 25,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f3_abyss_duelist": {
    "name": "심연의 결투가",
    "glyph": "†",
    "color": "#918bad",
    "motif": "abyss-duelist",
    "boss": false,
    "activationAngle": 62,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f3_black_choir": {
    "name": "검은 성가대",
    "glyph": "♫",
    "color": "#b195bb",
    "motif": "black-choir",
    "boss": false,
    "activationAngle": 99,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f3_skillfeed_familiar": {
    "name": "기술먹이 사역마",
    "glyph": "✦",
    "color": "#b5a2c2",
    "motif": "skillfeed-familiar",
    "boss": false,
    "activationAngle": 136,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f3_abyss_archivist": {
    "name": "심연의 기록관",
    "glyph": "▤",
    "color": "#9fa4c5",
    "motif": "abyss-archivist",
    "boss": false,
    "activationAngle": 173,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f3_royal_appraiser": {
    "name": "왕실 감정관",
    "glyph": "⚖",
    "color": "#bba884",
    "motif": "royal-appraiser",
    "boss": false,
    "activationAngle": 30,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f3_execution_golem": {
    "name": "처형 골렘",
    "glyph": "◆",
    "color": "#bf8990",
    "motif": "execution-golem",
    "boss": false,
    "activationAngle": 67,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  },
  "f3_abyss_auditor": {
    "name": "심연의 감사관",
    "glyph": "◉",
    "color": "#a09cc0",
    "motif": "abyss-auditor",
    "boss": false,
    "activationAngle": 104,
    "sealShape": "circle",
    "suppressionGlyph": "⊘"
  },
  "f3_null_choir_priest": {
    "name": "무효의 종사제",
    "glyph": "⊘",
    "color": "#a5a6af",
    "motif": "null-choir-priest",
    "boss": false,
    "activationAngle": 141,
    "sealShape": "diamond",
    "suppressionGlyph": "✕"
  },
  "f3_abyss_king": {
    "name": "심연왕",
    "glyph": "♚",
    "color": "#a787bf",
    "motif": "abyss-king",
    "boss": true,
    "activationAngle": 178,
    "sealShape": "square",
    "suppressionGlyph": "◇"
  },
  "f3_masked_queen": {
    "name": "가면의 여왕",
    "glyph": "◒",
    "color": "#bd8aa8",
    "motif": "masked-queen",
    "boss": true,
    "activationAngle": 35,
    "sealShape": "bars",
    "suppressionGlyph": "✓"
  }
});
const SKILLS={toughness:['강인함','protect'],amplify:['증폭','number'],reverse_math:['역산','number'],revelation:['계시','recover'],precision_shot:['정밀 사격','burst'],full_burst:['전탄발사','burst'],blood_command:['피의 명령','swap'],ghost_slash:['귀참','slash'],soul_slash:['귀참','slash'],number_steal:['슬쩍','steal'],acrobatics:['곡예','parity']};
const EVENT_SKILLS={
 PROPHET_REVELATION_GAINED:['계시 획득','predict'],PROPHET_PAST_FRAGMENT_CREATED:['과거의 편린','number'],VAMPIRE_THRALL_CREATED:['권속 생성','mark'],VAMPIRE_THRALL_CONSUMED:['권속 소비','mark'],
 CARD_RECOVERED:['카드 복구','recover'],THRALL_MARKED:['권속','mark'],DEMON_TRANSFORMED:['귀화','transform'],
 DEMON_TRANSFORMATION_ENDED:['귀화 종료','transform'],REVELATION_USED:['계시','predict'],FATE_MANIPULATOR_USED:['운명 조작','recover'],
 ACROBATICS_USED:['곡예','parity'],TRANSFUSION_USED:['수혈','heal'],PLAYER_HEALED:['회복','heal'],
 VAMPIRE_COMMAND_COLLISION_PROTECTED:['명령 보호','protect'],DAMAGE_REDIRECTED:['수호','protect'],
 GHOST_SLASH_LEVEL_UP:['봉인 해제','transform'],DEVOUR_GAINED:['포식','resource'],
 BERSERKER_COLLISION_HEAL:['혈열','heal'],BERSERKER_REVENGE_GAINED:['복수','resource'],
 GUARDIAN_WALL_RESCUE:['성벽','protect'],PREDICTION_SUCCEEDED:['예측 적중','predict']
};
export function skillCues(result,players=[]){
 const byId=new Map(players.map(p=>[p.playerId,p])),out=[];
 const add=(actor,target,label,kind,phase,value='',success=true)=>{
  if(!actor||!byId.has(actor))return;
  out.push({actorId:actor,targetId:target||actor,label,kind,phase,value:String(value),success,
   theme:CLASS_THEMES[byId.get(actor).characterId]||CLASS_THEMES.adventurer});
 };
 for(const e of result.presentationMutations||[]){
  const kind=e.effectId==='vampire-blood-command'?'swap':String(e.effectId).includes('steal')?'steal':'number';
  add(e.actorId,e.targetId,kind==='swap'?'피의 명령':kind==='steal'?'슬쩍':'숫자 재작성',kind,kind==='number'?'selfModify':'mutation',
   Number.isFinite(e.before)&&Number.isFinite(e.after)?e.before+' → '+e.after:kind==='swap'?e.actorBefore+' ⇄ '+e.targetBefore:kind==='steal'?'숫자 강탈':'변경');
  if(kind==='number'&&out.length){out[out.length-1].beforeValue=e.before;out[out.length-1].afterValue=e.after;}
 }
 for(const c of result.cards||[]){
  const s=SKILLS[c.skillUsed];
  const prev=out.length;
  if(s&&!['blood_command','number_steal'].includes(c.skillUsed)&&!(['amplify','reverse_math'].includes(c.skillUsed)&&(result.presentationMutations||[]).some(e=>e.actorId===c.playerId)))add(c.playerId,c.playerId,s[0],s[1],c.skillUsed==='toughness'?'protection':['amplify','reverse_math'].includes(c.skillUsed)?'selfModify':'attack',['amplify','reverse_math'].includes(c.skillUsed)?c.baseNumber+' → '+c.finalNumber:c.valid?'유효':'무효',Boolean(c.valid));
  if(out.length>prev&&['amplify','reverse_math'].includes(c.skillUsed)){out[out.length-1].beforeValue=c.baseNumber;out[out.length-1].afterValue=c.finalNumber;}
  if(c.allIn)add(c.playerId,c.playerId,'올인','burst','attack',c.valid?'성공':'무효',Boolean(c.valid));
  if(c.collisionImmune&&c.valid&&c.collisionGroupSize>1)add(c.playerId,c.playerId,'충돌 차단','protect','protection','유효');
 }
 for(const e of result.events||[]){
  const s=EVENT_SKILLS[e.type];if(!s)continue;
  const actor=e.ownerVampireId||e.redirectSource||e.actorId||e.ownerId||e.sourcePlayerId||e.playerId;
  add(actor,e.targetPlayerId||e.targetId||e.thrallPlayerId||e.originalTarget||e.playerId,s[0],s[1],
   ['protect'].includes(s[1])?'protection':'aftermath',e.type==='PROPHET_PAST_FRAGMENT_CREATED'?'편린 '+e.value:e.amount>0?'+'+e.amount:e.type==='CARD_RECOVERED'?'복구 완료':'완료');
 }
 for(const e of result.skillInterventions||[]){
  if(['PREDICTION_RESULT','PRECISION_PRESERVED'].includes(e.kind))add(e.actorId,e.actorId,e.kind==='PREDICTION_RESULT'?'예측':'정밀 보호',e.kind==='PREDICTION_RESULT'?'predict':'protect',e.kind==='PREDICTION_RESULT'?'aftermath':'protection',e.success?'성공':'실패',Boolean(e.success));
 }
 // Semantic summaries preserve phase, actor, target and outcome; never merge opponents.
 const groups=new Map();
 for(const cue of out){const key=[cue.phase,cue.actorId,cue.targetId,cue.kind,cue.label,cue.success,cue.value].join('|');
  if(groups.has(key))groups.get(key).count++;else groups.set(key,{...cue,count:1});
 }
 return [...groups.values()];
}
export function monsterCue(before,result,after){
 if(!before)return null;
 const theme=MONSTER_THEMES[before.id]||{name:before.name,glyph:'◇',color:'#a49bb5',motif:'unknown',boss:false};
 const authoritative=result.monsterPattern;
 if(authoritative&&['ACTIVE','BLOCKED','PARTIAL','WAIT'].includes(authoritative.outcome)){
  return {theme,outcome:authoritative.outcome,label:authoritative.label,detail:authoritative.detail||'',targetIds:[...(authoritative.targetIds||[])]};
 }
 const p=before.presentation||{},cards=result.cards||[],valid=cards.filter(c=>c.valid),events=result.events||[];
 const has=t=>events.some(e=>e.type===t),type=before.intent?.type,id=before.id;
 let outcome='ACTIVE',label='패턴 발동';
 const blocked=()=>{outcome='BLOCKED';label='저지 성공';},waiting=()=>{outcome='WAIT';label='준비 중';};
 if(after?.hp<=0){blocked();label='격파 · 패턴 종료';}
 else if(has('EXECUTION_CANCELLED'))blocked();
 else if(id==='f3_execution_golem'&&!has('EXECUTION_FAILED'))waiting();
 else if(['f1_coward_hunter','f1_rusty_ballista','f1_siege_captain'].includes(id)){
  if(type==='CHARGE')waiting();else if(valid.length>=3)blocked();
 }else if(id==='f1_gatebreaker_colossus'){
  const progress=(Number(p.progress)||0)+(Number(result.totalDamage)||0);
  if((p.countdown??3)>1)waiting();else if(progress>=(p.threshold??30))blocked();
 }else if(id==='f2_swamp_leech'&&valid.some(c=>c.playerId===p.targetPlayerId))blocked();
 else if(id==='f2_moon_eating_witch'&&!has('MOON_THRESHOLD_FAILED'))blocked();
 else if(id==='f2_thread_witch'){
  const e=events.find(e=>e.type==='THREAD_RESOLVED');if(!e)waiting();else if(e.broken)blocked();
 }else if(id==='f2_rootjaw_hydra'&&has('HYDRA_HEAD_REMOVED')){outcome='PARTIAL';label='머리 제거 · 부분 저지';}
 else if(id==='f3_royal_tax_collector'&&!has('TAX_COLLECTED'))blocked();
 else if(id==='f3_black_choir'&&new Set(valid.map(c=>c.finalNumber)).size>=3)blocked();
 else if(id==='f3_abyss_duelist'){
  const target=p.targetPlayerId||before.intent?.payload?.targetPlayerId;
  if(target&&valid.some(c=>c.playerId===target&&c.finalNumber>=4))blocked();
 }else if(id==='f2_hungry_slime'&&result.totalDamage>=8){blocked();label='성장 저지';}
 else if(id==='f1_armored_boar'&&valid.length>0){outcome='PARTIAL';label='철갑 파쇄';}
 else if(id==='f1_graveyard_sentinel'&&valid.length>=3)blocked();
 else if(id==='f1_fallen_lord'&&valid.length>=3){outcome='PARTIAL';label='지배 약화';}
 else if(['f1_chain_jailer','f1_iron_bell_keeper','f2_mycelium_doppelganger','f3_abyss_archivist','f3_royal_appraiser','f3_null_choir_priest'].includes(id)){
  const affected=valid.filter(c=>c.monsterDamagePenalty>0).length;
  if(!affected)blocked();else if(affected<valid.length){outcome='PARTIAL';label='일부 공격 약화';}else label='공격 약화';
 }else if(['f2_cursed_prophet','f2_spore_acolyte','f2_rottenheart_ancient'].includes(id)){
  const applied=events.filter(e=>['CURSE_APPLIED','SPORE_APPLIED','CORRUPTION_APPLIED'].includes(e.type));
  if(!applied.length)blocked();else if(applied.length<cards.length){outcome='PARTIAL';label='일부 표적 중첩';}else label='중첩 적용';
 }else if(['f2_wisp_lamplighter','f2_thorn_dryad','f3_greed_mimic'].includes(id)){
  const damage=events.filter(e=>e.type==='PLAYER_DAMAGED'&&e.rawDamage>0);
  if(!damage.length)blocked();else {outcome='PARTIAL';label='표적 반격';}
 }else if(id==='f2_chaos_goblin'){
  if(!valid.some(c=>c.monsterDamagePenalty>0)&&!events.some(e=>e.type==='PLAYER_DAMAGED'&&e.rawDamage>0))blocked();
  else {outcome='PARTIAL';label='혼돈 조건 발동';}
 }else if(id==='f1_sewer_rat_swarm'||id==='f1_echo_bat'){
  if(type==='CHARGE'){waiting();label='중첩 판정';}
 }else if(id==='f3_skillfeed_familiar'){label=has('SKILL_FEED')?'기술 흡수':'기술먹이 판정';}
 else if(id==='f3_abyss_auditor'){label='감사 판정';}
 else if(id==='f3_abyss_king'){label='적응 판정';}
 else if(id==='f3_masked_queen'){label='가면 판정';}
 else if(type==='CHARGE'){waiting();label='패턴 준비';}
 const damage=events.filter(e=>e.type==='PLAYER_DAMAGED'&&e.rawDamage>0);
 if(outcome==='ACTIVE'&&damage.length&&damage.some(e=>e.preventedDamage>0)){
  if(damage.every(e=>e.amount===0)){outcome='BLOCKED';label='피해 방어 성공';}
  else {outcome='PARTIAL';label='패턴 발동 · 일부 방어';}
 }
 return {theme,outcome,label,targetIds:[...new Set(damage.map(e=>e.playerId))],detail:events.find(e=>e.type==='MONSTER_BEHAVIOR_RESOLVED')?.presentation?.statusText||after?.presentation?.statusText||p.statusText||''};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function patternPanelMarkup(monster,players=[]){
 if(!monster)return '';
 const t=MONSTER_THEMES[monster.id]||{glyph:'◇',color:'#a49bb5',motif:'unknown'},p=monster.presentation||{};
 const ids=[monster.intent?.payload?.targetPlayerId,p.targetPlayerId,p.threatPlayerId,...(p.linkedPlayerIds||[])].filter(Boolean);
 const targets=[...new Set(ids)].map(id=>{const player=players.find(x=>x.playerId===id);return player?String(player.seat+1)+'번 자리':'표적';});
 return '<div class="intent pve-pattern-panel" style="--cue-color:'+esc(t.color)+'" data-motif="'+esc(t.motif)+'" role="region" aria-label="몬스터 패턴"><header><i aria-hidden="true">'+esc(t.glyph)+'</i><b>'+esc(t.name||monster.name)+'</b><span data-pattern-result>예고</span></header><p>'+esc(monster.ruleSummary||p.ruleSummary||monster.intent?.telegraphText)+'</p><small>표적 · '+esc(targets.join(' / ')||(monster.intent?.type==='AOE_DAMAGE'?'전원':'조건에 따라 결정'))+'</small><div data-pattern-progress>'+esc(p.statusText||'이번 턴 판정 대기')+'</div></div>';
}
// A->B->C->D->E. Different actors in a phase run in parallel; three waves max.
// Same actor's remaining chain is retained in the final wave as a readable summary.
export function cueWaves(cues){
 const actors=new Map();for(const c of cues){const row=actors.get(c.actorId)||[];row.push(c);actors.set(c.actorId,row);}
 const waves=[];
 for(let i=0;i<3;i++){const wave=[];for(const row of actors.values()){
  if(!row[i])continue;wave.push(i===2&&row.length>3?{...row[i],label:[...new Set(row.slice(2).map(c=>c.label))].slice(0,3).join(' · ')+([...new Set(row.slice(2).map(c=>c.label))].length>3?' · 추가 효과':''),count:row.slice(2).reduce((n,c)=>n+c.count,0),targetIds:[...new Set(row.slice(2).map(c=>c.targetId))],afterValue:row.at(-1).afterValue}:row[i]);
 }if(wave.length)waves.push(wave);}
 return waves;
}

export function activationCues(before,after){
 if(before?.id!==after?.id||before?.combat?.id!==after?.combat?.id)return [];
 const cues=[];
 for(const p of after.players||[]){
  const old=before.players?.find(x=>x.playerId===p.playerId),a=p.publicResources||{},b=old?.publicResources||{};
  const add=(label,kind,value)=>cues.push({actorId:p.playerId,targetId:p.playerId,label,kind,value,phase:'activation',success:true,count:1,theme:CLASS_THEMES[p.characterId]||CLASS_THEMES.adventurer});
  if(a.transformationActive&&!b.transformationActive)add('귀화','transform','봉인 해제');
  if(p.characterId==='twins'&&a.parity!==b.parity)add('곡예','parity',a.parity?'홀수':'짝수');
  if(p.characterId==='prophet'&&(a.revelation??a.revelationStacks)<(b.revelation??b.revelationStacks))add('계시','predict','개입');
 }
 return cues;
}
