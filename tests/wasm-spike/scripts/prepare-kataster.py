#!/usr/bin/env python3
"""Prepare the audited local Kataster acceptance inputs without changing sources.

Requires Python 3 and native Survex 1.4.24 (cavern, survexport, dump3d).
No network, NumPy, GDAL, resampling, reprojection or vertical shift is used.
The source checkout and raw HGT must match the committed audit reference.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import zipfile


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Existing local Kataster checkout')
    parser.add_argument('output', type=Path, help='New scratch directory, outside the source checkout')
    parser.add_argument('--reference', type=Path, default=Path(__file__).resolve().parent.parent / 'kataster-reference.json')
    for tool in ('cavern', 'survexport', 'dump3d'):
        parser.add_argument('--' + tool, default=tool)
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    reference = json.loads(args.reference.read_text())
    if output == source or source in output.parents:
        parser.error('Output must be outside the source checkout')
    if output.exists():
        parser.error('Output already exists; choose a new scratch directory')

    def git(*options):
        return subprocess.check_output(['git', '-C', str(source), *options], text=True).strip()

    if git('rev-parse', 'HEAD') != reference['provenance']['commit']:
        parser.error('Source commit differs from the audited reference')
    if git('status', '--porcelain'):
        parser.error('Source checkout must be clean for this pinned reproduction')
    hgt = source / 'Powierzchnia/Survex/N49E019_VF1.hgt'
    if sha(hgt) != reference['hgt']['sha256']:
        parser.error('HGT hash differs from the audited source')
    versions = {}
    for name in ('cavern', 'survexport', 'dump3d'):
        version = subprocess.check_output([getattr(args, name), '--version'], text=True).splitlines()[0]
        if not re.search(r'\b1\.4\.24\b', version):
            parser.error(name + ' must be the audited Survex 1.4.24')
        versions[name] = version
    assets = output / 'assets'
    assets.mkdir(parents=True)
    commands = []
    environment = dict(os.environ, SOURCE_DATE_EPOCH='0')

    def run(log, *command):
        commands.append(list(command))
        result = subprocess.run(command, cwd=output, env=environment, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        (output / log).write_text(result.stdout)
        result.check_returncode()
        return result.stdout

    compile_log = run('cavern.log', args.cavern, '-o', str(assets / 'kataster.3d'), str(source / 'KATASTER.wpj'))
    if re.search(r'\b(?:warning|error):', compile_log, re.I):
        raise ValueError('Compilation produced diagnostics; inspect cavern.log')
    run('survexport.log', args.survexport, '--survey=Czarna', '--3d', '--legs', '--surface-legs', '--splays', '--station-names', '--entrances', '--fixes', '--exports', str(assets / 'kataster.3d'), str(assets / 'czarna.3d'))
    full = run('kataster.dump', args.dump3d, '--legs', str(assets / 'kataster.3d'))
    czarna = run('czarna.dump', args.dump3d, '--legs', str(assets / 'czarna.3d'))
    subset = run('czarna-source-filter.dump', args.dump3d, '--legs', '--survey=Czarna', str(assets / 'kataster.3d'))

    def geometry(dump):
        nodes, legs = Counter(), Counter()
        for line in dump.splitlines():
            if line.startswith('NODE '):
                nodes[line] += 1
            elif line.startswith('LEG '):
                legs[tuple(map(float, line.split()[1:7]))] += 1
        return nodes, legs

    if geometry(czarna) != geometry(subset):
        raise ValueError('Native Czarna export changed geometry or node flags')
    counts = {}
    for name, dump in [('full', full), ('czarna', czarna)]:
        counts[name] = dict(Counter(line.split()[0] for line in dump.splitlines() if line.split()))
        for record in ('LEG', 'NODE', 'XSECT'):
            if counts[name].get(record, 0) != reference['models'][name]['counts'].get(record, 0):
                raise ValueError(name + ': unexpected ' + record + ' count')
    shutil.copyfile(hgt, assets / hgt.name)
    raw = hgt.read_bytes()
    n = reference['hgt']['shape'][0]
    col, row, width, height = reference['crop']['source_pixel_window']
    step = 1 / (n - 1)
    bil = b''.join(raw[2*((row+i)*n+col):2*((row+i)*n+col+width)] for i in range(height))
    (assets / 'czarna-terrain.bil').write_bytes(bil)
    hdr = ['BYTEORDER M', 'LAYOUT BIL', f'NROWS {height}', f'NCOLS {width}', 'NBANDS 1', 'NBITS 16', 'PIXELTYPE SIGNEDINT', f'BANDROWBYTES {width*2}', f'TOTALROWBYTES {width*2}', f'ULXMAP {19+col*step:.17g}', f'ULYMAP {50-row*step:.17g}', f'XDIM {step:.17g}', f'YDIM {step:.17g}', 'NODATA -32768', 'SKIPBYTES 0', '']
    (assets / 'czarna-terrain.hdr').write_text('\n'.join(hdr))
    (assets / 'czarna-terrain.prj').write_text('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]\n')
    with zipfile.ZipFile(assets / 'czarna-terrain.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for suffix in ('hdr', 'prj', 'bil'):
            filename = 'czarna-terrain.' + suffix
            item = zipfile.ZipInfo(filename, date_time=(1980, 1, 1, 0, 0, 0))
            item.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(item, (assets / filename).read_bytes())
    for name in ('czarna-terrain.bil', 'czarna-terrain.hdr', 'czarna-terrain.prj'):
        if sha(assets / name) != reference['assets'][name]['sha256']:
            raise ValueError(name + ' differs from the audited lossless crop')
    if git('status', '--porcelain'):
        raise ValueError('Source status changed during preparation')
    manifest = {'source': str(source), 'commit': git('rev-parse', 'HEAD'), 'tools': versions, 'commands': commands, 'counts': counts, 'source_status_after': '', 'crop': reference['crop'], 'assets': {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(assets.iterdir())}, 'note': 'Reproducible .3d timestamps and ZIP metadata differ from the original run; geometry, node flags and raw crop are checked. No vertical shift applied.'}
    (output / 'preparation.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'result': 'PASS', 'assets': str(assets), 'counts': counts}, indent=2))


if __name__ == '__main__':
    main()
