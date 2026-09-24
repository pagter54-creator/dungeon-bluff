import { CHARACTER_CATALOG } from './character-guide-data.js';
import { skinPortrait } from './skins.js';
import { deckLabel, html } from './character-ui.js';

const order=['adventurer','warrior','rogue','mage','berserker','seer','imp','gambler','gunner','fighter','vampire','demonsword'];

// Long-form guide copy is separate from the short in-battle skill descriptions.
const guide={
  adventurer:{difficulty:1,stats:[2,4.5,.5,1],trait:'안정적인 경제·누적 점수',text:[
    '골드 보상을 받을 때마다<br><strong>해당 보상에 +1G</strong>가 추가됩니다.',
    '몬스터 전투에서 카드가 중복되지 않고 통과하면<br>피해와 별개로 <strong>점수 +1</strong>을 획득합니다.'
  ]},
  warrior:{difficulty:3,stats:[3.5,2.5,5,3],trait:'상대의 강한 카드를 일부러 받아치는 카운터',text:[
    '사이클이 시작될 때마다<br><strong>강인함 +1</strong>을 충전합니다. 최대 2까지 저장할 수 있습니다.',
    '강인함 1을 사용하면<br><strong>카드가 중복되어도 내 행동은 그대로 유효</strong>합니다.',
    '같은 숫자를 낸 상대의 카드는<br>평소처럼 중복으로 무효 처리됩니다.'
  ]},
  rogue:{difficulty:3,stats:[3.5,3.5,2.5,4],trait:'낮은 카드를 가치 있게 만드는 역발상',text:[
    '내 카드가 <strong>혼자서 가장 낮은 유효 카드</strong>라면 효과가 발동합니다.',
    '비전투에서는<br><strong>점수 +5 · 골드 +2G</strong>.',
    '몬스터 전투에서는<br><strong>해당 공격의 피해가 5</strong>가 됩니다.',
    '봉인·장갑 등 공격을 무효화하는 효과는 그대로 적용됩니다.'
  ]},
  mage:{difficulty:4,stats:[4.5,4.5,2.5,4],trait:'마나를 통한 숫자 조작과 타이밍 설계',text:[
    '매 턴 <strong>마나 +1</strong>. 최대 4까지 저장합니다.',
    '「증폭」으로 마나 2를 사용하면 <strong>카드 숫자 +1</strong>,<br>마나 4를 사용하면 <strong>카드 숫자 +2</strong>.',
    '증폭된 숫자는 단순 추가 피해가 아니라<br><strong>실제 카드 숫자 자체가 변경된 것처럼 판정</strong>됩니다.',
    '중복, 피해, 이벤트 판정 모두<br>변경된 숫자를 기준으로 계산합니다.'
  ]},
  berserker:{difficulty:4,stats:[5,2.5,1.5,4],trait:'체력을 태워 지속적으로 높은 피해 누적',text:[
    '유효 공격에 성공하면<br><strong>피해 +1</strong>, 대신 <strong>HP 1을 소모</strong>합니다.',
    '이 효과로는 HP가 1 아래로 내려가지 않습니다.',
    '카드가 중복되면 <strong>HP 1 회복</strong>.<br>단, 이 회복으로는 <strong>HP 2까지만</strong> 회복할 수 있습니다.',
    '기절하면 추가로 <strong>-3점</strong>을 잃습니다.',
    '중복 여부는 원래 카드 숫자로 판정하며,<br>비전투에서는 피해 +1 효과가 적용되지 않습니다.'
  ]},
  seer:{difficulty:4,stats:[2,5,3,2],trait:'정보 우위와 카드 재사용, 의도적 중복',text:[
    '카드가 중복되면 <strong>계시 1</strong>을 획득합니다.<br>계시는 최대 1개만 보유할 수 있습니다.',
    '카드를 고르기 전에 계시를 사용하면<br><strong>다른 플레이어의 선택 카드를 먼저 확인</strong>할 수 있습니다.',
    '또한 이번 사이클에서 이미 사용한 카드 중<br><strong>1장을 무작위로 손패에 되돌립니다.</strong>',
    '계시를 사용한 턴에도 카드가 중복되면<br><strong>계시를 다시 획득</strong>할 수 있습니다.',
    '정상 통과했다면 계시는 돌아오지 않습니다.'
  ]},
  imp:{difficulty:3,stats:[1.5,3,5,1],trait:'중복 자체를 상대 손실로 바꾸는 방해꾼',text:[
    '카드가 중복되면<br><strong>함께 겹친 모든 상대에게서 각각 1점씩 강탈</strong>합니다.',
    '점수가 남아 있는 상대에게서만<br>점수를 빼앗을 수 있습니다.'
  ]},
  gambler:{difficulty:4.5,stats:[4.5,5,1,4.5],trait:'덱 카운팅과 6·7 장전으로 고점을 준비',text:[
    '도박사는 12장으로 구성된 전용 덱에서<br><strong>매 턴 카드 2장을 뽑아 하나를 선택</strong>합니다.',
    '턴이 끝나면 1~5 카드와 사용하지 않은 6·7은<br><strong>버린 카드 덱으로 이동</strong>합니다.',
    '실제로 사용한 <strong>6과 7만 덱에서 제거</strong>됩니다.',
    '1~5 중 서로 다른 숫자 <strong>3종을 제출하면 6을 충전</strong>하고,<br>1~5를 <strong>모두 한 번씩 제출하면 7을 충전</strong>합니다.',
    '6과 7은 각각 <strong>최대 2장까지</strong> 보유할 수 있습니다.',
    '뽑을 카드 덱이 부족해지면<br>버린 카드 덱을 다시 섞어 이어서 뽑습니다.'
  ]},
  gunner:{difficulty:4,stats:[4.5,3,1,5],trait:'전탄발사로 순간적으로 피해를 압축',text:[
    '사이클마다 1회 「전탄발사」를 사용할 수 있습니다.',
    '선택한 카드가 통과하면<br><strong>남은 손패까지 모두 합산해 한 번에 사용</strong>하고,<br>즉시 새로운 사이클을 시작합니다.',
    '중복으로 실패하면 <strong>HP -1</strong>.<br>이 피해로 기절할 수도 있습니다.'
  ]},
  fighter:{difficulty:4,stats:[5,3.5,1,3.5],trait:'연격을 유지하며 누적 화력을 키움',text:[
    '몬스터 전투에서 직전 카드보다 높은 카드로 공격에 성공하면<br><strong>연격 +1</strong>. 최대 3까지 쌓입니다.',
    '공격할 때 <strong>현재 연격만큼 추가 피해</strong>를 줍니다.',
    '카드가 중복되거나 몬스터를 처치하면<br>연격은 0으로 초기화됩니다.',
    '전투 중 중복으로 실패하면 <strong>추가로 -1점</strong>을 잃습니다.'
  ]},
  vampire:{difficulty:5,stats:[2.5,5,5,3.5],trait:'권속을 만들고 결정적인 순간 카드를 강탈·교환',text:[
    '카드가 중복되면, 겹친 상대 중<br><strong>점수가 가장 높은 1명에게 권속 표식</strong>을 남깁니다.',
    '권속의 선택을 확인한 뒤 「피의 명령」을 사용하면,<br><strong>중복 판정 전에 나와 권속의 최종 카드 숫자를 서로 바꿉니다.</strong>'
  ]},
  demonsword:{difficulty:4.5,stats:[5,4,.5,5],trait:'포식 성장과 막타를 통한 장기 스노우볼',text:[
    '몬스터에게 유효 공격을 하거나 이벤트에서 유효 카드로 통과하면 <strong>포식 +1</strong>.',
    '처치 턴에 기여하면 <strong>총 +3</strong>,<br>그중 공동 최고 피해라면 <strong>총 +5</strong>를 획득합니다.',
    '포식 <strong>8마다 귀참 레벨이 1 상승</strong>합니다.<br>귀참은 사이클당 1회, <strong>현재 레벨 +1만큼 추가 피해</strong>를 줍니다.<br>사이클 도중 레벨업하면 사용한 귀참도 즉시 다시 사용할 수 있습니다.',
    '포식은 소모되지 않으며, 성장 상한도 없습니다.'
  ]}
};

const traits=['딜링','운영','견제','한방'];
function meter(label,value){
  const blocks=Array.from({length:5},(_,index)=>`<i class="${value>=index+1?'full':value>index?'half':''}"></i>`).join('');
  return `<div class="character-guide-meter" aria-label="${label} ${value}/5"><span>${label}</span><span class="character-guide-blocks" aria-hidden="true">${blocks}</span><b>${value.toFixed(1)}</b></div>`;
}
function difficulty(value){
  return `${'★'.repeat(Math.floor(value))}${value%1?'½':''}${'☆'.repeat(5-Math.ceil(value))}`;
}

export function characterGuide(){
  return `<div class="eyebrow">CHARACTER CODEX</div><h2>캐릭터 도감</h2><p>카드 구성과 스킬, 캐릭터별 플레이 성향을 확인하세요.</p><div class="character-guide-list">${order.map(id=>{
    const character=CHARACTER_CATALOG[id],detail=guide[id],skill=character.definition.skill;
    const type=skill.type==='hybrid'?'패시브 · 액티브':skill.type==='active'?'액티브':'패시브';
    return `<article class="character-guide-entry" style="--character-color:${html(character.definition.color)}"><div class="character-guide-heading"><span class="character-guide-portrait">${skinPortrait(id)}</span><div><h3>${html(character.display_name)}</h3><small>${html(character.definition.role)}</small></div></div><div class="character-guide-profile"><div class="character-guide-difficulty"><span>난이도</span><strong aria-label="난이도 ${detail.difficulty}/5">${difficulty(detail.difficulty)}</strong></div>${detail.stats.map((value,index)=>meter(traits[index],value)).join('')}<p>${html(detail.trait)}</p></div><div class="character-guide-deck"><b>카드 구성</b><div class="character-guide-cards">${character.deck.map(value=>`<span>${value}</span>`).join('')}</div><small>${html(deckLabel(character))}</small></div><div class="character-guide-skill"><b>${html(type)} · ${html(skill.name)}</b>${detail.text.map(paragraph=>`<p>${paragraph}</p>`).join('')}</div></article>`;
  }).join('')}</div>`;
}
