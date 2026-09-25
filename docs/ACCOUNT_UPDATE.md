# 계정·랭킹·상점 업데이트 적용 안내

플레이 주소: https://pagter54-creator.github.io/dungeon-bluff/
Supabase 프로젝트: lktjmuhbfnahdghidqfa

**2026-09-21 적용 상태:** 추가 migration 202609210004 적용 및 이력 기록 완료. game-api / account-api / cleanup-guests 배포 완료(ACTIVE 확인). 샘플 상품 6개와 5분 간격 Cron ACTIVE 확인. 이 프로젝트에서는 아래 SQL 적용·함수 배포·Cron 생성 단계를 다시 실행할 필요가 없습니다. Supabase Confirm Email OFF 적용 완료. 익명 로그인·수동 계정 연결·이메일 가입 활성화도 확인했습니다. GitHub에 최신 프런트엔드를 업로드하세요. 브라우저 플레이와 실제 사용자 가입 검증은 수행하지 않았습니다.

검증: JS/TS 32개 문법·참조 검사, 자동 테스트 **75개 통과**. Auth 네트워크 동작은 테스트 대체 구현으로 호출 순서와 세션 처리를 검증했고, DB·RPC·보상·구매·RLS는 실제 PostgreSQL 엔진(PGlite)에서 검증했습니다.

## 구현 내용

- 익명 ID를 유지하는 이메일·비밀번호 즉시 가입, 로그인·로그아웃. 메일 확인 단계가 없습니다.
- 가입 닉네임 전역 중복 방지(NFC 정규화·앞뒤 공백 제거·대소문자 무시), 가입 후 무료 변경 1회, 이후 50 Account Gold.
- 게스트 `기본이름#0000` 형식, 실제 조작 시간 기반 정리. 단순 상태 조회는 last_active_at을 갱신하지 않습니다.
- RP 1000 시작, 성공 원정의 순위별 +30/+10/-10/-20. 몬스터 리마스터부터 전멸 시에도 도달 스테이지별 골드를 차등 지급하고 RP는 유지합니다. [리마스터 안내](MONSTER_REMASTER.md) 참고.
- 서버 트랜잭션 보상, 결과 중복 방지, 순위 통계, 누적 점수·골드.
- 랭킹 Top 100 및 내 순위, 상점, 인벤토리, 기본 카드와 샘플 앞면/뒷면 각 3종.
- 카드 치장은 한 개당 5G. 스킨 뽑기는 후속 업데이트에서 10 Account Gold에 중복 없이 뽑는 기능으로 활성화했습니다. [스킨 업데이트 안내](SKIN_UPDATE.md)를 참고하세요.
- 자기 패널 카드에서 선택·제출, 모바일 하단 고정 카드 바, 공통 카드 컴포넌트.
- 게임 시작 때 등록 계정의 장착을 DB 스냅샷으로 고정하고, 상대 치장도 표시합니다.
- preload manifest 및 SVG 미리보기 6개. 필수 UI/기본 캐릭터는 기존 CSS·인라인 SVG이므로 외부 이미지 요청 없이 표시합니다.
- 최대 HP 3, 부활 HP 3, 파티 누적 기절 8회 실패를 유지합니다.

### 세부 판정

RP 순위는 AI·게스트를 포함한 4명의 원정 점수로 정합니다. 동점은 차지한 순위들의 RP 평균입니다. 명세의 2명 동점 예시는 그대로 적용합니다. 3명·4명 동점은 소수점이 생길 수 있어 가장 가까운 정수로 반올림합니다(정확히 .5는 0에서 멀어지는 방향). 예: 네 명 공동 1위는 (30+10-10-20)/4=2.5 → 각 +3 RP. RP 하한은 0입니다. 결과의 rating_delta는 하한 적용 후 실제 변화량입니다. 공동 순위 통계는 공동으로 차지한 가장 높은 순위에 1회를 기록합니다.

기절 손실 때문에 Run Gold가 음수가 된 경우 영구 골드는 0G 지급합니다. Run Gold 손실이 이미 보유한 Account Gold를 차감하지는 않습니다.

보상 수령 자격은 게임 시작 당시 등록 여부로 고정합니다. 진행 중 가입한 게스트와 중도 이탈해 AI로 교체된 사용자는 해당 판의 영구 보상을 받지 않습니다. 업데이트 이전에 시작·종료한 원정에도 소급 지급하지 않습니다. 치장 변경은 다음 원정부터 적용됩니다.

## 1. GitHub Pages 파일 업로드

현재 Pages의 index.html 위치에 다음을 덮어쓰세요. 별도 npm build는 없습니다.

```text
index.html
styles.css
config.js
src/ 전체
assets/ 전체
bgm_lobby.mp3
bgm_dungeon.mp3
준비해 둔 sfx_*.mp3 (있는 경우)
```

이번에 새로 추가한 src 파일을 빠뜨리지 마세요. 기존 BGM/SFX 파일은 변경하지 않았으므로 이미 업로드되어 있다면 다시 올릴 필요는 없습니다. GitHub 커밋 후 Pages 배포가 끝나면 Ctrl+F5로 갱신합니다. 모든 플레이어에게 같은 클라이언트 버전을 사용하도록 안내하세요.

## 2. SQL 적용

이번 추가 migration:

`supabase/migrations/202609210004_account_cosmetics.sql`

이미 적용된 초기 SQL 파일들은 수정하지 않았습니다. 이번 파일은 profiles를 확장하고 새 테이블·권한·보상 트리거·RPC를 추가합니다. 기존 방·기록을 삭제하지 않습니다. 기존 게스트에게는 코드가 붙고, 게스트 활동 시간은 적용 시점으로 초기화되어 최소 30분의 유예가 있습니다.

현재 프로젝트는 초기 202609200001/202609200002 SQL을 수동 적용한 이력이 있으므로 **무작정 db push를 실행하지 마세요.** 이미 적용한 추가 SQL도 다시 실행하지 마세요.

아직 적용하지 않은 다른 서버에 설치하려면:

1. Supabase Dashboard → 해당 프로젝트 → **SQL Editor** → **New query**.
2. 위 migration 파일 전체를 붙여넣고 **Run**. 파일에 BEGIN/COMMIT이 포함되어 한 번에 적용됩니다.
3. **Table Editor**에서 player_stats, game_results, shop_items, player_inventory, player_loadout, game_reward_members를 확인합니다.
4. shop_items에 5G 카드 치장 10개가 있는지 확인합니다.

PowerShell로 같은 작업을 하려면:

```powershell
Set-Location -LiteralPath 'C:\Users\pagte\Desktop\Dungeon Bluff'
npx.cmd supabase login
npx.cmd supabase link --project-ref lktjmuhbfnahdghidqfa
npx.cmd supabase db query --linked --file supabase/migrations/202609210004_account_cosmetics.sql
npx.cmd supabase migration repair 202609210004 --status applied --linked
```

## 3. Edge Function 배포

기존 game-api를 재배포하고, account-api와 cleanup-guests를 새로 배포합니다.

```powershell
Set-Location -LiteralPath 'C:\Users\pagte\Desktop\Dungeon Bluff'
npx.cmd supabase functions deploy game-api
npx.cmd supabase functions deploy account-api
npx.cmd supabase functions deploy cleanup-guests
```

supabase/config.toml에 세 함수의 verify_jwt=false가 있습니다. game-api/account-api는 매 요청에서 Supabase Auth의 getUser로 JWT를 검증합니다. 브라우저에 service_role 키를 넣지 마세요. config.js는 기존 publishable key만 유지합니다.

cleanup-guests는 일반 플레이어 JWT를 받지 않고 별도 CLEANUP_SECRET과 일치하는 서버 요청만 허용합니다. 아래 기본 Cron은 동일한 DB 함수에 직접 접근하므로 CLEANUP_SECRET이나 Edge HTTP 호출이 필요 없습니다. Edge endpoint를 외부 스케줄러에서 사용하려면 Dashboard → Edge Functions → Secrets에서 CLEANUP_SECRET을 긴 임의 문자열로 저장하고, 서버의 POST Authorization: Bearer 헤더로만 전달하세요. 그 비밀은 GitHub나 프런트엔드에 올리지 않습니다.

## 4. 게스트 자동 정리 예약

SQL Editor에서 `supabase/setup-cleanup-cron.sql` 전체를 실행합니다. 또는:

```powershell
npx.cmd supabase db query --linked --file supabase/setup-cleanup-cron.sql
npx.cmd supabase db query --linked --file supabase/check-cleanup-cron.sql
```

5분마다 `dungeon-bluff-cleanup-guests` 작업이 실행됩니다. 같은 이름으로 다시 설정해도 예약이 중복되지 않습니다. Dashboard → **Integrations → Cron → Jobs**에서 작업과 실행 기록을 확인할 수 있습니다. pg_cron 확장이 없다면 설정 SQL이 설치합니다. 공식 안내: https://supabase.com/docs/guides/cron/quickstart

정리 순서:

1. 예약 작업은 방을 종료하지 않습니다. 기존 방 만료 처리는 game-api의 방 조회·요청에서 별도로 동작합니다.
2. 마지막 실제 조작 후 30분이 지난 게스트를 최대 100명씩 확인합니다.
3. 활성 방·게임 또는 남은 멤버십이 있으면 보존합니다.
4. Auth에서도 여전히 익명이며 이메일이 없는 사용자만 잠금 후 삭제합니다. 등록 계정과 이메일 전환을 마친 Auth 계정은 제외합니다.
5. auth.users 삭제에 따라 임시 profile이 함께 제거됩니다. 종료된 방과 원정 기록은 남고, 삭제된 게스트의 역사적 host 참조만 null이 됩니다.

단순 조회/heartbeat는 게스트의 실제 활동 시간을 늘리지 않습니다. 다만 활성 방 참가자는 계속 보호됩니다. 삭제된 게스트가 다시 방문하면 새 익명 세션을 생성합니다. 원래 게스트 계정은 복구 대상이 아닙니다.

## 5. Auth 설정 — 즉시 가입

연결된 프로젝트의 **Confirm Email = OFF**를 적용하고 서버와 일치하는지 재확인했습니다. supabase/config.toml에서 익명 로그인(enable_anonymous_sign_ins), 수동 연결(enable_manual_linking), 이메일 가입(enable_signup)은 true, 이메일 확인(enable_confirmations)은 false로 유지합니다.

다른 서버에 설치할 때는 Dashboard → Authentication → Sign In / Providers에서 익명 로그인, 수동 연결, Email 가입을 켜고 Confirm Email을 끕니다. CLI에서는 npx.cmd supabase config diff로 변경 사항을 확인한 후 npx.cmd supabase config push --yes로 적용할 수 있습니다.

가입에는 SMTP 설정, 메일 발송, 인증 링크, 추가 비밀번호 설정이 필요 없습니다. 기존 Site URL 설정은 그대로 두며 가입 요청에 리디렉션 주소를 전달하지 않습니다.

클라이언트는 닉네임을 서버에서 검사한 뒤 현재 익명 사용자에 updateUser({email,password})를 한 번 호출합니다. Supabase가 이메일을 자동 확인하면서 동일 ID의 영구 계정으로 전환합니다. 이어서 기존 get_account가 registered 상태와 초기 통계를 확정합니다. 비밀번호는 Auth에만 전달하며 게임 DB나 로컬 저장소에 저장하지 않습니다. 서버 프로필 및 통계 구조는 그대로 유지합니다.

공식 설정 및 동작 근거: [CLI Auth 설정](https://supabase.com/docs/guides/local-development/cli/config), [Supabase Auth 사용자 업데이트 구현](https://github.com/supabase/auth/blob/master/internal/api/user.go).

## 6. 이메일 가입·재로그인 확인 절차

1. 계정 → 계정 등록에서 이메일, 8자 이상 비밀번호, 비밀번호 확인, 닉네임을 입력합니다.
2. 비밀번호가 다르면 서버 요청 전에 즉시 오류가 표시됩니다.
3. **가입 완료**를 누르면 등록 계정으로 전환되고 1000 RP / 0 Account Gold / 무료 닉네임 변경 1회를 사용할 수 있습니다.
4. Dashboard → Authentication → Users에서 등록 전후 user ID가 같은지 확인할 수 있습니다.
5. 무료 닉네임 변경을 사용한 뒤에는 다음 변경 비용이 50G가 됩니다.
6. 방에서 나온 뒤 로그아웃하고 이메일·비밀번호로 로그인하면 기존 닉네임·RP·보유품·장착이 유지됩니다.

Auth 오류나 닉네임 선점으로 등록이 완료되지 않으면 오류를 표시하며 가입 성공으로 안내하지 않습니다. 닉네임 충돌은 다른 닉네임으로 다시 시도하세요. 네트워크 오류 후에는 계정 화면을 다시 열면 서버의 실제 등록 상태를 확인합니다.

이번 즉시 가입 변경의 Pages 업로드 대상은 src/api.js, src/account-ui.js입니다. 계정 업데이트 전체를 아직 올리지 않았다면 1절의 전체 목록을 올리세요. 추가 SQL 적용이나 Edge Function 재배포는 필요 없습니다.

## 7. PC / 모바일 실제 테스트 체크리스트

이번 작업에서는 요청대로 브라우저 플레이 테스트와 실제 사용자 가입은 수행하지 않았습니다. 아래는 배포 후 사용자가 확인할 항목입니다.

- [ ] 첫 방문 게스트로 방 생성·참가·캐릭터 선택·AI 추가·카드 제출이 된다.
- [ ] PC에서 별도 MAKE YOUR CHOICE 대형 영역이 없고 자기 패널에서 제출한다.
- [ ] 모바일 하단 카드 바가 보이며, 스크롤 중에도 선택·제출이 된다.
- [ ] 제출 후 버튼이 잠기고 다음 턴에 다시 열린다.
- [ ] 사용한 카드는 어둡고 OFF이며 클릭할 수 없다.
- [ ] 상대 패의 공개 숫자와 사용 상태는 보이지만 제출한 숫자는 공개 전 보이지 않는다.
- [ ] 원정 성공 후 등록 계정에 RP/Gold가 한 번만 반영되고 새로고침해도 추가 지급되지 않는다.
- [ ] 8회 기절로 전멸하면 도달 스테이지별 골드를 정산하고 영구 RP는 유지된다. 부활 HP는 3이다.
- [ ] 랭킹을 열 때 최신 RP가 보이고 내 행이 강조된다.
- [ ] 성공 원정으로 번 골드로 5G 치장을 사고 잔액이 5만 감소한다.
- [ ] 같은 상품을 재구매할 수 없고 잔액 부족이면 아이템도 지급되지 않는다.
- [ ] 인벤토리에 보유품과 기본품만 보이며 앞면/뒷면을 각각 장착할 수 있다.
- [ ] 다음 원정에서 자신의 치장이 상대 화면에도 보인다. 앞면 숫자는 읽기 쉽다.
- [ ] 제출 뒷면과 드로우 연출에도 장착 뒷면이 보인다.
- [ ] 스킨 뽑기는 10 Account Gold를 한 번 차감하고 미보유 스킨을 지급하며, 재시도는 추가 차감하지 않는다.
- [ ] 모바일 음량 슬라이더와 BGM 전환, 기존 화려한 전투 연출이 유지된다.
- [ ] Cron 실행 기록이 성공이며, 등록 계정은 정리되지 않는다.

## 8. 수정 파일 목록

```text
index.html
src/api.js
src/app.js
src/character-ui.js
src/character-fx.js
supabase/config.toml
supabase/functions/game-api/index.ts
supabase/functions/game-api/engine.js
tests/database.test.mjs
tests/characters.test.mjs
README.md
```

## 9. 신규 파일 목록

```text
src/account-ui.js
src/account-validation.js
src/accounts.css
src/card-component.js
src/cosmetics.js
assets/cosmetics/cards/front/card_front_01.svg
assets/cosmetics/cards/front/card_front_02.svg
assets/cosmetics/cards/front/card_front_03.svg
assets/cosmetics/cards/front/card_front_04.svg
assets/cosmetics/cards/front/card_front_05.svg
assets/cosmetics/cards/back/card_back_01.svg
assets/cosmetics/cards/back/card_back_02.svg
assets/cosmetics/cards/back/card_back_03.svg
assets/cosmetics/cards/back/card_back_04.svg
assets/cosmetics/cards/back/card_back_05.svg
supabase/functions/account-api/index.ts
supabase/functions/cleanup-guests/index.ts
supabase/migrations/202609210004_account_cosmetics.sql
supabase/setup-cleanup-cron.sql
supabase/check-cleanup-cron.sql
tests/account-ui.test.mjs
docs/ACCOUNT_UPDATE.md
```

## 10. 서버 설계와 스킨 확장 위치

player_stats / player_inventory / player_loadout / game_results는 본인 읽기만 허용하며 클라이언트 직접 쓰기는 금지합니다. 공개 랭킹 RPC는 닉네임·RP·순위·본인 여부만 반환하고 email/Auth metadata는 반환하지 않습니다. get_account 역시 다른 user_id를 보내도 JWT 소유자의 정보만 반환합니다.

게임 완료 보상은 game_sessions 상태 전환 DB 트리거가 처리합니다. 현재 game-api의 CAS 트랜잭션 안에서 결과 생성과 RP·Gold 갱신이 함께 커밋됩니다. (session_id,user_id) unique와 rewards_committed 플래그가 재지급을 막습니다. guest/AI는 통계 row가 없습니다.

후속 스킨 업데이트는 shop_items의 character_skin 및 target_character_id와 player_loadout.equipped_character_skins JSON을 사용합니다. 캐릭터 스킨은 뽑기로 획득하며 보유품과 기본 스킨만 장착합니다. src/skins.js가 skin image/의 전신·얼굴 PNG를 연결하고, 카드 치장은 기존 src/cosmetics.js 및 assets/cosmetics/를 사용합니다. 자세한 서버 변경과 업로드 목록은 [스킨 업데이트 안내](SKIN_UPDATE.md)를 참고하세요.
