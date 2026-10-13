#!/bin/bash
# Core 업데이트 앱 설치 (맥). 터미널에 한 줄:
#   curl -fsSL https://raw.githubusercontent.com/ken-watcha/Design-Core/main/install.sh | bash
# 응용 프로그램 폴더에 앱을 넣고 연다. Claude 로그인·Figma 연결은 앱이 처음 켤 때 안내한다.
set -euo pipefail
ARCH="$(uname -m)"; [ "$ARCH" = "x86_64" ] && ARCH="x64"
URL="https://github.com/ken-watcha/Design-Core/releases/download/mac-latest/Core-Update-mac-$ARCH.zip"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "Core 업데이트 받는 중 ($ARCH)…"
curl -fL --progress-bar "$URL" -o "$TMP/app.zip"
ditto -x -k "$TMP/app.zip" "$TMP/out"
DEST="/Applications"; [ -w "$DEST" ] || DEST="$HOME/Applications"; mkdir -p "$DEST"
rm -rf "$DEST/Core 업데이트.app"
mv "$TMP/out/Core 업데이트.app" "$DEST/"
xattr -cr "$DEST/Core 업데이트.app" 2>/dev/null || true
echo "설치됨: $DEST/Core 업데이트.app"
open "$DEST/Core 업데이트.app"
