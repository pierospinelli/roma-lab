"""Recompute OSM road / new 2026 district cross-boundary links.
Uses cached extracted real road polylines; no source download required.
Requires shapely at build time only.
"""
import json
from pathlib import Path
from shapely.geometry import shape,LineString
from shapely.strtree import STRtree

base=Path(__file__).resolve().parent
geo=json.loads((base/'js/districts.geojson').read_text())
geoms=[shape(f['geometry']).buffer(0) for f in geo['features']]
tree=STRtree(geoms)
source=(base/'js/roads.js').read_text()
roads=json.loads(source[source.index('window.ROMA_ROADS=')+len('window.ROMA_ROADS='):].strip().rstrip(';'))
best={}
for seg in roads['segments']:
    for coords in seg['coords']:
        if len(coords)<2:continue
        line=LineString(coords)
        touched=[]
        for index in tree.query(line):
            index=int(index)
            if line.intersection(geoms[index]).length>0.00002:
                touched.append(index)
        for ai in range(len(touched)):
            for bi in range(ai+1,len(touched)):
                a,b=sorted((touched[ai],touched[bi]))
                if geoms[a].distance(geoms[b])>=0.00009:continue
                rank=(seg['priority'],not bool(seg['name']),-line.length)
                if (a,b) not in best or rank<best[(a,b)][0]:
                    best[(a,b)]=(rank,{'a':a,'b':b,'name':seg['name'] or 'Collegamento senza nome',
                                        'highway':seg['highway'],'segment':seg['id'],'kind':seg['kind']})
roads['links']=[v[1] for v in best.values()]
roads['stats']['direct_pairs']=len(roads['links'])
(base/'js/roads.js').write_text('/* OpenStreetMap roads with revised district links */\nwindow.ROMA_ROADS='+json.dumps(roads,separators=(',',':'),ensure_ascii=False)+';\n')
print('Direct pairs:',len(best),'Areas with connections:',len({i for pair in best for i in pair}))
