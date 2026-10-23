#!/usr/bin/env python3
"""Keyless sources that send no CORS header -> data/hazards.json. Sequential, 1 s apart; failures logged and skipped.
NASA FIRMS (VIIRS NOAA-20 US 24h CSV, aggregated to 0.1 deg cells), FAA TFR list (placed at state centroid),
FAA NAS airport events (major airport table), NOAA tsunami PTWC/NTWC Atom."""
import csv, io, json, time, urllib.request, re, xml.etree.ElementTree as ET, datetime
UA={'User-Agent':'Eyemont (https://github.com/SinDistrictMayor/eyemont)'}
def get(u):
    time.sleep(1)
    try: return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=45).read()
    except Exception as e: print('FEED FAIL',u,e); return None
out={'updated':datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),'status':{}}
BB=json.load(open('states-bbox.json')); CO=json.load(open('data/counties.json'))
AB={v['abbr']:k for k,v in CO.items()}
def stc(ab):
    n=AB.get(ab); b=BB.get(n) if n else None
    return ((b[0]+b[2])/2,(b[1]+b[3])/2,n) if b else None
# FIRMS
fires={}
r=get('https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_USA_contiguous_and_Hawaii_24h.csv')
if r:
    for x in csv.DictReader(io.StringIO(r.decode())):
        if x.get('confidence')=='low': continue
        k=(round(float(x['latitude']),1),round(float(x['longitude']),1))
        f=fires.setdefault(k,{'lat':k[0],'lon':k[1],'n':0,'frp':0.0,'t':''}); f['n']+=1; f['frp']=max(f['frp'],float(x['frp'] or 0)); f['t']=max(f['t'],x['acq_date']+'T'+x['acq_time'][:2]+':'+x['acq_time'][2:]+':00Z')
    out['status']['firms']=f'ok {len(fires)} cells'
out['fires']=sorted(fires.values(),key=lambda f:-f['frp'])[:4000]
# FAA TFR
tfr=[];r=get('https://tfr.faa.gov/tfrapi/exportTfrList')
if r:
    for x in json.loads(r):
        c=stc(x.get('state',''))
        if not c: continue
        tfr.append({'id':x['notam_id'],'type':x.get('type',''),'state':c[2],'lat':c[0],'lon':c[1],'desc':x.get('description','')[:200],'date':x.get('creation_date','')})
    out['status']['faa_tfr']=f'ok {len(tfr)}'
out['tfr']=tfr
# FAA NAS airport events
AP={'ATL':(33.64,-84.43),'LAX':(33.94,-118.41),'ORD':(41.97,-87.91),'DFW':(32.9,-97.04),'DEN':(39.86,-104.67),'JFK':(40.64,-73.78),'SFO':(37.62,-122.38),'SEA':(47.45,-122.31),'LAS':(36.08,-115.15),'MCO':(28.43,-81.31),'EWR':(40.69,-74.17),'CLT':(35.21,-80.94),'PHX':(33.43,-112.01),'IAH':(29.99,-95.34),'MIA':(25.79,-80.29),'BOS':(42.36,-71.01),'MSP':(44.88,-93.22),'FLL':(26.07,-80.15),'DTW':(42.21,-83.35),'PHL':(39.87,-75.24),'LGA':(40.78,-73.87),'BWI':(39.18,-76.67),'SLC':(40.79,-111.98),'SAN':(32.73,-117.19),'IAD':(38.95,-77.46),'DCA':(38.85,-77.04),'MDW':(41.79,-87.75),'TPA':(27.98,-82.53),'PDX':(45.59,-122.6),'HNL':(21.32,-157.92),'AUS':(30.19,-97.67),'BNA':(36.12,-86.68),'DAL':(32.85,-96.85),'HOU':(29.65,-95.28),'STL':(38.75,-90.37),'OAK':(37.72,-122.22),'SJC':(37.36,-121.93),'MSY':(29.99,-90.26),'RDU':(35.88,-78.79),'SMF':(38.7,-121.59),'SAT':(29.53,-98.47),'MCI':(39.3,-94.71),'CLE':(41.41,-81.85),'IND':(39.72,-86.29),'PIT':(40.49,-80.23),'CMH':(39.998,-82.89),'CVG':(39.05,-84.66),'SNA':(33.68,-117.87),'TEB':(40.85,-74.06),'HPN':(41.07,-73.71),'ANC':(61.17,-149.99),'BUR':(34.2,-118.36),'ONT':(34.06,-117.6),'RSW':(26.54,-81.76),'JAX':(30.49,-81.69),'OGG':(20.9,-156.43),'MKE':(42.95,-87.9),'ABQ':(35.04,-106.61),'BDL':(41.94,-72.68),'BUF':(42.94,-78.73)}
nas=[];r=get('https://nasstatus.faa.gov/api/airport-events')
if r:
    for x in json.loads(r):
        a=x.get('airportId');
        if a not in AP: continue
        kinds=[k for k in ('groundStop','groundDelay','arrivalDelay','departureDelay','airportClosure','freeForm','deicing') if x.get(k)]
        if not kinds: continue
        g=x.get('groundDelay') or x.get('groundStop') or x.get('arrivalDelay') or x.get('departureDelay') or {}
        nas.append({'apt':a,'lat':AP[a][0],'lon':AP[a][1],'kinds':kinds,'avg':g.get('avgDelay'),'max':g.get('maxDelay'),'why':g.get('impactingCondition') or g.get('reason'),'url':g.get('advisoryUrl')})
    out['status']['faa_nas']=f'ok {len(nas)}'
out['nas']=nas
# Tsunami
A='{http://www.w3.org/2005/Atom}';G='{http://www.w3.org/2003/01/geo/wgs84_pos#}';ts=[]
for c,u in (('PTWC','https://www.tsunami.gov/events/xml/PHEBAtom.xml'),('NTWC','https://www.tsunami.gov/events/xml/PAAQAtom.xml')):
    r=get(u)
    if not r: continue
    try:
        root=ET.fromstring(r)
        for e in root.findall(A+'entry'):
            la,lo=e.find(G+'lat'),e.find(G+'long')
            if la is None: continue
            summ=re.sub(r'<[^>]+>',' ',ET.tostring(e.find(A+'summary'),encoding='unicode')) if e.find(A+'summary') is not None else ''
            cat=re.search(r'Category:\s*(\w+)',summ)
            ts.append({'center':c,'title':(e.findtext(A+'title') or '').strip(),'updated':e.findtext(A+'updated'),'lat':float(la.text),'lon':float(lo.text),'cat':cat.group(1) if cat else '','url':'https://www.tsunami.gov/'})
        out['status']['tsunami_'+c]='ok'
    except Exception as e: print('FEED FAIL',u,e)
out['tsunami']=ts
import time as _t
# FEMA declarations, last 30 days, placed at state centroid
fema={}
try:
    since=(datetime.datetime.utcnow()-datetime.timedelta(days=30)).strftime('%Y-%m-%dT00:00:00.000Z')
    d=json.loads(get("https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1000&$orderby=declarationDate%20desc&$filter=declarationDate%20ge%20'"+since+"'"))
    for x in d.get('DisasterDeclarationsSummaries',[]):
        c=stc(x['state'])
        if not c: continue
        k=x['femaDeclarationString']
        f=fema.setdefault(k,{'id':k,'num':x['disasterNumber'],'state':c[2],'lat':round(c[0],2),'lon':round(c[1],2),'type':x['declarationType'],'inc':x['incidentType'],'title':x['declarationTitle'],'date':x['declarationDate'],'areas':0})
        f['areas']+=1
    out['status']['fema']=f'ok {len(fema)}'
except Exception as e: out['status']['fema']='fail '+str(e)[:80]; print('FEED FAIL fema',e)
out['fema']=list(fema.values())
# IODA country/region outage alerts (non-normal only), country approximation
CC={}
for n,la,lo,c in json.load(open('data/places.json')): CC.setdefault(c,[]).append((la,lo))
CC={k:(sum(a for a,b in v)/len(v),sum(b for a,b in v)/len(v)) for k,v in CC.items()}
ioda={}
try:
    now=int(_t.time())
    d=json.loads(get(f'https://api.ioda.inetintel.cc.gatech.edu/v2/outages/alerts?from={now-86400}&until={now}&entityType=country&limit=2000'))
    for a in d.get('data',[]):
        if a.get('level')=='normal': continue
        e=a['entity'];c=CC.get(e['name'])
        if not c: continue
        i=ioda.setdefault(e['code'],{'code':e['code'],'name':e['name'],'lat':round(c[0],1),'lon':round(c[1],1),'n':0,'src':set(),'t':0,'level':a['level']})
        i['n']+=1;i['src'].add(a['datasource']);i['t']=max(i['t'],a['time'])
    for i in ioda.values(): i['src']=sorted(i['src'])
    out['status']['ioda']=f'ok {len(ioda)}'
except Exception as e: out['status']['ioda']='fail '+str(e)[:80]; print('FEED FAIL ioda',e)
out['ioda']=list(ioda.values())
# SWPC space weather alerts (not geographic)
try:
    d=json.loads(get('https://services.swpc.noaa.gov/products/alerts.json'))
    cut=(datetime.datetime.utcnow()-datetime.timedelta(hours=24)).strftime('%Y-%m-%d %H:%M')
    sw=[]
    for a in d:
        if a['issue_datetime']<cut: continue
        m=[l for l in a['message'].replace('\r','').split('\n') if l.startswith(('ALERT','WARNING','WATCH','SUMMARY','EXTENDED'))]
        sw.append({'id':a['product_id'],'t':a['issue_datetime'][:16].replace(' ','T')+'Z','title':(m[0] if m else a['product_id'])[:160]})
    out['space']=sw[:30];out['status']['swpc']=f'ok {len(sw)}'
except Exception as e: out['space']=[];out['status']['swpc']='fail';print('FEED FAIL swpc',e)

print('hazards',{k:len(v) for k,v in out.items() if isinstance(v,list)},out['status'])

json.dump(out,open('data/hazards.json','w'),separators=(',',':'))
