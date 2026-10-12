#!/bin/bash
# 맥에서 "Core 도우미.app"을 만든다 (아이콘·이름이 제대로 보이는 정식 앱).
# 앱 안에는 실행용 껍데기(launcher/)만 들어가고, 실제 코드는 이 저장소 폴더에서 읽는다 → 코드가 바뀌어도 다시 만들 필요 없음.
# 사용법: Design-Core/app 폴더에서  bash scripts/build-mac-app.sh
# 다시 만들어야 할 때: 저장소 폴더를 옮겼을 때, launcher/ 나 아이콘을 바꿨을 때.
set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"
REPO_DIR="$(cd .. && pwd)"
NAME="Core 도우미"
ARCH="$(uname -m)"; [ "$ARCH" = "x86_64" ] && ARCH="x64"
ELECTRON_VERSION="$(node -p "require('./node_modules/electron/package.json').version" 2>/dev/null || echo 38.0.0)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "1/4 아이콘 만드는 중"
ICONSET="$WORK/icon.iconset"; mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s build/icon.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) build/icon.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$WORK/icon.icns"

echo "2/4 실행용 껍데기 준비 (저장소: $REPO_DIR)"
cp -R launcher "$WORK/launcher"
printf '{ "repoDir": %s }\n' "$(node -p "JSON.stringify(process.argv[1])" "$REPO_DIR")" > "$WORK/launcher/config.json"

echo "3/4 앱 포장 중 (Electron $ELECTRON_VERSION, $ARCH)"
npx --yes @electron/packager@18 "$WORK/launcher" "$NAME" --platform=darwin --arch="$ARCH" \
  --electron-version="$ELECTRON_VERSION" --icon="$WORK/icon.icns" --app-bundle-id=com.watcha.core-helper \
  --out="$WORK/out" --overwrite --quiet

echo "4/4 바탕화면에 놓는 중"
DEST="$HOME/Desktop/$NAME.app"
rm -rf "$DEST"
cp -R "$WORK/out/$NAME-darwin-$ARCH/$NAME.app" "$DEST"
xattr -cr "$DEST" 2>/dev/null || true
echo "완료: $DEST"
