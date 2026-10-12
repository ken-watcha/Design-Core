// 엔진 시험 (Figma·Claude 없이): 분석 코드가 문법상 돌고, 실제 스텝메이드 분석 결과(2026-10-02 use_figma로 받은 것)로 판별이 나오는지
const assert = require('assert');
const { buildAnalyzeCode } = require('../engine/figma-analyze');
const { analyzeProject, parseFigmaUrl } = require('../engine/core');
const { extractJson } = require('../engine/claude-runner');
const rules = require('../../plugin/rules.json');
const index = require('../../core-index/core-index.json');
const fixture = require('./fixture-stepmade.json');

(async () => {
  const code = buildAnalyzeCode(rules, {});
  new (Object.getPrototypeOf(async function () {}).constructor)('figma', code);
  assert(code.length < 50000, 'use_figma 코드 한도 50KB');
  assert.strictEqual(parseFigmaUrl('https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/x?node-id=1-2'), 'NO7uetAL9Qmk03IXWSaMej');
  assert.strictEqual(parseFigmaUrl('https://www.figma.com/design/AAAAAAAAAAAAAAAAAAAAAA/branch/BBBBBBBBBBBBBBBBBBBBBB/x'), 'BBBBBBBBBBBBBBBBBBBBBB');
  assert.deepStrictEqual(extractJson('결과입니다\n```json\n{"a":1}\n```'), { a: 1 });
  const fake = async (fileKey, c) => { assert(c.includes('const RULES')); return { data: fixture, costUsd: 0 }; };
  const r = await analyzeProject('https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/x', { rules, index, memory: {} }, fake);
  assert.strictEqual(r.analysis.kind, 'project');
  assert(r.verdict, '판별 결과');
  console.log('판별:', r.verdict.suggestion, r.verdict.target, '·', r.verdict.reason);
  // --- v0.2: 작업 위치 · Δ · 쓰기 코드 ---
  const os = require('os'), path = require('path'), fs = require('fs');
  const { checkWorkplace, buildNewCore, applyUpdate } = require('../engine/core');
  const { buildCoreReadCode } = require('../engine/figma-core-read');
  const { buildNewCoreCode, trimNewCoreCode, applyUpdateCode } = require('../engine/figma-write');
  const { checkLink } = require('../engine/place');
  const { mergeIndex } = require('../engine/index-store');
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  for (const c of [buildCoreReadCode(rules), buildNewCoreCode(rules, {}), trimNewCoreCode(rules, {}), applyUpdateCode(rules, {})]) { new AsyncFn('figma', c); assert(c.length < 50000); }

  const coreRead = require('./fixture-core-stepmade.json');
  const analysisSig = require('./fixture-stepmade-sig.json');
  const indexWithCore = mergeIndex(index, null, [{ name: '[Core] 스텝메이드', key: coreRead.fileKey, url: 'u', domain: ['스텝메이드'] }]).index;
  const k = { rules, index: indexWithCore, memory: {} };
  const st = await analyzeProject('https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/x', k, async () => ({ data: JSON.parse(JSON.stringify(analysisSig)), costUsd: 0 }));
  assert.strictEqual(st.verdict.suggestion, 'update', '[Core] 스텝메이드가 색인에 있으면 갱신');
  assert.strictEqual(st.place.kind, 'branch');
  // 링크 검사: 본 파일·다른 파일 브랜치는 거절
  assert(!checkLink(st.place, 'https://www.figma.com/design/' + coreRead.fileKey + '/x').ok, 'Core 본 파일 거절');
  assert(!checkLink(st.place, 'https://www.figma.com/design/AAAAAAAAAAAAAAAAAAAAAA/branch/BBBBBBBBBBBBBBBBBBBBBB/x').ok, '다른 파일 브랜치 거절');
  const branchUrl = 'https://www.figma.com/design/' + coreRead.fileKey + '/branch/BBBBBBBBBBBBBBBBBBBBBB/x';
  const w = await checkWorkplace(st, branchUrl, k, async (key) => { assert.strictEqual(key, 'BBBBBBBBBBBBBBBBBBBBBB'); return { data: coreRead, costUsd: 0 }; });
  assert(w.ok, w.why);
  console.log('Δ:', JSON.stringify(w.delta.summary), '· Core와 같은 후보로 맞춘 칸', w.preferred);
  assert.strictEqual(w.delta.summary.keep, 6, '9/18 Core와 같은 화면 6칸 유지');
  assert.strictEqual(w.delta.summary.replace, 1, 'WEB 768 한 칸만 교체 (Core 화면이 문서에 없음)');
  assert.strictEqual(w.delta.summary.missing, 1, '더보기 팝업 미수록');
  // 반영: 교체 1건만 계획에 들어가는지
  let sent = null;
  await applyUpdate(st, w, k, async (key, code) => { if (/const PLAN/.test(code) && !sent) sent = code; return { data: code.includes('UPDATE') || /applyUpdate|step: 'update'/.test(code) ? { done: [], notFound: [], cardUpdated: false } : coreRead, costUsd: 0 }; });
  assert(/"action":"교체"/.test(sent) && !/"action":"유지"/.test(sent), '반영 계획엔 교체·추가만');
  // 새 Core: 원본 파일·이미 Core인 파일 거절, 만든 뒤 로컬 색인에 추가
  const indexNoCore = Object.assign({}, index, { files: index.files.filter(f => !/스텝메이드/.test(f.name)) });
  const stNew = await analyzeProject('https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/x', { rules, index: indexNoCore, memory: {} }, async () => ({ data: JSON.parse(JSON.stringify(analysisSig)), costUsd: 0 }));
  assert.strictEqual(stNew.place.kind, 'duplicate');
  assert(!checkLink(stNew.place, 'https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/x').ok, '원본 거절');
  const dupUrl = 'https://www.figma.com/design/CCCCCCCCCCCCCCCCCCCCCC/x';
  const bad = await checkWorkplace(stNew, dupUrl, k, async () => ({ data: coreRead, costUsd: 0 }));
  assert(!bad.ok, '이미 마스터가 있는 파일 거절');
  const wn = await checkWorkplace(stNew, dupUrl, k, async () => ({ data: { isCore: false, pages: analysisSig.pages, platforms: {} }, costUsd: 0 }));
  assert(wn.ok, wn.why);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'core-helper-'));
  process.env.HOME = home;
  const store = require('../engine/index-store');
  const calls = [];
  const kk = { rules, index: JSON.parse(JSON.stringify(indexNoCore)), memory: {} };
  const built = await buildNewCore(stNew, wn, kk, async (key, code, desc) => { calls.push(desc); return { data: /깎기/.test(desc) ? { removed: [], detached: 0, pages: [] } : /확인/.test(desc) ? Object.assign({}, coreRead, { fileKey: 'CCCCCCCCCCCCCCCCCCCCCC' }) : { screens: [], rootId: '1:1' }, costUsd: 0 }; });
  assert.deepStrictEqual(calls.length, 3, '만들기 → 깎기 → 확인');
  assert(kk.index.files.some(f => f.key === 'CCCCCCCCCCCCCCCCCCCCCC'), '새 Core를 색인에 추가');
  assert(built.core);
  assert(store.readLocal().some(f => f.key === 'CCCCCCCCCCCCCCCCCCCCCC'), '로컬 추가분 파일에 기록');
  console.log('엔진 시험 통과');
})().catch((e) => { console.error(e); process.exit(1); });
