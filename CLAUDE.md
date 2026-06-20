# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Finance Collection Management System ("SmartCollect") — an enterprise app for managing
customers, loans, EMI collections, agents, expenses, and reports for a lending/collections
business. Stack: Angular 20 frontend (standalone components, signals, Angular Material) +
Node/Express/TypeScript backend + MongoDB Atlas. RBAC distinguishes three account types: Admin
(Owner), Collection Agent, and Customer.

The build is being delivered in phases (see `backend/README.md` and `frontend/README.md` for
details). **Currently implemented: Phase 1 (backend foundation) + Phase 2 (core business domain)
+ Phase 4 (Angular frontend)** — Auth, RBAC, Users/Roles, Customers, Agents, Loans/EMI,
Collections, Expenses, Support Tickets, Settings, all with a working Angular UI.
**Not yet implemented**: Phase 3 (Reports PDF/Excel export, dashboard analytics/chart
endpoints) and Phase 5 (Docker/Nginx/PM2 deployment).

## Repo layout

- `backend/` — Node/Express/TypeScript API (implemented through Phase 2)
- `frontend/` — Angular 20 app (implemented through Phase 4), branded "SmartCollect"; logo
  assets live in `frontend/public/branding/` and `frontend/public/icons/`

## Commands

Backend (run from `backend/`):
- `npm run dev` — start the API with hot reload (tsx)
- `npm run build` — type-check and compile to `dist/`
- `npm test` — full Jest suite (unit + integration, in-memory MongoDB — no real DB needed)
- `npx jest tests/integration/loans.routes.spec.ts` — run a single test file
- `npm run lint` / `npm run typecheck` — ESLint / `tsc --noEmit`
- `npm run seed` — creates Admin/Collection Agent/Customer roles + the Admin user (needs a real
  `MONGODB_URI` in `backend/.env`, copied from `.env.example`)

Frontend (run from `frontend/`):
- `npm start` — `ng serve` at `http://localhost:4200`
- `npm run build` — production build to `dist/`
- `npm run lint` — `ng lint` (Angular ESLint)
- `npm run format` / `format:check` — Prettier

Running the backend dev server or seeding requires a real MongoDB Atlas connection string in
`backend/.env`. The frontend dev server needs the backend reachable at the URL configured in
`frontend/src/environments/environment.ts` (default `http://localhost:4000/api/v1`). Backend
tests do not need a real DB — they use an in-memory Mongo instance.

## Architecture (backend)

Layered per module: `*.routes.ts` → `*.controller.ts` (thin, calls service + sends response) →
`*.service.ts` (business logic, talks to Mongoose models) → `*.dto.ts` (Zod schemas, parsed by the
`validate` middleware before the controller runs). Modules: `auth`, `users`, `roles`, `customers`,
`agents`, `loans`, `collections`, `expenses`, `support`, `settings`.

- **Auth model**: JWT access token (short-lived) + refresh token (longer-lived, rotated on every
  use; a hash of the current valid refresh token is stored on the `User` document, along with a
  `tokenVersion` counter used to invalidate all sessions on password change/reset). There is no
  public registration endpoint — Admin, Agent, and Customer accounts are all provisioned through
  the Users module. The access token payload also carries `accountType` and `profileId` (the
  linked `Agent`/`Customer` document id, resolved once at login/refresh in `auth.service.ts`).
- **RBAC model**: `Role` documents (`backend/src/models/Role.ts`) hold a `permissions: string[]`
  list (e.g. `customers:read`, defined in `backend/src/constants/permissions.ts`, mirrored in
  `frontend/src/app/core/constants/permissions.ts`). The wildcard `*` permission grants full
  access (used by the seeded Admin role). `requirePermission(...)` middleware
  (`backend/src/middleware/rbac.ts`) checks the authenticated user's permissions — carried in the
  JWT access token payload, not re-fetched from the DB per request.
- **Row-level data scoping** (distinct from RBAC's action-level permissions): Agents only see
  Customers/Loans/Collections/Support Tickets tied to *their assigned* customers; Customers only
  see their own records. `backend/src/utils/access-scope.ts` reads `accountType`/`profileId` off
  `req.user`; `backend/src/utils/customer-scope.ts` turns that into a Mongo filter fragment reused
  across Loans, Collections, and Support Tickets services. This is enforced server-side only — the
  frontend does not re-implement this filtering, it just renders what the API returns.
- **Soft delete**: `softDeletePlugin` (`backend/src/models/plugins/soft-delete.plugin.ts`) adds
  `isDeleted`/`deletedAt` plus a `.softDelete()` instance method to a schema, and automatically
  excludes deleted documents from `find`/`findOne`/`findOneAndUpdate`/`countDocuments`. Apply this
  plugin to every new model (Collection/EmiSchedule/AuditLog/Settings/Counter are intentionally
  immutable or singleton and skip it).
- **`app.ts` vs `server.ts`**: `app.ts` builds the Express app (routes + middleware) but does
  **not** connect to the database — this is what integration tests import directly. `server.ts` is
  the real bootstrap entrypoint: it connects to MongoDB Atlas, then starts `app.ts` listening, and
  handles graceful shutdown.
- **Validation**: each module's `*.dto.ts` exports Zod schemas; the `validate({ body, query,
  params })` middleware (`backend/src/middleware/validate.ts`) parses and replaces
  `req.body`/`req.query`/`req.params` before the controller runs, so controllers receive typed,
  already-validated input.
- **Error handling**: throw `AppError` (or its static helpers like `AppError.notFound(...)`,
  `AppError.forbidden(...)`) from services/controllers; the centralized `errorHandler` middleware
  (`backend/src/middleware/error-handler.ts`) maps `AppError`, Zod errors, Mongoose validation/cast
  errors, and Mongo duplicate-key errors (11000) to consistent JSON responses with the right status
  code.
- **Audit logging**: call `recordAuditLog({ req, action, entityType, entityId, ... })`
  (`backend/src/middleware/audit.ts`) after a sensitive action succeeds. It never throws — failures
  are logged, not propagated.
- **Third-party integrations are stubbed behind interfaces**: `EmailProvider`, `WhatsAppProvider`,
  and `StorageProvider` (`backend/src/providers/`) all log instead of calling real
  SMTP/Twilio/Cloudinary. Swap the implementation behind the interface once real credentials exist;
  callers never need to change.
- **Loan EMI generation** (`backend/src/modules/loans/emi-calculator.ts`): flat-rate (simple
  interest) amortization — interest computed once on the full principal, split evenly across
  installments, last installment absorbs rounding. Approving a loan generates the `EmiSchedule`.
- **Collections payment application**: a payment is applied to the earliest unpaid/partial
  installments in order; overpayment beyond the outstanding balance is rejected; paying off the
  last installment auto-closes the loan.
- **Human-readable codes**: `backend/src/utils/sequence.ts` + the `Counter` model give atomic
  sequence numbers (`CUST-`, `AGT-`, `LN-`, `RCPT-`, `TKT-` prefixes) via `findByIdAndUpdate` with
  `$inc` — safe under concurrent requests.
- **API docs**: each module's `*.routes.ts` carries `@openapi` JSDoc blocks; `backend/src/docs/
  swagger.ts` collects them and serves Swagger UI at `/api-docs`. Comments are intentionally kept
  in the compiled `dist/` output (`removeComments: false` in `tsconfig.json`) so this also works in
  production builds.

## Architecture (frontend)

Standalone components throughout (no NgModules), lazy-loaded per-feature routes, signals for
local component state. See `frontend/README.md` for the full breakdown. Key points:

- **`core/services/crud.service.ts`**: generic `CrudService<T, CreateDto, UpdateDto>` base class
  for modules with a uniform list/get/create/update/delete shape. Most feature services extend it;
  Collections and Support don't (their backend routes don't support the full CRUD set).
- **Interceptor order is reversed from registration order for responses**:
  `provideHttpClient(withInterceptors([errorInterceptor, authInterceptor]))` in `app.config.ts` —
  `authInterceptor` must see 401s *before* `errorInterceptor` does, so it can silently refresh and
  retry without an error toast flashing first.
- **`AuthService`** (`core/services/auth.service.ts`) holds `currentUser` as a signal, persists
  tokens in `sessionStorage`, and exposes `hasPermission(...)` for UI-level gating (nav items,
  buttons) — mirrors but does not replace backend permission checks.
- Guards: `authGuard` (must be logged in), `permissionGuard` (reads required permissions from
  route `data.permissions`, matching `backend`'s permission strings).

## Conventions

- No path aliases (`@/...`) in the backend — use relative imports. Plain `tsc` doesn't rewrite
  path aliases at build time, so `@/` imports would resolve in dev (via `tsx`) but break in the
  compiled `dist/` output.
- Mongoose's `.id` virtual getter is typed `any` — cast it (`doc.id as string`) when assigning
  elsewhere; for constructing an `ObjectId` from a known-valid hex string (e.g. `req.user.sub`),
  prefer `Types.ObjectId.createFromHexString(...)` over `new Types.ObjectId(...)` (the latter's
  overload resolution trips static-analysis "deprecated signature" warnings).
- Backend `tests/**/*.ts` has relaxed `no-unsafe-*` ESLint rules (supertest's `res.body` is
  untyped `any`); production code under `src/` keeps the strict
  `recommended-requiring-type-checking` rules.
- Backend integration tests share one in-memory MongoDB instance for the whole test run rather
  than each test file spinning up its own `mongod` (`tests/global-setup.js`/`global-teardown.js`)
  — much faster and avoids resource-contention crashes from repeatedly starting/stopping real
  `mongod` processes. Each test file still gets a clean slate via `afterEach(clearTestDB)`.
- Frontend static assets (logo, PWA icons, manifest, favicon) live in `frontend/public/`, **not**
  `src/assets/` — Angular 20's default app builder only serves the `public/` folder.
