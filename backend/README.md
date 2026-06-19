# Finance Collection Management System — Backend

Phase 1 + Phase 2 complete: backend foundation (security middleware, configuration,
Authentication, RBAC, User & Role management, audit logging) plus the core business
domain (Customers, Agents, Loans/EMI, Collections, Expenses, Support Tickets, Settings).

## Stack

Node.js, Express, TypeScript, Mongoose (MongoDB Atlas), JWT (access + refresh), Zod validation,
Multer (uploads), Winston logging, Jest + Supertest + mongodb-memory-server for tests.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in MONGODB_URI, JWT secrets, etc.
npm run seed            # creates Admin/Collection Agent/Customer roles + the Admin user
npm run dev              # starts the API with hot reload
```

The API is served under `API_PREFIX` (default `/api/v1`). Swagger UI is available at
`http://localhost:<PORT>/api-docs`. A health check is exposed at `/health`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload (tsx) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled server (`dist/server.js`) |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Run the Jest test suite (unit + integration, in-memory MongoDB) |
| `npm run test:coverage` | Run tests with coverage |
| `npm run seed` | Seed Admin/Collection Agent/Customer roles and the Admin user |
| `npm run typecheck` | `tsc --noEmit` |

Run a single test file: `npx jest tests/integration/loans.routes.spec.ts`. Run tests matching a
name: `npx jest -t "applies a partial payment"`.

## Architecture

```
src/
  config/      env validation (zod), Mongoose connection, Winston logger
  middleware/  security (helmet/cors/hpp/mongo-sanitize), rate limiting, JWT auth,
               RBAC permission guard, Zod validation, file upload (multer), centralized
               error handler, audit logging
  models/      Mongoose schemas + shared soft-delete plugin + Counter (sequence generator)
  modules/     one folder per feature: routes -> controller -> service -> dto (zod)
  providers/   swappable integrations: EmailProvider, WhatsAppProvider, StorageProvider
               (all dev-mode stubs that log instead of calling real Cloudinary/Twilio/SMTP —
               swap the implementation behind the interface once real credentials exist)
  utils/       AppError, asyncHandler, jwt, password hashing, crypto helpers, response shaping,
               sequence codes (CUST-/AGT-/LN-/RCPT-/TKT-), access-scope + customer-scope helpers
  docs/        Swagger/OpenAPI setup (reads JSDoc `@openapi` blocks from each module's routes file)
  app.ts       Express app wiring (no DB connection — used directly by integration tests)
  server.ts    Bootstraps DB connection + HTTP server, graceful shutdown
```

**Auth model**: JWT access token (short-lived) + refresh token (longer-lived, rotated on every
use, hash stored on the `User` document). There is no public registration endpoint — Admin, Agent,
and Customer accounts are all provisioned through the Users module. The access token payload
carries `accountType` and `profileId` (the linked `Agent`/`Customer` document id, resolved once at
login/refresh) so downstream modules can scope data per-request without an extra DB lookup.

**RBAC model**: `Role` documents hold a `permissions: string[]` list (e.g. `customers:read`, see
`src/constants/permissions.ts`). The seeded Admin role gets the wildcard permission `*`.
`requirePermission(...)` middleware checks the authenticated user's permissions (from the access
token) against what a route requires.

**Row-level data scoping** (separate from RBAC's action-level permissions): Agents only see
Customers/Loans/Collections/Support Tickets tied to *their assigned* customers; Customers only see
their own. This is implemented via `src/utils/access-scope.ts` (reads `accountType`/`profileId` off
`req.user`) and `src/utils/customer-scope.ts` (resolves a Mongo filter fragment for any
`customer`-keyed collection — reused by Loans, Collections, and Support Tickets).

**Soft delete**: `softDeletePlugin` adds `isDeleted`/`deletedAt` plus a `softDelete()` instance
method, and automatically filters deleted documents out of `find`/`findOne`/`findOneAndUpdate`/
`countDocuments`. Every new schema should apply this plugin (Collections/EmiSchedule/AuditLog/
Settings/Counter are intentionally immutable or singleton records and skip it).

**Loan EMI generation** (`src/modules/loans/emi-calculator.ts`): flat-rate (simple interest)
amortization — interest is computed once on the full principal for the tenure, then split evenly
across installments, with the final installment absorbing any rounding remainder. Approving a loan
(`POST /loans/:id/approve`) generates the `EmiSchedule` and flips the loan to `active`.

**Collections payment application** (`src/modules/collections/collections.service.ts`): a payment
is applied to the earliest unpaid/partially-paid installments in order; overpayment beyond the
loan's outstanding balance is rejected. When the last installment is paid off, the loan is
automatically closed.

**Human-readable codes**: `src/utils/sequence.ts` + the `Counter` model provide atomic, gapless
sequence numbers (`findByIdAndUpdate` with `$inc`) used for `customerCode` (`CUST-000001`),
`agentCode` (`AGT-...`), `loanNumber` (`LN-...`), `receiptNumber` (`RCPT-...`), and `ticketNumber`
(`TKT-...`).

## Out of scope so far

Reports (PDF/Excel export), Dashboard analytics aggregation endpoints, the Angular frontend, and
Docker/Nginx/PM2 deployment are deferred to later phases (see the project plan).

## Testing notes

Integration tests share a single in-memory MongoDB instance across the whole run (started once in
`tests/global-setup.js`, stopped in `tests/global-teardown.js`) rather than each test file spinning
up its own `mongod` — this is both much faster and avoids resource-contention crashes from
repeatedly starting/stopping real `mongod` processes. Each test file still gets a clean slate via
`afterEach(clearTestDB)`, which wipes all collections.
