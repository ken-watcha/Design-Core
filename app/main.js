// Core 도우미 데스크톱 앱 — 창과 엔진 연결. 앱 로그인 없음, Figma·Claude는 각자 노트북의 Claude Code 로그인을 쓴다.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { loadKnowledge, analyzeProject, buildNewCore } = require('./engine/core');
const { checkSetup } = require('./engine/claude-runner');
const { planFromAnalysis } = require('./engine/figma-build');

let knowledge = null;
const fs = require('fs');

// 앱이 만든 새 Core를 이 노트북의 Core 목록에 바로 더한다 (팀 공용 색인 core-index.json은 저장소에서 갱신)
const localCoresPath = () => path.join(app.getPath('userData'), 'local-cores.json');
const readLocalCores = () => { try { return JSON.parse(fs.readFileSync(localCoresPath(), 'utf8')); } catch (e) { return []; } };
function withLocalCores(k) {
  const have = new Set(k.index.files.map(f => f.key));
  const extra = readLocalCores().filter(f => !have.has(f.key));
  k.index = Object.assign({}, k.index, { files: k.index.files.concat(extra) });
  k.localCores = extra.length;
  return k;
}
function rememberCore(entry) {
  const list = readLocalCores().filter(f => f.key !== entry.key).concat([entry]);
  fs.mkdirSync(path.dirname(localCoresPath()), { recursive: true });
  fs.writeFileSync(localCoresPath(), JSON.stringify(list, null, 1));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 820, minWidth: 760, title: 'Core 도우미',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('setup', async () => checkSetup());
ipcMain.handle('knowledge', async () => {
  knowledge = withLocalCores(await loadKnowledge());
  return { from: knowledge.from, rulesVersion: knowledge.rulesVersion, cores: knowledge.index.files.length, localCores: knowledge.localCores };
});
ipcMain.handle('analyze', async (_e, url) => {
  if (!knowledge) knowledge = withLocalCores(await loadKnowledge());
  return analyzeProject(url, knowledge);
});
ipcMain.handle('build', async (_e, coreUrl, analyzed, dryRun, mode, versionSaved) => {
  if (!knowledge) knowledge = withLocalCores(await loadKnowledge());
  const plan = Object.assign(planFromAnalysis(analyzed), { versionSavedByHuman: !!versionSaved });
  const r = await buildNewCore(coreUrl, plan, knowledge, { dryRun: !!dryRun, mode: mode === 'duplicate' ? 'duplicate' : 'pasted' });
  if (!dryRun && r.ok) {
    rememberCore({ name: r.check.fileName, key: r.fileKey, url: `https://www.figma.com/design/${r.fileKey}/`, format: 'new', domain: [plan.projectName], source_projects: [plan.sourceFileKey], local: true, created: new Date().toISOString().slice(0, 10) });
    knowledge = null; r.addedToLocalIndex = true;
  }
  return r;
});
ipcMain.handle('open', (_e, url) => { if (/^https:\/\/(www\.)?figma\.com\//.test(url)) shell.openExternal(url); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
