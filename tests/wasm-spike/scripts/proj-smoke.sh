#!/bin/bash
set -euo pipefail
task_root="${1:-/private/tmp/aven-wasm-spike}"
export PATH="/opt/homebrew/bin:$task_root/emsdk:$task_root/emsdk/upstream/emscripten:$PATH"
export EMSDK_PYTHON=/opt/homebrew/bin/python3
export EMSDK_QUIET=1
source "$task_root/emsdk/emsdk_env.sh"
em++ -O1 -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1 \
  -I"$task_root/target/include" "$task_root/proj-build/proj-smoke.cpp" \
  "$task_root/target/lib/libproj.a" "$task_root/target/lib/libsqlite3.a" \
  -sERROR_ON_UNDEFINED_SYMBOLS=1 -sALLOW_MEMORY_GROWTH=1 -sSTACK_SIZE=2MB \
  -sENVIRONMENT=node \
  --embed-file "$task_root/target/share/proj/proj.db@/proj/proj.db" \
  -o "$task_root/proj-build/proj-smoke.js" \
  2>&1 | tee "$task_root/proj-logs/smoke-build.log"
node "$task_root/proj-build/proj-smoke.js" 2>&1 | tee "$task_root/proj-logs/smoke-run.log"
