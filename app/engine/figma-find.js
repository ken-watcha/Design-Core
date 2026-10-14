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
const bytes = (o) => { const j = JSON.stringify(o); let b = 0; for (let i = 0; i < j.length; i++) { const c = j.charCodeAt(i); b += c < 0x80 ? 1 : c < 0x800 ? 2 : 3; } return b; };
const out = {}, rest = []; let size = 0;
for (const t of TARGETS) {
  if (size > 14000) { rest.push(t.id); continue; }
  const same = pool.filter(f => Math.abs(f.width - t.w) < 0.5);
  // 가까운 순: 요소 수 차이 + 높이 차이 (내용이 같은 후보가 여럿일 때 — 768에서 "Guide"와 "Body: 탭바 적용된 케이스"가 둘 다 내용이 같았다)
  const gap = (f) => Math.abs(fp.get(f.id).n - t.n) + Math.abs(f.height - t.h) / 10;
  const pick = (ok) => same.filter(f => ok(fp.get(f.id))).sort((a, b) => gap(a) - gap(b)).slice(0, 3).map(f => Object.assign({ id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), path: pathOf(f) }, fp.get(f.id)));
  const r = { exact: pick(s => s.sig === t.sig), content: pick(s => s.csig === t.csig && s.sig !== t.sig) };
  const len = bytes(r);
  if (size && size + len > 14000) { rest.push(t.id); continue; }
  size += len; out[t.id] = r;
}
return { scanned: pool.length, sources: out, rest };
`;

// 큰 Core 화면은 요소가 1,000개가 넘어 목록을 그대로 돌려주면 20KB 한도를 넘는다 (2026-10-14 SVOD (홈) 56KB).
// 그래서 1) 요소마다 짧은 해시와 개수만 받아 앱에서 차이를 세고, 2) 차이 나는 해시의 이름·글자만 다시 받는다.
// 한 번에 다 못 담으면 남은 화면(rest)을 돌려주고 앱이 다시 부른다.
const ITEM_FN = String.raw`
const H = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const itemsOf = (root) => { const items = []; const walk = (n, top) => { if (n.visible === false) return; if (!top) { items.push('요소 "' + n.name + '"'); if (n.type === 'TEXT') items.push('글자 "' + n.characters.slice(0, 30) + '"'); } if ('children' in n) for (const c of n.children) walk(c, false); }; walk(root, true); return items; };
`;

const ITEMS = String.raw`
const out = {}, rest = []; let size = 0;
for (const id of IDS) {
  if (size > 14000) { rest.push(id); continue; }
  const root = await figma.getNodeByIdAsync(id); if (!root) { out[id] = null; continue; }
  const m = {}; for (const it of itemsOf(root)) { const k = H(it); m[k] = (m[k] || 0) + 1; }
  // "해시,해시*개수,…" 한 줄로 줄인다. 한 화면만으로도 너무 크면 "!"(다 세지 못함)
  let line = Object.keys(m).map(k => m[k] > 1 ? k + '*' + m[k] : k).join(',');
  if (line.length > 16000) line = '!';
  if (size && size + line.length > 14000) { rest.push(id); continue; }
  size += line.length; out[id] = line;
}
return { counts: out, rest };
`;

const LABELS = String.raw`
const out = {};
for (const id of Object.keys(WANT)) {
  const root = await figma.getNodeByIdAsync(id); if (!root) continue;
  const want = new Set(WANT[id]); out[id] = {};
  for (const it of itemsOf(root)) { const k = H(it); if (want.has(k) && !out[id][k]) out[id][k] = it; }
}
return { labels: out };
`;

const buildFindSourcesCode = (targets) => `const TARGETS = ${JSON.stringify(targets)};\n` + SIG_FN + FIND;
const buildItemsCode = (ids) => `const IDS = ${JSON.stringify(ids)};\n` + ITEM_FN + ITEMS;
const buildLabelsCode = (want) => `const WANT = ${JSON.stringify(want)};\n` + ITEM_FN + LABELS;

// "해시,해시*개수" 한 줄 → {해시: 개수}. "!"는 너무 커서 다 세지 못한 화면
function parseCounts(line) {
  if (line === '!') return null;
  const m = {}; for (const t of String(line || '').split(',')) { if (!t) continue; const [k, c] = t.split('*'); m[k] = Number(c || 1); }
  return m;
}

// 두 개수표({해시: 개수})의 차이: 한쪽에만 있는 해시 (중복 개수까지 센다)
function diffCounts(a, b, max = 5) {
  if (a === null || b === null) return { partial: true, onlyA: [], onlyB: [], moreA: 0, moreB: 0 };
  const only = (x, y) => { const r = []; for (const k of Object.keys(x || {})) { const d = x[k] - ((y || {})[k] || 0); for (let i = 0; i < d; i++) r.push(k); } return r; };
  const oa = only(a, b), ob = only(b, a);
  return { onlyA: oa.slice(0, max), onlyB: ob.slice(0, max), moreA: Math.max(0, oa.length - max), moreB: Math.max(0, ob.length - max) };
}

// use_figma 결과는 20KB까지다. 한 번에 다 못 담으면 Figma 쪽 코드가 남은 것(rest: id 목록)을 돌려주고, 여기서 남은 것만 다시 부른다.
async function readInParts(runner, key, list, build, field, label, idOf = (x) => x) {
  const got = {}; let todo = list, cost = 0;
  while (todo.length) {
    const r = await runner(key, build(todo), label);
    Object.assign(got, r.data[field] || {}); cost += r.costUsd || 0;
    const rest = new Set(r.data.rest || []);
    if (!rest.size || rest.size >= todo.length) break;
    todo = todo.filter(x => rest.has(idOf(x)));
  }
  return { got, cost };
}

// 화면들의 요소 개수표
async function readItemCounts(runner, key, ids, label) {
  const { got, cost } = await readInParts(runner, key, ids, buildItemsCode, 'counts', label);
  const counts = {}; for (const id of Object.keys(got)) counts[id] = got[id] === null ? undefined : parseCounts(got[id]);
  return { counts, cost };
}

// Core 화면들의 원본 찾기 (문서 전체에서)
async function findSources(runner, key, targets, label) {
  const { got, cost } = await readInParts(runner, key, targets, buildFindSourcesCode, 'sources', label, (t) => t.id);
  return { sources: got, cost };
}

// 차이 나는 해시만 이름·글자로 바꾼다
async function readItemLabels(runner, key, want, label) {
  if (!Object.keys(want).length) return { labels: {}, cost: 0 };
  const r = await runner(key, buildLabelsCode(want), label);
  return { labels: r.data.labels || {}, cost: r.costUsd || 0 };
}

module.exports = { buildFindSourcesCode, buildItemsCode, buildLabelsCode, diffCounts, readItemCounts, readItemLabels, findSources };
