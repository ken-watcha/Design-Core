// Core 도우미 데스크톱 앱 — 창과 엔진 연결. 앱 로그인 없음, Figma·Claude는 각자 노트북의 Claude Code 로그인을 쓴다.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { loadKnowledge, analyzeProject } = require('./engine/core');
const { checkSetup } = require('./engine/claude-runner');

let knowledge = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 820, minWidth: 760, title: 'Core 도우미',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('setup', async () => checkSetup());
ipcMain.handle('knowledge', async () => {
  knowledge = await loadKnowledge();
  return { from: knowledge.from, rulesVersion: knowledge.rulesVersion, cores: knowledge.index.files.length };
});
ipcMain.handle('analyze', async (_e, url) => {
  if (!knowledge) knowledge = await loadKnowledge();
  return analyzeProject(url, knowledge);
});
ipcMain.handle('open', (_e, url) => { if (/^https:\/\/(www\.)?figma\.com\//.test(url)) shell.openExternal(url); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
