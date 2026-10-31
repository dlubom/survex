# Current limits and archived reproductions

Stage 4 packages the pinned wx fork and actual Aven for static hosting. The old failures below are preserved as historical reproductions, not current open issues. Run instructions and checks are in [README](README.md).

## Stage 4: default scene and optional local files

The Pages wrapper starts the full Kataster and zipped HGT automatically. Its file input accepts `.3d`, `.hgt` and terrain ZIP files through the normal Aven loaders; it does not send local files to a server. This path, scene restoration, 11 core Aven interactions, all synthetic DEM vertices and a 10,000-point real DEM sample pass on the stage-4 build. Native compilation and 8/8 suites pass. See `evidence/stage4/manifest.json` for exact sources, artifacts and scope; native GUI parity was not repeated for stage 4.

Unsupported WebAssembly JSPI/WebGL2 gets a visible message, not a blank canvas. Chromium was tested; other browser engines remain unaccepted. A missing app page also gets a visible diagnostic. The downloadable static directory is relocatable, but rebuilding still needs prepared dependencies. File persistence, performance/FPS measurements and a clean-machine dependency installer remain future work.

The first published build produced a delayed scheduler warning after dismissing an invalid-file modal. Cause: the new JSPI export was missing the scheduler activation wrapper. This is fixed by registering `aven_open_files` in the Aven bootstrap. `pages/browser-file-error-check.js` fails before and passes after; the modal activation ends normally and the next valid file opens without warnings. See `evidence/pages-modal-fix/`.

## Resolved in stage 3

| Previous failure | Regression or evidence |
| --- | --- |
| Toolbar inputs overlap icons; statusbar outside the frame | `browser-ui-check.js`: input layout and dimensions before/after resize, search and Z stretch. |
| ArrowUp then Enter does not activate the tree station | `browser-ui-check.js`: real keyboard sequence selects the newly highlighted row. |
| Z-stretch edits are not committed when focus leaves | wx DOM blur sends focus loss; `browser-ui-check.js` exercises Tab/blur. |
| First wheel movement after DEM jumps | One scale in `GLACanvas`; `scale-regression.cc` fails before the fix and passes after; browser checks the first ordinary wheel event after DEM. |
| Picking misses a station at a hit-grid cell boundary | Search adjacent cells within the pick radius; the previously failing model click now picks its station. |
| Odd-length HGT could reach an invalid data read | Reject odd byte counts before allocation and invalid dimensions after reading; `browser-malformed-hgt-check.js` confirms the diagnostic and subsequent valid DEM load. |
| Raw HGT shifts the surface by tens of metres | Point spacing `1/(N−1)`, confirmed against native PROJ for every retained Czarna vertex and a capped full-model sample. |
| A no-coverage terrain modal disrupts recording/rendering | Defer the normal diagnostic until after display-list recording; `browser-terrain-recovery-check.js` then loads a valid HGT. |
| Full Kataster terrain exceeds memory | Compact retained operations and bounded triangle batches; actual browser renders 2,369,843 triangles with observed WASM heap 253,165,568 B. |
| Native startup dereferences a null converter | `wxConvFile` lazy accessor; reproducer and actual native window succeed after the change. |

Final checks pass: core (11 actions), UI (12 checks), modes (15 checks), raw/cropped/full Kataster (3 scenarios), no-coverage recovery and malformed HGT. Browser console errors/warnings and recorded GL errors are zero. The final native build passes 8/8 suites and the scale regression; its actual GUI displays Czarna, HGT, names, tree and a selected station. See the [stage-3 report](../../doc/AVEN_WASM_SPIKE.md) for evidence and the narrower native navigation comparison. Native stderr retains a macOS `sandbox_extension` warning.

## Data boundaries that remain

- Real Kataster uses EPSG:32634, raw HGT EPSG:4326 point samples. Heights are passed unchanged. Their vertical datum is not established; numerical coordinate preservation does not prove geodetic height agreement.
- The HGT tile does not cover `Koszowa:0`, `SzczelinaNadLejem:0` or `WyzKoszowaDziura:0`. No synthetic extension, fitted vertical shift or modification of source surveys was applied.
- The fresh Walls import has no LRUD records. Survex's Walls reader currently ignores the source LRUD; LRUD acceptance uses the bundled/synthetic fixtures. This does not establish that the original surveys have no LRUD measurements.
- Full-model DEM observations deliberately capture at most 10,000 vertices, while counters cover all 1,186,869 retained samples and 2,369,843 triangles. Only the captured vertices have a point-by-point native-PROJ comparison. All 18,539 cave station records are compared independently.
- Native `survexport` produces a geometrically exact Czarna subset, but removes its outer prefix and does not preserve every leg style/name or `ERROR_INFO`. Use the full `.3d` for metadata checks.

## Not yet accepted or not included

- Full visual parity of lighting, textures, fog, line smoothing, wireframe and characters outside the fixture set. Running a mode without errors is a narrower result than image parity.
- Firefox/Safari, touch/HiDPI, context-loss recovery, all CRS/grid transformations and sustained large-model performance. The recorded heap size is neither browser process memory nor a peak-memory/FPS benchmark.
- Persistent storage of local files. The stage-4 wrapper's file input works; the original File/Open dialog still reads MEMFS paths. Reload discards user files.
- GDAL/FFmpeg, browser `cavern`/`extend`, printing, exports and movies.

Command lists still upload replayed geometry each frame. Profile the real large model before adding persistent GPU caches. Original Kataster `.3d` and DEM payloads are not committed. Compressed observations contain derived coordinates and sampled heights; screenshots depict the data. See [attribution and evidence scope](README.md#repeat-the-real-kataster--hgt-experiment).

## Archived stage-2 failures

The following text is the original stage-2 record. Its statements about open bugs and native startup describe that earlier build; use the current status above for stage 3.

Observed with the committed acceptance fixtures, Chromium 156.0.8078.74 and wx fork `01b74ea19a09968277f59475f8919f2d2a4ff00e`. Start the server as described in [README](README.md). These cases remain open; passing mouse navigation and DEM registration do not imply that they pass.

### Toolbar controls overlap icons

1. Open `http://127.0.0.1:8766/aven.html` at 1200×802.
2. The Find stations and Z-stretch input controls occupy the left side of the toolbar, over its icons.

Evidence: [startup/selection screenshot](evidence/webgl2/final-real-names-tree-selection.png). Search and Z-stretch usability has not been accepted.

Cause in the pinned wx fork: `src/wasm/toolbar.cpp`, `WasmRebuildTools()` (line 173) skips `tool->IsControl()`; `Realize()` (line 76) does not assign positions or reserved slots to these child controls. Aven uses the existing `AddControl()` API. Fixing the toolkit's control layout is the next step.

### Statusbar below the visible frame

1. Start at the same viewport; move the pointer over a station.
2. The normal statusbar cannot be read; the content extends slightly below the viewport. Resizing does not repair the layout.

Cause in the pinned wx fork: `src/wasm/frame.cpp:183`, `GetClientAreaOrigin()` starts with `wxFrameBase::GetClientAreaOrigin()`, which already includes toolbar height (`src/common/framecmn.cpp:242`), then adds it again at `frame.cpp:198`. `DoGetClientSize()` subtracts it once. The overflow is toolbar height minus statusbar height, consistent with the observed 2 px. A frame containing a menu, toolbar, statusbar and filling child exercises this path. No statusbar success is claimed.

### Enter does not activate the newly highlighted tree station

1. Run [browser-check.js](browser-check.js) through the real-model station selection, or click station `205.2.17` on the model and focus its tree row.
2. Press ArrowUp: station `205.2.16` becomes highlighted.
3. Press Enter: `Module.avenTest.there` remains `205.2.17`.
4. Double-click the row `205.2.16`: `there` changes correctly. This mouse path is included in the passing acceptance test.

Cause: Aven handles Return in `EVT_CHAR` (`src/aventreectrl.cc:116,448`). The fork's `src/wasm/keyboard.cpp:302`, `KeyCodeNeedsCharEvent()`, synthesizes character events for arrows, but omits Return. Deferred JSPI keydown dispatch (`src/wasm/app.cpp:1332`) suppresses the browser default for non-printable `Enter`, preventing the fallback browser `keypress`. Waiting after ArrowUp does not fix the missing event. [Observed state](evidence/webgl2/tree-activation-repro.png).

### First wheel zoom after loading DEM jumps

1. Open `?fixture=synthetic-2180`.
2. Use `File → Open Terrain…` to load `/fixtures/synthetic-terrain.zip`.
3. Move over the model and make one small wheel movement. The framing jumps far more than the wheel step predicts. Later steps behave normally.

Cause is in common Aven code already present at the stage-1 baseline: both `GfxCore` and `GLACanvas` own `m_Scale`. Terrain changes the volume diameter through `GfxCore::UpdateVolumeDiameter()` → `GLACanvas::SetVolumeDiameter()` (`src/gla-gl.cc:712`); its nonvirtual base `SetScale()` adjusts only the base value. `GUIControl::OnMouseWheel()` (`src/guicontrol.cc:493`) then computes the next zoom from the stale derived `GetScale()` and overwrites both values. The synthetic terrain changes the volume diameter by approximately 54×. Native visual reproduction is blocked by the independent startup problem below.

The acceptance script uses the ordinary wheel handler to frame the cave after loading terrain and records that action. The DEM coordinates, local offsets and heights are verified independently of camera scale. Smooth continuity of this first zoom is **not** accepted.

### Native GUI startup blocked by an existing converter bug

The default native build and all eight existing test suites pass. GUI startup with host wxWidgets 3.3.4 fails before `wxEntry`: Aven dereferences `wxConvFileName`, which is still null. Rebuilding the previous baseline's `aven.cc` produces the same SIGSEGV. This is not evidence of desktop rendering parity.

Minimal [reproducer](wx-converter-repro.cc), using the same host `wx-config`:

```sh
clang++ $(wx-config --cxxflags) tests/wasm-spike/wx-converter-repro.cc $(wx-config --libs core) -o /tmp/wx-converter-repro
/tmp/wx-converter-repro
clang++ -DSAFE_ACCESSOR $(wx-config --cxxflags) tests/wasm-spike/wx-converter-repro.cc $(wx-config --libs core) -o /tmp/wx-converter-safe
/tmp/wx-converter-safe
```

The direct access prints null then exits with signal 11; the lazy `wxConvFile` accessor returns successfully. [Recorded results](evidence/webgl2/wx-converter-repro.json), [native build and baseline comparison](evidence/webgl2/native-summary.json). The desktop source path was preserved rather than incorporating an unrelated startup fix in this experiment.

### Not tested or not included

- Full visual parity for optional fog, lighting, texturing, line smoothing and wireframe modes; labels outside the fixture character set.
- Firefox/Safari, touch/HiDPI, context loss, large-model performance, all CRS and grid transformations.
- Import of arbitrary host files: the existing file dialog currently reads bundled MEMFS fixtures. GDAL and FFmpeg are excluded from this WASM build.
- Browser use of cavern/extend, printing, export and movies.

Command lists currently upload replayed geometry each frame. Profiling larger models should precede GPU caching. Native GUI comparison should follow a separately scoped converter fix.
