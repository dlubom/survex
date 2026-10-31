# Direct Aven WASM experiment

**Actual Aven now runs in WebGL2**, retaining its wx interface, `.3d` parser, LRUD and DEM code. Read [results and limits](../../doc/AVEN_WASM_SPIKE.md) and [known limitations](KNOWN_LIMITATIONS.md). This remains a local experiment, not a production distribution or clean-machine installer.

## Build and run

Reuse the pinned dependencies in `/private/tmp/aven-wasm-spike` from stage 1. Run from this checkout:

```sh
bash tests/wasm-spike/scripts/build-aven.sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory /private/tmp/aven-webgl2-build/web
```

Open <http://127.0.0.1:8766/aven.html> in a JSPI-capable Chromium. Tested: Chromium 156.0.8078.74. Defaults to the real Nordalpenschacht example. Alternative startup URLs use `?fixture=bundled-passage` or `?fixture=synthetic-2180`.

Use existing Aven menus:

- **View → Station Names** for labels.
- Left drag to rotate, middle drag to tilt, right drag to pan, wheel to zoom; click a station or double-click its tree row.
- **File → Open…**, enter `/fixtures/bundled-passage.3d`, then **View → Passage Tubes** for LRUD.
- Open `/fixtures/synthetic-2180.3d`, then **File → Open Terrain…** and `/fixtures/synthetic-terrain.zip`. **Orientation → Elevation** shows the vertical relation. The menu picker accesses bundled MEMFS data, not arbitrary files on the host.

Override `TASK_ROOT`, `AVEN_SOURCE`, `AVEN_BUILD` to relocate dependencies, source or output. `build-aven.sh` derives the source path from its own location, generates current-source `z_getopt.c`, bootstraps/configures and compiles all 34 Aven objects. Generated font/headers come from the pinned official 1.4.24 release. The separate strict link supplies wx JSPI glue, the shell, font/messages, fixtures and PROJ database. No `LEGACY_GL_EMULATION`; WebGL2 is required. `AVEN_WEB_TEST` enables read-only acceptance observations, not bypasses of UI actions.

For an incremental relink after rebuilding changed objects:

```sh
bash tests/wasm-spike/scripts/link-aven.sh
```

## Repeat the acceptance checks

`browser-check.js` is an async Playwright `(page) => …` function usable with Playwright's `run-code` command or connector. It expects the server on port 8766 and writes screenshots to `.playwright-mcp/` in the browser tool's workspace. It asserts file counts, both zoom directions, rotation/tilt/pan, model picking, tree double-click, labels, LRUD, DEM registration, resize and zero console/GL errors. Tree rows are canvas-painted; the test uses the recorded row coordinates at its fixed viewport.

After running, save these read-only evaluations as JSON:

```js
() => window.avenAcceptance
() => ({state: Module.avenTest, gl: Module.avenGL})
```

Use the second file to compare every actual rendered DEM vertex with native PROJ:

```sh
python3 tests/wasm-spike/verify-browser-terrain.py terrain-vertices.json
clang++ -std=c++11 -Wno-deprecated-declarations tests/wasm-spike/matrix-glu-oracle.cc -framework OpenGL -o /tmp/aven-matrix-test
/tmp/aven-matrix-test
clang++ -std=c++11 tests/wasm-spike/line-clip-test.cc -o /tmp/aven-clip-test
/tmp/aven-clip-test
```

The recorded browser observation is also retained, so its numerical result can be checked without rebuilding WASM:

```sh
gzip -dc tests/wasm-spike/evidence/webgl2/terrain-vertices.json.gz > /tmp/aven-terrain-vertices.json
python3 tests/wasm-spike/verify-browser-terrain.py /tmp/aven-terrain-vertices.json
```

The GLU oracle uses macOS OpenGL; the clipping test is portable C++. Native desktop commands, dependency versions and out-of-tree test adjustments are preserved in `evidence/webgl2/native-summary.json`. They include 8/8 suites passing; native GUI startup has a separately reproduced baseline wx bug.

Stage 2 evidence is in `evidence/webgl2/`. Historical failed link and separate wx-smoke evidence remain at `evidence/`; those do not describe the current renderer. Fixtures and their provenance remain unchanged.

## Dependencies from stage 1

This checkout intentionally excludes SDKs, dependency repositories, compiled archives and browser bundles. Recreate the prepared dependencies with the pins in `evidence/manifest.json`: wx `01b74ea19a09968277f59475f8919f2d2a4ff00e`, Emscripten 6.0.6, PCBJam scheduler `46652150aef774bb5565739f6e716b983d12df17`, PROJ 9.7.0/SQLite 3.49.1. Initialize wx submodules `src/png`, `src/jpeg`, `src/expat`, `3rdparty/pcre`, `3rdparty/nanosvg`; use saved `build-wx.sh` and `proj-*.sh`. Local Autoconf/Automake pins are in `evidence/host-tools-build.json`; `ACLOCAL_PATH` points to Homebrew's `pkg.m4`.

The original setup needs wx archive aliases without the cross suffix and filters host `-lSM`/GUI `-pthread` at final link, as documented in the historical report. Put the pinned scheduler at `support/jspi-scheduler.js` and the official release resources at `release-resources/` under `TASK_ROOT`. These are prepared-environment instructions; a portable dependency installer is a separate task.
