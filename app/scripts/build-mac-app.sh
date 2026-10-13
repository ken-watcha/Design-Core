#!/bin/bash
# 맥에서 "Core 업데이트.app"을 만든다 (아이콘·이름이 제대로 보이는 정식 앱).
# 앱 안에는 실행용 껍데기(launcher/)만 들어가고, 실제 코드는 이 저장소 폴더에서 읽는다 → 코드가 바뀌어도 다시 만들 필요 없음.
# 사용법: Design-Core/app 폴더에서  bash scripts/build-mac-app.sh
#   --release : 배포판(저장소 없이 설치하는 앱). 켤 때 GitHub에서 최신 코드를 받는다. 결과는 dist/에 zip으로 (GitHub Actions가 사용)
# 다시 만들어야 할 때: 저장소 폴더를 옮겼을 때, launcher/ 나 아이콘을 바꿨을 때.
set -euo pipefail
RELEASE=0; [ "${1:-}" = "--release" ] && RELEASE=1
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"
REPO_DIR="$(cd .. && pwd)"
NAME="Core 업데이트"
ARCH="${ARCH:-$(uname -m)}"; [ "$ARCH" = "x86_64" ] && ARCH="x64"
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
if [ "$RELEASE" = 1 ]; then
  # 배포판: 저장소 위치 없이, 처음 켤 때 인터넷이 없어도 돌도록 지금 코드 사본을 넣어 둔다
  echo '{}' > "$WORK/launcher/config.json"
  mkdir -p "$WORK/launcher/bundled"
  rsync -a --exclude node_modules --exclude dist --exclude test --exclude launcher --exclude build ./ "$WORK/launcher/bundled/app/"
  cp -R "$REPO_DIR/plugin" "$REPO_DIR/core-index" "$WORK/launcher/bundled/"
else
  printf '{ "repoDir": %s }\n' "$(node -p "JSON.stringify(process.argv[1])" "$REPO_DIR")" > "$WORK/launcher/config.json"
fi

echo "3/4 앱 포장 중 (Electron $ELECTRON_VERSION, $ARCH)"
npx --yes @electron/packager@18 "$WORK/launcher" "$NAME" --platform=darwin --arch="$ARCH" \
  --electron-version="$ELECTRON_VERSION" --icon="$WORK/icon.icns" --app-bundle-id=com.watcha.core-helper \
  --out="$WORK/out" --overwrite --quiet

if [ "$RELEASE" = 1 ]; then
  echo "4/4 zip 만드는 중"
  mkdir -p dist
  ditto -c -k --sequesterRsrc --keepParent "$WORK/out/$NAME-darwin-$ARCH/$NAME.app" "dist/Core-Update-mac-$ARCH.zip"
  echo "완료: dist/Core-Update-mac-$ARCH.zip"
  exit 0
fi

echo "4/4 바탕화면에 놓는 중"
DEST="$HOME/Desktop/$NAME.app"
rm -rf "$DEST"
rm -rf "$HOME/Desktop/Core 도우미.app"  # 2026-10-12 이름 변경 전 앱
cp -R "$WORK/out/$NAME-darwin-$ARCH/$NAME.app" "$DEST"
xattr -cr "$DEST" 2>/dev/null || true
# 같은 자리에 다시 놓으면 Finder가 옛 아이콘(또는 빈 기본 아이콘)을 기억해 둔다 → 새 앱으로 다시 읽게 한다
touch "$DEST"
LSREG=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
[ -x "$LSREG" ] && "$LSREG" -f "$DEST" >/dev/null 2>&1 || true
killall Finder 2>/dev/null || true
echo "완료: $DEST"
