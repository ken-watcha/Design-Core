// Figma 안에서 돌릴 "Core 화면의 원본 찾기"·"차이 목록" 코드 (읽기 전용).
//  원본 찾기: Core 화면마다 프로젝트 문서 전체(모든 페이지)에서 같은 폭의 프레임을 훑어 완전히 같은 것(sig)·내용이 같은 것(csig)을 찾는다.
//    → 분석 후보(점수 상위 10장)에 없거나 이름("Guide" 등)으로 점수가 깎인 원본도 놓치지 않는다 (2026-10-12 WEB 768 실수 방지)
//  차이 목록: 두 화면의 하위 요소 이름·글자를 모아 어느 쪽에만 있는지 비교할 재료를 돌려준다
const { SIG_FN } = require('./signature');

const FIND = String.raw`
for (const p of figma.root.children) { try { await p.loadAsync(); } catch (e) {} }
const pathOf = (n) => { const a = []; let s = n.parent; while (s && s.type !== 'DOCUMENT') { a.unshift(s.name); s = s.parent; } return a.join(' > '); };
const widths = [...new Set(TARGETS.map(t => t.w))];
const pool = [];
for (const page of figma.root.children) for (const f of page.findAll(n => n.type === 'FRAME' && widths.some(w => Math.abs(n.width - w) < 0.5))) pool.push(f);
const fp = new Map(); for (const f of pool) fp.set(f.id, sigs(f));
const out = {};
for (const t of TARGETS) {
  const same = pool.filter(f => Math.abs(f.width - t.w) < 0.5);
  // 가까운 순: 요소 수 차이 + 높이 차이 (내용이 같은 후보가 여럿일 때 — 768에서 "Guide"와 "Body: 탭바 적용된 케이스"가 둘 다 내용이 같았다)
  const gap = (f) => Math.abs(fp.get(f.id).n - t.n) + Math.abs(f.height - t.h) / 10;
  const pick = (ok) => same.filter(f => ok(fp.get(f.id))).sort((a, b) => gap(a) - gap(b)).slice(0, 3).map(f => Object.assign({ id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), path: pathOf(f) }, fp.get(f.id)));
  out[t.id] = { exact: pick(s => s.sig === t.sig), content: pick(s => s.csig === t.csig && s.sig !== t.sig) };
}
return { scanned: pool.length, sources: out };
`;

const ITEMS = String.raw`
const out = {};
for (const id of IDS) {
  const root = await figma.getNodeByIdAsync(id); if (!root) { out[id] = null; continue; }
  const items = [];
  const walk = (n, top) => { if (n.visible === false) return; if (!top) { items.push('요소 "' + n.name + '"'); if (n.type === 'TEXT') items.push('글자 "' + n.characters.slice(0, 30) + '"'); } if ('children' in n) for (const c of n.children) walk(c, false); };
  walk(root, true);
  out[id] = items;
}
return { items: out };
`;

const buildFindSourcesCode = (targets) => `const TARGETS = ${JSON.stringify(targets)};\n` + SIG_FN + FIND;
const buildItemsCode = (ids) => `const IDS = ${JSON.stringify(ids)};\n` + ITEMS;

// 두 목록의 차이(중복 개수까지 센다): 한쪽에만 있는 것
function diffItems(a, b, max = 5) {
  const count = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
  const ca = count(a || []), cb = count(b || []);
  const only = (x, y) => { const r = []; for (const [k, v] of x) { const d = v - (y.get(k) || 0); for (let i = 0; i < d; i++) r.push(k); } return r; };
  const oa = only(ca, cb), ob = only(cb, ca);
  return { onlyA: oa.slice(0, max), onlyB: ob.slice(0, max), moreA: Math.max(0, oa.length - max), moreB: Math.max(0, ob.length - max) };
}

module.exports = { buildFindSourcesCode, buildItemsCode, diffItems };
