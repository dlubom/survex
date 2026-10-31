# Direct Aven WASM experiment

**Actual Aven now runs in WebGL2**, retaining its wx interface, `.3d` parser, LRUD and DEM code. Read [results and limits](../../doc/AVEN_WASM_SPIKE.md) and [known limitations](KNOWN_LIMITATIONS.md). The [experimental Pages viewer](https://dlubom.github.io/survex/) starts with the full Tatra Kataster and its terrain. It remains an experiment, not a production distribution or clean-machine installer.

## Package the default Kataster scene for static hosting (stage 4)

The page starts Aven with the pinned Kataster and a losslessly zipped HGT, names enabled and an oblique view. **Otwórz pliki…** optionally reads a local `.3d` and/or `.hgt`/terrain `.zip` through a browser file input and the normal Aven loaders. Files stay in browser memory; there is no upload endpoint or persistence. Opening another survey clears the old scene's terrain. **Kataster + teren** reloads the default scene.

Prepare the audited data with `prepare-kataster.py` as below, then run from the source checkout (output directories must be new):

```sh
python3 tests/wasm-spike/scripts/prepare-pages-assets.py "$KATASTER_TEST/assets" /tmp/aven-pages-assets
AVEN_BUILD=/tmp/aven-pages-build AVEN_EXTRA_DATA=/tmp/aven-pages-assets AVEN_WEB_SCENE=kataster \
  bash tests/wasm-spike/scripts/build-aven.sh
# Commit the reviewed source before packaging for publication.
python3 tests/wasm-spike/scripts/package-pages.py --build /tmp/aven-pages-build \
  --assets /tmp/aven-pages-assets --output /tmp/aven-static-root/survex
python3 -m http.server 8780 --bind 127.0.0.1 --directory /tmp/aven-static-root
```

Open <http://127.0.0.1:8780/survex/>. `--allow-dirty` permits local preview only: the manifest marks it and no source archive is supplied. Never publish such a preview. The packager verifies the preloaded scene bytes, adds the exact committed Survex source archive, dependency notices, provenance and SHA-256 manifest. The original HGT bytes are verified after ZIP decompression. Files use relative URLs and a content-addressed app directory; no server, COOP/COEP headers, service worker or `SharedArrayBuffer` is required by this single-thread build. The prepared dependency environment is still required to build it.

Run `pages/browser-pages-check.js` through Playwright on the package root URL. It checks automatic startup, camera controls through the iframe, local survey/DEM input, no network requests during local import, restoration and console/GL errors. It stores `window.avenPagesAcceptance`. To repeat station/tree/LRUD/synthetic checks, navigate directly to the manifest's `app` URL and run `browser-check.js`; that script explicitly selects the bundled fixture and supports nested project paths. Stage-4 [local evidence](evidence/stage4/manifest.json) records the build hashes. Stage-3 evidence remains an archive of commit `5c34c8ea`, not a declaration about later sources.

Publish only a clean, tested package to the repository's **`gh-pages` branch, root `/`**, with `.nojekyll`; configure GitHub Pages to deploy from that branch. Source stays on `codex/aven-webgl2` / draft PR #2. No merge is needed. For first publication, copy the package into a new temporary Git repository, commit on `gh-pages`, and push without force. For updates, fetch/check out the existing branch and replace its static files in a separate checkout. Do not overwrite an existing branch blindly. Verify the public URL, file hashes and browser interactions after GitHub's Pages deployment finishes. Deployment receipts are kept beside the static package at [verification/receipt.json](https://dlubom.github.io/survex/verification/receipt.json); they identify the source and tested static commit separately.

Data attribution and limits appear on the page's **Dane i obsługa** link. Kataster is pinned to `3f865414…`, CC BY-SA 4.0; DEM is credited to Jonathan de Ferranti / Viewfinder Panoramas. The author's [redistribution terms](https://www.viewfinderpanoramas.org/) allow acknowledgement and a source link where a different format or smaller file is needed; this package uses lossless ZIP/MEMFS packaging. No terrain resampling, source edits or vertical shift is applied. Three entrances remain outside the tile; vertical datum agreement and source LRUD import are unresolved.

## Build and run

Reuse the pinned dependencies in `/private/tmp/aven-wasm-spike` from stage 1. `build-aven.sh` applies the committed stage-3 wx patch, rebuilds wx, and then builds and links Aven. The patch script checks the exact upstream commit, accepts an already-applied patch, and rejects mismatches or partial application. Run from this checkout:

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

For an incremental relink after rebuilding changed Aven objects (rebuild wx too if changing its patch; linking must include the updated wx JS glue):

```sh
bash tests/wasm-spike/scripts/link-aven.sh
```

## Repeat the acceptance checks

`browser-check.js` is an async Playwright `(page) => …` function usable with Playwright's `run-code` command or connector. Navigate the page to the local Aven URL first; the function derives the server origin from `page.url()` and accepts any port. It writes screenshots to `.playwright-mcp/` in the browser tool's workspace. It asserts file counts, both zoom directions, rotation/tilt/pan, model picking, tree double-click, labels, LRUD, DEM registration, resize and zero console/GL errors. Tree rows are canvas-painted; the test uses the recorded row coordinates at its fixed viewport.

After running, save these read-only evaluations as JSON:

```js
() => window.avenAcceptance
() => ({state: Module.avenTest, gl: Module.avenGL})
```

For the 65×65 synthetic fixture, use the second file to compare every retained DEM vertex with native PROJ. Large real-model observations are capped at 10,000 terrain vertices; their verifier reports this narrower coverage:

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

The GLU oracle uses macOS OpenGL; the clipping test is portable C++. Stage-3 native build/scale results are in `evidence/stage3/`; native startup now uses the lazy filename converter. Historical stage-2 native commands and failures remain in `evidence/webgl2/`. Evidence is scoped by its recorded source hashes, not implicitly by later source edits.

Stage 2 evidence is in `evidence/webgl2/`. Historical failed link and separate wx-smoke evidence remain at `evidence/`; those do not describe the current renderer. Fixtures and their provenance remain unchanged.

## Stage-3 regressions

Run these async Playwright functions through the same real-browser runner as `browser-check.js`:

- `browser-ui-check.js`: toolbar/statusbar layout, search, Z-stretch, focus loss, resize, tree ArrowUp/Enter and the first zoom after DEM.
- `browser-modes-check.js`: optional rendering toggles, colour modes and side panel; this checks functioning interactions and errors, not desktop image parity.
- `browser-kataster-check.js`: Czarna with raw HGT and its exact BIL crop, then the full Kataster with raw HGT; rotate/tilt/pan/zoom, labels, geometry counts and errors. Requires external assets below.
- `browser-terrain-recovery-check.js`: synthetic DEM followed by an out-of-coverage real survey, expected diagnostic, then valid HGT recovery. Requires external Kataster assets below.
- `browser-malformed-hgt-check.js`: rejects an odd byte count and then loads the valid synthetic DEM.

Final stage-3 results pass: core (11 actions), UI (12 checks), modes (15 checks), the three Kataster/DEM scenarios, recovery and malformed HGT. Browser errors/warnings are zero. Native final-source build, 8/8 suites and scale regression pass; the actual final GUI opens Czarna/HGT with labels, tree and station selection. See the report for screenshots, recorded hashes and the limits of this desktop comparison.

Run the actual adapter's retained-list and batching regression without a GUI:

```sh
bash tests/wasm-spike/scripts/check-adapter-replay.sh
```

It compiles `adapter-replay-test.cc`, including `../../src/aven-webgl.cc`, with strict undefined-symbol checks, and uses an inspecting CPU GL sink under Node. It checks 2,369,843 triangles twice, state inheritance, nested/redefined lists, matrices, shading and bitmap labels. `AVEN_REPLAY_BUILD` selects its output directory; `AVEN_REPLAY_NODE` and `EMSDK_PYTHON` override executables. It is independent of browser rasterization and does not replace screenshots or console checks.

After a configured native desktop build, run the focused scale regression from that build's `src` directory:

```sh
make -f Makefile -f "$AVEN_SOURCE/tests/wasm-spike/native-regressions.mk" scale-regression
./scale-regression
```

It uses the actual `GfxCore`, `GLACanvas` and ordinary wheel handler, not a reimplementation of their formula. Run existing native suites serially (`make -j1 check` in the native build's `tests` directory) and retain source/binary hashes with their logs. A staged native build without generated message catalogs needs `SURVEXLIB=/private/tmp/aven-wasm-spike/release-resources/lib` when running these tests; otherwise even `aven --help` may stop at a missing-catalog diagnostic. The native converter reproducer is kept in [the archived failure record](KNOWN_LIMITATIONS.md#native-gui-startup-blocked-by-an-existing-converter-bug).

## Repeat the real Kataster / HGT experiment

This is optional local acceptance data, not part of the committed bundle. Keep the source checkout unchanged. The audited data commit is `3f865414d1dacaa15cd5477e567b0f852c43b32d`; [kataster-reference.json](kataster-reference.json) records source provenance, raw HGT hash, model counts and known data limits.

With native Survex 1.4.24 installed, prepare a **new** scratch directory:

```sh
KATASTER_SOURCE=/absolute/path/to/Jaskiniowy-Kataster-Tatr-Zachodnich
KATASTER_TEST=/tmp/aven-kataster-reproduction
python3 tests/wasm-spike/scripts/prepare-kataster.py "$KATASTER_SOURCE" "$KATASTER_TEST"
```

The standard-library script checks the clean pinned checkout and exact HGT hash, freshly compiles `KATASTER.wpj`, exports Czarna with native `survexport`, compares subset geometry/node flags, and prepares the raw HGT plus a bit-exact 107×72 BIL crop. It never uses an existing `.3d` in the data checkout. `.3d` timestamps and ZIP metadata are made reproducible; their file hashes therefore differ from the original run even when geometry/crop bytes agree. Native tool paths can be overridden with `--cavern`, `--survexport`, `--dump3d`.

Optionally reproduce the independent full-grid count with a Python environment containing NumPy and pyproj (recorded versions: NumPy 2.4.6, pyproj 3.7.2 / PROJ 9.5.1):

```sh
python3 tests/wasm-spike/scripts/count-kataster-mesh.py "$KATASTER_TEST/assets/N49E019_VF1.hgt" > "$KATASTER_TEST/mesh-count.json"
```

Expected: Czarna 5031 retained points / 9826 triangles; full Kataster 1,186,869 / 2,369,843. This counts the native projected grid independently; it does not exercise Aven or the browser.

Preload those local assets and serve the resulting build:

```sh
AVEN_EXTRA_DATA="$KATASTER_TEST/assets" bash tests/wasm-spike/scripts/link-aven.sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory /private/tmp/aven-webgl2-build/web
```

Set the same `AVEN_BUILD` used for compilation if it differs from the default. `AVEN_EXTRA_DATA` also works with the complete `build-aven.sh`. In Aven's existing **File → Open…**, enter `/external/czarna.3d` or `/external/kataster.3d`. In **File → Open Terrain…**, enter `/external/N49E019_VF1.hgt`; the smaller `/external/czarna-terrain.zip` is an exact crop for the Czarna test. Startup query parameters accept only the three bundled fixtures, so use the actual file dialog for external data.

After loading terrain manually, save `{state: Module.avenTest, gl: Module.avenGL}` as JSON. After running `browser-kataster-check.js`, save `window.avenKatasterAcceptance` for the outcome and `window.avenKatasterSnapshots.czarna`, `.czarnaCrop` and `.full` for the three separate observations. Use the exact `.3d` loaded in that run:

```sh
python3 tests/wasm-spike/verify-kataster-terrain.py czarna-snapshot.json --model czarna --hgt "$KATASTER_TEST/assets/N49E019_VF1.hgt" --model3d "$KATASTER_TEST/assets/czarna.3d"
python3 tests/wasm-spike/verify-kataster-terrain.py full-snapshot.json --model full --hgt "$KATASTER_TEST/assets/N49E019_VF1.hgt" --model3d "$KATASTER_TEST/assets/kataster.3d"
```

Use `--crop` for the Czarna BIL snapshot. The verifier needs native `dump3d` and `cs2cs` (override with matching options); it checks cave coordinates/names/flags, source samples, projected XY, unchanged Z, the common offset and recorded GL errors. The full model checks all 18,539 station records but only the captured 10,000 terrain samples; it explicitly reports `captured subset only`. Full terrain counters are independently compared with the native grid count.

Raw HGT and cave heights have no established common vertical datum; no fitted shift is applied. Three eastern entrances are outside the HGT tile. The Walls import contains no LRUD records, so LRUD checks must use the existing bundled/synthetic fixture. These are data limitations, not claims of renderer failure. The original `.3d`, HGT and BIL/ZIP payloads are not bundled in Git. Compressed observations **do contain source-derived station coordinates and sampled terrain heights**, and screenshots depict the source models. Credit: [Jaskiniowy Kataster Tatr](https://github.com/dlubom/Jaskiniowy-Kataster-Tatr-Zachodnich/tree/3f865414d1dacaa15cd5477e567b0f852c43b32d), its contributors and source authors recorded in its survey files; the project declares [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Derived cave-coordinate evidence retains that attribution and license. Terrain credit: Jonathan de Ferranti / Viewfinder Panoramas, as identified in the [pinned source metadata](https://github.com/dlubom/Jaskiniowy-Kataster-Tatr-Zachodnich/blob/3f865414d1dacaa15cd5477e567b0f852c43b32d/Powierzchnia/Survex/README.md). That metadata states free public use; the exact redistribution terms were not independently established in this local audit. The original inputs are unchanged; derived evidence records compilation, selection and the horizontal CRS transformation described above.

## Dependencies from stage 1

This checkout intentionally excludes SDKs, dependency repositories, compiled archives and browser bundles. Recreate the prepared dependencies with the pins in `evidence/manifest.json`: wx `01b74ea19a09968277f59475f8919f2d2a4ff00e`, Emscripten 6.0.6, PCBJam scheduler `46652150aef774bb5565739f6e716b983d12df17`, PROJ 9.7.0/SQLite 3.49.1. Initialize wx submodules `src/png`, `src/jpeg`, `src/expat`, `3rdparty/pcre`, `3rdparty/nanosvg`; use saved `build-wx.sh` and `proj-*.sh`. Local Autoconf/Automake pins are in `evidence/host-tools-build.json`; `ACLOCAL_PATH` points to Homebrew's `pkg.m4`.

The original setup needs wx archive aliases without the cross suffix and filters host `-lSM`/GUI `-pthread` at final link, as documented in the historical report. Put the pinned scheduler at `support/jspi-scheduler.js` and the official release resources at `release-resources/` under `TASK_ROOT`. These are prepared-environment instructions; a portable dependency installer is a separate task.
