#!/usr/bin/env python3
"""GDELT 2.0 Events snapshot -> data/gdelt.json.
GDELT GEO 2.0 API is gone (404) and DOC API has no coordinates, so we read the
open 15-minute Events export (free, no key, attribution required). Polite: last 4
files (1 h), sequential, 2 s apart, one retry. Events are at place level
(ActionGeo = city/ADM1/country centroid) - never people."""
import csv, io, json, time, urllib.request, zipfile, datetime, collections, sys
csv.field_size_limit(10**7)
UA={'User-Agent':'eyemont-snapshot (github.com/SinDistrictMayor/eyemont)'}
def get(u):
    for i in range(2):
        try: return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read()
        except Exception as e:
            print('retry',u,e,file=sys.stderr); time.sleep(10)
    return None
ROOT={'14':'Protest','18':'Assault','19':'Fight','20':'Mass violence','13':'Threaten','17':'Coerce','15':'Force posture','10':'Demand','11':'Disapprove','12':'Reject','16':'Reduce relations'}
def main():
    lu=get('https://data.gdeltproject.org/gdeltv2/lastupdate.txt')
    if not lu: return keep()
    url=lu.decode().split('\n')[0].split()[2].replace('http:','https:')
    ts=datetime.datetime.strptime(url.rsplit('/',1)[1][:14],'%Y%m%d%H%M%S')
    by=collections.OrderedDict(); seen=set(); files=0
    for k in range(4):
        t=(ts-datetime.timedelta(minutes=15*k)).strftime('%Y%m%d%H%M%S')
        if k: time.sleep(2)
        z=get(f'https://data.gdeltproject.org/gdeltv2/{t}.export.CSV.zip')
        if not z: continue
        files+=1
        with zipfile.ZipFile(io.BytesIO(z)) as zf:
            for r in csv.reader(io.TextIOWrapper(zf.open(zf.namelist()[0]),'utf-8','replace'),delimiter='\t'):
                if len(r)<61 or not r[56] or not r[57] or r[51]=='1': continue  # skip country-centroid
                root=r[28]
                if root not in ROOT: continue          # conflict/protest/tension only
                u=r[60]
                if u in seen: continue
                seen.add(u)
                lat,lon=round(float(r[56]),2),round(float(r[57]),2)   # ~1 km, place centroid
                key=(r[52],lat,lon)
                g=by.setdefault(key,{'place':r[52],'cc':r[53],'adm1':r[54],'lat':lat,'lon':lon,'n':0,'kinds':collections.Counter(),'urls':[]})
                g['n']+=1; g['kinds'][ROOT[root]]+=1
                if len(g['urls'])<6: g['urls'].append(u)
    if not by: return keep()
    ev=sorted(by.values(),key=lambda g:-g['n'])[:600]
    for g in ev: g['kinds']=[k for k,_ in g['kinds'].most_common(3)]
    json.dump({'updated':ts.strftime('%Y-%m-%dT%H:%M:%SZ'),'files':files,'events':ev},open('data/gdelt.json','w'),separators=(',',':'))
    print('gdelt',len(ev),'places from',files,'files')
def keep():
    try:
        d=get('https://sindistrictmayor.github.io/eyemont/data/gdelt.json')
        if d: open('data/gdelt.json','wb').write(d); print('kept previous'); return
    except Exception: pass
    json.dump({'updated':None,'files':0,'events':[]},open('data/gdelt.json','w'))
main()
