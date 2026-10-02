// Figma 안에서 돌릴 "분석" 코드를 만든다 (use_figma로 보냄, 읽기 전용).
// 원본은 plugin/code.js의 detectFileKind·readCover·pickCandidates·classifySection·analyze. 학습 기억은 앱이 넘겨준다(없으면 빈 기억).
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
    if (sp.preferNames.some(k => f.name.includes(k))) s += 2;
    if (f.name.trim() === String(width)) s += 2;
    if (sp.avoidNames.some(k => f.name.includes(k))) s -= 3;
    if (f.parent && f.parent.type === 'SECTION') s += 1;
    learned += (MEM.frameNames[f.name.trim().toLowerCase()] || 0) * 2;
    for (const t of tokens(f.name)) learned += MEM.frameTokens[t] || 0;
    return { s: s + learned, learned };
  };
  return frames.map(f => { const sc = score(f); return { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), y: Math.round(f.absoluteTransform[1][2]), score: Math.round(sc.s * 10) / 10, learned: Math.round(sc.learned * 10) / 10 }; })
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
    const sections = page.children.filter(n => n.type === 'SECTION');
    const secClass = {};
    for (const s of sections) { const c = classifySection(platform, cfg, s.name); if (c) secClass[s.id] = c; result.sections.push({ platform, id: s.id, name: s.name, frames: s.findAll(n => n.type === 'FRAME' && n.parent === s).length, cls: c ? c.cls : null, basis: c ? c.basis : null }); }
    const picks = [];
    for (const cls of cfg.classes) {
      const sec = sections.find(s => secClass[s.id] && secClass[s.id].cls === cls.name);
      const entry = { cls: cls.name, desc: cls.desc, section: sec ? { id: sec.id, name: sec.name, basis: secClass[sec.id].basis } : null, picks: [] };
      for (const w of [cls.width].concat(cls.extraWidths || [])) {
        const cands = sec ? pickCandidates(sec, w) : pickCandidates(page, w);
        const sure = cands.length === 1 || (cands.length > 1 && cands[0].score - cands[1].score >= 1);
        entry.picks.push({ width: w, chosen: cands.length ? cands[0].id : null, candidates: cands.slice(0, 6), sure, basis: cands.length && cands[0].learned ? '학습' : '규칙' });
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
return result;
`;

const emptyMem = () => ({ sections: {}, sectionTokens: {}, frameNames: {}, frameTokens: {}, kinds: {} });

function buildAnalyzeCode(rules, mem) {
  const m = Object.assign(emptyMem(), mem || {});
  const r = { fileKind: rules.fileKind, sizeClasses: rules.sizeClasses, screenPick: rules.screenPick };
  return `const RULES = ${JSON.stringify(r)};\nconst MEM = ${JSON.stringify(m)};\n` + FIGMA_SIDE;
}

module.exports = { buildAnalyzeCode };
