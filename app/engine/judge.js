// 판별: 프로젝트 커버 이름을 Core 색인과 대조해 "기존 Core 갱신 / 새 Core"를 제안한다 (plugin/code.js judge() 이식, 학습 표는 선택)
function judge(analysis, index, rules, mem) {
  const stop = (rules.judge && rules.judge.stopWords) || [];
  const minAuto = (rules.judge && rules.judge.minScoreForAuto) || 2;
  const learnedWords = (mem && mem.judgeWords) || {};
  const raw = [analysis.cover.nameEN, analysis.cover.nameKR, analysis.fileName].join(' ');
  const words = raw.split(/[\s\/·,()\-|]+/).filter(w => w.length >= 2 && !stop.includes(w.toLowerCase()));
  const byName = {};
  for (const f of (index && index.files) || []) {
    const hay = [f.name, ...(f.domain || []), JSON.stringify(f.master || {}), JSON.stringify(f.spec || {})].join(' ');
    const hits = words.filter(w => hay.includes(w));
    byName[f.name] = { name: f.name, key: f.key, url: f.url, score: hits.length, hits, learned: 0 };
  }
  for (const w of words.map(x => x.toLowerCase())) {
    const v = learnedWords[w]; if (!v) continue;
    for (const core in v) { byName[core] = byName[core] || { name: core, key: null, url: '', score: 0, hits: [], learned: 0 }; byName[core].learned += v[core]; byName[core].hits.push(w + '(학습)'); }
  }
  const scored = Object.values(byName).map(c => Object.assign(c, { total: c.score + c.learned })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const top = scored[0], second = scored[1];
  const auto = !!top && top.total >= minAuto && (!second || top.total - second.total >= 1);
  return {
    candidates: scored.slice(0, 5),
    suggestion: auto ? 'update' : 'new',
    target: auto ? top.name : '[Core] ' + (analysis.cover.nameEN || analysis.fileName).replace(/\s*(상세페이지)?\s*고도화\s*$/, '').trim(),
    sure: auto || scored.length === 0,
    reason: auto ? `${top.name}과 "${top.hits.join(', ')}"가 맞음` : (top ? '후보가 갈림 — 골라 주세요' : '색인 어디에도 없는 이름 → 새 Core')
  };
}
module.exports = { judge };
