# `app/api/**` — the HTTP adapter

Route handlers are **thin** (rule 4). Every handler is the same four steps and nothing else:

```ts
export async function POST(request: Request) {
  // 1. parse + validate the transport payload (Zod lives HERE, not in the use case)
  const body = await readJson(request);
  const parsed = createThingRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  // 2. get dependencies from the composition root
  const { repositories, now, generateId } = getContainer();

  // 3. call the use case with plain data
  const result = await createThing(parsed.data, {
    things: repositories.things,
    now,
    generateId,
  });

  // 4. serialize the Result — always through the shared helpers, never Response.json directly
  return result.ok ? created({ thing: result.value }) : errorResponse(result.error);
}
```

Note step 2: the container hands out **already-built repositories**, not `db`. A handler that
imported `thingRepository` to wrap `db` itself would trip the `app/**` fence against
`lib/infrastructure/prisma/**` — and building an adapter outside the composition root is the
thing that fence exists to stop.

If a handler contains an `if` that expresses a business rule, it is in the wrong file.

## Why route handlers and not Server Actions

Rule 8: a flow that might be consumed by another client must not use Server Actions. A Server
Action is an RPC endpoint only a Next.js client can call — it cannot be consumed by a separate
frontend, cannot be tested with `curl`, and cannot move to another service without rewriting
every call site.

Server Actions stay fine for an internal admin panel that will never be consumed by anything
else. Every one of them must re-check the session itself: an action is a POST endpoint reachable
by anyone who can guess it, not a trusted continuation of the page that rendered the button.

## Response format

Every JSON route answers `{ "data": … }` or `{ "error": { code, message, details? } }` — never
both, and never with a `success` field. `DomainError.code` → HTTP status happens in one shared
helper, [`_lib/responses.ts`](_lib/responses.ts), never ad hoc per route.

The full envelope spec, the serialisation conventions and the status table are in
**AGENTS.md → "The API response envelope"**. Read it before adding a route.

A folder name starting with `_` is private: Next.js excludes it from routing, so `_lib` cannot
become a URL by accident.

## Existing routes

| Route                        | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `GET /api/health`            | liveness probe. Deliberately does not touch the database — see the file's comment |
| `POST /api/text-share`       | store a compressed payload and mint a short code. `content` arrives already compressed: the browser owns the codec so that share-by-URL works with no server at all |
| `GET /api/text-share`        | the CALLER's own short links, newest first. Scoped by the session cookie — there is no `ownerId` parameter to tamper with |
| `GET /api/text-share/[code]` | read a share back. An expired one answers 404, not 410 — `TEXT_SHARE_EXPIRED` collapses onto `NOT_FOUND` in `_lib/responses.ts` |
| `POST /api/auth/register`    | create an account and start a session. A taken address answers 409 |
| `POST /api/auth/login`       | start a session. Answers one 401 for an unknown address, a wrong password and a malformed address alike |
| `POST /api/auth/logout`      | clear the cookie. POST, not GET: a sign-out link would be followed by any prefetcher |
| `GET /api/auth/me`           | the signed-in account, or 401 |

`POST /api/text-share` stays **open to anyone**: signing in is what files a share into your
history, not what lets you save one. The owner is read from the session inside the handler and
is deliberately absent from the Zod schema, so no caller can post a share into someone else's
history.

Nothing here is **throttled** — not the share endpoint, and not sign-in either, so nothing slows
password guessing down. The 512 KiB payload cap in `SharedText` is the only abuse guard; a
per-IP limit would go here, and `clientIpAddress` in [`_lib/request.ts`](_lib/request.ts) is
already available for it.

A handler that needs the session calls `sessionUserId()` or `currentUser()` from
[`app/_lib/`](../_lib). It must not read the signing secret itself — the `app/**` fence blocks
`lib/infrastructure/auth/**` precisely so the key keeps one holder.

## When a route takes a callback from an upstream service

Two rules that are cheap to honour up front and expensive to retrofit:

- Confirmation must be **idempotent**, keyed on a reference the upstream echoes back. A callback
  can arrive twice, and a browser redirect plus a server-to-server notification can arrive in
  either order.
- Settle state from the **server-to-server callback**, never from a browser redirect. A customer
  closing the tab must not change the outcome, and a crafted redirect must not confirm anything.
