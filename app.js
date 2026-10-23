// EYEMONT M1 — layer plugin registry. See ARCHITECTURE.md
(()=>{
const API=''; // reserved: optional proxy base URL (future, needs Evan's approval). Empty = direct fetch.
const c=document.getElementById('rain'),x=c.getContext('2d');let drops=[];
function rs(){c.width=innerWidth;c.height=innerHeight;drops=Array(Math.floor(c.width/14)).fill(1)}rs();addEventListener('resize',rs);
setInterval(()=>{x.fillStyle='rgba(0,0,0,.08)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00ff41';x.font='14px monospace';
drops.forEach((y,i)=>{x.fillText(String.fromCharCode(0x30A0+Math.random()*96),i*14,y*14);if(y*14>c.height&&Math.random()>.975)drops[i]=0;drops[i]++})},60);

const map=L.map('map',{zoomControl:false,worldCopyJump:true}).setView([39,-98],3);
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
 attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const dot=(ll,col,r=5)=>L.circleMarker(ll,{radius:r,color:col,weight:1,fillColor:col,fillOpacity:.7});
let BBOX={},region='World';
const inRegion=(lat,lon)=>{if(region==='World')return true;const b=BBOX[region];return b&&lat>=b[0]&&lat<=b[2]&&lon>=b[1]&&lon<=b[3]};
const center=()=>region==='World'||!BBOX[region]?map.getCenter():L.latLngBounds([BBOX[region][0],BBOX[region][1]],[BBOX[region][2],BBOX[region][3]]).getCenter();
async function getJSON(u,o){const r=await fetch(u,o);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
// Feed access: proxy (apiBase/feeds/<name>) first when configured, then direct sources in order.
async function feed(name,direct,o){if(API){try{return await getJSON(`${API}/feeds/${name}`)}catch(e){}}
 let err;for(const u of [].concat(direct)){try{return await getJSON(u,o)}catch(e){err=e}}throw err}

/* Layer plugins: {id,label,color,attribution,refresh(ms),load()->[{lat,lon,title,sub,popup,r?,geo?}]} */
document.addEventListener('click',e=>{const b=e.target.closest('button.live');if(b)Player.play(b.dataset.h,b.dataset.n,'Caltrans live cam',b.dataset.i)});
const LAYERS=[
{id:'quakes',label:'⌁ QUAKES',color:'#ff3b3b',refresh:120e3,attribution:'Quakes: <a href="https://earthquake.usgs.gov">USGS</a>',
 async load(){const d=await feed('quakes','https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  return d.features.map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],r:3+Math.max(0,f.properties.mag||0)*2,
   title:`M${(f.properties.mag??0).toFixed(1)} ${f.properties.place||''}`,sub:new Date(f.properties.time).toLocaleString(),
   popup:`<b>${esc(f.properties.title)}</b><br>${new Date(f.properties.time).toLocaleString()}<br><a target=_blank rel=noopener href="${esc(f.properties.url)}">USGS ↗</a>`}))}},
{id:'alerts',label:'⚠ NWS ALERTS',color:'#ffd400',refresh:180e3,attribution:'Alerts: <a href="https://www.weather.gov">NWS</a>',
 async load(){const d=await feed('alerts','https://api.weather.gov/alerts/active?status=actual',{headers:{Accept:'application/geo+json'}});
  return d.features.filter(f=>f.geometry).map(f=>{const g=L.geoJSON(f.geometry).getBounds().getCenter();
   return {lat:g.lat,lon:g.lng,geo:f.geometry,title:f.properties.event,sub:f.properties.areaDesc,
   popup:`<b>${esc(f.properties.headline)}</b><br>${esc(f.properties.areaDesc)}<br>Until ${esc(f.properties.expires)}`}})}},
{id:'air',label:'✈ AIRCRAFT',color:'#00e5ff',refresh:60e3,attribution:'Aircraft: <a href="https://adsb.lol">adsb.lol</a> (ODbL)',
 async load(){const m=a=>a.filter(a=>a.lat!=null).slice(0,1500).map(a=>({lat:a.lat,lon:a.lon,r:3,title:(a.flight||a.hex||'').trim()||'?',
   sub:`${a.t||''} alt ${a.alt_baro??'?'} ft · ${a.gs??'?'} kt`,popup:`<b>${esc(a.flight||a.hex)}</b><br>${esc(a.t||'')} ${esc(a.r||'')}<br>alt ${esc(a.alt_baro)} ft · ${esc(a.gs)} kt<br><a target=_blank rel=noopener href="https://globe.adsb.lol/?icao=${esc(a.hex)}">track ↗</a>`}));
  const p=center();
  try{const d=await feed('aircraft',`https://api.adsb.lol/v2/lat/${p.lat.toFixed(2)}/lon/${p.lng.toFixed(2)}/dist/250`);this.note='live';return m(d.ac||[])}catch(e){}
  const d=await getJSON('data/aircraft.json');this.note=`browser CORS blocked → US snapshot ${d.now?new Date(d.now*1000).toLocaleTimeString():'n/a'} (server-side, 15 min)`;return m(d.ac||[])}},
{id:'cams',label:'◉ CA CAMS',color:'#b388ff',refresh:0,cluster:true,attribution:'Cams: <a href="https://cwwp2.dot.ca.gov">Caltrans</a>',
 async load(){const d=await getJSON('data/cams.json');return d.map(([n,lat,lon,county,typ,hls,img])=>({lat,lon,r:4,title:n,sub:`${county} County, CA${hls?' · live video':''}`,
  popup:()=>`<b>${esc(n)}</b><br><small>${esc(county)} County</small><img src="${esc(img)}?t=${Date.now()}" alt="snapshot">`+(hls?`<button class="live" data-h="${esc(hls)}" data-n="${esc(n)}" data-i="${esc(img)}">▶ LIVE (keeps playing)</button>`:'')+`<small>Caltrans public CCTV</small>`}))}},
{id:'scanner',label:'📻 SCANNERS',color:'#ff8a00',refresh:0,attribution:'Scanner links: <a href="https://www.broadcastify.com">Broadcastify</a>, agency sites',
 async load(){await Scanners.init();return [{dynamic:true}]}}
];

const state={};const nav=document.getElementById('layers'),list=document.getElementById('feed'),status=document.getElementById('status'),panel=document.getElementById('panel');
function render(){list.innerHTML='';let n=0;const msgs=[];let batch;
 LAYERS.forEach(Ly=>{const s=state[Ly.id];s.group.clearLayers();if(!s.on)return;
  if(s.err)msgs.push(`${Ly.label}: ${s.err}`);else if(Ly.note)msgs.push(`${Ly.label}: ${Ly.note}`);
  (batch=[],Ly.id==='scanner'&&s.items?Scanners.items(region):(s.items||[])).filter(i=>inRegion(i.lat,i.lon)).forEach(i=>{
   const mk=i.geo?L.geoJSON(i.geo,{style:{color:Ly.color,weight:1,fillOpacity:.15}}):dot([i.lat,i.lon],Ly.color,i.r);
   if(i.state){mk.on('click',()=>openScan(i))}else mk.bindPopup(i.popup);if(!Ly.cluster)mk.addTo(s.group);
   if(Ly.cluster)batch.push(mk);if(n++<400){const li=document.createElement('li');li.innerHTML=`<span style="color:${Ly.color}">■</span> <b>${esc(i.title)}</b><small>${esc(i.sub)}</small>`;
    li.onclick=i.state?()=>openScan(i):Ly.cluster?()=>{panel.classList.remove('open');s.group.zoomToShowLayer(mk,()=>mk.openPopup())}:()=>{panel.classList.remove('open');map.flyTo([i.lat,i.lon],Math.max(map.getZoom(),i.geo?6:9));setTimeout(()=>mk.openPopup(),900)};list.appendChild(li)}});if(batch.length)s.group.addLayers(batch)});
 document.getElementById('count').textContent=`[${n}]`;status.innerHTML=msgs.map(esc).join('<br>')+(API?`<br>API: ${esc(API)}`:'')}
async function refresh(Ly){const s=state[Ly.id];if(!s.on)return;s.btn.textContent=Ly.label+' …';
 try{s.items=await Ly.load();s.err=null;s.btn.classList.remove('err')}catch(e){s.err='feed unavailable ('+e.message+') — retrying';s.btn.classList.add('err')}
 s.btn.textContent=Ly.label+(s.items?` ${s.items.length}`:'');render()}
LAYERS.forEach(Ly=>{const b=document.createElement('button');b.textContent=Ly.label;nav.appendChild(b);
 const s=state[Ly.id]={on:['quakes','alerts','air'].includes(Ly.id),btn:b,group:(Ly.cluster?L.markerClusterGroup({chunkedLoading:true,showCoverageOnHover:false,maxClusterRadius:50}):L.layerGroup()).addTo(map)};b.classList.toggle('on',s.on);
 map.attributionControl.addAttribution(Ly.attribution);
 b.onclick=()=>{s.on=!s.on;b.classList.toggle('on',s.on);s.on&&!s.items?refresh(Ly):render()};
 if(s.on)refresh(Ly);if(Ly.refresh)setInterval(()=>refresh(Ly),Ly.refresh)});
window.EYEMONT_MAP=map;const scanUl=document.getElementById('scan');
const flyState=n=>{if(BBOX[n])map.fitBounds([[BBOX[n][0],BBOX[n][1]],[BBOX[n][2],BBOX[n][3]]])};
function scanMode(on){scanUl.hidden=!on;list.hidden=on;panel.classList.add('open')}
async function openScan(i){await Scanners.init();scanMode(true);i.county!=null?Scanners.showCounty(scanUl,i.state,i.county):Scanners.showState(scanUl,i.state,flyState)}
document.getElementById('scanbtn').onclick=async()=>{await Scanners.init();scanMode(true);region==='World'?Scanners.showStates(scanUl,flyState):Scanners.showState(scanUl,region,flyState)};
document.getElementById('grip').onclick=()=>{if(!scanUl.hidden&&panel.classList.contains('open')){scanMode(false);panel.classList.add('open');return}panel.classList.toggle('open')};
const sel=document.getElementById('region');
getJSON('states-bbox.json').then(b=>{BBOX=b;Object.keys(b).sort().forEach(k=>sel.add(new Option(k.toUpperCase(),k)))});
sel.onchange=()=>{region=sel.value;if(region==='World')map.setView([20,0],2);else map.fitBounds([[BBOX[region][0],BBOX[region][1]],[BBOX[region][2],BBOX[region][3]]]);
 render();refresh(LAYERS.find(l=>l.id==='air'))};
})();
