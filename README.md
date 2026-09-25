# 눈치 레이드 · Dungeon Bluff

HTML5 / CSS / Vanilla JavaScript ES Modules로 만든 4인 온라인 던전 게임입니다. 실제 카드 판정은 Supabase `game-api` Edge Function이 담당합니다. 클라이언트 단독 판정이나 가짜 온라인 모드는 없습니다.

최신 밸런스 변경과 적용 파일은 [밸런스 패치 안내](docs/BALANCE_PATCH.md)를 참고하세요. 이 패치는 SQL 적용과 game-api 재배포가 필요합니다.

## 2026-09-22 도박사·몬스터·스킨·로딩 업데이트

도박사 2장 손패·매 턴 보충, 몬스터 일러스트와 개별 공격, 준비 화면 전신 스킨 배경, 신규 스킨 8종, 기사 명칭, 단계별 로딩을 적용했습니다. **현재 서버 적용 상태와 Pages 업로드 목록은 [최신 업데이트 안내](docs/EXPEDITION_UPDATE_20260922.md)를 참고하세요.** 아래의 과거 기능 기록보다 이 안내가 우선합니다.

2026-09-23에는 카드 앞·뒷면 치장 가격을 5 Account Gold로 통일하고, 핏빛 룬과 서리 달 테마의 앞·뒷면 4개를 추가했습니다. Supabase에는 `202609230001_card_cosmetics.sql`까지 적용했습니다.

## 계정·랭킹·상점 업데이트

이메일 계정 전환, RP/Account Gold, 랭킹, 상점·인벤토리와 카드 치장, 자기 패널 선택 UI를 추가했습니다. **최신 배포·Auth 설정·GitHub 업로드·실제 테스트 절차는 [계정 업데이트 안내](docs/ACCOUNT_UPDATE.md)를 따르세요.** 아래 캐릭터 업데이트 설명은 기존 기능 기록입니다.

## Character Update 0.1

8종 캐릭터 선택, 카드 인스턴스별 5칸/OFF 표시, 서버 스킬 판정, 점술사 전용 정보, 캐릭터별 공격·스킬 연출을 추가했습니다. 상세 규칙과 효과음 파일은 `docs/CHARACTERS.md`를 참고하세요.

2026-09-21 연결된 Supabase에 `202609210001_character_system.sql`을 적용하고 `game-api`를 배포했습니다. 기존 테이블은 이미 있었지만 초기 두 마이그레이션의 CLI 이력이 없어, 추가 SQL만 트랜잭션으로 적용하고 해당 버전만 적용 이력에 기록했습니다. **이 서버에서 초기 이력을 확인·정리하기 전에는 `db push`를 실행하지 마세요.** 웹 클라이언트 파일은 호스팅에 별도로 반영해야 합니다.

부활 HP 3 / 실패 기준 누적 기절 8회 변경은 `202609210002_knockout_limit.sql` 및 서버 설정에 반영했습니다.

## 설치 및 업데이트

CLI 이력이 관리되는 서버에서는 추가 마이그레이션을 적용한 뒤 함수를 재배포합니다. SQL Editor로 설치한 서버는 이미 적용된 SQL을 다시 실행하지 마세요.

```powershell
npx supabase db push
npx supabase functions deploy game-api
```

SQL Editor를 사용한다면 현재 적용 상태에 따라 `supabase/migrations/202609200002_profiles.sql`, `202609210001_character_system.sql` 중 미적용 파일만 순서대로 실행하세요. 새 설치는 migrations의 모든 SQL을 파일명 순서대로 적용합니다. 웹 클라이언트 파일도 함께 업데이트해야 새로운 닉네임 API와 전투 연출이 연결됩니다.

배경음악은 **`index.html` 옆에 `bgm_lobby.mp3`와 `bgm_dungeon.mp3`**를 배치합니다. 메인·방 찾기·대기실에서는 로비 음악을, 게임 시작·진행·결과 화면에서는 던전 음악을 재생합니다. 원정을 나가면 로비 음악으로 돌아옵니다. 첫 클릭 또는 키 입력 이후 반복 재생하며, 재접속할 때도 현재 화면에 맞는 곡을 선택합니다. 상단 ♪ 버튼을 누르면 세로 볼륨 슬라이더가 열리고 배경음악과 효과음 볼륨을 함께 조절합니다. 0% 또는 음소거 버튼으로 끌 수 있으며 설정은 이 브라우저에 저장합니다. 파일이 아직 없어도 게임과 효과음은 동작합니다. 탭을 숨기면 BGM을 일시정지합니다.

첫 접속 시 닉네임을 제안하고, 이후 상단 닉네임 버튼에서 변경할 수 있습니다. 2~16자의 글자·숫자·공백·`_`·`-`를 허용합니다. 등록 계정의 닉네임은 대소문자 구분 없이 고유하며, 게스트 이름에는 랜덤 4자리 코드가 붙습니다. 닉네임은 식별·인증 수단으로 사용하지 않습니다. `profiles.user_id`는 `auth.users.id`를 참조하고 `get_profile` / `set_profile`은 JWT의 사용자만 읽고 변경합니다. 방에 있는 동안 변경하면 동료 화면에도 반영됩니다.

이메일 가입은 **현재 익명 사용자의 동일한 Auth user ID에 이메일·비밀번호를 한 번에 연결**하여 닉네임과 방 참조를 유지합니다. Confirm Email은 OFF이며 가입 직후 등록 계정이 됩니다. 이메일을 profiles의 기본키로 사용하지 않습니다. 별도 사용자 ID를 새로 만드는 가입/로그인 흐름은 계정 병합 설계가 추가로 필요합니다. 이메일 가입·로그인 UI가 추가되었으며 상세 설정은 docs/ACCOUNT_UPDATE.md를 참고하세요.

이번 전투 규칙: 처치 턴의 모든 유효 카드는 잔여 HP와 관계없이 온전한 피해를 주고, 최고 피해자가 **+10점**(초록색 연출) 및 기존 처치 골드 3G를 받습니다. 중복 카드는 계속 무효입니다. 기절 시 **-10점 / -3G**가 한 번 적용되며 잔액은 음수가 될 수 있습니다. 자동 제출 턴 종료 시 **HP 3**으로 부활합니다. 전멸 시 도달 스테이지에 따라 원정 점수·골드를 0~70% 정산하고, 클리어 시 100%를 획득합니다. 상세 패턴·배포 안내는 [몬스터 리마스터](docs/MONSTER_REMASTER.md)를 참고하세요.

카드·이미지·텍스트의 네이티브 드래그/드롭과 우클릭 메뉴를 차단했습니다. 볼륨 슬라이더의 포인터 조작, 닉네임/비밀번호 입력 편집은 계속 사용할 수 있습니다.

## 실행 준비

### 1. 클라이언트 연결 정보

프로젝트 루트의 `config.js`를 편집합니다.

```js
export const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_...';
```

Legacy `anon` key도 사용할 수 있습니다. `service_role` 또는 `sb_secret_...` 키는 이 파일에 넣지 마세요. 연결 정보가 없으면 메인 화면과 설정 안내만 표시됩니다.

### 2. Supabase 설정

1. Authentication 설정에서 **Anonymous Sign-Ins**를 활성화합니다.
2. `supabase/migrations/`의 SQL을 파일명 순서대로 SQL Editor에서 실행하거나 아래 CLI로 적용합니다. 초기 설치용 마이그레이션이므로 같은 SQL을 수동으로 두 번 실행하지 마세요.
3. Realtime 설정에서 **Allow public access**를 끄고 private 채널을 사용합니다. 채널 topic은 정확히 `room:{room_id}`입니다.
4. 아래와 같이 **game-api**를 배포합니다.

Supabase CLI가 설치된 환경에서:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy game-api
```

`supabase/config.toml`에 `[functions.game-api] verify_jwt = false`가 포함되어 있습니다. 최신 publishable key와 gateway의 legacy JWT 검증이 충돌하지 않도록 하고, **라우터가 모든 POST 요청의 Bearer JWT를 `auth.getUser(token)`으로 직접 검증**합니다. 무인증 게임 요청은 허용되지 않습니다. CORS preflight인 OPTIONS만 예외입니다.

함수 내부에서는 Supabase가 제공하는 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 환경변수를 사용합니다. 브라우저에는 전달되지 않습니다. 필요하면 CORS 허용 origin을 하나 지정할 수 있습니다.

```powershell
supabase secrets set ALLOWED_ORIGIN=https://your-game.example.com
```

설정하지 않으면 CORS는 `*`입니다. 로컬 테스트와 여러 배포 주소를 사용할 때는 이 기본값으로 시작할 수 있습니다. Auth JWT와 방 참가 검증은 별도로 항상 적용됩니다.

### 3. 웹게임 실행

Node.js 22.18 이상 권장, 검증 환경은 Node.js 24입니다. 게임 실행에는 npm 패키지 설치가 필요하지 않습니다.

```powershell
cd "C:\Users\pagte\Desktop\Dungeon Bluff"
npm start
```

브라우저 주소: **http://localhost:5173**

ES Modules이므로 `index.html`을 `file://`로 직접 열지 않고 HTTP로 실행하세요. 개발 서버는 `127.0.0.1`에만 바인딩합니다. 원격 플레이에는 정적 호스팅을 사용합니다.

정적 배포 대상은 `index.html`, `styles.css`, `config.js`, `src/`, `assets/`, 준비한 `bgm_lobby.mp3`, `bgm_dungeon.mp3`입니다. Supabase 함수는 별도로 배포합니다. 로컬 개발 서버는 이 웹 자산만 서빙하고 `supabase/`, 테스트, 숨김 파일은 서빙하지 않습니다.

클라이언트는 고정 버전 `supabase-js@2.57.4`를 esm.sh에서 가져옵니다. Google Fonts를 사용할 수 없으면 시스템 한국어 폰트로 대체됩니다. 이미지 자산과 몬스터 그림은 프로젝트에 포함된 SVG입니다.

## 구현 내용

- 자동 익명 로그인, 기존 Auth 세션 재사용, `Player-XXXX` 이름.
- 방 생성 / 목록 / 6자리 코드 참가 / 비밀번호 / 호스트 이전 / 4인 제한.
- 인간 1~4명 + AI 0~3명, 호스트 전용 추가·제거·시작.
- `balanced`, `greedy`, `cautious`, `blocker`, `chaotic` AI.
- DB `characters` 정의에서 덱 초기화. 동일 숫자가 여러 장 있는 덱도 한 장씩 소비.
- 4개 일반 전투 + 5개 비전투 + 마지막 보스의 10스테이지.
- 몬스터 8종, 비전투 방 16종, 전투·이벤트 공통 카드 자원.
- 기절 시 -10점 / -3G, 다음 턴 자동 제출 후 HP 3 복귀, 누적 8회 즉시 전멸 및 도달 스테이지별 차등 정산.
- 동시 공개, 중복 파편화, 공격 투사체, 충격파, 피해 숫자, 화면 흔들림, 피격·회복·부활·보스 처치 연출.
- 로비·던전별 반복 배경음악, 합성 효과음, 공통 세로 볼륨 슬라이더·음소거, `prefers-reduced-motion` 지원, 모바일 대응.
- DB 스냅샷 재접속, Realtime 재구독, foreground 복귀/네트워크 복귀/5초 간격의 상태 복구.

## 서버 권위 및 동시성

모든 mutation은 `game-api`를 통합니다. `game_commit`은 서비스 역할 전용 PostgreSQL RPC이며 방 행에 `FOR UPDATE` 잠금을 잡고 `rooms.version`을 비교합니다. 제출, 게임 상태, 멤버, 서버 broadcast를 같은 트랜잭션에 저장합니다. 동시에 들어온 요청은 최신 스냅샷을 읽어 최대 8회 재계산하므로 이중 판정과 마지막 좌석 초과 참가를 방지합니다.

`game_read`는 한 SQL 스냅샷으로 방과 현재 턴 제출을 읽습니다. 이 RPC도 서비스 역할 전용입니다. 현재 턴 숫자는 **`turn_submissions`에만** 저장되고 `game_sessions.state`에 포함되지 않습니다. 일반 AI는 공개 상태로 턴 시작에 결정합니다. 계시가 활성화된 점술사 AI만 계시 대상 인간의 제출을 기다리고, 허용된 대상 숫자만 전달받습니다.

`room_secrets`, `turn_submissions`는 RLS가 활성화되고 클라이언트 접근 권한도 없습니다. 클라이언트는 다른 사람의 제출은 물론 자신의 비공개 제출도 직접 SELECT할 수 없습니다. 복원 시 `lockedMembers`로 제출 여부만 표시합니다. 비밀번호는 개별 salt가 있는 PBKDF2-SHA256 100,000회 해시로 저장합니다.

Broadcast는 이벤트명과 `{ room_id, version }`만 전송합니다. UI는 알림을 받으면 `get_room_state`로 최종 DB 상태를 읽습니다. 결과가 DB에 확정되기 전 숫자가 흘러나오는 경로가 없습니다. 게임 중 다음 턴이 일찍 끝나도 클라이언트는 공개 결과를 턴 순서대로 큐에 넣어 재생합니다.

실제 연결은 [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization), [Database Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [Anonymous Sign-In](https://supabase.com/docs/reference/javascript/auth-signinanonymously)의 방식에 맞췄습니다.

## 명세서에 수치가 없던 부분의 구현 결정

원문에 ID만 있고 기존 패턴의 구체적인 설계가 첨부되지 않아, 몬스터·이벤트 규칙을 `docs/CONTENT.md`에 명시했습니다. 설정은 `supabase/functions/game-api/content.js`에서 수정합니다.

- 일반 전투 유효 카드는 숫자만큼 피해. 처치 턴의 초과 피해도 피해량과 점수에 모두 반영합니다.
- 낮은 유효 숫자부터 모든 공격을 연출하며, 처치 턴의 최고 피해자에 점수 10 / 골드 3을 추가합니다.
- 일반 몬스터는 3턴마다 기본 공격, 보스는 2턴마다 기본 공격과 다음 턴용 특수 패턴을 교대로 사용합니다.
- 일반 몬스터 처치 시 전원 점수 2 / 골드 2, 보스 처치 시 전원 점수 2 / 골드 10입니다.
- 방 실패도 비전투 방은 한 턴으로 끝나고 다음 stage로 이동합니다.
- 전투 중 **명시적으로 나가기**를 누른 인간의 자리는 `balanced` AI가 이어받습니다. 일반 AI는 미공개 제출을 읽지 않으며, 점술사 AI의 계시만 지정된 대상에 한해 적용됩니다. 이미 제출했던 카드는 유지합니다.
- 일시적인 네트워크 끊김은 재접속을 기다립니다. 모든 인간 참가자의 마지막 접속 확인 후 30분이 지나면 다음 방 API 요청에서 방을 닫고 참가 정보를 해제합니다. 진행 중 원정은 실패 처리합니다. 열린 게임 화면은 기존 5초 상태 조회로 접속을 갱신합니다. 숨긴 탭은 조회를 멈추므로 30분 이내 돌아오세요.
- 인간이 전부 나가면 `rooms.status = closed`, 진행 중 세션은 실패 처리합니다. 감사 기록을 위해 DB 행은 보존합니다.
- 완료/실패 후에는 결과 화면에서 나가 새 방을 만듭니다. 기존 원정 재시작 action은 추가하지 않았습니다.
- 부활 대기 중 회복 효과는 적용하지 않고, 자동 제출 턴 종료 시 HP 3으로 복귀합니다.
- stage 생성은 종류별 `1 / (1 + 출현 횟수)^2` 가중치와 종류별 최대 2회로 편중을 줄입니다.

## 파일 구조

```text
index.html                      진입점
config.js                       공개 Supabase 연결 정보
styles.css                      반응형 UI / 카드 / 전투 CSS
src/app.js                      로비·원정·결과·재접속 UI
src/api.js                      Auth / Edge 요청 / private Realtime
src/art.js                      던전 / 몬스터 / 이벤트 SVG
src/fx.js                       Canvas 파티클 / 투사체 / 처치 보너스 연출
src/audio.js                    BGM / Web Audio / 볼륨 설정
src/updates.css                 닉네임 / 세로 슬라이더 / 승자 강조 / 입력 보호
assets/emblem.svg               게임 엠블럼
supabase/config.toml            game-api 설정
supabase/migrations/...sql      테이블 / RLS / 트랜잭션 RPC
supabase/functions/game-api/
  index.ts                      인증 / 캐릭터 선택 / 게임 / 프로필 action 라우터
  engine.js                     서버 판정 엔진
  ai.js                         공개 정보 기반 AI 선택
  config.js                     핵심 밸런스 상수
  content.js                    캐릭터 테스트 정의 / 콘텐츠 데이터
scripts/serve.mjs               외부 패키지 없는 정적 개발 서버
scripts/check.mjs               JS/TS 문법 및 파일 참조 검사
tests/engine.test.mjs           규칙·보안·시뮬레이션 테스트
tests/database.test.mjs         PostgreSQL / RLS / 실제 라우터 통합 검사
tests/audio.test.mjs            음악 재생 / 음소거 / 설정 저장 / 파일 부재 처리
docs/CONTENT.md                 콘텐츠 규칙표
```

## 검사

```powershell
npm ci
npm run check
npm test
```

`check`는 JavaScript/TypeScript 구문과 로컬 import/HTML 자산 경로를 검사합니다. TypeScript 전체 타입 검사나 Supabase 연결 테스트를 대신하지 않습니다. `test`는 엔진 테스트 23개(500회 원정 시뮬레이션 포함), 캐릭터 테스트 15개, DB/라우터 통합 테스트 22개, 오디오 테스트 7개, 요청·연출 복구 테스트 4개, 계정·치장 UI 테스트 4개로 총 75개를 실행합니다.

DB 테스트는 테스트 전용 의존성 `@electric-sql/pglite`로 실제 PostgreSQL 엔진에 동봉 SQL을 적용합니다. RLS, 비공개 테이블 접근 차단, 동시 제출, CAS 충돌, 좌석 제한, 비밀번호, 호스트 이전을 확인합니다. Supabase Auth와 Realtime 네트워크 전송만 로컬 대체 구현을 사용합니다. 게임 실행에는 이 의존성이 필요 없습니다.

요청에 따라 **실제 브라우저 플레이 테스트는 수행하지 않았습니다**. 캐릭터 추가 SQL과 game-api는 연결된 Supabase에 배포했습니다. 실제 플레이를 통한 Auth/Realtime 네트워크 검증은 수행하지 않았습니다.

## 문제 확인

- 로그인 실패: Anonymous Sign-Ins가 켜졌는지, URL/key가 같은 프로젝트인지 확인.
- 함수 401: `verify_jwt = false` 설정으로 `game-api`를 다시 배포하고 로그인 JWT 전달 여부 확인.
- 방 생성 실패: 동봉 마이그레이션 전체와 RPC 권한이 적용됐는지 확인.
- Realtime 연결 실패: private-only 설정과 `realtime.messages` SELECT 정책 확인. 알림 실패 중에도 5초 상태 읽기로 복구합니다.
- 이미 참가한 방 메시지: 기존 Auth 사용자당 방 하나만 허용합니다. 새로고침하면 현재 방을 복구합니다.
- 모든 인간이 선택했는데 대기: 다른 접속 중인 인간이 선택했는지 확인. 끊긴 인간도 재접속 전까지 자리를 유지합니다.

방 만료 수정: `202609210003_room_expiry.sql`과 game-api를 함께 배포합니다. 기존 방은 마이그레이션 시점부터 30분의 유예를 받습니다. GitHub Pages에는 `src/app.js`를 교체하면 만료 후 홈 복귀 안내가 적용됩니다.

제출 복구 수정: 요청 전체(인증·응답 본문 포함)에 15초 제한을 적용하고, 실패 시 현재 상태를 다시 조회합니다. 같은 제출 재전송은 추가 소비 없이 현재 상태를 반환합니다. 서버 상태 조회는 저장된 제출 기준으로 잠금 표시와 자동 제출을 복구하며, 전원 제출된 턴은 CAS 잠금으로 한 번만 진행합니다. 알림은 커밋당 한 번으로 합쳤습니다. 로그 100턴은 유지하되 큰 플레이어 재생 스냅샷은 최근 2턴만 보관하고, 재접속 시 밀린 연출도 최대 2턴만 재생합니다. 종료되지 않는 개별 애니메이션은 1.5초 뒤 취소합니다.

이번 클라이언트 배포는 `src/` 전체를 교체하세요. 새 파일 `request-timeout.js`, `animation-wait.js`도 필요합니다. 서버와 방 만료 SQL은 연결된 Supabase에 적용했습니다. 브라우저 플레이 테스트는 수행하지 않았습니다.

## 캐릭터 스킨 뽑기

상점의 스킨 뽑기를 활성화했습니다. 10 Account Gold로 기본 스킨을 제외한 16종을 중복 없이 획득하고, 캐릭터별로 장착합니다. 뽑기·인벤토리는 전신 일러스트, 전투는 얼굴 크롭을 표시합니다. **src/ 전체와 skin image/ 전체**를 Pages에 업로드하세요. 서버 적용 상태와 상세 목록은 [스킨 업데이트 안내](docs/SKIN_UPDATE.md)에 있습니다.
