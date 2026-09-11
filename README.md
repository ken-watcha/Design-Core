# Design-Core — 코어파일 자동 생성 도우미

왓챠 프로덕트 디자인의 **Core 파일(최종 시안)** 운영을 돕는 Claude 도우미의 작업 저장소.
프로젝트 피그마 문서 링크를 주면 → 어느 Core의 어느 부분을 갱신할지 판별하고 Δ(변경분) 목록을 제안 → Ken 승인 → 실행 → 워크로그 갱신.

**원칙: 판단과 실행은 분리. Figma 원본에는 Ken 승인 없이 아무것도 쓰지 않는다.**

## 구조

| 위치 | 무엇 | 비고 |
|---|---|---|
| `.claude/skills/core-file-helper/SKILL.md` | **작업 지침서** (판별·Δ 작성 기준·새 Core 규격) | 초안 v0.1 + §6 보강(2026-09-09). Claude 세션에서 스킬로 자동 로드 |
| `.claude/rules/network.md` | 네트워크·토큰 규칙 (막힌 도메인은 우회하지 않고 Ken에게 요청) | |
| `core-index/core-index.json` | **Core 색인** — 폴더 안 15개 파일의 페이지·섹션·설명 바 묶음·화면(node-id) | 기계용 원본 |
| `docs/core-index.md` | Core 색인 읽기용 | `scripts/build-core-index-md.py`로 JSON에서 생성 |
| `docs/core-file-worklog.md` | 워크로그 사본 | 중계 지점은 아티팩트, 저장소는 이력 보관 |
| 요청함 A https://claude.ai/code/artifact/6aabb40e-e80b-45f3-a76f-05f2cdee038a | **프로그램 A** — Figma 링크를 올리는 곳이자 상태·로그가 남는 곳(아티팩트 DB `requests`/`logs`). Notion 표는 사본 | 2026-09-11 |
| `docs/runbook-core-helper.md` | **실행 규약** — Notion 표 "Core 반영 요청"의 행을 Routine(매시간 새 세션)이 어떻게 처리하는지, 상태 흐름·쓰기 범위·사람 손이 남는 곳 | 2026-09-11 프로그램화 1단계 |
| `docs/demo-*.md` | 시연 기록 (판별 → Δ 제안) | |
| `docs/img/` | 실물 스크린샷 (왓챠파티 마스터, 링크 카드) | |
| `templates/delta-proposal.md` | Δ 제안서 템플릿 | |
| `scripts/figma-rest/` | **Figma REST 읽기 스크립트** — `core-files.json`(Core 키 목록) · `dump-core-file.py`(페이지 통째 받기) · `build-index-entries.py`(색인 항목 생성) · `trace-entry-markers.py`(플로우 번호 마커 → 진입 프레임 → 홈의 로우/셀 추적: 빈 자리표시 프레임의 정체·진입 위치 판정) · `list-project-files.py`(폴더 조회, 토큰에 `projects:read` 필요) | Design-Core 환경에서 동작 (토큰은 프록시가 붙임) |
| `scripts/figma/` | Figma MCP 읽기 전용 스크립트 (`use_figma`에 붙여넣기) | 페이지 목록·골격·설명 바·링크 카드 |
| `scripts/outline.py` | `get_metadata` 큰 결과 요약 | |

## 환경 조건 (클라우드 환경 "Design-Core")

- 네트워크 **Custom** 허용 목록: `api.figma.com`, `www.figma.com`, `mcp.figma.com` + 기본 패키지 저장소
- Figma 토큰: 환경의 API 자격 증명(호스트 `api.figma.com`, 헤더 `X-Figma-Token`)으로 주입. 채팅에 붙이지 않는다
- 폴더 안 파일 목록 조회는 토큰 범위 `projects:read`가 있어야 하는데 **Ken에게 줄 권한이 없어 불가(2026-09-10 확정)** → 파일 키는 `scripts/figma-rest/core-files.json`에 고정
- 파일 간 이미지 이관(`download_assets` → `upload_assets` → 해시를 채우기에 지정)은 `mcp.figma.com` 허용 후 동작 확인(2026-09-10 세션 5). 절차는 `scripts/figma-write/deep-clone.md` 3단계

## 흐름 (1차: Claude 도우미)

1. 프로젝트 문서 링크 + 기준 정보(프로젝트명·배포일·담당자) 입력
2. 도우미가 문서를 읽기 전용으로 읽고, 색인과 대조해 **Core 판별 + Δ 목록** 제안 (`templates/delta-proposal.md` 형식)
3. Ken 승인
4. 실행: 이관 체크리스트 5단계 (버전 저장 → 교체 → 링크 카드 → 커버 로그 → 아카이브) 또는 새 Core 내용 채우기 (지침서 §6). 배치마다 컨펌
5. 워크로그 갱신 + 아티팩트 재발행

## 색인 갱신 방법

REST (권장, 대량 읽기):
1. 새 Core 파일이면 `scripts/figma-rest/core-files.json`에 라벨·키·이름·페이지를 추가 (`GET /v1/files/<키>?depth=1`로 페이지 확인)
2. `python3 scripts/figma-rest/dump-core-file.py <라벨>` → `.cache/core-dump/`에 원본 저장
3. `build-index-entries.py`의 `DOMAIN`에 다루는 영역·메모를 쓰고 `python3 scripts/figma-rest/build-index-entries.py <라벨>` → `.cache/core-dump/new-entries.json`
4. 그 항목을 `core-index/core-index.json`의 `files`에 넣고 `python3 scripts/build-core-index-md.py`

MCP (`use_figma`, 파일 몇 개만 볼 때): `scripts/figma/list-pages.js` → `walk-page.js` → `label-texts.js` 순으로 읽어 JSON에 손으로 추가.
