# PVE 전투 UX 강화
기준: PR #29 HEAD aacd03136b1019ed74660f7373c7a2b3894fe8f4. GitHub 직접 수정.

## 추가 지점 / 구조
- 선택 화면: 기존 몬스터 패널 바로 아래 패턴 예고 패널. 조건, 공개 표적, 서버 공개 진행 상태.
- 공개 후 중복 처리 전: 숫자 변경(교환/훔치기 이전) 및 교환/훔치기, 충돌 보호 개입.
- 중복 처리 후 공격 전: 주요 공격 스킬.
- 플레이어 피해 적용 전: 몬스터 판정 → 발동/저지/부분 결과.
- 턴 종료 전: 카드 복구/회복/표식/자원 변화.
- 직접 활성화 응답 후: 귀화/곡예/계시.
판정 로직은 변경하지 않는다. 서버 read-only presentation mapper가 penalty state reset 이전에 패턴 결과 메타데이터를 기록한다. adapter가 projected turn result를 순수 cue로 변환하고 reveal의 선택적 checkpoint가 DOM controller에 전달한다. 기존 PVP 호출은 기본 no-op callback.
스킬: actor 강조 → 스킬 배지 → target 강조 → kind별 변화 → 결과. 정상 680ms.
몬스터: 예고 → 판정 220ms → 결과 650ms(보스 850ms). 총 870/1070ms.
동일 phase의 서로 다른 actor는 병렬. 같은 actor는 순차 최대 세 wave. 세 번째 wave에 남은 라벨/횟수 요약. phase 간 순서 유지. 배열/원본 상태 변경 없음.
controller는 visibility change, party DOM 교체, finally dispose 시 대기/노드/애니메이션 정리. reconnect snapshot 자체로 새 cue를 생성하지 않는다.

## 직업별

기사: 금속 방패/충돌 차단/피해 수호. 마법사: 청옥 룬/숫자 before→after.
예언가: 예지 별/복구/예측 적중·실패(결과만 공개). 총잡이: 조준선/정밀 사격·충돌 보호/전탄 반동.
흡혈귀: 혈액 색/교환/권속/수혈/명령 보호. 귀검사: 검붉은 참격/귀화/포식/봉인 해제.
도적: 녹색 그림자 베기. 광전사: 붉은 분노/혈열/복수.
임프: 붉은 스파크/숫자 강탈. 도박사: 주사위/칩 색/올인.
무투가: 타격선/연격 색. 쌍둥이: 해달/홀짝 교차.
모험가: 기존 톤에 맞춘 중립 배지.
모든 클래스 theme가 있으나 배지는 실제 공개 카드/이벤트가 있을 때만 생성한다. 미발동 효과를 재현하지 않는다.

## 몬스터 적용 목록
각 registry는 고유 glyph/color/motif/activation angle 및 seal shape/suppression glyph를 제공한다.
|몬스터|예고 아이콘|발동|저지|
|---|---|---|---|
|철갑 멧돼지|⬡|armored-boar / undefined 확산|undefined 봉인 수축|
|비겁한 사냥꾼|➶|coward-hunter / undefined 확산|undefined 봉인 수축|
|녹슨 발리스타|⌖|rusty-ballista / undefined 확산|undefined 봉인 수축|
|성문 경비견|♜|gate-guard-dog / undefined 확산|undefined 봉인 수축|
|하수도 쥐떼|⋰|sewer-rat-swarm / undefined 확산|undefined 봉인 수축|
|묘지 파수병|⚑|graveyard-sentinel / undefined 확산|undefined 봉인 수축|
|사슬 간수|⛓|chain-jailer / undefined 확산|undefined 봉인 수축|
|메아리 박쥐|◎|echo-bat / undefined 확산|undefined 봉인 수축|
|공성대장|⚒|siege-captain / undefined 확산|undefined 봉인 수축|
|철종지기|◐|iron-bell-keeper / undefined 확산|undefined 봉인 수축|
|몰락한 성주|♛|fallen-lord / undefined 확산|undefined 봉인 수축|
|성문 파쇄 거상|▣|gatebreaker-colossus / undefined 확산|undefined 봉인 수축|
|저주받은 예언자|✧|cursed-prophet / undefined 확산|undefined 봉인 수축|
|굶주린 슬라임|●|hungry-slime / undefined 확산|undefined 봉인 수축|
|포자 시종|❋|spore-acolyte / undefined 확산|undefined 봉인 수축|
|늪지 흡혈충|∿|swamp-leech / undefined 확산|undefined 봉인 수축|
|균사 도플갱어|◇|mycelium-doppelganger / undefined 확산|undefined 봉인 수축|
|늪불 등불지기|♨|wisp-lamplighter / undefined 확산|undefined 봉인 수축|
|가시 드라이어드|✣|thorn-dryad / undefined 확산|undefined 봉인 수축|
|혼돈 고블린|✹|chaos-goblin / undefined 확산|undefined 봉인 수축|
|뿌리턱 히드라|Ψ|rootjaw-hydra / undefined 확산|undefined 봉인 수축|
|실타래 마녀|⌁|thread-witch / undefined 확산|undefined 봉인 수축|
|썩은심장 고목|♣|rottenheart-ancient / undefined 확산|undefined 봉인 수축|
|달을 삼킨 마녀|☾|moon-eating-witch / undefined 확산|undefined 봉인 수축|
|탐욕의 미믹|◈|greed-mimic / undefined 확산|undefined 봉인 수축|
|왕실 세금징수관|¤|royal-tax-collector / undefined 확산|undefined 봉인 수축|
|심연의 결투가|†|abyss-duelist / undefined 확산|undefined 봉인 수축|
|검은 성가대|♫|black-choir / undefined 확산|undefined 봉인 수축|
|기술먹이 사역마|✦|skillfeed-familiar / undefined 확산|undefined 봉인 수축|
|심연의 기록관|▤|abyss-archivist / undefined 확산|undefined 봉인 수축|
|왕실 감정관|⚖|royal-appraiser / undefined 확산|undefined 봉인 수축|
|처형 골렘|◆|execution-golem / undefined 확산|undefined 봉인 수축|
|심연의 감사관|◉|abyss-auditor / undefined 확산|undefined 봉인 수축|
|무효의 종사제|⊘|null-choir-priest / undefined 확산|undefined 봉인 수축|
|심연왕|♚|abyss-king / undefined 확산|undefined 봉인 수축|
|가면의 여왕|◒|masked-queen / undefined 확산|undefined 봉인 수축|
ACTIVE 발동, BLOCKED 저지/피해 방어, PARTIAL 일부 방어/머리 제거/부분 조건, WAIT 준비/중첩 진행.
유효 카드 협동, DPS window 종료, 처형 취소/실패, 실타래, 달 조건, 히드라 등 공개 판정 증거로 분류한다. 저지 가능한 패턴과 진행형 패턴을 구분한다.

## 간소 연출
기존 motionPreference를 그대로 따른다. 이동/회전/섬광 애니메이션 생략. 짧은 결과 배지(400/450ms), 아이콘/조건/진행도/결과 텍스트는 유지한다. 설정 변경은 다음 wait 단계에서 반영한다.

## 수정 파일
src/pve-combat-presentation.js, src/pve-combat-presentation-dom.js, src/pve-combat-presentation.css,
src/pve-gameplay-adapter.js, src/app.js, src/fx.js, index.html,
supabase/functions/game-api/pve/presentation.js, supabase/functions/game-api/pve/combat.js,
tests/pve-combat-presentation.test.mjs, docs/PVE_COMBAT_UX.md.

## 검증
순수 mapper/큐/상태·비공개 값 불변성/36종 registry/단계 통합/직접 활성화 및 reconnect 테스트를 추가.
전체 기존 test/check/stress CI는 PR에서 확인. 실제 브라우저 시각 검증은 아직 수행하지 않았으며 merge/deploy하지 않는다.
