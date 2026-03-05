# Trail base - Architecture Document

> **Status:** Draft | **Last updated:** 2026-03-01
> Companion to [PRD.md](./PRD.md). Describes system design, data flows, and key technical decisions.

---

## 1. Guiding Principles

| Principle | What it means in practice |
|-----------|--------------------------|
| **Open standards first** | GPX as the canonical exchange format. GeoJSON for internal geometry. No proprietary wire formats. |
| **Data sovereignty** | Users always own their data. Every record can be exported. Self-hosting is a first-class deployment model. |
| **Swappable providers** | Map tiles, routing engines, and elevation sources are behind adapter interfaces — swap without touching business logic. |
| **Offline-capable architecture** | Design data models and sync protocols now so the mobile app can work offline without a rewrite. |
| **Extension via modules** | Third-party integrations (Strava, Komoot, etc.) are future modules that plug into defined contracts, never hard-coded. |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Clients                           │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Web App  │  │ Mobile App   │  │ Third-party / CLI │  │
│  │ (React)  │  │ (React Native│  │ (public API)      │  │
│  │          │  │  + offline)  │  │                   │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
└───────┼────────────────┼──────────────────┼─────────────┘
        │                │                  │
        ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                         │
│              Hono Server (REST + JSON)                   │
│                                                         │
│  ┌──────────┐ ┌────────────┐ ┌────────────────────────┐ │
│  │  Auth    │ │  Route     │ │  Import / Export        │ │
│  │  Module  │ │  Module    │ │  Module (GPX/GeoJSON)   │ │
│  └──────────┘ └────────────┘ └────────────────────────┘ │
│  ┌──────────┐ ┌────────────┐ ┌────────────────────────┐ │
│  │  Map     │ │  Elevation │ │  Sharing Module        │ │
│  │  Adapter │ │  Adapter   │ │  (future)              │ │
│  └──────────┘ └────────────┘ └────────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL + PostGIS                        │
│  routes, waypoints, users, sessions, sync_log           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Core Entities

```
users
├── id            UUID (PK)
├── email         TEXT UNIQUE
├── password_hash TEXT
├── created_at    TIMESTAMPTZ
└── updated_at    TIMESTAMPTZ

routes
├── id            UUID (PK)
├── user_id       UUID (FK → users)
├── name          TEXT
├── description   TEXT
├── activity_type ENUM ('bike', 'hike', 'car')
├── geometry      GEOGRAPHY(LineString, 4326)   -- PostGIS
├── distance_m    NUMERIC                       -- computed
├── elevation_gain_m  NUMERIC                   -- computed
├── elevation_loss_m  NUMERIC                   -- computed
├── metadata      JSONB                         -- extensible key-value
├── source_format TEXT                           -- 'manual' | 'gpx' | 'geojson'
├── deleted_at    TIMESTAMPTZ                   -- soft delete
├── version       INTEGER DEFAULT 1             -- optimistic locking / sync
├── created_at    TIMESTAMPTZ
└── updated_at    TIMESTAMPTZ

waypoints
├── id            UUID (PK)
├── route_id      UUID (FK → routes)
├── position      GEOGRAPHY(Point, 4326)
├── elevation_m   NUMERIC
├── sort_order    INTEGER
├── name          TEXT                           -- optional label
├── type          TEXT                           -- 'via' | 'stop' | 'poi'
├── created_at    TIMESTAMPTZ
└── updated_at    TIMESTAMPTZ

sessions
├── id            UUID (PK)
├── user_id       UUID (FK → users)
├── token_hash    TEXT
├── expires_at    TIMESTAMPTZ
└── created_at    TIMESTAMPTZ
```

### 3.2 Design Decisions

- **PostGIS `GEOGRAPHY` type** — stores coordinates in WGS 84 (EPSG:4326), the same CRS used by GPS devices and GPX files. No projection conversion needed on import/export.
- **`metadata` JSONB column** — holds format-specific or user-defined attributes without schema migrations. GPX extensions, Strava IDs, and future module data go here.
- **`version` column** — enables optimistic concurrency control and future offline sync (client sends version on write; server rejects stale updates).
- **Soft deletes** — `deleted_at` allows undo and preserves referential integrity for shared routes.

---

## 4. Open Formats & Data Sovereignty

Trail base treats open formats as a core feature, not an afterthought.

### 4.1 Canonical Formats

| Format | Role | Standard |
|--------|------|----------|
| **GPX 1.1** | Primary import/export format for routes, tracks, waypoints | [Topografix GPX 1.1 Schema](https://www.topografix.com/GPX/1/1/) |
| **GeoJSON** | Internal API geometry representation; secondary export | [RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946) |
| **KML** (future) | Export for Google Earth compatibility | OGC KML 2.3 |
| **FIT / TCX** (future) | Import from Garmin and other fitness devices | ANT+ FIT SDK / Garmin TCX |

### 4.2 Import / Export Pipeline

```
         ┌──────────┐
         │  Upload   │  .gpx, .geojson, .kml (future), .fit (future)
         └────┬─────┘
              ▼
     ┌────────────────┐
     │  Format Detect  │  magic bytes + extension
     └────────┬───────┘
              ▼
     ┌────────────────┐
     │  Parser        │  GPXParser, GeoJSONParser, etc.
     │  (shared/)     │  → normalized internal model
     └────────┬───────┘
              ▼
     ┌────────────────┐
     │  Validator      │  Zod schema validation
     └────────┬───────┘
              ▼
     ┌────────────────┐
     │  Repository     │  Persist to PostgreSQL/PostGIS
     └────────────────┘

Export reverses the flow: Repository → Serializer → file download.
```

### 4.3 Data Sovereignty Guarantees

1. **Full export** — A user can export all their data (routes, waypoints, profile) as a ZIP of GPX files + a JSON manifest at any time.
2. **Account deletion** — Hard-deletes all user data within 30 days, with immediate soft-delete.
3. **Self-hosting** — The Docker image includes everything needed to run an independent instance. No phone-home, no telemetry, no license server.
4. **No vendor lock-in** — The database schema uses standard PostGIS types. Data can be queried with any PostgreSQL client or migrated to another system via `pg_dump` + GPX export.
5. **Portable identifiers** — Routes use UUIDs, not auto-increment IDs, so data can be merged across instances without collision.

---

## 5. Swappable Map Layers

### 5.1 Map Provider Adapter

The map rendering layer is abstracted behind a provider interface so the tile source can be swapped without touching UI components.

```typescript
// shared/src/types/map-provider.ts

interface MapProvider {
  id: string;
  name: string;
  type: 'raster' | 'vector';
  attribution: string;
  layers: MapLayer[];
}

interface MapLayer {
  id: string;
  name: string;
  category: 'base' | 'overlay';
  style: RasterTileSource | VectorTileSource | StyleURL;
  minZoom?: number;
  maxZoom?: number;
  offlineCapable: boolean;   // can tiles be cached locally?
}

type RasterTileSource = {
  type: 'raster';
  tileUrl: string;            // e.g. "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  tileSize: 256 | 512;
};

type VectorTileSource = {
  type: 'vector';
  styleUrl: string;           // Mapbox Style spec URL
};

type StyleURL = {
  type: 'style';
  url: string;                // full Mapbox/MapLibre style JSON URL
};
```

### 5.2 Built-in Providers (MVP)

| Layer | Provider | Type | Notes |
|-------|----------|------|-------|
| Street | Mapbox Streets | vector | Default base layer |
| Satellite | Mapbox Satellite | raster | Aerial imagery |
| Topo / Terrain | Mapbox Outdoors | vector | Contour lines, terrain shading |
| OpenStreetMap | OSM tile servers | raster | Fallback / self-host option |

### 5.3 Custom Layers (v0.3+)

Users and instance admins can register additional layers:

- **Raster tile URLs** — any XYZ/TMS compatible source (e.g. Thunderforest, Stamen, USGS topo)
- **Vector tile styles** — MapLibre-compatible style JSON
- **WMS/WMTS** (future) — OGC standard tile services (government topo maps, land registry)

Layer definitions are stored as JSON in the database and can be shared across instances via export/import.

### 5.4 Map Renderer

**MapLibre GL JS** is the map renderer:

- Open-source (BSD license) — no proprietary token dependency
- Full compatibility with Mapbox Style Spec
- Self-hosters can run entirely without a Mapbox account using OSM tiles
- Broad ecosystem: react-map-gl supports MapLibre as a backend

---

## 6. Routing Engine Adapter

### 6.1 Routing Provider Interface

```typescript
// shared/src/types/routing-provider.ts

interface RoutingProvider {
  id: string;
  name: string;
  supportedProfiles: ActivityProfile[];
  getRoute(request: RouteRequest): Promise<RouteResult>;
}

interface RouteRequest {
  waypoints: Coordinate[];          // ordered lat/lng pairs
  profile: ActivityProfile;         // 'bike' | 'hike' | 'car'
  options?: {
    avoidHighways?: boolean;
    avoidTolls?: boolean;
    preferTrails?: boolean;         // hike/bike: prefer unpaved
  };
}

interface RouteResult {
  geometry: GeoJSON.LineString;
  distance_m: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  duration_s?: number;
  segments: RouteSegment[];         // per-leg breakdown
  instructions?: TurnInstruction[]; // for turn-by-turn nav
}
```

### 6.2 Supported Engines

| Engine | License | Hosting | Profiles | Notes |
|--------|---------|---------|----------|-------|
| **OSRM** | BSD-2 | Self-hosted | bike, car | Fast, mature, no hiking profile |
| **Valhalla** | MIT | Self-hosted | bike, hike, car | All profiles, turn-by-turn |
| **GraphHopper** | Apache 2.0 | Self-hosted or API | bike, hike, car | Good hike routing |
| **Mapbox Directions** | Proprietary | API | bike, car | Convenient for MVP, not self-hostable |

**Decision:** Use **Valhalla** as the routing engine from day one. It covers all activity types (bike, hike, car), is MIT-licensed, fully self-hostable, and supports turn-by-turn instructions for future navigation features. No Mapbox Directions API dependency.

---

## 7. Elevation Data

### 7.1 Elevation Provider Interface

```typescript
interface ElevationProvider {
  id: string;
  getElevations(coordinates: Coordinate[]): Promise<number[]>;  // meters
}
```

### 7.2 Sources

| Source | Resolution | Coverage | License |
|--------|-----------|----------|---------|
| **SRTM** (NASA) | 30m | Global (60°N–56°S) | Public domain |
| **Mapbox Terrain-RGB** | ~30m | Global | Mapbox ToS |
| **Open-Elevation** | 30m (SRTM-backed) | Global | MIT (API wrapper) |

**Recommendation:** Use Mapbox Terrain-RGB tiles for the MVP. For self-hosted instances, bundle an Open-Elevation service backed by SRTM data.

---

## 8. Offline Architecture

Offline support is a v1.0 feature (native mobile app), but the architecture accounts for it now to avoid costly rewrites.

### 8.1 Offline Tile Caching

```
┌──────────────┐      ┌────────────────────┐
│  Map Renderer │ ──── │  Tile Cache Manager │
│  (MapLibre)  │      │                    │
└──────────────┘      │  1. Check local DB  │
                      │  2. If miss → fetch  │
                      │  3. Store in cache   │
                      │  4. Evict by LRU     │
                      └────────────────────┘
                               │
                      ┌────────▼───────────┐
                      │  SQLite / OPFS     │
                      │  (on-device tile   │
                      │   storage)         │
                      └────────────────────┘
```

- Users select a bounding box and zoom range to download for offline use
- Tile format: **MBTiles** (SQLite-based, mature tooling ecosystem, open spec)
- Stored in SQLite (mobile) or via SQLite WASM / OPFS (web, future)
- Served via tile server (e.g. `martin`) for online use, read directly from file for offline

### 8.2 Offline Route Data

- Routes and waypoints synced to local SQLite database on mobile
- Conflict resolution uses **last-write-wins with version vector**:
  - Each route carries a `version` counter
  - Client sends `version` on update; server rejects if stale
  - On reconnect, client pulls changes since last sync timestamp
- GPX files can be imported offline; sync queues the upload for when connectivity returns

### 8.3 Offline Navigation

- Turn-by-turn instructions pre-computed server-side (via routing engine) and cached with the route
- Mobile app stores `RouteResult.instructions` locally
- Position tracking uses device GPS — no network required during navigation
- Re-routing requires connectivity (or a locally-hosted routing engine, future)

---

## 9. Third-Party Data Sharing (Module System)

### 9.1 Module Architecture (v0.3+)

Modules are self-contained packages that integrate with Trail base through defined extension points. They allow sharing data to and from third-party services without coupling the core to any specific provider.

```
┌──────────────────────────────────────────────┐
│                Trail base Core                │
│                                              │
│  Extension Points:                           │
│  ├── ImportAdapter    (ingest from service)   │
│  ├── ExportAdapter    (push to service)       │
│  ├── SyncAdapter      (bidirectional sync)    │
│  ├── MapLayerProvider (add tile sources)       │
│  └── WebhookHandler   (react to events)       │
└──────────────────┬───────────────────────────┘
                   │
     ┌─────────────┼──────────────┐
     ▼             ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐
│ Strava  │  │ Komoot   │  │ Custom       │
│ Module  │  │ Module   │  │ Module       │
│         │  │          │  │              │
│ - OAuth │  │ - OAuth  │  │ - Webhook    │
│ - Sync  │  │ - Import │  │ - Transform  │
│ - Import│  │          │  │              │
└─────────┘  └──────────┘  └──────────────┘
```

### 9.2 Module Contract

```typescript
interface TrailBaseModule {
  id: string;                          // unique identifier, e.g. "strava"
  name: string;                        // display name
  version: string;                     // semver
  description: string;

  // Lifecycle
  onInstall?(context: ModuleContext): Promise<void>;
  onUninstall?(context: ModuleContext): Promise<void>;

  // Extension points (all optional — implement what you need)
  importAdapter?: ImportAdapter;
  exportAdapter?: ExportAdapter;
  syncAdapter?: SyncAdapter;
  mapLayerProvider?: MapLayerProvider;
  webhookHandler?: WebhookHandler;
}

interface ImportAdapter {
  supportedFormats: string[];          // e.g. ['strava-activity']
  import(source: ExternalSource): Promise<NormalizedRoute[]>;
}

interface ExportAdapter {
  export(routes: Route[], destination: ExternalDestination): Promise<void>;
}

interface SyncAdapter {
  sync(lastSyncTimestamp: Date): Promise<SyncResult>;
}
```

### 9.3 Data Sharing Principles

1. **Explicit consent** — Users explicitly choose which modules to enable and what data to share. No automatic data sharing.
2. **Minimal scope** — Modules declare the data they need access to. Users grant permissions per-module.
3. **Open format intermediary** — All data passes through the normalized internal model (GeoJSON geometry + metadata). Modules never access the database directly.
4. **Revocable** — Users can disconnect a module at any time. The module's `onUninstall` hook cleans up external connections. Local data remains.
5. **Auditable** — All module data access is logged. Users can review what was shared and when.

### 9.4 Example: Strava Module

```
User enables Strava module
    → OAuth flow → user grants read access
    → Module calls Strava API to list activities
    → Activities converted to NormalizedRoute[]
    → User selects which to import
    → Routes stored locally with source_format='strava'
    → metadata.strava_id preserves link to original

User exports route to Strava
    → Route serialized to GPX (open format)
    → Module uploads GPX via Strava API
    → metadata.strava_id updated with new activity ID
```

---

## 10. API Design

### 10.1 Envelope Pattern

All API responses use a consistent envelope:

```typescript
// Success
{
  "data": T,
  "meta": {
    "page": number,
    "perPage": number,
    "total": number
  }
}

// Error
{
  "error": {
    "code": string,        // machine-readable, e.g. "ROUTE_NOT_FOUND"
    "message": string,     // human-readable
    "details"?: unknown    // validation errors, etc.
  }
}
```

### 10.2 Core Endpoints (MVP)

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  POST   /api/auth/reset-password

Routes
  GET    /api/routes              — list (paginated, filterable)
  POST   /api/routes              — create
  GET    /api/routes/:id          — get single route + waypoints
  PUT    /api/routes/:id          — update
  DELETE /api/routes/:id          — soft delete

  POST   /api/routes/import       — upload GPX/GeoJSON file
  GET    /api/routes/:id/export   — download as GPX

Waypoints (nested under route)
  PUT    /api/routes/:id/waypoints — bulk update waypoint list

Map Layers
  GET    /api/layers               — list available layers

Routing
  POST   /api/routing/directions   — get route geometry between waypoints

Elevation
  POST   /api/elevation            — get elevations for coordinates

User Data (sovereignty)
  POST   /api/user/export          — full data export (ZIP)
  DELETE /api/user/account         — account + data deletion
```

### 10.3 Public API

The same REST API is available to third-party clients (CLI tools, scripts, other apps). Authentication via session cookie (browser) or API token (programmatic access, future).

---

## 11. Server Architecture

### 11.1 Layered Structure

```
Request → Middleware → Route Handler → Service → Repository → Database
                                          │
                                     Adapter (routing, elevation, map)
```

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Middleware** | Auth, error handling, request logging, rate limiting | `server/src/middleware/` |
| **Route Handlers** | HTTP concerns: parse request, call service, format response | `server/src/routes/` |
| **Services** | Business logic, orchestration, validation | `server/src/services/` |
| **Repositories** | Data access, SQL queries via Drizzle ORM | `server/src/repositories/` |
| **Adapters** | External service integration (routing, elevation, tiles) | `server/src/adapters/` |

### 11.2 Adapter Directory

```
server/src/adapters/
├── routing/
│   ├── routing-adapter.ts        # interface
│   ├── valhalla-adapter.ts
│   ├── osrm-adapter.ts
│   └── mapbox-adapter.ts
├── elevation/
│   ├── elevation-adapter.ts      # interface
│   ├── mapbox-elevation.ts
│   └── open-elevation.ts
└── map/
    ├── map-provider.ts           # interface
    ├── mapbox-provider.ts
    └── osm-provider.ts
```

---

## 12. Shared Package (`shared/`)

Code shared between server, web app, and mobile app:

| Module | Contents |
|--------|----------|
| `schemas/` | Zod schemas for API request/response validation (single source of truth) |
| `types/` | TypeScript types inferred from Zod schemas + adapter interfaces |
| `gpx/` | GPX parser and serializer (works in Node and browser) |
| `geo/` | Distance calculation (Haversine), elevation gain/loss, bounding box utilities |
| `formats/` | GeoJSON helpers, coordinate transforms |

---

## 13. Infrastructure

### 13.1 Docker Compose (Development + Self-Hosting)

```yaml
services:
  server:
    build: ./server
    ports: ["3000:3000"]
    depends_on: [db]
    environment:
      DATABASE_URL: postgres://...
      MAP_PROVIDER: mapbox        # or 'osm', 'custom'
      ROUTING_ENGINE: valhalla    # or 'osrm', 'graphhopper', 'mapbox'

  app:
    build: ./app
    ports: ["5173:5173"]

  db:
    image: postgis/postgis:16-3.4
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: trailbase
      POSTGRES_USER: trailbase

  valhalla:
    image: ghcr.io/gis-ops/docker-valhalla
    volumes: [valhalla-tiles:/custom_files]

  # Optional: self-hosted elevation
  open-elevation:
    image: openelevation/open-elevation
    profiles: ["elevation"]
```

### 13.2 Environment Configuration

All external provider choices are configured via environment variables:

```bash
# Map tiles
MAP_PROVIDER=mapbox              # mapbox | osm | custom
MAPBOX_ACCESS_TOKEN=pk.xxx       # only if MAP_PROVIDER=mapbox

# Routing
ROUTING_ENGINE=valhalla          # valhalla | osrm | graphhopper | mapbox
VALHALLA_URL=http://valhalla:8002

# Elevation
ELEVATION_PROVIDER=mapbox        # mapbox | open-elevation
OPEN_ELEVATION_URL=http://open-elevation:8080

# Database
DATABASE_URL=postgres://trailbase:password@db:5432/trailbase
```

---

## 14. Security

| Concern | Approach |
|---------|----------|
| Authentication | Better-Auth library — session-based with HTTP-only secure cookies, Drizzle adapter |
| Password storage | bcrypt (cost factor 12+) |
| CSRF | SameSite cookie + CSRF token for state-changing requests |
| Input validation | Zod schemas on every endpoint (server-side) |
| SQL injection | Drizzle ORM parameterized queries (no raw SQL) |
| File upload | GPX/GeoJSON validated and size-limited (10 MB default) |
| Rate limiting | Per-IP and per-user rate limits on auth and import endpoints |
| CORS | Whitelist configured origins only |

---

## 15. Testing Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | Services, shared utilities, parsers |
| Integration | Vitest + testcontainers | Repository layer against real PostgreSQL |
| API | Supertest + Vitest | Route handlers end-to-end |
| Frontend | Vitest + React Testing Library | Components, hooks |
| E2E | Playwright (future) | Critical user flows |

---

## 16. Open Questions

- [x] **Routing engine** — Valhalla from day one. Self-hosted, all profiles, MIT license.
- [x] **Map renderer** — MapLibre GL JS from day one. No Mapbox GL dependency.
- [x] **Offline tile format** — MBTiles. Mature ecosystem, wide tooling support, SQLite-based.
- [ ] **Module packaging** — npm packages, or a custom registry?
- [x] **Sync protocol** — Last-write-wins with version counter. Simple, fits single-user model. Revisit if collaborative editing is added.
- [x] **Auth provider** — Better-Auth (TypeScript library, session-based, Drizzle adapter). No external service.
