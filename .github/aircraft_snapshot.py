# Polite multi-point adsb.lol snapshot: 250 nm radius circles (API max) across CONUS + AK + HI, 3 s apart, deduped by hex.
import json,time,urllib.request,sys
PTS=[("NW",46,-121),("N-Rockies",46,-110),("N-Plains",46,-99),("Upper-MW",45,-89),("NE",43,-74),
("NorCal",39,-121),("Great Basin",40,-112),("C-Plains",39,-100),("Midwest",40,-89),("Mid-Atl",39,-79),
("SoCal",34,-117),("SW",33,-108),("Texas",31,-98),("Gulf",32,-89),("SE",32,-82),("Florida",27,-81),
("Alaska",61,-150),("Hawaii",21,-157)]
UA="eyemont (github pages; github.com/SinDistrictMayor/eyemont)"
ac={};okn=[];bad=[]
for name,la,lo in PTS:
  d=None
  for t in range(2):
    try:
      r=urllib.request.urlopen(urllib.request.Request(f"https://api.adsb.lol/v2/lat/{la}/lon/{lo}/dist/250",headers={"User-Agent":UA}),timeout=30)
      d=json.load(r);break
    except Exception as e: time.sleep(10)
  if d is None: bad.append(name)
  else:
    okn.append(name)
    for a in d.get("ac",[]):
      if a.get("lat") is not None: ac[a["hex"]]={k:a.get(k) for k in ("hex","flight","t","r","lat","lon","alt_baro","gs")}
  time.sleep(3)
if not ac:
  try:
    prev=json.load(urllib.request.urlopen("https://sindistrictmayor.github.io/eyemont/data/aircraft.json",timeout=30))
    if prev.get("now") and prev.get("ac"): json.dump(prev,open("data/aircraft.json","w")); print("kept previous snapshot")
  except Exception as e: print("no snapshot",e)
  sys.exit(0)
cov=f"{len(okn)}/{len(PTS)} regions (250 nm circles: CONUS, AK, HI; gaps between circles)"+(f"; missing {', '.join(bad)}" if bad else "")
json.dump({"now":int(time.time()),"coverage":cov,"ac":list(ac.values())},open("data/aircraft.json","w"),separators=(",",":"))
print(len(ac),cov)
