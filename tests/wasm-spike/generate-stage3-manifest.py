#!/usr/bin/env python3
"""Hash the current stage3 evidence/source snapshot; no build or UI claims inferred.

Run after copying final evidence and editing the report. Use --check to detect
missing/changed evidence or source files without regenerating the manifest.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys

PRODUCT_FILES = [
    'configure.ac', 'src/Makefile.am', 'src/aven.cc', 'src/aven-webgl.cc',
    'src/aven-webgl.h', 'src/aven-webgl-matrix.h', 'src/gfxcore.cc',
    'src/gfxcore.h', 'src/gla-gl.cc', 'src/gla.h', 'src/glbitmapfont.cc',
    'src/mainfrm.cc', 'src/mainfrm.h', 'src/model.cc', 'src/guicontrol.cc',
    'src/log.cc', 'src/log.h', 'lib/images/texture.png', 'doc/AVEN_WASM_SPIKE.md',
]


def describe(path):
    data = path.read_bytes()
    result = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    if path.name.endswith('.json.gz'):
        raw = gzip.decompress(data)
        json.loads(raw)  # Also verify that the archived observation is valid JSON.
        result.update(uncompressed_bytes=len(raw),
                      uncompressed_sha256=hashlib.sha256(raw).hexdigest())
    return result


def evidence_paths(directory):
    return sorted(p for p in directory.rglob('*')
                  if p.is_file() and p != directory / 'manifest.json')


def check_manifest(repo, evidence, manifest):
    failures = []
    for section, base in [('source_files', repo), ('evidence_files', evidence)]:
        for name, expected in manifest[section].items():
            path = base / name
            if not path.is_file() or describe(path) != expected:
                failures.append(section + ': ' + name)
    recorded = set(manifest['evidence_files'])
    present = {str(p.relative_to(evidence)) for p in evidence_paths(evidence)}
    failures += ['unrecorded evidence: ' + p for p in sorted(present - recorded)]
    if failures:
        raise SystemExit('\n'.join(failures))
    print('PASS: source and evidence hashes match manifest')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path,
                        default=Path(__file__).resolve().parents[2])
    parser.add_argument('--evidence-dir', type=Path,
                        help='Default: REPO/tests/wasm-spike/evidence/stage3')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    repo = args.repo.resolve()
    evidence = (args.evidence_dir or
                repo / 'tests/wasm-spike/evidence/stage3').resolve()
    target = evidence / 'manifest.json'
    if args.check:
        check_manifest(repo, evidence, json.loads(target.read_text()))
        return
    paths = [repo / p for p in PRODUCT_FILES]
    test_root = repo / 'tests/wasm-spike'
    paths += [p for p in test_root.rglob('*') if p.is_file()
              and 'evidence' not in p.relative_to(test_root).parts
              and '__pycache__' not in p.parts and p.suffix != '.pyc'
              and not any(part.startswith('.') for part in p.relative_to(test_root).parts)]
    sources = {str(p.relative_to(repo)): describe(p) for p in sorted(set(paths))}
    # These records identify sources actually compiled/tested. A mismatch is
    # actionable; a fresh manifest must not silently relabel old test results.
    for filename, key in [('native-summary.json', 'source_hashes'),
                          ('adapter-replay.json', 'source_sha256')]:
        record = json.loads((evidence / filename).read_text())
        for name, expected in record[key].items():
            if sources[name]['sha256'] != expected:
                raise SystemExit('Tested source hash mismatch in ' + filename + ': ' + name)
    files = {str(p.relative_to(evidence)): describe(p) for p in evidence_paths(evidence)}
    head = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
    full = json.loads((evidence / 'full-final-verification.json').read_text())
    output = {
        'schema_version': 1,
        'date': '2026-10-31',
        'git_head_at_capture': head,
        'identity_scope': 'Working-tree file hashes identify the captured sources. git_head_at_capture is context, not a claim that an uncommitted tree was already that commit.',
        'wx_upstream_commit': '01b74ea19a09968277f59475f8919f2d2a4ff00e',
        'source_files': sources,
        'evidence_files': files,
        'evidence_bytes': sum(x['bytes'] for x in files.values()),
        'scope': {
            'browser': 'Actual Aven in Chromium, UI interactions, console checks and visual screenshots; see individual result records.',
            'adapter_replay': 'Actual adapter capture/replay inspected by a CPU GL sink. It verifies commands, attributes and vertices; it is not a CPU or GPU rasterisation oracle.',
            'synthetic_terrain': 'All 4225 observed fixture vertices compared with native PROJ; seven station clearances checked.',
            'full_kataster_terrain': {
                'vertex_comparison_coverage': full['coverage'],
                'samples_verified': full['samples_verified'],
                'retained_samples': full['retained_samples_reported'],
                'triangles': full['triangles_reported'],
                'count_validation': 'Retained sample and triangle counts independently checked over the full mesh; coordinates checked only for the captured subset.',
                'vertical_datum': full['vertical_datum'],
            },
            'native': 'Build, eight CLI test suites, actual scale regression and final native GUI verification have separate records. native-ui.stderr.log contains an OS launch diagnostic.',
            'png': 'texture-profile-fix.json records removal of invalid iCCP metadata, with all other chunks byte-identical; this is not a rendered-image comparison.',
            'before_evidence': 'Files named *before* and before-* record resolved failures, not final-run errors.',
        },
    }
    target.write_text(json.dumps(output, indent=2, sort_keys=True) + '\n')
    print('Wrote ' + str(target) + ': ' + str(len(files)) + ' evidence files, ' +
          str(output['evidence_bytes']) + ' bytes')


if __name__ == '__main__':
    main()
