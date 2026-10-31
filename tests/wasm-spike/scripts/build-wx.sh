#!/bin/bash
set -euo pipefail
TASK_ROOT=/private/tmp/aven-wasm-spike
export PATH="$TASK_ROOT/host-tools/bin:/opt/homebrew/opt/m4/bin:/opt/homebrew/bin:$PATH"
export EMSDK_PYTHON=/opt/homebrew/bin/python3
source "$TASK_ROOT/emsdk/emsdk_env.sh"
export ACLOCAL_PATH=/opt/homebrew/share/aclocal
WX_SOURCE="$TASK_ROOT/wxwidgets"
WX_BUILD="$TASK_ROOT/wx-build"
mkdir -p "$WX_BUILD" "$TASK_ROOT/logs"
embuilder build zlib
EM_SYSROOT="$(em-config CACHE)/sysroot"
export PKG_CONFIG_LIBDIR="$TASK_ROOT/target/lib/pkgconfig"
export CFLAGS="-DZ_HAVE_UNISTD_H=1 -I$EM_SYSROOT/include -O1 -g -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1 -pthread -matomics -mbulk-memory"
export CXXFLAGS="$CFLAGS -I$WX_BUILD/3rdparty/pcre/src"
export LDFLAGS="-L$EM_SYSROOT/lib/wasm32-emscripten"
cp "$WX_SOURCE/config.sub" "$WX_SOURCE/3rdparty/pcre/config.sub"
cp "$WX_SOURCE/config.sub" "$WX_SOURCE/src/expat/expat/conftools/config.sub"
touch "$WX_SOURCE/configure"
for generated in aclocal.m4 configure Makefile.in src/config.h.in; do
  touch "$WX_SOURCE/3rdparty/pcre/$generated"
done
cd "$WX_BUILD"
emconfigure "$WX_SOURCE/configure" --host=wasm32-unknown-emscripten \
  --without-subdirs --disable-shared --with-opengl --enable-exceptions \
  --disable-richtext --without-libtiff --disable-xlocale --with-cxx=17 \
  --enable-utf8 --with-zlib=sys --with-regex=builtin --enable-debug \
  --prefix="$TASK_ROOT/wx-install" > "$TASK_ROOT/logs/wx-configure.log" 2>&1
ln -sf pcre2_chartables.c.dist "$WX_SOURCE/3rdparty/pcre/src/pcre2_chartables.c"
emmake make -j4 -C 3rdparty/pcre > "$TASK_ROOT/logs/wx-pcre-build.log" 2>&1
emmake make -j4 > "$TASK_ROOT/logs/wx-build.log" 2>&1
./wx-config --version
