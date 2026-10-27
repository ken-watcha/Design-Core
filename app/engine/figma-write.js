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
const groupRows = PLAN.rows.filter(r => r.action === '묶음 교체');
// 붙여 넣은 것 = 확인 때 읽은 페이지 맨 위 목록(PLAN.keepTop)에 없던 것. 프로젝트 페이지를 통째로 붙여도 되고(2026-10-26 윤우: 단계를 줄이자), 📦 섹션 하나여도 된다.
// 그 안의 프레임 중 필요한 화면과 크기가 같은 것만 지문을 잰다 (페이지째 붙이면 프레임이 수만 개)
const keepTop = PLAN.keepTop ? new Set(PLAN.keepTop) : null;
const isCard = (n) => n.type === 'FRAME' && /링크 카드/.test(n.name);   // 지난 [반영]이 만든 링크 카드는 붙여넣기가 아니다
const pastedTop = keepTop ? page.children.filter(n => !keepTop.has(n.id) && !isCard(n)) : [];
const sizeKey = (w, h) => Math.round(w) + 'x' + Math.round(h);
const wantSizes = new Set(want.map(r => sizeKey(r.source.w, r.source.h)).concat(groupRows.flatMap(r => r.sources.map(x => sizeKey(x.w, x.h)))));
let pasted;
if (keepTop) {
  pasted = [];
  for (const t of pastedTop) {
    const fs = (t.type === 'FRAME' ? [t] : []).concat('findAllWithCriteria' in t ? t.findAllWithCriteria({ types: ['FRAME'] }) : []);
    for (const f of fs) if (wantSizes.has(sizeKey(f.width, f.height))) pasted.push({ f, s: sig(f) });
  }
} else {
  pasted = page.findAll(n => n.type === 'FRAME' && !existing.has(n.id) && n.parent && (n.parent.type === 'PAGE' || n.parent.type === 'SECTION')).map(f => ({ f, s: sig(f) }));
}
const taken = new Set(); const done = [], notFound = [];
const sameSize = (p, r) => Math.abs(p.f.width - r.source.w) < 0.5 && Math.abs(p.f.height - r.source.h) < 0.5;
const secOf = (pf) => page.findOne(n => n.type === 'SECTION' && n.name.trim() === pf);
const LAYOUT_PROPS = ['layoutMode', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'counterAxisSpacing', 'layoutWrap'];
const LOOK_PROPS = ['fills', 'strokes', 'strokeWeight', 'strokeAlign', 'cornerRadius', 'clipsContent', 'effects', 'opacity', 'blendMode'];
for (const r of want) {
  // 지문이 같은 것 먼저. 크기만 같은 것은 하나뿐일 때만 (페이지째 붙이면 같은 크기 화면이 많아 엉뚱한 화면을 고를 수 있다)
  const bySize = pasted.filter(p => !taken.has(p.f.id) && sameSize(p, r));
  const hit = pasted.find(p => !taken.has(p.f.id) && p.s === r.source.sig) || (bySize.length === 1 ? bySize[0] : null);
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
    sec.appendChild(nf); nf.x = right; nf.y = screenY; // 이름은 붙여 넣은 원본 이름 그대로
    await bar('barBlue', sec, right, L.barSizeY, nf.width, r.cls, r.desc);
    // ⚫·⚪ 바를 새 폭까지 늘린다
    const inner = right + nf.width - L.sectionPadding;
    for (const b of sec.children.filter(n => n.type === 'INSTANCE' && n.y < L.barSizeY - 1)) { try { b.resize(inner, b.height); } catch (e) {} }
    fitSection(sec, L.sectionPadding);
    done.push({ action: '추가', id: nf.id, platform: r.platform, cls: r.cls, width: r.width, same: sig(nf) === r.source.sig });
  }
}
// 묶음 통째로 (2026-10-27 윤우): 묶음 바(⚫·⚪) 아래 화면·하위 바를 모두 지우고, 시안 화면을 폭마다 한 줄씩 🔵 바와 함께 다시 놓는다.
// 시안 화면을 하나라도 못 찾으면 그 묶음은 손대지 않는다 (지우기만 하고 못 채우는 일이 없게)
for (const gid of [...new Set(groupRows.map(r => r.group.id))]) {
  const rows = groupRows.filter(r => r.group.id === gid).sort((a, b) => a.width - b.width);
  const gb = await figma.getNodeByIdAsync(gid);
  const sec = gb && gb.parent;
  if (!gb || !sec || sec.type !== 'SECTION') { notFound.push('묶음 바 ' + gid + ' 없음'); continue; }
  const tt = gb.findOne && gb.findOne(n => n.type === 'TEXT' && n.name === RULES.components.barTitleTextName);
  const gname = tt ? tt.characters.trim() : gb.name;
  const pick = [], miss = [];
  for (const r of rows) for (const src of r.sources) {
    const hit = pasted.find(p => !taken.has(p.f.id) && !pick.some(x => x.p === p) && p.s === src.sig);
    if (hit) pick.push({ p: hit, r, src }); else miss.push(r.platform + ' ' + r.width + 'px ' + src.id);
  }
  if (miss.length) { notFound.push('묶음 "' + gname + '"은 시안 화면 ' + miss.length + '장을 못 찾아 그대로 둠'); continue; }
  const x0 = gb.x, oldW = gb.width, top = gb.y + gb.height;
  // 지울 것: 묶음의 옛 화면 + 묶음 안(바 폭 안, 바 아래)의 하위 바
  const oldIds = new Set(rows.flatMap(r => r.olds.map(o => o.id)));
  const inside = (n) => n.x >= x0 - 1 && n.x + n.width <= x0 + oldW + 1 && n.y >= top - 1;
  let removed = 0;
  for (const n of [...sec.children]) if (n !== gb && (oldIds.has(n.id) || (n.type === 'INSTANCE' && inside(n)))) { n.remove(); removed++; }
  // 다시 놓기: 폭마다 한 줄 (🔵 바 + 화면들)
  let y = top + 40, right = x0;
  const placed = new Set();
  for (const r of rows) {
    const mine = pick.filter(x => x.r === r);
    if (!mine.length) continue;
    let x = x0, rowH = 0, barH = 0;
    for (const { p, src } of mine) {
      const nf = p.f;
      taken.add(nf.id);
      const b = await bar('barBlue', sec, x, y, nf.width, r.barTitle || r.cls || String(r.width), null);
      placed.add(b.id); placed.add(nf.id);
      barH = Math.max(barH, b.height);
      sec.appendChild(nf); nf.x = x; nf.y = y + b.height + 16;
      rowH = Math.max(rowH, nf.height); right = Math.max(right, x + nf.width); x += nf.width + L.gap;
      done.push({ action: '묶음 교체', id: nf.id, platform: r.platform, cls: r.cls, width: r.width, same: sig(nf) === src.sig });
    }
    y += barH + 16 + rowH + 80;
  }
  // 묶음 바를 새 폭으로, 오른쪽에 있던 것은 늘어난(줄어든) 만큼 민다
  const newW = right - x0, shift = newW - oldW;
  try { gb.resize(newW, gb.height); } catch (e) {}
  if (Math.abs(shift) > 0.5) for (const n of sec.children) if (n !== gb && !placed.has(n.id) && n.x >= x0 + oldW - 1) n.x += shift;
  fitSection(sec, L.sectionPadding);
  say('묶음 "' + gname + '": 지움 ' + removed + ' · 넣음 ' + pick.length);
}
// 링크 카드 기준 날짜
let cardUpdated = false;
if (done.length && PLAN.month) {
  const card = page.findOne(n => n.type === 'FRAME' && /링크 카드/.test(n.name));
  const t = card && card.findOne(n => n.type === 'TEXT' && /^기준:/.test(n.characters.trim()));
  if (t) { await loadTextFonts(t); t.characters = t.characters.replace(/기준:\s*\d{4}\.(\d{2}|__)/, '기준: ' + PLAN.month); cardUpdated = true; }
}
// 쓰고 남은 붙여넣기는 지운다 (반영한 화면이 하나라도 있을 때만 — 잘못 붙였으면 사람이 보도록 남긴다)
let leftoverRemoved = 0;
if (keepTop && done.length) for (const n of page.children.filter(n => !keepTop.has(n.id) && !isCard(n))) { if (n.removed) continue; n.remove(); leftoverRemoved++; }
// 모아서 붙여 넣은 섹션(📦, 붙여 넣으며 이름이 빠진 것 포함)이 비었으면 지운다
for (const s of page.findAll(n => n.type === 'SECTION' && (n.name.startsWith('📦') || !n.name.trim()) && n.children.length === 0)) s.remove();
const root = page.children.find(n => n.type === 'SECTION' && !n.name.startsWith('📦'));
if (root) fitSection(root, L.rootPadding);
// 이번 프로젝트 문서 링크를 링크 카드에 건다. 카드가 없는 Core(SVOD 등)는 루트 섹션 위에 카드를 새로 둔다 (2026-10-21 윤우)
let linkAdded = null;
if (done.length && PLAN.sourceUrl) {
  let card = page.findOne(n => n.type === 'FRAME' && /링크 카드/.test(n.name)), made = false;
  const already = card && card.findOne(n => n.type === 'TEXT' && n.hyperlink && n.hyperlink.value === PLAN.sourceUrl);
  if (!already) {
    if (!card) {
      card = figma.createFrame(); card.name = '📎 스펙 링크 카드'; page.appendChild(card); made = true;
      card.layoutMode = 'VERTICAL'; card.itemSpacing = 12; card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24;
      card.primaryAxisSizingMode = 'AUTO'; card.counterAxisSizingMode = 'FIXED'; card.cornerRadius = 12; card.fills = [{ type: 'SOLID', color: rgb(L.fills.card) }];
      card.resize(L.cardSize[0], L.cardSize[1]);
      await text(card, RULES.linkCard.badgeText, 'Bold', 18, { r: 1, g: 1, b: 1 });
    }
    const label = (PLAN.projectName || '프로젝트 문서') + (PLAN.month ? ' (' + PLAN.month + ')' : '');
    const t = await text(card, '🔗 ' + label, 'Bold', 14, { r: .47, g: .67, b: 1 }, PLAN.sourceUrl);
    if (made && root) { card.x = root.x; card.y = root.y - card.height - 80; }
    linkAdded = { cardId: card.id, textId: t.id, newCard: made };
  }
}
return { step: 'update', done, notFound, pastedSeen: pasted.length, pastedTop: pastedTop.length, leftoverRemoved, cardUpdated, linkAdded, log };
`;

// ---------- 기존 Core 갱신: 붙여 넣을 화면을 한곳에 모으기 (프로젝트 문서의 브랜치·복제본에서) ----------
// 파일 사이로는 코드가 화면을 못 옮긴다. 대신 같은 파일 안에서 바꿀 화면을 한 섹션에 모아, 사람이 섹션 하나만 ⌘C 하게 한다 (2026-10-14 윤우).
// 원본 프로젝트 문서·Core 본 파일에는 쓰지 않는다.
const GATHER = String.raw`
if (figma.fileKey && (figma.fileKey === PLAN.sourceKey || figma.fileKey === PLAN.coreKey)) throw new Error('원본 프로젝트 문서나 Core 본 파일입니다. 여기에는 쓰지 않습니다');
const found = [], missing = [];
for (const s of PLAN.screens) { const n = await figma.getNodeByIdAsync(s.id); if (n && n.type === 'FRAME') found.push(n); else missing.push(s.label); }
if (!found.length) throw new Error('보낼 화면을 하나도 찾지 못했어요. 이 프로젝트 문서의 브랜치(또는 복제본) 링크가 맞는지 확인해 주세요');
let page = figma.root.children.find(p => p.name === PLAN.pageName);
if (page) { for (const c of [...page.children]) c.remove(); } else { page = figma.createPage(); page.name = PLAN.pageName; }
const sec = figma.createSection(); page.appendChild(sec); sec.name = PLAN.sectionName;
let x = 80, h = 0;
for (const n of found) { const c = n.clone(); sec.appendChild(c); c.x = x; c.y = 80; x += c.width + 80; h = Math.max(h, c.height); }
sec.x = 0; sec.y = 0; sec.resizeWithoutConstraints(x, h + 160);
return { pageId: page.id, sectionId: sec.id, count: found.length, missing };
`;

function head(rules, plan) {
  const r = { fileKind: rules.fileKind, masterPage: rules.masterPage, layout: rules.layout, components: rules.components, linkCard: rules.linkCard, trim: rules.trim, screenPick: rules.screenPick };
  return `const RULES = ${JSON.stringify(r)};\nconst PLAN = ${JSON.stringify(plan)};\n` + SIG_FN + HELPERS;
}

const buildNewCoreCode = (rules, plan) => head(rules, plan) + NEW_BUILD;
const trimNewCoreCode = (rules, plan) => head(rules, plan) + NEW_TRIM;
const applyUpdateCode = (rules, plan) => head(rules, plan) + UPDATE_APPLY;
const gatherPasteCode = (plan) => `const PLAN = ${JSON.stringify(plan)};\n` + GATHER;

module.exports = { buildNewCoreCode, trimNewCoreCode, applyUpdateCode, gatherPasteCode, GATHER_SECTION: '📦 Core로 보낼 화면' };
