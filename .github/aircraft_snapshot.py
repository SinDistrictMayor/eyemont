# adsb.lol re-api snapshot (ODbL 1.0, attribution + share-alike): 3 bounding boxes (CONUS, AK, HI), 3 s apart, deduped by hex.
import json,time,urllib.request,sys
PTS=[("CONUS","24,50,-125,-66"),("Alaska","51,72,-170,-129"),("Hawaii","18,23,-161,-154")]
UA="Eyemont (https://github.com/SinDistrictMayor/eyemont)"
ac={};okn=[];bad=[]
for name,box in PTS:
  d=None
  for t in range(2):
    try:
      r=urllib.request.urlopen(urllib.request.Request(f"https://re-api.adsb.lol/?box={box}",headers={"User-Agent":UA}),timeout=30)
      d=json.load(r);break
    except Exception as e: time.sleep(10)
  if d is None: bad.append(name)
  else:
    okn.append(name)
    for a in d.get("aircraft",d.get("ac",[])):
      if a.get("lat") is not None: ac[a["hex"]]={k:a.get(k) for k in ("hex","flight","t","r","lat","lon","alt_baro","gs")}
  time.sleep(3)
if not ac:
  try:
    prev=json.load(urllib.request.urlopen("https://sindistrictmayor.github.io/eyemont/data/aircraft.json",timeout=30))
    if prev.get("now") and prev.get("ac"): json.dump(prev,open("data/aircraft.json","w")); print("kept previous snapshot")
  except Exception as e: print("no snapshot",e)
  sys.exit(0)
cov=f"{len(okn)}/{len(PTS)} regions (re-api boxes: CONUS, AK, HI)"+(f"; missing {', '.join(bad)}" if bad else "")
json.dump({"now":int(time.time()),"coverage":cov,"ac":list(ac.values())},open("data/aircraft.json","w"),separators=(",",":"))
print(len(ac),cov)
