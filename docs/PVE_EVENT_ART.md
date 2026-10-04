# PVE 이벤트 전용 일러스트

## 대상 확인

기존 경쟁 탐험 이벤트 16종은 모두 업로드된 PNG가 연결되어 있다. PVE EVENT runtime은 모든 층에서 F1_EVENT_DEFINITIONS의 두 이벤트를 선택한다. 두 이벤트는 별도 일러스트 없이 기존 그림을 재사용했다.

| 이벤트 | 기존 재사용 | 신규 PNG |
|---|---|---|
| 버려진 야영지 / f1_abandoned_camp | shared_supplies | monster/f1_abandoned_camp.png |
| 풍화된 제단 / f1_weathered_shrine | ancient_gate | monster/f1_weathered_shrine.png |

## 적용

eventArt는 eventId 전용 이미지 → illustrationId 이미지 → 기존 SVG 순서로 선택한다. PVE 화면은 두 ID를 별도로 전달하여 과거 저장 원정에도 전용 그림을 표시한다. 원본 16종 및 서버 이벤트 규칙은 변경하지 않는다. 이미지 로드 실패 시 기존 bindEventArtFallback을 사용한다. 기존 lobby warming은 EVENT_IMAGES 전체를 읽어 새 그림도 준비한다.

## 생성 / 검증

Built-in imagegen으로 각각 독립 생성, transparent_background=true. 1312×1199 RGBA PNG. 실제 alpha=0 배경 샘플 및 피사체 alpha 확인. 첨부한 16종의 짙은 윤곽선, 풍화된 회색 석재, 낡은 목재, 금속, 붉은 천과 마법 조명을 따르는 디오라마 스타일. PNG 바이너리를 GitHub blob API로 직접 업로드.

### 야영지 프롬프트

Create ONE game event illustration for '버려진 야영지' (Abandoned Camp), matching the 16 uploaded Dungeon Bluff event illustrations: detailed hand-painted stylized dark fantasy isometric miniature stone diorama, strong crisp dark contour lines, faceted painterly shading, chipped charcoal-gray masonry, aged wood and rusty iron, warm gold edge light, tattered burgundy banner with abstract diamond sigil. A deserted small dungeon campsite on a broken stone platform: sagging patched canvas tent at rear, extinguished campfire with a few glowing amber embers at center, abandoned bedroll, torn bandages, overturned supply crate, small coin pouch and scattered useful supplies. Subtle sharp rusty trap hidden among supplies suggests danger. No people, no monster, no text, no digits, no UI. Rich clear composition with full diorama silhouette entirely in frame and comfortable transparent margins. Three-quarter isometric angle like the reference shared food warehouse and field clinic; tactile game illustration, not photorealistic or 3D render. TRANSPARENT alpha background outside the self-contained diorama, no black backdrop, no square scenic background, no ground plane beyond the cutout.

### 제단 프롬프트

Create ONE transparent PNG game event illustration for '풍화된 제단' (Weathered Shrine), matching the uploaded 16 Dungeon Bluff event illustrations and the Abandoned Camp illustration: richly detailed hand-painted stylized dark fantasy isometric stone diorama, bold crisp dark contour lines, faceted painterly brushwork, chipped gray charcoal masonry, antique gold trim and rusty iron, torn burgundy cloth diamond sigils, tactile surfaces, three-quarter elevated angle. Centerpiece is an ancient eroded sacrificial stone altar bowl with a modest bright golden-orange sacred flame waking above it. Behind it a broken rounded arch with heavily weathered faint amber geometric rune carvings, no intact doorway and no gate. Cracked circular stone dais and shallow steps, fallen column pieces, moss, cobwebs, scattered old scrolls and a small book suggesting learning. Faint runes converge toward the flame suggesting the party awakening the shrine. Strong readable isolated silhouette fully in frame with transparent margin on ALL sides; no people, no monsters, no lettering, no digits, no UI. Same visual family as uploaded healing spring, gambler altar and ancient gate, but clearly a humble ruined altar, not a door. Not photorealistic, not glossy 3D render. Fully transparent alpha outside self-contained diorama; no black or colored background, no surrounding scenic rectangle, no extra ground plane.

## 회귀 범위

5개 테스트: 기존 16종 asset 존재, PVE 전용 연결 및 과거 저장값 우선순위, PNG 서명/크기/alpha 채널/종결, unknown ID fallback, 실제 화면 호출 연결. 브라우저 실게임 표시 검증과 배포는 별도 단계.
