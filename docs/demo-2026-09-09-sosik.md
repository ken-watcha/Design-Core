# 시연 (자가 검증) — 소식함 프로젝트 문서 → Core 판별 + Δ 제안

> 2026-09-09 · 쓰기 없음. Ken이 지정한 실제 프로젝트가 아직 없어서, **이미 손으로 이관이 끝난 케이스**(소식함 프로젝트 문서 → [Core] 소식함)를 도우미가 처음 보는 것처럼 판별해 보고, 결과가 실제 Core와 얼마나 맞는지 확인한 것. 실제 프로젝트 시연은 Ken이 링크를 주면 같은 형식으로 한다.

## 입력

- 프로젝트 문서: 소식함 (Notification) `FbqLL5VeQAgrDAsu9s26PW` · Spec 페이지 https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=1-10
- 문서 읽기(읽기 전용): 페이지 11개 중 Spec 페이지만 깊이 3까지. 큰 제목: "[Mobile] 소식함 페이지 Flow", "[Mobile] 공지사항 페이지 Flow", "[Web] 소식함 페이지 Flow", "[Web] 공지사항 페이지 Flow", "Use Case (Mobile/Web): State · Category · List Case", "Graphic Asset", "New 상세페이지 Size Class"

## 1. 판별 결과

| 항목 | 판단 | 근거 |
|---|---|---|
| 대상 Core | **[Core] 소식함** `MyrNGU07TEOXg6glOTG9jh` | 신호 1: 프로젝트 화면 "소식함 (알림이 없을 경우)" `144:76903` / "소식함 (알림이 있을 경우)" `465:76153`이 Core 마스터 APP의 `3:608` / `3:642`와 같은 이름·역할 |
| 판별 유형 | **B. 여러 Core에 걸침** | 본체는 소식함. 진입점 "홈" `2:8197`·"나의 왓챠" `97:160838`은 SVOD 플로우의 진입 프레임 "소식함" `60:628328`(APP) / `103:13300`(WEB)에 해당 → SVOD에는 입구 교체 항목만 |
| 다른 Core 영향 | SVOD 플로우 페이지 진입 프레임 2개 | https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=60-628328 , https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=103-13300 |
| 확신도 | 높음 | |

(만약 Core 소식함이 없었다면: 소식함은 홈·나의 왓챠·콘상페·컬렉션 등 여러 영역에서 들어오는 **가로지르는 기능**이라 유형 C "새 Core" 판정 → 실제로 Ken이 그렇게 만들었음. 판별 규칙과 실제 결정이 일치.)

## 2. Δ 목록 (도우미 제안) vs 실제 Core

| # | 구분 | Core 위치 | 프로젝트 출처 | 수록 근거 | 실제 Core와 비교 |
|---|---|---|---|---|---|
| 1 | 교체/유지 | APP > 알림이 없을 경우 > small [`3:608`](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=3-608) | [`144:76903`](https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=144-76903) | 빈 상태 (디폴트 2장 중 1) | ✅ 있음 |
| 2 | 교체/유지 | APP > 알림이 있을 경우 > small [`3:642`](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=3-642) | [`465:76153`](https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=465-76153) | 기본형 | ✅ 있음 |
| 3 | 추가 | APP > 비로그인 시 [`9:11778`](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-11778) | 프로젝트 Flow 안 비로그인 분기 | 로그인 여부가 화면을 바꿈(반쪽 분기) | ✅ 있음 (없을 때·있을 때 각 1장 = 2장. 도우미 기준으로는 **1장이면 충분** — 축소 후보) |
| 4 | 추가 | APP > 소식 유형 케이스 [`9:22413`](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-22413) | Use Case (Mobile) [`13:47618`](https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=13-47618) State·Category·List Case | 셀 유형이 6종 → 화면 대신 케이스 표 1장 | ✅ 있음 (같은 판단) |
| 5 | 보류 | — | Category 6 "커뮤니티" (*확정 필요*, 흐리게 표시) | 미확정 | ✅ Core에도 없음 |
| 6 | 크기별 | APP medium/large (768·1024) 각 2장 | 문서의 "New 상세페이지 Size Class" Small/Large [`186:74631`](https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=186-74631) | 태블릿에서 리스트 폭·모달 재배치 있음 → 크기별 유지 | ✅ 있음 |
| 7 | 유지 | WEB 6장 (없을/있을 × small/medium/large) | "[Web] 소식함 페이지 Flow" [`93:42207`](https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=93-42207) | 웹은 드롭다운 패널이라 폭에 따라 재배치 | ✅ 있음 |
| 8 | 미수록 | — | 공지사항/이벤트/새소식 **웹뷰** 화면 [`720:80799`](https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=720-80799) 등 | 소식함 자체 결정이 아니라 웹뷰 콘텐츠 → 플로우 페이지에만 | ✅ Core 마스터에 없고 플로우 페이지 진입 프레임(`19:10714` 등)에만 있음 (같은 판단) |
| 9 | 입구 교체 | SVOD 플로우 > APP > 소식함 [`60:628328`](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=60-628328) / WEB [`103:13300`](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=103-13300) | 프로젝트 "홈" [`2:8197`](https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=2-8197) | 다른 Core엔 입구만 | (실제 반영 여부 미확인 — Ken 확인 필요) |

## 3. 링크 카드

- 현재: 있음 [`42:15817`](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=42-15817) → 프로젝트 Spec 페이지(1-10)로 링크 1개 ✅
- 기준 정보(프로젝트명·배포일·담당자): **없음** → 이관 시 기입 항목으로 제안

## 4. 결론

- 판별(유형 B, 대상 소식함)과 Δ 9건 중 8건이 실제 Core와 일치. 차이는 1건: "비로그인 시" 2장 → 도우미 기준으로는 1장 (축소 제안).
- 지침서 §3·§4의 규칙이 이 케이스에서는 통했다. Ken이 지정하는 과거 사례 1건으로 한 번 더 검증하면 초안을 v0.2로 올린다.
