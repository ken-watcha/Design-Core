#!/bin/bash
# Core 업데이트 앱 설치 (맥, 처음 한 번). Finder에서 이 파일을 더블클릭하면 터미널에서 실행된다.
# 하는 일: main으로 맞추기 → Claude Code·Node 확인 → Claude 로그인·Figma 연결 확인(안 돼 있으면 안내) → 앱 만들기 → 앱 열기
# 사람이 직접 하는 건 브라우저 로그인뿐이다. 이미 된 단계는 건너뛴다. 여러 번 실행해도 된다.
# (2026-10-13 윤우: 새 노트북 설치 과정을 팀원이 똑같이 겪지 않게)
set -u
cd "$(dirname "$0")"
REPO="$(pwd)"
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$1"; }
stop() { printf '\n\033[31m%s\033[0m\n' "$1"; printf '\n이 창은 닫아도 돼요. 해결한 뒤 설치하기를 다시 더블클릭하세요.\n'; read -r -p "엔터를 누르면 닫혀요 " _; exit 1; }

say "1/5 최신 버전(main)으로 맞추는 중"
if ! git -C "$REPO" fetch -q origin main; then stop "GitHub에서 받지 못했어요. 인터넷과 GitHub Desktop 로그인을 확인해 주세요."; fi
if [ -n "$(git -C "$REPO" status --porcelain --untracked-files=no)" ]; then
  stop "이 폴더에 고친 파일이 있어서 자동으로 바꾸지 않았어요. GitHub Desktop에서 변경을 버리거나(Discard) Ken에게 물어봐 주세요."
fi
git -C "$REPO" checkout -q main 2>/dev/null || git -C "$REPO" checkout -q -b main origin/main || stop "main으로 바꾸지 못했어요."
git -C "$REPO" pull -q --ff-only origin main || stop "최신 main을 받지 못했어요."
ok "main ($(git -C "$REPO" log -1 --format=%cd --date=format:%Y-%m-%d))"

say "2/5 필요한 프로그램 확인"
if command -v node >/dev/null 2>&1; then ok "Node $(node -v)"; else
  bad "Node.js가 없어요"; open "https://nodejs.org/ko/download"; stop "열린 페이지에서 Node.js(LTS)를 설치한 뒤 다시 실행해 주세요."
fi
if command -v claude >/dev/null 2>&1; then ok "Claude Code $(claude --version 2>/dev/null | head -1)"; else
  say "  Claude Code 설치 중"
  curl -fsSL https://claude.ai/install.sh | bash || stop "Claude Code 설치에 실패했어요."
  export PATH="$HOME/.local/bin:$PATH"
  command -v claude >/dev/null 2>&1 || stop "Claude Code를 설치했지만 찾지 못했어요. 터미널을 새로 열고 다시 실행해 주세요."
  ok "Claude Code 설치됨"
fi

say "3/5 Claude 로그인 · Figma 연결 확인 (10초쯤)"
cd "$REPO/app"
check() { claude -p --mcp-config mcp.json --strict-mcp-config --allowedTools mcp__figma__whoami --output-format text \
  'Call the mcp__figma__whoami tool once. Reply with ONLY "FIGMA_OK <handle>" if it worked, otherwise ONLY "FIGMA_FAIL".' 2>&1 | tail -3; }
OUT="$(check)"
if echo "$OUT" | grep -q "FIGMA_OK"; then ok "로그인·Figma 연결 됨 ($(echo "$OUT" | grep -o 'FIGMA_OK.*' | cut -d' ' -f2-))"; else
  bad "아직 로그인이나 Figma 연결이 필요해요"
  cat <<'EOF'

  잠시 뒤 Claude 채팅이 열려요. 아래 순서대로 해 주세요.
    ① "Please run /login" 같은 말이 보이면 → /login 입력 → 브라우저에서 회사 계정으로 로그인
    ② /mcp 입력 → 목록에서 figma 선택 → Authenticate → 브라우저에서 허용
    ③ "Connected to figma"가 보이면 Ctrl+C 를 두 번 눌러 나오기 (설치가 이어서 진행돼요)

EOF
  read -r -p "  준비됐으면 엔터 " _
  claude --mcp-config mcp.json
  OUT="$(check)"
  if echo "$OUT" | grep -q "FIGMA_OK"; then ok "로그인·Figma 연결 됨"; else
    bad "아직 확인이 안 돼요: $(echo "$OUT" | tail -1)"
    stop "로그인(/login)과 Figma 연결(/mcp → figma → Authenticate)을 다시 해 주세요."
  fi
fi

say "4/5 앱 만드는 중 (처음엔 몇 분 걸려요)"
npm install --no-fund --no-audit --loglevel=error || stop "npm install에 실패했어요. 화면을 캡처해서 공유해 주세요."
bash scripts/build-mac-app.sh || stop "앱 만들기에 실패했어요. 화면을 캡처해서 공유해 주세요."

say "5/5 앱 여는 중"
open "$HOME/Desktop/Core 업데이트.app" && ok "바탕화면의 Core 업데이트를 열었어요"
cat <<'EOF'

  마지막 한 가지: 앱 오른쪽 위 [피그마 토큰 연결 필요]를 눌러 토큰을 붙여 넣으세요.
  (Figma → Settings → Security → Personal access tokens, 권한은 File content: Read only)

  다음부터는 바탕화면의 Core 업데이트만 열면 돼요. 켤 때마다 최신으로 바뀌어요.
EOF
read -r -p "엔터를 누르면 닫혀요 " _
