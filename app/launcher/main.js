// Core 업데이트 실행용 껍데기 앱 (맥 .app 안에 들어가는 코드).
// 앱 코드는 .app에 넣지 않고 저장소 폴더에서 읽는다 → 켤 때마다 main을 받아 최신으로 실행, 다시 포장할 필요 없음.
// 저장소 위치는 포장할 때 scripts/build-mac-app.sh가 config.json에 적는다.
const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const repo = cfg.repoDir;
const entry = path.join(repo, 'app', 'main.js');
const env = Object.assign({}, process.env, { PATH: [process.env.PATH || '', '/usr/bin', '/opt/homebrew/bin', '/usr/local/bin'].join(':') });
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { env, encoding: 'utf8', timeout: 20000 }).trim();

// 최신 받기: main 브랜치이고 고친 파일이 없을 때만 앞으로 감기. 인터넷이 없거나 실패하면 있는 그대로 켠다.
try {
  if (git('rev-parse', '--abbrev-ref', 'HEAD') === 'main' && !git('status', '--porcelain', '--untracked-files=no')) {
    git('pull', '--ff-only', '--quiet', 'origin', 'main');
  }
} catch (e) { console.error('최신 받기 실패, 있는 버전으로 실행:', e.message); }

if (!fs.existsSync(entry)) {
  app.whenReady().then(() => { dialog.showErrorBox('Core 업데이트', `앱 코드를 찾지 못했습니다:\n${entry}\n\nDesign-Core 폴더를 옮겼다면 scripts/build-mac-app.sh를 다시 실행해 주세요.`); app.quit(); });
} else {
  require(entry);
}
