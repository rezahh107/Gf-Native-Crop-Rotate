#!/bin/sh
# One underlying Foundation check for local contributors, agents and CI.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"
for tool in php zip unzip diff cmp mktemp; do
    command -v "$tool" >/dev/null 2>&1 || { echo "Missing required tool: $tool" >&2; exit 1; }
done
php -r 'if (PHP_VERSION_ID < 80200) { fwrite(STDERR, "PHP 8.2+ required for development checks\n"); exit(1); }'

find . -name '*.php' -type f -not -path './vendor/*' -exec sh -c 'for file do php -l "$file" || exit "$?"; done' sh {} +
php tests/smoke.php

# Until real runtime assets are implemented, fail rather than quietly omit them
# from the package's explicit two-file allowlist.
for runtime_dir in includes assets languages; do
    if [ -d "$runtime_dir" ] && [ -n "$(find "$runtime_dir" -type f -print -quit)" ]; then
        echo "Unpackaged runtime source in $runtime_dir; update package allowlist and checks." >&2
        exit 1
    fi
done

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
sh scripts/package.sh "$tmp/plugin.zip"
sh scripts/package.sh "$tmp/plugin-again.zip"
cmp "$tmp/plugin.zip" "$tmp/plugin-again.zip"
unzip -tq "$tmp/plugin.zip" >/dev/null
unzip -Z1 "$tmp/plugin.zip" | LC_ALL=C sort > "$tmp/actual"
printf '%s\n' \
    'gf-native-crop-rotate/README.md' \
    'gf-native-crop-rotate/gf-native-crop-rotate.php' > "$tmp/expected"
diff -u "$tmp/expected" "$tmp/actual"
unzip -p "$tmp/plugin.zip" gf-native-crop-rotate/gf-native-crop-rotate.php | cmp - gf-native-crop-rotate.php
unzip -p "$tmp/plugin.zip" gf-native-crop-rotate/README.md | cmp - README.md
printf 'Foundation checks PASS (not a WordPress/Gravity Forms integration test).\n'
