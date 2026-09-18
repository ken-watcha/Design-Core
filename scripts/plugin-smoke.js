#!/usr/bin/env node
// 플러그인 코드 스모크 테스트 — Figma 없이 돌려 볼 수 있는 만큼만 확인한다 (푸시 전에 실행).
//  1) boot.js / code.js / boot.html·ui.html 의 <script> 가 문법적으로 파싱되는가
//  2) boot.js 가 하는 것과 같은 방식(AsyncFunction)으로 code.js 를 가짜 figma 객체 위에서 실행했을 때
//     최상위 코드가 예외 없이 지나가는가 (showUI 호출, onmessage 등록까지)
//  3) manifest.json 이 main/ui 로 가리키는 파일이 있고 currentuser 권한이 있는가
// 사용법: node scripts/plugin-smoke.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const P = (...a) => path.join(__dirname, '..', 'plugin', ...a);
const read = (f) => fs.readFileSync(P(f), 'utf8');
let fail = 0;
const ok = (m) => console.log('  ok  ' + m);
const bad = (m) => { fail++; console.log('  FAIL ' + m); };

// 3) manifest
const man = JSON.parse(read('manifest.json'));
for (const k of ['main', 'ui']) fs.existsSync(P(man[k])) ? ok(`manifest.${k} → ${man[k]} 있음`) : bad(`manifest.${k} → ${man[k]} 없음`);
(man.permissions || []).includes('currentuser') ? ok('permissions: currentuser') : bad('permissions 에 currentuser 없음 (figma.currentUser 사용)');
(man.networkAccess && man.networkAccess.allowedDomains || []).some(d => d.includes('raw.githubusercontent.com')) ? ok('networkAccess: raw.githubusercontent.com') : bad('networkAccess 에 raw.githubusercontent.com 없음');

// 1) 문법
const scriptOf = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
for (const [name, src] of [['boot.js', read('boot.js')], ['code.js', read('code.js')], ['boot.html <script>', scriptOf(read('boot.html'))], ['ui.html <script>', scriptOf(read('ui.html'))]]) {
  try { new vm.Script(src, { filename: name }); ok(`${name} 파싱`); } catch (e) { bad(`${name} 파싱 실패: ${e.message}`); }
}

// 2) 가짜 figma 위에서 code.js 최상위 실행
const calls = [];
const figma = {
  showUI: (html, opts) => calls.push(['showUI', typeof html, opts]),
  ui: { postMessage: (m) => calls.push(['post', m && m.type]), onmessage: null },
  root: { children: [], getSharedPluginData: () => '', setSharedPluginData: () => {} },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => {} },
  currentUser: { name: 'ken', id: '0' },
  currentPage: { children: [] },
  loadFontAsync: async () => {}, getNodeByIdAsync: async () => null, closePlugin: () => {},
  on: () => {}, notify: () => {}, viewport: {},
};
const ctx = vm.createContext({ figma, __html__: '<html></html>', console, setTimeout, clearTimeout, JSON, Math, Date, Object, Array, String, Number, RegExp, Promise, Error });
ctx.globalThis = ctx;
try {
  const boot = read('boot.js');
  vm.runInContext(boot, ctx, { filename: 'boot.js' });
  if (typeof figma.ui.onmessage !== 'function') throw new Error('boot.js 가 figma.ui.onmessage 를 등록하지 않음');
  ok('boot.js 최상위 실행 (showUI + onmessage 등록)');
  // boot.html 이 보내는 것과 같은 메시지
  figma.ui.onmessage({ type: 'boot', code: read('code.js'), ui: read('ui.html'), source: 'local-smoke' });
  setTimeout(() => {
    const errs = calls.filter(c => c[0] === 'post' && c[1] === 'boot-error');
    if (errs.length) bad('code.js 실행 중 boot-error 발생');
    const shows = calls.filter(c => c[0] === 'showUI');
    shows.length >= 2 ? ok(`code.js 가 진짜 UI 를 띄움 (showUI ${shows.length}회)`) : bad('code.js 가 showUI 를 다시 호출하지 않음 (__CORE_UI__ 미사용?)');
    typeof figma.ui.onmessage === 'function' ? ok('code.js 가 onmessage 를 넘겨받음') : bad('code.js 실행 후 onmessage 없음');
    console.log(fail ? `\n${fail}건 실패` : '\n모두 통과');
    process.exit(fail ? 1 : 0);
  }, 300);
} catch (e) {
  bad('실행 실패: ' + (e.stack || e)); console.log(`\n${fail}건 실패`); process.exit(1);
}
