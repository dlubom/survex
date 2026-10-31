#!/bin/bash
set -euo pipefail

# PROJ/SQLite dependencies for the isolated Aven WASM feasibility experiment.
# All outputs are confined to the caller-selected experiment directory.
task_root="${1:-/private/tmp/aven-wasm-spike}"
export PATH="/opt/homebrew/bin:$task_root/emsdk:$task_root/emsdk/upstream/emscripten:$PATH"
export EMSDK_PYTHON=/opt/homebrew/bin/python3
export EMSDK_QUIET=1
source "$task_root/emsdk/emsdk_env.sh"
task_prefix="$task_root/target"
task_logs="$task_root/proj-logs"
task_source="$task_root/proj-src/proj-9.7.0"
task_sqlite="$task_root/proj-src/sqlite-amalgamation-3490100"
task_jobs="${PROJ_BUILD_JOBS:-4}"
task_eh=(-fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1)
mkdir -p "$task_logs" "$task_prefix/include" "$task_prefix/lib/pkgconfig" "$task_root/proj-build/sqlite"

if [[ ! -f "$task_source/CMakeLists.txt" || ! -f "$task_sqlite/sqlite3.c" ]]; then
  echo 'Missing sources: extract official proj-9.7.0.tar.gz and sqlite-amalgamation-3490100.zip into proj-src.' >&2
  exit 2
fi

emcc --version | tee "$task_logs/toolchain.log"
emcc -O2 "${task_eh[@]}" -DSQLITE_OMIT_LOAD_EXTENSION=1 -DSQLITE_THREADSAFE=1 \
  -c "$task_sqlite/sqlite3.c" -o "$task_root/proj-build/sqlite/sqlite3.o" \
  2>&1 | tee "$task_logs/sqlite-compile.log"
emar rcs "$task_prefix/lib/libsqlite3.a" "$task_root/proj-build/sqlite/sqlite3.o"
cp "$task_sqlite/sqlite3.h" "$task_sqlite/sqlite3ext.h" "$task_prefix/include/"
printf 'prefix=%s\n' "$task_prefix" > "$task_prefix/lib/pkgconfig/sqlite3.pc"
cat >> "$task_prefix/lib/pkgconfig/sqlite3.pc" <<'PC'
libdir=${prefix}/lib
includedir=${prefix}/include
Name: SQLite
Description: SQLite 3.49.1 compiled to wasm32-emscripten
Version: 3.49.1
Libs: -L${libdir} -lsqlite3
Libs.private: -lm
Cflags: -I${includedir}
PC

emcmake /opt/homebrew/bin/cmake -S "$task_source" -B "$task_root/proj-build/proj" -G Ninja \
  -DCMAKE_MAKE_PROGRAM=/opt/homebrew/bin/ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$task_prefix" \
  '-DCMAKE_C_FLAGS=-fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1' \
  '-DCMAKE_CXX_FLAGS=-fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sWASM_LEGACY_EXCEPTIONS=1' \
  -DBUILD_SHARED_LIBS=OFF -DBUILD_TESTING=OFF -DBUILD_APPS=OFF \
  -DENABLE_CURL=OFF -DENABLE_TIFF=OFF \
  -DEXE_SQLITE3=/usr/bin/sqlite3 \
  -DSQLite3_INCLUDE_DIR="$task_prefix/include" \
  -DSQLite3_LIBRARY="$task_prefix/lib/libsqlite3.a" \
  2>&1 | tee "$task_logs/proj-configure.log"

/opt/homebrew/bin/cmake --build "$task_root/proj-build/proj" --parallel "$task_jobs" \
  2>&1 | tee "$task_logs/proj-compile.log"
/opt/homebrew/bin/cmake --install "$task_root/proj-build/proj" \
  2>&1 | tee "$task_logs/proj-install.log"

/usr/bin/sqlite3 "$task_prefix/share/proj/proj.db" 'PRAGMA quick_check;' \
  | tee "$task_logs/proj-db-check.log"
shasum -a 256 "$task_prefix/lib/libproj.a" "$task_prefix/lib/libsqlite3.a" \
  "$task_prefix/share/proj/proj.db" | tee "$task_logs/artifact-sha256.log"
