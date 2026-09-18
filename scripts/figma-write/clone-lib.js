// 깊은 복제 재구성 라이브러리 — build-clone-spec.py 출력(jobs)을 compose-clone-job.py가 이 파일과 합쳐 use_figma에 넣는다.
// 노드 종류: F 프레임 · R 사각형 · T 텍스트 · I 인스턴스 · V 벡터 · E 타원 · L 선. `_p` = 부모 토큰, `split` = 이 노드가 이후 작업의 부모가 됨.
// 인스턴스 우선순위: import(키) → import(세트 키+변형 이름) → 이 파일 안 같은 키 인스턴스 clone → `sub`(REST 하위 트리) 일반 노드 재구성 → 자리표시.
const compCache = {}, foundCache = {};
const needs = [], fails = [], created = {};
let pageScan = null;

async function getComp(key, setKey, cname) {
  if (compCache[key] !== undefined) return compCache[key];
  let c = null;
  try { c = await figma.importComponentByKeyAsync(key); } catch (e) {}
  if (!c && setKey) { try { const s = await figma.importComponentSetByKeyAsync(setKey); c = s.children.find(x => x.name === cname) || s.defaultVariant; } catch (e) {} }
  compCache[key] = c; return c;
}
async function findInstanceByKey(key) {
  if (foundCache[key] !== undefined) return foundCache[key];
  if (!pageScan) {
    pageScan = [];
    for (const p of figma.root.children) { try { await p.loadAsync(); } catch (e) { continue; } for (const i of p.findAllWithCriteria({ types: ['INSTANCE'] })) pageScan.push(i); }
  }
  let hit = null;
  for (const i of pageScan) { let mc = null; try { mc = await i.getMainComponentAsync(); } catch (e) {} if (mc && mc.key === key && !i.removed) { hit = i; break; } }
  foundCache[key] = hit; return hit;
}
function toPaint(p) {
  if (p.type === 'SOLID') return { type: 'SOLID', color: p.color, opacity: p.opacity, visible: p.visible !== false };
  if (p.type === 'IMAGE') return { type: 'IMAGE', imageHash: p.hash, scaleMode: p.scaleMode || 'FILL', visible: p.visible !== false, opacity: p.opacity == null ? 1 : p.opacity };
  return null;
}
function applyFills(node, fills) {
  const out = [];
  for (const p of fills || []) {
    if (p.type === 'IMAGE') { if (p.hash) { out.push(toPaint(p)); needs.push({ id: node.id, hash: p.hash }); } }
    else { const q = toPaint(p); if (q) out.push(q); }
  }
  try { node.fills = out; } catch (e) { fails.push('fills ' + node.name + ' ' + String(e).slice(0, 40)); }
}
function applyStrokes(node, s) {
  if (!s.strokes) return;
  try { node.strokes = s.strokes.map(toPaint).filter(Boolean); node.strokeWeight = s.sw || 1; if (s.sa) node.strokeAlign = s.sa; } catch (e) {}
}
function byNamePath(root, path) {
  let cur = root;
  for (const [name, k] of path) {
    if (!cur || !('children' in cur)) return null;
    const same = cur.children.filter(c => c.name === name);
    cur = same[k] || same[0] || null;
  }
  return cur;
}
function byLoosePath(root, path) {
  if (!path || !path.length) return null;
  const [n0, k0] = path[0];
  const same = ('children' in root) ? root.children.filter(c => c.name === n0) : [];
  const base = same[k0] || same[0] || root;
  if (path.length === 1) return same.length ? base : null;
  const last = path[path.length - 1][0], mids = path.slice(1, -1).map(p => p[0]);
  const cands = ('findAll' in base) ? base.findAll(n => n.name === last) : [];
  if (!cands.length) return null;
  if (cands.length === 1) return cands[0];
  const score = n => { let p = n.parent, i = mids.length - 1, sc = 0; while (p && p !== base) { if (i >= 0 && p.name === mids[i]) { sc++; i--; } p = p.parent; } return sc; };
  cands.sort((a, b) => score(b) - score(a)); return cands[0];
}
const deferred = [], pending = [];
async function applyOverrides(inst, ov, label) {
  const missed = [];
  for (const o of (ov || [])) {
    let node = await figma.getNodeByIdAsync('I' + inst.id + ';' + o.s);
    if (!node && o.p) node = byNamePath(inst, o.p) || byLoosePath(inst, o.p);
    if (!node) { missed.push(o); continue; }
    try {
      if (o.text != null && node.type === 'TEXT') { await loadTextFonts(node); node.characters = o.text; }
      if (o.fills) applyFills(node, o.fills);
      if (o.vis != null) node.visible = o.vis;
      if (o.op != null) node.opacity = o.op;
      if (o.props && node.type === 'INSTANCE') await setProps(node, await resolveProps(o.props), label);
    } catch (e) { fails.push('ov ' + label.slice(0, 16) + ' ' + o.s.slice(-10) + ' ' + String(e).slice(0, 40)); }
  }
  if (missed.length) pending.push({ id: inst.id, label, ov: missed });
}
async function loadTextFonts(t) { for (const s of t.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(s.fontName); }
function isAbsParent(parent) { return !parent || parent.type === 'SECTION' || parent.layoutMode === 'NONE' || !parent.layoutMode; }
function childLayout(node, s, parent) {
  if (isAbsParent(parent)) return;
  try { if (s.layoutPositioning === 'ABSOLUTE') node.layoutPositioning = 'ABSOLUTE'; } catch (e) {}
  try { if (s.layoutAlign) node.layoutAlign = s.layoutAlign; } catch (e) {}
  try { if (s.layoutGrow != null) node.layoutGrow = s.layoutGrow; } catch (e) {}
  try { if (s.layoutSizingHorizontal) node.layoutSizingHorizontal = s.layoutSizingHorizontal; } catch (e) {}
  try { if (s.layoutSizingVertical) node.layoutSizingVertical = s.layoutSizingVertical; } catch (e) {}
}
function placeAbs(node, s, parent, pos) {
  if (isAbsParent(parent) || s.layoutPositioning === 'ABSOLUTE') { node.x = pos ? pos.x : s.x; node.y = pos ? pos.y : s.y; }
}
function common(node, s, parent, pos) {
  if (s.op != null) node.opacity = s.op;
  if (s.vis === false) node.visible = false;
  childLayout(node, s, parent); placeAbs(node, s, parent, pos);
}
function frameProps(f, s) {
  f.clipsContent = !!s.clip;
  if (s.lm && s.lm !== 'NONE') {
    f.layoutMode = s.lm;
    if (s.itemSpacing != null) f.itemSpacing = s.itemSpacing;
    if (s.counterAxisSpacing != null) try { f.counterAxisSpacing = s.counterAxisSpacing; } catch (e) {}
    if (s.layoutWrap) try { f.layoutWrap = s.layoutWrap; } catch (e) {}
    f.paddingLeft = s.paddingLeft || 0; f.paddingRight = s.paddingRight || 0; f.paddingTop = s.paddingTop || 0; f.paddingBottom = s.paddingBottom || 0;
    if (s.primaryAxisAlignItems) f.primaryAxisAlignItems = s.primaryAxisAlignItems;
    if (s.counterAxisAlignItems) f.counterAxisAlignItems = s.counterAxisAlignItems;
    f.primaryAxisSizingMode = s.primaryAxisSizingMode || 'AUTO';
    f.counterAxisSizingMode = s.counterAxisSizingMode || 'FIXED';
  }
  applyFills(f, s.fills); applyStrokes(f, s);
  if (s.radius != null) f.cornerRadius = s.radius;
  if (s.radii) { f.topLeftRadius = s.radii[0]; f.topRightRadius = s.radii[1]; f.bottomRightRadius = s.radii[2]; f.bottomLeftRadius = s.radii[3]; }
  if (s.effects) try { f.effects = s.effects.map(e => ({ ...e, visible: e.visible !== false, blendMode: e.blendMode || 'NORMAL' })); } catch (e) { fails.push('effects ' + s.n); }
}
async function buildFrame(s, parent, pos, kids) {
  const f = figma.createFrame(); f.name = s.n; parent.appendChild(f);
  f.resizeWithoutConstraints(Math.max(s.w, 0.01), Math.max(s.h, 0.01));
  frameProps(f, s); common(f, s, parent, pos);
  if (s.split) created[s.split] = f.id;
  else for (const c of (kids || [])) await buildNode(c, f, null);
  if (!s.lm || s.lm === 'NONE') f.resizeWithoutConstraints(Math.max(s.w, 0.01), Math.max(s.h, 0.01));
  return f;
}
async function buildRect(s, parent) {
  const r = figma.createRectangle(); r.name = s.n; parent.appendChild(r);
  r.resize(Math.max(s.w, 0.01), Math.max(s.h, 0.01));
  applyFills(r, s.fills); applyStrokes(r, s);
  if (s.radius != null) r.cornerRadius = s.radius;
  if (s.radii) { r.topLeftRadius = s.radii[0]; r.topRightRadius = s.radii[1]; r.bottomRightRadius = s.radii[2]; r.bottomLeftRadius = s.radii[3]; }
  common(r, s, parent, null); return r;
}
async function buildVector(s, parent) {
  let v;
  if (s.t === 'E') { v = figma.createEllipse(); v.resize(Math.max(s.w, 0.01), Math.max(s.h, 0.01)); }
  else if (s.t === 'L') { v = figma.createLine(); v.resize(Math.max(s.w, 0.01), 0); }
  else { v = figma.createVector(); try { v.vectorPaths = (s.paths || []).filter(p => p.data).map(p => ({ windingRule: p.windingRule === 'EVENODD' ? 'EVENODD' : 'NONZERO', data: p.data })); } catch (e) { fails.push('vpath ' + s.n + ' ' + String(e).slice(0, 40)); } }
  v.name = s.n; parent.appendChild(v);
  applyFills(v, s.fills); applyStrokes(v, s);
  if (s.radius != null) try { v.cornerRadius = s.radius; } catch (e) {}
  common(v, s, parent, null); return v;
}
async function buildText(s, parent) {
  const t = figma.createText(); parent.appendChild(t);
  let font = { family: s.font.family, style: s.font.style };
  try { await figma.loadFontAsync(font); } catch (e) {
    const all = await figma.listAvailableFontsAsync();
    const alt = all.find(f => f.fontName.family === s.font.family && f.fontName.style.replace(/\s/g, '') === String(s.font.style).replace(/\s/g, ''));
    font = alt ? alt.fontName : { family: 'Inter', style: 'Regular' };
    await figma.loadFontAsync(font); fails.push('font ' + s.font.family + '/' + s.font.style + '→' + font.style);
  }
  t.fontName = font; t.name = s.n; t.characters = s.chars;
  if (s.size) t.fontSize = s.size;
  if (s.lh) t.lineHeight = s.lh;
  if (s.ls) t.letterSpacing = s.ls;
  t.textAlignHorizontal = s.ah || 'LEFT'; t.textAlignVertical = s.av || 'TOP';
  t.textAutoResize = s.ar === 'WIDTH_AND_HEIGHT' ? 'WIDTH_AND_HEIGHT' : (s.ar === 'HEIGHT' ? 'HEIGHT' : 'NONE');
  if (t.textAutoResize !== 'WIDTH_AND_HEIGHT') t.resize(Math.max(s.w, 1), Math.max(s.h, 1));
  applyFills(t, s.fills); common(t, s, parent, null); return t;
}
async function resolveProps(src) {
  const props = {};
  for (const k in (src || {})) { const v = src[k]; if (v && typeof v === 'object' && v.swap) { const c2 = await getComp(v.swap, null, null); if (c2) props[k] = c2.id; } else props[k] = v; }
  return props;
}
async function setProps(inst, props, label) {
  if (!Object.keys(props).length) return;
  try { inst.setProperties(props); }
  catch (e) { for (const k in props) { try { inst.setProperties({ [k]: props[k] }); } catch (e2) { fails.push('prop ' + label + ' ' + k.slice(0, 20)); } } }
}
async function buildInstance(s, parent) {
  if (s.split || (s.sub && s.forceSub)) return buildFrame(s, parent, null, s.sub);
  let inst = null, how = '';
  const comp = await getComp(s.key, s.setKey, s.cname);
  if (comp) { inst = comp.createInstance(); how = 'import'; }
  else { const f = await findInstanceByKey(s.key); if (f) { inst = f.clone(); how = 'clone'; } }
  if (!inst) {
    if (s.sub) { fails.push('sub ' + s.n); const fr = await buildFrame(s, parent, null, s.sub); fr.name = s.n; return fr; }
    fails.push('import ' + s.n + ' ' + (s.key || '').slice(0, 8));
    const ph = figma.createFrame(); ph.name = '⚠ 미불러옴: ' + s.n; parent.appendChild(ph); ph.resize(Math.max(s.w, 1), Math.max(s.h, 1));
    ph.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0.4 }, opacity: 0.3 }]; common(ph, s, parent, null); return ph;
  }
  parent.appendChild(inst); inst.name = s.n;
  await setProps(inst, await resolveProps(s.props), s.n);
  childLayout(inst, s, parent);
  const pn = isAbsParent(parent);
  if (pn || s.layoutSizingHorizontal === 'FIXED' || s.layoutSizingVertical === 'FIXED') {
    const w = (pn || s.layoutSizingHorizontal === 'FIXED') ? s.w : inst.width, h = (pn || s.layoutSizingVertical === 'FIXED') ? s.h : inst.height;
    if (Math.abs(inst.width - w) > 0.5 || Math.abs(inst.height - h) > 0.5) try { inst.resize(Math.max(w, 1), Math.max(h, 1)); } catch (e) {}
  }
  placeAbs(inst, s, parent, null);
  if (s.op != null) inst.opacity = s.op;
  if (s.vis === false) inst.visible = false;
  if (s.ov && s.ov.length) deferred.push({ inst, ov: s.ov, label: s.n });
  return inst;
}
async function buildNode(s, parent, pos) {
  if (s.t === 'F') return buildFrame(s, parent, pos, s.children);
  if (s.t === 'R') return buildRect(s, parent);
  if (s.t === 'T') return buildText(s, parent);
  if (s.t === 'I') return buildInstance(s, parent);
  if (s.t === 'V' || s.t === 'E' || s.t === 'L') return buildVector(s, parent);
  fails.push('skip ' + s.t + ' ' + s.n); return null;
}
async function run(SPEC, TOKENS, POS, PENDING) {
  const page = figma.root.children.find(p => p.id === '3420:6');
  await figma.setCurrentPageAsync(page);
  for (const p of (PENDING || [])) { const inst = await figma.getNodeByIdAsync(p.id); if (inst) await applyOverrides(inst, p.ov, p.label || ''); else fails.push('pending-miss ' + p.id); }
  const parents = {};
  let first = true;
  for (const s of SPEC) {
    const pid = created[s._p] || TOKENS[s._p];
    if (!pid) { fails.push('no-parent ' + s._p); continue; }
    if (!parents[pid]) parents[pid] = await figma.getNodeByIdAsync(pid);
    await buildNode(s, parents[pid], (first && s._p === 'ROOT') ? POS : null);
    first = false;
  }
  for (const d of deferred) await applyOverrides(d.inst, d.ov, d.label);
  return JSON.stringify({ created, needs: needs.map(n => n.id + ' ' + n.hash.slice(0, 8)), failCount: fails.length, fails: fails.slice(0, 30), pending });
}
