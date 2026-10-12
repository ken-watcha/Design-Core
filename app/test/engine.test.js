// 엔진 시험 (Figma·Claude 없이): 분석 코드가 문법상 돌고, 실제 스텝메이드 분석 결과(2026-10-02 use_figma로 받은 것)로 판별이 나오는지
const assert = require('assert');
const { buildAnalyzeCode } = require('../engine/figma-analyze');
const { analyzeProject, buildNewCore, parseFigmaUrl } = require('../engine/core');
const { buildNewCoreCode, planFromAnalysis } = require('../engine/figma-build');
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
  // 새 Core 만들기: 계획 → 코드(문법·크기), 원본 링크 거부, 확인/진행 구분
  const plan = planFromAnalysis(r);
  assert.strictEqual(plan.sourceFileKey, 'NO7uetAL9Qmk03IXWSaMej');
  assert.strictEqual(plan.projectName, '스텝메이드');
  for (const mode of ['pasted', 'duplicate']) for (const dry of [true, false]) {
    const bc = buildNewCoreCode(rules, plan, { dryRun: dry, mode });
    new (Object.getPrototypeOf(async function () {}).constructor)('figma', bc);
    assert(bc.length < 50000, 'use_figma 코드 한도 50KB (' + bc.length + ')');
    assert(bc.includes('const DRY_RUN = ' + dry) && bc.includes('const MODE = "' + mode + '"'));
  }
  assert.throws(() => buildNewCoreCode(rules, plan, { dryRun: true, mode: 'redraw' }));
  // 붙여 넣은 쪽에서 짝을 찾을 수 있게 고른 화면마다 이름·크기가 실려 간다
  const picks = Object.values(plan.platforms).flat().flatMap(e => e.picks).filter(p => p.chosen);
  const sentPlan = JSON.parse(/const PLAN = (.*);/.exec(buildNewCoreCode(rules, plan, { dryRun: true }))[1]);
  const sentPicks = Object.values(sentPlan.platforms).flat().flatMap(e => e.picks).filter(p => p.chosen);
  assert.strictEqual(sentPicks.length, picks.length);
  assert(sentPicks.every(p => p.fp && p.fp.name && p.fp.w && p.fp.h), '화면 이름·크기');
  await assert.rejects(buildNewCore('https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/x', plan, { rules }, { dryRun: true }, async () => assert.fail('원본에 실행하면 안 됨')), /원본/);
  let sent = null;
  const fakeBuild = async (k, c, d) => { sent = { k, c, d }; return { data: { dryRun: true, ok: true, check: { screens: 3, problems: [] } }, costUsd: 0 }; };
  const chk = await buildNewCore('https://www.figma.com/design/DUPDUPDUPDUPDUPDUPDUPD/x', plan, { rules }, { dryRun: true }, fakeBuild);
  assert(chk.ok && sent.k === 'DUPDUPDUPDUPDUPDUPDUPD' && /읽기 전용/.test(sent.d) && sent.c.includes('const DRY_RUN = true') && sent.c.includes('const MODE = "pasted"'), '기본은 붙여 넣기');
  console.log('새 Core 계획:', plan.projectName, '· 코드', buildNewCoreCode(rules, plan, { dryRun: false }).length, 'B');
  console.log('엔진 시험 통과');
})().catch((e) => { console.error(e); process.exit(1); });
