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
  // stream-json으로 받으면 Claude가 Figma 도구를 부르는 순간·끝나는 순간을 알 수 있다
  const raw = await runClaude(['-p', '--output-format', 'stream-json', '--verbose', ...model, '--mcp-config', MCP_CONFIG, '--strict-mcp-config', '--allowedTools', ...tools], prompt, Object.assign({}, opts, {
    onLine: (line) => {
      let ev; try { ev = JSON.parse(line); } catch (e) { return; }
      const content = (ev.message && ev.message.content) || [];
      if (ev.type === 'assistant' && content.some(c => c.type === 'tool_use')) say('figma');
      else if (ev.type === 'user' && content.some(c => c.type === 'tool_result')) say('wrap');
    }
  }));
  const env = raw.trim().split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(e => e && e.type === 'result').pop();
  if (!env) throw new Error('Claude 결과를 읽지 못했습니다: ' + raw.slice(-300));
  say('done');
  if (env.is_error) throw new Error(env.result || 'Claude 실행 오류');
  const data = extractJson(env.result || '');
  if (data && data.error) throw new Error('Figma: ' + data.error);
  return { data, costUsd: env.total_cost_usd || null };
}

// Figma에서 플러그인 API 코드 1회 실행
function runFigma(fileKey, code, description, opts) {
  return ask([
    `Call the ${TOOLS.useFigma} tool exactly once with:`,
    `- fileKey: ${fileKey}`,
    `- description: ${description}`,
    `- skillNames: figma-use`,
    `- code: the exact contents between <code> and </code> below, unchanged.`,
    `Then reply with ONLY the tool's raw result (JSON), nothing else. If the tool errors, reply with {"error": "<message>"}.`,
    '<code>', code, '</code>'
  ].join('\n'), [TOOLS.useFigma], Object.assign({ label: description }, opts));
}

// 준비 상태: Claude Code 설치·로그인 + Figma 연결. whoami 한 번으로 둘 다 확인된다
async function checkSetup() {
  try { await runClaude(['--version'], null, { timeoutMs: 20000 }); }
  catch (e) { return { claude: false, figma: false, detail: e.message }; }
  try {
    const { data } = await ask(`Call the ${TOOLS.whoami} tool once and reply with ONLY {"handle": "<handle>", "email": "<email>"} from its result. If it fails, reply {"error": "<message>"}.`, [TOOLS.whoami], { timeoutMs: 120000 });
    return { claude: true, figma: true, who: data };
  } catch (e) {
    const notLoggedIn = /log ?in|auth|credential|api key/i.test(e.message) && !/figma/i.test(e.message);
    return { claude: !notLoggedIn, figma: false, detail: e.message };
  }
}

// 화면 비교용 그림: get_screenshot은 짧게 사는 그림 주소를 준다(2026-10-12 확인, 로그인 없이 받힘).
// 주소만 돌려받아 앱이 바로 내려받는다 — 그림 자체를 Claude가 옮기지 않아 빠르고 싸다.
// 프레임 하나만 그린다. 길쭉한 화면도 글자가 보이게, 폭 기준 2배(최대 폭 1600)로 받는다.
const shotSize = (it) => it.w && it.h ? Math.min(8000, Math.round(Math.max(it.w, it.h) * Math.min(2, 1600 / it.w))) : 1600;
async function screenshots(items) {
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
    if (!u || !/^https:\/\/([a-z0-9-]+\.)*figma\.com\//.test(u)) return null;
    try { const r = await fetch(u); if (!r.ok) return null; return 'data:image/png;base64,' + Buffer.from(await r.arrayBuffer()).toString('base64'); } catch (e) { return null; }
  }));
  return { images, costUsd };
}

module.exports = { runFigma, checkSetup, extractJson, screenshots, setProgressSink };
