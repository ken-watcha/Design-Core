// 묶음 통째로 바꾸기(2026-10-27 윤우 "묶음 통째로"): 프로젝트 문서에서 Core 묶음에 들어갈 화면을 폭마다 한 섹션씩 고른다 (use_figma로 보냄, 읽기 전용).
// 섹션 고르기: 그 폭의 화면이 바로 아래에 있는 섹션 중 이름에 Case·케이스가 든 것, 없으면 그 폭 화면이 가장 많은 것.
//   피쳐링셀 문서: Mobile 375 → [Small] Case, 768 → [Medium] Case, 1024 → 두 번째 [Medium] Case(이름은 Medium이지만 1024 화면) — 각 6장
const { SIG_FN } = require('./signature');

const FIGMA_SIDE = String.raw`
const out = { sections: [] };
for (const w of PLAN.want) {
  const page = await figma.getNodeByIdAsync(w.pageId);
  if (!page) continue;
  try { await page.loadAsync(); } catch (e) {}
  const secs = page.children.filter(n => n.type === 'SECTION').map(s => ({ s, fs: s.children.filter(f => f.type === 'FRAME' && Math.abs(f.width - w.width) < 0.5 && f.height >= PLAN.minHeight) })).filter(x => x.fs.length);
  if (!secs.length) continue;
  const named = secs.filter(x => /case|케이스/i.test(x.s.name));
  const pick = (named.length ? named : secs).sort((a, b) => b.fs.length - a.fs.length)[0];
  const fs = pick.fs.slice().sort((a, b) => a.y - b.y || a.x - b.x).slice(0, 24);
  out.sections.push({ platform: w.platform, width: w.width, id: pick.s.id, name: pick.s.name.slice(0, 40), frames: fs.map(f => Object.assign({ id: f.id, name: f.name.slice(0, 30), w: Math.round(f.width), h: Math.round(f.height) }, sigs(f))) });
}
// 20KB 한도: 크면 화면 이름부터 빼고, 그래도 크면 화면이 많은 섹션부터 빼며 빠졌다고 적는다 (빠진 폭은 앱이 묶음으로 안 바꿈)
const bytes = (o) => { const j = JSON.stringify(o); let b = 0; for (let i = 0; i < j.length; i++) { const c = j.charCodeAt(i); b += c < 0x80 ? 1 : c < 0x800 ? 2 : 3; } return b; };
if (bytes(out) > 16000) for (const s of out.sections) for (const f of s.frames) delete f.name;
while (bytes(out) > 16000 && out.sections.some(s => s.frames.length)) { const big = out.sections.slice().sort((a, b) => b.frames.length - a.frames.length)[0]; big.frames = []; big.tooMany = true; }
return out;
`;

function buildCaseReadCode(rules, plan) {
  return `const PLAN = ${JSON.stringify(Object.assign({ minHeight: (rules.screenPick || {}).minHeight || 0 }, plan))};\n` + SIG_FN + FIGMA_SIDE;
}

module.exports = { buildCaseReadCode };
