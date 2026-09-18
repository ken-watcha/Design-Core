# Design-Core — 코어파일 자동 생성 도우미

왓챠 프로덕트 디자인의 **Core 파일(최종 시안)** 운영을 돕는 Claude 도우미의 작업 저장소.
프로젝트 피그마 문서 링크를 주면 → 어느 Core의 어느 부분을 갱신할지 판별하고 Δ(변경분) 목록을 제안 → Ken 승인 → 실행 → 워크로그 갱신.

**원칙: 판단과 실행은 분리. Figma 원본에는 Ken 승인 없이 아무것도 쓰지 않는다.**

## 구조

| 위치 | 무엇 | 비고 |
|---|---|---|
| `.claude/skills/core-file-helper/SKILL.md` | **작업 지침서** (판별·Δ 작성 기준) | 초안 v0.1. Claude 세션에서 스킬로 자동 로드 |
| `core-index/core-index.json` | **Core 색인** (파일별 페이지·섹션·수록 화면, node-id) | 기계용 원본 |
| `docs/core-index.md` | Core 색인 읽기용 | `scripts/build-core-index-md.py`로 JSON에서 생성 |
| `docs/core-file-worklog.md` | 워크로그 사본 | 중계 지점은 아티팩트, 저장소는 이력 보관 |
| `docs/demo-*.md` | 시연 기록 (판별 → Δ 제안) | |
| `templates/delta-proposal.md` | Δ 제안서 템플릿 | |
| `scripts/figma/` | Figma 읽기 전용 스크립트 (`use_figma`에 붙여넣기) | 페이지 목록·페이지 골격·설명 바·링크 카드 |
| `scripts/figma-rest/` | Figma REST 폴더 조회 스크립트 | `--check`로 토큰·네트워크 점검. 2026-09-18: 네트워크 OK, 토큰 만료 → 재발급 필요 |
| `scripts/outline.py` | `get_metadata` 큰 결과 요약 | |

## 흐름 (1차: Claude 도우미)

1. 프로젝트 문서 링크 + 기준 정보(프로젝트명·배포일·담당자) 입력
2. 도우미가 문서를 읽기 전용으로 읽고, 색인과 대조해 **Core 판별 + Δ 목록** 제안 (`templates/delta-proposal.md` 형식)
3. Ken 승인
4. 실행: 이관 체크리스트 5단계 (버전 저장 → 교체 → 링크 카드 → 커버 로그 → 아카이브) 또는 새 Core 내용 채우기. 배치마다 컨펌
5. 워크로그 갱신 + 아티팩트 재발행

## 색인 갱신 방법

1. 새 Core 파일 링크를 받으면 `scripts/figma/list-pages.js` → `walk-page.js` → `label-texts.js` 순으로 읽는다
2. `core-index/core-index.json`에 추가
3. `python3 scripts/build-core-index-md.py`
