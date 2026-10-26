// 20KB 한도 시험: 아주 큰 가짜 Core·문서에 앱이 Figma에서 돌리는 읽기 코드를 실제로 돌려, 한 번에 돌려주는 양이 한도 아래인지 본다.
// 2026-10-14 [Core] SVOD (홈)에서 화면 차이 비교가 56KB를 돌려줘 멈춘 일의 재발 방지. 새 읽기 코드를 만들면 여기에 넣는다.
const assert = require('assert');
const rules = require('../../plugin/rules.json');
const { buildCoreReadCode } = require('../engine/figma-core-read');
const { readItemCounts, readItemLabels, findSources } = require('../engine/figma-find');
const { buildAnalyzeCode } = require('../engine/figma-analyze');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const LIMIT = 20480;
const bytes = (o) => Buffer.byteLength(JSON.stringify(o));

// 아주 작은 Figma 노드 흉내
let seq = 0;
function node(type, name, props = {}, children = []) {
  const n = Object.assign({ id: `9:${++seq}`, type, name, visible: true, width: 375, height: 800, x: 0, y: 0, children, absoluteTransform: [[1, 0, 0], [0, 1, 0]] }, props);
  for (const c of children) c.parent = n;
  n.findAll = (f) => { const r = []; const w = (x) => { for (const c of x.children || []) { if (f(c)) r.push(c); w(c); } }; w(n); return r; };
  n.findOne = (f) => n.findAll(f)[0] || null;
  n.loadAsync = async () => {};
  // 컴포넌트 이름은 길고 서로 다르게 (분석이 화면마다 컴포넌트 이름을 돌려주므로)
  if (type === 'INSTANCE') n.getMainComponentAsync = async () => ({ name: 'Variant=' + name, parent: { type: 'COMPONENT_SET', name: `${LONG} 컴포넌트 ${name}` } });
  // 실제 Figma: 지워진 컴포넌트를 가리키는 인스턴스는 기다리기 전에 바로 오류를 낸다 (2026-10-26 윤우 "node ... does not exist")
  if (type === 'INSTANCE' && seq % 97 === 0) n.getMainComponentAsync = () => { throw new Error(`The node with id "${n.id}" does not exist`); };
  return n;
}
const LONG = '피쳐링셀 노출 영역 기본 케이스 설명 문구가 아주 길게 들어간 예시입니다';
// 화면 하나 = 요소 1,500개 (SVOD 화면 수준), 글자는 화면마다 조금씩 다르게
const screen = (i, w) => node('FRAME', `${LONG} ${i}`, { width: w, height: 2000 }, Array.from({ length: 300 }, (_, k) => node('GROUP', `묶음 ${k}`, {}, [
  node('TEXT', `제목 ${k}`, { characters: `${LONG} ${i}-${k}` }), node('RECTANGLE', `배경 ${k}`), node('INSTANCE', `카드 ${k}`), node('FRAME', `틀 ${k}`, {}, [node('TEXT', `부제 ${k}`, { characters: `부제 ${k}` })])])));
const widths = [375, 768, 1024];
const N = 150; // Core 화면 수 (SVOD는 41)
const screens = Array.from({ length: N }, (_, i) => screen(i, widths[i % 3]));
const master = node('PAGE', rules.fileKind.corePageName, {}, [node('SECTION', rules.masterPage.rootPrefix + 'SVOD', {}, [node('SECTION', 'APP', {}, screens)])]);
const core = { root: { children: [node('PAGE', 'Cover'), master] }, fileKey: 'CORE', getNodeByIdAsync: async (id) => byId.get(id) || null };
// 프로젝트 문서: 같은 화면을 페이지 여러 곳에 복사해 둔 경우 (후보가 많아지게)
const docPages = Array.from({ length: 3 }, (_, p) => node('PAGE', `✅ Mobile ${p}`, {}, [node('SECTION', `${LONG} 섹션 ${p}`, {}, screens.slice(0, 40).map((s, i) => screen(i, s.width)))]));
const doc = { root: { children: docPages }, getNodeByIdAsync: async (id) => byId.get(id) || null };
const byId = new Map(); const idx = (n) => { byId.set(n.id, n); (n.children || []).forEach(idx); };
core.root.children.forEach(idx); doc.root.children.forEach(idx);

// 가짜 runner: 실제 코드를 가짜 파일에 돌리고, 돌려준 양이 한도를 넘으면 실제 Figma처럼 실패한다
const runs = [];
const runner = async (key, code, desc) => {
  const figma = key === 'CORE' ? core : doc;
  const data = await new AsyncFn('figma', code)(figma);
  const b = bytes(data); runs.push({ desc, b });
  if (b > LIMIT) throw new Error(`Figma: Return value exceeds the ${LIMIT}-byte limit (${b} bytes) — ${desc}`);
  return { data, costUsd: 0 };
};

(async () => {
  const read = (await runner('CORE', buildCoreReadCode(rules), '작업 위치 확인')).data;
  assert.strictEqual(read.platforms.APP.screens.length, N, 'Core 화면을 모두 읽음');
  const targets = read.platforms.APP.screens.map(s => ({ id: s.id, w: s.w, h: s.h, n: s.n, sig: s.sig, csig: s.csig }));
  const f = await findSources(runner, 'DOC', targets, '원본 찾기');
  assert.strictEqual(Object.keys(f.sources).length, N, '원본 찾기를 화면마다 모두 받음');
  const ids = screens.slice(0, 20).map(s => s.id);
  const a = await readItemCounts(runner, 'CORE', ids, '차이 비교');
  assert.strictEqual(Object.keys(a.counts).length, ids.length, '차이 비교를 화면마다 모두 받음');
  const want = Object.fromEntries(ids.map(id => [id, Object.keys(a.counts[id]).slice(0, 5)]));
  const l = await readItemLabels(runner, 'CORE', want, '차이 이름');
  assert(Object.values(l.labels).every(m => Object.keys(m).length === 5), '차이 이름을 받음');
  // 한 화면만으로도 한 번에 못 담는 경우(서로 다른 요소 3,000개): 나눠 받아 끝까지 센다
  const huge = node('FRAME', '아주 큰 화면', {}, Array.from({ length: 3000 }, (_, k) => node('TEXT', `글자 ${k}`, { characters: `내용 ${k}` })));
  idx(huge); core.root.children[1].children[0].children[0].children.push(huge);
  const before = runs.length;
  const h = await readItemCounts(runner, 'CORE', [huge.id, ids[0]], '차이 비교');
  assert(runs.length - before > 1, '여러 번에 나눠 받음');
  assert.strictEqual(Object.keys(h.counts[huge.id]).length, 6000, '큰 화면의 요소를 빠짐없이 셈 (요소 3,000 + 글자 3,000)');
  assert.deepStrictEqual(h.counts[ids[0]], a.counts[ids[0]], '함께 보낸 화면도 그대로');
  // 프로젝트 분석: 화면마다 컴포넌트 이름(최대 150개)을 함께 돌려준다 (2026-10-26 내용 판별)
  const pdoc = { root: { children: [node('PAGE', 'Cover'), ...['✅ Mobile', '✅ Web'].map(pg => node('PAGE', pg, {}, [['small', 375], ['medium', 768], ['large', 1024], ['large', 1440]].map(([c, w], k) => node('SECTION', c, {}, [0, 1, 2].map(i => screen(k * 10 + i, w))))))] }, fileKey: 'DOC2' };
  const pid = new Map(); const pidx = (n) => { pid.set(n.id, n); (n.children || []).forEach(pidx); }; pdoc.root.children.forEach(pidx);
  pdoc.getNodeByIdAsync = async (id) => pid.get(id) || null;
  const an = await new AsyncFn('figma', buildAnalyzeCode(rules, {}))(pdoc);
  const ab = bytes(an); runs.push({ desc: '분석', b: ab });
  assert(ab <= LIMIT, `분석 결과 ${ab}바이트가 한도 아래`);
  assert.strictEqual(an.kind, 'project');
  assert(an.comps && Object.keys(an.comps.picks).length >= 4, '고른 화면마다 컴포넌트 이름');
  const max = Math.max(...runs.map(r => r.b));
  console.log(`한도 시험 통과 · 호출 ${runs.length}번 · 가장 큰 결과 ${Math.round(max / 1024)}KB`);
})().catch(e => { console.error(e); process.exit(1); });
