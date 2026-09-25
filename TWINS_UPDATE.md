# 쌍둥이 추가 패치

## GitHub Pages에 업로드할 파일

프로젝트 루트를 기준으로 아래 파일을 같은 경로에 덮어쓰세요. `src/twins-fx.js`는 새 파일입니다.

```text
src/app.js
src/audio.js
src/battle-layout.css
src/battle-loading.js
src/battle-rules.js
src/card-component.js
src/character-fx.js
src/character-guide.js
src/character-guide-data.js
src/character-ui.js
src/loading-ui.js
src/player-pose-fx.js
src/skins.js
src/twins-fx.js
```

## 일러스트 파일

모든 PNG는 기존 `skin image` 폴더에 넣습니다. 대문자 B/G/A/D를 지켜주세요.

| 파일 | 사용 위치 |
| --- | --- |
| `twins0.png` | 캐릭터 선택·도감·대기실·인벤토리의 대표 이미지 |
| `twins0_B.png` | 소년 평시 이미지, 왼쪽 |
| `twins0_G.png` | 소녀 평시 이미지, 오른쪽 |
| `twins0_B_A.png` | 홀 상태의 소년 공격 |
| `twins0_B_D.png` | 홀 상태의 소년 피격·기절 |
| `twins0_G_A.png` | 짝 상태의 소녀 공격 |
| `twins0_G_D.png` | 짝 상태의 소녀 피격·기절 |

공통 스킨의 `twins0_A.png`, `twins0_D.png` 경로도 등록되어 있으나, 실제 쌍둥이 전투 연출은 위의 인물별 파일을 우선 사용합니다. 쌍둥이는 별도 `_crop` 없이 `twins0.png`를 대표 이미지로 사용합니다.

홀 상태는 소년이 밝게 앞에, 짝 상태는 소녀가 밝게 앞에 나옵니다. 다른 인물은 뒤에서 어둡게 표시됩니다. 두 이미지 모두 기존 아트 영역에 contain 방식으로 표시되고 하단 그라데이션은 유지됩니다.

미완성 대표·평시 이미지는 임시 표시로, 미완성 공격·피격 이미지는 평시 이미지로 대체됩니다. 나중에 같은 이름의 PNG를 업로드하고 새로고침하면 연결됩니다. 대기실과 게임 시작 로딩에 두 인물의 이미지가 포함됩니다.

## 적용 규칙

- 1/2/3/4 네 장. 첫 턴 홀짝 무작위, 매 턴 종료 때 반전. 방·몬스터·사이클 변경으로 초기화하지 않습니다.
- 현재 홀짝에 맞는 미사용 카드만 선택·자동 제출합니다. 뒤죽박죽도 선택 가능한 카드 중 최대 두 장을 사용합니다.
- 유효한 몬스터 공격의 최종 피해 +2. 카드 숫자·이벤트 판정에는 영향을 주지 않습니다. 교환된 숫자에도 적용합니다. 기절 자동 제출, 중복 실패, 봉인·장갑·포식으로 차단된 공격은 피해를 주지 않습니다.
- 곡예는 제출 전에 즉시 네 장을 새로 받고 홀짝을 뒤집습니다. 기존 선택은 취소됩니다. 곡예로 받은 새 네 장을 전부 사용하면 재충전됩니다.
- 경쾌한 두 번의 찌르기와 합성 효과음이 재생됩니다. 별도 효과음 파일은 필요하지 않습니다.
- 기본 스킨은 무료이며 뽑기 목록에는 넣지 않았습니다. 도감에는 난이도 2.5, 딜링 4.5, 운영 3, 견제 1, 한방 2.5를 표시합니다.
- 소년·소녀의 공격·피격 이미지는 두 사람의 중앙을 기준으로 아트 영역 너비의 160%, 높이의 150%까지 확대하여 두 인물을 덮습니다. 평시 이미지는 기존 크기와 좌우 배치를 유지합니다.

## 서버 소스

```text
supabase/functions/game-api/characters.js
supabase/functions/game-api/skills.js
supabase/functions/game-api/engine.js
supabase/functions/game-api/ai.js
supabase/functions/game-api/twins.js
supabase/migrations/202609250003_twins.sql
```

Supabase 마이그레이션과 game-api 배포를 완료했습니다. 위 서버 파일들은 소스 보관용이며, GitHub Pages에는 앞서 나열한 웹 파일 14개를 업로드하면 됩니다.

전체 자동 테스트 207개와 문법·참조 검사가 통과했습니다. 실제 브라우저 플레이 테스트는 수행하지 않았습니다.
