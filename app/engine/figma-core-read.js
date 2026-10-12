// Figma 안에서 돌릴 "Core 마스터 읽기" 코드를 만든다 (use_figma로 보냄, 읽기 전용).
// 마스터 페이지의 플랫폼 섹션(APP/WEB) 안 화면 프레임마다: 위에 걸린 설명 바(⚫/⚪/🔵) 제목, 크기 칸, 내용 지문(sig)을 돌려준다.
// 지문은 분석 코드(figma-analyze.js)와 같은 함수(SIG_FN)로 만들어, 프로젝트 화면과 Core 화면을 "같은지" 비교하는 데 쓴다.
const { SIG_FN } = require('./signature');

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
  const card = master.findOne(n => n.type === 'FRAME' && /링크 카드/.test(n.name));
  if (card) {
    const texts = card.findAll(n => n.type === 'TEXT');
    out.linkCard = { id: card.id, name: card.name, texts: texts.map(t => ({ id: t.id, chars: t.characters })) };
  }
  for (const platform of Object.keys(RULES.sizeClasses)) {
    const sec = master.findOne(n => n.type === 'SECTION' && n.name.trim() === platform);
    if (!sec) continue;
    const cfg = RULES.sizeClasses[platform];
    const bars = [];
    for (const i of sec.findAll(n => n.type === 'INSTANCE')) { const k = await barKind(i); if (k) bars.push(Object.assign({ id: i.id, kind: k, title: barTitle(i) }, abs(i))); }
    const frames = sec.children.filter(n => n.type === 'FRAME');
    const screens = frames.map(f => {
      const a = abs(f);
      const over = bars.filter(b => b.y + b.h <= a.y + 1 && b.x <= a.x + 1 && b.x + b.w >= a.x + a.w - 1).sort((p, q) => q.y - p.y);
      const blue = over.find(b => b.kind === 'blue');
      const byTitle = blue && cfg.classes.find(c => c.name === blue.title);
      const byWidth = cfg.classes.find(c => [c.width].concat(c.extraWidths || []).some(w => Math.abs(w - f.width) < 0.5));
      const cls = (byTitle || byWidth || {}).name || null;
      return { id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), x: Math.round(f.x), y: Math.round(f.y), cls, clsBasis: byTitle ? '설명 바' : (byWidth ? '폭' : null), bar: blue ? blue.id : null, group: (over.find(b => b.kind === 'white') || {}).title || '', ...sigs(f) };
    });
    out.platforms[platform] = { sectionId: sec.id, w: Math.round(sec.width), h: Math.round(sec.height), bars: bars.map(b => ({ id: b.id, kind: b.kind, title: b.title })), screens };
  }
}
return out;
`;

function buildCoreReadCode(rules) {
  const r = { fileKind: rules.fileKind, sizeClasses: rules.sizeClasses, components: rules.components, masterPage: rules.masterPage };
  return `const RULES = ${JSON.stringify(r)};\n` + SIG_FN + FIGMA_SIDE;
}

module.exports = { buildCoreReadCode };
