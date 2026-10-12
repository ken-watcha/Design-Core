// 화면: 준비 상태 → 링크 → 분석 결과(판별 · 크기별 대표 화면 · 수록 대조표) → 📍 작업 위치 → (갱신) Δ 표·붙여넣기·반영 / (새 Core) 만들기 → 결과
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nodeUrl = (fileKey, id) => `https://www.figma.com/design/${fileKey}/?node-id=${String(id).replace(':', '-')}`;
let current = null;   // 분석 상태(analysis·verdict·place) — 단계마다 엔진에 통째로 넘긴다
let work = null;      // 확인된 작업 위치(+ 갱신이면 Core 읽기·Δ)
const linkTo = (base, id) => base.split('?')[0].replace(/\/$/, '') + '/?node-id=' + String(id).replace(':', '-');

async function showSetup() {
  const el = $('#setup');
  try {
    const s = await window.core.setup();
    if (s.claude && s.figma) el.innerHTML = `<span class="ok">● 준비됨</span> · Figma ${esc((s.who && s.who.handle) || '')}`;
    else if (!s.claude) el.innerHTML = `<span class="bad">● Claude Code 필요</span> · 설치·로그인 안내는 README 1단계`;
    else el.innerHTML = `<span class="bad">● Figma 연결 필요</span> · README 2단계 (터미널에서 claude → /mcp → figma → Authenticate)`;
    el.title = [s.detail, el.dataset.rules].filter(Boolean).join('\n');
  } catch (e) { el.innerHTML = `<span class="bad">● 확인 실패</span>`; el.title = e.message; }
}

async function showKnowledge() {
  // 규칙 버전·출처는 화면에 두지 않고, 준비 상태에 마우스를 올리면 보이게 (2026-10-12 윤우: "없어도 될 것 같다")
  try { const k = await window.core.knowledge(); const el = $('#setup'); el.dataset.rules = `규칙 ${k.rulesVersion} · Core ${k.cores}개 · ${k.from}`; if (!el.title.includes(el.dataset.rules)) el.title = [el.title, el.dataset.rules].filter(Boolean).join('\n'); }
  catch (e) { $('#footer').textContent = '규칙을 불러오지 못했습니다: ' + e.message; }
}

function render(r) {
  const a = r.analysis, v = r.verdict;
  if (a.kind !== 'project') {
    $('#result').innerHTML = `<section class="panel"><h2>프로젝트 문서가 아닙니다</h2><p class="muted">파일 종류: ${esc(a.kind)} · 페이지: ${esc(a.pages.join(' / '))}</p></section>`;
    return;
  }
  const cover = a.cover;
  // 판별: 점수표 대신 앱의 결론과 이유 한 줄 (2026-10-12 윤우: "점수랑 맞은 낱말은 뭐야?")
  const weak = (v.weak || []).map(c => `${esc(c.name)}("${esc(c.hits.join('", "'))}")`).join(', ');
  const verdictHtml = `<section class="panel"><h2>어디에 넣을까</h2>
    <div class="verdict"><span class="big">${v.suggestion === 'update' ? '기존 Core 갱신' : '새 Core 만들기'} → ${esc(v.target)}</span>
    ${v.sure ? '' : '<span class="pill warn">확인 필요</span>'}</div>
    <p class="muted">${esc(v.reason)}</p>
    ${weak ? `<p class="hint">참고로 이름이 조금 겹친 Core: ${weak}. 겹친 낱말이 하나뿐이라 갱신 대상으로 보지 않았어요.</p>` : ''}
    ${!v.sure ? `<p class="hint">비슷하게 맞은 Core: ${v.candidates.slice(0, 3).map(c => esc(c.name)).join(', ')}</p>` : ''}
    <p class="hint">프로젝트: ${esc(cover.nameKR || cover.nameEN)} · 커버 ${esc(cover.badge || '상태 없음')}</p>
  </section>`;
  let rows = '';
  // 대표 화면 표의 상태 태그 — 무엇을 해야 하는지 바로 읽히게 (2026-10-12 윤우: "바꿔서 뭘 할 수 있는지 인지가 안 돼")
  // 앱이 정한다 (2026-10-12 윤우: "고르게 하기보다 최적의 판단을 해서 골라라") — 태그는 이유만 보여 준다
  const pickTag = (p) => p.basis === 'Core와 같음' ? ['ok', 'Core와 같음'] : /거의/.test(p.basis || '') ? ['warn', 'Core와 거의 같음'] : ['ok', '자동 선택'];
  const pickWhy1 = (p) => {
    const c = p.candidates.find(x => x.id === p.chosen); if (!c || p.basis === 'Core와 같음' || /거의/.test(p.basis || '')) return '';
    const sp = current.pickRules || {};
    const r = (sp.strongNames || ['대표']).some(k => c.name.includes(k)) ? '이름에 "대표"' : (sp.preferNames || []).find(k => c.name.includes(k)) ? `이름에 "${(sp.preferNames || []).find(k => c.name.includes(k))}"` : c.name.includes(String(p.width)) ? '이름에 폭 숫자' : '';
    const others = p.candidates.length - 1;
    return [r, !p.sure && others ? `같은 폭 화면 ${others + 1}장 중 문서에서 가장 위` : ''].filter(Boolean).join(' · ');
  };
  // 고르는 칸은 두지 않는다 (2026-10-12 윤우: "여러 버전 바꿔 가며 볼 이유가 뭐야?") — 앱이 고른 이름만 보여 주고, 틀렸을 때만 보기 창에서 바꾼다
  const nameOf = (p) => { const c = p.candidates.find(x => x.id === p.chosen); return c ? `${c.name} · ${c.w}×${c.h}` : ''; };
  for (const pf of Object.keys(a.platforms)) for (const e of a.platforms[pf]) for (const p of e.picks) {
    const opts = p.candidates.map(c => `<option value="${esc(c.id)}"${c.id === p.chosen ? ' selected' : ''}>${esc(c.name)} · ${c.w}×${c.h}</option>`).join('');
    const [cls, tag] = pickTag(p);
    rows += `<tr><td>${esc(pf)} ${esc(e.cls)}<div class="muted">${esc(e.desc)}</div></td><td>${p.width}px</td>
      <td>${p.candidates.length ? `<span class="pick-name">${esc(nameOf(p))}</span><select hidden data-pf="${esc(pf)}" data-cls="${esc(e.cls)}" data-w="${p.width}">${opts}</select><div class="pick-why muted">${esc(pickWhy1(p))}</div>` : '<span class="pill bad">화면 없음</span>'}</td>
      <td class="tag"><span class="pill ${cls}">${tag}</span></td>
      <td class="go">${p.chosen ? `<button class="link plain" data-view="${esc(pf)}|${esc(e.cls)}|${p.width}">보기${CHEV}</button>` : ''}</td></tr>`;
  }
  const isUpdate = v.suggestion === 'update';
  // 2026-10-12 윤우: "대표 화면"이 무슨 뜻인지 모르겠다 → 이름을 "Core에 들어갈 화면"으로, 후보를 그림으로 나란히 보고 고르게
  const pickWhy = `Core 파일에는 크기마다 화면이 <b>딱 한 장씩</b> 들어가요. 앱이 이 문서에서 크기마다 한 장을 골랐어요. 따로 할 일은 없어요. 앱이 잘못 골랐을 때만 "보기"에서 바꾸면 돼요.`
    + (isUpdate ? ` 바꾸면 아래 "바뀔 내용"에서 그 칸이 <b>교체</b>로 잡혀요.` : '');
  const picksHtml = `<section class="panel"><h2>Core에 들어갈 화면 <span class="muted h2-sub">크기마다 1장</span></h2><p class="hint lead">${pickWhy}</p>
    <table class="picks"><tr><th>크기</th><th>폭</th><th>들어갈 화면</th><th class="tag"></th><th class="go"></th></tr>${rows}</table></section>`;
  const cov = (a.coverage || []).map(c => `<tr><td>${esc(c.section)}</td><td>${c.to ? esc(c.to) : '<span class="pill warn">미수록</span>'}</td><td class="muted">${esc(c.note)}</td></tr>`).join('');
  const covHtml = `<section class="panel"><h2>수록 대조표</h2><p class="hint" style="margin-top:0">문서의 섹션이 하나도 빠지지 않았는지 확인합니다.</p><table><tr><th>문서 섹션</th><th>Core에서 들어갈 자리</th><th></th></tr>${cov}</table>
    ${a.missing.length ? `<p class="muted">못 찾은 것: ${esc(a.missing.join(' · '))}</p>` : ''}</section>`;
  const cost = r.costUsd != null ? `<p class="hint">이번 분석에 쓴 Claude 사용량: 약 $${Number(r.costUsd).toFixed(3)}</p>` : '';
  const next = placeHtml(r) + cost.replace('<p class="hint">', '<p class="hint" style="text-align:right">');
  $('#result').innerHTML = verdictHtml + picksHtml + covHtml + next + '<div id="work"></div>';
  $('#placeForm') && $('#placeForm').addEventListener('submit', onPlace);
  document.querySelectorAll('select[data-pf]').forEach(s => s.addEventListener('change', () => {
    const e = current.analysis.platforms[s.dataset.pf].find(x => x.cls === s.dataset.cls); const p = e.picks.find(x => String(x.width) === s.dataset.w);
    p.chosen = s.value; p.sure = true; p.touched = true;
    const tag = s.closest('tr').querySelector('td.tag'); if (tag) tag.innerHTML = '<span class="pill ok">직접 선택</span>';
    const tr = s.closest('tr'), c = p.candidates.find(x => x.id === p.chosen); tr.querySelector('.pick-name').textContent = `${c.name} · ${c.w}×${c.h}`; tr.querySelector('.pick-why').textContent = '';
    if (work) { work = null; $('#work').innerHTML = '<section class="panel muted">대표 화면을 바꿨습니다 — 작업 위치 [확인]을 다시 눌러 주세요.</section>'; }
  }));
  // 후보마다 선택된 화면과 무엇이 다른지, 왜 선택했는지 적는다 (2026-10-12 윤우)
  const nameRule = (c, w) => { const sp = current.pickRules || {}; const pre = (sp.preferNames || []).find(k => c.name.includes(k));
    return (sp.strongNames || ['대표']).some(k => c.name.includes(k)) ? '이름에 "대표"가 들어 있어요' : pre ? `이름에 "${pre}"가 들어 있어요` : c.name.includes(String(w)) ? '이름에 폭 숫자가 들어 있어요' : ''; };
  const q = (xs) => xs.slice(0, 3).map(t => `"${esc(t)}"`).join(', ') + (xs.length > 3 ? ` 외 ${xs.length - 3}개` : '');
  const chosenNote = (p, c, n) => {
    if (p.basis === 'Core와 같음') return '<b>선택한 이유</b> 지금 Core에 들어 있는 화면과 같아요.';
    if (/거의/.test(p.basis || '')) return '<b>선택한 이유</b> 지금 Core에 들어 있는 화면과 거의 같아요.';
    const r = [nameRule(c, p.width), n > 1 && !p.sure ? '이름만으로는 후보끼리 구분이 안 돼서, 문서에서 가장 위에 있는 화면을 골랐어요' : ''].filter(Boolean);
    return `<b>선택한 이유</b> ${esc(r.join(' · ') || '이름이 대표 화면 이름 규칙에 가장 잘 맞아요')}`;
  };
  const otherNote = (p, c, s) => {
    const diff = [];
    if (c.h !== s.h) diff.push(`세로 ${c.h}px (선택된 화면 ${s.h}px)`);
    if (c.texts && s.texts) {
      const onlyC = c.texts.filter(t => !s.texts.includes(t)), onlyS = s.texts.filter(t => !c.texts.includes(t));
      if (onlyC.length) diff.push(`이 화면에만 있는 글자: ${q(onlyC)}`);
      if (onlyS.length) diff.push(`선택된 화면에만 있는 글자: ${q(onlyS)}`);
      if (!onlyC.length && !onlyS.length && c.h === s.h) diff.push('글자와 크기는 같아요. 이미지나 색만 다를 수 있어요.');
    }
    const whyNot = (c.score != null && s.score != null && c.score < s.score) ? `선택된 화면은 ${nameRule(s, p.width) || '이름이 대표 화면 이름 규칙에 더 잘 맞아요'}` : c.y > s.y ? '이름만으로는 구분이 안 돼서, 문서에서 더 위에 있는 화면을 선택했어요' : '이름만으로는 구분이 안 돼요';
    return `<b>다른 점</b> ${diff.length ? diff.join(' · ') : '확인하지 못했어요'}<br><b>선택되지 않은 이유</b> ${esc(whyNot)}`;
  };
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    const [pf, cls, w] = b.dataset.view.split('|');
    const p = current.analysis.platforms[pf].find(x => x.cls === cls).picks.find(x => String(x.width) === w);
    const cands = pickCands(p), sel0 = cands.find(c => c.id === p.chosen) || cands[0];
    openViewer({ pill: null, title: `${pf} ${cls} ${w}px · Core에 들어갈 화면`, why: cands.length > 1 ? '왼쪽이 선택된 화면이에요. 다른 화면이 맞을 때만 [이 화면으로]를 누르세요.' : '',
      sides: cands.map((c, i) => ({ label: c.id === p.chosen ? '선택된 화면' : `다른 후보 ${i}`, x: c, fileKey: current.fileKey, url: linkTo(current.sourceUrl, c.id),
        note: c.id === p.chosen ? chosenNote(p, c, cands.length) : otherNote(p, c, sel0),
        choose: cands.length > 1 && c.id !== p.chosen ? () => { const sel = document.querySelector(`select[data-pf="${pf}"][data-cls="${cls}"][data-w="${w}"]`); sel.value = c.id; sel.dispatchEvent(new Event('change')); closeCompare(); } : null })) });
  }));
  bindOpen();
}

$('#form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  work = null;
  const url = $('#url').value.trim();
  $('#go').disabled = true;
  document.body.classList.remove('home');
  $('#result').innerHTML = progressHtml('analyze', 'Figma 문서를 읽고 있어요');
  startProgress('analyze');
  try { current = await window.core.analyze(url); stopProgress(true); render(current); if (current.analysis.kind === 'project') prefetchPicks(); }
  catch (e) { stopProgress(); $('#result').innerHTML = `<section class="panel"><h2>분석하지 못했습니다</h2><p class="muted">${esc(e.message)}</p></section>`; }
  finally { $('#go').disabled = false; }
});

$('#setup').addEventListener('click', () => { $('#setup').textContent = '준비 상태 다시 확인 중…'; showSetup(); });

function bindOpen(root = document) { root.querySelectorAll('[data-open]').forEach(b => { if (b.dataset.bound) return; b.dataset.bound = 1; b.addEventListener('click', () => window.core.open(b.dataset.open)); }); }
// 쓰기 전 Named version: 이 연결(use_figma)은 자동 저장을 거부해서(2026-09-18) 사람이 저장하고 체크해야 버튼이 켜진다
const VERSION_GATE = (btnId) => `<label class="check"><input type="checkbox" data-gate="${btnId}"> 쓰기 전에 이 파일 버전을 저장했어요 (Figma: File → Save to version history)</label>`;
function bindGate(root) { root.querySelectorAll('[data-gate]').forEach(c => { const b = document.getElementById(c.dataset.gate); if (!b) return; b.disabled = !c.checked; c.addEventListener('change', () => { b.disabled = !c.checked; }); }); }
const openBtn = (url, label = 'Figma에서 보기') => `<button class="link" data-open="${esc(url)}">${esc(label)}</button>`;
// ---------- 진행 막대 (2026-10-12 윤우: 얼마나 남았는지) ----------
// 실제 단계(Claude 켜기 → Figma 읽기/쓰기 → 정리)는 엔진이 알려 주고, 남은 시간은 지난번에 걸린 시간으로 어림한다
const STAGE_TEXT = { start: 'Claude를 켜는 중', figma: 'Figma와 주고받는 중', wrap: '결과 정리 중', done: '마무리 중' };
const EXPECT = { analyze: 45, place: 60, apply: 90, build: 180 };
const store = { get: (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch (e) { return 0; } }, set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} } };
let prog = null;
function progressHtml(op, title, id = '') {
  return `<section class="panel prog"${id ? ` id="${id}"` : ''} data-op="${op}"><div class="prog-head"><b>${esc(title)}</b><span class="muted prog-left"></span></div>
    <div class="prog-bar"><div class="prog-fill"></div></div><div class="muted prog-stage">준비 중</div></section>`;
}
function startProgress(op) {
  stopProgress();
  const expect = store.get('dur:' + op) || EXPECT[op] || 60, t0 = Date.now();
  prog = { op, t0, expect, stage: '', label: '', timer: setInterval(tick, 250) };
  tick();
}
function tick() {
  if (!prog) return;
  const el = document.querySelector(`.prog[data-op="${prog.op}"]`); if (!el) return;
  const t = (Date.now() - prog.t0) / 1000;
  const pct = Math.min(95, 100 * (1 - Math.exp(-2.3 * t / prog.expect)));   // 어림 시간에 90%, 끝까지 95%를 넘지 않음
  el.querySelector('.prog-fill').style.width = pct.toFixed(1) + '%';
  // 남은 초 대신 진행률로 보여 준다 (2026-10-12 윤우: 초보다 %가 낫다)
  el.querySelector('.prog-left').textContent = Math.floor(pct) + '%';
  el.querySelector('.prog-stage').textContent = [prog.label, STAGE_TEXT[prog.stage] || '준비 중'].filter(Boolean).join(' · ');
}
function stopProgress(ok) {
  if (!prog) return;
  clearInterval(prog.timer);
  if (ok) { const took = (Date.now() - prog.t0) / 1000, old = store.get('dur:' + prog.op); store.set('dur:' + prog.op, Math.round(old ? old * 0.6 + took * 0.4 : took)); }
  prog = null;
}
window.core.onProgress && window.core.onProgress((ev) => { if (!prog) return; prog.stage = ev.stage; prog.label = String(ev.label || '').replace(/^Core 업데이트:\s*/, '').replace(/\s*\(읽기 전용\)$/, ''); tick(); });
const busy = (msg) => { $('#work').innerHTML = `<section class="panel spinner">${esc(msg)}</section>`; };
const fail = (title, e) => { $('#work').innerHTML = `<section class="panel"><h2>${esc(title)}</h2><p class="muted">${esc(e && e.message ? e.message : e)}</p></section>`; };
const money = (v) => v != null ? `<p class="hint">이번 단계 Claude 사용량: 약 $${Number(v).toFixed(3)}</p>` : '';

// ---------- 📍 작업 위치 ----------
function placeHtml(r) {
  const pl = r.place; if (!pl) return '';
  const head = pl.kind === 'branch' ? `기존 Core 갱신 → ${esc(pl.coreName)}의 브랜치` : `새 Core → 프로젝트 파일의 복제본 (${esc(pl.coreName)})`;
  const link = pl.kind === 'branch' ? (pl.coreUrl ? openBtn(pl.coreUrl, pl.coreName + ' 열기') : '') : openBtn(r.sourceUrl, '프로젝트 파일 열기');
  return `<section class="panel"><h2>📍 작업 위치</h2>
    <div class="verdict"><span class="big">${head}</span>${link}</div>
    <p class="muted">${esc(pl.why)}</p>
    <ol>${pl.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <form id="placeForm"><div class="row"><input id="placeUrl" type="url" required autocomplete="off" placeholder="${pl.kind === 'branch' ? '브랜치 링크 (…/branch/…)' : '복제본 링크'}"><button id="placeGo" type="submit">확인</button></div></form>
    <p class="hint">되돌릴 지점이 필요하면 그 파일에서 먼저 버전 저장(⌥⌘S)을 해 두세요 — 이 연결로는 자동 저장이 안 됩니다. 확인은 읽기만 합니다.</p></section>`;
}

async function onPlace(ev) {
  ev.preventDefault();
  const url = $('#placeUrl').value.trim();
  $('#placeGo').disabled = true; $('#work').innerHTML = progressHtml('place', '작업 위치를 확인하고 바뀔 내용을 비교하고 있어요'); startProgress('place');
  try {
    const w = await window.core.checkWorkplace(current, url);
    stopProgress(true);
    if (!w.ok) { fail('이 링크에서는 작업하지 않습니다', w.why); return; }
    work = w;
    if (w.kind === 'branch') { current.analysis = w.analysis; render(current); $('#placeUrl').value = url; showDelta(); prefetchDelta(); }
    else showBuild();
  } catch (e) { stopProgress(); fail('작업 위치를 확인하지 못했습니다', e); }
  finally { $('#placeGo').disabled = false; }
}

// ---------- 기존 Core 갱신 ----------
const diffHtml = (d) => {
  if (!d) return '';
  const part = (label, xs, more) => xs.length ? `<div>${label}: ${xs.map(esc).join(', ')}${more ? ` 외 ${more}개` : ''}</div>` : '';
  const body = part('원본에만', d.onlyA, d.moreA) + part('Core에만', d.onlyB, d.moreB);
  return body ? `<div class="diff">${body}</div>` : '<div class="diff">요소·글자 차이 없음</div>';
};
// 오른쪽 화살표 아이콘 (글자 › 는 작고 굵기가 안 맞아 2026-10-12 윤우 지적으로 바꿈)
const CHEV = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ACTION_PILL = { '유지': 'ok', '교체': 'warn', '추가': 'warn', '그대로': '', '미수록': 'bad' };
const screenCell = (x) => x ? `${esc(x.name || '')}<div class="muted size">${x.w}×${x.h}</div>` : '<span class="muted">—</span>';
function showDelta() {
  const d = work.delta, s = d.summary;
  const rows = d.rows.map((r, i) => `<tr class="pick" data-row="${i}" title="눌러서 두 화면 나란히 보기"><td class="act"><span class="pill ${ACTION_PILL[r.action]}">${r.action}</span></td><td>${esc(r.platform)} ${esc(r.cls || '')} ${r.width}px</td>
    <td>${screenCell(r.source)}</td><td>${r.target ? screenCell(Object.assign({ name: 'Core' }, r.target)) : screenCell(null)}</td><td class="muted">${r.check ? '<span class="pill warn">확인 필요</span> ' : ''}${esc(r.why)}${diffHtml(r.diff)}</td><td class="go"><span class="go-in">비교${CHEV}</span></td></tr>`).join('');
  const miss = d.missing.map((m, i) => `<tr class="pick" data-miss="${i}" title="눌러서 화면 보기"><td class="act"><span class="pill bad">미수록</span></td><td colspan="3">${esc(m.section)}</td><td class="muted">${esc(m.why)}</td><td class="go"><span class="go-in">보기${CHEV}</span></td></tr>`).join('');
  const todo = d.rows.filter(r => r.action === '교체' || r.action === '추가');
  const paste = todo.length ? `<h2 style="margin-top:18px">붙여넣기 (사람 손 1회)</h2>
    <ol><li>아래 화면을 원본 프로젝트 문서에서 열어 모두 선택 → ⌘C<ul>${todo.map(r => `<li>${esc(r.platform)} ${esc(r.cls)} ${r.width}px — ${esc(r.source.name)} ${openBtn(linkTo(current.sourceUrl, r.source.id), '원본 열기')}</li>`).join('')}</ul></li>
    <li>브랜치의 🌏 마스터 파일 페이지 빈 곳에 ⌘V ${openBtn(linkTo(work.workUrl, work.core.masterPageId), '브랜치 마스터 열기')}</li>
    <li>[반영]을 누르면 앱이 붙여 넣은 화면을 알아보고 교체(이름·위치·링크 유지, 속만 바꿈)·추가(🔵 바와 함께)·링크 카드 기준 날짜를 고칩니다</li></ol>
    ${VERSION_GATE('applyGo')}<button id="applyGo">반영</button>` : '';
  // 결론을 맨 위에 (2026-10-12 윤우: 결과 표만 보고는 "그래서 뭘 하라는 건지" 몰랐음)
  const checks = d.rows.filter(r => r.check && r.action === '유지').length;
  const next = [checks ? `"확인 필요" ${checks}칸은 거의 같은 화면이에요. 한 번 눈으로 보고 괜찮으면 넘어가세요.` : '', s.missing ? `미수록 ${s.missing}개는 문서에만 있는 섹션이에요. 넣지 않아도 돼요.` : ''].filter(Boolean);
  const verdict = todo.length
    ? `<div class="conclusion warn"><b>바꿀 화면 ${todo.length}칸</b> — 아래 "붙여넣기" 순서대로 하고 [반영]을 누르세요.</div>`
    : `<div class="conclusion ok"><b>바꿀 화면이 없어요.</b> Core가 프로젝트 문서와 같아요. 브랜치는 머지할 필요 없이 버리면 돼요.${next.length ? '<ul>' + next.map(t => `<li>${t}</li>`).join('') + '</ul>' : ''}</div>`;
  $('#work').innerHTML = `<section class="panel"><h2>Δ 바뀔 내용 — ${esc(current.place.coreName)}</h2>
    ${verdict}
    <p class="muted">유지 ${s.keep}${s.near ? ` (그중 거의 같음 ${s.near})` : ''} · 교체 ${s.replace} · 추가 ${s.add}${s.untouched ? ' · 그대로 ' + s.untouched : ''} · 미수록 ${s.missing}${work.preferred ? ` — Core에 이미 있는 화면과 같은 후보 ${work.preferred}칸을 대표로 맞췄습니다` : ''}</p>
    <p class="hint" style="margin:0 0 6px">줄을 누르면 프로젝트 화면과 Core 화면을 나란히 볼 수 있어요.</p>
    <table class="delta"><tr><th class="act"></th><th>칸</th><th>프로젝트 화면</th><th>Core 화면</th><th></th><th></th></tr>${rows}${miss}</table>
    ${work.unverifiedBranch ? '<p class="hint">이 링크가 브랜치인지 복제본인지는 앱이 가릴 수 없습니다. 복제본이면 나중에 Core에 합칠(머지) 수 없으니, Figma에서 브랜치인지 한 번 확인해 주세요.</p>' : ''}
    ${paste}${money(work.costUsd)}</section>`;
  bindOpen($('#work')); bindGate($('#work'));
  $('#work').querySelectorAll('tr.pick').forEach(tr => tr.addEventListener('click', (ev) => { if (ev.target.closest('button')) return; openCompare(tr.dataset.row != null ? d.rows[tr.dataset.row] : null, tr.dataset.miss != null ? d.missing[tr.dataset.miss] : null); }));
  $('#applyGo') && $('#applyGo').addEventListener('click', onApply);
}

// ---------- 두 화면 나란히 보기 (2026-10-12 윤우: 링크로 Figma를 오가지 말고 앱 안에서 비교) ----------
const shotCache = new Map();   // fileKey|id → 그림(data:)을 주는 약속 — 한 번 부른 화면은 다시 부르지 않는다
const shotKey = (it) => it.fileKey + '|' + it.nodeId;
// 여러 화면을 Claude 한 번에 받는다 (Claude를 띄우는 데 드는 시간이 대부분이라 묶을수록 빠르다)
function requestShots(items) {
  const need = items.filter(it => it.nodeId && !shotCache.has(shotKey(it)));
  if (!need.length) return;
  const batch = window.core.screens(need);
  need.forEach((it, i) => shotCache.set(shotKey(it), batch.then(r => r.images[i]).catch(() => { shotCache.delete(shotKey(it)); return null; })));
}
function loadShots(items) { requestShots(items); return Promise.all(items.map(it => shotCache.get(shotKey(it)))); }
// 결과가 나오면 볼 만한 화면을 미리 받아 둔다 — 줄을 누를 때 기다리지 않게
// 고른 화면을 맨 앞에, 후보는 최대 3장까지
const pickCands = (p) => { const first = p.candidates.find(x => x.id === p.chosen); return [first, ...p.candidates.filter(x => x !== first)].filter(Boolean).slice(0, 3); };
const prefetchPicks = () => requestShots(Object.values(current.analysis.platforms).flat().flatMap(e => e.picks.flatMap(p =>
  (p.sure ? pickCands(p).slice(0, 1) : pickCands(p)).map(c => ({ fileKey: current.fileKey, nodeId: c.id, w: c.w, h: c.h })))));
const prefetchDelta = () => requestShots([
  ...work.delta.rows.flatMap(r => [r.source && { fileKey: current.fileKey, nodeId: r.source.id, w: r.source.w, h: r.source.h }, r.target && { fileKey: work.workKey, nodeId: r.target.id, w: r.target.w, h: r.target.h }]),
  ...work.delta.missing.map(m => ({ fileKey: current.fileKey, nodeId: m.id }))
].filter(Boolean));
function closeCompare() { const el = $('#cmp'); if (el) el.remove(); document.removeEventListener('keydown', escClose); }
function escClose(ev) { if (ev.key === 'Escape') closeCompare(); }
function openCompare(row, miss) {
  const src = row ? row.source : { id: miss.id, name: miss.section };
  const sides = [{ label: '프로젝트 문서', x: src, fileKey: current.fileKey, url: src && linkTo(current.sourceUrl, src.id) }];
  if (row) sides.push({ label: 'Core (브랜치)', x: row.target, fileKey: work.workKey, url: row.target && linkTo(work.workUrl, row.target.id), empty: row.action === '추가' ? 'Core에 아직 없는 화면이에요' : '화면 없음' });
  const action = row ? row.action : '미수록';
  openViewer({ pill: [ACTION_PILL[action], action], title: row ? `${row.platform} ${row.cls || ''} ${row.width}px` : miss.section, why: row ? row.why : miss.why, sides });
}
async function openViewer({ pill, title, why, sides }) {
  closeCompare();
  const col = (sd, i) => `<figure><figcaption>${sd.choose ? `<button class="choose" data-choose="${i}">이 화면으로</button>` : ''}<b>${sd.label}</b>${sd.x ? ` <span class="muted">${esc([sd.x.name, sd.x.w ? `${sd.x.w}×${sd.x.h}` : ''].filter(Boolean).join(' · '))}</span> ${openBtn(sd.url, 'Figma에서 열기')}` : ''}${sd.note ? `<div class="cap-note">${sd.note}</div>` : ''}</figcaption>
    <div class="shot" data-side="${i}">${sd.x ? '<div class="spinner">화면을 불러오는 중…</div>' : `<div class="empty">${esc(sd.empty || '화면 없음')}</div>`}</div></figure>`;
  document.body.insertAdjacentHTML('beforeend', `<div id="cmp" class="cmp-back"><div class="cmp" role="dialog" aria-label="화면 보기">
    <div class="cmp-head">${pill ? `<span class="pill ${pill[0]}">${esc(pill[1])}</span>` : ''}<b>${esc(title)}</b><span class="muted cmp-why">${esc(why || '')}</span><button class="close" title="닫기 (esc)">✕</button></div>
    <div class="cmp-cols n${sides.length}">${sides.map(col).join('')}</div></div></div>`);
  const box = $('#cmp');
  box.addEventListener('click', (ev) => { if (ev.target === box || ev.target.closest('.close')) closeCompare(); });
  document.addEventListener('keydown', escClose);
  bindOpen(box);
  // 설명 줄 길이가 달라도 화면이 같은 높이에서 시작하게 맞춘다
  const caps = [...box.querySelectorAll('figcaption')]; const capH = Math.max(...caps.map(c => c.offsetHeight)); caps.forEach(c => { c.style.minHeight = capH + 'px'; c.style.alignContent = 'flex-start'; });
  box.querySelectorAll('[data-choose]').forEach(btn => btn.addEventListener('click', () => sides[btn.dataset.choose].choose()));
  // 두 화면을 같은 비율로 함께 스크롤
  const panes = [...box.querySelectorAll('.shot')];
  let lock = false;
  panes.forEach(p => p.addEventListener('scroll', () => {
    if (lock) return; lock = true;
    const k = p.scrollTop / Math.max(1, p.scrollHeight - p.clientHeight);
    panes.forEach(q => { if (q !== p) q.scrollTop = k * (q.scrollHeight - q.clientHeight); });
    requestAnimationFrame(() => { lock = false; });
  }));
  const want = sides.filter(sd => sd.x);
  try {
    const imgs = await loadShots(want.map(sd => ({ fileKey: sd.fileKey, nodeId: sd.x.id, w: sd.x.w, h: sd.x.h })));
    if (!$('#cmp') || $('#cmp') !== box) return;
    want.forEach((sd, j) => {
      const pane = panes[sides.indexOf(sd)];
      pane.innerHTML = imgs[j] ? `<img src="${imgs[j]}" alt="${esc(sd.label)}"${sd.x.w ? ` style="width:${sd.x.w}px"` : ''}>` : '<div class="empty">화면을 받지 못했어요. Figma에서 열어 확인해 주세요.</div>';
    });
  } catch (e) { panes.forEach(p => { if (p.querySelector('.spinner')) p.innerHTML = `<div class="empty">화면을 받지 못했어요: ${esc(e.message)}</div>`; }); }
}

async function onApply() {
  $('#applyGo').disabled = true;
  const keep = $('#work').innerHTML;
  $('#work').insertAdjacentHTML('beforeend', progressHtml('apply', '브랜치에 반영하고 있어요', 'applyBusy')); startProgress('apply');
  try {
    const r = await window.core.applyUpdate(current, work);
    stopProgress(true);
    const a = r.apply, s = r.after.summary;
    const done = a.done.map(x => `<li>${x.action} · ${esc(x.platform)} ${esc(x.cls)} ${x.width}px · ${x.same ? '<span class="pill ok">원본과 같음</span>' : '<span class="pill warn">원본과 다름 — 확인 필요</span>'} ${openBtn(linkTo(work.workUrl, x.id))}</li>`).join('');
    $('#work').innerHTML = keep + `<section class="panel"><h2>반영 결과</h2>
      <ul>${done || '<li class="muted">반영한 화면 없음</li>'}</ul>
      ${a.notFound.length ? `<p class="muted">붙여 넣은 화면을 못 찾은 칸: ${esc(a.notFound.join(' · '))} — 붙여넣기를 확인하고 [반영]을 다시 누르세요</p>` : ''}
      <p class="muted">다시 읽어 비교: 유지 ${s.keep} · 교체 ${s.replace} · 추가 ${s.add} · 미수록 ${s.missing}${a.cardUpdated ? ' · 링크 카드 기준 날짜 갱신' : ''}</p>
      <p class="hint">브랜치를 보고 괜찮으면 Figma에서 Merge(합치기)는 직접 해 주세요. ${openBtn(linkTo(work.workUrl, work.core.masterPageId), '브랜치 마스터 열기')}</p>${money(r.costUsd)}</section>`;
    bindOpen($('#work'));
    $('#applyGo') && $('#applyGo').addEventListener('click', onApply);
  } catch (e) { stopProgress(); const b = $('#applyBusy'); if (b) b.outerHTML = `<section class="panel"><h2>반영하지 못했습니다</h2><p class="muted">${esc(e.message)}</p></section>`; $('#applyGo').disabled = false; }
}

// ---------- 새 Core ----------
function showBuild() {
  const n = Object.values(current.analysis.platforms).flat().reduce((a, e) => a + e.picks.filter(p => p.chosen).length, 0);
  $('#work').innerHTML = `<section class="panel"><h2>새 Core 만들기 — ${esc(current.place.coreName)}</h2>
    <p class="muted">복제본 확인됨 (페이지 ${work.pages.length}개). 위 대표 화면 ${n}장을 마스터에 넣고, 작업 페이지를 지워 Cover / --- / 🌏 마스터 파일만 남깁니다. 원본 프로젝트 문서는 건드리지 않습니다.</p>
    ${VERSION_GATE('buildGo')}<button id="buildGo">새 Core 만들기</button>${money(work.costUsd)}</section>`;
  bindGate($('#work'));
  $('#buildGo').addEventListener('click', onBuild);
}

async function onBuild() {
  $('#buildGo').disabled = true;
  $('#work').insertAdjacentHTML('beforeend', progressHtml('build', '새 Core를 만들고 있어요', 'buildBusy')); startProgress('build');
  try {
    const r = await window.core.buildNewCore(current, work);
    stopProgress(true);
    const b = r.build;
    const screens = b.screens.map(x => `<li>${esc(x.platform)} ${esc(x.cls)} ${x.w}×${x.h} · ${x.left === 0 ? '<span class="pill ok">원본과 같음</span>' : `<span class="pill warn">남은 차이 ${x.left}</span>`} ${openBtn(linkTo(work.workUrl, x.id))}</li>`).join('');
    $('#buildBusy').outerHTML = `<section class="panel"><h2>새 Core를 만들었습니다</h2>
      <p>${openBtn(linkTo(work.workUrl, b.rootId), '🌏 마스터 파일 열기')}</p>
      <ul>${screens}</ul>
      <p class="muted">지운 페이지: ${esc(r.trim.removed.join(', ') || '없음')} · 로컬 컴포넌트 분리 ${r.trim.detached}개 · 남은 페이지: ${esc(r.trim.pages.join(' / '))}</p>
      ${(b.log || []).filter(l => /⚠|대신/.test(l)).map(l => `<p class="muted">${esc(l)}</p>`).join('')}
      <p class="hint">이 Core를 앱의 Core 목록에 추가했습니다 — 다음 판별부터 "기존 Core"로 잡힙니다. 남은 사람 손: 파일 이름·Core 폴더 이동, 원본 커버 Final/아카이브.</p>${money(r.costUsd)}</section>`;
    bindOpen($('#work'));
  } catch (e) { stopProgress(); $('#buildBusy').outerHTML = `<section class="panel"><h2>만들지 못했습니다</h2><p class="muted">${esc(e.message)}</p><p class="hint">복제본에 반쯤 만든 페이지가 남았을 수 있습니다. 복제본을 지우고 다시 Duplicate해 주세요.</p></section>`; $('#buildGo').disabled = false; }
}

showSetup();
showKnowledge();
