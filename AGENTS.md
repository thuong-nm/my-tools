<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Hex Next Base

A Next.js 16 + Prisma 7 starter built as **ports & adapters (hexagonal)**, with the dependency
rule enforced by ESLint rather than by good intentions.

It ships **no business logic**. What it ships is the skeleton, the fences, and the conventions:
one welcome page, one health route, the `{data}`/`{error}` envelope, `Result`, the two error
channels, a lazily-parsed config, and a Prisma client behind a composition root. Everything
below describes how to add to it.

## The constraint that shapes everything

Business logic must be **independent of Next.js and of every vendor**, so that a flow can later
be split into its own service or moved behind a different frontend without a rewrite.

Dependencies point **inward only**:

```
  app/ (Next.js)  →  lib/application  →  lib/domain
                            ↓
                     lib/infrastructure  →  Prisma / payment / calendar / CRM adapters
```

The test for any change: *if we deleted Next.js tomorrow, would `lib/domain` and
`lib/application` still compile and still pass their tests?* If no, the change is wrong.

## The 9 rules

These are not stylistic preferences. Rules 1–2 and 4–9 are checked in review; rules 1–5 and 7 are
partly enforced by ESLint (see [Enforcement](#enforcement)).

### 1. `lib/domain/**` imports nothing

No `next/*`, no Prisma, no `axios`, no `zod`, no `node:*`. Pure TypeScript only. No I/O library
of any kind.

Corollary: no `new Date()`, `Math.random()` or `crypto.randomUUID()` inside the domain either —
they are non-deterministic. Take `now: Date` as a parameter; the container injects `now` and
`generateId`.

### 2. Ports are named for the CAPABILITY, never the vendor

`CalendarProvider` — not `WixService`. `CrmProvider` — not `ZohoService`. `PaymentGateway` — not
`OnePayService`.

The vendor name belongs to the adapter folder (`lib/infrastructure/payment/<vendor>/`) and
nowhere else. A port that mentions a vendor has already failed at its one job.

Ports live in **`lib/domain/ports/`**, not in the application layer: the domain declares what
capabilities it needs and infrastructure adapts to that shape. That is what dependency inversion
means here, and it is why `lib/domain/ports/**` is bound by rule 1 exactly like the rest of the
domain.

### 3. Use cases take plain input + injected dependencies, and return `Result<T, E>`

```ts
export async function createThing(
  input: CreateThingInput,   // plain data, already validated
  deps: CreateThingDeps,     // ports + clock, passed in
): Promise<Result<ThingDto, CreateThingError>>
```

A use case must not touch `NextRequest`, must not read `process.env`, must not call `redirect()`.
It returns `Result` instead of throwing — expected failures are values, not exceptions.

Use a function taking a `deps` object, not a class. Nothing to instantiate, and a test calls it
with plain object fakes.

**Two error channels, and the split is about whose mistake it is:**

| Channel | Meaning | Used by |
| --- | --- | --- |
| `Result<T, DomainError>` | the CALLER's input was bad — expected, recoverable, belongs in a response body | `create()` factories, mappers, use cases |
| `throw DomainRuleError` | the CODE asked for something impossible on an already-valid aggregate — a bug | entity behaviour methods (`markPaid`, `confirm`) |

So `Money.create(1000.5)` returns an error, but `order.ship()` on an unpaid order throws
`InvalidStateTransitionError`. A use case that cannot be sure of current state checks it
(`if (order.status !== "PAID") return err(...)`) rather than catching.

Both live in `lib/domain/errors/`, ready to use: `domainError()`, `validationError()`,
`DomainRuleError`, `InvalidStateTransitionError`, `InvariantViolationError`.

### 4. Route handlers in `app/api/**` are THIN

Exactly four steps: parse + validate the request → get deps from the container → call the use
case → serialize the response. Zod schemas for HTTP payloads live here, at the edge.

If a route handler contains an `if` that expresses a business rule, it is in the wrong file. See
[`app/api/README.md`](src/app/api/README.md).

### 5. A Prisma model is NOT a domain entity

Every repository owns a `toDomain()` / `toPersistence()` mapper pair in
`lib/infrastructure/prisma/mappers/`. A Prisma object must never escape the infrastructure layer.

`toDomain()` returns `Result`: the database can hold rows that no longer satisfy current
invariants, and that is a failure to surface, not to crash on. Repositories re-label such a
failure as `REPOSITORY_CORRUPT_ROW` — **not** `VALIDATION_FAILED`, which would make a route
handler answer 400 for what is actually our own data problem.

What the mappers are there to absorb, concretely:

- flat columns → value objects (`startsAt` + `endsAt` → one `TimeSlot`)
- `null` → `undefined` (Postgres has no `undefined`; TS optionals do not want `null`)
- `Json` → `JsonObject` (Prisma's `JsonValue` permits `42`; the domain requires an object)
- integer minor units → `Money`

An entity should also **omit** what no business rule reads. `createdAt`/`updatedAt` exist for
auditing; unless a rule reads them, they do not belong on the entity. That asymmetry is the rule
working, not an oversight.

### 6. Use cases return DTOs, not entities

DTOs live in `lib/application/dto/`. They are JSON-serialisable only — ISO strings instead of
`Date`, no class instances, no methods.

This is the payload that becomes the HTTP response body the day this goes headless, so treat it
as a published API: additive changes are safe, removing or retyping a field is breaking.

### 7. `process.env` is read in exactly one file: `lib/config.ts`

Parsed with Zod, then injected downward. Grep for `process.env` — a hit anywhere else is a bug.
(`prisma.config.ts` and the Vitest configs are CLI-only tooling, not application code.)

Three modules may call `serverConfig()`: `lib/infrastructure/container.ts` (the composition
root), `app/_lib/**` (the auth edge, which owns a signing secret) and `src/proxy.ts` (the request
edge, which needs the CORS allow-list before any route runs). Everything else receives what it
needs through `deps`.

Parsing is **lazy** (`serverConfig()`, memoised) because `next build` runs in environments that
legitimately have no production secrets; parsing at module scope would fail the build.

There is **one env file**, `.env`, committed and used by every mode — Next.js reads it under
`dev`, `build` and `test` alike, so it is also where integration tests get their `DATABASE_URL`.
It therefore holds local dev values only; real secrets come from the deployment's environment.
A machine-specific override goes in `.env.local`, which is gitignored and which Next.js ignores
when `NODE_ENV=test` — never put anything a test needs there.

A blank value means "not set": `config.ts` strips blanks before parsing, so a variable left
declared-but-empty in `.env` does not fail validation. Declare optional integrations as
**groups** — a half-filled group should fail loudly at startup, not produce a half-working
adapter.

### 8. NO Server Actions in a flow that another client might consume

A Server Action is an RPC endpoint only a Next.js client can call. It cannot be consumed by a
separate frontend, cannot be tested with `curl`, and cannot move to another service without
rewriting every call site — which is exactly the migration this architecture exists to make
cheap.

Server Actions **are** allowed in an internal admin route group that will never be consumed by
anything else. Every one of them must re-check the session itself: an action is a POST endpoint
reachable by anyone who can guess it, not a trusted continuation of the page that rendered the
button.

### 9. Keep the port count small — and no ceremony ports

The boundaries this base expects, with the adapter folder each belongs in:

| Boundary     | File in `lib/domain/ports/` | Adapter                          |
| ------------ | --------------------------- | -------------------------------- |
| database     | `repositories.ts`           | `infrastructure/prisma/`         |
| payment      | `payment-gateway.ts`        | `infrastructure/payment/<vendor>/` |
| calendar     | `calendar-provider.ts`      | `infrastructure/calendar/<vendor>/` |
| CRM          | `crm-provider.ts`           | `infrastructure/crm/<vendor>/`   |
| notification | `notifier.ts`               | `infrastructure/notification/`   |

Boundaries, not interfaces: one `repositories.ts` legitimately holds `UserRepository`,
`OrderRepository`, `UnitOfWork` and so on — one aggregate per repository is how persistence
naturally splits, and it is still one boundary.

Do **not** create an interface for something that will have one implementation forever — no
`ILogger`, no `IEmailFormatter`, no `IDateProvider`. A port earns its place by having a plausible
second implementation: a real adapter plus a test fake, or a vendor we expect to swap. Otherwise
it is ceremony. Import the module directly.

Hashing is the worked example: it is **not** a port. A use case receives `verifyPassword` as an
injected function, exactly like `now`.

## State machines belong in a table

When an entity has states, declare the allowed transitions as a **table** in the entity file, not
as scattered `if`s. Make `status` a getter with no setter and route every change through a named
transition, so "who can set this to CONFIRMED" has exactly one answer.

Give repositories a `restore()` that skips the machine — a stored row is already at its state —
but still validates invariants.

## Enforcement

`eslint.config.mjs` implements the dependency rule with `no-restricted-imports`, scoped per
layer. This is a fence, not a reminder — `npm run lint` fails on a wrong-direction import.

All paths below are under `src/`.

| Layer                       | Blocked from importing                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| `lib/domain/**` (incl. `ports/`) | `next/*`, Prisma, HTTP clients, crypto/hashing libs, `node:*`, `zod`, **and every outer layer** |
| `lib/application/**`        | `next/*`, Prisma, HTTP clients, crypto/hashing libs, `node:*`, `lib/infrastructure/**`, `lib/config` |
| `lib/http/**`               | everything except itself — envelope types must stay pure TypeScript             |
| `lib/infrastructure/**`     | `next/*`, `app/**`, `components/**`                                             |
| non-Prisma adapters         | Prisma and `lib/infrastructure/prisma/**` — only the DB adapter touches the DB   |
| `app/**`                    | Prisma, `lib/infrastructure/prisma/**`, adapter folders, `lib/infrastructure/auth/**`, and any `../` relative import |
| `app/_lib/**`               | Prisma only — this is the auth edge, so it MAY read config and sign tokens       |
| `src/proxy.ts`              | Prisma, `lib/domain/**`, `lib/application/**`, `lib/infrastructure/**`, `app/**`, `components/**`, crypto libs, `node:*` — it MAY use `next/*`, `lib/config` and `lib/http` |
| `components/**`             | `@/app/**`, Prisma, `lib/infrastructure/**`, `lib/config` — it is a leaf         |
| every production file       | `lib/testing/**` — test doubles must never be shipped                            |

Two of these encode bugs that actually happened in the project this base was extracted from.
`components/**` may not import `@/app/**` because five components imported Server Actions out of
`app/`, making the two folders mutually dependent. And `app/**` may not import
`lib/infrastructure/auth/**` because a page was verifying an HMAC and reading `serverConfig()`
inline; `app/_lib/` is the one place in `app/` that owns a signing secret.

Because `no-restricted-imports` is a single rule, a second config block matching the same files
would REPLACE the layer's patterns rather than add to them. The `lib/testing` fence is therefore
merged into each layer's pattern list, and the `app/_lib` relaxation is its own block placed
AFTER the `app/**` one so it wins. Test files get explicit overrides at the end of
`eslint.config.mjs`. Domain tests keep the full purity fence; other tests are unrestricted.

Known gap: the rule sees static `import`/`require`, not a dynamic `await import(variable)`.
Nothing here needs one; using one to dodge the fence would be obvious in review.

Domain tests are meant to be a second, indirect check: run them in a bare Node environment
(`environment: "node"`, plus an explicit `typeof window === "undefined"` assertion) with no
framework, no database and no network. If a change makes the domain need any of those, those
tests stop running.

Integration tests are the deliberate exception. Name them `*.integration.test.ts`: they are
**excluded** from `npm test` and run via `npm run test:integration`, so the unit suite stays
verifiably DB-free and `npm test` works on a fresh clone with nothing started.

## Layout

All application code lives under `src/`, which Next.js supports natively
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/src-folder.md`).
`public/`, the config files and the single `.env` stay at the repository root, and `proxy.ts`
**must** be inside `src/` — Next.js does not look for it at the root once `src/` exists.

Folders marked *(add when needed)* do not exist yet; they are where the corresponding code goes.

```
src/
  proxy.ts                  CORS for /api/*, from CORS_ALLOWED_ORIGINS. Cheap edge work only
  styles/                   the ONLY CSS in the project
    globals.css             the single Turbopack entry — five @imports and nothing else
    theme.css               @theme mapping + light / dark palettes
    base.css                element defaults, all inside @layer base
  app/                      Next.js — the HTTP + UI adapter, kept thin
    layout.tsx              <html>, the two next/font faces, the stylesheet import
    page.tsx                the welcome page
    global-error.tsx        replaces the root layout when the layout ITSELF throws,
                            so it ships its own <html> and its own CSS import
    not-found.tsx           site-wide 404
    icon.png  apple-icon.png  favicon.ico    ← file conventions, NOT public/
    _lib/                   (add when needed) edge helpers shared by route groups and api/
                            — session checks and anything that reads a signing secret
    api/                    route handlers — see app/api/README.md
      _lib/                 readJson, clientIpAddress, the {data}/{error} response builders
      health/route.ts       liveness probe
  components/               shared UI ONLY — a leaf, it imports nothing above it
    ui/                     shadcn/ui primitives
    utils.ts                cn()
  lib/
    http/                   the wire contract, pure TypeScript
      envelope.ts           {data} / {error} shapes + the eight wire codes
      client.ts             apiFetch<T>() and ApiError, used by client components
    domain/                 ← innermost. Depends on nothing.
      entities/             (add when needed)
      value-objects/        (add when needed) Money, TimeSlot, …
      errors/               DomainError (data, for Result) +
                            DomainRuleError (throwable, for illegal operations)
      ports/                (add when needed) the capability boundaries — owned by the domain
      shared/               Result, Branded, Json types — the shared kernel
    application/            (add when needed) ← orchestration. Domain + its ports only.
      use-cases/            one file, one business operation
      dto/                  the wire format (future headless API contract)
    infrastructure/         ← adapters. Vendor code lives here and only here.
      prisma/               client.ts; add mappers/ and repositories/ here
      container.ts          composition root — the ONLY place adapters are built
    config.ts               the ONLY place process.env is read
prisma/                     stays at the root: tooling, not application code
  schema.prisma             storage model (NOT the domain model) — currently empty
  migrations/               committed; never edit an applied migration
  generated/client/         generated TypeScript client — gitignored
public/                     static assets. CSS and JS never go here — they must be
                            compiled by Turbopack, and Tailwind v4 syntax served raw
                            produces no utilities at all.
```

### Where does a component go?

Used by **more than one route group** → `src/components/`. Used by **one route group** → that
group's `_components/`. Used by **one route** → that route's own `_components/`.

The test is mechanical: if a component imports a Server Action, it is not shared — an action
belongs to exactly one route, so the component does too. `src/components/**` is fenced against
importing `@/app/**` precisely so this cannot drift.

`@/*` resolves to `src/*`; `@/prisma/*` resolves to the root `prisma/`. Inside `app/` and
`components/`, always import with `@/` — a relative path that climbs out of its own folder breaks
silently when a route is renamed, and ESLint rejects one.

### Naming conventions

- A folder prefixed `_` is **private**: Next.js never routes it, so `_components`, `_hooks` and
  `_lib` can sit inside `app/` without creating URLs.
- Files are `kebab-case.ts`; a React component file exports a `PascalCase` component of the same
  name. A component that grows past one file becomes a folder with `index.tsx`.
- Hooks are `use-<thing>.ts` and live in `_hooks/`, never beside the component that happens to
  call them first.
- `styles/`, not `css/`: it is the name Next.js uses throughout its own docs.
- CSS and JavaScript never go in `public/`. `public/` is served byte-for-byte, so Tailwind v4
  syntax would arrive uncompiled and produce no utilities at all, and a script there would lose
  bundling, tree-shaking and typechecking. Only images, fonts, PDFs and `robots.txt` belong there.
- **No barrel `index.ts` files** in `lib/domain` or `lib/application`. Every call site names the
  module it wants, which is what makes a wrong-direction import obvious in a diff. A barrel is
  legitimate for a folder of sibling adapters (`prisma/repositories/index.ts`).

## Next.js 16 specifics

Verified against `node_modules/next/dist/docs/` at version 16.3.0 — re-check there rather than
relying on memory, and prefer it over anything written here if the two disagree.

- **`middleware.ts` no longer exists.** It is `proxy.ts` — at `src/proxy.ts` here, because this
  project uses a `src` folder — and the exported function must be named `proxy`. Runtime is always
  `nodejs` and cannot be configured; the `edge` runtime is not supported. Config flags renamed too
  (`skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`).
- Proxy is explicitly **not** a session-management or authorization solution. Do the real auth
  check next to the data, in a layout or route handler. CORS is the exception that belongs there:
  it is a response-header decision, and Next's docs point to proxy for a multi-origin allow-list
  because `next.config.ts` headers are static strings baked at build time.
- **Turbopack is the default** for `next dev` and `next build`. Do not add `--turbopack`. A custom
  `webpack` config would now fail the build.
- **Async request APIs are mandatory.** `params`, `searchParams`, `cookies()`, `headers()`,
  `draftMode()` are all Promises — the Next 15 synchronous compatibility period is over.
- Typed helpers `PageProps<'/route'>`, `LayoutProps<'/route'>` and `RouteContext<'/route'>` are
  globals generated by `next dev` / `next build` / `next typegen`. Use them instead of
  hand-writing prop types.
- Route handlers are **not cached** by default; `GET` can opt in with
  `export const dynamic = 'force-static'`.
- `revalidateTag` now requires a second `cacheLife` argument. `updateTag` (Server Actions only)
  gives read-your-writes semantics.
- `next lint` is removed — `npm run lint` calls the ESLint CLI directly.
- `serverRuntimeConfig` / `publicRuntimeConfig` are removed. Env vars only, which suits rule 7.
  Call `connection()` before reading `process.env` when a value must be read at request time
  rather than baked in at build — `api/health/route.ts` is the worked example.

## The API response envelope

Every JSON route answers in one of exactly two shapes, built by `ok()` / `created()` /
`errorResponse()` / `badRequest()` in `app/api/_lib/responses.ts`. No route hand-rolls a body.

```jsonc
// success
{ "data": { "thing": { "id": "…", "createdUtc": "2026-09-14T02:00:00.000Z" } } }

// failure
{ "error": {
    "code": "CONFLICT",
    "message": "That name is already taken.",
    "details": { "fieldErrors": { "name": ["already taken"] } }
} }
```

- `data` and `error` are mutually exclusive; a body never carries both.
- There is **no `success` field**. The HTTP status already says which one it is, and a second
  source of truth is a second thing to get wrong.
- `details` is optional and **machine-readable only** — never prose. It is an ALLOW-list
  (`PUBLIC_DETAIL_KEYS`), so a repository may attach internal context for logs without leaking
  it. Zod field errors arrive as `details.fieldErrors`.
- On a **5xx the message is replaced** with "Something went wrong on our side." and `details` is
  dropped entirely; the real text goes to `console.error`. Raw vendor messages name tables,
  columns and config keys. Map every vendor failure to a domain error before it reaches here.

### Serialisation conventions

- **Money**: integer minor-unit (or whole-unit for a currency without one), field suffixed with
  the unit (`totalDong: 3600000`, `totalCents: 1299`). Never a string, never a float, never
  formatted — formatting is the UI's job.
- **Time**: ISO 8601 UTC, field suffixed `Utc` (`startUtc`, `expiresAtUtc`, `paidAtUtc`). A bare
  `start` or `createdAt` is banned: users act from several time zones and an ambiguous name is how
  a wrong-day bug gets shipped.
- Local wall-clock is a **separate** field — `startLocal` plus `timezone` (IANA). It never
  overwrites the UTC field, and it is display-only: the client sends the instant back, never the
  rendering.
- Enums are SCREAMING_SNAKE exactly as the domain spells them.
- **Missing data omits the field**, it does not send `null`. So DTO optionals are `field?: T`, not
  `field: T | null`, and mappers use a conditional spread.

### `code` → HTTP status

The API publishes **exactly eight codes**. This is the whole list; a client can branch on it as a
closed set.

| Code | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | the request itself was malformed |
| `UNAUTHENTICATED` | 401 | no valid session |
| `FORBIDDEN` | 403 | authenticated or signed, but not allowed |
| `NOT_FOUND` | 404 | no such resource |
| `CONFLICT` | 409 | someone else got there first — retrying the same request may work |
| `INVALID_STATE_TRANSITION` | 409 | the resource is not in a state that allows this |
| `INTERNAL_ERROR` | 500 | our fault |
| `UPSTREAM_UNAVAILABLE` | 502 | a third party or the database did not come through |

Domain codes are finer-grained than this and **collapse onto the eight** via `WIRE_CODE` in
`app/api/_lib/responses.ts`. The specific reason is not lost: it stays in `message`, and for 5xx
in the server log. Two suffix rules catch codes added later — `*_NOT_FOUND` → `NOT_FOUND`,
`*_UNAVAILABLE` / `*_REJECTED` → `UPSTREAM_UNAVAILABLE` — and anything else defaults to
`INTERNAL_ERROR`, never a 2xx and never a 4xx.

Adding a domain code does **not** extend the published list. Map it in `WIRE_CODE` (or let a
suffix rule catch it); adding a ninth wire code is a deliberate contract change.

`INVALID_STATE_TRANSITION` is also the code on `DomainRuleError`, which is **thrown, not
returned** — so it reaches `errorResponse` only via `WIRE_CODE`, never from the domain directly.
A thrown one is an unhandled 500, which is correct: it means our own code asked for an impossible
transition.

### Routes that legitimately escape the envelope

Some do, and each must carry a comment in its own file saying why. Do not "standardise" them:

- a **file download** (`text/csv`) — its *failures* still go through `errorResponse`
- a **redirect** answering a browser navigation — there is nothing to wrap
- a **third-party callback** whose acknowledgement body is specified by the caller. A webhook that
  needs a bare `200` to mean "handled" and a `500` to trigger a retry must not get an enveloped
  error body with a 2xx status: that silently drops events.

## Prisma 7 specifics

Verified against the installed Prisma 7.9.1 — these differ from essentially every older tutorial,
so check here before copying an example from memory.

- **The connection URL is NOT in `schema.prisma`.** There is no `url = env("DATABASE_URL")` in the
  `datasource` block; it lives in `prisma.config.ts`.
- **`prisma.config.ts` loads env with `@next/env`, not `dotenv`.** Prisma's own template uses
  `import "dotenv/config"`, which reads `.env` and nothing else. Using Next's loader guarantees
  `prisma migrate` and `next dev` resolve the same files, including a developer's `.env.local`
  override — otherwise the two would talk to different databases.
- **A driver adapter is required.** `new PrismaClient({ adapter: new PrismaPg({...}) })` from
  `@prisma/adapter-pg`. There is no Rust query engine and no `datasources` option.
- **The client is generated as TypeScript** into `prisma/generated/client/`, imported as
  `@/prisma/generated/client/client` — not from `@prisma/client`. It is gitignored, so
  `prisma generate` runs on `postinstall`.
- **`migrate dev` does not always generate.** Run `prisma generate` after a schema change if types
  look stale.
- **Nullable `Json` needs `Prisma.DbNull`, not `null`.** Prisma distinguishes SQL NULL (`DbNull`)
  from the JSON value `null` (`JsonNull`) and rejects a bare `null`.
- **`import { loadEnvConfig }` breaks in a Vite config.** `@next/env` is CommonJS and Vite bundles
  config files as ESM, where the named export does not exist — use `import nextEnv from
  "@next/env"`. Prisma's loader tolerates the named form, which is why the two config files
  legitimately differ. For a standalone `tsx` script, prefer
  `node --env-file=.env` over the package.

Schema conventions to keep:

- Money is **`Int`**, in the currency's smallest whole unit. Never `Float` (binary rounding);
  `Decimal` only if the currency really has a minor unit you must store exactly. Cap the domain's
  `Money` at Postgres `int4` so an unstorable amount is rejected in the domain rather than failing
  at the driver.
- Every timestamp is **`@db.Timestamptz(6)`**. `timestamp without time zone` silently drops the
  offset.
- Choose `onDelete` deliberately. A financial record must **outlive** its catalogue entry
  (`RESTRICT`, the default) — retire the catalogue row with an `isActive = false` flag instead.
  Child rows that are meaningless on their own may cascade.
- **The insert is the lock.** For "claim this exactly once" — dedup keys, one-holder-per-slot — put
  a `@@unique` on the natural key and INSERT first, treating a unique violation (P2002) as
  "already claimed, stop". A check-then-act races: at READ COMMITTED two callers both read "free"
  and both insert, and a transaction gives atomicity, not mutual exclusion.
- A swallowed database error is **not** a swallowed error: a failed statement aborts the whole
  Postgres transaction (`25P02`), and Prisma 7 savepoints only *nested* `$transaction` calls, never
  individual queries. To claim without raising, use `INSERT … ON CONFLICT DO NOTHING` and read the
  affected count.
- Prisma cannot express a `CHECK` constraint. If you need one — a singleton settings row, say —
  hand-write it into the migration SQL.

## Commands

```bash
npm run dev              # Turbopack dev server
npm run build            # production build
npm test                 # vitest — CORS + config only so far
npm run test:integration # *.integration.test.ts only; REQUIRES npm run db:up
npm run typecheck        # next typegen && tsc --noEmit
npm run lint             # ESLint, includes the architecture fences
npm run verify           # lint + typecheck + test
npm run db:up            # postgres 16 only, via Docker Compose (host port 5433)
npm run db:down          # stop it
npm run db:migrate       # prisma migrate dev
npm run db:studio        # prisma studio
```

`prisma migrate dev` needs a TTY to confirm a data-loss warning (adding a unique constraint to a
populated table, for instance). In a non-interactive shell, generate the SQL with
`prisma migrate diff --from-config-datasource --to-schema … --script` into a hand-created
migration folder and apply it with `prisma migrate deploy`. Still a real migration file — never
`prisma db push`, which drifts the schema away from the migration history.

Add `export {}` to any standalone `.ts` script inside `tsconfig.json`'s `include`: without a
top-level import or export, TypeScript treats it as a global script and its `main` collides with
every other one.

## State of the project

**What exists:**

- The layer folders, the `@/*` path alias and the ESLint fences that enforce the dependency rule.
- `lib/domain/shared/` (`Result`, `Branded`, `Json` types) and `lib/domain/errors/` (both error
  channels).

  No ids ship: `branded.ts` carries the pattern, and `identifier.ts` is yours to add with the
  first aggregate.
- `lib/http/` — the `{data}`/`{error}` envelope, the eight wire codes, `apiFetch`/`ApiError`.
- `app/api/_lib/` — `readJson`, `clientIpAddress`, and the response builders including the
  `DomainError.code` → HTTP status mapping.
- `lib/config.ts` (Zod, lazy, memoised) with `NODE_ENV`, `APP_URL`, `DATABASE_URL`, `TZ`,
  `CORS_ALLOWED_ORIGINS`.
- `src/proxy.ts` + `lib/http/cors.ts` — credentialed CORS for `/api/*` against the allow-list,
  with the policy kept as pure functions so it is testable without Next.js.
- `lib/infrastructure/container.ts` — the composition root, currently wiring the Prisma client,
  `now` and `generateId`.
- `lib/infrastructure/prisma/client.ts` — the Prisma 7 driver-adapter client with hot-reload reuse.
- A welcome page, a site 404, a `global-error` boundary, `GET /api/health`.
- shadcn/ui primitives (alert, badge, button, card, checkbox, input, label, separator, skeleton,
  textarea), the Tailwind v4 token layer and the light/dark palettes.
- Docker Compose for Postgres 16, one `Dockerfile` (dev image), both Vitest configs.

**What is deliberately empty:**

- **No domain model.** `lib/domain/{entities,value-objects,ports}` do not exist yet.
- **No use cases.** `lib/application/` does not exist yet.
- **No Prisma models.** `schema.prisma` has a generator and a datasource and nothing else; there
  are no migrations.
- **No repositories or mappers**, and no adapter for payment, calendar, CRM or notification.
- **No auth.** No session, no password hashing. `src/proxy.ts` exists but does CORS only — it is
  not an authorization boundary. The ESLint fence for `lib/infrastructure/auth/**` is already in
  place so re-adding it cannot go wrong.
- **Almost no tests.** Only the CORS policy and the config parser are covered
  (`lib/http/cors.test.ts`, `lib/config.test.ts`). `npm run test:integration` still passes
  vacuously, so a green `verify` says nothing about a flow you add.

**Starting a new project from this base:**

1. `npm install && npm run db:up` — `.env` ships with working local values.
2. Rename the project: `name` in `package.json`, the `<title>`/`metadata` in `app/layout.tsx`, the
   Postgres user/database/container names in `docker-compose.yml`, and the matching `DATABASE_URL`
   in `.env`.
3. Model the domain first — entities and value objects in `lib/domain`, with unit tests that need
   no database. Then the port it needs, then the use case, then the Prisma model and repository,
   then the route handler. In that order the fences never fight you.
