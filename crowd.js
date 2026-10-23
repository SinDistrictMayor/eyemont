// CROWD: public posts placed ONLY by a place name stated in the text (city/state gazetteer), never by user location.
// Pins = places (no names/handles). Author shown only inside the card, with a link to the original.
window.Crowd=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let PL=null,RX=null;
const HID=new Set(JSON.parse(localStorage.getItem('eyemont.hidden')||'[]'));
const hide=id=>{HID.add(id);localStorage.setItem('eyemont.hidden',JSON.stringify([...HID].slice(-2000)))};
// Client-side moderation: drop posts that look like doxxing / personal info.
const DOX=[/\b\d{3}[-.\s)]\s?\d{3}[-.\s]\d{4}\b/, /[\w.+-]+@[\w-]+\.[\w.]+/, /\b\d{3}-\d{2}-\d{4}\b/,
 /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl)\b/,
 /\b(home address|lives at|her address|his address|their address|dox|doxx|license plate|plate number|ssn|social security)\b/i];
const unsafe=t=>DOX.some(r=>r.test(t));
async function places(){if(PL)return;const r=await fetch('data/places.json');if(!r.ok)throw Error('places HTTP '+r.status);PL=await r.json();
 const names=PL.map(p=>p[0]).sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 RX=new RegExp('(?:^|[^\\p{L}])('+names.join('|')+')(?![\\p{L}])','u')}
const placeOf=t=>{const m=RX.exec(t);if(!m)return null;return PL.find(p=>p[0]===m[1])};
const BSKY_Q=['earthquake','wildfire','flooding','tornado','protest','power outage','evacuation','breaking news'];
const MASTO_TAGS=['breakingnews','earthquake','wildfire','flood','protest','news','storm'];
async function bsky(){const out=[];await Promise.all(BSKY_Q.map(async q=>{try{const r=await fetch(`https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=latest&limit=40`);if(!r.ok)return;
 (await r.json()).posts.forEach(p=>{const id=p.uri.split('/').pop();out.push({id:'bsky:'+p.uri,src:'Bluesky',text:p.record?.text||'',time:p.record?.createdAt||p.indexedAt,
  who:'@'+p.author.handle,url:`https://bsky.app/profile/${p.author.handle}/post/${id}`})})}catch(e){}}));return out}
const strip=h=>{const d=document.createElement('div');d.innerHTML=h;return d.textContent};
async function masto(){const out=[];await Promise.all(MASTO_TAGS.map(async t=>{try{const r=await fetch(`https://mastodon.social/api/v1/timelines/tag/${t}?limit=40`);if(!r.ok)return;
 (await r.json()).forEach(s=>{if(s.visibility!=='public'||s.sensitive)return;out.push({id:'masto:'+s.uri,src:'Mastodon',text:strip(s.content),time:s.created_at,who:'@'+s.account.acct,url:s.url})})}catch(e){}}));return out}
async function load(){await places();const all=[...await bsky(),...await masto()];const seen=new Set(),by={};let n=0,drop=0;
 for(const p of all){if(seen.has(p.id)||HID.has(p.id))continue;seen.add(p.id);if(unsafe(p.text)){drop++;continue}
  const pl=placeOf(p.text);if(!pl)continue;n++;(by[pl[0]]||(by[pl[0]]={place:pl,posts:[]})).posts.push(p)}
 if(!all.length)throw Error('Bluesky and Mastodon both unreachable');
 return {groups:Object.values(by),stats:{fetched:all.length,placed:n,filtered:drop}}}
function card(g){return `<b>📍 ${esc(g.place[0])}</b> <small>${esc(g.place[3])} · ${g.posts.length} post(s) mentioning this place</small>`+
 g.posts.sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,15).map(p=>`<div class="post" data-id="${esc(p.id)}"><p>${esc(p.text.slice(0,300))}</p><small>${esc(p.src)} · ${esc(p.who)} · ${new Date(p.time).toLocaleString()}</small><br><a target=_blank rel=noopener href="${esc(p.url)}">open original ↗</a> · <a target=_blank rel=noopener href="${esc(p.url)}" title="Report on the original platform">report ↗</a> · <button class="hide" data-id="${esc(p.id)}">hide</button></div>`).join('')}
document.addEventListener('click',e=>{const b=e.target.closest('button.hide');if(!b)return;hide(b.dataset.id);const d=b.closest('.post');if(d)d.remove()});
return {load,card,unsafe,hide,isHidden:id=>HID.has(id)};
})();

// REPORTS over Nostr public relays: NIP-01 kind:1 events tagged t=eyemont + g=<geohash 5 chars ≈ 5 km>. Ephemeral key per browser.
window.Reports=(()=>{
const RELAYS=['wss://relay.damus.io','wss://nos.lol','wss://relay.primal.net'];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const CATS=['fire','flood','storm','traffic','outage','protest','police/fire activity','other'];
const B32='0123456789bcdefghjkmnpqrstuvwxyz';
function gh(lat,lon,p=5){let la=[-90,90],lo=[-180,180],h='',bit=0,ch=0,even=true;while(h.length<p){const r=even?lo:la,v=even?lon:lat,m=(r[0]+r[1])/2;if(v>m){ch|=16>>bit;r[0]=m}else r[1]=m;even=!even;if(bit<4)bit++;else{h+=B32[ch];bit=0;ch=0}}return h}
function ungh(h){let la=[-90,90],lo=[-180,180],even=true;for(const c of h){const d=B32.indexOf(c);for(let b=4;b>=0;b--){const r=even?lo:la,m=(r[0]+r[1])/2;if(d>>b&1)r[0]=m;else r[1]=m;even=!even}}return [(la[0]+la[1])/2,(lo[0]+lo[1])/2]}
function key(){let k=localStorage.getItem('eyemont.nsec');if(!k){k=NostrTools.utils?NostrTools.utils.bytesToHex(NostrTools.generateSecretKey()):[...NostrTools.generateSecretKey()].map(b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('eyemont.nsec',k)}
 return Uint8Array.from(k.match(/../g).map(h=>parseInt(h,16)))}
function load(){return new Promise((res,rej)=>{if(!window.NostrTools)return rej(Error('nostr lib not loaded'));const ev=new Map();let open=0,done=0;
 const fin=()=>res([...ev.values()]);const to=setTimeout(fin,6000);
 RELAYS.forEach(u=>{let ws;try{ws=new WebSocket(u)}catch(e){return}
  ws.onopen=()=>{open++;ws.send(JSON.stringify(['REQ','eye',{kinds:[1],'#t':['eyemont'],limit:300}]))};
  ws.onmessage=m=>{const d=JSON.parse(m.data);if(d[0]==='EVENT'){const e=d[2];try{if(NostrTools.verifyEvent(e))ev.set(e.id,e)}catch(x){}}
   if(d[0]==='EOSE'){ws.close();if(++done===RELAYS.length){clearTimeout(to);fin()}}};
  ws.onerror=()=>{if(++done===RELAYS.length){clearTimeout(to);open?fin():rej(Error('no relay reachable'))}}})})}
function items(evs){return evs.filter(e=>!Crowd.isHidden('nostr:'+e.id)&&!Crowd.unsafe(e.content)).map(e=>{const g=(e.tags.find(t=>t[0]==='g')||[])[1];if(!g||g.length<4)return null;
 const [lat,lon]=ungh(g.slice(0,5));const cat=(e.tags.find(t=>t[0]==='category')||[])[1]||'other';
 return {lat,lon,r:7,title:`[${cat}] ${e.content.slice(0,60)}`,sub:new Date(e.created_at*1000).toLocaleString()+' · ~5 km area',
  popup:`<b>[${esc(cat)}]</b> <small>community report · ~5 km precision</small><div class="post"><p>${esc(e.content)}</p><small>${new Date(e.created_at*1000).toLocaleString()} · Nostr ${esc(e.pubkey.slice(0,8))}…</small><br><button class="hide" data-id="nostr:${esc(e.id)}">hide</button></div>`}}).filter(Boolean)}
async function publish(cat,text,lat,lon){if(Crowd.unsafe(text))throw Error('Looks like personal info (phone/email/address). Not posted.');
 text=text.trim().slice(0,280);if(text.length<5)throw Error('Too short');
 const ev=NostrTools.finalizeEvent({kind:1,created_at:Math.floor(Date.now()/1000),tags:[['t','eyemont'],['g',gh(lat,lon,5)],['category',cat],['client','eyemont']],content:text},key());
 let ok=0;await Promise.all(RELAYS.map(u=>new Promise(r=>{try{const ws=new WebSocket(u);const t=setTimeout(()=>{ws.close();r()},6000);
  ws.onopen=()=>ws.send(JSON.stringify(['EVENT',ev]));ws.onmessage=m=>{const d=JSON.parse(m.data);if(d[0]==='OK'){if(d[2])ok++;clearTimeout(t);ws.close();r()}};ws.onerror=()=>{clearTimeout(t);r()}}catch(e){r()}})));
 if(!ok)throw Error('No relay accepted the report');return ok}
return {load,items,publish,CATS,gh}})();
