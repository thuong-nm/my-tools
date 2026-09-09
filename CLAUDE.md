@AGENTS.md

---
# Claude Code
## Agent Rules

- **Always plan first** — any task with more than 3 steps requires a plan, and you
  must wait for the user to confirm it before implementing. A plan names the files
  it will touch and which layer each one lives in (`domain` / `application` /
  `infrastructure` / `app`), so a wrong-direction dependency is caught before it is
  written.
- **Definition of Done** — `npm run verify` passes (lint + typecheck + test), the
  dev server logs are clean (no runtime errors, no React warnings), the 9
  architecture rules still hold, and the result would pass a senior engineer's
  review. "It compiles" is not done.
- **NEVER run tests that touch the database** — anything wired to a real
  `DATABASE_URL` (`*.integration.test.ts`, seed/reset helpers) wipes the shared dev
  database. Only run those when the user explicitly asks. Pure `lib/domain` and
  `lib/application` tests use fakes, touch nothing, and may be run freely — that is
  the whole point of rule 1 and rule 3.
- **NEVER change the database directly** — no ad-hoc `UPDATE` / `INSERT` / `ALTER` /
  `DROP`, no `psql` edits, no `prisma db push` (it drifts the schema away from the
  migration history). **Every database change MUST go through a migration**: edit
  `prisma/schema.prisma`, then `prisma migrate dev` to generate a file under
  `prisma/migrations/`. If a task seems to need a direct DB change, write a
  migration instead — never touch the database out of band.
- **Handle bugs yourself** — on a bug: read the logs → find the root cause → fix →
  verify → report. Do not ask the user back mid-way, and do not paper over a
  symptom; a `try/catch` that swallows the failure is not a fix.
- **Never widen an interface to make a test pass** — if a fix needs a new port, a
  vendor name in `lib/application`, or `process.env` outside `lib/config.ts`, stop
  and raise it. Those are the rules the architecture exists to protect (rules 2, 7,
  9).
- **Record lessons** — after every bug fix, add an entry to the "Lesson Learned"
  table below.
- **Comments:** only write a comment when it explains the *why* — a non-obvious rationale, constraint, or gotcha the code itself can't convey. Do not add comments that restate what the code plainly does, section-separator banners, or redundant doc lines that just echo a function's name. Prefer clear names over comments. Keep any comment short (≤2 lines).

> **IMPORTANT — comment length & placement.** A single comment (including a JSDoc/doc block) MUST NOT exceed **3 lines**. Do NOT comment inside a function unless strictly necessary. The block below is an example of a comment I generated that is **wrong** — 8 lines narrating behavior that the code and names already convey:
>
> ```ts
> /**
>  * Resolve a short code to the current target URL path (for a 302 redirect),
>  * re-resolving against the live, published-only site-tree so slug changes
>  * are reflected. Returns null when the code is unknown OR when the target
>  * page is no longer live — deleted, unpublished, or unavailable in the
>  * requested locale. We deliberately do NOT fall back to the path stored at
>  * generation time: a dead link must report "not available", never silently
>  * redirect to a stale path that 404s.
>  */
> async resolveUrl(code: string, locale?: string | null)
> ```
>
> Correct version keeps only the non-obvious *why*, in ≤3 lines:
>
> ```ts
> // Re-resolves against the live published tree (not the path stored at
> // generation time) so a dead/stale link reports "not available" instead
> // of 302-ing to a path that 404s.
> async resolveUrl(code: string, locale?: string | null)
> ```

> **SPECIAL RULE — no comments inside function bodies.** When generating code, do NOT add comments *inside* a function body unless strictly necessary. "Necessary" means a genuine non-obvious *why* (a constraint, gotcha, or subtle reason the code can't express) — not a narration of the logic, a step label, or anything the code/variable names already make clear. Default to zero in-function comments; add one only when its absence would mislead a future reader. This applies to every generated function, in both core code and plugins.

> **Another wrong example** — a `sync()` doc block that spends 8 lines enumerating every step of the algorithm (all of which the method body and its variable names already show):
>
> ```ts
> /**
>  * Keep one tree in step with reality:
>  * - every single type and collection type has a "type node" (NULL document id)
>  * - every entry (in any locale) of every collection type has its own node,
>  *   defaulting to a child of its collection's type node
>  * - nodes of deleted entries are removed (children re-parented)
>  * - nodes of removed content types are removed (children re-parented)
>  * Returns entry info keyed by `${ctUid}:${documentId}` for enrichment.
>  */
> async sync(treeId: number)
> ```
>
> Correct version — either drop the block entirely (the name `sync` + signature are enough) or keep only the one non-obvious *why*, in ≤3 lines:
>
> ```ts
> // Reconciles one tree against live content: adds type/entry nodes, drops
> // nodes of deleted entries and removed content types (children re-parented).
> async sync(treeId: number)
> 

## Lesson Learned

Carried over from the project this base was extracted from. Every row is a trap this exact
stack sets, not a general programming tip — read it before debugging something similar, and add
a row after every bug you fix.

| Date | Symptom | Root cause | Fix / rule to remember |
| ---- | ------- | ---------- | ---------------------- |
| 2026-08-13 | `new PrismaClient()` compiled but could not query. | Prisma 7 dropped the Rust engine; a driver adapter is now mandatory. | `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`. Also: the client generates as TS to `prisma/generated/client/`, not `@prisma/client`. |
| 2026-08-13 | Integration tests failed with "DATABASE_URL is not set" although `.env.local` had it. | Vitest sets `NODE_ENV=test`, and Next's env loader deliberately skips `.env.local` in test mode for determinism. | Anything a test needs goes in the committed `.env`, which IS loaded in test mode — never in `.env.local`. Also: `loadEnvConfig` in a Vitest config runs in the main process — test workers need it in `setupFiles`. |
| 2026-08-13 | `import { loadEnvConfig } from "@next/env"` crashed the Vitest config. | `@next/env` is CommonJS; Vite bundles config files as ESM, where the named export does not exist. | Use `import nextEnv from "@next/env"`. Prisma's own loader tolerates the named form, so the two config files legitimately differ. Under `tsx` the default import fails too — for standalone scripts use `node --env-file=.env`. |
| 2026-08-13 | `tsc` rejected `rawPayload: null` on a nullable `Json` column. | Prisma distinguishes SQL NULL (`Prisma.DbNull`) from the JSON value `null` (`Prisma.JsonNull`) and rejects a bare `null`. | Use `Prisma.DbNull` to empty a nullable `Json` column. |
| 2026-08-13 | Repositories would not typecheck against their port: mappers return `ValidationError`, ports declare `RepositoryError`. | A stale/corrupt stored row is not a caller-input error — conflating them would answer 400 for our own data problem. | Add `REPOSITORY_CORRUPT_ROW` and re-label at the boundary. Let the compiler tell you when two error types mean different things. |
| 2026-08-13 | A new ESLint fence silently disabled the existing layer fences. | `no-restricted-imports` is ONE rule: a later config block matching the same files REPLACES its options, it does not merge patterns. | Merge new patterns into each layer's existing `patterns` array. Put per-file relaxations in blocks that come last, and always re-probe every fence after touching the config. |
| 2026-08-13 | `prisma migrate dev` aborted: "environment is non-interactive". | Adding a unique constraint raises a data-loss warning, which needs a TTY to confirm. | `prisma migrate diff --from-config-datasource --to-schema … --script` into a hand-created migration folder, then `prisma migrate deploy`. Still a real migration file — never `db push`. |
| 2026-08-13 | `npm run build` died with 14 "Too small: expected string to have >=1 characters" config errors. | Optional env vars were `.min(1).optional()`, but `.optional()` accepts only `undefined` — and an env file ships optional variables BLANK, so it produced an unparseable config. | `lib/config.ts` strips blank values before parsing: an empty value in `.env` means "not set". Test the documented setup path, not just the fully-populated one. |
| 2026-08-13 | Three `react-hooks/set-state-in-effect` errors. | State that was derived was being *synchronised* with effects instead of computed during render. | Derive during render; use `useSyncExternalStore` for browser-only values like the time zone. If an effect's only job is to call setState from other state, the state should not exist. |
| 2026-08-13 | 5xx API responses hid the reason from everyone, including us. | `errorResponse` masked 5xx messages for safety but never logged them, so an actionable "X is not configured" vanished. | Withholding a message from the client means logging it server-side in the same place. |
| 2026-08-13 | `tsc` reported "Duplicate function implementation" for two standalone scripts. | Neither had a top-level import/export, so TypeScript treated them as global scripts and their `main` functions collided. | Add `export {}` to any standalone `.ts` script inside the project's `include`. |
| 2026-08-13 | I wrote a rule into AGENTS.md, then wrote code that contradicted it. | The rule was mine, not the customer's, and its actual concern was satisfiable inside the thing it banned. | When code contradicts a self-imposed rule, resolve it in the doc with the reason — do not leave the two disagreeing, and do not silently drop the rule. |
| 2026-08-13 | An idempotency replay path returned a repository error against real Postgres, so the second of two duplicate callbacks always failed. | The dedup insert swallowed P2002 and kept reading on the same transaction. A failed statement aborts the whole Postgres transaction (`25P02`), and Prisma 7 savepoints only *nested* `$transaction` calls, never individual queries. | Claim with `INSERT … ON CONFLICT DO NOTHING` and read the affected count. **A swallowed database error is not a swallowed error: the transaction is still poisoned.** The unit test passed because an in-memory fake cannot model abort semantics — an idempotency test proves nothing unless it runs inside the transaction the caller uses. |
| 2026-08-13 | An empty string became the dedup key for every payment. | `wireField ?? fallback` — `??` catches `null`/`undefined` but not `""`, while the fields beside it were guarded with truthiness. | Use `||` or an explicit blank check for values arriving from a wire format, where "absent" and "present but empty" are different encodings of the same thing. |
| 2026-08-13 | Every paid record flagged "needs attention", making the filter useless. | The health signal counted a sync status that a deliberately-unconfigured noop provider fails by design. | A health signal must not include a dependency that is known-off; saturating it is the same as deleting it. No test caught it because every test wired a *fake* that succeeds rather than the noop adapter the container actually wires — **at least one test per use case should use the real production adapter set.** |
| 2026-08-18 | A page showed "0 ₫" for some records. | The page re-found a nested option with `.find(o => o.name === name)` and `?? 0`, while the resolved id was already in the DTO. | Match by id, never by a display name — and if a page has to re-derive something the use case already resolved, the DTO is the wrong shape. A `?? 0` on money is a silent wrong answer, not a default. |
| 2026-08-18 | A DTO field existed with a comment explaining it stops the client trusting its own clock — and nothing read it. | The countdown computed `expiresAt - Date.now()`, i.e. exactly the thing the field was added to avoid. | A field whose stated purpose is contradicted by its only consumer is worse than no field. Start from the server-sent remainder and advance with `performance.now()`, which no device clock skew can move. |
| 2026-08-18 | A 15-minute countdown was announced to screen readers once per second. | `role="status"` + `aria-live="polite"` on a value that changes every tick. | Live regions are for state changes a user needs told, not every frame. `role="timer"` announces nothing; put threshold messages in a separate `sr-only` region, derived from a range so a skipped tick cannot skip the announcement. |
| 2026-08-18 | Five components imported Server Actions out of `app/`, so `app/` and `components/` depended on each other in both directions. | ESLint fences existed for every `lib/` layer and for `app/**` — but there was no block matching `components/**` at all, so the folder people edit daily was the only unfenced one. | Colocate a component with the route that owns it; keep `components/` for what every route group uses. Fence: `components/**` may not import `@/app/**`. A fence that covers the careful layers and not the busy one is decoration. |
| 2026-08-18 | A page verified an HMAC and read `serverConfig()` inline, while the action minting the same token read the secret separately. | Nothing stopped it: the `app/**` fence blocked the vendor adapters but not `lib/infrastructure/auth/**`. | One module under `app/_lib/` reads the secret and both callers go through it. The fence now blocks `lib/infrastructure/auth/**` from `app/**`; exempt only the injected functions a use case receives (rule 3), never the key holders. |
| 2026-08-18 | A submit button had a comment saying it deliberately stays disabled after redirecting, directly above a `finally { setSubmitting(false) }` that re-enabled it. | A `finally` block runs on the success path too, and the success path was a full-page navigation still in flight. | Read `finally` as "including when it worked". Reset in the `catch`, not in `finally`, when success means leaving the page. |
