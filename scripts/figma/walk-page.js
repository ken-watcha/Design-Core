// [읽기 전용] 한 페이지의 섹션/프레임 골격을 깊이 제한으로 나열한다.
// PAGE_ID를 바꿔서 use_figma에 붙여넣기. 섹션 아래로만 내려가고, 화면 프레임 내부는 열지 않는다.
// 결과 rows: d(깊이) id t(타입 첫 글자: S=섹션 F=프레임 I=인스턴스 G=그룹) name w h x y c(자식 수)
const PAGE_ID = "1:3";      // ← 대상 페이지 ID
const MAXD = 3;             // 최대 깊이 (플로우 페이지처럼 큰 페이지는 2)
const LIMIT = 500;          // 최대 행 수
const MIN_W = 0;            // 이 폭 미만 프레임은 생략 (라벨·화살표 걸러내려면 300)

const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const out = [];
function walk(n, d) {
  if (d > MAXD || out.length >= LIMIT) return;
  const keep = ['SECTION','FRAME','INSTANCE','COMPONENT','COMPONENT_SET','GROUP'].includes(n.type) && (n.type === 'SECTION' || n.width >= MIN_W);
  const rec = { d, id: n.id, t: n.type[0], name: n.name, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x), y: Math.round(n.y) };
  if ('children' in n) rec.c = n.children.length;
  if (keep) out.push(rec);
  if ('children' in n && n.type === 'SECTION') for (const ch of n.children) walk(ch, d + 1);
}
for (const ch of page.children) walk(ch, 1);
return { page: page.name, id: page.id, top: page.children.length, listed: out.length, rows: out };
