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
| 2026-09-09 | The four-step route-handler example in `app/api/README.md` could not be written as shown: it imports `thingRepository` from `lib/infrastructure/prisma/**`, which the `app/**` fence blocks. | The doc was written before the fence, and nothing typechecks a README. The fence is right — building an adapter outside the composition root is exactly what it exists to stop. | The container hands out **built repositories** (`getContainer().repositories.textShares`), not `db`. When a doc's example contradicts a fence, fix the doc: the next person copies the example, not the rule. |
| 2026-09-09 | `react-hooks/set-state-in-effect` fired on a `setLoaded(true)` guard clause, inside an effect whose other branch set the same state asynchronously and passed. | The early-return branch ("there is no payload to decode") called setState synchronously in the effect body; the async branch did it from a `.then`, which the rule allows. | Delete the guard and let the empty case go through the same promise — `decompress("")` already resolves to `""`. One code path, no cascading render. A partly-async effect is the shape that trips this rule. |
| 2026-09-09 | `tsc` failed with `Cannot find module '../../../src/app/page.js'` after deleting `src/app/page.tsx`, even though `next typegen` had just re-run. | `.next/dev/types/validator.ts` is generated per route and was not pruned for the route that no longer exists; typegen adds, it does not always remove. | `rm -rf .next` after deleting or moving a route, before trusting `npm run typecheck`. A stale route validator reports a phantom error in a file you never wrote. |
| 2026-09-09 | `prisma migrate diff --to-schema-datamodel` aborted: the flag "was removed". | Prisma 7 renamed it to `--to-schema` (and `--from-schema`), so every pre-7 recipe for generating a migration without a database is wrong. | `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/<ts>_<name>/migration.sql`. Still a real migration file, and it needs no live database — never `db push`. |
| 2026-09-17 | Saving a share answered 502, `The table public.TextShare does not exist`, although the migration was committed. | The migration file existed but had never been APPLIED to the dev database — `_prisma_migrations` did not exist either, so the database was empty, not drifted. | `prisma migrate deploy` inside the container that owns the `DATABASE_URL` host name. A committed migration is not an applied one; check `\dt` before suspecting the code. |
| 2026-09-17 | After adding a model and running `prisma generate`, the dev server still failed with `Cannot read properties of undefined (reading 'create')`. | `prisma/client.ts` caches the client on `globalThis` so hot reloads reuse one pool — which also means the OLD generated client survives every reload. | Restart the dev server after `prisma generate`. A regenerated client is not a reloaded one, and the symptom looks like a missing table rather than a stale process. |
| 2026-09-17 | `next build` died prerendering `/_global-error` with `Cannot read properties of null (reading 'useContext')`, even after deleting `global-error.tsx`. | The dev `Dockerfile` pinned `ENV NODE_ENV=development`, which `next build` inherited and used to mix development and production React. Next warns about this, one line above the failure. | Never pin `NODE_ENV` in an image that also runs builds — Next sets it per command. The tell: the failing route is one Next synthesises, so no file of yours can be at fault. |
| 2026-09-17 | A scrypt hash whose stored key was empty verified EVERY password. | `verifyPassword` derived a candidate of `storedKey.length` bytes, so an empty stored key produced an empty candidate and `timingSafeEqual` compared two zero-length buffers as equal. | Floor the decoded salt and key lengths before comparing. Base64 decoding is lenient, so a truncated row reaches the comparison rather than failing to parse — and the failure mode is an auth bypass, not an error. |
| 2026-09-17 | `A tree hydrated but some attributes... didn't match` on `<html>`, with both classNames looking identical in the log. | The log truncated them: the pre-paint theme script appends `dark` to `<html>` before React hydrates, so the attribute differs by design. | `suppressHydrationWarning` on that one element — it is the declared-intent escape hatch, and it does not reach the subtree. When a hydration diff looks identical, it is truncated; compare the ends. |
| 2026-09-17 | Two `Intl` tests passed locally and would fail on another Node build. | `month: "short"` renders `Sep` or `Sept` for `en-GB` depending on the ICU data bundled with Node. | Format dates all-numerically when the output is asserted on, and keep month names out of anything a test compares. |
| 2026-09-17 | A test helper's `ownerId: undefined` silently became a real owner, so an "anonymous" fixture was not anonymous. | `overrides.ownerId ?? OWNER` — `??` cannot tell an explicitly-passed `undefined` from an absent key. | Use `"key" in overrides` when absent and explicitly-undefined must mean different things. Same root as the `??`-versus-`\|\|` row above, one step further: the value is not blank, the KEY is the signal. |
| 2026-09-17 | The log showed `unhandledRejection: NotAllowedError ... Clipboard`, and the UI had just said "Saved — link copied". | `void navigator.clipboard.writeText(...)` — the write REJECTS when permission is denied (headless, insecure context, user refusal), and `void` discards the rejection instead of handling it. | `copyToClipboard()` returns a boolean and the caller words the toast from it. `void promise` silences the type checker, not the failure — and a success message printed next to a swallowed rejection is a lie to the user. |
| 2026-09-18 | The `<option>` list of every `<select>` stayed white-on-black in dark theme, however the element was styled. | The project declared `color-scheme` nowhere, so the browser painted native controls with the light default. Tailwind classes on `<option>` are ignored — that popup is not rendered by the page. | `color-scheme: light` on `:root` and `color-scheme: dark` on `.dark` in `theme.css`. One declaration also fixes scrollbars and the date picker, which were failing for the same reason and nobody had reported yet. |
| 2026-09-18 | A second component test failed with "found multiple elements" although each test rendered once. | Testing Library registers its automatic `cleanup()` only when Vitest `globals` is enabled, and `vitest.config.mts` deliberately leaves it off — so rendered trees accumulated in the DOM across tests in a file. | Call `cleanup()` in an explicit `afterEach` in every `jsdom` test file. The first test in a file always passes, so this surfaces only once a file has two. |
| 2026-09-18 | An optional integration declared as a group was valid under `next dev` and `next build`, but would have thrown `ConfigError` under `npm test`. | The public half sat in the committed `.env` and the secret half in `.env.local` — which Next deliberately skips when `NODE_ENV=test`, so the group was half-filled there and nowhere else. | Both halves of a group go in the SAME file. Leave them blank in `.env` so the committed configuration is a valid "feature off", and put the whole group in `.env.local` or the deployment environment. |
| 2026-09-19 | `prisma migrate dev` aborted with P3014: "could not create the shadow database". | `migrate dev` builds a throwaway shadow database to diff against, which needs CREATEDB — and the app's own role deliberately does not have it. Nothing about the schema was wrong. | Same escape hatch as the non-interactive case: `prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script` into a hand-created migration folder, then `prisma migrate deploy`. Granting CREATEDB to the app role would be the wrong fix. |
| 2026-09-23 | `app/icon.svg` served a healthy 200 with the right content-type, and every browser rendered nothing. | An XML comment in it mentioned the `--primary` token. XML forbids `--` inside a comment, so the whole file was malformed — but the failure surfaces only at decode time, never as a bad response. | Keep double hyphens out of comments in any XML-parsed asset, and prove an icon by `img.decode()` in the page rather than by its status code: a 200 says the bytes arrived, not that they are an image. |
