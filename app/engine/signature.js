// 화면 "내용 지문": 같은 화면인지 비교하는 짧은 문자열. Figma 안에서 돌 코드 조각(SIG_FN)으로 분석·Core 읽기·원본 찾기에 붙인다.
//  sig  = 화면 크기 · 하위 노드 수 · 글자 · 이미지 → 완전히 같은 화면
//  csig = 글자 · 이미지만 → 내용이 같은 화면 (요소 몇 개가 빠지거나 더해진 것은 "거의 같음"으로 따로 본다)
// 빼는 것: 이름·종류(복제 뒤 이름을 바꾸고, 깎기에서 인스턴스를 분리하므로), 하위 노드의 위치·크기(인스턴스 분리 뒤 글자 위치가 1px 어긋남 — 2026-10-12 1440).
// 교훈(2026-10-12 WEB 768): 지문이 다르다고 "문서에 없음/교체"로 단정하지 않는다. 9/18에 가이드 사각형 1개만 지우고 옮긴 화면이 sig만 달랐다.
const SIG_FN = String.raw`
function sigs(root) {
  let h = 5381, c = 5381, n = 0;
  const add = (s) => { for (let i = 0; i < s.length; i++) { h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; } };
  const addC = (s) => { add(s); for (let i = 0; i < s.length; i++) c = ((c * 33) ^ s.charCodeAt(i)) >>> 0; };
  const walk = (node, top) => {
    if (node.visible === false) return;
    n++;
    if (top) add(Math.round(node.width) + 'x' + Math.round(node.height) + ';');
    if (node.type === 'TEXT') addC('T' + node.characters + ';');
    if ('fills' in node && Array.isArray(node.fills)) for (const f of node.fills) if (f.type === 'IMAGE' && f.imageHash) addC('I' + f.imageHash + ';');
    if ('children' in node) for (const ch of node.children) walk(ch, false);
  };
  walk(root, true);
  return { sig: h.toString(16) + ':' + n, csig: c.toString(16), n };
}
function sig(root) { return sigs(root).sig; }
`;

module.exports = { SIG_FN };
