#!/bin/bash
set -euo pipefail

# Refuse drift rather than applying a toolkit patch to an untested revision.
WX_SOURCE="${1:-${WX_SOURCE:-${TASK_ROOT:-/private/tmp/aven-wasm-spike}/wxwidgets}}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PATCH="$SCRIPT_DIR/../patches/wx-wasm-controls-layout-and-enter.patch"
EXPECTED=01b74ea19a09968277f59475f8919f2d2a4ff00e

if [[ "$(git -C "$WX_SOURCE" rev-parse HEAD)" != "$EXPECTED" ]]; then
    printf 'Refusing wx patch: expected revision %s in %s\n' "$EXPECTED" "$WX_SOURCE" >&2
    exit 1
fi

if git -C "$WX_SOURCE" apply --check "$PATCH" 2>/dev/null; then
    git -C "$WX_SOURCE" apply "$PATCH"
    printf 'Applied wx toolbar, frame-origin and Enter fixes.\n'
elif git -C "$WX_SOURCE" apply --reverse --check "$PATCH" 2>/dev/null; then
    printf 'wx toolbar, frame-origin and Enter fixes already applied.\n'
else
    printf 'Refusing wx patch: target files have conflicting or partial changes.\n' >&2
    exit 1
fi
