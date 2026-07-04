# AIS Vessel Map — System Architecture

This file explains how the whole app works. Server, database, frontend — together.

## 1. Big picture

Ship positions come from a live network. Our server reads them, saves them, sends them to the browser. The browser shows them on a map.

```
   [AIS coastal / satellite station]
                |
                |  TCP, lines of text
                v
   [Our server]  ----one way--->  [MongoDB]
                |
                |  HTTP (one-time load)
                |  Socket.IO (live push)
                v
   [Our frontend]  ----renders---->  [Map with ship dots]
```

Each box is one thing. Each arrow is one way they talk.

## 2. One example, walked through

Pick one ship at one moment. What happens?

1. The ship's radio sends its position to a coastal station.
2. The coastal station keeps a TCP server open at `ais.portvision.com:56524`. Many ships connect to it.
3. Our server (`aisStreamWorker` in `ais_vessel_map_server/src/app/services/aisStreamWorker.ts`) opens a TCP connection to the same address.
4. Each line of text coming in is one AIS message (called AIVDM). One ship, one moment in time.
5. The worker reads lines one at a time. Raw text. Looks like `!AIVDM,1,1,,A,14VI...`.
6. The worker passes each line to `aisDecoder`. That helper uses the `ais-stream-decoder` library to turn text into JSON with fields like `mmsi`, `lat`, `lon`, `speedOverGround`, etc.
7. The worker puts the new ship info into a small in-memory Map. Holds it for 1 second.
8. After 1 second, the worker takes everything in the Map and writes them all to MongoDB with one `bulkWrite` call.
9. Right after the DB write, the worker also sends each ship info to the frontend using Socket.IO.
10. The frontend has a socket already open. It catches the new ship as an event.
11. The `useSocket` hook in the client handles the event. It tells `useVessels`.
12. `useVessels` updates React state. The map re-renders. The marker slides to the new position.

The full round trip: about 50 ms. You see ships move on the map in real time.

## 3. Database design

One collection: `vessels`. One document (row) per ship.

Shape:

- `mmsi` — ship ID. 9 digits. Number. Must be unique. Required.
- `vesselName` — ship name. String. `"Unknown"` if not given.
- `vesselType` — type code (number from AIS spec, kept as string).
- `latitude` — number. Optional.
- `longitude` — number. Optional.
- `sog` — speed over ground, in knots. Number. Optional.
- `cog` — course over ground, in degrees. Number. Optional.
- `heading` — compass heading, in degrees. Number. Optional.
- `updatedAt` — when we last heard from this ship. Date.

Why some fields are optional: not every AIS message has them. A static report (type 5) has name and type, but no position. A position report (type 1, 2, 3) has position, but the name may be empty.

`mmsi` has a unique index. So one ship = one document. No duplicates.

`strict: throw` on the schema means: any field not in this list will fail the write. We do this on purpose. If we save bad data, we want to know right away.

## 4. API design

All list responses use a wrapper: `{ "data": [ship1, ship2, ...] }`. Why: easy to add extra info later (like a count or cache time) without breaking the shape.

| URL | Returns |
|---|---|
| `GET /` | `{ name, version, ... }` |
| `GET /health` | `{ uptime, mongoose, ... }` |
| `GET /api/vessels` | `{ data: [ship, ship, ...] }` |
| `GET /api/vessels/368164530` | One ship. 400 if MMSI is not 9 digits. |

Live updates come over Socket.IO. The server emits a `vessel` event with the ship JSON whenever a ship's data changes.

Why we check the MMSI regex (`^\d{9}$`): the MMSI is always 9 digits by spec. If the URL has the wrong shape, we return 400 fast instead of letting MongoDB search with garbage and return null.

## 5. Decoding

Raw AIS lines look like `!AIVDM,1,1,,A,14VI Q 0FP>@000H<;0;?t...*7B`. We need to turn that into numbers.

The library `ais-stream-decoder` does that for us. But that library is CommonJS (old-style modules). Our code is ES modules (new-style). We use `createRequire` to bridge. That bridge lives in one file (`aisDecoder.ts`) so the rest of the code stays clean.

After decoding, the worker has JSON like:

```
{
  mmsi: 368164530,
  name: 'STARSHIP',
  typeAndCargo: 70,
  lat: 33.7214,
  lon: -118.2713,
  speedOverGround: 8.4,
  courseOverGround: 87.3,
  heading: 84
}
```

Then `toVessel()` in `aisStreamWorker.ts` maps that to our internal shape:

- `name` → `vesselName`. Set to `"Unknown"` if not given.
- `typeAndCargo` → `vesselType`. Set to `"Unknown"` if not given.
- `lat` → `latitude`. Drop the field entirely if not given.
- `lon` → `longitude`. Drop the field entirely if not given.

Drop vs null: we choose to drop, not save an empty value. So a ship with no position has no `latitude` key at all. The frontend later uses this — it only shows ships that have both `latitude` and `longitude`.

## 6. Live updates

How a marker moves on the map when the server gets a new position.

Server side:

1. AIS message comes in.
2. Worker decodes it.
3. Worker saves it to MongoDB (in 1-second batches).
4. Worker calls `io.emit('vessel', ship)`.

Client side:

1. We open a Socket.IO connection at app start (`useSocket.ts`).
2. Each `vessel` event becomes an update in the cache in `useVessels`.
3. React re-renders the map.
4. The marker for that ship sees the new lat/lon.
5. `leaflet.marker.slideto` slides the icon smoothly over ~1 second.

Why slide: ships do not teleport. They move continuously. Without smooth slide, the marker jumps frame to frame. With slide, you see continuous motion. Looks like real ships.

## 7. Choices (why we did what we did)

**`bulkWrite`, not `updateOne`, for DB writes**

A ship network sends 50-200 messages per second. Each `updateOne` call opens a socket to MongoDB, sends the query, waits for answer, closes the socket. At 200 calls per second, we run out of sockets (Mongoose has only 20). Queries queue. The server slows down and eventually freezes.

`bulkWrite` puts 200 ops into ONE call. One socket, one round trip. MongoDB handles this easily.

Worth it? Yes. Cost? Small. The `bulkWrite` code is about the same size as per-message code.

**1-second flush window**

Ships report every 2-10 seconds. Two reports within 1 second for the same ship is common. We keep the latest in a Map by MMSI. So the buffer holds at most "latest position per ship", not duplicates.

**Reconnect with longer waits (exponential backoff)**

If AIS feed is down, we wait 1 second, then 2, then 4 ... up to 30 seconds. After 30 seconds, we keep trying every 30 seconds. We do not keep hammering the upstream server. Standard pattern. The cost of this is ~3 lines of code; the cost of NOT having it is hammering the upstream server on every restart.

**Safe shutdown on Ctrl+C**

When we get Ctrl+C (or SIGTERM), we:

1. Stop reading from AIS.
2. Flush the last batch of ships to MongoDB.
3. Close MongoDB.
4. Close HTTP.

Without this, the last second of positions is lost on every restart. The 3-phase teardown is about 10 lines and prevents a real bug.

**Socket.IO**

We picked Socket.IO instead of plain WebSocket or Server-Sent Events. Reasons:

- Easier reconnection on the client.
- Works through proxies (some corporate / cloud setups break plain WebSocket).
- Could grow to client-to-server events later if we want.

Trade-off: the bundle is bigger (~50 KB). For a take-home project, that is fine.

Alternative would be SSE, which is lighter. Valid choice — we picked Socket.IO for friendliness over file size.

**TanStack Query for client state**

We treat the initial HTTP fetch as one cache. Live socket events are patches to the same cache. TanStack Query makes this clean. We did not use Redux or Context — overkill for one server cache.

**Smooth marker motion**

`leaflet.marker.slideto` slides markers from old position to new over ~1 second. Real ships look like they move, not teleport. Free UX win.

## 8. How to run + how to test

### Run

```
# terminal 1
cd ais_vessel_map_server
cp .env.example .env      # edit MONGODB_URI inside
npm install
npm run dev

# terminal 2
cd ais_vessel_map_client
npm install
npm run dev
```

Open `http://localhost:5173`.

### Test

After 30 seconds:

```
curl http://localhost:3000/health
curl http://localhost:3000/api/vessels | head -c 500
curl http://localhost:3000/api/vessels/368164530
```

Each should return JSON, not an error.

To check Socket.IO: open browser dev tools → Network → WS tab. You should see an open socket to `localhost:3000`.

Click on the map and drag — the markers should stay in their positions. Hover on a marker — tooltip shows Name, MMSI, Lat, Lon.

## 9. Stack and what each piece does

### Backend

- **Node.js 18+** — runs the JavaScript.
- **Express 5** — answers HTTP requests.
- **Mongoose 9** — talks to MongoDB.
- **socket.io 4** — pushes live updates to the browser.
- **ais-stream-decoder (CommonJS)** — decodes raw AIS text into JSON.
- **dotenv** — reads the `.env` file.
- **TypeScript 6** — adds types. Catches bugs at build time.

### Frontend

- **React 19** — UI.
- **Vite 7** — dev server + build.
- **TypeScript 5 (strict)** — types.
- **React-Leaflet 5 / Leaflet 1.9** — the map.
- **leaflet.marker.slideto** — smooth marker motion.
- **TanStack Query 5** — server state cache.
- **socket.io-client 4** — connects to live updates.