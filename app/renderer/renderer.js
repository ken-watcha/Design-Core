// 화면: 준비 상태 → 링크 → 분석 결과(판별 · 크기별 대표 화면(갱신은 접어 둠) · 수록 대조표는 새 Core만) → 📍 작업 위치 → (갱신) Δ 표·붙여넣기·반영 / (새 Core) 만들기 → 결과
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nodeUrl = (fileKey, id) => `https://www.figma.com/design/${fileKey}/?node-id=${String(id).replace(':', '-')}`;
let current = null;   // 분석 상태(analysis·verdict·place) — 단계마다 엔진에 통째로 넘긴다
let work = null;      // 확인된 작업 위치(+ 갱신이면 Core 읽기·Δ)
const linkTo = (base, id) => base.split('?')[0].replace(/\/$/, '') + '/?node-id=' + String(id).replace(':', '-');

let setupOk = false;
let lastSetup = null;   // 마지막 준비 상태 확인 결과 (null = 확인 중)
// 연결 확인은 처음 한 번만 (2026-10-30 윤우: "앱을 킬 때마다 확인해야 되는 거야?"). 한 번 모두 연결되면 이 맥에 기억해 두고,
// 다음부터는 확인 없이 바로 링크 칸을 보여 준다. 연결이 끊겨 일이 실패하면 그때 다시 확인해 어디가 끊겼는지 보여 준다.
const SETUP_KEY = 'setup:ok';
const setupCache = { get: () => { try { return JSON.parse(localStorage.getItem(SETUP_KEY) || 'null'); } catch (e) { return null; } }, set: (v) => { try { v ? localStorage.setItem(SETUP_KEY, JSON.stringify(v)) : localStorage.removeItem(SETUP_KEY); } catch (e) {} } };
function useCachedSetup() {
  const c = setupCache.get(); if (!c) return false;
  lastSetup = { claude: true, figma: true, who: c.who, cached: true }; setupOk = true;
  const el = $('#setup'); el.innerHTML = `<span class="ok">● 준비됨</span> · Figma ${esc((c.who && c.who.handle) || '')}`;
  el.title = [`지난 확인: ${new Date(c.at).toLocaleString('ko-KR')} · 누르면 다시 확인`, el.dataset.rules].filter(Boolean).join('\n');
  renderOnboard(); return true;
}
// 일이 실패했는데 연결이 끊긴 탓일 수 있으면(로그인·Figma 연결·설치) 기억을 지우고 다시 확인한다
function setupMaybeLost(e) {
  const m = String(e && e.message || e || '');
  if (!/log ?in|auth|credential|api key|mcp|ENOENT|command not found|spawn/i.test(m)) return;   // 보통의 작업 오류(화면 못 찾음 등)에는 다시 확인하지 않는다
  setupCache.set(null); showSetup();
}
async function showSetup() {
  const el = $('#setup');
  lastSetup = null; renderOnboard();
  let s;
  try { s = await window.core.setup(); }
  catch (e) { el.innerHTML = `<span class="bad">● 확인 실패</span>`; el.title = e.message; lastSetup = { failed: e.message }; setupCache.set(null); renderOnboard(); return; }
  lastSetup = s;
  setupOk = !!(s.claude && s.figma);
  setupCache.set(setupOk ? { who: s.who || null, at: Date.now() } : null);
  if (setupOk) el.innerHTML = `<span class="ok">● 준비됨</span> · Figma ${esc((s.who && s.who.handle) || '')}`;
  else if (!s.installed) el.innerHTML = `<span class="bad">● Claude Code 설치 필요</span>`;
  else if (!s.claude) el.innerHTML = `<span class="bad">● Claude 로그인 필요</span>`;
  else el.innerHTML = `<span class="bad">● Figma 연결 필요</span>`;
  el.title = [s.detail, el.dataset.rules].filter(Boolean).join('\n');
  renderOnboard();
}

// 연결 목록: 필요한 연결을 먼저 목록으로 보여 주고, 전부 연결되면 그때 링크 입력칸을 보여 준다
// (2026-10-13 윤우: "이거이거 연결 필요하다를 리스트로 먼저 알려주고 연결된다면 링크 붙여넣는 인풋이 나타나도")
function renderOnboard() {
  const s = lastSetup, checking = !s, failed = !!(s && s.failed);
  const inst = !!(s && s.installed), login = !!(s && s.claude), figma = !!(s && s.claude && s.figma);
  const ready = !checking && !failed && figma && tokenOn;
  const form = $('#form').closest('.panel');
  form.hidden = !ready;
  let box = $('#onboard');
  if (ready) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('section'); box.id = 'onboard'; box.className = 'panel onboard'; $('main').prepend(box); }
  const items = [
    { key: 'install', done: inst, title: 'Claude Code 설치', body: '앱이 Figma를 읽고 쓰는 데 쓰는 프로그램이에요. 버튼을 누르면 자동으로 설치돼요 (1분 안팎).', btns: '<button id="obInstall" type="button">설치</button>' },
    { key: 'login', done: login, title: 'Claude 로그인', body: '버튼을 누르면 터미널 창이 열려요. <b>/login</b> 을 입력하고 브라우저에서 회사 계정으로 로그인해 주세요. 이어서 아래 Figma 연결까지 같은 창에서 하면 돼요.', btns: '<button class="obConnect" type="button">연결 창 열기</button><button class="obRecheck ghost" type="button">다시 확인</button>', needs: inst },
    { key: 'figma', done: figma, title: 'Figma 연결', body: '터미널 창에서 <b>/mcp</b> → figma → Authenticate → 브라우저에서 허용. "Connected to figma"가 보이면 창을 닫고 [다시 확인]을 눌러 주세요.', btns: '<button class="obConnect" type="button">연결 창 열기</button><button class="obRecheck ghost" type="button">다시 확인</button>', needs: login },
    { key: 'token', done: tokenOn, title: '피그마 토큰 연결', body: '시안을 Figma에서 바로 받아 보여 주는 데 써요. Figma Settings → Security에서 만든 토큰을 붙여 넣어 주세요.', btns: '<button id="obToken" type="button">토큰 붙여 넣기</button>', always: true },
  ];
  const nowKey = (items.find(i => !i.done && (i.always || i.needs !== false)) || {}).key;
  const state = (i) => i.done ? '<span class="st ok">연결됨</span>' : (i.key === 'token' ? !tokenKnown : checking) ? '<span class="st">확인 중…</span>' : '<span class="st bad">필요</span>';
  const li = (i, n) => {
    const open = !i.done && !(i.key === 'token' ? !tokenKnown : checking) && (i.key === nowKey || i.key === 'token');
    return `<li class="${i.done ? 'done' : open ? 'now' : ''}"><span class="num">${i.done ? '✓' : n}</span><div class="body"><div class="head"><b>${i.title}</b>${state(i)}</div>${open ? `<div class="muted">${i.body}<div class="row-btn">${i.btns}</div></div>` : ''}</div></li>`;
  };
  const left = items.filter(i => !i.done).length;
  box.innerHTML = `<h2>${checking ? '연결 상태를 확인하고 있어요' : `연결이 ${left}개 필요해요`}</h2>
    <p class="muted lead">${failed ? '상태를 확인하지 못했어요: ' + esc(s.failed) + ' <button class="link obRecheck" type="button">다시 확인</button>' : '아래가 모두 <b>연결됨</b>이 되면 프로젝트 링크를 넣는 칸이 나타나요. 처음 한 번만 하면 되고, 다음부터는 바로 링크 칸이 열려요.'}</p>
    <ol class="steps">${items.map((i, k) => li(i, k + 1)).join('')}</ol><div class="msg muted" id="obMsg"></div>`;
  const msg = (t, cls) => { const m = $('#obMsg'); m.textContent = t; m.className = 'msg ' + (cls || 'muted'); };
  const b1 = $('#obInstall'); if (b1) b1.addEventListener('click', async () => { b1.disabled = true; msg('설치 중… 창을 닫지 말아 주세요.'); try { await window.core.installClaude(); msg('설치됐어요. 확인 중…', 'ok'); showSetup(); } catch (e) { msg('설치하지 못했어요: ' + String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), 'bad'); b1.disabled = false; } });
  box.querySelectorAll('.obConnect').forEach(b => b.addEventListener('click', async () => { await window.core.openConnect(); msg('터미널 창에서 순서대로 한 뒤 [다시 확인]을 눌러 주세요.'); }));
  box.querySelectorAll('.obRecheck').forEach(b => b.addEventListener('click', () => { $('#setup').textContent = '준비 상태 다시 확인 중…'; showSetup(); }));
  const bt = $('#obToken'); if (bt) bt.addEventListener('click', () => openToken(false));
}

async function showKnowledge() {
  // 규칙 버전·출처는 화면에 두지 않고, 준비 상태에 마우스를 올리면 보이게 (2026-10-12 윤우: "없어도 될 것 같다")
  try { const k = await window.core.knowledge(); const el = $('#setup'); el.dataset.rules = `규칙 ${k.rulesVersion} · Core ${k.cores}개 · ${k.from}`; if (!el.title.includes(el.dataset.rules)) el.title = [el.title, el.dataset.rules].filter(Boolean).join('\n'); }
  catch (e) { $('#footer').textContent = '규칙을 불러오지 못했습니다: ' + e.message; }
}

// 갱신할 Core와 그렇게 본 근거(시안 컴포넌트가 들어 있는 Core 화면). 여럿이면 하나씩 차례로 한다 (2026-10-26 윤우: 피쳐링셀은 SVOD·TVOD 둘 다)
function targetsHtml(v) {
  const ts = v.targets || [];
  if (v.suggestion !== 'update' || !ts.length || (ts.length === 1 && !ts[0].match)) return '';
  const at = current.placeAt || 0;
  const li = ts.map((t, i) => `<li>${ts.length > 1 ? `<b>${i + 1}.</b> ` : ''}${esc(t.name)}${ts.length > 1 && i < at ? ' <span class="pill ok">했음</span>' : ts.length > 1 && i === at ? ' <span class="pill warn">지금</span>' : ''}<div class="muted">${esc(t.why)}</div></li>`).join('');
  return `<ul class="targets">${li}</ul>`;
}

function render(r) {
  const a = r.analysis, v = r.verdict;
  if (a.kind !== 'project') {
    $('#result').innerHTML = `<section class="panel"><h2>프로젝트 문서가 아닙니다</h2><p class="muted">파일 종류: ${esc(a.kind)} · 페이지: ${esc(a.pages.join(' / '))}</p></section>`;
    return;
  }
  // 판별: 점수표 대신 앱의 결론과 이유 한 줄 (2026-10-12 윤우: "점수랑 맞은 낱말은 뭐야?")
  const weak = (v.weak || []).map(c => `${esc(c.name)}("${esc(c.hits.join('", "'))}")`).join(', ');
  const verdictHtml = `<section class="panel"><h2>어디에 넣을까</h2>
    <div class="verdict"><span class="big">${v.suggestion === 'update' ? '기존 Core 갱신' : '새 Core 만들기'} → ${(v.targets || []).length > 1 ? `Core ${v.targets.length}개` : esc(v.target)}</span>
    ${v.sure ? '' : '<span class="pill warn">확인 필요</span>'}</div>
    <p class="muted">${esc(v.reason)}</p>
    ${targetsHtml(v)}
    ${weak && !v.content ? `<p class="hint">참고로 이름이 조금 겹친 Core: ${weak}. 겹친 낱말이 하나뿐이라 갱신 대상으로 보지 않았어요.</p>` : ''}
    ${!v.sure ? `<p class="hint">비슷하게 맞은 Core: ${v.candidates.slice(0, 3).map(c => esc(c.name)).join(', ')}</p>` : ''}
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
  const picksTable = `<p class="hint lead">${pickWhy}</p>
    <table class="picks"><tr><th>크기</th><th>폭</th><th>들어갈 화면</th><th class="tag"></th><th class="go"></th></tr>${rows}</table>`;
  // 2026-10-27 윤우: 갱신에선 앱이 이미 골랐고 "바뀔 내용" 표가 같은 짝을 보여 준다 → 접어 두고 바꿀 때만 펼친다
  const picksHtml = isUpdate
    ? `<section class="panel"><details class="fold"><summary><b>들어갈 화면 바꾸기</b> <span class="muted h2-sub">앱이 크기마다 1장씩 골랐어요. 잘못 골랐을 때만 펼쳐요</span></summary>${picksTable}</details></section>`
    : `<section class="panel"><h2>Core에 들어갈 화면 <span class="muted h2-sub">크기마다 1장</span></h2>${picksTable}</section>`;
  const cov = (a.coverage || []).map(c => `<tr><td>${esc(c.section)}</td><td>${c.to ? esc(c.to) : '<span class="pill warn">미수록</span>'}</td><td class="muted">${esc(c.note)}</td></tr>`).join('');
  const covHtml = `<section class="panel"><h2>수록 대조표</h2><p class="hint" style="margin-top:0">문서의 섹션이 하나도 빠지지 않았는지 확인합니다.</p><table><tr><th>문서 섹션</th><th>Core에서 들어갈 자리</th><th></th></tr>${cov}</table>
    ${a.missing.length ? `<p class="muted">못 찾은 것: ${esc(a.missing.join(' · '))}</p>` : ''}</section>`;
  // 2026-10-27 윤우: Claude 사용량($)은 디자이너가 할 일과 상관없어 보이지 않는다
  const next = placeHtml(r);
  // 2026-10-27 윤우: 기존 Core 갱신에선 수록 대조표가 이해가 잘 안 된다 → 새 Core 만들 때만 (갱신은 "바뀔 내용" 표가 같은 일을 함)
  $('#result').innerHTML = verdictHtml + picksHtml + (isUpdate ? '' : covHtml) + next + '<div id="work"></div>';
  $('#placeForm') && $('#placeForm').addEventListener('submit', onPlace);
  document.querySelectorAll('[data-core-at]').forEach(b => b.addEventListener('click', () => switchCore(Number(b.dataset.coreAt))));
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
  if (!(await needToken())) return;
  work = null;
  const url = $('#url').value.trim();
  $('#go').disabled = true;
  document.body.classList.remove('home');
  $('#result').innerHTML = progressHtml('analyze', 'Figma 문서를 읽고 있어요');
  startProgress('analyze');
  try { current = await window.core.analyze(url); current.analysis0 = JSON.parse(JSON.stringify(current.analysis)); stopProgress(true); render(current); if (current.analysis.kind === 'project') prefetchPicks(); }
  catch (e) { stopProgress(); $('#result').innerHTML = `<section class="panel"><h2>분석하지 못했습니다</h2><p class="muted">${esc(e.message)}</p></section>`; setupMaybeLost(e); }
  finally { $('#go').disabled = false; }
});

// ---------- 피그마 토큰 연결 (필수) ----------
// 화면 그림을 Figma에서 바로 받는 데 쓴다. 연결 전에는 분석·확인·반영을 막고 연결 창을 띄운다 (2026-10-12 윤우 결정)
let tokenOn = false, tokenKnown = false;
async function showFast() {
  try { const s = await window.core.tokenStatus(); tokenOn = !!s.on; } catch (e) {}
  tokenKnown = true;
  const b = $('#fast'); b.textContent = tokenOn ? '피그마 토큰 연결 완료' : '피그마 토큰 연결 필요';
  b.classList.toggle('on', tokenOn); b.classList.toggle('off', !tokenOn);
  renderOnboard();
}
async function needToken() {
  if (!setupOk && !lastSetup) await showSetup();   // 아직 확인 전이면 기다린다
  if (!tokenOn) await showFast();
  if (setupOk && tokenOn) return true;
  const ob = $('#onboard');
  if (ob) { ob.scrollIntoView({ behavior: 'smooth' }); ob.classList.add('flash'); setTimeout(() => ob.classList.remove('flash'), 1200); }
  if (setupOk && !tokenOn) openToken(true);
  return false;
}
function openToken(blocked) {
  const back = document.createElement('div'); back.className = 'cmp-back';
  back.innerHTML = `<section class="tok"><h2>${tokenOn ? '피그마 토큰 연결 완료' : '피그마 토큰 연결 필요'}</h2>
    ${blocked ? '<p class="alert">피그마 토큰을 먼저 연결해 주세요. 연결해야 다음 단계로 넘어갈 수 있어요.</p>' : ''}
    <p class="muted">이 앱은 피그마 토큰으로 시안을 바로 받아 보여 줘요. 처음 한 번만 연결하면 되고, 토큰은 이 맥에만 암호화해 저장돼요. 채팅에는 붙이지 마세요.</p>
    <ol><li>Figma 왼쪽 위 계정 → Settings → Security</li><li>Personal access tokens → Generate new token</li><li>권한은 <b>File content: Read only</b> 하나면 돼요</li><li>만든 토큰을 아래에 붙여 넣기</li></ol>
    <div class="row"><input id="tokIn" type="password" placeholder="${tokenOn ? '연결된 토큰이 있어요 · 바꾸려면 새로 붙여 넣기' : 'figd_…'}" autocomplete="off"><button id="tokSave" type="button">연결</button></div>
    <div class="msg muted" id="tokMsg"></div>
    <div class="foot">${tokenOn ? '<button class="link" id="tokOff" type="button">연결 끊고 토큰 지우기</button>' : '<span></span>'}<button class="link plain" id="tokClose" type="button">닫기</button></div></section>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  back.querySelector('#tokClose').addEventListener('click', close);
  back.querySelector('#tokIn').focus();
  const msg = (t, cls) => { const m = back.querySelector('#tokMsg'); m.textContent = t; m.className = 'msg ' + (cls || 'muted'); };
  const save = async () => {
    const v = back.querySelector('#tokIn').value.trim(); if (!v) return msg('토큰을 붙여 넣어 주세요.', 'bad');
    msg('확인 중…');
    try { const r = await window.core.tokenSave(v); msg(`연결됐어요 · Figma ${r.who && r.who.handle || ''}`, 'ok'); await showFast(); setTimeout(close, 900); }
    catch (e) { msg(String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''), 'bad'); }
  };
  back.querySelector('#tokSave').addEventListener('click', save);
  back.querySelector('#tokIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  const off = back.querySelector('#tokOff');
  if (off) off.addEventListener('click', async () => { await window.core.tokenClear(); await showFast(); close(); });
}
$('#fast').addEventListener('click', async () => { await showFast(); openToken(false); });
showFast();

$('#setup').addEventListener('click', () => { $('#setup').textContent = '준비 상태 다시 확인 중…'; showSetup(); });

function bindOpen(root = document) { root.querySelectorAll('[data-open]').forEach(b => { if (b.dataset.bound) return; b.dataset.bound = 1; b.addEventListener('click', () => window.core.open(b.dataset.open)); }); }
// 쓰기 전 Named version: 이 연결(use_figma)은 자동 저장을 거부해서(2026-09-18) 사람이 저장하고 체크해야 버튼이 켜진다
// 쓰기 전 버전 저장 체크박스는 없앴다: 복제본·브랜치 자체가 되돌릴 지점이라 (2026-10-13 윤우)
const SAFE_NOTE = (kind) => `<p class="hint">${kind === 'branch' ? '브랜치는 Core의 복사본이라 바로 고쳐도 괜찮아요. 직접 합치기 전까지 Core 본 파일은 그대로예요.' : '복사본이라 바로 작업해도 원본 문서는 그대로예요. 결과가 이상하면 이 복사본을 지우고 다시 복제하면 돼요.'}</p>`;
const openBtn = (url, label = 'Figma에서 보기') => `<button class="link" data-open="${esc(url)}">${esc(label)}</button>`;
// ---------- 진행 막대 (2026-10-12 윤우: 얼마나 남았는지) ----------
// 실제 단계(Claude 켜기 → Figma 읽기/쓰기 → 정리)는 엔진이 알려 주고, 남은 시간은 지난번에 걸린 시간으로 어림한다
const STAGE_TEXT = { start: 'Claude를 켜는 중', figma: 'Figma와 주고받는 중', wrap: '결과 정리 중', done: '마무리 중' };
const EXPECT = { analyze: 45, place: 60, apply: 90, build: 180, gather: 40 };
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

// 다음(또는 고른) Core로 넘어간다. 대표 화면은 Core마다 다시 맞추므로 분석 결과는 처음 받은 것으로 되돌린다
function switchCore(i) {
  if (!current.places || !current.places[i]) return;
  current.placeAt = i; current.place = current.places[i];
  if (current.analysis0) current.analysis = JSON.parse(JSON.stringify(current.analysis0));
  work = null; render(current);
  const el = $('#placePanel'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- 📍 작업 위치 ----------
function placeHtml(r) {
  const pl = r.place; if (!pl) return '';
  const head = pl.kind === 'branch' ? `기존 Core 갱신 → ${esc(pl.coreName)}의 브랜치` : `새 Core → 프로젝트 파일 복사본 (${esc(pl.coreName)})`;
  const link = pl.kind === 'branch' ? (pl.coreUrl ? openBtn(pl.coreUrl, pl.coreName + ' 열기') : '') : openBtn(r.sourceUrl, '프로젝트 파일 열기');
  const n = (r.places || []).length, at = r.placeAt || 0;
  const tabs = n > 1 ? `<div class="core-tabs">${r.places.map((p, i) => `<button type="button" class="${i === at ? '' : 'ghost'}" data-core-at="${i}">${i + 1}. ${esc(p.coreName.replace(/^\[Core\]\s*/, ''))}</button>`).join('')}</div><p class="hint">Core ${n}개를 하나씩 해요. 지금은 ${at + 1}번째예요. 끝나면 반영 결과 아래 버튼으로 다음 Core로 넘어가요.</p>` : '';
  return `<section class="panel" id="placePanel"><h2>📍 작업 위치${n > 1 ? ` <span class="muted h2-sub">${at + 1} / ${n}</span>` : ''}</h2>${tabs}
    <div class="verdict"><span class="big">${head}</span>${link}</div>
    <p class="muted">${esc(pl.why)}</p>
    <ol>${pl.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <form id="placeForm"><div class="row"><input id="placeUrl" type="url" required autocomplete="off" placeholder="${pl.kind === 'branch' ? '브랜치 링크 (…/branch/…)' : '복사본 링크'}"><button id="placeGo" type="submit">확인</button></div></form>
    <p class="hint">[확인]은 파일을 읽기만 해요. 아직 아무것도 바뀌지 않아요.</p></section>`;
}

async function onPlace(ev) {
  ev.preventDefault();
  if (!(await needToken())) return;
  const url = $('#placeUrl').value.trim();
  $('#placeGo').disabled = true; $('#work').innerHTML = progressHtml('place', '작업 위치를 확인하고 바뀔 내용을 비교하고 있어요'); startProgress('place');
  try {
    const w = await window.core.checkWorkplace(current, url);
    stopProgress(true);
    if (!w.ok) { fail('이 링크에서는 작업하지 않습니다', w.why); return; }
    work = w;
    if (w.kind === 'branch') { current.analysis = w.analysis; render(current); $('#placeUrl').value = url; showDelta(); prefetchDelta(); }
    else showBuild();
  } catch (e) { stopProgress(); fail('작업 위치를 확인하지 못했습니다', e); setupMaybeLost(e); }
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
const ACTION_PILL = { '유지': 'ok', '교체': 'warn', '추가': 'warn', '묶음 교체': 'warn', '묶음 추가': 'warn', '부분 교체': 'warn', '묶음 삭제': 'warn', '그대로': '', '미수록': 'bad' };
const screenCell = (x) => x ? `${esc(x.name || '')}${x.w ? `<div class="muted size">${x.w}×${x.h}</div>` : ''}` : '<span class="muted">—</span>';
function showDelta() {
  const d = work.delta, s = d.summary;
  // "그대로"이면서 확인할 것도 없는 줄은 기본으로 접는다(2026-10-30 윤우: 바뀌는 3칸이 그대로 20줄에 묻힘). "확인 필요"가 붙은 그대로 줄은 사람이 할 일이 있어 그대로 보인다.
  const quiet = (r) => r.action === '그대로' && !r.check;
  const nQuiet = d.rows.filter(quiet).length;
  const rows = d.rows.map((r, i) => `<tr class="pick${quiet(r) ? ' quiet' : ''}" data-row="${i}" title="눌러서 두 화면 나란히 보기"${quiet(r) && !work.showQuiet ? ' hidden' : ''}><td class="act"><span class="pill ${ACTION_PILL[r.action]}">${r.action}</span></td><td>${esc(r.platform)} ${esc(r.cls || '')} ${r.width ? r.width + 'px' : ''}</td>
    <td>${screenCell(r.source)}</td><td>${r.target ? screenCell(Object.assign({ name: 'Core' }, r.target)) : screenCell(null)}</td><td class="muted">${r.check ? '<span class="pill warn">확인 필요</span> ' : ''}${esc(r.why)}${diffHtml(r.diff)}</td><td class="go"><span class="go-in">비교${CHEV}</span></td></tr>`).join('');
  // todo = 시안 화면을 붙여 넣어야 하는 칸. drops = 붙여넣기 없이 반영만 누르면 되는 칸(묶음 삭제)
  const todo = d.rows.filter(r => ['교체', '추가', '묶음 교체', '묶음 추가', '부분 교체'].includes(r.action));
  const drops = d.rows.filter(r => r.action === '묶음 삭제');
  // 파일 사이로는 앱이 화면을 못 옮긴다 → 사람이 프로젝트 페이지를 통째로 ⌘C/⌘V 한 번, 필요한 화면 고르기·정리는 앱이 한다
  // (2026-10-26 윤우: 단계가 복잡하고 맥락을 모르면 따라 하기 어렵다 → 프로젝트 브랜치·모으기 없앰, 지금 할 단계 하나만 펼쳐 보임)
  const oneByOne = `<ul>${todo.flatMap(r => (r.sources || [r.source]).filter(Boolean).map(x => `<li>${esc(r.platform)} ${esc(r.cls || '')} ${r.width}px — ${esc(x.name)} ${openBtn(linkTo(current.sourceUrl, x.id), '원본 열기')}</li>`)).join('')}</ul>`;
  const go = (url, label) => `<button class="ghost step-btn" data-open="${esc(url)}">${label} ↗</button>`;
  const pages = current.analysis.platformPages || {};
  const platforms = [...new Set(todo.map(r => r.platform))];
  const coreUrl = linkTo(work.workUrl, work.core.masterPageId);
  const steps = [];
  for (const pf of platforms) {
    const pg = pages[pf] || {}, name = esc(pg.name || pf + ' 페이지');
    const at = pg.id || ((current.analysis.platforms[pf] || []).find(e => e.section) || { section: {} }).section.id;
    const n = todo.filter(r => r.platform === pf).reduce((a, r) => a + (r.sources ? r.sources.length : 1), 0);
    steps.push({ title: `프로젝트 파일에서 ${name} 페이지 복사`, body: `버튼으로 페이지를 열고 캔버스 빈 곳을 한 번 누른 뒤 <b>⌘A → ⌘C</b>. 바꿀 화면 ${n}장이 이 페이지에 있어요.<div class="hint">복사(⌘C)만 해 주세요. 원본 파일은 그대로예요. ⌘X(잘라내기)·Delete는 누르지 마세요.</div><div class="row-btn">${go(at ? linkTo(current.sourceUrl, at) : current.sourceUrl, name + ' 페이지 열기')}</div>` });
    steps.push({ title: 'Core 브랜치에 붙여 넣기', body: `버튼으로 Core 브랜치를 열고 빈 곳을 누른 뒤 <b>⌘V</b>. 어디에 붙여도 괜찮아요. 붙는 데 조금 걸릴 수 있어요.<div class="row-btn">${go(coreUrl, 'Core 브랜치 열기')}</div>` });
  }
  steps.push({ title: '[반영] 누르기', body: `${d.part ? '앱이 붙여 넣은 시안에서 영역 속만 꺼내 Core 메인 화면에 넣고(화면·길이 유지), 따로 정리한 묶음은 지우고, 남은 것은 브랜치에서 지워요.' : '앱이 붙여 넣은 것 중 바꿀 화면만 골라 Core 화면을 바꾸고(이름·위치 유지), 남은 것은 브랜치에서 지워요.'}<div class="row-btn"><button id="applyGo">반영</button></div>`, last: true });
  const at = Math.min(work.pasteAt || 0, steps.length - 1);
  const stepHtml = steps.map((st, k) => {
    const state = k < at ? 'done' : k === at ? 'now' : '';
    const body = k === at ? `<div>${st.body}${st.last ? '' : `<div class="row-btn"><button class="step-next" data-to="${k + 1}">했어요, 다음</button></div>`}</div>` : '';
    return `<li class="${state}"><span class="num">${k < at ? '✓' : k + 1}</span><div class="step-body"><b${k < at ? ` class="step-back" data-to="${k}" title="이 단계 다시 보기"` : ''}>${st.title}</b>${body}</div></li>`;
  }).join('');
  const paste = todo.length ? `<h2 style="margin-top:18px">화면 옮기기</h2>
    <ol class="flow">${stepHtml}</ol>
    <details><summary class="hint">페이지가 너무 커서 붙여넣기가 멈추면 — 한 장씩 복사하기</summary><p class="hint">아래 화면을 하나씩 열어 ⌘C → Core 브랜치에 ⌘V, 다 붙인 뒤 [반영]</p>${oneByOne}</details>${SAFE_NOTE('branch')}`
    : drops.length ? `<h2 style="margin-top:18px">반영</h2><p class="muted">붙여 넣을 화면은 없어요. [반영]을 누르면 묶음 ${drops.length}개를 브랜치에서 지워요.</p><div class="row-btn"><button id="applyGo">반영</button></div>${SAFE_NOTE('branch')}` : '';
  // 결론을 맨 위에 (2026-10-12 윤우: 결과 표만 보고는 "그래서 뭘 하라는 건지" 몰랐음)
  const checks = d.rows.filter(r => r.check && r.action === '유지').length;
  const next = [checks ? `"확인 필요" ${checks}칸은 거의 같은 화면이에요. 한 번 눈으로 보고 괜찮으면 넘어가세요.` : ''].filter(Boolean);
  const verdict = todo.length
    ? `<div class="conclusion warn"><b>바꿀 화면 ${todo.length}칸${drops.length ? ` · 지울 묶음 ${drops.length}개` : ''}</b> — 아래 "화면 옮기기" 순서대로 따라 해 주세요.${d.part ? ` 메인 화면은 그대로 두고 ${esc(work.label || '핵심 컴포넌트')} 영역 속만 바꿔요.` : ''}</div>`
    : drops.length ? `<div class="conclusion warn"><b>지울 묶음 ${drops.length}개</b> — 메인 화면 속 ${esc(work.label || '핵심 컴포넌트')}은 이미 시안과 같아요. 아래 [반영]을 눌러 주세요.</div>`
    : `<div class="conclusion ok"><b>바꿀 화면이 없어요.</b> Core가 프로젝트 문서와 같아요. 브랜치는 머지할 필요 없이 버리면 돼요.${next.length ? '<ul>' + next.map(t => `<li>${t}</li>`).join('') + '</ul>' : ''}</div>`;
  $('#work').innerHTML = `<section class="panel"><h2>바뀔 내용 — ${esc(current.place.coreName)}</h2>
    ${verdict}
    <p class="muted">유지 ${s.keep}${s.near ? ` (그중 거의 같음 ${s.near})` : ''} · 교체 ${s.replace} · 추가 ${s.add}${s.group ? ' · 묶음 교체 ' + s.group : ''}${s.addGroup ? ' · 묶음 추가 ' + s.addGroup : ''}${s.part ? ' · 부분 교체 ' + s.part : ''}${s.drop ? ' · 묶음 삭제 ' + s.drop : ''}${s.untouched ? ' · 그대로 ' + s.untouched : ''} ${work.preferred ? ` — Core에 이미 있는 화면과 같은 후보 ${work.preferred}칸을 대표로 맞췄습니다` : ''}</p>
    <p class="hint" style="margin:0 0 6px">줄을 누르면 프로젝트 화면과 Core 화면을 나란히 볼 수 있어요.</p>
    <table class="delta"><tr><th class="act"></th><th>칸</th><th>프로젝트 화면</th><th>Core 화면</th><th></th><th></th></tr>${rows}${nQuiet ? `<tr class="quiet-toggle"><td colspan="6"><button class="link plain" id="quietToggle">${work.showQuiet ? `그대로 ${nQuiet}칸 접기` : `그대로 ${nQuiet}칸 보기`}${CHEV}</button><span class="muted"> 프로젝트에 맞는 칸이 없어 손대지 않는 화면이에요.</span></td></tr>` : ''}</table>
    ${work.unverifiedBranch ? '<p class="hint">이 링크가 브랜치인지 복제본인지는 앱이 가릴 수 없습니다. 복제본이면 나중에 Core에 합칠(머지) 수 없으니, Figma에서 브랜치인지 한 번 확인해 주세요.</p>' : ''}
    ${paste}</section>`;
  bindOpen($('#work'));
  $('#work').querySelectorAll('tr.pick').forEach(tr => tr.addEventListener('click', (ev) => { if (ev.target.closest('button')) return; openCompare(tr.dataset.row != null ? d.rows[tr.dataset.row] : null, tr.dataset.miss != null ? d.missing[tr.dataset.miss] : null); }));
  $('#quietToggle') && $('#quietToggle').addEventListener('click', () => { work.showQuiet = !work.showQuiet; $('#work').querySelectorAll('tr.quiet').forEach(tr => { tr.hidden = !work.showQuiet; }); $('#quietToggle').innerHTML = (work.showQuiet ? `그대로 ${nQuiet}칸 접기` : `그대로 ${nQuiet}칸 보기`) + CHEV; });
  $('#applyGo') && $('#applyGo').addEventListener('click', onApply);
  $('#work').querySelectorAll('[data-to]').forEach(b => b.addEventListener('click', () => { work.pasteAt = Number(b.dataset.to); showDelta(); }));
}

// ---------- 두 화면 나란히 보기 (2026-10-12 윤우: 링크로 Figma를 오가지 말고 앱 안에서 비교) ----------
const shotCache = new Map();   // fileKey|id → 그림(data:)을 주는 약속 — 한 번 부른 화면은 다시 부르지 않는다
const shotKey = (it) => it.fileKey + '|' + it.nodeId;
// 화면을 4장씩 묶어 Claude 3개가 동시에 받는다 (2026-10-12 윤우: 후보 화면이 늦게 뜸).
// 한 번에 전부 묶으면 마지막 장까지 다 받아야 한 장도 못 봤다. 지금 보려는 화면은 줄 맨 앞으로 끼운다.
const SHOT_CHUNK = 4, SHOT_WORKERS = 3;
const shotQueue = []; let shotBusy = 0, shotNote = null;   // shotNote: 토큰으로 못 받은 이유(있으면 보기 창에 표시)
function pumpShots(extra) {
  // 지금 보려는 화면(extra)은 다른 일이 다 차 있어도 하나 더 띄워 바로 받는다
  while ((shotBusy < SHOT_WORKERS || extra-- > 0) && shotQueue.length) {
    // 토큰이 있으면 Figma에 한 번에 많이 묻는 게 빠르고 요청 횟수 제한에도 덜 걸린다
    const chunk = shotQueue.splice(0, tokenOn ? 40 : SHOT_CHUNK); shotBusy++;
    window.core.screens(chunk.map(q => q.it))
      .then(r => { if (r.restError) shotNote = r.restError; chunk.forEach((q, i) => q.done(r.images[i] || null)); })
      .catch(() => chunk.forEach(q => { shotCache.delete(shotKey(q.it)); q.done(null); }))
      .finally(() => { shotBusy--; pumpShots(); });
  }
}
function requestShots(items, urgent) {
  const fresh = [];
  for (const it of items) {
    if (!it.nodeId) continue;
    const k = shotKey(it);
    if (shotCache.has(k)) {
      // 아직 줄에서 기다리는 화면이면 앞으로 당긴다
      const at = urgent ? shotQueue.findIndex(q => shotKey(q.it) === k) : -1;
      if (at >= 0) fresh.push(shotQueue.splice(at, 1)[0]);
      continue;
    }
    let done; shotCache.set(k, new Promise(r => { done = r; }));
    fresh.push({ it, done });
  }
  if (urgent) shotQueue.unshift(...fresh); else shotQueue.push(...fresh);
  pumpShots(urgent && fresh.length ? 1 : 0);
}
function loadShots(items) { requestShots(items, true); return Promise.all(items.map(it => shotCache.get(shotKey(it)) || null)); }
// 결과가 나오면 볼 만한 화면을 미리 받아 둔다 — 줄을 누를 때 기다리지 않게
// 고른 화면을 맨 앞에, 후보는 최대 3장까지
const pickCands = (p) => { const first = p.candidates.find(x => x.id === p.chosen); return [first, ...p.candidates.filter(x => x !== first)].filter(Boolean).slice(0, 3); };
const prefetchPicks = () => requestShots(Object.values(current.analysis.platforms).flat().flatMap(e => e.picks.flatMap(p =>
  (p.sure ? pickCands(p).slice(0, 1) : pickCands(p)).map(c => ({ fileKey: current.fileKey, nodeId: c.id, w: c.w, h: c.h })))));
const prefetchDelta = () => requestShots([
  ...work.delta.rows.flatMap(r => [r.source && { fileKey: current.fileKey, nodeId: r.source.id, w: r.source.w, h: r.source.h }, r.target && { fileKey: work.workKey, nodeId: r.target.id, w: r.target.w, h: r.target.h }]),
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
  // 토큰으로 못 받고 느린 방식으로 돌아갔으면 이유를 보여 준다
  const showNote = () => { if (!shotNote || box.querySelector('.shot-note')) return; box.querySelector('.cmp-head').insertAdjacentHTML('afterend', `<div class="shot-note">피그마 토큰으로 시안 일부를 받지 못해 나머지는 느린 방식으로 받고 있어요 · ${esc(shotNote)}</div>`); };
  showNote(); const noteTimer = setInterval(showNote, 1000);
  try {
    const imgs = await loadShots(want.map(sd => ({ fileKey: sd.fileKey, nodeId: sd.x.id, w: sd.x.w, h: sd.x.h })));
    clearInterval(noteTimer); showNote();
    if (!$('#cmp') || $('#cmp') !== box) return;
    want.forEach((sd, j) => {
      const pane = panes[sides.indexOf(sd)];
      pane.innerHTML = imgs[j] ? `<img src="${imgs[j]}" alt="${esc(sd.label)}"${sd.x.w ? ` style="width:${sd.x.w}px"` : ''}>` : '<div class="empty">화면을 받지 못했어요. Figma에서 열어 확인해 주세요.</div>';
    });
  } catch (e) { clearInterval(noteTimer); panes.forEach(p => { if (p.querySelector('.spinner')) p.innerHTML = `<div class="empty">화면을 받지 못했어요: ${esc(e.message)}</div>`; }); }
}

async function onApply() {
  if (!(await needToken())) return;
  $('#applyGo').disabled = true;
  const keep = $('#work').innerHTML;
  $('#work').insertAdjacentHTML('beforeend', progressHtml('apply', '브랜치에 반영하고 있어요', 'applyBusy')); startProgress('apply');
  try {
    const r = await window.core.applyUpdate(current, work);
    stopProgress(true);
    const a = r.apply, s = r.after.summary;
    const done = a.done.map(x => `<li>${x.action} · ${esc(x.platform)}${x.width ? ` ${esc(x.cls || '')} ${x.width}px` : x.removed ? ` ${x.removed}개 지움` : ''} · ${x.same ? '<span class="pill ok">원본과 같음</span>' : '<span class="pill warn">원본과 다름 — 확인 필요</span>'} ${openBtn(linkTo(work.workUrl, x.id))}</li>`).join('');
    // 결론과 다음 할 일을 맨 위에 (2026-10-21 윤우: 결과만 보고는 "그래서 어떻게 된 거지?")
    const go = (url, label) => `<button class="ghost step-btn" data-open="${esc(url)}">${label} ↗</button>`;
    const step = (n, title, body) => `<li class="now"><span class="num">${n}</span><div class="step-body"><b>${title}</b><div>${body}</div></div></li>`;
    const allSame = a.done.length && a.done.every(x => x.same);
    const clean = allSame && !a.notFound.length && !s.replace && !s.add && !s.group && !s.part && !s.drop;
    const coreName = esc(current.place.coreName);
    const nextCore = (current.places || [])[(current.placeAt || 0) + 1] || null;
    const head = !a.done.length
      ? `<div class="conclusion warn"><b>아직 반영한 화면이 없어요.</b> 붙여 넣은 화면을 찾지 못했어요. 위 순서대로 Core 브랜치에 붙여 넣었는지 확인하고 [반영]을 다시 눌러 주세요.</div>`
      : clean
        ? `<div class="conclusion ok"><b>${coreName} 브랜치에 ${a.done.length}장을 반영했어요.</b> 다시 읽어 보니 모든 칸이 프로젝트 시안과 같아요${a.cardUpdated ? ' (링크 카드 기준 날짜도 고침)' : ''}. ${a.linkAdded ? (a.linkAdded.newCard ? '프로젝트 문서 링크는 마스터 페이지 맨 위에 링크 카드를 새로 만들어 걸었어요. ' : '링크 카드에 프로젝트 문서 링크를 더했어요. ') : ''}${a.leftoverRemoved ? '붙여 넣고 남은 것은 브랜치에서 지웠어요. ' : ''}아직 Core 본 파일은 그대로예요. 아래 순서로 마무리해 주세요.</div>`
        : `<div class="conclusion warn"><b>${a.done.length}장을 반영했지만 확인할 게 남았어요.</b> ${a.notFound.length ? `못 찾은 칸: ${esc(a.notFound.join(' · '))}. ` : ''}${!allSame ? '"원본과 다름" 표시가 있는 화면을 Figma에서 봐 주세요. ' : ''}${s.replace || s.add || s.group || s.part || s.drop ? `다시 읽어 보니 아직 바뀌지 않은 칸이 ${s.replace + s.add + (s.group || 0) + (s.part || 0) + (s.drop || 0)}개 있어요. ` : ''}확인 후 [반영]을 다시 누르거나 아래처럼 마무리해 주세요.</div>`;
    const next = a.done.length ? `<h2 style="margin-top:18px">마무리</h2><ol class="flow">
      ${step(1, 'Core 브랜치에서 결과 보기', `바뀐 화면을 눈으로 한 번 확인해 주세요.<div class="row-btn">${go(linkTo(work.workUrl, work.core.masterPageId), 'Core 브랜치 열기')}</div>`)}
      ${step(2, 'Core에 합치기(Merge)', `괜찮으면 Core 브랜치에서 파일 이름 옆 ⌄ → Review and merge changes → Merge. 그때 ${coreName} 본 파일이 바뀌어요. 이상하면 합치지 말고 브랜치를 버리면 원래대로예요.`)}
      ${nextCore ? step(3, `다음 Core: ${esc(nextCore.coreName)}`, `이 시안은 ${esc(nextCore.coreName)}에도 들어가요. 같은 순서로 한 번 더 해요.<div class="row-btn"><button id="nextCore" type="button">${esc(nextCore.coreName)} 갱신하기</button></div>`) : ''}
      </ol>` : '';
    $('#work').innerHTML = keep + `<section class="panel"><h2>반영 결과</h2>${head}${next}
      <details${clean ? '' : ' open'}><summary class="hint">반영한 화면 ${a.done.length}장 자세히</summary><ul>${done || '<li class="muted">반영한 화면 없음</li>'}</ul>
      <p class="muted">다시 읽어 비교: 유지 ${s.keep} · 교체 ${s.replace} · 추가 ${s.add}${a.cardUpdated ? ' · 링크 카드 기준 날짜 갱신' : ''}${a.linkAdded ? ' · 프로젝트 문서 링크 추가' : ''}</p></details>
      </section>`;
    $('#work').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bindOpen($('#work'));
    $('#applyGo') && $('#applyGo').addEventListener('click', onApply);
    $('#nextCore') && $('#nextCore').addEventListener('click', () => switchCore((current.placeAt || 0) + 1));
  } catch (e) { stopProgress(); const b = $('#applyBusy'); if (b) b.outerHTML = `<section class="panel"><h2>반영하지 못했습니다</h2><p class="muted">${esc(e.message)}</p></section>`; $('#applyGo').disabled = false; setupMaybeLost(e); }
}

// ---------- 새 Core ----------
function showBuild() {
  const n = Object.values(current.analysis.platforms).flat().reduce((a, e) => a + e.picks.filter(p => p.chosen).length, 0);
  $('#work').innerHTML = `<section class="panel"><h2>새 Core 만들기 — ${esc(current.place.coreName)}</h2>
    <p class="muted">${work.resume ? '이 복사본은 마스터 페이지까지 만들어졌고, 작업 페이지 정리에서 멈췄어요. 누르면 나머지 작업 페이지를 지워 Cover · --- · 🌏 마스터 파일만 남겨요.' : `복사본을 확인했어요. 누르면 위 대표 화면 ${n}장을 🌏 마스터 파일 페이지로 모으고, 나머지 작업 페이지는 지워서 Cover · --- · 🌏 마스터 파일만 남겨요.`}</p>
    <button id="buildGo">${work.resume ? '이어서 정리하기' : '새 Core 만들기'}</button>${SAFE_NOTE('copy')}</section>`;
  $('#buildGo').addEventListener('click', onBuild);
}

async function onBuild() {
  if (!(await needToken())) return;
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
      <p class="hint">이 Core를 앱의 Core 목록에 추가했습니다 — 다음 판별부터 "기존 Core"로 잡힙니다. 남은 사람 손: 파일 이름·Core 폴더 이동, 원본 커버 Final/아카이브.</p></section>`;
    bindOpen($('#work'));
  } catch (e) { stopProgress(); $('#buildBusy').outerHTML = `<section class="panel"><h2>만들지 못했습니다</h2><p class="muted">${esc(e.message)}</p><p class="hint">${/SyntaxError/.test(e.message) ? 'Figma가 코드를 실행하기 전에 멈춰서 복사본은 그대로예요. 다시 눌러 보세요.' : '복사본에 반쯤 만든 페이지가 남았을 수 있어요. 복사본을 지우고 다시 복제해 주세요.'}</p></section>`; $('#buildGo').disabled = false; setupMaybeLost(e); }
}

if (!useCachedSetup()) showSetup();
showKnowledge();
