// Scanners: browse State → County, OpenMHz systems playable in sticky player, Broadcastify via official links (no rehosting).
window.Scanners=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let COUNTIES={},SYSTEMS=null,sysErr=null;
const bcState=n=>`https://www.broadcastify.com/listen/stid/${COUNTIES[n].fips}`;
async function loadSystems(){if(SYSTEMS||sysErr)return;try{const r=await fetch('https://api.openmhz.com/systems');if(!r.ok)throw Error('HTTP '+r.status);
 const d=await r.json();SYSTEMS=(d.systems||d||[]).filter(s=>s.shortName)}catch(e){sysErr=e.message||'blocked'}}
const sysFor=(state,county)=>(SYSTEMS||[]).filter(s=>{const t=`${s.state||''} ${s.city||''} ${s.county||''} ${s.name||''} ${s.description||''}`.toLowerCase();
 const ab=COUNTIES[state].abbr.toLowerCase();return (s.state||'').toLowerCase()===ab||(s.state||'').toLowerCase()===state.toLowerCase()||t.includes(state.toLowerCase())?(!county||t.includes(county.replace(/ (County|Parish|Borough|Census Area|Municipality)$/,'').toLowerCase())):false});
/* ---- sticky player (OpenMHz call playlist) ---- */
const bar=document.getElementById('player'),au=document.getElementById('audio');let Q=[],sys=null,last=0,poll;
async function fetchCalls(){const u=`https://api.openmhz.com/${sys.shortName}/calls/newer?time=${last}`;
 try{const r=await fetch(last?u:`https://api.openmhz.com/${sys.shortName}/calls`);const d=await r.json();
  const calls=(d.calls||[]).sort((a,b)=>new Date(a.time)-new Date(b.time));
  calls.forEach(c=>{const t=+new Date(c.time);if(t>last){last=t;Q.push(c)}});if(!calls.length&&!Q.length)info('waiting for traffic…');
  if(au.paused&&Q.length)next()}catch(e){info('OpenMHz unavailable: '+(e.message||e))}}
function info(t){document.getElementById('ptxt').textContent=t}
function next(){const c=Q.shift();if(!c){return}const tg=c.talkgroupDescription||c.talkgroupNum||'talkgroup';
 au.src=c.url;au.play().catch(e=>info('tap ▶ to start ('+e.name+')'));
 info(`${sys.name} · ${tg} · ${new Date(c.time).toLocaleTimeString()}`);
 if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:String(tg),artist:sys.name,album:'EYEMONT // OpenMHz'});
  navigator.mediaSession.setActionHandler('nexttrack',next);navigator.mediaSession.setActionHandler('pause',()=>au.pause());navigator.mediaSession.setActionHandler('play',()=>au.play())}}
au.onended=()=>{Q.length?next():info(`${sys.name} · listening…`)};
function play(s){sys=s;Q=[];last=Date.now()-5*60e3;clearInterval(poll);bar.classList.add('on');info('tuning '+s.name+'…');fetchCalls();poll=setInterval(fetchCalls,10e3)}
document.getElementById('ptoggle').onclick=()=>au.paused?(au.src?au.play():next()):au.pause();
document.getElementById('pnext').onclick=next;
document.getElementById('pstop').onclick=()=>{clearInterval(poll);au.pause();au.removeAttribute('src');bar.classList.remove('on')};
au.onplay=()=>document.getElementById('ptoggle').textContent='❚❚';au.onpause=()=>document.getElementById('ptoggle').textContent='▶';
/* ---- browser UI (panel list) ---- */
function sysRows(list){return list.map(s=>`<li data-sys="${esc(s.shortName)}"><b>▶ ${esc(s.name)}</b><small>OpenMHz · ${esc(s.city||'')} ${esc(s.state||'')} — tap to play</small></li>`).join('')}
function bind(ul,flyTo){ul.querySelectorAll('[data-sys]').forEach(li=>li.onclick=()=>play(SYSTEMS.find(s=>s.shortName===li.dataset.sys)));
 ul.querySelectorAll('[data-county]').forEach(li=>li.onclick=()=>{const [st,i]=li.dataset.county.split('|');showCounty(ul,st,+i,flyTo)});
 ul.querySelectorAll('[data-state]').forEach(li=>li.onclick=()=>showState(ul,li.dataset.state,flyTo))}
const sysNote=()=>sysErr?`<li><small>OpenMHz directory unavailable in this browser (${esc(sysErr)}). Open <a target=_blank rel=noopener href="https://openmhz.com/systems">openmhz.com/systems</a>.</small></li>`:'';
async function showStates(ul,flyTo){await loadSystems();ul.innerHTML=`<li><small>SCANNERS › pick a state</small></li>`+Object.keys(COUNTIES).sort().map(n=>`<li data-state="${esc(n)}"><b>${esc(n)}</b><small>${COUNTIES[n].c.length} counties · ${sysFor(n).length} OpenMHz systems</small></li>`).join('');bind(ul,flyTo)}
async function showState(ul,n,flyTo){await loadSystems();flyTo&&flyTo(n);const st=COUNTIES[n];
 ul.innerHTML=`<li data-back><small>‹ ALL STATES</small></li><li><a target=_blank rel=noopener href="${bcState(n)}">📻 ${esc(n)} feeds on Broadcastify ↗</a></li>`+sysRows(sysFor(n))+sysNote()+
 st.c.map((c,i)=>`<li data-county="${esc(n)}|${i}"><b>${esc(c[0])}</b><small>${sysFor(n,c[0]).length} OpenMHz · Broadcastify ›</small></li>`).join('');
 ul.querySelector('[data-back]').onclick=()=>showStates(ul,flyTo);bind(ul,flyTo)}
function showCounty(ul,n,i,flyTo){const c=COUNTIES[n].c[i];window.EYEMONT_MAP&&window.EYEMONT_MAP.flyTo([c[1],c[2]],9);
 const q=encodeURIComponent(`${c[0]} ${COUNTIES[n].abbr}`);
 ul.innerHTML=`<li data-back><small>‹ ${esc(n.toUpperCase())}</small></li><li><b>${esc(c[0])}, ${esc(COUNTIES[n].abbr)}</b></li>`+sysRows(sysFor(n,c[0]))+sysNote()+
 `<li><a target=_blank rel=noopener href="${bcState(n)}">📻 Broadcastify: ${esc(n)} directory → ${esc(c[0])} ↗</a><small>Opens Broadcastify's official player (audio not rehosted)</small></li>`+
 `<li><a target=_blank rel=noopener href="https://www.radioreference.com/db/browse/stid/${COUNTIES[n].fips}">RadioReference frequency DB ↗</a></li>`;
 ul.querySelector('[data-back]').onclick=()=>showState(ul,n,flyTo);bind(ul,flyTo)}
/* ---- map layer items: county markers within selected state; state markers worldwide ---- */
function items(region){if(region==='World')return Object.entries(COUNTIES).map(([n,s])=>{const a=s.c.reduce((p,c)=>[p[0]+c[1],p[1]+c[2]],[0,0]);
  return {lat:a[0]/s.c.length,lon:a[1]/s.c.length,r:6,title:n,sub:`scanners · ${sysFor(n).length} OpenMHz`,state:n}});
 const s=COUNTIES[region];if(!s)return[];return s.c.map((c,i)=>({lat:c[1],lon:c[2],r:4,title:c[0],sub:`${region} scanners`,state:region,county:i}))}
return {init:async()=>{if(Object.keys(COUNTIES).length)return;COUNTIES=await (await fetch('data/counties.json')).json();loadSystems()},items,showStates,showState,showCounty,loadSystems,get sysErr(){return sysErr},get count(){return SYSTEMS?SYSTEMS.length:0}};
})();
