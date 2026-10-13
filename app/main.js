// Core 업데이트 데스크톱 앱 — 창과 엔진 연결. 앱 로그인 없음, Figma·Claude는 각자 노트북의 Claude Code 로그인을 쓴다.
// 화면은 진행 상태(state: 분석 결과 + 판별 + 작업 위치)를 들고 있다가 단계마다 통째로 넘긴다.
const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadKnowledge, analyzeProject, checkWorkplace, buildNewCore, applyUpdate } = require('./engine/core');
const { checkSetup, screenshots, setProgressSink, setRestToken, restCheck } = require('./engine/claude-runner');

// Figma 개인 액세스 토큰(그림 빨리 받기용) — 맥 키체인으로 암호화해 앱 데이터 폴더에만 둔다. 채팅·저장소에는 남기지 않는다.
const tokenFile = () => path.join(app.getPath('userData'), 'figma-token.bin');
function loadToken() {
  try { if (safeStorage.isEncryptionAvailable() && fs.existsSync(tokenFile())) setRestToken(safeStorage.decryptString(fs.readFileSync(tokenFile()))); } catch (e) { setRestToken(null); }
}
let tokenWho = null;

let knowledge = null;
const ensureKnowledge = async () => (knowledge = knowledge || await loadKnowledge());

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 820, minWidth: 760, title: 'Core 업데이트',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  setProgressSink((ev) => { if (!win.isDestroyed()) win.webContents.send('progress', ev); });
}

ipcMain.handle('setup', async () => checkSetup());
// 처음 설치 도우미 (2026-10-13 윤우: 설치 파일만 받으면 앱 안에서 Claude·Figma 연결까지)
ipcMain.handle('installClaude', async () => new Promise((resolve, reject) => {
  execFile('/bin/bash', ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'], { timeout: 300000 }, (err, out, errOut) => err ? reject(new Error((errOut || err.message).slice(-400))) : resolve({ ok: true }));
}));
ipcMain.handle('openConnect', async () => {
  // 터미널에서 Claude를 Figma 연결 설정과 함께 연다. 로그인(/login)·Figma 인증(/mcp)은 사람이 브라우저에서 한다.
  const f = path.join(app.getPath('userData'), 'Claude-연결하기.command');
  const mcp = path.join(__dirname, 'mcp.json');
  fs.writeFileSync(f, `#!/bin/bash
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"
clear
echo "Core 업데이트 · Claude·Figma 연결"
echo ""
echo "  ① 'Please run /login' 같은 말이 보이면 → /login 입력 → 브라우저에서 회사 계정으로 로그인"
echo "  ② /mcp 입력 → figma 선택 → Authenticate → 브라우저에서 허용"
echo "  ③ 'Connected to figma'가 보이면 이 창을 닫고 앱에서 [다시 확인]"
echo ""
cd "$HOME"
claude --mcp-config ${JSON.stringify(mcp)}
`, { mode: 0o755 });
  await shell.openPath(f);
  return { ok: true };
});
ipcMain.handle('knowledge', async () => {
  knowledge = await loadKnowledge();
  return { from: knowledge.from, rulesVersion: knowledge.rulesVersion, cores: knowledge.index.files.length };
});
ipcMain.handle('analyze', async (_e, url) => analyzeProject(url, await ensureKnowledge()));
ipcMain.handle('checkWorkplace', async (_e, state, url) => checkWorkplace(state, url, await ensureKnowledge()));
ipcMain.handle('buildNewCore', async (_e, state, work) => buildNewCore(state, work, await ensureKnowledge()));
ipcMain.handle('applyUpdate', async (_e, state, work) => applyUpdate(state, work, await ensureKnowledge()));
ipcMain.handle('screens', async (_e, items) => screenshots(items));
ipcMain.handle('tokenStatus', async () => ({ on: fs.existsSync(tokenFile()), who: tokenWho }));
ipcMain.handle('tokenSave', async (_e, token) => {
  token = String(token || '').trim();
  const who = await restCheck(token);   // 맞지 않으면 여기서 오류 → 저장하지 않음
  if (!safeStorage.isEncryptionAvailable()) throw new Error('이 맥에서 암호화 저장을 쓸 수 없어요');
  fs.writeFileSync(tokenFile(), safeStorage.encryptString(token), { mode: 0o600 });
  setRestToken(token); tokenWho = who; return { on: true, who };
});
ipcMain.handle('tokenClear', async () => { try { fs.unlinkSync(tokenFile()); } catch (e) {} setRestToken(null); tokenWho = null; return { on: false }; });
ipcMain.handle('open', (_e, url) => { if (/^https:\/\/(www\.)?figma\.com\//.test(url)) shell.openExternal(url); });

app.whenReady().then(() => { loadToken(); createWindow(); });
app.on('window-all-closed', () => app.quit());
