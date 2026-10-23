#!/usr/bin/env python3
"""RSS news snapshot -> data/news.json. Sequential, 1 s between feeds, 20 s timeout, max 30 items/feed, last 24 h.
Items are placed by a place name in headline/summary (same rules as the crowd layer), else at the outlet's home city (flagged)."""
import json, re, time, html, urllib.request, email.utils, datetime, xml.etree.ElementTree as ET
S=json.load(open('data/sources.json')); PL=json.load(open('data/places.json'))
AMB=set(open('.github/ambiguous.txt').read().split('\n'))-{''}
names=sorted({p[0] for p in PL},key=len,reverse=True)
RX=re.compile(r'(?<![^\W\d_])('+'|'.join(map(re.escape,names))+r')(?![^\W\d_])')
BY={p[0]:p for p in PL}
STATES=[p[0] for p in PL if p[3]=='United States' and p[0] not in AMB]
ST=re.compile(r'\b(?:'+'|'.join(map(re.escape,STATES))+r'|AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b')
Q=re.compile(r'"[^"\n]{1,120}"|“[^”\n]{1,120}”|‘[^’\n]{1,120}’')
def place(t):
    u=Q.sub(' ',t)
    for m in RX.finditer(u):
        n=m.group(1)
        if n in AMB and not ST.search(u[:m.start()]+' '+u[m.end():]): continue
        return BY[n]
def txt(e,*tags):
    for t in tags:
        x=e.find(t)
        if x is not None:
            if x.text and x.text.strip(): return x.text.strip()
            if x.get('href'): return x.get('href')
    return ''
def when(s):
    if not s: return None
    try: return email.utils.parsedate_to_datetime(s).astimezone(datetime.timezone.utc)
    except Exception: pass
    try: return datetime.datetime.fromisoformat(s.replace('Z','+00:00')).astimezone(datetime.timezone.utc)
    except Exception: return None
A='{http://www.w3.org/2005/Atom}';D='{http://purl.org/dc/elements/1.1/}';R='{http://purl.org/rss/1.0/}'
now=datetime.datetime.now(datetime.timezone.utc); out=[]; status={}
import threading, concurrent.futures, urllib.parse
LOCK=threading.Lock()
def one(f):
    try:
        raw=urllib.request.urlopen(urllib.request.Request(f['url'],headers={'User-Agent':'Mozilla/5.0 (eyemont news snapshot; github.com/SinDistrictMayor/eyemont)'}),timeout=15).read()
        root=ET.fromstring(raw)
    except Exception as e:
        status[f['id']]='error: '+str(e)[:80]; print('FEED FAIL',f['id'],f['url'],str(e)[:120]); return
    items=[]
    its=root.findall('.//item')+root.findall('.//'+R+'item')+root.findall('.//'+A+'entry'); n=0
    for it in its[:(10 if f.get('cat')=='news-us-local' else 30)]:
        title=html.unescape(re.sub('<[^>]+>','',txt(it,'title',R+'title',A+'title')))
        link=txt(it,'link',R+'link',A+'link'); summ=html.unescape(re.sub('<[^>]+>',' ',txt(it,'description',R+'description',A+'summary',A+'content')))
        t=when(txt(it,'pubDate',D+'date',A+'updated',A+'published'))
        if not title or not link.startswith('http'): continue
        if t and (now-t).total_seconds()>86400: continue
        p=place(title) or place(summ[:300]); home=p is None
        lat,lon=(p[1],p[2]) if p else S['homes'][f['home']]
        items.append({'title':title if f.get('credit') else title[:200],'url':link,'sum':re.sub(r'\s+',' ',summ).strip()[:(1000 if f.get('credit') else 240)],'src':f['id'],'time':t.isoformat() if t else None,
                    'lat':lat,'lon':lon,'place':p[0] if p else f['home'],'home':home}); n+=1
    with LOCK: out.extend(items); status[f['id']]=f'ok {n}'
HOSTS={}
for f in S['feeds']: HOSTS.setdefault(urllib.parse.urlparse(f['url']).hostname,[]).append(f)
def host(fs):
    for f in fs: one(f); time.sleep(0.5)
with concurrent.futures.ThreadPoolExecutor(8) as ex: list(ex.map(host,HOSTS.values()))
json.dump({'updated':now.strftime('%Y-%m-%dT%H:%M:%SZ'),'status':status,'items':out},open('data/news.json','w'),separators=(',',':'))
print('news',len(out),'items;',sum(v.startswith('ok') for v in status.values()),'/',len(status),'feeds ok')
