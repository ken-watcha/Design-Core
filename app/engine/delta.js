// Δ 표: 프로젝트의 크기별 대표 화면(분석) ↔ Core 마스터의 화면(Core 읽기)을 한 칸씩 비교한다.
// 유지 = 같은 칸·같은 내용 / 교체 = 같은 칸·내용 다름 / 추가 = Core에 그 칸이 없음 / 미수록 = 문서 섹션이 어느 칸에도 안 감.

function chosenOf(p) { return p.candidates.find(c => c.id === p.chosen) || null; }

// 기존 Core 갱신: 후보 중에 Core에 이미 있는 화면과 내용이 같은 것이 있으면 그걸 대표로 고른다
// (그 칸은 사람이 예전에 고른 화면이므로). 사람이 직접 고른 칸(touched)은 건드리지 않는다.
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

function computeDelta(analysis, core) {
  const rows = [];
  const usedCore = new Set();
  for (const platform of Object.keys(analysis.platforms || {})) {
    const coreScreens = ((core.platforms || {})[platform] || {}).screens || [];
    for (const e of analysis.platforms[platform]) {
      for (const p of e.picks) {
        const src = chosenOf(p);
        if (!src) continue;
        const slot = coreScreens.filter(s => !usedCore.has(s.id) && s.cls === e.cls && Math.abs(s.w - p.width) < 0.5);
        const same = slot.find(s => s.sig === src.sig);
        const target = same || slot[0] || null;
        if (target) usedCore.add(target.id);
        rows.push({
          platform, cls: e.cls, width: p.width, desc: e.desc,
          action: same ? '유지' : (target ? '교체' : '추가'),
          source: { id: src.id, name: src.name, w: src.w, h: src.h, sig: src.sig },
          target: target ? { id: target.id, name: target.name, w: target.w, h: target.h, sig: target.sig, bar: target.bar } : null,
          why: same ? '내용이 같음' : (target ? `내용이 다름 (${target.w}×${target.h} → ${src.w}×${src.h})` : `Core에 ${platform} ${e.cls} ${p.width}px 칸이 없음`)
        });
      }
    }
    for (const s of coreScreens) if (!usedCore.has(s.id)) rows.push({ platform, cls: s.cls, width: s.w, action: '그대로', source: null, target: { id: s.id, name: s.name, w: s.w, h: s.h }, why: '프로젝트에 맞는 칸이 없어 손대지 않음' });
  }
  const missing = (analysis.coverage || []).filter(c => !c.to).map(c => ({ action: '미수록', section: c.section, id: c.id, why: c.note }));
  const count = (a) => rows.filter(r => r.action === a).length;
  return { rows, missing, summary: { keep: count('유지'), replace: count('교체'), add: count('추가'), untouched: count('그대로'), missing: missing.length } };
}

module.exports = { computeDelta, preferCoreScreens };
