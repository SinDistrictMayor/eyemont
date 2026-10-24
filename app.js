// EYEMONT redesign — NOW / NEAR / MAP. Incident-first UI over the same layer plugins and incident linker (see ARCHITECTURE.md "Redesign").
(()=>{
const RM=matchMedia('(prefers-reduced-motion: reduce)');
/* digital rain: ~12 fps, very faint, paused when hidden / reduced motion / battery saver */
const c=document.getElementById('rain'),x=c.getContext('2d');let drops=[],rainT=null;
function rs(){c.width=Math.ceil(innerWidth/2);c.height=48;drops=Array(Math.floor(c.width/12)).fill(0).map(()=>Math.random()*-50)}rs();addEventListener('resize',rs);
function frame(){x.fillStyle='rgba(0,0,0,.18)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00ff41';x.font='10px monospace';
 drops.forEach((y,i)=>{x.fillText(String.fromCharCode(0x30A0+Math.random()*96),i*12,y*12);if(y*12>c.height&&Math.random()>.9)drops[i]=0;drops[i]++})}
const rainOn=()=>{if(!rainT&&!document.hidden&&!RM.matches)rainT=setInterval(frame,85)},rainOff=()=>{clearInterval(rainT);rainT=null};
document.addEventListener('visibilitychange',()=>document.hidden?rainOff():rainOn());RM.addEventListener?.('change',()=>RM.matches?rainOff():rainOn());rainOn();
const map=L.map('map',{zoomControl:false,worldCopyJump:true,preferCanvas:true}).setView([38,-97],3);window.EYEMONT_MAP=map;
L.control.zoom({position:'topright'}).addTo(map);
map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');map.attributionControl.getContainer().addEventListener('click',e=>{if(e.target.tagName!=='A')e.currentTarget.classList.toggle('open')});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
const gen911=t=>/extricat|entrap|pinned|trapped|injur|ejected|fatal/i.test(t||'')?(/accident|crash|collision|vehicle|mva|rollover/i.test(t)?'Traffic accident':'Rescue call'):t;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const dot=(ll,col,r=5)=>L.circleMarker(ll,{radius:r,color:col,weight:1,fillColor:col,fillOpacity:.75});
let BBOX={},region='World';
const inRegion=(lat,lon)=>{if(region==='World')return true;const b=BBOX[region];return b&&lat>=b[0]&&lat<=b[2]&&lon>=b[1]&&lon<=b[3]};
async function getJSON(u,o){const r=await fetch(u,o);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
const ago=t=>{const m=Math.round((Date.now()/1000-t)/60);return m<1?'just now':m<120?m+' min ago':Math.round(m/60)+' h ago'};

/* Layer plugins: {id,label,color,attribution,refresh(ms, 0=once),viewport?,cluster?,load()->[{lat,lon,title,sub,popup,r?,geo?,state?,county?}]} */
document.addEventListener('click',e=>{const b=e.target.closest('button.live');if(b)Player.play({src:b.dataset.h,title:b.dataset.n,artist:'Caltrans live cam',art:b.dataset.i,audio:false})});
/* source classes: ownership/funding only, never truthfulness (see info sheet) */
const CLASSES={official:'OFFICIAL',major:'MAJOR',independent:'INDEPENDENT'};
const clsOn=JSON.parse(localStorage.getItem('eyemont.cls')||'{"official":true,"major":true,"independent":true}');
const clsOf=(i,Ly)=>i.cls||Ly.cls||'independent';
const clsTag=(c,note)=>`<span class="cls cls-${c}">${CLASSES[c]}</span>${note?` <small class="fund">${esc(note)}</small>`:''}<br>`;
let SRC={feeds:[]},SRCBY={};const srcReady=fetch('data/sources.json').then(r=>r.json()).then(d=>{SRC=d;d.feeds.forEach(f=>SRCBY[f.id]=f)}).catch(()=>{});
const DOMCLS={'bbc.co.uk':'official','bbc.com':'official','voanews.com':'official','dw.com':'official','france24.com':'official','aljazeera.com':'official','aljazeera.net':'official','cbc.ca':'official','abc.net.au':'official','rt.com':'official','tass.com':'official','tass.ru':'official','xinhuanet.com':'official','news.cn':'official','cgtn.com':'official','chinadaily.com.cn':'official','globaltimes.cn':'official','presstv.ir':'official','irna.ir':'official','nhk.or.jp':'official','trtworld.com':'official','aa.com.tr':'official','yonhapnews.co.kr':'official','rfi.fr':'official','rferl.org':'official','gov':'official','mil':'official','int':'official',
 'reuters.com':'major','apnews.com':'major','nytimes.com':'major','washingtonpost.com':'major','cnn.com':'major','foxnews.com':'major','nbcnews.com':'major','cbsnews.com':'major','abcnews.go.com':'major','usatoday.com':'major','wsj.com':'major','bloomberg.com':'major','theguardian.com':'major','telegraph.co.uk':'major','dailymail.co.uk':'major','independent.co.uk':'major','thetimes.co.uk':'major','ft.com':'major','economist.com':'major','yahoo.com':'major','msn.com':'major','cnbc.com':'major','nypost.com':'major','latimes.com':'major','politico.com':'major','axios.com':'major','newsweek.com':'major','time.com':'major','afp.com':'major','sky.com':'major','lemonde.fr':'major','spiegel.de':'major','timesofindia.indiatimes.com':'major','hindustantimes.com':'major','ndtv.com':'major','npr.org':'major'};
const domCls=u=>{let h='';try{h=new URL(u).hostname.replace(/^www\./,'')}catch(e){return 'independent'}const p=h.split('.');for(let i=0;i<p.length;i++){const d=p.slice(i).join('.');if(DOMCLS[d])return DOMCLS[d]}return 'independent'};
let _H=null,_HT=0;const H=()=>{if(!_H||Date.now()-_HT>600e3){_HT=Date.now();_H=getJSON('data/hazards.json?t='+Math.floor(Date.now()/300e3))}return _H};
/* FAA NAS raw program codes -> plain words; times carry the viewer's own zone label (e.g. ET), computed by Intl */
const FAAW={groundStop:'Ground stop',groundDelay:'Ground delay',arrivalDelay:'Arrival delays',departureDelay:'Departure delays',airportClosure:'Airport closed',freeForm:'FAA advisory',deicing:'De-icing'};
const faaWord=k=>FAAW[k]||k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
const TZL=(()=>{try{return new Intl.DateTimeFormat('en-US',{timeZoneName:'shortGeneric'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName').value}catch(e){try{return new Intl.DateTimeFormat('en-US',{timeZoneName:'short'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName').value}catch(e){return ''}}})();
const tzt=(t,short)=>{const d=new Date(t),today=d.toDateString()===new Date().toDateString();return d.toLocaleString([],short||today?{hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+(TZL?' '+TZL:'')};
const LAYERS=[
{id:'quakes',cls:'official',label:'⌁ QUAKE',color:'#ff4d4d',refresh:120e3,attribution:'Quakes: <a href="https://earthquake.usgs.gov">USGS</a>',
 async load(){const d=await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  return d.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],r:3+Math.max(0,f.properties.mag||0)*2,
   time:f.properties.time,src:'USGS',text:'earthquake '+(f.properties.place||''),sev:f.properties.mag,place:f.properties.place,title:`M${(f.properties.mag??0).toFixed(1)} ${f.properties.place||''}`,sub:new Date(f.properties.time).toLocaleString(),
   popup:`<b>${esc(f.properties.title)}</b><br>${new Date(f.properties.time).toLocaleString()}<br><a target=_blank rel=noopener href="${esc(f.properties.url)}">USGS ↗</a>`}))}},
{id:'alerts',cls:'official',label:'⚠ ALERT',color:'#ffd400',refresh:180e3,attribution:'Alerts: <a href="https://www.weather.gov">NWS</a>',
 async load(){const d=await getJSON('https://api.weather.gov/alerts/active?status=actual',{headers:{Accept:'application/geo+json'}});
  return d.features.filter(f=>f.geometry).map(f=>{const g=L.geoJSON(f.geometry).getBounds().getCenter();
   return {lat:g.lat,lon:g.lng,geo:f.geometry,time:Date.parse(f.properties.sent),src:'NWS',text:f.properties.event,sevw:f.properties.severity,place:f.properties.areaDesc,title:f.properties.event,sub:f.properties.areaDesc,
   popup:`<b>${esc(f.properties.headline)}</b><br>${esc(f.properties.areaDesc)}<br>Until ${esc(f.properties.expires)}`}})}},
{id:'air',cls:'independent',label:'✈ AIR',color:'#00e5ff',refresh:300e3,attribution:'Aircraft: <a href="https://api.adsb.lol">adsb.lol re-api</a>, <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>',
 // Snapshot only: adsb.lol sends no CORS header, so the Pages build bakes data/aircraft.json every ~15 min.
 async load(){const d=await getJSON('data/aircraft.json?t='+Math.floor(Date.now()/60e3));
  if(!d.now||!(d.ac||[]).length)throw new Error('snapshot not available yet');
  this.note=`US snapshot, ${ago(d.now)} (not live) · ${d.coverage||'partial coverage'}`;
  return d.ac.filter(a=>a.lat!=null).map(a=>({lat:a.lat,lon:a.lon,r:3,title:(a.flight||a.hex||'').trim()||'?',
   sub:`${a.t||''} alt ${a.alt_baro??'?'} ft · ${a.gs??'?'} kt`,popup:`<b>${esc(a.flight||a.hex)}</b><br>${esc(a.t||'')} ${esc(a.r||'')}<br>alt ${esc(a.alt_baro)} ft · ${esc(a.gs)} kt<br><small>snapshot ${ago(d.now)}</small><br><a target=_blank rel=noopener href="https://globe.adsb.lol/?icao=${esc(a.hex)}">live track ↗</a>`}))}},
{id:'cams',cls:'official',label:'◉ CAMS',color:'#b388ff',refresh:0,cluster:true,viewport:true,attribution:'Cams: <a href="https://cwwp2.dot.ca.gov">Caltrans</a>',
 async load(){const d=await getJSON('data/cams.json');return d.map(([n,lat,lon,county,typ,hls,img])=>({lat,lon,r:5,title:n,sub:`${county} County, CA${hls?' · live video':''}`,
  popup:()=>`<b>${esc(n)}</b><br><small>${esc(county)} County</small><img src="${esc(img)}?t=${Date.now()}" alt="snapshot">`+(hls?`<button class="live" data-h="${esc(hls)}" data-n="${esc(n)}" data-i="${esc(img)}">▶ LIVE VIDEO</button>`:'')+`<small>Caltrans public CCTV</small>`}))}},
{id:'crowd',cls:'independent',label:'👁 CROWD',color:'#39ff14',refresh:180e3,attribution:'Crowd: <a href="https://bsky.app">Bluesky</a>, <a href="https://mastodon.social">Mastodon</a>',
 async load(){const {groups,stats}=await Crowd.load();this.note=`${stats.placed} of ${stats.fetched} public posts name a known place · ${stats.filtered} filtered (personal info) · ${stats.old} older than 24h/dated skipped`;
  return groups.map(g=>({lat:g.place[1],lon:g.place[2],r:5+Math.min(10,g.posts.length*1.5),title:`📍 ${g.place[0]} · ${g.posts.length} post(s)`,sub:g.posts[0].text.slice(0,80),popup:()=>Crowd.card(g)}))}},
{id:'reports',cls:'independent',label:'✚ REPORTS',color:'#ff2bd6',refresh:120e3,attribution:'Reports: Nostr public relays',
 async load(){const it=Reports.items(await Reports.load());const st=Reports.stats();this.note=`${it.length} shown · last 24 h · ${st.raw-st.valid} bad schema, ${st.flagged} flagged (2+ keys), ${st.unsafe} personal-info dropped · UNMODERATED`;return it}},
{id:'radar',cls:'official',label:'☂ RADAR',color:'#4fc3f7',refresh:300e3,tile:true,attribution:'Radar: NEXRAD via <a href="https://mesonet.agron.iastate.edu/">Iowa Environmental Mesonet</a> (US only)',
 async load(){this.note='US NEXRAD base reflectivity (IEM, ~5 min)';if(this.tileLayer)this.tileLayer.setUrl('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png?_='+Date.now());
  else this.tileLayer=L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png?_='+Date.now(),{opacity:.6,maxZoom:19,maxNativeZoom:12});return []}},
{id:'eonet',cls:'official',label:'🛰 EONET',color:'#ff9e40',refresh:900e3,attribution:'Events: <a href="https://eonet.gsfc.nasa.gov">NASA EONET</a>',
 async load(){const d=await getJSON('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30');
  return d.events.map(e=>{const g=e.geometry[e.geometry.length-1];if(!g||g.type!=='Point')return null;const cat=e.categories[0]?.title||'';
   return {lat:g.coordinates[1],lon:g.coordinates[0],r:5,time:Date.parse(g.date),src:'NASA EONET',text:cat+' '+e.title,title:e.title,sub:`${cat} · ${new Date(g.date).toLocaleDateString()}`,popup:`<b>${esc(e.title)}</b><br>${esc(cat)} · ${new Date(g.date).toLocaleString()}<br>${(e.sources||[]).map(s=>`<a target=_blank rel=noopener href="${esc(s.url)}">${esc(s.id)} ↗</a>`).join(' ')}`}}).filter(Boolean)}},
{id:'news',cls:'major',label:'🗞 NEWS',color:'#e0e0e0',refresh:900e3,attribution:'News: publisher RSS feeds (headlines link to the original)',
 async load(){await srcReady;await PAINTED;const d=await getJSON('data/news.json?t='+Math.floor(Date.now()/300e3));const ok=Object.values(d.status||{}).filter(v=>v.startsWith('ok')).length;
  this.note=`${d.items.length} headlines, ${ok}/${Object.keys(d.status||{}).length} feeds ok · snapshot ${new Date(d.updated).toLocaleTimeString()} · ⌂ = placed at outlet's home city`;
  return d.items.map(i=>{i.title=Crowd.scrub(i.title);i.sum=Crowd.scrub(i.sum);const f=SRCBY[i.src]||{name:i.src,cls:'independent'};return {url:i.url,place:i.place,home:i.home,lat:i.lat,lon:i.lon,r:i.home?3:5,cls:f.cls,fund:f.fund,src:f.name,time:i.time?Date.parse(i.time):null,text:i.title,
   title:(i.home?'⌂ ':'📍 ')+i.title,sub:`${f.name} · ${i.place}${i.home?' (outlet home city, not event location)':''} · ${i.time?new Date(i.time).toLocaleTimeString():''}`,
   popup:`<b>${esc(i.title)}</b><br><small>${esc(f.name)} · ${i.home?'⌂ placed at the outlet\'s home city ('+esc(i.place)+'), not the event':'📍 '+esc(i.place)+' (named in headline/summary)'}</small><p>${esc(i.sum)}</p>${f.credit?`<a class="credit" target=_blank rel=noopener href="${esc(i.url)}">Read the full story at ${esc(f.name)} ↗</a><br><small>Headline and summary © ${esc(f.name)}, shown unmodified.</small>`:`<a target=_blank rel=noopener href="${esc(i.url)}">read at ${esc(f.name)} ↗</a>`}`}})}},
{id:'gdelt',cls:'major',label:'📰 GDELT',color:'#ffd600',refresh:900e3,attribution:'News events: <a href="https://www.gdeltproject.org">The GDELT Project</a>',
 async load(){const d=await getJSON('data/gdelt.json');this.note=d.updated?('snapshot '+new Date(d.updated).toLocaleTimeString()):'no snapshot';
  return d.events.map(g=>({cls:(()=>{const c={};g.urls.forEach(u=>{const k=domCls(u);c[k]=(c[k]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]})(),lat:g.lat,lon:g.lon,r:Math.min(9,4+Math.log2(g.n+1)),title:`${g.place}`,sub:`${g.n} article(s) · ${g.kinds.join(', ')}`,
   popup:`<b>📰 ${esc(g.place)}</b><br><small>${g.n} news article(s), last hour · ${esc(g.kinds.join(', '))} · place-level (GDELT machine-coded, may be wrong)</small><br>`+g.urls.map(u=>{let h=u;try{h=new URL(u).hostname}catch(e){}return `<a target=_blank rel=noopener href="${esc(u)}">${esc(h)} ↗</a>`}).join('<br>')}))}},
{id:'gdacs',cls:'official',label:'⚑ GDACS',color:'#ff1744',refresh:900e3,attribution:'Disasters: <a href="https://www.gdacs.org">GDACS</a>',
 async load(){const d=await getJSON('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;WF;DR&alertlevel=Green;Orange;Red');
  return d.features.map(f=>{const p=f.properties;return {lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],r:p.alertlevel==='Red'?9:p.alertlevel==='Orange'?7:5,time:Date.parse(p.fromdate),src:'GDACS',text:p.eventtype+' '+p.name,gtype:p.eventtype,alert:p.alertlevel,
   title:`${p.alertlevel} · ${p.name}`,sub:new Date(p.fromdate).toLocaleDateString(),popup:`<b>${esc(p.name)}</b><br>${esc(p.alertlevel)} alert · ${esc(p.fromdate)}<br><a target=_blank rel=noopener href="${esc(p.url?.report||'https://www.gdacs.org')}">GDACS report ↗</a>`}})}},
{id:'fire',cls:'official',label:'🔥 FIRE',color:'#ff6d00',refresh:900e3,cluster:true,attribution:'Fires: <a href="https://firms.modaps.eosdis.nasa.gov">NASA FIRMS</a> (VIIRS NOAA-20)',
 async load(){const d=await H();this.note='NASA FIRMS satellite hotspots, 24 h, 0.1° cells · snapshot '+ago(Date.parse(d.updated)/1000);
  return (d.fires||[]).map(f=>({lat:f.lat,lon:f.lon,r:Math.min(8,3+Math.log2(f.n+1)),time:Date.parse(f.t),src:'NASA FIRMS',text:'fire hotspot',title:`🔥 ${f.n} hotspot(s)`,sub:`FRP ${f.frp} MW · ${new Date(f.t).toLocaleString()}`,
   popup:`<b>Satellite fire hotspot(s): ${f.n}</b><br>~10 km cell · FRP ${f.frp} MW · ${new Date(f.t).toLocaleString()}<br><small>Data: NASA FIRMS. Hotspots can be industrial heat or flares.</small><br><a target=_blank rel=noopener href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${f.lon},${f.lat},9z">NASA FIRMS ↗</a>`}))}},
{id:'faa',cls:'official',label:'✈ FAA',color:'#80d8ff',refresh:900e3,attribution:'Airspace: <a href="https://tfr.faa.gov">FAA TFR</a>, <a href="https://nasstatus.faa.gov">FAA NAS Status</a>',
 async load(){const d=await H();this.note='TFRs placed at state centroid (approximate) · airport delays at the airport';
  return [...(d.tfr||[]).map(t=>({approx:true,lat:t.lat,lon:t.lon,r:4,src:'FAA TFR',text:t.desc,title:`TFR ${t.type} · ${t.state}`,sub:t.desc,popup:`<b>TFR ${esc(t.id)} · ${esc(t.type)}</b><br>${esc(t.desc)}<br><small>Shown at ${esc(t.state)} centroid, not the TFR area.</small><br><a target=_blank rel=noopener href="https://tfr.faa.gov/tfr3/?page=detail_${esc(t.id.replace('/','_'))}">FAA ↗</a>`})),
   ...(d.nas||[]).map(a=>{const st=a.start?Date.parse(a.start):null,iss=a.issued?Date.parse(a.issued):null,fut=st&&st>Date.now(),k=a.kinds.map(faaWord).join(', ');
    const sub=(a.avg?`avg ${a.avg} min delay · `:'')+(st?(fut?'starts ':'since ')+tzt(st):'')+(a.end?' · until '+tzt(a.end):'');
    return {lat:a.lat,lon:a.lon,r:7,time:fut?iss:(st||iss),start:st,src:'FAA NAS',text:a.apt+' delay',title:`${a.apt} ${k}${fut?' (starts '+tzt(st,1)+')':''}`,sub,
     popup:`<b>${esc(a.apt)}: ${esc(k)}</b><br>${esc(sub)}${a.why?'<br>Cause: '+esc(a.why):''}${a.max?'<br>max '+a.max+' min':''}<br><a target=_blank rel=noopener href="https://nasstatus.faa.gov">FAA NAS Status ↗</a>`}})]}},
{id:'flood',cls:'official',label:'🌊 FLOOD',color:'#2979ff',refresh:300e3,attribution:'Flood: <a href="https://www.weather.gov">NWS</a> / <a href="https://water.noaa.gov">NWPS</a>',
 async load(){const d=await getJSON('https://api.weather.gov/alerts/active?status=actual',{headers:{Accept:'application/geo+json'}});
  return d.features.filter(f=>f.geometry&&/Flood/.test(f.properties.event)).map(f=>{const g=L.geoJSON(f.geometry).getBounds().getCenter();const p=f.properties;
   return {lat:g.lat,lon:g.lng,geo:f.geometry,time:Date.parse(p.sent),src:'NWS',text:p.event,title:p.event,sub:p.areaDesc,popup:`<b>${esc(p.headline)}</b><br>${esc(p.areaDesc)}<br>Until ${esc(p.expires)}<br><a target=_blank rel=noopener href="https://water.noaa.gov">River gauges (NWPS) ↗</a>`}})}},
{id:'tsunami',cls:'official',label:'🌀 TSU/SPACE',color:'#18ffff',refresh:900e3,attribution:'<a href="https://www.tsunami.gov">NOAA Tsunami</a>, <a href="https://www.swpc.noaa.gov">NOAA SWPC</a>',
 async load(){const d=await H();this.note='Space-weather alerts are not geographic: shown at SWPC, Boulder CO (flagged)';
  return [...(d.tsunami||[]).map(t=>({lat:t.lat,lon:t.lon,r:8,time:Date.parse(t.updated),src:'NOAA '+t.center,text:'tsunami '+t.title,title:`Tsunami ${t.cat}: ${t.title}`,sub:t.center+' · '+new Date(t.updated).toLocaleString(),popup:`<b>Tsunami ${esc(t.cat)}: ${esc(t.title)}</b><br>${esc(t.center)} · ${new Date(t.updated).toLocaleString()}<br><a target=_blank rel=noopener href="https://www.tsunami.gov">tsunami.gov ↗</a>`})),
   ...(d.space||[]).map(a=>({approx:true,lat:40.0,lon:-105.27,r:6,title:'☀ '+a.title,sub:'⌂ placed at SWPC Boulder (space weather is global) · '+new Date(a.t).toLocaleString(),popup:`<b>☀ ${esc(a.title)}</b><br><small>⌂ Not a location: space weather is global; pin is NOAA SWPC, Boulder.</small><br><a target=_blank rel=noopener href="https://www.swpc.noaa.gov/products/alerts-watches-and-warnings">SWPC ↗</a>`}))]}},
{id:'fema',cls:'official',label:'🏛 FEMA',color:'#ffab40',refresh:3600e3,attribution:'Declarations: <a href="https://www.fema.gov/about/openfema">OpenFEMA</a>',
 async load(){const d=await H();this.note='Declarations, last 30 days, shown at state centroid';
  return (d.fema||[]).map(f=>({approx:true,lat:f.lat,lon:f.lon,r:7,title:`${f.id} ${f.title}`,sub:`${f.inc} · ${f.state} · ${f.date.slice(0,10)}`,popup:`<b>${esc(f.title)}</b><br>${esc(f.id)} · ${esc(f.inc)} · ${f.areas} area(s)<br><small>Shown at ${esc(f.state)} centroid.</small><br><a target=_blank rel=noopener href="https://www.fema.gov/disaster/${f.num}">FEMA ↗</a>`}))}},
{id:'ioda',cls:'official',label:'📡 IODA',color:'#ea80fc',refresh:900e3,attribution:'Outages: <a href="https://ioda.inetintel.cc.gatech.edu">IODA (Georgia Tech)</a>',
 async load(){const d=await H();this.note='Country-level internet outage signals (24 h, non-normal only), approximate country position';
  return (d.ioda||[]).map(i=>({approx:true,lat:i.lat,lon:i.lon,r:8,time:i.t*1e3,src:'IODA',text:'internet outage',title:`Internet ${i.level}: ${i.name}`,sub:`${i.n} signal(s) · ${i.src.join(', ')}`,popup:`<b>Internet outage signal: ${esc(i.name)}</b><br>${esc(i.level)} · ${i.n} alert(s) · ${esc(i.src.join(', '))}<br><small>Country-level; pin is approximate.</small><br><a target=_blank rel=noopener href="https://ioda.inetintel.cc.gatech.edu/country/${esc(i.code)}">IODA ↗</a>`}))}},
{id:'d911',cls:'official',label:'🚨 911',color:'#ff5252',refresh:300e3,cluster:true,attribution:'911: city open-data portals (Socrata), per-dataset licenses incl. Dallas (ODC-By), Somerville (ODbL)',
 async load(){const d=await getJSON('data/911.json?t='+Math.floor(Date.now()/300e3));this.note=`${d.ok}/${d.total} city datasets · snapshot ${ago(Date.parse(d.updated)/1000)} · last 24 h · ≈1 km · non-person call types only (fire, alarm, hazmat, road, flooding…)`;
  return d.calls.map(c=>(c.type=gen911(c.type),{lat:c.lat,lon:c.lon,r:4,approx:!!c.approx,time:c.time?Date.parse(c.time):null,src:c.city,text:c.type,title:`🚨 ${c.type}`,sub:`${c.city}${c.time?' · '+new Date(c.time).toLocaleTimeString():''}${c.approx?' · ⌂ city centroid':''}`,
   popup:`<b>${esc(c.type)}</b><br>${esc(c.city)}${c.time?' · '+new Date(c.time).toLocaleString():''}<br><small>${c.approx?'⌂ placed at city centroid':'~1 km rounded'}; no addresses. Data: <a target=_blank rel=noopener href="${esc(c.source)}">${esc(c.source.replace(/^https?:\/\//,''))}</a>, ${esc(c.license)}.</small>`}))}},
{id:'live',cls:'major',label:'▶ LIVE TV',color:'#ffffff',refresh:0,attribution:'Live: official channel pages',
 async load(){return (await getJSON('data/live.json')).map(l=>({lat:l.lat,lon:l.lon,r:7,title:l.title,sub:l.note,popup:`<b>${esc(l.title)}</b><br>${esc(l.note)}<br><a target=_blank rel=noopener href="${esc(l.url)}">Watch live ↗</a>`}))}},
{id:'scanner',cls:'official',label:'📻 SCAN',color:'#ff8a00',refresh:0,dynamic:true,attribution:'Scanner links: <a href="https://www.broadcastify.com">Broadcastify</a>, agency sites',
 async load(){await Scanners.init();return true}}
];
const km=(a,b,c,d)=>{const r=Math.PI/180,x=(d-b)*r*Math.cos((a+c)/2*r),y=(c-a)*r;return 6371*Math.hypot(x,y)};
/* topic-aware: items link only if they share an event type (lexicon) or ≥2 rare headline tokens (low document frequency) */
const LEX={fire:/\b(fire|fires|wildfire|blaze|burn(ing|ed)?|smoke|arson|hotspot)/i,shooting:/\b(shoot|shooting|shot|gunfire|gunman|gunshots?|firearm)/i,crash:/\b(crash|collision|wreck|derail|rollover|pileup|hit[- ]and[- ]run)/i,
 flood:/\b(flood|flooding|flash flood|inundat)/i,storm:/\b(storm|tornado|hurricane|typhoon|cyclone|hail|blizzard|thunderstorm|winds?\b|tropical)/i,quake:/\b(quake|earthquake|tremor|seismic|aftershock)/i,
 outage:/\b(outage|blackout|power cut|without power|internet (shutdown|disruption))/i,protest:/\b(protest|protesters?|rally|march(ers)?|demonstrat|riot|unrest|strike)\b/i,explosion:/\b(explosion|explode|blast|detonat|bomb)/i,
 evacuation:/\b(evacuat|shelter[- ]in[- ]place|lockdown)/i,hazmat:/\b(hazmat|chemical|gas leak|spill|toxic)/i,tsunami:/\btsunami/i,volcano:/\b(volcan|eruption|lava|ash plume)/i,
 rescue:/\b(rescue|missing hiker|drown|search and rescue)/i,police:/\b(standoff|stabbing|homicide|manhunt|police chase|pursuit|barricade)/i,airspace:/\b(tfr|ground delay|ground stop|airport delay)/i,medical:/\b(outbreak|cases of|measles|e\. coli|salmonella)/i};
const LYTYPE={quakes:'quake',fire:'fire',flood:'flood',tsunami:'tsunami',ioda:'outage',faa:'airspace',eonet:null,gdacs:null};
const NOINC=/\b(nfl|nba|mlb|nhl|mls|ncaa|wnba|ufc|football|basketball|baseball|hockey|soccer|playoffs?|touchdown|quarterback|coach|season opener|game\b|games\b|match\b|tournament|championship|super bowl|world series|vs\.?|stadium|halftime|roster|draft pick|movie|film|box office|concert|album|song|singer|rapper|actor|actress|celebrity|netflix|tv show|series finale|premiere|festival|halloween|recipe|restaurant|horoscope|oscars?|grammys?|emmys?|broadway|theater|theatre|fashion)\b/i;
const STOP=new Set('about after again against amid among another around back been before being between both came could during each from have here into just like made make many more most much near news over people said says some still such than that their them then there these they this those through under until very want week were what when where which while will with would year years your today tonight local new county city state police officials report reports update updates live video watch photos'.split(' '));
const toks=t=>[...new Set((t.toLowerCase().match(/[a-z][a-z'-]{3,}/g)||[]).filter(w=>!STOP.has(w)))];
const SPARK='▁▂▃▄▅▆▇█';const spark=(m,now)=>{const b=Array(8).fill(0);m.forEach(x=>{const k=7-Math.floor((now-x.t)/9e5);if(k>=0&&k<8)b[k]++});const mx=Math.max(...b)||1;return b.map(v=>SPARK[Math.round(v/mx*7)]).join('')};
let INCX={kept:0,sport:0,notopic:0};
function incidents(){const now=Date.now(),its=[];INCX={kept:0,sport:0,notopic:0,sx:[]};
 LAYERS.forEach(Ly=>{const s=state[Ly.id];if(!s.on||!s.data||Ly.tile||Ly.dynamic)return;
  itemsOf(Ly).forEach(i=>{if(i.home||i.approx||i.flagged)return;const t=i.time||(Ly.id==='gdelt'?now:null);if(!t||now-t>6*36e5||t>now+6e5)return;
   const txt=(i.text||i.title||'')+(Ly.id==='gdelt'?' '+(i.sub||''):'');if(NOINC.test(txt)){INCX.sport++;if(INCX.sx.length<5)INCX.sx.push(txt.slice(0,70));return}
   const ty=new Set(Object.keys(LEX).filter(k=>LEX[k].test(txt)));if(LYTYPE[Ly.id])ty.add(LYTYPE[Ly.id]);
   const pl=new Set(toks((i.sub||'')+' '+(Ly.id==='gdelt'?i.title:'')));its.push({i,Ly,t,ty,tk:Ly.id==='gdelt'?[]:toks(i.text||i.title||'').filter(w=>!pl.has(w)),c:clsOf(i,Ly),src:Ly.id==='d911'?'911 dispatch':(i.src||Ly.label)})})});
 const df={};its.forEach(x=>x.tk.forEach(w=>df[w]=(df[w]||0)+1));const rare=Math.max(3,its.length*.004);
 its.forEach(x=>x.rk=new Set(x.tk.filter(w=>df[w]>=2&&df[w]<=rare)));
 its.sort((a,b)=>a.t-b.t);const C=[];
 for(const x of its){let best=null,bs=0;
  for(const c of C){if(x.t-c.first>72e5)continue;const d=km(c.lat,c.lon,x.i.lat,x.i.lon);if(d>25)continue;
   const shT=[...x.ty].filter(k=>c.ty[k]).length,shR=[...x.rk].filter(w=>c.rk[w]).length;const sc=shT*2+(shR>=2?shR:0);if(sc>bs){bs=sc;best=c}}
  if(!best){best={lat:x.i.lat,lon:x.i.lon,m:[],first:x.t,last:x.t,ty:{},rk:{}};C.push(best)}
  best.m.push(x);x.ty.forEach(k=>best.ty[k]=(best.ty[k]||0)+1);x.rk.forEach(w=>best.rk[w]=(best.rk[w]||0)+1);
  best.last=Math.max(best.last,x.t);const n=best.m.length;best.lat+=(x.i.lat-best.lat)/n;best.lon+=(x.i.lon-best.lon)/n}
 const out=C.map(c=>{const S=new Set(c.m.map(x=>x.src)),K=new Set(c.m.map(x=>x.c)),L2=new Set(c.m.map(x=>x.Ly.id));
  const T=Object.entries(c.ty).filter(([k,v])=>v>=2).sort((a,b)=>b[1]-a[1]).map(e=>e[0]),R=Object.entries(c.rk).filter(([k,v])=>v>=2).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  c.type=T[0]||null;c.keys=R.slice(0,3);c.src=S.size;c.cls=[...K];c.layers=L2.size;c.conf=Math.min(1,.15+.2*(S.size-1)+.15*(K.size-1)+.1*(L2.size-1));c.grow=c.m.filter(x=>now-x.t<18e5).length;c.spark=spark(c.m,now);
  const ex=(c.m.find(x=>x.Ly.id==='news'&&(!c.type||x.ty.has(c.type)))||c.m.find(x=>x.Ly.id!=='gdelt')||c.m[0]).i.title;
  c.head=(c.type?c.type.toUpperCase():'TOPIC: '+c.keys.join(' · '))+' — '+ex.replace(/^[^\w]+/,'');return c});
 const ok=out.filter(c=>c.src>=2&&c.type);INCX.notopic=out.filter(c=>c.src>=2).length-ok.length;INCX.kept=ok.length;
 return ok.sort((a,b)=>(Math.round(b.last/6e5)-Math.round(a.last/6e5))||(b.grow-a.grow)||(b.conf-a.conf))}
/* ---------- redesign UI ---------- */
const $=s=>document.querySelector(s);
const SKIP=new Set(['reports','radar','scanner','live','air','cams']); // not auto-loaded: reports (opt-in, Crowd chip), air/cams (Transport chip), live (News chip)
const state={};LAYERS.forEach(Ly=>state[Ly.id]={on:!SKIP.has(Ly.id),data:null,fails:0});
const itemsOf=Ly=>{const s=state[Ly.id];if(!s.data||!Array.isArray(s.data))return[];return s.data.filter(i=>clsOn[clsOf(i,Ly)]&&inRegion(i.lat,i.lon))};
const TOPICS={fire:['FIRE','🔥','#ff6d00'],weather:['WEATHER','☂','#ffd400'],quakes:['QUAKES','⌁','#ff4d4d'],crime:['CRIME/911','🚨','#ff2b5e'],transport:['TRANSPORT','✈','#00e5ff'],outages:['OUTAGES','⚡','#ea80fc'],news:['NEWS','🗞','#e0e0e0'],crowd:['CROWD','👁','#39ff14']};
const LYTOPIC={reports:'crowd',live:'news',quakes:'quakes',alerts:'weather',flood:'weather',tsunami:'weather',fire:'fire',d911:'crime',faa:'transport',air:'transport',cams:'transport',ioda:'outages',news:'news',gdelt:'news',crowd:'crowd',fema:'weather',eonet:'weather',gdacs:'weather'};
const TYTOPIC={fire:'fire',storm:'weather',flood:'weather',tsunami:'weather',volcano:'quakes',quake:'quakes',outage:'outages',airspace:'transport',crash:'transport',shooting:'crime',police:'crime',explosion:'crime',hazmat:'crime',rescue:'crime',evacuation:'weather',protest:'crowd',medical:'news'};
const topicOf=(ty,ly)=>TYTOPIC[ty]||LYTOPIC[ly]||'news';
const topOn=new Set(JSON.parse(localStorage.getItem('eyemont.topics')||'[]')); // empty = all
const W=Object.fromEntries(Object.entries({reports:.5,quakes:1,alerts:.9,flood:1,tsunami:1.4,fire:.6,d911:.7,faa:.6,ioda:.9,news:.8,gdelt:.4,crowd:.5,fema:.7,eonet:.6,gdacs:1}));
let PLACES=[],PLACE_OK=getJSON('data/places.json').then(p=>PLACES=p).catch(()=>{});
const nearPlace=(lat,lon)=>{let b=null,bd=1e9;for(const p of PLACES){const d=km(lat,lon,p[1],p[2]);if(d<bd){bd=d;b=p}}return b&&bd<150?(bd<15?b[0]:`${Math.round(bd)} km from ${b[0]}`)+(b[3]&&b[3]!=='United States of America'?', '+b[3]:''):null};
/* state = point-in-polygon against data/us_states.geojson (Census cb_2023 20m, public domain, simplified) */
let STP=[];const STATES_OK=getJSON('data/us_states.geojson').then(g=>{STP=g.features.map(f=>{const polys=f.geometry.coordinates;let b=[90,180,-90,-180];polys.forEach(p=>p[0].forEach(([x,y])=>{b=[Math.min(b[0],y),Math.min(b[1],x),Math.max(b[2],y),Math.max(b[3],x)]}));return {n:f.properties.name,a:f.properties.abbr,x:!!f.properties.foreign,polys,b}})}).catch(()=>{});
const inRing=(x,y,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
const inSt=(s,lat,lon)=>!(lat<s.b[0]||lat>s.b[2]||lon<s.b[1]||lon>s.b[3])&&s.polys.some(p=>inRing(lon,lat,p[0])&&!p.slice(1).some(h=>inRing(lon,lat,h)));
const stateOf=(lat,lon)=>{for(const s of STP)if(!s.x&&inSt(s,lat,lon))return s.n;
 if(STP.some(s=>s.x&&inSt(s,lat,lon)))return null; /* Canada/Mexico/Cuba/Bahamas mask: never snap a foreign point to a US state */
 /* border / coast / small-island fallback (simplified outlines drop Keys, piers, inlets): nearest outline vertex within ~0.35 deg (~35 km) */
 let best=null,bd=.35*.35;const k=Math.cos(lat*Math.PI/180);for(const s of STP){if(s.x||lat<s.b[0]-.4||lat>s.b[2]+.4||lon<s.b[1]-.4||lon>s.b[3]+.4)continue;for(const p of s.polys)for(const [x,y] of p[0]){const d=(y-lat)**2+((x-lon)*k)**2;if(d<bd){bd=d;best=s.n}}}return best};
const links=h=>{const o=[];String(h||'').replace(/href="([^"]+)"[^>]*>([^<]*)</g,(m,u,t)=>{if(!/^https?:/.test(u))return;o.push([u.replace(/&amp;/g,'&'),t.replace(/[↗\s]+$/,'')])});return o};
const rawHtml=i=>typeof i.popup==='function'?i.popup():i.popup;
/* Name masking for ALL publisher text shown in-app (sheet coverage/timeline/sources, popups). Same pair detection as safeHead;
   in Title-Case headlines a pair is masked only if neither word is ever seen lowercase in the feed corpus (LOWW), so 'Cop Was' stays. */
let LOWW=new Set();
const isTitleCase=t=>{const w=t.match(/\b[A-Za-z][a-z'’]+\b/g)||[];return w.length>3&&w.filter(x=>/^[A-Z]/.test(x)).length/w.length>.6};
const EVN=/^(?:Fire|Fires|Complex|Storm|Hurricane|Tropical|Typhoon|Cyclone|Flood|Floods|Quake|Earthquake|Tornado|Blaze|Wildfire|Bridge|Dam|River|Creek|Lake|Park|County|Road|Street|Avenue|Highway|Airport|School|High|University|College|Hospital|Center|Department|Police|Sheriff)$/;
/* allowlist: countries, territories, US states, major places — never masked */
/* public figures (data/public_figures.txt, Wikidata CC0): not masked; watchable as news/post keywords only, never located */
const PF=new Set();const PF_OK=fetch('data/public_figures.txt').then(r=>r.text()).then(t=>t.split('\n').forEach(x=>{x=x.trim();if(x&&x[0]!=='#')PF.add(x.toLowerCase())})).catch(()=>{});
const CUR=new Set(),CNF=new Set(),CNL=new Set();
const CUR_OK=fetch('data/figures_curated.txt').then(r=>r.text()).then(t=>t.split('\n').forEach(x=>{x=x.trim();if(x&&x[0]!=='#'){CUR.add(x.toLowerCase());PF.add(x.toLowerCase())}})).catch(()=>{});
const CN_OK=fetch('data/common_names.txt').then(r=>r.text()).then(t=>t.split('\n').forEach(l=>{const [k,v]=l.split('\t');if(k==='F')CNF.add(v);else if(k==='L')CNL.add(v)})).catch(()=>{});
const PFALL=Promise.all([PF_OK,CUR_OK,CN_OK]);
const nrm=w=>w.trim().replace(/\s+/g,' ').toLowerCase();
const isPF=w=>PF.has(nrm(w));
/* role cue words: a common-name figure is only unmasked next to one of these */
const ROLE='(?:President|Vice President|Pres\\.?|Prime Minister|PM|Minister|Speaker|House Speaker|Senate Majority Leader|Majority Leader|Minority Leader|Leader|Sen\\.?|Senator|Rep\\.?|Representative|Congressman|Congresswoman|Gov\\.?|Governor|Lt\\.? Gov\\.?|Mayor|CEO|Chief Executive|Chancellor|Premier|Secretary|Attorney General|Chairman|Chairwoman|Chair|Justice|Chief Justice|King|Queen|Prince|Princess|Pope|Ambassador)';
const ROLEB=new RegExp('(?:^|[\\s(,])'+ROLE+'\\s+$','iu'),ROLEA=new RegExp('^\\s*,\\s*(?:the\\s+)?(?:[\\p{L}.-]+\\s+){0,3}?'+ROLE+'(?![\\p{L}])','iu'),ROLEP=new RegExp('^'+ROLE+'\\s+','iu');
/* is the name common? (both first and last token in Census common-name lists) */
const commonName=n=>{const w=nrm(n).split(' ');return w.length>=2&&CNF.has(w[0].normalize('NFD').replace(/\p{M}/gu,''))&&CNL.has(w[w.length-1].normalize('NFD').replace(/\p{M}/gu,''))};
/* figure check for a span of t: curated → yes; listed + uncommon → yes; listed + common → only with a role cue before/after */
const pfAt=(t,s0,e0)=>{let w=t.slice(s0,e0),pre=t.slice(Math.max(0,s0-40),s0);const m=w.match(ROLEP);if(m){pre+=' '+m[0];w=w.slice(m[0].length)}
 if(!isPF(w))return false;const k=nrm(w);if(CUR.has(k)||!commonName(k))return true;return ROLEB.test(pre)||ROLEA.test(t.slice(e0,e0+40))};
let ALLOW=null,ALLOWS=new Set();const ALLOW_OK=fetch('data/allow.txt').then(r=>r.text()).then(t=>{const a=t.split('\n').map(s=>s.trim()).filter(Boolean);a.forEach(x=>ALLOWS.add(x));ALLOW=new RegExp('(?<![\\w])(?:'+a.sort((x,y)=>y.length-x.length).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![\\w])','gi')}).catch(()=>{});
const allowSpans=t=>{const r=[];if(ALLOW){ALLOW.lastIndex=0;for(const m of t.matchAll(ALLOW))r.push([m.index,m.index+m[0].length])}return r};
const ACR=new Set('USGS FEMA NWS NOAA NASA FAA FBI CIA DHS ICE ATF DEA EPA CDC WHO UN NATO EU UK US USA UAE NYPD LAPD NYFD FDNY CHP DOT TFR NWPS SWPC IODA GDACS EONET FIRMS BBC CNN NBC ABC CBS NPR PBS AP AFP RT TV PM AM ET PT CT MT UTC GMT EST PST CST MST EDT PDT CDT MDT KM MPH GOP DNC RNC NFL NBA MLB NHL MLS NCAA UFC LIVE BREAKING UPDATE NEWS WATCH VIDEO ALERT WARNING NEW UPDATED EXCLUSIVE OPINION ANALYSIS'.split(' '));
const COMMONFN=new Set('will may june april august mark grant frank bill rose joy hope faith art ray sue pat guy max chase dawn iris rich bob sky summer autumn crystal amber ruby pearl violet jade lily heather holly ivy daisy olive penny sunny cliff dale glen wade lance drew rob gene don jack sterling carol buck hunter major sergeant judge justice king prince earl duke page bishop pope'.split(' '));
const LOCP=/(?:^|[\s(])(?:of|near|in|at|from|outside|across|toward|towards|off|into|around|to|through|north|south|east|west|nw|ne|sw|se|nnw|nne|ssw|sse|wnw|wsw|ene|ese|n|s|e|w)\s+$/i;
const HON=/\b(?:Mr|Mrs|Ms|Mx|Dr|Sen|Rep|Gov|Lt|Sgt|Capt|Det|Officer|Judge|Pres|Prof)\.?\s+$/;
const STATEN=/^(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|Ohio|Oklahoma|Oregon|Pennsylvania|Tennessee|Texas|Utah|Vermont|Virginia|Washington|Wisconsin|Wyoming|Ontario|Quebec|Alberta|Manitoba|Saskatchewan)$/;
const STAB=/^,?\s+(?:[A-Z]{2}\b|(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New \w+|North \w+|South \w+|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b)/;
const TOKR=/(?<![\p{L}\p{M}\d'’-])\p{Lu}[\p{Ll}\p{M}]*(?:['’-]\p{Lu}?[\p{Ll}\p{M}]+)*(?![\p{L}\p{M}\d'’-])/gu;
const maskNames=t=>{if(!t)return t;
 /* shadow copy: ALL-CAPS words (not known acronyms) become Title-case for detection; indices stay identical */
 const caps=(t.match(/(?<![\p{L}\d])\p{Lu}{2,}(?![\p{L}\d])/gu)||[]).filter(w=>!ACR.has(w)).length>=2;
 const sh=caps?t.replace(/(?<![\p{L}\d])\p{Lu}{2,}(?:['’-]\p{Lu}+)*(?![\p{L}\d])/gu,w=>ACR.has(w)?w:w.replace(/\p{Lu}+/gu,(x,i)=>i===0||/['’-]/.test(w[i-1])?x[0]+x.slice(1).toLowerCase():x.toLowerCase())):t;
 const AS=allowSpans(t),inA=(s,e)=>AS.some(([x,y])=>s>=x&&e<=y),GEOS=/^(Islands?|Region|Coast|Sea|Gulf|Peninsula|Province|Border|Area|Basin|Strait|Archipelago|Highlands|Lowlands|Delta|Plateau|Ridge|Trench)$/,
  nextA=(A,B)=>AS.some(([x,y])=>(x===A.index&&y===A.index+A[0].length&&GEOS.test(B[0]))||(x===B.index&&y===B.index+B[0].length&&GEOS.test(A[0])));
 const tk=[...sh.matchAll(TOKR)].filter(m=>m[0].length>=2||/^\p{Lu}$/u.test(m[0])&&sh[m.index+1]==='.'),cut=[];
 const HV=/^(?:Held|Found|Arrested|Charged|Killed|Dies|Died|Dead|Missing|Injured|Hurt|Shot|Says|Said|Signs|Signed|Sentenced|Named|Wins|Won|Jailed|Freed|Released|Rescued|Identified|Accused|Convicted|Indicted|Sues|Sued|Fired|Resigns|Speaks|Visits|Warns|Denies|Admits|Pleads|Faces|Gets|Takes|Makes|Calls|Hits|Leads|Joins|Booked|Detained|Wanted|Escapes|Escaped|Located|Safe|Recovered|Hospitalized|Stabbed|Crash|Crashes)$/;
 const ok=w=>HV.test(w)||LOWW.has(w)||ORGW.test(w)||EVN.test(w),adj=(A,B)=>/^\s+(?:\p{Lu}\.\s+)?$/u.test(sh.slice(A.index+A[0].length,B.index));
 for(let n=0;n+1<tk.length;n++){const A=tk[n],B=tk[n+1];if(A[0].length<2||!adj(A,B))continue;
  const a=A[0],b=B[0],w=sh.slice(A.index,B.index+b.length),C=tk[n+2],nx=C&&/^\s+$/.test(sh.slice(B.index+b.length,C.index))?C[0]:'';
  if(LOCP.test(sh.slice(Math.max(0,A.index-12),A.index))&&!Crowd.nameCI(a+' '+b))continue; /* place phrase after of/near/in… */
  if(STAB.test(sh.slice(B.index+b.length,B.index+b.length+20))&&!Crowd.nameCI(a+' '+b))continue; /* 'Warner Springs, CA' */
  if(inA(A.index,B.index+b.length)||nextA(A,B)||EVN.test(nx)||EVN.test(b)||ORGW.test(a)||ORGW.test(b)||PLACES.some(p=>p[0]===w)||STP.some(s=>s.n===w))continue;
  if(Crowd.nameCI(a+' '+b)||(!LOWW.has(a)&&!LOWW.has(b))){let end=B.index+b.length,k=n+1;
   while(k+1<tk.length&&adj(tk[k],tk[k+1])&&tk[k+1][0].length>=2&&!(tk[k+1][0].length<=3?ORGW.test(tk[k+1][0])||EVN.test(tk[k+1][0]):ok(tk[k+1][0]))&&!inA(tk[k+1].index,tk[k+1].index+tk[k+1][0].length)){k++;end=tk[k].index+tk[k][0].length}
   cut.push([A.index,end]);n=k}}
 /* honorific / initial + surname: 'Ms. Jones', 'J. Smith' */
 for(const m of sh.matchAll(/(?<![\p{L}.])(?:(?:Mr|Mrs|Ms|Mx|Dr|Sen|Rep|Gov|Prof|Lt|Sgt|Capt|Cpl|Det|Pvt|Ofc|Insp|Supt)\.?|(?:Officer|Deputy|Trooper|Sergeant|Lieutenant|Captain|Corporal|Detective|Inspector|Agent|Constable|Patrolman|Patrolwoman|Firefighter|Chief|Marshal|Ranger|Warden|Private|Specialist|Corrections Officer)|\p{Lu}\.(?!\p{L}))\s+(\p{Lu}[\p{Ll}\p{M}]+(?:['’-]\p{Lu}?[\p{Ll}\p{M}]+)*)/gu)){const s0=m.index,e0=m.index+m[0].length;if(cut.some(([x,y])=>s0<y&&e0>x))continue;if(ORGW.test(m[1])||EVN.test(m[1])||inA(m.index+m[0].length-m[1].length,e0))continue;cut.push([s0,e0])}
 /* lowercase 'john smith' (known first name + non-common word) */
 for(const m of t.matchAll(/(?<![\p{L}\p{M}'’-])(\p{Ll}{3,})\s+(\p{Ll}[\p{Ll}\p{M}'’-]{2,})(?![\p{L}\p{M}'’-])/gu)){const f=m[1],l=m[2];if(COMMONFN.has(f)||STOP.has(l)||WSTOP.has(l)||Object.values(LEX).some(r=>r.test(l)))continue;
  if(!Crowd.nameCI(f+' '+l))continue;const s0=m.index,e0=s0+m[0].length;if(cut.some(([x,y])=>s0<y&&e0>x))continue;cut.push([s0,e0])}
 /* 'Last, First' */
 for(const m of sh.matchAll(/(?<![\p{L}\p{M}'’-])(\p{Lu}[\p{Ll}\p{M}'’-]+),\s+(\p{Lu}[\p{Ll}\p{M}]+)(?![\p{L}\p{M}'’-])/gu)){const s0=m.index,e0=s0+m[0].length;if(cut.some(([x,y])=>s0<y&&e0>x)||inA(s0,e0)||(typeof BBOX!=='undefined'&&BBOX[m[2]])||STATEN.test(m[2])||!Crowd.nameCI(m[2]+' '+m[1])||ORGW.test(m[1])||STP.some(x=>x.n===m[2]))continue;cut.push([s0,e0])}
 for(let k=cut.length-1;k>=0;k--){const [s0,e0]=cut[k];if(pfAt(t,s0,e0)){cut.splice(k,1);continue}
  /* figure at the start of a longer span ('DONALD TRUMP SIGNS ORDER'): keep the figure, re-check the rest */
  const ws=[...t.slice(s0,e0).matchAll(/\S+/g)];for(let j=Math.min(4,ws.length-1);j>=2;j--){const pe=s0+ws[j-1].index+ws[j-1][0].length;if(pfAt(t,s0,pe)){const rest=ws.slice(j);if(rest.length>=2)cut[k]=[s0+rest[0].index,e0];else cut.splice(k,1);break}}}
 for(const m of t.matchAll(/(?<![\p{L}\p{M}\d@._-])@[\p{L}\d_](?:[\p{L}\d_.-]{0,62}[\p{L}\d_])?(?:@[\p{L}\d-]+(?:\.[\p{L}\d-]+)+)?/gu)){const s0=m.index,e0=s0+m[0].length;if(!cut.some(([x,y])=>s0<y&&e0>x))cut.push([s0,e0])} /* @handles */
 cut.sort((x,y)=>x[0]-y[0]);for(let k=cut.length-1;k>=0;k--)t=t.slice(0,cut[k][0])+'[name]'+t.slice(cut[k][1]);return t};
const maskHtml=h=>typeof h==='string'?h.replace(/>([^<]+)</g,(m,t)=>'>'+maskNames(t)+'<').replace(/^([^<]+)/,(m,t)=>maskNames(t)):h;
const html=i=>maskHtml(rawHtml(i));
/* build ranked feed: linked incidents (≥2 sources) + strong single-source signals */
/* card titles: prefer a contributing headline with no name-like pattern; else generic "TYPE near PLACE". Publisher text stays unmodified in the sheet. */
const ORGW=/^(Police|Fire|Sheriff|County|City|State|National|Federal|Department|Dept|Office|Service|Weather|News|Air|Force|Army|Navy|Guard|Coast|Court|Supreme|House|Senate|Congress|White|United|Nations|Red|Cross|Health|University|College|School|Hospital|Airport|International|Global|Associated|Press|Reuters|Agency|Bureau|Authority|Commission|Council|Board|Ministry|Party|Republican|Democrat|Democratic|Republicans|Democrats|Breaking|Live|Update|Updates|Watch|Video|Photos|Storm|Flood|Flash|Winter|Tropical|Hurricane|Tornado|Severe|Thunderstorm|Warning|Watch|Advisory|Special|Marine|Wind|High|Red|Flag|Dense|Fog|Freeze|Frost|Heat|Excessive|Gale|Small|Craft|Beach|Hazards|Rip|Current|Statement|Earthquake|Wildfire|Fire|Highway|Interstate|Route|Street|Avenue|Road|Bridge|River|Lake|Mount|Mountain|Valley|Park|Island|North|South|East|West|Northern|Southern|Eastern|Western|Central|New|Los|Las|San|Santa|Saint|St|Fort|Port|Gulf|Pacific|Atlantic|Bay|Middle|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|The|A|An|In|On|At|As|After|Before|How|Why|What|When|Where|Who|Officials|Authorities|Residents|Crews|Firefighters|Troopers|Deputies|Officers|Man|Woman|Teen|Boy|Girl|Child|Driver|Suspect|Victim|Ground|Delay|Stop|Program)$/;
const nameLike=t=>{if(Crowd.nameCI(t))return true;const txt=t.replace(/^[^\w]+/,'');for(const m of txt.matchAll(/\b([A-Z][a-z'’]{1,15})\s+(?:[A-Z]\.\s+)?([A-Z][a-z'’-]{1,20})\b/g)){const [w,a,b]=m;if(ORGW.test(a)||ORGW.test(b))continue;if(PLACES.some(p=>p[0]===w||p[0]===a||p[0]===b)||STP.some(s=>s.n===w||s.n===a||s.n===b))continue;return true}return false};
const safeHead=(e)=>{const c=e.m.map(x=>x.i.title.replace(/^[^\w]+/,'')).filter(h=>!nameLike(h)&&!Crowd.unsafe(h));
 if(c.length)return {head:c[0],generic:false};return {head:`${(e.type||'event').replace(/^./,x=>x.toUpperCase())} ${e.place||e.near?'near '+(e.place||e.near):e.st?'in '+e.st:''}`.trim(),generic:true}};
let FEED=[];
function build(){const now=Date.now(),inc=incidents(),used=new Set();
 {const L=new Set();LAYERS.forEach(Ly=>itemsOf(Ly).forEach(i=>((i.title||'')+' '+(i.text||'')).replace(/(^|[.!?:]\s+)\S+/g,' ').match(/\b[a-z][a-z'’]{1,}\b/g)?.forEach(w=>L.add(w[0].toUpperCase()+w.slice(1)))));LOWW=L}
 const seen=new Set();const out=inc.filter(c=>{const h=c.head.toLowerCase();if(seen.has(h))return false;seen.add(h);return true}).map(c=>{c.m.forEach(x=>used.add(x.i));const tops=new Set([topicOf(c.type),...c.m.map(x=>topicOf(c.type,x.Ly.id))]);
  return {kind:'inc',type:c.type,lat:c.lat,lon:c.lon,first:c.first,last:c.last,conf:c.conf,cls:c.cls,src:c.src,m:c.m,topic:topicOf(c.type),tops,head:c.head.replace(/^[A-Z]+ — /,''),grow:c.grow,
   score:c.conf*2+Math.max(0,1-(now-c.last)/216e5)+c.grow*.1}});
 LAYERS.forEach(Ly=>{if(!W[Ly.id]||!state[Ly.id].on)return;let its=itemsOf(Ly).filter(i=>!used.has(i)&&!i.flagged);
  its=its.filter(i=>{const t=i.time||(Ly.id==='gdelt'?now:0);i._t=t;if(!t||now-t>(Ly.id==='quakes'||Ly.id==='alerts'?864e5:12*36e5)||t>now+6e5)return false;
   if(Ly.id==='quakes')return (i.sev||0)>=2.5;if(Ly.id==='fire')return (i.r||0)>=5;if(Ly.id==='alerts')return /Warning|Emergency/.test(i.title);
   if(Ly.id==='news'||Ly.id==='crowd')return !i.home&&!NOINC.test(i.text||i.title)&&Object.keys(LEX).some(k=>LEX[k].test(i.text||i.title));if(Ly.id==='gdelt')return false;return true});
  its.sort((a,b)=>b._t-a._t).slice(0,40).forEach(i=>{const txt=i.text||i.title||'';const ty=LYTYPE[Ly.id]||Object.keys(LEX).find(k=>LEX[k].test(txt))||(Ly.id==='alerts'?'storm':Ly.id==='d911'?'dispatch':Ly.id==='gdacs'?({EQ:'quake',TC:'storm',FL:'flood',VO:'volcano',WF:'fire',DR:'drought'}[i.gtype]||'disaster'):Ly.id);
   const m=[{i,Ly,t:i._t,c:clsOf(i,Ly),src:i.src||Ly.label}];const tp=topicOf(ty,Ly.id);
   out.push({kind:'one',type:ty,lat:i.lat,lon:i.lon,first:i._t,last:i._t,conf:.15,cls:[m[0].c],src:1,m,topic:tp,tops:new Set([tp,LYTOPIC[Ly.id]]),head:i.title.replace(/^[^\w]+/,''),grow:0,
    score:.3+W[Ly.id]*(Ly.id==='quakes'?(i.sev||0)/5:Ly.id==='gdacs'?(i.alert==='Red'?1.5:i.alert==='Orange'?1:.4):.6)+Math.max(0,1-(now-i._t)/216e5)})})});
 out.forEach(e=>{e.place=e.m.find(x=>x.i.place&&!x.i.home)?.i.place||null;e.near=nearPlace(e.lat,e.lon);e.st=stateOf(e.lat,e.lon);e.spark=sparkPts(e.m,now);const h=safeHead(e);e.head=h.head;e.generic=h.generic});
 FEED=out.sort((a,b)=>b.score-a.score);render();try{wCheck();offUI();if(!hashDone)openHash()}catch(err){console.warn(err)}}
const sparkPts=(m,now)=>{const b=Array(8).fill(0);m.forEach(x=>{const k=7-Math.floor((now-x.t)/9e5);if(k>=0&&k<8)b[k]++});return b};
const svgSpark=b=>{const mx=Math.max(...b,1);const pts=b.map((v,k)=>`${k*8+1},${17-v/mx*15}`).join(' ');return `<svg class="spk" viewBox="0 0 58 18" aria-hidden="true"><polyline points="${pts}"/></svg>`};
const visible=e=>!topOn.size||[...e.tops].some(t=>topOn.has(t));
const clsChips=cl=>Object.keys(CLASSES).map(k=>`<span class="cc cls-${k}${cl.includes(k)?' on':''}" title="${CLASSES[k]}">${CLASSES[k][0]}</span>`).join('');
const where=e=>e.place||e.near||(e.st?e.st:`${e.lat.toFixed(1)}, ${e.lon.toFixed(1)}`);
/* coverage split: items per source class -> bar + factual label (who reported it, nothing about truth) */
const covCounts=e=>{const n={official:0,major:0,independent:0};e.m.forEach(x=>n[x.c]=(n[x.c]||0)+1);return n};
const covLabel=n=>{const k=Object.keys(CLASSES).filter(c=>n[c]);return k.length===3?'Reported by: all three classes':k.length===1?`Reported by: ${k[0]} only`:'Reported by: '+k.join(' + ')};
const covBar=e=>{const n=covCounts(e),t=e.m.length||1;return `<span class="cov" role="img" aria-label="${covLabel(n)}: ${n.official} official, ${n.major} major, ${n.independent} independent">${Object.keys(CLASSES).map(c=>`<i class="cv-${c}" style="width:${n[c]/t*100}%"></i>`).join('')}</span><span class="covl"><span>OFF ${n.official}</span><span>MAJ ${n.major}</span><span>IND ${n.independent}</span><em>${covLabel(n)}</em></span>`};
const segOf=e=>e.cls.every(c=>c==='independent')?'gap':e.cls.every(c=>c==='official')?'off':'mix';
const card=(e,k)=>{const T=TOPICS[e.topic],cf=Math.round(e.conf*100);return `<li><button class="card" data-k="${k}" style="--tc:${T[2]}"><span class="ct"><b class="ty">[${T[1]} ${esc((e.type||'event').toUpperCase())}]</b><span class="ro id">#${(e.m[0]?.i.id||k+'').toString().slice(-4).toUpperCase()}</span><span class="conf" aria-label="confidence ${cf} percent"><i style="width:${cf}%"></i><em>CONF ${cf}%</em></span></span>
<span class="hl"><span class="pr" aria-hidden="true">&gt; </span>${esc(e.head.slice(0,110))}</span><span class="meta ro"><span class="pl">◎ ${esc(where(e).slice(0,40))}</span><span>T-${ago(e.last/1000).replace(' ago','')}</span><span>${e.src} SRC${e.m.length>1?' / '+e.m.length+' ITM':''}${e.grow?' ↑'+e.grow:''}</span></span>
<span class="cf">${covBar(e)}${svgSpark(e.spark)}</span></button></li>`};
let seg=sessionStorage.getItem('eyemont.seg')||'all';
function list(ul,arr,empty,sg){const v=arr.filter(visible).filter(e=>!sg||sg==='all'||segOf(e)===sg);ul.innerHTML=v.length?v.slice(0,120).map(e=>card(e,FEED.indexOf(e))).join(''):`<li class="empty">${empty}</li>`}
let tab=localStorage.getItem('eyemont.tab')||'now';
/* COMMAND CONSOLE: status HUD, clocks, intercepted-traffic ticker, coverage segments */
const RMQ=matchMedia('(prefers-reduced-motion: reduce)');
function hud(ld,ok){$('#hf').textContent=navigator.onLine?`${ok}/${ld.length}`:'OFFLINE';$('#hf').classList.toggle('bad',!navigator.onLine);const now=Date.now();let n=0;FEED.forEach(e=>e.m.forEach(x=>{if(x.t>now-36e5&&x.t<=now+6e4)n++}));
 $('#hs').textContent=(n/60).toFixed(1);$('#hi').textContent=FEED.filter(e=>e.kind==='inc').length;ticker()}
let tkSig='';function ticker(){const v=FEED.filter(visible).slice(0,24),sig=v.map(e=>e.head).join('|');if(sig===tkSig)return;tkSig=sig;
 const row=v.map(e=>{const T=TOPICS[e.topic];return `<button class="ti" data-k="${FEED.indexOf(e)}" style="--tc:${T[2]}" tabindex="-1"><b>${new Date(e.last).toISOString().slice(11,16)}Z</b> ${T[1]} ${esc((e.type||'event').toUpperCase())} · ${esc(where(e).slice(0,24))} · <span>${esc(e.head.slice(0,70))}</span></button>`}).join('<span class="sep" aria-hidden="true">///</span>');
 const tk=$('#tk');tk.innerHTML=row+(RMQ.matches?'':'<span class="sep" aria-hidden="true">///</span>'+row);tk.style.setProperty('--dur',Math.max(40,v.length*7)+'s')}
const tkp=$('#tkp');const setTk=p=>{document.body.classList.toggle('tkpause',p);tkp.setAttribute('aria-pressed',p);tkp.textContent=p?'▶':'❚❚';tkp.setAttribute('aria-label',p?'Resume live ticker':'Pause live ticker')};
tkp.onclick=()=>setTk(!document.body.classList.contains('tkpause'));
$('#tkw').addEventListener('click',e=>{const b=e.target.closest('.ti');if(!document.body.classList.contains('tkpause')){setTk(true);return}if(b)openDetail(+b.dataset.k)});
const pad=n=>String(n).padStart(2,'0');let clkT=null;
function clk(){const d=new Date();$('#clk').textContent=`UTC ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} · LOC ${pad(d.getHours())}:${pad(d.getMinutes())}${TZL?' '+TZL:''}`}
const clkOn=()=>{clk();if(!clkT)clkT=setInterval(clk,1000)};document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInterval(clkT);clkT=null}else clkOn()});clkOn();
const SEGN={all:'All incidents, every source class.',gap:'COVERAGE GAP: reported by independent or citizen sources only, no official or major outlet linked yet. Coverage analysis, not verification.',off:'OFFICIAL ONLY: reported only by government or public bodies so far; no major or independent outlet linked yet.'};
function segUI(){document.querySelectorAll('#seg button').forEach(b=>{const v=b.dataset.v,n=FEED.filter(visible).filter(e=>v==='all'||segOf(e)===v).length;b.setAttribute('aria-pressed',v===seg);b.innerHTML=`${v==='all'?'ALL':v==='gap'?'COVERAGE GAP':'OFFICIAL ONLY'} <b>${n}</b>`});$('#segnote').textContent=SEGN[seg]}
$('#seg').onclick=e=>{const b=e.target.closest('button');if(!b)return;seg=b.dataset.v;sessionStorage.setItem('eyemont.seg',seg);document.body.classList.add('glitch');setTimeout(()=>document.body.classList.remove('glitch'),260);render()};

/* empty-state wording: never claim "syncing" once every feed has failed; show error + retry state */
const feedMsg=(ld,er)=>{const pend=ld.filter(l=>!state[l.id].data&&!state[l.id].err).length;if(!er.length||pend)return 'syncing feeds…';
 const nx=Math.min(...er.map(l=>state[l.id].next||Infinity)),sec=isFinite(nx)?Math.max(0,Math.round((nx-Date.now())/1000)):null;
 return `<span class="err">⚠ Could not reach ${er.length} feed${er.length>1?'s':''} (offline or blocked).</span><br>Retrying automatically${sec!=null?' in '+sec+' s':''}. <button type="button" class="btn" data-retry>RETRY NOW</button>`};
document.addEventListener('click',e=>{if(!e.target.closest('[data-retry]'))return;LAYERS.forEach(Ly=>{const s=state[Ly.id];if(s.on&&s.err){s.fails=0;s.err=null;refresh(Ly)}});render()});

function render(){const ld=LAYERS.filter(l=>state[l.id].on&&W[l.id]),ok=ld.filter(l=>state[l.id].data).length,er=ld.filter(l=>state[l.id].err);hud(ld,ok);
 $('#sync').textContent=!navigator.onLine?'cached snapshot':ld.length&&er.length===ld.length?`offline · ${er.length} feeds retrying`:`${ok}/${ld.length} feeds${er.length?' · '+er.length+' retrying':''}`;$('#sync').classList.toggle('bad',!!er.length&&er.length===ld.length);$('#sync').title=er.map(l=>l.label+': '+state[l.id].err).join('\n');
 const nInc=FEED.filter(e=>e.kind==='inc'&&visible(e)).length;
 if(tab==='now'){$('#nowsum').innerHTML=`<b>${FEED.filter(visible).length}</b> signals · <b>${nInc}</b> linked incidents · ranked by confidence, severity, recency`;list($('#nowlist'),FEED,ok?(seg==='all'?'Nothing matches these filters.':'No incidents in this coverage view right now.'):feedMsg(ld,er),seg);segUI();const lv=$('#livestrip'),LV=LAYERS.find(l=>l.id==='live');if(topOn.has('news')&&clsOn[LV.cls]){ensure('live').then(()=>{if(!(topOn.has('news')&&clsOn[LV.cls]))return;lv.innerHTML=(state.live.data||[]).map(l=>`<li><a target=_blank rel=noopener href="${esc(links(l.popup)[0]?.[0]||'#')}">▶ ${esc(l.title)} ↗</a></li>`).join('');lv.hidden=false})}else lv.hidden=true}
 if(tab==='near')renderNear();if(tab==='int')renderInt();if(tab==='map'&&!TM.on)drawMap()}
/* NEAR: coarse region only (chosen state, or a timezone guess). No geolocation API is used. */
/* tz -> [state, coarse?]. Coarse = the zone spans many states, so we show "Guessed: NY, change". Includes IANA links/aliases Chrome may report. */
const TZ=(()=>{const m={},put=(st,c,...z)=>z.forEach(x=>m[x]=[st,c]);
 put('New York',1,'America/New_York','US/Eastern','EST5EDT','EST');put('Illinois',1,'America/Chicago','US/Central','CST6CDT');put('Colorado',1,'America/Denver','US/Mountain','MST7MDT','Navajo','America/Shiprock');
 put('California',1,'America/Los_Angeles','US/Pacific','PST8PDT');put('Arizona',0,'America/Phoenix','US/Arizona','MST');put('Michigan',0,'America/Detroit','US/Michigan','America/Menominee');
 put('Indiana',0,'America/Indiana/Indianapolis','America/Indianapolis','America/Fort_Wayne','US/East-Indiana','America/Indiana/Knox','America/Knox_IN','US/Indiana-Starke','America/Indiana/Marengo','America/Indiana/Petersburg','America/Indiana/Tell_City','America/Indiana/Vevay','America/Indiana/Vincennes','America/Indiana/Winamac');
 put('Kentucky',0,'America/Kentucky/Louisville','America/Louisville','America/Kentucky/Monticello');put('North Dakota',0,'America/North_Dakota/Center','America/North_Dakota/New_Salem','America/North_Dakota/Beulah');
 put('Alaska',0,'America/Anchorage','America/Juneau','America/Sitka','America/Nome','America/Yakutat','America/Metlakatla','America/Adak','America/Atka','US/Alaska','US/Aleutian');
 put('Hawaii',0,'Pacific/Honolulu','Pacific/Johnston','US/Hawaii','HST');put('Idaho',0,'America/Boise');put('Puerto Rico',0,'America/Puerto_Rico');put('U.S. Virgin Islands',0,'America/St_Thomas','America/Virgin');
 put('Guam',0,'Pacific/Guam');put('Northern Mariana Islands',0,'Pacific/Saipan');put('American Samoa',0,'Pacific/Pago_Pago','Pacific/Samoa','US/Samoa','Pacific/Midway');return m})();
let nearGuess=null;
let near=localStorage.getItem('eyemont.near')||'';
function renderNear(){const s=$('#nearsel');if(near&&s.value!==near)s.value=near;const b=BBOX[near];
 const h=$('#nearhint'),ab=STP.find(x=>x.n===near)?.a||near;
 if(!near)h.textContent='pick a state';else if(localStorage.getItem('eyemont.near'))h.textContent='saved on this device only';
 else{h.innerHTML=`Guessed: <b>${esc(ab)}</b>, <button type="button" id="nearchg" class="linkbtn">change</button>${nearGuess&&nearGuess[1]?' <span class="coarse">(your timezone covers many states)</span>':''}`;$('#nearchg').onclick=()=>{const s=$('#nearsel');s.focus();try{s.showPicker()}catch(e){s.click()}}}
 list($('#nearlist'),b?FEED.filter(e=>e.st===near):[],near?`No signals in ${esc(near)} right now.`:'Pick a state above.');
 const sc=$('#nearscan');if(near&&sc.dataset.st!==near){sc.dataset.st=near;Scanners.showState(sc,near,null)}}
/* MAP: one map, markers colored by event topic; no layer toggles */
const mg=L.layerGroup().addTo(map),camG=L.markerClusterGroup({chunkedLoading:true,showCoverageOnHover:false,maxClusterRadius:50});
function drawMap(){mg.clearLayers();FEED.filter(visible).forEach(e=>{const col=TOPICS[e.topic][2];const ll=[e.lat,e.lon];
  const mk=e.kind==='inc'?L.circleMarker(ll,{radius:9+e.src*1.5,color:col,weight:2,fillColor:col,fillOpacity:.25}):L.circleMarker(ll,{radius:6,color:'#000',weight:1,fillColor:col,fillOpacity:.9});
  mk.on('click',()=>openDetail(FEED.indexOf(e)));mk.addTo(mg)});
 const tr=topOn.has('transport');if(tr&&!map.hasLayer(camG))loadCams().then(cs=>{camG.clearLayers();camG.addLayers(cs.filter(i=>clsOn.official).map(i=>L.circleMarker([i.lat,i.lon],{radius:5,color:'#00e5ff',weight:1,fillOpacity:.5}).bindPopup(()=>html(i))));camG.addTo(map)});
 if(!tr&&map.hasLayer(camG))camG.remove();
 airG.clearLayers();if(tr)ensure('air').then(()=>{airG.clearLayers();if(!clsOn.independent||tab!=='map')return;const b=map.getBounds().pad(.2);itemsOf(LAYERS.find(l=>l.id==='air')).filter(i=>b.contains([i.lat,i.lon])).slice(0,2500).forEach(i=>L.circleMarker([i.lat,i.lon],{radius:2.5,color:'#00e5ff',weight:0,fillOpacity:.8}).bindPopup(i.popup).addTo(airG))}).catch(()=>{});
 liveG.clearLayers();if(topOn.has('news'))ensure('live').then(()=>{liveG.clearLayers();if(!clsOn.major)return;(state.live.data||[]).forEach(i=>L.circleMarker([i.lat,i.lon],{radius:7,color:'#fff',weight:2,fillColor:'#000',fillOpacity:1}).bindPopup(i.popup).addTo(liveG))});
 setTimeout(()=>map.invalidateSize(),30)}
const airG=L.layerGroup().addTo(map),liveG=L.layerGroup().addTo(map);map.on('moveend',()=>{if(tab==='map'&&topOn.has('transport'))drawMap()});
/* on-demand context layers (aircraft snapshot, live TV) share the layer loaders and attribution */
const ensure=id=>{const Ly=LAYERS.find(l=>l.id===id),s=state[id];if(s.data)return Promise.resolve();if(!s.p){s.on=true;map.attributionControl.addAttribution(Ly.attribution);s.p=Ly.load().then(d=>{s.data=d;s.err=null}).catch(e=>{s.p=null;s.on=false;s.err=e.message;toast(Ly.label+': '+e.message);throw e})}return s.p};
let CAMS=null;const loadCams=()=>CAMS||(CAMS=LAYERS.find(l=>l.id==='cams').load().catch(e=>{CAMS=null;return[]}));
/* detail sheet */
const sheet=$('#sheet'),sb=$('#sbody');let rmap=null;
/* HEADLINE DIFF: one representative headline per class side by side; words used only by that class are highlighted. Names masked. */
const WSTOP=new Set('a an the of in on at to for and or is are was were be by with from as after over into new says say said amid near its it this that has have had will not no up out'.split(' '));
const hdToks=t=>(t.toLowerCase().match(/[a-z0-9'’]+/g)||[]).filter(w=>!WSTOP.has(w)&&w.length>2);
function framing(e){const by={};e.m.forEach(x=>(by[x.c]=by[x.c]||[]).push(x));const ks=Object.keys(CLASSES);
 const rep=c=>{const a=by[c];if(!a)return null;a.sort((p,q)=>p.t-q.t);return maskNames(a[0].i.title.replace(/^[^\w]+/,''))};
 const H={};ks.forEach(c=>H[c]=rep(c));const W={};ks.forEach(c=>W[c]=new Set(H[c]?hdToks(H[c]):[]));
 const mark=(c,t)=>esc(t).replace(/[A-Za-z0-9'’]+/g,w=>{const l=w.toLowerCase();return !WSTOP.has(l)&&l.length>2&&ks.some(o=>o!==c&&H[o])&&!ks.some(o=>o!==c&&W[o].has(l))?`<mark>${w}</mark>`:w});
 const n=covCounts(e);
 return `<h3>HEADLINE DIFF <small>how each source class frames it</small></h3><p class="covsum">${covBar(e)}</p><div class="diff">${ks.map(c=>`<div class="dc cls-${c}"><span class="cls cls-${c}">${CLASSES[c]} · ${n[c]}</span>${H[c]?`<p>${mark(c,H[c])}</p><small>first: ${esc(by[c][0].src)} · ${tzt(by[c][0].t,1)}</small>`:`<p class="none">COVERAGE GAP<br><small>no ${c} source linked</small></p>`}</div>`).join('')}</div><small class="note">Highlighted words appear only in that class's headline. Earliest headline per class; names masked. Coverage analysis, not a judgement of accuracy.</small>`}
function openDetail(k){const e=FEED[k];if(!e)return;const T=TOPICS[e.topic];const by={};e.m.forEach(x=>(by[x.c]=by[x.c]||[]).push(x));
 const lk=[];e.m.forEach(x=>links(html(x.i)).forEach(l=>{if(!lk.some(y=>y[0]===l[0]))lk.push([l[0],l[1],x.src])}));if(e.m.some(x=>x.i.url)){e.m.forEach(x=>{if(x.i.url&&!lk.some(y=>y[0]===x.i.url))lk.push([x.i.url,'read at '+x.src,x.src])})}
 const us=!!e.st;
 sb.innerHTML=`<p class="kick" style="color:${T[2]}">${T[1]} ${esc((e.type||'event').toUpperCase())} · ${esc(T[0])}</p><h2 id="stitle">${esc(e.head)}</h2>
${e.m.some(x=>x.i.start)?`<p class="meta">✈ Delay ${(()=>{const st=Math.min(...e.m.filter(x=>x.i.start).map(x=>x.i.start));return (st>Date.now()?'starts ':'started ')+tzt(st)})()}</p>`:''}<p class="meta">◎ ${esc(where(e))}${e.near&&e.place&&!e.near.startsWith(e.place)?` <small>(${esc(e.near)})</small>`:''}<br>⏱ ${tzt(e.first)}${e.last!==e.first?' → '+tzt(e.last,1):''} · ${ago(e.last/1000)}</p>
<div class="cbig"><span class="conf"><i style="width:${Math.round(e.conf*100)}%"></i><em>confidence ${Math.round(e.conf*100)}%</em></span>${svgSpark(e.spark)}</div>
<p class="note">${e.kind==='inc'?`${e.src} distinct sources · ${e.cls.length} class(es) · ${e.m.length} items linked by place (≤25 km), time (≤2 h) and event type. Automatic match, not verification.`:'Single source so far. Confidence rises when independent sources report the same event nearby.'}</p>
<h3>COVERAGE BY SOURCE CLASS</h3><div class="grid3">${Object.keys(CLASSES).map(c=>`<div class="col${by[c]?'':' none'}"><span class="cls cls-${c}">${CLASSES[c]}</span>${(by[c]||[]).slice(0,6).map(x=>`<p><small>${esc(x.src)}</small>${esc(maskNames(x.i.title.replace(/^[^\w]+/,'')).slice(0,90))}</p>`).join('')||'<p><small>no coverage</small></p>'}</div>`).join('')}</div>
${framing(e)}
${e.m.some(x=>x.Ly.id==='reports')?`<h3>COMMUNITY REPORTS (UNMODERATED)</h3><div class="rep">${e.m.filter(x=>x.Ly.id==='reports').map(x=>html(x.i)+(x.i.mock?'<small>posted to the local test relay (not public)</small>':'')).join('')}</div>`:''}<h3>TIMELINE</h3><ol class="tl">${e.m.slice().sort((a,b)=>b.t-a.t).slice(0,15).map(x=>`<li><time>${new Date(x.t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time><span class="cls cls-${x.c}">${CLASSES[x.c][0]}</span> ${esc(maskNames(x.i.title.replace(/^[^\w]+/,'')).slice(0,100))} <small>${esc(x.src)}</small></li>`).join('')}</ol>
<h3>RADAR</h3>${us?'<div id="rmap" role="img" aria-label="Radar map"></div><small>NEXRAD via Iowa Environmental Mesonet (US only, ~5 min)</small>':`<p><a class="btn" target=_blank rel=noopener href="https://zoom.earth/maps/radar/#view=${e.lat.toFixed(2)},${e.lon.toFixed(2)},8z">Open radar near here ↗</a></p>`}
<h3>NEARBY CAMS</h3><div id="ncams"><small>${e.st==='California'||(e.lat>32&&e.lat<42.1&&e.lon<-114&&e.lon>-124.5)?'searching Caltrans cams…':'No public cams indexed near here yet (Caltrans only for now).'}</small></div>
<h3>SCANNERS</h3><ul class="sl">${us?`<li><a target=_blank rel=noopener href="https://www.broadcastify.com/listen/stid/${SFIPS[e.st]||''}">📻 ${esc(e.st)} feeds on Broadcastify ↗</a><small>opens Broadcastify's site (no embedding)</small></li>`:''}${OFFS.filter(o=>km(o.lat,o.lon,e.lat,e.lon)<150).map(o=>`<li><a target=_blank rel=noopener href="${esc(o.url)}">★ ${esc(o.title)} ↗</a><small>${esc(o.note)}</small></li>`).join('')}${us?'':'<li><small>Scanner directory covers US states only.</small></li>'}</ul>
<h3>SOURCES</h3><ul class="sl">${lk.slice(0,20).map(l=>`<li><a target=_blank rel=noopener href="${esc(l[0])}">${esc(maskNames(l[1]||l[2]))} ↗</a><small>${esc(l[2])}</small></li>`).join('')||'<li><small>no direct links</small></li>'}</ul>
<p><button class="btn" id="showmap">◎ SHOW ON MAP</button></p>`;
 sheet.hidden=false;document.body.classList.add('sheet');sheet.scrollTop=0;sb.scrollTop=0;$('#sclose').focus({preventScroll:true});
 $('#showmap').onclick=()=>{closeSheet();setTab('map');setTimeout(()=>map.flyTo([e.lat,e.lon],Math.max(map.getZoom(),8)),80)};
 if(us){if(rmap){rmap.remove();rmap=null}rmap=L.map('rmap',{zoomControl:false,attributionControl:true,dragging:true}).setView([e.lat,e.lon],7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(rmap);
  L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png?_='+Math.floor(Date.now()/3e5),{opacity:.7,maxNativeZoom:12,attribution:'Radar: IEM NEXRAD'}).addTo(rmap);
  L.circleMarker([e.lat,e.lon],{radius:7,color:T[2]}).addTo(rmap)}
 if(/searching/.test($('#ncams').textContent))loadCams().then(cs=>{const n=cs.map(i=>[km(i.lat,i.lon,e.lat,e.lon),i]).filter(a=>a[0]<40).sort((a,b)=>a[0]-b[0]).slice(0,4);
  $('#ncams').innerHTML=n.length?'<div class="cams">'+n.map(([d,i])=>{const h=html(i);const img=(h.match(/<img src="([^"]+)"/)||[])[1];const live=(h.match(/<button class="live"[^>]*>/)||[''])[0];
   return `<figure>${img?`<img loading="lazy" src="${img}" alt="cam snapshot">`:''}<figcaption>${esc(maskNames(i.title).slice(0,60))} · ${d.toFixed(0)} km</figcaption>${live?live+'▶ LIVE</button>':''}</figure>`}).join('')+'</div><small>Caltrans public CCTV</small>':'<small>No Caltrans cams within 40 km.</small>'})}
function closeSheet(){sheet.hidden=true;document.body.classList.remove('sheet');if(rmap){rmap.remove();rmap=null}}
$('#sclose').onclick=closeSheet;addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
document.addEventListener('click',ev=>{const b=ev.target.closest('button.card');if(b)openDetail(+b.dataset.k)});
let SFIPS={},OFFS=[];getJSON('data/counties.json').then(d=>Object.entries(d).forEach(([n,s])=>SFIPS[n]=s.fips)).catch(()=>{});getJSON('data/official_streams.json').then(d=>OFFS=d).catch(()=>{});
/* tabs */
function setTab(t){if(t!=='map'&&typeof TM!=='undefined'&&TM.on)tmSet(false);if(tab!==t){document.body.classList.add('glitch');setTimeout(()=>document.body.classList.remove('glitch'),260)}tab=t;localStorage.setItem('eyemont.tab',t);document.querySelectorAll('#tabs button').forEach(b=>{b.setAttribute('aria-selected',b.dataset.t===t)});
 document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='v-'+t);document.body.dataset.tab=t;render()}
$('#tabs').onclick=e=>{const b=e.target.closest('button');if(b)setTab(b.dataset.t)};
/* persistent filters: source class + topics */
const cb=$('#clsbar');cb.innerHTML=Object.entries(CLASSES).map(([k,v])=>`<button data-c="${k}" class="cls-${k}${clsOn[k]?' on':''}" aria-pressed="${clsOn[k]}">${v}</button>`).join('')+'<button id="clsinfo" aria-label="About source classes">ⓘ</button>';
cb.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='clsinfo'){$('#info').hidden=!$('#info').hidden;return}const k=b.dataset.c;clsOn[k]=!clsOn[k];
 if(!Object.values(clsOn).some(Boolean)){clsOn[k]=true;return toast('At least one class must stay on')}b.classList.toggle('on',clsOn[k]);b.setAttribute('aria-pressed',clsOn[k]);localStorage.setItem('eyemont.cls',JSON.stringify(clsOn));build()};
$('#info').onclick=()=>$('#info').hidden=true;
const tb=$('#topics');tb.innerHTML=`<button data-p="" class="${topOn.size?'':'on'}">ALL</button>`+Object.entries(TOPICS).map(([k,t])=>`<button data-p="${k}" style="--tc:${t[2]}" class="${topOn.has(k)?'on':''}" aria-pressed="${topOn.has(k)}">${t[1]} ${t[0]}</button>`).join('');
tb.onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.p;if(!k)topOn.clear();else topOn.has(k)?topOn.delete(k):topOn.add(k);
 tb.querySelectorAll('button').forEach(x=>{const on=x.dataset.p?topOn.has(x.dataset.p):!topOn.size;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});localStorage.setItem('eyemont.topics',JSON.stringify([...topOn]));crowdBar();render()};
/* REPORTS (Nostr): under the Crowd chip, OFF by default every session, behind the unmoderated notice. Writes go to a mock relay only (crowd.js MOCK_WRITES). */
const cbar=$('#crowdbar'),rt=$('#repTog');
function crowdBar(){const v=topOn.has('crowd');cbar.hidden=!v;document.body.classList.toggle('crowd',v);setTimeout(()=>map.invalidateSize(),30)}crowdBar();
function setReports(on){const s=state.reports,Ly=LAYERS.find(l=>l.id==='reports');s.on=on;rt.textContent='✚ REPORTS: '+(on?'ON':'OFF');rt.setAttribute('aria-pressed',on);
 if(on){map.attributionControl.addAttribution(Ly.attribution);refresh(Ly)}else{clearTimeout(s.timer);s.data=null;s.err=null;map.attributionControl.removeAttribution(Ly.attribution);rebuild()}}
rt.onclick=()=>{if(state.reports.on)return setReports(false);if(localStorage.getItem('eyemont.reportsAck'))return setReports(true);$('#notice').hidden=false;$('#nyes').focus()};
$('#nno').onclick=()=>$('#notice').hidden=true;$('#nyes').onclick=()=>{localStorage.setItem('eyemont.reportsAck','1');$('#notice').hidden=true;setReports(true)};
function relayChip(st){const v=Object.entries(st),up=v.filter(x=>x[1]==='up').length;document.querySelectorAll('.relaychip').forEach(c=>{c.textContent=`relays ${up}/${v.length} up`;c.title=v.map(([u,x])=>u+': '+x).join('\n')})}
window.addEventListener('eyemont:relays',e=>relayChip(e.detail));relayChip(Reports.status());
let pickLL=null,picking=false,pickMk=null;
$('#repPost').onclick=()=>{Reports.lib().catch(()=>{});sb.innerHTML=`<p class="kick" style="color:#ff2bd6">✎ NEW REPORT · TEST RELAY</p><h2 id="stitle">Describe an event, not people</h2>
<p class="note">This build posts to a <b>local test relay</b> in this tab only. Nothing is published to Nostr. No names, addresses, plates or phone numbers (filtered). Area is rounded to ~5 km. Posting first computes a proof-of-work (NIP-13, ${Reports.POW} bits, ~10–60 s).</p>
<div class="form"><label for="rcat">CATEGORY</label><select id="rcat">${Reports.CATS.map(c=>`<option>${c}</option>`).join('')}</select><label for="rtxt">WHAT IS HAPPENING? <small id="rcnt">0/280</small></label><textarea id="rtxt" maxlength="280" rows="3"></textarea>
<div class="row"><button class="btn" id="rpick">📍 PICK AREA ON MAP</button><small id="rloc">${pickLL?'area '+Reports.gh(pickLL.lat,pickLL.lng,5)+' (~5 km)':'no area picked'}</small></div><div class="row"><button class="btn" id="rsend">POST TO TEST RELAY</button><small id="rout"></small></div></div>`;
 sheet.hidden=false;document.body.classList.add('sheet');const ta=$('#rtxt');ta.value=sessionStorage.getItem('eyemont.draft')||'';ta.oninput=()=>{$('#rcnt').textContent=ta.value.length+'/280';sessionStorage.setItem('eyemont.draft',ta.value)};
 $('#rpick').onclick=()=>{picking=true;document.body.classList.add('picking');closeSheet();setTab('map');toast('Tap the map where it is happening')};
 $('#rsend').onclick=async()=>{const out=$('#rout');if(!pickLL){out.textContent='Pick an area first.';return}out.innerHTML='computing proof-of-work… <progress max=1 value=0></progress>';const pg=out.querySelector('progress');
  try{await Reports.publish($('#rcat').value,ta.value,pickLL.lat,pickLL.lng,p=>{pg.value=p;if(p>=1)out.textContent='posting to test relay…'});out.textContent='Saved to the local test relay (not public).';ta.value='';ta.dispatchEvent(new Event('input'));$('#rcat').selectedIndex=0;$('#rloc').textContent='no area picked';sessionStorage.removeItem('eyemont.draft');pickLL=null;if(pickMk){pickMk.remove();pickMk=null}if(state.reports.on)refresh(LAYERS.find(l=>l.id==='reports'))}catch(x){out.textContent=x.message}}};
map.on('click',e=>{if(!picking)return;picking=false;document.body.classList.remove('picking');pickLL=e.latlng;if(pickMk)pickMk.remove();pickMk=L.circle(pickLL,{radius:2500,color:'#ff2bd6'}).addTo(map);$('#repPost').click()});
function toast(t){const d=$('#toast');d.textContent=t;d.hidden=false;clearTimeout(d._t);d._t=setTimeout(()=>d.hidden=true,3000)}
/* loading with backoff, same contract as before */
/* heavy news.json waits for first paint of the other feeds */
let painted;const PAINTED=new Promise(r=>painted=r);const markPaint=()=>requestAnimationFrame(()=>setTimeout(painted,0));if(document.readyState==='complete')setTimeout(markPaint,600);else addEventListener('load',()=>setTimeout(markPaint,300));
let bT;const rebuild=()=>{clearTimeout(bT);bT=setTimeout(build,250)};
async function refresh(Ly){const s=state[Ly.id];clearTimeout(s.timer);if(!s.on)return;
 try{const d=await Ly.load();if(!s.on)return;s.data=d;s.err=null;s.fails=0;if(Ly.refresh)s.timer=setTimeout(()=>refresh(Ly),Ly.refresh)}
 catch(e){s.fails++;const wait=Math.min(5e3*2**(s.fails-1),300e3);s.err=`unavailable (${e.message}), retry in ${Math.round(wait/1000)}s`;s.next=Date.now()+wait;s.timer=setTimeout(()=>refresh(Ly),wait)}rebuild()}
LAYERS.forEach(Ly=>{if(state[Ly.id].on){map.attributionControl.addAttribution(Ly.attribution);refresh(Ly)}});
map.attributionControl.addAttribution('Cams: <a href="https://cwwp2.dot.ca.gov">Caltrans</a>');
window.addEventListener('eyemont:hidden',()=>refresh(LAYERS.find(l=>l.id==='crowd')));
const ns=$('#nearsel');getJSON('states-bbox.json').then(b=>{BBOX=b;Object.keys(b).sort().forEach(k=>ns.add(new Option(k,k)));
 if(!near){const g=TZ[Intl.DateTimeFormat().resolvedOptions().timeZone];if(g&&BBOX[g[0]]){near=g[0];nearGuess=g}}Promise.all([PLACE_OK,STATES_OK,ALLOW_OK,PFALL]).then(build)}).catch(()=>{});
ns.onchange=()=>{near=ns.value;localStorage.setItem('eyemont.near',near);render()};
setInterval(()=>tab!=='map'&&render(),60e3);
/* ---------- SIGNAL INTERCEPT: raw chronological firehose (names masked, DOM capped) ---------- */
const IPAGE=150,IMAX=600;let iCap=IPAGE,iPaused=false,iShown=new Set(),iSnap=null,iQ='';
function interceptItems(){const now=Date.now(),out=[];LAYERS.forEach(Ly=>{const s=state[Ly.id];if(!s.on||!s.data||Ly.tile||Ly.dynamic||Ly.id==='live'||Ly.id==='cams')return;
 itemsOf(Ly).forEach(i=>{if(i.flagged)return;const t=i.time;if(!t||t>now+6e5||now-t>864e5)return;const txt=i.title||i.text||'';const ty=LYTYPE[Ly.id]||Object.keys(LEX).find(k=>LEX[k].test(txt))||null;const tp=topicOf(ty,Ly.id);
  if(topOn.size&&!topOn.has(tp)&&!topOn.has(LYTOPIC[Ly.id]))return;out.push({k:Ly.id+'|'+t+'|'+txt.slice(0,60),t,Ly,i,c:clsOf(i,Ly),tp,txt})})});
 return out.sort((a,b)=>b.t-a.t)}
const iTime=t=>{const d=new Date(t);return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`};
const iRow=x=>{const T=TOPICS[x.tp],u=x.i.url||(x.i.popup?links(x.i.popup)[0]?.[0]:'');const h=esc(maskNames(x.txt.replace(/^[^\w]+/,'')).slice(0,160));const pl=x.i.place&&!x.i.home?` <span class="ipl">◎ ${esc(maskNames(x.i.place))}</span>`:'';
 return `<li style="--tc:${T[2]}"><span class="it">${iTime(x.t)}</span><span class="cls cls-${x.c}">${x.c[0].toUpperCase()}</span><span class="isrc">${esc(x.Ly.label.replace(/^\S+\s/,''))}</span><span class="ih">${u?`<a href="${esc(u)}" target=_blank rel=noopener>${h} ↗</a>`:h}${pl}</span></li>`};
function renderInt(){const all=interceptItems(),q=iQ.toLowerCase();const match=x=>!q||maskNames(x.txt).toLowerCase().includes(q)||x.Ly.label.toLowerCase().includes(q);
 if(iPaused&&iSnap){const n=all.filter(x=>match(x)&&!iShown.has(x.k)).length;const b=$('#inew');b.hidden=!n;b.textContent=`▲ ${n} NEW · RESUME`;return}
 const v=all.filter(match);iShown=new Set(v.map(x=>x.k));iSnap=v;$('#inew').hidden=true;
 $('#ilist').innerHTML=v.length?v.slice(0,iCap).map(iRow).join(''):'<li class="empty">No signals match.</li>';
 $('#isum').textContent=`${v.length} signals · last 24h · showing ${Math.min(iCap,v.length)} · newest first`;const mb=$('#imore');mb.hidden=v.length<=iCap||iCap>=IMAX;mb.textContent=`SHOW ${IPAGE} MORE`}
const setIP=p=>{iPaused=p;const b=$('#ipause');b.setAttribute('aria-pressed',p);b.textContent=p?'▶ RESUME':'❚❚ PAUSE';if(!p){iSnap=null;renderInt()}};
$('#ipause').onclick=()=>setIP(!iPaused);$('#inew').onclick=()=>setIP(false);$('#imore').onclick=()=>{iCap=Math.min(IMAX,iCap+IPAGE);iSnap=null;const p=iPaused;iPaused=false;renderInt();iPaused=p};
let iqT;$('#iq').oninput=e=>{clearTimeout(iqT);iqT=setTimeout(()=>{iQ=e.target.value.trim();iCap=IPAGE;const p=iPaused;iPaused=false;renderInt();iPaused=p;if(p)iSnap=true},200)};
setInterval(()=>tab==='int'&&!document.hidden&&renderInt(),15e3);
/* ---------- TIME MACHINE: replay last 6/12/24h on the map ---------- */
const TM={on:false,play:false,hist:null,pts:[],cur:1,timer:null,g:L.layerGroup()};const CL={o:'official',m:'major',i:'independent'};
const tmLoad=()=>TM.hist||(TM.hist=getJSON('data/history/24h.json?t='+Math.floor(Date.now()/9e5)).then(d=>d.r||[]).catch(()=>[]));
async function tmBuild(){const h=await tmLoad(),seen=new Set(),pts=[],key=(ty,a,b,t)=>ty+'|'+a.toFixed(1)+'|'+b.toFixed(1)+'|'+Math.round(t/6e5);
 h.forEach(r=>{const t=r[4]*1e3,c=CL[r[5]]||'major';if(!clsOn[c])return;const k=key(r[1],r[2],r[3],t);if(seen.has(k))return;seen.add(k);pts.push({t,lat:r[2],lon:r[3],ty:r[1],tp:topicOf(r[1]==='news'?null:r[1],r[1]==='news'?'news':r[1]==='dispatch'?'d911':r[1]==='quake'?'quakes':r[1]==='outage'?'ioda':'fire')})});
 FEED.forEach(e=>e.m.forEach(x=>{if(x.i.lat==null)return;const k=key(e.type||'news',x.i.lat,x.i.lon,x.t);if(seen.has(k))return;seen.add(k);pts.push({t:x.t,lat:x.i.lat,lon:x.i.lon,ty:e.type,tp:e.topic})}));
 TM.pts=pts.filter(p=>!topOn.size||topOn.has(p.tp)).sort((a,b)=>a.t-b.t);tmDraw()}
const tmWin=()=>+$('#tmw').value*36e5;
function tmDraw(){const now=Date.now(),w=tmWin(),t0=now-w,cur=t0+w*TM.cur;TM.g.clearLayers();let n=0;
 for(const p of TM.pts){if(p.t<t0)continue;if(p.t>cur)break;const age=(cur-p.t)/w,fresh=cur-p.t<w/24;const col=TOPICS[p.tp]?.[2]||'#0f4';
  L.circleMarker([p.lat,p.lon],{radius:fresh?6:3,color:col,weight:fresh?2:0,fillColor:col,fillOpacity:fresh?.9:Math.max(.15,.5-age*.4),interactive:false}).addTo(TM.g);n++}
 const d=new Date(cur);$('#tmt').textContent=TM.cur>=1?`LIVE · ${n}`:`T-${((now-cur)/36e5).toFixed(1)}H · ${pad(d.getHours())}:${pad(d.getMinutes())} · ${n}`;$('#tmr').value=Math.round(TM.cur*1000)}
function tmTick(){TM.cur+= (+$('#tms').value)*0.25/120;if(TM.cur>=1){TM.cur=1;tmPlay(false)}tmDraw()}
function tmPlay(p){TM.play=p;clearInterval(TM.timer);TM.timer=p?setInterval(tmTick,250):null;const b=$('#tmplay');b.textContent=p?'❚❚':'▶';b.setAttribute('aria-label',p?'Pause replay':'Play replay')}
function tmSet(on){TM.on=on;$('#tmon').setAttribute('aria-pressed',on);$('#tmon').textContent=on?'✕ EXIT REPLAY':'⏱ REPLAY';$('#tmc').hidden=!on;document.body.classList.toggle('tmon',on);
 if(on){map.removeLayer(mg);TM.g.addTo(map);TM.cur=0;tmBuild().then(()=>tmPlay(true))}else{tmPlay(false);map.removeLayer(TM.g);mg.addTo(map);$('#tmt').textContent='LIVE';drawMap()}}
$('#tmon').onclick=()=>tmSet(!TM.on);['#clsbar','#topics'].forEach(q=>$(q).addEventListener('click',e=>{if(TM.on&&e.target.closest('button')&&e.target.id!=='clsinfo'){tmPlay(false);setTimeout(tmBuild,0);toast('Replay stopped · filters changed')}}));$('#tmplay').onclick=()=>{if(TM.cur>=1)TM.cur=0;tmPlay(!TM.play)};
$('#tmr').oninput=e=>{tmPlay(false);TM.cur=e.target.value/1000;tmDraw()};$('#tmw').onchange=()=>tmDraw();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&TM.play)tmPlay(false)});
/* ---------- shared helpers: stable incident ids ---------- */
const hh=s=>{let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(36)};
const ikey=x=>x.Ly.id+'|'+(x.i.id||x.i.url||x.i.title||'')+'|'+Math.round(x.t/6e4);
const eid=e=>e._id||(e._id=hh(e.m.slice().sort((a,b)=>a.t-b.t).slice(0,1).map(ikey).join()));
const findE=id=>FEED.find(e=>eid(e)===id);
const panes=['wp','about','cmd'];const openPane=id=>{panes.forEach(p=>$('#'+p).hidden=p!==id);if(id==='wp')wRender();if(id==='cmd'){$('#cmdi').value='';cmdHints('');setTimeout(()=>$('#cmdi').focus(),30)}};
document.querySelectorAll('.pane [data-close]').forEach(b=>b.onclick=()=>b.closest('.pane').hidden=true);
addEventListener('keydown',e=>{if(e.key==='Escape')panes.forEach(p=>$('#'+p).hidden=true)});
$('#ab').onclick=()=>openPane('about');$('#cmdb').onclick=()=>openPane('cmd');$('#wb').onclick=()=>openPane('wp');
/* ---------- watch/near vocabulary: places + topics only ---------- */
const CA={'BC':['British Columbia',{Victoria:[48.43,-123.37],Vancouver:[49.28,-123.12],Surrey:[49.19,-122.85],Burnaby:[49.25,-122.98],Kelowna:[49.89,-119.5],Kamloops:[50.67,-120.33],'Prince George':[53.92,-122.75],Nanaimo:[49.17,-123.94],Abbotsford:[49.05,-122.31]}],
 'AB':['Alberta',{Calgary:[51.05,-114.07],Edmonton:[53.55,-113.49],'Red Deer':[52.27,-113.81],'Fort McMurray':[56.73,-111.38],Lethbridge:[49.69,-112.84],Jasper:[52.87,-118.08],Banff:[51.18,-115.57]}],
 'SK':['Saskatchewan',{Saskatoon:[52.13,-106.67],Regina:[50.45,-104.61]}],'MB':['Manitoba',{Winnipeg:[49.9,-97.14],Brandon:[49.85,-99.95]}],
 'ON':['Ontario',{Toronto:[43.65,-79.38],Ottawa:[45.42,-75.7],Hamilton:[43.26,-79.87],London:[42.98,-81.25],Windsor:[42.31,-83.04],Kingston:[44.23,-76.49],Sudbury:[46.49,-80.99],'Thunder Bay':[48.38,-89.25],Mississauga:[43.59,-79.64],Brampton:[43.73,-79.76],Barrie:[44.39,-79.69]}],
 'QC':['Quebec',{Montreal:[45.5,-73.57],'Quebec City':[46.81,-71.21],Gatineau:[45.48,-75.7],Sherbrooke:[45.4,-71.89],Laval:[45.61,-73.71]}],
 'NS':['Nova Scotia',{Halifax:[44.65,-63.57],Sydney:[46.14,-60.19]}],'NB':['New Brunswick',{Moncton:[46.09,-64.78],Fredericton:[45.96,-66.64],'Saint John':[45.27,-66.06]}],
 'PE':['Prince Edward Island',{Charlottetown:[46.24,-63.13]}],'NL':["Newfoundland and Labrador",{"St. John's":[47.56,-52.71]}],'YT':['Yukon',{Whitehorse:[60.72,-135.06]}],'NT':['Northwest Territories',{Yellowknife:[62.45,-114.37]}],'NU':['Nunavut',{Iqaluit:[63.75,-68.52]}]};
const USAB={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',PR:'Puerto Rico',GU:'Guam',VI:'U.S. Virgin Islands',AS:'American Samoa',MP:'Northern Mariana Islands'};
const EVW=new Set(('fire fires wildfire wildfires brush forest grass structure house apartment building smoke flood floods flooding flash storm storms tornado tornadoes hurricane typhoon cyclone tropical hail blizzard snow ice icy winter wind winds heat heatwave cold freeze frost fog quake quakes earthquake earthquakes tremor aftershock tsunami volcano eruption lava ash shooting shootings shots gunfire stabbing explosion explosions blast crash crashes collision derailment wreck accident accidents traffic hazmat chemical gas leak spill toxic evacuation evacuations evacuate shelter lockdown protest protests rally march strike riot unrest outage outages blackout power internet cell network road roads closure closures closed bridge highway interstate airport flight flights delay delays ground stop rescue missing drowning landslide mudslide avalanche drought air quality advisory warning warnings watch emergency alert alerts police standoff manhunt pursuit sinkhole collapse water main break boil notice dispatch medical ambulance train rail transit subway bus ferry port shipping ship cyber outbreak disease weather radar severe thunderstorm lightning rain rainfall surge tide coastal erosion heat dust sand smog pollution radiation nuclear plant dam levee').split(' '));
const EVSTOP=new Set('of in on at the a an and or near to for with from'.split(' '));
let GAZ=null;const gazLoad=()=>GAZ||(GAZ=fetch('data/gaz.txt').then(r=>r.text()).then(t=>{const m=new Map();t.split('\n').forEach(l=>{const p=l.split('\t');if(p.length<3)return;m.set(p[0].toLowerCase(),[p[0],p.slice(2).map(x=>{const [st,ll]=x.split(':');const [la,lo]=ll.split(',').map(Number);return [st,la,lo]}),p[1]])});return m}).catch(()=>new Map()));
const title=s=>s.replace(/\b\w/g,c=>c.toUpperCase());
/* resolve a place: state, allowlisted place, gazetteer place (unique bare name or 'Name ST' / 'Name, State'), Canadian 'City BC' */
/* GeoNames populated places per state (CC BY 4.0), only for 'Name ST' lookups */
const GN={};const gnLoad=st=>GN[st]||(GN[st]=fetch(`data/gn/${st}.txt`).then(r=>r.ok?r.text():'').then(t=>{const m=new Map();t.split('\n').forEach(l=>{const [n,ll]=l.split('\t');if(!ll)return;const [a,b]=ll.split(',').map(Number);m.set(n.toLowerCase(),[n,a,b])});return m}).catch(()=>new Map()));
async function findPlace(q){q=q.trim().replace(/\s+/g,' ');if(!q)return null;const lc=q.toLowerCase();
 const st=Object.keys(BBOX).find(s=>s.toLowerCase()===lc)||USAB[q.toUpperCase()];if(st&&BBOX[st]){const b=BBOX[st];return {st,name:st,lat:(b[0]+b[2])/2,lon:(b[1]+b[3])/2}}
 const m=q.match(/^(.+?),?\s+([A-Za-z]{2})$/)||q.match(/^(.+?),\s*([A-Za-z .]{4,})$/)||q.match(/^(.+?)\s+([A-Za-z]{4,}|New \w+|North \w+|South \w+|West Virginia|Rhode Island|British Columbia|Nova Scotia|Prince Edward Island)$/);
 if(m){const ab=m[2].toUpperCase(),nm=m[1].toLowerCase();const caK=CA[ab]?ab:Object.keys(CA).find(k=>CA[k][0].toLowerCase()===m[2].toLowerCase());
  if(caK){const c=Object.entries(CA[caK][1]).find(([k])=>k.toLowerCase()===nm);if(c)return {name:`${c[0]}, ${caK}`,lat:c[1][0],lon:c[1][1]}}
  const usK=USAB[ab]?ab:Object.keys(USAB).find(k=>USAB[k].toLowerCase()===m[2].toLowerCase());
  if(usK){const g=(await gazLoad()).get(nm);const e=g&&g[1].find(x=>x[0]===usK);if(e)return {name:`${g[0]}, ${usK}`,lat:e[1],lon:e[2]}
   const r=(await gnLoad(usK)).get(nm);if(r)return {name:`${r[0]}, ${usK}`,lat:r[1],lon:r[2]}}}
 const p=PLACES.find(p=>p[0].toLowerCase()===lc);if(p)return {name:p[0],lat:p[1],lon:p[2]};
 for(const k of Object.keys(CA)){const c=Object.entries(CA[k][1]).find(([n])=>n.toLowerCase()===lc);if(c&&!(await gazLoad()).has(lc))return {name:`${c[0]}, ${k}`,lat:c[1][0],lon:c[1][1]}}
 const g=(await gazLoad()).get(lc);if(g){if(g[2]==='u'||g[1].length===1&&g[2]){const e=g[1][0];return {name:`${g[0]}, ${e[0]}`,lat:e[1],lon:e[2]}}return {ambig:g[0],opts:g[1].map(x=>`${g[0]} ${x[0]}`)}}
 return null}
/* watch terms: only topics/event words or places. People (incl. public figures, handles, initials, 'Last, First') are refused. */
const PEOPLEY=/@|#|^\s*[\w'’-]+\s*,\s*[\w'’-]+\s*$|\b[A-Z]\.\s*[A-Z]|\b(?:mr|mrs|ms|mx|dr|sen|rep|gov|pres|president|senator|mayor|minister)\.?\s/i;
const XCO=new Set(['victoria','victoria australia','victoria, australia','jordan','chad','georgia country','new south wales','queensland']);
async function watchTerm(v){const raw=v.trim();if(raw.length<3)return {err:'Use 3+ letters'};
 const hint='Watch a place (state, city, country) or a topic like fire, flood, power outage, road closure.';
 await PFALL;{const m=raw.match(ROLEP),nm=m?raw.slice(m[0].length):raw;if(isPF(nm)){const k=nrm(nm);
  if(CUR.has(k)||!commonName(k))return {kind:'pf',v:nm.replace(/\s+/g,' ')}; /* public figure: news/post text only */
  if(m)return {kind:'pf',v:nm.replace(/\s+/g,' '),role:1};
  return {err:`“${nm}” is a common name. Add the role, e.g. “Speaker ${title(nm)}” or “Rep. ${title(nm)}”, so private people with the same name aren’t matched.`}}}
 if(PEOPLEY.test(raw)||/\p{Ll}\p{Lu}/u.test(raw))return {err:'Watch events, places or well-known public figures, not private people. '+hint};
 const lc=raw.toLowerCase(),words=lc.split(/\s+/).filter(w=>!EVSTOP.has(w));
 if(words.length&&words.every(w=>EVW.has(w)))return {kind:'kw',v:lc};
 const isCountry=ALLOWS.has(title(lc))||[...ALLOWS].some(a=>a.toLowerCase()===lc)||XCO.has(lc);
 if(isCountry&&!BBOX[title(lc)]){const g=(await gazLoad()).get(lc);const towns=g?g[1].map(x=>`${g[0]} ${x[0]}`).slice(0,4):[];return {kind:'kw',v:lc,note:towns.length?`Watching the country/region. For a US town use: ${towns.join(', ')}`:''}}
 const pl=await findPlace(raw);if(pl&&pl.st)return {kind:'state',v:pl.st};if(pl&&!pl.ambig)return {kind:'place',v:pl.name,lat:crs(pl.lat),lon:crs(pl.lon),r:50};
 if(pl&&pl.ambig)return {err:`“${pl.ambig}” is in several states: try ${pl.opts.slice(0,3).join(', ')}`};
 if(ALLOWS.has(title(lc))||[...ALLOWS].some(a=>a.toLowerCase()===lc))return {kind:'kw',v:lc};
 return {err:'Not a known place or topic. '+hint}}
/* ---------- 5) WATCHLISTS (localStorage, in-app alerts only) ---------- */
let WL=JSON.parse(localStorage.getItem('eyemont.watch')||'[]'),WM=JSON.parse(sessionStorage.getItem('eyemont.wmatch')||'[]'),WSEEN=new Set(JSON.parse(sessionStorage.getItem('eyemont.wseen')||'[]')),wUnread=0,wPick=false;
const wSave=()=>{localStorage.setItem('eyemont.watch',JSON.stringify(WL));sessionStorage.setItem('eyemont.wmatch',JSON.stringify(WM.slice(0,30)));sessionStorage.setItem('eyemont.wseen',JSON.stringify([...WSEEN].slice(-2000)))};
const crs=v=>Math.round(v*10)/10;
const wLabel=w=>w.kind==='pf'?`PUBLIC FIGURE “${w.v}” · news text only`:w.kind==='kw'?`KEYWORD “${w.v}”`:w.kind==='state'?`STATE ${w.v}`:`${w.v} · ${w.r} km`;
const wHit=(w,e)=>{if(w.kind==='pf'){const q=w.v.toLowerCase(),re=new RegExp('(?<![\\p{L}])'+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}])','giu');
  return e.m.some(x=>{const s=(x.i.title||'')+' '+(x.i.text||'');for(const m of s.matchAll(re)){if(pfAt(s,m.index,m.index+m[0].length))return true}return false})}
 if(w.kind==='kw'){const q=w.v.toLowerCase();return e.m.some(x=>(x.i.title||x.i.text||'').toLowerCase().includes(q))||(e.type||'').includes(q)}
 if(w.kind==='state')return e.st===w.v;return km(w.lat,w.lon,e.lat,e.lon)<=w.r};
function wBadge(){const b=$('#wbadge');b.hidden=!wUnread;b.textContent=wUnread>99?'99+':wUnread;$('#wb').setAttribute('aria-label',`Watchlists${wUnread?', '+wUnread+' new matches':''}`)}
function wCheck(){if(!WL.length)return;const fresh=[];FEED.forEach(e=>{const id=eid(e);WL.forEach(w=>{const k=w.id+':'+id;if(WSEEN.has(k)||!wHit(w,e))return;WSEEN.add(k);fresh.push([w,e])})});
 if(!fresh.length)return;fresh.forEach(([w,e])=>{if(w.kind==='pf'){const q=w.v.toLowerCase(),it=e.m.find(x=>((x.i.title||'')+' '+(x.i.text||'')).toLowerCase().includes(q))||e.m[0];WM.unshift({pf:1,u:it.i.link||it.i.url||'',h:maskNames(it.i.title||it.i.text||''),w:wLabel(w),t:Date.now()})}else WM.unshift({id:eid(e),h:maskNames(e.head),w:wLabel(w),t:Date.now()})});WM=WM.slice(0,30);wUnread+=fresh.length;wBadge();wSave();
 const [w,e]=fresh[0];toast(`⚑ ${wLabel(w)}: ${(WM[fresh.length-1]||{}).h?.slice(0,70)||''}${fresh.length>1?` (+${fresh.length-1} more)`:''}`);
 if(navigator.vibrate&&localStorage.getItem('eyemont.vib')!=='0')try{navigator.vibrate([60,40,60])}catch(_){}
 if(window.Notification&&Notification.permission==='granted'&&localStorage.getItem('eyemont.notify')==='1')try{new Notification('Eyemont · '+wLabel(w),{body:maskNames(e.head).slice(0,120)+(fresh.length>1?` (+${fresh.length-1} more)`:''),icon:'icons/icon-192.png',tag:'eyemont-watch'})}catch(_){}}
function wRender(){wUnread=0;wBadge();$('#wl').innerHTML=WL.length?WL.map((w,i)=>`<li><span>${esc(wLabel(w))}</span><button data-del="${i}" aria-label="Remove watch ${esc(wLabel(w))}">✕</button></li>`).join(''):'<li class="empty">No watches yet.</li>';
 $('#wm').innerHTML=WM.length?WM.map(m=>m.pf?`<li><a class="wmh" href="${esc(/^https?:/.test(m.u)?m.u:'#')}" target="_blank" rel="noopener"><small>${esc(m.w)} · ${tzt(m.t)}</small>${esc(m.h)} ↗</a></li>`:`<li><button class="wmh" data-id="${m.id}"><small>${esc(m.w)} · ${tzt(m.t)}</small>${esc(m.h)}</button></li>`).join(''):'<li class="empty">No matches yet.</li>';
 const n=$('#wnot'),ok=!!window.Notification;const on=ok&&Notification.permission==='granted'&&localStorage.getItem('eyemont.notify')==='1';n.setAttribute('aria-pressed',on);n.textContent=on?'🔔 NOTIFICATIONS ON':'🔔 ENABLE NOTIFICATIONS';n.disabled=!ok;
 $('#wns').textContent=!ok?'Browser notifications not supported here; toasts + badge still work.':Notification.permission==='denied'?'Blocked in browser settings.':'Only while Eyemont is open.'}
$('#wv').addEventListener('input',async e=>{if($('#wk').value!=='place')return;const q=e.target.value.trim().toLowerCase();if(q.length<3)return;const g=await gazLoad(),o=[];
 for(const [k,[n,ss]] of g){if(k.startsWith(q)){ss.slice(0,3).forEach(x=>o.push(n+' '+x[0]));if(o.length>=20)break}}
 $('#wdl').innerHTML=[...new Set([...PLACES.map(p=>p[0]).filter(x=>x.toLowerCase().startsWith(q)),...o])].slice(0,20).map(x=>`<option value="${esc(x)}">`).join('')});
const wHint=()=>{const k=$('#wk').value,v=$('#wv');v.placeholder=k==='kw'?'keyword, e.g. wildfire':k==='state'?'state, e.g. Texas':k==='place'?'place, e.g. Houston':'tap PICK, then the map';$('#wr').hidden=k==='kw'||k==='state';
 $('#wdl').innerHTML=k==='state'?Object.keys(BBOX).sort().map(s=>`<option value="${esc(s)}">`).join(''):k==='place'?PLACES.slice(0,400).map(p=>`<option value="${esc(p[0])}">`).join(''):'';$('#wadd').textContent=k==='pt'?'◎ PICK':'+ ADD'};
$('#wk').onchange=wHint;
function wAdd(w){if(w.note){const n=w.note;delete w.note;setTimeout(()=>toast(n),2600)}w.id=hh(JSON.stringify(w)+Date.now());WL.push(w);wSave();FEED.forEach(e=>{if(wHit(w,e))WSEEN.add(w.id+':'+eid(e))});const n=FEED.filter(e=>wHit(w,e)).length;toast(`⚑ watching ${wLabel(w)} · ${n} current match${n===1?'':'es'} (new ones will alert)`);wRender()}
$('#wf').onsubmit=async ev=>{ev.preventDefault();const k=$('#wk').value,v=$('#wv').value.trim(),r=+$('#wr').value;
 if(k==='kw'){const w=await watchTerm(v);return w.err?toast(w.err):wAdd(w)}
 if(k==='state'){const st=Object.keys(BBOX).find(s=>s.toLowerCase()===v.toLowerCase())||USAB[v.toUpperCase()];return st?wAdd({kind:'state',v:st}):toast('Pick a US state from the list')}
 if(k==='place'){const p=await findPlace(v);return p&&!p.ambig&&!p.st?wAdd({kind:'place',v:p.name,lat:crs(p.lat),lon:crs(p.lon),r}):p&&p.st?wAdd({kind:'state',v:p.st}):toast(p&&p.ambig?`“${p.ambig}” is in several states: try ${p.opts.slice(0,3).join(', ')}`:'Place not found. Try “Kokomo”, “Victoria BC” or “Springfield IL”.')}
 wPick=true;$('#wp').hidden=true;setTab('map');document.body.classList.add('picking');toast('Tap the map to set the watch centre (rounded to ~10 km)')};
map.on('click',e=>{if(!wPick)return;wPick=false;document.body.classList.remove('picking');const la=crs(e.latlng.lat),lo=crs(e.latlng.lng);wAdd({kind:'pt',v:`◎ ${la.toFixed(1)}, ${lo.toFixed(1)}`,lat:la,lon:lo,r:+$('#wr').value});openPane('wp')});
$('#wl').onclick=e=>{const b=e.target.closest('[data-del]');if(!b)return;WL.splice(+b.dataset.del,1);wSave();wRender()};
$('#wm').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;const x=findE(b.dataset.id);$('#wp').hidden=true;x?openDetail(FEED.indexOf(x)):toast('That incident has expired from the live feed')};
$('#wnot').onclick=async()=>{if(!window.Notification)return;if(localStorage.getItem('eyemont.notify')==='1'&&Notification.permission==='granted'){localStorage.setItem('eyemont.notify','0');return wRender()}
 const p=await Notification.requestPermission();localStorage.setItem('eyemont.notify',p==='granted'?'1':'0');wRender()};
wBadge();
/* ---------- 6) DOSSIER + SHARE ---------- */
const shareURL=e=>`${location.origin}${location.pathname}#i=${eid(e)}&ty=${encodeURIComponent(e.type||'event')}&ll=${e.lat.toFixed(1)},${e.lon.toFixed(1)}&t=${Math.round(e.first/6e4)}&p=${encodeURIComponent(maskNames(where(e)).slice(0,60))}`;
function brief(e){const n=covCounts(e),fmt=t=>new Date(t).toISOString().slice(0,16).replace('T',' ')+'Z';const lk=[];e.m.forEach(x=>{const u=x.i.url||links(html(x.i))[0]?.[0];if(u&&!lk.some(l=>l[0]===u))lk.push([u,x.src,x.c])});
 return [`EYEMONT DOSSIER · ${(e.type||'event').toUpperCase()}`,`HEADLINE: ${maskNames(e.head)}`,`PLACE: ${maskNames(where(e))} (${e.lat.toFixed(1)}, ${e.lon.toFixed(1)}, coarse)`,`TIME: ${fmt(e.first)}${e.last!==e.first?' → '+fmt(e.last):''} (${tzt(e.first)}${e.last!==e.first?' → '+tzt(e.last,1):''})`,
  `COVERAGE: official ${n.official} · major ${n.major} · independent ${n.independent} — ${covLabel(n)}`,`CONFIDENCE: ${Math.round(e.conf*100)}% (automatic proximity match, not verification)`,`SOURCES (${lk.length}):`,...lk.slice(0,30).map(l=>`- [${l[2]}] ${l[1]}: ${l[0]}`),`LINK: ${shareURL(e)}`,`Names masked. Coverage analysis, not a claim about truth.`].join('\n')}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(_){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}a.remove();return ok}}
async function doShare(e,what){const url=shareURL(e),txt=what==='brief'?brief(e):null;
 if(navigator.share){try{await navigator.share(what==='brief'?{title:'Eyemont dossier',text:txt}:{title:'Eyemont · '+maskNames(e.head).slice(0,60),url});return}catch(err){if(err.name==='AbortError')return}}
 toast(await copyText(txt||url)?(what==='brief'?'⎘ Brief copied':'⇪ Link copied'):'Copy failed — select the text manually')}
const _od=openDetail;openDetail=function(k){_od(k);const e=FEED[k];if(!e)return;history.replaceState(null,'',shareURL(e));
 const d=document.createElement('div');d.className='shr';d.innerHTML=`<button class="btn" id="shl">⇪ SHARE LINK</button><button class="btn" id="shb">⎘ COPY BRIEF</button><details id="dos"><summary>DOSSIER (plain text)</summary><pre class="ro">${esc(brief(e))}</pre></details>`;
 sb.querySelector('h2').after(d);$('#shl').onclick=()=>doShare(e,'link');$('#shb').onclick=()=>doShare(e,'brief')};
$('#sclose').onclick=()=>closeSheet();const _cs=closeSheet;closeSheet=function(){_cs();if(location.hash.startsWith('#i='))history.replaceState(null,'',location.pathname+location.search)};
let hashDone=false;const T0=Date.now();function openHash(force){const h=new URLSearchParams(location.hash.slice(1));const id=h.get('i');if(!id){hashDone=true;return}const e=findE(id);if(e){hashDone=true;if(sheet.hidden||$('#exhd'))openDetail(FEED.indexOf(e));return}if(!force&&Date.now()-T0<8000)return;hashDone=true;
 const ll=(h.get('ll')||'').split(',').map(Number),t=+h.get('t')*6e4,ty=/^[a-z]{2,16}$/.test(h.get('ty')||'')?h.get('ty'):'event',pl=maskNames((h.get('p')||'').slice(0,60));const near=ll.length===2&&!isNaN(ll[0])?FEED.filter(x=>km(x.lat,x.lon,ll[0],ll[1])<50&&Math.abs(x.first-t)<6*36e5).slice(0,5):[];
 sb.innerHTML=`<p class="kick" id="exhd">⌛ EXPIRED LINK</p><h2 id="stitle">This incident is no longer in the live feed</h2><p class="meta">${esc(ty.toUpperCase())} · ◎ ${esc(pl||ll.join(', '))}${t?` · ⏱ ${tzt(t)}`:''}</p><p class="note">Eyemont keeps a rolling window (6–24 h). The original sources may still be online.</p>
 ${near.length?`<h3>STILL LIVE NEARBY</h3><ul class="sl">${near.map(x=>`<li><button class="btn wmh" data-k="${FEED.indexOf(x)}">${esc(maskNames(x.head).slice(0,80))}</button></li>`).join('')}</ul>`:''}
 <p>${ll.length===2&&!isNaN(ll[0])?`<button class="btn" id="exmap">◎ SHOW AREA ON MAP</button> `:''}${t&&Date.now()-t<864e5?'<button class="btn" id="exrep">⏱ REPLAY THAT TIME</button>':''}</p>`;
 sheet.hidden=false;document.body.classList.add('sheet');sb.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>openDetail(+b.dataset.k));
 $('#exmap')&&($('#exmap').onclick=()=>{closeSheet();setTab('map');setTimeout(()=>map.flyTo(ll,8),80)});
 $('#exrep')&&($('#exrep').onclick=()=>{closeSheet();setTab('map');$('#tmw').value='24';tmSet(true);setTimeout(()=>{tmPlay(false);TM.cur=Math.max(0,1-(Date.now()-t)/864e5);tmDraw();map.flyTo(ll,6)},400)})}
addEventListener('hashchange',()=>openHash(true));setTimeout(()=>{if(!hashDone)openHash(true)},9000);
/* ---------- 7) OFFLINE banner + service worker ---------- */
function offUI(){setTimeout(()=>offLay(),0);const b=$('#offb'),off=!navigator.onLine;if(!off&&FEED.length)localStorage.setItem('eyemont.snap',Date.now());const s=+localStorage.getItem('eyemont.snap')||0;
 b.hidden=!off;if(off)b.textContent=`OFFLINE · snapshot from ${s?tzt(s):'unknown time'}${s&&Date.now()-s>36e5?' · '+ago(s/1000):''}`;document.body.classList.toggle('offline',off)}
function offLay(){const b=$('#offb'),hd=document.querySelector('header'),M=[document.querySelector('main'),$('#map')];if(b.hidden){M.forEach(x=>x&&(x.style.top=''));return}
 const z=hd.getBoundingClientRect().bottom;M.forEach(x=>x&&(x.style.top=z+'px'))}
addEventListener('resize',()=>{if(!navigator.onLine)offLay()});
addEventListener('online',()=>{offUI();render()});addEventListener('offline',()=>{offUI();render()});
if('serviceWorker' in navigator&&location.protocol!=='file:'){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{setInterval(()=>r.update().catch(()=>{}),30*6e4)}).catch(()=>{});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had)return;const u=$('#upd');u.hidden=false})}
$('#upd').onclick=()=>location.reload();
/* ---------- 8) COMMAND BAR ---------- */
const TOPW={fire:'fire',fires:'fire',quake:'quakes',quakes:'quakes',weather:'weather',crime:'crime','911':'crime',transport:'transport',air:'transport',outages:'outages',outage:'outages',news:'news',crowd:'crowd'};
const CMDS=[['help','list commands'],['near ','<place|state>'],['fire','topic'],['quake','topic'],['weather','topic'],['crime','topic'],['transport','topic'],['outages','topic'],['news','topic'],['all','clear filters'],['uncovered','coverage gap view'],['official','official-only view'],['replay ','6h|12h|24h'],['watch ','<keyword>'],['watches','open watchlists'],['intercept',' [search]'],['map','map tab'],['now','now tab'],['about','mirrors & limits']];
function cmdHints(v){const q=v.toLowerCase();let h=[];const [c,...r]=q.split(' '),arg=r.join(' ');
 if(c==='near'&&q.includes(' ')){const a=[...new Set([...Object.keys(BBOX),...PLACES.map(p=>p[0])])].filter(s=>s.toLowerCase().startsWith(arg)).slice(0,6);h=a.map(s=>['near '+s,'']);}
 else if(c==='replay'&&q.includes(' '))h=['6h','12h','24h'].map(x=>['replay '+x,'']);
 else h=CMDS.filter(([k])=>k.startsWith(q)||!q).slice(0,q?6:20);
 $('#cmdh').innerHTML=h.map(([k,d])=>`<button type="button" data-c="${esc(k)}">${esc(k)}${d?` <small>${esc(d)}</small>`:''}</button>`).join('')}
const say=t=>$('#cmdo').textContent=t;
async function runCmd(raw){const v=raw.trim().replace(/^>\s*/,''),[c0,...r]=v.split(/\s+/),c=(c0||'').toLowerCase(),arg=r.join(' ');const done=t=>{toast('> '+v+' · '+t);say('');$('#cmd').hidden=true};
 if(!c||c==='help'){say(CMDS.map(([k,d])=>(k+' '+d).padEnd(28)).join('\n'));return}
 if(TOPW[c]){topOn.clear();topOn.add(TOPW[c]);$('#topics [data-p=""]').click();$(`#topics [data-p="${TOPW[c]}"]`).click();if(tab==='near'||tab==='int'){}else setTab(tab==='map'?'map':'now');return done('topic '+TOPW[c])}
 if(c==='all'){$('#topics [data-p=""]').click();seg='all';sessionStorage.setItem('eyemont.seg',seg);render();return done('filters cleared')}
 if(c==='uncovered'||c==='gap'||c==='official'){setTab('now');$(`#seg [data-v="${c==='official'?'off':'gap'}"]`).click();return done(c==='official'?'OFFICIAL ONLY':'COVERAGE GAP')}
 if(c==='near'){if(!arg)return say('usage: near <place|state>');const p=await findPlace(arg);if(p&&p.st){near=p.st;localStorage.setItem('eyemont.near',p.st);setTab('near');return done('NEAR '+p.st)}
  if(!p)return say(`no place “${arg}” found · try a state, “Kokomo”, “Victoria BC”`);if(p.ambig)return say(`“${p.ambig}” is in several states: ${p.opts.slice(0,6).join(', ')}`);setTab('map');setTimeout(()=>map.flyTo([p.lat,p.lon],9),80);return done('map → '+p.name)}
 if(c==='replay'){const w=parseInt(arg)||24;if(![6,12,24].includes(w))return say('usage: replay 6h|12h|24h');setTab('map');$('#tmw').value=String(w);if(TM.on){TM.cur=0;tmPlay(true)}else tmSet(true);return done(`replay ${w}h`)}
 if(c==='watch'){const w=await watchTerm(arg);if(w.err)return say(w.err);wAdd(w);say('');$('#cmd').hidden=true;return}
 if(c==='watches'){openPane('wp');return}if(c==='about'){openPane('about');return}
 if(c==='intercept'){setTab('int');$('#iq').value=arg;$('#iq').dispatchEvent(new Event('input'));return done('intercept'+(arg?' “'+arg+'”':''))}
 if(['map','now','near'].includes(c)){setTab(c);return done(c)}
 say(`unknown command “${c}” · type help`)}
$('#cmdi').oninput=e=>cmdHints(e.target.value);
$('#cmdi').onkeydown=e=>{if(e.key==='Tab'||e.key==='ArrowRight'&&e.target.selectionStart===e.target.value.length){const f=$('#cmdh button');if(f){e.preventDefault();e.target.value=f.dataset.c;cmdHints(f.dataset.c)}}};
$('#cmdh').onclick=e=>{const b=e.target.closest('button');if(!b)return;const k=b.dataset.c;if(k.endsWith(' ')){$('#cmdi').value=k;cmdHints(k);$('#cmdi').focus()}else{$('#cmdi').value=k;runCmd(k)}};
$('#cmdf').onsubmit=e=>{e.preventDefault();runCmd($('#cmdi').value)};
addEventListener('keydown',e=>{if(e.key==='>'&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();openPane('cmd')}});
setTab(tab);
window.__feed=()=>FEED.slice(0,10).map(e=>({k:e.kind,t:e.type,h:e.head,c:e.conf,s:e.src,p:where(e)}));
window.__t={pfReady:()=>PFALL.then(()=>PF.size),hit:(w,title)=>wHit(w,{m:[{i:{title}}]}),mask:t=>maskNames(t),watch:v=>watchTerm(v),place:q=>findPlace(q),tz:()=>TZL,stateOf:(a,b)=>stateOf(a,b),ready:()=>STATES_OK};
})();
