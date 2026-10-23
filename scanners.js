// Scanners: State → County browser. Broadcastify = plain outbound links only (ToS §9(d) forbids embedding/re-streaming without a paid license).
// Official agency streams = outbound links to the agency page. No audio is embedded, proxied or rehosted.
window.Scanners=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let C={},OFF=[],ready=null;
const bc=n=>`https://www.broadcastify.com/listen/stid/${C[n].fips}`;
const offFor=(n,c)=>OFF.filter(o=>o.state===n&&(!c||o.county===c));
const offRows=l=>l.map(o=>`<li class="off"><a target=_blank rel=noopener href="${esc(o.url)}">★ ${esc(o.title)} ↗</a><small>${esc(o.note)}</small></li>`).join('');
const bcRow=(n,c)=>`<li><a target=_blank rel=noopener href="${bc(n)}">📻 Listen on Broadcastify — ${esc(c?c+', ':'')}${esc(n)} ↗</a><small>Opens Broadcastify's own site/player${c?' (state directory → pick '+esc(c)+')':''}</small></li>`;
function showStates(ul,fly){ul.innerHTML='<li><small>SCANNERS › pick a state</small></li>'+Object.keys(C).sort().map(n=>`<li data-state="${esc(n)}"><b>${esc(n)}</b><small>${C[n].c.length} counties${offFor(n).length?' · ★ '+offFor(n).length+' official':''}</small></li>`).join('');
 ul.querySelectorAll('[data-state]').forEach(li=>li.onclick=()=>showState(ul,li.dataset.state,fly))}
function showState(ul,n,fly){fly&&fly(n);ul.innerHTML=`<li data-back><small>‹ ALL STATES</small></li>`+bcRow(n)+offRows(offFor(n))+
 C[n].c.map((c,i)=>`<li data-i="${i}"><b>${esc(c[0])}</b><small>${offFor(n,c[0]).length?'★ official stream · ':''}Broadcastify ›</small></li>`).join('');
 ul.querySelector('[data-back]').onclick=()=>showStates(ul,fly);ul.querySelectorAll('[data-i]').forEach(li=>li.onclick=()=>showCounty(ul,n,+li.dataset.i,fly))}
function showCounty(ul,n,i,fly){const c=C[n].c[i];window.EYEMONT_MAP&&window.EYEMONT_MAP.flyTo([c[1],c[2]],9);
 ul.innerHTML=`<li data-back><small>‹ ${esc(n.toUpperCase())}</small></li><li><b>${esc(c[0])}, ${esc(C[n].abbr)}</b></li>`+offRows(offFor(n,c[0]))+bcRow(n,c[0])+
 `<li><a target=_blank rel=noopener href="https://www.radioreference.com/db/browse/stid/${C[n].fips}">RadioReference frequency DB ↗</a></li>`;
 ul.querySelector('[data-back]').onclick=()=>showState(ul,n,fly)}
function items(region){const off=OFF.map(o=>({lat:o.lat,lon:o.lon,r:8,title:'★ '+o.title,sub:o.note,popup:`<b>${esc(o.title)}</b><br>${esc(o.note)}<br><a target=_blank rel=noopener href="${esc(o.url)}">Open official stream ↗</a>`}));
 if(region==='World')return off.concat(Object.entries(C).map(([n,s])=>{const a=s.c.reduce((p,c)=>[p[0]+c[1],p[1]+c[2]],[0,0]);return {lat:a[0]/s.c.length,lon:a[1]/s.c.length,r:6,title:n,sub:'scanner directory ›',state:n}}));
 const s=C[region];return s?off.concat(s.c.map((c,i)=>({lat:c[1],lon:c[2],r:4,title:c[0],sub:region+' scanners ›',state:region,county:i}))):off}
return {init:()=>ready||(ready=Promise.all([fetch('data/counties.json').then(r=>r.json()),fetch('data/official_streams.json').then(r=>r.json())]).then(([a,b])=>{C=a;OFF=b})),items,showStates,showState,showCounty};
})();
// Sticky player: plays only streams we're allowed to play directly (currently Caltrans public HLS cams). Media Session for lock screen.
window.Player=(()=>{const bar=document.getElementById('player'),v=document.getElementById('pvid'),t=document.getElementById('ptxt');let hls;
function play(src,title,artist,art){bar.classList.add('on');t.textContent=title;if(hls){hls.destroy();hls=null}
 if(v.canPlayType('application/vnd.apple.mpegurl'))v.src=src;else if(window.Hls&&Hls.isSupported()){hls=new Hls();hls.loadSource(src);hls.attachMedia(v)}else{t.textContent='HLS unsupported';return}
 v.play().catch(()=>t.textContent=title+' — tap ▶');
 if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title,artist,album:'EYEMONT',artwork:art?[{src:art,sizes:'320x240',type:'image/jpeg'}]:[]});
  navigator.mediaSession.setActionHandler('play',()=>v.play());navigator.mediaSession.setActionHandler('pause',()=>v.pause())}}
document.getElementById('ptoggle').onclick=()=>v.paused?v.play():v.pause();
document.getElementById('pstop').onclick=()=>{v.pause();if(hls){hls.destroy();hls=null}v.removeAttribute('src');v.load();bar.classList.remove('on')};
v.onplay=()=>document.getElementById('ptoggle').textContent='❚❚';v.onpause=()=>document.getElementById('ptoggle').textContent='▶';
return {play}})();
