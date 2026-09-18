// Core 도우미 — Figma 플러그인 본체 (메인 스레드). 규칙은 rules.json, 판별 자료는 core-index.json.
// 흐름: [프로젝트 파일] 분석 → 판별 → 계획 저장 → (사람: 파일 복제 or ⌘C·⌘V) → [복제본/Core 파일] 계획 이어받아 실행.
// 원칙: 화면은 clone()으로 그대로(같은 파일 안), 파일 경계는 사람 손 1회, 규칙에 없으면 멈추고 사람에게.

const STORE_PLAN = 'core-helper:plan';
const STORE_RULES = 'core-helper:rules';
const STORE_INDEX = 'core-helper:index';

let RULES = null, INDEX = null;

figma.showUI(__html__, { width: 420, height: 640, themeColors: true });

// ---------- 유틸 ----------
const rgb = (a) => ({ r: a[0] / 255, g: a[1] / 255, b: a[2] / 255 });
const post = (type, payload) => figma.ui.postMessage(Object.assign({ type }, payload || {}));
const log = (msg) => post('log', { msg });
async function loadPages() { for (const p of figma.root.children) { try { await p.loadAsync(); } catch (e) {} } }
async function loadFont(style) {
  const f = { family: 'Pretendard JP', style }; try { await figma.loadFontAsync(f); return f; }
  catch (e) { const g = { family: 'Inter', style: style === 'Bold' ? 'Bold' : 'Regular' }; await figma.loadFontAsync(g); return g; }
}
async function loadTextFonts(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
function pageByName(name) { return figma.root.children.find(p => p.name.trim() === name.trim()); }
function frameWidthMatch(n, w) { return Math.abs(n.width - w) < 0.5; }

// ---------- 0. 학습 기억 ----------
// "진행"을 누른 결과는 정답이 아니라 **가설**이다(마구 누를 수도 있으므로). 가설은 대기함(pending)에 쌓이고,
// 프로젝트 N개(rules.review.everyRuns)마다 검토자(Ken)가 목록을 보고 항목별로 승인/거절한다. 승인된 것만 기억이 되어 다음 판단에 쓰인다.
// 저장 위치 3곳을 합친다: (1) 이 사용자 clientStorage (2) 지금 파일 sharedPluginData — Duplicate·브랜치에 따라가고 파일을 여는 모두가 씀
//   (3) GitHub plugin/memory.json 공유본("기억 내보내기" → 커밋). 다른 노트북의 가설은 "가설 가져오기"로 붙여 넣어 검토한다.
const STORE_MEM = 'core-helper:memory';
const PD_NS = 'core-helper', PD_KEY = 'memory', PD_BUILD = 'build';
let MEM = null;
const TABLES = ['sections', 'sectionTokens', 'frameNames', 'frameTokens', 'judgeWords', 'kinds', 'rejected'];
const emptyMem = () => ({ v: 2, sections: {}, sectionTokens: {}, frameNames: {}, frameTokens: {}, judgeWords: {}, kinds: {}, rejected: {}, pending: [], history: [], count: 0, updatedAt: null });
const tokens = (s) => String(s || '').toLowerCase().split(/[^0-9a-z가-힣~]+/).filter(t => t.length >= 2);
const judgeTokens = (s) => tokens(s).filter(t => !((RULES.judge && RULES.judge.stopWords) || []).includes(t));
const bump = (obj, k, v) => { obj[k] = Math.round(((obj[k] || 0) + v) * 1000) / 1000; };
const bump2 = (obj, k1, k2, v) => { obj[k1] = obj[k1] || {}; bump(obj[k1], k2, v); };
const argmax = (o) => { let best = null, bv = -Infinity, second = -Infinity; for (const k in o || {}) { if (o[k] > bv) { second = bv; bv = o[k]; best = k; } else if (o[k] > second) second = o[k]; } return best == null ? null : { key: best, score: bv, margin: bv - (second === -Infinity ? 0 : second) }; };
const decided = (e) => (e.items || []).filter(i => i.decision).length;
function mergeMem(a, b) {
  if (!b) return a;
  const deep = (x, y) => { for (const k in y) { if (typeof y[k] === 'number') bump(x, k, y[k]); else if (y[k] && typeof y[k] === 'object') { x[k] = x[k] || {}; deep(x[k], y[k]); } } };
  for (const f of TABLES) { a[f] = a[f] || {}; deep(a[f], b[f] || {}); }
  // 대기함: 같은 id면 결정이 더 많이 된 쪽·결과(outcome)가 있는 쪽이 이긴다. 최근 100건
  const byId = {}; for (const e of (a.pending || []).concat(b.pending || [])) { if (!e || !e.id) continue; const cur = byId[e.id]; if (!cur || (e.rev || 0) > (cur.rev || 0) || ((e.rev || 0) === (cur.rev || 0) && (decided(e) > decided(cur) || (!cur.outcome && e.outcome)))) byId[e.id] = e; }
  a.pending = Object.values(byId).sort((x, y) => (x.date < y.date ? -1 : 1)).slice(-100);
  // 채점표: 같은 id면 최신 것
  const hid = {}; for (const h of (a.history || []).concat(b.history || [])) { if (h && h.id) hid[h.id] = h; }
  a.history = Object.values(hid).sort((x, y) => (x.date < y.date ? -1 : 1)).slice(-60);
  a.count = (a.count || 0) + (b.count || 0);
  if (!a.updatedAt || (b.updatedAt && b.updatedAt > a.updatedAt)) a.updatedAt = b.updatedAt;
  return a;
}
async function loadMemory(shared) {
  const mem = emptyMem();
  mergeMem(mem, shared);
  try { const s = figma.root.getSharedPluginData(PD_NS, PD_KEY); if (s) mergeMem(mem, JSON.parse(s)); } catch (e) {}
  try { mergeMem(mem, await figma.clientStorage.getAsync(STORE_MEM)); } catch (e) {}
  MEM = mem; return mem;
}
// 조각(delta)만 세 곳에 더한다 — 기억 전체가 아니라 조각을 더해야 합칠 때 두 번 세지 않는다
async function saveMem(delta, countAs) {
  delta.count = countAs == null ? 0 : countAs; delta.updatedAt = new Date().toISOString();
  mergeMem(MEM, delta);
  const local = mergeMem((await figma.clientStorage.getAsync(STORE_MEM)) || emptyMem(), delta);
  await figma.clientStorage.setAsync(STORE_MEM, local);
  let inFile = emptyMem(); try { const s = figma.root.getSharedPluginData(PD_NS, PD_KEY); if (s) inFile = JSON.parse(s); } catch (e) {}
  figma.root.setSharedPluginData(PD_NS, PD_KEY, JSON.stringify(mergeMem(inFile, delta)));
}
const scaleMem = (d, w) => { const out = JSON.parse(JSON.stringify(d)); const deep = (x) => { for (const k in x) { if (typeof x[k] === 'number') x[k] = Math.round(x[k] * w * 1000) / 1000; else if (x[k] && typeof x[k] === 'object') deep(x[k]); } }; for (const f of TABLES) if (out[f]) deep(out[f]); return out; };
const userName = () => (figma.currentUser && figma.currentUser.name) || '(이름 없음)';
const isReviewer = () => { const r = ((RULES.review && RULES.review.reviewers) || []).map(x => String(x).trim().toLowerCase()); return !r.length || r.includes(userName().trim().toLowerCase()); };

// 가설 항목 → 기억 조각. 승인될 때만 이 조각이 기억에 더해진다
function itemDelta(it) {
  const d = emptyMem(); delete d.count; delete d.updatedAt; delete d.pending; delete d.history;
  if (it.kind === 'section') {
    d.sections[it.platform] = {}; bump2(d.sections[it.platform], it.name.trim().toLowerCase(), it.cls, 1);
    d.sectionTokens[it.platform] = {}; for (const t of tokens(it.name)) bump2(d.sectionTokens[it.platform], t, it.cls, 1);
  }
  if (it.kind === 'frame') {
    bump(d.frameNames, it.name.trim().toLowerCase(), 1); for (const t of tokens(it.name)) bump(d.frameTokens, t, 0.5);
    for (const o of it.over || []) { bump(d.frameNames, o.trim().toLowerCase(), -0.5); for (const t of tokens(o)) bump(d.frameTokens, t, -0.25); }
  }
  if (it.kind === 'judge') for (const w of it.words) bump2(d.judgeWords, w, it.target, 1);
  if (it.kind === 'kind') { bump2(d.kinds, it.signature, it.value, 1); d.sectionTokens.__pages = {}; for (const n of it.pageNames) for (const t of tokens(n)) bump2(d.sectionTokens.__pages, t, it.value, 1); }
  return d;
}
// 검토할 때가 됐나: 결정 안 된 항목이 남은 실행(프로젝트)이 N개 이상
function reviewState() {
  const open = (MEM.pending || []).filter(e => (e.items || []).some(i => !i.decision));
  const every = (RULES.review && RULES.review.everyRuns) || 3;
  return { due: open.length >= every, openRuns: open.length, openItems: open.reduce((s, e) => s + e.items.filter(i => !i.decision).length, 0), every, reviewer: isReviewer(), user: userName() };
}
// 채점표: 살펴본 실행에서 제안 vs 최종 채택. 빠른 진행은 안 센다
function scorecard() {
  const all = (MEM.history || []).slice(-10);
  const h = all.filter(r => !r.careless);
  const sum = (k) => h.reduce((s, r) => s + (r[k] || 0), 0);
  const picks = sum('picks'), hit = sum('hit'), fixed = sum('fixed'), fixedLearned = sum('fixedLearned'), unsure = sum('unsure');
  const half = Math.floor(h.length / 2);
  const rate = (arr) => { const p = arr.reduce((s, r) => s + (r.picks || 0), 0); return p ? arr.reduce((s, r) => s + (r.hit || 0), 0) / p : null; };
  const early = h.length >= 4 ? rate(h.slice(0, half)) : null, late = h.length >= 4 ? rate(h.slice(half)) : null;
  const judged = h.filter(r => r.judgeHit != null); const judgeHit = judged.filter(r => r.judgeHit).length;
  const careless = all.filter(r => r.careless).length;
  const pend = MEM.pending || [];
  const items = pend.reduce((s, e) => s + e.items.length, 0), approved = pend.reduce((s, e) => s + e.items.filter(i => i.decision === 'approve').length, 0), rejected = pend.reduce((s, e) => s + e.items.filter(i => i.decision === 'reject').length, 0);
  const changed = pend.filter(e => e.outcome === 'changed').length, kept = pend.filter(e => e.outcome === 'kept').length;
  const conflicts = [];
  for (const pf in MEM.sections) for (const name in MEM.sections[pf]) { const a = argmax(MEM.sections[pf][name]); if (a && a.margin < 1 && Object.keys(MEM.sections[pf][name]).length > 1) conflicts.push(`${pf} 섹션 "${name}" → ${Object.entries(MEM.sections[pf][name]).map(([k, v]) => k + ' ' + v).join(' / ')}`); }
  for (const w in MEM.judgeWords) { const a = argmax(MEM.judgeWords[w]); if (a && a.margin < 1 && Object.keys(MEM.judgeWords[w]).length > 1) conflicts.push(`낱말 "${w}" → ${Object.keys(MEM.judgeWords[w]).join(' / ')}`); }
  let verdict = '데이터 부족 (살펴본 실행 3회 이상이면 판단)';
  if (changed && pend.slice(-3).some(e => e.outcome === 'changed')) verdict = '⚠ 최근 만든 마스터가 나중에 바뀜 — 그 실행의 가설은 믿지 말 것';
  else if (careless >= 3 && careless > h.length) verdict = '⚠ 빠른 진행이 대부분 — 살펴보지 않은 실행은 채점하지 않음';
  else if (h.length >= 3) {
    if (fixedLearned > 0 && h.slice(-3).some(r => r.fixedLearned)) verdict = '⚠ 승인된 기억으로 제안한 것을 사람이 고쳤음 — 잘못 승인된 항목이 있음';
    else if (conflicts.length) verdict = '⚠ 기억이 갈리는 항목 있음';
    else if (late != null && early != null && late < early - 0.1) verdict = '⚠ 적중률이 내려가는 중';
    else if (picks && hit / picks >= 0.9) verdict = '✓ 잘 가는 중 — 제안 대부분이 그대로 채택됨';
    else if (late != null && early != null && late > early) verdict = '✓ 나아지는 중';
    else verdict = '보통 — 고침이 아직 많음';
  }
  return { runs: h.length, careless, picks, hit, fixed, fixedLearned, unsure, early, late, judged: judged.length, judgeHit, items, approved, rejected, kept, changed, conflicts: conflicts.slice(0, 10), verdict, total: MEM.count };
}
const classNames = () => { const o = {}; for (const pf in RULES.sizeClasses) o[pf] = RULES.sizeClasses[pf].classes.map(c => c.name); return o; };
// 학습 점수: 이름 그대로 맞은 것 + 낱말 투표 (승인된 기억만 들어 있다)
function learnedVote(exactTable, tokenTable, name) {
  const votes = {};
  const ex = exactTable && exactTable[name.trim().toLowerCase()]; if (ex) for (const k in ex) bump(votes, k, ex[k] * 3);
  for (const t of tokens(name)) { const tv = tokenTable && tokenTable[t]; if (tv) for (const k in tv) bump(votes, k, tv[k]); }
  return votes;
}
// 만든 마스터가 나중에도 그대로인가 — 가설을 믿을 근거. 하루 뒤 또는 다른 사람이 열었을 때 한 번 본다
async function checkBuildOutcome() {
  let rec = null; try { const s = figma.root.getSharedPluginData(PD_NS, PD_BUILD); if (s) rec = JSON.parse(s); } catch (e) {}
  if (!rec || !rec.entryId) return null;
  const aged = Date.now() - Date.parse(rec.date) > 24 * 3600 * 1000, other = rec.user !== userName();
  if (!aged && !other) return { waiting: true };
  await loadPages();
  let kept = 0;
  for (const s of rec.screens) { const n = await figma.getNodeByIdAsync(s.id); if (n && !n.removed && n.name === s.name && Math.round(n.width) === s.w && Math.round(n.height) === s.h) kept++; }
  const outcome = kept === rec.screens.length ? 'kept' : 'changed';
  const e = (MEM.pending || []).find(x => x.id === rec.entryId);
  if (e) { e.rev = (e.rev || 0) + 1; e.outcome = outcome; e.outcomeNote = `${kept}/${rec.screens.length} 화면 그대로 (${other ? userName() + ' 확인' : '하루 뒤 자동 확인'})`; await saveMem({ pending: [e] }); }
  figma.root.setSharedPluginData(PD_NS, PD_BUILD, '');
  return { outcome, kept, total: rec.screens.length };
}

// ---------- 1. 파일 종류 ----------
function pageSignature() { return figma.root.children.map(p => p.name.trim()).filter(n => !/^-+$/.test(n)).sort().join(' | ').toLowerCase(); }
async function detectFileKind() {
  await loadPages();
  const names = figma.root.children.map(p => p.name.trim());
  const fk = RULES.fileKind;
  const learned = MEM && MEM.kinds[pageSignature()]; if (learned) { const a = argmax(learned); if (a) return a.key; }
  if (names.includes(fk.corePageName)) return 'core';
  if (fk.projectPagePatterns.some(pat => names.some(n => n.includes(pat)))) return 'project';
  // 학습된 페이지 이름 낱말로 투표
  const votes = {}; for (const n of names) { const v = learnedVote(null, MEM && MEM.sectionTokens.__pages, n); for (const k in v) bump(votes, k, v[k]); }
  const a = argmax(votes); if (a && a.score >= 2 && a.margin >= 1) return a.key;
  return 'unknown';
}

// 커버에서 프로젝트 이름·담당·상태 읽기 (없으면 빈 값)
function readCover() {
  const cover = figma.root.children[0];
  const texts = cover.findAll(n => n.type === 'TEXT');
  const byName = (re) => { const t = texts.find(x => re.test(x.name)); return t ? t.characters.replace(/\s+/g, ' ').trim() : ''; };
  return {
    nameEN: byName(/Page Name\(EN\)/), nameKR: byName(/Page Name\(KR\)/),
    owner: byName(/담당|owner/i), badge: texts.map(t => t.characters).find(c => /Working|Final/.test(c)) || ''
  };
}

// ---------- 2. 분석: 사이즈 클래스마다 대표 화면 후보 ----------
function pickCandidates(section, width) {
  const sp = RULES.screenPick;
  const frames = section.findAll(n => n.type === 'FRAME' && frameWidthMatch(n, width) && n.height >= sp.minHeight);
  const score = (f) => {
    let s = 0, learned = 0;
    if (sp.preferNames.some(k => f.name.includes(k))) s += 2;
    if (f.name.trim() === String(width)) s += 2;
    if (sp.avoidNames.some(k => f.name.includes(k))) s -= 3;
    if (f.parent && f.parent.type === 'SECTION') s += 1;   // 섹션 직속 프레임 우선
    // 학습: 전에 사람이 고른(+)/안 고른(−) 화면 이름과 낱말
    learned += (MEM.frameNames[f.name.trim().toLowerCase()] || 0) * 2;
    for (const t of tokens(f.name)) learned += MEM.frameTokens[t] || 0;
    return { s: s + learned, learned };
  };
  return frames.map(f => { const sc = score(f); return { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), y: Math.round(f.absoluteTransform[1][2]), score: Math.round(sc.s * 10) / 10, learned: Math.round(sc.learned * 10) / 10 }; })
    .sort((a, b) => b.score - a.score || a.y - b.y);
}
// 섹션이 어느 크기 클래스인지: 학습(정확한 이름 → 낱말 투표) → 규칙 패턴
function classifySection(platform, cfg, secName) {
  const v = learnedVote(MEM.sections[platform], MEM.sectionTokens[platform], secName);
  const a = argmax(v);
  if (a && a.score >= 2 && a.margin >= 1 && cfg.classes.some(c => c.name === a.key)) return { cls: a.key, basis: '학습' };
  const byRule = cfg.classes.find(cls => cls.sectionPatterns.some(pat => secName.toLowerCase().includes(pat.toLowerCase())));
  if (byRule) return { cls: byRule.name, basis: '규칙' };
  if (a && a.score >= 1) return { cls: a.key, basis: '학습(약함)' };
  return null;
}

async function analyze() {
  const kind = await detectFileKind();
  const cover = readCover();
  const result = { kind, cover, fileName: figma.root.name, fileKey: figma.fileKey || null, platforms: {}, sections: [], missing: [] };
  if (kind !== 'project') return result;
  for (const platform of Object.keys(RULES.sizeClasses)) {
    const cfg = RULES.sizeClasses[platform];
    const page = figma.root.children.find(p => p.name.includes(cfg.pagePattern) && !p.name.includes('로컬'));
    if (!page) { result.missing.push(platform + ' 페이지 없음'); continue; }
    const sections = page.children.filter(n => n.type === 'SECTION');
    const secClass = {};   // 섹션 id → {cls, basis}
    for (const s of sections) { const c = classifySection(platform, cfg, s.name); if (c) secClass[s.id] = c; result.sections.push({ platform, id: s.id, name: s.name, frames: s.findAll(n => n.type === 'FRAME' && n.parent === s).length, cls: c ? c.cls : null, basis: c ? c.basis : null }); }
    const picks = [];
    for (const cls of cfg.classes) {
      const sec = sections.find(s => secClass[s.id] && secClass[s.id].cls === cls.name);
      const widths = [cls.width].concat(cls.extraWidths || []);
      const entry = { cls: cls.name, desc: cls.desc, section: sec ? { id: sec.id, name: sec.name, basis: secClass[sec.id].basis } : null, picks: [] };
      for (const w of widths) {
        const cands = sec ? pickCandidates(sec, w) : pickCandidates(page, w);
        // 확신: 1등과 2등 점수 차가 1 이상이면 자동, 아니면 "확인 필요"
        const sure = cands.length === 1 || (cands.length > 1 && cands[0].score - cands[1].score >= 1);
        entry.picks.push({ width: w, chosen: cands.length ? cands[0].id : null, candidates: cands.slice(0, 6), sure, basis: cands.length && cands[0].learned ? '학습' : '규칙' });
        if (!cands.length) result.missing.push(`${platform} ${cls.name} ${w}px 화면을 못 찾음`);
        else if (!sure) result.unsure = (result.unsure || 0) + 1;
      }
      picks.push(entry);
    }
    result.platforms[platform] = picks;
  }
  // 수록 대조표: 문서의 모든 섹션이 어느 크기에 갔는지
  result.coverage = result.sections.map(s => {
    const hit = Object.values(result.platforms).flat().find(e => e.section && e.section.id === s.id);
    return { section: `${s.platform} > ${s.name}`, id: s.id, platform: s.platform, to: hit ? `${s.platform} > ${hit.cls}` : '', cls: hit ? hit.cls : (s.cls || ''), basis: s.basis || '', note: hit ? '' : (s.cls ? '(같은 크기 섹션이 이미 있음)' : '미수록 — 이 섹션이 어느 크기인지 골라 주면 기억합니다') };
  });
  result.memoryCount = MEM.count;
  return result;
}

// ---------- 2′. 가설: 저장된 계획에서 "배울 수도 있는 것"을 항목으로 뽑는다 (바로 배우지 않는다) ----------
// 얼마나 살펴보고 눌렀나: 확인 필요 항목을 하나도 안 건드리고 15초 안에, 또는 5초 안에 → 빠른 진행(검토자에게 표시, 채점에서 제외)
function planCare(care) {
  const c = care || {}; const sec = c.seconds || 0;
  return { seconds: sec, careless: sec < 5 || (c.unsureCount > 0 && !c.touchedUnsure && sec < 15), unsureCount: c.unsureCount || 0, touchedUnsure: !!c.touchedUnsure };
}
function hypothesesFromPlan(plan, care) {
  const C = planCare(care);
  const items = []; const seen = {};
  const add = (it) => { if (seen[it.key]) return; seen[it.key] = 1; it.decision = null; if (MEM.rejected[it.key]) it.rejectedBefore = MEM.rejected[it.key]; items.push(it); };
  const score = { id: (plan.savedAt || new Date().toISOString()) + ' ' + plan.sourceFileName, date: plan.savedAt || new Date().toISOString(), file: plan.sourceFileName, picks: 0, hit: 0, fixed: 0, fixedLearned: 0, unsure: 0, judgeHit: plan.judgeProposed ? (plan.judgeProposed === plan.mode ? 1 : 0) : null, careless: C.careless };
  for (const platform of Object.keys(plan.platforms || {})) {
    for (const e of plan.platforms[platform]) {
      if (e.section) add({ key: `sec|${platform}|${e.section.name.trim().toLowerCase()}|${e.cls}`, kind: 'section', platform, name: e.section.name, cls: e.cls, text: `${platform} 섹션 "${e.section.name}" → ${e.cls}`, note: e.section.basis === '규칙' ? '규칙과 같음' : e.section.basis });
      for (const p of e.picks) {
        if (!p.chosen) continue;
        const chosen = p.candidates.find(c => c.id === p.chosen); if (!chosen) continue;
        score.picks++;
        const hit = !p.proposed || p.proposed === p.chosen;
        if (hit) score.hit++; else { score.fixed++; if (p.basis === '학습') score.fixedLearned++; }
        if (p.sure === false) score.unsure++;
        const over = []; for (const c of p.candidates) { if (c.id === p.chosen) break; over.push(c.name); }
        add({ key: `frame|${chosen.name.trim().toLowerCase()}|${over.map(o => o.trim().toLowerCase()).join(',')}`, kind: 'frame', platform, cls: e.cls, width: p.width, name: chosen.name, over, text: `${platform} ${e.cls} ${p.width}px 대표 = "${chosen.name}"${over.length ? ` (제친 것: ${over.join(', ')})` : ''}`, note: hit ? (p.sure ? '제안 그대로' : '확인 필요였음 · 제안 그대로') : '사람이 바꿈' });
      }
    }
  }
  for (const c of plan.coverage || []) if (c.userCls) { const name = c.section.replace(/^[^>]*> /, ''); add({ key: `sec|${c.platform}|${name.trim().toLowerCase()}|${c.userCls}`, kind: 'section', platform: c.platform, name, cls: c.userCls, text: `${c.platform} 섹션 "${name}" → ${c.userCls}`, note: '미수록 섹션을 사람이 지정' }); }
  const target = plan.mode === 'update' ? plan.targetCore : ('[Core] ' + plan.projectName);
  const words = judgeTokens(plan.judgeWords || plan.projectName);
  if (target && words.length) add({ key: `judge|${words.join(' ')}|${target}`, kind: 'judge', words, target, text: `이름 낱말 [${words.join(', ')}] → ${target}${plan.mode === 'new' ? ' (새 Core)' : ''}`, note: plan.judgeBasis === '자동' ? '판별 자동' : '판별 확인 필요였음' });
  const entry = { id: score.id, date: score.date, file: plan.sourceFileName, fileKey: plan.sourceFileKey || null, user: userName(), mode: plan.mode, target, seconds: C.seconds, careless: C.careless, unsureCount: C.unsureCount, touchedUnsure: C.touchedUnsure, items, outcome: null };
  return { entry, score };
}
// 검토 결정 적용: 승인 → 기억에 더함, 거절 → 다시 제안하지 않도록 기록, 보류 → 그대로
async function decide(entryId, key, decision) {
  const e = (MEM.pending || []).find(x => x.id === entryId); if (!e) throw new Error('대기 항목을 찾지 못함');
  const it = e.items.find(i => i.key === key); if (!it) throw new Error('항목을 찾지 못함');
  if (it.decision === decision) return;
  const prev = it.decision; e.rev = (e.rev || 0) + 1;
  const delta = emptyMem(); delete delta.count; delete delta.updatedAt; delete delta.history;
  // 이전 결정을 되돌린다
  if (it.decision === 'approve') mergeMem(delta, scaleMem(itemDelta(it), -1));
  if (it.decision === 'reject') bump(delta.rejected, key, -1);
  it.decision = decision === 'hold' ? null : decision; it.decidedBy = userName(); it.decidedAt = new Date().toISOString();
  if (decision === 'approve') mergeMem(delta, itemDelta(it));
  if (decision === 'reject') bump(delta.rejected, key, 1);
  delta.pending = [e];
  await saveMem(delta, (decision === 'approve' ? 1 : 0) - (prev === 'approve' ? 1 : 0));
}

// ---------- 3. 판별: 색인 대조 ----------
function judge(analysis) {
  const raw = analysis.cover.nameEN + ' ' + analysis.cover.nameKR + ' ' + analysis.fileName;
  const words = raw.split(/[\s\/·,()\-]+/).filter(w => w.length >= 2);
  const cores = (INDEX && INDEX.files) || [];
  const byName = {};
  for (const f of cores) {
    const hay = [f.name, ...(f.domain || []), JSON.stringify(f.master || {}), JSON.stringify(f.spec || {})].join(' ');
    let score = 0; const hits = [];
    for (const w of words) if (hay.includes(w)) { score++; hits.push(w); }
    byName[f.name] = { name: f.name, key: f.key, url: f.url, score, hits, learned: 0 };
  }
  // 학습: 전에 이런 낱말의 프로젝트를 어느 Core로 보냈나 (색인에 아직 없는 새 Core 이름도 후보가 된다)
  for (const t of judgeTokens(raw)) { const v = MEM.judgeWords[t]; if (!v) continue; for (const core in v) { byName[core] = byName[core] || { name: core, key: null, url: '', score: 0, hits: [], learned: 0 }; byName[core].learned += v[core]; byName[core].hits.push(t + '(학습)'); } }
  const scored = Object.values(byName).map(c => Object.assign(c, { total: c.score + c.learned })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const top = scored[0], second = scored[1];
  const auto = top && top.total >= RULES.judge.minScoreForAuto && (!second || top.total - second.total >= 1);
  const learnedNew = top && /^\[core\]/i.test(top.name) && !cores.some(f => f.name === top.name);
  return { candidates: scored.slice(0, 5), suggestion: auto ? 'update' : 'new', sure: !!auto || scored.length === 0, judgeWords: raw,
    reason: auto ? (learnedNew ? `전에 "${top.hits.join(', ')}" 프로젝트를 ${top.name}로 보냈음 (학습) — 색인에는 아직 없으니 새 Core로 만들었다면 그 파일을 업데이트` : `${top.name}과 "${top.hits.join(', ')}"가 맞음${top.learned ? ' (학습 ' + top.learned + '점 포함)' : ''}`)
      : (top ? '후보가 갈림 — 골라 주면 다음부터 기억합니다' : '색인·학습 어디에도 없는 이름 → 새 Core') };
}

// ---------- 4. 실행 (새 Core, 복제본 안) ----------
async function bar(kind, parent, x, y, w, title, desc) {
  const C = RULES.components;
  const comp = await figma.importComponentByKeyAsync(C[kind]);
  const i = comp.createInstance(); parent.appendChild(i);
  const props = {}; props[C.barProps.title] = true; props[C.barProps.desc] = !!desc;
  try { i.setProperties(props); } catch (e) { for (const k in props) { try { i.setProperties({ [k]: props[k] }); } catch (e2) {} } }
  const t = i.findOne(n => n.type === 'TEXT' && n.name === C.barTitleTextName);
  if (t) { await loadTextFonts(t); t.characters = title; }
  if (desc) {
    const others = i.findAll(n => n.type === 'TEXT' && n.name !== C.barTitleTextName);
    const d = others.find(n => /설명/.test(n.name)) || others[others.length - 1];
    if (d) { await loadTextFonts(d); d.characters = desc; }
    for (const s of i.findAll(n => n.type === 'INSTANCE' && n.componentProperties && Object.keys(n.componentProperties).some(k => k.startsWith(C.barDescShowTitlePrefix)))) {
      const key = Object.keys(s.componentProperties).find(k => k.startsWith(C.barDescShowTitlePrefix)); try { s.setProperties({ [key]: false }); } catch (e) {}
    }
  }
  i.layoutSizingHorizontal = 'FIXED'; i.resize(w, i.height); i.x = x; i.y = y;
  return i;
}
async function text(parent, chars, style, size, color, url) {
  const t = figma.createText(); parent.appendChild(t);
  t.fontName = await loadFont(style); t.characters = chars; t.fontSize = size;
  t.fills = [{ type: 'SOLID', color }]; t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (url) t.hyperlink = { type: 'URL', value: url };
  return t;
}
function section(name, parent, x, y, w, h, fill) {
  const s = figma.createSection(); s.name = name; parent.appendChild(s);
  s.x = x; s.y = y; s.resizeWithoutConstraints(w, h); s.fills = [{ type: 'SOLID', color: rgb(fill) }];
  try { s.cornerRadius = RULES.layout.radius; } catch (e) {}
  return s;
}
// B' 원본 대조: 원본/복사본 트리를 같은 순서로 걸어 크기·위치 차이를 원본 값으로
function diffFix(a, b, acc) {
  if (Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5) {
    try { if (b.type === 'TEXT') b.textAutoResize = 'NONE'; b.resize(a.width, a.height); acc.fixed++; } catch (e) { acc.failed++; }
  }
  const pb = b.parent, inLayout = pb && pb.type !== 'SECTION' && pb.layoutMode && pb.layoutMode !== 'NONE' && b.layoutPositioning !== 'ABSOLUTE';
  if (!inLayout && a.parent && a.parent.type !== 'PAGE' && pb && pb.type !== 'SECTION' && (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5)) { try { b.x = a.x; b.y = a.y; acc.fixed++; } catch (e) {} }
  if ('children' in a && 'children' in b) { const n = Math.min(a.children.length, b.children.length); for (let i = 0; i < n; i++) diffFix(a.children[i], b.children[i], acc); }
}
function diffCount(a, b) { let n = 0; const w = (x, y) => { if (Math.abs(x.width - y.width) > 0.5 || Math.abs(x.height - y.height) > 0.5) n++; if ('children' in x && 'children' in y) { const m = Math.min(x.children.length, y.children.length); for (let i = 0; i < m; i++) w(x.children[i], y.children[i]); } }; w(a, b); return n; }

async function buildNewCore(plan) {
  const L = RULES.layout, M = RULES.masterPage;
  await loadPages();
  // 0 확인: 복제본인가 (페이지 구성이 프로젝트 문서 형태이고, 원본 키와 다름)
  const kind = await detectFileKind();
  if (kind !== 'project') throw new Error('이 파일은 프로젝트 문서 복제본이 아닙니다 (마스터 페이지가 이미 있거나 구성이 다름)');
  if (plan.sourceFileKey && figma.fileKey && plan.sourceFileKey === figma.fileKey) throw new Error('원본 프로젝트 파일입니다. Duplicate한 복제본을 열어 주세요');
  if (figma.root.name === plan.sourceFileName && !/Copy|복사/.test(figma.root.name)) log('⚠ 파일 이름이 원본과 같습니다 — 복제본이 맞는지 확인하세요');

  const projName = plan.projectName || '프로젝트';
  log('A 뼈대');
  const page = figma.createPage(); page.name = M.name; figma.root.insertChild(M.insertIndex, page);
  await figma.setCurrentPageAsync(page);
  const root = section(M.rootPrefix + projName, page, 0, 0, 1000, 1000, L.fills.root);

  // 링크 카드
  const card = figma.createFrame(); card.name = '📎 스펙 링크 카드'; root.appendChild(card);
  card.layoutMode = 'VERTICAL'; card.itemSpacing = 16; card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24;
  card.primaryAxisSizingMode = 'AUTO'; card.counterAxisSizingMode = 'FIXED'; card.cornerRadius = 12; card.fills = [{ type: 'SOLID', color: rgb(L.fills.card) }];
  card.resize(L.cardSize[0], L.cardSize[1]); card.x = L.rootPadding; card.y = L.rootPadding;
  const white = { r: 1, g: 1, b: 1 }, grey = { r: .78, g: .78, b: .78 };
  const fill = (s) => s.replace('<프로젝트명>', projName).replace('<배포월>', plan.releaseMonth || '2026.__').replace('<담당자>', plan.owner || '');
  await text(card, projName, 'Bold', 18, white);
  await text(card, fill(RULES.linkCard.body), 'Regular', 14, white);
  await text(card, fill(RULES.linkCard.meta), 'Regular', 12, grey);
  try {
    const badge = (await figma.importComponentByKeyAsync(RULES.components.badge)).createInstance(); card.appendChild(badge);
    try { badge.setProperties({ '상태': '링크' }); } catch (e) {}
    const bt = badge.findOne(n => n.type === 'TEXT' && /링크/.test(n.characters));
    if (bt) { await loadTextFonts(bt); bt.characters = RULES.linkCard.badgeText; if (plan.sourceUrl) bt.hyperlink = { type: 'URL', value: plan.sourceUrl }; }
  } catch (e) { log('뱃지 컴포넌트 import 실패 — 카드에 링크 텍스트만'); await text(card, RULES.linkCard.badgeText, 'Bold', 14, { r: .47, g: .67, b: 1 }, plan.sourceUrl); }
  card.layoutSizingHorizontal = 'FIXED';

  // 섹션들
  let y = L.rootPadding + L.cardSize[1] + 80, maxW = 0;
  const allScreens = [];
  for (const platform of M.sections) {
    const picks = plan.platforms[platform]; if (!picks) continue;
    const sec = section(platform, root, L.rootPadding, y, 1000, 1000, L.fills.section);
    log(`${platform} 섹션`);
    // 화면 복제
    const screens = []; let x = L.sectionPadding;
    const barSizes = [];
    for (const entry of picks) {
      const startX = x; let clsW = 0;
      for (const p of entry.picks) {
        if (!p.chosen) continue;
        const src = await figma.getNodeByIdAsync(p.chosen); if (!src) { log(`⚠ 원본 없음 ${p.chosen}`); continue; }
        const c = src.clone(); sec.appendChild(c); c.name = RULES.screenPick.screenName.replace('<프로젝트명>', projName);
        c.x = x; c.y = 0;
        const acc = { fixed: 0, failed: 0 }; diffFix(src, c, acc); diffFix(src, c, acc);
        const left = diffCount(src, c);
        log(`  ${entry.cls} ${p.width}px 복제 · 대조 수정 ${acc.fixed} · 남은 차이 ${left}`);
        screens.push(c); allScreens.push(c); x += c.width + L.gap; clsW += c.width + L.gap;
      }
      if (clsW > 0) { barSizes.push({ entry, x: startX, w: clsW - L.gap }); }
    }
    const innerW = x - L.gap - L.sectionPadding;
    // 바 3단
    const barFile = await bar('barBlack', sec, L.sectionPadding, L.sectionPadding, innerW, projName, null);
    await bar('barWhite', sec, L.sectionPadding, L.barGroupY, innerW, RULES.screenPick.screenName.replace('<프로젝트명>', projName), null);
    let barBottom = L.barSizeY;
    for (const b of barSizes) { const bi = await bar('barBlue', sec, b.x, L.barSizeY, b.w, b.entry.cls, b.entry.desc); barBottom = Math.max(barBottom, L.barSizeY + bi.height); }
    const screenY = barBottom + L.gap; let bottom = screenY;
    for (const s of screens) { s.y = screenY; bottom = Math.max(bottom, s.y + s.height); }
    sec.resizeWithoutConstraints(innerW + L.sectionPadding * 2, bottom + L.sectionPadding);
    maxW = Math.max(maxW, sec.width); y += sec.height + L.sectionGap;
  }
  root.resizeWithoutConstraints(L.rootPadding * 2 + maxW, y - L.sectionGap + L.rootPadding);

  // F 깎기
  log('F 깎기');
  if (RULES.trim.detachLocalInstancesFirst) {
    let detached = 0;
    for (let round = 0; round < 6; round++) {
      const targets = [];
      for (const i of page.findAllWithCriteria({ types: ['INSTANCE'] })) { let mc = null; try { mc = await i.getMainComponentAsync(); } catch (e) {} if (mc && mc.remote === false) targets.push(i); }
      if (!targets.length) break;
      for (const i of targets) { if (i.removed) continue; try { i.detachInstance(); detached++; } catch (e) {} }
    }
    if (detached) log(`  로컬 컴포넌트 인스턴스 ${detached}개 분리`);
  }
  let seenSep = false; const removed = [];
  for (const p of [...figma.root.children]) {
    const n = p.name.trim();
    if (n === '---') { if (seenSep && RULES.trim.deleteExtraSeparators) { removed.push(n); p.remove(); } seenSep = true; continue; }
    if (RULES.trim.deletePages.some(d => n.startsWith(d))) { removed.push(n); p.remove(); }
  }
  log(`  삭제한 페이지: ${removed.join(', ') || '없음'}`);
  const order = RULES.trim.keepPages; let idx = 0;
  for (const nm of order) { const p = figma.root.children.find(c => c.name.trim() === nm); if (p) { figma.root.insertChild(idx, p); idx++; } }
  figma.viewport.scrollAndZoomIntoView([root]);
  if (plan.entryId) figma.root.setSharedPluginData(PD_NS, PD_BUILD, JSON.stringify({ entryId: plan.entryId, date: new Date().toISOString(), user: userName(), screens: allScreens.map(s => ({ id: s.id, name: s.name, w: Math.round(s.width), h: Math.round(s.height) })) }));
  return { pageId: page.id, rootId: root.id, screens: allScreens.length, pages: figma.root.children.map(p => p.name) };
}

// ---------- 4b. 기존 Core 업데이트 (v1: 붙여 넣은 화면 배치) ----------
async function placePasted(plan) {
  await loadPages();
  const sel = figma.currentPage.selection.filter(n => n.type === 'FRAME');
  if (!sel.length) throw new Error('붙여 넣은 화면을 선택한 상태에서 눌러 주세요 (⌘V 직후엔 자동 선택돼 있습니다)');
  const master = pageByName(RULES.masterPage.name);
  if (!master || figma.currentPage !== master) throw new Error(`Core 파일의 "${RULES.masterPage.name}" 페이지에서 실행해 주세요`);
  const secs = master.findAll(n => n.type === 'SECTION');
  const app = secs.find(s => s.name === 'APP'), web = secs.find(s => s.name === 'WEB');
  const placed = [];
  for (const f of sel) {
    const target = (f.width >= 1200 || /Web|GNB/i.test(f.name)) ? web : app;   // v1: 폭·이름으로만 나눔
    if (!target) continue;
    const right = Math.max(RULES.layout.sectionPadding, ...target.children.map(c => c.x + c.width + RULES.layout.gap));
    target.appendChild(f); f.x = right; f.y = RULES.layout.barSizeY + 122 + RULES.layout.gap;
    target.resizeWithoutConstraints(Math.max(target.width, f.x + f.width + RULES.layout.sectionPadding), Math.max(target.height, f.y + f.height + RULES.layout.sectionPadding));
    placed.push({ name: f.name, to: target.name });
  }
  return { placed, note: '유형 A/B(교체·설명 바·링크 카드·커버 로그)는 검증 전 — 자리 배치까지만 했습니다. 나머지는 사람이 확인' };
}

// ---------- 메시지 ----------
const readyPayload = async (extra) => Object.assign({ kind: await detectFileKind(), plan: (await figma.clientStorage.getAsync(STORE_PLAN)) || null, rulesVersion: RULES.version, fileName: figma.root.name, fileKey: figma.fileKey || null, hasIndex: !!INDEX, memoryCount: MEM.count, score: scorecard(), classes: classNames(), review: reviewState() }, extra || {});
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'init') {
      RULES = msg.rules || (await figma.clientStorage.getAsync(STORE_RULES));
      INDEX = msg.index || (await figma.clientStorage.getAsync(STORE_INDEX));
      if (msg.rules) await figma.clientStorage.setAsync(STORE_RULES, msg.rules);
      if (msg.index) await figma.clientStorage.setAsync(STORE_INDEX, msg.index);
      if (!RULES) return post('error', { msg: '규칙(rules.json)을 받지 못했습니다. 네트워크를 확인하세요' });
      await loadMemory(msg.memory);
      const outcome = await checkBuildOutcome();
      post('ready', await readyPayload({ outcome }));
    }
    if (msg.type === 'analyze') {
      const a = await analyze(); const j = a.kind === 'project' ? judge(a) : null;
      post('analysis', { analysis: a, judge: j });
    }
    if (msg.type === 'savePlan') {
      // 진행 = 가설 1묶음. 배우지 않고 대기함에 넣는다. 채점표에는 제안 vs 채택만 남긴다
      const { entry, score } = hypothesesFromPlan(msg.plan, msg.care);
      msg.plan.entryId = entry.id;
      await figma.clientStorage.setAsync(STORE_PLAN, msg.plan);
      await saveMem({ pending: [entry], history: [score] }, 0);
      if (isReviewer()) log(`가설 ${entry.items.length}건을 대기함에 넣었습니다${entry.careless ? ' (빠른 진행으로 표시)' : ''} — 승인한 것만 배웁니다`);
      post('planSaved', await readyPayload({ plan: msg.plan }));
    }
    if (msg.type === 'learnKind') {
      // "종류 모름" 파일을 사람이 지정: 이 파일에서는 바로 쓰고(이 파일의 기억), 전체 기억으로는 가설로 올린다
      const it = { key: `kind|${pageSignature()}|${msg.kind}`, kind: 'kind', signature: pageSignature(), pageNames: figma.root.children.map(p => p.name), value: msg.kind, text: `페이지 구성 [${figma.root.children.map(p => p.name).join(' | ')}] → ${msg.kind === 'project' ? '프로젝트 문서' : 'Core 파일'}`, note: '사람이 지정', decision: null };
      const entry = { id: new Date().toISOString() + ' ' + figma.root.name + ' kind', date: new Date().toISOString(), file: figma.root.name, fileKey: figma.fileKey || null, user: userName(), mode: 'kind', items: [it], outcome: null };
      mergeMem(MEM, itemDelta(it));   // 이 세션·이 파일에서만 바로 적용
      figma.root.setSharedPluginData(PD_NS, PD_KEY, JSON.stringify(mergeMem(JSON.parse(figma.root.getSharedPluginData(PD_NS, PD_KEY) || 'null') || emptyMem(), itemDelta(it))));
      await saveMem({ pending: [entry] }, 0);
      post('ready', await readyPayload());
    }
    if (msg.type === 'review') {
      const open = (MEM.pending || []).filter(e => e.items.some(i => !i.decision) || (msg.all && e.items.length));
      post('reviewList', { entries: open.slice(-30), state: reviewState() });
    }
    if (msg.type === 'decide') {
      if (!isReviewer()) throw new Error(`검토는 ${(RULES.review.reviewers || []).join(', ')}만 할 수 있습니다 (지금 사용자: ${userName()})`);
      for (const d of msg.decisions) await decide(d.entryId, d.key, d.decision);
      const open = (MEM.pending || []).filter(e => e.items.some(i => !i.decision));
      post('reviewList', { entries: open.slice(-30), state: reviewState(), score: scorecard(), memoryCount: MEM.count });
    }
    if (msg.type === 'importPending') {
      // 다른 노트북에서 내보낸 기억(JSON)의 대기함을 이쪽에 합친다 → 검토자가 한 곳에서 검토
      const m = JSON.parse(msg.json); const n = (m.pending || []).length;
      await saveMem({ pending: m.pending || [], history: m.history || [] }, 0);
      log(`가설 ${n}묶음을 가져왔습니다`);
      post('ready', await readyPayload());
    }
    if (msg.type === 'exportMemory') post('memory', { memory: MEM });
    if (msg.type === 'clearPlan') { await figma.clientStorage.deleteAsync(STORE_PLAN); post('ready', await readyPayload({ plan: null })); }
    if (msg.type === 'buildNewCore') {
      const plan = msg.plan || (await figma.clientStorage.getAsync(STORE_PLAN));
      if (!plan) throw new Error('저장된 계획이 없습니다. 프로젝트 파일에서 먼저 분석하세요');
      const r = await buildNewCore(plan); post('done', { result: r });
      figma.notify('Core 마스터 생성 완료');
    }
    if (msg.type === 'placePasted') {
      const plan = msg.plan || (await figma.clientStorage.getAsync(STORE_PLAN));
      const r = await placePasted(plan || {}); post('done', { result: r });
    }
    if (msg.type === 'select') { const n = await figma.getNodeByIdAsync(msg.id); if (n) { figma.currentPage.selection = [n]; figma.viewport.scrollAndZoomIntoView([n]); } }
    if (msg.type === 'selectPlanned') {
      // 갈래 2: Δ에 해당하는 원본 프레임을 선택해 둔다 → 사람이 ⌘C
      const plan = msg.plan || (await figma.clientStorage.getAsync(STORE_PLAN)); const nodes = [];
      for (const platform of Object.keys(plan.platforms || {})) for (const e of plan.platforms[platform]) for (const p of e.picks) { if (!p.chosen) continue; const n = await figma.getNodeByIdAsync(p.chosen); if (n) nodes.push(n); }
      if (!nodes.length) throw new Error('선택할 화면이 없습니다');
      const page = nodes[0].parent; let pg = page; while (pg && pg.type !== 'PAGE') pg = pg.parent;
      if (pg) await figma.setCurrentPageAsync(pg);
      figma.currentPage.selection = nodes.filter(n => { let q = n; while (q && q.type !== 'PAGE') q = q.parent; return q === figma.currentPage; });
      figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
      post('selected', { count: figma.currentPage.selection.length, total: nodes.length });
    }
    if (msg.type === 'close') figma.closePlugin();
  } catch (e) { post('error', { msg: String(e && e.message || e) }); }
};
