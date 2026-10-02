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
  console.log('엔진 시험 통과');
})().catch((e) => { console.error(e); process.exit(1); });
