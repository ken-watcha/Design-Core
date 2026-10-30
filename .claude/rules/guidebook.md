# 가이드북 규칙

2026-10-30 윤우: "항상 업데이트하면서, 가이드북에 업데이트가 필요하다고 판단되면 함께 진행해줘. 불필요하다면 업데이트 없이 하고 필수만!"

- 앱을 고치는 PR마다 가이드북을 고칠지 판단한다. 사용자가 보는 것(표의 표시, 단계, 버튼 글자, 설치·연결 방법)이 바뀌면 같은 턴에 고친다. 내부 동작·규칙만 바뀌면 손대지 않는다. 고칠 때는 필요한 줄만.

2026-10-28 윤우: "가이드북 업데이트할 때 노션 문서도 항상 동일하게 업데이트 해 줘".

- 앱 가이드북은 두 곳에 같은 내용으로 둔다. 하나를 고치면 같은 턴에 다른 하나도 고친다.
  - Claude Doc(원본): https://claude.ai/artifact/PwQNbNU8tyAjBders3n1ZG
  - Notion: https://www.notion.so/3dfa2845fc0f80e7ba31dfda32f03669 ("Core 업데이트 앱 사용법")
- 섹션 번호·제목·본문·그림을 맞춘다. 노션 그림은 `notion-create-file-upload`로 주소를 받아 curl로 올린 뒤 `<image source="file-upload://…" />`로 넣는다(2026-10-28 동작 확인). 원본 그림은 `/mnt/project-files/guidebook-shots/`.
