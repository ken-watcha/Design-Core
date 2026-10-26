// Figma 안에서 돌릴 "분석" 코드를 만든다 (use_figma로 보냄, 읽기 전용).
// 원본은 plugin/code.js의 detectFileKind·readCover·pickCandidates·classifySection·analyze. 학습 기억은 앱이 넘겨준다(없으면 빈 기억).
// 후보 화면마다 내용 지문(sig)을 붙인다 — 기존 Core 갱신 때 Core 화면과 같은지 비교하는 데 쓴다.
const { SIG_FN } = require('./signature');
const FIGMA_SIDE = String.raw`
const tokens = (s) => String(s || '').toLowerCase().split(/[^0-9a-z가-힣~]+/).filter(t => t.length >= 2);
const bump = (obj, k, v) => { obj[k] = Math.round(((obj[k] || 0) + v) * 1000) / 1000; };
const argmax = (o) => { let best = null, bv = -Infinity, second = -Infinity; for (const k in o || {}) { if (o[k] > bv) { second = bv; bv = o[k]; best = k; } else if (o[k] > second) second = o[k]; } return best == null ? null : { key: best, score: bv, margin: bv - (second === -Infinity ? 0 : second) }; };
function learnedVote(exactTable, tokenTable, name) {
  const votes = {};
  const ex = exactTable && exactTable[name.trim().toLowerCase()]; if (ex) for (const k in ex) bump(votes, k, ex[k] * 3);
  for (const t of tokens(name)) { const tv = tokenTable && tokenTable[t]; if (tv) for (const k in tv) bump(votes, k, tv[k]); }
  return votes;
}
const frameWidthMatch = (n, w) => Math.abs(n.width - w) < 0.5;
const pageSignature = () => figma.root.children.map(p => p.name.trim()).filter(n => !/^-+$/.test(n)).sort().join(' | ').toLowerCase();
async function loadPages() { for (const p of figma.root.children) { try { await p.loadAsync(); } catch (e) {} } }
async function detectFileKind() {
  const names = figma.root.children.map(p => p.name.trim());
  const fk = RULES.fileKind;
  const learned = MEM.kinds[pageSignature()]; if (learned) { const a = argmax(learned); if (a) return a.key; }
  if (names.includes(fk.corePageName)) return 'core';
  if (fk.projectPagePatterns.some(pat => names.some(n => n.includes(pat)))) return 'project';
  return 'unknown';
}
function readCover() {
  const cover = figma.root.children[0];
  const texts = cover.findAll(n => n.type === 'TEXT');
  const byName = (re) => { const t = texts.find(x => re.test(x.name)); return t ? t.characters.replace(/\s+/g, ' ').trim() : ''; };
  return { nameEN: byName(/Page Name\s*\(?EN/i), nameKR: byName(/Page Name\s*\(?KR/i), owner: byName(/담당|owner/i), badge: texts.map(t => t.characters).find(c => /Working|Final/.test(c)) || '' };
}
function pickCandidates(section, width) {
  const sp = RULES.screenPick;
  const frames = section.findAll(n => n.type === 'FRAME' && frameWidthMatch(n, width) && n.height >= sp.minHeight);
  const score = (f) => {
    let s = 0, learned = 0;
    if ((sp.strongNames || []).some(k => f.name.includes(k))) s += 3;
    if (sp.preferNames.some(k => f.name.includes(k))) s += 2;
    if (f.name.includes(String(width)) && f.name.trim() !== String(width)) s += 1;
    if (f.name.trim() === String(width)) s += 2;
    if (sp.avoidNames.some(k => f.name.includes(k))) s -= 3;
    if (f.parent && f.parent.type === 'SECTION') s += 1;
    learned += (MEM.frameNames[f.name.trim().toLowerCase()] || 0) * 2;
    for (const t of tokens(f.name)) learned += MEM.frameTokens[t] || 0;
    return { s: s + learned, learned };
  };
  return frames.map(f => { const sc = score(f); return { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), y: Math.round(f.absoluteTransform[1][2]), score: Math.round(sc.s * 10) / 10, learned: Math.round(sc.learned * 10) / 10, ...sigs(f), _f: f }; })
    .sort((a, b) => b.score - a.score || a.y - b.y);
}
function classifySection(platform, cfg, secName) {
  const a = argmax(learnedVote(MEM.sections[platform], MEM.sectionTokens[platform], secName));
  if (a && a.score >= 2 && a.margin >= 1 && cfg.classes.some(c => c.name === a.key)) return { cls: a.key, basis: '학습' };
  const byRule = cfg.classes.find(cls => cls.sectionPatterns.some(pat => secName.toLowerCase().includes(pat.toLowerCase())));
  if (byRule) return { cls: byRule.name, basis: '규칙' };
  if (a && a.score >= 1) return { cls: a.key, basis: '학습(약함)' };
  return null;
}
await loadPages();
const kind = await detectFileKind();
const result = { kind, cover: readCover(), fileName: figma.root.name, fileKey: figma.fileKey || null, pages: figma.root.children.map(p => p.name), platforms: {}, sections: [], missing: [], unsure: 0 };
if (kind === 'project') {
  for (const platform of Object.keys(RULES.sizeClasses)) {
    const cfg = RULES.sizeClasses[platform];
    const page = figma.root.children.find(p => p.name.includes(cfg.pagePattern) && !p.name.includes('로컬'));
    if (!page) { result.missing.push(platform + ' 페이지 없음'); continue; }
    (result.platformPages = result.platformPages || {})[platform] = { id: page.id, name: page.name };   // 사람이 페이지째 복사할 때 여는 곳
    const sections = page.children.filter(n => n.type === 'SECTION');
    const secClass = {};
    for (const s of sections) { const c = classifySection(platform, cfg, s.name); if (c) secClass[s.id] = c; result.sections.push({ platform, id: s.id, name: s.name, frames: s.findAll(n => n.type === 'FRAME' && n.parent === s).length, cls: c ? c.cls : null, basis: c ? c.basis : null }); }
    const picks = [];
    for (const cls of cfg.classes) {
      const sec = sections.find(s => secClass[s.id] && secClass[s.id].cls === cls.name);
      const entry = { cls: cls.name, desc: cls.desc, section: sec ? { id: sec.id, name: sec.name, basis: secClass[sec.id].basis } : null, picks: [] };
      for (const w of [cls.width].concat(cls.extraWidths || [])) {
        const cands = sec ? pickCandidates(sec, w) : pickCandidates(page, w);
        const sure = cands.length === 1 || (cands.length > 1 && cands[0].score - cands[1].score >= 1);  // 같으면 맨 위 화면(정렬 순서)을 고른 채로 둔다
        // 앞의 3장은 화면 속 글자를 붙인다 — 앱이 후보끼리 무엇이 다른지 보여 줄 때 쓴다 (2026-10-12 윤우)
        const textsOf = (f) => [...new Set(f.findAll(n => n.type === 'TEXT' && n.visible).map(t => t.characters.replace(/\s+/g, ' ').trim().slice(0, 30)).filter(Boolean))].slice(0, 40);
        const out = cands.slice(0, 10).map((c, i) => { const f = c._f; delete c._f; if (i < 3 && cands.length > 1) c.texts = textsOf(f); return c; });
        // 셋 모두에 있는 글자는 차이가 아니니 뺀다 — Figma 응답 한도(20KB)를 넘지 않게 (2026-10-12 21KB 초과 오류)
        const withT = out.filter(c => c.texts);
        if (withT.length > 1) { const common = withT[0].texts.filter(t => withT.every(c => c.texts.includes(t))); withT.forEach(c => { c.texts = c.texts.filter(t => !common.includes(t)).slice(0, 12); }); }
        cands.forEach(c => { delete c._f; });
        entry.picks.push({ width: w, chosen: cands.length ? cands[0].id : null, candidates: out, sure, basis: cands.length && cands[0].learned ? '학습' : '규칙' });
        if (!cands.length) result.missing.push(platform + ' ' + cls.name + ' ' + w + 'px 화면을 못 찾음');
        else if (!sure) result.unsure++;
      }
      picks.push(entry);
    }
    result.platforms[platform] = picks;
  }
  result.coverage = result.sections.map(s => {
    const hit = Object.values(result.platforms).flat().find(e => e.section && e.section.id === s.id);
    return { section: s.platform + ' > ' + s.name, id: s.id, platform: s.platform, to: hit ? s.platform + ' > ' + hit.cls : '', note: hit ? '' : (s.cls ? '(같은 크기 섹션이 이미 있음)' : '미수록 — 어느 크기인지 골라 주세요') };
  });
}
// 고른 화면마다 쓰인 컴포넌트 이름 — 판별(judge.js)이 Core 화면과 겹치는 정도로 어느 Core에 넣을지 본다
// (2026-10-26 윤우: 피쳐링셀은 SVOD 말고 TVOD에도 있다 → 이름이 아니라 내용으로 Core 전체와 비교)
// 이름 대신 짧은 해시로 보낸다 (20KB 한도). judge.js가 색인의 이름을 같은 식으로 바꿔 비교한다
const compHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
async function compNames(frame) {
  const out = new Set();
  // 숨긴 하위 요소까지 봐야 Core 색인(REST)과 같은 이름 목록이 나온다 — 기본값(건너뜀)이면 SVOD 화면에서 1,073개 중 235개만 보임 (2026-10-26 실물 확인)
  const skip = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = false;
  const insts = frame.findAll(n => n.type === 'INSTANCE');
  figma.skipInvisibleInstanceChildren = skip;
  for (let i = 0; i < insts.length; i += 200) {
    const mcs = await Promise.all(insts.slice(i, i + 200).map(n => n.getMainComponentAsync().catch(() => null)));
    for (const mc of mcs) {
      if (!mc) continue;
      const nm = String(mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : mc.name).trim();
      if (nm && !nm.includes('=')) out.add(compHash(nm));
    }
  }
  return out;
}
if (kind === 'project') {
  const names = [], pos = {}, picks = {};
  const chosen = [...new Set(Object.values(result.platforms).flat().flatMap(e => e.picks.map(p => p.chosen)).filter(Boolean))];
  for (const id of chosen) {
    const f = await figma.getNodeByIdAsync(id); if (!f) continue;
    picks[id] = [...await compNames(f)].slice(0, 150).map(nm => pos[nm] != null ? pos[nm] : (pos[nm] = names.push(nm) - 1));
  }
  result.comps = { names, picks };
}
// 그래도 크면 글자 목록부터 버린다 (후보 차이 설명만 줄고 분석은 그대로)
const strip = () => { for (const pf of Object.values(result.platforms)) for (const e of pf) for (const p of e.picks) for (const c of p.candidates) delete c.texts; };
const bytes = (o) => { const j = JSON.stringify(o); let b = 0; for (let i = 0; i < j.length; i++) { const c = j.charCodeAt(i); b += c < 0x80 ? 1 : c < 0x800 ? 2 : 3; } return b; };
if (bytes(result) > 18000) strip();
if (bytes(result) > 18000) for (const pf of Object.values(result.platforms)) for (const e of pf) for (const p of e.picks) p.candidates = p.candidates.slice(0, 3);
if (bytes(result) > 18000 && result.comps) for (const id in result.comps.picks) result.comps.picks[id] = result.comps.picks[id].slice(0, 60);
if (bytes(result) > 18000) delete result.comps;   // 마지막 수단: 판별은 이름으로만 한다
return result;
`;

const emptyMem = () => ({ sections: {}, sectionTokens: {}, frameNames: {}, frameTokens: {}, kinds: {} });

function buildAnalyzeCode(rules, mem) {
  const m = Object.assign(emptyMem(), mem || {});
  const r = { fileKind: rules.fileKind, sizeClasses: rules.sizeClasses, screenPick: rules.screenPick };
  return `const RULES = ${JSON.stringify(r)};\nconst MEM = ${JSON.stringify(m)};\n` + SIG_FN + FIGMA_SIDE;
}

module.exports = { buildAnalyzeCode };
