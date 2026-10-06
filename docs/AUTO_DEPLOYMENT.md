# main 자동 배포

`Codex 작업 → 필요한 테스트 통과 → main 반영 → GitHub Actions → Supabase → Pages → 공개 서비스 반영`

## 실행 경로

- `check.yml`: PR 검증 전용. 전체 테스트, 파일 참조 검사, actionlint와 기존 PVE 검사를 실행한다. Production 접근용 secrets나 배포 작업을 사용하지 않는다.
- `deploy-supabase.yml`: 모든 `main` push에 실행한다. 수동 재실행도 `main`만 허용한다. 테스트와 정적 검사가 통과해야 DB dry-run/보호 검사, DB migration, 전체 Edge Functions 순서로 진행한다. 함수 이름을 생략한 deploy로 `game-api`, `account-api`, `cleanup-guests`를 함께 배포한다.
- `deploy-pages.yml`: Supabase 배포 성공 후 호출되는 reusable workflow. Pages Source를 읽고 branch 기반 `main /`이면 기존 자동 게시를 유지하며 동일 커밋의 게시 성공을 확인한다. Source가 GitHub Actions이면 production `config.js`와 공개 자산만 새 artifact에 복사해 같은 커밋을 배포한다. 두 게시 방식을 동시에 실행하거나 Source를 자동 변경하지 않는다. 별도 npm build는 없다. Branch 기반 Pages 자체는 main push로 독립 실행되며, 이 workflow의 결과 확인만 Supabase 이후에 실행된다.
- `pve-production-smoke.yml`: 일반 배포와 분리된 명시적 실행. Production을 쓰는 모든 workflow는 `supabase-production`, `cancel-in-progress: false`를 사용한다. Pages 호출도 부모 배포의 concurrency 잠금 안에서 완료된다. Reusable Pages workflow에 같은 잠금을 중복 지정하지 않는다.

자동 배포에 별도 승인 job은 없다. Main 보호 규칙과 저장소 권한은 GitHub 설정을 따른다. Codex의 작업 완료 자체는 push나 배포 성공을 의미하지 않는다.

## 최초 GitHub 설정

1. Repository Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_URL`. DB URL과 project ID는 production `config.js`의 프로젝트와 같아야 한다. Direct `db.<ref>.supabase.co` 또는 Supavisor `*.pooler.supabase.com`의 `postgres.<ref>` 사용자 연결을 지원한다. 값은 코드나 로그에 기록하지 않는다.
2. 기존 Pages가 **Deploy from a branch: main / (root)**이면 그대로 사용한다. GitHub Actions Source도 지원한다. Pages가 없는 새 저장소에서만 두 방식 중 하나를 최초 설정한다.
3. GitHub Actions Source를 사용하는 경우 `github-pages` environment의 main 배포에 required reviewers/wait timer를 설정하지 않는다. 그래야 정상 main 배포가 별도 수동 승인 없이 이어진다.
4. Supabase Auth와 기존 운영 Cron 설정은 별도로 유지한다. 함수 배포는 `config.toml`의 Auth 설정을 원격 프로젝트에 자동 동기화하지 않는다.

현재 클라우드에서는 Pages 설정 API가 `Forbidden`이지만 공개 Actions 페이지에서 `b3710cf` 커밋의 GitHub 관리 `pages-build-deployment` 성공을 확인했다. 정확한 Source는 runner의 GitHub 토큰으로 확인하며 기존 자동 게시 경로를 보존한다. Workflow 추가가 원격 Source나 environment 보호 규칙을 바꿨다는 의미는 아니다.

## 비파괴 migration 보호

`check-deploy-migrations.mjs`가 CLI dry-run의 **미적용 파일만** PostgreSQL SQL 파서로 검사한다. 적용된 과거 파일을 다시 실행하거나 이력을 자동 repair하지 않는다. CLI 버전은 현재 검증한 `2.117.0`으로 고정한다.

- 데이터 객체 DROP, TRUNCATE, 모든 migration-time DELETE(WHERE 포함), 조건 없는 UPDATE, 컬럼 제거/타입 변경, MERGE 등은 중단한다. 대량 DELETE의 안전성을 행 수로 추정하지 않는다.
- DO/CALL/EXECUTE, 직접 SELECT, 알 수 없는 구문/즉시 함수 호출, 파싱 실패, 예상 밖 dry-run 출력도 중단한다. 자동 안전 판별이 어려운 SQL은 먼저 보고하고 별도 작업으로 다룬다.
- 비파괴 CREATE/추가 ALTER, 권한 변경, 일반 INSERT/조건부 UPDATE, 같은 migration 안에서 다시 생성하는 constraint/trigger 교체는 허용한다.
- 저장 함수 본문의 기존 DELETE는 함수 **정의**이며 migration 시 실행되지 않는다. 기존 게스트·방 정리 기능을 제거하지 않는다. 함수 호출에 의한 간접 효과, 기존 트리거, 조건부 UPDATE의 의미까지 정적 검사로 증명할 수는 없으므로 코드 리뷰와 DB 통합 테스트도 필요하다.

보호 검사 실패 시 해당 파일/사유가 Actions 로그에 표시되고 **DB 적용과 함수·Pages 배포를 시작하지 않는다**. 보호 검사 우회나 자동 migration repair는 하지 않는다. 초기 SQL Editor 설치 이력과 CLI 이력이 다르면 같은 원칙으로 중단한다.

## 게스트 Cron과 migrations

`202609210004_account_cosmetics.sql`은 `account_cleanup_guests()`와 권한을 정의한다. `setup-cleanup-cron.sql`은 pg_cron 확장과 5분 예약을 설치하는 운영 bootstrap이다. Cron은 RPC를 직접 호출하므로 `cleanup-guests` Edge Function이나 `CLEANUP_SECRET`에 의존하지 않는다.

기존 문서에는 Cron 설치 완료 기록이 있지만 현재 서버 상태를 재확인한 것은 아니다. 매 배포마다 setup SQL을 실행하면 같은 이름의 예약 설정을 덮어써 운영자가 변경한 주기/활성 상태에 영향을 줄 수 있다. 따라서 **새 migration으로 옮기거나 일반 자동 배포에 추가하지 않는다**. 새 환경에서만 별도 설치하며, 기존 상태는 읽기 전용 `check-cleanup-cron.sql`로 확인한다. RPC 구현 변경은 기존 migration 흐름으로 배포한다. 외부 HTTP 스케줄러를 선택한 경우에만 `CLEANUP_SECRET`이 필요하다.

## Production smoke는 실제 쓰기

익명 Auth 계정 2개, 방, 멤버/준비/게임 상태 등을 생성한다. 종료 시 방을 나가지만 계정이 즉시 삭제되지는 않으며 중간 실패 시 상태가 남을 수 있다. 읽기 전용 health check가 아니다.

필요할 때 Actions의 **PVE Production Smoke**를 main에서 실행하고 `competitive` 또는 `pve` 및 `acknowledge_writes`를 명시적으로 선택한다. 기존 소유자 전용 PR 댓글 `/pve-production-smoke`도 PVE 쓰기 검사의 명시적 요청으로 유지한다. PR 코드 대신 production main을 checkout한다. 기존 PVE 킬스위치를 자동으로 변경하지 않는다.

## 확인과 한계

배포 job과 Pages job 성공을 모두 확인해야 공개 반영 완료로 판단한다. DB/함수/Pages는 원자적 배포가 아니므로 중간 실패 시 일부만 적용될 수 있다. 해당 오류를 고친 main 변경 또는 main workflow 재실행으로 복구한다. Publication 성공 후에도 브라우저 Auth/Realtime·실제 게임 검증은 별도다. 기존 4개 PVE release manifest/preflight는 최초 출시 체인의 참고 도구이며 일반 main 자동 배포를 네 파일로 제한하는 gate가 아니다.
