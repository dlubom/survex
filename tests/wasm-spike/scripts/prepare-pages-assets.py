#!/usr/bin/env python3
"""Make the default scene from the audited native Kataster preparation."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('inputs',type=Path,help='assets directory from prepare-kataster.py')
    p.add_argument('output',type=Path,help='New directory')
    a=p.parse_args()
    reference=json.loads((Path(__file__).resolve().parents[1]/'kataster-reference.json').read_text())
    if a.output.exists(): p.error('Output already exists')
    raw=(a.inputs/'N49E019_VF1.hgt').read_bytes()
    if hashlib.sha256(raw).hexdigest()!=reference['hgt']['sha256']: p.error('Unexpected HGT source')
    a.output.mkdir(parents=True)
    shutil.copy2(a.inputs/'kataster.3d',a.output/'kataster.3d')
    with zipfile.ZipFile(a.output/'terrain.zip','w') as archive:
        info=zipfile.ZipInfo('N49E019_VF1.hgt',(1980,1,1,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        archive.writestr(info,raw,compresslevel=9)
    with zipfile.ZipFile(a.output/'terrain.zip') as archive:
        assert archive.read('N49E019_VF1.hgt')==raw
    print(json.dumps({'output':str(a.output),'hgt_sha256':hashlib.sha256(raw).hexdigest(),
                      'files':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
                               for f in a.output.iterdir()}},indent=2))

if __name__=='__main__': main()
