// Core 색인 합치기: GitHub main 색인 + 앱 사본에만 있는 Core + 이 노트북에서 앱이 만든 Core(로컬 추가분).
// 앱이 새 Core를 만들면 로컬 추가분에 적어 두어, main에 올라가기 전에도 다음 판별부터 "기존 Core"로 잡히게 한다.
const fs = require('fs');
const path = require('path');
const os = require('os');

const localFile = () => path.join(os.homedir(), '.core-helper', 'index-local.json');

function readLocal(file = localFile()) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')).files || []; } catch (e) { return []; }
}

function mergeIndex(main, copy, local) {
  const files = [...((main && main.files) || [])];
  const keys = new Set(files.map(f => f.key));
  const added = [];
  for (const f of [...((copy && copy.files) || []), ...(local || [])]) {
    if (f && f.key && !keys.has(f.key)) { files.push(f); keys.add(f.key); added.push(f.name); }
  }
  return { index: Object.assign({}, main || copy, { files }), added };
}

// Core 읽기 결과(figma-core-read)로 색인 항목을 만든다
function entryFromCoreRead(read, name, extra = {}) {
  const screens = {};
  for (const pf in read.platforms || {}) screens[pf] = read.platforms[pf].screens.map(s => ({ id: s.id, name: s.name, size: `${s.w}x${s.h}`, size_label: s.cls }));
  return Object.assign({
    name, key: read.fileKey, url: `https://www.figma.com/design/${read.fileKey}/`, format: 'new',
    domain: [name.replace(/^\[Core\]\s*/, '')],
    pages: (read.pages || []).map(n => ({ name: n })),
    master: { page: read.masterPageId, root_section: read.root, link_card: read.linkCard ? { id: read.linkCard.id, name: read.linkCard.name } : null, screens }
  }, extra);
}

function addLocal(entry, file = localFile()) {
  const files = readLocal(file).filter(f => f.key !== entry.key);
  files.push(entry);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ files }, null, 1));
}

module.exports = { mergeIndex, entryFromCoreRead, addLocal, readLocal, localFile };
