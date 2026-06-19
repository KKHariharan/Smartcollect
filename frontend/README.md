# SmartCollect — Frontend

Angular 20 (standalone components, signals) + Angular Material frontend for the Finance
Collection Management System, built against the backend in `../backend`.

## Getting started

```bash
npm install
npm start            # ng serve, http://localhost:4200
```

The API base URL is configured in `src/environments/environment.ts` (defaults to
`http://localhost:4000/api/v1`, matching the backend's defaults). Update
`src/environments/environment.prod.ts` for production deployments.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | `ng serve` — dev server with hot reload |
| `npm run build` | Production build (output to `dist/`) |
| `npm run watch` | Dev-mode build with `--watch` |
| `npm test` | Karma/Jasmine unit tests |
| `npm run lint` | `ng lint` (Angular ESLint) |
| `npm run format` / `format:check` | Prettier |

## Architecture

```
src/app/
  core/
    models/        TS interfaces mirroring backend DTOs/response shapes
    services/       one service per backend module, most extending CrudService<T>
    interceptors/   errorInterceptor (snackbar on failed requests), authInterceptor
                    (attaches Bearer token, retries once after a silent refresh on 401)
    guards/         authGuard (must be logged in), permissionGuard (route data.permissions)
    constants/      permissions.ts — mirrors backend's PERMISSIONS constant
    utils/          buildHttpParams (shared query-param builder)
  layout/           MainLayoutComponent — sidenav + topbar shell, permission-filtered nav
  features/         one folder per module: auth, dashboard, profile, customers, agents,
                     loans, collections, expenses, support, users, roles, settings
  shared/           auth-layout (centered card for pre-auth pages), confirm-dialog,
                     strong-password validator, not-found/forbidden pages
```

**Auth model**: JWT access + refresh tokens stored in `localStorage` (`AuthService`). The
access token's permissions are decoded server-side once at login; `AuthService.hasPermission()`
checks them client-side for UI gating (nav items, buttons) — the backend is still the source of
truth and re-checks every request.

**Interceptor order matters**: `provideHttpClient(withInterceptors([errorInterceptor,
authInterceptor]))` — Angular runs interceptors in array order for the request, **reverse**
order for the response. Listing `errorInterceptor` first means it sees responses *last*, after
`authInterceptor`'s silent 401-refresh-and-retry has a chance to resolve the request without
ever surfacing an error toast.

**Row-level scoping is server-enforced, not client-enforced**: Agents/Customers see fewer rows
than Admins for the same list endpoints (e.g. `GET /customers`) — the frontend doesn't filter
anything itself, it just renders whatever the backend's `access-scope`/`customer-scope` logic
returned.

**`CrudService<T, CreateDto, UpdateDto>`** (`core/services/crud.service.ts`): shared base for
modules with a uniform list/get/create/update/delete REST shape (Customers, Agents, Loans,
Expenses, Users, Roles). Collections and Support don't extend it because their backend routes
don't support the full set (e.g. Collections has no update/delete — it's an immutable ledger).

**Branding**: the SmartCollect logo lives in `public/branding/` (full logo + cropped square
mark) and `public/icons/` (PWA icon set, generated from the mark). Update
`public/manifest.webmanifest` and `src/index.html` if rebranding.

## Backend dependency

This app expects the backend (`../backend`) running and reachable at the configured `apiUrl`.
See `../backend/README.md` for setup — in particular, the backend needs a real MongoDB
connection string in `backend/.env` (Atlas or otherwise) to actually serve requests; without one
the API will be unreachable and every request from this app will fail.

## Out of scope so far

Reports (PDF/Excel export pages) and richer dashboard analytics/charts are deferred until the
backend's Phase 3 (Reports & Dashboard aggregation endpoints) lands — the current dashboard uses
simple counts derived from existing list endpoints. Docker/Nginx/PM2 deployment config is also
not yet in place.
