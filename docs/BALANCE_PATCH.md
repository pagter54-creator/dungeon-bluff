# 밸런스 패치 적용 안내

## 변경 규칙

- 기절 손실: -10점 / -3 Run Gold. 기절당 한 번 적용.
- 임프: 같은 숫자를 낸 모든 상대에게서 각 1점. 기존처럼 양수 잔액만 강탈하며, 여러 임프가 동시에 강탈해도 턴 시작 잔액보다 많이 가져오지 않음.
- 광전사: 중복 시 인원수와 무관하게 HP 1 회복(최대 HP까지, 기절 중에는 회복하지 않음). 몬스터·보스 유효 공격 효과 +1, 실제 명중 시 HP 1 소모(HP 1이면 소모 없음). 봉인·포식·장갑으로 공격이 0이면 체력 소모 없음. 중복 판정은 원래 카드 숫자.
- 도박사: 6 또는 7 소비 직후 보충 카드는 반드시 1~5. 중복 무효로 소비한 경우에도 적용. 그다음 보충부터 기존 규칙으로 복귀.
- 도적: 보물·이벤트에서 가장 낮은 유효 원본 숫자를 내면 +2G / +5점, 판정당 한 번.
- 8직업의 스킬 발동에 작은 일러스트 중앙 표시와 합성 효과음 추가. 음량·음소거 설정 공유. 추가 서버 조회나 음원 파일 없음.

## 배포

운영 프로젝트 `dvpisuvyeyqwhewfbnls`에 `202609240001_skill_balance.sql` 적용 및 `game-api` 배포를 완료했습니다. 원격 마이그레이션 이력에서도 적용을 확인했습니다. GitHub Pages 파일은 별도로 업로드해야 합니다.

1. Supabase SQL Editor에서 `supabase/migrations/202609240001_skill_balance.sql` 내용을 실행합니다. 캐릭터 설명 4개만 갱신합니다. 기존 설치 SQL 전체를 재실행할 필요는 없습니다.
2. 현재 프로젝트를 대상으로 `game-api` Edge Function을 재배포합니다. 아래 다섯 파일을 포함한 `supabase/functions/game-api` 폴더가 최신이어야 합니다.
   - `config.js`, `characters.js`, `skills.js`, `engine.js`, `ai.js`
3. GitHub Pages 저장소에 아래 프런트 파일을 같은 경로로 업로드합니다.
   - `src/app.js`
   - `src/audio.js`
   - `src/character-fx.js`
   - `src/fx.js`
   - `src/battle-layout.css`
4. 새 원정으로 시작합니다. 이미 시작한 원정은 과거 캐릭터 설명을 저장하고 있으므로 새 설명은 새 원정부터 일치합니다.

연결된 Supabase 프로젝트가 맞는지 확인한 뒤 프로젝트 폴더에서 실행:

```powershell
npx supabase functions deploy game-api
```

GitHub 파일만 올리면 연출·안내만 갱신됩니다. 실제 점수·HP·드로우 판정에는 반드시 서버 함수 재배포가 필요합니다.
