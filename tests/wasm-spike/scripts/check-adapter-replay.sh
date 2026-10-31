#!/bin/bash
set -euo pipefail
# Uses the pinned SDK prepared for the WASM experiment, with no browser or GUI.
TASK_ROOT=${TASK_ROOT:-/private/tmp/aven-wasm-spike}
AVEN_SOURCE=${AVEN_SOURCE:-$(cd "$(dirname "$0")/../../.." && pwd)}
AVEN_REPLAY_BUILD=${AVEN_REPLAY_BUILD:-${TMPDIR:-/tmp}/aven-webgl-replay-check}
export EMSDK_PYTHON=${EMSDK_PYTHON:-/opt/homebrew/bin/python3}
AVEN_REPLAY_NODE=${AVEN_REPLAY_NODE:-$(command -v node)}
mkdir -p "$AVEN_REPLAY_BUILD"
"$EMSDK_PYTHON" - "$AVEN_SOURCE" "$AVEN_REPLAY_BUILD" "$TASK_ROOT" "$AVEN_REPLAY_NODE" <<'PY'
import hashlib
import json
from pathlib import Path
import subprocess
import sys

source, build, task, node = sys.argv[1:]
source, build, task = Path(source).resolve(), Path(build).resolve(), Path(task).resolve()
test = source / 'tests/wasm-spike/adapter-replay-test.cc'
compiler = task / 'emsdk/upstream/emscripten/em++.py'
commands = [
    [sys.executable, str(compiler), '-std=c++17', '-O1', '-g',
     '-fwasm-exceptions', '-sSUPPORT_LONGJMP=wasm', '-sWASM_LEGACY_EXCEPTIONS=1',
     '-sALLOW_MEMORY_GROWTH=1', '-sMAXIMUM_MEMORY=2147483648',
     '-sMIN_WEBGL_VERSION=2', '-sMAX_WEBGL_VERSION=2',
     '-sENVIRONMENT=node', '-sASSERTIONS=1', '-sERROR_ON_UNDEFINED_SYMBOLS=1',
     '-Wall', '-Wextra', str(test), '-o', str(build / 'adapter-replay-test.js')],
    [node, str(build / 'adapter-replay-test.js')],
]
evidence = {
    'test': 'Actual adapter command capture/replay with inspecting CPU GL sink; not browser rasterisation',
    'source_sha256': {str(path.relative_to(source)): hashlib.sha256(path.read_bytes()).hexdigest()
                      for path in [source / 'src/aven-webgl.cc', source / 'src/aven-webgl.h',
                                   source / 'src/aven-webgl-matrix.h', test]},
    'maximum_memory_bytes': 2147483648,
    'triangle_count': 2369843,
    'replay_passes': 2,
    'expected_checked_vertices': 14219058,
    'steps': [],
}
for step, command in zip(['compile', 'run'], commands):
    result = subprocess.run(command, cwd=build, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT)
    log = build / f'adapter-replay-{step}.log'
    log.write_text(result.stdout)
    evidence['steps'].append({'name': step, 'command': command,
                              'exit_code': result.returncode, 'log': log.name})
    if step == 'run':
        evidence['output'] = result.stdout
    (build / 'adapter-replay.json').write_text(json.dumps(evidence, indent=2) + '\n')
    if result.returncode:
        print(result.stdout, end='')
        raise SystemExit(result.returncode)
print(evidence['output'], end='')
print('Evidence:', build / 'adapter-replay.json')
PY
