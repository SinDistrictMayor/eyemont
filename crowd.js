// CROWD: public posts placed ONLY by a place name stated in the text (city/state gazetteer), never by user location.
// Pins = places (no names/handles). Author shown only inside the card, with a link to the original.
window.Crowd=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let PL=null,RX=null;
const HID=new Set(JSON.parse(localStorage.getItem('eyemont.hidden')||'[]'));
const hide=id=>{HID.add(id);localStorage.setItem('eyemont.hidden',JSON.stringify([...HID].slice(-2000)))};
const HS=new Set(JSON.parse(localStorage.getItem('eyemont.hiddenSrc')||'[]'));
const hideSrc=k=>{HS.add(k);localStorage.setItem('eyemont.hiddenSrc',JSON.stringify([...HS].slice(-2000)))};
// Client-side moderation: drop posts that look like doxxing / personal info. Runs on DISPLAY (crowd + reports) and on submit.
const DOX=[
 /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
 /\b\d{10,11}\b/,
 /[\w.+-]+@[\w-]+\.[\w.]+/,
 /\b[\w.+-]{2,}\s*[\[(<{]?\s*(?:at|@)\s*[\])>}]?\s*[\w-]{2,}\s*[\[(<{]?\s*(?:dot|\.)\s*[\])>}]?\s*(?:com|net|org|edu|gov|io|co|us|me|info)\b/i,
 /\b\d{3}-\d{2}-\d{4}\b/,
 /\b\d{1,6}\s+(?:[nsew]\.?\s+)?(?:[a-z0-9]+\s){1,3}(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place|ter|terrace|cir|circle|pkwy|hwy|trl|trail)\b\.?/i,
 /\b(?:plate|plates|tag|lic(?:ense|ence)?)\s*(?:#|no\.?|number)?\s*:?\s*[A-Z0-9]{2,4}[\s-]?[A-Z0-9]{2,4}\b/i,
 /\b(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])(?:[A-Z]{3}[\s-]?\d{3,4}|\d[A-Z]{3}\d{3}|[A-Z]{2}\d{2}[\s-]?[A-Z]{3}|\d{3}[\s-]?[A-Z]{3})\b/,
 /\b(home address|lives at|living at|her address|his address|their address|dox|doxx|doxxing|license plate|plate number|ssn|social security|my name is|his name is|her name is|their name is)\b/i];
const unsafe=t=>DOX.some(r=>r.test(t));
// Reports are stricter: a capitalized "First Last" pair counts as a person's name unless it is a known place or a common noun phrase.
const OKW=new Set('Street St Road Rd Avenue Ave Boulevard Highway Hwy Interstate Route County City Town Park River Creek Lake Bay Beach Bridge Valley Mountain Mount Hill Hills Fire Police Department Station Airport School University College Hospital Center Centre Mall Downtown North South East West New Saint San Santa Los Las Fort Port Power Outage Traffic Heavy Smoke Flood Flooding Storm Tornado Warning Watch Alert Emergency Red Cross National Guard Weather Service Main Market Square Plaza Harbor Island Coast State Federal The This There Huge Big Large Massive Major Many Several Closed Closure Accident Crash Protest March Rally Near Just Now Breaking Update Live Water Gas Wind Rain Snow Ice Hail'.split(' '));
const NAME=/\b([A-Z][a-z]{1,15})\s+([A-Z][a-z]{1,20})\b/g;
const FIRST=new Set('james john robert michael william david richard joseph thomas charles christopher daniel matthew anthony mark donald steven paul andrew joshua kenneth kevin brian george timothy ronald edward jason jeffrey ryan jacob gary nicholas eric jonathan stephen larry justin scott brandon benjamin samuel gregory alexander frank patrick raymond jack dennis jerry tyler aaron jose adam nathan henry douglas zachary peter kyle noah ethan jeremy walter christian keith roger terry austin sean gerald carl harold dylan arthur lawrence jordan jesse bryan billy bruce gabriel joe logan albert willie alan eugene russell vincent philip bobby johnny bradley roy ralph randy wayne louis mike chris dave steve tom tony bob jim bill dan matt nick josh mary patricia jennifer linda elizabeth barbara susan jessica sarah karen lisa nancy betty sandra margaret ashley kimberly emily donna michelle carol amanda melissa deborah stephanie dorothy rebecca sharon laura cynthia amy kathleen angela shirley brenda emma anna pamela nicole samantha katherine christine helen debra rachel carolyn janet maria catherine heather diane olivia julie joyce victoria ruth virginia lauren kelly christina joan evelyn judith andrea hannah megan cheryl jacqueline martha madison teresa gloria sara janice ann kathryn abigail sophia frances jean alice judy isabella julia grace amber denise danielle marilyn beverly charlotte natalie theresa diana brittany doris kayla alexis lori marie jen liz kate sue kim jess becky ana luis carlos juan miguel jorge pedro sofia lucia mohammed muhammad ahmed ali omar fatima wei li'.split(' '));
const nameCI=t=>{const w=t.toLowerCase().match(/[a-z']+/g)||[];for(let i=0;i<w.length-1;i++)if(FIRST.has(w[i])&&w[i+1].length>1&&!OKW.has(w[i+1][0].toUpperCase()+w[i+1].slice(1)))return true;return false};
const unsafeReport=t=>{if(unsafe(t)||nameCI(t))return true;for(const m of t.matchAll(NAME)){if(OKW.has(m[1])||OKW.has(m[2]))continue;if(PL&&PL.some(p=>p[0]===m[0]))continue;return true}return false};

async function places(){if(PL)return;const r=await fetch('data/places.json');if(!r.ok)throw Error('places HTTP '+r.status);PL=await r.json();
 const names=PL.map(p=>p[0]).sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 RX=new RegExp('(?:^|[^\\p{L}])('+names.join('|')+')(?![\\p{L}])','gu')}
const YR=new Date().getFullYear();
const OLDW=/\b(?:years? ago|on this day|anniversary|#otd|throwback|#tbt)\b/i;
const OLD={test:t=>OLDW.test(t)||(t.match(/\b(?:18|19|20)\d\d\b/g)||[]).some(y=>+y<YR&&+y>=1800)};
const unquote=t=>t.replace(/"[^"\n]{1,120}"|“[^”\n]{1,120}”|‘[^’\n]{1,120}’|«[^»\n]{1,120}»/g,' ').replace(/\b[A-Z][a-z]+(?: [A-Z][a-z]+)?\s+(?:Avenue|Ave|Street|St|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Highway|Hwy|Parkway|Pkwy|Turnpike)\b\.?/g,' '); // street names ('West Virginia Avenue') are not places
// Ambiguous names (many towns share them) need a US state or 2-letter code elsewhere in the post. Longest names are tried first, so "New Mexico" wins over "Mexico".
const AMB=new Set(['Glendale','Aurora','Springfield','Portland','Columbus','Jackson','Richmond','Arlington','Kansas City','Salem','Franklin','Madison','Lincoln','Austin','Phoenix','Mesa','Riverside','Durham','Birmingham','Charleston','Wilmington','Columbia','Cambridge','Manchester','Peoria','Pasadena','Independence','Concord','Athens','Florence','Vancouver','Bristol','Dayton','Augusta','Lafayette','Rochester','Kingston','Valencia','Cordoba','Mobile','Reading','Orange','Buffalo','Hamilton','Victoria','Georgia','Washington','Jordan','Santiago','Plano','Garland','Irving','Henderson','Fresno','Omaha','Tulsa','Toledo','Albany','Louisville','Memphis','Nashville','Cleveland','Moscow','Delhi','Dublin','Lima','Troy','Paris','London']);
let STRX=null;const states=()=>STRX||(STRX=new RegExp('(?:\\b(?:'+PL.filter(p=>p[3]==='United States'&&!AMB.has(p[0])).map(p=>p[0]).join('|')+')\\b|\\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\\b)'));
const placeOf=t=>{const u=unquote(t);RX.lastIndex=0;for(const m of u.matchAll(RX)){const p=PL.find(p=>p[0]===m[1]);if(!p)continue;if(AMB.has(p[0])){const rest=u.slice(0,m.index)+' '+u.slice(m.index+m[0].length),sm=rest.match(states());if(!sm)continue;/* ambiguous city + a named state: we have no small-town gazetteer client-side, so pin the named state (coarse but never the wrong city) */const st=PL.find(q=>q[0]===sm[0]&&q[3]==='United States');return st||null}return p}return null};

const BSKY_Q=['earthquake','wildfire','flooding','tornado','protest','power outage','evacuation','breaking news'];
const MASTO_TAGS=['breakingnews','earthquake','wildfire','flood','protest','news','storm'];
async function bsky(){const out=[];await Promise.all(BSKY_Q.map(async q=>{try{const r=await fetch(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=latest&limit=40`);if(!r.ok)return;
 (await r.json()).posts.forEach(p=>{const id=p.uri.split('/').pop();out.push({id:'bsky:'+p.uri,src:'Bluesky',text:p.record?.text||'',time:p.record?.createdAt||p.indexedAt,
  who:'@'+p.author.handle,url:`https://bsky.app/profile/${p.author.handle}/post/${id}`})})}catch(e){}}));return out}
const strip=h=>{const d=document.createElement('div');d.innerHTML=h;return d.textContent};
async function masto(){const out=[];await Promise.all(MASTO_TAGS.map(async t=>{try{const r=await fetch(`https://mastodon.social/api/v1/timelines/tag/${t}?limit=40`);if(!r.ok)return;
 (await r.json()).forEach(s=>{if(s.visibility!=='public'||s.sensitive)return;out.push({id:'masto:'+s.uri,src:'Mastodon',text:strip(s.content),time:s.created_at,who:'@'+s.account.acct,url:s.url})})}catch(e){}}));return out}
async function load(){await places();const all=[...await bsky(),...await masto()];const seen=new Set(),by={};let n=0,drop=0;
 const cut=Date.now()-864e5;let old=0;
 for(const p of all){if(seen.has(p.id)||HID.has(p.id)||HS.has(p.who))continue;if(!(new Date(p.time)>cut)||OLD.test(p.text)){old++;seen.add(p.id);continue}seen.add(p.id);if(unsafe(p.text)){drop++;continue}
  const pl=placeOf(p.text);if(!pl)continue;n++;(by[pl[0]]||(by[pl[0]]={place:pl,posts:[]})).posts.push(p)}
 if(!all.length)throw Error('Bluesky and Mastodon both unreachable');
 return {groups:Object.values(by),stats:{fetched:all.length,placed:n,filtered:drop,old}}}
function card(g){return `<b>📍 ${esc(g.place[0])}</b> <small>${esc(g.place[3])} · ${g.posts.length} post(s) mentioning this place</small>`+
 g.posts.sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,15).map(p=>`<div class="post" data-id="${esc(p.id)}"><p>${esc(scrub(p.text).slice(0,300))}</p><small>${esc(p.src)} · ${esc(p.who)} · ${new Date(p.time).toLocaleString()}</small><br><a target=_blank rel=noopener href="${esc(p.url)}">open original ↗</a> · <a target=_blank rel=noopener href="${esc(p.url)}" title="Report on the original platform">report ↗</a> · <button class="hide" data-id="${esc(p.id)}">hide</button> <button class="hide" data-src="${esc(p.who)}">hide all from ${esc(p.src)} ${esc(p.who)}</button></div>`).join('')}
document.addEventListener('click',e=>{const b=e.target.closest('button.hide');if(!b)return;
 if(b.dataset.src){if(!confirm('Hide everything from '+b.dataset.src+' on this device?'))return;hideSrc(b.dataset.src);document.querySelectorAll('button.hide[data-src]').forEach(x=>{if(x.dataset.src===b.dataset.src)x.closest('.post')?.remove()});window.dispatchEvent(new Event('eyemont:hidden'));return}
 hide(b.dataset.id);const d=b.closest('.post');if(d)d.remove()});
const scrub=t=>String(t??'').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'[email removed]').replace(/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,'[phone removed]');
return {scrub,place:async t=>{await places();return placeOf(t)},load,card,unsafe,unsafeReport,nameCI,hide,hideSrc,isHidden:id=>HID.has(id),srcHidden:k=>HS.has(k)};
})();

// REPORTS over Nostr public relays. Unmoderated + public, so the client enforces (see ARCHITECTURE.md "Reports moderation"):
// exact tags t=eyemont & client=eyemont, kind 1, category from CATS, 5..280 chars, geohash 3..5 chars, last 24 h,
// strict personal-info filter on display, NIP-56 kind-1984 flags: >=2 distinct flagging keys hides a report.
window.Reports=(()=>{
const RELAYS=['wss://relay.damus.io','wss://nos.lol','wss://relay.primal.net'];
const TAG='eyemont',DAY=86400,FLAG_LIMIT=3,POW=20;
// NIP-13: leading zero bits of the event id, and the committed target in the nonce tag must both be >= POW.
const lzb=id=>{let n=0;for(const c of id){const v=parseInt(c,16);if(v===0){n+=4;continue}return n+Math.clz32(v)-28}return n};
const powOK=e=>{const nt=e.tags.find(t=>t[0]==='nonce');return !!nt&&+nt[2]>=POW&&lzb(e.id)>=POW};
// mine in a web worker; onp(fraction) reports progress
async function mine(tpl,onp){const N=await lib();const sk=await key();const pk=N.getPublicKey(sk);tpl.tags=[...tpl.tags,['nonce','\u0000',String(POW)]];
 const s=JSON.stringify([0,pk,tpl.created_at,tpl.kind,tpl.tags,tpl.content]);const [pre,post]=s.split('\\u0000');
 const nonce=await new Promise((res,rej)=>{const w=new Worker('pow-worker.js');w.onmessage=m=>{if(m.data.done){w.terminate();res(m.data.nonce)}else onp&&onp(Math.min(.99,1-Math.exp(-m.data.n/m.data.expect)))};w.onerror=e=>{w.terminate();rej(Error('proof-of-work worker failed'))};w.postMessage({pre,post,bits:POW})});
 tpl.tags[tpl.tags.length-1][1]=nonce;const ev=N.finalizeEvent(tpl,sk);if(!powOK(ev))throw Error('proof-of-work check failed');onp&&onp(1);return ev}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const CATS=['fire','flood','storm','traffic','outage','protest','police/fire activity','other'];
const B32='0123456789bcdefghjkmnpqrstuvwxyz';
function gh(lat,lon,p=5){let la=[-90,90],lo=[-180,180],h='',bit=0,ch=0,even=true;while(h.length<p){const r=even?lo:la,v=even?lon:lat,m=(r[0]+r[1])/2;if(v>m){ch|=16>>bit;r[0]=m}else r[1]=m;even=!even;if(bit<4)bit++;else{h+=B32[ch];bit=0;ch=0}}return h}
function ungh(h){let la=[-90,90],lo=[-180,180],even=true;for(const c of h){const d=B32.indexOf(c);for(let b=4;b>=0;b--){const r=even?lo:la,m=(r[0]+r[1])/2;if(d>>b&1)r[0]=m;else r[1]=m;even=!even}}return [(la[0]+la[1])/2,(lo[0]+lo[1])/2]}
// nostr-tools is lazy-loaded the first time reports are used.
let libP=null;
function lib(){return libP||(libP=new Promise((res,rej)=>{if(window.NostrTools)return res(window.NostrTools);const sc=document.createElement('script');
 sc.src='https://cdn.jsdelivr.net/npm/nostr-tools@2.7.2/lib/nostr.bundle.js';sc.onload=()=>window.NostrTools?res(window.NostrTools):rej(Error('nostr lib missing'));
 sc.onerror=()=>{libP=null;rej(Error('could not load nostr lib'))};document.head.appendChild(sc)}))}
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
const unhex=h=>Uint8Array.from(h.match(/../g).map(x=>parseInt(x,16)));
// Identity: random key kept in localStorage 'eyemont.nsec' (this device only, never uploaded). "New identity" replaces it.
async function key(){const N=await lib();let k=localStorage.getItem('eyemont.nsec');if(!k||!/^[0-9a-f]{64}$/.test(k)){k=hex(N.generateSecretKey());localStorage.setItem('eyemont.nsec',k)}return unhex(k)}
async function pubkey(){const N=await lib();return N.getPublicKey(await key())}
function newIdentity(){localStorage.removeItem('eyemont.nsec')}
// relay status chip
const RS={};RELAYS.forEach(u=>RS[u]='idle');
const setRS=(u,v)=>{RS[u]=v;window.dispatchEvent(new CustomEvent('eyemont:relays',{detail:{...RS}}))};
function status(){return {...RS}}
function query(filters,ms=6000){return new Promise(res=>{const ev=new Map();mockQuery(filters).forEach(e=>ev.set(e.id,e));let done=0;const fin=()=>res([...ev.values()]);const to=setTimeout(fin,ms);
 const end=()=>{if(++done===RELAYS.length){clearTimeout(to);fin()}};
 RELAYS.forEach(u=>{let ws;setRS(u,'connecting');try{ws=new WebSocket(u)}catch(e){setRS(u,'down');return end()}let fin1=false;const f1=()=>{if(!fin1){fin1=true;end()}};
  ws.onopen=()=>{setRS(u,'up');ws.send(JSON.stringify(['REQ','eye',...filters]))};
  ws.onmessage=m=>{let d;try{d=JSON.parse(m.data)}catch(x){return}if(d[0]==='EVENT'&&d[2]&&!ev.has(d[2].id)){try{if(window.NostrTools.verifyEvent(d[2]))ev.set(d[2].id,d[2])}catch(x){}}
   if(d[0]==='EOSE'){try{ws.close()}catch(x){}f1()}};
  ws.onerror=()=>{setRS(u,'down');f1()};ws.onclose=()=>f1()})})}
const tag=(e,n)=>e.tags.filter(t=>t[0]===n).map(t=>t[1]);
function valid(e,now=Date.now()/1000){if(e.kind!==1||typeof e.content!=='string')return false;
 const t=tag(e,'t'),c=tag(e,'client'),cat=tag(e,'category'),g=tag(e,'g');
 if(!t.includes(TAG)||c.length!==1||c[0]!==TAG||cat.length!==1||!CATS.includes(cat[0])||g.length!==1)return false;
 if(!/^[0-9b-hjkmnp-z]{3,5}$/.test(g[0]))return false;
 const L=[...e.content].length;if(L<5||L>280)return false;
 if(e.created_at<now-DAY||e.created_at>now+600)return false;return powOK(e)}
let last={raw:0,valid:0,flagged:0,unsafe:0};
async function load(){await lib();const since=Math.floor(Date.now()/1000)-DAY;
 const evs=await query([{kinds:[1],'#t':[TAG],since,limit:500}]);
 if(Object.values(RS).every(v=>v==='down'))throw Error('no relay reachable');
 const ok=evs.filter(e=>valid(e));
 const flags={};if(ok.length){const fl=await query([{kinds:[1984],'#e':ok.map(e=>e.id).slice(0,400),limit:2000}]);
  fl.filter(f=>f.kind===1984&&powOK(f)).forEach(f=>tag(f,'e').forEach(id=>(flags[id]||(flags[id]=new Set())).add(f.pubkey)))}
 ok.forEach(e=>e._flagged=!!(flags[e.id]&&flags[e.id].size>=FLAG_LIMIT));
 last={raw:evs.length,valid:ok.length,flagged:ok.filter(e=>e._flagged).length,unsafe:0};return ok}
function items(evs){return evs.filter(e=>{if(Crowd.isHidden('nostr:'+e.id)||Crowd.srcHidden('nostr:'+e.pubkey))return false;if(Crowd.unsafeReport(e.content)){last.unsafe++;return false}return true}).map(e=>{
 const g=tag(e,'g')[0];const [lat,lon]=ungh(g);const cat=tag(e,'category')[0];
 const txt=Crowd.scrub(e.content);if(e._flagged)return {lat,lon,r:5,flagged:true,title:`[${cat}] ⚑ flagged, tap to view`,sub:new Date(e.created_at*1000).toLocaleString()+' · hidden by 3+ community flags',
  popup:`<b>[${esc(cat)}]</b> <small>⚑ flagged by 3+ community members</small><details class="post"><summary>flagged, tap to view</summary><p>${esc(txt)}</p><small>${new Date(e.created_at*1000).toLocaleString()} · unmoderated</small></details>`};
 return {lat,lon,r:7,time:e.created_at*1000,src:'Nostr report',text:cat+' '+txt,mock:mockAll().some(x=>x.id===e.id),title:`[${cat}] ${txt.slice(0,60)}`,sub:new Date(e.created_at*1000).toLocaleString()+' · ~5 km area · unmoderated',
  popup:`<b>[${esc(cat)}]</b> <small>unmoderated community report · ~5 km precision · expires after 24 h</small><div class="post"><p>${esc(txt)}</p><small>${new Date(e.created_at*1000).toLocaleString()} · Nostr ${esc(e.pubkey.slice(0,8))}…</small><br><button class="hide" data-id="nostr:${esc(e.id)}">hide</button> <button class="hide" data-src="nostr:${esc(e.pubkey)}">hide all from this key</button> <button class="flag" data-id="${esc(e.id)}" data-pk="${esc(e.pubkey)}">⚑ flag</button></div>`}})}
// WRITES GO TO A MOCK RELAY ONLY (redesign branch rule: never publish to real relays without Evan's explicit approval).
// The mock keeps events in this tab's sessionStorage and answers ['OK',id,true] like a relay. Reads from real relays stay opt-in (REPORTS off by default).
const MOCK_WRITES=true;const MOCK='mock://eyemont-local';
const mockAll=()=>{try{return JSON.parse(sessionStorage.getItem('eyemont.mockRelay')||'[]')}catch(e){return[]}};
function mockPublish(ev){const a=mockAll().filter(x=>x.id!==ev.id);a.push(ev);sessionStorage.setItem('eyemont.mockRelay',JSON.stringify(a.slice(-200)));setRS(MOCK,'up');return Promise.resolve(1)}
const mockQuery=f=>mockAll().filter(e=>f.some(q=>(!q.kinds||q.kinds.includes(e.kind))&&(!q['#t']||e.tags.some(t=>t[0]==='t'&&q['#t'].includes(t[1])))&&(!q['#e']||e.tags.some(t=>t[0]==='e'&&q['#e'].includes(t[1])))&&(!q.since||e.created_at>=q.since)));
function publishEvent(ev){if(MOCK_WRITES)return mockPublish(ev);let ok=0;return Promise.all(RELAYS.map(u=>new Promise(r=>{try{setRS(u,'connecting');const ws=new WebSocket(u);const t=setTimeout(()=>{try{ws.close()}catch(x){}r()},6000);
  ws.onopen=()=>{setRS(u,'up');ws.send(JSON.stringify(['EVENT',ev]))};ws.onmessage=m=>{let d;try{d=JSON.parse(m.data)}catch(x){return}if(d[0]==='OK'&&d[1]===ev.id){if(d[2])ok++;clearTimeout(t);ws.close();r()}};ws.onerror=()=>{setRS(u,'down');clearTimeout(t);r()}}catch(e){setRS(u,'down');r()}}))).then(()=>ok)}
async function publish(cat,text,lat,lon,onp){text=text.trim();
 if(Crowd.unsafeReport(text))throw Error('Looks like personal info (name, phone, email, address or plate). Not posted.');
 if([...text].length>280)throw Error('Max 280 characters');if(text.length<5)throw Error('Too short');if(!CATS.includes(cat))throw Error('Pick a category');
 const ev=await mine({kind:1,created_at:Math.floor(Date.now()/1000),tags:[['t',TAG],['g',gh(lat,lon,5)],['category',cat],['client',TAG]],content:text},onp);
 if(!valid(ev))throw Error('Internal schema check failed');const ok=await publishEvent(ev);if(!ok)throw Error('No relay accepted the report');return ok}
// NIP-56 report (kind 1984) against a report event.
async function flag(id,pk,onp){if(!/^[0-9a-f]{64}$/.test(id)||!/^[0-9a-f]{64}$/.test(pk))throw Error('bad id');
 const ev=await mine({kind:1984,created_at:Math.floor(Date.now()/1000),tags:[['e',id,'other'],['p',pk],['t',TAG]],content:'eyemont community flag'},onp);
 return publishEvent(ev)}
document.addEventListener('click',async e=>{const b=e.target.closest('button.flag');if(!b)return;
 if(!confirm('Publish a public NIP-56 flag for this report? Reports with 3+ flags are collapsed for everyone using Eyemont. Your device must first compute a proof-of-work (can take 10–60 s).'))return;
 b.disabled=true;b.textContent='flagging…';try{const n=await flag(b.dataset.id,b.dataset.pk,p=>b.textContent=`computing proof-of-work ${Math.round(p*100)}%…`);Crowd.hide('nostr:'+b.dataset.id);b.textContent=`flagged (${n} relay)`;b.closest('.post')?.remove();window.dispatchEvent(new Event('eyemont:hidden'))}catch(x){b.textContent='flag failed';b.disabled=false}});
return {load,items,publish,flag,valid,powOK,POW,CATS,gh,lib,pubkey,newIdentity,status,stats:()=>last,RELAYS,MOCK_WRITES}})();
