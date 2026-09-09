import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LAYERS = [
  {
    path: "lib/domain",
    body: "Entities, value objects and the 5 capability ports. Imports nothing — no framework, no Prisma, no zod, no node:*.",
  },
  {
    path: "lib/application",
    body: "Use cases: plain input + injected deps, returning Result<T, E>. Knows the domain and its ports, never an adapter.",
  },
  {
    path: "lib/infrastructure",
    body: "Adapters. Vendor SDKs live here and only here. container.ts is the single composition root.",
  },
  {
    path: "app",
    body: "The HTTP + UI adapter, kept thin: validate → get deps → call the use case → serialize.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Hex Next Base</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Next.js 16 · React 19 · Prisma 7 · Tailwind v4 · shadcn/ui — ports &amp; adapters with
        the dependency rule enforced by ESLint.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {LAYERS.map((layer) => (
          <Card key={layer.path}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{layer.path}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">{layer.body}</CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Next steps</h2>
        <ol className="text-muted-foreground mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          <li>
            <code className="font-mono">npm run db:up</code> — Postgres 16 in Docker, on the
            credentials already in <code className="font-mono">.env</code>
          </li>
          <li>
            Add your first model to <code className="font-mono">prisma/schema.prisma</code> and run{" "}
            <code className="font-mono">npm run db:migrate</code>
          </li>
          <li>
            Read <code className="font-mono">AGENTS.md</code> — the 9 rules the ESLint fences
            enforce
          </li>
        </ol>
        <p className="text-muted-foreground mt-4 text-sm">
          Liveness probe:{" "}
          <a className="underline underline-offset-4" href="/api/health">
            /api/health
          </a>
        </p>
      </section>
    </main>
  );
}
