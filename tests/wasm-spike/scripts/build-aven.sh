#!/bin/bash
set -euo pipefail
TASK_ROOT=/private/tmp/aven-wasm-spike
AVEN_SOURCE=/Users/dariuszlubomski/.codex/worktrees/aven-wasm-spike/survex
export PATH="$TASK_ROOT/host-tools/bin:/opt/homebrew/opt/m4/bin:/opt/homebrew/bin:$PATH"
export EMSDK_PYTHON=/opt/homebrew/bin/python3
source "$TASK_ROOT/emsdk/emsdk_env.sh"
export PKG_CONFIG_LIBDIR="$TASK_ROOT/target/lib/pkgconfig"
export PKG_CONFIG_PATH=
export WX_CONFIG="$TASK_ROOT/wx-build/wx-config"
export PROJ_CFLAGS="-I$TASK_ROOT/target/include"
export PROJ_LIBS="$TASK_ROOT/target/lib/libproj.a $TASK_ROOT/target/lib/libsqlite3.a"
export CFLAGS="-O1 -g -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1"
export CXXFLAGS="$CFLAGS"
export LDFLAGS="-sLEGACY_GL_EMULATION=1 -sMAX_WEBGL_VERSION=2 -sERROR_ON_UNDEFINED_SYMBOLS=1 -sJSPI=1 -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1"
mkdir -p "$TASK_ROOT/aven-build"
cd "$TASK_ROOT/aven-build"
emconfigure "$AVEN_SOURCE/configure" --host=wasm32-unknown-emscripten --without-gdal \
  > "$TASK_ROOT/logs/aven-configure.log" 2>&1
emmake make -j4 -C src aven > "$TASK_ROOT/logs/aven-build.log" 2>&1
