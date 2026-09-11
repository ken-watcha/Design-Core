# 새 Core 마스터 페이지 만들기 (유형 C · 설계안 §4 방법 2) — use_figma 4~5회

2026-09-11 스텝메이드 브랜치(`XIolz3S5ClSf5VEaBkwDi6` → 페이지 `3420:6`)에서 검증된 순서. 쓰기는 Ken 승인 후 브랜치/사본에서만. 규격·수치는 지침서 §6-2. 묶음마다 `get_screenshot`을 남기고 컨펌을 받는다.

| 묶음 | use_figma 1회 | 핵심 |
|---|---|---|
| **A 뼈대** | `figma.createPage()` → `figma.root.insertChild(2, page)`(Cover·--- 다음) → `setCurrentPageAsync` → `createSection`으로 루트(fill 20,21,23) + 진입/APP/WEB(fill 34,35,38, `cornerRadius 60`, `resizeWithoutConstraints`) → 설명 바 = `importComponentByKeyAsync(키)`→`createInstance`→`setProperties({'배경 색상':…,'🔠 타이틀#2018:9':true,'ㄴ 📝 설명#2018:8':설명 여부})`→안의 `제목` 텍스트 교체(`getStyledTextSegments(['fontName'])`로 폰트 로드)→`layoutSizingHorizontal='FIXED'`→`resize(w,h)` → 링크 카드(세로 오토레이아웃 프레임 + 텍스트 3줄 + 상태 뱃지 인스턴스, 뱃지 텍스트 "링크"→"관련 스펙 링크" + `hyperlink`) | 바의 폭은 **내용을 다 넣은 뒤 실제 자식 폭을 재서** 맞춘다(미리 계산하면 케이스 표처럼 폭이 커지는 프레임이 옆 묶음과 겹친다 — 2026-09-11 Ken 지적으로 재배치). 섹션 높이도 자식 최대 바닥 + 60 |
| **B APP** | 원본 페이지 `loadAsync()` → `src.clone()` → `section.appendChild(clone)`(페이지 간 이동 됨) → `x,y` 지정(섹션 기준 좌표) → 이름을 화면 이름으로. 케이스 표는 프레임(세로 오토레이아웃, 패딩 24·간격 24·radius 24·fill 44,45,48)에 라벨 텍스트 + 도판 복제를 행으로 | 크기 접미사 없이, 🔵 바로 구분 |
| **C WEB** | B와 같음. "이상 동일" 구간은 large 바의 📝 설명 텍스트로 | |
| **D 진입** | 다른 Core의 롱 프레임: `download_assets(파일, 노드, png, scale 2)` → curl → `upload_assets(브랜치, count, nodeIds=[빈 프레임…])` → `curl -F file=@… ` → 응답의 `imageHash`가 프레임 fills에 자동 배치됐는지 확인, 안 됐으면 `fills=[{type:'IMAGE', imageHash, scaleMode:'FILL'}]` 직접 지정. 마커 = §3-1 추적으로 읽은 로우 y에 `영역 설명 컴포넌트`(import 안 되면 단순 프레임 ◀ + 텍스트). 첫 화면 1장 복제 | 진입 위치 미확정인 Core는 넣지 않음 |
| 마무리 | 섹션·루트 크기 재조정 → 전체 스크린샷 → 시연 문서 §8 형식으로 기록 | Cover·플로우·다른 Core 입구는 본 파일 쓰기라 승인 뒤 |

주의 (이번에 겪은 것):
- `importComponentByKeyAsync`는 그 파일에 라이브러리가 연결돼 있어야 한다. 스크린 설명 컴포넌트·상태 뱃지는 됐고, 왓챠파티의 `영역 설명 컴포넌트`(키 `73a99eb…`/세트 `4654fb2…`)는 "not found" → 대체 프레임.
- `upload_assets`의 자동 배치는 1회는 안 됐고(2026-09-10) 1회는 됐다(09-11, 응답에 `placedOnNodeId`). 해시로 fills를 지정하는 마지막 단계는 항상 둔다(안전장치).
- Figma 연결이 세션 중 끊기면 도구 접두어가 바뀐다(`mcp__Figma__use_figma`). ToolSearch로 다시 찾고, 만들던 노드 ID로 이어서 한다(브랜치에 이미 반영된 것은 남아 있다).
- 마커 프레임이 138보다 넓으면 옆 프레임·바·섹션·루트 폭을 같이 밀어야 한다(이번엔 417 → 279 이동).
