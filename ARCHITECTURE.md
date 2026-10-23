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
- **Sticky player**: a mini-player that keeps playing while you browse, with Media Session metadata and play/pause for the lock screen. It plays only streams we're clearly allowed to play directly, which right now means Caltrans public HLS cams (via hls.js, or native HLS on iOS). Any scanner stream that later turns out to be clearly permitted plugs into `Player.play(src,title,artist)`.
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

Aircraft workaround without a runtime backend: the Pages build (GitHub Actions cron, every 15 min) bakes a continental-US snapshot into `data/aircraft.json`. The app tries live first and falls back to the snapshot with a timestamp. Truly live worldwide aircraft would need a runtime proxy, which is out of scope.

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
