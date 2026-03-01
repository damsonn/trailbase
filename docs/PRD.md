# TrailBase - Product Requirements Document

> **Status:** Draft | **Last updated:** 2026-03-01
> This is a living document. Sections marked [TBD] will be expanded as the project evolves.

---

## 1. Overview

**TrailBase** is an open-source route management, viewer, and navigation platform for cycling, hiking, and driving. It combines the route-planning strengths of [RideWithGPS](https://ridewithgps.com) with the map-layer depth of [Gaia GPS](https://gaiagps.com) — without subscriptions, vendor lock-in, or paywalled core features.

### Problem

Existing route-planning tools lock essential features (offline maps, GPX export, advanced layers) behind subscriptions. Users lose access to their own data when they stop paying, and have no way to extend or customise the tools they rely on. Both RideWithGPS and Gaia GPS face growing user frustration with software quality, pricing increases, and restrictive data practices.

### Vision

A free, community-driven platform where users fully own their route data and can extend the tool to fit their needs — starting as a responsive web app, with a native mobile app to follow.

### Core Principles

- **Free and open-source** — no paywalled features, no subscription tiers
- **Data ownership** — users can import, export, and self-host their data at any time
- **Extensible** — community modules for map layers, routing engines, and integrations
- **Multi-activity** — bike, hike, and car routing from day one

---

## 2. Target Users

| Persona | Description |
|---------|-------------|
| **Casual explorer** | Plans occasional hikes or rides; wants a simple, free tool to create and follow routes |
| **Touring cyclist / thru-hiker** | Plans multi-day routes; needs GPX export, reliable elevation data, and point-of-interest management |
| **Self-hoster / tinkerer** | Wants to run their own instance, customise map layers, or build community modules |
| **Outdoor group / club** | Shares routes and points of interest across members without requiring everyone to subscribe |

---

## 3. Competitive Landscape

| Capability | RideWithGPS | Gaia GPS | **TrailBase** |
|-----------|-------------|----------|---------------|
| Route planning | Advanced (cycling-focused) | Snap-to-trail / freehand | Snap-to-road + point-to-point |
| Activity types | Cycling | Hiking / backcountry / 4x4 | Bike, hike, car |
| Map layers | 5 specialty layers | 250+ layers (premium) | Mapbox base + extensible |
| GPX import/export | Yes (limited on free) | Yes (limited on free) | Yes (always free) |
| Offline maps | Paid | Paid | [TBD — future native app] |
| Route sharing | Yes | Yes | Yes |
| Open source | No | No | **Yes** |
| Self-hostable | No | No | **Yes** |
| Pricing | Free tier + $5–10/mo | Free tier + $4–8/mo | **Free** |

### Key pain points we address

- **Vendor lock-in:** Routes and data trapped behind subscriptions
- **Paywall creep:** Core features (export, offline, layers) gated behind paid tiers
- **Software quality:** Both platforms face complaints about bugs, unreliable routing, and degrading UX
- **No customisation:** Users cannot extend, modify, or self-host existing tools

---

## 4. MVP Scope (v0.1)

The MVP delivers the minimum loop: sign up, create routes, manage them, and exchange data via GPX.

### 4.1 Authentication

| Feature | Details |
|---------|---------|
| Sign up | Email + password registration |
| Log in / log out | Session-based auth |
| Password reset | Email-based reset flow |

### 4.2 Route Management

| Feature | Details |
|---------|---------|
| List routes | Paginated list with name, distance, activity type, created date; search and filter by activity type |
| Create route | Interactive map-based route builder with click-to-place waypoints |
| Edit route | Modify waypoints, name, description, activity type on existing routes |
| Delete route | Soft-delete with confirmation |
| View route | Full-screen map view with elevation profile, distance, and route metadata |

### 4.3 Route Building

| Feature | Details |
|---------|---------|
| Routing modes | Bike, hike, car |
| Routing method | **Snap-to-road** (follows roads/trails via routing engine) and **point-to-point** (straight lines between waypoints) |
| Waypoint management | Add, remove, reorder, drag waypoints |
| Elevation profile | Display elevation chart for the current route |
| Distance calculation | Running total displayed during route building |
| Undo / redo | Undo/redo waypoint actions |

### 4.4 GPX Import / Export

| Feature | Details |
|---------|---------|
| Import | Upload `.gpx` files to create routes; parse tracks, routes, and waypoints |
| Export | Download any route as `.gpx` |

### 4.5 Map

| Feature | Details |
|---------|---------|
| Base map provider | Mapbox GL JS |
| Default layers | Street, satellite, terrain/topo |
| Map controls | Zoom, pan, geolocate (browser location), fullscreen |
| Layer switching | Toggle between available base layers |

---

## 5. Technical Constraints (MVP)

| Concern | Decision |
|---------|----------|
| Routing engine | [TBD — evaluate OSRM, Valhalla, GraphHopper, or Mapbox Directions API] |
| Map tiles | Mapbox (free tier covers initial usage; architecture should allow swapping providers) |
| GPX parsing | Server-side parsing and validation |
| Elevation data | Source from routing engine or Mapbox Terrain API |
| Responsive design | Web app must work on desktop and mobile browsers (no native app yet) |

---

## 6. Out of Scope (MVP)

The following are planned for future iterations but explicitly excluded from v0.1:

- Native mobile app (iOS / Android)
- Offline map support
- Activity recording / GPS tracking
- Social features (follow, activity feed, comments)
- Community module / plugin system
- Custom map layer uploads
- Turn-by-turn navigation
- Points of interest management (standalone, outside route context)
- Route sharing (public links, embedding)
- Team / group workspaces
- Additional file format support (KML, FIT, TCX)

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| User can sign up and create a route | End-to-end flow works |
| GPX round-trip | Import a GPX → view route → export GPX → re-import produces equivalent route |
| Route builder usability | Route creation in < 2 minutes for a simple 10km loop |
| Mobile responsiveness | Route list and map view usable on 375px-wide viewport |

---

## 8. Roadmap (High-Level)

| Phase | Focus |
|-------|-------|
| **v0.1 — MVP** | Auth, route CRUD, route builder, GPX import/export, Mapbox base layers |
| **v0.2 — Sharing & POI** | Public route sharing, points of interest, embeddable route widgets |
| **v0.3 — Layers & Extensions** | Extensible map layer system, community module architecture |
| **v0.4 — Activity Tracking** | GPS recording, activity history, stats |
| **v1.0 — Native App** | iOS/Android with offline maps and turn-by-turn navigation |

---

## 9. Open Questions

- [ ] Routing engine selection — self-hosted (OSRM/Valhalla) vs. API-based (Mapbox Directions)?
- [ ] Auth provider — custom implementation vs. third-party (e.g. Supabase Auth, Keycloak)?
- [ ] Hosting strategy for the reference instance (where does the "official" free instance live)?
- [ ] Licensing model for community modules
- [ ] Elevation data source and accuracy requirements
