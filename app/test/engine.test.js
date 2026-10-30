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
  // 내용 판별 (2026-10-26 윤우: 피쳐링셀은 SVOD·TVOD 둘 다) — 시안 화면의 컴포넌트가 들어 있는 Core가 여럿이면 모두, 없으면 새 Core
  {
    const { judge, compHash } = require('../engine/judge');
    const names = ['TopBar', 'Button', 'Featuring Cell', 'Featuring Cell/Title', 'Row', 'Cell', 'Webtoon Cell', 'Player'];
    const scr = (id, ns) => ({ id, name: '화면 ' + id, w: 375, h: 812, c: ns.map(n => names.indexOf(n)) });
    const ix = { component_names: names, files: [
      { name: '[Core] SVOD (홈)', key: 'S', url: 's', domain: ['피쳐링셀'], screen_components: [scr('s1', ['TopBar', 'Button', 'Featuring Cell', 'Featuring Cell/Title', 'Row', 'Cell'])] },
      { name: '[Core] TVOD', key: 'T', url: 't', screen_components: [scr('t1', ['TopBar', 'Button', 'Featuring Cell', 'Featuring Cell/Title', 'Row'])] },
      { name: '[Core] 웹툰', key: 'W', url: 'w', screen_components: [scr('w1', ['TopBar', 'Button', 'Row', 'Webtoon Cell'])] },
      { name: '[Core] 플레이어', key: 'P', url: 'p', screen_components: [scr('p1', ['TopBar', 'Player'])] }] };
    const an = (picks) => ({ cover: { nameEN: 'Featuring Cell', nameKR: '피쳐링셀 개선' }, fileName: '피쳐링셀', fileKey: 'X', comps: { names: ['TopBar', 'Featuring Cell', 'Featuring Cell/Title', 'Button', '새 컴포넌트', 'Player'].map(compHash), picks } });
    const v1 = judge(an({ a: [0, 1, 2, 3] }), ix, rules, {});
    assert.strictEqual(v1.suggestion, 'update');
    assert.deepStrictEqual(v1.targets.map(t => t.name), ['[Core] SVOD (홈)', '[Core] TVOD'], '피쳐링셀이 든 Core 둘 다 갱신 (이름은 SVOD만 가리켜도), 피쳐링셀 없는 웹툰은 빠짐');
    assert(/화면 s1/.test(v1.targets[0].why), '근거로 Core 화면 이름을 댐');
    const v2 = judge(an({ a: [0, 4, 3, 5] }), ix, rules, {});
    assert.strictEqual(v2.suggestion, 'new', '어느 Core에도 없는 컴포넌트가 중심이면 새 Core (이름이 SVOD 주제와 같아도)');
    const r2 = await analyzeProject('https://www.figma.com/design/XXXXXXXXXXXXXXXXXXXXXX/x', { rules, index: ix, memory: {} }, async () => ({ data: Object.assign(JSON.parse(JSON.stringify(fixture)), { comps: an({ a: [0, 1, 2, 3] }).comps }), costUsd: 0 }));
    assert.strictEqual(r2.places.length, 2, 'Core마다 작업 위치');
    assert.deepStrictEqual(r2.places.map(p => [p.coreName, p.coreKey]), [['[Core] SVOD (홈)', 'S'], ['[Core] TVOD', 'T']]);
    assert.strictEqual(r2.place, r2.places[0]);
    const v4 = judge(an({ a: [4] }), ix, rules, {});
    assert(v4.content === null && v4.suggestion === 'update', '하나도 안 겹치면 자료가 어긋난 것으로 보고 이름 판별 (피쳐링셀 → SVOD)');
    // 2단계 메인 화면 기준 (2026-10-26 윤우): 피쳐링셀이 메인 화면에 가려지지 않고 보이는 Core만. 메인 화면 = 🌏 화면, 없으면 섹션 맨 왼쪽 대표 화면(색인 main),
    // 보이는 것 = 색인 vis (딤·바텀시트·드롭다운에 가려진 인스턴스는 빠짐)
    const mainScr = (id, ns, plat, vis) => Object.assign(scr(id, ns), { name: id, main: plat }, vis ? { vis: vis.map(n => names.indexOf(n)) } : {});
    const fill = (k, n) => Array.from({ length: n }, (_, i) => scr(k + i, ['TopBar', 'Button', 'Row']));
    const FC = ['TopBar', 'Button', 'Featuring Cell', 'Featuring Cell/Title', 'Row'];
    const ixM = { component_names: names, files: [
      { name: '[Core] SVOD (홈)', key: 'S', url: 's', screen_components: [mainScr('🌏 SVOD_APP', FC, 'APP'), mainScr('🌏 SVOD_WEB', FC, 'WEB')].concat(fill('s', 4)) },
      { name: '[Core] TVOD', key: 'T', url: 't', screen_components: [mainScr('🌏 TVOD_APP', FC, 'APP')].concat(fill('t', 4)) },
      // 🌏 표시 없는 Core: 섹션 맨 왼쪽 대표 화면
      { name: '[Core] 웹툰', key: 'W', url: 'w', screen_components: [mainScr('웹툰_APP', ['TopBar', 'Featuring Cell', 'Webtoon Cell'], 'APP'), mainScr('웹툰_WEB', ['TopBar', 'Featuring Cell'], 'WEB')].concat(fill('w', 4)) },
      // WEB 대표 화면에서 드롭다운 뒤에 홈이 깔린 Core — 피쳐링셀이 가려져 있어서 빠져야 함
      { name: '[Core] 소식함', key: 'N', url: 'n', screen_components: [mainScr('소식함_APP', ['TopBar', 'Cell'], 'APP'), mainScr('소식함_WEB', ['TopBar', 'Featuring Cell', 'Cell'], 'WEB', ['TopBar', 'Cell'])].concat(fill('n', 4)) },
      // 대표 화면 하나뿐인데 피쳐링셀이 막 뒤에 깔린 Core (로그인/가입 시작) — 빠져야 함
      { name: '[Core] 로그인', key: 'L', url: 'l', screen_components: [mainScr('로그인 시작', FC, 'APP', ['TopBar', 'Button'])].concat(fill('l', 4)) },
      // 대표 화면이 아닌 곳에 홈 화면을 그대로 넣어 둔 Core (2026-10-26 피쳐링셀 문서: 나의 왓챠·왓챠파티·콘상페·플레이어가 82%로 걸림) — 빠져야 함
      { name: '[Core] 나의 왓챠', key: 'M', url: 'm', screen_components: [mainScr('나의 왓챠', ['TopBar', 'Cell'], 'APP'), scr('m0', FC)].concat(fill('m', 4)) }] };
    const vm = judge(an({ a: [0, 1, 2, 3] }), ixM, rules, {});
    assert.deepStrictEqual(vm.targets.map(t => t.name), ['[Core] SVOD (홈)', '[Core] TVOD', '[Core] 웹툰'], '메인 화면에 피쳐링셀이 보이는 웹툰은 함께, 소식함(드롭다운에 가려짐)과 나의 왓챠(대표 화면 아닌 곳)는 빠짐');
    assert(/메인 화면\(웹툰_APP, 웹툰_WEB\)/.test(vm.targets[2].why), '웹툰 근거는 메인 화면');
    const v3 = judge(Object.assign(an({}), { comps: undefined }), index, rules, {});
    assert(v3.targets && v3.content === null, '컴포넌트 자료가 없으면 이름으로만 판별');
  }
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
    const co = { platforms: { APP: { screens: [{ id: 'REP', name: '🌏 SVOD_APP', w: 375, h: 4816, cls: 'small', bar: null, sig: 'a' }, { id: 'S1', name: '로그인/구독_small', w: 375, h: 4816, cls: 'small', bar: 'B1', sig: 'b' }] } } };
    const dd = computeDelta(an, co, {});
    // 짧은 시안(812)은 홈 전체(4816)를 덮지 않고 그 옆에 새 화면으로 넣는다 (2026-10-28 윤우 "옆에 추가", 패키지 팝업 → 결제/구독)
    const add = dd.rows.find(r => r.action === '추가');
    assert(add && add.beside && add.beside.id === 'S1' && /짧은 화면/.test(add.why), '훨씬 짧은 시안은 크기 칸 화면 옆에 추가');
    assert(!dd.rows.some(r => r.action === '교체'), '짧은 시안이 긴 화면을 덮지 않음');
    const rep = dd.rows.find(r => r.target && r.target.id === 'REP');
    assert(rep.action === '그대로' && /대표 화면/.test(rep.why) && rep.check, '대표 화면은 그대로 + 확인 필요');
    // 같은 폭에 시안과 길이가 같은 피쳐링셀 화면이 있으면 홈 전체(4816)가 아니라 그 화면을 바꾼다 (2026-10-27 SVOD 영상 컨텐츠_small)
    const co2 = { platforms: { APP: { screens: co.platforms.APP.screens.concat([{ id: 'FC', name: '영상 컨텐츠_small', w: 375, h: 812, cls: 'small', bar: null, sig: 'c' }]) } } };
    const d2 = computeDelta(an, co2, {});
    assert.strictEqual(d2.rows.find(r => r.action === '교체').target.id, 'FC', '길이가 같은 화면을 교체');
    assert(!d2.rows.some(r => r.action === '추가'), '길이가 맞는 칸이 있으면 옆에 추가하지 않음');
    assert.strictEqual(d2.rows.find(r => r.target && r.target.id === 'S1').action, '그대로', '홈 전체 화면은 그대로');
  }
  // 반영: 프로젝트 페이지를 통째로 붙여도 필요한 화면만 쓰고 나머지는 브랜치에서 지운다 (2026-10-26 윤우: 단계 줄이기)
  {
    let seq = 0;
    const node = (type, name, props = {}) => {
      const n = Object.assign({ id: 'n' + (++seq), type, name, width: 0, height: 0, x: 0, y: 0, children: [], parent: null, removed: false }, props);
      n.appendChild = (c) => { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = n; n.children.push(c); };
      n.remove = () => { if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1); n.parent = null; n.removed = true; };
      n.resizeWithoutConstraints = (w, h) => { n.width = w; n.height = h; };
      const all = (ok) => { const out = []; const w = (x) => { for (const c of x.children) { if (ok(c)) out.push(c); w(c); } }; w(n); return out; };
      n.findAll = (ok) => all(ok); n.findOne = (ok) => all(ok)[0] || null;
      n.findAllWithCriteria = ({ types }) => all(c => types.includes(c.type));
      return n;
    };
    const kid = (parent, c) => { parent.appendChild(c); return c; };
    const screen = (w, h, text) => { const f = node('FRAME', 's', { width: w, height: h }); kid(f, node('TEXT', 't', { characters: text })); return f; };
    const page = node('PAGE', '🌏 마스터 파일');
    const root = kid(page, node('SECTION', '🌏 SVOD')); const app = kid(root, node('SECTION', 'APP'));
    const core1 = kid(app, screen(375, 4816, '옛 화면'));
    // 사람이 붙여 넣은 프로젝트 페이지: 섹션 안 섹션 안에 화면, 같은 크기 다른 화면도 있음
    const pastedSec = kid(page, node('SECTION', 'small')); const inner = kid(pastedSec, node('SECTION', '피쳐링셀'));
    const want = kid(inner, screen(375, 812, '새 피쳐링셀')); kid(inner, screen(375, 812, '다른 화면')); kid(pastedSec, node('TEXT', '메모', { characters: '메모' }));
    const loose = kid(page, screen(1440, 900, '상관없는 화면'));
    const { SIG_FN } = require('../engine/signature');
    const srcSig = new Function(SIG_FN + 'return sig;')()(want);
    const keepTop = [root.id];
    const plan = { coreKey: 'CORE', coreScreenIds: [core1.id], month: null, keepTop,
      rows: [{ action: '교체', platform: 'APP', cls: 'small', width: 375, source: { id: 'P1', w: 375, h: 812, sig: srcSig }, target: { id: core1.id } }] };
    const fig = { fileKey: 'BRANCH', root: { children: [page] }, getNodeByIdAsync: async (id) => (id === core1.id ? core1 : null) };
    page.loadAsync = async () => {};
    const out = await new AsyncFn('figma', applyUpdateCode(rules, plan))(fig);
    assert.strictEqual(out.done.length, 1, '붙여 넣은 페이지에서 화면을 찾음');
    assert.strictEqual(core1.children[0].characters, '새 피쳐링셀', '지문이 같은 화면으로 교체 (같은 크기 다른 화면 아님)');
    assert.strictEqual(core1.height, 812, '시안 길이 그대로');
    assert.deepStrictEqual(page.children.map(n => n.id), [root.id], '남은 붙여넣기(섹션·화면)는 브랜치에서 지움');
    assert(pastedSec.removed && loose.removed && out.leftoverRemoved === 2);
    // 아무 화면도 못 찾으면 붙인 것을 지우지 않는다
    const page2 = node('PAGE', '🌏 마스터 파일'); const r2 = kid(page2, node('SECTION', '🌏 X')); kid(r2, node('SECTION', 'APP')); const junk = kid(page2, screen(375, 812, '엉뚱'));
    page2.loadAsync = async () => {};
    const plan2 = Object.assign({}, plan, { keepTop: [r2.id], rows: [{ action: '교체', platform: 'APP', cls: 'small', width: 375, source: { id: 'P1', w: 375, h: 600, sig: 'x' }, target: { id: core1.id } }] });
    const out2 = await new AsyncFn('figma', applyUpdateCode(rules, plan2))({ fileKey: 'BRANCH', root: { children: [page2] }, getNodeByIdAsync: async () => null });
    assert(out2.done.length === 0 && !junk.removed, '못 찾았으면 붙인 것을 남겨 둠');
    // 묶음 통째로 (2026-10-27 윤우): 묶음 바 아래 옛 화면·하위 바를 지우고 시안 화면을 🔵 바와 함께 다시 놓는다
    const page3 = node('PAGE', '🌏 마스터 파일'); const root3 = kid(page3, node('SECTION', '🌏 SVOD')); const app3 = kid(root3, node('SECTION', 'APP'));
    const inst = (name, x, y, w, h, title) => { const i = node('INSTANCE', name, { x, y, width: w, height: h }); i.resize = (W, H) => { i.width = W; i.height = H; }; if (title) kid(i, node('TEXT', '제목', { characters: title })); return i; };
    const gb = kid(app3, inst('스크린 설명 컴포넌트', 0, 0, 800, 60, '피쳐링셀'));
    const sub = kid(app3, inst('스크린 설명 컴포넌트', 0, 80, 375, 40, '이미지'));
    const o1 = kid(app3, Object.assign(screen(375, 812, '옛 이미지'), { x: 0, y: 140 })), o2 = kid(app3, Object.assign(screen(375, 812, '옛 영상'), { x: 400, y: 140 }));
    const right3 = kid(app3, Object.assign(screen(375, 812, '오른쪽 묶음'), { x: 900, y: 140 }));
    const paste3 = kid(page3, node('SECTION', '[Small] Case'));
    const n3 = ['새 이미지', '새 컬렉션', '새 추천'].map(t => kid(paste3, screen(375, 812, t)));
    const sigOf = new Function(SIG_FN + 'return sig;')();
    const byId = new Map([gb, o1, o2].map(n => [n.id, n]));
    const fig3 = { fileKey: 'BRANCH', root: { children: [page3] }, getNodeByIdAsync: async (id) => byId.get(id) || null,
      importComponentByKeyAsync: async () => ({ createInstance: () => inst('🔵', 0, 0, 100, 40) }) };
    page3.loadAsync = async () => {};
    const plan3 = { coreKey: 'CORE', coreScreenIds: [o1.id, o2.id, right3.id], month: null, keepTop: [root3.id],
      rows: [{ action: '묶음 교체', platform: 'APP', cls: 'small', width: 375, group: { id: gb.id }, sources: n3.map(f => ({ id: 'P' + f.id, w: 375, h: 812, sig: sigOf(f) })), olds: [{ id: o1.id }, { id: o2.id }] }] };
    const out3 = await new AsyncFn('figma', applyUpdateCode(rules, plan3))(fig3);
    assert.strictEqual(out3.done.length, 3, '시안 3장을 묶음에 넣음');
    assert(o1.removed && o2.removed && sub.removed && !gb.removed, '옛 화면·하위 바는 지우고 묶음 바는 남김');
    assert.deepStrictEqual(n3.map(f => f.parent), [app3, app3, app3], '시안 화면은 APP 섹션으로');
    assert.deepStrictEqual(n3.map(f => f.x), [0, 407, 814], '한 줄로 나란히');
    assert.strictEqual(gb.width, 1189, '묶음 바를 새 폭으로');
    assert.strictEqual(right3.x, 900 + 389, '오른쪽 묶음은 늘어난 만큼 밀림');
    assert(paste3.removed, '남은 붙여넣기는 지움');
    // 옆에 추가 (2026-10-28 윤우): 짧은 시안은 기준 화면 바로 오른쪽에 끼우고, 그 오른쪽 화면·🔵 바는 그만큼 민다
    const pageB = node('PAGE', '🌏 마스터 파일'); const rootB = kid(pageB, node('SECTION', '🌏 결제/구독')); const appB = kid(rootB, node('SECTION', 'APP'));
    const topB = kid(appB, inst('스크린 설명 컴포넌트', 0, 0, 814, 60, '결제'));
    const bb1 = kid(appB, inst('스크린 설명 컴포넌트', 0, 282, 375, 40, 'small')), bb2 = kid(appB, inst('스크린 설명 컴포넌트', 407, 282, 375, 40, 'small'));
    const homeB = kid(appB, Object.assign(screen(375, 4816, '결제페이지'), { x: 0, y: 400 })), rightB = kid(appB, Object.assign(screen(375, 4816, '구독 관리'), { x: 407, y: 400 }));
    const pasteB = kid(pageB, node('SECTION', '팝업')); const popB = kid(pasteB, screen(375, 812, '패키지 팝업'));
    const figB = { fileKey: 'BRANCH', root: { children: [pageB] }, getNodeByIdAsync: async (id) => (id === homeB.id ? homeB : null),
      importComponentByKeyAsync: async () => ({ createInstance: () => inst('🔵', 0, 0, 100, 40) }) };
    pageB.loadAsync = async () => {};
    const planB = { coreKey: 'CORE', coreScreenIds: [homeB.id, rightB.id], month: null, keepTop: [rootB.id],
      rows: [{ action: '추가', platform: 'APP', cls: 'small', width: 375, source: { id: 'P1', w: 375, h: 812, sig: sigOf(popB) }, beside: { id: homeB.id, bar: bb1.id } }] };
    figB.getNodeByIdAsync = async (id) => (id === homeB.id ? homeB : id === bb1.id ? bb1 : null);
    const outB = await new AsyncFn('figma', applyUpdateCode(rules, planB))(figB);
    assert.strictEqual(outB.done.length, 1, '시안을 Core에 넣음');
    assert(popB.parent === appB && popB.x === 407 && popB.y === 400, '기준 화면 바로 오른쪽, 같은 높이에 놓임');
    assert.strictEqual(homeB.x, 0, '기준 화면은 그대로');
    assert(rightB.x === 814 && bb2.x === 814 && bb1.x === 0, '오른쪽 화면·🔵 바는 밀리고 왼쪽은 그대로');
    assert(topB.width >= 1189 - rules.layout.sectionPadding, '맨 위 ⚫ 바는 새 폭까지 늘림');
    assert(bb1.width === 375 + 407 && bb2.width === 375, '기준 화면 위 🔵 바만 새 화면까지 늘리고(새 바 안 만듦), 다른 🔵 바는 그대로 (2026-10-28 전부 8,000px 버그 · 2026-10-30 기존 바 활용)');
    assert(!appB.children.some(n => n.name === '🔵'), '앱 기본 모양 🔵 바를 새로 만들지 않음');
    assert(pasteB.removed, '남은 붙여넣기는 지움');
    // 루트 섹션이 커지면 옆·아래 섹션을 민다 (2026-10-28 결제/구독 테스트: 🌏 결제가 넓어지며 🌏 구독을 덮음)
    const pageC = node('PAGE', '🌏 마스터 파일');
    const rootC = kid(pageC, Object.assign(node('SECTION', '🌏 결제'), { x: 0, y: 0, width: 1000, height: 1000 }));
    const otherC = kid(pageC, Object.assign(node('SECTION', '🌏 구독'), { x: 1240, y: 0, width: 500, height: 500 }));
    const belowC = kid(pageC, Object.assign(node('SECTION', '🌏 아래'), { x: 0, y: 1240, width: 500, height: 500 }));
    const appC = kid(rootC, Object.assign(node('SECTION', 'APP'), { x: 100, y: 100, width: 800, height: 800 }));
    kid(appC, inst('스크린 설명 컴포넌트', 0, 282, 375, 40, 'small'));
    const homeC = kid(appC, Object.assign(screen(375, 400, '결제페이지'), { x: 0, y: 400 }));
    const pasteC = kid(pageC, node('SECTION', '붙임')); const newC = kid(pasteC, screen(1280, 4000, '단건 결제페이지'));
    const figC = { fileKey: 'BRANCH', root: { children: [pageC] }, getNodeByIdAsync: async () => null,
      importComponentByKeyAsync: async () => ({ createInstance: () => inst('🔵', 0, 0, 100, 40) }) };
    pageC.loadAsync = async () => {};
    const planC = { coreKey: 'CORE', coreScreenIds: [homeC.id], month: null, keepTop: [rootC.id, otherC.id, belowC.id],
      rows: [{ action: '추가', platform: 'APP', cls: 'large', width: 1280, source: { id: 'P1', w: 1280, h: 4000, sig: sigOf(newC) }, beside: null }] };
    const outC = await new AsyncFn('figma', applyUpdateCode(rules, planC))(figC);
    assert.strictEqual(outC.done.length, 1);
    assert(rootC.width > 1000 && rootC.height > 1000, '루트 섹션이 커짐');
    assert.strictEqual(otherC.x, 1240 + (rootC.width - 1000), '오른쪽 섹션은 커진 만큼 밀림');
    assert.strictEqual(belowC.y, 1240 + (rootC.height - 1000), '아래 섹션은 커진 만큼 밀림');
    assert(otherC.y === 0 && belowC.x === 0, '다른 방향은 그대로');
    // 시안 화면을 하나라도 못 찾으면 묶음은 그대로
    const page4 = node('PAGE', '🌏 마스터 파일'); const root4 = kid(page4, node('SECTION', '🌏 SVOD')); const app4 = kid(root4, node('SECTION', 'APP'));
    const gb4 = kid(app4, inst('바', 0, 0, 800, 60, '피쳐링셀')); const o4 = kid(app4, Object.assign(screen(375, 812, '옛'), { x: 0, y: 140 }));
    page4.loadAsync = async () => {};
    const out4 = await new AsyncFn('figma', applyUpdateCode(rules, Object.assign({}, plan3, { keepTop: [root4.id], rows: [Object.assign({}, plan3.rows[0], { group: { id: gb4.id }, olds: [{ id: o4.id }] })] })))(
      Object.assign({}, fig3, { root: { children: [page4] }, getNodeByIdAsync: async (id) => (id === gb4.id ? gb4 : null) }));
    assert(!o4.removed && out4.done.length === 0 && /못 찾아/.test(out4.notFound.join()), '못 찾으면 지우지 않음');
    // 부분 갱신 반영: 메인 화면 속 영역의 내용만 바꾸고(크기 유지), 묶음은 바·화면째 지운다 (2026-10-28)
    const page5 = node('PAGE', '🌏 마스터 파일'); const root5 = kid(page5, node('SECTION', '🌏 SVOD')); const app5 = kid(root5, node('SECTION', 'APP'));
    const cell = (t) => { const i = node('INSTANCE', 'Featuring Cell(Mobile)', { width: 335, height: 442 }); kid(i, node('TEXT', 't', { characters: t })); return i; };
    const home = kid(app5, Object.assign(screen(375, 4816, '아래 내용'), { x: 0, y: 140, name: '로그인/구독_small' }));
    const region = kid(home, node('FRAME', 'Frame 2609187', { x: 0, y: 158, width: 375, height: 442 })); kid(region, cell('옛 셀'));
    const gb5 = kid(app5, inst('바', 500, 0, 800, 60, '피쳐링셀')); const sub5 = kid(app5, inst('바', 500, 80, 375, 40, '이미지'));
    const old5 = kid(app5, Object.assign(screen(375, 812, '옛 이미지'), { x: 500, y: 140 }));
    const far5 = kid(app5, Object.assign(screen(375, 812, '다른 묶음'), { x: 1400, y: 140 }));
    const paste5 = kid(page5, node('SECTION', '[Small] Case'));
    const newS = kid(paste5, screen(375, 812, '시안')); const nreg = kid(newS, node('FRAME', 'Frame 2609218', { x: 0, y: 158, width: 1025, height: 442 })); kid(nreg, cell('새 셀'));
    const csigOf = new Function(SIG_FN + 'return (n) => sigs(n).csig;')();
    const newCsig = csigOf(nreg);
    const fig5 = { fileKey: 'BRANCH', root: { children: [page5] }, getNodeByIdAsync: async (id) => ({ [region.id]: region, [gb5.id]: gb5 }[id] || null) };
    page5.loadAsync = async () => {};
    const plan5 = { feature: ['featuringcell'], coreKey: 'CORE', coreScreenIds: [home.id, old5.id, far5.id], month: null, keepTop: [root5.id],
      rows: [{ action: '부분 교체', platform: 'APP', cls: 'small', width: 375, source: { id: 'P1', w: 375, h: 812, sig: sigOf(newS) }, target: { id: home.id }, regions: [region.id], newCsigs: [newCsig] },
             { action: '묶음 삭제', platform: 'APP', group: { id: gb5.id }, olds: [old5.id] }] };
    const out5 = await new AsyncFn('figma', applyUpdateCode(rules, plan5))(fig5);
    assert.deepStrictEqual(out5.done.map(x => [x.action, x.same]), [['부분 교체', true], ['묶음 삭제', true]], JSON.stringify(out5.notFound));
    assert.strictEqual(region.children[0].children[0].characters, '새 셀', '영역 속만 시안 것으로');
    assert(region.width === 375 && region.height === 442 && home.height === 4816, '영역·화면 크기는 그대로');
    assert(old5.removed && sub5.removed && gb5.removed && !home.removed, '묶음은 바·화면째 지우고 메인 화면은 남김');
    assert.strictEqual(far5.x, 1400 - 800 - rules.layout.gap, '오른쪽 것은 왼쪽으로 당김');
    assert(paste5.removed, '남은 붙여넣기는 지움');
    // 높이가 다르면 손대지 않는다
    const page6 = node('PAGE', '🌏 마스터 파일'); const root6 = kid(page6, node('SECTION', '🌏 SVOD')); const app6 = kid(root6, node('SECTION', 'APP'));
    const home6 = kid(app6, screen(375, 4816, '홈')); const reg6 = kid(home6, node('FRAME', 'R', { y: 158, width: 375, height: 442 })); kid(reg6, cell('옛'));
    const p6 = kid(page6, screen(375, 812, '시안')); const nreg6 = kid(p6, node('FRAME', 'R', { y: 158, width: 375, height: 500 })); kid(nreg6, cell('새'));
    page6.loadAsync = async () => {};
    const out6 = await new AsyncFn('figma', applyUpdateCode(rules, Object.assign({}, plan5, { keepTop: [root6.id], coreScreenIds: [home6.id], rows: [{ action: '부분 교체', platform: 'APP', cls: 'small', width: 375, source: { id: 'P1', w: 375, h: 812, sig: sigOf(p6) }, target: { id: home6.id }, regions: [reg6.id], newCsigs: ['x'] }] })))(
      { fileKey: 'BRANCH', root: { children: [page6] }, getNodeByIdAsync: async (id) => (id === reg6.id ? reg6 : null) });
    assert(out6.done.length === 0 && /높이/.test(out6.notFound.join()) && reg6.children[0].children[0].characters === '옛' && !p6.removed, '높이 다르면 그대로 두고 붙인 것도 남김');
    // 링크 카드 형태 통일 (2026-10-30 윤우): 디자이너가 만든 카드(이름 '결제')의 "🔗 관련 스펙 링크" 뱃지를 복제해 프로젝트 이름·링크를 넣는다. 파란 글자는 안 만든다
    const page7 = node('PAGE', '🌏 마스터 파일'); const root7 = kid(page7, node('SECTION', '🌏 결제')); const app7 = kid(root7, node('SECTION', 'APP'));
    const card7 = kid(root7, node('FRAME', '결제', { width: 367, height: 170 })); kid(card7, node('TEXT', 'btn', { characters: '결제' }));
    const badge7 = kid(card7, node('INSTANCE', 'ㄴ 상태 뱃지')); const inner7 = kid(badge7, node('INSTANCE', 'ㄴ 🪐 상단 Badge'));
    kid(inner7, node('TEXT', 'Text', { characters: '🔗', getStyledTextSegments: () => [] })); kid(inner7, node('TEXT', 'Text', { characters: '관련 스펙 링크', getStyledTextSegments: () => [] }));
    const deep = (n) => { const c = node(n.type, n.name, { characters: n.characters, getStyledTextSegments: n.getStyledTextSegments }); for (const k of n.children) kid(c, deep(k)); return c; };
    badge7.clone = () => deep(badge7);
    const home7 = kid(app7, screen(375, 4816, '결제페이지'));
    const p7 = kid(page7, screen(375, 812, '패키지 팝업'));
    page7.loadAsync = async () => {};
    const fig7 = { fileKey: 'BRANCH', root: { children: [page7] }, getNodeByIdAsync: async (id) => (id === home7.id ? home7 : null), loadFontAsync: async () => {}, createText: () => { throw new Error('글자를 새로 만들면 안 됨'); },
      importComponentByKeyAsync: async (key) => { if (key === rules.components.badge) throw new Error('뱃지 컴포넌트 불러오기 안 됨'); return { createInstance: () => inst('🔵', 0, 0, 100, 40) }; } };
    const plan7 = { coreKey: 'CORE', coreScreenIds: [home7.id], month: '2026.10', projectName: '패키지 인지', sourceUrl: 'https://www.figma.com/design/DOC', keepTop: [root7.id],
      rows: [{ action: '추가', platform: 'APP', cls: 'small', width: 375, source: { id: 'P1', w: 375, h: 812, sig: sigOf(p7) }, beside: { id: home7.id, bar: null } }] };
    const out7 = await new AsyncFn('figma', applyUpdateCode(rules, plan7))(fig7);
    assert(out7.done.length === 1 && out7.linkAdded && out7.linkAdded.badge && !out7.linkAdded.newCard, '기존 카드를 찾아 뱃지로 링크를 넣음: ' + JSON.stringify(out7.linkAdded));
    const badges = card7.children.filter(n => n.type === 'INSTANCE');
    assert.strictEqual(badges.length, 2, '뱃지가 하나 더 생김');
    const nt = badges[1].findAll(n => n.type === 'TEXT');
    assert.deepStrictEqual(nt.map(n => n.characters), ['🔗', '패키지 인지 (2026.10)'], '새 뱃지 글자 = 프로젝트 이름 (월)');
    assert.deepStrictEqual(nt[1].hyperlink, { type: 'URL', value: 'https://www.figma.com/design/DOC' }, '그 글자에 문서 링크');
    assert(!card7.removed && card7.parent === root7 && !page7.children.some(n => /링크 카드/.test(n.name)), '카드를 새로 만들지 않음');
    assert(p7.parent === app7, '시안은 APP 섹션으로');
  }
  // 부분 갱신 (2026-10-28 윤우): 메인 화면은 그대로, 핵심 컴포넌트 영역 속만 바꾸고 따로 정리한 묶음은 지운다
  {
    const { computeDelta, findGroupsAll, partRows } = require('../engine/delta');
    const an = { cover: { nameKR: '피쳐링셀 I 윤우' }, fileName: '피쳐링셀', platforms: { APP: [
      { cls: 'small', desc: '', picks: [{ width: 375, chosen: 'P1', candidates: [{ id: 'P1', name: 'small_375px', w: 375, h: 812, sig: 'n1' }] }] },
      { cls: 'medium', desc: '', picks: [{ width: 768, chosen: 'P2', candidates: [{ id: 'P2', name: '대표화면', w: 768, h: 721, sig: 'n2' }] }] }] } };
    const reg = (id, y, h, csig) => ({ id, y, h, w: 375, csig, n: 10 });
    const co = { platforms: { APP: { bars: { G: '피쳐링셀', K: '로그인/구독 케이스' }, screens: [
      { id: 'HOME', name: '로그인/구독_small', w: 375, h: 4816, cls: 'small', bar: 'B', sig: 'h', wb: ['K'], reg: [reg('R1', 158, 442, 'old')] },
      { id: 'HOME2', name: '비로그인/비구독_small', w: 375, h: 4816, cls: 'small', bar: 'B', sig: 'h2', wb: ['K'], reg: [reg('R2', 158, 442, 'new')] },
      { id: 'HOMEM', name: '로그인/구독_medium', w: 768, h: 4816, cls: 'medium', bar: 'B', sig: 'hm', wb: ['K'], reg: [reg('R3', 166, 310, 'old')] },
      { id: 'HOMEL', name: '로그인/구독_large', w: 1024, h: 4816, cls: 'large', bar: 'B', sig: 'hl', wb: ['K'], reg: [reg('R4', 178, 422, 'old')] },
      { id: 'OTHER', name: '검색', w: 375, h: 2000, cls: 'small', bar: 'B', sig: 'o', wb: ['K'], reg: [] },
      { id: 'IMG', name: '이미지 컨텐츠_small', w: 375, h: 812, cls: 'small', bar: 'B', sig: 'a', wb: ['G'], reg: [reg('R9', 158, 442, 'x')] }] } } };
    const dreg = { P1: [reg('D1', 158, 442, 'new')], P2: [reg('D2', 170, 300, 'new')] };
    const d = partRows(computeDelta(an, co, {}), co, an, dreg, findGroupsAll(co, an), 'Featuring Cell');
    const by = (id) => d.rows.find(r => r.target && r.target.id === id);
    assert.strictEqual(by('HOME').action, '부분 교체', '영역 속이 다르고 높이 같음 → 부분 교체');
    assert.deepStrictEqual(by('HOME').regions, ['R1']); assert.strictEqual(by('HOME').source.id, 'P1');
    assert.strictEqual(by('HOME2').action, '유지', '영역 속이 시안과 같으면 유지');
    assert(by('HOMEM').action === '그대로' && by('HOMEM').check && /높이가 다름/.test(by('HOMEM').why), '높이가 다르면 손대지 않고 확인 필요');
    assert(by('HOMEL').action === '그대로' && by('HOMEL').check && /같은 폭/.test(by('HOMEL').why), '같은 폭 시안이 없으면 확인 필요');
    assert(by('OTHER').action === '그대로' && !by('OTHER').check, '영역 없는 화면은 그냥 그대로');
    assert(!by('IMG'), '묶음 안 화면은 줄이 따로 없음');
    const drop = d.rows.find(r => r.action === '묶음 삭제');
    assert(drop && drop.group.id === 'G' && drop.olds.length === 1, '프로젝트 이름 묶음은 삭제 줄');
    assert(!d.rows.some(r => r.action === '교체' || r.action === '추가'), '시안 화면은 Core에 넣지 않음');
    assert.deepStrictEqual([d.summary.part, d.summary.drop, d.summary.keep], [1, 1, 1]);
    assert.strictEqual(partRows(computeDelta(an, { platforms: { APP: { bars: {}, screens: [co.platforms.APP.screens[4]] } } }, {}), { platforms: { APP: { bars: {}, screens: [co.platforms.APP.screens[4]] } } }, an, {}, [], 'x'), null, '영역 있는 메인 화면이 없으면 부분 갱신 아님');
  }
  // 묶음 찾기: 교체 칸이 프로젝트 이름과 같은 묶음 안이면 묶음 교체 줄로 (2026-10-27 SVOD 피쳐링셀)
  {
    const { computeDelta, findGroups, applyGroups } = require('../engine/delta');
    const an = { cover: { nameKR: '피쳐링셀 I 윤우' }, fileName: '피쳐링셀', platforms: { APP: [{ cls: 'small', desc: '', picks: [{ width: 375, chosen: 'P1', candidates: [{ id: 'P1', name: 'small_375px', w: 375, h: 812, sig: 'n1' }] }] }] } };
    const co = { platforms: { APP: { bars: { K: '로그인/구독 케이스', G: '피쳐링셀', W: '컨텐츠' }, screens: [
      { id: 'HOME', name: '로그인/구독_small', w: 375, h: 4816, cls: 'small', bar: 'B', sig: 'h', wb: ['K'] },
      { id: 'IMG', name: '이미지 컨텐츠_small', w: 375, h: 812, cls: 'small', bar: 'B', sig: 'a', wb: ['G', 'W'] },
      { id: 'VID', name: '영상 컨텐츠_small', w: 375, h: 812, cls: 'small', bar: 'B', sig: 'b', wb: ['G', 'W'] },
      { id: 'AGE', name: '연령등급 케이스', w: 497, h: 272, cls: null, bar: null, sig: 'c', wb: ['G'] }] } } };
    const d = computeDelta(an, co, {});
    const gs = findGroups(d, co, an);
    assert.strictEqual(gs.length, 1); assert.strictEqual(gs[0].bar.title, '피쳐링셀', '바깥 묶음 중 프로젝트 이름과 같은 것');
    const cases = [{ platform: 'APP', width: 375, id: 'S', name: '[Small] Case', frames: ['n1', 'n2', 'n3'].map(x => ({ id: x, name: 'small', w: 375, h: 812, sig: x })) }];
    const g = applyGroups(d, gs, cases);
    const r375 = g.rows.find(r => r.action === '묶음 교체' && r.width === 375), r497 = g.rows.find(r => r.width === 497);
    assert(r375 && r375.sources.length === 3 && r375.olds.length === 2, '375 줄: Core 2장 → 시안 3장');
    assert(r497 && r497.action === '묶음 교체' && !r497.sources.length && /지워짐/.test(r497.why), '시안에 없는 폭은 지워진다고 알림');
    assert(g.rows.find(r => r.target && r.target.id === 'HOME').action === '그대로', '홈 전체는 그대로');
    assert.strictEqual(g.summary.group, 2);
    // 반영 뒤 같아지면 유지
    const co2 = { platforms: { APP: { bars: co.platforms.APP.bars, screens: [co.platforms.APP.screens[0]].concat(['n1', 'n2', 'n3'].map(x => ({ id: 'C' + x, name: 'small', w: 375, h: 812, cls: 'small', bar: 'B', sig: x, wb: ['G'] }))) } } };
    const an2 = JSON.parse(JSON.stringify(an)); an2.platforms.APP[0].picks[0].candidates[0].sig = 'other';
    const d2 = computeDelta(an2, co2, {});
    const g2 = applyGroups(d2, findGroups(d2, co2, an2), cases);
    assert(g2.rows.some(r => r.action === '유지' && r.group) && !g2.summary.group, '반영 뒤에는 묶음 유지');
    // 묶음 이름이 프로젝트와 다르면 한 장만 교체
    assert.strictEqual(findGroups(d, co, { cover: { nameKR: '스텝메이드' }, fileName: 'x' }).length, 0);
  }
  // 새 묶음 추가 (2026-10-30 윤우): Core에 없는 케이스(패키지 결제)는 대표 1장을 기존 줄에 끼우지 않고 프로젝트 이름 묶음으로 전부 넣는다
  {
    const { addGroups } = require('../engine/delta');
    const d = { rows: [
      { action: '추가', platform: 'APP', cls: 'small', width: 375, desc: '~767', source: { id: 'P1', name: '패키지 팝업', w: 375, h: 812, sig: 's1' }, target: null, beside: { id: 'C1' } },
      { action: '교체', platform: 'APP', cls: 'medium', width: 768, source: { id: 'P2', name: '결제페이지', w: 768, h: 2000, sig: 's2' }, target: { id: 'C2' } },
      { action: '그대로', platform: 'APP', cls: 'small', width: 375, source: null, target: { id: 'C1', name: '결제페이지', w: 375, h: 2097 } },
    ], missing: [], summary: { keep: 0, replace: 1, add: 1, untouched: 1 } };
    const reads = [{ platform: 'APP', width: 375, total: 20, frames: [
      { id: 'P0', name: '콘상페', w: 375, h: 812, sig: 's0' }, { id: 'P3', name: '단건 결제 페이지', w: 375, h: 812, sig: 's3' }, { id: 'P1', name: '패키지 팝업', w: 375, h: 812, sig: 's1' }, { id: 'P4', name: '패키지 결제 페이지', w: 375, h: 813, sig: 's4' }, { id: 'P5', name: '같은 것', w: 375, h: 812, sig: 's2' }] }];
    const g = addGroups(d, reads, '결제 페이지 내, 패키지 인지 시키기');
    const row = g.rows.find(r => r.action === '묶음 추가');
    assert(row && row.width === 375 && row.group.title === '결제 페이지 내, 패키지 인지 시키기', '추가 칸이 묶음 추가 줄이 됨');
    assert.deepStrictEqual(row.sources.map(f => f.id), ['P0', 'P3', 'P1', 'P4'], '이름 다른 화면을 문서 순서대로, 다른 칸에 이미 쓴 화면(s2)은 뺌');
    assert(!row.beside && !row.target, '옆에 끼우지 않음');
    assert.strictEqual(g.rows.find(r => r.width === 768).action, '교체', '교체 칸은 그대로');
    assert(g.summary.add === 0 && g.summary.addGroup === 1);
    // 읽기에서 그 폭을 못 받았어도(tooMany) 대표 1장은 묶음으로 들어간다
    const g2 = addGroups(d, [{ platform: 'APP', width: 375, frames: [], tooMany: true }], 'X');
    assert.deepStrictEqual(g2.rows.find(r => r.action === '묶음 추가').sources.map(f => f.id), ['P1']);
    assert.strictEqual(addGroups(d, reads, null), d, '프로젝트 이름이 없으면 그대로');
  }
  // 다른 Core의 화면은 새 묶음에서 뺀다 (2026-10-30 윤우: 플로우 첫 진입점 "콘텐츠 상세 페이지"는 결제 프로젝트 스펙의 주요 화면이 아니다)
  {
    const { addGroups } = require('../engine/delta');
    const { screenCores, foreignScreens, compHash } = require('../engine/judge');
    const H = (n) => compHash(n);
    // 작은 색인: 결제 Core 화면 2장, 콘상페 Core 화면 2장. 공통 컴포넌트(상단바·버튼)는 모두에, 드문 컴포넌트는 Core마다 다르게
    const names = ['상단바', '버튼', '결제카드', '요금제셀', '포스터', '회차목록', '별점'];
    const idx = (c) => c.map(n => names.indexOf(n));
    const index = { component_names: names, files: [
      { name: '[Core] 결제/구독 ⚜️', key: 'PAY', screen_components: [{ id: 'a', name: '결제', c: idx(['상단바', '버튼', '결제카드', '요금제셀']) }, { id: 'b', name: '구독', c: idx(['상단바', '결제카드']) }] },
      { name: '[Core] 콘상페 ⚜️', key: 'DET', screen_components: [{ id: 'c', name: '콘텐츠 상세', c: idx(['상단바', '버튼', '포스터', '회차목록', '별점']) }, { id: 'd', name: '상세 2', c: idx(['상단바', '포스터']) }] },
    ] };
    const picks = { P1: ['상단바', '버튼', '결제카드', '요금제셀'].map(H), P0: ['상단바', '버튼', '포스터', '회차목록', '별점'].map(H), P9: ['상단바', '버튼'].map(H), P8: ['없는것'].map(H) };
    const sc = screenCores(picks, index, { strong: 0.7, near: 0.05 });
    assert.strictEqual(sc.P1.best.name, '[Core] 결제/구독 ⚜️'); assert.strictEqual(sc.P0.best.name, '[Core] 콘상페 ⚜️');
    assert.strictEqual(sc.P8.best.v, 0, '색인에 없는 컴포넌트만 있으면 어느 Core와도 겹침 0');
    const skip = foreignScreens(sc, '[Core] 결제/구독', { strong: 0.7, near: 0.05 });
    assert.deepStrictEqual(Object.keys(skip), ['P0'], '콘상페 화면만 다른 Core로 가림 (공통 컴포넌트만 있는 P9는 두 Core가 비슷해 가리지 않음)');
    assert.strictEqual(skip.P0.core, '[Core] 콘상페 ⚜️');
    assert.deepStrictEqual(foreignScreens(sc, '[Core] 콘상페 ⚜️', { strong: 0.7, near: 0.05 }) && Object.keys(foreignScreens(sc, '[Core] 콘상페 ⚜️', { strong: 0.7, near: 0.05 })), ['P1'], '콘상페 Core를 고칠 때는 결제 화면이 빠짐');
    const d = { rows: [{ action: '추가', platform: 'WEB', cls: 'large', width: 1280, desc: '1280~', source: { id: 'P1', name: '패키지 결제', w: 1280, h: 900, sig: 's1' }, target: null, beside: { id: 'C1' } }], missing: [], summary: { add: 1 } };
    const reads = [{ platform: 'WEB', width: 1280, total: 3, frames: [{ id: 'P0', name: '콘텐츠 상세 페이지', w: 1280, h: 832, sig: 's0' }, { id: 'P1', name: '패키지 결제', w: 1280, h: 900, sig: 's1' }] }];
    const g = addGroups(d, reads, '패키지 인지', skip);
    assert.deepStrictEqual(g.rows[0].sources.map(f => f.id), ['P1'], '다른 Core 화면은 묶음에서 빠짐');
    assert(g.rows[0].why.includes('콘텐츠 상세 페이지') && g.rows[0].why.includes('[Core] 콘상페'), '뺀 화면과 그 Core를 표에 적음');
    // 대표로 고른 화면까지 다른 Core 것이면 그 폭은 넣지 않고 확인 칸으로
    const g2 = addGroups(d, reads, '패키지 인지', { P0: skip.P0, P1: { core: '[Core] 콘상페 ⚜️' } });
    assert(g2.rows[0].action === '그대로' && g2.rows[0].check && !g2.rows[0].source && g2.summary.addGroup === 0 && g2.summary.untouched === 1, '넣을 화면이 없으면 그대로(확인)');
  }
  // 반영: 새 묶음은 섹션 맨 아래에 ⚪ 바 + 폭마다 한 줄, 기존 줄은 건드리지 않음
  {
    let seq = 0;
    const node = (type, name, props = {}) => {
      const n = Object.assign({ id: 'n' + (++seq), type, name, width: 0, height: 0, x: 0, y: 0, children: [], parent: null, removed: false }, props);
      n.appendChild = (c) => { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = n; n.children.push(c); };
      n.remove = () => { if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1); n.parent = null; n.removed = true; };
      n.resizeWithoutConstraints = (w, h) => { n.width = w; n.height = h; };
      const all = (ok) => { const out = []; const w = (x) => { for (const c of x.children) { if (ok(c)) out.push(c); w(c); } }; w(n); return out; };
      n.findAll = (ok) => all(ok); n.findOne = (ok) => all(ok)[0] || null;
      n.findAllWithCriteria = ({ types }) => all(c => types.includes(c.type));
      return n;
    };
    const kid = (parent, c) => { parent.appendChild(c); return c; };
    const screen = (w, h, text) => { const f = node('FRAME', 's', { width: w, height: h }); kid(f, node('TEXT', 't', { characters: text })); return f; };
    const { SIG_FN } = require('../engine/signature');
    const page = node('PAGE', '🌏 마스터 파일'); const root = kid(page, node('SECTION', '🌏 결제')); const app = kid(root, node('SECTION', 'APP'));
    const inst = (name, x, y, w, h, title) => { const i = node('INSTANCE', name, { x, y, width: w, height: h }); i.resize = (W, H) => { i.width = W; i.height = H; }; if (title) kid(i, node('TEXT', '제목', { characters: title })); return i; };
    const topBar = kid(app, inst('스크린 설명 컴포넌트', 60, 126, 800, 96, '결제'));
    const whiteT = kid(app, inst('스크린 설명 컴포넌트', 60, 254, 375, 62, '결제')), blueT = kid(app, inst('스크린 설명 컴포넌트', 60, 348, 1189, 62, 'small'));
    const clone = (n) => { const c = node(n.type, n.name, { x: n.x, y: n.y, width: n.width, height: n.height }); c.resize = (W, H) => { c.width = W; c.height = H; }; for (const k of n.children) kid(c, node(k.type, k.name, { characters: k.characters, getStyledTextSegments: () => [] })); return c; };
    whiteT.clone = () => clone(whiteT); blueT.clone = () => { const c = clone(blueT); c.resize = (W, H) => { c.width = W; c.height = W < 200 ? 368 : H; }; return c; };   // 실제 Figma: 좁으면 글자가 줄바꿈돼 높이가 부푼다
    const old1 = kid(app, Object.assign(screen(375, 2097, '결제페이지'), { x: 60, y: 440 })), old2 = kid(app, Object.assign(screen(768, 2097, '결제페이지'), { x: 467, y: 440 }));
    const paste = kid(page, node('SECTION', '✅ Mobile'));
    const news = ['콘상페', '단건 결제 페이지', '패키지 팝업'].map(t => kid(paste, screen(375, 812, t)));
    const nm = kid(paste, screen(768, 812, '패키지 팝업 medium'));
    const sigOf = new Function(SIG_FN + 'return sig;')();
    const made = [];
    const fig = { fileKey: 'BRANCH', root: { children: [page] }, getNodeByIdAsync: async (id) => (id === whiteT.id ? whiteT : id === blueT.id ? blueT : null),
      importComponentByKeyAsync: async (key) => ({ createInstance: () => { const i = inst(key === rules.components.barWhite ? '⚪' : '🔵', 0, 0, 100, key === rules.components.barWhite ? 60 : 40); kid(i, node('TEXT', '제목', { characters: '', getStyledTextSegments: () => [] })); made.push(i); return i; } }) };
    page.loadAsync = async () => {};
    const src = (f) => ({ id: 'P' + f.id, name: f.children[0].characters, w: f.width, h: f.height, sig: sigOf(f) });
    const plan = { coreKey: 'CORE', coreScreenIds: [old1.id, old2.id], month: null, keepTop: [root.id], rows: [
      { action: '묶음 추가', platform: 'APP', cls: 'small', width: 375, desc: '~767', group: { title: '패키지 인지 시키기' }, sources: news.map(src), sizeBar: blueT.id, groupBar: whiteT.id },
      { action: '묶음 추가', platform: 'APP', cls: 'medium', width: 768, desc: '768~', group: { title: '패키지 인지 시키기' }, sources: [src(nm)], sizeBar: null, groupBar: whiteT.id }] };
    const out = await new AsyncFn('figma', applyUpdateCode(rules, plan))(fig);
    assert.strictEqual(out.done.filter(x => x.action === '묶음 추가').length, 4, '시안 4장을 새 묶음에 넣음');
    assert(old1.x === 60 && old1.y === 440 && old2.x === 467 && old1.children[0].characters === '결제페이지', '기존 줄은 그대로');
    assert.strictEqual(made.length, 1, '본보기가 있는 바는 복제하고(⚪·small 🔵), 없는 medium 🔵만 앱 기본 모양으로 만듦');
    const white = app.children.find(i => i.type === 'INSTANCE' && i !== whiteT && i !== blueT && i !== topBar && i.height === 62 && i.children[0] && i.children[0].characters === '패키지 인지 시키기');
    assert(white && white.parent === app && white.y >= 440 + 2097 && white.x === 60, '⚪ 묶음 바는 기존 ⚪ 바를 복제해 섹션 맨 아래, 왼쪽 맞춤');
    const blues = app.children.filter(i => i.type === 'INSTANCE' && i !== whiteT && i !== blueT && i !== topBar && i !== white);
    assert(blues.length === 2 && blues[0].children[0].characters === 'small' && blues[0].width === 874 + 375 - 60, '375 줄 🔵 바는 기존 바 복제, 제목 그대로, 줄 전체 폭');
    assert.strictEqual(blues[0].height, 62, '🔵 바 높이는 본보기 그대로 (2026-10-30: 폭 100으로 만들었다 늘려 368px로 부풀었던 버그)');
    assert.strictEqual(news[0].y, white.y + 62 + 40 + 62 + 16, '화면은 ⚪ 바 → 40 → 🔵 바 → 16 아래, 간격이 벌어지지 않음');
    assert(whiteT.width === 375 && blueT.width === 1189, '본보기 바는 그대로');
    assert.strictEqual(white.children[0].characters, '패키지 인지 시키기', '⚪ 바 제목 = 프로젝트 이름');
    assert.deepStrictEqual(news.map(f => f.x), [60, 467, 874], '375 줄은 한 줄로');
    assert(news.every(f => f.parent === app && f.y > white.y), '새 화면은 APP 섹션, 바 아래');
    assert(nm.y > news[0].y + 812, '768 줄은 그 아래 줄');
    assert.strictEqual(white.width, 874 + 375 - 60, '⚪ 바 폭 = 가장 넓은 줄');
    assert(made[0].name === '🔵' && made[0].width === 768, 'medium 줄 🔵 바는 줄 폭');
    assert(paste.removed, '남은 붙여넣기는 지움');
    assert(app.height >= nm.y + 812, '섹션이 새 묶음까지 커짐');
  }
  console.log('엔진 시험 통과');
})().catch((e) => { console.error(e); process.exit(1); });
