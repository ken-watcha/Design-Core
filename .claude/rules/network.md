# 네트워크 규칙 (Design-Core 환경)

- 이 저장소용 클라우드 환경 "Design-Core"는 네트워크 액세스 **사용자 지정(Custom)**이다. 허용 목록: `api.figma.com`, `www.figma.com`, `mcp.figma.com`(2026-09-10 추가) + 기본 패키지 저장소.
- 어떤 주소가 막혀서(프록시 403 `connect_rejected`) 작업이 안 되면 **우회하지 말고** Ken에게 "이 도메인을 허용 목록에 추가해 주세요"라고 도메인 이름을 정확히 적어 요청한다. 왜 필요한지 한 줄 덧붙인다.
- 추가는 Ken이 claude.ai/code 환경 선택기(구름 아이콘) → Design-Core 톱니 → 허용된 도메인에서 하고, **새 세션부터** 적용된다.
- Figma 토큰은 채팅에 절대 붙이지 않는다. 환경의 API 자격 증명(`api.figma.com`, 헤더 `X-Figma-Token`, 접두어 없음) 또는 환경 변수 `FIGMA_TOKEN`으로만 받는다.
- 403이 나면 프록시 거부(`X-Proxy-Error`/`connect_rejected`)와 Figma 거부(응답 본문에 `Invalid scope`)를 구분해서 보고한다. 2026-09-09 확인: 현재 토큰은 파일 읽기(`file_content:read`)는 되고 폴더 조회(`projects:read`)만 없음. ~~폴더 조회가 필요하면 Ken에게 `projects:read` 범위 추가를 요청한다~~ → **2026-09-10 Ken 확인: Ken에게 그 범위를 줄 권한이 없어 불가.** 폴더 조회는 설계에서 뺀다. 다시 요청하지 말 것.
- **2026-09-10 확인 → 같은 날 해결**: Figma 연결의 이미지 올리기(`upload_assets`) 주소는 `mcp.figma.com`이라 처음엔 프록시 `connect_rejected` 403. Ken이 허용 목록에 추가(세션 5부터 적용) → 올리기 200 확인. 허용 목록은 이제 `api.figma.com`·`www.figma.com`·`mcp.figma.com` + 기본 패키지 저장소.
