// [읽기 전용] 파일의 페이지 목록(ID·이름)을 반환한다.
// use_figma(fileKey=<Core 파일 키>)에 그대로 붙여넣어 실행. 파일이 열려 있지 않아도 동작.
return { file: figma.root.name, pages: figma.root.children.map(p => ({ id: p.id, name: p.name, children: p.children.length })) };
