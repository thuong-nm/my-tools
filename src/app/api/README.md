# `app/api/**` — the HTTP adapter

Route handlers are **thin** (rule 4). Every handler is the same four steps and nothing else:

```ts
export async function POST(request: NextRequest) {
  // 1. parse + validate the transport payload (Zod lives HERE, not in the use case)
  const body = await readJson(request);
  const parsed = createThingRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error);

  // 2. get dependencies from the composition root
  const { db, now, generateId } = getContainer();

  // 3. call the use case with plain data
  const result = await createThing(parsed.data, { things: thingRepository(db), now, generateId });

  // 4. serialize the Result — always through the shared helpers, never Response.json directly
  return result.ok ? created({ thing: result.value }) : errorResponse(result.error);
}
```

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

| Route              | Purpose                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `GET /api/health`  | liveness probe. Deliberately does not touch the database — see the file's comment |

## When a route takes a callback from an upstream service

Two rules that are cheap to honour up front and expensive to retrofit:

- Confirmation must be **idempotent**, keyed on a reference the upstream echoes back. A callback
  can arrive twice, and a browser redirect plus a server-to-server notification can arrive in
  either order.
- Settle state from the **server-to-server callback**, never from a browser redirect. A customer
  closing the tab must not change the outcome, and a crafted redirect must not confirm anything.
