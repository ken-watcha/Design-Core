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
    assert.strictEqual(dd.rows.find(r => r.action === '교체').target.id, 'S1', '크기 칸 화면을 먼저 교체');
    const rep = dd.rows.find(r => r.target && r.target.id === 'REP');
    assert(rep.action === '그대로' && /대표 화면/.test(rep.why) && rep.check, '대표 화면은 그대로 + 확인 필요');
    // 같은 폭에 시안과 길이가 같은 피쳐링셀 화면이 있으면 홈 전체(4816)가 아니라 그 화면을 바꾼다 (2026-10-27 SVOD 영상 컨텐츠_small)
    const co2 = { platforms: { APP: { screens: co.platforms.APP.screens.concat([{ id: 'FC', name: '영상 컨텐츠_small', w: 375, h: 812, cls: 'small', bar: null, sig: 'c' }]) } } };
    const d2 = computeDelta(an, co2, {});
    assert.strictEqual(d2.rows.find(r => r.action === '교체').target.id, 'FC', '길이가 같은 화면을 교체');
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
    // 시안 화면을 하나라도 못 찾으면 묶음은 그대로
    const page4 = node('PAGE', '🌏 마스터 파일'); const root4 = kid(page4, node('SECTION', '🌏 SVOD')); const app4 = kid(root4, node('SECTION', 'APP'));
    const gb4 = kid(app4, inst('바', 0, 0, 800, 60, '피쳐링셀')); const o4 = kid(app4, Object.assign(screen(375, 812, '옛'), { x: 0, y: 140 }));
    page4.loadAsync = async () => {};
    const out4 = await new AsyncFn('figma', applyUpdateCode(rules, Object.assign({}, plan3, { keepTop: [root4.id], rows: [Object.assign({}, plan3.rows[0], { group: { id: gb4.id }, olds: [{ id: o4.id }] })] })))(
      Object.assign({}, fig3, { root: { children: [page4] }, getNodeByIdAsync: async (id) => (id === gb4.id ? gb4 : null) }));
    assert(!o4.removed && out4.done.length === 0 && /못 찾아/.test(out4.notFound.join()), '못 찾으면 지우지 않음');
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
  console.log('엔진 시험 통과');
})().catch((e) => { console.error(e); process.exit(1); });
