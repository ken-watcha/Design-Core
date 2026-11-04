// 부분 갱신(2026-10-28 윤우 "길이는 유지하되 피쳐링셀 영역 중 다른 부분만 업데이트" → 모든 프로젝트 공통 규칙):
// 시안이 다루는 핵심 컴포넌트(판별 feature, 예 featuringcell)가 Core 메인 화면 안에 있으면 화면을 통째로 바꾸지 않는다.
// 화면 맨 위 자식 중 그 컴포넌트가 든 것 = "영역". 반영 때 Core 화면은 그대로 두고 영역 속만 시안의 같은 영역으로 바꾼다 (높이가 같을 때만).
// 그 부분만 따로 정리한 묶음(SVOD의 "피쳐링셀" 묶음)은 지운다 — 소식함·플레이어처럼 Core에는 메인 기능 화면만 남긴다.
const { SIG_FN } = require('./signature');

// Figma 안에서 쓰는 조각: 컴포넌트 묶음 이름(judge.js family와 같은 식)과 화면의 영역 찾기
const REGION_FN = String.raw`
const family = (n) => String(n).toLowerCase().replace(/\((web|mobile|common|web-large|mobile,tablet)\)/g, '').replace(/\s+/g, '').split('/')[0];
const FEATURE = new Set(PLAN.feature || []);
const isFeat = (n) => n.type === 'INSTANCE' && FEATURE.has(family(n.name));
// 영역 = 화면 바로 아래 자식 중 핵심 컴포넌트 인스턴스를 품은 것 (자기 자신이 인스턴스여도 됨). 위에서 아래 순
// 틀 없이 화면 바로 아래에 같은 높이로 나란히 놓인 핵심 컴포넌트 인스턴스들은 한 영역(loose)으로 묶는다
// (2026-11-03 윤우: 피쳐링셀 문서 웹 768 "대표화면"은 셀 3개(가운데 1 + 양옆 캐러셀 2)가 틀 없이 놓여 있고 Core 768 화면은 틀 하나에 3개 → 영역 수 3:1로 짝이 안 맞아 그대로였음)
function regionsOf(screen) {
  if (!FEATURE.size || !('children' in screen)) return [];
  const list = screen.children.filter(c => c.visible !== false && (isFeat(c) || ('findOne' in c && !!c.findOne(isFeat)))).sort((a, b) => a.y - b.y || a.x - b.x);
  const out = [];
  for (const c of list) {
    const last = out[out.length - 1];
    if (isFeat(c) && last && last.loose && Math.abs(last.y - c.y) < 0.5 && Math.abs(last.height - c.height) < 0.5) {
      last.children.push(c); last.ids.push(c.id); const right = Math.max(last.x + last.width, c.x + c.width); last.x = Math.min(last.x, c.x); last.width = right - last.x;
    } else if (isFeat(c)) out.push({ loose: true, type: 'LOOSE', id: c.id, ids: [c.id], name: c.name, visible: true, x: c.x, y: c.y, width: c.width, height: c.height, children: [c] });
    else out.push(c);
  }
  return out.map(r => (r.loose && r.children.length === 1 ? r.children[0] : r));
}
// cases: 영역 바로 아래 핵심 컴포넌트 인스턴스마다 변형 속성(sizeClass 제외) "이름=값,…" — 같은 점수 후보 중 Core에 없는 케이스(예 type=ml)가 든 장을 대표로 고르는 데 쓴다 (2026-11-03)
// 컴포넌트에서 분리된 셀(프레임)은 'detached' — 케이스 맞춤 때 옆 셀을 복제해 바꾼다 (2026-11-04 SVOD·TVOD 웹 768 가운데 셀)
const isCellish = (n) => FEATURE.has(family(n.name)) && n.visible !== false;
const casesOf = (c) => ('children' in c ? c.children : []).filter(isCellish).slice(0, 6).map(i => { if (i.type !== 'INSTANCE') return 'detached'; let ps = {}; try { ps = i.componentProperties || {}; } catch (e) {} return Object.entries(ps).filter(([n]) => !/sizeclass/i.test(n)).map(([n, v]) => n.split('#')[0] + '=' + String(v && v.value)).join(',').slice(0, 80); });
const regionInfo = (c) => { const s = sigs(c); return { id: c.id, y: Math.round(c.y), h: Math.round(c.height), w: Math.round(c.width), csig: s.csig, n: s.n, cases: casesOf(c) }; };
`;

// 시안 화면(고른 대표 화면)마다 영역을 읽는다 → { regions: { 화면 id: [영역…] } }
const READ = String.raw`
const out = { regions: {} };
for (const id of PLAN.ids) {
  const f = await figma.getNodeByIdAsync(id);
  if (!f) continue;
  out.regions[id] = regionsOf(f).slice(0, 6).map(regionInfo);
}
return out;
`;

function buildRegionReadCode(plan) {
  return `const PLAN = ${JSON.stringify(plan)};\n` + SIG_FN + REGION_FN + READ;
}

module.exports = { REGION_FN, buildRegionReadCode };
