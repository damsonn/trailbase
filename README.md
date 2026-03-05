# Trail base

An open-source route management, viewer, and navigation platform for cycling, hiking, and driving. Plan routes, import/export GPX files, and manage your outdoor adventures — free, with no subscriptions or vendor lock-in.

## Why Trail base?

Existing tools like RideWithGPS and Gaia GPS lock core features behind paid tiers and trap your data in proprietary platforms. Trail base is different:

- **Free and open-source** — no paywalled features, no subscription tiers
- **Data ownership** — import, export, and self-host your data at any time
- **Extensible** — architecture designed for community modules (map layers, routing engines, integrations)
- **Multi-activity** — bike, hike, and car routing from day one

## Features (MVP)

- **Authentication** — sign up, log in, password reset
- **Route management** — create, edit, list, view, and delete routes
- **Interactive route builder** — map-based waypoint placement with snap-to-road and point-to-point modes
- **Routing modes** — bike, hike, car
- **Elevation profiles** — view elevation data for any route
- **GPX import/export** — upload and download routes as `.gpx` files
- **Map layers** — street, satellite, and terrain views via MapLibre GL JS
- **Responsive** — works on desktop and mobile browsers

## Tech Stack

- **Server:** TypeScript, Hono, Drizzle ORM
- **Web App:** React + TypeScript (Vite)
- **Auth:** Better-Auth (session-based, Drizzle adapter)
- **Database:** PostgreSQL + PostGIS
- **Maps:** MapLibre GL JS (react-map-gl)
- **Routing:** Valhalla (self-hosted)
- **Shared:** Zod schemas, GPX parser, geo utilities
- **Infrastructure:** Docker (self-hostable)

## Getting Started

> Coming soon — the project is in early development.

## Project Structure

```
server/   # Hono API server (TypeScript)
app/      # React web app (Vite)
mobile/   # React Native app (future)
shared/   # Shared Zod schemas, types, GPX/geo utilities
docs/     # Documentation (PRD, architecture)
```

## Roadmap

| Phase | Focus |
|-------|-------|
| v0.1 | Auth, route CRUD, route builder, GPX import/export, MapLibre base layers |
| v0.2 | Public route sharing, points of interest |
| v0.3 | Extensible map layer system, community modules |
| v0.4 | GPS activity recording and stats |
| v1.0 | Native iOS/Android app with offline maps and navigation |

See [docs/PRD.md](docs/PRD.md) for product requirements and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design.

## Project Tracking

We use **GitHub Issues** to track all work:

- **Milestones** represent epics/phases (e.g., `v0.1`, `v0.2`)
- **Labels** categorize issues: `backend`, `frontend`, `shared`, `infra`, `bug`, `enhancement`
- Browse the [issues board](../../issues) to see what's in progress or available

## Contributing

Contributions are welcome! The project is in its early stages — check the [open issues](../../issues) or the PRD for areas where you can help.

## License

See [LICENSE](LICENSE) for details.
