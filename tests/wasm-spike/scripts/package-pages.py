#!/usr/bin/env python3
"""Package a built Aven scene as relocatable static files, without uploading."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--build', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True, help='New directory')
    p.add_argument('--assets', type=Path, required=True, help='Output of prepare-pages-assets.py')
    p.add_argument('--task-root', type=Path, default=Path('/private/tmp/aven-wasm-spike'))
    p.add_argument('--allow-dirty', action='store_true', help='Local preview only; omit source archive')
    args = p.parse_args()
    source = Path(__file__).resolve().parents[3]
    revision = subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()
    dirty = bool(subprocess.check_output(['git','status','--porcelain'],cwd=source,text=True))
    if dirty and not args.allow_dirty:
        p.error('Commit source changes before creating a publishable package')
    if args.output.exists(): p.error('Output exists; choose a new directory')
    payload = [args.build/'web'/('aven.'+ext) for ext in ('html','js','wasm','data')]
    # Reject a stale fixture build before attaching Kataster provenance to it.
    script = payload[1].read_text()
    if (source/'tests/wasm-spike/pages/kataster-bootstrap.js').read_text().strip() not in script:
        p.error('Build is missing the Kataster startup script; use AVEN_WEB_SCENE=kataster')
    metadata = re.search(r'loadPackage\((\{"files": .*?\})\);', script)
    if not metadata: p.error('Cannot inspect Emscripten preload metadata')
    entries = {f['filename']:f for f in json.loads(metadata.group(1))['files']}
    data = payload[3].read_bytes()
    scene_files = {}
    for name in ('kataster.3d','terrain.zip'):
        entry = entries.get('/external/'+name)
        asset = (args.assets/name).read_bytes()
        if not entry or data[entry['start']:entry['end']] != asset:
            p.error('Build does not contain the supplied '+name)
        scene_files[name] = {'bytes':len(asset),'sha256':hashlib.sha256(asset).hexdigest()}
    hashes = {f.name:digest(f) for f in payload}
    bundle = hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest()[:20]
    app_path = 'app/'+bundle
    app = args.output/app_path
    app.mkdir(parents=True)
    for f in payload: shutil.copy2(f,app/f.name)
    templates = source/'tests/wasm-spike/pages'
    for name in ('index.html','viewer.css','viewer.js','about.html'):
        text = (templates/name).read_text().replace('__AVEN_APP_URL__',app_path+'/aven.html')
        text = text.replace('__SOURCE_URL__','https://github.com/dlubom/survex/tree/'+revision)
        (args.output/name).write_text(text)
    (args.output/'.nojekyll').touch()
    licenses = args.output/'licenses'
    licenses.mkdir()
    shutil.copy2(source/'COPYING',licenses/'Survex-GPL.txt')
    shutil.copy2(args.task_root/'wxwidgets/docs/licence.txt',licenses/'wxWidgets.txt')
    notices = {
        'wxWidgets-LGPL.txt':'wxwidgets/docs/lgpl.txt',
        'PROJ.txt':'proj-src/proj-9.7.0/COPYING',
        'libpng.txt':'wxwidgets/src/png/LICENSE',
        'JPEG.txt':'wxwidgets/src/jpeg/README',
        'Expat.txt':'wxwidgets/src/expat/expat/COPYING',
        'PCRE.txt':'wxwidgets/3rdparty/pcre/LICENCE',
        'NanoSVG.txt':'wxwidgets/3rdparty/nanosvg/LICENSE.txt',
        'Emscripten.txt':'emsdk/upstream/emscripten/LICENSE',
        'musl.txt':'emsdk/upstream/emscripten/system/lib/libc/musl/COPYRIGHT',
        'libcxx.txt':'emsdk/upstream/emscripten/system/lib/libcxx/LICENSE.TXT',
        'zlib.txt':'emsdk/upstream/emscripten/cache/ports/zlib/zlib-1.3.2/LICENSE',
    }
    for name,path in notices.items(): shutil.copy2(args.task_root/path,licenses/name)
    (licenses/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Licencje</title><h1>Licencje bibliotek</h1><ul>'+''.join(
        '<li><a href="'+f.name+'">'+f.name+'</a></li>' for f in sorted(licenses.iterdir()))+'</ul><p>SQLite: public domain. This software is based in part on the work of the Independent JPEG Group.</p>')
    # Source archive travels with the executable; SDK/dependency source pins and
    # the wx patch are in this source tree, not substituted build-machine code.
    if not dirty:
        subprocess.run(['git','archive','--format=tar.gz','--prefix=survex/',
                        '-o',str(args.output.resolve()/'source.tar.gz'),revision],cwd=source,check=True)
    reference = json.loads((source/'tests/wasm-spike/kataster-reference.json').read_text())
    manifest = {'source_commit':revision,'preview_only':dirty,'app':app_path+'/aven.html',
                'default_scene':{'survey':'/external/kataster.3d','terrain':'/external/terrain.zip'},
                'scene_files':scene_files,
                'data_commit':reference['provenance']['commit'],'hgt_sha256':reference['hgt']['sha256'],
                'survey_license':'CC BY-SA 4.0','dem_author':'Jonathan de Ferranti / Viewfinder Panoramas',
                'dem_source':'https://viewfinderpanoramas.org/dem3.html',
                'vertical_shift':None,'files':{}}
    for f in sorted(args.output.rglob('*')):
        if f.is_file(): manifest['files'][f.relative_to(args.output).as_posix()]={'sha256':digest(f),'bytes':f.stat().st_size}
    (args.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'output':str(args.output),'app':manifest['app'],
                      'bytes':sum(f['bytes'] for f in manifest['files'].values()),'preview_only':dirty}))

if __name__ == '__main__': main()
