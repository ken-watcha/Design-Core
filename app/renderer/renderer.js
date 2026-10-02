// 화면: 준비 상태 → 링크 → 분석 결과(판별 · 크기별 대표 화면 · 수록 대조표)
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nodeUrl = (fileKey, id) => `https://www.figma.com/design/${fileKey}/?node-id=${String(id).replace(':', '-')}`;
let current = null;

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
  try { const k = await window.core.knowledge(); $('#footer').textContent = `규칙 ${k.rulesVersion} · Core ${k.cores}개 · ${k.from}에서 받음`; }
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
      <td><span class="pill ${p.sure ? 'ok' : 'warn'}">${p.sure ? '자동' : '확인 필요'}</span></td>
      <td>${p.chosen ? `<button class="link" data-open="${esc(nodeUrl(r.fileKey, p.chosen))}">Figma에서 보기</button>` : ''}</td></tr>`;
  }
  const picksHtml = `<section class="panel"><h2>크기별 대표 화면</h2><table><tr><th>크기</th><th>폭</th><th>대표 화면</th><th></th><th></th></tr>${rows}</table>
    <p class="hint">"확인 필요"는 점수가 같은 후보가 여럿이라는 뜻입니다. 골라 두면 다음 단계(새 Core 만들기)에서 그 화면을 씁니다.</p></section>`;
  const cov = (a.coverage || []).map(c => `<tr><td>${esc(c.section)}</td><td>${c.to ? esc(c.to) : '<span class="pill warn">미수록</span>'}</td><td class="muted">${esc(c.note)}</td></tr>`).join('');
  const covHtml = `<section class="panel"><h2>수록 대조표</h2><p class="hint" style="margin-top:0">문서의 섹션이 하나도 빠지지 않았는지 확인합니다.</p><table><tr><th>문서 섹션</th><th>Core에서 들어갈 자리</th><th></th></tr>${cov}</table>
    ${a.missing.length ? `<p class="muted">못 찾은 것: ${esc(a.missing.join(' · '))}</p>` : ''}</section>`;
  const next = `<section class="panel"><h2>다음 단계</h2><p class="muted">${v.suggestion === 'new' ? 'Figma에서 이 프로젝트 파일을 File → Duplicate 한 뒤, 복제본 링크로 "새 Core 만들기"를 실행합니다. (다음 버전에서 열림)' : '해당 Core의 브랜치 "Core 도우미"에 반영합니다. (다음 버전에서 열림)'}</p>
    ${r.costUsd != null ? `<p class="hint">이번 분석에 쓴 Claude 사용량: 약 $${Number(r.costUsd).toFixed(3)}</p>` : ''}</section>`;
  $('#result').innerHTML = verdictHtml + picksHtml + covHtml + next;
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => window.core.open(b.dataset.open)));
  document.querySelectorAll('select[data-pf]').forEach(s => s.addEventListener('change', () => {
    const e = current.analysis.platforms[s.dataset.pf].find(x => x.cls === s.dataset.cls); const p = e.picks.find(x => String(x.width) === s.dataset.w);
    p.chosen = s.value; p.sure = true; p.touched = true;
  }));
}

$('#form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const url = $('#url').value.trim();
  $('#go').disabled = true;
  $('#result').innerHTML = '<section class="panel spinner">Figma 문서를 읽는 중… (보통 30초~1분)</section>';
  try { current = await window.core.analyze(url); render(current); }
  catch (e) { $('#result').innerHTML = `<section class="panel"><h2>분석하지 못했습니다</h2><p class="muted">${esc(e.message)}</p></section>`; }
  finally { $('#go').disabled = false; }
});

showSetup();
showKnowledge();
