// 판별: 프로젝트를 Core 색인과 대조해 "기존 Core 갱신(여러 Core일 수 있음) / 새 Core"를 정한다 (plugin/code.js judge() 이식, 학습 표는 선택)
// 2026-10-26 윤우: 피쳐링셀은 SVOD 말고 TVOD에도 쓰인다 → 이름만 보지 말고, 고른 화면의 컴포넌트를 Core 15개 화면 전부와 비교한다.

// 내용 대조: 프로젝트 화면의 컴포넌트가 Core 화면 한 장에 얼마나 들어 있나 (0~1).
// 여러 Core에 흔한 컴포넌트(상단 바·버튼)는 가볍게, 드문 것(피쳐링셀)·어느 Core에도 없는 새 컴포넌트는 무겁게 센다.
// 시안은 Core 화면의 일부만 잘라 그린 경우가 많아서(전체 길이 4816 → 812) 닮은 정도가 아니라 "들어 있는 정도"를 본다.
// 1단계: 가장 많이 든 Core 화면이 strong(70%) 이상이면 그 Core (비슷하게 든 Core는 near 안에서 함께) — 피쳐링셀 시안 large → SVOD·TVOD 0.81
// 2단계(2026-10-26 윤우 "메인 화면 기준으로"): 시안의 핵심 컴포넌트(드문 컴포넌트 묶음 중 1단계 Core의 메인 화면에 있는 것)가
//   다른 Core의 메인 화면(🌏 대표 화면)에도 모두 있으면 그 Core도 갱신 → 웹툰(웹툰 탭 홈 맨 위 피쳐링셀).
//   메인이 아닌 곳에 그냥 나타난 것(소식함 뒤 배경, 왓챠파티·콘상페·플레이어 입구로 넣은 홈)은 해당 없음.
// 새 Core: 스텝메이드 문서(스텝메이드 Core 빼고) → 가장 높은 곳 0.59라 1단계에서 걸리는 Core가 없음.
// 분석(figma-analyze.js)이 컴포넌트 이름을 이 해시로 보낸다 — 같은 식이어야 한다
const compHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };

// 컴포넌트 묶음 이름: 플랫폼 표시를 떼고 첫 "/" 앞까지 (Featuring Cell(Web)/Title·Featuring Cell(Mobile) → featuringcell)
const family = (n) => String(n).toLowerCase().replace(/\((web|mobile|common|web-large|mobile,tablet)\)/g, '').replace(/\s+/g, '').split('/')[0];
const isMain = (s) => /^🌏/.test(s.name || '');

function contentMatch(analysis, index, cfg) {
  const comps = analysis.comps, names = index && index.component_names;
  if (!comps || !comps.picks || !names) return null;
  const files = (index.files || []).filter(f => (f.screen_components || []).length);
  if (!files.length) return null;
  const screens = files.flatMap(f => f.screen_components.map(s => ({ core: f, s, set: new Set(s.c) })));
  const N = screens.length, df = new Map();
  for (const x of screens) for (const i of x.set) df.set(i, (df.get(i) || 0) + 1);
  const pos = new Map(names.map((n, i) => [compHash(n), i]));
  const weight = (i) => Math.log((N + 1) / ((i == null ? 0 : df.get(i) || 0) + 1));
  const picks = [];
  for (const [pid, list] of Object.entries(comps.picks)) {
    const ids = [...new Set(list.map(k => comps.names[k]).filter(Boolean))].map(nm => pos.has(nm) ? pos.get(nm) : null);
    const total = ids.reduce((a, i) => a + weight(i), 0);
    if (!total) continue;
    const byCore = {};
    for (const x of screens) {
      const v = ids.reduce((a, i) => a + (i != null && x.set.has(i) ? weight(i) : 0), 0) / total;
      const b = byCore[x.core.name];
      if (!b || v > b.v) byCore[x.core.name] = { v, screen: x.s.name, id: x.s.id };
    }
    picks.push({ id: pid, byCore, best: Math.max(...Object.values(byCore).map(b => b.v)) });
  }
  // 거의 하나도 안 겹치면 자료가 어긋난 것(이름 읽기 실패 등)으로 보고 이름 판별에 맡긴다 — 새 기능 화면도 상단 바·버튼 같은 공통 컴포넌트로 30% 이상은 겹친다
  if (!picks.length || Math.max(...picks.map(p => p.best)) < cfg.minAny) return null;
  const cores = files.map(f => {
    const per = picks.map(p => ({ pick: p.id, ...(p.byCore[f.name] || { v: 0 }), strong: !!p.byCore[f.name] && p.byCore[f.name].v >= cfg.strong && p.byCore[f.name].v >= p.best - cfg.near }));
    const top = per.slice().sort((a, b) => b.v - a.v)[0];
    return { name: f.name, key: f.key, url: f.url, strong: per.filter(x => x.strong).length, avg: per.reduce((a, x) => a + x.v, 0) / per.length, top };
  }).sort((a, b) => b.strong - a.strong || b.top.v - a.top.v || b.avg - a.avg);
  const primary = cores.filter(c => c.strong > 0);
  // 2단계: 메인 화면 기준으로 같은 핵심 컴포넌트를 쓰는 Core
  const famDf = new Map();
  for (const x of screens) for (const fm of new Set([...x.set].map(i => family(names[i])))) famDf.set(fm, (famDf.get(fm) || 0) + 1);
  const mainFams = new Map(files.map(f => [f.name, new Set(f.screen_components.filter(isMain).flatMap(s => s.c.map(i => family(names[i]))))]));
  const projFams = new Set(Object.values(comps.picks).flat().map(k => pos.get(comps.names[k])).filter(i => i != null).map(i => family(names[i])));
  const rare = [...projFams].filter(fm => (famDf.get(fm) || 0) / N <= cfg.rareShare);
  const feature = [...new Set(primary.flatMap(c => rare.filter(fm => mainFams.get(c.name).has(fm))))];
  const viaMain = feature.length ? cores.filter(c => !primary.includes(c) && mainFams.get(c.name).size && feature.every(fm => mainFams.get(c.name).has(fm))) : [];
  // 사람이 읽을 이름: 그 묶음의 가장 짧은 원래 이름에서 플랫폼 표시를 뗀 것 (featuringcell → "Featuring Cell")
  const label = (fm) => names.filter(n => family(n) === fm).map(n => n.split('/')[0].replace(/\s*\([^)]*\)\s*/g, ' ').trim()).sort((a, b) => a.length - b.length)[0] || fm;
  viaMain.forEach(c => { c.viaMain = { screens: files.find(f => f.name === c.name).screen_components.filter(isMain).map(s => s.name), feature: feature.map(label) }; });
  return { picks: picks.length, cores, feature, targets: primary.concat(viaMain) };
}

const pct = (v) => Math.round(v * 100) + '%';

function judge(analysis, index, rules, mem) {
  const jr = (rules && rules.judge) || {};
  const stop = jr.stopWords || [];
  const minAuto = jr.minScoreForAuto || 2;
  const cfg = Object.assign({ strong: 0.7, near: 0.05, rareShare: 0.3, nameBackup: 0.5, minAny: 0.15 }, jr.content || {});
  const learnedWords = (mem && mem.judgeWords) || {};
  const raw = [analysis.cover.nameEN, analysis.cover.nameKR, analysis.fileName].join(' ');
  const words = [...new Set(raw.split(/[\s\/·,()\-|]+/).filter(w => w.length >= 2 && !stop.includes(w.toLowerCase())))];
  const byName = {};
  for (const f of (index && index.files) || []) {
    const hay = [f.name, ...(f.domain || []), JSON.stringify(f.master || {}), JSON.stringify(f.spec || {})].join(' ');
    const hits = words.filter(w => hay.includes(w));
    byName[f.name] = { name: f.name, key: f.key, url: f.url, score: hits.length, hits, learned: 0 };
    // 프로젝트 이름이 Core의 주제 하나와 통째로 같으면 한 단어만 겹쳐도 그 Core다 (2026-10-13 피쳐링셀 → SVOD (홈) 주제 "피쳐링셀")
    const exact = words.filter(w => (f.domain || []).some(d => d.trim() === w));
    if (exact.length) { byName[f.name].score += 1; byName[f.name].hits.push('주제 이름이 같음'); }
    // 이 Core를 만든 프로젝트 문서가 다시 오면 그 Core가 정답 (색인 source_projects)
    if (analysis.fileKey && (f.source_projects || []).includes(analysis.fileKey)) { byName[f.name].score += 5; byName[f.name].hits.unshift('이 문서로 만든 Core'); }
  }
  for (const w of words.map(x => x.toLowerCase())) {
    const v = learnedWords[w]; if (!v) continue;
    for (const core in v) { byName[core] = byName[core] || { name: core, key: null, url: '', score: 0, hits: [], learned: 0 }; byName[core].learned += v[core]; byName[core].hits.push(w + '(학습)'); }
  }
  const scored = Object.values(byName).map(c => Object.assign(c, { total: c.score + c.learned })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const top = scored[0], second = scored[1];
  const auto = !!top && top.total >= minAuto && (!second || top.total - second.total >= 1);
  // 2026-10-12 윤우: 점수표를 보여 주고 고르게 하지 말고 앱이 정하라 → 2점 이상 후보가 비길 때만 묻는다
  const tie = !!top && !auto && top.total >= minAuto;
  const newName = '[Core] ' + (analysis.cover.nameEN || analysis.fileName).replace(/\s*(상세페이지)?\s*고도화\s*$/, '').trim();
  const nameReason = auto ? (top.hits.includes('이 문서로 만든 Core') ? `이 프로젝트 문서로 만든 Core라서 ${top.name}을(를) 갱신해요.` : (top.hits.includes('주제 이름이 같음') ? `${top.name}이(가) 다루는 주제에 "${top.hits.filter(h => h !== '주제 이름이 같음').join('", "')}"이(가) 그대로 있어요. 이 Core를 갱신해요.` : `프로젝트 이름과 ${top.name} 이름이 겹쳐요 ("${top.hits.join('", "')}"). 이 Core를 갱신해요.`))
    : tie ? `${top.name}과 ${second.name}이 비슷하게 맞아요. 어느 Core인지 확인해 주세요.`
    : top ? '이름이 확실히 겹치는 기존 Core가 없어서 새 Core로 정했어요.' : '기존 Core 어디에도 없는 이름이라 새 Core로 정했어요.';
  const base = { candidates: scored.slice(0, 5), weak: !auto && !tie ? scored.filter(c => c.total > 0).slice(0, 3) : [] };
  const asTarget = (c, why, m) => ({ name: c.name, key: c.key, url: c.url, why, match: m || null });
  const evidence = (m) => !m ? '' : m.viaMain ? `메인 화면(${m.viaMain.screens.join(', ')})에 시안의 핵심 컴포넌트 ${m.viaMain.feature.join(', ')}이(가) 있어요` : m.top && m.top.screen ? `화면 "${m.top.screen}"에 시안 컴포넌트의 ${pct(m.top.v)}가 들어 있어요` : '';

  const content = contentMatch(analysis, index, cfg);
  const source = auto && top.hits.includes('이 문서로 만든 Core') ? top : null;
  // 내용 자료가 없으면(옛 색인·분석) 이름으로만 정한다
  if (!content) {
    return Object.assign(base, {
      suggestion: auto || tie ? 'update' : 'new', target: auto || tie ? top.name : newName, sure: !tie,
      targets: auto || tie ? [asTarget(top, nameReason)] : [], content: null, reason: nameReason
    });
  }
  const mOf = (name) => content.cores.find(c => c.name === name);
  let targets = content.targets.map(c => asTarget(c, evidence(c), c));
  // 이 문서로 만든 Core는 내용과 상관없이 맨 앞
  if (source) targets = [asTarget(source, '이 프로젝트 문서로 만든 Core예요', mOf(source.name)), ...targets.filter(t => t.name !== source.name)];
  // 내용이 확실히 겹치는 Core는 없지만 이름이 확실히 가리키고 그 Core와도 꽤 겹치면 그 Core (크게 다시 그린 시안)
  if (!targets.length && auto && mOf(top.name) && mOf(top.name).top.v >= cfg.nameBackup) targets = [asTarget(top, nameReason + ' ' + evidence(mOf(top.name)), mOf(top.name))];
  const near = content.cores[0];
  if (!targets.length) {
    return Object.assign(base, {
      suggestion: 'new', target: newName, sure: true, targets: [], content,
      reason: `시안 화면을 Core ${content.cores.length}개의 화면 전부와 비교했는데, 컴포넌트가 ${pct(cfg.strong)} 이상 들어 있는 Core 화면이 없어요` + (near && near.top.v ? ` (가장 가까운 곳: ${near.name} "${near.top.screen}" ${pct(near.top.v)})` : '') + '. 새 Core로 정했어요.'
    });
  }
  const names = targets.map(t => t.name);
  return Object.assign(base, {
    suggestion: 'update', target: names[0], sure: true, targets, content,
    reason: source && targets.length === 1 ? nameReason
      : targets.length > 1 ? `시안 화면이 Core ${targets.length}개에 들어 있어요: ${names.join(', ')}. 하나씩 차례로 갱신해요.`
      : `시안 화면이 ${names[0]}에 들어 있어요 (${evidence(targets[0].match)}). 이 Core를 갱신해요.`
  });
}
module.exports = { judge, contentMatch, compHash };
