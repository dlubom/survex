#!/usr/bin/env python3
"""Independently count the HGT samples and triangles retained by Aven's radius.

Requires NumPy and pyproj. Reads the original HGT; writes JSON to stdout only.
This is a numerical grid oracle, not evidence of browser rendering.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import pyproj


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('hgt', type=Path)
    parser.add_argument('--reference', type=Path, default=Path(__file__).resolve().parent.parent / 'kataster-reference.json')
    args = parser.parse_args()
    reference = json.loads(args.reference.read_text())
    digest = hashlib.sha256(args.hgt.read_bytes()).hexdigest()
    if digest != reference['hgt']['sha256']:
        parser.error('HGT hash differs from the audited source')
    n = reference['hgt']['shape'][0]
    raw = np.memmap(args.hgt, dtype='>i2', mode='r', shape=(n, n))
    transform = pyproj.Transformer.from_crs(4326, 32634, always_xy=True)
    longitude = 19 + np.arange(n) / (n - 1)
    masks = {name: np.zeros((n, n), dtype=bool) for name in ('full', 'czarna')}
    for first in range(0, n, 64):
        rows = np.arange(first, min(first + 64, n))
        lon, lat = np.meshgrid(longitude, 50 - rows / (n - 1))
        east, north = transform.transform(lon, lat)
        for name, mask in masks.items():
            model = reference['models'][name]
            mask[first:first+len(rows)] = ((east-model['offset'][0])**2 + (north-model['offset'][1])**2 <= model['radius']**2) & (raw[first:first+len(rows)] != -32768)
    results = {}
    for name, mask in masks.items():
        valid = mask[:-1, :-1].astype(np.uint8) + mask[1:, :-1] + mask[:-1, 1:] + mask[1:, 1:]
        samples = int(mask.sum())
        triangles = int((valid == 3).sum() + 2 * (valid == 4).sum())
        expected = reference['models'][name]
        results[name] = {'samples': samples, 'triangles': triangles, 'vertices': triangles * 3, 'pass': samples == expected['hgt_samples_retained'] and triangles == expected['hgt_triangles_expected']}
    passed = all(result['pass'] for result in results.values())
    print(json.dumps({'result': 'PASS' if passed else 'FAIL', 'numpy': np.__version__, 'pyproj': pyproj.__version__, 'PROJ': pyproj.proj_version_str, 'hgt_sha256': digest, 'models': results}, indent=2))
    return not passed


if __name__ == '__main__':
    sys.exit(main())
