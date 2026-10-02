// 디자이너 노트북에 설치된 Claude Code(각자 로그인한 계정)를 불러 Figma 연결로 코드를 실행한다.
// 앱 자체 로그인은 없다. Figma가 쓰기를 허가한 연결이 Claude Code라서, 읽기·쓰기 모두 이 길로 간다.
// 판단(분석·판별)은 앱의 규칙 코드가 하고, Claude는 Figma에 코드를 그대로 전달만 한다.
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const MCP_CONFIG = path.join(__dirname, '..', 'mcp.json');
const TOOLS = { useFigma: 'mcp__figma__use_figma', whoami: 'mcp__figma__whoami' };

// macOS 앱은 셸 PATH를 못 받는다 → 흔한 설치 위치를 더한다
function envWithPath() {
  const extra = ['/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local/bin'), path.join(os.homedir(), '.claude/local')];
  return Object.assign({}, process.env, { PATH: [process.env.PATH || '', ...extra].join(':') });
}

function runClaude(args, input, { timeoutMs = 300000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('claude', args, { env: envWithPath(), cwd: os.tmpdir() });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error('시간 초과 (' + Math.round(timeoutMs / 1000) + '초)')); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; });
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

async function ask(prompt, tools, opts) {
  const raw = await runClaude(['-p', '--output-format', 'json', '--mcp-config', MCP_CONFIG, '--strict-mcp-config', '--allowedTools', ...tools], prompt, opts);
  const env = JSON.parse(raw);
  if (env.is_error) throw new Error(env.result || 'Claude 실행 오류');
  const data = extractJson(env.result || '');
  if (data && data.error) throw new Error('Figma: ' + data.error);
  return { data, costUsd: env.total_cost_usd || null };
}

// Figma에서 플러그인 API 코드 1회 실행
function runFigma(fileKey, code, description) {
  return ask([
    `Call the ${TOOLS.useFigma} tool exactly once with:`,
    `- fileKey: ${fileKey}`,
    `- description: ${description}`,
    `- skillNames: figma-use`,
    `- code: the exact contents between <code> and </code> below, unchanged.`,
    `Then reply with ONLY the tool's raw result (JSON), nothing else. If the tool errors, reply with {"error": "<message>"}.`,
    '<code>', code, '</code>'
  ].join('\n'), [TOOLS.useFigma]);
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

module.exports = { runFigma, checkSetup, extractJson };
