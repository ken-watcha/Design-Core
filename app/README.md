# Core 도우미 — 데스크톱 앱 (v0.1, 2026-10-02)

플러그인을 대신하는 팀 내부용 맥 앱. **앱 로그인은 없다.** Figma는 각자 노트북의 Claude Code(각자의 Claude 계정)를 거쳐 연결한다. Figma가 디자인 쓰기를 허가한 연결이 Claude Code라서 이 방식이다(우리 앱을 Figma에 직접 등록하는 것은 Figma가 거절, 2026-10-02 시험).

- **판단은 앱이 규칙으로 한다**: 규칙 `plugin/rules.json`, 색인 `core-index/core-index.json`을 실행할 때마다 GitHub main에서 받는다(못 받으면 앱에 든 사본). 규칙을 고쳐 푸시하면 다음 실행부터 반영된다.
- **Claude는 전달만 한다**: 앱이 만든 Figma 코드를 `use_figma`로 그대로 실행하고 결과를 돌려준다.
- v0.1 = **분석까지(읽기만)**: 링크 → 판별(기존 Core / 새 Core) · 크기별 대표 화면 · 수록 대조표. 새 Core 만들기·기존 Core 반영은 다음 버전.

## 설치 (디자이너, 처음 한 번)

1. **Claude Code 설치·로그인**: 터미널에서 `curl -fsSL https://claude.ai/install.sh | bash` → `claude` 실행 → 회사 Claude 계정으로 로그인. (Claude Code 데스크톱 앱만 쓰던 사람도 터미널 로그인이 한 번 필요할 수 있다)
2. **Figma 연결**: 터미널에서 이 `app` 폴더로 이동 → `claude --mcp-config mcp.json` → 채팅에 `/mcp` → `figma` → **Authenticate** → 브라우저에서 Figma 허용. 한 번 하면 끝.
3. **앱 실행**: (지금은 개발용) Node.js 설치 → 이 폴더에서 `npm install` → `npm start`. 배포용 `.app` 묶음은 다음 단계에서 만든다.

앱 상단에 `● 준비됨 · Figma <내 핸들>`이 보이면 된다.

## 구조

| 파일 | 역할 |
|---|---|
| `main.js` · `preload.js` | 창, 화면 ↔ 엔진 연결 |
| `renderer/` | 화면 (링크 입력 · 판별 · 크기별 대표 화면 · 수록 대조표) |
| `engine/figma-analyze.js` | Figma 안에서 돌 분석 코드 생성 (플러그인 `analyze()` 이식, 읽기 전용) |
| `engine/judge.js` | 판별 (플러그인 `judge()` 이식) |
| `engine/claude-runner.js` | 각자의 Claude Code를 `claude -p`로 불러 Figma 코드 실행 · 준비 상태 확인(whoami) |
| `engine/core.js` | 규칙·색인 받기, 분석 순서 |
| `mcp.json` | Figma 연결 주소 |
| `test/` | 엔진 시험 (`npm test`). 실제 스텝메이드 문서 분석 결과를 고정 자료로 씀 |

## 확인된 것 / 아직 아닌 것

- 분석 코드를 실제 스텝메이드 프로젝트 문서(`NO7uetAL9Qmk03IXWSaMej`)에 돌려 판별 "새 Core → [Core] 스텝메이드"(시연 1호와 같음), 크기 7자리 전부 후보 찾음, 미수록 섹션 1개("더보기 팝업") 표시 확인
- 화면은 그 결과로 그려 확인(`docs/img/app-v0.1-2026-10-02.png`)
- **아직 실제 맥에서 `claude -p` 경유로 돌려 보지 않았다** — Ken 노트북 첫 실행이 첫 확인
