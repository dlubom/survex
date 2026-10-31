#!/bin/bash
set -euo pipefail
TASK_ROOT=${TASK_ROOT:-/private/tmp/aven-wasm-spike}
AVEN_SOURCE=${AVEN_SOURCE:-$(cd "$(dirname "$0")/../../.." && pwd)}
AVEN_BUILD=${AVEN_BUILD:-/private/tmp/aven-webgl2-build}
export PATH="/opt/homebrew/bin:$PATH"
export EMSDK_PYTHON=${EMSDK_PYTHON:-/opt/homebrew/bin/python3}
source "$TASK_ROOT/emsdk/emsdk_env.sh"
mkdir -p "$AVEN_BUILD/web" "$AVEN_BUILD/logs"
# Keep pinned generated fonts/messages, with the current source texture asset.
# The source PNG fixes the release's invalid ICC profile without changing pixels.
resource_dir="$AVEN_BUILD/resources/survex"
mkdir -p "$resource_dir"
cp -R "$TASK_ROOT/release-resources/lib/." "$resource_dir/"
cp "$AVEN_SOURCE/lib/images/texture.png" "$resource_dir/images/texture.png"
extra_data=()
if [[ -n ${AVEN_EXTRA_DATA:-} ]]; then
  # Optional local acceptance data; never copy external surveys into the repo.
  test -d "$AVEN_EXTRA_DATA"
  extra_data=(--preload-file "$AVEN_EXTRA_DATA@/external")
fi
read -r -a wx_libs <<< "$("$TASK_ROOT/wx-build/wx-config" --libs core,gl | sed 's/-lSM//g; s/-pthread//g')"
em++ "$AVEN_BUILD"/src/aven-*.o \
  -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1 \
  -sJSPI=1 \
  '-sJSPI_EXPORTS=main,wx_dom_event,wx_dom_mouse,wx_window_close,wx_window_move,wx_window_resize,ProcessEvents,wxWasmMailboxTick,wxWasmTopLevelTick,wxWasmJobTick' \
  "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAP8','HEAP32','ccall','stackSave','stackRestore']" \
  '-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=$stringToNewUTF8' \
  -sALLOW_MEMORY_GROWTH=1 -sMIN_WEBGL_VERSION=2 -sMAX_WEBGL_VERSION=2 \
  -sASSERTIONS=1 -sERROR_ON_UNDEFINED_SYMBOLS=1 -Wl,--error-limit=0 \
  "${wx_libs[@]}" "$TASK_ROOT/target/lib/libproj.a" "$TASK_ROOT/target/lib/libsqlite3.a" \
  --pre-js "$TASK_ROOT/support/jspi-scheduler.js" \
  --pre-js "$TASK_ROOT/wxwidgets/build/wasm/wx.js" \
  --pre-js "$TASK_ROOT/wxwidgets/build/wasm/wx-dom.js" \
  --pre-js "$AVEN_SOURCE/tests/wasm-spike/aven-bootstrap.js" \
  --shell-file "$AVEN_SOURCE/tests/wasm-spike/aven-shell.html" \
  --preload-file "$resource_dir@/survex" \
  --preload-file "$AVEN_SOURCE/tests/wasm-spike/fixtures@/fixtures" \
  --preload-file "$TASK_ROOT/target/share/proj/proj.db@/proj/proj.db" \
  "${extra_data[@]}" \
  -o "$AVEN_BUILD/web/aven.html" > "$AVEN_BUILD/logs/link.log" 2>&1
echo "Built actual Aven: $AVEN_BUILD/web/aven.html"
