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
// 사람이 고른 결과(섹션→크기, 어떤 화면을 대표로, 어느 Core로, 파일 종류)를 셀 때마다 기록하고
// 다음 판단에서 규칙보다 먼저 쓴다. 저장 위치 3곳을 합친다:
//   (1) 이 사용자 clientStorage  (2) 지금 파일의 sharedPluginData — Duplicate·브랜치로 같이 따라가고 파일을 여는 모두가 씀
//   (3) GitHub plugin/memory.json — 여러 노트북의 기억을 합친 공유본("학습 내보내기"로 올림)
const STORE_MEM = 'core-helper:memory';
const PD_NS = 'core-helper', PD_KEY = 'memory';
let MEM = null;
const emptyMem = () => ({ v: 1, sections: {}, sectionTokens: {}, frameNames: {}, frameTokens: {}, judgeWords: {}, kinds: {}, history: [], count: 0, updatedAt: null });
const tokens = (s) => String(s || '').toLowerCase().split(/[^0-9a-z가-힣~]+/).filter(t => t.length >= 2);
const judgeTokens = (s) => tokens(s).filter(t => !((RULES.judge && RULES.judge.stopWords) || []).includes(t));
const bump = (obj, k, v) => { obj[k] = (obj[k] || 0) + v; };
const bump2 = (obj, k1, k2, v) => { obj[k1] = obj[k1] || {}; bump(obj[k1], k2, v); };
const argmax = (o) => { let best = null, bv = -Infinity, second = -Infinity; for (const k in o || {}) { if (o[k] > bv) { second = bv; bv = o[k]; best = k; } else if (o[k] > second) second = o[k]; } return best == null ? null : { key: best, score: bv, margin: bv - (second === -Infinity ? 0 : second) }; };
function mergeMem(a, b) {
  if (!b) return a;
  const deep = (x, y) => { for (const k in y) { if (typeof y[k] === 'number') bump(x, k, y[k]); else if (y[k] && typeof y[k] === 'object') { x[k] = x[k] || {}; deep(x[k], y[k]); } } };
  for (const f of ['sections', 'sectionTokens', 'frameNames', 'frameTokens', 'judgeWords', 'kinds']) { a[f] = a[f] || {}; deep(a[f], b[f] || {}); }
  // 채점표(history): 실행마다 "제안 vs 사람이 최종 고른 것" 기록. id로 합치고 최근 60건만
  const seen = {}; a.history = (a.history || []).concat(b.history || []).filter(h => h && !seen[h.id] && (seen[h.id] = 1)).sort((x, y) => (x.date < y.date ? -1 : 1)).slice(-60);
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
// 새로 배운 조각(delta)만 세 곳에 더한다 — 합칠 때 두 번 세지 않도록 기억 전체가 아니라 조각을 더한다
async function remember(delta) {
  delta.count = 1; delta.updatedAt = new Date().toISOString();
  mergeMem(MEM, delta);
  const local = mergeMem((await figma.clientStorage.getAsync(STORE_MEM)) || emptyMem(), delta);
  await figma.clientStorage.setAsync(STORE_MEM, local);
  let inFile = emptyMem(); try { const s = figma.root.getSharedPluginData(PD_NS, PD_KEY); if (s) inFile = JSON.parse(s); } catch (e) {}
  figma.root.setSharedPluginData(PD_NS, PD_KEY, JSON.stringify(mergeMem(inFile, delta)));
  log(`학습: ${describeDelta(delta)} (누적 ${MEM.count}건)`);
}
function describeDelta(d) {
  const n = (o) => Object.keys(o || {}).length;
  const parts = [];
  if (n(d.sections)) parts.push('섹션→크기'); if (n(d.frameNames)) parts.push('대표 화면 이름'); if (n(d.judgeWords)) parts.push('이름→Core'); if (n(d.kinds)) parts.push('파일 종류');
  return parts.join(' · ') || '없음';
}
// 채점표 요약: 학습이 제대로 가는지 보는 숫자. 최근 실행의 적중률·고침·학습 오답·확인 요청 수, 기억끼리 갈리는 항목
function scorecard() {
  const h = (MEM.history || []).slice(-10);
  const sum = (k) => h.reduce((s, r) => s + (r[k] || 0), 0);
  const picks = sum('picks'), hit = sum('hit'), fixed = sum('fixed'), fixedLearned = sum('fixedLearned'), unsure = sum('unsure');
  const half = Math.floor(h.length / 2);
  const rate = (arr) => { const p = arr.reduce((s, r) => s + (r.picks || 0), 0); return p ? arr.reduce((s, r) => s + (r.hit || 0), 0) / p : null; };
  const early = h.length >= 4 ? rate(h.slice(0, half)) : null, late = h.length >= 4 ? rate(h.slice(half)) : null;
  const judged = h.filter(r => r.judgeHit != null); const judgeHit = judged.filter(r => r.judgeHit).length;
  // 기억이 갈리는 항목: 같은 이름이 두 크기로, 같은 낱말이 두 Core로
  const conflicts = [];
  for (const pf in MEM.sections) for (const name in MEM.sections[pf]) { const a = argmax(MEM.sections[pf][name]); if (a && a.margin < 1 && Object.keys(MEM.sections[pf][name]).length > 1) conflicts.push(`${pf} 섹션 "${name}" → ${Object.entries(MEM.sections[pf][name]).map(([k, v]) => k + ' ' + v).join(' / ')}`); }
  for (const w in MEM.judgeWords) { const a = argmax(MEM.judgeWords[w]); if (a && a.margin < 1 && Object.keys(MEM.judgeWords[w]).length > 1) conflicts.push(`낱말 "${w}" → ${Object.keys(MEM.judgeWords[w]).join(' / ')}`); }
  let verdict = '데이터 부족 (3회 이상 쓰면 판단)';
  if (h.length >= 3) {
    if (fixedLearned > 0 && h.slice(-3).some(r => r.fixedLearned)) verdict = '⚠ 최근 학습으로 제안한 것을 사람이 고쳤음 — 잘못 배운 항목이 있음 (되돌림 적용됨)';
    else if (conflicts.length) verdict = '⚠ 기억이 갈리는 항목 있음 — 아래 목록을 정리해야 함';
    else if (late != null && early != null && late < early - 0.1) verdict = '⚠ 적중률이 내려가는 중';
    else if (picks && hit / picks >= 0.9) verdict = '✓ 잘 가는 중 — 제안 대부분이 그대로 채택됨';
    else if (late != null && early != null && late > early) verdict = '✓ 나아지는 중';
    else verdict = '보통 — 고침이 아직 많음, 사례가 더 쌓여야 함';
  }
  return { runs: h.length, picks, hit, fixed, fixedLearned, unsure, early, late, judged: judged.length, judgeHit, conflicts: conflicts.slice(0, 10), verdict, total: MEM.count };
}
const classNames = () => { const o = {}; for (const pf in RULES.sizeClasses) o[pf] = RULES.sizeClasses[pf].classes.map(c => c.name); return o; };
// 학습 점수: 이름 그대로 맞은 것 + 낱말 투표
function learnedVote(exactTable, tokenTable, name) {
  const votes = {};
  const ex = exactTable && exactTable[name.trim().toLowerCase()]; if (ex) for (const k in ex) bump(votes, k, ex[k] * 3);
  for (const t of tokens(name)) { const tv = tokenTable && tokenTable[t]; if (tv) for (const k in tv) bump(votes, k, tv[k]); }
  return votes;
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

// ---------- 2′. 학습: 저장된 계획(=사람이 확인한 결과)에서 배울 것을 뽑는다 ----------
function learnFromPlan(plan) {
  const d = emptyMem(); delete d.count; delete d.updatedAt;
  // 채점: 제안(proposed)과 최종(chosen)이 같으면 적중, 다르면 고침. 학습 근거로 제안한 게 틀렸으면 "학습 오답" → 더 세게 되돌린다
  const score = { id: (plan.savedAt || new Date().toISOString()) + ' ' + plan.sourceFileName, date: plan.savedAt || new Date().toISOString(), file: plan.sourceFileName, picks: 0, hit: 0, fixed: 0, fixedLearned: 0, unsure: 0, unsureHit: 0, judgeHit: plan.judgeProposed ? (plan.judgeProposed === plan.mode ? 1 : 0) : null, judgeBasis: plan.judgeBasis || '' };
  for (const platform of Object.keys(plan.platforms || {})) {
    for (const e of plan.platforms[platform]) {
      if (e.section) {   // 이 섹션 이름 → 이 크기
        d.sections[platform] = d.sections[platform] || {}; bump2(d.sections[platform], e.section.name.trim().toLowerCase(), e.cls, 1);
        d.sectionTokens[platform] = d.sectionTokens[platform] || {};
        for (const t of tokens(e.section.name)) bump2(d.sectionTokens[platform], t, e.cls, 1);
      }
      for (const p of e.picks) {   // 고른 화면(+) · 제치고 고른 화면(−)
        if (!p.chosen) continue;
        const chosen = p.candidates.find(c => c.id === p.chosen); if (!chosen) continue;
        score.picks++;
        const hit = !p.proposed || p.proposed === p.chosen;
        if (hit) score.hit++; else { score.fixed++; if (p.basis === '학습') score.fixedLearned++; }
        if (p.sure === false) { score.unsure++; if (hit) score.unsureHit++; }
        bump(d.frameNames, chosen.name.trim().toLowerCase(), 1);
        for (const t of tokens(chosen.name)) bump(d.frameTokens, t, 0.5);
        for (const c of p.candidates) { if (c.id === p.chosen) break; const wrongLearned = !hit && c.id === p.proposed && p.basis === '학습'; bump(d.frameNames, c.name.trim().toLowerCase(), wrongLearned ? -1.5 : -0.5); for (const t of tokens(c.name)) bump(d.frameTokens, t, wrongLearned ? -0.75 : -0.25); }
      }
    }
  }
  d.history = [score];
  // 수록 대조표에서 사람이 크기를 지정한 미수록 섹션
  for (const c of plan.coverage || []) if (c.userCls) { d.sections[c.platform] = d.sections[c.platform] || {}; bump2(d.sections[c.platform], c.section.replace(/^[^>]*> /, '').trim().toLowerCase(), c.userCls, 1); d.sectionTokens[c.platform] = d.sectionTokens[c.platform] || {}; for (const t of tokens(c.section.replace(/^[^>]*> /, ''))) bump2(d.sectionTokens[c.platform], t, c.userCls, 1); }
  // 이름 낱말 → 어느 Core (새 Core면 그 새 이름)
  const target = plan.mode === 'update' ? plan.targetCore : ('[Core] ' + plan.projectName);
  if (target) for (const w of judgeTokens(plan.judgeWords || plan.projectName)) bump2(d.judgeWords, w, target, 1);
  return d;
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
        screens.push(c); x += c.width + L.gap; clsW += c.width + L.gap;
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
  return { pageId: page.id, rootId: root.id, screens: screens.length, pages: figma.root.children.map(p => p.name) };
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
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'init') {
      RULES = msg.rules || (await figma.clientStorage.getAsync(STORE_RULES));
      INDEX = msg.index || (await figma.clientStorage.getAsync(STORE_INDEX));
      if (msg.rules) await figma.clientStorage.setAsync(STORE_RULES, msg.rules);
      if (msg.index) await figma.clientStorage.setAsync(STORE_INDEX, msg.index);
      if (!RULES) return post('error', { msg: '규칙(rules.json)을 받지 못했습니다. 네트워크를 확인하세요' });
      await loadMemory(msg.memory);
      const plan = await figma.clientStorage.getAsync(STORE_PLAN);
      const kind = await detectFileKind();
      post('ready', { kind, plan: plan || null, rulesVersion: RULES.version, fileName: figma.root.name, fileKey: figma.fileKey || null, hasIndex: !!INDEX, memoryCount: MEM.count, score: scorecard(), classes: classNames() });
    }
    if (msg.type === 'analyze') {
      const a = await analyze(); const j = a.kind === 'project' ? judge(a) : null;
      post('analysis', { analysis: a, judge: j });
    }
    if (msg.type === 'savePlan') {
      await figma.clientStorage.setAsync(STORE_PLAN, msg.plan);
      await remember(learnFromPlan(msg.plan));   // 사람이 확인한 결과 = 학습 1건
      post('planSaved', { plan: msg.plan, memoryCount: MEM.count, score: scorecard(), classes: classNames() });
    }
    if (msg.type === 'learnKind') {   // "종류 모름" 파일을 사람이 지정 → 페이지 구성을 기억
      const d = emptyMem(); delete d.count; delete d.updatedAt;
      bump2(d.kinds, pageSignature(), msg.kind, 1);
      d.sectionTokens.__pages = {}; for (const p of figma.root.children) for (const t of tokens(p.name)) bump2(d.sectionTokens.__pages, t, msg.kind, 1);
      await remember(d);
      post('ready', { kind: await detectFileKind(), plan: await figma.clientStorage.getAsync(STORE_PLAN), rulesVersion: RULES.version, fileName: figma.root.name, hasIndex: !!INDEX, memoryCount: MEM.count, score: scorecard(), classes: classNames() });
    }
    if (msg.type === 'exportMemory') post('memory', { memory: MEM });
    if (msg.type === 'clearPlan') { await figma.clientStorage.deleteAsync(STORE_PLAN); post('ready', { kind: await detectFileKind(), plan: null, rulesVersion: RULES.version, fileName: figma.root.name, hasIndex: !!INDEX, memoryCount: MEM.count, score: scorecard(), classes: classNames() }); }
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
