# Core 업데이트 — 데스크톱 앱 (v0.2, 2026-10-12)

플러그인을 대신하는 팀 내부용 맥 앱. **앱 로그인은 없다.** Figma는 각자 노트북의 Claude Code(각자의 Claude 계정)를 거쳐 연결한다. Figma가 디자인 쓰기를 허가한 연결이 Claude Code라서 이 방식이다(우리 앱을 Figma에 직접 등록하는 것은 Figma가 거절, 2026-10-02 시험).

- **판단은 앱이 규칙으로 한다**: 규칙 `plugin/rules.json`, 색인 `core-index/core-index.json`을 실행할 때마다 GitHub main에서 받는다(못 받으면 앱에 든 사본). 규칙을 고쳐 푸시하면 다음 실행부터 반영된다.
- **Claude는 전달만 한다**: 앱이 만든 Figma 코드를 `use_figma`로 그대로 실행하고 결과를 돌려준다.
- v0.1 = **분석까지(읽기만)**: 링크 → 판별(기존 Core / 새 Core) · 크기별 대표 화면 · 수록 대조표.
- v0.2 = **두 길 모두 실행** (Ken 2026-10-12: "판단도, 어디서 할지 제안도 앱이"):
  - 📍 작업 위치 제안 → 사람이 그 자리를 준비(1클릭)하고 링크를 주면 앱이 검사(원본·Core 본 파일·이미 Core인 복사본은 거절)
  - **새 Core**: 프로젝트 파일 Duplicate 복제본에 마스터 만들기(화면 복제 + 원본 대조) → 작업 페이지 깎기 → 만든 Core를 로컬 색인(`~/.core-helper/index-local.json`)에 추가해 다음 판별부터 "기존 Core"로 잡음
  - **기존 Core 갱신**: Core 파일 브랜치(이름 자유)의 마스터를 읽어 Δ 표(유지·교체·추가·미수록, 화면 내용 지문으로 비교) → 사람이 원본에서 교체·추가할 화면을 ⌘C/⌘V 1회 → [반영]: 교체는 껍데기(이름·위치·node-id) 유지하고 속만 바꿈, 추가는 🔵 바와 함께 배치, 링크 카드 기준 날짜 갱신. Merge는 사람
  - 색인 = GitHub main + 앱 사본에만 있는 Core + 로컬 추가분

## 설치 (디자이너, 처음 한 번)

**배포판 (2026-10-13~, 팀원 기본)**: 터미널에 `curl -fsSL https://raw.githubusercontent.com/ken-watcha/Design-Core/main/install.sh | bash` 한 줄. GitHub 릴리스 `mac-latest`의 앱(zip)을 받아 응용 프로그램 폴더에 넣고 연다. 앱 첫 화면이 Claude Code 설치(버튼)·로그인/Figma 연결(터미널 창을 열어 줌)·토큰 연결을 순서대로 안내한다. 배포판은 저장소 없이 켤 때마다 GitHub main의 최신 코드(app·plugin·core-index)를 `~/Library/Application Support/Core 업데이트/code/<커밋>/`에 받아 실행한다(못 받으면 지난 코드 → 앱에 든 사본). 앱 묶음은 `.github/workflows/mac-app.yml`이 `launcher/`·아이콘이 바뀔 때만 다시 만든다. 서명하지 않은 앱이라 브라우저로 zip을 받으면 맥이 막을 수 있어 한 줄 설치(curl)를 쓴다.

**개발판**: GitHub Desktop으로 `ken-watcha/Design-Core`를 Clone → 저장소 맨 위 `설치하기.command` 더블클릭. main으로 맞추기·Claude Code 설치 확인·로그인/Figma 연결 확인·`npm install`·앱 만들기·앱 열기를 차례로 하고, 사람은 안내가 나올 때 브라우저 로그인만 한다. 이미 된 단계는 건너뛰니 여러 번 실행해도 된다. 마지막으로 앱 오른쪽 위 **피그마 토큰 연결 필요**에서 Figma 토큰(File content: Read only)을 넣는다.

손으로 할 때:
1. **Claude Code 설치·로그인**: 터미널에서 `curl -fsSL https://claude.ai/install.sh | bash` → `claude` 실행 → 회사 Claude 계정으로 로그인. (Claude Code 데스크톱 앱만 쓰던 사람도 터미널 로그인이 한 번 필요할 수 있다)
2. **저장소는 main으로**: GitHub 기본 갈래가 main이 아니면 Clone 뒤 `git checkout main` (앱은 main일 때만 켤 때마다 최신으로 받는다)
3. **Figma 연결**: 터미널에서 이 `app` 폴더로 이동 → `claude --mcp-config mcp.json` → 채팅에 `/mcp` → `figma` → **Authenticate** → 브라우저에서 Figma 허용. 한 번 하면 끝.
4. **앱 만들기**: Node.js 설치 → 이 폴더에서 `npm install` → `bash scripts/build-mac-app.sh` → 바탕화면 `Core 업데이트.app`
5. **피그마 토큰 연결**: 앱 오른쪽 위에서 토큰 붙여 넣기 (맥 키체인으로 암호화해 그 노트북에만 저장)

앱 상단에 `● 준비됨 · Figma <내 핸들>`이 보이면 된다.

## 구조

| 파일 | 역할 |
|---|---|
| `main.js` · `preload.js` | 창, 화면 ↔ 엔진 연결 |
| `renderer/` | 화면 (링크 입력 · 판별 · 크기별 대표 화면 · 수록 대조표) |
| `engine/figma-analyze.js` | Figma 안에서 돌 분석 코드 생성 (플러그인 `analyze()` 이식, 읽기 전용) |
| `engine/judge.js` | 판별 (플러그인 `judge()` 이식) |
| `engine/claude-runner.js` | 각자의 Claude Code를 `claude -p`로 불러 Figma 코드 실행 · 준비 상태 확인(whoami) |
| `engine/core.js` | 규칙·색인 받기, 분석 → 작업 위치 확인 → 새 Core 만들기 / 기존 Core 반영 순서 |
| `engine/place.js` | 📍 작업 위치 제안·링크 검사 |
| `engine/figma-core-read.js` | Core 마스터 읽기(설명 바·크기 칸·화면 지문, 읽기 전용) |
| `engine/signature.js` | 화면 내용 지문(크기·노드 수·글자·이미지) — 프로젝트 화면 ↔ Core 화면 비교 |
| `engine/delta.js` | Δ 표(유지·교체·추가·미수록), Core에 이미 있는 화면과 같은 후보 우선 |
| `engine/figma-write.js` | 쓰기 코드: 새 Core 만들기·깎기(플러그인 `buildNewCore()` 이식), 기존 Core 반영 |
| `engine/index-store.js` | 색인 합치기·로컬 추가분 |
| `mcp.json` | Figma 연결 주소 |
| `test/` | 엔진 시험 (`npm test`). 실제 스텝메이드 문서 분석 결과를 고정 자료로 씀 |

## 확인된 것 / 아직 아닌 것

- (v0.2, 2026-10-12) Ken 맥에서 실제 확인: 색인에 [Core] 스텝메이드를 올리자 스텝메이드 프로젝트 → "기존 Core 갱신 → [Core] 스텝메이드". Δ = 유지 6 · 교체 1(WEB 768: Core에 든 768×753 화면이 지금 문서에 없음) · 미수록 1(더보기 팝업). 새 Core 길은 시험 복제본 `oW6dtgS3ye54JSlAAH1ke2`에 실제로 만들어 9/18 [Core] 스텝메이드와 위치·섹션 크기·화면 6/7 동일(나머지 1 = 같은 WEB 768) 확인(`docs/img/app-v0.2-new-core-test-2026-10-12.png`). 사용량 약 $1.3
- (v0.2) 기존 Core 반영(브랜치 쓰기)은 아직 실물 미확인 — [Core] 스텝메이드 브랜치(oQwfxim46wbwy2zvx65OLB)로 첫 확인 예정
- 쓰기 전 버전 저장: 이 연결(use_figma)은 자동 버전 저장을 거부해서(2026-09-18) [새 Core 만들기]·[반영] 버튼은 "버전을 저장했어요"에 체크해야 켜진다
- 파일 이름 검사는 못 한다: use_figma에서 `figma.root.name`이 늘 "Document"로 온다(2026-10-12 확인). 대신 링크 모양(복제본/브랜치·원본 키)과 페이지 구성으로 자리를 확인
- 판별: 색인 항목의 `source_projects`(그 Core를 만든 프로젝트 문서 키)에 분석한 문서가 있으면 그 Core로. 앱이 만든 새 Core도 이 값을 함께 로컬 색인에 남긴다

- 분석 코드를 실제 스텝메이드 프로젝트 문서(`NO7uetAL9Qmk03IXWSaMej`)에 돌려 판별 "새 Core → [Core] 스텝메이드"(시연 1호와 같음), 크기 7자리 전부 후보 찾음, 미수록 섹션 1개("더보기 팝업") 표시 확인
- 화면은 그 결과로 그려 확인(`docs/img/app-v0.1-2026-10-02.png`)
- **아직 실제 맥에서 `claude -p` 경유로 돌려 보지 않았다** — Ken 노트북 첫 실행이 첫 확인

## 맥 정식 앱 만들기 (아이콘·이름)

`bash scripts/build-mac-app.sh` → 바탕화면에 `Core 업데이트.app`이 생긴다 (Dock에 Electron 대신 Core 업데이트 아이콘·이름).

- 앱 안에는 실행용 껍데기(`launcher/`)만 들어간다. 켤 때마다 저장소를 main으로 앞으로 감은 뒤(main 브랜치이고 고친 파일이 없을 때만) 이 폴더의 `main.js`를 실행한다 → 코드가 바뀌어도 다시 만들 필요 없음.
- 다시 만들어야 할 때: 저장소 폴더를 옮겼을 때, `launcher/`나 `build/icon.png`를 바꿨을 때.
- 서명하지 않은 앱이라 처음 한 번은 Finder에서 우클릭 → 열기가 필요할 수 있다.
