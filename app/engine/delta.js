// Δ 표: 프로젝트의 크기별 대표 화면(분석) ↔ Core 마스터의 화면(Core 읽기)을 한 칸씩 비교한다.
// 유지 = 같은 칸·같은 화면(완전히 같음 / 거의 같음) / 교체 = 같은 칸·내용 다름 / 추가 = Core에 그 칸이 없음 / 미수록 = 문서 섹션이 어느 칸에도 안 감.
//
// 판단 순서 (2026-10-12 WEB 768 실수 뒤 — "지문이 다르면 교체"로 단정했다가 틀림):
//  1) 대표 후보 중 Core 화면과 완전히 같은 것 → 유지
//  2) 문서 전체에서 찾은 Core 화면의 원본(sources: 완전히 같음 → 내용이 같음 순) → 그 원본을 대표로 바꾸고 유지
//     · 내용(글자·이미지)이 같고 요소 수만 다르면 "거의 같음"으로 유지하고 차이를 적는다(확인 필요)
//  3) 그래도 없을 때만 교체 — 차이 목록을 붙여야 표에 낼 수 있다(core.js가 채움)

// 바꿀 칸 고르기: 같은 폭 중 길이가 시안과 가장 가까운 화면. 비슷하면(10% 안) 크기 칸 바(🔵)가 있는 화면, 그다음 섹션 순서.
// 2026-10-27 SVOD 피쳐링셀: 폭만 보고 첫 칸을 골라 시안(375×812)이 홈 전체 "로그인/구독_small"(375×4816)을 덮을 뻔함 — 같은 크기의 "영상 컨텐츠_small"이 맞는 칸
// 시안이 Core 화면 길이의 이 비율보다 짧으면 "교체"가 아니라 "옆에 추가" (812/2097 = 0.39 → 추가, 721/812 = 0.89 → 교체)
const SHORT = 0.6;
function closest(slot, src) {
  const far = (s) => Math.round(Math.abs(Math.log((s.h || 1) / (src.h || 1))) * 10);
  return slot.map((s, i) => ({ s, i })).sort((a, b) => far(a.s) - far(b.s) || (!!b.s.bar - !!a.s.bar) || a.i - b.i).map(x => x.s)[0] || null;
}

function chosenOf(p) { return p.candidates.find(c => c.id === p.chosen) || null; }

// 후보 중 Core 화면과 완전히 같은 것을 대표로 (사람이 직접 고른 칸은 건드리지 않음)
function preferCoreScreens(analysis, core) {
  let changed = 0;
  for (const platform of Object.keys(analysis.platforms || {})) {
    const sigs = new Set((((core.platforms || {})[platform] || {}).screens || []).map(s => s.sig));
    for (const e of analysis.platforms[platform]) for (const p of e.picks) {
      if (p.touched) continue;
      const hit = p.candidates.find(c => sigs.has(c.sig));
      if (hit && hit.id !== p.chosen) { p.chosen = hit.id; changed++; }
      if (hit) { p.sure = true; p.basis = 'Core와 같음'; }
    }
  }
  return changed;
}

// 문서 전체에서 찾은 원본을 대표 후보로 넣고 고른다
function adoptSource(p, src, basis) {
  if (!p.candidates.some(c => c.id === src.id)) p.candidates.unshift({ id: src.id, name: src.name, w: src.w, h: src.h, score: null, learned: 0, sig: src.sig, csig: src.csig, n: src.n, path: src.path });
  p.chosen = src.id; p.sure = basis === 'Core와 같음'; p.basis = basis;
}

function computeDelta(analysis, core, sources = {}) {
  const rows = [];
  const usedCore = new Set();
  for (const platform of Object.keys(analysis.platforms || {})) {
    const coreScreens = ((core.platforms || {})[platform] || {}).screens || [];
    for (const e of analysis.platforms[platform]) {
      for (const p of e.picks) {
        const slot = coreScreens.filter(s => !usedCore.has(s.id) && s.cls === e.cls && Math.abs(s.w - p.width) < 0.5);
        let src = chosenOf(p);
        let target = slot.find(s => src && s.sig === src.sig) || null;
        let action = target ? '유지' : null, why = target ? '내용이 같음' : '', near = null;
        if (!target && !p.touched) {
          for (const s of slot) {
            const f = sources[s.id] || {};
            if (f.exact && f.exact[0]) { adoptSource(p, f.exact[0], 'Core와 같음'); target = s; action = '유지'; why = `내용이 같음 — 문서의 "${f.exact[0].name}"(${f.exact[0].path})가 Core 화면의 원본`; break; }
            if (f.content && f.content[0]) {
              const c = f.content[0]; adoptSource(p, c, '거의 같음'); target = s; action = '유지'; near = c;
              const gaps = [c.h !== s.h ? `높이 ${c.h} → Core ${s.h}` : '', c.n !== s.n ? `요소 수 ${c.n} → Core ${s.n}` : ''].filter(Boolean).join(', ');
              const others = f.content.slice(1).map(o => `"${o.name}"`).join(', ');
              why = `거의 같음 — 글자·이미지는 같음, 다른 점: ${gaps || '없음'}. 원본 = 문서의 "${c.name}"(${c.path})${others ? ` · 내용이 같은 다른 후보: ${others}` : ''}`;
              break;
            }
          }
          src = chosenOf(p);
        }
        if (!src) continue;
        let beside = null;
        if (!target) { target = closest(slot, src); // 길이가 가장 가까운 화면, 비슷하면 대표 화면(바 없음)보다 크기 칸 화면
          // 시안이 그 화면보다 훨씬 짧으면(팝업·일부 화면) 덮지 않고 옆에 새로 넣는다 (2026-10-28 윤우 "옆에 추가": 패키지 팝업 812가 결제페이지 2097을 덮을 뻔함)
          if (target && src.h < target.h * SHORT) { beside = target; target = null; }
          action = target ? '교체' : '추가';
          why = target ? `내용이 다름 (${target.w}×${target.h} → ${src.w}×${src.h}) · 문서 전체에서도 같은 원본을 못 찾음`
            : beside ? `Core의 "${beside.name}"(${beside.w}×${beside.h})보다 훨씬 짧은 화면(${src.w}×${src.h})이라 덮지 않고 그 옆에 새 화면으로 넣음`
            : `Core에 ${platform} ${e.cls} ${p.width}px 칸이 없음`; }
        if (target) usedCore.add(target.id);
        rows.push({
          platform, cls: e.cls, width: p.width, desc: e.desc, action, why,
          check: !!near || action === '교체',
          source: { id: src.id, name: src.name, w: src.w, h: src.h, sig: src.sig },
          target: target ? { id: target.id, name: target.name, w: target.w, h: target.h, sig: target.sig, bar: target.bar } : null,
          beside: beside ? { id: beside.id, name: beside.name, w: beside.w, h: beside.h, bar: beside.bar || null } : null
        });
      }
    }
    for (const s of coreScreens) if (!usedCore.has(s.id)) rows.push({
      platform, cls: s.cls, width: s.w, action: '그대로', source: null, target: { id: s.id, name: s.name, w: s.w, h: s.h },
      // 크기 칸 바(🔵)가 없는 화면 = 섹션 왼쪽의 대표 화면(전체 길이). 프로젝트 화면 한 장은 Core 한 칸에만 들어가므로 여기엔 안 들어간다
      why: s.bar ? '프로젝트에 맞는 칸이 없어 손대지 않음' : '대표 화면(크기 칸 바 없음)이라 앱이 바꾸지 않음 — 프로젝트에서 바뀐 부분이 이 화면에도 보이면 직접 고쳐 주세요',
      check: !s.bar
    });
  }
  const missing = (analysis.coverage || []).filter(c => !c.to).map(c => ({ action: '미수록', section: c.section, id: c.id, why: c.note }));
  const count = (a) => rows.filter(r => r.action === a).length;
  return { rows, missing, summary: { keep: count('유지'), near: rows.filter(r => r.action === '유지' && r.check).length, replace: count('교체'), add: count('추가'), untouched: count('그대로'), missing: missing.length } };
}

// ---------- 묶음 통째로 (2026-10-27 윤우 "묶음 통째로") ----------
// 교체 칸이 Core의 묶음(⚫·⚪ 바) 안에 있고 그 묶음 이름이 프로젝트 이름에 들어 있으면(피쳐링셀 문서 ↔ "피쳐링셀" 묶음),
// 한 장만 바꾸지 않고 묶음 안 화면을 모두 지우고 시안의 Case 섹션 화면(폭마다)으로 다시 채운다. 한 장만 바꾸면 옛 디자인과 새 디자인이 섞인다.
const norm = (t) => String(t || '').toLowerCase().replace(/[\s_\-()[\]·]/g, '');
// 가장 흔한 값 (같은 폭 화면들 위 🔵 바 제목·크기 칸 — 케이스 화면 몇 장은 다른 줄의 바 아래 걸려 엉뚱한 값을 가진다)
const mode = (xs) => { const c = new Map(); for (const x of xs.filter(Boolean)) c.set(x, (c.get(x) || 0) + 1); return [...c].sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || null; };
const projectTitle = (analysis) => norm([analysis.cover && analysis.cover.nameKR, analysis.cover && analysis.cover.nameEN, analysis.fileName].join(' '));

// 프로젝트 이름이 든 묶음(⚫·⚪ 바) 모두 → [{ platform, bar: {id, title}, olds: [Core 화면], widths: [폭] }]
function findGroupsAll(core, analysis) {
  const title = projectTitle(analysis);
  const out = [];
  for (const [platform, pf] of Object.entries(core.platforms || {})) {
    if (!pf.bars) continue;
    for (const scr of pf.screens || []) {
      const id = (scr.wb || []).find(b => { const t = norm(pf.bars[b]); return t.length >= 2 && title.includes(t); });
      if (!id || out.some(g => g.bar.id === id)) continue;
      const olds = pf.screens.filter(s => (s.wb || []).includes(id));
      out.push({ platform, bar: { id, title: pf.bars[id] }, olds: olds.map(s => Object.assign({ barTitle: s.bar ? pf.bars[s.bar] : null }, s)), widths: [...new Set(olds.map(s => s.w))] });
    }
  }
  return out;
}
// 그중 교체 칸이 걸린 묶음만 (묶음 통째로 바꾸기용)
function findGroups(delta, core, analysis) {
  const hit = new Set(delta.rows.filter(x => x.action === '교체' && x.target).map(x => x.platform + '|' + x.target.id));
  return findGroupsAll(core, analysis).filter(g => g.olds.some(s => hit.has(g.platform + '|' + s.id)));
}

// ---------- 부분 갱신 (2026-10-28 윤우: "길이는 유지하되 피쳐링셀 영역 중 다른 부분만 업데이트", 모든 프로젝트 공통) ----------
// 시안의 핵심 컴포넌트가 Core 메인 화면 안에 영역(reg)으로 있으면: 화면은 그대로 두고 영역 속만 바꾼다(높이 같을 때만), 그 부분만 따로 정리한 묶음은 지운다.
// 시안 화면은 Core에 넣지 않는다 — 소식함·플레이어처럼 Core에는 메인 기능 화면만 남긴다.
// designRegions = figma-part.js 결과 { 시안 화면 id: [영역…] }, groups = findGroupsAll, label = 핵심 컴포넌트 이름(사람이 읽는)
function partRows(delta, core, analysis, designRegions, groups, label) {
  const groupIds = new Set(groups.flatMap(g => g.olds.map(s => g.platform + '|' + s.id)));
  const isMain = (pf, s) => (s.reg || []).length && !groupIds.has(pf + '|' + s.id);
  const platforms = Object.entries(core.platforms || {});
  if (!platforms.some(([pf, p]) => (p.screens || []).some(s => isMain(pf, s)))) return null;
  const chosenBy = (pf, w) => { for (const e of (analysis.platforms || {})[pf] || []) for (const p of e.picks) if (Math.abs(p.width - w) < 0.5) { const c = chosenOf(p); if (c) return Object.assign({ cls: e.cls }, c); } return null; };
  const rows = [];
  for (const [platform, pf] of platforms) {
    for (const s of pf.screens || []) {
      if (groupIds.has(platform + '|' + s.id)) continue;
      const base = { platform, cls: s.cls, width: s.w, source: null, target: { id: s.id, name: s.name, w: s.w, h: s.h, sig: s.sig, bar: s.bar } };
      if (!isMain(platform, s)) { rows.push(Object.assign(base, { action: '그대로', check: false, why: `${label} 영역이 없는 화면 — 손대지 않음` })); continue; }
      const src = chosenBy(platform, s.w);
      const dreg = src && (designRegions || {})[src.id];
      if (!src) { rows.push(Object.assign(base, { action: '그대로', check: true, why: `같은 폭(${s.w}px) 시안이 없어 ${label} 영역을 못 바꿈 — 시안의 변화가 이 화면에도 해당하면 직접 고쳐 주세요` })); continue; }
      base.source = { id: src.id, name: src.name, w: src.w, h: src.h, sig: src.sig };
      if (!dreg || dreg.length !== s.reg.length) { rows.push(Object.assign(base, { action: '그대로', check: true, why: `시안 "${src.name}"에서 같은 ${label} 영역을 못 찾음 (Core ${s.reg.length}곳, 시안 ${dreg ? dreg.length : 0}곳) — 직접 확인해 주세요` })); continue; }
      const pairs = s.reg.map((a, i) => [a, dreg[i]]);
      const same = pairs.every(([a, b]) => a.csig === b.csig);
      const tall = pairs.find(([a, b]) => a.h !== b.h);
      const where = s.reg.map(a => `y${a.y}·높이 ${a.h}`).join(', ');
      if (same) rows.push(Object.assign(base, { action: '유지', check: false, why: `${label} 영역(${where}) 속이 시안 "${src.name}"과 같음` }));
      else if (tall) rows.push(Object.assign(base, { action: '그대로', check: true, why: `${label} 영역 높이가 다름 (Core ${tall[0].h} → 시안 ${tall[1].h}) — 아래 내용을 밀어야 해서 앱이 바꾸지 않음. 직접 고쳐 주세요` }));
      else rows.push(Object.assign(base, { action: '부분 교체', check: false, why: `화면은 그대로 두고 ${label} 영역(${where}) 속만 시안 "${src.name}"의 것으로 바꿈`, regions: s.reg.map(a => a.id), newRegions: dreg }));
    }
  }
  for (const g of groups) rows.push({
    platform: g.platform, cls: null, width: null, action: '묶음 삭제', check: true, group: { id: g.bar.id, title: g.bar.title }, olds: g.olds.map(s => ({ id: s.id, name: s.name, w: s.w, h: s.h })),
    source: null, target: { id: g.bar.id, name: `${g.bar.title} 묶음 ${g.olds.length}장`, w: null, h: null },
    why: `"${g.bar.title}" 묶음 ${g.olds.length}장(${g.olds.map(s => `"${s.name}"`).slice(0, 6).join(', ')}${g.olds.length > 6 ? ' 외' : ''})을 바와 함께 지움 — ${label}은 메인 화면 안에서 다루므로 따로 두지 않음`
  });
  const count = (a) => rows.filter(r => r.action === a).length;
  return { rows, missing: delta.missing, part: true, summary: { keep: count('유지'), near: 0, replace: 0, add: 0, untouched: count('그대로'), part: count('부분 교체'), drop: count('묶음 삭제'), missing: (delta.missing || []).length } };
}

// cases = figma-group.js 결과 sections ([{platform, width, id, name, frames}]) → 묶음에 걸린 줄을 "묶음 교체" 줄로 바꾼다
function applyGroups(delta, groups, cases) {
  // 시안 화면을 다 읽지 못한 폭이 있거나 넣을 시안 화면이 하나도 없는 묶음은 통째로 바꾸지 않는다 (지우기만 하는 일이 없게)
  const mine = (g) => cases.filter(c => c.platform === g.platform && g.widths.includes(c.width));
  groups = groups.filter(g => !mine(g).some(c => c.tooMany) && mine(g).some(c => c.frames.length));
  if (!groups.length) return delta;
  const inGroup = new Map(groups.flatMap(g => g.olds.map(s => [g.platform + '|' + s.id, g])));
  const rows = delta.rows.filter(r => !(r.target && inGroup.has(r.platform + '|' + r.target.id)));
  const sigBag = (xs) => xs.map(x => x.sig).sort().join(',');
  for (const g of groups) {
    const widths = [...new Set(g.olds.map(s => s.w).concat(cases.filter(c => c.platform === g.platform && g.widths.includes(c.width)).map(c => c.width)))].sort((a, b) => a - b);
    for (const w of widths) {
      const olds = g.olds.filter(s => s.w === w);
      const sec = cases.find(c => c.platform === g.platform && c.width === w);
      const news = sec ? sec.frames : [];
      const same = news.length && sigBag(news) === sigBag(olds);
      const gone = olds.map(s => `"${s.name}"`).join(', ');
      rows.push({
        platform: g.platform, cls: mode(olds.map(s => s.cls)), barTitle: mode(olds.map(s => s.barTitle)), width: w, action: same ? '유지' : '묶음 교체',
        group: { id: g.bar.id, title: g.bar.title }, section: sec ? { id: sec.id, name: sec.name } : null, sources: news, olds: olds.map(s => ({ id: s.id, name: s.name, w: s.w, h: s.h })),
        why: same ? `"${g.bar.title}" 묶음이 시안 "${sec.name}"과 같음`
          : news.length ? `"${g.bar.title}" 묶음을 통째로: Core ${olds.length}장(${gone})을 지우고 시안 "${sec.name}" ${news.length}장으로 채움`
          : `"${g.bar.title}" 묶음을 통째로 바꾸면서 지워짐 — 시안에 이 폭(${w}px) 화면이 없어요: ${gone}`,
        check: !same,
        source: news[0] ? Object.assign({}, news[0], { name: `${sec.name} ${news.length}장` }) : null,
        target: olds[0] ? { id: olds[0].id, name: `${g.bar.title} ${olds.length}장`, w: olds[0].w, h: olds[0].h } : null
      });
    }
  }
  const count = (a) => rows.filter(r => r.action === a).length;
  return Object.assign({}, delta, { rows, summary: Object.assign({}, delta.summary, { keep: count('유지'), replace: count('교체'), add: count('추가'), untouched: count('그대로'), group: count('묶음 교체') }) });
}

// ---------- 새 묶음 추가 (2026-10-30 윤우) ----------
// 일반 결제만 있는 Core에 패키지 결제 문서를 넣었더니 대표 1장(패키지 팝업)만 기존 줄에 끼어 "어느 게 패키지 케이스인지" 구분이 안 됐다.
// '추가' 칸(Core에 맞는 화면이 없어 새로 넣는 칸)은 그 폭의 이름 다른 화면을 모두(reads = figma-group.js 새 묶음 읽기) 프로젝트 이름 묶음으로 넣는다.
// 교체·유지·그대로 칸은 그대로. 대표로 고른 화면은 읽기에 빠졌어도 반드시 넣는다.
function addGroups(delta, reads, title) {
  const adds = delta.rows.filter(r => r.action === '추가' && r.source);
  if (!adds.length || !title) return delta;
  const used = new Set(delta.rows.filter(r => r.source && r.action !== '추가').map(r => r.source.sig));
  const rows = delta.rows.slice();
  for (const r of adds) {
    const g = (reads || []).find(x => x.platform === r.platform && Math.abs(x.width - r.width) < 0.5);
    let news = g && !g.tooMany ? g.frames.filter(f => !used.has(f.sig)) : [];
    if (!news.some(f => f.id === r.source.id)) news = [r.source].concat(news.filter(f => f.sig !== r.source.sig));
    const names = news.map(f => `"${f.name || f.id}"`);
    rows[rows.indexOf(r)] = {
      platform: r.platform, cls: r.cls, width: r.width, desc: r.desc, action: '묶음 추가', check: false, group: { title }, sources: news,
      source: Object.assign({}, news[0], { name: news.length > 1 ? `${names.slice(0, 3).join(' · ')}${news.length > 3 ? ' 외' : ''} ${news.length}장` : news[0].name }), target: null, beside: null,
      why: `Core에 없는 케이스라 기존 줄에 섞지 않고 "${title}" 묶음으로 따로 넣음 — 이 폭의 이름 다른 화면 ${news.length}장(${names.slice(0, 6).join(', ')}${news.length > 6 ? ' 외' : ''})`
    };
  }
  const count = (a) => rows.filter(r => r.action === a).length;
  return Object.assign({}, delta, { rows, summary: Object.assign({}, delta.summary, { add: count('추가'), addGroup: count('묶음 추가') }) });
}

module.exports = { computeDelta, preferCoreScreens, findGroups, findGroupsAll, applyGroups, partRows, addGroups };
