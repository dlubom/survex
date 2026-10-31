#!/bin/bash
set -euo pipefail
task_root="${1:-/private/tmp/aven-wasm-spike}"
mkdir -p "$task_root/proj-downloads" "$task_root/proj-src"
curl -fsSL https://download.osgeo.org/proj/proj-9.7.0.tar.gz \
  -o "$task_root/proj-downloads/proj-9.7.0.tar.gz"
curl -fsSL https://www.sqlite.org/2025/sqlite-amalgamation-3490100.zip \
  -o "$task_root/proj-downloads/sqlite-amalgamation-3490100.zip"
# Hashes record the bytes fetched from the official hosts for this experiment.
# They are repeatability pins, not independently authenticated release signatures.
/opt/homebrew/bin/python3 - "$task_root" <<'PY'
from pathlib import Path
import hashlib, sys, tarfile, zipfile
root = Path(sys.argv[1])
expected = {
    'proj-9.7.0.tar.gz': '65705ecd987b50bf63e15820ce6bd17c042feaabda981249831bd230f6689709',
    'sqlite-amalgamation-3490100.zip': '6cebd1d8403fc58c30e93939b246f3e6e58d0765a5cd50546f16c00fd805d2c3',
}
for filename, wanted in expected.items():
    actual = hashlib.sha256((root / 'proj-downloads' / filename).read_bytes()).hexdigest()
    if actual != wanted:
        raise SystemExit(f'SHA256 mismatch for {filename}: {actual}')
    print(filename, actual)
if not (root / 'proj-src/proj-9.7.0/CMakeLists.txt').exists():
    with tarfile.open(root / 'proj-downloads/proj-9.7.0.tar.gz') as archive:
        archive.extractall(root / 'proj-src', filter='data')
if not (root / 'proj-src/sqlite-amalgamation-3490100/sqlite3.c').exists():
    with zipfile.ZipFile(root / 'proj-downloads/sqlite-amalgamation-3490100.zip') as archive:
        archive.extractall(root / 'proj-src')
PY
