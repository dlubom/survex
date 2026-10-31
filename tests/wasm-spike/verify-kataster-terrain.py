#!/usr/bin/env python3
"""Validate observed Aven terrain against raw HGT, native PROJ and native dump3d.

Only standard Python modules are used. Reads inputs; never modifies survey/DEM.
A capped sample list proves the captured vertices, not every rendered vertex.
"""
import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
import mmap
from pathlib import Path
import re
import struct
import subprocess
import sys


def load_json(path):
    opener = gzip.open if str(path).endswith('.gz') else open
    with opener(path, 'rt', encoding='utf-8') as stream:
        return json.load(stream)


def digest(path):
    value = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def triple(value):
    if len(value) != 3 or not all(math.isfinite(v) for v in value):
        raise ValueError('Expected three finite coordinates')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path, help='JSON or .json.gz: {state: Module.avenTest, gl: Module.avenGL}')
    parser.add_argument('--hgt', required=True, type=Path, help='Original, unchanged N49E019_VF1.hgt')
    parser.add_argument('--model3d', required=True, type=Path, help='Exact .3d loaded in the observed Aven run')
    parser.add_argument('--reference', type=Path, default=Path(__file__).with_name('kataster-reference.json'))
    parser.add_argument('--model', choices=('czarna', 'full'), required=True)
    parser.add_argument('--crop', action='store_true', help='Observed DEM is the lossless Czarna BIL crop')
    parser.add_argument('--cs2cs', default='cs2cs')
    parser.add_argument('--dump3d', default='dump3d')
    args = parser.parse_args()
    reference = load_json(args.reference)
    observed = load_json(args.snapshot)
    state = observed.get('state', observed)
    terrain, model = state['terrain'], state['model']
    expected = reference['models'][args.model]
    failures = []

    def check(ok, message):
        if not ok and message not in failures:
            failures.append(message)

    check(digest(args.hgt) == reference['hgt']['sha256'], 'HGT hash differs from audited source')
    check(model['crs'] == terrain['crs'] == reference['crs']['model'] == 'EPSG:32634', 'Expected Kataster EPSG:32634')
    size = args.hgt.stat().st_size
    dim = math.isqrt(size // 2)
    if dim < 2 or dim * dim * 2 != size:
        raise ValueError('HGT is not a square int16 point grid')
    match = re.match(r'([NS])(\d{2})([EW])(\d{3})(?:_|\.)', args.hgt.name, re.I)
    if not match:
        raise ValueError('HGT filename must encode its one-degree tile')
    south = int(match[2]) * (1 if match[1].upper() == 'N' else -1)
    west = int(match[4]) * (1 if match[3].upper() == 'E' else -1)
    north, step = south + 1, 1.0 / (dim - 1)
    col0, row0, width, height = reference['crop']['source_pixel_window'] if args.crop else (0, 0, dim, dim)
    check(not args.crop or args.model == 'czarna', 'Crop reference only applies to Czarna')
    check((terrain['width'], terrain['height']) == (width, height), 'DEM dimensions differ')
    check(max(abs(a-b) for a,b in zip(terrain['originLonLat'], (west+col0*step,north-row0*step))) < 1e-12, 'DEM sample origin differs')
    check(max(abs(a-step) for a in terrain['spacing']) < 1e-14, 'DEM grid spacing differs from 1/(dimension-1)')
    check(max(abs(a-b) for a,b in zip(model['offset'], expected['offset'])) < 1e-7, 'Model centre differs from native .3d bounds')
    check(max(abs(a-b) for a,b in zip(terrain['offset'], model['offset'])) < 1e-7, 'DEM and cave use different centres')

    # Native dump3d reads the supplied .3d independently of the WASM model.
    dump = subprocess.run([args.dump3d, '--legs', str(args.model3d)], capture_output=True, text=True, check=True)
    native_stations, native_legs = Counter(), 0
    flags = {'SURFACE':1, 'UNDERGROUND':2, 'ENTRANCE':4, 'EXPORTED':8, 'FIXED':16, 'ANON':32, 'WALL':64}
    for line in dump.stdout.splitlines():
        if line.startswith('LEG '):
            native_legs += 1
        elif line.startswith('NODE '):
            node = re.fullmatch(r'NODE\s+(\S+)\s+(\S+)\s+(\S+)\s+\[(.*)\](.*)', line)
            if not node:
                raise ValueError('Unrecognized dump3d NODE record')
            xyz = tuple(map(float, node.group(1, 2, 3)))
            bits = sum(flags[word] for word in node[5].split())
            native_stations[(node[4], *xyz, bits)] += 1
    observed_stations = Counter()
    max_station_rounding = max_local_error = 0.0
    for node in model['stations']:
        xyz, local = triple(node['world']), triple(node['local'])
        rounded = tuple(round(v,2) for v in xyz)
        max_station_rounding = max(max_station_rounding, *(abs(a-b) for a,b in zip(xyz,rounded)))
        observed_stations[(node['name'], *rounded, node['flags'] & 127)] += 1
        max_local_error = max(max_local_error, *(abs(x-y-o) for x,y,o in zip(xyz,local,model['offset'])))
    check(observed_stations == native_stations, 'Cave station coordinates/names/flags differ from native dump3d')
    check(max_station_rounding < 1e-7, 'Cave station precision differs from native centimetres')
    check(model['legs'] == native_legs == expected['geometry_legs'], 'Cave leg count differs')
    check(model['xsects'] == expected['lrud_xsects'], 'Cave cross-section count differs')

    samples = terrain['samples']
    if not samples:
        raise ValueError('No observed terrain vertices')
    total = terrain.get('sampleCount', len(samples))
    truncated = terrain.get('samplesTruncated', total != len(samples))
    check(total == expected['hgt_samples_retained'], 'Retained terrain sample count differs from native radius mask')
    check(terrain['triangles'] == expected['hgt_triangles_expected'], 'Terrain triangle count differs from native radius mask')
    check(total >= len(samples), 'Observed total smaller than captured sample list')
    check(bool(truncated) == (total > len(samples)), 'Inconsistent diagnostic truncation metadata')
    seen = set()
    max_source_angle_error = max_xy_error = max_z_error = 0.0
    cs2cs_command = [args.cs2cs, '-f', '%.12f', 'EPSG:4326', 'EPSG:32634']
    with open(args.hgt, 'rb') as stream, mmap.mmap(stream.fileno(), 0, access=mmap.ACCESS_READ) as raw:
        for start in range(0,len(samples),512):
            batch = samples[start:start+512]
            source = []
            for sample in batch:
                col, row = sample['column']+col0, sample['row']+row0
                if not (0 <= col < dim and 0 <= row < dim):
                    raise ValueError('Observed source pixel index outside HGT')
                check((col,row) not in seen, 'Duplicate observed terrain sample')
                seen.add((col,row))
                z = struct.unpack_from('>h', raw, 2*(row*dim+col))[0]
                check(z != -32768, 'NODATA source sample reached rendered geometry')
                lon, lat = west+col*step, north-row*step
                source.append((lon,lat,z))
                max_source_angle_error = max(max_source_angle_error, abs(sample['source'][0]-lon), abs(sample['source'][1]-lat))
                max_z_error = max(max_z_error, abs(sample['source'][2]-z))
            # EPSG:4326 authority axis order is latitude,longitude; UTM output E,N.
            result = subprocess.run(cs2cs_command, input=''.join(f'{lat:.17g} {lon:.17g} {z}\n' for lon,lat,z in source), text=True, capture_output=True, check=True)
            projected = [triple(list(map(float,line.split()))) for line in result.stdout.splitlines()]
            if len(projected) != len(batch):
                raise ValueError('Native PROJ returned wrong number of coordinates')
            for sample, xyz in zip(batch, projected):
                world, local = triple(sample['world']), triple(sample['local'])
                check((xyz[0]-expected['offset'][0])**2 + (xyz[1]-expected['offset'][1])**2 <= expected['radius']**2 + 1e-5, 'Captured terrain sample lies outside native radius mask')
                max_xy_error = max(max_xy_error, math.hypot(world[0]-xyz[0],world[1]-xyz[1]))
                max_z_error = max(max_z_error, abs(world[2]-xyz[2]))
                max_local_error = max(max_local_error, *(abs(x-y-o) for x,y,o in zip(world,local,terrain['offset'])))
    check(max_source_angle_error < 1e-12, 'Source lon/lat differs from independent HGT point grid')
    check(max_xy_error < .001, 'Rendered DEM XY differs from native PROJ by >=1mm')
    check(max_z_error == 0, 'DEM source height changed')
    check(max_local_error < 1e-7, 'World/local coordinates do not share the declared offset')
    gl = observed.get('gl', {})
    check(not(gl.get('adapterErrors') or gl.get('nativeErrors')), 'GL errors were recorded')
    output = {
        'result': 'FAIL' if failures else 'PASS', 'failures':failures,
        'coverage':'captured subset only' if truncated else 'all retained terrain vertices',
        'samples_verified':len(samples), 'retained_samples_reported':total,
        'retained_samples_expected':expected['hgt_samples_retained'],
        'triangles_reported':terrain['triangles'], 'triangles_expected':expected['hgt_triangles_expected'],
        'native_cave_stations_verified':sum(native_stations.values()), 'native_cave_legs':native_legs,
        'max_grid_lon_lat_error_deg':max_source_angle_error,
        'max_projected_xy_error_m':max_xy_error, 'max_source_height_error_m':max_z_error,
        'max_world_local_offset_error_m':max_local_error,
        'hgt_sha256':digest(args.hgt), 'model3d_sha256':digest(args.model3d),
        'snapshot_sha256':digest(args.snapshot), 'reference_sha256':digest(args.reference),
        'native_transform_command':cs2cs_command,
        'vertical_datum':'unknown; no vertical transformation or fitted shift applied',
    }
    print(json.dumps(output,indent=2))
    return bool(failures)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (KeyError,ValueError,OSError,subprocess.CalledProcessError) as exc:
        print(json.dumps({'result':'FAIL','failure':str(exc)},indent=2))
        sys.exit(1)
