"""Offline OSM road extractor for Roma Lab.

Usage: PYTHONPATH=/tmp/roma-lab-deps python build-roads.py ../centro-261028.osm.pbf
Input is a Geofabrik OSM extract; output js/roads.js is self-contained.
Requires pyosmium + shapely only at build time, not in the browser.
"""
import json, math, sys
from pathlib import Path
import osmium
from shapely.geometry import shape, LineString, MultiLineString
from shapely.ops import unary_union
from shapely.strtree import STRtree

BASE=Path(__file__).resolve().parent
sources=[('quartieri','NOME_QUART'),('rioni','NOME_RIONE'),('suburbi','NOME_SUBUR'),('zone','NOME_ZONA')]
features=[]
for stem,field in sources:
    features.extend(json.loads((BASE/f'{stem}-source.geojson').read_text())['features'])
geometries=[shape(f['geometry']).buffer(0) for f in features]
tree=STRtree(geometries)
city=unary_union(geometries)
minlon,minlat,maxlon,maxlat=city.bounds

# Same geographic projection as build-map.mjs
def merc(lon,lat): return lon*111320*math.cos(math.radians(41.88)),lat*111320
allxy=[]
for f in features:
    for ring in f['geometry']['coordinates']:
        allxy.extend(merc(*point) for point in ring)
xmin=min(p[0] for p in allxy);xmax=max(p[0] for p in allxy)
ymin=min(p[1] for p in allxy);ymax=max(p[1] for p in allxy)
scale=min(970/(xmax-xmin),690/(ymax-ymin));dx=(1020-(xmax-xmin)*scale)/2;dy=(740-(ymax-ymin)*scale)/2
def pixel(p):
    x,y=merc(*p)
    return [round(dx+(x-xmin)*scale,2),round(740-dy-(y-ymin)*scale,2)]

major={'motorway':0,'trunk':1,'primary':2,'secondary':3,'tertiary':4,
       'motorway_link':1,'trunk_link':2,'primary_link':3,'secondary_link':4,'tertiary_link':5}
local={'residential','unclassified','living_street','service'}
segments=[]; crossing={}; scanned=0; kept=0

def rings_from_geom(geom):
    if geom.is_empty:return []
    if isinstance(geom,LineString):return [list(geom.coords)]
    if isinstance(geom,MultiLineString):return [list(g.coords) for g in geom.geoms]
    return [list(g.coords) for g in getattr(geom,'geoms',[]) if isinstance(g,LineString)]

class Roads(osmium.SimpleHandler):
    def way(self,w):
        global scanned,kept
        highway=w.tags.get('highway')
        if highway not in major and highway not in local:return
        if w.tags.get('access') in {'private','no'}:return
        if len(w.nodes)<2:return
        coords=[]
        try:
            for n in w.nodes:
                if n.location.valid():coords.append((n.location.lon,n.location.lat))
        except (ValueError,RuntimeError):return
        if len(coords)<2:return
        if all(x<minlon-.012 or x>maxlon+.012 or y<minlat-.012 or y>maxlat+.012 for x,y in coords):return
        scanned+=1
        line=LineString(coords)
        if not line.intersects(city):return
        # The same short OSM way must enter both polygons to count as a direct link.
        candidates=tree.query(line)
        areas=[]
        for i in candidates:
            i=int(i)
            if line.intersection(geometries[i]).length>0.000025:areas.append(i)
        direct=[]
        if len(areas)>1:
            for a in range(len(areas)):
                for b in range(a+1,len(areas)):
                    i,j=sorted((areas[a],areas[b]))
                    if geometries[i].distance(geometries[j])<0.00009:direct.append((i,j))
        if highway not in major and not direct:return
        # Simplify for efficient SVG while retaining OSM line shape; preserve actual geographic alignment.
        clipped=line.intersection(city)
        paths=[]
        geo=[]
        for ring in rings_from_geom(clipped):
            if len(ring)<2:continue
            pix=[pixel(p) for p in LineString(ring).simplify(.000025,preserve_topology=False).coords]
            if len(pix)<2:continue
            paths.append('M'+'L'.join(f'{x},{y}' for x,y in pix))
            geo.append([[round(x,6),round(y,6)] for x,y in LineString(ring).simplify(.000025,preserve_topology=False).coords])
        if not paths:return
        name=w.tags.get('name') or w.tags.get('ref') or ''
        kind='arteria' if highway in major else 'collegamento'
        priority=major.get(highway,6)
        sid=len(segments)
        segments.append({'id':sid,'name':name,'highway':highway,'kind':kind,'priority':priority,'coords':geo})
        kept+=1
        for a,b in direct:
            key=(a,b)
            rank=(priority,0 if name else 1,-line.length)
            if key not in crossing or rank<crossing[key][0]:
                crossing[key]=(rank,{'a':a,'b':b,'name':name or 'Collegamento senza nome','highway':highway,'segment':sid,'kind':kind})

if len(sys.argv)!=2:raise SystemExit('Pass path to .osm.pbf')
Roads().apply_file(sys.argv[1],locations=True,idx='flex_mem')
links=[v[1] for v in crossing.values()]
out={'segments':segments,'links':links,'stats':{'ways_scanned':scanned,'ways_kept':kept,'direct_pairs':len(links)},'attribution':'© OpenStreetMap contributors (ODbL), Geofabrik Centro Italia 2026-10-28'}
(BASE/'js'/'roads.js').write_text('/* Generated real road geometries from OpenStreetMap (ODbL) */\nwindow.ROMA_ROADS='+json.dumps(out,separators=(',',':'),ensure_ascii=False)+';\n')
print(out['stats'])
