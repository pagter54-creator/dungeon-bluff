# PVE BETA-001 Human Playtest Checklist

## 첫 테스트의 목적

첫 human smoke는 밸런스 평가가 아니다.

> **실제 플레이어가 방 생성 → 로비 → MAP_VOTE → 전투 → 방 진행 → Boss/결과까지 끊기지 않고 플레이할 수 있는지 확인한다.**

몬스터 HP, 직업 강약, Gold 양 같은 밸런스 의견은 기록하되 첫 smoke에서 즉시 수치를 수정하지 않는다.

---

## 세션 기록

```text
세션 ID:
날짜:
테스트 프런트 URL:
Test Supabase project ref:
Branch:
HEAD:
roomId:
runId:

참가자 수:
참가자/좌석:
캐릭터:
브라우저/버전:
PC/모바일:
네트워크:

시작 시각:
종료 시각:
최종 phase:
최종 floor/depth:
결과: RUN_CLEAR / RUN_FAILED / ABANDONED / 중단
```

### 진행 요약

- [ ] 방 생성
- [ ] 방 찾기/입장
- [ ] 로비
- [ ] 지도
- [ ] 일반 전투
- [ ] 직업 능력
- [ ] 이벤트
- [ ] 휴식
- [ ] 상점
- [ ] 보상방
- [ ] KO/Flame
- [ ] 재접속
- [ ] Floor Boss
- [ ] 결과/정산

---

# Smoke A — 방 생성

- [ ] 방 생성 화면 열기
- [ ] 초기 선택이 **경쟁 탐험**
- [ ] **협력 탐험** 선택 가능
- [ ] BETA badge 표시
- [ ] `Gold 획득 가능 · RP 변동 없음` 안내
- [ ] 방 제목 입력
- [ ] 비밀번호 없이 생성 가능
- [ ] 비밀번호를 넣어 생성 가능

기대:

```text
room.gameMode = COOP_PVE
```

기록:

```text
roomId:
roomCode:
password room: YES / NO
실제 표시:
```

---

# Smoke B — 방 찾기

다른 클라이언트에서 확인한다.

- [ ] 방 목록에 생성한 PVE 방 노출
- [ ] `협력 탐험` badge
- [ ] `BETA` 표시
- [ ] 인원수 정상
- [ ] 비밀번호 여부 정상
- [ ] 경쟁방과 즉시 구분 가능
- [ ] 경쟁방에도 잘못된 BETA가 붙지 않음

---

# Smoke C — 입장 / 로비

- [ ] 공개방 입장
- [ ] 비밀번호방 입장
- [ ] 코드 입장
- [ ] 모든 클라이언트에 `COOP_PVE` 동일 표시
- [ ] 캐릭터 선택
- [ ] 캐릭터 변경 시 ready 해제
- [ ] 준비/준비 취소
- [ ] AI 추가 가능
- [ ] AI 제거 가능
- [ ] 4명/준비 조건 전에는 시작 버튼 비활성
- [ ] PVE 미지원 캐릭터라면 시작 차단 및 명확한 안내
- [ ] 새로고침 후 같은 로비 복구
- [ ] reconnect 후 mode가 경쟁 탐험으로 돌아가지 않음

---

# Smoke D — 게임 시작

호스트가 시작한다.

- [ ] 시작 요청 성공
- [ ] 경쟁 세션 loading 화면으로 가지 않음
- [ ] PVE 화면으로 전환
- [ ] run이 존재
- [ ] run phase = `MAP_VOTE`
- [ ] floor = 1
- [ ] 공개 지도 표시

서버/DB 기대:

```text
COOP_PVE
→ pve_start_room
→ pve_runs 1개 생성
→ game_sessions 0개
→ MAP_VOTE
```

BLOCKER:

- 경쟁 `game_sessions`가 생성됨
- PVE run 미생성
- 호스트만 PVE 화면이고 다른 플레이어는 경쟁 화면

---

# Smoke E — 지도

- [ ] Floor/Depth 표시
- [ ] 현재 위치 확인
- [ ] 연결된 다음 방만 선택 가능
- [ ] room type 표시
- [ ] 인간 플레이어 투표 가능
- [ ] AI는 투표하지 않음
- [ ] 표 수 갱신
- [ ] 동률일 때 deterministic 선택
- [ ] 선택 완료 후 해당 방으로 이동
- [ ] 다른 클라이언트에서도 동일 node/phase

기록:

```text
선택 후보:
투표:
선택된 nodeId:
이동 후 phase:
```

---

# Smoke F — 일반 전투

최소 1회 실제 인간 4인/혼합 파티로 수행한다.

- [ ] 내 remaining card만 선택 가능
- [ ] 카드 선택
- [ ] 카드 제출
- [ ] 제출한 사람 여부는 공개
- [ ] 상대 카드 숫자는 reveal 전 비공개
- [ ] 전원 제출 후 동시 reveal
- [ ] 같은 숫자 collision 처리
- [ ] unique 카드 damage 처리
- [ ] 몬스터 HP 모든 클라이언트 일치
- [ ] 플레이어 HP 모든 클라이언트 일치
- [ ] class resource 갱신
- [ ] 다음 턴 정상 시작
- [ ] physical card spent 처리
- [ ] cycle exhaustion 후 reset
- [ ] 새로고침해도 내 private remaining/spent 복구
- [ ] 타 플레이어 private card state가 노출되지 않음

BLOCKER:

- 턴이 더 이상 진행되지 않음
- 한 클라이언트만 다른 HP/phase
- hidden card 정보 노출
- 동일 physical card duplicate

---

# Smoke G — 직업 특수 능력

첫 smoke에서는 서로 다른 직업 2~4개면 충분하다.

캐릭터 1:
- [ ] UI 활성 상태 정상
- [ ] 사용 요청 성공
- [ ] resource/cooldown 정상
- [ ] 엔진 효과 정상
- [ ] 다른 플레이어 UI에도 공개 가능한 결과만 표시

캐릭터 2:
- [ ] UI 활성 상태 정상
- [ ] 사용 요청 성공
- [ ] 엔진 효과 정상

선택적으로:

- [ ] 계시/정보계 스킬 hidden-info 경계 확인
- [ ] cycle/resource 회복계 스킬 중복/재귀 없음
- [ ] Full Burst 등 multi-hit physical card 중복 없음

---

# Smoke H — Event

Event room을 최소 1회 방문한다.

- [ ] 이벤트 제목/설명
- [ ] 선택지 표시
- [ ] 각 인간이 필요한 선택 가능
- [ ] 선택 완료/판정
- [ ] Gold/EXP/HP/상태 변화가 서버와 UI에 동일
- [ ] 결과 후 다음 진행
- [ ] 이벤트에서 softlock 없음

기록:

```text
event id:
선택:
변경된 자원:
다음 phase:
```

---

# Smoke I — Rest

경로에 Rest가 있다면 확인한다.

가능한 선택:

- [ ] 회복
- [ ] Flame +1
- [ ] Number Engraving

검증:

- [ ] 플레이어별 독립 선택
- [ ] 서로 다른 선택을 동시에 해도 정상
- [ ] 완료 후 state 합의
- [ ] 다음 방 진행

---

# Smoke J — Shop

현재 구현된 범위에서 확인한다.

- [ ] Run Gold 표시
- [ ] card item 표시
- [ ] relic item 표시
- [ ] 구매
- [ ] Gold 차감
- [ ] shared stock 동기화
- [ ] card replacement
- [ ] reservation
- [ ] cancel/release
- [ ] shop ready
- [ ] 모든 플레이어 준비 후 진행

미구현 UI/기능이 보이면 숨기지 말고 HIGH/BLOCKER 후보로 기록한다.

---

# Smoke K — Reward Room

첫 경로에 없다면 별도 test run으로 넘겨도 된다.

- [ ] reward card submission
- [ ] collision
- [ ] valid ordering
- [ ] reward 결과
- [ ] relic 선택
- [ ] leftover/random distribution
- [ ] room 종료 후 다음 진행

---

# Smoke L — KO / Flame

의도적으로 피해를 받아 한 번 확인한다.

- [ ] HP 0
- [ ] DOWNED 상태
- [ ] Flame 소비
- [ ] 부활 조건
- [ ] 부활 HP
- [ ] 다른 플레이어 state 일치

Flame 0 full wipe까지 첫 human smoke에서 강제로 만들 필요는 없다. 자동 T14 회귀가 담당한다.

---

# Smoke M — 재접속

지도 또는 전투 중 인간 1명이 새로고침한다.

- [ ] 같은 방으로 복귀
- [ ] `COOP_PVE` 유지
- [ ] 같은 runId
- [ ] 동일 floor/depth/node
- [ ] 동일 phase
- [ ] 공개 state 정상
- [ ] 본인 private card state 복구
- [ ] 타인의 hidden card 정보 없음
- [ ] 이미 제출한 카드가 중복 제출되지 않음
- [ ] 재접속 후 다음 턴/방 진행 가능

---

# Smoke N — Floor Boss

최소 Floor 1 Boss까지 진행한다.

- [ ] Boss 방 진입
- [ ] Boss HP 표시
- [ ] Boss intent/pattern
- [ ] 전투 진행
- [ ] Boss clear
- [ ] Flame +1
- [ ] Boss clear heal
- [ ] Floor transition
- [ ] 다음 floor map 진입

---

# Smoke O — RUN_CLEAR

가능하면 3층 완주한다. 너무 길면 accelerated test fixture/계정에서 reward 검증을 별도로 수행한다.

- [ ] phase = RUN_CLEAR
- [ ] 내 최종 runGold 표시
- [ ] 결과 화면에 **RP 변동 없음**
- [ ] 등록 계정 Account Gold += authoritative runGold
- [ ] RP unchanged
- [ ] competitive leaderboard RP unchanged
- [ ] 결과 재조회
- [ ] Gold가 두 번 지급되지 않음

기록:

```text
runGold before settlement:
Account Gold before:
Account Gold after:
RP before:
RP after:
second getState after Gold:
```

---

# Smoke P — RUN_FAILED

별도 테스트 세션/fixture에서 실패 상태를 만든다.

기대:

```text
permanent Gold += 0
RP delta = 0
runGold forfeited
```

- [ ] 결과 화면 실패 표시
- [ ] Run Gold 영구 지급 없음 안내
- [ ] Account Gold unchanged
- [ ] RP unchanged
- [ ] 재조회해도 지급 없음
- [ ] `rewards_committed` terminal 처리 확인

---

# Smoke Q — ABANDONED / 중도 탈주

별도 테스트에서 진행 중 인간 한 명이 나간다.

- [ ] 떠난 자리는 PVE AI가 이어받음
- [ ] 떠난 사용자 `departed=true`
- [ ] 남은 파티는 진행 가능
- [ ] 떠난 플레이어의 해당 run Gold는 영구 지급 없음
- [ ] 떠난 플레이어 RP unchanged

남은 파티가 이후 RUN_CLEAR:

- [ ] 남아 있던 등록 플레이어는 자신의 runGold 지급
- [ ] 떠난 플레이어는 0G
- [ ] settlement 완료/idempotent

마지막 인간이 나가 방이 닫힘:

- [ ] room = closed
- [ ] unfinished run = ABANDONED
- [ ] permanent Gold 지급 없음
- [ ] RP 변화 없음

---

# Production 보호 확인

human test 시작 전에 다시 확인한다.

- [ ] 테스트 프런트 URL이다.
- [ ] 테스트 Supabase project ref다.
- [ ] production ref가 아니다.
- [ ] production Pages가 아니다.
- [ ] `main` merge하지 않았다.
- [ ] production DB migration하지 않았다.
- [ ] production Edge Function을 덮어쓰지 않았다.

---

# Bug 기록 양식

```text
Bug ID:
세션 ID:
roomId:
runId:
playerId/seat:
floor/depth/nodeId:
phase:
actionId:
errorCode:

심각도: BLOCKER / HIGH / MEDIUM / LOW
브라우저:
PC/모바일:
네트워크:

막힌 지점:
재현 방법:
1.
2.
3.

예상 결과:
실제 결과:

재현율:
스크린샷/영상:
서버 로그 시간:
추가 메모:
```

## Severity 기준

### BLOCKER

- 게임 시작 불가
- 다음 방 이동 불가
- 턴 진행 불가
- PVE run state 소실
- 모든 플레이어 reconnect 실패
- Gold/RP 잘못 지급
- hidden info leak

### HIGH

- 특정 직업 사용 시 진행 불가
- Shop/Reward/Event softlock
- 한 명만 지속적으로 state 불일치
- physical card duplication/ownership 문제

### MEDIUM

- UI 갱신 지연
- 설명이 실제 서버 규칙과 다름
- 특정 animation/UI 깨짐
- 결과 표시 오류지만 서버 state는 정상

### LOW

- 정렬
- 색상
- 텍스트
- 작은 시각 문제

---

# 밸런스 의견 기록

기능 bug와 분리한다.

```text
BALANCE NOTE
캐릭터/몬스터/방:
관찰:
체감:
관련 턴/상황:
현재는 수정하지 않음: YES
```

첫 BETA human smoke에서는 다음을 발견해도 우선 기록만 한다.

- 몬스터가 너무 강함/약함
- 특정 직업이 너무 강함/약함
- Gold가 많음/적음
- 진행 턴 수가 길음/짧음

여러 human run 데이터가 쌓이기 전까지 Stress Harness 수치나 밸런스를 즉시 변경하지 않는다.

---

# 세션 종료 체크

- [ ] BLOCKER 존재 여부 기록
- [ ] HIGH 존재 여부 기록
- [ ] server identifiers 저장
- [ ] Gold/RP 전후값 기록
- [ ] screenshot/log 링크 정리
- [ ] balance note 별도 분리
- [ ] 다음 테스트에서 재검증할 bug 표시
- [ ] production 환경에 변경이 없었음을 확인
