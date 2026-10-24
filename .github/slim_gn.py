# Run after build_gn.py (input must be the full "Name\tlat,lon" format).
# Slim GeoNames per-state files: front-coded names + coords rounded to 0.1 deg (tenths as ints).
# Line: <shared-prefix-len as 1 char (chr(48+n))><suffix>\t<lat*10>,<lon*10>
import glob,os
for f in sorted(glob.glob('data/gn/*.txt')):
    rows={}
    for l in open(f,encoding='utf-8'):
        n,ll=l.rstrip('\n').split('\t');a,b=map(float,ll.split(','))
        rows.setdefault(n,(round(a*10),round(b*10)))
    out=[];prev=''
    for n in sorted(rows):
        k=0
        while k<min(len(n),len(prev),40) and n[k]==prev[k]:k+=1
        out.append(f"{chr(48+k)}{n[k:]}\t{rows[n][0]},{rows[n][1]}");prev=n
    open(f.replace('.txt','.txt'),'w',encoding='utf-8').write('\n'.join(out)+'\n')
