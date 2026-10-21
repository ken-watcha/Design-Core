// Δ 표: 프로젝트의 크기별 대표 화면(분석) ↔ Core 마스터의 화면(Core 읽기)을 한 칸씩 비교한다.
// 유지 = 같은 칸·같은 화면(완전히 같음 / 거의 같음) / 교체 = 같은 칸·내용 다름 / 추가 = Core에 그 칸이 없음 / 미수록 = 문서 섹션이 어느 칸에도 안 감.
//
// 판단 순서 (2026-10-12 WEB 768 실수 뒤 — "지문이 다르면 교체"로 단정했다가 틀림):
//  1) 대표 후보 중 Core 화면과 완전히 같은 것 → 유지
//  2) 문서 전체에서 찾은 Core 화면의 원본(sources: 완전히 같음 → 내용이 같음 순) → 그 원본을 대표로 바꾸고 유지
//     · 내용(글자·이미지)이 같고 요소 수만 다르면 "거의 같음"으로 유지하고 차이를 적는다(확인 필요)
//  3) 그래도 없을 때만 교체 — 차이 목록을 붙여야 표에 낼 수 있다(core.js가 채움)

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
        if (!target) { target = slot.find(s => s.bar) || slot[0] || null; // 대표 화면(바 없음)보다 크기 칸 화면을 먼저 바꾼다
          action = target ? '교체' : '추가'; why = target ? `내용이 다름 (${target.w}×${target.h} → ${src.w}×${src.h}) · 문서 전체에서도 같은 원본을 못 찾음` : `Core에 ${platform} ${e.cls} ${p.width}px 칸이 없음`; }
        if (target) usedCore.add(target.id);
        rows.push({
          platform, cls: e.cls, width: p.width, desc: e.desc, action, why,
          check: !!near || action === '교체',
          source: { id: src.id, name: src.name, w: src.w, h: src.h, sig: src.sig },
          target: target ? { id: target.id, name: target.name, w: target.w, h: target.h, sig: target.sig, bar: target.bar } : null
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

module.exports = { computeDelta, preferCoreScreens };
