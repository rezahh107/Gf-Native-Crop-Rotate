#!/bin/sh
# A deliberately small allowlist: change only after reviewing new runtime assets.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
output=${1:-"$root/dist/gf-native-crop-rotate-dev.zip"}
mkdir -p "$(dirname -- "$output")"
output=$(CDPATH= cd -- "$(dirname -- "$output")" && pwd)/$(basename -- "$output")

# Stage next to the output so publishing the finished archive is an atomic rename.
tmp=$(mktemp -d "$(dirname -- "$output")/.gfncr-package.XXXXXX")
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
mkdir -p "$tmp/stage/gf-native-crop-rotate"
cp "$root/gf-native-crop-rotate.php" "$root/README.md" "$tmp/stage/gf-native-crop-rotate/"
# Normalize timestamps and metadata for byte-identical archives of identical sources.
export TZ=UTC
touch -t 198001010000 "$tmp/stage/gf-native-crop-rotate/"*
(
    cd "$tmp/stage"
    zip -q -X "$tmp/package.zip" \
        gf-native-crop-rotate/gf-native-crop-rotate.php \
        gf-native-crop-rotate/README.md
)
mv -f "$tmp/package.zip" "$output"
printf 'Created development-only package: %s\n' "$output"
