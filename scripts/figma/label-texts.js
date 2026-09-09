// [읽기 전용] 마스터 페이지의 "스크린 설명 컴포넌트" 인스턴스들의 제목 텍스트와 색상 변형을 수집한다.
// 설명 바의 색으로 계층을 알 수 있다: ⚫️ 어두운 회색 = 대분류, ⚪️ 밝은 회색 = 케이스 묶음, 🔵 파랑 = 크기·단계.
// PAGE_ID(마스터 페이지)와 ROOT_ID(루트 섹션)를 바꿔서 use_figma에 붙여넣기.
const PAGE_ID = "1:3";
const ROOT_ID = "256:94581";

const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const root = await figma.getNodeByIdAsync(ROOT_ID);
const out = [];
function scan(sec) {
  for (const n of sec.children) {
    if (n.type === 'INSTANCE' && n.name.includes('스크린 설명')) {
      const t = n.findOne(x => x.type === 'TEXT');
      let variant = null;
      try { variant = Object.fromEntries(Object.entries(n.componentProperties).map(([k, v]) => [k, v.value])); } catch (e) {}
      out.push({ sec: sec.name, id: n.id, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), text: t ? t.characters.slice(0, 120) : null, color: variant ? variant['배경 색상'] : null });
    } else if (n.type === 'SECTION') scan(n);
  }
}
scan(root);
return out;
