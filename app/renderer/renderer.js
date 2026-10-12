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
  const verdictHtml = `<section class="panel"><h2>판별</h2>
    <div class="verdict"><span class="big">${v.suggestion === 'update' ? '기존 Core 갱신' : '새 Core'} → ${esc(v.target)}</span>
    <span class="pill ${v.sure ? 'ok' : 'warn'}">${v.sure ? '자동' : '확인 필요'}</span></div>
    <p class="muted">${esc(v.reason)}</p>
    <p class="muted">프로젝트: ${esc(cover.nameKR || cover.nameEN)} · 커버 ${esc(cover.badge || '상태 없음')}</p>
    ${v.candidates.length ? `<table><tr><th>후보 Core</th><th>점수</th><th>맞은 낱말</th></tr>${v.candidates.map(c => `<tr><td>${esc(c.name)}</td><td>${c.total}</td><td>${esc(c.hits.join(', '))}</td></tr>`).join('')}</table>` : ''}
  </section>`;
  let rows = '';
  // 대표 화면 표의 상태 태그 — 무엇을 해야 하는지 바로 읽히게 (2026-10-12 윤우: "바꿔서 뭘 할 수 있는지 인지가 안 돼")
  const pickTag = (p) => p.basis === 'Core와 같음' ? ['ok', 'Core와 같음'] : /거의/.test(p.basis || '') ? ['warn', 'Core와 거의 같음'] : p.sure ? ['ok', '자동 선택'] : ['warn', '후보 여럿'];
  for (const pf of Object.keys(a.platforms)) for (const e of a.platforms[pf]) for (const p of e.picks) {
    const opts = p.candidates.map(c => `<option value="${esc(c.id)}"${c.id === p.chosen ? ' selected' : ''}>${esc(c.name)} · ${c.w}×${c.h}${c.score != null ? ' · 점수 ' + c.score : ''}</option>`).join('');
    const [cls, tag] = pickTag(p);
    rows += `<tr><td>${esc(pf)} ${esc(e.cls)}<div class="muted">${esc(e.desc)}</div></td><td>${p.width}px</td>
      <td>${p.candidates.length ? `<select data-pf="${esc(pf)}" data-cls="${esc(e.cls)}" data-w="${p.width}">${opts}</select>` : '<span class="pill bad">화면 없음</span>'}</td>
      <td class="tag"><span class="pill ${cls}">${tag}</span></td>
      <td class="go">${p.chosen ? `<button class="link plain" data-view="${esc(pf)}|${esc(e.cls)}|${p.width}">보기 ›</button>` : ''}</td></tr>`;
  }
  const isUpdate = v.suggestion === 'update';
  const pickWhy = isUpdate
    ? `Core에는 크기마다 화면이 한 장씩 들어 있어요. 앱이 이 문서에서 크기마다 한 장을 골라 Core의 같은 칸과 비교해요. <b>Core와 같음</b>이면 그대로 두면 되고, 문서의 다른 화면을 Core에 넣고 싶을 때만 바꾸세요. 바꾸면 아래 "바뀔 내용"에서 그 칸이 <b>교체</b>로 잡혀요.`
    : `Core에는 크기마다 화면을 한 장씩 넣어요. 앱이 이 문서에서 크기마다 한 장을 골랐고, 새 Core를 만들 때 이 화면들이 🌏 마스터 파일에 들어가요. <b>후보 여럿</b>이면 비슷한 화면이 여러 장이라 앱이 확신하지 못한 칸이니, 눌러 보고 대표로 맞는 화면을 골라 주세요.`;
  const picksHtml = `<section class="panel"><h2>크기별 대표 화면</h2><p class="hint lead">${pickWhy}</p>
    <table class="picks"><tr><th>크기</th><th>폭</th><th>대표 화면</th><th class="tag"></th><th class="go"></th></tr>${rows}</table></section>`;
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
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    const [pf, cls, w] = b.dataset.view.split('|');
    const p = current.analysis.platforms[pf].find(x => x.cls === cls).picks.find(x => String(x.width) === w);
    const c = p.candidates.find(x => x.id === p.chosen) || { id: p.chosen, name: '' };
    openViewer({ pill: null, title: `${pf} ${cls} ${w}px · 대표 화면`, why: '', sides: [{ label: '프로젝트 문서', x: c, fileKey: current.fileKey, url: linkTo(current.sourceUrl, c.id) }] });
  }));
  bindOpen();
}

$('#form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  work = null;
  const url = $('#url').value.trim();
  $('#go').disabled = true;
  document.body.classList.remove('home');
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
const diffHtml = (d) => {
  if (!d) return '';
  const part = (label, xs, more) => xs.length ? `<div>${label}: ${xs.map(esc).join(', ')}${more ? ` 외 ${more}개` : ''}</div>` : '';
  const body = part('원본에만', d.onlyA, d.moreA) + part('Core에만', d.onlyB, d.moreB);
  return body ? `<div class="diff">${body}</div>` : '<div class="diff">요소·글자 차이 없음</div>';
};
const ACTION_PILL = { '유지': 'ok', '교체': 'warn', '추가': 'warn', '그대로': '', '미수록': 'bad' };
const screenCell = (x) => x ? `${esc(x.name || '')}<div class="muted size">${x.w}×${x.h}</div>` : '<span class="muted">—</span>';
function showDelta() {
  const d = work.delta, s = d.summary;
  const rows = d.rows.map((r, i) => `<tr class="pick" data-row="${i}" title="눌러서 두 화면 나란히 보기"><td class="act"><span class="pill ${ACTION_PILL[r.action]}">${r.action}</span></td><td>${esc(r.platform)} ${esc(r.cls || '')} ${r.width}px</td>
    <td>${screenCell(r.source)}</td><td>${r.target ? screenCell(Object.assign({ name: 'Core' }, r.target)) : screenCell(null)}</td><td class="muted">${r.check ? '<span class="pill warn">확인 필요</span> ' : ''}${esc(r.why)}${diffHtml(r.diff)}</td><td class="go">비교 ›</td></tr>`).join('');
  const miss = d.missing.map((m, i) => `<tr class="pick" data-miss="${i}" title="눌러서 화면 보기"><td class="act"><span class="pill bad">미수록</span></td><td colspan="3">${esc(m.section)}</td><td class="muted">${esc(m.why)}</td><td class="go">보기 ›</td></tr>`).join('');
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
const shotCache = new Map();   // fileKey|id → 그림(data:) — 한 번 받은 화면은 다시 부르지 않는다
async function loadShots(items) {
  const need = items.filter(it => !shotCache.has(it.fileKey + '|' + it.nodeId));
  if (need.length) {
    const r = await window.core.screens(need);
    need.forEach((it, i) => shotCache.set(it.fileKey + '|' + it.nodeId, r.images[i]));
  }
  return items.map(it => shotCache.get(it.fileKey + '|' + it.nodeId));
}
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
  const col = (sd, i) => `<figure><figcaption><b>${sd.label}</b>${sd.x ? ` <span class="muted">${esc([sd.x.name, sd.x.w ? `${sd.x.w}×${sd.x.h}` : ''].filter(Boolean).join(' · '))}</span> ${openBtn(sd.url, 'Figma에서 열기')}` : ''}</figcaption>
    <div class="shot" data-side="${i}">${sd.x ? '<div class="spinner">화면을 불러오는 중… (처음 한 번은 10~20초)</div>' : `<div class="empty">${esc(sd.empty || '화면 없음')}</div>`}</div></figure>`;
  document.body.insertAdjacentHTML('beforeend', `<div id="cmp" class="cmp-back"><div class="cmp" role="dialog" aria-label="화면 보기">
    <div class="cmp-head">${pill ? `<span class="pill ${pill[0]}">${esc(pill[1])}</span>` : ''}<b>${esc(title)}</b><span class="muted cmp-why">${esc(why || '')}</span><button class="close" title="닫기 (esc)">✕</button></div>
    <div class="cmp-cols n${sides.length}">${sides.map(col).join('')}</div></div></div>`);
  const box = $('#cmp');
  box.addEventListener('click', (ev) => { if (ev.target === box || ev.target.closest('.close')) closeCompare(); });
  document.addEventListener('keydown', escClose);
  bindOpen(box);
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
