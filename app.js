// EYEMONT M1 — layer plugin registry. See ARCHITECTURE.md. Static only: every feed is a direct public fetch or a build-time snapshot.
(()=>{
/* digital rain: ~20 fps, paused when hidden, faint */
const c=document.getElementById('rain'),x=c.getContext('2d');let drops=[],rainT=null;
function rs(){c.width=innerWidth;c.height=innerHeight;drops=Array(Math.floor(c.width/16)).fill(1)}rs();addEventListener('resize',rs);
function frame(){x.fillStyle='rgba(0,0,0,.1)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00ff41';x.font='14px monospace';
 drops.forEach((y,i)=>{x.fillText(String.fromCharCode(0x30A0+Math.random()*96),i*16,y*16);if(y*16>c.height&&Math.random()>.975)drops[i]=0;drops[i]++})}
const rainOn=()=>{if(!rainT&&!document.hidden)rainT=setInterval(frame,50)},rainOff=()=>{clearInterval(rainT);rainT=null};
document.addEventListener('visibilitychange',()=>document.hidden?rainOff():rainOn());rainOn();

const map=L.map('map',{zoomControl:false,worldCopyJump:true,preferCanvas:true}).setView([39,-98],3);window.EYEMONT_MAP=map;
L.control.zoom({position:'topleft'}).addTo(map);
map.attributionControl.setPosition('bottomright');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
 attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);

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
const LAYERS=[
{id:'quakes',cls:'official',label:'⌁ QUAKE',color:'#ff4d4d',refresh:120e3,attribution:'Quakes: <a href="https://earthquake.usgs.gov">USGS</a>',
 async load(){const d=await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  return d.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],r:3+Math.max(0,f.properties.mag||0)*2,
   title:`M${(f.properties.mag??0).toFixed(1)} ${f.properties.place||''}`,sub:new Date(f.properties.time).toLocaleString(),
   popup:`<b>${esc(f.properties.title)}</b><br>${new Date(f.properties.time).toLocaleString()}<br><a target=_blank rel=noopener href="${esc(f.properties.url)}">USGS ↗</a>`}))}},
{id:'alerts',cls:'official',label:'⚠ ALERT',color:'#ffd400',refresh:180e3,attribution:'Alerts: <a href="https://www.weather.gov">NWS</a>',
 async load(){const d=await getJSON('https://api.weather.gov/alerts/active?status=actual',{headers:{Accept:'application/geo+json'}});
  return d.features.filter(f=>f.geometry).map(f=>{const g=L.geoJSON(f.geometry).getBounds().getCenter();
   return {lat:g.lat,lon:g.lng,geo:f.geometry,title:f.properties.event,sub:f.properties.areaDesc,
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
   return {lat:g.coordinates[1],lon:g.coordinates[0],r:5,title:e.title,sub:`${cat} · ${new Date(g.date).toLocaleDateString()}`,popup:`<b>${esc(e.title)}</b><br>${esc(cat)} · ${new Date(g.date).toLocaleString()}<br>${(e.sources||[]).map(s=>`<a target=_blank rel=noopener href="${esc(s.url)}">${esc(s.id)} ↗</a>`).join(' ')}`}}).filter(Boolean)}},
{id:'news',cls:'major',label:'🗞 NEWS',color:'#e0e0e0',refresh:900e3,attribution:'News: publisher RSS feeds (headlines link to the original)',
 async load(){await srcReady;const d=await getJSON('data/news.json?t='+Math.floor(Date.now()/300e3));const ok=Object.values(d.status||{}).filter(v=>v.startsWith('ok')).length;
  this.note=`${d.items.length} headlines, ${ok}/${Object.keys(d.status||{}).length} feeds ok · snapshot ${new Date(d.updated).toLocaleTimeString()} · ⌂ = placed at outlet's home city`;
  return d.items.map(i=>{const f=SRCBY[i.src]||{name:i.src,cls:'independent'};return {home:i.home,lat:i.lat,lon:i.lon,r:i.home?3:5,cls:f.cls,fund:f.fund,src:f.name,time:i.time?Date.parse(i.time):null,text:i.title,
   title:(i.home?'⌂ ':'📍 ')+i.title,sub:`${f.name} · ${i.place}${i.home?' (outlet home city, not event location)':''} · ${i.time?new Date(i.time).toLocaleTimeString():''}`,
   popup:`<b>${esc(i.title)}</b><br><small>${esc(f.name)} · ${i.home?'⌂ placed at the outlet\'s home city ('+esc(i.place)+'), not the event':'📍 '+esc(i.place)+' (named in headline/summary)'}</small><p>${esc(i.sum)}</p>${f.credit?`<a class="credit" target=_blank rel=noopener href="${esc(i.url)}">Read the full story at ${esc(f.name)} ↗</a><br><small>Headline and summary © ${esc(f.name)}, shown unmodified.</small>`:`<a target=_blank rel=noopener href="${esc(i.url)}">read at ${esc(f.name)} ↗</a>`}`}})}},
{id:'gdelt',cls:'major',label:'📰 GDELT',color:'#ffd600',refresh:900e3,attribution:'News events: <a href="https://www.gdeltproject.org">The GDELT Project</a>',
 async load(){const d=await getJSON('data/gdelt.json');this.note=d.updated?('snapshot '+new Date(d.updated).toLocaleTimeString()):'no snapshot';
  return d.events.map(g=>({cls:(()=>{const c={};g.urls.forEach(u=>{const k=domCls(u);c[k]=(c[k]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]})(),lat:g.lat,lon:g.lon,r:Math.min(9,4+Math.log2(g.n+1)),title:`${g.place}`,sub:`${g.n} article(s) · ${g.kinds.join(', ')}`,
   popup:`<b>📰 ${esc(g.place)}</b><br><small>${g.n} news article(s), last hour · ${esc(g.kinds.join(', '))} · place-level (GDELT machine-coded, may be wrong)</small><br>`+g.urls.map(u=>{let h=u;try{h=new URL(u).hostname}catch(e){}return `<a target=_blank rel=noopener href="${esc(u)}">${esc(h)} ↗</a>`}).join('<br>')}))}},
{id:'gdacs',cls:'official',label:'⚑ GDACS',color:'#ff1744',refresh:900e3,attribution:'Disasters: <a href="https://www.gdacs.org">GDACS</a>',
 async load(){const d=await getJSON('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;WF;DR&alertlevel=Green;Orange;Red');
  return d.features.map(f=>{const p=f.properties;return {lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],r:p.alertlevel==='Red'?9:p.alertlevel==='Orange'?7:5,
   title:`${p.alertlevel} · ${p.name}`,sub:new Date(p.fromdate).toLocaleDateString(),popup:`<b>${esc(p.name)}</b><br>${esc(p.alertlevel)} alert · ${esc(p.fromdate)}<br><a target=_blank rel=noopener href="${esc(p.url?.report||'https://www.gdacs.org')}">GDACS report ↗</a>`}})}},
{id:'fire',cls:'official',label:'🔥 FIRE',color:'#ff6d00',refresh:900e3,cluster:true,attribution:'Fires: <a href="https://firms.modaps.eosdis.nasa.gov">NASA FIRMS</a> (VIIRS NOAA-20)',
 async load(){const d=await H();this.note='NASA FIRMS satellite hotspots, 24 h, 0.1° cells · snapshot '+ago(Date.parse(d.updated)/1000);
  return (d.fires||[]).map(f=>({lat:f.lat,lon:f.lon,r:Math.min(8,3+Math.log2(f.n+1)),time:Date.parse(f.t),src:'NASA FIRMS',text:'fire hotspot',title:`🔥 ${f.n} hotspot(s)`,sub:`FRP ${f.frp} MW · ${new Date(f.t).toLocaleString()}`,
   popup:`<b>Satellite fire hotspot(s): ${f.n}</b><br>~10 km cell · FRP ${f.frp} MW · ${new Date(f.t).toLocaleString()}<br><small>Data: NASA FIRMS. Hotspots can be industrial heat or flares.</small><br><a target=_blank rel=noopener href="https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${f.lon},${f.lat},9z">NASA FIRMS ↗</a>`}))}},
{id:'faa',cls:'official',label:'✈ FAA',color:'#80d8ff',refresh:900e3,attribution:'Airspace: <a href="https://tfr.faa.gov">FAA TFR</a>, <a href="https://nasstatus.faa.gov">FAA NAS Status</a>',
 async load(){const d=await H();this.note='TFRs placed at state centroid (approximate) · airport delays at the airport';
  return [...(d.tfr||[]).map(t=>({lat:t.lat,lon:t.lon,r:4,src:'FAA TFR',text:t.desc,title:`TFR ${t.type} · ${t.state}`,sub:t.desc,popup:`<b>TFR ${esc(t.id)} · ${esc(t.type)}</b><br>${esc(t.desc)}<br><small>Shown at ${esc(t.state)} centroid, not the TFR area.</small><br><a target=_blank rel=noopener href="https://tfr.faa.gov/tfr3/?page=detail_${esc(t.id.replace('/','_'))}">FAA ↗</a>`})),
   ...(d.nas||[]).map(a=>({lat:a.lat,lon:a.lon,r:7,time:Date.now(),src:'FAA NAS',text:a.apt+' delay',title:`${a.apt} ${a.kinds.join(', ')}`,sub:a.avg?`avg ${a.avg} min delay`:'',popup:`<b>${esc(a.apt)}: ${esc(a.kinds.join(', '))}</b><br>${a.avg?'avg '+a.avg+' min, max '+a.max+' min<br>':''}<a target=_blank rel=noopener href="https://nasstatus.faa.gov">FAA NAS Status ↗</a>`}))]}},
{id:'flood',cls:'official',label:'🌊 FLOOD',color:'#2979ff',refresh:300e3,attribution:'Flood: <a href="https://www.weather.gov">NWS</a> / <a href="https://water.noaa.gov">NWPS</a>',
 async load(){const d=await getJSON('https://api.weather.gov/alerts/active?status=actual',{headers:{Accept:'application/geo+json'}});
  return d.features.filter(f=>f.geometry&&/Flood/.test(f.properties.event)).map(f=>{const g=L.geoJSON(f.geometry).getBounds().getCenter();const p=f.properties;
   return {lat:g.lat,lon:g.lng,geo:f.geometry,time:Date.parse(p.sent),src:'NWS',text:p.event,title:p.event,sub:p.areaDesc,popup:`<b>${esc(p.headline)}</b><br>${esc(p.areaDesc)}<br>Until ${esc(p.expires)}<br><a target=_blank rel=noopener href="https://water.noaa.gov">River gauges (NWPS) ↗</a>`}})}},
{id:'tsunami',cls:'official',label:'🌀 TSU/SPACE',color:'#18ffff',refresh:900e3,attribution:'<a href="https://www.tsunami.gov">NOAA Tsunami</a>, <a href="https://www.swpc.noaa.gov">NOAA SWPC</a>',
 async load(){const d=await H();this.note='Space-weather alerts are not geographic: shown at SWPC, Boulder CO (flagged)';
  return [...(d.tsunami||[]).map(t=>({lat:t.lat,lon:t.lon,r:8,time:Date.parse(t.updated),src:'NOAA '+t.center,text:'tsunami '+t.title,title:`Tsunami ${t.cat}: ${t.title}`,sub:t.center+' · '+new Date(t.updated).toLocaleString(),popup:`<b>Tsunami ${esc(t.cat)}: ${esc(t.title)}</b><br>${esc(t.center)} · ${new Date(t.updated).toLocaleString()}<br><a target=_blank rel=noopener href="https://www.tsunami.gov">tsunami.gov ↗</a>`})),
   ...(d.space||[]).map(a=>({lat:40.0,lon:-105.27,r:6,title:'☀ '+a.title,sub:'⌂ placed at SWPC Boulder (space weather is global) · '+new Date(a.t).toLocaleString(),popup:`<b>☀ ${esc(a.title)}</b><br><small>⌂ Not a location: space weather is global; pin is NOAA SWPC, Boulder.</small><br><a target=_blank rel=noopener href="https://www.swpc.noaa.gov/products/alerts-watches-and-warnings">SWPC ↗</a>`}))]}},
{id:'fema',cls:'official',label:'🏛 FEMA',color:'#ffab40',refresh:3600e3,attribution:'Declarations: <a href="https://www.fema.gov/about/openfema">OpenFEMA</a>',
 async load(){const d=await H();this.note='Declarations, last 30 days, shown at state centroid';
  return (d.fema||[]).map(f=>({lat:f.lat,lon:f.lon,r:7,title:`${f.id} ${f.title}`,sub:`${f.inc} · ${f.state} · ${f.date.slice(0,10)}`,popup:`<b>${esc(f.title)}</b><br>${esc(f.id)} · ${esc(f.inc)} · ${f.areas} area(s)<br><small>Shown at ${esc(f.state)} centroid.</small><br><a target=_blank rel=noopener href="https://www.fema.gov/disaster/${f.num}">FEMA ↗</a>`}))}},
{id:'ioda',cls:'official',label:'📡 IODA',color:'#ea80fc',refresh:900e3,attribution:'Outages: <a href="https://ioda.inetintel.cc.gatech.edu">IODA (Georgia Tech)</a>',
 async load(){const d=await H();this.note='Country-level internet outage signals (24 h, non-normal only), approximate country position';
  return (d.ioda||[]).map(i=>({lat:i.lat,lon:i.lon,r:8,time:i.t*1e3,src:'IODA',text:'internet outage',title:`Internet ${i.level}: ${i.name}`,sub:`${i.n} signal(s) · ${i.src.join(', ')}`,popup:`<b>Internet outage signal: ${esc(i.name)}</b><br>${esc(i.level)} · ${i.n} alert(s) · ${esc(i.src.join(', '))}<br><small>Country-level; pin is approximate.</small><br><a target=_blank rel=noopener href="https://ioda.inetintel.cc.gatech.edu/country/${esc(i.code)}">IODA ↗</a>`}))}},
{id:'d911',cls:'official',label:'🚨 911',color:'#ff5252',refresh:300e3,cluster:true,attribution:'911: city open-data portals (Socrata), per-dataset licenses incl. Dallas (ODC-By), Somerville (ODbL)',
 async load(){const D=(await getJSON('data/dispatch.json')).datasets,cut=Date.now()-864e5,out=[],ok=[];
  const BAD=/suicid|mental|overdose|sexual|rape|juvenile|child|death|dead|body|doa|welfare|psych|domestic/i;
  const pick=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);
  const tm=(r,f)=>{const v=f.split('+').map(k=>pick(r,k)||'').join(' ').trim();const t=Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(v)?v:v.replace(' ','T'));return isNaN(t)?null:t};
  await Promise.all(D.map(async ds=>{try{const r=await getJSON(`${ds.url}?$order=${encodeURIComponent(ds.order)}&$limit=150`);let n=0;
   for(const x of r){const t=ds.time?tm(x,ds.time):null;if(ds.time&&(!t||t<cut))continue;const ty=String(pick(x,ds.type)||'call');if(BAD.test(ty))continue;
    let la,lo;if(ds.latf&&ds.latf[0]==='@'){const g=pick(x,ds.latf.slice(1));if(g?.coordinates){lo=+g.coordinates[0];la=+g.coordinates[1]}}else if(ds.latf){la=+pick(x,ds.latf);lo=+pick(x,ds.lonf)}
    const approx=!(la&&lo&&Math.abs(la-ds.lat)<1&&Math.abs(lo-ds.lon)<1);if(approx){la=ds.lat;lo=ds.lon}
    la=Math.round(la*100)/100;lo=Math.round(lo*100)/100;n++;
    out.push({lat:la,lon:lo,r:4,time:t,src:ds.city,text:ty,title:`🚨 ${ty}`,sub:`${ds.city}${t?' · '+new Date(t).toLocaleTimeString():''}${approx?' · ⌂ city centroid':''}`,
     popup:`<b>${esc(ty)}</b><br>${esc(ds.city)}${t?' · '+new Date(t).toLocaleString():''}<br><small>${approx?'⌂ placed at city centroid':'~1 km rounded'}; no addresses shown. Data: <a target=_blank rel=noopener href="${esc(ds.portal)}">${esc(ds.portal.replace(/^https?:\/\//,''))}</a>, ${esc(ds.license)}.</small>`})}
   ok.push(ds.city+':'+n)}catch(e){console.warn('911 fail',ds.id,e)}}));
  this.note=`${ok.length}/${D.length} city datasets ok, last 24 h, ≈1 km, sensitive call types removed`;return out}},
{id:'live',cls:'major',label:'▶ LIVE TV',color:'#ffffff',refresh:0,attribution:'Live: official channel pages',
 async load(){return (await getJSON('data/live.json')).map(l=>({lat:l.lat,lon:l.lon,r:7,title:l.title,sub:l.note,popup:`<b>${esc(l.title)}</b><br>${esc(l.note)}<br><a target=_blank rel=noopener href="${esc(l.url)}">Watch live ↗</a>`}))}},
{id:'scanner',cls:'official',label:'📻 SCAN',color:'#ff8a00',refresh:0,dynamic:true,attribution:'Scanner links: <a href="https://www.broadcastify.com">Broadcastify</a>, agency sites',
 async load(){await Scanners.init();return true}}
];

const state={};const nav=document.getElementById('layers'),list=document.getElementById('feed'),scanUl=document.getElementById('scan'),
 status=document.getElementById('status'),panel=document.getElementById('panel'),ptitle=document.getElementById('ptitle');
const itemsOf=Ly=>{const s=state[Ly.id];if(!s.data)return[];return (Ly.dynamic?Scanners.items(region):s.data).filter(i=>clsOn[clsOf(i,Ly)]&&inRegion(i.lat,i.lon))};
function drawLayer(Ly){const s=state[Ly.id];s.group.clearLayers();s.shown=[];if(!s.on||!s.data){badge(Ly);return}
 if(Ly.tile){if(Ly.tileLayer)s.group.addLayer(Ly.tileLayer);s.total=0;badge(Ly);return}
 let its=itemsOf(Ly);s.total=its.length;
 if(Ly.viewport){const b=map.getBounds().pad(.25);its=its.filter(i=>b.contains([i.lat,i.lon]))}
 const mks=its.map(i=>{const mk=i.geo?L.geoJSON(i.geo,{style:{color:Ly.color,weight:1,fillOpacity:.15}}):dot([i.lat,i.lon],Ly.color,i.r);
  if(i.state)mk.on('click',()=>openScan(i));else{const c=clsOf(i,Ly),pp=i.popup;mk.bindPopup(()=>clsTag(c,i.fund)+(typeof pp==='function'?pp():pp))}i._mk=mk;return mk});
 Ly.cluster?s.group.addLayers(mks):mks.forEach(m=>m.addTo(s.group));s.shown=its;badge(Ly)}
function badge(Ly){const s=state[Ly.id];const lb=document.getElementById('layersbtn');if(lb)lb.textContent=`☰ ${Object.values(state).filter(x=>x.on).length}/${LAYERS.length}`;s.btn.innerHTML=esc(Ly.label)+(s.loading?' <span class="badge">…</span>':s.on&&s.data&&!Ly.tile?` <span class="badge">${Ly.viewport?s.shown.length+'/'+s.total:s.total}</span>`:'')}
var renderList=function(){list.innerHTML='';let n=0;const msgs=[];
 LAYERS.forEach(Ly=>{const s=state[Ly.id];if(!s.on)return;
  if(s.err)msgs.push(`${Ly.label}: ${s.err}`);else if(Ly.note)msgs.push(`${Ly.label}: ${Ly.note}`);
  if(Ly.viewport&&s.data)msgs.push(`${Ly.label}: listing ${s.shown.length} in view of ${s.total}`);
  (s.shown||[]).slice(0,300).forEach(i=>{n++;const li=document.createElement('li');li.innerHTML=`<span style="color:${Ly.color}">■</span> <span class="cls cls-${clsOf(i,Ly)}">${CLASSES[clsOf(i,Ly)][0]}</span> <b>${esc(i.title)}</b><small>${esc(i.sub)}</small>`;
   li.onclick=()=>{if(i.state)return openScan(i);closePanel();const mk=i._mk;
    if(Ly.cluster)s.group.zoomToShowLayer(mk,()=>mk.openPopup());else{map.flyTo([i.lat,i.lon],Math.max(map.getZoom(),i.geo?6:9));setTimeout(()=>mk.openPopup?mk.openPopup():mk.eachLayer(l=>l.openPopup()),900)}};
   list.appendChild(li)})});
 document.getElementById('count').textContent=n?` ${n}`:'';status.innerHTML=msgs.map(esc).join('<br>')}
function redraw(){LAYERS.forEach(drawLayer);renderList()}
let mvT;map.on('moveend',()=>{clearTimeout(mvT);mvT=setTimeout(()=>{LAYERS.filter(l=>l.viewport).forEach(drawLayer);renderList()},150)});
// Load with retry + exponential backoff (5s, 10s, 20s … max 5 min). Successful loads follow Ly.refresh.
async function refresh(Ly){const s=state[Ly.id];clearTimeout(s.timer);if(!s.on)return;s.loading=true;badge(Ly);
 try{s.data=await Ly.load();s.err=null;s.fails=0;s.btn.classList.remove('err');if(Ly.refresh)s.timer=setTimeout(()=>refresh(Ly),Ly.refresh)}
 catch(e){s.fails=(s.fails||0)+1;const wait=Math.min(5e3*2**(s.fails-1),300e3);s.err=`unavailable (${e.message}). Retry #${s.fails} in ${Math.round(wait/1000)}s`;s.btn.classList.add('err');
  s.timer=setTimeout(()=>refresh(Ly),wait)}
 s.loading=false;drawLayer(Ly);renderList()}
LAYERS.forEach(Ly=>{const b=document.createElement('button');nav.appendChild(b);
 const s=state[Ly.id]={on:['crowd','news','quakes','alerts','gdacs'].includes(Ly.id),btn:b,shown:[],total:0,
  group:(Ly.cluster?L.markerClusterGroup({chunkedLoading:true,showCoverageOnHover:false,maxClusterRadius:50}):L.layerGroup()).addTo(map)};
 b.classList.toggle('on',s.on);if(s.on)map.attributionControl.addAttribution(Ly.attribution);badge(Ly);
 b.onclick=()=>{if(Ly.id==='reports'&&!s.on&&!localStorage.getItem('eyemont.reportsAck')){if(!confirm('REPORTS are UNMODERATED and PUBLIC.\n\nAnyone can post them to open Nostr relays. Eyemont only applies automatic filters (schema, personal-info filter, 24 h expiry, community flags). Content may be false or offensive. Show them?'))return;localStorage.setItem('eyemont.reportsAck','1')}
  s.on=!s.on;b.classList.toggle('on',s.on);map.attributionControl[s.on?'addAttribution':'removeAttribution'](Ly.attribution);if(!s.on){clearTimeout(s.timer);s.err=null;b.classList.remove('err')}
  s.on&&!s.data?refresh(Ly):(drawLayer(Ly),renderList())};
 if(s.on)refresh(Ly)});
/* panel: feed list or scanner browser */
const flyState=n=>{if(BBOX[n])map.fitBounds([[BBOX[n][0],BBOX[n][1]],[BBOX[n][2],BBOX[n][3]]])};
function openPanel(mode){panel.hidden=false;const sc=mode==='scan';scanUl.hidden=!sc;list.hidden=mode!=='feed';status.hidden=mode!=='feed';
 nav.hidden=mode!=='layers';rep.hidden=mode!=='report';document.getElementById('info').hidden=mode!=='info';ptitle.textContent={scan:'📻 SCANNERS',feed:'FEED',layers:'☰ LAYERS',report:'✚ REPORT',info:'ⓘ SOURCE CLASSES'}[mode];panel.dataset.mode=mode;if(mode!=='report')pick(false)}
const tog=m=>()=>{if(!panel.hidden&&panel.dataset.mode===m)return closePanel();openPanel(m)};
document.getElementById('layersbtn').onclick=tog('layers');
document.getElementById('crowdbtn').onclick=()=>{state.crowd.btn.click();document.getElementById('crowdbtn').classList.toggle('on',state.crowd.on)};
/* report form: user taps the map to pick an area (rounded to a ~5 km geohash). No GPS, no identity. */
const rep=document.getElementById('report');let pickMk=null,picking=false,pickLL=null;
rep.querySelector('select').innerHTML=Reports.CATS.map(c=>`<option>${c}</option>`).join('');
function pick(on){picking=on;document.body.classList.toggle('picking',on)}
rep.querySelector('#rpick').onclick=()=>{pick(true);panel.hidden=true;toast('Tap the map where it is happening')};
map.on('click',e=>{if(!picking)return;pick(false);pickLL=e.latlng;const g=Reports.gh(pickLL.lat,pickLL.lng,5);
 if(pickMk)pickMk.remove();pickMk=L.circle(pickLL,{radius:2500,color:'#ff2bd6'}).addTo(map);rep.querySelector('#rloc').textContent=`area ${g} (~5 km)`;openPanel('report')});
const ta=rep.querySelector('textarea');ta.oninput=()=>rep.querySelector('#rcnt').textContent=`${ta.value.length}/280`;
rep.querySelector('#rsend').onclick=async()=>{const out=rep.querySelector('#rout');if(!pickLL){out.textContent='Pick a location first.';return}
 out.textContent='posting…';try{const n=await Reports.publish(rep.querySelector('select').value,ta.value,pickLL.lat,pickLL.lng);out.textContent=`Posted to ${n} relay(s).`;ta.value='';if(pickMk)pickMk.remove();pickLL=null;
 setTimeout(()=>refresh(LAYERS.find(l=>l.id==='reports')),1500)}catch(e){out.textContent=e.message}};
document.getElementById('reportbtn').onclick=tog('report');
function toast(t){const d=document.getElementById('toast');d.textContent=t;d.hidden=false;clearTimeout(d._t);d._t=setTimeout(()=>d.hidden=true,3000)}
function closePanel(){panel.hidden=true}
function openScan(i){openPanel('scan');i.county!=null?Scanners.showCounty(scanUl,i.state,i.county):Scanners.showState(scanUl,i.state,flyState)}
document.getElementById('scanbtn').onclick=()=>{if(!panel.hidden&&panel.dataset.mode==='scan')return closePanel();openPanel('scan');region==='World'?Scanners.showStates(scanUl,flyState):Scanners.showState(scanUl,region,flyState)};
document.getElementById('feedbtn').onclick=()=>{if(!panel.hidden&&panel.dataset.mode==='feed')return closePanel();openPanel('feed');renderList()};
openPanel('feed');closePanel();
document.getElementById('pclose').onclick=closePanel;
const sel=document.getElementById('region');
getJSON('states-bbox.json').then(b=>{BBOX=b;Object.keys(b).sort().forEach(k=>sel.add(new Option(k.toUpperCase(),k)))}).catch(()=>{});
sel.onchange=()=>{region=sel.value;if(region==='World')map.setView([20,0],2);else flyState(region);redraw()};
window.addEventListener('eyemont:hidden',()=>LAYERS.filter(l=>l.id==='crowd'||l.id==='reports').forEach(l=>state[l.id]?.on&&refresh(l)));

/* relay status chip + identity controls */
function relayChip(st){const v=Object.values(st),up=v.filter(x=>x==='up').length,dn=v.filter(x=>x==='down').length;
 document.querySelectorAll('.relaychip').forEach(c=>{c.textContent=`relays ${up}/${v.length} up`+(dn?` · ${dn} down`:'');c.dataset.s=up?'ok':dn===v.length?'down':'idle';c.title=Object.entries(st).map(([u,x])=>u.replace('wss://','')+': '+x).join('\n')})}
window.addEventListener('eyemont:relays',e=>relayChip(e.detail));relayChip(Reports.status());
document.getElementById('rnewid').onclick=()=>{if(!confirm('Start a new identity? Your old key on this device is deleted; past reports stay public but are no longer linked to this device.'))return;Reports.newIdentity();document.getElementById('rid').textContent='new key on next post';toast('New identity')};
document.getElementById('reportbtn').addEventListener('click',()=>{Reports.lib().catch(()=>{});if(localStorage.getItem('eyemont.nsec'))Reports.pubkey().then(p=>document.getElementById('rid').textContent='key '+p.slice(0,8)+'…').catch(()=>{})});

/* class filter bar + info sheet */
const cb=document.getElementById('clsbar');
cb.innerHTML=Object.entries(CLASSES).map(([k,v])=>`<button data-c="${k}" class="cls-${k}${clsOn[k]?' on':''}" aria-pressed="${clsOn[k]}">${v}</button>`).join('')+'<button id="clsinfo" aria-label="About source classes">ⓘ</button>';
cb.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='clsinfo')return openPanel('info');const k=b.dataset.c;clsOn[k]=!clsOn[k];
 if(!Object.values(clsOn).some(Boolean)){clsOn[k]=true;return toast('At least one class must stay on')}
 b.classList.toggle('on',clsOn[k]);b.setAttribute('aria-pressed',clsOn[k]);localStorage.setItem('eyemont.cls',JSON.stringify(clsOn));
 LAYERS.forEach(drawLayer);renderList();window.dispatchEvent(new Event('eyemont:cls'))};

/* LIVE incidents: items from all visible layers within ~25 km and 2 h are linked; confidence grows with independent sources and classes */
const km=(a,b,c,d)=>{const r=Math.PI/180,x=(d-b)*r*Math.cos((a+c)/2*r),y=(c-a)*r;return 6371*Math.hypot(x,y)};
function incidents(){const now=Date.now(),its=[];
 LAYERS.forEach(Ly=>{const s=state[Ly.id];if(!s.on||!s.data||Ly.tile||Ly.dynamic)return;
  itemsOf(Ly).forEach(i=>{if(i.home)return;const t=i.time||(Ly.id==='gdelt'?now:null);if(!t||now-t>6*36e5||t>now+6e5)return;
   its.push({i,Ly,t,c:clsOf(i,Ly),src:Ly.id==='d911'?'911 dispatch':(i.src||Ly.label)})})});
 its.sort((a,b)=>a.t-b.t);const C=[];
 for(const x of its){let best=null,bd=25;for(const c of C){if(x.t-c.first>72e5)continue;const d=km(c.lat,c.lon,x.i.lat,x.i.lon);if(d<bd){bd=d;best=c}}
  if(!best){best={lat:x.i.lat,lon:x.i.lon,m:[],first:x.t,last:x.t};C.push(best)}
  best.m.push(x);best.last=Math.max(best.last,x.t);const n=best.m.length;best.lat+=(x.i.lat-best.lat)/n;best.lon+=(x.i.lon-best.lon)/n}
 return C.map(c=>{const S=new Set(c.m.map(x=>x.src)),K=new Set(c.m.map(x=>x.c)),L2=new Set(c.m.map(x=>x.Ly.id));
  c.src=S.size;c.cls=[...K];c.layers=L2.size;c.conf=Math.min(1,.15+.2*(S.size-1)+.15*(K.size-1)+.1*(L2.size-1));c.grow=c.m.filter(x=>now-x.t<18e5).length;
  c.head=(c.m.find(x=>x.Ly.id==='news')||c.m.find(x=>x.Ly.id!=='gdelt')||c.m[0]).i.title;return c}).filter(c=>c.src>=2)
  .sort((a,b)=>(Math.round(b.last/6e5)-Math.round(a.last/6e5))||(b.grow-a.grow)||(b.conf-a.conf))}
const ib=document.getElementById('incbar');let INC=[],incMk=null;
function renderInc(){INC=incidents();ib.innerHTML=`<b class="inclive">● LIVE</b>`+(INC.length?INC.slice(0,25).map((c,k)=>`<button data-k="${k}"><span class="conf" style="opacity:${.4+c.conf*.6}">${Math.round(c.conf*100)}%</span> ${c.cls.map(x=>`<span class="cls cls-${x}">${CLASSES[x][0]}</span>`).join('')} ${esc(c.head.slice(0,60))} <small>${c.src} src${c.grow?' ↑'+c.grow:''} · ${ago(c.last/1000)}</small></button>`).join(''):'<small>no linked incidents in visible layers (needs ≥2 sources within 25 km / 2 h)</small>')}
ib.onclick=e=>{const b=e.target.closest('button');if(!b)return;const c=INC[+b.dataset.k];if(incMk)incMk.remove();
 const by={};c.m.forEach(x=>(by[x.c]=by[x.c]||[]).push(x));
 incMk=L.circle([c.lat,c.lon],{radius:25e3,color:'#ff4081',weight:1,fillOpacity:.05}).addTo(map).bindPopup(`<b>◎ Linked incident · confidence ${Math.round(c.conf*100)}%</b><br><small>${c.src} distinct sources · ${c.cls.length} class(es) · ${c.m.length} items · ${new Date(c.first).toLocaleTimeString()}–${new Date(c.last).toLocaleTimeString()}. Automatic proximity link (25 km / 2 h), may join unrelated events.</small><div class="incgrid">`+
  Object.keys(CLASSES).filter(k=>by[k]).map(k=>`<div><span class="cls cls-${k}">${CLASSES[k]}</span>`+by[k].slice(0,8).map(x=>`<p><small>${esc(x.Ly.label)} · ${esc(x.src)}</small><br>${esc(x.i.title.slice(0,120))}</p>`).join('')+`</div>`).join('')+'</div>',{maxWidth:340}).openPopup();
 map.flyTo([c.lat,c.lon],Math.max(map.getZoom(),8))};
const _rl=renderList;renderList=function(){_rl();renderInc()};

})();
