// 묶음 통째로 바꾸기(2026-10-27 윤우 "묶음 통째로"): 프로젝트 문서에서 Core 묶음에 들어갈 화면을 폭마다 한 섹션씩 고른다 (use_figma로 보냄, 읽기 전용).
// 섹션 고르기: 그 폭의 화면이 바로 아래에 있는 섹션 중 이름에 Case·케이스가 든 것, 없으면 그 폭 화면이 가장 많은 것.
//   피쳐링셀 문서: Mobile 375 → [Small] Case, 768 → [Medium] Case, 1024 → 두 번째 [Medium] Case(이름은 Medium이지만 1024 화면) — 각 6장
const { SIG_FN } = require('./signature');

const FIGMA_SIDE = String.raw`
const out = { sections: [] };
for (const w of PLAN.want) {
  const page = await figma.getNodeByIdAsync(w.pageId);
  if (!page) continue;
  try { await page.loadAsync(); } catch (e) {}
  const secs = page.children.filter(n => n.type === 'SECTION').map(s => ({ s, fs: s.children.filter(f => f.type === 'FRAME' && Math.abs(f.width - w.width) < 0.5 && f.height >= PLAN.minHeight) })).filter(x => x.fs.length);
  if (!secs.length) continue;
  const named = secs.filter(x => /case|케이스/i.test(x.s.name));
  const pick = (named.length ? named : secs).sort((a, b) => b.fs.length - a.fs.length)[0];
  const fs = pick.fs.slice().sort((a, b) => a.y - b.y || a.x - b.x).slice(0, 24);
  out.sections.push({ platform: w.platform, width: w.width, id: pick.s.id, name: pick.s.name.slice(0, 40), frames: fs.map(f => Object.assign({ id: f.id, name: f.name.slice(0, 30), w: Math.round(f.width), h: Math.round(f.height) }, sigs(f))) });
}
// 20KB 한도: 크면 화면 이름부터 빼고, 그래도 크면 화면이 많은 섹션부터 빼며 빠졌다고 적는다 (빠진 폭은 앱이 묶음으로 안 바꿈)
const bytes = (o) => { const j = JSON.stringify(o); let b = 0; for (let i = 0; i < j.length; i++) { const c = j.charCodeAt(i); b += c < 0x80 ? 1 : c < 0x800 ? 2 : 3; } return b; };
if (bytes(out) > 16000) for (const s of out.sections) for (const f of s.frames) delete f.name;
while (bytes(out) > 16000 && out.sections.some(s => s.frames.length)) { const big = out.sections.slice().sort((a, b) => b.frames.length - a.frames.length)[0]; big.frames = []; big.tooMany = true; }
return out;
`;

// 새 묶음 추가(2026-10-30 윤우): Core에 없는 케이스(일반 결제만 있는 Core ↔ 패키지 결제 문서)는 폭마다 대표 1장을 기존 줄에 섞지 않고,
// 그 폭의 이름 다른 화면을 모두 읽어 프로젝트 이름 묶음(⚪ 바)으로 따로 넣는다. 케이스별 중복(같은 이름)은 맨 위 1장만, 대표로 고른 화면(prefer)은 반드시.
const NEW_GROUP_SIDE = String.raw`
const out = { groups: [] };
const norm = (t) => String(t || '').toLowerCase().replace(/[\s_\-()[\]·]/g, '');
const avoid = (PLAN.avoidNames || []).map(norm).filter(Boolean);
const prefer = new Set(PLAN.prefer || []);
const ay = (n) => n.absoluteTransform ? n.absoluteTransform[1][2] : n.y, ax = (n) => n.absoluteTransform ? n.absoluteTransform[0][2] : n.x;
for (const w of PLAN.want) {
  const page = await figma.getNodeByIdAsync(w.pageId);
  if (!page) continue;
  try { await page.loadAsync(); } catch (e) {}
  const pool = [];
  const walk = (n) => { for (const c of n.children || []) { if (c.type === 'FRAME') { if (Math.abs(c.width - w.width) < 0.5 && c.height >= PLAN.minHeight) pool.push(c); } else if (c.type === 'SECTION' || c.type === 'GROUP') walk(c); } };
  walk(page);
  const by = new Map();
  for (const f of pool.slice().sort((a, b) => ay(a) - ay(b) || ax(a) - ax(b))) {
    const k = norm(f.name);
    if (!k || avoid.some(a => k.includes(a))) continue;
    if (!by.has(k) || prefer.has(f.id)) by.set(k, f);
  }
  const fs = [...by.values()].slice(0, PLAN.max || 12);
  out.groups.push({ platform: w.platform, width: w.width, total: pool.length, frames: fs.map(f => Object.assign({ id: f.id, name: f.name.slice(0, 30), w: Math.round(f.width), h: Math.round(f.height) }, sigs(f))) });
}
// 20KB 한도: 크면 화면 이름부터 빼고, 그래도 크면 화면이 많은 폭부터 비우며 빠졌다고 적는다 (빠진 폭은 앱이 대표 1장만 넣음)
const bytes = (o) => { const j = JSON.stringify(o); let b = 0; for (let i = 0; i < j.length; i++) { const c = j.charCodeAt(i); b += c < 0x80 ? 1 : c < 0x800 ? 2 : 3; } return b; };
if (bytes(out) > 16000) for (const g of out.groups) for (const f of g.frames) delete f.name;
while (bytes(out) > 16000 && out.groups.some(g => g.frames.length)) { const big = out.groups.slice().sort((a, b) => b.frames.length - a.frames.length)[0]; big.frames = []; big.tooMany = true; }
return out;
`;

// 새 묶음에 넣을 화면이 어느 Core 것인지 보기 위한 컴포넌트 해시 (2026-10-30 윤우: 플로우의 첫 진입점 "콘텐츠 상세 페이지"는 결제 Core의 묶음에 들어갈 화면이 아니다).
// 분석(figma-analyze.js compNames)과 같은 해시를 쓰고, judge.js가 색인과 비교해 다른 Core 화면을 가려낸다. 한 번에 14KB쯤까지, 남은 id는 rest로.
const COMPS_SIDE = String.raw`
const compHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const out = {}, rest = []; let size = 0;
for (const id of IDS) {
  if (size > 14000) { rest.push(id); continue; }
  const f = await figma.getNodeByIdAsync(id);
  if (!f) { out[id] = []; continue; }
  const skip = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = false;
  const insts = f.findAll(n => n.type === 'INSTANCE');
  figma.skipInvisibleInstanceChildren = skip;
  const set = new Set();
  for (let i = 0; i < insts.length && set.size < 120; i += 200) {
    const mcs = await Promise.all(insts.slice(i, i + 200).map(async n => { try { return await n.getMainComponentAsync(); } catch (e) { return null; } }));
    for (const mc of mcs) { if (!mc) continue; const nm = String(mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : mc.name).trim(); if (nm && !nm.includes('=')) set.add(compHash(nm)); }
  }
  out[id] = [...set].slice(0, 120);
  size += JSON.stringify(out[id]).length + id.length + 4;
}
return { picks: out, rest };
`;

function buildGroupCompsReadCode(ids) {
  return `const IDS = ${JSON.stringify(ids)};\n` + COMPS_SIDE;
}

function buildNewGroupReadCode(rules, plan) {
  const sp = rules.screenPick || {};
  return `const PLAN = ${JSON.stringify(Object.assign({ minHeight: sp.minHeight || 0, avoidNames: sp.avoidNames || [] }, plan))};\n` + SIG_FN + NEW_GROUP_SIDE;
}

function buildCaseReadCode(rules, plan) {
  return `const PLAN = ${JSON.stringify(Object.assign({ minHeight: (rules.screenPick || {}).minHeight || 0 }, plan))};\n` + SIG_FN + FIGMA_SIDE;
}

module.exports = { buildCaseReadCode, buildNewGroupReadCode, buildGroupCompsReadCode };
