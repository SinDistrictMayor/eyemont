// Scanners: State → County browser. Broadcastify = plain outbound links only (ToS §9(d) forbids embedding/re-streaming without a paid license).
// Official agency streams = outbound links to the agency page. No audio is embedded, proxied or rehosted.
window.Scanners=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let C=null,OFF=[],ready=null;
const j=u=>fetch(u).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()});
function init(){if(C)return Promise.resolve();
 if(!ready)ready=Promise.all([j('data/counties.json'),j('data/official_streams.json').catch(()=>[])]).then(([a,b])=>{C=a;OFF=b}).catch(e=>{ready=null;throw e}); // never cache a rejection
 return ready}
const bc=n=>`https://www.broadcastify.com/listen/stid/${C[n].fips}`;
const offFor=(n,c)=>OFF.filter(o=>o.state===n&&(!c||o.county===c));
const offRows=l=>l.map(o=>`<li class="off"><a target=_blank rel=noopener href="${esc(o.url)}">★ ${esc(o.title)} ↗</a><small>${esc(o.note)}</small></li>`).join('');
const bcRow=(n,c)=>`<li><a target=_blank rel=noopener href="${bc(n)}">📻 Listen on Broadcastify: ${esc(c?c+', ':'')}${esc(n)} ↗</a><small>Opens Broadcastify's own site${c?' (state directory, then pick '+esc(c)+')':''}</small></li>`;
async function guard(ul,fn){ul.innerHTML='<li><small>loading scanner directory…</small></li>';
 try{await init();fn()}catch(e){ul.innerHTML=`<li class="err-box">Scanner directory failed to load (${esc(e.message)}).<br><button>↻ RETRY</button></li>`;ul.querySelector('button').onclick=()=>guard(ul,fn)}}
const showStates=(ul,fly)=>guard(ul,()=>{ul.innerHTML='<li><small>SCANNERS › pick a state</small></li>'+Object.keys(C).sort().map(n=>`<li data-state="${esc(n)}"><b>${esc(n)}</b><small>${C[n].c.length} counties · 1 Broadcastify directory${offFor(n).length?' · ★ '+offFor(n).length+' official':''}</small></li>`).join('');
 ul.querySelectorAll('[data-state]').forEach(li=>li.onclick=()=>showState(ul,li.dataset.state,fly))});
const showState=(ul,n,fly)=>guard(ul,()=>{if(!C[n])return showStates(ul,fly);fly&&fly(n);ul.innerHTML=`<li data-back><small>‹ ALL STATES</small></li>`+bcRow(n)+offRows(offFor(n))+
 C[n].c.map((c,i)=>`<li data-i="${i}"><b>${esc(c[0])}</b><small>${offFor(n,c[0]).length?'★ '+offFor(n,c[0]).length+' official · ':''}Broadcastify link ›</small></li>`).join('');
 ul.querySelector('[data-back]').onclick=()=>showStates(ul,fly);ul.querySelectorAll('[data-i]').forEach(li=>li.onclick=()=>showCounty(ul,n,+li.dataset.i,fly))});
const showCounty=(ul,n,i,fly)=>guard(ul,()=>{const c=C[n].c[i];window.EYEMONT_MAP&&window.EYEMONT_MAP.flyTo([c[1],c[2]],9);
 ul.innerHTML=`<li data-back><small>‹ ${esc(n.toUpperCase())}</small></li><li><b>${esc(c[0])}, ${esc(C[n].abbr)}</b></li>`+offRows(offFor(n,c[0]))+bcRow(n,c[0])+
 `<li><a target=_blank rel=noopener href="https://www.radioreference.com/db/browse/stid/${C[n].fips}">RadioReference frequency DB ↗</a></li>`;
 ul.querySelector('[data-back]').onclick=()=>showState(ul,n,fly)});
function items(region){if(!C)return[];const off=OFF.map(o=>({lat:o.lat,lon:o.lon,r:8,title:'★ '+o.title,sub:o.note,popup:`<b>${esc(o.title)}</b><br>${esc(o.note)}<br><a target=_blank rel=noopener href="${esc(o.url)}">Open official stream ↗</a>`}));
 if(region==='World')return off.concat(Object.entries(C).map(([n,s])=>{const a=s.c.reduce((p,c)=>[p[0]+c[1],p[1]+c[2]],[0,0]);return {lat:a[0]/s.c.length,lon:a[1]/s.c.length,r:6,title:n,sub:`${s.c.length} counties${offFor(n).length?' · ★ '+offFor(n).length+' official':''} ›`,state:n}}));
 const s=C[region];return s?off.concat(s.c.map((c,i)=>({lat:c[1],lon:c[2],r:4,title:c[0],sub:`${region}${offFor(region,c[0]).length?' · ★ official':''} ›`,state:region,county:i}))):off}
return {init,items,showStates,showState,showCounty};
})();
// Docked mini player. Plays only streams we're clearly allowed to play directly (today: Caltrans public HLS cams, video-only).
// Lock-screen / Media Session controls are registered ONLY for streams flagged audio:true, and cleared on close.
window.Player=(()=>{const bar=document.getElementById('player'),v=document.getElementById('pvid'),t=document.getElementById('ptxt'),tg=document.getElementById('ptoggle');let hls;
const ms='mediaSession' in navigator?navigator.mediaSession:null;
function clearMS(){if(!ms)return;ms.metadata=null;['play','pause','stop'].forEach(a=>{try{ms.setActionHandler(a,null)}catch(e){}});ms.playbackState='none'}
function stop(){v.pause();if(hls){hls.destroy();hls=null}v.removeAttribute('src');v.load();clearMS();bar.hidden=true;document.body.classList.remove('playing');setTimeout(()=>window.EYEMONT_MAP&&EYEMONT_MAP.invalidateSize(),50)}
function play({src,title,artist,art,audio=false}){bar.hidden=false;document.body.classList.add('playing');setTimeout(()=>window.EYEMONT_MAP&&EYEMONT_MAP.invalidateSize(),50);
 t.textContent=title+(audio?'':' · video only');if(hls){hls.destroy();hls=null}
 v.muted=!audio;
 if(v.canPlayType('application/vnd.apple.mpegurl'))v.src=src;else if(window.Hls&&Hls.isSupported()){hls=new Hls();hls.loadSource(src);hls.attachMedia(v);hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)t.textContent=title+' · stream error'})}else{t.textContent='HLS unsupported on this browser';return}
 v.play().catch(()=>t.textContent=title+' · tap ▶');
 clearMS();
 if(ms&&audio){ms.metadata=new MediaMetadata({title,artist,album:'EYEMONT',artwork:art?[{src:art,sizes:'320x240',type:'image/jpeg'}]:[]});
  ms.setActionHandler('play',()=>v.play());ms.setActionHandler('pause',()=>v.pause());try{ms.setActionHandler('stop',stop)}catch(e){}}}
tg.onclick=()=>v.paused?v.play():v.pause();document.getElementById('pstop').onclick=stop;
v.onplay=()=>{tg.textContent='❚❚';if(ms&&ms.metadata)ms.playbackState='playing'};v.onpause=()=>{tg.textContent='▶';if(ms&&ms.metadata)ms.playbackState='paused'};
return {play,stop}})();
