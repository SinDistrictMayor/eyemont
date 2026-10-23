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
const LAYERS=[
{id:'quakes',label:'⌁ QUAKE',color:'#ff4d4d',refresh:120e3,attribution:'Quakes: <a href="https://earthquake.usgs.gov">USGS</a>',
 async load(){const d=await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  return d.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],r:3+Math.max(0,f.properties.mag||0)*2,
   title:`M${(f.properties.mag??0).toFixed(1)} ${f.properties.place||''}`,sub:new Date(f.properties.time).toLocaleString(),
   popup:`<b>${esc(f.properties.title)}</b><br>${new Date(f.properties.time).toLocaleString()}<br><a target=_blank rel=noopener href="${esc(f.properties.url)}">USGS ↗</a>`}))}},
{id:'alerts',label:'⚠ ALERT',color:'#ffd400',refresh:180e3,attribution:'Alerts: <a href="https://www.weather.gov">NWS</a>',
 async load(){const d=await getJSON('https://api.weather.gov/alerts/active?status=actual',{headers:{Accept:'application/geo+json'}});
  return d.features.filter(f=>f.geometry).map(f=>{const g=L.geoJSON(f.geometry).getBounds().getCenter();
   return {lat:g.lat,lon:g.lng,geo:f.geometry,title:f.properties.event,sub:f.properties.areaDesc,
   popup:`<b>${esc(f.properties.headline)}</b><br>${esc(f.properties.areaDesc)}<br>Until ${esc(f.properties.expires)}`}})}},
{id:'air',label:'✈ AIR',color:'#00e5ff',refresh:300e3,attribution:'Aircraft: <a href="https://adsb.lol">adsb.lol</a> (ODbL)',
 // Snapshot only: adsb.lol sends no CORS header, so the Pages build bakes data/aircraft.json every ~15 min.
 async load(){const d=await getJSON('data/aircraft.json?t='+Math.floor(Date.now()/60e3));
  if(!d.now||!(d.ac||[]).length)throw new Error('snapshot not available yet');
  this.note=`US snapshot, ${ago(d.now)} (not live) · ${d.coverage||'partial coverage'}`;
  return d.ac.filter(a=>a.lat!=null).map(a=>({lat:a.lat,lon:a.lon,r:3,title:(a.flight||a.hex||'').trim()||'?',
   sub:`${a.t||''} alt ${a.alt_baro??'?'} ft · ${a.gs??'?'} kt`,popup:`<b>${esc(a.flight||a.hex)}</b><br>${esc(a.t||'')} ${esc(a.r||'')}<br>alt ${esc(a.alt_baro)} ft · ${esc(a.gs)} kt<br><small>snapshot ${ago(d.now)}</small><br><a target=_blank rel=noopener href="https://globe.adsb.lol/?icao=${esc(a.hex)}">live track ↗</a>`}))}},
{id:'cams',label:'◉ CAMS',color:'#b388ff',refresh:0,cluster:true,viewport:true,attribution:'Cams: <a href="https://cwwp2.dot.ca.gov">Caltrans</a>',
 async load(){const d=await getJSON('data/cams.json');return d.map(([n,lat,lon,county,typ,hls,img])=>({lat,lon,r:5,title:n,sub:`${county} County, CA${hls?' · live video':''}`,
  popup:()=>`<b>${esc(n)}</b><br><small>${esc(county)} County</small><img src="${esc(img)}?t=${Date.now()}" alt="snapshot">`+(hls?`<button class="live" data-h="${esc(hls)}" data-n="${esc(n)}" data-i="${esc(img)}">▶ LIVE VIDEO</button>`:'')+`<small>Caltrans public CCTV</small>`}))}},
{id:'crowd',label:'👁 CROWD',color:'#39ff14',refresh:180e3,attribution:'Crowd: <a href="https://bsky.app">Bluesky</a>, <a href="https://mastodon.social">Mastodon</a>',
 async load(){const {groups,stats}=await Crowd.load();this.note=`${stats.placed} of ${stats.fetched} public posts name a known place · ${stats.filtered} filtered (personal info)`;
  return groups.map(g=>({lat:g.place[1],lon:g.place[2],r:5+Math.min(10,g.posts.length*1.5),title:`📍 ${g.place[0]} · ${g.posts.length} post(s)`,sub:g.posts[0].text.slice(0,80),popup:()=>Crowd.card(g)}))}},
{id:'reports',label:'✚ REPORTS',color:'#ff2bd6',refresh:120e3,attribution:'Reports: Nostr public relays',
 async load(){return Reports.items(await Reports.load())}},
{id:'radar',label:'☂ RADAR',color:'#4fc3f7',refresh:600e3,tile:true,attribution:'Radar: <a href="https://www.rainviewer.com">RainViewer</a>',
 async load(){const d=await getJSON('https://api.rainviewer.com/public/weather-maps.json');const f=d.radar.past[d.radar.past.length-1];
  this.note='radar '+new Date(f.time*1000).toLocaleTimeString();this.tileLayer=L.tileLayer(`${d.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:.6,maxNativeZoom:7,maxZoom:19});return []}},
{id:'eonet',label:'🛰 EONET',color:'#ff9e40',refresh:900e3,attribution:'Events: <a href="https://eonet.gsfc.nasa.gov">NASA EONET</a>',
 async load(){const d=await getJSON('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30');
  return d.events.map(e=>{const g=e.geometry[e.geometry.length-1];if(!g||g.type!=='Point')return null;const cat=e.categories[0]?.title||'';
   return {lat:g.coordinates[1],lon:g.coordinates[0],r:5,title:e.title,sub:`${cat} · ${new Date(g.date).toLocaleDateString()}`,popup:`<b>${esc(e.title)}</b><br>${esc(cat)} · ${new Date(g.date).toLocaleString()}<br>${(e.sources||[]).map(s=>`<a target=_blank rel=noopener href="${esc(s.url)}">${esc(s.id)} ↗</a>`).join(' ')}`}}).filter(Boolean)}},
{id:'gdacs',label:'⚑ GDACS',color:'#ff1744',refresh:900e3,attribution:'Disasters: <a href="https://www.gdacs.org">GDACS</a>',
 async load(){const d=await getJSON('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;VO;WF;DR&alertlevel=Green;Orange;Red');
  return d.features.map(f=>{const p=f.properties;return {lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],r:p.alertlevel==='Red'?9:p.alertlevel==='Orange'?7:5,
   title:`${p.alertlevel} · ${p.name}`,sub:new Date(p.fromdate).toLocaleDateString(),popup:`<b>${esc(p.name)}</b><br>${esc(p.alertlevel)} alert · ${esc(p.fromdate)}<br><a target=_blank rel=noopener href="${esc(p.url?.report||'https://www.gdacs.org')}">GDACS report ↗</a>`}})}},
{id:'live',label:'▶ LIVE TV',color:'#ffffff',refresh:0,attribution:'Live: official channel pages',
 async load(){return (await getJSON('data/live.json')).map(l=>({lat:l.lat,lon:l.lon,r:7,title:l.title,sub:l.note,popup:`<b>${esc(l.title)}</b><br>${esc(l.note)}<br><a target=_blank rel=noopener href="${esc(l.url)}">Watch live ↗</a>`}))}},
{id:'scanner',label:'📻 SCAN',color:'#ff8a00',refresh:0,dynamic:true,attribution:'Scanner links: <a href="https://www.broadcastify.com">Broadcastify</a>, agency sites',
 async load(){await Scanners.init();return true}}
];

const state={};const nav=document.getElementById('layers'),list=document.getElementById('feed'),scanUl=document.getElementById('scan'),
 status=document.getElementById('status'),panel=document.getElementById('panel'),ptitle=document.getElementById('ptitle');
const itemsOf=Ly=>{const s=state[Ly.id];if(!s.data)return[];return (Ly.dynamic?Scanners.items(region):s.data).filter(i=>inRegion(i.lat,i.lon))};
function drawLayer(Ly){const s=state[Ly.id];s.group.clearLayers();s.shown=[];if(!s.on||!s.data){badge(Ly);return}
 if(Ly.tile){if(Ly.tileLayer)s.group.addLayer(Ly.tileLayer);s.total=0;badge(Ly);return}
 let its=itemsOf(Ly);s.total=its.length;
 if(Ly.viewport){const b=map.getBounds().pad(.25);its=its.filter(i=>b.contains([i.lat,i.lon]))}
 const mks=its.map(i=>{const mk=i.geo?L.geoJSON(i.geo,{style:{color:Ly.color,weight:1,fillOpacity:.15}}):dot([i.lat,i.lon],Ly.color,i.r);
  if(i.state)mk.on('click',()=>openScan(i));else mk.bindPopup(i.popup);i._mk=mk;return mk});
 Ly.cluster?s.group.addLayers(mks):mks.forEach(m=>m.addTo(s.group));s.shown=its;badge(Ly)}
function badge(Ly){const s=state[Ly.id];const lb=document.getElementById('layersbtn');if(lb)lb.textContent=`☰ LAYERS ${Object.values(state).filter(x=>x.on).length}/${LAYERS.length}`;s.btn.innerHTML=esc(Ly.label)+(s.loading?' <span class="badge">…</span>':s.on&&s.data&&!Ly.tile?` <span class="badge">${Ly.viewport?s.shown.length+'/'+s.total:s.total}</span>`:'')}
function renderList(){list.innerHTML='';let n=0;const msgs=[];
 LAYERS.forEach(Ly=>{const s=state[Ly.id];if(!s.on)return;
  if(s.err)msgs.push(`${Ly.label}: ${s.err}`);else if(Ly.note)msgs.push(`${Ly.label}: ${Ly.note}`);
  if(Ly.viewport&&s.data)msgs.push(`${Ly.label}: listing ${s.shown.length} in view of ${s.total}`);
  (s.shown||[]).slice(0,300).forEach(i=>{n++;const li=document.createElement('li');li.innerHTML=`<span style="color:${Ly.color}">■</span> <b>${esc(i.title)}</b><small>${esc(i.sub)}</small>`;
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
 const s=state[Ly.id]={on:['crowd','reports','quakes','alerts','gdacs'].includes(Ly.id),btn:b,shown:[],total:0,
  group:(Ly.cluster?L.markerClusterGroup({chunkedLoading:true,showCoverageOnHover:false,maxClusterRadius:50}):L.layerGroup()).addTo(map)};
 b.classList.toggle('on',s.on);map.attributionControl.addAttribution(Ly.attribution);badge(Ly);
 b.onclick=()=>{s.on=!s.on;b.classList.toggle('on',s.on);if(!s.on){clearTimeout(s.timer);s.err=null;b.classList.remove('err')}
  s.on&&!s.data?refresh(Ly):(drawLayer(Ly),renderList())};
 if(s.on)refresh(Ly)});
/* panel: feed list or scanner browser */
const flyState=n=>{if(BBOX[n])map.fitBounds([[BBOX[n][0],BBOX[n][1]],[BBOX[n][2],BBOX[n][3]]])};
function openPanel(mode){panel.hidden=false;const sc=mode==='scan';scanUl.hidden=!sc;list.hidden=sc;status.hidden=sc;ptitle.textContent=sc?'📻 SCAN':'FEED';panel.dataset.mode=mode}
function closePanel(){panel.hidden=true}
function openScan(i){openPanel('scan');i.county!=null?Scanners.showCounty(scanUl,i.state,i.county):Scanners.showState(scanUl,i.state,flyState)}
document.getElementById('scanbtn').onclick=()=>{if(!panel.hidden&&panel.dataset.mode==='scan')return closePanel();openPanel('scan');region==='World'?Scanners.showStates(scanUl,flyState):Scanners.showState(scanUl,region,flyState)};
document.getElementById('feedbtn').onclick=()=>{if(!panel.hidden&&panel.dataset.mode==='feed')return closePanel();openPanel('feed');renderList()};
openPanel('feed');closePanel();
document.getElementById('pclose').onclick=closePanel;
const sel=document.getElementById('region');
getJSON('states-bbox.json').then(b=>{BBOX=b;Object.keys(b).sort().forEach(k=>sel.add(new Option(k.toUpperCase(),k)))}).catch(()=>{});
sel.onchange=()=>{region=sel.value;if(region==='World')map.setView([20,0],2);else flyState(region);redraw()};
})();
