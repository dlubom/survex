from pathlib import Path
import collections, hashlib, json, math, re, struct, subprocess, zipfile
R = Path(__file__).resolve().parent
names = ['synthetic-2180', 'bundled-passage', 'real-nordalpenschacht-205']
expected = {'synthetic-2180': (7,6,7,2), 'bundled-passage': (4,3,14,5), 'real-nordalpenschacht-205': (20,17,0,0)}
summary = {}
for name in names:
    text = (R / (name+'.legs.dump')).read_text()
    rows = text.splitlines()
    counts = collections.Counter(line.split()[0] for line in rows if line)
    actual = tuple(counts[k] for k in ['NODE','LEG','XSECT','XSECT_END'])
    assert actual == expected[name], (name, actual)
    nodes = {}
    lengths = []
    for line in rows:
        p = line.split()
        if p and p[0] == 'NODE':
            nodes[re.search(r'\[(.*?)\]',line)[1]] = tuple(map(float,p[1:4]))
        if p and p[0] == 'LEG':
            xyz = list(map(float,p[1:7]))
            lengths.append({'metres_from_rounded_3d':math.dist(xyz[:3],xyz[3:]), 'surface':'SURFACE' in p})
    summary[name] = {'node_labels':counts['NODE'],'unique_coordinate_tuples':len(set(nodes.values())),'rendered_line_records':counts['LEG'],'xsect_records':counts['XSECT'],'xsect_tubes':counts['XSECT_END'],'cs':next((l[3:] for l in rows if l.startswith('CS ')),None),'sum_line_lengths_from_rounded_3d':sum(x['metres_from_rounded_3d'] for x in lengths),'surface_line_records':sum(x['surface'] for x in lengths)}
    if name == 'synthetic-2180':
        assert [round(x['metres_from_rounded_3d'],8) for x in lengths] == [10,20,5,15,13,10]
        assert summary[name]['sum_line_lengths_from_rounded_3d'] == 73
        assert nodes['synthetic.a'] == (565478.12,154000.07,1500.0)
        # EPSG:2180 formal axis order for cs2cs is northing,easting.
        # .3d / Aven use normalized easting,northing.
        input_text = ''.join(f'{y} {x} {z}\n' for x,y,z in nodes.values())
        p = subprocess.run(['/opt/homebrew/bin/cs2cs','EPSG:2180','OGC:CRS84','-f','%.10f'],input=input_text,capture_output=True,text=True,check=True)
        (R/'synthetic-stations-wgs84.txt').write_text('cs2cs EPSG:2180 OGC:CRS84; input N E Z, output lon lat Z\n'+p.stdout)
        meta=json.loads((R/'synthetic-terrain.json').read_text())
        west,north=meta['northwest_sample_lon_lat'];east,south=meta['southeast_sample_lon_lat']
        for name2,line in zip(nodes,p.stdout.splitlines()):
            lon,lat,z=map(float,line.split())
            assert west <= lon <= east and south <= lat <= north, (name2,lon,lat)
        summary[name]['all_stations_inside_dem_sample_extent']=True
n=65
bil=(R/'synthetic-terrain.bil').read_bytes()
assert len(bil)==n*n*2
values=struct.unpack('<'+'h'*(n*n),bil)
assert values[32*n+32]==1510
assert min(values)==1502 and max(values)==1518
with zipfile.ZipFile(R/'synthetic-terrain.zip','w',zipfile.ZIP_DEFLATED) as z:
    for suffix in ['hdr','bil','prj']:
        z.write(R/('synthetic-terrain.'+suffix),'synthetic-terrain.'+suffix)
with zipfile.ZipFile(R/'synthetic-terrain.zip') as z:
    assert z.testzip() is None
summary['terrain']={'bil_bytes':len(bil),'nrows':n,'ncols':n,'centre_height_m':1510,'min_m':min(values),'max_m':max(values),'zip_crc_ok':True}
(R/'fixture-counts.json').write_text(json.dumps(summary,indent=2)+'\n')
hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(R.iterdir()) if p.is_file() and p.suffix in ['.svx','.3d','.bil','.hdr','.prj','.zip'] or p.name=='sample.tar.gz'}
(R/'sha256.json').write_text(json.dumps(hashes,indent=2)+'\n')
print(json.dumps(summary,indent=2))
print('PASS: counts, known lengths, projected positions, DEM coverage, binary DEM, ZIP CRC')
