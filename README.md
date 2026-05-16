# jkldepartures

Jyväskylä public transport departure app for the TJTS5901-26 Group 7 course project.

The project contains a React frontend and a Rust backend. The frontend renders stop search, stop detail pages, departure boards, service alerts, and map views. The backend fetches Waltti static GTFS data and GTFS-Realtime feeds, normalizes them, and exposes JSON endpoints for the frontend.

## Project Structure

```text
.
├── backend/                         Rust backend service
│   ├── Cargo.toml                    Rust dependencies and package metadata
│   └── src/main.rs                   Fetch tasks, GTFS parsing, and HTTP API routes
├── frontend/                        React + TypeScript + Vite frontend
│   ├── public/                       Static frontend assets
│   ├── src/
│   │   ├── api/                      Shared domain types and GTFS helpers
│   │   ├── assets/                   Images and bundled assets
│   │   ├── components/               Reusable UI components
│   │   ├── hooks/                    React Query data hooks
│   │   ├── layouts/                  App shell and bottom navigation
│   │   ├── pages/                    Route-level pages
│   │   ├── services/                 Backend fetch clients and response mapping
│   │   ├── test/                     Test setup
│   │   ├── App.tsx                   App entry component
│   │   ├── main.tsx                  React root, router, and query provider
│   │   └── index.css                 Tailwind and global styles
│   ├── package.json                  Frontend scripts and npm dependencies
│   └── vite.config.ts                Vite configuration
├── ADR-*.md                          Architecture decision records
├── *.mmd                             Mermaid architecture/data-flow diagrams
└── jyvaskyla_transit_mockup.html      Original UI mockup/reference
```

## Prerequisites

- Node.js and npm for the frontend.
- Rust and Cargo for the backend.
- Waltti API credentials if you want to run the backend locally. The backend expects a base64-encoded token in the `APICREDS` environment variable. See Waltti's getting started documentation for obtaining credentials.

## Getting Started

Clone the repository and install the frontend dependencies:

```bash
git clone <repository-url>
cd jkldepartures
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173/`.

The frontend services currently call the backend at:

```text
http://tunamasiina.freeddns.org:8081/api
```

That means frontend-only contributors can usually run just the Vite app and use the shared backend.

## Running the Backend Locally

From the repository root:

```bash
cd backend
APICREDS=<base64-token> cargo run
```

The backend listens on port `8081` and exposes:

```text
GET /api/stops
GET /api/stops/:stopId
GET /api/stops/:stopId/departures
GET /api/alerts
GET /api/vehicles
```

If you want the frontend to use your local backend, update the service URLs in `frontend/src/services/` to point to `http://localhost:8081/api/...`.

## Frontend Development

Common commands, run inside `frontend/`:

```bash
npm run dev      # start Vite with hot reload
npm run build    # type-check and build production assets
npm run lint     # run ESLint
npm run preview  # preview the production build
```

Useful frontend entry points:

- `frontend/src/api/types.ts` defines the shared data contract used by UI, hooks, and services.
- `frontend/src/services/` contains backend fetch functions and response normalization.
- `frontend/src/hooks/` wraps services with React Query caching and refresh intervals.
- `frontend/src/pages/` contains route screens such as home, alerts, stop search/details, and map.
- `frontend/src/layouts/AppLayout.tsx` contains the shared mobile app shell and bottom navigation.

## Backend Development

The backend is currently implemented in `backend/src/main.rs`. It:

- fetches Waltti static GTFS zip data,
- fetches GTFS-Realtime trip updates and service alerts,
- keeps parsed data in shared in-memory state,
- serves JSON API responses with `rouille`.

Common commands, run inside `backend/`:

```bash
cargo run
cargo check
cargo fmt
```

Use `cargo run` with `APICREDS` set when testing live feed fetching.

## Contribution Workflow

1. Read the relevant ADRs before changing contracts or architecture. Start with `ADR-002_ Shared API Contract.md` for API shapes.
2. Create a branch for your change.
3. For frontend work, install dependencies in `frontend/` and run `npm run dev`.
4. For backend work, set `APICREDS` and run `cargo run` from `backend/`.
5. Keep API type changes synchronized between backend responses and `frontend/src/api/types.ts`.
6. Run checks before opening a pull request:

```bash
cd frontend
npm run build
npm run lint

cd ../backend
cargo check
```

7. Update ADRs or README notes when a change affects project structure, API contracts, or setup steps.

