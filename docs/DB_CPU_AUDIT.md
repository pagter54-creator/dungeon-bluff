# Supabase Database CPU 부하 코드 감사 보고서

작성일: 2026-09-22  
범위: 브라우저 클라이언트, Supabase Edge Functions, SQL 함수·트리거·인덱스  
변경 여부: 애플리케이션 및 DB 코드는 수정하지 않음

## 결론

CPU 포화의 가장 유력한 원인은 Realtime 채널의 중복 생성이 아니라, **5초 폴링과 Realtime Broadcast가 모두 동일한 전체 상태 조회를 실행하며 그 모든 요청이 `game_room_presence` 쓰기까지 발생시키는 구조**다. 상태 변경 시에는 `game_commit`이 작은 변경만 저장하지 않고 참가자 행 전체 교체, 게임 세션의 큰 JSONB 전체 갱신, 현재 제출 목록 재삽입을 수행한다.

현재 클라이언트는 `postgres_changes`와 Realtime Presence를 사용하지 않는다. 방마다 private Broadcast 채널 하나를 사용하며 기존 채널 제거 코드도 존재한다. 따라서 구독 누수는 코드상 주원인으로 보이지 않는다.

스크린샷의 연결 수 16/60에서 User CPU가 지속적으로 약 85~90%를 차지한다는 점은 단순 연결 유지보다 PostgreSQL 함수·쿼리 실행이 부하의 중심이라는 코드 분석과 일치한다. 다만 어떤 SQL이 실제 CPU를 차지하는지는 `pg_stat_statements`가 있어야 확정할 수 있다.

## CPU 부하 가능성 TOP 5

### 1. 방 접속 중 5초마다 전체 상태 폴링 — Critical

- 위치: `src/app.js`의 전역 `setInterval`, `sync`
- 실행 빈도: 보이는 탭에서 방 접속 중 5초마다 1회, 즉 플레이어당 분당 12회·10분당 120회. 온라인 복귀와 탭 재표시 때도 즉시 1회 추가된다.
- Supabase 호출: `game-api/get_room_state` → Auth 사용자 검증 → `game_room_presence` RPC → `game_read` RPC.
- 실제 읽기: 방, 참가자와 프로필, 방 비밀정보, 게임 세션 전체 JSONB, 현재 턴 제출 전체.
- 증폭 가능성: Realtime 수신도 같은 `sync`를 호출하므로 폴링과 Broadcast 조회가 중첩된다. 진행 중 요청은 `resync` boolean으로 합쳐지지만, 완료 직후 최소 한 번 더 실행될 수 있다.
- 추천 수정: 게임 중 정기 폴링을 제거하고 Broadcast의 room version을 비교해 상태 변화가 있을 때만 조회한다. 연결 복구용 저빈도 안전 폴링이 필요하면 30~60초 이상, 지수 백오프와 jitter를 사용한다. UI 타이머와 연출은 전부 클라이언트에서 처리한다.

### 2. 모든 게임 API 요청이 presence 쓰기와 전체 만료 방 청소를 수행 — Critical

- 위치: `supabase/functions/game-api/index.ts`의 요청 라우터, `supabase/migrations/202609210003_room_expiry.sql`의 `game_room_presence`
- 실행 빈도: 프로필 전용 두 요청을 제외한 모든 game-api 요청마다 1회. 현재 폴링만으로 플레이어당 10분에 120회 이상.
- Supabase 호출: RPC 내부에서 만료 방 SELECT/lock, 만료 방 UPDATE, 활성 세션 SELECT/UPDATE, 멤버 DELETE, 현재 사용자의 방 `last_seen_at` UPDATE.
- 문제점: heartbeat가 전용 주기로 분리되지 않았다. 요청할 때마다 모든 만료 후보를 검사하며, 실제 게임 상태가 바뀌지 않아도 활성 방 행에 UPDATE/WAL/MVCC dead tuple을 만든다.
- 증폭 가능성: Broadcast로 유발된 상태 조회도 다시 presence UPDATE를 한다. 즉 “DB 변경 → Broadcast → N명 조회 → N번 DB UPDATE”가 된다.
- 추천 수정: heartbeat를 30~60초로 throttle하고, `last_seen_at`이 충분히 오래된 경우에만 갱신한다. 만료 방 청소는 요청 경로에서 제거해 `pg_cron` 단일 작업으로 옮긴다. 사용자 membership에서 room id를 먼저 찾은 뒤 해당 방 한 행만 갱신한다.

### 3. 상태 변경마다 방 전체를 다시 쓰는 `game_commit` — Critical

- 위치: `supabase/migrations/202609200001_initial.sql`의 `game_commit`, `supabase/migrations/202609220001_quiet_room_conflicts.sql`의 `game_try_commit`, `supabase/functions/game-api/index.ts`의 `commit`
- 실행 빈도: 방 생성, 입장/퇴장, AI 추가/삭제, 캐릭터 변경, 게임 시작, 각 인간 플레이어의 카드 제출마다 1회. 충돌 시 요청 하나에서 최대 8회 read/retry 가능.
- Supabase 쿼리: room row lock/UPDATE, `room_members` 방 전체 DELETE 후 최대 4행 INSERT, `game_sessions` 전체 JSONB UPSERT, 현재 제출 배열 INSERT ON CONFLICT, Realtime Broadcast INSERT/send.
- 문제점: 카드 한 장 제출처럼 작은 변경도 모든 좌석을 삭제·재삽입한다. 참가자 INSERT마다 `room_member_profile` 트리거가 실행되어 인간 좌석별 profile SELECT가 추가된다. 세션 `state`에는 캐릭터 정의와 event log가 포함되어 큰 JSONB가 매 제출마다 새 버전으로 기록된다.
- 증폭 가능성: commit 1회가 Broadcast 1회를 만들고 모든 구독자의 전체 조회를 유발한다. 현재 코드는 여러 의미 이벤트를 `room_updated` 하나로 축약하므로 과거 방식보다 낫지만 fan-out 자체는 남아 있다.
- 추천 수정: action별 작은 SQL/RPC로 분리한다. 제출은 제출 행 INSERT와 필요한 세션 필드만 원자 갱신하고, 변경되지 않은 room_members는 쓰지 않는다. 큰 상태 JSON에서 정적 캐릭터 정의와 오래된 전투 기록을 분리한다.

### 4. Broadcast 한 건마다 모든 플레이어가 전체 상태를 다시 읽음 — High

- 위치: `src/api.js`의 `subscribe`, `src/app.js`의 `sync`, SQL `game_commit`의 `realtime.send`
- 실행 빈도: 구독 직후 1회, 이후 방 상태 commit마다 구독자별 1회 가능. 카드 제출이 플레이어별 commit이므로 4인 턴 하나에 최대 4 Broadcast가 발생한다.
- Supabase 쿼리: 각 구독자가 `get_room_state`를 호출하여 presence RPC와 game_read RPC를 모두 실행한다.
- 증폭 가능성: 상태 변경 수 M, 접속 플레이어 수 N일 때 약 M×N개의 전체 조회와 presence UPDATE가 생긴다. 자기 action 응답에도 이미 최신 전체 상태가 들어오므로 자기 Broadcast 조회는 중복될 수 있다.
- 추천 수정: Broadcast payload의 room version을 클라이언트가 기억하고 이미 적용한 version이면 조회하지 않는다. action 응답으로 적용한 version도 기록한다. 장기적으로는 Broadcast에 공개 가능한 최소 diff를 넣거나, 단 한 번의 상태 fetch만 필요한 invalidation 방식으로 debounce한다.

### 5. 읽기 요청이 복구 쓰기와 최대 8회 경쟁 재시도를 수행할 수 있음 — High

- 위치: `supabase/functions/game-api/index.ts`의 `get_room_state` 분기와 8회 retry loop
- 실행 빈도: 모든 sync 때 검사. 저장된 제출과 `lockedMembers`가 다르거나 AI 자동 제출/자동 턴 진행이 필요할 때만 commit하지만, 조건이 생기면 여러 클라이언트가 동시에 같은 복구를 시도할 수 있다.
- Supabase 쿼리: 반복 `game_read` RPC, 조건부 `game_try_commit` RPC, conflict 후 20~219ms 대기와 재조회.
- 증폭 가능성: 같은 Broadcast를 받은 모든 플레이어가 복구 후보가 되어 한 명 성공 후 나머지가 conflict/re-read할 수 있다. 오류 로그는 최근 변경으로 줄었지만 충돌에 든 DB CPU와 잠금 비용은 남는다.
- 추천 수정: 읽기 경로는 읽기 전용으로 유지한다. 자동 진행은 카드 제출 commit을 성공시킨 단일 서버 흐름이나 전용 worker/RPC가 담당하게 한다. 복구가 필요하면 advisory lock 또는 DB 함수 한 번으로 소유권을 정해 한 호출만 진행한다.

## Realtime 구독 감사

- `postgres_changes`: 사용 위치 없음.
- Realtime Presence/heartbeat API: 사용 위치 없음. 이름이 presence인 `game_room_presence`는 자체 DB RPC이며 Realtime Presence가 아니다.
- Broadcast subscribe: `src/api.js` 한 곳. `room:${roomId}` private channel.
- 중복 방지: 새 subscribe 전에 `client.removeChannel(channel)`을 await한다.
- 정리: 정상 퇴장과 만료 감지 때 `unsubscribe`를 호출하고 channel을 null로 만든다.
- visibility/reconnect: 새 채널을 생성하지 않고 `sync`만 호출한다.
- 남은 위험: 비정상 페이지 종료 시 명시적 remove는 없지만 WebSocket 종료로 서버가 정리한다. 코드상 누적 구독 루프의 증거는 없다.
- 이벤트→UPDATE 무한 루프: 일반 경로에는 없다. 다만 `get_room_state`의 자동 복구 조건이 계속 참으로 남는 결함이 생기면 read→commit→broadcast→read 형태의 제한적 루프가 가능하다.

## Supabase 호출 위치 목록

### SELECT

- `src/api.js/connect`: Auth `getSession`, `getUser`; DB 직접 SELECT는 아니지만 각 Edge 호출의 `admin.auth.getUser`도 Auth 서비스/DB 검증 비용을 만든다.
- `src/app.js/sync` → `game-api/get_room_state`.
- `src/app.js/loadRooms` → `game-api/list_rooms`.
- `supabase/functions/game-api/index.ts/read` → `game_read` RPC.
- `characters` → `characters.select('*').eq('enabled', true)`; 캐릭터 선택과 게임 시작 때 실행.
- `list_rooms` → rooms와 nested room_members 조회, 최대 60개.
- 코드 참가 → rooms를 room_code로 조회.
- room id 없는 복구 → room_members를 user_id로 조회.
- `game_read` 내부 → rooms, room_members+profiles, room_secrets, game_sessions, 현재 turn_submissions.
- `src/account-ui.js/refreshAccount` → `account_data`: auth.users, profiles, player_stats, player_inventory, player_loadout.
- 랭킹 → `account_leaderboard`; 상점/뽑기/인벤토리 → `account_shop`.
- 스킨 뽑기 → shop_items, skin_draws, player_inventory 조회.
- guest cleanup → auth.users/profiles 및 활성 membership/session 검사.

### INSERT

- `game_commit`: 방 생성 시 rooms/room_secrets, 매 commit마다 room_members 재삽입, game_sessions upsert, turn_submissions insert-on-conflict.
- account ensure/register: profiles, player_stats, player_loadout.
- 구매/뽑기: player_inventory, skin_draws.
- 세션 reward trigger: game_reward_members, game_results.
- `realtime.send`: private Broadcast 메시지 생성.

### UPDATE

- `game_room_presence`: 요청마다 현재 방의 `last_seen_at`; 만료 방/세션 상태.
- `game_commit`: rooms version/status/host와 game_sessions 전체 state.
- nickname/profile: profiles, room_members, rooms version.
- account touch: profiles.last_active_at; mutation 성공마다 실행.
- 구매/장착/뽑기: player_stats, profiles, player_loadout.
- reward trigger: game_sessions state/rewards flag, player_stats.

### UPSERT

- `game_commit`: game_sessions `ON CONFLICT(id) DO UPDATE`.
- `game_commit`: turn_submissions `ON CONFLICT(session_id,turn_index,member_id) DO NOTHING`.
- account ensure: profiles/player_stats/player_loadout의 `ON CONFLICT DO NOTHING`.

### DELETE

- `game_commit`: 상태 변경마다 해당 방의 room_members 전체 삭제.
- `game_room_presence`: 만료 방의 room_members 삭제.
- `account_cleanup_guests`: 만료 anonymous auth.users 삭제. FK cascade로 관련 계정 데이터도 삭제.

### RPC

- 클라이언트 game-api 경유: `game_room_presence`, `game_read`, `game_try_commit`, `game_profile`, `account_touch`.
- 클라이언트 account-api 경유: `account_data`, `account_register`, `game_profile`, `account_leaderboard`, `account_shop`, `account_purchase`, `account_equip`, `account_draw_skin`.
- cron Edge Function: `account_cleanup_guests`.

### REALTIME SUBSCRIBE

- `src/api.js/subscribe`: 방당 private Broadcast channel 1개, 모든 broadcast event 수신.
- subscribe 성공 시 즉시 `onUpdate()`를 호출해 전체 상태를 한 번 조회.
- SQL 송신 위치: `game_commit`, 닉네임 변경의 `game_profile`.

## 10분 접속 시 예상 호출량

아래 수치는 탭이 보이는 상태이고 네트워크 실패가 없으며, 한 턴을 평균 20초로 가정한 추정치다. UI 애니메이션은 DB를 호출하지 않는다.

### 방에서 아무 상태 변화 없이 대기하는 플레이어 1명

- 5초 폴링: 120회 `get_room_state`.
- 최초 구독/복귀: 보통 1~2회 추가.
- 10분 합계: 약 120~122 game-api 요청.
- 각 요청: Auth 검증 1 + presence RPC 1 + game_read RPC 1.
- 결과: 약 120회 room heartbeat UPDATE, 약 120회 전체 상태 JSON 조회, 약 240회 public RPC 호출. `game_read`의 하위 SELECT를 개별 접근으로 세면 약 600회 이상의 테이블 접근이 된다.

### 인간 2명 + AI 2명, 20초당 한 턴

- 10분 약 30턴, 인간 제출 commit 총 60회.
- 플레이어 1명 기준: 기본 폴링 120 + 자신의 제출 30 + Broadcast 유발 sync 최대 약 60 = 약 210 요청.
- 중첩 sync가 합쳐지는 경우 약 180~210 요청 범위.
- 방 전체: 약 360~420 game-api 요청, 같은 수의 presence RPC/UPDATE, 같은 수준의 game_read, 제출 commit 60회, account_touch 60회.
- commit 60회마다 room_members 전체 DELETE+재INSERT와 game_sessions JSONB 전체 갱신이 수행된다.

### 인간 4명, 20초당 한 턴

- 10분 약 30턴, 제출 commit 총 120회.
- 플레이어 1명 기준: 폴링 120 + 자신의 제출 30 + Broadcast sync 최대 120 = 약 270 요청.
- 방 전체: 최대 약 1,080 game-api 요청, 1,080 presence RPC/UPDATE, 1,080 game_read, commit 120회, account_touch 120회.
- 턴 속도가 10초라면 action/Broadcast 관련 수치는 거의 두 배가 된다.

이 계산에는 온라인/visibility 복귀, timeout 후 사용자의 재시도, version conflict 재시도, 계정 UI 조회가 포함되지 않았다. 따라서 실제 상한은 더 높다.

## 인덱스와 전체 조회 점검

좋은 부분:

- room_members(user_id) partial unique, room_members(room_id), game_sessions(room_id unique), turn_submissions(session_id,turn_index,member_id unique)가 주요 게임 조회를 지원한다.
- rooms expiry partial index, guest last_active partial index, ranking index가 존재한다.

점검이 필요한 부분:

- 방 목록은 `status <> 'closed' ORDER BY created_at DESC`인데 현재 인덱스는 `(status, created_at desc)`다. `<>` 조건에서는 정렬까지 효율적으로 쓰지 못할 수 있다. `WHERE status <> 'closed'` partial index의 실제 plan을 확인해야 한다.
- `game_room_presence`의 현재 방 갱신은 rooms 전체에서 status를 검사한 뒤 membership EXISTS를 평가하는 형태다. membership을 기준으로 room id를 먼저 확정하는 쿼리가 더 안전하다.
- `account_cleanup_guests`는 5분마다 실행되며 auth.users와 profiles를 조인한다. 정상적으로는 지속 100% CPU의 1차 원인은 아니지만 게스트가 매우 많이 쌓였거나 dead tuple이 많다면 순간 부하 후보다.
- `game_read`는 필요한 필드 projection 없이 session row와 state JSONB 전체를 반환한다. event log 제한이 있어 무한 성장은 아니지만 정적 characterDefinitions와 최근 상세 snapshot 때문에 매 polling payload와 JSON 변환 비용이 크다.

## 실제 원인 확정에 필요한 Supabase 자료

코드만으로 우선순위는 정할 수 있지만 95~100% CPU를 어느 SQL이 차지하는지 확정하려면 같은 고부하 시간대의 다음 자료가 필요하다.

1. Dashboard → Database → Query Performance에서 **Total time 상위 20개**와 **Calls 상위 20개**를 CSV로 내보낸 자료.
2. 각 행의 normalized query, calls, total execution time, mean execution time, rows, shared block hit/read 값.
3. 아래 read-only SQL 결과:

```sql
select queryid, calls, round(total_exec_time::numeric,2) total_ms,
       round(mean_exec_time::numeric,2) mean_ms, rows,
       shared_blks_hit, shared_blks_read, temp_blks_written, query
from pg_stat_statements
order by total_exec_time desc
limit 30;

select relname, n_live_tup, n_dead_tup, seq_scan, idx_scan,
       last_autovacuum, last_autoanalyze
from pg_stat_user_tables
order by n_dead_tup desc;

select state, wait_event_type, wait_event, count(*)
from pg_stat_activity
where datname=current_database()
group by 1,2,3
order by 4 desc;
```

4. 같은 시각의 Realtime 메시지 수와 Edge Function 호출 수. `game-api` 호출이 5초 주기 예상치와 맞는지 확인하면 원인을 빠르게 확정할 수 있다.

이 자료가 오면 `game_room_presence`, `game_read`, `game_commit`, Auth 검증, cleanup cron 중 실제 CPU 기여도를 수치로 분리할 수 있다.

## 제공된 운영 CSV 분석

분석 자료:

- Query Performance 상위 20개 CSV 2종
- dead tuple 현황 62개 테이블
- `pg_stat_activity` 순간 표본 9개 세션
- Edge Function 로그 100행
- Dashboard 사용량 스크린샷

### 확인된 핵심 수치

| 순위 | 쿼리 | 호출 | 평균 | 최대 | 누적 실행시간 | 전체 누적시간 비중 | 판단 |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | PostgREST `set_config` 요청 초기화 | 41,832,226 | 0.018ms | 367ms | 766,363ms | 65.10% | 호출 수가 비정상적으로 큼. 통계 기간 확인 필요 |
| 2 | `game_read` | 4,300 | 45.893ms | 5,246ms | 197,339ms | 16.76% | 애플리케이션 최대 읽기 병목 |
| 3 | `game_commit` | 673 | 94.973ms | 7,252ms | 63,917ms | 5.43% | 애플리케이션 최대 쓰기 병목 |
| 4 | 확장 목록 Dashboard 조회 | 33 | 1,184ms | 14,569ms | 39,074ms | 3.32% | Dashboard 관리 쿼리, 게임 코드 아님 |
| 5 | timezone 목록 | 61 | 530ms | 907ms | 32,334ms | 2.75% | schema cache/관리 쿼리, 게임 코드 아님 |
| 6 | `account_cleanup_guests` | 139 | 149.123ms | 445ms | 20,728ms | 1.76% | cron이 5분마다 수행, 2차 개선 후보 |
| 7 | `game_profile` | 81 | 110.787ms | 1,674ms | 8,974ms | 0.76% | 호출 빈도는 낮지만 평균 지연 큼 |
| 8 | `game_room_presence` | 1,652 | 4.347ms | 316ms | 7,182ms | 0.61% | 자체 시간보다 매 요청 UPDATE와 연쇄 비용이 문제 |
| 9 | Auth 함수 메타데이터 조회 | 55 | 93.216ms | 256ms | 5,127ms | 0.44% | 플랫폼/schema cache |
| 10 | Dashboard 함수 메타데이터 조회 | 17 | 290.384ms | 1,186ms | 4,937ms | 0.42% | Dashboard 관리 쿼리 |
| 11 | Auth users 조회 | 4,768 | 0.899ms | 216ms | 4,286ms | 0.36% | 매 Edge 요청의 `auth.getUser`와 수치가 유사 |
| 12 | Dashboard migration 상태 조회 | 7 | 596.795ms | 4,039ms | 4,178ms | 0.35% | Dashboard 관리 쿼리 |
| 13 | PgBouncer 인증 | 242 | 14.525ms | 2,115ms | 3,515ms | 0.30% | 연결/풀링 비용 |
| 14 | Auth column 메타데이터 조회 | 61 | 55.686ms | 195ms | 3,397ms | 0.29% | 플랫폼/schema cache |
| 15 | Dashboard schema 목록 | 37 | 90.943ms | 2,943ms | 3,365ms | 0.29% | Dashboard 관리 쿼리 |
| 16 | Realtime messages INSERT | 53 | 57.078ms | 581ms | 3,025ms | 0.26% | Broadcast 저장 비용, 횟수는 많지 않음 |
| 17 | Auth sessions 조회 | 4,800 | 0.617ms | 528ms | 2,964ms | 0.25% | Auth 검증 비용, 병목은 아님 |
| 18 | `account_data` | 114 | 21.180ms | 311ms | 2,415ms | 0.21% | 계정 UI 조회 |
| 19 | Dashboard large-object 보고서 | 6 | 359.901ms | 455ms | 2,159ms | 0.18% | Dashboard 관리 쿼리 |
| 20 | cron 실행 기록 INSERT | 139 | 13.963ms | 52ms | 1,941ms | 0.16% | cleanup cron과 호출 수 일치 |

두 Query Performance CSV는 같은 `pg_stat_statements` 표본을 다른 열 구성으로 내보낸 것으로 보인다. `Supabase Snippet Untitled query.csv`의 `percentage_cpu`는 실제 OS CPU 샘플이 아니라 각 문장의 `total_exec_time` 비율이다. 따라서 65.10%를 “현재 DB CPU의 65%”라고 직접 해석하면 안 된다.

### 운영 자료로 확정된 우선순위

1. `game_read`가 게임 코드의 가장 큰 누적 병목이다. 4,300회 호출, 평균 45.9ms이며 최악에는 5.25초가 걸렸다. 5초 polling과 Broadcast 재조회 제거가 최우선이다.
2. `game_commit`은 호출당 비용이 더 크다. 평균 95ms, 최악 7.25초다. 참가자 전체 교체와 큰 JSONB 전체 갱신을 작은 변경 쿼리로 나눠야 한다.
3. `game_room_presence` 자체의 누적시간은 0.61%지만 1,652번의 UPDATE와 dead tuple/WAL을 만든다. 게임 조회 4,300회보다 호출 수가 적은 것은 통계 구간 중간에 presence가 도입됐거나 배포 버전이 섞였다는 뜻이다.
4. `account_cleanup_guests`는 지속 포화의 주원인은 아니지만 작은 데이터베이스에서 평균 149ms는 비싸다. 5분 주기 대신 15~30분 주기와 더 좁은 후보 조회가 적절하다.
5. Auth users/session 조회는 각각 약 4,800회지만 평균 1ms 미만이며 합계 비중도 0.61%다. 인증이 현재 주병목이라는 증거는 없다.

### 4,183만 회 `set_config`에 대한 판단

이 문장은 PostgREST가 요청마다 role, JWT claims, path 등을 설정할 때 실행한다. 호출 수 4,183만 회는 게임의 3,355 Edge Function invocation, `game_read` 4,300회, Auth 검증 약 4,800회와 전혀 맞지 않는다.

가능성은 다음 세 가지다.

1. `pg_stat_statements`가 매우 오래전에 reset되어 과거의 다른 트래픽까지 누적됐다.
2. 과거 배포 버전이나 외부 service-role 사용자가 대량 REST 요청을 만들었다.
3. Supabase 내부 service-role 작업의 누적 통계가 함께 포함됐다.

평균 실행시간이 0.018ms라 호출 한 번은 가볍다. 통계 기간을 모르면 이 값만으로 현재 100% CPU 원인이라고 확정할 수 없다. 다만 reset 시점이 최근이라면 별도의 runaway 요청이 존재한다는 강한 증거다.

### 활동 세션 표본

`pg_stat_activity` 9행 중 여러 세션이 동시에 `game_commit`을 실행하고 있었고, 3개는 `idle in transaction (aborted)` 상태였다. 이는 표본 시점에 commit 충돌 또는 실패 트랜잭션이 실제로 몰렸다는 증거다. 표본 쿼리는 현재 로컬 코드의 `game_try_commit`이 아니라 구버전의 직접 `game_commit` 호출이다. 따라서 CSV는 quiet conflict 수정 배포 전후가 섞인 누적 통계일 가능성이 높다. 새 수정의 효과는 통계 reset 후 다시 측정해야 분리할 수 있다.

### dead tuple 및 디스크 상태

- 비율은 game_sessions 66%, player_stats 84%, profiles 75% 등으로 높지만 절대 개수는 각각 28, 16, 9개에 불과하다.
- rooms dead tuple 4개, room_members 4개다.
- 데이터베이스 전체 크기도 0.03GB다.
- 애플리케이션 상위 쿼리의 cache hit rate는 약 99.98~100%다.

따라서 현재 CPU 포화는 디스크 읽기나 테이블 팽창보다 반복 실행, JSON 처리, 전체 상태 쓰기와 transaction overhead 쪽이 훨씬 유력하다.

### Edge Function 로그와 사용량

- 로그 100행은 2026-09-21 15:33:06~15:38:22 UTC, 약 5분 16초 구간이다.
- 오류 메시지는 없고 Boot 26행, Shutdown 74행이다. 잘린 100행 표본이라 부팅/종료 비율 자체는 전체 수명주기를 뜻하지 않는다.
- 짧은 구간에 서로 다른 execution id가 74개 보이므로 호출이 여러 isolate로 분산되고 종료되는 churn은 확인된다.
- Dashboard 누적값은 Edge Function invocation 3,355, Realtime message 3,632, Realtime peak connection 3이다.
- peak connection이 3인데 메시지가 3,632개인 것은 연결 누수보다 게임 상태 변경 Broadcast와 반복 API 호출이 누적된 결과에 가깝다.

### 다음 측정에 필요한 최소 정보

아래 두 값만 추가로 확인하면 4,183만 호출의 의미와 최신 conflict 수정 효과를 분리할 수 있다.

```sql
select stats_reset from pg_stat_statements_info;

select calls, total_exec_time, mean_exec_time, query
from pg_stat_statements
where query ilike '%game_try_commit%'
   or query ilike '%game_commit%'
   or query ilike '%game_read%'
   or query ilike '%game_room_presence%'
order by total_exec_time desc;
```

가장 정확한 재측정 방법은 현재 통계를 별도 CSV로 보관한 뒤 통계를 reset하고, 2명이 10분간 한 게임을 진행한 직후 같은 두 조회를 다시 실행하는 것이다. reset은 기존 서비스 데이터를 삭제하지 않지만 모니터링 누적값을 지우므로 실제 수정 단계에서 별도 동의를 받고 수행해야 한다.

### 추가 함수별 통계 결과

추가로 받은 필터 조회에서도 런타임 호출은 다음 세 개뿐이다.

| 함수 | 런타임 호출 | 누적시간 | 평균시간 |
| --- | ---: | ---: | ---: |
| `game_read` | 4,300 | 197,338.98ms | 45.89ms |
| `game_commit` | 673 | 63,916.91ms | 94.97ms |
| `game_room_presence` | 1,652 | 7,181.60ms | 4.35ms |
| `game_try_commit` | 0 | 0 | 측정 없음 |

`game_try_commit`에 해당하는 1회·99.76ms 행은 함수 실행이 아니라 `CREATE FUNCTION` DDL 실행 기록이다. 따라서 새 CAS wrapper가 설치된 사실은 확인되지만, 이 통계 표본에는 wrapper를 통한 실제 게임 mutation이 한 번도 기록되지 않았다.

이는 다음 중 하나를 의미한다.

1. CSV가 새 game-api 배포 전부터 누적된 과거 통계이며 배포 후 아직 게임 mutation이 없었다.
2. DB 함수는 설치됐지만 실제 호출 중인 Edge Function이 여전히 직접 `game_commit`을 쓰는 구버전이다.

현재 로컬 소스는 `game_try_commit`을 호출하므로, 다음 실제 게임 후에도 runtime `game_try_commit` 호출이 0이면 배포 불일치가 확정된다. 반대로 `game_try_commit`이 증가하면 기존 673회의 `game_commit`은 배포 전 누적값이다.

또한 `game_read` 4,300회에 비해 presence가 1,652회뿐이라는 점도 서로 다른 배포 시기의 통계가 섞였음을 보여준다. 현재 서버 코드에서는 대부분의 `game_read` 요청 직전에 presence를 호출하므로 동일 버전·동일 기간이라면 두 수치는 훨씬 가까워야 한다.

아직 `pg_stat_statements_info.stats_reset` 값은 제공되지 않았다. 따라서 4,183만 `set_config` 호출의 초당 비율은 계산할 수 없다.
