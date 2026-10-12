// Figma 안에서 돌릴 "새 Core 만들기" 코드를 만든다 (use_figma로 보냄).
// 원본은 plugin/code.js의 buildNewCore·placePasted. "[Core] ○○" 파일 안에서만 쓴다:
//   pasted(기본, Ken 2026-10-12) = 빈 [Core] 파일에 사람이 ⌘V한 화면을 정리 / duplicate = 통째 복제본을 깎기
// DRY_RUN이면 쓰지 않고 확인만 한다(복제본인지·이름·고른 화면이 다 있는지). 쓰기 전엔 Named version을 저장한다.
const FIGMA_SIDE = String.raw`
const L = RULES.layout, M = RULES.masterPage;
const rgb = (a) => ({ r: a[0] / 255, g: a[1] / 255, b: a[2] / 255 });
const logs = []; const log = (m) => logs.push(m);
async function loadPages() { for (const p of figma.root.children) { try { await p.loadAsync(); } catch (e) {} } }
async function loadFont(style) {
  const f = { family: 'Pretendard JP', style }; try { await figma.loadFontAsync(f); return f; }
  catch (e) { const g = { family: 'Inter', style: style === 'Bold' ? 'Bold' : 'Regular' }; await figma.loadFontAsync(g); return g; }
}
async function loadTextFonts(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }

// 0 확인 (쓰기 전, DRY_RUN에서도 똑같이)
// MODE 'duplicate' = 프로젝트 파일을 통째로 Duplicate한 복제본 안에서 clone + 깎기
// MODE 'pasted'    = 빈 [Core] 파일에 사람이 ⌘V로 붙여 넣은 화면을 찾아 자리로 옮김 (파일 간 복사는 API로 안 됨)
await loadPages();
const names = figma.root.children.map(p => p.name.trim());
const problems = [];
if (names.includes(RULES.fileKind.corePageName)) problems.push('이미 "' + RULES.fileKind.corePageName + '" 페이지가 있습니다 (이미 만든 Core 파일)');
const hasProjectPages = RULES.fileKind.projectPagePatterns.some(pat => names.some(n => n.includes(pat)));
if (MODE === 'duplicate' && !hasProjectPages) problems.push('프로젝트 문서 복제본이 아닙니다 (프로젝트 페이지가 없음)');
if (MODE === 'pasted' && hasProjectPages) problems.push('빈 Core 파일이 아닙니다 (프로젝트 페이지가 있음)');
if (figma.fileKey && figma.fileKey === PLAN.sourceFileKey) problems.push('원본 프로젝트 파일입니다. ' + (MODE === 'pasted' ? '빈 [Core] 파일' : 'Duplicate한 복제본') + ' 링크를 넣어 주세요');
if (!/^\[Core\]/.test(figma.root.name.trim())) problems.push('파일 이름이 "[Core] ○○"가 아닙니다 (지금: ' + figma.root.name + ')');
const chosen = [];
for (const platform of M.sections) for (const entry of (PLAN.platforms[platform] || [])) for (const p of entry.picks) if (p.chosen) chosen.push({ platform, cls: entry.cls, width: p.width, id: p.chosen, fp: p.fp });
const absent = [];
const found = {};   // chosen id → 이 파일의 노드
if (MODE === 'duplicate') {
  for (const c of chosen) { const n = await figma.getNodeByIdAsync(c.id); if (n) found[c.id] = n; else absent.push(c.platform + ' ' + c.cls + ' ' + c.width + 'px'); }
} else {
  // 붙여 넣은 화면 = 페이지나 섹션 바로 아래의 프레임. 이름+크기로 짝짓고, 안 되면 크기가 유일하게 맞는 것
  const pool = [];
  for (const pg of figma.root.children) for (const n of pg.children) {
    if (n.type === 'FRAME') pool.push(n);
    else if (n.type === 'SECTION') for (const k of n.children) if (k.type === 'FRAME') pool.push(k);
  }
  const used = new Set();
  const same = (n, fp) => fp && Math.abs(n.width - fp.w) < 1 && Math.abs(n.height - fp.h) < 1;
  for (const c of chosen) {
    const named = (x) => x.name.trim() === String(c.fp && c.fp.name || '').trim();
    const sigOf = (x) => x.children.slice(0, 30).map(k => k.name).join('|');
    let n = c.fp && c.fp.sig ? pool.find(x => !used.has(x.id) && same(x, c.fp) && named(x) && sigOf(x) === c.fp.sig) : null;   // 이름·크기가 같은 화면이 여럿이어도 속 구성으로 구분
    if (!n) n = pool.find(x => !used.has(x.id) && same(x, c.fp) && named(x));
    if (!n) { const bySize = pool.filter(x => !used.has(x.id) && same(x, c.fp)); if (bySize.length === 1) n = bySize[0]; }
    if (n) { used.add(n.id); found[c.id] = n; } else absent.push(c.platform + ' ' + c.cls + ' ' + c.width + 'px' + (c.fp ? ' "' + c.fp.name + '"' : ''));
  }
}
if (absent.length) problems.push((MODE === 'pasted' ? '붙여 넣은 화면 중 못 찾은 것: ' : '복제본에서 고른 화면을 못 찾음: ') + absent.join(', '));
if (!chosen.length) problems.push('고른 대표 화면이 없습니다');
const check = { mode: MODE, fileName: figma.root.name, fileKey: figma.fileKey || null, pages: figma.root.children.map(p => p.name), screens: chosen.length, found: Object.keys(found).length, problems };
if (DRY_RUN || problems.length) return { dryRun: true, ok: !problems.length, check };

// 쓰기 전 버전 저장. 이 연결(use_figma)은 저장을 거부한 적이 있다(2026-09-18) → 안 되면 사람이 저장했다고 확인한 경우에만 계속
try { await figma.saveVersionHistoryAsync('Core 도우미 — 새 Core 정리 전', PLAN.projectName + ' · 원본 ' + (PLAN.sourceUrl || '')); log('버전 저장'); }
catch (e) {
  if (!PLAN.versionSavedByHuman) return { ok: false, check, needVersion: true, error: '자동 버전 저장이 안 돼 쓰지 않았습니다. Figma에서 File → Save to version history 후 "버전 저장했어요"에 체크하고 다시 진행해 주세요' };
  log('자동 버전 저장 불가 → 사람이 저장한 버전 사용');
}

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
  try { s.cornerRadius = L.radius; } catch (e) {}
  return s;
}
function diffFix(a, b, acc) {
  if (Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5) {
    try { if (b.type === 'TEXT') b.textAutoResize = 'NONE'; b.resize(a.width, a.height); acc.fixed++; } catch (e) { acc.failed++; }
  }
  const pb = b.parent, inLayout = pb && pb.type !== 'SECTION' && pb.layoutMode && pb.layoutMode !== 'NONE' && b.layoutPositioning !== 'ABSOLUTE';
  if (!inLayout && a.parent && a.parent.type !== 'PAGE' && pb && pb.type !== 'SECTION' && (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5)) { try { b.x = a.x; b.y = a.y; acc.fixed++; } catch (e) {} }
  if ('children' in a && 'children' in b) { const n = Math.min(a.children.length, b.children.length); for (let i = 0; i < n; i++) diffFix(a.children[i], b.children[i], acc); }
}
function diffCount(a, b) { let n = 0; const w = (x, y) => { if (Math.abs(x.width - y.width) > 0.5 || Math.abs(x.height - y.height) > 0.5) n++; if ('children' in x && 'children' in y) { if (x.children.length !== y.children.length) n++; const m = Math.min(x.children.length, y.children.length); for (let i = 0; i < m; i++) w(x.children[i], y.children[i]); } }; w(a, b); return n; }

// A 뼈대
const projName = PLAN.projectName || '프로젝트';
const page = figma.createPage(); page.name = M.name; figma.root.insertChild(Math.min(M.insertIndex, figma.root.children.length - 1), page);
await figma.setCurrentPageAsync(page);
const root = section(M.rootPrefix + projName, page, 0, 0, 1000, 1000, L.fills.root);

// 링크 카드
const card = figma.createFrame(); card.name = '📎 스펙 링크 카드'; root.appendChild(card);
card.layoutMode = 'VERTICAL'; card.itemSpacing = 16; card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 24;
card.primaryAxisSizingMode = 'AUTO'; card.counterAxisSizingMode = 'FIXED'; card.cornerRadius = 12; card.fills = [{ type: 'SOLID', color: rgb(L.fills.card) }];
card.resize(L.cardSize[0], L.cardSize[1]); card.x = L.rootPadding; card.y = L.rootPadding;
const white = { r: 1, g: 1, b: 1 }, grey = { r: .78, g: .78, b: .78 };
const fill = (s) => s.replace('<프로젝트명>', projName).replace('<배포월>', PLAN.releaseMonth || '2026.__').replace('<담당자>', PLAN.owner || '');
await text(card, projName, 'Bold', 18, white);
await text(card, fill(RULES.linkCard.body), 'Regular', 14, white);
await text(card, fill(RULES.linkCard.meta), 'Regular', 12, grey);
try {
  const badge = (await figma.importComponentByKeyAsync(RULES.components.badge)).createInstance(); card.appendChild(badge);
  try { badge.setProperties({ '상태': '링크' }); } catch (e) {}
  const bt = badge.findOne(n => n.type === 'TEXT' && /링크/.test(n.characters));
  if (bt) { await loadTextFonts(bt); bt.characters = RULES.linkCard.badgeText; if (PLAN.sourceUrl) bt.hyperlink = { type: 'URL', value: PLAN.sourceUrl }; }
} catch (e) { log('뱃지 컴포넌트를 못 가져와 링크 글자로 대신함'); await text(card, RULES.linkCard.badgeText, 'Bold', 14, { r: .47, g: .67, b: 1 }, PLAN.sourceUrl); }
card.layoutSizingHorizontal = 'FIXED';

// 섹션: 화면 복제 → 원본 대조 → 바 3단
let y = L.rootPadding + L.cardSize[1] + 80, maxW = 0;
const allScreens = [];
for (const platform of M.sections) {
  const picks = PLAN.platforms[platform]; if (!picks) continue;
  const sec = section(platform, root, L.rootPadding, y, 1000, 1000, L.fills.section);
  const screens = []; let x = L.sectionPadding; const barSizes = [];
  for (const entry of picks) {
    const startX = x; let clsW = 0;
    for (const p of entry.picks) {
      if (!p.chosen) continue;
      const src = found[p.chosen]; if (!src) continue;
      let c, acc = { fixed: 0, failed: 0 }, left;
      if (MODE === 'duplicate') { c = src.clone(); sec.appendChild(c); diffFix(src, c, acc); diffFix(src, c, acc); left = diffCount(src, c); }
      else { c = src; sec.appendChild(c); left = (p.fp && (Math.abs(c.width - p.fp.w) >= 1 || Math.abs(c.height - p.fp.h) >= 1)) ? 1 : 0; }   // 붙여 넣은 원본 그대로 옮김 → 크기만 대조
      c.name = RULES.screenPick.screenName.replace('<프로젝트명>', projName);
      c.x = x; c.y = 0;
      screens.push(c); allScreens.push({ id: c.id, from: src.id, platform, cls: entry.cls, width: p.width, fixed: acc.fixed, left });
      x += c.width + L.gap; clsW += c.width + L.gap;
    }
    if (clsW > 0) barSizes.push({ entry, x: startX, w: clsW - L.gap });
  }
  const innerW = Math.max(x - L.gap - L.sectionPadding, 400);
  await bar('barBlack', sec, L.sectionPadding, L.sectionPadding, innerW, projName, null);
  await bar('barWhite', sec, L.sectionPadding, L.barGroupY, innerW, RULES.screenPick.screenName.replace('<프로젝트명>', projName), null);
  let barBottom = L.barSizeY;
  for (const b of barSizes) { const bi = await bar('barBlue', sec, b.x, L.barSizeY, b.w, b.entry.cls, b.entry.desc); barBottom = Math.max(barBottom, L.barSizeY + bi.height); }
  const screenY = barBottom + L.gap; let bottom = screenY;
  for (const s of screens) { s.y = screenY; bottom = Math.max(bottom, s.y + s.height); }
  sec.resizeWithoutConstraints(innerW + L.sectionPadding * 2, bottom + L.sectionPadding);
  maxW = Math.max(maxW, sec.width); y += sec.height + L.sectionGap;
}
root.resizeWithoutConstraints(L.rootPadding * 2 + maxW, y - L.sectionGap + L.rootPadding);

// F 깎기: 로컬 컴포넌트 인스턴스 분리 → 프로젝트 페이지 삭제 → 페이지 순서 (복제본일 때만)
if (MODE === 'duplicate' && RULES.trim.detachLocalInstancesFirst) {
  let detached = 0;
  for (let round = 0; round < 6; round++) {
    const targets = [];
    for (const i of page.findAllWithCriteria({ types: ['INSTANCE'] })) { let mc = null; try { mc = await i.getMainComponentAsync(); } catch (e) {} if (mc && mc.remote === false) targets.push(i); }
    if (!targets.length) break;
    for (const i of targets) { if (i.removed) continue; try { i.detachInstance(); detached++; } catch (e) {} }
  }
  if (detached) log('로컬 컴포넌트 인스턴스 ' + detached + '개 분리');
}
let seenSep = false; const removed = [];
for (const p of (MODE === 'duplicate' ? [...figma.root.children] : [])) {
  const n = p.name.trim();
  if (n === '---') { if (seenSep && RULES.trim.deleteExtraSeparators) { removed.push(n); p.remove(); } seenSep = true; continue; }
  if (RULES.trim.deletePages.some(d => n.startsWith(d))) { removed.push(n); p.remove(); }
}
const order = RULES.trim.keepPages; let idx = 0;
for (const nm of order) { const p = figma.root.children.find(c => c.name.trim() === nm); if (p) { figma.root.insertChild(idx, p); idx++; } }
figma.root.setSharedPluginData('core-helper', 'build', JSON.stringify({ date: new Date().toISOString(), mode: MODE, source: PLAN.sourceFileKey, screens: allScreens }));
return { ok: true, check, pageId: page.id, rootId: root.id, screens: allScreens, removedPages: removed, pages: figma.root.children.map(p => p.name), logs };
`;

// 고른 화면의 이름·크기 (붙여 넣은 쪽 파일에서 짝을 찾을 때 씀)
function fingerprint(pick) {
  const c = (pick.candidates || []).find(x => x.id === pick.chosen);
  return c ? { name: c.name, w: c.w, h: c.h, sig: c.sig || null } : null;
}

// plan: { sourceFileKey, sourceUrl, projectName, releaseMonth, owner, platforms: { APP: [{cls, desc, picks:[{width, chosen}]}] } }
function buildNewCoreCode(rules, plan, { dryRun, mode = 'duplicate' }) {
  if (!['duplicate', 'pasted'].includes(mode)) throw new Error('알 수 없는 방식: ' + mode);
  const r = { fileKind: rules.fileKind, masterPage: rules.masterPage, layout: rules.layout, components: rules.components, linkCard: rules.linkCard, trim: rules.trim, screenPick: { screenName: rules.screenPick.screenName } };
  const p = {
    sourceFileKey: plan.sourceFileKey, sourceUrl: plan.sourceUrl || '', versionSavedByHuman: !!plan.versionSavedByHuman, projectName: plan.projectName || '', releaseMonth: plan.releaseMonth || '', owner: plan.owner || '',
    platforms: Object.fromEntries(Object.entries(plan.platforms || {}).map(([pf, es]) => [pf, es.map(e => ({ cls: e.cls, desc: e.desc, picks: e.picks.map(x => ({ width: x.width, chosen: x.chosen, fp: fingerprint(x) })) }))]))
  };
  return `const RULES = ${JSON.stringify(r)};\nconst PLAN = ${JSON.stringify(p)};\nconst DRY_RUN = ${dryRun ? 'true' : 'false'};\nconst MODE = ${JSON.stringify(mode)};\n` + FIGMA_SIDE;
}

// 분석 결과 → 새 Core 계획
function planFromAnalysis(r) {
  const a = r.analysis, cover = a.cover || {};
  // 이름은 판별의 새 Core 이름과 같게 ("[Core] 스텝메이드" → "스텝메이드")
  const fromVerdict = r.verdict && r.verdict.suggestion === 'new' ? String(r.verdict.target).replace(/^\[Core\]\s*/, '') : '';
  const name = (fromVerdict || String(cover.nameEN || a.fileName || '').replace(/\s*(상세페이지)?\s*고도화\s*$/, '')).trim();
  return { sourceFileKey: r.fileKey, sourceUrl: `https://www.figma.com/design/${r.fileKey}/`, projectName: name, owner: cover.owner || '', platforms: a.platforms };
}

module.exports = { buildNewCoreCode, planFromAnalysis };
