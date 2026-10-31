# Stage 3 evidence

Final actual-Aven browser results are in `core-results.json`, `ui-results.json`,
`modes-results.json` (15 mode checks), `terrain-recovery-results.json`,
`malformed-hgt-results.json` and `kataster-results.json`. `final-console.log` is
from the final browser run. BEFORE records preserve the toolbar/picking defect
and the terrain-modal reentry/full-Kataster memory exhaustion cases.

`native-summary.json`, `native-check.log` and `scale-regression-after.json` cover
the final native build, eight CLI suites and actual Aven scale regression.
`native-ui.json` identifies the final interactive binary and screenshot.
The older bundle hashes inside `native-summary.json` record that the build job
preserved the running application; root subsequently replaced and relaunched it.
`native-ui.stderr.log` contains one macOS launch diagnostic, so native console
output is not described as empty. The sandboxed scale-launch failure is retained
separately from the successful run with Cocoa initialization permitted.

The four `*-final*.json.gz` files are lossless observations compressed with a
zero gzip timestamp. Decompress before passing them to the checked-in validators:

```sh
gzip -dc tests/wasm-spike/evidence/stage3/synthetic-final-vertices.json.gz > /tmp/aven-synthetic-final.json
python3 tests/wasm-spike/verify-browser-terrain.py /tmp/aven-synthetic-final.json
```

The synthetic verifier checks all 4,225 vertices and seven station clearances.
The real full-Kataster verifier checks **10,000 captured vertices out of
1,186,869 retained vertices**; it independently checks full retained-sample and
triangle counts (2,369,843 triangles). It does not claim a coordinate comparison
of every vertex. The HGT vertical datum is unknown; no vertical transformation or
fitted shift was applied.

The adapter replay harness inspects actual command/attribute/vertex output via
a CPU GL sink. It is not a rasterisation oracle. Browser screenshots provide
separate visual evidence. `texture-profile-fix.json` verifies that removal of
invalid iCCP metadata left all other PNG chunks, including IDAT, byte-identical.

`wx-patch-validation.json` records fresh application, idempotent second
application and rejection of a conflicting partial patch without modification.
The wx build logs contain pre-existing wxLogRecordInfo warnings. Subsequent UI
acceptance is recorded in `ui-results.json`.

After all evidence and report edits are integrated, regenerate and verify the
manifest from the repository root:

```sh
python3 tests/wasm-spike/generate-stage3-manifest.py
python3 tests/wasm-spike/generate-stage3-manifest.py --check
```

The generator checks native/replay tested-source hashes before writing. The
manifest hashes source and evidence files and stores both compressed and raw
JSON hashes. Its Git HEAD field is capture context; working-tree hashes are the
source identity for results obtained before the final commit.
