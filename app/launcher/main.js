// Core 업데이트 실행용 껍데기 앱 (맥 .app 안에 들어가는 코드).
// 두 가지 방식:
//  - 배포판(기본, 2026-10-13~): 저장소 없이 설치. 켤 때 GitHub main의 최신 코드(app·plugin·core-index)를 받아
//    ~/Library/Application Support/Core 업데이트/code/<커밋>/ 에 두고 실행한다. 못 받으면 지난번 코드, 그것도 없으면 앱에 든 사본.
//  - 개발판: config.json에 repoDir가 있으면 그 저장소 폴더를 main으로 앞으로 감은 뒤 실행 (scripts/build-mac-app.sh 기본값).
const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const REPO = 'ken-watcha/Design-Core';
let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch (e) {}
const env = Object.assign({}, process.env, { PATH: [process.env.PATH || '', '/usr/bin', '/opt/homebrew/bin', '/usr/local/bin'].join(':') });

function fail(msg) { app.whenReady().then(() => { dialog.showErrorBox('Core 업데이트', msg); app.quit(); }); }

// ---------- 개발판: 저장소 폴더에서 실행 ----------
function fromRepo(repo) {
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { env, encoding: 'utf8', timeout: 20000 }).trim();
  // 최신 받기: main 브랜치이고 고친 파일이 없을 때만 앞으로 감기. 인터넷이 없거나 실패하면 있는 그대로 켠다.
  try {
    // npm이 버전에 따라 고쳐 쓰는 잠금 파일만 바뀐 거면 되돌리고 받는다 (2026-10-27 윤우 맥: package-lock.json 하나 때문에 11커밋 뒤처짐)
    const changed = git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean);
    if (changed.length && changed.every(f => /(^|\/)package-lock\.json$/.test(f))) git('checkout', '--', ...changed);
    if (git('rev-parse', '--abbrev-ref', 'HEAD') === 'main' && !git('status', '--porcelain', '--untracked-files=no')) {
      git('pull', '--ff-only', '--quiet', 'origin', 'main');
    }
  } catch (e) { console.error('최신 받기 실패, 있는 버전으로 실행:', e.message); }
  return path.join(repo, 'app', 'main.js');
}

// ---------- 배포판: GitHub에서 최신 코드 받기 ----------
const withTimeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms).unref(); return c.signal; };
async function latestCode() {
  const base = path.join(app.getPath('userData'), 'code');
  fs.mkdirSync(base, { recursive: true });
  const curFile = path.join(base, 'current.json');
  let current = null; try { current = JSON.parse(fs.readFileSync(curFile, 'utf8')).sha; } catch (e) {}
  const ready = (sha) => sha && fs.existsSync(path.join(base, sha, 'app', 'main.js'));
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/commits/main`, { headers: { Accept: 'application/vnd.github.sha' }, signal: withTimeout(6000) });
    const sha = r.ok ? (await r.text()).trim() : null;
    if (sha && /^[0-9a-f]{40}$/.test(sha) && !ready(sha)) {
      const tgz = path.join(os.tmpdir(), `core-update-${sha}.tar.gz`);
      const t = await fetch(`https://codeload.github.com/${REPO}/tar.gz/${sha}`, { signal: withTimeout(60000) });
      if (!t.ok) throw new Error('코드 받기 ' + t.status);
      fs.writeFileSync(tgz, Buffer.from(await t.arrayBuffer()));
      const tmp = path.join(base, sha + '.tmp'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
      const top = `${REPO.split('/')[1]}-${sha}`;
      execFileSync('tar', ['-xzf', tgz, '-C', tmp, '--strip-components=1', `${top}/app`, `${top}/plugin`, `${top}/core-index`], { env, timeout: 60000 });
      fs.rmSync(tgz, { force: true });
      if (!fs.existsSync(path.join(tmp, 'app', 'main.js'))) throw new Error('받은 코드에 app/main.js가 없음');
      fs.renameSync(tmp, path.join(base, sha));
    }
    if (ready(sha)) {
      // 지난 버전 하나만 남기고 정리
      for (const d of fs.readdirSync(base)) if (/^[0-9a-f]{40}(\.tmp)?$/.test(d) && d !== sha && d !== current) fs.rmSync(path.join(base, d), { recursive: true, force: true });
      fs.writeFileSync(curFile, JSON.stringify({ sha, at: new Date().toISOString() }));
      return path.join(base, sha, 'app', 'main.js');
    }
  } catch (e) { console.error('최신 코드 받기 실패, 지난 코드로 실행:', e.message); }
  if (ready(current)) return path.join(base, current, 'app', 'main.js');
  return path.join(__dirname, 'bundled', 'app', 'main.js');   // 처음 켰는데 인터넷이 없을 때
}

(async () => {
  const entry = cfg.repoDir ? fromRepo(cfg.repoDir) : await latestCode();
  if (!fs.existsSync(entry)) return fail(`앱 코드를 찾지 못했습니다:\n${entry}\n\n인터넷 연결을 확인하고 다시 열어 주세요.`);
  require(entry);
})();
