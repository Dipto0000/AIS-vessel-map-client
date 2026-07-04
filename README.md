# AIS Vessel Map (Client)

This is the frontend. It shows live ship positions on a map.

## What you need

- Node.js version 18 or higher.
- The backend running.

The backend should be running on `http://localhost:3000` (the default). The client talks to it.

## Setup

```
git clone <this-repo>
cd ais_vessel_map_client
npm install
```

No `.env` needed for dev. The dev server proxies all `/api` and `/socket.io` calls to the backend on port 3000.

## How to run

```
npm run dev
```

Open `http://localhost:5173` in your browser.

You should see:

1. A map.
2. Ship dots on the map.
3. A small label in the top-right corner: `XXX vessels`. The number goes up as new ships come in.
4. Hover on any dot → tooltip pops up with Name, MMSI, Lat, Lon.

## What the client does

1. On load, fetches all ships from the backend (`GET /api/vessels`).
2. Opens a Socket.IO connection to the backend for live updates.
3. Each new position makes the marker slide smoothly to the new place.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server. Port 5173. |
| `npm run build` | Typecheck + production build. Output in `dist/`. |
| `npm run preview` | Serve the built version locally. |
| `npm run typecheck` | TypeScript types only. |
| `npm run lint` | Run ESLint. |

## Folder map

```
src/
  main.tsx              <- React entry point
  App.tsx               <- top-level layout
  components/
    VesselMap.tsx       <- the Leaflet map + count chip
    VesselMarker.tsx    <- one ship on the map + tooltip
  hooks/
    useVessels.ts       <- load ships using TanStack Query
    useSocket.ts        <- subscribe to live socket events
  lib/
    api.ts              <- fetch helpers (unwrap { data })
  types/
    vessel.ts           <- TypeScript shape for a vessel
```

## Endpoints this client uses

| URL | Why we use it |
|---|---|
| `GET /api/vessels` | Initial load. List of all ships. |
| Socket.IO `vessel` event | Live push. One event per ship update. |

The Vite dev server proxies both to `localhost:3000`. So in the code we write `fetch('/api/vessels')` and `io('/')`, no full URLs.

## Common errors

**Map is blank** — backend is not running, or runs on a wrong port. Check `http://localhost:3000/health`.

**"Cannot connect to socket"** — same as above. The Vite proxy forwards to the backend.

**No ships on map** — wait 30 seconds. Server takes time to learn about ships from the AIS feed.

## What we used to build

| Library | What for |
|---|---|
| React 19 | UI. |
| Vite 7 | Dev server + production build. |
| TypeScript 5 | Types. Catch bugs at build time. |
| React-Leaflet 5 + Leaflet 1.9 | The map. |
| leaflet.marker.slideto | Smooth marker motion. |
| TanStack Query 5 | Server state cache (initial fetch + live updates). |
| socket.io-client 4 | Live push connection. |
| ESLint 9 | Code quality. |

## Map of requirements to code

Where each piece of the spec lives in this repo.

| Requirement | Where it is |
|---|---|
| Map + ship markers | `src/components/VesselMap.tsx` |
| Hover tooltip (name, MMSI, lat, lon) | `src/components/VesselMarker.tsx` |
| Real-time updates on the map | `src/hooks/useSocket.ts` |
| Markers stay in place after pan/zoom | lat/lon bound to React state in `VesselMap.tsx` |
| Smooth marker motion | `leaflet.marker.slideto` in `VesselMarker.tsx` |
| Vessel count display | `src/components/VesselMap.tsx` (top-right chip) |

## More info

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design story — server + client together, why each library, what we did not build.
