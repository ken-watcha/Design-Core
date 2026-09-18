# Core 도우미 실행 규약 (Routine이 매번 따르는 순서) — v1 · 2026-09-11

> "프로그램 A에 피그마 링크를 올리면 Core 파일 업데이트 + 관리 정보 업데이트, 로그가 남는다"(Ken, 2026-09-11)의 실제 형태.
> **프로그램 A = 요청함 페이지** https://claude.ai/code/artifact/6aabb40e-e80b-45f3-a76f-05f2cdee038a (파비콘 📮). 링크를 올리는 곳이자 상태·로그가 남는 곳. 자체 저장소(아티팩트 DB)에 `requests/`(요청)와 `logs/`(로그)를 둔다.
> Notion 표 **Core 반영 요청**(https://app.notion.com/p/e5f0952582d1467d9c998653d359fbaf, 데이터소스 `collection://c0f1c97d-e47a-4520-8656-6b2147b8f3ed`)은 A의 **사본**(팀 위키에서 보기 위한 것). 도우미가 A를 처리할 때 같은 내용을 표에도 쓴다.
> 실행 주체 = Routine "Core 도우미"가 매시간 여는 새 Claude 세션(환경 Design-Core, 저장소 main). 판단·실행 규칙은 `.claude/skills/core-file-helper/SKILL.md`(v0.2), 실행 절차는 `scripts/figma-write/*.md`.

## 0. 요청함 A의 저장소 (도우미가 읽고 쓰는 곳)

- `requests/<id>`: project · figmaUrl · fileKey · nodeId · owner · coverStatus(Working/Final) · **status** · verdict(판별) · targetCore · proposalUrl · resultUrl · notionUrl · createdAt · updatedAt (승인 토글·배포일 칸은 없음 — 버튼이 곧 실행)
- `logs/<id>`: requestId · at · actor(`사람`/`도우미`) · step(접수/판별/제안서/승인/배포/반영/완료/오류) · message · url — **한 일마다 한 줄 추가**(지우지 않는다)
- status 값(2026-09-11 Ken 결정: **제안서·승인 단계 없이 바로 진행**): `실행 대기`(버튼 클릭) → `반영 중` → `완료`, 판단이 안 서면 `확인 필요`, 실패는 `오류`. 되돌리기 = 브랜치이므로 안전.
- 프로젝트 이름·담당·커버 상태(Working/Final)는 페이지가 링크를 받자마자 Figma Cover 페이지에서 읽어 채운다(뷰어의 Figma 연결 사용). 못 읽으면 도우미가 처리할 때 채운다.
- 도우미는 세션의 Artifact 도구 `read_db`(collection `requests`, query where status != 완료)로 읽고 `write_db`(update + logs add)로 쓴다. 페이지가 열려 있으면 즉시 반영된다.

## 1. (사본) Notion 표의 칸

| 칸 | 누가 | 뜻 |
|---|---|---|
| 프로젝트 · Figma 링크 · 담당 | 디자이너 | 링크 하나면 된다 |
| 배포일 | 디자이너 | 비어 있으면 제안서까지만 (운영안: 배포 전 시안은 마스터에 못 들어옴) |
| 실행 승인 ☑ | (사본에서만) | A에서는 승인 단계가 없다 — 버튼 클릭이 곧 실행 |
| 상태 | 도우미 | `시작 전` → `진행 중`(제안서 냄) → `완료`(반영 끝) |
| 판별 · 대상 Core · 제안서 · 결과 | 도우미 | 결과 칸의 첫 줄이 세부 상태 (아래 §2) |

## 2. 한 번 실행할 때 하는 일 (행마다)

```
A의 requests 읽기 (status = 실행 대기 또는 확인 필요 중 재시도 표시된 것)
 → status = 반영 중 + log
 → SKILL.md §1~§4: 문서 읽기 → Core 판별 → Δ + 수록 대조표 (제안서 아티팩트는 만들지 않고, 판별·Δ 요약을 logs에 남긴다)
 → 유형 C: 행의 **Core 파일 링크**(사람이 프로젝트 파일을 Duplicate해 `[Core] ○○`로 만든 복제본)에서 new-core-master.md 순서로 마스터 생성 → 작업 페이지·로컬 컴포넌트 페이지 삭제 (B' 원본 대조 필수, 플로우 페이지는 만들지 않음). 링크가 없거나 원본 키와 같으면 status = 확인 필요 + log "프로젝트 파일을 복제해 [Core] ○○로 만들고 링크를 적어 주세요"
 → 유형 A/B: **아직 실행 검증 전** → status = 확인 필요 + log "A/B는 3단계 검증 후. 판별·Δ: …" (쓰기 없음)
 → A: verdict / targetCore / resultUrl / status = 완료 / log "복제본에 Core 완성 · 남은 사람 손: 다른 Core 입구 Δ, 진입 홈 사본 붙여넣기(선택), 원본 커버 Final/아카이브" · Notion 사본 갱신
```

- **쓰기 범위**: 유형 C는 **복제본 `[Core] ○○` 파일**에만(원본 프로젝트 문서·Core 본 파일·다른 Core 파일에는 쓰지 않는다). 복제본은 사람이 만든다(파일 복제는 API 불가). 유형 A/B(검증 후)는 그 Core 파일의 브랜치 "Core 도우미"에만.
- **파일 경계를 코드로 넘지 않는다**(SKILL §0-8): 다른 파일의 화면은 붙여넣기 요청 또는 하이퍼링크. 깊은 복제(다시 그리기)는 쓰지 않는다.
- **두 원칙**(SKILL §0-6·§0-7): 복붙 + 원본 대조, 수록 대조표로 빠짐 없음 확인.
- **실행 전 Named version**(복제본/브랜치)을 저장한다 — 되돌리기 1클릭.
- 한 요청에서 오류가 나면 status = 오류 + log "오류: <한 줄>"만 남기고 다음 요청. 처리할 요청이 없으면 아무것도 쓰지 않고 끝낸다(토큰 절약: 문서 읽기는 SKILL.md와 이 파일만).

## 3. 사람 손이 남는 곳 (API 없음)

유형 C: 프로젝트 파일 Duplicate → 이름 `[Core] ○○` → Core 폴더 이동 → 링크를 행에 적기(실행 전) · 진입 섹션의 다른 Core 홈 사본 붙여넣기(선택) · 다른 Core 입구 Δ(실행 후). 유형 A/B: 브랜치 생성·머지. 도우미가 결과 칸에 "여기 눌러 주세요" 링크로 알려 준다.

## 4. Routine 만들기 (Ken이 한 번, claude.ai/code → Routines)

세션 안에서 만든 Routine(`trig_01GZzAUPSzD9z9wNi49BT26L`)은 **연결(Figma·Notion)을 담을 수 없어**(이 조직 설정) 꺼 두었다. 연결이 붙은 Routine은 Routines 화면에서 직접 만들어야 한다:

1. claude.ai/code → Routines → 새 Routine
2. 환경 **Design-Core** · 저장소 **ken-watcha/Design-Core** · 브랜치 main
3. 일정: 매시간 (익숙해지면 하루 2회로 줄여도 됨)
4. 연결(Connectors): **Figma**, **Notion** 둘 다 켬
5. 프롬프트: `docs/routine-prompt-core-helper.txt` 내용을 그대로 붙여넣기
6. 알림: 푸시 켬 (실행한 행이 있을 때만 옴)

지금 즉시 돌리려면 그 Routine의 "지금 실행". 끄거나 주기를 바꾸는 것도 같은 화면.

## 5. 아직 안 된 것 (다음 단계)

- 설계안 3단계: **기존 Core 갱신(유형 A/B) 실행** — 로그인/온보딩 파일럿을 도우미가 재현해 손 결과와 같음을 확인한 뒤 §2의 A/B 분기를 연다.
- 실행 결과를 프로젝트 파일 🔁 Core 반영사항 페이지에도 남기기, 색인 자동 갱신.
