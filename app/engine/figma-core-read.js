// Figma 안에서 돌릴 "Core 마스터 읽기" 코드를 만든다 (use_figma로 보냄, 읽기 전용).
// 마스터 페이지의 플랫폼 섹션(APP/WEB) 안 화면 프레임마다: 위에 걸린 설명 바(⚫/⚪/🔵) 제목, 크기 칸, 내용 지문(sig)을 돌려준다.
// 지문은 분석 코드(figma-analyze.js)와 같은 함수(SIG_FN)로 만들어, 프로젝트 화면과 Core 화면을 "같은지" 비교하는 데 쓴다.
const { SIG_FN } = require('./signature');
const { REGION_FN } = require('./figma-part');

const FIGMA_SIDE = String.raw`
async function loadPages() { for (const p of figma.root.children) { try { await p.loadAsync(); } catch (e) {} } }
const C = RULES.components;
const KIND_BY_KEY = { [C.barBlack]: 'black', [C.barWhite]: 'white', [C.barBlue]: 'blue' };
async function barKind(i) {
  let mc = null; try { mc = await i.getMainComponentAsync(); } catch (e) {}
  if (!mc) return null;
  if (KIND_BY_KEY[mc.key]) return KIND_BY_KEY[mc.key];
  const setName = mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name : mc.name;
  if (!/스크린 설명/.test(setName)) return null;
  return 'bar';
}
function barTitle(i) { const t = i.findOne(n => n.type === 'TEXT' && n.name === C.barTitleTextName); return t ? t.characters.trim() : ''; }
const abs = (n) => ({ x: n.absoluteTransform[0][2], y: n.absoluteTransform[1][2], w: n.width, h: n.height });

await loadPages();
const names = figma.root.children.map(p => p.name.trim());
const master = figma.root.children.find(p => p.name.trim() === RULES.fileKind.corePageName);
const out = { fileKey: figma.fileKey || null, pages: names, isCore: !!master, masterPageId: master ? master.id : null, root: null, linkCard: null, platforms: {} };
if (master) {
  const root = master.children.find(n => n.type === 'SECTION' && n.name.startsWith(RULES.masterPage.rootPrefix)) || master.children.find(n => n.type === 'SECTION');
  if (root) out.root = { id: root.id, name: root.name };
  out.top = master.children.map(n => n.id);   // 반영 때 이것 말고 페이지 맨 위에 생긴 것 = 사람이 붙여 넣은 것
  // 링크 카드: 앱이 만든 '📎 스펙 링크 카드' 또는 디자이너가 만든 카드("관련 스펙 링크" 뱃지가 든 프레임, 이름은 자유)
  let card = master.findOne(n => n.type === 'FRAME' && /링크 카드/.test(n.name)) || master.findOne(n => n.type === 'TEXT' && /스펙 링크/.test(n.characters || ''));
  while (card && !(card.type === 'FRAME' && card.parent && (card.parent.type === 'SECTION' || card.parent.type === 'PAGE'))) card = card.parent;
  if (card) {
    out.linkCard = { id: card.id, name: card.name };
  }
  for (const platform of Object.keys(RULES.sizeClasses)) {
    const sec = master.findOne(n => n.type === 'SECTION' && n.name.trim() === platform);
    if (!sec) continue;
    const cfg = RULES.sizeClasses[platform];
    const bars = [];
    // 설명 바는 화면 밖(섹션·그룹 바로 아래)에만 있다. 화면 안 인스턴스(SVOD는 5만 개)는 보지 않는다.
    const outside = []; const walk = (n) => { for (const c of n.children || []) { if (c.type === 'INSTANCE') outside.push(c); else if (c.type !== 'FRAME') walk(c); } }; walk(sec);
    for (const i of outside) { const k = await barKind(i); if (k) bars.push(Object.assign({ id: i.id, kind: k, title: barTitle(i) }, abs(i))); }
    const frames = sec.children.filter(n => n.type === 'FRAME');
    const screens = frames.map(f => {
      const a = abs(f);
      const over = bars.filter(b => b.y + b.h <= a.y + 1 && b.x <= a.x + 1 && b.x + b.w >= a.x + a.w - 1).sort((p, q) => q.y - p.y);
      const blue = over.find(b => b.kind === 'blue');
      const byTitle = blue && cfg.classes.find(c => c.name === blue.title);
      const byWidth = cfg.classes.find(c => [c.width].concat(c.extraWidths || []).some(w => Math.abs(w - f.width) < 0.5));
      const cls = (byTitle || byWidth || {}).name || null;
      // wb: 이 화면을 덮는 묶음 바(🔵 아닌 것) — 바깥(위)부터. 프로젝트가 다루는 묶음이면 통째로 바꾼다 (delta.js findGroups)
      const wb = over.filter(b => b.kind !== 'blue').sort((p, q) => p.y - q.y).map(b => b.id);
      // reg: 시안의 핵심 컴포넌트가 든 영역(부분 갱신, figma-part.js). 핵심 컴포넌트가 없으면 빈 목록
      return { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), cls, bar: blue ? blue.id : null, group: (over.find(b => b.kind === 'white') || {}).title || '', gbar: (over.find(b => b.kind === 'white') || {}).id || null, wb, reg: regionsOf(f).slice(0, 4).map(regionInfo), ...sigs(f) };
    });
    out.platforms[platform] = { sectionId: sec.id, screens, bars: Object.fromEntries(bars.map(b => [b.id, b.title.slice(0, 40)])) };
  }
}
// 20KB 한도: 화면이 아주 많은 Core면 이름을 줄이고, 그래도 넘으면 묶음 이름·화면 이름 순으로 뺀다 (지문·크기·id는 그대로 — Δ 계산에 필요)
const bytes = (o) => { const j = JSON.stringify(o); let b = 0; for (let i = 0; i < j.length; i++) { const c = j.charCodeAt(i); b += c < 0x80 ? 1 : c < 0x800 ? 2 : 3; } return b; };
const all = () => Object.values(out.platforms).flatMap(p => p.screens);
if (bytes(out) > 18000) { for (const s of all()) { s.name = s.name.slice(0, 24); s.group = s.group.slice(0, 16); } out.trimmed = 'names'; }
if (bytes(out) > 18000) { for (const s of all()) delete s.group; out.trimmed = 'group'; }
if (bytes(out) > 18000) { for (const s of all()) { delete s.wb; delete s.reg; delete s.gbar; } for (const p of Object.values(out.platforms)) delete p.bars; out.trimmed = 'wb'; }
if (bytes(out) > 18000) { for (const s of all()) s.name = ''; out.trimmed = 'nameless'; }
if (bytes(out) > 19500) return { error: 'Core 화면이 너무 많아 한 번에 읽지 못했어요 (' + all().length + '장)' };
return out;
`;

// plan.feature = 시안의 핵심 컴포넌트 묶음 이름(판별 결과). 없으면 영역은 읽지 않는다
function buildCoreReadCode(rules, plan = {}) {
  const r = { fileKind: rules.fileKind, sizeClasses: rules.sizeClasses, components: rules.components, masterPage: rules.masterPage };
  return `const RULES = ${JSON.stringify(r)};\nconst PLAN = ${JSON.stringify({ feature: plan.feature || [] })};\n` + SIG_FN + REGION_FN + FIGMA_SIDE;
}

module.exports = { buildCoreReadCode };
