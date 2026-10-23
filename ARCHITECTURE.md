# Eyemont — Architecture

> **RULE #1 — Zero cost, now and ongoing.** No paid hosting, APIs, domains, subscriptions, trials that convert, or services that require a card on file. Only free tiers needing no payment details and free public sources. Anything not free is dropped. (Current stack: public GitHub repo + GitHub Pages + GitHub Actions on a public repo, all free; free public data feeds; CARTO basemap free-use tier with attribution.)

Mobile-only, **fully static** single-page app on GitHub Pages. No runtime backend, no bot at runtime.
Leaflet + CARTO dark tiles; Matrix digital-rain canvas behind a black/green monospace touch UI.

## Hard rules
- Only public, legally accessible, properly licensed sources; follow each source's terms and rate limits; show attribution.
- No private/unsecured cameras, credential-protected feeds, or encrypted radio.
- Scanner audio: **no rehosting**, no scraping of stream URLs a provider doesn't publish for embedding/playback. Broadcastify is reached through its official pages/player; OpenMHz audio is played from the call URLs its public API publishes for playback.
- If a feature can't work without a proxy, it is not built; the reason is documented here.

## Files
| File | Role |
|---|---|
| `index.html`, `style.css` | shell, rain canvas, layer buttons, feed panel, sticky audio player |
| `app.js` | map, region filter (World / US state bbox), layer plugin registry, feed panel |
| `scanners.js` | scanner browser (State → County), OpenMHz system matching, sticky player + Media Session |
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
- **Browse**: 📻 button, or tap a state/county marker on the map. Flow: States list → State (Broadcastify state directory link, OpenMHz systems in that state, counties) → County (matching OpenMHz systems, Broadcastify link, RadioReference link). Selecting a state zooms the map; selecting a county flies to its centroid.
- **OpenMHz** (`api.openmhz.com/systems`, `/{system}/calls`, `/calls/newer`): calls queue in a sticky player that keeps playing while you browse. The Media Session API sets title/artist and play/pause/next handlers for the lock screen and background playback where the browser allows it (iOS Safari may pause background playback between clips).
- **Broadcastify**: links out to Broadcastify's own state/county directory and player. Direct stream URLs need a licensed Broadcastify API agreement, and their pages can't be iframed, so Eyemont does not embed or rehost them. Broadcastify's state ID equals the state FIPS code; county IDs are internal, so county rows deep-link to the state directory.
- **Proxy-dependent limits (not built)**: (1) Broadcastify streams inside the in-app player would need licensed API access, not a proxy, so this is out of scope. (2) OpenMHz's API is behind Cloudflare bot protection. If a browser gets challenged, the directory shows a graceful fallback link to openmhz.com.

## CORS status (direct browser fetch)
| Feed | Source | CORS | License |
|---|---|---|---|
| Quakes | USGS all_day GeoJSON | `*` | public domain |
| Weather alerts | api.weather.gov | `*` | public domain |
| DOT cams | Caltrans CWWP2 CCTV D4/D7/D11/D12 | `*` | CA open data, public snapshots |
| Aircraft | adsb.lol `/v2/lat/lon/dist` | **no CORS header** | ODbL |
| Scanners | OpenMHz API / Broadcastify links | browser-dependent / link | provider terms |

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
Quakes, NWS alerts, aircraft (live or snapshot), Caltrans cams, region filter, feed panel, scanner browser (State → County), OpenMHz sticky player with Media Session.
*Accept*: URL returns 200 on a phone. Every layer loads or shows a graceful error. A state filter zooms and filters. Tapping a feed item flies to it. The scanner browser works by state and county from both the map and the list. Audio keeps playing while you pan and browse.

**M2 — Scanner polish**: favorites and recents in localStorage, talkgroup filter per OpenMHz system, "now playing" marker on the map, a curated list of official agency streams that publish embeddable players.
*Accept*: a favorite resumes in 1 tap; talkgroup filter persists.

**M3 — More cams**: ≥5 states of official DOT snapshot cams that are CORS-friendly and terms-compliant.
*Accept*: cams load in <3 s on 4G; every source has a documented terms check.

**M4 — Hazards & outages**: FIRMS, radar overlay, IODA outages.
*Accept*: each layer can be toggled, is attributed, and refreshes in ≤5 min.

**M5 — PWA**: installable, offline shell, saved regions.
*Accept*: Lighthouse PWA pass; home-screen launch on iOS and Android.
