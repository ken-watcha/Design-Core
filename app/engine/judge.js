// 판별: 프로젝트 커버 이름을 Core 색인과 대조해 "기존 Core 갱신 / 새 Core"를 제안한다 (plugin/code.js judge() 이식, 학습 표는 선택)
function judge(analysis, index, rules, mem) {
  const stop = (rules.judge && rules.judge.stopWords) || [];
  const minAuto = (rules.judge && rules.judge.minScoreForAuto) || 2;
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
  return {
    candidates: scored.slice(0, 5),
    suggestion: auto || tie ? 'update' : 'new',
    target: auto || tie ? top.name : newName,
    sure: !tie,
    weak: !auto && !tie ? scored.filter(c => c.total > 0).slice(0, 3) : [],
    reason: auto ? (top.hits.includes('이 문서로 만든 Core') ? `이 프로젝트 문서로 만든 Core라서 ${top.name}을(를) 갱신해요.` : (top.hits.includes('주제 이름이 같음') ? `${top.name}이(가) 다루는 주제에 "${top.hits.filter(h => h !== '주제 이름이 같음').join('", "')}"이(가) 그대로 있어요. 이 Core를 갱신해요.` : `프로젝트 이름과 ${top.name} 이름이 겹쳐요 ("${top.hits.join('", "')}"). 이 Core를 갱신해요.`))
      : tie ? `${top.name}과 ${second.name}이 비슷하게 맞아요. 어느 Core인지 확인해 주세요.`
      : top ? '이름이 확실히 겹치는 기존 Core가 없어서 새 Core로 정했어요.' : '기존 Core 어디에도 없는 이름이라 새 Core로 정했어요.'
  };
}
module.exports = { judge };
