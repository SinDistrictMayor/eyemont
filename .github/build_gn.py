"""Builds data/gn/<ST>.txt (Name<TAB>lat,lon) from GeoNames US.txt (CC BY 4.0, https://www.geonames.org).
Used only when a watch/near term names a state ('Warner Springs CA'); bare names never use it.
Usage: curl -O https://download.geonames.org/export/dump/US.zip && unzip US.zip US.txt && python3 .github/build_gn.py US.txt"""
import collections,sys,os
D=collections.defaultdict(dict)
for l in open(sys.argv[1],encoding='utf-8'):
  p=l.rstrip('\n').split('\t')
  if p[6]!='P' or not p[7].startswith('PPL') or p[7] in('PPLH','PPLQ','PPLW') or len(p[10])!=2:continue
  D[p[10]].setdefault(p[1].lower(),f"{p[1]}\t{float(p[4]):.2f},{float(p[5]):.2f}")
os.makedirs('data/gn',exist_ok=True)
for st,v in D.items(): open(f'data/gn/{st}.txt','w').write('\n'.join(sorted(v.values())))
