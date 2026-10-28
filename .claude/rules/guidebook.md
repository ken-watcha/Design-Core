# 가이드북 규칙

2026-10-28 윤우: "가이드북 업데이트할 때 노션 문서도 항상 동일하게 업데이트 해 줘".

- 앱 가이드북은 두 곳에 같은 내용으로 둔다. 하나를 고치면 같은 턴에 다른 하나도 고친다.
  - Claude Doc(원본): https://claude.ai/artifact/PwQNbNU8tyAjBders3n1ZG
  - Notion: https://www.notion.so/3dfa2845fc0f80e7ba31dfda32f03669 ("Core 업데이트 앱 사용법")
- 섹션 번호·제목·본문·그림을 맞춘다. 노션 그림은 `notion-create-file-upload`로 주소를 받아 curl로 올린 뒤 `<image source="file-upload://…" />`로 넣는다(2026-10-28 동작 확인). 원본 그림은 `/mnt/project-files/guidebook-shots/`.
