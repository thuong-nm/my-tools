# Hex Next Base

A Next.js 16 + Prisma 7 starter built as **ports & adapters (hexagonal)**, with the dependency
rule enforced by ESLint rather than by good intentions.

It ships **no business logic** — one welcome page, one health route, and the plumbing every
project rewrites badly: the `{data}`/`{error}` response envelope, `Result` and two error
channels, a lazily-parsed Zod config, a Prisma 7 client behind a composition root, shadcn/ui on
Tailwind v4, and Docker Compose for Postgres.

**[AGENTS.md](AGENTS.md) is the real documentation** — the 9 rules, the layer boundaries, the
Next 16 and Prisma 7 gotchas, and the response-envelope contract. Read it before writing code.

## Stack

| | |
| --- | --- |
| Framework | Next.js 16.3 (App Router, Turbopack, `src/`) |
| UI | React 19, Tailwind v4, shadcn/ui (Base UI) |
| Database | PostgreSQL 16, Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Validation | Zod 4 — at the HTTP edge and in `lib/config.ts` only |
| Tests | Vitest 4, split into a DB-free unit suite and an integration suite |
| Lint | ESLint 9 flat config, carrying the architecture fences |

## Quick start

```bash
npm install
npm run db:up            # Postgres 16 in Docker, published on host port 5433
npm run dev              # http://localhost:3000
```

`.env` is committed and holds the local dev values (throwaway Postgres credentials, the same
ones in `docker-compose.yml`), so a fresh clone runs as-is. There is one env file for every
mode — Next.js reads it in `dev`, `build` and `test` alike. Real secrets belong in the
deployment's own environment, never in this file.

There are no migrations yet, so `npm run db:up` is enough to start. Once you add your first model
to `prisma/schema.prisma`, run `npm run db:migrate`.

Health check: <http://localhost:3000/api/health>

### Requirements

- Node.js 20.9+ (22 LTS recommended — `Dockerfile` pins 22)
- Docker, for Postgres

### Port 5433, not 5432

Compose publishes Postgres on **5433** on the host so it cannot collide with a locally installed
PostgreSQL. If 5433 is taken too, change it in `docker-compose.yml` and in `DATABASE_URL`.

### CORS

`/api/*` answers cross-origin requests for the origins listed in `.env`, comma-separated:

```bash
CORS_ALLOWED_ORIGINS=https://acme.com,https://app.acme.com
```

Empty (the default) means same-origin only. Each entry is normalised to a bare origin, so a
trailing slash or a path is tolerated, and an entry that is not a URL fails at startup instead of
silently never matching. Credentials are allowed, which is why the allow-list cannot be `*` — the
browser rejects that combination, so [src/proxy.ts](src/proxy.ts) echoes the caller's own origin.
Changing the list needs a restart, not a rebuild.

## Layout

```
src/
  app/            Next.js — the HTTP + UI adapter, kept thin
    api/          route handlers + the shared response builders
  components/     shared UI. A leaf: it imports nothing above it
  lib/
    http/         the wire envelope, pure TypeScript
    domain/       ← innermost. Imports nothing. errors/ and shared/ ship; the rest is yours
    application/  (add when needed) use cases returning Result<T, E>
    infrastructure/  adapters + container.ts, the single composition root
    config.ts     the ONLY place process.env is read
prisma/           schema (currently empty) + migrations
```

`@/*` resolves to `src/*`; `@/prisma/*` resolves to the root `prisma/`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Turbopack dev server |
| `npm run build` | production build |
| `npm run lint` | ESLint, **including the architecture fences** |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm test` | Vitest, DB-free suite |
| `npm run test:integration` | `*.integration.test.ts` — needs `npm run db:up` |
| `npm run verify` | lint + typecheck + test |
| `npm run db:up` / `db:down` | start / stop Postgres |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:studio` | Prisma Studio |

> Only the CORS policy and the config parser have tests so far. **A green `npm run verify`
> says nothing about a flow you add.**

## Renaming the project

Nothing derives the project name at runtime, so a rename is five files:

1. `name` in `package.json`
2. `metadata` in `src/app/layout.tsx` and the copy in `src/app/page.tsx`
3. Postgres user / database / container names in `docker-compose.yml`
4. `DATABASE_URL` in `.env`
5. The title and description at the top of `AGENTS.md` and this file

If you change the Postgres credentials after the volume already exists, recreate it:
`docker compose down -v && npm run db:up`.

## Adding a feature

The order matters, because it is the order the fences expect:

1. **Domain** — entity or value object in `lib/domain`, with a unit test that needs no database.
2. **Port** — declare the capability in `lib/domain/ports/`, named for the capability, never the
   vendor.
3. **Use case** — `lib/application/use-cases/`, taking plain input plus injected deps and
   returning `Result<T, E>`. Return a DTO, not an entity.
4. **Adapter** — `lib/infrastructure/…`, with a `toDomain()`/`toPersistence()` mapper pair if it
   is a repository. Wire it in `container.ts`.
5. **Route handler** — `app/api/…`, four steps: validate → get deps → call the use case →
   serialize through the shared helpers.

Then `npm run verify`.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `DATABASE_URL is required` | `.env` is missing or blank — restore it from git |
| Types missing on `prisma.<model>` | run `npx prisma generate` after a schema change; `migrate dev` does not always regenerate |
| Port 5433 already allocated | another stack is using it; change the port in `docker-compose.yml` |
| `PageProps` / `LayoutProps` unresolved | run `npm run typecheck` (it calls `next typegen`) or start `next dev` once |
| An import fails lint with a long message | that is an architecture fence. Read the message — it names the rule and the correct direction |
