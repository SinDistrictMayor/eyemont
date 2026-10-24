"""911 snapshot (Actions only). Fetches city Socrata datasets server-side, keeps only non-person call types (allowlist),
and writes data/911.json with {type,time,lat,lon (2 dp),city,source,license}. No addresses or raw coordinates reach the client."""
import json,re,urllib.request,urllib.parse,datetime,os,concurrent.futures as cf
UA={'User-Agent':'Eyemont/1.0 (https://github.com/SinDistrictMayor/eyemont'+(('; '+os.environ['CONTACT_EMAIL']) if os.environ.get('CONTACT_EMAIL') else '')+')'}
ALLOW=re.compile(r"fire|alarm|smoke|brush|grass|vegetation|wildland|hazmat|haz-?mat|hazardous|gas leak|odor of gas|natural gas|gas odor|collision|crash|accident|traffic hazard|trfc hazd|traffic (?:incident|collision|accident)|transportation incident|road hazard|roadway|debris|power line|wires? down|line down|tree down|tree in road|water rescue|swift water|flood|electrical|transformer|explosion|fuel spill|spill|lightning|outside fire|vehicle fire|dumpster",re.I)
DENY=re.compile(r"firearm|discharg|hold ?up|traffic stop|violation|\*\*pd|\bpd\b|assist|medic|\bems\b|\baid\b|injur|\bpi\b|w/i|fatal|death|dead|doa|assault|missing|coroner|domestic|\bdv\b|sex|rape|crisis|mental|suicid|overdose|\bod\b|person|child|juvenile|welfare|shoot|shot|stab|weapon|fight|disturb|ambulance|cardiac|breath|fall|sick|trauma|pedestrian|trapped|victim|burglar|theft|robbery|intox|dui|hit and run|hit & run|patient|unconscious|lift assist|elevator rescue|police|arrest|warrant|suspicious|threat|harass|stalk|abuse|neglect|kidnap|abduct|psych|bomb threat|alarm.*(panic|holdup|duress)|(panic|holdup|duress).*alarm",re.I)
import re as _re
def GENERIC(t):
    """Genericize call types that imply a trapped/injured person."""
    if _re.search(r'extricat|entrap|pinned|trapped|injur|ejected|fatal|rollover with', t, _re.I): return 'Traffic accident' if _re.search(r'accident|crash|collision|vehicle|mva|tc\b|rollover', t, _re.I) else 'Rescue call'
    return t
def pick(o,p):
    for k in p.split('.'): o=o.get(k) if isinstance(o,dict) else None
    return o
def tm(r,f):
    v=' '.join(str(pick(r,k) or '') for k in f.split('+')).strip()
    for s in (v,v[:19]):
        try:
            d=datetime.datetime.fromisoformat(s.replace('Z','+00:00').replace(' ','T',1) if 'T' not in s else s.replace('Z','+00:00'))
            return d
        except Exception: pass
    return None
D=json.load(open('.github/dispatch.json'))['datasets'];now=datetime.datetime.now(datetime.timezone.utc);calls=[];ok=0;stat={}
def one(ds):
    q=urllib.parse.urlencode({'$order':ds['order'],'$limit':300})
    r=json.loads(urllib.request.urlopen(urllib.request.Request(ds['url']+'?'+q,headers=UA),timeout=30).read());out=[];drop=0
    for x in r:
        ty=str(pick(x,ds['type']) or '').strip()
        if not ty or not ALLOW.search(ty) or DENY.search(ty): drop+=1;continue
        t=tm(x,ds['time']) if ds.get('time') else None
        if t is not None:
            if t.tzinfo is None:  # local time without zone: accept generous window
                t=t.replace(tzinfo=datetime.timezone.utc)
            if (now-t).total_seconds()>86400+14*3600 or (t-now).total_seconds()>14*3600: continue
        elif ds.get('time'): continue
        la=lo=None
        try:
            if ds.get('latf','').startswith('@'):
                g=pick(x,ds['latf'][1:]);lo,la=float(g['coordinates'][0]),float(g['coordinates'][1])
            elif ds.get('latf'): la,lo=float(pick(x,ds['latf'])),float(pick(x,ds['lonf']))
        except Exception: pass
        approx=not(la and lo and abs(la-ds['lat'])<1 and abs(lo-ds['lon'])<1)
        if approx: la,lo=ds['lat'],ds['lon']
        ty=GENERIC(ty)
        out.append({'type':ty.title()[:60],'time':t.strftime('%Y-%m-%dT%H:%M:%SZ') if t else None,'lat':round(la,2),'lon':round(lo,2),'city':ds['city'],'source':ds['portal'],'license':ds['license'],**({'approx':1} if approx else {})})
    return out,drop
with cf.ThreadPoolExecutor(8) as ex:
    fs={ex.submit(one,ds):ds for ds in D}
    for f in cf.as_completed(fs):
        ds=fs[f]
        try: o,dr=f.result();calls+=o;ok+=1;stat[ds['id']]=f'ok {len(o)} kept, {dr} dropped by type'
        except Exception as e: stat[ds['id']]='fail';print('FEED FAIL 911',ds['id'],str(e)[:120])
json.dump({'updated':now.strftime('%Y-%m-%dT%H:%M:%SZ'),'ok':ok,'total':len(D),'status':stat,'calls':calls},open('data/911.json','w'),separators=(',',':'))
print('911',len(calls),'calls',ok,'/',len(D),'ok')
