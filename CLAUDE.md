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

## Project Tracking
- **GitHub Issues** is the single source of truth for all tasks and epics
- **Milestones** = epics (e.g., "v0.1 - Core Trail Management")
- **Labels** = categorization (`backend`, `frontend`, `shared`, `infra`, `bug`, `enhancement`)
- Use `gh` CLI to create, list, update, and close issues
- When starting work on a task, assign the issue; when done, close it via PR or `gh issue close`
