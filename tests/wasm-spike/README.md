# Direct Aven WASM spike — experimental evidence

Read [the result](../../doc/AVEN_WASM_SPIKE.md) before using these files. The native Aven source compiles to 33 WASM objects, but the strict link fails on 21 OpenGL/GLU APIs. `wx-smoke` is a separate toolkit diagnostic, not Aven.

This is a snapshot of the actual macOS arm64 experiment, **not a portable clean-machine installer**. SDKs, dependency checkouts, generated libraries and browser bundles are intentionally outside Git in `/private/tmp/aven-wasm-spike`. Pins and hashes are in `evidence/manifest.json` and the PROJ fetch script. The scripts preserve local paths from the experiment; edit their path variables when moving it.

## Run the existing diagnostic

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /private/tmp/aven-wasm-spike
```

Open <http://127.0.0.1:8765/wx-smoke/smoke.html> in a JSPI-capable browser. Select **Warm triangle**, return to **RGB triangle**, and resize. The C++ handlers report genuine WebGL framebuffer pixels and GL errors. This does not load a cave or terrain.

## Repeat against the prepared scratch dependencies

```sh
# The complete Aven link is expected to FAIL with the unchanged renderer.
bash tests/wasm-spike/scripts/link-aven.sh

# Real PROJ + SQLite WASM transform, expected PASS.
bash tests/wasm-spike/scripts/proj-smoke.sh

# Rebuild the separate wx diagnostic in its original scratch directory.
source /private/tmp/aven-wasm-spike/emsdk/emsdk_env.sh
python3 /private/tmp/aven-wasm-spike/wx-smoke/build.py
```

`build-aven.sh` uses the patched checkout in the isolated worktree. It configures and builds Aven without GDAL and FFmpeg; `link-aven.sh` supplies the browser-specific flags and a strict undefined-symbol check. The preliminary `make` log records the first missing wx archive alias; `aven-link-strict.log` records the final link after aliases were fixed.

To recreate dependencies, use the exact source pins in the manifest, initialize wx submodules `src/png`, `src/jpeg`, `src/expat`, `3rdparty/pcre`, `3rdparty/nanosvg`, install/activate Emscripten 6.0.6 in scratch, build the local Autoconf/Automake versions in `host-tools-build.json`, and run the saved wx/PROJ scripts. wx's generated archive names need aliases without `-wasm32-unknown-emscripten`, as done by the upstream PCBJam build. Preserve the observed `-lSM`/`-pthread` link filtering described in the result. Fetch `jspi-scheduler.js` from the pinned PCBJam commit to `scratch/support/`.

Generated Survex font/message/header resources were taken from the official 1.4.24 source archive recorded in the manifest. The Aven `.c`/`.cc` source remains the pinned checkout, with only `configure.ac` adapted. No production renderer change is included.

`fixtures/` keeps the native reference inputs, output `.3d`, exact dimensions and provenance. Their checks passed natively; the Aven browser runtime is blocked, so no cave/terrain rendering or feature parity is claimed.
