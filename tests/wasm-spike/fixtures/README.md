# Fixtures for the direct Aven + wxWidgets + Emscripten spike

Prepared 2026-10-31. Originally prepared in scratch; this directory preserves a copy of the experiment inputs and evidence. Native tools: `/opt/homebrew/bin/cavern` and `/opt/homebrew/bin/dump3d`, both Survex 1.4.24. No Aven rendering is claimed by these fixture checks.

## Files to preload/open

| File | Origin and intended check | NODE labels | LINE records | XSECT records / tubes |
| --- | --- | ---: | ---: | ---: |
| `real-nordalpenschacht-205.3d` | Actual historical Nordalpenschacht survey from the official Survex sample archive; ordinary cave rendering, hierarchy, station picking | 20 | 17 | 0 / 0 |
| `bundled-passage.3d` | Repository regression fixture `tests/passage.svx`, **not claimed as field data**; LRUD including missing dimensions | 4 | 3 | 14 / 5 |
| `synthetic-2180.3d` | **Synthetic, not a real cave**; exact geometry, EPSG:2180, LRUD, one surface leg | 7 | 6 | 7 / 2 |
| `synthetic-terrain.bil` + `.hdr` | **Synthetic, not measured topography**; WGS84 raster for terrain import/PROJ | n/a | n/a | n/a |
| `synthetic-terrain.zip` | Same BIL/HDR plus CRS sidecar in one archive for a single-file terrain picker | n/a | n/a | n/a |

All three `.svx` files were compiled with exit code 0. `.cavern.log`, `.dump`, and `.legs.dump` preserve the native evidence. `fixture-counts.json` contains machine-readable expected record counts. `sha256.json` records input/output hashes; `.3d` generation timestamps mean rebuilding can change binary hashes.

## Actual cave: Nordalpenschacht, 1623/205

The requested local `data/` directory does not exist in this checkout. Local `tests/` contains regression fixtures, so an invented regression was not relabelled as real survey data. Repository `doc/getstart.rst` points to the official archive:

https://survex.com/software/sample.tar.gz

It was downloaded on 2026-10-31 to `sample.tar.gz` and extracted to `official-sample/` after rejecting absolute paths, parent path components, symlinks and hardlinks. The selected source is:

`official-sample/sample/loser/caves/205/205.svx`

`real-nordalpenschacht-205.svx` is a byte-for-byte copy. The source identifies Nordalpenschacht on the Loser/Augst-Eck plateau, Totes Gebirge, Austria, survey dates 1999-07-26 and 1999-07-29, with named teams including Becka Lawson, Brian Outram, Mark Shinwell and Earl Merson. This evidence establishes the fixture as historical survey data, not a newly invented test cave. The source and authorship comments remain intact; no licence beyond the source distribution is inferred here.

Native cavern reports 20 survey stations and 19 legs, total survey length **90.75 m**, zero loops, vertical range **38.83 m**. The resulting `.3d` has **20 NODE labels**, **18 unique coordinate tuples**, and **17 LINE records**. The source has two `*equate` statements and distinct labels at coincident positions; therefore compare each counter with the same definition rather than asserting 19 drawn lines. Summing distances from rounded `.3d` coordinates gives 90.7422216764 m, which is not the unrounded native survey statistic.

The source has no fixed coordinates or CRS in standalone form. Cavern assigns `205.1.0` to `(0,0,0)` and reports this. This fixture must **not** be overlaid on the Polish synthetic DEM. The extra dimensions in one table are read under `ignoreall`, and no passage data is active: the `.3d` has zero XSECT records. They were not silently converted to LRUD.

Native processing emits **10 legacy metadata warnings** concerning historical `*team` / `*instrument` syntax; these are retained in `real-nordalpenschacht-205.cavern.log`. There are no compilation errors. The source was not edited to suppress warnings.

## Synthetic metric cave and projection

`synthetic-2180.svx` is visibly labelled **SYNTHETIC** in comments and title. Horizontal CRS is `EPSG:2180` (Poland CS92), used for both input/output. Source and `.3d` coordinates are normalized **easting, northing, z**, as used by Survex/Aven. Heights are arbitrary synthetic metres; no real vertical datum or real site survey is asserted.

The synthetic entrance source fix is `(E=565478.124426, N=154000.073675, Z=1500)`, corresponding to longitude 19.9°, latitude 49.25° under the native PROJ conversion. `.3d` rounds this to `(565478.12, 154000.07, 1500.00)`.

| Leg | Cartesian displacement (m) | Exact length (m) | Flag |
| --- | --- | ---: | --- |
| a → b | +10, 0, 0 | 10 | underground |
| b → c | 0, +20, 0 | 20 | underground |
| c → d | 0, 0, −5 | 5 | underground |
| d → e | −15, 0, 0 | 15 | underground |
| b → f | +3, +4, −12 | 13 | underground |
| a → s | 0, −10, 0 | 10 | surface |

Native cavern reports **63.00 m survey length** (surface leg excluded), while all six `.3d` line lengths sum to **73.00 m**. The vertical range of underground stations is 12 m; `synthetic.f` is at 1488 m. LRUD is provided for the main tube a–b–c–d–e and branch b–f: seven records, six distinct stations, two tubes. `synthetic.a` is ENTRANCE and FIXED; a and s are surface stations, and a is also underground.

For the native `cs2cs` CLI the formal EPSG:2180 axis order is **northing, easting**; the verification script deliberately swaps `.3d` E,N when supplying this CLI. Its output CRS `OGC:CRS84` is longitude, latitude. `synthetic-stations-wgs84.txt` records the conversion of every station. Do not copy the CLI axis order into Aven rendering buffers.

Reproduce the entrance transform:

```sh
/opt/homebrew/bin/cs2cs EPSG:4326 EPSG:2180 -f '%.6f' <<'INPUT'
49.250000 19.900000 1500
INPUT
# Output N E Z: 154000.073675 565478.124426 1500.000000
```

## Synthetic BIL terrain

- 65 × 65 samples, one band, signed little-endian int16, row-major order; 8,450 bytes.
- WGS84 longitude/latitude. Northwest **sample centre** is (19.8968°, 49.2532°); southeast sample centre is (19.9032°, 49.2468°).
- `XDIM=YDIM=0.0001` degrees. Samples proceed east with columns and south with rows.
- At column/row 32/32, height = 1510 m; overall range 1502–1518 m. NoData sentinel −32768 is declared; the fixture contains no NoData samples.
- Generator formula is `1510 + round((column - 32)/8) + round((row - 32)/8)` using Python's `round`.
- Heights and shape are intentionally synthetic. The entrance lies approximately 10 m below the central terrain sample; this is a deliberate diagnostic, not a survey discrepancy to correct.
- Every projected station was verified inside the DEM sample extent.

`synthetic-terrain.json` records these properties. `.prj` is an explicit WGS84 sidecar for external inspection. Current Aven's `GfxCore::DrawTerrain` assumes WGS84 input, transforms it to the survey CRS with PROJ, and normalizes for visualization; it does not require the `.prj` sidecar. BIL/HDR checks used the parser keys and 16-bit constraints from `src/gfxcore.cc`. Actual native or browser GUI terrain rendering remains the root agent's integration check.

## Reproduction and verification

To rebuild a fixture from this directory:

```sh
/opt/homebrew/bin/cavern -o synthetic-2180 synthetic-2180.svx
/opt/homebrew/bin/dump3d synthetic-2180.3d > synthetic-2180.dump
/opt/homebrew/bin/dump3d --legs synthetic-2180.3d > synthetic-2180.legs.dump
```

Apply the same commands to `bundled-passage` and `real-nordalpenschacht-205`. For exact checks of record counts, synthetic lengths, known fix coordinates, station coverage, terrain binary values and ZIP CRC:

```sh
python3 /private/tmp/aven-wasm-spike/fixtures/verify_fixtures.py
```

The verification completed with `PASS`. This confirms fixture integrity and native processing; it is not evidence that the web port, wxWidgets drawing, WebGL, LRUD visualization or browser terrain import works.
