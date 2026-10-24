# Eyemont — Architecture

> **RULE #1 — Zero cost, now and ongoing.** No paid hosting, APIs, domains, subscriptions, trials that convert, or services that require a card on file. Only free tiers needing no payment details and free public sources. Anything not free is dropped. (Current stack: public GitHub repo + GitHub Pages + GitHub Actions on a public repo, all free; free public data feeds; OpenStreetMap tiles under the OSM tile usage policy, with attribution.)

Mobile-only, **fully static** single-page app on GitHub Pages. No runtime backend, no bot at runtime.
Leaflet + OpenStreetMap standard tiles (CSS-tinted green; CARTO now requires an API key, so it was dropped); Matrix digital-rain canvas behind a black/green monospace touch UI.

## Hard rules
- Only public, legally accessible, properly licensed sources; follow each source's terms and rate limits; show attribution.
- No private/unsecured cameras, credential-protected feeds, or encrypted radio.
- Scanner audio: **no embedding, rehosting or scraping**. Broadcastify and agency streams are reached through plain outbound links to their own pages.
- **Zero setup for Evan**: deploy only through the existing GitHub login to Pages. No new accounts or API keys; any source that needs one is skipped.
- If a feature can't work without a proxy, it is not built; the reason is documented here.

## Files
| File | Role |
|---|---|
| `index.html`, `style.css` | shell, rain canvas, layer buttons, feed panel, sticky audio player |
| `app.js` | map, region filter (World / US state bbox), layer plugin registry, feed panel |
| `scanners.js` | scanner browser (State → County), outbound links, sticky player (hls.js) + Media Session |
| `states-bbox.json` | US state bounding boxes |
| `data/counties.json` | 3,222 counties with centroids (US Census Gazetteer 2023, public domain) |
| `data/aircraft.json` | build-time aircraft snapshot (see CORS) |
| `.github/workflows/pages.yml` | deploy to Pages on push + every 15 min (refreshes snapshot) |

## Layer plugin contract (`LAYERS[]` in app.js)
```js
{ id, label, color, attribution, refresh /* ms, 0 = once */,
  async load() -> [{ lat, lon, title, sub, popup /* escaped HTML */, r?, geo? /* GeoJSON */, state?, county? }],
  note? /* status line text */ }
```
Core provides toggle buttons, polling, error state (red button + status line + auto-retry), region filtering, the feed panel (tap → flyTo + popup), and attribution. Adding a feed means appending one object. Later this can be split into `layers/*.js` modules.
`feed(name, directUrls)` contains an unused `API` hook (empty) so a proxy could be slotted in later **only with Evan's approval**.

## Scanners (first-class)
- **Browse**: use the 📻 button, or tap a state or county marker. Flow: States → State → County. Picking a state zooms the map, and picking a county flies to its centroid. Counties come from Census Gazetteer data, not from Broadcastify.
- **Broadcastify: outbound links only.** I checked the current Terms on 2026-10-23 (last updated July 22, 2026). §9(d) says any "redistribution, relay, rebroadcast, re-streaming, or embedding of Broadcastify live audio" needs a commercial license from bcfy.io, and §9(a)/(b) forbid automated access or scraping of feed metadata. So Eyemont embeds nothing and scrapes nothing. It links to `broadcastify.com/listen/stid/<state FIPS>`, Broadcastify's own state directory. County IDs are internal, so county rows deep-link to the state directory.
- **Official agency streams** (`data/official_streams.json`, ★): these are agency-published pages (Loudoun Co. VA, Deschutes Co. OR, Delta Twp MI). They open as outbound links because none of these agencies publishes terms that clearly allow third-party in-app playback.
- **OpenMHz**: skipped. It publishes no terms, and its API sits behind a Cloudflare bot challenge.
- **Docked mini player**: sits between the panel and the bottom bar, and the map and panel shrink to make room for it. It plays only streams we're clearly allowed to play directly. Today that means Caltrans public HLS cams, which are **video-only**, so the lock-screen controls are **not** registered for them. Media Session handlers (play, pause, stop) and metadata are registered only for streams flagged `audio:true` (`Player.play({src,title,artist,audio:true})`) and are cleared when the player closes. There is currently no permitted audio stream, so Eyemont does not claim lock-screen playback anywhere.
- **Limits that would need a proxy or license (not built)**: in-app Broadcastify audio needs a paid license, which breaks the zero-cost rule. OpenMHz in-app would need clear terms plus a way past the bot challenge.

## Cameras
`data/cams.json` holds 3,426 Caltrans CWWP2 cams: 2,191 with HLS live video and 1,235 with JPG snapshots, all sent with CORS `*`. Counties were re-derived from lat/lon by point-in-polygon against Census county shapes, which fixed 45 wrong county fields. The file is lazy-loaded only when the layer is toggled on. Markers use Leaflet.markercluster with chunked loading. Popups load the snapshot on open, and ▶ LIVE sends the HLS stream to the sticky player.

## CORS status (direct browser fetch)
| Feed | Source | CORS | License |
|---|---|---|---|
| Quakes | USGS all_day GeoJSON | `*` | public domain |
| Weather alerts | api.weather.gov | `*` | public domain |
| DOT cams | Caltrans CWWP2 (3,426, JPG + HLS) | `*` | Caltrans Conditions of Use |
| Aircraft | adsb.lol `/v2/lat/lon/dist` | **no CORS header** | ODbL |
| Scanners | Broadcastify / agency pages | n/a (links) | links only |

Aircraft is **snapshot-only**. The Pages build (GitHub Actions cron, every ~15 min) fetches a continental-US snapshot from adsb.lol with 3 retries. If that fails, it keeps the previously published snapshot, and if nothing exists yet the app shows "not available yet" and retries with backoff. The app never calls adsb.lol directly. `keepalive.yml` makes a tiny commit each month so GitHub doesn't auto-disable the schedule after 60 days of inactivity. Truly live worldwide aircraft would need a runtime proxy, which is out of scope.

## Future candidates (static-compatible unless noted)
- More DOT cams: only state 511 feeds that send CORS headers and allow public display (WSDOT, ODOT TripCheck, NY 511, etc. are mostly key-gated or CORS-blocked, so each needs review).
- AIS ships: free APIs need a key or websocket (AISStream), which means a backend item.
- Outages: IODA / Cloudflare Radar (check CORS), utility outage maps (terms review).
- Hazards: NASA FIRMS fires, GDACS, RainViewer radar tiles, NOAA nowCOAST WMS.
- News/weather streams: official public YouTube live embeds.
- **Possible backend (requires Evan's explicit approval, not planned)**: a small cached proxy for CORS-blocked or key-gated feeds.

## Roadmap
**M1 — Live map + scanners (this release)**
Quakes, NWS alerts, aircraft (live or snapshot), 3,426 clustered Caltrans cams with HLS, region filter, feed panel, scanner browser (State → County) with Broadcastify and official links, sticky player with Media Session.
*Accept*: URL returns 200 on a phone. Every layer loads or shows a graceful error. A state filter zooms and filters. Tapping a feed item flies to it. The scanner browser works by state and county from both the map and the list. Audio keeps playing while you pan and browse.

**M2 — Scanner polish**: favorites and recents in localStorage, "now playing" marker on the map, more verified official agency streams, and in-app playback for any agency whose terms clearly allow it.
*Accept*: a favorite opens in 1 tap; every added stream has a documented terms check.

**M3 — More cams**: ≥5 states of official DOT snapshot cams that are CORS-friendly and terms-compliant.
*Accept*: cams load in <3 s on 4G; every source has a documented terms check.

**M4 — Hazards & outages**: FIRMS, radar overlay, IODA outages.
*Accept*: each layer can be toggled, is attributed, and refreshes in ≤5 min.

**M5 — PWA**: installable, offline shell, saved regions.
*Accept*: Lighthouse PWA pass; home-screen launch on iOS and Android.

## UI / reliability notes (M1.1, from QA)
- Layout: fixed header, map, a docked mini player, and a bottom bar holding FEED plus horizontally scrolling layer chips. The panel is opaque and z-indexed above the map, markers and attribution. Zoom buttons are 44px at top-left; attribution sits at bottom-right above the bar.
- Retry: every layer retries with exponential backoff (5 s → 5 min max), including the static layers (cams, scanners). The scanner directory never caches a rejected promise and shows an error box with a RETRY button.
- Performance: cams.json loads only when the CA CAMS layer is first turned on. Only cams inside the current view (+25% padding) are drawn, clustered with chunked loading. The rain runs at about 20 fps at low opacity and pauses when the tab is hidden.
- Badges show real counts: items in the region, or in-view/total for cams. Pinch-zoom is allowed (no user-scalable=no).
- Tiles: OpenStreetMap standard tiles, used per the OSM Tile Usage Policy (attribution, browser Referer, no bulk prefetch, low volume). If traffic grows, a backup is needed: a free, no-key tile host with clear terms, or a self-hosted PMTiles file on Pages (more work).

## M2 — "The people's eye" (people first, government data second)
**CROWD** (`crowd.js`)
- Bluesky `api.bsky.app/xrpc/app.bsky.feed.searchPosts` works with no auth and CORS `*` (`public.api.bsky.app` returns 403 for search). It runs event keyword queries such as earthquake, wildfire, flooding and protest.
- Mastodon `mastodon.social/api/v1/timelines/tag/<tag>`: no auth, CORS `*`; only public, non-sensitive statuses are used.
- **Placement**: a post is pinned only if its text names a known place (Natural Earth cities over 400k people, plus US states). The pin sits at the place centroid, never at a user's location. Pins carry no names or handles. Authors appear only inside the card, with a link to the original.
- **Moderation**: a client-side filter drops posts containing phone numbers, emails, SSN patterns, street addresses or doxxing keywords. A "hide" button stores the post ID in localStorage, and "report ↗" opens the original post so it can be reported on its own platform.
- **Reports**: Nostr NIP-01 kind:1 events tagged `t=eyemont`, `g=<5-char geohash ≈ 5 km>` and `category`. They are signed with an ephemeral key generated in the browser (nostr-tools) and sent to damus, nos.lol and primal relays. Location is picked by tapping the map, never by GPS. Text is capped at 280 characters and passes through the doxx filter, and the form warns that reports are public and permanent.
- **Dropped**: Reddit (`/r/*.json` returns 403 and the Data API needs registration/OAuth), YouTube search (needs a key; replaced by curated official channel `/live` links in `data/live.json`).

**OPEN DATA**: USGS, NWS, adsb.lol snapshot, Caltrans, plus IEM NEXRAD radar tiles (replaced RainViewer), NASA EONET (open, CORS `*`) and GDACS (`geteventlist/SEARCH`, CORS `*`). GDELT: GEO 2.0 API returns 404 and DOC API has no coordinates (and 429s shared IPs), so `.github/gdelt_snapshot.py` reads the open GDELT 2.0 Events 15-min export (last 4 files, sequential, 2 s apart, 1 retry; falls back to the previous snapshot) in the Pages workflow, keeps conflict/protest/tension root codes (10-20), drops country-centroid geo, rounds to 0.01°, groups by place, max 600 → `data/gdelt.json`. Machine-coded; popups say so.

**M2.1 placement + moderation**: crowd ignores place names inside quotes, skips posts older than 24 h or mentioning a past year / "years ago" / "on this day"; each card has "hide all from this source" (handle or Nostr pubkey, localStorage `eyemont.hiddenSrc`, device-only).

## M2.2 Reports moderation (no backend)
Nostr REPORTS are **unmoderated and public**. With no server, all moderation is client-side and deterministic:
- **Off by default.** Turning the layer on the first time shows a one-time notice (unmoderated, public, may be false). The acknowledgement is stored in localStorage `eyemont.reportsAck`.
- **Strict schema.** An event is dropped unless it has kind 1, `t=eyemont`, exactly one `client=eyemont`, exactly one `category` from the app list (fire, flood, storm, traffic, outage, protest, police/fire activity, other), 5–280 characters, and exactly one `g` geohash of 3–5 characters (about 5 km or coarser). It must also have a valid signature (`verifyEvent`).
- **24 h expiry.** The relay query uses `since = now - 24h`, and the client drops anything older than 24 h or more than 10 min in the future.
- **Display-time personal-info filter** (`Crowd.unsafe` for crowd posts, the stricter `Crowd.unsafeReport` for reports). It catches:
  - phone numbers, with or without separators, including bare 10–11 digit numbers;
  - emails, including obfuscated ones ("at"/"dot");
  - SSNs;
  - street addresses in any case;
  - license plates ("plate ABC 123" and plate-shaped tokens);
  - phrases like "my/his/her name is" and doxx keywords.

  For reports only, it also catches any capitalized "First Last" pair unless it is a known place or a common noun phrase. The same filter runs on submit.
- **Community flags (NIP-56).** Each report has a ⚑ flag button that publishes a kind-1984 event (`e=<id> other`, `p=<pubkey>`, `t=eyemont`). A report flagged by **2 or more distinct keys** is hidden for everyone. Flagging also hides the report locally right away. Per-item and per-source hides are device-only.
- **Identity.** A random Nostr key is stored only in this browser (localStorage `eyemont.nsec`) and never uploaded. "new identity" deletes it, and a fresh key is made on the next post. Old posts stay public.
- **Relay status chip** in the report form shows how many relays are up (hover for each relay). **nostr-tools is lazy-loaded** the first time reports are opened or used.
- CROWD stays at city level: posts are pinned only to place centroids from `places.json`, never to authors.
- **Placement.** Ambiguous town names (Glendale, Aurora, Springfield, Portland, …) are matched only when a US state name or 2-letter code also appears. Longest names are matched first, so "New Mexico" wins over "Mexico".
- **Testing.** The publish and flag paths are tested only against a Playwright `routeWebSocket` mock relay. No test publishes to real relays.

## Radar
RainViewer is replaced by Iowa Environmental Mesonet NEXRAD n0q tiles (`mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png`). They are free public tiles, attributed to IEM, and cover the US only. They refresh every 5 minutes.

## M3 News & incident network
**Source classes** (`sourceClass` on every source/layer/item). They describe **ownership and funding only, never truthfulness**:
- `official`: government agencies, intergovernmental bodies, and state-funded or public media, each with a funding note.
- `major`: large commercial outlets and wires.
- `independent`: independent, local and nonprofit outlets, OSINT, citizen posts and Nostr reports.

Three toggle buttons (OFFICIAL / MAJOR / INDEPENDENT, saved in localStorage `eyemont.cls`) filter every layer, the feed and incidents. The ⓘ sheet explains the classes. GDELT items are classed by the majority of their linked domains (`DOMCLS`); unknown domains count as independent.

**News v1**:
- `.github/build_sources.py` builds `data/sources.json` from the Feed Integration agent's `sources_v2.json` (copied to `.github/sources_v2.json`). It keeps only accepted entries (verified and not rejected), excludes RT, and drops NCMEC AMBER because it carries names and photos of people. If a funding note says government, state, public broadcaster or intergovernmental, the class is forced to `official`.
- `.github/news_snapshot.py` runs every 15 minutes in the Pages workflow. It fetches feeds sequentially, 0.5 s apart with a 15 s timeout, keeps up to 30 items per feed from the last 24 h, and stores headline, link and a short summary only. Failures are logged as `FEED FAIL` and the feed is dropped from that snapshot, with its status in `news.json`.
- Placement: a place name in the headline or summary (same quote and ambiguity rules as crowd), otherwise the outlet's home city, flagged ⌂.

## M3.2 — hazards, 911, incidents
- `.github/hazards_snapshot.py` (Actions, every build) → `data/hazards.json`: NASA FIRMS VIIRS 24 h (0.1° cells, credited), FAA TFR (state centroid) + NAS airport events, NOAA PTWC/NTWC tsunami, OpenFEMA declarations 30 d (state centroid), IODA country alerts (non-normal, country approx.), SWPC alerts (pinned at Boulder, flagged non-geographic). Per-source failures logged as `FEED FAIL`, never fatal.
- FLOOD: NWS active alerts filtered to /Flood/ in the browser. NWPS whole-US gauge pull timed out, so it is dropped.
- 911: `data/dispatch.json` (25 Socrata datasets), fetched browser-direct with `$order`/`$limit=150`, last 24 h, coordinates rounded to 0.01°, no addresses, sensitive call types dropped, per-dataset portal + license in each popup.
- Aircraft: adsb.lol re-api boxes (ODbL 1.0).
- News: `.github/us_cities.json` gives local-outlet home cities (328 feeds). BBC and Al Jazeera are credited, unmodified, with a prominent "Read the full story at …" link. Al Jazeera is official/state-funded (Qatar).
- LIVE incidents (`incidents()` in app.js): greedy clustering of time-stamped, class-filtered items from visible layers (≤25 km of centroid, ≤2 h from first item, last 6 h). Outlet-home-placed news is excluded, and all 911 datasets count as one source. Clusters need ≥2 distinct sources. confidence = .15 + .2·(sources−1) + .15·(classes−1) + .1·(layers−1), capped at 1. Sorted by newest (10-min buckets), then growth (items in the last 30 min). The popup shows class columns side by side.
- The about sheet states that the project is non-commercial.
- M3.3 topic-aware incidents: an item joins a cluster within 25 km / 2 h only if it shares an event type (LEX regex lexicon, plus a type implied by the layer, e.g. quakes→quake) or ≥2 rare headline tokens (document frequency between 2 and max(3, 0.4% of items), stopwords and the item's own place-name tokens removed). Clusters are shown only with ≥2 sources and an event type held by ≥2 items. The title is TYPE + an example headline. NOINC regex drops sports and entertainment items. The sparkline shows items per 15 min over 2 h.

## M3.4 QA fixes
- 911 is now snapshot-only (`.github/dispatch_snapshot.py`, config in `.github/dispatch.json`, not served). An ALLOWLIST of non-person call types (fire, alarm, smoke, hazmat, gas leak, traffic hazard and collisions without medical, power lines, water rescue, flooding) is applied with a DENY override (medical/aid/EMS, assault, missing person, DV, sex, crisis, police enforcement…). Unknown types are dropped. The client gets only {type, time, lat/lon 2 dp, city, source, license}.
- Reports: NIP-13 proof-of-work of 20 bits, mined in `pow-worker.js` (sync SHA-256) with a progress bar. A report or flag is valid only if its id has ≥20 leading zero bits and its nonce tag commits to ≥20. 3 distinct PoW-valid kind-1984 flags collapse a report behind "flagged, tap to view". **No takedown exists**: relays are third-party. The layer stays off by default behind the unmoderated notice.
- The PII filter now flags a common first name followed by another word, case-insensitive. Emails and phone numbers are scrubbed in the news snapshot and at render for news, crowd and reports.
- Incidents exclude centroid-placed items (TFR, FEMA, IODA, space weather, 911 at city centroid, news at outlet home city) and collapsed reports. 911 counts as at most 1 source.
- news.json keeps only the last 6 h, with summaries trimmed to 160 chars (credited outlets 300, cut at a sentence or word).
- Touch targets are ≥44 px. The LIVE bar has a fade and a "swipe ›" cue.

## Redesign (branch `redesign`): NOW / NEAR / MAP
Layers are gone from the UI. The same `LAYERS[]` plugins (unchanged contracts, plus `time`/`src`/`text` added to quakes, NWS alerts, EONET and GDACS) and the M3.3 `incidents()` linker feed one ranked list.
- **Feed entries** = linked incidents (≥2 sources, shared type; deduped by headline) + strong single-source signals (quakes M2.5+, NWS Warnings/Emergencies, FIRMS cells ≥ medium, 911 allowlist calls, FAA, IODA, FEMA, GDACS, EONET, placed news/crowd posts that match the event lexicon). Score = 2·confidence + recency + growth (incidents), or layer weight × severity + recency (singles, confidence 15%).
- **Topics** (chips, multi-select, saved in `eyemont.topics`): Fire, Weather, Quakes, Crime/911, Transport, Outages, News, Crowd. Mapped from incident type (`TYTOPIC`) or the source layer (`LYTOPIC`).
- **Source-class filter** OFFICIAL/MAJOR/INDEPENDENT stays in the header on every tab (`eyemont.cls`).
- **NEAR**: coarse only. A state picker, pre-filled from a timezone → state guess (`Intl`), saved as `eyemont.near`. The Geolocation API is never called. An entry's state = smallest US state bbox containing its point. Lists that state's scanner directory (State → County, Broadcastify outbound links).
- **MAP**: one Leaflet map, markers colored by topic (rings = linked incidents, dots = single signals). Caltrans cams are drawn only when the Transport chip is on. The attribution is collapsed to one line and expands on tap.
- **Detail sheet**: coverage side by side by class, timeline, IEM NEXRAD radar mini map (US) or a radar link, nearby Caltrans cams (≤40 km, snapshot + ▶ LIVE into the docked player), scanner links (Broadcastify state + official streams ≤150 km), source links pulled from item popups.
- **Not loaded in this UI**: Nostr REPORTS (no posting, no relay connections), aircraft (1 MB snapshot) and LIVE TV. The aircraft and reports code stays in `crowd.js`/`app.js` for later.
- Rain: half-resolution canvas, ~12 fps, 7% opacity, paused when hidden, off under `prefers-reduced-motion` (which also disables the logo glitch and the sheet animation).

### Redesign follow-ups
- `.github/placer.py` + `us_places.json`: Census gazetteer city+state resolver (dateline first; ambiguous cities w/o state stay unplaced).
- `data/us_states.geojson` (~199KB, Census cb_2023 20m, public domain): point-in-polygon state lookup.
- FAA NAS items carry real `start`/`issued`/`end`.
- Aircraft (Transport chip), LIVE TV (News chip), Nostr reports (Crowd chip, OFF by default, unmoderated notice). Reading is opt-in; posting/flagging go to a sessionStorage mock relay only (`MOCK_WRITES` in crowd.js).
- Card titles use `safeHead()`: headline without name-like patterns, else "type · place". Sheet shows publisher text unmodified.

### QA round fixes
- Placement: `data/gaz.txt` (from `.github/build_gaz.py`, Census Gazetteer) is used client-side (crowd.js) and by `placer.py`. "City, State" maps to the city point. A bare name that is unique in the Gazetteer is placed only in a place context ("in Kokomo", "Kokomo police") and only if it is not a common word or first name. Ambiguous bare names stay unplaced.
- FAA: plain-word program names; times carry the viewer's zone label (Intl `shortGeneric`, e.g. ET); the sheet shows the delay start.
- NEAR: full tz→state map including IANA aliases; multi-state zones show "Guessed: NY, change".
- stateOf: point-in-polygon, then a Canada/Mexico mask (Natural Earth 1:50m, clipped), then nearest-state fallback (~35 km). Covers PR, USVI, Guam, CNMI, and American Samoa.
- Feeds that fail show an error plus a retry countdown and a RETRY NOW button. news.json loads after first paint. Future-dated news is dropped in the snapshot.
- Name masking: every piece of publisher text shown in the app (sheet coverage, timeline, source labels, popups, cam captions) goes through `maskNames()`, which applies the safeHead pair detection and swaps name-like pairs for "[name]". Places, orgs, and named events ("Aspen Acres Fire") are kept. Link hrefs are unchanged.

## Console + narrative gap (Oct 2026)
- Header: rain band (48px canvas, paused when hidden / reduced motion), HUD (feeds, signals/min, incidents, UTC+local clock), ticker (tap pauses; static under reduced motion).
- NOW segments: ALL / COVERAGE GAP (independent-only) / OFFICIAL ONLY, using `segOf(e)` on `e.cls`.
- Each card has a coverage-split bar (official/major/independent). The detail sheet has a HEADLINE DIFF per class (masked). The wording only describes which sources reported something; it makes no claims about whether it is true.

## Signal intercept + time machine (Oct 2026)
- INTERCEPT tab: every timestamped item from every loaded feed, sorted newest first, names masked. It uses the global topic and class filters plus a text search. Pause freezes the list and shows an "N NEW" counter. The DOM is capped at 150 rows, expandable up to 600 (content-visibility on rows).
- MAP REPLAY: a scrubber for 6/12/24h, with play/pause and 1×/4×/16× speed. Data comes from `data/history/24h.json` plus the item timestamps in the current snapshots.
- History is built by `.github/history_snapshot.py` in the deploy workflow. Each run reads the previous file back from the live Pages site, merges new compact rows `[id,ty,lat,lon,t,c]`, prunes anything older than 24h (cap 20k rows) and deploys the result. Nothing is committed, so the repo does not grow; the file is gitignored.

## Watchlists, share, PWA, command bar (Oct 2026)
- Mask allowlist: `data/allow.txt` lists countries, territories, US states and major places. A pair of words is never masked when it sits entirely inside an allowlisted span, or when it is an allowlisted place followed by a geographic suffix (Islands, Sea, Gulf…).
- Watchlists: stored in localStorage `eyemont.watch` as keyword, state, place+radius or map point+radius, with coordinates rounded to 0.1°. `wCheck()` runs after each build. Alerts are a toast, a badge, vibration, and a Notification only after the user opts in by tapping. No push.
- Share: `#i=<eid>&ty&ll&t&p` in the URL hash. `eid` is a hash of the earliest member item. An expired link shows a fallback sheet with nearby live incidents and map/replay buttons. The brief is plain text, uses navigator.share or the clipboard, and masks names.
- PWA: `manifest.webmanifest`, `icons/`, `sw.js`. The app shell is served stale-while-revalidate. Data and feed APIs are network-first with the last good copy as a fallback (one cache entry per URL, query string ignored). Bump `V` in sw.js when shell files change.
- Command bar: `>_` button, or press `>`. `runCmd()` handles the commands and `cmdHints()` gives autocomplete.
