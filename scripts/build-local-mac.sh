#!/bin/bash
# Builds an unsigned Bruno.app for this Mac (arm64) from the current checkout.
#
# Usage:
#   ./scripts/build-local-mac.sh            # build only -> packages/bruno-electron/out/mac-arm64/Bruno.app
#   ./scripts/build-local-mac.sh --install  # build, then replace /Applications/Bruno.app
#
# Notes:
# - Uses the Node version from .nvmrc via fnm (does not install it).
# - "Notarizing ... appleId property is required" is expected and harmless: notarization needs the
#   maintainers' Apple credentials and its error is caught.
# - After each rebuild macOS asks for the "bruno Safe Storage" keychain item: click "Always Allow".

set -euo pipefail

cd "$(dirname "$0")/.."

eval "$(fnm env)"
fnm use

APP_PATH="packages/bruno-electron/out/mac-arm64/Bruno.app"

npm run build:web

# Copies the web build into the electron package; without a target it builds nothing else.
./scripts/build-electron.sh

(
  cd packages/bruno-electron
  npx electron-builder --mac dir --arm64 --config electron-builder-config.js -c.mac.identity=null
)

echo "Built $APP_PATH"

if [ "${1:-}" == "--install" ]; then
  if pgrep -f "/Applications/Bruno.app/Contents/MacOS/Bruno" > /dev/null; then
    echo "Bruno is running; quit it and run again with --install" >&2
    exit 1
  fi
  rm -rf /Applications/Bruno.app
  cp -R "$APP_PATH" /Applications/
  xattr -dr com.apple.quarantine /Applications/Bruno.app
  echo "Installed /Applications/Bruno.app"
fi
