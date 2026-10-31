#!/usr/bin/env python3
"""Compare observed Aven WASM DEM vertices with independent native PROJ."""
import argparse
import json
import math
import subprocess

p = argparse.ArgumentParser()
p.add_argument('snapshot', help='JSON from ({state:Module.avenTest,gl:Module.avenGL})')
p.add_argument('--cs2cs', default='cs2cs')
a = p.parse_args()
data = json.load(open(a.snapshot))
s = data['state']
t = s['terrain']
assert (t['width'], t['height'], t['triangles'], len(t['samples'])) == (65, 65, 8192, 4225)
# Native authority axis order: EPSG:4326 latitude,longitude; EPSG:2180 north,east.
proc = subprocess.run([a.cs2cs, '-f', '%.12f', 'EPSG:4326', 'EPSG:2180'],
    input=''.join(f'{v["source"][1]} {v["source"][0]} {v["source"][2]}\n' for v in t['samples']),
    capture_output=True, text=True, check=True)
reference = [list(map(float, row.split())) for row in proc.stdout.splitlines()]
assert len(reference) == len(t['samples'])
xy_error = max(math.hypot(v['world'][0]-r[1], v['world'][1]-r[0]) for v,r in zip(t['samples'],reference))
z_error = max(abs(v['world'][2]-r[2]) for v,r in zip(t['samples'],reference))
assert xy_error < .001 and z_error == 0
centre = next(v for v in t['samples'] if (v['column'],v['row']) == (32,32))
entrance = next(v for v in s['model']['stations'] if v['name']=='synthetic.a')
delta = [x-y for x,y in zip(centre['world'],entrance['world'])]
assert math.hypot(*delta[:2]) < .01 and delta[2] == 10
assert all(abs(v['world'][i]-v['local'][i]-t['offset'][i]) < 1e-8 for v in t['samples'] for i in range(3))
stations = s['model']['stations']
back = subprocess.run([a.cs2cs, '-f', '%.12f', 'EPSG:2180', 'EPSG:4326'],
    input=''.join(f'{v["world"][1]} {v["world"][0]} {v["world"][2]}\n' for v in stations),
    capture_output=True, text=True, check=True)
grid = {(v['column'],v['row']):v['source'][2] for v in t['samples']}
clearance = {}
for station, row in zip(stations, back.stdout.splitlines()):
    lat, lon, _ = map(float,row.split())
    x = (lon - 19.8968) / .0001
    y = (49.2532 - lat) / .0001
    ix, iy = math.floor(x), math.floor(y)
    assert 0 <= ix < 64 and 0 <= iy < 64
    dx, dy = x-ix, y-iy
    height = sum(grid[ix+cx,iy+cy] * (dx if cx else 1-dx) * (dy if cy else 1-dy)
                 for cx in (0,1) for cy in (0,1))
    assert abs(height-1510) < 1e-8
    clearance[station['name']] = round(height-station['world'][2],9)
assert clearance == {'synthetic.a':10,'synthetic.b':10,'synthetic.c':10,
                     'synthetic.d':15,'synthetic.e':15,'synthetic.f':22,'synthetic.s':10}
print(json.dumps({'result':'PASS','station_clearance_m':clearance,'native_vertices_compared':len(reference),
    'native_max_horizontal_error_m':xy_error,'native_max_vertical_error_m':z_error,
    'centre':centre,'entrance':entrance,'centre_minus_entrance_m':delta,
    'all_local_world_offsets_match':True,'triangles':t['triangles']},indent=2))
