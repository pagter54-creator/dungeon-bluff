# PVE BETA-001 Deployment Checklist

## 목적

PVE BETA-001을 **human playtest용 테스트 환경**에 올리기 위한 절차다. 이 문서는 production release 절차가 아니다.

- 대상 브랜치: `feat/pve-core-001-004`
- 배포 대상: 별도 테스트 Supabase + 별도 테스트 프런트
- production `main`, production DB, production Edge Function, production Pages는 이 절차에서 변경하지 않는다.
- 실제 배포 직전 HEAD는 반드시 `git rev-parse HEAD`로 다시 기록한다.

## Canonical reward rules

| Rule | Outcome | Permanent Account Gold | RP |
| --- | --- | ---: | ---: |
| RULE-PVE-REWARD-01 | RUN_CLEAR | 서버 `pve_runs.state.players[].runGold` 전액 | 0 |
| RULE-PVE-REWARD-02 | RUN_FAILED | 0 | 0 |
| RULE-PVE-REWARD-03 | ABANDONED | 0 | 0 |
| RULE-PVE-REWARD-04 | 모든 COOP_PVE 결과 | 위 규칙 외 클라이언트 값 무시 | 항상 0 |

추가 경계:

- 클리어 전에 중도 탈주한 플레이어는 그 run의 Gold를 영구 계정에 받지 않는다.
- 남은 플레이어가 이후 RUN_CLEAR를 달성하면 남아 있던 등록 계정 플레이어의 authoritative runGold는 정상 지급된다.
- `pve_runs.rewards_committed`와 `pve_results(run_id,user_id)` PK로 중복 정산을 막는다.
- 클라이언트의 `gold`, `rpDelta` payload는 정산 근거로 사용하지 않는다.

## 변경 migration

`supabase/migrations/202609280001_game_modes_pve_beta.sql`

검증 대상:

- 기존 room row: `game_mode='COMPETITIVE'` backfill/default
- 허용 값: `COMPETITIVE | COOP_PVE`
- `pve_results.rating_delta = 0` DB constraint
- terminal outcome: `RUN_CLEAR | RUN_FAILED | ABANDONED`
- `pve_start_room`: COOP 전용 atomic start
- `pve_settle_rewards`: 서버 runGold 기반 정산
- `pve_abandon_closed_room`: unfinished run을 ABANDONED/0G settlement 상태로 종료

이 migration은 기존 경쟁 `game_results`/RP 공식을 수정하지 않는다.

## 1. 로컬 자동검증

PowerShell 예시:

```powershell
git switch feat/pve-core-001-004
git pull --ff-only
npm ci
npm test
npm run check
npm run pve:stress:smoke
```

모두 PASS하지 않으면 테스트 배포를 진행하지 않는다.

## 2. 테스트 target 지정

테스트 프로젝트 값만 shell 환경변수로 넣는다. repository의 production `config.js`는 수정하지 않는다.

```powershell
$env:PVE_BETA_PROJECT_REF="<TEST_PROJECT_REF>"
$env:PVE_BETA_SUPABASE_URL="https://<TEST_PROJECT_REF>.supabase.co"
$env:PVE_BETA_PUBLISHABLE_KEY="<TEST_PUBLISHABLE_OR_LEGACY_ANON_KEY>"

npm run pve:beta:preflight
```

preflight는 다음을 hard stop한다.

- target project ref가 현재 production `config.js`의 project ref와 동일
- 잘못된 project ref/URL 조합
- `sb_secret_...` 또는 service-role key를 브라우저 설정으로 사용
- `main` 브랜치에서 실행
- PVE BETA migration/runtime/frontend 필수 파일 누락
- reward/mode migration contract 누락

publishable key 값 자체는 로그로 출력하지 않는다.

## 3. Supabase migration preflight

CLI 인증 후 **테스트 project ref를 직접 명시**한다.

```powershell
npx supabase login
npx supabase link --project-ref $env:PVE_BETA_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
```

중단 조건:

- 링크된 ref가 의도한 테스트 ref가 아님
- migration history가 로컬과 불일치
- 예상하지 않은 pending migration 존재
- `db push --dry-run` 결과에 destructive/무관한 변경이 보임

기존 production 프로젝트는 과거 SQL Editor 적용 이력이 있으므로 이 BETA 절차에서 링크하거나 `db push`하지 않는다.

테스트 DB에서 필요하면 SQL Editor로 preflight snapshot을 기록한다.

```sql
select count(*) as rooms_before from public.rooms;
select count(*) as competitive_results_before from public.game_results;
select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 10;
```

migration 적용 후:

```sql
select game_mode, count(*) from public.rooms group by game_mode order by game_mode;
select column_default, is_nullable
from information_schema.columns
where table_schema='public' and table_name='rooms' and column_name='game_mode';
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid='public.rooms'::regclass and conname='rooms_game_mode_check';
```

## 4. 테스트 DB migration 적용

preflight가 깨끗한 **테스트 프로젝트에서만**:

```powershell
npx supabase db push
npx supabase migration list
```

production project에는 실행하지 않는다.

## 5. game-api deploy preflight

필수 코드:

- `supabase/functions/game-api/index.ts`
- `supabase/functions/game-api/game-mode.js`
- `supabase/functions/game-api/pve/`
- `supabase/config.toml`

필수 서버 환경:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — Edge Function 내부에서만 사용
- Auth Anonymous Sign-In enabled
- Realtime private channel 정책
- CORS: 테스트 프런트 origin을 제한했다면 해당 origin 허용

이 브랜치는 `account-api` 자체를 수정하지 않는다. 기존 테스트 프로젝트에 현재 account baseline이 있어야 한다. 완전히 새 테스트 프로젝트라면 동일 baseline commit의 account schema/function도 먼저 준비한다.

테스트 project에만:

```powershell
npx supabase functions deploy game-api --project-ref $env:PVE_BETA_PROJECT_REF
```

## 6. 테스트 프런트 package

production `config.js`를 덮어쓰지 않고 별도 artifact를 만든다.

```powershell
npm run pve:beta:prepare-frontend
```

출력:

```text
artifacts/pve-beta-frontend/
  index.html
  config.js                 # test URL + publishable key
  styles.css
  src/
  assets/
  skin image/
  monster/
  background/
  PVE_BETA_BUILD_INFO.json
```

`PVE_BETA_BUILD_INFO.json`에는 branch/HEAD/test project ref만 기록하며 publishable key는 기록하지 않는다.

이 디렉터리 **내용만** 별도 테스트 정적 호스트에 업로드한다. production GitHub Pages에는 업로드하지 않는다.

현재 repository에는 별도 staging static-host provider용 deploy workflow가 정의되어 있지 않으므로, 이 문서는 특정 호스팅 서비스로 자동 deploy하지 않는다.

## 7. Automated remote smoke

테스트 backend/frontend가 올라간 뒤 가능한 최소 검증:

1. COOP_PVE room create
2. list_rooms에 `gameMode=COOP_PVE`
3. 다른 계정 join
4. reconnect 후 mode 유지
5. 4명/AI 구성 및 ready
6. host start
7. `game_sessions`가 아니라 `pve_runs` 생성
8. run phase = `MAP_VOTE`
9. PVE getState 정상
10. 테스트용 terminal fixture에서 reward rule 확인

현재 repository에는 원격 Auth 세션을 안전하게 발급받아 staging backend를 조작하는 별도 E2E harness가 없으므로, credentials 없는 환경에서는 이 항목을 성공으로 가장하지 않는다. 첫 원격 검증은 human smoke와 DB 확인으로 수행한다.

## 8. Reward verification

테스트 DB/API에서 확인:

- RUN_CLEAR, runGold 12 -> Account Gold +12 / RP unchanged
- RUN_FAILED, runGold 12 -> Account Gold +0 / RP unchanged
- ABANDONED, runGold 12 -> Account Gold +0 / RP unchanged
- RUN_CLEAR getState 2회 -> Gold 정확히 1회
- request `gold=999999` -> 무시
- request `rpDelta=9999` -> 무시
- competitive `game_results`/leaderboard RP는 PVE 후 unchanged

## 9. Human smoke

실제 플레이 절차는 `docs/PVE_BETA_001_PLAYTEST.md`를 사용한다.

첫날 목표는 밸런스 판정이 아니라 **방 생성 → 로비 → MAP_VOTE → 전투 → 방 진행 → Boss/결과까지 softlock 없이 이어지는지** 확인하는 것이다.

## 10. 서버 로그/기록

테스트 중 기록할 식별자:

- roomId
- runId
- gameMode
- playerId
- floor
- currentRoomNodeId
- phase
- actionId
- errorCode

JWT, service-role key, password, private card 정보는 로그 문서에 복사하지 않는다.

## 11. Rollback

### Frontend

테스트 정적 호스트를 직전 beta artifact/commit으로 되돌린다. production Pages는 애초에 건드리지 않는다.

### Edge Function

직전 테스트 성공 commit을 checkout한 뒤 같은 **test ref**에 game-api만 재배포한다.

```powershell
git switch --detach <PREVIOUS_TEST_SHA>
npx supabase functions deploy game-api --project-ref $env:PVE_BETA_PROJECT_REF
git switch feat/pve-core-001-004
```

### Database

`202609280001_game_modes_pve_beta.sql`은 additive migration이며 production rollback 대상이 아니다. 테스트 DB 문제는 우선 forward fix migration으로 해결한다.

완전히 disposable한 테스트 프로젝트만, 데이터를 버려도 된다는 확인 후 remote reset을 검토한다. `db reset --linked`는 destructive이므로 production/project-ref가 조금이라도 불명확하면 실행하지 않는다.

## 12. Production 금지사항

이 BETA-001 준비 과정에서는 다음을 하지 않는다.

- `main` merge
- production Supabase link/db push
- production Edge Function deploy
- production Pages overwrite
- production DNS 변경
- production secret 출력/복사
- 몬스터/직업/Gold/RP 밸런스 조정

## 배포 기록 템플릿

```text
PVE BETA-001 deploy
Date:
Branch:
HEAD:
Test Supabase project ref:
Migration list checked: YES / NO
db push --dry-run checked: YES / NO
Migration applied to TEST: YES / NO
game-api deployed to TEST: YES / NO
Frontend test URL:
Automated remote smoke: PASS / NOT RUN / FAIL
Human smoke session:
Production changed: NO
Notes:
```
