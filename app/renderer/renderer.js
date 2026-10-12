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
    el.title = s.detail || '';
  } catch (e) { el.innerHTML = `<span class="bad">● 확인 실패</span>`; el.title = e.message; }
}

async function showKnowledge() {
  try { const k = await window.core.knowledge(); $('#footer').textContent = `규칙 ${k.rulesVersion} · Core ${k.cores}개 · ${k.from}`; }
  catch (e) { $('#footer').textContent = '규칙을 불러오지 못했습니다: ' + e.message; }
}

function render(r) {
  const a = r.analysis, v = r.verdict;
  if (a.kind !== 'project') {
    $('#result').innerHTML = `<section class="panel"><h2>프로젝트 문서가 아닙니다</h2><p class="muted">파일 종류: ${esc(a.kind)} · 페이지: ${esc(a.pages.join(' / '))}</p></section>`;
    return;
  }
  const cover = a.cover;
  const verdictHtml = `<section class="panel"><h2>판별</h2>
    <div class="verdict"><span class="big">${v.suggestion === 'update' ? '기존 Core 갱신' : '새 Core'} → ${esc(v.target)}</span>
    <span class="pill ${v.sure ? 'ok' : 'warn'}">${v.sure ? '자동' : '확인 필요'}</span></div>
    <p class="muted">${esc(v.reason)}</p>
    <p class="muted">프로젝트: ${esc(cover.nameKR || cover.nameEN)} · 커버 ${esc(cover.badge || '상태 없음')}</p>
    ${v.candidates.length ? `<table><tr><th>후보 Core</th><th>점수</th><th>맞은 낱말</th></tr>${v.candidates.map(c => `<tr><td>${esc(c.name)}</td><td>${c.total}</td><td>${esc(c.hits.join(', '))}</td></tr>`).join('')}</table>` : ''}
  </section>`;
  let rows = '';
  for (const pf of Object.keys(a.platforms)) for (const e of a.platforms[pf]) for (const p of e.picks) {
    const opts = p.candidates.map(c => `<option value="${esc(c.id)}"${c.id === p.chosen ? ' selected' : ''}>${esc(c.name)} · ${c.w}×${c.h} · 점수 ${c.score}</option>`).join('');
    rows += `<tr><td>${esc(pf)} ${esc(e.cls)}<div class="muted">${esc(e.desc)}</div></td><td>${p.width}px</td>
      <td>${p.candidates.length ? `<select data-pf="${esc(pf)}" data-cls="${esc(e.cls)}" data-w="${p.width}">${opts}</select>` : '<span class="pill bad">화면 없음</span>'}</td>
      <td><span class="pill ${p.sure ? 'ok' : 'warn'}">${p.basis === 'Core와 같음' ? 'Core와 같음' : (p.sure ? '자동' : '확인 필요')}</span></td>
      <td>${p.chosen ? `<button class="link" data-open="${esc(nodeUrl(r.fileKey, p.chosen))}">Figma에서 보기</button>` : ''}</td></tr>`;
  }
  const picksHtml = `<section class="panel"><h2>크기별 대표 화면</h2><table><tr><th>크기</th><th>폭</th><th>대표 화면</th><th></th><th></th></tr>${rows}</table>
    <p class="hint">"확인 필요"는 점수가 같은 후보가 여럿이라는 뜻입니다. 골라 두면 아래 작업(새 Core 만들기 · 기존 Core 갱신)에서 그 화면을 씁니다.</p></section>`;
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
    if (work) { work = null; $('#work').innerHTML = '<section class="panel muted">대표 화면을 바꿨습니다 — 작업 위치 [확인]을 다시 눌러 주세요.</section>'; }
  }));
  bindOpen();
}

$('#form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  work = null;
  const url = $('#url').value.trim();
  $('#go').disabled = true;
  $('#result').innerHTML = '<section class="panel spinner">Figma 문서를 읽는 중… (보통 30초~1분)</section>';
  try { current = await window.core.analyze(url); render(current); }
  catch (e) { $('#result').innerHTML = `<section class="panel"><h2>분석하지 못했습니다</h2><p class="muted">${esc(e.message)}</p></section>`; }
  finally { $('#go').disabled = false; }
});

$('#setup').addEventListener('click', () => { $('#setup').textContent = '준비 상태 다시 확인 중…'; showSetup(); });

function bindOpen(root = document) { root.querySelectorAll('[data-open]').forEach(b => { if (b.dataset.bound) return; b.dataset.bound = 1; b.addEventListener('click', () => window.core.open(b.dataset.open)); }); }
// 쓰기 전 Named version: 이 연결(use_figma)은 자동 저장을 거부해서(2026-09-18) 사람이 저장하고 체크해야 버튼이 켜진다
const VERSION_GATE = (btnId) => `<label class="check"><input type="checkbox" data-gate="${btnId}"> 쓰기 전에 이 파일 버전을 저장했어요 (Figma: File → Save to version history)</label>`;
function bindGate(root) { root.querySelectorAll('[data-gate]').forEach(c => { const b = document.getElementById(c.dataset.gate); if (!b) return; b.disabled = !c.checked; c.addEventListener('change', () => { b.disabled = !c.checked; }); }); }
const openBtn = (url, label = 'Figma에서 보기') => `<button class="link" data-open="${esc(url)}">${esc(label)}</button>`;
const busy = (msg) => { $('#work').innerHTML = `<section class="panel spinner">${esc(msg)}</section>`; };
const fail = (title, e) => { $('#work').innerHTML = `<section class="panel"><h2>${esc(title)}</h2><p class="muted">${esc(e && e.message ? e.message : e)}</p></section>`; };
const money = (v) => v != null ? `<p class="hint">이번 단계 Claude 사용량: 약 $${Number(v).toFixed(3)}</p>` : '';

// ---------- 📍 작업 위치 ----------
function placeHtml(r) {
  const pl = r.place; if (!pl) return '';
  const head = pl.kind === 'branch' ? `기존 Core 갱신 → ${esc(pl.coreName)}의 브랜치 "Core 도우미"` : `새 Core → 프로젝트 파일의 복제본 (${esc(pl.coreName)})`;
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
  $('#placeGo').disabled = true; busy('작업 위치를 확인하는 중… (읽기만, 30초~1분)');
  try {
    const w = await window.core.checkWorkplace(current, url);
    if (!w.ok) { fail('이 링크에서는 작업하지 않습니다', w.why); return; }
    work = w;
    if (w.kind === 'branch') { current.analysis = w.analysis; render(current); $('#placeUrl').value = url; showDelta(); }
    else showBuild();
  } catch (e) { fail('작업 위치를 확인하지 못했습니다', e); }
  finally { $('#placeGo').disabled = false; }
}

// ---------- 기존 Core 갱신 ----------
const ACTION_PILL = { '유지': 'ok', '교체': 'warn', '추가': 'warn', '그대로': '', '미수록': 'bad' };
function showDelta() {
  const d = work.delta, s = d.summary;
  const rows = d.rows.map(r => `<tr><td><span class="pill ${ACTION_PILL[r.action]}">${r.action}</span></td><td>${esc(r.platform)} ${esc(r.cls || '')} ${r.width}px</td>
    <td>${r.source ? esc(r.source.name) + ` <span class="muted">${r.source.w}×${r.source.h}</span> ` + openBtn(linkTo(current.sourceUrl, r.source.id), '원본') : '—'}</td>
    <td>${r.target ? `<span class="muted">${r.target.w}×${r.target.h}</span> ` + openBtn(linkTo(work.workUrl, r.target.id), 'Core') : '—'}</td><td class="muted">${esc(r.why)}</td></tr>`).join('');
  const miss = d.missing.map(m => `<tr><td><span class="pill bad">미수록</span></td><td colspan="3">${esc(m.section)} ${openBtn(linkTo(current.sourceUrl, m.id), '원본')}</td><td class="muted">${esc(m.why)}</td></tr>`).join('');
  const todo = d.rows.filter(r => r.action === '교체' || r.action === '추가');
  const paste = todo.length ? `<h2 style="margin-top:18px">붙여넣기 (사람 손 1회)</h2>
    <ol><li>아래 화면을 원본 프로젝트 문서에서 열어 모두 선택 → ⌘C<ul>${todo.map(r => `<li>${esc(r.platform)} ${esc(r.cls)} ${r.width}px — ${esc(r.source.name)} ${openBtn(linkTo(current.sourceUrl, r.source.id), '원본 열기')}</li>`).join('')}</ul></li>
    <li>브랜치의 🌏 마스터 파일 페이지 빈 곳에 ⌘V ${openBtn(linkTo(work.workUrl, work.core.masterPageId), '브랜치 마스터 열기')}</li>
    <li>[반영]을 누르면 앱이 붙여 넣은 화면을 알아보고 교체(이름·위치·링크 유지, 속만 바꿈)·추가(🔵 바와 함께)·링크 카드 기준 날짜를 고칩니다</li></ol>
    ${VERSION_GATE('applyGo')}<button id="applyGo">반영</button>` : `<p class="muted" style="margin-top:12px">바꿀 화면이 없습니다 — Core가 프로젝트 문서와 같습니다.</p>`;
  $('#work').innerHTML = `<section class="panel"><h2>Δ 바뀔 내용 — ${esc(current.place.coreName)}</h2>
    <p class="muted">유지 ${s.keep} · 교체 ${s.replace} · 추가 ${s.add}${s.untouched ? ' · 그대로 ' + s.untouched : ''} · 미수록 ${s.missing}${work.preferred ? ` — Core에 이미 있는 화면과 같은 후보 ${work.preferred}칸을 대표로 맞췄습니다` : ''}</p>
    <table><tr><th></th><th>칸</th><th>프로젝트 화면</th><th>Core 화면</th><th></th></tr>${rows}${miss}</table>
    ${paste}${money(work.costUsd)}</section>`;
  bindOpen($('#work')); bindGate($('#work'));
  $('#applyGo') && $('#applyGo').addEventListener('click', onApply);
}

async function onApply() {
  $('#applyGo').disabled = true;
  const keep = $('#work').innerHTML;
  $('#work').insertAdjacentHTML('beforeend', '<section class="panel spinner" id="applyBusy">브랜치에 반영하는 중… (1~2분)</section>');
  try {
    const r = await window.core.applyUpdate(current, work);
    const a = r.apply, s = r.after.summary;
    const done = a.done.map(x => `<li>${x.action} · ${esc(x.platform)} ${esc(x.cls)} ${x.width}px · ${x.same ? '<span class="pill ok">원본과 같음</span>' : '<span class="pill warn">원본과 다름 — 확인 필요</span>'} ${openBtn(linkTo(work.workUrl, x.id))}</li>`).join('');
    $('#work').innerHTML = keep + `<section class="panel"><h2>반영 결과</h2>
      <ul>${done || '<li class="muted">반영한 화면 없음</li>'}</ul>
      ${a.notFound.length ? `<p class="muted">붙여 넣은 화면을 못 찾은 칸: ${esc(a.notFound.join(' · '))} — 붙여넣기를 확인하고 [반영]을 다시 누르세요</p>` : ''}
      <p class="muted">다시 읽어 비교: 유지 ${s.keep} · 교체 ${s.replace} · 추가 ${s.add} · 미수록 ${s.missing}${a.cardUpdated ? ' · 링크 카드 기준 날짜 갱신' : ''}</p>
      <p class="hint">브랜치를 보고 괜찮으면 Figma에서 Merge(합치기)는 직접 해 주세요. ${openBtn(linkTo(work.workUrl, work.core.masterPageId), '브랜치 마스터 열기')}</p>${money(r.costUsd)}</section>`;
    bindOpen($('#work'));
    $('#applyGo') && $('#applyGo').addEventListener('click', onApply);
  } catch (e) { const b = $('#applyBusy'); if (b) b.outerHTML = `<section class="panel"><h2>반영하지 못했습니다</h2><p class="muted">${esc(e.message)}</p></section>`; $('#applyGo').disabled = false; }
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
  $('#work').insertAdjacentHTML('beforeend', '<section class="panel spinner" id="buildBusy">복제본에 Core를 만드는 중… (2~4분)</section>');
  try {
    const r = await window.core.buildNewCore(current, work);
    const b = r.build;
    const screens = b.screens.map(x => `<li>${esc(x.platform)} ${esc(x.cls)} ${x.w}×${x.h} · ${x.left === 0 ? '<span class="pill ok">원본과 같음</span>' : `<span class="pill warn">남은 차이 ${x.left}</span>`} ${openBtn(linkTo(work.workUrl, x.id))}</li>`).join('');
    $('#buildBusy').outerHTML = `<section class="panel"><h2>새 Core를 만들었습니다</h2>
      <p>${openBtn(linkTo(work.workUrl, b.rootId), '🌏 마스터 파일 열기')}</p>
      <ul>${screens}</ul>
      <p class="muted">지운 페이지: ${esc(r.trim.removed.join(', ') || '없음')} · 로컬 컴포넌트 분리 ${r.trim.detached}개 · 남은 페이지: ${esc(r.trim.pages.join(' / '))}</p>
      ${(b.log || []).filter(l => /⚠|대신/.test(l)).map(l => `<p class="muted">${esc(l)}</p>`).join('')}
      <p class="hint">이 Core를 앱의 Core 목록에 추가했습니다 — 다음 판별부터 "기존 Core"로 잡힙니다. 남은 사람 손: 파일 이름·Core 폴더 이동, 원본 커버 Final/아카이브.</p>${money(r.costUsd)}</section>`;
    bindOpen($('#work'));
  } catch (e) { $('#buildBusy').outerHTML = `<section class="panel"><h2>만들지 못했습니다</h2><p class="muted">${esc(e.message)}</p><p class="hint">복제본에 반쯤 만든 페이지가 남았을 수 있습니다. 복제본을 지우고 다시 Duplicate해 주세요.</p></section>`; $('#buildGo').disabled = false; }
}

showSetup();
showKnowledge();
