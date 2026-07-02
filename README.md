# AIS Vessel Map (client)

React + TypeScript + React-Leaflet frontend for the AIS Vessel Map take-home.

## Status

Scaffold-only. No map view, no API call, no live socket yet.
Type, build, and lint all green; the dev page renders a placeholder.

## Backend contract

This client expects the backend at `http://localhost:3000`:
- `GET /api/vessels` -> `{ data: Vessel[] }`
- `GET /api/vessels/:mmsi` -> `Vessel`
- Socket.IO `vessel` event -> `Vessel`

The Vite dev-server proxies `/api` and `/socket.io` to the backend, so component code can use relative URLs (`fetch('/api/vessels')`, `io('/')`).

## Scripts

- `npm run dev` -- Vite dev server on port 5173
- `npm run build` -- typecheck + Vite build
- `npm run typecheck` -- `tsc --noEmit`
- `npm run lint` -- ESLint flat config

## Stack

Vite 7 + React 19 + TypeScript 5 (`strict: true`, plus
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`, `useUnknownInCatchVariables`);
React-Leaflet 5 on Leaflet 1.9;
TanStack Query 5; socket.io-client 4; ESLint 9 flat config.

## Next up

1. `MapView` component (react-leaflet 5 + OSM tiles).
2. `fetchVessels()` helper that unwraps the `{ data }` envelope, typed end-to-end so call sites cannot assume a bare array.
3. Socket.IO subscribe + optimistic patch into the TanStack Query cache.
