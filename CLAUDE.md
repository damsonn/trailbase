# Project: trailbase
## Structure
This is a TypeScript monorepo managed with npm/pnpm workspaces.

```
trailbase/
├── server/          # Hono API server
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── repositories/    # Data access layer (repository pattern)
│   │   ├── services/        # Business logic
│   │   ├── middleware/       # Auth, error handling, logging
│   │   ├── db/
│   │   │   ├── schema.ts    # Drizzle schema definitions
│   │   │   └── migrations/  # Drizzle Kit migrations
│   │   └── index.ts         # Server entry point
│   ├── tests/
│   └── package.json
├── app/             # React web app (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client, map helpers
│   │   └── main.tsx         # App entry point
│   └── package.json
├── mobile/          # React Native app (future)
│   ├── src/
│   │   ├── components/      # RN UI components
│   │   ├── screens/         # Navigation screens
│   │   ├── hooks/           # Custom hooks
│   │   └── services/        # API client, map helpers
│   └── package.json
├── shared/          # Shared TypeScript package
│   ├── src/
│   │   ├── schemas/         # Zod schemas (API contracts, validation)
│   │   ├── types/           # Generated TypeScript types
│   │   ├── gpx/             # GPX parsing/serialization
│   │   └── geo/             # Route distance, elevation utilities
│   └── package.json
├── docs/            # Documentation
│   ├── PRD.md
│   └── ARCHITECTURE.md
├── docker-compose.yml
└── package.json     # Root workspace config
```


## Stack

### Language
- TypeScript everywhere (server, web, mobile, shared)

### Server (`server/`)
- Runtime: Node.js (or Bun)
- Framework: Hono
- ORM: Drizzle ORM
- Validation: Zod (schemas shared with frontend via `shared/`)
- Auth: Better-Auth (session-based, Drizzle adapter)
- GPX parsing: Server-side with shared logic in `shared/`

### Web App (`app/`)
- Framework: React + TypeScript (Vite)
- Maps: react-map-gl (MapLibre GL JS)
- Routing: React Router
- State management: TBD (start with React context, evaluate as needed)

### Mobile (future, `mobile/`)
- Framework: React Native + TypeScript
- Maps: @rnmapbox/maps
- Navigation: React Navigation

### Shared (`shared/`)
- Zod schemas for API contracts and validation
- TypeScript types generated from Zod schemas
- GPX parsing/serialization utilities
- Route domain logic (distance calculation, elevation processing)

### Database
- PostgreSQL + PostGIS (spatial queries for routes/waypoints)
- Migrations managed via Drizzle Kit

### Infrastructure
- Docker (self-hostable)
- Deployed to [TBD]

## Specs
- See docs/PRD.md for product requirements
- See docs/ARCHITECTURE.md for system design

## Conventions
- Use repository pattern for data access
- All API responses follow envelope pattern
- Write tests for all service-layer logic
