// Figma 안에서 돌릴 "쓰기" 코드를 만든다 (use_figma로 보냄). 사람이 준비한 자리(복제본·브랜치)에만 쓴다.
//  - 새 Core: plugin/code.js buildNewCore() 이식. 1회차 = 마스터 만들기(뼈대·링크 카드·화면 복제+원본 대조·설명 바), 2회차 = 깎기(로컬 인스턴스 분리·작업 페이지 삭제)
//  - 기존 Core 갱신: 사람이 브랜치 마스터에 붙여 넣은 화면을 알아보고 교체(껍데기 유지)·추가(🔵 바와 함께)·링크 카드 기준 날짜 갱신
const { SIG_FN } = require('./signature');

const HELPERS = String.raw`
const rgb = (a) => ({ r: a[0] / 255, g: a[1] / 255, b: a[2] / 255 });
const log = []; const say = (m) => log.push(m);
async function loadPages() { for (const p of figma.root.children) { try { await p.loadAsync(); } catch (e) {} } }
async function loadFont(style) { const f = { family: 'Pretendard', style }; try { await figma.loadFontAsync(f); return f; } catch (e) { const g = { family: 'Inter', style: style === 'Bold' ? 'Bold' : 'Regular' }; await figma.loadFontAsync(g); return g; } }
async function loadTextFonts(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
const pageByName = (name) => figma.root.children.find(p => p.name.trim() === name.trim());
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
function fitSection(s, pad) {
  let r = 0, b = 0; for (const c of s.children) { r = Math.max(r, c.x + c.width); b = Math.max(b, c.y + c.height); }
  s.resizeWithoutConstraints(Math.max(s.width, r + pad), Math.max(s.height, b + pad));
}
`;

// ---------- 새 Core 1회차: 마스터 만들기 ----------
const NEW_BUILD = String.raw`
await loadPages();
const L = RULES.layout, M = RULES.masterPage;
const names = figma.root.children.map(p => p.name.trim());
if (names.includes(M.name)) throw new Error('이미 "' + M.name + '" 페이지가 있습니다 — 새 Core를 다시 만들지 않습니다');
if (!RULES.fileKind.projectPagePatterns.some(pat => names.some(n => n.includes(pat)))) throw new Error('프로젝트 문서 복제본이 아닙니다 (작업 페이지가 없음)');
if (PLAN.sourceFileKey && figma.fileKey && PLAN.sourceFileKey === figma.fileKey) throw new Error('원본 프로젝트 파일입니다. Duplicate한 복제본에만 씁니다');
const projName = PLAN.projectName;
const screenName = RULES.screenPick.screenName.replace('<프로젝트명>', projName);
say('A 뼈대');
const page = figma.createPage(); page.name = M.name; figma.root.insertChild(M.insertIndex, page);
await figma.setCurrentPageAsync(page);
const root = section(M.rootPrefix + projName, page, 0, 0, 1000, 1000, L.fills.root);
const card = figma.createFrame(); card.name = '📎 스펙 링크 카드'; root.appendChild(card);
card.layoutMode = 'VERTICAL'; card.itemSpacing = 16; card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24;
card.primaryAxisSizingMode = 'AUTO'; card.counterAxisSizingMode = 'FIXED'; card.cornerRadius = 12; card.fills = [{ type: 'SOLID', color: rgb(L.fills.card) }];
card.resize(L.cardSize[0], L.cardSize[1]); card.x = L.rootPadding; card.y = L.rootPadding;
const white = { r: 1, g: 1, b: 1 }, grey = { r: .78, g: .78, b: .78 };
const fill = (s) => s.replace(/<프로젝트명>/g, projName).replace('<배포월>', PLAN.releaseMonth).replace('<담당자>', PLAN.owner || '');
await text(card, projName, 'Bold', 18, white);
await text(card, fill(RULES.linkCard.body), 'Regular', 14, white);
await text(card, fill(RULES.linkCard.meta), 'Regular', 12, grey);
try {
  const badge = (await figma.importComponentByKeyAsync(RULES.components.badge)).createInstance(); card.appendChild(badge);
  try { badge.setProperties({ '상태': '링크' }); } catch (e) {}
  const bt = badge.findOne(n => n.type === 'TEXT' && /링크/.test(n.characters));
  if (bt) { await loadTextFonts(bt); bt.characters = RULES.linkCard.badgeText; if (PLAN.sourceUrl) bt.hyperlink = { type: 'URL', value: PLAN.sourceUrl }; }
} catch (e) { say('뱃지 컴포넌트를 못 불러와 링크 텍스트로 대신함'); await text(card, RULES.linkCard.badgeText, 'Bold', 14, { r: .47, g: .67, b: 1 }, PLAN.sourceUrl); }
card.layoutSizingHorizontal = 'FIXED';
let y = L.rootPadding + L.cardSize[1] + 80, maxW = 0;
const screensOut = [];
for (const platform of M.sections) {
  const entries = PLAN.platforms[platform]; if (!entries) continue;
  const sec = section(platform, root, L.rootPadding, y, 1000, 1000, L.fills.section);
  say(platform + ' 섹션');
  const screens = []; let x = L.sectionPadding; const barSizes = [];
  for (const entry of entries) {
    const startX = x; let clsW = 0;
    for (const p of entry.picks) {
      if (!p.chosen) continue;
      const src = await figma.getNodeByIdAsync(p.chosen); if (!src) { say('⚠ 원본 화면 없음 ' + p.chosen); continue; }
      const c = src.clone(); sec.appendChild(c); c.name = screenName; c.x = x; c.y = 0;
      const acc = { fixed: 0, failed: 0 }; diffFix(src, c, acc); diffFix(src, c, acc);
      const left = diffCount(src, c);
      screens.push(c); screensOut.push({ id: c.id, platform, cls: entry.cls, w: Math.round(c.width), h: Math.round(c.height), source: src.id, fixed: acc.fixed, left });
      x += c.width + L.gap; clsW += c.width + L.gap;
    }
    if (clsW > 0) barSizes.push({ entry, x: startX, w: clsW - L.gap });
  }
  const innerW = x - L.gap - L.sectionPadding;
  await bar('barBlack', sec, L.sectionPadding, L.sectionPadding, innerW, projName, null);
  await bar('barWhite', sec, L.sectionPadding, L.barGroupY, innerW, screenName, null);
  let barBottom = L.barSizeY;
  for (const b of barSizes) { const bi = await bar('barBlue', sec, b.x, L.barSizeY, b.w, b.entry.cls, b.entry.desc); barBottom = Math.max(barBottom, L.barSizeY + bi.height); }
  const screenY = barBottom + L.gap; let bottom = screenY;
  for (const s of screens) { s.y = screenY; bottom = Math.max(bottom, s.y + s.height); }
  sec.resizeWithoutConstraints(innerW + L.sectionPadding * 2, bottom + L.sectionPadding);
  maxW = Math.max(maxW, sec.width); y += sec.height + L.sectionGap;
}
root.resizeWithoutConstraints(L.rootPadding * 2 + maxW, y - L.sectionGap + L.rootPadding);
return { step: 'build', pageId: page.id, rootId: root.id, cardId: card.id, screens: screensOut, log };
`;

// ---------- 새 Core 2회차: 깎기 ----------
const NEW_TRIM = String.raw`
await loadPages();
const M = RULES.masterPage;
const page = pageByName(M.name);
if (!page) throw new Error('마스터 페이지가 없습니다 — 1회차(만들기)가 끝나지 않았습니다');
if (PLAN.sourceFileKey && figma.fileKey && PLAN.sourceFileKey === figma.fileKey) throw new Error('원본 프로젝트 파일입니다');
let detached = 0;
if (RULES.trim.detachLocalInstancesFirst) {
  for (let round = 0; round < 6; round++) {
    const targets = [];
    for (const i of page.findAllWithCriteria({ types: ['INSTANCE'] })) { let mc = null; try { mc = await i.getMainComponentAsync(); } catch (e) {} if (mc && mc.remote === false) targets.push(i); }
    if (!targets.length) break;
    for (const i of targets) { if (i.removed) continue; try { i.detachInstance(); detached++; } catch (e) {} }
  }
}
let seenSep = false; const removed = [];
for (const p of [...figma.root.children]) {
  const n = p.name.trim();
  if (p === page) continue;
  if (n === '---') { if (seenSep && RULES.trim.deleteExtraSeparators) { removed.push(n); p.remove(); } seenSep = true; continue; }
  if (RULES.trim.deletePages.some(d => n.startsWith(d))) { removed.push(n); p.remove(); }
}
let idx = 0;
for (const nm of RULES.trim.keepPages) { const p = figma.root.children.find(c => c.name.trim().toLowerCase() === nm.toLowerCase()); if (p) { figma.root.insertChild(idx, p); idx++; } }
return { step: 'trim', detached, removed, pages: figma.root.children.map(p => p.name) };
`;

// ---------- 기존 Core 갱신: 붙여 넣은 화면 반영 ----------
const UPDATE_APPLY = String.raw`
await loadPages();
const L = RULES.layout, M = RULES.masterPage;
const page = pageByName(M.name);
if (!page) throw new Error('"' + M.name + '" 페이지가 없습니다 — Core 파일의 브랜치가 맞는지 확인해 주세요');
if (PLAN.coreKey && figma.fileKey && figma.fileKey === PLAN.coreKey) throw new Error('Core 본 파일입니다. 브랜치에서만 씁니다');
const existing = new Set(PLAN.coreScreenIds);
const want = PLAN.rows.filter(r => r.action === '교체' || r.action === '추가');
// 붙여 넣은 화면 찾기: 마스터 페이지의 프레임 중 Core에 원래 있던 것이 아니고, 지문이 필요한 화면과 같은 것
const pasted = page.findAll(n => n.type === 'FRAME' && !existing.has(n.id) && n.parent && (n.parent.type === 'PAGE' || n.parent.type === 'SECTION'))
  .map(f => ({ f, s: sig(f) }));
const taken = new Set(); const done = [], notFound = [];
const secOf = (pf) => page.findOne(n => n.type === 'SECTION' && n.name.trim() === pf);
const LAYOUT_PROPS = ['layoutMode', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'counterAxisSpacing', 'layoutWrap'];
const LOOK_PROPS = ['fills', 'strokes', 'strokeWeight', 'strokeAlign', 'cornerRadius', 'clipsContent', 'effects', 'opacity', 'blendMode'];
for (const r of want) {
  const hit = pasted.find(p => !taken.has(p.f.id) && p.s === r.source.sig) || pasted.find(p => !taken.has(p.f.id) && Math.abs(p.f.width - r.source.w) < 0.5 && Math.abs(p.f.height - r.source.h) < 0.5);
  if (!hit) { notFound.push(r.platform + ' ' + r.cls + ' ' + r.width + 'px'); continue; }
  taken.add(hit.f.id);
  const nf = hit.f;
  if (r.action === '교체') {
    const old = await figma.getNodeByIdAsync(r.target.id);
    if (!old) { notFound.push('Core 화면 ' + r.target.id + ' 없음'); continue; }
    // 껍데기(이름·위치·node-id) 유지, 속만 새 화면으로
    try { old.layoutMode = 'NONE'; } catch (e) {}
    for (const c of [...old.children]) c.remove();
    for (const c of [...nf.children]) old.appendChild(c);
    old.resizeWithoutConstraints(nf.width, nf.height);
    for (const k of LOOK_PROPS) { try { old[k] = nf[k]; } catch (e) {} }
    for (const k of LAYOUT_PROPS) { try { old[k] = nf[k]; } catch (e) {} }
    old.resizeWithoutConstraints(nf.width, nf.height);
    nf.remove();
    const now = sig(old);
    done.push({ action: '교체', id: old.id, platform: r.platform, cls: r.cls, width: r.width, same: now === r.source.sig });
  } else {
    const sec = secOf(r.platform);
    if (!sec) { notFound.push(r.platform + ' 섹션 없음'); continue; }
    const frames = sec.children.filter(n => n.type === 'FRAME' && n !== nf);
    const right = frames.length ? Math.max(...frames.map(f => f.x + f.width)) + L.gap : L.sectionPadding;
    const screenY = frames.length ? frames[0].y : L.barSizeY + 154;
    sec.appendChild(nf); nf.x = right; nf.y = screenY; nf.name = PLAN.screenName || nf.name;
    await bar('barBlue', sec, right, L.barSizeY, nf.width, r.cls, r.desc);
    // ⚫·⚪ 바를 새 폭까지 늘린다
    const inner = right + nf.width - L.sectionPadding;
    for (const b of sec.children.filter(n => n.type === 'INSTANCE' && n.y < L.barSizeY - 1)) { try { b.resize(inner, b.height); } catch (e) {} }
    fitSection(sec, L.sectionPadding);
    done.push({ action: '추가', id: nf.id, platform: r.platform, cls: r.cls, width: r.width, same: sig(nf) === r.source.sig });
  }
}
// 링크 카드 기준 날짜
let cardUpdated = false;
if (done.length && PLAN.month) {
  const card = page.findOne(n => n.type === 'FRAME' && /링크 카드/.test(n.name));
  const t = card && card.findOne(n => n.type === 'TEXT' && /^기준:/.test(n.characters.trim()));
  if (t) { await loadTextFonts(t); t.characters = t.characters.replace(/기준:\s*\d{4}\.(\d{2}|__)/, '기준: ' + PLAN.month); cardUpdated = true; }
}
const root = page.children.find(n => n.type === 'SECTION');
if (root) fitSection(root, L.rootPadding);
return { step: 'update', done, notFound, pastedSeen: pasted.length, cardUpdated, log };
`;

function head(rules, plan) {
  const r = { fileKind: rules.fileKind, masterPage: rules.masterPage, layout: rules.layout, components: rules.components, linkCard: rules.linkCard, trim: rules.trim, screenPick: rules.screenPick };
  return `const RULES = ${JSON.stringify(r)};\nconst PLAN = ${JSON.stringify(plan)};\n` + SIG_FN + HELPERS;
}

const buildNewCoreCode = (rules, plan) => head(rules, plan) + NEW_BUILD;
const trimNewCoreCode = (rules, plan) => head(rules, plan) + NEW_TRIM;
const applyUpdateCode = (rules, plan) => head(rules, plan) + UPDATE_APPLY;

module.exports = { buildNewCoreCode, trimNewCoreCode, applyUpdateCode };
