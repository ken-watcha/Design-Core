# 네트워크 규칙 (Design-Core 환경)

- 이 저장소용 클라우드 환경 "Design-Core"는 네트워크 액세스 **사용자 지정(Custom)**이다. 허용 목록: `api.figma.com`, `www.figma.com` + 기본 패키지 저장소.
- 어떤 주소가 막혀서(프록시 403 `connect_rejected`) 작업이 안 되면 **우회하지 말고** Ken에게 "이 도메인을 허용 목록에 추가해 주세요"라고 도메인 이름을 정확히 적어 요청한다. 왜 필요한지 한 줄 덧붙인다.
- 추가는 Ken이 claude.ai/code 환경 선택기(구름 아이콘) → Design-Core 톱니 → 허용된 도메인에서 하고, **새 세션부터** 적용된다.
- Figma 토큰 권한: `file_content:read` + `projects:read` 둘 다 필요 (폴더 목록은 projects:read). 403이 나면 권한부터 의심한다.
- Figma 토큰은 채팅에 절대 붙이지 않는다. 환경의 API 자격 증명(`api.figma.com`, 헤더 `X-Figma-Token`, 접두어 없음) 또는 환경 변수 `FIGMA_TOKEN`으로만 받는다.
