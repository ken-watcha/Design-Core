// 앱의 두뇌: 규칙·색인을 GitHub(main)에서 받고, 없으면 앱에 들어 있는 사본을 쓴다
const fs = require('fs');
const path = require('path');
const { buildAnalyzeCode } = require('./figma-analyze');
const { judge } = require('./judge');
const { runFigma } = require('./claude-runner');

const RAW = 'https://raw.githubusercontent.com/ken-watcha/Design-Core/main/';
const LOCAL = path.join(__dirname, '..', '..');

async function loadJson(rel) {
  try { const r = await fetch(RAW + rel, { cache: 'no-store' }); if (r.ok) return { data: await r.json(), from: 'GitHub main' }; } catch (e) {}
  return { data: JSON.parse(fs.readFileSync(path.join(LOCAL, rel), 'utf8')), from: '앱 사본' };
}

async function loadKnowledge() {
  const [rules, index, memory] = await Promise.all([loadJson('plugin/rules.json'), loadJson('core-index/core-index.json'), loadJson('plugin/memory.json').catch(() => ({ data: {} }))]);
  return { rules: rules.data, index: index.data, memory: memory.data || {}, from: rules.from, rulesVersion: rules.data.version };
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
  return { analysis: data, verdict, costUsd, fileKey };
}

module.exports = { loadKnowledge, analyzeProject, parseFigmaUrl };
