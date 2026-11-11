#!/bin/sh
# Development-only explicit allowlist; no vendor distributions or production release.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output=${1:-"$root/dist/gf-native-crop-rotate-dev.zip"}
mkdir -p "$(dirname -- "$output")"
output=$(CDPATH= cd -- "$(dirname -- "$output")" && pwd)/$(basename -- "$output")
tmp=$(mktemp -d "$(dirname -- "$output")/.gfncr-package.XXXXXX")
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
mkdir -p "$tmp/stage/gf-native-crop-rotate/assets/js"
cp "$root/gf-native-crop-rotate.php" "$root/README.md" "$tmp/stage/gf-native-crop-rotate/"
cp "$root/assets/js/handoff.js" "$tmp/stage/gf-native-crop-rotate/assets/js/"
export TZ=UTC
touch -t 198001010000 "$tmp/stage/gf-native-crop-rotate/"*php "$tmp/stage/gf-native-crop-rotate/"*md "$tmp/stage/gf-native-crop-rotate/assets/js/"*
(
 cd "$tmp/stage"
 zip -q -X "$tmp/package.zip" \
    gf-native-crop-rotate/gf-native-crop-rotate.php \
    gf-native-crop-rotate/README.md \
    gf-native-crop-rotate/assets/js/handoff.js
)
mv -f "$tmp/package.zip" "$output"
printf 'Created prototype development package (NOT GF-qualified): %s\n' "$output"
