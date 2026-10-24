/* Eyemont service worker: caches the app shell + the last fetched snapshot so the app opens offline. No push, no background sync. */
const V='eyemont-v1',SHELL=['./','index.html','style.css','app.js','crowd.js','scanners.js','pow-worker.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','states-bbox.json','data/places.json','data/us_states.geojson','data/allow.txt','data/sources.json','data/counties.json','data/official_streams.json','data/scanners.json',
 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css','https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css','https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js','https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!=='eyemont-data').map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const SKIP=/tile\.openstreetmap|basemaps\.cartocdn|arcgisonline|mesonet\.agron|\/cache\/tile|\.m3u8|\.ts$|caltrans|cwwp2|broadcastify/;
const key=u=>{const x=new URL(u);x.search='';return x.href};
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||!/^https?:/.test(r.url)||SKIP.test(r.url))return;const u=new URL(r.url);
 const shell=u.origin===location.origin&&!/\/data\/.*\.json$/.test(u.pathname)||/unpkg\.com|cdn\.jsdelivr/.test(u.host);
 if(shell){e.respondWith(caches.open(V).then(c=>c.match(r,{ignoreSearch:true}).then(hit=>{const net=fetch(r).then(res=>{if(res.ok)c.put(key(r.url),res.clone());return res}).catch(()=>hit);return hit||net})));return}
 /* data + feed APIs: network first, fall back to the last good copy (query string ignored so the cache stays one entry per feed) */
 e.respondWith(fetch(r).then(res=>{if(res.ok){const cl=res.clone();caches.open('eyemont-data').then(c=>c.put(key(r.url),cl))}return res}).catch(()=>caches.open('eyemont-data').then(c=>c.match(key(r.url))).then(h=>h||Response.error())))});
