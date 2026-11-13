#!/bin/sh
# Shared source/ZIP contract; cannot prove installed WordPress/GF integration.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"
for tool in php node zip unzip diff cmp mktemp; do
    command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 1; }
done
php -r 'if (PHP_VERSION_ID < 80200) { fwrite(STDERR, "PHP 8.2+ required\n"); exit(1); }'
find . -name '*.php' -type f -not -path './vendor/*' -exec sh -c 'for file do php -l "$file" || exit "$?"; done' sh {} +
node --check assets/js/handoff.js
php tests/smoke.php
for runtime_dir in includes languages; do
    if [ -d "$runtime_dir" ] && [ -n "$(find "$runtime_dir" -type f -print -quit)" ]; then
        echo "Unexpected unpackaged runtime source in $runtime_dir" >&2; exit 1
    fi
done
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
printf '%s\n' 'assets/js/handoff.js' > "$tmp/expected-assets"
find assets -type f -print | LC_ALL=C sort > "$tmp/actual-assets"
diff -u "$tmp/expected-assets" "$tmp/actual-assets"
sh scripts/package.sh "$tmp/plugin.zip"
sh scripts/package.sh "$tmp/plugin-again.zip"
cmp "$tmp/plugin.zip" "$tmp/plugin-again.zip"
unzip -tq "$tmp/plugin.zip" >/dev/null
unzip -Z1 "$tmp/plugin.zip" | LC_ALL=C sort > "$tmp/actual"
printf '%s\n' \
    'gf-native-crop-rotate/README.md' \
    'gf-native-crop-rotate/assets/js/handoff.js' \
    'gf-native-crop-rotate/gf-native-crop-rotate.php' > "$tmp/expected"
diff -u "$tmp/expected" "$tmp/actual"
for path in README.md gf-native-crop-rotate.php assets/js/handoff.js; do
  unzip -p "$tmp/plugin.zip" "gf-native-crop-rotate/$path" | cmp - "$path"
done
printf 'Source, stub contract and prototype package PASS (NOT WP/GF integration).\n'
