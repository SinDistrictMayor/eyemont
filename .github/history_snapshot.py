"""Rolling 24h replay history for the MAP time machine. $0, no keys, no repo growth:
the previous history is read back from the deployed Pages site, merged with this run's
snapshots, pruned to 24h and re-deployed. Only events/places: id, ty, lat, lon, t, c."""
import json, os, time, urllib.request, hashlib
from datetime import datetime
NOW = time.time(); CUT = NOW - 86400
SITE = os.environ.get('PAGES_URL', 'https://sindistrictmayor.github.io/eyemont/')
def ld(p):
    try: return json.load(open(p))
    except Exception: return {}
def ts(v):
    try:
        if isinstance(v, (int, float)): return v / 1000 if v > 1e11 else v
        return datetime.fromisoformat(str(v).replace('Z', '+00:00')).timestamp()
    except Exception: return None
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'eyemont-history'}), timeout=20) as r: return json.load(r)
    except Exception: return None
rows = {}
def add(kind, key, ty, lat, lon, t, c):
    t = ts(t)
    if t is None or lat is None or lon is None or t < CUT or t > NOW + 600: return
    i = hashlib.sha1(f'{kind}|{key}'.encode()).hexdigest()[:10]
    rows[i] = [i, ty, round(float(lat), 2), round(float(lon), 2), int(t), c[0]]
prev = get(SITE + 'data/history/24h.json?t=%d' % NOW) or ld('data/history/24h.json')
for r in (prev or {}).get('r', []):
    if len(r) == 6 and r[4] >= CUT: rows[r[0]] = r
cls = {f['id']: f.get('cls', 'major') for f in ld('data/sources.json').get('feeds', [])}
for i in ld('data/news.json').get('items', []):
    if not i.get('home'): add('n', i.get('url'), 'news', i.get('lat'), i.get('lon'), i.get('time'), cls.get(i.get('src'), 'major'))
for i in ld('data/911.json').get('calls', []): add('d', f"{i.get('time')}{i.get('lat')}{i.get('lon')}{i.get('type')}", 'dispatch', i.get('lat'), i.get('lon'), i.get('time'), 'official')
h = ld('data/hazards.json')
for i in h.get('fires', []): add('f', f"{i.get('t')}{i.get('lat')}{i.get('lon')}", 'fire', i.get('lat'), i.get('lon'), i.get('t'), 'official')
for i in h.get('ioda', []): add('o', f"{i.get('code')}{i.get('t')}", 'outage', i.get('lat'), i.get('lon'), i.get('t'), 'official')
q = get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson') or {}
for f in q.get('features', []):
    c = f['geometry']['coordinates']; add('q', f.get('id'), 'quake', c[1], c[0], f['properties'].get('time'), 'official')
out = sorted(rows.values(), key=lambda r: r[4])[-20000:]
os.makedirs('data/history', exist_ok=True)
json.dump({'updated': int(NOW), 'f': ['id', 'ty', 'lat', 'lon', 't', 'c'], 'r': out}, open('data/history/24h.json', 'w'), separators=(',', ':'))
print('history rows', len(out))
