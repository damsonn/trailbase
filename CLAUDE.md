# TrailBase

TypeScript monorepo: `server/` (Hono), `app/` (React/Vite), `shared/` (Zod schemas, GPX, geo utils), `mobile/` (future).

## Docs (source of truth)
- [docs/PRD.md](docs/PRD.md) — product requirements
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data model, API, adapters

## Conventions
- Repository pattern for data access
- All API responses use envelope pattern (`{ data, meta }` / `{ error }`)
- Write tests for all service-layer logic
- Zod schemas in `shared/` are the single source of truth for validation
