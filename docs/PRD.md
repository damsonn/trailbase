# Trail base - Product Requirements Document

> **Status:** Draft | **Last updated:** 2026-03-22
> This is a living document. Sections marked [TBD] will be expanded as the project evolves.
> Features are tagged by phase: `[MVP]` `[v0.2]` `[v0.3]` `[v1.0]`

---

## 1. Overview

**Trail base** is an open-source route management, viewer, and navigation platform for cycling, hiking, and driving. It combines deep route-planning capabilities with rich map-layer support — without subscriptions, vendor lock-in, or paywalled core features.

### Problem

Existing route-planning tools lock essential features (offline maps, GPX export, advanced layers) behind subscriptions. Users lose access to their own data when they stop paying, and have no way to extend or customise the tools they rely on. Commercial platforms face growing user frustration with software quality, pricing increases, and restrictive data practices.

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

| Capability | Commercial Route Planners | **Trail base** |
|-----------|--------------------------|---------------|
| Route planning | Advanced (often cycling-focused) | Snap-to-road + point-to-point, multi-activity |
| Activity types | Typically 1-2 (cycling or hiking) | Bike, hike, car |
| Map layers | 5-250 layers (premium tiers) | MapLibre base + extensible layer system |
| GPX import/export | Yes (often limited on free tier) | Yes (always free) |
| Offline maps | Paid | [TBD — future native app] |
| Route sharing | Yes | Yes |
| Open source | No | **Yes** |
| Self-hostable | No | **Yes** |
| Pricing | Free tier + $4-10/mo | **Free** |

### Key pain points we address

- **Vendor lock-in:** Routes and data trapped behind subscriptions
- **Paywall creep:** Core features (export, offline, layers) gated behind paid tiers
- **Software quality:** Complaints about bugs, unreliable routing, and degrading UX
- **No customisation:** Users cannot extend, modify, or self-host existing tools

---

## 4. MVP Scope (v0.1) — Summary

The MVP delivers the minimum loop: sign up, create routes, manage them, and exchange data via GPX. Detailed UX flows for each area are in Sections 5–10.

### 4.1 Authentication

| Feature | Details |
|---------|---------|
| Sign up | Email + password registration |
| Log in / log out | Session-based auth |
| Password reset | Email-based reset flow |

See [Section 9](#9-ux-flow-authentication) for flow details.

### 4.2 Route Management

| Feature | Details |
|---------|---------|
| List routes | Paginated list with search, sort, filter, expandable rows |
| View route | Two-panel detail page with stats, elevation profile, and interactive map |
| Delete route | Soft-delete with confirmation |

See [Section 5](#5-ux-flow-route-listing--management) and [Section 6](#6-ux-flow-route-viewing-detail-page).

### 4.3 Route Building

| Feature | Details |
|---------|---------|
| Create route | Three-panel planner with click-to-place waypoints and snap-to-road |
| Edit route | Modify waypoints, name, description, activity type on existing routes |
| Routing modes | Bike, hike, car, draw (straight-line) |

See [Section 7](#7-ux-flow-route-building-planner).

### 4.4 Import / Export

| Feature | Details |
|---------|---------|
| Import | Upload `.gpx` files to create routes |
| Export | Download any route as `.gpx` |
| Full data export | ZIP of all routes as GPX + JSON manifest |

See [Section 8](#8-ux-flow-import--export).

### 4.5 Map

| Feature | Details |
|---------|---------|
| Renderer | MapLibre GL JS |
| Layers | Street, satellite, terrain/topo |
| Controls | Zoom, pan, geolocate, fullscreen, layer switching |

See [Section 10](#10-map--layer-system).

---

## 5. UX Flow: Route Listing & Management

> **URL:** `/routes`
> **Access:** Main navigation → **Routes**

### 5.1 Page Layout Overview

```
┌─────────────────────────────────────────────────────┐
│  App Header (logo, nav, user menu)                  │
├──────────┬──────────────────────────────────────────┤
│          │  Filter Bar  [MVP: activity type]        │
│  Left    │  Sort Controls  [MVP: 3 fields]          │
│  Sidebar │  Search Bar  [MVP: keyword]              │
│  (nav)   │──────────────────────────────────────────│
│          │  Route List                              │
│          │  ┌─ Row: name, type, distance, elev... ─┐│
│          │  │  [expand chevron] → inline detail    ││
│          │  └──────────────────────────────────────┘│
│          │  ... more rows ...                       │
│          │  Pagination                              │
└──────────┴──────────────────────────────────────────┘
```

### 5.2 Filter Bar `[MVP]`

A horizontal row of filter controls at the top of the content area.

**MVP filters:**

| Filter | Control Type | Default | Behaviour |
|--------|-------------|---------|-----------|
| Activity Type | Dropdown (multi-select checkboxes) | All types | Filter by bike / hike / car |

**Future filters `[v0.2]`:**

| Filter | Control Type | Default | Behaviour |
|--------|-------------|---------|-----------|
| Distance | Range slider | Any length | Filter by route distance range |
| Elevation Gain | Range slider | Any elevation | Filter by elevation gain range |
| Created On | Date range calendar picker | Any dates | Filter by creation date range |
| Updated On | Date range calendar picker | Any dates | Filter by last-updated date range |
| Collections | Checkbox list of user collections | None selected | Filter to routes in selected collections |
| Options | Multi-section panel | All defaults | Archived (checkbox), Ownership (radio: anyone/you/not you), Privacy (checkboxes: public/private) |

Each active filter highlights its dropdown. A **Clear** link on each filter resets it.

### 5.3 Sort Controls `[MVP]`

| Control | Type | Options |
|---------|------|---------|
| Sort By | Radio group | Created On _(default)_, Name, Distance |
| Sort Order | Radio group | Ascending, Descending _(default)_ |

Changes apply immediately on selection.

**Future sort fields `[v0.2]`:** Updated On, Elevation Gain.

### 5.4 Search `[MVP]`

Below the filter bar, a full-width search row:

| Input | Placeholder | Icon | Behaviour |
|-------|------------|------|-----------|
| Keyword search | `Search routes...` | Magnifying glass | Free-text search across route names |

**Future `[v0.2]`:**

| Input | Placeholder | Behaviour |
|-------|------------|-----------|
| Location search | `Start location (city, state)` | Filters routes by starting location proximity |
| Radius selector | `within 25 km` | Configurable radius: 10 / 25 / 50 / 100 / 250 km |

### 5.5 Route List `[MVP]`

#### 5.5.1 Column Layout

Each route row displays:

| Column | Content |
|--------|---------|
| Checkbox | Selects route for bulk actions `[v0.2]` |
| Route name | Bold clickable link; sub-text shows starting city/region |
| Activity type | Icon badge (bike / hike / car) |
| Distance | e.g., `62.7 km` |
| Elevation Gain | e.g., `701 m` |
| Privacy | Badge: `Public` or `Private` `[v0.2: add Friends Only]` |
| Date | Created date (e.g., `3/7/2026`) |
| Map thumbnail | Small static route map preview |
| Chevron (expand) | Expands/collapses the row detail panel |

#### 5.5.2 Row Hover Actions `[MVP]`

Hovering a row reveals action icons:

| Icon | Action |
|------|--------|
| Edit (pencil) | Opens Route Builder for this route |
| Delete (trash) | Deletes route (with confirmation dialog) |

**Future hover actions `[v0.2]`:** Pin/unpin to Pinned collection.

#### 5.5.3 Expanded Row Detail `[MVP]`

Clicking the chevron expands a two-column detail panel below the row:

**Left column — Route summary:**
- Route name (heading)
- **Created:** Date and time
- **Starts in:** City, Region
- **Distance:** e.g., `62.7 km`
- **Elevation:** e.g., `+701 m / -701 m`
- **Export** button (downloads GPX)
- **View Full Details** link → navigates to route detail page

**Future additions `[v0.2]`:** Max Grade stat, Share link, Send to Device button with FIT dropdown.

**Right column — Mini map:**
- Interactive map preview of the route geometry
- Elevation profile chart below the map

### 5.6 Map View `[v0.2]`

**Trigger:** Click `Show Map` toggle button (right side of search bar)

The content area becomes an interactive map. Route list is hidden. Button changes to `Show List` to return.

**Map behaviour:**
- Routes plotted as colored lines
- Cluster circles show count of routes in an area
- Start points marked with pins
- Clicking a route shows its details

**Future `[v0.3]`:** Heatmaps, photo markers, layer controls overlay.

### 5.7 Bulk Actions `[v0.2]`

**Trigger:** Check any route's checkbox. Filter bar is replaced with a bulk-actions toolbar.

| Control | Type | Description |
|---------|------|-------------|
| Header checkbox | Checkbox | Select / deselect all routes |
| **Set Privacy** | Dropdown | Set privacy for all selected routes (Public / Private) |
| **Organize in Collections** | Dropdown | Add/remove selected routes from collections |
| **Archive** | Button | Archive selected routes |
| Delete | Icon button | Delete selected routes (with confirmation) |

### 5.8 User Journey

```
Entry: Navigate to /routes
    │
    ├─ Browse list (default: sorted by Created On, descending)
    │       │
    │       ├─ Filter by activity type [MVP]
    │       ├─ Sort by Created On / Name / Distance [MVP]
    │       ├─ Search by keyword [MVP]
    │       │
    │       ├─ [Row: hover] → Quick actions (Edit / Delete) [MVP]
    │       ├─ [Row: click chevron] → Expand inline preview [MVP]
    │       │       └─ Export GPX / View Full Details
    │       └─ [Row: click name] → Navigate to Route Detail view
    │
    ├─ [v0.2] Apply advanced filters (Distance / Elevation / Date / Collections)
    ├─ [v0.2] Search by start location + radius
    ├─ [v0.2] Switch to Map View
    └─ [v0.2] Bulk select → Set Privacy / Collections / Archive / Delete
```

---

## 6. UX Flow: Route Viewing (Detail Page)

> **URL:** `/routes/:id`
> **Access:** Click a route name from the listing page, or direct URL

### 6.1 Page Layout Overview

```
┌──────────────────────────────────────────────────────────┐
│  App Header                                              │
├────────────────────────┬─────────────────────────────────┤
│  Left Panel            │  Right Panel                    │
│  (scrollable)          │  (full height)                  │
│                        │                                 │
│  ┌──────────────────┐  │  ┌───────────────────────────┐  │
│  │ Action Bar       │  │  │                           │  │
│  │ [Edit][Export]   │  │  │    Interactive Map         │  │
│  │ [Delete]         │  │  │    (route line, controls)  │  │
│  ├──────────────────┤  │  │                           │  │
│  │ Route Header     │  │  │                           │  │
│  │ Title + Badge    │  │  ├───────────────────────────┤  │
│  ├──────────────────┤  │  │  Elevation Profile Chart  │  │
│  │ Stats Grid       │  │  │  [Ele] [Surfaces] [Grade] │  │
│  ├──────────────────┤  │  └───────────────────────────┘  │
│  │ Metadata         │  │                                 │
│  ├──────────────────┤  │                                 │
│  │ [v0.2] Surfaces  │  │                                 │
│  │ [v0.2] Cuesheet  │  │                                 │
│  │ [v0.2] Climbs    │  │                                 │
│  └──────────────────┘  │                                 │
└────────────────────────┴─────────────────────────────────┘
```

### 6.2 Action Bar `[MVP]`

Buttons at the top of the left panel:

| Button | Type | Behaviour |
|--------|------|-----------|
| `Edit` | Button | Opens Route Builder for this route |
| `Export` | Button | Downloads route as GPX file |
| `Delete` | Button | Soft-deletes route (with confirmation dialog) |

**Future actions `[v0.2]`:**

| Button | Type | Behaviour |
|--------|------|-----------|
| `Save` | Dropdown | Save to a collection (checkbox list of collections, + New Collection) |
| `Share` | Modal trigger | Opens share dialog (see 6.2.1) |
| `More` | Dropdown | Additional actions (see 6.2.2) |

#### 6.2.1 Share Dialog `[v0.2]`

Modal with three tabs:

**Tab 1: Link**
- Copy Link, Embed code, Social share buttons (Facebook, X)
- Add People: search friends or enter email, assign role (Viewer/Editor), Send
- Visibility dropdown: Public / Private
- Toggle: "Allow anyone with the link to view"

**Tab 2: QR Code**
- QR code image for the route URL
- Download / Copy buttons

**Tab 3: Image**
- Shareable route card preview (map thumbnail, name, distance, elevation, max grade)
- Download button

#### 6.2.2 More Dropdown `[v0.2+]`

| Action | Phase | Description |
|--------|-------|-------------|
| Export as File | `[v0.3]` | Opens full export dialog (FIT/TCX/GPX/KML/CSV/images) |
| Print Map & Cue PDF | `[v0.3]` | Generates printable PDF with map + cuesheet |
| Print Cuesheet | `[v0.3]` | Generates printable cuesheet only |
| Open Copy in Builder | `[v0.2]` | Opens a duplicate in the route builder |
| Copy to My Routes | `[v0.2]` | Creates a copy in your library |
| Version History | `[v0.2]` | View past saved versions of the route |
| Replace Elevation Data | `[v0.3]` | Re-fetches elevation from DEM data |
| Delete | `[MVP]` | Permanently deletes the route |

### 6.3 Route Header `[MVP]`

- **Route title** (large heading)
- **By [Author name]** (link to author profile)
- **Privacy badge** — pill-shaped: `PUBLIC` or `PRIVATE` (`[v0.2]`: add `FRIENDS ONLY`)

### 6.4 Stats Grid `[MVP]`

Six stats in a 3x2 grid:

| Stat | Icon | Example | Phase |
|------|------|---------|-------|
| Distance | circle | `29.7 km` | `[MVP]` |
| Elevation gain | `+` | `384 m` | `[MVP]` |
| Elevation loss | `−` | `384 m` | `[MVP]` |
| Estimated time | clock | `1:24` | `[MVP]` |
| Max uphill grade | ↗ | `7.9%` | `[v0.2]` |
| Max downhill grade | ↘ | `-7.8%` | `[v0.2]` |

### 6.5 Route Metadata `[MVP]`

Below the stats grid:

| Field | Icon | Example |
|-------|------|---------|
| Location | pin | `Augusta-Margaret River, Western Australia` |
| Created | pencil | `Created Feb 9, 2026` |

**Future `[v0.2]`:** Views count (e.g., `Private (0 views)`), Photos section with upload area.

### 6.6 Surfaces Section `[v0.2]`

Table of surface types with distance and percentage:

| Surface | Distance | Percentage |
|---------|----------|------------|
| Paved | `6.7 km` | `23%` |
| Unpaved | `22.8 km` | `77%` |
| Unknown | `0 km` | `0%` |

Info tooltip explains surface data source.

### 6.7 Cuesheet Section `[v0.2]`

Expandable list of turn-by-turn directions:

- **Start of Route** — `0.0 km`
  - Stats summary row (distance, elevation, time)
- Individual cue points with direction type and road name
- **End of Route** — final distance

### 6.8 Climbs Section `[v0.2]`

List of detected climbs, each showing:
- Distance (e.g., `0.9 km`)
- Elevation (e.g., `41 m`)
- Average grade (e.g., `4.1%`)

### 6.9 Map Panel `[MVP]`

Full-height right panel with interactive map.

#### 6.9.1 Map Controls

| Control | Description | Phase |
|---------|-------------|-------|
| Fullscreen toggle | Expands map to full browser window | `[MVP]` |
| Layer switcher | Toggle base layer (Street / Satellite / Topo) | `[MVP]` |
| Zoom (+/−) | Zoom in/out | `[MVP]` |
| Layers overlay | Toggle map overlays | `[v0.2]` |
| Heatmaps | Toggle activity heatmaps | `[v0.3]` |
| Settings | Map display settings | `[v0.3]` |

#### 6.9.2 Map Interaction

| Feature | Description | Phase |
|---------|-------------|-------|
| Route line | Colored line showing route geometry | `[MVP]` |
| Directional arrows | Arrows on route line showing travel direction | `[MVP]` |
| Start/end markers | Green marker at start, red at end | `[MVP]` |
| Grade tooltip | Hover over route line shows grade at that point | `[v0.2]` |

#### 6.9.3 Map Style Selector

Dropdown to change the base map tile:

| Style | Description | Phase |
|-------|-------------|-------|
| Street | Default street/road map | `[MVP]` |
| Satellite | Aerial imagery | `[MVP]` |
| Topo | Contour lines, terrain shading | `[MVP]` |
| OpenStreetMap | OSM tile fallback | `[MVP]` |

### 6.10 Elevation Profile Chart `[MVP]`

Full-width chart below the map panel.

**MVP — Elevation tab:**
- Area chart showing elevation over distance
- Hover tooltip showing elevation (m) and distance (km) at cursor position
- Stats bar: `29.7 km · +384 m / -384 m`

**Future chart tabs `[v0.2]`:**

| Tab | Description |
|-----|-------------|
| Surfaces | Color-coded by surface type (paved/unpaved/unknown) |
| Grade | Color-coded by gradient steepness |
| Waypoints | Shows named waypoints along the route |

**Future chart controls `[v0.2]`:** Expand/collapse chart height, drag-to-zoom on a segment, zoom reset.

### 6.11 User Journey

```
Entry: Click route name from listing → /routes/:id
    │
    ├─ View stats & metadata [MVP]
    │       ├─ Read distance, elevation gain/loss, estimated time
    │       └─ See location, created date
    │
    ├─ Interact with map [MVP]
    │       ├─ Zoom / pan
    │       ├─ Switch map style (Street / Satellite / Topo)
    │       ├─ Toggle fullscreen
    │       └─ Hover elevation profile for segment data
    │
    ├─ Edit → Opens Route Builder [MVP]
    │
    ├─ Export → Download as GPX [MVP]
    │
    ├─ Delete → Confirmation → soft-delete [MVP]
    │
    ├─ [v0.2] Save → Add to collection
    ├─ [v0.2] Share → Copy link / QR / Social / Image
    ├─ [v0.2] View Surfaces / Cuesheet / Climbs
    ├─ [v0.2] Elevation chart: Surfaces / Grade / Waypoints tabs
    │
    └─ [v0.3] More → Full export dialog / Print PDF / Version History
```

---

## 7. UX Flow: Route Building (Planner)

> **Creating URL:** `/routes/new`
> **Editing URL:** `/routes/:id/edit`
> **Access:** Main navigation → **New Route**, or Route Detail → **Edit**

### 7.1 Page Layout Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  App Header                                                      │
├────────────────┬──────────────────────────────┬──────────────────┤
│  Left Panel    │  Map Canvas                  │  Right Panel     │
│  (metadata)    │  (full height)               │  (tools)         │
│                │                              │                  │
│  ┌──────────┐  │  ┌──────────────────────┐    │  ┌────────────┐  │
│  │ Route    │  │  │                      │    │  │ Undo/Redo  │  │
│  │ Card     │  │  │  Interactive map      │    │  │ Clear      │  │
│  │ name     │  │  │  with route line      │    │  ├────────────┤  │
│  │ dist/elev│  │  │                      │    │  │ Location   │  │
│  │ time     │  │  │  Click to place      │    │  │ Search     │  │
│  └──────────┘  │  │  waypoints           │    │  ├────────────┤  │
│                │  │                      │    │  │ Routing    │  │
│                │  │                      │    │  │ Mode       │  │
│  ┌──────────┐  │  └──────────────────────┘    │  ├────────────┤  │
│  │ [MVP]    │  │                              │  │ [v0.2]     │  │
│  │ Save     │  │                              │  │ Route Tools│  │
│  └──────────┘  │                              │  └────────────┘  │
└────────────────┴──────────────────────────────┴──────────────────┘
```

### 7.2 Entry Points

#### 7.2.1 Creating a New Route `[MVP]`

**Via:** Main navigation → **New Route**, or direct `/routes/new`

Opens an empty planner with `Unnamed route`, 0 km, ready for waypoint placement.

**Future `[v0.3]` — Session Resume:** If a previous unsaved session exists, show a dialog:
> "Would you like to resume your last planning session?"
> - **Start a new route** — clears previous session
> - **Resume planning** — restores last unsaved state

#### 7.2.2 Editing an Existing Route `[MVP]`

**Via:** Route detail page → **Edit** button

The planner loads with existing route geometry, waypoints, and metadata pre-populated.

### 7.3 Left Panel

#### 7.3.1 Route Card `[MVP]`

Displays live stats that update as the route is drawn:

| Field | Example |
|-------|---------|
| Route name | `Dam plus Climb` (or `Unnamed route` for new) |
| Distance | `29.7 km` |
| Elevation gain | `384 m` |
| Estimated time | `1:24 hr` |

**Future `[v0.2]` — Context menu (three-dot icon):**

| Action | Description |
|--------|-------------|
| Set Name | Edit route name inline |
| Version History | Browse previous saves |
| Revert to Last Save | Discard unsaved changes |
| Open in New Tab | View route detail in new tab |
| Remove Route | Remove this route from planner canvas |

#### 7.3.2 Import Button `[v0.3]`

Button at the top of the left panel. Opens the Import modal (see [Section 8.2](#82-import-in-route-planner-v03)).

#### 7.3.3 Surfaces Section `[v0.2]`

Automatically calculated breakdown based on drawn route:
- Paved — distance (km) — percentage
- Unpaved — distance (km) — percentage
- Unknown — distance (km) — percentage

#### 7.3.4 Cuesheet Section `[v0.3]`

**When empty:** `Click on map to generate cuesheet`

**When populated:** Expandable list of turn points:
- **Start of Route** — `0.0 km`
- Individual cue points (direction type + road name + distance)
- **End of Route** — final distance

#### 7.3.5 Bottom Action Bar `[MVP]`

| Control | Description | Phase |
|---------|-------------|-------|
| **Save** | Orange full-width button. New routes: opens save dialog. Existing: saves in place | `[MVP]` |
| **Review Cues** | Opens Cue Review mode (see 7.9) | `[v0.3]` |

### 7.4 Map Canvas `[MVP]`

#### 7.4.1 Route Drawing Interaction

When **Add to Route** mode is active (default):

| Action | Result | Phase |
|--------|--------|-------|
| Click on map | Places a waypoint; auto-routes from the last point via routing engine | `[MVP]` |
| Drag a waypoint | Repositions it; route recalculates between adjacent points | `[MVP]` |
| Click existing segment | Adds a control point mid-route | `[v0.2]` |

The route line is drawn in the selected route color.

**Future visual elements `[v0.2]`:**
- Numbered cue badges along the route
- Directional arrows showing travel direction
- Distance markers (km/mi) along the route

#### 7.4.2 Map Controls

| Control | Description | Phase |
|---------|-------------|-------|
| Fullscreen | Expand map to full browser window | `[MVP]` |
| Layer switcher | Toggle base layer (Street / Satellite / Topo) | `[MVP]` |
| Zoom (+/−) | Zoom in/out buttons | `[MVP]` |
| Location search pin | Search and pan to a location | `[MVP]` |
| Layers overlay | Toggle map overlays (cycling routes, terrain) | `[v0.2]` |
| Heatmaps | Toggle personal/global heatmap overlay | `[v0.3]` |
| Settings | Planning settings panel (see 7.7) | `[v0.3]` |

### 7.5 Right Tools Panel

#### 7.5.1 Undo / Redo / Clear `[MVP]`

| Control | Icon | Description |
|---------|------|-------------|
| Undo | ↩ | Undo last waypoint action |
| Redo | ↪ | Redo last undone action |
| Clear | ✕ | Remove all route geometry (with confirmation) |

#### 7.5.2 Location Search `[MVP]`

Text input: `Enter a location`

Searches and pans the map to the specified location. Does not place a waypoint.

#### 7.5.3 Routing Mode Selector `[MVP]`

Four routing modes — selecting one changes how new segments are routed:

| Icon | Mode | Description | Phase |
|------|------|-------------|-------|
| Bicycle | **Bicycle** _(default)_ | Routes via cycling infrastructure and roads | `[MVP]` |
| Walking | **Walking** | Routes via pedestrian paths and trails | `[MVP]` |
| Car | **Car** | Routes via roads optimized for driving | `[MVP]` |
| Pen | **Draw** | No auto-routing; draws straight lines between clicks | `[MVP]` |

**Future `[v0.2]` — Surface Type sub-selector** (visible in Bicycle/Walking mode):

| Option | Description |
|--------|-------------|
| Any surface _(default)_ | No surface preference |
| Paved | Prefer paved roads/paths |
| Unpaved | Prefer unpaved trails/gravel |

#### 7.5.4 Edit Mode Buttons `[MVP / v0.3]`

| Button | Description | Phase |
|--------|-------------|-------|
| **Add to Route** _(default)_ | Click map to draw route with auto-routing | `[MVP]` |
| **Custom POI** | Place a custom Point of Interest marker | `[v0.3]` |
| **Custom Cue** | Place a custom cue annotation | `[v0.3]` |
| **Control Point** | Place a control point (route passes through, no cue generated) | `[v0.3]` |

#### 7.5.5 Route Tools `[v0.2+]`

Grid of operation buttons (greyed out when route is empty):

| Button | Description | Phase |
|--------|-------------|-------|
| **Reverse Route** | Flips route direction (start ↔ end) | `[v0.2]` |
| **Out and Back** | Appends a return segment mirroring the outbound route | `[v0.2]` |
| **Duplicate** | Creates a copy of the route in the planner | `[v0.3]` |
| **Split Route** | Splits the route at a selected point into two segments | `[v0.3]` |
| **Trace** | Trace along existing GPS tracks/activities | `[v0.3]` |
| **Selection Tools** | Select a portion of the route for sub-operations | `[v0.3]` |

#### 7.5.6 Route Color `[v0.2]`

Color palette for the route line: Red _(default)_, Orange, Green, Teal, Purple, Brown, Black.

#### 7.5.7 Delete Actions `[v0.3]`

| Button | Description |
|--------|-------------|
| Delete Cues | Delete all generated cue points |
| Delete Points of Interest | Delete all custom POIs |

### 7.6 Map Canvas Settings Panel `[v0.3]`

**Trigger:** Settings button in map toolbar.

**Map Overlays** (checkboxes):
- Surfaces (color-codes roads by surface type)
- Cue Icons (shows turn icons on map)
- Custom POI
- Distance Markers
- Directional Arrows

**Options** (checkboxes):
- Auto Center (keeps current position centered)
- Zoom by Scrolling
- Generate Cuesheet (auto-generate turn cues when routing)

**Units** (radio buttons):
- Imperial / Metric _(default)_

### 7.7 Saving `[MVP]`

**New routes:** Opens a save dialog with:
- Route name (text input, required)
- Description (text area, optional)
- Activity type (dropdown: Bike / Hike / Car)
- Privacy (radio: Public / Private) `[v0.2: add Friends Only]`

**Existing routes:** Saves in place immediately (no dialog).

**Future `[v0.2]`:** Revert to Last Save via route card context menu.
**Future `[v0.3]`:** Version History — browse and restore previous saved versions.

### 7.8 Cue Review Mode `[v0.3]`

**Trigger:** `Review Cues` button in left panel bottom bar.

**Left panel becomes:**
- Route name + distance + elevation + time (header)
- Progress indicator: `0% completed (0 / N cues)`
- Scrollable list of cue points, each showing:
  - Direction type (Left, Right, Sharp Right, Straight, Slight Left, etc.)
  - Full cue text (e.g., `Turn left onto Margaret River Walkway`)
  - Distance from start
  - Elevation at point

**Right panel becomes:**
- `← Return to the Route Planner` back link
- **Type** dropdown (direction type with arrow icon)
- **Notes** text input (pre-filled with auto-generated direction)
- **Description** text area (optional)
- **Previous** / **Delete** / **Confirm** buttons

**Map:** Zooms to current cue point; active cue highlighted.

**Workflow:**
1. First cue auto-selected
2. Review/edit Type and Notes
3. **Confirm** → marks as reviewed, advances to next
4. **Delete** → removes that cue
5. Progress bar updates
6. **Close Review** → returns to Route Planner

### 7.9 User Journey: Creating a New Route

```
Navigate to /routes/new
    │
    ├─ [v0.3] [If previous session exists] → Resume or Start New?
    │
    ├─ Blank planner loads ("Unnamed route", 0 km)
    │
    ├─ [Optional] Enter a location → map pans [MVP]
    │
    ├─ Select Routing Mode (Bicycle / Walking / Car / Draw) [MVP]
    │
    ├─ Draw route on map: [MVP]
    │       ├─ Click waypoints (auto-routes between them)
    │       ├─ Drag waypoints to adjust
    │       └─ Left panel updates: distance, elevation, time
    │
    ├─ [v0.2] Apply Route Tools (Reverse / Out and Back)
    ├─ [v0.2] Select Surface Type preference
    ├─ [v0.2] Choose Route Color
    │
    ├─ [v0.3] Add POIs / Custom Cues / Control Points
    ├─ [v0.3] Review Cues (step through, confirm/edit/delete)
    │
    └─ Save → route created, navigate to route detail page [MVP]
```

### 7.10 User Journey: Editing an Existing Route

```
Route detail page → Edit button
    │
    ├─ Planner loads with existing route geometry [MVP]
    │
    ├─ Modify route: [MVP]
    │       ├─ Drag waypoints to reroute segments
    │       ├─ Click to add new waypoints
    │       └─ Adjust routing mode
    │
    ├─ [v0.2] Use route card context menu → Set Name
    ├─ [v0.2] Revert to Last Save if needed
    ├─ [v0.3] Version History → restore a previous version
    ├─ [v0.3] Review Cues
    │
    └─ Save → overwrites existing route [MVP]
```

---

## 8. UX Flow: Import & Export

### 8.1 Import: Upload Page `[MVP]`

> **URL:** `/upload`
> **Access:** Main navigation → **Upload**

#### Layout

**Main area:**
- Page heading: `UPLOAD GPS FILES`
- Drag-and-drop zone:
  - Upload arrow icon
  - **Drag and drop or select files to upload to your account**
  - **Accepted file types: GPX files** `[v0.2: add TCX]` `[v0.3: add FIT, KML]`
  - **Browse Files** button — opens native file picker

#### Upload Behaviour

1. User drags a GPX file onto the drop zone, or clicks **Browse Files**
2. File is uploaded, parsed, and validated
3. A new route is created from the file's track/route data
4. User is redirected to the newly created route detail page

### 8.2 Import in Route Planner `[v0.3]`

**Trigger:** Planner left panel → `Import` button

**Modal: Import Routes**

| Element | Description |
|---------|-------------|
| Search input | Full-text search across user's existing routes |
| Upload icon | Upload a file from disk (opens file picker) |
| Filter icon | Opens filter panel |

**Results list:** Shows matching routes with name, stats (distance, elevation, location), and map thumbnail.

**Filter panel:**

| Field | Type | Description |
|-------|------|-------------|
| Starts within | Dropdown + location input | Filter by proximity |
| Length | Range slider | Filter by distance |
| Elevation | Range slider | Filter by elevation gain |

**Actions:**
- **Cancel** — dismiss modal
- **Add to Planner** — overlays selected route onto the map canvas

### 8.3 Export: From Route Detail `[MVP]`

**Location:** Route detail page → **Export** button in action bar

**MVP:** Single action — downloads route as `.gpx` file (GPX Track format).

**Future: Full Export Dialog `[v0.3]`**

**Trigger:** `More → Export as File` or dedicated Export button

Modal with expandable accordion rows for each format:

| Format | Extension | Description | Phase |
|--------|-----------|-------------|-------|
| **GPX Track** | `.gpx` | Universal GPS format. General-purpose export | `[MVP]` |
| **FIT Course** | `.fit` | Best for Garmin Edge devices. Options: Notify before turn (checkbox), Turn Notification Distance slider (default 30m) | `[v0.3]` |
| **TCX Course** | `.tcx` | For Garmin devices and TrainingPeaks | `[v0.2]` |
| **TCX History** | `.tcx` | Activity history format for fitness platforms | `[v0.2]` |
| **Google Earth** | `.kml` | View route in Google Earth | `[v0.3]` |
| **GPX Route** | `.gpx` | Waypoint-to-waypoint variant for navigation apps | `[v0.3]` |
| **Cuesheet CSV** | `.csv` | Spreadsheet analysis, custom cue cards | `[v0.3]` |
| **Map/Profile Images** | `.png` | Visual snapshot of route map and elevation profile | `[v0.3]` |

Each format row expands to show options and a **Download** button.

### 8.4 Export: Full Account Data `[MVP]`

**Location:** Account settings → **Export My Data**

Downloads a ZIP file containing:
- All routes as individual GPX files
- A `manifest.json` with route metadata (names, descriptions, dates, activity types)

This fulfills the data sovereignty guarantee (see Architecture doc §4.3).

### 8.5 Print Options `[v0.3]`

**Trigger:** Route detail → `More → Print`

| Option | Description |
|--------|-------------|
| **Print Map & Cue PDF** | PDF with route map + full cuesheet |
| **Print Cuesheet** | Printable cuesheet only (no map) |

### 8.6 Supported Formats Reference

| Format | Extension | Import | Export | Phase |
|--------|-----------|--------|--------|-------|
| GPX Track | `.gpx` | `[MVP]` | `[MVP]` | v0.1 |
| GPX Route | `.gpx` | `[MVP]` | `[v0.3]` | v0.1 / v0.3 |
| TCX Course | `.tcx` | `[v0.2]` | `[v0.2]` | v0.2 |
| TCX History | `.tcx` | `[v0.2]` | `[v0.2]` | v0.2 |
| FIT Course | `.fit` | `[v0.3]` | `[v0.3]` | v0.3 |
| KML | `.kml` | `[v0.3]` | `[v0.3]` | v0.3 |
| Cuesheet CSV | `.csv` | — | `[v0.3]` | v0.3 |
| Map/Profile Image | `.png` | — | `[v0.3]` | v0.3 |

### 8.7 User Journey: Upload a GPX File

```
Navigate to /upload [MVP]
    │
    ├─ Drag & drop .gpx file onto drop zone
    │   OR click Browse Files → select from file picker
    │
    ├─ File uploaded, parsed, validated
    │
    └─ Redirected to new route detail page
```

### 8.8 User Journey: Export a Route

```
Open route detail page (/routes/:id)
    │
    ├─ [MVP] Export button → Download .gpx file
    │
    ├─ [v0.3] More → Export as File
    │       ├─ GPX Track (.gpx)
    │       ├─ FIT Course (.fit) — with notification options
    │       ├─ TCX Course (.tcx)
    │       ├─ TCX History (.tcx)
    │       ├─ Google Earth (.kml)
    │       ├─ GPX Route (.gpx)
    │       ├─ Cuesheet CSV (.csv)
    │       └─ Map/Profile Images (.png)
    │
    └─ [v0.3] More → Print Map & Cue PDF / Print Cuesheet
```

---

## 9. UX Flow: Authentication

### 9.1 Registration `[MVP]`

> **URL:** `/register`

**Form fields:**
- Email (text input, required, validated as email format)
- Password (password input, required, min 8 characters)
- Confirm Password (password input, must match)
- **Create Account** button

**On success:** Redirect to `/routes` (route listing).
**On error:** Inline field validation messages.

### 9.2 Login `[MVP]`

> **URL:** `/login`

**Form fields:**
- Email (text input)
- Password (password input)
- **Log In** button
- **Forgot Password?** link → navigates to password reset

**On success:** Redirect to `/routes` or the page the user was trying to access.
**On error:** Generic error message ("Invalid email or password") — no field-specific hints for security.

### 9.3 Logout `[MVP]`

**Trigger:** User menu (top-right) → **Log Out**

Destroys server session, clears cookies, redirects to `/login`.

### 9.4 Password Reset `[MVP]`

**Step 1:** `/forgot-password`
- Email input + **Send Reset Link** button
- Success message: "If an account exists with that email, we've sent a reset link."

**Step 2:** `/reset-password?token=xxx`
- New Password input
- Confirm Password input
- **Reset Password** button
- On success: redirect to `/login` with success message

---

## 10. Map & Layer System

### 10.1 Map Renderer `[MVP]`

**MapLibre GL JS** — open-source (BSD), compatible with Mapbox Style Spec, supports vector and raster tiles.

All map instances (listing, detail, planner) share the same renderer configuration.

### 10.2 Built-in Layers `[MVP]`

| Layer | Source | Type | Notes |
|-------|--------|------|-------|
| Street | Mapbox Streets or OSM | Vector | Default base layer |
| Satellite | Mapbox Satellite | Raster | Aerial imagery |
| Topo / Terrain | Mapbox Outdoors | Vector | Contour lines, terrain shading |
| OpenStreetMap | OSM tile servers | Raster | Self-host fallback option |

### 10.3 Layer Switching UX `[MVP]`

A layer-switcher control available on all map instances:

- Positioned in the top-right corner of the map
- Shows available base layers as a dropdown or radio-button list
- Switching applies immediately; last-used layer is persisted in user preferences

### 10.4 Custom Layers `[v0.3]`

Users and instance admins can register additional layers:

- **Raster tile URLs** — any XYZ/TMS source (e.g., Thunderforest, USGS topo)
- **Vector tile styles** — MapLibre-compatible style JSON
- **WMS/WMTS** (future) — OGC standard tile services

Layer definitions stored in the database, shareable across instances.

### 10.5 Heatmaps `[v0.3]`

Toggle overlay showing activity density:
- Global heatmap (all public activities)
- Personal heatmap (user's own activities)

---

## 11. Technical Constraints (MVP)

| Concern | Decision |
|---------|----------|
| Routing engine | Valhalla (self-hosted, MIT license) — supports bike, hike, and car profiles |
| Map tiles | MapLibre GL JS with configurable tile sources (Mapbox, OSM, or custom) |
| GPX parsing | Server-side parsing and validation |
| Elevation data | Source from routing engine or Mapbox Terrain API |
| Responsive design | Web app must work on desktop and mobile browsers (no native app yet) |

---

## 12. Feature Phase Matrix

Single reference table mapping every feature to its target phase.

### Route Listing & Management

| Feature | MVP | v0.2 | v0.3 | v1.0 |
|---------|-----|------|------|------|
| Paginated route list | x | | | |
| Activity type filter | x | | | |
| Keyword search | x | | | |
| Sort (Created On / Name / Distance) | x | | | |
| Expandable row detail | x | | | |
| Row hover: Edit / Delete | x | | | |
| Distance / Elevation range filters | | x | | |
| Date range filters | | x | | |
| Collections filter | | x | | |
| Options filter (archived, ownership, privacy) | | x | | |
| Location search with radius | | x | | |
| Sort by Updated On / Elevation Gain | | x | | |
| Map view toggle | | x | | |
| Bulk actions | | x | | |

### Route Viewing

| Feature | MVP | v0.2 | v0.3 | v1.0 |
|---------|-----|------|------|------|
| Two-panel layout (info + map) | x | | | |
| Action bar: Edit / Export / Delete | x | | | |
| Stats grid (distance, elev gain/loss, time) | x | | | |
| Route metadata (location, created date) | x | | | |
| Elevation profile chart (elevation tab) | x | | | |
| Map with route line, markers, fullscreen | x | | | |
| Layer switching (Street / Satellite / Topo) | x | | | |
| Max uphill/downhill grade | | x | | |
| Save to Collection | | x | | |
| Share dialog (link, QR, image) | | x | | |
| Surfaces section | | x | | |
| Cuesheet section | | x | | |
| Climbs section | | x | | |
| Photos section | | x | | |
| Elevation chart: Surfaces / Grade / Waypoints tabs | | x | | |
| Grade tooltip on map hover | | x | | |
| Version History | | x | | |
| Full export dialog (multi-format) | | | x | |
| Print PDF options | | | x | |
| Send to Device | | | x | |
| Reviews & Comments | | | x | |
| Heatmaps | | | x | |

### Route Building

| Feature | MVP | v0.2 | v0.3 | v1.0 |
|---------|-----|------|------|------|
| Three-zone planner layout | x | | | |
| Click-to-place waypoints with snap-to-road | x | | | |
| Drag waypoints to reposition | x | | | |
| Route card (name, distance, elevation, time) | x | | | |
| Routing modes (Bicycle / Walking / Car / Draw) | x | | | |
| Undo / Redo / Clear | x | | | |
| Location search (pan map) | x | | | |
| Save (dialog for new, instant for edit) | x | | | |
| Reverse Route | | x | | |
| Out and Back | | x | | |
| Surface type sub-selector | | x | | |
| Route color picker | | x | | |
| Distance markers & directional arrows | | x | | |
| Surfaces section in left panel | | x | | |
| Revert to Last Save | | x | | |
| Route card context menu | | x | | |
| Session resume dialog | | | x | |
| Multi-route support | | | x | |
| Import in planner | | | x | |
| Cuesheet section + Cue Review mode | | | x | |
| Custom POI / Custom Cue / Control Point modes | | | x | |
| Duplicate / Split / Trace / Selection Tools | | | x | |
| Settings panel (overlays, auto-center, units) | | | x | |
| Heatmaps toggle | | | x | |

### Import & Export

| Feature | MVP | v0.2 | v0.3 | v1.0 |
|---------|-----|------|------|------|
| GPX import (upload page) | x | | | |
| GPX export (from route detail) | x | | | |
| Full data export (ZIP) | x | | | |
| TCX import/export | | x | | |
| FIT import/export | | | x | |
| KML import/export | | | x | |
| Cuesheet CSV export | | | x | |
| Map/Profile image export | | | x | |
| Import in planner modal | | | x | |
| Print PDF options | | | x | |
| Device sync (Garmin, Wahoo) | | | | x |

### Authentication & Account

| Feature | MVP | v0.2 | v0.3 | v1.0 |
|---------|-----|------|------|------|
| Email + password registration | x | | | |
| Login / Logout | x | | | |
| Password reset | x | | | |
| Full data export | x | | | |
| Account deletion | x | | | |
| Friends / social connections | | | x | |
| API tokens for programmatic access | | | x | |

### Map & Layers

| Feature | MVP | v0.2 | v0.3 | v1.0 |
|---------|-----|------|------|------|
| MapLibre GL JS renderer | x | | | |
| Base layers (Street / Satellite / Topo / OSM) | x | | | |
| Layer switching | x | | | |
| Custom raster/vector layers | | | x | |
| WMS/WMTS support | | | x | |
| Heatmaps (global + personal) | | | x | |
| Offline tile caching | | | | x |

---

## 13. Out of Scope (MVP)

The following are planned for future iterations but explicitly excluded from v0.1:

- **v0.2:** Collections, advanced filters (range sliders, date pickers), location search, map view toggle, bulk actions, sharing, surfaces/cuesheet/climbs, route tools (reverse, out-and-back), surface type preference, route color, TCX support, version history, photos
- **v0.3:** Full multi-format export dialog (FIT, KML, CSV, images), print PDF, cue review mode, import in planner, custom POI/cue/control point modes, advanced route tools (split, trace, selection), custom map layers, heatmaps, settings panel, session resume, multi-route planner, reviews & comments, social features
- **v1.0:** Native mobile app (iOS/Android), offline maps and tile caching, activity recording / GPS tracking, device sync (Garmin, Wahoo, Strava), turn-by-turn navigation, community module/plugin system

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| User can sign up and create a route | End-to-end flow works |
| GPX round-trip | Import a GPX → view route → export GPX → re-import produces equivalent route |
| Route builder usability | Route creation in < 2 minutes for a simple 10 km loop |
| Mobile responsiveness | Route list and map view usable on 375px-wide viewport |
| Filter and search | User can find a route by name within 5 seconds |
| Export reliability | GPX export produces a valid GPX 1.1 file that opens in third-party tools |

---

## 15. Roadmap (High-Level)

| Phase | Focus |
|-------|-------|
| **v0.1 — MVP** | Auth, route CRUD, route builder (snap-to-road), GPX import/export, base map layers, elevation profile |
| **v0.2 — Polish & Sharing** | Collections, privacy controls, rich filters/sort, sharing (link/QR/image), surfaces/cuesheet/climbs, route tools (reverse, out-and-back), TCX support, photos, version history |
| **v0.3 — Layers & Advanced Tools** | Custom map layers, heatmaps, full multi-format export, cue review mode, import in planner, advanced route tools (split, trace, selection), custom POI/cue/control point, print PDF, module architecture |
| **v0.4 — Activity Tracking** | GPS recording, activity history, stats |
| **v1.0 — Native App** | iOS/Android with offline maps, turn-by-turn navigation, device sync |

---

## 16. Open Questions

- [x] Routing engine selection — **Valhalla** (self-hosted). Covers all activity profiles, MIT license, self-hostable, supports turn-by-turn for future nav.
- [x] Auth provider — **Better-Auth** (TypeScript library, session-based, Drizzle adapter). No external service required.
- [ ] Hosting strategy for the reference instance (where does the "official" free instance live)?
- [ ] Licensing model for community modules
- [ ] Elevation data source and accuracy requirements
- [ ] Collections data model — flat list or nested folders?
- [ ] Privacy model — binary (public/private) for MVP, expand to friends-only in v0.2?
