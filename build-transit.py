"""Build offline transport overlays from Geofabrik OSM extract.

Usage: PYTHONPATH=/tmp/roma-metro-deps python3 build-transit.py ../centro-261028.osm.pbf
Output: js/transit.js (no runtime network dependency).
"""
import json
import sys
from collections import Counter
from pathlib import Path
import osmium

BASE = Path(__file__).resolve().parent
BBOX = (12.15, 41.62, 12.86, 42.13)

def inside(lon, lat):
    return BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]

class Transit(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.tracks = []
        self.stations = []
        self.stats = Counter()

    def node(self, n):
        tags = n.tags
        rail = tags.get('railway', '')
        public = tags.get('public_transport', '')
        if rail not in {'station', 'halt', 'stop'} and public not in {'station', 'stop_position', 'platform'}:
            return
        if not n.location.valid() or not inside(n.location.lon, n.location.lat):
            return
        name = tags.get('name', '').strip()
        if not name:
            return
        subway = tags.get('station') == 'subway' or tags.get('subway') == 'yes'
        train = tags.get('train') == 'yes' or rail in {'station', 'halt'} and not subway
        if not subway and not train:
            return
        self.stats['station_node_' + rail] += 1
        self.stations.append({'name': name, 'kind': 'metro' if subway else 'rail', 'coords': [round(n.location.lon, 6), round(n.location.lat, 6)], 'ref': tags.get('ref', ''), 'line': tags.get('line', '')})

    def way(self, w):
        tags = w.tags
        railway = tags.get('railway', '')
        if railway != 'subway':
            return
        name = tags.get('name', '')
        if name not in {'Metro A', 'Metro B', 'Metro B1', 'Metro C'}:
            return
        coords = []
        for n in w.nodes:
            if n.location.valid():
                coords.append([round(n.location.lon, 6), round(n.location.lat, 6)])
        if len(coords) < 2 or not any(inside(*p) for p in coords):
            return
        self.stats['way_' + railway] += 1
        self.tracks.append({'id': w.id, 'kind': railway, 'name': name, 'ref': tags.get('ref', ''), 'service': tags.get('service', ''), 'coords': coords})

if len(sys.argv) != 2:
    raise SystemExit('Specify .osm.pbf input')
t = Transit()
t.apply_file(sys.argv[1], locations=True, idx='flex_mem')
print('OSM counts', t.stats)
print('Metro sample', [x for x in t.stations if x['kind'] == 'metro'][:12])
print('Track tags', Counter((x['kind'], x['name'], x['ref']) for x in t.tracks).most_common(15))
dedup = {}
for station in t.stations:
    key = (station['kind'], station['name'].split(' (')[0].casefold(), round(station['coords'][0], 3), round(station['coords'][1], 3))
    dedup.setdefault(key, station)
out = {'tracks': t.tracks, 'stations': list(dedup.values()), 'attribution': '© OpenStreetMap contributors (ODbL); Geofabrik Centro Italia 2026-10-28'}
(BASE / 'js' / 'transit.js').write_text('window.ROMA_TRANSIT=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
