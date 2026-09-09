# Core 파일 색인 (읽기용)

> 갱신 2026-09-09 · 기계용 원본은 `core-index/core-index.json` (이 문서는 그 파일에서 생성).
> 수록 범위: Core 폴더(591036590)의 파일 15개 전부 수록 — 2026-09-09 Ken이 링크 14개를 확인해 줌(SVOD·소식함·로그인/온보딩·나의 왓챠·웹툰·TV·콘상페·플레이어·왓챠파티·보관함·TVOD·검색·프로필·결제/구독) + 스텝메이드(Ken 목록에 없음, 폴더 소속 확인 필요). 세션 2에 읽은 4개는 sections 구조, 세션 3에 읽은 11개는 master.roots 구조(루트 섹션이 여러 개인 결제/구독 때문).

폴더: https://www.figma.com/files/1014901253946075002/folder/591036590

## 파일 형식

- **새 형식**: 🌏 마스터 파일 페이지(대표 화면만) + 🌊 플로우 페이지(기준 문서 역할, 전수). 마스터 페이지 = 루트 섹션 → [📎 스펙 링크 카드] + APP 섹션 + WEB 섹션. 설명 바 색: ⚫️ 어두운 회색=대분류, ⚪️ 밝은 회색=케이스 묶음, 🔵 파랑=크기·단계. 변형: (a) 루트 섹션 여러 개(결제/구독: 🌏 결제 + 🌏 구독) (b) 루트 섹션 없이 APP/WEB이 페이지 직속(웹툰) (c) 진입 섹션 '○○ 진입'(왓챠파티·콘상페·플레이어 — 다른 Core의 긴 화면 위에 '○○ 진입점' 마커로 진입 위치 표시)
- **구 형식**: 스텝메이드: 크기별 섹션 안에 Guide/예시/뷰포트 폭 프레임. 마스터 페이지 없음, 새 수록 기준 미적용. TV: 섹션·설명 바 없이 1920 프레임만, 플로우 페이지 비어 있음

- **Cover 페이지**: 모든 새 형식 파일 공통: Cover 페이지에 'Cover' 프레임 800x500 — 'Page Name(EN)'(파일 제목) + 'Page Name(KR)'(부제, 예: 왓챠파티 → '왓챠파티, 파티 플레이어') + CoverBadge(⚜️ Core / Final). 운영안의 '업데이트 로그(날짜/프로젝트/영역/담당자)'는 아직 어느 Cover에도 없음

### 링크 카드 형태

- **A_상태뱃지형**: 소식함·플레이어(2)·나의 왓챠·프로필·결제/구독(3): 프레임(세로 오토레이아웃, 패딩 24, 간격 16, radius 12, fill 63,63,63) 안에 제목 텍스트 + '○○ 관련 자세한 스펙은 아래 링크를 참고해주세요!' + 'ㄴ 상태 뱃지' 인스턴스(🔗 관련 스펙 링크 텍스트에 하이퍼링크). 기준 정보(프로젝트명·배포일·담당자) 자리 없음
- **B_스펙링크카드형**: 로그인/온보딩(91:7): '📎 스펙 링크 카드' 프레임, 제목 텍스트에 하이퍼링크 + 기준 정보 자리(미기입)
- **없음**: SVOD·왓챠파티·콘상페·TVOD·검색·보관함·웹툰·TV — 이관 시 추가 대상

## [Core] SVOD (홈)

- 파일: https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/ (키 `T6txdtsZ5utexHAR2DyPRw`, 형식: new)
- 다루는 영역: 홈(SVOD 탭) / 피쳐링셀 / 홈에서 진입하는 페이지들의 입구

### 페이지

- [Cover](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=1-3) `1:3` — master
- [🌊 플로우_26.06 기준](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=48-53640) `48:53640` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 SVOD](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=256-94581) `256:94581`

- 📎 링크 카드: **없음** (새 형식이지만 카드 미배치 → 이관 시 추가 대상)

#### APP 섹션 `43:363227`

- **로그인/구독 케이스** (설명 바 `34:353578`)
  - 로그인/구독 (설명 바 `22:243641`)
    - [로그인/구독_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=22-243644) `22:243644` 375x4816
    - [로그인/구독_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=22-270841) `22:270841` 768x4816
    - [로그인/구독_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=22-243763) `22:243763` 1024x4816
  - 비로그인/비구독 (설명 바 `34:353587`)
    - [비로그인/비구독_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=34-353592) `34:353592` 375x4816
    - [비로그인/비구독_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=34-353712) `34:353712` 768x4816
    - [비로그인/비구독_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=34-353834) `34:353834` 1024x4816
- **피쳐링셀** (설명 바 `43:365294`)
  - 컨텐츠 · 이미지 (도미넌트 컬러 사용) (설명 바 `43:363228`)
    - [이미지 컨텐츠_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=43-359613) `43:359613` 375x812
    - [이미지 컨텐츠_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=45-365997) `45:365997` 375x812 — 더미 데이터 중복 — 수록 기준 적용 시 1장으로 축소 후보
    - [이미지 컨텐츠_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=43-359733) `43:359733` 768x721
    - [이미지 컨텐츠_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=45-369922) `45:369922` 768x721
    - [이미지 컨텐츠_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=43-363351) `43:363351` 1024x755
    - [이미지 컨텐츠_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=45-372780) `45:372780` 1024x755
  - 컨텐츠 · 영상 (블랙 컬러 사용) (설명 바 `43:365299`)
    - [영상 컨텐츠_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-375612) `46:375612` 375x812
    - [영상 컨텐츠_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-375732) `46:375732` 375x812 — 더미 데이터 중복 — 축소 후보
    - [영상 컨텐츠_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-379824) `46:379824` 768x721
    - [영상 컨텐츠_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-379964) `46:379964` 768x721
    - [영상 컨텐츠_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-386492) `46:386492` 1024x755
    - [영상 컨텐츠_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-386621) `46:386621` 1024x755
  - 컬렉션 (설명 바 `46:390715`)
    - [컬렉션_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-392645) `46:392645` 375x812
    - [컬렉션_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-394460) `46:394460` 768x721
    - [컬렉션_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-396313) `46:396313` 1024x755
  - 이벤트 (설명 바 `46:398277`)
    - [이벤트_small](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-398280) `46:398280` 375x812
    - [이벤트_medium](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-398400) `46:398400` 768x721
    - [이벤트_large](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=46-398541) `46:398541` 1024x755
  - 연령등급 케이스 (설명 바 `47:408030`)
    - [연령등급 케이스](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=47-404368) `47:404368` 375x812
    - [연령등급 케이스 (부분 확대)](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=47-406186) `47:406186` 497x272
  - 별점 케이스 (라벨 원문 '별접 케이스') (설명 바 `47:408035`)
    - [예상 별점 노출 케이스](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=22-274961) `22:274961` 375x812
    - [평균 별점 노출 케이스](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=22-275318) `22:275318` 375x812
    - [예상 or 평균 별점 미노출 케이스](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=22-275437) `22:275437` 375x812
  - 서브타이틀 케이스 (설명 바 `47:408081`)
    - [서브타이틀 있을 경우](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=47-408088) `47:408088` 375x812
    - [서브타이틀 없을 경우](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=47-408207) `47:408207` 375x812
- **(참조) 홈 전체 롱 프레임**
  - [🌏 SVOD_APP](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=172-87073) `172:87073` 375x4816 — 플로우 페이지의 SVOD_APP(156:77014)과 짝

#### WEB 섹션 `172:88876`

- **로그인/구독 케이스** (설명 바 `52:166471`)
  - 로그인/구독 (설명 바 `52:162442`)
    - [로그인/구독_1280 미만](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=52-162667) `52:162667` 375x4527
    - [로그인/구독_1280 이상](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=52-162445) `52:162445` 1560x6486
  - 비로그인/비구독 (설명 바 `52:166627`)
    - [비로그인/비구독_600 미만 (360~599)](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=52-166856) `52:166856` 375x4236
    - [비로그인/비구독_1280 미만 (600~1279)](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=52-175704) `52:175704` 768x5182
    - [비로그인/비구독_1280 이상](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=52-170402) `52:170402` 1560x4981
- **피쳐링셀** (설명 바 `55:192043`)
  - [피쳐링셀_768 미만](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=55-231345) `55:231345` 375x812
  - [피쳐링셀_768 이상](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=56-234969) `56:234969` 768x721
  - [피쳐링셀 케이스](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=56-236684) `56:236684` 624x192
- **(참조) 홈 전체 롱 프레임**
  - [🌏 SVOD_WEB](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=216-89047) `216:89047` 375x4527

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/T6txdtsZ5utexHAR2DyPRw/?node-id=172-90594) `172:90594`

- 메모: 홈에서 각 번호를 눌러 진입 페이지로 가는 구조. 진입 페이지 프레임은 다른 Core(소식함·왓챠파티 등)의 영역과 겹치는 '입구'만 담음
- APP `106:192402` (자식 166개)
  - 진입 프레임: SVOD_APP 156:77014, 크롬캐스트 225:93449, 왓고리즘_토스트 156:79060, 이벤트 156:82667, 무료 캐시 60:627854, Player 57:242202, 컬렉션 60:619535, 나의 왓챠 401:32500, 태그 페이지 60:622111, 기타 상세 페이지 60:629061, 리스트 상세 페이지 232:95404, 아티스트 60:632451, 소식함 60:628328, 왓챠파티 페이지 67:74492, 왓챠파티 바텀시트 68:77009, 장르 바텀시트 57:239853, 콘상페 156:83131, 왓챠파티 플레이어 161:17998, TVOD 161:29019, 웹툰 161:31116, 검색 161:33311, 보관함 401:33312
- WEB `106:192403` (자식 132개)
  - 진입 프레임: SVOD_WEB 102:390553, 플레이어 103:16560, 왓챠파티 플레이어 165:25787, 장르 103:10862, 소식함 103:13300, 이벤트 104:16968, 컬렉션 116:192428, 검색 162:108299, 프로필 162:109262, 아티스트 116:192474, 왓챠파티 104:190925, 태그 페이지 104:21533, 기타 상세 페이지 104:189223, 콘상페 104:19964, 비로그인 193:93004, 보관함 399:95484

## [Core] 소식함

- 파일: https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/ (키 `MyrNGU07TEOXg6glOTG9jh`, 형식: new)
- 다루는 영역: 소식함(알림 목록) / 공지사항·이벤트·새소식 웹뷰 진입
- 출처: 프로젝트 '소식함 (Notification)' 문서(FbqLL5VeQAgrDAsu9s26PW)에서 새 Core로 만들어진 케이스. 링크 카드가 그 문서 Spec 페이지(1:10)를 가리킴

### 페이지

- [Cover](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=1-45) `1:45` — master
- [🌊 플로우_26.08 기준](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=18-10401) `18:10401` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 소식함](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=18-10400) `18:10400`

- 📎 링크 카드 [소식함](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=42-15817) `42:15817` → 기준 문서 https://www.figma.com/design/FbqLL5VeQAgrDAsu9s26PW/?node-id=1-10 · 기준 정보 기입: 없음 · Ken이 직접 만든 링크 카드 원형. 텍스트 '소식함 관련 자세한 스펙은 아래 링크를 참고해주세요!' + 상태 뱃지 인스턴스(42:15820)의 '관련 스펙 링크'가 하이퍼링크

#### APP 섹션 `9:16379`

- **알림이 없을 경우** (설명 바 `4:324`)
  - [소식함 (알림이 없을 경우)_small](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=3-608) `3:608` 375x812
  - [비로그인 시_small](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-11778) `9:11778` 375x812
  - [소식함 (알림이 없을 경우)_medium](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=8-366) `8:366` 768x1024
  - [소식함 (알림이 없을 경우)_large](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-1332) `9:1332` 1024x1366
- **알림이 있을 경우** (설명 바 `9:1424`)
  - [소식함 (알림이 있을 경우)_small](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=3-642) `3:642` 375x812
  - [비로그인 시_small](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-14527) `9:14527` 375x812
  - [소식함 (알림이 있을 경우)_medium](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-1563) `9:1563` 768x1024
  - [소식함 (알림이 있을 경우)_large](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-1810) `9:1810` 1024x1366
- **소식 유형 케이스**
  - [소식 유형 케이스](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-22413) `9:22413` 1021x2212 — 셀 유형 모음 (화면이 아니라 케이스 표)

#### WEB 섹션 `9:16380`

- **알림이 없을 경우** (설명 바 `9:16429`)
  - [소식함 (알림이 없을 경우)_small](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-16381) `9:16381` 375x812
  - [소식함 (알림이 없을 경우)_medium](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=41-10196) `41:10196` 768x1024
  - [소식함 (알림이 없을 경우)_large](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-16391) `9:16391` 1024x1366
- **알림이 있을 경우** (설명 바 `9:16430`)
  - [소식함 (알림이 있을 경우)_small](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-16396) `9:16396` 375x812
  - [소식함 (알림이 있을 경우)_medium](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-16407) `9:16407` 768x1024
  - [소식함 (알림이 있을 경우)_large](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=9-16418) `9:16418` 1024x1366

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/MyrNGU07TEOXg6glOTG9jh/?node-id=20-21760) `20:21760`

- APP `20:15795` (자식 34개)
  - 진입 프레임: 소식함_APP 20:20538, 공지사항_웹뷰 19:10714, 이벤트_웹뷰 19:10724, 새소식_웹뷰 19:10734, 콘상페 20:14670, 컬렉션 20:15650
- WEB `20:21759` (자식 32개)
  - 진입 프레임: 소식함_WEB 20:17893, 공지사항 20:17369, 이벤트 20:20778, 새소식 20:20939, 콘상페 20:21326, 컬렉션 20:21694

## [Core] 로그인/온보딩

- 파일: https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/ (키 `irS8OlYuyQmW0aL4DR3cy5`, 형식: new)
- 다루는 영역: 로그인 / 회원가입(이메일·간편·애플) / 이메일 인증 / 온보딩·프로필 선택(플로우 페이지에만, 마스터 미수록)
- 파일럿: 2026-09-02 새 수록 기준 첫 적용. 판단 기록은 워크로그 '진행된 파일럿' 참고

### 페이지

- [Cover](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=89-21432) `89:21432` — master
- [🌊 플로우_26.05 기준](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=2-17) `2:17` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 로그인/회원가입](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-6) `91:6`

- 📎 링크 카드 [📎 스펙 링크 카드](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-7) `91:7` → 기준 문서 https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=2-17 · 기준 정보 기입: 없음 · 기준 정보(프로젝트명·배포일·담당자) 자리만 있고 미기입 — Ken 몫

#### APP 섹션 `91:10`

- **이메일 가입 단계 (대표 11장)**
  - [로그인/가입 시작](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-11) `91:11` 375x812
  - [이메일 입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-106) `91:106` 375x812
  - [가입 시작 안내](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-121) `91:121` 375x812
  - [이름 입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-147) `91:147` 375x812
  - [비밀번호 입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-224) `91:224` 375x812
  - [비밀번호 재입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-306) `91:306` 375x812
  - [약관 동의 - 전체 동의](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-383) `91:383` 375x812
  - [약관 동의 - 선택 제외](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-460) `91:460` 375x812
  - [이메일 인증](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-537) `91:537` 375x812
  - [이메일 인증 - 시간 초과](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-564) `91:564` 375x812
  - [가입 완료](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-593) `91:593` 375x813

#### WEB 섹션 `91:23038`

- **이메일 가입 단계 (대표 11장)**
  - [로그인/가입 방법 선택](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23039) `91:23039` 1280x720
  - [이메일 입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23097) `91:23097` 1280x720
  - [가입 시작 안내](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23110) `91:23110` 1280x720
  - [이름 입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23119) `91:23119` 1280x980
  - [비밀번호 입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23196) `91:23196` 1280x980
  - [비밀번호 재입력](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23273) `91:23273` 1280x980
  - [약관 동의 - 전체 동의](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23351) `91:23351` 1280x980
  - [약관 동의 - 선택 제외](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23431) `91:23431` 1280x980
  - [이메일 인증](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23509) `91:23509` 1280x720
  - [이메일 인증 - 시간 초과](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23538) `91:23538` 1280x720
  - [가입 완료](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=91-23569) `91:23569` 1280x720

### 플로우 페이지(기준 문서) — 루트 [로그인/회원가입](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=27-14293) `27:14293`

- 메모: 온보딩·프로필 화면은 섹션 밖에 흩어져 있음. '표시 콘텐츠 설정' 프레임 이름은 실물과 불일치(파일럿 미결 ②)
- APP `25:68375` (자식 ?개)
  - 하위 섹션 [이메일로 로그인/회원가입](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=25-54670) `25:54670` (자식 70개)
  - 하위 섹션 [간편 로그인/가입](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=25-56269) `25:56269` (자식 109개)
  - 하위 섹션 [[only iOS] 애플 간편 로그인/가입](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=25-59012) `25:59012` (자식 25개)
- WEB `25:78127` (자식 ?개)
  - 하위 섹션 [이메일로 회원 가입하기](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=25-69055) `25:69055` (자식 78개)
  - 하위 섹션 [간편 회원가입](https://www.figma.com/design/irS8OlYuyQmW0aL4DR3cy5/?node-id=25-70395) `25:70395` (자식 114개)
- 섹션 밖 프레임: 온보딩 30:16617, 온보딩_웹툰 34:15825, 프로필 선택 31:20909 / 50:20369 / 50:20857, 프로필 편집 56:22173, 온보딩(WEB) 36:20911, SVOD 35:19123, webtoon 35:24097 / 56:21043

## [Core] 스텝메이드

- 파일: https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/ (키 `NO7uetAL9Qmk03IXWSaMej`, 형식: old)
- 다루는 영역: 스텝메이드 상세 (헤더 이미지·정렬·Body 케이스) / 뷰포트별 변형
- 메모: 각 크기 섹션 = Guide(해부도) + Image ratio/Gradation/Position + Header 변형 + Body 케이스(섹션 타이틀/탭바/일반) + 뷰포트 폭 프레임(360/375/440/599/600/768/799/1024/1280/1440/1680/1920). 브랜치 B(XIolz3S5ClSf5VEaBkwDi6)에 Δ 페이지 3007:6 있음

### 페이지

- [cover](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=28-34464) `28:34464`
- [✅ Mobile](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=108-11477) `108:11477` — master(구형식)
- [ㄴ 로컬 컴포넌트](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=190-69273) `190:69273`
- [✅ Web](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=190-69275) `190:69275` — master(구형식)
- [ㄴ 로컬 컴포넌트](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=190-69276) `190:69276`
- [📏 운영 가이드](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=190-69274) `190:69274` — guide

### 구 형식 섹션

- 페이지 `108:11477`
  - [Mobile- small](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=108-11502) `108:11502` (자식 108개) · Guide `148:21837`
  - [Mobile - medium](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=149-32628) `149:32628` (자식 95개) · Guide `171:30636`
  - [Mobile - large](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=190-44334) `190:44334` (자식 95개) · Guide `190:48344`
- 페이지 `190:69275`
  - [~767](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=190-69586) `190:69586` (자식 107개) · Guide `190:69909`
  - [768~1280](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=191-25799) `191:25799` (자식 96개) · Guide `191:25800`
  - [1280~](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=191-35157) `191:35157` (자식 9개)
  - [더보기 팝업](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=298-9071) `298:9071` (자식 4개)
- 페이지 `190:69274`
  - [Mobile, Mobile Web](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=298-20250) `298:20250` (자식 101개)
  - [Tablet, Desktop](https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/?node-id=302-45103) `302:45103` (자식 143개)

## [Core] 왓챠파티

- 파일: https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/ (키 `sDW2rfQE7IRRiQ5R0CWLWz`, 형식: new, 최종 수정 2026-08-03)
- 다루는 영역: 왓챠파티 페이지(파티 목록·상세·절망편) / 왓챠파티 생성(공개/비공개) / 왓챠파티 바텀시트 / 왓챠파티 플레이어(세로/가로)
- 출처: Common-Features '왓챠파티' 파일에서 Core로 승격 (노션 '왓챠 피그마 구조 개편안'). 2026-09-02 운영안에서 '경계를 가로지르는 케이스는 새 Core'의 예시로 지정
- 메모: 새 Core 케이스의 본보기 — 홈·TVOD·플레이어 등 여러 영역을 가로지르는 기능이라 별도 Core로 분리. 마스터에 '왓챠파티 진입' 섹션(어느 Core의 어느 화면에서 들어오는지 표시)이 있음

### 페이지

- [Cover](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-7) `5:7` — master
- [🌊 플로우](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-8) `5:8` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 왓챠파티](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=20-29495) `20:29495` · 스타일 fill 20,21,23

- 📎 링크 카드: **없음** → 이관 시 추가 대상

#### 왓챠파티 진입 섹션 `7:27244` (자식 10개 · fill 34,35,38 · 파일 바 ⚫ '왓챠파티' `5:14319`)

- 기타 인스턴스: 영역 설명 컴포넌트
- **왓챠파티 진입점** (설명 바 `5:14306`)
  - [SVOD](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-9823) `5:9823` 375x4816
  - [TVOD](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-9943) `5:9943` 375x3407
- **왓챠파티** (설명 바 `5:14313`)
  - [왓챠파티 페이지](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-2282) `5:2282` 375x1899

#### APP 섹션 `7:39210` (자식 31개 · fill 34,35,38 · 파일 바 ⚫ '왓챠파티' `6:21357`)

- **왓챠파티 생성** (설명 바 `7:37007`)
  - [왓챠파티 생성](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-36888) `7:36888` 375x812 [small]
  - [왓챠파티 생성_비공개](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-37136) `7:37136` 375x812 [small]
  - [왓챠파티 생성](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-37316) `7:37316` 768x1133
  - [왓챠파티 생성_비공개](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-37359) `7:37359` 768x1133
  - [왓챠파티 생성](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-37596) `7:37596` 1024x1366 [large]
  - [왓챠파티 생성](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-37684) `7:37684` 1024x1366 [large]
- **왓챠파티 상세** (설명 바 `6:21356`)
  - [왓챠파티 페이지](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-14326) `5:14326` 375x1899 [small]
  - [왓챠파티 페이지 - 절망편](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-15169) `5:15169` 375x1373 [small]
  - [왓챠파티 바텀시트](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-30055) `7:30055` 375x812 [small]
  - [왓챠파티 페이지](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-15457) `5:15457` 768x1899 [medium]
  - [왓챠파티 페이지 - 절망편](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-18825) `5:18825` 768x1373 [medium]
  - [왓챠파티 바텀시트](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-28031) `7:28031` 768x1133 [medium]
  - [왓챠파티 페이지](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-20322) `5:20322` 1024x1899 [large]
  - [왓챠파티 페이지 - 절망편](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=5-20437) `5:20437` 1024x1373 [large]
  - [왓챠파티 바텀시트](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-31900) `7:31900` 1024x1366 [large]
- **왓챠파티 플레이어** (설명 바 `7:37843`)
  - [왓챠파티 플레이어_세로](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-26365) `7:26365` 375x812 [mobile]
  - [왓챠파티 플레이어_세로](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-38669) `7:38669` 768x1024 [tablet]
  - [왓챠파티 플레이어_가로](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-26333) `7:26333` 812x375 [mobile]
  - [왓챠파티 플레이어_가로](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-38739) `7:38739` 1024x768 [tablet]

#### WEB 섹션 `20:29494` (자식 21개 · fill 34,35,38 · 파일 바 ⚫ '왓챠파티' `20:29489`)

- **왓챠파티 생성** (설명 바 `20:29479`)
  - [왓챠파티 생성](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=7-42448) `7:42448` 375x812 [small]
  - [왓챠파티 생성_비공개](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=18-15487) `18:15487` 375x812 [small]
  - [왓챠파티 생성](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=18-17449) `18:17449` 768x1133 [medium]
  - [왓챠파티 생성_비공개](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=18-18135) `18:18135` 768x1133 [medium]
  - [왓챠파티 생성](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=18-18776) `18:18776` 1024x1366 [large]
  - [왓챠파티 생성_비공개](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=18-19516) `18:19516` 1024x1366 [large]
- **왓챠파티 상세** (설명 바 `20:29484`)
  - [왓챠파티 페이지](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=19-21097) `19:21097` 375x2380 [small]
  - [왓챠파티 페이지 - 절망편](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=20-23861) `20:23861` 375x2004 [small]
  - [왓챠파티 페이지](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=20-24512) `20:24512` 768x2473 [medium]
  - [왓챠파티 페이지 - 절망편](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=20-26932) `20:26932` 768x1677 [medium]
  - [왓챠파티 페이지](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=20-27653) `20:27653` 1024x2473 [large]
  - [왓챠파티 페이지 - 절망편](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=20-28512) `20:28512` 1024x1677 [large]

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/sDW2rfQE7IRRiQ5R0CWLWz/?node-id=24-40463) `24:40463`

- APP `22:35013` (자식 62개)
  - 프레임: 왓챠파티 페이지 21:29496, 왓챠파티 바텀시트 22:26146, 파티 리스트 22:24325, 세로 모드_왓챠파티 22:25317, TVOD 22:27870, 웹툰 22:27990, 검색 22:28110, 콘상페_APP 22:36043, 왓챠파티 생성 22:36870, 보관함 36:13170
- WEB `24:40462` (자식 15개)
  - 프레임: 왓챠파티 페이지 22:36967, 파티 리스트 22:37655, 왓챠파티 플레이어 24:40117

## [Core] 결제/구독

- 파일: https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/ (키 `qxQoDWpbqwCDvGb1O2HZLv`, 형식: new, 최종 수정 2026-06-10)
- 다루는 영역: 결제 페이지(콘텐츠 결제·웹툰 결제·선물하기) / 구독(이용권 결제)
- 메모: 한 파일에 루트 섹션 2개(🌏 결제 / 🌏 구독) + 플로우 루트 2개(🌊 플로우_결제 / 🌊 플로우_구독). 링크 카드 3개(결제·선물하기·구독)가 각각 다른 기준 문서를 가리킴

### 페이지

- [Cover](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=9-7) `9:7` — master
- [🌊 플로우](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=21-3920) `21:3920` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 결제](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=17-3774) `17:3774` · 스타일 fill 20,21,23

- 📎 링크 카드 [결제](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=29-8971) `29:8971` → 기준 문서 https://www.figma.com/design/OSB7YzdtkawBcYhKXMCVbk/%EC%BD%98%ED%85%90%EC%B8%A0-%EA%B2%B0%EC%A0%9C--TVOD-?node-id=0-1 · 기준 정보 기입: 없음
- 📎 링크 카드 [선물하기](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=31-5240) `31:5240` → 기준 문서 https://www.figma.com/design/pF9DXcoomZfF6menXlDIMB/%EC%84%A0%EB%AC%BC%ED%95%98%EA%B8%B0--Gift-?node-id=0-1 · 기준 정보 기입: 없음

#### APP 섹션 `15:2869` (자식 23개 · fill 34,35,38 · 파일 바 ⚫ '결제하기' `15:2093`)

- **(묶음 바 없음)**
  - [캐시 보유 여부](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-1137) `15:1137` 822x542
- **결제** (설명 바 `15:2094`)
  - [결제페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=10-226) `10:226` 375x2097 [small]
- **웹툰 결제** (설명 바 `15:2112`)
  - [결제페이지_웹툰](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=11-1132) `11:1132` 375x2448 [small]
- **선물하기** (설명 바 `15:2117`)
  - [선물하기 페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=14-4033) `14:4033` 375x2635 [small]
- **결제** (설명 바 `15:2122`)
  - [결제페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=11-569) `11:569` 768x2097 [medium]
- **웹툰 결제** (설명 바 `15:2123`)
  - [결제페이지_웹툰](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=13-405) `13:405` 768x2448 [medium]
- **선물하기** (설명 바 `15:2124`)
  - [선물하기 페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-1405) `15:1405` 768x2576 [medium]
- **결제** (설명 바 `15:2142`)
  - [결제페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=11-744) `11:744` 1024x2097 [large]
- **웹툰 결제** (설명 바 `15:2143`)
  - [결제페이지_웹툰](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=13-722) `13:722` 1024x2448 [large]
- **선물하기** (설명 바 `15:2144`)
  - [선물하기 페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-1777) `15:1777` 1024x2576 [large]

#### WEB 섹션 `17:3772` (자식 23개 · fill 34,35,38 · 파일 바 ⚫ '결제하기' `17:3767`)

- **(묶음 바 없음)**
  - [결제 방식에 따른 CTA](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-4850) `15:4850` 758x180
- **결제** (설명 바 `15:3239`)
  - [결제페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-2870) `15:2870` 375x3179 [small]
- **웹툰 결제** (설명 바 `15:3240`)
  - [결제페이지_웹툰](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-2975) `15:2975` 375x3402 [small]
- **선물하기** (설명 바 `15:3241`)
  - [선물하기 페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-3094) `15:3094` 375x3631 [small]
- **결제** (설명 바 `15:7163`)
  - [결제페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-5254) `15:5254` 768x2992 [medium]
- **웹툰 결제** (설명 바 `15:7164`)
  - [결제페이지_웹툰](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-5493) `15:5493` 768x2992 [medium]
- **선물하기** (설명 바 `15:7165`)
  - [선물하기 페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-5973) `15:5973` 768x3377 [medium]
- **결제** (설명 바 `15:7967`)
  - [결제페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-7183) `15:7183` 1024x2992 [large]
- **웹툰 결제** (설명 바 `15:7968`)
  - [결제페이지_웹툰](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-7450) `15:7450` 1024x2992 [large]
- **선물하기** (설명 바 `15:7969`)
  - [선물하기 페이지](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-7720) `15:7720` 1024x3377 [large]

### 마스터 페이지 구조 — 루트 섹션 [🌏 구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=21-3919) `21:3919` · 스타일 fill 20,21,23

- 📎 링크 카드 [구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=29-8981) `29:8981` → 기준 문서 https://www.figma.com/design/9Pf0d9hGs5INRCrmg33WCR/%EA%B5%AC%EB%8F%85---%EC%9D%B4%EC%9A%A9%EA%B6%8C-%EA%B2%B0%EC%A0%9C--Subscribe-?node-id=0-1 · 기준 정보 기입: 없음

#### APP 섹션 `21:3917` (자식 8개 · fill 34,35,38 · 파일 바 ⚫ '구독' `21:3907`)

- **구독** (설명 바 `21:3897`)
  - [구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=15-2444) `15:2444` 375x1621 [small]
  - [구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=20-2918) `20:2918` 768x1516 [medium]
  - [구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=20-3258) `20:3258` 1024x1516 [large]

#### WEB 섹션 `21:3918` (자식 8개 · fill 34,35,38 · 파일 바 ⚫ '구독' `21:3912`)

- **구독** (설명 바 `21:3902`)
  - [구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=20-3722) `20:3722` 375x1487 [small]
  - [구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=20-3744) `20:3744` 768x1428 [medium]
  - [구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=20-3770) `20:3770` 1024x1428 [large]

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우_결제](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=29-8174) `29:8174` · 가이드 `29:8177`

- APP `22:10450` (자식 72개)
  - 프레임: 결제페이지 21:3921, 캐시 선택 21:6164, 결제 OS 바텀시트_AOS 21:7977, 결제 OS 바텀시트_iOS 21:8170, 쿠폰 선택 21:5619, 대여 21:5421, 결제페이지_웹툰 21:4026, 전체선택 21:8668, 개별선택 22:5245, 전체선택 해제 21:8956, 에피소드 접기 21:8371, 선물하기 페이지 21:4146, 선물 메세지 입력 22:5535
- WEB `29:8173` (자식 71개)
  - 프레임: 결제페이지 25:6329, 캐시 사용 25:13390, 결제 방법 선택 25:13770, 본인인증 안되었을 경우 26:3980, 카드 등록 안되어있을 경우 27:4994, 캐시 충전 27:5547, 대여 25:8317, 쿠폰 선택 25:8668, 결제페이지_웹툰 25:6688, 전체선택 27:6353, 전체 선택 해제 28:7731, 에피소드 접기 27:5898, 선물하기 페이지 25:6957

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우_구독](https://www.figma.com/design/qxQoDWpbqwCDvGb1O2HZLv/?node-id=29-8930) `29:8930` · 가이드 `29:8931`

- APP `22:10449` (자식 24개)
  - 프레임: 구독 22:8887, 베이직 22:9166, 약관 동의 22:9695, 동의 안되어있을 경우 22:10375, 결제 주기 선택 22:10289
- WEB `29:8929` (자식 13개)
  - 프레임: 결제 주기 선택 29:8426, 구독 29:8181, 베이직 구독권 29:8526

## [Core] 웹툰

- 파일: https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/ (키 `oxNqyqrROApLaQbHB0Kowz`, 형식: new, 최종 수정 2026-09-02)
- 다루는 영역: 웹툰 탭 홈(APP small/medium/large, WEB small/large) / 웹툰 뷰어(플로우 페이지에만)
- 메모: 루트 섹션 없이 APP/WEB 섹션이 페이지에 바로 놓임. 케이스 묶음(⚪) 없이 파일 바(⚫)+크기 바(🔵)만. 플로우 페이지 밖에 '웹툰 뷰어' 프레임

### 페이지

- [Cover](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=5-7) `5:7` — master
- [🌊 플로우_26.09.02 기준](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=25-33860) `25:33860` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [(루트 섹션 없음 — 페이지 직속)](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=5-7) `5:7`

- 📎 링크 카드: **없음** → 이관 시 추가 대상

#### APP 섹션 `24:29855` (자식 8개 · fill 34,35,38 · 파일 바 ⚫ '웹툰' `5:4801`)

- **(묶음 바 없음)**
  - [🌏 웹툰_APP](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=5-4854) `5:4854` 375x3407
  - [웹툰_Small](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=14-10514) `14:10514` 375x3407 [small]
  - [웹툰_medium](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=14-12034) `14:12034` 768x3407 [medium]
  - [웹툰_large](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=18-17099) `18:17099` 1024x3407 [large]

#### WEB 섹션 `24:32272` (자식 6개 · fill 34,35,38 · 파일 바 ⚫ '웹툰' `24:29840`)

- **(묶음 바 없음)**
  - [🌏 웹툰_WEB](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=18-21953) `18:21953` 375x3629
  - [웹툰_small](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=21-24171) `21:24171` 375x3629 [small]
  - [웹툰_large](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=21-24738) `21:24738` 1560x4699 [large]

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/oxNqyqrROApLaQbHB0Kowz/?node-id=25-40944) `25:40944` · 가이드 `25:42501`

- APP `25:40945` (자식 104개)
  - 프레임: 크롬캐스트 36:75632, 이벤트 37:80163, 웹툰 뷰어 37:80952, 무료 캐시 36:75754, 컬렉션 37:80048, 나의 왓챠 36:75760, 소식함 36:75874, 장르 바텀시트 36:75884, TVOD 37:81064, 검색 37:81304, 보관함 37:81445, 웹툰_APP 25:74184, 콘상페_웹툰 37:79501, SVOD 37:87153
- WEB `37:88428` (자식 74개)
  - 프레임: 웹툰_large 37:87451, 소식함 37:90252, 검색 37:90561, 프로필 37:90730, 보관함 37:91030, 왓챠파티 플레이어 44:96571, 태그 44:96630, 왓챠파티 44:96939, 비로그인 44:96975, 콘상페_웹툰 44:101778, 이벤트 44:102473, 컬렉션 44:102476, 웹툰 뷰어 54:102731
- 루트 안 섹션 밖 프레임: 웹툰 뷰어 55:102741

## [Core] TV ⚜️

- 파일: https://www.figma.com/design/XaSH6GlcwwoHs424kf3Flp/ (키 `XaSH6GlcwwoHs424kf3Flp`, 형식: other, 최종 수정 2026-08-31)
- 다루는 영역: TV 홈(점보트론·TVOD 랭킹) / TV 에피소드 리스트 / TV 레이아웃 템플릿
- 메모: TV 플랫폼 전용. 새 형식 미적용 — 섹션·설명 바 없이 1920 프레임 4장만, 플로우 페이지는 비어 있음

### 페이지

- [Cover](https://www.figma.com/design/XaSH6GlcwwoHs424kf3Flp/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/XaSH6GlcwwoHs424kf3Flp/?node-id=4-55) `4:55` — master
- [🌊 플로우](https://www.figma.com/design/XaSH6GlcwwoHs424kf3Flp/?node-id=4-54) `4:54` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [(섹션 없음)](https://www.figma.com/design/XaSH6GlcwwoHs424kf3Flp/?node-id=4-55) `4:55`

- 📎 링크 카드: **없음** → 이관 시 추가 대상
- 섹션 밖 프레임: TV1.5 / LayoutTemplet 10:2706 1920x1080, TV / episodeList 10:2764 1920x1080, TV2023 / home / jumbo 10:2827 1920x1610, TV2023 / home / TVOD - 랭킹 축소 10:2852 1920x2125

### 플로우 페이지 — **비어 있음**


## [Core] 콘상페 ⚜️

- 파일: https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/ (키 `TCceg5cEvzgzViCXg8S4WO`, 형식: new, 최종 수정 2026-08-12)
- 다루는 영역: 콘텐츠 상세 페이지(콘텐츠 정보·회차 정보·관련 콘텐츠·웹툰 탭) / 케이스 표(시즌/버전·탑 네비게이션·예상 별점·갯수별 노출·버튼)
- 메모: 마스터에 '콘상페 진입' 섹션(SVOD·TVOD·웹툰·보관함·검색에서의 진입점 표시). WEB은 large를 ~1079 / 1080~ 두 폭으로 나눔

### 페이지

- [Cover](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=1-3) `1:3` — master
- [🌊 플로우](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=32-35692) `32:35692` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 콘상페](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=125-24569) `125:24569` · 스타일 fill 20,21,23

- 📎 링크 카드: **없음** → 이관 시 추가 대상
- 섹션 밖 프레임: 🌏 콘상페_APP 125:24570 375x2599, 🌏 콘상페_WEB 125:25255 375x2985

#### APP 섹션 `27:32736` (자식 30개 · fill 34,35,38 · 파일 바 ⚫ '콘상페' `8:4229`)

- **(묶음 바 없음)**
  - [시즌, 버전 케이스](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=18-9046) `18:9046` 414x172
  - [탑 네비게이션](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=19-18829) `19:18829` 830x197
  - [예상 별점 케이스](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-25051) `27:25051` 1021x1097
  - [갯수별 노출 방식](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-25957) `27:25957` 1021x1079
  - [버튼 케이스](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=65-23232) `65:23232` 1647x1014
- **콘텐츠 정보** (설명 바 `8:4250`)
  - [콘상페_콘텐츠 정보_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=17-4984) `17:4984` 375x2599 [small]
- **회차 정보** (설명 바 `19:24152`)
  - [콘상페_회차 정보_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=19-18955) `19:18955` 375x2249 [small]
- **관련 콘텐츠** (설명 바 `19:24157`)
  - [콘상페_관련 콘텐츠_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=19-21024) `19:21024` 375x2249 [small]
- **웹툰** (설명 바 `21:27163`)
  - [콘상페_웹툰_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=20-25817) `20:25817` 375x2249 [small]
- **콘텐츠 정보** (설명 바 `23:49883`)
  - [콘상페_콘텐츠 정보_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=18-12146) `18:12146` 768x2496 [medium]
- **회차 정보** (설명 바 `23:49888`)
  - [콘상페_회차 정보_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=19-24162) `19:24162` 768x2140 [medium]
- **관련 콘텐츠** (설명 바 `23:49893`)
  - [콘상페_관련 콘텐츠_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=21-27168) `21:27168` 768x2140 [medium]
- **웹툰** (설명 바 `23:49898`)
  - [콘상페_웹툰_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=23-47448) `23:47448` 768x2140 [medium]
- **콘텐츠 정보** (설명 바 `23:50918`)
  - [콘상페_콘텐츠 정보_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=23-50923) `23:50923` 1024x2796 [large]
  - [콘상페_회차 정보_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=26-56311) `26:56311` 1024x2796 [large]
  - [콘상페_관련 콘텐츠_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=26-57594) `26:57594` 1024x2796 [large]
  - [콘상페_웹툰_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-12637) `27:12637` 1024x2796 [large]

#### WEB 섹션 `32:35690` (자식 38개 · fill 34,35,38 · 파일 바 ⚫ '콘상페' `27:22246`)

- **(묶음 바 없음)**
  - [하단 버튼 영역 (스크롤 시)](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=30-19251) `30:19251` 1072x442
- **콘텐츠 정보** (설명 바 `27:22371`)
  - [콘상페_콘텐츠 정보_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-22251) `27:22251` 375x2985 [small]
- **회차 정보** (설명 바 `27:22372`)
  - [콘상페_회차 정보_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-32737) `27:32737` 375x2110 [small]
- **관련 콘텐츠** (설명 바 `27:22373`)
  - [콘상페_관련 콘텐츠_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-33951) `27:33951` 375x2110 [small]
- **웹툰** (설명 바 `27:22374`)
  - [콘상페_웹툰_small](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=28-15964) `28:15964` 375x2110 [small]
- **콘텐츠 정보** (설명 바 `28:21869`)
  - [콘상페_콘텐츠 정보_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=28-19993) `28:19993` 768x2811 [medium]
- **회차 정보** (설명 바 `28:21870`)
  - [콘상페_회차 정보_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=28-17164) `28:17164` 768x2140 [medium]
- **관련 콘텐츠** (설명 바 `29:24229`)
  - [콘상페_관련 콘텐츠_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=28-21879) `28:21879` 768x2140 [medium]
- **웹툰** (설명 바 `29:24234`)
  - [콘상페_관련 콘텐츠_medium](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=28-23134) `28:23134` 768x2140 [medium]
- **콘텐츠 정보** (설명 바 `32:27736`)
  - [콘상페_콘텐츠 정보_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=30-17371) `30:17371` 1024x2796 [large (~1079)]
- **회차 정보** (설명 바 `32:27737`)
  - [콘상페_회차 정보_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=31-19714) `31:19714` 1024x2796 [large (~1079)]
- **관련 콘텐츠** (설명 바 `32:27738`)
  - [콘상페_관련 콘텐츠_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=31-20502) `31:20502` 1024x2796 [large (~1079)]
- **웹툰** (설명 바 `32:27739`)
  - [콘상페_웹툰_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=32-26175) `32:26175` 1024x2796 [large (~1079)]
- **콘텐츠 정보** (설명 바 `32:35661`)
  - [콘상페_콘텐츠 정보_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=32-28396) `32:28396` 1280x2796 [large (1080~)]
- **회차 정보** (설명 바 `32:35656`)
  - [콘상페_회차 정보_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=32-29306) `32:29306` 1280x2796 [large (1080~)]
- **관련 콘텐츠** (설명 바 `32:35651`)
  - [콘상페_관련 콘텐츠_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=32-30113) `32:30113` 1280x2796 [large (1080~)]
- **웹툰** (설명 바 `32:35646`)
  - [콘상페_웹툰_large](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=32-31934) `32:31934` 1280x2796 [large (1080~)]

#### 콘상페 진입 섹션 `32:35691` (자식 32개 · fill 34,35,38 · 파일 바 ⚫ '콘상페 진입' `30:18130`)

- 기타 인스턴스: 영역 설명 컴포넌트
- **콘상페 진입점** (설명 바 `27:17709`)
  - [TVOD](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=183-52987) `183:52987` 375x3407
  - [SVOD](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=23-48081) `23:48081` 375x4816
  - [웹툰](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-13490) `27:13490` 375x2998
  - [보관함](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=27-16097) `27:16097` 375x812
  - [검색](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=185-56401) `185:56401` 375x812
- **콘상페** (설명 바 `30:18125`)
  - [콘상페](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=4-4828) `4:4828` 375x1936

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/TCceg5cEvzgzViCXg8S4WO/?node-id=143-70898) `143:70898` · 가이드 `140:62199`

- APP `140:62198` (자식 132개)
  - 프레임: 콘상페_APP 32:35721, 삽입곡 정보 140:53518, 크롬캐스트 139:25650, 더보기 139:27123, 시즌 선택 41:8389, 비로그인 140:36185, 비로그인 140:39837, 비로그인 140:41348, 비로그인 140:43522, 평가하기 (비구독, 구독) 140:40594, 비구독 140:41498, 보고싶어요 (비구독, 구독) 140:43672, 구독 140:42792, 비구독 140:36933, 버전 선택 139:28880, Player 32:37734, 더보기 140:47602, 버튼 케이스별 플로우 139:29624, 구독 140:39152, 회차 정보 140:47624, 감독/출연 더보기 140:50986, 감독/출연 상세 140:52193, 삽입곡 더보기 140:52556, 관련 콘텐츠 140:47737, TVOD 140:55056, 웹툰 140:55176, 검색 140:55296, 보관함 140:55437
- WEB `143:70897` (자식 125개)
  - 프레임: 콘상페_WEB 140:62219, 버튼 케이스별 플로우 142:27550, 소식함 141:24422, 보고싶어요 143:43740, 평가하기 143:44502, 더보기 143:45852, 시즌 142:26651, 비로그인 141:33496, 비로그인 143:44501, 비로그인 143:44688, 왓챠파티 생성 141:34272, 검색 141:24731, 보관함 141:24900, 프로필 141:24902, 왓챠파티 141:30657, 플레이어 142:30887, WatchaCustomModal 143:32918, 회차 정보 143:67003, 관련 콘텐츠 143:67110, 감독/출연 더보기 143:68483, 삽입곡 더보기 143:70152, 삽입곡 정보 143:70205, 감독/출연 상세 143:69735

## [Core] 플레이어 ⚜️

- 파일: https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/ (키 `y9SqD2XfL1h4jSVFhkVS2m`, 형식: new, 최종 수정 2026-08-03)
- 다루는 영역: 일반 플레이어(모바일·태블릿·웹) / 왓챠파티 플레이어(세로/가로)
- 메모: 마스터에 '플레이어 진입' 섹션. 링크 카드 2개(모바일 플레이어 / 웹 플레이어)가 각각 다른 기준 문서를 가리킴. 왓챠파티 플레이어는 [Core] 왓챠파티에도 있음 → 이중 수록 주의

### 페이지

- [Cover](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=1-45) `1:45` — master
- [🌊 플로우](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=6-8287) `6:8287` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 플레이어](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=10-10869) `10:10869` · 스타일 fill 20,21,23

- 📎 링크 카드 [모바일 플레이어](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=10-10914) `10:10914` (섹션 APP) → 기준 문서 https://www.figma.com/design/fmIGgEdPSRnrcWdinuYwr7/%EB%AA%A8%EB%B0%94%EC%9D%BC-%ED%83%9C%EB%B8%94%EB%A6%BF-%ED%94%8C%EB%A0%88%EC%9D%B4%EC%96%B4--Mobile-Player-?node-id=2-2 · 기준 정보 기입: 없음
- 📎 링크 카드 [웹 플레이어](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=10-10906) `10:10906` (섹션 WEB) → 기준 문서 https://www.figma.com/design/qYR6hg1B3D148TOE6Y0l9h/%EC%9B%B9-%ED%94%8C%EB%A0%88%EC%9D%B4%EC%96%B4--Web-Player-?node-id=0-1 · 기준 정보 기입: 없음

#### 플레이어 진입 섹션 `5:12101` (자식 25개 · fill 34,35,38 · 파일 바 ⚫ '플레이어 진입' `5:12474`)

- 기타 인스턴스: 영역 설명 컴포넌트
- **플레이어 진입점** (설명 바 `5:12309`)
  - [SVOD](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=5-12311) `5:12311` 375x4816
  - [보관함](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=5-12470) `5:12470` 375x812
  - [TVOD](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=5-20316) `5:20316` 375x3407
  - [왓챠파티 페이지](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=5-22128) `5:22128` 375x1899
- **플레이어** (설명 바 `5:12310`)
  - [Player](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=1-1931) `1:1931` 812x375

#### APP 섹션 `9:7314` (자식 15개 · fill 34,35,38 · 파일 바 ⚫ '플레이어' `8:7309`)

- 기타 인스턴스: Player / SeekGestureHint
- **일반 플레이어** (설명 바 `1:2404`)
  - [플레이어_태블릿](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=6-7884) `6:7884` 768x1024 [태블릿]
  - [플레이어_모바일](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=6-7498) `6:7498` 812x375 [모바일]
- **왓챠파티 플레이어** (설명 바 `5:23889`)
  - [왓챠파티 플레이어_모바일_세로모드](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=1-2996) `1:2996` 375x812 [모바일]
  - [왓챠파티 플레이어_태블릿_세로모드](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=6-9430) `6:9430` 768x1024 [태블릿]
  - [왓챠파티 플레이어_모바일_가로모드](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=6-8229) `6:8229` 812x375 [모바일]
  - [왓챠파티 플레이어_태블릿_가로모드](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=6-10705) `6:10705` 1024x768 [태블릿]

#### WEB 섹션 `10:7315` (자식 7개 · fill 34,35,38 · 파일 바 ⚫ '플레이어' `10:7452`)

- 기타 인스턴스: Player / SeekGestureHint
- **일반 플레이어** (설명 바 `10:7316`)
  - [플레이어](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=10-10452) `10:10452` 1560x1024
- **왓챠파티 플레이어** (설명 바 `10:7317`)
  - [왓챠파티 플레이어](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=10-10606) `10:10606` 1560x1024

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/y9SqD2XfL1h4jSVFhkVS2m/?node-id=33-18150) `33:18150` · 가이드 `17:14453`

- APP `17:14457` (자식 111개)
  - 프레임: 구간 탐색 14:4783, 플레이어 10:12169, 다음화 17:13645, 더보기 14:4027, 별점 22:15080, 재생 속도 14:5150, 자막 선택 14:5459, 에피소드 선택 17:12241, 일시정지 13:13556, 다음 에피소드 22:15384, 화면 밝기 14:4504, 10초 구간 탐색 13:14072, 채팅 표시 (왓챠파티) 13:14296, 채팅 얼림 (왓챠파티) 17:13276, 크롬캐스트 13:15299, 화면 잠금 13:15857, 음량 14:4755, 오프닝 건너뛰기 17:13916, 세로 모드 17:14019, 세로 모드_왓챠파티 6:8293
- WEB `33:18149` (자식 125개)
  - 프레임: 왓챠파티 플레이어 24:13080, 채팅방 닫기_호버 28:13621, 채팅방 닫기_클릭 28:14161, 초대 링크 27:13875, 채팅 얼리기 33:17391, 참여자 32:21042, 호스트 24:13511, 플레이어 19:12163, 일시정지 31:19036, 오프닝 건너뛰기 32:20874, 전체화면 32:19157, 에피소드 선택 32:16051, 하단 모드 32:17183, 음량조절_호버 31:19610, 음량조절_클릭 31:19776, 더보기 28:16635, 10초 구간 탐색 31:18800, 구간 탐색_호버 31:16832, 구간 탐색_드래그 31:17997, 문제 제보 19:12422, 재생 속도 22:13424, 자막 22:14380, 문제 제보 모달 22:13256, 콘상페 28:15784
- 루트 안 섹션 밖 프레임: Player/Masters/Controller 102:17428, chromecast 102:17445

## [Core] TVOD ⚜️

- 파일: https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/ (키 `aBcQKIbe9nOsPMNQOagw2v`, 형식: new, 최종 수정 2026-06-17)
- 다루는 영역: TVOD 홈(로그인/구독 케이스) / 태그 페이지(일반 태그·성인 태그 ×인증 상태)
- 메모: SVOD와 같은 홈 구조. 태그 페이지가 여기에 수록됨

### 페이지

- [Cover](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=2-50) `2:50` — master
- [🌊 플로우](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=21-34918) `21:34918` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 TVOD](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=41-41155) `41:41155` · 스타일 fill 20,21,23

- 📎 링크 카드: **없음** → 이관 시 추가 대상

#### 🌏 TVOD_WEB 섹션 `20:27378` (자식 23개 · fill 34,35,38)

- **(대분류 바 없음)**
  - (묶음 바 없음)
    - [🌏 TVOD_WEB](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-38858) `20:38858` 375x3909
    - [태그 케이스](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-48870) `29:48870` 432x170
- **로그인/구독 케이스** (설명 바 `20:27599`)
  - 로그인/구독 (설명 바 `20:27600`)
    - [로그인/구독_1280 미만](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=21-25660) `21:25660` 375x3909 [1280 미만]
    - [로그인/구독_1280 이상](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-27607) `20:27607` 1560x4575 [1280 이상]
  - 비로그인/비구독 (설명 바 `20:27601`)
    - [비로그인/비구독_600 미만](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-28370) `20:28370` 375x3719 [360~599]
    - [비로그인/비구독_1280 미만](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-27380) `20:27380` 768x3802 [600~1279]
    - [비로그인/비구독_1280 이상](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-27915) `20:27915` 1560x4292 [1280 이상]
- **태그** (설명 바 `29:48537`)
  - 일반 태그 (설명 바 `29:52933`)
    - [일반 태그](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-52944) `29:52944` 375x812
  - 성인 태그 (설명 바 `29:52939`)
    - [성인 태그_비로그인](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-52141) `29:52141` 375x812
    - [성인 태그_성인 인증 X](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-53177) `29:53177` 375x812
    - [성인 태그_성인 인증 O](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-53338) `29:53338` 375x812

#### APP 섹션 `20:38857` (자식 48개 · fill 34,35,38)

- **(대분류 바 없음)**
  - (묶음 바 없음)
    - [🌏 TVOD_APP](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=4-6863) `4:6863` 375x3407
- **로그인/구독 케이스** (설명 바 `4:6100`)
  - 로그인/구독 (설명 바 `4:6098`)
    - [로그인/구독_small](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=16-15378) `16:15378` 375x3407 [small]
    - [로그인/구독_medium](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=4-6348) `4:6348` 768x3407 [medium]
    - [로그인/구독_large](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=4-6604) `4:6604` 1024x4369 [large]
  - 비로그인/비구독 (설명 바 `4:6099`)
    - [비로그인/비구독_small](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-19768) `20:19768` 375x3270 [small]
    - [비로그인/비구독_medium](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-20975) `20:20975` 768x3209 [medium]
    - [비로그인/비구독_large](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=20-22171) `20:22171` 1024x4123 [large]
- **태그** (설명 바 `29:46183`)
  - 일반 태그 (설명 바 `28:14773`)
    - [태그_small](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=24-44323) `24:44323` 375x812 [small]
    - [태그_medium](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=26-44556) `26:44556` 768x929 [medium]
    - [태그_large](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=26-45207) `26:45207` 1024x812 [large (1024~)]
    - [태그_large](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=26-45611) `26:45611` 1560x812 [large (1560~)]
- **성인 태그** (설명 바 `29:47319`)
  - 비로그인 (설명 바 `29:46188`)
    - [성인 태그_비로그인_small](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-46193) `29:46193` 375x812 [small]
    - [성인 태그_비로그인_medium](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-46221) `29:46221` 768x929 [medium]
    - [성인 태그_비로그인_large](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-46237) `29:46237` 1024x812 [large]
  - 성인 인증 X (설명 바 `29:47324`)
    - [성인 태그_성인 인증 X_small](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-47553) `29:47553` 375x812 [small]
    - [성인 태그_성인 인증 X_medium](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-47586) `29:47586` 768x929 [medium]
    - [성인 태그_성인 인증 X_large](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-47618) `29:47618` 1024x812 [large]
  - 성인 인증 O (설명 바 `29:47981`)
    - [성인 태그_성인 인증 O_small](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-47985) `29:47985` 375x812 [small]
    - [성인 태그_성인 인증 O_medium](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-48018) `29:48018` 768x929 [medium]
    - [성인 태그_성인 인증 O_large](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=29-48050) `29:48050` 1024x812 [large]

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/aBcQKIbe9nOsPMNQOagw2v/?node-id=22-26370) `22:26370` · 가이드 `22:27797`

- APP `22:26371` (자식 147개)
  - 프레임: 🌏 TVOD_APP 22:13837, 태그 23:45595, 무료 캐시 22:26617, 소식함 22:26690, 크롬캐스트 23:43728, 나의 왓챠 153:42729, 성인 태그_비로그인 29:53758, 성인 태그_성인 인증 X 29:53791, 성인 태그_성인 인증 O 29:53824, 왓고리즘_토스트 29:54218, 이벤트 29:54339, Player 29:54342, 컬렉션 29:54393, 기타 상세 페이지 29:54402, 왓챠파티 페이지 29:54409, 왓챠파티 바텀시트 29:54509, 콘상페 29:54647, 왓챠파티 플레이어 29:54787, 웹툰 29:54967, 검색 29:55087, 이어보기 상세 페이지 30:45700, 보관함 153:43547
- WEB `22:27800` (자식 106개)
  - 프레임: TVOD_WEB 31:51883, 플레이어 22:28128, 왓챠파티 플레이어 22:28134, 소식함 22:28502, 이벤트 22:28811, 컬렉션 22:28814, 검색 22:28816, 보관함 22:28985, 프로필 22:28987, 일반 태그 31:54168, 왓챠파티 22:29281, 기타 상세 페이지 22:29336, 콘상페 22:29361, 비로그인 22:29551, 성인 태그_비로그인 31:53644, 성인 태그_성인 인증 X 31:53676, 성인 태그_성인 인증 O 31:53708
- 루트 안 섹션 밖 프레임: SVOD 31:46139

## [Core] 검색 ⚜️

- 파일: https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/ (키 `9BOnazPjHfZgssTKl9kEMN`, 형식: new, 최종 수정 2026-06-17)
- 다루는 영역: 검색 전 / 검색 시도 / 검색 결과

### 페이지

- [Cover](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=1-3) `1:3` — master
- [🌊 플로우](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=1-4) `1:4` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 검색](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=37-20332) `37:20332` · 스타일 fill 20,21,23

- 📎 링크 카드: **없음** → 이관 시 추가 대상

#### APP 섹션 `34:6472` (자식 22개 · fill 34,35,38 · 파일 바 ⚫ '검색' `34:6465`)

- **검색 전** (설명 바 `31:2124`)
  - [검색 전](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=20-8039) `20:8039` 375x1466 [small]
  - [검색 전](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=21-10959) `21:10959` 768x1466 [medium]
  - [검색 전](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=24-20014) `24:20014` 1024x1466 [large]
- **검색 시도** (설명 바 `32:5347`)
  - [검색 시도](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=31-2847) `31:2847` 375x1002 [small]
  - [검색 시도](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=31-4174) `31:4174` 768x1147 [medium]
  - [검색 시도](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=31-5072) `31:5072` 1024x1147 [large]
- **검색 시도** (설명 바 `34:6444`)
  - [검색 결과](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=31-3726) `31:3726` 375x1002 [small]
  - [검색 결과](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=34-5367) `34:5367` 768x1147 [medium]
  - [검색 결과](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=34-6010) `34:6010` 1024x1147 [large]

#### WEB 섹션 `37:20313` (자식 15개 · fill 34,35,38 · 파일 바 ⚫ '검색' `37:20308`)

- **검색 전** (설명 바 `36:17490`)
  - [검색 전](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=34-6473) `34:6473` 375x2591 [small]
  - [검색 전](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=36-16017) `36:16017` 768x3140 [medium]
  - [검색 전](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=36-16571) `36:16571` 1024x2089 [large]
- **검색 결과** (설명 바 `36:17510`)
  - [검색 결과](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=36-17514) `36:17514` 375x1501 [small]
  - [검색 결과](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=36-17621) `36:17621` 768x1501 [medium]
  - [검색 결과](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=36-17728) `36:17728` 1024x1128 [large]

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/9BOnazPjHfZgssTKl9kEMN/?node-id=38-54521) `38:54521` · 가이드 `37:20333`

- APP `37:40756` (자식 109개)
  - 프레임: 검색 전 37:20351, 크롬캐스트 37:27561, 장르 필터링 37:28827, 순위 더보기 37:34022, 장르 선택 바텀시트 37:29243, 리스트 상세 페이지 37:21581, 소식함 37:28099, 무료 캐시 37:28282, 나의 왓챠 91:23307, 검색 시도 37:28633, 콘상페 37:33101, 컬렉션 37:34633, 태그 페이지 37:34850, SVOD 37:35279, TVOD 37:35541, 웹툰 37:37364, 검색 결과 38:47493, 보관함 91:21518
- WEB `38:54520` (자식 77개)
  - 프레임: 검색 전 38:44519, 장르 필터링 38:49752, 장르 선택 드랍다운 38:50320, 최근 검색어 삭제 38:48120, 소식함 38:41930, 보관함 38:45226, 프로필 38:45348, 검색 결과 38:47717, 콘상페 38:49393, 기타 상세 페이지 38:53205, 컬렉션 38:54006, 태그 페이지 38:54060

## [Core] 보관함 ⚜️

- 파일: https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/ (키 `vK6m0SufuZSM9mfWTfenyP`, 형식: new, 최종 수정 2026-06-17)
- 다루는 영역: 보관함 메인(콘텐츠/리스트) / 보고싶어요·시청 콘텐츠·다운로드·구매 콘텐츠·선물함·평가하기 상세 / 일반/키즈 프로필 × empty/error state
- 메모: 마스터 화면 수가 가장 많음(APP 105·WEB 72). 대분류(⚫)가 일반 프로필/키즈 프로필/empty state/error case로 갈라지고 그 아래 화면 묶음. 자동 묶음이라 라벨 배치가 어긋난 곳이 있을 수 있음 — 이관 전 실물 확인

### 페이지

- [Cover](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=1-4805) `1:4805` — master
- [🌊 플로우](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=4-27922) `4:27922` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 보관함](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=4-27921) `4:27921` · 스타일 fill 20,21,23

- 📎 링크 카드: **없음** → 이관 시 추가 대상

#### APP 섹션 `3:18892` (자식 105개 · fill 34,35,38)

- 기타 인스턴스: 플로우 화살
- **일반 프로필** (설명 바 `2:17727`)
  - 보관함 메인 (설명 바 `2:1178`)
    - [보관함 메인_콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=1-4806) `1:4806` 375x1004 [small & medium]
    - [보관함 메인_리스트](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-2374) `2:2374` 375x1004 [small & medium]
    - [보관함 메인 - 높이 812px](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-2393) `2:2393` 375x812 [small & medium]
  - 보고싶어요 상세 (설명 바 `2:7653`)
    - [보고싶어요 상세 - 콘텐츠 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-5907) `2:5907` 375x812 [small & medium]
    - [보고싶어요 상세 - 콘텐츠 (스크롤)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-5912) `2:5912` 375x812 [small & medium]
    - [보고싶어요 상세 - 리스트 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-5916) `2:5916` 375x812 [small & medium]
    - [보고싶어요 상세 - 리스트 (스크롤)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-5920) `2:5920` 375x812 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `2:9333`)
    - [시청 콘텐츠 상세 - 최근 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-8161) `2:8161` 375x812 [small & medium]
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-8187) `2:8187` 375x812 [small & medium]
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-8192) `2:8192` 375x812 [small & medium]
  - 다운로드 상세 (설명 바 `2:11643`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-10510) `2:10510` 375x812 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `2:11653`)
    - [구매 콘텐츠 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-10551) `2:10551` 375x812 [small & medium]
  - 선물함 상세 (설명 바 `2:11658`)
    - [선물함 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-10556) `2:10556` 375x812 [small & medium]
  - 평가하기 상세 (설명 바 `2:11663`)
    - [평가하기 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-10563) `2:10563` 375x812 [small & medium]
  - 보관함 메인 (설명 바 `2:17691`)
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-12680) `2:12680` 1024x1073 [large]
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-13006) `2:13006` 1024x1073 [large]
  - 보고싶어요 상세 (설명 바 `2:17701`)
    - [보고싶어요 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-12699) `2:12699` 1024x1073 [large]
    - [보고싶어요 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-13002) `2:13002` 1024x1073 [large]
  - 시청 콘텐츠 상세 (최근 본 콘텐츠) (설명 바 `2:17706`)
    - [구매 콘텐츠 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-12710) `2:12710` 1024x1073 [large]
  - 구매 콘텐츠 상세 (설명 바 `2:17711`)
    - [구매 콘텐츠 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-12704) `2:12704` 1024x1073 [large]
  - 다운로드 상세 (설명 바 `2:17716`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-12717) `2:12717` 1024x1073 [large]
  - 평가하기 (설명 바 `2:17721`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-12980) `2:12980` 1024x1073 [large]
- **empty state** (설명 바 `3:12549`)
  - 보관함 메인 (설명 바 `2:19803`)
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17817) `2:17817` 375x812 [small & medium]
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17836) `2:17836` 375x812 [small & medium]
  - 보고싶어요 상세 (설명 바 `2:19808`)
    - [보고싶어요 상세 - 콘텐츠 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17855) `2:17855` 375x812 [small & medium]
    - [보고싶어요 상세 - 리스트 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17885) `2:17885` 375x812 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `2:19820`)
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17865) `2:17865` 375x812 [small & medium]
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17875) `2:17875` 375x812 [small & medium]
  - 다운로드 상세 (설명 바 `2:19825`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17805) `2:17805` 375x812 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `2:19830`)
    - [구매 콘텐츠 상세 - 전체](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17918) `2:17918` 375x812 [small & medium]
    - [구매 콘텐츠 상세 - 소장](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17928) `2:17928` 375x812 [small & medium]
  - 선물함 상세 (설명 바 `3:12544`)
    - [선물함 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17900) `2:17900` 375x812 [small & medium]
    - [선물함 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17909) `2:17909` 375x812 [small & medium]
- **error case** (설명 바 `3:12554`)
  - 보관함 메인 (설명 바 `2:19803`)
    - [메인 1-1](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17944) `2:17944` 375x812 [small & medium]
  - 보고싶어요 상세 (설명 바 `2:19808`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17962) `2:17962` 375x812 [small & medium]
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=2-17972) `2:17972` 375x812 [small & medium]
- **키즈 프로필** (설명 바 `3:18811`)
  - 보관함 메인 (설명 바 `3:18816`)
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12838) `3:12838` 375x948 [small & medium]
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12857) `3:12857` 375x948 [small & medium]
  - 보고싶어요 상세 (설명 바 `3:18826`)
    - [보고싶어요 상세 - 콘텐츠 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12877) `3:12877` 375x812 [small & medium]
    - [보고싶어요 상세 - 콘텐츠 (스크롤)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12882) `3:12882` 375x812 [small & medium]
    - [보고싶어요 상세 - 리스트 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12886) `3:12886` 375x812 [small & medium]
    - [보고싶어요 상세 - 리스트 (스크롤)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12890) `3:12890` 375x812 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `3:18831`)
    - [시청 콘텐츠 상세 - 최근 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12674) `3:12674` 375x812 [small & medium]
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12700) `3:12700` 375x812 [small & medium]
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12725) `3:12725` 375x812 [small & medium]
  - 다운로드 상세 (설명 바 `3:18836`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12561) `3:12561` 375x812 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `3:18841`)
    - [구매 콘텐츠 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12738) `3:12738` 375x812 [small & medium]
  - 평가하기 상세 (설명 바 `3:18846`)
    - [평가하기 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12743) `3:12743` 375x812
- **empty state** (설명 바 `3:18852`)
  - 보관함 메인 (설명 바 `3:18851`)
    - [보관함 메인 - 키즈 1](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12618) `3:12618` 375x812 [small & medium]
    - [보관함 메인 - 키즈](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12636) `3:12636` 375x812 [small & medium]
  - 보고싶어요 상세 (설명 바 `3:18866`)
    - [보고싶어요 상세 - 콘텐츠 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12655) `3:12655` 375x812 [small & medium]
    - [보고싶어요 상세 - 콘텐츠 (디폴트)](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12665) `3:12665` 375x812 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `3:18871`)
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12705) `3:12705` 375x812 [small & medium]
    - [시청 콘텐츠 상세 - 다 본 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12715) `3:12715` 375x812 [small & medium]
  - 다운로드 상세 (설명 바 `3:18876`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12598) `3:12598` 375x812 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `3:18881`)
    - [구매 콘텐츠 상세 - 전체](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12750) `3:12750` 375x812 [small & medium]
    - [구매 콘텐츠 상세 - 소장](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12759) `3:12759` 375x812 [small & medium]
- **error state** (설명 바 `3:18886`)
  - 보관함 메인 (설명 바 `3:18851`)
    - [메인 1-1](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12773) `3:12773` 375x812 [small & medium]
  - 보고싶어요 상세 (설명 바 `3:18866`)
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12791) `3:12791` 375x812 [small & medium]
    - [다운로드 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-12801) `3:12801` 375x812 [small & medium]

#### WEB 섹션 `4:27920` (자식 72개 · fill 34,35,38)

- **일반 프로필** (설명 바 `3:27742`)
  - 평가하기 (설명 바 `3:27747`)
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19466) `3:19466` 1280x1084 [small & medium]
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19691) `3:19691` 1280x1084 [small & medium]
  - 보고싶어요 상세 (설명 바 `3:27758`)
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19958) `3:19958` 1280x1156 [small & medium]
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-21369) `3:21369` 1280x1156 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `3:27768`)
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20733) `3:20733` 1280x1156 [small & medium]
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20751) `3:20751` 1280x1156 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `3:27778`)
    - [구매 콘텐츠 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-21847) `3:21847` 1280x1156 [small & medium]
  - 선물함 상세 (설명 바 `3:27788`)
    - [선물함 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-21345) `3:21345` 1280x1156 [small & medium]
- **일반 프로필** (설명 바 `4:27801`)
  - 보관함 메인 (설명 바 `4:27800`)
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19880) `3:19880` 1280x800 [small & medium]
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19919) `3:19919` 1280x800 [small & medium]
  - 보관함 상세 (설명 바 `4:27810`)
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20552) `3:20552` 1280x800 [small & medium]
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20693) `3:20693` 1280x800 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `4:27815`)
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20582) `3:20582` 1280x800 [small & medium]
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20713) `3:20713` 1280x800 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `4:27820`)
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20632) `3:20632` 1280x800 [small & medium]
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20672) `3:20672` 1280x800 [small & medium]
  - 선물함 상세 (설명 바 `4:27825`)
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20612) `3:20612` 1280x800
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20652) `3:20652` 1280x800
- **키즈 프로필** (설명 바 `4:27830`)
  - 보관함 메인 (설명 바 `4:27865`)
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19579) `3:19579` 1280x1084 [small & medium]
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19786) `3:19786` 1280x1084 [small & medium]
  - 보고싶어요 상세 (설명 바 `4:27870`)
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20255) `3:20255` 1280x1156 [small & medium]
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-21608) `3:21608` 1280x1156 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `4:27875`)
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20742) `3:20742` 1280x1156 [small & medium]
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-21048) `3:21048` 1280x1156 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `4:27880`)
    - [구매 콘텐츠 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-22050) `3:22050` 1280x1156 [small & medium]
  - 선물함 상세 (설명 바 `4:27885`)
    - [선물함 상세](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-21357) `3:21357` 1280x1156 [small & medium]
- **empty state** (설명 바 `4:27891`)
  - 보관함 메인 (설명 바 `4:27890`)
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19900) `3:19900` 1280x800 [small & medium]
    - [보관함 메인](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-19939) `3:19939` 1280x800 [small & medium]
  - 보관함 상세 (설명 바 `4:27900`)
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20563) `3:20563` 1280x800 [small & medium]
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20573) `3:20573` 1280x800 [small & medium]
    - [보고싶어요](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20703) `3:20703` 1280x800 [small & medium]
  - 시청 콘텐츠 상세 (설명 바 `4:27905`)
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20593) `3:20593` 1280x800 [small & medium]
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20603) `3:20603` 1280x800 [small & medium]
    - [시청 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20723) `3:20723` 1280x800 [small & medium]
  - 구매 콘텐츠 상세 (설명 바 `4:27910`)
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20642) `3:20642` 1280x800 [small & medium]
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20683) `3:20683` 1280x800 [small & medium]
  - 선물함 상세 (설명 바 `4:27915`)
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20622) `3:20622` 1280x800
    - [구매 콘텐츠](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=3-20662) `3:20662` 1280x800

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/vK6m0SufuZSM9mfWTfenyP/?node-id=10-56115) `10:56115` · 가이드 `10:56111`

- APP `10:45166` (자식 111개)
  - 프레임: 보관함 메인_콘텐츠 5:23532, 보고싶어요 상세 - 콘텐츠 (디폴트) 6:24243, 크롬캐스트 6:27016, 소식함 6:29613, 무료 캐시 7:29798, 나의 왓챠 19:44015, 보고싶어요_리스트 7:30372, 콘상페 7:33978, 시청 콘텐츠 상세 - 최근 본 콘텐츠 8:34951, Player 9:36679, 다운로드 상세 10:37038, 구매 콘텐츠 상세 10:37783, 선물함 상세 10:38263, 평가하기 상세 10:38396, TVOD 10:39087, 웹툰 10:39207, 검색 10:39327, SVOD 10:44659
- WEB `10:56110` (자식 71개)
  - 프레임: 보관함 메인 10:45179, 왓챠파티 10:45996, 검색 10:46418, 소식함 10:47351, 프로필 10:50014, 보고싶어요 10:52159, 보관함_리스트 10:52971, 콘상페 10:53470, 시청 콘텐츠 10:53838, 플레이어 10:55479, 선물함 상세 10:55643, 구매 콘텐츠 상세 10:55655

## [Core] 나의 왓챠 ⚜️

- 파일: https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/ (키 `EoBr8OeZ4bCo35laDmO2RK`, 형식: new, 최종 수정 2026-09-02)
- 다루는 영역: 나의 왓챠(구독·비구독·비로그인)
- 메모: 설정 하위 화면(계정·재생·알림 등)은 플로우 페이지에만

### 페이지

- [Cover](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=1-49) `1:49` — master
- [🌊 플로우_26.07 기준](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=1-50) `1:50` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=50-8930) `50:8930` · 스타일 fill 20,21,23

- 📎 링크 카드 [나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=50-9357) `50:9357` → 기준 문서 https://www.figma.com/design/xaccOQpOsdkkBFs1TUoX1I/%EB%82%98%EC%9D%98-%EC%99%93%EC%B1%A0--Mypage-?node-id=0-1 · 기준 정보 기입: 없음

#### APP 섹션 `48:8929` (자식 21개 · fill 34,35,38)

- **구독** (설명 바 `7:8054`)
  - [나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=3-1974) `3:1974` 375x1356 [small]
  - [나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=46-6807) `46:6807` 768x1356 [medium]
  - [나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=46-7201) `46:7201` 1024x1356 [large]
- **비로그인** (설명 바 `7:8042`)
  - [비로그인](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=46-4980) `46:4980` 375x812 [small]
  - [비로그인](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=47-13764) `47:13764` 768x1133 [medium]
  - [비로그인](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=47-13898) `47:13898` 1024x1366 [large]
- **비구독** (설명 바 `7:8049`)
  - [비구독](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=47-20586) `47:20586` 375x1356 [small]
  - [비구독](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=47-20982) `47:20982` 768x1356 [medium]
  - [비구독](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=47-21439) `47:21439` 1024x1356 [large]

#### WEB 섹션 `56:18493` (자식 14개 · fill 34,35,38)

- **구독** (설명 바 `56:18451`)
  - [나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=55-14191) `55:14191` 375x2539 [small]
  - [나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=56-15276) `56:15276` 768x2539 [medium]
  - [나의 왓챠](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=56-15868) `56:15868` 1024x2539 [large]
- **비구독** (설명 바 `56:18475`)
  - [비구독](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=56-16507) `56:16507` 375x2539 [small]
  - [비구독](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=56-16769) `56:16769` 768x2539 [medium]
  - [비구독](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=56-17027) `56:17027` 1024x2539 [large]

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/EoBr8OeZ4bCo35laDmO2RK/?node-id=65-14924) `65:14924` · 가이드 `65:14920`

- APP `61:12404` (자식 93개)
  - 프레임: 나의 왓챠 50:8931, 약관 53:5415, 캐시 데이터 삭제 53:6032, 로그아웃 53:6529, 재생 52:4501, 계정 52:5609, 알림 채널 설정 53:4760, 비디오 다운로드 52:5387, 프로필 수정 50:10198, SVOD 50:12600, 프로필 잠금 50:17585, 구독 정보 50:17802, 공지사항 53:5030, 고객센터 53:5259, 왓챠 캐시 50:18786, 쿠폰 리스트 51:4436
- WEB `65:14919` (자식 133개)
  - 프레임: 나의 왓챠 59:14573, 오프닝 영상 자동 건너뛰기 65:13542, 알림 채널 설정 65:14157, 왓챠파티 59:15855, 검색 59:16373, 보관함 59:17340, 소식함 59:18745, 프로필 59:21351, 프로필 편집 60:23503, 캐시 내역 63:13037, 쿠폰 내역 63:13577, 큐레이터 신청 65:13054, 큐레이터 이용가이드  65:13274, 이메일 변경 63:13828, 비밀번호 변경 63:14841, 공개 범위 설정 63:14948, 화질 설정 65:13402, 탈퇴하기 65:14752, 연령 등급 설정 63:16968, 프로필 잠금 60:23648, 결제 수단 관리 61:12405, 결제 내역 63:12595

## [Core] 프로필 ⚜️

- 파일: https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/ (키 `0b3LD8NXqNWIdDISqU71Js`, 형식: new, 최종 수정 2026-06-12)
- 다루는 영역: 프로필 선택·생성·수정·잠금

### 페이지

- [Cover](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=0-1) `0:1`
- [🌏 마스터 파일](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=3-3) `3:3` — master
- [🌊 플로우](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-4545) `20:4545` — spec(기준 문서)

### 마스터 페이지 구조 — 루트 섹션 [🌏 프로필](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-4544) `20:4544` · 스타일 fill 20,21,23

- 📎 링크 카드 [프로필](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=21-2329) `21:2329` → 기준 문서 https://www.figma.com/design/IVRh1lHWPztW0LqEUyK3xY/%ED%94%84%EB%A1%9C%ED%95%84--Profile-?node-id=0-1 · 기준 정보 기입: 없음

#### APP 섹션 `18:4681` (자식 29개 · fill 34,35,38 · 파일 바 ⚫ '프로필' `15:385`)

- **프로필 선택** (설명 바 `18:3643`)
  - [프로필 선택](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=18-4203) `18:4203` 375x812 [small]
  - [프로필 선택](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=18-4531) `18:4531` 768x1133 [medium]
  - [프로필 선택](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=18-3741) `18:3741` 1024x1366 [large]
- **프로필 생성** (설명 바 `15:386`)
  - [프로필 생성](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=14-1046) `14:1046` 375x812 [small]
  - [프로필 생성](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=16-1522) `16:1522` 768x1133 [medium]
  - [프로필 생성](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=16-5721) `16:5721` 1024x1366 [large]
- **프로필 수정** (설명 바 `16:404`)
  - [프로필 수정](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=16-6012) `16:6012` 375x812 [small]
  - [프로필 수정](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=16-6256) `16:6256` 768x1133 [medium]
  - [프로필 수정](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=16-8558) `16:8558` 1024x1366 [large]
- **잠금 프로필** (설명 바 `17:4635`)
  - [프로필 잠금](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=17-4641) `17:4641` 375x812 [small]
  - [프로필 잠금](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=17-4752) `17:4752` 768x1133 [medium]
  - [프로필 잠금](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=17-5029) `17:5029` 1024x1366 [large]

#### WEB 섹션 `20:4543` (자식 29개 · fill 34,35,38 · 파일 바 ⚫ '프로필' `20:4537`)

- **프로필 선택** (설명 바 `20:1816`)
  - [프로필 선택](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=19-1593) `19:1593` 375x812 [small]
  - [프로필 선택](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-1668) `20:1668` 768x1133 [medium]
  - [프로필 선택](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-1750) `20:1750` 1024x768 [large]
- **프로필 생성** (설명 바 `20:3438`)
  - [프로필 생성](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-3025) `20:3025` 375x720 [small]
  - [프로필 생성](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-3194) `20:3194` 768x1133 [medium]
  - [프로필 생성](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-3316) `20:3316` 1024x768 [large]
- **프로필 수정** (설명 바 `20:3567`)
  - [프로필 수정](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-3571) `20:3571` 375x720 [small]
  - [프로필 수정](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-3588) `20:3588` 768x1133 [medium]
  - [프로필 수정](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-3605) `20:3605` 1024x768 [large]
- **프로필 잠금** (설명 바 `20:4513`)
  - [프로필 잠금](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-4216) `20:4216` 375x720 [small]
  - [프로필 잠금](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-4351) `20:4351` 768x1133 [medium]
  - [프로필 잠금](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-4479) `20:4479` 1024x768 [large]

### 플로우 페이지(기준 문서) — 루트 [🌊 플로우](https://www.figma.com/design/0b3LD8NXqNWIdDISqU71Js/?node-id=20-20445) `20:20445` · 가이드 `20:20441`

- APP `20:20439` (자식 27개)
  - 프레임: 프로필 선택 20:4546, 프로필 편집 20:5326, SVOD 진입 20:11088, 프로필 잠금 20:13973, 프로필 생성 20:14084
- WEB `20:20440` (자식 70개)
  - 프레임: 프로필 선택 20:14209, 프로필 편집 20:20089, 프로필 편집 33:10323, 평가하기 33:13192, SVOD 진입 20:15792, 프로필 잠금 20:20039, 프로필 생성 20:20146, 프로필 33:7743, 나의 왓챠 39:8199, 공지사항 39:11809, 고객센터 39:12389, 로그아웃 39:12444

## 확인 필요 / 색인 밖

- [Core] 스텝메이드 (키 `NO7uetAL9Qmk03IXWSaMej`) — 색인에는 있으나(세션 2) Ken이 2026-09-09 보낸 '모든 Core 파일 링크' 14개에 없음 → 폴더에서 빠졌는지 확인 필요

## 관련 파일 (Core 아님)

- 소식함 (Notification) 프로젝트 문서 — 키 `FbqLL5VeQAgrDAsu9s26PW`, 역할: Core 소식함의 기준 문서. 페이지: Spec `1:10`, Component `138:165254`, 👷🏻DD 검수 사항 `862:77003`, 😍 웹 디디 final `1140:83500`, 이미지 리서치 `150:72819`, appendix `28:48287`, Ref `2:4856`
