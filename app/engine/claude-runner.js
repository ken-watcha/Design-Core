// 디자이너 노트북에 설치된 Claude Code(각자 로그인한 계정)를 불러 Figma 연결로 코드를 실행한다.
// 앱 자체 로그인은 없다. Figma가 쓰기를 허가한 연결이 Claude Code라서, 읽기·쓰기 모두 이 길로 간다.
// 판단(분석·판별)은 앱의 규칙 코드가 하고, Claude는 Figma에 코드를 그대로 전달만 한다.
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const MCP_CONFIG = path.join(__dirname, '..', 'mcp.json');
const TOOLS = { useFigma: 'mcp__figma__use_figma', whoami: 'mcp__figma__whoami', shot: 'mcp__figma__get_screenshot' };

// macOS 앱은 셸 PATH를 못 받는다 → 흔한 설치 위치를 더한다
function envWithPath() {
  const extra = ['/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local/bin'), path.join(os.homedir(), '.claude/local')];
  return Object.assign({}, process.env, { PATH: [process.env.PATH || '', ...extra].join(':') });
}

function runClaude(args, input, opts = {}) {
  const timeoutMs = opts.timeoutMs || 300000;
  return new Promise((resolve, reject) => {
    const p = spawn('claude', args, { env: envWithPath(), cwd: os.tmpdir() });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error('시간 초과 (' + Math.round(timeoutMs / 1000) + '초)')); }, timeoutMs);
    let buf = '';
    p.stdout.on('data', (d) => { out += d; if (opts.onLine) { buf += d; const lines = buf.split('\n'); buf = lines.pop(); lines.forEach(opts.onLine); } });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(timer); reject(e.code === 'ENOENT' ? new Error('Claude Code가 설치돼 있지 않습니다') : e); });
    p.on('close', (code) => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error((err || out).trim().slice(-600) || ('claude 종료 코드 ' + code))); });
    p.stdin.end(input || '');
  });
}

// 응답 글 안에서 JSON 덩어리를 꺼낸다
function extractJson(text) {
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text); if (fence) text = fence[1];
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('결과에서 JSON을 찾지 못했습니다: ' + text.slice(0, 200));
  return JSON.parse(text.slice(a, b + 1));
}

// 진행 단계 알림 (2026-10-12 윤우: 얼마나 남았는지 보여 달라). 앱 창이 받아 진행 막대를 움직인다.
let progressSink = null;
function setProgressSink(fn) { progressSink = fn; }

async function ask(prompt, tools, opts = {}) {
  const model = opts.model ? ['--model', opts.model] : [];
  const say = (stage) => { if (progressSink && opts.label) try { progressSink({ label: opts.label, stage }); } catch (e) {} };
  say('start');
  let lastTool = null;
  // stream-json으로 받으면 Claude가 Figma 도구를 부르는 순간·끝나는 순간을 알 수 있다
  let raw;
  try { raw = await runClaude(['-p', '--output-format', 'stream-json', '--verbose', ...model, '--mcp-config', MCP_CONFIG, '--strict-mcp-config', '--allowedTools', ...tools], prompt, Object.assign({}, opts, {
    onLine: (line) => {
      let ev; try { ev = JSON.parse(line); } catch (e) { return; }
      const content = (ev.message && ev.message.content) || [];
      if (ev.type === 'assistant' && content.some(c => c.type === 'tool_use')) say('figma');
      else if (ev.type === 'user' && content.some(c => c.type === 'tool_result')) {
        say('wrap');
        const tr = content.find(c => c.type === 'tool_result');
        const t = typeof tr.content === 'string' ? tr.content : (tr.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
        lastTool = { text: t, isError: !!tr.is_error };
      }
    }
  })); } catch (e) { if (lastTool) e.afterTool = true; throw e; }
  try {
    const env = raw.trim().split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(e => e && e.type === 'result').pop();
    if (!env) throw new Error('Claude 결과를 읽지 못했습니다: ' + raw.slice(-300));
    say('done');
    if (env.is_error) throw new Error(env.result || 'Claude 실행 오류');
    // 도구 결과를 직접 읽는다 — Claude가 결과를 다시 받아 적게 하면 그만큼(수십 초) 더 걸린다 (2026-10-12 윤우: 문서 읽기가 느림)
    if (opts.toolResult && lastTool) {
      if (lastTool.isError) throw new Error('Figma: ' + lastTool.text.slice(0, 500));
      let d = null;
      try { d = JSON.parse(lastTool.text); } catch (e) { try { d = extractJson(lastTool.text); } catch (e2) {} }
      if (d && d.error) throw new Error('Figma: ' + d.error);
      if (d) return { data: d, costUsd: env.total_cost_usd || null };
      throw new Error('Figma 결과를 읽지 못했습니다: ' + lastTool.text.slice(0, 300));
    }
    const data = extractJson(env.result || '');
    if (data && data.error) throw new Error('Figma: ' + data.error);
    return { data, costUsd: env.total_cost_usd || null };
  } catch (e) { if (lastTool) e.afterTool = true; throw e; }
}

// Figma에서 플러그인 API 코드 1회 실행
// 줄 전체가 주석인 줄은 빼고 보낸다 — Claude가 코드를 그대로 옮겨 적는 시간이 줄어든다
const slim = (code) => code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
async function runFigma(fileKey, code, description, opts) {
  const prompt = [
    `Call the ${TOOLS.useFigma} tool exactly once with:`,
    `- fileKey: ${fileKey}`,
    `- description: ${description}`,
    `- skillNames: figma-use`,
    `- code: the exact contents between <code> and </code> below, unchanged.`,
    `Then reply with ONLY the word OK (the app reads the tool result itself). If the tool errors, reply with {"error": "<message>"}.`,
    '<code>', slim(code), '</code>'
  ].join('\n');
  const o = Object.assign({ label: description, toolResult: true }, opts);
  // 코드를 옮겨 적기만 하면 되니 빠른 모델(sonnet)로, 안 되면 기본 모델로
  try { return await ask(prompt, [TOOLS.useFigma], Object.assign({ model: 'sonnet' }, o)); }
  // Figma가 이미 실행됐으면 다시 돌리지 않는다 (쓰기가 두 번 되지 않게)
  catch (e) { if (e.afterTool || /^Figma:/.test(e.message)) throw e; return ask(prompt, [TOOLS.useFigma], o); }
}

// 준비 상태: Claude Code 설치·로그인 + Figma 연결. whoami 한 번으로 둘 다 확인된다
async function checkSetup() {
  try { await runClaude(['--version'], null, { timeoutMs: 20000 }); }
  catch (e) { return { claude: false, figma: false, installed: false, detail: e.message }; }
  try {
    const { data } = await ask(`Call the ${TOOLS.whoami} tool once and reply with ONLY {"handle": "<handle>", "email": "<email>"} from its result. If it fails, reply {"error": "<message>"}.`, [TOOLS.whoami], { timeoutMs: 120000 });
    return { claude: true, figma: true, who: data };
  } catch (e) {
    const notLoggedIn = /log ?in|auth|credential|api key/i.test(e.message) && !/figma/i.test(e.message);
    return { claude: !notLoggedIn, figma: false, installed: true, detail: e.message };
  }
}

// 화면 비교용 그림: get_screenshot은 짧게 사는 그림 주소를 준다(2026-10-12 확인, 로그인 없이 받힘).
// 주소만 돌려받아 앱이 바로 내려받는다 — 그림 자체를 Claude가 옮기지 않아 빠르고 싸다.
// 프레임 하나만 그린다. 길쭉한 화면도 글자가 보이게, 폭 기준 2배(최대 폭 1600)로 받는다.
const shotSize = (it) => it.w && it.h ? Math.min(8000, Math.round(Math.max(it.w, it.h) * Math.min(2, 1600 / it.w))) : 1600;
// Figma 개인 액세스 토큰이 있으면 Claude를 거치지 않고 Figma 이미지 API로 바로 받는다 (2026-10-12 윤우: 더 빠르게).
// 토큰은 main.js가 맥 키체인 암호화(safeStorage)로 보관해 넘겨준다. 없거나 실패하면 Claude 방식으로.
let restToken = null, restError = null;
function setRestToken(t) { restToken = t || null; }
async function restCheck(token) {
  const r = await fetch('https://api.figma.com/v1/me', { headers: { 'X-Figma-Token': token } });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 401 ? '토큰이 맞지 않아요 (' + r.status + ')' : 'Figma 응답 ' + r.status);
  const me = await r.json(); return { handle: me.handle, email: me.email };
}
const toDataUrl = async (u) => {
  // Figma 그림 주소만 받는다 (MCP는 figma.com, 이미지 API는 figma-alpha-api S3)
  if (!u || !/^https:\/\/(([a-z0-9-]+\.)*figma\.com|figma-alpha-api\.s3\.[a-z0-9-]+\.amazonaws\.com)\//.test(u)) return null;
  try { const r = await fetch(u); if (!r.ok) return null; return 'data:image/png;base64,' + Buffer.from(await r.arrayBuffer()).toString('base64'); } catch (e) { return null; }
};
async function restShots(items) {
  // 같은 파일·같은 배율끼리 한 번에 요청
  const groups = new Map();
  items.forEach((it, i) => {
    const scale = it.w ? Math.max(0.05, Math.min(2, Math.round(shotSize(it) / Math.max(it.w, it.h) * 100) / 100)) : 1;
    const k = it.fileKey + '|' + scale; if (!groups.has(k)) groups.set(k, { fileKey: it.fileKey, scale, list: [] });
    groups.get(k).list.push(i);
  });
  const images = new Array(items.length).fill(null);
  await Promise.all([...groups.values()].map(async (g) => {
    const ids = g.list.map(i => items[i].nodeId).join(',');
    const r = await fetch(`https://api.figma.com/v1/images/${encodeURIComponent(g.fileKey)}?ids=${encodeURIComponent(ids)}&format=png&scale=${g.scale}`, { headers: { 'X-Figma-Token': restToken } });
    if (!r.ok) {
      // 왜 못 받았는지 남겨 앱 화면에 보여 준다 (2026-10-12 윤우: 토큰 연결해도 느림 — 원인 확인용)
      let why = ''; try { const b = await r.json(); why = b.err || b.message || ''; } catch (e) {}
      const ra = r.headers.get('retry-after'), tier = r.headers.get('x-figma-rate-limit-type');
      restError = `Figma ${r.status}${why ? ' · ' + why : ''}${ra ? ' · ' + ra + '초 뒤 다시' : ''}${tier ? ' · ' + tier : ''}`;
      return;
    }
    const body = await r.json(); const map = body.images || {};
    if (body.err) restError = 'Figma · ' + body.err;
    await Promise.all(g.list.map(async (i) => { images[i] = await toDataUrl(map[items[i].nodeId]); }));
  }));
  return images;
}

async function screenshots(items) {
  if (restToken) {
    let images = null; restError = null;
    try { images = await restShots(items); } catch (e) { images = null; restError = '연결 오류 · ' + e.message; }
    const missing = images ? items.map((_, i) => i).filter(i => !images[i]) : items.map((_, i) => i);
    if (!missing.length) return { images, costUsd: 0, via: 'token' };
    if (!restError) restError = `그림 ${missing.length}장을 못 받음`;
    console.warn('[그림] 토큰으로 못 받아 Claude로:', restError);
    // 못 받은 것만 Claude로
    const rest = await claudeShots(missing.map(i => items[i]));
    const out = images || new Array(items.length).fill(null);
    missing.forEach((i, j) => { out[i] = rest.images[j]; });
    return { images: out, costUsd: rest.costUsd, via: 'claude', restError };
  }
  return Object.assign(await claudeShots(items), { via: 'claude' });
}

async function claudeShots(items) {
  const prompt = [
    `Call the ${TOOLS.shot} tool once for each item below with the given maxDimension (do not set enableBase64Response). Make all the calls at once, in parallel, in a single message.`,
    ...items.map((it, i) => `${i + 1}. fileKey: ${it.fileKey}, nodeId: ${it.nodeId}, maxDimension: ${shotSize(it)}`),
    `Then reply with ONLY {"urls": ["<image_url of item 1>", ...]} in the same order. Use null for an item whose call failed.`
  ].join('\n');
  // 그림 주소 받기는 판단이 필요 없어 빠른 모델로 (2026-10-12 윤우: 너무 오래 걸림). 그 모델을 못 쓰면 기본 모델로 다시.
  let res;
  try { res = await ask(prompt, [TOOLS.shot], { timeoutMs: 180000, model: 'haiku' }); }
  catch (e) { res = await ask(prompt, [TOOLS.shot], { timeoutMs: 180000 }); }
  const { data, costUsd } = res;
  const urls = data.urls || [];
  const images = await Promise.all(items.map(async (_, i) => {
    const u = urls[i];
    return toDataUrl(u);
  }));
  return { images, costUsd };
}

module.exports = { runFigma, checkSetup, extractJson, screenshots, setProgressSink, setRestToken, restCheck };
