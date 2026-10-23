"""Builds data/gaz.txt for the client from .github/us_places.json (Census 2023 Gazetteer, public domain).
Line format: Name<TAB>flag<TAB>ST:lat,lon<TAB>... ; flag 'c' = clean (not a common word/first name/non-US city), 'u' = clean and unique US name safe to place bare
(not a common English word, not a big non-US city, not in ambiguous.txt)."""
import json,re
G=json.load(open('.github/us_places.json'));PL=json.load(open('data/places.json'))
AMB=set(open('.github/ambiguous.txt').read().split('\n'))-{''}
nonus={p[0] for p in PL if p[3] not in('United States','United States of America')}
corpus=' '.join(json.dumps(json.load(open(f))) for f in ['data/news.json','data/gdelt.json'])
corpus=re.sub(r'https?://\S+|"[a-z_]+":',' ',corpus)
low=set(re.findall(r'\b[a-z][a-z\']+\b',corpus))
STOP=set('Police Fire Storm Flood Mission Home Union Liberty Victory Hope Justice Center Plain Commerce Industry Friendship Paradise Truth Unity Harmony Enterprise Energy Progress Republic Democrat Senate Congress Capitol Media Golden Power Ocean Gulf Lake River Mountain Valley Ridge Hill Heights Park Beach Bay Harbor Island Springs Falls Rock Stone Wood Forest Garden Grove Grand North South East West Central Mount Saint Fort Port New Old Royal King Queen Prince Bishop Pope Christmas Easter Media Tribune Gazette Herald Star Sun Times Post Journal Courier Ledger Monitor Register Banner Express Globe Chronicle Sentinel Reporter Observer Telegraph Record Review Daily News Weekly Today Trump Biden Harris Obama Bush Clinton Lincoln Washington Jefferson Franklin Hamilton Madison Jackson Monroe Grant Taylor Wilson Johnson Adams'.split())
FIRSTN=set(w.title() for w in re.findall(r"[a-z']+",open('crowd.js').read().split("FIRST=new Set('")[1].split("'")[0]))
out=[]
for n,v in sorted(G.items()):
  clean=n not in nonus and n not in STOP and n not in FIRSTN and n.lower() not in low and len(n)>3 and not n.endswith(' House')
  bare='u' if clean and len(v)==1 and n not in AMB else ('c' if clean else '')
  out.append('\t'.join([n,bare]+[f'{s}:{a:.2f},{b:.2f}' for s,(a,b) in v.items()]))
open('data/gaz.txt','w').write('\n'.join(out))
print(len(out),sum(1 for l in out if '\tu\t' in l))
