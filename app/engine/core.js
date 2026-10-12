// 앱의 두뇌: 규칙·색인을 GitHub(main)에서 받고, 없으면 앱에 들어 있는 사본을 쓴다
const fs = require('fs');
const path = require('path');
const { buildAnalyzeCode } = require('./figma-analyze');
const { judge } = require('./judge');
const { runFigma } = require('./claude-runner');
const { mergeIndex, readLocal, entryFromCoreRead, addLocal } = require('./index-store');
const { buildCoreReadCode } = require('./figma-core-read');
const { buildNewCoreCode, trimNewCoreCode, applyUpdateCode } = require('./figma-write');
const { proposePlace, checkLink } = require('./place');
const { computeDelta, preferCoreScreens } = require('./delta');

const RAW = 'https://raw.githubusercontent.com/ken-watcha/Design-Core/main/';
const LOCAL = path.join(__dirname, '..', '..');

async function loadJson(rel) {
  try { const r = await fetch(RAW + rel, { cache: 'no-store' }); if (r.ok) return { data: await r.json(), from: 'GitHub main' }; } catch (e) {}
  return { data: JSON.parse(fs.readFileSync(path.join(LOCAL, rel), 'utf8')), from: '앱 사본' };
}

async function loadKnowledge() {
  const [rules, index, memory] = await Promise.all([loadJson('plugin/rules.json'), loadJson('core-index/core-index.json'), loadJson('plugin/memory.json').catch(() => ({ data: {} }))]);
  let copy = null; try { copy = JSON.parse(fs.readFileSync(path.join(LOCAL, 'core-index/core-index.json'), 'utf8')); } catch (e) {}
  const merged = mergeIndex(index.data, copy, readLocal());
  return { rules: rules.data, index: merged.index, memory: memory.data || {}, from: `규칙 ${rules.from} · 색인 ${index.from}${merged.added.length ? ' + ' + merged.added.length + '개 추가' : ''}`, rulesVersion: rules.data.version, addedCores: merged.added };
}

function parseFigmaUrl(url) {
  const m = /figma\.com\/(?:design|file)\/([0-9A-Za-z]{22,128})(?:\/branch\/([0-9A-Za-z]{22,128}))?/.exec(url || '');
  return m ? (m[2] || m[1]) : null;
}

async function analyzeProject(url, knowledge, runner = runFigma) {
  const fileKey = parseFigmaUrl(url);
  if (!fileKey) throw new Error('Figma 디자인 파일 링크가 아닙니다');
  const code = buildAnalyzeCode(knowledge.rules, knowledge.memory);
  const { data, costUsd } = await runner(fileKey, code, 'Core 도우미: 프로젝트 문서 분석 (읽기 전용)');
  const verdict = data.kind === 'project' ? judge(data, knowledge.index, knowledge.rules, knowledge.memory) : null;
  const place = verdict ? proposePlace(verdict, url, fileKey) : null;
  return { analysis: data, verdict, place, costUsd, fileKey, sourceUrl: url };
}

const month = (d = new Date()) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
const projectNameOf = (verdict) => verdict.target.replace(/^\[Core\]\s*/, '').trim();

// 📍 사람이 준 작업 위치 링크를 검사하고(읽기만), 갱신이면 Δ 표까지 만든다
async function checkWorkplace(state, url, knowledge, runner = runFigma) {
  const link = checkLink(state.place, url);
  if (!link.ok) return { ok: false, why: link.why };
  const { data: read, costUsd } = await runner(link.workKey, buildCoreReadCode(knowledge.rules), 'Core 도우미: 작업 위치 확인 (읽기 전용)');
  if (state.place.kind === 'branch') {
    if (!read.isCore) return { ok: false, why: '이 파일에는 "🌏 마스터 파일" 페이지가 없습니다 — Core 파일의 브랜치가 맞나요?', costUsd };
    const preferred = preferCoreScreens(state.analysis, read);
    const delta = computeDelta(state.analysis, read);
    return { ok: true, kind: 'branch', workKey: link.workKey, workUrl: url, core: read, delta, preferred, analysis: state.analysis, costUsd };
  }
  if (read.isCore) return { ok: false, why: '이미 "🌏 마스터 파일" 페이지가 있는 파일입니다 — 새로 Duplicate한 복사본을 주세요', costUsd };
  const projectPages = knowledge.rules.fileKind.projectPagePatterns;
  if (!projectPages.some(pat => read.pages.some(n => n.includes(pat)))) return { ok: false, why: '프로젝트 문서 복사본이 아닙니다 (✅ Mobile·✅ Web 페이지가 없음). 파일 전체를 Duplicate해 주세요', costUsd };
  return { ok: true, kind: 'duplicate', workKey: link.workKey, workUrl: url, pages: read.pages, costUsd };
}

// 새 Core 만들기: 1회차 만들기 → 2회차 깎기 → 결과를 다시 읽어 색인(로컬)에 추가
async function buildNewCore(state, work, knowledge, runner = runFigma) {
  const cover = state.analysis.cover || {};
  const plan = { projectName: projectNameOf(state.verdict), sourceUrl: state.sourceUrl, sourceFileKey: state.fileKey, releaseMonth: month(), owner: cover.owner || ((cover.nameKR || '').split(/\s+I\s+/)[1] || ''), platforms: state.analysis.platforms };
  const b = await runner(work.workKey, buildNewCoreCode(knowledge.rules, plan), 'Core 도우미: 새 Core 마스터 만들기 (복제본)');
  const t = await runner(work.workKey, trimNewCoreCode(knowledge.rules, plan), 'Core 도우미: 새 Core 깎기 (복제본)');
  const r = await runner(work.workKey, buildCoreReadCode(knowledge.rules), 'Core 도우미: 만든 Core 확인 (읽기 전용)');
  const entry = entryFromCoreRead(r.data, state.verdict.target, { origin: `앱이 프로젝트 문서(${state.fileKey})를 복제해 만든 새 Core (${new Date().toISOString().slice(0, 10)})`, source_projects: [state.fileKey] });
  addLocal(entry);
  knowledge.index.files = knowledge.index.files.filter(f => f.key !== entry.key).concat([entry]);
  return { build: b.data, trim: t.data, core: r.data, costUsd: (b.costUsd || 0) + (t.costUsd || 0) + (r.costUsd || 0) };
}

// 기존 Core 갱신: 붙여 넣은 화면을 반영 → 다시 읽어 Δ로 확인
async function applyUpdate(state, work, knowledge, runner = runFigma) {
  const rows = work.delta.rows.filter(r => r.action === '교체' || r.action === '추가');
  const screenName = ((work.core.platforms.APP || work.core.platforms.WEB || {}).screens || [])[0];
  const plan = { coreKey: state.place.coreKey, coreScreenIds: Object.values(work.core.platforms).flatMap(p => p.screens.map(s => s.id)), rows, month: month(), screenName: screenName ? screenName.name : null };
  const a = await runner(work.workKey, applyUpdateCode(knowledge.rules, plan), 'Core 도우미: 기존 Core 갱신 (브랜치)');
  const r = await runner(work.workKey, buildCoreReadCode(knowledge.rules), 'Core 도우미: 갱신 결과 확인 (읽기 전용)');
  const after = computeDelta(state.analysis, r.data);
  return { apply: a.data, after, core: r.data, costUsd: (a.costUsd || 0) + (r.costUsd || 0) };
}

module.exports = { loadKnowledge, analyzeProject, parseFigmaUrl, checkWorkplace, buildNewCore, applyUpdate };
