#!/bin/bash
set -euo pipefail
# Reuse pinned dependencies from the first spike, but isolate all outputs.
TASK_ROOT=${TASK_ROOT:-/private/tmp/aven-wasm-spike}
AVEN_SOURCE=${AVEN_SOURCE:-$(cd "$(dirname "$0")/../../.." && pwd)}
AVEN_BUILD=${AVEN_BUILD:-/private/tmp/aven-webgl2-build}
export TASK_ROOT AVEN_SOURCE AVEN_BUILD
export PATH="$TASK_ROOT/host-tools/bin:/opt/homebrew/opt/m4/bin:/opt/homebrew/bin:$PATH"
export ACLOCAL_PATH="/opt/homebrew/share/aclocal"
export EMSDK_PYTHON=${EMSDK_PYTHON:-/opt/homebrew/bin/python3}
source "$TASK_ROOT/emsdk/emsdk_env.sh"
export PKG_CONFIG_LIBDIR="$TASK_ROOT/target/lib/pkgconfig"
export PKG_CONFIG_PATH=
export WX_CONFIG="$TASK_ROOT/wx-build/wx-config"
export PROJ_CFLAGS="-I$TASK_ROOT/target/include"
export PROJ_LIBS="$TASK_ROOT/target/lib/libproj.a $TASK_ROOT/target/lib/libsqlite3.a"
export CFLAGS="-O1 -g -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1"
export CXXFLAGS="$CFLAGS -DAVEN_WEB_TEST=1"
export LDFLAGS="-sMIN_WEBGL_VERSION=2 -sMAX_WEBGL_VERSION=2 -sERROR_ON_UNDEFINED_SYMBOLS=1 -sJSPI=1 -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1"
mkdir -p "$AVEN_BUILD/logs"
bash "$AVEN_SOURCE/tests/wasm-spike/scripts/apply-wx-patches.sh" "$TASK_ROOT/wxwidgets" \
  > "$AVEN_BUILD/logs/wx-patches.log" 2>&1
emmake make -j4 -C "$TASK_ROOT/wx-build" > "$AVEN_BUILD/logs/wx-build.log" 2>&1
# Only pinned release-generated assets; never substitute product source.
cp "$TASK_ROOT/release-resources/lib/preload_font.h" "$AVEN_SOURCE/lib/"
for header in avenpal.h img2aven.h thgeomagdata.h; do
  cp "$TASK_ROOT/release-resources/src/$header" "$AVEN_SOURCE/src/"
done
(cd "$AVEN_SOURCE/src" && ./gettexttomsg.pl getopt.c > z_getopt.c)
(cd "$AVEN_SOURCE" && autoreconf -i) > "$AVEN_BUILD/logs/bootstrap.log" 2>&1
cd "$AVEN_BUILD"
emconfigure "$AVEN_SOURCE/configure" --host=wasm32-unknown-emscripten --without-gdal \
  > logs/configure.log 2>&1
# The browser link below supplies shell, resources and JSPI entry points.
printf 'aven-wasm-objects: $(aven_OBJECTS)\n' > objects.mk
emmake make -j4 -C src -f Makefile -f ../objects.mk aven-wasm-objects \
  > logs/compile.log 2>&1
bash "$AVEN_SOURCE/tests/wasm-spike/scripts/link-aven.sh"
