"""Shared place resolver for build-time snapshots (news). City and state are resolved together.
Rules: (1) "City, ST" / "City, State" / AP-style "CITY, Ind." datelines are looked up in the Census 2023
Gazetteer of incorporated places (.github/us_places.json, public domain); (2) big-city names from data/places.json;
a US city that also exists in a state named in the text is placed in that state; (3) a city in ambiguous.txt
with no state named is left unplaced; (4) state names used as street names ("West Virginia Avenue") are ignored."""
import json, re
PL=json.load(open('data/places.json')); G=json.load(open('.github/us_places.json'))
AMB=set(open('.github/ambiguous.txt').read().split('\n'))-{''}
ST={'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','Puerto Rico':'PR'}
AP={'Ala.':'AL','Ariz.':'AZ','Ark.':'AR','Calif.':'CA','Colo.':'CO','Conn.':'CT','Del.':'DE','D.C.':'DC','Fla.':'FL','Ga.':'GA','Ill.':'IL','Ind.':'IN','Kan.':'KS','Ky.':'KY','La.':'LA','Md.':'MD','Mass.':'MA','Mich.':'MI','Minn.':'MN','Miss.':'MS','Mo.':'MO','Mont.':'MT','Neb.':'NE','Nev.':'NV','N.H.':'NH','N.J.':'NJ','N.M.':'NM','N.Y.':'NY','N.C.':'NC','N.D.':'ND','Okla.':'OK','Ore.':'OR','Pa.':'PA','R.I.':'RI','S.C.':'SC','S.D.':'SD','Tenn.':'TN','Vt.':'VT','Va.':'VA','Wash.':'WA','W.Va.':'WV','Wis.':'WI','Wyo.':'WY'}
WORDY={'IN','OR','ME','OK','HI','AL','LA','DE','CO','ID','OH','MA','PA','GA','MO','MS','MT','WA','VA','SC','ND','NE'}  # 2-letter codes that collide with words/abbreviations
AB={v:k for k,v in ST.items()}
STREET=r'(?:Avenue|Ave\.?|Street|St\.|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Highway|Hwy\.?|Turnpike|Parkway|Pkwy\.?|Route|Place|Pl\.?|Court|Ct\.?)'
SNAME='|'.join(sorted(map(re.escape,ST),key=len,reverse=True))
STREETRX=re.compile(r'\b(?:'+SNAME+r')\s+'+STREET+r'(?![\w])')
SRX=re.compile(r'(?<![\w.])(?:'+SNAME+r'|'+'|'.join(map(re.escape,AP))+r'|'+'|'.join(v for v in ST.values())+r')(?![\w])')
DATELINE=re.compile(r"((?:[A-Z][A-Za-z.'-]+\s){0,3}[A-Z][A-Za-z.'-]+),\s+("+SNAME+'|'+'|'.join(map(re.escape,sorted(AP,key=len,reverse=True)))+r'|'+'|'.join(ST.values())+r")(?![\w])")
Q=re.compile(r'"[^"\n]{1,120}"|“[^”\n]{1,120}”|‘[^’\n]{1,120}’')
names=sorted({p[0] for p in PL},key=len,reverse=True)
RX=re.compile(r'(?<![^\W\d_])('+'|'.join(map(re.escape,names))+r')(?![^\W\d_])')
BY={}
for p in PL: BY.setdefault(p[0],p)
US=lambda p:p[3] in ('United States','United States of America')
def code(s): return ST.get(s) or AP.get(s) or (s if s in AB else None)
def gaz(city,st):
    w=city.split()
    for i in range(len(w)):  # longest suffix first: "In downtown Kokomo" -> "Kokomo"
        c=' '.join(w[i:]); c=c if not c.isupper() else c.title()
        if c in G and st in G[c]: return [c,G[c][st][0],G[c][st][1],'United States']
def place(t):
    u=STREETRX.sub(' ',Q.sub(' ',t))
    for m in DATELINE.finditer(u):
        st=code(m.group(2)); p=st and gaz(m.group(1),st)
        if p: return p
    named={code(m.group(0)) for m in SRX.finditer(u) if m.group(0) not in WORDY}-{None}
    state=None
    for m in RX.finditer(u):
        n=m.group(1); p=BY[n]
        if n in ST:  # a state
            state=state or p; continue
        if US(p) or n in G:
            hit=[s for s in named if n in G and s in G[n]]
            if hit: return [n,G[n][hit[0]][0],G[n][hit[0]][1],'United States']
            if n in AMB: continue  # ambiguous city, no state named -> unplaced
            if not US(p): return p
            if named and not any(s in G.get(n,{}) for s in named) and len(G.get(n,{}))>1: continue
            return p
        if n in AMB and not named: continue
        return p
    return state
if __name__=='__main__':
    for s in ['17-year-old facing preliminary charges after 2 teens shot in Kokomo. The shooting was reported in the 700 block of West Virginia Avenue',
              'KOKOMO, Ind. — Police are investigating','Fire in Springfield','Fire in Springfield, Illinois','Crash near Portland, Ore.','Flooding in Houston','Storm hits Paris','Quake felt in Los Angeles']:
        print(s[:50],'->',place(s))
