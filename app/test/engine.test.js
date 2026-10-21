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
  const { buildNewCoreCode, trimNewCoreCode, applyUpdateCode, gatherPasteCode } = require('../engine/figma-write');
  const { checkLink } = require('../engine/place');
  const { mergeIndex } = require('../engine/index-store');
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  for (const c of [buildCoreReadCode(rules), buildNewCoreCode(rules, {}), trimNewCoreCode(rules, {}), applyUpdateCode(rules, {})]) { new AsyncFn('figma', c); assert(c.length < 50000); }
  // 붙여 넣을 화면 모으기 (2026-10-14): 프로젝트 문서 브랜치 안에서만, 바꿀 화면을 새 페이지의 한 섹션으로 복제
  {
    const { checkGatherLink, gatherForPaste } = require('../engine/core');
    const st0 = { fileKey: 'SRCSRCSRCSRCSRCSRCSRC1', place: { coreKey: 'CORECORECORECORECORE12' } };
    assert(!checkGatherLink(st0, 'https://www.figma.com/design/SRCSRCSRCSRCSRCSRCSRC1/x').ok, '원본 프로젝트 문서 거절');
    assert(!checkGatherLink(st0, 'https://www.figma.com/design/CORECORECORECORECORE12/x').ok, 'Core 파일 거절');
    assert(!checkGatherLink(st0, 'https://www.figma.com/design/OTHEROTHEROTHEROTHER12/branch/BRBRBRBRBRBRBRBRBRBRBR/x').ok, '다른 파일의 브랜치 거절');
    assert.strictEqual(checkGatherLink(st0, 'https://www.figma.com/design/SRCSRCSRCSRCSRCSRCSRC1/branch/BRBRBRBRBRBRBRBRBRBRBR/x').key, 'BRBRBRBRBRBRBRBRBRBRBR');
    assert(!checkGatherLink(st0, 'https://www.figma.com/design/COREBRANCHCOREBRANCH12/test?node-id=0-1', { workKey: 'COREBRANCHCOREBRANCH12' }).ok, 'Core 브랜치 링크 거절 (2026-10-21)');
    let made = null;
    const fr = (id, w) => ({ id, type: 'FRAME', name: 'f' + id, width: w, height: 800, clone() { return Object.assign({}, this, { id: id + 'c' }); } });
    const nodes = { '1:1': fr('1:1', 375), '1:2': fr('1:2', 768) };
    const fakeFigma = (fileKey) => ({ fileKey, root: { children: [] }, getNodeByIdAsync: async (id) => nodes[id] || null,
      createPage() { const p = { id: '9:1', name: '', children: [], appendChild(c) { this.children.push(c); } }; this.root.children.push(p); return p; },
      createSection() { made = { id: '9:2', name: '', children: [], appendChild(c) { this.children.push(c); }, resizeWithoutConstraints() {} }; return made; } });
    const wk = { delta: { rows: [{ action: '교체', platform: 'APP', cls: 'small', width: 375, source: { id: '1:1' } }, { action: '추가', platform: 'APP', cls: 'medium', width: 768, source: { id: '1:2' } }, { action: '추가', platform: 'WEB', cls: 'large', width: 1440, source: { id: '7:7' } }, { action: '유지', source: { id: '1:3' } }] } };
    const g = await gatherForPaste(st0, wk, 'https://www.figma.com/design/SRCSRCSRCSRCSRCSRCSRC1/branch/BRBRBRBRBRBRBRBRBRBRBR/x', async (key, code) => ({ data: await new AsyncFn('figma', code)(fakeFigma(key)), costUsd: 0 }));
    assert(g.ok && g.count === 2 && made.children.length === 2, '바꿀 화면만 모음 (유지 칸 제외)');
    assert.deepStrictEqual(g.missing, ['WEB large 1440px'], '못 찾은 화면을 알려 줌');
    await assert.rejects(new AsyncFn('figma', gatherPasteCode({ sourceKey: 'S', coreKey: 'C', screens: [] }))(fakeFigma('S')), /원본/, 'Figma 쪽에서도 원본 파일이면 멈춤');
  }

  const coreRead = require('./fixture-core-stepmade.json');
  const analysisSig = require('./fixture-stepmade-sig.json');
  const indexWithCore = mergeIndex(index, null, [{ name: '[Core] 스텝메이드', key: 'txuuBtHiDgal8pC4OIbSHF', url: 'u', domain: ['스텝메이드'] }]).index;
  const k = { rules, index: indexWithCore, memory: {} };
  const st = await analyzeProject('https://www.figma.com/design/NO7uetAL9Qmk03IXWSaMej/x', k, async () => ({ data: JSON.parse(JSON.stringify(analysisSig)), costUsd: 0 }));
  assert.strictEqual(st.verdict.suggestion, 'update', '[Core] 스텝메이드가 색인에 있으면 갱신');
  assert.strictEqual(st.place.kind, 'branch');
  // 링크 검사: 본 파일·다른 파일 브랜치는 거절
  assert(!checkLink(st.place, 'https://www.figma.com/design/txuuBtHiDgal8pC4OIbSHF/x').ok, 'Core 본 파일 거절');
  assert(!checkLink(st.place, 'https://www.figma.com/design/AAAAAAAAAAAAAAAAAAAAAA/branch/BBBBBBBBBBBBBBBBBBBBBB/x').ok, '다른 파일 브랜치 거절');
  const branchUrl = 'https://www.figma.com/design/txuuBtHiDgal8pC4OIbSHF/branch/BBBBBBBBBBBBBBBBBBBBBB/x';
  const find768 = require('./fixture-find-768.json');
  // 원본 찾기·차이 비교 호출은 설명으로 구분해 고정 자료를 돌려준다
  const fakeBranch = async (key, code, desc) => {
    if (/원본 찾기/.test(desc)) return { data: { sources: find768 }, costUsd: 0 };
    // 차이 비교·이름은 실제 코드를 작은 가짜 화면에 돌린다: 프로젝트 쪽에만 "가이드" 사각형이 하나 더 있다
    if (/차이 (비교|이름)/.test(desc)) {
      const kids = [{ name: 'a' }, { name: 'b', type: 'TEXT', characters: '안녕' }].concat(key === st.fileKey ? [{ name: '가이드' }] : []);
      const figma = { getNodeByIdAsync: async (id) => ({ id, name: 'screen', children: kids }) };
      return { data: await new AsyncFn('figma', code)(figma), costUsd: 0 };
    }
    return { data: coreRead, costUsd: 0 };
  };
  const w = await checkWorkplace(st, branchUrl, k, fakeBranch);
  assert(w.ok, w.why);
  console.log('Δ:', JSON.stringify(w.delta.summary));
  // 2026-10-12 실수 재발 방지: Core의 WEB 768은 문서 후보 상위에 없지만 문서 전체에서 내용이 같은 원본을 찾아 "유지(거의 같음)"여야 한다
  assert.strictEqual(w.delta.summary.replace, 0, '지문이 다르다고 교체로 단정하지 않음');
  assert.strictEqual(w.delta.summary.keep, 7);
  assert.strictEqual(w.delta.summary.near, 1, 'WEB 768 = 거의 같음 (확인 필요)');
  const r768 = w.delta.rows.find(r => r.platform === 'WEB' && r.width === 768);
  assert(r768.check && /높이/.test(r768.why) && r768.diff, '거의 같음은 다른 점을 적는다');
  assert.deepStrictEqual(r768.diff.onlyA, ['요소 "가이드"'], '원본에만 있는 요소를 이름으로 적는다');
  assert.deepStrictEqual(r768.diff.onlyB, [], 'Core에만 있는 요소 없음');
  // 20KB 한도: 한 번에 못 담은 화면(rest)은 다시 불러 모두 받는다 (2026-10-14 SVOD (홈) 56KB)
  const { readItemCounts } = require('../engine/figma-find');
  let nCalls = 0;
  const rcs = await readItemCounts(async (key, code) => { nCalls++; const ids = JSON.parse(/const IDS = (.*);/.exec(code)[1]); return { data: { counts: { [ids[0]]: 'x' }, rest: ids.slice(1) }, costUsd: 0 }; }, 'K', ['1:1', '1:2', '1:3'], '차이 비교');
  assert.strictEqual(nCalls, 3); assert.deepStrictEqual(Object.keys(rcs.counts), ['1:1', '1:2', '1:3']);
  assert.strictEqual(w.delta.summary.missing, 1, '더보기 팝업 미수록');
  // 브랜치 링크 두 번째 모양(…/design/<브랜치 키>/<이름>)도 받는다. Core 본 파일 키는 거절
  assert(checkLink(st.place, 'https://www.figma.com/design/oQwfxim46wbwy2zvx65OLB/Core-x').ok, '브랜치 키 모양 링크');
  // 교체가 있을 때 반영 계획엔 교체·추가만 들어가는지 (WEB 768을 사람이 다른 화면으로 고른 경우)
  const st2 = JSON.parse(JSON.stringify(st));
  const p768 = st2.analysis.platforms.WEB.find(e => e.cls === 'medium').picks.find(p => p.width === 768);
  p768.chosen = p768.candidates.find(c => /일반 케이스/.test(c.name)).id; p768.touched = true;
  const w2 = await checkWorkplace(st2, branchUrl, k, fakeBranch);
  assert.strictEqual(w2.delta.summary.replace, 1, '사람이 고른 칸은 그대로 두고 교체');
  // 반영: 교체 1건만 계획에 들어가는지
  let sent = null;
  await applyUpdate(st2, w2, k, async (key, code) => { if (/const PLAN/.test(code) && !sent) sent = code; return { data: code.includes('UPDATE') || /applyUpdate|step: 'update'/.test(code) ? { done: [], notFound: [], cardUpdated: false } : coreRead, costUsd: 0 }; });
  assert(/"action":"교체"/.test(sent) && !/"action":"유지"/.test(sent), '반영 계획엔 교체·추가만');
  assert(sent.includes('"sourceUrl":"' + st2.sourceUrl + '"'), '반영 계획에 프로젝트 문서 링크(링크 카드용)');
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
  // 만들기 뒤 정리에서 멈춘 복사본(마스터 + 작업 페이지)은 이어서 정리
  const half = await checkWorkplace(stNew, dupUrl, k, async () => ({ data: Object.assign({}, coreRead, { pages: coreRead.pages.concat(analysisSig.pages) }), costUsd: 0 }));
  assert(half.ok && half.resume, '반쯤 만든 복사본은 이어서 정리');
  const rc = [];
  await buildNewCore(stNew, half, { rules, index: { files: [] }, memory: {} }, async (key, code, desc) => { rc.push(desc); return { data: /깎기/.test(desc) ? { removed: [], detached: 0, pages: [] } : Object.assign({}, coreRead, { fileKey: 'DDDDDDDDDDDDDDDDDDDDDD' }), costUsd: 0 }; });
  assert(!rc.some(d => /마스터 만들기/.test(d)) && rc.some(d => /깎기/.test(d)), '이어서 정리는 만들기를 건너뜀');
  const calls = [];
  const kk = { rules, index: JSON.parse(JSON.stringify(indexNoCore)), memory: {} };
  const built = await buildNewCore(stNew, wn, kk, async (key, code, desc) => { calls.push(desc); return { data: /깎기/.test(desc) ? { removed: [], detached: 0, pages: [] } : /확인/.test(desc) ? Object.assign({}, coreRead, { fileKey: 'CCCCCCCCCCCCCCCCCCCCCC' }) : { screens: [], rootId: '1:1' }, costUsd: 0 }; });
  assert.deepStrictEqual(calls.length, 3, '만들기 → 깎기 → 확인');
  assert(kk.index.files.some(f => f.key === 'CCCCCCCCCCCCCCCCCCCCCC'), '새 Core를 색인에 추가');
  assert(built.core);
  assert(store.readLocal().some(f => f.key === 'CCCCCCCCCCCCCCCCCCCCCC'), '로컬 추가분 파일에 기록');
  assert.strictEqual(store.removeLocal(['CCCCCCCCCCCCCCCCCCCCCC']), 1);
  assert(!store.readLocal().some(f => f.key === 'CCCCCCCCCCCCCCCCCCCCCC'), '지운 Core는 로컬 추가분에서 빠짐');
  // 대표 화면(크기 칸 바 없음)은 교체 대상이 아니고, 그대로 칸에 이유를 적는다 (2026-10-21 SVOD 🌏 SVOD_APP)
  {
    const { computeDelta } = require('../engine/delta');
    const an = { platforms: { APP: [{ cls: 'small', desc: '', picks: [{ width: 375, chosen: 'P1', candidates: [{ id: 'P1', name: 'p', w: 375, h: 812, sig: 'new' }] }] }] } };
    const co = { platforms: { APP: { screens: [{ id: 'REP', name: '🌏 SVOD_APP', w: 375, h: 4816, cls: 'small', bar: null, sig: 'a' }, { id: 'S1', name: '로그인/구독_small', w: 375, h: 812, cls: 'small', bar: 'B1', sig: 'b' }] } } };
    const dd = computeDelta(an, co, {});
    assert.strictEqual(dd.rows.find(r => r.action === '교체').target.id, 'S1', '크기 칸 화면을 먼저 교체');
    const rep = dd.rows.find(r => r.target && r.target.id === 'REP');
    assert(rep.action === '그대로' && /대표 화면/.test(rep.why) && rep.check, '대표 화면은 그대로 + 확인 필요');
  }
  // 길이가 다르면 교체하지 않고 그대로 + 확인 필요 (2026-10-21 윤우)
  {
    const { computeDelta } = require('../engine/delta');
    const an = { platforms: { APP: [{ cls: 'small', desc: '', picks: [{ width: 375, chosen: 'P1', candidates: [{ id: 'P1', name: 'p', w: 375, h: 812, sig: 'new' }] }] }] } };
    const co = { platforms: { APP: { screens: [{ id: 'S1', name: '로그인/구독_small', w: 375, h: 4816, cls: 'small', bar: 'B1', sig: 'b' }] } } };
    const r1 = computeDelta(an, co, {}).rows[0];
    assert(r1.action === '그대로' && r1.check && r1.source && /길이가 달라/.test(r1.why), '길이가 다르면 바꾸지 않음');
  }
  console.log('엔진 시험 통과');
})().catch((e) => { console.error(e); process.exit(1); });
