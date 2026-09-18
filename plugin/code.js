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

// ---------- 1. 파일 종류 ----------
async function detectFileKind() {
  await loadPages();
  const names = figma.root.children.map(p => p.name.trim());
  const fk = RULES.fileKind;
  if (names.includes(fk.corePageName)) return 'core';
  if (fk.projectPagePatterns.some(pat => names.some(n => n.includes(pat)))) return 'project';
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
    let s = 0;
    if (sp.preferNames.some(k => f.name.includes(k))) s += 2;
    if (f.name.trim() === String(width)) s += 2;
    if (sp.avoidNames.some(k => f.name.includes(k))) s -= 3;
    if (f.parent && f.parent.type === 'SECTION') s += 1;   // 섹션 직속 프레임 우선
    return s;
  };
  return frames.map(f => ({ id: f.id, name: f.name, w: Math.round(f.width), h: Math.round(f.height), y: Math.round(f.absoluteTransform[1][2]), score: score(f) }))
    .sort((a, b) => b.score - a.score || a.y - b.y);
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
    for (const s of sections) result.sections.push({ platform, id: s.id, name: s.name, frames: s.findAll(n => n.type === 'FRAME' && n.parent === s).length });
    const picks = [];
    for (const cls of cfg.classes) {
      const sec = sections.find(s => cls.sectionPatterns.some(pat => s.name.toLowerCase().includes(pat.toLowerCase())));
      const widths = [cls.width].concat(cls.extraWidths || []);
      const entry = { cls: cls.name, desc: cls.desc, section: sec ? { id: sec.id, name: sec.name } : null, picks: [] };
      for (const w of widths) {
        const cands = sec ? pickCandidates(sec, w) : pickCandidates(page, w);
        entry.picks.push({ width: w, chosen: cands.length ? cands[0].id : null, candidates: cands.slice(0, 6) });
        if (!cands.length) result.missing.push(`${platform} ${cls.name} ${w}px 화면을 못 찾음`);
      }
      picks.push(entry);
    }
    result.platforms[platform] = picks;
  }
  // 수록 대조표: 문서의 모든 섹션이 어느 크기에 갔는지
  result.coverage = result.sections.map(s => {
    const hit = Object.values(result.platforms).flat().find(e => e.section && e.section.id === s.id);
    return { section: `${s.platform} > ${s.name}`, to: hit ? `${s.platform} > ${hit.cls}` : '미수록 — 규칙에 없는 섹션 (사람 확인)' };
  });
  return result;
}

// ---------- 3. 판별: 색인 대조 ----------
function judge(analysis) {
  const words = (analysis.cover.nameEN + ' ' + analysis.cover.nameKR + ' ' + analysis.fileName).split(/[\s\/·,()\-]+/).filter(w => w.length >= 2);
  const cores = (INDEX && INDEX.files) || [];
  const scored = cores.map(f => {
    const hay = [f.name, ...(f.domain || []), JSON.stringify(f.master || {}), JSON.stringify(f.spec || {})].join(' ');
    let score = 0; const hits = [];
    for (const w of words) if (hay.includes(w)) { score++; hits.push(w); }
    return { name: f.name, key: f.key, url: f.url, score, hits };
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);
  const top = scored[0];
  const auto = top && top.score >= RULES.judge.minScoreForAuto && (!scored[1] || scored[1].score < top.score);
  return { candidates: scored.slice(0, 5), suggestion: auto ? 'update' : 'new', reason: auto ? `색인의 ${top.name}과 "${top.hits.join(', ')}"가 맞음` : (top ? '후보가 있으나 점수가 낮거나 갈림 — 사람이 고른다' : '색인의 어느 Core에도 이름이 없음 → 새 Core') };
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
      const plan = await figma.clientStorage.getAsync(STORE_PLAN);
      const kind = await detectFileKind();
      post('ready', { kind, plan: plan || null, rulesVersion: RULES.version, fileName: figma.root.name, fileKey: figma.fileKey || null, hasIndex: !!INDEX });
    }
    if (msg.type === 'analyze') {
      const a = await analyze(); const j = a.kind === 'project' ? judge(a) : null;
      post('analysis', { analysis: a, judge: j });
    }
    if (msg.type === 'savePlan') { await figma.clientStorage.setAsync(STORE_PLAN, msg.plan); post('planSaved', { plan: msg.plan }); }
    if (msg.type === 'clearPlan') { await figma.clientStorage.deleteAsync(STORE_PLAN); post('ready', { kind: await detectFileKind(), plan: null, rulesVersion: RULES.version, fileName: figma.root.name, hasIndex: !!INDEX }); }
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
