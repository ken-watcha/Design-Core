// 화면 "내용 지문": 같은 화면인지 비교하는 짧은 문자열. Figma 안에서 돌 코드 조각(SIG_FN)으로 분석·Core 읽기 양쪽에 붙인다.
// 넣는 것: 화면 크기 · 하위 노드 수 · 글자 · 이미지. 빼는 것: 이름·종류(복제 뒤 이름을 바꾸고, 깎기에서 인스턴스를 분리하므로),
// 하위 노드의 위치·크기(인스턴스 분리 뒤 글자 위치가 1px 어긋나는 일이 있어 — 2026-10-12 스텝메이드 1440에서 확인).
const SIG_FN = String.raw`
function sig(root) {
  let h = 5381, n = 0;
  const add = (s) => { for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; };
  const walk = (node, top) => {
    if (node.visible === false) return;
    n++;
    if (top) add(Math.round(node.width) + 'x' + Math.round(node.height) + ';');
    if (node.type === 'TEXT') add('T' + node.characters + ';');
    if ('fills' in node && Array.isArray(node.fills)) for (const f of node.fills) if (f.type === 'IMAGE' && f.imageHash) add('I' + f.imageHash + ';');
    if ('children' in node) for (const c of node.children) walk(c, false);
  };
  walk(root, true);
  return h.toString(16) + ':' + n;
}
`;

module.exports = { SIG_FN };
