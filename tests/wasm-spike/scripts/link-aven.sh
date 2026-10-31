#!/bin/bash
set -euo pipefail
TASK_ROOT=/private/tmp/aven-wasm-spike
export PATH="/opt/homebrew/bin:$PATH"
export EMSDK_PYTHON=/opt/homebrew/bin/python3
source "$TASK_ROOT/emsdk/emsdk_env.sh"
mkdir -p "$TASK_ROOT/web"
read -r -a wx_libs <<< "$("$TASK_ROOT/wx-build/wx-config" --libs core,gl | sed 's/-lSM//g; s/-pthread//g')"
em++ "$TASK_ROOT"/aven-build/src/aven-*.o \
  -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1 \
  -sJSPI=1 \
  '-sJSPI_EXPORTS=main,wx_dom_event,wx_dom_mouse,wx_window_close,wx_window_move,wx_window_resize,ProcessEvents,wxWasmMailboxTick,wxWasmTopLevelTick,wxWasmJobTick' \
  "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAP8','HEAP32','ccall','stackSave','stackRestore']" \
  '-sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE=$stringToNewUTF8' \
  -sALLOW_MEMORY_GROWTH=1 -sLEGACY_GL_EMULATION=1 -sMAX_WEBGL_VERSION=2 \
  -sASSERTIONS=1 -sERROR_ON_UNDEFINED_SYMBOLS=1 -Wl,--error-limit=0 \
  "${wx_libs[@]}" "$TASK_ROOT/target/lib/libproj.a" "$TASK_ROOT/target/lib/libsqlite3.a" \
  --pre-js "$TASK_ROOT/support/jspi-scheduler.js" \
  --pre-js "$TASK_ROOT/wxwidgets/build/wasm/wx.js" \
  --pre-js "$TASK_ROOT/wxwidgets/build/wasm/wx-dom.js" \
  --shell-file "$TASK_ROOT/wxwidgets/build/wasm/template.html" \
  --preload-file "$TASK_ROOT/release-resources/lib@/survex" \
  --preload-file "$TASK_ROOT/fixtures@/fixtures" \
  --preload-file "$TASK_ROOT/target/share/proj/proj.db@/proj/proj.db" \
  -o "$TASK_ROOT/web/aven.html" > "$TASK_ROOT/logs/aven-link-strict.log" 2>&1
